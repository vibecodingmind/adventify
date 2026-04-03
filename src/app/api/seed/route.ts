import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import {
  Role,
  BaptismStatus,
  NotificationType,
  NotificationStatus,
  DocumentType,
  RequestStatus,
} from '@prisma/client';
import { nanoid } from 'nanoid';
import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// DATA CONSTANTS
// ============================================================

const MALE_FIRST_NAMES = [
  'James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles',
  'Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua','Kenneth',
  'Kevin','Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan','Jacob',
  'Gary','Nicholas','Eric','Jonathan','Stephen','Larry','Justin','Scott','Brandon','Benjamin',
  'Samuel','Raymond','Gregory','Frank','Alexander','Patrick','Jack','Dennis','Jerry','Tyler',
  'Aaron','Nathan','Henry','Peter','Douglas','Adam','Zachary','Walter',
] as const;

const FEMALE_FIRST_NAMES = [
  'Mary','Patricia','Jennifer','Linda','Barbara','Elizabeth','Susan','Jessica','Sarah','Karen',
  'Christine','Margaret','Catherine','Dorothy','Rebecca','Sharon','Laura','Cynthia','Kathleen','Amy',
  'Angela','Shirley','Anna','Brenda','Pamela','Emma','Nicole','Helen','Samantha','Katherine',
  'Christina','Debra','Rachel','Carolyn','Janet','Maria','Heather','Diane','Ruth','Julie',
  'Olivia','Joyce','Virginia','Victoria','Kelly','Lauren','Joan',
] as const;

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Kowalski','Müller','Schmidt','Johansson','Eriksson','Okafor','Mensah','Kwame','Adeyemi',
  'Kim','Tanaka','Chen','Singh','Patel','Shah',
] as const;

const CHURCH_TEMPLATES = [
  'Central SDA Church','First SDA Church','Grace SDA Church','Hope SDA Church',
  'Bethel SDA Church','Emmanuel SDA Church','Victory SDA Church','Light of the World SDA Church',
  'Morning Star SDA Church','New Life SDA Church','Faith SDA Church','Redeemed SDA Church',
  'Glorious SDA Church','Peace SDA Church','Trinity SDA Church',
] as const;

const STREET_NAMES = [
  'Main St','Oak Ave','Church Rd','Park Blvd','Elm St','Cedar Ln',
  'Maple Dr','Pine St','Walnut Ave','Birch Rd','Highland Ave','River Rd',
  'Spring St','Valley Dr','Lake Ave','Forest Ln','Meadow St','Hill Rd',
  'Grove Ave','Creek Ln','Plaza Dr','Broadway','Station Rd','Market St',
];

// ---- Hierarchy definitions ----

const DIVISIONS = [
  { code: 'EUD', name: 'Euro-Asia Division', headquarters: 'Moscow, Russia', description: 'Seventh-day Adventist Church in Euro-Asia region' },
  { code: 'ECD', name: 'East-Central Africa Division', headquarters: 'Nairobi, Kenya', description: 'Seventh-day Adventist Church in East-Central Africa' },
  { code: 'NAD', name: 'North American Division', headquarters: 'Silver Spring, Maryland, USA', description: 'Seventh-day Adventist Church in North America' },
];

const UNIONS = [
  { code: 'RUK', name: 'Russian-Ukrainian Union', divIdx: 0, headquarters: 'Kyiv, Ukraine' },
  { code: 'EUC', name: 'European Union Conference', divIdx: 0, headquarters: 'London, United Kingdom' },
  { code: 'EAU', name: 'East Africa Union', divIdx: 1, headquarters: 'Nairobi, Kenya' },
  { code: 'CAU', name: 'Central Africa Union', divIdx: 1, headquarters: 'Kampala, Uganda' },
  { code: 'PAC', name: 'Pacific Union Conference', divIdx: 2, headquarters: 'Westlake Village, CA, USA' },
  { code: 'ATL', name: 'Atlantic Union Conference', divIdx: 2, headquarters: 'Columbus, OH, USA' },
];

