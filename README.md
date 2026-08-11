# HOME BREW — dev notes (v1.0, content-complete campaign)
### Smoky Mountain brewery tycoon · Dirty Boy Devs · The Room catalog

**PLAY: open `my-brew.html` in any browser.** Self-contained, saves on sleep (localStorage).
Old v0.1 saves load fine — the save system deep-defaults missing fields.
**LIVE: https://kylefriesmarketing.github.io/home-brew/** (deploy = `PUSH-HOMEBREW.bat`).

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
