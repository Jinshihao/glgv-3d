import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Player } from '../entities/Player';
import { EnergyBox } from '../entities/EnergyBox';
import { PHYSICS_CONSTANTS } from '../data/constants';

interface PushState {
  pushers: Player[];  // 支持多人合推
  box: EnergyBox;
}

/**
 * 推箱子系统 v2
 * - 支持多人合推（推力相加）
 * - 弹簧力连接（箱子跟随推手方向）
 * - 距离自动脱手
 * - 脱手机制接口
 */
export class BoxPushSystem {
  private _activePushes: Map<string, PushState> = new Map();
  private _pushDetectDist = 3.5;      // 推箱检测距离
  private _maxPushDist = 5.0;         // 超过此距离自动脱手
  private _springConstant = 12.0;     // 弹簧刚度
  private _springDamping = 0.8;       // 弹簧阻尼
  private _onPushStop: ((player: Player, box: EnergyBox) => void) | null = null;

  /**
   * 尝试开始推箱子
   * 支持多人合推同一箱子
   */
  public tryPush(player: Player, boxes: EnergyBox[]): string | null {
    if (player.isPushing) return null;

    // 寻找最近的方块
    let closestBox: EnergyBox | null = null;
    let closestDist = this._pushDetectDist;

    for (const box of boxes) {
      const dist = Vector3.Distance(
        new Vector3(player.mesh.position.x, 0, player.mesh.position.z),
        new Vector3(box.getMesh().position.x, 0, box.getMesh().position.z)
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestBox = box;
      }
    }

    if (!closestBox) return null;

    const boxId = closestBox.getBoxId();
    player.startPush();

    // 如果该方块已被其他人推，加入合推
    const existing = this._activePushes.get(boxId);
    if (existing) {
      existing.pushers.push(player);
      console.log(`[PushSystem] ${player.playerId} 合推 ${boxId}，当前 ${existing.pushers.length} 人`);
    } else {
      this._activePushes.set(boxId, { pushers: [player], box: closestBox });
      console.log(`[PushSystem] ${player.playerId} 开始推 ${boxId}`);
    }

    return boxId;
  }

  /** 停止某个玩家的推箱 */
  public stopPush(player: Player): void {
    for (const [boxId, state] of this._activePushes) {
      const idx = state.pushers.indexOf(player);
      if (idx !== -1) {
        player.stopPush();
        state.pushers.splice(idx, 1);

        if (state.pushers.length === 0) {
          this._activePushes.delete(boxId);
        }
        console.log(`[PushSystem] ${player.playerId} 停止推 ${boxId}`);
        this._onPushStop?.(player, state.box);
        return;
      }
    }
    // 安全兜底
    player.stopPush();
  }

  /** 强制让某个方块的所有推手脱手（技能命中时调用） */
  public forceStopPushersOfBox(boxId: string): void {
    const state = this._activePushes.get(boxId);
    if (!state) return;

    for (const pusher of state.pushers) {
      pusher.forceStopPush();
    }
    this._activePushes.delete(boxId);
    console.log(`[PushSystem] ${boxId} 被技能强制脱手`);
  }

  /** 强制让某个玩家脱手，并返回被脱手的方块 */
  public forceStopPlayer(player: Player): EnergyBox | null {
    for (const [boxId, state] of this._activePushes) {
      const idx = state.pushers.indexOf(player);
      if (idx !== -1) {
        player.forceStopPush();
        state.pushers.splice(idx, 1);

        if (state.pushers.length === 0) {
          this._activePushes.delete(boxId);
        }
        console.log(`[PushSystem] ${player.playerId} 被技能强制脱手 ${boxId}`);
        return state.box;
      }
    }
    return null;
  }

