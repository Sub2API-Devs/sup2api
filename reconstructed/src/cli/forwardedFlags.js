/**
 * cli/forwardedFlags.ts
 *
 * 2.1.316 新增：转发给后台会话的带值 CLI 标志集合（--model、--permission-mode、--settings 等）及可变参标志；去掉 argv 中已转发的标志（含 --flag=value 形式），保留 -- 之后的内容等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nwzhqrkg.js (22)
 * attribution: placement 22
 */
import { join, resolve, isAbsolute, sep, relative } from "path";
import { homedir } from "os";
import {
  MODEL_SELECTION_ENV_VARS,
  CUSTOM_MODEL_OPTION_VARS,
  PROVIDER_SELECTION_ENV_VARS,
} from "../utils/managedEnvConstants.js";
import { getClaudeConfigDir, isEnvTruthy } from "../utils/envUtils.js";
import { tmpdir, claudeTempDirName } from "../utils/tempDir.js";
import { env } from "../utils/env.js";
import { foldCaseBasic } from "../utils/pathIdentity.js";
import { identity } from "../utils/pathClassification.js";
import { getPlatform } from "../utils/platform.js";
import {
  describeEnvEntryName,
  filterInvalidEnvEntries,
  ENV_ENTRY_PROBLEM_TEXT,
} from "../utils/envValidation.js";
import { logForDebugging } from "../utils/debug.js";
import { stripLongPathPrefixes } from "../utils/windowsUncPaths.js";

//@ chunk-nwzhqrkg.js:681-3226 placement
/**
 * 转发给后台会话的带值 CLI 标志集合（--model、--permission-mode、--settings 等）及可变参标志。
 */
