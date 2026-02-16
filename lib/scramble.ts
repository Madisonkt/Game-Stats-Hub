// 3x3 Rubik's Cube scramble generator
// Moves: R L U D F B with modifiers: ' (prime), 2 (double)
// Constraints: no same-face consecutive; avoid same-axis consecutive when possible

const FACES = ["R", "L", "U", "D", "F", "B"] as const;
const MODIFIERS = ["", "'", "2"] as const;

// Same-axis pairs (opposite faces)
const AXIS_MAP: Record<string, number> = {
  R: 0,
  L: 0,
  U: 1,
  D: 1,
  F: 2,
  B: 2,
};

/**
 * Generate a random 3x3 Rubik's Cube scramble.
 * @param length Number of moves (default 20)
 * @returns Scramble string, e.g. "R U2 F' D B2 L ..."
 */
export function generateScramble(length: number = 12): string {
  const moves: string[] = [];
  let prevFace: string | null = null;
  let prevAxis: number | null = null;

  for (let i = 0; i < length; i++) {
    let face: string;
    let attempts = 0;

    do {
      face = FACES[Math.floor(Math.random() * FACES.length)];
      attempts++;
      // Must not be same face as previous
      // Try to avoid same axis as previous (but allow after 10 attempts to prevent infinite loop)
    } while (
      face === prevFace ||
      (attempts < 10 && prevAxis !== null && AXIS_MAP[face] === prevAxis)
    );

    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    moves.push(`${face}${modifier}`);

    prevFace = face;
    prevAxis = AXIS_MAP[face];
  }

  return moves.join(" ");
}
