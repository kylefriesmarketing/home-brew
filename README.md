# HOME BREW — dev notes (v1.5, content-complete campaign)
### Smoky Mountain brewery tycoon · Dirty Boy Devs · The Room catalog

**PLAY: open `my-brew.html` in any browser.** Self-contained, saves on sleep (localStorage).
Old v0.1 saves load fine — the save system deep-defaults missing fields.
**LIVE: https://kylefriesmarketing.github.io/home-brew/** (deploy = `PUSH-HOMEBREW.bat`).

## New in v1.5 — **MILESTONE 1 of 6: FINISH THE LOOK** ✅

Plan agreed with Kyle: **M1 Look → M2 Equation → M3 Appetites → M4 Tension →
M5 Presence → M6 Hardening.** Full ratio→style restructure confirmed for M2;
saves may break; build to the highest quality bar.

- 🔭 **Depth-correct focus, replacing the fake tilt-shift.** The old band was
  screen-space and fixed (`bandCenter 0.52`) — a wall at the top of frame blurred
  while a mountain at screen-centre stayed razor sharp, and the subject drifted
  out of the band constantly. `sceneRT` now carries a `DepthTexture` (three
  blit-resolves it, so **MSAA is kept**), and the composite computes a real
  circle of confusion from world distance, focused on whatever the camera is
  looking at. Depth resolve verified by rendering the buffer directly:
  far 110 / mid 68 / near 49 — a clean gradient.
  ⚠️ `focusRange` is in WORLD UNITS; a thin sharp slab is what reads as miniature.
- 🎞️ **The film pass** — it was a clean digital render before. Gate weave
  (sub-pixel frame shift) and ±1.2% exposure flicker, both on the **exposure
  clock, not per frame** (film moves once per photographed frame); halation
  bleeding warm red-orange through the highlights; animated grain applied in
  **scene-linear before the tone map**, luminance-weighted so it lives in the
  shadows; and radial chromatic aberration in the corners only.
- 🫗 **Clay clearcoat + fake subsurface.** `clayMat` is now
  `MeshPhysicalMaterial` with a dim broad `clearcoat 0.08` (damp clay, never a
  hotspot), plus a Zucconi-style wrap-diffuse term patched in via
  `onBeforeCompile` so backlit edges glow warm — the strongest "this material is
  soft" cue there is. **Verified contributing: 76 materials patched, luma
  98.9 (off) → 102.3 (shipped) → 112.1 (strong).**
- 🦶 **Feet stopped skating.** Boots only translated in Z, so they slid like the
  character was on ice. They now lift on the swing and the ankle rolls.
  Measured: 15 distinct heights over 24 frames, 0.109 range.
- 🤲 **Carry IK — the most-seen pose in the game.** The carry was a FIXED arm
  rotation while the item damped independently to a point in front of the chest,
  so hands and cargo were never connected and a heavy crate floated with hands
  nowhere near it. Arms now aim at the actual item and the grip widens with its
  radius. Measured: arm pitch −1.34 vs computed aim −1.15.
- 🙂 **Head glances eased.** `p.head.rotation.y = rand(...)` assigned outright,
  so heads TELEPORTED between angles. Now a damped target: **0 snap frames in 50.**
- 💫 **Anticipation + overshoot** on the arms (every motion was a direct `sin()`),
  and **`claySquash` — written, documented, and never called — is finally wired.**

⚠️ Still open in M1: armature seam lines (dark crease at limb joints via vertex
colour). Everything else in the assessment's Phase A is done.

## New in v1.4 — CLAY, FOR REAL + two game-breaking fixes

Acted on an external assessment of v1.3. **Every claim was verified in source
before changing anything** — all five load-bearing ones were true.

