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
import { objectSchema, stringSchema, _enum, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  REPO_NAME_PATTERN,
  GOOGLESOURCE_HOST_PATTERN,
  regExp as regExp_18,
  HOSTNAME_PATTERN,
  GITLAB_MR_PATH_PATTERN,
  MAX_REPO_URL_CHARS,
} from "../../utils/detectRepository.js";
import { splitCommand, getCommandArgv } from "../../utils/bash/commands.js";
import { uniq, count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
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
import { currentPrStatusFetcher, getPrStatus, findGerritReview } from "../../utils/ghPrStatus.js";
import { getTextAfterLastRuleMatch } from "../../services/teamMemorySync/secretScanner.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isWorkspacePersistedTrusted } from "../../utils/config.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:567893-567998 affinity
/**
 * 生成匹配 "git [-c k=v|--opt=v]* <子命令>" 的正则。
 */
function gitCmdRe(verb, suffix = "") {
  return new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--[^\\s=]+=\\S+)*\\s+${verb}\\b${suffix}`);
}
//@ chunk-s61vbvea.js:567998-568018 fingerprint (2.1.88 match: GIT_COMMIT_RE, 1)
var GIT_COMMIT_RE; // deferred: uses gitCmdRe of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:567998", () => {
  GIT_COMMIT_RE = gitCmdRe("commit");
});
//@ chunk-s61vbvea.js:568018-568052 layout
/**
 * 命令是否包含 git commit。
 */
function isGitCommitCommand(command) {
  return GIT_COMMIT_RE.test(command);
}
//@ chunk-s61vbvea.js:568052-568590 layout
/**
 * git push / cl upload / cherry-pick / merge / rebase 的命令正则、--dry-run 正则，以及 gitOperation 输出 schema（commit{sha,kind,branch}、push、branch、pr…）。
 */
var GIT_PUSH_RE; // deferred: uses gitCmdRe of its import cycle while loading; runs once the cycle is complete
var GIT_CL_UPLOAD_RE;
var DRY_RUN_FLAG_RE;
var GIT_CHERRY_PICK_RE;
var GIT_MERGE_RE;
var GIT_REBASE_RE;
var gitOperationSchema;
deferInit("chunk-s61vbvea.js:568052", () => {
  GIT_PUSH_RE = gitCmdRe("push");
  GIT_CL_UPLOAD_RE = gitCmdRe(String.raw`cl\s+upload`);
  DRY_RUN_FLAG_RE = /(?:^|\s)(?:-n|--dry-run)(?=\s|$)/;
  GIT_CHERRY_PICK_RE = gitCmdRe("cherry-pick");
  GIT_MERGE_RE = gitCmdRe("merge", "(?!-)");
  GIT_REBASE_RE = gitCmdRe("rebase");
  gitOperationSchema = DoctorLazy(() =>
    objectSchema({
      commit: objectSchema({
        sha: stringSchema(),
        kind: _enum(["committed", "amended", "cherry-picked"]),
        branch: stringSchema().optional(),
      }).optional(),
      push: objectSchema({
        branch: stringSchema(),
      }).optional(),
      branch: objectSchema({
        ref: stringSchema(),
        action: _enum(["merged", "rebased"]),
      }).optional(),
      pr: objectSchema({
        number: numberSchema(),
        url: stringSchema().optional(),
        action: _enum([
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
});
//@ chunk-s61vbvea.js:568590-568658 layout
/**
 * 生成匹配 "gh pr <子命令>" 的正则。
 */
function ghPrCmdRe(subcmd, suffix = "") {
  return new RegExp(`\\bgh\\s+pr\\s+${subcmd}\\b${suffix}`);
}
//@ chunk-s61vbvea.js:568658-569467 fingerprint (2.1.88 match: GH_PR_ACTIONS, 0.738)
/**
 * gh pr 子命令表 GH_PR_ACTIONS（create/edit/merge/comment/close/ready…→ 动作与遥测 op），以及 gh pr checkout N 正则；tc 为 glab mr 等同类表。
 */
var GH_PR_CHECKOUT_RE; // deferred: uses ghPrCmdRe of its import cycle while loading; runs once the cycle is complete
var regExp_11;
var GH_PR_ACTIONS;
var GLAB_MR_ACTIONS;
deferInit("chunk-s61vbvea.js:568658", () => {
  GH_PR_CHECKOUT_RE = ghPrCmdRe("checkout", String.raw`[^&|;]*\s(\d+)(?=\s|$|[&|;])`);
  regExp_11 = new RegExp(`^${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN}$`);
  GH_PR_ACTIONS = [
    {
      re: ghPrCmdRe("create"),
      action: "created",
      op: "pr_create",
    },
    {
      re: ghPrCmdRe("edit"),
      action: "edited",
      op: "pr_edit",
    },
    {
      re: ghPrCmdRe("merge"),
      action: "merged",
      op: "pr_merge",
    },
    {
      re: ghPrCmdRe("comment"),
      action: "commented",
      op: "pr_comment",
    },
    {
      re: ghPrCmdRe("close"),
      action: "closed",
      op: "pr_close",
    },
    {
      re: ghPrCmdRe("reopen"),
      action: "reopened",
      op: "pr_reopen",
    },
    {
      re: ghPrCmdRe("ready"),
      action: "ready",
      op: "pr_ready",
    },
  ];
  GLAB_MR_ACTIONS = [
    {
      re: /\bglab\s+mr\s+create\b/,
      action: "created",
      op: "pr_create",
    },
    {
      re: /\bglab\s+mr\s+update\b/,
      action: "edited",
      op: "pr_edit",
    },
    {
      re: /\bglab\s+mr\s+merge\b/,
      action: "merged",
      op: "pr_merge",
    },
    {
      re: /\bglab\s+mr\s+note\b/,
      action: "commented",
      op: "pr_comment",
    },
    {
      re: /\bglab\s+mr\s+close\b/,
      action: "closed",
      op: "pr_close",
    },
    {
      re: /\bglab\s+mr\s+reopen\b/,
      action: "reopened",
      op: "pr_reopen",
    },
  ];
});
//@ chunk-s61vbvea.js:569467-569876 affinity
/**
 * 从命令推断 PR 动作（created/merged/auto-merge-enabled/ready/draft…），兼顾 gh 与 glab。
 */
function getPrAction(command) {
  let action = GH_PR_ACTIONS.find((entry) => entry.re.test(command))?.action;
  let replaced = command.replace(QUOTED_SEGMENT_RE, " ");
  if (action === "merged") {
    if (/--disable-auto\b/.test(replaced)) return "auto-merge-disabled";
    if (/--auto\b/.test(replaced)) return "auto-merge-enabled";
  } else if (action === "ready" && /--undo\b/.test(replaced)) return "draft";
  if (action) return action;
  let action_2 = GLAB_MR_ACTIONS.find((entry) => entry.re.test(command))?.action;
  if (action_2 === "edited") {
    if (/--ready\b/.test(replaced)) return "ready";
    if (/--draft\b/.test(replaced)) return "draft";
  }
  return action_2;
}
//@ chunk-s61vbvea.js:570050-570102 sole-consumer
/**
 * 匹配 gh pr review 命令的正则。
 */
var GH_PR_REVIEW_RE; // deferred: uses ghPrCmdRe of its import cycle while loading; runs once the cycle is complete
var QUOTED_SEGMENT_RE;
deferInit("chunk-s61vbvea.js:570050", () => {
  GH_PR_REVIEW_RE = ghPrCmdRe("review");
  QUOTED_SEGMENT_RE = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
});
//@ chunk-s61vbvea.js:570102-570386 affinity
/**
 * 找到未被注释的 gh repo create 命令，返回其后的参数文本。
 */
function ghRepoCreateArgs(command) {
  let replaced = command.replace(QUOTED_SEGMENT_RE, " ");
  let regExp = new RegExp(GH_PR_REVIEW_RE.source, "g");
  for (let match = regExp.exec(replaced); match !== null; match = regExp.exec(replaced)) {
    let lineStart =
      replaced.lastIndexOf(
        `
`,
        match.index,
      ) + 1;
    if (/(^|\s)#/.test(replaced.slice(lineStart, match.index))) continue;
    return (replaced.slice(match.index + match[0].length).split(/[&|;\n]/)[0] ?? "").split(/\s#/)[0] ?? "";
  }
  return null;
}
//@ chunk-s61vbvea.js:570386-570665 placement
/**
 * 识别 gh repo create/new 命令用的正则、带值选项、可见性选项。
 */
var GH_REPO_CREATE_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GH_REPO_CREATE_VALUE_FLAGS;
var GH_REPO_VISIBILITY_FLAGS;
deferInit("chunk-s61vbvea.js:570386", () => {
  GH_REPO_CREATE_PATTERN = /\bgh\s+repo\s+(?:create|new)\b/;
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
  ]);
  GH_REPO_VISIBILITY_FLAGS = new Map([
    ["--public", "public"],
    ["--private", "private"],
    ["--internal", "internal"],
  ]);
});
//@ chunk-s61vbvea.js:570665-571016 placement (2.1.88 match: buildDeepLink, 0.415)
/**
 * （误归 deepLink）从 Bash 命令中解析每个 gh repo create 的仓库名与可见性，用于上报 tengu_gh_repo_created。
 */
function parseGhRepoCreateCommands(action) {
  if (!GH_REPO_CREATE_PATTERN.test(action)) return [];
  let results = [];
  for (let segment of splitCommand(action)) {
    let argv = getCommandArgv(segment);
    if (argv[0] !== "gh" || argv[1] !== "repo" || (argv[2] !== "create" && argv[2] !== "new")) continue;
    let repo;
    let visibility;
    for (let index = 3; index < argv.length; index++) {
      let arg = argv[index];
      let visibilityFlag = GH_REPO_VISIBILITY_FLAGS.get(arg);
      if (visibilityFlag !== undefined) visibility = visibilityFlag;
      else if (arg.startsWith("-")) {
        if (!arg.includes("=") && GH_REPO_CREATE_VALUE_FLAGS.has(arg)) index++;
      } else if (repo === undefined) repo = arg;
    }
    results.push({
      repo,
      visibility,
    });
  }
  return results;
}
//@ chunk-s61vbvea.js:571016-571081 layout
var regExp_12; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:571016", () => {
  regExp_12 = new RegExp(`^https://github\\.com/(${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN})/?$`, "gm");
});
//@ chunk-s61vbvea.js:571081-571279 layout
/**
 * 在输出中的仓库名里找与命令参数匹配的唯一一个。
 */
