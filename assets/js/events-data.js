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
    ctaType: 'free',
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
    status: 'details-soon',
    ctaType: 'details',
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
    status: 'details-soon',
    ctaType: 'details',
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
    id: 'rock-lineup',
    dateStart: '2026-08-29',
    title: 'Rock Lineup',
    genres: ['Independent Rock', 'Alternative'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'charlie-rank-trio',
    dateStart: '2026-09-04',
    title: 'Charlie Rank Trio',
    genres: ['Jazz Trio', 'Contemporary Jazz'],
    doors: '19:30',
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'four-bands-lineup',
    dateStart: '2026-09-05',
    title: '4-Bands Lineup',
    genres: ['Multi-Genre', 'Live Showcase'],
    doors: '19:00',
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'coffee-rave-06-sep',
    dateStart: '2026-09-06',
    title: 'Coffee Rave + Jam Session',
    series: 'Recurring — Coffee Rave Series',
    genres: ['Coffee Rave', 'Open Jam', 'Day Session'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'tony-yang-trio-sep',
    dateStart: '2026-09-12',
    title: 'Tony Yang Trio',
    genres: ['Jazz Trio', 'Contemporary Jazz'],
    doors: '19:30',
    status: 'details-soon',
    ctaType: 'details',
    poster: 'performers/tony-yang.jpg',
    calType: 'session',
    isPublic: true
  },
  {
    id: 'jamie-holmes-quartet',
    dateStart: '2026-09-18',
    title: 'Jamie Holmes Quartet',
    genres: [],
    status: 'details-soon',
    ctaType: 'details',
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
    id: 'coffee-rave-20-sep',
    dateStart: '2026-09-20',
    title: 'Coffee Rave + Jam Session',
    series: 'Recurring — Coffee Rave Series',
    genres: ['Coffee Rave', 'Open Jam', 'Day Session'],
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
    id: 'private-26-sep',
    dateStart: '2026-09-26',
    title: 'Jazz Lineup',
    genres: ['Private Booking', 'Venue Occupied'],
    status: 'occupied',
    ctaType: 'occupied',
    calType: 'private',
    isPublic: true
  },
  {
    id: 'miles-davis-tribute',
    dateStart: '2026-10-01',
    dateEnd: '2026-10-03',
    title: 'Miles Davis Tribute',
    genres: ['Acoustic Jazz', 'Modal Jazz', 'Electric Jazz'],
    status: 'details-soon',
    ctaType: 'details',
    calType: 'feature',
    isPublic: true,
    isFeature: true
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VENUE_EVENTS;
}
