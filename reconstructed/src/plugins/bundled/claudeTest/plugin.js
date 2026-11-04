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
  portedCommandNames,
  expandSkillDirPlaceholders,
  SKILL_NAMES,
  CLAUDE_TEST_RUNNER,
  TEST_PLUGIN_ID,
  CC_PLUGIN_CLAUDE_TEST,
  TEST_PLUGIN_VERSION,
  buildHelperServerConfig,
  emptyExportsSecond,
} from "./constants.js";
import { parseFrontmatter } from "../../../utils/frontmatterParser.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-ae5g0zb5.js:124247-124285 placement
/**
 * 从命令文本取运行目录
 */
function runDirFromCommand(command) {
  return RUN_DIR_COMMAND_RE.exec(command)?.[1];
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
async function readSkillFrontmatter(skillName) {
  let { SKILL_MD } = await loadInstalledFiles();
  let skillDir = claudeTestInstalledRoot();
  let { frontmatter, content } = parseFrontmatter(
    portedCommandNames(SKILL_MD[skillName]).replace(
      /\r\n/g,
      `
`,
    ),
  );
  let allowedToolsValue = frontmatter["allowed-tools"];
  return {
    allowedTools: (Array.isArray(allowedToolsValue) ? allowedToolsValue : [])
      .filter((tool) => typeof tool === "string")
      .map((tool) => expandSkillDirPlaceholders(tool, skillDir)),
    body:
      `Base directory for this skill: ${skillDir}/skills/run

` + content.trim(),
  };
}
//@ chunk-ae5g0zb5.js:125293-126799 placement
/**
 * 创建 Claude Test 的 skill 命令对象（工具白名单、提示词生成、用户参数）。
 */
function createClaudeTestSkill(skillName, skill) {
  return {
    ...skill,
    name: SKILL_NAMES[skillName],
    requires: {
      workspace: true,
    },
    ...(skillName === "run" && {
      onUserTypedArgs: rememberComposerMark,
    }),
    getAllowedTools: async () =>
      describeUnavailableReason(skillName, false, []) === undefined &&
      (skillName !== "run" ||
        claudeTestState.seatOwnAgents === undefined ||
        hasAllTestAgents(getActiveAgentDefinitions()))
        ? (await readSkillFrontmatter(skillName)).allowedTools
        : [],
    async getPromptForCommand(args, context) {
      let isComposerSubmit = skillName === "run" && consumeComposerMark(args, context);
      let agentsCheckedFor = skillName === "run" ? claudeTestState.agentsCheckedFor : undefined;
      if (skillName === "run") claudeTestState.agentsCheckedFor = undefined;
      if (isComposerSubmit) claudeTestState.typedArgs = args;
      let reloadOutcome =
        isComposerSubmit && !claudeTestState.isModuleLoaded
          ? await ensureClaudeTestReloaded(context)
          : undefined;
      let unavailableReason = describeUnavailableReason(
        skillName,
        context.options.isNonInteractiveSession,
        context.options.commands,
        reloadOutcome,
        skill.agent === undefined ||
          context.options.agentDefinitions.activeAgents.some(
            (activeAgent) => activeAgent.agentType === skill.agent,
          ),
      );
      if (unavailableReason !== undefined)
        return [
          {
            type: "text",
            text: tellPersonAndStop(unavailableReason),
          },
        ];
      let seatMessage =
        skillName === "run"
          ? await checkOwnAgentsSeated(
              context.options.agentDefinitions.activeAgents,
              isComposerSubmit ||
                (agentsCheckedFor !== undefined &&
                  agentsCheckedFor.args === args &&
                  Date.now() - agentsCheckedFor.at <= LOAD_MARK_TTL_MS),
            )
          : undefined;
      if (seatMessage !== undefined)
        return [
          {
            type: "text",
            text: tellPersonAndStop(seatMessage),
          },
        ];
      if (skillName === "execute" && context.options.isSkillPreload !== true) {
        let runDir = runDirFromCommand(args);
        if (runDir !== undefined) rememberRunFolder(runDir);
      }
      let networkReach = "may-leave";
      let localBinding = "allowed";
      let backgroundPolicy = "none";
      let settingsPath = "~/.claude/settings.json";
      if (skillName === "run") {
        try {
          networkReach = describeNetworkReach();
          localBinding = checkSandboxLocalBinding();
        } catch (error) {
          logForDebugging(`claude-test: sandbox not read for the run skill: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        try {
          backgroundPolicy = backgroundShellPolicy(context);
        } catch (error) {
          logForDebugging(
            `claude-test: background commands not read for the run skill: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
        try {
          settingsPath = getSettingsFilePathForSource("userSettings") ?? settingsPath;
        } catch (error) {
          logForDebugging(
            `claude-test: user settings path not read for the run skill: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      }
      let { body } = await readSkillFrontmatter(skillName);
      let prompt = expandSkillDirPlaceholders(
        substituteArguments(
          skillName === "run"
            ? body
                .replaceAll(CLAUDE_TEST_SANDBOX_MARK, networkReach)
                .replaceAll(CLAUDE_TEST_LISTEN, localBinding)
                .replaceAll(CLAUDE_TEST_BACKGROUND, backgroundPolicy)
                .replaceAll(CLAUDE_TEST_USER_SETTINGS, () => settingsPath)
            : body,
          args,
          true,
          [],
          escapeShellBangs,
        ),
        claudeTestInstalledRoot(),
      );
      return [
        {
          type: "text",
          text:
            skillName === "run"
              ? issueLoadMark(prompt, reloadOutcome === "loaded" ? isAbortableAndEnabled(context) : undefined)
              : prompt,
        },
      ];
    },
  };
}
//@ chunk-ae5g0zb5.js:126799-126992 placement
/**
 * 检查 Claude Test 自带 agent 是否已加载，返回对应提示。
 */
async function checkOwnAgentsSeated(activeAgents, agentsJustLoaded) {
  let seatOwnAgents = claudeTestState.seatOwnAgents;
  if (seatOwnAgents === undefined) return;
  let hasAll = hasAllTestAgents(activeAgents);
  if (!agentsJustLoaded && hasAll) return;
  switch (await seatOwnAgents()) {
    case "listed":
      return agentsJustLoaded ? undefined : AGENTS_JUST_LOADED_TEXT;
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
function issueLoadMark(promptText, mayStillStart) {
  let { loads } = claudeTestState;
  let markId = randomUUID();
  for (let [id, mark] of loads)
    if (mark.isTyped)
      loads.set(id, {
        issuedAt: mark.issuedAt,
        isTyped: false,
      });
  loads.set(
    markId,
    mayStillStart === undefined
      ? {
          issuedAt: Date.now(),
          isTyped: false,
        }
      : {
          issuedAt: Date.now(),
          isTyped: true,
          mayStillStart,
        },
  );
  for (let key of [...loads.keys()].slice(0, -MAX_LOAD_MARKS)) loads.delete(key);
  return `${LOAD_MARK_PREFIX}${markId}
${promptText}`;
}
//@ chunk-ae5g0zb5.js:127298-127679 placement
function describeUnavailableReason(skillName, isNonInteractive, commands, reloadOutcome, agentsReady = true) {
  if (!claudeTestState.isModuleLoaded) {
    let claudeTestRepository = findClaudeTestRepository(commands);
    if (claudeTestRepository !== undefined) return formatConflictingPluginText(claudeTestRepository);
    if (isNonInteractive) return CLI_ONLY_TEXT;
    if (reloadOutcome === "slow" || (reloadOutcome === undefined && isClaudeTestReloadOutstanding()))
      return STILL_READYING_TEXT;
    return reloadOutcome !== undefined || isClaudeTestReloadPending() || hasPluginSkill(commands)
      ? RELOAD_PART_MISSING_TEXT
      : START_HINT_TEXT;
  }
  if (skillName === "run") return;
  if (isNonInteractive) return CLI_ONLY_TEXT;
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
  return agentsReady ? undefined : AGENT_START_FAILED_TEXT;
}
//@ chunk-ae5g0zb5.js:127679-127892 placement
/**
 * Claude Test 的三个技能：run（用户可调用）、execute 与 draft（fork 到内部 agent）。
 */
var CLAUDE_TEST_SKILLS; // deferred: uses createClaudeTestSkill of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ae5g0zb5.js:127679", () => {
  CLAUDE_TEST_SKILLS = [
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
});
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
  claudeTestState.reportHref = async (dir, runId) =>
    supportsHyperlinks() ? writeLiveReport(pluginDataDirPath(TEST_PLUGIN_ID), dir, runId) : undefined;
  claudeTestState.installNoteText = () => writeInstallProgress(pluginDataDirPath(TEST_PLUGIN_ID));
  claudeTestState.isMadeHere = (marker) => isMadeHereMarker(pluginDataDirPath(TEST_PLUGIN_ID), marker);
  registerBuiltinPlugin({
    name: CC_PLUGIN_CLAUDE_TEST,
    description: LOCAL_RUN_DESCRIPTION,
    version: TEST_PLUGIN_VERSION,
    isAvailable: isClaudeTestAvailable,
    skills: CLAUDE_TEST_SKILLS,
    get mcpServers() {
      if (!claudeTestState.wantedSessions.has(getSessionId())) return;
      let consentPreview = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT);
      claudeTestState.consentPreview = (claudeTestState.consentPreview ?? consentPreview) && consentPreview;
      let panePreview = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_VELVET_HARROW);
      claudeTestState.panePreview = (claudeTestState.panePreview ?? panePreview) && panePreview;
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
