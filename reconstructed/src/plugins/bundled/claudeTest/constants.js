/**
 * plugins/bundled/claudeTest/constants.ts
 *
 * 2.1.316 新增：内置 claude-test 插件的名称、代理名与工具名常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (13), chunk-e6aww6q8.js (15)
 * attribution: placement 28
 */
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";
import { Ar } from "../../../../runtime/bun-runtime.js";
import {
  SCRUBBED_APP_ENV_VARS,
  getTeammateEnvVarsToForward,
  Tt,
  loadInstalledFiles,
  rr,
  isSafeNodeOptions,
  resolveTrustedNode,
  findUnsafeInheritedEnv,
  buildAppEnvironment,
  listProjectRoots,
} from "./nodeEnvironment.js";
import {
  Go,
  BLOCKED_STATES,
  ha,
  browserHelperHooks,
  Oa,
  Ia,
  ka,
  LOCAL_RUN_DESCRIPTION,
  xo,
  HELPER_OFF_LOGIN_CHANGED_TEXT,
  Ro,
  qt,
  completeSpecArgs,
  Uo,
  createBrowserHelperController,
  parseSpecProposalEvent,
  Ea,
  wa,
  getActiveAgentDefinitions,
  ensureClaudeTestReloaded,
  createHelperWatchState,
  rememberRunFolder,
  Ta,
  Jt,
  bo,
  countRunsFromUsageEvents,
  Ho,
  parseRunResults,
  seatOwnAgents,
  To,
  consumeComposerMark,
} from "./browserHelper.js";
import {
  pet,
  V6n,
  K6n,
  testPluginContentId,
  claudeTestInstalledRoot,
  m$o,
  mNi,
} from "../../../services/pluginTest/claudeTestPlugin.js";
import { DRAFT_AGENT_DEFINITION, EXECUTE_AGENT_DEFINITION, RUN_SKILL_DEFINITION } from "./agents.js";
import {
  An,
  Wi,
  Dt,
  readClaudeTestGate,
  Gr,
  Ur,
  $r,
  cleanupOldClaudeTestFiles,
  readSignedInAccount,
  readFlagAccount,
} from "./consent.js";
import {
  Nn,
  Wt,
  Ln,
  kn,
  LOAD_MARK_PREFIX,
  Mn,
  ct,
  CLI_ONLY_TEXT,
  Cn,
  Xr,
  Pn,
  ut,
  HELPER_NOT_READY_TEXT,
  In,
  xn,
  Jr,
  jt,
  Ht,
  qr,
  jn,
  Wn,
  Gt,
  Gn,
  CLAUDE_TEST_TITLE,
  vn,
  Kr,
  zr,
  Me,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  formatConflictingPluginText,
  Pe,
} from "./messages.js";
import { claudeTestState } from "./appFacts.js";
import {
  _a,
  CLAUDE_TEST_3,
  z,
  noteAppStartEnded,
  detectRunHalt,
  isClaudeTestAvailable,
  lo,
  isMoreTestsDeclined,
  isEarlyPhaseActive,
  isAppStartPending,
  isRunAcceptedPending,
  $t,
  rememberRunHalt,
  Oe,
  noteStartAppAnswer,
  noteMoreTestsDeclinedByText,
  noteMoreTestsDeclined,
  noteRunConfirmed,
  noteAppDownWithStartAllowed,
  findClaudeTestRepository,
  registerClaudeTestCommand,
  noteAppProbeResult,
} from "./commandHook.js";
import { TEAMMATE_ENV_VARS } from "../../../utils/swarm/spawnUtils.js";
import {
  zo,
  Yo,
  CLAUDE_TEST_SKILLS,
  Ko,
  registerClaudeTestPlugin,
  Xo,
  describeNetworkReach,
  checkSandboxLocalBinding,
  createClaudeTestSkill,
  readSkillFrontmatter,
} from "./plugin.js";
import { findDifferingInstalledFile } from "./runFiles.js";
import { Xt } from "../../../components/skills/SkillsMenu.js";
import { ge } from "../../../utils/identity.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEssentialTrafficOnly } from "../../../utils/privacyLevel.js";
import { getEnvCaseInsensitive } from "../../../utils/plugins/securityDefaultPlugin.js";
import { cte } from "../../../utils/settings/envSources.js";
import { isSettingsSourcedEnvValue } from "../../../utils/managedEnvApply.js";

