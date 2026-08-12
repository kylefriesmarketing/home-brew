"use strict";
/* HOME BREW — all tuning & content lives here (the data.js rule) */

const DATA = {};

/* ---- waters: cap = max quality potential 1..5, walk = effort story ---- */
DATA.WATERS = {
  hose:    { name:"Garden Hose",     cap:2, funk:0, tag:"chlorine finish, faint taste of summer 1998", color:0x9fd8e8 },
  sink:    { name:"Kitchen Sink",    cap:2, funk:0, tag:"soap notes; occasionally a spoon", color:0xbfe3ea },
  crick:   { name:"Muddy Crick",     cap:3, funk:1, tag:"earthy. floaties possible.", color:0x9a8a5a, risk:"floaties" },
  spring:  { name:"Mountain Spring", cap:4, funk:0, tag:"clean, cold, smug", color:0x9fc8ff },
  glacier: { name:"Glacier Melt",    cap:5, funk:0, tag:"tastes like the ice age", color:0xcfe8ff, locked:true },
};

/* ---- ingredients: axes sweet/bitter/funky/weird 0..3 ---- */
DATA.INGREDIENTS = {
  barley:    { name:"Barley Sack",       cost:5,  s:0,b:1,f:0,w:0, base:true,  look:"sack",    col:0xc9a86a },
  hops:      { name:"Wild Hops",         cost:6,  s:0,b:2,f:0,w:0, look:"cone",    col:0x86b04c },
  blackberry:{ name:"Blackberries",      cost:6,  s:2,b:0,f:0,w:0, look:"berries", col:0x3a2a4a },
  honey:     { name:"Sourwood Honey",    cost:8,  s:3,b:0,f:0,w:0, look:"jar",     col:0xe8a33d },
  peach:     { name:"Orchard Peaches",   cost:7,  s:2,b:0,f:0,w:0, look:"fruit",   col:0xf2a55c },
  pawpaw:    { name:"Pawpaw Fruit",      cost:8,  s:2,b:0,f:1,w:0, look:"fruit",   col:0xa8c24c },
  ramps:     { name:"Ramps",             cost:5,  s:0,b:1,f:3,w:0, look:"bundle",  col:0x9ed07a },
  sorghum:   { name:"Sorghum Molasses",  cost:7,  s:2,b:1,f:1,w:0, look:"jar",     col:0x5a3a1e },
  candy:     { name:"Gas-Station Candy", cost:4,  s:3,b:0,f:0,w:1, look:"pile",    col:0xe85a8a },
  coffee:    { name:"Cold Brew Coffee",  cost:6,  s:0,b:3,f:0,w:0, look:"jar",     col:0x38281c },
  apple:     { name:"Orchard Apples",    cost:5,  s:2,b:1,f:0,w:0, look:"fruit",   col:0xc84c3a },
  oil:       { name:"Two-Stroke Oil",    cost:3,  s:0,b:1,f:1,w:3, cursed:true, look:"jar",   col:0x2a2420 },
  letter:    { name:"Unsent Love Letter",cost:2,  s:2,b:0,f:0,w:2, cursed:true, look:"letter",col:0xf4ead8 },
  fish:      { name:"Rotten Fish",       cost:3,  s:0,b:0,f:2,w:3, cursed:true, look:"fish",  col:0x7a9a8a },
  sock:      { name:"Old Sock",          cost:2,  s:0,b:0,f:3,w:2, cursed:true, look:"sock",  col:0xb0a890 },
  hotdog:    { name:"Hot Dog Water",     cost:2,  s:0,b:0,f:2,w:2, cursed:true, look:"jar",   col:0xc2907a },
  crayon:    { name:"One (1) Crayon",    cost:1,  s:1,b:0,f:0,w:3, cursed:true, look:"crayon",col:0xe8483a },
  jar:       { name:"Copperhead's Mystery Jar", cost:0, s:1,b:1,f:2,w:3, cursed:true, secret:true, look:"jar", col:0xd8d2b0 },
};

/* ============================================================================
   BEER STYLES — the M2 restructure (Potionomics' solution to our exact problem).
   The RATIO between sweet/bitter/funky/weird decides WHICH BEER YOU MADE.
   The TOTAL intensity decides HOW GOOD it is.

   Before this, four authored axes were crushed into one scalar and customers
   read only that scalar — so there was exactly one correct beer (coffee+honey)
   from day 6 onward and the whole 16-ingredient pantry was a menu with one
   right answer. Two orthogonal readings of the same vector fixes it: there is
   no "more is better" direction any more, only "closer to a style", and
   over-pouring your dominant axis drags you off-ratio into mud.

   `mix` is the TARGET RATIO (s,b,f,w). Purity = cosine similarity to it.
   ============================================================================ */
