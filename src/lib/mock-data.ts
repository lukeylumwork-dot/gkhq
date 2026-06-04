// Mock data for RPM platform. Deterministic generation.

export type Tier = "Tier 1" | "Tier 2" | "Tier 3";
export type InteractionType =
  | "Live Match"
  | "Training Observation"
  | "Face to Face"
  | "Video Review"
  | "Phone Call"
  | "WhatsApp"
  | "Other";
export type ReportType =
  | "Goalkeeper Development"
  | "Match Report"
  | "Training Report"
  | "Opposition GK"
  | "Recruitment";

export interface Mentor {
  id: string;
  name: string;
  initials: string;
  region: string;
  email: string;
  assignedGks: string[]; // gk ids
  targetInteractions: number;
  completedThisMonth: number;
  yearsExperience: number;
}

export interface Goalkeeper {
  id: string;
  name: string;
  initials: string;
  tier: Tier;
  mentorId: string;
  club: string;
  league: string;
  age: number;
  nationality: string;
  contractUntil: string;
  height: string; // cm
  foot: "Right" | "Left";
  lastInteraction: string; // ISO
  nextInteraction: string; // ISO
  rating: number; // 0-100
  potential: number; // 0-100
  recommendation: "Sign" | "Monitor" | "Pass" | "Loan";
  videoLinks: string[];
}

export interface Interaction {
  id: string;
  gkId: string;
  mentorId: string;
  type: InteractionType;
  date: string;
  notes: string;
  outcome: string;
  followUp: string;
}

export interface Report {
  id: string;
  type: ReportType;
  gkId: string;
  authorId: string; // mentor id
  date: string;
  rating: number;
  summary: string;
  scores: { handling: number; distribution: number; aerial: number; oneVone: number; communication: number };
}

export interface MediaItem {
  id: string;
  gkId: string;
  kind: "video" | "pdf" | "image" | "audio";
  title: string;
  uploadedBy: string;
  date: string;
  size: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: "Match" | "Observation" | "Mentor Visit" | "Meeting" | "Follow Up";
  gkId?: string;
  mentorId?: string;
}

// --- seeded RNG ---
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;
const initialsOf = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const FIRST = ["James", "Lukas", "Mateo", "Diego", "Ivan", "Noah", "Oliver", "Marco", "Andrea", "Luca", "Yuki", "Kai", "Felix", "Henrik", "Joao", "Pedro", "Aaron", "Liam", "Sebastian", "Theo", "Hugo", "Emil", "Jonas", "Ethan", "Daniel", "Ben", "Tom", "Nico", "Anders", "Rafael"];
const LAST = ["Hansen", "Garcia", "Rossi", "Müller", "Silva", "Larsen", "O'Connor", "Schmidt", "Bauer", "Petrov", "Novak", "Andersen", "Costa", "Lopez", "Werner", "Becker", "Wagner", "Fischer", "Romano", "Marino", "Kovac", "Janssen", "Bergstrom", "Lindqvist", "Vidal", "Sanchez", "Moreno", "Klein", "Stein", "Walsh"];
const CLUBS = ["Ajax", "Benfica", "Porto", "Anderlecht", "Bayer Leverkusen", "Hamburger SV", "FC Nordsjælland", "Genk", "Brentford", "Brighton", "Real Sociedad", "Salzburg", "Sturm Graz", "Sparta Prague", "Slavia Prague", "AZ Alkmaar", "Feyenoord", "Club Brugge", "Stade Rennais", "Olympique Lyonnais", "Atalanta", "Bologna", "Celtic", "Rangers"];
const LEAGUES = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Eredivisie", "Ligue 1", "Primeira Liga", "Belgian Pro", "Bundesliga AT", "Czech Liga", "Scottish Premiership"];
const NATIONS = ["England", "Germany", "Spain", "France", "Italy", "Netherlands", "Portugal", "Denmark", "Sweden", "Norway", "Brazil", "Argentina", "Croatia", "Belgium", "Austria", "Czechia", "Poland", "Japan"];
const REGIONS = ["UK & Ireland", "DACH", "Iberia", "Benelux", "Nordics", "Italy", "France", "Eastern Europe", "Americas", "Asia-Pacific"];
const TIERS: Tier[] = ["Tier 1", "Tier 2", "Tier 3"];

