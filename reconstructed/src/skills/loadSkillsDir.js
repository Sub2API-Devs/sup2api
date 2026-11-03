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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import { Re } from "../../runtime/bun-runtime.js";
import { Vpe } from "../../vendor/ignore/index.js";
import { DoctorLazy, DoctorWithPlugins } from "../cli/handlers/util.js";
import { kt, o, QD, E, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { readManifestText, parseManifestJson, parseValidRows, _8 } from "../utils/claudeAiSync/skillsSync.js";
import {
  SYNCED_MANIFEST_FILE,
  stripInvisibleChars as stripInvisibleChars_3,
  syncedItemPath,
  f3,
  getAccountCacheKey,
  getSyncBucket,
  SYNCED_DIR,
  foldName as foldName_2,
  trimTrailingDotsSpaces,
  g5t,
} from "../utils/plugins/syncedItems.js";
import { COLLISION_LOSER, readRegularFileText, K5o, PUBLIC, hrr } from "./hostSkillMounts.js";
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
import { sbs, isNonEmptyIdentifier, escapeAngleBrackets } from "../utils/sanitization.js";
import { isSkillFile_2, twe, Iv } from "../utils/plugins/loadPluginCommands.js";
import { logForDebugging } from "../utils/debug.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { isSkillShownToModel, displaySkillFields } from "./skillSources.js";
import { getManagedFilePath } from "../utils/settings/managedPath.js";
import { getClaudeConfigDir, isBareMode, getClaudeConfigDirOrNull } from "../utils/envUtils.js";
import { roughTokenCountEstimation } from "../services/tokenEstimation.js";
import { quotedPrintable, printableOrEmpty } from "../utils/printableName.js";
import { reservedNameReason, vZ } from "./reservedSkillNames.js";
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
import { isPlainObject as isPlainObject_4 } from "../utils/isPlainObject.js";
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
  xM,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  executeShellCommandsInPrompt,
  withCommandAllowRules,
} from "../utils/promptShellExecution.js";
import { mcpSkillResourceHint } from "./mcpSkillPrompt.js";
import { clearUserFacingName } from "../commands.js";
import { readSmallFileChecked } from "../utils/readSmallFile.js";
import { By } from "../services/plugins/accountSync/pluginsScopeGate.js";
import { Wo } from "../utils/json.js";
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
  W1,
  filterUntrustedSkills,
  isUntrustedManagedSkill,
} from "../plugins/functionHooks/sites/promptContextSites.js";
import { hostSkillCatalogFolders } from "./hostSkillCatalog.js";
import { hostSkillCatalog } from "../utils/sessionShape.js";
import { env } from "../utils/env.js";
import { E2e } from "../utils/claudeAiSync/syncOwnedRoot.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { count } from "../utils/collections.js";
import { isKilledHostCatalogSkill, isSyncedSkill } from "../utils/commandPredicates.js";
import { HostScoped } from "../utils/hostScoped.js";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { findGitRootUncached, findGitRoot } from "../utils/git.js";
import { isPathGitignored, isPathGitignoredBool } from "../utils/git/gitignore.js";
import { getCwd, M$ } from "../utils/cwd.js";
import { getPlatform } from "../utils/platform.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { PathSpace } from "../utils/resultError.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { xst } from "../utils/ignorePatterns.js";
import { isPathWithinCaseAware } from "../utils/pathPrefix.js";
import { $7s } from "../services/memorySync/syncFiles.js";

//@ chunk-e6aww6q8.js:981425-981439 placement
var _P = (e) => e;
//@ chunk-e6aww6q8.js:981439-981459 placement
var tvn = Re(Vpe(), 1);
/**
 * 同步技能清单的 schema：单个技能条目（id、名称、来源、版本、插件等）与清单整体。
 */
//@ chunk-e6aww6q8.js:981688-982101 placement
var syncedSkillEntrySchema = DoctorLazy(() =>
    kt({
      skillId: o(),
      name: o(),
      description: o().catch(""),
      source: o().catch(""),
      updatedAt: o().nullable().catch(null),
      requestedVersion: o()
        .optional()
        .catch(void 0),
      backingPluginId: o()
        .optional()
        .catch(void 0),
      userInvocable: QD().catch(void 0),
      disableModelInvocation: QD().catch(void 0),
    }),
  ),
  syncedSkillsManifestSchema = DoctorLazy(() =>
    kt({
      lastUpdated: E().catch(0),
      skills: oe().optional(),
      staleDirs: oe().optional(),
      pendingClaims: oe().optional(),
    }),
  );
//@ chunk-e6aww6q8.js:982101-982117 placement
var wGe = new Map();
/**
 * 读取同步技能清单，按目录名映射到技能 id（跳过冲突落败项与重名项），失败时返回空表。
 */
//@ chunk-e6aww6q8.js:982117-982515 placement
async function readSyncedSkillIds(e) {
  try {
    let n = await readManifestText(join_47(e, SYNCED_MANIFEST_FILE), null);
    if (n === null) return wGe;
    let r = parseManifestJson(n, syncedSkillsManifestSchema(), null);
    if (r === null) return wGe;
    let s = new Map(),
      h = new Set();
    for (let y of parseValidRows(syncedSkillEntrySchema(), r.skills)) {
      let S;
      try {
        S = stripInvisibleChars_3(basename_18(syncedItemPath(y.name, e)));
      } catch {
        continue;
      }
      if (y.updatedAt === COLLISION_LOSER) continue;
      if (h.has(S)) {
        s.delete(S);
        continue;
      }
      h.add(S);
      let w = buildSkillAttribution(y.skillId, y.backingPluginId);
      if (w !== void 0) s.set(S, w);
    }
    return s;
  } catch {
    return wGe;
  }
}
//@ chunk-e6aww6q8.js:982515-982681 placement
async function readDirNameSet(e) {
  try {
    return new Set(await readdir_17(e));
  } catch (error) {
    let r = error instanceof Error && "code" in error ? error.code : void 0;
    return r === "ENOENT" || r === "ENOTDIR" ? new Set() : void 0;
  }
}
//@ chunk-e6aww6q8.js:982681-982710 placement
var TENGU_SLATE_WICKET = "tengu_slate_wicket";
//@ chunk-e6aww6q8.js:982710-982753 placement
function p1t() {
  return isCcsTenant() || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SLATE_WICKET, !0) !== !1;
}
//@ chunk-e6aww6q8.js:982753-982797 placement
function j7(e) {
  return sbs(e) || (isNonEmptyIdentifier(e) && !p1t());
}
//@ chunk-e6aww6q8.js:982797-982831 placement
var ePo = /(?:^|:) | (?::|$)|^:|:$/;
//@ chunk-e6aww6q8.js:982831-982875 placement
function isSkillFile(filePath) {
  return sbs(filePath) && !ePo.test(filePath);
}
//@ chunk-e6aww6q8.js:982875-982919 placement
function $z(e) {
  return isSkillFile(e) || (isNonEmptyIdentifier(e) && !p1t());
}
/**
 * 名称非法时的说明文字、名称告警条数上限与非 ASCII 空白正则。
 */
//@ chunk-e6aww6q8.js:982919-983062 placement
var INVALID_NAME_MESSAGE =
    "a name may not hold hidden, direction-changing or blank-like characters, < or >, or be over 256 characters",
  MAX_NAME_WARNINGS = 100,
  NON_ASCII_SPACE_RE = /[^\P{Z} ]/gu;
//@ chunk-e6aww6q8.js:984088-984286 placement
function normalizeArgumentNames(e) {
  if (!e) return [];
  let n = (r) => typeof r === "string" && r.trim() !== "" && !/^\d+$/.test(r);
  if (Array.isArray(e)) return e.filter(n);
  if (typeof e === "string") return e.split(/\s+/).filter(n);
  return [];
}
/**
 * 把多余的参数名格式化为 "[a] [b]" 形式的提示，没有时返回 undefined。
 */
//@ chunk-e6aww6q8.js:984286-984389 placement
function formatExtraArgHints(e, n) {
  let sliced = e.slice(n.length);
  if (sliced.length === 0) return;
  return sliced.map((s) => `[${s}]`).join(" ");
}
//@ chunk-e6aww6q8.js:1668178-1668487 fingerprint = transformSkillFiles (1)
function transformSkillFiles(files) {
  let filesByDir = new Map();
  for (let file of files) {
    let dir = dirname_40(file.filePath),
      dirFiles = filesByDir.get(dir) ?? [];
    (dirFiles.push(file), filesByDir.set(dir, dirFiles));
  }
  let result = [];
  for (let [s, h] of filesByDir) {
    let skillFiles = h.filter((S) => isSkillFile_2(S.filePath));
    if (skillFiles.length > 0) {
      let skillFile = skillFiles[0];
      if (skillFiles.length > 1)
        logForDebugging(`Multiple skill files found in ${s}, using ${basename_36(skillFile.filePath)}`);
      result.push(skillFile);
    } else result.push(...h);
  }
  return result;
}
//@ chunk-e6aww6q8.js:3120512-3120537 placement
var ORr = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:3120537-3120587 placement
function KTn() {
  return ORr.peek(getRootSession())?.commands ?? [];
}
//@ chunk-e6aww6q8.js:3120587-3120719 placement
function isSkillDirSource(e, n) {
  if (n === "policySettings") return !1;
  return e === "skills" || e === "syncedSkills" || e === "commands_DEPRECATED" || e === "plugin";
}
//@ chunk-e6aww6q8.js:3120719-3120762 placement
function DRr(e) {
  return !isSkillShownToModel({ loadedFrom: e });
}
/**
 * 按设置来源给出 .claude/<dir> 的路径：policySettings → managed 目录，userSettings → ~/.claude/<dir>，projectSettings → 项目根/.claude/<dir>，plugin → 字面 plugin。
 */
