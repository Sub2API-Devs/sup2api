/**
 * commands/review.ts
 *
 * /ultrareview 命令对象与描述（含 CCR 条款链接）；另混入远程会话来源判断
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/review.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-7jxyna5q.js (1)
 * attribution: fingerprint 3, layout 1
 */
import { ghPrCmdRe } from "../tools/shared/gitOperationTracking.js";
import {
  getReviewDurationNote,
  getReviewCostNote,
  isUltrareviewWithBridge,
} from "./review/ultrareviewPreconditions.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:487397-487449 fingerprint (2.1.88 match: review, 0.383)
/**
 * 匹配 gh pr review 命令的正则。
 */
var GH_PR_REVIEW_RE; // deferred: uses ghPrCmdRe (../tools/shared/gitOperationTracking.js) of its import cycle while loading; runs once the cycle is complete
var QUOTED_SEGMENT_RE;
deferInit("chunk-7jxyna5q.js:487397", () => {
  GH_PR_REVIEW_RE = ghPrCmdRe("review");
  QUOTED_SEGMENT_RE = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
});
//@ chunk-5xgkngpb.js:1810314-1810379 fingerprint (2.1.88 match: CCR_TERMS_URL, 1)
/**
 * CCR_TERMS_URL：同旧版。
 */
var CCR_TERMS_URL = "https://code.claude.com/docs/en/claude-code-on-the-web";
//@ chunk-5xgkngpb.js:1810379-1810531 layout
function getUltrareviewDescription() {
  return `Start a cloud agent that finds and verifies bugs in your branch (${getReviewDurationNote()}, ${getReviewCostNote()} USD) \xB7 Runs in a cloud session. See ${CCR_TERMS_URL}`;
}
//@ chunk-5xgkngpb.js:1810531-1810816 fingerprint (2.1.88 match: ultrareview, 0.641)
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
export { ultrareviewCommand, ultrareviewNonInteractiveCommand, QUOTED_SEGMENT_RE, GH_PR_REVIEW_RE };
