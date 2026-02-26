import type { SketchExample } from '../sketchExamples';

const crystalCave3d: SketchExample = {
  label: 'Crystal cave 3D',
  prompt: 'Create a 3D WEBGL crystal cave with glowing translucent crystals, ambient light, and subtle fog',
  code: `let crystals = [];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < 60; i++) {
    let angle = random(TWO_PI);
    let dist = random(100, 400);
    let isFloor = random() < 0.5;
    crystals.push({
      x: cos(angle) * dist,
      z: sin(angle) * dist,
      y: isFloor ? random(100, 250) : random(-250, -100),
      height: random(40, 150),
      width: random(8, 25),
      hue: random([random(260, 300), random(170, 210), random(310, 340)]),
      rotY: random(TWO_PI),
      tilt: random(-0.2, 0.2),
      facets: floor(random(4, 8)),
      glow: random(0.3, 1),
      growthPhase: random(TWO_PI),
    });
  }
}

function drawCrystal(h, w, facets) {
  // crystal shaft
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i <= facets; i++) {
    let a = (TWO_PI / facets) * i;
    let x = cos(a) * w;
    let z = sin(a) * w;
    vertex(x, 0, z);
    vertex(x * 0.3, -h, z * 0.3);
  }
  endShape();

  // top point
  beginShape(TRIANGLE_FAN);
  vertex(0, -h * 1.15, 0);
  for (let i = 0; i <= facets; i++) {
    let a = (TWO_PI / facets) * i;
    vertex(cos(a) * w * 0.3, -h, sin(a) * w * 0.3);
  }
  endShape();

  // base
  beginShape(TRIANGLE_FAN);
  vertex(0, 0, 0);
  for (let i = 0; i <= facets; i++) {
    let a = (TWO_PI / facets) * i;
    vertex(cos(a) * w, 0, sin(a) * w);
  }
  endShape();
}

function draw() {
  background(250, 40, 5);

  let t = frameCount * 0.005;

  // camera slowly orbits
  let camAngle = t * 0.4;
  let camR = 350 + sin(t * 0.5) * 50;
  let camY = sin(t * 0.3) * 60;
  camera(
    cos(camAngle) * camR, camY, sin(camAngle) * camR,
    0, 0, 0,
    0, 1, 0
  );

  // ambient cave lighting
  ambientLight(30, 30, 50);
  pointLight(255, 200, 255, 0, -100, 0);
  pointLight(100, 150, 255, sin(t) * 200, 50, cos(t) * 200);

  // cave floor and ceiling (rough planes)
  push();
  noStroke();
  fill(250, 20, 10, 60);
  translate(0, 260, 0);
  rotateX(HALF_PI);
  circle(0, 0, 1000);
  pop();

  push();
  noStroke();
  fill(250, 25, 8, 50);
  translate(0, -260, 0);
  rotateX(HALF_PI);
  circle(0, 0, 1000);
  pop();

  // crystals
  for (let c of crystals) {
    push();
    translate(c.x, c.y, c.z);
    rotateY(c.rotY);
    rotateX(c.tilt);

    let pulse = sin(t * 2 + c.growthPhase) * 0.1 + 1;
    let h = c.height * pulse;

    // crystal glow underneath
    noStroke();
    let glowIntensity = (sin(t * 3 + c.growthPhase) + 1) * 0.5 * c.glow;

    // translucent crystal body
    fill(c.hue, 50, 70, 30 + glowIntensity * 20);
    specularMaterial(c.hue, 40, 80);
    shininess(80);
    drawCrystal(h, c.width, c.facets);

    // inner glow
    push();
    noStroke();
    fill(c.hue, 30, 100, 15 * glowIntensity);
    translate(0, -h * 0.4, 0);
    sphere(c.width * 0.6);
    pop();

    pop();
  }

  // floating light particles
  noStroke();
  for (let i = 0; i < 40; i++) {
    let px = sin(t + i * 7.3) * 300;
    let py = cos(t * 0.7 + i * 4.1) * 200;
    let pz = sin(t * 0.5 + i * 5.7) * 300;
    let alpha = (sin(t * 2 + i * 3) + 1) * 15;
    push();
    translate(px, py, pz);
    fill(280, 30, 100, alpha);
    sphere(2);
    pop();
  }

  // fog effect at edges
  push();
  noStroke();
  fill(250, 30, 10, 15);
  translate(0, 260, 0);
  rotateX(HALF_PI);
  for (let r = 400; r < 600; r += 20) {
    fill(250, 20, 10, map(r, 400, 600, 5, 30));
    circle(0, 0, r * 2);
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default crystalCave3d;