//@ chunk-e6aww6q8.js:3120762-3120977 fingerprint = getSkillsPath (0.847)
function getSkillsPath(source, dir) {
  switch (source) {
    case "policySettings":
      return join_46(getManagedFilePath(), ".claude", dir);
    case "userSettings":
      return join_46(getClaudeConfigDir(), dir);
    case "projectSettings":
      return join_46(getProjectConfigRoot() ?? ".", ".claude", dir);
    case "plugin":
      return "plugin";
    default:
      return "";
  }
}
/**
 * 把 skill 的 name、description、whenToUse 拼成一段文本，用于估算其在技能清单里的 token。
 */
//@ chunk-e6aww6q8.js:3120977-3121060 layout
function getSkillListingText(e) {
  return [e.name, e.description, e.whenToUse].filter(Boolean).join(" ");
}
/**
 * 粗略估算一个 skill 在技能清单中占用的 token 数。
 */
//@ chunk-e6aww6q8.js:3121060-3121098 layout
function estimateSkillListingTokens(e, n) {
  return roughTokenCountEstimation(getSkillListingText(e), n);
}
//@ chunk-e6aww6q8.js:3121098-3121182 layout
async function realpathOrNull(e) {
  if (isDiskless()) return null;
  try {
    return await realpath_15(e);
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3121182-3121228 layout
async function isRealPathSelf(e) {
  return (await realpathOrNull(e)) === e;
}
//@ chunk-e6aww6q8.js:3121228-3121653 layout
function refuseReservedSkillName({ name: e, path: path, change: change }) {
  let s = {
      name: quotedPrintable(e),
      ...(path !== void 0 && { path: printableOrEmpty(path) }),
      change: change,
    },
    h = `${s.path ?? ""}\x00${s.name}\x00${change}`,
    refusedReservedNames = getDynamicSkillState().refusedReservedNames;
  if (refusedReservedNames.has(h)) return;
  refusedReservedNames.set(h, s);
  let S = change === "workflow-name" ? `workflow "${s.name}"` : `"${s.name}"`,
    w = s.path ? ` (${s.path})` : "",
    L = reservedNameReason(s.name);
  logForDebugging(
    `[skills] not loading ${S}${w}: that name ${L}; ${change === "frontmatter-name" ? "change its name: line" : "rename it"}`,
    { level: "warn" },
  );
}
//@ chunk-e6aww6q8.js:3121653-3121867 layout
function filterReservedSkillNames(e) {
  return e.filter(({ skill: skill, filePath: filePath }) => {
    if (!formatCommandDescription(skill)) return !0;
    let s = vZ(skill.name);
    return (
      refuseReservedSkillName({
        name: s ? skill.name : (skill.userFacingName?.() ?? skill.name),
        path: s ? getSkillNameRootPath(filePath, skill.name) : filePath,
        change: s ? "path" : "frontmatter-name",
      }),
      !1
    );
  });
}
//@ chunk-e6aww6q8.js:3121867-3122073 layout
function getSkillNameRootPath(e, n) {
  let r = basename_17(e).toLowerCase() === "skill.md",
    s = r ? dirname_26(e) : e,
    h = s,
    y = r ? basename_17(s) : basename_17(s).replace(/\.md$/i, "");
  while (y !== n) {
    let S = dirname_26(h);
    if (S === h || !n.endsWith(`:${y}`)) return s;
    ((h = S), (y = `${basename_17(h)}:${y}`));
  }
  return h;
}
/**
 * 解析 skill frontmatter 的 hooks：顶层误写的 PreToolUse/PermissionRequest 视为不可加载的守卫，返回 unloadableGuard=true（此时 skill 不带钩子也不带 allowed-tools）；否则按 HooksSchema 校验。
 */
//@ chunk-e6aww6q8.js:3122073-3122798 fingerprint = parseHooksFromFrontmatter (0.391)
function parseSkillHooksFromFrontmatter(frontmatter, skillName) {
  if (hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS))
    return (
      logForDebugging(
        `Skill '${skillName}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        { level: "error" },
      ),
      { hooks: void 0, unloadableGuard: !0 }
    );
  if (!frontmatter.hooks) return { hooks: void 0, unloadableGuard: !1 };
  let r = validateHooksSetting(frontmatter.hooks);
  for (let note of r.notes) logForDebugging(`Skill '${skillName}': ${note}`, { level: "warn" });
  if (r.unloadableGuards.length > 0)
    return (
      logForDebugging(
        `Skill '${skillName}': ${r.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
        { level: "error" },
      ),
      { hooks: void 0, unloadableGuard: !0 }
    );
  let result = HooksSchema().safeParse(frontmatter.hooks);
  if (!result.success)
    return (
      logForDebugging(`Invalid hooks in skill '${skillName}': ${result.error.message}`),
      { hooks: void 0, unloadableGuard: !0 }
    );
  return { hooks: result.data, unloadableGuard: !1 };
}
/**
 * 解析 frontmatter.paths：去掉结尾 /**、丢空串；全为 ** 时视为无条件（返回 undefined）。有 paths 的 skill 是条件 skill。
 */
//@ chunk-e6aww6q8.js:3122798-3122976 fingerprint = parseSkillPaths (1)
function parseSkillPaths(frontmatter) {
  if (!frontmatter.paths) return;
  let patterns = unwrapResults(frontmatter.paths)
    .map((pattern) => (pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern))
    .filter((r) => r.length > 0);
  if (patterns.length === 0 || patterns.every((r) => r === "**")) return;
  return patterns;
}
/**
 * 把 skill/命令 frontmatter 解析成统一字段：name、description（缺省取正文首行）、allowed-tools、disallowed-tools、argument-hint、arguments、when_to_use、version、model（inherit 特判）、disable-model-invocation、user-invocable、hooks、context(fork)、agent、background、effort、shell、created_by、fallback、metadata、declaredFields。
 */
//@ chunk-e6aww6q8.js:3122976-3124230 fingerprint = parseSkillFrontmatterFields (0.837)
function parseSkillFrontmatterFields(
  frontmatter,
  markdownContent,
  resolvedName,
  descriptionFallbackLabel = "Skill",
) {
  let validatedDescription = coerceDescriptionToString(frontmatter.description, resolvedName),
    description =
      validatedDescription ?? extractDescriptionFromMarkdown(markdownContent, descriptionFallbackLabel),
    S =
      frontmatter["user-invocable"] === void 0 ? !0 : parseBooleanFrontmatter(frontmatter["user-invocable"]),
    model = frontmatter.model,
    L;
  if (typeof model === "string" && model.trim().length > 0) {
    let trimmed = model.trim();
    L = trimmed.toLowerCase() === "inherit" ? "inherit" : parseUserSpecifiedModel(trimmed);
  }
  let effort = frontmatter.effort,
    q = effort !== void 0 ? parseEffortValue(effort) : void 0;
  if (effort !== void 0 && q === void 0)
    logForDebugging(
      `Skill ${resolvedName} has invalid effort '${effort}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
    );
  let { hooks: hooks, unloadableGuard: unloadableGuard } = parseSkillHooksFromFrontmatter(
      frontmatter,
      resolvedName,
    ),
    ke = unloadableGuard ? [] : parseSlashCommandToolsFromFrontmatter(frontmatter["allowed-tools"]);
  return {
    displayName: parseFrontmatterName(frontmatter.name, `skill ${resolvedName}`),
    description: description,
    hasUserSpecifiedDescription: validatedDescription !== null,
    allowedTools: ke,
    disallowedTools: twe(frontmatter),
    argumentHint: frontmatter["argument-hint"] != null ? String(frontmatter["argument-hint"]) : void 0,
    argumentNames: normalizeArgumentNames(frontmatter.arguments),
    whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : void 0,
    version: frontmatter.version != null ? String(frontmatter.version) : void 0,
    model: L,
    disableModelInvocation: parseBooleanFrontmatter(frontmatter["disable-model-invocation"]),
    userInvocable: S,
    hooks: hooks,
    executionContext: frontmatter.context === "fork" ? "fork" : void 0,
    agent: frontmatter.agent != null ? String(frontmatter.agent) : void 0,
    background: parseBooleanishFrontmatter(frontmatter.background),
    effort: q,
    shell: parseShellFrontmatter(frontmatter.shell, resolvedName),
    createdBy:
      frontmatter.created_by === "dream-proposal" || frontmatter.improved_by === "dream-proposal"
        ? "dream-proposal"
        : void 0,
    declaredFields: getDeclaredFrontmatterFields(frontmatter),
    fallback: parseBooleanishFrontmatter(frontmatter.fallback),
    metadata: isPlainObject_4(frontmatter.metadata) ? frontmatter.metadata : void 0,
  };
}
/**
 * 解析技能文件的 YAML frontmatter，解析失败时忽略并记录。
 */
//@ chunk-e6aww6q8.js:3124790-3125717 placement
function parseSkillFileToCommand({
  content: content,
  skillFilePath: skillFilePath,
  skillName: skillName,
  source: source,
  baseDir: baseDir,
  loadedFrom: loadedFrom,
  serverAttribution: serverAttribution,
  pathScoped: pathScoped = !0,
  untrusted: untrusted = !1,
  parsedElsewhere: parsedElsewhere = !1,
}) {
  let q = parseFrontmatter(content, skillFilePath, { normalizeKeys: !0, untrusted: untrusted }),
    {
      frontmatter: frontmatter,
      frontmatterAsWritten: frontmatterAsWritten,
      asWrittenProblem: asWrittenProblem,
      content: content_2,
      parseError: parseError,
    } = q;
  if (parseError && untrusted) throw new MalformedCommandError(`frontmatter was not read: ${parseError}`);
  if (parseError)
    (logForDebugging(
      `[skills] YAML frontmatter in ${skillFilePath} failed to parse and was ignored: ${parseError}`,
      { level: "error" },
    ),
      logFeatureSad("skill_load_dir", "skill_load_yaml_failed"));
  let Ae = Iv(getHostState().skillContentIntern, skillFilePath, content_2);
  if (!parsedElsewhere) checkFrontmatterShadow("skill", frontmatter);
  let Ie = parseSkillFrontmatterFields(frontmatter, Ae, skillName),
    Me = loadedFrom === "syncedSkills";
  return createSkillCommand({
    ...Ie,
    ...(Me ? DoctorWithPlugins(Ie) : void 0),
    skillName: skillName,
    markdownContent: Ae,
    textAboveBody:
      Me && content.endsWith(Ae)
        ? Iv(
            getHostState().skillContentIntern,
            `${skillFilePath}#above-body`,
            content.slice(0, content.length - Ae.length),
          )
        : void 0,
    contentHash: Bun.hash(content).toString(36),
    source: source,
    baseDir: baseDir,
    loadedFrom: loadedFrom,
    paths: pathScoped ? parseSkillPaths(frontmatter) : void 0,
    serverAttribution: serverAttribution,
    skillFile: Me
      ? scrubMemoryKeys(q, skillFilePath)
      : buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
  });
}
/**
 * 构造 skill 命令对象（type:prompt）：替换 allowed-tools 中的 ${CLAUDE_SKILL_DIR}/${CLAUDE_PROJECT_DIR}，getPromptForCommand 会加 Base directory 前缀、替换 $ARGUMENTS/具名参数、按来源执行正文里的 !`shell` 命令；名字不合法时不加载。
 */
