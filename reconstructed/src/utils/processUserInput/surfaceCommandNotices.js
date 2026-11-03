/**
 * utils/processUserInput/surfaceCommandNotices.ts
 *
 * 2.1.316 新增：命令通知展示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3g0djq3w.js (13)
 * attribution: placement 13
 */
import { resolve } from "path";
import { pluginsMatchingEvent } from "../../plugins/functionHooks/hookDispatch.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { logError } from "../log.js";
import { toError, errorMessage } from "../errors.js";
import {
  isNativeTerminalNotifySupported,
  TERMINAL_SHARING_NOTE,
  ORG_LIBRARY_SHARING_NOTE,
  CLOUD_SHARING_NOTE,
} from "../../skills/bundled/pluginAuthoringPrompt.js";
import { isUsingDefaultPluginsDirectory } from "../plugins/pluginDirectories.js";
import { getStrictKnownMarketplaces } from "../plugins/marketplacePolicy.js";
import { logForDebugging } from "../debug.js";
import { getClaudeAiBaseUrl, getRemoteSessionUrl } from "../../constants/product.js";
import { env } from "../env.js";
import { toCompatSessionId, validateBridgeId } from "../../bridge/sessionIdCompat.js";
import { findCommand } from "../../commands.js";
import { isCcsTenant, getInvokedSkillsForAgent, getSessionId } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { mft } from "../sanitization.js";
import { containsSecret } from "../redactSecrets.js";
import { ge } from "../identity.js";
import { to } from "../valueSlot.js";
import { skillWatchStateByHost } from "../../skills/skillChangeWatch.js";
import { rbe } from "../../plugins/functionHooks/commandHooks.js";
import { IT } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { childNameUnder } from "../../plugins/functionHooks/devModsWatch.js";

/**
 * 判断某命令的 command.run 钩子注册数是否不超过 1。
 */
