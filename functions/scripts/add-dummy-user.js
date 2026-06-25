/**
 * One-off helper: add a pending/dummy crew user — both the Firebase Auth user
 * (so it has a real uid that can later be granted custom-claim caps) and the
 * Firestore `users` doc — so the "add crew by phone" flow has someone to find.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     node scripts/add-dummy-user.js <phone E.164> [name]
 *
 * The new user has NO capabilities (pending) until an admin provisions them.
 */
const admin = require('firebase-admin');

admin.initializeApp();

const NO_CAPS = {
  manageCrew: false,
  createCalls: false,
  viewAllCalls: false,
  viewFinancials: false,
  viewTeamPayouts: false,
  manageInventory: false,
};

const [phone, name = 'משתמש דמה'] = process.argv.slice(2);
if (!phone || !phone.startsWith('+')) {
  console.error('Usage: node scripts/add-dummy-user.js <phone E.164, e.g. +972501234567> [name]');
  process.exit(1);
}

(async () => {
  // Reuse the auth user if this phone already exists, else create it.
  let user;
  try {
    user = await admin.auth().getUserByPhoneNumber(phone);
    console.log(`• auth user already exists: ${user.uid}`);
  } catch {
    user = await admin.auth().createUser({ phoneNumber: phone });
    console.log(`• created auth user: ${user.uid}`);
  }

  await admin
    .firestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        name,
        caps: NO_CAPS, // pending — admin provisions capabilities later
        teamId: '',
        managerId: null,
        phone,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

  console.log(`✓ dummy user "${name}" (${phone}) -> users/${user.uid}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
