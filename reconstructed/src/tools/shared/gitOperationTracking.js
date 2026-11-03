/**
 * tools/shared/gitOperationTracking.ts
 *
 * 从 shell 命令与输出识别 git/gh 操作（提交、推送、合并、PR 创建/动作、PR URL），生成 gitOperation 字段并发遥测与计数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/shared/gitOperationTracking.ts
 * pieces: chunk-s61vbvea.js (65)
 * attribution: affinity 3, fingerprint 5, layout 43, sole-consumer 1, placement 10, file-local 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { REPO_NAME_PATTERN, Ahs, regExp as regExp_18, _Sr, Ths, L8e } from "../../utils/detectRepository.js";
import { splitCommand, getCommandArgv } from "../../utils/bash/commands.js";
import { uniq, count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { tailTaskOutput } from "../../utils/task/diskOutput.js";
import { isENOENT, isSadResourceErrno, isEnvFsErrno, getErrnoCode } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { readCommitAppendedToHeadReflog, getHeadForDir } from "../../utils/git/gitFilesystem.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  getPendingBranchLinks,
  getCommitCounter,
  getPrCounter,
  getPendingPrLinks,
} from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import { withDeadline } from "../../utils/sleep.js";
import { getBranch } from "../../utils/git.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getNpmDistTags } from "../../utils/autoUpdater.js";
import { zM, getPrStatus, findGerritReview } from "../../utils/ghPrStatus.js";
import { getTextAfterLastRuleMatch } from "../../services/teamMemorySync/secretScanner.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isWorkspacePersistedTrusted } from "../../utils/config.js";

/**
 * 生成匹配 "git [-c k=v|--opt=v]* <子命令>" 的正则。
 */
//@ chunk-s61vbvea.js:567893-567998 affinity
function gitCmdRe(e, n = "") {
  return new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--[^\\s=]+=\\S+)*\\s+${e}\\b${n}`);
}
//@ chunk-s61vbvea.js:567998-568018 fingerprint = GIT_COMMIT_RE (1)
var GIT_COMMIT_RE = gitCmdRe("commit");
/**
 * 命令是否包含 git commit。
 */
//@ chunk-s61vbvea.js:568018-568052 layout
function isGitCommitCommand(e) {
  return GIT_COMMIT_RE.test(e);
}
/**
 * git push / cl upload / cherry-pick / merge / rebase 的命令正则、--dry-run 正则，以及 gitOperation 输出 schema（commit{sha,kind,branch}、push、branch、pr…）。
 */
//@ chunk-s61vbvea.js:568052-568590 layout
var GIT_PUSH_RE = gitCmdRe("push"),
  GIT_CL_UPLOAD_RE = gitCmdRe(String.raw`cl\s+upload`),
  DRY_RUN_FLAG_RE = /(?:^|\s)(?:-n|--dry-run)(?=\s|$)/,
  GIT_CHERRY_PICK_RE = gitCmdRe("cherry-pick"),
  GIT_MERGE_RE = gitCmdRe("merge", "(?!-)"),
  GIT_REBASE_RE = gitCmdRe("rebase"),
  gitOperationSchema = DoctorLazy(() =>
    u({
      commit: u({
        sha: o(),
        kind: U(["committed", "amended", "cherry-picked"]),
        branch: o().optional(),
      }).optional(),
      push: u({ branch: o() }).optional(),
      branch: u({ ref: o(), action: U(["merged", "rebased"]) }).optional(),
      pr: u({
        number: E(),
        url: o().optional(),
        action: U([
          "created",
          "edited",
          "merged",
          "commented",
          "closed",
          "reopened",
          "ready",
          "draft",
          "auto-merge-enabled",
          "auto-merge-disabled",
        ]),
      }).optional(),
    }),
  );
/**
 * 生成匹配 "gh pr <子命令>" 的正则。
 */
//@ chunk-s61vbvea.js:568590-568658 layout
function ghPrCmdRe(e, n = "") {
  return new RegExp(`\\bgh\\s+pr\\s+${e}\\b${n}`);
}
/**
 * gh pr 子命令表 GH_PR_ACTIONS（create/edit/merge/comment/close/ready…→ 动作与遥测 op），以及 gh pr checkout N 正则；tc 为 glab mr 等同类表。
 */
//@ chunk-s61vbvea.js:568658-569467 fingerprint = GH_PR_ACTIONS (0.738)
var GH_PR_CHECKOUT_RE = ghPrCmdRe("checkout", String.raw`[^&|;]*\s(\d+)(?=\s|$|[&|;])`),
  regExp_11 = new RegExp(`^${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN}$`),
  GH_PR_ACTIONS = [
    { re: ghPrCmdRe("create"), action: "created", op: "pr_create" },
    { re: ghPrCmdRe("edit"), action: "edited", op: "pr_edit" },
    { re: ghPrCmdRe("merge"), action: "merged", op: "pr_merge" },
    { re: ghPrCmdRe("comment"), action: "commented", op: "pr_comment" },
    { re: ghPrCmdRe("close"), action: "closed", op: "pr_close" },
    { re: ghPrCmdRe("reopen"), action: "reopened", op: "pr_reopen" },
    { re: ghPrCmdRe("ready"), action: "ready", op: "pr_ready" },
  ],
  GLAB_MR_ACTIONS = [
    { re: /\bglab\s+mr\s+create\b/, action: "created", op: "pr_create" },
    { re: /\bglab\s+mr\s+update\b/, action: "edited", op: "pr_edit" },
    { re: /\bglab\s+mr\s+merge\b/, action: "merged", op: "pr_merge" },
    { re: /\bglab\s+mr\s+note\b/, action: "commented", op: "pr_comment" },
    { re: /\bglab\s+mr\s+close\b/, action: "closed", op: "pr_close" },
    { re: /\bglab\s+mr\s+reopen\b/, action: "reopened", op: "pr_reopen" },
  ];
/**
 * 从命令推断 PR 动作（created/merged/auto-merge-enabled/ready/draft…），兼顾 gh 与 glab。
 */
//@ chunk-s61vbvea.js:569467-569876 affinity
function getPrAction(e) {
  let n = GH_PR_ACTIONS.find((h) => h.re.test(e))?.action,
    replaced = e.replace(fo, " ");
  if (n === "merged") {
    if (/--disable-auto\b/.test(replaced)) return "auto-merge-disabled";
    if (/--auto\b/.test(replaced)) return "auto-merge-enabled";
  } else if (n === "ready" && /--undo\b/.test(replaced)) return "draft";
  if (n) return n;
  let s = GLAB_MR_ACTIONS.find((h) => h.re.test(e))?.action;
  if (s === "edited") {
    if (/--ready\b/.test(replaced)) return "ready";
    if (/--draft\b/.test(replaced)) return "draft";
  }
  return s;
}
//@ chunk-s61vbvea.js:570050-570102 sole-consumer
var ZU = ghPrCmdRe("review"),
  fo = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
/**
 * 找到未被注释的 gh repo create 命令，返回其后的参数文本。
 */
//@ chunk-s61vbvea.js:570102-570386 affinity
function ghRepoCreateArgs(e) {
  let replaced = e.replace(fo, " "),
    regExp = new RegExp(ZU.source, "g");
  for (let match = regExp.exec(replaced); match !== null; match = regExp.exec(replaced)) {
    let h =
      replaced.lastIndexOf(
        `