DATA.STYLES = [
  { key:"lager",  name:"Lager",      mix:[0.40,0.40,0.20,0.00], blurb:"clean, honest, unremarkable in the best way" },
  { key:"amber",  name:"Amber Ale",  mix:[0.50,0.45,0.05,0.00], blurb:"the handshake of beers" },
  { key:"ipa",    name:"IPA",        mix:[0.12,0.80,0.08,0.00], blurb:"bitter enough to argue with" },
  { key:"stout",  name:"Stout",      mix:[0.10,0.65,0.25,0.00], blurb:"roasty, dark, sits in the chest" },
  { key:"porter", name:"Porter",     mix:[0.35,0.55,0.10,0.00], blurb:"sweet up front, bitter on the way out" },
  { key:"honey",  name:"Honey Ale",  mix:[0.80,0.12,0.08,0.00], blurb:"pure sunshine, dangerous at noon" },
  { key:"fruit",  name:"Fruit Beer", mix:[0.62,0.08,0.30,0.00], blurb:"orchard in a glass" },
  { key:"saison", name:"Saison",     mix:[0.20,0.18,0.62,0.00], blurb:"farmhouse funk, barn-adjacent" },
  { key:"sour",   name:"Sour",       mix:[0.42,0.05,0.53,0.00], blurb:"puckers first, forgives later" },
  { key:"gose",   name:"Gose",       mix:[0.26,0.20,0.30,0.24], blurb:"salty, strange, weirdly moreish" },
  { key:"curio",  name:"Curiosity",  mix:[0.14,0.14,0.20,0.52], blurb:"you made this on purpose. allegedly." },
];

/* ---- the 12 Legendary recipes: ing = sorted multiset of NON-barley items ---- */
DATA.LEGENDARIES = [
  { key:"trout",   name:"Trout Stout",        ing:["coffee","fish"],        water:"crick",  hint:"Somethin' fishy'd sit real nice in somethin' muddy… with a jolt of black mornin' juice." },
  { key:"laundry", name:"Laundry Day Lager",  ing:["candy","sock"],         water:"sink",   hint:"Wash day secret: one sock, somethin' sugary, and water that's seen some dishes." },
  { key:"crayola", name:"Crayola Kölsch",     ing:["candy","crayon"],       water:"hose",   hint:"Art class taught me two things. One melts. Both belong in hose water." },
  { key:"rampst",  name:"Ramp Stamp",         ing:["honey","ramps","ramps"],water:"crick",  hint:"Double the stink-onion, sweeten her with tree-flower gold, keep the water honest and muddy." },
  { key:"pawpaw",  name:"Pawpaw's Porter",    ing:["coffee","pawpaw","sorghum"], water:"crick", hint:"Grandpappy's dessert: custard-fruit, sorghum, and coffee thick enough to stand a spoon in." },
  { key:"bees",    name:"Bee's Knees",        ing:["honey","honey"],        water:"spring", hint:"Two jars of the sourwood, nothin' else, and water with no excuses." },
  { key:"preacher",name:"Peach Preacher",     ing:["honey","peach"],        water:"spring", hint:"A peach and a prayer and the clean cold stuff. Hallelujah." },
  { key:"brawler", name:"Blackberry Brawler", ing:["blackberry","hops","hops"], water:"spring", hint:"Berries that fight back want double bitters in their corner." },
  /* ⚠️ was ing:["barleyx","hotdog"] — "barleyx" existed NOWHERE else in the
     codebase, and barley never enters k.ings (it sets k.barley), so this was
     UNOBTAINABLE and the alllegend "Whole Book" plaque was unearnable. The
     hint says "extra grain": a SECOND barley sack now goes into ings. */
  { key:"hefe",    name:"Hot Dog Hefeweizen", ing:["barley","hotdog"],      water:"sink",   hint:"Ballpark in a glass: dog water, extra grain, and the sink knows what it did." },
  { key:"iceage",  name:"Ice Age IPA",        ing:["apple","hops"],         water:"glacier",hint:"When you finally haul the old ice down, bring apples and bitters to meet it." },
  { key:"moon",    name:"Moonlight Special",  ing:["jar"],                  water:null,     hint:null, wild:true },
  { key:"sudsy",   name:"The Grand Ol' Sudsy",ing:["blackberry","honey"],   water:"glacier",hint:"The champion's pour: glacier cold, berry dark, sourwood sweet. That one wins wars." },
  { key:"dearjohn",name:"Dear John Doppelbock",ing:["honey","letter"],      water:"sink",   hint:"Somebody's unsent feelings, sweetened with tree-gold, cried straight into the dishwater." },
  { key:"twostroke",name:"Two-Stroke Stout",  ing:["coffee","oil"],         water:"crick",  hint:"What the forklift drinks after close: black mornin' juice, a splash of engine sauce, muddy." },
  { key:"flannel", name:"Fireside Flannel",   ing:["apple","sorghum"],      water:"spring", hint:"Orchard fruit an' sorghum molasses in clean cold water. Tastes like a warm shirt." },
  { key:"mothwing",name:"Moth Wing Pilsner",  ing:["candy","ramps"],        water:"hose",   hint:"Sugar and stink-onion, straight out the garden hose. The moths SWEAR by it." },
];

