/**
 * utils/git/gitConfigEnv.ts
 *
 * GIT_CONFIG_* 环境构造（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (3)
 * attribution: placement 3
 */
import { isAbsolute } from "path";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:4176-4297 placement
var QUOTED_PARAM_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_CONFIG_PARAMETERS_RE;
deferInit("chunk-5fn9rb8r.js:4176", () => {
  QUOTED_PARAM_RE = String.raw`'([^']*)'(?:(=)(?:'([^']*)')?)?`;
  GIT_CONFIG_PARAMETERS_RE = new RegExp(
    String.raw`^(?:${QUOTED_PARAM_RE}(?:[ \t\r\n]+${QUOTED_PARAM_RE})*)?[ \t\r\n]*$`,
  );
});
//@ chunk-5fn9rb8r.js:4297-4949 placement
function buildGitConfigEnv(env = process.env) {
  let pairs = [];
  let GIT_CONFIG_COUNT = env.GIT_CONFIG_COUNT;
  if (GIT_CONFIG_COUNT !== undefined) {
    if (!/^\d{1,3}$/.test(GIT_CONFIG_COUNT)) return {};
    for (let j = 0; j < Number(GIT_CONFIG_COUNT); j++) {
      let key = env[`GIT_CONFIG_KEY_${j}`];
      let value = env[`GIT_CONFIG_VALUE_${j}`];
      if (key === undefined || value === undefined) return {};
      pairs.push([key, value]);
    }
  }
  let GIT_CONFIG_PARAMETERS = env.GIT_CONFIG_PARAMETERS;
  if (GIT_CONFIG_PARAMETERS !== undefined && GIT_CONFIG_PARAMETERS_RE.test(GIT_CONFIG_PARAMETERS))
    for (let [, quotedKey = "", separator, quotedValue = ""] of GIT_CONFIG_PARAMETERS.matchAll(
      new RegExp(QUOTED_PARAM_RE, "g"),
    )) {
      let separatorIndex = separator === undefined ? quotedKey.indexOf("=") : -1;
      pairs.push(
        separator !== undefined || separatorIndex === -1
          ? [quotedKey, quotedValue]
          : [quotedKey.slice(0, separatorIndex), quotedKey.slice(separatorIndex + 1)],
      );
    }
  let envOut = {};
  let index = 0;
  for (let [key, value] of pairs)
    if (key.toLowerCase() === "safe.directory") {
      envOut[`GIT_CONFIG_KEY_${index}`] = "safe.directory";
      envOut[`GIT_CONFIG_VALUE_${index}`] = value;
      index++;
    }
  if (index === 0) return {};
  envOut.GIT_CONFIG_COUNT = String(index);
  return envOut;
}
//@ chunk-5fn9rb8r.js:4949-5114 placement
/**
 * 保留绝对的 GIT_CONFIG_GLOBAL/SYSTEM 并构造安全 git 环境。
 */
function buildGitConfigScopedEnv() {
  let envOut = {};
  for (let varName of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let value = process.env[varName];
    if (value !== undefined && (value === "" || isAbsolute(value))) envOut[varName] = value;
  }
  return getRemoteHostSessionCount({
    ...envOut,
    ...buildGitConfigEnv(),
  });
}
export { buildGitConfigScopedEnv, buildGitConfigEnv };