### The two that broke the game
- 🍺 **Hot Dog Hefeweizen was UNOBTAINABLE.** Its recipe was `["barleyx",…]`
  and `barleyx` existed *nowhere else in the codebase*; barley sets `k.barley`
  and never enters `k.ings`, so `checkLegendary` could never match. 15 of 16
  discoverable ⇒ the `alllegend` "Whole Book" plaque was **unearnable**. Now
  `["barley","hotdog"]`, and a SECOND barley sack is "extra grain" that takes a
  flavor slot — which is exactly what Joe's hint always said.
- ⚖️ **Every Legendary lost to a generic two-ingredient brew.** The legendary
  branch *overrode* score with `4.6+(exec−1.15)×2`, capping at **5.30** — while
  plain coffee+honey on spring water is potential 3.98 × 1.5 exec = **5.97**.
  The entire 16-recipe discovery fantasy was mechanically pointless. Legendary
  status is now a **floor** (cursed recipes have deliberately awful raw
  potential — Trout Stout's is 0.6 — so they still need rescuing) **plus**
  `TUNE.legendBonus`. Measured through the real `finishBoil`: every Legendary
  **6.10** vs the dominant mix **5.97**.

### The look — the 12fps trick, finally applied to everything
- 🎬 **Global pose latch** (`04_clay.js`). Only `walkPhase` was quantized; the
  puppets' world transforms were written smoothly every frame, so legs stepped
  on twos while bodies glided at 60 — that reads as a walk-cycle *bug*. Now
  `CLAY.tick` marks the 12fps boundary and `latchApply()/latchRelease()` bracket
  the render: hold the pose, draw, hand the true pose straight back. Safe even
  for actors whose mesh transform IS their sim truth (Moppy, birds, raccoon).
  **Measured: held pose 4 distinct values over 18 frames; true position and
  camera 18 each.** ⚠️ NEVER latch the camera/liquids/steam/particles/UI — the
  smooth camera against steppy puppets is the entire tell.
- 🖐️ **Thumbprint surface.** `clayMat` shipped a bare material with **no maps**
  despite the file promising "thumbprint materials". Now one 512² canvas built
  at boot — layered value noise (weighted to LOW frequencies; high-frequency
  speckle reads as concrete, not clay) + stamped thumbprint arcs → Sobel →
  normal map, plus a contrast-inverted roughness map so the sheen varies.
  Shared by every material: one upload, zero extra draw calls.
- ✨ **The surface BOILS on the 12fps clock** — `clayBoilSurface()` nudges the
  map offset/rotation per held frame, so the thumbprints land differently every
  exposure, like a puppet re-sculpted between shots. Makes even a *static* prop
  read as stop-motion for two float writes.
- 🌑 **Shadows: 8 receivers → 385.** Clay helpers set `castShadow` but never
  `receiveShadow`, so nothing self-shadowed and standing indoors looked
  identical to standing in the yard. Added in the four helpers; shadow camera
  tightened ±42 → the real play area (~1.7× texel density); `normalBias 0.02`
  for the lumpy displaced geometry; and **`shadowMap.autoUpdate=false`, refreshed
  on the 12fps tick** — the whole map used to re-render every frame including
  180 tree draws. **Net perf: 3.4ms → 1.5ms/frame.** Fidelity *and* framerate.
- 📷 **Camera shake was invisible** — the offset was added to the camera AND the
  lookAt target, leaving view direction unchanged, so every impact landed as
  faint parallax. Shakes the eye only now, plus a touch of roll.
- 🧱 `clayCyl`'s geometry cache key omitted `radial`, so two calls differing only
  in segment count silently shared the first geometry. No collision today; fixed
  as a landmine.

⚠️ Tuning notes for the surface: `normalScale 0.8`, `repeat 2`, Sobel `STR 7.0`,
octave amps weighted low. At `STR 2.4 / scale 0.55` it was invisible past ~2m;
at `STR 7 / scale 1.15` with flat octave weights it read as **concrete**.

**Still open from the assessment** (bigger jobs, not started): ratio→style /
total→tier recipe restructure, customer appetites (red/green conditions,
per-archetype reputation, popularity decay), automation capping the boil,
late-game money sinks, Copperhead's physical presence, Ranger Dot's body.

## New in v1.3 — THE BALANCE BATTERY (the pricing feel-check, measured)

The old note said *"prices vs local wallets needs a feel-check."* It got one —
headlessly. `__EVE2(tier, price, fame)` runs one controlled evening (fame pinned
so spawn rate is constant, self-pour on to remove player skill, wings off to
isolate BEER economics) and reports arrivals/buyers/gross/fame by customer type.
`__AVG(tier, price, n)` repeats it. **n=4 evenings per cell** — single evenings
are far too noisy to conclude from ($14 gave $27 in one run and $124 in another).

**Finding 1 — the tag price is a TOURIST price, at every tier.** At each tier's
own suggested price, **zero locals buy. Every tier.** That's coherent design
(locals `sense` 1.2 vs tourists 0.6) but it was completely invisible.

**Finding 2 — LEGENDARY @ $14 was the worst price in the game.** Measured:

| Legendary price | gross | fame | buy rate | locals |
|---|---|---|---|---|
| $6  | **$142** | **+68** | 91% | 89% |
| $10 | $133 | +27 | 46% | 0% |
| $12 | $100 | +15 | 33% | 0% |
| $14 *(old tag)* | **$86** | +10 | 28% | 0% |
| $16 | $0 | −6 | 0% | 0% |

A Great beer at its own tag earned **$100**. Brewing the best beer in the game
and pricing it as instructed earned **$86** — the progression fantasy inverted.
**Fix: legend tag $14 → $10**, which keeps it a premium tourist price while
restoring "best beer = best money". (The fame→spawn-rate loop is why cheap wins
so hard: a happy cheap night snowballs into more customers.)

**Fix 2 — make the trade-off legible instead of invisible.** The appetite math
now lives in **one** place, `PUB.appeal(beer, price, type)` + `PUB.willBuy(...)`,
read by BOTH `chooseTap` and the price tag — they can never drift. The price
dialog now shows ✅/❌ per customer type live as you turn the dial:
- $6 → `✅ Locals ✅ Tourists ✅ Hikers` · *"they tip small but they **talk** (fame ×1.4)"*
- $10 → `❌ Locals ✅ Tourists ✅ Hikers` · *"Priced for passers-through. The regulars walk."*

⚠️ The refactor is **behavior-neutral** — verified by re-running the same battery
cells before/after (buy rates 91/46/92% → 91/51/91%, locals 89/0/94% → 100/0/85%).
⚠️ Don't conclude anything from a single evening. Use `__AVG` with n≥4.

## New in v1.2 — DISCOVERABILITY + a hardening sweep (`22_tips.js`)

**The problem measured, not guessed**: `DATA.OBJECTIVES` stops at day 2, and
`evergreen()` only mentions rank/legendaries/loan/bear/storm/leaf. Eight systems
shipped after that tutorial ends — a player could finish the campaign never
finding the rocker or MawMaw's stand. (Age of Toys lesson: when a deep game
feels shallow, the gap is DISCOVERABILITY, not mechanics.)

