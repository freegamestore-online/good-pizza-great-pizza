import { GameShell, GameTopbar } from "@freegamestore/games";
import { useEffect, useRef, useState } from "react";
import { startGame } from "./game";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stop = startGame(canvas, setScore);
    return stop;
  }, []);

  return (
    <GameShell
      topbar={<GameTopbar title="Good Pizza Great Pizza" score={score} />}
      footer={
        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          More free games at freegamestore.online
        </a>
      }
    >
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
    </GameShell>
  );
}
