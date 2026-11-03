/**
 * skills/loadSkillsDir.ts
 *
 * Skill 发现与加载：managed/用户/同步/项目/--add-dir/旧 commands 目录扫描、frontmatter 字段解析、去重、条件 skill 与动态 skill 发现。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/loadSkillsDir.ts
 * pieces: chunk-e6aww6q8.js (76)
 * attribution: placement 22, fingerprint 11, layout 40, callgraph-witnessed 1, file-local 2
 */
import { join, basename, dirname, sep, relative, isAbsolute } from "path";
import { readdir, realpath } from "fs/promises";
import { Re } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { DoctorLazy, DoctorWithPlugins } from "../cli/handlers/util.js";
import { looseObject, string, QD, E, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import {
  readManifestText,
  parseManifestJson,
  parseValidRows,
  isSkillsSyncEnvOn,
} from "../utils/claudeAiSync/skillsSync.js";
import {
  SYNCED_MANIFEST_FILE,
  stripInvisibleChars as stripInvisibleChars_3,
  syncedItemPath,
  isSyncedDirName,
  getAccountCacheKey,
  getSyncBucket,
  SYNCED_DIR,
  foldName as foldName_2,
  trimTrailingDotsSpaces,
  SYNCED_SUBDIR,
} from "../utils/plugins/syncedItems.js";
import {
  COLLISION_LOSER,
  readRegularFileText,
  probeOneMountKind,
  PUBLIC,
  flattenMountMissCounts,
} from "./hostSkillMounts.js";
import { buildSkillAttribution, isSkillAttributionEnabled } from "../utils/telemetry/skillAttribution.js";
import {
  isCcsTenant,
  getRootSession,
  getProjectConfigRoot,
  isDiskless,
  getToolsMachine,
  getProjectRootOrNull,
  getOriginalCwd,
  getSkillsSyncVetoed,
  getAdditionalDirectoriesForClaudeMd,
  getProjectRoot,
} from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isNameWithNoJoinerFixes, isNonEmptyIdentifier, escapeAngleBrackets } from "../utils/sanitization.js";
import {
  isSkillFile_2,
  frontmatterDisallowedTools,
  memoizeLastValue,
} from "../utils/plugins/loadPluginCommands.js";
import { logForDebugging } from "../utils/debug.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { isSkillShownToModel, displaySkillFields } from "./skillSources.js";
import { getManagedFilePath } from "../utils/settings/managedPath.js";
import { getClaudeConfigDir, isBareMode, getClaudeConfigDirOrNull } from "../utils/envUtils.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { quotedPrintable, printableOrEmpty } from "../utils/printableName.js";
import { reservedNameReason, usesReservedSkillNamespace } from "./reservedSkillNames.js";
import { formatCommandDescription } from "../tools/SkillTool/prompt.js";
import {
  hasNestedHooks,
  PLUGIN_NON_HOOK_KEYS,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
} from "../schemas/hookEntryValidation.js";
import { HooksSchema } from "../schemas/hooks.js";
import { unwrapResults } from "../utils/suggestions/slackChannelSuggestions.js";
import {
  coerceDescriptionToString,
  parseBooleanFrontmatter,
  parseFrontmatterName,
  parseBooleanishFrontmatter,
  parseShellFrontmatter,
  getDeclaredFrontmatterFields,
  parseFrontmatter,
} from "../utils/frontmatterParser.js";
import {
  extractDescriptionFromMarkdown,
  parseSlashCommandToolsFromFrontmatter,
  loadMarkdownFilesCached,
  loadMarkdownFiles,
  getProjectDirsUpToHome,
  isInGlobalClaudeFolder,
} from "../utils/markdownConfigLoader.js";
import { parseUserSpecifiedModel } from "../utils/model/modelDisplay.js";
import { parseEffortValue, EFFORT_LEVELS, getEffortLevelOrHigh } from "../utils/effort.js";
import { isPlainObject as isPlainObject_5 } from "../utils/isPlainObject.js";
import {
  MalformedCommandError,
  isENOENT,
  isFsInaccessible,
  sanitizeErrnoForTelemetry,
  isSyscallError,
} from "../utils/errors.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getHostState, getOrCreate, keyOrNull } from "../utils/hostEnvironment.js";
import { checkFrontmatterShadow } from "../utils/frontmatterSchema.js";
import { scrubMemoryKeys, buildFrontmatterResult } from "../services/memorySync/pathScrub.js";
import { withSyncedSkillPrefix, isSafeSkillName, stripSyncedSkillPrefix } from "./syncedSkills.js";
import { reportRefusedSkillName } from "./skillNameRules.js";
import {
  SKILL_DIR_PLACEHOLDER,
  SKILL_DIR_REF_RE,
  PROJECT_DIR_REF_RE,
  PROJECT_DIR_PLACEHOLDER,
  expandSkillPlaceholders,
} from "./skillPathPlaceholders.js";
import { plural } from "../utils/stringUtils.js";
import {
  shouldLoadPermissionRules,
  frontmatterToolGrantWithheldReason,
  reportIgnoredFrontmatterToolGrants,
} from "../utils/permissions/permissionsLoader.js";
import { prependBaseDir } from "./bundledSkills.js";
import { inlineSkillModelOverride } from "../utils/model/model.js";
import { getEffortValue, getEffortLayerOverride } from "../utils/permissions/toolPermissionContext.js";
import { substituteArguments } from "../utils/argumentSubstitution.js";
import {
  escapeShellBangs,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  executeShellCommandsInPrompt,
  withCommandAllowRules,
} from "../utils/promptShellExecution.js";
import { mcpSkillResourceHint } from "./mcpSkillPrompt.js";
import { clearUserFacingName } from "../commands.js";
import { readSmallFileChecked } from "../utils/readSmallFile.js";
import { MAX_SCOPE_RESPONSE_BYTES } from "../services/plugins/accountSync/pluginsScopeGate.js";
import { stripBom } from "../utils/json.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../utils/pagedRead.js";
import { isValidKeySegment, STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { SKILLS_DIR, groupPluginSourcesByName } from "../utils/telemetry/pluginTelemetry.js";
import { getThinkbackSkillDir } from "../utils/plugins/pluginLinks.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getFsImplementation } from "../utils/fsOperations.js";
import { sleep } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { isRestrictedToPluginOnly } from "../utils/settings/pluginOnlyPolicy.js";
import { isSettingSourceEnabled } from "../utils/settings/constants.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import {
  isManagedFolderWritable,
  managedFolderCondition,
  filterUntrustedSkills,
  isUntrustedManagedSkill,
} from "../plugins/functionHooks/sites/promptContextSites.js";
import { hostSkillCatalogFolders } from "./hostSkillCatalog.js";
import { hostSkillCatalog } from "../utils/sessionShape.js";
import { env } from "../utils/env.js";
import { hasSyncMarker } from "../utils/claudeAiSync/syncOwnedRoot.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { count } from "../utils/collections.js";
import { isKilledHostCatalogSkill, isSyncedSkill } from "../utils/commandPredicates.js";
import { HostScoped } from "../utils/hostScoped.js";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { findGitRootUncached, findGitRoot } from "../utils/git.js";
import { isPathGitignored, isPathGitignoredBool } from "../utils/git/gitignore.js";
import { getCwd, hasOutermostCallFrame } from "../utils/cwd.js";
import { getPlatform } from "../utils/platform.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { PathSpace } from "../utils/resultError.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { filterUsableIgnorePatterns } from "../utils/ignorePatterns.js";
import { isPathWithinCaseAware } from "../utils/pathPrefix.js";
import { registerLoaderSide } from "../services/memorySync/syncFiles.js";

//@ chunk-e6aww6q8.js:981425-981439 placement
/**
 * 技能的身份文件路径。
 */
var identityPath_2 = (e) => e;
//@ chunk-e6aww6q8.js:981439-981459 placement
var skillIgnoreDefault = Re(require_ignore(), 1);
//@ chunk-e6aww6q8.js:981688-982101 placement
/**
 * 同步技能清单的 schema：单个技能条目（id、名称、来源、版本、插件等）与清单整体。
 */
var syncedSkillEntrySchema = DoctorLazy(() =>
  looseObject({
    skillId: string(),
    name: string(),
    description: string().catch(""),
    source: string().catch(""),
    updatedAt: string().nullable().catch(null),
    requestedVersion: string().optional().catch(undefined),
    backingPluginId: string().optional().catch(undefined),
    userInvocable: QD().catch(undefined),
    disableModelInvocation: QD().catch(undefined),
  }),
);
var syncedSkillsManifestSchema = DoctorLazy(() =>
  looseObject({
    lastUpdated: E().catch(0),
    skills: unknown().optional(),
    staleDirs: unknown().optional(),
    pendingClaims: unknown().optional(),
  }),
);
//@ chunk-e6aww6q8.js:982101-982117 placement
var EMPTY_SYNCED_SKILL_MAP = new Map();
//@ chunk-e6aww6q8.js:982117-982515 placement
/**
 * 读取同步技能清单，按目录名映射到技能 id（跳过冲突落败项与重名项），失败时返回空表。
 */
async function readSyncedSkillIds(e) {
  try {
    let manifestText = await readManifestText(join(e, SYNCED_MANIFEST_FILE), null);
    if (manifestText === null) return EMPTY_SYNCED_SKILL_MAP;
    let manifestJson = parseManifestJson(manifestText, syncedSkillsManifestSchema(), null);
    if (manifestJson === null) return EMPTY_SYNCED_SKILL_MAP;
    let s = new Map();
    let h = new Set();
    for (let y of parseValidRows(syncedSkillEntrySchema(), manifestJson.skills)) {
      let S;
      try {
        S = stripInvisibleChars_3(basename(syncedItemPath(y.name, e)));
      } catch {
        continue;
      }
      if (y.updatedAt === COLLISION_LOSER) continue;
      if (h.has(S)) {
        s.delete(S);
        continue;
      }
      h.add(S);
      let skillAttribution = buildSkillAttribution(y.skillId, y.backingPluginId);
      if (skillAttribution !== undefined) s.set(S, skillAttribution);
    }
    return s;
  } catch {
    return EMPTY_SYNCED_SKILL_MAP;
  }
}
//@ chunk-e6aww6q8.js:982515-982681 placement
async function readDirNameSet(e) {
  try {
    return new Set(await readdir(e));
  } catch (error) {
    let code = error instanceof Error && "code" in error ? error.code : undefined;
    return code === "ENOENT" || code === "ENOTDIR" ? new Set() : undefined;
  }
}
//@ chunk-e6aww6q8.js:982681-982710 placement
var TENGU_SLATE_WICKET = "tengu_slate_wicket";
//@ chunk-e6aww6q8.js:982710-982753 placement
/**
 * ccs 租户或开关 tengu_slate_wicket 打开（默认开）。
 */
function isSlateWicketOn() {
  return isCcsTenant() || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SLATE_WICKET, true) !== false;
}
//@ chunk-e6aww6q8.js:982753-982797 placement
/**
 * 是 SKILL.md 路径，或是非空标识符且开关关闭。
 */
