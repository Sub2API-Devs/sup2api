/**
 * services/projects/sessionScan.ts
 *
 * 2.1.316 新增：会话扫描
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (4)
 * attribution: placement 4
 */
import { readdir } from "fs/promises";
import { basename, relative } from "path";
import { truncateToLength, stripSuffix } from "../../utils/stringUtils.js";
import { stripAnsiAndControls, printableName } from "../../utils/printableName.js";
import { DOC_NAME_REGEX, MAX_TOP_LEVEL_ENTRIES, resolveRepoFact, hasUnpushedCommits } from "./repoContext.js";
import { isFsInaccessible, isAbortError, errorMessage } from "../../utils/errors.js";
import { listChannelsPage, ChannelApiError, isRetryableChannelError } from "./channelApi.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { findGitRootRecheckingNegative, getFileStatus } from "../../utils/git.js";
import { clearResolveGitDirCache } from "../../utils/git/gitFilesystem.js";
import { loadSameRepoMessageLogs_2 } from "../../utils/sessionStorage.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-dz3q485w.js:15469-15880 placement
/**
 * 列出目录顶层条目（跳过隐藏项与符号链接）并挑出文档类条目（README、CLAUDE.md 优先）。
 */
async function scanTopLevelEntries(cwd) {
  try {
    let sorted = (
      await readdir(cwd, {
        withFileTypes: true,
      })
    )
      .filter((entry) => !entry.name.startsWith(".") && !entry.isSymbolicLink())
      .map((entry) =>
        truncateToLength(stripAnsiAndControls(entry.isDirectory() ? entry.name + "/" : entry.name), 80),
      )
      .sort((leftName, b) => leftName.localeCompare(b));
    let docRank = (docName) => (/^readme/i.test(docName) ? 0 : /^claude\.md$/i.test(docName) ? 1 : 2);
    return {
      docs: sorted
        .filter((entry) => DOC_NAME_REGEX.test(stripSuffix(entry, "/")))
        .sort((leftDoc, b) => docRank(leftDoc) - docRank(b)),
      entries: sorted.slice(0, MAX_TOP_LEVEL_ENTRIES),
    };
  } catch (error) {
    if (isFsInaccessible(error))
      return {
        docs: [],
        entries: [],
      };
    throw error;
  }
}
//@ chunk-dz3q485w.js:15880-16113 placement
/**
 * 试探 Projects 是否可用：列出一页频道，成功返回 ok，否则区分确定拒绝与未知错误。
 */
async function probeProjectsAccess(signal, credentials) {
  try {
    await listChannelsPage(null, signal, credentials);
    return {
      kind: "ok",
    };
  } catch (error) {
    signal.throwIfAborted();
    if (isAbortError(error)) throw error;
    if (error instanceof ChannelApiError)
      return {
        kind: isRetryableChannelError(error) ? "unknown" : "refused",
        message: error.message,
      };
    return {
      kind: "unknown",
      message: printableName(errorMessage(error), 200),
    };
  }
}
//@ chunk-dz3q485w.js:16113-16143 placement
var EMPTY_SCAN_RESULT = {
  logs: [],
  totalCount: 0,
};
//@ chunk-dz3q485w.js:16143-16805 placement
/**
 * 扫描当前目录供 /send-to-project 使用：git 根与仓库/GitHub 访问状态、未提交与未跟踪文件数、同仓库的本地会话、顶层条目与文档，以及是否有未推送提交。
 */
async function scanFolderContext(opts, signal, credentials) {
  let cwd = getOriginalCwd();
  let gitRoot = findGitRootRecheckingNegative(cwd);
  if (gitRoot !== null) clearResolveGitDirCache();
  let [repoFact, fileStatus, sessions, entries] = await Promise.all([
    resolveRepoFact(gitRoot, opts.checkAccess, signal),
    gitRoot === null || opts.repoOnly === true
      ? Promise.resolve({
          tracked: [],
          untracked: [],
        })
      : getFileStatus(gitRoot),
    opts.withSessions
      ? loadSameRepoMessageLogs_2(cwd, credentials).catch((error) => {
          logForDebugging(`send-to-project: session scan failed: ${errorMessage(error)}`);
          return EMPTY_SCAN_RESULT;
        })
      : Promise.resolve(EMPTY_SCAN_RESULT),
    opts.repoOnly === true
      ? Promise.resolve({
          docs: [],
          entries: [],
        })
      : scanTopLevelEntries(cwd),
  ]);
  let unpushed =
    gitRoot !== null && repoFact.hasOrigin && opts.repoOnly !== true
      ? await hasUnpushedCommits(gitRoot)
      : false;
  return {
    cwd,
    folderName: stripAnsiAndControls(basename(cwd)),
    gitRoot,
    pathInRepo: gitRoot === null ? null : stripAnsiAndControls(relative(gitRoot, cwd)),
    repo: repoFact.repo,
    uncommittedFileCount: fileStatus.tracked.length,
    untrackedFileCount: fileStatus.untracked.length,
    hasUnpushedCommits: unpushed,
    sessions,
    docs: entries.docs,
    topLevelEntries: entries.entries,
  };
}
export { scanFolderContext, probeProjectsAccess };
