// GKHQ by RPM — illustrative preview dataset (Mock).
// Seeded from the February 2026 client list for interface work only.
// Not real operational records; every consumer surface is labelled Mock via
// src/lib/data-classification.tsx.

export type Status = "Elite" | "First Team" | "Development" | "Prospect" | "Free Agent";
// Legacy alias — many components still import Tier.
export type Tier = Status;

export type Region = "UK Based" | "Overseas" | "Free Agent";

// RPM roster is grouped into four tiers. Detailed rules are managed
// separately; the placeholder mapping in deriveTierLevel() is league-based.
export type TierLevel = 1 | 2 | 3 | 4;

export interface TierDefinition {
  level: TierLevel;
  label: string;
  summary: string;
  leagues: readonly string[];
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    level: 1,
    label: "Elite senior",
    summary: "First-team regulars at the highest domestic level (Premier League).",
    leagues: ["Premier League"],
  },
  {
    level: 2,
    label: "High-level pro",
    summary: "Established professionals in top second tiers and major overseas leagues.",
    leagues: ["EFL Championship", "Serie A", "MLS"],
  },
  {
    level: 3,
    label: "Pro / developing",
    summary: "League One and comparable overseas first divisions.",
    leagues: ["EFL League One", "SPFL Premiership", "Danish Superliga", "Allsvenskan", "UAE Pro League", "Australian A League"],
  },
  {
    level: 4,
    label: "Emerging / lower tier",
    summary: "League Two, National Premier and other developing leagues.",
    leagues: ["EFL League Two", "Australian Nat Prem", "League of Ireland"],
  },
];

export type InteractionType =
  | "Live Match Observation"
  | "Training Ground Visit"
  | "Face to Face"
  | "Phone Call";


export type ReportType =
  | "Goalkeeper Development"
  | "Match Report"
  | "Training Report"
  | "Opposition GK"
  | "Recruitment";

export type StaffRole =
  | "Director"
  | "Managing Director & Mentor"
  | "Goalkeeper Mentor"
  | "Goalkeeper Intelligence Scout"
  | "Video Analyst"
  | "Recruitment Analyst"
  | "Operations Manager";

export interface Mentor {
  id: string;
  name: string;
  initials: string;
  region: string;
  role: StaffRole;
  email: string;
  phone?: string;
  assignedGks: string[];
  targetInteractions: number;
  completedThisMonth: number;
  yearsExperience: number;
}

export interface Goalkeeper {
  id: string;
  name: string;
  initials: string;
  status: Status;
  tier: Status; // alias for back-compat
  tierLevel: TierLevel;
  region: Region;
  mentorId: string;
  club: string;
  league: string;
  age: number;
  dob: string;
  nationality: string;
  contractUntil: string;
  height: string;
  foot: "Right" | "Left";
  lastInteraction: string;
  nextInteraction: string;
  rating: number;
  potential: number;
  recommendation: "Sign" | "Monitor" | "Pass" | "Loan" | "Develop" | "Retain";
  videoLinks: string[];
  developmentPlan?: string[];
  bio?: string;
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
  authorId: string;
  date: string;
  rating: number;
  summary: string;
  scores: { handling: number; distribution: number; aerial: number; oneVone: number; communication: number };
}

export interface MediaItem {
  id: string; gkId: string; kind: "video" | "pdf" | "image" | "audio";
  title: string; uploadedBy: string; date: string; size: string;
}

export interface CalendarEvent {
  id: string; date: string; title: string;
  type: "Match" | "Observation" | "Mentor Visit" | "Meeting" | "Follow Up";
  gkId?: string; mentorId?: string;
}

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1907);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;
const initialsOf = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const daysFromNow = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };

