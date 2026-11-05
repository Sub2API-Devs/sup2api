/**
 * skills/bundled/pluginAuthoring/secretScanTool.ts
 *
 * 2.1.316 新增：plugin-authoring 技能的 scan_secrets 工具：分享 mod 前扫描文件夹中的密钥（读权限检查、合规开关、大小与链接限制）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cm73gsrm.js (51), chunk-xjnnz630.js (1)
 * attribution: placement 51, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, parse, join, basename, resolve } from "path";
import { stat, lstat, readdir, open } from "fs/promises";
import { getPlatform } from "../../../utils/platform.js";
import { readJunction } from "../../../utils/fsJunctions.js";
import { realpathCacheEntry } from "../../../utils/permissions/protectedDirs.js";
import { neverAllowsLocalWsl, isRealPathNonUnc } from "../../../utils/pathResolution.js";
import { __commonJS, __export } from "../../../../runtime/bun-runtime.js";
import {
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
} from "./pluginAuthoring.js";
import {
  ORG_LIBRARY_SHARING_NOTE,
  CLOUD_SHARING_NOTE,
  TERMINAL_SHARING_NOTE,
} from "../pluginAuthoringPrompt.js";
import { buildPrompt } from "../claudeApi.js";
import { areHooksModulesAllowed } from "../../../services/analytics/growthbookCredentials.js";
import { scanForSecrets_2 } from "../../../services/teamMemorySync/secretScanner.js";
import { isENOENT } from "../../../utils/errors.js";
import { jsonParse, isSentinelInode } from "../../../utils/slowOperations.js";
import { yieldToEventLoop } from "../../../native-ts/file-index/index.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { readOnlyNoFollowFlags } from "../../../utils/platformTargets.js";
import { GIT_LFS_POINTER_PREFIX } from "../../../utils/plugins/marketplaceGitCheckout.js";
import { plural, urlPatternToRegex, cleanForDisplay, truncateWithCount } from "../../../utils/stringUtils.js";
import { stripCombiningRepeated } from "../../../utils/sanitization.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  isPolicyLimitsCacheMissing,
  isPolicyVerdictAbsent,
} from "../../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../../services/policyLimits/complianceTaints.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { union, stringSchema, array, objectSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getSessionId, getRegisteredHooks } from "../../../bootstrap/state.js";
import { skillWatchStateByHost } from "../../skillChangeWatch.js";
import { isClaudeAiChatOrigin } from "../../../utils/entrypointKinds.js";
import {
  loadedModuleArgs,
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { childNameUnder } from "../../../plugins/functionHooks/devModsWatch.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { policySettingsUnreadable } from "../../../utils/hooks/hooksConfigSnapshot.js";
import { READ } from "../../../tools/FileReadTool/constants.js";
import { isPolicyTier } from "../../../plugins/functionHooks/hookDispatch.js";
import { getSettingsForSource } from "../../../utils/settings/settings.js";
import { getPolicyAllowedSet } from "../../../utils/plugins/pluginPolicy.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-xjnnz630.js:49428-49676 placement
async function buildSecretScanResult(finding) {
  if (getPlatform() !== "windows") return false;
  let junction = await readJunction(finding);
  switch (junction.kind) {
    case "directory":
      return false;
    case "junction":
    case "absent":
      return true;
    case "error": {
      if (junction.code !== "EISDIR") return true;
      let resolved = realpathCacheEntry(dirname(finding));
      return resolved === null || neverAllowsLocalWsl(resolved) || !isRealPathNonUnc(parse(resolved).root);
    }
  }
}
//@ chunk-cm73gsrm.js:13899-14061 placement
/**
 * plugin-authoring 内置插件声明的函数钩子能力清单。
 */
var PLUGIN_AUTHORING_HOOK_SCAN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cm73gsrm.js:13899", () => {
  PLUGIN_AUTHORING_HOOK_SCAN = __commonJS(function (scanSecretsModule, scanSecretsExports) {
    scanSecretsExports.exports = {
      scan: {
        hooks: ["skill.prompt", "tool.check", "tool.call"],
        calls: ["tool.check", "tool.list", "tool.register", "ui.ask"],
      },
      files: {},
    };
  });
});
//@ chunk-cm73gsrm.js:14061-14071 placement
/**
 * plugin-authoring 技能模块的导出表（分享面文案、技能名与描述、文件与提示词）。
 */
var PLUGIN_AUTHORING_SKILL_MODULE = {};
//@ chunk-cm73gsrm.js:14071-14656 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cm73gsrm.js:14071", () => {
  __export(PLUGIN_AUTHORING_SKILL_MODULE, {
    CLOUD_SURFACE: () => CLOUD_SURFACE_NOTE,
    EXISTING_REMOTES_ONLY: () => GIT_PUSH_ONLY_SHARING_NOTE,
    HOSTED_SURFACE: () => HOSTED_SURFACE_NOTE,
    ORGANIZATION_LIBRARY: () => ORGANIZATION_LIBRARY_NOTE,
    ORGANIZATION_LIBRARY_OFFER: () => ORG_LIBRARY_SHARING_NOTE,
    PACKAGE_ANY_PLAN: () => SHARE_OR_SEND_NOTE,
    PACKAGE_OFFER: () => CLOUD_SHARING_NOTE,
    PACKAGE_ORGANIZATION_PLAN: () => SHARE_AFTER_SAVE_NOTE,
    PACKAGE_PERSONAL_PLAN: () => SEND_FILE_SHARE_NOTE,
    SESSION_SURFACE_PLACEHOLDER: () => SESSION_SURFACE_PLACEHOLDER,
    SHARE_OFFER: () => TERMINAL_SHARING_NOTE,
    SKILL: () => PLUGIN_AUTHORING_SKILL,
    SKILL_DESCRIPTION: () => PLUGIN_AUTHORING_DESCRIPTION,
    SKILL_DIR_PLACEHOLDER: () => SKILL_DIR_PLACEHOLDER,
    SKILL_NAME: () => PLUGIN_AUTHORING_2,
    TERMINAL_SURFACE: () => TERMINAL_SURFACE_NOTE,
    TYPES_FILE: () => TYPES_CLAUDE_CODE_D_TS,
    default: () => PLUGIN_AUTHORING_SKILL_MODULE,
    isAvailable: () => isPluginAuthoringHooksAllowed,
    registerPlugin: () => PLUGIN_AUTHORING_PLUGIN,
    sessionSurfaceOf: () => describeSharingSurface,
    skillFilesMissingNoteOf: () => FILES_NOT_WRITTEN_NOTE,
    skillFilesOf: () => loadPluginAuthoringFiles,
    skillPromptOf: () => buildPrompt,
  });
});
//@ chunk-cm73gsrm.js:14656-14665 placement
/**
 * scan_secrets 技能模块的导出表（工具名、spec、注册入口）。
 */
