/**
 * plugins/bundled/claudeTest/constants.ts
 *
 * 2.1.316 新增：内置 claude-test 插件的名称、代理名与工具名常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (24), chunk-mhn0amzz.js (13)
 * attribution: placement 37
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { join, sep } from "path";
import { identity as identity_2 } from "../../../utils/identity.js";
import { pluginDataDirPath } from "../../../utils/plugins/pluginDirectories.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";
import { __export } from "../../../../runtime/bun-runtime.js";
import {
  SCRUBBED_APP_ENV_VARS,
  PROXY_ENV_NAMES,
  getTeammateEnvVarsToForward,
  isOutsideProject,
  loadInstalledFiles,
  filesFromUnsafeNodeOptions,
  isSafeNodeOptions,
  resolveTrustedNode,
  findUnsafeInheritedEnv,
  buildAppEnvironment,
  listProjectRoots,
} from "./nodeEnvironment.js";
import {
  CLAUDE_TEST_BACKGROUND,
  BLOCKED_STATES_2,
  CLAUDE_TEST_RELOAD_TIMEOUT_MS,
  browserHelperHooks,
  helperWatchStateSlot,
  notedRunsByHost,
  CLAUDE_TEST_AGENT_TYPES,
  LOCAL_RUN_DESCRIPTION,
  AGENTS_REREAD_CACHE_MS,
  HELPER_OFF_LOGIN_CHANGED_TEXT,
  HELPER_OFF_UNAVAILABLE_TEXT,
  hasAllTestAgents,
  completeSpecArgs,
  backgroundShellPolicy,
  createBrowserHelperController,
  parseSpecProposalEvent,
  isClaudeTestReloadOutstanding,
  isClaudeTestReloadPending,
  getActiveAgentDefinitions,
  ensureClaudeTestReloaded,
  createHelperWatchState,
  rememberRunFolder,
  rememberComposerMark,
  runFolderMap,
  composerSubmitMarker,
  countRunsFromUsageEvents,
  logHelperStart,
  parseRunResults,
  seatOwnAgents,
  isAbortableAndEnabled,
  consumeComposerMark,
} from "./browserHelper.js";
import { DRAFT_AGENT_DEFINITION, EXECUTE_AGENT_DEFINITION, RUN_SKILL_DEFINITION } from "./agents.js";
import {
  claudeTestGateApi,
  claudeTestGateStateSlot,
  NO_STORED_LOGIN,
  readClaudeTestGate,
  describeHelperState,
  IS_ON_WITH_FLAGS_OFF,
  createGateNoteState,
  cleanupOldClaudeTestFiles,
  readSignedInAccount,
  readFlagAccount,
} from "./consent.js";
import {
  NO_TESTS_TEXT,
  REPORT_MISSING_TEXT,
  INSTALL_NEEDED_TEXT,
  RUN_BLOCKED_TEXT,
  LOAD_MARK_PREFIX,
  REQUEST_NOT_RUN_TEXT,
  LOGIN_CHANGED_TEXT,
  CLI_ONLY_TEXT,
  ASK_IN_CHAT_TEXT,
  RELOAD_PART_MISSING_TEXT,
  BROWSER_UNAVAILABLE_TEXT,
  NOT_AVAILABLE_NOW_TEXT,
  HELPER_NOT_READY_TEXT,
  TESTS_FAILED_TEXT,
  DUPLICATE_HELPER_TOOLS_TEXT,
  AGENTS_JUST_LOADED_TEXT,
  AGENTS_STILL_LOADING_TEXT,
  AGENTS_NOT_LOADED_TEXT,
  AGENT_START_FAILED_TEXT,
  PANEL_OPEN_RULE,
  PANEL_OPEN_NO_PICTURES_RULE,
  PANE_TITLE,
  OPEN_REPORT_LABEL,
  CLAUDE_TEST_TITLE,
  RUN_STOPPED_TEXT,
  STILL_READYING_TEXT,
  START_HINT_TEXT,
  LOGIN_CHECK_FAILED_TEXT,
  describeHelperEnvIgnored,
  describeHelperFileMismatch,
  formatConflictingPluginText,
  tellPersonAndStop,
} from "./messages.js";
import { claudeTestState } from "./appFacts.js";
import {
  claudeTestMarkSlot,
  CLAUDE_TEST_3,
  pictureAskState,
  noteAppStartEnded,
  detectRunHalt,
  isClaudeTestAvailable,
  shouldShowFixing,
  isMoreTestsDeclined,
  isEarlyPhaseActive,
  isAppStartPending,
  isRunAcceptedPending,
  hasCiFlag,
  rememberRunHalt,
  claudeTestMarkState,
  noteStartAppAnswer,
  noteMoreTestsDeclinedByText,
  noteMoreTestsDeclined,
  noteRunConfirmed,
  noteAppDownWithStartAllowed,
  findClaudeTestRepository,
  registerClaudeTestCommand,
  noteAppProbeResult,
} from "./commandHook.js";
import {
  CLAUDE_TEST_SANDBOX_MARK,
  CLAUDE_TEST_LISTEN,
  CLAUDE_TEST_SKILLS,
  CLAUDE_TEST_USER_SETTINGS,
  registerClaudeTestPlugin,
  runDirFromCommand,
  describeNetworkReach,
  checkSandboxLocalBinding,
  createClaudeTestSkill,
  readSkillFrontmatter,
} from "./plugin.js";
import { findDifferingInstalledFile } from "./runFiles.js";
import { hasPluginSkill } from "../../../components/skills/SkillsMenu.js";
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEssentialTrafficOnly } from "../../../utils/privacyLevel.js";
import { getEnvCaseInsensitive } from "../../../utils/plugins/securityDefaultPlugin.js";
import { effectiveEnvSnapshot } from "../../../utils/settings/envSources.js";
import { isSettingsSourcedEnvValue } from "../../../utils/managedEnvApply.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:191342-191372 placement
/**
 * claude-test 内置插件的标识常量（claude-test@builtin），用于定位插件数据目录。
 */