function matchCreatedRepo(repo, createdRepos, onlyOneCommand) {
  let candidates =
    repo === undefined
      ? onlyOneCommand
        ? createdRepos
        : []
      : createdRepos.filter((createdRepo) =>
          repo.includes("/")
            ? createdRepo.toLowerCase() === repo.toLowerCase()
            : createdRepo.slice(createdRepo.indexOf("/") + 1).toLowerCase() === repo.toLowerCase(),
        );
  return candidates.length === 1 ? candidates[0] : undefined;
}
//@ chunk-s61vbvea.js:571279-571614 layout
/**
 * 识别 gh repo create 创建的仓库并记 tengu_gh_repo_created（可见性、仓库哈希）。
 */
function logReposCreated(action, output) {
  if (output === undefined) return;
  let ghRepoCreateCommands = parseGhRepoCreateCommands(action);
  if (ghRepoCreateCommands.length === 0) return;
  let reposInOutput = [...uniq([...output.matchAll(regExp_12)].map((match) => match[1]))];
  for (let { repo, visibility } of ghRepoCreateCommands) {
    let createdRepo = matchCreatedRepo(repo, reposInOutput, ghRepoCreateCommands.length === 1);
    if (createdRepo === undefined) continue;
    reposInOutput.splice(reposInOutput.indexOf(createdRepo), 1);
    let repoForHash = repo !== undefined && regExp_11.test(repo) ? repo : undefined;
    logEvent("tengu_gh_repo_created", {
      visibility: fromEnumOpt(visibility),
      repo_hash: shortHash(repoForHash ?? createdRepo),
    });
  }
}
//@ chunk-s61vbvea.js:571614-571987 layout
/**
 * PR/MR URL 正则（GitHub/GitHub Enterprise/Bitbucket/GitLab）与 Gerrit 变更 URL、remote: 输出行正则。
 */
