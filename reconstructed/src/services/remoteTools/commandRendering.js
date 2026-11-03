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
import { join, join as join_2, dirname, dirname as dirname_2, basename, resolve } from "path";
import { SFo, isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
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
  o,
  T,
  U,
  A,
  M,
  Ir,
  oe,
  Ue,
  zodStrictObject,
  pe,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_MARKDOWN_FILE_BYTES } from "../../utils/markdownConfigLoader.js";
import { getHostState } from "../../utils/hostEnvironment.js";
import { readSmallFileChecked } from "../../utils/readSmallFile.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import {
  clearSkillCaches,
  getSkillDirCommandsCached,
  EVe,
  getDynamicSkills,
  parseSkillFileToCommand,
  isHostSkillCatalogEnabled,
  createHostCatalogSkill,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
} from "../../skills/loadSkillsDir.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { getProjectRoot, getMainLoopModelOverride, setMainLoopModelOverride } from "../../bootstrap/state.js";
import {
  k2e,
  isHostCatalogSkill,
  isKilledHostCatalogSkill,
  isSyncedSkill,
  isHiddenFromModel,
} from "../../utils/commandPredicates.js";
import { isSkillOff, getBuiltinCommands, passesPolicyGate } from "../../commands.js";
import { logForDebugging } from "../../utils/debug.js";
import { UUr } from "../../utils/argumentSubstitution.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { ge } from "../../utils/identity.js";
import { By } from "../plugins/accountSync/pluginsScopeGate.js";
import { AS, computeContentHash } from "../../utils/commitAttribution.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { readRepoRulesForRequest } from "../mcpServe/repoPermissionRules.js";
import { applicableSessionRules } from "./sessionRulesRendering.js";
import { serveModeDefaultAppState, serveModeTools } from "../../entrypoints/mcpServe/serveModeInput.js";
import { logError } from "../../utils/log.js";
import { toError, isAbortError, MalformedCommandError, isPathAbsent } from "../../utils/errors.js";
import { toolMatchesName } from "../../Tool.js";
import { EYs } from "../../tools/AgentTool/agentEffort.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import { getBundledSkills } from "../../skills/bundledSkills.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  w3n,
  startPendingDownload,
  readManifestText,
  parseManifestJson,
  parseValidRows,
  ese,
  runFirstPluginsSync,
  rerunPluginsSync,
} from "../../utils/claudeAiSync/skillsSync.js";
import { reloadSyncedSkills, Hce } from "../skillsSync/skillsSync.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { qCe, checkCommandSyncedAccess, LZ, gse } from "../../utils/claudeAiSync/syncedSkillAccess.js";
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
import { ic } from "../../utils/plugins/cacheUtils.js";
import {
  getPluginCommands,
  loadPluginSkills,
  validatePluginCommandAllowedTools,
  sKe,
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
import { Sie } from "../plugins/accountSync/syncedPluginHooks.js";
import { Xq } from "../api/requestFingerprint.js";
import { pluginDataDirPath } from "../../utils/plugins/pluginDirectories.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPrefilterableHook } from "../../utils/hooks.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-9tyqgtn4.js:1977-2019 placement
var De = 1e4,
  Fe = SFo,
  ae = { reason: "timed_out" };
/**
 * 读取宿主技能目录中的某个技能文本：已有缓存直接返回；否则排队（并发上限、前序工作未完成时拒绝）串行读取并缓存，等待时间超过上限返回 timed_out。
 */
//@ chunk-9tyqgtn4.js:2019-2707 placement
async function readHostCatalogSkill(skillName) {
  if (!isValidSkillDirName(skillName)) return { reason: "file_absent" };
  let hostCatalog = remoteToolsState().hostCatalog,
    a = hostCatalog.texts.get(skillName);
  if (a !== void 0) return a;
  let r = hostCatalog.readingForCalls.get(skillName);
  if (r === void 0) {
    if (isHostMountWorkStale()) return { reason: "earlier_work_outstanding" };
    if (hostCatalog.readingForCalls.size >= Fe) return { reason: "too_many_reads" };
    let c = hostCatalog.lastReadForCalls.then((S) => readHostCatalogEntry(hostCatalog, skillName, S));
    ((hostCatalog.lastReadForCalls = c.then(
      ({ probed: probed }) => probed,
      () => {
        return;
      },
    )),
      (r = {
        reading: c
          .then(({ outcome: outcome }) => outcome)
          .finally(() => {
            if ((hostCatalog.readingForCalls.delete(skillName), hostCatalog.readingForCalls.size === 0))
              hostCatalog.lastReadForCalls = Promise.resolve(void 0);
          }),
        since: performance.now(),
      }),
      hostCatalog.readingForCalls.set(skillName, r));
  }
  let s = r.since + De - performance.now();
  return (s > 0 ? await withDeadline(r.reading, s) : void 0) ?? { reason: "timed_out" };
}
/**
 * 从宿主技能目录读取一个技能条目：必要时先探测目录，读到后缓存文本，返回结果与探测信息。
 */
//@ chunk-9tyqgtn4.js:2707-3051 placement
async function readHostCatalogEntry(catalog, skillName, probed) {
  let r = () => remoteToolsState().hostCatalog === catalog;
  if (probed === void 0) await yieldToEventLoop();
  let s = probed ?? (await runHostMountWorkExclusive(async () => (r() ? resolvePublicCatalogRoot() : ae)));
  if ("reason" in s) return { outcome: s, probed: void 0 };
  await yieldToEventLoop();
  let c = await runHostMountWorkExclusive(async () => {
    let d = r() ? await readMountedSkillMd(s.root, skillName, s.device) : ae;
    if (!("reason" in d)) catalog.texts.set(skillName, d);
    return d;
  });
  return { outcome: c, probed: "reason" in c ? void 0 : s };
}
//@ chunk-9tyqgtn4.js:3080-3143 placement
var LISTPROJECTCOMMANDS = "ListProjectCommands",
  me = 8388608,
  B = 2000,
  vt = 4 * me,
  Ut = 4 * B;
//@ chunk-9tyqgtn4.js:3143-3221 placement
var ve = DoctorLazy(() => u({ after: E().int().min(0).optional(), afterName: o().optional() }));
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
      name: o().min(1).max(1024),
      source: T("userSettings").optional(),
      loadedFrom: U(["skills", "commands_DEPRECATED"]),
      text: o().max(MAX_MARKDOWN_FILE_BYTES),
    }),
  ),
  LISTED_COMMANDS_PAGE_SCHEMA = DoctorLazy(() =>
    u({
      commands: A(LISTED_COMMAND_SCHEMA()).max(B),
      cut: M(),
      refused: E().int().min(0),
      next: E().int().min(1).optional(),
      nextName: o().max(1024).optional(),
    }),
  );
