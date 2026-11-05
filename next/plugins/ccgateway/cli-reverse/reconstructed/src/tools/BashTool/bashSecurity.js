/**
 * tools/BashTool/bashSecurity.ts
 *
 * 316 中为权限结果合并工具（严重度排序、safetyCheck 合并、两遍读法择严 bashCommandIsSafeAsync）；旧版正则安全校验器已移出（改由 utils/bash/ast 语义检查），另混入 Artifact pin 与形近字符折叠代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/bashSecurity.ts
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: fingerprint 2, callgraph-fingerprint 1, placement 1, callgraph-witnessed 2, affinity 2, sole-consumer 1
 */
import {
  carriesAskRuleIntent,
  findSafetyCheckReason,
  sandboxOverrideAskGuardsOn,
  createPermissionRequestMessage,
} from "../../utils/permissions/permissions.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import {
  isBypassImmuneCircuitBreaker,
  isClassifierRoutedCircuitBreaker,
  isUnwaivableBypassImmuneCircuitBreaker,
} from "../../types/permissions.js";
import {
  runCommandSafetyCheck,
  checkBashWithDeclarations,
  isBypassModeForBash,
  buildPendingClassifierCheck,
} from "./bashPermissions.js";
import { runWithReadingRefusals, runAsBashReads, runWithRuleOff } from "../../utils/bash/bashReadingFlags.js";
import {
  runWithoutTelemetry,
  isDangerousRmEnabled,
  classifyRemovalReason,
  logDangerousRmShape,
} from "./dangerousRemoval.js";
import { shouldUseSandbox } from "./shouldUseSandbox.js";
import { askClassifierForAllowedDomains } from "./sandboxNetwork.js";
import { BashTool } from "./BashTool.js";
import { parseCommandRaw, PARSE_ABORTED } from "../../utils/bash/parser.js";
import { parseForSecurityFromAst, runWithRefusalTracking } from "../../utils/bash/ast.js";
import { mergeSafetyCheckAlso } from "./pathValidation.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { safetyCheckReasonFields } from "../../utils/permissions/filesystem.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-5xgkngpb.js:1150368-1150718 fingerprint (2.1.88 match: validateZshDangerousCommands, 0.668)
/**
 * 剥离 argv 前缀的 command [-p] / builtin / noglob，返回实际命令 argv。
 */
function stripCommandBuiltinPrefixes(context) {
  let sliced = context.slice();
  for (;;)
    if (sliced[0] === "command") {
      let flagsEnd = 1;
      while (sliced[flagsEnd] !== undefined && /^-p+$/.test(sliced[flagsEnd])) flagsEnd++;
      if (sliced[flagsEnd] === "--") flagsEnd++;
      if (flagsEnd >= sliced.length || sliced[flagsEnd].startsWith("-")) return sliced;
      sliced = sliced.slice(flagsEnd);
    } else if (sliced[0] === "builtin") {
      let startIdx = sliced[1] === "--" ? 2 : 1;
      if (startIdx >= sliced.length) return sliced;
      sliced = sliced.slice(startIdx);
    } else if (sliced[0] === "noglob") {
      if (sliced.length <= 1) return sliced;
      sliced = sliced.slice(1);
    } else return sliced;
}
//@ chunk-5xgkngpb.js:1200793-1201039 callgraph-fingerprint (2.1.88 match: validateNewlines, 0.532)
/**
 * 判断是否为"普通 ask"（理由为 other 或缺省；子结果都不是硬性 ask），这类 ask 可以被更宽松的读法覆盖。
 */
function isPlainAsk(context) {
  if (context.behavior !== "ask" || carriesAskRuleIntent(context)) return false;
  let decisionReason = context.decisionReason;
  if (decisionReason === undefined || decisionReason.type === "other") return true;
  return (
    decisionReason.type === "subcommandResults" &&
    [...decisionReason.reasons.values()].every(
      (reason) => reason.behavior === "allow" || reason.behavior === "passthrough" || isPlainAsk(reason),
    )
  );
}
//@ chunk-5xgkngpb.js:1201039-1201245 fingerprint (2.1.88 match: validateShellMetacharacters, 1)
/**
 * 权限结果严重度：allow(规则)0 / allow 1 / passthrough 2 / 普通 ask 3 / 安全 ask 4 / 硬安全 ask 5 / deny 6；用于两种读法的结果择严。
 */
