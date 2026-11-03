/**
 * utils/permissions/serverClassifier/arbiter.ts
 *
 * 2.1.316 新增：服务端分类器裁决
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (48)
 * attribution: placement 48
 */
import { fromEnum, fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { logError } from "../../log.js";
import { isAutoClassifierActive, isAutoModeActive } from "../autoModeState.js";
import {
  getClassifierProviderKind,
  isServerClassifierUnsupported,
  Hqt,
  CMo,
  vR,
  wasSentForJudging,
  buildClassifierParseFailureReason,
} from "./results.js";
import {
  isThirdPartyServerClassifierEnabled,
  zGe,
  K7,
  getUserServerClassifierSwitch,
  Aqt,
  jGe,
  isBetasSwitchSetAside,
  isLocalClassifierSwitchedOff,
  Mqt,
  Zhe,
  getServerClassifierFallbackMode,
  WGe,
  xqt,
} from "./flags.js";
import { isThirdPartyServerClassifierRefused, getStickyBetas } from "../../../bootstrap/state.js";
import { getAPIProvider, isClaudePlatformProvider } from "../../model/providers.js";
import { canSendFirstPartyBetas, isHipaaOrg, qT } from "../../betas.js";
import { env } from "../../env.js";
import { isEnvTruthy } from "../../envUtils.js";
import { withHostEnvRestored } from "../../settings/managedSettingsFiles.js";
import { getAdminTierEnvValue } from "../../settings/settings.js";
import { holdsNoServedSettings } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEligibilityMemo } from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { isPolicyLimitsCacheMissing } from "../../../services/policyLimits/policyVerdicts.js";
import { Lp, eP } from "../../../bootstrap/stateSlices.js";
import { Yn } from "../../stripAnsi.js";
import { Tqe } from "../../../services/api/toolDefinitionShape.js";
import { clone } from "../../slowOperations.js";
import { Xno } from "../../messageKinds.js";
import { isPlainObject as isPlainObject_4 } from "../../isPlainObject.js";
import { firstLineOf } from "../../stringUtils.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { PPe, requiresClassifierForHookAllow } from "../permissionSetup.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../../tools/NotebookEditTool/constants.js";
import { SERVER_CLASSIFIER_NO_EXPLANATION_REASON } from "../../../types/permissions.js";
import { B7o, getToolPermissionContext } from "../toolPermissionContext.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";

/**
 * 自动模式服务端分类器角色（off/arbiter/arbiterWithLocalFallback）。旧版名 countTokensWithAPI 为错配，归错文件。
 */
//@ chunk-e6aww6q8.js:1033954-1034005 placement = countTokensWithAPI (0.658)
function getAutoModeClassifierRole(e, { peek: n = !1 } = {}) {
  return checkServerClassifierEligibility(e, n).role;
}
//@ chunk-e6aww6q8.js:1034005-1034045 placement
function Qqt(e) {
  return checkServerClassifierEligibility(e).offReason;
}
/**
 * 把服务端分类器资格判断结果转成遥测字段（角色与关闭原因）。
 */
//@ chunk-e6aww6q8.js:1034045-1034190 placement
function getServerClassifierRoleTelemetry(e) {
  try {
    let { role: role, offReason: offReason } = checkServerClassifierEligibility(e, !0);
    return { serverClassifierRole: fromEnum(role), serverClassifierOffReason: fromEnumOpt(offReason) };
  } catch (error) {
    return (logError(error), {});
  }
}
//@ chunk-e6aww6q8.js:1034190-1034817 placement
function checkServerClassifierEligibility(e, n = !1) {
  if (!isAutoClassifierActive(e)) return { role: "off", offReason: "not_auto_mode" };
  if (!canUseServerClassifier({ peek: n })) return { role: "off", offReason: "betas_disabled" };
  if (getClassifierProviderKind() === "thirdParty") {
    let h = !isThirdPartyServerClassifierEnabled()
      ? "third_party_switch_off"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : zGe()
          ? "batch_file_tools"
          : getAPIProvider() === "firstParty" && K7()
            ? "kill_switch"
            : void 0;
    return h === void 0 ? { role: "arbiterWithLocalFallback" } : { role: "off", offReason: h };
  }
  let r = getUserServerClassifierSwitch();
  if (r === !1) return { role: "off", offReason: "user_switch_off" };
  let s = !(r ?? (n ? Aqt() : jGe()))
    ? "rollout_flag_off"
    : K7()
      ? "kill_switch"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : zGe()
          ? "batch_file_tools"
          : void 0;
  if (s === void 0) return { role: "arbiter" };
  return { role: "off", offReason: s };
}
/**
 * 当前提供方能否使用服务端分类器：第一方看能否发 beta 或搁置开关；第三方在宿主托管、显式开启且未禁用实验 beta 时可用（HIPAA 除外）。
 */
