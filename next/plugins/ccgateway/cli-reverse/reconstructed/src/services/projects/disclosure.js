/**
 * services/projects/disclosure.ts
 *
 * 2.1.316 新增：Projects 信息披露提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jndyh8cy.js (8), chunk-qfmb95nn.js (1)
 * attribution: placement 9
 */
import { factLabel } from "./contextFile.js";
import { plural } from "../../utils/stringUtils.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { HTTPS_CLAUDE_AI } from "../../constants/product.js";

//@ chunk-qfmb95nn.js:414-606 placement
var LEADING_PUNCT_RUN_REGEX = /^\s*[^\p{L}\p{N}\s]{5}/u;
var TRAILING_PUNCT_RUN_REGEX = /[^\p{L}\p{N}\s]{5}\s*$/u;
var LETTER_REGEX = /\p{L}/u;
var FENCE_MARKER_WORDS_REGEX =
  /\b(BEGIN|END)\s+(LOCAL\s+(HISTORY|SETUP\s*PROPOSAL|TOOLS\s*USED)|CLOUD\s+SETUP\s*PROPOSAL|PROJECT\s+INSTRUCTIONS)\b/i;
//@ chunk-jndyh8cy.js:16902-16984 placement (2.1.88 match: formatPeakDay, 1)
function formatPeakDay(dateStr) {
  return dateStr.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
//@ chunk-jndyh8cy.js:16984-17742 placement
/**
 * 用一行文字描述目录的仓库情况：非 git、git 但 origin 不是 github.com，或 GitHub 仓库及其默认分支与访问状态（是否可达、是否安装了 Claude GitHub App）。
 */
function describeRepoFact(repo) {
  switch (repo.kind) {
    case "no-git":
      return "not a git repository";
    case "no-github-remote":
      return `git repository on ${factLabel(repo.branch)} \xB7 ${repo.hasOrigin ? "origin is not a github.com repository" : "no origin remote"}`;
    case "github": {
      let access = repo.access;
      let locationText =
        access?.defaultBranch != null && access.defaultBranch !== repo.branch
          ? `git repository on ${factLabel(repo.branch)} (default ${factLabel(access.defaultBranch)})`
          : `git repository on ${factLabel(repo.branch)}`;
      if (access === null) return `${locationText} \xB7 github.com/${repo.owner}/${repo.name}`;
      let accessPhrase = access.transient
        ? "couldn\u2019t check your access just now"
        : !access.accessible
          ? "your Claude account can\u2019t reach it"
          : access.appInstalled
            ? "you have access, Claude GitHub App installed"
            : "you have access, Claude GitHub App not installed";
      return `${locationText} \xB7 github.com/${repo.owner}/${repo.name} (${accessPhrase})`;
    }
  }
}
//@ chunk-jndyh8cy.js:17742-18456 placement
/**
 * 生成 /send-to-project 披露的事实行：仓库/分支与 GitHub 访问状态、仓库内子目录、读取的本地会话数与日期范围、未提交文件数、未推送提交、找到的文档。
 */
function disclosureFactsLine(context, sessionsRead) {
  let facts = [describeRepoFact(context.repo)];
  if (context.pathInRepo !== null && context.pathInRepo !== "")
    facts.push(`folder ${factLabel(context.pathInRepo, 200)} inside it`);
  if (sessionsRead === null);
  else if (sessionsRead.count === 0) facts.push("no past local sessions read");
  else {
    let { count, span } = sessionsRead;
    let spanText =
      span === null
        ? ""
        : formatPeakDay(span.oldest) === formatPeakDay(span.newest)
          ? ` (${formatPeakDay(span.newest)})`
          : ` (${formatPeakDay(span.oldest)}\u2013${formatPeakDay(span.newest)})`;
    facts.push(`${count} recent local ${plural(count, "session")} read${spanText}`);
  }
  if (context.repo.kind !== "no-git") {
    let changedFileCount = context.uncommittedFileCount + context.untrackedFileCount;
    if (changedFileCount > 0)
      facts.push(`${changedFileCount} uncommitted ${plural(changedFileCount, "file")}`);
    if (context.hasUnpushedCommits) facts.push("unpushed commits");
  }
  if (context.docs.length > 0) {
    let sliced = context.docs.slice(0, 3);
    let moreDocCount = context.docs.length - sliced.length;
    facts.push(`${sliced.join(", ")}${moreDocCount > 0 ? ` +${moreDocCount} more` : ""} found`);
  }
  return facts.join(" \xB7 ");
}
//@ chunk-jndyh8cy.js:18456-18488 placement
/**
 * 「没有其他内容发出」的固定提示。
 */
var NOTHING_ELSE_SENT_NOTICE = "Nothing else is sent.";
//@ chunk-jndyh8cy.js:18488-19045 placement
/**
 * 生成 /send-to-project 的"不会发送"说明：未提交/未跟踪文件、未推送提交、仓库外文件与凭据，以及线程将从 GitHub 内容还是无代码开始。
 */
function notSentLine(context, hasRepo) {
  let items = [];
  if (context.repo.kind === "no-git") items.push("this folder\u2019s files");
  else {
    let { uncommittedFileCount, untrackedFileCount } = context;
    if (uncommittedFileCount > 0 || untrackedFileCount > 0) {
      let countParts = [];
      if (uncommittedFileCount > 0) countParts.push(`${uncommittedFileCount} uncommitted`);
      if (untrackedFileCount > 0) countParts.push(`${untrackedFileCount} untracked`);
      let changedFileCount = uncommittedFileCount + untrackedFileCount;
      items.push(`${countParts.join(" and ")} ${plural(changedFileCount, "file")}`);
    }
    if (context.hasUnpushedCommits) items.push("unpushed commits");
    items.push("files outside the repository");
  }
  items.push("your credentials");
  let threadsNote = hasRepo
    ? "Threads start from what\u2019s on GitHub."
    : "No repository is added, so threads start without this code.";
  return `Not sent: ${items.join(", ")}. ${threadsNote}`;
}
//@ chunk-jndyh8cy.js:19045-19128 placement
function projectUrl(id) {
  return getOauthConfig().CLAUDE_AI_ORIGIN + "/code/project/" + encodeURIComponent(id);
}
//@ chunk-jndyh8cy.js:19128-19163 placement
var HTTPS_PREVIEW_CLAUDE_AI = "https://preview.claude.ai";
//@ chunk-jndyh8cy.js:19163-19632 placement
/**
 * 解析项目引用：chan_ 开头的 id（可带 /cmsg_ 线程 id），或 claude.ai 的 /code/project/<id> 链接（可带 thread 参数），其他输入返回 null。
 */
function parseProjectReference(firstToken) {
  let match = /^(chan_[A-Za-z0-9_-]+)(?:\/(cmsg_[A-Za-z0-9_-]+))?$/.exec(firstToken.trim());
  if (match !== null)
    return {
      projectId: match[1] ?? "",
      threadId: match[2] ?? null,
    };
  let url;
  try {
    url = new URL(firstToken.trim());
  } catch {
    return null;
  }
  let match_2 = /^\/code\/project\/(chan_[A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  let threadParam = url.searchParams.get("thread");
  let CLAUDE_AI_ORIGIN = getOauthConfig().CLAUDE_AI_ORIGIN;
  if (
    (url.origin !== CLAUDE_AI_ORIGIN &&
      !(CLAUDE_AI_ORIGIN === HTTPS_CLAUDE_AI && url.origin === HTTPS_PREVIEW_CLAUDE_AI)) ||
    match_2 === null ||
    (threadParam !== null && !/^cmsg_[A-Za-z0-9_-]+$/.test(threadParam))
  )
    return null;
  return {
    projectId: match_2[1] ?? "",
    threadId: threadParam,
  };
}
export {
  disclosureFactsLine,
  parseProjectReference,
  NOTHING_ELSE_SENT_NOTICE,
  notSentLine,
  LETTER_REGEX,
  LEADING_PUNCT_RUN_REGEX,
  TRAILING_PUNCT_RUN_REGEX,
  FENCE_MARKER_WORDS_REGEX,
  describeRepoFact,
  projectUrl,
};
