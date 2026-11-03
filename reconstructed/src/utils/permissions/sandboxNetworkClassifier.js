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
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";

//@ chunk-e6aww6q8.js:2948397-2948477 placement
var SANDBOX_HOST_CLASSIFIER_THRESHOLDS = {
  "claude-sonnet-5": {
    t1: 25,
    t2: 10,
  },
  "claude-opus-4-8": {
    t1: 25,
    t2: 10,
  },
  ...false,
};
//@ chunk-e6aww6q8.js:2948477-2949239 placement
/**
 * 沙箱网络分类器：判断主机能否访问，不可用时拒绝。
 */
async function classifySandboxNetworkHost(host, port, r, s, toolPermissionContext, signal, S) {
  if (isMisleadingConsentHost(host)) {
    logForDebugging("Sandbox network classifier refusing a host srt would re-spell; failing closed (deny)", {
      level: "warn",
    });
    return {
      allow: false,
      unavailable: false,
      transcriptTooLong: false,
    };
  }
  let w = formatActionForClassifier(SANDBOX_NETWORK_ACCESS_TOOL_NAME, {
    host,
    port,
  });
  let L = {
    name: SANDBOX_NETWORK_ACCESS_TOOL_NAME,
    toAutoClassifierInput: (ke) => ke,
  };
  let G = await classifyYoloAction(
    messagesSinceCompactBoundary(r),
    w,
    [...s, L],
    toolPermissionContext,
    signal,
    {
      ...S,
      severityEligible: true,
      severitySite: {
        key: "sandboxNetwork",
        defaults: SANDBOX_HOST_CLASSIFIER_THRESHOLDS,
      },
    },
  );
  let unavailable = G.unavailable ?? false;
  let transcriptTooLong = G.transcriptTooLong ?? false;
  let Se = unavailable ? false : !G.shouldBlock;
  if (unavailable)
    logForDebugging(`Sandbox network classifier unavailable for ${host}; failing closed (deny)`, {
      level: "warn",
    });
  if (!Se)
    logForDebugging(`Auto mode classifier blocked sandbox network access to ${host}: ${G.reason}`, {
      level: "warn",
    });
  return {
    allow: Se,
    unavailable,
    transcriptTooLong,
    ...(unavailable &&
      G.retryAfterMs !== undefined && {
        retryAfterMs: G.retryAfterMs,
      }),
  };
}
export { classifySandboxNetworkHost };