/* ---- seasons: 10-day wheel, fall first (the home season) ---- */
DATA.SEASONS = {
  order:["fall","winter","spring","summer"],
  daysPer:10,
  fall:  { label:"Fall",   icon:"🍁", cust:1.0,  heat:1.0,  storm:1.0 },
  winter:{ label:"Winter", icon:"❄️", cust:0.85, heat:1.18, storm:0.7 },   // cold air eats the fire
  spring:{ label:"Spring", icon:"🌸", cust:1.0,  heat:1.0,  storm:1.5 },
  summer:{ label:"Summer", icon:"☀️", cust:1.15, heat:0.95, storm:0.9 },
};

/* ---- the Brag Board: plaques earned by playing, hung in the pub ---- */
DATA.BRAGS = [
  { key:"firstbrew",  icon:"🍺", name:"First Drop",        desc:"brew your first batch" },
  { key:"firstlegend",icon:"⭐", name:"Lightning Bottled",  desc:"discover a Legendary" },
  { key:"alllegend",  icon:"👑", name:"The Whole Book",     desc:"discover EVERY Legendary" },
  { key:"served100",  icon:"🍻", name:"Century Pour",       desc:"serve 100 pints" },
  { key:"fairwon",    icon:"🎪", name:"County Champ",       desc:"win the County Fair" },
  { key:"worldswon",  icon:"🏆", name:"Best in the World",  desc:"beat Copperhead at Worlds" },
  { key:"leaf",       icon:"🍂", name:"Leaf Day Survivor",  desc:"serve 8+ on a Leaf Day" },
  { key:"bearfriend", icon:"🐻", name:"Bear Whisperer",     desc:"a pub bear leaves happy" },
  { key:"mop10",      icon:"🧹", name:"Clean Floors Club",  desc:"mop 10 spills" },
  { key:"bottles",    icon:"🍾", name:"Night Shift",        desc:"bottle 100 pints" },
  { key:"bobfan",     icon:"📰", name:"Press Darling",      desc:"survive 5 Bob reviews" },
  { key:"hats",       icon:"🎩", name:"Hat Person",         desc:"own 6 hats" },
  { key:"rich",       icon:"💰", name:"Mattress Money",     desc:"hold $1,000 at once" },
  { key:"winter",     icon:"❄️", name:"Frostbite Brewer",   desc:"brew through a winter" },
  { key:"joe",        icon:"👃", name:"Joe's Favorite",     desc:"serve Hollow Joe 5 cursed pints" },
  { key:"machines",   icon:"🔧", name:"Industrialist",      desc:"install 8 machines" },
];

