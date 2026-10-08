# Lesson 1 — Describing Motion

*Position · Time · Velocity* — the first lesson of the Scratch Physics mechanics sequence.
This script is the design source for the lesson: every beat below is implemented in
`src/lesson/lesson1.js`.

---

## 1. Where this sits in the curriculum

Scratch Physics follows the order used in calculus-based university mechanics
(Knight, *Physics for Scientists and Engineers*, ch. 1–2; Halliday–Resnick ch. 2) and
continues into engineering dynamics and analytical mechanics (Meriam & Kraige; Gross,
Hauger, Schröder & Wall, *Technische Mechanik 3*), where the advanced figures come from.

| Stage | Lessons | Endpoint |
| --- | --- | --- |
| Kinematics 1-D | **1 Describing motion** · 2 Acceleration · 3 Free fall | x(t), v(t), a(t) and their graphs |
| Dynamics | 4 Force & mass · 5 Newton's laws · 6 Friction & normal force · 7 Springs | ΣF = ma as a rule the learner writes |
| 2-D & energy | vectors, frames, projectiles, work–energy, momentum, collisions | multiple frames, conservation laws |
| Rigid bodies | rotation, torque, rolling, linkages, spring–dampers | planar mechanisms in engineering-drawing style |
| Analytical | generalized coordinates, Lagrange's equations, M(q)q̈ + h = Q | the reference figure: rolling disc in a circular track |

## 2. Learning objectives

By the end of the lesson the learner can:

1. State a **position** as a signed number with a unit, measured from a chosen origin.
2. Explain why a position depends on the origin, but the motion does not.
3. Read and predict a **motion diagram** (equal time steps, so the spacing shows speed).
4. Translate between a motion diagram and a **position–time graph**.
5. Find **velocity as the slope** Δx/Δt, including its sign (direction).
6. Write the motion as an **update rule**, x ← x + v·Δt, and check it with units.

## 3. Teaching method

| Principle | Source | How the lesson uses it |
| --- | --- | --- |
| Predict → observe → explain | Sokoloff & Thornton, *Interactive Lecture Demonstrations* | Learners commit to a prediction (placing dots) before the motion is revealed. |
| Interactive engagement | Hake 1998 (6 000 students; about 2× FCI gains) | Every chapter ends with something to do, not something to read. |
| Segmenting, signaling, coherence, contiguity | Mayer, *Multimedia Learning* | Short beats, one idea each; labels sit on the drawing; nothing on screen that the beat does not use; the learner controls the pace. |
| Multiple linked representations | Van Heuvelen; Knight | The same motion as cart, motion diagram, graph and rule, linked live. |
| Misconceptions as distractors | Beichner, *TUG-K* (1994) | "Crossing lines mean equal speed" and "the graph is a picture of the path" are confronted directly. |
| Computational modelling | Chabay & Sherwood, *Matter & Interactions*; Hestenes, Modeling Instruction | The learner writes the rule the simulation actually runs. |
| Productive failure | Kapur | Wrong-but-valid rules run, and their consequences are shown, not just marked wrong. |

## 4. Rethinking the blocks — "rules, not commands"

The first prototype used Scratch-style command blocks (`set velocity of cart to 2`).
Those make the learner a puppeteer: the program *replaces* the physics instead of
expressing it. The redesign keeps the idea of composing with tiles, but changes what
the tiles mean.

1. **Blocks are laws.** A rule says how a property changes over one tick of the clock:
   `x ← x + v·Δt`. The simulation runs exactly the rule the learner built, every frame.
   This is the computational-modelling approach used in university courses
   (*Matter & Interactions*), made visual.
2. **Every tile is a quantity with a unit.** `x` is metres, `v` is metres per second,
   `Δt` is seconds. The editor does dimensional analysis as tiles are placed:
   `x + v` is refused with "m + m/s — you can't add a position and a velocity".
   Units become a thinking tool, not a footnote.
3. **Wrong physics still runs.** `x ← v·Δt` has the right unit but the cart "forgets
   where it was". `x ← x + x` runs away. The learner sees the consequence in the
   drawing and on the graph (productive failure), then fixes the model.
4. **Objects own their properties.** Each object has a card with live, scrubbable
   values (drag a number left or right). Tiles are references to those properties;
   rules are the only thing that changes them while the simulation runs.
5. **Every evaluation is visible.** Step mode substitutes the numbers into the rule
   (`x ← 1.00 + 1.0 × 0.5 = 1.50 m`) and draws the step Δx on the track and the
   graph, following Bret Victor's *Learnable Programming*.
6. **Few tiles, unlocked as concepts arrive.** Lesson 1 has five tiles: `x v Δt + ×`.
7. **Assessment checks behaviour, not syntax.** Any rule that produces the right
   motion passes (`x + v·Δt` and `Δt·v + x` are both correct).

How the rule language grows through the curriculum:

| Lesson | Rule the learner writes |
| --- | --- |
| 1 Describing motion | `x ← x + v·Δt` |
| 2 Acceleration | `v ← v + a·Δt` (and the two rules together) |
| 4–6 Forces | `a = ΣF / m`, with force tiles `W = m·g`, `N`, `f = μ·N` composed into ΣF |
| 7 Springs | `F = −k·(x − L₀)` |
| Momentum | `p ← p + ΣF·Δt` (the momentum principle) |
| Rotation | `θ ← θ + ω·Δt`, `ω ← ω + (τ/J)·Δt` |
| Analytical | rows of `M(q)·q̈ + h(q, q̇) = Q`, one per generalized coordinate |

