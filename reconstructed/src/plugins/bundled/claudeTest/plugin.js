/**
 * plugins/bundled/claudeTest/plugin.ts
 *
 * 2.1.316 新增：Claude Test 内置插件的命令/skill 定义与注册
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (12)
 * attribution: placement 12
 */
import { randomUUID } from "crypto";
import {
  RUN_DIR_COMMAND_RE,
  RUN_SKILL_DEFINITION,
  EXECUTE_AGENT_DEFINITION,
  DRAFT_AGENT_DEFINITION,
} from "./agents.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../../../utils/platform.js";
import { isSettingSourceEnabled } from "../../../utils/settings/constants.js";
import { loadInstalledFiles } from "./nodeEnvironment.js";
import {
  claudeTestInstalledRoot,
  TEST_PLUGIN_ID,
  TEST_PLUGIN_VERSION,
} from "../../../services/pluginTest/claudeTestPlugin.js";
import { parseFrontmatter } from "../../../utils/frontmatterParser.js";
import {
  portedCommandNames,
  expandSkillDirPlaceholders,
  $e,
  CLAUDE_TEST_RUNNER,
  CC_PLUGIN_CLAUDE_TEST,
  buildHelperServerConfig,
  emptyExportsSecond,
} from "./constants.js";
import {
  rememberComposerMark,
  hasAllTestAgents,
  getActiveAgentDefinitions,
  consumeComposerMark,
  ensureClaudeTestReloaded,
  rememberRunFolder,
  backgroundShellPolicy,
  CLAUDE_TEST_BACKGROUND,
  isAbortableAndEnabled,
  isClaudeTestReloadOutstanding,
  isClaudeTestReloadPending,
  completeSpecArgs,
  logHelperStart,
  countRunsFromUsageEvents,
  browserHelperHooks,
  seatOwnAgents,
  LOCAL_RUN_DESCRIPTION,
} from "./browserHelper.js";
import { claudeTestState } from "./appFacts.js";
import {
  tellPersonAndStop,
  AGENTS_JUST_LOADED_TEXT,
  AGENTS_STILL_LOADING_TEXT,
  AGENTS_NOT_LOADED_TEXT,
  LOAD_MARK_PREFIX,
  formatConflictingPluginText,
  CLI_ONLY_TEXT,
  STILL_READYING_TEXT,
  RELOAD_PART_MISSING_TEXT,
  START_HINT_TEXT,
  HELPER_NOT_READY_TEXT,
  LOGIN_CHANGED_TEXT,
  NOT_AVAILABLE_NOW_TEXT,
  LOGIN_CHECK_FAILED_TEXT,
  AGENT_START_FAILED_TEXT,
} from "./messages.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { getSettingsFilePathForSource } from "../../../utils/settings/settings.js";
import { substituteArguments } from "../../../utils/argumentSubstitution.js";
import { escapeShellBangs } from "../../../utils/promptShellExecution.js";
import { findClaudeTestRepository, isClaudeTestAvailable } from "./commandHook.js";
import { hasPluginSkill } from "../../../components/skills/SkillsMenu.js";
import { describeHelperState } from "./consent.js";
import {
  isFlagOnWithInternalOverride,
  TENGU_VELVET_HARROW,
  TENGU_AMBER_QUILLWORT,
} from "../../../services/analytics/flagOverrides.js";
import { supportsHyperlinks } from "../../../ink/supports-hyperlinks.js";
import { writeLiveReport, writeInstallProgress, isMadeHereMarker } from "./runFiles.js";
import { pluginDataDirPath } from "../../../utils/plugins/pluginDirectories.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";
import { getSessionId, getIsInteractive } from "../../../bootstrap/state.js";
import { CLAUDE_TEST_HOOK_SCAN } from "./hookScan.js";

//@ chunk-ae5g0zb5.js:124247-124285 placement
/**
 * 从命令文本取运行目录
 */
function runDirFromCommand(e) {
  return RUN_DIR_COMMAND_RE.exec(e)?.[1];
}
//@ chunk-ae5g0zb5.js:124285-124378 placement
/**
 * 在 skill 与钩子文本里替换成运行期值的三个占位标记：沙箱目录、用户设置文件、监听端口。
 */