function isSkillPathEligible(e) {
  return isNameWithNoJoinerFixes(e) || (isNonEmptyIdentifier(e) && !isSlateWicketOn());
}
//@ chunk-e6aww6q8.js:982797-982831 placement
var SKILL_NAME_PROSE_REGEX = /(?:^|:) | (?::|$)|^:|:$/;
//@ chunk-e6aww6q8.js:982831-982875 placement
function isSkillFile(filePath) {
  return isNameWithNoJoinerFixes(filePath) && !SKILL_NAME_PROSE_REGEX.test(filePath);
}
//@ chunk-e6aww6q8.js:982875-982919 placement
/**
 * 是技能文件路径，或是非空标识符且开关关闭。
 */
function isSkillFilePathOrIdentifier(filePath) {
  return isSkillFile(filePath) || (isNonEmptyIdentifier(filePath) && !isSlateWicketOn());
}
//@ chunk-e6aww6q8.js:982919-983062 placement
/**
 * 名称非法时的说明文字、名称告警条数上限与非 ASCII 空白正则。
 */
var INVALID_NAME_MESSAGE =
  "a name may not hold hidden, direction-changing or blank-like characters, < or >, or be over 256 characters";
var MAX_NAME_WARNINGS = 100;
var NON_ASCII_SPACE_RE = /[^\P{Z} ]/gu;
//@ chunk-e6aww6q8.js:984088-984286 placement
function normalizeArgumentNames(e) {
  if (!e) return [];
  let n = (r) => typeof r === "string" && r.trim() !== "" && !/^\d+$/.test(r);
  if (Array.isArray(e)) return e.filter(n);
  if (typeof e === "string") return e.split(/\s+/).filter(n);
  return [];
}
//@ chunk-e6aww6q8.js:984286-984389 placement
/**
 * 把多余的参数名格式化为 "[a] [b]" 形式的提示，没有时返回 undefined。
 */
function formatExtraArgHints(argNames, typedArgs) {
  let sliced = argNames.slice(typedArgs.length);
  if (sliced.length === 0) return;
  return sliced.map((s) => `[${s}]`).join(" ");
}
//@ chunk-e6aww6q8.js:1668178-1668487 fingerprint = transformSkillFiles (1)
function transformSkillFiles(files) {
  let filesByDir = new Map();
  for (let file of files) {
    let dir = dirname(file.filePath);
    let dirFiles = filesByDir.get(dir) ?? [];
    dirFiles.push(file);
    filesByDir.set(dir, dirFiles);
  }
  let result = [];
  for (let [dir, dirFiles] of filesByDir) {
    let skillFiles = dirFiles.filter((dirFile) => isSkillFile_2(dirFile.filePath));
    if (skillFiles.length > 0) {
      let skillFile = skillFiles[0];
      if (skillFiles.length > 1)
        logForDebugging(`Multiple skill files found in ${dir}, using ${basename(skillFile.filePath)}`);
      result.push(skillFile);
    } else result.push(...dirFiles);
  }
  return result;
}
//@ chunk-e6aww6q8.js:3120512-3120537 placement
/**
 * 按会话保存的已加载命令插槽。
 */
var sessionCommandsSlot = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:3120537-3120587 placement
/**
 * 读当前会话已加载的命令（无则空数组）。
 */
function peekSessionCommands() {
  return sessionCommandsSlot.peek(getRootSession())?.commands ?? [];
}
//@ chunk-e6aww6q8.js:3120587-3120719 placement
function isSkillDirSource(loadedFrom, source) {
  if (source === "policySettings") return false;
  return (
    loadedFrom === "skills" ||
    loadedFrom === "syncedSkills" ||
    loadedFrom === "commands_DEPRECATED" ||
    loadedFrom === "plugin"
  );
}
//@ chunk-e6aww6q8.js:3120719-3120762 placement
/**
 * 该加载来源的技能对模型隐藏。
 */
function isHiddenFromModelSource(loadedFrom) {
  return !isSkillShownToModel({
    loadedFrom,
  });
}
//@ chunk-e6aww6q8.js:3120762-3120977 fingerprint = getSkillsPath (0.847)
/**
 * 按设置来源给出 .claude/<dir> 的路径：policySettings → managed 目录，userSettings → ~/.claude/<dir>，projectSettings → 项目根/.claude/<dir>，plugin → 字面 plugin。
 */
function getSkillsPath(source, dir) {
  switch (source) {
    case "policySettings":
      return join(getManagedFilePath(), ".claude", dir);
    case "userSettings":
      return join(getClaudeConfigDir(), dir);
    case "projectSettings":
      return join(getProjectConfigRoot() ?? ".", ".claude", dir);
    case "plugin":
      return "plugin";
    default:
      return "";
  }
}
//@ chunk-e6aww6q8.js:3120977-3121060 layout
/**
 * 把 skill 的 name、description、whenToUse 拼成一段文本，用于估算其在技能清单里的 token。
 */
function getSkillListingText(skill) {
  return [skill.name, skill.description, skill.whenToUse].filter(Boolean).join(" ");
}
//@ chunk-e6aww6q8.js:3121060-3121098 layout
/**
 * 粗略估算一个 skill 在技能清单中占用的 token 数。
 */
