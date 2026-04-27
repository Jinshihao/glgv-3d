import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EnergyBox } from '../entities/EnergyBox';

interface ZoneInfo {
  mesh: Mesh;
  team: 'red' | 'blue';
  center: Vector3;
  halfW: number;
  halfD: number;
}

/**
 * 得分系统 - 使用AABB检测方块是否在收集区内
 */
export class ScoreSystem {
  private _zones: ZoneInfo[] = [];
  private _redScore = 0;
  private _blueScore = 0;
  private _onScoreChange: ((red: number, blue: number) => void) | null = null;

  /** 设置收集区 */
  public setupZones(redMesh: Mesh, blueMesh: Mesh, zoneSize: { width: number; depth: number }): void {
    this._zones = [
      {
        mesh: redMesh,
        team: 'red',
        center: redMesh.position.clone(),
        halfW: zoneSize.width / 2,
        halfD: zoneSize.depth / 2,
      },
      {
        mesh: blueMesh,
        team: 'blue',
        center: blueMesh.position.clone(),
        halfW: zoneSize.width / 2,
        halfD: zoneSize.depth / 2,
      },
    ];
  }

  /** 每帧更新：检测方块是否在收集区内 */
  public update(boxes: EnergyBox[]): void {
    // 先清除所有方块的zone标记
    for (const box of boxes) {
      box.setInZone(null);
    }

    // 逐个检测
    for (const zone of this._zones) {
      for (const box of boxes) {
        if (this._isBoxInZone(box, zone)) {
          box.setInZone(zone.team);
        }
      }
    }

    // 计算得分
    let red = 0, blue = 0;
    for (const box of boxes) {
      const z = box.getCurrentZone();
      if (z === 'red') red += box.getScore();
      else if (z === 'blue') blue += box.getScore();
    }

    if (red !== this._redScore || blue !== this._blueScore) {
      this._redScore = red;
      this._blueScore = blue;
      this._onScoreChange?.(red, blue);
    }
  }

  /** AABB 检测方块中心是否在收集区内 */
  private _isBoxInZone(box: EnergyBox, zone: ZoneInfo): boolean {
    const pos = box.getMesh().position;
    const dx = Math.abs(pos.x - zone.center.x);
    const dz = Math.abs(pos.z - zone.center.z);
    return dx <= zone.halfW && dz <= zone.halfD;
  }

  // ──── API ────

  public getRedScore(): number { return this._redScore; }
  public getBlueScore(): number { return this._blueScore; }

  public setOnScoreChange(cb: (red: number, blue: number) => void): void {
    this._onScoreChange = cb;
  }

  public reset(): void {
    this._redScore = 0;
    this._blueScore = 0;
  }
}
