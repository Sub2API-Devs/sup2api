/**
 * tools/BashTool/bashCommandHelpers.ts
 *
 * 管道/操作符分段的权限合成：子 shell 与命令组要求确认，管道各段逐个检查，处理多 cd、cd+git、写 git 内部文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/bashCommandHelpers.ts
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 3, fingerprint 4
 */
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import {
  createPermissionRequestMessage,
  findSafetyCheckReason,
} from "../../utils/permissions/permissions.js";
import { BashTool } from "./BashTool.js";
import { splitCommand } from "../../utils/bash/commands.js";
import { extractWriteTargets } from "./pathValidation.js";
import { getCwd } from "../../utils/cwd.js";
import { commandWritesToGitInternalPaths } from "./readOnlyValidation.js";
import { ParsedCommand, buildParsedCommandFromRoot } from "../../utils/bash/ParsedCommand.js";
import { PARSE_ABORTED } from "../../utils/bash/parser.js";
import { isBypassImmuneCircuitBreaker, isClassifierRoutedCircuitBreaker } from "../../types/permissions.js";

//@ chunk-5xgkngpb.js:1154508-1154566 placement
/**
 * 读取 tengu_moonlit_kettle 开关：管道分段权限检查时，是否额外核对去掉输出重定向后的原命令。
 */
function shouldDedupeSubcommandRules() {
  return readFlagWithOverride("tengu_moonlit_kettle", {
    safe: true,
  });
}
//@ chunk-5xgkngpb.js:1154566-1154682 placement
/**
 * 给重复的键加 " #2"、" #3" 后缀，返回键唯一的新 Map。
 */
function dedupeMapKeys(entries) {
  let result = new Map();
  for (let [key, value] of entries) {
    let uniqueKey = key;
    for (let idx = 2; result.has(uniqueKey); idx++) uniqueKey = `${key} #${idx}`;
    result.set(uniqueKey, value);
  }
  return result;
}
//@ chunk-5xgkngpb.js:1154682-1157612 fingerprint (2.1.88 match: segmentedCommandPermissionResult, 0.623)
/**
 * 管道分段的权限合成：逐段（去掉输出重定向后）检查，任一 deny 即拒；多个 cd、cd+git 组合、创建 git 内部文件再运行 git 都要求确认；全部 allow 才放行，否则 ask 并合并建议规则。
 */
