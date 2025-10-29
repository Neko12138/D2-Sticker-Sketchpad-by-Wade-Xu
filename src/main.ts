import "./style.css";

const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
document.body.append(canvas);

const ctx = canvas.getContext("2d");

const cursor = { active: false, x: 0, y: 0 };

//////////// Interfaces ////////////

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
  drag(x: number, y: number): void;
}

interface Drawing {
  commands: DisplayCommand[];
}

interface ToolPreview {
  draw(ctx: CanvasRenderingContext2D): void;
}

//////////// State ////////////

const drawing: Drawing = { commands: [] };
const redoStack: DisplayCommand[] = [];
let currentCommand: DisplayCommand | null = null;
let currentPreview: ToolPreview | null = null;

let currentLineWidth = 2;
let currentTool: "marker" | "sticker" = "marker";
let currentSticker = "🎨";
let currentColor = randomColor();
let currentRotation = randomRotation();

//////////// Utility functions ////////////

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 90%, 45%)`;
}

function randomRotation(): number {
  return (Math.random() - 0.5) * Math.PI / 2; // ±45 degrees
}

//////////// Commands ////////////

function makeLineCommand(
  x: number,
  y: number,
  lineWidth: number,
  color: string,
): DisplayCommand {
  const points: { x: number; y: number }[] = [{ x, y }];

  function drag(x: number, y: number) {
    points.push({ x, y });
  }

  function display(ctx: CanvasRenderingContext2D) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1]!;
      const p2 = points[i]!;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
  }

  return { display, drag };
}

function makeStickerCommand(
  x: number,
  y: number,
  emoji: string,
  rotation: number,
): DisplayCommand {
  let pos = { x, y };

  function drag(x: number, y: number) {
    pos = { x, y };
  }

  function display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  return { display, drag };
}

//////////// Tool Previews ////////////

function makeMarkerPreview(
  x: number,
  y: number,
  r: number,
  color: string,
): ToolPreview {
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.arc(x, y, r / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "black";
    },
  };
}

function makeStickerPreview(
  x: number,
  y: number,
  emoji: string,
  rotation: number,
): ToolPreview {
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.font = "32px sans-serif";
      ctx.globalAlpha = 0.5;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.restore();
    },
  };
}

//////////// Events ////////////

function triggerDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

function triggerToolMoved() {
  canvas.dispatchEvent(new Event("tool-moved"));
}

canvas.addEventListener("drawing-changed", () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of drawing.commands) cmd.display(ctx);
  if (!cursor.active && currentPreview) currentPreview.draw(ctx);
});

canvas.addEventListener("tool-moved", () => {
  triggerDrawingChanged();
});

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
  redoStack.length = 0;

  if (currentTool === "marker") {
    currentCommand = makeLineCommand(
      cursor.x,
      cursor.y,
      currentLineWidth,
      currentColor,
    );
  } else {
    currentCommand = makeStickerCommand(
      cursor.x,
      cursor.y,
      currentSticker,
      currentRotation,
    );
  }

  drawing.commands.push(currentCommand);
  triggerDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  if (cursor.active && ctx && currentCommand) {
    currentCommand.drag(cursor.x, cursor.y);
    triggerDrawingChanged();
  } else {
    if (currentTool === "marker") {
      currentPreview = makeMarkerPreview(
        cursor.x,
        cursor.y,
        currentLineWidth,
        currentColor,
      );
    } else {
      currentPreview = makeStickerPreview(
        cursor.x,
        cursor.y,
        currentSticker,
        currentRotation,
      );
    }
    triggerToolMoved();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentCommand = null;
  triggerDrawingChanged();
});

//////////// Buttons ////////////

const makeButton = (label: string, onClick: () => void) => {
  const btn = document.createElement("button");
  btn.innerHTML = label;
  btn.addEventListener("click", onClick);
  document.body.append(btn);
  return btn;
};

// Clear / Undo / Redo
makeButton("Clear", () => {
  drawing.commands = [];
  redoStack.length = 0;
  triggerDrawingChanged();
});

makeButton("Undo", () => {
  if (drawing.commands.length > 0) {
    const lastCommand = drawing.commands.pop()!;
    redoStack.push(lastCommand);
    triggerDrawingChanged();
  }
});

makeButton("Redo", () => {
  if (redoStack.length > 0) {
    const restoredCommand = redoStack.pop()!;
    drawing.commands.push(restoredCommand);
    triggerDrawingChanged();
  }
});

// Marker tools
makeButton("New Marker", () => {
  currentTool = "marker";
  currentColor = randomColor();
  triggerToolMoved();
});

makeButton("Thin Marker", () => {
  currentTool = "marker";
  currentLineWidth = 2;
  currentColor = randomColor();
  triggerToolMoved();
});

makeButton("Thick Marker", () => {
  currentTool = "marker";
  currentLineWidth = 6;
  currentColor = randomColor();
  triggerToolMoved();
});

// Stickers
const stickers: string[] = ["🎨", "✨", "😎"];
const stickerContainer = document.createElement("div");
document.body.append(stickerContainer);

function renderStickerButtons() {
  stickerContainer.innerHTML = "";

  for (const emoji of stickers) {
    const btn = document.createElement("button");
    btn.innerHTML = emoji;
    stickerContainer.append(btn);
    btn.addEventListener("click", () => {
      currentTool = "sticker";
      currentSticker = emoji;
      currentRotation = randomRotation();
      triggerToolMoved();
    });
  }
}

renderStickerButtons();

const addStickerButton = document.createElement("button");
addStickerButton.innerHTML = "Add Sticker";
stickerContainer.append(addStickerButton);

addStickerButton.addEventListener("click", () => {
  const newSticker = prompt("Enter a new sticker (emoji or text):", "⭐");
  if (newSticker && newSticker.trim() !== "") {
    stickers.push(newSticker.trim());
    renderStickerButtons();
  }
});

// Export
const exportButton = document.createElement("button");
exportButton.innerHTML = "Export 1024x1024";
document.body.append(exportButton);

exportButton.addEventListener("click", () => {
  const scale = 4;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width * scale;
  exportCanvas.height = canvas.height * scale;
  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) return;

  exportCtx.scale(scale, scale);
  for (const cmd of drawing.commands) cmd.display(exportCtx);

  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sticker_sketchpad.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});