`,
        match.index,
      ) + 1;
    if (/(^|\s)#/.test(replaced.slice(h, match.index))) continue;
    return (replaced.slice(match.index + match[0].length).split(/[&|;\n]/)[0] ?? "").split(/\s#/)[0] ?? "";
  }
  return null;
}
/**
 * 识别 gh repo create/new 命令用的正则、带值选项、可见性选项。
 */
//@ chunk-s61vbvea.js:570386-570665 placement
var GH_REPO_CREATE_PATTERN = /\bgh\s+repo\s+(?:create|new)\b/,
  GH_REPO_CREATE_VALUE_FLAGS = new Set([
    "-d",
    "--description",
    "-h",
    "--homepage",
    "-t",
    "--team",
    "-p",
    "--template",
    "-s",
    "--source",
    "-r",
    "--remote",
    "-g",
    "--gitignore",
    "-l",
    "--license",
  ]),
  GH_REPO_VISIBILITY_FLAGS = new Map([
    ["--public", "public"],
    ["--private", "private"],
    ["--internal", "internal"],
  ]);
/**
 * （误归 deepLink）从 Bash 命令中解析每个 gh repo create 的仓库名与可见性，用于上报 tengu_gh_repo_created。
 */
//@ chunk-s61vbvea.js:570665-571016 placement = buildDeepLink (0.415)
function parseGhRepoCreateCommands(action) {
  if (!GH_REPO_CREATE_PATTERN.test(action)) return [];
  let results = [];
  for (let r of splitCommand(action)) {
    let argv = getCommandArgv(r);
    if (argv[0] !== "gh" || argv[1] !== "repo" || (argv[2] !== "create" && argv[2] !== "new")) continue;
    let repo, visibility;
    for (let index = 3; index < argv.length; index++) {
      let arg = argv[index],
        R = GH_REPO_VISIBILITY_FLAGS.get(arg);
      if (R !== void 0) visibility = R;
      else if (arg.startsWith("-")) {
        if (!arg.includes("=") && GH_REPO_CREATE_VALUE_FLAGS.has(arg)) index++;
      } else if (repo === void 0) repo = arg;
    }
    results.push({ repo: repo, visibility: visibility });
  }
  return results;
}
//@ chunk-s61vbvea.js:571016-571081 layout
var regExp_12 = new RegExp(`^https://github\\.com/(${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN})/?$`, "gm");
/**
 * 在输出中的仓库名里找与命令参数匹配的唯一一个。
 */
//@ chunk-s61vbvea.js:571081-571279 layout
function matchCreatedRepo(e, n, r) {
  let s =
    e === void 0
      ? r
        ? n
        : []
      : n.filter((h) =>
          e.includes("/")
            ? h.toLowerCase() === e.toLowerCase()
            : h.slice(h.indexOf("/") + 1).toLowerCase() === e.toLowerCase(),
        );
  return s.length === 1 ? s[0] : void 0;
}
/**
 * 识别 gh repo create 创建的仓库并记 tengu_gh_repo_created（可见性、仓库哈希）。
 */
