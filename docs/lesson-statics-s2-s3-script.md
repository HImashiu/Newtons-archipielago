# Statics S.2–S.3 — Inside a Beam

*Shear force, bending moment and their diagrams.* Implemented in
`src/lesson/s2/statics.js`. About 40 minutes, most of it hands-on.

## Why this lesson is built the way it is

The first prototype of Lesson 1 compressed a unit's worth of ideas into eight
minutes. University students meet shear and moment diagrams over one to two
lectures **plus** a problem set; the learning happens in the practice. This
lesson therefore follows the same five stages for every idea:

| Stage | Purpose | Evidence |
| --- | --- | --- |
| Introduce (watch) | One idea, shown in the drawing | Mayer: segmenting, signaling, coherence |
| Explore (do) | Manipulate it freely before formalising | Schwartz & Bransford, *A time for telling* |
| Worked example (paused at every step) | Show the full procedure | Sweller & Cooper; Renkl |
| Guided practice (faded) | Learner does the steps, with targeted feedback | Renkl & Atkinson, fading |
| Problem set with mastery | Varied problems until 4 correct in a row | Bloom, mastery learning; Rohrer, interleaving |

## Place in the curriculum

Statics unit · *Internal forces in beams* (Hibbeler, *Statics*, ch. 7;
Gross et al., *Technische Mechanik 1*, Balken):

S.1 Supports and reactions · **S.2 Method of sections** · **S.3 Shear and
moment diagrams (point loads)** · S.4 Distributed loads, dV/dx = −q,
dM/dx = V · S.5 Building diagrams with rule tiles (M ← M + V·Δx)

## Objectives

1. Find the support reactions of a simply supported beam.
2. Cut a beam and draw the free body of one piece with internal V and M.
3. Apply ΣF_y = 0 and ΣM = 0 about the cut, with the standard sign
   convention, and interpret a negative result.
4. Draw V(x) and M(x) for point loads; read the jump in V and the peak in M.
5. Use dM/dx = V (slope) and ΔM = area under V.

## Sign convention

On the right face of the left piece: positive **V** acts downward, positive
**M** is counter-clockwise (sagging, "a smile"). Both are drawn in their
positive directions; a negative answer means the real force points the
other way.

## Beats

| Ch. | Beat | Type | Content |
| --- | --- | --- | --- |
| 1 The beam | 1.1 | watch | Pin at A, roller at B, L = 6 m; F = 12 kN at 2 m |
| | 1.2 | watch + working | Reactions: ΣM_A → B_y = 4 kN, ΣF_y → A_y = 8 kN |
| | 1.3 | do | Drag the load toward B; reactions update live |
| 2 The cut | 2.1 | watch | Cut at x = 1.5 m; the right piece is set aside; V and M appear |
| | 2.2 | watch | Newton's third law on both faces; positive convention; sagging |
| 3 Explore | 3.1 | do | Drag the cut; live free body and V, M readouts |
| 4 Worked example | 4.1–4.3 | watch, paused | x = 1.5 m: free body → ΣF_y → ΣM about the cut |
| 5 Your turn | 5.1 | do (choice) | x = 4 m: which forces act on the left piece? |
| | 5.2 | do (number) | V = −4 kN, with feedback for sign errors |
| | 5.3 | do (number) | M = 8 kN·m, with feedback for a missing load term |
| 6 Diagrams | 6.1 | do | Drag the cut; each position leaves a mark on V and M axes |
| | 6.2 | watch | The full hatched diagrams; jump of F; peak of 16 kN·m |
| | 6.3 | watch | Slope of M equals V; peak where V changes sign; M = 0 at supports |
| | 6.4 | do (choice) | Where will the beam fail in bending? |
| | 6.5 | do | Move the load to maximise M_max → midspan, FL/4 |
| 7 Two loads | 7.1–7.3 | watch, paused | Symmetric loads; V = 0 between them; M by area under V |
| 8 Practice | — | do (set) | Generated problems: A_y, V at a cut, M at a cut, matching V diagram, M_max |
| 9 Summary | — | card | Four ideas; next: S.4 distributed loads |

## Practice set

Problems are generated (seeded) with L ∈ {4, 5, 6, 8} m, a load position on
a 0.5 m grid and F ∈ {6 … 20} kN. The first five cover each kind once
(interleaving), then kinds are mixed. Feedback:

- first wrong answer → a targeted hint;
- second wrong answer → the full worked solution in the working panel,
  streak reset, and a fresh problem;
- mastery = four correct in a row.

## Misconceptions addressed

| Misconception | Where |
| --- | --- |
| Forces on the far piece act on the near piece | 5.1 choice feedback (B_y is on the right piece) |
| A negative V is an error | 5.2 feedback: the sign is the direction |
| Only the reaction contributes to M | 5.3 feedback: the load turns the piece the other way |
| The beam fails at the supports | 6.4: at a pin or roller M = 0 |
| M is largest at midspan for any load | 6.4 / 6.5: it peaks under the load; midspan only when the load is there |
