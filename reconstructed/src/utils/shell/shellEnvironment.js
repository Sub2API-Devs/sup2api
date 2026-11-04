/**
 * utils/shell/shellEnvironment.ts
 *
 * 2.1.316 新增：shell 环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { generateProxyEnvVars } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { GIT_ENV_VARS_TO_CLEAR } from "../git/gitSafeEnv.js";
import { DANGEROUS_ENV_NAME_LIST } from "../git/builderGit/gitEnv.js";
import { uniq } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3042318-3042362 placement
var INJECTABLE_ENV_SOURCES = ["settings", "session", "claudeCode"];
//@ chunk-e6aww6q8.js:3042362-3042421 placement
function envNameBeforeEquals(entry) {
  return entry.split("=", 1).join().toUpperCase();
}
//@ chunk-e6aww6q8.js:3042421-3043194 placement
/**
 * 可注入子 shell 的环境变量白名单：Windows 档案变量、语言/locale、PATH 一类，再并上代理 CA/token 变量（NO_PROXY 除外）。
 */
var INJECTABLE_ENV_VARS; // deferred: uses generateProxyEnvVars (../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js) of its import cycle while loading; runs once the cycle is complete
var GIT_CONFIG_PAIR_KEY_RE;
var NON_INJECTABLE_ENV_NAMES;
var ENV_NAME_RE;
var ENV_VALUE_RE;
var RESTOREADDITIONALPROJECTFALLBACKFOLDERS;
var ENV_FLAG;
var ARGV_TERMINATOR;
var MAX_ENV_ARGV_CHARS;
deferInit("chunk-e6aww6q8.js:3042421", () => {
  INJECTABLE_ENV_VARS = memoizeAlias(
    () =>
      new Set([
        "USERPROFILE",
        "HOME",
        "HOMEDRIVE",
        "HOMEPATH",
        "USERNAME",
        "USERDOMAIN",
        "APPDATA",
        "LOCALAPPDATA",
        "TEMP",
        "TMP",
        "TMPDIR",
        "LC_ALL",
        "LC_CTYPE",
        "LANG",
        "LANGUAGE",
        "CHARSET",
        "PATH",
        "PATHEXT",
        "GIT_CONFIG_COUNT",
        "GIT_SSH_COMMAND",
        ...generateProxyEnvVars(1, 1, "ca", "token", true)
          .map(envNameBeforeEquals)
          .filter((envName) => envName !== "NO_PROXY"),
      ]),
  );
  GIT_CONFIG_PAIR_KEY_RE = [/^GIT_CONFIG_(KEY|VALUE)_\d+$/];
  NON_INJECTABLE_ENV_NAMES = new Set([
    "CLAUDECODE",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_SESSION_ATTENDED",
    "CLAUDE_PID",
    "CLAUDE_EFFORT",
    "AI_AGENT",
    "TRACEPARENT",
    "SHELL",
    "NO_PROXY",
    ...GIT_ENV_VARS_TO_CLEAR,
    "GIT_CONFIG_NOSYSTEM",
    "GIT_TEMPLATE_DIR",
    "GIT_SSL_NO_VERIFY",
    ...[...DANGEROUS_ENV_NAME_LIST].filter((envName) => /^(GIT|SSH)_/.test(envName)),
  ]);
  ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  ENV_VALUE_RE = /^[^\0\r\n]*$/;
  RESTOREADDITIONALPROJECTFALLBACKFOLDERS = "RestoreAdditionalProjectFallbackFolders";
  ENV_FLAG = "--env";
  ARGV_TERMINATOR = "--";
  MAX_ENV_ARGV_CHARS = 30000;
});
//@ chunk-e6aww6q8.js:3043194-3043351 placement
function parseExistingEnvArgs(argv) {
  let sliced = argv.slice(0, Math.max(argv.indexOf(ARGV_TERMINATOR), 0));
  return new Map(
    sliced
      .filter((entry, index) => sliced[index - 1] === ENV_FLAG)
      .map((entry) => [envNameBeforeEquals(entry), entry.split("=").slice(1).join("=")]),
  );
}
//@ chunk-e6aww6q8.js:3043351-3043741 placement
/**
 * 过滤可注入命令行的环境变量：来源合法、名字与值格式安全、未被排除或已存在、不是 Windows 配置变量或敏感模式；按来源优先级去重（大小写不敏感）。
 */
