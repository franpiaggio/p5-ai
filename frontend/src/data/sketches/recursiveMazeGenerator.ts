import type { SketchExample } from '../sketchExamples';

const recursiveMazeGenerator: SketchExample = {
  label: 'Recursive maze generator',
  prompt: 'Create an animated recursive backtracker maze generation',
  code: `const CELL = 20;
let cols, rows, grid, stack, current;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cols = floor(width / CELL);
  rows = floor(height / CELL);
  grid = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      grid.push({ i, j, walls: [true, true, true, true], visited: false });
  current = grid[0];
  current.visited = true;
  stack = [current];
  frameRate(30);
}

function idx(i, j) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return i + j * cols;
}

function draw() {
  background(20);

  for (let k = 0; k < 5 && stack.length > 0; k++) {
    let neighbors = [];
    let { i, j } = current;
    [[i, j - 1], [i + 1, j], [i, j + 1], [i - 1, j]].forEach(([ni, nj], d) => {
      let id = idx(ni, nj);
      if (id >= 0 && !grid[id].visited) neighbors.push({ cell: grid[id], dir: d });
    });

    if (neighbors.length > 0) {
      let pick = random(neighbors);
      let next = pick.cell;
      let d = pick.dir;
      current.walls[d] = false;
      next.walls[(d + 2) % 4] = false;
      next.visited = true;
      stack.push(current);
      current = next;
    } else {
      current = stack.pop();
    }
  }

  stroke(40, 80, 60);
  strokeWeight(2);
  for (let c of grid) {
    let x = c.i * CELL, y = c.j * CELL;
    if (!c.visited) { noStroke(); fill(30); rect(x, y, CELL, CELL); continue; }
    stroke(40, 80, 60);
    if (c.walls[0]) line(x, y, x + CELL, y);
    if (c.walls[1]) line(x + CELL, y, x + CELL, y + CELL);
    if (c.walls[2]) line(x, y + CELL, x + CELL, y + CELL);
    if (c.walls[3]) line(x, y, x, y + CELL);
  }

  noStroke();
  fill(255, 80, 80);
  rect(current.i * CELL + 2, current.j * CELL + 2, CELL - 4, CELL - 4);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default recursiveMazeGenerator;
