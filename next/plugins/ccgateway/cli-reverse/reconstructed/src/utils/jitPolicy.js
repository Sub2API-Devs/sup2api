/**
 * utils/jitPolicy.ts
 *
 * 2.1.316 新增。启动后设置 JIT 策略。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c5hnttn1.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "./identity.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-c5hnttn1.js:262-309 placement
var scaleRef; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c5hnttn1.js:262", () => {
  scaleRef = identity(
    {
      scale: undefined,
    },
    (state) => {
      state.scale = undefined;
    },
  );
});
//@ chunk-c5hnttn1.js:309-481 placement
/**
 * 启动后设置 JIT 策略。
 */
function setJitPolicyAfterStartup() {
  let CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP = env.CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP ?? 1;
  if (typeof Bun !== "undefined" && typeof Bun.unsafe.setJITPolicy === "function") {
    Bun.unsafe.setJITPolicy(CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP);
    scaleRef.scale = CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP;
  }
  return CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP;
}
//@ chunk-c5hnttn1.js:481-511 placement
/**
 * JIT 策略的 scale 读取。
 */
function jitPolicyHandedToRuntime() {
  return scaleRef.scale;
}
export { setJitPolicyAfterStartup, jitPolicyHandedToRuntime };
