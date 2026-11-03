/**
 * utils/contextAttachments/environment.ts
 *
 * 2.1.316 新增：环境信息上下文附件（工作目录、git 仓库等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { getIsGit, isLinkedWorktree } from "../git.js";
import {
  getUnameSR,
  getShellDescription,
  formatAgentProxyNote,
  WORKING_DIRECTORY_NO_LONGER_APPLIES,
  WORKTREE_NOTICE,
  WORKTREE_GIT_STASH_WARNING,
  NO_LONGER_WORKTREE_NOTICE,
  GH_API_NOT_ACTIVE_NOTE,
  GH_CLI_REPLACES_EARLIER_NOTE,
  AGENT_PROXY_NOT_ACTIVE_NOTE,
  ENVIRONMENT_UPDATE_HEADER,
  prependBullets,
  envInfoFactsSchema,
  envInfoChangeSchema,
} from "../../constants/prompts.js";
import { getAgentProxyGhStandin, buildAgentProxyGhPrompt } from "../../constants/agentProxyPrompt.js";
import { getCurrentWorktreeSession } from "../worktree.js";
import { env } from "../env.js";
import {
  getToolsMachine,
  clearSystemPromptSectionState,
  clearBetaHeaderLatches,
} from "../../bootstrap/state.js";
import { getGitEmail } from "../user.js";
import { isSafeRelativePath, escapeForTag } from "../sanitization.js";
import { isScratchpadEnabled, getScratchpadDir } from "../permissions/filesystem.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { resetSteerLatch } from "../model/subagentSteer.js";
import { setPromptSectionInvalidator } from "../../plugins/functionHooks/promptComposition.js";

//@ chunk-e6aww6q8.js:97909-98300 placement
/**
 * 收集环境信息附件的事实：工作目录、是否 worktree、是否 git 仓库、附加工作目录、平台、shell、OS 版本、scratchpad 目录与 GitHub CLI；工具运行在远端机器时改用 remoteEnvironmentFacts。
 */
async function collectEnvironmentFacts({ cwd, additionalWorkingDirectories }) {
  let r = remoteEnvironmentFacts();
  if (r !== undefined) return r;
  let [s, unameSR] = await Promise.all([cwd !== null && getIsGit(), getUnameSR()]);
  let y = scratchpadDirOrUndefined();
  let agentProxyGhStandin = getAgentProxyGhStandin();
  return {
    ...(cwd !== null && {
      workingDirectory: cwd,
    }),
    isWorktree: cwd !== null && (getCurrentWorktreeSession() !== null || isLinkedWorktree(cwd)),
    isGitRepo: s,
    additionalWorkingDirectories: [...(additionalWorkingDirectories ?? [])],
    platform: env.platform,
    shell: getShellDescription(),
    osVersion: unameSR,
    ...(y && {
      scratchpadDirectory: y,
    }),
    ...(agentProxyGhStandin && {
      githubCli: agentProxyGhStandin,
    }),
  };
}
//@ chunk-e6aww6q8.js:98300-98782 placement
/**
 * 工具在另一台机器上执行时的环境事实：工作目录取该机器声明的目录（或本地已验证的 git 目录）、平台取该机器的，附带 agentProxy；非远端时返回 undefined。
 */
function remoteEnvironmentFacts(latest) {
  let toolsMachine = getToolsMachine();
  if (toolsMachine === undefined) return;
  let r =
    !toolsMachine.said &&
    latest !== undefined &&
    getGitEmail(latest) &&
    latest.workingDirectory !== undefined &&
    isSafeRelativePath(latest.workingDirectory) &&
    latest.workingDirectory !== toolsMachine.unvouched
      ? {
          path: latest.workingDirectory,
          isGitRepo: latest.isGitRepo,
        }
      : toolsMachine.directory;
  let agentProxy = toolsMachine.agentProxy === undefined ? latest?.agentProxy : toolsMachine.agentProxy;
  let h = toolsMachine.shell === undefined ? r?.path : toolsMachine.shell;
  return {
    ...(typeof h === "string" && {
      workingDirectory: h,
    }),
    isWorktree: false,
    isGitRepo: r?.isGitRepo ?? false,
    additionalWorkingDirectories: [],
    platform: toolsMachine.platform,
    ...(agentProxy && {
      agentProxy,
    }),
  };
}
//@ chunk-e6aww6q8.js:98843-98929 placement
/**
 * 启用草稿目录且不是后台会话时返回其路径。
 */
