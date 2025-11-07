import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraView } from "@/components/CameraView";
import { trpc } from "@/lib/trpc";
import { Chess } from "chess.js";
import { Download, Play, Save, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { toast } from "sonner";

export default function GameTracker() {
  const { user, isAuthenticated } = useAuth();
  const [chess] = useState(() => new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const createGameMutation = trpc.game.create.useMutation();
  const updateGameMutation = trpc.game.update.useMutation();

  const startNewGame = async () => {
    try {
      chess.reset();
      setPosition(chess.fen());
      setMoves([]);
      
      if (isAuthenticated) {
        const result = await createGameMutation.mutateAsync({
          title: `Game ${new Date().toLocaleString()}`,
        });
        setCurrentGameId(result.gameId);
        toast.success("New game started!");
      }
      setIsTracking(true);
    } catch (error) {
      toast.error("Failed to start game");
      console.error(error);
    }
  };

  const saveGame = async () => {
    if (!currentGameId || !isAuthenticated) {
      toast.error("Please log in to save games");
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

  const handleCameraFrame = (imageData: ImageData) => {
    if (!isTracking) return;
    
    // TODO: Implement computer vision processing here
    // This will be implemented in the next phase
    console.log("Processing frame:", imageData.width, "x", imageData.height);
  };

  // Manual move input for testing (will be replaced by CV detection)
  const onDrop = ({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string | null; targetSquare: string | null }) => {
    if (!sourceSquare || !targetSquare) return false;
    
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for now
      });

      if (move) {
        setPosition(chess.fen());
        setMoves([...moves, move.san]);
        
        // Auto-save after each move if game exists
        if (currentGameId && isAuthenticated) {
          updateGameMutation.mutate({
            gameId: currentGameId,
            pgn: chess.pgn(),
            moves: [...moves, move.san],
            currentPosition: chess.fen(),
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Invalid move:", error);
      return false;
    }
  };

  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) {
      return `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;
    }
    if (chess.isDraw()) {
      return "Draw!";
    }
    if (chess.isStalemate()) {
      return "Stalemate!";
    }
    if (chess.isCheck()) {
      return "Check!";
    }
    return `${chess.turn() === "w" ? "White" : "Black"} to move`;
  }, [position]);

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
          {/* Left column: Camera and Board */}
          <div className="space-y-6">
            <CameraView 
              onFrame={handleCameraFrame} 
              isActive={isTracking}
            />

            <Card>
              <CardHeader>
                <CardTitle>Chess Board</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Chessboard
                    options={{
                      position: position,
                      onPieceDrop: onDrop,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{gameStatus}</p>
                  {chess.isGameOver() && (
                    <span className="text-sm text-muted-foreground">Game Over</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Moves and Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={startNewGame} 
                  className="w-full"
                  disabled={isTracking}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start New Game
                </Button>
                
                <Button 
                  onClick={saveGame} 
                  className="w-full"
                  variant="outline"
                  disabled={!currentGameId || !isAuthenticated}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Game
                </Button>

                <Button 
                  onClick={exportPGN} 
                  className="w-full"
                  variant="outline"
                  disabled={moves.length === 0}
                >
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
                    <div className="grid grid-cols-2 gap-2">
                      {moves.map((move, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded hover:bg-accent"
                        >
                          <span className="text-xs text-muted-foreground w-8">
                            {Math.floor(index / 2) + 1}.
                          </span>
                          <span className="font-mono text-sm">{move}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Game Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Moves:</span>
                  <span className="font-medium">{moves.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Turn:</span>
                  <span className="font-medium">
                    {chess.turn() === "w" ? "White" : "Black"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {chess.isGameOver() ? "Finished" : "In Progress"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
