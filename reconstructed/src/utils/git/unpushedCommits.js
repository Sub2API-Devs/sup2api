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
import { bn, Er, HEAD_TAIL_LINES_DEFAULT, Sr, vr } from "../../daemon/jobs/adoptRecord.js";
import { isValidGitSha } from "./gitFilesystem.js";
import { printableLabel } from "../printableName.js";
import { plural } from "../stringUtils.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { freeze } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";

/**
 * 列出本地未推送的提交与当前分支。
 */
//@ chunk-vrr64ez0.js:27301-27776 placement
async function listUnpushedCommits(e) {
  let [n, o] = await Promise.all([
    vt(e, [
      "log",
      "--no-show-signature",
      `--max-count=${bn}`,
      "--format=%H%x00%s",
      "HEAD",
      "--not",
      "--remotes",
    ]),
    vt(e, ["symbolic-ref", "-q", "--short", "HEAD"]),
  ]);
  if (n.code !== 0) return;
  let filtered = n.stdout
      .split(
        `
`,
      )
      .map((s) => s.split("\x00"))
      .filter((s) => s.length === 2 && s[0] !== ""),
    u = filtered[0];
  if (u === void 0 || !isValidGitSha(u[0])) return;
  return {
    branch: o.code === 0 ? printableLabel(o.stdout, Er) || null : null,
    count: filtered.length,
    headSha: u[0],
    shortSha: u[0].slice(0, HEAD_TAIL_LINES_DEFAULT),
    subject: printableLabel(u[1], Sr),
  };
}
/**
 * N 个未推送提交在某分支。
 */
//@ chunk-vrr64ez0.js:27776-27883 placement
function formatUnpushedCount(e) {
  return `${e.count}${yn(e)} unpushed ${plural(e.count, "commit")} on ${e.branch ?? "detached HEAD"}`;
}
/**
 * 未推送提交摘要（首个短 sha 与标题）。
 */
//@ chunk-vrr64ez0.js:27883-28026 placement
function formatUnpushedSummary(e) {
  let n = e.count > 1 ? ` and ${e.count - 1}${yn(e)} more` : "";
  return `${formatUnpushedCount(e)}: ${[e.shortSha, e.subject].filter(Boolean).join(" ")}${n}`;
}
//@ chunk-vrr64ez0.js:28026-28146 placement
async function isHeadAt(e, n) {
  if (!isValidGitSha(n)) return !1;
  let o = await vt(e, ["rev-parse", "HEAD"]);
  return o.code === 0 && o.stdout.trim() === n;
}
//@ chunk-vrr64ez0.js:28146-28228 placement
async function vt(e, n) {
  return execFileNoThrowWithCwd(gitExe(), [...freeze, ...n], {
    cwd: e,
    env: getRemoteHostSessionCount(),
    maxBuffer: vr,
  });
}
//@ chunk-vrr64ez0.js:28228-28269 placement
function yn(e) {
  return e.count >= bn ? "+" : "";
}

export { formatUnpushedCount, formatUnpushedSummary, isHeadAt, listUnpushedCommits };