var TEST_PLUGIN_ID = "claude-test@builtin";
//@ chunk-5xgkngpb.js:191372-191390 placement
/**
 * claude-test 内置插件的版本号常量（0.4.259），用于拼内容 id 与安装目录。
 */
var TEST_PLUGIN_VERSION = "0.4.259";
//@ chunk-5xgkngpb.js:191390-191437 placement
/**
 * 保存 claude-test 插件已加载的文本内容（含 name）；未加载时 name 为 undefined，installedRoot 依赖它。
 */
var testPluginTexts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:191390", () => {
  testPluginTexts = identity_2(
    {
      name: undefined,
    },
    (slot) => {
      slot.name = undefined;
    },
  );
});
//@ chunk-5xgkngpb.js:191437-191639 placement
/**
 * 由插件文本内容（按键排序、带长度前缀）计算 sha256，生成 claude-test 插件的内容 id。
 */
function testPluginContentId(texts) {
  let hash = createHash("sha256");
  for (let key of Object.keys(texts).sort()) {
    let value = texts[key] ?? "";
    hash.update(`${Buffer.byteLength(key)}:${key}${Buffer.byteLength(value)}:${value}`);
  }
  return `${TEST_PLUGIN_VERSION}-${hash.digest("hex").slice(0, 12)}`;
}
//@ chunk-5xgkngpb.js:191639-191846 placement
/**
 * claude-test 插件的安装根目录（插件数据目录下，用正斜杠）；文本未加载时抛错。
 */
function claudeTestInstalledRoot() {
  if (testPluginTexts.name === undefined)
    throw Error(
      "claude-test: installedRoot() was called before the plugin's texts were loaded. Await loadContent() first.",
    );
  return join(pluginDataDirPath(TEST_PLUGIN_ID), testPluginTexts.name).split(sep).join("/");
}
//@ chunk-5xgkngpb.js:191846-191895 placement
/**
 * 调用取安装根目录的函数并吞掉异常：根目录不可得时返回 undefined。
 */
