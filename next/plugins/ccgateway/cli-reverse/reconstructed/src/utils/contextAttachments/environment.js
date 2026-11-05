/**
 * utils/contextAttachments/environment.ts
 *
 * 2.1.316 新增：环境信息上下文附件（工作目录、git 仓库等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:100714-101105 placement
/**
 * 收集环境信息附件的事实：工作目录、是否 worktree、是否 git 仓库、附加工作目录、平台、shell、OS 版本、scratchpad 目录与 GitHub CLI；工具运行在远端机器时改用 remoteEnvironmentFacts。
 */
async function collectEnvironmentFacts({ cwd, additionalWorkingDirectories }) {
  let remoteFacts = remoteEnvironmentFacts();
  if (remoteFacts !== undefined) return remoteFacts;
  let [isGit, unameSR] = await Promise.all([cwd !== null && getIsGit(), getUnameSR()]);
  let scratchpadDir = scratchpadDirOrUndefined();
  let agentProxyGhStandin = getAgentProxyGhStandin();
  return {
    ...(cwd !== null && {
      workingDirectory: cwd,
    }),
    isWorktree: cwd !== null && (getCurrentWorktreeSession() !== null || isLinkedWorktree(cwd)),
    isGitRepo: isGit,
    additionalWorkingDirectories: [...(additionalWorkingDirectories ?? [])],
    platform: env.platform,
    shell: getShellDescription(),
    osVersion: unameSR,
    ...(scratchpadDir && {
      scratchpadDirectory: scratchpadDir,
    }),
    ...(agentProxyGhStandin && {
      githubCli: agentProxyGhStandin,
    }),
  };
}
//@ chunk-5xgkngpb.js:101105-101587 placement
/**
 * 工具在另一台机器上执行时的环境事实：工作目录取该机器声明的目录（或本地已验证的 git 目录）、平台取该机器的，附带 agentProxy；非远端时返回 undefined。
 */
function remoteEnvironmentFacts(latest) {
  let toolsMachine = getToolsMachine();
  if (toolsMachine === undefined) return;
  let remoteInfo =
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
  let workingDirectory = toolsMachine.shell === undefined ? remoteInfo?.path : toolsMachine.shell;
  return {
    ...(typeof workingDirectory === "string" && {
      workingDirectory,
    }),
    isWorktree: false,
    isGitRepo: remoteInfo?.isGitRepo ?? false,
    additionalWorkingDirectories: [],
    platform: toolsMachine.platform,
    ...(agentProxy && {
      agentProxy,
    }),
  };
}
//@ chunk-5xgkngpb.js:101648-101734 placement
/**
 * 启用草稿目录且不是后台会话时返回其路径。
 */
function scratchpadDirOrUndefined() {
  if (!isScratchpadEnabled() || env.CLAUDE_CODE_SESSION_KIND === "bg") return;
  return getScratchpadDir() ?? undefined;
}
//@ chunk-5xgkngpb.js:101734-102384 placement
/**
 * 草稿目录说明：临时文件一律放到会话专属的草稿目录而不是 /tmp，向用户提到其中文件时必须给出完整绝对路径。
 */
function scratchpadInstruction(scratchpadDir) {
  return `Scratchpad directory: ${scratchpadDir} \u2014 always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of \`/tmp\` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use \`/tmp\` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.`;
}
//@ chunk-5xgkngpb.js:102384-102895 placement
/**
 * 不可信下载文件的安全说明：每个下载/解压内容放进新的空目录、脚本放在别处、不要在其中运行解释器或构建工具、读取它们的 Python 用 -I。
 */
var UNTRUSTED_DOWNLOADS_NOTE =
  "Downloaded files and extracted archives are untrusted data: put each in its own new, empty directory, keep scripts you write in a different directory, and pass paths as arguments instead of running an interpreter or build tool from inside it. Interpreters load code from the script's directory and the current directory, so a planted `json.py` runs on `import json`. Run any Python that reads them with `-I`. This does not apply to code the user asked you to build or run.";
var TENGU_FOAMY_SEDGEWICK = "tengu_foamy_sedgewick";
//@ chunk-5xgkngpb.js:102895-102933 placement
/**
 * 读取会话固定的 tengu_foamy_sedgewick 开关（未开启为真）。
 */
