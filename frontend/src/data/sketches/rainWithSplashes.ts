import type { SketchExample } from '../sketchExamples';

const rainWithSplashes: SketchExample = {
  label: 'Rain in a forest',
  prompt: 'Create a rain animation with depth of field over a procedural forest',
  code: `let drops = [];
let splashes = [];
let trees;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  trees = createGraphics(width, height);
  trees.colorMode(HSB, 360, 100, 100, 100);
  drawForest();

  for (let i = 0; i < 400; i++) {
    drops.push({
      x: random(width),
      y: random(-height, height),
      z: random(0, 1),
      vel: random(4, 10),
      len: random(10, 30),
      weight: random(1, 3),
      hue: random(200, 230),
      sat: random(50, 80)
    });
  }
}

function drawForest() {
  trees.background(220, 30, 8);

  trees.noStroke();
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      let n = noise(x * 0.005, y * 0.005);
      let alpha = map(n, 0, 1, 0, 15);
      trees.fill(180, 20, 30, alpha);
      trees.rect(x, y, 4, 4);
    }
  }

  for (let i = 0; i < 25; i++) {
    let x = random(width);
    drawFullTree(x, 0.2);
  }

  for (let i = 0; i < 15; i++) {
    let x = random(width);
    drawFullTree(x, 0.55);
  }

  for (let i = 0; i < 8; i++) {
    let x = random(width);
    drawFullTree(x, 1);
  }
}

function drawFullTree(x, proximity) {
  let baseWidth = map(proximity, 0.2, 1, 8, 35);
  let topWidth = baseWidth * 0.3;

  let visibleHeight = height + random(50, 200);

  let hue = 25 + random(-10, 10);
  let sat = map(proximity, 0.2, 1, 15, 35);
  let bri = map(proximity, 0.2, 1, 12, 25);
  let alpha = map(proximity, 0.2, 1, 40, 95);

  let blur = map(proximity, 0.2, 1, 5, 1);

  let segments = floor(visibleHeight / 15);
  let currentX = x;
  let currentWidth = baseWidth;

  for (let s = 0; s < segments; s++) {
    let y1 = height - (s * 15);
    let y2 = height - ((s + 1) * 15);

    let progress = s / segments;
    currentWidth = lerp(baseWidth, topWidth, progress);

    let noiseVal = noise(x * 0.01, s * 0.1) - 0.5;
    let irregularity = noiseVal * map(proximity, 0.2, 1, 3, 12);
    let nextX = x + irregularity;

    for (let b = 0; b < blur; b++) {
      let offsetX = random(-blur, blur) * (1 - proximity);
      let alphaBlur = alpha / (b * 0.5 + 1);

      trees.stroke(hue + random(-5, 5), sat, bri + random(-3, 3), alphaBlur);
      trees.strokeWeight(currentWidth);
      trees.line(currentX + offsetX, y1, nextX + offsetX, y2);
    }

    if (proximity > 0.4 && random() > 0.6) {
      let numLines = floor(map(proximity, 0.4, 1, 1, 4));
      for (let t = 0; t < numLines; t++) {
        let tx = currentX + random(-currentWidth * 0.4, currentWidth * 0.4);
        let tLen = random(10, 30);
        trees.stroke(hue, sat + 5, bri - 5, alpha * 0.5);
        trees.strokeWeight(random(0.5, 2));
        trees.line(tx, y1, tx + random(-2, 2), y1 - tLen);
      }
    }

    if (random() > 0.92 && proximity > 0.3) {
      let knotX = currentX + random(-currentWidth * 0.3, currentWidth * 0.3);
      let knotSize = random(3, 8) * proximity;
      trees.noStroke();
      trees.fill(hue - 5, sat + 10, bri - 5, alpha * 0.7);
      trees.ellipse(knotX, y1, knotSize * 1.5, knotSize);
    }

    if (y1 < height * 0.85 && random() > 0.7) {
      let side = random() > 0.5 ? 1 : -1;
      let branchAngle = side * random(0.3, 0.9) - PI/2;
      let branchLen = random(20, 80) * proximity;
      drawBranch(currentX, y1, branchAngle, branchLen, 4, proximity);
    }

    currentX = nextX;
  }

  if (proximity > 0.3) {
    drawCanopy(x, -random(20, 100), proximity);
  }
}

function drawBranch(x, y, angle, len, depth, proximity) {
  if (depth <= 0 || len < 3) return;

  let jitter = map(proximity, 0.2, 1, 6, 2);
  let blur = map(proximity, 0.2, 1, 4, 1);

  let endX = x + cos(angle) * len + random(-jitter, jitter);
  let endY = y + sin(angle) * len + random(-jitter, jitter);

  let hue = 25 + noise(x * 0.01, y * 0.01) * 15;
  let sat = map(proximity, 0.2, 1, 12, 30);
  let bri = map(proximity, 0.2, 1, 15, 28);
  let alpha = map(proximity, 0.2, 1, 30, 90);

  for (let b = 0; b < blur; b++) {
    let offsetX = random(-blur, blur) * (1 - proximity);
    let alphaBlur = alpha / (b * 0.5 + 1);

    trees.stroke(hue, sat, bri, alphaBlur);
    trees.strokeWeight(map(depth, 1, 4, 0.5, proximity * 4));
    trees.line(x + offsetX, y, endX + offsetX, endY);
  }

  if (depth <= 2) {
    let numLeaves = floor(map(proximity, 0.2, 1, 8, 4));
    for (let h = 0; h < numLeaves; h++) {
      let hx = endX + random(-12, 12);
      let hy = endY + random(-12, 12);
      let leafSize = map(proximity, 0.2, 1, 2, 6);

      trees.noStroke();
      let leafHue = map(proximity, 0.2, 1, 160, 120) + random(-20, 20);
      let leafAlpha = map(proximity, 0.2, 1, 15, 50);
      trees.fill(leafHue, sat + 20, bri + 20, leafAlpha);
      trees.ellipse(hx, hy, leafSize, leafSize * 0.7);
    }
  }

  if (depth > 1) {
    let noiseFactor = noise(x * 0.02, y * 0.02);
    let angleVar = map(noiseFactor, 0, 1, 0.3, 0.6);
    let lenFactor = random(0.6, 0.75);

    drawBranch(endX, endY, angle - angleVar, len * lenFactor, depth - 1, proximity);
    drawBranch(endX, endY, angle + angleVar, len * lenFactor, depth - 1, proximity);
  }
}

function drawCanopy(x, y, proximity) {
  let numClusters = floor(map(proximity, 0.2, 1, 15, 8));
  let blur = map(proximity, 0.2, 1, 6, 2);

  for (let i = 0; i < numClusters; i++) {
    let mx = x + random(-60, 60) * proximity;
    let my = y + random(-50, 80);
    let size = random(15, 40) * proximity;

    let hue = map(proximity, 0.2, 1, 165, 125) + random(-15, 15);
    let sat = map(proximity, 0.2, 1, 15, 45);
    let bri = map(proximity, 0.2, 1, 18, 35);
    let alpha = map(proximity, 0.2, 1, 20, 60);

    trees.noStroke();
    for (let b = 0; b < blur; b++) {
      let alphaBlur = alpha / (b * 0.4 + 1);
      trees.fill(hue, sat, bri, alphaBlur);
      trees.ellipse(
        mx + random(-blur * 2, blur * 2),
        my + random(-blur * 2, blur * 2),
        size + random(-5, 5),
        size * 0.8 + random(-5, 5)
      );
    }
  }
}

function draw() {
  image(trees, 0, 0);

  fill(220, 30, 8, 20);
  noStroke();
  rect(0, 0, width, height);

  drops.sort((a, b) => a.z - b.z);

  for (let drop of drops) {
    let scale = map(drop.z, 0, 1, 0.3, 1.5);
    let alpha = map(drop.z, 0, 1, 20, 90);
    let blur = map(drop.z, 0, 1, 8, 1);
    let finalVel = drop.vel * scale;
    let brightness = map(drop.vel, 4, 10, 40, 80);

    for (let b = 0; b < blur; b++) {
      let offsetX = random(-blur, blur);
      let alphaBlur = alpha / (b + 1);
      stroke(drop.hue, drop.sat, brightness, alphaBlur);
      strokeWeight(drop.weight * scale);
      line(drop.x + offsetX, drop.y, drop.x + offsetX, drop.y + drop.len * scale);
    }

    drop.y += finalVel;

    if (drop.y > height) {
      let numSplashes = floor(map(drop.z, 0, 1, 2, 6));
      for (let j = 0; j < numSplashes; j++) {
        splashes.push({
          x: drop.x,
          y: height,
          z: drop.z,
          vx: random(-2, 2) * scale,
          vy: random(-3, -1) * scale,
          life: 255,
          size: random(2, 4) * scale,
          hue: drop.hue
        });
      }
      drop.y = random(-100, -10);
      drop.x = random(width);
      drop.z = random(0, 1);
      drop.hue = random(200, 230);
      drop.sat = random(50, 80);
    }
  }

  noStroke();
  for (let i = splashes.length - 1; i >= 0; i--) {
    let s = splashes[i];
    let alpha = map(s.life, 0, 255, 0, 80) * s.z;
    let blur = map(s.z, 0, 1, 5, 1);

    for (let b = 0; b < blur; b++) {
      let alphaBlur = alpha / (b + 1);
      fill(s.hue, 60, 70, alphaBlur);
      ellipse(s.x + random(-blur, blur), s.y + random(-blur, blur), s.size);
    }

    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.15;
    s.life -= 8;

    if (s.life <= 0) {
      splashes.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  trees = createGraphics(width, height);
  trees.colorMode(HSB, 360, 100, 100, 100);
  drawForest();
}`,
};

export default rainWithSplashes;
