/**
 * services/remoteTools/commandRendering.ts
 *
 * 远程会话列出/渲染技能与插件命令（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b08ck61p.js (51)
 * attribution: placement 49, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, basename, resolve } from "path";
import { MAX_SKILLS_PER_PLUGIN, isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { isValidSkillDirName, stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import {
  isHostMountWorkStale,
  runHostMountWorkExclusive,
  resolvePublicCatalogRoot,
  readMountedSkillMd,
  COLLISION_LOSER,
} from "../../skills/hostSkillMounts.js";
import { withDeadline, sleep } from "../../utils/sleep.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  literal,
  _enum,
  array,
  booleanSchema,
  discriminatedUnion,
  unknown,
  union,
  zodStrictObject,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_MARKDOWN_FILE_BYTES, CLAUDE_CONFIG_DIRECTORIES_2 } from "../../utils/markdownConfigLoader.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { readSmallFileChecked } from "../../utils/readSmallFile.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import {
  clearSkillCaches,
  getSkillDirCommandsCached,
  conditionalSkillEntries,
  getDynamicSkills,
  parseSkillFileToCommand,
  isHostSkillCatalogEnabled,
  createHostCatalogSkill,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
} from "../../skills/loadSkillsDir.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { getProjectRoot, getMainLoopModelOverride, setMainLoopModelOverride } from "../../bootstrap/state.js";
import {
  isShadowedSkillName,
  isHostCatalogSkill,
  isKilledHostCatalogSkill,
  isSyncedSkill,
  isHiddenFromModel,
} from "../../utils/commandPredicates.js";
import { isSkillOff, getBuiltinCommands, passesPolicyGate } from "../../commands.js";
import { logForDebugging } from "../../utils/debug.js";
import { MAX_SUBSTITUTION_CHARS } from "../../utils/argumentSubstitution.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { identity } from "../../utils/identity.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../plugins/accountSync/pluginsScopeGate.js";
import { SHA256_HEX_RE, computeContentHash } from "../../utils/commitAttribution.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { readRepoRulesForRequest } from "../mcpServe/repoPermissionRules.js";
import { applicableSessionRules } from "./sessionRulesRendering.js";
import { serveModeDefaultAppState, serveModeTools } from "../../entrypoints/mcpServe/serveModeInput.js";
import { logError } from "../../utils/log.js";
import { toError, isAbortError, MalformedCommandError, isPathAbsent } from "../../utils/errors.js";
import { matchesToolName } from "../../Tool.js";
import { runWithRemoteSessionId } from "../../tools/AgentTool/agentEffort.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import { getBundledSkills } from "../../skills/bundledSkills.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  hasPendingSkillDownload,
  startPendingDownload,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  pluginInstallTimeoutMs,
  runFirstPluginsSync,
  rerunPluginsSync,
} from "../../utils/claudeAiSync/skillsSync.js";
import { reloadSyncedSkills, resetSkillSyncState } from "../skillsSync/skillsSync.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  syncedSkillRefusalReason,
  checkCommandSyncedAccess,
  isDefined,
  logSyncedCommandRefused,
} from "../../utils/claudeAiSync/syncedSkillAccess.js";
import {
  SYNCED_MANIFEST_FILE,
  stripInvisibleChars,
  syncedItemPath,
} from "../../utils/plugins/syncedItems.js";
import {
  MarketplaceSourceStrictSchema,
  CLAUDEAI_MARKETPLACE_KINDS,
  PluginManifestSchema,
  CommandMetadataSchema,
} from "../../utils/plugins/schemas.js";
import {
  MAX_PLUGIN_COMMAND_FILE_BYTES,
  getPluginCommands,
  loadPluginSkills,
  validatePluginCommandAllowedTools,
  pluginCommandHead,
} from "../../utils/plugins/loadPluginCommands.js";
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { loadPluginAgents } from "../../utils/plugins/loadPluginAgents.js";
import {
  loadAllPluginsCacheOnly,
  releaseSyncedDirsNotIn,
  loadPluginFromMarketplaceEntryCacheOnly,
  loadAllPluginsForPreview,
  syncedPluginFolderId,
  loadAllPlugins,
} from "../../utils/plugins/pluginLoader.js";
import { updatePluginsForMarketplaces } from "../../utils/plugins/pluginAutoupdate.js";
import { isSessionRefsSyncEnabled } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { waitForRemoteManagedSettingsToLoad } from "../remoteManagedSettings/loader.js";
import { env } from "../../utils/env.js";
import { installPluginsForHeadlessSerialized } from "../../utils/plugins/headlessPluginInstall.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasGuardHooks_2 } from "../../schemas/hookEntryValidation.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { isPluginsSyncVetoed } from "../plugins/accountSync/syncedPluginHooks.js";
import { canonicalFingerprint } from "../api/requestFingerprint.js";
import { countJsonMembers } from "../../utils/jsonScan.js";
import { pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b08ck61p.js:1981-2023 placement
var HOST_SKILL_READ_TIMEOUT_MS; // deferred: uses MAX_SKILLS_PER_PLUGIN (../../plugins/builtinPlugins.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CONCURRENT_SKILL_READS;
var SKILL_READ_TIMED_OUT;
deferInit("chunk-b08ck61p.js:1981", () => {
  HOST_SKILL_READ_TIMEOUT_MS = 1e4;
  MAX_CONCURRENT_SKILL_READS = MAX_SKILLS_PER_PLUGIN;
  SKILL_READ_TIMED_OUT = {
    reason: "timed_out",
  };
});
//@ chunk-b08ck61p.js:2023-2711 placement
/**
 * 读取宿主技能目录中的某个技能文本：已有缓存直接返回；否则排队（并发上限、前序工作未完成时拒绝）串行读取并缓存，等待时间超过上限返回 timed_out。
 */
async function readHostCatalogSkill(skillName) {
  if (!isValidSkillDirName(skillName))
    return {
      reason: "file_absent",
    };
  let hostCatalog = remoteToolsState().hostCatalog;
  let cached = hostCatalog.texts.get(skillName);
  if (cached !== undefined) return cached;
  let pending = hostCatalog.readingForCalls.get(skillName);
  if (pending === undefined) {
    if (isHostMountWorkStale())
      return {
        reason: "earlier_work_outstanding",
      };
    if (hostCatalog.readingForCalls.size >= MAX_CONCURRENT_SKILL_READS)
      return {
        reason: "too_many_reads",
      };
    let reading = hostCatalog.lastReadForCalls.then((probed) =>
      readHostCatalogEntry(hostCatalog, skillName, probed),
    );
    hostCatalog.lastReadForCalls = reading.then(
      ({ probed }) => probed,
      () => {
        return;
      },
    );
    pending = {
      reading: reading
        .then(({ outcome }) => outcome)
        .finally(() => {
          hostCatalog.readingForCalls.delete(skillName);
          if (hostCatalog.readingForCalls.size === 0)
            hostCatalog.lastReadForCalls = Promise.resolve(undefined);
        }),
      since: performance.now(),
    };
    hostCatalog.readingForCalls.set(skillName, pending);
  }
  let remainingMs = pending.since + HOST_SKILL_READ_TIMEOUT_MS - performance.now();
  return (
    (remainingMs > 0 ? await withDeadline(pending.reading, remainingMs) : undefined) ?? {
      reason: "timed_out",
    }
  );
}
//@ chunk-b08ck61p.js:2711-3055 placement
/**
 * 从宿主技能目录读取一个技能条目：必要时先探测目录，读到后缓存文本，返回结果与探测信息。
 */
async function readHostCatalogEntry(catalog, skillName, probed) {
  let isSameCatalog = () => remoteToolsState().hostCatalog === catalog;
  if (probed === undefined) await yieldToEventLoop();
  let probeOrRoot =
    probed ??
    (await runHostMountWorkExclusive(async () =>
      isSameCatalog() ? resolvePublicCatalogRoot() : SKILL_READ_TIMED_OUT,
    ));
  if ("reason" in probeOrRoot)
    return {
      outcome: probeOrRoot,
      probed: undefined,
    };
  await yieldToEventLoop();
  let outcome = await runHostMountWorkExclusive(async () => {
    let readOutcome = isSameCatalog()
      ? await readMountedSkillMd(probeOrRoot.root, skillName, probeOrRoot.device)
      : SKILL_READ_TIMED_OUT;
    if (!("reason" in readOutcome)) catalog.texts.set(skillName, readOutcome);
    return readOutcome;
  });
  return {
    outcome,
    probed: "reason" in outcome ? undefined : probeOrRoot,
  };
}
//@ chunk-b08ck61p.js:3084-3147 placement
/**
 * 列出项目命令的协议常量与上限：命令名、单条正文上限、每页条数，以及由此推导的载荷/页数上限。
 */
