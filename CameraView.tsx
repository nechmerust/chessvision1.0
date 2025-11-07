import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { detectChessboard, drawBoardOverlay, type BoardCorners } from "@/lib/boardDetection";

interface CameraViewProps {
  onFrame?: (imageData: ImageData) => void;
  isActive?: boolean;
}

export function CameraView({ onFrame, isActive = true }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [boardDetected, setBoardDetected] = useState(false);
  const [boardCorners, setBoardCorners] = useState<BoardCorners | null>(null);
  const [confidence, setConfidence] = useState(0);
  const frameIntervalRef = useRef<number | undefined>(undefined);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
          facingMode: "environment", // Prefer back camera on mobile
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStarted(true);
        toast.success("Camera started successfully");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access camera";
      setError(message);
      toast.error(message);
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStarted(false);
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      toast.info("Camera stopped");
    }
  };

  // Capture frames for processing
  useEffect(() => {
    if (!isActive || !isStarted || !videoRef.current || !canvasRef.current || !onFrame) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Capture frame every 500ms for processing
    frameIntervalRef.current = window.setInterval(async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect chessboard
        const detection = await detectChessboard(imageData);
        setBoardDetected(detection.detected);
        setConfidence(detection.confidence);
        
        if (detection.detected && detection.corners) {
          setBoardCorners(detection.corners);
        }
        
        // Call parent callback
        if (onFrame) {
          onFrame(imageData);
        }
      }
    }, 500);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, isStarted, onFrame]);

  // Draw overlay when board is detected
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current || !boardCorners) return;

    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;

    // Match overlay canvas size to video display size
    const rect = video.getBoundingClientRect();
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    // Clear previous overlay
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw board overlay if detected
    if (boardDetected && boardCorners) {
      drawBoardOverlay(ctx, boardCorners, "#00ff00");
    }
  }, [boardDetected, boardCorners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="p-0">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Camera Feed</h3>
          <div className="flex gap-2">
            {!isStarted ? (
              <Button onClick={startCamera} size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="destructive" size="sm">
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center">
              <div>
                <CameraOff className="w-12 h-12 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            </div>
          )}
          {!isStarted && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>Click "Start Camera" to begin</p>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>

        {isStarted && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <p>Position your chessboard in the camera view. Make sure the entire board is visible.</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    boardDetected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  {boardDetected ? "Board Detected" : "No Board Detected"}
                </span>
              </div>
              <div className="text-muted-foreground">
                Confidence: {(confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