//@ chunk-e6aww6q8.js:1034817-1035178 placement
function canUseServerClassifier({ peek: e = !1 } = {}) {
  switch (getClassifierProviderKind()) {
    case "firstParty":
      return canSendFirstPartyBetas() || isBetasSwitchSetAside({ peek: e });
    case "thirdParty": {
      let n = getAPIProvider();
      if (
        n === "firstParty" &&
        env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
        getUserServerClassifierSwitch() === !0 &&
        isEnvTruthy(withHostEnvRestored(() => env.CLAUDE_CODE_AUTO_MODE_SERVER)) &&
        !isEnvTruthy(getAdminTierEnvValue("CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS")) &&
        !holdsNoServedSettings(getEligibilityMemo() ?? !0) &&
        !isPolicyLimitsCacheMissing()
      )
        return !isHipaaOrg();
      return n === "firstParty" || isClaudePlatformProvider(n) ? canSendFirstPartyBetas() : !isHipaaOrg();
    }
  }
}
//@ chunk-e6aww6q8.js:1035178-1035247 placement
function sse(e) {
  return e === "arbiter" || e === "arbiterWithLocalFallback";
}
//@ chunk-e6aww6q8.js:1035247-1035424 placement
function isServerClassifierActive(e, n, { handoffReview: r = !1 } = {}) {
  if (!isAutoClassifierActive(e)) return !1;
  if (isLocalClassifierSwitchedOff({ handoffReview: r })) return !0;
  if (!Mqt()) return !1;
  if (n !== "off") return !0;
  return getUserServerClassifierSwitch() ?? (getClassifierProviderKind() === "thirdParty" || jGe());
}
//@ chunk-e6aww6q8.js:1035424-1035484 placement
function Zqt() {
  return isServerClassifierActive("auto", "arbiterWithLocalFallback");
}
//@ chunk-e6aww6q8.js:1035484-1035519 placement
function y4s(e) {
  return isServerClassifierActive(e, "off");
}
//@ chunk-e6aww6q8.js:1035519-1035566 placement
function eKt() {
  return isAutoModeActive() && getAutoModeClassifierRole("auto") !== "off";
}
//@ chunk-e6aww6q8.js:1035566-1035618 placement
function iye() {
  return Zhe() && getAutoModeClassifierRole("auto") === "arbiter";
}
//@ chunk-e6aww6q8.js:1035618-1035676 placement
function j3n(e) {
  return sse(getAutoModeClassifierRole(e, { peek: !0 })) && !Lp(getStickyBetas(), qT);
}
//@ chunk-e6aww6q8.js:1035676-1035764 placement
var K2e = "The server-side auto mode classifier",
  MMo = 2000,
  OMo = ". If you have other tasks";