function tryGetInstalledRoot(lookup = claudeTestInstalledRoot) {
  try {
    return lookup();
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:191895-191946 placement
var STOP_ON_EXIT_SCRIPT_SUFFIX = "/skills/run/scripts/stop-on-exit.mjs && ";
//@ chunk-5xgkngpb.js:191946-191989 placement
/**
 * 生成 claude-test 插件 run skill 的命令行：node <安装根目录>/skills/run/scripts/stop-on-exit.mjs && 。
 */
function buildRunSkillCommand() {
  return `node ${claudeTestInstalledRoot()}${STOP_ON_EXIT_SCRIPT_SUFFIX}`;
}
//@ chunk-5xgkngpb.js:191989-192068 placement
/**
 * 判断一条命令是否以本插件 run skill 的前缀开头（安装根目录不可得时为 false）。
 */
function isRunSkillCommand(command) {
  let installedRoot = tryGetInstalledRoot();
  return (
    installedRoot !== undefined && command.startsWith(`node ${installedRoot}${STOP_ON_EXIT_SCRIPT_SUFFIX}`)
  );
}
//@ chunk-5xgkngpb.js:4786326-4786355 placement
var CLAUDE_TEST_AUTHOR = "claude-test:author";
//@ chunk-5xgkngpb.js:4786355-4786387 placement
var CLAUDE_TEST_CONDUCTOR = "claude-test:conductor";
//@ chunk-5xgkngpb.js:4786387-4786418 placement
var CLAUDE_TEST_EXPLORER = "claude-test:explorer";
//@ chunk-5xgkngpb.js:4786418-4786436 placement
var BROWSER = "browser";
//@ chunk-5xgkngpb.js:4786436-4786458 placement
var CLAUDE_TEST = "claude-test";
//@ chunk-5xgkngpb.js:4786458-4786489 placement (2.1.88 match: addPluginScopeToLspServers, 0.71)
/**
 * 浏览器助手 MCP 服务器的名字 plugin:claude-test:browser，由助手名与 scope 拼成；另一种写法的工具名前缀见 HELPER_TOOL_PREFIX。
 */
var HELPER_SERVER_NAME = `plugin:${CLAUDE_TEST}:${BROWSER}`;
//@ chunk-5xgkngpb.js:4786489-4786527 placement
/**
 * 浏览器助手工具名的统一前缀。
 */
var HELPER_TOOL_PREFIX = `mcp__plugin_${CLAUDE_TEST}_${BROWSER}__`;
//@ chunk-5xgkngpb.js:4786527-4786556 placement
var CLAUDE_TEST_APP_UP = "claude_test_app_up";
//@ chunk-5xgkngpb.js:4786556-4786578 placement
var CLAUDE_TEST_2 = "claude-test";
//@ chunk-5xgkngpb.js:4786578-4786603 placement
var RELOAD_PLUGINS = "reload-plugins";
//@ chunk-5xgkngpb.js:4786603-4786632 placement
var CLAUDE_TEST_RUNNER = "claude-test:runner";
//@ chunk-5xgkngpb.js:4786632-4786690 placement
/**
 * claude_test_write 草稿文件名的正则片段（小写字母数字与连字符，最长 80 字符），拼成 ^…\.md$ 后用于校验草稿名。
 */
var CLAUDE_TEST_WRITE = "claude_test_write";
var DRAFT_NAME_RE = "[a-z0-9][a-z0-9-]{0,79}";
//@ chunk-5xgkngpb.js:4786690-4786721 placement
var CC_PLUGIN_CLAUDE_TEST = "cc-plugin-claude-test";
//@ chunk-5xgkngpb.js:4787103-4787167 placement
var MCP_CLAUDE_TEST_WRITE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_20;
deferInit("chunk-5xgkngpb.js:4787103", () => {
  MCP_CLAUDE_TEST_WRITE = "mcp-claude-test-write";
  regExp_20 = new RegExp(`^${DRAFT_NAME_RE}\\.md$`);
});
//@ chunk-5xgkngpb.js:4787167-4787230 placement
/**
 * 判断某次工具调用是否来自 claude-test 插件对 claude_test_write 的调用。
 */
function isClaudeTestWriteCall(name, pluginSource, name_2) {
  return (
    pluginSource === `${CC_PLUGIN_CLAUDE_TEST}@${BUILTIN}` &&
    name === HELPER_SERVER_NAME &&
    name_2 === CLAUDE_TEST_WRITE
  );
}
//@ chunk-mhn0amzz.js:25280-25290 placement
/**
 * 空对象默认导出
 */
var emptyExportsFirst = {};
//@ chunk-mhn0amzz.js:25290-28826 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mhn0amzz.js:25290", () => {
  __export(emptyExportsFirst, {
    ALWAYS_SET: () => SCRUBBED_APP_ENV_VARS,
    AUTHOR_AGENT_TYPE: () => CLAUDE_TEST_AUTHOR,
    BACKGROUND_FOR_SERVER_MARK: () => CLAUDE_TEST_BACKGROUND,
    BLOCKED_WORDS: () => BLOCKED_STATES_2,
    CONDUCTOR_AGENT_TYPE: () => CLAUDE_TEST_CONDUCTOR,
    DATA_PLUGIN_ID: () => TEST_PLUGIN_ID,
    DRAFT_LISTING: () => DRAFT_AGENT_DEFINITION,
    DRAFT_NAME_STEM: () => DRAFT_NAME_RE,
    EXECUTE_LISTING: () => EXECUTE_AGENT_DEFINITION,
    EXPLORER_AGENT_TYPE: () => CLAUDE_TEST_EXPLORER,
    FLAG_ANSWER: () => claudeTestGateApi,
    FLAG_ANSWER_NOTES: () => claudeTestGateStateSlot,
    HELPER_FAILED_TEXT: () => NO_TESTS_TEXT,
    HELPER_NOT_CONNECTED_TEXT: () => REPORT_MISSING_TEXT,
    HELPER_OFF_TEXT: () => INSTALL_NEEDED_TEXT,
    HELPER_REFUSED_TEXT: () => RUN_BLOCKED_TEXT,
    HELPER_SERVER_KEY: () => BROWSER,
    HELPER_SERVER_NAME: () => HELPER_SERVER_NAME,
    HELPER_START: () => helperServerState,
    HELPER_STATE: () => claudeTestState,
    HELPER_TOOL_PREFIX: () => HELPER_TOOL_PREFIX,
    HELPER_UP_TOOL: () => CLAUDE_TEST_APP_UP,
    LATE_LOADS: () => claudeTestMarkSlot,
    LATE_LOAD_WAIT_MS: () => CLAUDE_TEST_RELOAD_TIMEOUT_MS,
    LOAD_LINE_LEAD: () => LOAD_MARK_PREFIX,
    LOAD_SPENT_TEXT: () => REQUEST_NOT_RUN_TEXT,
    LOGIN_CHANGED_TEXT: () => LOGIN_CHANGED_TEXT,
    LOGIN_WATCH: () => browserHelperHooks,
    LOGIN_WATCH_NOTES: () => helperWatchStateSlot,
    MARKETPLACE_PLUGIN_NAME: () => CLAUDE_TEST_3,
    NAMESPACE_NAME: () => CLAUDE_TEST,
    NEEDS_TERMINAL_TEXT: () => CLI_ONLY_TEXT,
    NOTED_RUNS: () => notedRunsByHost,
    NOT_CARRIED_TEXT: () => ASK_IN_CHAT_TEXT,
    NOT_IN_CHARGE_TEXT: () => RELOAD_PART_MISSING_TEXT,
    NOT_LISTED_TEXT: () => BROWSER_UNAVAILABLE_TEXT,
    NOT_OFFERED_TEXT: () => NOT_AVAILABLE_NOW_TEXT,
    NOT_STARTED_YET_TEXT: () => HELPER_NOT_READY_TEXT,
    NO_STORED_LOGIN: () => NO_STORED_LOGIN,
    OTHER_NAME_TEXT: () => TESTS_FAILED_TEXT,
    OTHER_PLUGIN_TEXT: () => DUPLICATE_HELPER_TOOLS_TEXT,
    OWN_AGENTS_NEXT_TURN_TEXT: () => AGENTS_JUST_LOADED_TEXT,
    OWN_AGENTS_STILL_LOADING_TEXT: () => AGENTS_STILL_LOADING_TEXT,
    OWN_AGENTS_STILL_MISSING_TEXT: () => AGENTS_NOT_LOADED_TEXT,
    OWN_AGENT_NOT_LISTED_TEXT: () => AGENT_START_FAILED_TEXT,
    OWN_AGENT_TYPES: () => CLAUDE_TEST_AGENT_TYPES,
    OWN_FOLDER: () => testPluginTexts,
    PANE_ID: () => CLAUDE_TEST_2,
    PANE_OPEN_NOTE: () => PANEL_OPEN_RULE,
    PANE_OPEN_NO_PICTURES_NOTE: () => PANEL_OPEN_NO_PICTURES_RULE,
    PANE_PICTURE_ALT: () => PANE_TITLE,
    PANE_REPORT_LINK_TEXT: () => OPEN_REPORT_LABEL,
    PANE_TITLE: () => CLAUDE_TEST_TITLE,
    PERSONS_CHOICES: () => PROXY_ENV_NAMES,
    PLUGIN_DESCRIPTION: () => LOCAL_RUN_DESCRIPTION,
    PLUGIN_NAME: () => CC_PLUGIN_CLAUDE_TEST,
    PLUGIN_VERSION: () => TEST_PLUGIN_VERSION,
    PROBE: () => pictureAskState,
    RELOAD_COMMAND: () => RELOAD_PLUGINS,
    RUNNER_AGENT_TYPE: () => CLAUDE_TEST_RUNNER,
    RUN_LISTING: () => RUN_SKILL_DEFINITION,
    SANDBOX_FOR_SERVER_MARK: () => CLAUDE_TEST_SANDBOX_MARK,
    SANDBOX_LISTEN_MARK: () => CLAUDE_TEST_LISTEN,
    SEAT_WAIT_MS: () => AGENTS_REREAD_CACHE_MS,
    SKILLS: () => CLAUDE_TEST_SKILLS,
    SKILL_NAMES: () => SKILL_NAMES,
    STARTING_TEXT: () => RUN_STOPPED_TEXT,
    STILL_GETTING_READY_TEXT: () => STILL_READYING_TEXT,
    STOPPED_LOGIN_CHANGED_TEXT: () => HELPER_OFF_LOGIN_CHANGED_TEXT,
    STOPPED_NOT_OFFERED_TEXT: () => HELPER_OFF_UNAVAILABLE_TEXT,
    TYPE_IN_PROMPT_BOX_TEXT: () => START_HINT_TEXT,
    USER_SETTINGS_FILE_MARK: () => CLAUDE_TEST_USER_SETTINGS,
    WATCH_FAILED_TEXT: () => LOGIN_CHECK_FAILED_TEXT,
    WRITE_TOOL_NAME: () => CLAUDE_TEST_WRITE,
    areOwnAgentsListed: () => hasAllTestAgents,
    argumentCompletions: () => completeSpecArgs,
    backgroundForServer: () => backgroundShellPolicy,
    browserServer: () => buildHelperServerConfig,
    createFlagAnswer: () => readClaudeTestGate,
    createLoginWatch: () => createBrowserHelperController,
    default: () => emptyExportsFirst,
    draftEventOf: () => parseSpecProposalEvent,
    endAppStarting: () => noteAppStartEnded,
    filesReady: () => describeHelperState,
    haltOf: () => detectRunHalt,
    helperServer: () => buildPlaywrightMcpServer,
    ignoredChoices: () => getTeammateEnvVarsToForward,
    ignoredChoicesText: () => describeHelperEnvIgnored,
    installFiles: () => findDifferingInstalledFile,
    installedFolderName: () => testPluginContentId,
    installedRoot: () => claudeTestInstalledRoot,
    isAvailable: () => isClaudeTestAvailable,
    isFixEditOf: () => shouldShowFixing,
    isForeignValue: () => isEnvOverridden,
    isInProject: () => isOutsideProject,
    isLateLoadRunning: () => isClaudeTestReloadOutstanding,
    isLateLoadTried: () => isClaudeTestReloadPending,
    isMoreDeclinedOf: () => isMoreTestsDeclined,
    isOnByDefault: () => IS_ON_WITH_FLAGS_OFF,
    isOtherPluginListed: () => hasPluginSkill,
    isRunActive: () => isEarlyPhaseActive,
    isStartingAppOf: () => isAppStartPending,
    isStartingRunOf: () => isRunAcceptedPending,
    isStopOnExitStart: () => isRunSkillCommand,
    isTypedCi: () => hasCiFlag,
    keptHalt: () => rememberRunHalt,
    lateLoadState: () => claudeTestMarkState,
    listedInSession: () => getActiveAgentDefinitions,
    loadContent: () => loadInstalledFiles,
    loadLate: () => ensureClaudeTestReloaded,
    loadedFiles: () => filesFromUnsafeNodeOptions,
    loadsOnlyFullPaths: () => isSafeNodeOptions,
    newFlagAnswerNotes: () => createGateNoteState,
    newLoginWatchNotes: () => createHelperWatchState,
    nodeBinary: () => resolveTrustedNode,
    notStartedText: () => describeHelperFileMismatch,
    noteAppStarting: () => noteStartAppAnswer,
    noteMoreAskedInWords: () => noteMoreTestsDeclinedByText,
    noteMoreDeclined: () => noteMoreTestsDeclined,
    noteRun: () => rememberRunFolder,
    noteRunAccepted: () => noteRunConfirmed,
    noteStartAhead: () => noteAppDownWithStartAllowed,
    noteTyped: () => rememberComposerMark,
    notedRuns: () => runFolderMap,
    otherPluginFirstText: () => formatConflictingPluginText,
    otherPluginSource: () => findClaudeTestRepository,
    outsideProject: () => findUnsafeInheritedEnv,
    ownValues: () => buildAppEnvironment,
    portedInstalledFiles: () => portPortedFiles,
    portedNames: () => portedCommandNames,
    portedPaths: () => expandSkillDirPlaceholders,
    projectRoots: () => listProjectRoots,
    promptBoxMarkerOf: () => composerSubmitMarker,
    register: () => registerClaudeTestCommand,
    registerPlugin: () => registerClaudeTestPlugin,
    removeStaleVersions: () => cleanupOldClaudeTestFiles,
    reportRuns: () => countRunsFromUsageEvents,
    reportStart: () => logHelperStart,
    runEventOf: () => parseRunResults,
    runFolderOf: () => runDirFromCommand,
    sandboxForServer: () => describeNetworkReach,
    sandboxListen: () => checkSandboxLocalBinding,
    seatOwnAgents: () => seatOwnAgents,
    settleStartGuess: () => noteAppProbeResult,
    signedInLogin: () => readSignedInAccount,
    skillOf: () => createClaudeTestSkill,
    skillPartsOf: () => readSkillFrontmatter,
    stillWantedBy: () => isAbortableAndEnabled,
    stopOnExitStartPrefix: () => buildRunSkillCommand,
    takeTyped: () => consumeComposerMark,
    waitPrompt: () => tellPersonAndStop,
    wasFlagServiceToldStoredLogin: () => readFlagAccount,
  });
});
//@ chunk-mhn0amzz.js:28826-28836 placement
/**
 * 空对象默认导出
 */
