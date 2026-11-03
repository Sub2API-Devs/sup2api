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
import { u, Ue, E, o } from "../../vendor/zod/v4/classic/schemas.js";
import { claudeCodeUserAgent } from "../utils/http.js";

/**
 * CCR 云端会话里 autoMode 规则应用预设：all / no-allow / none。
 */
//@ chunk-3nztfxrw.js:1180-1263 placement
var AUTO_MODE_APPLY_PRESETS = { all: [], "no-allow": ["allow"], none: AUTO_MODE_RULE_SECTIONS },
  AUTO_MODE_ENV_MAX_BYTES = 2097152,
  CCR_AUTO_MODE_APPLY = "CCR_AUTO_MODE_APPLY";
/**
 * CCR 会话环境变量里 CCR_AUTO_MODE_APPLY=1 时才应用宿主下发的 autoMode 规则。
 */
//@ chunk-3nztfxrw.js:1263-1355 placement
function isCcrAutoModeApplySet(e) {
  let n = e.environment_variables ?? {};
  return Object.hasOwn(n, CCR_AUTO_MODE_APPLY) && n[CCR_AUTO_MODE_APPLY] === "1";
}
/**
 * 读取 CCR 会话下发的 autoMode allow/environment/soft_deny 配置状态（absent/present/invalid）。
 */
//@ chunk-3nztfxrw.js:1355-1597 placement = autoModeConfigHandler (0.823)
function autoModeConfigHandler(e) {
  if (!isCcrAutoModeApplySet(e))
    return { allow: { state: "absent" }, environment: { state: "absent" }, soft_deny: { state: "absent" } };
  let n = e.environment_variables ?? {};
  return {
    allow: readAutoModeEnvList(n, AUTO_MODE_SECTION_ENV_VARS.allow),
    environment: readAutoModeEnvList(n, AUTO_MODE_SECTION_ENV_VARS.environment),
    soft_deny: readAutoModeEnvList(n, AUTO_MODE_SECTION_ENV_VARS.soft_deny),
  };
}
//@ chunk-3nztfxrw.js:1597-1616 placement
var NO_ALLOW = "no-allow";
/**
 * 按预设去掉服务端自动模式的某些规则列表，返回保留的配置与被扣下的列表名。
 */
//@ chunk-3nztfxrw.js:1616-1836 placement
function applyAutoModePreset(e, n) {
  let r = { ...e },
    m = [];
  for (let a of AUTO_MODE_APPLY_PRESETS[n]) {
    let t = e[a],
      i = t.state === "decoded" && Array.isArray(t.value) && t.value.length === 0;
    if (t.state !== "absent" && !i) m.push(a);
    r[a] = { state: "absent" };
  }
  return { carried: r, withheld: m };
}
//@ chunk-3nztfxrw.js:1836-1990 placement
var UNDECODABLE_RULES_HINT =
  "nothing on this runner needs changing; if an admin of your organization wrote the entry, a line break, some emoji or a blank rule can cause this";
