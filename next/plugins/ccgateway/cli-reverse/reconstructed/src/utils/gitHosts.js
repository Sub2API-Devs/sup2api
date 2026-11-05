/**
 * utils/gitHosts.ts
 *
 * 2.1.316 新增：git 主机识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wsf8by0j.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  GITHUB_HOST,
  isGithubDotCom,
  normalizeHostCached,
  hasBackslashInUrlAuthority,
} from "./git/githubUrl.js";
import { describeUrlScheme } from "./resultError.js";
import { isSuspiciousUrl } from "./fsBoundRead.js";

//@ chunk-wsf8by0j.js:310-355 placement
/**
 * 去掉主机名末尾的端口号。
 */
function portlessHost(host) {
  return host.replace(/:\d+$/, "");
}
//@ chunk-wsf8by0j.js:355-523 placement
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
//@ chunk-wsf8by0j.js:523-670 placement
/**
 * 识别 git 主机类型：github、已知自托管映射、gitlab、bitbucket 或 other。
 */
function getGitHostKind(host) {
  host = portlessHost(host);
  if (isGithubDotCom(host)) return "github";
  let host_2 = normalizeHostCached(host);
  let kind = SSH_HOST_KIND_MAP[host_2];
  if (kind) return kind;
  if (host_2 === GITLAB_COM) return "gitlab";
  if (host_2 === BITBUCKET_ORG) return "bitbucket";
  return "other";
}
//@ chunk-wsf8by0j.js:670-864 placement (2.1.88 match: ghIsDangerousCallback, 0.819)
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
//@ chunk-wsf8by0j.js:864-984 placement
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
export { ghIsDangerousCallback, getGitHostKind, parseScpLikeUrl, portlessHost, GIT_HOST_NAME_BY_KIND };
