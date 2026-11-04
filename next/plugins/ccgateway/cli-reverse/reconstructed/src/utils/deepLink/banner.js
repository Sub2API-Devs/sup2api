/**
 * utils/deepLink/banner.ts
 *
 * 并入已有模块：深链横幅。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/banner.ts
 * pieces: chunk-47mye09a.js (5)
 * attribution: placement 1, fingerprint 2, callgraph-fingerprint 1, file-local 1
 */
import { join, sep } from "path";
import { stat } from "fs/promises";
import { homedir } from "os";
import { formatRelativeTimeAgo, formatNumber } from "../format.js";
import { getGitDir } from "../git.js";
import { getCommonDir } from "../git/gitFilesystem.js";

//@ chunk-47mye09a.js:3555-3580 placement
/**
 * 仓库最近 fetch 超过多久算过期（7 天）。
 */
var REPO_FETCH_STALE_MS = 604800000;
var LONG_PREFILL_CHARS = 1000;
//@ chunk-47mye09a.js:3580-4181 fingerprint (2.1.88 match: buildDeepLinkBanner, 1)
/**
 * 深链接会话的警示横幅：说明由外部深链接打开、所在目录；带 repo 时显示最近 fetch 时间（超期提示 CLAUDE.md 可能过期）；带预填 prompt 时提醒用户回车前检查（长 prompt 提示滚动查看）。
 */
function buildDeepLinkBanner(info) {
  let lines = [`This session was opened by an external deep link in ${tildify(info.cwd)}`];
  if (info.repo) {
    let age = info.lastFetch ? formatRelativeTimeAgo(info.lastFetch) : "never";
    let stale = !info.lastFetch || Date.now() - info.lastFetch.getTime() > REPO_FETCH_STALE_MS;
    lines.push(
      `Resolved ${info.repo} from local clones \xB7 last fetched ${age}${stale ? " \u2014 CLAUDE.md may be stale" : ""}`,
    );
  }
  if (info.prefillLength)
    lines.push(
      info.prefillLength > LONG_PREFILL_CHARS
        ? `The prompt below (${formatNumber(info.prefillLength)} chars) was supplied by the link \u2014 scroll to review the entire prompt before pressing Enter.`
        : "The prompt below was supplied by the link \u2014 review carefully before pressing Enter.",
    );
  return lines.join(`
`);
}
//@ chunk-47mye09a.js:4181-4382 fingerprint (2.1.88 match: readLastFetchTime, 1)
/**
 * 读 .git/FETCH_HEAD（及 common dir）的修改时间，取较新者作为最近 fetch 时间。
 */
async function readLastFetchTime(cwd) {
  let gitDir = await getGitDir(cwd);
  if (!gitDir) return;
  let commonDir = await getCommonDir(gitDir);
  let [worktreeFetch, commonFetch] = await Promise.all([
    mtimeOrUndefined(join(gitDir, "FETCH_HEAD")),
    commonDir ? mtimeOrUndefined(join(commonDir, "FETCH_HEAD")) : Promise.resolve(undefined),
  ]);
  if (worktreeFetch && commonFetch) return worktreeFetch > commonFetch ? worktreeFetch : commonFetch;
  return worktreeFetch ?? commonFetch;
}
//@ chunk-47mye09a.js:4382-4453 callgraph-fingerprint (2.1.88 match: mtimeOrUndefined, 1)
/**
 * stat 取 mtime，失败返回 undefined。
 */
async function mtimeOrUndefined(p) {
  try {
    let { mtime } = await stat(p);
    return mtime;
  } catch {
    return;
  }
}
//@ chunk-47mye09a.js:4453-4554 file-local
/**
 * 把家目录前缀替换成 ~。
 */
function tildify(p) {
  let home = homedir();
  if (p === home) return "~";
  if (p.startsWith(home + sep)) return "~" + p.slice(home.length);
  return p;
}
export { buildDeepLinkBanner, LONG_PREFILL_CHARS, readLastFetchTime };
