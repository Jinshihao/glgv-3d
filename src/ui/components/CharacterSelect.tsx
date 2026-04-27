import { useGameStore } from '../../store/gameStore';
import { getProfessionConfig } from '../../data/professions';
import '../styles/GameUI.css';

/** 角色选择界面 */
export function CharacterSelect() {
  const selectedProfession = useGameStore(s => s.selectedProfession);
  const setSelectedProfession = useGameStore(s => s.setSelectedProfession);
  const setPhase = useGameStore(s => s.setPhase);

  const professions = [
    {
      type: 'rock_guardian' as const,
      emoji: '🪨',
      name: '巨岩卫士',
      desc: '重型搬运 / 区域防守',
      detail: '高撞击力，擅长击飞轻量幽灵，有效阻止偷取',
      skill: '泰山压顶',
      skillDesc: '原地震击，大范围冲击波击飞敌人和方块',
      stats: { mass: 100, speed: 5.0, impact: '高', push: '高' },
    },
    {
      type: 'floating_ghost' as const,
      emoji: '👻',
      name: '浮空幽灵',
      desc: '潜行偷取 / 精密骚扰',
      detail: '隐身穿墙，擅长绕过防线偷取高价值方块',
      skill: '相位穿梭',
      skillDesc: '隐身+无视碰撞3秒，穿过敌人和障碍物',
      stats: { mass: 40, speed: 7.5, impact: '低', push: '低' },
    },
    {
      type: 'soft_jelly' as const,
      emoji: '🍡',
      name: '软糯果冻',
      desc: '灵活护卫 / 追击拦截',
      detail: '高机动弹射，擅长追击幽灵和拦截坦克推箱',
      skill: '弹射',
      skillDesc: '瞬间高速弹射，撞击敌人使其脱手推箱',
      stats: { mass: 60, speed: 6.5, impact: '中', push: '中' },
    },
  ];

  return (
    <div className="menu-screen">
      <h1 className="menu-title">果冻大作战</h1>
      <p className="menu-subtitle">疯狂搬运工</p>

      <div className="char-grid">
        {professions.map((prof) => {
          const config = getProfessionConfig(prof.type as any);
          return (
            <div
              key={prof.type}
              className={`char-card ${selectedProfession === prof.type ? 'char-selected' : ''}`}
              onClick={() => setSelectedProfession(prof.type as any)}
            >
              <div className="char-emoji">{prof.emoji}</div>
              <div className="char-name">{prof.name}</div>
              <div className="char-desc">{prof.desc}</div>
              <div className="char-detail">{prof.detail}</div>

              <div className="char-skill-info">
                <div className="char-skill-name">{prof.skill}</div>
                <div className="char-skill-desc">{prof.skillDesc}</div>
              </div>

              <div className="char-stats">
                <div>质量: {prof.stats.mass}</div>
                <div>速度: {prof.stats.speed} m/s</div>
                <div>撞击力: {prof.stats.impact}</div>
                <div>推箱: {prof.stats.push}</div>
                <div>技能CD: {config.skillCooldown}s</div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="menu-btn menu-btn-primary"
        onClick={() => setPhase('playing')}
      >
        开始游戏
      </button>
    </div>
  );
}
