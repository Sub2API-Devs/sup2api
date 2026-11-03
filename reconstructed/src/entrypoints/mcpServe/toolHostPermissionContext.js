/**
 * entrypoints/mcpServe/toolHostPermissionContext.ts
 *
 * 2.1.316 新增：工具宿主权限上下文的结构、询问描述与设置文件写入判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz36xfxg.js (40)
 * attribution: placement 40
 */
import { RS } from "../../utils/sanitization.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  o,
  zodStrictObject,
  U,
  Ir,
  T,
  M,
  A,
  Ue,
  xE,
  u,
  E,
  QD,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { eMn } from "../../utils/permissions/permissionRuleParser.js";
import { patternWithRootFor } from "../../utils/permissions/filesystem.js";
import { parseShellPermissionRule } from "../../tools/PowerShellTool/powershellPermissions.js";
import { x0e } from "../../tools/BashTool/inlineShellAnalysis.js";
import { SHELL_PROGRAM_NAMES } from "../../utils/bash/ast.js";
import { startsWithBareShell } from "../../tools/BashTool/bashPermissions.js";
import {
  SERIALIZABLE_RULE_SOURCES,
  MAX_DIRECTORY_PATH_LENGTH,
  absolutePathSchema,
} from "../../utils/permissions/permissionContextSerialization.js";
import { asShownOnACard, toPermissionQuestionReason, collectSafetyReasons } from "./plainCallAsk.js";
import {
  PERMISSION_MODES,
  PERMISSION_DECISION_REASON_TYPES,
  isClassifierRoutedCircuitBreaker,
  isAutoModeDenyCircuitBreaker,
  isHostPersonOnlyCircuitBreaker,
} from "../../types/permissions.js";
import { askDigestSchema } from "../../services/mcpServe/callClaims.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import {
  isPlanModeFloorReason,
  PERMISSION_CHECK_CRASHED_REASON,
  carriesAskRuleIntent,
  createPermissionRequestMessage,
  findSafetyCheckReason,
} from "../../utils/permissions/permissions.js";
import { shouldShowAlwaysAllowOptions } from "../../utils/permissions/permissionsLoader.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { computeContentHash, AS } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  shouldBypassAskForReadOnly,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
} from "../../tools/BashTool/readOnlyShellCheck.js";