var emptyExportsSecond = {};
//@ chunk-mhn0amzz.js:28836-30377 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mhn0amzz.js:28836", () => {
  __export(emptyExportsSecond, {
    AUTHOR_AGENT_TYPE: () => CLAUDE_TEST_AUTHOR,
    CONDUCTOR_AGENT_TYPE: () => CLAUDE_TEST_CONDUCTOR,
    DRAFT_NAME_STEM: () => DRAFT_NAME_RE,
    EXPLORER_AGENT_TYPE: () => CLAUDE_TEST_EXPLORER,
    HELPER_FAILED_TEXT: () => NO_TESTS_TEXT,
    HELPER_NOT_CONNECTED_TEXT: () => REPORT_MISSING_TEXT,
    HELPER_OFF_TEXT: () => INSTALL_NEEDED_TEXT,
    HELPER_REFUSED_TEXT: () => RUN_BLOCKED_TEXT,
    HELPER_SERVER_KEY: () => BROWSER,
    HELPER_SERVER_NAME: () => HELPER_SERVER_NAME,
    HELPER_STATE: () => claudeTestState,
    HELPER_TOOL_PREFIX: () => HELPER_TOOL_PREFIX,
    HELPER_UP_TOOL: () => CLAUDE_TEST_APP_UP,
    LOAD_LINE_LEAD: () => LOAD_MARK_PREFIX,
    LOAD_SPENT_TEXT: () => REQUEST_NOT_RUN_TEXT,
    LOGIN_CHANGED_TEXT: () => LOGIN_CHANGED_TEXT,
    NEEDS_TERMINAL_TEXT: () => CLI_ONLY_TEXT,
    NOT_CARRIED_TEXT: () => ASK_IN_CHAT_TEXT,
    NOT_IN_CHARGE_TEXT: () => RELOAD_PART_MISSING_TEXT,
    NOT_LISTED_TEXT: () => BROWSER_UNAVAILABLE_TEXT,
    NOT_OFFERED_TEXT: () => NOT_AVAILABLE_NOW_TEXT,
    NOT_STARTED_YET_TEXT: () => HELPER_NOT_READY_TEXT,
    OTHER_NAME_TEXT: () => TESTS_FAILED_TEXT,
    OTHER_PLUGIN_TEXT: () => DUPLICATE_HELPER_TOOLS_TEXT,
    OWN_AGENTS_NEXT_TURN_TEXT: () => AGENTS_JUST_LOADED_TEXT,
    OWN_AGENTS_STILL_LOADING_TEXT: () => AGENTS_STILL_LOADING_TEXT,
    OWN_AGENTS_STILL_MISSING_TEXT: () => AGENTS_NOT_LOADED_TEXT,
    OWN_AGENT_NOT_LISTED_TEXT: () => AGENT_START_FAILED_TEXT,
    PANE_ID: () => CLAUDE_TEST_2,
    PANE_OPEN_NOTE: () => PANEL_OPEN_RULE,
    PANE_OPEN_NO_PICTURES_NOTE: () => PANEL_OPEN_NO_PICTURES_RULE,
    PANE_PICTURE_ALT: () => PANE_TITLE,
    PANE_REPORT_LINK_TEXT: () => OPEN_REPORT_LABEL,
    PANE_TITLE: () => CLAUDE_TEST_TITLE,
    PROBE: () => pictureAskState,
    RELOAD_COMMAND: () => RELOAD_PLUGINS,
    RUNNER_AGENT_TYPE: () => CLAUDE_TEST_RUNNER,
    STARTING_TEXT: () => RUN_STOPPED_TEXT,
    STILL_GETTING_READY_TEXT: () => STILL_READYING_TEXT,
    TYPE_IN_PROMPT_BOX_TEXT: () => START_HINT_TEXT,
    WATCH_FAILED_TEXT: () => LOGIN_CHECK_FAILED_TEXT,
    WRITE_TOOL_NAME: () => CLAUDE_TEST_WRITE,
    default: () => emptyExportsSecond,
    endAppStarting: () => noteAppStartEnded,
    haltOf: () => detectRunHalt,
    ignoredChoicesText: () => describeHelperEnvIgnored,
    isFixEditOf: () => shouldShowFixing,
    isMoreDeclinedOf: () => isMoreTestsDeclined,
    isRunActive: () => isEarlyPhaseActive,
    isStartingAppOf: () => isAppStartPending,
    isStartingRunOf: () => isRunAcceptedPending,
    isTypedCi: () => hasCiFlag,
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
    waitPrompt: () => tellPersonAndStop,
  });
});
//@ chunk-mhn0amzz.js:30377-30459 placement
/**
 * 助手服务器状态（server/toldIgnored）
 */