var SECRET_SCAN_SKILL_MODULE = {};
//@ chunk-cm73gsrm.js:14665-14809 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cm73gsrm.js:14665", () => {
  __export(SECRET_SCAN_SKILL_MODULE, {
    SEND_FILE_TOOL: () => SENDUSERFILE,
    SKILL_NAME: () => PLUGIN_AUTHORING,
    TOOL: () => MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
    TOOL_NAME: () => SCAN_SECRETS_TOOL_NAME,
    TOOL_SPEC: () => SCAN_SECRETS_TOOL_SPEC,
    default: () => SECRET_SCAN_SKILL_MODULE,
    register: () => registerScanHooksWithoutScanning,
    registerHooks: () => registerSecretScanSkillHook,
  });
});
//@ chunk-cm73gsrm.js:14809-14825 placement
/**
 * 是否允许插件创作技能的 hooks 模块。
 */
var isPluginAuthoringHooksAllowed = () => areHooksModulesAllowed();
//@ chunk-cm73gsrm.js:14825-15719 placement
/**
 * scan_secrets 工具的名字、描述与输入 schema。
 */
var SCAN_SECRETS_TOOL_NAME = "scan_secrets";
var MCP_PLUGIN_AUTHORING_SCAN_SECRETS = "mcp__plugin-authoring__scan_secrets";
var SENDUSERFILE = "SendUserFile";
var PLUGIN_AUTHORING = "plugin-authoring";
var SCAN_SECRETS_TOOL_SPEC = {
  name: "scan_secrets",
  description:
    "Scans the files in a mod's folder, before the mod is shared, for known key and token formats, reading them as they are on disk now (it runs no git and reads nothing in .git). Starts and ends its answer with a Result: line. Names the files with a possible secret and the kind of secret, never the value (up to 100; the rest are counted), and the files and folders it did not scan and why (up to 30; the rest are counted), and says where the folder was too large to look at in full; a file name that holds a secret is shown as <name holding a secret>. Reads only; changes nothing.",
  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description: "The mod's folder, as an absolute path: the top folder of its git repository",
      },
    },
    required: ["folder"],
  },
};
//@ chunk-cm73gsrm.js:15719-15758 placement
var SCAN_IT_LABEL = "Scan it";
var CHECK_THEM_LABEL = "Check them";
var PATH_LIST_CHUNK = 32;
//@ chunk-cm73gsrm.js:15758-15832 placement
/**
 * 把文本结果包成工具结果（失败时带 isError）。
 */
function toolResultFromText(toolResult) {
  return toolResult.isError
    ? {
        result: toolResult.text,
        isError: true,
      }
    : {
        result: toolResult.text,
      };
}
//@ chunk-cm73gsrm.js:15832-15943 placement
var READ_UNAVAILABLE_REASON = "Read is not available in this session";
var PERMISSION_CHECK_FAILED_REASON = "the secret scan could not check its permission";
var MAX_CACHED_DECISIONS = 64;
var MAX_SEEN_PATHS = 64;
//@ chunk-cm73gsrm.js:15943-18694 placement
/**
 * 在 skill.prompt 中注入 scan_secrets 是否可用的说明（合规关闭、托管设置不可读等）。
 */
