/**
 * utils/permissions/sandboxNetworkClassifier.ts
 *
 * 2.1.316 新增：沙箱网络分类器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { isMisleadingConsentHost } from "../sandbox/sandbox-adapter.js";
import { logForDebugging } from "../debug.js";
import { formatActionForClassifier, classifyYoloAction } from "./yoloClassifier.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../../cli/structuredIO.js";
import { Us } from "../../services/projects/threadRows.js";

//@ chunk-e6aww6q8.js:2948397-2948477 placement
var Kwr = { "claude-sonnet-5": { t1: 25, t2: 10 }, "claude-opus-4-8": { t1: 25, t2: 10 }, ...!1 };
/**
 * 沙箱网络分类器：判断主机能否访问，不可用时拒绝。
 */
//@ chunk-e6aww6q8.js:2948477-2949239 placement
async function classifySandboxNetworkHost(e, n, r, s, h, y, S) {
  if (isMisleadingConsentHost(e))
    return (
      logForDebugging(
        "Sandbox network classifier refusing a host srt would re-spell; failing closed (deny)",
        { level: "warn" },
      ),
      { allow: !1, unavailable: !1, transcriptTooLong: !1 }
    );
  let w = formatActionForClassifier(SANDBOX_NETWORK_ACCESS_TOOL_NAME, { host: e, port: n }),
    L = { name: SANDBOX_NETWORK_ACCESS_TOOL_NAME, toAutoClassifierInput: (ke) => ke },
    G = await classifyYoloAction(Us(r), w, [...s, L], h, y, {
      ...S,
      severityEligible: !0,
      severitySite: { key: "sandboxNetwork", defaults: Kwr },
    }),
    q = G.unavailable ?? !1,
    Z = G.transcriptTooLong ?? !1,
    Se = q ? !1 : !G.shouldBlock;
  if (q)
    logForDebugging(`Sandbox network classifier unavailable for ${e}; failing closed (deny)`, {
      level: "warn",
    });
  if (!Se)
    logForDebugging(`Auto mode classifier blocked sandbox network access to ${e}: ${G.reason}`, {
      level: "warn",
    });
  return {
    allow: Se,
    unavailable: q,
    transcriptTooLong: Z,
    ...(q && G.retryAfterMs !== void 0 && { retryAfterMs: G.retryAfterMs }),
  };
}

export { classifySandboxNetworkHost };
