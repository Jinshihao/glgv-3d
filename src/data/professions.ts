// 职业类型枚举
export enum ProfessionType {
  ROCK_GUARDIAN = 'rock_guardian',      // 巨岩卫士
  FLOATING_GHOST = 'floating_ghost',    // 浮空幽灵
  SOFT_JELLY = 'soft_jelly',            // 软糯果冻
}

// 职业配置接口
export interface ProfessionConfig {
  type: ProfessionType;
  name: string;
  emoji: string;
  description: string;
  positioning: string;  // 定位
  
  // 物理属性
  mass: number;           // 质量
  maxSpeed: number;       // 最高速度 (m/s)
  acceleration: number;   // 加速度
  impactForce: number;    // 撞击力 (0-100)
  pushEfficiency: number; // 推箱效率 (0-100)
  
  // 技能
  skillName: string;
  skillCooldown: number;  // 技能CD（秒）
  skillDescription: string;
  skillCDReduction: string; // 减CD条件
  
  // 视觉配置
  color: string;          // 主体颜色
  emissiveColor: string;  // 发光颜色
  size: number;           // 角色大小
}

// 三种职业配置数据
export const PROFESSIONS: Record<ProfessionType, ProfessionConfig> = {
  [ProfessionType.ROCK_GUARDIAN]: {
    type: ProfessionType.ROCK_GUARDIAN,
    name: '巨岩卫士',
    emoji: '🪨',
    description: '重型搬运 / 区域防守',
    positioning: '坦克',
    
    mass: 100,
    maxSpeed: 5.0,
    acceleration: 8.0,
    impactForce: 90,      // 高（击退距离远）
    pushEfficiency: 85,   // 高（单人可勉强推重箱）
    
    skillName: '泰山压顶',
    skillCooldown: 12,
    skillDescription: '原地震击，产生大范围冲击波（冲击力1000），击飞周围所有敌人和能量方块',
    skillCDReduction: '在己方收集区内震飞正在推箱的敌人，-3s CD',
    
    color: '#8B4513',       // 深棕色
    emissiveColor: '#A0522D',
    size: 1.2,
  },
  
  [ProfessionType.FLOATING_GHOST]: {
    type: ProfessionType.FLOATING_GHOST,
    name: '浮空幽灵',
    emoji: '👻',
    description: '潜行偷取 / 精密骚扰',
    positioning: '刺客',
    
    mass: 40,
    maxSpeed: 7.5,
    acceleration: 12.0,
    impactForce: 30,       // 低（撞击效果轻）
    pushEfficiency: 40,    // 低（推重箱极慢）
    
    skillName: '相位穿梭',
    skillCooldown: 10,
    skillDescription: '进入隐身+无视碰撞状态，持续3秒，可穿过敌人和障碍物',
    skillCDReduction: '在相位穿梭结束后3秒内成功开始推动对方收集区内的能量方块，-4s CD',
    
    color: '#9370DB',       // 中紫色
    emissiveColor: '#BA55D3',
    size: 0.9,
  },
  
  [ProfessionType.SOFT_JELLY]: {
    type: ProfessionType.SOFT_JELLY,
    name: '软糯果冻',
    emoji: '🍡',
    description: '灵活护卫 / 追击拦截',
    positioning: '战士',
    
    mass: 60,
    maxSpeed: 6.5,
    acceleration: 10.0,
    impactForce: 60,       // 中
    pushEfficiency: 60,    // 中
    
    skillName: '弹射',
    skillCooldown: 8,
    skillDescription: '朝指定方向瞬间高速弹射（速度矢量×3），撞击敌人可使其脱手正在推的箱子',
    skillCDReduction: '弹射撞击使敌人掉落正在推的箱子，-2s CD',
    
    color: '#FF69B4',       // 热粉色
    emissiveColor: '#FF1493',
    size: 1.0,
  },
};

// 获取职业配置
export function getProfessionConfig(type: ProfessionType): ProfessionConfig {
  return PROFESSIONS[type];
}

// 获取所有职业列表
export function getAllProfessions(): ProfessionConfig[] {
  return Object.values(PROFESSIONS);
}
