/**
 * services/projects/folderBrief.ts
 *
 * 2.1.316 新增：文件夹简报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (7)
 * attribution: placement 7
 */
import { lstat, open, readdir, readdir as readdir_2 } from "fs/promises";
import { constants } from "fs";
import { join, join as join_2 } from "path";
import { ws } from "../../utils/fsFlags.js";
import { getErrnoCode, isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { freeze } from "../../utils/git/gitSafeEnv.js";
import {
  rn,
  ns,
  os,
  ss,
  sn,
  rs,
  ln,
  Te,
  summarizeToolsUsed,
  countMcpCallsByServer,
  toolsUsedLines,
  unusedConnectorsLine,
  Ce,
  it,
} from "./toolsUsedSummary.js";
import { truncateToLength, plural } from "../../utils/stringUtils.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { logForDebugging } from "../../utils/debug.js";
import { collectSessionsForProject } from "../../utils/agenticSessionSearch.js";
import { describeRepoFact } from "./disclosure.js";

/**
 * 安全读取小型普通文件：不跟随链接、只读单链接普通文件且不超过大小上限，否则返回 null。
 */
//@ chunk-dz3q485w.js:24276-24716 placement
async function readSmallRegularFile(e, n) {
  let s,
    r = null;
  try {
    if (ws === 0) {
      let a = await lstat(e, { bigint: !0 });
      if (!a.isFile()) return null;
      r = { ino: a.ino, dev: a.dev };
    }
    s = await open(e, constants.O_RDONLY | ws);
  } catch (error) {
    let l = getErrnoCode(error);
    if (l === "ELOOP" || l === "EISDIR" || isFsInaccessible(error)) return null;
    throw error;
  }
  try {
    let stats = await s.stat({ bigint: !0 });
    if (
      !stats.isFile() ||
      stats.nlink > 1n ||
      stats.size > BigInt(n) ||
      (r !== null && (stats.ino !== r.ino || stats.dev !== r.dev))
    )
      return null;
    return await s.readFile({ encoding: "utf8" });
  } finally {
    await s.close();
  }
}
//@ chunk-dz3q485w.js:26683-26976 placement
async function recentFolderCommits(e) {
  if (e.gitRoot === null) return [];
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze, "log", "-n", String(rn), "--date=short", "--pretty=format:%h %ad %s", "--", "."],
    { cwd: e.cwd, preserveOutputOnError: !1 },
  );
  if (code !== 0) return [];
  return stdout
    .split(
      `
`,
    )
    .map((r) => truncateToLength(stripAnsiAndControls(r).trim(), ns))
    .filter((r) => r !== "");
}
/**
 * 为简报读取文档摘录：目录列出前若干个条目，文件读取开头若干字节，跳过无法访问的项。
 */
//@ chunk-dz3q485w.js:26976-27613 placement
async function readDocExcerpts(context) {
  let cwd = context.cwd,
    excerpts = [];
  for (let doc of context.docs) {
    if (excerpts.length >= os) break;
    try {
      if (doc.endsWith("/")) {
        let a = join_2(cwd, doc.slice(0, -1)),
          l = await lstat(a, { bigint: !0 });
        if (!l.isDirectory()) continue;
        let c = await readdir_2(join_2(cwd, doc)),
          h = await lstat(a, { bigint: !0 });
        if (!h.isDirectory() || h.ino !== l.ino || h.dev !== l.dev) continue;
        let sliced = c
          .filter((w) => !w.startsWith("."))
          .map((w) => truncateToLength(stripAnsiAndControls(w), 80))
          .sort((w, y) => w.localeCompare(y))
          .slice(0, ss);
        excerpts.push({ path: doc, excerpt: truncateToLength(`(directory) ${sliced.join(", ")}`, sn) });
      } else {
        let a = await readSmallRegularFile(join_2(cwd, doc), rs);
        if (a !== null) excerpts.push({ path: doc, excerpt: ln(truncateToLength(a, sn)) });
      }
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`send-to-project: skipped a doc for the summary: ${errorMessage(error)}`);
    }
  }
  return excerpts;
}
/**
 * 收集发送到项目所需的文件夹素材：最近本地会话（可跳过）、触及该目录的提交、文档摘录与顶层条目，并统计 MCP 工具调用；支持中止信号。
 */
//@ chunk-dz3q485w.js:27613-28367 placement
async function gatherFolderBrief(context, sessionOptions, signal, opts = {}) {
  signal?.throwIfAborted();
  let work = Promise.all([
      opts.skipSessions === !0
        ? Promise.resolve({ sessions: [], mcpCalls: Te(), toolsUsed: [], sessionsParsed: 0, span: null })
        : collectSessionsForProject(context, sessionOptions),
      recentFolderCommits(context),
      readDocExcerpts(context),
    ]),
    aborted =
      signal === void 0
        ? null
        : new Promise((w, y) => {
            signal.addEventListener(
              "abort",
              () => y(signal.reason ?? new DOMException("Aborted", "AbortError")),
              { once: !0 },
            );
          }),
    [sessionScan, commits, docs] = await (aborted === null ? work : Promise.race([work, aborted]));
  if (aborted !== null) (work.catch(() => {}), aborted.catch(() => {}));
  return {
    sessions: sessionScan.sessions,
    sessionSpan: sessionScan.span,
    sessionsSkipped: opts.skipSessions === !0,
    quotedToolsUsed: sessionScan.toolsUsed,
    commits: commits,
    docs: docs,
    topLevelEntries: context.topLevelEntries,
    tools: summarizeToolsUsed({
      counts: countMcpCallsByServer(opts.currentMessages ?? [], sessionScan.mcpCalls),
      clients: opts.mcpClients ?? [],
      sessionsScanned: sessionScan.sessionsParsed,
      includesCurrentConversation: opts.currentMessages !== void 0,
    }),
  };
}
/**
 * 仅统计当前对话中的 MCP 工具调用并汇总（没有当前消息时返回 null）。
 */
