import { useGameStore } from '../../store/gameStore';
import '../styles/GameUI.css';

/** 战斗HUD - 比分、时间、技能状态、事件通知 */
export function GameHUD() {
  const redScore = useGameStore(s => s.redScore);
  const blueScore = useGameStore(s => s.blueScore);
  const gameTime = useGameStore(s => s.gameTime);
  const maxGameTime = useGameStore(s => s.maxGameTime);
  const skillCD = useGameStore(s => s.skillCD);
  const skillMaxCD = useGameStore(s => s.skillMaxCD);
  const skillCanUse = useGameStore(s => s.skillCanUse);
  const isPushing = useGameStore(s => s.isPushing);
  const currentEvent = useGameStore(s => s.currentEvent);

  const remaining = Math.max(0, maxGameTime - gameTime);
  const min = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
  const isUrgent = remaining <= 60;

  // 技能CD百分比
  const cdPercent = skillMaxCD > 0 ? (skillCD / skillMaxCD) * 100 : 0;
  const cdDisplay = skillCD > 0 ? Math.ceil(skillCD) : '';

  return (
    <div className="hud">
      {/* ── 顶部比分栏 ── */}
      <div className="hud-score-bar">
        <div className="hud-team hud-red">
          <span className="hud-team-label">红方</span>
          <span className="hud-score-num">{redScore}</span>
        </div>
        <div className={`hud-timer ${isUrgent ? 'hud-timer-urgent' : ''}`}>{timeStr}</div>
        <div className="hud-team hud-blue">
          <span className="hud-score-num">{blueScore}</span>
          <span className="hud-team-label">蓝方</span>
        </div>
      </div>

      {/* ── 动态事件提示 ── */}
      {currentEvent && (
        <div className="hud-event-banner">
          <div className="hud-event-text">{currentEvent.message}</div>
          <div className="hud-event-timer-bar">
            <div
              className="hud-event-timer-fill"
              style={{ width: `${Math.max(0, (currentEvent.timer / 60) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 推箱状态提示 ── */}
      {isPushing && (
        <div className="hud-push-indicator">
          <span className="hud-push-icon">🔗</span>
          <span>推箱中 - 移速降低，无法使用技能/冲刺</span>
        </div>
      )}

      {/* ── 底部技能栏 ── */}
      <div className="hud-skill-bar">
        <div className={`hud-skill-slot ${skillCanUse ? 'hud-skill-ready' : 'hud-skill-cd'}`}>
          <div className="hud-skill-key">空格</div>
          <div className="hud-skill-icon">⚡</div>
          <div className="hud-skill-label">技能</div>
          {!skillCanUse && (
            <div className="hud-skill-cd-overlay" style={{ height: `${cdPercent}%` }}>
              <span className="hud-skill-cd-text">{cdDisplay}</span>
            </div>
          )}
        </div>

        <div className="hud-skill-slot hud-skill-ready">
          <div className="hud-skill-key">Shift</div>
          <div className="hud-skill-icon">💨</div>
          <div className="hud-skill-label">冲刺</div>
        </div>

        <div className={`hud-skill-slot ${isPushing ? 'hud-skill-active' : 'hud-skill-ready'}`}>
          <div className="hud-skill-key">E</div>
          <div className="hud-skill-icon">📦</div>
          <div className="hud-skill-label">推箱</div>
        </div>
      </div>

      {/* ── 操作提示 ── */}
      <div className="hud-controls">
        <div className="hud-key">WASD 移动</div>
        <div className="hud-key">空格 技能</div>
        <div className="hud-key">Shift 冲刺</div>
        <div className="hud-key">E 推箱子</div>
      </div>
    </div>
  );
}