/* ---- machines ---- */
DATA.MACHINES = {
  whirlybird:{ name:"The Whirlybird",   cost:80,  desc:"Auto-stirrer. No more paddle arm.", rank:0, gag:"spins a little too fast" },
  granny:    { name:"Granny's Dial",    cost:120, desc:"Thermostat rig — heat drifts half as fast.", rank:0 },
  governor:  { name:"Pressure Governor",cost:140, desc:"Pressure spikes hit half as hard.", rank:1 },
  ferm2:     { name:"Fermenter No. 2",  cost:180, desc:"Brew two batches at once.", rank:1 },
  splashy:   { name:"Ol' Splashy",      cost:200, desc:"Keg washer. Soaks you every time. Worth it.", rank:1 },
  pipes:     { name:"Spring Pipe Run",  cost:220, desc:"Pipes spring water straight to the kettle tap.", rank:2 },
  selfpour:  { name:"Self-Pour Taps",   cost:260, desc:"Customers pour themselves. Freedom.", rank:2 },
  moppy:     { name:"Moppy",            cost:130, desc:"Mop-roomba. Fears the porch step. Clean floors tip better.", rank:1, gag:"fears the porch step" },
  silo:      { name:"Grain Silo",       cost:150, desc:"Silo + auger — the kettle feeds itself barley from stock.", rank:1 },
  conveyor:  { name:"Conveyor Line",    cost:260, desc:"Rolls anything you set on it from the brewhouse to the pub.", rank:2 },
  coldroom:  { name:"Cold Room",        cost:320, desc:"A frosty shed out back with Fermenter No. 3 inside.", rank:2 },
  winch:     { name:"Delivery Winch",   cost:220, desc:"Dawn supplies unpack themselves. Machines still ride the forklift.", rank:3 },
  fillline:  { name:"Keg Filler Line",  cost:360, desc:"Ready fermenters fill any clean keg left beside them.", rank:3 },
  bottler:   { name:"Bottling Line",    cost:300, desc:"Park a FILLED keg on it at night — wake up to bottle money. No tips, no fame, no labor.", rank:3 },
  neon:      { name:"Neon Sign",        cost:420, desc:"HOPS & HOLLERS in buzzing tube-glass. One letter's given up. Fame trickles in nightly.", rank:4 },
  bigbertha: { name:"Big Bertha",       cost:480, desc:"Kettle Mk2 — every batch fills TWO kegs.", rank:4 },
  bigtim:    { name:"Big Tim (cook)",   cost:280, desc:"Keeps the kitchen stocked. Whispers to the fryer.", rank:2, staff:true, needsWing:"kitchen" },
  darlene:   { name:"Darlene (bartender)", cost:340, desc:"Pours for you. Immune to chaos.", rank:3, staff:true },
};

/* ---- kitchen dishes: pair = beer axis that combos ---- */
DATA.DISHES = {
  pretzel:  { name:"Hot Pretzel",     cook:6,  cost:2, sell:5, pair:"b", pairName:"bitter brews", col:0xb5742e },
  wings:    { name:"Smoked Wings",    cook:9,  cost:3, sell:7, pair:"f", pairName:"funky brews",  col:0xa04a2a },
  pickles:  { name:"Fried Pickles",   cook:7,  cost:2, sell:6, pair:"w", pairName:"WEIRD brews",  col:0x8aa04a },
  cornbread:{ name:"Skillet Cornbread",cook:8, cost:2, sell:6, pair:"s", pairName:"sweet brews",  col:0xe0b05a },
};

/* ---- hats: how = buy | unlock ---- */
DATA.HATS = {
  trucker:  { name:"Trucker Cap",     how:"buy", cost:15, desc:"the classic" },
  beanie:   { name:"Snow Beanie",     how:"buy", cost:15, desc:"ears intact since '09" },
  colander: { name:"Colander",        how:"buy", cost:25, desc:"drains AND protects" },
  coonskin: { name:"Coonskin Cap",    how:"buy", cost:40, desc:"the tail judges you" },
  cone:     { name:"Party Cone",      how:"buy", cost:20, desc:"it's always somebody's birthday" },
  foam:     { name:"Foam Beer Dome",  how:"buy", cost:35, desc:"advertise from the scalp" },
  hard:     { name:"Hard Hat",        how:"unlock", need:"install3", desc:"install 3 machines" },
  straw:    { name:"Straw Hat",       how:"buy", cost:18, desc:"farm-to-head" },
  wizard:   { name:"Wizard Hat",      how:"unlock", need:"legend5", desc:"discover 5 Legendaries" },
  leaf:     { name:"Leaf Crown",      how:"unlock", need:"leafday", desc:"survive a Leaf Season rush" },
  ranger:   { name:"Ranger Dot's Hat",how:"unlock", need:"noswill", desc:"3 nights, zero swill served" },
  snake:    { name:"Copperhead's Hat",how:"unlock", need:"worlds", desc:"beat him when it matters" },
};

