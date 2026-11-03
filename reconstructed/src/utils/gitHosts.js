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
/**
 * 去掉主机名末尾的端口号。
 */
function portlessHost(r) {
  return r.replace(/:\d+$/, "");
}
//@ chunk-f2w6209x.js:354-522 placement
/**
 * git 主机类型到官方域名映射，以及 SSH 别名主机到类型的映射。
 */
var GITLAB_COM = "gitlab.com";
var BITBUCKET_ORG = "bitbucket.org";
var GIT_HOST_NAME_BY_KIND = {
  github: GITHUB_HOST,
  gitlab: GITLAB_COM,
  bitbucket: BITBUCKET_ORG,
};
var SSH_HOST_KIND_MAP = {
  "ssh.github.com": "github",
  "altssh.gitlab.com": "gitlab",
  "altssh.bitbucket.org": "bitbucket",
};
//@ chunk-f2w6209x.js:522-669 placement
/**
 * 识别 git 主机类型：github、已知自托管映射、gitlab、bitbucket 或 other。
 */
function getGitHostKind(r) {
  r = portlessHost(r);
  if (isGithubDotCom(r)) return "github";
  let t = normalizeHostCached(r);
  let i = SSH_HOST_KIND_MAP[t];
  if (i) return i;
  if (t === GITLAB_COM) return "gitlab";
  if (t === BITBUCKET_ORG) return "bitbucket";
  return "other";
}
//@ chunk-f2w6209x.js:669-862 placement = ghIsDangerousCallback (0.82)
function ghIsDangerousCallback(remoteUrl) {
  let trimmed = remoteUrl.trim();
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
//@ chunk-f2w6209x.js:862-982 placement
/**
 * 解析 scp 风格的 git 地址 user@host:path，带 URL 协议时返回 null。
 */
function parseScpLikeUrl(url) {
  let match = /^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(url);
  return match && !describeUrlScheme(url)
    ? {
        user: match[1],
        host: match[2],
        path: match[3],
      }
    : null;
}
export { portlessHost, getGitHostKind, ghIsDangerousCallback, parseScpLikeUrl, GIT_HOST_NAME_BY_KIND };
