/**
 * 3x3 Rubik's Cube state simulator.
 * Applies a scramble string and returns the resulting face colors.
 *
 * Face indices (each face is a 3x3 = 9 stickers, indexed 0-8):
 *   0 1 2
 *   3 4 5    (center = index 4)
 *   6 7 8
 *
 * Face order: U=0, R=1, F=2, D=3, L=4, B=5
 * Colors:     W    R    G    Y    O    B
 */

// Face IDs
const U = 0,
  R = 1,
  F = 2,
  D = 3,
  L = 4,
  B = 5;

export type CubeState = string[][];

const COLORS = ["W", "R", "G", "Y", "O", "B"]; // U R F D L B

function solvedCube(): CubeState {
  return COLORS.map((c) => Array(9).fill(c));
}

/** Rotate a face's 9 stickers 90° clockwise */
function rotateFaceCW(face: string[]): string[] {
  // 0 1 2      6 3 0
  // 3 4 5  ->  7 4 1
  // 6 7 8      8 5 2
  return [face[6], face[3], face[0], face[7], face[4], face[1], face[8], face[5], face[2]];
}

/** Rotate a face's 9 stickers 90° counter-clockwise */
function rotateFaceCCW(face: string[]): string[] {
  return [face[2], face[5], face[8], face[1], face[4], face[7], face[0], face[3], face[6]];
}

/** Cycle 4 arrays of 3 stickers: a -> b -> c -> d -> a (clockwise) */
function cycle4(
  state: CubeState,
  a: [number, number][],
  b: [number, number][],
  c: [number, number][],
  d: [number, number][]
) {
  const tmp = a.map(([f, i]) => state[f][i]);
  for (let k = 0; k < 3; k++) state[a[k][0]][a[k][1]] = state[d[k][0]][d[k][1]];
  for (let k = 0; k < 3; k++) state[d[k][0]][d[k][1]] = state[c[k][0]][c[k][1]];
  for (let k = 0; k < 3; k++) state[c[k][0]][c[k][1]] = state[b[k][0]][b[k][1]];
  for (let k = 0; k < 3; k++) state[b[k][0]][b[k][1]] = tmp[k];
}

function applyMoveCW(state: CubeState, move: string): void {
  switch (move) {
    case "U":
      state[U] = rotateFaceCW(state[U]);
      cycle4(
        state,
        [[F, 0], [F, 1], [F, 2]],
        [[L, 0], [L, 1], [L, 2]],
        [[B, 0], [B, 1], [B, 2]],
        [[R, 0], [R, 1], [R, 2]]
      );
      break;
    case "D":
      state[D] = rotateFaceCW(state[D]);
      cycle4(
        state,
        [[F, 6], [F, 7], [F, 8]],
        [[R, 6], [R, 7], [R, 8]],
        [[B, 6], [B, 7], [B, 8]],
        [[L, 6], [L, 7], [L, 8]]
      );
      break;
    case "R":
      state[R] = rotateFaceCW(state[R]);
      cycle4(
        state,
        [[F, 2], [F, 5], [F, 8]],
        [[U, 2], [U, 5], [U, 8]],
        [[B, 6], [B, 3], [B, 0]],
        [[D, 2], [D, 5], [D, 8]]
      );
      break;
    case "L":
      state[L] = rotateFaceCW(state[L]);
      cycle4(
        state,
        [[F, 0], [F, 3], [F, 6]],
        [[D, 0], [D, 3], [D, 6]],
        [[B, 8], [B, 5], [B, 2]],
        [[U, 0], [U, 3], [U, 6]]
      );
      break;
    case "F":
      state[F] = rotateFaceCW(state[F]);
      cycle4(
        state,
        [[U, 6], [U, 7], [U, 8]],
        [[R, 0], [R, 3], [R, 6]],
        [[D, 2], [D, 1], [D, 0]],
        [[L, 8], [L, 5], [L, 2]]
      );
      break;
    case "B":
      state[B] = rotateFaceCW(state[B]);
      cycle4(
        state,
        [[U, 2], [U, 1], [U, 0]],
        [[L, 0], [L, 3], [L, 6]],
        [[D, 6], [D, 7], [D, 8]],
        [[R, 8], [R, 5], [R, 2]]
      );
      break;
  }
}

function applyMove(state: CubeState, token: string): void {
  const face = token[0];
  const modifier = token.slice(1); // "", "'", or "2"

  if (modifier === "2") {
    applyMoveCW(state, face);
    applyMoveCW(state, face);
  } else if (modifier === "'") {
    // CCW = 3× CW
    applyMoveCW(state, face);
    applyMoveCW(state, face);
    applyMoveCW(state, face);
  } else {
    applyMoveCW(state, face);
  }
}

/**
 * Apply a scramble string (e.g. "R U2 F' D B2 L") to a solved cube
 * and return the resulting state.
 *
 * Returns 6 faces, each an array of 9 color chars.
 * Face order: [U, R, F, D, L, B]
 */
export function applyScramble(scramble: string): CubeState {
  const state = solvedCube();
  const tokens = scramble.trim().split(/\s+/);
  for (const token of tokens) {
    if (token) applyMove(state, token);
  }
  return state;
}

/** Map single-char color to hex */
export const COLOR_MAP: Record<string, string> = {
  W: "#FFFFFF",
  R: "#E53935",
  G: "#43A047",
  Y: "#FDD835",
  O: "#FB8C00",
  B: "#1E88E5",
};