//@ chunk-9tyqgtn4.js:3650-3740 placement
function te(e) {
  return getHostState().skillFiles.get(e) ?? (e.skillRoot ? join_2(e.skillRoot, "SKILL.md") : "");
}
//@ chunk-9tyqgtn4.js:3740-3846 placement
async function readSkillFileText(e) {
  let n = te(e);
  if (n === "") return null;
  try {
    return await readSmallFileChecked(getFsImplementation(), n, MAX_MARKDOWN_FILE_BYTES);
  } catch {
    return null;
  }
}
//@ chunk-9tyqgtn4.js:3846-3894 placement
function Xje(e) {
  return Buffer.byteLength(jsonStringifyRaw(e));
}
//@ chunk-9tyqgtn4.js:3894-4900 placement
async function listProjectCommands(e, n, a) {
  let { after: after, afterName: afterName } = ve().parse(e ?? {}),
    { storageV5: storageV5 } = a.toolUseContext();
  if (!after) (clearSkillCaches(), or());
  let d = [
    ...(await getSkillDirCommandsCached(getProjectRoot(), storageV5)),
    ...EVe(),
    ...getDynamicSkills(),
  ];
  n.throwIfAborted();
  let S = new Set(),
    y = [],
    C = 0,
    P = !1,
    x = 0,
    _ = 0,
    h,
    k = afterName === void 0;
  for (let w of d) {
    if (w.type !== "prompt" || S.has(w.name)) continue;
    S.add(w.name);
    let { name: z, source: source, loadedFrom: loadedFrom } = w;
    if (!isSettingsSkillOrCommand(w) || k2e(w) || isSkillOff(w)) continue;
    if (_++ < (after ?? 0)) continue;
    if (!k && z !== afterName) break;
    k = !0;
    let H = await readSkillFileText(w);
    n.throwIfAborted();
    let safeParse = LISTED_COMMAND_SCHEMA().safeParse({
      name: z,
      ...(source === "userSettings" && { source: source }),
      loadedFrom: loadedFrom,
      text: H,
    });
    if (!safeParse.success) {
      (x++, logForDebugging(`ListProjectCommands: ${z} refused from the listing`, { level: "warn" }));
      continue;
    }
    let R = Xje(safeParse.data),
      L = C + R <= me;
    if (after !== void 0 && (y.length === B || !L)) {
      h = { next: _ - 1, nextName: z };
      break;
    }
    if (y.length === B) {
      P = !0;
      break;
    }
    if (!L) {
      P = !0;
      continue;
    }
    ((C += R), y.push(safeParse.data));
  }
  if (!k) throw Error("the files have moved since the page before");
  return {
    summary: `${y.length} commands${P ? ", cut at a limit" : ""}${x > 0 ? `, ${x} refused` : ""}`,
    output: { commands: y, cut: P, refused: x, ...h },
  };
}
//@ chunk-9tyqgtn4.js:4900-6445 placement
var SKILL_RENDER_OPS = "ReadSkill",
  RENDERSKILL = "RenderSkill",
  RENDERPINNEDSKILL = "RenderPinnedSkill",
  RENDERBUILTINCOMMAND = "RenderBuiltInCommand",
  ye = 110000,
  he = 2000,
  X = 1e5,
  Xe = UUr,
  Ke = 60000,
  Ye = 4096,
  _e = 256,
  Pe = 256,
  ke = 32768,
  $e = [AGENT, REPORTFINDINGS, SKILL],
  fe = ge({ last: Promise.resolve() }, (e) => {
    e.last = Promise.resolve();
  }),
  we = DoctorLazy(() =>
    T(!0)
      .optional()
      .catch(void 0),
  ),
  Je = DoctorLazy(() =>
    u({
      name: o().min(1).max(1024),
      updatedAt: o().max(64).nullable(),
      waitMs: E().int().min(0).max(ye),
      fromHostCatalog: we(),
    }),
  ),
  ze = DoctorLazy(() =>
    u({ outcome: T("missing"), syncing: M(), fromHostCatalog: T(!0).optional(), withheld: T(!0).optional() }),
  ),
  Fn = DoctorLazy(() =>
    Ir("outcome", [u({ outcome: T("found"), text: o().max(By), fromHostCatalog: T(!0).optional() }), ze()]),
  ),
  K = DoctorLazy(() => oe().optional()),
  We = DoctorLazy(() =>
    u({
      name: o().min(1).max(1024),
      args: o().max(X),
      readOnly: M(),
      waitMs: E().int().min(0).max(ye),
      fromHostCatalog: we(),
      expectSha256: o().regex(AS).optional(),
      sessionRules: K(),
    }),
  ),
  qe = DoctorLazy(() =>
    u({
      name: o().min(1).max(1024),
      args: o().max(X),
      readOnly: M(),
      sessionRules: K(),
      model: o().min(1).max(256),
      session: u({
        tools: A(o().min(1).max(_e)).max(Ye).catch([]),
        isSkillPreload: M()
          .optional()
          .catch(void 0),
        modelScheduledOrigin: M()
          .optional()
          .catch(void 0),
        remoteSessionId: o()
          .min(1)
          .max(256)
          .optional()
          .catch(void 0),
        effort: Ue([U(EFFORT_LEVELS), E().int().min(0).max(1000)])
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
    }),
  ),
  Y = DoctorLazy(() =>
    u({
      outcome: T("rendered"),
      blocks: A(u({ type: T("text"), text: o().max(Xe) })).max(16),
      handedOff: A(zodStrictObject({ command: o().min(1).max(ke), tool: o().max(_e) }))
        .max(Pe)
        .optional(),
      fromHostCatalog: T(!0).optional(),
    }),
  ),
  se = DoctorLazy(() => u({ outcome: T("failed"), message: o().max(he) })),
  Hn = DoctorLazy(() => Ir("outcome", [Y(), ze(), se()]));
/**
 * 远程调用"读技能"：按名字找技能（宿主目录或本地，可等首次同步），被关闭/不可用时返回 missing，否则返回 SKILL.md 文本。
 */
//@ chunk-9tyqgtn4.js:6445-6926 placement
async function serveReadSkill(input, signal, { toolUseContext: toolUseContext }) {
  let { name: r, updatedAt: updatedAt, waitMs: waitMs, fromHostCatalog: fromHostCatalog } = Je().parse(input),
    S = fromHostCatalog
      ? await loadHostCatalogSkill(r)
      : await findSkillWithSync(r, waitMs, signal, toolUseContext(), updatedAt),
    y = S && skillUnavailableReason(S);
  if (y !== void 0) return { summary: "no such skill", output: missingSkillOutput(y, fromHostCatalog) };
  let C = fromHostCatalog
    ? (S?.getLoadedSkillMd?.() ?? null)
    : S?.skillRoot === void 0
      ? null
      : await readSmallFileChecked(getFsImplementation(), join(S.skillRoot, "SKILL.md"), By).catch(
          () => null,
        );
  return C === null
    ? { summary: "no such skill", output: missingSkillOutput(void 0, fromHostCatalog) }
    : {
        summary: "found",
        output: { outcome: "found", text: C, ...(fromHostCatalog && { fromHostCatalog: fromHostCatalog }) },
      };
}
//@ chunk-9tyqgtn4.js:6926-7651 placement
async function readListedSkill(
  e,
  n,
  { toolUseContext: toolUseContext, launchPermissionContext: launchPermissionContext },
) {
  let {
      name: s,
      args: args,
      readOnly: readOnly,
      waitMs: waitMs,
      fromHostCatalog: fromHostCatalog,
      expectSha256: expectSha256,
      sessionRules: sessionRules,
    } = We().parse(e),
    x = await renderContextWithRules(toolUseContext(), readOnly, sessionRules, launchPermissionContext, e),
    _ = fromHostCatalog ? await loadHostCatalogSkill(s) : await findSkillWithSync(s, waitMs, n, x);
  if (_ !== void 0 && isSettingsSkillOrCommand(_))
    (clearSkillCaches(), (_ = await findSkillWithSync(s, waitMs, n, x)));
  let h = _ && skillUnavailableReason(_);
  if (_ === void 0 || h !== void 0)
    return { summary: "no such skill", output: missingSkillOutput(h, fromHostCatalog) };
  if (expectSha256 !== void 0) {
    if (((_ = await parseListedSkill(_, expectSha256)), _ === void 0 || skillUnavailableReason(_) !== void 0))
      return {
        summary: "changed since listed",
        output: {
          outcome: "failed",
          message:
            "this skill's file changed after the session listed it, so it was not rendered; a new session lists the current file",
        },
      };
  }
  let k = await renderRemoteCommand(_, args, x, n);
  return fromHostCatalog && k.output.outcome === "rendered"
    ? { ...k, output: { ...k.output, fromHostCatalog: fromHostCatalog } }
    : k;
}
/**
 * 按会话规则与只读设置调整渲染上下文：读取仓库规则，计算适用的权限上下文与交接选项；无法确定时改为只读加载技能。
 */
//@ chunk-9tyqgtn4.js:7651-8082 placement
async function renderContextWithRules(context, readOnly, sessionRules, launchPermissionContext, input) {
  if (!readOnly && sessionRules === void 0) return context;
  let c = readOnly ? void 0 : await readRepoRulesForRequest("The render", input),
    d =
      c === void 0 || c.refused !== void 0
        ? void 0
        : applicableSessionRules(sessionRules, launchPermissionContext, c.repoRules);
  if (d === void 0) return { ...context, options: { ...context.options, readOnlySkillLoad: !0 } };
  let { toolPermissionContext: toolPermissionContext } = d;
  return {
    ...context,
    getAppState: () => ({ ...serveModeDefaultAppState(), toolPermissionContext: toolPermissionContext }),
    ...(d.offersHandOff && { promptShellHandOff: [] }),
    ...(d.classifiesEveryCall && { promptShellCallerClassifiesAll: !0 }),
  };
}
/**
 * 解析列出的技能：读取 SKILL.md，哈希与预期一致时解析为提示型命令。
 */
//@ chunk-9tyqgtn4.js:8082-8420 placement
async function parseListedSkill(command, expectedHash) {
  let a = isHostCatalogSkill(command)
    ? (command.getLoadedSkillMd?.() ?? null)
    : await readSkillFileText(command);
  if (a === null || computeContentHash(a) !== expectedHash) return;
  try {
    let r = parseSkillFileToCommand({
      content: a,
      skillFilePath: te(command),
      skillName: command.name,
      source: command.source,
      baseDir: command.skillRoot,
      loadedFrom: command.loadedFrom ?? "skills",
      serverAttribution: command.serverAttribution,
    });
    return r?.type === "prompt" ? r : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 远程调用"渲染命令"：按会话规则、只读、effort、模型与可用工具构造上下文，找到命令后在临时覆盖主模型的情况下渲染其提示。
 */
//@ chunk-9tyqgtn4.js:8420-9103 placement
async function serveRenderCommand(
  input,
  signal,
  { toolUseContext: toolUseContext, launchPermissionContext: launchPermissionContext },
) {
  let {
      name: s,
      args: args,
      readOnly: readOnly,
      sessionRules: sessionRules,
      model: model,
      session: session,
    } = qe().parse(input),
    P = await renderContextWithRules(
      toolUseContext(),
      readOnly,
      sessionRules,
      launchPermissionContext,
      input,
    ),
    x = session?.effort,
    _ = {
      ...P,
      ...(x !== void 0 && {
        permissionLayers: [...(P.permissionLayers ?? []), { kind: "effort", effort: x }],
      }),
      options: {
        ...P.options,
        mainLoopModel: model,
        ...(session && {
          tools: [
            ...P.options.tools,
            ...serveModeTools(!1).filter(
              (k) =>
                $e.some((w) => toolMatchesName(k, w)) &&
                session.tools.some((tool) => toolMatchesName(k, tool)) &&
                !P.options.tools.some((tool) => toolMatchesName(tool, k.name)),
            ),
          ],
          isSkillPreload: session.isSkillPreload,
          modelScheduledOrigin: session.modelScheduledOrigin,
        }),
      },
    },
    h = getValueFromInput(s);
  if (h === void 0 || skillUnavailableReason(h) !== void 0)
    return { summary: "no such command", output: missingSkillOutput() };
  return withModelOverride(model, () =>
    EYs(session?.remoteSessionId, () => renderRemoteCommand(h, args, _, signal)),
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
  let a = fe.last.then(async () => {
    let r = getMainLoopModelOverride();
    setMainLoopModelOverride(model);
    try {
      return await fn();
    } finally {
      setMainLoopModelOverride(r);
    }
  });
  return (
    (fe.last = a.then(
      () => {
        return;
      },
      () => {
        return;
      },
    )),
    a
  );
}
//@ chunk-9tyqgtn4.js:9370-10197 placement
async function renderRemoteCommand(e, n, a, r) {
  try {
    let promptForCommand = await e.getPromptForCommand(n, a),
      flattened = promptForCommand.flatMap((S) =>
        S.type === "text" ? [{ type: S.type, text: S.text }] : [],
      ),
      safeParse = Y().safeParse({
        outcome: "rendered",
        blocks: flattened,
        ...(a.promptShellHandOff?.length && { handedOff: a.promptShellHandOff }),
      });
    if (flattened.length !== promptForCommand.length || !safeParse.success)
      return {
        summary: "render refused",
        output: {
          outcome: "failed",
          message: a.promptShellHandOff?.length
            ? `the rendered skill is not plain text of a usable size, or it leaves Claude more than ${Pe} inline shell commands or one longer than ${ke} characters`
            : "the rendered skill is not plain text of a usable size",
        },
      };
    return { summary: "rendered", output: safeParse.data };
  } catch (error) {
    if (isAbortError(error) || r.aborted) throw error;
    if (!(error instanceof MalformedCommandError)) logError(toError(error));
    return {
      summary: "render failed",
      output: {
        outcome: "failed",
        message:
          error instanceof MalformedCommandError
            ? truncateToLength(error.message, he)
            : "the skill could not be rendered",
      },
    };
  }
}
//@ chunk-9tyqgtn4.js:10197-10344 placement
function missingSkillOutput(e, n) {
  return {
    outcome: "missing",
    syncing: remoteToolsState().firstSyncPromise !== null,
    ...(e === "account_skill_off" && { withheld: !0 }),
    ...(n && { fromHostCatalog: n }),
  };
}
/**
 * 查找技能：本地找不到时等待相应同步（技能名对应的同步、首次同步或限频的缺失重同步），超时后再查一次。
 */
//@ chunk-9tyqgtn4.js:10344-10971 placement
async function findSkillWithSync(name, waitMs, signal, context, updatedAt = null) {
  let c = remoteToolsState(),
    d = sleep(waitMs, signal, { unref: !0 }),
    S = (x) =>
      Promise.race([
        x.catch(() => {
          return;
        }),
        d,
      ]),
    y = await findLocalSkillCommand(name, context, updatedAt),
    C = stripSyncedSkillPrefix(name);
  if (y === void 0 && w3n(C))
    (await S(startPendingDownload(C)),
      signal.throwIfAborted(),
      (y = await findLocalSkillCommand(name, context, updatedAt)));
  if (y !== void 0 || !c.firstSyncPromise) return y;
  let firstSyncPromise = c.firstSyncPromise;
  if (c.firstRoundSettled) {
    let now = Date.now();
    if (now - c.missingSkillResyncAt >= Ke) {
      c.missingSkillResyncAt = now;
      let _ = reloadSyncedSkills(context.session, context.storageV5, context.credentials).finally(() => {
        if (c.missingSkillResync === _) c.missingSkillResync = null;
      });
      c.missingSkillResync = _;
    }
    firstSyncPromise = c.missingSkillResync ?? c.syncPromise;
  }
  if (!firstSyncPromise) return;
  return (
    await S(firstSyncPromise),
    signal.throwIfAborted(),
    Hce(),
    findLocalSkillCommand(name, context, updatedAt)
  );
}
/**
 * 从宿主技能目录加载技能为命令，并记录查找遥测。
 */
//@ chunk-9tyqgtn4.js:10971-11346 placement
async function loadHostCatalogSkill(name) {
  let n = stripSyncedSkillPrefix(name);
  if (!isValidSkillDirName(n) || !isHostSkillCatalogEnabled()) return;
  let hostCatalog = remoteToolsState().hostCatalog,
    r = {
      fromMemory: hostCatalog.texts.has(n),
      inLine: hostCatalog.readingForCalls.size,
      at: performance.now(),
    },
    s,
    c,
    d = !1;
  try {
    let S = await readHostCatalogSkill(n);
    if ("reason" in S) c = S;
    else {
      let y = createHostCatalogSkill(S);
      s = y?.type === "prompt" && y.name === name ? y : void 0;
    }
  } catch (error) {
    ((d = !0), logError(toError(error)));
  } finally {
    try {
      logHostCatalogLookup({ served: s, miss: c, threw: d, asked: r });
    } catch (error) {
      logError(toError(error));
    }
  }
  return s;
}
//@ chunk-9tyqgtn4.js:11346-11420 placement
var et = new Set(["timed_out", "earlier_work_outstanding", "too_many_reads"]);
/**
 * 记录宿主技能目录查找结果遥测：已加载、被扣留、未及时或未加载。
 */
//@ chunk-9tyqgtn4.js:11420-11883 placement
function logHostCatalogLookup({ served: served, miss: miss, threw: threw, asked: asked }) {
  let s = served !== void 0 && isKilledHostCatalogSkill(served),
    c = {
      from: lit("call"),
      named: 1,
      loaded: served === void 0 ? 0 : 1,
      withheld: s ? 1 : 0,
      from_memory: asked.fromMemory,
      in_line: asked.inLine,
      waited_ms: Math.round(performance.now() - asked.at),
      ...(miss !== void 0 && { [`mount_miss_${miss.reason}`]: 1 }),
      ...(threw && { threw: threw }),
    };
  if (s) logFeatureSad("skill_host_catalog", "all_withheld", c);
  else if (served !== void 0) logFeatureOk("skill_host_catalog", c);
  else
    logFeatureBad(
      "skill_host_catalog",
      miss !== void 0 && et.has(miss.reason) ? "not_in_time" : "none_loaded",
      c,
    );
}
/**
 * 返回技能不可用的原因（账号技能关闭或其他），可用时为 undefined。
 */
//@ chunk-9tyqgtn4.js:11883-12015 placement
function skillUnavailableReason(e) {
  or();
  let n = isSyncedSkill(e);
  if (isSkillOff(e)) return n ? "account_skill_off" : "other";
  if (k2e(e)) return "other";
  return qCe(e) ? "other" : void 0;
}
/**
 * 在本地技能、插件技能与动态技能中查找同名提示型命令（同步技能过期时不返回）。
 */
//@ chunk-9tyqgtn4.js:12015-12239 placement
async function findLocalSkillCommand(name, context, updatedAt) {
  let r = stripSyncedSkillPrefix(name) !== name,
    s = await getSkillDirCommandsCached(getProjectRoot(), context.storageV5);
  for (let c of [...s, ...EVe(), ...getDynamicSkills()])
    if (
      c.type === "prompt" &&
      c.name === name &&
      (c.loadedFrom === "syncedSkills" || !r) &&
      !isHostCatalogSkill(c)
    )
      return (await isSyncedSkillStale(c, updatedAt)) ? void 0 : c;
  return;
}
/**
 * 判断同步的技能是否早于给定时间（或在名称冲突中落败），用于决定是否需要等待重新同步。
 */
//@ chunk-9tyqgtn4.js:12239-12670 placement
async function isSyncedSkillStale(command, updatedAt) {
  if (updatedAt === null || command.loadedFrom !== "syncedSkills" || command.skillRoot === void 0) return !1;
  let a = dirname_2(command.skillRoot),
    r = await readManifestText(join(a, SYNCED_MANIFEST_FILE), null),
    s = r === null ? null : parseManifestJson(r, syncedSkillsManifestSchema(), null);
  if (s === null) return !1;
  let c = stripInvisibleChars(basename(command.skillRoot)),
    d = !1;
  for (let S of parseValidRows(syncedSkillEntrySchema(), s.skills)) {
    try {
      if (stripInvisibleChars(basename(syncedItemPath(S.name, a))) !== c) continue;
    } catch {
      continue;
    }
    if (S.updatedAt === COLLISION_LOSER) {
      d = !0;
      continue;
    }
    return S.updatedAt !== null && Date.parse(S.updatedAt) < Date.parse(updatedAt);
  }
  return d;
}
//@ chunk-9tyqgtn4.js:12670-14143 placement
var PLUGIN_COMMAND_OPS = "ListPluginCommands",
  RENDERPLUGINCOMMAND = "RenderPluginCommand",
  RENDERPINNEDPLUGINCOMMAND = "RenderPinnedPluginCommand",
  st = 60000,
  at = DoctorLazy(() =>
    Ue([
      MarketplaceSourceStrictSchema(),
      u({
        source: T("claudeai"),
        marketplaceId: o(),
        organizationUuid: o(),
        scope: U(CLAUDEAI_MARKETPLACE_KINDS).optional(),
      }),
      u({ source: T("pluginDirectory") }),
    ]),
  ),
  lt = DoctorLazy(() =>
    u({
      commandName: o(),
      filePath: o(),
      baseDir: o(),
      sourceName: o(),
      pluginManifest: PluginManifestSchema(),
      pluginPath: o(),
      provenance: u({
        officiallyAttested: M().optional(),
        marketplaceSource: at().optional(),
        npmResolution: u({ packageName: o(), tarballUrl: o() }).optional(),
        home: o().optional(),
      }).optional(),
      isSkill: M(),
      config: u({
        isSkillMode: M(),
        serverAttribution: u({ skillId: o().optional(), pluginId: o().optional() }).optional(),
        metadata: CommandMetadataSchema().optional(),
      }),
    }),
  ),
  ut = DoctorLazy(() =>
    u({
      filePath: o(),
      pluginName: o(),
      namespace: A(o()).readonly(),
      sourceName: o(),
      pluginPath: o(),
      pluginManifest: PluginManifestSchema(),
    }),
  ),
  Me = DoctorLazy(() =>
    o()
      .refine((e) => resolve(e) === e && dirname(e) !== e)
      .optional()
      .catch(void 0),
  ),
  be = DoctorLazy(() =>
    u({
      source: lt(),
      text: o(),
      pluginDataDir: Me(),
      sha256: o()
        .regex(AS)
        .optional()
        .catch(void 0),
    }),
  ),
  ko = DoctorLazy(() =>
    u({
      commands: A(be()),
      skills: A(be()),
      agents: A(u({ source: ut(), text: o(), pluginDataDir: Me() })),
      resynced: M().optional(),
      syncsSessionRefs: M().optional(),
      settingsRan: M().optional(),
      comparesSource: M().optional(),
    }),
  ),
  Pvr = DoctorLazy(() => A(o().max(64000)).max(1000).nullable().optional().catch(null)),
  dt = DoctorLazy(() =>
    u({
      registeredHooks: pe(o(), Pvr())
        .optional()
        .catch(void 0),
      resync: M().optional(),
      waitMs: E()
        .int()
        .positive()
        .optional()
        .catch(void 0),
      hashes: M()
        .optional()
        .catch(void 0),
      dataDirs: M()
        .optional()
        .catch(void 0),
    }),
  );
/**
 * 远程调用"列出插件命令"：必要时重新同步插件、等待设置安装，汇总插件命令、技能与代理（可带哈希/数据目录），过滤掉钩子与宿主登记不一致的插件代理。
 */
//@ chunk-9tyqgtn4.js:14143-15427 placement
async function serveListPluginCommands(input, signal, context) {
  let r = dt().safeParse(input ?? {}).data,
    s = r?.resync === !0,
    { session: session, storageV5: storageV5, credentials: credentials } = context.toolUseContext(),
    y = r?.registeredHooks;
  or();
  let C = sleep(Math.min(ese(), r?.waitMs ?? 1 / 0), signal, { unref: !0 }),
    { resynced: resynced } = await awaitPluginSync(session, credentials, { resync: s, deadline: C });
  (signal.throwIfAborted(), ic(storageV5, credentials));
  let winner = await Promise.race([ensureSettingsInstall(session, storageV5, credentials), C.then(() => !1)]);
  signal.throwIfAborted();
  let [_, h, k] = await Promise.all([
      getPluginCommands(storageV5),
      loadPluginSkills(storageV5),
      isCustomizationDisabled("agents") ? [] : loadPluginAgents(storageV5, credentials),
    ]),
    w = await loadAllPluginsCacheOnly(storageV5, credentials),
    loaded = session.pluginsSync.settingsInstall.loaded;
  await releaseSyncedDirsNotIn([...w.enabled, ...(loaded?.plugins.enabled ?? [])], storageV5).catch(logError);
  let I = loadPluginFromMarketplaceEntryCacheOnly(w, loaded?.plugins),
    F = await readSourcesText([
      ...pluginAgentSources(k, w, y),
      ...(loaded === null ? [] : pluginAgentSources(loaded.agents, loaded.plugins, y, I)),
    ]),
    H = await loadAllPluginsForPreview(storageV5),
    D = new Set(F.map(({ source: source }) => source.sourceName));
  for (let { source: source } of H.enabled) D.delete(source);
  let R = await updatePluginsForMarketplaces(
      [...w.enabled, ...(loaded?.plugins.enabled ?? [])].filter((O) => D.has(O.source)),
      storageV5,
    ),
    L = r?.hashes === !0 ? St : gt,
    j = (O) => (r?.dataDirs === !0 ? yt(O) : O),
    v = {
      commands: j(
        L(
          await readSourcesText(
            [...pluginCommandSources(_), ...pluginCommandSources(loaded?.commands ?? [], I)],
            r?.hashes === !0,
          ),
        ),
      ),
      skills: j(
        L(
          await readSourcesText([
            ...pluginCommandSources(h),
            ...pluginCommandSources(loaded?.skills ?? [], I),
          ]),
        ),
      ),
      agents: j(
        F.filter(
          ({ source: source }) =>
            !isPluginHooksMismatched(
              source,
              D.has(source.sourceName) ? R : H,
              y?.[syncedPluginFolderId(source.pluginPath)],
            ),
        ),
      ),
      resynced: resynced,
      syncsSessionRefs: isSessionRefsSyncEnabled(session),
      settingsRan: winner,
      comparesSource: !0,
    };
  return {
    summary: `${v.commands.length} commands, ${v.skills.length} skills, ${v.agents.length} agents`,
    output: v,
  };
}
/**
 * 等待插件同步结果（受截止时间约束），必要时触发一次重新同步，返回是否发生了重新同步。
 */
//@ chunk-9tyqgtn4.js:15427-15707 placement
async function awaitPluginSync(session, credentials, { resync: resync, deadline: deadline }) {
  let winner = await Promise.race([
    runFirstPluginsSync(session, credentials).catch(() => !1),
    deadline.then(() => {
      return;
    }),
  ]);
  if (winner !== !1 && !(resync && winner !== void 0)) return { resynced: !1 };
  return {
    resynced:
      (await Promise.race([
        rerunPluginsSync(session, credentials).then(
          () => !0,
          () => !1,
        ),
        deadline.then(() => !1),
      ])) && session.pluginsSync.lastRoundListed,
  };
}
/**
 * 确保设置中的插件安装已执行（合并并发请求），返回是否成功。
 */
//@ chunk-9tyqgtn4.js:15707-15868 placement
function ensureSettingsInstall(e, n, a) {
  if (isCustomizationDisabled("plugins")) return Promise.resolve(!0);
  let settingsInstall = e.pluginsSync.settingsInstall;
  return (
    (settingsInstall.next ??= runSettingsInstall(e, n, a).then(
      () => !0,
      (s) => (logError(s), !1),
    )),
    settingsInstall.next
  );
}
/**
 * 执行设置驱动的插件安装：等待托管设置与首次同步，安装插件后加载插件命令、技能和代理并缓存。
 */
//@ chunk-9tyqgtn4.js:15868-16331 placement
async function runSettingsInstall(session, storage, credentials) {
  let settingsInstall = session.pluginsSync.settingsInstall;
  (await settingsInstall.current,
    (settingsInstall.current = settingsInstall.next),
    (settingsInstall.next = null),
    await Promise.allSettled([waitForRemoteManagedSettingsToLoad()]),
    env.unset("CLAUDE_CODE_SYNC_PLUGIN_INSTALL"),
    await Promise.allSettled([
      installPluginsForHeadlessSerialized(void 0, storage, credentials),
      session.pluginsSync.firstSyncPromise,
    ]),
    ic(storage, credentials));
  let s = loadAllPlugins(storage, credentials);
  (await s, ic(storage, credentials), (getPluginRegistry().pluginLoadCacheOnly = s));
  let results = Promise.all([
    getPluginCommands(storage),
    loadPluginSkills(storage),
    isCustomizationDisabled("agents") ? [] : loadPluginAgents(storage, credentials),
    s,
  ]);
  ic(storage, credentials);
  let [d, S, y, C] = await results;
  settingsInstall.loaded = { commands: d, skills: S, agents: y, plugins: C };
}
/**
 * 远程渲染插件条目的输入/输出结构：名称、类型、参数、只读、会话规则、钩子与哈希；输出为渲染结果或 missing/changed/guarded。
 */
//@ chunk-9tyqgtn4.js:16331-16779 placement
var RENDER_PLUGIN_ENTRY_INPUT_SCHEMA = DoctorLazy(() =>
    u({
      name: o().min(1).max(1024),
      listedAs: U(["command", "skill"]),
      args: o().max(X),
      readOnly: M(),
      sessionRules: K(),
      sourceName: o().max(1024).optional(),
      registeredHooks: Pvr(),
      ownHooksSha256: o()
        .optional()
        .catch(void 0),
      expectSha256: o().regex(AS).optional(),
    }),
  ),
  RENDER_PLUGIN_ENTRY_OUTPUT_SCHEMA = DoctorLazy(() =>
    Ir("outcome", [
      Y().extend({ sourceName: o().optional() }),
      se().extend({ sourceName: o().optional() }),
      u({ outcome: T("missing") }),
      u({ outcome: T("changed") }),
      u({ outcome: T("guarded") }),
    ]),
  );
//@ chunk-9tyqgtn4.js:16779-18419 placement
async function renderPluginEntry(e, n, a) {
  let {
      name: r,
      listedAs: listedAs,
      args: args,
      readOnly: readOnly,
      sessionRules: sessionRules,
      sourceName: sourceName,
      registeredHooks: registeredHooks,
      ownHooksSha256: ownHooksSha256,
      expectSha256: expectSha256,
    } = RENDER_PLUGIN_ENTRY_INPUT_SCHEMA().parse(e),
    toolUseContext = a.toolUseContext(),
    h = await findPluginEntry(r, listedAs, toolUseContext);
  if (h === void 0) {
    let R = sleep(ese(), n, { unref: !0 });
    if (
      (await resyncForMissingEntry(
        a,
        n,
        async () => ((h = await findPluginEntry(r, listedAs, toolUseContext)), h !== void 0),
      ),
      (h ??= await findPluginEntry(r, listedAs, toolUseContext)),
      h === void 0)
    ) {
      let settingsInstall = toolUseContext.session.pluginsSync.settingsInstall;
      (await Promise.race([settingsInstall.next ?? settingsInstall.current, R]),
        n.throwIfAborted(),
        (h = await findPluginEntry(r, listedAs, toolUseContext)));
    }
  }
  let k = h?.command,
    w = !1;
  if (k !== void 0 && expectSha256 !== void 0) {
    let [R] =
        k.pluginSource === void 0
          ? []
          : await readSourcesText([k.pluginSource], !0, (j) => {
              w = !isPathAbsent(j);
            }),
      L =
        R !== void 0 && Oe(R.source, R.text) === expectSha256
          ? validatePluginCommandAllowedTools(R.source, R.text)
          : null;
    k = L?.type === "prompt" ? L : void 0;
  }
  let z = await renderContextWithRules(
    toolUseContext,
    readOnly || hasGuardHooks_2(k?.hooks),
    sessionRules,
    a.launchPermissionContext,
    e,
  );
  or();
  let I = h === void 0 ? void 0 : await checkCommandSyncedAccess(h.command);
  if (
    (or(),
    h === void 0 ||
      Ie(h.command) ||
      (sourceName ?? h.command.pluginSource?.sourceName) !== h.command.pluginSource?.sourceName ||
      (marketplaceSuffix(h.command.pluginSource?.sourceName ?? "") === SYNCED && Sie()))
  )
    return { summary: "no such plugin entry", output: { outcome: "missing" } };
  if (LZ(I)) return (gse(h.command, I), { summary: "no such plugin entry", output: { outcome: "missing" } });
  let { judgedBy: judgedBy } = h;
  if (w)
    return {
      summary: "entry not read",
      output: {
        outcome: "failed",
        message: "its file could not be read where its plugin is kept, so it was not run",
        sourceName: h.command.pluginSource?.sourceName,
      },
    };
  if (k === void 0) return { summary: "changed since listed", output: { outcome: "changed" } };
  if (
    ownHooksSha256 !== (k.hooks && pt(k.hooks)) ||
    judgedBy.some((R) => isPluginHooksMismatched(k.pluginSource, R, registeredHooks))
  )
    return { summary: "guarded entry", output: { outcome: "guarded" } };
  let { summary: summary, output: output } = await renderRemoteCommand(k, args, z, n);
  return { summary: summary, output: { ...output, sourceName: k.pluginSource?.sourceName } };
}
//@ chunk-9tyqgtn4.js:18419-18451 placement
function pt(e) {
  return computeContentHash(Xq(e));
}
//@ chunk-9tyqgtn4.js:18451-18544 placement
function Oe(e, n) {
  let { serverAttribution: serverAttribution, ...r } = e.config;
  return computeContentHash(computeContentHash(n) + Xq({ ...e, config: r }));
}
/**
 * 查找插件命令或技能条目，并给出用于判断插件可信度的插件集合。
 */
//@ chunk-9tyqgtn4.js:18544-19012 placement
async function findPluginEntry(
  name,
  listedAs,
  { session: session, storageV5: storageV5, credentials: credentials },
) {
  let c = findPluginPromptCommand(
      await (listedAs === "skill" ? loadPluginSkills : getPluginCommands)(storageV5),
      name,
    ),
    loaded = session.pluginsSync.settingsInstall.loaded,
    S = c ? await loadAllPluginsCacheOnly(storageV5, credentials) : loaded?.plugins;
  if (S === void 0) return;
  or();
  let y = await loadAllPluginsForPreview(storageV5),
    C = loadPluginFromMarketplaceEntryCacheOnly(y, S),
    P =
      c ?? findPluginPromptCommand((listedAs === "skill" ? loaded?.skills : loaded?.commands) ?? [], name, C),
    x = P?.pluginSource?.sourceName ?? "",
    any = y.enabled.some((h) => h.source === x);
  if (P === void 0 || !(any || C.has(x))) return;
  return {
    command: P,
    judgedBy: [
      S,
      any
        ? y
        : await updatePluginsForMarketplaces(
            S.enabled.filter((h) => h.source === x),
            storageV5,
          ),
    ],
  };
}
//@ chunk-9tyqgtn4.js:19284-19464 placement
function findPluginPromptCommand(e, n, a) {
  for (let r of e)
    if (
      r.type === "prompt" &&
      r.name === n &&
      r.pluginSource !== void 0 &&
      !isBuiltinPluginId(r.pluginSource.sourceName) &&
      a?.has(r.pluginSource.sourceName) !== !1
    )
      return r;
  return;
}
/**
 * 插件条目找不到时：等待当前同步结果，再限频触发一次重同步并等待（受截止时间约束），返回是否发生了新的同步。
 */
//@ chunk-9tyqgtn4.js:19464-20076 placement
async function resyncForMissingEntry(context, signal, recheck) {
  let { session: session, storageV5: storageV5, credentials: credentials } = context.toolUseContext(),
    missingEntry = session.pluginsSync.missingEntry,
    S = sleep(ese(), signal, { unref: !0 }).then(() => {
      return;
    }),
    winner = await Promise.race([runFirstPluginsSync(session, credentials).catch(() => !1), S]);
  if ((signal.throwIfAborted(), winner === void 0)) return !1;
  let C = () => {
    if (missingEntry.resync === null && !missingEntry.swept)
      ((missingEntry.swept = !0), ic(storageV5, credentials));
  };
  if ((C(), winner && (await recheck()))) return !1;
  if ((signal.throwIfAborted(), missingEntry.resync === null && Date.now() - missingEntry.resyncAt >= st)) {
    missingEntry.resyncAt = Date.now();
    let x = rerunPluginsSync(session, credentials)
      .catch(() => !1)
      .finally(() => {
        ((missingEntry.resync = null), (missingEntry.swept = !1));
      });
    missingEntry.resync = x;
  }
  let resync = missingEntry.resync;
  if (resync !== null) (await Promise.race([resync, S]), signal.throwIfAborted());
  return (C(), resync !== null && missingEntry.resync !== resync);
}
//@ chunk-9tyqgtn4.js:20329-20511 placement
function pluginCommandSources(e, n) {
  return e.flatMap((a) =>
    a.type === "prompt" &&
    a.pluginSource !== void 0 &&
    !isBuiltinPluginId(a.pluginSource.sourceName) &&
    n?.has(a.pluginSource.sourceName) !== !1 &&
    !Ie(a)
      ? [a.pluginSource]
      : [],
  );
}
//@ chunk-9tyqgtn4.js:20511-20602 placement
function Ie(e) {
  return e.type === "prompt" && e.pluginInfo?.followsSyncedSkillState === !0 && isHiddenFromModel(e);
}
//@ chunk-9tyqgtn4.js:20602-20843 placement
function pluginAgentSources(e, n, a, r) {
  return e.flatMap((s) =>
    s.source === "plugin" &&
    s.pluginSource !== void 0 &&
    !isBuiltinPluginId(s.pluginSource.sourceName) &&
    r?.has(s.pluginSource.sourceName) !== !1 &&
    !isPluginHooksMismatched(s.pluginSource, n, a?.[syncedPluginFolderId(s.pluginSource.pluginPath)])
      ? [s.pluginSource]
      : [],
  );
}
//@ chunk-9tyqgtn4.js:20843-20867 placement
function gt(e) {
  return e;
}
//@ chunk-9tyqgtn4.js:20867-20937 placement
function St(e) {
  return e.map((n) => ({ ...n, sha256: Oe(n.source, n.text) }));
}
//@ chunk-9tyqgtn4.js:20937-21018 placement
function yt(e) {
  return e.map((n) => ({ ...n, pluginDataDir: pluginDataDirPath(n.source.sourceName) }));
}
/**
 * 重新读取一组来源文件的文本（可使用缓存内容），读取失败的跳过。
 */
//@ chunk-9tyqgtn4.js:21018-21346 placement
async function readSourcesText(sources, allowEmptyContent = !1, onError) {
  let r = getFsImplementation();
  return (
    await Promise.all(
      sources.map(async (c) => {
        let d = c.config?.metadata?.content,
          y =
            (allowEmptyContent && d === "" ? void 0 : d) ??
            (await readSmallFileChecked(r, c.filePath, sKe).catch((C) => (onError?.(C), null)));
        if (y === null)
          return (
            logForDebugging(`ListPluginCommands: ${c.filePath} could not be read again`, { level: "warn" }),
            []
          );
        return [{ source: c, text: y }];
      }),
    )
  ).flat();
}
/**
 * 判断插件的钩子与宿主登记的不一致（含插件未启用、存在模块路径、来源路径不符或有加载错误）。
 */
//@ chunk-9tyqgtn4.js:21346-21706 placement
function isPluginHooksMismatched(pluginSource, { enabled: enabled, errors: errors }, registeredHooks) {
  let found = enabled.find((S) => S.source === pluginSource?.sourceName);
  if (found === void 0 || found.modulePath !== void 0 || registeredHooks === null) return !0;
  let c =
      found.hooksConfig === void 0
        ? found.manifest.hooks === void 0 && []
        : pluginHookFingerprints(found.hooksConfig),
    d = registeredHooks?.toSorted() ?? [];
  return (
    !c ||
    !En(c, d) ||
    (c.length > 0 &&
      (marketplaceSuffix(found.source) !== SYNCED || found.path !== pluginSource?.pluginPath)) ||
    errors.some((S) => "plugin" in S && S.plugin === found.name)
  );
}
//@ chunk-9tyqgtn4.js:21706-21956 placement
function pluginHookFingerprints(e) {
  let n = [];
  for (let [a, r] of Object.entries(e))
    for (let { matcher: matcher, hooks: hooks } of r ?? [])
      for (let d of hooks) {
        if (!isPrefilterableHook(d)) return;
        n.push(
          Xq([
            a,
            matcher ?? "",
            d.type === "command" && d.onFailure === "block"
              ? Uo(d, ["cloud"])
              : Uo(d, ["cloud", "onFailure"]),
          ]),
        );
      }
  return n.sort();
}

export {
  Xje,
  resyncForMissingEntry,
  ensureSettingsInstall,
  findLocalSkillCommand,
  readHostCatalogSkill,
  skillUnavailableReason,
  isPluginHooksMismatched,
  Pvr,
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
