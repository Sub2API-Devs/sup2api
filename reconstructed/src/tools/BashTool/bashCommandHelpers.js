/**
 * tools/BashTool/bashCommandHelpers.ts
 *
 * 管道/操作符分段的权限合成：子 shell 与命令组要求确认，管道各段逐个检查，处理多 cd、cd+git、写 git 内部文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/bashCommandHelpers.ts
 * pieces: chunk-e6aww6q8.js (7)
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

//@ chunk-e6aww6q8.js:1159153-1159211 placement
function uQ() {
  return readFlagWithOverride("tengu_moonlit_kettle", { safe: !0 });
}
/**
 * 给重复的键加 " #2"、" #3" 后缀，返回键唯一的新 Map。
 */
//@ chunk-e6aww6q8.js:1159211-1159327 placement
function dedupeMapKeys(e) {
  let n = new Map();
  for (let [r, s] of e) {
    let h = r;
    for (let y = 2; n.has(h); y++) h = `${r} #${y}`;
    n.set(h, s);
  }
  return n;
}
/**
 * 管道分段的权限合成：逐段（去掉输出重定向后）检查，任一 deny 即拒；多个 cd、cd+git 组合、创建 git 内部文件再运行 git 都要求确认；全部 allow 才放行，否则 ask 并合并建议规则。
 */
