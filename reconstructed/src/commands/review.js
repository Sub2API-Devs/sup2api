/**
 * commands/review.ts
 *
 * /ultrareview 命令对象与描述（含 CCR 条款链接）；另混入远程会话来源判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: fingerprint 2, layout 1
 */
import {
  getReviewDurationNote,
  getReviewCostNote,
  isUltrareviewWithBridge,
} from "./review/ultrareviewPreconditions.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1734862-1734927 fingerprint = CCR_TERMS_URL (1)
/**
 * CCR_TERMS_URL：同旧版。
 */
var CCR_TERMS_URL = "https://code.claude.com/docs/en/claude-code-on-the-web";
//@ chunk-e6aww6q8.js:1734927-1735080 layout
function getUltrareviewDescription() {
  return `Start a cloud agent that finds and verifies bugs in your branch (${getReviewDurationNote()}, ${getReviewCostNote()} USD) \xB7 Runs in a cloud session. See ${CCR_TERMS_URL}`;
}
//@ chunk-e6aww6q8.js:1735080-1735365 fingerprint = ultrareview (0.641)
/**
 * /ultrareview 命令对象（local-jsx）；描述：{return Aen()}；isEnabled: ()=>UF()；实现 chunk-0eepcc6r.js 的 Mo。
 */
var ultrareviewCommand = {
  type: "local-jsx",
  name: "ultrareview",
  get description() {
    return getUltrareviewDescription();
  },
  isEnabled: () => isUltrareviewWithBridge(),
};
var ultrareviewNonInteractiveCommand = {
  type: "local",
  name: "ultrareview",
  get description() {
    return getUltrareviewDescription();
  },
  supportsNonInteractive: true,
  isEnabled: () => getIsNonInteractiveSession() && isUltrareviewWithBridge(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./review/call.lazy.js"),
};
export { ultrareviewCommand, ultrareviewNonInteractiveCommand };