//@ chunk-e6aww6q8.js:4677720-4677749 placement
var CLAUDE_TEST_AUTHOR = "claude-test:author";
//@ chunk-e6aww6q8.js:4677749-4677781 placement
var CLAUDE_TEST_CONDUCTOR = "claude-test:conductor";
//@ chunk-e6aww6q8.js:4677781-4677812 placement
var CLAUDE_TEST_EXPLORER = "claude-test:explorer";
//@ chunk-e6aww6q8.js:4677812-4677830 placement
var BROWSER = "browser";
//@ chunk-e6aww6q8.js:4677830-4677852 placement
var CLAUDE_TEST = "claude-test";
//@ chunk-e6aww6q8.js:4677852-4677882 placement
var IZ = `plugin:${CLAUDE_TEST}:${BROWSER}`;
//@ chunk-e6aww6q8.js:4677882-4677920 placement
var u0e = `mcp__plugin_${CLAUDE_TEST}_${BROWSER}__`;
//@ chunk-e6aww6q8.js:4677920-4677949 placement
var CLAUDE_TEST_APP_UP = "claude_test_app_up";
//@ chunk-e6aww6q8.js:4677949-4677971 placement
var CLAUDE_TEST_2 = "claude-test";
//@ chunk-e6aww6q8.js:4677971-4677996 placement
var RELOAD_PLUGINS = "reload-plugins";
//@ chunk-e6aww6q8.js:4677996-4678025 placement
var CLAUDE_TEST_RUNNER = "claude-test:runner";
//@ chunk-e6aww6q8.js:4678025-4678083 placement
var CLAUDE_TEST_WRITE = "claude_test_write",
  h1r = "[a-z0-9][a-z0-9-]{0,79}";
//@ chunk-e6aww6q8.js:4678083-4678114 placement
var CC_PLUGIN_CLAUDE_TEST = "cc-plugin-claude-test";
//@ chunk-e6aww6q8.js:4678495-4678559 placement
var MCP_CLAUDE_TEST_WRITE = "mcp-claude-test-write",
  regExp_17 = new RegExp(`^${h1r}\\.md$`);
