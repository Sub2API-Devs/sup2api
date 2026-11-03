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
var E = 604800000,
  Ogo = 1000;
/**
 * 深链接会话的警示横幅：说明由外部深链接打开、所在目录；带 repo 时显示最近 fetch 时间（超期提示 CLAUDE.md 可能过期）；带预填 prompt 时提醒用户回车前检查（长 prompt 提示滚动查看）。
 */
//@ chunk-47mye09a.js:3580-4181 fingerprint = buildDeepLinkBanner (1)
function buildDeepLinkBanner(info) {
  let lines = [`This session was opened by an external deep link in ${tildify(info.cwd)}`];
  if (info.repo) {
    let age = info.lastFetch ? formatRelativeTimeAgo(info.lastFetch) : "never",
      stale = !info.lastFetch || Date.now() - info.lastFetch.getTime() > E;
    lines.push(
      `Resolved ${info.repo} from local clones \xB7 last fetched ${age}${stale ? " \u2014 CLAUDE.md may be stale" : ""}`,
    );
  }
  if (info.prefillLength)
    lines.push(
      info.prefillLength > Ogo
        ? `The prompt below (${formatNumber(info.prefillLength)} chars) was supplied by the link \u2014 scroll to review the entire prompt before pressing Enter.`
        : "The prompt below was supplied by the link \u2014 review carefully before pressing Enter.",
    );
  return lines.join(`
`);
}
/**
 * 读 .git/FETCH_HEAD（及 common dir）的修改时间，取较新者作为最近 fetch 时间。
 */
//@ chunk-47mye09a.js:4181-4382 fingerprint = readLastFetchTime (1)
async function readLastFetchTime(cwd) {
  let gitDir = await getGitDir(cwd);
  if (!gitDir) return;
  let commonDir = await getCommonDir(gitDir),
    [worktreeFetch, commonFetch] = await Promise.all([
      mtimeOrUndefined(join(gitDir, "FETCH_HEAD")),
      commonDir ? mtimeOrUndefined(join(commonDir, "FETCH_HEAD")) : Promise.resolve(void 0),
    ]);
  if (worktreeFetch && commonFetch) return worktreeFetch > commonFetch ? worktreeFetch : commonFetch;
  return worktreeFetch ?? commonFetch;
}
/**
 * stat 取 mtime，失败返回 undefined。
 */
//@ chunk-47mye09a.js:4382-4453 callgraph-fingerprint = mtimeOrUndefined (1)
async function mtimeOrUndefined(p) {
  try {
    let { mtime: mtime } = await stat(p);
    return mtime;
  } catch {
    return;
  }
}
/**
 * 把家目录前缀替换成 ~。
 */
//@ chunk-47mye09a.js:4453-4554 file-local
function tildify(p) {
  let home = homedir();
  if (p === home) return "~";
  if (p.startsWith(home + sep)) return "~" + p.slice(home.length);
  return p;
}

export { buildDeepLinkBanner, Ogo, readLastFetchTime };
