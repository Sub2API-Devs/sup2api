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
import { HOt, Z_r, gj } from "../utils/managedEnvConstants.js";
import { getClaudeConfigDir, isEnvTruthy } from "../utils/envUtils.js";
import { tmpdir, claudeTempDirName } from "../utils/tempDir.js";
import { env } from "../utils/env.js";
import { Cp } from "../utils/pathIdentity.js";
import { Mn } from "../utils/pathClassification.js";
import { getPlatform } from "../utils/platform.js";
import {
  describeEnvEntryName,
  filterInvalidEnvEntries,
  ENV_ENTRY_PROBLEM_TEXT,
} from "../utils/envValidation.js";
import { logForDebugging } from "../utils/debug.js";
import { stripLongPathPrefixes } from "../utils/windowsUncPaths.js";

/**
 * 转发给后台会话的带值 CLI 标志集合（--model、--permission-mode、--settings 等）及可变参标志。
 */
//@ chunk-nwzhqrkg.js:681-3226 placement
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
  ]),
  G2t = new Set([
    ...FORWARDED_VALUE_FLAGS,
    "--resume-session-at",
    "--resume-drops-turn",
    "--project-config-root",
    "--exec",
  ]),
  Evt = new Set([
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
  ]),
  D = new Set(["--plugin-dir", "--plugin-dir-no-mcp", "--plugin-url"]),
  hyn = new Set([
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
  ]),
  VKo = new Set(["CLAUDE_CODE_SUBAGENT_MODEL_FORCE", "CLAUDE_CODE_HOST_GATEWAY_LINEAGE"]),
  qKo = [...HOt, ...Z_r, "CLAUDE_CODE_SUBAGENT_MODEL_FORCE", "CLAUDE_CODE_SUBAGENT_EFFORT"],
  knt = new Set([
    "CLAUDE_CONFIG_DIR",
    "CLAUDE_INTERNAL_FC_OVERRIDES",
    ...qKo,
    "CLAUDE_CODE_CLIENT_DATA_URL",
    "CLAUDE_CODE_ALLOW_OTHER_MODELS",
    "CLAUDE_CODE_ATTRIBUTION_PROJECT",
    ...gj,
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
  ]),
  m = new Set(["AWS_CONFIG_FILE", "AWS_SHARED_CREDENTIALS_FILE", "GOOGLE_APPLICATION_CREDENTIALS"]),
  CLAUDE_SECURESTORAGE_CONFIG_DIR = "CLAUDE_SECURESTORAGE_CONFIG_DIR";
//@ chunk-nwzhqrkg.js:3226-3470 placement
function jobAllowedRoots(n) {
  let s = getClaudeConfigDir(),
    r = [
      join(s, "jobs"),
      join(tmpdir(), claudeTempDirName()),
      join(s, "projects"),
      join(s, "plans"),
      join(s, "agent-memory"),
    ],
    CLAUDE_CODE_REMOTE_MEMORY_DIR = env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  if (CLAUDE_CODE_REMOTE_MEMORY_DIR)
    r.push(
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects"),
      join(CLAUDE_CODE_REMOTE_MEMORY_DIR, "agent-memory"),
    );
  if (m.has(n))
    try {
      r.push(join(homedir(), ".claude"));
    } catch {}
  return r;
}
//@ chunk-nwzhqrkg.js:3470-3504 placement
function f(n) {
  return Cp(Mn(resolve(n)));
}
//@ chunk-nwzhqrkg.js:3504-3583 placement
function T(n) {
  return getPlatform() === "windows" ? /^([A-Za-z]:[\\/]|[\\/]{2})/.test(n) : isAbsolute(n);
}
/**
 * 校验转发给后台会话的路径型环境变量：必须是完整路径且不在 Claude 临时目录。
 */
//@ chunk-nwzhqrkg.js:3583-4013 placement
function checkForwardedPath(n, s) {
  if (s === "") return n === CLAUDE_SECURESTORAGE_CONFIG_DIR ? void 0 : "empty path";
  if (!T(s)) return "not a full path";
  let r = f(s);
  if (getPlatform() !== "windows" && r.split(sep).includes(Cp(claudeTempDirName())))
    return "path is inside a Claude temp folder, which background sessions can write to without asking";
  for (let e of jobAllowedRoots(n)) {
    let o = relative(f(e), r);
    if (o !== ".." && !o.startsWith(`..${sep}`) && !isAbsolute(o))
      return `path is inside ${e}, where background sessions can write some files without asking`;
  }
  return;
}
/**
 * 把转发给后台任务的环境变量中表示路径的条目按给定目录解析为绝对路径，其余原样保留。
 */