## 5. Art direction

- **White paper, black ink.** Line art in the style of engineering-mechanics figures:
  hatched supports, grey-filled parts, dash-dot centre lines, dimension lines with
  arrowheads, numbered balloon callouts.
- **Computer Modern** (the LaTeX face) for everything in the drawing and the
  narration; Inter at small sizes for interface chrome.
- **One accent colour** (vermilion) means *you can touch this* or *your prediction*.
  A second (blue) is reserved for velocity. Everything else is ink and greys.
- **Motion as in a film:** lines draw themselves on, the camera eases between
  framings, the graph physically rotates into its textbook orientation.
- **Interface recedes:** a caption line, a timeline with chapters, and a panel only
  when a chapter needs it.

## 6. The script

Watch beats play like video; *do* beats stop the timeline until the learner acts.
Times are approximate.

### Ch. 0 · Title
- Title card: "Lesson 1 — Describing Motion". A cart is drawn line by line on a
  hatched track. **Begin**.

### Ch. 1 · Where? *(position)*
| Beat | Type | Content |
| --- | --- | --- |
| 1.1 | watch 6 s | Track draws on; cart A rolls in and stops. *"Before we can describe motion, we need a way to say where something is."* |
| 1.2 | watch 8 s | Number line and origin O draw on; a dimension line from O to the cart reads x = 2.5 m. *"Choose a reference point, the origin O, and a positive direction. The position x is the signed distance from O."* |
| 1.3 | do | *"Drag the cart to x = 6 m."* |
| 1.4 | do | *"Now drag the origin O to the right, past the cart."* Position becomes negative while the cart has not moved. |
| 1.5 | watch 6 s | O returns. *"Position depends on where we put the origin. It is a label we choose; the motion does not care."* |

### Ch. 2 · When? *(motion diagrams)*
| Beat | Type | Content |
| --- | --- | --- |
| 2.1 | watch 8 s | A moves at 1 m/s; a snapshot every 0.5 s leaves a ghost. A clock runs. *"Motion is position changing with time. Take a snapshot every half second."* |
| 2.2 | watch 6 s | Ghosts reduce to dots labelled with their times. *"This is a motion diagram. The time between dots is always the same, so the gaps show how fast it goes."* |
| 2.3 | do (predict) | Cart B appears. *"B moves twice as fast. Click where B will be at t = 0.5, 1.0 and 1.5 s."* |
| 2.4 | watch 5 s | B runs; predictions are scored against the true dots. Feedback adapts to the error. |

### Ch. 3 · Graphs
| Beat | Type | Content |
| --- | --- | --- |
| 3.1 | watch 9 s | A replays; each snapshot drops straight down onto a time axis pointing downward. *"Let time run downward. Drop each snapshot to its own time: the dots fall on a line."* |
| 3.2 | watch 6 s | The graph rotates 90° into textbook orientation. *"Turn it on its side and you have the position–time graph."* |
| 3.3 | do | *"Drag the time marker along the graph; the cart follows."* Caption confronts the "graph = picture of the path" misconception. |

### Ch. 4 · How fast? *(velocity)*
| Beat | Type | Content |
| --- | --- | --- |
| 4.1 | watch 8 s | Slope triangle Δt = 2 s, Δx = 2 m. *"Velocity is the change in position per unit time: the slope of the graph, v = Δx/Δt."* |
| 4.2 | watch 5 s | B's steeper line. *"Steeper line, faster cart."* |
| 4.3 | do | *"Drag the end of the line to give the cart a velocity of −1.5 m/s."* The cart's motion on the track follows the slope. |
| 4.4 | do (concept check) | Two lines cross at t = 2 s. *"At that instant the carts have the same… position / velocity / both?"* (TUG-K misconception) |

### Ch. 5 · The rule *(computational model)*
| Beat | Type | Content |
| --- | --- | --- |
| 5.1 | watch 8 s | *"A simulation doesn't know where the cart will be. It repeats one rule: from where it is now, take one small step."* |
| 5.2 | do | Build `x ← …` from the tiles x, v, Δt, +, ×. Units are checked live; **Test** runs the learner's rule and shows the consequence. |
| 5.3 | do | **Step** through the rule three times and watch each substitution and each Δx. |

### Ch. 6 · Your turn *(challenge, transfer)*
| Beat | Type | Content |
| --- | --- | --- |
| 6.1 | do | *"Reach the flag at x = 7 m exactly when the clock reads 3.0 s."* (Set v on the cart's card; the cart moves by the learner's rule.) |
| 6.2 | do | *"Start at x = 8 m and reach the origin at t = 4.0 s."* (Requires a negative velocity.) |

### Ch. 7 · Summary
- Four ideas, typeset: position, motion diagram, slope = velocity, the rule.
- Next: *Lesson 2 — Acceleration: when velocity changes.*

## 7. Misconceptions targeted

| Misconception | Where it is confronted |
| --- | --- |
| Position is a property of the object | 1.4: moving the origin changes x while the cart stays put |
| Negative position means moving backwards | 1.4 and 4.3: sign of x vs sign of v |
| The graph is a picture of the path | 3.1–3.3: the cart only moves left–right, yet the graph is a sloped line |
| Crossing lines mean equal speed | 4.4 concept check |
| Speed is the distance between dots, regardless of time | 2.2–2.4: equal time steps make the spacing meaningful |
| A rule can add any quantities | 5.2: unit checking refuses m + m/s |
