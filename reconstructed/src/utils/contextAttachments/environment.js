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
import { J_t, buildAgentProxyGhPrompt } from "../../constants/agentProxyPrompt.js";
import { getCurrentWorktreeSession } from "../worktree.js";
import { env } from "../env.js";
import {
  getToolsMachine,
  clearSystemPromptSectionState,
  clearBetaHeaderLatches,
} from "../../bootstrap/state.js";
import { getGitEmail } from "../user.js";
import { obs, escapeForTag } from "../sanitization.js";
import { isScratchpadEnabled, getScratchpadDir } from "../permissions/filesystem.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { Yvi } from "../model/subagentSteer.js";
import { setPromptSectionInvalidator } from "../../plugins/functionHooks/promptComposition.js";

/**
 * 收集环境信息附件的事实：工作目录、是否 worktree、是否 git 仓库、附加工作目录、平台、shell、OS 版本、scratchpad 目录与 GitHub CLI；工具运行在远端机器时改用 remoteEnvironmentFacts。
 */
//@ chunk-e6aww6q8.js:97909-98300 placement
async function collectEnvironmentFacts({
  cwd: cwd,
  additionalWorkingDirectories: additionalWorkingDirectories,
}) {
  let r = remoteEnvironmentFacts();
  if (r !== void 0) return r;
  let [s, h] = await Promise.all([cwd !== null && getIsGit(), getUnameSR()]),
    y = mio(),
    S = J_t();
  return {
    ...(cwd !== null && { workingDirectory: cwd }),
    isWorktree: cwd !== null && (getCurrentWorktreeSession() !== null || isLinkedWorktree(cwd)),
    isGitRepo: s,
    additionalWorkingDirectories: [...(additionalWorkingDirectories ?? [])],
    platform: env.platform,
    shell: getShellDescription(),
    osVersion: h,
    ...(y && { scratchpadDirectory: y }),
    ...(S && { githubCli: S }),
  };
}
/**
 * 工具在另一台机器上执行时的环境事实：工作目录取该机器声明的目录（或本地已验证的 git 目录）、平台取该机器的，附带 agentProxy；非远端时返回 undefined。
 */
//@ chunk-e6aww6q8.js:98300-98782 placement
function remoteEnvironmentFacts(e) {
  let n = getToolsMachine();
  if (n === void 0) return;
  let r =
      !n.said &&
      e !== void 0 &&
      getGitEmail(e) &&
      e.workingDirectory !== void 0 &&
      obs(e.workingDirectory) &&
      e.workingDirectory !== n.unvouched
        ? { path: e.workingDirectory, isGitRepo: e.isGitRepo }
        : n.directory,
    s = n.agentProxy === void 0 ? e?.agentProxy : n.agentProxy,
    h = n.shell === void 0 ? r?.path : n.shell;
  return {
    ...(typeof h === "string" && { workingDirectory: h }),
    isWorktree: !1,
    isGitRepo: r?.isGitRepo ?? !1,
    additionalWorkingDirectories: [],
    platform: n.platform,
    ...(s && { agentProxy: s }),
  };
}
//@ chunk-e6aww6q8.js:98843-98929 placement
function mio() {
  if (!isScratchpadEnabled() || env.CLAUDE_CODE_SESSION_KIND === "bg") return;
  return getScratchpadDir() ?? void 0;
}
/**
 * 草稿目录说明：临时文件一律放到会话专属的草稿目录而不是 /tmp，向用户提到其中文件时必须给出完整绝对路径。
 */
//@ chunk-e6aww6q8.js:98929-99579 placement
function scratchpadInstruction(scratchpadDir) {
  return `Scratchpad directory: ${scratchpadDir} \u2014 always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of \`/tmp\` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use \`/tmp\` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.`;
}
/**
 * 不可信下载文件的安全说明：每个下载/解压内容放进新的空目录、脚本放在别处、不要在其中运行解释器或构建工具、读取它们的 Python 用 -I。
 */
//@ chunk-e6aww6q8.js:99579-100090 placement
var UNTRUSTED_DOWNLOADS_NOTE =
    "Downloaded files and extracted archives are untrusted data: put each in its own new, empty directory, keep scripts you write in a different directory, and pass paths as arguments instead of running an interpreter or build tool from inside it. Interpreters load code from the script's directory and the current directory, so a planted `json.py` runs on `import json`. Run any Python that reads them with `-I`. This does not apply to code the user asked you to build or run.",
  TENGU_FOAMY_SEDGEWICK = "tengu_foamy_sedgewick";