var PR_URL_RE_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GERRIT_CHANGE_URL_RE;
var regExp_13;
var GITLAB_MR_REMOTE_RE;
deferInit("chunk-s61vbvea.js:571614", () => {
  PR_URL_RE_2 = /https?:\/\/[^/\s"]+\/([^\s"]+?)\/(?:pull|pull-requests|-\/merge_requests)\/(\d+)/;
  GERRIT_CHANGE_URL_RE = new RegExp(
    String.raw`https://${GOOGLESOURCE_HOST_PATTERN}/c/((?:${REPO_NAME_PATTERN}/)*${REPO_NAME_PATTERN})/\+/(\d{1,9})(?!\d)`,
  );
  regExp_13 = new RegExp(String.raw`^remote:\s+(${GERRIT_CHANGE_URL_RE.source})`, "m");
  GITLAB_MR_REMOTE_RE =
    /^remote:[ \t]+View merge request for \S+:[ \t]*\r?\n[ \t]*remote:[ \t]+(https?:\/\/[^/\s"]+\/[^\s"]+?\/-\/merge_requests\/\d{1,9})(?!\d)/m;
});
//@ chunk-s61vbvea.js:571987-572147 fingerprint (2.1.88 match: parsePrUrl, 0.878)
/**
 * 从 URL 解析 PR 编号、仓库、提供方。
 */
function parsePrUrl_2(url) {
  let match = url.match(PR_URL_RE_2) ?? url.match(GERRIT_CHANGE_URL_RE);
  if (match?.[1] && match?.[2])
    return {
      prNumber: parseInt(match[2], 10),
      prUrl: match[0],
      prRepository: match[1],
      provider: detectPrProvider(match[0]),
    };
  return null;
}
//@ chunk-s61vbvea.js:572147-572400 layout
/**
 * 按 URL 判断 PR 提供方：gitlab / gerrit / bitbucket / github / github-enterprise。
 */
function detectPrProvider(url) {
  if (url.includes("/-/merge_requests/")) return "gitlab";
  if (regExp_18.test(url)) return "gerrit";
  if (url.includes("/pull-requests/")) return "bitbucket";
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "github-enterprise";
  }
  return isGithubDotCom(hostname) ? "github" : "github-enterprise";
}
//@ chunk-s61vbvea.js:572400-572560 layout
var regExp_14; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:572400", () => {
  regExp_14 = new RegExp(
    `^https?://${HOSTNAME_PATTERN}(?::\\d{1,5})?/(?:${REPO_NAME_PATTERN}/${REPO_NAME_PATTERN}/(?:pull|pull-requests|cr)|projects/${REPO_NAME_PATTERN}/repos/${REPO_NAME_PATTERN}/pull-requests|${GITLAB_MR_PATH_PATTERN}` +
      String.raw`)/\d+$`,
  );
});
//@ chunk-s61vbvea.js:572560-572624 layout
function isValidPrUrl(prUrl) {
  return prUrl.length <= MAX_REPO_URL_CHARS && (regExp_14.test(prUrl) || regExp_18.test(prUrl));
}
//@ chunk-s61vbvea.js:572624-572685 layout
/**
 * 判断 git 分支名是否安全（排除 HEAD、选项、@{ 等）。
 */
