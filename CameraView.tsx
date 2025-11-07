import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";
import {
  detectChessboard,
  drawBoardOverlay,
  type BoardCorners,
  type DetectionResult,
} from "@/lib/boardDetection";

interface CameraViewProps {
  onFrame?: (imageData: ImageData, detectionResult: DetectionResult) => void;
  isActive?: boolean;
}

export function CameraView({ onFrame, isActive = true }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [detectionResult, setDetectionResult] =
    useState<DetectionResult | null>(null);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Prefer back camera on mobile
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
        setIsStarted(true);
        toast.success("Camera started successfully");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access camera";
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      toast.info("Camera stopped");
    }
  };

  const processFrame = async () => {
    if (
      !isStarted ||
      !videoRef.current ||
      !canvasRef.current ||
      videoRef.current.paused ||
      videoRef.current.ended
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const detection = await detectChessboard(imageData);
      setDetectionResult(detection);

      if (onFrame) {
        onFrame(imageData, detection);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => {
    if (isActive && isStarted) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isStarted, onFrame]);

  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!overlay || !video || !detectionResult) return;

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (detectionResult.detected && detectionResult.corners) {
      drawBoardOverlay(ctx, detectionResult.corners, "#00ff00");
    }
  }, [detectionResult]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="p-4">
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
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>

        {isStarted && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <p>
                Position your chessboard in the camera view. Make sure the
                entire board is visible.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    detectionResult?.detected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  {detectionResult?.detected
                    ? "Board Detected"
                    : "No Board Detected"}
                </span>
              </div>
              <div className="text-muted-foreground">
                Confidence:{" "}
                {((detectionResult?.confidence || 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}    
