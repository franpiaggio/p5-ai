import type { SketchExample } from '../sketchExamples';

const matrixDigitalRain: SketchExample = {
  label: 'Matrix digital rain',
  prompt: 'Create the Matrix digital rain effect with falling green characters',
  code: `let streams = [];
const SIZE = 16;

function setup() {
  createCanvas(windowWidth, windowHeight);
  let cols = ceil(width / SIZE);
  for (let i = 0; i < cols; i++) {
    streams.push({
      x: i * SIZE,
      y: random(-500, 0),
      speed: random(3, 10),
      chars: Array.from({ length: floor(random(10, 30)) }, () => randomChar()),
    });
  }
  textFont('monospace');
  textSize(SIZE);
}

function randomChar() {
  return String.fromCharCode(0x30A0 + floor(random(96)));
}

function draw() {
  background(0, 40);

  for (let s of streams) {
    for (let i = 0; i < s.chars.length; i++) {
      let cy = s.y - i * SIZE;
      if (cy < -SIZE || cy > height + SIZE) continue;
      let alpha = map(i, 0, s.chars.length, 255, 30);
      if (i === 0) {
        fill(180, 255, 180);
      } else {
        fill(0, alpha, 0);
      }
      noStroke();
      text(s.chars[i], s.x, cy);
    }

    s.y += s.speed;
    if (s.y - s.chars.length * SIZE > height) {
      s.y = random(-300, -50);
      s.speed = random(3, 10);
    }
    if (random() < 0.03) s.chars[floor(random(s.chars.length))] = randomChar();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default matrixDigitalRain;