var FORWARDED_VALUE_FLAGS = new Set([
  "--model",
  "-m",
  "--permission-mode",
  "--inherit-permission-mode",
  "--proactivity",
  "--agent",
  "--agents",
  "--routine",
  "--effort",
  "--fast-mode",
  "--add-dir",
  "--mcp-config",
  "--settings",
  "--setting-sources",
  "--managed-settings",
  "--client-data-url",
  "--system-prompt",
  "--system-prompt-file",
  "--append-system-prompt",
  "--append-system-prompt-file",
  "--system-prompt-snapshot",
  "--append-subagent-system-prompt",
  "--append-subagent-system-prompt-file",
  "--fallback-model",
  "--advisor",
  "--channels",
  "--watch-artifact",
  "--watch-artifact-no-autoreact",
  "--permission-prompt-tool",
  "--permission-prompts",
  "--allowed-tools",
  "--allowedTools",
  "--disallowed-tools",
  "--disallowedTools",
  "--tools",
  "--session-id",
  "--debug-file",
  "-n",
  "--name",
  "--autocompact",
  "--betas",
  "--file",
  "--max-budget-usd",
  "--max-thinking-tokens",
  "--max-turns",
  "--task-budget",
  "--plan-mode-instructions",
  "--plugin-dir",
  "--plugin-dir-no-mcp",
  "--plugin-url",
  "--rewind-files",
  "--thinking",
  "--thinking-display",
  "--remote-control-session-name-prefix",
  "--json-schema",
]);
var BACKGROUND_FORWARDED_VALUE_FLAGS = new Set([
  ...FORWARDED_VALUE_FLAGS,
  "--resume-session-at",
  "--resume-drops-turn",
  "--project-config-root",
  "--exec",
]);
var VARIADIC_FORWARDED_FLAGS = new Set([
  "--allowed-tools",
  "--allowedTools",
  "--disallowed-tools",
  "--disallowedTools",
  "--tools",
  "--mcp-config",
  "--betas",
  "--add-dir",
  "--file",
  "--channels",
]);
var PLUGIN_SOURCE_FLAGS = new Set(["--plugin-dir", "--plugin-dir-no-mcp", "--plugin-url"]);
var BOOLEAN_FORWARDED_FLAGS = new Set([
  "--dangerously-skip-permissions",
  "--allow-dangerously-skip-permissions",
  "--strict-mcp-config",
  "--dangerously-allow-browser-network-access",
  "--restricted",
  "--disable-slash-commands",
  "--include-unsupported-models",
  "--verbose",
  "--reply-on-resume",
  "--ide",
  "--chrome",
  "--no-chrome",
  "--bare",
  "--safe-mode",
  "--brief",
  "--remote-control",
  "--rc",
  "--local",
  "--unsandboxed",
  "--personal",
  "--allow-other-models",
]);
var ENV_FORCE_PASSTHROUGH_NAMES = new Set([
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
]);
var SUBAGENT_MODEL_ENV_NAMES = [
  ...MODEL_SELECTION_ENV_VARS,
  ...CUSTOM_MODEL_OPTION_VARS,
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  "CLAUDE_CODE_SUBAGENT_EFFORT",
];
var BACKGROUND_ALLOWED_ENV_NAMES = new Set([
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_INTERNAL_FC_OVERRIDES",
  ...SUBAGENT_MODEL_ENV_NAMES,
  "CLAUDE_CODE_CLIENT_DATA_URL",
  "CLAUDE_CODE_ALLOW_OTHER_MODELS",
  "CLAUDE_CODE_ATTRIBUTION_PROJECT",
  ...PROVIDER_SELECTION_ENV_VARS,
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "ANTHROPIC_BEDROCK_REGION_PREFIX",
  "AWS_PROFILE",
  "AWS_CONFIG_FILE",
  "AWS_SHARED_CREDENTIALS_FILE",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "GCLOUD_PROJECT",
  "CLAUDE_SECURESTORAGE_CONFIG_DIR",
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
  "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
]);
var PATH_VALUED_ENV_NAMES = new Set([
  "AWS_CONFIG_FILE",
  "AWS_SHARED_CREDENTIALS_FILE",
  "GOOGLE_APPLICATION_CREDENTIALS",
]);
var CLAUDE_SECURESTORAGE_CONFIG_DIR = "CLAUDE_SECURESTORAGE_CONFIG_DIR";
//@ chunk-nwzhqrkg.js:3226-3470 placement
function jobAllowedRoots(n) {
  let claudeConfigDir = getClaudeConfigDir();
  let r = [
    join(claudeConfigDir, "jobs"),
    join(tmpdir(), claudeTempDirName()),
    join(claudeConfigDir, "projects"),
    join(claudeConfigDir, "plans"),
    join(claudeConfigDir, "agent-memory"),
  ];
  let CLAUDE_CODE_REMOTE_MEMORY_DIR = env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  if (CLAUDE_CODE_REMOTE_MEMORY_DIR)
    r.push(
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects"),
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "agent-memory"),
    );
  if (PATH_VALUED_ENV_NAMES.has(n))
    try {
      r.push(join(homedir(), ".claude"));
    } catch {}
  return r;
}
//@ chunk-nwzhqrkg.js:3470-3504 placement
function normalizeResolvedPath(n) {
  return foldCaseBasic(identity(resolve(n)));
}
//@ chunk-nwzhqrkg.js:3504-3583 placement
function isAbsoluteOnPlatform(n) {
  return getPlatform() === "windows" ? /^([A-Za-z]:[\\/]|[\\/]{2})/.test(n) : isAbsolute(n);
}
//@ chunk-nwzhqrkg.js:3583-4013 placement
/**
 * 校验转发给后台会话的路径型环境变量：必须是完整路径且不在 Claude 临时目录。
 */
function checkForwardedPath(n, s) {
  if (s === "") return n === CLAUDE_SECURESTORAGE_CONFIG_DIR ? undefined : "empty path";
  if (!isAbsoluteOnPlatform(s)) return "not a full path";
  let r = normalizeResolvedPath(s);
  if (getPlatform() !== "windows" && r.split(sep).includes(foldCaseBasic(claudeTempDirName())))
    return "path is inside a Claude temp folder, which background sessions can write to without asking";
  for (let e of jobAllowedRoots(n)) {
    let o = relative(normalizeResolvedPath(e), r);
    if (o !== ".." && !o.startsWith(`..${sep}`) && !isAbsolute(o))
      return `path is inside ${e}, where background sessions can write some files without asking`;
  }
  return;
}
//@ chunk-nwzhqrkg.js:4013-4118 placement
/**
 * 把转发给后台任务的环境变量中表示路径的条目按给定目录解析为绝对路径，其余原样保留。
 */
