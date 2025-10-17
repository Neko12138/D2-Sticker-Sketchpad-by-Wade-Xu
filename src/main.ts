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

interface Point {
  x: number;
  y: number;
}

interface Drawing {
  strokes: Point[][];
}

const drawing: Drawing = { strokes: [] };

const redoStack: Point[][] = [];

let currentStroke: Point[] | null = null;

function triggerDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("drawing-changed", () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of drawing.strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    for (let i = 1; i < stroke.length; i++) {
      const p1 = stroke[i - 1]!;
      const p2 = stroke[i]!;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();
  }
});

//////////mouse/////////

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  redoStack.length = 0;

  currentStroke = [{ x: cursor.x, y: cursor.y }];
  drawing.strokes.push(currentStroke);
  triggerDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active && ctx && currentStroke) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    currentStroke.push({ x: cursor.x, y: cursor.y });
    triggerDrawingChanged();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentStroke = null;
});

/////////////button/////////////

//clear
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  if (ctx) {
    drawing.strokes = [];
    redoStack.length = 0;
    triggerDrawingChanged();
  }
});

//undo
const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  if (drawing.strokes.length > 0) {
    const lastStroke = drawing.strokes.pop()!;
    redoStack.push(lastStroke);
    triggerDrawingChanged();
  }
});

//redo
const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const restoredStroke = redoStack.pop()!;
    drawing.strokes.push(restoredStroke);
    triggerDrawingChanged();
  }
});