//@ chunk-e6aww6q8.js:1035764-1035938 placement
function sanitizeServerExplanation(e) {
  if (e === void 0) return;
  let trimmed = Yn(e)
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    index = trimmed.indexOf(OMo);
  return index === -1 ? trimmed : trimmed.slice(0, index).trim();
}
//@ chunk-e6aww6q8.js:1035938-1035987 placement
var SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG = "server_call_unavailable_input_too_long";
//@ chunk-e6aww6q8.js:1035987-1036137 placement
function getCallVerdictStatus(e, n) {
  if (e.kind !== "per_call") return;
  let r = e.statuses.get(n);
  if (r !== void 0) return r;
  let s = Tqe(n);
  return s === void 0 ? void 0 : e.statuses.get(s);
}
//@ chunk-e6aww6q8.js:1036137-1036213 placement
function qb(e, n) {
  let r = getCallVerdictStatus(e, n);
  return r?.type === "evaluated" ? void 0 : getNoVerdictReason(e, r);
}
//@ chunk-e6aww6q8.js:1036213-1036293 placement
function eze(e) {
  return e === "server_not_requested" || e === "server_input_rewritten";
}
//@ chunk-e6aww6q8.js:1036293-1036366 placement
function aKt(e) {
  return e === "server_input_rewritten" && getServerClassifierFallbackMode() === "off" && WGe();
}
//@ chunk-e6aww6q8.js:1036366-1036530 placement
function shouldFallBackToLocalEarly(e, n) {
  return (
    e === "arbiterWithLocalFallback" &&
    (isServerClassifierUnsupported(n) ||
      (n.kind === "none" &&
        (n.why === "server_not_requested" ||
          (n.why === "server_input_rewritten" && getServerClassifierFallbackMode() === "off"))))
  );
}
/**
 * 按分类器角色判断是否回退到本地分类器：arbiter 仅在无结果/不支持时；带本地回退的角色在服务端不可用、无结果或该调用不可用时回退。
 */
//@ chunk-e6aww6q8.js:1036530-1036979 placement
function shouldFallBackToLocal(e, n, r, { outsideAutoMode: s = !1 } = {}) {
  if (e === "arbiter")
    return (
      WGe() &&
      n.kind === "none" &&
      (n.why === "server_no_result" ||
        n.why === "server_unsupported" ||
        (s && n.why === "server_thread_unsupported"))
    );
  if (e !== "arbiterWithLocalFallback") return !1;
  if (shouldFallBackToLocalEarly(e, n)) return !0;
  if (n.kind === "none")
    return n.why.startsWith("server_unavailable_") || n.why === "server_results_not_held";
  let h = getCallVerdictStatus(n, r);
  if (h === void 0) return !0;
  return h.type === "unavailable" && h.reason !== "truncated";
}
//@ chunk-e6aww6q8.js:1036979-1037251 placement
function getNoVerdictReason(e, n) {
  if (e.kind === "none") return e.why;
  if (n === void 0) return "server_no_result";
  switch (n.type) {
    case "skipped":
      return "server_call_skipped";
    case "unavailable":
      return `server_call_unavailable_${Hqt(CMo, n.reason)}`;
    case "unrecognized":
      return "server_unrecognized_result";
  }
}
/**
 * 取服务端分类器结果：输入被改写、未持有结果或未请求时返回 kind=none 及原因。
 */
//@ chunk-e6aww6q8.js:1037251-1037570 placement
function getUnheldServerResults(e) {
  if (e.serverClassifierInputRewritten === !0)
    return Promise.resolve({ kind: "none", why: "server_input_rewritten" });
  let n = vR(e.serverClassifierResults);
  if (n !== void 0) return n.results();
  return Promise.resolve({
    kind: "none",
    why: e.serverClassifierRequest !== void 0 ? "server_results_not_held" : "server_not_requested",
  });
}
/**
 * 等待某调用的服务端分类结果；输入被改写或该调用的结论已被别的调用作废时返回 server_input_rewritten。
 */
