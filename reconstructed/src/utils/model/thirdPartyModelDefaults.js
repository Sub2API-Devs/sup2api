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
function qk() {
  return isClaudeAISubscriber() && (!!env.ANTHROPIC_UNIX_SOCKET || isFirstPartyAnthropicBaseUrl());
}
/**
 * 是否探测第三方默认模型。
 */
//@ chunk-aepeg2w5.js:418891-418951 placement
function shouldProbeThirdPartyDefaults() {
  if (is1mContextDisabled()) return !1;
  if (qk()) return isExtraUsageEnabled();
  return !0;
}
/**
 * 是否探测第三方默认模型（另一路径）。
 */
//@ chunk-aepeg2w5.js:418951-419011 placement
function shouldProbeThirdPartyDefaultsAlt() {
  if (is1mContextDisabled()) return !1;
  if (qk()) return isExtraUsageEnabled();
  return !0;
}
//@ chunk-aepeg2w5.js:419011-419062 placement
var dmr = ["Fable", "Haiku", "Mythos", "Opus", "Sonnet"];
/**
 * 判断值是否为探测写入的默认模型值（可带数字后缀）。
 */
//@ chunk-aepeg2w5.js:419062-419258 placement
function isProbeWrittenValue(e) {
  return dmr.some((n) => {
    if (e === n) return !0;
    if (typeof e !== "string" || !e.startsWith(`${n} `)) return !1;
    let sliced = e.slice(n.length + 1);
    return sliced !== "" && sliced === sliced.trim() && Number.isFinite(Number(sliced));
  });
}
/**
 * 取第一个词。
 */
//@ chunk-aepeg2w5.js:419258-419303 placement
function firstWord(e) {
  let [n] = e.split(" ");
  return n;
}
/**
 * 记录探测写入的默认模型环境变量。
 */
//@ chunk-aepeg2w5.js:419303-419604 placement
function recordProbedDefault(e, n) {
  if (e === "ANTHROPIC_DEFAULT_SONNET_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT", n);
  else if (e === "ANTHROPIC_DEFAULT_OPUS_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT", n);
  else if (e === "ANTHROPIC_DEFAULT_HAIKU_MODEL") env.set("CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT", n);
}
/**
 * 记录探测写入的第三方 Sonnet/Opus 默认值到环境变量。
 */
//@ chunk-aepeg2w5.js:419604-419799 placement
function recordSeededDefault(e, n) {
  if (e === "ANTHROPIC_DEFAULT_SONNET_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT", n);
  else if (e === "ANTHROPIC_DEFAULT_OPUS_MODEL") env.set("CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT", n);
}
/**
 * 环境变量是否为探测写入的值。
 */
//@ chunk-aepeg2w5.js:419799-420157 placement
function isProbedDefault(e) {
  switch (e) {
    case "ANTHROPIC_DEFAULT_SONNET_MODEL":
      return (
        env.ANTHROPIC_DEFAULT_SONNET_MODEL !== void 0 &&
        env.ANTHROPIC_DEFAULT_SONNET_MODEL === env.CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT
      );
    case "ANTHROPIC_DEFAULT_OPUS_MODEL":
      return (
        env.ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 &&
        env.ANTHROPIC_DEFAULT_OPUS_MODEL === env.CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT
      );
    default:
      return !1;
  }
}
/**
 * 用户自己配置的第三方默认模型。
 */
//@ chunk-aepeg2w5.js:420157-420461 placement
function userConfiguredDefault(e) {
  let [n, r] =
    e === "sonnet"
      ? [env.ANTHROPIC_DEFAULT_SONNET_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT]
      : e === "opus"
        ? [env.ANTHROPIC_DEFAULT_OPUS_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT]
        : [env.ANTHROPIC_DEFAULT_HAIKU_MODEL, env.CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT];
  return n !== void 0 && n === r;
}

export {
  isProbeWrittenValue,
  firstWord,
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
  userConfiguredDefault,
  recordProbedDefault,
  recordSeededDefault,
  dmr,
  isProbedDefault,
};
