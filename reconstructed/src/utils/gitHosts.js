/**
 * utils/gitHosts.ts
 *
 * 2.1.316 新增：git 主机识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f2w6209x.js (5)
 * attribution: placement 5
 */
import {
  GITHUB_HOST,
  isGithubDotCom,
  normalizeHostCached,
  hasBackslashInUrlAuthority,
} from "./git/githubUrl.js";
import { describeUrlScheme } from "./resultError.js";
import { isSuspiciousUrl } from "./fsBoundRead.js";

//@ chunk-f2w6209x.js:309-354 placement
function q1e(r) {
  return r.replace(/:\d+$/, "");
}
//@ chunk-f2w6209x.js:354-522 placement
var GITLAB_COM = "gitlab.com",
  BITBUCKET_ORG = "bitbucket.org",
  KIi = { github: GITHUB_HOST, gitlab: GITLAB_COM, bitbucket: BITBUCKET_ORG },
  n = { "ssh.github.com": "github", "altssh.gitlab.com": "gitlab", "altssh.bitbucket.org": "bitbucket" };
/**
 * 识别 git 主机类型：github、已知自托管映射、gitlab、bitbucket 或 other。
 */
//@ chunk-f2w6209x.js:522-669 placement
function getGitHostKind(r) {
  if (((r = q1e(r)), isGithubDotCom(r))) return "github";
  let t = normalizeHostCached(r),
    i = n[t];
  if (i) return i;
  if (t === GITLAB_COM) return "gitlab";
  if (t === BITBUCKET_ORG) return "bitbucket";
  return "other";
}
//@ chunk-f2w6209x.js:669-862 placement = ghIsDangerousCallback (0.82)
function ghIsDangerousCallback(r) {
  let trimmed = r.trim();
  if (hasBackslashInUrlAuthority(trimmed) || describeUrlScheme(trimmed) || isSuspiciousUrl(trimmed))
    return null;
  if (trimmed.includes("://"))
    try {
      return new URL(trimmed).hostname || null;
    } catch {
      return null;
    }
  return /^(?:[^@:/]+@)?([^:/]+):/.exec(trimmed)?.[1] ?? null;
}
/**
 * 解析 scp 风格的 git 地址 user@host:path，带 URL 协议时返回 null。
 */
//@ chunk-f2w6209x.js:862-982 placement
function parseScpLikeUrl(r) {
  let match = /^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);
  return match && !describeUrlScheme(r) ? { user: match[1], host: match[2], path: match[3] } : null;
}

export { q1e, getGitHostKind, ghIsDangerousCallback, parseScpLikeUrl, KIi };
