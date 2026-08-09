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
  fish:      { name:"Rotten Fish",       cost:3,  s:0,b:0,f:2,w:3, cursed:true, look:"fish",  col:0x7a9a8a },
  sock:      { name:"Old Sock",          cost:2,  s:0,b:0,f:3,w:2, cursed:true, look:"sock",  col:0xb0a890 },
  hotdog:    { name:"Hot Dog Water",     cost:2,  s:0,b:0,f:2,w:2, cursed:true, look:"jar",   col:0xc2907a },
  crayon:    { name:"One (1) Crayon",    cost:1,  s:1,b:0,f:0,w:3, cursed:true, look:"crayon",col:0xe8483a },
  jar:       { name:"Copperhead's Mystery Jar", cost:0, s:1,b:1,f:2,w:3, cursed:true, secret:true, look:"jar", col:0xd8d2b0 },
};

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
  { key:"hefe",    name:"Hot Dog Hefeweizen", ing:["barleyx","hotdog"],     water:"sink",   hint:"Ballpark in a glass: dog water, extra grain, and the sink knows what it did." },
  { key:"iceage",  name:"Ice Age IPA",        ing:["apple","hops"],         water:"glacier",hint:"When you finally haul the old ice down, bring apples and bitters to meet it." },
  { key:"moon",    name:"Moonlight Special",  ing:["jar"],                  water:null,     hint:null, wild:true },
  { key:"sudsy",   name:"The Grand Ol' Sudsy",ing:["blackberry","honey"],   water:"glacier",hint:"The champion's pour: glacier cold, berry dark, sourwood sweet. That one wins wars." },
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
DATA.CUSTOMERS = {
  local:  { name:"Local",  wallet:9,  sense:1.2, tipMul:0.8, fameMul:1.4, col:0x7a6a4c, chat:["evenin'","the usual, if it's drinkable","how's the roof holdin' up?"] },
  tourist:{ name:"Tourist",wallet:22, sense:0.6, tipMul:1.6, fameMul:1.0, col:0xe86a5a, chat:["is this CRAFT?","we drove nine hours!","do y'all have wifi?"] },
  hiker:  { name:"Hiker",  wallet:12, sense:0.3, tipMul:1.0, fameMul:0.7, col:0x5a8a5a, chat:["water first. then beer.","I smelled this place from the ridge","carbs are carbs"] },
  joe:    { name:"Hollow Joe", wallet:99, sense:0, tipMul:3.0, fameMul:1.0, col:0x6a6a7a, special:true },
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
DATA.TIERS = [
  { key:"swill",  name:"Swill",  min:0,   col:"#8a9a6a", price:1.5 },
  { key:"decent", name:"Decent", min:1.2, col:"#c9c26a", price:3 },
  { key:"good",   name:"Good",   min:2.2, col:"#e8a33d", price:5 },
  { key:"great",  name:"Great",  min:3.2, col:"#e86a3d", price:8 },
  { key:"legend", name:"LEGENDARY", min:4.2, col:"#ffd98a", price:14 },
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
  pintsPerKeg: 18,
  boilTime: 38,
  fermentDays: 1,
  kegCost: 15,
  loanAmount: 200, loanVig: 10, repoAt: 3,
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
