/**
 * skills/bundled/pluginAuthoring/pluginAuthoring.ts
 *
 * 2.1.316 新增：plugin-authoring 内置技能（Make a mod）：按会话形态（云端、桌面、终端）给出分享 mod 的方式与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jy3v56kg.js (35)
 * attribution: placement 35
 */
import { resolve, join } from "path";
import { realpath } from "fs/promises";
import { homedir } from "os";
import { hookMatcherMatches } from "../../../utils/hooks.js";
import { PreToolUseHookInputSchema_2 } from "../../../entrypoints/sdk/coreSchemas.js";
import { MatcherUnsupportableError } from "../../../utils/hooks/matcherGrammar.js";
import { getCwd } from "../../../utils/cwd.js";
import { isUncOrDeviceSpelling } from "../../../utils/fsJunctions.js";
import { isUntouchableSpelling } from "../../../utils/networkPaths.js";
import {
  scanOffReason,
  recordPackageHandOver,
  clearLastPackagedMod,
  buildScanCheckHooks,
  collectScanFiles,
  noteLastPackagedMod,
  formatScanSkipped,
  FOLDER_CHANGED_ERROR,
  sanitizeForReport,
  getFileIdentity_2,
  isPluginAuthoringHooksAllowed,
  SECRET_SCAN_SKILL_MODULE,
  PLUGIN_AUTHORING_HOOK_SCAN,
} from "./secretScanTool.js";
import { getSessionId, getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getSessionEntrypoint, envSessionKind, hostScheduledRun } from "../../../utils/sessionShape.js";
import { currentSurfaceBinding } from "../../../plugins/functionHooks/surfaceBinding.js";
import { canPromptForConfirmation } from "../../../utils/permissions/confirmWithUser.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { outsideBudget } from "../../../plugins/functionHooks/dispatch/valueSizing.js";
import { uniq } from "../../../utils/collections.js";
import { logError } from "../../../utils/log.js";
import { realpathAllowMissing } from "../../../utils/pathResolution.js";
import { pluginIdHash } from "../../../utils/telemetry/pluginTelemetry.js";
import { env } from "../../../utils/env.js";
import { parseYaml } from "../../../utils/yaml.js";
import { isGithubDotCom } from "../../../utils/git/githubUrl.js";
import { repoDetectionGuards, detectCurrentRepositoryWithHost } from "../../../utils/detectRepository.js";
import { execFileNoThrowWithCwd } from "../../../utils/execFileNoThrow.js";
import { gitExe } from "../../../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../../utils/git/gitSafeEnv.js";
import { subprocessEnv } from "../../../utils/subprocessEnv.js";
import { readFileChecked } from "../../../utils/fileRead.js";
import {
  NO_ONE_TO_ASK_TEXT,
  expandDevModsPlaceholder,
} from "../../../services/plugins/devMods/devModsWatcher.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../../tools/PublishPluginTool/prompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import {
  isDesktopSessionWithOwnToken,
  getAuthUnavailableReason,
} from "../../../utils/auth/authUnavailableReason.js";
import { normalizeUuidOrNull } from "../../../utils/agentId.js";
import { isPolicyAllowed } from "../../../services/policyLimits/policyEvidence.js";
import {
  ALLOW_PLUGIN_PUBLISH_KEY,
  isPluginPublishAllowed,
} from "../../../services/plugins/publish/publishGate.js";
import { isHeadlessHostEntrypoint, isRemoteEntrypoint } from "../../../utils/entrypointKinds.js";
import { getSubscriptionType, isConsumerSubscriber } from "../../../utils/auth.js";
import {
  CLOUD_SHARING_NOTE,
  isNativeTerminalNotifySupported,
  ORG_LIBRARY_SHARING_NOTE,
  TERMINAL_SHARING_NOTE,
} from "../pluginAuthoringPrompt.js";
import { getAllBaseToolsFromRegistry, toolMatchesName } from "../../../Tool.js";
import { identityPath_2 } from "../../loadSkillsDir.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../../tools/SendUserFileTool/prompt.js";
import { buildPrompt } from "../claudeApi.js";
import { registerBuiltinPlugin, builtinHooksModuleRef } from "../../../plugins/builtinPlugins.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-jy3v56kg.js:33238-33321 placement
function isHookInputPathAllowed(matcher) {
  try {
    return hookMatcherMatches(PreToolUseHookInputSchema_2, matcher);
  } catch (error) {
    if (error instanceof MatcherUnsupportableError) return true;
    throw error;
  }
}
//@ chunk-jy3v56kg.js:33321-34656 placement
/**
 * 插件编写技能里报告路径长度上限与相关说明文本。
 */
