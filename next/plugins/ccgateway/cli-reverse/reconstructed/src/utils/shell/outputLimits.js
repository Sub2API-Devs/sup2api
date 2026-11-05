/**
 * utils/shell/outputLimits.ts
 *
 * Bash 输出长度上限（settings.bashOutputMaxChars / BASH_MAX_OUTPUT_LENGTH）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/outputLimits.ts
 * pieces: chunk-1jwzj2da.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getInitialSettings } from "../settings/settings.js";
import { validateBoundedIntEnvVar } from "../envValidation.js";
import { MIN_MAX_OUTPUT_LENGTH, MAX_CONTEXT_TOKENS } from "../../constants/outputLimits.js";

//@ chunk-1jwzj2da.js:1396-1421 placement
/**
 * Bash 输出长度的上界（150000 字符）。
 */
var MAX_OUTPUT_LIMIT_CHARS = 150000;
var DEFAULT_OUTPUT_LIMIT_CHARS = 30000;
//@ chunk-1jwzj2da.js:1421-1475 placement
/**
 * 取生效的 Bash 输出最大字符数：settings.bashOutputMaxChars 优先，否则 30000。
 */
function getConfiguredBashOutputMaxChars() {
  return clampOutputLimit(getInitialSettings().bashOutputMaxChars) ?? DEFAULT_OUTPUT_LIMIT_CHARS;
}
//@ chunk-1jwzj2da.js:1475-1635 fingerprint (2.1.88 match: getMaxOutputLength, 0.879)
/**
 * Bash 输出最大字符数：settings.bashOutputMaxChars（夹在上下限之间）优先，否则 BASH_MAX_OUTPUT_LENGTH（默认 30000，上限 150000）。
 */
function getMaxOutputLength() {
  let configuredLimit = clampOutputLimit(getInitialSettings().bashOutputMaxChars);
  if (configuredLimit !== undefined) return configuredLimit;
  return validateBoundedIntEnvVar(
    "BASH_MAX_OUTPUT_LENGTH",
    process.env.BASH_MAX_OUTPUT_LENGTH,
    DEFAULT_OUTPUT_LIMIT_CHARS,
    MAX_OUTPUT_LIMIT_CHARS,
  ).effective;
}
//@ chunk-1jwzj2da.js:1635-1707 affinity
/**
 * 把设置值夹到 [下限, 上限]；undefined 原样返回。
 */
function clampOutputLimit(bashOutputMaxChars) {
  if (bashOutputMaxChars === undefined) return;
  return Math.min(Math.max(bashOutputMaxChars, MIN_MAX_OUTPUT_LENGTH), MAX_CONTEXT_TOKENS);
}
export {
  getConfiguredBashOutputMaxChars,
  getMaxOutputLength,
  DEFAULT_OUTPUT_LIMIT_CHARS,
  MAX_OUTPUT_LIMIT_CHARS,
};
