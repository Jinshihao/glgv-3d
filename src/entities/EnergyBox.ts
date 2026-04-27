import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { BoxType, getBoxTypeConfig } from '../data/boxTypes';
import type { BoxTypeConfig } from '../data/boxTypes';

/**
 * 能量方块 v2
 * - mesh.metadata 标记（供技能碰撞检测）
 * - 高价值方块光柱
 * - 不同类型视觉差异化
 */
export class EnergyBox {
  private _scene: Scene;
  private _mesh: Mesh;
  private _boxType: BoxType;
  private _config: BoxTypeConfig;
  private _boxId: string;
  private _inZone: 'red' | 'blue' | null = null;
  private _beacon: Mesh | null = null; // 光柱

  constructor(scene: Scene, boxType: BoxType, boxId: string, position: Vector3) {
    this._scene = scene;
    this._boxType = boxType;
    this._config = getBoxTypeConfig(boxType);
    this._boxId = boxId;

    this._mesh = this._createMesh();
    this._mesh.position = position.clone();
    // 元数据标记
    this._mesh.metadata = { type: 'box', box: this };
    this._createPhysicsBody();

    // 高价值方块创建光柱
    if (this._config.score >= 15) {
      this._createBeacon();
    }
  }

  private _createMesh(): Mesh {
    const s = this._config.size;
    let mesh: Mesh;

    switch (this._boxType) {
      case BoxType.WOODEN_CRATE:
        // 木箱：普通立方体
        mesh = MeshBuilder.CreateBox(`box_${this._boxId}`, { width: s, height: s, depth: s }, this._scene);
        break;
      case BoxType.TREASURE_CHEST:
        // 宝箱：稍扁+有棱角感
        mesh = MeshBuilder.CreateBox(`box_${this._boxId}`, {
          width: s, height: s * 0.8, depth: s
        }, this._scene);
        break;
      case BoxType.VAULT:
        // 金库：圆柱体，厚重
        mesh = MeshBuilder.CreateCylinder(`box_${this._boxId}`, {
          diameter: s * 0.9, height: s * 0.9, tessellation: 8
        }, this._scene);
        break;
      case BoxType.LEGENDARY_EGG:
        // 传说蛋：球体
        mesh = MeshBuilder.CreateSphere(`box_${this._boxId}`, {
          diameter: s * 0.9, segments: 12
        }, this._scene);
        break;
      default:
        mesh = MeshBuilder.CreateBox(`box_${this._boxId}`, { width: s, height: s, depth: s }, this._scene);
    }

    const mat = new StandardMaterial(`boxMat_${this._boxId}`, this._scene);
    mat.diffuseColor = Color3.FromHexString(this._config.color);

    if (this._config.hasGlow) {
      mat.emissiveColor = Color3.FromHexString(this._config.emissiveColor)
        .scale(Math.min(this._config.glowIntensity, 1.0));
    }
    mat.specularColor = new Color3(0.15, 0.15, 0.15);
    mesh.material = mat;

    return mesh;
  }

  private _createPhysicsBody(): void {
    const shapeType = this._boxType === BoxType.VAULT
      ? PhysicsShapeType.CYLINDER
      : this._boxType === BoxType.LEGENDARY_EGG
        ? PhysicsShapeType.SPHERE
        : PhysicsShapeType.BOX;

    new PhysicsAggregate(
      this._mesh, shapeType,
      {
        mass: this._config.weight,
        restitution: this._config.restitution,
        friction: this._config.friction,
      },
      this._scene
    );
    const body = this._mesh.physicsBody;
    if (body) {
      body.setLinearDamping(0.3);
      body.setAngularDamping(0.8);
    }
  }

  /** 创建高价值方块光柱 */
  private _createBeacon(): void {
    const beaconHeight = this._config.score >= 30 ? 15 : 10;
    const beaconDiameter = this._config.score >= 30 ? 0.8 : 0.5;

    this._beacon = MeshBuilder.CreateCylinder(`beacon_${this._boxId}`, {
      height: beaconHeight,
      diameterTop: beaconDiameter * 0.3,
      diameterBottom: beaconDiameter,
      tessellation: 8,
    }, this._scene);

    // 光柱位置在方块正上方
    this._beacon.position = new Vector3(0, beaconHeight / 2 + 2, 0);
    this._beacon.parent = this._mesh;

    const beaconMat = new StandardMaterial(`beaconMat_${this._boxId}`, this._scene);
    const beaconColor = Color3.FromHexString(this._config.emissiveColor);
    beaconMat.diffuseColor = beaconColor;
    beaconMat.emissiveColor = beaconColor.scale(0.6);
    beaconMat.alpha = 0.3;
    beaconMat.backFaceCulling = false;
    this._beacon.material = beaconMat;
  }

  /** 更新（每帧） */
  public update(_dt: number): void {
    // 高价值方块缓慢旋转
    if (this._config.hasGlow) {
      this._mesh.rotation.y += _dt * 0.5;
    }

    // 传说蛋特殊旋转
    if (this._boxType === BoxType.LEGENDARY_EGG) {
      this._mesh.rotation.x += _dt * 0.2;
    }

    // Y轴位置修正
    const halfHeight = this._config.size / 2;
    if (this._mesh.position.y < halfHeight) {
      this._mesh.position.y = halfHeight;
    }

    // 光柱跟随（parent已设置，自动跟随）
  }

  // ──── Getter / Setter ────

  public getMesh(): Mesh { return this._mesh; }
  public getBoxId(): string { return this._boxId; }
  public getBoxType(): BoxType { return this._boxType; }
  public getScore(): number { return this._config.score; }
  public getWeight(): number { return this._config.weight; }
  public isInZone(): boolean { return this._inZone !== null; }
  public getCurrentZone(): 'red' | 'blue' | null { return this._inZone; }

  public setInZone(zone: 'red' | 'blue' | null): void {
    if (this._inZone === zone) return;
    this._inZone = zone;
    const mat = this._mesh.material as StandardMaterial;
    if (zone === 'red') {
      mat.emissiveColor = new Color3(0.4, 0.05, 0.05);
    } else if (zone === 'blue') {
      mat.emissiveColor = new Color3(0.05, 0.1, 0.4);
    } else {
      if (this._config.hasGlow) {
        mat.emissiveColor = Color3.FromHexString(this._config.emissiveColor)
          .scale(Math.min(this._config.glowIntensity, 1.0));
      } else {
        mat.emissiveColor = Color3.Black();
      }
    }

    // 光柱颜色也跟随变化
    if (this._beacon) {
      const beaconMat = this._beacon.material as StandardMaterial;
      if (zone === 'red') {
        beaconMat.emissiveColor = new Color3(0.8, 0.15, 0.1);
      } else if (zone === 'blue') {
        beaconMat.emissiveColor = new Color3(0.1, 0.2, 0.8);
      } else {
        beaconMat.emissiveColor = Color3.FromHexString(this._config.emissiveColor).scale(0.6);
      }
    }
  }

  public dispose(): void {
    this._beacon?.dispose();
    this._mesh.dispose();
  }
}
