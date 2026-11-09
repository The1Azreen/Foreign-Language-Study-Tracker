// Static content: roadmap, milestones, resources, activity types.
// Edit freely — progress is stored by item id, so keep ids stable.

window.CONTENT = {
  activityTypes: [
    { id: 'reading',   label: 'Reading',            icon: '📖', active: true },
    { id: 'watching',  label: 'Watching (anime/TV/YT)', icon: '📺', active: true },
    { id: 'listening', label: 'Listening (podcast/audio)', icon: '🎧', active: true },
    { id: 'condensed', label: 'Condensed audio (passive)', icon: '🔁', active: false },
    { id: 'anki',      label: 'Anki / SRS',         icon: '🗂️', active: true },
    { id: 'grammar',   label: 'Grammar study',      icon: '📐', active: true },
    { id: 'pitch',     label: 'Pitch accent',       icon: '🎵', active: true },
    { id: 'speaking',  label: 'Speaking / shadowing', icon: '🗣️', active: true },
    { id: 'writing',   label: 'Writing / output',   icon: '✍️', active: true },
    { id: 'class',     label: 'Tutor / class',      icon: '👩‍🏫', active: true },
  ],

  // Hour milestones are rough community estimates for an English speaker
  // (FSI Category IV ≈ 2,200 class hours; immersion learners report N1-ish
  // comprehension somewhere around 1,500–3,000 hours of input).
  hourMilestones: [
    { hours: 50,   label: 'Kana solid, survival phrases' },
    { hours: 150,  label: 'Core grammar read through' },
    { hours: 300,  label: 'Slice-of-life anime with JP subs is possible' },
    { hours: 600,  label: 'Light novels / easy native content' },
    { hours: 1000, label: 'Most native content followable' },
    { hours: 1500, label: 'Comfortable N2-level comprehension' },
    { hours: 2500, label: 'N1 / professional range' },
  ],

  wordMilestones: [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000],

  certifications: [
    { id: 'jlpt-n5', label: 'JLPT N5', note: 'Basic. ~800 words, ~100 kanji.' },
    { id: 'jlpt-n4', label: 'JLPT N4', note: '~1,500 words, ~300 kanji.' },
    { id: 'jlpt-n3', label: 'JLPT N3', note: 'Bridge level. ~3,750 words, ~650 kanji.' },
    { id: 'jlpt-n2', label: 'JLPT N2', note: 'Common minimum for office jobs in Japan; points on the HSP visa.' },
    { id: 'jlpt-n1', label: 'JLPT N1', note: 'Preferred by many employers; 15 HSP visa points.' },
    { id: 'bjt',     label: 'BJT Business Japanese (J2+)', note: 'Business-context test; useful on a CV for Japanese companies.' },
  ],

  // Year 1 plan for an absolute beginner. Month 1 starts on Settings → Start date.
  // targets: cumulative total hours + mature Anki cards by the END of the month.
  // routine: suggested minutes per day for this month.
  yearPlan: [
    {
      month: 1, title: 'Kana & the sounds of Japanese',
      focus: 'Read hiragana and katakana fluently, learn how Japanese sounds work, and build a daily listening habit. Start your core deck in week 3.',
      routine: { 'Kana / Anki': 25, 'Listening (anything you enjoy)': 30, 'Grammar (from week 3)': 10 },
      targets: { hours: 25, mature: 0 },
      tasks: [
        { id: 'y1m1-krashen', text: 'Day 1: watch Stephen Krashen on Comprehensible Input' },
        { id: 'y1m1-hira', text: 'Week 1: learn all hiragana (Tofugu mnemonics + Anki kana deck)' },
        { id: 'y1m1-kata', text: 'Week 2: learn all katakana' },
        { id: 'y1m1-sounds', text: 'Week 2: long vowels, small っ, ん, mora timing (おばさん vs おばあさん)' },
        { id: 'y1m1-naito', text: 'Watch Kaname Naito “Basics of Japanese Pitch Accent” (just for awareness)' },
        { id: 'y1m1-kotu', text: 'Take the kotu.io pitch perception test, write down your baseline score' },
        { id: 'y1m1-kaishi', text: 'Week 3: start Kaishi 1.5k at 10 new cards/day' },
        { id: 'y1m1-dolly', text: 'Week 3–4: Cure Dolly videos 1–5' },
        { id: 'y1m1-listen', text: 'Listen/watch Japanese 30 min every day (understanding nothing is OK)' },
      ],
    },
    {
      month: 2, title: 'First words & sentence structure',
      focus: 'Steady core vocabulary and the core structure of Japanese sentences: particles, は vs が, verbs at the end.',
      routine: { 'Anki (Kaishi)': 25, 'Grammar': 15, 'Listening / watching': 35 },
      targets: { hours: 55, mature: 100 },
      tasks: [
        { id: 'y1m2-kaishi', text: 'Kaishi 1.5k: 10–15 new/day, never skip reviews (~400 words seen)' },
        { id: 'y1m2-dolly', text: 'Cure Dolly videos 6–20' },
        { id: 'y1m2-taekim', text: 'Tae Kim: Basic Grammar — state of being, particles, verbs, negative, past' },
        { id: 'y1m2-tadoku0', text: 'Read 5 Tadoku level 0 graded readers (free)' },
        { id: 'y1m2-shadow', text: 'Shadow 5 min a few times/week (repeat audio lines out loud)' },
      ],
    },
    {
      month: 3, title: 'Grammar foundation complete',
      focus: 'Finish Tae Kim Basic Grammar and start reading easy material every day.',
      routine: { 'Anki (Kaishi)': 25, 'Grammar': 15, 'Reading': 20, 'Listening / watching': 30 },
      targets: { hours: 90, mature: 350 },
      tasks: [
        { id: 'y1m3-kaishi', text: 'Kaishi 1.5k: ~800 words seen' },
        { id: 'y1m3-taekim', text: 'Tae Kim: finish Basic Grammar (adjectives, verb particles, relative clauses)' },
        { id: 'y1m3-tadoku1', text: 'Tadoku level 1 readers + NHK News Web Easy (1 article/day)' },
        { id: 'y1m3-jpsubs', text: 'Watch one episode of a simple anime with Japanese subtitles' },
        { id: 'y1m3-setup', text: 'Finish Yomitan setup: dictionaries imported, Anki fields mapped, test on a webpage' },
      ],
    },
    {
      month: 4, title: 'Start mining with Yomitan',
      focus: 'Finish your first ~1,200 core words and begin adding words from real content with Yomitan.',
      routine: { 'Anki (core + mining)': 30, 'Grammar': 10, 'Reading': 30, 'Listening / watching': 30 },
      targets: { hours: 135, mature: 650 },
      tasks: [
        { id: 'y1m4-kaishi', text: 'Kaishi 1.5k: ~1,200 words seen' },
        { id: 'y1m4-mine', text: 'Mine your first 50 words with Yomitan into the Mining deck' },
        { id: 'y1m4-taekim', text: 'Tae Kim: start Essential Grammar (polite form, て-form, potential, conditionals)' },
        { id: 'y1m4-manga', text: 'Start an easy manga (e.g. よつばと!) or a children’s book' },
        { id: 'y1m4-ttsu', text: 'Load your first EPUB into ttsu reader and log characters read' },
      ],
    },
    {
      month: 5, title: 'Core deck done',
      focus: 'Finish Kaishi; mining becomes your main source of new cards.',
      routine: { 'Anki (core + mining)': 30, 'Grammar': 10, 'Reading': 35, 'Listening / watching': 40 },
      targets: { hours: 185, mature: 950 },
      tasks: [
        { id: 'y1m5-kaishi', text: 'Finish Kaishi 1.5k (all cards introduced)' },
        { id: 'y1m5-mine', text: 'Mining 5–10 new words/day' },
        { id: 'y1m5-taekim', text: 'Tae Kim: continue Essential Grammar' },
        { id: 'y1m5-n5', text: 'Do a JLPT N5 practice test (just to see where you are)' },
        { id: 'y1m5-podcast', text: 'Try a beginner podcast (e.g. Nihongo con Teppei for beginners)' },
      ],
    },
    {
      month: 6, title: 'First real native content',
      focus: 'Finish a full season of anime/drama in Japanese, and start speaking.',
      routine: { 'Anki': 30, 'Reading': 35, 'Listening / watching': 50, 'Speaking / shadowing': 10 },
      targets: { hours: 240, mature: 1250 },
      tasks: [
        { id: 'y1m6-season', text: 'Finish a full season of a slice-of-life anime with Japanese subs' },
        { id: 'y1m6-tutor', text: 'Book your first tutor lesson (italki etc.), then 1×/week' },
        { id: 'y1m6-dogen', text: 'Start Dogen’s pitch-accent series (first episodes)' },
        { id: 'y1m6-taekim', text: 'Tae Kim: finish Essential Grammar' },
        { id: 'y1m6-jlpt', text: 'Check JLPT dates and register for the next sitting (N4, or N3 if ready)' },
      ],
    },
    {
      month: 7, title: 'Reading momentum',
      focus: 'Read native material daily; aim for your first full manga volume or easy light novel.',
      routine: { 'Anki': 30, 'Reading': 45, 'Listening / watching': 50, 'Speaking / shadowing': 10 },
      targets: { hours: 300, mature: 1550 },
      tasks: [
        { id: 'y1m7-volume', text: 'Finish one full manga volume or easy book' },
        { id: 'y1m7-special', text: 'Tae Kim: Special Expressions section' },
        { id: 'y1m7-mine', text: 'Mining 10–15/day; keep daily reviews under ~45 min' },
        { id: 'y1m7-speed', text: 'Note your ttsu reading speed (chars/hour) for later comparison' },
      ],
    },
    {
      month: 8, title: 'Listening without pictures',
      focus: 'Podcasts and condensed audio to train pure listening; start writing short sentences.',
      routine: { 'Anki': 30, 'Reading': 45, 'Listening (podcasts / condensed audio)': 60, 'Speaking / writing': 15 },
      targets: { hours: 365, mature: 1850 },
      tasks: [
        { id: 'y1m8-podcasts', text: 'Find 3 podcasts you can follow ~50% of' },
        { id: 'y1m8-condensed', text: 'Make condensed audio of a show you watched and listen while commuting/cleaning' },
        { id: 'y1m8-diary', text: 'Write 3 short diary sentences a day and get corrections (tutor / LangCorrect)' },
        { id: 'y1m8-dogen', text: 'Continue Dogen pitch-accent series' },
      ],
    },
    {
      month: 9, title: 'First novel',
      focus: 'Finish your first light novel or visual novel; start using a Japanese–Japanese dictionary sometimes.',
      routine: { 'Anki': 30, 'Reading': 60, 'Listening / watching': 60, 'Speaking / writing': 15 },
      targets: { hours: 435, mature: 2150 },
      tasks: [
        { id: 'y1m9-novel', text: 'Finish your first light novel or visual novel' },
        { id: 'y1m9-mono', text: 'Use a monolingual dictionary for easy lookups (add one to Yomitan)' },
        { id: 'y1m9-kotu', text: 'Re-take the kotu.io pitch test and compare with your baseline' },
      ],
    },
    {
      month: 10, title: 'Speaking more',
      focus: 'Increase speaking to twice a week; finish Tae Kim completely.',
      routine: { 'Anki': 30, 'Reading': 60, 'Listening / watching': 60, 'Speaking': 20 },
      targets: { hours: 510, mature: 2450 },
      tasks: [
        { id: 'y1m10-taekim', text: 'Tae Kim: Advanced Topics (keigo intro, formal expressions)' },
        { id: 'y1m10-tutor', text: 'Tutor / conversation 2×/week' },
        { id: 'y1m10-n3mock', text: 'Do a JLPT N3 practice test' },
      ],
    },
    {
      month: 11, title: 'Drop the English',
      focus: 'Watch without English subtitles at all; mostly native content.',
      routine: { 'Anki': 30, 'Reading': 60, 'Listening / watching': 75, 'Speaking': 20 },
      targets: { hours: 590, mature: 2750 },
      tasks: [
        { id: 'y1m11-noeng', text: 'A full month with no English subtitles' },
        { id: 'y1m11-news', text: 'Read or listen to regular (not Easy) NHK news once a week' },
        { id: 'y1m11-intro', text: 'Be able to introduce yourself + your job/goals for 2 minutes without notes' },
      ],
    },
    {
      month: 12, title: 'Review the year & plan year 2',
      focus: 'Check your progress, sit the JLPT if registered, and set year 2 goals (N2, business Japanese).',
      routine: { 'Anki': 30, 'Reading': 60, 'Listening / watching': 75, 'Speaking': 20 },
      targets: { hours: 675, mature: 3000 },
      tasks: [
        { id: 'y1m12-jlpt', text: 'Sit JLPT N4/N3 (or a full mock test)' },
        { id: 'y1m12-review', text: 'Review the tracker: hours, mature cards, reading speed, pitch score' },
        { id: 'y1m12-plan', text: 'Set year 2 goals in Settings (target hours, target date)' },
      ],
    },
  ],

  roadmap: [
    {
      id: 'p0', title: 'Phase 0 — Setup the toolchain', goal: 'Get Anki, Yomitan and your reading/listening tools wired together so mining is one click.',
      items: [
        { id: 'p0-anki', text: 'Install Anki desktop + create an AnkiWeb account (sync to phone with AnkiMobile/AnkiDroid)' },
        { id: 'p0-ankiconnect', text: 'Install the AnkiConnect add-on (code 2055492159) and restart Anki' },
        { id: 'p0-yomitan', text: 'Install Yomitan in your browser' },
        { id: 'p0-dicts', text: 'Import dictionaries into Yomitan (JMdict English + a monolingual one + pitch accent + frequency lists)' },
        { id: 'p0-yomitan-anki', text: 'Yomitan → Settings → Anki: enable, pick a mining deck + note type, map fields (word, reading, sentence, definition, audio, pitch)' },
        { id: 'p0-ttsu', text: 'Set up ttsu reader for EPUBs (Yomitan works inside it)' },
        { id: 'p0-asbplayer', text: 'Optional: asbplayer / animebook for subtitled video mining' },
        { id: 'p0-tracker', text: 'Connect this tracker to Anki (Anki tab) and pick your decks' },
      ],
    },
    {
      id: 'p1', title: 'Phase 1 — Kana & foundations (weeks 1–3)', goal: 'Read hiragana/katakana fluently and understand how Japanese sentences are built.',
      items: [
        { id: 'p1-hira', text: 'Hiragana — recognize all 46 + dakuten without hesitation' },
        { id: 'p1-kata', text: 'Katakana — recognize all 46 + dakuten' },
        { id: 'p1-krashen', text: 'Watch Stephen Krashen on Comprehensible Input (the “why” of this whole plan)' },
        { id: 'p1-pitch-intro', text: 'Watch a pitch-accent intro (Kaname Naito “Basics of Japanese Pitch Accent”)' },
        { id: 'p1-kotu', text: 'Take the kotu.io pitch-accent minimal-pair perception test (baseline score)' },
        { id: 'p1-daily', text: 'Start a daily habit: 20+ min of Japanese audio/video even if you understand nothing' },
      ],
    },
    {
      id: 'p2', title: 'Phase 2 — Core vocab + grammar (months 1–4)', goal: 'Build a ~1,500–2,000 word base and read through a grammar guide once.',
      items: [
        { id: 'p2-core-deck', text: 'Start a core deck (Kaishi 1.5k or jpdb’s frequency deck) — 10–20 new cards/day' },
        { id: 'p2-taekim-basic', text: 'Tae Kim: Basic Grammar section' },
        { id: 'p2-taekim-essential', text: 'Tae Kim: Essential Grammar section' },
        { id: 'p2-curedolly', text: 'Cure Dolly “Japanese from Scratch” series (particle/structure intuition)' },
        { id: 'p2-1000', text: 'Reach 1,000 mature cards' },
        { id: 'p2-graded', text: 'Read 5+ graded readers (Tadoku / NHK Easy News)' },
        { id: 'p2-n5', text: 'Optional: sit a JLPT N5/N4 mock test' },
      ],
    },
    {
      id: 'p3', title: 'Phase 3 — Immersion bootstrapping (months 4–12)', goal: 'Shift most time to native content; mine unknown words with Yomitan.',
      items: [
        { id: 'p3-mining', text: 'Switch from premade deck to sentence mining (Yomitan → Anki) as main new-card source' },
        { id: 'p3-first-show', text: 'Finish a full anime/drama season with Japanese subtitles' },
        { id: 'p3-first-vn', text: 'Finish your first light novel or visual novel (ttsu / Textractor)' },
        { id: 'p3-podcast', text: 'Find 3 podcasts you can follow ~50% of (Podcast spreadsheet / Condensed Audio Catalogue)' },
        { id: 'p3-taekim-adv', text: 'Tae Kim: Special Expressions + Advanced Topics' },
        { id: 'p3-pitch-dogen', text: 'Dogen’s pitch-accent series (patreon or public playlist)' },
        { id: 'p3-mono', text: 'Start using a monolingual (JP→JP) dictionary for some lookups' },
        { id: 'p3-3000', text: 'Reach 3,000 mature cards' },
        { id: 'p3-n3', text: 'Pass JLPT N3 (or mock-test at N3)' },
      ],
    },
    {
      id: 'p4', title: 'Phase 4 — Intermediate fluency (year 2)', goal: 'Native content without subs, start output, prepare for N2.',
      items: [
        { id: 'p4-nosubs', text: 'Watch a show with no subtitles and follow the plot' },
        { id: 'p4-novels', text: 'Read 10 native novels (Aozora Bunko / your library)' },
        { id: 'p4-mono-switch', text: 'Switch mining definitions to monolingual' },
        { id: 'p4-shadow', text: 'Shadowing practice 3×/week with pitch awareness' },
        { id: 'p4-tutor', text: 'Weekly conversation with a tutor (italki etc.)' },
        { id: 'p4-journal', text: 'Write a short diary entry daily and get corrections' },
        { id: 'p4-5000', text: 'Reach 5,000 mature cards' },
        { id: 'p4-n2', text: 'Pass JLPT N2' },
      ],
    },
    {
      id: 'p5', title: 'Phase 5 — Work-ready (year 3+)', goal: 'Business Japanese, keigo, and the job hunt in Japan.',
      items: [
        { id: 'p5-keigo', text: 'Study keigo (尊敬語・謙譲語・丁寧語) and business email conventions' },
        { id: 'p5-news', text: 'Follow NHK / Nikkei news daily' },
        { id: 'p5-field', text: 'Mine vocabulary from your professional field' },
        { id: 'p5-rirekisho', text: 'Write your 履歴書 and 職務経歴書' },
        { id: 'p5-interview', text: 'Mock job interviews (面接) in Japanese' },
        { id: 'p5-bjt', text: 'Take the BJT Business Japanese test' },
        { id: 'p5-n1', text: 'Pass JLPT N1' },
        { id: 'p5-visa', text: 'Research visa route (Engineer/Specialist in Humanities, HSP points)' },
      ],
    },
  ],

  resources: [
    {
      category: 'Method',
      items: [
        { name: 'Stephen Krashen — Comprehensible Input', url: 'https://www.youtube.com/results?search_query=Stephen+Krashen+Language+Acquisition', note: 'Why input-based learning works.' },
      ],
    },
    {
      category: 'Anki / SRS',
      items: [
        { name: 'Anki', url: 'https://apps.ankiweb.net/', note: 'The SRS app itself.' },
        { name: 'AnkiConnect add-on', url: 'https://ankiweb.net/shared/info/2055492159', note: 'Code 2055492159. Required for Yomitan mining and this tracker.' },
        { name: 'Pre-made shared decks', url: 'https://ankiweb.net/shared/decks', note: 'Kaishi 1.5k is a popular modern core deck.' },
        { name: 'Immersion Kit', url: 'https://www.immersionkit.com/dictionary', note: 'Example sentences w/ audio+images from anime/dramas; exports to Anki.' },
        { name: 'jpdb', url: 'https://jpdb.io/', note: 'Frequency-sorted decks per show/novel; built-in SRS.' },
      ],
    },
    {
      category: 'Pitch accent',
      items: [
        { name: 'kotu.io perception test', url: 'https://kotu.io/tests/pitchAccent/minimalPairs', note: 'Measure whether you can hear pitch differences.' },
        { name: 'Dogen — Pitch Accent in 10 Minutes (playlist)', url: 'https://www.youtube.com/results?search_query=Dogen+Japanese+Pitch-Accent+in+10+Minutes', note: '' },
        { name: 'Kaname Naito — Basics of Japanese Pitch Accent', url: 'https://www.youtube.com/results?search_query=Kaname+Naito+Basics+of+Japanese+Pitch+Accent', note: '' },
      ],
    },
    {
      category: 'Listening',
      items: [
        { name: 'Condensed Audio Catalogue', url: 'https://condensedaudiocatalog.com/', note: 'Dialogue-only audio of shows for passive listening.' },
        { name: 'Podcast spreadsheet', url: '', note: 'Paste the full Google Sheets link here (it was truncated).' },
      ],
    },
    {
      category: 'Dictionaries',
      items: [
        { name: 'Jisho', url: 'https://jisho.org/', note: 'JP↔EN.' },
        { name: 'Weblio', url: 'https://www.weblio.jp/', note: 'Monolingual JP.' },
      ],
    },
    {
      category: 'Popup dictionaries',
      items: [
        { name: 'Yomitan (successor to Yomichan)', url: 'https://github.com/yomidevs/yomitan', note: 'Hover-lookup + one-click Anki card creation. Use this, not Yomichan.' },
        { name: 'Yomitan dictionaries list', url: 'https://yomitan.wiki/dictionaries/', note: 'JMdict, frequency lists, pitch (Kanjium), monolingual. (Your MediaFire links were truncated.)' },
      ],
    },
    {
      category: 'Grammar',
      items: [
        { name: 'Tae Kim’s Guide to Japanese', url: 'https://guidetojapanese.org/learn/grammar', note: 'Read through once, then reference.' },
        { name: 'Cure Dolly (Organic Japanese)', url: 'https://www.youtube.com/@organicjapanesewithcuredol49', note: 'Structural explanations of particles and verbs.' },
      ],
    },
    {
      category: 'Reading',
      items: [
        { name: 'ttsu reader', url: 'https://reader.ttsu.app/manage', note: 'EPUB reader with character count + Yomitan support.' },
        { name: 'Aozora Bunko', url: 'https://www.aozora.gr.jp/', note: 'Public-domain Japanese literature.' },
        { name: 'NHK News Web Easy', url: 'https://www3.nhk.or.jp/news/easy/', note: 'Simplified news with furigana.' },
      ],
    },
  ],
};
