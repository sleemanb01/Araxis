/**
 * One-off bootstrap: grant the FIRST admin for a business's Firebase project.
 * Custom claims can't be set from the console, so run this once after the admin
 * has signed in at least once (so their auth uid exists).
 *
 *   # download a service-account key for the project (Project settings →
 *   # Service accounts → Generate new private key) and save it as
 *   # functions/service-account.json (gitignored), then:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/set-admin.js <uid> [teamId]
 *
 * The admin must sign out and back in (or the app calls getIdToken(true)) to
 * pick up the new claim.
 */
const admin = require('firebase-admin');

admin.initializeApp();

const [uid, teamId = 'team_main'] = process.argv.slice(2);
if (!uid) {
  console.error('Usage: node scripts/set-admin.js <uid> [teamId]');
  process.exit(1);
}

(async () => {
  await admin.auth().setCustomUserClaims(uid, { role: 'admin', teamId });
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set(
      {
        uid,
        role: 'admin',
        teamId,
        name: 'Admin',
        managerId: null,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  console.log(`✓ ${uid} is now admin (team ${teamId}). Sign out/in to refresh the token.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
