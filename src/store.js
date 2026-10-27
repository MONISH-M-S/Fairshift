/**
 * In-memory data store.
 *
 * Cloud Run gives each container an ephemeral filesystem, so a bundled SQLite
 * file would silently reset (or diverge between instances). For a prototype the
 * honest choice is a single deterministic in-memory dataset, deployed with
 * `--max-instances=1`. The swap to Firestore is confined to this module.
 */
export const db = {
  orgs: new Map(),
  workers: new Map(),
  shifts: new Map(),
  cases: new Map(),
  feedback: new Map(),
  skills: new Map(),
};

let counter = 0;

export function uid(prefix) {
  counter += 1;
  return `${prefix}_${counter.toString(36).padStart(4, '0')}`;
}

export function resetStore() {
  for (const table of Object.values(db)) table.clear();
  counter = 0;
}

export const insert = (table, record) => {
  db[table].set(record.id, record);
  return record;
};

export const all = (table) => [...db[table].values()];
export const byId = (table, id) => db[table].get(id) || null;

export const workersOf = (orgId) =>
  all('workers').filter((worker) => worker.orgId === orgId);

export const shiftsOf = (workerId) =>
  all('shifts')
    .filter((shift) => shift.workerId === workerId)
    .sort((a, b) => a.start.localeCompare(b.start));

export const shiftsInOrg = (orgId, fromIso) =>
  all('shifts').filter(
    (shift) => shift.orgId === orgId && (!fromIso || shift.start >= fromIso)
  );

export const casesOf = (orgId) =>
  all('cases')
    .filter((item) => item.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const casesOfWorker = (workerId) =>
  all('cases')
    .filter((item) => item.workerId === workerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const feedbackOf = (orgId) =>
  all('feedback')
    .filter((item) => item.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const skillsOf = (workerId) =>
  all('skills')
    .filter((item) => item.workerId === workerId)
    .sort((a, b) => String(b.year).localeCompare(String(a.year)));
