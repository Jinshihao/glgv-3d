// 能量方块类型枚举
export enum BoxType {
  WOODEN_CRATE = 'wooden_crate',  // 木箱
  TREASURE_CHEST = 'treasure_chest',  // 宝箱
  VAULT = 'vault',  // 金库
  LEGENDARY_EGG = 'legendary_egg',  // 传说蛋
}

// 方块类型配置接口
export interface BoxTypeConfig {
  type: BoxType;
  name: string;
  weight: number;      // 重量
  score: number;       // 积分
  spawnRate: number;   // 刷新占比 (0-1)
  
  // 视觉配置
  size: number;        // 大小（立方体边长）
  color: string;       // 主体颜色
  emissiveColor: string; // 发光颜色
  hasGlow: boolean;    // 是否有光晕效果
  glowIntensity: number; // 光晕强度
  
  // 物理配置
  friction: number;    // 摩擦系数
  restitution: number; // 弹性系数
  
  // 音效配置
  soundType: string;   // 音效类型
}

// 四种能量方块配置
export const BOX_TYPES: Record<BoxType, BoxTypeConfig> = {
  [BoxType.WOODEN_CRATE]: {
    type: BoxType.WOODEN_CRATE,
    name: '木箱',
    weight: 20,
    score: 5,
    spawnRate: 0.5,  // 50%
    
    size: 1.0,
    color: '#DEB887',      // 浅木色
    emissiveColor: '#F5DEB3',
    hasGlow: false,
    glowIntensity: 0,
    
    friction: 0.4,
    restitution: 0.8,
    
    soundType: 'wood',
  },
  
  [BoxType.TREASURE_CHEST]: {
    type: BoxType.TREASURE_CHEST,
    name: '宝箱',
    weight: 50,
    score: 15,
    spawnRate: 0.3,  // 30%
    
    size: 1.3,
    color: '#CD853F',      // 金属包边色
    emissiveColor: '#DAA520',
    hasGlow: true,
    glowIntensity: 0.5,
    
    friction: 0.4,
    restitution: 0.8,
    
    soundType: 'metal',
  },
  
  [BoxType.VAULT]: {
    type: BoxType.VAULT,
    name: '金库',
    weight: 100,
    score: 30,
    spawnRate: 0.15,  // 15%
    
    size: 1.6,
    color: '#FFD700',      // 金色
    emissiveColor: '#FFA500',
    hasGlow: true,
    glowIntensity: 0.8,
    
    friction: 0.5,
    restitution: 0.7,
    
    soundType: 'heavy',
  },
  
  [BoxType.LEGENDARY_EGG]: {
    type: BoxType.LEGENDARY_EGG,
    name: '传说蛋',
    weight: 200,
    score: 50,
    spawnRate: 0.05,  // 5%
    
    size: 2.0,
    color: '#FF69B4',      // 彩色光晕
    emissiveColor: '#00FFFF',
    hasGlow: true,
    glowIntensity: 1.5,
    
    friction: 0.6,
    restitution: 0.6,
    
    soundType: 'epic',
  },
};

// 获取方块类型配置
export function getBoxTypeConfig(type: BoxType): BoxTypeConfig {
  return BOX_TYPES[type];
}

// 获取所有方块类型
export function getAllBoxTypes(): BoxTypeConfig[] {
  return Object.values(BOX_TYPES);
}

// 根据刷新占比随机选择方块类型
export function getRandomBoxType(): BoxType {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [type, config] of Object.entries(BOX_TYPES)) {
    cumulative += config.spawnRate;
    if (rand <= cumulative) {
      return type as BoxType;
    }
  }
  
  // 默认返回木箱
  return BoxType.WOODEN_CRATE;
}
