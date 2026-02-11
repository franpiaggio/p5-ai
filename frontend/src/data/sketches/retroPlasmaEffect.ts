import type { SketchExample } from '../sketchExamples';

const retroPlasmaEffect: SketchExample = {
  label: 'Retro plasma effect',
  prompt: 'Create a colorful retro plasma effect animation',
  code: `let pg;
const RES = 160;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(RES, RES);
  pg.pixelDensity(1);
  noSmooth();
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  let t = frameCount * 0.03;
  pg.loadPixels();

  for (let x = 0; x < RES; x++) {
    for (let y = 0; y < RES; y++) {
      let v = sin(x * 0.08 + t);
      v += sin(y * 0.07 + t * 0.8);
      v += sin((x + y) * 0.05 + t * 0.6);
      v += sin(sqrt(x * x + y * y) * 0.06 + t);
      let hue = ((v * 45 + frameCount) % 360 + 360) % 360;

      let c = color(hue, 80, 90);
      let idx = (x + y * RES) * 4;
      pg.pixels[idx] = red(c);
      pg.pixels[idx + 1] = green(c);
      pg.pixels[idx + 2] = blue(c);
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

export default retroPlasmaEffect;
