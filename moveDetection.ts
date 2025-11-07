/**
 * Move Detection Module
 * Detects chess moves by comparing board states between frames
 */

import { Chess } from "chess.js";
import type { BoardCorners } from "./boardDetection";

export interface SquarePosition {
  file: string; // a-h
  rank: string; // 1-8
  x: number;
  y: number;
}

export interface DetectedMove {
  from: string;
  to: string;
  confidence: number;
}

/**
 * Extract 64 square regions from the detected board
 */
export function extractSquares(
  imageData: ImageData,
  corners: BoardCorners
): SquarePosition[] {
  const squares: SquarePosition[] = [];
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]; // Top to bottom

  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const xRatio = fileIdx / 8;
      const yRatio = rankIdx / 8;

      // Calculate square center position
      const topX =
        corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) * xRatio;
      const topY =
        corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) * xRatio;
      const bottomX =
        corners.bottomLeft.x +
        (corners.bottomRight.x - corners.bottomLeft.x) * xRatio;
      const bottomY =
        corners.bottomLeft.y +
        (corners.bottomRight.y - corners.bottomLeft.y) * xRatio;

      const x = topX + (bottomX - topX) * yRatio;
      const y = topY + (bottomY - topY) * yRatio;

      squares.push({
        file: files[fileIdx],
        rank: ranks[rankIdx],
        x: Math.round(x),
        y: Math.round(y),
      });
    }
  }

  return squares;
}

/**
 * Calculate average brightness of a region
 */
function getRegionBrightness(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number = 20
): number {
  const data = imageData.data;
  const width = imageData.width;
  let totalBrightness = 0;
  let pixelCount = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = Math.round(centerX + dx);
      const y = Math.round(centerY + dy);

      if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
        const idx = (y * width + x) * 4;
        const brightness =
          (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }
  }

  return pixelCount > 0 ? totalBrightness / pixelCount : 0;
}

/**
 * Detect which squares have pieces (simplified - based on brightness)
 */
export function detectOccupiedSquares(
  imageData: ImageData,
  squares: SquarePosition[]
): Set<string> {
  const occupied = new Set<string>();

  // Calculate average brightness of all squares
  const brightnesses = squares.map((sq) =>
    getRegionBrightness(imageData, sq.x, sq.y)
  );
  const avgBrightness =
    brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;

  // Squares significantly darker than average likely have pieces
  squares.forEach((sq, idx) => {
    const brightness = brightnesses[idx];
    // This is a simplified heuristic - pieces are typically darker
    if (Math.abs(brightness - avgBrightness) > 15) {
      occupied.add(sq.file + sq.rank);
    }
  });

  return occupied;
}

/**
 * Compare two board states and detect potential moves
 */
export function detectMove(
  previousOccupied: Set<string>,
  currentOccupied: Set<string>,
  chess: Chess
): DetectedMove | null {
  // Find squares that changed
  const disappeared: string[] = [];
  const appeared: string[] = [];

  previousOccupied.forEach((sq) => {
    if (!currentOccupied.has(sq)) {
      disappeared.push(sq);
    }
  });

  currentOccupied.forEach((sq) => {
    if (!previousOccupied.has(sq)) {
      appeared.push(sq);
    }
  });

  // A normal move: one square lost a piece, one square gained a piece
  if (disappeared.length === 1 && appeared.length === 1) {
    const from = disappeared[0];
    const to = appeared[0];

    // Validate if this is a legal move
    const legalMoves = chess.moves({ verbose: true });
    const matchingMove = legalMoves.find(
      (m) => m.from === from && m.to === to
    );

    if (matchingMove) {
      return {
        from,
        to,
        confidence: 0.8,
      };
    }
  }

  // Castling: king and rook move simultaneously
  if (disappeared.length === 2 && appeared.length === 2) {
    // Try to find castling move
    const legalMoves = chess.moves({ verbose: true });
    const castlingMove = legalMoves.find(
      (m) => m.flags.includes("k") || m.flags.includes("q")
    );

    if (castlingMove) {
      return {
        from: castlingMove.from,
        to: castlingMove.to,
        confidence: 0.7,
      };
    }
  }

  return null;
}

/**
 * Board state tracker for continuous monitoring
 */
export class BoardStateTracker {
  private previousOccupied: Set<string> | null = null;
  private stableFrames = 0;
  private readonly STABILITY_THRESHOLD = 3; // Require 3 stable frames before detecting move

  /**
   * Process a new frame and detect if a move occurred
   */
  processFrame(
    imageData: ImageData,
    corners: BoardCorners,
    chess: Chess
  ): DetectedMove | null {
    const squares = extractSquares(imageData, corners);
    const currentOccupied = detectOccupiedSquares(imageData, squares);

    // First frame - just store the state
    if (!this.previousOccupied) {
      this.previousOccupied = currentOccupied;
      return null;
    }

    // Check if board state is stable
    const hasChanges = !this.areSetsEqual(this.previousOccupied, currentOccupied);

    if (!hasChanges) {
      this.stableFrames++;
    } else {
      this.stableFrames = 0;
    }

    // Only detect move after board has been stable for a few frames
    // This prevents detecting moves while pieces are still being moved
    if (this.stableFrames >= this.STABILITY_THRESHOLD && hasChanges) {
      const move = detectMove(this.previousOccupied, currentOccupied, chess);
      if (move) {
        this.previousOccupied = currentOccupied;
        this.stableFrames = 0;
        return move;
      }
    }

    return null;
  }

  /**
   * Reset tracker state (e.g., when starting a new game)
   */
  reset() {
    this.previousOccupied = null;
    this.stableFrames = 0;
  }

  private areSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    const aArray = Array.from(a);
    for (let i = 0; i < aArray.length; i++) {
      if (!b.has(aArray[i])) return false;
    }
    return true;
  }
}
