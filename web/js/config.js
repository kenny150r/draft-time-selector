export const SUPABASE_URL = 'https://gcqjjpbshoogojsozflp.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcWpqcGJzaG9vZ29qc296ZmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTIzNDgsImV4cCI6MjA5Njg2ODM0OH0.FgqYBf93jkHI1vblJUWM8npPx5usKrTVohUOQFFOGx0';

export const FAST = ['localhost', '127.0.0.1'].includes(location.hostname);
export const HOLD_MS = FAST ? 700 : 5200;
export const BOOT_MS = FAST ? 600 : 3400;
export const INSTALL_MULT = FAST ? 0.15 : 1;

export const OATH = 'I HATE UOFA AND THIS TIME WORKS';
export const TIMEZONE = 'America/Los_Angeles';

export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];

export function isPrime(n) {
  return PRIMES.includes(Number(n));
}

/** Wednesday–Sunday, 6:00 PM or 7:00 PM Pacific (PDT, UTC-7 in late summer). */
export const HOURS = [
  { hour: 18, key: '18:00', label: '6:00 PM PT' },
  { hour: 19, key: '19:00', label: '7:00 PM PT' },
];

export const WEEKS = [
  {
    title: 'Week of Aug 17',
    days: [
      { date: '2026-08-19', dow: 'Wed', short: 'Wed Aug 19' },
      { date: '2026-08-20', dow: 'Thu', short: 'Thu Aug 20' },
      { date: '2026-08-21', dow: 'Fri', short: 'Fri Aug 21' },
      { date: '2026-08-22', dow: 'Sat', short: 'Sat Aug 22' },
      { date: '2026-08-23', dow: 'Sun', short: 'Sun Aug 23' },
    ],
  },
  {
    title: 'Week of Aug 24',
    days: [
      { date: '2026-08-26', dow: 'Wed', short: 'Wed Aug 26' },
      { date: '2026-08-27', dow: 'Thu', short: 'Thu Aug 27' },
      { date: '2026-08-28', dow: 'Fri', short: 'Fri Aug 28' },
      { date: '2026-08-29', dow: 'Sat', short: 'Sat Aug 29' },
      { date: '2026-08-30', dow: 'Sun', short: 'Sun Aug 30' },
    ],
  },
  {
    title: 'Week of Aug 31 (Labor Day wknd)',
    days: [
      { date: '2026-09-02', dow: 'Wed', short: 'Wed Sep 2' },
      { date: '2026-09-03', dow: 'Thu', short: 'Thu Sep 3' },
      { date: '2026-09-04', dow: 'Fri', short: 'Fri Sep 4' },
      { date: '2026-09-05', dow: 'Sat', short: 'Sat Sep 5' },
      { date: '2026-09-06', dow: 'Sun', short: 'Sun Sep 6' },
    ],
  },
];

export const SLOTS = WEEKS.flatMap((week) =>
  week.days.flatMap((day) =>
    HOURS.map((h) => ({
      id: `${day.date}T${h.key}`,
      date: day.date,
      dow: day.dow,
      hour: h.hour,
      week: week.title,
      label: `${day.short} · ${h.label}`,
      start: `${day.date}T${h.key}:00-07:00`,
    })),
  ),
);

export const SLOT_IDS = new Set(SLOTS.map((s) => s.id));

export const CAPTCHA_TILES = [
  { emoji: '🌵', kind: 'cactus', alt: 'saguaro' },
  { emoji: '🐱', kind: 'wildcat', alt: 'a cat in denial' },
  { emoji: '🌞', kind: 'sun', alt: 'the sun, our ally' },
  { emoji: '🌵', kind: 'cactus', alt: 'another cactus' },
  { emoji: '🏈', kind: 'football', alt: 'pigskin' },
  { emoji: '🐈', kind: 'wildcat', alt: 'wildcat propaganda' },
  { emoji: '🌵', kind: 'cactus', alt: 'cactus 3' },
  { emoji: '🌴', kind: 'palm', alt: 'palm tree' },
  { emoji: '🌵', kind: 'cactus', alt: 'cactus 4' },
];

export const TZ_OPTIONS = [
  { value: '', label: '-- select your temporal prison --' },
  { value: 'UTC', label: 'UTC (for cowards)' },
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Chicago', label: 'Central' },
  { value: 'America/Denver', label: 'Mountain (the DST kind, Colorado-brained)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST — almost right, still wrong)' },
  { value: 'America/Los_Angeles', label: 'Pacific (the commissioner’s timezone)' },
  { value: 'America/Phoenix-campus', label: 'America/Phoenix (UofA campus — BANNED)' },
  { value: 'BearDown', label: 'Bear Down Standard Time' },
  { value: 'TucsonMean', label: 'Tucson Mean Time (McKale Center clock, 7 min fast)' },
  { value: 'Mars', label: 'Olympus Mons' },
  { value: 'ESPN', label: "Whatever ESPN's little bugle says" },
  { value: 'CulDeSac', label: 'Cul-de-Sac Standard Time (Pahul swore he was done with this)' },
  { value: 'Yeehaw', label: 'Yeehaw Daylight (Connor; not recognized by actual cattle)' },
  { value: 'RhodeIsland', label: 'Atlantic (a completely normal-sized eastern state, unnamed)' },
];