function registerSecretScanSkillHook(on, host) {
  let scanUnavailableReason;
  on(
    "skill.prompt",
    {
      skill: PLUGIN_AUTHORING,
      source: "built-in",
    },
    async (ctx, base, proceed) => {
      let basePrompt = await proceed(base);
      let offReason = host.complianceOff();
      let unavailable =
        offReason !== undefined
          ? SCAN_OFF_REASONS[offReason]
          : scanUnavailableReason === undefined
            ? await registerScanTool(ctx)
            : (await isMcpToolListed(ctx, MCP_PLUGIN_AUTHORING_SCAN_SECRETS))
              ? undefined
              : scanUnavailableReason;
      scanUnavailableReason = unavailable === TOOL_NOT_LISTED_REASON ? unavailable : undefined;
      return unavailable === undefined
        ? basePrompt
        : {
            ...basePrompt,
            text:
              basePrompt.text +
              `

The secret scan tool is not available in this session: ` +
              unavailable +
              " So the scan in the share steps cannot run here, and a mod cannot be shared until it can: do not open, print or search any file in the folder of a mod to be shared, and tell the person why it can't be shared.",
          };
    },
  );
  on(
    "tool.check",
    {
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
    },
    async (ctx, request, proceed) => {
      let decision = await proceed(request);
      let folder = request.input.folder;
      if (
        decision.decision === "deny" ||
        decision.rule !== undefined ||
        decision.hook !== undefined ||
        typeof folder !== "string"
      )
        return decision;
      let readCheck = await ctx.tool
        .check({
          tool: "Read",
          input: {
            file_path: host.absolute(folder),
          },
        })
        .catch(() => {
          return;
        });
      if (readCheck === undefined)
        return {
          decision: "deny",
          reason: READ_UNAVAILABLE_REASON,
        };
      return {
        decision: readCheck.decision === "allow" && decision.ceiling === "ask" ? "ask" : readCheck.decision,
        ...(readCheck.reason !== undefined && {
          reason: readCheck.reason,
        }),
        ...(readCheck.rule !== undefined && {
          rule: readCheck.rule,
        }),
        ...(decision.ceiling !== undefined && {
          ceiling: decision.ceiling,
        }),
      };
    },
  ).catch(() => ({
    decision: "deny",
    reason: PERMISSION_CHECK_FAILED_REASON,
  }));
  let rememberedPaths = new Set();
  let decisions = new Map();
  on(
    "tool.call",
    {
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
    },
    async (ctx, call) => {
      let offReason = host.complianceOff();
      if (offReason !== undefined) {
        rememberPath(rememberedPaths, call.tool_use_id);
        return toolResultFromText(host.refuse(SCAN_OFF_REASONS_SHORT[offReason], false));
      }
      let folder = call.folder;
      if (typeof folder !== "string" || folder === "") {
        let refusal = host.refuse(
          "no folder was given; the scan takes the mod's folder, as an absolute path, in its folder argument.",
        );
        return toolResultFromText(refusal);
      }
      let managedHook = host.managedReadHook();
      if (managedHook !== undefined) {
        rememberPath(rememberedPaths, call.tool_use_id);
        return toolResultFromText(
          managedHook === "hooks"
            ? host.refuse(MANAGED_READ_HOOK_NOTE, "managed_read_hook")
            : host.refuse(MANAGED_SETTINGS_UNREADABLE_NOTE, "managed_settings_unreadable"),
        );
      }
      let absFolder = host.absolute(folder);
      let shownFolder = host.shownPlain(absFolder);
      if (host.isNetworkPath(folder)) {
        rememberPath(rememberedPaths, call.tool_use_id);
        return toolResultFromText(
          host.refuse(
            `the scan reads only folders it can tell are on this computer, and ${shownFolder} is not one.`,
          ),
        );
      }
      let readPermission = await checkScanReadPermission(ctx, absFolder, shownFolder, {
        mayAsk: host.mayAsk,
        inChat: host.inChat,
        resolveFolder: () => host.resolveFolder(absFolder),
        wasAllowed: (toolUseId, identity) => {
          let remembered = decisions.get(host.session() + "\x00" + toolUseId);
          return remembered?.dev === identity.dev && remembered.ino === identity.ino;
        },
        allow: (toolUseId, identity) =>
          rememberDecision(decisions, host.session() + "\x00" + toolUseId, identity),
      });
      if (readPermission.refusal !== undefined) {
        rememberPath(rememberedPaths, call.tool_use_id);
        let refusal = host.refuse(readPermission.refusal);
        return toolResultFromText(refusal);
      }
      let { real, identity, answeredRule } = readPermission;
      rememberPath(rememberedPaths, call.tool_use_id);
      let scanResult = await host.scan(
        real,
        async (paths) => {
          let refused = new Set();
          for (let index = 0; index < paths.length; index += PATH_LIST_CHUNK)
            await Promise.all(
              paths.slice(index, index + PATH_LIST_CHUNK).map(async (path) => {
                let readVerdict = await ctx.tool
                  .check({
                    tool: "Read",
                    input: {
                      file_path: path,
                    },
                  })
                  .catch(() => {
                    return;
                  });
                if (
                  readVerdict === undefined ||
                  readVerdict.decision === "deny" ||
                  (readVerdict.decision === "ask" &&
                    readVerdict.rule !== undefined &&
                    readVerdict.rule !== answeredRule)
                )
                  refused.add(path);
              }),
            );
          return refused;
        },
        identity,
        absFolder,
      );
      if (scanResult.changed === true) decisions.delete(host.session() + "\x00" + real);
      return toolResultFromText(scanResult);
    },
  ).catch((error, catchArg) => {
    let refusal = host.refuse(
      "the scan did not finish.",
      catchArg.tool_use_id === undefined || !rememberedPaths.has(catchArg.tool_use_id),
    );
    return toolResultFromText(refusal);
  });
  if (host.inChat())
    on(
      "tool.call",
      {
        tool: SENDUSERFILE,
      },
      async (ctx, request, proceed) => {
        let result = await proceed(request);
        host.handedOver(
          request.files,
          result.deny === undefined && result.isError === undefined ? result.result : undefined,
        );
        return result;
      },
    ).catch((error, refusal, handledError) => handledError(refusal));
}
//@ chunk-cm73gsrm.js:18694-21665 placement
/**
 * 检查扫描能否读取目标文件夹（权限规则、托管读钩子）。
 */
async function checkScanReadPermission(host, folderPath, shownFolder, hooks) {
  let scanCheck = await host.tool
    .check({
      tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
      input: {
        folder: folderPath,
      },
    })
    .catch(() => {
      return;
    });
  if (scanCheck === undefined)
    return {
      refusal: `Claude Code could not check whether the scan may read ${shownFolder}.`,
    };
  if (scanCheck.decision === "deny")
    return {
      refusal:
        scanCheck.reason === READ_UNAVAILABLE_REASON || scanCheck.reason === PERMISSION_CHECK_FAILED_REASON
          ? `Claude Code could not check whether the scan may read ${shownFolder}.`
          : `the permission settings do not allow the scan to read ${shownFolder}.`,
    };
  let readCheck =
    scanCheck.rule === undefined
      ? undefined
      : await host.tool
          .check({
            tool: "Read",
            input: {
              file_path: folderPath,
            },
          })
          .catch(() => {
            return;
          });
  if (scanCheck.rule !== undefined && readCheck?.decision !== "allow" && readCheck?.decision !== "ask")
    return {
      refusal:
        readCheck === undefined
          ? `Claude Code could not check whether the scan may read ${shownFolder}.`
          : `the permission settings do not allow the scan to read ${shownFolder}.`,
    };
  let rule = readCheck?.decision === "ask" ? readCheck.rule : undefined;
  let decision = scanCheck.decision === "allow" && rule !== undefined ? "ask" : scanCheck.decision;
  let mayRemember =
    decision === "ask" &&
    scanCheck.rule === undefined &&
    scanCheck.hook === undefined &&
    scanCheck.ceiling !== "ask";
  if (decision === "ask" && !mayRemember && !hooks.mayAsk())
    return {
      refusal: askNotPossibleRefusal(shownFolder),
    };
  let folder = await hooks.resolveFolder();
  let folderProblem = folder.network
    ? `the scan could not tell that ${shownFolder} is a folder on this computer.`
    : folder.unidentified
      ? `the scan does not run on ${shownFolder}: its file system does not tell folders apart (it gives them no inode numbers).`
      : folder.real === undefined || folder.identity === undefined
        ? `the scan could not read ${shownFolder}.`
        : undefined;
  let resolved =
    folderProblem === undefined
      ? {
          real: folder.real,
          identity: folder.identity,
        }
      : undefined;
  let realPathCheck =
    decision === "allow" && resolved !== undefined && resolved.real !== folderPath
      ? await host.tool
          .check({
            tool: MCP_PLUGIN_AUTHORING_SCAN_SECRETS,
            input: {
              folder: resolved.real,
            },
          })
          .catch(() => null)
      : undefined;
  if (decision === "allow" && realPathCheck?.decision !== "ask") {
    if (resolved === undefined)
      return {
        refusal: folderProblem,
      };
    if (
      realPathCheck === null ||
      realPathCheck?.reason === READ_UNAVAILABLE_REASON ||
      realPathCheck?.reason === PERMISSION_CHECK_FAILED_REASON
    )
      return {
        refusal: `Claude Code could not check whether the scan may read ${shownFolder}.`,
      };
    if (realPathCheck !== undefined && realPathCheck.decision !== "allow")
      return {
        refusal: `${shownFolder} leads to another folder, through a link, and the permission settings do not allow the scan to read that folder.`,
      };
    return resolved;
  }
  if (mayRemember && resolved !== undefined && hooks.wasAllowed(resolved.real, resolved.identity))
    return resolved;
  if (!hooks.mayAsk())
    return {
      refusal: askNotPossibleRefusal(shownFolder),
    };
  let isCheckOnly = hooks.inChat() && mayRemember && resolved !== undefined && resolved.real === folderPath;
  let acceptLabel = isCheckOnly ? CHECK_THEM_LABEL : SCAN_IT_LABEL;
  let answer = await (
    isCheckOnly
      ? host.ui.ask(
          `Check the files in this folder and its subfolders for secret keys first?
${folder.shown}
Claude is told which files might hold one and what kind, never the key itself. A yes covers this folder for the rest of this session.`,
          {
            options: [acceptLabel, "Don't check"],
            header: "Key check",
          },
        )
      : host.ui.ask(
          `Scan the files in this folder for keys and tokens before the mod is shared?
${folder.shown}
The scan reads each file in the folder and its subfolders, except .git, and reports only which files may hold one and what kind, never the value.` +
            (mayRemember ? " A yes holds for this folder until /clear or Claude Code restarts." : ""),
          {
            options: [acceptLabel, "Don't scan"],
            header: "Secret scan",
          },
        )
  ).catch(() => {
    return;
  });
  if (answer !== acceptLabel)
    return {
      refusal:
        answer === undefined
          ? `nobody answered whether the scan may read ${shownFolder}: the question was dismissed or got no answer, or this session does not ask.`
          : `the person did not choose "${acceptLabel}" when asked whether the scan may read ${shownFolder}.`,
    };
  if (resolved === undefined)
    return {
      refusal: folderProblem,
    };
  if (mayRemember) hooks.allow(resolved.real, resolved.identity);
  let answeredRule = realPathCheck?.decision === "ask" ? realPathCheck.rule : (rule ?? scanCheck.rule);
  return answeredRule === undefined
    ? resolved
    : {
        ...resolved,
        answeredRule,
      };
}
//@ chunk-cm73gsrm.js:21665-21758 placement
/**
 * 记下已见路径，超过上限时逐出最早加入的。
 */