//@ chunk-e6aww6q8.js:100090-100128 placement
function _io() {
  return getFeatureValue_SESSION_PINNED(TENGU_FOAMY_SEDGEWICK, !1) !== !0;
}
//@ chunk-e6aww6q8.js:100948-101795 placement
function buildEnvironmentInfo(e, n) {
  let r = [],
    workingDirectory = n.workingDirectory;
  if (workingDirectory !== e.workingDirectory)
    r.push({
      field: "workingDirectory",
      ...(workingDirectory !== void 0 &&
        (!getGitEmail(e) || e.workingDirectory === void 0 || obs(e.workingDirectory)) && {
          from: e.workingDirectory,
        }),
    });
  if (workingDirectory !== void 0 && n.isWorktree !== e.isWorktree) r.push({ field: "isWorktree" });
  if (workingDirectory !== void 0 && n.isGitRepo !== e.isGitRepo) r.push({ field: "isGitRepo" });
  let h = new Set(e.additionalWorkingDirectories),
    y = new Set(n.additionalWorkingDirectories),
    filtered = n.additionalWorkingDirectories.filter(
      (additionalWorkingDirectory) => !h.has(additionalWorkingDirectory),
    ),
    filtered_2 = e.additionalWorkingDirectories.filter(
      (additionalWorkingDirectory) => !y.has(additionalWorkingDirectory),
    );
  if (filtered.length > 0 || filtered_2.length > 0)
    r.push({ field: "additionalWorkingDirectories", added: filtered, removed: filtered_2 });
  if (n.scratchpadDirectory !== e.scratchpadDirectory) r.push({ field: "scratchpadDirectory" });
  if (n.githubCli !== e.githubCli) r.push({ field: "githubCli" });
  if (formatAgentProxyNote(n) !== formatAgentProxyNote(e)) r.push({ field: "agentProxy" });
  return r;
}
/**
 * 列出环境信息附件缺少的字段（工作目录，以及需要时的草稿目录）。
 */
//@ chunk-e6aww6q8.js:101795-101971 placement
function missingEnvFields(e, n) {
  return [
    ...(n.workingDirectory === void 0 ? [{ field: "workingDirectory" }] : []),
    ...(n.scratchpadDirectory === void 0 && e.withScratchpad ? [{ field: "scratchpadDirectory" }] : []),
  ];
}
/**
 * 生成环境信息附件（工作目录、是否 worktree、是否 git 仓库），并标注与上次相比的变化。
 */
