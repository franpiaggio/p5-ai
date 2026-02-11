import type { SketchExample } from '../sketchExamples';

const waveInterferencePattern: SketchExample = {
  label: 'Wave interference pattern',
  prompt: 'Create a colorful wave interference pattern with multiple sources',
  code: `let pg;
const RES = 250;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(RES, RES);
  pg.pixelDensity(1);
  noSmooth();
}

function draw() {
  let t = frameCount * 0.04;
  pg.loadPixels();

  for (let x = 0; x < RES; x++) {
    for (let y = 0; y < RES; y++) {
      let nx = x / RES;
      let ny = y / RES;

      let d1 = dist(nx, ny, 0.3, 0.35) * RES;
      let d2 = dist(nx, ny, 0.7, 0.65) * RES;
      let d3 = dist(nx, ny, 0.5 + cos(t) * 0.12, 0.5 + sin(t) * 0.12) * RES;

      let v = sin(d1 * 0.12 - t * 2) + sin(d2 * 0.12 - t * 1.5) + sin(d3 * 0.15 - t * 2.5);
      v = (v + 3) / 6;

      let idx = (x + y * RES) * 4;
      pg.pixels[idx] = lerp(10, 80, v);
      pg.pixels[idx + 1] = lerp(15, 140, v);
      pg.pixels[idx + 2] = lerp(50, 230, v);
      pg.pixels[idx + 3] = 255;
    }
  }

  pg.updatePixels();
  image(pg, 0, 0, width, height);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default waveInterferencePattern;
