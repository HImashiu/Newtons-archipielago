# Scratch Physics

A progressive, block-programmable physics sandbox. Every scene is a live
simulation: drag objects, drag the tips of force and velocity arrows, edit
parameters, and program the world with Scratch-style blocks — the physics,
the drawings, the equations and the program all stay connected.

## Run it

No build step and no dependencies.

```sh
npm start          # serves the app at http://localhost:8080
npm test           # physics, expression-language and block-interpreter tests
```

Open a specific level with `?level=<id>`, e.g. `http://localhost:8080/?level=b6-forces`.

## Curriculum

| Tier | Status | Levels |
| --- | --- | --- |
| **Beginner** | ✅ available | B1 A point · B2 Objects · B3 Position · B4 Distance · B5 Motion · B6 Forces · B7 Gravity · B8 Playground |
| **Intermediate** | planned | vectors, coordinate frames, trajectories, collisions, springs, interacting bodies |
| **Advanced** | planned | planar engineering mechanisms (rigid bodies, rolling, linkages, spring–dampers, frames, equations of motion) in engineering-drawing style |

Visual complexity grows with the tier. Beginner scenes use a soft style with
plain-word labels ("push", "support", "weight") and only show what the
current idea needs: axes first appear in *Position*, force arrows in *Forces*.
The renderer already has the technical and drafting styles (hatching, pin
supports, dimensions, angle arcs, coordinate frames, title block) that later
tiers will use.

## How it fits together

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