var LISTPROJECTCOMMANDS = "ListProjectCommands";
var MAX_LISTED_COMMAND_BYTES = 8388608;
var MAX_LISTED_COMMANDS_PER_PAGE = 2000;
var LIST_COMMANDS_PAYLOAD_CAP_BYTES = 4 * MAX_LISTED_COMMAND_BYTES;
var LIST_COMMANDS_PAGE_CAP = 4 * MAX_LISTED_COMMANDS_PER_PAGE;
//@ chunk-b08ck61p.js:3147-3225 placement
/**
 * 列出项目命令的输入 schema：分页游标 after 与 afterName。
 */
var listProjectCommandsInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b08ck61p.js:3147", () => {
  listProjectCommandsInputSchema = DoctorLazy(() =>
    objectSchema({
      after: numberSchema().int().min(0).optional(),
      afterName: stringSchema().optional(),
    }),
  );
});
//@ chunk-b08ck61p.js:3225-3369 placement
function isSettingsSkillOrCommand(command) {
  return (
    (command.source === "projectSettings" || command.source === "userSettings") &&
    (command.loadedFrom === "skills" || command.loadedFrom === "commands_DEPRECATED")
  );
}
//@ chunk-b08ck61p.js:3369-3654 placement
var LISTED_COMMAND_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LISTED_COMMANDS_PAGE_SCHEMA;
deferInit("chunk-b08ck61p.js:3369", () => {
  LISTED_COMMAND_SCHEMA = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(1024),
      source: literal("userSettings").optional(),
      loadedFrom: _enum(["skills", "commands_DEPRECATED"]),
      text: stringSchema().max(MAX_MARKDOWN_FILE_BYTES),
    }),
  );
  LISTED_COMMANDS_PAGE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      commands: array(LISTED_COMMAND_SCHEMA()).max(MAX_LISTED_COMMANDS_PER_PAGE),
      cut: booleanSchema(),
      refused: numberSchema().int().min(0),
      next: numberSchema().int().min(1).optional(),
      nextName: stringSchema().max(1024).optional(),
    }),
  );
});
//@ chunk-b08ck61p.js:3654-3744 placement
/**
 * 取宿主登记的技能文件路径；没有登记时退回 skillRoot/SKILL.md。
 */
function skillFilePathOf(command) {
  return (
    getHostState().skillFiles.get(command) ?? (command.skillRoot ? join(command.skillRoot, "SKILL.md") : "")
  );
}
//@ chunk-b08ck61p.js:3744-3850 placement
async function readSkillFileText(command) {
  let path = skillFilePathOf(command);
  if (path === "") return null;
  try {
    return await readSmallFileChecked(getFsImplementation(), path, MAX_MARKDOWN_FILE_BYTES);
  } catch {
    return null;
  }
}
//@ chunk-b08ck61p.js:3850-3898 placement
/**
 * 计算对象原始 JSON 序列化后的字节数（用于分页载荷计量）。
 */
function byteLengthOfJson(value) {
  return Buffer.byteLength(jsonStringifyRaw(value));
}
//@ chunk-b08ck61p.js:3898-4904 placement
async function listProjectCommands(input, signal, env) {
  let { after, afterName } = listProjectCommandsInputSchema().parse(input ?? {});
  let { storageV5 } = env.toolUseContext();
  if (!after) {
    clearSkillCaches();
    invalidateCommandNames();
  }
  let candidates = [
    ...(await getSkillDirCommandsCached(getProjectRoot(), storageV5)),
    ...conditionalSkillEntries(),
    ...getDynamicSkills(),
  ];
  signal.throwIfAborted();
  let seenNames = new Set();
  let listed = [];
  let bytes = 0;
  let cut = false;
  let refusedCount = 0;
  let index = 0;
  let next;
  let reachedAfterName = afterName === undefined;
  for (let candidate of candidates) {
    if (candidate.type !== "prompt" || seenNames.has(candidate.name)) continue;
    seenNames.add(candidate.name);
    let { name, source, loadedFrom } = candidate;
    if (!isSettingsSkillOrCommand(candidate) || isShadowedSkillName(candidate) || isSkillOff(candidate))
      continue;
    if (index++ < (after ?? 0)) continue;
    if (!reachedAfterName && name !== afterName) break;
    reachedAfterName = true;
    let text = await readSkillFileText(candidate);
    signal.throwIfAborted();
    let parsed = LISTED_COMMAND_SCHEMA().safeParse({
      name,
      ...(source === "userSettings" && {
        source,
      }),
      loadedFrom,
      text,
    });
    if (!parsed.success) {
      refusedCount++;
      logForDebugging(`ListProjectCommands: ${name} refused from the listing`, {
        level: "warn",
      });
      continue;
    }
    let entryBytes = byteLengthOfJson(parsed.data);
    let fits = bytes + entryBytes <= MAX_LISTED_COMMAND_BYTES;
    if (after !== undefined && (listed.length === MAX_LISTED_COMMANDS_PER_PAGE || !fits)) {
      next = {
        next: index - 1,
        nextName: name,
      };
      break;
    }
    if (listed.length === MAX_LISTED_COMMANDS_PER_PAGE) {
      cut = true;
      break;
    }
    if (!fits) {
      cut = true;
      continue;
    }
    bytes += entryBytes;
    listed.push(parsed.data);
  }
  if (!reachedAfterName) throw Error("the files have moved since the page before");
  return {
    summary: `${listed.length} commands${cut ? ", cut at a limit" : ""}${refusedCount > 0 ? `, ${refusedCount} refused` : ""}`,
    output: {
      commands: listed,
      cut,
      refused: refusedCount,
      ...next,
    },
  };
}
//@ chunk-b08ck61p.js:4904-6449 placement
/**
 * 读/渲染技能与内置命令的协议名与各类输入输出 schema 及上限（等待时间、参数长度、会话覆盖、交出命令等）。
 */
