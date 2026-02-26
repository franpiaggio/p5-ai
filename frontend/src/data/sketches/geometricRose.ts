import type { SketchExample } from '../sketchExamples';

const geometricRose: SketchExample = {
  label: 'Geometric rose curves',
  prompt: 'Create animated mathematical rose curves with shifting colors and parameters',
  code: `let n = 2;
let d = 1;
let targetN = 3;
let targetD = 5;
let transition = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 5, 15);
  translate(width / 2, height / 2);

  transition += 0.003;
  if (transition >= 1) {
    transition = 0;
    n = targetN;
    d = targetD;
    targetN = floor(random(2, 9));
    targetD = floor(random(1, 9));
  }

  let curN = lerp(n, targetN, transition);
  let curD = lerp(d, targetD, transition);
  let k = curN / curD;
  let maxR = min(width, height) * 0.38;

  // draw multiple offset rose curves
  for (let layer = 0; layer < 4; layer++) {
    let layerOffset = layer * 0.3 + frameCount * 0.005;
    let hueBase = (frameCount * 0.5 + layer * 40) % 360;

    noFill();
    strokeWeight(1.5);
    beginShape();
    for (let a = 0; a < TWO_PI * ceil(curD); a += 0.01) {
      let r = maxR * cos(k * a + layerOffset) * (0.7 + layer * 0.1);
      let x = r * cos(a);
      let y = r * sin(a);
      let hue = (hueBase + a * 20) % 360;
      stroke(hue, 60, 90, 30);
      vertex(x, y);
    }
    endShape();
  }

  // info
  noStroke();
  fill(0, 0, 100, 40);
  textAlign(CENTER);
  textSize(12);
  textFont('monospace');
  text('r = cos(' + nf(curN, 1, 1) + '/' + nf(curD, 1, 1) + ' · θ)', 0, min(width, height) * 0.44);
}

function mousePressed() {
  transition = 0;
  n = targetN;
  d = targetD;
  targetN = floor(random(2, 9));
  targetD = floor(random(1, 9));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default geometricRose;
