import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ProfessionType, getProfessionConfig } from '../data/professions';
import type { ProfessionConfig } from '../data/professions';
import { PHYSICS_CONSTANTS } from '../data/constants';

/**
 * 玩家角色类
 */
export class Player {
  private _scene: Scene;
  private _mesh: Mesh;
  private _professionType: ProfessionType;
  private _config: ProfessionConfig;
  private _playerId: string;
  private _team: 'red' | 'blue';
  private _physAggregate!: PhysicsAggregate;

  // 运动
  private _moveInput: Vector3 = Vector3.Zero();
  private _forward: Vector3 = new Vector3(0, 0, -1);

  // 状态
  protected _isPushing: boolean = false;
  protected _canUseSkill: boolean = true;
  protected _skillCD: number = 0;
  protected _canDash: boolean = true;
  protected _dashCD: number = 0;
  protected _isDashing: boolean = false;
  protected _isStunned: boolean = false;
  protected _stunTimer: number = 0;

  // 统计数据
  private _stats: PlayerStats = {
    pushScore: 0,       // 搬运总积分
    stealCount: 0,      // 偷取次数
    defendCount: 0,     // 防守成功次数
    assistCount: 0,     // 助攻次数
    boxesPushed: 0,     // 推入箱子数
    skillsUsed: 0,      // 技能使用次数
  };

  constructor(
    scene: Scene,
    professionType: ProfessionType,
    team: 'red' | 'blue',
    playerId: string,
    position: Vector3
  ) {
    this._scene = scene;
    this._professionType = professionType;
    this._config = getProfessionConfig(professionType);
    this._playerId = playerId;
    this._team = team;

    this._mesh = this._createMesh();
    this._mesh.position = position.clone();
    // 元数据，方便技能碰撞检测时找到 Player 对象
    this._mesh.metadata = { type: 'player', player: this };
    this._createPhysicsBody();
  }

  /** 程序化生成角色外观 */
  private _createMesh(): Mesh {
    const size = this._config.size;
    let mesh: Mesh;

    switch (this._professionType) {
      case ProfessionType.ROCK_GUARDIAN:
        // 巨岩卫士：扁圆柱体，厚重感
        mesh = MeshBuilder.CreateCylinder(`p_${this._playerId}`, {
          diameter: size * 2.2, height: size * 1.4, tessellation: 16
        }, this._scene);
        break;
      case ProfessionType.FLOATING_GHOST:
        // 浮空幽灵：扁球体，轻盈感
        mesh = MeshBuilder.CreateSphere(`p_${this._playerId}`, { diameter: size * 2, segments: 12 }, this._scene);
        mesh.scaling = new Vector3(1, 0.6, 1);
        break;
      case ProfessionType.SOFT_JELLY:
        // 软糯果冻：椭球体，Q弹感
        mesh = MeshBuilder.CreateSphere(`p_${this._playerId}`, { diameter: size * 2, segments: 12 }, this._scene);
        mesh.scaling = new Vector3(1.15, 0.85, 1.15);
        break;
      default:
        mesh = MeshBuilder.CreateSphere(`p_${this._playerId}`, { diameter: size * 2 }, this._scene);
    }

    const mat = new StandardMaterial(`pMat_${this._playerId}`, this._scene);
    if (this._team === 'red') {
      mat.diffuseColor = new Color3(0.9, 0.25, 0.2);
      mat.emissiveColor = new Color3(0.3, 0.06, 0.04);
    } else {
      mat.diffuseColor = new Color3(0.2, 0.4, 0.95);
      mat.emissiveColor = new Color3(0.04, 0.08, 0.3);
    }
    if (this._professionType === ProfessionType.FLOATING_GHOST) {
      mat.alpha = 0.55;
    }
    mesh.material = mat;
    return mesh;
  }

  /** 创建物理体 */
  private _createPhysicsBody(): void {
    this._physAggregate = new PhysicsAggregate(
      this._mesh, PhysicsShapeType.SPHERE,
      { mass: this._config.mass, restitution: 0.6, friction: 0.4 },
      this._scene
    );
    const body = this._mesh.physicsBody;
    if (body) {
      body.setLinearDamping(0.6);
      body.setAngularDamping(0.95);
    }
  }

  /** 设置移动输入方向（归一化） */
  public setMoveInput(dir: Vector3): void {
    this._moveInput = dir;
    if (dir.length() > 0.01) {
      this._forward = dir.clone().normalize();
    }
  }

