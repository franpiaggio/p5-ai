import type { SketchExample } from '../sketchExamples';

const perlinNoiseTerrain: SketchExample = {
  label: 'Perlin noise terrain',
  prompt: 'Create a scrolling 3D-like Perlin noise terrain wireframe',
  code: `let cols, rows;
const SCL = 20;
let flying = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cols = ceil(width / SCL) + 1;
  rows = 30;
}

function draw() {
  background(15);
  flying -= 0.03;
  noFill();
  stroke(80, 160, 200, 120);
  strokeWeight(0.8);

  translate(0, height * 0.6);
  rotateX(PI / 3);

  let terrain = [];
  let yoff = flying;
  for (let y = 0; y < rows; y++) {
    terrain[y] = [];
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      terrain[y][x] = map(noise(xoff, yoff), 0, 1, -80, 80);
      xoff += 0.15;
    }
    yoff += 0.15;
  }

  for (let y = 0; y < rows - 1; y++) {
    beginShape(TRIANGLE_STRIP);
    for (let x = 0; x < cols; x++) {
      vertex(x * SCL - width / 2, y * SCL - 100, terrain[y][x]);
      vertex(x * SCL - width / 2, (y + 1) * SCL - 100, terrain[y + 1][x]);
    }
    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cols = ceil(width / SCL) + 1;
}`,
};

export default perlinNoiseTerrain;