//@ chunk-3nztfxrw.js:1990-3514 placement
function readServerAutoModeRules(e) {
  let n = {};
  for (let s of AUTO_MODE_RULE_SECTIONS) {
    let c = e[s];
    if (c.state !== "absent") n[s] = c.state === "decoded" ? c.value : null;
  }
  let { rules: rules, refused: refused, grantsWithheld: grantsWithheld } = readAutoModeRuleOverrides(n),
    t = [],
    i = { refused_entries: 0, unreadable_lists: 0 };
  for (let s of AUTO_MODE_RULE_SECTIONS) {
    let c = e[s],
      l = refused[s];
    if (c.state === "absent" || l === void 0) continue;
    if (l === "unreadable") i.unreadable_lists++;
    else i.refused_entries += l;
    t.push(
      l === "unreadable"
        ? `ignoring the server's autoMode.${s} list for this session: its ${c.carrier} value ${c.state === "decoded" ? "is not an array of strings" : `is not valid JSON text, or is longer than ${AUTO_MODE_ENV_MAX_BYTES} characters`} (a server-side fault: nothing on this runner needs changing)`
        : `ignoring ${l} of the entries in the server's autoMode.${s} list (${c.carrier}) for this session: null, blank, or containing a control character, an invisible character or markup reserved for the auto mode classifier's prompt; ${grantsWithheld && s !== "soft_deny" ? "any other entries in the list are not applied either (see below)" : "any other entries in the list still apply"} (${UNDECODABLE_RULES_HINT})`,
    );
  }
  if (grantsWithheld) {
    let joined = ["allow", "environment"]
      .filter((c) => e[c].state !== "absent")
      .map((c) => `autoMode.${c}`)
      .join(" or ");
    t.push(
      `not applying any ${joined} entries from the server for this session: part or all of its autoMode.environment or autoMode.soft_deny list was ignored (see above), and without it the ${joined} entries could allow more than the server meant. Auto mode still works but may block more actions than usual (nothing on this runner needs changing)`,
    );
  }
  return {
    autoMode: prependDefaultsToSections(rules),
    statusLines: t,
    grantsWithheld: grantsWithheld,
    refusedCounts: i,
  };
}
//@ chunk-3nztfxrw.js:3514-3782 placement
function readAutoModeEnvList(e, n) {
  let r = Object.hasOwn(e, n) ? e[n] : void 0;
  if (r === void 0 || r === "") return { state: "absent" };
  if (typeof r !== "string" || r.length > AUTO_MODE_ENV_MAX_BYTES)
    return { state: "undecodable", carrier: n };
  try {
    return { state: "decoded", carrier: n, value: jsonParse(r) };
  } catch {
    return { state: "undecodable", carrier: n };
  }
}
//@ chunk-3nztfxrw.js:3782-3942 placement
class UnreadableToolsHostError extends Error {
  constructor() {
    super("IssueSessionToken: response holds a tools_host that this runner cannot read");
    this.name = "UnreadableToolsHostError";
  }
}
/**
 * 自托管 runner 常量：配置 schema（tool_server_hosting、api_base_url、cwd）、版本号、自动模式环境变量名、标签正则与各种长度/超时上限。
 */
//@ chunk-3nztfxrw.js:3942-4818 placement
var RUNNER_CONFIG_SCHEMA = DoctorLazy(() =>
    u({
      tool_server_hosting: Ue([E(), o().regex(/^\d+$/).transform(Number)]).pipe(E().int().min(1)),
      api_base_url: o().min(1),
      cwd: o()
        .nullish()
        .transform((e) => e || void 0),
    }),
  ),
  Y9e = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION.replace(/^v/, "").split(/[-+]/)[0],
  _n = {
    all: "SERVER_AUTO_MODE_LISTS_ALL",
    "no-allow": "SERVER_AUTO_MODE_LISTS_NO_ALLOW",
    none: "SERVER_AUTO_MODE_LISTS_NONE",
  },
  bn = /^[a-zA-Z0-9_-]+$/,
  mvr = 1e4,
  HHn = 15000,
  Me = 256,
  wn = 65536;
//@ chunk-3nztfxrw.js:4818-4886 placement
function De(e) {
  return typeof e === "string" && e.length <= Me && bn.test(e);
}
//@ chunk-3nztfxrw.js:4886-5006 placement
function validateRunnerLabel(e, n) {
  if (!De(e)) throw Error(`Invalid ${n}: contains unsafe characters or exceeds ${Me} characters`);
  return e;
}
//@ chunk-3nztfxrw.js:5006-5177 placement = getOAuthHeaders (0.778)
function getOAuthHeaders(accessToken) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-self-hosted-runner-version": Y9e,
  };
}

export {
  Y9e,
  _n,
  NO_ALLOW,
  getOAuthHeaders,
  validateRunnerLabel,
  HHn,
  mvr,
  De,
  RUNNER_CONFIG_SCHEMA,
  UnreadableToolsHostError,
  wn,
  isCcrAutoModeApplySet,
  CCR_AUTO_MODE_APPLY,
  applyAutoModePreset,
  autoModeConfigHandler,
  readServerAutoModeRules,
};
