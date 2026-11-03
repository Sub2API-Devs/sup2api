/**
 * utils/advisor.ts
 *
 * Advisor（服务器端顾问工具 advisor_20260301）：/advisor 命令、开关条件（第一方类提供商、实验开关）、按 catalog 的 advisor_rank 判定谁能当顾问、被 API 拒绝后按进程或按 base URL 熔断，以及 usage.iterations 里的顾问用量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/advisor.ts
 * pieces: chunk-9b6702jm.js (5), chunk-s61vbvea.js (42)
 * attribution: placement 14, layout 29, fingerprint 3, file-local 1
 */
import { getErrorMessageIfRefusal } from "../services/api/errors.js";
import { env } from "./env.js";
import { getAPIProvider, isClaudePlatformProvider } from "./model/providers.js";
import { canSendFirstPartyBetas } from "./betas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getCatalogEntry } from "./model/modelCatalog.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import {
  parseUserSpecifiedModel,
  renderUsageCreditsOnlyModelName,
  renderDefaultModelSetting,
} from "./model/modelDisplay.js";
import {
  getIsNonInteractiveSession,
  getStickyBetas,
  setFlagSettingsInline,
  getFlagSettingsInline,
} from "../bootstrap/state.js";
import { isFableModelValue, isFableAvailable, isMythosModelValue, isMythosAvailable } from "./model/model.js";
import { getModelUnavailabilityReason } from "./model/classifierModel.js";
import { Bn, I_, parseModelId, wR } from "./model/modelIds.js";
import { isModelAllowed } from "./model/modelAllowlist.js";
import { fPe, isModelBlockedByOverride } from "./planTiers.js";
import { firstWord } from "./model/thirdPartyModelDefaults.js";
import { logForDebugging } from "./debug.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { getInitialSettings_2, updateSettingsForSource } from "./settings/settings.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { Ir, u, T, o, M } from "../../vendor/zod/v4/classic/schemas.js";
import { ml, Jn } from "../remote/remoteMode.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logError } from "./log.js";
import { Yn } from "./stripAnsi.js";
import { tzn } from "./advisor/advisorState.js";
import { d$e } from "../services/api/declaredToolSet.js";

//@ chunk-s61vbvea.js:58930-59050 placement
var ADVISOR_ERROR_CODES = [
  "max_uses_exceeded",
  "too_many_requests",
  "overloaded",
  "prompt_too_long",
  "execution_time_exceeded",
  "unavailable",
];
//@ chunk-s61vbvea.js:59050-59172 placement = isToolResultBlockWithContent (1)
function getObjectContent(obj) {
  if (!("content" in obj)) return;
  let content = obj.content;
  if (typeof content !== "object" || content === null || !("type" in content)) return;
  return content;
}
//@ chunk-s61vbvea.js:59172-59387 placement
function parseAdvisorToolError(e) {
  let n = getObjectContent(e);
  if (n === void 0 || n.type !== "advisor_tool_result_error") return;
  if (!("error_code" in n) || typeof n.error_code !== "string") return "unknown";
  let error_code = n.error_code;
  return ADVISOR_ERROR_CODES.find((s) => s === error_code) ?? "unknown";
}
//@ chunk-s61vbvea.js:59387-59543 placement
var STOP_REASONS = {
    end_turn: !0,
    max_tokens: !0,
    stop_sequence: !0,
    tool_use: !0,
    pause_turn: !0,
    compaction: !0,
    refusal: !0,
    model_context_window_exceeded: !0,
  },
  STOP_REASON_KEYS = Object.keys(STOP_REASONS);
//@ chunk-s61vbvea.js:59543-59778 placement
function parseAdvisorResult(e) {
  let n = getObjectContent(e);
  if (n === void 0 || (n.type !== "advisor_result" && n.type !== "advisor_redacted_result")) return;
  if (!("stop_reason" in n) || typeof n.stop_reason !== "string") return;
  let stop_reason = n.stop_reason;
  return STOP_REASON_KEYS.find((s) => s === stop_reason) ?? "unknown";
}
/**
 * 当错误是拒绝时，取出 advisor 结果中的文本。
 */