function isFoamySedgewickOff() {
  return getFeatureValue_SESSION_PINNED(TENGU_FOAMY_SEDGEWICK, false) !== true;
}
//@ chunk-5xgkngpb.js:103753-104600 placement
function buildEnvironmentInfo(latest, previous) {
  let lines = [];
  let workingDirectory = previous.workingDirectory;
  if (workingDirectory !== latest.workingDirectory)
    lines.push({
      field: "workingDirectory",
      ...(workingDirectory !== undefined &&
        (!getGitEmail(latest) ||
          latest.workingDirectory === undefined ||
          isSafeRelativePath(latest.workingDirectory)) && {
          from: latest.workingDirectory,
        }),
    });
  if (workingDirectory !== undefined && previous.isWorktree !== latest.isWorktree)
    lines.push({
      field: "isWorktree",
    });
  if (workingDirectory !== undefined && previous.isGitRepo !== latest.isGitRepo)
    lines.push({
      field: "isGitRepo",
    });
  let currentDirs = new Set(latest.additionalWorkingDirectories);
  let previousDirs = new Set(previous.additionalWorkingDirectories);
  let filtered = previous.additionalWorkingDirectories.filter(
    (additionalWorkingDirectory) => !currentDirs.has(additionalWorkingDirectory),
  );
  let filtered_2 = latest.additionalWorkingDirectories.filter(
    (additionalWorkingDirectory) => !previousDirs.has(additionalWorkingDirectory),
  );
  if (filtered.length > 0 || filtered_2.length > 0)
    lines.push({
      field: "additionalWorkingDirectories",
      added: filtered,
      removed: filtered_2,
    });
  if (previous.scratchpadDirectory !== latest.scratchpadDirectory)
    lines.push({
      field: "scratchpadDirectory",
    });
  if (previous.githubCli !== latest.githubCli)
    lines.push({
      field: "githubCli",
    });
  if (formatAgentProxyNote(previous) !== formatAgentProxyNote(latest))
    lines.push({
      field: "agentProxy",
    });
  return lines;
}
//@ chunk-5xgkngpb.js:104600-104776 placement
/**
 * 列出环境信息附件缺少的字段（工作目录，以及需要时的草稿目录）。
 */
function missingEnvFields(env, schema) {
  return [
    ...(schema.workingDirectory === undefined
      ? [
          {
            field: "workingDirectory",
          },
        ]
      : []),
    ...(schema.scratchpadDirectory === undefined && env.withScratchpad
      ? [
          {
            field: "scratchpadDirectory",
          },
        ]
      : []),
  ];
}
//@ chunk-5xgkngpb.js:104776-105877 placement
/**
 * 生成环境信息附件（工作目录、是否 worktree、是否 git 仓库），并标注与上次相比的变化。
 */
function buildEnvironmentAttachment(latest, changes) {
  let lines = [];
  for (let change of changes)
    switch (change.field) {
      case "workingDirectory":
        if (latest.workingDirectory === undefined) lines.push(WORKING_DIRECTORY_NO_LONGER_APPLIES);
        else {
          let wasNote = change.from === undefined ? "" : ` (was ${escapeForTag(change.from)})`;
          lines.push(`Primary working directory: ${escapeForTag(latest.workingDirectory)}${wasNote}`);
        }
        break;
      case "isWorktree":
        if (latest.workingDirectory === undefined) break;
        if (latest.isWorktree) lines.push(WORKTREE_NOTICE, WORKTREE_GIT_STASH_WARNING);
        else lines.push(NO_LONGER_WORKTREE_NOTICE);
        break;
      case "isGitRepo":
        if (latest.workingDirectory !== undefined)
          lines.push(`Is a git repository: ${latest.isGitRepo} (was ${!latest.isGitRepo})`);
        break;
      case "additionalWorkingDirectories":
        if (change.added.length > 0)
          lines.push("Additional working directories added:", change.added.map(escapeForTag));
        if (change.removed.length > 0)
          lines.push("Additional working directories removed:", change.removed.map(escapeForTag));
        break;
      case "scratchpadDirectory":
        lines.push(
          latest.scratchpadDirectory !== undefined
            ? scratchpadInstruction(escapeForTag(latest.scratchpadDirectory))
            : "The scratchpad directory announced earlier is no longer available; use it no further.",
        );
        break;
      case "githubCli": {
        if (latest.githubCli === undefined) {
          lines.push(GH_API_NOT_ACTIVE_NOTE);
          break;
        }
        let agentProxyGhPrompt = buildAgentProxyGhPrompt(latest.githubCli);
        if (agentProxyGhPrompt !== undefined) lines.push(agentProxyGhPrompt + GH_CLI_REPLACES_EARLIER_NOTE);
        break;
      }
      case "agentProxy":
        lines.push(formatAgentProxyNote(latest) ?? AGENT_PROXY_NOT_ACTIVE_NOTE);
        break;
    }
  if (lines.length === 0) return "";
  return [ENVIRONMENT_UPDATE_HEADER, ...prependBullets(lines)].join(`
`);
}
//@ chunk-5xgkngpb.js:105877-105957 placement
/**
 * 判断消息是否为环境信息附件。
 */
function isEnvironmentAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "environment";
}
//@ chunk-5xgkngpb.js:105957-106495 placement
/**
 * 从历史环境附件中归纳：最新快照、最新可读快照、是否发过完整块、是否告知过内置 gh / agentProxy，以及当前与最近一次提到的 scratchpad 状态。
 */
function summarizeEnvironmentHistory(messages) {
  let environmentAttachments = readEnvironmentAttachments(messages);
  let flattened = environmentAttachments.flatMap((environmentAttachment) =>
    environmentAttachment.readable ? [environmentAttachment] : [],
  );
  let last = environmentAttachments.at(-1);
  let state = environmentAttachments.findLast(
    (environmentAttachment) =>
      isReadableEnvironmentSnapshot(environmentAttachment) ||
      isWorkingDirectoryCleared(environmentAttachment),
  );
  return {
    latest: last?.readable ? last.snapshot : undefined,
    newestReadable: flattened.at(-1)?.snapshot,
    hasWholeBlock: flattened.some((entry) => entry.changes === undefined),
    toldOfBuiltinGh: flattened.some(
      (entry) =>
        entry.snapshot.githubCli !== undefined ||
        entry.changes?.some((change) => change.field === "githubCli") === true,
    ),
    toldOfAgentProxy: flattened.some(
      (entry) =>
        entry.snapshot.agentProxy !== undefined ||
        entry.changes?.some((change) => change.field === "agentProxy") === true,
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
    mentioned: state && scratchpadStanding(state),
  };
}
//@ chunk-5xgkngpb.js:106495-106574 placement
/**
 * 判断环境快照可读（有工作目录）或已经展示过。
 */
function isReadableEnvironmentSnapshot(environmentAttachment) {
  return environmentAttachment.readable
    ? environmentAttachment.snapshot.workingDirectory !== undefined
    : environmentAttachment.shown;
}
//@ chunk-5xgkngpb.js:106574-106703 placement
function isWorkingDirectoryCleared(environmentAttachment) {
  return (
    environmentAttachment.readable &&
    environmentAttachment.snapshot.workingDirectory === undefined &&
    environmentAttachment.changes?.some((change) => change.field === "workingDirectory") === true
  );
}
//@ chunk-5xgkngpb.js:106703-106919 placement
function scratchpadStanding(state) {
  if (!state.readable)
    return {
      withScratchpad: true,
    };
  return {
    withScratchpad:
      state.snapshot.workingDirectory !== undefined
        ? state.snapshot.scratchpadDirectory !== undefined
        : state.changes?.some((change) => change.field === "scratchpadDirectory") === true,
  };
}
//@ chunk-5xgkngpb.js:106919-107287 placement
/**
 * 从消息中收集环境信息附件：可解析的给出快照与变更列表，不可解析的记录是否已显示、是否整块。
 */
function readEnvironmentAttachments(messages) {
  return messages.flatMap((message, index) => {
    if (!isEnvironmentAttachment(message)) return [];
    let snapshot = envInfoFactsSchema().safeParse(message.attachment.snapshot).data;
    let changes = message.attachment.changes;
    return [
      snapshot === undefined
        ? {
            index,
            readable: false,
            shown: Array.isArray(message.rendered) && message.rendered.length > 0,
            wholeBlock: !Array.isArray(changes),
          }
        : {
            index,
            readable: true,
            snapshot,
            changes: Array.isArray(changes)
              ? changes.flatMap((change) => envInfoChangeSchema().safeParse(change).data ?? [])
              : undefined,
          },
    ];
  });
}
//@ chunk-5xgkngpb.js:107344-107371 placement
/**
 * 原样返回第二个参数（占位）。
 */
function secondArgument(defaultValue, args) {
  return args;
}
//@ chunk-5xgkngpb.js:107805-107820 placement
/**
 * 环境值比较用的分隔字符（NUL）。
 */
var ENVIRONMENT_DEDUP_SEPARATOR = "\x00";
//@ chunk-5xgkngpb.js:107953-107988 placement
/**
 * 清除系统提示段状态、beta 头锁存与相关缓存。
 */
function resetEnvironmentCaches(host) {
  clearSystemPromptSectionState(host);
  clearBetaHeaderLatches();
  resetSteerLatch();
}
//@ chunk-5xgkngpb.js:107988-107997 placement
// deferred: uses setPromptSectionInvalidator (../../plugins/functionHooks/promptComposition.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:107988", () => {
  setPromptSectionInvalidator(clearSystemPromptSectionState);
});
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