function scratchpadDirOrUndefined() {
  if (!isScratchpadEnabled() || env.CLAUDE_CODE_SESSION_KIND === "bg") return;
  return getScratchpadDir() ?? undefined;
}
//@ chunk-e6aww6q8.js:98929-99579 placement
/**
 * 草稿目录说明：临时文件一律放到会话专属的草稿目录而不是 /tmp，向用户提到其中文件时必须给出完整绝对路径。
 */
function scratchpadInstruction(scratchpadDir) {
  return `Scratchpad directory: ${scratchpadDir} \u2014 always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of \`/tmp\` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use \`/tmp\` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.`;
}
//@ chunk-e6aww6q8.js:99579-100090 placement
/**
 * 不可信下载文件的安全说明：每个下载/解压内容放进新的空目录、脚本放在别处、不要在其中运行解释器或构建工具、读取它们的 Python 用 -I。
 */
var UNTRUSTED_DOWNLOADS_NOTE =
  "Downloaded files and extracted archives are untrusted data: put each in its own new, empty directory, keep scripts you write in a different directory, and pass paths as arguments instead of running an interpreter or build tool from inside it. Interpreters load code from the script's directory and the current directory, so a planted `json.py` runs on `import json`. Run any Python that reads them with `-I`. This does not apply to code the user asked you to build or run.";
var TENGU_FOAMY_SEDGEWICK = "tengu_foamy_sedgewick";
//@ chunk-e6aww6q8.js:100090-100128 placement
/**
 * 读取会话固定的 tengu_foamy_sedgewick 开关（未开启为真）。
 */
function isFoamySedgewickOff() {
  return getFeatureValue_SESSION_PINNED(TENGU_FOAMY_SEDGEWICK, false) !== true;
}
//@ chunk-e6aww6q8.js:100948-101795 placement
function buildEnvironmentInfo(latest, n) {
  let r = [];
  let workingDirectory = n.workingDirectory;
  if (workingDirectory !== latest.workingDirectory)
    r.push({
      field: "workingDirectory",
      ...(workingDirectory !== undefined &&
        (!getGitEmail(latest) ||
          latest.workingDirectory === undefined ||
          isSafeRelativePath(latest.workingDirectory)) && {
          from: latest.workingDirectory,
        }),
    });
  if (workingDirectory !== undefined && n.isWorktree !== latest.isWorktree)
    r.push({
      field: "isWorktree",
    });
  if (workingDirectory !== undefined && n.isGitRepo !== latest.isGitRepo)
    r.push({
      field: "isGitRepo",
    });
  let h = new Set(latest.additionalWorkingDirectories);
  let y = new Set(n.additionalWorkingDirectories);
  let filtered = n.additionalWorkingDirectories.filter(
    (additionalWorkingDirectory) => !h.has(additionalWorkingDirectory),
  );
  let filtered_2 = latest.additionalWorkingDirectories.filter(
    (additionalWorkingDirectory) => !y.has(additionalWorkingDirectory),
  );
  if (filtered.length > 0 || filtered_2.length > 0)
    r.push({
      field: "additionalWorkingDirectories",
      added: filtered,
      removed: filtered_2,
    });
  if (n.scratchpadDirectory !== latest.scratchpadDirectory)
    r.push({
      field: "scratchpadDirectory",
    });
  if (n.githubCli !== latest.githubCli)
    r.push({
      field: "githubCli",
    });
  if (formatAgentProxyNote(n) !== formatAgentProxyNote(latest))
    r.push({
      field: "agentProxy",
    });
  return r;
}
//@ chunk-e6aww6q8.js:101795-101971 placement
/**
 * 列出环境信息附件缺少的字段（工作目录，以及需要时的草稿目录）。
 */
