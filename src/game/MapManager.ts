import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PHYSICS_CONSTANTS } from '../data/constants';

/** 地图尺寸配置 */
const MAP_W = 44;
const MAP_D = 28;
const ZONE_W = 10;
const ZONE_D = 10;
const WALL_H = 3.5;        // 收集区围墙高度（加高，形成凹入感）
const BOUNDARY_H = 2.5;    // 边界墙高度
const ZONE_ENTRY_W = 5.0;  // 收集区入口宽度（窄口，易守难攻）

/**
 * 地图管理器 v2
 * - 凹入式收集区（三面高墙 + 正面窄入口）
 * - 侧翼通道（迂回偷取路线）
 * - 中央障碍物（增加策略性）
 */
export class MapManager {
  private _scene: Scene;
  private _redZone!: Mesh;
  private _blueZone!: Mesh;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  /** 创建标准地图（彩虹浮岛） */
  public createStandardMap(): void {
    console.log('[MapManager] 创建地图...');
    this._createGround();
    this._createZones();
    this._createBoundaryWalls();
    this._createCentralObstacles();
    this._createSideChannels();
    console.log('[MapManager] 地图创建完成');
  }

  /** 创建地面 */
  private _createGround(): void {
    const ground = MeshBuilder.CreateGround('ground', {
      width: MAP_W, height: MAP_D, subdivisions: 4
    }, this._scene);

    const mat = new StandardMaterial('groundMat', this._scene);
    mat.diffuseColor = new Color3(0.18, 0.55, 0.28);
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = mat;

    new PhysicsAggregate(ground, PhysicsShapeType.BOX, {
      mass: 0,
      restitution: PHYSICS_CONSTANTS.RESTITUTION,
      friction: PHYSICS_CONSTANTS.GROUND_FRICTION,
    }, this._scene);

    // 中央资源区标记
    const centerMark = MeshBuilder.CreateGround('centerMark', {
      width: 10, height: 10, subdivisions: 1
    }, this._scene);
    centerMark.position.y = 0.01;
    const cmMat = new StandardMaterial('centerMarkMat', this._scene);
    cmMat.diffuseColor = new Color3(0.85, 0.8, 0.2);
    cmMat.alpha = 0.25;
    cmMat.emissiveColor = new Color3(0.3, 0.28, 0.05);
    centerMark.material = cmMat;

    // 地面网格线（增加空间感）
    for (let i = -MAP_W / 2; i <= MAP_W / 2; i += 4) {
      const line = MeshBuilder.CreateBox(`gridZ_${i}`, { width: 0.05, height: 0.02, depth: MAP_D }, this._scene);
      line.position = new Vector3(i, 0.01, 0);
      const lineMat = new StandardMaterial(`gridZMat_${i}`, this._scene);
      lineMat.diffuseColor = new Color3(0.15, 0.45, 0.22);
      lineMat.alpha = 0.3;
      line.material = lineMat;
    }
    for (let j = -MAP_D / 2; j <= MAP_D / 2; j += 4) {
      const line = MeshBuilder.CreateBox(`gridX_${j}`, { width: MAP_W, height: 0.02, depth: 0.05 }, this._scene);
      line.position = new Vector3(0, 0.01, j);
      const lineMat = new StandardMaterial(`gridXMat_${j}`, this._scene);
      lineMat.diffuseColor = new Color3(0.15, 0.45, 0.22);
      lineMat.alpha = 0.3;
      line.material = lineMat;
    }
  }

  /** 创建红/蓝方收集区（凹入式：三面高墙+正面窄入口） */
  private _createZones(): void {
    const redCenter = new Vector3(-MAP_W / 2 + ZONE_D / 2 + 1, 0.02, 0);
    const blueCenter = new Vector3(MAP_W / 2 - ZONE_D / 2 - 1, 0.02, 0);

    this._redZone = this._createZone('red', redCenter, new Color3(0.9, 0.2, 0.2));
    this._blueZone = this._createZone('blue', blueCenter, new Color3(0.2, 0.4, 0.95));
  }

  private _createZone(team: string, pos: Vector3, color: Color3): Mesh {
    const zone = MeshBuilder.CreateGround(`${team}Zone`, {
      width: ZONE_W, height: ZONE_D, subdivisions: 1
    }, this._scene);
    zone.position = pos;

    const mat = new StandardMaterial(`${team}ZoneMat`, this._scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.35);
    mat.alpha = 0.35;
    zone.material = mat;

    // 凹入式围墙：三面高墙 + 正面窄入口
    this._createSunkenWalls(team, pos, color);

    return zone;
  }

