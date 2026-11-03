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
import { u, array, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-e6aww6q8.js:1663434-1663518 placement
/**
 * memoizeLastValue：记录并复用同一键的上次结果。
 */
function memoizeLastValue(skillContentIntern, n, content) {
  let s = skillContentIntern.get(n);
  if (s !== undefined && s === content) return s;
  skillContentIntern.set(n, content);
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
//@ chunk-e6aww6q8.js:1663931-1664066 placement
/**
 * 去掉开头的 / 与 anthropic-skills:/claude-ai: 前缀。
 */
function stripSkillNamespacePrefix(e) {
  let trimmed = e.trim();
  let r = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  let found = SKILL_NAMESPACE_PREFIXES.find((h) => r.startsWith(h));
  return found === undefined ? r : r.slice(found.length);
}
//@ chunk-e6aww6q8.js:1664066-1664236 placement
/**
 * 技能名相等（含 name:name 形式）或规范化后相等。
 */
function skillNameMatches(e, n, r) {
  let lower = n.trim().toLowerCase();
  if (!lower) return false;
  let lower_2 = e.trim().toLowerCase();
  if (lower_2 === lower || (r && `${lower_2}:${lower_2}` === lower)) return true;
  let y = normalizeSkillName(n);
  return y !== "" && normalizeSkillName(lower_2) === y;
}
//@ chunk-e6aww6q8.js:1664266-1664362 placement
var MAX_PLUGIN_SKILLS_FILE_BYTES = 8388608;
var pluginSkillsConfigSchema = DoctorLazy(() =>
  u({
    skills: array(
      u({
        name: string(),
        enabled: M(),
      }),
    ),
  }),
);
var ALL_SKILLS_ON = {
  kind: "all-on",
};
var MAX_PLUGIN_COMMAND_VARIANTS = 100;
//@ chunk-e6aww6q8.js:1664362-1664502 placement
async function listPluginSkillFilesSettled(path) {
  let n = join(path, "manifest.json");
  let r = await listPluginSkillFiles(n);
  if (!r.maybeMidWrite) return r.list;
  await sleep(MAX_PLUGIN_COMMAND_VARIANTS);
  return (await listPluginSkillFiles(n)).list;
}
//@ chunk-e6aww6q8.js:1664502-1664672 placement
function computeDisabledSkills(e, n) {
  if (e.kind === "all-on") return new Set();
  let r = new Set(n);
  let any = [...e.off].some((h) => !r.has(h));
  return new Set(n.filter((h) => e.off.has(h) || (any && !e.listed.has(h))));
}
//@ chunk-e6aww6q8.js:1664672-1665667 placement
async function listPluginSkillFiles(e) {
  let n;
  try {
    n = await getMcpAuthCache_2(e, MAX_PLUGIN_SKILLS_FILE_BYTES);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return {
      list: skillListReadFailure(errnoCode),
      maybeMidWrite: errnoCode === "ENOENT" || isUnavailableErrorCode(errnoCode),
    };
  }
  switch (n.kind) {
    case "absent":
      return {
        list: n.code === "ENOENT" ? ALL_SKILLS_ON : skillListReadFailure(n.code),
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
  let r;
  try {
    r = jsonParse(n.content);
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
  let s = pluginSkillsConfigSchema().safeParse(r);
  if (!s.success)
    return {
      list: {
        kind: "unusable",
        code: "plugin_skill_list_wrong_shape",
        why: "is not a list of skills that each have a name and an enabled flag",
      },
      maybeMidWrite: false,
    };
  let h = new Set();
  let y = new Set();
  for (let skill of s.data.skills) {
    y.add(skill.name);
    if (!skill.enabled) h.add(skill.name);
  }
  return {
    list:
      h.size === 0
        ? ALL_SKILLS_ON
        : {
            kind: "some-off",
            off: h,
            listed: y,
          },
    maybeMidWrite: false,
  };
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
/**
 * MAX_PLUGIN_COMMAND_FILE_BYTES：插件命令文件体积上限。
 */
var MAX_PLUGIN_COMMAND_FILE_BYTES = 1048576;
//@ chunk-e6aww6q8.js:1665808-1666717 placement
function validatePluginCommandAllowedTools(source, text, r) {
  let { frontmatter, frontmatterAsWritten, asWrittenProblem, content, parseError } = parseFrontmatter(
    text,
    source.filePath,
    {
      normalizeKeys: true,
      untrusted: true,
    },
  );
  if (parseError !== undefined) return null;
  let L = applyCommandMetadataOverrides(frontmatter, source.config.metadata);
  let joined = [L["allowed-tools"]]
    .flat()
    .filter((we) => typeof we === "string")
    .join();
  let q = {
    path: source.pluginPath,
    source: source.sourceName,
    dataDir: r,
  };
  let Z =
    joined.length + estimateSubstitutedGrowth(joined, q, source.filePath) > MAX_UNTRUSTED_FRONTMATTER_BYTES;
  let Se = Z || needsUnknownDataDir(joined, q);
  if (Se)
    logForDebugging(
      `Plugin command ${source.commandName}: its allowed-tools are dropped: ${Z ? "filled in, they could be too long, or a folder they name holds a variable or a $" : "they name the plugin's data folder, which did not come with the plugin"}`,
      {
        level: "warn",
      },
    );
  let ke = {
    filePath: source.filePath,
    baseDir: source.baseDir,
    frontmatter: Se
      ? {
          ...L,
          "allowed-tools": "",
        }
      : L,
    skillFile: buildFrontmatterResult(frontmatterAsWritten, undefined, asWrittenProblem),
    content: memoizeLastValue(getHostState().skillContentIntern, source.filePath, content),
  };
  return createPluginCommand(
    source.commandName,
    ke,
    source.sourceName,
    source.pluginManifest,
    source.pluginPath,
    source.provenance ?? {},
    source.isSkill,
    source.config,
    r,
  );
}
//@ chunk-e6aww6q8.js:1666717-1666959 layout
/**
 * 把 manifest commands 对象形式里的元数据（description、argumentHint、model、allowedTools）覆盖到 markdown frontmatter 上。
 */
function applyCommandMetadataOverrides(frontmatter, n) {
  if (n === undefined) return frontmatter;
  return {
    ...frontmatter,
    ...(n.description && {
      description: n.description,
    }),
    ...(n.argumentHint && {
      "argument-hint": n.argumentHint,
    }),
    ...(n.model && {
      model: n.model,
    }),
    ...(n.allowedTools && {
      "allowed-tools": n.allowedTools.join(","),
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
//@ chunk-e6aww6q8.js:1667561-1668178 fingerprint = collectMarkdownFiles (0.408)
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
  return files.sort((y, S) => y.filePath.localeCompare(S.filePath));
}
//@ chunk-e6aww6q8.js:1668487-1668700 fingerprint = loadCommandsFromDirectory (1)
async function loadCommandsFromDirectory(
  commandsPath,
  pluginName,
  sourceName,
  pluginManifest,
  pluginPath,
  pluginTrustContext,
  S = {
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
      S,
    );
    if (command) commands.push(command);
  }
  return commands;
}
//@ chunk-e6aww6q8.js:1668700-1674044 fingerprint = createPluginCommand (0.643)
/**
 * 由插件的 markdown 文件构造斜杠命令：命令名 <插件>:<相对路径>（技能目录用目录名），解析 frontmatter（description、allowed-tools、argument-hint、model、disable-model-invocation…），正文在调用时替换 $ARGUMENTS、${CLAUDE_PLUGIN_ROOT}、${user_config.X}。
 */
function createPluginCommand(
  source,
  file,
  r,
  s,
  h,
  y,
  S,
  w = {
    isSkillMode: false,
  },
  L,
) {
  if (y.marketplaceSource !== undefined) {
    let G = redactMarketplaceSource(y.marketplaceSource);
    if (G === null) {
      let { marketplaceSource, ...Z } = y;
      y = Z;
    } else
      y = {
        ...y,
        marketplaceSource: G,
      };
  }
  if (y.npmResolution !== undefined) {
    let G = redactNpmTarball(y.npmResolution);
    if (G === null) {
      let { npmResolution, ...Z } = y;
      y = Z;
    } else if (G !== y.npmResolution)
      y = {
        ...y,
        npmResolution: G,
      };
  }
  try {
    if (!isSkillFilePathOrIdentifier(source)) {
      reportRefusedSkillName(source, "is not offered");
      return null;
    }
    let { frontmatter, content } = file;
    let validatedDescription = coerceDescriptionToString(frontmatter.description, source);
    let ke = dirname(file.filePath);
    let we = (yo) => {
      let Ho = substitutePluginVariables(yo, {
        path: h,
        source: r,
        dataDir: L,
        ...(getToolsMachine() && {
          projectDir: null,
        }),
      });
      if (w.isSkillMode) Ho = Ho.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => ke);
      return Ho;
    };
    let Ee = frontmatter["allowed-tools"];
    let toolsValue =
      typeof Ee === "string"
        ? we(Ee)
        : Array.isArray(Ee)
          ? Ee.map((tool) => (typeof tool === "string" ? we(tool) : tool))
          : Ee;
    let allowedTools = parseSlashCommandToolsFromFrontmatter(toolsValue);
    let filtered = allowedTools.filter((allowedTool) => !allowedTool.includes(PROJECT_DIR_PLACEHOLDER));
    if (filtered.length < allowedTools.length)
      logForDebugging(
        `Plugin command ${source}: loaded without ${allowedTools.length - filtered.length} of its allowed-tools entries, which name CLAUDE_PROJECT_DIR, because this process has no folder where the tools run`,
        {
          level: "warn",
        },
      );
    let We = frontmatterDisallowedTools(frontmatter);
    let argumentNames = normalizeArgumentNames(frontmatter.arguments);
    let {
      description,
      argumentHint,
      argumentNames: argumentNames_2,
      whenToUse,
    } = displaySkillFields({
      description:
        validatedDescription ??
        extractDescriptionFromMarkdown(content, S ? "Plugin skill" : "Plugin command"),
      argumentHint: frontmatter["argument-hint"] != null ? String(frontmatter["argument-hint"]) : undefined,
      argumentNames,
      whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : undefined,
    });
    let version = frontmatter.version != null ? String(frontmatter.version) : undefined;
    let frontmatterName = parseFrontmatterName(frontmatter.name, `plugin command ${source}`);
    let sliced = source.slice(0, source.lastIndexOf(":") + 1);
    let At = frontmatterName
      ? frontmatterName.startsWith(sliced)
        ? frontmatterName
        : `${sliced}${frontmatterName}`
      : source;
    let It =
      frontmatterName && !frontmatterName.includes(":")
        ? /\s/.test(frontmatterName) && areSkillsConvertedAsPlugins()
          ? [frontmatterName, source.slice(sliced.length)]
          : [frontmatterName]
        : undefined;
    let Yt = !!frontmatterName && !(isSkillPathEligible(frontmatterName) && isSkillPathEligible(At));
    let model = frontmatter.model;
    let Zt;
    if (typeof model === "string" && model.trim().length > 0) {
      let trimmed = model.trim();
      Zt = trimmed.toLowerCase() === "inherit" ? "inherit" : parseUserSpecifiedModel(trimmed);
    }
    let effort = frontmatter.effort;
    let pn = effort !== undefined ? parseEffortValue(effort) : undefined;
    if (effort !== undefined && pn === undefined)
      logForDebugging(
        `Plugin command ${source} has invalid effort '${effort}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
      );
    let disableModelInvocation = parseBooleanFrontmatter(frontmatter["disable-model-invocation"]);
    let hn = frontmatter["user-invocable"];
    let ho = hn === undefined ? true : parseBooleanFrontmatter(hn);
    let yn;
    let shell = directoryPluginFallbackName(h, SYNCED);
    if (ho && !(S && Yt) && marketplaceSuffix(r) === SYNCED && isUuid(shell)) {
      let yo = dirname(file.filePath);
      let Ho = S
        ? normalizeSkillName(frontmatterName?.trim() || (yo === h ? shell : basename(yo)))
        : source.slice(source.indexOf(":") + 1);
      let rr = `${shell}:${Ho}`;
      if (Ho !== "" && rr !== source && rr !== At) yn = rr;
    }
    let shellFrontmatter = parseShellFrontmatter(frontmatter.shell, source);
    let fo;
    let To = false;
    let bo = hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS);
    let vn =
      !(S || w.isSkillMode) &&
      frontmatter.hooks !== undefined &&
      frontmatter.hooks !== null &&
      (typeof frontmatter.hooks !== "object" ||
        (Array.isArray(frontmatter.hooks) &&
          frontmatter.hooks.some((hook) => !hook || typeof hook !== "object")) ||
        hasGuardHooks_2(frontmatter.hooks) ||
        containsHooks(frontmatter.hooks));
    if (bo || vn) {
      To = true;
      logForDebugging(
        `Plugin skill '${source}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
        {
          level: "error",
        },
      );
    } else if ((S || w.isSkillMode) && frontmatter.hooks) {
      let rawSkillDir = validateHooksSetting(frontmatter.hooks);
      for (let note of rawSkillDir.notes)
        logForDebugging(`Plugin skill '${source}': ${note}`, {
          level: "warn",
        });
      let Ho = HooksSchema().safeParse(frontmatter.hooks);
      if (rawSkillDir.unloadableGuards.length > 0 || !Ho.success) {
        To = true;
        logForDebugging(
          `Plugin skill '${source}': ${rawSkillDir.unloadableGuards.join("; ") || Ho.error?.message || "hooks unreadable"} \u2014 ${UNLOADABLE_GUARD_NOTE} (the skill loads with no hooks and no allowed-tools)`,
          {
            level: "error",
          },
        );
      } else fo = Ho.data;
    }
    let co = fo !== undefined && hasGuardHooks_2(fo) && shouldSkipSessionHooksByPolicy();
    let So = !To && !co;
    let allowedTools_2 = So ? filtered : [];
    let un = false;
    let ao = () => {
      let yo = shouldLoadPermissionRules(fo, r) ? [] : ($o.allowedTools ?? []);
      let Ho =
        yo.length === 0
          ? undefined
          : frontmatterToolGrantWithheldReason("plugin", {
              id: r,
              ...y,
            });
      if (Ho === undefined) {
        un = false;
        return yo;
      }
      if (!un) {
        un = true;
        reportIgnoredFrontmatterToolGrants(
          source,
          {
            pluginId: r,
          },
          yo,
          Ho,
        );
      }
      return [];
    };
    let $o = {
      type: "prompt",
      name: source,
      description,
      hasUserSpecifiedDescription: validatedDescription !== null,
      allowedTools: allowedTools_2,
      ...(So &&
        allowedTools.length > 0 && {
          getAllowedTools: async () => ao(),
        }),
      disallowedTools: We.length > 0 ? We : undefined,
      argumentHint,
      argNames: argumentNames_2.length > 0 ? argumentNames_2 : undefined,
      whenToUse,
      version,
      model: Zt,
      effort: pn,
      context: frontmatter.context === "fork" ? "fork" : undefined,
      agent: frontmatter.agent != null ? String(frontmatter.agent) : undefined,
      background: parseBooleanishFrontmatter(frontmatter.background),
      disableModelInvocation,
      userInvocable: ho,
      declaredFields: getDeclaredFrontmatterFields(frontmatter),
      metadata: isPlainObject_5(frontmatter.metadata) ? frontmatter.metadata : undefined,
      contentLength: content.length,
      source: "plugin",
      loadedFrom: S || w.isSkillMode ? "plugin" : undefined,
      hooks: fo,
      skillRoot: (S || w.isSkillMode) && fo ? h : undefined,
      skillDir: S || w.isSkillMode ? dirname(file.filePath) : undefined,
      skillFile: file.skillFile,
      pluginInfo: {
        pluginManifest: s,
        repository: r,
        ...(y.officiallyAttested && {
          officiallyAttested: true,
        }),
        ...(y.marketplaceSource && {
          marketplaceSource: y.marketplaceSource,
        }),
        ...(y.npmResolution && {
          npmResolution: y.npmResolution,
        }),
        ...(y.home !== undefined && {
          home: y.home,
        }),
      },
      pluginSource: {
        commandName: source,
        filePath: file.filePath,
        baseDir: file.baseDir,
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
      aliases: Yt ? undefined : It,
      shedAliases: Yt ? It : undefined,
      ...(yn !== undefined && {
        directoryListingName: yn,
      }),
      async getPromptForCommand(args, context) {
        let rr = w.isSkillMode
          ? `Base directory for this skill: ${dirname(file.filePath)}

${content}`
          : content;
        let br = skillWatchStateSlot.get();
        if (br !== undefined)
          rr = await br(rr, {
            isPreload: context.options.isSkillPreload === true,
          });
        let options = s.userConfig ? await loadPluginOptions(r, context.credentials) : undefined;
        let effortLevel = getEffortLevelOrHigh(
          inlineSkillModelOverride(Zt) ?? context.options.mainLoopModel,
          getEffortValue(context),
          pn ?? getEffortLayerOverride(context.permissionLayers),
        );
        let cs = {
          pluginPath: h,
          sourceName: r,
          pluginDataDir: L,
          userConfig: s.userConfig,
          options,
          skillDir: w.isSkillMode ? ke : undefined,
          effortLevel,
        };
        rr = substituteArguments(
          rr,
          args,
          true,
          argumentNames,
          (_r) => escapeShellBangs(substituteSkillVariables(_r, cs)),
          (_r, Cr) => substituteSkillVariables(_r, cs, Cr),
        );
        if (isSkillShellExecutionDisabled()) rr = replacePromptShellCommands(rr);
        else
          rr = await executeShellCommandsInPrompt(
            rr,
            {
              ...context,
              getAppState: withCommandAllowRules(context, ao()),
            },
            `/${source}`,
            shellFrontmatter,
            r,
          );
        return [
          {
            type: "text",
            text: rr,
          },
        ];
      },
    };
    if (Yt) {
      reportRefusedSkillName(At, `is not shown for ${source}`);
      clearUserFacingName($o);
    }
    return $o;
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
//@ chunk-e6aww6q8.js:1674355-1677759 fingerprint = getPluginCommands (0.756)
/**
 * 加载所有启用插件的命令（commands/ 目录与 manifest.commands），结果缓存在全局 commands。
 */
function getPluginCommands(e) {
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
    let { enabled, errors } = await loadAllPluginsCacheOnly(e);
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
    let h = null;
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
              h = "plugin_load_commands_dir_failed";
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
                    let lt = {
                      filePath: commandPath,
                      baseDir: dirname(commandPath),
                      frontmatter: applyCommandMetadataOverrides(frontmatter, metadataOverride),
                      skillFile: buildFrontmatterResult(frontmatterAsWritten, commandPath, asWrittenProblem),
                      content: memoizeLastValue(getHostState().skillContentIntern, commandPath, content_2),
                    };
                    let command = createPluginCommand(
                      commandName,
                      lt,
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
                  h = "plugin_load_commands_path_failed";
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
                  let Me = {
                    filePath: commandName_2,
                    baseDir: plugin.path,
                    frontmatter: applyCommandMetadataOverrides(frontmatter, metadata),
                    skillFile: buildFrontmatterResult(frontmatterAsWritten, undefined, asWrittenProblem),
                    content: memoizeLastValue(getHostState().skillContentIntern, commandName_2, content),
                  };
                  let command = createPluginCommand(
                    commandName,
                    Me,
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
                  h = "plugin_load_commands_inline_failed";
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
    if (h) logFeatureBad("plugin_load_commands", h);
    else logFeatureOk("plugin_load_commands");
    return allCommands;
  })();
  return pluginRegistry.commands;
}
//@ chunk-e6aww6q8.js:1677759-1677969 layout
async function realpathForDedupe(e) {
  try {
    return await realpath(e);
  } catch (error) {
    logForDebugging(
      `Could not resolve ${e} to de-duplicate it across plugins (${errorMessage(error)}); keeping the skill without cross-plugin de-duplication`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-e6aww6q8.js:1677969-1680227 fingerprint = loadSkillsFromDirectory (0.479)
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
  w,
) {
  let fs = getFsImplementation();
  let skills = [];
  let q = isSkillAttributionEnabled();
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
      computeDisabledSkills(w, [basename(skillsPath)]).size > 0 ||
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
      let ze = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
      let replaced = (
        (ze.startsWith(`${pluginName}:`) ? ze.slice(pluginName.length + 1) : ze) || basename(skillsPath)
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
          serverAttribution: q(file.baseDir),
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
  let ke;
  try {
    ke = await fs.readdir(skillsPath);
  } catch (e) {
    if (!isENOENT(e))
      logForDebugging(`Failed to load skills from directory ${skillsPath}: ${e}`, {
        level: "error",
      });
    return skills;
  }
  let filtered = ke.filter((entry) => entry.isDirectory() || entry.isSymbolicLink());
  let skillDirPath = computeDisabledSkills(
    w,
    filtered.map((Ae) => Ae.name),
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
      let We;
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
        We = smallFileChecked;
      } catch (e) {
        if (!isENOENT(e))
          logForDebugging(`Failed to load skill from ${skillFilePath}: ${e}`, {
            level: "error",
          });
        return;
      }
      if (isDuplicatePath(fs, skillFilePath, loadedPaths)) return;
      try {
        let { frontmatter, frontmatterAsWritten, asWrittenProblem, content } = parseFrontmatter(
          We,
          skillFilePath,
          {
            normalizeKeys: true,
          },
        );
        let skillName = `${pluginName}:${entry.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        let file = {
          filePath: skillFilePath,
          baseDir: dirname(skillFilePath),
          frontmatter,
          skillFile: buildFrontmatterResult(frontmatterAsWritten, skillFilePath, asWrittenProblem),
          content: memoizeLastValue(getHostState().skillContentIntern, skillFilePath, content),
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
            serverAttribution: q(file.baseDir),
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
  return skills.sort((Ae, Ie) => Ae.skill.name.localeCompare(Ie.skill.name));
}
//@ chunk-e6aww6q8.js:1680227-1682147 fingerprint = getPluginSkills (0.792)
/**
 * 加载所有启用插件的技能（skills/ 与 manifest.skills），按真实路径跨插件去重。
 */
async function getPluginSkills(e) {
  let { enabled, errors } = await loadAllPluginsCacheOnly(e);
  if (errors.length > 0)
    logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
  logForDebugging(`getPluginSkills: Processing ${enabled.length} enabled plugins`);
  let s = null;
  let h = new Map();
  let perPluginSkills = await Promise.all(
    enabled.map(async (plugin) => {
      let loadedPaths = new Set();
      let pluginSkills = [];
      logForDebugging(
        `Checking plugin ${plugin.name}: skillsPath=${plugin.skillsPath ? "exists" : "none"}, skillsPaths=${plugin.skillsPaths ? plugin.skillsPaths.length : 0} paths`,
      );
      let q =
        plugin.accountSkillsWrapper && desktopSkillSwitches()
          ? await listPluginSkillFilesSettled(plugin.path)
          : ALL_SKILLS_ON;
      if (q.kind === "unusable") {
        h.set(plugin, q.code);
        logForDebugging(
          `Loading no skills from plugin ${plugin.name}: the manifest.json at its root ${q.why}, so it does not say which skills are switched off`,
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
            q,
          );
          pluginSkills.push(...skills);
          logForDebugging(`Loaded ${skills.length} skills from plugin ${plugin.name} default directory`);
        } catch (error) {
          s = "plugin_load_skills_dir_failed";
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
                q,
              );
              logForDebugging(
                `Loaded ${skills.length} skills from plugin ${plugin.name} custom path: ${skillPath}`,
              );
              return skills;
            } catch (error) {
              s = "plugin_load_skills_path_failed";
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
  let found = enabled.map((w) => h.get(w)).find((w) => w !== undefined);
  return {
    entries: perPluginSkills.flat(),
    hadErrorCode: found ?? s,
  };
}
//@ chunk-e6aww6q8.js:1682147-1683072 placement
function loadPluginSkills(storage) {
  let pluginRegistry = getPluginRegistry();
  let r = isStorageV5Enabled() && storage !== undefined ? "skillsV5" : "skills";
  pluginRegistry[r] ??= (async () => {
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
    let [{ entries: s, hadErrorCode: h }, userSkillFileIds] = await Promise.all([
      getPluginSkills(storage),
      getUserSkillFileIds(storage),
    ]);
    let S = new Map();
    let w = [];
    for (let L of s) {
      let realpath = L.realpath;
      if (realpath === null) {
        w.push(L.skill);
        continue;
      }
      if (userSkillFileIds !== null && userSkillFileIds.has(realpath)) {
        logForDebugging(
          `Skipping plugin skill '${L.skill.name}' \u2014 ${realpath} is a user-level skill already surfaced by the skills directory loader`,
        );
        continue;
      }
      let q = S.get(realpath);
      if (q !== undefined) {
        logForDebugging(
          `Skipping duplicate plugin skill '${L.skill.name}' \u2014 ${realpath} already loaded as '${q}'`,
        );
        continue;
      }
      S.set(realpath, L.skill.name);
      w.push(L.skill);
    }
    logForDebugging(
      `Total plugin skills loaded: ${w.length} (${s.length - w.length} duplicate/user-owned entries skipped)`,
    );
    if (h) logFeatureBad("plugin_load_skills", h);
    else logFeatureOk("plugin_load_skills");
    return w;
  })();
  return pluginRegistry[r];
}
//@ chunk-e6aww6q8.js:1683072-1683472 placement
/**
 * 替换命令/技能内容里的变量：插件路径/来源/数据目录、${CLAUDE_SKILL_DIR}、${CLAUDE_SESSION_ID}、${CLAUDE_EFFORT}， 有用户配置时再替换 user_config 值。r 用于对替换值转义。
 */
function substituteSkillVariables(e, n, r = (s) => s) {
  let content = substitutePluginVariables(
    e,
    {
      path: n.pluginPath,
      source: n.sourceName,
      dataDir: n.pluginDataDir,
    },
    r,
  );
  if (n.skillDir !== undefined) {
    let S = r(n.skillDir);
    content = content.replace(/\$\{CLAUDE_SKILL_DIR\}/g, () => S);
  }
  let h = r(getSessionId());
  content = content.replace(/\$\{CLAUDE_SESSION_ID\}/g, () => h);
  let y = r(n.effortLevel);
  content = content.replaceAll("${CLAUDE_EFFORT}", () => y);
  if (n.userConfig && n.options)
    content = substituteUserConfigInContent(content, n.options, n.userConfig, (S) => r(escapeShellBangs(S)));
  return content;
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
