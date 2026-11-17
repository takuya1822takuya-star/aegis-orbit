// Aegis Orbit — entry program for make.fun's best-game-01 (Node 22, standard library only).
//
// The game itself is the static site in game/: plain files a desktop browser opens offline,
// no build step and no network request. This program hands it in. It copies game/ and
// screenshots/ from beside this file into the output directory and writes dossier.json
// there with the vendored make.fun library (vendor/makefun-game.ts, the kit's copy,
// unchanged), which is the summary the judge reads.
//
// Run it the way the grader does, or locally with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (its gate): text_max_bytes shapes the dossier text, and the
// rest make this program refuse exactly what the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 entries or 48 MiB under game/, or a path
// under game/ longer than 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
