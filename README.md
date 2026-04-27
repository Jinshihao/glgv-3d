# 果冻大作战：疯狂搬运工 🎮

3D物理碰撞派对竞技游戏 | React 19 + TypeScript + Babylon.js + Havok

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 操作说明

| 按键 | 功能 |
|------|------|
| WASD | 移动角色 |
| 空格 | 释放职业技能 |
| Shift | 冲刺 |
| E | 推箱子（长按） |

## 三种职业

| 职业 | 定位 | 技能 |
|------|------|------|
| 🪨 巨岩卫士 | 重型搬运/防守 | 泰山压顶（范围冲击波） |
| 👻 浮空幽灵 | 潜行偷取/骚扰 | 相位穿梭（隐身+穿墙） |
| 🍡 软糯果冻 | 灵活护卫/追击 | 弹射（高速冲刺） |

## 四种能量方块

| 类型 | 重量 | 积分 | 刷新占比 |
|------|------|------|----------|
| 木箱 | 20 | +5 | 50% |
| 宝箱 | 50 | +15 | 30% |
| 金库 | 100 | +30 | 15% |
| 传说蛋 | 200 | +50 | 5% |

## 项目结构

```
src/
├── game/            # 核心引擎
│   ├── GameEngine.ts     # 统一引擎（场景、物理、渲染、游戏循环）
│   └── MapManager.ts     # 地图生成（竞技场、收集区、边界墙）
├── entities/        # 游戏实体
│   ├── Player.ts         # 玩家基类（移动、冲刺、推箱子）
│   ├── RockGuardian.ts   # 巨岩卫士
│   ├── FloatingGhost.ts  # 浮空幽灵
│   ├── SoftJelly.ts      # 软糯果冻
│   └── EnergyBox.ts      # 能量方块
├── systems/         # 游戏系统
│   ├── PlayerController.ts  # 键盘输入控制
│   ├── AIController.ts      # AI自动控制
│   ├── BoxPushSystem.ts     # 推箱子系统
│   └── ScoreSystem.ts       # 得分判定
├── data/            # 数据配置
│   ├── constants.ts       # 物理常量
│   ├── professions.ts      # 职业配置
│   └── boxTypes.ts         # 方块类型
├── store/           # 状态管理
│   └── gameStore.ts       # Zustand全局状态
├── ui/              # UI界面
│   ├── components/        # React组件
│   │   ├── CharacterSelect.tsx  # 角色选择
│   │   ├── GameHUD.tsx          # 战斗HUD
│   │   ├── ResultScreen.tsx     # 结算界面
│   │   └── MainMenu.tsx         # 主界面
│   └── styles/
│       └── GameUI.css           # 样式
└── utils/
    └── mathUtils.ts       # 数学工具
```

## 当前状态

✅ **可玩功能**：
- 角色选择 → 2v2对战 → 结算的完整流程
- 3种职业 + 4种能量方块
- WASD移动 + 冲刺 + 技能 + 推箱子
- AI对手（自动寻路、推箱、防守、偷取）
- 实时比分 + 5分钟倒计时
- 相机平滑跟随玩家
- 方块自动刷新维持场上数量
- 得分区域AABB检测

⚠️ **待完善**：
- 推箱子使用平滑速度插值而非物理关节
- AI行为较简单
- 音效和粒子特效
- 更多地图和模式
- 网络同步
