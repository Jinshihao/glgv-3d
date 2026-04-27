import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Player } from './Player';
import { ProfessionType } from '../data/professions';

/**
 * 软糯果冻 - 弹射：朝指定方向瞬间高速弹射（速度×3）
 * 撞击敌人可使其脱手正在推的箱子，撞击能量方块可改变其运动方向
 */
export class SoftJelly extends Player {
  private _dashSpeedMultiplier = 3.0;
  private _isBouncing = false;
  private _bounceTimer = 0;
  private _bounceDuration = 0.5; // 弹射碰撞检测窗口
  private _bounceHitRadius = 2.5; // 弹射碰撞检测半径

  /** 弹射期间命中的敌人列表 */
  private _bounceHits: Player[] = [];

  constructor(scene: any, team: 'red' | 'blue', playerId: string, position: Vector3) {
    super(scene, ProfessionType.SOFT_JELLY, team, playerId, position);
  }

  public override useSkill(): boolean {
    if (!super.useSkill()) return false;
    console.log(`[技能] ${this.playerId} 弹射!`);

    const body = this.mesh.physicsBody;
    if (!body) return false;

    const dir = this.forward;
    const impulse = dir.scale(this.config.mass * this.config.maxSpeed * this._dashSpeedMultiplier * 0.6);
    impulse.y = 2;
    body.applyImpulse(impulse, this.mesh.getAbsolutePosition());

    // 进入弹射检测状态
    this._isBouncing = true;
    this._bounceTimer = this._bounceDuration;
    this._bounceHits = [];

    // 视觉反馈
    const mat = this.mesh.material as any;
    if (mat) {
      mat._origEmissive = mat.emissiveColor.clone();
      mat.emissiveColor = new Color3(1, 0.4, 0.7);
    }

    return true;
  }

  public override update(dt: number): void {
    super.update(dt);

    // 弹射碰撞检测窗口
    if (this._isBouncing) {
      this._bounceTimer -= dt;
      if (this._bounceTimer <= 0) {
        this._endBounce();
      } else {
        // 检测碰撞：遍历场景中的敌人
        this._checkBounceCollisions();
      }
    }
  }

  /** 弹射期间检测碰撞 */
  private _checkBounceCollisions(): void {
    const myPos = this.mesh.position;
    const meshes = this.mesh.getScene().meshes;

    for (const mesh of meshes) {
      if (mesh === this.mesh || !mesh.metadata) continue;

      const dist = Vector3.Distance(
        new Vector3(myPos.x, 0, myPos.z),
        new Vector3(mesh.position.x, 0, mesh.position.z)
      );

      if (dist > this._bounceHitRadius) continue;

      // 碰到敌人 → 脱手+击退
      if (mesh.metadata.type === 'player') {
        const hitPlayer: Player = mesh.metadata.player;
        if (hitPlayer.team !== this.team && !this._bounceHits.includes(hitPlayer)) {
          hitPlayer.forceStopPush();
          hitPlayer.stun(0.5);
          // 额外击退
          const knockDir = mesh.position.subtract(myPos).normalize();
          const knockImpulse = knockDir.scale(hitPlayer.config.mass * 8);
          knockImpulse.y = 3;
          mesh.physicsBody?.applyImpulse(knockImpulse, mesh.getAbsolutePosition());
          this._bounceHits.push(hitPlayer);
          console.log(`[技能] ${this.playerId} 弹射撞击 ${hitPlayer.playerId}，脱手推箱!`);
        }
      }

      // 碰到能量方块 → 改变运动方向
      if (mesh.metadata.type === 'box' && mesh.physicsBody) {
        const pushDir = mesh.position.subtract(myPos).normalize();
        const pushForce = pushDir.scale(150);
        pushForce.y = 2;
        mesh.physicsBody.applyImpulse(pushForce, mesh.getAbsolutePosition());
      }
    }
  }

  private _endBounce(): void {
    this._isBouncing = false;
    this._bounceTimer = 0;

    const mat = this.mesh.material as any;
    if (mat) {
      if (this.team === 'red') {
        mat.emissiveColor = new Color3(0.3, 0.06, 0.04);
      } else {
        mat.emissiveColor = new Color3(0.04, 0.08, 0.3);
      }
    }
  }

  /** 弹射是否命中敌人（供 GameEngine 做减CD判定） */
  public didBounceHitEnemy(): boolean {
    return this._bounceHits.length > 0;
  }

  public get isBouncing(): boolean { return this._isBouncing; }
}