const CONFERENCES = [
  { code: 'MOW', name: 'Moscow Conference', unIdx: 0, hq: 'Moscow, Russia' },
  { code: 'UKR', name: 'Ukrainian Conference', unIdx: 0, hq: 'Kyiv, Ukraine' },
  { code: 'SEC', name: 'South England Conference', unIdx: 1, hq: 'London, UK' },
  { code: 'EEC', name: 'Eastern European Conference', unIdx: 1, hq: 'Warsaw, Poland' },
  { code: 'KEN', name: 'Kenya Conference', unIdx: 2, hq: 'Nairobi, Kenya' },
  { code: 'TAN', name: 'Tanzania Conference', unIdx: 2, hq: 'Dar es Salaam, Tanzania' },
  { code: 'UGA', name: 'Uganda Conference', unIdx: 3, hq: 'Kampala, Uganda' },
  { code: 'RWA', name: 'Rwanda-Burundi Conference', unIdx: 3, hq: 'Kigali, Rwanda' },
  { code: 'SCC', name: 'Southern California Conference', unIdx: 4, hq: 'Los Angeles, CA, USA' },
  { code: 'NCC', name: 'Northern California Conference', unIdx: 4, hq: 'San Francisco, CA, USA' },
  { code: 'GNY', name: 'Greater New York Conference', unIdx: 5, hq: 'New York, NY, USA' },
  { code: 'TEX', name: 'Texas Conference', unIdx: 5, hq: 'Houston, TX, USA' },
];

