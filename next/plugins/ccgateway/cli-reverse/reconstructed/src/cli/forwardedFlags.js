/**
 * cli/forwardedFlags.ts
 *
 * 2.1.316 新增：转发给后台会话的带值 CLI 标志集合（--model、--permission-mode、--settings 等）及可变参标志；去掉 argv 中已转发的标志（含 --flag=value 形式），保留 -- 之后的内容等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n6r4p63b.js (22)
 * attribution: placement 22
 */
import { join, resolve, isAbsolute, sep, relative } from "path";
import { homedir } from "os";
import {
  MODEL_SELECTION_ENV_VARS,
  CUSTOM_MODEL_OPTION_VARS,
  PROVIDER_SELECTION_ENV_VARS,
} from "../utils/managedEnvConstants.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
import { tmpdir, claudeTempDirName } from "../utils/tempDir.js";
import { env } from "../utils/env.js";
import { foldCaseBasic } from "../utils/pathIdentity.js";
import { identity } from "../utils/pathClassification.js";
import { getPlatform } from "../utils/platform.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import {
  describeEnvEntryName,
  filterInvalidEnvEntries,
  ENV_ENTRY_PROBLEM_TEXT,
} from "../utils/envValidation.js";
import { logForDebugging } from "../utils/debug.js";
import { stripLongPathPrefixes } from "../utils/windowsUncPaths.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n6r4p63b.js:681-3226 placement
/**
 * 转发给后台会话的带值 CLI 标志集合（--model、--permission-mode、--settings 等）及可变参标志。
 */
