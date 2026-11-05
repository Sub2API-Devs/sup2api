/**
 * services/projects/folderBrief.ts
 *
 * 2.1.316 新增：文件夹简报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jndyh8cy.js (7)
 * attribution: placement 7
 */
import { lstat, open, readdir } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { getErrnoCode, isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../utils/git/gitSafeEnv.js";
import {
  GIT_LOG_COMMIT_COUNT,
  DOC_NAME_CHARS,
  MAX_DOC_EXCERPTS,
  MAX_DIR_ENTRIES,
  DOC_EXCERPT_CHARS,
  MAX_DOC_FILE_BYTES,
  normalizeNewlinesAndPaths,
  emptyCallCounts,
  summarizeToolsUsed,
  countMcpCallsByServer,
  toolsUsedLines,
  unusedConnectorsLine,
  TOOLS_USED_HEADING,
  MAX_BRIEF_CHARS,
} from "./toolsUsedSummary.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { logForDebugging } from "../../utils/debug.js";
import { collectSessionsForProject } from "../../utils/agenticSessionSearch.js";
import { describeRepoFact } from "./disclosure.js";

//@ chunk-jndyh8cy.js:24028-24468 placement
/**
 * 安全读取小型普通文件：不跟随链接、只读单链接普通文件且不超过大小上限，否则返回 null。
 */
async function readSmallRegularFile(filePath, maxBytes) {
  let handle;
  let preStat = null;
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
      let preLstat = await lstat(filePath, {
        bigint: true,
      });
      if (!preLstat.isFile()) return null;
      preStat = {
        ino: preLstat.ino,
        dev: preLstat.dev,
      };
    }
    handle = await open(filePath, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EISDIR" || isFsInaccessible(error)) return null;
    throw error;
  }
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (
      !stats.isFile() ||
      stats.nlink > 1n ||
      stats.size > BigInt(maxBytes) ||
      (preStat !== null && (stats.ino !== preStat.ino || stats.dev !== preStat.dev))
    )
      return null;
    return await handle.readFile({
      encoding: "utf8",
    });
  } finally {
    await handle.close();
  }
}
//@ chunk-jndyh8cy.js:26433-26725 placement
async function recentFolderCommits(context) {
  if (context.gitRoot === null) return [];
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      "log",
      "-n",
      String(GIT_LOG_COMMIT_COUNT),
      "--date=short",
      "--pretty=format:%h %ad %s",
      "--",
      ".",
    ],
    {
      cwd: context.cwd,
      preserveOutputOnError: false,
    },
  );
  if (code !== 0) return [];
  return stdout
    .split(
      `
`,
    )
    .map((line) => truncateToLength(stripAnsiAndControls(line).trim(), DOC_NAME_CHARS))
    .filter((line) => line !== "");
}
//@ chunk-jndyh8cy.js:26725-27359 placement
/**
 * 为简报读取文档摘录：目录列出前若干个条目，文件读取开头若干字节，跳过无法访问的项。
 */
async function readDocExcerpts(context) {
  let cwd = context.cwd;
  let excerpts = [];
  for (let doc of context.docs) {
    if (excerpts.length >= MAX_DOC_EXCERPTS) break;
    try {
      if (doc.endsWith("/")) {
        let dirPath = join(cwd, doc.slice(0, -1));
        let beforeStat = await lstat(dirPath, {
          bigint: true,
        });
        if (!beforeStat.isDirectory()) continue;
        let entries = await readdir(join(cwd, doc));
        let afterStat = await lstat(dirPath, {
          bigint: true,
        });
        if (!afterStat.isDirectory() || afterStat.ino !== beforeStat.ino || afterStat.dev !== beforeStat.dev)
          continue;
        let sliced = entries
          .filter((entryName) => !entryName.startsWith("."))
          .map((entryName) => truncateToLength(stripAnsiAndControls(entryName), 80))
          .sort((a, b) => a.localeCompare(b))
          .slice(0, MAX_DIR_ENTRIES);
        excerpts.push({
          path: doc,
          excerpt: truncateToLength(`(directory) ${sliced.join(", ")}`, DOC_EXCERPT_CHARS),
        });
      } else {
        let smallRegularFile = await readSmallRegularFile(join(cwd, doc), MAX_DOC_FILE_BYTES);
        if (smallRegularFile !== null)
          excerpts.push({
            path: doc,
            excerpt: normalizeNewlinesAndPaths(truncateToLength(smallRegularFile, DOC_EXCERPT_CHARS)),
          });
      }
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`send-to-project: skipped a doc for the summary: ${errorMessage(error)}`);
    }
  }
  return excerpts;
}
//@ chunk-jndyh8cy.js:27359-28113 placement
/**
 * 收集发送到项目所需的文件夹素材：最近本地会话（可跳过）、触及该目录的提交、文档摘录与顶层条目，并统计 MCP 工具调用；支持中止信号。
 */
async function gatherFolderBrief(context, sessionOptions, signal, opts = {}) {
  signal?.throwIfAborted();
  let work = Promise.all([
    opts.skipSessions === true
      ? Promise.resolve({
          sessions: [],
          mcpCalls: emptyCallCounts(),
          toolsUsed: [],
          sessionsParsed: 0,
          span: null,
        })
      : collectSessionsForProject(context, sessionOptions),
    recentFolderCommits(context),
    readDocExcerpts(context),
  ]);
  let aborted =
    signal === undefined
      ? null
      : new Promise((resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(signal.reason ?? new DOMException("Aborted", "AbortError")),
            {
              once: true,
            },
          );
        });
  let [sessionScan, commits, docs] = await (aborted === null ? work : Promise.race([work, aborted]));
  if (aborted !== null) {
    work.catch(() => {});
    aborted.catch(() => {});
  }
  return {
    sessions: sessionScan.sessions,
    sessionSpan: sessionScan.span,
    sessionsSkipped: opts.skipSessions === true,
    quotedToolsUsed: sessionScan.toolsUsed,
    commits,
    docs,
    topLevelEntries: context.topLevelEntries,
    tools: summarizeToolsUsed({
      counts: countMcpCallsByServer(opts.currentMessages ?? [], sessionScan.mcpCalls),
      clients: opts.mcpClients ?? [],
      sessionsScanned: sessionScan.sessionsParsed,
      includesCurrentConversation: opts.currentMessages !== undefined,
    }),
  };
}
//@ chunk-jndyh8cy.js:28113-28277 placement
/**
 * 仅统计当前对话中的 MCP 工具调用并汇总（没有当前消息时返回 null）。
 */
