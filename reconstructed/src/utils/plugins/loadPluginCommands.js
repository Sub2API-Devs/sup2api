/**
 * utils/plugins/loadPluginCommands.ts
 *
 * 从插件 commands/ 与 skills/ 目录生成斜杠命令和技能（<插件>:<名字>），处理 frontmatter 与变量替换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginCommands.ts
 * pieces: chunk-e6aww6q8.js (27)
 * attribution: placement 15, layout 4, file-local 2, fingerprint 6
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
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
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
import {
  parseSlashCommandToolsFromFrontmatter,
  extractDescriptionFromMarkdown,
} from "../markdownConfigLoader.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { sleep } from "../sleep.js";
import { getMcpAuthCache as getMcpAuthCache_2 } from "./safeFileRead.js";
import { getErrnoCode, errorMessage, isENOENT } from "../errors.js";
import { isUnavailableErrorCode } from "../settings/managedEnvKeys.js";
import { jsonParse } from "../slowOperations.js";
import {
  parseFrontmatter,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  coerceDescriptionToString,
  parseFrontmatterName,
  parseBooleanFrontmatter,
  parseShellFrontmatter,
  parseBooleanishFrontmatter,
  getDeclaredFrontmatterFields,
} from "../frontmatterParser.js";
import {
  estimateSubstitutedGrowth,
  needsUnknownDataDir,
  substitutePluginVariables,
  loadPluginOptions,
  substituteUserConfigInContent,
} from "./pluginOptionsStorage.js";
import { logForDebugging } from "../debug.js";
import { buildFrontmatterResult } from "../../services/memorySync/pathScrub.js";
import { getHostState } from "../hostEnvironment.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { getFsImplementation, isDuplicatePath } from "../fsOperations.js";
import { walkPluginMarkdown } from "./walkPluginMarkdown.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import {
  transformSkillFiles,
  $z,
  normalizeArgumentNames,
  j7,
  getUserSkillFileIds,
} from "../../skills/loadSkillsDir.js";
import { redactMarketplaceSource, redactNpmTarball } from "./schemas.js";
import { reportRefusedSkillName } from "../../skills/skillNameRules.js";
import {
  getToolsMachine,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getSessionId,
} from "../../bootstrap/state.js";
import { PROJECT_DIR_PLACEHOLDER } from "../../skills/skillPathPlaceholders.js";
import { displaySkillFields } from "../../skills/skillSources.js";
import { B2 } from "../permissions/permissionRulePayload.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { parseEffortValue, EFFORT_LEVELS, getEffortLevelOrHigh } from "../effort.js";
import { directoryPluginFallbackName, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { SYNCED } from "../telemetry/pluginTelemetry.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { LCt } from "./syncedItems.js";
import {
  hasNestedHooks,
  PLUGIN_NON_HOOK_KEYS,
  hasGuardHooks_2,
  containsHooks,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import { HooksSchema } from "../../schemas/hooks.js";
import { shouldSkipSessionHooksByPolicy } from "../hooks/hooksConfigSnapshot.js";
import {
  shouldLoadPermissionRules,
  frontmatterToolGrantWithheldReason,
  reportIgnoredFrontmatterToolGrants,
} from "../permissions/permissionsLoader.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { KVs } from "../../skills/skillChangeWatch.js";
import { inlineSkillModelOverride } from "../model/model.js";
import { getEffortValue, getEffortLayerOverride } from "../permissions/toolPermissionContext.js";
import { substituteArguments } from "../argumentSubstitution.js";
import {
  xM,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  executeShellCommandsInPrompt,
  withCommandAllowRules,
} from "../promptShellExecution.js";
import { clearUserFacingName } from "../../commands.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { pluginErrorText } from "../../types/plugin.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isSkillAttributionEnabled } from "../telemetry/skillAttribution.js";
import { desktopSkillSwitches } from "../sessionShape.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-e6aww6q8.js:1663434-1663518 placement
function Iv(e, n, r) {
  let s = e.get(n);
  if (s !== void 0 && s === r) return s;
  return (e.set(n, r), r);
}
//@ chunk-e6aww6q8.js:1663518-1663586 placement
function twe(e) {
  return parseSlashCommandToolsFromFrontmatter(e["disallowed-tools"] ?? e.disallowedTools);
}
//@ chunk-e6aww6q8.js:1663586-1663707 placement
var SKILL_NAME_LETTER_RE = /[\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}\p{Mn}\p{Mc}\p{Nd}]/u,
  CONNECTOR_PUNCTUATION_RE = /\p{Pc}/u,
  SKILL_NAMESPACE_PREFIXES = ["anthropic-skills:", "claude-ai:"];
//@ chunk-e6aww6q8.js:1663707-1663931 placement
function normalizeSkillName(e) {
  let n = "";
  for (let r of e.normalize("NFKC"))
    for (let s of r.normalize("NFKC"))
      if (s === " " || CONNECTOR_PUNCTUATION_RE.test(s)) n += "-";
      else if (s === "-" || SKILL_NAME_LETTER_RE.test(s)) n += s;
  return n
    .toLowerCase()
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
/**
 * 去掉开头的 / 与 anthropic-skills:/claude-ai: 前缀。
 */
//@ chunk-e6aww6q8.js:1663931-1664066 placement
function stripSkillNamespacePrefix(e) {
  let trimmed = e.trim(),
    r = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed,
    found = SKILL_NAMESPACE_PREFIXES.find((h) => r.startsWith(h));
  return found === void 0 ? r : r.slice(found.length);
}
/**
 * 技能名相等（含 name:name 形式）或规范化后相等。
 */
//@ chunk-e6aww6q8.js:1664066-1664236 placement
function skillNameMatches(e, n, r) {
  let lower = n.trim().toLowerCase();
  if (!lower) return !1;
  let lower_2 = e.trim().toLowerCase();
  if (lower_2 === lower || (r && `${lower_2}:${lower_2}` === lower)) return !0;
  let y = normalizeSkillName(n);
  return y !== "" && normalizeSkillName(lower_2) === y;
}
//@ chunk-e6aww6q8.js:1664266-1664362 placement
var PZt = 8388608,
  lXo = DoctorLazy(() => u({ skills: A(u({ name: o(), enabled: M() })) })),
  owe = { kind: "all-on" },
  dXo = 100;
