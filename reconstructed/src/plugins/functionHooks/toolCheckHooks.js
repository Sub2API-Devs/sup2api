/**
 * plugins/functionHooks/toolCheckHooks.ts
 *
 * 2.1.316 新增：tool.check 事件钩子接入权限检查（插件只能收紧）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (28)
 * attribution: placement 27, sole-consumer 1
 */
import { getAutoModeConfig } from "../../utils/settings/settings.js";
import { isAutoAllowedInMode, isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { isChromeToolName } from "../../utils/claudeInChrome/chromeToolNames.js";
import { getToolNameForPermissionCheck as getToolNameForPermissionCheck_4 } from "../../services/mcp/mcpStringUtils.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isChainOnAllowActive } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getPermissionPromptHostKind, zue, lyt } from "../../utils/permissions/permissionPromptHost.js";
import { getIsNonInteractiveSession, getPermissionPromptToolName } from "../../bootstrap/state.js";
import { lqt, KW } from "../../utils/hooks/matcherGrammar.js";
import {
  findDecidingRule,
  decisionReasonText,
  PermissionDecisionInfoItem,
} from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { isSandboxOverrideUnderReadBlock } from "../../types/permissions.js";
import { logForDebugging } from "../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { waitForHooksRespawn, pluginsMatchingEvent } from "./hookDispatch.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { checkToolReadOnly } from "./toolApi.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";

//@ chunk-e6aww6q8.js:49345-49434 placement
function cyt() {
  let e = getAutoModeConfig();
  return (e?.soft_deny?.length ?? 0) > 0 || (e?.hard_deny?.length ?? 0) > 0;
}
//@ chunk-e6aww6q8.js:49434-49579 placement
function avoidsPrompt(e, n) {
  let r = isAutoAllowedInMode(e, n),
    s = isChromeToolName(getToolNameForPermissionCheck_4(e));
  return (
    (r === "dontAsk" && !s) ||
    (n.shouldAvoidPermissionPrompts === !0 &&
      !((s || isAutoClassifierActive(r, n.servedCall === !0)) && isChainOnAllowActive()))
  );
}
//@ chunk-e6aww6q8.js:49579-49699 placement
function hostApproves(e, n) {
  let r = getToolPermissionContext(n),
    s = getPermissionPromptHostKind(r.servedCall === !0 ? "served" : "session");
  return n.asksNoHost !== !0 && s !== null && !avoidsPrompt(e, r);
}
/**
 * 判断 tool.check 中由谁审批：宿主（SDK 宿主可询问）、无人（不弹询问的模式）或人。
 */
//@ chunk-e6aww6q8.js:49699-49911 placement
function toolCheckApprover(e, n) {
  let r = getToolPermissionContext(n),
    s = hostApproves(e, n),
    h = getIsNonInteractiveSession() && !zue(getPermissionPromptToolName()),
    y =
      n.asksNoHost === !0 ||
      isAutoAllowedInMode(e, r) === "dontAsk" ||
      r.shouldAvoidPermissionPrompts === !0 ||
      (r.servedCall !== !0 && h);
  return s ? { approver: "host" } : y ? {} : { approver: "person" };
}
//@ chunk-e6aww6q8.js:49911-49932 placement
var TOOL_CHECK = "tool.check";
/**
 * 从权限决定原因中取钩子插件名。
 */
//@ chunk-e6aww6q8.js:49932-50048 placement
function hookNameFromDecision(e) {
  let decisionReason = e.decisionReason;
  return decisionReason?.type === "hook" && decisionReason.hookName !== TOOL_CHECK
    ? decisionReason.hookName.split(":").at(0)
    : void 0;
}
/**
 * 构造 tool.check 事件：工具名、输入、tool_use_id、agentId 与只读等工具元信息。
 */
//@ chunk-e6aww6q8.js:50048-50158 placement
var toToolCheckEvent = (e, n, { input: input, agentId: agentId }) => ({
  tool: e.name,
  input: input,
  tool_use_id: n,
  ...(agentId !== void 0 && { agentId: agentId }),
  ...lqt(e),
});
//@ chunk-e6aww6q8.js:50656-50801 sole-consumer
function findDecidingRuleForResult(e) {
  let decisionReason = e.decisionReason,
    s = e.behavior === "deny" ? void 0 : e.matchedAskRule;
  return (
    (decisionReason?.type === "rule" ? decisionReason.rule : void 0) ??
    findDecidingRule(decisionReason, e.behavior) ??
    s
  );
}
/**
 * 汇总权限决定的调试信息：行为、原因文本、命中的规则与钩子。
 */
//@ chunk-e6aww6q8.js:50801-50942 placement = _temp5 (0.481)
function buildDecisionSummary(u_1, i) {
  let r = decisionReasonText(u_1),
    s = findDecidingRuleForResult(u_1),
    h = hookNameFromDecision(u_1) || i;
  return {
    decision: u_1.behavior,
    ...(r && { reason: r }),
    ...(s && { rule: formatPermissionRule(s.ruleValue) }),
    ...(h && { hook: h }),
  };
}
//@ chunk-e6aww6q8.js:51058-51094 placement
var Syt = (e, n) =>
  PermissionDecisionInfoItem(e) || isSandboxOverrideUnderReadBlock(e, getToolPermissionContext(n));
//@ chunk-e6aww6q8.js:51094-51152 placement
var kyt = "permissions.blockReadsOutsideWorkingDirectories";
//@ chunk-e6aww6q8.js:51152-51238 placement
function byt(e, n) {
  return e.behavior === "ask" && Syt(e.decisionReason, n) ? { setting: kyt } : {};
}
//@ chunk-e6aww6q8.js:51238-51294 placement
var wyt = (e) => ({ name: "core", isCore: !0, budgetMs: 0, run: e });
//@ chunk-e6aww6q8.js:51294-51389 placement
function Tyt(e, n) {
  return { type: "hook", hookName: TOOL_CHECK, hookSource: `plugin:${e.join("+")}`, reason: n };
}
//@ chunk-e6aww6q8.js:51389-51497 placement
function withDenialMessage(e, n) {
  switch (e.behavior) {
    case "allow":
      return e;
    case "ask":
    case "deny":
      return n ? { ...e, message: n } : e;
  }
}
/**
 * 把权限结果标为只能由人决定：去掉建议，允许钩子拒绝，禁止"总是允许"。
 */
//@ chunk-e6aww6q8.js:51497-51635 placement
function personOnlyAsk(e) {
  return {
    ...e,
    suggestions: void 0,
    personOnly: !0,
    hooksMayRefuse: !0,
    hooksMayAllow: e.personOnly !== !0,
    suppressAlwaysAllowRule: !0,
  };
}
//@ chunk-e6aww6q8.js:51635-52416 placement
function describePluginPermissionDenial({
  result: e,
  decided: decided,
  tool: tool,
  input: input,
  toolUseID: toolUseID,
  hooked: hooked,
}) {
  let S = e.decision === "ask" && e.plugin !== void 0;
  if (decided?.behavior === e.decision) {
    let we = withDenialMessage(decided, e.reason);
    return S && we.behavior === "ask" ? personOnlyAsk(we) : we;
  }
  let L = `${hooked.length === 1 ? "plugin" : "plugins"} ${hooked.join(", ")}`,
    G = e.reason === void 0 ? "" : `: ${e.reason}`,
    Z =
      e.decision === "deny"
        ? `Permission to use ${tool} denied by ${L}${G}`
        : `${tool} needs approval (asked by ${L}${G})`,
    Se = Tyt(hooked, e.reason),
    ke = lyt(decided, input);
  switch (
    (logForDebugging(
      `tool.check ${tool} ${toolUseID}: ${decided?.behavior ?? "unevaluated"} -> ${e.decision} by ${L}` + G,
    ),
    e.decision)
  ) {
    case "allow":
      return { behavior: "allow", updatedInput: ke, decisionReason: Se };
    case "deny":
      return { behavior: "deny", message: Z, decisionReason: Se };
    case "ask": {
      let we = { behavior: "ask", message: Z, updatedInput: ke, decisionReason: Se };
      return S ? personOnlyAsk(we) : we;
    }
  }
}
//@ chunk-e6aww6q8.js:52416-52549 placement
function denyAskWithoutApprover(e, { tool: tool, context: context }) {
  return e.decision === "ask" && e.plugin !== void 0 && toolCheckApprover(tool, context).approver === void 0
    ? { ...e, decision: "deny" }
    : e;
}
/**
 * tool.check 链底核心：执行原权限评估并转为事件结果，记录评估结果供后续使用。
 */
//@ chunk-e6aww6q8.js:52549-52704 placement
function createToolCheckCore(e, n, r) {
  let s;
  return {
    core: wyt(
      async () => (
        (s = await e()),
        { ...buildDecisionSummary(s, r.hookAskFloor === !0 ? "PreToolUse" : void 0), ...byt(s, r), ...lqt(n) }
      ),
    ),
    decided: () => s,
  };
}
//@ chunk-e6aww6q8.js:52704-52729 placement
var VFo = UI_ENV_SITE_RULES["tool.check"];
//@ chunk-e6aww6q8.js:52729-52835 placement
var toolCheckEventFor = ({ tool: tool, input: input, context: context, toolUseID: toolUseID }) => ({
  ...toToolCheckEvent(tool, toolUseID, { input: input, agentId: context.agentId }),
  ...toolCheckApprover(tool, context),
});
//@ chunk-e6aww6q8.js:52835-52945 placement
function createToolCheckSlot() {
  let e = pu();
  return { setToolCheckResolver: e.set, resolveToolCheck: (n) => e.get()?.(n) ?? n.evaluate() };
}
//@ chunk-e6aww6q8.js:52945-52959 placement
var cle = createToolCheckSlot();
//@ chunk-e6aww6q8.js:52959-52988 placement
var resolveToolCheck = cle.resolveToolCheck;
//@ chunk-e6aww6q8.js:52988-53021 placement
var setToolCheckResolver = cle.setToolCheckResolver;
//@ chunk-e6aww6q8.js:53021-53127 placement
function toolCheckRecord({ tool: tool, input: input, toolUseID: toolUseID }, s, h) {
  return { decided: s, tool: tool.name, input: input, toolUseID: toolUseID, hooked: h };
}
/**
 * 把 tool.check 钩子的裁决并入权限检查：插件只能收紧，放宽的结果被忽略并记录。
 */
//@ chunk-e6aww6q8.js:53127-54134 placement
var applyToolCheckHookVerdict = (e) => {
  let { tool: tool, input: input, context: context, toolUseID: toolUseID, evaluate: evaluate } = e,
    S = toolCheckEventFor(e),
    w = waitForHooksRespawn(
      { event: "tool.check", e: S, origin: context.hookOrigin },
      context.abortController.signal,
    );
  if (w !== void 0) return w.then(() => applyToolCheckHookVerdict(e) ?? evaluate());
  let L = { ...KW(tool), agentId: context.agentId };
  if (!hasModuleHookingSite("tool.check", L)) return;
  let G = checkToolReadOnly(tool, input, context),
    q = createToolCheckCore(evaluate, tool, context);
  return NO_CORE_AT_CHAIN_BOTTOM("tool.check", {
    signal: context.abortController.signal,
    origin: context.hookOrigin,
    core: { "tool.check": q.core },
  })({ ...S, ...G }).then(async (Z) => {
    let Se = denyAskWithoutApprover(Z, e),
      ke = isWebToolRestrictedInRelay(tool.name) || isComputerUseTool(tool.mcpInfo),
      we = Se.decision !== "deny" && ke,
      decided = q.decided();
    if (we) {
      if (((decided ??= await evaluate()), Se.decision === "allow" || decided.behavior === "deny"))
        return (
          logForDebugging(
            `tool.check ${tool.name} ${toolUseID}: ignored a plugin's ${Se.decision} and kept the permission check's ${decided.behavior}; plugins can only tighten ${tool.name}'s permission in this session`,
          ),
          decided
        );
    }
    let Ae = toolCheckRecord(
        e,
        decided,
        pluginsMatchingEvent("tool.check", { ...L, isReadOnly: G.isReadOnly }, context.hookOrigin),
      ),
      Ie = describePluginPermissionDenial({ ...Ae, result: Se });
    if (Se === Z || Ie.behavior !== "deny" || ke) return Ie;
    let Me = describePluginPermissionDenial({ ...Ae, result: Z });
    return Me.behavior === "ask" ? { ...Me, refusal: Ie } : Ie;
  });
};
//@ chunk-e6aww6q8.js:54134-54143 placement
setToolCheckResolver(applyToolCheckHookVerdict);

export {
  cyt,
  resolveToolCheck,
  personOnlyAsk,
  TOOL_CHECK,
  toToolCheckEvent,
  VFo,
  describePluginPermissionDenial,
  createToolCheckCore,
  toolCheckApprover,
};