function currentConversationTools(conversationState) {
  return conversationState.currentMessages === undefined
    ? null
    : summarizeToolsUsed({
        counts: countMcpCallsByServer(conversationState.currentMessages),
        clients: conversationState.mcpClients ?? [],
        sessionsScanned: 0,
        includesCurrentConversation: true,
      });
}
//@ chunk-jndyh8cy.js:28277-28764 placement
/**
 * 说明 MCP 调用统计来自哪些会话转录（最近若干个与/或当前对话），以及 claude.ai 连接器与本机服务器的区别。
 */
function mcpCallsCountedIn(tools) {
  return `MCP tool calls by server, counted in ${[tools.sessionsScanned > 0 ? `the ${tools.sessionsScanned === 1 ? "most recent session transcript" : `${tools.sessionsScanned} most recent session transcripts`} (read whole, not just the condensed text below)` : null, tools.includesCurrentConversation ? "the conversation above" : null].filter((part) => part !== null).join(" and ")}. A claude.ai connector lives in the cloud; a local server is configured on this computer only and does not carry over to the project.`;
}
//@ chunk-jndyh8cy.js:28764-30624 placement
/**
 * 把文件夹素材拼成供模型起草简报的文本：文件夹与仓库信息、顶层条目、最近提交、文档摘录、MCP 服务器调用统计，以及在预算内尽量多的最近会话摘要（超出部分注明省略）。
 */
function buildFolderBriefText(context, brief) {
  let lines = [];
  lines.push(`Folder name: ${context.folderName}`);
  lines.push(`Repository: ${describeRepoFact(context.repo)}.`);
  if (context.pathInRepo !== null && context.pathInRepo !== "")
    lines.push(
      `This folder is ${context.pathInRepo}/ inside that repository; commits below are the ones touching it.`,
    );
  if (context.repo.kind !== "no-git")
    lines.push(
      `Working tree (whole repository): ${context.uncommittedFileCount} uncommitted, ${context.untrackedFileCount} untracked file(s)${context.hasUnpushedCommits ? ", unpushed commits present" : ""}.`,
    );
  let sessionsLineIndex = lines.length;
  lines.push("");
  lines.push("");
  lines.push(`## Top-level entries
${brief.topLevelEntries.join("  ") || "(empty folder)"}`);
  lines.push("");
  lines.push(`## Recent commits (newest first, up to ${GIT_LOG_COMMIT_COUNT})
${
  brief.commits.length > 0
    ? brief.commits.join(`
`)
    : "(none)"
}`);
  lines.push("");
  lines.push("## Docs");
  if (brief.docs.length === 0) lines.push("(no README, CLAUDE.md, or docs directory found)");
  for (let doc of brief.docs)
    lines.push(`### ${doc.path}
${doc.excerpt}`);
  if (brief.tools !== null) {
    let toolLines = toolsUsedLines(brief.tools, "this computer");
    let connectorsLine = unusedConnectorsLine(brief.tools);
    lines.push("");
    lines.push(`## ${TOOLS_USED_HEADING}`);
    lines.push(mcpCallsCountedIn(brief.tools));
    lines.push(...(toolLines.length > 0 ? toolLines : ["- (no MCP tool calls in these sessions)"]));
    if (connectorsLine !== null) lines.push(connectorsLine);
  }
  if (brief.sessionsSkipped) {
    lines.splice(sessionsLineIndex, 2);
    return {
      text: truncateToLength(
        lines.join(`
`),
        MAX_BRIEF_CHARS,
      ),
      sessionsIncluded: 0,
    };
  }
  lines.push("");
  lines.push("## Recent local sessions (newest first)");
  if (brief.sessions.length === 0) lines.push("(none)");
  let sessionsLine = (readCount) =>
    `Local Claude Code sessions in this folder: ${readCount === 0 ? "none was read." : `the ${readCount === 1 ? "most recent one read is" : `${readCount} most recent read are`} condensed below.`}`;
  lines[sessionsLineIndex] = sessionsLine(brief.sessions.length);
  let text = truncateToLength(
    lines.join(`
`),
    MAX_BRIEF_CHARS,
  );
  let included = 0;
  for (let [sessionIndex, session] of brief.sessions.entries()) {
    let sessionBlock = `
### Session ${sessionIndex + 1}: ${session.title} \u2014 ${session.date}${session.branch !== null ? ` \u2014 branch ${session.branch}` : ""}
${session.transcript}`;
    if (text.length + sessionBlock.length > MAX_BRIEF_CHARS) break;
    text += sessionBlock;
    included++;
  }
  let omitted = brief.sessions.length - included;
  if (omitted > 0) {
    text += `
(${omitted} older ${plural(omitted, "session")} omitted to stay within the context budget)`;
    text = text.replace(sessionsLine(brief.sessions.length), sessionsLine(included));
  }
  return {
    text,
    sessionsIncluded: included,
  };
}
export { currentConversationTools, gatherFolderBrief, buildFolderBriefText };