//@ chunk-e6aww6q8.js:1664362-1664502 placement
async function listPluginSkillFilesSettled(e) {
  let n = join_66(e, "manifest.json"),
    r = await listPluginSkillFiles(n);
  if (!r.maybeMidWrite) return r.list;
  return (await sleep(dXo), (await listPluginSkillFiles(n)).list);
}
//@ chunk-e6aww6q8.js:1664502-1664672 placement
function computeDisabledSkills(e, n) {
  if (e.kind === "all-on") return new Set();
  let r = new Set(n),
    any = [...e.off].some((h) => !r.has(h));
  return new Set(n.filter((h) => e.off.has(h) || (any && !e.listed.has(h))));
}
//@ chunk-e6aww6q8.js:1664672-1665667 placement
async function listPluginSkillFiles(e) {
  let n;
  try {
    n = await getMcpAuthCache_2(e, PZt);
  } catch (error) {
    let w = getErrnoCode(error);
    return { list: skillListReadFailure(w), maybeMidWrite: w === "ENOENT" || isUnavailableErrorCode(w) };
  }
  switch (n.kind) {
    case "absent":
      return { list: n.code === "ENOENT" ? owe : skillListReadFailure(n.code), maybeMidWrite: !1 };
    case "refused":
      return {
        list: { kind: "unusable", code: "plugin_skill_list_not_regular_file", why: "is not a regular file" },
        maybeMidWrite: !1,
      };
    case "too-large":
      return {
        list: { kind: "unusable", code: "plugin_skill_list_too_large", why: `is larger than ${PZt} bytes` },
        maybeMidWrite: !1,
      };
    case "ok":
      break;
  }
  let r;
  try {
    r = jsonParse(n.content);
  } catch {
    return {
      list: { kind: "unusable", code: "plugin_skill_list_not_json", why: "is not JSON" },
      maybeMidWrite: !0,
    };
  }
  let safeParse = lXo().safeParse(r);
  if (!safeParse.success)
    return {
      list: {
        kind: "unusable",
        code: "plugin_skill_list_wrong_shape",
        why: "is not a list of skills that each have a name and an enabled flag",
      },
      maybeMidWrite: !1,
    };
  let h = new Set(),
    y = new Set();
  for (let skill of safeParse.data.skills) if ((y.add(skill.name), !skill.enabled)) h.add(skill.name);
  return { list: h.size === 0 ? owe : { kind: "some-off", off: h, listed: y }, maybeMidWrite: !1 };
}
//@ chunk-e6aww6q8.js:1665667-1665792 placement
function skillListReadFailure(e) {
  return {
    kind: "unusable",
    code: "plugin_skill_list_read_failed",
    why: `could not be read (${e ?? "no error code"})`,
  };
}
//@ chunk-e6aww6q8.js:1665792-1665808 placement
var sKe = 1048576;
//@ chunk-e6aww6q8.js:1665808-1666717 placement
function validatePluginCommandAllowedTools(e, n, r) {
  let {
    frontmatter: frontmatter,
    frontmatterAsWritten: frontmatterAsWritten,
    asWrittenProblem: asWrittenProblem,
    content: content,
    parseError: parseError,
  } = parseFrontmatter(n, e.filePath, { normalizeKeys: !0, untrusted: !0 });
  if (parseError !== void 0) return null;
  let L = applyCommandMetadataOverrides(frontmatter, e.config.metadata),
    joined = [L["allowed-tools"]]
      .flat()
      .filter((we) => typeof we === "string")
      .join(),
    q = { path: e.pluginPath, source: e.sourceName, dataDir: r },
    Z = joined.length + estimateSubstitutedGrowth(joined, q, e.filePath) > MAX_UNTRUSTED_FRONTMATTER_BYTES,
    Se = Z || needsUnknownDataDir(joined, q);
  if (Se)
    logForDebugging(
      `Plugin command ${e.commandName}: its allowed-tools are dropped: ${Z ? "filled in, they could be too long, or a folder they name holds a variable or a $" : "they name the plugin's data folder, which did not come with the plugin"}`,
      { level: "warn" },
    );
  let ke = {
    filePath: e.filePath,
    baseDir: e.baseDir,
    frontmatter: Se ? { ...L, "allowed-tools": "" } : L,
    skillFile: buildFrontmatterResult(frontmatterAsWritten, void 0, asWrittenProblem),
    content: Iv(getHostState().skillContentIntern, e.filePath, content),
  };
  return createPluginCommand(
    e.commandName,
    ke,
    e.sourceName,
    e.pluginManifest,
    e.pluginPath,
    e.provenance ?? {},
    e.isSkill,
    e.config,
    r,
  );
}
/**
 * 把 manifest commands 对象形式里的元数据（description、argumentHint、model、allowedTools）覆盖到 markdown frontmatter 上。
 */
//@ chunk-e6aww6q8.js:1666717-1666959 layout
function applyCommandMetadataOverrides(e, n) {
  if (n === void 0) return e;
  return {
    ...e,
    ...(n.description && { description: n.description }),
    ...(n.argumentHint && { "argument-hint": n.argumentHint }),
    ...(n.model && { model: n.model }),
    ...(n.allowedTools && { "allowed-tools": n.allowedTools.join(",") }),
  };
}
//@ chunk-e6aww6q8.js:1666959-1667143 layout
function getPluginTrustContext(e) {
  let marketplaceSource = e.marketplaceSource;
  return {
    officiallyAttested: e.officialAttestation !== void 0,
    marketplaceSource: marketplaceSource,
    npmResolution: e.npmResolution,
    ...(marketplaceSource !== void 0 && isLocalMarketplaceSource(marketplaceSource) && { home: homedir_6() }),
  };
}
/**
 * 文件名是否为 SKILL.md（忽略大小写）。
 */
