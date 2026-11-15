/* DELTA prototype — content & seed data.
   Everything here is placeholder content intended to be replaced via a CMS / admin.
   Reference ranges and rules are ILLUSTRATIVE ONLY and await clinical sign-off (brief §19). */

const PILLARS = [
  { id: 'body', n: 1, name: 'BODY', image: 'brand/nourish.jpg', alt: 'Vegetables and protein on a plate', short: 'Nourish and strengthen — vegetables, protein, water, and a simple shower practice.', tag: 'Nourish & Strengthen', icon: '◆',
    summary: 'Vegetables and protein, hydration, carrot juice and wheatgrass education, individual nutritional and supplement guidance with timing where appropriate, warm-to-cool showers and optional sauna.',
    note: 'Personalised advice lives in your Mineral Intelligence report and is kept separate from these general lessons.',
    lessons: ['Building a plate: vegetables & protein', 'Hydration basics', 'Carrot juice & wheatgrass: what we know', 'Timing your nutrition', 'Warm-to-cool showers', 'Sauna: an optional practice'] },
  { id: 'environment', n: 2, name: 'ENVIRONMENT', image: 'brand/space.jpg', alt: 'A bright room with plants and an open window', short: 'Create better spaces — air, light, less clutter, and kinder boundaries.', tag: 'Create Better Spaces', icon: '⬡',
    summary: 'Home and workplace conditions, damp and mould awareness, ventilation, clutter, relationships, boundaries, supportive social surroundings, comfort, enjoyment and creating positive spaces.',
    lessons: ['Damp & mould awareness', 'Ventilation at home', 'Clearing clutter', 'Relationships & boundaries', 'Supportive surroundings', 'Designing a space you enjoy'] },
  { id: 'ground', n: 3, name: 'GROUND', image: 'brand/ground.jpg', alt: 'Bare feet on grass', short: 'Reconnect — time outside, quieter screens, and an easy breath.', tag: 'Reconnect with Yourself and Nature', icon: '◎',
    summary: 'Nature, digital quiet, mindfulness, breathing, grounding practices and the Zhineng Qigong-inspired DELTA Energy Circuit golden-energy visualisation, with standing and lying options.',
    lessons: ['Time in nature', 'Digital quiet', 'Breathing foundations', 'Mindful grounding', 'DELTA Energy Circuit — standing', 'DELTA Energy Circuit — lying'] },
  { id: 'move', n: 4, name: 'MOVE', image: 'brand/move.jpg', alt: 'Walking a quiet path at sunrise', short: 'Get energy moving — a walk, a little strength, and a version that fits you.', tag: 'Build Strength & Get the Energy Moving', icon: '▲',
    summary: 'Brisk outdoor walking, appropriate inclines, resistance and strength, mobility, stretching, posture, Qi Gong and enjoyable sports — with accessible variations.',
    lessons: ['Brisk outdoor walking', 'Using inclines safely', 'Strength at home', 'Mobility & stretching', 'Posture check-in', 'Qi Gong for beginners'] },
  { id: 'release', n: 5, name: 'RELEASE', image: 'brand/release.jpg', alt: 'Two people laughing outdoors', short: 'Feel and let go — notice tension, and leave room for laughter.', tag: 'Feel, Express & Let Go', icon: '✦',
    summary: 'TER (Timeline Emotional Release), BTR (Body Tension Release) and ST (The Stillness Technique) — gentle, non-forcing practices — plus LAUGHOLOGY as a distinct entry point.',
    lessons: ['TER — present emotions & gentle timeline reflection', 'BTR — noticing and softening tension', 'ST — The Stillness Technique', 'Tapping: an introduction', 'LAUGHOLOGY: why laughter matters'] },
  { id: 'rest', n: 6, name: 'REST', image: 'brand/rest.jpg', alt: 'A calm bedroom in the evening', short: 'Restore — an evening routine and sleep treated as the practice.', tag: 'Restore & Renew', icon: '☾',
    summary: 'Sleep, recovery, evening routines, breathing, relaxation, massage, restorative practices and spiritual peace.',
    lessons: ['Sleep foundations', 'An evening wind-down routine', 'Breathing for relaxation', 'Self-massage basics', 'Restorative practice', 'Finding peace'] },
];