var createPluginAuthoringHooks = (host) => ({
  register: (context) => {
    host.registerHooks(context, {
      absolute: (folder) => resolve(getCwd(), folder),
      shownPlain: (folder) => sanitizePathForReport(resolve(getCwd(), folder)),
      isNetworkPath: (folder) =>
        [folder, resolve(getCwd(), folder)].some(
          (candidate) => isUncOrDeviceSpelling(candidate) || isUntouchableSpelling(candidate),
        ),
      resolveFolder: (folder) => describeModFolder(resolve(getCwd(), folder)),
      complianceOff: () => scanOffReason(),
      session: () => getSessionId(),
      inChat: () => getSessionEntrypoint() === "remote_cowork",
      handedOver: (modFolder, packagePath) => recordPackageHandOver(modFolder, packagePath),
      mayAsk: () => {
        let binding = currentSurfaceBinding();
        if (binding === undefined) return false;
        try {
          return canPromptForConfirmation(binding.toolContext(new AbortController()));
        } catch {
          return false;
        }
      },
      refuse: (errorText, reason = true) => {
        clearLastPackagedMod();
        if (reason === "managed_read_hook")
          logFeatureBad("plugin_authoring_scan_secrets", "managed_read_hook");
        else if (reason === "managed_settings_unreadable")
          logFeatureBad("plugin_authoring_scan_secrets", "managed_settings_unreadable");
        else if (reason) logFeatureBad("plugin_authoring_scan_secrets", "scan_not_run");
        return {
          text: `Result: the scan could not run: ${errorText}`,
          isError: true,
        };
      },
      managedReadHook: () => buildScanCheckHooks(),
      scan: (folderArg, checkFiles, approved, packageArg) =>
        outsideBudget(async () => {
          let folderPath = resolve(getCwd(), folderArg);
          let packagePath = packageArg === undefined ? folderPath : resolve(getCwd(), packageArg);
          let pathsFor = (relPath) =>
            packagePath === folderPath
              ? [join(folderPath, relPath)]
              : [join(folderPath, relPath), join(packagePath, relPath)];
          let scanResult;
          try {
            scanResult = await collectScanFiles(folderPath, {
              approved,
              readDenied: async (paths) => {
                let denied = new Set();
                let deniedPaths = await checkFiles(uniq(paths.flatMap(pathsFor)));
                for (let path of paths)
                  if (pathsFor(path).some((candidate) => deniedPaths.has(candidate))) denied.add(path);
                return denied;
              },
            });
          } catch {
            logError(Error("the secret scan threw an unexpected error"));
            scanResult = {
              ok: false,
              error: "the scan hit an unexpected error.",
            };
          }
          if (scanResult.ok)
            noteLastPackagedMod(
              folderPath,
              scanResult.findings.length === 0 &&
                scanResult.notScanned.length === 0 &&
                scanResult.capped !== true,
            );
          else clearLastPackagedMod();
          await logScanOutcome(scanResult).catch(() => {
            return;
          });
          return {
            ...formatScanSkipped(folderArg, scanResult),
            ...(!scanResult.ok &&
              scanResult.error === FOLDER_CHANGED_ERROR && {
                changed: true,
              }),
          };
        }),
    });
  },
});
var MAX_REPORT_PATH_CHARS = 200;
//@ chunk-jy3v56kg.js:34656-34686 placement
/**
 * 报告里展示路径前先清洗并截断。
 */
