import type { SketchExample } from '../sketchExamples';

const morphingPolygons: SketchExample = {
  label: 'Morphing shapes',
  prompt: 'Create smoothly morphing polygons that transition between triangle, square, pentagon and more',
  code: `let shapes = [];
let currentShape = 0;
let morphT = 0;
let PTS = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let n = 3; n <= 7; n++) {
    let pts = [];
    for (let i = 0; i < PTS; i++) {
      let idx = floor((i / PTS) * n);
      let nextIdx = (idx + 1) % n;
      let frac = ((i / PTS) * n) % 1;
      let a1 = (TAU / n) * idx - HALF_PI;
      let a2 = (TAU / n) * nextIdx - HALF_PI;
      pts.push({ x: lerp(cos(a1), cos(a2), frac), y: lerp(sin(a1), sin(a2), frac) });
    }
    shapes.push(pts);
  }
}

function draw() {
  background(0, 0, 5, 20);
  translate(width / 2, height / 2);

  morphT += 0.008;
  if (morphT >= 1) {
    morphT = 0;
    currentShape = (currentShape + 1) % shapes.length;
  }

  let from = shapes[currentShape];
  let to = shapes[(currentShape + 1) % shapes.length];
  let r = min(width, height) * 0.3;
  let ease = (1 - cos(morphT * PI)) / 2;

  for (let layer = 0; layer < 4; layer++) {
    let rot = frameCount * 0.01 * (layer % 2 === 0 ? 1 : -1);
    let scale = r * (1 - layer * 0.15);
    let hue = (frameCount + layer * 90) % 360;

    push();
    rotate(rot);
    noFill();
    stroke(hue, 60, 90, map(layer, 0, 4, 60, 20));
    strokeWeight(2);

    beginShape();
    for (let i = 0; i < from.length; i++) {
      vertex(lerp(from[i].x, to[i].x, ease) * scale, lerp(from[i].y, to[i].y, ease) * scale);
    }
    endShape(CLOSE);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default morphingPolygons;