/* ---- customers ---- */
/* M3: `likes`/`dislikes` are STYLE keys — now that ratio decides the style, the
   pub can have opinions. `req` is how often this archetype arrives with a
   demand. Locals are the honest-beer crowd; tourists chase novelty; the Hop
   Snob is unbearable on purpose. */
DATA.CUSTOMERS = {
  local:  { name:"Local",  wallet:9,  sense:1.2, tipMul:0.8, fameMul:1.4, col:0x7a6a4c, req:0.30,
            likes:["lager","amber","porter"], dislikes:["curio","gose"],
            chat:["evenin'","the usual, if it's drinkable","how's the roof holdin' up?"] },
  tourist:{ name:"Tourist",wallet:22, sense:0.6, tipMul:1.6, fameMul:1.0, col:0xe86a5a, req:0.55,
            likes:["fruit","sour","honey","curio"], dislikes:["lager"],
            chat:["is this CRAFT?","we drove nine hours!","do y'all have wifi?"] },
  hiker:  { name:"Hiker",  wallet:12, sense:0.3, tipMul:1.0, fameMul:0.7, col:0x5a8a5a, req:0.15,
            likes:["stout","porter","honey"], dislikes:[],
            chat:["water first. then beer.","I smelled this place from the ridge","carbs are carbs"] },
  snob:   { name:"Hop Snob",wallet:26,sense:0.7, tipMul:1.3, fameMul:1.6, col:0x6a5a8a, req:0.85,
            likes:["ipa","stout","saison"], dislikes:["lager","honey","fruit"],
            chat:["what's your hop bill?","I only drink unfiltered","is this… pasteurised?"] },
  student:{ name:"Student", wallet:7, sense:1.5, tipMul:0.5, fameMul:0.9, col:0xe8c23d, req:0.05,
            likes:["lager","amber","fruit"], dislikes:[],
            chat:["cheapest thing you got","is there a student discount","I have four dollars"] },
  joe:    { name:"Hollow Joe", wallet:99, sense:0, tipMul:3.0, fameMul:1.0, col:0x6a6a7a, special:true,
            req:0, likes:["curio","gose","sour"], dislikes:[] },
  bob:    { name:"Barleycorn Bob", wallet:30, sense:0.8, tipMul:1.0, fameMul:0, col:0xd8c8a0, special:true,
            req:0, likes:[], dislikes:[], purist:true,   // Bob scores the RATIO, not the style
            chat:["*scribbles*","don't mind me. reviewing.","mm. yes. words."] },
  cope:   { name:"Copperhead", wallet:45, sense:1.0, tipMul:2.2, fameMul:1.2, col:0x5e4a3a, special:true,
            req:0, likes:["stout","ipa","porter"], dislikes:["fruit"],
            chat:["...place ain't terrible","don't tell NOBODY I'm here","still say it's yard soup. good yard soup."] },
};

/* ============================================================================
   REQUESTS — Potion Craft's red/green conditions, the cheapest way to make all
   four axes pay. RED is required (they walk without it); GREEN is optional and
   pays a premium. With a pool this size no single recipe satisfies the room,
   which is what finally kills monoculture at the demand end.
   `test(beer)` reads the style/axes the M2 restructure now provides.
   ============================================================================ */
DATA.REQUESTS = {
  red: [
    { key:"bitter",  txt:"somethin' BITTER",        test:b=>b.axes.b>=b.axes.s },
    { key:"sweet",   txt:"somethin' SWEET",         test:b=>b.axes.s>b.axes.b },
    { key:"nofunk",  txt:"nothin' funky",           test:b=>b.axes.f<=1 },
    { key:"noweird", txt:"nothin' WEIRD",           test:b=>b.axes.w<=0 },
    { key:"dark",    txt:"a dark one",              test:b=>["stout","porter","ipa"].includes(b.style) },
    { key:"easy",    txt:"somethin' easy-drinkin'", test:b=>["lager","amber","honey","fruit"].includes(b.style) },
    { key:"decent",  txt:"anythin' that ain't swill", test:b=>b.tier!=="swill" },
  ],
  green: [
    { key:"funky",   txt:"bonus if it's got FUNK",   pay:0.40, test:b=>b.axes.f>=2 },
    { key:"weird",   txt:"bonus if it's WEIRD",      pay:0.55, test:b=>b.axes.w>=2 },
    { key:"clean",   txt:"bonus for a clean pour",   pay:0.35, test:b=>(b.purity||0)>=0.95 },
    { key:"strong",  txt:"bonus if it's a big'un",   pay:0.35, test:b=>(b.total||0)>=9 },
    { key:"legend",  txt:"bonus for somethin' famous",pay:0.75, test:b=>!!b.legendary },
  ],
};