//@ chunk-e6aww6q8.js:3125717-3128830 placement
function createSkillCommand({
  skillName: skillName,
  displayName: displayName,
  description: description,
  hasUserSpecifiedDescription: hasUserSpecifiedDescription,
  markdownContent: markdownContent,
  resolveBody: resolveBody,
  contentLength: contentLength,
  textAboveBody: textAboveBody,
  contentHash: contentHash,
  allowedTools: allowedTools,
  disallowedTools: disallowedTools,
  argumentHint: argumentHint,
  argumentNames: argumentNames,
  whenToUse: whenToUse,
  version: version,
  model: model,
  disableModelInvocation: disableModelInvocation,
  userInvocable: userInvocable,
  source: source,
  baseDir: baseDir,
  mcpResourceRoot: mcpResourceRoot,
  loadedFrom: loadedFrom,
  hooks: hooks,
  executionContext: executionContext,
  agent: agent,
  background: background,
  paths: paths,
  effort: effort,
  shell: shell,
  createdBy: createdBy,
  declaredFields: declaredFields,
  fallback: fallback,
  metadata: metadata,
  serverAttribution: serverAttribution,
  skillFile: skillFile,
}) {
  let no = loadedFrom === "syncedSkills",
    hn = no ? withSyncedSkillPrefix(skillName) : skillName;
  if (!$z(hn)) {
    reportRefusedSkillName(hn, "is not offered");
    return;
  }
  let ho = displaySkillFields({
      description: description,
      argumentHint: argumentHint,
      whenToUse: whenToUse,
      argumentNames: argumentNames,
    }),
    yn = allowedTools.length > 0;
  if (baseDir && allowedTools.length > 0) {
    let vn = _P(baseDir);
    allowedTools = allowedTools.map((co) => co.replaceAll(SKILL_DIR_PLACEHOLDER, () => vn));
  } else if (allowedTools.some((vn) => SKILL_DIR_REF_RE.test(vn))) {
    let filtered = allowedTools.filter((So) => !SKILL_DIR_REF_RE.test(So)),
      co = allowedTools.length - filtered.length;
    (logForDebugging(
      `[skills] ${skillName}: loaded without ${co} allowed-tools ${plural(co, "entry", "entries")} naming CLAUDE_SKILL_DIR, because the skill has no folder of its own`,
      { level: "warn" },
    ),
      logFeatureSad("skill_load_dir", "skill_load_no_skill_dir_grants_dropped"),
      (allowedTools = filtered));
  }
  if (allowedTools.some((vn) => PROJECT_DIR_REF_RE.test(vn))) {
    let vn = getToolsMachine() ? null : (getProjectConfigRoot() ?? getProjectRootOrNull());
    if (vn === null) {
      let filtered = allowedTools.filter((ko) => !PROJECT_DIR_REF_RE.test(ko)),
        So = allowedTools.length - filtered.length;
      (logForDebugging(
        `[skills] ${skillName}: loaded without ${So} allowed-tools ${plural(So, "entry", "entries")} naming CLAUDE_PROJECT_DIR, because this process has no folder where the tools run`,
        { level: "warn" },
      ),
        logFeatureSad("skill_load_dir", "skill_load_no_project_dir_grants_dropped"),
        (allowedTools = filtered));
    } else allowedTools = allowedTools.map((co) => co.replaceAll(PROJECT_DIR_PLACEHOLDER, () => _P(vn)));
  }
  let Kn = displayName || skillName,
    Xn = !no
      ? Kn
      : isSafeSkillName(skillName) &&
          stripInvisibleChars_3(stripSyncedSkillPrefix(Kn)) === stripInvisibleChars_3(skillName)
        ? skillName
        : withSyncedSkillPrefix(Kn),
    fo = !1,
    To = () => {
      let vn = shouldLoadPermissionRules(hooks) ? [] : (bo.allowedTools ?? []),
        co =
          vn.length === 0
            ? void 0
            : frontmatterToolGrantWithheldReason(
                source,
                void 0,
                "fromHostCatalog" in bo && bo.fromHostCatalog === !0,
              );
      if (co === void 0) return ((fo = !1), vn);
      if (!fo) ((fo = !0), reportIgnoredFrontmatterToolGrants(hn, { source: source }, vn, co));
      return [];
    },
    bo = {
      type: "prompt",
      name: hn,
      ...(no && { unqualifiedName: skillName, aliases: [skillName] }),
      description: ho.description,
      hasUserSpecifiedDescription: hasUserSpecifiedDescription,
      allowedTools: allowedTools,
      ...(yn && { getAllowedTools: async () => To() }),
      disallowedTools: disallowedTools?.length ? disallowedTools : void 0,
      argumentHint: ho.argumentHint,
      argNames: argumentNames.length > 0 ? ho.argumentNames : void 0,
      whenToUse: ho.whenToUse,
      version: version,
      model: model,
      disableModelInvocation: disableModelInvocation,
      userInvocable: userInvocable,
      context: executionContext,
      agent: agent,
      background: background,
      effort: effort,
      paths: paths,
      declaredFields: declaredFields,
      contentLength: contentLength ?? markdownContent.length,
      ...(textAboveBody !== void 0 && { getLoadedSkillMd: () => textAboveBody + markdownContent }),
      contentHash: contentHash ?? Bun.hash(markdownContent).toString(36),
      isHidden: !userInvocable,
      progressMessage: "running",
      userFacingName() {
        return Xn;
      },
      source: source,
      loadedFrom: loadedFrom,
      createdBy: createdBy,
      fallback: fallback,
      metadata: metadata,
      hooks: hooks,
      skillRoot: baseDir,
      serverAttribution: serverAttribution,
      skillFile: skillFile,
      async getPromptForCommand(args, context) {
        let So = resolveBody ? await resolveBody(context) : markdownContent,
          ko = baseDir ? `${prependBaseDir(baseDir)}${So}` : So,
          un = getEffortLevelOrHigh(
            inlineSkillModelOverride(model) ?? context.options.mainLoopModel,
            getEffortValue(context),
            effort ?? getEffortLayerOverride(context.permissionLayers),
          ),
          ao = { baseDir: baseDir, loadedFrom: loadedFrom, effortLevel: un };
        if (
          ((ko = substituteArguments(
            ko,
            args,
            !0,
            argumentNames,
            isSkillShownToModel({ loadedFrom: loadedFrom })
              ? ($o) => escapeAngleBrackets(xM(expandSkillPlaceholders($o, ao)))
              : ($o) => xM(expandSkillPlaceholders($o, ao)),
            ($o, yo) => expandSkillPlaceholders($o, ao, yo),
          )),
          isSkillDirSource(loadedFrom, source) && isSkillShellExecutionDisabled())
        )
          ko = replacePromptShellCommands(ko);
        else if (DRr(loadedFrom))
          ko = await executeShellCommandsInPrompt(
            ko,
            { ...context, getAppState: withCommandAllowRules(context, To()) },
            `/${skillName}`,
            shell,
          );
        if (mcpResourceRoot && !baseDir)
          ko = `${mcpSkillResourceHint(mcpResourceRoot)}

${ko}`;
        return [{ type: "text", text: ko }];
      },
    };
  if (!j7(Xn.replace(/&[lg]t;/g, "<")))
    (reportRefusedSkillName(Xn, `is not shown for ${hn}`), clearUserFacingName(bo));
  return bo;
}
/**
 * 读取 skill 目录下 .claude-plugin/plugin.json 的 name，用来判断是否是被禁用的插件 skill。
 */