function sanitizePathForReport(path) {
  return sanitizeForReport(path, MAX_REPORT_PATH_CHARS);
}
//@ chunk-jy3v56kg.js:34686-34983 placement
async function describeModFolder(folderPath) {
  if (realpathAllowMissing(folderPath))
    return {
      network: true,
      shown: `Folder: ${sanitizePathForReport(folderPath)}`,
    };
  let filePath = await realpath(folderPath).catch(() => {
    return;
  });
  let identity = filePath === undefined ? undefined : await getFileIdentity_2(filePath);
  return {
    network: false,
    real: filePath,
    identity,
    unidentified: filePath !== undefined && identity === undefined,
    shown:
      filePath === undefined || filePath === folderPath
        ? `Folder: ${sanitizePathForReport(folderPath)}`
        : `Folder: ${sanitizePathForReport(folderPath)}
It leads to: ${sanitizePathForReport(filePath)}`,
  };
}
//@ chunk-jy3v56kg.js:34983-35428 placement
async function logScanOutcome(scanResult) {
  if (!scanResult.ok) {
    logFeatureBad("plugin_authoring_scan_secrets", "scan_not_run");
    return;
  }
  let pluginNames = scanResult.pluginNames;
  let eventProps = {
    files_with_secrets: scanResult.findings.length,
    files_not_scanned: scanResult.notScanned.length,
    ...(pluginNames !== undefined && {
      plugin_id_hash: pluginIdHash(pluginNames.plugin, pluginNames.marketplace),
    }),
  };
  if (scanResult.capped === true) logFeatureSad("plugin_authoring_scan_secrets", "folder_capped", eventProps);
  else if (scanResult.notScanned.length > 0)
    logFeatureSad("plugin_authoring_scan_secrets", "files_not_scanned", eventProps);
  else logFeatureOk("plugin_authoring_scan_secrets", eventProps);
}
//@ chunk-jy3v56kg.js:35516-35553 placement
var GH_HOSTNAME_REGEX = /^[a-z0-9][a-z0-9_-]{0,38}$/i;
//@ chunk-jy3v56kg.js:35553-35695 placement
function getGhConfigDir() {
  if (env.GH_CONFIG_DIR) return env.GH_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "gh");
  return join(homedir(), ".config", "gh");
}
//@ chunk-jy3v56kg.js:35695-36095 placement
function readPluginJsonFields(content) {
  let hostsFile;
  try {
    hostsFile = parseYaml(content);
  } catch {
    return [];
  }
  if (typeof hostsFile !== "object" || hostsFile === null) return [];
  let hostNames = [];
  for (let [key, value] of Object.entries(hostsFile)) {
    if (!isGithubDotCom(key) || typeof value !== "object" || value === null) continue;
    let { user, users } = value;
    if (typeof user === "string" || typeof user === "number") hostNames.push(String(user));
    if (typeof users === "object" && users !== null && !Array.isArray(users))
      hostNames.push(...Object.keys(users));
  }
  return uniq(
    hostNames.map((hostName) => hostName.trim()).filter((hostName) => GH_HOSTNAME_REGEX.test(hostName)),
  );
}
//@ chunk-jy3v56kg.js:36095-36108 placement
var MAX_GH_HOSTS_FILE_BYTES = 65536;
//@ chunk-jy3v56kg.js:36108-36324 placement
async function isRepoOwnedByGhUser() {
  if (repoDetectionGuards().blocked()) return false;
  let currentRepositoryWithHost = await detectCurrentRepositoryWithHost(undefined, {
    skipCache: true,
  });
  if (currentRepositoryWithHost === null) return describeGitRemote(getCwd());
  if (!isGithubDotCom(currentRepositoryWithHost.host)) return false;
  let lower = currentRepositoryWithHost.owner.toLowerCase();
  return (await readGhHostUsers()).some((hostName) => hostName.toLowerCase() === lower);
}
//@ chunk-jy3v56kg.js:36324-36562 placement
async function describeGitRemote(cwd) {
  let gitRemoteResult = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "remote"], {
    cwd,
    env: {
      ...subprocessEnv(),
      LC_ALL: "C",
    },
    preserveOutputOnError: true,
  });
  if (gitRemoteResult.exitCode === 0) return gitRemoteResult.stdout.trim() === "";
  return gitRemoteResult.exitCode === 128 && gitRemoteResult.stderr.includes("not a git repository (or any");
}
//@ chunk-jy3v56kg.js:36562-36664 placement
async function readGhHostUsers() {
  try {
    let { content } = await readFileChecked(join(getGhConfigDir(), "hosts.yml"), MAX_GH_HOSTS_FILE_BYTES);
    return readPluginJsonFields(content);
  } catch {
    return [];
  }
}
//@ chunk-jy3v56kg.js:36664-36931 placement
var CLOUD_SURFACE_NOTE =
  "THIS SESSION runs in a cloud container and draws in no terminal of its own: whatever shows it (an app, a client) seats a pane where its surface seats panes. The mod's folder is in the container, not on the person's computer, and ends when the container does.";
