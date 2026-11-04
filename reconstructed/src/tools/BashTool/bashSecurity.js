/**
 * tools/BashTool/bashSecurity.ts
 *
 * 316 中为权限结果合并工具（严重度排序、safetyCheck 合并、两遍读法择严 bashCommandIsSafeAsync）；旧版正则安全校验器已移出（改由 utils/bash/ast 语义检查），另混入 Artifact pin 与形近字符折叠代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/bashSecurity.ts
 * pieces: chunk-82kqcve8.js (1), chunk-e6aww6q8.js (7)
 * attribution: fingerprint 3, callgraph-fingerprint 3, layout 1, callgraph-witnessed 1
 */
import { normalizeInternalPathRoot, safetyCheckReasonFields } from "../../utils/permissions/filesystem.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { areCommandNetworkListsOffered } from "./sandboxNetwork.js";
import { isAutoModePermissionSurface } from "../../utils/permissions/autoModeState.js";
import { uniq } from "../../utils/collections.js";
import { carriesAskRuleIntent, findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import {
  isBypassImmuneCircuitBreaker,
  isClassifierRoutedCircuitBreaker,
  isUnwaivableBypassImmuneCircuitBreaker,
} from "../../types/permissions.js";
import { runWithRefusalTracking } from "../../utils/bash/ast.js";
import {
  checkBashWithDeclarations,
  isBypassModeForBash,
  buildPendingClassifierCheck,
  isPassthroughOrPlainAsk,
} from "./bashPermissions.js";
import { runWithoutTelemetry } from "./dangerousRemoval.js";
import { BashTool } from "./BashTool.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";

//@ chunk-82kqcve8.js:282090-282356 fingerprint = validateShellMetacharacters (1)
/**
 * 对一组路径/项逐个调用检查函数（passthrough 时再试替代形式）：任一 deny 返回 deny，有非 allow 返回 passthrough，全部 allow 返回第一个 allow。
 */
function requireAllAllowed(pathsToCheck, checkPath, context) {
  let firstAllow;
  for (let path of pathsToCheck) {
    let result = checkPath(path, context);
    if (result.behavior === "passthrough") {
      let normalizedPath = normalizeInternalPathRoot(path);
      if (normalizedPath !== path) result = checkPath(normalizedPath, context);
    }
    if (result.behavior === "deny") return result;
    if (result.behavior !== "allow")
      return {
        behavior: "passthrough",
        message: "",
      };
    firstAllow ??= result;
  }
  return (
    firstAllow ?? {
      behavior: "passthrough",
      message: "",
    }
  );
}
//@ chunk-e6aww6q8.js:1046433-1047016 callgraph-fingerprint = validateEmpty (0.171)
/**
 * 命令携带 allowed_domains（沙箱网络放行列表）且 auto 模式分类器可用时，要求分类器复核：返回 safetyCheck 类型的 ask（allow 规则/hook 只批准命令，不批准域名）。
 */
function askClassifierForAllowedDomains(tool, input, toolUseContext, result) {
  if (result?.behavior === "ask" || result?.behavior === "deny") return;
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    tool.sandboxNetworkLists?.(input) === undefined ||
    !areCommandNetworkListsOffered() ||
    !isAutoModePermissionSurface(toolPermissionContext)
  )
    return;
  return {
    behavior: "ask",
    message: `${tool.name} carries allowed_domains, which the auto-mode classifier reviews together with the command.`,
    ...(result?.behavior === "allow" &&
      result.updatedInput !== undefined && {
        updatedInput: result.updatedInput,
      }),
    decisionReason: {
      type: "safetyCheck",
      reason: `A ${tool.name} call that carries allowed_domains is reviewed by the auto-mode classifier; allow rules and hook allows approve the command, not the hosts.`,
      classifierApprovable: true,
    },
  };
}
//@ chunk-e6aww6q8.js:1117225-1117528 fingerprint = bashCommandIsSafe_DEPRECATED (0.324)
/**
 * 把第二个 safetyCheck 结果的 circuitBreaker/also 合并进第一个的 also 列表（去重、去掉自身）。
 */
function mergeSafetyCheckAlso(result, otherResult) {
  let decisionReason = result.decisionReason;
  let decisionReason_2 = otherResult?.decisionReason;
  if (decisionReason?.type !== "safetyCheck" || decisionReason_2?.type !== "safetyCheck") return result;
  let filtered = uniq([
    ...(decisionReason.also ?? []),
    ...(decisionReason_2.circuitBreaker !== undefined ? [decisionReason_2.circuitBreaker] : []),
    ...(decisionReason_2.also ?? []),
  ]).filter((breaker) => breaker !== decisionReason.circuitBreaker);
  return filtered.length === 0
    ? result
    : {
        ...result,
        decisionReason: {
          ...decisionReason,
          also: filtered,
        },
      };
}
//@ chunk-e6aww6q8.js:1155016-1155366 fingerprint = validateZshDangerousCommands (0.667)
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
//@ chunk-e6aww6q8.js:1203541-1203787 callgraph-fingerprint = validateNewlines (0.475)
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
//@ chunk-e6aww6q8.js:1203787-1203993 layout = validateShellMetacharacters (0.818)
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
//@ chunk-e6aww6q8.js:1203993-1204114 callgraph-fingerprint = validateGitCommit (0.215)
/**
 * safetyCheck 理由的等级：存在不可降级的安全检查为 2，存在安全检查为 1，否则 0。
 */
function getSafetyCheckRank(context) {
  if (
    findSafetyCheckReason(
      context.decisionReason,
      (reason) => isBypassImmuneCircuitBreaker(reason) && !isClassifierRoutedCircuitBreaker(reason),
    ) !== undefined
  )
    return 2;
  return findSafetyCheckReason(context.decisionReason, isBypassImmuneCircuitBreaker) !== undefined ? 1 : 0;
}
//@ chunk-e6aww6q8.js:1226675-1227686 callgraph-witnessed = bashCommandIsSafeAsync_DEPRECATED (0.153)
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
  askClassifierForAllowedDomains,
  requireAllAllowed,
  stripCommandBuiltinPrefixes,
  isPlainAsk,
  bashCommandIsSafeAsync,
  getDecisionSeverity,
  getSafetyCheckRank,
  mergeSafetyCheckAlso,
};
