import type { SketchExample } from '../sketchExamples';

const dandelionSeeds: SketchExample = {
  label: 'Dandelion seeds',
  prompt: 'Create dandelion seeds gently floating and drifting in the wind',
  code: `let seeds = [];
let wind;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  wind = createVector(0.3, 0);

  // dandelion stem position
  let stemX = width * 0.3;
  let stemTop = height * 0.5;

  for (let i = 0; i < 40; i++) {
    let angle = random(TWO_PI);
    let r = random(5, 15);
    seeds.push({
      x: stemX + cos(angle) * r,
      y: stemTop + sin(angle) * r * 0.5,
      vx: 0,
      vy: 0,
      attached: true,
      detachTime: random(60, 600),
      filaments: floor(random(6, 12)),
      size: random(2, 4),
      drift: random(0.8, 1.2),
      spin: random(-0.01, 0.01),
      angle: 0,
    });
  }
}

function draw() {
  // sky gradient
  for (let y = 0; y < height; y++) {
    let t = y / height;
    let h = lerp(200, 180, t);
    let s = lerp(30, 15, t);
    let b = lerp(85, 95, t);
    stroke(h, s, b);
    line(0, y, width, y);
  }

  // gentle wind variation
  wind.x = 0.3 + sin(frameCount * 0.01) * 0.15;
  wind.y = sin(frameCount * 0.007) * 0.1;

  // dandelion stem
  let stemX = width * 0.3;
  let stemBase = height * 0.85;
  let stemTop = height * 0.5;
  let sway = sin(frameCount * 0.02) * 5;

  stroke(80, 30, 50);
  strokeWeight(2.5);
  noFill();
  beginShape();
  vertex(stemX, stemBase);
  quadraticVertex(stemX + sway * 0.5, (stemBase + stemTop) / 2, stemX + sway, stemTop);
  endShape();

  // seed head (remaining seeds)
  let headX = stemX + sway;
  let headY = stemTop;
  noStroke();
  fill(0, 0, 95, 40);
  circle(headX, headY, 12);

  for (let s of seeds) {
    if (s.attached) {
      s.x = headX;
      s.y = headY;
      if (frameCount > s.detachTime) {
        s.attached = false;
        s.vx = random(-0.5, 1);
        s.vy = random(-1, -0.3);
      }
      // draw on head
      continue;
    }

    // physics
    s.vx += wind.x * 0.01 * s.drift;
    s.vy += -0.003 + wind.y * 0.01;
    s.vy += sin(frameCount * 0.03 + s.x * 0.01) * 0.005;
    s.vx *= 0.995;
    s.vy *= 0.995;
    s.x += s.vx;
    s.y += s.vy;
    s.angle += s.spin;

    // wrap
    if (s.x > width + 50) s.x = -50;
    if (s.y < -50) s.y = height + 50;

    // draw seed
    push();
    translate(s.x, s.y);
    rotate(s.angle);

    // filaments (the fluffy part)
    stroke(0, 0, 100, 50);
    strokeWeight(0.5);
    for (let f = 0; f < s.filaments; f++) {
      let fa = (TWO_PI / s.filaments) * f;
      let fx = cos(fa) * s.size * 4;
      let fy = sin(fa) * s.size * 4;
      line(0, 0, fx, fy);
      // tiny wisps at tips
      line(fx, fy, fx + cos(fa + 0.3) * 2, fy + sin(fa + 0.3) * 2);
      line(fx, fy, fx + cos(fa - 0.3) * 2, fy + sin(fa - 0.3) * 2);
    }

    // seed body
    noStroke();
    fill(40, 30, 50, 70);
    ellipse(0, s.size * 2, 1.5, s.size);

    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default dandelionSeeds;