function rememberPath(toolUseId, toolUseId_2) {
  if (toolUseId_2 === undefined) return;
  toolUseId.add(toolUseId_2);
  if (toolUseId.size > MAX_SEEN_PATHS) toolUseId.delete(toolUseId.values().next().value);
}
//@ chunk-cm73gsrm.js:21758-21833 placement
/**
 * 记下某路径的判定结果，超过缓存上限时逐出最早的。
 */
function rememberDecision(seenPaths, toolUseId, decision) {
  seenPaths.set(toolUseId, decision);
  if (seenPaths.size > MAX_CACHED_DECISIONS) seenPaths.delete(seenPaths.keys().next().value);
}
//@ chunk-cm73gsrm.js:21833-22133 placement
/**
 * 托管设置无法读取时说明「扫描不读文件」的两个文案。
 */
var MANAGED_READ_HOOK_NOTE =
  "your organization runs its own checks before files are read, and the scan can't run those checks, so it doesn't read files here.";
var MANAGED_SETTINGS_UNREADABLE_NOTE =
  "your organization's managed settings could not be read, so the scan can't tell whether they check files before they're read, and it doesn't read files here.";
//@ chunk-cm73gsrm.js:22133-22248 placement
function askNotPossibleRefusal(folder) {
  return `the permission settings ask before the scan reads ${folder}, and this session cannot ask anyone.`;
}
//@ chunk-cm73gsrm.js:22248-22752 placement
/**
 * 合规关闭扫描的原因文案与对应的简短版本。
 */
var SCAN_OFF_REASONS = {
  tainted: "your organization's compliance settings turn it off.",
  pending:
    "your organization's policy has not loaded, and the scan cannot run until it does; once it has, loading the skill again adds the tool.",
};
var SCAN_OFF_REASONS_SHORT = {
  tainted: "your organization's compliance settings turn the scan off.",
  pending: "your organization's policy has not loaded, and the scan cannot run until it does.",
};
var TOOL_NOT_LISTED_REASON =
  "Claude Code did not list it, which usually means a permission rule or an organization's MCP server policy blocks it.";
//@ chunk-cm73gsrm.js:22752-22906 placement
async function registerScanTool(host) {
  try {
    let { tool } = await host.tool.register(SCAN_SECRETS_TOOL_SPEC);
    return (await isMcpToolListed(host, tool)) ? undefined : TOOL_NOT_LISTED_REASON;
  } catch (error) {
    return describeNoBuiltinTools(error instanceof Error ? error.message : String(error));
  }
}
//@ chunk-cm73gsrm.js:22906-22993 placement
/**
 * 当前 MCP 工具列表里是否有该工具名。
 */
async function isMcpToolListed(host, toolName) {
  return (await host.tool.list().catch(() => [])).some((listedTool) => listedTool.name === toolName);
}
//@ chunk-cm73gsrm.js:22993-23497 placement
function describeNoBuiltinTools(registrationError) {
  if (registrationError.includes("--bare"))
    return "this session runs with --bare, which takes no tools from built-in plugins.";
  if (registrationError.includes("no built-in tools")) return "this session was started with no tools.";
  if (registrationError.includes("cannot add tools at run time"))
    return "this kind of session cannot add tools while it runs.";
  if (registrationError.includes("no session is bound")) return "no session was running to add it to.";
  return `Claude Code refused to add it (${registrationError.replace(/^.*?\$\.tool\.register:\s*/s, "").replace(/[.\s]+$/, "")}).`;
}
//@ chunk-cm73gsrm.js:23497-23897 placement
/**
 * 构建不带扫描时注册 scan_secrets 的 skill 钩子：把一组恒等/恒假的 host 桩塞给 registerSecretScanSkillHook，使 skill 提示词仍能告诉模型“此会话无法扫描、不能分享”。
 */
function registerScanHooksWithoutScanning(reason) {
  let failureResult = (detail) => ({
    text: `Result: the scan could not run: ${detail}`,
    isError: true,
  });
  registerSecretScanSkillHook(reason, {
    absolute: (path) => path,
    shownPlain: (path) => path,
    isNetworkPath: () => false,
    resolveFolder: async (folder) => ({
      network: false,
      real: folder,
      identity: {
        dev: 0n,
        ino: 0n,
      },
      shown: folder,
    }),
    mayAsk: () => false,
    managedReadHook: () => {
      return;
    },
    complianceOff: () => {
      return;
    },
    session: () => "",
    inChat: () => false,
    handedOver: () => {},
    refuse: failureResult,
    scan: async () => failureResult("this build carries no scan."),
  });
}
//@ chunk-cm73gsrm.js:23997-24210 placement
/**
 * 扫描上限与检测用的常量：总字节、目录条目、插件清单、密钥正则、类型标签与占位符。
 */
