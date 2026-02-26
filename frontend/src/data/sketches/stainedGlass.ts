import type { SketchExample } from '../sketchExamples';

const stainedGlass: SketchExample = {
  label: 'Stained glass window',
  prompt: 'Create a generative stained glass window with colorful irregular cells and dark leading',
  code: `let cells = [];
let pts = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  generateGlass();
}

function generateGlass() {
  pts = [];
  cells = [];
  let numPts = 60;
  for (let i = 0; i < numPts; i++) {
    pts.push(createVector(random(width), random(height)));
  }

  // build Voronoi-like cells via pixel sampling
  let cellColors = [];
  for (let i = 0; i < numPts; i++) {
    cellColors.push({
      hue: random(360),
      sat: random(50, 80),
      bright: random(60, 95),
    });
  }
  cells = cellColors;
}

function draw() {
  background(0, 0, 10);

  // slowly shift colors
  for (let c of cells) {
    c.hue = (c.hue + 0.05) % 360;
  }

  // draw cells
  let step = 4;
  noStroke();
  for (let x = 0; x < width; x += step) {
    for (let y = 0; y < height; y += step) {
      let minD = Infinity;
      let secondD = Infinity;
      let closest = 0;
      for (let i = 0; i < pts.length; i++) {
        let d = dist(x, y, pts[i].x, pts[i].y);
        if (d < minD) {
          secondD = minD;
          minD = d;
          closest = i;
        } else if (d < secondD) {
          secondD = d;
        }
      }

      let edge = secondD - minD;
      if (edge < 5) {
        // dark leading
        fill(0, 0, 8);
      } else {
        let c = cells[closest];
        let brightness = c.bright - map(minD, 0, 200, 0, 20);
        // light effect from center
        let cx = width / 2;
        let cy = height / 3;
        let lightD = dist(x, y, cx, cy);
        let lightBoost = map(lightD, 0, max(width, height) * 0.6, 15, -10);
        fill(c.hue, c.sat, constrain(brightness + lightBoost, 20, 100), 90);
      }
      rect(x, y, step, step);
    }
  }

  // subtle arch frame
  stroke(0, 0, 8);
  strokeWeight(12);
  noFill();
  let margin = 30;
  beginShape();
  vertex(margin, height - margin);
  vertex(margin, height * 0.3);
  // arch top
  bezierVertex(margin, margin, width - margin, margin, width - margin, height * 0.3);
  vertex(width - margin, height - margin);
  endShape();

  noLoop();
}

function mousePressed() {
  generateGlass();
  loop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGlass();
  loop();
}`,
};

export default stainedGlass;