// Each conference maps to 5 [city, country] pairs for its churches
const CONF_CHURCH_LOCS: Array<Array<{ city: string; country: string }>> = [
  // 0 Moscow
  Array(5).fill(null).map(() => ({ city: 'Moscow', country: 'Russia' })),
  // 1 Ukrainian
  Array(5).fill(null).map(() => ({ city: 'Kyiv', country: 'Ukraine' })),
  // 2 South England
  [
    { city: 'London', country: 'United Kingdom' },
    { city: 'London', country: 'United Kingdom' },
    { city: 'London', country: 'United Kingdom' },
    { city: 'Birmingham', country: 'United Kingdom' },
    { city: 'Birmingham', country: 'United Kingdom' },
  ],
  // 3 Eastern European
  [
    { city: 'Warsaw', country: 'Poland' },
    { city: 'Warsaw', country: 'Poland' },
    { city: 'Warsaw', country: 'Poland' },
    { city: 'Prague', country: 'Czech Republic' },
    { city: 'Prague', country: 'Czech Republic' },
  ],
  // 4 Kenya
  [
    { city: 'Nairobi', country: 'Kenya' },
    { city: 'Nairobi', country: 'Kenya' },
    { city: 'Nairobi', country: 'Kenya' },
    { city: 'Mombasa', country: 'Kenya' },
    { city: 'Mombasa', country: 'Kenya' },
  ],
  // 5 Tanzania
  [
    { city: 'Dar es Salaam', country: 'Tanzania' },
    { city: 'Dar es Salaam', country: 'Tanzania' },
    { city: 'Dar es Salaam', country: 'Tanzania' },
    { city: 'Arusha', country: 'Tanzania' },
    { city: 'Arusha', country: 'Tanzania' },
  ],
  // 6 Uganda
  Array(5).fill(null).map(() => ({ city: 'Kampala', country: 'Uganda' })),
  // 7 Rwanda
  Array(5).fill(null).map(() => ({ city: 'Kigali', country: 'Rwanda' })),
  // 8 Southern California
  [
    { city: 'Los Angeles', country: 'United States' },
    { city: 'Los Angeles', country: 'United States' },
    { city: 'Los Angeles', country: 'United States' },
    { city: 'Phoenix', country: 'United States' },
    { city: 'Phoenix', country: 'United States' },
  ],
  // 9 Northern California
  Array(5).fill(null).map(() => ({ city: 'Seattle', country: 'United States' })),
  // 10 Greater New York
  Array(5).fill(null).map(() => ({ city: 'New York', country: 'United States' })),
  // 11 Texas
  [
    { city: 'Houston', country: 'United States' },
    { city: 'Houston', country: 'United States' },
    { city: 'Houston', country: 'United States' },
    { city: 'Dallas', country: 'United States' },
    { city: 'Dallas', country: 'United States' },
  ],
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

let _pidCounter = 0;

function generatePID(): string {
  _pidCounter++;
  const counter = _pidCounter.toString(36).toUpperCase().padStart(4, '0');
  const random = nanoid(6).toUpperCase();
  return `PID-${counter}-${random}`;
}

function ensureCorrectSchema() {
  const dbUrl = process.env.DATABASE_URL || '';
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  const pgSchemaPath = join(process.cwd(), 'prisma', 'schema.postgresql.prisma');
  try {
    const currentSchema = readFileSync(schemaPath, 'utf-8');
    const isCurrentPG = currentSchema.includes('provider = "postgresql"');
    const isDBPostgres = dbUrl.includes('postgres');
    if (isDBPostgres && !isCurrentPG && existsSync(pgSchemaPath)) {
      console.log('[seed] Swapping to PostgreSQL schema...');
      copyFileSync(pgSchemaPath, schemaPath);
      execSync('npx prisma generate --skip-generate 2>&1 || npx prisma generate 2>&1', { timeout: 60000 });
    }
  } catch (e) {
    console.error('[seed] Schema swap error:', e);
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Random date in a year, biased toward summer months (May–Aug). */
function randomDateInYear(year: number): Date {
  const monthW = [3, 3, 4, 5, 7, 9, 9, 8, 6, 5, 3, 2];
  const total = monthW.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let month = 11;
  for (let i = 0; i < 12; i++) {
    r -= monthW[i];
    if (r <= 0) { month = i; break; }
  }
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, randomInt(1, Math.min(maxDay, 28)));
}

async function batchInsert<T>(
  model: { createMany: (args: { data: T[] }) => Promise<{ count: number }> },
  data: T[],
  batchSize = 100,
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    await model.createMany({ data: data.slice(i, i + batchSize) });
  }
}

// ============================================================
// POST HANDLER
// ============================================================

export async function POST() {
  try {
    // --- Schema & DB setup ---
    ensureCorrectSchema();
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', { timeout: 30000 });
    } catch (pushErr) {
      console.error('[seed] db push warning:', pushErr);
    }

    // --- Guard: already seeded? ---
    const existing = await db.division.count();
    if (existing > 0) {
      return NextResponse.json({ success: false, error: 'Database already seeded. Use /api/reset first.' });
    }

    const passwordHash = await hashPassword('Password123');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ===========================================================
    // 1. DIVISIONS  (3)
    // ===========================================================
    const divisions = await Promise.all(
      DIVISIONS.map((d) => db.division.create({ data: d })),
    );
    console.log(`[seed] ${divisions.length} divisions`);

    // ===========================================================
    // 2. UNIONS  (6)
    // ===========================================================
    const unions = await Promise.all(
      UNIONS.map((u) =>
        db.union.create({
          data: { code: u.code, name: u.name, divisionId: divisions[u.divIdx].id, headquarters: u.headquarters },
        }),
      ),
    );
    console.log(`[seed] ${unions.length} unions`);

    // ===========================================================
    // 3. CONFERENCES  (12)
    // ===========================================================
    const conferences = await Promise.all(
      CONFERENCES.map((c) =>
        db.conference.create({
          data: { code: c.code, name: c.name, unionId: unions[c.unIdx].id, headquarters: c.hq },
        }),
      ),
    );
    console.log(`[seed] ${conferences.length} conferences`);

    // ===========================================================
    // 4. CHURCHES  (60 — 5 per conference)
    // ===========================================================
    const churchPromises: Promise<ReturnType<typeof db.church.create>>[] = [];
    const shuffledTemplates = [...CHURCH_TEMPLATES].sort(() => Math.random() - 0.5);

    for (let ci = 0; ci < conferences.length; ci++) {
      const locs = CONF_CHURCH_LOCS[ci];
      for (let ch = 0; ch < 5; ch++) {
        const loc = locs[ch];
        const tpl = shuffledTemplates[(ci * 5 + ch) % shuffledTemplates.length];
        churchPromises.push(
          db.church.create({
            data: {
              code: String(ch + 1).padStart(3, '0'),
              name: `${loc.city} ${tpl}`,
              conferenceId: conferences[ci].id,
              address: `${randomInt(1, 500)} ${randomItem(STREET_NAMES)}`,
              city: loc.city,
              country: loc.country,
            },
          }),
        );
      }
    }
    const allChurches = await Promise.all(churchPromises);
    console.log(`[seed] ${allChurches.length} churches`);

    // ===========================================================
    // 5. ADMIN USERS  (7)
    // ===========================================================
    const gcAdmin = await db.user.create({
      data: { email: 'gc.admin@adventify.org', passwordHash, fullName: 'General Conference Administrator', role: Role.GENERAL_CONFERENCE_ADMIN },
    });
    const eudAdmin = await db.user.create({
      data: { email: 'eud.admin@adventify.org', passwordHash, fullName: 'Euro-Asia Division Administrator', role: Role.DIVISION_ADMIN, divisionId: divisions[0].id },
    });
    const ecaAdmin = await db.user.create({
      data: { email: 'eca.admin@adventify.org', passwordHash, fullName: 'East-Central Africa Division Administrator', role: Role.DIVISION_ADMIN, divisionId: divisions[1].id },
    });
    const nadAdmin = await db.user.create({
      data: { email: 'nad.admin@adventify.org', passwordHash, fullName: 'North American Division Administrator', role: Role.DIVISION_ADMIN, divisionId: divisions[2].id },
    });
    const bucAdmin = await db.user.create({
      data: { email: 'buc.admin@adventify.org', passwordHash, fullName: 'British Union Administrator', role: Role.UNION_ADMIN, unionId: unions[1].id },
    });
    const secAdmin = await db.user.create({
      data: { email: 'sec.admin@adventify.org', passwordHash, fullName: 'South England Conference Administrator', role: Role.CONFERENCE_ADMIN, conferenceId: conferences[2].id },
    });
    const churchClerk = await db.user.create({
      data: { email: 'church.clerk@adventify.org', passwordHash, fullName: 'London Central Church Clerk', role: Role.CHURCH_CLERK, churchId: allChurches[0].id },
    });
    const adminUsers = [gcAdmin, eudAdmin, ecaAdmin, nadAdmin, bucAdmin, secAdmin, churchClerk];
    console.log(`[seed] ${adminUsers.length} admin users`);

    // ===========================================================
    // 6. PASTORS  (60 — first one is the special church.pastor)
    // ===========================================================
    const pastorData: Array<{
      email: string; passwordHash: string; fullName: string;
      role: Role; churchId: string;
    }> = [];

    // First pastor: special account
    pastorData.push({
      email: 'church.pastor@adventify.org',
      passwordHash,
      fullName: 'Pastor James Wilson',
      role: Role.CHURCH_PASTOR,
      churchId: allChurches[0].id,
    });

    // Remaining 59 pastors
    const usedPastorNames = new Set<string>();
    for (let i = 1; i < 60; i++) {
      const church = allChurches[i];
      let firstName: string;
      let lastName: string;
      let key: string;
      do {
        firstName = randomItem(MALE_FIRST_NAMES);
        lastName = randomItem(LAST_NAMES);
        key = `${firstName} ${lastName}`;
      } while (usedPastorNames.has(key));
      usedPastorNames.add(key);
      pastorData.push({
        email: `pastor.church${i}@adventify.org`,
        passwordHash,
        fullName: `Pastor ${firstName} ${lastName}`,
        role: Role.CHURCH_PASTOR,
        churchId: church.id,
      });
    }
    await batchInsert(db.user, pastorData);
    console.log(`[seed] ${pastorData.length} pastors created`);

    // ===========================================================
    // 7. CLERKS  (60 — generated for all churches incl. church 0)
    // ===========================================================
    const clerkData: Array<{
      email: string; passwordHash: string; fullName: string;
      role: Role; churchId: string;
    }> = [];
    const usedClerkNames = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const church = allChurches[i];
      let firstName: string;
      let lastName: string;
      let key: string;
      do {
        firstName = randomItem(FEMALE_FIRST_NAMES);
        lastName = randomItem(LAST_NAMES);
        key = `${firstName} ${lastName}`;
      } while (usedClerkNames.has(key));
      usedClerkNames.add(key);
      clerkData.push({
        email: `clerk.church${i}@adventify.org`,
        passwordHash,
        fullName: `${firstName} ${lastName}`,
        role: Role.CHURCH_CLERK,
        churchId: church.id,
      });
    }
    await batchInsert(db.user, clerkData);
    console.log(`[seed] ${clerkData.length} clerks created`);

    // Fetch all local (non-admin) users for later FK references
    const allPastors = await db.user.findMany({ where: { role: Role.CHURCH_PASTOR } });
    const allClerks = await db.user.findMany({ where: { role: Role.CHURCH_CLERK } });
    const allUsers = [...adminUsers, ...allPastors, ...allClerks];
    console.log(`[seed] total users: ${allUsers.length}`);

    // Build pastor-lookup by church
    const pastorsByChurch = new Map<string, typeof allPastors[0]>();
    for (const p of allPastors) {
      if (p.churchId) pastorsByChurch.set(p.churchId, p);
    }

    // ===========================================================
    // 8. PERSONS  (800 — weighted across churches for variation)
    // ===========================================================
    // Assign weight to each church so some churches are bigger
    const churchWeight = Array.from({ length: 60 }, () => randomInt(8, 18));
    const weightSum = churchWeight.reduce((a, b) => a + b, 0);

    function pickChurchIndex(): number {
      let r = Math.random() * weightSum;
      for (let i = 0; i < 60; i++) {
        r -= churchWeight[i];
        if (r <= 0) return i;
      }
      return 59;
    }

    const personData: Array<{
      pid: string; fullName: string; dateOfBirth: Date;
      gender: string; email: string; churchId: string;
    }> = [];

    for (let i = 0; i < 800; i++) {
      const gender = Math.random() < 0.55 ? 'Female' : 'Male';
      const firstName = gender === 'Female' ? randomItem(FEMALE_FIRST_NAMES) : randomItem(MALE_FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const churchIdx = pickChurchIndex();

      personData.push({
        pid: generatePID(),
        fullName: `${firstName} ${lastName}`,
        dateOfBirth: new Date(randomInt(1958, 2006), randomInt(0, 11), randomInt(1, 28)),
        gender,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@email.com`,
        churchId: allChurches[churchIdx].id,
      });
    }
    await batchInsert(db.person, personData);

    const allPersons = await db.person.findMany({ orderBy: { createdAt: 'asc' } });
    console.log(`[seed] ${allPersons.length} persons`);

    // ===========================================================
    // 9. BAPTISM RECORDS  (500)
    //    350 APPROVED (spread 2021–2025, summer-weighted months)
    //    100 PENDING  (mostly 2025–2026)
    //     50 REJECTED (spread 2022–2025)
    // ===========================================================
    const bapData: Array<{
      personId: string; churchId: string; baptismDate: Date;
      pastorName: string; pastorTitle?: string; status: BaptismStatus;
      approvedBy?: string; approvedAt?: Date; rejectionReason?: string;
    }> = [];

    // --- APPROVED (350) ---
    const approvedYearPlan = [
      { year: 2021, count: 50 },
      { year: 2022, count: 65 },
      { year: 2023, count: 80 },
      { year: 2024, count: 90 },
      { year: 2025, count: 65 },
    ];
    let pIdx = 0;
    for (const plan of approvedYearPlan) {
      for (let j = 0; j < plan.count && pIdx < allPersons.length; j++, pIdx++) {
        const person = allPersons[pIdx];
        const church = allChurches.find((c) => c.id === person.churchId) ?? allChurches[0];
        const pastor = pastorsByChurch.get(church.id);
        const pName = pastor ? pastor.fullName.replace(/^Pastor\s+/i, '') : randomItem(['James Wilson', 'Emily Thompson']);
        const bDate = randomDateInYear(plan.year);
        bapData.push({
          personId: person.id,
          churchId: church.id,
          baptismDate: bDate,
          pastorName: `Pastor ${pName}`,
          pastorTitle: 'Senior Pastor',
          status: BaptismStatus.APPROVED,
          approvedBy: secAdmin.id,
          approvedAt: new Date(bDate.getTime() + 86_400_000),
        });
      }
    }

    // --- PENDING (100) ---
    for (let j = 0; j < 100 && pIdx < allPersons.length; j++, pIdx++) {
      const person = allPersons[pIdx];
      const church = allChurches.find((c) => c.id === person.churchId) ?? allChurches[0];
      const pastor = pastorsByChurch.get(church.id);
      const pName = pastor ? pastor.fullName.replace(/^Pastor\s+/i, '') : 'James Wilson';
      const year = Math.random() < 0.75 ? 2025 : 2026;
      bapData.push({
        personId: person.id,
        churchId: church.id,
        baptismDate: randomDateInYear(year),
        pastorName: `Pastor ${pName}`,
        status: BaptismStatus.PENDING,
      });
    }

    // --- REJECTED (50) ---
    const rejectReasons = [
      'Incomplete documentation provided',
      'Baptism ceremony not properly witnessed',
      'Missing required signatures on certificate',
      'Baptism did not follow approved procedures',
      'Record submitted past the deadline',
      'Supporting documents could not be verified',
    ];
    for (let j = 0; j < 50 && pIdx < allPersons.length; j++, pIdx++) {
      const person = allPersons[pIdx];
      const church = allChurches.find((c) => c.id === person.churchId) ?? allChurches[0];
      const pastor = pastorsByChurch.get(church.id);
      const pName = pastor ? pastor.fullName.replace(/^Pastor\s+/i, '') : 'Robert Davis';
      const year = weightedPick([2022, 2023, 2024, 2025] as const, [1, 2, 3, 4]);
      bapData.push({
        personId: person.id,
        churchId: church.id,
        baptismDate: randomDateInYear(year),
        pastorName: `Pastor ${pName}`,
        status: BaptismStatus.REJECTED,
        rejectionReason: randomItem(rejectReasons),
      });
    }

    await batchInsert(db.baptismRecord, bapData);
    const allBaptisms = await db.baptismRecord.findMany({ orderBy: { createdAt: 'asc' } });
    const approvedRecords = allBaptisms.filter((r) => r.status === BaptismStatus.APPROVED);
    console.log(`[seed] ${allBaptisms.length} baptism records (${approvedRecords.length} approved)`);

    // ===========================================================
    // 10. CERTIFICATES  (350 — one per APPROVED record)
    // ===========================================================
    const certData = approvedRecords.map((rec, idx) => {
      const yr = rec.baptismDate.getFullYear();
      const num = String(idx + 1).padStart(6, '0');
      const bcn = `BCN-${yr}-${num}`;
      return {
        bcn,
        baptismRecordId: rec.id,
        certificateDate: new Date(rec.baptismDate.getTime() + 7 * 86_400_000),
        verificationUrl: `${baseUrl}/verify/${bcn}`,
      };
    });
    await batchInsert(db.certificate, certData);
    console.log(`[seed] ${certData.length} certificates`);

    // ===========================================================
    // 11. MEMBER REQUESTS  (150)
    // ===========================================================
    const docTypes: DocumentType[] = Object.values(DocumentType) as DocumentType[];
    const reqStatuses: RequestStatus[] = [
      RequestStatus.PENDING, RequestStatus.APPROVED,
      RequestStatus.REJECTED, RequestStatus.GENERATED,
    ];
    const reqReasons = [
      'Need for visa application',
      'Church membership transfer',
      'Employment verification',
      'Immigration documentation',
      'Personal records request',
      'Scholarship application',
      'Legal proceedings requirement',
      'Wedding documentation',
    ];
    const rejectReqReasons = [
      'Insufficient documentation provided',
      'Request not approved by pastor',
      'Duplicate request detected',
      'Information mismatch on records',
    ];

    const mrData: Array<{
      requestId: string; memberId: string; personId: string;
      churchId: string; documentType: DocumentType; reason: string;
      status: RequestStatus; rejectionReason?: string;
    }> = [];

    const usedReqIds = new Set<string>();
    for (let i = 0; i < 150; i++) {
      const person = allPersons[i % Math.min(allPersons.length, 500)];
      const churchId = person.churchId ?? allChurches[0].id;
      const clerk = allClerks.find((c) => c.churchId === churchId) ?? allClerks[0];
      const memberId = clerk.id;

      let requestId: string;
      do {
        const yr = weightedPick([2024, 2025] as const, [2, 8]);
        const chars = Array.from({ length: 8 }, () =>
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)],
        ).join('');
        requestId = `REQ-${yr}-${chars}`;
      } while (usedReqIds.has(requestId));
      usedReqIds.add(requestId);

      const status = weightedPick(reqStatuses, [20, 15, 10, 55]);

      const entry: typeof mrData[number] = {
        requestId,
        memberId,
        personId: person.id,
        churchId,
        documentType: randomItem(docTypes),
        reason: randomItem(reqReasons),
        status,
      };
      if (status === RequestStatus.REJECTED) {
        entry.rejectionReason = randomItem(rejectReqReasons);
      }
      mrData.push(entry);
    }
    await batchInsert(db.memberRequest, mrData);
    console.log(`[seed] ${mrData.length} member requests`);

    // ===========================================================
    // 12. AUDIT LOGS  (200)
    // ===========================================================
    const auditTemplates = [
      { action: 'CREATE', entity: 'BaptismRecord', tpl: 'Created baptism record for {p}' },
      { action: 'APPROVE', entity: 'BaptismRecord', tpl: 'Approved baptism record for {p}' },
      { action: 'REJECT', entity: 'BaptismRecord', tpl: 'Rejected baptism record for {p}: incomplete docs' },
      { action: 'CREATE', entity: 'Certificate', tpl: 'Certificate issued for {p} (BCN-{bcn})' },
      { action: 'LOGIN', entity: 'User', tpl: '{u} logged in from {ip}' },
      { action: 'UPDATE', entity: 'MemberRequest', tpl: 'Updated document request {req}' },
      { action: 'APPROVE', entity: 'MemberRequest', tpl: 'Approved & generated document for request {req}' },
    ];

    const samplePersons = allPersons.slice(0, 30);
    const sampleUsers = allUsers.slice(0, 25);

    const auditData: Array<{
      userId: string; action: string; entity: string;
      details: string; ipAddress: string; createdAt: Date;
    }> = [];

    for (let i = 0; i < 200; i++) {
      const tmpl = randomItem(auditTemplates);
      const person = randomItem(samplePersons);
      const user = randomItem(sampleUsers);
      const daysAgo = randomInt(0, 365);
      const details = tmpl.tpl
        .replace('{p}', person.fullName)
        .replace('{u}', user.fullName)
        .replace('{ip}', `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`)
        .replace('{bcn}', `BCN-2024-${String(randomInt(1, 350)).padStart(6, '0')}`)
        .replace('{req}', `REQ-2025-${Array.from({ length: 8 }, () =>
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('')}`);
      auditData.push({
        userId: user.id,
        action: tmpl.action,
        entity: tmpl.entity,
        details,
        ipAddress: `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`,
        createdAt: new Date(Date.now() - daysAgo * 86_400_000),
      });
    }
    await batchInsert(db.auditLog, auditData);
    console.log(`[seed] ${auditData.length} audit logs`);

    // ===========================================================
    // 13. NOTIFICATIONS  (100)
    // ===========================================================
    const notifTitles = [
      'Baptism Record Approved',
      'New Baptism Record Submitted',
      'Certificate Ready for Download',
      'Document Request Processed',
      'System Notification',
      'Membership Verification Complete',
    ];
    const notifMessages = [
      'Your baptism record has been approved by the conference administrator.',
      'A new baptism record has been submitted and is awaiting review.',
      'Your baptism certificate is now ready for download.',
      'Your document request has been processed successfully.',
      'Please review the pending items in your queue.',
      'Membership verification document has been generated.',
    ];
    const notifStatuses: NotificationStatus[] = [
      NotificationStatus.PENDING, NotificationStatus.SENT,
      NotificationStatus.DELIVERED, NotificationStatus.FAILED,
    ];

    const notifData: Array<{
      userId: string; sentById: string; type: NotificationType;
      channel: string; title: string; message: string;
      status: NotificationStatus; createdAt: Date;
      sentAt: Date | null; deliveredAt: Date | null;
    }> = [];

    for (let i = 0; i < 100; i++) {
      const user = randomItem(sampleUsers);
      const daysAgo = randomInt(0, 180);
      const status = weightedPick(notifStatuses, [10, 30, 55, 5]);
      const created = new Date(Date.now() - daysAgo * 86_400_000);
      notifData.push({
        userId: user.id,
        sentById: gcAdmin.id,
        type: NotificationType.IN_APP,
        channel: randomItem(['in_app', 'email', 'sms'] as const),
        title: randomItem(notifTitles),
        message: randomItem(notifMessages),
        status,
        createdAt: created,
        sentAt: status !== NotificationStatus.PENDING ? new Date(created.getTime() + 60_000) : null,
        deliveredAt: status === NotificationStatus.DELIVERED ? new Date(created.getTime() + 300_000) : null,
      });
    }
    await batchInsert(db.notification, notifData);
    console.log(`[seed] ${notifData.length} notifications`);

    // ===========================================================
    // SUMMARY
    // ===========================================================
    const totalRecords =
      divisions.length + unions.length + conferences.length +
      allChurches.length + allUsers.length + allPersons.length +
      allBaptisms.length + certData.length + mrData.length +
      auditData.length + notifData.length;

    return NextResponse.json({
      success: true,
      message: 'Database seeded with comprehensive demo data',
      data: {
        divisions: divisions.length,
        unions: unions.length,
        conferences: conferences.length,
        churches: allChurches.length,
        users: allUsers.length,
        persons: allPersons.length,
        baptismRecords: allBaptisms.length,
        certificates: certData.length,
        memberRequests: mrData.length,
        auditLogs: auditData.length,
        notifications: notifData.length,
        totalRecords,
        credentials: [
          { email: 'gc.admin@adventify.org', password: 'Password123', role: 'General Conference Admin' },
          { email: 'eud.admin@adventify.org', password: 'Password123', role: 'Division Admin (Euro-Asia)' },
          { email: 'eca.admin@adventify.org', password: 'Password123', role: 'Division Admin (East-Central Africa)' },
          { email: 'nad.admin@adventify.org', password: 'Password123', role: 'Division Admin (North American)' },
          { email: 'buc.admin@adventify.org', password: 'Password123', role: 'Union Admin (British)' },
          { email: 'sec.admin@adventify.org', password: 'Password123', role: 'Conference Admin (South England)' },
          { email: 'church.clerk@adventify.org', password: 'Password123', role: 'Church Clerk (London Central)' },
          { email: 'church.pastor@adventify.org', password: 'Password123', role: 'Church Pastor (London Central)' },
        ],
      },
    });
  } catch (error) {
    console.error('[seed] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 },
    );
  }
}