//@ chunk-dz3q485w.js:28367-28531 placement
function currentConversationTools(e) {
  return e.currentMessages === void 0
    ? null
    : summarizeToolsUsed({
        counts: countMcpCallsByServer(e.currentMessages),
        clients: e.mcpClients ?? [],
        sessionsScanned: 0,
        includesCurrentConversation: !0,
      });
}
/**
 * 说明 MCP 调用统计来自哪些会话转录（最近若干个与/或当前对话），以及 claude.ai 连接器与本机服务器的区别。
 */
//@ chunk-dz3q485w.js:28531-29018 placement
function mcpCallsCountedIn(e) {
  return `MCP tool calls by server, counted in ${[e.sessionsScanned > 0 ? `the ${e.sessionsScanned === 1 ? "most recent session transcript" : `${e.sessionsScanned} most recent session transcripts`} (read whole, not just the condensed text below)` : null, e.includesCurrentConversation ? "the conversation above" : null].filter((s) => s !== null).join(" and ")}. A claude.ai connector lives in the cloud; a local server is configured on this computer only and does not carry over to the project.`;
}
/**
 * 把文件夹素材拼成供模型起草简报的文本：文件夹与仓库信息、顶层条目、最近提交、文档摘录、MCP 服务器调用统计，以及在预算内尽量多的最近会话摘要（超出部分注明省略）。
 */
//@ chunk-dz3q485w.js:29018-30880 placement
function buildFolderBriefText(context, brief) {
  let lines = [];
  if (
    (lines.push(`Folder name: ${context.folderName}`),
    lines.push(`Repository: ${describeRepoFact(context.repo)}.`),
    context.pathInRepo !== null && context.pathInRepo !== "")
  )
    lines.push(
      `This folder is ${context.pathInRepo}/ inside that repository; commits below are the ones touching it.`,
    );
  if (context.repo.kind !== "no-git")
    lines.push(
      `Working tree (whole repository): ${context.uncommittedFileCount} uncommitted, ${context.untrackedFileCount} untracked file(s)${context.hasUnpushedCommits ? ", unpushed commits present" : ""}.`,
    );
  let sessionsLineIndex = lines.length;
  if (
    (lines.push(""),
    lines.push(""),
    lines.push(`## Top-level entries
${brief.topLevelEntries.join("  ") || "(empty folder)"}`),
    lines.push(""),
    lines.push(`## Recent commits (newest first, up to ${rn})
${
  brief.commits.length > 0
    ? brief.commits.join(`
`)
    : "(none)"
}`),
    lines.push(""),
    lines.push("## Docs"),
    brief.docs.length === 0)
  )
    lines.push("(no README, CLAUDE.md, or docs directory found)");
  for (let doc of brief.docs)
    lines.push(`### ${doc.path}
${doc.excerpt}`);
  if (brief.tools !== null) {
    let b = toolsUsedLines(brief.tools, "this computer"),
      w = unusedConnectorsLine(brief.tools);
    if (
      (lines.push(""),
      lines.push(`## ${Ce}`),
      lines.push(mcpCallsCountedIn(brief.tools)),
      lines.push(...(b.length > 0 ? b : ["- (no MCP tool calls in these sessions)"])),
      w !== null)
    )
      lines.push(w);
  }
  if (brief.sessionsSkipped)
    return (
      lines.splice(sessionsLineIndex, 2),
      {
        text: truncateToLength(
          lines.join(`
`),
          it,
        ),
        sessionsIncluded: 0,
      }
    );
  if ((lines.push(""), lines.push("## Recent local sessions (newest first)"), brief.sessions.length === 0))
    lines.push("(none)");
  let sessionsLine = (b) =>
    `Local Claude Code sessions in this folder: ${b === 0 ? "none was read." : `the ${b === 1 ? "most recent one read is" : `${b} most recent read are`} condensed below.`}`;
  lines[sessionsLineIndex] = sessionsLine(brief.sessions.length);
  let text = truncateToLength(
      lines.join(`
`),
      it,
    ),
    included = 0;
  for (let [b, w] of brief.sessions.entries()) {
    let y = `
### Session ${b + 1}: ${w.title} \u2014 ${w.date}${w.branch !== null ? ` \u2014 branch ${w.branch}` : ""}
${w.transcript}`;
    if (text.length + y.length > it) break;
    ((text += y), included++);
  }
  let omitted = brief.sessions.length - included;
  if (omitted > 0)
    ((text += `
(${omitted} older ${plural(omitted, "session")} omitted to stay within the context budget)`),
      (text = text.replace(sessionsLine(brief.sessions.length), sessionsLine(included))));
  return { text: text, sessionsIncluded: included };
}

export { currentConversationTools, gatherFolderBrief, buildFolderBriefText };