/* ============================================================================
   M5 — THE MOUNTAIN HAS POCKETS. It was a set, not a place: no collectible, no
   secret, no reason to walk anywhere without a task, and the spring/glacier
   trails paid out exactly one water tier each. Foraging gives the terrain a
   reason to exist — and it's SEASONAL, so the calendar drives where you walk.
   ============================================================================ */
DATA.FORAGE = [
  { key:"blackberry", name:"Blackberry Bramble", ing:"blackberry", col:0x3a2a4a,
    seasons:["summer","fall"], spots:[[-26,14],[-24,-2],[30,10],[-33,20]] },
  { key:"hops",  name:"Wild Hop Vine",  ing:"hops",   col:0x86b04c,
    seasons:["summer","fall"], spots:[[24,-14],[-30,-14],[33,-4]] },
  { key:"ramps", name:"Ramp Patch",     ing:"ramps",  col:0x9ed07a,
    seasons:["spring"], spots:[[8,-24],[-2,-20],[14,-30],[-20,-18]] },
  { key:"pawpaw",name:"Pawpaw Tree",    ing:"pawpaw", col:0xa8c24c,
    seasons:["fall"], spots:[[18,-20],[-27,-22],[27,18]] },
  { key:"honey", name:"Bee Tree",       ing:"honey",  col:0xe8a33d,
    seasons:["spring","summer"], spots:[[-16,-26],[21,-34]] },
  { key:"apple", name:"Wild Apple",     ing:"apple",  col:0xc84c3a,
    seasons:["fall","winter"], spots:[[-34,4],[31,-24]] },
];

/* Moonlighter's popularity curve: pour the same style every night and it sags
   on its own. Monoculture punishes itself — no balance patch required. */
/* ⚠️ decayPerDay was 0.34 — which fully cleared a night's fatigue by morning,
   so monoculture never actually compounded. At 0.12 a second night on the same
   style starts already sagging, which is the pressure to rotate. */
DATA.POP = { perPint:0.085, decayPerDay:0.12, floor:0.75, ceil:1.25 };
/* Recettear: reputation tracked PER CUSTOMER CLASS, not per individual. */
DATA.REP = { perGoodPint:0.09, perBadPint:-0.14, max:5, budgetPerLevel:0.10 };

/* ---- Bob's press column (reviews are wrong in funny ways, even the raves) ---- */
DATA.BOB_PRESS = {
  notes:["free-range crayons","locally-sourced regret","barrel-aged in a barrel","gluten","wet flannel",
         "artisanal pond","a ladder, somehow","forklift exhaust","grandma's porch","premium hose"],
  stars:{ legend:"★★★★★ — I wept into my bucket hat.", great:"★★★★ — dangerously drinkable.",
          good:"★★★ — honest mountain work.", decent:"★★ — it's beer, technically.",
          swill:"★ — my mistake was hope.", none:"unrated — nothing on tap. Reviewed the stools instead: sturdy." },
  fame:{ legend:8, great:5, good:3, decent:1, swill:-5, none:0 },
};

/* ---- fame ranks ---- */
DATA.RANKS = [
  { name:"Roadside Shack",  at:0 },
  { name:"Local Favorite",  at:40 },
  { name:"Holler Hero",     at:110, needs:"fair" },
  { name:"Regional Star",   at:220, needs:"regional" },
  { name:"Mountain Famous", at:380 },
  { name:"Best Brewery in the World", at:600, needs:"world" },
];

/* ---- quality tiers ---- */
/* ⚠️ M2 RECALIBRATION: these minimums were tuned against the OLD one-scalar
   potential curve. Under ratio→style the scores sit higher, and at the old
   thresholds **83% of all 1,139 combos reached "LEGENDARY" tier** — which
   destroys the word. Re-derived from the measured distribution. */
DATA.TIERS = [
  { key:"swill",  name:"Swill",  min:0,   col:"#8a9a6a", price:1.5 },
  { key:"decent", name:"Decent", min:1.5, col:"#c9c26a", price:3 },
  { key:"good",   name:"Good",   min:2.7, col:"#e8a33d", price:5 },
  { key:"great",  name:"Great",  min:4.0, col:"#e86a3d", price:8 },
  /* ⚠️ legend was 14 — MEASURED (n=4 evenings/cell) as the worst price in the
     game: $86 gross vs $133 at $10 and $142 at $6, and a QUARTER of what a
     Great earns at its own tag. $10 keeps it a premium tourist price while
     restoring "best beer = best money". See README's balance battery. */
  { key:"legend", name:"LEGENDARY", min:5.3, col:"#ffd98a", price:10 },
];

