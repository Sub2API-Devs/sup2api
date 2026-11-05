/**
 * utils/foresightState.ts
 *
 * 2.1.316 新增：预见（foresight）状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-npgp1xzs.js (1)
 * attribution: placement 1
 */
import { identity } from "./identity.js";

//@ chunk-npgp1xzs.js:572-673 placement
var foresightState = identity(
  {
    settled: undefined,
    open: false,
    foresee: undefined,
  },
  (state) => {
    state.settled = undefined;
    state.open = false;
    state.foresee = undefined;
  },
);
export { foresightState };
