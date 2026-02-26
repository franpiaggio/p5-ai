import type { SketchExample } from '../sketchExamples';

const reactionDiffusion: SketchExample = {
  label: 'Reaction-diffusion',
  prompt: 'Create a reaction-diffusion simulation producing organic Turing patterns',
  code: `let grid, next;
let dA = 1.0, dB = 0.5;
let feed = 0.055, kill = 0.062;
let cellSize = 3;
let cols, rows;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100);
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  initGrid();
}

function initGrid() {
  grid = [];
  next = [];
  for (let i = 0; i < cols; i++) {
    grid[i] = [];
    next[i] = [];
    for (let j = 0; j < rows; j++) {
      grid[i][j] = { a: 1, b: 0 };
      next[i][j] = { a: 1, b: 0 };
    }
  }

  // seed several spots
  for (let s = 0; s < 8; s++) {
    let cx = floor(random(cols * 0.1, cols * 0.9));
    let cy = floor(random(rows * 0.1, rows * 0.9));
    let radius = floor(random(3, 8));
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        let gi = cx + i;
        let gj = cy + j;
        if (gi >= 0 && gi < cols && gj >= 0 && gj < rows) {
          if (i * i + j * j <= radius * radius) {
            grid[gi][gj].b = 1;
          }
        }
      }
    }
  }
}

function laplacianA(x, y) {
  let sum = 0;
  sum += grid[x][y].a * -1;
  if (x > 0) sum += grid[x - 1][y].a * 0.2;
  if (x < cols - 1) sum += grid[x + 1][y].a * 0.2;
  if (y > 0) sum += grid[x][y - 1].a * 0.2;
  if (y < rows - 1) sum += grid[x][y + 1].a * 0.2;
  if (x > 0 && y > 0) sum += grid[x - 1][y - 1].a * 0.05;
  if (x < cols - 1 && y > 0) sum += grid[x + 1][y - 1].a * 0.05;
  if (x > 0 && y < rows - 1) sum += grid[x - 1][y + 1].a * 0.05;
  if (x < cols - 1 && y < rows - 1) sum += grid[x + 1][y + 1].a * 0.05;
  return sum;
}

function laplacianB(x, y) {
  let sum = 0;
  sum += grid[x][y].b * -1;
  if (x > 0) sum += grid[x - 1][y].b * 0.2;
  if (x < cols - 1) sum += grid[x + 1][y].b * 0.2;
  if (y > 0) sum += grid[x][y - 1].b * 0.2;
  if (y < rows - 1) sum += grid[x][y + 1].b * 0.2;
  if (x > 0 && y > 0) sum += grid[x - 1][y - 1].b * 0.05;
  if (x < cols - 1 && y > 0) sum += grid[x + 1][y - 1].b * 0.05;
  if (x > 0 && y < rows - 1) sum += grid[x - 1][y + 1].b * 0.05;
  if (x < cols - 1 && y < rows - 1) sum += grid[x + 1][y + 1].b * 0.05;
  return sum;
}

function draw() {
  // simulate multiple steps per frame
  for (let step = 0; step < 5; step++) {
    for (let i = 1; i < cols - 1; i++) {
      for (let j = 1; j < rows - 1; j++) {
        let a = grid[i][j].a;
        let b = grid[i][j].b;
        let la = laplacianA(i, j);
        let lb = laplacianB(i, j);
        let abb = a * b * b;
        next[i][j].a = constrain(a + dA * la - abb + feed * (1 - a), 0, 1);
        next[i][j].b = constrain(b + dB * lb + abb - (kill + feed) * b, 0, 1);
      }
    }
    [grid, next] = [next, grid];
  }

  // add chemical B on mouse drag
  if (mouseIsPressed) {
    let mx = floor(mouseX / cellSize);
    let my = floor(mouseY / cellSize);
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        let gi = mx + i;
        let gj = my + j;
        if (gi >= 0 && gi < cols && gj >= 0 && gj < rows) {
          grid[gi][gj].b = 1;
        }
      }
    }
  }

  // render
  loadPixels();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let val = grid[i][j].a - grid[i][j].b;
      let c = color(200 + val * 60, 50 + (1 - val) * 40, val * 90 + 10);
      let r = red(c), g = green(c), b = blue(c);
      for (let dx = 0; dx < cellSize; dx++) {
        for (let dy = 0; dy < cellSize; dy++) {
          let px = i * cellSize + dx;
          let py = j * cellSize + dy;
          if (px < width && py < height) {
            let idx = 4 * (py * width + px);
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }
  updatePixels();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  initGrid();
}`,
};

export default reactionDiffusion;
