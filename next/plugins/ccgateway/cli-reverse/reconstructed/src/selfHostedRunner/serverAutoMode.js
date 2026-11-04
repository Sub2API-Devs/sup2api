/**
 * selfHostedRunner/serverAutoMode.ts
 *
 * 服务端下发的自动模式规则（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (13)
 * attribution: placement 13
 */
import {
  AUTO_MODE_RULE_SECTIONS,
  AUTO_MODE_SECTION_ENV_VARS,
  readAutoModeRuleOverrides,
  prependDefaultsToSections,
} from "../utils/permissions/autoModeRulesPrompt.js";
import { jsonParse } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, union, numberSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3nztfxrw.js:1180-1263 placement
/**
 * CCR 云端会话里 autoMode 规则应用预设：all / no-allow / none。
 */
var AUTO_MODE_APPLY_PRESETS; // deferred: uses AUTO_MODE_RULE_SECTIONS (../utils/permissions/autoModeRulesPrompt.js) of its import cycle while loading; runs once the cycle is complete
var AUTO_MODE_ENV_MAX_BYTES;
var CCR_AUTO_MODE_APPLY;
deferInit("chunk-3nztfxrw.js:1180", () => {
  AUTO_MODE_APPLY_PRESETS = {
    all: [],
    "no-allow": ["allow"],
    none: AUTO_MODE_RULE_SECTIONS,
  };
  AUTO_MODE_ENV_MAX_BYTES = 2097152;
  CCR_AUTO_MODE_APPLY = "CCR_AUTO_MODE_APPLY";
});
//@ chunk-3nztfxrw.js:1263-1355 placement
/**
 * CCR 会话环境变量里 CCR_AUTO_MODE_APPLY=1 时才应用宿主下发的 autoMode 规则。
 */
function isCcrAutoModeApplySet(config) {
  let environmentVariables = config.environment_variables ?? {};
  return (
    Object.hasOwn(environmentVariables, CCR_AUTO_MODE_APPLY) &&
    environmentVariables[CCR_AUTO_MODE_APPLY] === "1"
  );
}
//@ chunk-3nztfxrw.js:1355-1597 placement (2.1.88 match: autoModeConfigHandler, 0.823)
/**
 * 读取 CCR 会话下发的 autoMode allow/environment/soft_deny 配置状态（absent/present/invalid）。
 */
function autoModeConfigHandler(config) {
  if (!isCcrAutoModeApplySet(config))
    return {
      allow: {
        state: "absent",
      },
      environment: {
        state: "absent",
      },
      soft_deny: {
        state: "absent",
      },
    };
  let environmentVariables = config.environment_variables ?? {};
  return {
    allow: readAutoModeEnvList(environmentVariables, AUTO_MODE_SECTION_ENV_VARS.allow),
    environment: readAutoModeEnvList(environmentVariables, AUTO_MODE_SECTION_ENV_VARS.environment),
    soft_deny: readAutoModeEnvList(environmentVariables, AUTO_MODE_SECTION_ENV_VARS.soft_deny),
  };
}
//@ chunk-3nztfxrw.js:1597-1616 placement
var NO_ALLOW = "no-allow";
//@ chunk-3nztfxrw.js:1616-1836 placement
/**
 * 按预设去掉服务端自动模式的某些规则列表，返回保留的配置与被扣下的列表名。
 */
function applyAutoModePreset(lists, serverAutoModeLists) {
  let next = {
    ...lists,
  };
  let nonEmpty = [];
  for (let section of AUTO_MODE_APPLY_PRESETS[serverAutoModeLists]) {
    let entry = lists[section];
    let emptyDecoded = entry.state === "decoded" && Array.isArray(entry.value) && entry.value.length === 0;
    if (entry.state !== "absent" && !emptyDecoded) nonEmpty.push(section);
    next[section] = {
      state: "absent",
    };
  }
  return {
    carried: next,
    withheld: nonEmpty,
  };
}
//@ chunk-3nztfxrw.js:1836-1990 placement
var UNDECODABLE_RULES_HINT =
  "nothing on this runner needs changing; if an admin of your organization wrote the entry, a line break, some emoji or a blank rule can cause this";