async function segmentedCommandPermissionResult(
  input,
  segments,
  pipeSegments,
  bashToolHasPermission,
  checkers,
  commands,
  isCdGitCompoundApproved,
  findExtraAsk,
) {
  let decisions = new Map();
  let dedupeEntries = [];
  let shouldDedupe = shouldDedupeSubcommandRules();
  for (let idx = 0; idx < segments.length; idx++) {
    let trimmed = segments[idx].trim();
    if (!trimmed) {
      let pipeSegment = pipeSegments[idx];
      let decision = await bashToolHasPermission({
        ...input,
        command: pipeSegment,
      });
      let segmentDecision =
        decision.behavior === "passthrough"
          ? {
              behavior: "allow",
              updatedInput: {
                ...input,
                command: pipeSegment,
              },
              decisionReason: {
                type: "other",
                reason: "Bare output redirection with no command; path layer approved",
              },
            }
          : decision;
      decisions.set(pipeSegment, segmentDecision);
      dedupeEntries.push([pipeSegment, segmentDecision]);
      continue;
    }
    let decision = await bashToolHasPermission({
      ...input,
      command: trimmed,
    });
    decisions.set(trimmed, decision);
    let trimmed_2 = pipeSegments[idx].trim();
    let segmentDecision = decision;
    if (
      shouldDedupe &&
      trimmed_2 !== trimmed &&
      decision.behavior === "allow" &&
      isAllRuleReason(decision.decisionReason)
    ) {
      let withoutRedirection = await bashToolHasPermission({
        ...input,
        command: trimmed_2,
      });
      segmentDecision =
        withoutRedirection.behavior === "allow"
          ? withoutRedirection
          : {
              ...decision,
              decisionReason: {
                type: "subcommandResults",
                reasons: new Map([
                  [trimmed, decision],
                  [
                    trimmed_2,
                    {
                      behavior: "allow",
                      updatedInput: decision.updatedInput,
                      decisionReason: {
                        type: "other",
                        reason:
                          "Allowed by a permission rule only with its output redirection removed; not allowed as written",
                      },
                    },
                  ],
                ]),
              },
            };
    }
    dedupeEntries.push([trimmed_2, segmentDecision]);
  }
  let found = Array.from(decisions.entries()).find(
    ([, segmentDecision]) => segmentDecision.behavior === "deny",
  );
  if (found) {
    let [deniedCommand, deniedDecision] = found;
    return {
      behavior: "deny",
      message:
        deniedDecision.behavior === "deny"
          ? deniedDecision.message
          : `Permission denied for: ${deniedCommand}`,
      decisionReason: {
        type: "subcommandResults",
        reasons: decisions,
      },
    };
  }
  let findAsk = () =>
    findCircuitBreakerAsk(decisions.values(), true) ??
    findExtraAsk?.() ??
    findCircuitBreakerAsk(decisions.values());
  if (
    segments.filter((segment) => {
      let trimmed = segment.trim();
      return checkers.isNormalizedCdCommand(trimmed);
    }).length > 1
  ) {
    let askDecision = findAsk();
    if (askDecision) return askDecision;
    let decisionReason = {
      type: "other",
      reason: "Multiple directory changes in one command require approval for clarity",
      bashMissKind: "multi-cd",
    };
    return {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
    };
  }
  {
    let hasCd;
    let hasGit;
    if (commands) {
      hasCd = commands.some((command) => checkers.isNormalizedCdCommand(command.text));
      hasGit = commands.some((command) => checkers.isNormalizedGitCommand(command.text));
    } else {
      hasCd = false;
      hasGit = false;
      for (let segment of segments)
        for (let subcommand of splitCommand(segment)) {
          let trimmed = subcommand.trim();
          if (checkers.isNormalizedCdCommand(trimmed)) hasCd = true;
          if (checkers.isNormalizedGitCommand(trimmed)) hasGit = true;
        }
    }
    if (
      hasGit &&
      (commands ? extractWriteTargets(commands, getCwd()) : commandWritesToGitInternalPaths(input.command))
    ) {
      let askDecision = findAsk();
      if (askDecision) return askDecision;
      let decisionReason = {
        type: "other",
        reason:
          "This command creates git repository structure files (HEAD/objects/refs/hooks) and then runs git, which can execute hooks/fsmonitor from the created files.",
        bashMissKind: "cd-git-compound",
      };
      return {
        behavior: "ask",
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
      };
    }
    if (hasCd && hasGit) {
      let subcommands = [];
      for (let segment of segments)
        for (let subcommand of splitCommand(segment)) subcommands.push(subcommand.trim());
      if (!(isCdGitCompoundApproved ? await isCdGitCompoundApproved(subcommands) : false)) {
        let askDecision = findAsk();
        if (askDecision) return askDecision;
        let decisionReason = {
          type: "other",
          reason:
            "This command changes directory before running a version-control command, which can pick up untrusted hooks or repository configuration from the target directory. Approve only if you trust it.",
          bashMissKind: "cd-git-compound",
        };
        return {
          behavior: "ask",
          decisionReason,
          message: createPermissionRequestMessage(BashTool.name, decisionReason),
        };
      }
    }
  }
  if (Array.from(decisions.values()).every((result) => result.behavior === "allow"))
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "subcommandResults",
        reasons: shouldDedupe ? dedupeMapKeys(dedupeEntries) : decisions,
      },
    };
  let suggestions = [];
  for (let [, result] of decisions)
    if (result.behavior !== "allow" && "suggestions" in result && result.suggestions)
      suggestions.push(...result.suggestions);
  let decisionReason = {
    type: "subcommandResults",
    reasons: decisions,
  };
  return {
    behavior: "ask",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
//@ chunk-5xgkngpb.js:1157612-1157722 fingerprint (2.1.88 match: buildSegmentWithoutRedirections, 1)
async function buildSegmentWithoutRedirections(segmentCommand) {
  if (!segmentCommand.includes(">")) return segmentCommand;
  return (await ParsedCommand.parse(segmentCommand))?.withoutOutputRedirections() ?? segmentCommand;
}
//@ chunk-5xgkngpb.js:1157722-1157913 fingerprint (2.1.88 match: checkCommandOperatorPermissions, 1)
/**
 * 解析命令（可复用已有 tree-sitter 根），有子 shell/命令组直接 ask；有管道则按段走 segmentedCommandPermissionResult，否则 passthrough。
 */
async function checkCommandOperatorPermissions(
  input,
  bashToolHasPermissionFn,
  checkers,
  astRoot,
  commands,
  isCdGitCompoundApproved,
  findExtraAsk,
) {
  let parsed =
    astRoot && astRoot !== PARSE_ABORTED
      ? buildParsedCommandFromRoot(input.command, astRoot)
      : await ParsedCommand.parse(input.command);
  if (!parsed)
    return {
      behavior: "passthrough",
      message: "Failed to parse command",
    };
  return bashToolCheckCommandOperatorPermissions(
    input,
    bashToolHasPermissionFn,
    checkers,
    parsed,
    commands,
    isCdGitCompoundApproved,
    findExtraAsk,
  );
}
//@ chunk-5xgkngpb.js:1157913-1158405 fingerprint (2.1.88 match: bashToolCheckCommandOperatorPermissions, 0.838)
async function bashToolCheckCommandOperatorPermissions(
  input,
  bashToolHasPermission,
  checkers,
  parsed,
  commands,
  isCdGitCompoundApproved,
  findExtraAsk,
) {
  let { compoundStructure } = parsed.treeSitterAnalysis;
  if (compoundStructure.hasSubshell || compoundStructure.hasCommandGroup) {
    let decisionReason = {
      type: "other",
      reason: "This command uses shell operators that require approval for safety",
      bashMissKind: "shell-operators",
    };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
      decisionReason,
    };
  }
  let pipeSegments = parsed.getPipeSegments();
  if (pipeSegments.length <= 1)
    return {
      behavior: "passthrough",
      message: "No pipes found in command",
    };
  let segments = await Promise.all(pipeSegments.map((segment) => buildSegmentWithoutRedirections(segment)));
  return segmentedCommandPermissionResult(
    input,
    segments,
    pipeSegments,
    bashToolHasPermission,
    checkers,
    commands,
    isCdGitCompoundApproved,
    findExtraAsk,
  );
}
//@ chunk-5xgkngpb.js:1158405-1158542 placement
/**
 * 在权限结果中找出第一个由不可绕过的安全熔断引起的 ask（可排除由分类器处理的熔断）。
 */
function findCircuitBreakerAsk(subcommandPermissionDecisions, skipClassifierRouted = false) {
  let isCircuitBreaker = (reason) =>
    isBypassImmuneCircuitBreaker(reason) &&
    (!skipClassifierRouted || !isClassifierRoutedCircuitBreaker(reason));
  for (let decision of subcommandPermissionDecisions)
    if (
      decision.behavior === "ask" &&
      findSafetyCheckReason(decision.decisionReason, isCircuitBreaker) !== undefined
    )
      return decision;
  return;
}
export { dedupeMapKeys, checkCommandOperatorPermissions, shouldDedupeSubcommandRules, findCircuitBreakerAsk };