function missingEnvFields(e, n) {
  return [
    ...(n.workingDirectory === undefined
      ? [
          {
            field: "workingDirectory",
          },
        ]
      : []),
    ...(n.scratchpadDirectory === undefined && e.withScratchpad
      ? [
          {
            field: "scratchpadDirectory",
          },
        ]
      : []),
  ];
}
//@ chunk-e6aww6q8.js:101971-103072 placement
/**
 * 生成环境信息附件（工作目录、是否 worktree、是否 git 仓库），并标注与上次相比的变化。
 */
function buildEnvironmentAttachment(e, n) {
  let r = [];
  for (let s of n)
    switch (s.field) {
      case "workingDirectory":
        if (e.workingDirectory === undefined) r.push(WORKING_DIRECTORY_NO_LONGER_APPLIES);
        else {
          let h = s.from === undefined ? "" : ` (was ${escapeForTag(s.from)})`;
          r.push(`Primary working directory: ${escapeForTag(e.workingDirectory)}${h}`);
        }
        break;
      case "isWorktree":
        if (e.workingDirectory === undefined) break;
        if (e.isWorktree) r.push(WORKTREE_NOTICE, WORKTREE_GIT_STASH_WARNING);
        else r.push(NO_LONGER_WORKTREE_NOTICE);
        break;
      case "isGitRepo":
        if (e.workingDirectory !== undefined)
          r.push(`Is a git repository: ${e.isGitRepo} (was ${!e.isGitRepo})`);
        break;
      case "additionalWorkingDirectories":
        if (s.added.length > 0) r.push("Additional working directories added:", s.added.map(escapeForTag));
        if (s.removed.length > 0)
          r.push("Additional working directories removed:", s.removed.map(escapeForTag));
        break;
      case "scratchpadDirectory":
        r.push(
          e.scratchpadDirectory !== undefined
            ? scratchpadInstruction(escapeForTag(e.scratchpadDirectory))
            : "The scratchpad directory announced earlier is no longer available; use it no further.",
        );
        break;
      case "githubCli": {
        if (e.githubCli === undefined) {
          r.push(GH_API_NOT_ACTIVE_NOTE);
          break;
        }
        let agentProxyGhPrompt = buildAgentProxyGhPrompt(e.githubCli);
        if (agentProxyGhPrompt !== undefined) r.push(agentProxyGhPrompt + GH_CLI_REPLACES_EARLIER_NOTE);
        break;
      }
      case "agentProxy":
        r.push(formatAgentProxyNote(e) ?? AGENT_PROXY_NOT_ACTIVE_NOTE);
        break;
    }
  if (r.length === 0) return "";
  return [ENVIRONMENT_UPDATE_HEADER, ...prependBullets(r)].join(`
`);
}
//@ chunk-e6aww6q8.js:103072-103152 placement
/**
 * 判断消息是否为环境信息附件。
 */
function isEnvironmentAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "environment";
}
//@ chunk-e6aww6q8.js:103152-103690 placement
/**
 * 从历史环境附件中归纳：最新快照、最新可读快照、是否发过完整块、是否告知过内置 gh / agentProxy，以及当前与最近一次提到的 scratchpad 状态。
 */