//@ chunk-e6aww6q8.js:101971-103072 placement
function buildEnvironmentAttachment(e, n) {
  let r = [];
  for (let s of n)
    switch (s.field) {
      case "workingDirectory":
        if (e.workingDirectory === void 0) r.push(WORKING_DIRECTORY_NO_LONGER_APPLIES);
        else {
          let h = s.from === void 0 ? "" : ` (was ${escapeForTag(s.from)})`;
          r.push(`Primary working directory: ${escapeForTag(e.workingDirectory)}${h}`);
        }
        break;
      case "isWorktree":
        if (e.workingDirectory === void 0) break;
        if (e.isWorktree) r.push(WORKTREE_NOTICE, WORKTREE_GIT_STASH_WARNING);
        else r.push(NO_LONGER_WORKTREE_NOTICE);
        break;
      case "isGitRepo":
        if (e.workingDirectory !== void 0)
          r.push(`Is a git repository: ${e.isGitRepo} (was ${!e.isGitRepo})`);
        break;
      case "additionalWorkingDirectories":
        if (s.added.length > 0) r.push("Additional working directories added:", s.added.map(escapeForTag));
        if (s.removed.length > 0)
          r.push("Additional working directories removed:", s.removed.map(escapeForTag));
        break;
      case "scratchpadDirectory":
        r.push(
          e.scratchpadDirectory !== void 0
            ? scratchpadInstruction(escapeForTag(e.scratchpadDirectory))
            : "The scratchpad directory announced earlier is no longer available; use it no further.",
        );
        break;
      case "githubCli": {
        if (e.githubCli === void 0) {
          r.push(GH_API_NOT_ACTIVE_NOTE);
          break;
        }
        let h = buildAgentProxyGhPrompt(e.githubCli);
        if (h !== void 0) r.push(h + GH_CLI_REPLACES_EARLIER_NOTE);
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
function kio(e) {
  return e.type === "attachment" && e.attachment.type === "environment";
}
/**
 * 从历史环境附件中归纳：最新快照、最新可读快照、是否发过完整块、是否告知过内置 gh / agentProxy，以及当前与最近一次提到的 scratchpad 状态。
 */
//@ chunk-e6aww6q8.js:103152-103690 placement
function summarizeEnvironmentHistory(e) {
  let n = readEnvironmentAttachments(e),
    flattened = n.flatMap((y) => (y.readable ? [y] : [])),
    at = n.at(-1),
    last = n.findLast((y) => tkt(y) || isWorkingDirectoryCleared(y));
  return {
    latest: at?.readable ? at.snapshot : void 0,
    newestReadable: flattened.at(-1)?.snapshot,
    hasWholeBlock: flattened.some((y) => y.changes === void 0),
    toldOfBuiltinGh: flattened.some(
      (y) => y.snapshot.githubCli !== void 0 || y.changes?.some((S) => S.field === "githubCli") === !0,
    ),
    toldOfAgentProxy: flattened.some(
      (y) => y.snapshot.agentProxy !== void 0 || y.changes?.some((S) => S.field === "agentProxy") === !0,
    ),
    standing: n.reduce(
      (y, S) => (tkt(S) ? scratchpadStanding(S) : isWorkingDirectoryCleared(S) ? void 0 : y),
      void 0,
    ),
    mentioned: last && scratchpadStanding(last),
  };
}
//@ chunk-e6aww6q8.js:103690-103769 placement
function tkt(e) {
  return e.readable ? e.snapshot.workingDirectory !== void 0 : e.shown;
}
//@ chunk-e6aww6q8.js:103769-103898 placement
function isWorkingDirectoryCleared(e) {
  return (
    e.readable &&
    e.snapshot.workingDirectory === void 0 &&
    e.changes?.some((n) => n.field === "workingDirectory") === !0
  );
}
//@ chunk-e6aww6q8.js:103898-104114 placement
function scratchpadStanding(e) {
  if (!e.readable) return { withScratchpad: !0 };
  return {
    withScratchpad:
      e.snapshot.workingDirectory !== void 0
        ? e.snapshot.scratchpadDirectory !== void 0
        : e.changes?.some((n) => n.field === "scratchpadDirectory") === !0,
  };
}
/**
 * 从消息中收集环境信息附件：可解析的给出快照与变更列表，不可解析的记录是否已显示、是否整块。
 */
//@ chunk-e6aww6q8.js:104114-104482 placement
function readEnvironmentAttachments(e) {
  return e.flatMap((n, r) => {
    if (!kio(n)) return [];
    let s = envInfoFactsSchema().safeParse(n.attachment.snapshot).data,
      changes = n.attachment.changes;
    return [
      s === void 0
        ? {
            index: r,
            readable: !1,
            shown: Array.isArray(n.rendered) && n.rendered.length > 0,
            wholeBlock: !Array.isArray(changes),
          }
        : {
            index: r,
            readable: !0,
            snapshot: s,
            changes: Array.isArray(changes)
              ? changes.flatMap((y) => envInfoChangeSchema().safeParse(y).data ?? [])
              : void 0,
          },
    ];
  });
}
//@ chunk-e6aww6q8.js:104539-104566 placement
function kkt(e, n) {
  return n;
}
//@ chunk-e6aww6q8.js:105000-105015 placement
var wio = "\x00";
//@ chunk-e6aww6q8.js:105148-105182 placement
function kZ(e) {
  (clearSystemPromptSectionState(e), clearBetaHeaderLatches(), Yvi());
}
//@ chunk-e6aww6q8.js:105182-105191 placement
setPromptSectionInvalidator(clearSystemPromptSectionState);

export {
  scratchpadInstruction,
  _io,
  UNTRUSTED_DOWNLOADS_NOTE,
  buildEnvironmentAttachment,
  kZ,
  kkt,
  wio,
  collectEnvironmentFacts,
  summarizeEnvironmentHistory,
  remoteEnvironmentFacts,
  missingEnvFields,
  buildEnvironmentInfo,
};
