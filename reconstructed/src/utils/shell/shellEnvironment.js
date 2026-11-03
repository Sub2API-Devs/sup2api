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
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Vot } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { dre } from "../git/gitSafeEnv.js";
import { CVo } from "../git/builderGit/gitEnv.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:3042318-3042362 placement
var nwn = ["settings", "session", "claudeCode"];
//@ chunk-e6aww6q8.js:3042362-3042421 placement
function iwn(e) {
  return e.split("=", 1).join().toUpperCase();
}
//@ chunk-e6aww6q8.js:3042421-3043194 placement
var WINDOWS_PROFILE_ENV_VARS = io(
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
        ...Vot(1, 1, "ca", "token", !0)
          .map(iwn)
          .filter((e) => e !== "NO_PROXY"),
      ]),
  ),
  GTr = [/^GIT_CONFIG_(KEY|VALUE)_\d+$/],
  zTr = new Set([
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
    ...dre,
    "GIT_CONFIG_NOSYSTEM",
    "GIT_TEMPLATE_DIR",
    "GIT_SSL_NO_VERIFY",
    ...[...CVo].filter((e) => /^(GIT|SSH)_/.test(e)),
  ]),
  qTr = /^[A-Za-z_][A-Za-z0-9_]*$/,
  KTr = /^[^\0\r\n]*$/,
  RESTOREADDITIONALPROJECTFALLBACKFOLDERS = "RestoreAdditionalProjectFallbackFolders",
  uwn = "--env",
  cwn = "--",
  VTr = 30000;
//@ chunk-e6aww6q8.js:3043194-3043351 placement
function parseExistingEnvArgs(e) {
  let sliced = e.slice(0, Math.max(e.indexOf(cwn), 0));
  return new Map(
    sliced.filter((r, s) => sliced[s - 1] === uwn).map((r) => [iwn(r), r.split("=").slice(1).join("=")]),
  );
}
/**
 * 过滤可注入命令行的环境变量：来源合法、名字与值格式安全、未被排除或已存在、不是 Windows 配置变量或敏感模式；按来源优先级去重（大小写不敏感）。
 */
//@ chunk-e6aww6q8.js:3043351-3043741 placement
function filterInjectableEnvVars(e, n) {
  let r = new Set([...n].map((y) => y.toUpperCase())),
    filtered = e.filter(({ source: source, name: S, value: w }) => {
      let upper = S.toUpperCase();
      return (
        nwn.includes(source) &&
        qTr.test(S) &&
        KTr.test(w) &&
        !r.has(upper) &&
        !WINDOWS_PROFILE_ENV_VARS().has(upper) &&
        !GTr.some((G) => G.test(upper)) &&
        !(source !== "claudeCode" && zTr.has(upper))
      );
    });
  return [
    ...new Map(
      nwn
        .flatMap((y) => filtered.filter((S) => S.source === y))
        .map(({ name: y, value: S }) => [y.toUpperCase(), [y, S]]),
    ).values(),
  ];
}
//@ chunk-e6aww6q8.js:3043741-3043892 placement
function getClaudeCodeEnvVars(e) {
  return [
    { source: "claudeCode", name: "GIT_EDITOR", value: "true" },
    ...(e === void 0 ? [] : [{ source: "claudeCode", name: "GIT_CONFIG_GLOBAL", value: e }]),
  ];
}
//@ chunk-e6aww6q8.js:3043892-3044181 placement
function getLocalProxyNoProxy(e) {
  let n = uniq(
    ["HTTP_PROXY", "HTTPS_PROXY"].flatMap((r) => {
      let parse = URL.parse(e.get(r) ?? "");
      return parse?.port && ["localhost", "127.0.0.1"].includes(parse.hostname) ? [parse.host] : [];
    }),
  );
  return e.get("NODE_USE_ENV_PROXY") === "1" && n.length > 0
    ? [{ source: "claudeCode", name: "no_proxy", value: n.join(",") }]
    : [];
}
//@ chunk-e6aww6q8.js:3044181-3044434 placement
function collectSettingsAndSessionVars({
  scrubbed: scrubbed,
  subprocessEnv: subprocessEnv,
  isFromSettings: isFromSettings,
  sessionEnvVars: sessionEnvVars,
}) {
  return scrubbed
    ? []
    : [
        ...Object.entries(subprocessEnv).flatMap(([h, y]) =>
          y !== void 0 && isFromSettings(h, y) ? [{ source: "settings", name: h, value: y }] : [],
        ),
        ...[...(sessionEnvVars ?? [])].map(([h, y]) => ({ source: "session", name: h, value: y })),
      ];
}
//@ chunk-e6aww6q8.js:3044434-3044637 placement
function insertEnvArgs(e, n) {
  let index = e.indexOf(cwn);
  if (index === -1 || n.length === 0) return e;
  let s = [...e.slice(0, index), ...n.flatMap(([h, y]) => [uwn, `${h}=${y}`]), ...e.slice(index)];
  return s.reduce((h, y) => h + y.length + 3, 0) > VTr ? void 0 : s;
}
/**
 * 把设置/会话/Claude Code 自身的环境变量插入启动 argv（排除已有、被拒绝或遮盖的变量，本地代理时补 no_proxy）；超出长度上限时报告是命令还是变量过长，否则返回新 argv 与被略去的变量名。
 */
//@ chunk-e6aww6q8.js:3044637-3045287 placement
function buildEnvArgv(
  argv,
  {
    gitConfigGlobal: gitConfigGlobal,
    nuGetFallbackFolder: nuGetFallbackFolder,
    denied: denied,
    masked: masked,
    isKeptFromRepositories: isKeptFromRepositories,
    ...S
  },
) {
  let candidates = collectSettingsAndSessionVars(S),
    filtered = candidates.filter(({ name: Ae }) => !isKeptFromRepositories(Ae)),
    existing = parseExistingEnvArgs(argv),
    excludedNames = [
      ...[...existing.keys()].filter((Ae) => Ae !== "NODE_USE_ENV_PROXY"),
      ...denied,
      ...masked,
    ],
    accepted = filterInjectableEnvVars(filtered, excludedNames),
    extraVars = [
      ...getClaudeCodeEnvVars(gitConfigGlobal),
      ...(nuGetFallbackFolder === void 0
        ? []
        : [
            {
              source: "claudeCode",
              name: RESTOREADDITIONALPROJECTFALLBACKFOLDERS,
              value: nuGetFallbackFolder,
            },
          ]),
      ...(accepted.some(([Ae, Ie]) => Ae.toUpperCase() === "NODE_USE_ENV_PROXY" && Ie !== "1")
        ? []
        : getLocalProxyNoProxy(existing)),
    ],
    finalVars = filterInjectableEnvVars([...filtered, ...extraVars], excludedNames),
    newArgv = insertEnvArgs(argv, finalVars);
  if (newArgv === void 0)
    return {
      tooLong:
        insertEnvArgs(argv, filterInjectableEnvVars(extraVars, excludedNames)) === void 0
          ? "command"
          : "variables",
    };
  let acceptedNames = new Set(accepted.map(([Ae]) => Ae.toUpperCase()));
  return {
    argv: newArgv,
    leftOut: uniq(candidates.map(({ name: Ae }) => Ae).filter((Ae) => !acceptedNames.has(Ae.toUpperCase()))),
  };
}

export { buildEnvArgv, RESTOREADDITIONALPROJECTFALLBACKFOLDERS };
