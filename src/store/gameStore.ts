import { create } from 'zustand';
import type { GamePhase, GameEventInfo } from '../game/GameEngine';
import { ProfessionType } from '../data/professions';
import type { PlayerStats } from '../entities/Player';

interface GameState {
  // 游戏阶段
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;

  // 比分
  redScore: number;
  blueScore: number;
  setScores: (red: number, blue: number) => void;

  // 时间
  gameTime: number;
  maxGameTime: number;
  setTime: (time: number) => void;

  // 职业选择
  selectedProfession: ProfessionType;
  setSelectedProfession: (p: ProfessionType) => void;

  // 结果
  winner: 'red' | 'blue' | 'draw' | null;
  setWinner: (w: 'red' | 'blue' | 'draw' | null) => void;

  // 技能状态
  skillCD: number;
  skillMaxCD: number;
  skillCanUse: boolean;
  setSkillState: (cd: number, maxCd: number, canUse: boolean) => void;

  // 推箱状态
  isPushing: boolean;
  setPushing: (pushing: boolean) => void;

  // 动态事件
  currentEvent: GameEventInfo | null;
  setEvent: (event: GameEventInfo | null) => void;

  // 结算数据
  mvpName: string;
  mvpTeam: 'red' | 'blue' | null;
  playerStats: { name: string; team: string; stats: PlayerStats }[];
  setResultData: (mvpName: string, mvpTeam: 'red' | 'blue' | null, stats: { name: string; team: string; stats: PlayerStats }[]) => void;

  // 重置
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'loading',
  setPhase: (phase) => set({ phase }),

  redScore: 0,
  blueScore: 0,
  setScores: (red, blue) => set({ redScore: red, blueScore: blue }),

  gameTime: 0,
  maxGameTime: 300,
  setTime: (time) => set({ gameTime: time }),

  selectedProfession: ProfessionType.SOFT_JELLY,
  setSelectedProfession: (p) => set({ selectedProfession: p }),

  winner: null,
  setWinner: (w) => set({ winner: w }),

  skillCD: 0,
  skillMaxCD: 8,
  skillCanUse: true,
  setSkillState: (cd, maxCd, canUse) => set({ skillCD: cd, skillMaxCD: maxCd, skillCanUse: canUse }),

  isPushing: false,
  setPushing: (pushing) => set({ isPushing: pushing }),

  currentEvent: null,
  setEvent: (event) => set({ currentEvent: event }),

  mvpName: '',
  mvpTeam: null,
  playerStats: [],
  setResultData: (mvpName, mvpTeam, stats) => set({ mvpName, mvpTeam, playerStats: stats }),

  reset: () => set({
    phase: 'loading',
    redScore: 0,
    blueScore: 0,
    gameTime: 0,
    winner: null,
    skillCD: 0,
    skillCanUse: true,
    isPushing: false,
    currentEvent: null,
    mvpName: '',
    mvpTeam: null,
    playerStats: [],
  }),
}));