// ---------- RPM Personnel ----------
// Current RPM mentor team + directors. Mentors work collaboratively across
// the entire client roster — there is no per-goalkeeper assignment.
export const mentors: Mentor[] = [
  // Leadership
  { id: "m-rich-lee", name: "Rich Lee", initials: "RL", region: "UK & Ireland", role: "Director", email: "rlee@gkhq.app", phone: "+44 7971 776776", assignedGks: [], targetInteractions: 6, completedThisMonth: 5, yearsExperience: 24 },

  // Mentor team (David Rouse also manages the mentor team)
  { id: "m-david-rouse", name: "David Rouse", initials: "DR", region: "UK & Ireland", role: "Managing Director & Mentor", email: "drouse@gkhq.app", assignedGks: [], targetInteractions: 12, completedThisMonth: 10, yearsExperience: 22 },
  { id: "m-dave-watson", name: "Dave Watson", initials: "DW", region: "North West", role: "Goalkeeper Mentor", email: "dwatson@gkhq.app", assignedGks: [], targetInteractions: 14, completedThisMonth: 11, yearsExperience: 30 },
  { id: "m-andy-marshall", name: "Andy Marshall", initials: "AM", region: "East", role: "Goalkeeper Mentor", email: "amarshall@gkhq.app", assignedGks: [], targetInteractions: 14, completedThisMonth: 12, yearsExperience: 25 },
  { id: "m-jack-stern", name: "Jack Stern", initials: "JS", region: "London & South", role: "Goalkeeper Mentor", email: "jstern@gkhq.app", assignedGks: [], targetInteractions: 12, completedThisMonth: 9, yearsExperience: 12 },
  { id: "m-alec-chamberlain", name: "Alec Chamberlain", initials: "AC", region: "Midlands", role: "Goalkeeper Mentor", email: "achamberlain@gkhq.app", assignedGks: [], targetInteractions: 12, completedThisMonth: 10, yearsExperience: 28 },
  { id: "m-martyn-margetson", name: "Martyn Margetson", initials: "MM", region: "Wales & South West", role: "Goalkeeper Mentor", email: "mmargetson@gkhq.app", assignedGks: [], targetInteractions: 12, completedThisMonth: 8, yearsExperience: 24 },
  { id: "m-martijn-middelbeek", name: "Martijn Middelbeek", initials: "MM", region: "Europe", role: "Goalkeeper Mentor", email: "mmiddelbeek@gkhq.app", assignedGks: [], targetInteractions: 10, completedThisMonth: 8, yearsExperience: 18 },
  { id: "m-matt-beadle", name: "Matt Beadle", initials: "MB", region: "South Coast", role: "Goalkeeper Mentor", email: "mbeadle@gkhq.app", assignedGks: [], targetInteractions: 12, completedThisMonth: 9, yearsExperience: 15 },
];

// Rotation pool used only to seed each goalkeeper's most-recent-contact mentor.
// Mentors are NOT assigned to specific goalkeepers — the whole team works the roster.
const ASSIGN_POOL = ["m-dave-watson", "m-andy-marshall", "m-jack-stern", "m-alec-chamberlain", "m-martyn-margetson", "m-martijn-middelbeek", "m-matt-beadle", "m-david-rouse"];

