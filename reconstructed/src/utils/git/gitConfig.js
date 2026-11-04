/**
 * utils/git/gitConfig.ts
 *
 * 2.1.316 新增：读取 git 配置里的路径型键（指定作用域、跟随 include、10 秒超时），失败返回空串。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qcqdqsn4.js (6)
 * attribution: placement 6
 */
import { isAbsolute, resolve } from "path";
import { execFileAsync } from "../../services/selfHostedRunner/configureGit.js";

//@ chunk-qcqdqsn4.js:4214-4224 placement
/**
 * git config 子进程超时（10 秒）。
 */
var GIT_CONFIG_TIMEOUT_MS = 1e4;
//@ chunk-qcqdqsn4.js:4224-4386 placement
/**
 * 读取 git 配置中的路径型键（指定作用域、跟随 include，10 秒超时），失败返回空串。
 */
function readGitConfigPath(args, key, env) {
  return execFileAsync("git", ["config", ...args, "--includes", "--type=path", "--get", key], {
    windowsHide: true,
    timeout: GIT_CONFIG_TIMEOUT_MS,
    ...(env && {
      env,
    }),
  }).then(
    (result) => result.stdout.trim(),
    () => "",
  );
}
//@ chunk-qcqdqsn4.js:4386-4589 placement
/**
 * 并行读取某 git 配置键在 system（带来源文件）与 global 作用域的值。
 */
async function readSystemAndGlobalGitConfigPath(key, env) {
  let [gitConfigPathWithOrigin, gitConfigPath] = await Promise.all([
    readGitConfigPathWithOrigin(["--system"], key, env),
    readGitConfigPath(["--global"], key, env),
  ]);
  return {
    ...(gitConfigPathWithOrigin.value !== "" && {
      system: gitConfigPathWithOrigin.value,
    }),
    ...(gitConfigPathWithOrigin.origin !== undefined && {
      systemOrigin: gitConfigPathWithOrigin.origin,
    }),
    ...(gitConfigPath !== "" && {
      global: gitConfigPath,
    }),
  };
}
//@ chunk-qcqdqsn4.js:4589-4712 placement = getValue (0.649)
/**
 * 返回该 git 配置键在哪些作用域（system/global）被设置。
 */
async function getGitConfigScopesWithValue(source, path) {
  let { system, global: globalPath } = await readSystemAndGlobalGitConfigPath(source, path);
  return [...(system !== undefined ? ["system"] : []), ...(globalPath !== undefined ? ["global"] : [])];
}
//@ chunk-qcqdqsn4.js:4712-5033 placement
async function readGitConfigPathWithOrigin(args, key, env) {
  let stdout = await execFileAsync(
    "git",
    ["config", ...args, "--includes", "--show-origin", "-z", "--type=path", "--get", key],
    {
      cwd: "/",
      windowsHide: true,
      timeout: GIT_CONFIG_TIMEOUT_MS,
      ...(env && {
        env,
      }),
    },
  ).then(
    (stdout) => stdout.stdout,
    () => "",
  );
  let index = stdout.indexOf("\x00");
  if (index < 0)
    return {
      value: stdout.trim(),
    };
  return {
    value: stdout
      .slice(index + 1)
      .replace(/\0$/, "")
      .trim(),
    origin: stripFilePrefix(stdout.slice(0, index)),
  };
}
//@ chunk-qcqdqsn4.js:5033-5148 placement = _temp2 (1)
var stripFilePrefix = (value) => (value.startsWith("file:") ? value.slice(5) : value);
var stripTrailingSlashes = (value) => (value.length > 1 ? value.replace(/[\\/]+$/, "") : value);
var isNormalizedAbsolutePath = (value) => isAbsolute(value) && resolve(value) === stripTrailingSlashes(value);
export {
  GIT_CONFIG_TIMEOUT_MS,
  stripFilePrefix,
  isNormalizedAbsolutePath,
  getGitConfigScopesWithValue,
  readSystemAndGlobalGitConfigPath,
  stripTrailingSlashes,
  readGitConfigPath,
};
