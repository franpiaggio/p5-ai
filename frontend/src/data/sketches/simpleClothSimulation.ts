import type { SketchExample } from '../sketchExamples';

const simpleClothSimulation: SketchExample = {
  label: 'Simple cloth simulation',
  prompt: 'Create a cloth simulation with connected spring particles',
  code: `let points = [];
const COLS = 25, ROWS = 18, REST = 18, GRAV = 0.3, DAMP = 0.98;

function setup() {
  createCanvas(windowWidth, windowHeight);
  let ox = (width - COLS * REST) / 2, oy = 60;
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      points.push({
        x: ox + i * REST, y: oy + j * REST,
        ox: ox + i * REST, oy: oy + j * REST,
        pinned: j === 0 && i % 4 === 0,
      });
    }
  }
}

function pt(i, j) { return points[j * COLS + i]; }

function draw() {
  background(20);

  // Verlet integration
  for (let p of points) {
    if (p.pinned) continue;
    let vx = (p.x - p.ox) * DAMP;
    let vy = (p.y - p.oy) * DAMP + GRAV;
    p.ox = p.x; p.oy = p.y;
    p.x += vx; p.y += vy;
  }

  // Constraints
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        let a = pt(i, j);
        if (i < COLS - 1) solve(a, pt(i + 1, j));
        if (j < ROWS - 1) solve(a, pt(i, j + 1));
      }
    }
  }

  // Mouse interaction
  if (mouseIsPressed) {
    for (let p of points) {
      if (!p.pinned && dist(mouseX, mouseY, p.x, p.y) < 30) {
        p.x = mouseX; p.y = mouseY;
      }
    }
  }

  // Render
  stroke(140, 180, 200);
  strokeWeight(1);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      let a = pt(i, j);
      if (i < COLS - 1) { let b = pt(i + 1, j); line(a.x, a.y, b.x, b.y); }
      if (j < ROWS - 1) { let b = pt(i, j + 1); line(a.x, a.y, b.x, b.y); }
    }
  }
}

function solve(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let d = sqrt(dx * dx + dy * dy);
  let diff = (d - REST) / d * 0.5;
  if (!a.pinned) { a.x += dx * diff; a.y += dy * diff; }
  if (!b.pinned) { b.x -= dx * diff; b.y -= dy * diff; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default simpleClothSimulation;
