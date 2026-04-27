import { useEffect, useRef } from 'react';
import { GameEngine } from './game/GameEngine';
import type { GamePhase } from './game/GameEngine';
import { useGameStore } from './store/gameStore';
import { CharacterSelect } from './ui/components/CharacterSelect';
import { GameHUD } from './ui/components/GameHUD';
import { ResultScreen } from './ui/components/ResultScreen';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const phase = useGameStore(s => s.phase);
  const setPhase = useGameStore(s => s.setPhase);
  const setScores = useGameStore(s => s.setScores);
  const setTime = useGameStore(s => s.setTime);
  const setWinner = useGameStore(s => s.setWinner);
  const setSkillState = useGameStore(s => s.setSkillState);
  const setPushing = useGameStore(s => s.setPushing);
  const setEvent = useGameStore(s => s.setEvent);
  const setResultData = useGameStore(s => s.setResultData);
  const selectedProfession = useGameStore(s => s.selectedProfession);
  const reset = useGameStore(s => s.reset);

  /** 初始化引擎 */
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.initialize().then(() => {
      console.log('[App] 引擎初始化完成，显示角色选择');
      setPhase('loading');
    });

    // 注册回调
    engine.setOnScoreChange((red, blue) => setScores(red, blue));
    engine.setOnTimeUpdate((time) => setTime(time));
    engine.setOnPhaseChange((p: GamePhase) => {
      if (p === 'ended') {
        const r = engine.redScore;
        const b = engine.blueScore;
        if (r > b) setWinner('red');
        else if (b > r) setWinner('blue');
        else setWinner('draw');

        // 设置结算数据
        const mvp = engine.getMVP();
        const allStats = engine.getAllPlayerStats().map(ps => ({
          name: ps.player.playerId,
          team: ps.player.team,
          stats: ps.stats,
        }));
        setResultData(
          mvp ? mvp.playerId : '',
          mvp ? mvp.team : null,
          allStats
        );
      }
      setPhase(p);
    });

    // 技能状态回调
    engine.setOnSkillUpdate((_playerId, cd, maxCd, canUse) => {
      setSkillState(cd, maxCd, canUse);
    });

    // 动态事件回调
    engine.setOnEventUpdate((event) => {
      setEvent(event);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  /** 监听phase变化：从loading开始游戏 */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (phase === 'playing') {
      engine.startGame(selectedProfession);
    }
  }, [phase, selectedProfession]);

  /** 监听推箱状态 */
  useEffect(() => {
    const checkPushInterval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine || !engine.localPlayer) return;
      setPushing(engine.localPlayer.player.isPushing);
    }, 100);
    return () => clearInterval(checkPushInterval);
  }, [setPushing]);

  /** 重置时回到角色选择 */
  useEffect(() => {
    if (phase === 'loading' && engineRef.current) {
      reset();
    }
  }, [phase, reset]);

  return (
    <div className="app-container">
      <canvas ref={canvasRef} className="game-canvas" />

      {phase === 'loading' && <CharacterSelect />}
      {phase === 'playing' && <GameHUD />}
      {phase === 'ended' && <ResultScreen />}
    </div>
  );
}

export default App;
