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
import { join, basename, dirname } from "path";
import { homedir } from "os";
import { realpath } from "fs/promises";
import {
  parseSlashCommandToolsFromFrontmatter,
  extractDescriptionFromMarkdown,
} from "../markdownConfigLoader.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
  isSkillFilePathOrIdentifier,
  normalizeArgumentNames,
  isSkillPathEligible,
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
import { areSkillsConvertedAsPlugins } from "../permissions/permissionRulePayload.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { parseEffortValue, EFFORT_LEVELS, getEffortLevelOrHigh } from "../effort.js";
import { directoryPluginFallbackName, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { SYNCED } from "../telemetry/pluginTelemetry.js";
import { marketplaceSuffix } from "./pluginIdentifier.js";
import { isUuid } from "./syncedItems.js";
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
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { skillWatchStateSlot } from "../../skills/skillChangeWatch.js";
import { inlineSkillModelOverride } from "../model/model.js";
import { getEffortValue, getEffortLayerOverride } from "../permissions/toolPermissionContext.js";
import { substituteArguments } from "../argumentSubstitution.js";
import {
  escapeShellBangs,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1663434-1663518 placement
/**
 * memoizeLastValue：记录并复用同一键的上次结果。
 */
function memoizeLastValue(skillContentIntern, key, content) {
  let cachedContent = skillContentIntern.get(key);
  if (cachedContent !== undefined && cachedContent === content) return cachedContent;
  skillContentIntern.set(key, content);
  return content;
}
//@ chunk-e6aww6q8.js:1663518-1663586 placement
/**
 * frontmatterDisallowedTools：从前置声明取 disallowed-tools。
 */
function frontmatterDisallowedTools(frontmatter) {
  return parseSlashCommandToolsFromFrontmatter(
    frontmatter["disallowed-tools"] ?? frontmatter.disallowedTools,
  );
}
//@ chunk-e6aww6q8.js:1663586-1663707 placement
var SKILL_NAME_LETTER_RE = /[\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}\p{Mn}\p{Mc}\p{Nd}]/u;
var CONNECTOR_PUNCTUATION_RE = /\p{Pc}/u;
var SKILL_NAMESPACE_PREFIXES = ["anthropic-skills:", "claude-ai:"];
//@ chunk-e6aww6q8.js:1663707-1663931 placement
function normalizeSkillName(input) {
  let normalized = "";
  for (let char of input.normalize("NFKC"))
    for (let codePoint of char.normalize("NFKC"))
      if (codePoint === " " || CONNECTOR_PUNCTUATION_RE.test(codePoint)) normalized += "-";
      else if (codePoint === "-" || SKILL_NAME_LETTER_RE.test(codePoint)) normalized += codePoint;
  return normalized
    .toLowerCase()
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
//@ chunk-e6aww6q8.js:1663931-1664066 placement
/**
 * 去掉开头的 / 与 anthropic-skills:/claude-ai: 前缀。
 */
function stripSkillNamespacePrefix(raw) {
  let trimmed = raw.trim();
  let withoutSlash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  let found = SKILL_NAMESPACE_PREFIXES.find((prefix) => withoutSlash.startsWith(prefix));
  return found === undefined ? withoutSlash : withoutSlash.slice(found.length);
}
//@ chunk-e6aww6q8.js:1664066-1664236 placement
/**
 * 技能名相等（含 name:name 形式）或规范化后相等。
 */
function skillNameMatches(name, candidate, allowDouble) {
  let lower = candidate.trim().toLowerCase();
  if (!lower) return false;
  let lower_2 = name.trim().toLowerCase();
  if (lower_2 === lower || (allowDouble && `${lower_2}:${lower_2}` === lower)) return true;
  let normalizedCandidate = normalizeSkillName(candidate);
  return normalizedCandidate !== "" && normalizeSkillName(lower_2) === normalizedCandidate;
}
//@ chunk-e6aww6q8.js:1664266-1664362 placement
var MAX_PLUGIN_SKILLS_FILE_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pluginSkillsConfigSchema;
var ALL_SKILLS_ON;
var MAX_PLUGIN_COMMAND_VARIANTS;
deferInit("chunk-e6aww6q8.js:1664266", () => {
  MAX_PLUGIN_SKILLS_FILE_BYTES = 8388608;
  pluginSkillsConfigSchema = DoctorLazy(() =>
    objectSchema({
      skills: array(
        objectSchema({
          name: stringSchema(),
          enabled: booleanSchema(),
        }),
      ),
    }),
  );
  ALL_SKILLS_ON = {
    kind: "all-on",
  };
  MAX_PLUGIN_COMMAND_VARIANTS = 100;
});
//@ chunk-e6aww6q8.js:1664362-1664502 placement
async function listPluginSkillFilesSettled(path) {
  let manifestPath = join(path, "manifest.json");
  let first = await listPluginSkillFiles(manifestPath);
  if (!first.maybeMidWrite) return first.list;
  await sleep(MAX_PLUGIN_COMMAND_VARIANTS);
  return (await listPluginSkillFiles(manifestPath)).list;
}
//@ chunk-e6aww6q8.js:1664502-1664672 placement
function computeDisabledSkills(config, names) {
  if (config.kind === "all-on") return new Set();
  let listedNames = new Set(names);
  let any = [...config.off].some((offName) => !listedNames.has(offName));
  return new Set(names.filter((name) => config.off.has(name) || (any && !config.listed.has(name))));
}
//@ chunk-e6aww6q8.js:1664672-1665667 placement
async function listPluginSkillFiles(manifestPath) {
  let fileInfo;
  try {
    fileInfo = await getMcpAuthCache_2(manifestPath, MAX_PLUGIN_SKILLS_FILE_BYTES);
  } catch (error) {
    let code = getErrnoCode(error);
    return {
      list: skillListReadFailure(code),
      maybeMidWrite: code === "ENOENT" || isUnavailableErrorCode(code),
    };
  }
  switch (fileInfo.kind) {
    case "absent":
      return {
        list: fileInfo.code === "ENOENT" ? ALL_SKILLS_ON : skillListReadFailure(fileInfo.code),
        maybeMidWrite: false,
      };
    case "refused":
      return {
        list: {
          kind: "unusable",
          code: "plugin_skill_list_not_regular_file",
          why: "is not a regular file",
        },
        maybeMidWrite: false,
      };
    case "too-large":
      return {
        list: {
          kind: "unusable",
          code: "plugin_skill_list_too_large",
          why: `is larger than ${MAX_PLUGIN_SKILLS_FILE_BYTES} bytes`,
        },
        maybeMidWrite: false,
      };
    case "ok":
      break;
  }
  let parsed;
  try {
    parsed = jsonParse(fileInfo.content);
  } catch {
    return {
      list: {
        kind: "unusable",
        code: "plugin_skill_list_not_json",
        why: "is not JSON",
      },
      maybeMidWrite: true,
    };
  }
  let parseResult = pluginSkillsConfigSchema().safeParse(parsed);
  if (!parseResult.success)
    return {
      list: {
        kind: "unusable",
        code: "plugin_skill_list_wrong_shape",
        why: "is not a list of skills that each have a name and an enabled flag",
      },
      maybeMidWrite: false,
    };
  let offSkills = new Set();
  let allSkills = new Set();
  for (let skill of parseResult.data.skills) {
    allSkills.add(skill.name);
    if (!skill.enabled) offSkills.add(skill.name);
  }
  return {
    list:
      offSkills.size === 0
        ? ALL_SKILLS_ON
        : {
            kind: "some-off",
            off: offSkills,
            listed: allSkills,
          },
    maybeMidWrite: false,
  };
}
//@ chunk-e6aww6q8.js:1665667-1665792 placement
function skillListReadFailure(code) {
  return {
    kind: "unusable",
    code: "plugin_skill_list_read_failed",
    why: `could not be read (${code ?? "no error code"})`,
  };
}
//@ chunk-e6aww6q8.js:1665792-1665808 placement
/**
 * MAX_PLUGIN_COMMAND_FILE_BYTES：插件命令文件体积上限。
 */
var MAX_PLUGIN_COMMAND_FILE_BYTES = 1048576;
//@ chunk-e6aww6q8.js:1665808-1666717 placement
function validatePluginCommandAllowedTools(source, text, pluginDataDir) {
  let { frontmatter, frontmatterAsWritten, asWrittenProblem, content, parseError } = parseFrontmatter(
    text,
    source.filePath,
    {
      normalizeKeys: true,
      untrusted: true,
    },
  );
  if (parseError !== undefined) return null;
  let mergedFrontmatter = applyCommandMetadataOverrides(frontmatter, source.config.metadata);
  let joined = [mergedFrontmatter["allowed-tools"]]
    .flat()
    .filter((value) => typeof value === "string")
    .join();
  let substitutionContext = {
    path: source.pluginPath,
    source: source.sourceName,
    dataDir: pluginDataDir,
  };
  let tooLong =
    joined.length + estimateSubstitutedGrowth(joined, substitutionContext, source.filePath) >
    MAX_UNTRUSTED_FRONTMATTER_BYTES;
  let shouldDrop = tooLong || needsUnknownDataDir(joined, substitutionContext);
  if (shouldDrop)
    logForDebugging(
      `Plugin command ${source.commandName}: its allowed-tools are dropped: ${tooLong ? "filled in, they could be too long, or a folder they name holds a variable or a $" : "they name the plugin's data folder, which did not come with the plugin"}`,
      {
        level: "warn",
      },
    );
  let file = {
    filePath: source.filePath,
    baseDir: source.baseDir,
    frontmatter: shouldDrop
      ? {
          ...mergedFrontmatter,
          "allowed-tools": "",
        }
      : mergedFrontmatter,
    skillFile: buildFrontmatterResult(frontmatterAsWritten, undefined, asWrittenProblem),
    content: memoizeLastValue(getHostState().skillContentIntern, source.filePath, content),
  };
  return createPluginCommand(
    source.commandName,
    file,
    source.sourceName,
    source.pluginManifest,
    source.pluginPath,
    source.provenance ?? {},
    source.isSkill,
    source.config,
    pluginDataDir,
  );
}
//@ chunk-e6aww6q8.js:1666717-1666959 layout
/**
 * 把 manifest commands 对象形式里的元数据（description、argumentHint、model、allowedTools）覆盖到 markdown frontmatter 上。
 */
function applyCommandMetadataOverrides(frontmatter, metadata) {
  if (metadata === undefined) return frontmatter;
  return {
    ...frontmatter,
    ...(metadata.description && {
      description: metadata.description,
    }),
    ...(metadata.argumentHint && {
      "argument-hint": metadata.argumentHint,
    }),
    ...(metadata.model && {
      model: metadata.model,
    }),
    ...(metadata.allowedTools && {
      "allowed-tools": metadata.allowedTools.join(","),
    }),
  };
}
//@ chunk-e6aww6q8.js:1666959-1667143 layout
function getPluginTrustContext(plugin) {
  let marketplaceSource = plugin.marketplaceSource;
  return {
    officiallyAttested: plugin.officialAttestation !== undefined,
    marketplaceSource,
    npmResolution: plugin.npmResolution,
    ...(marketplaceSource !== undefined &&
      isLocalMarketplaceSource(marketplaceSource) && {
        home: homedir(),
      }),
  };
}
//@ chunk-e6aww6q8.js:1667143-1667192 file-local
/**
 * 文件名是否为 SKILL.md（忽略大小写）。
 */
function isSkillFile_2(filePath) {
  return /^skill\.md$/i.test(basename(filePath));
}
//@ chunk-e6aww6q8.js:1667192-1667561 file-local
function getCommandNameFromFile(filePath, baseDir, pluginName) {
  if (isSkillFile_2(filePath)) {
    let skillDirectory = dirname(filePath);
    let parentOfSkillDir = dirname(skillDirectory);
    let commandBaseName = basename(skillDirectory);
    let relativePath = parentOfSkillDir.startsWith(baseDir)
      ? parentOfSkillDir.slice(baseDir.length).replace(/^[/\\]/, "")
      : "";
    let namespace = relativePath ? relativePath.split(/[/\\]/).join(":") : "";
    return namespace ? `${pluginName}:${namespace}:${commandBaseName}` : `${pluginName}:${commandBaseName}`;
  } else {
    let fileDirectory = dirname(filePath);
    let commandBaseName = basename(filePath).replace(/\.md$/, "");
    let relativePath = fileDirectory.startsWith(baseDir)
      ? fileDirectory.slice(baseDir.length).replace(/^[/\\]/, "")
      : "";
    let namespace = relativePath ? relativePath.split(/[/\\]/).join(":") : "";
    return namespace ? `${pluginName}:${namespace}:${commandBaseName}` : `${pluginName}:${commandBaseName}`;
  }
}
//@ chunk-e6aww6q8.js:1667561-1668178 fingerprint (2.1.88 match: collectMarkdownFiles, 0.408)
async function collectMarkdownFiles(dirPath, baseDir, loadedPaths) {
  let files = [];
  let fs = getFsImplementation();
  await walkPluginMarkdown(
    dirPath,
    async (fullPath) => {
      let content;
      try {
        let smallFileChecked = await readSmallFileChecked(fs, fullPath, MAX_PLUGIN_COMMAND_FILE_BYTES);
        if (smallFileChecked === null) {
          logForDebugging(
            `Skipping plugin command ${fullPath}: not a regular file or exceeds ${MAX_PLUGIN_COMMAND_FILE_BYTES} byte limit`,
            {
              level: "warn",
            },
          );
          return;
        }
        content = smallFileChecked;
      } catch (error) {
        logForDebugging(`Failed to read plugin command ${fullPath}: ${error}`, {
          level: "error",
        });
        return;
      }
      let {
        frontmatter,
        frontmatterAsWritten,
        asWrittenProblem,
        content: content_2,
      } = parseFrontmatter(content, fullPath, {
        normalizeKeys: true,
      });
      files.push({
        filePath: fullPath,
        baseDir,
        frontmatter,
        skillFile: buildFrontmatterResult(frontmatterAsWritten, fullPath, asWrittenProblem),
        content: memoizeLastValue(getHostState().skillContentIntern, fullPath, content_2),
      });
    },
    {
      stopAtSkillDir: true,
      logLabel: "commands",
      loadedPaths,
    },
  );
  return files.sort((left, right) => left.filePath.localeCompare(right.filePath));
}
//@ chunk-e6aww6q8.js:1668487-1668700 fingerprint (2.1.88 match: loadCommandsFromDirectory, 1)
async function loadCommandsFromDirectory(
  commandsPath,
  pluginName,
  sourceName,
  pluginManifest,
  pluginPath,
  pluginTrustContext,
  config = {
    isSkillMode: false,
  },
  loadedPaths = new Set(),
) {
  let markdownFiles = await collectMarkdownFiles(commandsPath, commandsPath, loadedPaths);
  let processedFiles = transformSkillFiles(markdownFiles);
  let commands = [];
  for (let file of processedFiles) {
    let commandName = getCommandNameFromFile(file.filePath, file.baseDir, pluginName);
    let command = createPluginCommand(
      commandName,
      file,
      sourceName,
      pluginManifest,
      pluginPath,
      pluginTrustContext,
      isSkillFile_2(file.filePath),
      config,
    );
    if (command) commands.push(command);
  }
  return commands;
}
//@ chunk-e6aww6q8.js:1668700-1674044 fingerprint (2.1.88 match: createPluginCommand, 0.643)
/**
 * 由插件的 markdown 文件构造斜杠命令：命令名 <插件>:<相对路径>（技能目录用目录名），解析 frontmatter（description、allowed-tools、argument-hint、model、disable-model-invocation…），正文在调用时替换 $ARGUMENTS、${CLAUDE_PLUGIN_ROOT}、${user_config.X}。
 */
function createPluginCommand(
  commandName,
  file,
  sourceName,
  pluginManifest,
  pluginPath,
  provenance,
  isSkill,
  config = {
    isSkillMode: false,
  },
  pluginDataDir,
) {
  if (provenance.marketplaceSource !== undefined) {
    let redactedSource = redactMarketplaceSource(provenance.marketplaceSource);
    if (redactedSource === null) {
      let { marketplaceSource, ...withoutMarketplace } = provenance;
      provenance = withoutMarketplace;
    } else
      provenance = {
        ...provenance,
        marketplaceSource: redactedSource,
      };
  }
  if (provenance.npmResolution !== undefined) {
    let redactedNpm = redactNpmTarball(provenance.npmResolution);
    if (redactedNpm === null) {
      let { npmResolution, ...withoutNpm } = provenance;
      provenance = withoutNpm;
    } else if (redactedNpm !== provenance.npmResolution)
      provenance = {
        ...provenance,
        npmResolution: redactedNpm,
      };
  }
  try {
    if (!isSkillFilePathOrIdentifier(commandName)) {
      reportRefusedSkillName(commandName, "is not offered");
      return null;
    }
    let { frontmatter, content } = file;
    let validatedDescription = coerceDescriptionToString(frontmatter.description, commandName);
    let fileDir = dirname(file.filePath);
    let substitute = (text) => {
      let substituted = substitutePluginVariables(text, {
        path: pluginPath,
        source: sourceName,
        dataDir: pluginDataDir,
        ...(getToolsMachine() && {
          projectDir: null,
        }),
      });
      if (config.isSkillMode) substituted = substituted.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => fileDir);
      return substituted;
    };
    let rawAllowedTools = frontmatter["allowed-tools"];
    let toolsValue =
      typeof rawAllowedTools === "string"
        ? substitute(rawAllowedTools)
        : Array.isArray(rawAllowedTools)
          ? rawAllowedTools.map((tool) => (typeof tool === "string" ? substitute(tool) : tool))
          : rawAllowedTools;
    let allowedTools = parseSlashCommandToolsFromFrontmatter(toolsValue);
    let filtered = allowedTools.filter((allowedTool) => !allowedTool.includes(PROJECT_DIR_PLACEHOLDER));
    if (filtered.length < allowedTools.length)
      logForDebugging(
        `Plugin command ${commandName}: loaded without ${allowedTools.length - filtered.length} of its allowed-tools entries, which name CLAUDE_PROJECT_DIR, because this process has no folder where the tools run`,
        {
          level: "warn",
        },
      );
    let disallowedTools = frontmatterDisallowedTools(frontmatter);
    let argumentNames = normalizeArgumentNames(frontmatter.arguments);
    let {
      description,
      argumentHint,
      argumentNames: argumentNames_2,
      whenToUse,
    } = displaySkillFields({
      description:
        validatedDescription ??
        extractDescriptionFromMarkdown(content, isSkill ? "Plugin skill" : "Plugin command"),
      argumentHint: frontmatter["argument-hint"] != null ? String(frontmatter["argument-hint"]) : undefined,
      argumentNames,
      whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : undefined,
    });
    let version = frontmatter.version != null ? String(frontmatter.version) : undefined;
    let name = parseFrontmatterName(frontmatter.name, `plugin command ${commandName}`);
    let sliced = commandName.slice(0, commandName.lastIndexOf(":") + 1);
    let displayName = name ? (name.startsWith(sliced) ? name : `${sliced}${name}`) : commandName;
    let aliasNames =
      name && !name.includes(":")
        ? /\s/.test(name) && areSkillsConvertedAsPlugins()
          ? [name, commandName.slice(sliced.length)]
          : [name]
        : undefined;
    let aliasesRefused = !!name && !(isSkillPathEligible(name) && isSkillPathEligible(displayName));
    let model = frontmatter.model;
    let resolvedModel;
    if (typeof model === "string" && model.trim().length > 0) {
      let trimmed = model.trim();
      resolvedModel = trimmed.toLowerCase() === "inherit" ? "inherit" : parseUserSpecifiedModel(trimmed);
    }
    let effort = frontmatter.effort;
    let parsedEffort = effort !== undefined ? parseEffortValue(effort) : undefined;
    if (effort !== undefined && parsedEffort === undefined)
      logForDebugging(
        `Plugin command ${commandName} has invalid effort '${effort}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
      );
    let disableModelInvocation = parseBooleanFrontmatter(frontmatter["disable-model-invocation"]);
    let rawUserInvocable = frontmatter["user-invocable"];
    let userInvocable = rawUserInvocable === undefined ? true : parseBooleanFrontmatter(rawUserInvocable);
    let listingName;
    let shell = directoryPluginFallbackName(pluginPath, SYNCED);
    if (
      userInvocable &&
      !(isSkill && aliasesRefused) &&
      marketplaceSuffix(sourceName) === SYNCED &&
      isUuid(shell)
    ) {
      let fileDir = dirname(file.filePath);
      let skillName = isSkill
        ? normalizeSkillName(name?.trim() || (fileDir === pluginPath ? shell : basename(fileDir)))
        : commandName.slice(commandName.indexOf(":") + 1);
      let candidateName = `${shell}:${skillName}`;
      if (skillName !== "" && candidateName !== commandName && candidateName !== displayName)
        listingName = candidateName;
    }
    let shellFrontmatter = parseShellFrontmatter(frontmatter.shell, commandName);
    let hooks;
    let unloadable = false;
    let hasTopLevelGuards = hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS);
    let invalidHooks =
      !(isSkill || config.isSkillMode) &&
      frontmatter.hooks !== undefined &&
      frontmatter.hooks !== null &&
      (typeof frontmatter.hooks !== "object" ||
        (Array.isArray(frontmatter.hooks) &&
          frontmatter.hooks.some((hook) => !hook || typeof hook !== "object")) ||
        hasGuardHooks_2(frontmatter.hooks) ||
        containsHooks(frontmatter.hooks));
    if (hasTopLevelGuards || invalidHooks) {
      unloadable = true;
      logForDebugging(
        `Plugin skill '${commandName}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
        {
          level: "error",
        },
      );
    } else if ((isSkill || config.isSkillMode) && frontmatter.hooks) {
      let rawSkillDir = validateHooksSetting(frontmatter.hooks);
      for (let note of rawSkillDir.notes)
        logForDebugging(`Plugin skill '${commandName}': ${note}`, {
          level: "warn",
        });
      let hooksParse = HooksSchema().safeParse(frontmatter.hooks);
      if (rawSkillDir.unloadableGuards.length > 0 || !hooksParse.success) {
        unloadable = true;
        logForDebugging(
          `Plugin skill '${commandName}': ${rawSkillDir.unloadableGuards.join("; ") || hooksParse.error?.message || "hooks unreadable"} \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
          {
            level: "error",
          },
        );
      } else hooks = hooksParse.data;
    }
    let guardsSkippedByPolicy =
      hooks !== undefined && hasGuardHooks_2(hooks) && shouldSkipSessionHooksByPolicy();
    let usable = !unloadable && !guardsSkippedByPolicy;
    let allowedTools_2 = usable ? filtered : [];
    let grantReported = false;
    let getAllowedTools = () => {
      let grants = shouldLoadPermissionRules(hooks, sourceName) ? [] : (command.allowedTools ?? []);
      let withheldReason =
        grants.length === 0
          ? undefined
          : frontmatterToolGrantWithheldReason("plugin", {
              id: sourceName,
              ...provenance,
            });
      if (withheldReason === undefined) {
        grantReported = false;
        return grants;
      }
      if (!grantReported) {
        grantReported = true;
        reportIgnoredFrontmatterToolGrants(
          commandName,
          {
            pluginId: sourceName,
          },
          grants,
          withheldReason,
        );
      }
      return [];
    };
    let command = {
      type: "prompt",
      name: commandName,
      description,
      hasUserSpecifiedDescription: validatedDescription !== null,
      allowedTools: allowedTools_2,
      ...(usable &&
        allowedTools.length > 0 && {
          getAllowedTools: async () => getAllowedTools(),
        }),
      disallowedTools: disallowedTools.length > 0 ? disallowedTools : undefined,
      argumentHint,
      argNames: argumentNames_2.length > 0 ? argumentNames_2 : undefined,
      whenToUse,
      version,
      model: resolvedModel,
      effort: parsedEffort,
      context: frontmatter.context === "fork" ? "fork" : undefined,
      agent: frontmatter.agent != null ? String(frontmatter.agent) : undefined,
      background: parseBooleanishFrontmatter(frontmatter.background),
      disableModelInvocation,
      userInvocable,
      declaredFields: getDeclaredFrontmatterFields(frontmatter),
      metadata: isPlainObject_5(frontmatter.metadata) ? frontmatter.metadata : undefined,
      contentLength: content.length,
      source: "plugin",
      loadedFrom: isSkill || config.isSkillMode ? "plugin" : undefined,
      hooks,
      skillRoot: (isSkill || config.isSkillMode) && hooks ? pluginPath : undefined,
      skillDir: isSkill || config.isSkillMode ? dirname(file.filePath) : undefined,
      skillFile: file.skillFile,
      pluginInfo: {
        pluginManifest,
        repository: sourceName,
        ...(provenance.officiallyAttested && {
          officiallyAttested: true,
        }),
        ...(provenance.marketplaceSource && {
          marketplaceSource: provenance.marketplaceSource,
        }),
        ...(provenance.npmResolution && {
          npmResolution: provenance.npmResolution,
        }),
        ...(provenance.home !== undefined && {
          home: provenance.home,
        }),
      },
      pluginSource: {
        commandName,
        filePath: file.filePath,
        baseDir: file.baseDir,
        sourceName,
        pluginManifest,
        pluginPath,
        provenance,
        isSkill,
        config,
      },
      serverAttribution: config.serverAttribution,
      isHidden: !userInvocable,
      progressMessage: isSkill || config.isSkillMode ? "loading" : "running",
      userFacingName() {
        return displayName;
      },
      aliases: aliasesRefused ? undefined : aliasNames,
      shedAliases: aliasesRefused ? aliasNames : undefined,
      ...(listingName !== undefined && {
        directoryListingName: listingName,
      }),
      async getPromptForCommand(args, context) {
        let promptText = config.isSkillMode
          ? `Base directory for this skill: ${dirname(file.filePath)}

${content}`
          : content;
        let watcher = skillWatchStateSlot.get();
        if (watcher !== undefined)
          promptText = await watcher(promptText, {
            isPreload: context.options.isSkillPreload === true,
          });
        let options = pluginManifest.userConfig
          ? await loadPluginOptions(sourceName, context.credentials)
          : undefined;
        let effortLevel = getEffortLevelOrHigh(
          inlineSkillModelOverride(resolvedModel) ?? context.options.mainLoopModel,
          getEffortValue(context),
          parsedEffort ?? getEffortLayerOverride(context.permissionLayers),
        );
        let skillContext = {
          pluginPath,
          sourceName,
          pluginDataDir,
          userConfig: pluginManifest.userConfig,
          options,
          skillDir: config.isSkillMode ? fileDir : undefined,
          effortLevel,
        };
        promptText = substituteArguments(
          promptText,
          args,
          true,
          argumentNames,
          (arg) => escapeShellBangs(substituteSkillVariables(arg, skillContext)),
          (value, argRef) => substituteSkillVariables(value, skillContext, argRef),
        );
        if (isSkillShellExecutionDisabled()) promptText = replacePromptShellCommands(promptText);
        else
          promptText = await executeShellCommandsInPrompt(
            promptText,
            {
              ...context,
              getAppState: withCommandAllowRules(context, getAllowedTools()),
            },
            `/${commandName}`,
            shellFrontmatter,
            sourceName,
          );
        return [
          {
            type: "text",
            text: promptText,
          },
        ];
      },
    };
    if (aliasesRefused) {
      reportRefusedSkillName(displayName, `is not shown for ${commandName}`);
      clearUserFacingName(command);
    }
    return command;
  } catch (error) {
    logForDebugging(`Failed to create command from ${file.filePath}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:1674044-1674355 layout
function copySyncedSkillFlags(pluginInfo, plugin) {
  if (plugin.serverPluginId !== undefined) pluginInfo.serverPluginId = plugin.serverPluginId;
  if (plugin.marketplaceKind !== undefined) pluginInfo.marketplaceKind = plugin.marketplaceKind;
  if (plugin.accountSkillsWrapper) pluginInfo.accountSkillsWrapper = true;
  if (plugin.hostNamedSkillsFolder) pluginInfo.hostNamedSkillsFolder = true;
  if (plugin.followsSyncedSkillState) pluginInfo.followsSyncedSkillState = true;
}
//@ chunk-e6aww6q8.js:1674355-1677759 fingerprint (2.1.88 match: getPluginCommands, 0.756)
/**
 * 加载所有启用插件的命令（commands/ 目录与 manifest.commands），结果缓存在全局 commands。
 */
function getPluginCommands(storageV5) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.commands ??= (async () => {
    if (
      isCustomizationDisabled("plugins", {
        explicitlyRequested:
          pluginRegistry.handedIn !== undefined ||
          getInlinePlugins().length > 0 ||
          getInlinePluginsNoMcp().length > 0 ||
          getInlinePluginUrls().length > 0,
      })
    )
      return [];
    if (pluginRegistry.handedIn !== undefined) return (await pluginRegistry.handedIn).commands;
    let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
    let failureKind = null;
    let allCommands = (
      await Promise.all(
        enabled.map(async (plugin) => {
          let loadedPaths = new Set();
          let pluginCommands = [];
          if (plugin.commandsPath)
            try {
              let commands = await loadCommandsFromDirectory(
                plugin.commandsPath,
                plugin.name,
                plugin.source,
                plugin.manifest,
                plugin.path,
                getPluginTrustContext(plugin),
                {
                  isSkillMode: false,
                },
                loadedPaths,
              );
              pluginCommands.push(...commands);
              if (commands.length > 0)
                logForDebugging(
                  `Loaded ${commands.length} commands from plugin ${plugin.name} default directory`,
                );
            } catch (error) {
              failureKind = "plugin_load_commands_dir_failed";
              logForDebugging(
                `Failed to load commands from plugin ${plugin.name} default directory: ${error}`,
                {
                  level: "error",
                },
              );
            }
          if (plugin.commandsPaths) {
            logForDebugging(`Plugin ${plugin.name} has commandsPaths: ${plugin.commandsPaths.join(", ")}`);
            let pathResults = await Promise.all(
              plugin.commandsPaths.map(async (commandPath) => {
                try {
                  let fs = getFsImplementation();
                  let stats = await fs.stat(commandPath);
                  logForDebugging(
                    `Checking commandPath ${commandPath} - isDirectory: ${stats.isDirectory()}, isFile: ${stats.isFile()}`,
                  );
                  if (stats.isDirectory()) {
                    let commands = await loadCommandsFromDirectory(
                      commandPath,
                      plugin.name,
                      plugin.source,
                      plugin.manifest,
                      plugin.path,
                      getPluginTrustContext(plugin),
                      {
                        isSkillMode: false,
                      },
                      loadedPaths,
                    );
                    if (commands.length > 0)
                      logForDebugging(
                        `Loaded ${commands.length} commands from plugin ${plugin.name} custom path: ${commandPath}`,
                      );
                    else
                      logForDebugging(
                        `Warning: No commands found in plugin ${plugin.name} custom directory: ${commandPath}. Expected .md files or SKILL.md in subdirectories.`,
                        {
                          level: "warn",
                        },
                      );
                    return commands;
                  } else if (stats.isFile() && commandPath.endsWith(".md")) {
                    if (isDuplicatePath(fs, commandPath, loadedPaths)) return [];
                    let content = await readSmallFileChecked(fs, commandPath, MAX_PLUGIN_COMMAND_FILE_BYTES);
                    if (content === null) {
                      logForDebugging(
                        `Skipping plugin command ${commandPath}: exceeds ${MAX_PLUGIN_COMMAND_FILE_BYTES} byte limit`,
                        {
                          level: "warn",
                        },
                      );
                      return [];
                    }
                    let {
                      frontmatter,
                      frontmatterAsWritten,
                      asWrittenProblem,
                      content: content_2,
                    } = parseFrontmatter(content, commandPath, {
                      normalizeKeys: true,
                    });
                    let commandName;
                    let metadataOverride;
                    if (plugin.commandsMetadata) {
                      for (let [name, metadata] of Object.entries(plugin.commandsMetadata))
                        if (metadata.source) {
                          let fullMetadataPath = join(plugin.path, metadata.source);
                          if (commandPath === fullMetadataPath) {
                            commandName = `${plugin.name}:${name}`;
                            metadataOverride = metadata;
                            break;
                          }
                        }
                    }
                    if (!commandName)
                      commandName = `${plugin.name}:${basename(commandPath).replace(/\.md$/, "")}`;
                    let file = {
                      filePath: commandPath,
                      baseDir: dirname(commandPath),
                      frontmatter: applyCommandMetadataOverrides(frontmatter, metadataOverride),
                      skillFile: buildFrontmatterResult(frontmatterAsWritten, commandPath, asWrittenProblem),
                      content: memoizeLastValue(getHostState().skillContentIntern, commandPath, content_2),
                    };
                    let command = createPluginCommand(
                      commandName,
                      file,
                      plugin.source,
                      plugin.manifest,
                      plugin.path,
                      getPluginTrustContext(plugin),
                      false,
                      {
                        isSkillMode: false,
                        metadata: metadataOverride,
                      },
                    );
                    if (command) {
                      logForDebugging(
                        `Loaded command from plugin ${plugin.name} custom file: ${commandPath}${metadataOverride ? " (with metadata override)" : ""}`,
                      );
                      return [command];
                    }
                  }
                  return [];
                } catch (error) {
                  failureKind = "plugin_load_commands_path_failed";
                  logForDebugging(
                    `Failed to load commands from plugin ${plugin.name} custom path ${commandPath}: ${error}`,
                    {
                      level: "error",
                    },
                  );
                  return [];
                }
              }),
            );
            for (let commands of pathResults) pluginCommands.push(...commands);
          }
          if (plugin.commandsMetadata) {
            for (let [name, metadata] of Object.entries(plugin.commandsMetadata))
              if (metadata.content && !metadata.source)
                try {
                  let { frontmatter, frontmatterAsWritten, asWrittenProblem, content } = parseFrontmatter(
                    metadata.content,
                    `<inline:${plugin.name}:${name}>`,
                    {
                      normalizeKeys: true,
                    },
                  );
                  let commandName = `${plugin.name}:${name}`;
                  let commandName_2 = `<inline:${commandName}>`;
                  let inlineCommandData = {
                    filePath: commandName_2,
                    baseDir: plugin.path,
                    frontmatter: applyCommandMetadataOverrides(frontmatter, metadata),
                    skillFile: buildFrontmatterResult(frontmatterAsWritten, undefined, asWrittenProblem),
                    content: memoizeLastValue(getHostState().skillContentIntern, commandName_2, content),
                  };
                  let command = createPluginCommand(
                    commandName,
                    inlineCommandData,
                    plugin.source,
                    plugin.manifest,
                    plugin.path,
                    getPluginTrustContext(plugin),
                    false,
                    {
                      isSkillMode: false,
                      metadata,
                    },
                  );
                  if (command) {
                    pluginCommands.push(command);
                    logForDebugging(
                      `Loaded inline content command from plugin ${plugin.name}: ${commandName}`,
                    );
                  }
                } catch (error) {
                  failureKind = "plugin_load_commands_inline_failed";
                  logForDebugging(
                    `Failed to load inline content command ${name} from plugin ${plugin.name}: ${error}`,
                    {
                      level: "error",
                    },
                  );
                }
          }
          if (
            plugin.serverPluginId !== undefined ||
            plugin.marketplaceKind !== undefined ||
            plugin.accountSkillsWrapper
          ) {
            for (let pluginCommand of pluginCommands)
              if (pluginCommand.type === "prompt" && pluginCommand.pluginInfo !== undefined)
                copySyncedSkillFlags(pluginCommand.pluginInfo, plugin);
          }
          return pluginCommands;
        }),
      )
    ).flat();
    logForDebugging(`Total plugin commands loaded: ${allCommands.length}`);
    if (failureKind) logFeatureBad("plugin_load_commands", failureKind);
    else logFeatureOk("plugin_load_commands");
    return allCommands;
  })();
  return pluginRegistry.commands;
}
//@ chunk-e6aww6q8.js:1677759-1677969 layout
async function realpathForDedupe(targetPath) {
  try {
    return await realpath(targetPath);
  } catch (error) {
    logForDebugging(
      `Could not resolve ${targetPath} to de-duplicate it across plugins (${errorMessage(error)}); keeping the skill without cross-plugin de-duplication`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-e6aww6q8.js:1677969-1680227 fingerprint (2.1.88 match: loadSkillsFromDirectory, 0.479)
/**
 * 扫描插件的技能目录：根 SKILL.md 或子目录 <name>/SKILL.md，每个技能生成一个命令（技能模式）。
 */
async function loadSkillsFromDirectory(
  skillsPath,
  pluginName,
  sourceName,
  pluginManifest,
  pluginPath,
  pluginTrustContext,
  loadedPaths,
  skillSwitches,
) {
  let fs = getFsImplementation();
  let skills = [];
  let attributionFor = isSkillAttributionEnabled();
  let directSkillPath = join(skillsPath, "SKILL.md");
  let directSkillContent = null;
  try {
    directSkillContent = await readSmallFileChecked(fs, directSkillPath, MAX_PLUGIN_COMMAND_FILE_BYTES);
    if (directSkillContent === null)
      logForDebugging(
        `Skipping plugin skill ${directSkillPath}: not a regular file or exceeds ${MAX_PLUGIN_COMMAND_FILE_BYTES} byte limit`,
        {
          level: "warn",
        },
      );
  } catch (e) {
    if (!isENOENT(e)) {
      logForDebugging(`Failed to load skill from ${directSkillPath}: ${e}`, {
        level: "error",
      });
      return skills;
    }
  }
  if (directSkillContent !== null) {
    if (
      computeDisabledSkills(skillSwitches, [basename(skillsPath)]).size > 0 ||
      isDuplicatePath(fs, directSkillPath, loadedPaths)
    )
      return skills;
    try {
      let { frontmatter, frontmatterAsWritten, asWrittenProblem, content } = parseFrontmatter(
        directSkillContent,
        directSkillPath,
        {
          normalizeKeys: true,
        },
      );
      let rawName = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
      let replaced = (
        (rawName.startsWith(`${pluginName}:`) ? rawName.slice(pluginName.length + 1) : rawName) ||
        basename(skillsPath)
      ).replace(/[^a-zA-Z0-9_-]/g, "-");
      let skillName = `${pluginName}:${replaced}`;
      let file = {
        filePath: directSkillPath,
        baseDir: dirname(directSkillPath),
        frontmatter,
        skillFile: buildFrontmatterResult(frontmatterAsWritten, directSkillPath, asWrittenProblem),
        content: memoizeLastValue(getHostState().skillContentIntern, directSkillPath, content),
      };
      let skill = createPluginCommand(
        skillName,
        file,
        sourceName,
        pluginManifest,
        pluginPath,
        pluginTrustContext,
        true,
        {
          isSkillMode: true,
          serverAttribution: attributionFor(file.baseDir),
        },
      );
      if (skill)
        skills.push({
          skill,
          realpath: await realpathForDedupe(directSkillPath),
        });
    } catch (error) {
      logForDebugging(`Failed to load skill from ${directSkillPath}: ${error}`, {
        level: "error",
      });
    }
    return skills;
  }
  let dirEntries;
  try {
    dirEntries = await fs.readdir(skillsPath);
  } catch (e) {
    if (!isENOENT(e))
      logForDebugging(`Failed to load skills from directory ${skillsPath}: ${e}`, {
        level: "error",
      });
    return skills;
  }
  let filtered = dirEntries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink());
  let skillDirPath = computeDisabledSkills(
    skillSwitches,
    filtered.map((entry) => entry.name),
  );
  if (skillDirPath.size > 0)
    logForDebugging(
      `Leaving out ${skillDirPath.size} of ${filtered.length} skill folders of plugin ${pluginName}: switched off in its manifest.json, or not listed there while a switched-off entry names no folder`,
    );
  await Promise.all(
    filtered.map(async (entry) => {
      if (skillDirPath.has(entry.name)) return;
      let skillDirPath_2 = join(skillsPath, entry.name);
      let skillFilePath = join(skillDirPath_2, "SKILL.md");
      let content;
      try {
        let smallFileChecked = await readSmallFileChecked(fs, skillFilePath, MAX_PLUGIN_COMMAND_FILE_BYTES);
        if (smallFileChecked === null) {
          logForDebugging(
            `Skipping plugin skill ${skillFilePath}: not a regular file or exceeds ${MAX_PLUGIN_COMMAND_FILE_BYTES} byte limit`,
            {
              level: "warn",
            },
          );
          return;
        }
        content = smallFileChecked;
      } catch (e) {
        if (!isENOENT(e))
          logForDebugging(`Failed to load skill from ${skillFilePath}: ${e}`, {
            level: "error",
          });
        return;
      }
      if (isDuplicatePath(fs, skillFilePath, loadedPaths)) return;
      try {
        let {
          frontmatter,
          frontmatterAsWritten,
          asWrittenProblem,
          content: content_2,
        } = parseFrontmatter(content, skillFilePath, {
          normalizeKeys: true,
        });
        let skillName = `${pluginName}:${entry.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        let file = {
          filePath: skillFilePath,
          baseDir: dirname(skillFilePath),
          frontmatter,
          skillFile: buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
          content: memoizeLastValue(getHostState().skillContentIntern, skillFilePath, content_2),
        };
        let skill = createPluginCommand(
          skillName,
          file,
          sourceName,
          pluginManifest,
          pluginPath,
          pluginTrustContext,
          true,
          {
            isSkillMode: true,
            serverAttribution: attributionFor(file.baseDir),
          },
        );
        if (skill)
          skills.push({
            skill,
            realpath: await realpathForDedupe(skillFilePath),
          });
      } catch (error) {
        logForDebugging(`Failed to load skill from ${skillFilePath}: ${error}`, {
          level: "error",
        });
      }
    }),
  );
  return skills.sort((left, right) => left.skill.name.localeCompare(right.skill.name));
}
//@ chunk-e6aww6q8.js:1680227-1682147 fingerprint (2.1.88 match: getPluginSkills, 0.792)
/**
 * 加载所有启用插件的技能（skills/ 与 manifest.skills），按真实路径跨插件去重。
 */
async function getPluginSkills(storageV5) {
  let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
  if (errors.length > 0)
    logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
  logForDebugging(`getPluginSkills: Processing ${enabled.length} enabled plugins`);
  let failureKind = null;
  let unusableByPlugin = new Map();
  let perPluginSkills = await Promise.all(
    enabled.map(async (plugin) => {
      let loadedPaths = new Set();
      let pluginSkills = [];
      logForDebugging(
        `Checking plugin ${plugin.name}: skillsPath=${plugin.skillsPath ? "exists" : "none"}, skillsPaths=${plugin.skillsPaths ? plugin.skillsPaths.length : 0} paths`,
      );
      let switches =
        plugin.accountSkillsWrapper && desktopSkillSwitches()
          ? await listPluginSkillFilesSettled(plugin.path)
          : ALL_SKILLS_ON;
      if (switches.kind === "unusable") {
        unusableByPlugin.set(plugin, switches.code);
        logForDebugging(
          `Loading no skills from plugin ${plugin.name}: the manifest.json at its root ${switches.why}, so it does not say which skills are switched off`,
          {
            level: "warn",
          },
        );
        return pluginSkills;
      }
      if (plugin.skillsPath) {
        logForDebugging(
          `Attempting to load skills from plugin ${plugin.name} default skillsPath: ${plugin.skillsPath}`,
        );
        try {
          let skills = await loadSkillsFromDirectory(
            plugin.skillsPath,
            plugin.name,
            plugin.source,
            plugin.manifest,
            plugin.path,
            getPluginTrustContext(plugin),
            loadedPaths,
            switches,
          );
          pluginSkills.push(...skills);
          logForDebugging(`Loaded ${skills.length} skills from plugin ${plugin.name} default directory`);
        } catch (error) {
          failureKind = "plugin_load_skills_dir_failed";
          logForDebugging(`Failed to load skills from plugin ${plugin.name} default directory: ${error}`, {
            level: "error",
          });
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
              let skills = await loadSkillsFromDirectory(
                skillPath,
                plugin.name,
                plugin.source,
                plugin.manifest,
                plugin.path,
                getPluginTrustContext(plugin),
                loadedPaths,
                switches,
              );
              logForDebugging(
                `Loaded ${skills.length} skills from plugin ${plugin.name} custom path: ${skillPath}`,
              );
              return skills;
            } catch (error) {
              failureKind = "plugin_load_skills_path_failed";
              logForDebugging(
                `Failed to load skills from plugin ${plugin.name} custom path ${skillPath}: ${error}`,
                {
                  level: "error",
                },
              );
              return [];
            }
          }),
        );
        for (let skills of pathResults) pluginSkills.push(...skills);
      }
      if (
        plugin.serverPluginId !== undefined ||
        plugin.marketplaceKind !== undefined ||
        plugin.accountSkillsWrapper ||
        plugin.followsSyncedSkillState
      ) {
        for (let pluginSkill of pluginSkills)
          if (pluginSkill.skill.type === "prompt" && pluginSkill.skill.pluginInfo !== undefined)
            copySyncedSkillFlags(pluginSkill.skill.pluginInfo, plugin);
      }
      return pluginSkills;
    }),
  );
  let found = enabled.map((plugin) => unusableByPlugin.get(plugin)).find((code) => code !== undefined);
  return {
    entries: perPluginSkills.flat(),
    hadErrorCode: found ?? failureKind,
  };
}
//@ chunk-e6aww6q8.js:1682147-1683072 placement
function loadPluginSkills(storageV5) {
  let pluginRegistry = getPluginRegistry();
  let cacheKey = isStorageV5Enabled() && storageV5 !== undefined ? "skillsV5" : "skills";
  pluginRegistry[cacheKey] ??= (async () => {
    if (
      isCustomizationDisabled("plugins", {
        explicitlyRequested:
          pluginRegistry.handedIn !== undefined ||
          getInlinePlugins().length > 0 ||
          getInlinePluginsNoMcp().length > 0 ||
          getInlinePluginUrls().length > 0,
      })
    )
      return [];
    if (pluginRegistry.handedIn !== undefined) return (await pluginRegistry.handedIn).skills;
    let [{ entries, hadErrorCode: errorCode }, userSkillFileIds] = await Promise.all([
      getPluginSkills(storageV5),
      getUserSkillFileIds(storageV5),
    ]);
    let byRealpath = new Map();
    let skills = [];
    for (let entry of entries) {
      let realpath = entry.realpath;
      if (realpath === null) {
        skills.push(entry.skill);
        continue;
      }
      if (userSkillFileIds !== null && userSkillFileIds.has(realpath)) {
        logForDebugging(
          `Skipping plugin skill '${entry.skill.name}' \u2014 ${realpath} is a user-level skill already surfaced by the skills directory loader`,
        );
        continue;
      }
      let existingName = byRealpath.get(realpath);
      if (existingName !== undefined) {
        logForDebugging(
          `Skipping duplicate plugin skill '${entry.skill.name}' \u2014 ${realpath} already loaded as '${existingName}'`,
        );
        continue;
      }
      byRealpath.set(realpath, entry.skill.name);
      skills.push(entry.skill);
    }
    logForDebugging(
      `Total plugin skills loaded: ${skills.length} (${entries.length - skills.length} duplicate/user-owned entries skipped)`,
    );
    if (errorCode) logFeatureBad("plugin_load_skills", errorCode);
    else logFeatureOk("plugin_load_skills");
    return skills;
  })();
  return pluginRegistry[cacheKey];
}
//@ chunk-e6aww6q8.js:1683072-1683472 placement
/**
 * 替换命令/技能内容里的变量：插件路径/来源/数据目录、${CLAUDE_SKILL_DIR}、${CLAUDE_SESSION_ID}、${CLAUDE_EFFORT}， 有用户配置时再替换 user_config 值。r 用于对替换值转义。
 */
function substituteSkillVariables(content, context, escapeValue = (value) => value) {
  let content_2 = substitutePluginVariables(
    content,
    {
      path: context.pluginPath,
      source: context.sourceName,
      dataDir: context.pluginDataDir,
    },
    escapeValue,
  );
  if (context.skillDir !== undefined) {
    let skillDir = escapeValue(context.skillDir);
    content_2 = content_2.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => skillDir);
  }
  let sessionId = escapeValue(getSessionId());
  content_2 = content_2.replace(/\$\{CLAUDE_SESSION_ID\}/g, () => sessionId);
  let effortLevel = escapeValue(context.effortLevel);
  content_2 = content_2.replaceAll("${CLAUDE_EFFORT}", () => effortLevel);
  if (context.userConfig && context.options)
    content_2 = substituteUserConfigInContent(content_2, context.options, context.userConfig, (value) =>
      escapeValue(escapeShellBangs(value)),
    );
  return content_2;
}
export {
  getPluginCommands,
  skillNameMatches,
  stripSkillNamespacePrefix,
  loadPluginSkills,
  validatePluginCommandAllowedTools,
  MAX_PLUGIN_COMMAND_FILE_BYTES,
  isSkillFile_2,
  frontmatterDisallowedTools,
  memoizeLastValue,
};
