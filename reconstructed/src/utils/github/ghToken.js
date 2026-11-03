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

//@ chunk-s61vbvea.js:523910-523964 placement
class GhTokenCache {
  resultsByHost = new Map();
  inFlightByHost = new Map();
}
//@ chunk-s61vbvea.js:523964-523996 placement
var ghTokenCacheRegistry = new HostScoped(() => new GhTokenCache());
var GH_TOKEN_CACHE_TTL_MS = 500;
//@ chunk-s61vbvea.js:523996-524033 placement
function currentGhTokenCache() {
  return ghTokenCacheRegistry.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:524033-524109 placement
/**
 * 取指定主机的 gh 令牌，未登录时返回 null。
 */
async function ghTokenOrNull(e) {
  let ghToken = await getGhTokenCached(e);
  return ghToken.kind === "token" ? ghToken.token : null;
}
//@ chunk-s61vbvea.js:524109-524369 placement
/**
 * 按主机缓存 gh 令牌读取结果，并发请求共享。
 */
async function getGhTokenCached(e) {
  let { resultsByHost, inFlightByHost } = currentGhTokenCache();
  let s = resultsByHost.get(e);
  if (s !== undefined) return s;
  let h = inFlightByHost.get(e);
  if (h !== undefined) return h;
  let y = readGhToken(e)
    .then((ghToken) => {
      if (inFlightByHost.get(e) === y) resultsByHost.set(e, ghToken);
      return ghToken;
    })
    .finally(() => {
      if (inFlightByHost.get(e) === y) inFlightByHost.delete(e);
    });
  inFlightByHost.set(e, y);
  return y;
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
async function readGhToken(e) {
  let n = isGithubDotCom(e)
    ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    : sameHost(process.env.GH_HOST, e)
      ? process.env.GH_ENTERPRISE_TOKEN || process.env.GITHUB_ENTERPRISE_TOKEN
      : undefined;
  if (n)
    return {
      kind: "token",
      token: n,
    };
  if (!(await whichAsync("gh")))
    return {
      kind: "gh-missing",
    };
  let s = {
    ...subprocessEnv(),
    GH_TOKEN: "",
    GITHUB_TOKEN: "",
    GH_ENTERPRISE_TOKEN: "",
    GITHUB_ENTERPRISE_TOKEN: "",
  };
  if (isRemoteManagedEnvironment() && getPlatform_2() === "linux") {
    let w = s.XDG_CONFIG_HOME || (s.HOME && join(s.HOME, ".config"));
    let R = s.GH_CONFIG_DIR || (w && join(w, "gh"));
    let x =
      R && isAbsolute(R)
        ? await withTimeout(
            readdir(normalize(R)),
            GH_TOKEN_CACHE_TTL_MS,
            "listing the gh config directory timed out",
          ).catch((error) => (isENOENT(error) ? [] : null))
        : null;
    if (x !== null && !x.includes("hosts.yml") && !x.includes("config.yml"))
      return {
        kind: "no-token",
      };
  }
  let { stdout, code } = await execFileNoThrow("gh", ["auth", "token", "--hostname", e], {
    timeout: 5000,
    preserveOutputOnError: false,
    env: s,
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