//@ chunk-s61vbvea.js:59820-59970 placement
function getAdvisorRefusalText(e) {
  if (!getErrorMessageIfRefusal(e)) return;
  let n = getObjectContent(e);
  if (n?.type !== "advisor_result" || !("text" in n)) return;
  let text = n.text;
  return typeof text === "string" && text ? text : void 0;
}
/**
 * API 判定进程级拒绝顾问后置真。
 */
//@ chunk-s61vbvea.js:59970-59994 fingerprint = isAdvisorBlock (0.55)
var ADVISOR_TOOL_NAME = "advisor",
  advisorRefusedForProcess = !1;
/**
 * API 以进程级原因拒绝顾问时调用（queryModel 400 恢复里）。
 */
//@ chunk-s61vbvea.js:59994-60015 layout
function markAdvisorRefusedForProcess() {
  advisorRefusedForProcess = !0;
}
/**
 * 被拒顾问的 base URL 集合；同句 Um 为当前 base URL 的取值函数。
 */
//@ chunk-s61vbvea.js:60015-60038 layout
var advisorRefusedHosts = new Set(),
  advisorBaseUrlGetter = null;
/**
 * 注册当前 API base URL 的取值函数（启动时传 getDefaultApiBaseUrl）。
 */
//@ chunk-s61vbvea.js:60038-60059 layout
function setAdvisorBaseUrlGetter(e) {
  advisorBaseUrlGetter = e;
}
/**
 * 当前 base URL，出错或未设置为 "default"。
 */
//@ chunk-s61vbvea.js:60059-60125 layout
function getAdvisorHostKey() {
  try {
    return advisorBaseUrlGetter?.() ?? "default";
  } catch {
    return "default";
  }
}
/**
 * 把当前 base URL 记入被拒集合。
 */
//@ chunk-s61vbvea.js:60125-60153 layout
function markAdvisorRefusedForHost() {
  advisorRefusedHosts.add(getAdvisorHostKey());
}
/**
 * 进程级或当前 host 已被拒绝顾问。
 */
//@ chunk-s61vbvea.js:60153-60202 layout
function isAdvisorRefused() {
  return (
    advisorRefusedForProcess || (advisorRefusedHosts.size > 0 && advisorRefusedHosts.has(getAdvisorHostKey()))
  );
}
/**
 * 顾问功能是否可用：未设 CLAUDE_CODE_DISABLE_ADVISOR_TOOL、未被拒、第一方类提供商且允许实验 beta。
 */
//@ chunk-s61vbvea.js:60202-60319 file-local
function isAdvisorEnabled() {
  if (env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL || isAdvisorRefused()) return !1;
  let e = getAPIProvider();
  return (e === "firstParty" || isClaudePlatformProvider(e)) && canSendFirstPartyBetas();
}
/**
 * 在上面基础上：CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL 或 GrowthBook tengu_sage_compass2.enabled。
 */
//@ chunk-s61vbvea.js:60319-60474 layout
function isAdvisorToolEnabled() {
  if (!isAdvisorEnabled()) return !1;
  if (env.CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL) return !0;
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_sage_compass2", {
      enabled: isClaudePlatformProvider(getAPIProvider()),
    }).enabled ?? !1
  );
}
/**
 * CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL（跳过 rank 检查）。
 */
//@ chunk-s61vbvea.js:60474-60542 layout
function isExperimentalAdvisorForced() {
  return env.CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL;
}
/**
 * 2：顾问模型 advisor_rank 至少为 2。
 */
//@ chunk-s61vbvea.js:60542-60551 layout
var MIN_ADVISOR_RANK = 2;
/**
 * 被顾问模型（base）的 catalog advisor_rank。
 */
//@ chunk-s61vbvea.js:60551-60601 layout
function getBaseModelAdvisorRank(e) {
  return getCatalogEntry(getCanonicalName(parseUserSpecifiedModel(e)))?.advisor_rank;
}
/**
 * 顾问模型的 advisor_rank；交互会话里 Fable/Mythos 未开放时返回 undefined。
 */
//@ chunk-s61vbvea.js:60601-60736 layout
function getAdvisorModelRank(e) {
  let n = getCanonicalName(parseUserSpecifiedModel(e));
  if (!getIsNonInteractiveSession()) {
    if (isFableModelValue(n) && (!isFableAvailable() || getModelUnavailabilityReason(e) !== null)) return;
    if (isMythosModelValue(n) && !isMythosAvailable(n)) return;
  }
  return getCatalogEntry(n)?.advisor_rank;
}
/**
 * 被顾问模型有 advisor_rank（或实验强制）。
 */
