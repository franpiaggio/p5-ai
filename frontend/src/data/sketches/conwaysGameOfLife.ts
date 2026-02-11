import type { SketchExample } from '../sketchExamples';

const conwaysGameOfLife: SketchExample = {
  label: "Conway's Game of Life",
  prompt: "Create an animated Conway's Game of Life cellular automaton",
  code: `let grid, next;
const RES = 8;
let cols, rows;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cols = ceil(width / RES);
  rows = ceil(height / RES);
  grid = make2D(cols, rows);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      grid[i][j] = random() > 0.7 ? 1 : 0;
  frameRate(12);
}

function make2D(c, r) {
  return Array.from({ length: c }, () => new Array(r).fill(0));
}

function countNeighbors(g, x, y) {
  let sum = 0;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      let ci = (x + i + cols) % cols;
      let cj = (y + j + rows) % rows;
      sum += g[ci][cj];
    }
  return sum - g[x][y];
}

function draw() {
  background(10);
  noStroke();

  next = make2D(cols, rows);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let n = countNeighbors(grid, i, j);
      next[i][j] = grid[i][j] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      if (grid[i][j]) {
        fill(100, 220, 140);
        rect(i * RES, j * RES, RES - 1, RES - 1);
      }
    }
  }
  grid = next;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default conwaysGameOfLife;