//@ chunk-e6aww6q8.js:1159327-1162254 fingerprint = segmentedCommandPermissionResult (0.634)
async function segmentedCommandPermissionResult(e, n, r, s, h, y, S, w) {
  let L = new Map(),
    G = [],
    q = uQ();
  for (let Ie = 0; Ie < n.length; Ie++) {
    let trimmed = n[Ie].trim();
    if (!trimmed) {
      let Je = r[Ie],
        nt = await s({ ...e, command: Je }),
        pt =
          nt.behavior === "passthrough"
            ? {
                behavior: "allow",
                updatedInput: { ...e, command: Je },
                decisionReason: {
                  type: "other",
                  reason: "Bare output redirection with no command; path layer approved",
                },
              }
            : nt;
      (L.set(Je, pt), G.push([Je, pt]));
      continue;
    }
    let We = await s({ ...e, command: trimmed });
    L.set(trimmed, We);
    let trimmed_2 = r[Ie].trim(),
      lt = We;
    if (q && trimmed_2 !== trimmed && We.behavior === "allow" && isAllRuleReason(We.decisionReason)) {
      let Je = await s({ ...e, command: trimmed_2 });
      lt =
        Je.behavior === "allow"
          ? Je
          : {
              ...We,
              decisionReason: {
                type: "subcommandResults",
                reasons: new Map([
                  [trimmed, We],
                  [
                    trimmed_2,
                    {
                      behavior: "allow",
                      updatedInput: We.updatedInput,
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
    G.push([trimmed_2, lt]);
  }
  let found = Array.from(L.entries()).find(([, Ie]) => Ie.behavior === "deny");
  if (found) {
    let [Ie, Me] = found;
    return {
      behavior: "deny",
      message: Me.behavior === "deny" ? Me.message : `Permission denied for: ${Ie}`,
      decisionReason: { type: "subcommandResults", reasons: L },
    };
  }
  let Se = () => findCircuitBreakerAsk(L.values(), !0) ?? w?.() ?? findCircuitBreakerAsk(L.values());
  if (
    n.filter((segment) => {
      let trimmed = segment.trim();
      return h.isNormalizedCdCommand(trimmed);
    }).length > 1
  ) {
    let Ie = Se();
    if (Ie) return Ie;
    let Me = {
      type: "other",
      reason: "Multiple directory changes in one command require approval for clarity",
      bashMissKind: "multi-cd",
    };
    return {
      behavior: "ask",
      decisionReason: Me,
      message: createPermissionRequestMessage(BashTool.name, Me),
    };
  }
  {
    let Ie, Me;
    if (y)
      ((Ie = y.some((ze) => h.isNormalizedCdCommand(ze.text))),
        (Me = y.some((ze) => h.isNormalizedGitCommand(ze.text))));
    else {
      ((Ie = !1), (Me = !1));
      for (let segment of n)
        for (let lt of splitCommand(segment)) {
          let trimmed = lt.trim();
          if (h.isNormalizedCdCommand(trimmed)) Ie = !0;
          if (h.isNormalizedGitCommand(trimmed)) Me = !0;
        }
    }
    if (Me && (y ? extractWriteTargets(y, getCwd()) : commandWritesToGitInternalPaths(e.command))) {
      let ze = Se();
      if (ze) return ze;
      let lt = {
        type: "other",
        reason:
          "This command creates git repository structure files (HEAD/objects/refs/hooks) and then runs git, which can execute hooks/fsmonitor from the created files.",
        bashMissKind: "cd-git-compound",
      };
      return {
        behavior: "ask",
        decisionReason: lt,
        message: createPermissionRequestMessage(BashTool.name, lt),
      };
    }
    if (Ie && Me) {
      let ze = [];
      for (let segment of n) for (let nt of splitCommand(segment)) ze.push(nt.trim());
      if (!(S ? await S(ze) : !1)) {
        let Je = Se();
        if (Je) return Je;
        let nt = {
          type: "other",
          reason:
            "This command changes directory before running a version-control command, which can pick up untrusted hooks or repository configuration from the target directory. Approve only if you trust it.",
          bashMissKind: "cd-git-compound",
        };
        return {
          behavior: "ask",
          decisionReason: nt,
          message: createPermissionRequestMessage(BashTool.name, nt),
        };
      }
    }
  }
  if (Array.from(L.values()).every((result) => result.behavior === "allow"))
    return {
      behavior: "allow",
      updatedInput: e,
      decisionReason: { type: "subcommandResults", reasons: q ? dedupeMapKeys(G) : L },
    };
  let Ee = [];
  for (let [, Ie] of L)
    if (Ie.behavior !== "allow" && "suggestions" in Ie && Ie.suggestions) Ee.push(...Ie.suggestions);
  let decisionReason = { type: "subcommandResults", reasons: L };
  return {
    behavior: "ask",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason: decisionReason,
    suggestions: Ee.length > 0 ? Ee : void 0,
  };
}
//@ chunk-e6aww6q8.js:1162254-1162364 fingerprint = buildSegmentWithoutRedirections (1)
async function buildSegmentWithoutRedirections(segmentCommand) {
  if (!segmentCommand.includes(">")) return segmentCommand;
  return (await ParsedCommand.parse(segmentCommand))?.withoutOutputRedirections() ?? segmentCommand;
}
/**
 * 解析命令（可复用已有 tree-sitter 根），有子 shell/命令组直接 ask；有管道则按段走 segmentedCommandPermissionResult，否则 passthrough。
 */
//@ chunk-e6aww6q8.js:1162364-1162555 fingerprint = checkCommandOperatorPermissions (1)
async function checkCommandOperatorPermissions(e, n, r, s, h, y, S) {
  let parsed =
    s && s !== PARSE_ABORTED
      ? buildParsedCommandFromRoot(e.command, s)
      : await ParsedCommand.parse(e.command);
  if (!parsed) return { behavior: "passthrough", message: "Failed to parse command" };
  return bashToolCheckCommandOperatorPermissions(e, n, r, parsed, h, y, S);
}
//@ chunk-e6aww6q8.js:1162555-1163042 fingerprint = bashToolCheckCommandOperatorPermissions (0.845)
async function bashToolCheckCommandOperatorPermissions(e, n, r, s, h, y, S) {
  let { compoundStructure: compoundStructure } = s.treeSitterAnalysis;
  if (compoundStructure.hasSubshell || compoundStructure.hasCommandGroup) {
    let Z = {
      type: "other",
      reason: "This command uses shell operators that require approval for safety",
      bashMissKind: "shell-operators",
    };
    return { behavior: "ask", message: createPermissionRequestMessage(BashTool.name, Z), decisionReason: Z };
  }
  let pipeSegments = s.getPipeSegments();
  if (pipeSegments.length <= 1) return { behavior: "passthrough", message: "No pipes found in command" };
  let segments = await Promise.all(pipeSegments.map((segment) => buildSegmentWithoutRedirections(segment)));
  return segmentedCommandPermissionResult(e, segments, pipeSegments, n, r, h, y, S);
}
/**
 * 在权限结果中找出第一个由不可绕过的安全熔断引起的 ask（可排除由分类器处理的熔断）。
 */
//@ chunk-e6aww6q8.js:1163042-1163179 placement
function findCircuitBreakerAsk(e, n = !1) {
  let r = (s) => isBypassImmuneCircuitBreaker(s) && (!n || !isClassifierRoutedCircuitBreaker(s));
  for (let s of e)
    if (s.behavior === "ask" && findSafetyCheckReason(s.decisionReason, r) !== void 0) return s;
  return;
}

export { dedupeMapKeys, checkCommandOperatorPermissions, uQ, findCircuitBreakerAsk };