//@ chunk-s61vbvea.js:60736-60790 layout
function baseModelSupportsAdvisor(e) {
  if (isExperimentalAdvisorForced()) return !0;
  return getBaseModelAdvisorRank(e) !== void 0;
}
/**
 * 可作顾问的别名：fable、opus、sonnet。
 */
//@ chunk-s61vbvea.js:60790-60823 layout
var ADVISOR_ALIAS_CANDIDATES = ["fable", "opus", "sonnet"];
/**
 * 模型（去后缀、解析别名）可直接当顾问。
 */
//@ chunk-s61vbvea.js:60823-60861 layout
function isValidAdvisorModel(e) {
  return canUseAsAdvisor(Bn(parseUserSpecifiedModel(e)));
}
/**
 * 可直接使用或需同意（额度）的顾问别名列表。
 */
//@ chunk-s61vbvea.js:60861-60938 layout
function getValidAdvisorAliases() {
  return ADVISOR_ALIAS_CANDIDATES.filter((e) => {
    let n = Bn(parseUserSpecifiedModel(e));
    return isValidAdvisorModel(e) || isAdvisorPendingConsent(n);
  });
}
/**
 * 顾问 rank ≥ MIN_ADVISOR_RANK（实验强制时总为真）。
 */
//@ chunk-s61vbvea.js:60938-61007 layout
function hasSufficientAdvisorRank(e) {
  if (isExperimentalAdvisorForced()) return !0;
  let n = getAdvisorModelRank(e);
  return n !== void 0 && n >= MIN_ADVISOR_RANK;
}
/**
 * 在可用模型内、不需同意/额度、rank 足够。
 */
//@ chunk-s61vbvea.js:61007-61086 layout
function canUseAsAdvisor(e) {
  let n = parseUserSpecifiedModel(e);
  if (!isModelAllowed(e)) return !1;
  if (fPe(n)) return !1;
  return hasSufficientAdvisorRank(e);
}
/**
 * 需要同意或额度但其他条件满足。
 */
//@ chunk-s61vbvea.js:61086-61189 layout
function isAdvisorPendingConsent(e) {
  let n = parseUserSpecifiedModel(e);
  if (!fPe(n)) return !1;
  if (!isModelAllowed(e)) return !1;
  if (isModelBlockedByOverride(getCanonicalName(n))) return !1;
  return hasSufficientAdvisorRank(e);
}
/**
 * "<模型> as the advisor bills to usage credits…"。
 */
//@ chunk-s61vbvea.js:61189-61307 layout
function getAdvisorCreditsNotice(e) {
  return `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(e))} as the advisor bills to usage credits, which need to be set up for your account.`;
}
/**
 * 建议的 /model 命令。
 */
//@ chunk-s61vbvea.js:61307-61466 layout
function getAdvisorModelSwitchCommand(e) {
  let n = parseUserSpecifiedModel(e),
    lower = firstWord(renderUsageCreditsOnlyModelName(n)).toLowerCase();
  if (!I_(lower)) return "/model";
  let s = parseModelId(n);
  return wR(s) && !fPe(parseUserSpecifiedModel(lower)) && fPe(n) ? `/model ${s.base}` : `/model ${lower}`;
}
/**
 * 顾问 rank 不低于被顾问模型（实验强制时总为真）。
 */
//@ chunk-s61vbvea.js:61466-61568 layout
function canAdviseModel(e, n) {
  if (isExperimentalAdvisorForced()) return !0;
  let r = getBaseModelAdvisorRank(e),
    s = getAdvisorModelRank(n);
  if (r === void 0 || s === void 0) return !0;
  return r <= s;
}
/**
 * 同上但不看实验开关，rank 缺失时为真。
 */
//@ chunk-s61vbvea.js:61568-61653 layout
function canAdviseModelLenient(e, n) {
  let r = getBaseModelAdvisorRank(e),
    s = getAdvisorModelRank(n);
  if (r === void 0 || s === void 0) return !0;
  return r <= s;
}
/**
 * rank 都存在且顾问不低于被顾问模型。
 */