//@ chunk-e6aww6q8.js:1037570-1037999 placement
function awaitServerVerdict(e, n, r = !0) {
  let s = e.serverClassifierInputRewritten === !0,
    h = vR(s ? e.serverClassifierReviewLeftBehind : e.serverClassifierResults);
  if (h === void 0) return getUnheldServerResults(e);
  if (!wasSentForJudging(h, e, n)) return Promise.resolve({ kind: "none", why: "server_not_requested" });
  return h.results().then((y) => {
    let S = getCallVerdictStatus(y, n);
    return (
      s
        ? S?.type === "evaluated" || S?.type === "skipped"
        : (!r || h.isVoidedByAnotherCall(n)) && isNotFlaggedVerdict(S)
    )
      ? { kind: "none", why: "server_input_rewritten" }
      : y;
  });
}
//@ chunk-e6aww6q8.js:1037999-1038071 placement
function isNotFlaggedVerdict(e) {
  return e?.type === "evaluated" && e.outcome === "not_flagged";
}
//@ chunk-e6aww6q8.js:1038071-1038179 placement = countToolCallsSince (1)
function countToolCallsSince_6(messages, sinceUuid) {
  let r = Tqe(sinceUuid);
  return messages.message.content.some(
    (block) => block.type === "tool_use" && (block.id === sinceUuid || block.id === r),
  );
}
//@ chunk-e6aww6q8.js:1038179-1038238 placement
function isClassifierTargetToolUse(e, n, r) {
  return e.isVirtual !== !0 && r !== n && countToolCallsSince_6(e, n);
}
//@ chunk-e6aww6q8.js:1038238-1038315 placement
function tze(e, n) {
  return vR(e.serverClassifierResults) === void 0 ? void 0 : clone(n);
}
//@ chunk-e6aww6q8.js:1038315-1038361 placement
function nze(e, n) {
  return e === void 0 || !eP(n, e);
}
//@ chunk-e6aww6q8.js:1038361-1038591 placement
function buildInputRewriteFields(e, n, r) {
  if (e === void 0) return {};
  return {
    [Xno]: getServerClassifierFallbackMode() !== "off" ? structuredClone(e.written) : void 0,
    serverClassifierInputRewrite: {
      cause: e.cause,
      source: e.source,
      byLocalCode: e.byLocalCode,
      ...(n !== void 0 && { shape: n }),
      keptVerdict: r,
    },
  };
}
/**
 * 对服务端分类器的裁决做最终判定（同批调用未审、已清除等）。
 */
//@ chunk-e6aww6q8.js:1038591-1039693 placement
async function applyServerClassifierVerdict(e, n, r, s, h) {
  let y = vR(e.serverClassifierResults);
  if (y === void 0 || !countToolCallsSince_6(e, n)) return e;
  let S =
    !y.isVoidedByAnotherCall(n) && h !== void 0 && h.every((Ie) => vR(Ie.serverClassifierResults) === y);
  if (s === void 0 && S) return e;
  let w = s !== void 0,
    L =
      s !== void 0
        ? s.cause
        : h === void 0
          ? "siblings_unknown"
          : h.every((Ie) => vR(Ie.serverClassifierResults) === y)
            ? y.siblingNoteCause()
            : "sibling_not_reviewed";
  (y.noteRewriteCause(L),
    y.noteRewrittenCall(n, getServerClassifierFallbackMode() !== "off" ? countToolCallsSince_7(h) : void 0));
  let G = {
      ...e.message,
      content: e.message.content.map((Ie) =>
        Ie.type === "tool_use" && Ie.id === n ? { ...Ie, input: r } : Ie,
      ),
    },
    q = wasSentForJudging(y, e, n) ? getCallVerdictStatus(await y.results(), n) : void 0,
    found = e.message.content.find((Ie) => Ie.type === "tool_use" && Ie.id === n),
    Se = w ? compareBashCommandInputs(found, r) : void 0;
  if (s !== void 0 && S && BMo(s))
    return { ...e, ...buildInputRewriteFields(s, Se, isNotFlaggedVerdict(q)), message: G };
  if (!(w ? q?.type === "evaluated" : isNotFlaggedVerdict(q)))
    return w ? { ...e, ...buildInputRewriteFields(s, Se, !1), message: G } : e;
  let {
    serverClassifierRequest: serverClassifierRequest,
    serverClassifierResults: serverClassifierResults,
    ...Ae
  } = e;
  return {
    ...Ae,
    serverClassifierInputRewritten: !0,
    ...(w && { serverClassifierOwnInputRewritten: !0 }),
    ...buildInputRewriteFields(s, Se, !1),
    message: G,
    serverClassifierRewrite: { cause: L, lostVerdict: isNotFlaggedVerdict(q) ? "cleared" : "flagged" },
  };
}
//@ chunk-e6aww6q8.js:1039693-1039930 placement
function compareBashCommandInputs(e, n) {
  let r = e?.type === "tool_use" && isPlainObject_4(e.input) ? e.input.command : void 0,
    command = n.command;
  if (typeof r !== "string" || typeof command !== "string") return;
  if (command === r) return "same";
  if (command.endsWith(r)) return "prefix";
  return command.includes(r) ? "contains" : "other";
}
//@ chunk-e6aww6q8.js:1039930-1040058 placement = countToolCallsSince (1)
function countToolCallsSince_7(e) {
  return e === void 0
    ? void 0
    : new Set(
        e.flatMap((n) => n.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))),
      );
}
/**
 * 描述服务端分类后调用输入被改写的情况：原因（工具链或钩子）、来源、是否全由本地代码改写，以及 keep_local 模式下的附加判断。
 */