//@ chunk-e6aww6q8.js:4678559-4678621 placement
function u8n(e, n, r) {
  return n === `${CC_PLUGIN_CLAUDE_TEST}@${BUILTIN}` && e === IZ && r === CLAUDE_TEST_WRITE;
}
//@ chunk-ae5g0zb5.js:24040-24050 placement
var Qo = {};
//@ chunk-ae5g0zb5.js:24050-27585 placement
Ar(Qo, {
  ALWAYS_SET: () => SCRUBBED_APP_ENV_VARS,
  AUTHOR_AGENT_TYPE: () => CLAUDE_TEST_AUTHOR,
  BACKGROUND_FOR_SERVER_MARK: () => Go,
  BLOCKED_WORDS: () => BLOCKED_STATES,
  CONDUCTOR_AGENT_TYPE: () => CLAUDE_TEST_CONDUCTOR,
  DATA_PLUGIN_ID: () => pet,
  DRAFT_LISTING: () => DRAFT_AGENT_DEFINITION,
  DRAFT_NAME_STEM: () => h1r,
  EXECUTE_LISTING: () => EXECUTE_AGENT_DEFINITION,
  EXPLORER_AGENT_TYPE: () => CLAUDE_TEST_EXPLORER,
  FLAG_ANSWER: () => An,
  FLAG_ANSWER_NOTES: () => Wi,
  HELPER_FAILED_TEXT: () => Nn,
  HELPER_NOT_CONNECTED_TEXT: () => Wt,
  HELPER_OFF_TEXT: () => Ln,
  HELPER_REFUSED_TEXT: () => kn,
  HELPER_SERVER_KEY: () => BROWSER,
  HELPER_SERVER_NAME: () => IZ,
  HELPER_START: () => Be,
  HELPER_STATE: () => claudeTestState,
  HELPER_TOOL_PREFIX: () => u0e,
  HELPER_UP_TOOL: () => CLAUDE_TEST_APP_UP,
  LATE_LOADS: () => _a,
  LATE_LOAD_WAIT_MS: () => ha,
  LOAD_LINE_LEAD: () => LOAD_MARK_PREFIX,
  LOAD_SPENT_TEXT: () => Mn,
  LOGIN_CHANGED_TEXT: () => ct,
  LOGIN_WATCH: () => browserHelperHooks,
  LOGIN_WATCH_NOTES: () => Oa,
  MARKETPLACE_PLUGIN_NAME: () => CLAUDE_TEST_3,
  NAMESPACE_NAME: () => CLAUDE_TEST_2_3,
  NEEDS_TERMINAL_TEXT: () => CLI_ONLY_TEXT,
  NOTED_RUNS: () => Ia,
  NOT_CARRIED_TEXT: () => Cn,
  NOT_IN_CHARGE_TEXT: () => Xr,
  NOT_LISTED_TEXT: () => Pn,
  NOT_OFFERED_TEXT: () => ut,
  NOT_STARTED_YET_TEXT: () => HELPER_NOT_READY_TEXT,
  NO_STORED_LOGIN: () => Dt,
  OTHER_NAME_TEXT: () => In,
  OTHER_PLUGIN_TEXT: () => xn,
  OWN_AGENTS_NEXT_TURN_TEXT: () => Jr,
  OWN_AGENTS_STILL_LOADING_TEXT: () => jt,
  OWN_AGENTS_STILL_MISSING_TEXT: () => Ht,
  OWN_AGENT_NOT_LISTED_TEXT: () => qr,
  OWN_AGENT_TYPES: () => ka,
  OWN_FOLDER: () => V6n,
  PANE_ID: () => CLAUDE_TEST_2_2,
  PANE_OPEN_NOTE: () => jn,
  PANE_OPEN_NO_PICTURES_NOTE: () => Wn,
  PANE_PICTURE_ALT: () => Gt,
  PANE_REPORT_LINK_TEXT: () => Gn,
  PANE_TITLE: () => CLAUDE_TEST_TITLE,
  PERSONS_CHOICES: () => TEAMMATE_ENV_VARS,
  PLUGIN_DESCRIPTION: () => LOCAL_RUN_DESCRIPTION,
  PLUGIN_NAME: () => CC_PLUGIN_CLAUDE_TEST,
  PLUGIN_VERSION: () => K6n,
  PROBE: () => z,
  RELOAD_COMMAND: () => RELOAD_PLUGINS,
  RUNNER_AGENT_TYPE: () => CLAUDE_TEST_RUNNER,
  RUN_LISTING: () => RUN_SKILL_DEFINITION,
  SANDBOX_FOR_SERVER_MARK: () => zo,
  SANDBOX_LISTEN_MARK: () => Yo,
  SEAT_WAIT_MS: () => xo,
  SKILLS: () => CLAUDE_TEST_SKILLS,
  SKILL_NAMES: () => freeze,
  STARTING_TEXT: () => vn,
  STILL_GETTING_READY_TEXT: () => Kr,
  STOPPED_LOGIN_CHANGED_TEXT: () => HELPER_OFF_LOGIN_CHANGED_TEXT,
  STOPPED_NOT_OFFERED_TEXT: () => Ro,
  TYPE_IN_PROMPT_BOX_TEXT: () => zr,
  USER_SETTINGS_FILE_MARK: () => Ko,
  WATCH_FAILED_TEXT: () => Me,
  WRITE_TOOL_NAME: () => CLAUDE_TEST_WRITE,
  areOwnAgentsListed: () => qt,
  argumentCompletions: () => completeSpecArgs,
  backgroundForServer: () => Uo,
  browserServer: () => buildHelperServerConfig,
  createFlagAnswer: () => readClaudeTestGate,
  createLoginWatch: () => createBrowserHelperController,
  default: () => Qo,
  draftEventOf: () => parseSpecProposalEvent,
  endAppStarting: () => noteAppStartEnded,
  filesReady: () => Gr,
  haltOf: () => detectRunHalt,
  helperServer: () => buildPlaywrightMcpServer,
  ignoredChoices: () => getTeammateEnvVarsToForward,
  ignoredChoicesText: () => describeHelperEnvIgnored,
  installFiles: () => findDifferingInstalledFile,
  installedFolderName: () => testPluginContentId,
  installedRoot: () => claudeTestInstalledRoot,
  isAvailable: () => isClaudeTestAvailable,
  isFixEditOf: () => lo,
  isForeignValue: () => isEnvOverridden,
  isInProject: () => Tt,
  isLateLoadRunning: () => Ea,
  isLateLoadTried: () => wa,
  isMoreDeclinedOf: () => isMoreTestsDeclined,
  isOnByDefault: () => Ur,
  isOtherPluginListed: () => Xt,
  isRunActive: () => isEarlyPhaseActive,
  isStartingAppOf: () => isAppStartPending,
  isStartingRunOf: () => isRunAcceptedPending,
  isStopOnExitStart: () => m$o,
  isTypedCi: () => $t,
  keptHalt: () => rememberRunHalt,
  lateLoadState: () => Oe,
  listedInSession: () => getActiveAgentDefinitions,
  loadContent: () => loadInstalledFiles,
  loadLate: () => ensureClaudeTestReloaded,
  loadedFiles: () => rr,
  loadsOnlyFullPaths: () => isSafeNodeOptions,
  newFlagAnswerNotes: () => $r,
  newLoginWatchNotes: () => createHelperWatchState,
  nodeBinary: () => resolveTrustedNode,
  notStartedText: () => describeHelperFileMismatch,
  noteAppStarting: () => noteStartAppAnswer,
  noteMoreAskedInWords: () => noteMoreTestsDeclinedByText,
  noteMoreDeclined: () => noteMoreTestsDeclined,
  noteRun: () => rememberRunFolder,
  noteRunAccepted: () => noteRunConfirmed,
  noteStartAhead: () => noteAppDownWithStartAllowed,
  noteTyped: () => Ta,
  notedRuns: () => Jt,
  otherPluginFirstText: () => formatConflictingPluginText,
  otherPluginSource: () => findClaudeTestRepository,
  outsideProject: () => findUnsafeInheritedEnv,
  ownValues: () => buildAppEnvironment,
  portedInstalledFiles: () => yt,
  portedNames: () => ht,
  portedPaths: () => expandSkillDirPlaceholders,
  projectRoots: () => listProjectRoots,
  promptBoxMarkerOf: () => bo,
  register: () => registerClaudeTestCommand,
  registerPlugin: () => registerClaudeTestPlugin,
  removeStaleVersions: () => cleanupOldClaudeTestFiles,
  reportRuns: () => countRunsFromUsageEvents,
  reportStart: () => Ho,
  runEventOf: () => parseRunResults,
  runFolderOf: () => Xo,
  sandboxForServer: () => describeNetworkReach,
  sandboxListen: () => checkSandboxLocalBinding,
  seatOwnAgents: () => seatOwnAgents,
  settleStartGuess: () => noteAppProbeResult,
  signedInLogin: () => readSignedInAccount,
  skillOf: () => createClaudeTestSkill,
  skillPartsOf: () => readSkillFrontmatter,
  stillWantedBy: () => To,
  stopOnExitStartPrefix: () => mNi,
  takeTyped: () => consumeComposerMark,
  waitPrompt: () => Pe,
  wasFlagServiceToldStoredLogin: () => readFlagAccount,
});
//@ chunk-ae5g0zb5.js:27585-27595 placement
var je = {};
//@ chunk-ae5g0zb5.js:27595-29135 placement
Ar(je, {
  AUTHOR_AGENT_TYPE: () => CLAUDE_TEST_AUTHOR,
  CONDUCTOR_AGENT_TYPE: () => CLAUDE_TEST_CONDUCTOR,
  DRAFT_NAME_STEM: () => h1r,
  EXPLORER_AGENT_TYPE: () => CLAUDE_TEST_EXPLORER,
  HELPER_FAILED_TEXT: () => Nn,
  HELPER_NOT_CONNECTED_TEXT: () => Wt,
  HELPER_OFF_TEXT: () => Ln,
  HELPER_REFUSED_TEXT: () => kn,
  HELPER_SERVER_KEY: () => BROWSER,
  HELPER_SERVER_NAME: () => IZ,
  HELPER_STATE: () => claudeTestState,
  HELPER_TOOL_PREFIX: () => u0e,
  HELPER_UP_TOOL: () => CLAUDE_TEST_APP_UP,
  LOAD_LINE_LEAD: () => LOAD_MARK_PREFIX,
  LOAD_SPENT_TEXT: () => Mn,
  LOGIN_CHANGED_TEXT: () => ct,
  NEEDS_TERMINAL_TEXT: () => CLI_ONLY_TEXT,
  NOT_CARRIED_TEXT: () => Cn,
  NOT_IN_CHARGE_TEXT: () => Xr,
  NOT_LISTED_TEXT: () => Pn,
  NOT_OFFERED_TEXT: () => ut,
  NOT_STARTED_YET_TEXT: () => HELPER_NOT_READY_TEXT,
  OTHER_NAME_TEXT: () => In,
  OTHER_PLUGIN_TEXT: () => xn,
  OWN_AGENTS_NEXT_TURN_TEXT: () => Jr,
  OWN_AGENTS_STILL_LOADING_TEXT: () => jt,
  OWN_AGENTS_STILL_MISSING_TEXT: () => Ht,
  OWN_AGENT_NOT_LISTED_TEXT: () => qr,
  PANE_ID: () => CLAUDE_TEST_2_2,
  PANE_OPEN_NOTE: () => jn,
  PANE_OPEN_NO_PICTURES_NOTE: () => Wn,
  PANE_PICTURE_ALT: () => Gt,
  PANE_REPORT_LINK_TEXT: () => Gn,
  PANE_TITLE: () => CLAUDE_TEST_TITLE,
  PROBE: () => z,
  RELOAD_COMMAND: () => RELOAD_PLUGINS,
  RUNNER_AGENT_TYPE: () => CLAUDE_TEST_RUNNER,
  STARTING_TEXT: () => vn,
  STILL_GETTING_READY_TEXT: () => Kr,
  TYPE_IN_PROMPT_BOX_TEXT: () => zr,
  WATCH_FAILED_TEXT: () => Me,
  WRITE_TOOL_NAME: () => CLAUDE_TEST_WRITE,
  default: () => je,
  endAppStarting: () => noteAppStartEnded,
  haltOf: () => detectRunHalt,
  ignoredChoicesText: () => describeHelperEnvIgnored,
  isFixEditOf: () => lo,
  isMoreDeclinedOf: () => isMoreTestsDeclined,
  isRunActive: () => isEarlyPhaseActive,
  isStartingAppOf: () => isAppStartPending,
  isStartingRunOf: () => isRunAcceptedPending,
  isTypedCi: () => $t,
  keptHalt: () => rememberRunHalt,
  notStartedText: () => describeHelperFileMismatch,
  noteAppStarting: () => noteStartAppAnswer,
  noteMoreAskedInWords: () => noteMoreTestsDeclinedByText,
  noteMoreDeclined: () => noteMoreTestsDeclined,
  noteRunAccepted: () => noteRunConfirmed,
  noteStartAhead: () => noteAppDownWithStartAllowed,
  otherPluginFirstText: () => formatConflictingPluginText,
  register: () => registerClaudeTestCommand,
  settleStartGuess: () => noteAppProbeResult,
  waitPrompt: () => Pe,
});
//@ chunk-ae5g0zb5.js:29135-29217 placement
var Be = ge({ server: void 0, toldIgnored: "" }, (e) => {
  ((e.server = void 0), (e.toldIgnored = ""));
});
/**
 * 生成浏览器助手 MCP 服务器配置，按需追加 --preview/--pane 参数。
 */
