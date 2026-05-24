/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, RotateCcw, ArrowLeft, ArrowRight, CornerUpRight, ArrowDown, Zap, Trophy, Flame } from "lucide-react";

const COLS = 10;
const ROWS = 20;

// Tetromino definitions
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] border-cyan-400",
  O: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] border-yellow-400",
  T: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] border-purple-400",
  S: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] border-green-400",
  Z: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] border-red-400",
  J: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] border-blue-400",
  L: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] border-amber-400",
};

type BoardMatrix = string[][]; // Holds colors or empty string

const createEmptyBoard = (): BoardMatrix =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(""));

interface Piece {
  matrix: number[][];
  colorClass: string;
  type: keyof typeof SHAPES;
  x: number;
  y: number;
}

export default function BlockPuzzleGame() {
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard());
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem("aero_tetris_highscore") || "0");
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Use refs to handle state mutations inside intervals safely
  const currentPieceRef = useRef<Piece | null>(null);
  const boardRef = useRef<BoardMatrix>(createEmptyBoard());
  const scoreRef = useRef<number>(0);

  // Keep refs synchronized
  scoreRef.current = score;
  boardRef.current = board;

  const getNewPiece = (): Piece => {
    const keys = Object.keys(SHAPES) as Array<keyof typeof SHAPES>;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const matrix = SHAPES[randomKey];
    return {
      matrix,
      colorClass: COLORS[randomKey],
      type: randomKey,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0,
    };
  };

  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);

  useEffect(() => {
    if (currentPiece) {
      currentPieceRef.current = currentPiece;
    }
  }, [currentPiece]);

  // Handle high score updates
  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("aero_tetris_highscore", String(newScore));
    }
  };

  // Check collision helper
  const checkCollision = (piece: Piece, b: BoardMatrix, dx: number, dy: number, customMatrix?: number[][]): boolean => {
    const matrix = customMatrix || piece.matrix;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const nextX = piece.x + c + dx;
          const nextY = piece.y + r + dy;

          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return true;
          }
          if (nextY >= 0 && b[nextY][nextX] !== "") {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Place block on board
  const mergePieceToBoard = (piece: Piece, b: BoardMatrix): BoardMatrix => {
    const newBoard = b.map((row) => [...row]);
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          const boardY = piece.y + r;
          const boardX = piece.x + c;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = piece.colorClass;
          }
        }
      }
    }
    return newBoard;
  };

  // Clear completed rows
  const clearRows = (b: BoardMatrix): { nextBoard: BoardMatrix; cleared: number } => {
    let cleared = 0;
    const filteredBoard = b.filter((row) => {
      const isComplete = row.every((cell) => cell !== "");
      if (isComplete) cleared++;
      return !isComplete;
    });

    while (filteredBoard.length < ROWS) {
      filteredBoard.unshift(Array(COLS).fill(""));
    }

    return { nextBoard: filteredBoard, cleared };
  };

  // Move left
  const moveLeft = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOver || !isPlaying || isPaused) return;

    if (!checkCollision(piece, boardRef.current, -1, 0)) {
      const updated = { ...piece, x: piece.x - 1 };
      setCurrentPiece(updated);
    }
  }, [gameOver, isPlaying, isPaused]);

  // Move right
  const moveRight = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOver || !isPlaying || isPaused) return;

    if (!checkCollision(piece, boardRef.current, 1, 0)) {
      const updated = { ...piece, x: piece.x + 1 };
      setCurrentPiece(updated);
    }
  }, [gameOver, isPlaying, isPaused]);

  // Rotate piece matrix
  const rotate = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOver || !isPlaying || isPaused) return;

    // Transpose and reverse rows
    const n = piece.matrix.length;
    const m = piece.matrix[0].length;
    const rotated = Array.from({ length: m }, () => Array(n).fill(0));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < m; c++) {
        rotated[c][n - 1 - r] = piece.matrix[r][c];
      }
    }

    // Check if rotation compiles inside grid boundaries, kick slightly if near walls
    let attempts = [0, -1, 1, -2, 2];
    for (let dx of attempts) {
      const kickedPiece = { ...piece, x: piece.x + dx };
      if (!checkCollision(kickedPiece, boardRef.current, 0, 0, rotated)) {
        setCurrentPiece({
          ...kickedPiece,
          matrix: rotated,
        });
        return;
      }
    }
  }, [gameOver, isPlaying, isPaused]);

  // Drop piece down by 1
  const drop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOver || !isPlaying || isPaused) return;

    const b = boardRef.current;
    if (!checkCollision(piece, b, 0, 1)) {
      setCurrentPiece({ ...piece, y: piece.y + 1 });
    } else {
      // Reach bottom, merge onto the static board
      const mergedBoard = mergePieceToBoard(piece, b);
      const { nextBoard, cleared } = clearRows(mergedBoard);

      // Score computations
      let reward = 10;
      if (cleared === 1) reward += 100;
      else if (cleared === 2) reward += 300;
      else if (cleared === 3) reward += 600;
      else if (cleared === 4) reward += 1000;

      const nextScore = scoreRef.current + reward;
      setScore(nextScore);
      setLines((prev) => prev + cleared);
      updateHighScore(nextScore);

      // Spawn next tetromino
      if (nextPiece) {
        // Check game over
        if (checkCollision(nextPiece, nextBoard, 0, 0)) {
          setGameOver(true);
          setIsPlaying(false);
          setBoard(nextBoard);
          return;
        }
        setBoard(nextBoard);
        setCurrentPiece(nextPiece);
        setNextPiece(getNewPiece());
      }
    }
  }, [nextPiece, gameOver, isPlaying, isPaused]);

  // Hard drop instantly
  const hardDrop = useCallback(() => {
    const piece = currentPieceRef.current;
    if (!piece || gameOver || !isPlaying || isPaused) return;

    const b = boardRef.current;
    let dropDist = 0;
    while (!checkCollision(piece, b, 0, dropDist + 1)) {
      dropDist++;
    }

    if (dropDist > 0) {
      const droppedPiece = { ...piece, y: piece.y + dropDist };
      const mergedBoard = mergePieceToBoard(droppedPiece, b);
      const { nextBoard, cleared } = clearRows(mergedBoard);

      let reward = dropDist * 2;
      if (cleared === 1) reward += 100;
      else if (cleared === 2) reward += 300;
      else if (cleared === 3) reward += 600;
      else if (cleared === 4) reward += 1000;

      const nextScore = scoreRef.current + reward;
      setScore(nextScore);
      setLines((prev) => prev + cleared);
      updateHighScore(nextScore);

      if (nextPiece) {
        if (checkCollision(nextPiece, nextBoard, 0, 0)) {
          setGameOver(true);
          setIsPlaying(false);
          setBoard(nextBoard);
          return;
        }
        setBoard(nextBoard);
        setCurrentPiece(nextPiece);
        setNextPiece(getNewPiece());
      }
    }
  }, [nextPiece, gameOver, isPlaying, isPaused]);

  // Gravity ticker handler
  useEffect(() => {
    if (!isPlaying || isPaused || gameOver) return;
    const speed = Math.max(100, 800 - Math.floor(score / 500) * 80); // Speed increases with score
    const interval = setInterval(() => {
      drop();
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, gameOver, score, drop]);

  // Keyboard controls handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || gameOver) return;
      switch (e.key) {
        case "ArrowLeft":
          moveLeft();
          e.preventDefault();
          break;
        case "ArrowRight":
          moveRight();
          e.preventDefault();
          break;
        case "ArrowUp":
          rotate();
          e.preventDefault();
          break;
        case "ArrowDown":
          drop();
          e.preventDefault();
          break;
        case " ":
          hardDrop();
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, isPaused, gameOver, moveLeft, moveRight, rotate, drop, hardDrop]);

  // Reset/Start game handler
  const handleRestart = () => {
    const p1 = getNewPiece();
    const p2 = getNewPiece();
    setBoard(createEmptyBoard());
    setScore(0);
    setLines(0);
    setGameOver(false);
    setIsPaused(false);
    setCurrentPiece(p1);
    setNextPiece(p2);
    currentPieceRef.current = p1;
    setIsPlaying(true);
  };

  // Render cell grid combining current active falling piece and stable static grid
  const renderCellGrid = () => {
    const displayBoard = board.map((row) => [...row]);
    const piece = currentPiece;

    if (piece && isPlaying) {
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[r].length; c++) {
          if (piece.matrix[r][c] !== 0) {
            const boardY = piece.y + r;
            const boardX = piece.x + c;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              displayBoard[boardY][boardX] = piece.colorClass;
            }
          }
        }
      }
    }

    return displayBoard.map((row, rIdx) => (
      <div key={`row-${rIdx}`} className="flex">
        {row.map((colorClass, cIdx) => (
          <div
            key={`cell-${rIdx}-${cIdx}`}
            className={`w-6 h-6 border-[0.5px] border-slate-800/20 rounded-[2px] transition-all duration-100 ${
              colorClass !== "" ? colorClass : "bg-slate-900/40"
            }`}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className="glass flex flex-col items-center border border-white/10 rounded-3xl p-5 shadow-2xl max-w-md mx-auto relative overflow-hidden">
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
      {/* HUD Header */}
      <div className="flex items-center justify-between w-full mb-5 border-b border-white/5 pb-3.5 z-10">
        <div>
          <h3 className="text-sm font-bold text-gradient flex items-center gap-1.5 tracking-tight uppercase">
            <Flame className="w-4 h-4 text-cyan-400 animate-pulse" /> Block Arcade
          </h3>
          <p className="text-[10px] text-slate-450 font-mono">Rainy day companion • Offline mode</p>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl py-1 px-3">
          <Trophy className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/10" />
          <span className="text-[11px] font-mono font-bold text-yellow-400">{highScore}</span>
        </div>
      </div>
 
      <div className="flex gap-4 justify-center items-stretch w-full z-10">
        {/* Main Grid View */}
        <div className="relative border border-white/10 bg-black/40 p-1.5 rounded-2xl overflow-hidden shadow-2xl">
          {renderCellGrid()}
 
          {/* Overlays (Start / Pause / Game Over) */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-[4px] flex flex-col items-center justify-center p-4 text-center">
              <Play className="w-10 h-10 text-cyan-400 mb-2 animate-bounce" />
              <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider mb-1">Tetris Arcade</h4>
              <p className="text-[10px] text-slate-400 max-w-[155px] mb-4">Rotate, match lines & scale high scores.</p>
              <button
                id="btn-game-play"
                onClick={handleRestart}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-2.5 px-6 rounded-xl text-xs transition duration-200 shadow-lg shadow-cyan-500/20"
              >
                Press Start
              </button>
            </div>
          )}
 
          {gameOver && (
            <div className="absolute inset-0 bg-rose-950/95 backdrop-blur-[4px] flex flex-col items-center justify-center p-4 text-center">
              <span className="text-lg font-black text-rose-500 tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse">Game Over</span>
              <p className="text-xs text-rose-300 font-mono mb-4">Total Score: {score}</p>
              <button
                id="btn-game-restart"
                onClick={handleRestart}
                className="w-full bg-white text-slate-950 text-xs font-bold py-2 px-6 rounded-xl hover:bg-slate-150 transition duration-200 shadow-md"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
 
        {/* Info Sidebar Section */}
        <div className="flex flex-col justify-between w-28 py-0.5">
          <div className="space-y-3">
            {/* Score box */}
            <div className="glass rounded-2xl p-2.5 text-center">
              <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Score</span>
              <span className="block font-mono text-base font-bold text-cyan-400">{score}</span>
            </div>
 
            {/* Lines box */}
            <div className="glass rounded-2xl p-2.5 text-center">
              <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Lines</span>
              <span className="block font-mono text-sm font-bold text-slate-200">{lines}</span>
            </div>
 
            {/* Next Piece Display */}
            <div className="glass rounded-2xl p-2.5 flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Next</span>
              <div className="h-10 flex items-center justify-center">
                {nextPiece ? (
                  <div className="flex flex-col gap-[2px]">
                    {nextPiece.matrix.map((row, rIdx) => (
                      <div key={`next-row-${rIdx}`} className="flex gap-[2px]">
                        {row.map((cell, cIdx) => (
                          <div
                            key={`next-cell-${rIdx}-${cIdx}`}
                            className={`w-2.5 h-2.5 rounded-[1px] ${
                              cell !== 0 ? nextPiece.colorClass : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-600 text-[9px] font-mono">Empty</div>
                )}
              </div>
            </div>
          </div>
 
          {/* Quick options */}
          <div className="space-y-1.5">
            {isPlaying && (
              <button
                id="btn-game-pause"
                onClick={() => setIsPaused((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold text-center transition duration-200"
              >
                {isPaused ? "RESUME" : "PAUSE"}
              </button>
            )}
            <button
              id="btn-game-reset"
              onClick={handleRestart}
              className="w-full flex items-center justify-center gap-1 bg-white hover:bg-cyan-50 text-slate-900 font-bold py-2 px-3 rounded-xl text-[10px] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> RESET
            </button>
          </div>
        </div>
      </div>
 
      {/* Tactile Joysticks for Mobile / Touch Screens */}
      <div className="mt-5 w-full max-w-[280px] flex flex-col gap-2 z-10">
        {/* Row 1: Rotation */}
        <div className="flex justify-center">
          <button
            id="control-rotate"
            onClick={rotate}
            disabled={!isPlaying || isPaused || gameOver}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-95 text-cyan-400 border border-white/10 rounded-full flex items-center justify-center shadow-lg transition duration-150 disabled:opacity-45 cursor-pointer"
          >
            <CornerUpRight className="w-4.5 h-4.5" />
          </button>
        </div>
 
        {/* Row 2: Left, Right, Down Controls */}
        <div className="flex justify-between items-center px-2">
          <button
            id="control-left"
            onClick={moveLeft}
            disabled={!isPlaying || isPaused || gameOver}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 border border-white/10 rounded-full flex items-center justify-center shadow-lg transition duration-150 disabled:opacity-45 cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
 
          <button
            id="control-hard-drop"
            onClick={hardDrop}
            disabled={!isPlaying || isPaused || gameOver}
            className="w-14 h-11 bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-400 border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center shadow-md transition duration-150 disabled:opacity-45 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[8px] font-bold tracking-tight uppercase">Drop</span>
          </button>
 
          <button
            id="control-right"
            onClick={moveRight}
            disabled={!isPlaying || isPaused || gameOver}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 border border-white/10 rounded-full flex items-center justify-center shadow-lg transition duration-150 disabled:opacity-45 cursor-pointer"
          >
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </div>
 
        {/* Row 3: Soft Drop */}
        <div className="flex justify-center">
          <button
            id="control-down"
            onClick={drop}
            disabled={!isPlaying || isPaused || gameOver}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 border border-white/10 rounded-full flex items-center justify-center shadow-lg transition duration-150 disabled:opacity-45 cursor-pointer"
          >
            <ArrowDown className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
