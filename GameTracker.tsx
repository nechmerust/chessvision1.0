import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraView } from "@/components/CameraView";
import { trpc } from "@/lib/trpc";
import { Chess } from "chess.js";
import { Download, Play, Save, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { toast } from "sonner";
import { type DetectionResult } from "@/lib/boardDetection";
import { BoardStateTracker } from "@/lib/moveDetection";

export default function GameTracker() {
  const { user, isAuthenticated } = useAuth();
  const [chess, setChess] = useState(() => new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const moveTracker = useRef<BoardStateTracker | null>(null);

  const createGameMutation = trpc.game.create.useMutation();
  const updateGameMutation = trpc.game.update.useMutation();

  useEffect(() => {
    if (isTracking && !moveTracker.current) {
      moveTracker.current = new BoardStateTracker();
    } else if (!isTracking && moveTracker.current) {
      moveTracker.current = null;
    }
  }, [isTracking]);

  const startNewGame = async () => {
    try {
      const newChess = new Chess();
      setChess(newChess);
      setPosition(newChess.fen());
      setMoves([]);
      moveTracker.current?.reset();

      if (isAuthenticated) {
        const result = await createGameMutation.mutateAsync({
          title: `Game ${new Date().toLocaleString()}`,
        });
        setCurrentGameId(result.gameId);
        toast.success("New game started!");
      } else {
        toast.info("Log in to save your games automatically.");
      }
      setIsTracking(true);
    } catch (error) {
      toast.error("Failed to start game");
      console.error(error);
    }
  };

  const saveGame = async () => {
    if (!currentGameId || !isAuthenticated) {
      toast.error("Log in and start a game to save");
      return;
    }

    try {
      await updateGameMutation.mutateAsync({
        gameId: currentGameId,
        pgn: chess.pgn(),
        moves,
        currentPosition: chess.fen(),
        result: chess.isGameOver() ? getGameResult() : "*",
        isCompleted: chess.isGameOver() ? 1 : 0,
      });
      toast.success("Game saved successfully!");
    } catch (error) {
      toast.error("Failed to save game");
      console.error(error);
    }
  };

  const getGameResult = () => {
    if (chess.isCheckmate()) {
      return chess.turn() === "w" ? "0-1" : "1-0";
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
      return "1/2-1/2";
    }
    return "*";
  };

  const exportPGN = () => {
    const pgn = chess.pgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-game-${new Date().toISOString().split("T")[0]}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PGN exported!");
  };

  const handleCameraFrame = (
    imageData: ImageData,
    detection: DetectionResult
  ) => {
    if (!isTracking || !detection.detected || !detection.corners || !moveTracker.current) {
      return;
    }

    const detectedMove = moveTracker.current.processFrame(
      imageData,
      detection.corners,
      chess
    );

    if (detectedMove) {
      try {
        const move = chess.move({
          from: detectedMove.from,
          to: detectedMove.to,
          promotion: "q", // Default to queen promotion
        });

        if (move) {
          toast.success(`Move detected: ${move.san}`);
          setPosition(chess.fen());
          const newMoves = [...moves, move.san];
          setMoves(newMoves);
          
          if (currentGameId && isAuthenticated) {
            updateGameMutation.mutate({
              gameId: currentGameId,
              pgn: chess.pgn(),
              moves: newMoves,
              currentPosition: chess.fen(),
            });
          }
        }
      } catch (e) {
        // Illegal move detected by chess.js
        console.warn("Detected an illegal move attempt.", e);
        toast.warning("Illegal move detected!");
      }
    }
  };

  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) {
      return `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;
    }
    if (chess.isDraw()) return "Draw!";
    if (chess.isStalemate()) return "Stalemate!";
    if (chess.inCheck()) return "Check!";
    return `${chess.turn() === "w" ? "White" : "Black"} to move`;
  }, [position, chess]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Chess Vision</h1>
          <p className="text-muted-foreground">
            Track your chess games using your camera
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CameraView onFrame={handleCameraFrame} isActive={isTracking} />

            <Card>
              <CardHeader>
                <CardTitle>Chess Board</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Chessboard position={position} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{gameStatus}</p>
                  {chess.isGameOver() && (
                    <span className="text-sm text-muted-foreground">
                      Game Over
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={startNewGame} className="w-full" disabled={isTracking}>
                  <Play className="w-4 h-4 mr-2" />
                  Start New Game
                </Button>

                <Button onClick={() => setIsTracking(false)} className="w-full" variant="outline" disabled={!isTracking}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Tracking
                </Button>

                <Button onClick={saveGame} className="w-full" variant="outline" disabled={!currentGameId || !isAuthenticated}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Game
                </Button>

                <Button onClick={exportPGN} className="w-full" variant="outline" disabled={moves.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PGN
                </Button>

                {!isAuthenticated && (
                  <p className="text-sm text-muted-foreground text-center">
                    Log in to save your games
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
              </CardHeader>
              <CardContent>
                {moves.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No moves yet. Start a new game!
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1">
                      {Array.from({
                        length: Math.ceil(moves.length / 2),
                      }).map((_, i) => (
                        <li
                          key={i}
                          className="contents"
                        >
                          <div className="text-right text-muted-foreground">{i + 1}.</div>
                          <div className="font-mono">{moves[i * 2]}</div>
                          <div className="font-mono">{moves[i * 2 + 1] || ""}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