//@ chunk-ae5g0zb5.js:29217-29388 placement
function buildHelperServerConfig(preview, pane = !1) {
  let { server: server } = Be;
  if (server === void 0) return {};
  let o = [...(preview ? ["--preview"] : []), ...(pane ? ["--pane"] : [])];
  return { [BROWSER]: o.length === 0 ? server : { ...server, args: [...(server.args ?? []), ...o] } };
}
//@ chunk-ae5g0zb5.js:29388-29486 placement
var freeze = Object.freeze({
  run: "claude-test",
  execute: "claude-test-execute",
  draft: "claude-test-draft",
});
//@ chunk-ae5g0zb5.js:29486-29569 placement
function ht(e) {
  return e.replace(/claude-test:(run|execute|draft)\b/g, (n, r) => freeze[r]);
}
//@ chunk-ae5g0zb5.js:29569-29650 placement
function yt(e) {
  return xr(e, (n, r) => (r.endsWith(".md") || r.endsWith(".mjs") ? ht(n) : n));
}
//@ chunk-ae5g0zb5.js:29650-29795 placement
function expandSkillDirPlaceholders(e, n) {
  return e
    .replaceAll("${CLAUDE_SKILL_DIR}/../run", () => `${n}/skills/run`)
    .replaceAll("${CLAUDE_SKILL_DIR}", () => `${n}/skills/run`);
}
//@ chunk-ae5g0zb5.js:29795-29884 placement = getEssentialTrafficOnlyReason (0.775)
function getEssentialTrafficOnlyReason() {
  return (
    isEssentialTrafficOnly() ||
    Boolean(getEnvCaseInsensitive(cte(), "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"))
  );
}
/**
 * 生成运行 skills/run/scripts/playwright-mcp.mjs 的 MCP 服务器条目（带项目目录与精简流量开关）。
 */
