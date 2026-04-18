import "@fontsource/source-code-pro/200.css";
import "@fontsource/source-code-pro/400.css";
import "@fontsource/source-code-pro/600.css";

const COLOR_FONT = {
  A: "#ff6b6b",
  B: "#ff8e3c",
  C: "#ffd93d",
  D: "#8bd450",
  E: "#32d1a0",
  F: "#1db7b7",
  G: "#45aaf2",
  H: "#4d7cff",
  I: "#6c5ce7",
  J: "#8b5cf6",
  K: "#c061ff",
  L: "#ff66c4",
  M: "#ff7aa2",
  N: "#f97373",
  O: "#fb923c",
  P: "#facc15",
  Q: "#a3e635",
  R: "#4ade80",
  S: "#2dd4bf",
  T: "#22d3ee",
  U: "#38bdf8",
  V: "#60a5fa",
  W: "#818cf8",
  X: "#a78bfa",
  Y: "#f472b6",
  Z: "#fb7185",
} as const;

type ColorFontLetter = keyof typeof COLOR_FONT;

const MAX_CHARS = 120;
const CANVAS_WIDTH = 960;
const CELL_SIZE = 29;
const CELL_GAP = 6;
const CANVAS_PADDING = 28;
const CELL_RADIUS = 0;
const PLACEHOLDER = "TOM";
const SPACE_FILL = "#151515";
const SPACE_STROKE = "#2f2f2f";
const BACKGROUND_FILL = "#050505";

const inputBox = document.getElementById("input-box") as HTMLInputElement | null;
const warningBox = document.getElementById("input-warning") as HTMLElement | null;
const canvas = document.getElementById("thought-grid") as HTMLCanvasElement | null;
const colorFontLegend = document.getElementById("color-font-legend") as HTMLElement | null;

if (!inputBox || !warningBox || !canvas || !colorFontLegend) {
  throw new Error("Front page elements are missing.");
}

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas 2D context is unavailable.");
}

type DrawCell = {
  char: string;
  fill: string;
};

const setWarning = (message: string) => {
  warningBox.textContent = message;
};

type NormalizedInput = {
  value: string;
  hadInvalidChars: boolean;
  hitLimit: boolean;
};

const normalizeEnglishInput = (value: string): NormalizedInput => {
  const upper = value.toUpperCase();
  let result = "";
  let hadInvalidChars = false;
  let hitLimit = false;

  for (const char of upper) {
    if ((char >= "A" && char <= "Z") || char === " ") {
      if (result.length >= MAX_CHARS) {
        hitLimit = true;
        continue;
      }
      result += char;
    } else {
      hadInvalidChars = true;
    }
  }

  return { value: result, hadInvalidChars, hitLimit };
};

const colorForCharacter = (char: string): string => {
  if (char < "A" || char > "Z") {
    return SPACE_FILL;
  }
  return COLOR_FONT[char as ColorFontLetter] ?? "#ffffff";
};

const getDisplayWidth = () => {
  const frame = canvas.parentElement;

  if (!frame) {
    return CANVAS_WIDTH;
  }

  const frameStyles = window.getComputedStyle(frame);
  const horizontalPadding =
    Number.parseFloat(frameStyles.paddingLeft) + Number.parseFloat(frameStyles.paddingRight);
  const innerWidth = Math.max(320, frame.clientWidth - horizontalPadding);
  return Math.min(CANVAS_WIDTH, innerWidth);
};

const getMinimumHeight = (displayWidth: number) => {
  return Math.max(320, displayWidth);
};

const fitCellsToRow = (count: number, displayWidth: number) => {
  const availableWidth = displayWidth - 2 * CANVAS_PADDING;
  const itemCount = Math.max(1, count);
  const naturalWidth = itemCount * CELL_SIZE + Math.max(0, itemCount - 1) * CELL_GAP;
  const scale = Math.min(1, availableWidth / naturalWidth);
  const cellSize = CELL_SIZE * scale;
  const gap = itemCount > 1 ? CELL_GAP * scale : 0;
  const rowWidth = itemCount * cellSize + Math.max(0, itemCount - 1) * gap;
  const strokeWidth = Math.max(0.75, Math.min(2, cellSize * 0.08));

  return { cellSize, gap, rowWidth, strokeWidth };
};

const resizeCanvas = (displayWidth: number, height: number) => {
  const deviceScale = window.devicePixelRatio || 1;

  canvas.width = Math.round(displayWidth * deviceScale);
  canvas.height = Math.round(height * deviceScale);
  canvas.style.width = "100%";
  canvas.style.height = `${height}px`;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(deviceScale, deviceScale);
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
};

const renderColorFontLegend = () => {
  const legendItems = Object.entries(COLOR_FONT)
    .map(([letter, color]) => {
      return `
        <div class="color-font-chip">
          <span class="color-font-chip__swatch" style="--chip-color: ${color};"></span>
          <span class="color-font-chip__label">${letter}</span>
          <code class="color-font-chip__value">${color}</code>
        </div>
      `;
    })
    .join("");

  colorFontLegend.innerHTML = legendItems;
};

const renderCanvas = (value: string) => {
  const previewText = value.length > 0 ? value : PLACEHOLDER;
  const cells: DrawCell[] = Array.from(previewText, (char) => {
    const fill = colorForCharacter(char);
    return {
      char,
      fill,
    };
  });

  const displayWidth = getDisplayWidth();
  const height = getMinimumHeight(displayWidth);
  const { cellSize, gap, rowWidth, strokeWidth } = fitCellsToRow(cells.length, displayWidth);
  resizeCanvas(displayWidth, height);

  context.clearRect(0, 0, displayWidth, height);
  context.fillStyle = BACKGROUND_FILL;
  context.fillRect(0, 0, displayWidth, height);

  const xStart = (displayWidth - rowWidth) / 2;
  const yStart = (height - cellSize) / 2;

  cells.forEach((cell, index) => {
    const x = xStart + index * (cellSize + gap);
    const y = yStart;

    if (cell.char === " ") {
      drawRoundedRect(context, x, y, cellSize, cellSize, CELL_RADIUS);
      context.fillStyle = SPACE_FILL;
      context.fill();
      context.strokeStyle = SPACE_STROKE;
      context.lineWidth = strokeWidth;
      context.stroke();
      return;
    }

    drawRoundedRect(context, x, y, cellSize, cellSize, CELL_RADIUS);
    context.fillStyle = cell.fill;
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.14)";
    context.lineWidth = strokeWidth;
    context.stroke();
  });
};

const syncFromInput = () => {
  const raw = inputBox.value;
  const normalized = normalizeEnglishInput(raw);

  if (normalized.value !== raw) {
    inputBox.value = normalized.value;
  }

  if (normalized.hadInvalidChars) {
    setWarning("Only English letters A-Z and spaces are allowed.");
  } else if (normalized.hitLimit) {
    setWarning(`Input is limited to ${MAX_CHARS} characters.`);
  } else {
    setWarning("");
  }

  renderCanvas(normalized.value);
};

inputBox.addEventListener("input", syncFromInput);

window.addEventListener("resize", () => {
  renderCanvas(normalizeEnglishInput(inputBox.value).value);
});

inputBox.value = PLACEHOLDER;
renderColorFontLegend();
syncFromInput();
