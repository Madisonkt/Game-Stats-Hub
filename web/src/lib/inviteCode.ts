/**
 * Generate a 6-character uppercase invite code.
 * Character set excludes ambiguous characters: O, 0, I, 1, L
 */
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
