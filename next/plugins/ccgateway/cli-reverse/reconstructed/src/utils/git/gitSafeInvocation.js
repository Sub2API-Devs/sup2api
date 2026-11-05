/**
 * utils/git/gitSafeInvocation.ts
 *
 * 2.1.316 新增：构造带安全环境与全局参数的 git 调用（禁用 hooks/危险配置），以及判断缺失哪些安全环境变量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hb44av3w.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import {
  mapped,
  hasEnvVar,
  getGitSafetyConfigPairs,
  buildGitConfigEnv,
  NULL_HOOKS_PATH_PATTERN,
  nullDevicePath,
} from "../gitSafeExec.js";
import { LFS_SKIP_ENV, pickByHelper } from "./gitSafeEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hb44av3w.js:6676-6853 placement
/**
 * （切分错误，git 安全）允许保留仓库钩子时可省略的配置键，以及强制的安全环境变量（GIT_NO_LAZY_FETCH、GIT_NO_REPLACE_OBJECTS、GIT_TERMINAL_PROMPT=0…）。
 */
var GIT_SAFETY_CONFIG_KEYS; // deferred: uses NULL_HOOKS_PATH_PATTERN (../gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var GIT_SAFETY_ENV;
deferInit("chunk-hb44av3w.js:6676", () => {
  GIT_SAFETY_CONFIG_KEYS = new Set([
    "core.hooksPath",
    "core.askPass",
    "submodule.recurse",
    ...mapped.map(([key]) => key),
  ]);
  GIT_SAFETY_ENV = {
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    ...LFS_SKIP_ENV,
  };
});
//@ chunk-hb44av3w.js:6853-6966 placement
/**
 * （切分错误，git 安全）返回尚未在环境中设置的 git 安全环境变量。
 */
function missingGitSafetyEnv(env, { allowGitTerminalPrompt = false } = {}) {
  return pickByHelper(
    GIT_SAFETY_ENV,
    (value, varName) =>
      !(allowGitTerminalPrompt && varName === "GIT_TERMINAL_PROMPT") && !hasEnvVar(env, varName),
  );
}
//@ chunk-hb44av3w.js:6966-7434 placement
/**
 * （切分错误，git 安全）若可执行文件是 git，返回加上安全 -c 配置的参数和安全环境（GIT_TERMINAL_PROMPT=0 等）；可选择保留仓库钩子。
 */
function buildSafeGitInvocation(
  file,
  args,
  env,
  configCount = env.GIT_CONFIG_COUNT,
  { allowRepoGitHooks = false, allowGitTerminalPrompt = false } = {},
) {
  let lower = basename(file).toLowerCase();
  if (!/^git(\.exe|\.cmd|\.bat|\.com)?$/.test(lower)) return null;
  let safetyPairs = allowRepoGitHooks
    ? getGitSafetyConfigPairs().filter(([key]) => !GIT_SAFETY_CONFIG_KEYS.has(key))
    : getGitSafetyConfigPairs();
  let mapped = findGitConfigArgIndexes(args).map((index) => args[index]);
  return {
    args: safetyPairs
      .filter(([key]) => !mapped.some((existing) => existing.startsWith(`${key}=`)))
      .flatMap(([key, value]) => ["-c", `${key}=${value}`])
      .concat(rewriteNullHooksPath(args)),
    env: {
      ...env,
      ...missingGitSafetyEnv(env, {
        allowGitTerminalPrompt,
      }),
      ...buildGitConfigEnv(configCount, safetyPairs),
      GIT_PROXY_COMMAND: env.GIT_PROXY_COMMAND ?? "",
    },
  };
}
//@ chunk-hb44av3w.js:7434-7559 placement (2.1.88 match: GIT_GLOBAL_FLAGS_WITH_VALUES, 0.848)
var GIT_GLOBAL_FLAGS_WITH_VALUES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hb44av3w.js:7434", () => {
  GIT_GLOBAL_FLAGS_WITH_VALUES = new Set([
    "-C",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--super-prefix",
    "--config-env",
    "--attr-source",
    "--exec-path",
  ]);
});
//@ chunk-hb44av3w.js:7559-7747 placement
function findGitConfigArgIndexes(args) {
  let configArgIndexes = [];
  let index = 0;
  while (index < args.length) {
    let arg = args[index];
    if (arg === "-c" && index + 1 < args.length) {
      configArgIndexes.push(index + 1);
      index += 2;
    } else if (GIT_GLOBAL_FLAGS_WITH_VALUES.has(arg) && index + 1 < args.length) index += 2;
    else if (arg.startsWith("-")) index += 1;
    else break;
  }
  return configArgIndexes;
}
//@ chunk-hb44av3w.js:7747-7851 placement
function rewriteNullHooksPath(args) {
  let out = [...args];
  for (let index of findGitConfigArgIndexes(out))
    if (NULL_HOOKS_PATH_PATTERN.test(out[index])) out[index] = `core.hooksPath=${nullDevicePath()}`;
  return out;
}
export { buildSafeGitInvocation, missingGitSafetyEnv, GIT_SAFETY_ENV };
