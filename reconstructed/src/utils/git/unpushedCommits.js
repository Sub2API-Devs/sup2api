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
  let [n, o] = await Promise.all([
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
  if (n.code !== 0) return;
  let filtered = n.stdout
    .split(
      `
`,
    )
    .map((line) => line.split("\x00"))
    .filter((s) => s.length === 2 && s[0] !== "");
  let u = filtered[0];
  if (u === undefined || !isValidGitSha(u[0])) return;
  return {
    branch: o.code === 0 ? printableLabel(o.stdout, HEAD_TAIL_LINES_DEFAULT) || null : null,
    count: filtered.length,
    headSha: u[0],
    shortSha: u[0].slice(0, HEAD_TAIL_LINES_DEFAULT_2),
    subject: printableLabel(u[1], HEAD_TAIL_LINES_SEED),
  };
}
//@ chunk-vrr64ez0.js:27776-27883 placement
/**
 * N 个未推送提交在某分支。
 */
function formatUnpushedCount(e) {
  return `${e.count}${unpushedOverflowSuffix(e)} unpushed ${plural(e.count, "commit")} on ${e.branch ?? "detached HEAD"}`;
}
//@ chunk-vrr64ez0.js:27883-28026 placement
/**
 * 未推送提交摘要（首个短 sha 与标题）。
 */
function formatUnpushedSummary(unpushed) {
  let n = unpushed.count > 1 ? ` and ${unpushed.count - 1}${unpushedOverflowSuffix(unpushed)} more` : "";
  return `${formatUnpushedCount(unpushed)}: ${[unpushed.shortSha, unpushed.subject].filter(Boolean).join(" ")}${n}`;
}
//@ chunk-vrr64ez0.js:28026-28146 placement
async function isHeadAt(cwd, headSha) {
  if (!isValidGitSha(headSha)) return false;
  let o = await runGitForUnpushed(cwd, ["rev-parse", "HEAD"]);
  return o.code === 0 && o.stdout.trim() === headSha;
}
//@ chunk-vrr64ez0.js:28146-28228 placement
async function runGitForUnpushed(cwd, n) {
  return execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...n], {
    cwd,
    env: getRemoteHostSessionCount(),
    maxBuffer: MAX_ADOPT_RECORD_BYTES,
  });
}
//@ chunk-vrr64ez0.js:28228-28269 placement
function unpushedOverflowSuffix(e) {
  return e.count >= ADOPT_CLAIM_RETRY_MS ? "+" : "";
}
export { formatUnpushedCount, formatUnpushedSummary, isHeadAt, listUnpushedCommits };
