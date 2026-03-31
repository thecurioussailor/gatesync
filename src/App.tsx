import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameCanvas } from './renderer/GameCanvas';
import { GameUI } from './renderer/GameUI';
import { createInitialState } from './game/gameLogic';
import type { GameState } from './game/types';
import './App.css';

export default function App() {
  const [state, setState] = useState<GameState>(createInitialState);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const engine = new GameEngine(setState);
    engineRef.current = engine;
    engine.start();
    return () => engine.stop();
  }, []);

  return (
    <div className="game-root">
      <GameCanvas state={state} />
      <GameUI state={state} />
    </div>
  );
}