//@ chunk-e6aww6q8.js:1667143-1667192 file-local
function isSkillFile_2(filePath) {
  return /^skill\.md$/i.test(basename_36(filePath));
}
//@ chunk-e6aww6q8.js:1667192-1667561 file-local
function getCommandNameFromFile(filePath, baseDir, pluginName) {
  if (isSkillFile_2(filePath)) {
    let isSkill = dirname_40(filePath),
      skillDirectory = dirname_40(isSkill),
      parentOfSkillDir = basename_36(isSkill),
      w = skillDirectory.startsWith(baseDir)
        ? skillDirectory.slice(baseDir.length).replace(/^[/\\]/, "")
        : "",
      L = w ? w.split(/[/\\]/).join(":") : "";
    return L ? `${pluginName}:${L}:${parentOfSkillDir}` : `${pluginName}:${parentOfSkillDir}`;
  } else {
    let fileDirectory = dirname_40(filePath),
      commandBaseName = basename_36(filePath).replace(/\.md$/, ""),
      S = fileDirectory.startsWith(baseDir) ? fileDirectory.slice(baseDir.length).replace(/^[/\\]/, "") : "",
      w = S ? S.split(/[/\\]/).join(":") : "";
    return w ? `${pluginName}:${w}:${commandBaseName}` : `${pluginName}:${commandBaseName}`;
  }
}
//@ chunk-e6aww6q8.js:1667561-1668178 fingerprint = collectMarkdownFiles (0.408)
async function collectMarkdownFiles(dirPath, baseDir, loadedPaths) {
  let files = [],
    fs = getFsImplementation();
  return (
    await walkPluginMarkdown(
      dirPath,
      async (fullPath) => {
        let S;
        try {
          let Z = await readSmallFileChecked(fs, fullPath, sKe);
          if (Z === null) {
            logForDebugging(
              `Skipping plugin command ${fullPath}: not a regular file or exceeds ${sKe} byte limit`,
              { level: "warn" },
            );
            return;
          }
          S = Z;
        } catch (error) {
          logForDebugging(`Failed to read plugin command ${fullPath}: ${error}`, { level: "error" });
          return;
        }
        let {
          frontmatter: frontmatter,
          frontmatterAsWritten: frontmatterAsWritten,
          asWrittenProblem: asWrittenProblem,
          content: content,
        } = parseFrontmatter(S, fullPath, { normalizeKeys: !0 });
        files.push({
          filePath: fullPath,
          baseDir: baseDir,
          frontmatter: frontmatter,
          skillFile: buildFrontmatterResult(frontmatterAsWritten, fullPath, asWrittenProblem),
          content: Iv(getHostState().skillContentIntern, fullPath, content),
        });
      },
      { stopAtSkillDir: !0, logLabel: "commands", loadedPaths: loadedPaths },
    ),
    files.sort((y, S) => y.filePath.localeCompare(S.filePath))
  );
}
//@ chunk-e6aww6q8.js:1668487-1668700 fingerprint = loadCommandsFromDirectory (1)
async function loadCommandsFromDirectory(e, n, r, s, h, y, S = { isSkillMode: !1 }, w = new Set()) {
  let markdownFiles = await collectMarkdownFiles(e, e, w),
    processedFiles = transformSkillFiles(markdownFiles),
    commands = [];
  for (let file of processedFiles) {
    let commandName = getCommandNameFromFile(file.filePath, file.baseDir, n),
      ke = createPluginCommand(commandName, file, r, s, h, y, isSkillFile_2(file.filePath), S);
    if (ke) commands.push(ke);
  }
  return commands;
}
/**
 * 由插件的 markdown 文件构造斜杠命令：命令名 <插件>:<相对路径>（技能目录用目录名），解析 frontmatter（description、allowed-tools、argument-hint、model、disable-model-invocation…），正文在调用时替换 $ARGUMENTS、${CLAUDE_PLUGIN_ROOT}、${user_config.X}。
 */
