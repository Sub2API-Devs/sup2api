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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  normalize,
  normalize as normalize_2,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
} from "fs/promises";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isGithubDotCom, sameHost } from "../git/githubUrl.js";
import { whichAsync } from "../which.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { mn } from "../remoteEnvironment.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { withTimeout } from "../sleep.js";
import { isENOENT } from "../errors.js";
import { execFileNoThrow } from "../execFileNoThrow.js";

//@ chunk-s61vbvea.js:523910-523964 placement
class tk {
  resultsByHost = new Map();
  inFlightByHost = new Map();
}
//@ chunk-s61vbvea.js:523964-523996 placement
var R$ = new HostScoped(() => new tk()),
  x$ = 500;
//@ chunk-s61vbvea.js:523996-524033 placement
function nk() {
  return R$.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:524033-524109 placement
async function rk(e) {
  let n = await getGhTokenCached(e);
  return n.kind === "token" ? n.token : null;
}
/**
 * 按主机缓存 gh 令牌读取结果，并发请求共享。
 */
//@ chunk-s61vbvea.js:524109-524369 placement
async function getGhTokenCached(e) {
  let { resultsByHost: resultsByHost, inFlightByHost: inFlightByHost } = nk(),
    s = resultsByHost.get(e);
  if (s !== void 0) return s;
  let h = inFlightByHost.get(e);
  if (h !== void 0) return h;
  let y = readGhToken(e)
    .then((S) => {
      if (inFlightByHost.get(e) === y) resultsByHost.set(e, S);
      return S;
    })
    .finally(() => {
      if (inFlightByHost.get(e) === y) inFlightByHost.delete(e);
    });
  return (inFlightByHost.set(e, y), y);
}
//@ chunk-s61vbvea.js:524369-524451 placement
function sp(e) {
  let { resultsByHost: resultsByHost, inFlightByHost: inFlightByHost } = nk();
  (resultsByHost.delete(e), inFlightByHost.delete(e));
}
//@ chunk-s61vbvea.js:524451-525349 placement
async function readGhToken(e) {
  let n = isGithubDotCom(e)
    ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    : sameHost(process.env.GH_HOST, e)
      ? process.env.GH_ENTERPRISE_TOKEN || process.env.GITHUB_ENTERPRISE_TOKEN
      : void 0;
  if (n) return { kind: "token", token: n };
  if (!(await whichAsync("gh"))) return { kind: "gh-missing" };
  let s = {
    ...subprocessEnv(),
    GH_TOKEN: "",
    GITHUB_TOKEN: "",
    GH_ENTERPRISE_TOKEN: "",
    GITHUB_ENTERPRISE_TOKEN: "",
  };
  if (mn() && getPlatform_2() === "linux") {
    let w = s.XDG_CONFIG_HOME || (s.HOME && join_19(s.HOME, ".config")),
      R = s.GH_CONFIG_DIR || (w && join_19(w, "gh")),
      x =
        R && isAbsolute_15(R)
          ? await withTimeout(
              readdir_7(normalize_2(R)),
              x$,
              "listing the gh config directory timed out",
            ).catch((P) => (isENOENT(P) ? [] : null))
          : null;
    if (x !== null && !x.includes("hosts.yml") && !x.includes("config.yml")) return { kind: "no-token" };
  }
  let { stdout: stdout, code: code } = await execFileNoThrow("gh", ["auth", "token", "--hostname", e], {
    timeout: 5000,
    preserveOutputOnError: !1,
    env: s,
    extendEnv: !1,
  });
  if (code !== 0) return { kind: "no-token" };
  let trimmed = stdout.trim();
  return trimmed.length > 0 ? { kind: "token", token: trimmed } : { kind: "no-token" };
}

export { rk, getGhTokenCached, sp };
