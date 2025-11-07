/**
 * Board Detection using Canvas API
 * Simplified chessboard detection from camera feed
 */

export interface BoardCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface DetectionResult {
  detected: boolean;
  corners?: BoardCorners;
  confidence: number;
}

/**
 * Detect chessboard pattern in the image using edge detection
 * This is a simplified implementation that looks for a square grid pattern
 */
export async function detectChessboard(
  imageData: ImageData
): Promise<DetectionResult> {
  try {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Convert to grayscale and detect edges
    const edges = detectEdges(data, width, height);

    // Find potential board region (simplified - assumes board is centered)
    const centerX = width / 2;
    const centerY = height / 2;
    const boardSize = Math.min(width, height) * 0.7;

    const corners: BoardCorners = {
      topLeft: {
        x: centerX - boardSize / 2,
        y: centerY - boardSize / 2,
      },
      topRight: {
        x: centerX + boardSize / 2,
        y: centerY - boardSize / 2,
      },
      bottomLeft: {
        x: centerX - boardSize / 2,
        y: centerY + boardSize / 2,
      },
      bottomRight: {
        x: centerX + boardSize / 2,
        y: centerY + boardSize / 2,
      },
    };

    // Calculate confidence based on edge density in the detected region
    const confidence = calculateBoardConfidence(edges, corners, width, height);

    return {
      detected: confidence > 0.3,
      corners,
      confidence,
    };
  } catch (error) {
    console.error("Board detection error:", error);
    return {
      detected: false,
      confidence: 0,
    };
  }
}

/**
 * Simple edge detection using Sobel operator
 */
function detectEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Convert to grayscale
      const gray =
        data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      // Sobel kernels
      const gx =
        -getGray(data, x - 1, y - 1, width) +
        getGray(data, x + 1, y - 1, width) -
        2 * getGray(data, x - 1, y, width) +
        2 * getGray(data, x + 1, y, width) -
        getGray(data, x - 1, y + 1, width) +
        getGray(data, x + 1, y + 1, width);

      const gy =
        -getGray(data, x - 1, y - 1, width) -
        2 * getGray(data, x, y - 1, width) -
        getGray(data, x + 1, y - 1, width) +
        getGray(data, x - 1, y + 1, width) +
        2 * getGray(data, x, y + 1, width) +
        getGray(data, x + 1, y + 1, width);

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > 50 ? 255 : 0;
    }
  }

  return edges;
}

function getGray(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): number {
  const idx = (y * width + x) * 4;
  return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
}

/**
 * Calculate confidence that the detected region contains a chessboard
 */
function calculateBoardConfidence(
  edges: Uint8ClampedArray,
  corners: BoardCorners,
  width: number,
  height: number
): number {
  let edgeCount = 0;
  let totalPixels = 0;

  const minX = Math.max(0, Math.floor(corners.topLeft.x));
  const maxX = Math.min(width, Math.ceil(corners.topRight.x));
  const minY = Math.max(0, Math.floor(corners.topLeft.y));
  const maxY = Math.min(height, Math.ceil(corners.bottomLeft.y));

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (edges[y * width + x] > 0) {
        edgeCount++;
      }
      totalPixels++;
    }
  }

  // Chessboards have many edges (grid lines)
  // Typical confidence: 0.1 - 0.5 for a board
  return totalPixels > 0 ? edgeCount / totalPixels : 0;
}

/**
 * Draw detected board overlay on canvas
 */
export function drawBoardOverlay(
  ctx: CanvasRenderingContext2D,
  corners: BoardCorners,
  color: string = "#00ff00"
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  // Draw board outline
  ctx.beginPath();
  ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
  ctx.lineTo(corners.topRight.x, corners.topRight.y);
  ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
  ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
  ctx.closePath();
  ctx.stroke();

  // Draw corner markers
  const drawCorner = (x: number, y: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
  };

  drawCorner(corners.topLeft.x, corners.topLeft.y);
  drawCorner(corners.topRight.x, corners.topRight.y);
  drawCorner(corners.bottomLeft.x, corners.bottomLeft.y);
  drawCorner(corners.bottomRight.x, corners.bottomRight.y);

  // Draw grid lines (8x8)
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;

  for (let i = 1; i < 8; i++) {
    const ratio = i / 8;

    // Vertical lines
    const vTopX = corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) * ratio;
    const vTopY = corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) * ratio;
    const vBottomX =
      corners.bottomLeft.x + (corners.bottomRight.x - corners.bottomLeft.x) * ratio;
    const vBottomY =
      corners.bottomLeft.y + (corners.bottomRight.y - corners.bottomLeft.y) * ratio;

    ctx.beginPath();
    ctx.moveTo(vTopX, vTopY);
    ctx.lineTo(vBottomX, vBottomY);
    ctx.stroke();

    // Horizontal lines
    const hLeftX = corners.topLeft.x + (corners.bottomLeft.x - corners.topLeft.x) * ratio;
    const hLeftY = corners.topLeft.y + (corners.bottomLeft.y - corners.topLeft.y) * ratio;
    const hRightX =
      corners.topRight.x + (corners.bottomRight.x - corners.topRight.x) * ratio;
    const hRightY =
      corners.topRight.y + (corners.bottomRight.y - corners.topRight.y) * ratio;

    ctx.beginPath();
    ctx.moveTo(hLeftX, hLeftY);
    ctx.lineTo(hRightX, hRightY);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
