/**
 * services/remoteTools/commandRendering.ts
 *
 * 远程会话列出/渲染技能与插件命令（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tyqgtn4.js (49)
 * attribution: placement 49
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
  u,
  E,
  string,
  literal,
  _enum,
  array,
  M,
  discriminatedUnion,
  unknown,
  union,
  zodStrictObject,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_MARKDOWN_FILE_BYTES } from "../../utils/markdownConfigLoader.js";
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
import { toolMatchesName } from "../../Tool.js";
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
import { refreshPluginCaches } from "../../utils/plugins/cacheUtils.js";
import {
  getPluginCommands,
  loadPluginSkills,
  validatePluginCommandAllowedTools,
  MAX_PLUGIN_COMMAND_FILE_BYTES,
} from "../../utils/plugins/loadPluginCommands.js";
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
import { pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPrefilterableHook } from "../../utils/hooks.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-9tyqgtn4.js:1977-2019 placement
var HOST_SKILL_READ_TIMEOUT_MS = 1e4;
var MAX_CONCURRENT_SKILL_READS = MAX_SKILLS_PER_PLUGIN;
var SKILL_READ_TIMED_OUT = {
  reason: "timed_out",
};
//@ chunk-9tyqgtn4.js:2019-2707 placement
/**
 * 读取宿主技能目录中的某个技能文本：已有缓存直接返回；否则排队（并发上限、前序工作未完成时拒绝）串行读取并缓存，等待时间超过上限返回 timed_out。
 */
async function readHostCatalogSkill(skillName) {
  if (!isValidSkillDirName(skillName))
    return {
      reason: "file_absent",
    };
  let hostCatalog = remoteToolsState().hostCatalog;
  let a = hostCatalog.texts.get(skillName);
  if (a !== undefined) return a;
  let r = hostCatalog.readingForCalls.get(skillName);
  if (r === undefined) {
    if (isHostMountWorkStale())
      return {
        reason: "earlier_work_outstanding",
      };
    if (hostCatalog.readingForCalls.size >= MAX_CONCURRENT_SKILL_READS)
      return {
        reason: "too_many_reads",
      };
    let c = hostCatalog.lastReadForCalls.then((probed) =>
      readHostCatalogEntry(hostCatalog, skillName, probed),
    );
    hostCatalog.lastReadForCalls = c.then(
      ({ probed }) => probed,
      () => {
        return;
      },
    );
    r = {
      reading: c
        .then(({ outcome }) => outcome)
        .finally(() => {
          hostCatalog.readingForCalls.delete(skillName);
          if (hostCatalog.readingForCalls.size === 0)
            hostCatalog.lastReadForCalls = Promise.resolve(undefined);
        }),
      since: performance.now(),
    };
    hostCatalog.readingForCalls.set(skillName, r);
  }
  let s = r.since + HOST_SKILL_READ_TIMEOUT_MS - performance.now();
  return (
    (s > 0 ? await withDeadline(r.reading, s) : undefined) ?? {
      reason: "timed_out",
    }
  );
}
//@ chunk-9tyqgtn4.js:2707-3051 placement
/**
 * 从宿主技能目录读取一个技能条目：必要时先探测目录，读到后缓存文本，返回结果与探测信息。
 */
async function readHostCatalogEntry(catalog, skillName, probed) {
  let r = () => remoteToolsState().hostCatalog === catalog;
  if (probed === undefined) await yieldToEventLoop();
  let s =
    probed ??
    (await runHostMountWorkExclusive(async () => (r() ? resolvePublicCatalogRoot() : SKILL_READ_TIMED_OUT)));
  if ("reason" in s)
    return {
      outcome: s,
      probed: undefined,
    };
  await yieldToEventLoop();
  let c = await runHostMountWorkExclusive(async () => {
    let d = r() ? await readMountedSkillMd(s.root, skillName, s.device) : SKILL_READ_TIMED_OUT;
    if (!("reason" in d)) catalog.texts.set(skillName, d);
    return d;
  });
  return {
    outcome: c,
    probed: "reason" in c ? undefined : s,
  };
}
//@ chunk-9tyqgtn4.js:3080-3143 placement
/**
 * 列出项目命令的协议常量与上限：命令名、单条正文上限、每页条数，以及由此推导的载荷/页数上限。
 */
var LISTPROJECTCOMMANDS = "ListProjectCommands";
var MAX_LISTED_COMMAND_BYTES = 8388608;
var MAX_LISTED_COMMANDS_PER_PAGE = 2000;
var LIST_COMMANDS_PAYLOAD_CAP_BYTES = 4 * MAX_LISTED_COMMAND_BYTES;
var LIST_COMMANDS_PAGE_CAP = 4 * MAX_LISTED_COMMANDS_PER_PAGE;
//@ chunk-9tyqgtn4.js:3143-3221 placement
/**
 * 列出项目命令的输入 schema：分页游标 after 与 afterName。
 */
var listProjectCommandsInputSchema = DoctorLazy(() =>
  u({
    after: E().int().min(0).optional(),
    afterName: string().optional(),
  }),
);
//@ chunk-9tyqgtn4.js:3221-3365 placement
function isSettingsSkillOrCommand(e) {
  return (
    (e.source === "projectSettings" || e.source === "userSettings") &&
    (e.loadedFrom === "skills" || e.loadedFrom === "commands_DEPRECATED")
  );
}
//@ chunk-9tyqgtn4.js:3365-3650 placement
var LISTED_COMMAND_SCHEMA = DoctorLazy(() =>
  u({
    name: string().min(1).max(1024),
    source: literal("userSettings").optional(),
    loadedFrom: _enum(["skills", "commands_DEPRECATED"]),
    text: string().max(MAX_MARKDOWN_FILE_BYTES),
  }),
);
var LISTED_COMMANDS_PAGE_SCHEMA = DoctorLazy(() =>
  u({
    commands: array(LISTED_COMMAND_SCHEMA()).max(MAX_LISTED_COMMANDS_PER_PAGE),
    cut: M(),
    refused: E().int().min(0),
    next: E().int().min(1).optional(),
    nextName: string().max(1024).optional(),
  }),
);
//@ chunk-9tyqgtn4.js:3650-3740 placement
/**
 * 取宿主登记的技能文件路径；没有登记时退回 skillRoot/SKILL.md。
 */
