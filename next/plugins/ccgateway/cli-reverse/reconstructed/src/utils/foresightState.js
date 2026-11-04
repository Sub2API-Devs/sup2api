/**
 * utils/foresightState.ts
 *
 * 2.1.316 新增：预见（foresight）状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-szmxcexk.js (1)
 * attribution: placement 1
 */
import { identity } from "./identity.js";

//@ chunk-szmxcexk.js:227-328 placement
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