const EPISODES = [
  { id: 'e7', n: 7, title: 'What your hair can (and can\'t) tell you', date: '2026-11-04', topics: ['Minerals', 'Analysis'], host: 'Founder', guest: '', mins: 38, access: 'public', desc: 'An honest look at Hair Tissue Mineral Analysis — what it measures, its limitations, and why we treat it as education, not diagnosis.' },
  { id: 'e6', n: 6, title: 'Awakening: my story, part one', date: '2026-10-21', topics: ['Awakening', 'Founder'], host: 'Founder', guest: '', mins: 52, access: 'public', desc: 'The founder shares the beginning of a personal journey towards greater awareness.' },
  { id: 'e5', n: 5, title: 'Laughing your way to RELEASE', date: '2026-10-07', topics: ['RELEASE', 'Humour'], host: 'Founder', guest: 'Guest comedian', mins: 41, access: 'members', desc: 'Why laughter belongs in a wellbeing practice — with a lot of laughing.' },
  { id: 'e4', n: 4, title: 'Damp, mould and the spaces we live in', date: '2026-09-23', topics: ['ENVIRONMENT'], host: 'Founder', guest: 'Building surveyor', mins: 47, access: 'public', desc: 'Practical awareness of home conditions and how to create better spaces.' },
  { id: 'e3', n: 3, title: 'The DELTA Energy Circuit explained', date: '2026-09-09', topics: ['GROUND', 'Awakening'], host: 'Founder', guest: '', mins: 33, access: 'members', desc: 'A walk-through of the golden-energy visualisation, standing and lying.' },
  { id: 'e2', n: 2, title: 'Sleep, rest and renewal', date: '2026-08-26', topics: ['REST'], host: 'Founder', guest: 'Sleep coach', mins: 44, access: 'public', desc: 'Evening routines and restorative practices that support rest.' },
  { id: 'e1', n: 1, title: 'Welcome to DELTA — From Analysis to Awakening', date: '2026-08-12', topics: ['Founder', 'Six Pillars'], host: 'Founder', guest: '', mins: 29, access: 'public', desc: 'Introducing the six pillars and the idea behind the DELTA Experience.' },
];

const VIDEOS = [
  { id: 'v1', title: 'Meet Mineral Man: What is HTMA?', cat: 'Minerals', pillar: 'body', mins: 6, access: 'public', featured: true },
  { id: 'v2', title: 'Calcium & magnesium: the partnership', cat: 'Minerals', pillar: 'body', mins: 8, access: 'members' },
  { id: 'v3', title: 'Sodium, potassium and daily energy', cat: 'Minerals', pillar: 'body', mins: 7, access: 'members' },
  { id: 'v4', title: 'Reading your Mineral Intelligence report', cat: 'Your report', pillar: 'body', mins: 11, access: 'members', featured: true },
  { id: 'v5', title: 'Why we don\'t diagnose', cat: 'Your report', pillar: '', mins: 5, access: 'public' },
  { id: 'v6', title: 'How to take your hair sample', cat: 'Kit & sample', pillar: '', mins: 4, access: 'public' },
  { id: 'v7', title: 'Supplements: safety first', cat: 'Your report', pillar: 'body', mins: 9, access: 'members' },
  { id: 'v8', title: 'Mineral Man on the move', cat: 'Lifestyle', pillar: 'move', mins: 6, access: 'members' },
];