var CLAUDE_TEST_SANDBOX_MARK = "${CLAUDE_TEST_SANDBOX}";
var CLAUDE_TEST_USER_SETTINGS = "${CLAUDE_TEST_USER_SETTINGS}";
var CLAUDE_TEST_LISTEN = "${CLAUDE_TEST_LISTEN}";
//@ chunk-ae5g0zb5.js:124378-124742 placement
function describeNetworkReach() {
  if (!SandboxManager.isSandboxingEnabled()) return "off";
  if (SandboxManager.areUnsandboxedCommandsAllowed()) return "may-leave";
  if (Object.keys(SandboxManager.getNetworkRestrictionConfig()).length === 0) return "stays-reachable";
  if (getPlatform() !== "macos") return "stays-unreachable";
  if (SandboxManager.getAllowLocalBinding() === true) return "stays-reachable";
  return isSettingSourceEnabled("userSettings") ? "stays-no-listen" : "stays-no-listen-fixed";
}
//@ chunk-ae5g0zb5.js:124742-124958 placement
/**
 * macOS 沙箱启用网络限制且不允许本地绑定时返回 refused（用户设置不可改时 refused-fixed），否则 allowed。
 */
function checkSandboxLocalBinding() {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    getPlatform() !== "macos" ||
    Object.keys(SandboxManager.getNetworkRestrictionConfig()).length === 0 ||
    SandboxManager.getAllowLocalBinding() === true
  )
    return "allowed";
  return isSettingSourceEnabled("userSettings") ? "refused" : "refused-fixed";
}
//@ chunk-ae5g0zb5.js:124995-125293 placement
async function readSkillFrontmatter(e) {
  let { SKILL_MD } = await loadInstalledFiles();
  let r = claudeTestInstalledRoot();
  let { frontmatter, content } = parseFrontmatter(
    portedCommandNames(SKILL_MD[e]).replace(
      /\r\n/g,
      `
`,
    ),
  );
  let a = frontmatter["allowed-tools"];
  return {
    allowedTools: (Array.isArray(a) ? a : [])
      .filter((i) => typeof i === "string")
      .map((i) => expandSkillDirPlaceholders(i, r)),
    body:
      `Base directory for this skill: ${r}/skills/run

` + content.trim(),
  };
}
//@ chunk-ae5g0zb5.js:125293-126799 placement
/**
 * 创建 Claude Test 的 skill 命令对象（工具白名单、提示词生成、用户参数）。
 */