//@ chunk-s61vbvea.js:571279-571614 layout
function logReposCreated(e, n) {
  if (n === void 0) return;
  let r = parseGhRepoCreateCommands(e);
  if (r.length === 0) return;
  let h = [...uniq([...n.matchAll(regExp_12)].map((y) => y[1]))];
  for (let { repo: repo, visibility: visibility } of r) {
    let w = matchCreatedRepo(repo, h, r.length === 1);
    if (w === void 0) continue;
    h.splice(h.indexOf(w), 1);
    let R = repo !== void 0 && regExp_11.test(repo) ? repo : void 0;
    logEvent("tengu_gh_repo_created", { visibility: fromEnumOpt(visibility), repo_hash: gn(R ?? w) });
  }
}
/**
 * PR/MR URL 正则（GitHub/GitHub Enterprise/Bitbucket/GitLab）与 Gerrit 变更 URL、remote: 输出行正则。
 */
//@ chunk-s61vbvea.js:571614-571987 layout
var PR_URL_RE = /https?:\/\/[^/\s"]+\/([^\s"]+?)\/(?:pull|pull-requests|-\/merge_requests)\/(\d+)/,
  GERRIT_CHANGE_URL_RE = new RegExp(
    String.raw`https://${Ahs}/c/((?:${REPO_NAME_PATTERN}/)*${REPO_NAME_PATTERN})/\+/(\d{1,9})(?!\d)`,
  ),
  regExp_13 = new RegExp(String.raw`^remote:\s+(${GERRIT_CHANGE_URL_RE.source})`, "m"),
  GITLAB_MR_REMOTE_RE =
    /^remote:[ \t]+View merge request for \S+:[ \t]*\r?\n[ \t]*remote:[ \t]+(https?:\/\/[^/\s"]+\/[^\s"]+?\/-\/merge_requests\/\d{1,9})(?!\d)/m;
/**
 * 从 URL 解析 PR 编号、仓库、提供方。
 */
//@ chunk-s61vbvea.js:571987-572147 fingerprint = parsePrUrl (0.878)
function parsePrUrl_2(url) {
  let n = url.match(PR_URL_RE) ?? url.match(GERRIT_CHANGE_URL_RE);
  if (n?.[1] && n?.[2])
    return {
      prNumber: parseInt(n[2], 10),
      prUrl: n[0],
      prRepository: n[1],
      provider: detectPrProvider(n[0]),
    };
  return null;
}
/**
 * 按 URL 判断 PR 提供方：gitlab / gerrit / bitbucket / github / github-enterprise。
 */
