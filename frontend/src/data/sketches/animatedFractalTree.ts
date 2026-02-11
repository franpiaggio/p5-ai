import type { SketchExample } from '../sketchExamples';

const animatedFractalTree: SketchExample = {
  label: 'Animated fractal tree',
  prompt: 'Create an animated recursive fractal tree that sways in the wind',
  code: `let angle;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(20);
  angle = map(sin(frameCount * 0.02), -1, 1, PI / 8, PI / 3);

  translate(width / 2, height);
  branch(min(width, height) * 0.22);
}

function branch(len) {
  strokeWeight(map(len, 2, 200, 0.5, 4));
  let g = map(len, 2, 200, 200, 80);
  stroke(90, g, 70, 200);

  line(0, 0, 0, -len);
  translate(0, -len);

  if (len > 4) {
    push();
    rotate(angle);
    branch(len * 0.67);
    pop();

    push();
    rotate(-angle);
    branch(len * 0.67);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default animatedFractalTree;
