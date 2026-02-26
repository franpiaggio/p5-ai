import type { SketchExample } from '../sketchExamples';

const infinityMirror3d: SketchExample = {
  label: 'Infinity mirror room 3D',
  prompt: 'Create a Kusama-inspired 3D infinity mirror room with floating colorful dots and endless reflections',
  code: `let dots = [];
let roomSize = 300;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);

  // floating dots inside the room
  for (let i = 0; i < 80; i++) {
    dots.push({
      x: random(-roomSize * 0.8, roomSize * 0.8),
      y: random(-roomSize * 0.8, roomSize * 0.8),
      z: random(-roomSize * 0.8, roomSize * 0.8),
      size: random(5, 20),
      hue: random(360),
      speed: createVector(
        random(-0.3, 0.3),
        random(-0.3, 0.3),
        random(-0.3, 0.3)
      ),
      pulse: random(TWO_PI),
    });
  }
}

function drawMirrorWall(reflections, axis) {
  for (let r = 0; r < reflections; r++) {
    let offset = (r + 1) * roomSize * 2;
    let fade = map(r, 0, reflections, 80, 10);

    push();
    if (axis === 'x') translate(offset, 0, 0);
    else if (axis === '-x') translate(-offset, 0, 0);
    else if (axis === 'z') translate(0, 0, offset);
    else if (axis === '-z') translate(0, 0, -offset);

    // draw reflected dots
    for (let d of dots) {
      let dx = d.x, dy = d.y, dz = d.z;
      if (axis === 'x' || axis === '-x') dx = -dx;
      if (axis === 'z' || axis === '-z') dz = -dz;
      if (r % 2 === 0) {
        if (axis === 'x' || axis === '-x') dx = -dx;
        if (axis === 'z' || axis === '-z') dz = -dz;
      }

      let pulse = sin(frameCount * 0.02 + d.pulse) * 0.2 + 1;
      noStroke();
      fill(d.hue, 70, 80, fade * pulse * 0.5);
      push();
      translate(dx, dy, dz);
      sphere(d.size * pulse * 0.8);
      pop();
    }
    pop();
  }
}

function draw() {
  background(0, 0, 2);

  let t = frameCount * 0.005;

  // gentle camera movement inside the room
  let camX = sin(t * 0.7) * 80;
  let camY = sin(t * 0.5) * 40;
  let camZ = cos(t * 0.3) * 80;
  let lookX = sin(t * 0.2) * 100;
  let lookZ = cos(t * 0.4) * 100;
  camera(camX, camY, camZ, lookX, 0, lookZ, 0, 1, 0);

  ambientLight(20);

  // update dots
  for (let d of dots) {
    d.x += d.speed.x;
    d.y += d.speed.y;
    d.z += d.speed.z;
    d.pulse += 0.02;
    d.hue = (d.hue + 0.1) % 360;

    // bounce off walls
    if (abs(d.x) > roomSize * 0.8) d.speed.x *= -1;
    if (abs(d.y) > roomSize * 0.8) d.speed.y *= -1;
    if (abs(d.z) > roomSize * 0.8) d.speed.z *= -1;
  }

  // draw main room dots
  for (let d of dots) {
    let pulse = sin(frameCount * 0.02 + d.pulse) * 0.2 + 1;

    // glow
    push();
    translate(d.x, d.y, d.z);
    noStroke();

    // outer glow
    fill(d.hue, 60, 90, 10);
    sphere(d.size * pulse * 2);

    // dot body
    fill(d.hue, 70, 90, 80);
    sphere(d.size * pulse);

    // bright center
    fill(d.hue, 20, 100, 90);
    sphere(d.size * pulse * 0.4);
    pop();
  }

  // mirror reflections (simulate infinity)
  let reflections = 4;
  drawMirrorWall(reflections, 'x');
  drawMirrorWall(reflections, '-x');
  drawMirrorWall(reflections, 'z');
  drawMirrorWall(reflections, '-z');

  // room walls (semi-transparent dark panels)
  noStroke();
  fill(0, 0, 5, 15);

  // floor
  push();
  translate(0, roomSize, 0);
  rotateX(HALF_PI);
  plane(roomSize * 2, roomSize * 2);
  pop();

  // ceiling
  push();
  translate(0, -roomSize, 0);
  rotateX(HALF_PI);
  plane(roomSize * 2, roomSize * 2);
  pop();

  // floor dots (polka dot pattern)
  push();
  translate(0, roomSize - 1, 0);
  rotateX(HALF_PI);
  noStroke();
  for (let x = -roomSize; x <= roomSize; x += 40) {
    for (let z = -roomSize; z <= roomSize; z += 40) {
      let dotHue = (x * 0.5 + z * 0.5 + t * 30) % 360;
      if (dotHue < 0) dotHue += 360;
      fill(dotHue, 60, 50, 20);
      circle(x, z, 15);
    }
  }
  pop();

  // ceiling dots
  push();
  translate(0, -roomSize + 1, 0);
  rotateX(HALF_PI);
  noStroke();
  for (let x = -roomSize; x <= roomSize; x += 40) {
    for (let z = -roomSize; z <= roomSize; z += 40) {
      let dotHue = (x * 0.3 + z * 0.7 + t * 20) % 360;
      if (dotHue < 0) dotHue += 360;
      fill(dotHue, 60, 50, 15);
      circle(x, z, 12);
    }
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default infinityMirror3d;