- 💡 **Contextual tips** (`22_tips.js`): 10 one-time nudges that fire only when
  the board has just demonstrated why the thing exists — bare shelves → the farm
  stand; a dead afternoon → the rocker; 2 spills and you've never mopped → the
  mop; first plaque → the Brag Board; a filled keg at night → the Bottling Line;
  first frost → winter runs the fire hungry; Bob/Joe walking in → what they do;
  6 brews with no discoveries → the Legendary hint. Once each **ever**
  (`homebrew-tips-seen`), 45s lockout, silent on days 1–2 and inside any menu or
  the boil. **Every predicate is try/catch'd** — verified by injecting a
  deliberately throwing tip: 0 errors, match unaffected.
- 🗓️ **Season chip in the HUD** (`Day 11 · ☀️ Afternoon · ❄️ Winter`) + a Brag
  Board line in the evergreen objectives, so both new systems are visible.

### Hardening sweep (no changes needed — documented so nobody "fixes" it twice)
- All 16 machines installed at once + winter + spills + rocker time-skip:
  0 errors, silo→boil→cold-room→Bertha→filler-line chain end-to-end, winter heat
  drift exactly `0.55×0.11×1.18 = 0.0714` as designed.
- Crowded pub (Bob + Copperhead + Joe + 6 regulars + Moppy + cat + spills): 0
  errors, PUFFS pool peaked 11/90 — no starvation.
