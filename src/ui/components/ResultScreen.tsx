import { useGameStore } from '../../store/gameStore';
import '../styles/GameUI.css';

/** 结算界面 v2 - MVP展示、个人数据、全队统计 */
export function ResultScreen() {
  const redScore = useGameStore(s => s.redScore);
  const blueScore = useGameStore(s => s.blueScore);
  const winner = useGameStore(s => s.winner);
  const mvpName = useGameStore(s => s.mvpName);
  const mvpTeam = useGameStore(s => s.mvpTeam);
  const playerStats = useGameStore(s => s.playerStats);
  const reset = useGameStore(s => s.reset);

  const winnerText = winner === 'red' ? '红方胜利！' : winner === 'blue' ? '蓝方胜利！' : '平局！';
  const winnerClass = winner === 'red' ? 'result-red' : winner === 'blue' ? 'result-blue' : 'result-draw';

  return (
    <div className="menu-screen result-screen">
      <h1 className={`result-title ${winnerClass}`}>{winnerText}</h1>

      {/* ── 比分展示 ── */}
      <div className="result-scores">
        <div className="result-team result-red">
          <div className="result-team-label">红方</div>
          <div className="result-score-num">{redScore}</div>
        </div>
        <div className="result-vs">VS</div>
        <div className="result-team result-blue">
          <div className="result-score-num">{blueScore}</div>
          <div className="result-team-label">蓝方</div>
        </div>
      </div>

      {/* ── MVP展示 ── */}
      {mvpName && (
        <div className={`result-mvp ${mvpTeam === 'red' ? 'result-red' : 'result-blue'}`}>
          <div className="result-mvp-label">🏆 MVP</div>
          <div className="result-mvp-name">{mvpName}</div>
        </div>
      )}

      {/* ── 全队数据 ── */}
      {playerStats.length > 0 && (
        <div className="result-stats-table">
          <div className="result-stats-header">
            <span>玩家</span>
            <span>队伍</span>
            <span>搬运分</span>
            <span>偷取</span>
            <span>防守</span>
            <span>助攻</span>
            <span>推箱数</span>
          </div>
          {playerStats.map((ps, i) => (
            <div key={i} className={`result-stats-row ${ps.team === 'red' ? 'stats-red' : 'stats-blue'}`}>
              <span>{ps.name}</span>
              <span>{ps.team === 'red' ? '红方' : '蓝方'}</span>
              <span>{ps.stats.pushScore}</span>
              <span>{ps.stats.stealCount}</span>
              <span>{ps.stats.defendCount}</span>
              <span>{ps.stats.assistCount}</span>
              <span>{ps.stats.boxesPushed}</span>
            </div>
          ))}
        </div>
      )}

      <button className="menu-btn menu-btn-primary" onClick={reset}>
        再来一局
      </button>
    </div>
  );
}
