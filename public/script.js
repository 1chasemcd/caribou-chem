// Prevent scroll
function preventDefault(e) {
    e.preventDefault();
}

document.body.addEventListener('touchmove', preventDefault,
{ passive: false });


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const protonCharge = 1; // C
const protonMass = 1000; // kg
const electronCharge = -1; // C
const electronMass = 1; // kg
const protonRadius = 15;
const electronRadius = 5;
const snfDist = 15; // Distance at which strong nuclear force holds particles

const k = 1000; // Coulombs law constant

const protonColor = '#5070ff';
const neutronColor = '#20cccc';
const electronColor = '#882020';

// ---------------------------------------------------------------------------
// Particle Superclass
// ---------------------------------------------------------------------------

class Particle {
  constructor(pos) {
    this.pos = createVector(pos.x, pos.y, pos.z);
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
  }

  updateAcc() {
      var a = createVector(0, 0, 0);
      for (var other of ps.particles) {
        if (other != this) {
          a.add(this.getAcc(other));
        }
      }
      this.acc = a;
  }

  updatePos() {
    this.vel.add(this.acc);

    this.pos.add(this.vel);
    var preLimitPos = createVector();
    preLimitPos.set(this.pos);

    this.pos.limit(min(width, height) / 2);

    if (!preLimitPos.equals(this.pos)) {
      this.vel.set(0, 0, 0);
    }
  }

  draw() {
    fill(this.color);
    coordSphere(this.pos.x, this.pos.y, this.pos.z, this.radius);
  }

  // Method to get acceleration based on Newton's 2nd law
  // F = ma
  getAcc(other) {
    var force = this.getForce(other);
    var mag = force / this.mass;

    var dir = p5.Vector.sub(this.pos, other.pos);
    dir.normalize();

    var a = dir.mult(mag);
    return a;
  }

  // Method to get force applied to particle based on coulombs law
  // F = k|q1q2 / r^2|
  getForce(other) {
    var r = this.pos.dist(other.pos);
    var force = 0;
    if (this.mass == protonMass && other.mass == protonMass) {
      if (r > 2 * snfDist) {
        force = (k * this.charge * other.charge) /
          ((r - 2 * snfDist)*(r - 2 * snfDist));

      } else {
        force = -0.1 * k * Math.tan(Math.PI * (r - snfDist) / (2 * snfDist));
      }
    } else {
      force = (k * this.charge * other.charge) / (r*r);
    }
    return force;
  }
}

// ---------------------------------------------------------------------------
// Subatomic Particles
// ---------------------------------------------------------------------------

class Proton extends Particle {
  constructor(pos) {
    super(pos);
    this.color = color(protonColor);
    this.charge = protonCharge;
    this.mass = protonMass;
    this.radius = protonRadius;
  }
}

class Neutron extends Particle {
  constructor(pos) {
    super(pos);
    this.color = color(neutronColor);
    this.charge = 0;
    this.mass = protonMass;
    this.radius = protonRadius;
  }
}

class Electron extends Particle {
  constructor(pos) {
    super(pos);
    this.color = color(electronColor);
    this.charge = electronCharge;
    this.mass = electronMass;
    this.radius = electronRadius;
  }
}

// ---------------------------------------------------------------------------
// GUI
// ---------------------------------------------------------------------------

class GUI {
  constructor() {
    this.selected = 'pan';
    var ui = document.getElementById('gui').children;
    var left = ui[0].children;
    var right = ui[1].children;

    this.radios = {'proton': left[0],
      'neutron': left[1],
      'electron': left[2],
      'pan': right[3],
      'move': right[2]};
    this.buttons = {'pause': right[1], 'clear': right[0]};
  }

  getClick(clicked) {
    if (clicked in this.radios) {
      this.radios[this.selected].classList.remove('selected');
      this.radios[clicked].classList.add('selected');
      this.selected = clicked;

    } else if (clicked in this.buttons) {
      if (clicked == 'clear') {
        ps.particles = [];

      } else if (clicked == 'pause') {
        if (ps.running) {
          this.buttons['pause'].firstElementChild.src = 'icons/play.png';

        } else {
          this.buttons['pause'].firstElementChild.src = 'icons/pause.png';
        }

        ps.running = !ps.running;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Mouse
// ---------------------------------------------------------------------------

class Mouse {
  constructor() {
    this.radius = 50;
    this.pos = createVector();
    this.firstClick = null;
    this.prevAngle = createVector();
  }

  update() {
    var zyPos = createVector(0, mouseY - height/2);
    zyPos.rotate(-ps.cameraAngle.y);

    var xzPos = createVector(mouseX - width/2, zyPos.x);
    xzPos.rotate(ps.cameraAngle.x);

    this.pos.set(xzPos.x, zyPos.y, xzPos.y);

    if (mouseIsPressed && gui.selected == 'move') {
      noFill();
      stroke(255);
      strokeWeight(3);
      ellipse(mouseX - width/2, mouseY - height/2,
        this.radius*2, this.radius*2);
      noStroke();

    } else if (mouseIsPressed && gui.selected == 'pan') {
      if (this.firstClick == null) {
        this.firstClick = createVector(mouseX, mouseY);
        this.prevAngle.set(ps.cameraAngle);
      }

      ps.cameraAngle.set((mouseX - this.firstClick.x) / 100,
        (mouseY - this.firstClick.y) / 100);
      ps.cameraAngle.add(this.prevAngle);
    } else if (!mouseIsPressed) {
      this.firstClick = null;
    }
  }

  inMouse(particle) {
    return particle.pos.dist(new PVector(mX, mY)) <= radius &&
           mouseIsPressed && gui.selected == 'mouse';
  }

  setPos() {
    return new PVector(mouse - pmX, mY - pmY);
  }
}

// ---------------------------------------------------------------------------
// Particle System
// ---------------------------------------------------------------------------

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.running = true;
    this.cameraAngle = createVector(0, 0);
    this.justPressed = false;
  }

  update() {
    rotateX(-this.cameraAngle.y);
    rotateY(this.cameraAngle.x);
    this.placeParticle();

    if (this.running) {
      for (var particle of this.particles) {
        particle.updateAcc();
      }

      for (var particle of this.particles) {
        particle.updatePos();
      }
    }

    this.draw();
  }

  draw() {
    for (var particle of this.particles) {
      particle.draw();
    }
  }

  placeParticle() {
    var inCircle = createVector(mouseX - width/2, mouseY - height/2).mag()
      < min(width, height) / 2;

    if (mouseIsPressed && !this.justPressed && inCircle) {
      this.justPressed = true;

      if (gui.selected == 'proton') {
        this.particles.push(new Proton(mouse.pos));

      } else if (gui.selected == 'neutron') {
        this.particles.push(new Neutron(mouse.pos));

      } else if (gui.selected == 'electron') {
        this.particles.push(new Electron(mouse.pos));
      }

    } else if (!mouseIsPressed) {
      this.justPressed = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

var ps;
var canvas;
var gui;
var mouse;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent('canvasholder');
  noStroke();

  ps = new ParticleSystem();
  gui = new GUI();
  mouse = new Mouse();
}

function draw() {
  background(0);
  lights();
  mouse.update();
  ps.update();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function coordSphere(x, y, z, r) {
  push();
  translate(x, y, z);
  sphere(r);
  pop();
}