//@ chunk-e6aww6q8.js:3128830-3129260 placement
async function readSkillPluginManifestName(e, n, r, s) {
  try {
    let h = await readSmallFileChecked(e, join_46(n, ".claude-plugin", "plugin.json"), By);
    if (h === null)
      return (
        logForDebugging(
          `[skills] skipping ${n}: .claude-plugin/plugin.json is not a regular file or exceeds ${By} byte limit`,
          { level: "warn" },
        ),
        { skip: !0 }
      );
    let parsed = JSON.parse(Wo(h));
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string" &&
      parsed.name
    )
      return { name: parsed.name };
    return { name: r };
  } catch (error) {
    if (!isENOENT(error)) return { name: r };
    return { name: null };
  }
}
//@ chunk-e6aww6q8.js:3129260-3129738 layout
async function listUserSkillDirNamesV5(e) {
  let n = [],
    r = await readAllPages(
      (s) => e.listEntries({ namespace: "userConfigDir", dir: "skills" }, s ? { cursor: s } : void 0),
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
            if (f3(y)) continue;
            n.push(y);
          }
      },
    );
  switch (r.status) {
    case "done":
      return { status: "ok", names: n };
    case "error":
      return { status: "error", error: r.error };
    case "capped":
      return { status: "capped" };
  }
}
/**
 * 通过 storageV5 后端读取用户 skills（userConfigDir/skills/*\/SKILL.md）：跳过被 enabledPlugins 禁用的同名插件 skill，超过大小限制或读失败的跳过并记遥测。
 */
