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

- **Biofísica · Unidad 2 (en español)** — biofísica cardiovascular y
  respiratoria, from the Universidad del Norte medicine course (weeks 7–11),
  in four lessons with worked clinical cases and mastery practice sets.
  Script and answer key: [`docs/biofisica-unidad-2-guion.md`](docs/biofisica-unidad-2-guion.md).
  - **B.1 Presión en los fluidos** (`#presion`): *P* = *F*/*A*, density,
    *P* = *P*₀ + *ρgh*, U-tube, Pascal, posture and blood pressure, PAM,
    pressure along the circuit, Korotkoff sounds.
  - **B.2 La pared del vaso** (`#pared`): stress and strain, compliance and
    distensibility, the aorta as a Windkessel, Laplace and aneurysms, pulse
    wave velocity, a concept-matching activity.
  - **B.3 Flujo, continuidad y Bernoulli** (`#flujo`): flow rate, continuity
    from aorta to capillaries, Venturi/Bernoulli, Reynolds number, viscosity
    and hematocrit.
  - **B.4 Resistencia y ley de Poiseuille** (`#poiseuille`): *Q* = Δ*P*/*R*,
    Poiseuille and the *r*⁴ cases (asthma, carotid and coronary stenosis),
    polycythemia, shock and selective vasoconstriction, series/parallel,
    Boyle's law for breathing.

## Run it

No build step and no dependencies.

```sh
npm start          # serves the app at http://localhost:8080
npm test           # physics, rule-tile, expression and interpreter tests
```

Then open http://localhost:8080. Jump to a chapter with `?chapter=<id>`
(`where`, `when`, `graphs`, `velocity`, `rule`, `challenge`, `summary`).

A lesson can also be chosen with a bare anchor: `#motion`, `#beam`, `#presion`,
`#pared`, `#flujo` or `#poiseuille`.

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
  bio/b1-presion.js … b4-poiseuille.js   the four Spanish biophysics lessons
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