//@ chunk-s61vbvea.js:61653-61727 layout
function canAdviseModelStrict(e, n) {
  let r = getBaseModelAdvisorRank(e),
    s = getAdvisorModelRank(n);
  return r !== void 0 && s !== void 0 && r <= s;
}
/**
 * 两个模型规范化后相同。
 */
//@ chunk-s61vbvea.js:61727-61774 layout
function isSameModelFamilyId(e, n) {
  return getCanonicalName(parseUserSpecifiedModel(e)) === getCanonicalName(parseUserSpecifiedModel(n));
}
/**
 * 本次请求实际用的顾问模型：开关开、base 有 rank、顾问模型有效且不弱于 base，否则打日志返回 undefined。
 */
//@ chunk-s61vbvea.js:61774-62503 layout
function resolveAdvisorModel(e, n) {
  if (!isAdvisorToolEnabled() || !e) return;
  let r = Bn(parseUserSpecifiedModel(e));
  if (!baseModelSupportsAdvisor(n)) {
    if (
      (logForDebugging(`[AdvisorTool] Skipping advisor - base model ${n} does not support advisor`),
      claimOnce().claim("advisor_unranked_base_warning"))
    )
      console.warn(
        `Warning: Advisor disabled \u2014 base model '${n}' has no advisor rank in the model catalog. Switch to a public model alias (opus, sonnet, fable) or set CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL=1.`,
      );
    return;
  }
  if (!canUseAsAdvisor(r)) {
    logForDebugging(`[AdvisorTool] Skipping advisor - ${r} is not a valid advisor model`);
    return;
  }
  if (!canAdviseModel(n, r)) {
    logForDebugging(
      `[AdvisorTool] Skipping advisor - ${r} cannot advise ${n} (advisor must be at least as capable as the base model)`,
    );
    return;
  }
  return (logForDebugging(`[AdvisorTool] Server-side tool enabled with ${r} as the advisor model`), r);
}
/**
 * 顾问功能可用且 base 支持时返回给定顾问模型（queryModel 用来决定是否附加 advisor 工具）。
 */
//@ chunk-s61vbvea.js:62503-62562 layout
function getAdvisorModelForQuery(e, n) {
  return e !== void 0 && isAdvisorEnabled() && baseModelSupportsAdvisor(n) ? e : void 0;
}
/**
 * 顾问开时读 settings.advisorModel。
 */
//@ chunk-s61vbvea.js:62562-62610 layout
function getConfiguredAdvisorModel() {
  if (!isAdvisorToolEnabled()) return;
  return readAdvisorModelSetting(getInitialSettings_2());
}
/**
 * 设置对象中非空的 advisorModel。旧版名 getExperimentAdvisorModels_2 为错配。
 */
//@ chunk-s61vbvea.js:62610-62709 layout = getExperimentAdvisorModels (1)
function readAdvisorModelSetting(e) {
  return typeof e.advisorModel === "string" && e.advisorModel !== "" ? e.advisorModel : void 0;
}
/**
 * 从 usage.iterations 取 type=advisor_message 的顾问用量（cost-tracker 单独计价）。
 */
//@ chunk-s61vbvea.js:62709-62790 fingerprint = getAdvisorUsage (1)
function getAdvisorUsage(usage) {
  return (usage.iterations ?? []).filter((it) => it.type === "advisor_message");
}
/**
 * advisor 工具的状态与提示文本
 */
//@ chunk-s61vbvea.js:62790-64819 placement
var ADVISOR_TOOL_PROMPT = `# Advisor Tool

You have access to an \`advisor\` tool backed by a stronger reviewer model. It takes NO parameters -- when you call advisor(), your entire conversation history is automatically forwarded. They see the task, every tool call you've made, every result you've seen.

Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable: write the file, save the result, commit the change. The advisor call takes time; if the session ends during it, a durable result persists and an unwritten one doesn't.
- When stuck -- errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling -- the advisor adds most of its value on the first call, before the approach crystallizes.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim (the file says X, the paper states Y), adapt. A passing self-test is not evidence the advice is wrong -- it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call -- "I found X, you suggest Y, which constraint breaks the tie?" The advisor saw your evidence but may have underweighted it; a reconcile call is cheaper than committing to the wrong branch.`;
//@ chunk-s61vbvea.js:64819-65217 placement
var ADVISOR_AVAILABILITY_NOTICES = DoctorLazy(() =>
    Ir("available", [
      u({ available: T(!0), model: o(), abbreviated: M().optional(), toolChange: T("add").optional() }),
      u({
        available: T(!1),
        model: o().optional(),
        toolChange: T("remove").optional(),
        byBase: T(!0).optional(),
      }),
    ]),
  ),
  DT = "The advisor tool is no longer available; disregard the earlier advisor instructions.",
  NT = "The advisor tool is available; the advisor instructions announced earlier apply.";
