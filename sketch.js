function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
}

function draw() {
  background(30);

  const baseCell = 27;
  const cols = ceil(width / baseCell);
  const rows = ceil(height / baseCell);

  const occupied = Array.from({ length: rows }, () => new Array(cols).fill(false));

  noFill();
  stroke(255, 60);
  strokeWeight(1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue;

      const spanW = pickSpan(c, cols, frameCount * 0.003);
      const spanH = pickSpan(r, rows, frameCount * 0.003);

      let w = spanW;
      let h = spanH;
      while (c + w > cols) w--;
      while (r + h > rows) h--;

      let fits = true;
      for (let rr = r; rr < r + h && fits; rr++) {
        for (let cc = c; cc < c + w && fits; cc++) {
          if (occupied[rr][cc]) fits = false;
        }
      }

      if (!fits) {
        w = 1;
        h = 1;
      }

      for (let rr = r; rr < r + h; rr++) {
        for (let cc = c; cc < c + w; cc++) {
          occupied[rr][cc] = true;
        }
      }

      const x = c * baseCell;
      const y = r * baseCell;
      if (hashRand(c * 7.1 + r * 13.3) > 0.78) {
        fill(0, 85, 95);
      } else {
        noFill();
      }
      rect(x + 2, y + 2, w * baseCell - 4, h * baseCell - 4);
    }
  }
}

function pickSpan(idx, max, t) {
  const r = hashRand(idx);
  if (r > 0.65) return 3;
  if (r > 0.5) return 2;
  return 1;
}

function hashRand(i) {
  const x = sin(i * 12.9898) * 43758.5453;
  return x - floor(x);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}