//@ chunk-ae5g0zb5.js:29884-30079 placement
function buildPlaywrightMcpServer(e, n) {
  return {
    command: e,
    args: [`${claudeTestInstalledRoot()}/skills/run/scripts/playwright-mcp.mjs`],
    env: {
      ...n,
      CLAUDE_TEST_PROJECT_DIR: "${CLAUDE_PROJECT_DIR}",
      ...(getEssentialTrafficOnlyReason() && { CLAUDE_TEST_ESSENTIAL_TRAFFIC: "1" }),
    },
  };
}
/**
 * 环境变量值是否与基线不同（需要显式透传）。
 */
//@ chunk-ae5g0zb5.js:30079-30138 placement
function isEnvOverridden(e, n, r) {
  return n !== void 0 && n !== getEnvCaseInsensitive(r, e) && isSettingsSourcedEnvValue(e, n);
}
const CLAUDE_TEST_2_3 = CLAUDE_TEST; //@ cross-chunk alias
const CLAUDE_TEST_2_2 = CLAUDE_TEST_2; //@ cross-chunk alias

export {
  u8n,
  isEnvOverridden,
  yt,
  Be,
  buildPlaywrightMcpServer,
  u0e,
  CLAUDE_TEST_APP_UP,
  IZ,
  CC_PLUGIN_CLAUDE_TEST,
  RELOAD_PLUGINS,
  freeze,
  CLAUDE_TEST_RUNNER,
  CLAUDE_TEST_2,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_CONDUCTOR,
  CLAUDE_TEST_AUTHOR,
  BROWSER,
  ht,
  expandSkillDirPlaceholders,
  buildHelperServerConfig,
  je,
  MCP_CLAUDE_TEST_WRITE,
  regExp_17,
};