/* ---- beer name generator ---- */
DATA.NAMES = {
  styles: ["Ale","Lager","IPA","Amber","Porter","Pilsner","Sipper","Special","Draft","Brew"],
  byAxis: {
    s:["Sweetwater","Honeyed","Candy-Hearted","Syrupy","Orchard"],
    b:["Bitter Ridge","Hop-Jawed","Sharp-Tongued","Piney","Black Coffee"],
    f:["Funky Holler","Musky","Barn-Floor","Ramp-Rowdy","Swampy"],
    w:["Questionable","Cursed","Mystery","Backwoods","Don't-Ask"],
  },
  swill:["Yard Soup","Regret Water","Puddle Pride","Ditch Delight","Sorry Suds"],
  byIng: { fish:"Trout-Adjacent", sock:"Sock Hop", hotdog:"Ballpark", crayon:"Waxy", honey:"Bumblebee",
    blackberry:"Bramble", peach:"Fuzzy", pawpaw:"Pawpaw", ramps:"Stinkbulb", candy:"Gummy",
    coffee:"Midnight", apple:"Orchard", hops:"Hopped-Up", jar:"Moonlit" },
};

/* ---- dialogue ---- */
DATA.COPPERHEAD = {
  heckle1:"That ain't beer, boy. That's YARD SOUP. *honk honk*",
  jarNote:"“Found this in the back of the still. Figured yer swill could use the help. — C.S.”",
  raccoon:"Heh. Hope nothin' gets on yer roof today.",
  undercut:"Copperhead set up a stand by the road. Tourists came pre-watered today.",
  fairLose:"Hmph. Judges musta had colds.",
  fairWin:"County Fair don't mean nothin'. …Gimme that recipe.",
  loanOffer:"Ohh, look who's countin' nickels. Tell ya what — take the jar money. Two hundred. I'll come by for my taste, every day. Real friendly-like.",
  loanRepo:"Nothin' personal. My cousins just LOVE machinery.",
  loanPaid:"Huh. Didn't figure you for the payin' type. Respect. A little.",
};
DATA.JOE_LINES = [
  "…yer floors talk at night. I like that.",
  "brewed anything WRONG lately? I pay for wrong.",
  "the crick knows things, friend.",
];
DATA.DOT = {
  fine:"Ranger Dot: 'That tourist turned GREEN, sugar. That's a $25 fine and a warnin'.'",
  hi:"Ranger Dot's makin' rounds. Keep the swill away from the tourists.",
  hat:"Ranger Dot: 'Three clean nights. You've earned a REAL hat.' 🤠",
};
DATA.CH2 = {
  regionalIntro:"Regional Cup, huh. Cute. I've won it nine years runnin'. Bring tissues.",
  regionalCheat:"…is that YOUR keg on the judges' table? Smells like MY keg's shadow.",
  regionalLoseClean:"Judges got no taste. Never did.",
  regionalWin:"NINE. YEARS. …enjoy the little cup.",
  worldsIntro:"World Championship. You and me, boy. Bring whatever god you brew to.",
  worldsLose:"That's how it ends. Same as it started: you, holdin' yard soup.",
  worldsWin:"…best I ever tasted. I mean that. Now gimme a tap handle in that pub o' yours.",
  epilogue:"Copperhead's jerky rack has appeared in your gift shop. Some rivalries retire into friendship. The Smokies are like that.",
};
DATA.EVENTS = {
  stormMorn:"⛈️ Storm's rollin' over the ridge. Boils get MEAN and the power ain't promised.",
  blackout:"💥 POWER'S OUT! Machines are down — tonight you do it all by HAND.",
  powerBack:"🔌 Power's back. The machines hum apologetically.",
  leafMorn:"🍁 LEAF SEASON SATURDAY! A tour bus is comin' — triple the tourists, wallets fat as ticks.",
  bear1:"🐻 The Boys hit the dumpster last night. Spent grain EVERYWHERE.",
  bear2:"🐻🐻 The Boys are back. That dumpster's a buffet. EMPTY IT.",
  bearPub:"🐻 A BEAR IS IN THE PUB. NOBODY MOVE.",
  bearPubGood:"The bear had one sip of spilled beer and left. The tourists are ECSTATIC. Legend status.",
  bearPubBad:"The bear knocked over two stools and a hiker. Folks are rattled.",
  dumpsterClean:"Dumpster emptied. The Boys will have to eat berries like regular bears.",
};
DATA.BOB = [
  "“Rustic. Aggressively rustic.” — Barleycorn Bob",
  "“The foam spoke to me. It said 'help'. Four stars.” — Barleycorn Bob",
  "“I detected notes of ambition and hose.” — Barleycorn Bob",
];
DATA.TAGLINES = [
  "one dirtbag · one hose · one dream",
  "brew responsibly-ish",
  "the sock is a suggestion",
  "from the makers of poor decisions",
  "fresh off the mountain, unfortunately",
];