//@ chunk-e6aww6q8.js:1040058-1040453 placement
function describeInputRewrite(e, n, r, s) {
  if (!e.changed && !n.changed) return;
  let h = (S) => S.every((w) => w === "local_code"),
    y = getServerClassifierFallbackMode() === "keep_local";
  return {
    cause: e.changed ? "tool_call_chain" : "hook",
    source: summarizeRewriteSources([...(e.changed ? e.sources : []), ...(n.changed ? n.sources : [])]),
    byLocalCode:
      h(e.kinds) && h(n.kinds) && (!e.changed || e.kinds.length > 0) && (!n.changed || n.kinds.length > 0),
    classifiesAll: y && r(),
    shellOrFileTool: y && s(),
    written: e.written,
  };
}
//@ chunk-e6aww6q8.js:1040453-1040701 placement
function classifyRewriteSource(e) {
  switch (e === void 0 ? void 0 : firstLineOf(e, ":")) {
    case "settings":
      return "settings";
    case "policySettings":
      return "managed";
    case "plugin":
      return "plugin";
    case "skill":
      return "skill";
    case "mod":
      return "mod";
    case "mixed":
      return "mixed";
    default:
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:1040701-1040809 placement
function summarizeRewriteSources(e) {
  let n = new Set(e.map(classifyRewriteSource));
  if (n.size === 0) return "unknown";
  return n.size === 1 ? [...n][0] : "mixed";
}
//@ chunk-e6aww6q8.js:1040809-1040837 placement
var gKt = new Set([BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1040837-1040878 placement
function _Kt(e) {
  return gKt.has(e) && PPe();
}
//@ chunk-e6aww6q8.js:1040878-1040913 placement
var HMo = new Set([...gKt, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1040913-1040995 placement
function SKt(e) {
  return e.isMcp !== !0 && e.mcpInfo === void 0 && HMo.has(e.name) && !requiresClassifierForHookAllow(e);
}
//@ chunk-e6aww6q8.js:1040995-1041090 placement
function BMo(e) {
  return (
    getServerClassifierFallbackMode() === "keep_local" &&
    e.byLocalCode &&
    e.shellOrFileTool &&
    !e.classifiesAll
  );
}
//@ chunk-e6aww6q8.js:1041090-1041347 placement
function getRewriteLostVerdictNote(e, n) {
  if (n !== "server_input_rewritten") return;
  if (e.serverClassifierInputRewritten !== !0)
    return {
      cause: vR(e.serverClassifierResults)?.siblingNoteCause() ?? "sibling_changed",
      lostVerdict: "cleared",
    };
  return e.serverClassifierRewrite ?? { cause: "turn_step" };
}
/**
 * 把某调用的服务端结果概括为 verdict（含是否带解释）或 no_verdict（含原因码）。
 */
//@ chunk-e6aww6q8.js:1041347-1041551 placement
function summarizeServerVerdict(e, n) {
  let r = getCallVerdictStatus(e, n);
  if (r?.type !== "evaluated") return { kind: "no_verdict", why: getNoVerdictReason(e, r) };
  return {
    kind: "verdict",
    outcome: r.outcome,
    explained: r.outcome === "flagged" && (sanitizeServerExplanation(r.explanation)?.length ?? 0) > 0,
  };
}
//@ chunk-e6aww6q8.js:1041551-1042315 placement
function classifyServerVerdict(e, n, r) {
  let s = getCallVerdictStatus(e, n);
  if (s?.type !== "evaluated") {
    if (s?.type === "unavailable" && s.reason === "refused")
      return {
        model: K2e,
        durationMs: 0,
        shouldBlock: !0,
        refusedBySafeguard: !0,
        failureMode: "policy_refusal",
        errorKind: qb(e, n),
        reason: buildClassifierParseFailureReason("server", "policy_refusal", "refusal"),
      };
    let S = s === void 0 ? e.kind !== "none" || e.why !== "server_unrecognized_result" : s.type === "skipped",
      w = qb(e, n);
    return (
      (S ? r() : void 0) ?? {
        model: K2e,
        durationMs: 0,
        shouldBlock: !0,
        unavailable: !0,
        ...(w === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG && xqt() && { transcriptTooLong: !0 }),
        errorKind: w,
        reason: "Classifier unavailable - blocking for safety",
      }
    );
  }
  let h = s.outcome === "flagged",
    y = h ? sanitizeServerExplanation(s.explanation) : void 0;
  return {
    model: K2e,
    durationMs: 0,
    shouldBlock: h,
    reason: h
      ? y !== void 0 && y.length > 0
        ? y.slice(0, MMo)
        : SERVER_CLASSIFIER_NO_EXPLANATION_REASON
      : "Not flagged by the server-side auto mode classifier",
  };
}
//@ chunk-e6aww6q8.js:1042315-1042347 placement
var TENGU_FLICKERING_RAIN = "tengu_flickering_rain";
//@ chunk-e6aww6q8.js:1308790-1309037 placement
function getPermissionModeAtRequestForArbiter(e, n, r) {
  let permissionModeAtRequest = e.permissionModeAtRequest;
  if (!B7o(permissionModeAtRequest) || !e.message.content.some((y) => y.type === "tool_use" && y.id === n))
    return;
  let mode = getToolPermissionContext({ ...r, permissionModeAtRequest: void 0 }).mode;
  return getAutoModeClassifierRole(mode) === "arbiter" &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_teapot", !0)
    ? permissionModeAtRequest
    : void 0;
}
//@ chunk-e6aww6q8.js:1309037-1309071 placement
function yse() {
  return w0o().value;
}
//@ chunk-e6aww6q8.js:1309071-1309117 placement
function w0o() {
  return { value: !0, src: "default" };
}

export {
  j3n,
  getAutoModeClassifierRole,
  awaitServerVerdict,
  summarizeServerVerdict,
  classifyServerVerdict,
  K2e,
  isClassifierTargetToolUse,
  getPermissionModeAtRequestForArbiter,
  yse,
  sse,
  Qqt,
  isServerClassifierActive,
  shouldFallBackToLocal,
  qb,
  eze,
  aKt,
  countToolCallsSince_6,
  getRewriteLostVerdictNote,
  SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG,
  getServerClassifierRoleTelemetry,
  y4s,
  canUseServerClassifier,
  Zqt,
  tze,
  nze,
  describeInputRewrite,
  _Kt,
  SKt,
  applyServerClassifierVerdict,
  TENGU_FLICKERING_RAIN,
  iye,
  eKt,
  checkServerClassifierEligibility,
};