function resolveForwardedEnvPaths(providerEnv, cwd) {
  let r = {};
  for (let [key, value] of Object.entries(providerEnv))
    r[key] =
      value !== "" && PATH_VALUED_ENV_NAMES.has(key) ? resolve(cwd, expandAwsHomePath(key, value)) : value;
  return r;
}
//@ chunk-nwzhqrkg.js:4118-4234 placement
function expandAwsHomePath(n, s) {
  if (!n.startsWith("AWS_") || !s.startsWith("~/")) return s;
  try {
    return join(homedir(), s.slice(2));
  } catch {
    return s;
  }
}
//@ chunk-nwzhqrkg.js:4234-4389 placement
var PROJECT_ID_RE =
  /^\s*(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|claude_proj_(?:staging_|local_)?01[1-9A-HJ-NP-Za-km-z]{22})\s*$/;
//@ chunk-nwzhqrkg.js:4389-4898 placement
/**
 * 过滤要带给后台会话的环境变量，返回保留项与被丢弃项（附原因）。
 */
function filterBackgroundEnv(n) {
  let s = {};
  let r = [];
  for (let [key, value] of Object.entries(n)) {
    let a = !BACKGROUND_ALLOWED_ENV_NAMES.has(key)
      ? "not kept for background sessions"
      : ENV_FORCE_PASSTHROUGH_NAMES.has(key) && !isEnvTruthy(value)
        ? "only kept when set to a true value such as 1"
        : PATH_VALUED_ENV_NAMES.has(key) || key === CLAUDE_SECURESTORAGE_CONFIG_DIR
          ? checkForwardedPath(key, value)
          : key === "CLAUDE_CODE_ATTRIBUTION_PROJECT" && !PROJECT_ID_RE.test(value)
            ? "not a claude.ai Project ID"
            : undefined;
    if (a) r.push(`${describeEnvEntryName(key)} (${a})`);
    else s[key] = value;
  }
  if (r.length === 0) return n;
  logForDebugging(`[jobs] ignored these saved environment entries in the job's state.json: ${r.join(", ")}`, {
    level: "warn",
  });
  return Object.keys(s).length > 0 ? s : undefined;
}
//@ chunk-nwzhqrkg.js:4898-5086 placement
/**
 * 过滤可转发的环境变量，被丢弃的条目逐个记录警告日志（名称经转义、附原因）。
 */
function keepForwardableEnv(n, s) {
  let { kept, dropped } = filterInvalidEnvEntries(n);
  dropped.forEach(({ name: o, problem }) => {
    try {
      logForDebugging(
        `[jobs] dropped environment entry ${describeEnvEntryName(o)} from ${s}: ${ENV_ENTRY_PROBLEM_TEXT[problem]}.`,
        {
          level: "warn",
        },
      );
    } catch {}
  });
  return kept;
}
//@ chunk-nwzhqrkg.js:5086-5669 placement
/**
 * 把 argv 分成可转发的标志与其余参数。
 */
function splitForwardableArgs(n) {
  let s = [];
  let r = [];
  for (let j = 0; j < n.length; j++) {
    let o = n[j];
    if (!o.startsWith("-")) {
      r.push(o);
      continue;
    }
    let index = o.indexOf("=");
    let l = index === -1 ? o : o.slice(0, index);
    if (index !== -1 && !FORWARDED_VALUE_FLAGS.has(l) && BOOLEAN_FORWARDED_FLAGS.has(l)) {
      s.push(l);
      r.push(o);
      continue;
    }
    let d = index === -1 && FORWARDED_VALUE_FLAGS.has(l);
    let g =
      l !== "-m" &&
      (index === -1
        ? BOOLEAN_FORWARDED_FLAGS.has(l) || (d && n[j + 1] !== undefined)
        : FORWARDED_VALUE_FLAGS.has(l));
    let h = g ? s : r;
    h.push(o);
    if (d && n[j + 1] !== undefined) h.push(n[++j]);
    if (!g || (d && VARIADIC_FORWARDED_FLAGS.has(l)))
      while (n[j + 1] !== undefined && !n[j + 1].startsWith("-")) h.push(n[++j]);
  }
  if (r.length > 0)
    logForDebugging(
      `[jobs] stripped respawnFlags token(s) that a restart does not re-apply: ${r.join(" ")}`,
      {
        level: "warn",
      },
    );
  return groupFlagArgs(normalizeForwardedFlags(s));
}
//@ chunk-nwzhqrkg.js:5669-5939 placement
function normalizeForwardedFlags(n) {
  let s = [];
  for (let j = 0; j < n.length; j++) {
    let e = n[j];
    if (!FORWARDED_VALUE_FLAGS.has(e)) {
      s.push(e);
      continue;
    }
    let o = n[++j];
    if (!o.startsWith("-")) {
      s.push(e, o);
      continue;
    }
    s.push(`${e === "-n" ? "--name" : e}=${o}`);
    let a = n[j + 1];
    if (VARIADIC_FORWARDED_FLAGS.has(e) && a !== undefined && !a.startsWith("-")) s.push(e);
  }
  return s;
}
//@ chunk-nwzhqrkg.js:5939-6393 placement
/**
 * 把 argv 按标志分组（标志与其值放在一起，可变参标志吞掉后续值）。
 */