- Save round-trip with everything (16 machines, 3 fermenters, 5 puddles, brags,
  hat, wings, season): every field identical, plaques and puddle meshes rebuilt.
- ⚠️ **INVESTIGATED AND NOT A BUG**: `CYCLE.save()` runs BEFORE the `newday`
  emit in `finishSleep`, and `CYCLE.load()` re-emits `newday` — so a save holds
  a pre-payout Bottling Line keg and reloading re-runs the overnight handlers.
  It looks like an infinite-money exploit and **is not**: the saved cash is also
  pre-payout, so every reload lands on the identical total ($9,343 twice,
  measured). Saves are only written at sleep, so it can never accumulate.
  **Don't "fix" the ordering** — it's self-consistent, and moving the save would
  break the crate-delivery resume.

## New in v1.1 — SEASONS, THE BRAG BOARD & COPPERHEAD COMES AROUND (`21_seasons.js`)

- 🍂❄️🌸☀️ **The calendar rolls**: 10-day seasons, fall first (the home season),
  derived purely from `G_STATE.day` — nothing new in the save. **Winter** is the
  showpiece: the whole mountain lerps to snow over 4s (vertex-palette swap with
  a grassy-vertex mask), the crick freezes over, icicles grow under the eaves,
  snow falls, ground cover whitens, butterflies leave, everyone's **breath
  shows**, boil heat drains 18% faster, and crowds thin to the faithful.
  Spring: petals + peepers + 1.5× storms. Summer: cicadas + thirsty crowds.
  Leaf Day now only lands in fall (as nature intended). `SEASONS.force="winter"`
  to preview any season.
- 🏆 **The Brag Board** (bible-style physical achievements): 16 plaques hung on
  a board over the bar — ghost slots fill in as you earn them (first brew, all
  16 Legendaries, Bear Whisperer, Frostbite Brewer, Mattress Money…). Station at
  the register end opens the board + The Ledger of You (lifetime stats).
  `G_STATE.brags` rides the save; plaques re-hang on load.
