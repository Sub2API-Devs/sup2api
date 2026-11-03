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
import { claudeTestInstalledRoot, pet, K6n } from "../../../services/pluginTest/claudeTestPlugin.js";
import { parseFrontmatter } from "../../../utils/frontmatterParser.js";
import {
  ht,
  expandSkillDirPlaceholders,
  freeze,
  CLAUDE_TEST_RUNNER,
  CC_PLUGIN_CLAUDE_TEST,
  buildHelperServerConfig,
  je,
} from "./constants.js";
import {
  Ta,
  qt,
  getActiveAgentDefinitions,
  consumeComposerMark,
  ensureClaudeTestReloaded,
  rememberRunFolder,
  Uo,
  Go,
  To,
  Ea,
  wa,
  completeSpecArgs,
  Ho,
  countRunsFromUsageEvents,
  browserHelperHooks,
  seatOwnAgents,
  LOCAL_RUN_DESCRIPTION,
} from "./browserHelper.js";
import { claudeTestState } from "./appFacts.js";
import {
  Pe,
  Jr,
  jt,
  Ht,
  LOAD_MARK_PREFIX,
  formatConflictingPluginText,
  CLI_ONLY_TEXT,
  Kr,
  Xr,
  zr,
  HELPER_NOT_READY_TEXT,
  ct,
  ut,
  Me,
  qr,
} from "./messages.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { getSettingsFilePathForSource } from "../../../utils/settings/settings.js";
import { substituteArguments } from "../../../utils/argumentSubstitution.js";
import { xM } from "../../../utils/promptShellExecution.js";
import { findClaudeTestRepository, isClaudeTestAvailable } from "./commandHook.js";
import { Xt } from "../../../components/skills/SkillsMenu.js";
import { Gr } from "./consent.js";
import {
  isFlagOnWithInternalOverride,
  TENGU_VELVET_HARROW,
  TENGU_AMBER_QUILLWORT,
} from "../../../services/analytics/flagOverrides.js";
import { supportsHyperlinks } from "../../../ink/supports-hyperlinks.js";
import { writeLiveReport, Oi, isMadeHereMarker } from "./runFiles.js";
import { pluginDataDirPath } from "../../../utils/plugins/pluginDirectories.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../builtinPlugins.js";
import { getSessionId, getIsInteractive } from "../../../bootstrap/state.js";
import { CLAUDE_TEST_HOOK_SCAN } from "./hookScan.js";

//@ chunk-ae5g0zb5.js:124247-124285 placement
function Xo(e) {
  return RUN_DIR_COMMAND_RE.exec(e)?.[1];
}
//@ chunk-ae5g0zb5.js:124285-124378 placement
var zo = "${CLAUDE_TEST_SANDBOX}",
  Ko = "${CLAUDE_TEST_USER_SETTINGS}",
  Yo = "${CLAUDE_TEST_LISTEN}";
//@ chunk-ae5g0zb5.js:124378-124742 placement
function describeNetworkReach() {
  if (!SandboxManager.isSandboxingEnabled()) return "off";
  if (SandboxManager.areUnsandboxedCommandsAllowed()) return "may-leave";
  if (Object.keys(SandboxManager.getNetworkRestrictionConfig()).length === 0) return "stays-reachable";
  if (getPlatform() !== "macos") return "stays-unreachable";
  if (SandboxManager.getAllowLocalBinding() === !0) return "stays-reachable";
  return isSettingSourceEnabled("userSettings") ? "stays-no-listen" : "stays-no-listen-fixed";
}
/**
 * macOS 沙箱启用网络限制且不允许本地绑定时返回 refused（用户设置不可改时 refused-fixed），否则 allowed。
 */
//@ chunk-ae5g0zb5.js:124742-124958 placement
function checkSandboxLocalBinding() {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    getPlatform() !== "macos" ||
    Object.keys(SandboxManager.getNetworkRestrictionConfig()).length === 0 ||
    SandboxManager.getAllowLocalBinding() === !0
  )
    return "allowed";
  return isSettingSourceEnabled("userSettings") ? "refused" : "refused-fixed";
}
//@ chunk-ae5g0zb5.js:124995-125293 placement
async function readSkillFrontmatter(e) {
  let { SKILL_MD: SKILL_MD } = await loadInstalledFiles(),
    r = claudeTestInstalledRoot(),
    { frontmatter: frontmatter, content: content } = parseFrontmatter(
      ht(SKILL_MD[e]).replace(
        /\r\n/g,
        `
`,
      ),
    ),
    a = frontmatter["allowed-tools"];
  return {
    allowedTools: (Array.isArray(a) ? a : [])
      .filter((i) => typeof i === "string")
      .map((i) => expandSkillDirPlaceholders(i, r)),
    body:
      `Base directory for this skill: ${r}/skills/run

` + content.trim(),
  };
}
/**
 * 创建 Claude Test 的 skill 命令对象（工具白名单、提示词生成、用户参数）。
 */
