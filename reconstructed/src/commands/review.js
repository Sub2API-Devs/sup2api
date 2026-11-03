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
import { getReviewDurationNote, getReviewCostNote, UF } from "./review/ultrareviewPreconditions.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";

/**
 * CCR_TERMS_URL：同旧版。
 */
//@ chunk-e6aww6q8.js:1734862-1734927 fingerprint = CCR_TERMS_URL (1)
var CCR_TERMS_URL = "https://code.claude.com/docs/en/claude-code-on-the-web";
//@ chunk-e6aww6q8.js:1734927-1735080 layout
function getUltrareviewDescription() {
  return `Start a cloud agent that finds and verifies bugs in your branch (${getReviewDurationNote()}, ${getReviewCostNote()} USD) \xB7 Runs in a cloud session. See ${CCR_TERMS_URL}`;
}
/**
 * /ultrareview 命令对象（local-jsx）；描述：{return Aen()}；isEnabled: ()=>UF()；实现 chunk-0eepcc6r.js 的 Mo。
 */
//@ chunk-e6aww6q8.js:1735080-1735365 fingerprint = ultrareview (0.641)
var ultrareviewCommand = {
    type: "local-jsx",
    name: "ultrareview",
    get description() {
      return getUltrareviewDescription();
    },
    isEnabled: () => UF(),
  },
  ultrareviewNonInteractiveCommand = {
    type: "local",
    name: "ultrareview",
    get description() {
      return getUltrareviewDescription();
    },
    supportsNonInteractive: !0,
    isEnabled: () => getIsNonInteractiveSession() && UF(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-yxg7c7n7.js"),
  };

export { ultrareviewCommand, ultrareviewNonInteractiveCommand };
