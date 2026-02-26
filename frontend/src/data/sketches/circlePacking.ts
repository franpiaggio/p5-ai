import type { SketchExample } from '../sketchExamples';

const circlePacking: SketchExample = {
  label: 'Circle packing',
  prompt: 'Create an animated circle packing that fills the screen with growing non-overlapping circles',
  code: `let circles = [];
let palette;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  palette = [
    [350, 65, 85], [20, 70, 90], [45, 75, 95],
    [160, 55, 80], [200, 60, 85], [270, 50, 80],
    [310, 55, 85],
  ];
  background(0, 0, 8);
}

function draw() {
  background(0, 0, 8, 2);

  // try to add new circles
  for (let attempt = 0; attempt < 20; attempt++) {
    let x = random(width);
    let y = random(height);
    let valid = true;
    for (let c of circles) {
      if (dist(x, y, c.x, c.y) < c.r + 2) {
        valid = false;
        break;
      }
    }
    if (valid) {
      let col = random(palette);
      circles.push({
        x: x,
        y: y,
        r: 1,
        growing: true,
        hue: col[0],
        sat: col[1],
        bright: col[2],
      });
    }
  }

  // grow circles
  for (let c of circles) {
    if (!c.growing) continue;

    // check edges
    if (c.x - c.r < 0 || c.x + c.r > width || c.y - c.r < 0 || c.y + c.r > height) {
      c.growing = false;
      continue;
    }

    // check collisions
    for (let other of circles) {
      if (other === c) continue;
      if (dist(c.x, c.y, other.x, other.y) < c.r + other.r + 1.5) {
        c.growing = false;
        break;
      }
    }

    if (c.growing) c.r += 0.5;
  }

  // draw
  for (let c of circles) {
    let pulse = c.growing ? sin(frameCount * 0.1) * 3 : 0;
    stroke(c.hue, c.sat - 10, c.bright + 10, 40);
    strokeWeight(1);
    fill(c.hue, c.sat, c.bright, 50);
    circle(c.x, c.y, (c.r + pulse) * 2);

    // inner ring
    if (c.r > 8) {
      noFill();
      stroke(c.hue, c.sat - 20, c.bright + 15, 25);
      circle(c.x, c.y, c.r * 1.2);
    }
  }

  // stop after filling up
  if (circles.length > 1500) noLoop();
}

function mousePressed() {
  circles = [];
  loop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  circles = [];
  loop();
}`,
};

export default circlePacking;
