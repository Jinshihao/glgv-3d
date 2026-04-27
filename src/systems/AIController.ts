import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PlayerController } from '../systems/PlayerController';
import { EnergyBox } from '../entities/EnergyBox';
import { BoxPushSystem } from '../systems/BoxPushSystem';
import { Player } from '../entities/Player';
import { ProfessionType } from '../data/professions';

/** AI状态 */
type AIState = 'idle' | 'seekBox' | 'pushBox' | 'defend' | 'steal' | 'useSkill';

/**
 * AI控制器 v2
 * - 使用 BoxPushSystem 推箱
 * - 职业差异化行为
 * - 更智能的决策逻辑
 */
export class AIController {
  private _controller: PlayerController;
  private _player: Player;
  private _team: 'red' | 'blue';
  private _profession: ProfessionType;
  private _state: AIState = 'idle';
  private _targetBox: EnergyBox | null = null;
  private _stateTimer: number = 0;
  private _thinkInterval: number = 0.5;
  private _thinkTimer: number = 0;
  private _pushSystem: BoxPushSystem;

  constructor(controller: PlayerController, pushSystem: BoxPushSystem) {
    this._controller = controller;
    this._player = controller.player;
    this._team = controller.player.team;
    this._profession = controller.player.professionType;
    this._pushSystem = pushSystem;
  }

  /** 每帧更新AI决策 */
  public update(dt: number, boxes: EnergyBox[], pushSystem: BoxPushSystem): void {
    this._thinkTimer += dt;
    this._stateTimer += dt;

    // 定期重新决策
    if (this._thinkTimer >= this._thinkInterval) {
      this._thinkTimer = 0;
      this._decide(boxes);
    }

    // 执行当前状态
    this._execute(dt, boxes, pushSystem);

    // 更新底层PlayerController
    this._controller.update(dt);
  }

  /** AI决策：根据职业和场上情况选择行动 */
  private _decide(boxes: EnergyBox[]): void {
    // 眩晕时不清空状态，等恢复后再行动
    if (this._player.isStunned) return;

    // 根据职业选择不同的策略权重
    const weights = this._getStrategyWeights();
    const rand = Math.random();

    let cumulative = 0;
    for (const [state, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        this._switchState(state as AIState, boxes);
        return;
      }
    }

    // 默认：寻找方块
    this._switchState('seekBox', boxes);
  }

  /** 获取职业策略权重 */
  private _getStrategyWeights(): Record<string, number> {
    switch (this._profession) {
      case ProfessionType.ROCK_GUARDIAN:
        // 坦克：优先防守和推箱
        return {
          defend: 0.30,
          pushBox: 0.05,
          seekBox: 0.30,
          steal: 0.10,
          useSkill: 0.25,
        };
      case ProfessionType.FLOATING_GHOST:
        // 幽灵：优先偷取和骚扰
        return {
          defend: 0.05,
          seekBox: 0.20,
          steal: 0.45,
          useSkill: 0.30,
        };
      case ProfessionType.SOFT_JELLY:
        // 果冻：均衡，偏追击和拦截
        return {
          defend: 0.15,
          seekBox: 0.30,
          steal: 0.25,
          useSkill: 0.30,
        };
      default:
        return {
          seekBox: 0.40,
          defend: 0.20,
          steal: 0.25,
          useSkill: 0.15,
        };
    }
  }

  /** 切换状态 */
  private _switchState(newState: AIState, boxes: EnergyBox[]): void {
    // 离开旧状态
    if (this._state === 'pushBox' && newState !== 'pushBox') {
      this._stopPushing();
    }

    this._state = newState;
    this._stateTimer = 0;

    // 进入新状态
    switch (newState) {
      case 'seekBox':
        this._targetBox = this._findBestBox(boxes);
        break;
      case 'steal':
        this._targetBox = this._findStealTarget(boxes);
        if (!this._targetBox) {
          this._state = 'seekBox';
          this._targetBox = this._findBestBox(boxes);
        }
        break;
      case 'defend':
        // 无需选目标
        break;
      case 'useSkill':
        // 使用技能后切换到推箱/偷取
        this._player.useSkill();
        if (this._profession === ProfessionType.FLOATING_GHOST) {
          // 幽灵技能后直接去偷
          this._state = 'steal';
          this._targetBox = this._findStealTarget(boxes);
        } else {
          this._state = 'seekBox';
          this._targetBox = this._findBestBox(boxes);
        }
        break;
    }
  }