const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
};

// Mentors
export const mentors: Mentor[] = Array.from({ length: 10 }).map((_, i) => {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  return {
    id: `m${i + 1}`,
    name,
    initials: initialsOf(name),
    region: REGIONS[i % REGIONS.length],
    email: name.toLowerCase().replace(/[^a-z]+/g, ".") + "@rpm.gk",
    assignedGks: [],
    targetInteractions: between(8, 16),
    completedThisMonth: between(3, 14),
    yearsExperience: between(4, 22),
  };
});

// Goalkeepers
export const goalkeepers: Goalkeeper[] = Array.from({ length: 25 }).map((_, i) => {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const tier = pick(TIERS);
  const mentor = mentors[i % mentors.length];
  const gk: Goalkeeper = {
    id: `gk${i + 1}`,
    name,
    initials: initialsOf(name),
    tier,
    mentorId: mentor.id,
    club: pick(CLUBS),
    league: pick(LEAGUES),
    age: between(16, 31),
    nationality: pick(NATIONS),
    contractUntil: `${between(2025, 2029)}-06-30`,
    height: `${between(186, 200)}cm`,
    foot: rand() > 0.3 ? "Right" : "Left",
    lastInteraction: daysFromNow(-between(1, 40)),
    nextInteraction: daysFromNow(between(-5, 28)),
    rating: between(62, 92),
    potential: between(70, 96),
    recommendation: pick(["Sign", "Monitor", "Pass", "Loan"] as const),
    videoLinks: [`https://video.rpm.gk/${i + 1}/highlights`, `https://video.rpm.gk/${i + 1}/saves`],
  };
  mentor.assignedGks.push(gk.id);
  return gk;
});

const NOTES = [
  "Strong vertical reach, commanded the box well on crosses.",
  "Distribution under pressure remains an area to refine.",
  "Excellent positional awareness in 1v1 situations.",
  "Composure visible from minute one — vocal organiser.",
  "Footwork drills paying off; smoother lateral shifts.",
  "Late dive on the second goal — discussed timing on follow-through.",
  "Mentality conversation: handling pressure after the early concession.",
  "Reviewed clips together; agreed on three focus points for next block.",
];
const OUTCOMES = ["On track", "Above expectation", "Below expectation", "Needs follow-up", "Action plan agreed"];
const FOLLOWUPS = ["Schedule video review", "Send technical drill pack", "Set up call with coach", "Plan club visit", "No action required"];

// Interactions (~6 per GK)
export const interactions: Interaction[] = goalkeepers.flatMap((gk) =>
  Array.from({ length: between(4, 8) }).map((_, i) => ({
    id: `int-${gk.id}-${i}`,
    gkId: gk.id,
    mentorId: gk.mentorId,
    type: pick(["Live Match", "Training Observation", "Face to Face", "Video Review", "Phone Call", "WhatsApp", "Other"] as const),
    date: daysFromNow(-between(1, 90)),
    notes: pick(NOTES),
    outcome: pick(OUTCOMES),
    followUp: pick(FOLLOWUPS),
  })),
);

// Reports — 200
const REPORT_TYPES: ReportType[] = ["Goalkeeper Development", "Match Report", "Training Report", "Opposition GK", "Recruitment"];
export const reports: Report[] = Array.from({ length: 200 }).map((_, i) => {
  const gk = goalkeepers[i % goalkeepers.length];
  return {
    id: `r${i + 1}`,
    type: REPORT_TYPES[i % REPORT_TYPES.length],
    gkId: gk.id,
    authorId: mentors[i % mentors.length].id,
    date: daysFromNow(-between(0, 120)),
    rating: between(55, 95),
    summary: pick(NOTES),
    scores: {
      handling: between(5, 10),
      distribution: between(5, 10),
      aerial: between(5, 10),
      oneVone: between(5, 10),
      communication: between(5, 10),
    },
  };
});

// Media
export const media: MediaItem[] = goalkeepers.flatMap((gk) =>
  Array.from({ length: between(2, 5) }).map((_, i) => ({
    id: `med-${gk.id}-${i}`,
    gkId: gk.id,
    kind: pick(["video", "pdf", "image", "audio"] as const),
    title: pick(["Match clip vs derby", "Training set — handling", "Scout pack", "Voice note debrief", "Save compilation", "Match highlights"]),
    uploadedBy: mentors[i % mentors.length].name,
    date: daysFromNow(-between(1, 60)),
    size: `${between(1, 240)}MB`,
  })),
);

