import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4, Color3 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import HavokPhysics from '@babylonjs/havok';

import { MapManager } from './MapManager';
import { PlayerController } from '../systems/PlayerController';
import { AIController } from '../systems/AIController';
import { ProfessionType } from '../data/professions';
import { EnergyBox } from '../entities/EnergyBox';
import { getRandomBoxType } from '../data/boxTypes';
import { ScoreSystem } from '../systems/ScoreSystem';
import { BoxPushSystem } from '../systems/BoxPushSystem';
import { Player } from '../entities/Player';
import type { PlayerStats } from '../entities/Player';
import { FloatingGhost } from '../entities/FloatingGhost';
import { RockGuardian } from '../entities/RockGuardian';
import { SoftJelly } from '../entities/SoftJelly';
import { GAME_CONFIG } from '../data/constants';

/** 游戏阶段 */
export type GamePhase = 'loading' | 'playing' | 'ended';

/** 动态事件类型 */
export type DynamicEventType = 'bounce_floor' | 'rotating_obstacle' | 'shrinking_zone' | null;

/** 游戏事件信息（供 UI 显示） */
export interface GameEventInfo {
  type: DynamicEventType;
  message: string;
  timer: number;
}

/**
 * 游戏引擎 v2 - 统一管理3D场景、物理、渲染和游戏逻辑
 */
export class GameEngine {
  // Babylon.js 核心
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene: Scene;
  private _camera!: ArcRotateCamera;
  private _havokPlugin: HavokPlugin | null = null;

  // 子系统
  private _mapManager: MapManager | null = null;
  private _scoreSystem: ScoreSystem;
  private _boxPushSystem: BoxPushSystem;

  // 游戏对象
  private _localPlayer: PlayerController | null = null;
  private _aiControllers: AIController[] = [];
  private _allPlayers: Player[] = [];          // 所有玩家引用（含AI）
  private _boxes: EnergyBox[] = [];
  private _maxBoxes: number = GAME_CONFIG.BOX_COUNT_1V1;

  // 游戏状态
  private _phase: GamePhase = 'loading';
  private _gameTime: number = 0;
  private _maxGameTime: number = GAME_CONFIG.STANDARD_MATCH_TIME;
  private _redScore: number = 0;
  private _blueScore: number = 0;

  // 动态事件
  private _currentEvent: GameEventInfo | null = null;
  private _eventTimer: number = 0;
  private _nextEventTime: number = 60; // 首次事件在60秒后
  private _shrinkActive: boolean = false;

  // 外部回调
  private _onScoreChange: ((red: number, blue: number) => void) | null = null;
  private _onTimeUpdate: ((time: number) => void) | null = null;
  private _onPhaseChange: ((phase: GamePhase) => void) | null = null;
  private _onEventUpdate: ((event: GameEventInfo | null) => void) | null = null;
  private _onSkillUpdate: ((playerId: string, cd: number, maxCd: number, canUse: boolean) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this._scene = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.05, 0.05, 0.1, 1.0);