function estimateSkillListingTokens(skill, bytesPerToken) {
  return roughTokenCountEstimation(getSkillListingText(skill), bytesPerToken);
}
//@ chunk-e6aww6q8.js:3121098-3121182 layout
async function realpathOrNull(e) {
  if (isDiskless()) return null;
  try {
    return await realpath(e);
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3121182-3121228 layout
async function isRealPathSelf(e) {
  return (await realpathOrNull(e)) === e;
}
//@ chunk-e6aww6q8.js:3121228-3121653 layout
function refuseReservedSkillName({ name: e, path, change }) {
  let s = {
    name: quotedPrintable(e),
    ...(path !== undefined && {
      path: printableOrEmpty(path),
    }),
    change,
  };
  let h = `${s.path ?? ""}\x00${s.name}\x00${change}`;
  let refusedReservedNames = getDynamicSkillState().refusedReservedNames;
  if (refusedReservedNames.has(h)) return;
  refusedReservedNames.set(h, s);
  let S = change === "workflow-name" ? `workflow "${s.name}"` : `"${s.name}"`;
  let w = s.path ? ` (${s.path})` : "";
  let L = reservedNameReason(s.name);
  logForDebugging(
    `[skills] not loading ${S}${w}: that name ${L}; ${change === "frontmatter-name" ? "change its name: line" : "rename it"}`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:3121653-3121867 layout
function filterReservedSkillNames(e) {
  return e.filter(({ skill, filePath }) => {
    if (!formatCommandDescription(skill)) return true;
    let s = usesReservedSkillNamespace(skill.name);
    refuseReservedSkillName({
      name: s ? skill.name : (skill.userFacingName?.() ?? skill.name),
      path: s ? getSkillNameRootPath(filePath, skill.name) : filePath,
      change: s ? "path" : "frontmatter-name",
    });
    return false;
  });
}
//@ chunk-e6aww6q8.js:3121867-3122073 layout
function getSkillNameRootPath(filePath, name) {
  let r = basename(filePath).toLowerCase() === "skill.md";
  let s = r ? dirname(filePath) : filePath;
  let h = s;
  let y = r ? basename(s) : basename(s).replace(/\.md$/i, "");
  while (y !== name) {
    let S = dirname(h);
    if (S === h || !name.endsWith(`:${y}`)) return s;
    h = S;
    y = `${basename(h)}:${y}`;
  }
  return h;
}
//@ chunk-e6aww6q8.js:3122073-3122798 fingerprint = parseHooksFromFrontmatter (0.391)
/**
 * 解析 skill frontmatter 的 hooks：顶层误写的 PreToolUse/PermissionRequest 视为不可加载的守卫，返回 unloadableGuard=true（此时 skill 不带钩子也不带 allowed-tools）；否则按 HooksSchema 校验。
 */
function parseSkillHooksFromFrontmatter(frontmatter, skillName) {
  if (hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS)) {
    logForDebugging(
      `Skill '${skillName}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      {
        level: "error",
      },
    );
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  if (!frontmatter.hooks)
    return {
      hooks: undefined,
      unloadableGuard: false,
    };
  let r = validateHooksSetting(frontmatter.hooks);
  for (let note of r.notes)
    logForDebugging(`Skill '${skillName}': ${note}`, {
      level: "warn",
    });
  if (r.unloadableGuards.length > 0) {
    logForDebugging(
      `Skill '${skillName}': ${r.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
      {
        level: "error",
      },
    );
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  let result = HooksSchema().safeParse(frontmatter.hooks);
  if (!result.success) {
    logForDebugging(`Invalid hooks in skill '${skillName}': ${result.error.message}`);
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  return {
    hooks: result.data,
    unloadableGuard: false,
  };
}
//@ chunk-e6aww6q8.js:3122798-3122976 fingerprint = parseSkillPaths (1)
/**
 * 解析 frontmatter.paths：去掉结尾 /**、丢空串；全为 ** 时视为无条件（返回 undefined）。有 paths 的 skill 是条件 skill。
 */
function parseSkillPaths(frontmatter) {
  if (!frontmatter.paths) return;
  let patterns = unwrapResults(frontmatter.paths)
    .map((pattern) => (pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern))
    .filter((r) => r.length > 0);
  if (patterns.length === 0 || patterns.every((pattern) => pattern === "**")) return;
  return patterns;
}
//@ chunk-e6aww6q8.js:3122976-3124230 fingerprint = parseSkillFrontmatterFields (0.837)
/**
 * 把 skill/命令 frontmatter 解析成统一字段：name、description（缺省取正文首行）、allowed-tools、disallowed-tools、argument-hint、arguments、when_to_use、version、model（inherit 特判）、disable-model-invocation、user-invocable、hooks、context(fork)、agent、background、effort、shell、created_by、fallback、metadata、declaredFields。
 */
function parseSkillFrontmatterFields(
  frontmatter,
  markdownContent,
  resolvedName,
  descriptionFallbackLabel = "Skill",
) {
  let validatedDescription = coerceDescriptionToString(frontmatter.description, resolvedName);
  let description =
    validatedDescription ?? extractDescriptionFromMarkdown(markdownContent, descriptionFallbackLabel);
  let userInvocable =
    frontmatter["user-invocable"] === undefined
      ? true
      : parseBooleanFrontmatter(frontmatter["user-invocable"]);
  let model = frontmatter.model;
  let model_2;
  if (typeof model === "string" && model.trim().length > 0) {
    let trimmed = model.trim();
    model_2 = trimmed.toLowerCase() === "inherit" ? "inherit" : parseUserSpecifiedModel(trimmed);
  }
  let effortRaw = frontmatter.effort;
  let effort = effortRaw !== undefined ? parseEffortValue(effortRaw) : undefined;
  if (effortRaw !== undefined && effort === undefined)
    logForDebugging(
      `Skill ${resolvedName} has invalid effort '${effortRaw}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
    );
  let { hooks, unloadableGuard } = parseSkillHooksFromFrontmatter(frontmatter, resolvedName);
  let allowedTools = unloadableGuard
    ? []
    : parseSlashCommandToolsFromFrontmatter(frontmatter["allowed-tools"]);
  return {
    displayName: parseFrontmatterName(frontmatter.name, `skill ${resolvedName}`),
    description,
    hasUserSpecifiedDescription: validatedDescription !== null,
    allowedTools,
    disallowedTools: frontmatterDisallowedTools(frontmatter),
    argumentHint: frontmatter["argument-hint"] != null ? String(frontmatter["argument-hint"]) : undefined,
    argumentNames: normalizeArgumentNames(frontmatter.arguments),
    whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : undefined,
    version: frontmatter.version != null ? String(frontmatter.version) : undefined,
    model: model_2,
    disableModelInvocation: parseBooleanFrontmatter(frontmatter["disable-model-invocation"]),
    userInvocable,
    hooks,
    executionContext: frontmatter.context === "fork" ? "fork" : undefined,
    agent: frontmatter.agent != null ? String(frontmatter.agent) : undefined,
    background: parseBooleanishFrontmatter(frontmatter.background),
    effort,
    shell: parseShellFrontmatter(frontmatter.shell, resolvedName),
    createdBy:
      frontmatter.created_by === "dream-proposal" || frontmatter.improved_by === "dream-proposal"
        ? "dream-proposal"
        : undefined,
    declaredFields: getDeclaredFrontmatterFields(frontmatter),
    fallback: parseBooleanishFrontmatter(frontmatter.fallback),
    metadata: isPlainObject_5(frontmatter.metadata) ? frontmatter.metadata : undefined,
  };
}
//@ chunk-e6aww6q8.js:3124790-3125717 placement
/**
 * 解析技能文件的 YAML frontmatter，解析失败时忽略并记录。
 */
function parseSkillFileToCommand({
  content,
  skillFilePath,
  skillName,
  source,
  baseDir,
  loadedFrom,
  serverAttribution,
  pathScoped = true,
  untrusted = false,
  parsedElsewhere = false,
}) {
  let frontmatter = parseFrontmatter(content, skillFilePath, {
    normalizeKeys: true,
    untrusted,
  });
  let {
    frontmatter: frontmatter_2,
    frontmatterAsWritten,
    asWrittenProblem,
    content: content_2,
    parseError,
  } = frontmatter;
  if (parseError && untrusted) throw new MalformedCommandError(`frontmatter was not read: ${parseError}`);
  if (parseError) {
    logForDebugging(
      `[skills] YAML frontmatter in ${skillFilePath} failed to parse and was ignored: ${parseError}`,
      {
        level: "error",
      },
    );
    logFeatureSad("skill_load_dir", "skill_load_yaml_failed");
  }
  let markdownContent = memoizeLastValue(getHostState().skillContentIntern, skillFilePath, content_2);
  if (!parsedElsewhere) checkFrontmatterShadow("skill", frontmatter_2);
  let skillFrontmatterFields = parseSkillFrontmatterFields(frontmatter_2, markdownContent, skillName);
  let Me = loadedFrom === "syncedSkills";
  return createSkillCommand({
    ...skillFrontmatterFields,
    ...(Me ? DoctorWithPlugins(skillFrontmatterFields) : undefined),
    skillName,
    markdownContent,
    textAboveBody:
      Me && content.endsWith(markdownContent)
        ? memoizeLastValue(
            getHostState().skillContentIntern,
            `${skillFilePath}#above-body`,
            content.slice(0, content.length - markdownContent.length),
          )
        : undefined,
    contentHash: Bun.hash(content).toString(36),
    source,
    baseDir,
    loadedFrom,
    paths: pathScoped ? parseSkillPaths(frontmatter_2) : undefined,
    serverAttribution,
    skillFile: Me
      ? scrubMemoryKeys(frontmatter, skillFilePath)
      : buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
  });
}
//@ chunk-e6aww6q8.js:3125717-3128830 placement
/**
 * 构造 skill 命令对象（type:prompt）：替换 allowed-tools 中的 ${CLAUDE_SKILL_DIR}/${CLAUDE_PROJECT_DIR}，getPromptForCommand 会加 Base directory 前缀、替换 $ARGUMENTS/具名参数、按来源执行正文里的 !`shell` 命令；名字不合法时不加载。
 */
function createSkillCommand({
  skillName,
  displayName,
  description,
  hasUserSpecifiedDescription,
  markdownContent,
  resolveBody,
  contentLength,
  textAboveBody,
  contentHash,
  allowedTools,
  disallowedTools,
  argumentHint,
  argumentNames,
  whenToUse,
  version,
  model,
  disableModelInvocation,
  userInvocable,
  source,
  baseDir,
  mcpResourceRoot,
  loadedFrom,
  hooks,
  executionContext,
  agent,
  background,
  paths,
  effort,
  shell,
  createdBy,
  declaredFields,
  fallback,
  metadata,
  serverAttribution,
  skillFile,
}) {
  let no = loadedFrom === "syncedSkills";
  let hn = no ? withSyncedSkillPrefix(skillName) : skillName;
  if (!isSkillFilePathOrIdentifier(hn)) {
    reportRefusedSkillName(hn, "is not offered");
    return;
  }
  let ho = displaySkillFields({
    description,
    argumentHint,
    whenToUse,
    argumentNames,
  });
  let yn = allowedTools.length > 0;
  if (baseDir && allowedTools.length > 0) {
    let vn = identityPath_2(baseDir);
    allowedTools = allowedTools.map((allowedTool) => allowedTool.replaceAll(SKILL_DIR_PLACEHOLDER, () => vn));
  } else if (allowedTools.some((allowedTool) => SKILL_DIR_REF_RE.test(allowedTool))) {
    let filtered = allowedTools.filter((allowedTool) => !SKILL_DIR_REF_RE.test(allowedTool));
    let co = allowedTools.length - filtered.length;
    logForDebugging(
      `[skills] ${skillName}: loaded without ${co} allowed-tools ${plural(co, "entry", "entries")} naming CLAUDE_SKILL_DIR, because the skill has no folder of its own`,
      {
        level: "warn",
      },
    );
    logFeatureSad("skill_load_dir", "skill_load_no_skill_dir_grants_dropped");
    allowedTools = filtered;
  }
  if (allowedTools.some((allowedTool) => PROJECT_DIR_REF_RE.test(allowedTool))) {
    let vn = getToolsMachine() ? null : (getProjectConfigRoot() ?? getProjectRootOrNull());
    if (vn === null) {
      let filtered = allowedTools.filter((allowedTool) => !PROJECT_DIR_REF_RE.test(allowedTool));
      let So = allowedTools.length - filtered.length;
      logForDebugging(
        `[skills] ${skillName}: loaded without ${So} allowed-tools ${plural(So, "entry", "entries")} naming CLAUDE_PROJECT_DIR, because this process has no folder where the tools run`,
        {
          level: "warn",
        },
      );
      logFeatureSad("skill_load_dir", "skill_load_no_project_dir_grants_dropped");
      allowedTools = filtered;
    } else
      allowedTools = allowedTools.map((allowedTool) =>
        allowedTool.replaceAll(PROJECT_DIR_PLACEHOLDER, () => identityPath_2(vn)),
      );
  }
  let Kn = displayName || skillName;
  let Xn = !no
    ? Kn
    : isSafeSkillName(skillName) &&
        stripInvisibleChars_3(stripSyncedSkillPrefix(Kn)) === stripInvisibleChars_3(skillName)
      ? skillName
      : withSyncedSkillPrefix(Kn);
  let fo = false;
  let To = () => {
    let vn = shouldLoadPermissionRules(hooks) ? [] : (bo.allowedTools ?? []);
    let co =
      vn.length === 0
        ? undefined
        : frontmatterToolGrantWithheldReason(
            source,
            undefined,
            "fromHostCatalog" in bo && bo.fromHostCatalog === true,
          );
    if (co === undefined) {
      fo = false;
      return vn;
    }
    if (!fo) {
      fo = true;
      reportIgnoredFrontmatterToolGrants(
        hn,
        {
          source,
        },
        vn,
        co,
      );
    }
    return [];
  };
  let bo = {
    type: "prompt",
    name: hn,
    ...(no && {
      unqualifiedName: skillName,
      aliases: [skillName],
    }),
    description: ho.description,
    hasUserSpecifiedDescription,
    allowedTools,
    ...(yn && {
      getAllowedTools: async () => To(),
    }),
    disallowedTools: disallowedTools?.length ? disallowedTools : undefined,
    argumentHint: ho.argumentHint,
    argNames: argumentNames.length > 0 ? ho.argumentNames : undefined,
    whenToUse: ho.whenToUse,
    version,
    model,
    disableModelInvocation,
    userInvocable,
    context: executionContext,
    agent,
    background,
    effort,
    paths,
    declaredFields,
    contentLength: contentLength ?? markdownContent.length,
    ...(textAboveBody !== undefined && {
      getLoadedSkillMd: () => textAboveBody + markdownContent,
    }),
    contentHash: contentHash ?? Bun.hash(markdownContent).toString(36),
    isHidden: !userInvocable,
    progressMessage: "running",
    userFacingName() {
      return Xn;
    },
    source,
    loadedFrom,
    createdBy,
    fallback,
    metadata,
    hooks,
    skillRoot: baseDir,
    serverAttribution,
    skillFile,
    async getPromptForCommand(args, context) {
      let So = resolveBody ? await resolveBody(context) : markdownContent;
      let ko = baseDir ? `${prependBaseDir(baseDir)}${So}` : So;
      let effortLevel = getEffortLevelOrHigh(
        inlineSkillModelOverride(model) ?? context.options.mainLoopModel,
        getEffortValue(context),
        effort ?? getEffortLayerOverride(context.permissionLayers),
      );
      let ao = {
        baseDir,
        loadedFrom,
        effortLevel,
      };
      ko = substituteArguments(
        ko,
        args,
        true,
        argumentNames,
        isSkillShownToModel({
          loadedFrom,
        })
          ? ($o) => escapeAngleBrackets(escapeShellBangs(expandSkillPlaceholders($o, ao)))
          : ($o) => escapeShellBangs(expandSkillPlaceholders($o, ao)),
        ($o, yo) => expandSkillPlaceholders($o, ao, yo),
      );
      if (isSkillDirSource(loadedFrom, source) && isSkillShellExecutionDisabled())
        ko = replacePromptShellCommands(ko);
      else if (isHiddenFromModelSource(loadedFrom))
        ko = await executeShellCommandsInPrompt(
          ko,
          {
            ...context,
            getAppState: withCommandAllowRules(context, To()),
          },
          `/${skillName}`,
          shell,
        );
      if (mcpResourceRoot && !baseDir)
        ko = `${mcpSkillResourceHint(mcpResourceRoot)}

${ko}`;
      return [
        {
          type: "text",
          text: ko,
        },
      ];
    },
  };
  if (!isSkillPathEligible(Xn.replace(/&[lg]t;/g, "<"))) {
    reportRefusedSkillName(Xn, `is not shown for ${hn}`);
    clearUserFacingName(bo);
  }
  return bo;
}
//@ chunk-e6aww6q8.js:3128830-3129260 placement
/**
 * 读取 skill 目录下 .claude-plugin/plugin.json 的 name，用来判断是否是被禁用的插件 skill。
 */
async function readSkillPluginManifestName(fsImplementation, n, name, s) {
  try {
    let smallFileChecked = await readSmallFileChecked(
      fsImplementation,
      join(n, ".claude-plugin", "plugin.json"),
      MAX_SCOPE_RESPONSE_BYTES,
    );
    if (smallFileChecked === null) {
      logForDebugging(
        `[skills] skipping ${n}: .claude-plugin/plugin.json is not a regular file or exceeds ${MAX_SCOPE_RESPONSE_BYTES} byte limit`,
        {
          level: "warn",
        },
      );
      return {
        skip: true,
      };
    }
    let parsed = JSON.parse(stripBom(smallFileChecked));
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string" &&
      parsed.name
    )
      return {
        name: parsed.name,
      };
    return {
      name,
    };
  } catch (error) {
    if (!isENOENT(error))
      return {
        name,
      };
    return {
      name: null,
    };
  }
}
//@ chunk-e6aww6q8.js:3129260-3129738 layout
async function listUserSkillDirNamesV5(e) {
  let n = [];
  let allPages = await readAllPages(
    (s) =>
      e.listEntries(
        {
          namespace: "userConfigDir",
          dir: "skills",
        },
        s
          ? {
              cursor: s,
            }
          : undefined,
      ),
    (s) => {
      for (let h of s)
        if (
          h.kind === "scope" &&
          h.scope.namespace === "userConfigDir" &&
          h.scope.dir === "skills" &&
          h.scope.relPath?.length === 1 &&
          isValidKeySegment(h.scope.relPath[0])
        ) {
          let y = h.scope.relPath[0];
          if (isSyncedDirName(y)) continue;
          n.push(y);
        }
    },
  );
  switch (allPages.status) {
    case "done":
      return {
        status: "ok",
        names: n,
      };
    case "error":
      return {
        status: "error",
        error: allPages.error,
      };
    case "capped":
      return {
        status: "capped",
      };
  }
}
//@ chunk-e6aww6q8.js:3129738-3132838 callgraph-witnessed = loadSkillsFromSkillsDir (0.254)
/**
 * 通过 storageV5 后端读取用户 skills（userConfigDir/skills/*\/SKILL.md）：跳过被 enabledPlugins 禁用的同名插件 skill，超过大小限制或读失败的跳过并记遥测。
 */
async function loadUserSkillsFromStorageV5(e, n, r) {
  let s = await listUserSkillDirNamesV5(r);
  if (s.status !== "ok") {
    if (!(s.status === "error" && s.error.code === "Failed" && s.error.failureClass === "permission")) {
      let q = s.status === "error" ? s.error.code : `listing exceeded ${DEFAULT_MAX_PAGES} pages`;
      logForDebugging(`Failed to read skills directory ${e}: ${q}`, {
        level: "error",
      });
      logFeatureSad("skill_load_dir", "skill_load_readdir_failed");
    }
    return [];
  }
  let names = s.names;
  let y = null;
  let S = new Set();
  {
    let G = `@${SKILLS_DIR}`;
    if (n === "userSettings" && e === getThinkbackSkillDir()) {
      let enabledPlugins = getInitialSettings_2().enabledPlugins;
      for (let key in enabledPlugins)
        if (enabledPlugins[key] === false && key.endsWith(G)) S.add(key.slice(0, -G.length));
    }
  }
  let fs = isSkillAttributionEnabled();
  let results = await Promise.all(
    names.map(async (entry) => {
      try {
        let skillDirPath = join(e, entry);
        let skillFilePath = join(skillDirPath, "SKILL.md");
        if (S.size > 0) {
          let pt = STORAGE_SPACES.userConfigDir("skills", [entry, ".claude-plugin", "plugin.json"]);
          let Et = await r.read([pt]);
          if (!Et.ok) {
            logForDebugging(
              `[skills] skipping ${skillDirPath}: .claude-plugin/plugin.json could not be checked (${Et.error.code})`,
              {
                level: "warn",
              },
            );
            y = "skill_load_read_failed";
            return null;
          }
          let yt = Et.value.items[0];
          if (yt.found) {
            if (yt.totalBytes > MAX_SCOPE_RESPONSE_BYTES) {
              logForDebugging(
                `[skills] skipping ${skillDirPath}: .claude-plugin/plugin.json exceeds ${MAX_SCOPE_RESPONSE_BYTES} byte limit`,
                {
                  level: "warn",
                },
              );
              y = "skill_load_read_failed";
              return null;
            }
            let gt;
            try {
              let parsed = JSON.parse(stripBom(Buffer.from(yt.value).toString("utf-8")));
              gt =
                parsed !== null &&
                typeof parsed === "object" &&
                "name" in parsed &&
                typeof parsed.name === "string" &&
                parsed.name
                  ? parsed.name
                  : entry;
            } catch {
              gt = entry;
            }
            if (gt !== null && S.has(gt)) return null;
          } else if (S.has(entry)) {
            let gt = false;
            let allPages = await readAllPages(
              (It) =>
                r.listEntries(
                  {
                    namespace: "userConfigDir",
                    dir: "skills",
                    relPath: [entry],
                  },
                  It
                    ? {
                        suffix: ".claude-plugin",
                        cursor: It,
                      }
                    : {
                        suffix: ".claude-plugin",
                      },
                ),
              (It) => {
                gt ||= It.some(
                  (Yt) =>
                    Yt.kind === "key" &&
                    Yt.key.namespace === "userConfigDir" &&
                    Yt.key.relPath.at(-1) === ".claude-plugin",
                );
              },
              {
                until: () => gt,
              },
            );
            if (allPages.status !== "done") {
              let It =
                allPages.status === "error"
                  ? allPages.error.code
                  : `listing exceeded ${DEFAULT_MAX_PAGES} pages`;
              logForDebugging(
                `[skills] skipping ${skillDirPath}: .claude-plugin shape could not be checked (${It})`,
                {
                  level: "warn",
                },
              );
              y = "skill_load_read_failed";
              return null;
            }
            if (gt) return null;
          }
        }
        let Se = STORAGE_SPACES.userConfigDir("skills", [entry, "SKILL.md"]);
        let ke = await r.read([Se]);
        if (!ke.ok) {
          logForDebugging(`[skills] failed to read ${skillFilePath}: ${ke.error.code}`, {
            level: "warn",
          });
          y = "skill_load_read_failed";
          return null;
        }
        let we = ke.value.items[0];
        if (!we.found) return null;
        if (we.totalBytes > MAX_SCOPE_RESPONSE_BYTES) {
          logForDebugging(
            `[skills] skipping ${skillFilePath}: ${we.totalBytes} bytes exceeds ${MAX_SCOPE_RESPONSE_BYTES} byte limit`,
            {
              level: "warn",
            },
          );
          y = "skill_load_too_large";
          return null;
        }
        let str = Buffer.from(we.value).toString("utf-8");
        let { frontmatter, frontmatterAsWritten, asWrittenProblem, content, parseError } = parseFrontmatter(
          str,
          skillFilePath,
          {
            normalizeKeys: true,
          },
        );
        if (parseError) {
          logForDebugging(
            `[skills] YAML frontmatter in ${skillFilePath} failed to parse and was ignored: ${parseError}`,
            {
              level: "error",
            },
          );
          logFeatureSad("skill_load_dir", "skill_load_yaml_failed");
        }
        let markdownContent = memoizeLastValue(getHostState().skillContentIntern, skillFilePath, content);
        checkFrontmatterShadow("skill", frontmatter);
        let parsed = parseSkillFrontmatterFields(frontmatter, markdownContent, entry);
        let paths = parseSkillPaths(frontmatter);
        return {
          skill: createSkillCommand({
            ...parsed,
            skillName: entry,
            markdownContent,
            contentHash: Bun.hash(str).toString(36),
            source: n,
            baseDir: skillDirPath,
            loadedFrom: "skills",
            paths,
            serverAttribution: fs(skillDirPath),
            skillFile: buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
          }),
          filePath: skillFilePath,
        };
      } catch (error) {
        logForDebugging(`[skills] failed to parse ${join(e, entry, "SKILL.md")}: ${error}`, {
          level: "error",
        });
        y = "skill_load_parse_failed";
        return null;
      }
    }),
  );
  if (y) logFeatureBad("skill_load_dir", y);
  else logFeatureOk("skill_load_dir");
  return results
    .filter((result) => result?.skill !== undefined)
    .sort((G, q) => G.skill.name.localeCompare(q.skill.name));
}
//@ chunk-e6aww6q8.js:3132838-3136107 layout
/**
 * 扫描一个 skills 目录下每个子目录的 SKILL.md 并转成命令：跳过保留目录名（synced）、带冒号的 synced 子目录、被禁用的同名插件；/mnt 下首次 readdir 为空会重试一次；支持 storageV5 与 host catalog 模式。
 */
async function loadSkillsFromSkillsDir(e, n, r = "skills", s, h) {
  if (s !== undefined) {
    if (n === "userSettings" && e === getThinkbackSkillDir())
      return filterReservedSkillNames(await loadUserSkillsFromStorageV5(e, n, s));
    logForDebugging(
      `[skills] storageV5 handed in for non-user base ${e}: not reading it through the backend`,
      {
        level: "warn",
      },
    );
  }
  if (isDiskless()) {
    logForDebugging(`Not scanning ${e}: the session is diskless, so no skills load from it`, {
      level: "warn",
    });
    return [];
  }
  let fsImplementation = getFsImplementation();
  let S;
  try {
    S = await fsImplementation.readdir(e);
  } catch (error) {
    if (!isFsInaccessible(error)) {
      logForDebugging(`Failed to read skills directory ${e}: ${error}`, {
        level: "error",
      });
      logFeatureSad("skill_load_dir", "skill_load_readdir_failed");
    }
    return [];
  }
  if (S.length === 0 && e.startsWith("/mnt/")) {
    await sleep(250);
    try {
      let entries = await fsImplementation.readdir(e);
      if (entries.length > 0) {
        logForDebugging(
          `Skills directory ${e}: first readdir was empty, retry returned ${entries.length} entries (transient mount race)`,
          {
            level: "warn",
          },
        );
        logFeatureSad("skill_load_dir", "skill_load_mnt_transient_empty");
        S = entries;
      } else logFeatureSad("skill_load_dir", "skill_load_mnt_persistent_empty");
    } catch (error) {
      let ke = sanitizeErrnoForTelemetry(error);
      logFeatureSad("skill_load_dir", `skill_load_mnt_retry_${(ke ?? "unknown").toLowerCase()}`);
      if (!isFsInaccessible(error))
        logForDebugging(`Skills directory ${e}: retry readdir failed: ${error}`, {
          level: "error",
        });
    }
  }
  if (h !== undefined) {
    let filtered = S.filter((we) => h.skills.has(we.name));
    let results = await Promise.all(filtered.map((we) => isRealPathSelf(join(e, we.name, "SKILL.md"))));
    S = filtered.filter((we, Ee) => results[Ee]);
  }
  let w = null;
  let L = r === "syncedSkills" && h === undefined && S.length > 0 ? readSyncedSkillIds(e) : undefined;
  let G = isSkillAttributionEnabled();
  let q = new Set();
  {
    let Se = `@${SKILLS_DIR}`;
    if (
      (n === "userSettings" && e === getThinkbackSkillDir()) ||
      (n === "projectSettings" && e === join(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills"))
    ) {
      let enabledPlugins = getInitialSettings_2().enabledPlugins;
      for (let key in enabledPlugins)
        if (enabledPlugins[key] === false && key.endsWith(Se)) q.add(key.slice(0, -Se.length));
    }
  }
  let results = await Promise.all(
    S.map(async (Se) => {
      try {
        if (!Se.isDirectory() && !Se.isSymbolicLink()) return null;
        if (r === "skills" && isSyncedDirName(Se.name)) {
          logForDebugging(
            `[skills] skipping reserved dir name '${Se.name}' under ${e}: 'synced' is the sync-owned root`,
          );
          return null;
        }
        if (r === "syncedSkills" && Se.name.includes(":")) {
          logForDebugging(
            `[skills] skipping '${Se.name}' under ${e}: its name contains ':', which the sync never writes, so it is not a synced skill`,
          );
          return null;
        }
        let ke = join(e, Se.name);
        let we = join(ke, "SKILL.md");
        if (q.size > 0) {
          let skillPluginManifestName = await readSkillPluginManifestName(
            fsImplementation,
            ke,
            Se.name,
            q.has(Se.name),
          );
          if ("skip" in skillPluginManifestName) {
            w = "skill_load_read_failed";
            return null;
          }
          if (skillPluginManifestName.name !== null && q.has(skillPluginManifestName.name)) return null;
        }
        let Ee;
        let Ae;
        if (h !== undefined) {
          let regularFileText = await readRegularFileText(we, h.mountDevice, MAX_SCOPE_RESPONSE_BYTES);
          if ("reason" in regularFileText) {
            h.misses.set(regularFileText.reason, (h.misses.get(regularFileText.reason) ?? 0) + 1);
            return null;
          }
          Ee = regularFileText.text;
        } else
          try {
            Ee = await readSmallFileChecked(fsImplementation, we, MAX_SCOPE_RESPONSE_BYTES, (Me) => {
              Ae = Me;
            });
          } catch (error) {
            if (!isENOENT(error)) {
              logForDebugging(`[skills] failed to read ${we}: ${error}`, {
                level: "warn",
              });
              w = "skill_load_read_failed";
            }
            return null;
          }
        if (Ee === null) {
          let Me = Ae?.isFile() === true && Ae.size > MAX_SCOPE_RESPONSE_BYTES;
          logForDebugging(
            Me
              ? `[skills] skipping ${we}: ${Ae?.size} bytes exceeds ${MAX_SCOPE_RESPONSE_BYTES} byte limit`
              : `[skills] skipping ${we}: not a regular file, or refused for where it leads`,
            {
              level: "warn",
            },
          );
          w = Me ? "skill_load_too_large" : "skill_load_read_failed";
          return null;
        }
        let skillFileToCommand = parseSkillFileToCommand({
          content: Ee,
          skillFilePath: we,
          skillName: Se.name,
          source: n,
          baseDir: ke,
          loadedFrom: r,
          serverAttribution: (await L)?.get(stripInvisibleChars_3(Se.name)) ?? G(ke),
        });
        if (skillFileToCommand === undefined) return null;
        if (h !== undefined && skillFileToCommand.type === "prompt")
          skillFileToCommand.fromHostCatalog = true;
        return {
          skill: skillFileToCommand,
          filePath: we,
        };
      } catch (error) {
        logForDebugging(`[skills] failed to parse ${join(e, Se.name, "SKILL.md")}: ${error}`, {
          level: "error",
        });
        w = "skill_load_parse_failed";
        return null;
      }
    }),
  );
  if (w) logFeatureBad("skill_load_dir", w);
  else logFeatureOk("skill_load_dir");
  return filterReservedSkillNames(
    results.filter((Se) => Se !== null).sort((Se, ke) => Se.skill.name.localeCompare(ke.skill.name)),
  );
}
//@ chunk-e6aww6q8.js:3136107-3136156 layout
/**
 * 文件名是否为 SKILL.md（不区分大小写）。
 */
function isSkillMarkdownFile(filePath) {
  return /^skill\.md$/i.test(basename(filePath));
}
//@ chunk-e6aww6q8.js:3136156-3136465 layout = transformSkillFiles (1)
/**
 * 同一目录里有 SKILL.md 时只保留它，否则保留全部 .md（旧版 commands 目录兼容）。
 */
function transformSkillFiles_2(files) {
  let filesByDir = new Map();
  for (let file of files) {
    let dir = dirname(file.filePath);
    let dirFiles = filesByDir.get(dir) ?? [];
    dirFiles.push(file);
    filesByDir.set(dir, dirFiles);
  }
  let result = [];
  for (let [dir, dirFiles] of filesByDir) {
    let skillFiles = dirFiles.filter((dirFile) => isSkillMarkdownFile(dirFile.filePath));
    if (skillFiles.length > 0) {
      let skillFile = skillFiles[0];
      if (skillFiles.length > 1)
        logForDebugging(`Multiple skill files found in ${dir}, using ${basename(skillFile.filePath)}`);
      result.push(skillFile);
    } else result.push(...dirFiles);
  }
  return result;
}
//@ chunk-e6aww6q8.js:3136465-3136612 file-local
function buildNamespace(targetDir, baseDir) {
  let normalizedBaseDir = baseDir.endsWith(sep) ? baseDir.slice(0, -1) : baseDir;
  if (!targetDir.startsWith(normalizedBaseDir + sep)) return "";
  let relativePath = targetDir.slice(normalizedBaseDir.length + 1);
  return relativePath ? relativePath.split(sep).join(":") : "";
}
//@ chunk-e6aww6q8.js:3136612-3136692 layout
function getSkillCommandName(filePath, baseDir) {
  let r = dirname(filePath);
  let targetDir = dirname(r);
  let h = basename(r);
  let namespace = buildNamespace(targetDir, baseDir);
  return namespace ? `${namespace}:${h}` : h;
}
//@ chunk-e6aww6q8.js:3136692-3136788 file-local
function getRegularCommandName(filePath, baseDir) {
  let fileName = basename(filePath);
  let fileDirectory = dirname(filePath);
  let commandBaseName = fileName.replace(/\.md$/, "");
  let namespace = buildNamespace(fileDirectory, baseDir);
  return namespace ? `${namespace}:${commandBaseName}` : commandBaseName;
}
//@ chunk-e6aww6q8.js:3136788-3136879 fingerprint = getCommandName (1)
function getCommandName(file) {
  return isSkillMarkdownFile(file.filePath)
    ? getSkillCommandName(file.filePath, file.baseDir)
    : getRegularCommandName(file.filePath, file.baseDir);
}
//@ chunk-e6aww6q8.js:3136879-3138092 fingerprint = loadSkillsFromCommandsDir (0.551)
/**
 * 加载旧式 .claude/commands/*.md（含 --add-dir 目录）为 skill 命令，loadedFrom=commands_DEPRECATED，名字按子目录用冒号命名空间。
 */
async function loadSkillsFromCommandsDir(cwd, n, r) {
  try {
    let [markdownFiles, h] = await Promise.all([
      loadMarkdownFilesCached("commands", cwd, r),
      Promise.all(
        n.map((G) => {
          let q = join(G, ".claude", "commands");
          return loadMarkdownFiles(q, r).then((markdownFiles) =>
            markdownFiles.map((markdownFile) => ({
              ...markdownFile,
              baseDir: q,
              source: "projectSettings",
            })),
          );
        }),
      ),
    ]);
    let files = [...markdownFiles, ...h.flat()];
    let processedFiles = transformSkillFiles_2(files);
    let skills = [];
    let L = false;
    for (let {
      baseDir,
      filePath,
      frontmatter,
      frontmatterAsWritten,
      asWrittenProblem,
      content,
      source,
    } of processedFiles)
      try {
        let skillDirectory = isSkillMarkdownFile(filePath) ? dirname(filePath) : undefined;
        let cmdName = getCommandName({
          baseDir,
          filePath,
          frontmatter,
          frontmatterAsWritten,
          content,
          source,
        });
        checkFrontmatterShadow("skill", frontmatter);
        let parsed = parseSkillFrontmatterFields(frontmatter, content, cmdName, "Custom command");
        skills.push({
          skill: createSkillCommand({
            ...parsed,
            skillName: cmdName,
            displayName: undefined,
            markdownContent: memoizeLastValue(getHostState().skillContentIntern, filePath, content),
            source,
            baseDir: skillDirectory,
            loadedFrom: "commands_DEPRECATED",
            paths: undefined,
            skillFile: buildFrontmatterResult(frontmatterAsWritten, filePath, asWrittenProblem),
          }),
          filePath,
        });
      } catch (error) {
        logForDebugging(`[skills] failed to load command from ${filePath}: ${error}`, {
          level: "error",
        });
        L = true;
      }
    if (L) logFeatureBad("skill_load_commands_dir", "skill_load_commands_parse_failed");
    else logFeatureOk("skill_load_commands_dir");
    return filterReservedSkillNames(
      skills
        .filter((skill) => skill.skill !== undefined)
        .sort((G, q) => G.skill.name.localeCompare(q.skill.name)),
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`[skills] commands-dir load failed: ${error.code}`, {
        level: "error",
      });
    else logError(error);
    logFeatureSad("skill_load_commands_dir", "skill_load_commands_dir_failed");
    return [];
  }
}
//@ chunk-e6aww6q8.js:3138092-3138647 layout
async function getUserSkillFileIds(e) {
  if (
    isRestrictedToPluginOnly("skills") ||
    !isSettingSourceEnabled("userSettings") ||
    isBareMode() ||
    isCustomizationDisabled("skills")
  )
    return null;
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null) return null;
  if (e !== undefined) return getUserSkillFileIdsV5(thinkbackSkillDir, e);
  let r;
  try {
    r = await getFsImplementation().readdir(thinkbackSkillDir);
  } catch {
    return null;
  }
  let s = `@${SKILLS_DIR}`;
  let enabledPlugins = getInitialSettings_2().enabledPlugins;
  let y = new Set();
  for (let key in enabledPlugins)
    if (enabledPlugins[key] === false && key.endsWith(s)) y.add(key.slice(0, -s.length));
  let results = await Promise.all(
    r.map(async (w) => {
      if (!w.isDirectory() && !w.isSymbolicLink()) return null;
      if (isSyncedDirName(w.name)) return null;
      if (y.has(w.name)) return null;
      return realpathOrNull(join(thinkbackSkillDir, w.name, "SKILL.md"));
    }),
  );
  return new Set(results.filter((w) => w !== null));
}
//@ chunk-e6aww6q8.js:3138647-3139169 layout
async function getUserSkillFileIdsV5(thinkbackSkillDir, n) {
  let r = await listUserSkillDirNamesV5(n);
  if (r.status !== "ok") return null;
  let names = r.names;
  let h = `@${SKILLS_DIR}`;
  let enabledPlugins = getInitialSettings_2().enabledPlugins;
  let S = new Set();
  for (let key in enabledPlugins)
    if (enabledPlugins[key] === false && key.endsWith(h)) S.add(key.slice(0, -h.length));
  let results = await Promise.all(
    names.map(async (name) => {
      if (S.has(name)) return null;
      if (S.size > 0) {
        let G = await n.read([
          STORAGE_SPACES.userConfigDir("skills", [name, ".claude-plugin", "plugin.json"]),
        ]);
        if (!G.ok) return null;
        let q = G.value.items[0];
        if (q.found && q.totalBytes > MAX_SCOPE_RESPONSE_BYTES) return null;
      }
      return realpathOrNull(join(thinkbackSkillDir, name, "SKILL.md"));
    }),
  );
  return new Set(results.filter((L) => L !== null));
}
//@ chunk-e6aww6q8.js:3139169-3139325 layout
/**
 * getSkillDirCommands 的缓存包装，缓存键包含动态 skill 状态、cwd、存储模式等。
 */
function getSkillDirCommandsCached(cwd, n) {
  let r = isManagedFolderWritable();
  return getOrCreate(
    getHostState().skillDirCommands,
    `${getDynamicSkillStateKey()}:${getSkillsSyncVetoed()}:${getAccountCacheKey()}:${isSkillsSyncEnvOn()}:${managedFolderCondition()}${keyOrNull(cwd)}:${n === undefined ? "raw" : "v5"}`,
    () => getSkillDirCommands(cwd, n, r),
  );
}
//@ chunk-e6aww6q8.js:3139325-3142633 fingerprint = getSkillDirCommands (0.795)
/**
 * 汇总所有目录来源的 skill：managed（CLAUDE_CODE_DISABLE_POLICY_SKILLS 可关）、用户 ~/.claude/skills、同步 skills、host catalog、项目各级 .claude/skills、--add-dir 的 .claude/skills、旧 commands 目录、插件 skill；按文件身份去重，有 paths 的放入条件 skill 表，返回无条件 skill。bare 模式只读 --add-dir。
 */
async function getSkillDirCommands(cwd, n, r) {
  getDynamicSkillState().refusedReservedNames.clear();
  let thinkbackSkillDir = getThinkbackSkillDir();
  let managedSkillsDir = join(getManagedFilePath(), ".claude", "skills");
  let projectSkillsDirs = await getProjectDirsUpToHome("skills", cwd);
  isInGlobalClaudeFolder(projectSkillsDirs, "skills", cwd);
  logForDebugging(
    `Loading skills from: managed=${managedSkillsDir}, user=${thinkbackSkillDir ?? "none"}, project=[${projectSkillsDirs.join(", ")}]`,
  );
  let additionalDirs = isDiskless() ? [] : getAdditionalDirectoriesForClaudeMd();
  let skillsLocked = isRestrictedToPluginOnly("skills");
  let L = isSettingSourceEnabled("projectSettings") && !skillsLocked;
  if (
    isCustomizationDisabled("skills", {
      explicitlyRequested: additionalDirs.length > 0 && L,
    })
  ) {
    logForDebugging("[reduced mode] Skipping skill dir discovery");
    return [];
  }
  if (isBareMode())
    return (
      await Promise.all(
        additionalDirs.map((dir) =>
          loadSkillsFromSkillsDir(join(dir, ".claude", "skills"), "projectSettings"),
        ),
      )
    )
      .flat()
      .map((At) => At.skill);
  let additionalDirs_2 = isHostSkillCatalogEnabled();
  let q = additionalDirs_2 ? hostSkillCatalogFolders() : null;
  if (!additionalDirs_2 && hostSkillCatalog() !== undefined) logFeatureSad("skill_host_catalog", "gated");
  let Z = r || isManagedFolderWritable();
  if (Z && !isDiskless())
    logForDebugging(
      `${managedSkillsDir}: not read: this session takes its managed settings from its organization, and its own account could have written the managed folder`,
    );
  let [managedSkills, userSkills, projectSkillsNested, Ee, Ae, Ie, Me] = await Promise.all([
    env.CLAUDE_CODE_DISABLE_POLICY_SKILLS || isDiskless() || Z
      ? Promise.resolve([])
      : loadSkillsFromSkillsDir(managedSkillsDir, "policySettings"),
    thinkbackSkillDir !== null && isSettingSourceEnabled("userSettings") && !skillsLocked
      ? loadSkillsFromSkillsDir(thinkbackSkillDir, "userSettings", "skills", n)
      : Promise.resolve([]),
    thinkbackSkillDir !== null &&
    isSettingSourceEnabled("userSettings") &&
    !skillsLocked &&
    !getSkillsSyncVetoed() &&
    isSkillsSyncEnvOn()
      ? getSyncBucket().then(async (dir) =>
          dir === null || !(await hasSyncMarker(join(thinkbackSkillDir, SYNCED_DIR), dir))
            ? []
            : loadSkillsFromSkillsDir(
                join(thinkbackSkillDir, SYNCED_DIR, dir),
                "userSettings",
                "syncedSkills",
              ),
        )
      : Promise.resolve([]),
    q === null ? Promise.resolve([]) : loadHostCatalogSkills(q),
    L
      ? Promise.all(projectSkillsDirs.map((dir) => loadSkillsFromSkillsDir(dir, "projectSettings")))
      : Promise.resolve([]),
    L
      ? Promise.all(
          additionalDirs.map((dir) =>
            loadSkillsFromSkillsDir(join(dir, ".claude", "skills"), "projectSettings"),
          ),
        )
      : Promise.resolve([]),
    skillsLocked ? Promise.resolve([]) : loadSkillsFromCommandsDir(cwd, L ? additionalDirs : [], n),
  ]);
  let allSkillsWithPaths = [
    ...filterUntrustedSkills(managedSkills),
    ...userSkills,
    ...projectSkillsNested,
    ...Ae.flat(),
    ...Ie.flat(),
    ...Me,
    ...(skillsLocked ? [] : peekSessionCommands()).map((dir) => ({
      skill: dir,
      filePath: "",
    })),
  ];
  let fileIds = await Promise.all(
    allSkillsWithPaths.map(({ skill, filePath }) =>
      skill.type === "prompt" && filePath !== "" ? realpathOrNull(filePath) : Promise.resolve(null),
    ),
  );
  let seenFileIds = new Map();
  let deduplicatedSkills = [];
  for (let i = 0; i < allSkillsWithPaths.length; i++) {
    let entry = allSkillsWithPaths[i];
    if (entry === undefined || entry.skill.type !== "prompt") continue;
    let { skill } = entry;
    if (entry.filePath !== "") getHostState().skillFiles.set(skill, entry.filePath);
    let fileId = fileIds[i];
    if (fileId === null || fileId === undefined) {
      deduplicatedSkills.push(skill);
      continue;
    }
    let existingSource = seenFileIds.get(fileId);
    if (existingSource !== undefined) {
      logForDebugging(
        `Skipping duplicate skill '${skill.name}' from ${skill.source} (same file already loaded from ${existingSource})`,
      );
      continue;
    }
    seenFileIds.set(fileId, skill.source);
    deduplicatedSkills.push(skill);
  }
  groupPluginSourcesByName(
    "skill",
    deduplicatedSkills.map((deduplicatedSkill) => ({
      name: deduplicatedSkill.name,
      source: deduplicatedSkill.source,
    })),
    {
      resolves: false,
    },
  );
  let duplicatesRemoved = allSkillsWithPaths.length - deduplicatedSkills.length;
  if (duplicatesRemoved > 0) logForDebugging(`Deduplicated ${duplicatesRemoved} skills (same file)`);
  if (q !== null) {
    let gt = new Set(projectSkillsNested.map(({ skill }) => foldName_2(skill.name)));
    for (let { skill, fileId } of Ee)
      if (gt.has(foldName_2(skill.name))) {
        logForDebugging(
          `Skipping host catalog skill '${skill.name}': the account syncs a skill of that name`,
        );
        let dynamicSkillState = getDynamicSkillState();
        if (dynamicSkillState.dynamicSkills.delete(getDynamicSkillKey(skill)))
          dynamicSkillState.activatedConditionalSkillNames.delete(skill.name);
      } else if (seenFileIds.has(fileId))
        logForDebugging(
          `Skipping host catalog skill '${skill.name}': another skills folder links to the same file`,
        );
      else deduplicatedSkills.push(skill);
  }
  let unconditionalSkills = [];
  let newConditionalSkills = [];
  let dynamicSkillState = getDynamicSkillState();
  for (let skill of deduplicatedSkills) {
    let At = skill.type === "prompt" && !!skill.paths && skill.paths.length > 0;
    if (At) {
      let dynamicSkillKey = getDynamicSkillKey(skill);
      if (dynamicSkillState.dynamicSkills.has(dynamicSkillKey))
        dynamicSkillState.dynamicSkills.set(dynamicSkillKey, skill);
    }
    if (At && !dynamicSkillState.activatedConditionalSkillNames.has(skill.name))
      newConditionalSkills.push(skill);
    else unconditionalSkills.push(skill);
  }
  for (let skill of newConditionalSkills) dynamicSkillState.conditionalSkills.set(skill.name, skill);
  if (newConditionalSkills.length > 0)
    logForDebugging(
      `[skills] ${newConditionalSkills.length} conditional skills stored (activated when matching files are touched)`,
    );
  logForDebugging(
    `Loaded ${deduplicatedSkills.length} unique skills (${unconditionalSkills.length} unconditional, ${newConditionalSkills.length} conditional, managed: ${managedSkills.length}, user: ${userSkills.length}, project: ${Ae.flat().length}, additional: ${Ie.flat().length}, legacy commands: ${Me.length})`,
  );
  return unconditionalSkills;
}
//@ chunk-e6aww6q8.js:3142633-3142706 layout
/**
 * 清空 skill 目录缓存和 markdown 文件缓存（热重载时调用）。
 */
function clearSkillCaches() {
  let hostState = getHostState();
  hostState.invalidateSkillDirs();
  hostState.markdownFiles.clear();
}
//@ chunk-e6aww6q8.js:3142706-3142896 layout
/**
 * 新建动态 skill 状态：dynamicSkillDirs、deferredSkillDirs、dynamicSkills、conditionalSkills、activatedConditionalSkillNames、refusedReservedNames。
 */
function createDynamicSkillState() {
  return {
    dynamicSkillDirs: new Set(),
    deferredSkillDirs: new Map(),
    dynamicSkills: new Map(),
    conditionalSkills: new Map(),
    activatedConditionalSkillNames: new Set(),
    refusedReservedNames: new Map(),
  };
}
//@ chunk-e6aww6q8.js:3142896-3143206 layout
/**
 * 从动态/条件 skill 表中删除不在给定集合中的过期条目，返回删除数。
 */
function pruneDynamicSkillsNotIn(e) {
  let n = peekDynamicSkillState();
  if (!n) return 0;
  let r = 0;
  for (let [s, h] of n.dynamicSkills)
    if (isStaleDynamicSkill(h, e)) {
      n.dynamicSkills.delete(s);
      n.activatedConditionalSkillNames.delete(h.name);
      r++;
    }
  for (let [s, h] of n.conditionalSkills)
    if (isStaleDynamicSkill(h, e)) {
      n.conditionalSkills.delete(s);
      n.activatedConditionalSkillNames.delete(h.name);
      r++;
    }
  return r;
}
//@ chunk-e6aww6q8.js:3143206-3143276 layout
/**
 * 是否启用宿主 skill 目录（host catalog）：未处于精简模式、userSettings 来源启用且非仅插件策略。
 */
function isHostSkillCatalogEnabled() {
  return (
    !isCustomizationDisabled("skills") &&
    isSettingSourceEnabled("userSettings") &&
    !isRestrictedToPluginOnly("skills")
  );
}
//@ chunk-e6aww6q8.js:3143276-3144280 layout
/**
 * 读取宿主提供的 skill 目录（host catalog，挂载点上的同步 skills），逐个校验非链接后加载，记 skill_host_catalog 遥测。
 */
async function loadHostCatalogSkills(e) {
  let n = new Map();
  let r = await probeOneMountKind(PUBLIC);
  if ("reason" in r) {
    logForDiagnosticsNoPII("warn", "skill_host_catalog_not_read", r);
    n.set(r.reason, e.skills.size);
  }
  let s = "reason" in r ? null : await realpathOrNull(e.dir);
  let h =
    "reason" in r || s === null
      ? []
      : await loadSkillsFromSkillsDir(s, "userSettings", "syncedSkills", undefined, {
          skills: e.skills,
          mountDevice: r.device,
          misses: n,
        });
  let results = await Promise.all(h.map(({ filePath }) => isRealPathSelf(filePath)));
  let flattened = h.flatMap(({ skill, filePath }, q) =>
    results[q]
      ? [
          {
            skill,
            fileId: filePath,
          },
        ]
      : [],
  );
  if (flattened.length < e.skills.size) {
    let L = new Set(flattened.map(({ fileId }) => basename(dirname(fileId))));
    logForDebugging(
      `Host catalog: skills not loaded (missing, unreadable, not on the mount, or reached through a link): ${[...e.skills].filter((skill) => !L.has(skill)).join(", ")}`,
      {
        level: "warn",
      },
    );
  }
  let w = {
    named: e.skills.size,
    loaded: flattened.length,
    withheld: count(flattened, ({ skill }) => isKilledHostCatalogSkill(skill)),
    ...flattenMountMissCounts(n),
  };
  if (w.withheld > 0 && w.withheld === w.loaded) logFeatureSad("skill_host_catalog", "all_withheld", w);
  else if (w.loaded === w.named) logFeatureOk("skill_host_catalog", w);
  else if (w.loaded > 0) logFeatureSad("skill_host_catalog", "some_missing", w);
  else logFeatureBad("skill_host_catalog", "none_loaded", w);
  return flattened;
}
//@ chunk-e6aww6q8.js:3144280-3144514 layout
/**
 * 由 host catalog 的一个 SKILL.md 文本构造命令对象（fromHostCatalog=true）。
 */
function createHostCatalogSkill({ text, filePath }) {
  let r = dirname(filePath);
  let skillFileToCommand = parseSkillFileToCommand({
    content: text,
    skillFilePath: filePath,
    skillName: basename(r),
    source: "userSettings",
    baseDir: r,
    loadedFrom: "syncedSkills",
    serverAttribution: isSkillAttributionEnabled()(r),
  });
  if (skillFileToCommand?.type === "prompt") skillFileToCommand.fromHostCatalog = true;
  return skillFileToCommand;
}
//@ chunk-e6aww6q8.js:3144514-3144565 layout
function isStaleDynamicSkill(e, n) {
  return isSyncedSkill(e) && !n.has(stripSyncedSkillPrefix(e.name));
}
//@ chunk-e6aww6q8.js:3144565-3144615 layout
function getDynamicSkillStateKey() {
  return getHostState().dynamicSkillStateKey();
}
//@ chunk-e6aww6q8.js:3144615-3144643 layout
function getDynamicSkillStateKeyExport() {
  return getDynamicSkillStateKey();
}
//@ chunk-e6aww6q8.js:3144643-3144740 layout
function getDynamicSkillState() {
  let dynamicSkillStates = getHostState().dynamicSkillStates;
  let dynamicSkillStateKey = getDynamicSkillStateKey();
  let r = dynamicSkillStates.get(dynamicSkillStateKey);
  if (!r) {
    r = createDynamicSkillState();
    dynamicSkillStates.set(dynamicSkillStateKey, r);
  }
  return r;
}
//@ chunk-e6aww6q8.js:3144740-3144803 layout
function peekDynamicSkillState() {
  return getHostState().dynamicSkillStates.get(getDynamicSkillStateKey()) ?? null;
}
//@ chunk-e6aww6q8.js:3144803-3144856 layout
/**
 * 设置当前动态 skill 状态。
 */
function setDynamicSkillState(dynamicSkillState) {
  getHostState().dynamicSkillStates.set(getDynamicSkillStateKey(), dynamicSkillState);
}
//@ chunk-e6aww6q8.js:3144856-3144944 layout
/**
 * 订阅「动态 skill 已加载」事件，回调异常只记录不抛出；返回取消订阅函数。
 */
function onDynamicSkillsLoaded(callback) {
  return getHostState().dynamicSkillsLoaded.subscribe(() => {
    try {
      callback();
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-e6aww6q8.js:3144944-3145008 layout
function foldSkillPath(e) {
  return stripInvisibleChars_3(
    e
      .split(sep)
      .map((n) => trimTrailingDotsSpaces(n))
      .join(sep),
  );
}
//@ chunk-e6aww6q8.js:3145008-3145035 layout
var skillPrefixCacheByHost = new HostScoped(() => io(computeSkillPathPrefixes));
//@ chunk-e6aww6q8.js:3145035-3145524 layout
async function computeSkillPathPrefixes(e) {
  let n = async (y) => {
    try {
      let S = await realpath(y);
      return S === y ? [y] : [y, S];
    } catch {
      return [y];
    }
  };
  let r = await n(e);
  let s = new Set();
  let h = new Set();
  for (let y of r) {
    for (let S of await n(join(y, "skills"))) s.add(S);
    for (let S of await n(join(y, "plugins"))) h.add(S);
  }
  return {
    skillsBasePrefixesFolded: [...s].map((y) => foldSkillPath(y) + sep),
    syncOwnedPrefixes: [
      ...[...s].flatMap((y) => [
        join(y, SYNCED_DIR) + sep,
        join(y, SYNCED_SUBDIR) + sep,
        join(y, ".staging") + sep,
      ]),
      ...[...h].map((y) => join(y, SYNCED_DIR) + sep),
    ].map(foldSkillPath),
    syncedSkillsPrefixes: [...s].map((y) => foldSkillPath(join(y, SYNCED_DIR) + sep)),
  };
}
//@ chunk-e6aww6q8.js:3145524-3145697 layout
async function isInSyncedSkillsDir(host, n) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  if (claudeConfigDirOrNull === null) return false;
  let { syncedSkillsPrefixes } = await skillPrefixCacheByHost.of(host)(claudeConfigDirOrNull);
  return n.some((h) => {
    let y = foldSkillPath(h);
    return syncedSkillsPrefixes.some((syncedSkillsPrefix) => y.startsWith(syncedSkillsPrefix));
  });
}
//@ chunk-e6aww6q8.js:3145697-3145756 layout
async function isGitignoredInWorkTree(filePath, n, cwd) {
  return findGitRootUncached(filePath) === n ? isPathGitignored(filePath, cwd) : undefined;
}
//@ chunk-e6aww6q8.js:3145756-3147407 layout
/**
 * 文件被读写时，从其目录向上（不超过 cwd 根）寻找新的 .claude/skills 目录：跳过同步目录、8.3 短名、gitignore 的目录与目标不确定的链接；返回新发现的目录列表。
 */
async function discoverSkillDirsForPaths(e, n, r, s, h) {
  if (isCustomizationDisabled("skills")) return [];
  if (getProjectConfigRoot() !== null) return [];
  if (isDiskless()) return [];
  let fsImplementation = getFsImplementation();
  let S = r.endsWith(sep) ? r.slice(0, -1) : r;
  let w = [];
  let cwd = getCwd();
  let { syncOwnedPrefixes, skillsBasePrefixesFolded } =
    await skillPrefixCacheByHost.of(e)(getClaudeConfigDir());
  let Z =
    getPlatform() === "windows"
      ? [...skillsBasePrefixesFolded, foldSkillPath(S) + sep]
      : skillsBasePrefixesFolded;
  for (let Se of n) {
    let ke = dirname(Se);
    let we = foldSkillPath(ke) + sep;
    if (syncOwnedPrefixes.some((syncOwnedPrefix) => we.startsWith(syncOwnedPrefix))) continue;
    if (
      Z.some(
        (Ee) =>
          we.startsWith(Ee) &&
          we
            .slice(Ee.length)
            .split(sep)
            .some((Ae) => /~\d/.test(Ae)),
      )
    )
      continue;
    while (ke.startsWith(S + sep)) {
      let Ee = join(ke, ".claude", "skills");
      let Ae = getDynamicSkillState().deferredSkillDirs.get(Ee);
      if (Ae !== undefined && Ae !== cwd) {
        getDynamicSkillState().deferredSkillDirs.delete(Ee);
        getDynamicSkillState().dynamicSkillDirs.delete(Ee);
      }
      if (!getDynamicSkillState().dynamicSkillDirs.has(Ee)) {
        getDynamicSkillState().dynamicSkillDirs.add(Ee);
        try {
          if (isStorageV5Enabled() && s !== undefined) {
            let stats = await s.hostFiles.stat(PathSpace.workspace(Ee));
            if (!stats.ok || stats.value.kind === "absent") continue;
          } else await fsImplementation.stat(Ee);
          let Me = h === undefined || ke.startsWith(h.cwd + sep);
          if (!Me) {
            let ze = await isGitignoredInWorkTree(ke, h.workTree, S);
            if (ze !== 1) {
              if (ze !== 0) getDynamicSkillState().deferredSkillDirs.set(Ee, cwd);
              logForDebugging(`[skills] Skipped gitignored or unconfirmed skills dir: ${Ee}`);
              continue;
            }
          } else if (await isPathGitignoredBool(ke, h?.cwd ?? S)) {
            logForDebugging(`[skills] Skipped gitignored skills dir: ${Ee}`);
            continue;
          }
          let We;
          try {
            We = await realpath(Ee);
          } catch {}
          if (
            syncOwnedPrefixes.some((syncOwnedPrefix) =>
              (foldSkillPath(We ?? Ee) + sep).startsWith(syncOwnedPrefix),
            )
          ) {
            logForDebugging(`[skills] Skipped sync-owned skills dir (resolved): ${Ee}`);
            continue;
          }
          if (!Me) {
            let ze = await realpath(h.workTree).catch(() => {
              return;
            });
            let lt =
              We === undefined || ze === undefined
                ? undefined
                : We === Ee
                  ? 1
                  : await isGitignoredInWorkTree(
                      basename(dirname(We)) === ".claude" ? dirname(dirname(We)) : We,
                      ze,
                      S,
                    );
            if (lt !== 1) {
              if (lt !== 0) getDynamicSkillState().deferredSkillDirs.set(Ee, cwd);
              logForDebugging(`[skills] Skipped skills dir with an unconfirmed target: ${Ee}`);
              continue;
            }
          }
          w.push(Ee);
        } catch {}
      }
      let Ie = dirname(ke);
      if (Ie === ke) break;
      ke = Ie;
    }
  }
  return w;
}
//@ chunk-e6aww6q8.js:3147407-3147484 layout
function getDynamicSkillKey(skill) {
  return `${skill.type === "prompt" ? (skill.skillRoot ?? "") : ""}\x00${skill.name}`;
}
//@ chunk-e6aww6q8.js:3147484-3148529 fingerprint = addSkillDirectories (0.94)
/**
 * 把新发现的 skill 目录加载进动态 skill 表（replace 时先删该目录下消失的 skill），记 tengu_dynamic_skills_changed 并发出已加载事件；projectSettings 关闭或仅插件策略时跳过。
 */
async function addSkillDirectories(dirs, n = {}) {
  if (
    isCustomizationDisabled("skills") ||
    !isSettingSourceEnabled("projectSettings") ||
    isRestrictedToPluginOnly("skills")
  ) {
    logForDebugging(
      "[skills] Dynamic skill discovery skipped: projectSettings disabled or plugin-only policy",
    );
    return;
  }
  if (dirs.length === 0) return;
  let results = await Promise.all(dirs.map((dir) => loadSkillsFromSkillsDir(dir, "projectSettings")));
  let previousSkillNamesForLogging = new Set(getDynamicSkillState().dynamicSkills.keys());
  let dynamicSkillState = getDynamicSkillState();
  if (n.replace) {
    let S = new Set(results.flat().map(({ skill }) => getDynamicSkillKey(skill)));
    let w = (L) => {
      let G = L.type === "prompt" ? (L.skillRoot ?? "") : "";
      return dirs.some((dir) => {
        let Z = relative(dir, G);
        return Z === "" || (!Z.startsWith("..") && !isAbsolute(Z));
      });
    };
    for (let [L, G] of dynamicSkillState.dynamicSkills)
      if (w(G) && !S.has(L)) dynamicSkillState.dynamicSkills.delete(L);
  }
  for (let S of results)
    for (let { skill } of S)
      if (skill.type === "prompt") dynamicSkillState.dynamicSkills.set(getDynamicSkillKey(skill), skill);
  let newSkillCount = results.flat().length;
  if (newSkillCount > 0) {
    let addedSkills = [...getDynamicSkillState().dynamicSkills.keys()].filter(
      (n) => !previousSkillNamesForLogging.has(n),
    );
    logForDebugging(
      `[skills] Dynamically discovered ${newSkillCount} skills from ${dirs.length} directories`,
    );
    if (addedSkills.length > 0)
      logEvent("tengu_dynamic_skills_changed", {
        source: lit_2("file_operation"),
        previousCount: previousSkillNamesForLogging.size,
        newCount: getDynamicSkillState().dynamicSkills.size,
        addedCount: addedSkills.length,
        directoryCount: dirs.length,
      });
  }
  getHostState().dynamicSkillsLoaded.emit();
}
//@ chunk-e6aww6q8.js:3148529-3148828 layout
/**
 * 返回当前动态 skill 列表（按名排序，过滤掉 managed 目录已删除的）。
 */
function getDynamicSkills() {
  return Array.from(peekDynamicSkillState()?.dynamicSkills.entries() ?? [])
    .filter(
      ([, e]) =>
        e.type !== "prompt" ||
        e.source !== "policySettings" ||
        (e.skillRoot === undefined
          ? managedFolderCondition() === ""
          : !isUntrustedManagedSkill(join(e.skillRoot, "SKILL.md"))),
    )
    .sort(([e, n], [r, s]) => (n.name === s.name ? e.localeCompare(r) : n.name.localeCompare(s.name)))
    .map(([, e]) => e);
}
//@ chunk-e6aww6q8.js:3148828-3149592 fingerprint = activateConditionalSkillsForPaths (0.838)
/**
 * 用 gitignore 语法匹配条件 skill 的 paths；被触及的文件（相对 cwd）命中时把该 skill 激活进动态表，记遥测并发出已加载事件，返回激活的名字。
 */
function activateConditionalSkillsForPaths(filePaths, cwd) {
  if ((peekDynamicSkillState()?.conditionalSkills.size ?? 0) === 0) return [];
  let activated = [];
  for (let [name, skill] of getDynamicSkillState().conditionalSkills) {
    if (skill.type !== "prompt" || !skill.paths || skill.paths.length === 0) continue;
    let skillIgnore = skillIgnoreDefault
      .default()
      .add(filterUsableIgnorePatterns(skill.paths, "skill_paths"));
    for (let filePath of filePaths) {
      let relativePath = isAbsolute(filePath) ? relative(cwd, filePath) : filePath;
      if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) continue;
      if (skillIgnore.ignores(relativePath)) {
        getDynamicSkillState().dynamicSkills.set(getDynamicSkillKey(skill), skill);
        getDynamicSkillState().conditionalSkills.delete(name);
        getDynamicSkillState().activatedConditionalSkillNames.add(name);
        activated.push(name);
        logForDebugging(`[skills] Activated conditional skill '${name}' (matched path: ${relativePath})`);
        break;
      }
    }
  }
  if (activated.length > 0) {
    logEvent("tengu_dynamic_skills_changed", {
      source: lit_2("conditional_paths"),
      previousCount: getDynamicSkillState().dynamicSkills.size - activated.length,
      newCount: getDynamicSkillState().dynamicSkills.size,
      addedCount: activated.length,
      directoryCount: 0,
    });
    getHostState().dynamicSkillsLoaded.emit();
  }
  return activated;
}
//@ chunk-e6aww6q8.js:3149592-3149884 layout
/**
 * 为访问的文件路径发现嵌套技能目录（处理 worktree 情况），登记新目录后激活与该路径匹配的条件技能。
 */
async function discoverSkillsForPath(host, n, dynamicSkillDirTriggers, storageV5) {
  let cwd = getCwd();
  let y = hasOutermostCallFrame() ? cwd : getOriginalCwd();
  let S = cwd !== y && isPathWithinCaseAware(cwd, y, false) ? findGitRoot(cwd) : null;
  let w =
    S !== null && findGitRoot(y) === S
      ? {
          cwd,
          workTree: S,
        }
      : undefined;
  let cwd_2 = w === undefined ? cwd : y;
  let skillDirsForPaths = await discoverSkillDirsForPaths(host, [n], cwd_2, storageV5, w);
  if (skillDirsForPaths.length > 0) {
    if (dynamicSkillDirTriggers) {
      for (let skillDirsForPath of skillDirsForPaths)
        if (!dynamicSkillDirTriggers.includes(skillDirsForPath))
          dynamicSkillDirTriggers.push(skillDirsForPath);
    }
    addSkillDirectories(skillDirsForPaths)
      .then(() => {
        activateConditionalSkillsForPaths([n], cwd_2);
      })
      .catch(() => {});
  }
  activateConditionalSkillsForPaths([n], cwd_2);
}
//@ chunk-e6aww6q8.js:3149884-3149981 layout = getThinkbackSkillDir (1)
/**
 * 把当前工作目录向上至家目录之间各级的 `.claude/skills` 设为技能目录（replace），工作目录就是家目录时不做；用于清缓存或目录变化后重建技能目录列表。旧版名 getThinkbackSkillDir 配错。
 */
async function resetProjectSkillDirectories() {
  let originalCwd = getOriginalCwd();
  if (originalCwd === getProjectRoot()) return;
  await addSkillDirectories(await getProjectDirsUpToHome("skills", originalCwd), {
    replace: true,
  });
}
//@ chunk-e6aww6q8.js:3149981-3150053 layout
/**
 * 列出动态技能状态里尚未激活的条件技能（frontmatter 带 paths 的 skill）。
 */
function conditionalSkillEntries() {
  return Array.from(peekDynamicSkillState()?.conditionalSkills.values() ?? []);
}
//@ chunk-e6aww6q8.js:3150053-3150272 layout
/**
 * 清空所有动态 skill 状态。
 */
function clearDynamicSkills() {
  let e = peekDynamicSkillState();
  if (!e) return;
  e.dynamicSkillDirs.clear();
  e.deferredSkillDirs.clear();
  e.dynamicSkills.clear();
  e.conditionalSkills.clear();
  e.activatedConditionalSkillNames.clear();
  e.refusedReservedNames.clear();
}
//@ chunk-e6aww6q8.js:3150272-3150334 fingerprint
registerLoaderSide({
  createSkillCommand,
  parseSkillFrontmatterFields,
});
export {
  estimateSkillListingTokens,
  getSkillDirCommandsCached,
  addSkillDirectories,
  discoverSkillDirsForPaths,
  getDynamicSkills,
  formatExtraArgHints,
  MAX_NAME_WARNINGS,
  INVALID_NAME_MESSAGE,
  clearSkillCaches,
  onDynamicSkillsLoaded,
  getSkillsPath,
  resetProjectSkillDirectories,
  conditionalSkillEntries,
  clearDynamicSkills,
  discoverSkillsForPath,
  setDynamicSkillState,
  createDynamicSkillState,
  identityPath_2,
  parseSkillFileToCommand,
  isHostSkillCatalogEnabled,
  createHostCatalogSkill,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
  getDynamicSkillStateKeyExport,
  refuseReservedSkillName,
  isSkillFilePathOrIdentifier,
  NON_ASCII_SPACE_RE,
  isInSyncedSkillsDir,
  transformSkillFiles,
  normalizeArgumentNames,
  isSkillPathEligible,
  getUserSkillFileIds,
  readSyncedSkillIds,
  readDirNameSet,
  createSkillCommand,
  pruneDynamicSkillsNotIn,
  getSkillListingText,
};