//@ chunk-e6aww6q8.js:1668700-1674044 fingerprint = createPluginCommand (0.643)
function createPluginCommand(e, n, r, s, h, y, S, w = { isSkillMode: !1 }, L) {
  if (y.marketplaceSource !== void 0) {
    let G = redactMarketplaceSource(y.marketplaceSource);
    if (G === null) {
      let { marketplaceSource: marketplaceSource, ...Z } = y;
      y = Z;
    } else y = { ...y, marketplaceSource: G };
  }
  if (y.npmResolution !== void 0) {
    let G = redactNpmTarball(y.npmResolution);
    if (G === null) {
      let { npmResolution: npmResolution, ...Z } = y;
      y = Z;
    } else if (G !== y.npmResolution) y = { ...y, npmResolution: G };
  }
  try {
    if (!$z(e)) return (reportRefusedSkillName(e, "is not offered"), null);
    let { frontmatter: frontmatter, content: content } = n,
      validatedDescription = coerceDescriptionToString(frontmatter.description, e),
      ke = dirname_40(n.filePath),
      we = (yo) => {
        let Ho = substitutePluginVariables(yo, {
          path: h,
          source: r,
          dataDir: L,
          ...(getToolsMachine() && { projectDir: null }),
        });
        if (w.isSkillMode) Ho = Ho.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => ke);
        return Ho;
      },
      Ee = frontmatter["allowed-tools"],
      Ae =
        typeof Ee === "string"
          ? we(Ee)
          : Array.isArray(Ee)
            ? Ee.map((tool) => (typeof tool === "string" ? we(tool) : tool))
            : Ee,
      allowedTools = parseSlashCommandToolsFromFrontmatter(Ae),
      filtered = allowedTools.filter((yo) => !yo.includes(PROJECT_DIR_PLACEHOLDER));
    if (filtered.length < allowedTools.length)
      logForDebugging(
        `Plugin command ${e}: loaded without ${allowedTools.length - filtered.length} of its allowed-tools entries, which name CLAUDE_PROJECT_DIR, because this process has no folder where the tools run`,
        { level: "warn" },
      );
    let We = twe(frontmatter),
      argumentNames = normalizeArgumentNames(frontmatter.arguments),
      {
        description: description,
        argumentHint: argumentHint,
        argumentNames: argumentNames_2,
        whenToUse: whenToUse,
      } = displaySkillFields({
        description:
          validatedDescription ??
          extractDescriptionFromMarkdown(content, S ? "Plugin skill" : "Plugin command"),
        argumentHint: frontmatter["argument-hint"] != null ? String(frontmatter["argument-hint"]) : void 0,
        argumentNames: argumentNames,
        whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : void 0,
      }),
      Et = frontmatter.version != null ? String(frontmatter.version) : void 0,
      yt = parseFrontmatterName(frontmatter.name, `plugin command ${e}`),
      sliced = e.slice(0, e.lastIndexOf(":") + 1),
      At = yt ? (yt.startsWith(sliced) ? yt : `${sliced}${yt}`) : e,
      It = yt && !yt.includes(":") ? (/\s/.test(yt) && B2() ? [yt, e.slice(sliced.length)] : [yt]) : void 0,
      Yt = !!yt && !(j7(yt) && j7(At)),
      model = frontmatter.model,
      Zt;
    if (typeof model === "string" && model.trim().length > 0) {
      let trimmed = model.trim();
      Zt = trimmed.toLowerCase() === "inherit" ? "inherit" : parseUserSpecifiedModel(trimmed);
    }
    let effort = frontmatter.effort,
      pn = effort !== void 0 ? parseEffortValue(effort) : void 0;
    if (effort !== void 0 && pn === void 0)
      logForDebugging(
        `Plugin command ${e} has invalid effort '${effort}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
      );
    let disableModelInvocation = parseBooleanFrontmatter(frontmatter["disable-model-invocation"]),
      hn = frontmatter["user-invocable"],
      ho = hn === void 0 ? !0 : parseBooleanFrontmatter(hn),
      yn,
      shell = directoryPluginFallbackName(h, SYNCED);
    if (ho && !(S && Yt) && marketplaceSuffix(r) === SYNCED && LCt(shell)) {
      let yo = dirname_40(n.filePath),
        Ho = S
          ? normalizeSkillName(yt?.trim() || (yo === h ? shell : basename_36(yo)))
          : e.slice(e.indexOf(":") + 1),
        rr = `${shell}:${Ho}`;
      if (Ho !== "" && rr !== e && rr !== At) yn = rr;
    }
    let Xn = parseShellFrontmatter(frontmatter.shell, e),
      fo,
      To = !1,
      bo = hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS),
      vn =
        !(S || w.isSkillMode) &&
        frontmatter.hooks !== void 0 &&
        frontmatter.hooks !== null &&
        (typeof frontmatter.hooks !== "object" ||
          (Array.isArray(frontmatter.hooks) &&
            frontmatter.hooks.some((hook) => !hook || typeof hook !== "object")) ||
          hasGuardHooks_2(frontmatter.hooks) ||
          containsHooks(frontmatter.hooks));
    if (bo || vn)
      ((To = !0),
        logForDebugging(
          `Plugin skill '${e}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
          { level: "error" },
        ));
    else if ((S || w.isSkillMode) && frontmatter.hooks) {
      let rawSkillDir = validateHooksSetting(frontmatter.hooks);
      for (let note of rawSkillDir.notes) logForDebugging(`Plugin skill '${e}': ${note}`, { level: "warn" });
      let safeParse = HooksSchema().safeParse(frontmatter.hooks);
      if (rawSkillDir.unloadableGuards.length > 0 || !safeParse.success)
        ((To = !0),
          logForDebugging(
            `Plugin skill '${e}': ${rawSkillDir.unloadableGuards.join("; ") || safeParse.error?.message || "hooks unreadable"} \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
            { level: "error" },
          ));
      else fo = safeParse.data;
    }
    let co = fo !== void 0 && hasGuardHooks_2(fo) && shouldSkipSessionHooksByPolicy(),
      So = !To && !co,
      ko = So ? filtered : [],
      un = !1,
      ao = () => {
        let yo = shouldLoadPermissionRules(fo, r) ? [] : ($o.allowedTools ?? []),
          Ho = yo.length === 0 ? void 0 : frontmatterToolGrantWithheldReason("plugin", { id: r, ...y });
        if (Ho === void 0) return ((un = !1), yo);
        if (!un) ((un = !0), reportIgnoredFrontmatterToolGrants(e, { pluginId: r }, yo, Ho));
        return [];
      },
      $o = {
        type: "prompt",
        name: e,
        description: description,
        hasUserSpecifiedDescription: validatedDescription !== null,
        allowedTools: ko,
        ...(So && allowedTools.length > 0 && { getAllowedTools: async () => ao() }),
        disallowedTools: We.length > 0 ? We : void 0,
        argumentHint: argumentHint,
        argNames: argumentNames_2.length > 0 ? argumentNames_2 : void 0,
        whenToUse: whenToUse,
        version: Et,
        model: Zt,
        effort: pn,
        context: frontmatter.context === "fork" ? "fork" : void 0,
        agent: frontmatter.agent != null ? String(frontmatter.agent) : void 0,
        background: parseBooleanishFrontmatter(frontmatter.background),
        disableModelInvocation: disableModelInvocation,
        userInvocable: ho,
        declaredFields: getDeclaredFrontmatterFields(frontmatter),
        metadata: isPlainObject_4(frontmatter.metadata) ? frontmatter.metadata : void 0,
        contentLength: content.length,
        source: "plugin",
        loadedFrom: S || w.isSkillMode ? "plugin" : void 0,
        hooks: fo,
        skillRoot: (S || w.isSkillMode) && fo ? h : void 0,
        skillDir: S || w.isSkillMode ? dirname_40(n.filePath) : void 0,
        skillFile: n.skillFile,
        pluginInfo: {
          pluginManifest: s,
          repository: r,
          ...(y.officiallyAttested && { officiallyAttested: !0 }),
          ...(y.marketplaceSource && { marketplaceSource: y.marketplaceSource }),
          ...(y.npmResolution && { npmResolution: y.npmResolution }),
          ...(y.home !== void 0 && { home: y.home }),
        },
        pluginSource: {
          commandName: e,
          filePath: n.filePath,
          baseDir: n.baseDir,
          sourceName: r,
          pluginManifest: s,
          pluginPath: h,
          provenance: y,
          isSkill: S,
          config: w,
        },
        serverAttribution: w.serverAttribution,
        isHidden: !ho,
        progressMessage: S || w.isSkillMode ? "loading" : "running",
        userFacingName() {
          return At;
        },
        aliases: Yt ? void 0 : It,
        shedAliases: Yt ? It : void 0,
        ...(yn !== void 0 && { directoryListingName: yn }),
        async getPromptForCommand(args, context) {
          let rr = w.isSkillMode
              ? `Base directory for this skill: ${dirname_40(n.filePath)}

${content}`
              : content,
            br = KVs.get();
          if (br !== void 0) rr = await br(rr, { isPreload: context.options.isSkillPreload === !0 });
          let Hr = s.userConfig ? await loadPluginOptions(r, context.credentials) : void 0,
            Fr = getEffortLevelOrHigh(
              inlineSkillModelOverride(Zt) ?? context.options.mainLoopModel,
              getEffortValue(context),
              pn ?? getEffortLayerOverride(context.permissionLayers),
            ),
            cs = {
              pluginPath: h,
              sourceName: r,
              pluginDataDir: L,
              userConfig: s.userConfig,
              options: Hr,
              skillDir: w.isSkillMode ? ke : void 0,
              effortLevel: Fr,
            };
          if (
            ((rr = substituteArguments(
              rr,
              args,
              !0,
              argumentNames,
              (_r) => xM(substituteSkillVariables(_r, cs)),
              (_r, Cr) => substituteSkillVariables(_r, cs, Cr),
            )),
            isSkillShellExecutionDisabled())
          )
            rr = replacePromptShellCommands(rr);
          else
            rr = await executeShellCommandsInPrompt(
              rr,
              { ...context, getAppState: withCommandAllowRules(context, ao()) },
              `/${e}`,
              Xn,
              r,
            );
          return [{ type: "text", text: rr }];
        },
      };
    if (Yt) (reportRefusedSkillName(At, `is not shown for ${e}`), clearUserFacingName($o));
    return $o;
  } catch (error) {
    return (
      logForDebugging(`Failed to create command from ${n.filePath}: ${error}`, { level: "error" }),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:1674044-1674355 layout
function copySyncedSkillFlags(e, n) {
  if (n.serverPluginId !== void 0) e.serverPluginId = n.serverPluginId;
  if (n.marketplaceKind !== void 0) e.marketplaceKind = n.marketplaceKind;
  if (n.accountSkillsWrapper) e.accountSkillsWrapper = !0;
  if (n.hostNamedSkillsFolder) e.hostNamedSkillsFolder = !0;
  if (n.followsSyncedSkillState) e.followsSyncedSkillState = !0;
}
/**
 * 加载所有启用插件的命令（commands/ 目录与 manifest.commands），结果缓存在全局 commands。
 */
//@ chunk-e6aww6q8.js:1674355-1677759 fingerprint = getPluginCommands (0.756)
function getPluginCommands(e) {
  let n = getPluginRegistry();
  return (
    (n.commands ??= (async () => {
      if (
        isCustomizationDisabled("plugins", {
          explicitlyRequested:
            n.handedIn !== void 0 ||
            getInlinePlugins().length > 0 ||
            getInlinePluginsNoMcp().length > 0 ||
            getInlinePluginUrls().length > 0,
        })
      )
        return [];
      if (n.handedIn !== void 0) return (await n.handedIn).commands;
      let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(e);
      if (errors.length > 0)
        logForDebugging(`Plugin loading errors: ${errors.map((w) => pluginErrorText(w)).join(", ")}`);
      let h = null,
        flat = (
          await Promise.all(
            enabled.map(async (plugin) => {
              let loadedPaths = new Set(),
                pluginCommands = [];
              if (plugin.commandsPath)
                try {
                  let q = await loadCommandsFromDirectory(
                    plugin.commandsPath,
                    plugin.name,
                    plugin.source,
                    plugin.manifest,
                    plugin.path,
                    getPluginTrustContext(plugin),
                    { isSkillMode: !1 },
                    loadedPaths,
                  );
                  if ((pluginCommands.push(...q), q.length > 0))
                    logForDebugging(
                      `Loaded ${q.length} commands from plugin ${plugin.name} default directory`,
                    );
                } catch (error) {
                  ((h = "plugin_load_commands_dir_failed"),
                    logForDebugging(
                      `Failed to load commands from plugin ${plugin.name} default directory: ${error}`,
                      { level: "error" },
                    ));
                }
              if (plugin.commandsPaths) {
                logForDebugging(
                  `Plugin ${plugin.name} has commandsPaths: ${plugin.commandsPaths.join(", ")}`,
                );
                let pathResults = await Promise.all(
                  plugin.commandsPaths.map(async (commandPath) => {
                    try {
                      let fs = getFsImplementation(),
                        stats = await fs.stat(commandPath);
                      if (
                        (logForDebugging(
                          `Checking commandPath ${commandPath} - isDirectory: ${stats.isDirectory()}, isFile: ${stats.isFile()}`,
                        ),
                        stats.isDirectory())
                      ) {
                        let we = await loadCommandsFromDirectory(
                          commandPath,
                          plugin.name,
                          plugin.source,
                          plugin.manifest,
                          plugin.path,
                          getPluginTrustContext(plugin),
                          { isSkillMode: !1 },
                          loadedPaths,
                        );
                        if (we.length > 0)
                          logForDebugging(
                            `Loaded ${we.length} commands from plugin ${plugin.name} custom path: ${commandPath}`,
                          );
                        else
                          logForDebugging(
                            `Warning: No commands found in plugin ${plugin.name} custom directory: ${commandPath}. Expected .md files or SKILL.md in subdirectories.`,
                            { level: "warn" },
                          );
                        return we;
                      } else if (stats.isFile() && commandPath.endsWith(".md")) {
                        if (isDuplicatePath(fs, commandPath, loadedPaths)) return [];
                        let we = await readSmallFileChecked(fs, commandPath, sKe);
                        if (we === null)
                          return (
                            logForDebugging(
                              `Skipping plugin command ${commandPath}: exceeds ${sKe} byte limit`,
                              { level: "warn" },
                            ),
                            []
                          );
                        let {
                            frontmatter: frontmatter,
                            frontmatterAsWritten: frontmatterAsWritten,
                            asWrittenProblem: asWrittenProblem,
                            content: content,
                          } = parseFrontmatter(we, commandPath, { normalizeKeys: !0 }),
                          We,
                          ze;
                        if (plugin.commandsMetadata) {
                          for (let [nt, pt] of Object.entries(plugin.commandsMetadata))
                            if (pt.source) {
                              let fullMetadataPath = join_65(plugin.path, pt.source);
                              if (commandPath === fullMetadataPath) {
                                ((We = `${plugin.name}:${nt}`), (ze = pt));
                                break;
                              }
                            }
                        }
                        if (!We) We = `${plugin.name}:${basename_36(commandPath).replace(/\.md$/, "")}`;
                        let lt = {
                            filePath: commandPath,
                            baseDir: dirname_40(commandPath),
                            frontmatter: applyCommandMetadataOverrides(frontmatter, ze),
                            skillFile: buildFrontmatterResult(
                              frontmatterAsWritten,
                              commandPath,
                              asWrittenProblem,
                            ),
                            content: Iv(getHostState().skillContentIntern, commandPath, content),
                          },
                          Je = createPluginCommand(
                            We,
                            lt,
                            plugin.source,
                            plugin.manifest,
                            plugin.path,
                            getPluginTrustContext(plugin),
                            !1,
                            { isSkillMode: !1, metadata: ze },
                          );
                        if (Je)
                          return (
                            logForDebugging(
                              `Loaded command from plugin ${plugin.name} custom file: ${commandPath}${ze ? " (with metadata override)" : ""}`,
                            ),
                            [Je]
                          );
                      }
                      return [];
                    } catch (error) {
                      return (
                        (h = "plugin_load_commands_path_failed"),
                        logForDebugging(
                          `Failed to load commands from plugin ${plugin.name} custom path ${commandPath}: ${error}`,
                          { level: "error" },
                        ),
                        []
                      );
                    }
                  }),
                );
                for (let commands of pathResults) pluginCommands.push(...commands);
              }
              if (plugin.commandsMetadata) {
                for (let [q, Z] of Object.entries(plugin.commandsMetadata))
                  if (Z.content && !Z.source)
                    try {
                      let {
                          frontmatter: frontmatter,
                          frontmatterAsWritten: frontmatterAsWritten,
                          asWrittenProblem: asWrittenProblem,
                          content: content,
                        } = parseFrontmatter(Z.content, `<inline:${plugin.name}:${q}>`, {
                          normalizeKeys: !0,
                        }),
                        Ae = `${plugin.name}:${q}`,
                        commandName = `<inline:${Ae}>`,
                        Me = {
                          filePath: commandName,
                          baseDir: plugin.path,
                          frontmatter: applyCommandMetadataOverrides(frontmatter, Z),
                          skillFile: buildFrontmatterResult(frontmatterAsWritten, void 0, asWrittenProblem),
                          content: Iv(getHostState().skillContentIntern, commandName, content),
                        },
                        We = createPluginCommand(
                          Ae,
                          Me,
                          plugin.source,
                          plugin.manifest,
                          plugin.path,
                          getPluginTrustContext(plugin),
                          !1,
                          { isSkillMode: !1, metadata: Z },
                        );
                      if (We)
                        (pluginCommands.push(We),
                          logForDebugging(`Loaded inline content command from plugin ${plugin.name}: ${Ae}`));
                    } catch (error) {
                      ((h = "plugin_load_commands_inline_failed"),
                        logForDebugging(
                          `Failed to load inline content command ${q} from plugin ${plugin.name}: ${error}`,
                          { level: "error" },
                        ));
                    }
              }
              if (
                plugin.serverPluginId !== void 0 ||
                plugin.marketplaceKind !== void 0 ||
                plugin.accountSkillsWrapper
              ) {
                for (let q of pluginCommands)
                  if (q.type === "prompt" && q.pluginInfo !== void 0)
                    copySyncedSkillFlags(q.pluginInfo, plugin);
              }
              return pluginCommands;
            }),
          )
        ).flat();
      if ((logForDebugging(`Total plugin commands loaded: ${flat.length}`), h))
        logFeatureBad("plugin_load_commands", h);
      else logFeatureOk("plugin_load_commands");
      return flat;
    })()),
    n.commands
  );
}
//@ chunk-e6aww6q8.js:1677759-1677969 layout
async function realpathForDedupe(e) {
  try {
    return await realpath_22(e);
  } catch (error) {
    return (
      logForDebugging(
        `Could not resolve ${e} to de-duplicate it across plugins (${errorMessage(error)}); keeping the skill without cross-plugin de-duplication`,
        { level: "warn" },
      ),
      null
    );
  }
}
/**
 * 扫描插件的技能目录：根 SKILL.md 或子目录 <name>/SKILL.md，每个技能生成一个命令（技能模式）。
 */
//@ chunk-e6aww6q8.js:1677969-1680227 fingerprint = loadSkillsFromDirectory (0.479)
async function loadSkillsFromDirectory(e, n, r, s, h, y, S, w) {
  let fs = getFsImplementation(),
    skills = [],
    q = isSkillAttributionEnabled(),
    directSkillPath = join_65(e, "SKILL.md"),
    directSkillContent = null;
  try {
    if (
      ((directSkillContent = await readSmallFileChecked(fs, directSkillPath, sKe)),
      directSkillContent === null)
    )
      logForDebugging(
        `Skipping plugin skill ${directSkillPath}: not a regular file or exceeds ${sKe} byte limit`,
        { level: "warn" },
      );
  } catch (error) {
    if (!isENOENT(error))
      return (
        logForDebugging(`Failed to load skill from ${directSkillPath}: ${error}`, { level: "error" }),
        skills
      );
  }
  if (directSkillContent !== null) {
    if (computeDisabledSkills(w, [basename_36(e)]).size > 0 || isDuplicatePath(fs, directSkillPath, S))
      return skills;
    try {
      let {
          frontmatter: frontmatter,
          frontmatterAsWritten: frontmatterAsWritten,
          asWrittenProblem: asWrittenProblem,
          content: content,
        } = parseFrontmatter(directSkillContent, directSkillPath, { normalizeKeys: !0 }),
        ze = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "",
        replaced = ((ze.startsWith(`${n}:`) ? ze.slice(n.length + 1) : ze) || basename_36(e)).replace(
          /[^a-zA-Z0-9_-]/g,
          "-",
        ),
        skillName = `${n}:${replaced}`,
        pt = {
          filePath: directSkillPath,
          baseDir: dirname_40(directSkillPath),
          frontmatter: frontmatter,
          skillFile: buildFrontmatterResult(frontmatterAsWritten, directSkillPath, asWrittenProblem),
          content: Iv(getHostState().skillContentIntern, directSkillPath, content),
        },
        Et = createPluginCommand(skillName, pt, r, s, h, y, !0, {
          isSkillMode: !0,
          serverAttribution: q(pt.baseDir),
        });
      if (Et) skills.push({ skill: Et, realpath: await realpathForDedupe(directSkillPath) });
    } catch (error) {
      logForDebugging(`Failed to load skill from ${directSkillPath}: ${error}`, { level: "error" });
    }
    return skills;
  }
  let ke;
  try {
    ke = await fs.readdir(e);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to load skills from directory ${e}: ${error}`, { level: "error" });
    return skills;
  }
  let filtered = ke.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()),
    skillDirPath = computeDisabledSkills(
      w,
      filtered.map((Ae) => Ae.name),
    );
  if (skillDirPath.size > 0)
    logForDebugging(
      `Leaving out ${skillDirPath.size} of ${filtered.length} skill folders of plugin ${n}: switched off in its manifest.json, or not listed there while a switched-off entry names no folder`,
    );
  return (
    await Promise.all(
      filtered.map(async (Ae) => {
        if (skillDirPath.has(Ae.name)) return;
        let Ie = join_65(e, Ae.name),
          skillFilePath = join_65(Ie, "SKILL.md"),
          We;
        try {
          let ze = await readSmallFileChecked(fs, skillFilePath, sKe);
          if (ze === null) {
            logForDebugging(
              `Skipping plugin skill ${skillFilePath}: not a regular file or exceeds ${sKe} byte limit`,
              { level: "warn" },
            );
            return;
          }
          We = ze;
        } catch (error) {
          if (!isENOENT(error))
            logForDebugging(`Failed to load skill from ${skillFilePath}: ${error}`, { level: "error" });
          return;
        }
        if (isDuplicatePath(fs, skillFilePath, S)) return;
        try {
          let {
              frontmatter: frontmatter,
              frontmatterAsWritten: frontmatterAsWritten,
              asWrittenProblem: asWrittenProblem,
              content: content,
            } = parseFrontmatter(We, skillFilePath, { normalizeKeys: !0 }),
            skillName = `${n}:${Ae.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
            Et = {
              filePath: skillFilePath,
              baseDir: dirname_40(skillFilePath),
              frontmatter: frontmatter,
              skillFile: buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
              content: Iv(getHostState().skillContentIntern, skillFilePath, content),
            },
            yt = createPluginCommand(skillName, Et, r, s, h, y, !0, {
              isSkillMode: !0,
              serverAttribution: q(Et.baseDir),
            });
          if (yt) skills.push({ skill: yt, realpath: await realpathForDedupe(skillFilePath) });
        } catch (error) {
          logForDebugging(`Failed to load skill from ${skillFilePath}: ${error}`, { level: "error" });
        }
      }),
    ),
    skills.sort((Ae, Ie) => Ae.skill.name.localeCompare(Ie.skill.name))
  );
}
/**
 * 加载所有启用插件的技能（skills/ 与 manifest.skills），按真实路径跨插件去重。
 */
//@ chunk-e6aww6q8.js:1680227-1682147 fingerprint = getPluginSkills (0.792)
async function getPluginSkills(e) {
  let { enabled: enabled, errors: errors } = await loadAllPluginsCacheOnly(e);
  if (errors.length > 0)
    logForDebugging(`Plugin loading errors: ${errors.map((w) => pluginErrorText(w)).join(", ")}`);
  logForDebugging(`getPluginSkills: Processing ${enabled.length} enabled plugins`);
  let s = null,
    h = new Map(),
    perPluginSkills = await Promise.all(
      enabled.map(async (plugin) => {
        let loadedPaths = new Set(),
          pluginSkills = [];
        logForDebugging(
          `Checking plugin ${plugin.name}: skillsPath=${plugin.skillsPath ? "exists" : "none"}, skillsPaths=${plugin.skillsPaths ? plugin.skillsPaths.length : 0} paths`,
        );
        let q =
          plugin.accountSkillsWrapper && desktopSkillSwitches()
            ? await listPluginSkillFilesSettled(plugin.path)
            : owe;
        if (q.kind === "unusable")
          return (
            h.set(plugin, q.code),
            logForDebugging(
              `Loading no skills from plugin ${plugin.name}: the manifest.json at its root ${q.why}, so it does not say which skills are switched off`,
              { level: "warn" },
            ),
            pluginSkills
          );
        if (plugin.skillsPath) {
          logForDebugging(
            `Attempting to load skills from plugin ${plugin.name} default skillsPath: ${plugin.skillsPath}`,
          );
          try {
            let Z = await loadSkillsFromDirectory(
              plugin.skillsPath,
              plugin.name,
              plugin.source,
              plugin.manifest,
              plugin.path,
              getPluginTrustContext(plugin),
              loadedPaths,
              q,
            );
            (pluginSkills.push(...Z),
              logForDebugging(`Loaded ${Z.length} skills from plugin ${plugin.name} default directory`));
          } catch (error) {
            ((s = "plugin_load_skills_dir_failed"),
              logForDebugging(
                `Failed to load skills from plugin ${plugin.name} default directory: ${error}`,
                { level: "error" },
              ));
          }
        }
        if (plugin.skillsPaths) {
          logForDebugging(
            `Attempting to load skills from plugin ${plugin.name} skillsPaths: ${plugin.skillsPaths.join(", ")}`,
          );
          let pathResults = await Promise.all(
            plugin.skillsPaths.map(async (skillPath) => {
              try {
                logForDebugging(`Loading from skillPath: ${skillPath} for plugin ${plugin.name}`);
                let ke = await loadSkillsFromDirectory(
                  skillPath,
                  plugin.name,
                  plugin.source,
                  plugin.manifest,
                  plugin.path,
                  getPluginTrustContext(plugin),
                  loadedPaths,
                  q,
                );
                return (
                  logForDebugging(
                    `Loaded ${ke.length} skills from plugin ${plugin.name} custom path: ${skillPath}`,
                  ),
                  ke
                );
              } catch (error) {
                return (
                  (s = "plugin_load_skills_path_failed"),
                  logForDebugging(
                    `Failed to load skills from plugin ${plugin.name} custom path ${skillPath}: ${error}`,
                    { level: "error" },
                  ),
                  []
                );
              }
            }),
          );
          for (let skills of pathResults) pluginSkills.push(...skills);
        }
        if (
          plugin.serverPluginId !== void 0 ||
          plugin.marketplaceKind !== void 0 ||
          plugin.accountSkillsWrapper ||
          plugin.followsSyncedSkillState
        ) {
          for (let Z of pluginSkills)
            if (Z.skill.type === "prompt" && Z.skill.pluginInfo !== void 0)
              copySyncedSkillFlags(Z.skill.pluginInfo, plugin);
        }
        return pluginSkills;
      }),
    ),
    found = enabled.map((w) => h.get(w)).find((w) => w !== void 0);
  return { entries: perPluginSkills.flat(), hadErrorCode: found ?? s };
}
//@ chunk-e6aww6q8.js:1682147-1683072 placement
function loadPluginSkills(e) {
  let n = getPluginRegistry(),
    r = isStorageV5Enabled() && e !== void 0 ? "skillsV5" : "skills";
  return (
    (n[r] ??= (async () => {
      if (
        isCustomizationDisabled("plugins", {
          explicitlyRequested:
            n.handedIn !== void 0 ||
            getInlinePlugins().length > 0 ||
            getInlinePluginsNoMcp().length > 0 ||
            getInlinePluginUrls().length > 0,
        })
      )
        return [];
      if (n.handedIn !== void 0) return (await n.handedIn).skills;
      let [{ entries: s, hadErrorCode: h }, y] = await Promise.all([
          getPluginSkills(e),
          getUserSkillFileIds(e),
        ]),
        S = new Map(),
        w = [];
      for (let L of s) {
        let realpath = L.realpath;
        if (realpath === null) {
          w.push(L.skill);
          continue;
        }
        if (y !== null && y.has(realpath)) {
          logForDebugging(
            `Skipping plugin skill '${L.skill.name}' \u2014 ${realpath} is a user-level skill already surfaced by the skills directory loader`,
          );
          continue;
        }
        let q = S.get(realpath);
        if (q !== void 0) {
          logForDebugging(
            `Skipping duplicate plugin skill '${L.skill.name}' \u2014 ${realpath} already loaded as '${q}'`,
          );
          continue;
        }
        (S.set(realpath, L.skill.name), w.push(L.skill));
      }
      if (
        (logForDebugging(
          `Total plugin skills loaded: ${w.length} (${s.length - w.length} duplicate/user-owned entries skipped)`,
        ),
        h)
      )
        logFeatureBad("plugin_load_skills", h);
      else logFeatureOk("plugin_load_skills");
      return w;
    })()),
    n[r]
  );
}
/**
 * 替换命令/技能内容里的变量：插件路径/来源/数据目录、${CLAUDE_SKILL_DIR}、${CLAUDE_SESSION_ID}、${CLAUDE_EFFORT}， 有用户配置时再替换 user_config 值。r 用于对替换值转义。
 */
//@ chunk-e6aww6q8.js:1683072-1683472 placement
function substituteSkillVariables(e, n, r = (s) => s) {
  let s = substitutePluginVariables(
    e,
    { path: n.pluginPath, source: n.sourceName, dataDir: n.pluginDataDir },
    r,
  );
  if (n.skillDir !== void 0) {
    let S = r(n.skillDir);
    s = s.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => S);
  }
  let h = r(getSessionId());
  s = s.replace(/\$\{CLAUDE_SESSION_ID\}/g, () => h);
  let y = r(n.effortLevel);
  if (((s = s.replaceAll("${CLAUDE_EFFORT}", () => y)), n.userConfig && n.options))
    s = substituteUserConfigInContent(s, n.options, n.userConfig, (S) => r(xM(S)));
  return s;
}

export {
  getPluginCommands,
  skillNameMatches,
  stripSkillNamespacePrefix,
  loadPluginSkills,
  validatePluginCommandAllowedTools,
  sKe,
  isSkillFile_2,
  twe,
  Iv,
};