//@ chunk-e6aww6q8.js:3129738-3132838 callgraph-witnessed = loadSkillsFromSkillsDir (0.254)
async function loadUserSkillsFromStorageV5(e, n, r) {
  let s = await listUserSkillDirNamesV5(r);
  if (s.status !== "ok") {
    if (!(s.status === "error" && s.error.code === "Failed" && s.error.failureClass === "permission")) {
      let q = s.status === "error" ? s.error.code : `listing exceeded ${DEFAULT_MAX_PAGES} pages`;
      (logForDebugging(`Failed to read skills directory ${e}: ${q}`, { level: "error" }),
        logFeatureSad("skill_load_dir", "skill_load_readdir_failed"));
    }
    return [];
  }
  let names = s.names,
    y = null,
    S = new Set();
  {
    let G = `@${SKILLS_DIR}`;
    if (n === "userSettings" && e === getThinkbackSkillDir()) {
      let enabledPlugins = getInitialSettings_2().enabledPlugins;
      for (let key in enabledPlugins)
        if (enabledPlugins[key] === !1 && key.endsWith(G)) S.add(key.slice(0, -G.length));
    }
  }
  let fs = isSkillAttributionEnabled(),
    results = await Promise.all(
      names.map(async (entry) => {
        try {
          let skillDirPath = join_46(e, entry),
            skillFilePath = join_46(skillDirPath, "SKILL.md");
          if (S.size > 0) {
            let userConfigDir = STORAGE_SPACES.userConfigDir("skills", [
                entry,
                ".claude-plugin",
                "plugin.json",
              ]),
              read = await r.read([userConfigDir]);
            if (!read.ok)
              return (
                logForDebugging(
                  `[skills] skipping ${skillDirPath}: .claude-plugin/plugin.json could not be checked (${read.error.code})`,
                  { level: "warn" },
                ),
                (y = "skill_load_read_failed"),
                null
              );
            let yt = read.value.items[0];
            if (yt.found) {
              if (yt.totalBytes > By)
                return (
                  logForDebugging(
                    `[skills] skipping ${skillDirPath}: .claude-plugin/plugin.json exceeds ${By} byte limit`,
                    { level: "warn" },
                  ),
                  (y = "skill_load_read_failed"),
                  null
                );
              let gt;
              try {
                let parsed = JSON.parse(Wo(Buffer.from(yt.value).toString("utf-8")));
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
              let gt = !1,
                At = await readAllPages(
                  (It) =>
                    r.listEntries(
                      { namespace: "userConfigDir", dir: "skills", relPath: [entry] },
                      It ? { suffix: ".claude-plugin", cursor: It } : { suffix: ".claude-plugin" },
                    ),
                  (It) => {
                    gt ||= It.some(
                      (Yt) =>
                        Yt.kind === "key" &&
                        Yt.key.namespace === "userConfigDir" &&
                        Yt.key.relPath.at(-1) === ".claude-plugin",
                    );
                  },
                  { until: () => gt },
                );
              if (At.status !== "done") {
                let It =
                  At.status === "error" ? At.error.code : `listing exceeded ${DEFAULT_MAX_PAGES} pages`;
                return (
                  logForDebugging(
                    `[skills] skipping ${skillDirPath}: .claude-plugin shape could not be checked (${It})`,
                    { level: "warn" },
                  ),
                  (y = "skill_load_read_failed"),
                  null
                );
              }
              if (gt) return null;
            }
          }
          let userConfigDir = STORAGE_SPACES.userConfigDir("skills", [entry, "SKILL.md"]),
            read = await r.read([userConfigDir]);
          if (!read.ok)
            return (
              logForDebugging(`[skills] failed to read ${skillFilePath}: ${read.error.code}`, {
                level: "warn",
              }),
              (y = "skill_load_read_failed"),
              null
            );
          let we = read.value.items[0];
          if (!we.found) return null;
          if (we.totalBytes > By)
            return (
              logForDebugging(
                `[skills] skipping ${skillFilePath}: ${we.totalBytes} bytes exceeds ${By} byte limit`,
                { level: "warn" },
              ),
              (y = "skill_load_too_large"),
              null
            );
          let str = Buffer.from(we.value).toString("utf-8"),
            {
              frontmatter: frontmatter,
              frontmatterAsWritten: frontmatterAsWritten,
              asWrittenProblem: asWrittenProblem,
              content: content,
              parseError: parseError,
            } = parseFrontmatter(str, skillFilePath, { normalizeKeys: !0 });
          if (parseError)
            (logForDebugging(
              `[skills] YAML frontmatter in ${skillFilePath} failed to parse and was ignored: ${parseError}`,
              { level: "error" },
            ),
              logFeatureSad("skill_load_dir", "skill_load_yaml_failed"));
          let lt = Iv(getHostState().skillContentIntern, skillFilePath, content);
          checkFrontmatterShadow("skill", frontmatter);
          let parsed = parseSkillFrontmatterFields(frontmatter, lt, entry),
            paths = parseSkillPaths(frontmatter);
          return {
            skill: createSkillCommand({
              ...parsed,
              skillName: entry,
              markdownContent: lt,
              contentHash: Bun.hash(str).toString(36),
              source: n,
              baseDir: skillDirPath,
              loadedFrom: "skills",
              paths: paths,
              serverAttribution: fs(skillDirPath),
              skillFile: buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
            }),
            filePath: skillFilePath,
          };
        } catch (error) {
          return (
            logForDebugging(`[skills] failed to parse ${join_46(e, entry, "SKILL.md")}: ${error}`, {
              level: "error",
            }),
            (y = "skill_load_parse_failed"),
            null
          );
        }
      }),
    );
  if (y) logFeatureBad("skill_load_dir", y);
  else logFeatureOk("skill_load_dir");
  return results.filter((G) => G?.skill !== void 0).sort((G, q) => G.skill.name.localeCompare(q.skill.name));
}
/**
 * 扫描一个 skills 目录下每个子目录的 SKILL.md 并转成命令：跳过保留目录名（synced）、带冒号的 synced 子目录、被禁用的同名插件；/mnt 下首次 readdir 为空会重试一次；支持 storageV5 与 host catalog 模式。
 */
//@ chunk-e6aww6q8.js:3132838-3136107 layout
async function loadSkillsFromSkillsDir(e, n, r = "skills", s, h) {
  if (s !== void 0) {
    if (n === "userSettings" && e === getThinkbackSkillDir())
      return filterReservedSkillNames(await loadUserSkillsFromStorageV5(e, n, s));
    logForDebugging(
      `[skills] storageV5 handed in for non-user base ${e}: not reading it through the backend`,
      { level: "warn" },
    );
  }
  if (isDiskless())
    return (
      logForDebugging(`Not scanning ${e}: the session is diskless, so no skills load from it`, {
        level: "warn",
      }),
      []
    );
  let y = getFsImplementation(),
    S;
  try {
    S = await y.readdir(e);
  } catch (error) {
    if (!isFsInaccessible(error))
      (logForDebugging(`Failed to read skills directory ${e}: ${error}`, { level: "error" }),
        logFeatureSad("skill_load_dir", "skill_load_readdir_failed"));
    return [];
  }
  if (S.length === 0 && e.startsWith("/mnt/")) {
    await sleep(250);
    try {
      let entries = await y.readdir(e);
      if (entries.length > 0)
        (logForDebugging(
          `Skills directory ${e}: first readdir was empty, retry returned ${entries.length} entries (transient mount race)`,
          { level: "warn" },
        ),
          logFeatureSad("skill_load_dir", "skill_load_mnt_transient_empty"),
          (S = entries));
      else logFeatureSad("skill_load_dir", "skill_load_mnt_persistent_empty");
    } catch (error) {
      let ke = sanitizeErrnoForTelemetry(error);
      if (
        (logFeatureSad("skill_load_dir", `skill_load_mnt_retry_${(ke ?? "unknown").toLowerCase()}`),
        !isFsInaccessible(error))
      )
        logForDebugging(`Skills directory ${e}: retry readdir failed: ${error}`, { level: "error" });
    }
  }
  if (h !== void 0) {
    let filtered = S.filter((we) => h.skills.has(we.name)),
      results = await Promise.all(filtered.map((we) => isRealPathSelf(join_46(e, we.name, "SKILL.md"))));
    S = filtered.filter((we, Ee) => results[Ee]);
  }
  let w = null,
    L = r === "syncedSkills" && h === void 0 && S.length > 0 ? readSyncedSkillIds(e) : void 0,
    G = isSkillAttributionEnabled(),
    q = new Set();
  {
    let Se = `@${SKILLS_DIR}`;
    if (
      (n === "userSettings" && e === getThinkbackSkillDir()) ||
      (n === "projectSettings" &&
        e === join_46(getProjectConfigRoot() ?? getOriginalCwd(), ".claude", "skills"))
    ) {
      let enabledPlugins = getInitialSettings_2().enabledPlugins;
      for (let key in enabledPlugins)
        if (enabledPlugins[key] === !1 && key.endsWith(Se)) q.add(key.slice(0, -Se.length));
    }
  }
  let results = await Promise.all(
    S.map(async (Se) => {
      try {
        if (!Se.isDirectory() && !Se.isSymbolicLink()) return null;
        if (r === "skills" && f3(Se.name))
          return (
            logForDebugging(
              `[skills] skipping reserved dir name '${Se.name}' under ${e}: 'synced' is the sync-owned root`,
            ),
            null
          );
        if (r === "syncedSkills" && Se.name.includes(":"))
          return (
            logForDebugging(
              `[skills] skipping '${Se.name}' under ${e}: its name contains ':', which the sync never writes, so it is not a synced skill`,
            ),
            null
          );
        let ke = join_46(e, Se.name),
          we = join_46(ke, "SKILL.md");
        if (q.size > 0) {
          let Me = await readSkillPluginManifestName(y, ke, Se.name, q.has(Se.name));
          if ("skip" in Me) return ((w = "skill_load_read_failed"), null);
          if (Me.name !== null && q.has(Me.name)) return null;
        }
        let Ee, Ae;
        if (h !== void 0) {
          let Me = await readRegularFileText(we, h.mountDevice, By);
          if ("reason" in Me) return (h.misses.set(Me.reason, (h.misses.get(Me.reason) ?? 0) + 1), null);
          Ee = Me.text;
        } else
          try {
            Ee = await readSmallFileChecked(y, we, By, (Me) => {
              Ae = Me;
            });
          } catch (error) {
            if (!isENOENT(error))
              (logForDebugging(`[skills] failed to read ${we}: ${error}`, { level: "warn" }),
                (w = "skill_load_read_failed"));
            return null;
          }
        if (Ee === null) {
          let Me = Ae?.isFile() === !0 && Ae.size > By;
          return (
            logForDebugging(
              Me
                ? `[skills] skipping ${we}: ${Ae?.size} bytes exceeds ${By} byte limit`
                : `[skills] skipping ${we}: not a regular file, or refused for where it leads`,
              { level: "warn" },
            ),
            (w = Me ? "skill_load_too_large" : "skill_load_read_failed"),
            null
          );
        }
        let Ie = parseSkillFileToCommand({
          content: Ee,
          skillFilePath: we,
          skillName: Se.name,
          source: n,
          baseDir: ke,
          loadedFrom: r,
          serverAttribution: (await L)?.get(stripInvisibleChars_3(Se.name)) ?? G(ke),
        });
        if (Ie === void 0) return null;
        if (h !== void 0 && Ie.type === "prompt") Ie.fromHostCatalog = !0;
        return { skill: Ie, filePath: we };
      } catch (error) {
        return (
          logForDebugging(`[skills] failed to parse ${join_46(e, Se.name, "SKILL.md")}: ${error}`, {
            level: "error",
          }),
          (w = "skill_load_parse_failed"),
          null
        );
      }
    }),
  );
  if (w) logFeatureBad("skill_load_dir", w);
  else logFeatureOk("skill_load_dir");
  return filterReservedSkillNames(
    results.filter((Se) => Se !== null).sort((Se, ke) => Se.skill.name.localeCompare(ke.skill.name)),
  );
}
/**
 * 文件名是否为 SKILL.md（不区分大小写）。
 */
//@ chunk-e6aww6q8.js:3136107-3136156 layout
function EZe(e) {
  return /^skill\.md$/i.test(basename_17(e));
}
/**
 * 同一目录里有 SKILL.md 时只保留它，否则保留全部 .md（旧版 commands 目录兼容）。
 */
//@ chunk-e6aww6q8.js:3136156-3136465 layout = transformSkillFiles (1)
function transformSkillFiles_2(files) {
  let filesByDir = new Map();
  for (let file of files) {
    let dir = dirname_26(file.filePath),
      dirFiles = filesByDir.get(dir) ?? [];
    (dirFiles.push(file), filesByDir.set(dir, dirFiles));
  }
  let result = [];
  for (let [s, h] of filesByDir) {
    let skillFiles = h.filter((S) => EZe(S.filePath));
    if (skillFiles.length > 0) {
      let skillFile = skillFiles[0];
      if (skillFiles.length > 1)
        logForDebugging(`Multiple skill files found in ${s}, using ${basename_17(skillFile.filePath)}`);
      result.push(skillFile);
    } else result.push(...h);
  }
  return result;
}
//@ chunk-e6aww6q8.js:3136465-3136612 file-local
function buildNamespace(targetDir, baseDir) {
  let normalizedBaseDir = baseDir.endsWith(sep_26) ? baseDir.slice(0, -1) : baseDir;
  if (!targetDir.startsWith(normalizedBaseDir + sep_26)) return "";
  let relativePath = targetDir.slice(normalizedBaseDir.length + 1);
  return relativePath ? relativePath.split(sep_26).join(":") : "";
}
//@ chunk-e6aww6q8.js:3136612-3136692 layout
function getSkillCommandName(e, n) {
  let r = dirname_26(e),
    s = dirname_26(r),
    h = basename_17(r),
    y = buildNamespace(s, n);
  return y ? `${y}:${h}` : h;
}
//@ chunk-e6aww6q8.js:3136692-3136788 file-local
function getRegularCommandName(filePath, baseDir) {
  let fileName = basename_17(filePath),
    fileDirectory = dirname_26(filePath),
    commandBaseName = fileName.replace(/\.md$/, ""),
    namespace = buildNamespace(fileDirectory, baseDir);
  return namespace ? `${namespace}:${commandBaseName}` : commandBaseName;
}
//@ chunk-e6aww6q8.js:3136788-3136879 fingerprint = getCommandName (1)
function getCommandName(file) {
  return EZe(file.filePath)
    ? getSkillCommandName(file.filePath, file.baseDir)
    : getRegularCommandName(file.filePath, file.baseDir);
}
/**
 * 加载旧式 .claude/commands/*.md（含 --add-dir 目录）为 skill 命令，loadedFrom=commands_DEPRECATED，名字按子目录用冒号命名空间。
 */
//@ chunk-e6aww6q8.js:3136879-3138092 fingerprint = loadSkillsFromCommandsDir (0.551)
async function loadSkillsFromCommandsDir(e, n, r) {
  try {
    let [s, h] = await Promise.all([
        loadMarkdownFilesCached("commands", e, r),
        Promise.all(
          n.map((G) => {
            let q = join_46(G, ".claude", "commands");
            return loadMarkdownFiles(q, r).then((Z) =>
              Z.map((Se) => ({ ...Se, baseDir: q, source: "projectSettings" })),
            );
          }),
        ),
      ]),
      y = [...s, ...h.flat()],
      processedFiles = transformSkillFiles_2(y),
      skills = [],
      L = !1;
    for (let {
      baseDir: baseDir,
      filePath: filePath,
      frontmatter: frontmatter,
      frontmatterAsWritten: frontmatterAsWritten,
      asWrittenProblem: asWrittenProblem,
      content: content,
      source: source,
    } of processedFiles)
      try {
        let skillDirectory = EZe(filePath) ? dirname_26(filePath) : void 0,
          cmdName = getCommandName({
            baseDir: baseDir,
            filePath: filePath,
            frontmatter: frontmatter,
            frontmatterAsWritten: frontmatterAsWritten,
            content: content,
            source: source,
          });
        checkFrontmatterShadow("skill", frontmatter);
        let parsed = parseSkillFrontmatterFields(frontmatter, content, cmdName, "Custom command");
        skills.push({
          skill: createSkillCommand({
            ...parsed,
            skillName: cmdName,
            displayName: void 0,
            markdownContent: Iv(getHostState().skillContentIntern, filePath, content),
            source: source,
            baseDir: skillDirectory,
            loadedFrom: "commands_DEPRECATED",
            paths: void 0,
            skillFile: buildFrontmatterResult(frontmatterAsWritten, filePath, asWrittenProblem),
          }),
          filePath: filePath,
        });
      } catch (error) {
        (logForDebugging(`[skills] failed to load command from ${filePath}: ${error}`, { level: "error" }),
          (L = !0));
      }
    if (L) logFeatureBad("skill_load_commands_dir", "skill_load_commands_parse_failed");
    else logFeatureOk("skill_load_commands_dir");
    return filterReservedSkillNames(
      skills.filter((G) => G.skill !== void 0).sort((G, q) => G.skill.name.localeCompare(q.skill.name)),
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`[skills] commands-dir load failed: ${error.code}`, { level: "error" });
    else logError(error);
    return (logFeatureSad("skill_load_commands_dir", "skill_load_commands_dir_failed"), []);
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
  let n = getThinkbackSkillDir();
  if (n === null) return null;
  if (e !== void 0) return getUserSkillFileIdsV5(n, e);
  let r;
  try {
    r = await getFsImplementation().readdir(n);
  } catch {
    return null;
  }
  let s = `@${SKILLS_DIR}`,
    enabledPlugins = getInitialSettings_2().enabledPlugins,
    y = new Set();
  for (let key in enabledPlugins)
    if (enabledPlugins[key] === !1 && key.endsWith(s)) y.add(key.slice(0, -s.length));
  let results = await Promise.all(
    r.map(async (w) => {
      if (!w.isDirectory() && !w.isSymbolicLink()) return null;
      if (f3(w.name)) return null;
      if (y.has(w.name)) return null;
      return realpathOrNull(join_46(n, w.name, "SKILL.md"));
    }),
  );
  return new Set(results.filter((w) => w !== null));
}
//@ chunk-e6aww6q8.js:3138647-3139169 layout
async function getUserSkillFileIdsV5(e, n) {
  let r = await listUserSkillDirNamesV5(n);
  if (r.status !== "ok") return null;
  let names = r.names,
    h = `@${SKILLS_DIR}`,
    enabledPlugins = getInitialSettings_2().enabledPlugins,
    S = new Set();
  for (let key in enabledPlugins)
    if (enabledPlugins[key] === !1 && key.endsWith(h)) S.add(key.slice(0, -h.length));
  let results = await Promise.all(
    names.map(async (L) => {
      if (S.has(L)) return null;
      if (S.size > 0) {
        let read = await n.read([
          STORAGE_SPACES.userConfigDir("skills", [L, ".claude-plugin", "plugin.json"]),
        ]);
        if (!read.ok) return null;
        let q = read.value.items[0];
        if (q.found && q.totalBytes > By) return null;
      }
      return realpathOrNull(join_46(e, L, "SKILL.md"));
    }),
  );
  return new Set(results.filter((L) => L !== null));
}
/**
 * getSkillDirCommands 的缓存包装，缓存键包含动态 skill 状态、cwd、存储模式等。
 */
//@ chunk-e6aww6q8.js:3139169-3139325 layout
function getSkillDirCommandsCached(e, n) {
  let r = isManagedFolderWritable();
  return getOrCreate(
    getHostState().skillDirCommands,
    `${getDynamicSkillStateKey()}:${getSkillsSyncVetoed()}:${getAccountCacheKey()}:${_8()}:${W1()}${keyOrNull(e)}:${n === void 0 ? "raw" : "v5"}`,
    () => getSkillDirCommands(e, n, r),
  );
}
/**
 * 汇总所有目录来源的 skill：managed（CLAUDE_CODE_DISABLE_POLICY_SKILLS 可关）、用户 ~/.claude/skills、同步 skills、host catalog、项目各级 .claude/skills、--add-dir 的 .claude/skills、旧 commands 目录、插件 skill；按文件身份去重，有 paths 的放入条件 skill 表，返回无条件 skill。bare 模式只读 --add-dir。
 */
//@ chunk-e6aww6q8.js:3139325-3142633 fingerprint = getSkillDirCommands (0.795)
async function getSkillDirCommands(e, n, r) {
  getDynamicSkillState().refusedReservedNames.clear();
  let s = getThinkbackSkillDir(),
    managedSkillsDir = join_46(getManagedFilePath(), ".claude", "skills"),
    y = await getProjectDirsUpToHome("skills", e);
  (isInGlobalClaudeFolder(y, "skills", e),
    logForDebugging(
      `Loading skills from: managed=${managedSkillsDir}, user=${s ?? "none"}, project=[${y.join(", ")}]`,
    ));
  let S = isDiskless() ? [] : getAdditionalDirectoriesForClaudeMd(),
    w = isRestrictedToPluginOnly("skills"),
    L = isSettingSourceEnabled("projectSettings") && !w;
  if (isCustomizationDisabled("skills", { explicitlyRequested: S.length > 0 && L }))
    return (logForDebugging("[reduced mode] Skipping skill dir discovery"), []);
  if (isBareMode())
    return (
      await Promise.all(
        S.map((At) => loadSkillsFromSkillsDir(join_46(At, ".claude", "skills"), "projectSettings")),
      )
    )
      .flat()
      .map((At) => At.skill);
  let additionalDirs = isHostSkillCatalogEnabled(),
    q = additionalDirs ? hostSkillCatalogFolders() : null;
  if (!additionalDirs && hostSkillCatalog() !== void 0) logFeatureSad("skill_host_catalog", "gated");
  let Z = r || isManagedFolderWritable();
  if (Z && !isDiskless())
    logForDebugging(
      `${managedSkillsDir}: not read: this session takes its managed settings from its organization, and its own account could have written the managed folder`,
    );
  let [Se, ke, we, Ee, Ae, Ie, Me] = await Promise.all([
      env.CLAUDE_CODE_DISABLE_POLICY_SKILLS || isDiskless() || Z
        ? Promise.resolve([])
        : loadSkillsFromSkillsDir(managedSkillsDir, "policySettings"),
      s !== null && isSettingSourceEnabled("userSettings") && !w
        ? loadSkillsFromSkillsDir(s, "userSettings", "skills", n)
        : Promise.resolve([]),
      s !== null && isSettingSourceEnabled("userSettings") && !w && !getSkillsSyncVetoed() && _8()
        ? getSyncBucket().then(async (dir) =>
            dir === null || !(await E2e(join_46(s, SYNCED_DIR), dir))
              ? []
              : loadSkillsFromSkillsDir(join_46(s, SYNCED_DIR, dir), "userSettings", "syncedSkills"),
          )
        : Promise.resolve([]),
      q === null ? Promise.resolve([]) : loadHostCatalogSkills(q),
      L ? Promise.all(y.map((gt) => loadSkillsFromSkillsDir(gt, "projectSettings"))) : Promise.resolve([]),
      L
        ? Promise.all(
            S.map((dir) => loadSkillsFromSkillsDir(join_46(dir, ".claude", "skills"), "projectSettings")),
          )
        : Promise.resolve([]),
      w ? Promise.resolve([]) : loadSkillsFromCommandsDir(e, L ? S : [], n),
    ]),
    We = [
      ...filterUntrustedSkills(Se),
      ...ke,
      ...we,
      ...Ae.flat(),
      ...Ie.flat(),
      ...Me,
      ...(w ? [] : KTn()).map((dir) => ({ skill: dir, filePath: "" })),
    ],
    fileIds = await Promise.all(
      We.map(({ skill: skill, filePath: filePath }) =>
        skill.type === "prompt" && filePath !== "" ? realpathOrNull(filePath) : Promise.resolve(null),
      ),
    ),
    seenFileIds = new Map(),
    Je = [];
  for (let gt = 0; gt < We.length; gt++) {
    let At = We[gt];
    if (At === void 0 || At.skill.type !== "prompt") continue;
    let { skill: skill } = At;
    if (At.filePath !== "") getHostState().skillFiles.set(skill, At.filePath);
    let Yt = fileIds[gt];
    if (Yt === null || Yt === void 0) {
      Je.push(skill);
      continue;
    }
    let existingSource = seenFileIds.get(Yt);
    if (existingSource !== void 0) {
      logForDebugging(
        `Skipping duplicate skill '${skill.name}' from ${skill.source} (same file already loaded from ${existingSource})`,
      );
      continue;
    }
    (seenFileIds.set(Yt, skill.source), Je.push(skill));
  }
  groupPluginSourcesByName(
    "skill",
    Je.map((gt) => ({ name: gt.name, source: gt.source })),
    { resolves: !1 },
  );
  let duplicatesRemoved = We.length - Je.length;
  if (duplicatesRemoved > 0) logForDebugging(`Deduplicated ${duplicatesRemoved} skills (same file)`);
  if (q !== null) {
    let gt = new Set(we.map(({ skill: skill }) => foldName_2(skill.name)));
    for (let { skill: skill, fileId: fileId } of Ee)
      if (gt.has(foldName_2(skill.name))) {
        logForDebugging(
          `Skipping host catalog skill '${skill.name}': the account syncs a skill of that name`,
        );
        let Yt = getDynamicSkillState();
        if (Yt.dynamicSkills.delete(getDynamicSkillKey(skill)))
          Yt.activatedConditionalSkillNames.delete(skill.name);
      } else if (seenFileIds.has(fileId))
        logForDebugging(
          `Skipping host catalog skill '${skill.name}': another skills folder links to the same file`,
        );
      else Je.push(skill);
  }
  let pt = [],
    Et = [],
    yt = getDynamicSkillState();
  for (let skill of Je) {
    let At = skill.type === "prompt" && !!skill.paths && skill.paths.length > 0;
    if (At) {
      let It = getDynamicSkillKey(skill);
      if (yt.dynamicSkills.has(It)) yt.dynamicSkills.set(It, skill);
    }
    if (At && !yt.activatedConditionalSkillNames.has(skill.name)) Et.push(skill);
    else pt.push(skill);
  }
  for (let skill of Et) yt.conditionalSkills.set(skill.name, skill);
  if (Et.length > 0)
    logForDebugging(
      `[skills] ${Et.length} conditional skills stored (activated when matching files are touched)`,
    );
  return (
    logForDebugging(
      `Loaded ${Je.length} unique skills (${pt.length} unconditional, ${Et.length} conditional, managed: ${Se.length}, user: ${ke.length}, project: ${Ae.flat().length}, additional: ${Ie.flat().length}, legacy commands: ${Me.length})`,
    ),
    pt
  );
}
/**
 * 清空 skill 目录缓存和 markdown 文件缓存（热重载时调用）。
 */
//@ chunk-e6aww6q8.js:3142633-3142706 layout
function clearSkillCaches() {
  let e = getHostState();
  (e.invalidateSkillDirs(), e.markdownFiles.clear());
}
/**
 * 新建动态 skill 状态：dynamicSkillDirs、deferredSkillDirs、dynamicSkills、conditionalSkills、activatedConditionalSkillNames、refusedReservedNames。
 */
//@ chunk-e6aww6q8.js:3142706-3142896 layout
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
/**
 * 从动态/条件 skill 表中删除不在给定集合中的过期条目，返回删除数。
 */
//@ chunk-e6aww6q8.js:3142896-3143206 layout
function pruneDynamicSkillsNotIn(e) {
  let n = peekDynamicSkillState();
  if (!n) return 0;
  let r = 0;
  for (let [s, h] of n.dynamicSkills)
    if (isStaleDynamicSkill(h, e))
      (n.dynamicSkills.delete(s), n.activatedConditionalSkillNames.delete(h.name), r++);
  for (let [s, h] of n.conditionalSkills)
    if (isStaleDynamicSkill(h, e))
      (n.conditionalSkills.delete(s), n.activatedConditionalSkillNames.delete(h.name), r++);
  return r;
}
/**
 * 是否启用宿主 skill 目录（host catalog）：未处于精简模式、userSettings 来源启用且非仅插件策略。
 */
//@ chunk-e6aww6q8.js:3143206-3143276 layout
function isHostSkillCatalogEnabled() {
  return (
    !isCustomizationDisabled("skills") &&
    isSettingSourceEnabled("userSettings") &&
    !isRestrictedToPluginOnly("skills")
  );
}
/**
 * 读取宿主提供的 skill 目录（host catalog，挂载点上的同步 skills），逐个校验非链接后加载，记 skill_host_catalog 遥测。
 */
//@ chunk-e6aww6q8.js:3143276-3144280 layout
async function loadHostCatalogSkills(e) {
  let n = new Map(),
    r = await K5o(PUBLIC);
  if ("reason" in r)
    (logForDiagnosticsNoPII("warn", "skill_host_catalog_not_read", r), n.set(r.reason, e.skills.size));
  let s = "reason" in r ? null : await realpathOrNull(e.dir),
    h =
      "reason" in r || s === null
        ? []
        : await loadSkillsFromSkillsDir(s, "userSettings", "syncedSkills", void 0, {
            skills: e.skills,
            mountDevice: r.device,
            misses: n,
          }),
    results = await Promise.all(h.map(({ filePath: filePath }) => isRealPathSelf(filePath))),
    flattened = h.flatMap(({ skill: skill, filePath: filePath }, q) =>
      results[q] ? [{ skill: skill, fileId: filePath }] : [],
    );
  if (flattened.length < e.skills.size) {
    let L = new Set(flattened.map(({ fileId: fileId }) => basename_17(dirname_26(fileId))));
    logForDebugging(
      `Host catalog: skills not loaded (missing, unreadable, not on the mount, or reached through a link): ${[...e.skills].filter((G) => !L.has(G)).join(", ")}`,
      { level: "warn" },
    );
  }
  let w = {
    named: e.skills.size,
    loaded: flattened.length,
    withheld: count(flattened, ({ skill: skill }) => isKilledHostCatalogSkill(skill)),
    ...hrr(n),
  };
  if (w.withheld > 0 && w.withheld === w.loaded) logFeatureSad("skill_host_catalog", "all_withheld", w);
  else if (w.loaded === w.named) logFeatureOk("skill_host_catalog", w);
  else if (w.loaded > 0) logFeatureSad("skill_host_catalog", "some_missing", w);
  else logFeatureBad("skill_host_catalog", "none_loaded", w);
  return flattened;
}
/**
 * 由 host catalog 的一个 SKILL.md 文本构造命令对象（fromHostCatalog=true）。
 */
//@ chunk-e6aww6q8.js:3144280-3144514 layout
function createHostCatalogSkill({ text: text, filePath: filePath }) {
  let r = dirname_26(filePath),
    s = parseSkillFileToCommand({
      content: text,
      skillFilePath: filePath,
      skillName: basename_17(r),
      source: "userSettings",
      baseDir: r,
      loadedFrom: "syncedSkills",
      serverAttribution: isSkillAttributionEnabled()(r),
    });
  if (s?.type === "prompt") s.fromHostCatalog = !0;
  return s;
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
  let dynamicSkillStates = getHostState().dynamicSkillStates,
    n = getDynamicSkillStateKey(),
    r = dynamicSkillStates.get(n);
  if (!r) ((r = createDynamicSkillState()), dynamicSkillStates.set(n, r));
  return r;
}
//@ chunk-e6aww6q8.js:3144740-3144803 layout
function peekDynamicSkillState() {
  return getHostState().dynamicSkillStates.get(getDynamicSkillStateKey()) ?? null;
}
/**
 * 设置当前动态 skill 状态。
 */
//@ chunk-e6aww6q8.js:3144803-3144856 layout
function setDynamicSkillState(e) {
  getHostState().dynamicSkillStates.set(getDynamicSkillStateKey(), e);
}
/**
 * 订阅「动态 skill 已加载」事件，回调异常只记录不抛出；返回取消订阅函数。
 */
//@ chunk-e6aww6q8.js:3144856-3144944 layout
function onDynamicSkillsLoaded(e) {
  return getHostState().dynamicSkillsLoaded.subscribe(() => {
    try {
      e();
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-e6aww6q8.js:3144944-3145008 layout
function foldSkillPath(e) {
  return stripInvisibleChars_3(
    e
      .split(sep_26)
      .map((n) => trimTrailingDotsSpaces(n))
      .join(sep_26),
  );
}
//@ chunk-e6aww6q8.js:3145008-3145035 layout
var skillPrefixCacheByHost = new HostScoped(() => io(computeSkillPathPrefixes));
//@ chunk-e6aww6q8.js:3145035-3145524 layout
async function computeSkillPathPrefixes(e) {
  let n = async (y) => {
      try {
        let S = await realpath_15(y);
        return S === y ? [y] : [y, S];
      } catch {
        return [y];
      }
    },
    r = await n(e),
    s = new Set(),
    h = new Set();
  for (let y of r) {
    for (let S of await n(join_46(y, "skills"))) s.add(S);
    for (let S of await n(join_46(y, "plugins"))) h.add(S);
  }
  return {
    skillsBasePrefixesFolded: [...s].map((y) => foldSkillPath(y) + sep_26),
    syncOwnedPrefixes: [
      ...[...s].flatMap((y) => [
        join_46(y, SYNCED_DIR) + sep_26,
        join_46(y, g5t) + sep_26,
        join_46(y, ".staging") + sep_26,
      ]),
      ...[...h].map((y) => join_46(y, SYNCED_DIR) + sep_26),
    ].map(foldSkillPath),
    syncedSkillsPrefixes: [...s].map((y) => foldSkillPath(join_46(y, SYNCED_DIR) + sep_26)),
  };
}
//@ chunk-e6aww6q8.js:3145524-3145697 layout
async function isInSyncedSkillsDir(e, n) {
  let r = getClaudeConfigDirOrNull();
  if (r === null) return !1;
  let { syncedSkillsPrefixes: syncedSkillsPrefixes } = await skillPrefixCacheByHost.of(e)(r);
  return n.some((h) => {
    let y = foldSkillPath(h);
    return syncedSkillsPrefixes.some((S) => y.startsWith(S));
  });
}
//@ chunk-e6aww6q8.js:3145697-3145756 layout
async function isGitignoredInWorkTree(e, n, r) {
  return findGitRootUncached(e) === n ? isPathGitignored(e, r) : void 0;
}
/**
 * 文件被读写时，从其目录向上（不超过 cwd 根）寻找新的 .claude/skills 目录：跳过同步目录、8.3 短名、gitignore 的目录与目标不确定的链接；返回新发现的目录列表。
 */
//@ chunk-e6aww6q8.js:3145756-3147407 layout
async function discoverSkillDirsForPaths(e, n, r, s, h) {
  if (isCustomizationDisabled("skills")) return [];
  if (getProjectConfigRoot() !== null) return [];
  if (isDiskless()) return [];
  let y = getFsImplementation(),
    S = r.endsWith(sep_26) ? r.slice(0, -1) : r,
    w = [],
    L = getCwd(),
    { syncOwnedPrefixes: syncOwnedPrefixes, skillsBasePrefixesFolded: skillsBasePrefixesFolded } =
      await skillPrefixCacheByHost.of(e)(getClaudeConfigDir()),
    Z =
      getPlatform() === "windows"
        ? [...skillsBasePrefixesFolded, foldSkillPath(S) + sep_26]
        : skillsBasePrefixesFolded;
  for (let Se of n) {
    let ke = dirname_26(Se),
      we = foldSkillPath(ke) + sep_26;
    if (syncOwnedPrefixes.some((Ee) => we.startsWith(Ee))) continue;
    if (
      Z.some(
        (Ee) =>
          we.startsWith(Ee) &&
          we
            .slice(Ee.length)
            .split(sep_26)
            .some((Ae) => /~\d/.test(Ae)),
      )
    )
      continue;
    while (ke.startsWith(S + sep_26)) {
      let Ee = join_46(ke, ".claude", "skills"),
        Ae = getDynamicSkillState().deferredSkillDirs.get(Ee);
      if (Ae !== void 0 && Ae !== L)
        (getDynamicSkillState().deferredSkillDirs.delete(Ee),
          getDynamicSkillState().dynamicSkillDirs.delete(Ee));
      if (!getDynamicSkillState().dynamicSkillDirs.has(Ee)) {
        getDynamicSkillState().dynamicSkillDirs.add(Ee);
        try {
          if (isStorageV5Enabled() && s !== void 0) {
            let stats = await s.hostFiles.stat(PathSpace.workspace(Ee));
            if (!stats.ok || stats.value.kind === "absent") continue;
          } else await y.stat(Ee);
          let Me = h === void 0 || ke.startsWith(h.cwd + sep_26);
          if (!Me) {
            let ze = await isGitignoredInWorkTree(ke, h.workTree, S);
            if (ze !== 1) {
              if (ze !== 0) getDynamicSkillState().deferredSkillDirs.set(Ee, L);
              logForDebugging(`[skills] Skipped gitignored or unconfirmed skills dir: ${Ee}`);
              continue;
            }
          } else if (await isPathGitignoredBool(ke, h?.cwd ?? S)) {
            logForDebugging(`[skills] Skipped gitignored skills dir: ${Ee}`);
            continue;
          }
          let We;
          try {
            We = await realpath_15(Ee);
          } catch {}
          if (syncOwnedPrefixes.some((ze) => (foldSkillPath(We ?? Ee) + sep_26).startsWith(ze))) {
            logForDebugging(`[skills] Skipped sync-owned skills dir (resolved): ${Ee}`);
            continue;
          }
          if (!Me) {
            let ze = await realpath_15(h.workTree).catch(() => {
                return;
              }),
              lt =
                We === void 0 || ze === void 0
                  ? void 0
                  : We === Ee
                    ? 1
                    : await isGitignoredInWorkTree(
                        basename_17(dirname_26(We)) === ".claude" ? dirname_26(dirname_26(We)) : We,
                        ze,
                        S,
                      );
            if (lt !== 1) {
              if (lt !== 0) getDynamicSkillState().deferredSkillDirs.set(Ee, L);
              logForDebugging(`[skills] Skipped skills dir with an unconfirmed target: ${Ee}`);
              continue;
            }
          }
          w.push(Ee);
        } catch {}
      }
      let Ie = dirname_26(ke);
      if (Ie === ke) break;
      ke = Ie;
    }
  }
  return w;
}
//@ chunk-e6aww6q8.js:3147407-3147484 layout
function getDynamicSkillKey(e) {
  return `${e.type === "prompt" ? (e.skillRoot ?? "") : ""}\x00${e.name}`;
}
/**
 * 把新发现的 skill 目录加载进动态 skill 表（replace 时先删该目录下消失的 skill），记 tengu_dynamic_skills_changed 并发出已加载事件；projectSettings 关闭或仅插件策略时跳过。
 */
//@ chunk-e6aww6q8.js:3147484-3148529 fingerprint = addSkillDirectories (0.94)
async function addSkillDirectories(e, n = {}) {
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
  if (e.length === 0) return;
  let results = await Promise.all(e.map((S) => loadSkillsFromSkillsDir(S, "projectSettings"))),
    previousSkillNamesForLogging = new Set(getDynamicSkillState().dynamicSkills.keys()),
    h = getDynamicSkillState();
  if (n.replace) {
    let S = new Set(results.flat().map(({ skill: skill }) => getDynamicSkillKey(skill))),
      w = (L) => {
        let G = L.type === "prompt" ? (L.skillRoot ?? "") : "";
        return e.some((dir) => {
          let Z = relative_16(dir, G);
          return Z === "" || (!Z.startsWith("..") && !isAbsolute_18(Z));
        });
      };
    for (let [L, G] of h.dynamicSkills) if (w(G) && !S.has(L)) h.dynamicSkills.delete(L);
  }
  for (let S of results)
    for (let { skill: skill } of S)
      if (skill.type === "prompt") h.dynamicSkills.set(getDynamicSkillKey(skill), skill);
  let newSkillCount = results.flat().length;
  if (newSkillCount > 0) {
    let addedSkills = [...getDynamicSkillState().dynamicSkills.keys()].filter(
      (w) => !previousSkillNamesForLogging.has(w),
    );
    if (
      (logForDebugging(
        `[skills] Dynamically discovered ${newSkillCount} skills from ${e.length} directories`,
      ),
      addedSkills.length > 0)
    )
      logEvent("tengu_dynamic_skills_changed", {
        source: lit_2("file_operation"),
        previousCount: previousSkillNamesForLogging.size,
        newCount: getDynamicSkillState().dynamicSkills.size,
        addedCount: addedSkills.length,
        directoryCount: e.length,
      });
  }
  getHostState().dynamicSkillsLoaded.emit();
}
/**
 * 返回当前动态 skill 列表（按名排序，过滤掉 managed 目录已删除的）。
 */
//@ chunk-e6aww6q8.js:3148529-3148828 layout
function getDynamicSkills() {
  return Array.from(peekDynamicSkillState()?.dynamicSkills.entries() ?? [])
    .filter(
      ([, e]) =>
        e.type !== "prompt" ||
        e.source !== "policySettings" ||
        (e.skillRoot === void 0 ? W1() === "" : !isUntrustedManagedSkill(join_46(e.skillRoot, "SKILL.md"))),
    )
    .sort(([e, n], [r, s]) => (n.name === s.name ? e.localeCompare(r) : n.name.localeCompare(s.name)))
    .map(([, e]) => e);
}
/**
 * 用 gitignore 语法匹配条件 skill 的 paths；被触及的文件（相对 cwd）命中时把该 skill 激活进动态表，记遥测并发出已加载事件，返回激活的名字。
 */
//@ chunk-e6aww6q8.js:3148828-3149592 fingerprint = activateConditionalSkillsForPaths (0.838)
function activateConditionalSkillsForPaths(filePaths, cwd) {
  if ((peekDynamicSkillState()?.conditionalSkills.size ?? 0) === 0) return [];
  let activated = [];
  for (let [s, h] of getDynamicSkillState().conditionalSkills) {
    if (h.type !== "prompt" || !h.paths || h.paths.length === 0) continue;
    let skillIgnore = tvn.default().add(xst(h.paths, "skill_paths"));
    for (let filePath of filePaths) {
      let relativePath = isAbsolute_18(filePath) ? relative_16(cwd, filePath) : filePath;
      if (!relativePath || relativePath.startsWith("..") || isAbsolute_18(relativePath)) continue;
      if (skillIgnore.ignores(relativePath)) {
        (getDynamicSkillState().dynamicSkills.set(getDynamicSkillKey(h), h),
          getDynamicSkillState().conditionalSkills.delete(s),
          getDynamicSkillState().activatedConditionalSkillNames.add(s),
          activated.push(s),
          logForDebugging(`[skills] Activated conditional skill '${s}' (matched path: ${relativePath})`));
        break;
      }
    }
  }
  if (activated.length > 0)
    (logEvent("tengu_dynamic_skills_changed", {
      source: lit_2("conditional_paths"),
      previousCount: getDynamicSkillState().dynamicSkills.size - activated.length,
      newCount: getDynamicSkillState().dynamicSkills.size,
      addedCount: activated.length,
      directoryCount: 0,
    }),
      getHostState().dynamicSkillsLoaded.emit());
  return activated;
}
/**
 * 为访问的文件路径发现嵌套技能目录（处理 worktree 情况），登记新目录后激活与该路径匹配的条件技能。
 */
//@ chunk-e6aww6q8.js:3149592-3149884 layout
async function discoverSkillsForPath(e, n, r, s) {
  let h = getCwd(),
    y = M$() ? h : getOriginalCwd(),
    S = h !== y && isPathWithinCaseAware(h, y, !1) ? findGitRoot(h) : null,
    w = S !== null && findGitRoot(y) === S ? { cwd: h, workTree: S } : void 0,
    L = w === void 0 ? h : y,
    G = await discoverSkillDirsForPaths(e, [n], L, s, w);
  if (G.length > 0) {
    if (r) {
      for (let q of G) if (!r.includes(q)) r.push(q);
    }
    addSkillDirectories(G)
      .then(() => {
        activateConditionalSkillsForPaths([n], L);
      })
      .catch(() => {});
  }
  activateConditionalSkillsForPaths([n], L);
}
/**
 * 把当前工作目录向上至家目录之间各级的 `.claude/skills` 设为技能目录（replace），工作目录就是家目录时不做；用于清缓存或目录变化后重建技能目录列表。旧版名 getThinkbackSkillDir 配错。
 */
//@ chunk-e6aww6q8.js:3149884-3149981 layout = getThinkbackSkillDir (1)
async function resetProjectSkillDirectories() {
  let e = getOriginalCwd();
  if (e === getProjectRoot()) return;
  await addSkillDirectories(await getProjectDirsUpToHome("skills", e), { replace: !0 });
}
/**
 * 列出动态技能状态里尚未激活的条件技能（frontmatter 带 paths 的 skill）。
 */
//@ chunk-e6aww6q8.js:3149981-3150053 layout
function EVe() {
  return Array.from(peekDynamicSkillState()?.conditionalSkills.values() ?? []);
}
/**
 * 清空所有动态 skill 状态。
 */
//@ chunk-e6aww6q8.js:3150053-3150272 layout
function clearDynamicSkills() {
  let e = peekDynamicSkillState();
  if (!e) return;
  (e.dynamicSkillDirs.clear(),
    e.deferredSkillDirs.clear(),
    e.dynamicSkills.clear(),
    e.conditionalSkills.clear(),
    e.activatedConditionalSkillNames.clear(),
    e.refusedReservedNames.clear());
}
//@ chunk-e6aww6q8.js:3150272-3150334 fingerprint
$7s({ createSkillCommand: createSkillCommand, parseSkillFrontmatterFields: parseSkillFrontmatterFields });

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
  EVe,
  clearDynamicSkills,
  discoverSkillsForPath,
  setDynamicSkillState,
  createDynamicSkillState,
  _P,
  parseSkillFileToCommand,
  isHostSkillCatalogEnabled,
  createHostCatalogSkill,
  syncedSkillsManifestSchema,
  syncedSkillEntrySchema,
  getDynamicSkillStateKeyExport,
  refuseReservedSkillName,
  $z,
  NON_ASCII_SPACE_RE,
  isInSyncedSkillsDir,
  transformSkillFiles,
  normalizeArgumentNames,
  j7,
  getUserSkillFileIds,
  readSyncedSkillIds,
  readDirNameSet,
  createSkillCommand,
  pruneDynamicSkillsNotIn,
  getSkillListingText,
};
