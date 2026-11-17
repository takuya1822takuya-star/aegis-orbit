// Aegis Orbit — every pixel. The renderer reads the world's state and draws
// it: the starfield, the planet, the shield ring, the incoming bodies, the
// HUD and the title / pause / game-over screens. It keeps no game rules.

import {
  CENTER_X,
  CENTER_Y,
  COLORS,
  ORBIT_RADIUS,
  PLANET_MAX_HP,
  PLANET_RADIUS,
  PULSE_MAX,
  SHIELD_ARC,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { mulberry32 } from './random.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    // A fixed starfield: three depths, generated once from a fixed seed.
    const rng = mulberry32(20240);
    this.stars = [];
    for (let i = 0; i < 190; i++) {
      const layer = i % 3;
      this.stars.push({
        x: rng() * VIEW_WIDTH,
        y: rng() * VIEW_HEIGHT,
        r: 0.7 + layer * 0.55 + rng() * 0.5,
        layer,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  /** Draw one frame. screen is 'title', 'playing', 'paused' or 'over'. */
  draw(world, screen, now) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this.drawBackground(now);
    this.drawOrbitRing();
    if (world.shockwave > 0) this.drawShockwave(world);
    this.drawBodies(world, now);
    this.drawPlanet(world, now);
    this.drawShield(world, now);
    this.drawParticles(world);
    this.drawPopups(world);
    ctx.restore();

    if (screen !== 'title') this.drawHud(world, now);
    if (world.banner !== null && screen === 'playing') this.drawBanner(world);
    if (screen === 'title') this.drawTitle(world, now);
    if (screen === 'paused') this.drawPaused();
    if (screen === 'over') this.drawGameOver(world, now);
  }

  drawBackground(now) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, COLORS.spaceTop);
    sky.addColorStop(1, COLORS.spaceBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    for (const [x, y, r, color] of [
      [240, 150, 330, COLORS.nebulaViolet],
      [1060, 560, 380, COLORS.nebulaTeal],
      [1080, 110, 240, COLORS.nebulaViolet],
    ]) {
      const blob = ctx.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, color);
      blob.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blob;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (const star of this.stars) {
      const drift = (now * (2 + star.layer * 3)) % VIEW_WIDTH;
      const x = (star.x + drift) % VIEW_WIDTH;
      const twinkle = 0.45 + 0.4 * Math.sin(now * (1 + star.layer) + star.phase);
      ctx.globalAlpha = Math.max(0.08, twinkle);
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawOrbitRing() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 200, 235, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 9]);
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawShockwave(world) {
    const ctx = this.ctx;
    const t = 1 - world.shockwave;
    ctx.save();
    ctx.globalAlpha = world.shockwave * 0.75;
    ctx.strokeStyle = COLORS.shield;
    ctx.lineWidth = 3 + world.shockwave * 6;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS + t * 600, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawBodies(world, now) {
    for (const body of world.bodies) {
      if (body.kind === 'orb') this.drawOrb(body, now);
      else if (body.kind === 'repair') this.drawRepair(body, now);
      else this.drawRock(body);
    }
  }

  drawRock(body) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.rotation);
    ctx.beginPath();
    const n = body.verts.length;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = body.radius * body.verts[i];
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = COLORS.rock;
    ctx.fill();
    ctx.strokeStyle = COLORS.rockDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Two craters, fixed to the rock so they turn with it.
    ctx.fillStyle = COLORS.rockDark;
    for (const [ox, oy, or] of [
      [-0.3, -0.2, 0.22],
      [0.28, 0.3, 0.16],
    ]) {
      ctx.beginPath();
      ctx.arc(body.radius * ox, body.radius * oy, body.radius * or, 0, Math.PI * 2);
      ctx.fill();
    }
    if (body.cracked) {
      ctx.strokeStyle = COLORS.rockCrack;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-body.radius * 0.7, -body.radius * 0.4);
      ctx.lineTo(-body.radius * 0.1, 0);
      ctx.lineTo(-body.radius * 0.3, body.radius * 0.55);
      ctx.moveTo(-body.radius * 0.1, 0);
      ctx.lineTo(body.radius * 0.5, body.radius * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawOrb(body, now) {
    const ctx = this.ctx;
    const pulse = 1 + 0.16 * Math.sin(now * 5 + body.phase);
    const r = body.radius * pulse;
    const glow = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, r * 2.6);
    glow.addColorStop(0, 'rgba(255, 207, 77, 0.85)');
    glow.addColorStop(0.4, 'rgba(255, 207, 77, 0.28)');
    glow.addColorStop(1, 'rgba(255, 207, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(body.x, body.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(body.x, body.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRepair(body, now) {
    const ctx = this.ctx;
    const pulse = 1 + 0.12 * Math.sin(now * 4 + body.phase);
    const r = body.radius * pulse;
    const glow = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, r * 2.4);
    glow.addColorStop(0, 'rgba(94, 255, 138, 0.7)');
    glow.addColorStop(1, 'rgba(94, 255, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(body.x, body.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d3a1e';
    ctx.beginPath();
    ctx.arc(body.x, body.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.repair;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#eafff0';
    const w = r * 0.28;
    ctx.fillRect(body.x - w / 2, body.y - r * 0.62, w, r * 1.24);
    ctx.fillRect(body.x - r * 0.62, body.y - w / 2, r * 1.24, w);
  }

  drawPlanet(world, now) {
    const ctx = this.ctx;
    // Atmosphere.
    const halo = ctx.createRadialGradient(CENTER_X, CENTER_Y, PLANET_RADIUS, CENTER_X, CENTER_Y, PLANET_RADIUS * 2.1);
    halo.addColorStop(0, 'rgba(64, 200, 190, 0.30)');
    halo.addColorStop(1, 'rgba(64, 200, 190, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Body, lit from the upper left.
    const body = ctx.createRadialGradient(
      CENTER_X - 20, CENTER_Y - 24, 8,
      CENTER_X, CENTER_Y, PLANET_RADIUS + 6,
    );
    body.addColorStop(0, COLORS.planetLight);
    body.addColorStop(0.55, COLORS.planetMid);
    body.addColorStop(1, COLORS.planetDark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Slow cloud bands, clipped to the disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    for (let i = 0; i < 3; i++) {
      const y = CENTER_Y - 30 + i * 26;
      const shift = Math.sin(now * 0.14 + i * 2.1) * 16;
      ctx.beginPath();
      ctx.ellipse(CENTER_X + shift, y, PLANET_RADIUS * 0.92, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cracks once the hull is low.
    if (world.hp < 40 && world.hp > 0) {
      ctx.strokeStyle = 'rgba(20, 24, 30, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CENTER_X - 30, CENTER_Y - 34);
      ctx.lineTo(CENTER_X - 8, CENTER_Y - 8);
      ctx.lineTo(CENTER_X - 20, CENTER_Y + 18);
      ctx.moveTo(CENTER_X - 8, CENTER_Y - 8);
      ctx.lineTo(CENTER_X + 18, CENTER_Y + 2);
      ctx.lineTo(CENTER_X + 26, CENTER_Y + 30);
      ctx.stroke();
    }
    ctx.restore();

    // The flash of the latest impact, and the grey of a fallen planet.
    if (world.hurtFlash > 0) {
      ctx.globalAlpha = world.hurtFlash * 0.4;
      ctx.fillStyle = COLORS.planetHurt;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (world.over) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#3a4149';
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, PLANET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawShield(world, now) {
    const ctx = this.ctx;
    const ready = world.pulseReady;
    const color = ready ? COLORS.shieldReady : COLORS.shield;
    const width = ready ? 11 + Math.sin(now * 7) * 2 : 11;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, world.shieldAngle - SHIELD_ARC / 2, world.shieldAngle + SHIELD_ARC / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, ORBIT_RADIUS, world.shieldAngle - SHIELD_ARC / 2, world.shieldAngle + SHIELD_ARC / 2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(world) {
    const ctx = this.ctx;
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = 'center';
    for (const p of world.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / 0.95);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  drawHud(world, now) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'top';

    // Score and combo, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText('SCORE', 28, 20);
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(String(world.score).padStart(6, '0'), 28, 38);
    if (world.combo > 1) {
      const hot = world.multiplier > 1;
      ctx.fillStyle = hot ? COLORS.orb : COLORS.textDim;
      ctx.font = `800 20px ${FONT}`;
      ctx.fillText(`COMBO x${world.multiplier}`, 28, 78);
      ctx.fillStyle = 'rgba(255, 207, 77, 0.5)';
      ctx.fillRect(28, 104, 110 * Math.max(0, world.comboTimer / 3.5), 4);
    }

    // Wave and hull, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(`WAVE ${world.wave}`, CENTER_X, 20);
    const barW = 340;
    const barX = CENTER_X - barW / 2;
    const frac = world.hp / PLANET_MAX_HP;
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, 42, barW, 14);
    const hull = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hull.addColorStop(0, '#ff5d47');
    hull.addColorStop(0.5, '#ffb84d');
    hull.addColorStop(1, '#5eff8a');
    ctx.fillStyle = hull;
    ctx.fillRect(barX + 2, 44, (barW - 4) * frac, 10);
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 12px ${FONT}`;
    ctx.fillText(`HULL ${Math.ceil(world.hp)}`, CENTER_X, 62);

    // Best, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText('BEST', VIEW_WIDTH - 28, 20);
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(String(Math.max(world.best, world.score)).padStart(6, '0'), VIEW_WIDTH - 28, 38);

    // Pulse meter, bottom centre.
    const pulseW = 300;
    const pulseX = CENTER_X - pulseW / 2;
    const ready = world.pulseReady;
    ctx.textAlign = 'center';
    if (ready) {
      ctx.fillStyle = COLORS.shieldReady;
      ctx.font = `800 17px ${FONT}`;
      if (Math.sin(now * 6) > -0.4) ctx.fillText('PULSE READY — SPACE', CENTER_X, VIEW_HEIGHT - 58);
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = `700 12px ${FONT}`;
      ctx.fillText('PULSE', CENTER_X, VIEW_HEIGHT - 58);
    }
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.35)';
    ctx.strokeRect(pulseX, VIEW_HEIGHT - 34, pulseW, 8);
    ctx.fillStyle = ready ? COLORS.shieldReady : COLORS.shield;
    ctx.fillRect(pulseX + 1.5, VIEW_HEIGHT - 32.5, (pulseW - 3) * (world.pulse / PULSE_MAX), 5);

    // Controls, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(143, 180, 201, 0.75)';
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillText('MOUSE or ← →  move shield · SPACE pulse · P pause · M sound', 28, VIEW_HEIGHT - 32);
    ctx.restore();
  }

  drawBanner(world) {
    const ctx = this.ctx;
    const t = world.banner.t;
    const alpha = t < 0.25 ? t / 0.25 : t > 1.4 ? Math.max(0, (1.8 - t) / 0.4) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 46px ${FONT}`;
    ctx.shadowColor = COLORS.shield;
    ctx.shadowBlur = 24;
    ctx.fillText(world.banner.text, CENTER_X, 150);
    ctx.restore();
  }

  drawTitle(world, now) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 16, 0.42)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';

    ctx.fillStyle = COLORS.text;
    ctx.font = `800 88px ${FONT}`;
    ctx.shadowColor = COLORS.shield;
    ctx.shadowBlur = 34;
    ctx.fillText('AEGIS ORBIT', CENTER_X, 128);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.shield;
    ctx.font = `700 25px ${FONT}`;
    ctx.fillText('S H I E L D   T H E   P L A N E T', CENTER_X, 218);

    ctx.fillStyle = COLORS.text;
    ctx.font = `600 19px ${FONT}`;
    const lines = [
      'Swing the shield around the planet with your mouse or the ← → keys.',
      'Block the falling rocks — the big cracked ones take two hits.',
      'Catch gold orbs to charge the PULSE, then fire it with SPACE to clear the sky.',
      'Green cores mend the hull. If the hull reaches zero, the planet falls.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, CENTER_X, 470 + i * 30));

    if (Math.sin(now * 3.4) > -0.3) {
      ctx.fillStyle = COLORS.orb;
      ctx.font = `800 23px ${FONT}`;
      ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', CENTER_X, 640);
    }
    ctx.restore();
  }

  drawPaused() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 16, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText('PAUSED', CENTER_X, 320);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('Press P to resume', CENTER_X, 386);
    ctx.restore();
  }

  drawGameOver(world, now) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 16, 0.5)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';

    ctx.fillStyle = COLORS.danger;
    ctx.font = `800 56px ${FONT}`;
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 26;
    ctx.fillText('THE PLANET HAS FALLEN', CENTER_X, 120);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.text;
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText(`SCORE ${world.finalScore}`, CENTER_X, 520);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `700 21px ${FONT}`;
    ctx.fillText(`BEST ${world.best} · REACHED WAVE ${world.wave}`, CENTER_X, 566);

    if (Math.sin(now * 3.4) > -0.3) {
      ctx.fillStyle = COLORS.orb;
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText('CLICK OR PRESS ENTER TO TRY AGAIN', CENTER_X, 636);
    }
    ctx.restore();
  }
}
