/**
 * One-off migration: old per-user `crew` array  ->  first-class `crews` docs.
 *
 * For every user that still has a `crew` array (their roster), create a crew
 * with that user as manager (keeping their current caps) and each listed uid as
 * a member with NO caps (the manager then grants caps in-app). Removes the old
 * `crew` field and recomputes every affected user's union-caps custom claim.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json FIRESTORE_PREFER_REST=true \
 *     node scripts/migrate-to-crews.js
 */
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const CAP_KEYS = [
  'manageCrew',
  'createCalls',
  'viewAllCalls',
  'viewFinancials',
  'viewTeamPayouts',
  'manageInventory',
];
const NO_CAPS = Object.fromEntries(CAP_KEYS.map((k) => [k, false]));
const normalizeCaps = (raw) => Object.fromEntries(CAP_KEYS.map((k) => [k, raw?.[k] === true]));
const unionCaps = (a, b) => Object.fromEntries(CAP_KEYS.map((k) => [k, a[k] === true || b[k] === true]));

async function recomputeUserClaim(uid) {
  const snap = await db.collection('crews').where('memberIds', 'array-contains', uid).get();
  let caps = { ...NO_CAPS };
  const crewIds = [];
  for (const c of snap.docs) {
    crewIds.push(c.id);
    const m = (c.data().members || {})[uid];
    if (m) caps = unionCaps(caps, normalizeCaps(m));
  }
  await admin.auth().setCustomUserClaims(uid, { caps, crewIds });
  await db.collection('users').doc(uid).set({ caps, crewIds }, { merge: true });
  console.log('  claim recomputed:', uid, '-> crews', JSON.stringify(crewIds));
}

(async () => {
  const usersSnap = await db.collection('users').get();
  const affected = new Set();

  for (const d of usersSnap.docs) {
    const u = d.data();
    if (!Array.isArray(u.crew) || u.crew.length === 0) continue;

    const members = { [d.id]: normalizeCaps(u.caps) };
    for (const memberUid of u.crew) if (memberUid !== d.id) members[memberUid] = { ...NO_CAPS };
    const memberIds = Object.keys(members);

    const crewRef = db.collection('crews').doc();
    await crewRef.set({
      name: 'הצוות שלי',
      manager: d.id,
      members,
      memberIds,
      createdAt: new Date().toISOString(),
    });
    await db.collection('users').doc(d.id).update({ crew: FieldValue.delete() });
    memberIds.forEach((id) => affected.add(id));
    console.log('crew created', crewRef.id, '| manager', d.id, '| members', JSON.stringify(memberIds));
  }

  for (const uid of affected) await recomputeUserClaim(uid);
  console.log('Done. crews from rosters; affected users:', affected.size);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
