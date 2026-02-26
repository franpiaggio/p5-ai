import type { SketchExample } from '../sketchExamples';

const cherryBlossomWind: SketchExample = {
  label: 'Cherry blossom wind',
  prompt: 'Create a delicate Japanese-aesthetic scene of cherry blossom petals drifting in the wind past a dark branch silhouette',
  code: `let petals = [];
let branches = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  // generate branch structure
  generateBranch(width * 0.15, height * 0.5, -PI / 3, 120, 6);
  generateBranch(width * 0.85, height * 0.3, -PI * 0.7, 100, 5);

  for (let i = 0; i < 150; i++) {
    spawnPetal();
  }
}

function generateBranch(x, y, angle, len, depth) {
  if (depth <= 0 || len < 5) return;
  let ex = x + cos(angle) * len;
  let ey = y + sin(angle) * len;
  branches.push({ x1: x, y1: y, x2: ex, y2: ey, weight: depth * 1.5 });

  generateBranch(ex, ey, angle + random(0.2, 0.6), len * random(0.6, 0.8), depth - 1);
  generateBranch(ex, ey, angle - random(0.2, 0.6), len * random(0.6, 0.8), depth - 1);
  if (random() < 0.3) {
    generateBranch(ex, ey, angle + random(-0.3, 0.3), len * random(0.5, 0.7), depth - 1);
  }
}

function spawnPetal() {
  petals.push({
    x: random(-50, width + 50),
    y: random(-50, height + 50),
    size: random(4, 10),
    rotation: random(TWO_PI),
    rotSpeed: random(-0.05, 0.05),
    vx: random(0.5, 2),
    vy: random(-0.3, 0.8),
    swayPhase: random(TWO_PI),
    swaySpeed: random(0.02, 0.05),
    hue: random(340, 355),
    sat: random(25, 50),
    bright: random(85, 98),
    alpha: random(50, 85),
    flutter: random(0.3, 1),
  });
}

function drawPetal(x, y, size, rotation, hue, sat, bright, alpha) {
  push();
  translate(x, y);
  rotate(rotation);

  // petal shape
  noStroke();
  fill(hue, sat, bright, alpha);
  beginShape();
  vertex(0, -size * 0.5);
  bezierVertex(size * 0.5, -size * 0.5, size * 0.5, size * 0.2, 0, size * 0.5);
  bezierVertex(-size * 0.5, size * 0.2, -size * 0.5, -size * 0.5, 0, -size * 0.5);
  endShape();

  // subtle vein
  stroke(hue, sat - 10, bright - 5, alpha * 0.3);
  strokeWeight(0.3);
  line(0, -size * 0.3, 0, size * 0.3);

  pop();
}

function draw() {
  // soft gradient sky
  for (let y = 0; y < height; y++) {
    let t = y / height;
    let h = lerp(210, 340, pow(t, 0.5));
    let s = lerp(15, 8, t);
    let b = lerp(95, 88, t);
    stroke(h, s, b);
    line(0, y, width, y);
  }

  let time = frameCount * 0.01;

  // distant mountains
  noStroke();
  fill(250, 10, 80, 30);
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    vertex(x, height * 0.7 + noise(x * 0.002) * 100);
  }
  vertex(width, height);
  endShape(CLOSE);

  // branches
  for (let b of branches) {
    stroke(20, 30, 15, 80);
    strokeWeight(b.weight);
    strokeCap(ROUND);
    line(b.x1, b.y1, b.x2, b.y2);
  }

  // small blossoms on thin branches
  noStroke();
  for (let b of branches) {
    if (b.weight < 4) {
      let numFlowers = floor(random(1, 4));
      randomSeed(floor(b.x1 * 100 + b.y1));
      for (let i = 0; i < numFlowers; i++) {
        let t = random(0.3, 1);
        let fx = lerp(b.x1, b.x2, t);
        let fy = lerp(b.y1, b.y2, t);
        let fSize = random(5, 12);
        let breathe = sin(time * 2 + fx * 0.01) * 0.1 + 1;
        fill(350, 35, 95, 60);
        for (let p = 0; p < 5; p++) {
          let pa = (TWO_PI / 5) * p + time * 0.2;
          ellipse(
            fx + cos(pa) * fSize * 0.3 * breathe,
            fy + sin(pa) * fSize * 0.3 * breathe,
            fSize * 0.5 * breathe,
            fSize * 0.4 * breathe
          );
        }
        fill(45, 60, 95, 50);
        circle(fx, fy, fSize * 0.2);
      }
    }
  }
  randomSeed(frameCount);

  // wind effect
  let windX = sin(time * 0.5) * 0.5 + 1.2;
  let windY = cos(time * 0.7) * 0.3;

  // update and draw petals
  for (let p of petals) {
    p.swayPhase += p.swaySpeed;
    p.x += p.vx * windX + sin(p.swayPhase) * p.flutter;
    p.y += p.vy + cos(p.swayPhase * 1.3) * 0.3 + windY;
    p.rotation += p.rotSpeed;

    drawPetal(p.x, p.y, p.size, p.rotation, p.hue, p.sat, p.bright, p.alpha);

    // respawn
    if (p.x > width + 60 || p.y > height + 60 || p.x < -60) {
      p.x = random(-50, width * 0.3);
      p.y = random(-50, -10);
      p.vy = random(-0.3, 0.8);
    }
  }

  // add new petals occasionally
  if (random() < 0.3 && petals.length < 200) {
    spawnPetal();
    petals[petals.length - 1].x = random(-50, width * 0.4);
    petals[petals.length - 1].y = -10;
  }

  // soft bottom fog
  noStroke();
  for (let y = height - 60; y < height; y++) {
    let alpha = map(y, height - 60, height, 0, 20);
    fill(340, 5, 95, alpha);
    rect(0, y, width, 1);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  branches = [];
  generateBranch(width * 0.15, height * 0.5, -PI / 3, 120, 6);
  generateBranch(width * 0.85, height * 0.3, -PI * 0.7, 100, 5);
}`,
};

export default cherryBlossomWind;
