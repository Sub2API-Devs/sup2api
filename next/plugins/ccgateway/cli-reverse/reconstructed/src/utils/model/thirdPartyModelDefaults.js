/**
 * utils/model/thirdPartyModelDefaults.ts
 *
 * 2.1.316 新增：环境变量是否为探测写入的值；用户自己配置的第三方默认模型等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (10)
 * attribution: placement 10
 */
import { isClaudeAISubscriber } from "../auth.js";
import { env } from "../env.js";
import { isFirstPartyAnthropicBaseUrl } from "./providers.js";
import { is1mContextDisabled } from "./contextWindow1m.js";
import { isExtraUsageEnabled } from "./check1mAccess.js";

//@ chunk-exfmq47h.js:430221-430282 placement
function probesThirdPartyDefaults() {
  return isClaudeAISubscriber() && (!!env.ANTHROPIC_UNIX_SOCKET || isFirstPartyAnthropicBaseUrl());
}
//@ chunk-exfmq47h.js:430282-430342 placement
/**
 * 是否探测第三方默认模型。
 */
function shouldProbeThirdPartyDefaults() {
  if (is1mContextDisabled()) return false;
  if (probesThirdPartyDefaults()) return isExtraUsageEnabled();
  return true;
}
//@ chunk-exfmq47h.js:430342-430402 placement
/**
 * 是否探测第三方默认模型（另一路径）。
 */
function shouldProbeThirdPartyDefaultsAlt() {
  if (is1mContextDisabled()) return false;
  if (probesThirdPartyDefaults()) return isExtraUsageEnabled();
  return true;
}
//@ chunk-exfmq47h.js:430402-430453 placement
/**
 * 探测写入的默认模型族名列表（Fable/Haiku/Mythos/Opus/Sonnet）。
 */
var DEFAULT_MODEL_FAMILY_NAMES = ["Fable", "Haiku", "Mythos", "Opus", "Sonnet"];
//@ chunk-exfmq47h.js:430453-430649 placement
/**
 * 判断值是否为探测写入的默认模型值（可带数字后缀）。
 */
function isProbeWrittenValue(value) {
  return DEFAULT_MODEL_FAMILY_NAMES.some((family) => {
    if (value === family) return true;
    if (typeof value !== "string" || !value.startsWith(`${family} `)) return false;
    let sliced = value.slice(family.length + 1);
    return sliced !== "" && sliced === sliced.trim() && Number.isFinite(Number(sliced));
  });
}
//@ chunk-exfmq47h.js:430649-430694 placement
/**
 * 取第一个词。
 */
function firstWord(value) {
  let [word] = value.split(" ");
  return word;
}
//@ chunk-exfmq47h.js:430694-430995 placement
/**
 * 记录探测写入的默认模型环境变量。
 */
function recordProbedDefault(envVar, value) {
  if (envVar === "ANTHROPIC_DEFAULT_SONNET_MODEL")
    env.set("CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT", value);
  else if (envVar === "ANTHROPIC_DEFAULT_OPUS_MODEL")
    env.set("CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT", value);
  else if (envVar === "ANTHROPIC_DEFAULT_HAIKU_MODEL")
    env.set("CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT", value);
}
//@ chunk-exfmq47h.js:430995-431190 placement
/**
 * 记录探测写入的第三方 Sonnet/Opus 默认值到环境变量。
 */
function recordSeededDefault(envVar, value) {
  if (envVar === "ANTHROPIC_DEFAULT_SONNET_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT", value);
  else if (envVar === "ANTHROPIC_DEFAULT_OPUS_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT", value);
}
//@ chunk-exfmq47h.js:431190-431548 placement
/**
 * 环境变量是否为探测写入的值。
 */
function isProbedDefault(envVar) {
  switch (envVar) {
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
//@ chunk-exfmq47h.js:431548-431852 placement
/**
 * 用户自己配置的第三方默认模型。
 */
function userConfiguredDefault(tierForEnvVar) {
  let [currentValue, probeWrittenValue] =
    tierForEnvVar === "sonnet"
      ? [env.ANTHROPIC_DEFAULT_SONNET_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT]
      : tierForEnvVar === "opus"
        ? [env.ANTHROPIC_DEFAULT_OPUS_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT]
        : [env.ANTHROPIC_DEFAULT_HAIKU_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT];
  return currentValue !== undefined && currentValue === probeWrittenValue;
}
export {
  isProbeWrittenValue,
  firstWord,
  isProbedDefault,
  userConfiguredDefault,
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
  recordProbedDefault,
  DEFAULT_MODEL_FAMILY_NAMES,
  recordSeededDefault,
};
