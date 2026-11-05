/**
 * bridge/tetherShape.ts
 *
 * CLAUDE_CODE_TETHER_LIVE 相关的 tether 形状常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dpa5pbwk.js (4)
 * attribution: placement 4
 */
import { __export } from "../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../utils/envSchema.js";

//@ chunk-dpa5pbwk.js:486-495 placement
var TETHER_SHAPE_EXPORTS = {};
//@ chunk-dpa5pbwk.js:495-533 placement
__export(TETHER_SHAPE_EXPORTS, {
  CLAUDE_CODE_TETHER_LIVE: () => tetherLiveFlag,
});
//@ chunk-dpa5pbwk.js:533-551 placement
var tetherLiveFlag = ENV_PARSERS.triBool();
//@ chunk-dpa5pbwk.js:551-564 placement
var tetherShapeCopy = {
  ...TETHER_SHAPE_EXPORTS,
};
export { tetherShapeCopy };