function getDecisionSeverity(context) {
  switch (context.behavior) {
    case "allow":
      return isAllRuleReason(context.decisionReason) ? 0 : 1;
    case "passthrough":
      return 2;
    case "ask":
      if (isPlainAsk(context)) return 3;
      return carriesAskRuleIntent(context) ||
        findSafetyCheckReason(context.decisionReason, isBypassImmuneCircuitBreaker) !== undefined
        ? 5
        : 4;
    case "deny":
      return 6;
  }
}
//@ chunk-5xgkngpb.js:1201245-1201366 placement
/**
 * safetyCheck 理由的等级：存在不可降级的安全检查为 2，存在安全检查为 1，否则 0。
 */
function getSafetyCheckRank(decision) {
  if (
    findSafetyCheckReason(
      decision.decisionReason,
      (reason) => isBypassImmuneCircuitBreaker(reason) && !isClassifierRoutedCircuitBreaker(reason),
    ) !== undefined
  )
    return 2;
  return findSafetyCheckReason(decision.decisionReason, isBypassImmuneCircuitBreaker) !== undefined ? 1 : 0;
}
//@ chunk-5xgkngpb.js:1222494-1223433 callgraph-witnessed (2.1.88 match: bashCommandIsSafeAsync_DEPRECATED, 0.124)
/**
 * 合并 Bash 权限的几路结论：常规规则检查、读法检查、沙箱覆盖检查；dangerouslyDisableSandbox 且原本可沙箱运行时按严格模式改成 too-complex ask；ask 结论标记 standsInUnderHookAsk 供 hook 处理。
 */
async function checkBashPermissionWithSandbox(input, permissionContext, astNode, toolUseContext) {
  let safetyCheck = () => runCommandSafetyCheck(input, permissionContext, astNode, toolUseContext);
  let [firstResult, reason] = await runWithReadingRefusals(safetyCheck);
  let context = firstResult;
  if (reason !== undefined && firstResult.behavior !== "deny") {
    let readsResult = await runWithoutTelemetry(() => runAsBashReads(safetyCheck));
    context = combineWithTooComplex(context, readsResult, reason);
    let context_2 = await runWithoutTelemetry(() => runWithRuleOff(safetyCheck));
    context = combineWithTooComplex(context, context_2, reason);
    if (
      input.dangerouslyDisableSandbox &&
      !shouldUseSandbox(input) &&
      shouldUseSandbox({
        ...input,
        dangerouslyDisableSandbox: false,
      })
    ) {
      if (isPassthroughOrPlainAsk(context_2) && context.behavior !== "deny" && sandboxOverrideAskGuardsOn())
        context = buildTooComplexAsk(reason);
    } else if (isPassthroughOrPlainAsk(context))
      context =
        askClassifierForAllowedDomains(BashTool, input, permissionContext, {
          behavior: "passthrough",
          message: "",
        }) ?? context;
    if (
      context.behavior === "ask" &&
      (context_2.behavior === "allow" ||
        context_2.behavior === "passthrough" ||
        (context_2.behavior === "ask" &&
          !carriesAskRuleIntent(context_2) &&
          findSafetyCheckReason(context_2.decisionReason) === undefined &&
          context_2.decisionReason?.type !== "sandboxOverride"))
    )
      context = {
        ...context,
        standsInUnderHookAsk: true,
      };
  }
  if (context.behavior === "ask" && isPlainAsk(context)) {
    let classifierAsk = askClassifierForAllowedDomains(BashTool, input, permissionContext, {
      behavior: "passthrough",
      message: "",
    });
    if (classifierAsk !== undefined) {
      let astRoot = (await parseCommandRaw(input.command)) ?? PARSE_ABORTED;
      let parsed = parseForSecurityFromAst(input.command, astRoot);
      if (parsed.kind === "too-complex" && parsed.keepsRemovalVerdict) context = classifierAsk;
    }
  }
  if (isDangerousRmEnabled()) {
    let regexQuote = findSafetyCheckReason(
      context.decisionReason,
      (reason) => reason.circuitBreaker === "dangerousRemoval",
    );
    let removalKind = regexQuote === undefined ? undefined : classifyRemovalReason(regexQuote.reason);
    if (removalKind !== undefined) logDangerousRmShape(removalKind);
  }
  return context;
}
//@ chunk-5xgkngpb.js:1223433-1223510 affinity (2.1.88 match: validateShellMetacharacters, 1)
/**
 * 结果是 passthrough 或普通 ask（可被其他读法覆盖）。
 */
function isPassthroughOrPlainAsk(context) {
  return context.behavior === "passthrough" || (context.behavior === "ask" && isPlainAsk(context));
}
//@ chunk-5xgkngpb.js:1223510-1223721 affinity
/**
 * 合并规则结果与安全检查结果：deny 优先；安全 ask 去掉建议；规则 allow 而安全检查不 allow 时改为需确认。
 */
