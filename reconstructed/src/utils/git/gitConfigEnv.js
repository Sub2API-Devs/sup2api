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
var QUOTED_PARAM_RE = String.raw`'([^']*)'(?:(=)(?:'([^']*)')?)?`,
  GIT_CONFIG_PARAMETERS_RE = new RegExp(
    String.raw`^(?:${QUOTED_PARAM_RE}(?:[ \t\r\n]+${QUOTED_PARAM_RE})*)?[ \t\r\n]*$`,
  );
//@ chunk-q8cqcff6.js:4159-4811 placement
function buildGitConfigEnv(e = process.env) {
  let n = [],
    GIT_CONFIG_COUNT = e.GIT_CONFIG_COUNT;
  if (GIT_CONFIG_COUNT !== void 0) {
    if (!/^\d{1,3}$/.test(GIT_CONFIG_COUNT)) return {};
    for (let h = 0; h < Number(GIT_CONFIG_COUNT); h++) {
      let y = e[`GIT_CONFIG_KEY_${h}`],
        P = e[`GIT_CONFIG_VALUE_${h}`];
      if (y === void 0 || P === void 0) return {};
      n.push([y, P]);
    }
  }
  let GIT_CONFIG_PARAMETERS = e.GIT_CONFIG_PARAMETERS;
  if (GIT_CONFIG_PARAMETERS !== void 0 && GIT_CONFIG_PARAMETERS_RE.test(GIT_CONFIG_PARAMETERS))
    for (let [, h = "", y, P = ""] of GIT_CONFIG_PARAMETERS.matchAll(new RegExp(QUOTED_PARAM_RE, "g"))) {
      let O = y === void 0 ? h.indexOf("=") : -1;
      n.push(y !== void 0 || O === -1 ? [h, P] : [h.slice(0, O), h.slice(O + 1)]);
    }
  let S = {},
    E = 0;
  for (let [h, y] of n)
    if (h.toLowerCase() === "safe.directory")
      ((S[`GIT_CONFIG_KEY_${E}`] = "safe.directory"), (S[`GIT_CONFIG_VALUE_${E}`] = y), E++);
  if (E === 0) return {};
  return ((S.GIT_CONFIG_COUNT = String(E)), S);
}
/**
 * 保留绝对的 GIT_CONFIG_GLOBAL/SYSTEM 并构造安全 git 环境。
 */
//@ chunk-q8cqcff6.js:4811-4976 placement
function buildGitConfigScopedEnv() {
  let e = {};
  for (let n of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let r = process.env[n];
    if (r !== void 0 && (r === "" || isAbsolute(r))) e[n] = r;
  }
  return getRemoteHostSessionCount({ ...e, ...buildGitConfigEnv() });
}

export { buildGitConfigEnv, buildGitConfigScopedEnv };