function createClaudeTestSkill(e, n) {
  return {
    ...n,
    name: $e[e],
    requires: {
      workspace: true,
    },
    ...(e === "run" && {
      onUserTypedArgs: rememberComposerMark,
    }),
    getAllowedTools: async () =>
      describeUnavailableReason(e, false, []) === undefined &&
      (e !== "run" ||
        claudeTestState.seatOwnAgents === undefined ||
        hasAllTestAgents(getActiveAgentDefinitions()))
        ? (await readSkillFrontmatter(e)).allowedTools
        : [],
    async getPromptForCommand(r, o) {
      let s = e === "run" && consumeComposerMark(r, o);
      let agentsCheckedFor = e === "run" ? claudeTestState.agentsCheckedFor : undefined;
      if (e === "run") claudeTestState.agentsCheckedFor = undefined;
      if (s) claudeTestState.typedArgs = r;
      let i = s && !claudeTestState.isModuleLoaded ? await ensureClaudeTestReloaded(o) : undefined;
      let c = describeUnavailableReason(
        e,
        o.options.isNonInteractiveSession,
        o.options.commands,
        i,
        n.agent === undefined ||
          o.options.agentDefinitions.activeAgents.some((activeAgent) => activeAgent.agentType === n.agent),
      );
      if (c !== undefined)
        return [
          {
            type: "text",
            text: tellPersonAndStop(c),
          },
        ];
      let _ =
        e === "run"
          ? await checkOwnAgentsSeated(
              o.options.agentDefinitions.activeAgents,
              s ||
                (agentsCheckedFor !== undefined &&
                  agentsCheckedFor.args === r &&
                  Date.now() - agentsCheckedFor.at <= LOAD_MARK_TTL_MS),
            )
          : undefined;
      if (_ !== undefined)
        return [
          {
            type: "text",
            text: tellPersonAndStop(_),
          },
        ];
      if (e === "execute" && o.options.isSkillPreload !== true) {
        let O = runDirFromCommand(r);
        if (O !== undefined) rememberRunFolder(O);
      }
      let S = "may-leave";
      let w = "allowed";
      let f = "none";
      let b = "~/.claude/settings.json";
      if (e === "run") {
        try {
          S = describeNetworkReach();
          w = checkSandboxLocalBinding();
        } catch (error) {
          logForDebugging(`claude-test: sandbox not read for the run skill: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        try {
          f = backgroundShellPolicy(o);
        } catch (error) {
          logForDebugging(
            `claude-test: background commands not read for the run skill: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
        try {
          b = getSettingsFilePathForSource("userSettings") ?? b;
        } catch (error) {
          logForDebugging(
            `claude-test: user settings path not read for the run skill: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      }
      let { body } = await readSkillFrontmatter(e);
      let F = expandSkillDirPlaceholders(
        substituteArguments(
          e === "run"
            ? body
                .replaceAll(CLAUDE_TEST_SANDBOX_MARK, S)
                .replaceAll(CLAUDE_TEST_LISTEN, w)
                .replaceAll(CLAUDE_TEST_BACKGROUND, f)
                .replaceAll(CLAUDE_TEST_USER_SETTINGS, () => b)
            : body,
          r,
          true,
          [],
          escapeShellBangs,
        ),
        claudeTestInstalledRoot(),
      );
      return [
        {
          type: "text",
          text: e === "run" ? issueLoadMark(F, i === "loaded" ? isAbortableAndEnabled(o) : undefined) : F,
        },
      ];
    },
  };
}
//@ chunk-ae5g0zb5.js:126799-126992 placement
/**
 * 检查 Claude Test 自带 agent 是否已加载，返回对应提示。
 */
async function checkOwnAgentsSeated(activeAgents, n) {
  let seatOwnAgents = claudeTestState.seatOwnAgents;
  if (seatOwnAgents === undefined) return;
  let o = hasAllTestAgents(activeAgents);
  if (!n && o) return;
  switch (await seatOwnAgents()) {
    case "listed":
      return n ? undefined : AGENTS_JUST_LOADED_TEXT;
    case "reading":
      return AGENTS_STILL_LOADING_TEXT;
    case "missing":
      return AGENTS_NOT_LOADED_TEXT;
  }
}
//@ chunk-ae5g0zb5.js:126992-127011 placement
/**
 * 60000
 */
var LOAD_MARK_TTL_MS = 60000;
var MAX_LOAD_MARKS = 16;
//@ chunk-ae5g0zb5.js:127011-127298 placement
/**
 * 生成加载标记（UUID）并登记，返回带标记前缀的提示词；只保留最近若干个。
 */
function issueLoadMark(e, n) {
  let { loads } = claudeTestState;
  let o = randomUUID();
  for (let [s, a] of loads)
    if (a.isTyped)
      loads.set(s, {
        issuedAt: a.issuedAt,
        isTyped: false,
      });
  loads.set(
    o,
    n === undefined
      ? {
          issuedAt: Date.now(),
          isTyped: false,
        }
      : {
          issuedAt: Date.now(),
          isTyped: true,
          mayStillStart: n,
        },
  );
  for (let key of [...loads.keys()].slice(0, -MAX_LOAD_MARKS)) loads.delete(key);
  return `${LOAD_MARK_PREFIX}${o}
${e}`;
}
//@ chunk-ae5g0zb5.js:127298-127679 placement
function describeUnavailableReason(e, n, r, o, s = true) {
  if (!claudeTestState.isModuleLoaded) {
    let claudeTestRepository = findClaudeTestRepository(r);
    if (claudeTestRepository !== undefined) return formatConflictingPluginText(claudeTestRepository);
    if (n) return CLI_ONLY_TEXT;
    if (o === "slow" || (o === undefined && isClaudeTestReloadOutstanding())) return STILL_READYING_TEXT;
    return o !== undefined || isClaudeTestReloadPending() || hasPluginSkill(r)
      ? RELOAD_PART_MISSING_TEXT
      : START_HINT_TEXT;
  }
  if (e === "run") return;
  if (n) return CLI_ONLY_TEXT;
  if (!claudeTestState.hasStartedServer) return HELPER_NOT_READY_TEXT;
  switch (claudeTestState.mayRun?.()) {
    case "yes":
      break;
    case "login_changed":
      return LOGIN_CHANGED_TEXT;
    case "not_offered":
      return NOT_AVAILABLE_NOW_TEXT;
    default:
      return LOGIN_CHECK_FAILED_TEXT;
  }
  return s ? undefined : AGENT_START_FAILED_TEXT;
}
//@ chunk-ae5g0zb5.js:127679-127892 placement
/**
 * Claude Test 的三个技能：run（用户可调用）、execute 与 draft（fork 到内部 agent）。
 */
var CLAUDE_TEST_SKILLS = [
  createClaudeTestSkill("run", {
    ...RUN_SKILL_DEFINITION,
    userInvocable: true,
    getArgumentCompletions: completeSpecArgs,
  }),
  createClaudeTestSkill("execute", {
    ...EXECUTE_AGENT_DEFINITION,
    userInvocable: false,
    context: "fork",
    agent: CLAUDE_TEST_RUNNER,
  }),
  createClaudeTestSkill("draft", {
    ...DRAFT_AGENT_DEFINITION,
    userInvocable: false,
    context: "fork",
    agent: "claude-test:author",
  }),
];
//@ chunk-ae5g0zb5.js:127892-128550 placement
/**
 * 把运行状态、报告、登录监视等挂到共享状态并注册内置插件。
 */
function registerClaudeTestPlugin() {
  claudeTestState.filesReady = describeHelperState;
  claudeTestState.report = logHelperStart;
  claudeTestState.reportRuns = countRunsFromUsageEvents;
  claudeTestState.mayRun = browserHelperHooks.mayRun;
  claudeTestState.watchLogin = browserHelperHooks.start;
  claudeTestState.takeOut = browserHelperHooks.takeOut;
  claudeTestState.isPaneOn = () => isFlagOnWithInternalOverride(TENGU_VELVET_HARROW);
  claudeTestState.seatOwnAgents = () => seatOwnAgents();
  claudeTestState.reportHref = async (e, n) =>
    supportsHyperlinks() ? writeLiveReport(pluginDataDirPath(TEST_PLUGIN_ID), e, n) : undefined;
  claudeTestState.installNoteText = () => writeInstallProgress(pluginDataDirPath(TEST_PLUGIN_ID));
  claudeTestState.isMadeHere = (e) => isMadeHereMarker(pluginDataDirPath(TEST_PLUGIN_ID), e);
  registerBuiltinPlugin({
    name: CC_PLUGIN_CLAUDE_TEST,
    description: LOCAL_RUN_DESCRIPTION,
    version: TEST_PLUGIN_VERSION,
    isAvailable: isClaudeTestAvailable,
    skills: CLAUDE_TEST_SKILLS,
    get mcpServers() {
      if (!claudeTestState.wantedSessions.has(getSessionId())) return;
      let e = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT);
      claudeTestState.consentPreview = (claudeTestState.consentPreview ?? e) && e;
      let n = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_VELVET_HARROW);
      claudeTestState.panePreview = (claudeTestState.panePreview ?? n) && n;
      return buildHelperServerConfig(claudeTestState.consentPreview, claudeTestState.panePreview);
    },
    mayConnectMcpServer: browserHelperHooks.mayConnectMcpServer,
    hooksModule: builtinHooksModuleRef(import.meta.dir, emptyExportsSecond, () => CLAUDE_TEST_HOOK_SCAN()),
  });
}
export {
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
};