function filterInjectableEnvVars(envEntries, excludedNames) {
  let excludedUpper = new Set([...excludedNames].map((name) => name.toUpperCase()));
  let filtered = envEntries.filter(({ source, name, value }) => {
    let upper = name.toUpperCase();
    return (
      INJECTABLE_ENV_SOURCES.includes(source) &&
      ENV_NAME_RE.test(name) &&
      ENV_VALUE_RE.test(value) &&
      !excludedUpper.has(upper) &&
      !INJECTABLE_ENV_VARS().has(upper) &&
      !GIT_CONFIG_PAIR_KEY_RE.some((pattern) => pattern.test(upper)) &&
      !(source !== "claudeCode" && NON_INJECTABLE_ENV_NAMES.has(upper))
    );
  });
  return [
    ...new Map(
      INJECTABLE_ENV_SOURCES.flatMap((source) => filtered.filter((entry) => entry.source === source)).map(
        ({ name, value }) => [name.toUpperCase(), [name, value]],
      ),
    ).values(),
  ];
}
//@ chunk-e6aww6q8.js:3043741-3043892 placement
function getClaudeCodeEnvVars(gitConfigGlobal) {
  return [
    {
      source: "claudeCode",
      name: "GIT_EDITOR",
      value: "true",
    },
    ...(gitConfigGlobal === undefined
      ? []
      : [
          {
            source: "claudeCode",
            name: "GIT_CONFIG_GLOBAL",
            value: gitConfigGlobal,
          },
        ]),
  ];
}
//@ chunk-e6aww6q8.js:3043892-3044181 placement
function getLocalProxyNoProxy(existing) {
  let hosts = uniq(
    ["HTTP_PROXY", "HTTPS_PROXY"].flatMap((varName) => {
      let parsed = URL.parse(existing.get(varName) ?? "");
      return parsed?.port && ["localhost", "127.0.0.1"].includes(parsed.hostname) ? [parsed.host] : [];
    }),
  );
  return existing.get("NODE_USE_ENV_PROXY") === "1" && hosts.length > 0
    ? [
        {
          source: "claudeCode",
          name: "no_proxy",
          value: hosts.join(","),
        },
      ]
    : [];
}
//@ chunk-e6aww6q8.js:3044181-3044434 placement
function collectSettingsAndSessionVars({ scrubbed, subprocessEnv, isFromSettings, sessionEnvVars }) {
  return scrubbed
    ? []
    : [
        ...Object.entries(subprocessEnv).flatMap(([key, value]) =>
          value !== undefined && isFromSettings(key, value)
            ? [
                {
                  source: "settings",
                  name: key,
                  value,
                },
              ]
            : [],
        ),
        ...[...(sessionEnvVars ?? [])].map(([name, value]) => ({
          source: "session",
          name,
          value,
        })),
      ];
}
//@ chunk-e6aww6q8.js:3044434-3044637 placement
function insertEnvArgs(argv, envEntries) {
  let index = argv.indexOf(ARGV_TERMINATOR);
  if (index === -1 || envEntries.length === 0) return argv;
  let newArgv = [
    ...argv.slice(0, index),
    ...envEntries.flatMap(([name, value]) => [ENV_FLAG, `${name}=${value}`]),
    ...argv.slice(index),
  ];
  return newArgv.reduce((acc, arg) => acc + arg.length + 3, 0) > MAX_ENV_ARGV_CHARS ? undefined : newArgv;
}
//@ chunk-e6aww6q8.js:3044637-3045287 placement
/**
 * 把设置/会话/Claude Code 自身的环境变量插入启动 argv（排除已有、被拒绝或遮盖的变量，本地代理时补 no_proxy）；超出长度上限时报告是命令还是变量过长，否则返回新 argv 与被略去的变量名。
 */
function buildEnvArgv(
  argv,
  { gitConfigGlobal, nuGetFallbackFolder, denied, masked, isKeptFromRepositories, ...envOptions },
) {
  let candidates = collectSettingsAndSessionVars(envOptions);
  let envEntries = candidates.filter(({ name }) => !isKeptFromRepositories(name));
  let existing = parseExistingEnvArgs(argv);
  let excludedNames = [
    ...[...existing.keys()].filter((key) => key !== "NODE_USE_ENV_PROXY"),
    ...denied,
    ...masked,
  ];
  let accepted = filterInjectableEnvVars(envEntries, excludedNames);
  let extraVars = [
    ...getClaudeCodeEnvVars(gitConfigGlobal),
    ...(nuGetFallbackFolder === undefined
      ? []
      : [
          {
            source: "claudeCode",
            name: RESTOREADDITIONALPROJECTFALLBACKFOLDERS,
            value: nuGetFallbackFolder,
          },
        ]),
    ...(accepted.some(([name, value]) => name.toUpperCase() === "NODE_USE_ENV_PROXY" && value !== "1")
      ? []
      : getLocalProxyNoProxy(existing)),
  ];
  let finalVars = filterInjectableEnvVars([...envEntries, ...extraVars], excludedNames);
  let newArgv = insertEnvArgs(argv, finalVars);
  if (newArgv === undefined)
    return {
      tooLong:
        insertEnvArgs(argv, filterInjectableEnvVars(extraVars, excludedNames)) === undefined
          ? "command"
          : "variables",
    };
  let acceptedNames = new Set(accepted.map(([name]) => name.toUpperCase()));
  return {
    argv: newArgv,
    leftOut: uniq(
      candidates.map(({ name }) => name).filter((name) => !acceptedNames.has(name.toUpperCase())),
    ),
  };
}
export { buildEnvArgv, RESTOREADDITIONALPROJECTFALLBACKFOLDERS };
