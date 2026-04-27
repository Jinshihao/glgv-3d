import { useGameStore } from '../../store/gameStore';
import './GameUI.css';

/** 主界面 */
export function MainMenu() {
  const setPhase = useGameStore(s => s.setPhase);

  return (
    <div className="menu-screen">
      <h1 className="menu-title">果冻大作战</h1>
      <p className="menu-subtitle">疯狂搬运工</p>
      <p className="menu-tagline">推箱子 · 撞飞敌人 · 抢夺积分</p>

      <div className="menu-buttons">
        <button className="menu-btn menu-btn-primary" onClick={() => setPhase('loading')}>
          🎮 快速开始
        </button>
        <button className="menu-btn" onClick={() => {}}>
          🏆 排位赛（暂未开放）
        </button>
        <button className="menu-btn" onClick={() => {}}>
          🎲 娱乐模式（暂未开放）
        </button>
      </div>

      <div className="menu-footer">
        <p>V0.1 Demo · 物理碰撞派对竞技</p>
      </div>
    </div>
  );
}