const PARTNERS = [
  { id: 'p1', name: 'Verdant Nutrition', cat: 'Supplements & nutrition', desc: 'Third-party tested food-state supplements.', code: 'DELTA10', paid: false, affiliate: true, active: true, clicks: 41 },
  { id: 'p2', name: 'Earthwise Living', cat: 'Grounding & environment', desc: 'Natural-fibre bedding and home-environment products.', code: '', paid: true, affiliate: true, active: true, clicks: 18 },
  { id: 'p3', name: 'Lantern Books', cat: 'Books & conscious living', desc: 'An independent bookshop for consciousness, philosophy and wellbeing.', code: 'DELTA5', paid: false, affiliate: true, active: true, clicks: 27 },
  { id: 'p4', name: 'Stillwater Sleep', cat: 'Movement, sleep & restoration', desc: 'Sleep and recovery accessories.', code: '', paid: false, affiliate: false, active: true, clicks: 9 },
  { id: 'p5', name: 'Trailhead Footwear', cat: 'Movement, sleep & restoration', desc: 'Comfortable walking footwear.', code: 'WALK15', paid: true, affiliate: true, active: false, clicks: 3 },
];

const FAQS = [
  ['What is included in the DELTA Experience?', 'One purchase includes your hair mineral test kit, laboratory analysis, your automatically prepared Mineral Intelligence report, a safety-screened proposed programme, and six months of full member access to all six pillars, Awakening, the DELTA Podcast, Meet Mineral Man, LAUGHOLOGY, community groups and the Partner Collective.'],
  ['Is HTMA a medical test?', 'No. Hair Tissue Mineral Analysis is not a standalone diagnostic tool. DELTA provides educational interpretation, not diagnosis or treatment. Always speak to your doctor about medical concerns.'],
  ['How does the six-month access work?', 'Each qualifying test purchase gives six months of full access. If you buy a repeat test early, six months is added from your current expiry date, so you never lose time.'],
  ['What happens when my access expires?', 'Member-only learning and groups pause, but your account and your historical reports are kept under our retention policy, and you can still access or export your personal information. Buying a new test reactivates everything.'],
  ['Do I need a personal consultation?', 'No — your report and learning path are delivered automatically. If you\'d like one, you can buy an optional practitioner voice note that explains your report or answers a set of questions.'],
  ['Will I receive supplement recommendations?', 'A proposed programme may be included, but only after safety screening. If anything in your intake (for example pregnancy, medications or medical conditions) needs professional judgement, your case is reviewed before any personalised supplement advice is released.'],
  ['Is retesting required?', 'Retesting is offered as a way to renew and to compare results over time. It is not presented as medically essential for everyone at a fixed interval.'],
  ['Is my health data safe?', 'Health information is special-category data. It is encrypted, access is role-restricted and audited, and we never use identifiable health records to train third-party AI systems.'],
];

const JOKES = [
  'I told my mineral report a joke. It had a great sense of humour — very well-balanced.',
  'Why did the magnesium go to therapy? It had too many unresolved bonds.',
  'My doctor told me to watch my iron levels. Now I just stare at the kettle.',
];

/* Illustrative HTMA panel — same shape and placeholder bands as the Grok build ({name,label,value,low,high,unit}).
   Bands are PLACEHOLDERS for the prototype only and must be replaced by the chosen laboratory's intervals. */
const MINERALS = [
  { name: 'Ca', label: 'Calcium', low: 40, high: 80, unit: 'mg%' },
  { name: 'Mg', label: 'Magnesium', low: 4, high: 8, unit: 'mg%' },
  { name: 'Na', label: 'Sodium', low: 20, high: 35, unit: 'mg%' },
  { name: 'K', label: 'Potassium', low: 5, high: 12, unit: 'mg%' },
  { name: 'Zn', label: 'Zinc', low: 12, high: 22, unit: 'mg%' },
  { name: 'Cu', label: 'Copper', low: 1.5, high: 2.5, unit: 'mg%' },
];
const DEMO_RESULT = { Ca: 62, Mg: 3.2, Na: 18, K: 8, Zn: 16, Cu: 2.8 }; // the Grok demo values
const TOXIC = [
  { name: 'Pb', label: 'Lead', unit: 'mg%', high: 0.10 },
  { name: 'Hg', label: 'Mercury', unit: 'mg%', high: 0.04 },
  { name: 'Cd', label: 'Cadmium', unit: 'mg%', high: 0.01 },
  { name: 'Al', label: 'Aluminium', unit: 'mg%', high: 0.70 },
];
const RATIOS = [
  { id: 'Ca/Mg', a: 'Ca', b: 'Mg', low: 5, high: 10 },
  { id: 'Na/K', a: 'Na', b: 'K', low: 2, high: 3 },
  { id: 'Zn/Cu', a: 'Zn', b: 'Cu', low: 6, high: 10 },
];