//@ chunk-dz36xfxg.js:15108-15142 placement
var ANTHROPIC_SHELLDIRECTORY = "anthropic/shellDirectory";
//@ chunk-dz36xfxg.js:15142-15198 placement
function withShellDirectoryMeta(e, n) {
  return { ...e, _meta: { ...e._meta, [ANTHROPIC_SHELLDIRECTORY]: n } };
}
//@ chunk-dz36xfxg.js:15198-15353 placement
var ANTHROPIC_TOOLHOSTPERMISSIONDECISION = "anthropic/toolHostPermissionDecision",
  W = 2000,
  oe = 1024,
  sn = 128,
  ke = 32,
  Y = 32,
  an = 64,
  regExp = new RegExp(`[${RS}<>]|(?! )\\p{Zs}`, "u"),
  ln = new Set([FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-dz36xfxg.js:15353-15381 placement
function isBashToolName(e) {
  return e === BASH_TOOL_NAME;
}
//@ chunk-dz36xfxg.js:15381-15405 placement
var N = DoctorLazy(() => o().max(W));
//@ chunk-dz36xfxg.js:15405-15450 placement
function _e(e) {
  return e.replace(/\\[^]/g, "");
}
//@ chunk-dz36xfxg.js:15450-15592 placement
function hasOnlySafeEscapes(e) {
  return [...e.matchAll(/\\([^]?)(?=([^]?))/g)].every(
    ([, n = "", t = ""]) => eMn(n) && !"*?!#".includes(n) && !(n === "\\" && /^[.{]$/.test(t)),
  );
}
//@ chunk-dz36xfxg.js:15592-15805 placement
function isNarrowPathPattern(e) {
  let mapped = e.split("/").map(_e),
    index = mapped.findIndex((r) => /[*?[\]]/.test(r));
  return (
    !/[|()+^$]/.test(_e(e)) &&
    !mapped.includes("..") &&
    hasOnlySafeEscapes(e) &&
    /\/[^/]/.test(e) &&
    mapped.slice(0, index === -1 ? void 0 : index).some((r) => /[^\s.~\\]/.test(r))
  );
}
//@ chunk-dz36xfxg.js:15805-15927 placement
function isNarrowPathRule(e) {
  return isNarrowPathPattern(
    patternWithRootFor(e.replace(/^(?:[/\\]{2}[a-z](?=\s*(?:[/\\]|$))|[a-z]:(?=[/\\]))/i, "/"), "/")
      .relativePattern,
  );
}
/**
 * 规则的首个命令词是否可以被收窄（不是裸 shell/包装命令，也不属于特殊集合）。
 */
//@ chunk-dz36xfxg.js:15927-16152 placement = filterRulesByContentsMatchingInput (0.822)
function filterRulesByContentsMatchingInput(e) {
  let inputCmdName = parseShellPermissionRule(e),
    t =
      inputCmdName.type === "exact"
        ? `${inputCmdName.command} `
        : inputCmdName.type === "prefix"
          ? `${inputCmdName.prefix} `
          : /^((?:[^\\*]|\\[^])*)\*\s*$/.exec(inputCmdName.pattern)?.[1],
    inputCanonical = x0e(/^\s*([\w./+-]+)\s/.exec(t ?? "")?.[1]);
  return (
    inputCanonical !== "" && !SHELL_PROGRAM_NAMES.has(inputCanonical) && !startsWithBareShell(inputCanonical)
  );
}
//@ chunk-dz36xfxg.js:16152-16396 placement
var toolHostAllowRuleSchema = DoctorLazy(() =>
  zodStrictObject({
    tool_name: o()
      .min(1)
      .max(sn)
      .refine((e) => isBashToolName(e) || ln.has(e)),
    rule_content: o()
      .min(1)
      .max(oe, { abort: !0 })
      .refine((e) => !/^[\s*]+$/.test(e) && !regExp.test(e), { abort: !0 }),
  }).refine((e) =>
    isBashToolName(e.tool_name)
      ? filterRulesByContentsMatchingInput(e.rule_content)
      : isNarrowPathRule(e.rule_content),
  ),
);
/**
 * ToolHost 权限上下文 / 决策原因的 zod 模式集合（anthropic/toolHostPermissionDecision 元数据）。
 */
//@ chunk-dz36xfxg.js:16396-17697 placement
var TOOL_HOST_PERMISSION_SCHEMAS = DoctorLazy(() =>
    o()
      .min(1)
      .max(oe)
      .refine((e) => !regExp.test(e)),
  ),
  pn = DoctorLazy(() =>
    zodStrictObject({
      source: U(SERIALIZABLE_RULE_SOURCES),
      rule: TOOL_HOST_PERMISSION_SCHEMAS().optional(),
    }),
  ),
  ye = DoctorLazy(() =>
    o()
      .max(an)
      .refine((e) => !regExp.test(e)),
  ),
  G = DoctorLazy(() =>
    N()
      .min(1)
      .refine((e) => asShownOnACard(e) === e),
  ),
  _n = DoctorLazy(() =>
    Ir("type", [
      zodStrictObject({ type: T("mode"), reason: G(), mode: T("plan") }),
      zodStrictObject({ type: T("raisedAllow"), reason: G(), is_read_only_command: T(!0).optional() }),
    ]),
  ),
  ge = DoctorLazy(() =>
    Ir("type", [
      zodStrictObject({
        type: T("rule"),
        reason: G(),
        source: U(SERIALIZABLE_RULE_SOURCES),
        rule: TOOL_HOST_PERMISSION_SCHEMAS().optional(),
      }),
      zodStrictObject({
        type: T("safetyCheck"),
        reason: G(),
        classifier_approvable: M(),
        circuit_breaker: ye().optional(),
        also: A(ye()).max(Y).optional(),
      }),
      zodStrictObject({ type: U(["workingDir", "other"]), reason: G(), classifier_approvable: M() }),
    ]),
  ),
  yn = DoctorLazy(() => Ue([xE([_n()]), xE([ge()], ge()).refine((e) => e.length <= Y)])),
  Se = DoctorLazy(() =>
    Ir("type", [
      zodStrictObject({
        type: T("rule"),
        source: U(SERIALIZABLE_RULE_SOURCES),
        behavior: U(["deny", "ask"]),
        rule: N().min(1).max(oe),
      }),
      zodStrictObject({ type: T("mode"), mode: U(PERMISSION_MODES) }),
      zodStrictObject({
        type: T("other"),
        name: U(PERMISSION_DECISION_REASON_TYPES),
        description: N().optional(),
      }),
    ]),
  ),
  ht = DoctorLazy(() =>
    Ir("kind", [
      zodStrictObject({ kind: T("invalid"), message: N(), denied_by_rule: T(!0).optional() }),
      zodStrictObject({ kind: T("allow"), shell_allow_source: U(["read_only", "sandbox"]).optional() }),
      zodStrictObject({ kind: T("deny"), message: N(), reason: Se() }),
      zodStrictObject({
        kind: T("ask"),
        message: N(),
        ask_digest: askDigestSchema(),
        reasons: yn(),
        matched_ask_rule: pn().optional(),
        blocked_path: o().min(1).max(MAX_DIRECTORY_PATH_LENGTH).optional(),
        suggested_allow_rules: A(toolHostAllowRuleSchema()).max(ke),
      }),
    ]),
  );
//@ chunk-dz36xfxg.js:17697-17731 placement
function X(e) {
  return clipText(asShownOnACard(e), W);
}
//@ chunk-dz36xfxg.js:17731-17864 placement
function formatDecisionMessage({ message: message, denied_by_rule: denied_by_rule }) {
  return denied_by_rule === !0
    ? X(message)
    : clipText(
        message
          .split(/([\n\t])/)
          .map((t) =>
            t ===
              `
` || t === "\t"
              ? t
              : asShownOnACard(t),
          )
          .join(""),
        W,
      );
}
/**
 * 把权限决定原因序列化成 SDK 线格式（rule/mode/classifier/hook/workingDir…）。
 */
//@ chunk-dz36xfxg.js:17864-18409 placement = serializeDecisionReason (0.933)
function serializeDecisionReason(reason) {
  switch (reason.type) {
    case "rule": {
      let safeParse = Se().safeParse({
        type: "rule",
        source: reason.rule.source,
        behavior: reason.rule.ruleBehavior,
        rule: formatPermissionRule(reason.rule.ruleValue),
      });
      return safeParse.success ? safeParse.data : { type: "other", name: "rule" };
    }
    case "mode":
      return { type: "mode", mode: reason.mode };
    case "asyncAgent":
    case "classifier":
    case "workingDir":
    case "safetyCheck":
    case "other":
    case "hook":
      return {
        type: "other",
        name: reason.type,
        ...(reason.reason !== void 0 && { description: X(reason.reason) }),
      };
    case "subcommandResults":
    case "permissionPromptTool":
    case "sandboxOverride":
      return { type: "other", name: reason.type };
    default:
      return reason;
  }
}
//@ chunk-dz36xfxg.js:18409-18547 placement = hasBashPermission (0.813)
function askRuleFromRule(rules) {
  if (rules?.ruleBehavior !== "ask") return;
  let safeParse = TOOL_HOST_PERMISSION_SCHEMAS().safeParse(formatPermissionRule(rules.ruleValue));
  return { source: rules.source, ...(safeParse.success && { rule: safeParse.data }) };
}
//@ chunk-dz36xfxg.js:18547-18714 placement
function isRaisedAllowReason(e) {
  switch (e.type) {
    case "rule":
    case "mode":
      return !1;
    case "raisedAllow":
      return !0;
    case "safetyCheck":
    case "workingDir":
    case "other":
      return e.classifier_approvable;
  }
}
//@ chunk-dz36xfxg.js:18714-18943 placement
function allowRulesFromUpdates(e) {
  return (e ?? [])
    .flatMap((n) => (n.type === "addRules" && n.behavior === "allow" ? n.rules : []))
    .flatMap(({ toolName: toolName, ruleContent: ruleContent }) => {
      let safeParse = toolHostAllowRuleSchema().safeParse({ tool_name: toolName, rule_content: ruleContent });
      return safeParse.success ? [safeParse.data] : [];
    })
    .slice(0, ke);
}
//@ chunk-dz36xfxg.js:18943-18977 placement
function toolHostDecisionMeta(e) {
  return { [ANTHROPIC_TOOLHOSTPERMISSIONDECISION]: encodeToolHostDecision(e) };
}
//@ chunk-dz36xfxg.js:18977-19230 placement
function encodeToolHostDecision(e) {
  switch (e.kind) {
    case "allow":
      return e;
    case "invalid":
      return { ...e, message: formatDecisionMessage(e) };
    case "deny":
      return { ...e, message: X(e.message) };
    case "ask":
      return {
        ...e,
        message: X(e.message),
        ...(e.blocked_path !== void 0 && {
          blocked_path: clipText(asShownOnACard(e.blocked_path), MAX_DIRECTORY_PATH_LENGTH),
        }),
      };
  }
}
//@ chunk-dz36xfxg.js:19230-19413 placement
function flattenAskReasons(e) {
  if (e?.type === "safetyCheck") return [];
  if (e?.type === "subcommandResults")
    return [...e.reasons.values()].flatMap((n) =>
      n.behavior === "allow" ? [] : flattenAskReasons(n.decisionReason),
    );
  return [e];
}
//@ chunk-dz36xfxg.js:19413-19732 placement = serializeDecisionReason (0.954)
function isAskingDecisionReason(reason) {
  switch (reason?.type) {
    case void 0:
    case "workingDir":
      return !1;
    case "rule":
      return reason.rule.ruleBehavior === "ask";
    case "mode":
      return isPlanModeFloorReason(reason);
    case "other":
      return reason.reason === PERMISSION_CHECK_CRASHED_REASON;
    case "asyncAgent":
    case "classifier":
    case "hook":
    case "permissionPromptTool":
    case "sandboxOverride":
    case "safetyCheck":
    case "subcommandResults":
      return !0;
  }
}
//@ chunk-dz36xfxg.js:19732-19910 placement
function isBackgroundOperatorApprovable(e, n) {
  return (
    n.mode === "auto" &&
    n.classifierMayApprove.includes("background_operator") &&
    e.circuitBreaker === "backgroundOperator" &&
    (e.also ?? []).length === 0 &&
    isClassifierRoutedCircuitBreaker(e) &&
    !isAutoModeDenyCircuitBreaker(e)
  );
}
//@ chunk-dz36xfxg.js:19910-20004 placement
function de(e) {
  return e.mode === "auto" && e.classifierMayApprove.includes("as_in_local_session");
}
//@ chunk-dz36xfxg.js:20004-20056 placement
function ue(e) {
  return e.classifierApprovable || isClassifierRoutedCircuitBreaker(e);
}
//@ chunk-dz36xfxg.js:20056-20173 placement
function safetyCheckAskReason(e, n, t) {
  let r = de(t);
  return {
    type: "safetyCheck",
    ...toPermissionQuestionReason(
      e,
      !n && (r ? ue(e) : e.classifierApprovable || isBackgroundOperatorApprovable(e, t)),
      !r,
    ),
  };
}
//@ chunk-dz36xfxg.js:20173-20456 placement
function askRuleForDecision(e, n, t) {
  let [r, ...i] = n,
    s = i.length === 0 ? r : n.find((d) => d?.type === "rule" && d.rule.ruleBehavior === "ask"),
    a = s?.type === "rule" ? askRuleFromRule(s.rule) : void 0;
  if (a !== void 0) return { type: "rule", reason: e, ...a };
  return { type: s?.type === "workingDir" ? "workingDir" : "other", reason: e, classifier_approvable: t };
}
//@ chunk-dz36xfxg.js:20456-20515 placement
function isPlanModeWrite(e, n, t, r) {
  return t === "plan" && !e.isReadOnly(n, r);
}
//@ chunk-dz36xfxg.js:20515-20581 placement
function le(e) {
  return e.every(({ reason: reason }) => reason.length <= W) ? e : void 0;
}
//@ chunk-dz36xfxg.js:20581-21251 placement
function describeToolHostAsk(e, n, t, r, i) {
  let s = collectSafetyReasons(t.decisionReason),
    a = flattenAskReasons(t.decisionReason),
    d = carriesAskRuleIntent(t) || e.requiresUserInteraction?.() === !0 || isPlanModeWrite(e, n, r.mode, i),
    k = asShownOnACard(t.message || createPermissionRequestMessage(e.name, t.decisionReason)),
    l = t.decisionReason?.type === "subcommandResults" ? clipText(k, W) : k,
    y = s.length === 0 && a.length === 1 ? a[0] : void 0;
  if (isPlanModeFloorReason(y)) return le([{ type: "mode", reason: l, mode: "plan" }]);
  if (!d && t.decisionReason?.type === "other" && t.decisionReason.reroutedFrom !== void 0)
    return le([
      {
        type: "raisedAllow",
        reason: l,
        ...(isBashToolName(e.name) && e.isReadOnly(n, i) && { is_read_only_command: !0 }),
      },
    ]);
  let [w, ...h] = [
    ...s.map((C) => safetyCheckAskReason(C, d, r)),
    ...(s.length === 0 || a.length > 0 || d
      ? [askRuleForDecision(l, a, !d && !a.some(isAskingDecisionReason))]
      : []),
  ];
  return w === void 0 || h.length >= Y ? void 0 : le([w, ...h]);
}
//@ chunk-dz36xfxg.js:21251-21429 placement
function offersAlwaysAllow(e) {
  return (
    shouldShowAlwaysAllowOptions() &&
    e.suggestions?.some((n) => n.type === "addRules") === !0 &&
    e.suppressAlwaysAllowRule !== !0 &&
    findSafetyCheckReason(
      e.decisionReason,
      (n) => !n.classifierApprovable || isHostPersonOnlyCircuitBreaker(n),
    ) === void 0
  );
}
//@ chunk-dz36xfxg.js:21429-21535 placement
function sortedObjectKeys(e, n) {
  return isPlainObject(n)
    ? Object.fromEntries(Object.entries(n).toSorted(([t], [r]) => (t < r ? -1 : t > r ? 1 : 0)))
    : n;
}
//@ chunk-dz36xfxg.js:21535-21569 placement
function settingsFileContentHash(e) {
  return computeContentHash(jsonStringify(e, sortedObjectKeys));
}
//@ chunk-dz36xfxg.js:21569-21652 placement
var ANTHROPIC_MOVESATTIMEOUT = "anthropic/movesAtTimeout",
  zt = { [ANTHROPIC_MOVESATTIMEOUT]: { v: 1 } },
  An = DoctorLazy(() => u({ [ANTHROPIC_MOVESATTIMEOUT]: zodStrictObject({ v: T(1) }) }));
//@ chunk-dz36xfxg.js:21652-21700 placement
function isValidSettingsFileIdentity(e) {
  return An().safeParse(e).success;
}
//@ chunk-dz36xfxg.js:21700-22199 placement
async function judgeSettingsFileWrite(e, n, t, r, i, s) {
  if (findSafetyCheckReason(t.decisionReason, isHostPersonOnlyCircuitBreaker) !== void 0)
    return findSafetyCheckReason(
      t.decisionReason,
      (a) => a.circuitBreaker === "claudeSettingsFile" || a.also?.includes("claudeSettingsFile") === !0,
    ) !== void 0
      ? "tagged_by_path_check"
      : "tagged_by_another_check";
  switch (await shouldBypassAskForReadOnly(e, n, t, r)) {
    case "settings":
      return "proven";
    case "none":
      return (await servedLineTouchesProtectedPath(e, n, s)) ? "names_settings" : void 0;
    case "uncertain":
      if (touchesProtectedPath(n, "file_or_folder")) return "uncertain_names_settings";
      return i.includes("unresolved_shell_write") ? void 0 : "uncertain";
  }
}
//@ chunk-dz36xfxg.js:22199-22584 placement
function settingsFileWriteReason(e, n) {
  let t = `This command ${n} to one of Claude Code's own settings files.`;
  return {
    ...e,
    decisionReason: {
      type: "subcommandResults",
      reasons: new Map([
        [
          "settings",
          {
            behavior: "ask",
            message: t,
            decisionReason: {
              type: "safetyCheck",
              reason: t,
              classifierApprovable: !0,
              circuitBreaker: "claudeSettingsFile",
            },
          },
        ],
        ["command", { behavior: "ask", message: e.message, decisionReason: e.decisionReason }],
      ]),
    },
  };
}
//@ chunk-dz36xfxg.js:22584-22957 placement
async function resolveToolHostAsk(e, n, t, r, i, s) {
  let a = await judgeSettingsFileWrite(e, n, t, r, i.classifierMayApprove, s);
  if (a === void 0) return { ask: t };
  if (de(i)) {
    let d =
      findSafetyCheckReason(t.decisionReason, (k) => isHostPersonOnlyCircuitBreaker(k) && !ue(k)) !== void 0;
    return { ask: t, suspicion: { reason: a, isHoldLifted: !d } };
  }
  return {
    ask:
      a === "tagged_by_path_check" || a === "tagged_by_another_check"
        ? t
        : settingsFileWriteReason(t, a === "proven" ? "writes" : "may write"),
    suspicion: { reason: a, isHoldLifted: !1 },
  };
}
//@ chunk-dz36xfxg.js:22957-23053 placement
function withChangeWithoutReadEntry(e) {
  return { ...e, _meta: { ...e._meta, ["anthropic/changeWithoutReadFileStateEntry"]: !0 } };
}
//@ chunk-dz36xfxg.js:23087-23436 placement
var READ_FILE_STATE_META = "anthropic/readFileStateChanges",
  xe = 64,
  me = DoctorLazy(() => u({ path: o().pipe(absolutePathSchema()) })),
  Bt = DoctorLazy(() =>
    Ue([
      me().extend({
        sha256: o().regex(AS),
        bytes: E().int().nonnegative(),
        content_not_in_model_context: T(!0).optional(),
        is_partial_view: QD().optional(),
      }),
      me().extend({ is_partial_view: T(!0) }),
      me().extend({ sha256: QD().optional(), is_partial_view: QD().optional() }),
    ]),
  );

export {
  xe,
  READ_FILE_STATE_META,
  withShellDirectoryMeta,
  isValidSettingsFileIdentity,
  serializeDecisionReason,
  isBashToolName,
  resolveToolHostAsk,
  describeToolHostAsk,
  askRuleFromRule,
  settingsFileContentHash,
  offersAlwaysAllow,
  allowRulesFromUpdates,
  isPlanModeWrite,
  isRaisedAllowReason,
  withChangeWithoutReadEntry,
  toolHostDecisionMeta,
};
