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

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
  drag(x: number, y: number): void;
}

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

interface Drawing {
  commands: DisplayCommand[];
}

const drawing: Drawing = { commands: [] };

const redoStack: DisplayCommand[] = [];

let currentCommand: DisplayCommand | null = null;

let currentLineWidth = 1;

function triggerDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("drawing-changed", () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const cmd of drawing.commands) {
    cmd.display(ctx);
  }
});

//////////mouse/////////

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  redoStack.length = 0;

  //Line Width
  currentCommand = makeLineCommand(cursor.x, cursor.y, currentLineWidth);
  drawing.commands.push(currentCommand);
  triggerDrawingChanged();
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active && ctx && currentCommand) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentCommand.drag(cursor.x, cursor.y);
    triggerDrawingChanged();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentCommand = null;
});

/////////////button/////////////

//clear
const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  if (ctx) {
    drawing.commands = [];
    redoStack.length = 0;
    triggerDrawingChanged();
  }
});

//undo
const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  if (drawing.commands.length > 0) {
    const lastCommand = drawing.commands.pop()!;
    redoStack.push(lastCommand);
    triggerDrawingChanged();
  }
});

//redo
const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const restoredCommand = redoStack.pop()!;
    drawing.commands.push(restoredCommand);
    triggerDrawingChanged();
  }
});

// lines
const thinButton = document.createElement("button");
thinButton.innerHTML = "thin";
document.body.append(thinButton);

thinButton.addEventListener("click", () => {
  currentLineWidth = 1;
});

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick";
document.body.append(thickButton);

thickButton.addEventListener("click", () => {
  currentLineWidth = 5;
});
