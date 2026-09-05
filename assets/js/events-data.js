/**
 * Single source of truth for all current/upcoming Acidity programme events.
 * Edit an event here and it propagates to: homepage Hero, What's On cards,
 * Programme Index, Upcoming Sessions, the Availability calendar, and the
 * events.html running order.
 *
 * Historical events (already happened, before the earliest date below) are
 * kept as static archive markup in index.html / events.html and are not
 * part of this dataset.
 *
 * Fields:
 *   id           unique slug
 *   dateStart    'YYYY-MM-DD'
 *   dateEnd      optional 'YYYY-MM-DD' for multi-day events (e.g. Miles Davis)
 *   title        event title
 *   artist       optional featured artist/act name, shown as "Title — Artist"
 *   locationTag  optional short location credit appended to title (e.g. "Nagoya, JP")
 *   genres       array of genre/category strings
 *   doors        optional 24h "HH:MM" doors time
 *   music        optional 24h "HH:MM" music-start time (shown instead of/alongside doors)
 *   status       'ticketed' | 'free' | 'details-soon' | 'occupied'
 *   ctaType      'book' | 'free' | 'rsvp' | 'details' | 'occupied'
 *   ticketUrl    Humanitix (or other) ticket URL — only ever reused, never invented
 *   poster       path relative to assets/images/, or null for the editorial placeholder
 *   description  optional custom body copy; auto-built from genres when omitted
 *   lineup       optional array of "Role — Name" strings
 *   price        optional confirmed ticket-price text
 *   schedule     optional confirmed running-order lines
 *   admission    optional confirmed entry/access note
 *   ticketStatus optional 'selling-fast' | 'sold-out' | 'door' | 'cancelled'
 *   note         optional short extra line (e.g. "From Nagoya, Japan")
 *   badge        optional small credit badge shown on the What's On card (e.g. "Ft. Early Bird")
 *   piArtistSeparator  override for how title/artist join in the Programme Index (default " — ")
 *   calType      'session' | 'private' | 'feature' — drives the Availability calendar dot
 *   isPublic     false = calendar-only entry (private booking with no public listing)
 *   isFeature    true = also has its own dedicated feature-programme section (Miles Davis)
 *   fileNumber   optional "File NN" tag used only when this event is featured in the Hero
 */