//@ chunk-jy3v56kg.js:36931-37087 placement
var GIT_PUSH_ONLY_SHARING_NOTE = `

SHARING IT. In this session, git pushes a mod only to a remote the person already has; no new repository is created on GitHub or any other host.`;
//@ chunk-jy3v56kg.js:37087-37389 placement
var HOSTED_SURFACE_NOTE = `THIS SESSION draws in no terminal of its own: a program started it, and a pane is seated by a surface it attaches, if any. Where hot reloading is off as ${NO_ONE_TO_ASK_TEXT}, the mod loads in a session started with \`--plugin-dir <mod folder>\`, or one with the folder named in \`CLAUDE_CODE_PLUGIN_DIRS\`.`;
//@ chunk-jy3v56kg.js:37389-37811 placement
var ORGANIZATION_LIBRARY_NOTE = ` This session has the \`${PUBLISH_PLUGIN_TOOL_NAME}\` tool, so the normal way to share a mod here is the person's organization's library on claude.ai: when they ask to share or publish one, publish it with that tool, which shows them every file and sends nothing before their yes. A GitHub repository, by Sharing a mod in reference.md, is the other road: for people outside the organization, or when the person asks for a repository.`;
//@ chunk-jy3v56kg.js:37811-38478 placement
/**
 * 插件编写技能里「分享或发送文件」的说明文本。
 */
var SHARE_AFTER_SAVE_NOTE =
  " After saving, the person sees Share appear on the file's card and presses it, then adds teammates by name or, where the organization allows, picks Publish to org. Where no Share appears, they send the file, to add with Upload plugin.";
var SEND_FILE_SHARE_NOTE =
  " After saving, the person sends someone the file, downloaded from its card or the saved plugin's page, for them to add under Customize or Plugins, with Add, then Upload plugin.";
var SHARE_OR_SEND_NOTE =
  " After saving, the person presses Share where it then appears on the file's card, or sends someone the file, downloaded from its card or the saved plugin's page, for them to add under Customize or Plugins, with Add, then Upload plugin.";
//@ chunk-jy3v56kg.js:38478-38506 placement
var TENGU_WOVEN_PARCEL = "tengu_woven_parcel";
//@ chunk-jy3v56kg.js:38506-38516 placement
var WOVEN_PARCEL_DEFAULT = false;
//@ chunk-jy3v56kg.js:38516-38551 placement
/**
 * 读开关 tengu_woven_parcel（默认关）。
 */
function isWovenParcelOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOVEN_PARCEL, WOVEN_PARCEL_DEFAULT) === true;
}
//@ chunk-jy3v56kg.js:38551-38578 placement
var TENGU_SPICY_PEARL = "tengu_spicy_pearl";
//@ chunk-jy3v56kg.js:38578-38588 placement
var SPICY_PEARL_DEFAULT = false;
//@ chunk-jy3v56kg.js:38588-38623 placement
/**
 * 读开关 tengu_spicy_pearl（默认关）。
 */
function isSpicyPearlOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SPICY_PEARL, SPICY_PEARL_DEFAULT) === true;
}
//@ chunk-jy3v56kg.js:38623-38684 placement
/**
 * 是否消费版订阅且未设置组织 UUID。
 */
var isOrglessConsumerSession = () =>
  isDesktopSessionWithOwnToken() && normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID) === null;
