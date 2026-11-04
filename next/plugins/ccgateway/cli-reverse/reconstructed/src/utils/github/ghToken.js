/**
 * utils/github/ghToken.ts
 *
 * 读取 gh 令牌（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (7)
 * attribution: placement 7
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

//@ chunk-s61vbvea.js:523910-523964 placement
class GhTokenCache {
  resultsByHost = new Map();
  inFlightByHost = new Map();
}
//@ chunk-s61vbvea.js:523964-523996 placement
var ghTokenCacheRegistry; // deferred: uses GhTokenCache of its import cycle while loading; runs once the cycle is complete
var GH_TOKEN_CACHE_TTL_MS;
deferInit("chunk-s61vbvea.js:523964", () => {
  ghTokenCacheRegistry = new HostScoped(() => new GhTokenCache());
  GH_TOKEN_CACHE_TTL_MS = 500;
});
//@ chunk-s61vbvea.js:523996-524033 placement
function currentGhTokenCache() {
  return ghTokenCacheRegistry.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:524033-524109 placement
/**
 * 取指定主机的 gh 令牌，未登录时返回 null。
 */
async function ghTokenOrNull(host) {
  let ghToken = await getGhTokenCached(host);
  return ghToken.kind === "token" ? ghToken.token : null;
}
//@ chunk-s61vbvea.js:524109-524369 placement
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
//@ chunk-s61vbvea.js:524369-524451 placement
/**
 * 清除指定主机的 gh 令牌缓存与在途请求记录。
 */
function clearGhTokenCache(host) {
  let { resultsByHost, inFlightByHost } = currentGhTokenCache();
  resultsByHost.delete(host);
  inFlightByHost.delete(host);
}
//@ chunk-s61vbvea.js:524451-525349 placement
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
