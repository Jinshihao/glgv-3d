import { Vector3 } from '@babylonjs/core/Maths/math.vector';

/**
 * 限制值在[min, max]范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 向量线性插值
 */
export function lerpVec3(a: Vector3, b: Vector3, t: number): Vector3 {
  return new Vector3(
    lerp(a.x, b.x, t),
    lerp(a.y, b.y, t),
    lerp(a.z, b.z, t)
  );
}

/**
 * 角度转弧度
 */
export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * 生成随机浮点数 [min, max)
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 加权随机选择
 * @param items 选项数组
 * @param weights 对应权重数组
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  
  return items[items.length - 1];
}

/**
 * 平滑阻尼（类似Unity的SmoothDamp）
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  dt: number,
  maxSpeed: number = Infinity
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
  let change = current - target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  
  const adjustedTarget = current - change;
  const temp = (velocity.value + omega * change) * dt;
  velocity.value = (velocity.value - omega * temp) * exp;
  
  return adjustedTarget + (change + temp) * exp;
}