// ---------- Goalkeepers (real RPM client list, Feb 2026) ----------
type Seed = { name: string; dob: string; age: number; club: string; league: string; contract: string };
const SEED: Seed[] = [
  // Premier League
  { name: "Brandon Austin", dob: "08/01/1999", age: 27, club: "Tottenham Hotspur", league: "Premier League", contract: "June 2027" },
  { name: "James Beadle", dob: "16/07/2004", age: 21, club: "Brighton & Hove Albion", league: "Premier League", contract: "June 2028" },
  { name: "Toby Bell", dob: "22/02/2009", age: 16, club: "Chelsea", league: "Premier League", contract: "June 2027" },
  { name: "Dan Bentley", dob: "13/07/1993", age: 32, club: "Wolves", league: "Premier League", contract: "June 2026" },
  { name: "Marcus Bettinelli", dob: "24/05/1992", age: 33, club: "Manchester City", league: "Premier League", contract: "June 2026" },
  { name: "Alex Cairns", dob: "04/01/1993", age: 33, club: "Leeds United", league: "Premier League", contract: "June 2026" },
  { name: "Owen Grainger", dob: "12/07/2007", age: 18, club: "Nottingham Forest", league: "Premier League", contract: "June 2026" },
  { name: "Xander Grieves", dob: "13/04/2009", age: 16, club: "Wolves", league: "Premier League", contract: "June 2027" },
  { name: "Steven Hall", dob: "16/01/2005", age: 21, club: "Brighton & Hove Albion", league: "Premier League", contract: "June 2027" },
  { name: "Blake Irow", dob: "01/09/2008", age: 17, club: "Tottenham Hotspur", league: "Premier League", contract: "June 2027" },
  { name: "Sebastian Jensen", dob: "20/02/2006", age: 19, club: "Brighton & Hove Albion", league: "Premier League", contract: "June 2026" },
  { name: "Jack Talbot", dob: "24/09/2008", age: 17, club: "Arsenal", league: "Premier League", contract: "June 2027" },
  // Championship
  { name: "Ryan Allsop", dob: "17/06/1992", age: 33, club: "Birmingham City", league: "EFL Championship", contract: "June 2028" },
  { name: "Asmir Begovic", dob: "20/06/1987", age: 38, club: "Leicester City", league: "EFL Championship", contract: "June 2026" },
  { name: "Josh Bentley", dob: "13/01/2009", age: 17, club: "Ipswich Town", league: "EFL Championship", contract: "June 2027" },
  { name: "Joe Bursik", dob: "12/07/2000", age: 25, club: "Portsmouth", league: "EFL Championship", contract: "June 2027" },
  { name: "Callum Burton", dob: "15/08/1996", age: 29, club: "Wrexham", league: "EFL Championship", contract: "June 2027" },
  { name: "David Button", dob: "27/02/1989", age: 36, club: "Ipswich Town", league: "EFL Championship", contract: "June 2027" },
  { name: "Murphy Cooper", dob: "27/12/2001", age: 24, club: "Queens Park Rangers", league: "EFL Championship", contract: "June 2029" },
  { name: "David Cornell", dob: "28/03/1991", age: 34, club: "Preston North End", league: "EFL Championship", contract: "June 2026" },
  { name: "Cooper Covington", dob: "16/04/2010", age: 15, club: "Bristol City", league: "EFL Championship", contract: "June 2026" },
  { name: "Max Crocombe", dob: "12/08/1993", age: 32, club: "Millwall", league: "EFL Championship", contract: "June 2027" },
  { name: "Jamie Cumming", dob: "04/09/1999", age: 26, club: "Oxford United", league: "EFL Championship", contract: "June 2027" },
  { name: "Adam Davies", dob: "17/07/1992", age: 33, club: "Sheffield United", league: "EFL Championship", contract: "June 2026" },
  { name: "Reuben Egan", dob: "27/07/2005", age: 20, club: "Wrexham", league: "EFL Championship", contract: "June 2026" },
  { name: "Simon Eastwood", dob: "26/06/1989", age: 36, club: "Oxford United", league: "EFL Championship", contract: "June 2026" },
  { name: "Frank Fielding", dob: "04/04/1988", age: 37, club: "Stoke City", league: "EFL Championship", contract: "June 2026" },
  { name: "Andrew Fisher", dob: "12/02/1998", age: 27, club: "Swansea City", league: "EFL Championship", contract: "June 2028" },
  { name: "Felix Goddard", dob: "09/03/2004", age: 21, club: "Blackburn Rovers", league: "EFL Championship", contract: "June 2027" },
  { name: "True Grant", dob: "02/11/2005", age: 20, club: "Stoke City", league: "EFL Championship", contract: "June 2027" },
  { name: "Ben Hamer", dob: "20/11/1987", age: 38, club: "Queens Park Rangers", league: "EFL Championship", contract: "June 2026" },
  { name: "Ben Killip", dob: "24/11/1995", age: 30, club: "Portsmouth", league: "EFL Championship", contract: "June 2027" },
  { name: "Thimothee Lo-Tutala", dob: "13/02/2003", age: 22, club: "Hull City", league: "EFL Championship", contract: "June 2028" },
  { name: "Joe Lumley", dob: "15/02/1995", age: 30, club: "Bristol City", league: "EFL Championship", contract: "June 2027" },
  { name: "Lennon MacLorg", dob: "08/10/2005", age: 20, club: "Charlton Athletic", league: "EFL Championship", contract: "June 2026" },
  { name: "Nicolas Michalski", dob: "14/03/2007", age: 18, club: "Blackburn Rovers", league: "EFL Championship", contract: "June 2029" },
  { name: "Louie Moulden", dob: "06/01/2002", age: 24, club: "Norwich City", league: "EFL Championship", contract: "June 2026" },
  { name: "Rich O'Donnell", dob: "12/09/1988", age: 37, club: "Derby County", league: "EFL Championship", contract: "June 2026" },
  { name: "Dillon Phillips", dob: "11/06/1995", age: 30, club: "Hull City", league: "EFL Championship", contract: "June 2027" },
  { name: "James Pradic", dob: "02/07/2005", age: 20, club: "Preston North End", league: "EFL Championship", contract: "June 2026" },
  { name: "Myles Roberts", dob: "09/12/2001", age: 24, club: "Watford", league: "EFL Championship", contract: "June 2026" },
  { name: "Cieran Slicker", dob: "15/09/2002", age: 23, club: "Ipswich Town", league: "EFL Championship", contract: "June 2026" },
  { name: "Tom Streets", dob: "16/02/2009", age: 16, club: "Sheffield Wednesday", league: "EFL Championship", contract: "June 2027" },
  { name: "Lewis Thomas", dob: "20/09/1997", age: 28, club: "Bristol City", league: "EFL Championship", contract: "June 2026" },
  { name: "Lawrence Vigouroux", dob: "19/11/1993", age: 32, club: "Swansea City", league: "EFL Championship", contract: "June 2028" },
  { name: "Joe Walsh", dob: "01/04/2002", age: 23, club: "Queens Park Rangers", league: "EFL Championship", contract: "June 2027" },
  { name: "Christian Walton", dob: "09/11/1995", age: 30, club: "Ipswich Town", league: "EFL Championship", contract: "June 2028" },
  { name: "Joe Wildsmith", dob: "28/12/1995", age: 30, club: "West Bromwich Albion", league: "EFL Championship", contract: "June 2026" },
  { name: "Woody Williamson", dob: "07/07/2006", age: 19, club: "Ipswich Town", league: "EFL Championship", contract: "June 2026" },
  { name: "Jacob Zetterstrom", dob: "11/07/1998", age: 27, club: "Derby County", league: "EFL Championship", contract: "June 2027" },
  // League One
  { name: "Luca Ashby-Hammond", dob: "25/03/2001", age: 24, club: "Plymouth Argyle", league: "EFL League One", contract: "June 2026" },
  { name: "Jak Alnwick", dob: "17/06/1993", age: 32, club: "Huddersfield Town", league: "EFL League One", contract: "June 2027" },
  { name: "Alex Bass", dob: "01/04/1998", age: 27, club: "Peterborough United", league: "EFL League One", contract: "June 2028" },
  { name: "Henry Blackledge", dob: "22/09/2005", age: 20, club: "Luton Town", league: "EFL League One", contract: "June 2026" },
  { name: "Jack Bonham", dob: "14/09/1993", age: 32, club: "Bolton Wanderers", league: "EFL League One", contract: "June 2027" },
  { name: "Charlie Booth", dob: "09/11/2007", age: 18, club: "Luton Town", league: "EFL League One", contract: "June 2026" },
  { name: "Conor Hazard", dob: "05/03/1998", age: 27, club: "Plymouth Argyle", league: "EFL League One", contract: "June 2026" },
  { name: "Max Metcalfe", dob: "28/01/2003", age: 23, club: "Stockport County", league: "EFL League One", contract: "June 2026" },
  { name: "Stuart Moore", dob: "08/09/1994", age: 31, club: "Wycombe Wanderers", league: "EFL League One", contract: "June 2028" },
  { name: "Joel Pereira", dob: "28/06/1996", age: 29, club: "Reading", league: "EFL League One", contract: "June 2028" },
  { name: "Frankie Phillips", dob: "20/09/2005", age: 20, club: "Exeter City", league: "EFL League One", contract: "June 2026" },
  { name: "Noah Phillips", dob: "07/12/2004", age: 21, club: "Leyton Orient", league: "EFL League One", contract: "June 2027" },
  { name: "Liam Roberts", dob: "21/11/1994", age: 31, club: "Mansfield Town", league: "EFL League One", contract: "June 2027" },
  { name: "Jack Stevens", dob: "02/08/1997", age: 28, club: "Reading", league: "EFL League One", contract: "June 2027" },
  { name: "Nik Tzanev", dob: "23/12/1996", age: 29, club: "Huddersfield Town", league: "EFL League One", contract: "June 2026" },
  { name: "Tom Watson", dob: "27/08/2004", age: 21, club: "Wigan Athletic", league: "EFL League One", contract: "June 2028" },
  { name: "Max Woodford", dob: "05/05/2008", age: 17, club: "Stevenage", league: "EFL League One", contract: "June 2026" },
  // League Two
  { name: "Ellis Craven", dob: "08/10/2004", age: 21, club: "Salford City", league: "EFL League Two", contract: "June 2026" },
  { name: "Jake Eastwood", dob: "03/10/1996", age: 29, club: "Cambridge United", league: "EFL League Two", contract: "June 2026" },
  { name: "Mark Howard", dob: "21/09/1986", age: 39, club: "Salford City", league: "EFL League Two", contract: "June 2026" },
  { name: "Sam Long", dob: "12/11/2002", age: 23, club: "Bromley", league: "EFL League Two", contract: "June 2026" },
  { name: "Craig MacGillivray", dob: "12/01/1993", age: 33, club: "MK Dons", league: "EFL League Two", contract: "June 2027" },
  { name: "Ryan Sandford", dob: "21/02/1999", age: 26, club: "Crawley Town", league: "EFL League Two", contract: "June 2026" },
  { name: "Thomas Smith", dob: "30/01/2002", age: 24, club: "Colchester United", league: "EFL League Two", contract: "June 2026" },
  { name: "Luke Southwood", dob: "06/12/1997", age: 28, club: "Bristol Rovers", league: "EFL League Two", contract: "June 2027" },
  { name: "Sebastian Stacey", dob: "19/05/2006", age: 19, club: "MK Dons", league: "EFL League Two", contract: "June 2027" },
  { name: "Connal Trueman", dob: "26/03/1996", age: 29, club: "MK Dons", league: "EFL League Two", contract: "June 2027" },
  { name: "Jake Turner", dob: "25/02/1999", age: 26, club: "Gillingham", league: "EFL League Two", contract: "June 2026" },
  { name: "Joe Wright", dob: "10/04/2001", age: 24, club: "Barnet", league: "EFL League Two", contract: "June 2027" },
  { name: "Brad Young", dob: "05/05/2002", age: 23, club: "Bristol Rovers", league: "EFL League Two", contract: "June 2027" },
  // Overseas
  { name: "Noel Tornqvist", dob: "01/02/2002", age: 24, club: "Como 1907", league: "Serie A", contract: "June 2028" },
  { name: "Jonathan Bond", dob: "19/05/1993", age: 32, club: "Houston Dynamo", league: "MLS", contract: "December 2026" },
  { name: "Ash Maynard-Brewer", dob: "25/06/1999", age: 26, club: "Dundee United", league: "SPFL Premiership", contract: "June 2026" },
  { name: "Maks Stryjek", dob: "18/07/1996", age: 29, club: "Kilmarnock", league: "SPFL Premiership", contract: "June 2027" },
  { name: "Leo Wahlstedt", dob: "04/07/1999", age: 26, club: "Aarhus", league: "Danish Superliga", contract: "June 2029" },
  { name: "Pontus Dahlberg", dob: "21/01/1999", age: 27, club: "IFK Göteborg", league: "Allsvenskan", contract: "December 2026" },
  { name: "Adli Mohamed", dob: "15/09/2004", age: 21, club: "Al Nasr SC", league: "UAE Pro League", contract: "June 2030" },
  { name: "Dean Bouzanis", dob: "02/10/1990", age: 35, club: "Brisbane Roar", league: "Australian A League", contract: "June 2026" },
  { name: "Gus Hoefsloot", dob: "14/03/2006", age: 19, club: "Sydney FC", league: "Australian A League", contract: "June 2028" },
  { name: "Jack Warshawsky", dob: "08/08/2004", age: 21, club: "Oakleigh Cannons", league: "Australian Nat Prem", contract: "June 2026" },
  { name: "Sam Sargeant", dob: "23/09/1997", age: 28, club: "Sligo Rovers", league: "League of Ireland", contract: "December 2026" },
  { name: "Fynn Talley", dob: "14/09/2002", age: 23, club: "Drogheda United", league: "League of Ireland", contract: "December 2026" },
  { name: "Conor Walsh", dob: "17/03/2005", age: 20, club: "Shelbourne", league: "League of Ireland", contract: "December 2028" },
  { name: "Billy Crellin", dob: "30/06/2000", age: 25, club: "Glentoran", league: "Irish Premiership", contract: "June 2026" },
  // National League
  { name: "Giosue Bellagambi", dob: "08/11/2001", age: 24, club: "Ebbsfleet United", league: "National League", contract: "June 2026" },
  { name: "Harry Burgoyne", dob: "28/12/1996", age: 29, club: "Alfreton Town", league: "National League", contract: "January 2026" },
  { name: "Nick Hayes", dob: "10/04/1999", age: 26, club: "Hartlepool United", league: "National League", contract: "June 2026" },
  { name: "Harrison Male", dob: "13/09/2000", age: 25, club: "York City", league: "National League", contract: "June 2026" },
  { name: "Luke McNicholas", dob: "01/01/2000", age: 26, club: "Forest Green Rovers", league: "National League", contract: "June 2027" },
  { name: "Thomas Myles", dob: "17/11/2005", age: 20, club: "Rochdale AFC", league: "National League", contract: "June 2026" },
  { name: "Jasper Sheik", dob: "27/02/2005", age: 20, club: "South Shields", league: "National League", contract: "June 2026" },
  { name: "George Shelvey", dob: "22/04/2001", age: 24, club: "Gateshead", league: "National League", contract: "June 2026" },
  // Hero #2 — added explicitly
  { name: "Corey Addai", dob: "11/02/2000", age: 26, club: "Cambridge United", league: "EFL League Two", contract: "June 2027" },
  // Free Agents
  { name: "Jamie Jones", dob: "18/02/1989", age: 36, club: "Free Agent", league: "Free Agent", contract: "—" },
  { name: "Louis Jones", dob: "12/10/1998", age: 27, club: "Free Agent", league: "Free Agent", contract: "—" },
  { name: "Rohan Luthra", dob: "06/05/2002", age: 23, club: "Free Agent", league: "Free Agent", contract: "—" },
];

