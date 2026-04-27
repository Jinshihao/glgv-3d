import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Player } from './Player';
import { ProfessionType } from '../data/professions';

/**
 * 浮空幽灵 - 相位穿梭：进入隐身+无视碰撞状态，持续3秒
 * 可穿过敌人和障碍物，抵达目标后重新参与碰撞
 */
export class FloatingGhost extends Player {
  private _isPhasing = false;
  private _phaseTimer = 0;
  private _phaseDuration = 3.0;
  private _phaseJustEnded = false; // 刚结束相位，用于减CD判定
  private _phaseEndWindow = 0;     // 相位结束后3秒内推动敌方方块可减CD

  constructor(scene: any, team: 'red' | 'blue', playerId: string, position: Vector3) {
    super(scene, ProfessionType.FLOATING_GHOST, team, playerId, position);
  }

  public override useSkill(): boolean {
    if (!super.useSkill()) return false;
    console.log(`[技能] ${this.playerId} 相位穿梭!`);

    this._isPhasing = true;
    this._phaseTimer = this._phaseDuration;
    this._phaseJustEnded = false;
    this._phaseEndWindow = 0;

    // 禁用碰撞 → 真正穿过敌人和障碍物
    this.setCollisionEnabled(false);

    // 视觉：变透明 + 紫色发光
    const mat = this.mesh.material as any;
    if (mat) {
      mat._origAlpha = mat.alpha;
      mat.alpha = 0.12;
      mat.emissiveColor = new Color3(0.6, 0.3, 0.9);
    }

    return true;
  }

  public override update(dt: number): void {
    super.update(dt);

    if (this._isPhasing) {
      this._phaseTimer -= dt;

      // 相位期间：手动修正Y轴防止穿地（因为禁用了碰撞）
      if (this.mesh.position.y < 1.0) {
        this.mesh.position.y = 1.0;
        const body = this.mesh.physicsBody;
        if (body) {
          const vel = body.getLinearVelocity();
          body.setLinearVelocity(new Vector3(vel.x, Math.max(vel.y, 0), vel.z));
        }
      }

      // 相位期间仍可移动（通过 setMoveInput），但不与任何物体碰撞
      // 给一个轻微的悬浮效果
      const body = this.mesh.physicsBody;
      if (body) {
        const vel = body.getLinearVelocity();
        // 模拟低重力漂浮感
        if (vel.y < -1) {
          body.setLinearVelocity(new Vector3(vel.x, -1, vel.z));
        }
      }

      if (this._phaseTimer <= 0) {
        this._endPhase();
      }
    }

    // 相位结束后的3秒窗口期（用于减CD判定）
    if (this._phaseJustEnded) {
      this._phaseEndWindow -= dt;
      if (this._phaseEndWindow <= 0) {
        this._phaseJustEnded = false;
      }
    }
  }

  private _endPhase(): void {
    this._isPhasing = false;
    this._phaseJustEnded = true;
    this._phaseEndWindow = 3.0; // 3秒内推动敌方方块可减CD

    // 恢复碰撞
    this.setCollisionEnabled(true);

    // 恢复视觉
    const mat = this.mesh.material as any;
    if (mat) {
      mat.alpha = mat._origAlpha ?? 0.55;
      if (this.team === 'red') {
        mat.emissiveColor = new Color3(0.3, 0.06, 0.04);
      } else {
        mat.emissiveColor = new Color3(0.04, 0.08, 0.3);
      }
    }

    // 位置安全检查：确保不在其他物体内部
    this._ensureSafePosition();
  }

  /** 确保相位结束后不在地面以下 */
  private _ensureSafePosition(): void {
    if (this.mesh.position.y < 0.5) {
      this.mesh.position.y = 1.5;
    }
  }

  /** 幽灵在相位结束窗口内成功推动敌方方块时，由 GameEngine 调用 */
  public triggerPhaseCDReduction(): void {
    if (this._phaseJustEnded) {
      this.reduceSkillCD(4);
      this._phaseJustEnded = false;
      this._phaseEndWindow = 0;
      console.log(`[减CD] ${this.playerId} 相位穿梭后偷取，CD-4s`);
    }
  }

  public get isPhasing(): boolean { return this._isPhasing; }
  public get phaseJustEnded(): boolean { return this._phaseJustEnded; }
}