//@ chunk-nwzhqrkg.js:4013-4118 placement
function resolveForwardedEnvPaths(n, s) {
  let r = {};
  for (let [e, o] of Object.entries(n)) r[e] = o !== "" && m.has(e) ? resolve(s, expandAwsHomePath(e, o)) : o;
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
/**
 * 过滤要带给后台会话的环境变量，返回保留项与被丢弃项（附原因）。
 */
//@ chunk-nwzhqrkg.js:4389-4898 placement
function filterBackgroundEnv(n) {
  let s = {},
    r = [];
  for (let [e, o] of Object.entries(n)) {
    let a = !knt.has(e)
      ? "not kept for background sessions"
      : VKo.has(e) && !isEnvTruthy(o)
        ? "only kept when set to a true value such as 1"
        : m.has(e) || e === CLAUDE_SECURESTORAGE_CONFIG_DIR
          ? checkForwardedPath(e, o)
          : e === "CLAUDE_CODE_ATTRIBUTION_PROJECT" && !PROJECT_ID_RE.test(o)
            ? "not a claude.ai Project ID"
            : void 0;
    if (a) r.push(`${describeEnvEntryName(e)} (${a})`);
    else s[e] = o;
  }
  if (r.length === 0) return n;
  return (
    logForDebugging(
      `[jobs] ignored these saved environment entries in the job's state.json: ${r.join(", ")}`,
      { level: "warn" },
    ),
    Object.keys(s).length > 0 ? s : void 0
  );
}
/**
 * 过滤可转发的环境变量，被丢弃的条目逐个记录警告日志（名称经转义、附原因）。
 */
//@ chunk-nwzhqrkg.js:4898-5086 placement
function keepForwardableEnv(n, s) {
  let { kept: kept, dropped: dropped } = filterInvalidEnvEntries(n);
  return (
    dropped.forEach(({ name: o, problem: problem }) => {
      try {
        logForDebugging(
          `[jobs] dropped environment entry ${describeEnvEntryName(o)} from ${s}: ${ENV_ENTRY_PROBLEM_TEXT[problem]}.`,
          { level: "warn" },
        );
      } catch {}
    }),
    kept
  );
}
/**
 * 把 argv 分成可转发的标志与其余参数。
 */
//@ chunk-nwzhqrkg.js:5086-5669 placement
function splitForwardableArgs(n) {
  let s = [],
    r = [];
  for (let e = 0; e < n.length; e++) {
    let o = n[e];
    if (!o.startsWith("-")) {
      r.push(o);
      continue;
    }
    let index = o.indexOf("="),
      l = index === -1 ? o : o.slice(0, index);
    if (index !== -1 && !FORWARDED_VALUE_FLAGS.has(l) && hyn.has(l)) {
      (s.push(l), r.push(o));
      continue;
    }
    let d = index === -1 && FORWARDED_VALUE_FLAGS.has(l),
      g =
        l !== "-m" &&
        (index === -1 ? hyn.has(l) || (d && n[e + 1] !== void 0) : FORWARDED_VALUE_FLAGS.has(l)),
      h = g ? s : r;
    if ((h.push(o), d && n[e + 1] !== void 0)) h.push(n[++e]);
    if (!g || (d && Evt.has(l))) while (n[e + 1] !== void 0 && !n[e + 1].startsWith("-")) h.push(n[++e]);
  }
  if (r.length > 0)
    logForDebugging(
      `[jobs] stripped respawnFlags token(s) that a restart does not re-apply: ${r.join(" ")}`,
      { level: "warn" },
    );
  return groupFlagArgs(normalizeForwardedFlags(s));
}
//@ chunk-nwzhqrkg.js:5669-5939 placement
function normalizeForwardedFlags(n) {
  let s = [];
  for (let r = 0; r < n.length; r++) {
    let e = n[r];
    if (!FORWARDED_VALUE_FLAGS.has(e)) {
      s.push(e);
      continue;
    }
    let o = n[++r];
    if (!o.startsWith("-")) {
      s.push(e, o);
      continue;
    }
    s.push(`${e === "-n" ? "--name" : e}=${o}`);
    let a = n[r + 1];
    if (Evt.has(e) && a !== void 0 && !a.startsWith("-")) s.push(e);
  }
  return s;
}
/**
 * 把 argv 按标志分组（标志与其值放在一起，可变参标志吞掉后续值）。
 */
//@ chunk-nwzhqrkg.js:5939-6393 placement
function groupFlagArgs(n) {
  let s = [];
  for (let e = 0; e < n.length; e++) {
    let o = n[e],
      index = o.indexOf("="),
      l = index === -1 ? o : o.slice(0, index),
      d = [o];
    if (index === -1 && FORWARDED_VALUE_FLAGS.has(l) && n[e + 1] !== void 0) {
      if ((d.push(n[++e]), Evt.has(l)))
        while (n[e + 1] !== void 0 && !n[e + 1].startsWith("-")) d.push(n[++e]);
    }
    s.push({ name: l, toks: d });
  }
  let r = new Map();
  for (let e = 0; e < s.length; e++) {
    let o = s[e];
    if (FORWARDED_VALUE_FLAGS.has(o.name) && !Evt.has(o.name) && !D.has(o.name)) r.set(o.name, e);
  }
  return s.filter((e, o) => (r.get(e.name) ?? o) === o).flatMap((e) => e.toks);
}
/**
 * 若 --dangerously-skip-permissions 之后又出现 --permission-mode，则去掉前者（后者优先）。
 */
//@ chunk-nwzhqrkg.js:6393-6621 placement
function dropOverriddenSkipPermissions(n) {
  let index = n.lastIndexOf("--dangerously-skip-permissions");
  return index !== -1 &&
    n.slice(index + 1).some((e) => e === "--permission-mode" || e.startsWith("--permission-mode="))
    ? n.filter((e) => e !== "--dangerously-skip-permissions")
    : [...n];
}
/**
 * 把 --dangerously-skip-permissions 移到参数列表末尾。
 */
//@ chunk-nwzhqrkg.js:6621-6786 placement
function moveSkipPermissionsLast(n) {
  return n.includes("--dangerously-skip-permissions")
    ? [...n.filter((s) => s !== "--dangerously-skip-permissions"), "--dangerously-skip-permissions"]
    : [...n];
}
/**
 * 去掉 argv 中已转发的标志（含 --flag=value 形式），保留 -- 之后的内容。
 */
//@ chunk-nwzhqrkg.js:6786-7714 placement
function stripForwardedFlags(n) {
  let s = [];
  for (let r = 0; r < n.length; r++) {
    let e = n[r];
    if (e === "--") {
      for (let a = r; a < n.length; a++) s.push(n[a]);
      break;
    }
    let o = e.startsWith("--") ? e.indexOf("=") : -1;
    if (o !== -1 && (G2t.has(e.slice(0, o)) || c.has(e.slice(0, o)))) {
      s.push(e.slice(0, o + 1) + u(e.slice(0, o), e.slice(o + 1)));
      continue;
    }
    if (/^-[a-zA-Z].+/.test(e)) {
      let a = 1;
      while (a < e.length - 1 && lqr.has(`-${e[a]}`)) a++;
      let l = `-${e[a]}`;
      if (e.length > a + 1 && (G2t.has(l) || c.has(l))) {
        s.push(e.slice(0, a + 1) + u(l, e.slice(a + 1)));
        continue;
      }
      if (e.length === a + 1 && a > 1 && (G2t.has(l) || c.has(l))) {
        if ((s.push(e), G2t.has(l) && n[r + 1] !== void 0)) {
          if ((s.push(u(l, n[++r])), Evt.has(l)))
            while (n[r + 1] !== void 0 && !E(n[r + 1])) s.push(u(l, n[++r]));
        } else if (c.has(l) && n[r + 1] !== void 0 && !E(n[r + 1])) s.push(stripLongPathPrefixes(n[++r]));
        continue;
      }
    }
    if ((s.push(e), G2t.has(e) && n[r + 1] !== void 0)) {
      if ((s.push(u(e, n[++r])), Evt.has(e)))
        while (n[r + 1] !== void 0 && !E(n[r + 1])) s.push(u(e, n[++r]));
    } else if (c.has(e) && n[r + 1] !== void 0 && !E(n[r + 1])) s.push(stripLongPathPrefixes(n[++r]));
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
function u(n, s) {
  return PROMPT_TEXT_FLAGS.has(n) ? s : stripLongPathPrefixes(s);
}
//@ chunk-nwzhqrkg.js:7889-7957 placement
var c = new Set(["-r", "--resume"]),
  lqr = new Set(["-c", "-p", "-h", "-v"]);
//@ chunk-nwzhqrkg.js:7957-8008 placement
function E(n) {
  return n.length > 1 && n.startsWith("-");
}
/**
 * 确保参数里带 --reply-on-resume。
 */
//@ chunk-nwzhqrkg.js:8008-8097 placement
function withReplyOnResume(n) {
  return n.includes("--reply-on-resume") ? [...n] : [...n, "--reply-on-resume"];
}
/**
 * 去掉参数里的 --reply-on-resume。
 */
//@ chunk-nwzhqrkg.js:8097-8159 placement
function withoutReplyOnResume(n) {
  return n.filter((s) => s !== "--reply-on-resume");
}

export {
  splitForwardableArgs,
  stripForwardedFlags,
  qKo,
  withoutReplyOnResume,
  moveSkipPermissionsLast,
  hyn,
  FORWARDED_VALUE_FLAGS,
  lqr,
  G2t,
  Evt,
  knt,
  VKo,
  withReplyOnResume,
  keepForwardableEnv,
  dropOverriddenSkipPermissions,
  filterBackgroundEnv,
  resolveForwardedEnvPaths,
};