function summarizeEnvironmentHistory(e) {
  let environmentAttachments = readEnvironmentAttachments(e);
  let flattened = environmentAttachments.flatMap((environmentAttachment) =>
    environmentAttachment.readable ? [environmentAttachment] : [],
  );
  let last = environmentAttachments.at(-1);
  let last_2 = environmentAttachments.findLast(
    (environmentAttachment) =>
      isReadableEnvironmentSnapshot(environmentAttachment) ||
      isWorkingDirectoryCleared(environmentAttachment),
  );
  return {
    latest: last?.readable ? last.snapshot : undefined,
    newestReadable: flattened.at(-1)?.snapshot,
    hasWholeBlock: flattened.some((y) => y.changes === undefined),
    toldOfBuiltinGh: flattened.some(
      (y) =>
        y.snapshot.githubCli !== undefined ||
        y.changes?.some((change) => change.field === "githubCli") === true,
    ),
    toldOfAgentProxy: flattened.some(
      (y) =>
        y.snapshot.agentProxy !== undefined ||
        y.changes?.some((change) => change.field === "agentProxy") === true,
    ),
    standing: environmentAttachments.reduce(
      (acc, environmentAttachment) =>
        isReadableEnvironmentSnapshot(environmentAttachment)
          ? scratchpadStanding(environmentAttachment)
          : isWorkingDirectoryCleared(environmentAttachment)
            ? undefined
            : acc,
      undefined,
    ),
    mentioned: last_2 && scratchpadStanding(last_2),
  };
}
//@ chunk-e6aww6q8.js:103690-103769 placement
/**
 * 判断环境快照可读（有工作目录）或已经展示过。
 */
function isReadableEnvironmentSnapshot(environmentAttachment) {
  return environmentAttachment.readable
    ? environmentAttachment.snapshot.workingDirectory !== undefined
    : environmentAttachment.shown;
}
//@ chunk-e6aww6q8.js:103769-103898 placement
function isWorkingDirectoryCleared(environmentAttachment) {
  return (
    environmentAttachment.readable &&
    environmentAttachment.snapshot.workingDirectory === undefined &&
    environmentAttachment.changes?.some((change) => change.field === "workingDirectory") === true
  );
}
//@ chunk-e6aww6q8.js:103898-104114 placement
function scratchpadStanding(e) {
  if (!e.readable)
    return {
      withScratchpad: true,
    };
  return {
    withScratchpad:
      e.snapshot.workingDirectory !== undefined
        ? e.snapshot.scratchpadDirectory !== undefined
        : e.changes?.some((change) => change.field === "scratchpadDirectory") === true,
  };
}
//@ chunk-e6aww6q8.js:104114-104482 placement
/**
 * 从消息中收集环境信息附件：可解析的给出快照与变更列表，不可解析的记录是否已显示、是否整块。
 */
function readEnvironmentAttachments(e) {
  return e.flatMap((n, index) => {
    if (!isEnvironmentAttachment(n)) return [];
    let s = envInfoFactsSchema().safeParse(n.attachment.snapshot).data;
    let changes = n.attachment.changes;
    return [
      s === undefined
        ? {
            index,
            readable: false,
            shown: Array.isArray(n.rendered) && n.rendered.length > 0,
            wholeBlock: !Array.isArray(changes),
          }
        : {
            index,
            readable: true,
            snapshot: s,
            changes: Array.isArray(changes)
              ? changes.flatMap((change) => envInfoChangeSchema().safeParse(change).data ?? [])
              : undefined,
          },
    ];
  });
}
//@ chunk-e6aww6q8.js:104539-104566 placement
/**
 * 原样返回第二个参数（占位）。
 */
function secondArgument(e, n) {
  return n;
}
//@ chunk-e6aww6q8.js:105000-105015 placement
/**
 * 环境值比较用的分隔字符（NUL）。
 */
var ENVIRONMENT_DEDUP_SEPARATOR = "\x00";
//@ chunk-e6aww6q8.js:105148-105182 placement
/**
 * 清除系统提示段状态、beta 头锁存与相关缓存。
 */
function resetEnvironmentCaches(e) {
  clearSystemPromptSectionState(e);
  clearBetaHeaderLatches();
  resetSteerLatch();
}
//@ chunk-e6aww6q8.js:105182-105191 placement
setPromptSectionInvalidator(clearSystemPromptSectionState);
export {
  scratchpadInstruction,
  isFoamySedgewickOff,
  UNTRUSTED_DOWNLOADS_NOTE,
  buildEnvironmentAttachment,
  resetEnvironmentCaches,
  secondArgument,
  ENVIRONMENT_DEDUP_SEPARATOR,
  collectEnvironmentFacts,
  summarizeEnvironmentHistory,
  remoteEnvironmentFacts,
  missingEnvFields,
  buildEnvironmentInfo,
};