//@ chunk-s61vbvea.js:65217-65627 placement
function buildAdvisorToolAttachment(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r === void 0 || r.type !== "attachment" || r.attachment.type !== "advisor_tool") continue;
    let safeParse = ADVISOR_AVAILABILITY_NOTICES().safeParse(r.attachment);
    if (!safeParse.success) continue;
    return safeParse.data.available
      ? {
          available: !0,
          model: safeParse.data.model,
          toolChange: safeParse.data.toolChange !== void 0,
          byBase: !1,
        }
      : {
          available: !1,
          model: safeParse.data.model,
          toolChange: safeParse.data.toolChange !== void 0,
          byBase: safeParse.data.byBase === !0,
        };
  }
  return;
}
/**
 * 判断消息里是否有可用且非简略版的 advisor_tool 可用性附件。
 */
//@ chunk-s61vbvea.js:65627-65831 placement
function hasFullAdvisorNotice(e) {
  return e.some((n) => {
    if (n.type !== "attachment" || n.attachment.type !== "advisor_tool") return !1;
    let safeParse = ADVISOR_AVAILABILITY_NOTICES().safeParse(n.attachment);
    return safeParse.success && safeParse.data.available && safeParse.data.abbreviated !== !0;
  });
}
//@ chunk-s61vbvea.js:65831-65885 placement
function eZs(e, n) {
  if (!e) return DT;
  return n === !0 ? NT : ADVISOR_TOOL_PROMPT;
}
/**
 * 选的顾问模型需要 usage credits 时的提示（附 /model 指引）。
 */
//@ chunk-9b6702jm.js:666-814 placement
function getAdvisorCreditsRequiredMessage(o, n = !1) {
  return `${getAdvisorCreditsNotice(o)} Run ${getAdvisorModelSwitchCommand(o)}${n ? " in an interactive terminal session" : ""} to review and enable, then set it as the advisor.`;
}
/**
 * /advisor <模型|off> 的执行：远程/只读客户端拦截；off 清 advisorModel（用户设置或远程 apply_flag_settings）；校验模型可当顾问，否则列出可选项；写入 AppState 与用户设置，返回结果文案。
 */