function groupFlagArgs(n) {
  let s = [];
  for (let j = 0; j < n.length; j++) {
    let o = n[j];
    let index = o.indexOf("=");
    let l = index === -1 ? o : o.slice(0, index);
    let d = [o];
    if (index === -1 && FORWARDED_VALUE_FLAGS.has(l) && n[j + 1] !== undefined) {
      d.push(n[++j]);
      if (VARIADIC_FORWARDED_FLAGS.has(l))
        while (n[j + 1] !== undefined && !n[j + 1].startsWith("-")) d.push(n[++j]);
    }
    s.push({
      name: l,
      toks: d,
    });
  }
  let r = new Map();
  for (let j = 0; j < s.length; j++) {
    let o = s[j];
    if (
      FORWARDED_VALUE_FLAGS.has(o.name) &&
      !VARIADIC_FORWARDED_FLAGS.has(o.name) &&
      !PLUGIN_SOURCE_FLAGS.has(o.name)
    )
      r.set(o.name, j);
  }
  return s.filter((e, o) => (r.get(e.name) ?? o) === o).flatMap((e) => e.toks);
}
//@ chunk-nwzhqrkg.js:6393-6621 placement
/**
 * 若 --dangerously-skip-permissions 之后又出现 --permission-mode，则去掉前者（后者优先）。
 */
function dropOverriddenSkipPermissions(n) {
  let index = n.lastIndexOf("--dangerously-skip-permissions");
  return index !== -1 &&
    n.slice(index + 1).some((e) => e === "--permission-mode" || e.startsWith("--permission-mode="))
    ? n.filter((e) => e !== "--dangerously-skip-permissions")
    : [...n];
}
//@ chunk-nwzhqrkg.js:6621-6786 placement
/**
 * 把 --dangerously-skip-permissions 移到参数列表末尾。
 */
function moveSkipPermissionsLast(n) {
  return n.includes("--dangerously-skip-permissions")
    ? [...n.filter((s) => s !== "--dangerously-skip-permissions"), "--dangerously-skip-permissions"]
    : [...n];
}
//@ chunk-nwzhqrkg.js:6786-7714 placement
/**
 * 去掉 argv 中已转发的标志（含 --flag=value 形式），保留 -- 之后的内容。
 */