var SAFE_BRANCH_NAME_RE = /^(?!HEAD$)(?!-)(?!.*@\{)[A-Za-z0-9._\/+@#-]{1,255}$/;
//@ chunk-s61vbvea.js:572685-572831 layout (2.1.88 match: getTaskListLockPath, 1)
/**
 * git 分支名安全检查（切分误归 utils/tasks）。
 */
function isSafeBranchName(taskListId) {
  return (
    SAFE_BRANCH_NAME_RE.test(taskListId) &&
    !taskListId.includes("..") &&
    !taskListId.endsWith(".") &&
    taskListId
      .split("/")
      .every((segment) => segment !== "" && !segment.startsWith(".") && !segment.endsWith(".lock"))
  );
}
//@ chunk-s61vbvea.js:572831-573119 layout
/**
 * PR URL 有效时发出 code_change_published 系统事件（切分误归）。
 */
function announceCodeChangePublished(publication) {
  if (!isValidPrUrl(publication.prUrl)) return false;
  enqueueTaskNotification({
    type: "system",
    subtype: "code_change_published",
    provider: publication.provider,
    url: publication.prUrl,
    repo: publication.prRepository,
    identifier: publication.identifier,
    action: publication.action,
    ...((publication.provider === "gerrit" || publication.action === "created") &&
      publication.branch &&
      isSafeBranchName(publication.branch) && {
        branch: publication.branch,
      }),
  });
  return true;
}
//@ chunk-s61vbvea.js:573119-573682 layout
/**
 * 根据解析出的 git 动作（commit、push 及推送分支、merge/rebase）发出 vcs_state_changed 系统事件。
 */
function emitVcsStateChanges(gitOperation, output, commandInfo) {
  let changes = [];
  if (gitOperation.commit)
    changes.push({
      kind: "commit",
      branch: gitOperation.commit.branch,
    });
  let replaced = commandInfo.command.replace(QUOTED_SEGMENT_RE, " ");
  if (
    !gitOperation.push &&
    commandInfo.exitCode === 0 &&
    GIT_PUSH_RE.test(replaced) &&
    !DRY_RUN_FLAG_RE.test(pushedBranchOf(replaced))
  )
    changes.push({
      kind: "push",
    });
  if (gitOperation.push) {
    let pushedBranches = parsePushedBranches(output);
    let filtered = pushedBranches.filter(isTrackableBranch);
    if (filtered.length < Math.max(pushedBranches.length, 1))
      changes.push({
        kind: "push",
      });
    for (let branch of filtered)
      changes.push({
        kind: "push",
        branch,
      });
  }
  if (gitOperation.branch) {
    let actionKinds = {
      merged: "merge",
      rebased: "rebase",
    };
    changes.push({
      kind: actionKinds[gitOperation.branch.action],
    });
  }
  for (let change of changes)
    enqueueTaskNotification({
      type: "system",
      subtype: "vcs_state_changed",
      kind: change.kind,
      ...("branch" in change &&
        change.branch !== undefined && {
          branch: change.branch,
        }),
      cwd: commandInfo.cwd,
    });
}
//@ chunk-s61vbvea.js:573682-573767 file-local
function findLastPrUrl(stdout) {
  let match = stdout.match(new RegExp(PR_URL_RE_2.source, "g"));
  return match ? parsePrUrl_2(match.at(-1)) : null;
}
//@ chunk-s61vbvea.js:573767-573777 layout
var MAX_TRACKED_PRS = 10;
//@ chunk-s61vbvea.js:573777-573912 layout
function dedupePrUrls(urls, maxCount = MAX_TRACKED_PRS) {
  let byUrl = new Map();
  for (let url of urls) {
    let prUrl = parsePrUrl_2(url);
    if (prUrl) {
      byUrl.delete(prUrl.prUrl);
      byUrl.set(prUrl.prUrl, prUrl);
    }
  }
  return [...byUrl.values()].slice(-maxCount);
}
//@ chunk-s61vbvea.js:573912-573982 file-local
/**
 * 从文本里提取全部 PR URL，按 prUrl 去重保留最新，最多 10 个。
 */
function extractPrUrls(text, maxCount) {
  return dedupePrUrls(text.match(new RegExp(PR_URL_RE_2.source, "g")) ?? [], maxCount);
}
//@ chunk-s61vbvea.js:573982-574097 layout
function recordPrActions(prs, action) {
  let announcedCount = 0;
  for (let pr of prs) {
    let announced = announceCodeChangePublished({
      ...pr,
      identifier: String(pr.prNumber),
      action,
    });
    announcedCount += announced ? 1 : 0;
  }
  return announcedCount;
}
//@ chunk-s61vbvea.js:574097-574109 layout
var SPILLED_OUTPUT_TAIL_BYTES = 8192;
//@ chunk-s61vbvea.js:574109-574337 layout
/**
 * 输出被落盘时，把落盘文件末尾（最多 8 KiB）拼到内存输出后面再扫描 git 动作；读不到时只扫开头。
 */
async function withSpilledOutputTail(stdout, outputFilePath) {
  if (!outputFilePath) return stdout;
  try {
    let { content } = await tailTaskOutput(outputFilePath, SPILLED_OUTPUT_TAIL_BYTES);
    return content
      ? `${stdout}
${content}`
      : stdout;
  } catch (error) {
    if (isENOENT(error));
    else if (isSadResourceErrno(error) || isEnvFsErrno(error))
      logForDebugging(`withSpilledOutputTail ${getErrnoCode(error)}: scanning head only`, {
        level: "error",
      });
    else logError(error);
    return stdout;
  }
}
//@ chunk-s61vbvea.js:574337-574440 layout
function normalizeTerminalOutput(text) {
  return text
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
function parseCommitSummary(output) {
  let match = normalizeTerminalOutput(output).match(GIT_COMMIT_SUMMARY_RE);
  if (match?.[2] === undefined) return;
  return {
    sha: match[2],
    ...(match[1] !== undefined && {
      branch: match[1],
    }),
  };
}
//@ chunk-s61vbvea.js:574632-574827 layout
/**
 * 从提交输出解析 sha 与分支，必要时把短 sha 扩展成完整 commitId。
 */
async function resolveCommitInfo(stdout, gitDir, reflogPath) {
  let commitSummary = parseCommitSummary(stdout);
  if (!commitSummary)
    return reflogPath === undefined ? undefined : readCommitAppendedToHeadReflog(reflogPath);
  let head = gitDir === null ? null : await getHeadForDir(gitDir);
  return {
    commitId: head?.startsWith(commitSummary.sha) ? head : commitSummary.sha,
    ...(commitSummary.branch !== undefined && {
      branch: commitSummary.branch,
    }),
  };
}
//@ chunk-s61vbvea.js:574827-574916 layout
var GIT_PUSH_REF_RE = /^\s*[+\-*!= ]?\s*(?:\[new branch\]|[0-9a-f]+\.\.+[0-9a-f]+)\s+\S+\s*->\s*(\S+)/m;
//@ chunk-s61vbvea.js:574916-575150 layout
/**
 * 从 git push 输出（"To <remote>" 之后的缩进行）解析被推送的分支名。
 */
function parsePushedBranches(output) {
  let filtered = normalizeTerminalOutput(output)
    .split(
      `
`,
    )
    .filter((line) => line !== "");
  let branches = new Set();
  for (let j = 0; j < filtered.length; j++) {
    if (!filtered[j].startsWith("To ")) continue;
    for (let j_2 = j + 1; j_2 < filtered.length && /^\s/.test(filtered[j_2]); j_2++) {
      let branch = filtered[j_2].match(GIT_PUSH_REF_RE)?.[1];
      if (branch) branches.add(branch);
    }
  }
  return [...branches];
}
//@ chunk-s61vbvea.js:575150-575473 layout
function isGhApiPullCreate(command) {
  let apiArgs = (command.replace(QUOTED_SEGMENT_RE, " ").split(/\bgh\s+api\b/)[1] ?? "").split(/[&|;\n]/)[0];
  if (!apiArgs || !/(?:^|\s)\/?repos\/[^\s/]+\/[^\s/]+\/pulls(?=\s|$)/.test(apiArgs)) return false;
  let method = apiArgs.match(/(?:^|\s)(?:-X|--method)(?:\s+|=)([A-Za-z]+)/)?.[1];
  return method
    ? method.toUpperCase() === "POST"
    : /(?:^|\s)(?:-f|-F|--field|--raw-field)(?:\s|=)/.test(apiArgs);
}
//@ chunk-s61vbvea.js:575473-575539 layout
/**
 * 取 git push 之后到分隔符前的参数串。
 */
function pushedBranchOf(command) {
  return (command.split(GIT_PUSH_RE)[1] ?? "").split(/[&|;\n]/)[0] ?? "";
}
//@ chunk-s61vbvea.js:575539-575680 layout (2.1.88 match: parsePrUrl, 0.792)
function parsePrNumberFromText(url) {
  let match = url.match(/[Pp]ull request (?:(\S+)#)?#?(\d{1,9})\b/);
  return match?.[2]
    ? {
        prNumber: parseInt(match[2], 10),
        prRepository: match[1],
      }
    : undefined;
}
//@ chunk-s61vbvea.js:575680-575857 file-local
/**
 * 取 git <verb> 后第一个非选项参数（遇到重定向/分隔符停止）。
 */
function parseRefFromCommand(command, verb) {
  let after = command.split(gitCmdRe(verb))[1];
  if (!after) return;
  for (let t of after.trim().split(/\s+/)) {
    if (/^(?:[\d*]*[<>]|[&|;])/.test(t)) break;
    if (t.startsWith("-")) continue;
    return t;
  }
  return;
}
//@ chunk-s61vbvea.js:575857-576546 fingerprint (2.1.88 match: detectGitOperation, 1)
/**
 * 从命令与输出识别 git/gh 操作：提交（sha、committed/amended/cherry-picked、分支）、推送分支、合并/变基、PR 创建/动作等，生成结果的 gitOperation 字段（给客户端展示，不给模型）。
 */
function detectGitOperation(command, output) {
  let result = {};
  let isCherryPick = GIT_CHERRY_PICK_RE.test(command);
  if (GIT_COMMIT_RE.test(command) || isCherryPick) {
    let sha = parseCommitSummary(output);
    if (sha)
      result.commit = {
        sha: sha.sha,
        kind: isCherryPick ? "cherry-picked" : /--amend\b/.test(command) ? "amended" : "committed",
        ...(sha.branch !== undefined && {
          branch: sha.branch,
        }),
      };
  }
  if (GIT_PUSH_RE.test(command)) {
    let branch = pushedBranchOf(command);
    if (!DRY_RUN_FLAG_RE.test(branch)) {
      let pushedRef = output.match(GIT_PUSH_REF_RE)?.[1];
      if (pushedRef)
        result.push = {
          branch: pushedRef,
        };
    }
  }
  if (GIT_MERGE_RE.test(command) && /(Fast-forward|Merge made by)/.test(output)) {
    let ref = parseRefFromCommand(command, "merge");
    if (ref)
      result.branch = {
        ref,
        action: "merged",
      };
  }
  if (GIT_REBASE_RE.test(command) && /Successfully rebased/.test(output)) {
    let ref = parseRefFromCommand(command, "rebase");
    if (ref)
      result.branch = {
        ref,
        action: "rebased",
      };
  }
  let prAction = getPrAction(command);
  if (prAction) {
    let lastPrUrl = findLastPrUrl(output);
    if (lastPrUrl)
      result.pr = {
        number: lastPrUrl.prNumber,
        url: lastPrUrl.prUrl,
        action: prAction,
      };
    else if (GH_PR_ACTIONS.some((actionEntry) => actionEntry.re.test(command))) {
      let num = parsePrNumberFromText(output);
      if (num)
        result.pr = {
          number: num.prNumber,
          action: prAction,
        };
    }
  }
  return result;
}
//@ chunk-s61vbvea.js:576546-576590 layout
/**
 * 待查 PR 的分支表上限（8）。
 */
var MAX_PENDING_BRANCH_LINKS = 8;
var MAX_BRANCH_LOOKUP_ATTEMPTS = 5;
var GIT_LIKE_COMMAND_RE = /\b(?:git|gh|glab|curl)\b/;
//@ chunk-s61vbvea.js:576590-576678 layout
/**
 * 待查推送分支表的键（cwd + 分支）与"可跟踪分支"判定（排除 HEAD、选项、纯数字）。
 */
var pendingBranchKey = (sessionId, branch) => `${sessionId}\x00${branch}`;
var isTrackableBranch = (branch) => branch !== "HEAD" && !branch.startsWith("-") && !/^#?\d+$/.test(branch);
//@ chunk-s61vbvea.js:576678-576821 layout
/**
 * 记下推送的分支（待查 PR），有上限。
 */
function rememberPushedBranch(pendingBranchLinks, sessionId, branch) {
  if (isEssentialTrafficOnly()) return;
  let key = pendingBranchKey(sessionId, branch);
  pendingBranchLinks.delete(key);
  if (pendingBranchLinks.size >= MAX_PENDING_BRANCH_LINKS)
    pendingBranchLinks.delete(pendingBranchLinks.keys().next().value);
  pendingBranchLinks.set(key, {
    cwd: sessionId,
    branch,
    attempts: 0,
  });
}
//@ chunk-s61vbvea.js:576821-576880 layout
/**
 * 清除某工作目录下所有待查分支记录。
 */
function clearPendingBranchesForCwd(pendingBranchLinks, cwd) {
  for (let [key, link] of pendingBranchLinks) if (link.cwd === cwd) pendingBranchLinks.delete(key);
}
//@ chunk-s61vbvea.js:576880-576998 layout
/**
 * 推送后按是否已有 PR 记下或清除该分支。
 */
async function trackPushedBranch(pendingBranchLinks, sessionId, branchPromise, pushedPromise) {
  let wasPushed = await pushedPromise;
  let branch = await branchPromise;
  if (branch === undefined || !isTrackableBranch(branch)) return;
  if (wasPushed) pendingBranchLinks.delete(pendingBranchKey(sessionId, branch));
  else rememberPushedBranch(pendingBranchLinks, sessionId, branch);
}
//@ chunk-s61vbvea.js:576998-577268 layout
/**
 * 命令只包含 gh pr create / glab mr create（及 auth/config/api user）且非 dry-run。
 */
function isPrCreateOnlyCommand(command) {
  let subcommands = command.match(/\b(?:gh|glab)\s+\S+(?:\s+\S+)?/g) ?? [];
  let createOnlyRe = /^gh\s+pr\s+create$|^glab\s+mr\s+create$/;
  let harmlessRe = /^(?:gh|glab)\s+(?:auth|config)\b|^(?:gh|glab)\s+api\s+\/?user$/;
  return (
    !command.includes("--dry-run") &&
    subcommands.some((subcommand) => createOnlyRe.test(subcommand)) &&
    subcommands.every((subcommand) => createOnlyRe.test(subcommand) || harmlessRe.test(subcommand))
  );
}
//@ chunk-s61vbvea.js:577268-577553 layout
/**
 * 记录新建的 PR：发遥测 tengu_git_created_prs、异步登记 PR、清理当前目录的待查推送分支。
 */
function recordCreatedPr(
  output,
  action = "created",
  announceEarlier = false,
  linkPromise = Promise.resolve(undefined),
) {
  let lastPr = output ? findLastPrUrl(output) : null;
  if (!output || !lastPr) return null;
  let announcedPrs =
    (isValidPrUrl(lastPr.prUrl) ? 1 : 0) +
    (announceEarlier ? recordPrActions(extractPrUrls(output).slice(0, -1), "created") : 0);
  logEvent("tengu_git_created_prs", {
    printedPrs: extractPrUrls(output, 1 / 0).length,
    announcedPrs,
  });
  trackPendingPrLink(linkPromise.then((linkedPr) => linkPrToSession(lastPr, action, linkedPr)));
  clearPendingBranchesForCwd(getPendingBranchLinks(), getCwd());
  return lastPr;
}
//@ chunk-s61vbvea.js:577553-577565 layout
/**
 * 读取当前分支时的超时（2 秒）。
 */
var BRANCH_LOOKUP_TIMEOUT_MS = 2000;
//@ chunk-s61vbvea.js:577565-578168 layout
/**
 * 从 pr create 命令的 --head/--source-branch 取分支，否则读当前分支（带超时）。
 */
function prHeadBranch(command, cli) {
  let replaced = command.replace(QUOTED_SEGMENT_RE, (quoted) => " ".repeat(quoted.length));
  let createRe = cli === "gh" ? /\bgh\s+pr\s+create\b/g : /\bglab\s+mr\s+create\b/g;
  let index = [...replaced.matchAll(createRe)].at(-1)?.index;
  if (index === undefined) return Promise.resolve(undefined);
  let match = (replaced.slice(index).split(/[&|;\n]/)[0] ?? "").match(
    cli === "gh" ? /(?:^|\s)(?:--head|-H)(?==|\s)/ : /(?:^|\s)(?:--source-branch|-s)(?==|\s)/,
  );
  if (match?.index !== undefined) {
    let match_2 = command
      .slice(index + match.index + match[0].length)
      .match(/^(?:=|\s+)(?:"([^"\\$`]*)"|'([^']*)'|([^\s"'`$;&|]+))/);
    let headValue = match_2?.[1] ?? match_2?.[2] ?? match_2?.[3];
    let branchName = cli === "gh" ? headValue?.replace(/^[^:]*:/, "") : headValue;
    if (branchName && isSafeBranchName(branchName)) return Promise.resolve(branchName);
  }
  return withDeadline(
    getBranch(getCwd()).catch(() => {
      return;
    }),
    BRANCH_LOOKUP_TIMEOUT_MS,
  );
}
//@ chunk-s61vbvea.js:578168-578336 layout
/**
 * 开关 tengu_record_created_pr_to_ccr 打开时把新 PR 记录到 CCR（远程会话）。
 */
function recordCreatedPrToCcr(pr) {
  if (
    !pr ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_record_created_pr_to_ccr", false) ||
    !isValidPrUrl(pr.prUrl)
  )
    return;
  let cwd = getCwd();
  trackPendingPrLink(
    import("../../services/ccr/recordCreatedPr.js").then((ccrModule) =>
      ccrModule.recordCreatedPrToCcr(pr, cwd),
    ),
  );
}
//@ chunk-s61vbvea.js:578336-578558 layout
/**
 * 有相关输出时重新查询当前目录待查分支的 PR（有次数上限）。
 */
function recheckPendingBranches(command) {
  let pendingBranchLinks = getPendingBranchLinks();
  if (pendingBranchLinks.size === 0 || !GIT_LIKE_COMMAND_RE.test(command)) return;
  let cwd = getCwd();
  for (let [key, link] of pendingBranchLinks) {
    if (link.cwd !== cwd) continue;
    if (link.attempts >= MAX_BRANCH_LOOKUP_ATTEMPTS) {
      pendingBranchLinks.delete(key);
      continue;
    }
    link.attempts++;
    trackPendingPrLink(
      getNpmDistTags("pushed", link.branch).then((npmDistTags) => {
        if (npmDistTags) pendingBranchLinks.delete(key);
      }),
    );
  }
}
//@ chunk-s61vbvea.js:578558-578569 layout
/**
 * 分析 PR 创建命令时的字符上限（10000）。
 */
var MAX_PR_COMMAND_CHARS = 1e4;
//@ chunk-s61vbvea.js:578569-578785 layout
/**
 * 命令是否通过 curl POST 或 gh api 创建 PR/MR。
 */
function isApiPrCreate(command, hasGhPrAction) {
  return (
    (/\bcurl\b/.test(command) &&
      (/-X\s*POST\b/i.test(command) || /--request\s*=?\s*POST\b/i.test(command) || /\s-d\s/.test(command)) &&
      /https?:\/\/[^\s'"]*\/(?:pulls|pull-requests|merge[-_]requests)(?!\/\d)/i.test(command)) ||
    (!hasGhPrAction && isGhApiPullCreate(command))
  );
}
//@ chunk-s61vbvea.js:578785-578996 layout
/**
 * 命令在其他进程执行时，仅根据命令文本累加提交数与 PR 创建数计数器。
 */
function countGitOpsFromCommand(command) {
  if (command.length > MAX_PR_COMMAND_CHARS) return;
  if (GIT_COMMIT_RE.test(command)) getCommitCounter()?.add(1);
  let actions = [
    GH_PR_ACTIONS.find((actionEntry) => actionEntry.re.test(command)),
    GLAB_MR_ACTIONS.find((actionEntry) => actionEntry.re.test(command)),
  ];
  let createCount =
    count(actions, (actionEntry) => actionEntry?.action === "created") +
    (isApiPrCreate(command, actions.some(Boolean)) ? 1 : 0);
  if (createCount > 0) getPrCounter()?.add(createCount);
}
//@ chunk-s61vbvea.js:578996-581324 fingerprint (2.1.88 match: trackGitOperations, 0.49)
/**
 * 命令成功（退出码 0）后跟踪 git 操作：遥测 tengu_git_operation（commit/commit_amend/push/merge/rebase/pr_*），累加提交/PR 计数，识别 PR URL 与 gh pr checkout，记录推送分支以便稍后查 PR；返回是否解决了 PR（BashTool 据此 markPrResolvedThisSession）。
 */
function trackGitOperations(host, command, code, output) {
  if (code !== 0)
    return {
      prResolved: false,
    };
  let prResolved = false;
  try {
    logReposCreated(command, output);
  } catch (error) {
    logError(error);
  }
  if (GIT_COMMIT_RE.test(command)) {
    logEvent("tengu_git_operation", {
      operation: lit("commit"),
    });
    if (command.match(/--amend\b/))
      logEvent("tengu_git_operation", {
        operation: lit("commit_amend"),
      });
    getCommitCounter()?.add(1);
  }
  let replaced = command.replace(QUOTED_SEGMENT_RE, "''");
  let isCliUpload = GIT_PUSH_RE.test(replaced) || GIT_CL_UPLOAD_RE.test(replaced);
  if (GIT_PUSH_RE.test(command) || isCliUpload) {
    logEvent("tengu_git_operation", {
      operation: lit("push"),
    });
    currentPrStatusFetcher().bump.emit();
  }
  let found = GH_PR_ACTIONS.find((actionEntry) => actionEntry.re.test(command));
  let prHit = GLAB_MR_ACTIONS.find((mrActionEntry) => mrActionEntry.re.test(command));
  let prActionEntry = found ?? prHit;
  let prInfo = getPrAction(command);
  let textAfterLastRuleMatch = getTextAfterLastRuleMatch(command);
  if (prActionEntry) {
    logEvent("tengu_git_operation", {
      operation: fromEnum(prActionEntry.op),
    });
    currentPrStatusFetcher().bump.emit();
  }
  let repoCreateArgs = ghRepoCreateArgs(command);
  if (repoCreateArgs !== null) {
    logEvent("tengu_git_operation", {
      operation: lit("pr_review"),
    });
    if (/--approve\b/.test(repoCreateArgs) || /(?:^|\s)-a(?=\s|$)/.test(repoCreateArgs))
      logEvent("tengu_git_operation", {
        operation: lit("pr_review_approve"),
      });
    else if (/--request-changes\b/.test(repoCreateArgs) || /(?:^|\s)-r(?=\s|$)/.test(repoCreateArgs))
      logEvent("tengu_git_operation", {
        operation: lit("pr_review_request_changes"),
      });
    currentPrStatusFetcher().bump.emit();
  }
  if (prInfo === "merged" || prInfo === "closed") prResolved = true;
  if (found?.action === "created") {
    getPrCounter()?.add(1);
    if (prHit?.action === "created") getPrCounter()?.add(1);
    let replaced = command.replace(QUOTED_SEGMENT_RE, " ");
    let matches = /(?:^|\s)--dry-run(?=\s|$)/.test(replaced);
    let createdPr = recordCreatedPr(
      output,
      textAfterLastRuleMatch,
      isPrCreateOnlyCommand(command),
      prHeadBranch(command, "gh"),
    );
    if (!matches) recordCreatedPrToCcr(createdPr);
  } else if (prHit?.action === "created") {
    getPrCounter()?.add(1);
    recordCreatedPr(
      output,
      textAfterLastRuleMatch,
      isPrCreateOnlyCommand(command),
      prHeadBranch(command, "glab"),
    );
  } else if (textAfterLastRuleMatch && output) {
    let lastPrUrl = findLastPrUrl(output);
    if (lastPrUrl)
      trackPendingPrLink(
        linkPrToSession(lastPrUrl, textAfterLastRuleMatch).then((linkResult) =>
          linkResult === "linked"
            ? logFeatureOk("pr_contribute_link")
            : logFeatureBad("pr_contribute_link", linkResult),
        ),
      );
    else if (!prHit || found) {
      let url = output.match(/^\u2713.*$/m)?.[0];
      let prNumberInfo = url ? parsePrNumberFromText(url) : undefined;
      if (prNumberInfo)
        trackPendingPrLink(
          getNpmDistTags(
            textAfterLastRuleMatch,
            String(prNumberInfo.prNumber),
            prNumberInfo.prRepository,
          ).then((npmDistTags) =>
            npmDistTags
              ? logFeatureOk("pr_contribute_link")
              : logFeatureBad("pr_contribute_link", "gh_view_failed"),
          ),
        );
    }
  }
  let match = command.match(GH_PR_CHECKOUT_RE);
  let pushedPrUrls =
    isCliUpload && !prActionEntry && output && !DRY_RUN_FLAG_RE.test(pushedBranchOf(command))
      ? dedupePrUrls(
          [regExp_13, GITLAB_MR_REMOTE_RE]
            .flatMap((pattern) => [...output.matchAll(new RegExp(pattern, "gm"))])
            .sort((match, otherMatch) => match.index - otherMatch.index)
            .map((match) => match[1] ?? ""),
        )
      : [];
  let last = pushedPrUrls.at(-1);
  if (match?.[1]) trackPendingPrLink(getNpmDistTags("checked-out", match[1]));
  else if (last) {
    recordPrActions(pushedPrUrls.slice(0, -1), "pushed");
    trackPendingPrLink(
      last.provider === "gerrit"
        ? getBranch(getCwd()).then((branch) => linkPrToSession(last, "pushed", branch))
        : linkPrToSession(last, "pushed"),
    );
  } else if (GIT_PUSH_RE.test(command) && !prActionEntry) {
    let pushSpec = pushedBranchOf(command);
    let refspec = pushSpec.match(/\S+/g)?.filter((token) => !token.startsWith("-"))[1];
    let colonIndex = refspec ? refspec.indexOf(":") : -1;
    let destBranch =
      refspec && colonIndex > 0 && colonIndex < refspec.length - 1
        ? refspec.slice(colonIndex + 1).replace(/^refs\/heads\//, "")
        : undefined;
    let sessionId = getCwd();
    let pendingBranchLinks = getPendingBranchLinks();
    let matches = DRY_RUN_FLAG_RE.test(pushSpec);
    let branchPromise = matches || isEssentialTrafficOnly() ? undefined : getBranch(sessionId);
    if (destBranch && isTrackableBranch(destBranch) && !matches)
      trackPendingPrLink(
        trackPushedBranch(pendingBranchLinks, sessionId, destBranch, getNpmDistTags("pushed", destBranch)),
      );
    trackPendingPrLink(
      trackPushedBranch(
        pendingBranchLinks,
        sessionId,
        branchPromise,
        matches ? Promise.resolve(false) : getNpmDistTags("pushed"),
      ),
    );
  }
  if (isApiPrCreate(command, prActionEntry !== undefined)) {
    logEvent("tengu_git_operation", {
      operation: lit("pr_create"),
    });
    getPrCounter()?.add(1);
    currentPrStatusFetcher().bump.emit();
    recordCreatedPr(output);
  }
  recheckPendingBranches(command);
  return {
    prResolved,
  };
}
//@ chunk-s61vbvea.js:581324-581411 layout
/**
 * 登记后台 Promise（吞掉错误），供退出前等待。
 */
function trackPendingPrLink(linkPromise) {
  let pendingPrLinks = getPendingPrLinks();
  let tracked = linkPromise.catch(() => {
    return;
  });
  pendingPrLinks.add(tracked);
  tracked.finally(() => pendingPrLinks.delete(tracked));
}
//@ chunk-s61vbvea.js:581411-581423 placement
/**
 * 等待 PR 关联完成的超时（2 秒）。
 */
var PR_LINK_SETTLE_TIMEOUT_MS = 2000;
//@ chunk-s61vbvea.js:581423-581517 placement
/**
 * 等待所有待完成的 PR 关联结束（带超时）。
 */
async function settlePendingPrLinks() {
  let pendingPrLinks = getPendingPrLinks();
  if (pendingPrLinks.size === 0) return;
  await withDeadline(Promise.allSettled([...pendingPrLinks]), PR_LINK_SETTLE_TIMEOUT_MS);
}
//@ chunk-s61vbvea.js:581517-581604 placement
/**
 * 工作区受信任且非仅必需流量时，报告 PR 已开始并跟踪其关联。
 */
function announcePrStarted(host) {
  if (isEssentialTrafficOnly() || !isWorkspacePersistedTrusted(getCwd())) return Promise.resolve();
  let announcePromise = announcePrStarted_2(host);
  trackPendingPrLink(announcePromise);
  return announcePromise;
}
//@ chunk-s61vbvea.js:581604-582063 placement
async function announcePrStarted_2(host) {
  let [prStatus, branch] = await Promise.all([getPrStatus(host), getBranch(getCwd())]);
  if (prStatus === "fetch-failed") {
    logFeatureBad("pr_started_announce", "lookup_failed");
    return;
  }
  if (prStatus === null || typeof prStatus === "string") {
    let gerritReview = await findGerritReview();
    if (gerritReview) {
      logFeatureOk("pr_started_announce");
      announceCodeChangePublished({
        provider: "gerrit",
        prUrl: gerritReview.url,
        prRepository: gerritReview.project,
        identifier: String(gerritReview.number),
        action: "started",
        branch,
      });
    }
    return;
  }
  logFeatureOk("pr_started_announce");
  let prUrl = parsePrUrl_2(prStatus.url);
  if (!prUrl) return;
  announceCodeChangePublished({
    ...prUrl,
    identifier: String(prStatus.number),
    action: "started",
    branch,
  });
}
//@ chunk-s61vbvea.js:582063-582400 placement
/**
 * 把 PR 与当前会话关联并发通知，返回 linked/no_session/url_rejected。
 */
async function linkPrToSession(pr, action, branch) {
  if (!isValidPrUrl(pr.prUrl)) return "url_rejected";
  let [{ linkSessionToPR }, { getSessionId }] = await Promise.all([
    import("../../utils/sessionStorage.lazy.js"),
    import("../../bootstrap/state.js"),
  ]);
  let sessionId = getSessionId();
  if (!sessionId) return "no_session";
  announceCodeChangePublished({
    ...pr,
    identifier: String(pr.prNumber),
    action,
    branch,
  });
  await linkSessionToPR(sessionId, pr.prNumber, pr.prUrl, pr.prRepository);
  return "linked";
}
//@ chunk-s61vbvea.js:582400-582603 placement
/**
 * gh 命令、GitHub 限流错误正则与提醒间隔。
 */
var GH_COMMAND_RE =
  /(?:^|[;&|]|\b(?:then|do)\b)\s*gh\s+(?!auth\b|help\b|version\b|alias\b|completion\b|config\b)/;
var GITHUB_RATE_LIMIT_RE =
  /API rate limit (?:already )?exceeded|exceeded a secondary rate limit|\bRATE_LIMITED\b/i;
var RATE_LIMIT_REMINDER_INTERVAL_MS = 60000;
//@ chunk-s61vbvea.js:582603-582628 placement
/**
 * 记录 PR 关联失败后的退避截止时间。
 */
class PrLinkBackoffState {
  backoffUntil = 0;
}
//@ chunk-s61vbvea.js:582628-583010 placement
function GITHUB_RATE_LIMIT_REMINDER(command, branch, output) {
  if (!GH_COMMAND_RE.test(command) || !GITHUB_RATE_LIMIT_RE.test(branch) || Date.now() < output.backoffUntil)
    return;
  output.backoffUntil = Date.now() + RATE_LIMIT_REMINDER_INTERVAL_MS;
  return "<system-reminder>GitHub API rate limit exceeded (5,000/hr shared across all tools and agents). Run `gh api rate_limit --jq .resources` and sleep until reset before further gh calls. If polling in a loop, use ScheduleWakeup instead of retrying.</system-reminder>";
}
export {
  GH_PR_ACTIONS,
  GLAB_MR_ACTIONS,
  getPrAction,
  PR_URL_RE_2,
  parsePrUrl_2,
  settlePendingPrLinks,
  announcePrStarted,
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
  PrLinkBackoffState,
  isSafeBranchName,
};
