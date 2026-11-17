// Aegis Orbit — the simulation: the planet, its shield, and everything that
// flies at them. This file owns the rules (spawning, collisions, scoring,
// waves, the pulse) and no drawing; render.js reads the state it keeps.

import {
  CENTER_X,
  CENTER_Y,
  COMBO_PER_STEP,
  COMBO_WINDOW,
  ORBIT_RADIUS,
  PLANET_MAX_HP,
  PLANET_RADIUS,
  PULSE_MAX,
  PULSE_PER_BLOCK,
  PULSE_PER_ORB,
  REPAIR_EVERY,
  REPAIR_HP,
  SHIELD_ARC,
  SHIELD_TURN_KEYBOARD,
  SHIELD_TURN_MOUSE,
} from './config.js';
import { angleDelta, mulberry32, range } from './random.js';

let nextId = 1;

/** One incoming body: a rock, a two-hit breaker, an energy orb or a repair core. */
function makeBody(kind, angle, dist, speed, rng) {
  const radius =
    kind === 'breaker' ? range(rng, 25, 33) : kind === 'rock' ? range(rng, 10, 19) : 10;
  const x = CENTER_X + Math.cos(angle) * dist;
  const y = CENTER_Y + Math.sin(angle) * dist;
  // Aim at the planet with a little jitter, so approaches are not all radial.
  const aim = Math.atan2(CENTER_Y - y, CENTER_X - x) + range(rng, -0.07, 0.07);
  const verts = [];
  const points = 9;
  for (let i = 0; i < points; i++) {
    verts.push(0.78 + rng() * 0.4);
  }
  return {
    id: nextId++,
    kind,
    x,
    y,
    vx: Math.cos(aim) * speed,
    vy: Math.sin(aim) * speed,
    radius,
    hp: kind === 'breaker' ? 2 : 1,
    cracked: false,
    rotation: rng() * Math.PI * 2,
    spin: range(rng, -1.4, 1.4),
    verts,
    phase: rng() * Math.PI * 2,
  };
}

export class World {
  constructor(sound) {
    this.sound = sound;
    this.reset(1);
  }

  reset(seed) {
    this.rng = mulberry32(seed);
    this.time = 0;
    this.hp = PLANET_MAX_HP;
    this.score = 0;
    this.best = this.best ?? 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.pulse = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0.8;
    this.repairTimer = range(this.rng, REPAIR_EVERY[0], REPAIR_EVERY[1]);
    this.shieldAngle = -Math.PI / 2;
    this.bodies = [];
    this.particles = [];
    this.popups = [];
    this.shockwave = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.banner = null;
    this.over = false;
    this.finalScore = 0;
  }

  get multiplier() {
    return Math.min(8, 1 + Math.floor(this.combo / COMBO_PER_STEP));
  }

  get pulseReady() {
    return this.pulse >= PULSE_MAX;
  }

  /** Spawn one body of a kind, from a direction at a distance; used by the spawner and the screenshot poses. */
  addBody(kind, angle, dist, speed) {
    const body = makeBody(kind, angle, dist, speed, this.rng);
    this.bodies.push(body);
    return body;
  }

  spawnInterval() {
    return Math.max(0.42, 1.35 - this.wave * 0.09) * range(this.rng, 0.75, 1.25);
  }

  spawnSpeed() {
    return 58 + this.wave * 11 + range(this.rng, 0, 26);
  }

  pickKind() {
    const roll = this.rng();
    const breakerChance = Math.min(0.05 + this.wave * 0.02, 0.22);
    if (roll < breakerChance) return 'breaker';
    if (roll < breakerChance + 0.16) return 'orb';
    return 'rock';
  }