/* ---- tuning ---- */
DATA.TUNE = {
  startCash: 60,
  phaseLen: { morning: 115, afternoon: 135, evening: 170 },
  legendBonus: 1.0,                 // a Legendary always beats the best generic on that water
  /* M4 — automate the CHORE, never the JUDGMENT (PlateUp!). Machines keep you
     in the band so you can't fail; they just earn less credit for it. Coasting
     on three machines yields ~0.67× quality, so top-tier beer always wants
     your hands. Automation becomes safety + parallelism, not a replacement. */
  autoCreditLoss: 0.11,
  handsForLegend: 0.35,             // fraction of the boil you must actually work
  /* fame-scaled upkeep — converts a STOCK problem (cash) into a FLOW problem,
     which is the whole reason tycoon games stay tense. Total sink used to be
     ~$4,460 and then cash meant nothing forever. */
  upkeepBase: 4, upkeepPerFame: 0.08, upkeepPerMachine: 3, upkeepPerStaff: 18,
  grannyDriftPerBrew: 0.14,         // she wanders out of calibration; E to reset
  rockScale: 7,                     // porch rocker time speed-up
  standMarkup: 1.75,                // MawMaw's farm-stand convenience surcharge
  standKegPrice: 26,                // her one spare keg (catalog: 15. she knows.)
  pintsPerKeg: 18,
  boilTime: 38,
  fermentDays: 1,
  kegCost: 15,
  /* ⚠️ the loan needed cash<12 AND no keg AND no pints AND no fermenting —
     it almost never fired, so bible §11 beat 4 ("your lowest moment is his
     best scene") was effectively dead content. Reachable now, and it COMPOUNDS,
     so it can actually spiral the way the story wants it to. */
  loanAmount: 200, loanVig: 10, repoAt: 3, loanInterest: 0.06, loanGate: 30,
  fine: 25,
  custBase: 3.2,        // customers/min at fame 0 evening
  custFame: 0.035,      // + per fame point
  grainPerBrew: 1, bearAt: 3,      // spent grain units before the Boys visit
  leafEvery: 7,                     // leaf-peeper day cadence (in days)
  stormChance: 0.22,                // per-day storm roll (after day 3)
  foodChance: 0.55,                 // chance a served customer also wants food
  walkSpeed: 5.6, runMul: 1.45,
  carrySlow: { light: 1, mid: .82, heavy: .5 },
};

/* tutorial objective chains keyed by id */
DATA.OBJECTIVES = {
  d1: [
    { id:"water",  txt:"Fill the kettle — hose is hooked up (E at the kettle)" },
    { id:"grain",  txt:"Toss in a Barley Sack from the pantry shelf" },
    { id:"flavor", txt:"Add 1–3 flavor ingredients (grab → carry → E at kettle)" },
    { id:"boil",   txt:"Fire it up! Hold needles in the green (F fire · SPACE vent · S stir)" },
    { id:"xfer",   txt:"Pour the wort into the fermenter (E)" },
    { id:"bed",    txt:"Beer's sleeping. You should too — head to bed (E)" },
  ],
  d2: [
    { id:"kegit",  txt:"Grab a clean keg and fill it at the fermenter (E)" },
    { id:"tapit",  txt:"Carry the keg to the bar and tap it (E at a tap)" },
    { id:"price",  txt:"Set your price (E on the tap's tag)" },
    { id:"open",   txt:"Flip the OPEN sign at the pub door come evening" },
    { id:"serve",  txt:"Serve 3 customers (E behind the bar when they order)" },
  ],
};
