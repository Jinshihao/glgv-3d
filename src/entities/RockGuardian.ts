import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Player } from './Player';
import { ProfessionType } from '../data/professions';

/**
 * 巨岩卫士 - 泰山压顶：原地震击，产生大范围冲击波
 * 击飞周围所有敌人和能量方块，敌人被击中时脱手推箱
 */
export class RockGuardian extends Player {
  private _shockwaveRadius = 10;
  private _shockwaveForce = 800;

  /** 技能命中的敌人列表（供 GameEngine 做减CD判定） */
  private _lastSkillHits: Player[] = [];

  constructor(scene: any, team: 'red' | 'blue', playerId: string, position: Vector3) {
    super(scene, ProfessionType.ROCK_GUARDIAN, team, playerId, position);
  }

  public override useSkill(): boolean {
    if (!super.useSkill()) return false;
    console.log(`[技能] ${this.playerId} 泰山压顶!`);

    this._lastSkillHits = [];
    const center = this.mesh.position.clone();
    const meshes = this.mesh.getScene().meshes;

    for (const mesh of meshes) {
      if (mesh === this.mesh || !mesh.physicsBody) continue;
      const dist = Vector3.Distance(center, mesh.position);
      if (dist > 0 && dist <= this._shockwaveRadius) {
        const dir = mesh.position.subtract(center).normalize();
        const force = dir.scale(this._shockwaveForce / (dist + 0.5));
        // Y方向击飞
        force.y = Math.abs(force.y) + 5;
        mesh.physicsBody.applyImpulse(force, mesh.getAbsolutePosition());

        // 检测是否命中敌人玩家 → 强制脱手+眩晕
        if (mesh.metadata?.type === 'player') {
          const hitPlayer: Player = mesh.metadata.player;
          if (hitPlayer.team !== this.team) {
            hitPlayer.forceStopPush();
            hitPlayer.stun(0.8); // 眩晕0.8秒
            this._lastSkillHits.push(hitPlayer);
            console.log(`[技能] ${this.playerId} 击飞 ${hitPlayer.playerId}，脱手推箱!`);
          }
        }
      }
    }

    // 视觉反馈：闪烁
    const mat = this.mesh.material as any;
    if (mat) {
      const origEmissive = mat.emissiveColor.clone();
      mat.emissiveColor = new Color3(1, 0.8, 0.2);
      setTimeout(() => { mat.emissiveColor = origEmissive; }, 300);
    }

    return true;
  }

  /** 获取上次技能命中的敌人（供 GameEngine 做减CD判定） */
  public getLastSkillHits(): Player[] {
    return this._lastSkillHits;
  }
}