const VENUE_EVENTS = [
  {
    id: 'iso-quartet',
    dateStart: '2026-08-14',
    title: 'World Jazz Live',
    artist: 'ISO Quartet',
    genres: ['Swing', 'Latin', 'Afro'],
    doors: '20:00',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/iso-quartet-or-a-live-exploration-world-jazz-or-latin-alfo-jazz-funk',
    poster: 'posters/isoquartet.png',
    heroDescription: 'Swing, latin, and afro jazz — celebrating the global sounds of the ISO Quartet.',
    calType: 'session',
    isPublic: true,
    fileNumber: 'File 13'
  },
  {
    id: 'late-night-jazz',
    dateStart: '2026-08-15',
    title: 'Late Night Jazz + Sake/Wine Night',
    genres: ['Late-Night Jazz', 'Wine & Sake'],
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/late-night-jazz-9pm-late-or-sake-wine-session',
    poster: 'posters/latenightjazz.png',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'alby-rolfe-quartet',
    dateStart: '2026-08-20',
    title: 'Alby Rolfe Quartet',
    genres: ['Original Jazz', 'Two Live Sets'],
    doors: '19:30',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/alby-rolfe-quartet-or-original-jazz-compositions-live-gig',
    poster: 'posters/albyrolfe.jpg',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'takoyaki-quintet',
    dateStart: '2026-08-21',
    title: 'Takoyaki Quintet',
    genres: ['Soul', 'R&B', 'Folk'],
    doors: '19:30',
    music: '20:00',
    status: 'free',
    ctaType: 'rsvp',
    ctaLabel: 'Reserve Free Ticket ↗',
    ticketUrl: 'https://events.humanitix.com/free-entry-takoyaki-quintet-or-soul-r-and-b-folk-live-gig-at-acidity',
    poster: 'posters/takoyaki-quintet.jpg',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'fusion-flow-22-aug',
    dateStart: '2026-08-22',
    title: 'Fusion & Flow',
    genres: ['Jazz Fusion', 'Live Session', 'Improvisation'],
    music: '20:00',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/fusion-and-flow-or-jazz-fusion-funk-rock-electro-sound-live-gig',
    poster: 'posters/fusion-flow-22-aug.jpg',
    description: 'A live session built on modern jazz language, groove and spontaneous flow.',
    lineup: ['Keys — Atharv Joshi', 'Guitar — Jon Banard', 'Drums — Oska Joshi', 'Bass — Hershan Rajkumar'],
    calType: 'session',
    isPublic: true
  },
  {
    id: 'chakamens',
    dateStart: '2026-08-23',
    title: 'Chakamens',
    locationTag: 'Nagoya, JP',
    genres: ['J-Funk', 'Hip-Hop', 'Improvisation'],
    music: '19:30',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/chakamens-or-j-funk-and-hip-hop-from-the-streets-of-nagoya-japan',
    poster: 'posters/chakamens.jpg',
    note: 'From Nagoya, Japan.',
    lineup: ['Bass — Wataru', 'Guitar — Mori Forest', 'Drums — Kohe Yamada', 'MC — Hohh', 'Keys — Akash Dutta (Special Guest)'],
    calType: 'session',
    isPublic: true
  },
  {
    id: 'private-28-aug',
    dateStart: '2026-08-28',
    title: 'Private function',
    calType: 'private',
    isPublic: false
  },
  {
    id: 'allara-night-of-folk-pop',
    dateStart: '2026-08-29',
    title: 'Allara',
    artist: 'with Foggy Josh',
    genres: ['Folk-Pop', 'Blues'],
    doors: '19:00',
    music: '21:00',
    status: 'ticketed',
    ctaType: 'door',
    ctaLabel: 'Tickets $10',
    poster: 'allara.png',
    heroDescription: 'A night of folk-pop with Allara and blues from Foggy Josh.',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'charlie-rank-trio',
    dateStart: '2026-09-04',
    title: 'Charlie Rank Trio',
    genres: ['Contemporary Jazz'],
    doors: '19:30',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/spyral-or-contemporary-jazz-trio-live-at-acidity-zkzv922h',
    poster: 'posters/charlie-rank-trio.jpg',
    description: 'Contemporary jazz exploring improvisation &amp; interplay.',
    lineup: ['Saxophones — Tristan Meffre', 'Double Bass — Charlie Rank', 'Drums — Alfie Pleasance'],
    price: 'Early Bird $15 · General Admission $20',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'acidity-note-music-night',
    pageUrl: 'programme/acidity-note-music-night.html',
    dateStart: '2026-09-05',
    title: 'acidity. NOTE — MUSIC NIGHT',
    genres: ['Afro', 'Latin', 'Folk', 'Global Groove'],
    doors: '19:00',
    status: 'ticketed',
    ctaType: 'book',
    ctaLabel: 'Tickets $20 + BF ↗',
    ticketUrl: 'https://events.humanitix.com/saturday-music-night-or-jazz-afro-latin-folk-art-pop',
    poster: '05SEP.png',
    preservePoster: true,
    description: 'Four acts. Four sets. 7pm–late.',
    lineup: ['7PM — KALO', '8PM — Amadou Suso', '9PM — Ferdinand Duo', '10PM — Izzy Skinner'],
    price: '$20 + booking fee',
    earlyBirdEnds: '2026-09-03T00:00:00+10:00',
    earlyBirdLabel: 'EARLY BIRD ENDS 02 SEP',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'coffee-rave-06-sep',
    pageUrl: 'programme/coffee-rave-jazz-jam.html',
    dateStart: '2026-09-06',
    title: 'Coffee Rave + Jazz Jam',
    series: 'Recurring — Coffee Rave Series',
    genres: ['Coffee Rave', 'Open Jam', 'Day Session'],
    status: 'free',
    ctaType: 'rsvp',
    ctaLabel: 'RSVP ↗',
    ticketUrl: 'https://events.humanitix.com/coffee-rave-jazz-jam-or-jazz-jam-dj-sunday-party-at-acidity-cwuqad86',
    poster: 'posters/coffee-rave-06-sep.webp',
    preservePoster: true,
    schedule: ['2–5PM — Coffee Rave', '5–10PM — House Band Showcase & Open Jazz Jam'],
    admission: 'Free entry. RSVP recommended. Guests under 18 must be accompanied by a responsible adult.',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'chris-papp-quartet',
    pageUrl: 'programme/chris-pappas-quartet.html',
    dateStart: '2026-09-11',
    title: 'Chris Pappas Quartet — Classical Jazz Night',
    genres: ['Classical Jazz', 'Originals', 'Improvisation'],
    doors: '19:30',
    music: '20:00',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/jazz-quartet-and-originals-live-night-or-chris-pappas-quartet',
    poster: 'posters/chris-pappas-quartet.webp',
    preservePoster: true,
    description: 'Original compositions, jazz standards and open improvisation shaped through conversation between four musicians.',
    lineup: ['Chris Pappas — Tenor Sax', 'Dan Mamrot — Guitar', 'Aiden Effron — Double Bass', 'Paul Whitwood — Drums'],
    price: '$15–$20',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'tony-yang-trio-sep',
    pageUrl: 'programme/music-of-wes-montgomery.html',
    dateStart: '2026-09-12',
    title: 'Music of Wes Montgomery',
    artist: 'Tony Yang Trio',
    genres: ['Jazz Trio', 'Contemporary Jazz'],
    doors: '19:30',
    music: '20:00',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/the-music-of-wes-montgomery-part-ii-or-tony-yang-jazz-trio',
    poster: 'posters/music-of-wes-montgomery.webp',
    preservePoster: true,
    description: 'Part II explores Wes Montgomery’s repertoire, warm thumb-picked tone, octave language and melodic improvisation across two sets.',
    lineup: ['Tony Yang — Guitar', 'Charlie Rank — Double Bass', 'Zayne Guo — Drums'],
    schedule: ['7:30PM — Doors', '8PM — Set I', '8:45PM — Interval', '9:15PM — Set II', '10PM — Finish'],
    price: 'Early Bird $15 · General $20',
    generalPrice: '$20',
    earlyBirdPrice: '$15',
    earlyBirdEnds: '2026-09-08T00:00:00+10:00',
    earlyBirdLabel: 'EARLY BIRD ENDS 08 SEP',
    earlyBirdShowEnded: true,
    calType: 'session',
    isPublic: true
  },
  {
    id: 'iso-jazz-quartet-17-sep',
    dateStart: '2026-09-17',
    title: 'ISO Jazz Quartet',
    genres: ['Jazz Quartet'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'jamie-holmes-quartet',
    pageUrl: 'programme/jamie-holmes-quartet.html',
    dateStart: '2026-09-18',
    title: 'New York Jazz | Jamie Holmes Quartet',
    genres: ['Contemporary Jazz'],
    doors: '19:30',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/new-york-jazz-melbourne-or-jame-holmes-quartet-live-jazz',
    poster: 'posters/jamie-holmes-quartet.webp',
    preservePoster: true,
    detailDescription: 'Contemporary New York jazz in dialogue with an Australian musical identity, featuring original compositions and music influenced by Immanuel Wilkins and Chris Potter.',
    price: 'Early Bird $15 · General $20',
    generalPrice: '$20',
    earlyBirdPrice: '$15',
    earlyBirdEnds: '2026-09-12T00:00:00+10:00',
    earlyBirdLabel: 'EARLY BIRD ENDS 12 SEP',
    earlyBirdShowEnded: true,
    calType: 'session',
    isPublic: true
  },
  {
    id: 'jazz-fusion-lineup',
    dateStart: '2026-09-19',
    title: 'Jazz Fusion Lineup',
    genres: ['Electric Jazz', 'Fusion', 'Groove'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'ella-and-louis-tribute',
    pageUrl: 'programme/ella-and-louis.html',
    dateStart: '2026-09-20',
    title: 'The Music of Ella & Louis',
    artist: 'Bokyeong Kim Quintet',
    genres: ['Vocal Jazz', 'Swing', 'Jazz Tribute'],
    music: '19:30',
    status: 'ticketed',
    ctaType: 'book',
    ticketUrl: 'https://events.humanitix.com/the-music-of-ella-and-louis-or-jazz-swing-tribute-featuring-bokyeong-kim',
    poster: 'posters/ella-louis-bokyeong-kim.jpg',
    preservePoster: true,
    description: 'The timeless Ella Fitzgerald and Louis Armstrong songbook, reimagined by vocalist Bokyeong Kim and her jazz quintet.',
    detailDescription: 'Ella Fitzgerald’s elegance meets Louis Armstrong’s warmth in a programme shaped by swing, improvisation and musical chemistry. Bokyeong Kim and her quintet revisit the Ella & Louis songbook with a fresh voice while staying close to the warmth and spontaneity of the originals.',
    lineup: ['Bokyeong Kim — Vocal', 'Noah Cerros — Trumpet', 'Tony Yang — Guitar', 'Geryl Leong — Bass', 'Yuhsin Chang — Drums'],
    schedule: ['7:30PM — Performance begins', '9:30PM — Finish'],
    price: 'Early Bird $15 · General $20',
    generalPrice: '$20',
    earlyBirdPrice: '$15',
    offer: 'Limited Offer $25 (was $35) — Entry + one selected drink (schooner of beer, house wine or house spirit)',
    offerPrice: '$25',
    offerOriginalPrice: '$35',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'iso-jazz-quartet-24-sep',
    dateStart: '2026-09-24',
    title: 'ISO Jazz Quartet',
    genres: ['Jazz Quartet'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'sound-sample-file-03',
    dateStart: '2026-09-25',
    title: "Sound Sample '26 — File 03",
    artist: 'Early Bird',
    piArtistSeparator: ': ',
    badge: 'Ft. Early Bird',
    genres: ['Neo-Soul', 'R&B', 'Contemporary Groove'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'siwei-intimate-concert',
    pageUrl: 'programme/freedom-fly.html',
    dateStart: '2026-09-26',
    title: 'Freedom Fly — Contemporary Jazz & Art of Improvisation',
    artist: 'Siwei / Dominic',
    genres: ['Contemporary Jazz', 'Art of Improvisation'],
    doors: '19:30',
    status: 'details-soon',
    ctaType: 'details',
    poster: 'posters/freedom-fly.webp',
    preservePoster: true,
    calType: 'session',
    isPublic: true
  },
  {
    id: 'miles-davis-tribute',
    dateStart: '2026-10-08',
    dateEnd: '2026-10-10',
    title: 'Miles Davis Tribute',
    genres: ['Acoustic Jazz', 'Modal Jazz', 'Electric Jazz'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'feature',
    isPublic: true,
    isFeature: true
  },
  {
    id: 'private-function-30-oct',
    dateStart: '2026-10-30',
    title: 'Private Function',
    status: 'occupied',
    ctaType: 'occupied',
    calType: 'private',
    isPublic: false
  },
  {
    id: 'acidity-halloween-music-night',
    dateStart: '2026-10-31',
    title: 'Acidity. Halloween Music Night',
    genres: ['Halloween', 'Music Night'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VENUE_EVENTS;
}
