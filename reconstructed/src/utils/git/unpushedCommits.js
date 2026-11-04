/**
 * utils/git/unpushedCommits.ts
 *
 * 2.1.316 新增：列出本地未推送的提交与当前分支。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (6)
 * attribution: placement 6
 */
import {
  ADOPT_CLAIM_RETRY_MS,
  HEAD_TAIL_LINES_DEFAULT,
  HEAD_TAIL_LINES_DEFAULT_2,
  HEAD_TAIL_LINES_SEED,
  MAX_ADOPT_RECORD_BYTES,
} from "../../daemon/jobs/adoptRecord.js";
import { isValidGitSha } from "./gitFilesystem.js";
import { printableLabel } from "../printableName.js";
import { plural } from "../stringUtils.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";

//@ chunk-vrr64ez0.js:27301-27776 placement
/**
 * 列出本地未推送的提交与当前分支。
 */
async function listUnpushedCommits(cwd) {
  let [logResult, branchResult] = await Promise.all([
    runGitForUnpushed(cwd, [
      "log",
      "--no-show-signature",
      `--max-count=${ADOPT_CLAIM_RETRY_MS}`,
      "--format=%H%x00%s",
      "HEAD",
      "--not",
      "--remotes",
    ]),
    runGitForUnpushed(cwd, ["symbolic-ref", "-q", "--short", "HEAD"]),
  ]);
  if (logResult.code !== 0) return;
  let filtered = logResult.stdout
    .split(
      `
`,
    )
    .map((line) => line.split("\x00"))
    .filter((pair) => pair.length === 2 && pair[0] !== "");
  let headCommit = filtered[0];
  if (headCommit === undefined || !isValidGitSha(headCommit[0])) return;
  return {
    branch:
      branchResult.code === 0 ? printableLabel(branchResult.stdout, HEAD_TAIL_LINES_DEFAULT) || null : null,
    count: filtered.length,
    headSha: headCommit[0],
    shortSha: headCommit[0].slice(0, HEAD_TAIL_LINES_DEFAULT_2),
    subject: printableLabel(headCommit[1], HEAD_TAIL_LINES_SEED),
  };
}
//@ chunk-vrr64ez0.js:27776-27883 placement
/**
 * N 个未推送提交在某分支。
 */
function formatUnpushedCount(unpushed) {
  return `${unpushed.count}${unpushedOverflowSuffix(unpushed)} unpushed ${plural(unpushed.count, "commit")} on ${unpushed.branch ?? "detached HEAD"}`;
}
//@ chunk-vrr64ez0.js:27883-28026 placement
/**
 * 未推送提交摘要（首个短 sha 与标题）。
 */
function formatUnpushedSummary(unpushed) {
  let moreSuffix =
    unpushed.count > 1 ? ` and ${unpushed.count - 1}${unpushedOverflowSuffix(unpushed)} more` : "";
  return `${formatUnpushedCount(unpushed)}: ${[unpushed.shortSha, unpushed.subject].filter(Boolean).join(" ")}${moreSuffix}`;
}
//@ chunk-vrr64ez0.js:28026-28146 placement
async function isHeadAt(cwd, headSha) {
  if (!isValidGitSha(headSha)) return false;
  let result = await runGitForUnpushed(cwd, ["rev-parse", "HEAD"]);
  return result.code === 0 && result.stdout.trim() === headSha;
}
//@ chunk-vrr64ez0.js:28146-28228 placement
async function runGitForUnpushed(cwd, args) {
  return execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
    cwd,
    env: getRemoteHostSessionCount(),
    maxBuffer: MAX_ADOPT_RECORD_BYTES,
  });
}
//@ chunk-vrr64ez0.js:28228-28269 placement
function unpushedOverflowSuffix(unpushed) {
  return unpushed.count >= ADOPT_CLAIM_RETRY_MS ? "+" : "";
}
export { formatUnpushedCount, formatUnpushedSummary, isHeadAt, listUnpushedCommits };
