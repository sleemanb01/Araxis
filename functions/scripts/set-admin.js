/**
 * One-off bootstrap: grant the FIRST full-capability admin for a project.
 * Custom claims can't be set from the console, so run this once after the admin
 * has signed in (so their auth uid exists).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/set-admin.js <uid> [teamId]
 *
 * The admin signs out/in (or the app calls getIdTokenResult(user, true)) to pick
 * up the new claim.
 */
const admin = require('firebase-admin');

admin.initializeApp();

const ALL_CAPS = {
  manageCrew: true,
  createCalls: true,
  viewAllCalls: true,
  viewFinancials: true,
  viewTeamPayouts: true,
  manageInventory: true,
};

const [uid, teamId = 'team_main'] = process.argv.slice(2);
if (!uid) {
  console.error('Usage: node scripts/set-admin.js <uid> [teamId]');
  process.exit(1);
}

(async () => {
  await admin.auth().setCustomUserClaims(uid, { caps: ALL_CAPS, teamId });
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set({ uid, caps: ALL_CAPS, teamId, createdAt: new Date().toISOString() }, { merge: true });
  console.log(`✓ ${uid} now has all capabilities (team ${teamId}). Sign out/in to refresh the token.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
