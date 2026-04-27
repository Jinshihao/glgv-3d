import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Player } from '../entities/Player';
import { RockGuardian } from '../entities/RockGuardian';
import { FloatingGhost } from '../entities/FloatingGhost';
import { SoftJelly } from '../entities/SoftJelly';
import { ProfessionType } from '../data/professions';

/**
 * 玩家控制器 - 处理键盘输入并控制玩家角色
 * 推箱动作由 GameEngine 通过 BoxPushSystem 管理
 */
export class PlayerController {
  private _player: Player;
  private _inputMap: Map<string, boolean> = new Map();
  private _moveDir: Vector3 = Vector3.Zero();
  private _skillTriggered = false;
  private _dashTriggered = false;
  private _pushHeld = false;

  constructor(scene: Scene, professionType: ProfessionType, team: 'red' | 'blue', playerId: string, position: Vector3) {
    this._player = PlayerController._createPlayer(scene, professionType, team, playerId, position);
    this._setupKeyboard();
  }

  /** 工厂方法：创建对应职业的Player子类 */
  private static _createPlayer(
    scene: Scene, type: ProfessionType, team: 'red' | 'blue', id: string, pos: Vector3
  ): Player {
    switch (type) {
      case ProfessionType.ROCK_GUARDIAN: return new RockGuardian(scene, team, id, pos);
      case ProfessionType.FLOATING_GHOST: return new FloatingGhost(scene, team, id, pos);
      case ProfessionType.SOFT_JELLY: return new SoftJelly(scene, team, id, pos);
      default: throw new Error(`未知职业: ${type}`);
    }
  }

  private _setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this._inputMap.set(e.key.toLowerCase(), true);
      if (e.key === ' ') this._skillTriggered = true;
      if (e.key === 'Shift') this._dashTriggered = true;
    });
    window.addEventListener('keyup', (e) => {
      this._inputMap.set(e.key.toLowerCase(), false);
    });
  }

  /** 每帧更新 */
  public update(dt: number): void {
    this._calcMoveDirection();
    this._player.setMoveInput(this._moveDir);

    // 技能（空格）
    if (this._skillTriggered) {
      this._player.useSkill();
      this._skillTriggered = false;
    }

    // 冲刺（Shift）
    if (this._dashTriggered) {
      this._player.dash();
      this._dashTriggered = false;
    }

    // 推箱键状态（E/F）—— 由 GameEngine 读取并调用 BoxPushSystem
    const pushKey = this._inputMap.get('e') || this._inputMap.get('f');
    this._pushHeld = !!pushKey;

    this._player.update(dt);
  }

  /** 计算移动方向 */
  private _calcMoveDirection(): void {
    let x = 0, z = 0;
    if (this._inputMap.get('w') || this._inputMap.get('arrowup')) z -= 1;
    if (this._inputMap.get('s') || this._inputMap.get('arrowdown')) z += 1;
    if (this._inputMap.get('a') || this._inputMap.get('arrowleft')) x -= 1;
    if (this._inputMap.get('d') || this._inputMap.get('arrowright')) x += 1;

    if (x !== 0 || z !== 0) {
      this._moveDir = new Vector3(x, 0, z).normalize();
    } else {
      this._moveDir = Vector3.Zero();
    }
  }

  // ──── Getter ────

  public get player(): Player { return this._player; }
  /** 推箱键是否被按住 */
  public get pushHeld(): boolean { return this._pushHeld; }

  /** 销毁 */
  public dispose(): void {
    this._player.dispose();
  }
}
