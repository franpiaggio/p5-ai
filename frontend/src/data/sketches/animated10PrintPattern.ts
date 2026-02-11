import type { SketchExample } from '../sketchExamples';

const animated10PrintPattern: SketchExample = {
  label: 'Animated 10 PRINT pattern',
  prompt: 'Create an animated version of the classic 10 PRINT maze pattern',
  code: `let grid = [];
const SPACING = 20;
let cols, rows;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cols = ceil(width / SPACING) + 1;
  rows = ceil(height / SPACING) + 1;
  for (let i = 0; i < cols * rows; i++) {
    grid.push(random() > 0.5 ? 1 : 0);
  }
}

function draw() {
  background(0);
  stroke(0, 255, 100);
  strokeWeight(2);
  strokeCap(SQUARE);

  // Randomly flip a few cells each frame
  for (let k = 0; k < 3; k++) {
    let idx = floor(random(grid.length));
    grid[idx] = 1 - grid[idx];
  }

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let x = i * SPACING;
      let y = j * SPACING;
      if (grid[j * cols + i]) {
        line(x, y, x + SPACING, y + SPACING);
      } else {
        line(x, y + SPACING, x + SPACING, y);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = ceil(width / SPACING) + 1;
  rows = ceil(height / SPACING) + 1;
  grid = [];
  for (let i = 0; i < cols * rows; i++) {
    grid.push(random() > 0.5 ? 1 : 0);
  }
}`,
};

export default animated10PrintPattern;