var helperServerState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mhn0amzz.js:30377", () => {
  helperServerState = identity_2(
    {
      server: undefined,
      toldIgnored: "",
    },
    (state) => {
      state.server = undefined;
      state.toldIgnored = "";
    },
  );
});
//@ chunk-mhn0amzz.js:30459-30630 placement
/**
 * 生成浏览器助手 MCP 服务器配置，按需追加 --preview/--pane 参数。
 */
function buildHelperServerConfig(preview, pane = false) {
  let { server } = helperServerState;
  if (server === undefined) return {};
  let extraArgs = [...(preview ? ["--preview"] : []), ...(pane ? ["--pane"] : [])];
  return {
    [BROWSER]:
      extraArgs.length === 0
        ? server
        : {
            ...server,
            args: [...(server.args ?? []), ...extraArgs],
          },
  };
}
//@ chunk-mhn0amzz.js:30630-30728 placement
var SKILL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mhn0amzz.js:30630", () => {
  SKILL_NAMES = Object.freeze({
    run: "claude-test",
    execute: "claude-test-execute",
    draft: "claude-test-draft",
  });
});
//@ chunk-mhn0amzz.js:30728-30811 placement
/**
 * 把文本里的 claude-test:run/execute/draft 替换为已冻结的命令名。
 */