  burst(x, y, color, count, speed = 130) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 420) return;
      const a = this.rng() * Math.PI * 2;
      const v = range(this.rng, speed * 0.25, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        maxLife: range(this.rng, 0.3, 0.75),
        color,
        size: range(this.rng, 1.5, 3.6),
      });
    }
  }

  popup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 0 });
  }

  addScore(base, x, y) {
    const gained = base * this.multiplier;
    this.score += gained;
    this.popup(x, y - 14, `+${gained}`, '#eaf6ff');
  }

  registerCatch() {
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
  }

  /** Fire the pulse shockwave, if charged: every rock on screen breaks. */
  firePulse() {
    if (!this.pulseReady || this.over) return false;
    this.pulse = 0;
    this.shockwave = 1;
    this.shake = Math.max(this.shake, 5);
    for (const body of this.bodies) {
      if (body.kind === 'rock' || body.kind === 'breaker') {
        body.hp = 0;
        this.score += 25 * this.multiplier;
        this.burst(body.x, body.y, '#54e0ff', 8, 170);
      }
    }
    this.bodies = this.bodies.filter((body) => body.hp > 0);
    this.sound.pulse();
    return true;
  }

  damagePlanet(body) {
    const damage = body.kind === 'breaker' ? 20 : Math.round(6 + body.radius * 0.55);
    this.hp = Math.max(0, this.hp - damage);
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = Math.min(16, 6 + damage * 0.5);
    this.hurtFlash = 1;
    this.burst(body.x, body.y, '#ff8a5e', 18, 190);
    this.popup(CENTER_X, CENTER_Y - PLANET_RADIUS - 26, `-${damage} HULL`, '#ff5d47');
    this.sound.hit();
    if (this.hp <= 0) {
      this.over = true;
      this.finalScore = this.score;
      this.best = Math.max(this.best, this.score);
      this.burst(CENTER_X, CENTER_Y, '#7fe7d2', 90, 300);
      this.burst(CENTER_X, CENTER_Y, '#ff8a5e', 60, 240);
      this.sound.gameOver();
    }
  }

  /** A body met the shield: block it, crack it, catch it or take its repair. */
  shieldTouch(body) {
    if (body.kind === 'rock') {
      body.hp = 0;
      this.registerCatch();
      this.pulse = Math.min(PULSE_MAX, this.pulse + PULSE_PER_BLOCK);
      this.addScore(50, body.x, body.y);
      this.burst(body.x, body.y, '#9a7d63', 10, 150);
      this.sound.block(this.combo);
    } else if (body.kind === 'breaker') {
      body.hp -= 1;
      this.registerCatch();
      if (body.hp <= 0) {
        this.pulse = Math.min(PULSE_MAX, this.pulse + PULSE_PER_BLOCK * 2);
        this.addScore(150, body.x, body.y);
        this.burst(body.x, body.y, '#9a7d63', 22, 200);
        this.sound.block(this.combo);
      } else {
        body.cracked = true;
        // Knock the breaker back out and slow it, so the player must meet it again.
        const away = Math.atan2(body.y - CENTER_Y, body.x - CENTER_X);
        body.x += Math.cos(away) * 52;
        body.y += Math.sin(away) * 52;
        body.vx *= 0.45;
        body.vy *= 0.45;
        this.addScore(25, body.x, body.y);
        this.burst(body.x, body.y, '#c9a582', 12, 160);
        this.sound.block(this.combo);
      }
    } else if (body.kind === 'orb') {
      body.hp = 0;
      this.registerCatch();
      this.pulse = Math.min(PULSE_MAX, this.pulse + PULSE_PER_ORB);
      this.addScore(30, body.x, body.y);
      this.burst(body.x, body.y, '#ffcf4d', 12, 140);
      this.sound.catchOrb();
    } else if (body.kind === 'repair') {
      body.hp = 0;
      this.hp = Math.min(PLANET_MAX_HP, this.hp + REPAIR_HP);
      this.score += 20;
      this.popup(body.x, body.y - 14, `+${REPAIR_HP} HULL`, '#5eff8a');
      this.burst(body.x, body.y, '#5eff8a', 14, 140);
      this.sound.repair();
    }
  }

  /** A friendly body reached the planet: orbs fizzle, repair cores dock and mend. */
  planetTouch(body) {
    if (body.kind === 'rock' || body.kind === 'breaker') {
      body.hp = 0;
      this.damagePlanet(body);
    } else if (body.kind === 'repair') {
      body.hp = 0;
      this.hp = Math.min(PLANET_MAX_HP, this.hp + REPAIR_HP);
      this.popup(CENTER_X, CENTER_Y - PLANET_RADIUS - 26, `+${REPAIR_HP} HULL`, '#5eff8a');
      this.burst(body.x, body.y, '#5eff8a', 12, 120);
      this.sound.repair();
    } else {
      body.hp = 0;
      this.burst(body.x, body.y, '#ffcf4d', 5, 80);
    }
  }

  /**
   * Advance the simulation. controls is { turn: -1..1, pointerAngle: number|null }:
   * the pointer wins while it is known, the keys always add their turn.
   */
  update(dt, controls) {
    this.time += dt;
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.shockwave > 0) this.shockwave = Math.max(0, this.shockwave - dt * 1.5);
    this.updateParticles(dt);
    this.updatePopups(dt);
    if (this.banner !== null) {
      this.banner.t += dt;
      if (this.banner.t > 1.8) this.banner = null;
    }
    if (this.over) return;

    // Shield movement.
    if (controls.pointerAngle !== null && controls.pointerAngle !== undefined) {
      const step = angleDelta(this.shieldAngle, controls.pointerAngle);
      const maxStep = SHIELD_TURN_MOUSE * dt;
      this.shieldAngle += Math.max(-maxStep, Math.min(maxStep, step));
    }
    if (controls.turn) {
      this.shieldAngle += controls.turn * SHIELD_TURN_KEYBOARD * dt;
    }

    // Combo cools off.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Waves.
    this.waveTimer += dt;
    if (this.waveTimer >= 22) {
      this.waveTimer = 0;
      this.wave += 1;
      this.banner = { text: `WAVE ${this.wave}`, t: 0 };
      this.sound.wave();
    }

    // Spawning.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval();
      this.addBody(this.pickKind(), this.rng() * Math.PI * 2, 790, this.spawnSpeed());
    }
    this.repairTimer -= dt;
    if (this.repairTimer <= 0) {
      this.repairTimer = range(this.rng, REPAIR_EVERY[0], REPAIR_EVERY[1]);
      this.addBody('repair', this.rng() * Math.PI * 2, 790, 62);
    }

    // Bodies fly, spin, and meet the shield or the planet.
    for (const body of this.bodies) {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rotation += body.spin * dt;
      const dx = body.x - CENTER_X;
      const dy = body.y - CENTER_Y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const onShieldBand = Math.abs(dist - ORBIT_RADIUS) <= body.radius + 9;
      const shieldHalf = SHIELD_ARC / 2 + Math.asin(Math.min(1, body.radius / ORBIT_RADIUS));
      if (onShieldBand && Math.abs(angleDelta(this.shieldAngle, ang)) <= shieldHalf) {
        this.shieldTouch(body);
        continue;
      }
      if (dist <= PLANET_RADIUS + body.radius * 0.5) {
        this.planetTouch(body);
      }
    }
    this.bodies = this.bodies.filter((body) => body.hp > 0);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  updatePopups(dt) {
    for (const p of this.popups) {
      p.life += dt;
      p.y -= 34 * dt;
    }
    this.popups = this.popups.filter((p) => p.life < 0.95);
  }
}
