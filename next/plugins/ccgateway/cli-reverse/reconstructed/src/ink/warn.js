/**
 * ink/warn.ts
 *
 * 开发期样式值警告（非整数等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/warn.ts
 * pieces: chunk-xd1cb3xs.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../utils/debug.js";

//@ chunk-xd1cb3xs.js:6596-6720 fingerprint (2.1.88 match: ifNotInteger, 1)
/**
 * 值不是整数时记一条警告（Box 的 margin/padding/gap 等）。
 */
function ifNotInteger(value, name) {
  if (value === undefined) return;
  if (Number.isInteger(value)) return;
  logForDebugging(`${name} should be an integer, got ${value}`, {
    level: "warn",
  });
}
export { ifNotInteger };
