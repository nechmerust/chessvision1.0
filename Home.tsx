import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_TITLE, getLoginUrl } from "@/const";
import { Camera, History, Play } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          </div>
          <div>
            {!isAuthenticated ? (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            ) : (
              <Link href="/tracker">
                <Button>Go to Tracker</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white">
              Track Your Chess Games
              <br />
              <span className="text-indigo-600">With Your Camera</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Chess Vision uses computer vision to automatically recognize and record your physical chess games in real-time.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/tracker">
              <Button size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Start Tracking
              </Button>
            </Link>
            <Link href="/history">
              <Button size="lg" variant="outline" className="gap-2">
                <History className="w-5 h-5" />
                View History
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Camera className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Camera Recognition</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Automatically detect board position and piece movements using your device camera
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Play className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Watch moves being recorded in Standard Algebraic Notation as you play
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <History className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Game History</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Save and export your games in PGN format for analysis and sharing
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-16 text-left max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-6 text-center">How It Works</h3>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="font-semibold mb-1">Position Your Camera</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Place your device so the entire chessboard is visible in the camera view</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-semibold mb-1">Start a New Game</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Click "Start New Game" and the app will detect your board setup</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-semibold mb-1">Play Your Game</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Make your moves naturally - the app tracks everything automatically</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                <div>
                  <h4 className="font-semibold mb-1">Save & Export</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Save your game to your account or export as PGN for analysis</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-16">
        <div className="container py-8 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Chess Vision. Track your games with ease.</p>
        </div>
      </footer>
    </div>
  );
}