var SKILL_RENDER_OPS; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var RENDERSKILL;
var RENDERPINNEDSKILL;
var RENDERBUILTINCOMMAND;
var MAX_WAIT_MS;
var MAX_ERROR_MESSAGE_CHARS;
var MAX_COMMAND_ARGS_CHARS;
var MAX_BLOCK_TEXT_CHARS;
var MISSING_SKILL_RESYNC_INTERVAL_MS;
var MAX_SESSION_TOOLS;
var MAX_TOOL_NAME_CHARS;
var MAX_HANDED_OFF_COMMANDS;
var MAX_HANDED_OFF_COMMAND_CHARS;
var AGENT_TOOL_NAMES;
var skillReadQueue;
var optionalTrueFlagSchema;
var readSkillInputSchema;
var skillReadOutcomeSchema;
var renderSkillInputSchema;
var MAX_SESSION_RULES_CHARS;
var renderSkillWithSessionInputSchema;
var renderSkillExtendedInputSchema;
var renderSkillOutputSchema;
var skillFailureSchema;
var skillRenderResultSchema;
deferInit("chunk-b08ck61p.js:4904", () => {
  SKILL_RENDER_OPS = "ReadSkill";
  RENDERSKILL = "RenderSkill";
  RENDERPINNEDSKILL = "RenderPinnedSkill";
  RENDERBUILTINCOMMAND = "RenderBuiltInCommand";
  MAX_WAIT_MS = 110000;
  MAX_ERROR_MESSAGE_CHARS = 2000;
  MAX_COMMAND_ARGS_CHARS = 1e5;
  MAX_BLOCK_TEXT_CHARS = MAX_SUBSTITUTION_CHARS;
  MISSING_SKILL_RESYNC_INTERVAL_MS = 60000;
  MAX_SESSION_TOOLS = 4096;
  MAX_TOOL_NAME_CHARS = 256;
  MAX_HANDED_OFF_COMMANDS = 256;
  MAX_HANDED_OFF_COMMAND_CHARS = 32768;
  AGENT_TOOL_NAMES = [AGENT, REPORTFINDINGS, SKILL];
  skillReadQueue = identity(
    {
      last: Promise.resolve(),
    },
    (queue) => {
      queue.last = Promise.resolve();
    },
  );
  optionalTrueFlagSchema = DoctorLazy(() => literal(true).optional().catch(undefined));
  readSkillInputSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(1024),
      updatedAt: stringSchema().max(64).nullable(),
      waitMs: numberSchema().int().min(0).max(MAX_WAIT_MS),
      fromHostCatalog: optionalTrueFlagSchema(),
    }),
  );
  skillReadOutcomeSchema = DoctorLazy(() =>
    objectSchema({
      outcome: literal("missing"),
      syncing: booleanSchema(),
      fromHostCatalog: literal(true).optional(),
      withheld: literal(true).optional(),
    }),
  );
  renderSkillInputSchema = DoctorLazy(() =>
    discriminatedUnion("outcome", [
      objectSchema({
        outcome: literal("found"),
        text: stringSchema().max(MAX_SCOPE_RESPONSE_BYTES),
        fromHostCatalog: literal(true).optional(),
      }),
      skillReadOutcomeSchema(),
    ]),
  );
  MAX_SESSION_RULES_CHARS = DoctorLazy(() => unknown().optional());
  renderSkillWithSessionInputSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(1024),
      args: stringSchema().max(MAX_COMMAND_ARGS_CHARS),
      readOnly: booleanSchema(),
      waitMs: numberSchema().int().min(0).max(MAX_WAIT_MS),
      fromHostCatalog: optionalTrueFlagSchema(),
      expectSha256: stringSchema().regex(SHA256_HEX_RE).optional(),
      sessionRules: MAX_SESSION_RULES_CHARS(),
    }),
  );
  renderSkillExtendedInputSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(1024),
      args: stringSchema().max(MAX_COMMAND_ARGS_CHARS),
      readOnly: booleanSchema(),
      sessionRules: MAX_SESSION_RULES_CHARS(),
      model: stringSchema().min(1).max(256),
      session: objectSchema({
        tools: array(stringSchema().min(1).max(MAX_TOOL_NAME_CHARS)).max(MAX_SESSION_TOOLS).catch([]),
        isSkillPreload: booleanSchema().optional().catch(undefined),
        modelScheduledOrigin: booleanSchema().optional().catch(undefined),
        remoteSessionId: stringSchema().min(1).max(256).optional().catch(undefined),
        effort: union([_enum(EFFORT_LEVELS), numberSchema().int().min(0).max(1000)])
          .optional()
          .catch(undefined),
      })
        .optional()
        .catch(undefined),
    }),
  );
  renderSkillOutputSchema = DoctorLazy(() =>
    objectSchema({
      outcome: literal("rendered"),
      blocks: array(
        objectSchema({
          type: literal("text"),
          text: stringSchema().max(MAX_BLOCK_TEXT_CHARS),
        }),
      ).max(16),
      handedOff: array(
        zodStrictObject({
          command: stringSchema().min(1).max(MAX_HANDED_OFF_COMMAND_CHARS),
          tool: stringSchema().max(MAX_TOOL_NAME_CHARS),
        }),
      )
        .max(MAX_HANDED_OFF_COMMANDS)
        .optional(),
      fromHostCatalog: literal(true).optional(),
    }),
  );
  skillFailureSchema = DoctorLazy(() =>
    objectSchema({
      outcome: literal("failed"),
      message: stringSchema().max(MAX_ERROR_MESSAGE_CHARS),
    }),
  );
  skillRenderResultSchema = DoctorLazy(() =>
    discriminatedUnion("outcome", [
      renderSkillOutputSchema(),
      skillReadOutcomeSchema(),
      skillFailureSchema(),
    ]),
  );
});
//@ chunk-b08ck61p.js:6449-6930 placement
/**
 * 远程调用"读技能"：按名字找技能（宿主目录或本地，可等首次同步），被关闭/不可用时返回 missing，否则返回 SKILL.md 文本。
 */
async function serveReadSkill(input, signal, { toolUseContext }) {
  let { name, updatedAt, waitMs, fromHostCatalog } = readSkillInputSchema().parse(input);
  let found = fromHostCatalog
    ? await loadHostCatalogSkill(name)
    : await findSkillWithSync(name, waitMs, signal, toolUseContext(), updatedAt);
  let unavailableReason = found && skillUnavailableReason(found);
  if (unavailableReason !== undefined)
    return {
      summary: "no such skill",
      output: missingSkillOutput(unavailableReason, fromHostCatalog),
    };
  let text = fromHostCatalog
    ? (found?.getLoadedSkillMd?.() ?? null)
    : found?.skillRoot === undefined
      ? null
      : await readSmallFileChecked(
          getFsImplementation(),
          join(found.skillRoot, "SKILL.md"),
          MAX_SCOPE_RESPONSE_BYTES,
        ).catch(() => null);
  return text === null
    ? {
        summary: "no such skill",
        output: missingSkillOutput(undefined, fromHostCatalog),
      }
    : {
        summary: "found",
        output: {
          outcome: "found",
          text,
          ...(fromHostCatalog && {
            fromHostCatalog,
          }),
        },
      };
}
//@ chunk-b08ck61p.js:6930-7655 placement
async function readListedSkill(input, signal, { toolUseContext, launchPermissionContext }) {
  let { name, args, readOnly, waitMs, fromHostCatalog, expectSha256, sessionRules } =
    renderSkillWithSessionInputSchema().parse(input);
  let context = await renderContextWithRules(
    toolUseContext(),
    readOnly,
    sessionRules,
    launchPermissionContext,
    input,
  );
  let command = fromHostCatalog
    ? await loadHostCatalogSkill(name)
    : await findSkillWithSync(name, waitMs, signal, context);
  if (command !== undefined && isSettingsSkillOrCommand(command)) {
    clearSkillCaches();
    command = await findSkillWithSync(name, waitMs, signal, context);
  }
  let unavailableReason = command && skillUnavailableReason(command);
  if (command === undefined || unavailableReason !== undefined)
    return {
      summary: "no such skill",
      output: missingSkillOutput(unavailableReason, fromHostCatalog),
    };
  if (expectSha256 !== undefined) {
    command = await parseListedSkill(command, expectSha256);
    if (command === undefined || skillUnavailableReason(command) !== undefined)
      return {
        summary: "changed since listed",
        output: {
          outcome: "failed",
          message:
            "this skill's file changed after the session listed it, so it was not rendered; a new session lists the current file",
        },
      };
  }
  let rendered = await renderRemoteCommand(command, args, context, signal);
  return fromHostCatalog && rendered.output.outcome === "rendered"
    ? {
        ...rendered,
        output: {
          ...rendered.output,
          fromHostCatalog,
        },
      }
    : rendered;
}
//@ chunk-b08ck61p.js:7655-8086 placement
/**
 * 按会话规则与只读设置调整渲染上下文：读取仓库规则，计算适用的权限上下文与交接选项；无法确定时改为只读加载技能。
 */
async function renderContextWithRules(context, readOnly, sessionRules, launchPermissionContext, input) {
  if (!readOnly && sessionRules === undefined) return context;
  let repoRules = readOnly ? undefined : await readRepoRulesForRequest("The render", input);
  let rules =
    repoRules === undefined || repoRules.refused !== undefined
      ? undefined
      : applicableSessionRules(sessionRules, launchPermissionContext, repoRules.repoRules);
  if (rules === undefined)
    return {
      ...context,
      options: {
        ...context.options,
        readOnlySkillLoad: true,
      },
    };
  let { toolPermissionContext } = rules;
  return {
    ...context,
    getAppState: () => ({
      ...serveModeDefaultAppState(),
      toolPermissionContext,
    }),
    ...(rules.offersHandOff && {
      promptShellHandOff: [],
    }),
    ...(rules.classifiesEveryCall && {
      promptShellCallerClassifiesAll: true,
    }),
  };
}
//@ chunk-b08ck61p.js:8086-8424 placement
/**
 * 解析列出的技能：读取 SKILL.md，哈希与预期一致时解析为提示型命令。
 */