    this._scoreSystem = new ScoreSystem();
    this._boxPushSystem = new BoxPushSystem();
  }

  /** 初始化引擎和场景 */
  public async initialize(): Promise<void> {
    console.log('[GameEngine] 开始初始化...');

    await this._initPhysics();
    this._setupCamera();
    this._setupLighting();

    this._mapManager = new MapManager(this._scene);
    this._mapManager.createStandardMap();

    this._setupScoreSystem();
    this._setupGameLoop();

    this.setPhase('loading');
    console.log('[GameEngine] 初始化完成');
  }

  private async _initPhysics(): Promise<void> {
    try {
      const havokInstance = await HavokPhysics();
      this._havokPlugin = new HavokPlugin(true, havokInstance);
      this._scene.enablePhysics(new Vector3(0, -9.81, 0), this._havokPlugin);
      console.log('[GameEngine] Havok 物理引擎就绪');
    } catch (err) {
      console.error('[GameEngine] Havok 初始化失败:', err);
    }
  }

  private _setupCamera(): void {
    this._camera = new ArcRotateCamera(
      'camera', -Math.PI / 2, Math.PI / 3.2, 30,
      Vector3.Zero(), this._scene
    );
    this._camera.lowerBetaLimit = 0.4;
    this._camera.upperBetaLimit = Math.PI / 2.2;
    this._camera.lowerRadiusLimit = 15;
    this._camera.upperRadiusLimit = 50;
    this._camera.wheelPrecision = 40;
    this._camera.panningSensibility = 200;
    this._camera.attachControl(this._canvas, true);
  }

  private _setupLighting(): void {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.8;
    hemi.diffuse = new Color3(1, 1, 1);
    hemi.groundColor = new Color3(0.2, 0.2, 0.3);

    const pointLight = new PointLight('centerLight', new Vector3(0, 10, 0), this._scene);
    pointLight.intensity = 0.4;
    pointLight.diffuse = new Color3(1, 0.9, 0.7);
  }

  private _setupScoreSystem(): void {
    if (!this._mapManager) return;
    const redMesh = this._mapManager.redZone;
    const blueMesh = this._mapManager.blueZone;
    if (redMesh && blueMesh) {
      this._scoreSystem.setupZones(redMesh, blueMesh, this._mapManager.getZoneSize());
    }
    this._scoreSystem.setOnScoreChange((red, blue) => {
      this._redScore = red;
      this._blueScore = blue;
      this._onScoreChange?.(red, blue);
    });
  }

  private _setupGameLoop(): void {
    this._engine.runRenderLoop(() => {
      const dt = Math.min(this._engine.getDeltaTime() / 1000, 0.05);
      if (this._phase === 'playing') {
        this._tick(dt);
      }
      this._scene.render();
    });
    window.addEventListener('resize', () => this._engine.resize());
  }

  /** 每帧更新 */
  private _tick(dt: number): void {
    this._gameTime += dt;
    this._onTimeUpdate?.(this._gameTime);

    // 更新本地玩家
    if (this._localPlayer) {
      this._localPlayer.update(dt);
      // 推箱输入处理
      this._handlePushInput(this._localPlayer);
    }

    // 更新AI
    for (const ai of this._aiControllers) {
      ai.update(dt, this._boxes, this._boxPushSystem);
    }

    // 更新推箱子系统
    this._boxPushSystem.update(dt);

    // 更新能量方块
    for (const box of this._boxes) {
      box.update(dt);
    }

    // 更新得分
    this._scoreSystem.update(this._boxes);

    // 维持方块数量
    this._maintainBoxCount();

    // 相机跟随本地玩家
    if (this._localPlayer) {
      const playerPos = this._localPlayer.player.mesh.position;
      this._camera.target = Vector3.Lerp(this._camera.target, playerPos, 0.05);
    }

    // 减CD条件检查
    this._checkCDReductions();

    // 动态事件
    this._updateDynamicEvents(dt);

    // 技能状态回调
    this._emitSkillUpdates();

    // 检查游戏结束
    if (this._gameTime >= this._maxGameTime) {
      this.endGame();
    }
  }

  /** 处理推箱输入（本地玩家） */
  private _handlePushInput(controller: PlayerController): void {
    const player = controller.player;
    if (controller.pushHeld) {
      if (!player.isPushing) {
        this._boxPushSystem.tryPush(player, this._boxes);
      }
    } else {
      if (player.isPushing) {
        this._boxPushSystem.stopPush(player);
      }
    }
  }

  /** 减CD条件检查 */
  private _checkCDReductions(): void {
    for (const player of this._allPlayers) {
      // 巨岩卫士：在己方收集区内震飞正在推箱的敌人，-3s CD
      if (player instanceof RockGuardian) {
        const hits = player.getLastSkillHits();
        if (hits.length > 0) {
          // 检查是否有被击飞的敌人在己方收集区内推箱
          for (const hitEnemy of hits) {
            if (this._isPlayerInOwnZone(hitEnemy)) {
              player.reduceSkillCD(3);
              console.log(`[减CD] 巨岩卫士在己方收集区震飞推箱敌人，CD-3s`);
              break;
            }
          }
        }
      }

      // 浮空幽灵：相位结束后3秒内推动敌方收集区方块，-4s CD
      if (player instanceof FloatingGhost) {
        if (player.phaseJustEnded && player.isPushing) {
          const pushingBox = this._boxPushSystem.getBoxPushedByPlayer(player.playerId);
          if (pushingBox && this._isBoxInEnemyZone(pushingBox, player.team)) {
            player.triggerPhaseCDReduction();
          }
        }
      }

      // 软糯果冻：弹射撞击使敌人脱手，-2s CD
      if (player instanceof SoftJelly) {
        if (player.didBounceHitEnemy()) {
          player.reduceSkillCD(2);
          console.log(`[减CD] 果冻弹射脱手敌人，CD-2s`);
        }
      }
    }
  }

  /** 判断玩家是否在己方收集区内 */
  private _isPlayerInOwnZone(player: Player): boolean {
    const pos = player.mesh.position;
    const zoneSize = this._mapManager?.getZoneSize();
    if (!zoneSize) return false;

    const zoneCenter = player.team === 'red'
      ? this._mapManager!.redZone.position
      : this._mapManager!.blueZone.position;

    return Math.abs(pos.x - zoneCenter.x) <= zoneSize.width / 2
      && Math.abs(pos.z - zoneCenter.z) <= zoneSize.depth / 2;
  }

  /** 判断方块是否在敌方收集区内 */
  private _isBoxInEnemyZone(box: EnergyBox, playerTeam: 'red' | 'blue'): boolean {
    const enemyZone = playerTeam === 'red' ? 'blue' : 'red';
    return box.getCurrentZone() === enemyZone;
  }

  /** 动态事件更新 */
  private _updateDynamicEvents(dt: number): void {
    // 事件计时
    this._eventTimer += dt;

    // 终局1分钟：缩圈
    const remaining = this._maxGameTime - this._gameTime;
    if (remaining <= 60 && !this._shrinkActive) {
      this._shrinkActive = true;
      this._currentEvent = {
        type: 'shrinking_zone',
        message: '场地开始塌陷！',
        timer: 60
      };
      this._onEventUpdate?.(this._currentEvent);
      console.log('[事件] 场地开始塌陷！');
    }

    // 更新事件计时器
    if (this._currentEvent) {
      this._currentEvent.timer -= dt;
      if (this._currentEvent.timer <= 0) {
        this._currentEvent = null;
        this._onEventUpdate?.(null);
      }
    }

    // 随机触发弹射地板事件
    if (this._eventTimer >= this._nextEventTime && this._currentEvent === null) {
      this._triggerBounceFloorEvent();
      this._eventTimer = 0;
      this._nextEventTime = 30 + Math.random() * 40; // 30-70秒间隔
    }
  }

  /** 触发弹射地板事件 */
  private _triggerBounceFloorEvent(): void {
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 14;

    // 检查附近的玩家和箱子，给一个弹飞效果
    for (const player of this._allPlayers) {
      const dist = Vector3.Distance(
        new Vector3(player.mesh.position.x, 0, player.mesh.position.z),
        new Vector3(x, 0, z)
      );
      if (dist < 3) {
        const body = player.mesh.physicsBody;
        if (body) {
          body.applyImpulse(new Vector3(0, 12, 0), player.mesh.getAbsolutePosition());
          if (player.isPushing) {
            this._boxPushSystem.forceStopPlayer(player);
          }
        }
      }
    }

    this._currentEvent = {
      type: 'bounce_floor',
      message: '弹射地板出现！',
      timer: 5
    };
    this._onEventUpdate?.(this._currentEvent);
    console.log(`[事件] 弹射地板出现在 (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }

  /** 发送技能状态更新 */
  private _emitSkillUpdates(): void {
    if (!this._localPlayer || !this._onSkillUpdate) return;
    const player = this._localPlayer.player;
    const config = player.config;
    this._onSkillUpdate(
      player.playerId,
      player.skillCDRemaining,
      config.skillCooldown,
      player.canUseSkill
    );
  }

  private _maintainBoxCount(): void {
    while (this._boxes.length < this._maxBoxes) {
      this._spawnBox();
    }
  }

  private _spawnBox(): void {
    const boxType = getRandomBoxType();
    const id = `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    // 在中央资源区附近生成
    const x = (Math.random() - 0.5) * 8;
    const z = (Math.random() - 0.5) * 8;
    const box = new EnergyBox(this._scene, boxType, id, new Vector3(x, 2, z));
    this._boxes.push(box);
  }

  // ──── 公开 API ────

  /** 开始游戏 */
  public startGame(playerProfession: ProfessionType = ProfessionType.SOFT_JELLY): void {
    console.log('[GameEngine] 开始游戏!');
    this._gameTime = 0;
    this._redScore = 0;
    this._blueScore = 0;
    this._eventTimer = 0;
    this._shrinkActive = false;
    this._currentEvent = null;
    this._scoreSystem.reset();

    // 清除旧对象
    this._localPlayer?.dispose();
    this._localPlayer = null;
    this._aiControllers.forEach(a => a.dispose());
    this._aiControllers = [];
    this._allPlayers = [];
    this._boxes.forEach(b => b.dispose());
    this._boxes = [];
    this._boxPushSystem.dispose();

    // 创建本地玩家（红方）
    this._localPlayer = new PlayerController(
      this._scene, playerProfession, 'red', 'local_player',
      new Vector3(-15, 1.5, 0)
    );
    this._allPlayers.push(this._localPlayer.player);

    // AI队友（红方）- 根据玩家职业分配互补角色
    const aiRedProf = playerProfession === ProfessionType.ROCK_GUARDIAN
      ? ProfessionType.SOFT_JELLY : ProfessionType.ROCK_GUARDIAN;
    const aiRed = new PlayerController(
      this._scene, aiRedProf, 'red', 'ai_red_1',
      new Vector3(-15, 1.5, 5)
    );
    this._allPlayers.push(aiRed.player);
    this._aiControllers.push(new AIController(aiRed, this._boxPushSystem));

    // AI敌人（蓝方）
    const aiBlue1 = new PlayerController(
      this._scene, ProfessionType.FLOATING_GHOST, 'blue', 'ai_blue_1',
      new Vector3(15, 1.5, 0)
    );
    this._allPlayers.push(aiBlue1.player);
    this._aiControllers.push(new AIController(aiBlue1, this._boxPushSystem));

    const aiBlue2 = new PlayerController(
      this._scene, ProfessionType.ROCK_GUARDIAN, 'blue', 'ai_blue_2',
      new Vector3(15, 1.5, -5)
    );
    this._allPlayers.push(aiBlue2.player);
    this._aiControllers.push(new AIController(aiBlue2, this._boxPushSystem));

    // 生成初始方块
    for (let i = 0; i < this._maxBoxes; i++) {
      this._spawnBox();
    }

    this.setPhase('playing');
  }

  /** 结束游戏 */
  public endGame(): void {
    if (this._phase === 'ended') return;
    console.log(`[GameEngine] 游戏结束! 红方 ${this._redScore} - 蓝方 ${this._blueScore}`);
    this.setPhase('ended');
  }

  private setPhase(phase: GamePhase): void {
    this._phase = phase;
    this._onPhaseChange?.(phase);
  }

  /** 获取 MVP 玩家 */
  public getMVP(): Player | null {
    let mvp: Player | null = null;
    let mvpScore = -1;

    for (const p of this._allPlayers) {
      const s = p.stats.pushScore + p.stats.stealCount * 10 + p.stats.defendCount * 5;
      if (s > mvpScore) {
        mvpScore = s;
        mvp = p;
      }
    }
    return mvp;
  }

  /** 获取所有玩家数据 */
  public getAllPlayerStats(): { player: Player; stats: PlayerStats }[] {
    return this._allPlayers.map(p => ({ player: p, stats: p.stats }));
  }

  // ──── Getter / Setter ────

  public get scene(): Scene { return this._scene; }
  public get redScore(): number { return this._redScore; }
  public get blueScore(): number { return this._blueScore; }
  public get gameTime(): number { return this._gameTime; }
  public get maxGameTime(): number { return this._maxGameTime; }
  public get phase(): GamePhase { return this._phase; }
  public get localPlayer(): PlayerController | null { return this._localPlayer; }
  public get currentEvent(): GameEventInfo | null { return this._currentEvent; }

  public setOnScoreChange(cb: (red: number, blue: number) => void) { this._onScoreChange = cb; }
  public setOnTimeUpdate(cb: (time: number) => void) { this._onTimeUpdate = cb; }
  public setOnPhaseChange(cb: (phase: GamePhase) => void) { this._onPhaseChange = cb; }
  public setOnEventUpdate(cb: (event: GameEventInfo | null) => void) { this._onEventUpdate = cb; }
  public setOnSkillUpdate(cb: (playerId: string, cd: number, maxCd: number, canUse: boolean) => void) { this._onSkillUpdate = cb; }

  /** 销毁 */
  public dispose(): void {
    this._engine.stopRenderLoop();
    this._localPlayer?.dispose();
    this._aiControllers.forEach(a => a.dispose());
    this._boxes.forEach(b => b.dispose());
    this._boxPushSystem.dispose();
    this._scene.dispose();
    this._engine.dispose();
  }
}