// Calendar events — next 30 days
export const calendarEvents: CalendarEvent[] = Array.from({ length: 38 }).map((_, i) => {
  const gk = goalkeepers[i % goalkeepers.length];
  return {
    id: `cal${i + 1}`,
    date: daysFromNow(between(-3, 28)),
    title: pick([
      `${gk.club} vs opposition`,
      `Observation: ${gk.name}`,
      `Mentor visit — ${gk.club}`,
      `Quarterly review`,
      `Follow-up call: ${gk.name}`,
    ]),
    type: pick(["Match", "Observation", "Mentor Visit", "Meeting", "Follow Up"] as const),
    gkId: gk.id,
    mentorId: gk.mentorId,
  };
});

// Alerts
export interface Alert {
  id: string;
  severity: "high" | "medium" | "low";
  kind: "Overdue observation" | "Overdue contact" | "Missing report" | "Upcoming match" | "Expiring action";
  message: string;
  gkId?: string;
  date: string;
}
export const alerts: Alert[] = (() => {
  const out: Alert[] = [];
  goalkeepers.forEach((gk, i) => {
    const last = (Date.now() - new Date(gk.lastInteraction).getTime()) / 86400000;
    if (last > 30) out.push({ id: `a-o-${gk.id}`, severity: "high", kind: "Overdue observation", message: `${gk.name} — ${Math.floor(last)} days since last observation`, gkId: gk.id, date: gk.lastInteraction });
    if (last > 21 && last <= 30) out.push({ id: `a-c-${gk.id}`, severity: "medium", kind: "Overdue contact", message: `${gk.name} — mentor contact overdue`, gkId: gk.id, date: gk.lastInteraction });
    if (i % 7 === 0) out.push({ id: `a-m-${gk.id}`, severity: "medium", kind: "Missing report", message: `Match report missing for ${gk.club} fixture`, gkId: gk.id, date: daysFromNow(-between(1, 6)) });
    if (i % 5 === 0) out.push({ id: `a-u-${gk.id}`, severity: "low", kind: "Upcoming match", message: `${gk.club} fixture in ${between(1, 7)} days`, gkId: gk.id, date: daysFromNow(between(1, 7)) });
  });
  return out.slice(0, 18);
})();

// Activity feed
export const activity = Array.from({ length: 14 }).map((_, i) => {
  const m = mentors[i % mentors.length];
  const gk = goalkeepers[i % goalkeepers.length];
  return {
    id: `act${i}`,
    actor: m.name,
    actorInitials: m.initials,
    action: pick([
      `submitted a ${pick(REPORT_TYPES)} report on`,
      `logged a ${pick(["Live Match", "Training Observation", "Video Review"])} for`,
      `uploaded media for`,
      `updated the profile of`,
      `scheduled a follow-up with`,
    ]),
    target: gk.name,
    gkId: gk.id,
    date: daysFromNow(-i / 2),
  };
});

// helpers
export const getMentor = (id: string) => mentors.find((m) => m.id === id);
export const getGk = (id: string) => goalkeepers.find((g) => g.id === id);

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (diff < 0) {
    const ahead = Math.abs(Math.floor(diff));
    return ahead === 0 ? "Today" : `in ${ahead}d`;
  }
  const d = Math.floor(diff);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// Stats
export const stats = {
  totalGks: goalkeepers.length,
  upcomingInteractions: goalkeepers.filter((g) => new Date(g.nextInteraction).getTime() >= Date.now() && (new Date(g.nextInteraction).getTime() - Date.now()) / 86400000 < 14).length,
  overdueInteractions: alerts.filter((a) => a.kind === "Overdue observation" || a.kind === "Overdue contact").length,
  reportsThisWeek: reports.filter((r) => (Date.now() - new Date(r.date).getTime()) / 86400000 < 7).length,
  activeMentors: mentors.length,
  tierDistribution: TIERS.map((t) => ({ tier: t, count: goalkeepers.filter((g) => g.tier === t).length })),
};