async function parseListedSkill(command, expectedHash) {
  let content = isHostCatalogSkill(command)
    ? (command.getLoadedSkillMd?.() ?? null)
    : await readSkillFileText(command);
  if (content === null || computeContentHash(content) !== expectedHash) return;
  try {
    let skillFileToCommand = parseSkillFileToCommand({
      content,
      skillFilePath: skillFilePathOf(command),
      skillName: command.name,
      source: command.source,
      baseDir: command.skillRoot,
      loadedFrom: command.loadedFrom ?? "skills",
      serverAttribution: command.serverAttribution,
    });
    return skillFileToCommand?.type === "prompt" ? skillFileToCommand : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-b08ck61p.js:8424-9107 placement
/**
 * 远程调用"渲染命令"：按会话规则、只读、effort、模型与可用工具构造上下文，找到命令后在临时覆盖主模型的情况下渲染其提示。
 */
async function serveRenderCommand(input, signal, { toolUseContext, launchPermissionContext }) {
  let { name, args, readOnly, sessionRules, model, session } = renderSkillExtendedInputSchema().parse(input);
  let context = await renderContextWithRules(
    toolUseContext(),
    readOnly,
    sessionRules,
    launchPermissionContext,
    input,
  );
  let effort = session?.effort;
  let extendedContext = {
    ...context,
    ...(effort !== undefined && {
      permissionLayers: [
        ...(context.permissionLayers ?? []),
        {
          kind: "effort",
          effort,
        },
      ],
    }),
    options: {
      ...context.options,
      mainLoopModel: model,
      ...(session && {
        tools: [
          ...context.options.tools,
          ...serveModeTools(false).filter(
            (tool) =>
              AGENT_TOOL_NAMES.some((agentToolName) => matchesToolName(tool, agentToolName)) &&
              session.tools.some((tool_2) => matchesToolName(tool, tool_2)) &&
              !context.options.tools.some((tool_2) => matchesToolName(tool_2, tool.name)),
          ),
        ],
        isSkillPreload: session.isSkillPreload,
        modelScheduledOrigin: session.modelScheduledOrigin,
      }),
    },
  };
  let command = getValueFromInput(name);
  if (command === undefined || skillUnavailableReason(command) !== undefined)
    return {
      summary: "no such command",
      output: missingSkillOutput(),
    };
  return withModelOverride(model, () =>
    runWithRemoteSessionId(session?.remoteSessionId, () =>
      renderRemoteCommand(command, args, extendedContext, signal),
    ),
  );
}
//@ chunk-b08ck61p.js:9107-9216 placement (2.1.88 match: getValueFromInput, 1)
function getValueFromInput(input) {
  initBundledSkills();
  for (let command of [...getBundledSkills(), ...getBuiltinCommands()])
    if (command.type === "prompt" && command.name === input && passesPolicyGate(command)) return command;
  return;
}
//@ chunk-b08ck61p.js:9216-9374 placement
async function withModelOverride(model, fn) {
  let run = skillReadQueue.last.then(async () => {
    let mainLoopModelOverride = getMainLoopModelOverride();
    setMainLoopModelOverride(model);
    try {
      return await fn();
    } finally {
      setMainLoopModelOverride(mainLoopModelOverride);
    }
  });
  skillReadQueue.last = run.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  return run;
}
//@ chunk-b08ck61p.js:9374-10200 placement
async function renderRemoteCommand(command, args, context, signal) {
  try {
    let promptForCommand = await command.getPromptForCommand(args, context);
    let flattened = promptForCommand.flatMap((block) =>
      block.type === "text"
        ? [
            {
              type: block.type,
              text: block.text,
            },
          ]
        : [],
    );
    let parsed = renderSkillOutputSchema().safeParse({
      outcome: "rendered",
      blocks: flattened,
      ...(context.promptShellHandOff?.length && {
        handedOff: context.promptShellHandOff,
      }),
    });
    if (flattened.length !== promptForCommand.length || !parsed.success)
      return {
        summary: "render refused",
        output: {
          outcome: "failed",
          message: context.promptShellHandOff?.length
            ? `the rendered skill is not plain text of a usable size, or it leaves Claude more than ${MAX_HANDED_OFF_COMMANDS} inline shell commands or one longer than ${MAX_HANDED_OFF_COMMAND_CHARS} characters`
            : "the rendered skill is not plain text of a usable size",
        },
      };
    return {
      summary: "rendered",
      output: parsed.data,
    };
  } catch (error) {
    if (isAbortError(error) || signal.aborted) throw error;
    if (!(error instanceof MalformedCommandError)) logError(toError(error));
    return {
      summary: "render failed",
      output: {
        outcome: "failed",
        message:
          error instanceof MalformedCommandError
            ? truncateToLength(error.message, MAX_ERROR_MESSAGE_CHARS)
            : "the skill could not be rendered",
      },
    };
  }
}
//@ chunk-b08ck61p.js:10200-10347 placement
function missingSkillOutput(reason, fromHostCatalog) {
  return {
    outcome: "missing",
    syncing: remoteToolsState().firstSyncPromise !== null,
    ...(reason === "account_skill_off" && {
      withheld: true,
    }),
    ...(fromHostCatalog && {
      fromHostCatalog,
    }),
  };
}
//@ chunk-b08ck61p.js:10347-10996 placement
/**
 * 查找技能：本地找不到时等待相应同步（技能名对应的同步、首次同步或限频的缺失重同步），超时后再查一次。
 */
async function findSkillWithSync(name, waitMs, signal, context, updatedAt = null) {
  let state = remoteToolsState();
  let timeout = sleep(waitMs, signal, {
    unref: true,
  });
  let raceWithTimeout = (promise) =>
    Promise.race([
      promise.catch(() => {
        return;
      }),
      timeout,
    ]);
  let localSkillCommand = await findLocalSkillCommand(name, context, updatedAt);
  let skillName = stripSyncedSkillPrefix(name);
  if (localSkillCommand === undefined && hasPendingSkillDownload(skillName)) {
    await raceWithTimeout(startPendingDownload(skillName));
    signal.throwIfAborted();
    localSkillCommand = await findLocalSkillCommand(name, context, updatedAt);
  }
  if (localSkillCommand !== undefined || !state.firstSyncPromise) return localSkillCommand;
  let firstSyncPromise = state.firstSyncPromise;
  if (state.firstRoundSettled) {
    let now = Date.now();
    if (now - state.missingSkillResyncAt >= MISSING_SKILL_RESYNC_INTERVAL_MS) {
      state.missingSkillResyncAt = now;
      let resync = reloadSyncedSkills(context.session, context.storageV5, context.credentials, {
        keepLandingWaits: true,
      }).finally(() => {
        if (state.missingSkillResync === resync) state.missingSkillResync = null;
      });
      state.missingSkillResync = resync;
    }
    firstSyncPromise = state.missingSkillResync ?? state.syncPromise;
  }
  if (!firstSyncPromise) return;
  await raceWithTimeout(firstSyncPromise);
  signal.throwIfAborted();
  resetSkillSyncState();
  return findLocalSkillCommand(name, context, updatedAt);
}
//@ chunk-b08ck61p.js:10996-11371 placement
/**
 * 从宿主技能目录加载技能为命令，并记录查找遥测。
 */
async function loadHostCatalogSkill(name) {
  let skillDirName = stripSyncedSkillPrefix(name);
  if (!isValidSkillDirName(skillDirName) || !isHostSkillCatalogEnabled()) return;
  let hostCatalog = remoteToolsState().hostCatalog;
  let asked = {
    fromMemory: hostCatalog.texts.has(skillDirName),
    inLine: hostCatalog.readingForCalls.size,
    at: performance.now(),
  };
  let skill;
  let miss;
  let threw = false;
  try {
    let hostCatalogSkill = await readHostCatalogSkill(skillDirName);
    if ("reason" in hostCatalogSkill) miss = hostCatalogSkill;
    else {
      let hostCatalogSkill_2 = createHostCatalogSkill(hostCatalogSkill);
      skill =
        hostCatalogSkill_2?.type === "prompt" && hostCatalogSkill_2.name === name
          ? hostCatalogSkill_2
          : undefined;
    }
  } catch (error) {
    threw = true;
    logError(toError(error));
  } finally {
    try {
      logHostCatalogLookup({
        served: skill,
        miss,
        threw,
        asked,
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  return skill;
}
//@ chunk-b08ck61p.js:11371-11445 placement
/**
 * 被判为「未及时加载」的缺失原因集合（超时、前序工作未完成、读取过多）。
 */
var SKILL_MISS_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b08ck61p.js:11371", () => {
  SKILL_MISS_REASONS = new Set(["timed_out", "earlier_work_outstanding", "too_many_reads"]);
});
//@ chunk-b08ck61p.js:11445-11908 placement
/**
 * 记录宿主技能目录查找结果遥测：已加载、被扣留、未及时或未加载。
 */
function logHostCatalogLookup({ served, miss, threw, asked }) {
  let isWithheld = served !== undefined && isKilledHostCatalogSkill(served);
  let fields = {
    from: lit("call"),
    named: 1,
    loaded: served === undefined ? 0 : 1,
    withheld: isWithheld ? 1 : 0,
    from_memory: asked.fromMemory,
    in_line: asked.inLine,
    waited_ms: Math.round(performance.now() - asked.at),
    ...(miss !== undefined && {
      [`mount_miss_${miss.reason}`]: 1,
    }),
    ...(threw && {
      threw,
    }),
  };
  if (isWithheld) logFeatureSad("skill_host_catalog", "all_withheld", fields);
  else if (served !== undefined) logFeatureOk("skill_host_catalog", fields);
  else
    logFeatureBad(
      "skill_host_catalog",
      miss !== undefined && SKILL_MISS_REASONS.has(miss.reason) ? "not_in_time" : "none_loaded",
      fields,
    );
}
//@ chunk-b08ck61p.js:11908-12040 placement
/**
 * 返回技能不可用的原因（账号技能关闭或其他），可用时为 undefined。
 */
function skillUnavailableReason(command) {
  invalidateCommandNames();
  let isSynced = isSyncedSkill(command);
  if (isSkillOff(command)) return isSynced ? "account_skill_off" : "other";
  if (isShadowedSkillName(command)) return "other";
  return syncedSkillRefusalReason(command) ? "other" : undefined;
}
//@ chunk-b08ck61p.js:12040-12264 placement
/**
 * 在本地技能、插件技能与动态技能中查找同名提示型命令（同步技能过期时不返回）。
 */
async function findLocalSkillCommand(name, context, updatedAt) {
  let wantsSynced = stripSyncedSkillPrefix(name) !== name;
  let skillDirCommands = await getSkillDirCommandsCached(getProjectRoot(), context.storageV5);
  for (let candidate of [...skillDirCommands, ...conditionalSkillEntries(), ...getDynamicSkills()])
    if (
      candidate.type === "prompt" &&
      candidate.name === name &&
      (candidate.loadedFrom === "syncedSkills" || !wantsSynced) &&
      !isHostCatalogSkill(candidate)
    )
      return (await isSyncedSkillStale(candidate, updatedAt)) ? undefined : candidate;
  return;
}
//@ chunk-b08ck61p.js:12264-12695 placement
/**
 * 判断同步的技能是否早于给定时间（或在名称冲突中落败），用于决定是否需要等待重新同步。
 */
async function isSyncedSkillStale(command, updatedAt) {
  if (updatedAt === null || command.loadedFrom !== "syncedSkills" || command.skillRoot === undefined)
    return false;
  let syncDir = dirname(command.skillRoot);
  let manifestText = await readManifestText(join(syncDir, SYNCED_MANIFEST_FILE), null);
  let manifest =
    manifestText === null ? null : parseManifestJson(manifestText, syncedSkillsManifestSchema(), null);
  if (manifest === null) return false;
  let dirName = stripInvisibleChars(basename(command.skillRoot));
  let collided = false;
  for (let entry of parseValidRows(syncedSkillEntrySchema(), manifest.skills)) {
    try {
      if (stripInvisibleChars(basename(syncedItemPath(entry.name, syncDir))) !== dirName) continue;
    } catch {
      continue;
    }
    if (entry.updatedAt === COLLISION_LOSER) {
      collided = true;
      continue;
    }
    return entry.updatedAt !== null && Date.parse(entry.updatedAt) < Date.parse(updatedAt);
  }
  return collided;
}
//@ chunk-b08ck61p.js:12695-14323 placement
/**
 * 列出插件命令的协议名与输入输出 schema（来源、命令、技能、代理、钩子登记等）。
 */
var PLUGIN_COMMAND_OPS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RENDERPLUGINCOMMAND;
var RENDERPINNEDPLUGINCOMMAND;
var HEAD_BUDGET_BYTES;
var HEAD_BUDGET_MEMBERS;
var MAX_PLUGIN_RESYNC_INTERVAL_MS;
var pluginMarketplaceOriginSchema;
var pluginCommandSourceSchema;
var pluginAgentSourceSchema;
var pluginDataDirPathSchema;
var pluginSourceEntrySchema;
var listPluginCommandsResultSchema;
var registeredHooksListSchema;
var listPluginCommandsInputSchema;
deferInit("chunk-b08ck61p.js:12695", () => {
  PLUGIN_COMMAND_OPS = "ListPluginCommands";
  RENDERPLUGINCOMMAND = "RenderPluginCommand";
  RENDERPINNEDPLUGINCOMMAND = "RenderPinnedPluginCommand";
  HEAD_BUDGET_BYTES = 12582912;
  HEAD_BUDGET_MEMBERS = 500000;
  MAX_PLUGIN_RESYNC_INTERVAL_MS = 60000;
  pluginMarketplaceOriginSchema = DoctorLazy(() =>
    union([
      MarketplaceSourceStrictSchema(),
      objectSchema({
        source: literal("claudeai"),
        marketplaceId: stringSchema(),
        organizationUuid: stringSchema(),
        scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional(),
      }),
      objectSchema({
        source: literal("pluginDirectory"),
      }),
    ]),
  );
  pluginCommandSourceSchema = DoctorLazy(() =>
    objectSchema({
      commandName: stringSchema(),
      filePath: stringSchema(),
      baseDir: stringSchema(),
      sourceName: stringSchema(),
      pluginManifest: PluginManifestSchema(),
      pluginPath: stringSchema(),
      provenance: objectSchema({
        officiallyAttested: booleanSchema().optional(),
        marketplaceSource: pluginMarketplaceOriginSchema().optional(),
        npmResolution: objectSchema({
          packageName: stringSchema(),
          tarballUrl: stringSchema(),
        }).optional(),
        home: stringSchema().optional(),
      }).optional(),
      isSkill: booleanSchema(),
      config: objectSchema({
        isSkillMode: booleanSchema(),
        serverAttribution: objectSchema({
          skillId: stringSchema().optional(),
          pluginId: stringSchema().optional(),
        }).optional(),
        metadata: CommandMetadataSchema().optional(),
      }),
    }),
  );
  pluginAgentSourceSchema = DoctorLazy(() =>
    objectSchema({
      filePath: stringSchema(),
      pluginName: stringSchema(),
      namespace: array(stringSchema()).readonly(),
      sourceName: stringSchema(),
      pluginPath: stringSchema(),
      pluginManifest: PluginManifestSchema(),
    }),
  );
  pluginDataDirPathSchema = DoctorLazy(() =>
    stringSchema()
      .refine((path) => resolve(path) === path && dirname(path) !== path)
      .optional()
      .catch(undefined),
  );
  pluginSourceEntrySchema = DoctorLazy(() =>
    objectSchema({
      source: pluginCommandSourceSchema(),
      text: stringSchema(),
      chars: numberSchema().int().min(0).max(MAX_PLUGIN_COMMAND_FILE_BYTES).optional().catch(undefined),
      pluginDataDir: pluginDataDirPathSchema(),
      sha256: stringSchema().regex(SHA256_HEX_RE).optional().catch(undefined),
    }),
  );
  listPluginCommandsResultSchema = DoctorLazy(() =>
    objectSchema({
      commands: array(pluginSourceEntrySchema()),
      skills: array(pluginSourceEntrySchema()),
      agents: array(
        objectSchema({
          source: pluginAgentSourceSchema(),
          text: stringSchema(),
          pluginDataDir: pluginDataDirPathSchema(),
        }),
      ),
      resynced: booleanSchema().optional(),
      syncsSessionRefs: booleanSchema().optional(),
      settingsRan: booleanSchema().optional(),
      comparesSource: booleanSchema().optional(),
      cut: numberSchema().int().min(0).optional(),
    }),
  );
  registeredHooksListSchema = DoctorLazy(() =>
    array(stringSchema().max(64000)).max(1000).nullable().optional().catch(null),
  );
  listPluginCommandsInputSchema = DoctorLazy(() =>
    objectSchema({
      registeredHooks: record(stringSchema(), registeredHooksListSchema()).optional().catch(undefined),
      resync: booleanSchema().optional(),
      waitMs: numberSchema().int().positive().optional().catch(undefined),
      hashes: booleanSchema().optional().catch(undefined),
      dataDirs: booleanSchema().optional().catch(undefined),
      headsExcept: array(stringSchema()).optional().catch(undefined),
    }),
  );
});
//@ chunk-b08ck61p.js:14323-15839 placement
/**
 * 远程调用"列出插件命令"：必要时重新同步插件、等待设置安装，汇总插件命令、技能与代理（可带哈希/数据目录），过滤掉钩子与宿主登记不一致的插件代理。
 */
async function serveListPluginCommands(input, signal, context) {
  let parsed = listPluginCommandsInputSchema().safeParse(input ?? {}).data;
  let resync = parsed?.resync === true;
  let { session, storageV5, credentials } = context.toolUseContext();
  let registeredHooks = parsed?.registeredHooks;
  invalidateCommandNames();
  let deadline = sleep(Math.min(pluginInstallTimeoutMs(), parsed?.waitMs ?? 1 / 0), signal, {
    unref: true,
  });
  let { resynced } = await awaitPluginSync(session, credentials, {
    resync,
    deadline,
  });
  signal.throwIfAborted();
  refreshPluginCaches(storageV5, credentials);
  let settingsRan = await Promise.race([
    ensureSettingsInstall(session, storageV5, credentials),
    deadline.then(() => false),
  ]);
  signal.throwIfAborted();
  let [pluginCommands, pluginSkills, pluginAgents] = await Promise.all([
    getPluginCommands(storageV5),
    loadPluginSkills(storageV5),
    isCustomizationDisabled("agents") ? [] : loadPluginAgents(storageV5, credentials),
  ]);
  let plugins = await loadAllPluginsCacheOnly(storageV5, credentials);
  let loaded = session.pluginsSync.settingsInstall.loaded;
  await releaseSyncedDirsNotIn([...plugins.enabled, ...(loaded?.plugins.enabled ?? [])], storageV5).catch(
    logError,
  );
  let pluginFromMarketplaceEntryCacheOnly = loadPluginFromMarketplaceEntryCacheOnly(plugins, loaded?.plugins);
  let sourcesText = await readSourcesText([
    ...pluginAgentSources(pluginAgents, plugins, registeredHooks),
    ...(loaded === null
      ? []
      : pluginAgentSources(
          loaded.agents,
          loaded.plugins,
          registeredHooks,
          pluginFromMarketplaceEntryCacheOnly,
        )),
  ]);
  let allPluginsForPreview = await loadAllPluginsForPreview(storageV5);
  let pendingSources = new Set(sourcesText.map(({ source }) => source.sourceName));
  for (let { source } of allPluginsForPreview.enabled) pendingSources.delete(source);
  let pluginsForPending = await updatePluginsForMarketplaces(
    [...plugins.enabled, ...(loaded?.plugins.enabled ?? [])].filter((plugin) =>
      pendingSources.has(plugin.source),
    ),
    storageV5,
  );
  let withHashes = parsed?.hashes === true ? withSha256 : identityEntries;
  let withDataDirs = (entry) => (parsed?.dataDirs === true ? withPluginDataDir(entry) : entry);
  let headBudget = parsed?.headsExcept && {
    bytes: HEAD_BUDGET_BYTES,
    members: HEAD_BUDGET_MEMBERS,
    cut: 0,
  };
  let output = {
    commands: withDataDirs(
      truncateEntryHeads(
        withHashes(
          await readSourcesText(
            [
              ...pluginCommandSources(pluginCommands),
              ...pluginCommandSources(loaded?.commands ?? [], pluginFromMarketplaceEntryCacheOnly),
            ],
            parsed?.hashes === true,
          ),
        ),
        parsed?.headsExcept,
      ),
    ).filter((entry) => fitsHeadBudget(entry, headBudget)),
    skills: withDataDirs(
      truncateEntryHeads(
        withHashes(
          await readSourcesText([
            ...pluginCommandSources(pluginSkills),
            ...pluginCommandSources(loaded?.skills ?? [], pluginFromMarketplaceEntryCacheOnly),
          ]),
        ),
        parsed?.headsExcept,
      ),
    ).filter((entry) => fitsHeadBudget(entry, headBudget)),
    agents: withDataDirs(
      sourcesText.filter(
        ({ source }) =>
          !isPluginHooksMismatched(
            source,
            pendingSources.has(source.sourceName) ? pluginsForPending : allPluginsForPreview,
            registeredHooks?.[syncedPluginFolderId(source.pluginPath)],
          ),
      ),
    ).filter((entry) => fitsHeadBudget(entry, headBudget)),
    resynced,
    syncsSessionRefs: isSessionRefsSyncEnabled(session),
    settingsRan,
    comparesSource: true,
    cut: headBudget?.cut,
  };
  return {
    summary: `${output.commands.length} commands, ${output.skills.length} skills, ${output.agents.length} agents${headBudget?.cut ? `, ${headBudget.cut} left out: the answer has no room for them` : ""}`,
    output,
  };
}
//@ chunk-b08ck61p.js:15839-16119 placement
/**
 * 等待插件同步结果（受截止时间约束），必要时触发一次重新同步，返回是否发生了重新同步。
 */
async function awaitPluginSync(session, credentials, { resync, deadline }) {
  let winner = await Promise.race([
    runFirstPluginsSync(session, credentials).catch(() => false),
    deadline.then(() => {
      return;
    }),
  ]);
  if (winner !== false && !(resync && winner !== undefined))
    return {
      resynced: false,
    };
  return {
    resynced:
      (await Promise.race([
        rerunPluginsSync(session, credentials).then(
          () => true,
          () => false,
        ),
        deadline.then(() => false),
      ])) && session.pluginsSync.lastRoundListed,
  };
}
//@ chunk-b08ck61p.js:16119-16280 placement
/**
 * 确保设置中的插件安装已执行（合并并发请求），返回是否成功。
 */
function ensureSettingsInstall(session, storage, credentials) {
  if (isCustomizationDisabled("plugins")) return Promise.resolve(true);
  let settingsInstall = session.pluginsSync.settingsInstall;
  settingsInstall.next ??= runSettingsInstall(session, storage, credentials).then(
    () => true,
    (error) => {
      logError(error);
      return false;
    },
  );
  return settingsInstall.next;
}
//@ chunk-b08ck61p.js:16280-16743 placement
/**
 * 执行设置驱动的插件安装：等待托管设置与首次同步，安装插件后加载插件命令、技能和代理并缓存。
 */
async function runSettingsInstall(session, storage, credentials) {
  let settingsInstall = session.pluginsSync.settingsInstall;
  await settingsInstall.current;
  settingsInstall.current = settingsInstall.next;
  settingsInstall.next = null;
  await Promise.allSettled([waitForRemoteManagedSettingsToLoad()]);
  env.unset("CLAUDE_CODE_SYNC_PLUGIN_INSTALL");
  await Promise.allSettled([
    installPluginsForHeadlessSerialized(undefined, storage, credentials),
    session.pluginsSync.firstSyncPromise,
  ]);
  refreshPluginCaches(storage, credentials);
  let allPlugins = loadAllPlugins(storage, credentials);
  await allPlugins;
  refreshPluginCaches(storage, credentials);
  getPluginRegistry().pluginLoadCacheOnly = allPlugins;
  let results = Promise.all([
    getPluginCommands(storage),
    loadPluginSkills(storage),
    isCustomizationDisabled("agents") ? [] : loadPluginAgents(storage, credentials),
    allPlugins,
  ]);
  refreshPluginCaches(storage, credentials);
  let [commands, skills, agents, plugins] = await results;
  settingsInstall.loaded = {
    commands,
    skills,
    agents,
    plugins,
  };
}
//@ chunk-b08ck61p.js:16743-17191 placement
/**
 * 远程渲染插件条目的输入/输出结构：名称、类型、参数、只读、会话规则、钩子与哈希；输出为渲染结果或 missing/changed/guarded。
 */
var RENDER_PLUGIN_ENTRY_INPUT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RENDER_PLUGIN_ENTRY_OUTPUT_SCHEMA;
deferInit("chunk-b08ck61p.js:16743", () => {
  RENDER_PLUGIN_ENTRY_INPUT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(1024),
      listedAs: _enum(["command", "skill"]),
      args: stringSchema().max(MAX_COMMAND_ARGS_CHARS),
      readOnly: booleanSchema(),
      sessionRules: MAX_SESSION_RULES_CHARS(),
      sourceName: stringSchema().max(1024).optional(),
      registeredHooks: registeredHooksListSchema(),
      ownHooksSha256: stringSchema().optional().catch(undefined),
      expectSha256: stringSchema().regex(SHA256_HEX_RE).optional(),
    }),
  );
  RENDER_PLUGIN_ENTRY_OUTPUT_SCHEMA = DoctorLazy(() =>
    discriminatedUnion("outcome", [
      renderSkillOutputSchema().extend({
        sourceName: stringSchema().optional(),
      }),
      skillFailureSchema().extend({
        sourceName: stringSchema().optional(),
      }),
      objectSchema({
        outcome: literal("missing"),
      }),
      objectSchema({
        outcome: literal("changed"),
      }),
      objectSchema({
        outcome: literal("guarded"),
      }),
    ]),
  );
});
//@ chunk-b08ck61p.js:17191-18833 placement
async function renderPluginEntry(input, signal, toolUseContextHolder) {
  let {
    name,
    listedAs,
    args,
    readOnly,
    sessionRules,
    sourceName,
    registeredHooks,
    ownHooksSha256,
    expectSha256,
  } = RENDER_PLUGIN_ENTRY_INPUT_SCHEMA().parse(input);
  let context = toolUseContextHolder.toolUseContext();
  let pluginEntry = await findPluginEntry(name, listedAs, context);
  if (pluginEntry === undefined) {
    let timeout = sleep(pluginInstallTimeoutMs(), signal, {
      unref: true,
    });
    await resyncForMissingEntry(toolUseContextHolder, signal, async () => {
      pluginEntry = await findPluginEntry(name, listedAs, context);
      return pluginEntry !== undefined;
    });
    pluginEntry ??= await findPluginEntry(name, listedAs, context);
    if (pluginEntry === undefined) {
      let settingsInstall = context.session.pluginsSync.settingsInstall;
      await Promise.race([settingsInstall.next ?? settingsInstall.current, timeout]);
      signal.throwIfAborted();
      pluginEntry = await findPluginEntry(name, listedAs, context);
    }
  }
  let command = pluginEntry?.command;
  let pathAbsent = false;
  if (command !== undefined && expectSha256 !== undefined) {
    let [pendingSource] =
      command.pluginSource === undefined
        ? []
        : await readSourcesText([command.pluginSource], true, (readSource) => {
            pathAbsent = !isPathAbsent(readSource);
          });
    let validated =
      pendingSource !== undefined &&
      sourceEntrySha256(pendingSource.source, pendingSource.text) === expectSha256
        ? validatePluginCommandAllowedTools(pendingSource.source, pendingSource.text)
        : null;
    command = validated?.type === "prompt" ? validated : undefined;
  }
  let contextWithRules = await renderContextWithRules(
    context,
    readOnly || hasGuardHooks_2(command?.hooks),
    sessionRules,
    toolUseContextHolder.launchPermissionContext,
    input,
  );
  invalidateCommandNames();
  let syncedRefusal =
    pluginEntry === undefined ? undefined : await checkCommandSyncedAccess(pluginEntry.command);
  invalidateCommandNames();
  if (
    pluginEntry === undefined ||
    isSyncedSkillHiddenFromModel(pluginEntry.command) ||
    (sourceName ?? pluginEntry.command.pluginSource?.sourceName) !==
      pluginEntry.command.pluginSource?.sourceName ||
    (marketplaceSuffix(pluginEntry.command.pluginSource?.sourceName ?? "") === SYNCED &&
      isPluginsSyncVetoed())
  )
    return {
      summary: "no such plugin entry",
      output: {
        outcome: "missing",
      },
    };
  if (isDefined(syncedRefusal)) {
    logSyncedCommandRefused(pluginEntry.command, syncedRefusal);
    return {
      summary: "no such plugin entry",
      output: {
        outcome: "missing",
      },
    };
  }
  let { judgedBy } = pluginEntry;
  if (pathAbsent)
    return {
      summary: "entry not read",
      output: {
        outcome: "failed",
        message: "its file could not be read where its plugin is kept, so it was not run",
        sourceName: pluginEntry.command.pluginSource?.sourceName,
      },
    };
  if (command === undefined)
    return {
      summary: "changed since listed",
      output: {
        outcome: "changed",
      },
    };
  if (
    ownHooksSha256 !== (command.hooks && hooksFingerprint(command.hooks)) ||
    judgedBy.some((judged) => isPluginHooksMismatched(command.pluginSource, judged, registeredHooks))
  )
    return {
      summary: "guarded entry",
      output: {
        outcome: "guarded",
      },
    };
  let { summary, output } = await renderRemoteCommand(command, args, contextWithRules, signal);
  return {
    summary,
    output: {
      ...output,
      sourceName: command.pluginSource?.sourceName,
    },
  };
}
//@ chunk-b08ck61p.js:18833-18865 placement
/**
 * 钩子内容的指纹（对钩子对象做序列化后的内容哈希）。
 */
function hooksFingerprint(hooks) {
  return computeContentHash(canonicalFingerprint(hooks));
}
//@ chunk-b08ck61p.js:18865-18958 placement
/**
 * 计算来源条目的内容哈希：文本哈希 + 去掉服务端署名后的来源对象哈希，再取一次哈希。
 */
function sourceEntrySha256(source, text) {
  let { serverAttribution, ...rest } = source.config;
  return computeContentHash(
    computeContentHash(text) +
      canonicalFingerprint({
        ...source,
        config: rest,
      }),
  );
}
//@ chunk-b08ck61p.js:18958-19426 placement
/**
 * 查找插件命令或技能条目，并给出用于判断插件可信度的插件集合。
 */
async function findPluginEntry(name, listedAs, { session, storageV5, credentials }) {
  let pluginPromptCommand = findPluginPromptCommand(
    await (listedAs === "skill" ? loadPluginSkills : getPluginCommands)(storageV5),
    name,
  );
  let loaded = session.pluginsSync.settingsInstall.loaded;
  let plugins = pluginPromptCommand ? await loadAllPluginsCacheOnly(storageV5, credentials) : loaded?.plugins;
  if (plugins === undefined) return;
  invalidateCommandNames();
  let allPluginsForPreview = await loadAllPluginsForPreview(storageV5);
  let pluginFromMarketplaceEntryCacheOnly = loadPluginFromMarketplaceEntryCacheOnly(
    allPluginsForPreview,
    plugins,
  );
  let promptCommand =
    pluginPromptCommand ??
    findPluginPromptCommand(
      (listedAs === "skill" ? loaded?.skills : loaded?.commands) ?? [],
      name,
      pluginFromMarketplaceEntryCacheOnly,
    );
  let sourceName = promptCommand?.pluginSource?.sourceName ?? "";
  let any = allPluginsForPreview.enabled.some((plugin) => plugin.source === sourceName);
  if (promptCommand === undefined || !(any || pluginFromMarketplaceEntryCacheOnly.has(sourceName))) return;
  return {
    command: promptCommand,
    judgedBy: [
      plugins,
      any
        ? allPluginsForPreview
        : await updatePluginsForMarketplaces(
            plugins.enabled.filter((plugin) => plugin.source === sourceName),
            storageV5,
          ),
    ],
  };
}
//@ chunk-b08ck61p.js:19698-19878 placement
function findPluginPromptCommand(commands, name, pluginFromMarketplaceEntryCacheOnly) {
  for (let command of commands)
    if (
      command.type === "prompt" &&
      command.name === name &&
      command.pluginSource !== undefined &&
      !isBuiltinPluginId(command.pluginSource.sourceName) &&
      pluginFromMarketplaceEntryCacheOnly?.has(command.pluginSource.sourceName) !== false
    )
      return command;
  return;
}
//@ chunk-b08ck61p.js:19878-20490 placement
/**
 * 插件条目找不到时：等待当前同步结果，再限频触发一次重同步并等待（受截止时间约束），返回是否发生了新的同步。
 */
async function resyncForMissingEntry(context, signal, recheck) {
  let { session, storageV5, credentials } = context.toolUseContext();
  let missingEntry = session.pluginsSync.missingEntry;
  let timeout = sleep(pluginInstallTimeoutMs(), signal, {
    unref: true,
  }).then(() => {
    return;
  });
  let winner = await Promise.race([runFirstPluginsSync(session, credentials).catch(() => false), timeout]);
  signal.throwIfAborted();
  if (winner === undefined) return false;
  let markSwept = () => {
    if (missingEntry.resync === null && !missingEntry.swept) {
      missingEntry.swept = true;
      refreshPluginCaches(storageV5, credentials);
    }
  };
  markSwept();
  if (winner && (await recheck())) return false;
  signal.throwIfAborted();
  if (missingEntry.resync === null && Date.now() - missingEntry.resyncAt >= MAX_PLUGIN_RESYNC_INTERVAL_MS) {
    missingEntry.resyncAt = Date.now();
    let resync = rerunPluginsSync(session, credentials)
      .catch(() => false)
      .finally(() => {
        missingEntry.resync = null;
        missingEntry.swept = false;
      });
    missingEntry.resync = resync;
  }
  let resync = missingEntry.resync;
  if (resync !== null) {
    await Promise.race([resync, timeout]);
    signal.throwIfAborted();
  }
  markSwept();
  return resync !== null && missingEntry.resync !== resync;
}
//@ chunk-b08ck61p.js:20743-20926 placement
function pluginCommandSources(commands, pluginFromMarketplaceEntryCacheOnly) {
  return commands.flatMap((command) =>
    command.type === "prompt" &&
    command.pluginSource !== undefined &&
    !isBuiltinPluginId(command.pluginSource.sourceName) &&
    pluginFromMarketplaceEntryCacheOnly?.has(command.pluginSource.sourceName) !== false &&
    !isSyncedSkillHiddenFromModel(command)
      ? [command.pluginSource]
      : [],
  );
}
//@ chunk-b08ck61p.js:20926-21017 placement
/**
 * 判断是跟随同步状态的技能且对模型隐藏（这类条目不作为插件来源）。
 */
function isSyncedSkillHiddenFromModel(command) {
  return (
    command.type === "prompt" &&
    command.pluginInfo?.followsSyncedSkillState === true &&
    isHiddenFromModel(command)
  );
}
//@ chunk-b08ck61p.js:21017-21258 placement
function pluginAgentSources(agents, plugins, registeredHooks, pluginFromMarketplaceEntryCacheOnly) {
  return agents.flatMap((agent) =>
    agent.source === "plugin" &&
    agent.pluginSource !== undefined &&
    !isBuiltinPluginId(agent.pluginSource.sourceName) &&
    pluginFromMarketplaceEntryCacheOnly?.has(agent.pluginSource.sourceName) !== false &&
    !isPluginHooksMismatched(
      agent.pluginSource,
      plugins,
      registeredHooks?.[syncedPluginFolderId(agent.pluginSource.pluginPath)],
    )
      ? [agent.pluginSource]
      : [],
  );
}
//@ chunk-b08ck61p.js:21258-21282 placement
/**
 * 原样返回来源条目（不需要附加字段时的恒等映射）。
 */
function identityEntries(entries) {
  return entries;
}
//@ chunk-b08ck61p.js:21282-21352 placement
/**
 * 给每个来源条目附上 sha256（用于校验同步内容未变）。
 */
function withSha256(entries) {
  return entries.map((entry) => ({
    ...entry,
    sha256: sourceEntrySha256(entry.source, entry.text),
  }));
}
//@ chunk-b08ck61p.js:21352-21526 layout
function truncateEntryHeads(entries, headsExcept) {
  if (headsExcept === undefined) return entries;
  let exceptNames = new Set(headsExcept);
  return entries.map((entry) =>
    exceptNames.has(entry.source.commandName) || entry.text.length > MAX_PLUGIN_COMMAND_FILE_BYTES
      ? entry
      : {
          ...entry,
          text: pluginCommandHead(entry.text).head,
          chars: entry.text.length,
        },
  );
}
//@ chunk-b08ck61p.js:21526-21708 layout
function fitsHeadBudget(entry, headBudget) {
  if (headBudget === undefined) return true;
  let entryJson = jsonStringifyRaw(entry);
  let entryBytes = Buffer.byteLength(entryJson);
  let members = countJsonMembers(entryJson, headBudget.members, 0)?.members;
  if (members === undefined || entryBytes > headBudget.bytes) {
    headBudget.cut++;
    return false;
  }
  headBudget.bytes -= entryBytes;
  headBudget.members -= members;
  return true;
}
//@ chunk-b08ck61p.js:21708-21789 placement
/**
 * 给每个来源条目附上插件数据目录。
 */
function withPluginDataDir(entries) {
  return entries.map((entry) => ({
    ...entry,
    pluginDataDir: pluginDataDirPath(entry.source.sourceName),
  }));
}
//@ chunk-b08ck61p.js:21789-22118 placement
/**
 * 重新读取一组来源文件的文本（可使用缓存内容），读取失败的跳过。
 */
async function readSourcesText(sources, allowEmptyContent = false, onError) {
  let fsImplementation = getFsImplementation();
  return (
    await Promise.all(
      sources.map(async (source) => {
        let content = source.config?.metadata?.content;
        let content_2 =
          (allowEmptyContent && content === "" ? undefined : content) ??
          (await readSmallFileChecked(fsImplementation, source.filePath, MAX_PLUGIN_COMMAND_FILE_BYTES).catch(
            (error) => {
              onError?.(error);
              return null;
            },
          ));
        if (content_2 === null) {
          logForDebugging(`ListPluginCommands: ${source.filePath} could not be read again`, {
            level: "warn",
          });
          return [];
        }
        return [
          {
            source,
            text: content_2,
          },
        ];
      }),
    )
  ).flat();
}
//@ chunk-b08ck61p.js:22202-22613 placement
/**
 * 判断插件的钩子与宿主登记的不一致（含插件未启用、存在模块路径、来源路径不符或有加载错误）。
 */
function isPluginHooksMismatched(pluginSource, { enabled, errors }, registeredHooks) {
  let found = enabled.find((plugin) => plugin.source === pluginSource?.sourceName);
  if (found === undefined || found.modulePath !== undefined || registeredHooks === null) return true;
  let expected =
    found.hooksConfig === undefined
      ? found.manifest.hooks === undefined && []
      : pluginHookFingerprints(found.hooksConfig);
  let registered = registeredHooks?.toSorted() ?? [];
  return (
    !expected ||
    !import_sortedIndex_2(expected, registered) ||
    (expected.length > 0 &&
      (marketplaceSuffix(found.source) !== SYNCED || found.path !== pluginSource?.pluginPath)) ||
    errors.some(
      (error) =>
        "plugin" in error &&
        error.plugin === found.name &&
        !(error.type === "path-traversal" && CLAUDE_CONFIG_DIRECTORIES_2.has(error.component)),
    )
  );
}
//@ chunk-b08ck61p.js:22613-22841 placement
function pluginHookFingerprints(hooksConfig) {
  let fingerprints = [];
  for (let [key, value] of Object.entries(hooksConfig))
    for (let { matcher, hooks } of value ?? [])
      for (let hook of hooks)
        fingerprints.push(
          canonicalFingerprint([
            key,
            matcher ?? "",
            "onFailure" in hook && hook.onFailure === "block"
              ? omitAlias(hook, ["cloud"])
              : omitAlias(hook, ["cloud", "onFailure"]),
          ]),
        );
  return fingerprints.sort();
}
export {
  ensureSettingsInstall,
  isPluginHooksMismatched,
  registeredHooksListSchema,
  awaitPluginSync,
  byteLengthOfJson,
  resyncForMissingEntry,
  findLocalSkillCommand,
  readHostCatalogSkill,
  skillUnavailableReason,
  PLUGIN_COMMAND_OPS,
  serveListPluginCommands,
  RENDERPLUGINCOMMAND,
  renderPluginEntry,
  RENDERPINNEDPLUGINCOMMAND,
  SKILL_RENDER_OPS,
  serveReadSkill,
  RENDERSKILL,
  readListedSkill,
  RENDERPINNEDSKILL,
  RENDERBUILTINCOMMAND,
  serveRenderCommand,
  LISTPROJECTCOMMANDS,
  listProjectCommands,
};
