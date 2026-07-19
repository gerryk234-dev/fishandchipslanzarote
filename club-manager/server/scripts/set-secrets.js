/* Change the club access code and/or admin PIN.
   Usage:
     npm run set-secrets -- --club-code NUEVOCODIGO
     npm run set-secrets -- --admin-pin 9876
     npm run set-secrets -- --club-code NUEVOCODIGO --admin-pin 9876
*/
import { setSetting } from "../src/db.js";
import { hashSecret } from "../src/auth.js";

const args = process.argv.slice(2);
const valOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const clubCode = valOf("--club-code");
const adminPin = valOf("--admin-pin");

if (!clubCode && !adminPin) {
  console.log("Nothing to do. Pass --club-code <code> and/or --admin-pin <pin>.");
  process.exit(1);
}
if (clubCode) {
  setSetting("club_code_hash", hashSecret(clubCode));
  console.log("Club access code updated.");
}
if (adminPin) {
  setSetting("admin_pin_hash", hashSecret(adminPin));
  console.log("Admin PIN updated.");
}
console.log("Existing device sessions stay valid; new logins will need the new secrets.");