//@ chunk-3nztfxrw.js:1990-3514 placement
function readServerAutoModeRules(carried) {
  let picked = {};
  for (let section of AUTO_MODE_RULE_SECTIONS) {
    let entry = carried[section];
    if (entry.state !== "absent") picked[section] = entry.state === "decoded" ? entry.value : null;
  }
  let { rules, refused, grantsWithheld } = readAutoModeRuleOverrides(picked);
  let sources = [];
  let refusedCounts = {
    refused_entries: 0,
    unreadable_lists: 0,
  };
  for (let section of AUTO_MODE_RULE_SECTIONS) {
    let carriedEntry = carried[section];
    let refusedEntry = refused[section];
    if (carriedEntry.state === "absent" || refusedEntry === undefined) continue;
    if (refusedEntry === "unreadable") refusedCounts.unreadable_lists++;
    else refusedCounts.refused_entries += refusedEntry;
    sources.push(
      refusedEntry === "unreadable"
        ? `ignoring the server's autoMode.${section} list for this session: its ${carriedEntry.carrier} value ${carriedEntry.state === "decoded" ? "is not an array of strings" : `is not valid JSON text, or is longer than ${AUTO_MODE_ENV_MAX_BYTES} characters`} (a server-side fault: nothing on this runner needs changing)`
        : `ignoring ${refusedEntry} of the entries in the server's autoMode.${section} list (${carriedEntry.carrier}) for this session: null, blank, or containing a control character, an invisible character or markup reserved for the auto mode classifier's prompt; ${grantsWithheld && section !== "soft_deny" ? "any other entries in the list are not applied either (see below)" : "any other entries in the list still apply"} (${UNDECODABLE_RULES_HINT})`,
    );
  }
  if (grantsWithheld) {
    let joined = ["allow", "environment"]
      .filter((section) => carried[section].state !== "absent")
      .map((section) => `autoMode.${section}`)
      .join(" or ");
    sources.push(
      `not applying any ${joined} entries from the server for this session: part or all of its autoMode.environment or autoMode.soft_deny list was ignored (see above), and without it the ${joined} entries could allow more than the server meant. Auto mode still works but may block more actions than usual (nothing on this runner needs changing)`,
    );
  }
  return {
    autoMode: prependDefaultsToSections(rules),
    statusLines: sources,
    grantsWithheld,
    refusedCounts,
  };
}
//@ chunk-3nztfxrw.js:3514-3782 placement
function readAutoModeEnvList(environmentVariables, carrier) {
  let raw = Object.hasOwn(environmentVariables, carrier) ? environmentVariables[carrier] : undefined;
  if (raw === undefined || raw === "")
    return {
      state: "absent",
    };
  if (typeof raw !== "string" || raw.length > AUTO_MODE_ENV_MAX_BYTES)
    return {
      state: "undecodable",
      carrier,
    };
  try {
    return {
      state: "decoded",
      carrier,
      value: jsonParse(raw),
    };
  } catch {
    return {
      state: "undecodable",
      carrier,
    };
  }
}
//@ chunk-3nztfxrw.js:3782-3942 placement
class UnreadableToolsHostError extends Error {
  constructor() {
    super("IssueSessionToken: response holds a tools_host that this runner cannot read");
    this.name = "UnreadableToolsHostError";
  }
}
//@ chunk-3nztfxrw.js:3942-4818 placement
/**
 * 自托管 runner 常量：配置 schema（tool_server_hosting、api_base_url、cwd）、版本号、自动模式环境变量名、标签正则与各种长度/超时上限。
 */
var RUNNER_CONFIG_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RUNNER_CLIENT_VERSION;
var LIST_MODE_ENV_VARS;
var ENV_TOKEN_RE;
var ENV_DEFAULT_TIMEOUT_MS;
var ENV_MAX_TIMEOUT_MS;
var MAX_ENV_TOKEN_CHARS;
var MAX_ENV_VALUE_BYTES;
deferInit("chunk-3nztfxrw.js:3942", () => {
  RUNNER_CONFIG_SCHEMA = DoctorLazy(() =>
    objectSchema({
      tool_server_hosting: union([numberSchema(), stringSchema().regex(/^\d+$/).transform(Number)]).pipe(
        numberSchema().int().min(1),
      ),
      api_base_url: stringSchema().min(1),
      cwd: stringSchema()
        .nullish()
        .transform((value) => value || undefined),
    }),
  );
  RUNNER_CLIENT_VERSION = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION.replace(/^v/, "").split(/[-+]/)[0];
  LIST_MODE_ENV_VARS = {
    all: "SERVER_AUTO_MODE_LISTS_ALL",
    "no-allow": "SERVER_AUTO_MODE_LISTS_NO_ALLOW",
    none: "SERVER_AUTO_MODE_LISTS_NONE",
  };
  ENV_TOKEN_RE = /^[a-zA-Z0-9_-]+$/;
  ENV_DEFAULT_TIMEOUT_MS = 1e4;
  ENV_MAX_TIMEOUT_MS = 15000;
  MAX_ENV_TOKEN_CHARS = 256;
  MAX_ENV_VALUE_BYTES = 65536;
});
//@ chunk-3nztfxrw.js:4818-4886 placement
function isSafeEnvToken(value) {
  return typeof value === "string" && value.length <= MAX_ENV_TOKEN_CHARS && ENV_TOKEN_RE.test(value);
}
//@ chunk-3nztfxrw.js:4886-5006 placement
function validateRunnerLabel(label, field) {
  if (!isSafeEnvToken(label))
    throw Error(`Invalid ${field}: contains unsafe characters or exceeds ${MAX_ENV_TOKEN_CHARS} characters`);
  return label;
}
//@ chunk-3nztfxrw.js:5006-5177 placement (2.1.88 match: getOAuthHeaders, 0.778)
function getOAuthHeaders(accessToken) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-self-hosted-runner-version": RUNNER_CLIENT_VERSION,
  };
}
export {
  RUNNER_CLIENT_VERSION,
  LIST_MODE_ENV_VARS,
  NO_ALLOW,
  getOAuthHeaders,
  validateRunnerLabel,
  ENV_MAX_TIMEOUT_MS,
  ENV_DEFAULT_TIMEOUT_MS,
  isSafeEnvToken,
  RUNNER_CONFIG_SCHEMA,
  UnreadableToolsHostError,
  MAX_ENV_VALUE_BYTES,
  isCcrAutoModeApplySet,
  CCR_AUTO_MODE_APPLY,
  applyAutoModePreset,
  autoModeConfigHandler,
  readServerAutoModeRules,
};
