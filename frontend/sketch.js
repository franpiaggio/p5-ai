let points = [];
let horizontalLinks, verticalLinks;
const COLS = 25, ROWS = 30, REST = 18, GRAV = 0.3, DAMP = 0.98;

function setup() {
  createCanvas(windowWidth, windowHeight);
  horizontalLinks = new Uint8Array((COLS - 1) * ROWS);
  verticalLinks = new Uint8Array(COLS * (ROWS - 1));
  let ox = (width - COLS * REST) / 2, oy = 60;
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      points.push({
        x: ox + i * REST, y: oy + j * REST,
        ox: ox + i * REST, oy: oy + j * REST,
        pinned: j === 0 && i % 4 === 0,
      });
    }
  }
}

function pt(i, j) { return points[j * COLS + i]; }

function draw() {
  drawBackgroundPattern();

  // Verlet integration
  for (let p of points) {
    if (p.pinned) continue;
    let vx = (p.x - p.ox) * DAMP;
    let vy = (p.y - p.oy) * DAMP + GRAV;
    p.ox = p.x; p.oy = p.y;
    p.x += vx; p.y += vy;
  }

  // Constraints
  for (let k = 0; k < 3; k++) {
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        let a = pt(i, j);
        if (i < COLS - 1 && !horizontalLinks[j * (COLS - 1) + i]) {
          solve(a, pt(i + 1, j));
        }
        if (j < ROWS - 1 && !verticalLinks[j * COLS + i]) {
          solve(a, pt(i, j + 1));
        }
      }
    }
  }

  cutAtMouse();

  // Render - verde esmeralda
  stroke(80, 200, 120);
  strokeWeight(1);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      let a = pt(i, j);
      if (i < COLS - 1 && !horizontalLinks[j * (COLS - 1) + i]) {
        let b = pt(i + 1, j);
        line(a.x, a.y, b.x, b.y);
      }
      if (j < ROWS - 1 && !verticalLinks[j * COLS + i]) {
        let b = pt(i, j + 1);
        line(a.x, a.y, b.x, b.y);
      }
    }
  }
}

function drawBackgroundPattern() {
  background(8, 20, 16);
  strokeWeight(1);
  const spacing = 40;
  for (let y = -spacing; y < height + spacing; y += spacing) {
    for (let x = -spacing; x < width + spacing; x += spacing) {
      const offset = (floor(y / spacing) % 2) * spacing * 0.5;
      stroke(30, 75, 58, 75);
      noFill();
      rect(x + offset, y, spacing, spacing);
      line(x + offset, y, x + offset + spacing, y + spacing);
    }
  }
}

function cutAtMouse() {
  const cutRadiusSquared = 100;
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      let a = pt(i, j);
      if (i < COLS - 1) {
        let index = j * (COLS - 1) + i;
        if (!horizontalLinks[index] &&
            segmentDistanceSquared(mouseX, mouseY, a, pt(i + 1, j)) < cutRadiusSquared) {
          horizontalLinks[index] = 1;
        }
      }
      if (j < ROWS - 1) {
        let index = j * COLS + i;
        if (!verticalLinks[index] &&
            segmentDistanceSquared(mouseX, mouseY, a, pt(i, j + 1)) < cutRadiusSquared) {
          verticalLinks[index] = 1;
        }
      }
    }
  }
}

function segmentDistanceSquared(x, y, a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 :
    constrain(((x - a.x) * dx + (y - a.y) * dy) / lengthSquared, 0, 1);
  let nearestX = a.x + t * dx;
  let nearestY = a.y + t * dy;
  let offsetX = x - nearestX;
  let offsetY = y - nearestY;
  return offsetX * offsetX + offsetY * offsetY;
}

function solve(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let d = sqrt(dx * dx + dy * dy);
  let diff = (d - REST) / d * 0.5;
  if (!a.pinned) { a.x += dx * diff; a.y += dy * diff; }
  if (!b.pinned) { b.x -= dx * diff; b.y -= dy * diff; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