  /** 每帧更新 */
  public update(dt: number): void {
    const body = this._mesh.physicsBody;
    if (!body) return;

    // 眩晕期间无法操作
    if (this._isStunned) {
      this._stunTimer -= dt;
      if (this._stunTimer <= 0) {
        this._isStunned = false;
        this._stunTimer = 0;
      } else {
        // 眩晕时自然减速
        const currentVel = body.getLinearVelocity();
        const damp = Math.exp(-3 * dt);
        body.setLinearVelocity(new Vector3(
          currentVel.x * damp,
          currentVel.y,
          currentVel.z * damp
        ));
        return;
      }
    }

    // ── 移动 ──
    if (this._moveInput.length() > 0.01) {
      const speed = this._isPushing
        ? this._config.maxSpeed * PHYSICS_CONSTANTS.PUSH_SPEED_PENALTY
        : this._config.maxSpeed;

      const targetVel = new Vector3(
        this._moveInput.x * speed,
        body.getLinearVelocity().y,
        this._moveInput.z * speed
      );

      const currentVel = body.getLinearVelocity();
      const lerp = 1 - Math.exp(-8 * dt);
      body.setLinearVelocity(new Vector3(
        currentVel.x + (targetVel.x - currentVel.x) * lerp,
        targetVel.y,
        currentVel.z + (targetVel.z - currentVel.z) * lerp
      ));
    } else {
      const currentVel = body.getLinearVelocity();
      const damp = Math.exp(-6 * dt);
      body.setLinearVelocity(new Vector3(
        currentVel.x * damp,
        currentVel.y,
        currentVel.z * damp
      ));
    }

    // ── 朝向 ──
    if (this._moveInput.length() > 0.01) {
      const angle = Math.atan2(this._forward.x, this._forward.z);
      this._mesh.rotation.y = angle;
    }

    // ── 技能CD ──
    if (this._skillCD > 0) {
      this._skillCD -= dt;
      if (this._skillCD <= 0) {
        this._skillCD = 0;
        this._canUseSkill = true;
      }
    }

    // ── 冲刺CD ──
    if (this._dashCD > 0) {
      this._dashCD -= dt;
      if (this._dashCD <= 0) {
        this._dashCD = 0;
        this._canDash = true;
      }
    }

    // Y轴位置修正
    if (this._mesh.position.y < 0.5) {
      this._mesh.position.y = 0.5;
    }
    if (this._mesh.position.y > 5) {
      const vel = body.getLinearVelocity();
      body.setLinearVelocity(new Vector3(vel.x, Math.min(vel.y, 0), vel.z));
    }
  }

  /** 冲刺 */
  public dash(): boolean {
    if (!this._canDash || this._isPushing || this._isStunned) return false;
    const body = this._mesh.physicsBody;
    if (!body) return false;

    const dir = this._forward;
    const dashSpeed = this._config.maxSpeed * PHYSICS_CONSTANTS.DASH_MULTIPLIER;
    const impulse = dir.scale(this._config.mass * dashSpeed * 0.5);
    body.applyImpulse(impulse, this._mesh.getAbsolutePosition());

    this._canDash = false;
    this._dashCD = 3.0;
    this._isDashing = true;
    setTimeout(() => { this._isDashing = false; }, 300);
    return true;
  }

  /** 使用技能（子类重写） */
  public useSkill(): boolean {
    if (!this._canUseSkill || this._isPushing || this._isStunned) return false;
    this._canUseSkill = false;
    this._skillCD = this._config.skillCooldown;
    this._stats.skillsUsed++;
    return true;
  }

  /** 开始推箱子 */
  public startPush(): void { this._isPushing = true; }
  /** 停止推箱子 */
  public stopPush(): void { this._isPushing = false; }

  /** 强制脱手（技能命中时调用） */
  public forceStopPush(): void {
    if (this._isPushing) {
      this._isPushing = false;
      // 给一个小击退效果
      const body = this._mesh.physicsBody;
      if (body) {
        const knockback = this._forward.scale(-3);
        knockback.y = 2;
        body.applyImpulse(knockback, this._mesh.getAbsolutePosition());
      }
    }
  }

  /** 启用/禁用碰撞（浮空幽灵相位穿梭用） */
  public setCollisionEnabled(enabled: boolean): void {
    if (!this._physAggregate) return;
    if (enabled) {
      this._physAggregate.shape.filterMembershipMask = -1; // 0xFFFFFFFF
      this._physAggregate.shape.filterCollideMask = -1;
    } else {
      this._physAggregate.shape.filterMembershipMask = 0;
      this._physAggregate.shape.filterCollideMask = 0;
    }
  }

  /** 眩晕（被技能击中时） */
  public stun(duration: number): void {
    this._isStunned = true;
    this._stunTimer = duration;
    // 被眩晕时强制脱手
    if (this._isPushing) {
      this._isPushing = false;
    }
  }

  /** 减少技能CD */
  public reduceSkillCD(amount: number): void {
    this._skillCD = Math.max(0, this._skillCD - amount);
    if (this._skillCD <= 0) {
      this._skillCD = 0;
      this._canUseSkill = true;
    }
  }

  // ──── 统计 ────

  public addPushScore(score: number): void { this._stats.pushScore += score; this._stats.boxesPushed++; }
  public addSteal(): void { this._stats.stealCount++; }
  public addDefend(): void { this._stats.defendCount++; }
  public addAssist(): void { this._stats.assistCount++; }

  // ──── Getter ────

  public get mesh(): Mesh { return this._mesh; }
  public get professionType(): ProfessionType { return this._professionType; }
  public get config(): ProfessionConfig { return this._config; }
  public get team(): 'red' | 'blue' { return this._team; }
  public get playerId(): string { return this._playerId; }
  public get isPushing(): boolean { return this._isPushing; }
  public get canUseSkill(): boolean { return this._canUseSkill; }
  public get skillCDRemaining(): number { return this._skillCD; }
  public get canDash(): boolean { return this._canDash; }
  public get dashCDRemaining(): number { return this._dashCD; }
  public get forward(): Vector3 { return this._forward; }
  public get isDashing(): boolean { return this._isDashing; }
  public get isStunned(): boolean { return this._isStunned; }
  public get physAggregate(): PhysicsAggregate { return this._physAggregate; }
  public get stats(): PlayerStats { return this._stats; }

  /** 销毁 */
  public dispose(): void {
    this._mesh.dispose();
  }
}

/** 玩家统计数据 */
export interface PlayerStats {
  pushScore: number;    // 搬运总积分
  stealCount: number;   // 偷取次数
  defendCount: number;  // 防守成功次数
  assistCount: number;  // 助攻次数
  boxesPushed: number;  // 推入箱子数
  skillsUsed: number;   // 技能使用次数
}