  /** 每帧更新：弹簧力+推力方向+距离检测 */
  public update(dt: number): void {
    const toRemove: string[] = [];

    for (const [boxId, state] of this._activePushes) {
      const { pushers, box } = state;

      // 移除不再推箱的玩家
      for (let i = pushers.length - 1; i >= 0; i--) {
        if (!pushers[i].isPushing || pushers[i].isStunned) {
          pushers[i].stopPush();
          pushers.splice(i, 1);
        }
      }

      if (pushers.length === 0) {
        toRemove.push(boxId);
        continue;
      }

      const boxMesh = box.getMesh();
      const boxBody = boxMesh.physicsBody;
      if (!boxBody) continue;

      // ── 1. 计算合力方向和推力 ──
      let totalForceX = 0;
      let totalForceZ = 0;
      let totalMass = 0;

      for (const pusher of pushers) {
        // 每个推手按自己的朝向施加推力
        const dir = pusher.forward;
        const pushForce = pusher.config.mass * PHYSICS_CONSTANTS.PUSH_COEFFICIENT;
        totalForceX += dir.x * pushForce;
        totalForceZ += dir.z * pushForce;
        totalMass += pusher.config.mass;
      }

      // 推箱速度 = 合推力 / 方块重量 × 推速惩罚
      const combinedPushSpeed = (totalMass * PHYSICS_CONSTANTS.PUSH_COEFFICIENT)
        / box.getWeight()
        * PHYSICS_CONSTANTS.PUSH_SPEED_PENALTY;

      // 合力方向归一化
      const forceLen = Math.sqrt(totalForceX * totalForceX + totalForceZ * totalForceZ);
      const normForceX = forceLen > 0.01 ? totalForceX / forceLen : 0;
      const normForceZ = forceLen > 0.01 ? totalForceZ / forceLen : 0;

      // 目标速度
      const targetVelX = normForceX * combinedPushSpeed;
      const targetVelZ = normForceZ * combinedPushSpeed;

      // ── 2. 弹簧力：让箱子保持在推手前方 ──
      // 计算推手群中心
      let centerPushX = 0, centerPushZ = 0;
      for (const pusher of pushers) {
        centerPushX += pusher.mesh.position.x;
        centerPushZ += pusher.mesh.position.z;
      }
      centerPushX /= pushers.length;
      centerPushZ /= pushers.length;

      // 目标位置 = 推手中心 + 推力方向 × 偏移
      const offset = 1.5;
      const targetPosX = centerPushX + normForceX * offset;
      const targetPosZ = centerPushZ + normForceZ * offset;

      // 弹簧力
      const currentVel = boxBody.getLinearVelocity();
      const springForceX = (targetPosX - boxMesh.position.x) * this._springConstant
        - currentVel.x * this._springDamping;
      const springForceZ = (targetPosZ - boxMesh.position.z) * this._springConstant
        - currentVel.z * this._springDamping;

      // 合成：推力方向 + 弹簧修正
      const blendFactor = 0.6; // 推力占60%，弹簧修正占40%
      const finalVelX = targetVelX * blendFactor + springForceX * (1 - blendFactor) * dt * 10;
      const finalVelZ = targetVelZ * blendFactor + springForceZ * (1 - blendFactor) * dt * 10;

      // 平滑过渡
      const lerp = 1 - Math.exp(-10 * dt);
      boxBody.setLinearVelocity(new Vector3(
        currentVel.x + (finalVelX - currentVel.x) * lerp,
        currentVel.y,
        currentVel.z + (finalVelZ - currentVel.z) * lerp
      ));

      // 减少方块旋转（推箱时保持稳定）
      const angVel = boxBody.getAngularVelocity();
      boxBody.setAngularVelocity(new Vector3(angVel.x * 0.8, angVel.y * 0.5, angVel.z * 0.8));

      // ── 3. 距离检测：超过最大距离自动脱手 ──
      for (const pusher of pushers) {
        const dist = Vector3.Distance(
          new Vector3(pusher.mesh.position.x, 0, pusher.mesh.position.z),
          new Vector3(boxMesh.position.x, 0, boxMesh.position.z)
        );
        if (dist > this._maxPushDist) {
          pusher.stopPush();
          const idx = pushers.indexOf(pusher);
          if (idx !== -1) pushers.splice(idx, 1);
          console.log(`[PushSystem] ${pusher.playerId} 距离过远自动脱手`);
        }
      }
    }

    // 清理空推状态
    for (const boxId of toRemove) {
      this._activePushes.delete(boxId);
    }
  }

  /** 检查某个玩家是否正在推某个方块 */
  public isPlayerPushingBox(playerId: string, boxId: string): boolean {
    const state = this._activePushes.get(boxId);
    if (!state) return false;
    return state.pushers.some(p => p.playerId === playerId);
  }

  /** 获取某个方块的所有推手 */
  public getPushersOfBox(boxId: string): Player[] {
    return this._activePushes.get(boxId)?.pushers ?? [];
  }

  /** 获取某个玩家正在推的方块 */
  public getBoxPushedByPlayer(playerId: string): EnergyBox | null {
    for (const [, state] of this._activePushes) {
      if (state.pushers.some(p => p.playerId === playerId)) {
        return state.box;
      }
    }
    return null;
  }

  /** 获取所有活跃推箱状态 */
  public getActivePushes(): Map<string, PushState> {
    return this._activePushes;
  }

  /** 设置推箱停止回调 */
  public setOnPushStop(cb: (player: Player, box: EnergyBox) => void): void {
    this._onPushStop = cb;
  }

  /** 销毁 */
  public dispose(): void {
    for (const [, state] of this._activePushes) {
      for (const pusher of state.pushers) {
        pusher.stopPush();
      }
    }
    this._activePushes.clear();
  }
}
