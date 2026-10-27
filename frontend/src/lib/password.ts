// A random password that satisfies the backend rules, for managers who set an initial or
// reset password (UC-03 – UC-05). Look-alike characters (0/O, 1/l/I) are left out, since
// the password is read out to its owner.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

function pick(alphabet: string, random: number): string {
  return alphabet[random % alphabet.length];
}

export function generatePassword(length = 10): string {
  const random = new Uint32Array(length + length);
  crypto.getRandomValues(random);
  const chars = [pick(UPPER, random[0]), pick(LOWER, random[1]), pick(DIGITS, random[2])];
  for (let index = 3; index < length; index += 1) chars.push(pick(ALL, random[index]));
  // Shuffle so the required characters are not always first.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = random[length + index] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}
