# Scratch Physics

Physics lessons that play like a film you can touch. Each lesson is drawn in
the visual language of engineering-mechanics figures (white paper, black
ink, Computer Modern), plays as a sequence of short narrated beats, and stops
whenever it is the learner's turn to predict, drag, build or run something.
Every drawing is a live, manipulable model, not an illustration.

Lessons so far (pick one from the header menu, or with `?lesson=`):

- **Lesson 1 — Describing Motion** (`?lesson=motion`): position, motion
  diagrams, position–time graphs, velocity as slope, and the update rule
  `x ← x + v·Δt`. Script: [`docs/lesson-01-script.md`](docs/lesson-01-script.md).
  To be split into a six-lesson unit with practice sets.
- **Statics S.2–S.3 — Inside a Beam** (`?lesson=beam`): method of sections,
  shear and moment diagrams, with worked examples, guided steps and a
  generated problem set that ends at four correct in a row. Script:
  [`docs/lesson-statics-s2-s3-script.md`](docs/lesson-statics-s2-s3-script.md).

- **Biofísica · Presión (en español)**: the Universidad del Norte medicine
  course, week 7, as five learner-paced lessons that build each idea from a
  question, an experiment or a guided derivation, fade worked examples into
  independent problems and end with mastery practice. Guide:
  [`docs/biofisica-presion-guion.md`](docs/biofisica-presion-guion.md).
  - **1.1 ¿Qué es la presión?** (`#presion`): discover *P* = *F*/*A* from a
    foam experiment you record yourself; needles, heels and bedsores.
  - **1.2 Presión y profundidad** (`#profundidad`): build *P* = *P*₀ + *ρgh*
    step by step, measure it, the hydrostatic paradox, faded examples.
  - **1.3 Medir la presión** (`#manometros`): Torricelli, where 133,3 Pa per
    mmHg comes from, manometers, Pascal, how the cuff works.
  - **1.4 La sangre y la gravedad** (`#gravedad`): posture, the hanging-arm
    measurement error, the causal chain of orthostatic hypotension, veins.
  - **1.5 Presión arterial** (`#arterial`): read the waveform, find the mean
    by balancing areas, take a reading with a deflating-cuff simulator.
- **Biofísica · La pared del vaso** (week 8): 2.1 elasticity and compliance
  (`#elasticidad`), 2.2 the aorta as a damper / Windkessel (`#amortiguador`),
  2.3 Laplace and pulse-wave velocity (`#laplace`).
- **Biofísica · Flujo** (week 9): 3.1 flow rate and continuity (`#caudal`),
  3.2 Bernoulli (`#bernoulli`), 3.3 laminar vs turbulent (`#regimen`).
- **Biofísica · Resistencia** (weeks 10–11): 4.1 Poiseuille (`#poiseuille`),
  4.2 series/parallel networks and hemorrhagic shock (`#redes`),
  4.3 breathing mechanics and Boyle (`#respiracion`).
  Every lesson follows the same teaching pattern: prediction → the learner's
  own measurements → derive the law from them → worked, semi-worked and
  independent clinical cases → practice to mastery. Script:
  [`docs/biofisica-pared-flujo-resistencia-guion.md`](docs/biofisica-pared-flujo-resistencia-guion.md).

## Run it

No build step and no dependencies.

```sh
npm start          # serves the app at http://localhost:8080
npm test           # physics, rule-tile, expression and interpreter tests
```

Then open http://localhost:8080. Jump to a chapter with `?chapter=<id>`
(`where`, `when`, `graphs`, `velocity`, `rule`, `challenge`, `summary`).

A lesson can also be chosen with a bare anchor, e.g. `#motion`, `#beam`,
`#presion` … `#arterial`, `#elasticidad` … `#respiracion`.

To package the player as a single shareable page (fonts embedded):
`node scripts/build-artifact.mjs dist/artifact`.
For one self-contained file that opens offline by double-click:
`node scripts/build-single.mjs scratch-physics.html`.

Controls: **Space** play/pause, **← / →** previous/next beat, **Enter**
continue. Drag on the timeline to scrub; click the drawing to pause.

The earlier free-form prototype (block editor and sandbox levels) is still
available at `sandbox.html`; it will be replaced by lesson-style content.

## Lesson 1 at a glance

| Ch. | Topic | What the learner does |
| --- | --- | --- |
| 1 | Where? | Drag the cart to x = 6 m; move the origin and watch x turn negative |
| 2 | When? | Watch a motion diagram build; **predict** where a faster cart will be, then see |
| 3 | Graphs | Snapshots drop onto a time axis, which rotates into the x–t graph; scrub time |
| 4 | How fast? | Slope triangles; drag a line to set v = −1.5 m/s; a misconception check |
| 5 | The rule | Build `x ← x + v·Δt` from unit-carrying tiles, test it, step through it |
| 6 | Your turn | Reach a flag on time; reach the origin with a negative velocity |

### Blocks, redesigned: rules, not commands

The tiles are not puppet commands. A rule says how a property changes in one
tick, and the simulation runs exactly the rule the learner builds. Every
tile is a quantity with a unit, and the editor does dimensional analysis live
("m + m/s: you can't add a position and a velocity"). Rules with the right
units but the wrong physics still run, so the learner sees the consequence
(the cart never moves, or runs away), then fixes the model. See section 4 of
the lesson script for how the rule language grows through the curriculum.

## Code map

```
src/lesson/
  core/player.js   timeline, beats (watch / do / card), camera moves, captions, input
  core/ink.js      drawing language: hatched ground, parts, dimensions, balloons, arrows
  core/anim.js     easing and timing helpers (watch beats are pure functions of time)
  core/scrub.js    scrubbable numbers
  rule.js          rule tiles: units, analysis, evaluation, consequence-aware judging
  l1/lesson1.js    Lesson 1, beat by beat
  l1/panel.js      object card, clock and rule editor
  core/tiles.js    shared tile editor (build / fill-in-the-blank / locked)
  core/workpanel.js  step-by-step working beside the drawing
  s2/beam.js       beam solver: reactions, V(x), M(x), diagram samples
  s2/statics.js    Statics S.2–S.3, including the generated practice set
  bio/kit.js       biophysics kit: Spanish UI and number format, tanks, gauges,
                   human figure, vessels with moving cells, plots, practice sets
  bio/hydro.js     tanks, columns, vessels of different shapes, the diver
  bio/p1-presion.js … p5-arterial.js   the «Presión» block (lessons 1.1–1.5)
  bio/scenes-*.js  drawings shared by the wall, flow and resistance blocks
  bio/q1…q3, r1…r3, s1…s3   lessons 2.1–4.3
src/physics/       XPBD engine used by the sandbox prototype (and later lessons)
docs/              lesson scripts
assets/fonts/      Computer Modern (CMU Serif) and Inter, both SIL OFL
```

## Sandbox prototype internals

```
src/
  core/        vec.js (2-D vectors), expr.js (safe expression language for block inputs)
  physics/     world.js — substepped XPBD engine: contacts with restitution and
               Coulomb friction (static + kinetic), springs/dampers, rods, sliders,
               motors; records every force in per-body free-body diagrams
  render/      painter.js (keyed SVG painter + camera), draft.js (drafting primitives),
               mathtext.js (math labels), scene.js (scene renderer driven by feature flags)
  blocks/      defs.js (block catalogue), editor.js (drag-and-drop editor),
               interpreter.js (Scratch-like threads that act on live physics)
  ui/          sim.js (run / pause / reset, goals), stage.js (manipulation tools),
               inspector.js, equations.js, plot.js, store.js (local progress)
  levels/      beginner.js, kit.js, index.js
```

- **What you see is what is simulated.** Force arrows are the engine's own
  free-body diagram averaged over the frame, so ΣF = m·a holds on screen.
  While stopped, a one-frame probe shows the forces that would act, so they
  can be inspected and dragged before pressing Run.
- **Setup vs. run.** Edits made while stopped change the setup; ▶ Run
  snapshots it and ↺ Reset restores it.
- **Blocks read live physics.** Inputs accept expressions such as
  `-20 * ball.x` or `sin(t)`; hovering a block highlights the objects it uses,
  and hovering an object highlights the blocks that use it.
- **Export SVG** downloads the current scene as a vector figure.
