import type { SketchExample } from '../sketchExamples';

const flockingBoids: SketchExample = {
  label: 'Flocking boids',
  prompt: 'Create a flocking simulation with boids following separation, alignment, and cohesion',
  code: `let boids = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 150; i++) {
    boids.push({
      pos: createVector(random(width), random(height)),
      vel: p5.Vector.random2D().mult(random(1, 3)),
      acc: createVector(),
    });
  }
}

function draw() {
  background(15, 20, 30);

  for (let b of boids) {
    let sep = createVector(), ali = createVector(), coh = createVector();
    let count = 0;
    for (let o of boids) {
      let d = p5.Vector.dist(b.pos, o.pos);
      if (o !== b && d < 50) {
        sep.add(p5.Vector.sub(b.pos, o.pos).div(d));
        ali.add(o.vel);
        coh.add(o.pos);
        count++;
      }
    }
    if (count > 0) {
      sep.div(count).setMag(2);
      ali.div(count).setMag(2);
      coh.div(count).sub(b.pos).setMag(1);
    }
    b.acc.set(0, 0).add(sep).add(ali.mult(0.5)).add(coh.mult(0.3));
    b.vel.add(b.acc).limit(4);
    b.pos.add(b.vel);

    if (b.pos.x < 0) b.pos.x = width;
    if (b.pos.x > width) b.pos.x = 0;
    if (b.pos.y < 0) b.pos.y = height;
    if (b.pos.y > height) b.pos.y = 0;

    let angle = b.vel.heading();
    push();
    translate(b.pos.x, b.pos.y);
    rotate(angle);
    noStroke();
    fill(180, 220, 255, 180);
    triangle(8, 0, -4, -3, -4, 3);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default flockingBoids;