  /** 执行当前状态的行为 */
  private _execute(_dt: number, boxes: EnergyBox[], pushSystem: BoxPushSystem): void {
    if (this._player.isStunned) {
      this._player.setMoveInput(Vector3.Zero());
      return;
    }

    const myPos = this._player.mesh.position;

    switch (this._state) {
      case 'seekBox': {
        if (!this._targetBox || this._targetBox.getMesh().isDisposed()) {
          this._targetBox = this._findBestBox(boxes);
          if (!this._targetBox) {
            this._player.setMoveInput(Vector3.Zero());
            break;
          }
        }
        const targetPos = this._targetBox.getMesh().position;
        const dir = new Vector3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        const dist = dir.length();

        if (dist < 3.0 && !this._player.isPushing) {
          // 靠近了，开始推
          this._state = 'pushBox';
          pushSystem.tryPush(this._player, boxes);
        } else if (dist > 0.1) {
          this._player.setMoveInput(dir.normalize());
        }

        // 距离远时偶尔冲刺
        if (dist > 8 && Math.random() < 0.02) {
          this._player.dash();
        }
        break;
      }

      case 'pushBox': {
        if (!this._player.isPushing) {
          // 不在推箱状态了，尝试推
          pushSystem.tryPush(this._player, boxes);
          if (!this._player.isPushing) {
            this._state = 'seekBox';
            break;
          }
        }

        // 朝己方收集区方向推
        const homeDir = this._team === 'red'
          ? new Vector3(-1, 0, 0)
          : new Vector3(1, 0, 0);
        this._player.setMoveInput(homeDir);

        // 推了一段时间后松开重新评估
        if (this._stateTimer > 4.0) {
          this._stopPushing();
          this._state = 'seekBox';
        }
        break;
      }

      case 'defend': {
        // 回到己方收集区附近巡逻
        const homeX = this._team === 'red' ? -16 : 16;
        const homeTarget = new Vector3(homeX, 0, Math.sin(this._stateTimer * 0.8) * 3);
        const dir = new Vector3(homeTarget.x - myPos.x, 0, homeTarget.z - myPos.z);
        const dist = dir.length();

        if (dist > 2.0) {
          this._player.setMoveInput(dir.normalize());
        } else {
          // 在收集区内巡逻时，如果看到敌人推箱，用技能打断
          if (this._player.canUseSkill && this._profession === ProfessionType.ROCK_GUARDIAN) {
            // 坦克在防守时更积极使用技能
            if (Math.random() < 0.02) {
              this._player.useSkill();
            }
          }
          this._player.setMoveInput(Vector3.Zero());
        }

        // 防守一段时间后切换
        if (this._stateTimer > 8.0) {
          this._state = 'seekBox';
          this._targetBox = this._findBestBox(boxes);
        }
        break;
      }

      case 'steal': {
        if (!this._targetBox || this._targetBox.getMesh().isDisposed()) {
          this._targetBox = this._findStealTarget(boxes);
          if (!this._targetBox) {
            this._state = 'seekBox';
            this._targetBox = this._findBestBox(boxes);
            break;
          }
        }

        const targetPos = this._targetBox.getMesh().position;
        const dir = new Vector3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        const dist = dir.length();

        if (dist > 2.0) {
          this._player.setMoveInput(dir.normalize());
          // 冲向目标
          if (dist > 5 && this._player.canDash && Math.random() < 0.03) {
            this._player.dash();
          }
          // 幽灵在偷取前使用技能
          if (dist > 3 && dist < 8 && this._player.canUseSkill
            && this._profession === ProfessionType.FLOATING_GHOST
            && Math.random() < 0.05) {
            this._player.useSkill();
          }
        } else {
          // 到达目标，撞开/推走方块
          if (this._player.canDash) {
            this._player.dash();
          }
          // 尝试推走
          if (!this._player.isPushing) {
            pushSystem.tryPush(this._player, boxes);
            if (this._player.isPushing) {
              this._state = 'pushBox';
            }
          }
        }

        // 偷取超时
        if (this._stateTimer > 10.0) {
          this._stopPushing();
          this._state = 'seekBox';
        }
        break;
      }

      case 'idle':
      default: {
        this._player.setMoveInput(Vector3.Zero());
        break;
      }
    }
  }

  /** 停止推箱 */
  private _stopPushing(): void {
    if (this._player.isPushing) {
      this._pushSystem.stopPush(this._player);
    }
  }

  /** 找到最佳目标方块（加权：分数/距离） */
  private _findBestBox(boxes: EnergyBox[]): EnergyBox | null {
    if (boxes.length === 0) return null;

    const myPos = this._player.mesh.position;
    let best: EnergyBox | null = null;
    let bestScore = -Infinity;

    // 倾向于推不在己方收集区的方块
    for (const box of boxes) {
      if (box.getCurrentZone() === this._team) continue; // 己方的不推

      const dist = Vector3.Distance(
        new Vector3(myPos.x, 0, myPos.z),
        new Vector3(box.getMesh().position.x, 0, box.getMesh().position.z)
      );
      const score = box.getScore() / (dist + 1);
      if (score > bestScore) {
        bestScore = score;
        best = box;
      }
    }

    return best;
  }

  /** 找到偷取目标（对方收集区内的方块） */
  private _findStealTarget(boxes: EnergyBox[]): EnergyBox | null {
    const enemyZone = this._team === 'red' ? 'blue' : 'red';
    const enemyBoxes = boxes.filter(b => b.getCurrentZone() === enemyZone);

    if (enemyBoxes.length === 0) return null;

    // 优先偷高价值方块
    const myPos = this._player.mesh.position;
    let best: EnergyBox | null = null;
    let bestScore = -Infinity;

    for (const box of enemyBoxes) {
      const dist = Vector3.Distance(
        new Vector3(myPos.x, 0, myPos.z),
        new Vector3(box.getMesh().position.x, 0, box.getMesh().position.z)
      );
      const score = box.getScore() * 2 / (dist + 1); // 偷取加倍权重
      if (score > bestScore) {
        bestScore = score;
        best = box;
      }
    }

    return best;
  }

  public dispose(): void {
    this._controller.dispose();
  }
}