const OVERSEAS_LEAGUES = new Set(["Serie A", "MLS", "Danish Superliga", "Allsvenskan", "UAE Pro League", "Australian A League", "Australian Nat Prem"]);

function deriveStatus(s: Seed): Status {
  if (s.league === "Free Agent") return "Free Agent";
  if (s.age <= 17) return "Prospect";
  // Elite — Premier League regulars and the two hero profiles
  const ELITE = new Set(["James Beadle", "Marcus Bettinelli", "Brandon Austin", "Asmir Begovic"]);
  if (ELITE.has(s.name)) return "Elite";
  if (s.age <= 21) return "Development";
  return "First Team";
}
function deriveRegion(s: Seed): Region {
  if (s.league === "Free Agent") return "Free Agent";
  return OVERSEAS_LEAGUES.has(s.league) ? "Overseas" : "UK Based";
}
function deriveTierLevel(s: Seed): TierLevel {
  if (s.league === "Premier League") return 1;
  if (s.league === "EFL Championship" || s.league === "Serie A" || s.league === "MLS") return 2;
  if (s.league === "EFL League One" || s.league === "SPFL Premiership" || s.league === "Danish Superliga" || s.league === "Allsvenskan" || s.league === "UAE Pro League" || s.league === "Australian A League") return 3;
  return 4;
}
function contractISO(c: string): string {
  if (c === "—") return "—";
  // "June 2028" / "December 2026" / "January 2026"
  const [mon, yr] = c.split(" ");
  const monthIdx: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
  return `${yr}-${monthIdx[mon] ?? "06"}-30`;
}
function dobToISO(d: string): string {
  // dd/mm/yyyy
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
function inferNationality(s: Seed): string {
  if (s.club === "Como 1907") return "Sweden";
  if (s.club.includes("Göteborg")) return "Sweden";
  if (s.club === "Aarhus") return "Norway";
  if (s.club === "Al Nasr SC") return "UAE";
  if (s.club === "Brisbane Roar" || s.club === "Sydney FC" || s.club === "Oakleigh Cannons") return "Australia";
  if (s.club === "Houston Dynamo") return "England";
  if (s.league === "League of Ireland") return "Ireland";
  if (s.club === "Glentoran") return "Northern Ireland";
  if (s.league === "SPFL Premiership") return "Scotland";
  return "England";
}

// Custom rating bumps for hero profiles
const RATING_OVERRIDE: Record<string, { rating: number; potential: number; recommendation: Goalkeeper["recommendation"] }> = {
  "James Beadle": { rating: 84, potential: 93, recommendation: "Retain" },
  "Corey Addai": { rating: 79, potential: 88, recommendation: "Develop" },
};

export const goalkeepers: Goalkeeper[] = SEED.map((s, i) => {
  const status = deriveStatus(s);
  const region = deriveRegion(s);
  const mentorId = status === "Free Agent" ? "m-david-rouse" : ASSIGN_POOL[i % ASSIGN_POOL.length];
  const o = RATING_OVERRIDE[s.name];
  const baseRating = status === "Elite" ? between(78, 90) : status === "First Team" ? between(70, 84) : status === "Development" ? between(64, 78) : status === "Prospect" ? between(58, 72) : between(60, 75);
  const gk: Goalkeeper = {
    id: `gk-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: s.name,
    initials: initialsOf(s.name),
    status, tier: status,
    tierLevel: deriveTierLevel(s),
    region,
    mentorId,
    club: s.club, league: s.league,
    age: s.age, dob: dobToISO(s.dob),
    nationality: inferNationality(s),
    contractUntil: contractISO(s.contract),
    height: `${between(186, 200)}cm`,
    foot: rand() > 0.25 ? "Right" : "Left",
    lastInteraction: daysFromNow(-between(1, status === "Elite" ? 14 : 40)),
    nextInteraction: daysFromNow(between(-2, 28)),
    rating: o?.rating ?? baseRating,
    potential: o?.potential ?? Math.min(99, baseRating + between(4, 14)),
    recommendation: o?.recommendation ?? pick(["Sign", "Monitor", "Develop", "Retain", "Loan"] as const),
    videoLinks: [`https://video.rpmgk.com/${s.name.split(" ")[0].toLowerCase()}/highlights`],
  };
  return gk;
});

// Populate mentor.assignedGks
goalkeepers.forEach((gk) => {
  const m = mentors.find((x) => x.id === gk.mentorId);
  if (m) m.assignedGks.push(gk.id);
});

// ---------- Hero profile enrichment ----------
const beadle = goalkeepers.find((g) => g.name === "James Beadle")!;
beadle.bio = "Brighton & Hove Albion academy graduate, England U21 international. Loan spells have accelerated first-team readiness; RPM tracking pathway toward sustained Premier League minutes.";
beadle.developmentPlan = [
  "Increase distribution accuracy under high press (target 86%+).",
  "Quarterly tactical session on back-line organisation with Mark Halsey.",
  "Continue strength block (lower-limb power) through international break.",
  "Review opposition striker tendencies pre-match in dedicated video clinic.",
];
beadle.videoLinks.push("https://video.rpmgk.com/beadle/saves-2025-26", "https://video.rpmgk.com/beadle/distribution-block");

const corey = goalkeepers.find((g) => g.name === "Corey Addai")!;
corey.bio = "Experienced League Two number one. RPM development focus on shot-stopping consistency and progressing back into a Championship environment.";
corey.developmentPlan = [
  "Sustain set-piece dominance — review weekly with Chris Day.",
  "Add ball-playing range to attract higher-tier recruitment interest.",
  "Maintain availability — load monitoring with club S&C.",
  "Build profile pack with recruitment analyst for January window.",
];

// ---------- Interactions ----------
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
const ITYPES: InteractionType[] = ["Live Match Observation", "Training Ground Visit", "Face to Face", "Phone Call"];

export const interactions: Interaction[] = goalkeepers.flatMap((gk) => {
  const count = gk.name === "James Beadle" || gk.name === "Corey Addai" ? between(10, 14) : between(3, 7);
  return Array.from({ length: count }).map((_, i) => ({
    id: `int-${gk.id}-${i}`,
    gkId: gk.id,
    mentorId: gk.mentorId,
    type: pick(ITYPES),
    date: daysFromNow(-between(1, 110)),
    notes: pick(NOTES),
    outcome: pick(OUTCOMES),
    followUp: pick(FOLLOWUPS),
  }));
});

// ---------- Reports ----------
const REPORT_TYPES: ReportType[] = ["Goalkeeper Development", "Match Report", "Training Report", "Opposition GK", "Recruitment"];
const baseReports: Report[] = Array.from({ length: 200 }).map((_, i) => {
  const gk = goalkeepers[i % goalkeepers.length];
  return {
    id: `r${i + 1}`,
    type: REPORT_TYPES[i % REPORT_TYPES.length],
    gkId: gk.id,
    authorId: gk.mentorId,
    date: daysFromNow(-between(0, 120)),
    rating: between(55, 95),
    summary: pick(NOTES),
    scores: {
      handling: between(5, 10), distribution: between(5, 10), aerial: between(5, 10),
      oneVone: between(5, 10), communication: between(5, 10),
    },
  };
});
// Extra hero reports
const heroReports: Report[] = [];
for (const heroName of ["James Beadle", "Corey Addai"]) {
  const gk = goalkeepers.find((g) => g.name === heroName)!;
  REPORT_TYPES.forEach((rt, k) => {
    heroReports.push({
      id: `r-hero-${gk.id}-${k}`,
      type: rt, gkId: gk.id, authorId: gk.mentorId,
      date: daysFromNow(-between(5, 60)),
      rating: between(78, 92),
      summary: gk.bio?.split(".")[0] ?? pick(NOTES),
      scores: { handling: between(7, 10), distribution: between(7, 10), aerial: between(7, 10), oneVone: between(7, 10), communication: between(8, 10) },
    });
  });
}
export const reports: Report[] = [...heroReports, ...baseReports];

// ---------- Media ----------
export const media: MediaItem[] = goalkeepers.flatMap((gk) => {
  const count = gk.name === "James Beadle" || gk.name === "Corey Addai" ? between(5, 7) : between(1, 3);
  return Array.from({ length: count }).map((_, i) => ({
    id: `med-${gk.id}-${i}`,
    gkId: gk.id,
    kind: pick(["video", "pdf", "image", "audio"] as const),
    title: pick(["Match clip vs derby", "Training set — handling", "Scout pack", "Voice note debrief", "Save compilation", "Match highlights", "Set-piece review", "1v1 reel"]),
    uploadedBy: mentors.find((m) => m.id === gk.mentorId)?.name ?? "RPM",
    date: daysFromNow(-between(1, 60)),
    size: `${between(1, 240)}MB`,
  }));
});

// ---------- Calendar ----------
export const calendarEvents: CalendarEvent[] = Array.from({ length: 42 }).map((_, i) => {
  const gk = goalkeepers[i % goalkeepers.length];
  return {
    id: `cal${i + 1}`,
    date: daysFromNow(between(-3, 28)),
    title: pick([
      `${gk.club} fixture`,
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

// ---------- Alerts ----------
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
    if (i % 9 === 0) out.push({ id: `a-m-${gk.id}`, severity: "medium", kind: "Missing report", message: `Match report missing for ${gk.club} fixture`, gkId: gk.id, date: daysFromNow(-between(1, 6)) });
    if (i % 7 === 0) out.push({ id: `a-u-${gk.id}`, severity: "low", kind: "Upcoming match", message: `${gk.club} fixture in ${between(1, 7)} days`, gkId: gk.id, date: daysFromNow(between(1, 7)) });
  });
  return out.slice(0, 22);
})();

// ---------- Activity feed ----------
export const activity = Array.from({ length: 16 }).map((_, i) => {
  const m = mentors[(i % (mentors.length - 3)) + 3]; // skip 3 directors mostly
  const gk = goalkeepers[(i * 5) % goalkeepers.length];
  return {
    id: `act${i}`,
    actor: m.name,
    actorInitials: m.initials,
    action: pick([
      `submitted a ${pick(REPORT_TYPES)} report on`,
      `logged a ${pick(ITYPES)} for`,
      `uploaded media for`,
      `updated the profile of`,
      `scheduled a follow-up with`,
    ]),
    target: gk.name,
    gkId: gk.id,
    date: daysFromNow(-i / 2),
  };
});

// ---------- helpers ----------
export const getMentor = (id: string) => mentors.find((m) => m.id === id);
export const getGk = (id: string) => goalkeepers.find((g) => g.id === id);

export function formatDate(iso: string) {
  if (!iso || iso === "—") return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatRelative(iso: string) {
  if (!iso || iso === "—") return "—";
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

// ---------- Duty-of-care traffic light ----------
// Green  = contact within 21 days (on track)
// Amber  = 22–35 days (attention required)
// Red    = 36+ days (duty breached)
export type DutyLevel = "green" | "amber" | "red";
export interface DutyStatus { level: DutyLevel; label: string; days: number; }

export function dutyStatusForGk(gk: Goalkeeper): DutyStatus {
  const days = Math.max(0, Math.floor((Date.now() - new Date(gk.lastInteraction).getTime()) / 86400000));
  if (days <= 21) return { level: "green", label: "On Track", days };
  if (days <= 35) return { level: "amber", label: "Attention", days };
  return { level: "red", label: "Breach", days };
}

export function dutyStatusForMentor(mentorId: string): DutyStatus {
  const m = getMentor(mentorId);
  const gks = goalkeepers.filter((g) => g.mentorId === mentorId);
  // Mentors with no assigned GKs (directors/support) — judge by target completion only.
  if (!gks.length) {
    if (!m?.targetInteractions) return { level: "green", label: "Support", days: 0 };
    const pct = (m.completedThisMonth / m.targetInteractions) * 100;
    if (pct >= 80) return { level: "green", label: "On Track", days: 0 };
    if (pct >= 50) return { level: "amber", label: "Behind", days: 0 };
    return { level: "red", label: "At Risk", days: 0 };
  }
  const counts = gks.reduce((acc, g) => { acc[dutyStatusForGk(g).level]++; return acc; }, { green: 0, amber: 0, red: 0 } as Record<DutyLevel, number>);
  if (counts.red > 0) return { level: "red", label: `${counts.red} breach${counts.red > 1 ? "es" : ""}`, days: 0 };
  if (counts.amber > 0) return { level: "amber", label: `${counts.amber} need attention`, days: 0 };
  return { level: "green", label: "All on track", days: 0 };
}

export const dutyOverview = (() => {
  const counts = goalkeepers.reduce((acc, g) => { acc[dutyStatusForGk(g).level]++; return acc; }, { green: 0, amber: 0, red: 0 } as Record<DutyLevel, number>);
  return { ...counts, total: goalkeepers.length };
})();

const STATUSES: Status[] = ["Elite", "First Team", "Development", "Prospect", "Free Agent"];

export const stats = {
  totalGks: goalkeepers.length,
  upcomingInteractions: goalkeepers.filter((g) => new Date(g.nextInteraction).getTime() >= Date.now() && (new Date(g.nextInteraction).getTime() - Date.now()) / 86400000 < 14).length,
  overdueInteractions: alerts.filter((a) => a.kind === "Overdue observation" || a.kind === "Overdue contact").length,
  reportsThisWeek: reports.filter((r) => (Date.now() - new Date(r.date).getTime()) / 86400000 < 7).length,
  activeMentors: mentors.filter((m) => m.role === "Goalkeeper Mentor" || m.role === "Goalkeeper Intelligence Scout" || m.role === "Managing Director & Mentor").length,
  // Back-compat: tierDistribution now reports the Status distribution
  tierDistribution: STATUSES.map((t) => ({ tier: t, count: goalkeepers.filter((g) => g.status === t).length })),
  statusDistribution: STATUSES.map((t) => ({ status: t, count: goalkeepers.filter((g) => g.status === t).length })),
  regionDistribution: (["UK Based", "Overseas", "Free Agent"] as Region[]).map((r) => ({ region: r, count: goalkeepers.filter((g) => g.region === r).length })),
};
