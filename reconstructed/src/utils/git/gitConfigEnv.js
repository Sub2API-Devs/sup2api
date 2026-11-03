/**
 * utils/git/gitConfigEnv.ts
 *
 * GIT_CONFIG_* 环境构造（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (3)
 * attribution: placement 3
 */
import { isAbsolute } from "path";
import { getRemoteHostSessionCount } from "../../commands/insights.js";

//@ chunk-q8cqcff6.js:4038-4159 placement
var QUOTED_PARAM_RE = String.raw`'([^']*)'(?:(=)(?:'([^']*)')?)?`;
var GIT_CONFIG_PARAMETERS_RE = new RegExp(
  String.raw`^(?:${QUOTED_PARAM_RE}(?:[ \t\r\n]+${QUOTED_PARAM_RE})*)?[ \t\r\n]*$`,
);
//@ chunk-q8cqcff6.js:4159-4811 placement
function buildGitConfigEnv(e = process.env) {
  let n = [];
  let GIT_CONFIG_COUNT = e.GIT_CONFIG_COUNT;
  if (GIT_CONFIG_COUNT !== undefined) {
    if (!/^\d{1,3}$/.test(GIT_CONFIG_COUNT)) return {};
    for (let j = 0; j < Number(GIT_CONFIG_COUNT); j++) {
      let y = e[`GIT_CONFIG_KEY_${j}`];
      let P = e[`GIT_CONFIG_VALUE_${j}`];
      if (y === undefined || P === undefined) return {};
      n.push([y, P]);
    }
  }
  let GIT_CONFIG_PARAMETERS = e.GIT_CONFIG_PARAMETERS;
  if (GIT_CONFIG_PARAMETERS !== undefined && GIT_CONFIG_PARAMETERS_RE.test(GIT_CONFIG_PARAMETERS))
    for (let [, h = "", y, P = ""] of GIT_CONFIG_PARAMETERS.matchAll(new RegExp(QUOTED_PARAM_RE, "g"))) {
      let O = y === undefined ? h.indexOf("=") : -1;
      n.push(y !== undefined || O === -1 ? [h, P] : [h.slice(0, O), h.slice(O + 1)]);
    }
  let S = {};
  let E = 0;
  for (let [h, y] of n)
    if (h.toLowerCase() === "safe.directory") {
      S[`GIT_CONFIG_KEY_${E}`] = "safe.directory";
      S[`GIT_CONFIG_VALUE_${E}`] = y;
      E++;
    }
  if (E === 0) return {};
  S.GIT_CONFIG_COUNT = String(E);
  return S;
}
//@ chunk-q8cqcff6.js:4811-4976 placement
/**
 * 保留绝对的 GIT_CONFIG_GLOBAL/SYSTEM 并构造安全 git 环境。
 */
function buildGitConfigScopedEnv() {
  let e = {};
  for (let n of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let r = process.env[n];
    if (r !== undefined && (r === "" || isAbsolute(r))) e[n] = r;
  }
  return getRemoteHostSessionCount({
    ...e,
    ...buildGitConfigEnv(),
  });
}
export { buildGitConfigEnv, buildGitConfigScopedEnv };