function portedCommandNames(text) {
  return text.replace(/claude-test:(run|execute|draft)\b/g, (match, commandName) => SKILL_NAMES[commandName]);
}
//@ chunk-mhn0amzz.js:30811-30892 placement
/**
 * 对以 .md/.mjs 结尾的文件值做命令名替换（其他原样）。
 */
function portPortedFiles(files) {
  return import_mapValues(files, (content, fileName) =>
    fileName.endsWith(".md") || fileName.endsWith(".mjs") ? portedCommandNames(content) : content,
  );
}
//@ chunk-mhn0amzz.js:30892-31037 placement
function expandSkillDirPlaceholders(text, skillDir) {
  return text
    .replaceAll("${CLAUDE_SKILL_DIR}/../run", () => `${skillDir}/skills/run`)
    .replaceAll("${CLAUDE_SKILL_DIR}", () => `${skillDir}/skills/run`);
}
//@ chunk-mhn0amzz.js:31037-31125 placement (2.1.88 match: getEssentialTrafficOnlyReason, 0.775)
function getEssentialTrafficOnlyReason() {
  return (
    isEssentialTrafficOnly() ||
    Boolean(getEnvCaseInsensitive(effectiveEnvSnapshot(), "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"))
  );
}
//@ chunk-mhn0amzz.js:31125-31320 placement
/**
 * 生成运行 skills/run/scripts/playwright-mcp.mjs 的 MCP 服务器条目（带项目目录与精简流量开关）。
 */
