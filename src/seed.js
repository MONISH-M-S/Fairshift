import { insert, resetStore } from './store.js';

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (offsetDays = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
};

const at = (offsetDays, hour, minute = 0) => {
  const date = startOfDay(offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const dateKey = (offsetDays) => at(offsetDays, 12).slice(0, 10);

const shift = (worker, offsetDays, startHour, minutes, breakMinutes = 60, extra = {}) => {
  const start = new Date(at(offsetDays, startHour));
  const end = new Date(start.getTime() + minutes * 60000);
  return {
    id: `s_${worker.id}_${dateKey(offsetDays)}`,
    workerId: worker.id,
    orgId: worker.orgId,
    date: dateKey(offsetDays),
    start: start.toISOString(),
    end: end.toISOString(),
    breakMinutes,
    source: 'qr',
    disputed: false,
    ...extra,
  };
};

/**
 * Seeded demo dataset.
 *
 * Two organisations in two industries, driven by the same code paths. The
 * records are chosen to tell a story an evaluator can actually see on the
 * dashboard: heavy overtime, a rest-gap violation, an overdue safety case and
 * a worker whose pay falls below the agreed rate.
 */
export function seed() {
  resetStore();

  const construction = insert('orgs', {
    id: 'org_construction',
    industry: 'construction',
    name: 'Meridian Buildcon',
    site: 'Kilpauk Site 2',
  });

  const college = insert('orgs', {
    id: 'org_college',
    industry: 'college',
    name: 'Periyar Institute of Technology',
    site: 'Guindy Campus',
  });

  const hospital = insert('orgs', {
    id: 'org_hospital',
    industry: 'hospital',
    name: 'Kaveri Hospital',
    site: 'Anna Nagar Campus',
  });

  const workers = [
    { id: 'w_priya', orgId: construction.id, name: 'Priya', role: 'Mason', language: 'ta', hourlyRate: 120 },
    { id: 'w_selvam', orgId: construction.id, name: 'Selvam', role: 'Helper', language: 'ta', hourlyRate: 95 },
    { id: 'w_ramesh', orgId: construction.id, name: 'Ramesh', role: 'Steel Fixer', language: 'hi', hourlyRate: 130 },
    { id: 'w_anita', orgId: construction.id, name: 'Anita', role: 'Electrician', language: 'hi', hourlyRate: 150 },
    { id: 'w_kumar', orgId: construction.id, name: 'Kumar', role: 'Mason', language: 'ta', hourlyRate: 115 },
    { id: 'w_farhan', orgId: construction.id, name: 'Farhan', role: 'Helper', language: 'hi', hourlyRate: 90 },
    { id: 'w_arjun', orgId: college.id, name: 'Arjun', role: 'Lab Assistant', language: 'en', hourlyRate: 180 },
    { id: 'w_meera', orgId: college.id, name: 'Meera', role: 'Lecturer', language: 'en', hourlyRate: 420 },
    { id: 'w_divya', orgId: college.id, name: 'Divya', role: 'Admin Assistant', language: 'ta', hourlyRate: 160 },
    { id: 'w_suresh', orgId: college.id, name: 'Suresh', role: 'Lab Technician', language: 'ta', hourlyRate: 140 },
    { id: 'w_kavitha', orgId: hospital.id, name: 'Kavitha', role: 'Staff Nurse', language: 'ta', hourlyRate: 240 },
    { id: 'w_deepak', orgId: hospital.id, name: 'Deepak', role: 'Ward Attendant', language: 'hi', hourlyRate: 110 },
  ];

  for (const worker of workers) insert('workers', worker);

  insert('workers', {
    id: 'a_ravi',
    orgId: construction.id,
    name: 'Ravi',
    role: 'Site Supervisor',
    language: 'ta',
    hourlyRate: 0,
    admin: true,
  });
  insert('workers', {
    id: 'a_lakshmi',
    orgId: college.id,
    name: 'Lakshmi',
    role: 'Principal',
    language: 'en',
    hourlyRate: 0,
    admin: true,
  });
  insert('workers', {
    id: 'a_anand',
    orgId: hospital.id,
    name: 'Dr. Anand',
    role: 'Medical Superintendent',
    language: 'en',
    hourlyRate: 0,
    admin: true,
  });

  const byId = Object.fromEntries(workers.map((worker) => [worker.id, worker]));

  // Weekly patterns: Monday-first. [startHour, minutes, breakMinutes]
  const patterns = {
    w_priya: [0, 1, 2, 3, 4, 5].map(() => [8, 540, 60]),
    w_selvam: [0, 1, 2, 3, 4, 5].map(() => [8, 510, 45]),
    w_ramesh: [0, 1, 2, 3, 4, 5, 6].map(() => [7, 660, 45]),
    w_anita: [0, 1, 2, 3, 4].map(() => [9, 480, 30]),
    w_kumar: [0, 1, 2, 3, 4, 5].map(() => [8, 500, 60]),
    w_farhan: [0, 2, 4].map(() => [8, 480, 60]),
    w_arjun: [0, 1, 2, 3, 4].map(() => [9, 480, 45]),
    w_meera: [0, 1, 2, 3, 4].map(() => [9, 540, 60]),
    w_divya: [0, 1, 2, 3, 4].map(() => [9, 450, 45]),
    w_suresh: [0, 1, 2, 3, 4].map(() => [8, 480, 45]),
    w_kavitha: [0, 1, 2, 3].map(() => [7, 720, 60]),
    w_deepak: [0, 1, 2, 3, 4].map(() => [8, 480, 45]),
  };

  for (let offset = -13; offset <= 0; offset += 1) {
    const weekday = (startOfDay(offset).getDay() + 6) % 7; // 0 = Monday
    for (const [workerId, pattern] of Object.entries(patterns)) {
      const slot = pattern[weekday];
      if (!slot) continue;
      insert('shifts', shift(byId[workerId], offset, slot[0], slot[1], slot[2]));
    }
  }

  // Priya's overtime story: two long days this week, traceable line by line.
  for (const offset of [-1, -2]) {
    insert('shifts', shift(byId.w_priya, offset, 8, 660, 60, { source: 'qr' }));
  }

  // Selvam: short rest gap — left at 23:30, clocked in again at 07:00.
  insert('shifts', shift(byId.w_selvam, -1, 18, 330, 30, { source: 'manual' }));
  insert('shifts', shift(byId.w_selvam, 0, 7, 300, 30, { source: 'manual' }));

  // Meera: weekly load above the college cap even before overtime.
  for (const offset of [-3, -4]) {
    insert('shifts', shift(byId.w_meera, offset, 9, 660, 45));
  }

  // An open shift to demonstrate a live check-out.
  const kumarStart = new Date(at(0, 8));
  insert('shifts', {
    id: `s_${byId.w_kumar.id}_${dateKey(0)}_open`,
    workerId: byId.w_kumar.id,
    orgId: byId.w_kumar.orgId,
    date: dateKey(0),
    start: kumarStart.toISOString(),
    end: null,
    breakMinutes: 60,
    source: 'code',
    disputed: false,
  });

  const nowIso = new Date().toISOString();
  const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  insert('cases', {
    id: 'c_1',
    orgId: construction.id,
    workerId: 'w_selvam',
    anonymous: false,
    type: 'safety',
    category: 'Scaffolding',
    text: 'Third floor scaffolding has no toe board. Material fell near the ladder yesterday.',
    lang: 'ta',
    severity: 'high',
    status: 'open',
    createdAt: hoursAgo(52),
    dueAt: hoursAgo(52 - 24),
    events: [{ at: hoursAgo(52), status: 'open', note: 'Reported by worker' }],
  });

  insert('cases', {
    id: 'c_2',
    orgId: construction.id,
    workerId: null,
    anonymous: true,
    type: 'grievance',
    category: 'Overtime not paid',
    text: 'We worked three extra hours on Saturday but the register shows eight hours.',
    lang: 'hi',
    severity: 'medium',
    status: 'acknowledged',
    createdAt: hoursAgo(20),
    dueAt: hoursAgo(20 - 48),
    events: [
      { at: hoursAgo(20), status: 'open', note: 'Reported anonymously' },
      { at: hoursAgo(6), status: 'acknowledged', note: 'Supervisor Ravi is checking the register' },
    ],
  });

  insert('cases', {
    id: 'c_3',
    orgId: construction.id,
    workerId: 'w_priya',
    anonymous: false,
    type: 'grievance',
    category: 'Drinking water',
    text: 'The water cooler on the second floor has been broken for a week.',
    lang: 'ta',
    severity: 'low',
    status: 'resolved',
    createdAt: hoursAgo(120),
    dueAt: hoursAgo(120 - 72),
    resolvedAt: hoursAgo(96),
    events: [
      { at: hoursAgo(120), status: 'open', note: 'Reported by worker' },
      { at: hoursAgo(110), status: 'acknowledged', note: 'Assigned to site admin' },
      { at: hoursAgo(96), status: 'resolved', note: 'Cooler replaced and tested' },
    ],
  });

  insert('cases', {
    id: 'c_4',
    orgId: college.id,
    workerId: 'w_arjun',
    anonymous: false,
    type: 'safety',
    category: 'Laboratory safety',
    text: 'Chemistry lab exhaust fan is not working. Students complained of fumes.',
    lang: 'en',
    severity: 'high',
    status: 'acknowledged',
    createdAt: hoursAgo(30),
    dueAt: hoursAgo(30 - 24),
    events: [
      { at: hoursAgo(30), status: 'open', note: 'Reported by staff' },
      { at: hoursAgo(26), status: 'acknowledged', note: 'Facilities informed' },
    ],
  });

  insert('cases', {
    id: 'c_5',
    orgId: college.id,
    workerId: null,
    anonymous: true,
    type: 'grievance',
    category: 'Contract renewal',
    text: 'Guest lecturers were told about renewal verbally. No written confirmation yet.',
    lang: 'ta',
    severity: 'medium',
    status: 'open',
    createdAt: hoursAgo(8),
    dueAt: hoursAgo(8 - 48),
    events: [{ at: hoursAgo(8), status: 'open', note: 'Reported anonymously' }],
  });

  const feedbackSeed = [
    [construction, 'w_priya', false, 'hi', 'Supervisor explains the wage calculation now, but overtime slips are still written by hand.', 'wage transparency', 'neutral'],
    [construction, null, true, 'ta', 'The night shift has no transport back home. Women on the site do not feel safe after 9 pm.', 'safety', 'negative'],
    [construction, null, true, 'hi', 'Safety helmets ran out last week and nobody replaced them.', 'safety equipment', 'negative'],
    [construction, 'w_anita', false, 'hi', 'Good team, but the break room has no shade in the afternoon.', 'working conditions', 'neutral'],
    [college, 'w_arjun', false, 'en', 'Lab equipment budget is fine but the maintenance request process is slow.', 'facilities', 'neutral'],
    [college, null, true, 'ta', 'Contract staff are not included in the staff meeting, so we hear decisions late.', 'inclusion', 'negative'],
    [college, 'w_meera', false, 'en', 'Timetable changes arrive the night before. It makes class preparation hard.', 'scheduling', 'negative'],
  ];

  feedbackSeed.forEach(([org, workerId, anonymous, lang, text, theme, sentiment], index) => {
    insert('feedback', {
      id: `f_${index + 1}`,
      orgId: org.id,
      workerId,
      anonymous,
      lang,
      text,
      theme,
      sentiment,
      source: 'seed',
      createdAt: hoursAgo(4 + index * 9),
    });
  });

  const skills = [
    ['w_priya', 'Scaffolding safety', 'Tamil Nadu Construction Workers Board', 2025],
    ['w_priya', 'First aid', 'Indian Red Cross', 2024],
    ['w_priya', 'Masonry level 2', 'NSDC', 2023],
    ['w_ramesh', 'Working at height', 'NSDC', 2025],
    ['w_anita', 'Electrical safety', 'NSDC', 2024],
    ['w_arjun', 'Lab safety officer', 'Institution', 2025],
    ['w_meera', 'Pedagogy certificate', 'NPTEL', 2024],
    ['w_suresh', 'First aid', 'Indian Red Cross', 2023],
    ['w_kavitha', 'Critical Care Nursing (ICU)', 'Tamil Nadu Nursing Council', 2024],
    ['w_kavitha', 'Advanced Cardiac Life Support (ACLS)', 'AHA', 2025],
    ['w_deepak', 'Hospital Infection Control', 'NABH', 2025],
  ];

  skills.forEach(([workerId, title, issuer, year], index) => {
    insert('skills', {
      id: `sk_${index + 1}`,
      workerId,
      title,
      issuer,
      year,
      verified: true,
      addedAt: nowIso,
    });
  });

  insert('cases', {
    id: 'c_6',
    orgId: hospital.id,
    workerId: 'w_kavitha',
    anonymous: false,
    type: 'safety',
    category: 'Needle-stick / Sharps',
    text: 'Recapping needle injury in ICU Ward B. Sharp container was overfilled.',
    lang: 'ta',
    severity: 'high',
    status: 'open',
    createdAt: hoursAgo(6),
    dueAt: hoursAgo(6 - 24),
    events: [{ at: hoursAgo(6), status: 'open', note: 'Reported by nurse' }],
  });

  return { construction, college, hospital };
}

export const DEMO_PERSONAS = [
  {
    id: 'w_priya',
    role: 'worker',
    label: 'Priya',
    detail: 'Mason · Meridian Buildcon · Tamil',
  },
  {
    id: 'w_arjun',
    role: 'worker',
    label: 'Arjun',
    detail: 'Lab Assistant · Periyar Institute · English',
  },
  {
    id: 'w_kavitha',
    role: 'worker',
    label: 'Kavitha',
    detail: 'Staff Nurse · Kaveri Hospital · Tamil',
  },
  {
    id: 'a_ravi',
    role: 'admin',
    label: 'Ravi',
    detail: 'Site Supervisor · Meridian Buildcon',
  },
  {
    id: 'a_lakshmi',
    role: 'admin',
    label: 'Lakshmi',
    detail: 'Principal · Periyar Institute',
  },
  {
    id: 'a_anand',
    role: 'admin',
    label: 'Dr. Anand',
    detail: 'Medical Superintendent · Kaveri Hospital',
  },
];

export { DAY };