  /** 凹入式收集区围墙：背面+两侧+正面两侧留入口 */
  private _createSunkenWalls(team: string, center: Vector3, color: Color3): void {
    const wallMat = new StandardMaterial(`${team}WallMat`, this._scene);
    wallMat.diffuseColor = color.scale(0.7);
    wallMat.emissiveColor = color.scale(0.3);
    wallMat.alpha = 0.85;

    // 判断方向：红方入口朝右(+x)，蓝方入口朝左(-x)
    const isRed = team === 'red';
    const facingDir = isRed ? 1 : -1; // 入口朝向

    // ── 背面墙（远离场地的一侧，最外面） ──
    const backX = center.x - facingDir * (ZONE_W / 2);
    const backWall = MeshBuilder.CreateBox(`${team}BackWall`, {
      width: 0.5, height: WALL_H, depth: ZONE_D + 1
    }, this._scene);
    backWall.position = new Vector3(backX, WALL_H / 2, center.z);
    backWall.material = wallMat;
    new PhysicsAggregate(backWall, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // ── 两侧墙（带入口缺口） ──
    const sideDepth = (ZONE_D - ZONE_ENTRY_W) / 2;
    const sideZ1 = center.z - ZONE_ENTRY_W / 2 - sideDepth / 2;
    const sideZ2 = center.z + ZONE_ENTRY_W / 2 + sideDepth / 2;

    // 入口侧（面向场地中心的一侧）
    const entryX = center.x + facingDir * (ZONE_W / 2);

    // 左侧墙
    const sideWall1 = MeshBuilder.CreateBox(`${team}SideWall1`, {
      width: 0.5, height: WALL_H, depth: sideDepth
    }, this._scene);
    sideWall1.position = new Vector3(entryX, WALL_H / 2, sideZ1);
    sideWall1.material = wallMat;
    new PhysicsAggregate(sideWall1, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // 右侧墙
    const sideWall2 = MeshBuilder.CreateBox(`${team}SideWall2`, {
      width: 0.5, height: WALL_H, depth: sideDepth
    }, this._scene);
    sideWall2.position = new Vector3(entryX, WALL_H / 2, sideZ2);
    sideWall2.material = wallMat;
    new PhysicsAggregate(sideWall2, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // ── 顶部侧墙（连接背面和入口的侧墙） ──
    const topSideDepth1 = MeshBuilder.CreateBox(`${team}TopSide1`, {
      width: ZONE_W + 0.5, height: WALL_H, depth: 0.5
    }, this._scene);
    topSideDepth1.position = new Vector3(center.x, WALL_H / 2, center.z - ZONE_D / 2);
    topSideDepth1.material = wallMat;
    new PhysicsAggregate(topSideDepth1, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    const topSideDepth2 = MeshBuilder.CreateBox(`${team}TopSide2`, {
      width: ZONE_W + 0.5, height: WALL_H, depth: 0.5
    }, this._scene);
    topSideDepth2.position = new Vector3(center.x, WALL_H / 2, center.z + ZONE_D / 2);
    topSideDepth2.material = wallMat;
    new PhysicsAggregate(topSideDepth2, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // ── 入口地面装饰条（提示入口位置） ──
    const entryMark = MeshBuilder.CreateGround(`${team}EntryMark`, {
      width: 0.5, height: ZONE_ENTRY_W, subdivisions: 1
    }, this._scene);
    entryMark.position = new Vector3(entryX, 0.03, center.z);
    const entryMat = new StandardMaterial(`${team}EntryMat`, this._scene);
    entryMat.diffuseColor = color;
    entryMat.emissiveColor = color.scale(0.6);
    entryMat.alpha = 0.5;
    entryMark.material = entryMat;
  }

  /** 创建边界墙 */
  private _createBoundaryWalls(): void {
    const mat = new StandardMaterial('boundaryMat', this._scene);
    mat.diffuseColor = new Color3(0.25, 0.25, 0.35);
    mat.emissiveColor = new Color3(0.04, 0.04, 0.08);
    mat.alpha = 0.85;

    const specs = [
      { w: 0.5, d: MAP_D + 10, x: -MAP_W / 2 - 0.25, z: 0 },
      { w: 0.5, d: MAP_D + 10, x: MAP_W / 2 + 0.25, z: 0 },
      { w: MAP_W + 10, d: 0.5, x: 0, z: -MAP_D / 2 - 0.25 },
      { w: MAP_W + 10, d: 0.5, x: 0, z: MAP_D / 2 + 0.25 },
    ];

    specs.forEach((s, i) => {
      const wall = MeshBuilder.CreateBox(`boundary_${i}`, {
        width: s.w, height: BOUNDARY_H, depth: s.d
      }, this._scene);
      wall.position = new Vector3(s.x, BOUNDARY_H / 2, s.z);
      wall.material = mat;
      new PhysicsAggregate(wall, PhysicsShapeType.BOX, {
        mass: 0, restitution: 0.5, friction: 0.3
      }, this._scene);
    });
  }

  /** 创建中央障碍物（增加策略性） */
  private _createCentralObstacles(): void {
    const obsMat = new StandardMaterial('obstacleMat', this._scene);
    obsMat.diffuseColor = new Color3(0.4, 0.4, 0.35);
    obsMat.emissiveColor = new Color3(0.05, 0.05, 0.03);
    obsMat.alpha = 0.9;

    // 4个对称的方块障碍，形成中央争夺区
    const obstacles = [
      { x: -5, z: -4, w: 2.5, h: 1.5, d: 2.5 },
      { x: -5, z: 4, w: 2.5, h: 1.5, d: 2.5 },
      { x: 5, z: -4, w: 2.5, h: 1.5, d: 2.5 },
      { x: 5, z: 4, w: 2.5, h: 1.5, d: 2.5 },
    ];

    obstacles.forEach((o, i) => {
      const obs = MeshBuilder.CreateBox(`obstacle_${i}`, {
        width: o.w, height: o.h, depth: o.d
      }, this._scene);
      obs.position = new Vector3(o.x, o.h / 2, o.z);
      obs.material = obsMat;
      new PhysicsAggregate(obs, PhysicsShapeType.BOX, {
        mass: 0, restitution: 0.6, friction: 0.4
      }, this._scene);
    });
  }

  /** 创建侧翼通道（沿边界的低矮栏杆，留出上下两条通路） */
  private _createSideChannels(): void {
    const railMat = new StandardMaterial('railMat', this._scene);
    railMat.diffuseColor = new Color3(0.35, 0.35, 0.45);
    railMat.emissiveColor = new Color3(0.03, 0.03, 0.06);
    railMat.alpha = 0.7;

    // 上下侧翼通道的中央分隔栏杆
    // 上通道栏杆
    const railTop = MeshBuilder.CreateBox('railTop', {
      width: MAP_W - ZONE_W * 2 - 8, height: 1.2, depth: 0.4
    }, this._scene);
    railTop.position = new Vector3(0, 0.6, -MAP_D / 2 + 3);
    railTop.material = railMat;
    new PhysicsAggregate(railTop, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // 下通道栏杆
    const railBottom = MeshBuilder.CreateBox('railBottom', {
      width: MAP_W - ZONE_W * 2 - 8, height: 1.2, depth: 0.4
    }, this._scene);
    railBottom.position = new Vector3(0, 0.6, MAP_D / 2 - 3);
    railBottom.material = railMat;
    new PhysicsAggregate(railBottom, PhysicsShapeType.BOX, {
      mass: 0, restitution: 0.5, friction: 0.3
    }, this._scene);

    // 侧翼通道地面标记
    const sidePathMat = new StandardMaterial('sidePathMat', this._scene);
    sidePathMat.diffuseColor = new Color3(0.2, 0.4, 0.25);
    sidePathMat.alpha = 0.3;

    const pathTop = MeshBuilder.CreateGround('pathTop', {
      width: MAP_W - ZONE_W * 2 - 6, height: 3
    }, this._scene);
    pathTop.position = new Vector3(0, 0.005, -MAP_D / 2 + 3);
    pathTop.material = sidePathMat;

    const pathBottom = MeshBuilder.CreateGround('pathBottom', {
      width: MAP_W - ZONE_W * 2 - 6, height: 3
    }, this._scene);
    pathBottom.position = new Vector3(0, 0.005, MAP_D / 2 - 3);
    pathBottom.material = sidePathMat;
  }

  // ──── Getter ────

  public get redZone(): Mesh { return this._redZone; }
  public get blueZone(): Mesh { return this._blueZone; }

  /** 获取收集区尺寸信息 */
  public getZoneSize(): { width: number; depth: number } {
    return { width: ZONE_W, depth: ZONE_D };
  }

  /** 获取地图尺寸 */
  public getMapSize(): { width: number; depth: number } {
    return { width: MAP_W, depth: MAP_D };
  }
}
