import type { SketchExample } from '../sketchExamples';

const artisticSdfMetaballs: SketchExample = {
  label: 'Artistic SDF metaballs',
  prompt: 'Create artistic metaballs using Signed Distance Functions with contour rings',
  code: `let pg;
const RES = 200;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(RES, RES);
  pg.pixelDensity(1);
  noSmooth();
}

function draw() {
  let t = frameCount * 0.02;
  pg.loadPixels();

  for (let x = 0; x < RES; x++) {
    for (let y = 0; y < RES; y++) {
      let ux = (x - RES / 2) / RES;
      let uy = (y - RES / 2) / RES;

      let d = 1e10;
      for (let i = 0; i < 5; i++) {
        let cx = 0.25 * Math.cos(t + (i * TAU) / 5);
        let cy = 0.25 * Math.sin(t * 0.7 + (i * TAU) / 5);
        let r = 0.06 + 0.02 * Math.sin(t * 2 + i);
        let cd = Math.sqrt((ux - cx) ** 2 + (uy - cy) ** 2) - r;
        let h = Math.max(0.15 - Math.abs(d - cd), 0) / 0.15;
        d = Math.min(d, cd) - h * h * 0.15 * 0.25;
      }

      let ring = Math.abs(((d * 20 + t * 2) % 1) - 0.5) * 2;
      ring = ring * ring * (3 - 2 * ring);
      let inside = d < 0 ? 1 : 0.08;

      let idx = (x + y * RES) * 4;
      pg.pixels[idx] = (inside * 200 + ring * 55) | 0;
      pg.pixels[idx + 1] = (inside * 60 + ring * 30) | 0;
      pg.pixels[idx + 2] = (inside * 160 + ring * 70) | 0;
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

export default artisticSdfMetaballs;