//@ chunk-3g0djq3w.js:5357-5566 placement
function hasSingleCommandRunHook(e) {
  try {
    let n = new Set(pluginsMatchingEvent("command.run", { command: e }));
    return (
      getPluginRegistry()
        .loadedModules.filter((loadedModule) => n.has(loadedModule.name))
        .reduce((u, s) => u + s.registrationsFor("command.run").length, 0) <= 1
    );
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 桌面版运行 /plugin 时的说明（如何添加插件与市场）。
 */
//@ chunk-3g0djq3w.js:6432-7177 placement
var PLUGIN_COMMAND_DESKTOP_NOTE =
    "/plugin opens a panel in the terminal, so it can't run in the desktop app. Click + next to the prompt box, then Plugins: Add plugin installs from a marketplace you've added, and Manage plugins turns a plugin on or off or uninstalls it.",
  qt =
    "For a marketplace you haven't added, Add marketplace in the app takes a GitHub owner/repo or a Git URL. Or, in a terminal with Claude Code installed on the machine this session runs on, run `claude plugin marketplace add <source>` and then `claude plugin install <plugin>@<marketplace>`, using the marketplace name the first command prints. Then send /reload-plugins here.",
  Xt =
    "Your organization limits which marketplaces can be added. For a plugin that isn't in Add plugin, contact your admin.";
//@ chunk-3g0djq3w.js:7177-7371 placement
function pluginCommandNotice(e) {
  if (e?.name !== "plugin" || !isNativeTerminalNotifySupported() || !isUsingDefaultPluginsDirectory()) return;
  try {
    let o = getStrictKnownMarketplaces() === null;
    return `${PLUGIN_COMMAND_DESKTOP_NOTE} ${o ? qt : Xt}`;
  } catch (error) {
    return (
      logForDebugging(`Marketplace policy could not be read: ${errorMessage(error)}`, { level: "error" }),
      PLUGIN_COMMAND_DESKTOP_NOTE
    );
  }
}
/**
 * 云会话中 /teleport、/session、/remote-control 不可用时的说明。
 */
//@ chunk-3g0djq3w.js:7371-8104 placement
function remoteSessionCommandNotices() {
  return {
    teleport: ({ remoteSessionId: remoteSessionId }) =>
      `/teleport pulls a cloud session into a terminal on your own machine, so it can't run from inside this session. To continue this session locally, run claude --teleport ${remoteSessionId} from a checkout of this repository. On claude.ai you can also choose Open in \u2192 Terminal from the session menu, which copies that command.`,
    session: ({ remoteSessionId: remoteSessionId }) =>
      `This session is already running as a cloud session: ${getRemoteTaskSessionUrl(remoteSessionId)}. To continue it in your terminal, run claude --teleport ${remoteSessionId} from a checkout of this repository.`,
    "remote-control": ({ remoteSessionId: remoteSessionId }) =>
      `Remote Control connects a terminal session to claude.ai, and this session is already running as a cloud session: ${getRemoteTaskSessionUrl(remoteSessionId)}.`,
    ...{},
  };
}
//@ chunk-3g0djq3w.js:8104-8275 placement
var CCS_COMMAND_NOTICES = {
  usage: ({ remoteSessionId: remoteSessionId }) =>
    `Usage isn't shown in this chat. To see it, open Settings \u2192 Usage on claude.ai: ${getClaudeAiBaseUrl(remoteSessionId, env.SESSION_INGRESS_URL)}/settings/usage`,
};
/**
 * 远程会话的网页 URL（基于 SESSION_INGRESS_URL）。
 */
//@ chunk-3g0djq3w.js:8275-8325 placement = getRemoteTaskSessionUrl (1)
function getRemoteTaskSessionUrl(sessionId) {
  return getRemoteSessionUrl(sessionId, env.SESSION_INGRESS_URL);
}
//@ chunk-3g0djq3w.js:8325-8457 placement
function remoteSessionIdFromEnv() {
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (!CLAUDE_CODE_REMOTE_SESSION_ID) return;
  try {
    return toCompatSessionId(
      validateBridgeId(CLAUDE_CODE_REMOTE_SESSION_ID, "CLAUDE_CODE_REMOTE_SESSION_ID"),
    );
  } catch {
    return;
  }
}
/**
 * 某命令在当前界面不可用时的说明（桌面版的 /plugin、云会话中的 /teleport 等）。
 */
//@ chunk-3g0djq3w.js:8457-8611 placement
function commandSurfaceNotice(e, n) {
  let o = findCommand(e, n),
    u = remoteSessionIdFromEnv();
  if (!u) return pluginCommandNotice(o);
  if (!o) return;
  let s = remoteSessionCommandNotices()[o.name] ?? (isCcsTenant() ? CCS_COMMAND_NOTICES[o.name] : void 0);
  return s ? s({ remoteSessionId: u }) : void 0;
}
//@ chunk-3g0djq3w.js:8611-8658 placement
var TENGU_POLISHED_QUILL_KILLSWITCH = "tengu_polished_quill_killswitch",
  no = 40;
//@ chunk-3g0djq3w.js:8658-8704 placement
function vt(e) {
  if (!e) return !1;
  return !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POLISHED_QUILL_KILLSWITCH, !1);
}
/**
 * 构造未知命令的回退信息（命令名、建议与可用命令名，过滤含密钥的文本）。
 */
//@ chunk-3g0djq3w.js:8704-8990 placement
function unknownCommandFallback({
  commandName: commandName,
  suggestion: suggestion,
  availableCommandNames: availableCommandNames,
  availableCommandCount: availableCommandCount,
}) {
  return {
    type: "unknown_command_fallback",
    commandName: mft(commandName) && !containsSecret(commandName) ? commandName : void 0,
    suggestion: suggestion !== void 0 && mft(suggestion) ? suggestion : void 0,
    availableCommandNames: availableCommandNames.filter((s) => mft(s)).slice(0, no),
    availableCommandCount: availableCommandCount,
  };
}
//@ chunk-3g0djq3w.js:9022-9057 placement
var It = ge(to(), (e) => e.set(void 0));
/**
 * 用户运行正在构建的 mod 的命令后，给模型的一次性提示（简短回应结果或提出 mod 建议）。
 */
//@ chunk-3g0djq3w.js:9057-9865 placement
function modCommandFollowUpNote(e, n) {
  let o = skillWatchStateByHost.get()?.folder,
    ownerOf = rbe.ownerOf(e),
    s = ownerOf === void 0 ? void 0 : IT(ownerOf)?.pluginRoot,
    T = o !== void 0 && s !== void 0 && childNameUnder(resolve(o), resolve(s)) !== void 0,
    any = [...getInvokedSkillsForAgent(null).values()].some(
      (y) =>
        y.content.includes(TERMINAL_SHARING_NOTE) ||
        y.content.includes(ORG_LIBRARY_SHARING_NOTE) ||
        y.content.includes(CLOUD_SHARING_NOTE),
    ),
    h = getSessionId();
  if (n !== void 0 || !T || !any || It.get() === h) return;
  return (
    It.set(h),
    `Claude Code sent this note after the person ran /${e}, a command of the mod they are building in this session; they have sent no message since, and the command's output is above. Reply in one or two lines and use no tools. If the output shows the mod did what they asked, make the plugin-authoring skill's one-line offer for the mod, unless it was already made or they said no; if the output shows a problem, say what went wrong; otherwise reply in one short line about the result.`
  );
}

export { hasSingleCommandRunHook, commandSurfaceNotice, vt, unknownCommandFallback, modCommandFollowUpNote };
