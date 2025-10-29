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

//////////// Commands ////////////

function makeLineCommand(
  x: number,
  y: number,
  lineWidth: number,
): DisplayCommand {
  const points: { x: number; y: number }[] = [{ x, y }];

  function drag(x: number, y: number) {
    points.push({ x, y });
  }

  function display(ctx: CanvasRenderingContext2D) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
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
): DisplayCommand {
  let pos = { x, y };

  function drag(x: number, y: number) {
    pos = { x, y };
  }

  function display(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, pos.x, pos.y);
  }

  return { display, drag };
}

//////////// Tool Previews ////////////

function makeCirclePreview(x: number, y: number, r: number): ToolPreview {
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "gray";
      ctx.arc(x, y, r / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "black";
    },
  };
}

function makeStickerPreview(x: number, y: number, emoji: string): ToolPreview {
  return {
    draw(ctx: CanvasRenderingContext2D) {
      ctx.font = "32px sans-serif";
      ctx.globalAlpha = 0.5;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, x, y);
      ctx.globalAlpha = 1.0;
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

  for (const cmd of drawing.commands) {
    cmd.display(ctx);
  }

  if (!cursor.active && currentPreview) {
    currentPreview.draw(ctx);
  }
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
    currentCommand = makeLineCommand(cursor.x, cursor.y, currentLineWidth);
  } else {
    currentCommand = makeStickerCommand(cursor.x, cursor.y, currentSticker);
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
      currentPreview = makeCirclePreview(cursor.x, cursor.y, currentLineWidth);
    } else {
      currentPreview = makeStickerPreview(cursor.x, cursor.y, currentSticker);
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

// Clear
makeButton("Clear", () => {
  drawing.commands = [];
  redoStack.length = 0;
  triggerDrawingChanged();
});

// Undo / Redo
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

// Marker width
makeButton("Thin Marker", () => {
  currentTool = "marker";
  currentLineWidth = 2;
  triggerToolMoved();
});

makeButton("Thick Marker", () => {
  currentTool = "marker";
  currentLineWidth = 6;
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

  for (const cmd of drawing.commands) {
    cmd.display(exportCtx);
  }

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
