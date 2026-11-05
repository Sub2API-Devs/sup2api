/**
 * utils/permissions/sandboxNetworkClassifier.ts
 *
 * 2.1.316 新增：沙箱网络分类器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isMisleadingConsentHost } from "../sandbox/sandbox-adapter.js";
import { logForDebugging } from "../debug.js";
import { formatActionForClassifier, classifyYoloAction } from "./yoloClassifier.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../../cli/structuredIO.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";

//@ chunk-5xgkngpb.js:3018000-3018080 placement
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
//@ chunk-5xgkngpb.js:3018080-3018846 placement
/**
 * 沙箱网络分类器：判断主机能否访问，不可用时拒绝。
 */
async function classifySandboxNetworkHost(host, port, messages, tools, getClassifierRole, signal, options) {
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
  let action = formatActionForClassifier(SANDBOX_NETWORK_ACCESS_TOOL_NAME, {
    host,
    port,
  });
  let pseudoTool = {
    name: SANDBOX_NETWORK_ACCESS_TOOL_NAME,
    toAutoClassifierInput: (input) => input,
  };
  let verdict = await classifyYoloAction(
    messagesSinceCompactBoundary(messages),
    action,
    [...tools, pseudoTool],
    getClassifierRole,
    signal,
    {
      ...options,
      severityEligible: true,
      severitySite: {
        key: "sandboxNetwork",
        defaults: SANDBOX_HOST_CLASSIFIER_THRESHOLDS,
      },
    },
  );
  let unavailable = verdict.unavailable ?? false;
  let transcriptTooLong = verdict.transcriptTooLong ?? false;
  let allow = unavailable ? false : !verdict.shouldBlock;
  if (unavailable)
    logForDebugging(`Sandbox network classifier unavailable for ${host}; failing closed (deny)`, {
      level: "warn",
    });
  if (!allow)
    logForDebugging(`Auto mode classifier blocked sandbox network access to ${host}: ${verdict.reason}`, {
      level: "warn",
    });
  return {
    allow,
    unavailable,
    transcriptTooLong,
    ...(unavailable &&
      verdict.retryAfterMs !== undefined && {
        retryAfterMs: verdict.retryAfterMs,
      }),
  };
}
export { classifySandboxNetworkHost };