- 🐍 **Copperhead comes around**: after you beat him at Worlds he shows up at
  YOUR bar every few evenings — grudging bubbles ("…s'alright."), doubles as a
  great tipper, and leaves with a nod worth +2 fame (35% of the time he leaves
  jerky. It's incredible. Damn him.) His ambient figure across the crick hides
  while he visits — a man can't be two places.
- 🍺 **Four new Legendaries (16 total)** + two cursed ingredients (Two-Stroke
  Oil, Unsent Love Letter): Dear John Doppelbock, Two-Stroke Stout, Fireside
  Flannel, Moth Wing Pilsner. Joe hints them; the Brew Book counts are dynamic.
- 🎵 **Audio deepened**: crowd murmur past 3 customers, rain-on-the-roof +
  distant rolls in storms, the kettle literally breathes with its heat, seasonal
  night ambience (winter wind / spring peepers / summer cicadas / fall crickets),
  and a rank-4 jaw-harp twang completes the jug band.

## New in v1.0 — THE ART & ALIVE PASS (`19_post.js` + `20_alive.js`, all free)

- 🎞️ **Miniature film look** (`19_post.js`, Age of Toys architecture): scene →
  HDR MSAA RT → bloom (¼, threshold 1.0 — HDR headroom IS the gate) + defocus
  (½) → composite w/ tilt band + warm grade + vignette + ACES/sRGB **in the
  composite shader** (tone mapping only fires on canvas renders — that's the
  whole trick). `POST.enabled=false` to toggle; auto-resizes via checkSize().
  0 config, WebGL2-gated, plain-render fallback. ~3.8ms/frame all-in.
  String lights/fireflies/neon get >1.0 colour boosts so bloom finds them —
  the night pub shot finally glows like it always wanted to.
- 🌿 **Ground cover**: 536 instanced tufts/clover/flowers/pebbles/mushrooms
  (5 draw calls), rule-based placement mirroring the terrain painter's zones
  (roads/paths/lots/crick/rock-line all excluded), mushrooms cluster at trees.
- 🐿️ **Critters**: 2 squirrels dashing tree-to-tree (flee you), 3 fence birds
  that scatter when approached, 3 daytime butterflies, and a raccoon who cases
  the dumpster after dark (scurries if you close in).
- 🛻 **Neighbors**: pickup trucks rattle down the road (~2min cadence, dust +
  positional putt-putt), **Copperhead visibly putters at his still** across the
  crick all day and his window glows amber at night.
- 🐈 **Pub life**: dartboard, mounted trout, antlers on the wall; three table
  lanterns that flicker alive at dusk; and a pub cat who naps on the bar,
  lifts her head when you come close, and occasionally hops to a new spot.
- 🍺 **Beer physics VFX**: visible pour stream at the taps with foam spatter,
  idle-tap drips, foam heads that wobble as drinkers work them down, hiccup
  bubbles that float up and pop, and burp clouds (bigger for better beer) that
  drift, wobble, and POP into mini puffs.
⚠️ Staged-screenshot lesson: don't spawn a burp cloud in front of the lens and
then spend ten minutes debugging the "giant white blob".

## New in v0.9 — BARLEYCORN BOB VISITS + the Bottling Line

- 📓 **Barleycorn Bob finally exists in the flesh** (bible §3 — he was only ever
  title-screen quotes). Bucket hat + camera, shuffles in every 4th evening from
  day 3, orders off the best tap, scribbles, leaves. **Next morning THE HOLLER
  HERALD runs his review** — wrong in funny ways even when it raves ("notes of
  free-range crayons and premium hose") — with a real fame swing: legend +8 /
  great +5 / good +3 / decent +1 / swill −5 / nothing-on-tap 0 (he reviews the
  stools: sturdy). His own pint gives no fame (`fameMul:0`) — the COLUMN is his
  power. State in `flags.bobLast/bobDay/bobReview`, all save-safe.
- 🍾 **Bottling Line** (r3 $300, README's "idle income" candidate): park a FILLED
  keg on it out back by the cold room → overnight it becomes bottle money at
  `pints × price × 0.6` — no tips, no fame, no labor. The pub pays better but
  needs you; the line pays while you sleep. Keg wakes up dirty. `stats.bottled`.
- 🌟 **Drunks weave home under the fireflies** (bible §8's exact sentence):
  tipsy leavers on the road at night trail little glows, and the truly gone
  occasionally face-plant ("g'night, gravel").

## New in v0.8 — SPILLS, SLIPS & THE MOP (bible §7) + more boil chaos

- 🫗 **Spills persist until mopped.** Truth in `G_STATE.puddles` (rides the save;
  meshes rebuilt each dawn/load). Sources: customer sip-slosh, drunk leavers,
  foam-overs, THE LID, Splashy overspray. Cap 12. Decals use `polygonOffset`,
  never a raised y (the Toy Box contact-shadow lesson).
- 🛝 **Slips are physics events.** Run through a puddle: the goober squashes,
  spins, slides ×1.7, and THROWS whatever he's carrying (unless it's the mop —
  holding the mop is holding the solution). Customers slip too, with bubbles
  ("who MOPS around here?!"). 2.5s cooldown, toast throttled.
- 🧹 **The mop is a held tool with terrible reach** (station r 1.35). Lives by
  the trough; if it ever goes missing a new one appears at dawn. `stats.mopped`.
- 🤖 **Moppy's true calling**: he seeks pub spills (hustles at 1.25), routes
  around the bar via a west-gate lane, wall-follows with COMMITTED detour sides
  (random sides ping-pong forever — measured), and dings when he eats one.
  Verified 5/5 spills cleaned from every corner, both sides of the bar.
- 🔥 **Three new boil events**: 🐿️ squirrel steals a log (heat crashes — feed!),
  🍿 popcorn kernel (jittery pops), 👃 Hollow Joe sniff-test (hold BOTH bands
  while he watches → +$15). Storms now crack ⚡ thunder mid-boil (pressure jolt).
- Fermenter prompts show "N kegs' worth in there!" on Bertha batches.

## New in v0.7 — THE FULL MACHINE ROSTER (bible §14 complete)

All 8 remaining machines, meshes + real effects, catalog-listed with rank gates:
- 🤖 **Moppy** (r1 $130): wanders the pub bumping furniture (real colliders), fears
  the porch step (shivers + turns), and tips run ×1.12 (hooked at `ECON.earn`).
- 🌾 **Grain Silo** (r1 $150): FIRE IT UP auto-feeds barley from stock — the auger
  rumbles, grain puffs. Hook in the kettle station's fire branch.
- 🛼 **Conveyor Line** (r2 $260): anything set on the belt (yard gap, z≈−2.8) rides
  east into the pub. Item-physics push; rollers spin when busy.
- ❄️ **Cold Room** (r2 $320): frosty shed out back with **Fermenter No. 3** inside —
  `ferms[2]` created on install, own station (`ferm3`), breathes cold puffs.
- ⛓️ **Delivery Winch** (r3 $220): dawn supply crates unpack themselves into stock;
  machine crates still ride the forklift (the forklift is sacred).
- 🔁 **Keg Filler Line** (r3 $360): 1 Hz scan — ready fermenter + clean keg within
  3.4 → filled. Honors Bertha's 2-keg batches.
- 💡 **Neon Sign** (r4 $420): on the pub ridge, fades with the pub roof (mats pushed
  into the roof registry), first O flickers via texture swap, glows evenings
  (+~5 fame/evening, blackout-aware via `power`).
- 🔴 **Big Bertha** (r4 $480): the kettle reborn — 1.26×, deep red, riveted, and
  every batch is **2 kegs' worth** (`F.kegs`, decremented by hand-fill AND line).
⚠️ ferm stations are id'd `ferm0`/`ferm1`/`ferm3` (index-based, then mine).
⚠️ `F.kegs` rides the save; old saves deep-default to 1 via `(F.kegs||1)`.

## New in v0.6 — the homestead pass (`18_homestead.js`)

- 🏠 **Roofs.** Real gable roofs (rusty tin on the shack + stovepipe, dark shingle
  on the pub, green lean-to over the wings + kitchen stack) with the **dollhouse
  fade**: walk inside and that building's roof melts to 12% so the diorama stays
  playable. ⚠️ roof materials are CLONES — `clayMat` caches by colour, so fading
  a shared material would fade half the mountain. Roofs cast no shadow on purpose
  (interiors were lit rooflessly). The pub gable finally wears Kyle's §22 sign:
  **HOPS & HOLLERS**.
- 🧺 **MawMaw's Farm Stand** (by the road, west of the driveway): forgot to order?
  Buy barley + 3 rotating honest ingredients at a proud 1.75× markup, plus her ONE
  spare keg per day ($26, spawned out back — you haul it). Honor box. She KNOWS.
- 🪑 **The porch rocker = time skip.** Sit a spell and the whole sim runs at 7×
  (`MAIN.drive` sub-steps the loop, so customers/ferments/truck/weather all
  fast-forward together — no system ever sees a big dt). Auto-stands you at the
  next phase; blocked mid-boil and at night; E or a step gets you up. The chair
  rocks at 12fps like every other prop.

## New in v0.5 (on top of the full v0.1 core loop)

**THE WINGS**
- 🍳 **Kitchen** (unlocks at Holler Hero): fryer with cook-timer + burn window, four dishes,
  carry plates to the bar pass — dishes **pair with beer axes** (pretzel↔bitter, wings↔funky,
  pickles↔WEIRD, cornbread↔sweet) for combo tips/fame and blissed-out customers.
- 🧸 **Gift Shop** (unlocks at Regional Star): stock tees/snowglobes/plush bears via the
  catalog, tourists browse after drinking, Legendary tees print on demand.
- 🎩 **Hat rack**: 12 hats — 6 buyable, 6 earned (install 3 machines, 5 Legendaries, survive
  Leaf Day, 3 clean nights for Ranger Dot's hat, beat Copperhead at Worlds for HIS).
- 🧑‍🔧 **Staff**: hire **Big Tim** (auto-stocks the kitchen, whispers to the fryer) and
  **Darlene** (pours for you, sass included). They walk up the road the morning after hiring.

**MOUNTAIN EVENTS**
- ⛈️ **Storm days**: dark skies, rain, thunder, meaner boils — and evening **blackouts** that
  knock every machine offline. Hands-on skills never rot.
- 🍁 **Leaf Season Saturday** (every 7th day): tour bus pulls in, rich tourists ×1.5 wallets,
  falling leaves, annual stress-test.
- 🐻 **The Boys**: spent grain piles up per brew; ignore the dumpster and bears trash it —
  ignore it twice and A BEAR WALKS INTO THE PUB (everyone freezes; fame coin-flip).

**CAMPAIGN COMPLETE**
- **Regional Cup**: Copperhead SWAPS YOUR KEG mid-judging — swap in a backup, expose him
  (Dot saw everything), or press on with ditch water. Gates Regional Star.
- **World Championship**: head-to-head vs his masterpiece (~8.2-9). You need a
  *well-executed* Legendary to win. Gates Best Brewery in the World.
- **Epilogue**: his jerky rack appears in your gift shop, the Mystery Jar goes legal,
  his hat joins your rack, credits roll → endless sandbox.

**JUICE**: rooster mornings, string lights at dusk, googly eyes on the forklift/Whirlybird/
Splashy, kettle-lid rattle at high pressure, the sabotage raccoon physically dances on your
kettle, footsteps, pour poses, hop-leaf confetti.

## Architecture
18 parts, all tuning in `01_data.js`. New: `16_wings.js` (kitchen/gift/hats/staff),
`17_events.js` (storms/leaf/bears), `18_homestead.js` (roofs/farm stand/rocker).
Build: `python3 build.py` OR `node build.mjs` (Kyle's PC has no Python — use the
portable node at `C:\Users\kylef\tools\node`). ⚠️ build.mjs uses replacer
FUNCTIONS in String.replace — three.js contains `$'` which a plain string
replacement expands and silently corrupts the build.

## Testing
`test_boot.py` · `test_loop.py` (core loop) · `test_story.py` (economy/forklift/loan/fair) ·
`test_sweep.py` (wings, staff, events, regional cheat, worlds, save migration).
All green, zero console errors. `MB.step(sec)` drives sim-time headlessly.

## Seams & next
- Balance pass wants real hands: prices vs local wallets (Great beer at $8 prices out locals —
  intentional tension, needs feel-check), worlds difficulty (exec ≥1.3 legendary required).
- Higgsfield clay-figurine art pass still pending (goober/Copperhead/kettle/forklift heroes).
- Candidates for v0.6+: gamepad, bottling line idle income, more boil events, NG+ winter.