//@ chunk-ae5g0zb5.js:125293-126799 placement
function createClaudeTestSkill(e, n) {
  return {
    ...n,
    name: freeze[e],
    requires: { workspace: !0 },
    ...(e === "run" && { onUserTypedArgs: Ta }),
    getAllowedTools: async () =>
      describeUnavailableReason(e, !1, []) === void 0 &&
      (e !== "run" || claudeTestState.seatOwnAgents === void 0 || qt(getActiveAgentDefinitions()))
        ? (await readSkillFrontmatter(e)).allowedTools
        : [],
    async getPromptForCommand(r, o) {
      let s = e === "run" && consumeComposerMark(r, o),
        a = e === "run" ? claudeTestState.agentsCheckedFor : void 0;
      if (e === "run") claudeTestState.agentsCheckedFor = void 0;
      if (s) claudeTestState.typedArgs = r;
      let i = s && !claudeTestState.isModuleLoaded ? await ensureClaudeTestReloaded(o) : void 0,
        c = describeUnavailableReason(
          e,
          o.options.isNonInteractiveSession,
          o.options.commands,
          i,
          n.agent === void 0 ||
            o.options.agentDefinitions.activeAgents.some((activeAgent) => activeAgent.agentType === n.agent),
        );
      if (c !== void 0) return [{ type: "text", text: Pe(c) }];
      let _ =
        e === "run"
          ? await checkOwnAgentsSeated(
              o.options.agentDefinitions.activeAgents,
              s || (a !== void 0 && a.args === r && Date.now() - a.at <= xc),
            )
          : void 0;
      if (_ !== void 0) return [{ type: "text", text: Pe(_) }];
      if (e === "execute" && o.options.isSkillPreload !== !0) {
        let O = Xo(r);
        if (O !== void 0) rememberRunFolder(O);
      }
      let S = "may-leave",
        w = "allowed",
        f = "none",
        b = "~/.claude/settings.json";
      if (e === "run") {
        try {
          ((S = describeNetworkReach()), (w = checkSandboxLocalBinding()));
        } catch (error) {
          logForDebugging(`claude-test: sandbox not read for the run skill: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        try {
          f = Uo(o);
        } catch (error) {
          logForDebugging(
            `claude-test: background commands not read for the run skill: ${errorMessage(error)}`,
            { level: "error" },
          );
        }
        try {
          b = getSettingsFilePathForSource("userSettings") ?? b;
        } catch (error) {
          logForDebugging(
            `claude-test: user settings path not read for the run skill: ${errorMessage(error)}`,
            { level: "error" },
          );
        }
      }
      let { body: body } = await readSkillFrontmatter(e),
        F = expandSkillDirPlaceholders(
          substituteArguments(
            e === "run"
              ? body
                  .replaceAll(zo, S)
                  .replaceAll(Yo, w)
                  .replaceAll(Go, f)
                  .replaceAll(Ko, () => b)
              : body,
            r,
            !0,
            [],
            xM,
          ),
          claudeTestInstalledRoot(),
        );
      return [{ type: "text", text: e === "run" ? issueLoadMark(F, i === "loaded" ? To(o) : void 0) : F }];
    },
  };
}
/**
 * 检查 Claude Test 自带 agent 是否已加载，返回对应提示。
 */
//@ chunk-ae5g0zb5.js:126799-126992 placement
async function checkOwnAgentsSeated(e, n) {
  let seatOwnAgents = claudeTestState.seatOwnAgents;
  if (seatOwnAgents === void 0) return;
  let o = qt(e);
  if (!n && o) return;
  switch (await seatOwnAgents()) {
    case "listed":
      return n ? void 0 : Jr;
    case "reading":
      return jt;
    case "missing":
      return Ht;
  }
}
//@ chunk-ae5g0zb5.js:126992-127011 placement
var xc = 60000,
  Pc = 16;
/**
 * 生成加载标记（UUID）并登记，返回带标记前缀的提示词；只保留最近若干个。
 */
//@ chunk-ae5g0zb5.js:127011-127298 placement
function issueLoadMark(e, n) {
  let { loads: loads } = claudeTestState,
    o = randomUUID();
  for (let [s, a] of loads) if (a.isTyped) loads.set(s, { issuedAt: a.issuedAt, isTyped: !1 });
  loads.set(
    o,
    n === void 0
      ? { issuedAt: Date.now(), isTyped: !1 }
      : { issuedAt: Date.now(), isTyped: !0, mayStillStart: n },
  );
  for (let s of [...loads.keys()].slice(0, -Pc)) loads.delete(s);
  return `${LOAD_MARK_PREFIX}${o}
${e}`;
}
//@ chunk-ae5g0zb5.js:127298-127679 placement
function describeUnavailableReason(e, n, r, o, s = !0) {
  if (!claudeTestState.isModuleLoaded) {
    let a = findClaudeTestRepository(r);
    if (a !== void 0) return formatConflictingPluginText(a);
    if (n) return CLI_ONLY_TEXT;
    if (o === "slow" || (o === void 0 && Ea())) return Kr;
    return o !== void 0 || wa() || Xt(r) ? Xr : zr;
  }
  if (e === "run") return;
  if (n) return CLI_ONLY_TEXT;
  if (!claudeTestState.hasStartedServer) return HELPER_NOT_READY_TEXT;
  switch (claudeTestState.mayRun?.()) {
    case "yes":
      break;
    case "login_changed":
      return ct;
    case "not_offered":
      return ut;
    default:
      return Me;
  }
  return s ? void 0 : qr;
}
/**
 * Claude Test 的三个技能：run（用户可调用）、execute 与 draft（fork 到内部 agent）。
 */
//@ chunk-ae5g0zb5.js:127679-127892 placement
var CLAUDE_TEST_SKILLS = [
  createClaudeTestSkill("run", {
    ...RUN_SKILL_DEFINITION,
    userInvocable: !0,
    getArgumentCompletions: completeSpecArgs,
  }),
  createClaudeTestSkill("execute", {
    ...EXECUTE_AGENT_DEFINITION,
    userInvocable: !1,
    context: "fork",
    agent: CLAUDE_TEST_RUNNER,
  }),
  createClaudeTestSkill("draft", {
    ...DRAFT_AGENT_DEFINITION,
    userInvocable: !1,
    context: "fork",
    agent: "claude-test:author",
  }),
];
/**
 * 把运行状态、报告、登录监视等挂到共享状态并注册内置插件。
 */
//@ chunk-ae5g0zb5.js:127892-128550 placement
function registerClaudeTestPlugin() {
  ((claudeTestState.filesReady = Gr),
    (claudeTestState.report = Ho),
    (claudeTestState.reportRuns = countRunsFromUsageEvents),
    (claudeTestState.mayRun = browserHelperHooks.mayRun),
    (claudeTestState.watchLogin = browserHelperHooks.start),
    (claudeTestState.takeOut = browserHelperHooks.takeOut),
    (claudeTestState.isPaneOn = () => isFlagOnWithInternalOverride(TENGU_VELVET_HARROW)),
    (claudeTestState.seatOwnAgents = () => seatOwnAgents()),
    (claudeTestState.reportHref = async (e, n) =>
      supportsHyperlinks() ? writeLiveReport(pluginDataDirPath(pet), e, n) : void 0),
    (claudeTestState.installNoteText = () => Oi(pluginDataDirPath(pet))),
    (claudeTestState.isMadeHere = (e) => isMadeHereMarker(pluginDataDirPath(pet), e)),
    registerBuiltinPlugin({
      name: CC_PLUGIN_CLAUDE_TEST,
      description: LOCAL_RUN_DESCRIPTION,
      version: K6n,
      isAvailable: isClaudeTestAvailable,
      skills: CLAUDE_TEST_SKILLS,
      get mcpServers() {
        if (!claudeTestState.wantedSessions.has(getSessionId())) return;
        let e = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_AMBER_QUILLWORT);
        claudeTestState.consentPreview = (claudeTestState.consentPreview ?? e) && e;
        let n = getIsInteractive() && isFlagOnWithInternalOverride(TENGU_VELVET_HARROW);
        return (
          (claudeTestState.panePreview = (claudeTestState.panePreview ?? n) && n),
          buildHelperServerConfig(claudeTestState.consentPreview, claudeTestState.panePreview)
        );
      },
      mayConnectMcpServer: browserHelperHooks.mayConnectMcpServer,
      hooksModule: builtinHooksModuleRef(import.meta.dir, je, () => CLAUDE_TEST_HOOK_SCAN()),
    }));
}

export {
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
};
