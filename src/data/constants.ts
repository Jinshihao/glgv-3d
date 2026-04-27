// 物理系统常量配置
export const PHYSICS_CONSTANTS = {
  // 地面摩擦系数（低摩擦滑行）
  GROUND_FRICTION: 0.1,
  
  // 碰撞恢复系数（高弹性碰撞）
  RESTITUTION: 0.8,
  
  // 角色转向阻尼
  PLAYER_DAMPING: 0.15,
  
  // 能量方块与地面摩擦（有重量感但不粘滞）
  BOX_FRICTION: 0.4,
  
  // 冲刺撞击力系数（冲刺时的撞击效果是普通移动的1.5倍）
  DASH_MULTIPLIER: 1.5,
  
  // 推动系数（用于计算推箱速度）
  PUSH_COEFFICIENT: 50,
  
  // 推箱时移动速度惩罚（推箱时最大速度的倍数）
  PUSH_SPEED_PENALTY: 0.5,
  
  // 重力
  GRAVITY: -9.81,
  
  // 物理引擎更新频率（Hz）
  PHYSICS_FPS: 60,
} as const;

// 游戏基础配置
export const GAME_CONFIG = {
  // 标准模式时长（秒）
  STANDARD_MATCH_TIME: 300, // 5分钟
  
  // 极速模式时长（秒）
  QUICK_MATCH_TIME: 180, // 3分钟
  
  // 场上能量方块总数（根据人数动态调整）
  BOX_COUNT_1V1: 6,
  BOX_COUNT_2V2: 10,
  BOX_COUNT_4V4: 16,
  BOX_COUNT_8V8: 24,
  
  // 收集区判定容差
  ZONE_DETECTION_TOLERANCE: 0.5,
} as const;

// 玩家控制配置
export const CONTROL_CONFIG = {
  // 移动速度（单位/秒）
  MOVE_SPEED_MULTIPLIER: 1.0,
  
  // 冲刺持续时间（秒）
  DASH_DURATION: 0.3,
  
  // 冲刺冷却时间（秒）
  DASH_COOLDOWN: 3.0,
  
  // 推箱检测距离
  PUSH_DETECT_DISTANCE: 2.5,
  
  // 交互键长按触发时间（秒）
  PUSH_HOLD_TIME: 0.2,
} as const;

// 相机配置
export const CAMERA_CONFIG = {
  // 第三人称相机距离
  THIRD_PERSON_DISTANCE: 10,
  
  // 相机高度
  CAMERA_HEIGHT: 8,
  
  // 俯视角相机距离
  TOP_DOWN_DISTANCE: 25,
  
  // 相机平滑跟随速度
  CAMERA_SMOOTH_SPEED: 0.1,
} as const;
