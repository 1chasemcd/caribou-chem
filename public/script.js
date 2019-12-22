// Prevent scroll
function preventDefault(e)
{
    e.preventDefault();
}

document.body.addEventListener('touchmove', preventDefault, { passive: false });


// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const protonCharge = 1.6021766e-19; // C
const protonMass = 1.6726219e-27; // kg
const electronCharge = -1.6021766e-19; // C
const electronMass = 9.10938356e-31; // kg
const neutronMass = 1.674929e-27; // kg

const k = 9.0e9; // Coulombs law constant

const size = 5e-10; // size of space in pm

const protonColor = '#5070ff';
const neutronColor = '#20cccc';
const electronColor = '#882020';

// ----------------------------------------------------------------------------
// Particle Superclass
// ----------------------------------------------------------------------------

class Particle
{
  constructor(pos)
  {
    this.pos = createVector(pos.x, pos.y, pos.z);
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
  }

  updateAcc()
  {
    var a = createVector(0, 0, 0);
    for (var other of ps.particles)
    {
      if (other != this)
      {
        a.add(this.getAcc(other));
      }
    }
    this.acc = a;
  }

  updatePos()
  {
    this.vel.add(this.acc);

    this.pos.add(this.vel);
    var preLimitPos = createVector();
    preLimitPos.set(this.pos);

    this.pos.limit(size / 2);

    if (!preLimitPos.equals(this.pos))
    {
      this.vel.set(0, 0, 0);
    }
  }

  draw()
  {
    fill(this.color);
    coordSphere(this.pos.x, this.pos.y, this.pos.z, 8);
  }

  // Method to get acceleration based on Newton's 2nd law
  // F = ma
  getAcc(other)
  {
    var force = this.getForce(other);
    var mag = force / this.mass;

    var dir = p5.Vector.sub(this.pos, other.pos);
    dir.normalize();

    var a = dir.mult(mag);
    return a;
  }

  // Method to get force applied to particle based on coulombs law
  // F = k|q1q2 / r^2|
  getForce(other)
  {
    var r = this.pos.dist(other.pos);
    var force = (k * this.charge * other.charge) / (r*r);
    return force;
  }
}

// ----------------------------------------------------------------------------
// Subatomic Particles
// ----------------------------------------------------------------------------

class Proton extends Particle
{
  constructor(pos)
  {
    super(pos);
    this.color = color(protonColor);
    this.charge = protonCharge;
    this.mass = protonMass;
  }
}

class Neutron extends Particle
{
  constructor(pos)
  {
    super(pos);
    this.color = color(neutronColor);
    this.charge = 0;
    this.mass = neutronMass;
  }
}

class Electron extends Particle
{
  constructor(pos)
  {
    super(pos);
    this.color = color(electronColor);
    this.charge = electronCharge;
    this.mass = electronMass;
  }

  draw()
  {
    fill(this.color);
    coordSphere(this.pos.x, this.pos.y, this.pos.z, 2);
  }
}

// ----------------------------------------------------------------------------
// GUI
// ----------------------------------------------------------------------------

class GUI
{
  constructor()
  {
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

  getClick(clicked)
  {
    if (clicked in this.radios)
    {
      this.radios[this.selected].classList.remove('selected');
      this.radios[clicked].classList.add('selected');
      this.selected = clicked;
    }
    else if (clicked in this.buttons)
    {
      if (clicked == 'clear')
      {
        ps.particles = [];
      }
      else if (clicked == 'pause')
      {
        if (ps.running)
        {
          this.buttons['pause'].firstElementChild.src = 'icons/play.png';
        }
        else {
          this.buttons['pause'].firstElementChild.src = 'icons/pause.png';
        }

        ps.running = !ps.running;
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Mouse
// ----------------------------------------------------------------------------

class Mouse
{
  constructor()
  {
    this.radius = 50;
    this.pos3d = createVector();
    this.pos2d = createVector();
    this.firstClick = null;
    this.prevAngle = createVector();
  }

  update()
  {
    var zyPos = createVector(0, mouseY - height/2);
    zyPos.rotate(-ps.cameraAngle.y);

    var xzPos = createVector(mouseX - width/2, zyPos.x);
    xzPos.rotate(ps.cameraAngle.x);

    this.pos3d = pxTopm(createVector(xzPos.x, zyPos.y, xzPos.y));
    this.pos2d = createVector(mouseX - width/2, mouseY - height/2);

    if (mouseIsPressed && gui.selected == 'move')
    {
      noFill();
      stroke(255);
      strokeWeight(3);
      ellipse(this.pos2d.x, this.pos2d.y, this.radius*2, this.radius*2);
      noStroke();
    }
    else if (mouseIsPressed && gui.selected == 'pan')
    {
      if (this.firstClick == null)
      {
        this.firstClick = createVector().set(this.pos2d);
        this.prevAngle.set(ps.cameraAngle);
      }

      ps.cameraAngle.set((mouseX - this.firstClick.x) / 100,
        (mouseY - this.firstClick.y) / 100);
      ps.cameraAngle.add(this.prevAngle);
    }
    else if (!mouseIsPressed)
    {
      this.firstClick = null;
    }
  }

  inMouse(particle)
  {
    return particle.pos.dist(new PVector(mX, mY)) <= radius &&
           mouseIsPressed && gui.selected == 'mouse';
  }

  setPos()
  {
    return new PVector(mouse - pmX, mY - pmY);
  }
}

// ----------------------------------------------------------------------------
// Particle System
// ----------------------------------------------------------------------------

class ParticleSystem
{
  constructor()
  {
    this.particles = [];
    this.running = true;
    this.cameraAngle = createVector(0, 0);
    this.justPressed = false;
  }

  update()
  {
    rotateX(-this.cameraAngle.y);
    rotateY(this.cameraAngle.x);

    this.placeParticle();

    if (this.running)
    {
      for (var particle of this.particles)
      {
        particle.updateAcc();
      }

      for (var particle of this.particles)
      {
        particle.updatePos();
      }
    }
    this.draw();
  }

  draw()
  {
    for (var particle of this.particles)
    {
      particle.draw();
    }
  }

  placeParticle()
  {
    var inCircle = createVector(mouseX - width/2, mouseY - height/2).mag()
      < min(width, height) / 2;
    if (mouseIsPressed && !this.justPressed && inCircle)
    {
      this.justPressed = true;
      if (gui.selected == 'proton')
      {
        this.particles.push(new Proton(mouse.pos));
      }
      else if (gui.selected == 'neutron')
      {
        this.particles.push(new Neutron(mouse.pos));
      }
      else if (gui.selected == 'electron')
      {
        this.particles.push(new Electron(mouse.pos));
      }
    }
    else if (!mouseIsPressed)
    {
      this.justPressed = false;
    }
  }
}

// ----------------------------------------------------------------------------
// Manager
// ----------------------------------------------------------------------------

var ps;
var canvas;
var gui;
var mouse;

function setup()
{
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent('canvasholder');
  noStroke();

  ps = new ParticleSystem();
  gui = new GUI();
  mouse = new Mouse();
}

function draw()
{
  background(0);
  lights();
  mouse.update();
  ps.update();
}

function windowResized()
{
  resizeCanvas(windowWidth, windowHeight);
}

function coordSphere(x, y, z, r)
{
  push();
  translate(x, y, z);
  sphere(r);
  pop();
}

function pxTopm(pos)
{
  return p5.Vector.div(pos, min(width, height)).mult(size);
}

function pmTopx(pos)
{
  return p5.Vector.div(pos, size).mult(min(width, height));
}