function buildPlaywrightMcpServer(command, unsafeInheritedEnv) {
  return {
    command,
    args: [`${claudeTestInstalledRoot()}/skills/run/scripts/playwright-mcp.mjs`],
    env: {
      ...unsafeInheritedEnv,
      CLAUDE_TEST_PROJECT_DIR: "${CLAUDE_PROJECT_DIR}",
      ...(getEssentialTrafficOnlyReason() && {
        CLAUDE_TEST_ESSENTIAL_TRAFFIC: "1",
      }),
    },
  };
}
//@ chunk-mhn0amzz.js:31320-31379 placement
/**
 * 环境变量值是否与基线不同（需要显式透传）。
 */
function isEnvOverridden(name, value, env) {
  return (
    value !== undefined &&
    value !== getEnvCaseInsensitive(env, name) &&
    isSettingsSourcedEnvValue(name, value)
  );
}
export {
  isClaudeTestWriteCall,
  MCP_CLAUDE_TEST_WRITE,
  regExp_20,
  isRunSkillCommand,
  isEnvOverridden,
  testPluginTexts,
  testPluginContentId,
  portPortedFiles,
  helperServerState,
  claudeTestInstalledRoot,
  TEST_PLUGIN_ID,
  buildPlaywrightMcpServer,
  HELPER_TOOL_PREFIX,
  CLAUDE_TEST_APP_UP,
  HELPER_SERVER_NAME,
  CC_PLUGIN_CLAUDE_TEST,
  RELOAD_PLUGINS,
  SKILL_NAMES,
  CLAUDE_TEST_RUNNER,
  CLAUDE_TEST_2,
  CLAUDE_TEST_EXPLORER,
  CLAUDE_TEST_CONDUCTOR,
  CLAUDE_TEST_AUTHOR,
  BROWSER,
  portedCommandNames,
  expandSkillDirPlaceholders,
  TEST_PLUGIN_VERSION,
  buildHelperServerConfig,
  emptyExportsSecond,
  DRAFT_NAME_RE,
  CLAUDE_TEST,
  CLAUDE_TEST_WRITE,
  emptyExportsFirst,
  buildRunSkillCommand,
};