function stripForwardedFlags(n) {
  let s = [];
  for (let j = 0; j < n.length; j++) {
    let e = n[j];
    if (e === "--") {
      for (let a = j; a < n.length; a++) s.push(n[a]);
      break;
    }
    let o = e.startsWith("--") ? e.indexOf("=") : -1;
    if (
      o !== -1 &&
      (BACKGROUND_FORWARDED_VALUE_FLAGS.has(e.slice(0, o)) || RESUME_VALUE_FLAGS.has(e.slice(0, o)))
    ) {
      s.push(e.slice(0, o + 1) + stripPathPrefixUnlessPrompt(e.slice(0, o), e.slice(o + 1)));
      continue;
    }
    if (/^-[a-zA-Z].+/.test(e)) {
      let a = 1;
      while (a < e.length - 1 && SINGLE_LETTER_FLAGS.has(`-${e[a]}`)) a++;
      let l = `-${e[a]}`;
      if (e.length > a + 1 && (BACKGROUND_FORWARDED_VALUE_FLAGS.has(l) || RESUME_VALUE_FLAGS.has(l))) {
        s.push(e.slice(0, a + 1) + stripPathPrefixUnlessPrompt(l, e.slice(a + 1)));
        continue;
      }
      if (
        e.length === a + 1 &&
        a > 1 &&
        (BACKGROUND_FORWARDED_VALUE_FLAGS.has(l) || RESUME_VALUE_FLAGS.has(l))
      ) {
        s.push(e);
        if (BACKGROUND_FORWARDED_VALUE_FLAGS.has(l) && n[j + 1] !== undefined) {
          s.push(stripPathPrefixUnlessPrompt(l, n[++j]));
          if (VARIADIC_FORWARDED_FLAGS.has(l))
            while (n[j + 1] !== undefined && !looksLikeFlag_2(n[j + 1]))
              s.push(stripPathPrefixUnlessPrompt(l, n[++j]));
        } else if (RESUME_VALUE_FLAGS.has(l) && n[j + 1] !== undefined && !looksLikeFlag_2(n[j + 1]))
          s.push(stripLongPathPrefixes(n[++j]));
        continue;
      }
    }
    s.push(e);
    if (BACKGROUND_FORWARDED_VALUE_FLAGS.has(e) && n[j + 1] !== undefined) {
      s.push(stripPathPrefixUnlessPrompt(e, n[++j]));
      if (VARIADIC_FORWARDED_FLAGS.has(e))
        while (n[j + 1] !== undefined && !looksLikeFlag_2(n[j + 1]))
          s.push(stripPathPrefixUnlessPrompt(e, n[++j]));
    } else if (RESUME_VALUE_FLAGS.has(e) && n[j + 1] !== undefined && !looksLikeFlag_2(n[j + 1]))
      s.push(stripLongPathPrefixes(n[++j]));
  }
  return s;
}
//@ chunk-nwzhqrkg.js:7714-7849 placement
var PROMPT_TEXT_FLAGS = new Set([
  "--system-prompt",
  "--append-system-prompt",
  "--append-subagent-system-prompt",
  "--plan-mode-instructions",
  "--name",
  "-n",
]);
//@ chunk-nwzhqrkg.js:7849-7889 placement
function stripPathPrefixUnlessPrompt(n, s) {
  return PROMPT_TEXT_FLAGS.has(n) ? s : stripLongPathPrefixes(s);
}
//@ chunk-nwzhqrkg.js:7889-7957 placement
/**
 * 转发参数解析用的标志集合：-r/--resume 为带值标志，-c/-p/-h/-v 为单字母标志。
 */
var RESUME_VALUE_FLAGS = new Set(["-r", "--resume"]);
var SINGLE_LETTER_FLAGS = new Set(["-c", "-p", "-h", "-v"]);
//@ chunk-nwzhqrkg.js:7957-8008 placement
function looksLikeFlag_2(n) {
  return n.length > 1 && n.startsWith("-");
}
//@ chunk-nwzhqrkg.js:8008-8097 placement
/**
 * 确保参数里带 --reply-on-resume。
 */
function withReplyOnResume(n) {
  return n.includes("--reply-on-resume") ? [...n] : [...n, "--reply-on-resume"];
}
//@ chunk-nwzhqrkg.js:8097-8159 placement
/**
 * 去掉参数里的 --reply-on-resume。
 */
function withoutReplyOnResume(respawnFlags) {
  return respawnFlags.filter((s) => s !== "--reply-on-resume");
}
export {
  splitForwardableArgs,
  stripForwardedFlags,
  SUBAGENT_MODEL_ENV_NAMES,
  withoutReplyOnResume,
  moveSkipPermissionsLast,
  BOOLEAN_FORWARDED_FLAGS,
  FORWARDED_VALUE_FLAGS,
  SINGLE_LETTER_FLAGS,
  BACKGROUND_FORWARDED_VALUE_FLAGS,
  VARIADIC_FORWARDED_FLAGS,
  BACKGROUND_ALLOWED_ENV_NAMES,
  ENV_FORCE_PASSTHROUGH_NAMES,
  withReplyOnResume,
  keepForwardableEnv,
  dropOverriddenSkipPermissions,
  filterBackgroundEnv,
  resolveForwardedEnvPaths,
};