var FORWARDED_VALUE_FLAGS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../utils/managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var BACKGROUND_FORWARDED_VALUE_FLAGS;
var VARIADIC_FORWARDED_FLAGS;
var PLUGIN_SOURCE_FLAGS;
var BOOLEAN_FORWARDED_FLAGS;
var ENV_FORCE_PASSTHROUGH_NAMES;
var SUBAGENT_MODEL_ENV_NAMES;
var BACKGROUND_ALLOWED_ENV_NAMES;
var PATH_VALUED_ENV_NAMES;
var CLAUDE_SECURESTORAGE_CONFIG_DIR;
deferInit("chunk-n6r4p63b.js:681", () => {
  FORWARDED_VALUE_FLAGS = new Set([
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
  BACKGROUND_FORWARDED_VALUE_FLAGS = new Set([
    ...FORWARDED_VALUE_FLAGS,
    "--resume-session-at",
    "--resume-drops-turn",
    "--project-config-root",
    "--exec",
  ]);
  VARIADIC_FORWARDED_FLAGS = new Set([
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
  PLUGIN_SOURCE_FLAGS = new Set(["--plugin-dir", "--plugin-dir-no-mcp", "--plugin-url"]);
  BOOLEAN_FORWARDED_FLAGS = new Set([
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
  ENV_FORCE_PASSTHROUGH_NAMES = new Set([
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
    "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
  ]);
  SUBAGENT_MODEL_ENV_NAMES = [
    ...MODEL_SELECTION_ENV_VARS,
    ...CUSTOM_MODEL_OPTION_VARS,
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
    "CLAUDE_CODE_SUBAGENT_EFFORT",
  ];
  BACKGROUND_ALLOWED_ENV_NAMES = new Set([
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
  PATH_VALUED_ENV_NAMES = new Set([
    "AWS_CONFIG_FILE",
    "AWS_SHARED_CREDENTIALS_FILE",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ]);
  CLAUDE_SECURESTORAGE_CONFIG_DIR = "CLAUDE_SECURESTORAGE_CONFIG_DIR";
});
//@ chunk-n6r4p63b.js:3226-3470 placement
function jobAllowedRoots(envName) {
  let claudeConfigDir = getClaudeConfigDir();
  let roots = [
    join(claudeConfigDir, "jobs"),
    join(tmpdir(), claudeTempDirName()),
    join(claudeConfigDir, "projects"),
    join(claudeConfigDir, "plans"),
    join(claudeConfigDir, "agent-memory"),
  ];
  let CLAUDE_CODE_REMOTE_MEMORY_DIR = env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  if (CLAUDE_CODE_REMOTE_MEMORY_DIR)
    roots.push(
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects"),
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "agent-memory"),
    );
  if (PATH_VALUED_ENV_NAMES.has(envName))
    try {
      roots.push(join(homedir(), ".claude"));
    } catch {}
  return roots;
}
//@ chunk-n6r4p63b.js:3470-3504 placement
function normalizeResolvedPath(path) {
  return foldCaseBasic(identity(resolve(path)));
}
//@ chunk-n6r4p63b.js:3504-3583 placement
function isAbsoluteOnPlatform(path) {
  return getPlatform() === "windows" ? /^([A-Za-z]:[\\/]|[\\/]{2})/.test(path) : isAbsolute(path);
}
//@ chunk-n6r4p63b.js:3583-4013 placement
/**
 * 校验转发给后台会话的路径型环境变量：必须是完整路径且不在 Claude 临时目录。
 */
function checkForwardedPath(envName, value) {
  if (value === "") return envName === CLAUDE_SECURESTORAGE_CONFIG_DIR ? undefined : "empty path";
  if (!isAbsoluteOnPlatform(value)) return "not a full path";
  let normalized = normalizeResolvedPath(value);
  if (getPlatform() !== "windows" && normalized.split(sep).includes(foldCaseBasic(claudeTempDirName())))
    return "path is inside a Claude temp folder, which background sessions can write to without asking";
  for (let root of jobAllowedRoots(envName)) {
    let rel = relative(normalizeResolvedPath(root), normalized);
    if (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
      return `path is inside ${root}, where background sessions can write some files without asking`;
  }
  return;
}
//@ chunk-n6r4p63b.js:4013-4118 placement
/**
 * 把转发给后台任务的环境变量中表示路径的条目按给定目录解析为绝对路径，其余原样保留。
 */
function resolveForwardedEnvPaths(providerEnv, cwd) {
  let resolved = {};
  for (let [key, value] of Object.entries(providerEnv))
    resolved[key] =
      value !== "" && PATH_VALUED_ENV_NAMES.has(key) ? resolve(cwd, expandAwsHomePath(key, value)) : value;
  return resolved;
}
//@ chunk-n6r4p63b.js:4118-4234 placement
function expandAwsHomePath(name, value) {
  if (!name.startsWith("AWS_") || !value.startsWith("~/")) return value;
  try {
    return join(homedir(), value.slice(2));
  } catch {
    return value;
  }
}
//@ chunk-n6r4p63b.js:4234-4398 placement
var PROJECT_ID_RE =
  /^\s*(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|(?:claude_proj|chan)_(?:staging_|local_)?01[1-9A-HJ-NP-Za-km-z]{22})\s*$/;
//@ chunk-n6r4p63b.js:4398-4907 placement
/**
 * 过滤要带给后台会话的环境变量，返回保留项与被丢弃项（附原因）。
 */
function filterBackgroundEnv(env) {
  let kept = {};
  let dropped = [];
  for (let [key, value] of Object.entries(env)) {
    let problem = !BACKGROUND_ALLOWED_ENV_NAMES.has(key)
      ? "not kept for background sessions"
      : ENV_FORCE_PASSTHROUGH_NAMES.has(key) && !isEnvTruthy(value)
        ? "only kept when set to a true value such as 1"
        : PATH_VALUED_ENV_NAMES.has(key) || key === CLAUDE_SECURESTORAGE_CONFIG_DIR
          ? checkForwardedPath(key, value)
          : key === "CLAUDE_CODE_ATTRIBUTION_PROJECT" && !PROJECT_ID_RE.test(value)
            ? "not a claude.ai Project ID"
            : undefined;
    if (problem) dropped.push(`${describeEnvEntryName(key)} (${problem})`);
    else kept[key] = value;
  }
  if (dropped.length === 0) return env;
  logForDebugging(
    `[jobs] ignored these saved environment entries in the job's state.json: ${dropped.join(", ")}`,
    {
      level: "warn",
    },
  );
  return Object.keys(kept).length > 0 ? kept : undefined;
}
//@ chunk-n6r4p63b.js:4907-5095 placement
/**
 * 过滤可转发的环境变量，被丢弃的条目逐个记录警告日志（名称经转义、附原因）。
 */
function keepForwardableEnv(env, origin) {
  let { kept, dropped } = filterInvalidEnvEntries(env);
  dropped.forEach(({ name, problem }) => {
    try {
      logForDebugging(
        `[jobs] dropped environment entry ${describeEnvEntryName(name)} from ${origin}: ${ENV_ENTRY_PROBLEM_TEXT[problem]}.`,
        {
          level: "warn",
        },
      );
    } catch {}
  });
  return kept;
}
//@ chunk-n6r4p63b.js:5095-5678 placement
/**
 * 把 argv 分成可转发的标志与其余参数。
 */
function splitForwardableArgs(args) {
  let forwarded = [];
  let stripped = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (!arg.startsWith("-")) {
      stripped.push(arg);
      continue;
    }
    let index = arg.indexOf("=");
    let flagName = index === -1 ? arg : arg.slice(0, index);
    if (index !== -1 && !FORWARDED_VALUE_FLAGS.has(flagName) && BOOLEAN_FORWARDED_FLAGS.has(flagName)) {
      forwarded.push(flagName);
      stripped.push(arg);
      continue;
    }
    let expectsValue = index === -1 && FORWARDED_VALUE_FLAGS.has(flagName);
    let isForwarded =
      flagName !== "-m" &&
      (index === -1
        ? BOOLEAN_FORWARDED_FLAGS.has(flagName) || (expectsValue && args[j + 1] !== undefined)
        : FORWARDED_VALUE_FLAGS.has(flagName));
    let target = isForwarded ? forwarded : stripped;
    target.push(arg);
    if (expectsValue && args[j + 1] !== undefined) target.push(args[++j]);
    if (!isForwarded || (expectsValue && VARIADIC_FORWARDED_FLAGS.has(flagName)))
      while (args[j + 1] !== undefined && !args[j + 1].startsWith("-")) target.push(args[++j]);
  }
  if (stripped.length > 0)
    logForDebugging(
      `[jobs] stripped respawnFlags token(s) that a restart does not re-apply: ${stripped.join(" ")}`,
      {
        level: "warn",
      },
    );
  return groupFlagArgs(normalizeForwardedFlags(forwarded));
}
//@ chunk-n6r4p63b.js:5678-5948 placement
function normalizeForwardedFlags(args) {
  let out = [];
  for (let j = 0; j < args.length; j++) {
    let flagName = args[j];
    if (!FORWARDED_VALUE_FLAGS.has(flagName)) {
      out.push(flagName);
      continue;
    }
    let value = args[++j];
    if (!value.startsWith("-")) {
      out.push(flagName, value);
      continue;
    }
    out.push(`${flagName === "-n" ? "--name" : flagName}=${value}`);
    let next = args[j + 1];
    if (VARIADIC_FORWARDED_FLAGS.has(flagName) && next !== undefined && !next.startsWith("-"))
      out.push(flagName);
  }
  return out;
}
//@ chunk-n6r4p63b.js:5948-6402 placement
/**
 * 把 argv 按标志分组（标志与其值放在一起，可变参标志吞掉后续值）。
 */
function groupFlagArgs(args) {
  let groups = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    let index = arg.indexOf("=");
    let flagName = index === -1 ? arg : arg.slice(0, index);
    let tokens = [arg];
    if (index === -1 && FORWARDED_VALUE_FLAGS.has(flagName) && args[j + 1] !== undefined) {
      tokens.push(args[++j]);
      if (VARIADIC_FORWARDED_FLAGS.has(flagName))
        while (args[j + 1] !== undefined && !args[j + 1].startsWith("-")) tokens.push(args[++j]);
    }
    groups.push({
      name: flagName,
      toks: tokens,
    });
  }
  let lastIndexByName = new Map();
  for (let j = 0; j < groups.length; j++) {
    let group = groups[j];
    if (
      FORWARDED_VALUE_FLAGS.has(group.name) &&
      !VARIADIC_FORWARDED_FLAGS.has(group.name) &&
      !PLUGIN_SOURCE_FLAGS.has(group.name)
    )
      lastIndexByName.set(group.name, j);
  }
  return groups
    .filter((group, index) => (lastIndexByName.get(group.name) ?? index) === index)
    .flatMap((group) => group.toks);
}
//@ chunk-n6r4p63b.js:6402-6630 placement
/**
 * 若 --dangerously-skip-permissions 之后又出现 --permission-mode，则去掉前者（后者优先）。
 */
function dropOverriddenSkipPermissions(args) {
  let index = args.lastIndexOf("--dangerously-skip-permissions");
  return index !== -1 &&
    args.slice(index + 1).some((arg) => arg === "--permission-mode" || arg.startsWith("--permission-mode="))
    ? args.filter((arg) => arg !== "--dangerously-skip-permissions")
    : [...args];
}
//@ chunk-n6r4p63b.js:6630-6795 placement
/**
 * 把 --dangerously-skip-permissions 移到参数列表末尾。
 */
function moveSkipPermissionsLast(args) {
  return args.includes("--dangerously-skip-permissions")
    ? [...args.filter((arg) => arg !== "--dangerously-skip-permissions"), "--dangerously-skip-permissions"]
    : [...args];
}
//@ chunk-n6r4p63b.js:6795-7723 placement
/**
 * 去掉 argv 中已转发的标志（含 --flag=value 形式），保留 -- 之后的内容。
 */
function stripForwardedFlags(args) {
  let out = [];
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (arg === "--") {
      for (let index = j; index < args.length; index++) out.push(args[index]);
      break;
    }
    let eqIndex = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (
      eqIndex !== -1 &&
      (BACKGROUND_FORWARDED_VALUE_FLAGS.has(arg.slice(0, eqIndex)) ||
        RESUME_VALUE_FLAGS.has(arg.slice(0, eqIndex)))
    ) {
      out.push(
        arg.slice(0, eqIndex + 1) +
          stripPathPrefixUnlessPrompt(arg.slice(0, eqIndex), arg.slice(eqIndex + 1)),
      );
      continue;
    }
    if (/^-[a-zA-Z].+/.test(arg)) {
      let letterEnd = 1;
      while (letterEnd < arg.length - 1 && SINGLE_LETTER_FLAGS.has(`-${arg[letterEnd]}`)) letterEnd++;
      let valueFlag = `-${arg[letterEnd]}`;
      if (
        arg.length > letterEnd + 1 &&
        (BACKGROUND_FORWARDED_VALUE_FLAGS.has(valueFlag) || RESUME_VALUE_FLAGS.has(valueFlag))
      ) {
        out.push(
          arg.slice(0, letterEnd + 1) + stripPathPrefixUnlessPrompt(valueFlag, arg.slice(letterEnd + 1)),
        );
        continue;
      }
      if (
        arg.length === letterEnd + 1 &&
        letterEnd > 1 &&
        (BACKGROUND_FORWARDED_VALUE_FLAGS.has(valueFlag) || RESUME_VALUE_FLAGS.has(valueFlag))
      ) {
        out.push(arg);
        if (BACKGROUND_FORWARDED_VALUE_FLAGS.has(valueFlag) && args[j + 1] !== undefined) {
          out.push(stripPathPrefixUnlessPrompt(valueFlag, args[++j]));
          if (VARIADIC_FORWARDED_FLAGS.has(valueFlag))
            while (args[j + 1] !== undefined && !looksLikeFlag_2(args[j + 1]))
              out.push(stripPathPrefixUnlessPrompt(valueFlag, args[++j]));
        } else if (
          RESUME_VALUE_FLAGS.has(valueFlag) &&
          args[j + 1] !== undefined &&
          !looksLikeFlag_2(args[j + 1])
        )
          out.push(stripLongPathPrefixes(args[++j]));
        continue;
      }
    }
    out.push(arg);
    if (BACKGROUND_FORWARDED_VALUE_FLAGS.has(arg) && args[j + 1] !== undefined) {
      out.push(stripPathPrefixUnlessPrompt(arg, args[++j]));
      if (VARIADIC_FORWARDED_FLAGS.has(arg))
        while (args[j + 1] !== undefined && !looksLikeFlag_2(args[j + 1]))
          out.push(stripPathPrefixUnlessPrompt(arg, args[++j]));
    } else if (RESUME_VALUE_FLAGS.has(arg) && args[j + 1] !== undefined && !looksLikeFlag_2(args[j + 1]))
      out.push(stripLongPathPrefixes(args[++j]));
  }
  return out;
}
//@ chunk-n6r4p63b.js:7723-7858 placement
var PROMPT_TEXT_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n6r4p63b.js:7723", () => {
  PROMPT_TEXT_FLAGS = new Set([
    "--system-prompt",
    "--append-system-prompt",
    "--append-subagent-system-prompt",
    "--plan-mode-instructions",
    "--name",
    "-n",
  ]);
});
//@ chunk-n6r4p63b.js:7858-7898 placement
function stripPathPrefixUnlessPrompt(flagName, value) {
  return PROMPT_TEXT_FLAGS.has(flagName) ? value : stripLongPathPrefixes(value);
}
//@ chunk-n6r4p63b.js:7898-7966 placement
/**
 * 转发参数解析用的标志集合：-r/--resume 为带值标志，-c/-p/-h/-v 为单字母标志。
 */
var RESUME_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SINGLE_LETTER_FLAGS;
deferInit("chunk-n6r4p63b.js:7898", () => {
  RESUME_VALUE_FLAGS = new Set(["-r", "--resume"]);
  SINGLE_LETTER_FLAGS = new Set(["-c", "-p", "-h", "-v"]);
});
//@ chunk-n6r4p63b.js:7966-8017 placement
function looksLikeFlag_2(arg) {
  return arg.length > 1 && arg.startsWith("-");
}
//@ chunk-n6r4p63b.js:8017-8106 placement
/**
 * 确保参数里带 --reply-on-resume。
 */
function withReplyOnResume(args) {
  return args.includes("--reply-on-resume") ? [...args] : [...args, "--reply-on-resume"];
}
//@ chunk-n6r4p63b.js:8106-8168 placement
/**
 * 去掉参数里的 --reply-on-resume。
 */
function withoutReplyOnResume(flags) {
  return flags.filter((flag) => flag !== "--reply-on-resume");
}
export {
  splitForwardableArgs,
  moveSkipPermissionsLast,
  stripForwardedFlags,
  dropOverriddenSkipPermissions,
  filterBackgroundEnv,
  keepForwardableEnv,
  resolveForwardedEnvPaths,
  BOOLEAN_FORWARDED_FLAGS,
  FORWARDED_VALUE_FLAGS,
  SINGLE_LETTER_FLAGS,
  BACKGROUND_FORWARDED_VALUE_FLAGS,
  VARIADIC_FORWARDED_FLAGS,
  BACKGROUND_ALLOWED_ENV_NAMES,
  ENV_FORCE_PASSTHROUGH_NAMES,
  withoutReplyOnResume,
  withReplyOnResume,
  SUBAGENT_MODEL_ENV_NAMES,
};
