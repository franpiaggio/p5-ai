import type { SketchExample } from '../sketchExamples';

const voronoiDiagram: SketchExample = {
  label: 'Voronoi diagram',
  prompt: 'Create an animated Voronoi diagram with moving seed points',
  code: `let seeds = [];
const NUM = 20;
let pg;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(width / 4, height / 4);
  pg.pixelDensity(1);
  colorMode(HSB, 360, 100, 100);
  for (let i = 0; i < NUM; i++) {
    seeds.push({
      x: random(1), y: random(1),
      vx: random(-0.002, 0.002), vy: random(-0.002, 0.002),
      hue: (i / NUM) * 360,
    });
  }
  noSmooth();
}

function draw() {
  // Move seeds
  for (let s of seeds) {
    s.x += s.vx; s.y += s.vy;
    if (s.x < 0 || s.x > 1) s.vx *= -1;
    if (s.y < 0 || s.y > 1) s.vy *= -1;
  }

  pg.loadPixels();
  let w = pg.width, h = pg.height;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let nx = x / w, ny = y / h;
      let minD = Infinity, closest = 0;
      for (let i = 0; i < seeds.length; i++) {
        let d = (nx - seeds[i].x) ** 2 + (ny - seeds[i].y) ** 2;
        if (d < minD) { minD = d; closest = i; }
      }
      let c = color(seeds[closest].hue, 50, map(minD, 0, 0.1, 90, 30));
      let idx = (x + y * w) * 4;
      pg.pixels[idx] = red(c);
      pg.pixels[idx + 1] = green(c);
      pg.pixels[idx + 2] = blue(c);
      pg.pixels[idx + 3] = 255;
    }
  }
  pg.updatePixels();
  image(pg, 0, 0, width, height);

  // Draw seed points
  fill(255);
  noStroke();
  for (let s of seeds) ellipse(s.x * width, s.y * height, 5);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width / 4, height / 4);
  pg.pixelDensity(1);
}`,
};

export default voronoiDiagram;
