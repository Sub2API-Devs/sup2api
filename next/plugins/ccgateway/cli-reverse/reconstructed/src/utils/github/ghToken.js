/**
 * utils/github/ghToken.ts
 *
 * 读取 gh 令牌（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, isAbsolute, normalize } from "path";
import { readdir } from "fs/promises";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isGithubDotCom, sameHost } from "../git/githubUrl.js";
import { whichAsync } from "../which.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { withTimeout } from "../sleep.js";
import { isENOENT } from "../errors.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:441013-441067 placement
class GhTokenCache {
  resultsByHost = new Map();
  inFlightByHost = new Map();
}
//@ chunk-7jxyna5q.js:441067-441099 placement
var ghTokenCacheRegistry; // deferred: uses GhTokenCache of its import cycle while loading; runs once the cycle is complete
var GH_TOKEN_CACHE_TTL_MS;
deferInit("chunk-7jxyna5q.js:441067", () => {
  ghTokenCacheRegistry = new HostScoped(() => new GhTokenCache());
  GH_TOKEN_CACHE_TTL_MS = 500;
});
//@ chunk-7jxyna5q.js:441099-441136 placement
function currentGhTokenCache() {
  return ghTokenCacheRegistry.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:441136-441212 placement
/**
 * 取指定主机的 gh 令牌，未登录时返回 null。
 */
async function ghTokenOrNull(host) {
  let ghToken = await getGhTokenCached(host);
  return ghToken.kind === "token" ? ghToken.token : null;
}
//@ chunk-7jxyna5q.js:441212-441472 placement
/**
 * 按主机缓存 gh 令牌读取结果，并发请求共享。
 */
async function getGhTokenCached(host) {
  let { resultsByHost, inFlightByHost } = currentGhTokenCache();
  let cached = resultsByHost.get(host);
  if (cached !== undefined) return cached;
  let inFlight = inFlightByHost.get(host);
  if (inFlight !== undefined) return inFlight;
  let tokenPromise = readGhToken(host)
    .then((ghToken) => {
      if (inFlightByHost.get(host) === tokenPromise) resultsByHost.set(host, ghToken);
      return ghToken;
    })
    .finally(() => {
      if (inFlightByHost.get(host) === tokenPromise) inFlightByHost.delete(host);
    });
  inFlightByHost.set(host, tokenPromise);
  return tokenPromise;
}
//@ chunk-7jxyna5q.js:441472-441554 placement
/**
 * 清除指定主机的 gh 令牌缓存与在途请求记录。
 */
function clearGhTokenCache(host) {
  let { resultsByHost, inFlightByHost } = currentGhTokenCache();
  resultsByHost.delete(host);
  inFlightByHost.delete(host);
}
//@ chunk-7jxyna5q.js:441554-442452 placement
async function readGhToken(host) {
  let ghConfigDir = isGithubDotCom(host)
    ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    : sameHost(process.env.GH_HOST, host)
      ? process.env.GH_ENTERPRISE_TOKEN || process.env.GITHUB_ENTERPRISE_TOKEN
      : undefined;
  if (ghConfigDir)
    return {
      kind: "token",
      token: ghConfigDir,
    };
  if (!(await whichAsync("gh")))
    return {
      kind: "gh-missing",
    };
  let env = {
    ...subprocessEnv(),
    GH_TOKEN: "",
    GITHUB_TOKEN: "",
    GH_ENTERPRISE_TOKEN: "",
    GITHUB_ENTERPRISE_TOKEN: "",
  };
  if (isRemoteManagedEnvironment() && getPlatform_2() === "linux") {
    let configHome = env.XDG_CONFIG_HOME || (env.HOME && join(env.HOME, ".config"));
    let ghConfigHome = env.GH_CONFIG_DIR || (configHome && join(configHome, "gh"));
    let hostsFile =
      ghConfigHome && isAbsolute(ghConfigHome)
        ? await withTimeout(
            readdir(normalize(ghConfigHome)),
            GH_TOKEN_CACHE_TTL_MS,
            "listing the gh config directory timed out",
          ).catch((error) => (isENOENT(error) ? [] : null))
        : null;
    if (hostsFile !== null && !hostsFile.includes("hosts.yml") && !hostsFile.includes("config.yml"))
      return {
        kind: "no-token",
      };
  }
  let { stdout, code } = await execFileNoThrow("gh", ["auth", "token", "--hostname", host], {
    timeout: 5000,
    preserveOutputOnError: false,
    env,
    extendEnv: false,
  });
  if (code !== 0)
    return {
      kind: "no-token",
    };
  let trimmed = stdout.trim();
  return trimmed.length > 0
    ? {
        kind: "token",
        token: trimmed,
      }
    : {
        kind: "no-token",
      };
}
export { ghTokenOrNull, getGhTokenCached, clearGhTokenCache };
