import type { SketchExample } from '../sketchExamples';

const selfPlayingPong: SketchExample = {
  label: 'Self-playing Pong',
  prompt: 'Create a self-playing Pong game with AI paddles and score',
  code: `let ball, padL, padR;
let scoreL = 0, scoreR = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetBall();
  padL = { y: height / 2, w: 12, h: 80 };
  padR = { y: height / 2, w: 12, h: 80 };
}

function resetBall() {
  ball = {
    x: width / 2,
    y: height / 2,
    vx: random([-5, 5]),
    vy: random(-3, 3),
    r: 8,
  };
}

function draw() {
  background(0);

  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.y < ball.r || ball.y > height - ball.r) ball.vy *= -1;

  // AI paddles
  padL.y = lerp(padL.y, ball.y, 0.04);
  padR.y = lerp(padR.y, ball.y, 0.06);

  let padLx = 30;
  let padRx = width - 30;

  // Paddle collision
  if (ball.x - ball.r < padLx + padL.w / 2 && abs(ball.y - padL.y) < padL.h / 2) {
    ball.vx = abs(ball.vx) * 1.02;
    ball.vy += (ball.y - padL.y) * 0.08;
  }
  if (ball.x + ball.r > padRx - padR.w / 2 && abs(ball.y - padR.y) < padR.h / 2) {
    ball.vx = -abs(ball.vx) * 1.02;
    ball.vy += (ball.y - padR.y) * 0.08;
  }

  // Speed cap
  ball.vx = constrain(ball.vx, -12, 12);
  ball.vy = constrain(ball.vy, -8, 8);

  // Scoring
  if (ball.x < 0) { scoreR++; resetBall(); }
  if (ball.x > width) { scoreL++; resetBall(); }

  // Draw center line
  stroke(255, 40);
  strokeWeight(1);
  for (let y = 0; y < height; y += 20) line(width / 2, y, width / 2, y + 10);

  // Draw paddles and ball
  noStroke();
  fill(255);
  rectMode(CENTER);
  rect(padLx, padL.y, padL.w, padL.h, 4);
  rect(padRx, padR.y, padR.w, padR.h, 4);
  ellipse(ball.x, ball.y, ball.r * 2);

  // Score
  textAlign(CENTER);
  textSize(48);
  textFont('monospace');
  fill(255, 80);
  text(scoreL, width / 2 - 60, 70);
  text(scoreR, width / 2 + 60, 70);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}`,
};

export default selfPlayingPong;
