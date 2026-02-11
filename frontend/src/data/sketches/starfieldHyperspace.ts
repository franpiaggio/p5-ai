import type { SketchExample } from '../sketchExamples';

const starfieldHyperspace: SketchExample = {
  label: 'Starfield hyperspace',
  prompt: 'Create a starfield / hyperspace warp speed animation',
  code: `let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 800; i++) {
    stars.push({
      x: random(-width, width),
      y: random(-height, height),
      z: random(width),
      pz: 0,
    });
  }
}

function draw() {
  background(0);
  translate(width / 2, height / 2);

  for (let s of stars) {
    s.pz = s.z;
    s.z -= 12;

    if (s.z < 1) {
      s.x = random(-width, width);
      s.y = random(-height, height);
      s.z = width;
      s.pz = s.z;
    }

    let sx = map(s.x / s.z, 0, 1, 0, width);
    let sy = map(s.y / s.z, 0, 1, 0, height);
    let px = map(s.x / s.pz, 0, 1, 0, width);
    let py = map(s.y / s.pz, 0, 1, 0, height);

    let r = map(s.z, 0, width, 3, 0);
    let a = map(s.z, 0, width, 255, 0);

    stroke(255, a);
    strokeWeight(r);
    line(px, py, sx, sy);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default starfieldHyperspace;