//@ chunk-9b6702jm.js:814-2306 placement
function setAdvisorModelCommand(o, n, f, u, t = !0, m = !1, r = []) {
  let d = ml(),
    e = o === "off" ? void 0 : Bn(o),
    s = e === void 0 || isValidAdvisorModel(e);
  if (
    (logEvent("tengu_advisor_command", {
      advisor:
        e === void 0
          ? lit("off")
          : s
            ? telemetrySafeModelName(o)
            : isAdvisorPendingConsent(e)
              ? lit("consent_pending")
              : lit("invalid"),
      remote: d,
    }),
    !d && Jn())
  )
    return "The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";
  let c = d
    ? " (this session only)"
    : t
      ? ""
      : " for this session \u2014 run /advisor in the terminal to change your default";
  if (e === void 0) {
    if ((f((i) => (i.advisorModel === void 0 ? i : { ...i, advisorModel: void 0 })), d))
      Jn()
        ?.sendControlRequest({ subtype: "apply_flag_settings", settings: { advisorModel: null } })
        .catch(logError);
    else if ((persistAdvisorModelToGlobalConfig(""), t))
      updateSettingsForSource("userSettings", { advisorModel: void 0 }, void 0, u);
    return `Advisor disabled${c}${describeAdvisorChangeForConversation(r, void 0, n)}`;
  }
  if (!s) {
    if (isAdvisorPendingConsent(e)) return getAdvisorCreditsRequiredMessage(e, m);
    let joined = [...getValidAdvisorAliases(), "off"].join(", ");
    return `${Yn(renderDefaultModelSetting(e))} cannot be used as an advisor. Valid options: ${joined}`;
  }
  if ((f((i) => (i.advisorModel === e ? i : { ...i, advisorModel: e })), d))
    Jn()
      ?.sendControlRequest({ subtype: "apply_flag_settings", settings: { advisorModel: e } })
      .catch(logError);
  else if ((persistAdvisorModelToGlobalConfig(e), t))
    updateSettingsForSource("userSettings", { advisorModel: e }, void 0, u);
  let p = Yn(renderDefaultModelSetting(e)),
    v = Yn(renderDefaultModelSetting(n)),
    g = `Advisor set to ${p}${c}`;
  if (!baseModelSupportsAdvisor(n))
    g += `
Note: the current main model (${v}) does not support the advisor. It will activate when you switch to a supported main model.`;
  else if (!canAdviseModel(n, e))
    g += `
Note: ${p} is less capable than the current main model (${v}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;
  return g + describeAdvisorChangeForConversation(r, e, n);
}
/**
 * 说明顾问变更对当前对话的影响（API 已拒绝、已声明的工具保持到 /clear 或 /compact 等）。
 */
//@ chunk-9b6702jm.js:2306-3370 placement
function describeAdvisorChangeForConversation(o, n, f) {
  let u = getStickyBetas(),
    t = u.advisorHeld ?? tzn(buildAdvisorToolAttachment(o));
  if (t === void 0) return "";
  if (t.refused)
    return n === void 0
      ? ""
      : `
The API refused the advisor for the current conversation, so it runs without one until /clear or /compact; the setting applies from there and in new conversations.`;
  let m = d$e(u, f);
  if (t.model === void 0 && m) return "";
  if (t.viaToolChange && (m || (t.inFallback !== !0 && t.model !== void 0)))
    return t.model !== void 0 && n !== void 0 && !isSameAdvisorModel(n, t.model)
      ? `
The current conversation keeps ${Yn(renderDefaultModelSetting(t.model))} as its advisor model until /clear or /compact, so the tool it has already declared stays unchanged; turning the advisor on or off applies right away.`
      : "";
  let r = buildAdvisorToolAttachment(o),
    d = r !== void 0 && !r.available && r.toolChange && !r.byBase,
    e = t.standby === !0 && r === void 0,
    s = d || e ? void 0 : t.model;
  if (s === n || (s !== void 0 && n !== void 0 && isSameAdvisorModel(n, s))) return "";
  return `
The current conversation ${s === void 0 ? "runs without the advisor" : `keeps ${Yn(renderDefaultModelSetting(s))} as its advisor`} until /clear or /compact, so the prompt it has already sent stays unchanged; the new setting applies from there and in new conversations.`;
}
/**
 * 两个顾问模型规范化后相同。
 */
//@ chunk-9b6702jm.js:3370-3402 layout
function isSameAdvisorModel(o, n) {
  return isSameModelFamilyId(o, n);
}
/**
 * 把 advisorModel 写进全局配置。旧版名 getExperimentAdvisorModels 为错配。
 */
//@ chunk-9b6702jm.js:3402-3449 fingerprint = getExperimentAdvisorModels (1)
function persistAdvisorModelToGlobalConfig(o) {
  setFlagSettingsInline({ ...(getFlagSettingsInline() ?? {}), advisorModel: o });
}

export {
  ADVISOR_TOOL_NAME,
  ADVISOR_AVAILABILITY_NOTICES,
  eZs,
  getAdvisorRefusalText,
  isAdvisorToolEnabled,
  resolveAdvisorModel,
  getConfiguredAdvisorModel,
  baseModelSupportsAdvisor,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsNotice,
  getAdvisorModelSwitchCommand,
  canAdviseModel,
  isAdvisorEnabled,
  getAdvisorModelForQuery,
  markAdvisorRefusedForProcess,
  markAdvisorRefusedForHost,
  parseAdvisorToolError,
  parseAdvisorResult,
  setAdvisorBaseUrlGetter,
  isSameModelFamilyId,
  canAdviseModelLenient,
  getAdvisorUsage,
  getValidAdvisorAliases,
  isValidAdvisorModel,
  setAdvisorModelCommand,
  getAdvisorCreditsRequiredMessage,
  STOP_REASON_KEYS,
  buildAdvisorToolAttachment,
  canAdviseModelStrict,
  hasFullAdvisorNotice,
  readAdvisorModelSetting,
};
