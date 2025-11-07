import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Download, Eye, Trash2, Camera, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function GameHistory() {
  const { user, isAuthenticated } = useAuth();
  const { data: games, isLoading, refetch } = trpc.game.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const deleteGameMutation = trpc.game.delete.useMutation();

  const handleDelete = async (gameId: number) => {
    if (!confirm("Are you sure you want to delete this game?")) return;

    try {
      await deleteGameMutation.mutateAsync({ gameId });
      toast.success("Game deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete game");
      console.error(error);
    }
  };

  const handleDownloadPGN = (game: any) => {
    const blob = new Blob([game.pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${game.title || "chess-game"}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PGN downloaded!");
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You need to sign in to view your game history.
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold mb-2">Game History</h1>
            <p className="text-muted-foreground">
              View and manage your recorded chess games
            </p>
          </div>
          <Link href="/tracker">
            <Button className="gap-2">
              <Camera className="w-4 h-4" />
              New Game
            </Button>
          </Link>
        </div>

        {/* Games List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        ) : !games || games.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No games yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your first chess game!
              </p>
              <Link href="/tracker">
                <Button>Start Tracking</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {games.map((game) => {
              const moves = JSON.parse(game.moves || "[]");
              const moveCount = moves.length;

              return (
                <Card key={game.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          {game.title || `Game ${game.id}`}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">
                              {formatDate(game.createdAt)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Moves:</span>
                            <p className="font-medium">{moveCount}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Result:</span>
                            <p className="font-medium">
                              {game.result === "1-0"
                                ? "White wins"
                                : game.result === "0-1"
                                ? "Black wins"
                                : game.result === "1/2-1/2"
                                ? "Draw"
                                : "Ongoing"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <p className="font-medium">
                              {game.isCompleted ? "Completed" : "In Progress"}
                            </p>
                          </div>
                        </div>

                        {/* Move preview */}
                        {moveCount > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              Moves:
                            </p>
                            <p className="text-sm font-mono">
                              {moves.slice(0, 10).join(" ")}{" "}
                              {moveCount > 10 && `... (+${moveCount - 10} more)`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPGN(game)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PGN
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title="View feature coming soon"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(game.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
