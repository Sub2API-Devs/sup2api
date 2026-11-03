/**
 * utils/git/gitConfig.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qcqdqsn4.js (6)
 * attribution: placement 6
 */
import { isAbsolute, resolve } from "path";
import { w } from "../../services/selfHostedRunner/configureGit.js";

/**
 * git config 子进程超时（10 秒）。
 */
//@ chunk-qcqdqsn4.js:4214-4224 placement
var GIT_CONFIG_TIMEOUT_MS = 1e4;
/**
 * 读取 git 配置中的路径型键（指定作用域、跟随 include，10 秒超时），失败返回空串。
 */
//@ chunk-qcqdqsn4.js:4224-4386 placement
function readGitConfigPath(e, n, o) {
  return w("git", ["config", ...e, "--includes", "--type=path", "--get", n], {
    windowsHide: !0,
    timeout: GIT_CONFIG_TIMEOUT_MS,
    ...(o && { env: o }),
  }).then(
    (s) => s.stdout.trim(),
    () => "",
  );
}
/**
 * 并行读取某 git 配置键在 system（带来源文件）与 global 作用域的值。
 */
//@ chunk-qcqdqsn4.js:4386-4589 placement
async function readSystemAndGlobalGitConfigPath(e, n) {
  let [o, s] = await Promise.all([
    readGitConfigPathWithOrigin(["--system"], e, n),
    readGitConfigPath(["--global"], e, n),
  ]);
  return {
    ...(o.value !== "" && { system: o.value }),
    ...(o.origin !== void 0 && { systemOrigin: o.origin }),
    ...(s !== "" && { global: s }),
  };
}
/**
 * 返回该 git 配置键在哪些作用域（system/global）被设置。
 */
//@ chunk-qcqdqsn4.js:4589-4712 placement = getValue (0.649)
async function getGitConfigScopesWithValue(source, path) {
  let { system: system, global: s } = await readSystemAndGlobalGitConfigPath(source, path);
  return [...(system !== void 0 ? ["system"] : []), ...(s !== void 0 ? ["global"] : [])];
}
//@ chunk-qcqdqsn4.js:4712-5033 placement
async function readGitConfigPathWithOrigin(e, n, o) {
  let s = await w("git", ["config", ...e, "--includes", "--show-origin", "-z", "--type=path", "--get", n], {
      cwd: "/",
      windowsHide: !0,
      timeout: GIT_CONFIG_TIMEOUT_MS,
      ...(o && { env: o }),
    }).then(
      (r) => r.stdout,
      () => "",
    ),
    index = s.indexOf("\x00");
  if (index < 0) return { value: s.trim() };
  return {
    value: s
      .slice(index + 1)
      .replace(/\0$/, "")
      .trim(),
    origin: stripFilePrefix(s.slice(0, index)),
  };
}
//@ chunk-qcqdqsn4.js:5033-5148 placement = _temp2 (1)
var stripFilePrefix = (e) => (e.startsWith("file:") ? e.slice(5) : e),
  stripTrailingSlashes = (e) => (e.length > 1 ? e.replace(/[\\/]+$/, "") : e),
  isNormalizedAbsolutePath = (e) => isAbsolute(e) && resolve(e) === stripTrailingSlashes(e);

export {
  GIT_CONFIG_TIMEOUT_MS,
  stripFilePrefix,
  isNormalizedAbsolutePath,
  getGitConfigScopesWithValue,
  readSystemAndGlobalGitConfigPath,
  stripTrailingSlashes,
  readGitConfigPath,
};
