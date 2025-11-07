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
 * This is an improved heuristic that searches for a region with high edge density.
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

    // Grid search to find the most likely board area
    const gridSize = 20; // Search in a 20x20 grid
    const gridCellWidth = width / gridSize;
    const gridCellHeight = height / gridSize;
    let maxEdgeDensity = 0;
    let bestGridCell = { x: 0, y: 0 };

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const xStart = gx * gridCellWidth;
        const yStart = gy * gridCellHeight;
        let edgeCount = 0;
        for (let y = 0; y < gridCellHeight; y++) {
          for (let x = 0; x < gridCellWidth; x++) {
            const pixelX = Math.floor(xStart + x);
            const pixelY = Math.floor(yStart + y);
            if (edges[pixelY * width + pixelX] > 0) {
              edgeCount++;
            }
          }
        }
        const density = edgeCount / (gridCellWidth * gridCellHeight);
        if (density > maxEdgeDensity) {
          maxEdgeDensity = density;
          bestGridCell = { x: gx, y: gy };
        }
      }
    }

    // A real board should have a significant edge density
    const confidence = Math.min(1, maxEdgeDensity / 0.15); // Heuristic: 15% density is good

    if (confidence < 0.3) {
      return { detected: false, confidence };
    }

    // Assume the board is a large square centered around the densest grid cell
    // This is still a simplification but much better than assuming the center of the image
    const boardRatio = 0.8; // Assume board takes up 80% of the smaller dimension
    const boardSize = Math.min(width, height) * boardRatio;
    const centerX = (bestGridCell.x + 0.5) * gridCellWidth;
    const centerY = (bestGridCell.y + 0.5) * gridCellHeight;

    const corners: BoardCorners = {
      topLeft: {
        x: Math.max(0, centerX - boardSize / 2),
        y: Math.max(0, centerY - boardSize / 2),
      },
      topRight: {
        x: Math.min(width, centerX + boardSize / 2),
        y: Math.max(0, centerY - boardSize / 2),
      },
      bottomLeft: {
        x: Math.max(0, centerX - boardSize / 2),
        y: Math.min(height, centerY + boardSize / 2),
      },
      bottomRight: {
        x: Math.min(width, centerX + boardSize / 2),
        y: Math.min(height, centerY + boardSize / 2),
      },
    };

    return {
      detected: true,
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
  const grayscale = new Uint8ClampedArray(width * height);

  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayscale[i / 4] = gray;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getGray = (x: number, y: number) => grayscale[y * width + x];

      const gx =
        -getGray(x - 1, y - 1) +
        getGray(x + 1, y - 1) -
        2 * getGray(x - 1, y) +
        2 * getGray(x + 1, y) -
        getGray(x - 1, y + 1) +
        getGray(x + 1, y + 1);

      const gy =
        -getGray(x - 1, y - 1) -
        2 * getGray(x, y - 1) -
        getGray(x + 1, y - 1) +
        getGray(x - 1, y + 1) +
        2 * getGray(x, y + 1) +
        getGray(x + 1, y + 1);

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > 100 ? 255 : 0; // Increased threshold
    }
  }

  return edges;
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
  ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Semi-transparent green
  ctx.lineWidth = 1;
  
  for (let i = 1; i < 8; i++) {
    const ratio = i / 8;

    // Vertical lines
    const vTopX = corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) * ratio;
    const vTopY = corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) * ratio;
    const vBottomX = corners.bottomLeft.x + (corners.bottomRight.x - corners.bottomLeft.x) * ratio;
    const vBottomY = corners.bottomLeft.y + (corners.bottomRight.y - corners.bottomLeft.y) * ratio;

    ctx.beginPath();
    ctx.moveTo(vTopX, vTopY);
    ctx.lineTo(vBottomX, vBottomY);
    ctx.stroke();

    // Horizontal lines
    const hLeftX = corners.topLeft.x + (corners.bottomLeft.x - corners.topLeft.x) * ratio;
    const hLeftY = corners.topLeft.y + (corners.bottomLeft.y - corners.topLeft.y) * ratio;
    const hRightX = corners.topRight.x + (corners.bottomRight.x - corners.topRight.x) * ratio;
    const hRightY = corners.topRight.y + (corners.bottomRight.y - corners.topRight.y) * ratio;

    ctx.beginPath();
    ctx.moveTo(hLeftX, hLeftY);
    ctx.lineTo(hRightX, hRightY);
    ctx.stroke();
  }
}