function combineWithTooComplex(first, second, reason) {
  if (first.behavior === "deny") return first;
  if (second.behavior === "deny") return second;
  if (second.behavior === "ask" && !isPlainAsk(second))
    return {
      ...second,
      suggestions: [],
    };
  if (first.behavior === "allow" && second.behavior !== "allow") return buildTooComplexAsk(reason);
  return first;
}
//@ chunk-5xgkngpb.js:1223721-1223871 sole-consumer
/**
 * 生成 bashMissKind="too-complex" 的 ask 权限结论（无建议规则）。
 */
function buildTooComplexAsk(reason) {
  let decisionReason = {
    type: "other",
    reason,
    bashMissKind: "too-complex",
  };
  return {
    behavior: "ask",
    decisionReason,
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    suggestions: [],
  };
}
//@ chunk-5xgkngpb.js:1224401-1225412 callgraph-witnessed (2.1.88 match: bashCommandIsSafe_DEPRECATED, 0.131)
/**
 * Bash 安全检查入口：先按正常读法跑（XVt），若有 refused 读法差异，再在 refused 模式下跑一遍，按严重度、安全等级择严合并；必要时附加 allowed_domains 分类器复核；检查异常时返回"检查未完成"的 ask。
 */
async function bashCommandIsSafeAsync(input, context, getCommandSubcommandPrefix, finalizeResult) {
  let { result: firstResult, refused } = await runWithRefusalTracking(false, () =>
    checkBashWithDeclarations(input, context, getCommandSubcommandPrefix, finalizeResult),
  );
  if (!refused || firstResult.behavior === "deny") return firstResult;
  try {
    let { result: context_2 } = await runWithRefusalTracking(true, () =>
      runWithoutTelemetry(() =>
        checkBashWithDeclarations(input, context, getCommandSubcommandPrefix, finalizeResult),
      ),
    );
    let severityDelta = getDecisionSeverity(context_2) - getDecisionSeverity(firstResult);
    let chosen = !(
      context_2.behavior !== "allow" &&
      !(getDecisionSeverity(context_2) === 4 && isBypassModeForBash(context)) &&
      (severityDelta > 0 ||
        (severityDelta === 0 &&
          !buildPendingClassifierCheck(firstResult, context) &&
          (buildPendingClassifierCheck(context_2, context) ||
            (!(firstResult.behavior === "ask" && carriesAskRuleIntent(firstResult)) &&
              getSafetyCheckRank(context_2) > getSafetyCheckRank(firstResult)))))
    )
      ? firstResult
      : context_2.behavior === "deny" || firstResult.behavior === "allow"
        ? context_2
        : mergeSafetyCheckAlso(
            {
              ...context_2,
              suggestions: [],
            },
            firstResult,
          );
    let finalResult =
      isPlainAsk(chosen) && (firstResult.behavior !== "ask" || context_2.behavior !== "ask")
        ? (askClassifierForAllowedDomains(BashTool, input, context, undefined) ?? chosen)
        : chosen;
    return finalResult.behavior === "ask" &&
      (context_2.behavior === "allow" || isPassthroughOrPlainAsk(context_2))
      ? {
          ...finalResult,
          standsInUnderHookAsk: true,
        }
      : finalResult;
  } catch (error) {
    if (isAbortError(error)) throw error;
    logError(error);
    if (
      firstResult.behavior === "ask" &&
      (buildPendingClassifierCheck(firstResult, context) ||
        findSafetyCheckReason(
          firstResult.decisionReason,
          (reason) =>
            isUnwaivableBypassImmuneCircuitBreaker(reason) && !isClassifierRoutedCircuitBreaker(reason),
        ) !== undefined)
    )
      return firstResult;
    let incompleteMessage =
      "The permission check for this command did not finish, so its safety checks did not run.";
    return mergeSafetyCheckAlso(
      {
        behavior: "ask",
        message: incompleteMessage,
        decisionReason: {
          type: "safetyCheck",
          reason: incompleteMessage,
          ...safetyCheckReasonFields(
            {
              classifierApprovable: false,
              circuitBreaker: "unfinishedCheck",
            },
            getToolPermissionContext(context).restricted,
          ),
        },
        suggestions: [],
        suppressAlwaysAllowRule: true,
        checkIncomplete: true,
      },
      firstResult,
    );
  }
}
export {
  stripCommandBuiltinPrefixes,
  checkBashPermissionWithSandbox,
  bashCommandIsSafeAsync,
  isPlainAsk,
  getDecisionSeverity,
  getSafetyCheckRank,
};