//@ chunk-jy3v56kg.js:38684-38989 placement
var TERMINAL_SURFACE_NOTE = `THIS SESSION is drawn in a terminal. A pane the person opened seats at any width; one opened unasked seats from 144 columns, or 110 as \`$.ui.open\`'s doc says, and waits below that. Where hot reloading is off as ${NO_ONE_TO_ASK_TEXT}, \`claude --plugin-dir <mod folder>\` starts a session with the mod loaded.`;
//@ chunk-jy3v56kg.js:38989-39496 placement
function describeSharingSurface(canPublish, repoOwnedByUser, canSendFile) {
  let publishForbidden = !isPolicyAllowed(ALLOW_PLUGIN_PUBLISH_KEY);
  let librarySharing =
    canPublish &&
    !publishForbidden &&
    isPluginPublishAllowed() &&
    envSessionKind() &&
    getAuthUnavailableReason() === undefined &&
    !isOrglessConsumerSession();
  let orgNotes =
    (librarySharing ? ORGANIZATION_LIBRARY_NOTE : "") + (publishForbidden ? GIT_PUSH_ONLY_SHARING_NOTE : "");
  if (isHeadlessHostEntrypoint() || isRemoteEntrypoint()) {
    if (
      getSessionEntrypoint() !== "remote_cowork" ||
      !envSessionKind() ||
      publishForbidden ||
      librarySharing ||
      !canSendFile ||
      scanOffReason() !== undefined ||
      buildScanCheckHooks() !== undefined ||
      !isWovenParcelOn()
    )
      return CLOUD_SURFACE_NOTE + orgNotes;
    switch (getSubscriptionType()) {
      case "team":
      case "enterprise":
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + SHARE_AFTER_SAVE_NOTE;
      case "pro":
      case "max":
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + SEND_FILE_SHARE_NOTE;
      default:
        return CLOUD_SURFACE_NOTE + CLOUD_SHARING_NOTE + SHARE_OR_SEND_NOTE;
    }
  }
  let isNonInteractiveSession = getIsNonInteractiveSession();
  let baseSurface = (isNonInteractiveSession ? HOSTED_SURFACE_NOTE : TERMINAL_SURFACE_NOTE) + orgNotes;
  let canShareInTerminal =
    !isNonInteractiveSession ||
    (isNativeTerminalNotifySupported() &&
      !hostScheduledRun() &&
      env.CLAUDE_SSH_DAEMON_CHILD === undefined &&
      env.CLAUDE_SSH_RUN_DIR === undefined);
  if (
    publishForbidden ||
    !envSessionKind() ||
    !canShareInTerminal ||
    (!librarySharing && (!isConsumerSubscriber() || !repoOwnedByUser)) ||
    !isSpicyPearlOn()
  )
    return baseSurface;
  return baseSurface + (librarySharing ? ORG_LIBRARY_SHARING_NOTE : TERMINAL_SHARING_NOTE);
}
//@ chunk-jy3v56kg.js:39496-39531 placement
/**
 * 插件编写技能提示词里的会话界面占位符。
 */
var SESSION_SURFACE_PLACEHOLDER = "${CLAUDE_SESSION_SURFACE}";
//@ chunk-jy3v56kg.js:39531-39787 placement
var PLUGIN_AUTHORING_DESCRIPTION =
  "Make a mod: a change to Claude's own interface or behaviour, such as a panel or pane that stays beside the chat and updates, a band, status line, toast, slash command, or hook on tool calls. Use to make, change or debug a mod or its hooks module.";
//@ chunk-jy3v56kg.js:39787-39816 placement
/**
 * 插件编写技能提示词里的技能目录占位符。
 */
var SKILL_DIR_PLACEHOLDER = "${CLAUDE_SKILL_DIR}";
//@ chunk-jy3v56kg.js:39816-39848 placement
var TYPES_CLAUDE_CODE_D_TS = "types/claude-code.d.ts";
//@ chunk-jy3v56kg.js:39848-40846 placement
/**
 * 加载 plugin-authoring 技能附带的参考文件（类型定义、示例）。
 */
async function loadPluginAuthoringFiles(extractDir) {
  let [skillModule, declarationsModule, examplesModule] = await Promise.all([
    import("../mods/EXAMPLE_BAND.lazy.js"),
    import("../../../plugins/hooksModules/PLUGIN_DECLARATIONS_TEXT.lazy.js"),
    import("../../../plugins/functionHooks/types/builtinToolSchemasOf.lazy.js"),
  ]);
  return {
    [TYPES_CLAUDE_CODE_D_TS]: declarationsModule.pluginDeclarationsOf(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      examplesModule.builtinToolSchemasOf(getAllBaseToolsFromRegistry() ?? extractDir.options.tools),
    ),
    "examples/pane.tsx": skillModule.EXAMPLE_PANE,
    "examples/pane-state.d.ts": skillModule.EXAMPLE_PANE_STATE,
    "examples/pane.test.tsx": skillModule.EXAMPLE_PANE_TEST,
    "examples/band.tsx": skillModule.EXAMPLE_BAND,
    "examples/band-state.d.ts": skillModule.EXAMPLE_BAND_STATE,
    "examples/tool-call.ts": skillModule.EXAMPLE_TOOL_CALL,
    "reference.md": skillModule.REFERENCE_MD,
  };
}
//@ chunk-jy3v56kg.js:40846-41106 placement
var FILES_NOT_WRITTEN_NOTE = (
  folder,
) => `The engine could not write this skill's folder, ${folder}, this time, so the files named below under it are absent; once the engine has loaded the mod from its folder the same declarations are in its \`.claude-plugin/types/claude-code/index.d.ts\`.

`;
//@ chunk-jy3v56kg.js:41106-41132 placement
var PLUGIN_AUTHORING_2 = "plugin-authoring";
//@ chunk-jy3v56kg.js:41250-41836 placement
/**
 * plugin-authoring 内置技能定义（名称、描述、可由用户调用、附带文件）。
 */
