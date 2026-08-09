# HOME BREW — dev notes (v0.5, content-complete campaign)
### Smoky Mountain brewery tycoon · Dirty Boy Devs · The Room catalog

**PLAY: open `my-brew.html` in any browser.** Self-contained, saves on sleep (localStorage).
Old v0.1 saves load fine — the save system deep-defaults missing fields.

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
17 parts, all tuning in `01_data.js`. New: `16_wings.js` (kitchen/gift/hats/staff),
`17_events.js` (storms/leaf/bears). `python3 build.py` → single `my-brew.html`.

## Testing
`test_boot.py` · `test_loop.py` (core loop) · `test_story.py` (economy/forklift/loan/fair) ·
`test_sweep.py` (wings, staff, events, regional cheat, worlds, save migration).
All green, zero console errors. `MB.step(sec)` drives sim-time headlessly.

## Seams & next
- Balance pass wants real hands: prices vs local wallets (Great beer at $8 prices out locals —
  intentional tension, needs feel-check), worlds difficulty (exec ≥1.3 legendary required).
- Higgsfield clay-figurine art pass still pending (goober/Copperhead/kettle/forklift heroes).
- Candidates for v0.6+: gamepad, bottling line idle income, more boil events, NG+ winter.
