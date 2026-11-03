/**
 * utils/git/gitSafeInvocation.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sycgf9xs.js (6)
 * attribution: placement 6
 */
import { basename, basename as basename_2 } from "path";
import {
  mapped,
  hasEnvVar,
  getGitSafetyConfigPairs,
  buildGitConfigEnv,
  NULL_HOOKS_PATH_PATTERN,
  rDn,
} from "../gitSafeExec.js";
import { freeze_3, Do } from "./gitSafeEnv.js";

/**
 * （切分错误，git 安全）允许保留仓库钩子时可省略的配置键，以及强制的安全环境变量（GIT_NO_LAZY_FETCH、GIT_NO_REPLACE_OBJECTS、GIT_TERMINAL_PROMPT=0…）。
 */
//@ chunk-sycgf9xs.js:6640-6817 placement
var GIT_SAFETY_CONFIG_KEYS = new Set([
    "core.hooksPath",
    "core.askPass",
    "submodule.recurse",
    ...mapped.map(([e]) => e),
  ]),
  GIT_SAFETY_ENV = {
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    ...freeze_3,
  };
/**
 * （切分错误，git 安全）返回尚未在环境中设置的 git 安全环境变量。
 */
//@ chunk-sycgf9xs.js:6817-6930 placement
function missingGitSafetyEnv(e, { allowGitTerminalPrompt: n = !1 } = {}) {
  return Do(GIT_SAFETY_ENV, (r, o) => !(n && o === "GIT_TERMINAL_PROMPT") && !hasEnvVar(e, o));
}
/**
 * （切分错误，git 安全）若可执行文件是 git，返回加上安全 -c 配置的参数和安全环境（GIT_TERMINAL_PROMPT=0 等）；可选择保留仓库钩子。
 */
//@ chunk-sycgf9xs.js:6930-7398 placement
function buildSafeGitInvocation(
  e,
  n,
  r,
  o = r.GIT_CONFIG_COUNT,
  { allowRepoGitHooks: s = !1, allowGitTerminalPrompt: u = !1 } = {},
) {
  let lower = basename_2(e).toLowerCase();
  if (!/^git(\.exe|\.cmd|\.bat|\.com)?$/.test(lower)) return null;
  let d = s
      ? getGitSafetyConfigPairs().filter(([f]) => !GIT_SAFETY_CONFIG_KEYS.has(f))
      : getGitSafetyConfigPairs(),
    mapped = findGitConfigArgIndexes(n).map((f) => n[f]);
  return {
    args: d
      .filter(([f]) => !mapped.some((m) => m.startsWith(`${f}=`)))
      .flatMap(([f, m]) => ["-c", `${f}=${m}`])
      .concat(rewriteNullHooksPath(n)),
    env: {
      ...r,
      ...missingGitSafetyEnv(r, { allowGitTerminalPrompt: u }),
      ...buildGitConfigEnv(o, d),
      GIT_PROXY_COMMAND: r.GIT_PROXY_COMMAND ?? "",
    },
  };
}
//@ chunk-sycgf9xs.js:7398-7523 placement = GIT_GLOBAL_FLAGS_WITH_VALUES (0.848)
var GIT_GLOBAL_FLAGS_WITH_VALUES = new Set([
  "-C",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
  "--attr-source",
  "--exec-path",
]);
//@ chunk-sycgf9xs.js:7523-7711 placement
function findGitConfigArgIndexes(e) {
  let n = [],
    r = 0;
  while (r < e.length) {
    let o = e[r];
    if (o === "-c" && r + 1 < e.length) (n.push(r + 1), (r += 2));
    else if (GIT_GLOBAL_FLAGS_WITH_VALUES.has(o) && r + 1 < e.length) r += 2;
    else if (o.startsWith("-")) r += 1;
    else break;
  }
  return n;
}
//@ chunk-sycgf9xs.js:7711-7815 placement
function rewriteNullHooksPath(e) {
  let n = [...e];
  for (let r of findGitConfigArgIndexes(n))
    if (NULL_HOOKS_PATH_PATTERN.test(n[r])) n[r] = `core.hooksPath=${rDn()}`;
  return n;
}

export { buildSafeGitInvocation, missingGitSafetyEnv, GIT_SAFETY_ENV };