//@ chunk-s61vbvea.js:572147-572400 layout
function detectPrProvider(e) {
  if (e.includes("/-/merge_requests/")) return "gitlab";
  if (regExp_18.test(e)) return "gerrit";
  if (e.includes("/pull-requests/")) return "bitbucket";
  let n;
  try {
    n = new URL(e).hostname;
  } catch {
    return "github-enterprise";
  }
  return isGithubDotCom(n) ? "github" : "github-enterprise";
}
//@ chunk-s61vbvea.js:572400-572560 layout
var regExp_14 = new RegExp(
  `^https?://${_Sr}(?::\\d{1,5})?/(?:${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN}/(?:pull|pull-requests|cr)|projects/${REPO_NAME_PATTERN}/repos/${REPO_NAME_PATTERN}/pull-requests|${Ths}` +
    String.raw`)/\d+$`,
);
//@ chunk-s61vbvea.js:572560-572624 layout
function isValidPrUrl(e) {
  return e.length <= L8e && (regExp_14.test(e) || regExp_18.test(e));
}
//@ chunk-s61vbvea.js:572624-572685 layout
var pB = /^(?!HEAD$)(?!-)(?!.*@\{)[A-Za-z0-9._\/+@#-]{1,255}$/;
/**
 * git 分支名安全检查（切分误归 utils/tasks）。
 */
//@ chunk-s61vbvea.js:572685-572831 layout = getTaskListLockPath (1)
function isSafeBranchName(taskListId) {
  return (
    pB.test(taskListId) &&
    !taskListId.includes("..") &&
    !taskListId.endsWith(".") &&
    taskListId.split("/").every((n) => n !== "" && !n.startsWith(".") && !n.endsWith(".lock"))
  );
}
/**
 * PR URL 有效时发出 code_change_published 系统事件（切分误归）。
 */
//@ chunk-s61vbvea.js:572831-573119 layout
function announceCodeChangePublished(e) {
  if (!isValidPrUrl(e.prUrl)) return !1;
  return (
    enqueueTaskNotification({
      type: "system",
      subtype: "code_change_published",
      provider: e.provider,
      url: e.prUrl,
      repo: e.prRepository,
      identifier: e.identifier,
      action: e.action,
      ...((e.provider === "gerrit" || e.action === "created") &&
        e.branch &&
        isSafeBranchName(e.branch) && { branch: e.branch }),
    }),
    !0
  );
}
/**
 * 根据解析出的 git 动作（commit、push 及推送分支、merge/rebase）发出 vcs_state_changed 系统事件。
 */
//@ chunk-s61vbvea.js:573119-573682 layout
function emitVcsStateChanges(e, n, r) {
  let s = [];
  if (e.commit) s.push({ kind: "commit", branch: e.commit.branch });
  let replaced = r.command.replace(fo, " ");
  if (!e.push && r.exitCode === 0 && GIT_PUSH_RE.test(replaced) && !DRY_RUN_FLAG_RE.test(Zl(replaced)))
    s.push({ kind: "push" });
  if (e.push) {
    let S = parsePushedBranches(n),
      filtered = S.filter(dp);
    if (filtered.length < Math.max(S.length, 1)) s.push({ kind: "push" });
    for (let R of filtered) s.push({ kind: "push", branch: R });
  }
  if (e.branch) {
    let S = { merged: "merge", rebased: "rebase" };
    s.push({ kind: S[e.branch.action] });
  }
  for (let S of s)
    enqueueTaskNotification({
      type: "system",
      subtype: "vcs_state_changed",
      kind: S.kind,
      ...("branch" in S && S.branch !== void 0 && { branch: S.branch }),
      cwd: r.cwd,
    });
}
//@ chunk-s61vbvea.js:573682-573767 file-local
function findLastPrUrl(stdout) {
  let match = stdout.match(new RegExp(PR_URL_RE.source, "g"));
  return match ? parsePrUrl_2(match.at(-1)) : null;
}
//@ chunk-s61vbvea.js:573767-573777 layout
var MAX_TRACKED_PRS = 10;
//@ chunk-s61vbvea.js:573777-573912 layout
function dedupePrUrls(e, n = MAX_TRACKED_PRS) {
  let r = new Map();
  for (let s of e) {
    let h = parsePrUrl_2(s);
    if (h) (r.delete(h.prUrl), r.set(h.prUrl, h));
  }
  return [...r.values()].slice(-n);
}
/**
 * 从文本里提取全部 PR URL，按 prUrl 去重保留最新，最多 10 个。
 */
//@ chunk-s61vbvea.js:573912-573982 file-local
function extractPrUrls(e, n) {
  return dedupePrUrls(e.match(new RegExp(PR_URL_RE.source, "g")) ?? [], n);
}
//@ chunk-s61vbvea.js:573982-574097 layout
function recordPrActions(e, n) {
  let r = 0;
  for (let s of e) {
    let h = announceCodeChangePublished({ ...s, identifier: String(s.prNumber), action: n });
    r += h ? 1 : 0;
  }
  return r;
}
//@ chunk-s61vbvea.js:574097-574109 layout
var SPILLED_OUTPUT_TAIL_BYTES = 8192;
/**
 * 输出被落盘时，把落盘文件末尾（最多 8 KiB）拼到内存输出后面再扫描 git 动作；读不到时只扫开头。
 */
//@ chunk-s61vbvea.js:574109-574337 layout
async function withSpilledOutputTail(e, n) {
  if (!n) return e;
  try {
    let { content: content } = await tailTaskOutput(n, SPILLED_OUTPUT_TAIL_BYTES);
    return content
      ? `${e}
${content}`
      : e;
  } catch (error) {
    if (isENOENT(error));
    else if (isSadResourceErrno(error) || isEnvFsErrno(error))
      logForDebugging(`withSpilledOutputTail ${getErrnoCode(error)}: scanning head only`, { level: "error" });
    else logError(error);
    return e;
  }
}
//@ chunk-s61vbvea.js:574337-574440 layout
function normalizeTerminalOutput(e) {
  return e
    .replace(/\x1b\[[0-9;]*K/g, "")
    .replace(
      /\x1b\[[0-9]*G/g,
      `
`,
    )
    .replace(
      /\r/g,
      `
`,
    );
}
//@ chunk-s61vbvea.js:574440-574520 layout
var GIT_COMMIT_SUMMARY_RE = /^\[(?:([\w./-]+)|detached HEAD)(?: \(root-commit\))? ([0-9a-f]{4,})\]/m;
//@ chunk-s61vbvea.js:574520-574632 layout
function parseCommitSummary(e) {
  let match = normalizeTerminalOutput(e).match(GIT_COMMIT_SUMMARY_RE);
  if (match?.[2] === void 0) return;
  return { sha: match[2], ...(match[1] !== void 0 && { branch: match[1] }) };
}
/**
 * 从提交输出解析 sha 与分支，必要时把短 sha 扩展成完整 commitId。
 */
//@ chunk-s61vbvea.js:574632-574827 layout
async function resolveCommitInfo(e, n, r) {
  let s = parseCommitSummary(e);
  if (!s) return r === void 0 ? void 0 : readCommitAppendedToHeadReflog(r);
  let h = n === null ? null : await getHeadForDir(n);
  return { commitId: h?.startsWith(s.sha) ? h : s.sha, ...(s.branch !== void 0 && { branch: s.branch }) };
}
//@ chunk-s61vbvea.js:574827-574916 layout
var GIT_PUSH_REF_RE = /^\s*[+\-*!= ]?\s*(?:\[new branch\]|[0-9a-f]+\.\.+[0-9a-f]+)\s+\S+\s*->\s*(\S+)/m;
/**
 * 从 git push 输出（"To <remote>" 之后的缩进行）解析被推送的分支名。
 */
//@ chunk-s61vbvea.js:574916-575150 layout
function parsePushedBranches(e) {
  let filtered = normalizeTerminalOutput(e)
      .split(
        `
`,
      )
      .filter((s) => s !== ""),
    r = new Set();
  for (let s = 0; s < filtered.length; s++) {
    if (!filtered[s].startsWith("To ")) continue;
    for (let h = s + 1; h < filtered.length && /^\s/.test(filtered[h]); h++) {
      let y = filtered[h].match(GIT_PUSH_REF_RE)?.[1];
      if (y) r.add(y);
    }
  }
  return [...r];
}
//@ chunk-s61vbvea.js:575150-575473 layout
function isGhApiPullCreate(e) {
  let n = (e.replace(fo, " ").split(/\bgh\s+api\b/)[1] ?? "").split(/[&|;\n]/)[0];
  if (!n || !/(?:^|\s)\/?repos\/[^\s/]+\/[^\s/]+\/pulls(?=\s|$)/.test(n)) return !1;
  let r = n.match(/(?:^|\s)(?:-X|--method)(?:\s+|=)([A-Za-z]+)/)?.[1];
  return r ? r.toUpperCase() === "POST" : /(?:^|\s)(?:-f|-F|--field|--raw-field)(?:\s|=)/.test(n);
}
/**
 * 取 git push 之后到分隔符前的参数串。
 */
//@ chunk-s61vbvea.js:575473-575539 layout
function Zl(e) {
  return (e.split(GIT_PUSH_RE)[1] ?? "").split(/[&|;\n]/)[0] ?? "";
}
//@ chunk-s61vbvea.js:575539-575680 layout = parsePrUrl (0.792)
function parsePrNumberFromText(url) {
  let match = url.match(/[Pp]ull request (?:(\S+)#)?#?(\d{1,9})\b/);
  return match?.[2] ? { prNumber: parseInt(match[2], 10), prRepository: match[1] } : void 0;
}
/**
 * 取 git <verb> 后第一个非选项参数（遇到重定向/分隔符停止）。
 */
//@ chunk-s61vbvea.js:575680-575857 file-local
function parseRefFromCommand(command, verb) {
  let after = command.split(gitCmdRe(verb))[1];
  if (!after) return;
  for (let s of after.trim().split(/\s+/)) {
    if (/^(?:[\d*]*[<>]|[&|;])/.test(s)) break;
    if (s.startsWith("-")) continue;
    return s;
  }
  return;
}
/**
 * 从命令与输出识别 git/gh 操作：提交（sha、committed/amended/cherry-picked、分支）、推送分支、合并/变基、PR 创建/动作等，生成结果的 gitOperation 字段（给客户端展示，不给模型）。
 */
//@ chunk-s61vbvea.js:575857-576546 fingerprint = detectGitOperation (1)
function detectGitOperation(command, output) {
  let result = {},
    isCherryPick = GIT_CHERRY_PICK_RE.test(command);
  if (GIT_COMMIT_RE.test(command) || isCherryPick) {
    let sha = parseCommitSummary(output);
    if (sha)
      result.commit = {
        sha: sha.sha,
        kind: isCherryPick ? "cherry-picked" : /--amend\b/.test(command) ? "amended" : "committed",
        ...(sha.branch !== void 0 && { branch: sha.branch }),
      };
  }
  if (GIT_PUSH_RE.test(command)) {
    let branch = Zl(command);
    if (!DRY_RUN_FLAG_RE.test(branch)) {
      let S = output.match(GIT_PUSH_REF_RE)?.[1];
      if (S) result.push = { branch: S };
    }
  }
  if (GIT_MERGE_RE.test(command) && /(Fast-forward|Merge made by)/.test(output)) {
    let ref = parseRefFromCommand(command, "merge");
    if (ref) result.branch = { ref: ref, action: "merged" };
  }
  if (GIT_REBASE_RE.test(command) && /Successfully rebased/.test(output)) {
    let ref = parseRefFromCommand(command, "rebase");
    if (ref) result.branch = { ref: ref, action: "rebased" };
  }
  let h = getPrAction(command);
  if (h) {
    let y = findLastPrUrl(output);
    if (y) result.pr = { number: y.prNumber, url: y.prUrl, action: h };
    else if (GH_PR_ACTIONS.some((S) => S.re.test(command))) {
      let pr = parsePrNumberFromText(output);
      if (pr) result.pr = { number: pr.prNumber, action: h };
    }
  }
  return result;
}
//@ chunk-s61vbvea.js:576546-576590 layout
var _B = 8,
  bB = 5,
  wB = /\b(?:git|gh|glab|curl)\b/;
/**
 * 待查推送分支表的键（cwd + 分支）与"可跟踪分支"判定（排除 HEAD、选项、纯数字）。
 */
//@ chunk-s61vbvea.js:576590-576678 layout
var qk = (e, n) => `${e}\x00${n}`,
  dp = (e) => e !== "HEAD" && !e.startsWith("-") && !/^#?\d+$/.test(e);
/**
 * 记下推送的分支（待查 PR），有上限。
 */
//@ chunk-s61vbvea.js:576678-576821 layout
function rememberPushedBranch(e, n, r) {
  if (isEssentialTrafficOnly()) return;
  let s = qk(n, r);
  if ((e.delete(s), e.size >= _B)) e.delete(e.keys().next().value);
  e.set(s, { cwd: n, branch: r, attempts: 0 });
}
//@ chunk-s61vbvea.js:576821-576880 layout
function EB(e, n) {
  for (let [r, s] of e) if (s.cwd === n) e.delete(r);
}
/**
 * 推送后按是否已有 PR 记下或清除该分支。
 */
//@ chunk-s61vbvea.js:576880-576998 layout
async function trackPushedBranch(e, n, r, s) {
  let h = await s,
    y = await r;
  if (y === void 0 || !dp(y)) return;
  if (h) e.delete(qk(n, y));
  else rememberPushedBranch(e, n, y);
}
/**
 * 命令只包含 gh pr create / glab mr create（及 auth/config/api user）且非 dry-run。
 */
//@ chunk-s61vbvea.js:576998-577268 layout
function isPrCreateOnlyCommand(e) {
  let n = e.match(/\b(?:gh|glab)\s+\S+(?:\s+\S+)?/g) ?? [],
    r = /^gh\s+pr\s+create$|^glab\s+mr\s+create$/,
    s = /^(?:gh|glab)\s+(?:auth|config)\b|^(?:gh|glab)\s+api\s+\/?user$/;
  return !e.includes("--dry-run") && n.some((h) => r.test(h)) && n.every((h) => r.test(h) || s.test(h));
}
/**
 * 记录新建的 PR：发遥测 tengu_git_created_prs、异步登记 PR、清理当前目录的待查推送分支。
 */
//@ chunk-s61vbvea.js:577268-577553 layout
function recordCreatedPr(e, n = "created", r = !1, s = Promise.resolve(void 0)) {
  let h = e ? findLastPrUrl(e) : null;
  if (!e || !h) return null;
  let y =
    (isValidPrUrl(h.prUrl) ? 1 : 0) + (r ? recordPrActions(extractPrUrls(e).slice(0, -1), "created") : 0);
  return (
    logEvent("tengu_git_created_prs", { printedPrs: extractPrUrls(e, 1 / 0).length, announcedPrs: y }),
    tr(s.then((S) => linkPrToSession(h, n, S))),
    EB(getPendingBranchLinks(), getCwd()),
    h
  );
}
//@ chunk-s61vbvea.js:577553-577565 layout
var RB = 2000;
/**
 * 从 pr create 命令的 --head/--source-branch 取分支，否则读当前分支（带超时）。
 */
//@ chunk-s61vbvea.js:577565-578168 layout
function prHeadBranch(e, n) {
  let replaced = e.replace(fo, (w) => " ".repeat(w.length)),
    s = n === "gh" ? /\bgh\s+pr\s+create\b/g : /\bglab\s+mr\s+create\b/g,
    h = [...replaced.matchAll(s)].at(-1)?.index;
  if (h === void 0) return Promise.resolve(void 0);
  let match = (replaced.slice(h).split(/[&|;\n]/)[0] ?? "").match(
    n === "gh" ? /(?:^|\s)(?:--head|-H)(?==|\s)/ : /(?:^|\s)(?:--source-branch|-s)(?==|\s)/,
  );
  if (match?.index !== void 0) {
    let match_2 = e
        .slice(h + match.index + match[0].length)
        .match(/^(?:=|\s+)(?:"([^"\\$`]*)"|'([^']*)'|([^\s"'`$;&|]+))/),
      R = match_2?.[1] ?? match_2?.[2] ?? match_2?.[3],
      x = n === "gh" ? R?.replace(/^[^:]*:/, "") : R;
    if (x && isSafeBranchName(x)) return Promise.resolve(x);
  }
  return withDeadline(
    getBranch(getCwd()).catch(() => {
      return;
    }),
    RB,
  );
}
/**
 * 开关 tengu_record_created_pr_to_ccr 打开时把新 PR 记录到 CCR（远程会话）。
 */
//@ chunk-s61vbvea.js:578168-578336 layout
function recordCreatedPrToCcr(e) {
  if (
    !e ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_record_created_pr_to_ccr", !1) ||
    !isValidPrUrl(e.prUrl)
  )
    return;
  let n = getCwd();
  tr(import("./chunk-fnctemcf.js").then((r) => r.recordCreatedPrToCcr(e, n)));
}
/**
 * 有相关输出时重新查询当前目录待查分支的 PR（有次数上限）。
 */
//@ chunk-s61vbvea.js:578336-578558 layout
function recheckPendingBranches(e) {
  let n = getPendingBranchLinks();
  if (n.size === 0 || !wB.test(e)) return;
  let r = getCwd();
  for (let [s, h] of n) {
    if (h.cwd !== r) continue;
    if (h.attempts >= bB) {
      n.delete(s);
      continue;
    }
    (h.attempts++,
      tr(
        getNpmDistTags("pushed", h.branch).then((y) => {
          if (y) n.delete(s);
        }),
      ));
  }
}
//@ chunk-s61vbvea.js:578558-578569 layout
var vB = 1e4;
/**
 * 命令是否通过 curl POST 或 gh api 创建 PR/MR。
 */
//@ chunk-s61vbvea.js:578569-578785 layout
function isApiPrCreate(e, n) {
  return (
    (/\bcurl\b/.test(e) &&
      (/-X\s*POST\b/i.test(e) || /--request\s*=?\s*POST\b/i.test(e) || /\s-d\s/.test(e)) &&
      /https?:\/\/[^\s'"]*\/(?:pulls|pull-requests|merge[-_]requests)(?!\/\d)/i.test(e)) ||
    (!n && isGhApiPullCreate(e))
  );
}
/**
 * 命令在其他进程执行时，仅根据命令文本累加提交数与 PR 创建数计数器。
 */
//@ chunk-s61vbvea.js:578785-578996 layout
function countGitOpsFromCommand(e) {
  if (e.length > vB) return;
  if (GIT_COMMIT_RE.test(e)) getCommitCounter()?.add(1);
  let n = [GH_PR_ACTIONS.find((s) => s.re.test(e)), GLAB_MR_ACTIONS.find((s) => s.re.test(e))],
    r = count(n, (s) => s?.action === "created") + (isApiPrCreate(e, n.some(Boolean)) ? 1 : 0);
  if (r > 0) getPrCounter()?.add(r);
}
/**
 * 命令成功（退出码 0）后跟踪 git 操作：遥测 tengu_git_operation（commit/commit_amend/push/merge/rebase/pr_*），累加提交/PR 计数，识别 PR URL 与 gh pr checkout，记录推送分支以便稍后查 PR；返回是否解决了 PR（BashTool 据此 markPrResolvedThisSession）。
 */
//@ chunk-s61vbvea.js:578996-581324 fingerprint = trackGitOperations (0.49)
function trackGitOperations(e, n, r, s) {
  if (r !== 0) return { prResolved: !1 };
  let y = !1;
  try {
    logReposCreated(n, s);
  } catch (error) {
    logError(error);
  }
  if (GIT_COMMIT_RE.test(n)) {
    if ((logEvent("tengu_git_operation", { operation: lit("commit") }), n.match(/--amend\b/)))
      logEvent("tengu_git_operation", { operation: lit("commit_amend") });
    getCommitCounter()?.add(1);
  }
  let replaced = n.replace(fo, "''"),
    w = GIT_PUSH_RE.test(replaced) || GIT_CL_UPLOAD_RE.test(replaced);
  if (GIT_PUSH_RE.test(n) || w)
    (logEvent("tengu_git_operation", { operation: lit("push") }), zM().bump.emit());
  let found = GH_PR_ACTIONS.find((ee) => ee.re.test(n)),
    prHit = GLAB_MR_ACTIONS.find((ee) => ee.re.test(n)),
    P = found ?? prHit,
    prInfo = getPrAction(n),
    G = getTextAfterLastRuleMatch(n);
  if (P) (logEvent("tengu_git_operation", { operation: fromEnum(P.op) }), zM().bump.emit());
  let L = ghRepoCreateArgs(n);
  if (L !== null) {
    if (
      (logEvent("tengu_git_operation", { operation: lit("pr_review") }),
      /--approve\b/.test(L) || /(?:^|\s)-a(?=\s|$)/.test(L))
    )
      logEvent("tengu_git_operation", { operation: lit("pr_review_approve") });
    else if (/--request-changes\b/.test(L) || /(?:^|\s)-r(?=\s|$)/.test(L))
      logEvent("tengu_git_operation", { operation: lit("pr_review_request_changes") });
    zM().bump.emit();
  }
  if (prInfo === "merged" || prInfo === "closed") y = !0;
  if (found?.action === "created") {
    if ((getPrCounter()?.add(1), prHit?.action === "created")) getPrCounter()?.add(1);
    let replaced = n.replace(fo, " "),
      matches = /(?:^|\s)--dry-run(?=\s|$)/.test(replaced),
      se = recordCreatedPr(s, G, isPrCreateOnlyCommand(n), prHeadBranch(n, "gh"));
    if (!matches) recordCreatedPrToCcr(se);
  } else if (prHit?.action === "created")
    (getPrCounter()?.add(1), recordCreatedPr(s, G, isPrCreateOnlyCommand(n), prHeadBranch(n, "glab")));
  else if (G && s) {
    let ee = findLastPrUrl(s);
    if (ee)
      tr(
        linkPrToSession(ee, G).then((ae) =>
          ae === "linked" ? logFeatureOk("pr_contribute_link") : logFeatureBad("pr_contribute_link", ae),
        ),
      );
    else if (!prHit || found) {
      let ae = s.match(/^\u2713.*$/m)?.[0],
        se = ae ? parsePrNumberFromText(ae) : void 0;
      if (se)
        tr(
          getNpmDistTags(G, String(se.prNumber), se.prRepository).then((re) =>
            re ? logFeatureOk("pr_contribute_link") : logFeatureBad("pr_contribute_link", "gh_view_failed"),
          ),
        );
    }
  }
  let match = n.match(GH_PR_CHECKOUT_RE),
    Q =
      w && !P && s && !DRY_RUN_FLAG_RE.test(Zl(n))
        ? dedupePrUrls(
            [regExp_13, GITLAB_MR_REMOTE_RE]
              .flatMap((ee) => [...s.matchAll(new RegExp(ee, "gm"))])
              .sort((ee, ae) => ee.index - ae.index)
              .map((ee) => ee[1] ?? ""),
          )
        : [],
    at = Q.at(-1);
  if (match?.[1]) tr(getNpmDistTags("checked-out", match[1]));
  else if (at)
    (recordPrActions(Q.slice(0, -1), "pushed"),
      tr(
        at.provider === "gerrit"
          ? getBranch(getCwd()).then((ee) => linkPrToSession(at, "pushed", ee))
          : linkPrToSession(at, "pushed"),
      ));
  else if (GIT_PUSH_RE.test(n) && !P) {
    let ee = Zl(n),
      ae = ee.match(/\S+/g)?.filter((ie) => !ie.startsWith("-"))[1],
      se = ae ? ae.indexOf(":") : -1,
      re = ae && se > 0 && se < ae.length - 1 ? ae.slice(se + 1).replace(/^refs\/heads\//, "") : void 0,
      sessionId = getCwd(),
      Se = getPendingBranchLinks(),
      matches = DRY_RUN_FLAG_RE.test(ee),
      we = matches || isEssentialTrafficOnly() ? void 0 : getBranch(sessionId);
    if (re && dp(re) && !matches) tr(trackPushedBranch(Se, sessionId, re, getNpmDistTags("pushed", re)));
    tr(trackPushedBranch(Se, sessionId, we, matches ? Promise.resolve(!1) : getNpmDistTags("pushed")));
  }
  if (isApiPrCreate(n, P !== void 0))
    (logEvent("tengu_git_operation", { operation: lit("pr_create") }),
      getPrCounter()?.add(1),
      zM().bump.emit(),
      recordCreatedPr(s));
  return (recheckPendingBranches(n), { prResolved: y });
}
/**
 * 登记后台 Promise（吞掉错误），供退出前等待。
 */
//@ chunk-s61vbvea.js:581324-581411 layout
function tr(e) {
  let n = getPendingPrLinks(),
    r = e.catch(() => {
      return;
    });
  (n.add(r), r.finally(() => n.delete(r)));
}
//@ chunk-s61vbvea.js:581411-581423 placement
var CB = 2000;
//@ chunk-s61vbvea.js:581423-581517 placement
async function Gvt() {
  let e = getPendingPrLinks();
  if (e.size === 0) return;
  await withDeadline(Promise.allSettled([...e]), CB);
}
//@ chunk-s61vbvea.js:581517-581604 placement
function Yqo(e) {
  if (isEssentialTrafficOnly() || !isWorkspacePersistedTrusted(getCwd())) return Promise.resolve();
  let n = announcePrStarted(e);
  return (tr(n), n);
}
//@ chunk-s61vbvea.js:581604-582063 placement
async function announcePrStarted(e) {
  let [n, r] = await Promise.all([getPrStatus(e), getBranch(getCwd())]);
  if (n === "fetch-failed") {
    logFeatureBad("pr_started_announce", "lookup_failed");
    return;
  }
  if (n === null || typeof n === "string") {
    let h = await findGerritReview();
    if (h)
      (logFeatureOk("pr_started_announce"),
        announceCodeChangePublished({
          provider: "gerrit",
          prUrl: h.url,
          prRepository: h.project,
          identifier: String(h.number),
          action: "started",
          branch: r,
        }));
    return;
  }
  logFeatureOk("pr_started_announce");
  let s = parsePrUrl_2(n.url);
  if (!s) return;
  announceCodeChangePublished({ ...s, identifier: String(n.number), action: "started", branch: r });
}
/**
 * 把 PR 与当前会话关联并发通知，返回 linked/no_session/url_rejected。
 */
//@ chunk-s61vbvea.js:582063-582400 placement
async function linkPrToSession(e, n, r) {
  if (!isValidPrUrl(e.prUrl)) return "url_rejected";
  let [{ linkSessionToPR: s }, { getSessionId: h }] = await Promise.all([
      import("./chunk-hs5khexj.js"),
      import("./chunk-nj7t53r7.js"),
    ]),
    y = h();
  if (!y) return "no_session";
  return (
    announceCodeChangePublished({ ...e, identifier: String(e.prNumber), action: n, branch: r }),
    await s(y, e.prNumber, e.prUrl, e.prRepository),
    "linked"
  );
}
/**
 * gh 命令、GitHub 限流错误正则与提醒间隔。
 */
//@ chunk-s61vbvea.js:582400-582603 placement
var GH_COMMAND_RE =
    /(?:^|[;&|]|\b(?:then|do)\b)\s*gh\s+(?!auth\b|help\b|version\b|alias\b|completion\b|config\b)/,
  GITHUB_RATE_LIMIT_RE =
    /API rate limit (?:already )?exceeded|exceeded a secondary rate limit|\bRATE_LIMITED\b/i,
  RATE_LIMIT_REMINDER_INTERVAL_MS = 60000;
//@ chunk-s61vbvea.js:582603-582628 placement
class Xqo {
  backoffUntil = 0;
}
//@ chunk-s61vbvea.js:582628-583010 placement
function GITHUB_RATE_LIMIT_REMINDER(e, n, r) {
  if (!GH_COMMAND_RE.test(e) || !GITHUB_RATE_LIMIT_RE.test(n) || Date.now() < r.backoffUntil) return;
  return (
    (r.backoffUntil = Date.now() + RATE_LIMIT_REMINDER_INTERVAL_MS),
    "<system-reminder>GitHub API rate limit exceeded (5,000/hr shared across all tools and agents). Run `gh api rate_limit --jq .resources` and sleep until reset before further gh calls. If polling in a loop, use ScheduleWakeup instead of retrying.</system-reminder>"
  );
}

export {
  GH_PR_ACTIONS,
  GLAB_MR_ACTIONS,
  getPrAction,
  PR_URL_RE,
  parsePrUrl_2,
  Gvt,
  Yqo,
  gitOperationSchema,
  withSpilledOutputTail,
  trackGitOperations,
  detectGitOperation,
  emitVcsStateChanges,
  regExp_11,
  linkPrToSession,
  isValidPrUrl,
  isGitCommitCommand,
  resolveCommitInfo,
  countGitOpsFromCommand,
  GITHUB_RATE_LIMIT_REMINDER,
  Xqo,
  isSafeBranchName,
};
