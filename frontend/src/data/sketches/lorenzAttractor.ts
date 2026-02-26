import type { SketchExample } from '../sketchExamples';

const lorenzAttractor: SketchExample = {
  label: 'Lorenz strange attractor',
  prompt: 'Create a Lorenz strange attractor with colorful orbiting trails',
  code: `let trails = [];
const NUM_TRAILS = 5;
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.005;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 5);

  for (let i = 0; i < NUM_TRAILS; i++) {
    trails.push({
      x: 0.1 + i * 0.001,
      y: 0,
      z: 0,
      hue: (i * 72) % 360,
      points: [],
    });
  }
}

function draw() {
  background(0, 0, 5, 4);
  translate(width / 2, height / 2);

  let scale = min(width, height) / 55;
  let rotY = frameCount * 0.002;

  for (let trail of trails) {
    // Lorenz equations
    for (let s = 0; s < 20; s++) {
      let dx = SIGMA * (trail.y - trail.x) * DT;
      let dy = (trail.x * (RHO - trail.z) - trail.y) * DT;
      let dz = (trail.x * trail.y - BETA * trail.z) * DT;
      trail.x += dx;
      trail.y += dy;
      trail.z += dz;
    }

    // 3D rotation around Y axis
    let rx = trail.x * cos(rotY) - trail.z * sin(rotY);
    let ry = trail.y;

    trail.points.push({ x: rx, y: ry });
    if (trail.points.length > 300) trail.points.shift();

    // draw trail
    noFill();
    strokeWeight(1.2);
    beginShape();
    for (let i = 0; i < trail.points.length; i++) {
      let frac = i / trail.points.length;
      let hue = (trail.hue + frac * 60) % 360;
      stroke(hue, 70, 90, frac * 60);
      vertex(trail.points[i].x * scale, trail.points[i].y * scale);
    }
    endShape();

    // bright head
    let last = trail.points[trail.points.length - 1];
    noStroke();
    fill(trail.hue, 60, 100, 80);
    circle(last.x * scale, last.y * scale, 4);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0, 0, 5);
}`,
};

export default lorenzAttractor;
