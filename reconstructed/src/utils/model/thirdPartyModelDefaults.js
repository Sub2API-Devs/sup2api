/**
 * utils/model/thirdPartyModelDefaults.ts
 *
 * 2.1.316 新增：环境变量是否为探测写入的值；用户自己配置的第三方默认模型等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
 * attribution: placement 10
 */
import { isClaudeAISubscriber } from "../auth.js";
import { env } from "../env.js";
import { isFirstPartyAnthropicBaseUrl } from "./providers.js";
import { is1mContextDisabled } from "./contextWindow1m.js";
import { isExtraUsageEnabled } from "./check1mAccess.js";

//@ chunk-aepeg2w5.js:418830-418891 placement
function probesThirdPartyDefaults() {
  return isClaudeAISubscriber() && (!!env.ANTHROPIC_UNIX_SOCKET || isFirstPartyAnthropicBaseUrl());
}
//@ chunk-aepeg2w5.js:418891-418951 placement
/**
 * 是否探测第三方默认模型。
 */
function shouldProbeThirdPartyDefaults() {
  if (is1mContextDisabled()) return false;
  if (probesThirdPartyDefaults()) return isExtraUsageEnabled();
  return true;
}
//@ chunk-aepeg2w5.js:418951-419011 placement
/**
 * 是否探测第三方默认模型（另一路径）。
 */
function shouldProbeThirdPartyDefaultsAlt() {
  if (is1mContextDisabled()) return false;
  if (probesThirdPartyDefaults()) return isExtraUsageEnabled();
  return true;
}
//@ chunk-aepeg2w5.js:419011-419062 placement
/**
 * 探测写入的默认模型族名列表（Fable/Haiku/Mythos/Opus/Sonnet）。
 */
var DEFAULT_MODEL_FAMILY_NAMES = ["Fable", "Haiku", "Mythos", "Opus", "Sonnet"];
//@ chunk-aepeg2w5.js:419062-419258 placement
/**
 * 判断值是否为探测写入的默认模型值（可带数字后缀）。
 */
function isProbeWrittenValue(e) {
  return DEFAULT_MODEL_FAMILY_NAMES.some((n) => {
    if (e === n) return true;
    if (typeof e !== "string" || !e.startsWith(`${n} `)) return false;
    let sliced = e.slice(n.length + 1);
    return sliced !== "" && sliced === sliced.trim() && Number.isFinite(Number(sliced));
  });
}
//@ chunk-aepeg2w5.js:419258-419303 placement
/**
 * 取第一个词。
 */
function firstWord(e) {
  let [n] = e.split(" ");
  return n;
}
//@ chunk-aepeg2w5.js:419303-419604 placement
/**
 * 记录探测写入的默认模型环境变量。
 */
function recordProbedDefault(envVar, n) {
  if (envVar === "ANTHROPIC_DEFAULT_SONNET_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT", n);
  else if (envVar === "ANTHROPIC_DEFAULT_OPUS_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT", n);
  else if (envVar === "ANTHROPIC_DEFAULT_HAIKU_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT", n);
}
//@ chunk-aepeg2w5.js:419604-419799 placement
/**
 * 记录探测写入的第三方 Sonnet/Opus 默认值到环境变量。
 */
function recordSeededDefault(e, n) {
  if (e === "ANTHROPIC_DEFAULT_SONNET_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT", n);
  else if (e === "ANTHROPIC_DEFAULT_OPUS_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT", n);
}
//@ chunk-aepeg2w5.js:419799-420157 placement
/**
 * 环境变量是否为探测写入的值。
 */
function isProbedDefault(e) {
  switch (e) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return (
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== undefined &&
        env.ANTHROPIC_DEFAULT_SONNET_MODEL === env.CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT
      );
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return (
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== undefined &&
        env.ANTHROPIC_DEFAULT_OPUS_MODEL === env.CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT
      );
    default:
      return false;
  }
}
//@ chunk-aepeg2w5.js:420157-420461 placement
/**
 * 用户自己配置的第三方默认模型。
 */
function userConfiguredDefault(tierForEnvVar) {
  let [n, r] =
    tierForEnvVar === "sonnet"
      ? [env.ANTHROPIC_DEFAULT_SONNET_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT]
      : tierForEnvVar === "opus"
        ? [env.ANTHROPIC_DEFAULT_OPUS_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT]
        : [env.ANTHROPIC_DEFAULT_HAIKU_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT];
  return n !== undefined && n === r;
}
export {
  isProbeWrittenValue,
  firstWord,
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
  userConfiguredDefault,
  recordProbedDefault,
  recordSeededDefault,
  DEFAULT_MODEL_FAMILY_NAMES,
  isProbedDefault,
};
