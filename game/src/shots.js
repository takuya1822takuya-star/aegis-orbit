// Posed scenes for the screenshots in shots.json. A page opened with
// ?shot=<name>&seed=<n> renders one frozen scene instead of playing, so the
// maker's screenshots are real renders of the game that always come out the
// same: the title, two moments of play, and the game over screen.

import { CENTER_X, CENTER_Y, PLANET_MAX_HP } from './config.js';

/** Pose the named scene on a freshly reset world; returns the screen to show. */
export function poseShot(world, name) {
  if (name === 'play') {
    world.score = 1250;
    world.combo = 14;
    world.comboTimer = 3.5;
    world.hp = 76;
    world.wave = 3;
    world.pulse = 62;
    const near = world.addBody('rock', -2.25, 268, 90);
    world.addBody('orb', -0.85, 330, 70);
    world.addBody('rock', 0.75, 430, 96);
    world.addBody('breaker', 2.65, 540, 74);
    world.addBody('rock', 2.5, 380, 88);
    world.shieldAngle = Math.atan2(near.y - CENTER_Y, near.x - CENTER_X);
    world.burst(near.x, near.y, '#9a7d63', 10, 150);
    world.popup(near.x, near.y, '+100', '#eaf6ff');
    return 'playing';
  }

  if (name === 'frenzy') {
    world.score = 4820;
    world.combo = 41;
    world.comboTimer = 3.5;
    world.hp = 54;
    world.wave = 6;
    world.pulse = 100;
    const near = world.addBody('rock', 0.5, 250, 120);
    world.addBody('breaker', -2.3, 380, 92);
    const cracked = world.addBody('breaker', 2.2, 340, 84);
    cracked.cracked = true;
    cracked.hp = 1;
    world.addBody('rock', -2.9, 430, 118);
    world.addBody('orb', 0.95, 330, 84);
    world.addBody('repair', -0.4, 560, 62);
    world.addBody('rock', 3.05, 610, 110);
    world.addBody('orb', -2.6, 330, 78);
    world.shieldAngle = Math.atan2(near.y - CENTER_Y, near.x - CENTER_X);
    world.burst(near.x, near.y, '#54e0ff', 16, 190);
    world.popup(near.x, near.y, '+300', '#eaf6ff');
    return 'playing';
  }

  if (name === 'gameover') {
    world.score = 6930;
    world.finalScore = 6930;
    world.best = 6930;
    world.wave = 7;
    world.hp = 0;
    world.over = true;
    world.addBody('rock', -1.1, 380, 96);
    world.addBody('rock', 0.9, 520, 88);
    world.addBody('breaker', 2.8, 640, 72);
    world.addBody('orb', -2.6, 590, 70);
    world.shieldAngle = 2.4;
    world.burst(CENTER_X, CENTER_Y, '#7fe7d2', 40, 260);
    return 'over';
  }

  // 'title' and anything else: a calm field behind the title screen.
  world.hp = PLANET_MAX_HP;
  world.addBody('rock', -2.4, 520, 40);
  world.addBody('rock', 0.6, 640, 36);
  world.addBody('orb', 2.5, 470, 30);
  world.addBody('rock', 1.8, 720, 33);
  world.shieldAngle = -0.7;
  return 'title';
}
