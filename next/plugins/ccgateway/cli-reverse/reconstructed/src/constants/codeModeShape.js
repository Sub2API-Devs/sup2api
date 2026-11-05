/**
 * constants/codeModeShape.ts
 *
 * Code 模式相关环境变量的 shape 定义与导出包装（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pmwm3g8y.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../utils/envSchema.js";

//@ chunk-pmwm3g8y.js:486-495 placement
var baseFields = {};
//@ chunk-pmwm3g8y.js:495-649 placement
__export(baseFields, {
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE: () => sourceParser,
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTART: () => whyParser,
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTARTED_FROM: () => whyTextParser,
});
//@ chunk-pmwm3g8y.js:649-831 placement
var sourceParser = ENV_PARSERS.rawStr();
var whyParser = ENV_PARSERS.enum([
  "retried",
  "admin",
  "admin_unread",
  "credential_changed",
  "compliance",
  "otel",
  "credentials",
  "no_setup",
  "provider",
  "model",
  "no_flags",
  "gate",
  "mods",
]);
var whyTextParser = ENV_PARSERS.str();
//@ chunk-pmwm3g8y.js:831-844 placement
/**
 * Code 模式环境变量 shape 的默认导出值。
 */
var foresightState = {
  ...baseFields,
};
export { foresightState };