function skillFilePathOf(e) {
  return getHostState().skillFiles.get(e) ?? (e.skillRoot ? join(e.skillRoot, "SKILL.md") : "");
}
//@ chunk-9tyqgtn4.js:3740-3846 placement
async function readSkillFileText(e) {
  let n = skillFilePathOf(e);
  if (n === "") return null;
  try {
    return await readSmallFileChecked(getFsImplementation(), n, MAX_MARKDOWN_FILE_BYTES);
  } catch {
    return null;
  }
}
//@ chunk-9tyqgtn4.js:3846-3894 placement
/**
 * 计算对象原始 JSON 序列化后的字节数（用于分页载荷计量）。
 */
function byteLengthOfJson(e) {
  return Buffer.byteLength(jsonStringifyRaw(e));
}
//@ chunk-9tyqgtn4.js:3894-4900 placement
async function listProjectCommands(e, n, a) {
  let { after, afterName } = listProjectCommandsInputSchema().parse(e ?? {});
  let { storageV5 } = a.toolUseContext();
  if (!after) {
    clearSkillCaches();
    invalidateCommandNames();
  }
  let d = [
    ...(await getSkillDirCommandsCached(getProjectRoot(), storageV5)),
    ...conditionalSkillEntries(),
    ...getDynamicSkills(),
  ];
  n.throwIfAborted();
  let S = new Set();
  let y = [];
  let C = 0;
  let P = false;
  let x = 0;
  let _ = 0;
  let h;
  let k = afterName === undefined;
  for (let w of d) {
    if (w.type !== "prompt" || S.has(w.name)) continue;
    S.add(w.name);
    let { name: z, source, loadedFrom } = w;
    if (!isSettingsSkillOrCommand(w) || isShadowedSkillName(w) || isSkillOff(w)) continue;
    if (_++ < (after ?? 0)) continue;
    if (!k && z !== afterName) break;
    k = true;
    let text = await readSkillFileText(w);
    n.throwIfAborted();
    let D = LISTED_COMMAND_SCHEMA().safeParse({
      name: z,
      ...(source === "userSettings" && {
        source,
      }),
      loadedFrom,
      text,
    });
    if (!D.success) {
      x++;
      logForDebugging(`ListProjectCommands: ${z} refused from the listing`, {
        level: "warn",
      });
      continue;
    }
    let R = byteLengthOfJson(D.data);
    let L = C + R <= MAX_LISTED_COMMAND_BYTES;
    if (after !== undefined && (y.length === MAX_LISTED_COMMANDS_PER_PAGE || !L)) {
      h = {
        next: _ - 1,
        nextName: z,
      };
      break;
    }
    if (y.length === MAX_LISTED_COMMANDS_PER_PAGE) {
      P = true;
      break;
    }
    if (!L) {
      P = true;
      continue;
    }
    C += R;
    y.push(D.data);
  }
  if (!k) throw Error("the files have moved since the page before");
  return {
    summary: `${y.length} commands${P ? ", cut at a limit" : ""}${x > 0 ? `, ${x} refused` : ""}`,
    output: {
      commands: y,
      cut: P,
      refused: x,
      ...h,
    },
  };
}
//@ chunk-9tyqgtn4.js:4900-6445 placement
/**
 * 读/渲染技能与内置命令的协议名与各类输入输出 schema 及上限（等待时间、参数长度、会话覆盖、交出命令等）。
 */
var SKILL_RENDER_OPS = "ReadSkill";
var RENDERSKILL = "RenderSkill";
var RENDERPINNEDSKILL = "RenderPinnedSkill";
var RENDERBUILTINCOMMAND = "RenderBuiltInCommand";
var MAX_WAIT_MS = 110000;
var MAX_ERROR_MESSAGE_CHARS = 2000;
var MAX_COMMAND_ARGS_CHARS = 1e5;
var MAX_BLOCK_TEXT_CHARS = MAX_SUBSTITUTION_CHARS;
var MISSING_SKILL_RESYNC_INTERVAL_MS = 60000;
var MAX_SESSION_TOOLS = 4096;
var MAX_TOOL_NAME_CHARS = 256;
var MAX_HANDED_OFF_COMMANDS = 256;
var MAX_HANDED_OFF_COMMAND_CHARS = 32768;
var AGENT_TOOL_NAMES = [AGENT, REPORTFINDINGS, SKILL];
var skillReadQueue = identity(
  {
    last: Promise.resolve(),
  },
  (e) => {
    e.last = Promise.resolve();
  },
);
var optionalTrueFlagSchema = DoctorLazy(() => literal(true).optional().catch(undefined));
var readSkillInputSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(1024),
    updatedAt: string().max(64).nullable(),
    waitMs: E().int().min(0).max(MAX_WAIT_MS),
    fromHostCatalog: optionalTrueFlagSchema(),
  }),
);
var skillReadOutcomeSchema = DoctorLazy(() =>
  u({
    outcome: literal("missing"),
    syncing: M(),
    fromHostCatalog: literal(true).optional(),
    withheld: literal(true).optional(),
  }),
);
var renderSkillInputSchema = DoctorLazy(() =>
  discriminatedUnion("outcome", [
    u({
      outcome: literal("found"),
      text: string().max(MAX_SCOPE_RESPONSE_BYTES),
      fromHostCatalog: literal(true).optional(),
    }),
    skillReadOutcomeSchema(),
  ]),
);
var MAX_SESSION_RULES_CHARS = DoctorLazy(() => unknown().optional());
var renderSkillWithSessionInputSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(1024),
    args: string().max(MAX_COMMAND_ARGS_CHARS),
    readOnly: M(),
    waitMs: E().int().min(0).max(MAX_WAIT_MS),
    fromHostCatalog: optionalTrueFlagSchema(),
    expectSha256: string().regex(SHA256_HEX_RE).optional(),
    sessionRules: MAX_SESSION_RULES_CHARS(),
  }),
);
var renderSkillExtendedInputSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(1024),
    args: string().max(MAX_COMMAND_ARGS_CHARS),
    readOnly: M(),
    sessionRules: MAX_SESSION_RULES_CHARS(),
    model: string().min(1).max(256),
    session: u({
      tools: array(string().min(1).max(MAX_TOOL_NAME_CHARS)).max(MAX_SESSION_TOOLS).catch([]),
      isSkillPreload: M().optional().catch(undefined),
      modelScheduledOrigin: M().optional().catch(undefined),
      remoteSessionId: string().min(1).max(256).optional().catch(undefined),
      effort: union([_enum(EFFORT_LEVELS), E().int().min(0).max(1000)])
        .optional()
        .catch(undefined),
    })
      .optional()
      .catch(undefined),
  }),
);
var renderSkillOutputSchema = DoctorLazy(() =>
  u({
    outcome: literal("rendered"),
    blocks: array(
      u({
        type: literal("text"),
        text: string().max(MAX_BLOCK_TEXT_CHARS),
      }),
    ).max(16),
    handedOff: array(
      zodStrictObject({
        command: string().min(1).max(MAX_HANDED_OFF_COMMAND_CHARS),
        tool: string().max(MAX_TOOL_NAME_CHARS),
      }),
    )
      .max(MAX_HANDED_OFF_COMMANDS)
      .optional(),
    fromHostCatalog: literal(true).optional(),
  }),
);
var skillFailureSchema = DoctorLazy(() =>
  u({
    outcome: literal("failed"),
    message: string().max(MAX_ERROR_MESSAGE_CHARS),
  }),
);
var skillRenderResultSchema = DoctorLazy(() =>
  discriminatedUnion("outcome", [renderSkillOutputSchema(), skillReadOutcomeSchema(), skillFailureSchema()]),
);
//@ chunk-9tyqgtn4.js:6445-6926 placement
/**
 * 远程调用"读技能"：按名字找技能（宿主目录或本地，可等首次同步），被关闭/不可用时返回 missing，否则返回 SKILL.md 文本。
 */
