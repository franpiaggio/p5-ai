import type { SketchExample } from '../sketchExamples';

const magneticFieldLines: SketchExample = {
  label: 'Magnetic field lines',
  prompt: 'Create an animated magnetic dipole with colorful field lines curving between two poles',
  code: `function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 8);

  let t = frameCount * 0.01;
  let sep = width * 0.15;
  let p1x = width / 2 - sep * cos(t * 0.5);
  let p1y = height / 2 + sin(t * 0.7) * 30;
  let p2x = width / 2 + sep * cos(t * 0.5);
  let p2y = height / 2 - sin(t * 0.7) * 30;

  noStroke();
  fill(0, 80, 90, 40);
  ellipse(p1x, p1y, 20);
  fill(220, 80, 90, 40);
  ellipse(p2x, p2y, 20);

  let numLines = 20;
  for (let i = 0; i < numLines; i++) {
    let angle = map(i, 0, numLines, 0, TAU);
    let px = p1x + cos(angle) * 15;
    let py = p1y + sin(angle) * 15;

    let hue = map(i, 0, numLines, 0, 360);
    let pulse = sin(frameCount * 0.03 + i) * 15;
    stroke(hue, 50, 70, 30 + pulse);
    strokeWeight(1.5);
    noFill();

    beginShape();
    for (let step = 0; step < 200; step++) {
      vertex(px, py);

      let dx1 = px - p1x, dy1 = py - p1y;
      let d1 = max(sqrt(dx1 * dx1 + dy1 * dy1), 10);
      let fx = dx1 / (d1 * d1);
      let fy = dy1 / (d1 * d1);

      let dx2 = px - p2x, dy2 = py - p2y;
      let d2 = max(sqrt(dx2 * dx2 + dy2 * dy2), 10);
      fx -= dx2 / (d2 * d2);
      fy -= dy2 / (d2 * d2);

      let mag = sqrt(fx * fx + fy * fy);
      if (mag > 0) {
        px += (fx / mag) * 4;
        py += (fy / mag) * 4;
      }

      if (px < 0 || px > width || py < 0 || py > height) break;
      if (dist(px, py, p2x, p2y) < 15) break;
    }
    endShape();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default magneticFieldLines;