/* Version-controlled educational rule set. Each rule: condition → explanation + lessons + programme template.
   Programme templates intentionally contain NO doses: protocol awaits clinical sign-off (brief §19). */
const RULESETS = {
  'R-2026.11-v1': {
    approvedBy: 'Founder (draft — pending clinical sign-off)', date: '2026-11-01',
    rules: [
      { id: 'MG-LOW', when: v => v.Mg < 4, title: 'Magnesium below reference interval',
        text: 'Your magnesium reading sits below the reference interval used by DELTA. Magnesium is widely discussed in relation to relaxation and rest. This is educational context, not a diagnosis.',
        lessons: ['rest', 'body'], prog: 'Magnesium-rich food focus; supplement template MG-A (practitioner-approved protocol)', supplement: true },
      { id: 'CAMG-HIGH', when: (v, r) => r['Ca/Mg'] > 10, title: 'Higher calcium-to-magnesium ratio',
        text: 'Your calcium-to-magnesium ratio is above the interval DELTA uses. We explain what this ratio is generally thought to reflect in the "Calcium & magnesium" video.',
        lessons: ['body', 'rest'], prog: 'Education: Ca/Mg balance video & food sources', supplement: false },
      { id: 'NAK-LOW', when: (v, r) => r['Na/K'] < 2, title: 'Lower sodium-to-potassium ratio',
        text: 'Your sodium-to-potassium ratio is below the DELTA interval. Many practitioners associate this ratio with energy patterns; we suggest starting with the MOVE and REST pillars.',
        lessons: ['move', 'rest'], prog: 'Daily brisk walk & evening wind-down routine', supplement: false },
      { id: 'NA-LOW', when: v => v.Na < 20, title: 'Sodium below reference interval',
        text: 'Your sodium reading sits below the laboratory band. We cover hydration and everyday energy in the BODY and REST lessons.',
        lessons: ['body', 'rest'], prog: 'Hydration habits lesson & evening routine', supplement: false },
      { id: 'ZN-LOW', when: v => v.Zn < 12, title: 'Zinc below reference interval',
        text: 'Your zinc reading is below the reference interval. Zinc-containing foods are covered in BODY lessons.',
        lessons: ['body'], prog: 'Zinc-rich food focus; supplement template ZN-A (practitioner-approved protocol)', supplement: true },
      { id: 'CU-HIGH', when: v => v.Cu > 2.5, title: 'Copper above reference interval',
        text: 'Your copper reading is above the reference interval. Because copper and zinc interact, this is considered alongside your zinc result.',
        lessons: ['body', 'environment'], prog: 'Review of water/pipework awareness (ENVIRONMENT lesson)', supplement: false },
      { id: 'TOXIC', when: (v, r, t) => t.length > 0, title: 'Elevated toxic-element reading',
        text: 'One or more toxic elements are above the DELTA reference level. This has been flagged for professional review. If you have health concerns, please speak to your GP.',
        lessons: ['environment'], prog: 'Held for practitioner review', supplement: false, review: true },
    ],
    baseline: { lessons: ['ground', 'release'], prog: 'Start with the DELTA Daily Practice: 10 minutes of grounding and one RELEASE lesson per week.' },
  },
};
const CURRENT_RULESET = 'R-2026.11-v1';

/* Safety screening questions — any "yes" routes personalised supplement advice to human review. */
const SAFETY_QS = [
  { id: 'pregnant', q: 'Are you pregnant, trying to conceive or breastfeeding?' },
  { id: 'meds', q: 'Are you taking any prescription medication (including blood thinners, thyroid, diuretics or antibiotics)?' },
  { id: 'kidney', q: 'Do you have a kidney, liver or heart condition?' },
  { id: 'chronic', q: 'Are you under medical care for any other diagnosed condition?' },
  { id: 'supps', q: 'Are you currently taking supplements?' },
];