async function serveReadSkill(input, signal, { toolUseContext }) {
  let { name, updatedAt, waitMs, fromHostCatalog } = readSkillInputSchema().parse(input);
  let S = fromHostCatalog
    ? await loadHostCatalogSkill(name)
    : await findSkillWithSync(name, waitMs, signal, toolUseContext(), updatedAt);
  let y = S && skillUnavailableReason(S);
  if (y !== undefined)
    return {
      summary: "no such skill",
      output: missingSkillOutput(y, fromHostCatalog),
    };
  let C = fromHostCatalog
    ? (S?.getLoadedSkillMd?.() ?? null)
    : S?.skillRoot === undefined
      ? null
      : await readSmallFileChecked(
          getFsImplementation(),
          join(S.skillRoot, "SKILL.md"),
          MAX_SCOPE_RESPONSE_BYTES,
        ).catch(() => null);
  return C === null
    ? {
        summary: "no such skill",
        output: missingSkillOutput(undefined, fromHostCatalog),
      }
    : {
        summary: "found",
        output: {
          outcome: "found",
          text: C,
          ...(fromHostCatalog && {
            fromHostCatalog,
          }),
        },
      };
}
//@ chunk-9tyqgtn4.js:6926-7651 placement
async function readListedSkill(e, signal, { toolUseContext, launchPermissionContext }) {
  let { name, args, readOnly, waitMs, fromHostCatalog, expectSha256, sessionRules } =
    renderSkillWithSessionInputSchema().parse(e);
  let context = await renderContextWithRules(
    toolUseContext(),
    readOnly,
    sessionRules,
    launchPermissionContext,
    e,
  );
  let command = fromHostCatalog
    ? await loadHostCatalogSkill(name)
    : await findSkillWithSync(name, waitMs, signal, context);
  if (command !== undefined && isSettingsSkillOrCommand(command)) {
    clearSkillCaches();
    command = await findSkillWithSync(name, waitMs, signal, context);
  }
  let h = command && skillUnavailableReason(command);
  if (command === undefined || h !== undefined)
    return {
      summary: "no such skill",
      output: missingSkillOutput(h, fromHostCatalog),
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
  let k = await renderRemoteCommand(command, args, context, signal);
  return fromHostCatalog && k.output.outcome === "rendered"
    ? {
        ...k,
        output: {
          ...k.output,
          fromHostCatalog,
        },
      }
    : k;
}
//@ chunk-9tyqgtn4.js:7651-8082 placement
/**
 * 按会话规则与只读设置调整渲染上下文：读取仓库规则，计算适用的权限上下文与交接选项；无法确定时改为只读加载技能。
 */
async function renderContextWithRules(context, readOnly, sessionRules, launchPermissionContext, input) {
  if (!readOnly && sessionRules === undefined) return context;
  let c = readOnly ? undefined : await readRepoRulesForRequest("The render", input);
  let d =
    c === undefined || c.refused !== undefined
      ? undefined
      : applicableSessionRules(sessionRules, launchPermissionContext, c.repoRules);
  if (d === undefined)
    return {
      ...context,
      options: {
        ...context.options,
        readOnlySkillLoad: true,
      },
    };
  let { toolPermissionContext } = d;
  return {
    ...context,
    getAppState: () => ({
      ...serveModeDefaultAppState(),
      toolPermissionContext,
    }),
    ...(d.offersHandOff && {
      promptShellHandOff: [],
    }),
    ...(d.classifiesEveryCall && {
      promptShellCallerClassifiesAll: true,
    }),
  };
}
//@ chunk-9tyqgtn4.js:8082-8420 placement
/**
 * 解析列出的技能：读取 SKILL.md，哈希与预期一致时解析为提示型命令。
 */
async function parseListedSkill(command, expectedHash) {
  let a = isHostCatalogSkill(command)
    ? (command.getLoadedSkillMd?.() ?? null)
    : await readSkillFileText(command);
  if (a === null || computeContentHash(a) !== expectedHash) return;
  try {
    let skillFileToCommand = parseSkillFileToCommand({
      content: a,
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
//@ chunk-9tyqgtn4.js:8420-9103 placement
/**
 * 远程调用"渲染命令"：按会话规则、只读、effort、模型与可用工具构造上下文，找到命令后在临时覆盖主模型的情况下渲染其提示。
 */
async function serveRenderCommand(input, signal, { toolUseContext, launchPermissionContext }) {
  let {
    name: s,
    args,
    readOnly,
    sessionRules,
    model,
    session,
  } = renderSkillExtendedInputSchema().parse(input);
  let P = await renderContextWithRules(
    toolUseContext(),
    readOnly,
    sessionRules,
    launchPermissionContext,
    input,
  );
  let effort = session?.effort;
  let _ = {
    ...P,
    ...(effort !== undefined && {
      permissionLayers: [
        ...(P.permissionLayers ?? []),
        {
          kind: "effort",
          effort,
        },
      ],
    }),
    options: {
      ...P.options,
      mainLoopModel: model,
      ...(session && {
        tools: [
          ...P.options.tools,
          ...serveModeTools(false).filter(
            (k) =>
              AGENT_TOOL_NAMES.some((w) => toolMatchesName(k, w)) &&
              session.tools.some((tool) => toolMatchesName(k, tool)) &&
              !P.options.tools.some((tool) => toolMatchesName(tool, k.name)),
          ),
        ],
        isSkillPreload: session.isSkillPreload,
        modelScheduledOrigin: session.modelScheduledOrigin,
      }),
    },
  };
  let valueFromInput = getValueFromInput(s);
  if (valueFromInput === undefined || skillUnavailableReason(valueFromInput) !== undefined)
    return {
      summary: "no such command",
      output: missingSkillOutput(),
    };
  return withModelOverride(model, () =>
    runWithRemoteSessionId(session?.remoteSessionId, () =>
      renderRemoteCommand(valueFromInput, args, _, signal),
    ),
  );
}
//@ chunk-9tyqgtn4.js:9103-9212 placement = getValueFromInput (1)
function getValueFromInput(input) {
  initBundledSkills();
  for (let n of [...getBundledSkills(), ...getBuiltinCommands()])
    if (n.type === "prompt" && n.name === input && passesPolicyGate(n)) return n;
  return;
}
//@ chunk-9tyqgtn4.js:9212-9370 placement
async function withModelOverride(model, fn) {
  let a = skillReadQueue.last.then(async () => {
    let mainLoopModelOverride = getMainLoopModelOverride();
    setMainLoopModelOverride(model);
    try {
      return await fn();
    } finally {
      setMainLoopModelOverride(mainLoopModelOverride);
    }
  });
  skillReadQueue.last = a.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  return a;
}
//@ chunk-9tyqgtn4.js:9370-10197 placement
async function renderRemoteCommand(e, n, a, r) {
  try {
    let promptForCommand = await e.getPromptForCommand(n, a);
    let flattened = promptForCommand.flatMap((S) =>
      S.type === "text"
        ? [
            {
              type: S.type,
              text: S.text,
            },
          ]
        : [],
    );
    let d = renderSkillOutputSchema().safeParse({
      outcome: "rendered",
      blocks: flattened,
      ...(a.promptShellHandOff?.length && {
        handedOff: a.promptShellHandOff,
      }),
    });
    if (flattened.length !== promptForCommand.length || !d.success)
      return {
        summary: "render refused",
        output: {
          outcome: "failed",
          message: a.promptShellHandOff?.length
            ? `the rendered skill is not plain text of a usable size, or it leaves Claude more than ${MAX_HANDED_OFF_COMMANDS} inline shell commands or one longer than ${MAX_HANDED_OFF_COMMAND_CHARS} characters`
            : "the rendered skill is not plain text of a usable size",
        },
      };
    return {
      summary: "rendered",
      output: d.data,
    };
  } catch (error) {
    if (isAbortError(error) || r.aborted) throw error;
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
//@ chunk-9tyqgtn4.js:10197-10344 placement
function missingSkillOutput(e, fromHostCatalog) {
  return {
    outcome: "missing",
    syncing: remoteToolsState().firstSyncPromise !== null,
    ...(e === "account_skill_off" && {
      withheld: true,
    }),
    ...(fromHostCatalog && {
      fromHostCatalog,
    }),
  };
}
//@ chunk-9tyqgtn4.js:10344-10971 placement
/**
 * 查找技能：本地找不到时等待相应同步（技能名对应的同步、首次同步或限频的缺失重同步），超时后再查一次。
 */
async function findSkillWithSync(name, waitMs, signal, context, updatedAt = null) {
  let c = remoteToolsState();
  let d = sleep(waitMs, signal, {
    unref: true,
  });
  let S = (x) =>
    Promise.race([
      x.catch(() => {
        return;
      }),
      d,
    ]);
  let localSkillCommand = await findLocalSkillCommand(name, context, updatedAt);
  let C = stripSyncedSkillPrefix(name);
  if (localSkillCommand === undefined && hasPendingSkillDownload(C)) {
    await S(startPendingDownload(C));
    signal.throwIfAborted();
    localSkillCommand = await findLocalSkillCommand(name, context, updatedAt);
  }
  if (localSkillCommand !== undefined || !c.firstSyncPromise) return localSkillCommand;
  let firstSyncPromise = c.firstSyncPromise;
  if (c.firstRoundSettled) {
    let now = Date.now();
    if (now - c.missingSkillResyncAt >= MISSING_SKILL_RESYNC_INTERVAL_MS) {
      c.missingSkillResyncAt = now;
      let _ = reloadSyncedSkills(context.session, context.storageV5, context.credentials).finally(() => {
        if (c.missingSkillResync === _) c.missingSkillResync = null;
      });
      c.missingSkillResync = _;
    }
    firstSyncPromise = c.missingSkillResync ?? c.syncPromise;
  }
  if (!firstSyncPromise) return;
  await S(firstSyncPromise);
  signal.throwIfAborted();
  resetSkillSyncState();
  return findLocalSkillCommand(name, context, updatedAt);
}
//@ chunk-9tyqgtn4.js:10971-11346 placement
/**
 * 从宿主技能目录加载技能为命令，并记录查找遥测。
 */
async function loadHostCatalogSkill(name) {
  let skillName = stripSyncedSkillPrefix(name);
  if (!isValidSkillDirName(skillName) || !isHostSkillCatalogEnabled()) return;
  let hostCatalog = remoteToolsState().hostCatalog;
  let asked = {
    fromMemory: hostCatalog.texts.has(skillName),
    inLine: hostCatalog.readingForCalls.size,
    at: performance.now(),
  };
  let s;
  let miss;
  let threw = false;
  try {
    let hostCatalogSkill = await readHostCatalogSkill(skillName);
    if ("reason" in hostCatalogSkill) miss = hostCatalogSkill;
    else {
      let hostCatalogSkill_2 = createHostCatalogSkill(hostCatalogSkill);
      s =
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
        served: s,
        miss,
        threw,
        asked,
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  return s;
}
//@ chunk-9tyqgtn4.js:11346-11420 placement
/**
 * 被判为「未及时加载」的缺失原因集合（超时、前序工作未完成、读取过多）。
 */
var SKILL_MISS_REASONS = new Set(["timed_out", "earlier_work_outstanding", "too_many_reads"]);
//@ chunk-9tyqgtn4.js:11420-11883 placement
/**
 * 记录宿主技能目录查找结果遥测：已加载、被扣留、未及时或未加载。
 */
function logHostCatalogLookup({ served, miss, threw, asked }) {
  let s = served !== undefined && isKilledHostCatalogSkill(served);
  let c = {
    from: lit("call"),
    named: 1,
    loaded: served === undefined ? 0 : 1,
    withheld: s ? 1 : 0,
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
  if (s) logFeatureSad("skill_host_catalog", "all_withheld", c);
  else if (served !== undefined) logFeatureOk("skill_host_catalog", c);
  else
    logFeatureBad(
      "skill_host_catalog",
      miss !== undefined && SKILL_MISS_REASONS.has(miss.reason) ? "not_in_time" : "none_loaded",
      c,
    );
}
//@ chunk-9tyqgtn4.js:11883-12015 placement
/**
 * 返回技能不可用的原因（账号技能关闭或其他），可用时为 undefined。
 */
function skillUnavailableReason(e) {
  invalidateCommandNames();
  let n = isSyncedSkill(e);
  if (isSkillOff(e)) return n ? "account_skill_off" : "other";
  if (isShadowedSkillName(e)) return "other";
  return syncedSkillRefusalReason(e) ? "other" : undefined;
}
//@ chunk-9tyqgtn4.js:12015-12239 placement
/**
 * 在本地技能、插件技能与动态技能中查找同名提示型命令（同步技能过期时不返回）。
 */
async function findLocalSkillCommand(name, context, updatedAt) {
  let r = stripSyncedSkillPrefix(name) !== name;
  let skillDirCommands = await getSkillDirCommandsCached(getProjectRoot(), context.storageV5);
  for (let c of [...skillDirCommands, ...conditionalSkillEntries(), ...getDynamicSkills()])
    if (
      c.type === "prompt" &&
      c.name === name &&
      (c.loadedFrom === "syncedSkills" || !r) &&
      !isHostCatalogSkill(c)
    )
      return (await isSyncedSkillStale(c, updatedAt)) ? undefined : c;
  return;
}
//@ chunk-9tyqgtn4.js:12239-12670 placement
/**
 * 判断同步的技能是否早于给定时间（或在名称冲突中落败），用于决定是否需要等待重新同步。
 */
async function isSyncedSkillStale(command, updatedAt) {
  if (updatedAt === null || command.loadedFrom !== "syncedSkills" || command.skillRoot === undefined)
    return false;
  let a = dirname(command.skillRoot);
  let manifestText = await readManifestText(join(a, SYNCED_MANIFEST_FILE), null);
  let s = manifestText === null ? null : parseManifestJson(manifestText, syncedSkillsManifestSchema(), null);
  if (s === null) return false;
  let c = stripInvisibleChars(basename(command.skillRoot));
  let d = false;
  for (let S of parseValidRows(syncedSkillEntrySchema(), s.skills)) {
    try {
      if (stripInvisibleChars(basename(syncedItemPath(S.name, a))) !== c) continue;
    } catch {
      continue;
    }
    if (S.updatedAt === COLLISION_LOSER) {
      d = true;
      continue;
    }
    return S.updatedAt !== null && Date.parse(S.updatedAt) < Date.parse(updatedAt);
  }
  return d;
}
//@ chunk-9tyqgtn4.js:12670-14143 placement
/**
 * 列出插件命令的协议名与输入输出 schema（来源、命令、技能、代理、钩子登记等）。
 */
var PLUGIN_COMMAND_OPS = "ListPluginCommands";
var RENDERPLUGINCOMMAND = "RenderPluginCommand";
var RENDERPINNEDPLUGINCOMMAND = "RenderPinnedPluginCommand";
var MAX_PLUGIN_RESYNC_INTERVAL_MS = 60000;
var pluginMarketplaceOriginSchema = DoctorLazy(() =>
  union([
    MarketplaceSourceStrictSchema(),
    u({
      source: literal("claudeai"),
      marketplaceId: string(),
      organizationUuid: string(),
      scope: _enum(CLAUDEAI_MARKETPLACE_KINDS).optional(),
    }),
    u({
      source: literal("pluginDirectory"),
    }),
  ]),
);
var pluginCommandSourceSchema = DoctorLazy(() =>
  u({
    commandName: string(),
    filePath: string(),
    baseDir: string(),
    sourceName: string(),
    pluginManifest: PluginManifestSchema(),
    pluginPath: string(),
    provenance: u({
      officiallyAttested: M().optional(),
      marketplaceSource: pluginMarketplaceOriginSchema().optional(),
      npmResolution: u({
        packageName: string(),
        tarballUrl: string(),
      }).optional(),
      home: string().optional(),
    }).optional(),
    isSkill: M(),
    config: u({
      isSkillMode: M(),
      serverAttribution: u({
        skillId: string().optional(),
        pluginId: string().optional(),
      }).optional(),
      metadata: CommandMetadataSchema().optional(),
    }),
  }),
);
var pluginAgentSourceSchema = DoctorLazy(() =>
  u({
    filePath: string(),
    pluginName: string(),
    namespace: array(string()).readonly(),
    sourceName: string(),
    pluginPath: string(),
    pluginManifest: PluginManifestSchema(),
  }),
);
var pluginDataDirPathSchema = DoctorLazy(() =>
  string()
    .refine((e) => resolve(e) === e && dirname(e) !== e)
    .optional()
    .catch(undefined),
);
var pluginSourceEntrySchema = DoctorLazy(() =>
  u({
    source: pluginCommandSourceSchema(),
    text: string(),
    pluginDataDir: pluginDataDirPathSchema(),
    sha256: string().regex(SHA256_HEX_RE).optional().catch(undefined),
  }),
);
var listPluginCommandsResultSchema = DoctorLazy(() =>
  u({
    commands: array(pluginSourceEntrySchema()),
    skills: array(pluginSourceEntrySchema()),
    agents: array(
      u({
        source: pluginAgentSourceSchema(),
        text: string(),
        pluginDataDir: pluginDataDirPathSchema(),
      }),
    ),
    resynced: M().optional(),
    syncsSessionRefs: M().optional(),
    settingsRan: M().optional(),
    comparesSource: M().optional(),
  }),
);
var registeredHooksListSchema = DoctorLazy(() =>
  array(string().max(64000)).max(1000).nullable().optional().catch(null),
);
var listPluginCommandsInputSchema = DoctorLazy(() =>
  u({
    registeredHooks: record(string(), registeredHooksListSchema()).optional().catch(undefined),
    resync: M().optional(),
    waitMs: E().int().positive().optional().catch(undefined),
    hashes: M().optional().catch(undefined),
    dataDirs: M().optional().catch(undefined),
  }),
);
//@ chunk-9tyqgtn4.js:14143-15427 placement
/**
 * 远程调用"列出插件命令"：必要时重新同步插件、等待设置安装，汇总插件命令、技能与代理（可带哈希/数据目录），过滤掉钩子与宿主登记不一致的插件代理。
 */
async function serveListPluginCommands(input, signal, context) {
  let r = listPluginCommandsInputSchema().safeParse(input ?? {}).data;
  let resync = r?.resync === true;
  let { session, storageV5, credentials } = context.toolUseContext();
  let registeredHooks = r?.registeredHooks;
  invalidateCommandNames();
  let C = sleep(Math.min(pluginInstallTimeoutMs(), r?.waitMs ?? 1 / 0), signal, {
    unref: true,
  });
  let { resynced } = await awaitPluginSync(session, credentials, {
    resync,
    deadline: C,
  });
  signal.throwIfAborted();
  refreshPluginCaches(storageV5, credentials);
  let settingsRan = await Promise.race([
    ensureSettingsInstall(session, storageV5, credentials),
    C.then(() => false),
  ]);
  signal.throwIfAborted();
  let [pluginCommands, pluginSkills, k] = await Promise.all([
    getPluginCommands(storageV5),
    loadPluginSkills(storageV5),
    isCustomizationDisabled("agents") ? [] : loadPluginAgents(storageV5, credentials),
  ]);
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5, credentials);
  let loaded = session.pluginsSync.settingsInstall.loaded;
  await releaseSyncedDirsNotIn(
    [...allPluginsCacheOnly.enabled, ...(loaded?.plugins.enabled ?? [])],
    storageV5,
  ).catch(logError);
  let pluginFromMarketplaceEntryCacheOnly = loadPluginFromMarketplaceEntryCacheOnly(
    allPluginsCacheOnly,
    loaded?.plugins,
  );
  let sourcesText = await readSourcesText([
    ...pluginAgentSources(k, allPluginsCacheOnly, registeredHooks),
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
  let D = new Set(sourcesText.map(({ source }) => source.sourceName));
  for (let { source } of allPluginsForPreview.enabled) D.delete(source);
  let R = await updatePluginsForMarketplaces(
    [...allPluginsCacheOnly.enabled, ...(loaded?.plugins.enabled ?? [])].filter((O) => D.has(O.source)),
    storageV5,
  );
  let L = r?.hashes === true ? withSha256 : identityEntries;
  let j = (O) => (r?.dataDirs === true ? withPluginDataDir(O) : O);
  let v = {
    commands: j(
      L(
        await readSourcesText(
          [
            ...pluginCommandSources(pluginCommands),
            ...pluginCommandSources(loaded?.commands ?? [], pluginFromMarketplaceEntryCacheOnly),
          ],
          r?.hashes === true,
        ),
      ),
    ),
    skills: j(
      L(
        await readSourcesText([
          ...pluginCommandSources(pluginSkills),
          ...pluginCommandSources(loaded?.skills ?? [], pluginFromMarketplaceEntryCacheOnly),
        ]),
      ),
    ),
    agents: j(
      sourcesText.filter(
        ({ source }) =>
          !isPluginHooksMismatched(
            source,
            D.has(source.sourceName) ? R : allPluginsForPreview,
            registeredHooks?.[syncedPluginFolderId(source.pluginPath)],
          ),
      ),
    ),
    resynced,
    syncsSessionRefs: isSessionRefsSyncEnabled(session),
    settingsRan,
    comparesSource: true,
  };
  return {
    summary: `${v.commands.length} commands, ${v.skills.length} skills, ${v.agents.length} agents`,
    output: v,
  };
}
//@ chunk-9tyqgtn4.js:15427-15707 placement
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
//@ chunk-9tyqgtn4.js:15707-15868 placement
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
//@ chunk-9tyqgtn4.js:15868-16331 placement
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
  let [d, S, y, C] = await results;
  settingsInstall.loaded = {
    commands: d,
    skills: S,
    agents: y,
    plugins: C,
  };
}
//@ chunk-9tyqgtn4.js:16331-16779 placement
/**
 * 远程渲染插件条目的输入/输出结构：名称、类型、参数、只读、会话规则、钩子与哈希；输出为渲染结果或 missing/changed/guarded。
 */
var RENDER_PLUGIN_ENTRY_INPUT_SCHEMA = DoctorLazy(() =>
  u({
    name: string().min(1).max(1024),
    listedAs: _enum(["command", "skill"]),
    args: string().max(MAX_COMMAND_ARGS_CHARS),
    readOnly: M(),
    sessionRules: MAX_SESSION_RULES_CHARS(),
    sourceName: string().max(1024).optional(),
    registeredHooks: registeredHooksListSchema(),
    ownHooksSha256: string().optional().catch(undefined),
    expectSha256: string().regex(SHA256_HEX_RE).optional(),
  }),
);
var RENDER_PLUGIN_ENTRY_OUTPUT_SCHEMA = DoctorLazy(() =>
  discriminatedUnion("outcome", [
    renderSkillOutputSchema().extend({
      sourceName: string().optional(),
    }),
    skillFailureSchema().extend({
      sourceName: string().optional(),
    }),
    u({
      outcome: literal("missing"),
    }),
    u({
      outcome: literal("changed"),
    }),
    u({
      outcome: literal("guarded"),
    }),
  ]),
);
//@ chunk-9tyqgtn4.js:16779-18419 placement
async function renderPluginEntry(e, signal, context) {
  let {
    name: r,
    listedAs,
    args,
    readOnly,
    sessionRules,
    sourceName,
    registeredHooks,
    ownHooksSha256,
    expectSha256,
  } = RENDER_PLUGIN_ENTRY_INPUT_SCHEMA().parse(e);
  let context_2 = context.toolUseContext();
  let pluginEntry = await findPluginEntry(r, listedAs, context_2);
  if (pluginEntry === undefined) {
    let R = sleep(pluginInstallTimeoutMs(), signal, {
      unref: true,
    });
    await resyncForMissingEntry(context, signal, async () => {
      pluginEntry = await findPluginEntry(r, listedAs, context_2);
      return pluginEntry !== undefined;
    });
    pluginEntry ??= await findPluginEntry(r, listedAs, context_2);
    if (pluginEntry === undefined) {
      let settingsInstall = context_2.session.pluginsSync.settingsInstall;
      await Promise.race([settingsInstall.next ?? settingsInstall.current, R]);
      signal.throwIfAborted();
      pluginEntry = await findPluginEntry(r, listedAs, context_2);
    }
  }
  let command = pluginEntry?.command;
  let w = false;
  if (command !== undefined && expectSha256 !== undefined) {
    let [R] =
      command.pluginSource === undefined
        ? []
        : await readSourcesText([command.pluginSource], true, (j) => {
            w = !isPathAbsent(j);
          });
    let L =
      R !== undefined && sourceEntrySha256(R.source, R.text) === expectSha256
        ? validatePluginCommandAllowedTools(R.source, R.text)
        : null;
    command = L?.type === "prompt" ? L : undefined;
  }
  let z = await renderContextWithRules(
    context_2,
    readOnly || hasGuardHooks_2(command?.hooks),
    sessionRules,
    context.launchPermissionContext,
    e,
  );
  invalidateCommandNames();
  let I = pluginEntry === undefined ? undefined : await checkCommandSyncedAccess(pluginEntry.command);
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
  if (isDefined(I)) {
    logSyncedCommandRefused(pluginEntry.command, I);
    return {
      summary: "no such plugin entry",
      output: {
        outcome: "missing",
      },
    };
  }
  let { judgedBy } = pluginEntry;
  if (w)
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
    judgedBy.some((R) => isPluginHooksMismatched(command.pluginSource, R, registeredHooks))
  )
    return {
      summary: "guarded entry",
      output: {
        outcome: "guarded",
      },
    };
  let { summary, output } = await renderRemoteCommand(command, args, z, signal);
  return {
    summary,
    output: {
      ...output,
      sourceName: command.pluginSource?.sourceName,
    },
  };
}
//@ chunk-9tyqgtn4.js:18419-18451 placement
/**
 * 钩子内容的指纹（对钩子对象做序列化后的内容哈希）。
 */
function hooksFingerprint(hooks) {
  return computeContentHash(canonicalFingerprint(hooks));
}
//@ chunk-9tyqgtn4.js:18451-18544 placement
/**
 * 计算来源条目的内容哈希：文本哈希 + 去掉服务端署名后的来源对象哈希，再取一次哈希。
 */
function sourceEntrySha256(source, text) {
  let { serverAttribution, ...r } = source.config;
  return computeContentHash(
    computeContentHash(text) +
      canonicalFingerprint({
        ...source,
        config: r,
      }),
  );
}
//@ chunk-9tyqgtn4.js:18544-19012 placement
/**
 * 查找插件命令或技能条目，并给出用于判断插件可信度的插件集合。
 */
async function findPluginEntry(name, listedAs, { session, storageV5, credentials }) {
  let pluginPromptCommand = findPluginPromptCommand(
    await (listedAs === "skill" ? loadPluginSkills : getPluginCommands)(storageV5),
    name,
  );
  let loaded = session.pluginsSync.settingsInstall.loaded;
  let S = pluginPromptCommand ? await loadAllPluginsCacheOnly(storageV5, credentials) : loaded?.plugins;
  if (S === undefined) return;
  invalidateCommandNames();
  let allPluginsForPreview = await loadAllPluginsForPreview(storageV5);
  let pluginFromMarketplaceEntryCacheOnly = loadPluginFromMarketplaceEntryCacheOnly(allPluginsForPreview, S);
  let P =
    pluginPromptCommand ??
    findPluginPromptCommand(
      (listedAs === "skill" ? loaded?.skills : loaded?.commands) ?? [],
      name,
      pluginFromMarketplaceEntryCacheOnly,
    );
  let sourceName = P?.pluginSource?.sourceName ?? "";
  let any = allPluginsForPreview.enabled.some((h) => h.source === sourceName);
  if (P === undefined || !(any || pluginFromMarketplaceEntryCacheOnly.has(sourceName))) return;
  return {
    command: P,
    judgedBy: [
      S,
      any
        ? allPluginsForPreview
        : await updatePluginsForMarketplaces(
            S.enabled.filter((h) => h.source === sourceName),
            storageV5,
          ),
    ],
  };
}
//@ chunk-9tyqgtn4.js:19284-19464 placement
function findPluginPromptCommand(e, name, pluginFromMarketplaceEntryCacheOnly) {
  for (let r of e)
    if (
      r.type === "prompt" &&
      r.name === name &&
      r.pluginSource !== undefined &&
      !isBuiltinPluginId(r.pluginSource.sourceName) &&
      pluginFromMarketplaceEntryCacheOnly?.has(r.pluginSource.sourceName) !== false
    )
      return r;
  return;
}
//@ chunk-9tyqgtn4.js:19464-20076 placement
/**
 * 插件条目找不到时：等待当前同步结果，再限频触发一次重同步并等待（受截止时间约束），返回是否发生了新的同步。
 */
async function resyncForMissingEntry(context, signal, recheck) {
  let { session, storageV5, credentials } = context.toolUseContext();
  let missingEntry = session.pluginsSync.missingEntry;
  let S = sleep(pluginInstallTimeoutMs(), signal, {
    unref: true,
  }).then(() => {
    return;
  });
  let winner = await Promise.race([runFirstPluginsSync(session, credentials).catch(() => false), S]);
  signal.throwIfAborted();
  if (winner === undefined) return false;
  let C = () => {
    if (missingEntry.resync === null && !missingEntry.swept) {
      missingEntry.swept = true;
      refreshPluginCaches(storageV5, credentials);
    }
  };
  C();
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
    await Promise.race([resync, S]);
    signal.throwIfAborted();
  }
  C();
  return resync !== null && missingEntry.resync !== resync;
}
//@ chunk-9tyqgtn4.js:20329-20511 placement
function pluginCommandSources(e, pluginFromMarketplaceEntryCacheOnly) {
  return e.flatMap((a) =>
    a.type === "prompt" &&
    a.pluginSource !== undefined &&
    !isBuiltinPluginId(a.pluginSource.sourceName) &&
    pluginFromMarketplaceEntryCacheOnly?.has(a.pluginSource.sourceName) !== false &&
    !isSyncedSkillHiddenFromModel(a)
      ? [a.pluginSource]
      : [],
  );
}
//@ chunk-9tyqgtn4.js:20511-20602 placement
/**
 * 判断是跟随同步状态的技能且对模型隐藏（这类条目不作为插件来源）。
 */
function isSyncedSkillHiddenFromModel(e) {
  return e.type === "prompt" && e.pluginInfo?.followsSyncedSkillState === true && isHiddenFromModel(e);
}
//@ chunk-9tyqgtn4.js:20602-20843 placement
function pluginAgentSources(e, n, registeredHooks, pluginFromMarketplaceEntryCacheOnly) {
  return e.flatMap((s) =>
    s.source === "plugin" &&
    s.pluginSource !== undefined &&
    !isBuiltinPluginId(s.pluginSource.sourceName) &&
    pluginFromMarketplaceEntryCacheOnly?.has(s.pluginSource.sourceName) !== false &&
    !isPluginHooksMismatched(
      s.pluginSource,
      n,
      registeredHooks?.[syncedPluginFolderId(s.pluginSource.pluginPath)],
    )
      ? [s.pluginSource]
      : [],
  );
}
//@ chunk-9tyqgtn4.js:20843-20867 placement
/**
 * 原样返回来源条目（不需要附加字段时的恒等映射）。
 */
function identityEntries(e) {
  return e;
}
//@ chunk-9tyqgtn4.js:20867-20937 placement
/**
 * 给每个来源条目附上 sha256（用于校验同步内容未变）。
 */
function withSha256(e) {
  return e.map((n) => ({
    ...n,
    sha256: sourceEntrySha256(n.source, n.text),
  }));
}
//@ chunk-9tyqgtn4.js:20937-21018 placement
/**
 * 给每个来源条目附上插件数据目录。
 */
function withPluginDataDir(e) {
  return e.map((n) => ({
    ...n,
    pluginDataDir: pluginDataDirPath(n.source.sourceName),
  }));
}
//@ chunk-9tyqgtn4.js:21018-21346 placement
/**
 * 重新读取一组来源文件的文本（可使用缓存内容），读取失败的跳过。
 */
async function readSourcesText(sources, allowEmptyContent = false, onError) {
  let fsImplementation = getFsImplementation();
  return (
    await Promise.all(
      sources.map(async (source) => {
        let content = source.config?.metadata?.content;
        let y =
          (allowEmptyContent && content === "" ? undefined : content) ??
          (await readSmallFileChecked(fsImplementation, source.filePath, MAX_PLUGIN_COMMAND_FILE_BYTES).catch(
            (error) => {
              onError?.(error);
              return null;
            },
          ));
        if (y === null) {
          logForDebugging(`ListPluginCommands: ${source.filePath} could not be read again`, {
            level: "warn",
          });
          return [];
        }
        return [
          {
            source,
            text: y,
          },
        ];
      }),
    )
  ).flat();
}
//@ chunk-9tyqgtn4.js:21346-21706 placement
/**
 * 判断插件的钩子与宿主登记的不一致（含插件未启用、存在模块路径、来源路径不符或有加载错误）。
 */
function isPluginHooksMismatched(pluginSource, { enabled, errors }, registeredHooks) {
  let found = enabled.find((S) => S.source === pluginSource?.sourceName);
  if (found === undefined || found.modulePath !== undefined || registeredHooks === null) return true;
  let c =
    found.hooksConfig === undefined
      ? found.manifest.hooks === undefined && []
      : pluginHookFingerprints(found.hooksConfig);
  let d = registeredHooks?.toSorted() ?? [];
  return (
    !c ||
    !En(c, d) ||
    (c.length > 0 &&
      (marketplaceSuffix(found.source) !== SYNCED || found.path !== pluginSource?.pluginPath)) ||
    errors.some((error) => "plugin" in error && error.plugin === found.name)
  );
}
//@ chunk-9tyqgtn4.js:21706-21956 placement
function pluginHookFingerprints(hooksConfig) {
  let n = [];
  for (let [key, value] of Object.entries(hooksConfig))
    for (let { matcher, hooks } of value ?? [])
      for (let hook of hooks) {
        if (!isPrefilterableHook(hook)) return;
        n.push(
          canonicalFingerprint([
            key,
            matcher ?? "",
            hook.type === "command" && hook.onFailure === "block"
              ? Uo(hook, ["cloud"])
              : Uo(hook, ["cloud", "onFailure"]),
          ]),
        );
      }
  return n.sort();
}
export {
  byteLengthOfJson,
  resyncForMissingEntry,
  ensureSettingsInstall,
  findLocalSkillCommand,
  readHostCatalogSkill,
  skillUnavailableReason,
  isPluginHooksMismatched,
  registeredHooksListSchema,
  awaitPluginSync,
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