var PLUGIN_AUTHORING_SKILL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jy3v56kg.js:41250", () => {
  PLUGIN_AUTHORING_SKILL = Object.freeze({
    name: PLUGIN_AUTHORING_2,
    description: PLUGIN_AUTHORING_DESCRIPTION,
    menuDescription: "Write a mod: a live pane, view or behaviour change in Claude Code",
    userInvocable: true,
    files: loadPluginAuthoringFiles,
    async getPromptForCommand(args, context, extractDir) {
      let { SKILL_MD } = await import("../mods/EXAMPLE_BAND.lazy.js");
      let skillDir = identityPath_2(
        extractDir ?? (await import("../../bundledSkills.js")).getBundledSkillExtractDir(PLUGIN_AUTHORING_2),
      );
      let repoOwnedByGhUser = await isRepoOwnedByGhUser().catch((error) => {
        logError(error);
        return false;
      });
      let prompt = await expandDevModsPlaceholder(
        SKILL_MD.replaceAll(SKILL_DIR_PLACEHOLDER, () => skillDir).replaceAll(
          SESSION_SURFACE_PLACEHOLDER,
          () =>
            describeSharingSurface(
              context.options.tools.some((tool) => toolMatchesName(tool, PUBLISH_PLUGIN_TOOL_NAME)),
              repoOwnedByGhUser,
              context.options.tools.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME)),
            ),
        ),
        {
          isPreload: context.options.isSkillPreload === true,
        },
      );
      return [
        {
          type: "text",
          text: (extractDir === null ? FILES_NOT_WRITTEN_NOTE(skillDir) : "") + buildPrompt(prompt, args),
        },
      ];
    },
  });
});
//@ chunk-jy3v56kg.js:41836-42087 placement
var PLUGIN_AUTHORING_PLUGIN = () =>
  registerBuiltinPlugin({
    name: "cc-plugin-plugin-authoring",
    description:
      "Plugin authoring: Claude knows how a plugin of function hooks is written, typed and debugged against this build",
    isAvailable: isPluginAuthoringHooksAllowed,
    skills: [PLUGIN_AUTHORING_SKILL],
    hooksModule: builtinHooksModuleRef(
      import.meta.dir,
      createPluginAuthoringHooks(SECRET_SCAN_SKILL_MODULE),
      () => PLUGIN_AUTHORING_HOOK_SCAN(),
    ),
  });
export {
  CLOUD_SURFACE_NOTE,
  GIT_PUSH_ONLY_SHARING_NOTE,
  HOSTED_SURFACE_NOTE,
  ORGANIZATION_LIBRARY_NOTE,
  SHARE_OR_SEND_NOTE,
  SHARE_AFTER_SAVE_NOTE,
  SEND_FILE_SHARE_NOTE,
  SESSION_SURFACE_PLACEHOLDER,
  PLUGIN_AUTHORING_SKILL,
  PLUGIN_AUTHORING_DESCRIPTION,
  SKILL_DIR_PLACEHOLDER,
  PLUGIN_AUTHORING_2,
  TERMINAL_SURFACE_NOTE,
  TYPES_CLAUDE_CODE_D_TS,
  PLUGIN_AUTHORING_PLUGIN,
  describeSharingSurface,
  FILES_NOT_WRITTEN_NOTE,
  loadPluginAuthoringFiles,
  isHookInputPathAllowed,
};