var SCAN_MAX_TOTAL_BYTES = 10485760;
var MAX_SCAN_TOTAL_BYTES = 26214400;
var MAX_SCAN_DIR_ENTRIES = 20000;
var PLUGIN_MANIFEST_FILES = [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"];
var MAX_MANIFEST_BYTES = 1048576;
var ANTHROPIC_KEY_IN_PATH_REGEX = /(?:^|[^A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{40,}/;
var ANTHROPIC_KEY_LABEL = "Anthropic Key";
var SECRET_IN_NAME_PLACEHOLDER = "<name holding a secret>";
//@ chunk-cm73gsrm.js:24210-24336 placement
function redactSecretsInPath(path, placeholder = SECRET_IN_NAME_PLACEHOLDER) {
  let joined = path
    .split(/([\\/])/)
    .map((segment) =>
      segment !== "/" && segment !== "\\" && scanForSecrets_2(segment).length > 0 ? placeholder : segment,
    )
    .join("");
  return scanForSecrets_2(joined).length > 0 ? placeholder : joined;
}
//@ chunk-cm73gsrm.js:24336-24397 placement
/**
 * 报告里展示路径前先脱敏，并把占位符还原成「含密钥的名字」。
 */
function redactPathForReport(path) {
  return quoteForReport(redactSecretsInPath(path, "\x00")).replaceAll("\x00", SECRET_IN_NAME_PLACEHOLDER);
}
//@ chunk-cm73gsrm.js:24397-24665 placement
function quoteForReport(text) {
  let replaced = text.replaceAll("\x00", "_");
  if (/^[!-~](?:[ -~]*[!-~])?$/.test(replaced) && !/["\\:<>]/.test(replaced)) return text;
  return `"${[...text].map((char) => (char === "\x00" ? char : char === '"' || char === "\\" ? `\\${char}` : /[ -~]/.test(char) && char !== "<" && char !== ">" ? char : `\\u{${char.codePointAt(0).toString(16)}}`)).join("")}"`;
}
//@ chunk-cm73gsrm.js:24665-24681 placement
var REPLACEMENT_CHAR = "\uFFFD";
//@ chunk-cm73gsrm.js:24681-26886 placement
/**
 * 收集要扫描的文件（拒绝 .git 内、不可读、超总大小、链接/硬链接/LFS 指针）。
 */
async function collectScanFiles(
  folderPath,
  { maxTotalBytes = MAX_SCAN_TOTAL_BYTES, readDenied, approved } = {},
) {
  if (folderPath.split(/[\\/]/).some(isGitDir))
    return {
      ok: false,
      error: "the folder is a .git folder or inside one, which the scan does not read",
    };
  let folderStats;
  try {
    folderStats = await stat(folderPath, {
      bigint: true,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        approved !== undefined
          ? FOLDER_CHANGED_ERROR
          : isENOENT(error)
            ? "no such folder"
            : "the folder cannot be read",
    };
  }
  if (approved !== undefined && (folderStats.dev !== approved.dev || folderStats.ino !== approved.ino))
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  if (!folderStats.isDirectory())
    return {
      ok: false,
      error: "not a folder",
    };
  let linkStats = await lstat(folderPath, {
    bigint: true,
  }).catch(() => {
    return;
  });
  if (linkStats === undefined)
    return {
      ok: false,
      error: approved !== undefined ? FOLDER_CHANGED_ERROR : "the folder cannot be read",
    };
  if (!linkStats.isDirectory())
    return {
      ok: false,
      error: "the folder is a link, not the folder it leads to",
    };
  let scanFile = await readScanFileSafely(folderPath, {
    dev: linkStats.dev,
    ino: linkStats.ino,
  });
  if (scanFile === undefined)
    return {
      ok: false,
      error: "the folder cannot be read",
    };
  if (scanFile === "changed")
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  let mapped = [...scanFile.skipped].map(([path, reason]) => ({
    path,
    reason,
  }));
  let toRead = [];
  let usedBytes = 0;
  for (let [path, { size }] of [...scanFile.files].toSorted(
    ([leftPath, leftInfo], [rightPath, rightInfo]) =>
      Number(isSkippedScanDir(leftPath)) - Number(isSkippedScanDir(rightPath)) ||
      leftInfo.size - rightInfo.size,
  ))
    if (size > SCAN_MAX_TOTAL_BYTES)
      mapped.push({
        path,
        reason: "too large",
      });
    else if (usedBytes + size > maxTotalBytes)
      mapped.push({
        path,
        reason: "total limit",
      });
    else {
      usedBytes += size;
      toRead.push(path);
    }
  let denied = readDenied === undefined ? new Set() : await readDenied(toRead);
  let findingsByPath = new Map();
  let manifestNames = new Map();
  for (let path of toRead) {
    if (denied.has(path)) {
      mapped.push({
        path,
        reason: "read denied",
      });
      continue;
    }
    let dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (!(await getFileIdentity(folderPath, dir, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
    let fileBytes = await isWindowsReservedPath(join(folderPath, path), scanFile.files.get(path));
    if (!(await getFileIdentity(folderPath, dir, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
    let scanResult = fileBytes === undefined ? "unreadable" : scanBufferForSecrets(fileBytes);
    if (Array.isArray(scanResult)) findingsByPath.set(path, scanResult);
    else
      mapped.push({
        path,
        reason: scanResult,
      });
    if (
      fileBytes !== undefined &&
      PLUGIN_MANIFEST_FILES.includes(path) &&
      fileBytes.length <= MAX_MANIFEST_BYTES
    )
      try {
        let pluginName = jsonParse(fileBytes.toString("utf8"))?.name;
        if (typeof pluginName === "string" && pluginName !== "") manifestNames.set(path, pluginName);
      } catch {}
    await yieldToEventLoop();
  }
  if (approved !== undefined && !(await getFileIdentity_3(folderPath, approved)))
    return {
      ok: false,
      error: FOLDER_CHANGED_ERROR,
    };
  for (let key of scanFile.folderIds.keys())
    if (!(await getFileIdentity(folderPath, key, scanFile.folderIds)))
      return {
        ok: false,
        error: FOLDER_CHANGED_ERROR,
      };
  let flattened = [...scanFile.files.keys(), ...scanFile.skipped.keys()].flatMap((path) => {
    let kinds = normalizeCaseForComparison_2([
      ...(findingsByPath.get(path) ?? []),
      ...scanForSecrets_2(path),
    ]);
    return kinds.length > 0
      ? [
          {
            path,
            kinds,
          },
        ]
      : [];
  });
  let pluginName = manifestNames.get(PLUGIN_MANIFEST_FILES[0]);
  let marketplaceName = manifestNames.get(PLUGIN_MANIFEST_FILES[1]);
  let compareEntries = (left, right) =>
    Number(isSkippedScanDir(left.path)) - Number(isSkippedScanDir(right.path)) ||
    (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return {
    ok: true,
    scannedCount: findingsByPath.size,
    findings: flattened.toSorted(compareEntries),
    notScanned: mapped.toSorted(compareEntries),
    ...(scanFile.capped && {
      capped: true,
    }),
    ...(pluginName !== undefined &&
      marketplaceName !== undefined && {
        pluginNames: {
          plugin: pluginName,
          marketplace: marketplaceName,
        },
      }),
  };
}
//@ chunk-cm73gsrm.js:26886-27870 placement
async function readScanFileSafely(rootPath, rootIdentity) {
  let files = new Map();
  let skipped = new Map();
  let folderIds = new Map([["", rootIdentity]]);
  let isWindows = getPlatform() === "windows";
  let queue = [""];
  let deferredDirs = [];
  let entryCount = 0;
  let capped = false;
  for (
    let dir = queue.shift() ?? deferredDirs.shift();
    dir !== undefined;
    dir = queue.shift() ?? deferredDirs.shift()
  ) {
    if (!(await getFileIdentity(rootPath, dir, folderIds))) return "changed";
    let entries = await readdir(dir === "" ? rootPath : join(rootPath, dir), {
      withFileTypes: true,
    }).catch(() => {
      return;
    });
    if (entries === undefined) {
      if (dir === "") return;
      skipped.set(dir, "unreadable");
      continue;
    }
    for (let entry of entries) {
      if (isGitDir(entry.name)) continue;
      if (++entryCount > MAX_SCAN_DIR_ENTRIES) {
        capped = true;
        break;
      }
      let relPath = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (!isWindows && entry.isSymbolicLink()) {
        skipped.set(relPath, "link");
        continue;
      }
      let stats = await lstat(join(rootPath, relPath), {
        bigint: true,
      }).catch(() => {
        return;
      });
      if (stats === undefined) skipped.set(relPath, "unreadable");
      else if (stats.isFile() && stats.nlink > 1n) skipped.set(relPath, "hard link");
      else if (stats.isFile())
        files.set(relPath, {
          dev: stats.dev,
          ino: stats.ino,
          size: Number(stats.size),
        });
      else if (stats.isDirectory()) {
        if (await buildSecretScanResult(join(rootPath, relPath))) skipped.set(relPath, "link");
        else {
          folderIds.set(relPath, {
            dev: stats.dev,
            ino: stats.ino,
          });
          if (isSkippedScanDir(relPath)) deferredDirs.push(relPath);
          else queue.push(relPath);
        }
      } else skipped.set(relPath, stats.isSymbolicLink() ? "link" : "not a plain file");
    }
    if (!(await getFileIdentity(rootPath, dir, folderIds))) return "changed";
    if (capped) break;
  }
  return {
    files,
    skipped,
    folderIds,
    capped,
  };
}
//@ chunk-cm73gsrm.js:27870-28045 placement (2.1.88 match: getFileIdentity, 1)
async function getFileIdentity(rootPath, relPath, folderIds) {
  let folderId = folderIds.get(relPath);
  if (folderId === undefined) return true;
  let stats = await lstat(join(rootPath, relPath), {
    bigint: true,
  }).catch(() => {
    return;
  });
  return stats?.isDirectory() === true && stats.dev === folderId.dev && stats.ino === folderId.ino;
}
//@ chunk-cm73gsrm.js:28045-28091 placement
var SCAN_SKIP_DIRS = [".mcpb-cache", ".claude-plugin/types"];
//@ chunk-cm73gsrm.js:28091-28155 placement
function isSkippedScanDir(name) {
  return SCAN_SKIP_DIRS.some((skipDir) => name === skipDir || name.startsWith(`${skipDir}/`));
}
//@ chunk-cm73gsrm.js:28155-28202 placement
function isGitDir(name) {
  return name.toLowerCase() === ".git";
}
//@ chunk-cm73gsrm.js:28202-28734 placement
async function isWindowsReservedPath(filePath, stats) {
  if (getPlatform() === "windows") {
    let linkStats = await lstat(filePath, {
      bigint: true,
    }).catch(() => {
      return;
    });
    if (linkStats?.isFile() !== true || linkStats.dev !== stats.dev || linkStats.ino !== stats.ino) return;
  }
  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
  } catch {
    return;
  }
  try {
    let stats_2 = await handle.stat({
      bigint: true,
    });
    if (
      !stats_2.isFile() ||
      stats_2.nlink !== 1n ||
      stats_2.dev !== stats.dev ||
      stats_2.ino !== stats.ino ||
      isSentinelInode(stats_2.ino)
    )
      return;
    let buffer = Buffer.alloc(Math.min(stats.size, SCAN_MAX_TOTAL_BYTES) + 1);
    let totalRead = 0;
    while (totalRead < buffer.length) {
      let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
      if (bytesRead === 0) break;
      totalRead += bytesRead;
    }
    return totalRead > stats.size ? undefined : buffer.subarray(0, totalRead);
  } catch {
    return;
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-cm73gsrm.js:28734-28788 placement
/**
 * 扫描期间文件夹发生变化的错误文案。
 */
var FOLDER_CHANGED_ERROR = "the folder changed while it was being scanned";
//@ chunk-cm73gsrm.js:28788-28917 placement (2.1.88 match: getFileIdentity, 1)
async function getFileIdentity_2(filePath) {
  let stats = await stat(filePath, {
    bigint: true,
  }).catch(() => {
    return;
  });
  return stats === undefined || isSentinelInode(stats.ino)
    ? undefined
    : {
        dev: stats.dev,
        ino: stats.ino,
      };
}
//@ chunk-cm73gsrm.js:28917-28995 placement (2.1.88 match: getFileIdentity, 0.795)
async function getFileIdentity_3(filePath, name) {
  let stats = await getFileIdentity_2(filePath);
  return stats?.dev === name.dev && stats.ino === name.ino;
}
//@ chunk-cm73gsrm.js:29210-29312 sole-consumer
function scanBufferForSecrets(buffer) {
  let str = buffer.toString("utf8");
  let findings = scanForSecrets_2(str);
  return findings.length === 0 && str.startsWith(GIT_LFS_POINTER_PREFIX) ? "lfs pointer" : findings;
}
//@ chunk-cm73gsrm.js:29312-30313 placement
/**
 * 报告用的上限与未扫描原因的说明文案（单数/复数两套）。
 */
var SCAN_MAX_LISTED; // deferred: uses SCAN_MAX_TOTAL_BYTES of its import cycle while loading; runs once the cycle is complete
var MAX_LISTED_NOT_SCANNED;
var MAX_REPORT_LINE_CHARS;
var MAX_SECRET_KINDS_LISTED;
var NOT_SCANNED_REASONS;
var NOT_SCANNED_REASONS_PLURAL;
var regExp;
deferInit("chunk-cm73gsrm.js:29312", () => {
  SCAN_MAX_LISTED = 100;
  MAX_LISTED_NOT_SCANNED = 30;
  MAX_REPORT_LINE_CHARS = 300;
  MAX_SECRET_KINDS_LISTED = 3;
  NOT_SCANNED_REASONS = {
    "too large": `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
    "total limit": `the scan reads at most ${MAX_SCAN_TOTAL_BYTES / 1048576} MB in all`,
    "lfs pointer": "a Git LFS pointer",
    unreadable: "it could not be read",
    "read denied":
      "the person's Read permission rules do not allow reading it without asking, or could not be checked",
    link: "a link, which the scan does not follow",
    "hard link":
      "a hard link, a second name for a file that may sit outside the folder, which the scan does not read",
    "not a plain file": "not a plain file or folder",
  };
  NOT_SCANNED_REASONS_PLURAL = {
    "too large": () => `over ${SCAN_MAX_TOTAL_BYTES / 1048576} MB`,
    "total limit": () => `past the ${MAX_SCAN_TOTAL_BYTES / 1048576} MB total`,
    "lfs pointer": (count) => plural(count, "Git LFS pointer"),
    unreadable: () => "that couldn't be read",
    "read denied": () => "that the person's Read rules keep from the scan",
    link: (count) => plural(count, "link"),
    "hard link": (count) => plural(count, "hard link"),
    "not a plain file": (count) =>
      count === 1 ? "that is not a plain file or folder" : "that are not plain files or folders",
  };
  regExp = new RegExp(
    `${urlPatternToRegex(SECRET_IN_NAME_PLACEHOLDER)}|\\\\u\\{[0-9a-f]+\\}|\\\\["\\\\]|[\\s\\S]`,
    "gu",
  );
});
//@ chunk-cm73gsrm.js:30313-30644 placement
function truncateForReport(text, maxChars) {
  if (text.length <= maxChars) return text;
  let chars = text.match(regExp) ?? [];
  let max = Math.max(maxChars - 32, 8);
  let headBudget = Math.ceil(max / 3);
  let head = "";
  let headIndex = 0;
  while (headIndex < chars.length && head.length + chars[headIndex].length <= headBudget) {
    head += chars[headIndex];
    headIndex++;
  }
  let tail = "";
  let tailIndex = chars.length;
  while (tailIndex > headIndex && tail.length + chars[tailIndex - 1].length <= max - head.length) {
    tail = chars[tailIndex - 1] + tail;
    tailIndex--;
  }
  let omittedChars = text.length - head.length - tail.length;
  return `${head}\u2026(${omittedChars} characters left out)\u2026${tail}`;
}
//@ chunk-cm73gsrm.js:30644-30746 placement
function sanitizeForReport(text, maxChars) {
  let path = cleanForDisplay(stripCombiningRepeated(text)).replace(/[<>]/g, (char) =>
    char === "<" ? "\\u{3c}" : "\\u{3e}",
  );
  return truncateForReport(redactSecretsInPath(path), maxChars);
}
//@ chunk-cm73gsrm.js:30746-30790 placement
/**
 * 脱敏、去重复组合字符并截断的错误文本。
 */
function sanitizeErrorText(error) {
  return truncateWithCount(redactSecretsInPath(cleanForDisplay(stripCombiningRepeated(error))), 400);
}
//@ chunk-cm73gsrm.js:30790-32095 placement
function formatScanSkipped(path, scanResult) {
  let shownPath = sanitizeForReport(path, 200);
  if (!scanResult.ok)
    return {
      text: `Result: the scan could not run in ${shownPath}: ${sanitizeErrorText(scanResult.error)}`,
      isError: true,
    };
  let { scannedCount, findings, notScanned, capped } = scanResult;
  let joined = [
    ...(notScanned.length > 0
      ? [
          `${notScanned.length} ${plural(notScanned.length, "file or folder was", "files or folders were")} not scanned`,
        ]
      : []),
    ...(capped === true ? ["part of the folder was not looked at"] : []),
  ].join("; ");
  let headline =
    findings.length > 0
      ? `Result: possible secrets in ${findings.length} ${plural(findings.length, "file")}${joined === "" ? "" : `; ${joined}`}. Values are not shown.`
      : joined !== ""
        ? `Result: no known key or token format in the scanned files; ${joined}.`
        : "Result: no known key or token format found.";
  let sliced = findings.slice(0, SCAN_MAX_LISTED);
  let sliced_2 = notScanned.slice(0, MAX_LISTED_NOT_SCANNED);
  return {
    text: [
      headline,
      `Scanned ${scannedCount} ${plural(scannedCount, "file")} in ${shownPath} for known key and token formats.`,
      ...sliced.map((finding) =>
        formatSecretFinding(figures_default.cross, finding.path, summarizeSecretKinds(finding.kinds)),
      ),
      ...(findings.length > sliced.length
        ? [
            `${figures_default.cross} \u2026 and ${findings.length - sliced.length} more ${plural(findings.length - sliced.length, "file")} with possible secrets, not listed here.`,
          ]
        : []),
      ...sliced_2.map((finding) =>
        formatSecretFinding(
          figures_default.warning,
          finding.path,
          `not scanned (${NOT_SCANNED_REASONS[finding.reason]})`,
        ),
      ),
      ...(notScanned.length > sliced_2.length
        ? [
            `${figures_default.warning} \u2026 and ${notScanned.length - sliced_2.length} more not scanned: ${summarizeNotScannedReasons(notScanned.slice(sliced_2.length))}.`,
          ]
        : []),
      ...(capped === true
        ? [
            `${figures_default.warning} Only the first ${MAX_SCAN_DIR_ENTRIES.toLocaleString("en-US")} files and folders were looked at; the rest of the folder was not scanned, and which files it holds is unknown.`,
          ]
        : []),
      headline,
    ].join(`
`),
    isError: false,
  };
}
//@ chunk-cm73gsrm.js:32095-32204 placement
function summarizeSecretKinds(kinds) {
  let joined = kinds.slice(0, MAX_SECRET_KINDS_LISTED).join(", ");
  let omittedCount = kinds.length - MAX_SECRET_KINDS_LISTED;
  return omittedCount > 0 ? `${joined} and ${omittedCount} more ${plural(omittedCount, "kind")}` : joined;
}
//@ chunk-cm73gsrm.js:32204-32299 placement
/**
 * 拼出「路径 密钥种类: 说明」的一行（按长度上限截断）。
 */
function formatSecretFinding(finding, path, lineNumber) {
  let max = Math.max(40, MAX_REPORT_LINE_CHARS - lineNumber.length - finding.length - 3);
  return `${finding} ${truncateForReport(redactPathForReport(path), max)}: ${lineNumber}`;
}
//@ chunk-cm73gsrm.js:32299-32432 placement
function summarizeNotScannedReasons(paths) {
  let counts = new Map();
  for (let { reason } of paths) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts]
    .map(([reason, count]) => `${count} ${NOT_SCANNED_REASONS_PLURAL[reason](count)}`)
    .join("; ");
}
//@ chunk-cm73gsrm.js:32561-32651 placement
/**
 * 扫描是否被合规设置关闭：命中 hipaa/zdr 污点为 tainted，策略未载入为 pending。
 */
function scanOffReason() {
  let isMissing = isPolicyLimitsCacheMissing() || isPolicyVerdictAbsent();
  return hasComplianceTaint("hipaa") || hasComplianceTaint("zdr")
    ? "tainted"
    : isMissing
      ? "pending"
      : undefined;
}
//@ chunk-cm73gsrm.js:32651-32818 placement
var PLUGIN_FILE_EXTENSION; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var lastPackagedModState;
var stringOrStringArraySchema;
var attachmentsResultSchema;
deferInit("chunk-cm73gsrm.js:32651", () => {
  PLUGIN_FILE_EXTENSION = ".plugin";
  lastPackagedModState = identity(createValueSlot(), (slot) => slot.set(undefined));
  stringOrStringArraySchema = DoctorLazy(() =>
    union([stringSchema().transform((value) => [value]), array(stringSchema())]),
  );
  attachmentsResultSchema = DoctorLazy(() =>
    objectSchema({
      attachments: array(
        objectSchema({
          path: stringSchema(),
          upload_error: stringSchema().optional(),
        }),
      ),
    }),
  );
});
//@ chunk-cm73gsrm.js:32818-32878 placement
function noteLastPackagedMod(isClean, isClean_2) {
  lastPackagedModState.set({
    session: getSessionId(),
    name: basename(isClean),
    isClean: isClean_2,
  });
}
//@ chunk-cm73gsrm.js:32878-32907 placement
function clearLastPackagedMod() {
  lastPackagedModState.set(undefined);
}
//@ chunk-cm73gsrm.js:32907-33699 placement
function recordPackageHandOver(files, result) {
  let folder = skillWatchStateByHost.get()?.folder;
  let parsedFiles = stringOrStringArraySchema().safeParse(files);
  if (folder === undefined || !parsedFiles.success || scanOffReason() !== undefined) return;
  let attachmentResult = result === undefined ? undefined : attachmentsResultSchema().safeParse(result);
  let seenNames = new Set(
    (attachmentResult?.success === true ? attachmentResult.data.attachments : [])
      .filter((attachment) => attachment.upload_error === undefined)
      .map((attachment) => basename(attachment.path)),
  );
  let eventProps = {
    chat_origin: isClaudeAiChatOrigin(),
  };
  for (let filePath of parsedFiles.data) {
    let fileName = filePath.endsWith(PLUGIN_FILE_EXTENSION)
      ? basename(filePath, PLUGIN_FILE_EXTENSION)
      : undefined;
    let pluginRoot = fileName === undefined ? undefined : loadedModuleArgs(fileName)?.pluginRoot;
    if (
      fileName === undefined ||
      pluginRoot === undefined ||
      childNameUnder(resolve(folder), resolve(pluginRoot)) === undefined
    )
      continue;
    if (!seenNames.has(fileName + PLUGIN_FILE_EXTENSION)) {
      logFeatureBad(
        "plugin_authoring_package_hand_over",
        attachmentResult?.success === false ? "result_unread" : "not_delivered",
        eventProps,
      );
      continue;
    }
    let lastState = lastPackagedModState.get();
    if (lastState?.session !== getSessionId() || lastState.name !== fileName) {
      logFeatureSad("plugin_authoring_package_hand_over", "not_scanned", eventProps);
      continue;
    }
    if (lastState.isClean) logFeatureOk("plugin_authoring_package_hand_over", eventProps);
    else logFeatureSad("plugin_authoring_package_hand_over", "scan_not_clean", eventProps);
    clearLastPackagedMod();
  }
}
//@ chunk-cm73gsrm.js:33699-34184 placement
function buildScanCheckHooks() {
  if (policySettingsUnreadable()) return "unreadable";
  if (
    ["tool.call", "classic.PreToolUse"].some((file) =>
      hasModuleHookingSite(
        file,
        {
          tool: READ,
        },
        getLoadedModulesForSite(file).filter((policyTool) => isPolicyTier(policyTool.name)),
      ),
    )
  )
    return "hooks";
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === true) return;
  if (
    (settingsForSource?.hooks?.PreToolUse ?? []).some(
      (file) => file.hooks.length > 0 && isHookInputPathAllowed(file.matcher),
    )
  )
    return "hooks";
  let policyAllowedSet = getPolicyAllowedSet();
  if (policyAllowedSet === null || policyAllowedSet.size === 0) return;
  let registeredHooks = getRegisteredHooks();
  return registeredHooks === null ||
    (registeredHooks.PreToolUse ?? []).some(
      (entry) =>
        "pluginRoot" in entry &&
        policyAllowedSet.has(entry.pluginId) &&
        entry.hooks.length > 0 &&
        isHookInputPathAllowed(entry.matcher),
    )
    ? "hooks"
    : undefined;
}
export {
  buildSecretScanResult,
  REPLACEMENT_CHAR,
  ANTHROPIC_KEY_LABEL,
  ANTHROPIC_KEY_IN_PATH_REGEX,
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
  PLUGIN_AUTHORING_SKILL_MODULE,
};
