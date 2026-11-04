/**
 * utils/plugins/loadPluginAgents.ts
 *
 * 从插件 agents/ 目录加载子代理定义（frontmatter 解析、命名空间、禁止字段）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/loadPluginAgents.ts
 * pieces: chunk-bfnfj4kx.js (1), chunk-e6aww6q8.js (11)
 * attribution: fingerprint 3, placement 7, layout 2
 */
import { join, basename } from "path";
import { AgentFrontmatterSchema } from "../frontmatterSchema.js";
import { normalizeKey } from "../objectUtils.js";
import { similarNames } from "../settings/managedEnvKeys.js";
import { quotedListItem, formatFailureDetails_2, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { escapeControlCharsForDisplay } from "../stringUtils.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { walkPluginMarkdown } from "./walkPluginMarkdown.js";
import { getFsImplementation, isDuplicatePath } from "../fsOperations.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import {
  parseFrontmatter,
  parseFrontmatterName,
  coerceDescriptionToString,
  parsePositiveIntFromFrontmatter,
  parseBoundedIntFromFrontmatter,
  parseExperimentalCacheTtl,
} from "../frontmatterParser.js";
import {
  parseAgentToolsFromFrontmatter,
  parseSlashCommandToolsFromFrontmatter,
} from "../markdownConfigLoader.js";
import {
  substitutePluginVariables,
  substituteUserConfigInContent,
  loadPluginOptions,
} from "./pluginOptionsStorage.js";
import { parseEffortValue, EFFORT_LEVELS } from "../effort.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "../config.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { loadAgentMemoryPrompt } from "../../tools/AgentTool/agentMemory.js";
import { pluginDisplayKey } from "./pluginIdentifier.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { pluginErrorText } from "../../types/plugin.js";
import { pluginGrantProvenanceOf } from "../permissions/permissionsLoader.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bfnfj4kx.js:75173-75190 fingerprint (2.1.88 match: loadAgentsFromDirectory, 0.741)
/**
 * agents 目录名 "agents"，导出为 yos；加载 agents 文件时用它拼目录。
 */
var AGENTS_DIR_NAME = "agents";
//@ chunk-e6aww6q8.js:2316979-2317099 placement
var RENAMED_AGENT_FRONTMATTER_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WHEN_TO_USE_KEY_SPELLINGS;
deferInit("chunk-e6aww6q8.js:2316979", () => {
  RENAMED_AGENT_FRONTMATTER_KEYS = new Map([
    ["allowedtools", "tools"],
    ["whentouse", "description"],
    ["mode", null],
  ]);
  WHEN_TO_USE_KEY_SPELLINGS = ["when_to_use", "when-to-use"];
});
//@ chunk-e6aww6q8.js:2317099-2317779 placement
function validatePluginAgentFrontmatter({ subject, filePath, frontmatter, unhintedKeys = [] }) {
  try {
    let keys = Object.keys(AgentFrontmatterSchema().shape);
    let knownKeys = subject === "Plugin agent file" ? [...keys, ...WHEN_TO_USE_KEY_SPELLINGS] : keys;
    let keySet = new Set(knownKeys);
    let filtered = knownKeys.filter((key) => !unhintedKeys.includes(key));
    let filtered_2 = Object.keys(frontmatter).filter((key) => !keySet.has(key));
    let mapped = filtered_2.map((key) => {
      let renamed = RENAMED_AGENT_FRONTMATTER_KEYS.get(normalizeKey(key));
      let suggested =
        renamed !== undefined
          ? (renamed ?? undefined)
          : (filtered.find((candidate) => normalizeKey(candidate) === normalizeKey(key)) ??
            similarNames(key, filtered, 1)[0]);
      return suggested !== undefined && filtered.includes(suggested)
        ? `${quotedListItem(key)} (did you mean "${suggested}"?)`
        : quotedListItem(key);
    });
    let message =
      filtered_2.length === 0
        ? ""
        : `${subject} ${escapeControlCharsForDisplay(filePath)} has ${filtered_2.length === 1 ? "a frontmatter key" : "frontmatter keys"} Claude Code does not recognize or apply: ${formatFailureDetails_2(mapped)}`;
    if (
      claimOnce().claimIfChanged(`agent-frontmatter-unknown-keys:${subject}:${filePath}`, message) &&
      message !== ""
    )
      logForDebugging(message, {
        level: "warn",
      });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2317809-2317970 placement
var builtinAgentFilesFromBundle = (pluginName, files) =>
  Object.entries(files)
    .filter(([key]) => key.startsWith(`${AGENTS_DIR_NAME}/`))
    .map(([key, value]) => ({
      filePath: `builtin:${pluginName}/${key}`,
      namespace: key.split("/").slice(1, -1),
      text: value,
    }));
//@ chunk-e6aww6q8.js:2317970-2318132 placement
function getBuiltinPluginAgentsSource(pluginName) {
  let hooksModule = getBuiltinPlugin(pluginName)?.hooksModule;
  let isFolder = hooksModule !== undefined && "folder" in hooksModule;
  let filesSource =
    hooksModule !== undefined && "files" in hooksModule
      ? {
          files: builtinAgentFilesFromBundle(pluginName, hooksModule.files),
        }
      : undefined;
  return isFolder
    ? {
        folder: join(hooksModule.folder, AGENTS_DIR_NAME),
      }
    : filesSource;
}
//@ chunk-e6aww6q8.js:2318132-2318179 placement (2.1.88 match: isMcpServerFromProjectOrLocalSettings, 1)
var MAX_PLUGIN_AGENT_FILE_BYTES = 1048576;
var PLUGIN_AGENT_SCOPES = ["user", "project", "local"];
//@ chunk-e6aww6q8.js:2318179-2318359 placement
async function loadAgentsFromDir(
  rootDir,
  pluginName,
  source,
  path,
  manifest,
  loadedPaths,
  credentials,
  isRootOptional = false,
) {
  let agents = [];
  await walkPluginMarkdown(
    rootDir,
    async (filePath, namespace) => {
      let agentFile = await loadAgentFile(
        filePath,
        pluginName,
        namespace,
        source,
        path,
        manifest,
        credentials,
      );
      if (agentFile) agents.push(agentFile);
    },
    {
      logLabel: "agents",
      isRootOptional,
      loadedPaths,
    },
  );
  return agents;
}
//@ chunk-e6aww6q8.js:2318359-2318755 placement
/**
 * 读取单个插件代理 markdown（非普通文件或超过 jan 字节跳过并记 warn），交给 loadAgentFromFile 解析；出错返回 null。
 */
async function loadAgentFile(
  filePath,
  pluginName,
  namespace,
  sourceName,
  pluginPath,
  pluginManifest,
  credentials,
) {
  let fsImplementation = getFsImplementation();
  try {
    let smallFileChecked = await readSmallFileChecked(
      fsImplementation,
      filePath,
      MAX_PLUGIN_AGENT_FILE_BYTES,
    );
    if (smallFileChecked === null) {
      logForDebugging(
        `Skipping plugin agent ${filePath}: not a regular file or exceeds ${MAX_PLUGIN_AGENT_FILE_BYTES} byte limit`,
        {
          level: "warn",
        },
      );
      return null;
    }
    return await loadAgentFromFile({
      filePath,
      content: smallFileChecked,
      pluginName,
      namespace,
      sourceName,
      pluginPath,
      pluginManifest,
      credentials,
    });
  } catch (error) {
    logForDebugging(`Failed to load agent from ${filePath}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:2318755-2318873 layout
var PLUGIN_AGENT_FORBIDDEN_FIELDS = ["permissionMode", "hooks", "mcpServers"];
var PLUGIN_AGENT_IGNORED_FIELDS = ["initialPrompt", "observer", "observerMessage", "observeSubagents"];
//@ chunk-e6aww6q8.js:2318873-2321705 fingerprint (2.1.88 match: loadAgentFromFile, 0.676)
/**
 * 从插件的 agents/*.md 解析一个代理定义：frontmatter（name、description、tools、model、color…，插件代理禁止 permissionMode/hooks/mcpServers 等字段），名字加 <插件>: 命名空间，正文作为系统提示（替换插件变量与 user_config）。
 */
async function loadAgentFromFile({
  filePath,
  content,
  pluginName,
  namespace,
  sourceName,
  pluginPath,
  pluginManifest,
  credentials,
  untrusted,
  pluginDataDir,
}) {
  let {
    frontmatter,
    content: markdownContent,
    parseError,
  } = parseFrontmatter(content, filePath, {
    normalizeKeys: true,
    untrusted,
  });
  if (untrusted && parseError !== undefined) throw Error("the frontmatter is refused or does not parse");
  let baseAgentName =
    parseFrontmatterName(frontmatter.name, `plugin agent ${filePath}`) ||
    basename(filePath).replace(/\.md$/, "");
  let agentType = [pluginName, ...namespace, baseAgentName].join(":");
  let whenToUse =
    coerceDescriptionToString(frontmatter.description, agentType) ??
    coerceDescriptionToString(frontmatter.when_to_use, agentType) ??
    coerceDescriptionToString(frontmatter["when-to-use"], agentType) ??
    `Agent from ${pluginName} plugin`;
  let tools = parseAgentToolsFromFrontmatter(frontmatter.tools);
  let skills = parseSlashCommandToolsFromFrontmatter(frontmatter.skills);
  let { color, model: modelRaw } = frontmatter;
  let model;
  if (typeof modelRaw === "string" && modelRaw.trim().length > 0) {
    let trimmed = modelRaw.trim();
    model = trimmed.toLowerCase() === "inherit" ? "inherit" : trimmed;
  }
  let backgroundRaw = frontmatter.background;
  let background = backgroundRaw === "true" || backgroundRaw === true ? true : undefined;
  let omitClaudeMd = frontmatter.omitClaudeMd;
  let omitClaudeMdFlag = omitClaudeMd === "true" || omitClaudeMd === true ? true : undefined;
  let systemPrompt = substitutePluginVariables(markdownContent.trim(), {
    path: pluginPath,
    source: sourceName,
    dataDir: pluginDataDir,
  });
  if (pluginManifest.userConfig)
    systemPrompt = substituteUserConfigInContent(
      systemPrompt,
      await loadPluginOptions(sourceName, credentials),
      pluginManifest.userConfig,
    );
  let memoryRaw = frontmatter.memory;
  let memory;
  if (memoryRaw !== undefined)
    if (PLUGIN_AGENT_SCOPES.includes(memoryRaw)) memory = memoryRaw;
    else
      logForDebugging(
        `Plugin agent file ${filePath} has invalid memory value '${memoryRaw}'. Valid options: ${PLUGIN_AGENT_SCOPES.join(", ")}`,
      );
  let isolation = frontmatter.isolation === "worktree" ? "worktree" : undefined;
  let effortRaw = frontmatter.effort;
  let effort = effortRaw !== undefined ? parseEffortValue(effortRaw) : undefined;
  if (effortRaw !== undefined && effort === undefined)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid effort '${effortRaw}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
    );
  let displayPath = escapeControlCharsForDisplay(filePath);
  for (let field of PLUGIN_AGENT_FORBIDDEN_FIELDS)
    if (frontmatter[field] !== undefined)
      logForDebugging(
        `Plugin agent file ${displayPath} sets ${field}, which is ignored for plugin agents. Use .claude/agents/ for this level of control.`,
        {
          level: "warn",
        },
      );
  for (let field of PLUGIN_AGENT_IGNORED_FIELDS)
    if (frontmatter[field] !== undefined)
      logForDebugging(
        `Plugin agent file ${displayPath} sets ${field}, which is ignored for plugin agents. Define the agent in .claude/agents/ to use ${field}.`,
        {
          level: "warn",
        },
      );
  validatePluginAgentFrontmatter({
    subject: "Plugin agent file",
    filePath,
    frontmatter,
    unhintedKeys: [...PLUGIN_AGENT_FORBIDDEN_FIELDS, ...PLUGIN_AGENT_IGNORED_FIELDS],
  });
  let maxTurnsRaw = frontmatter.maxTurns;
  let maxTurns = parsePositiveIntFromFrontmatter(maxTurnsRaw);
  if (maxTurnsRaw !== undefined && maxTurns === undefined)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid maxTurns '${maxTurnsRaw}'. Must be a positive integer.`,
    );
  let autoCompactWindow = frontmatter.autoCompactWindow;
  let boundedIntFromFrontmatter = parseBoundedIntFromFrontmatter(autoCompactWindow);
  if (autoCompactWindow !== undefined && boundedIntFromFrontmatter === undefined)
    logForDebugging(
      `Plugin agent file ${filePath} has invalid autoCompactWindow '${autoCompactWindow}'. Must be an integer from ${TRANSPORT_LABELS} to ${GLOBAL_CONFIG_FIELD_KINDS}.`,
      {
        level: "warn",
      },
    );
  let experimentalCacheTtl = parseExperimentalCacheTtl(frontmatter);
  let disallowedTools =
    frontmatter.disallowedTools !== undefined
      ? parseAgentToolsFromFrontmatter(frontmatter.disallowedTools)
      : undefined;
  if (isAutoMemoryEnabled() && memory && tools !== undefined) {
    let toolSet = new Set(tools);
    for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
      if (!toolSet.has(tool)) tools = [...tools, tool];
  }
  return {
    agentType,
    whenToUse,
    tools,
    ...(disallowedTools !== undefined && {
      disallowedTools,
    }),
    ...(skills !== undefined && {
      skills,
    }),
    getSystemPrompt: (context) => {
      if (isAutoMemoryEnabled() && memory) {
        let memoryPrompt = loadAgentMemoryPrompt(
          agentType,
          memory,
          context?.toolUseContext?.storageV5,
          context?.primedAgentMemory,
        );
        return (
          systemPrompt +
          `

` +
          memoryPrompt
        );
      }
      return systemPrompt;
    },
    source: "plugin",
    color,
    model,
    filename: baseAgentName,
    filePath,
    plugin: sourceName,
    pluginSource: {
      filePath,
      pluginName,
      namespace,
      sourceName,
      pluginPath,
      pluginManifest,
    },
    ...(background && {
      background,
    }),
    ...(omitClaudeMdFlag && {
      omitClaudeMd: omitClaudeMdFlag,
    }),
    ...(memory && {
      memory,
    }),
    ...(isolation && {
      isolation,
    }),
    ...(effort !== undefined && {
      effort,
    }),
    ...(maxTurns !== undefined && {
      maxTurns,
    }),
    ...(boundedIntFromFrontmatter !== undefined && {
      autoCompactWindow: boundedIntFromFrontmatter,
    }),
    ...(experimentalCacheTtl !== undefined && {
      cacheTtl: experimentalCacheTtl,
    }),
  };
}
//@ chunk-e6aww6q8.js:2321705-2322206 layout
/**
 * 内置插件：hooksModule 给的是目录就按目录遍历加载，给的是打包文件就逐个解析内容；失败的条目记错误并丢弃。
 */
async function loadBuiltinPluginAgents(plugin, loadedPaths, credentials) {
  let builtinPluginAgentsSource = getBuiltinPluginAgentsSource(plugin.name);
  if (builtinPluginAgentsSource === undefined) return [];
  let displayName = pluginDisplayKey(plugin.name, plugin.source);
  if ("folder" in builtinPluginAgentsSource)
    return loadAgentsFromDir(
      builtinPluginAgentsSource.folder,
      displayName,
      plugin.source,
      plugin.path,
      plugin.manifest,
      loadedPaths,
      credentials,
      true,
    );
  return (
    await Promise.all(
      builtinPluginAgentsSource.files.map(async (file) => {
        try {
          return await loadAgentFromFile({
            filePath: file.filePath,
            content: file.text,
            pluginName: displayName,
            namespace: file.namespace,
            sourceName: plugin.source,
            pluginPath: plugin.path,
            pluginManifest: plugin.manifest,
            credentials,
          });
        } catch (error) {
          logForDebugging(`Failed to load agent from ${file.filePath}: ${error}`, {
            level: "error",
          });
          return null;
        }
      }),
    )
  ).filter((agent) => agent !== null);
}
//@ chunk-e6aww6q8.js:2322206-2323863 fingerprint (2.1.88 match: loadPluginAgents, 0.827)
/**
 * 加载所有启用插件的代理（缓存在全局 agents），扫描 agentsPath/agentsPaths 下的 markdown。
 */
function loadPluginAgents(storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.agents ??= (async () => {
    let { enabled, errors } = await loadAllPluginsCacheOnly(storageV5);
    if (pluginRegistry.handedIn !== undefined) {
      let results = await Promise.all(
        enabled
          .filter((plugin) => plugin.isBuiltin)
          .map((plugin) => loadBuiltinPluginAgents(plugin, new Set(), credentials)),
      );
      return [...(await pluginRegistry.handedIn).agents, ...results.flat()];
    }
    if (errors.length > 0)
      logForDebugging(`Plugin loading errors: ${errors.map((e) => pluginErrorText(e)).join(", ")}`);
    let failureKind = null;
    let agents = (
      await Promise.all(
        enabled.map(async (plugin) => {
          let loadedPaths = new Set();
          let pluginAgents = [];
          if (plugin.agentsPath)
            try {
              let agents = await loadAgentsFromDir(
                plugin.agentsPath,
                plugin.name,
                plugin.source,
                plugin.path,
                plugin.manifest,
                loadedPaths,
                credentials,
              );
              pluginAgents.push(...agents);
              if (agents.length > 0)
                logForDebugging(
                  `Loaded ${agents.length} agents from plugin ${plugin.name} default directory`,
                );
            } catch (error) {
              failureKind = "plugin_load_agents_dir_failed";
              logForDebugging(
                `Failed to load agents from plugin ${plugin.name} default directory: ${error}`,
                {
                  level: "error",
                },
              );
            }
          if (plugin.agentsPaths) {
            let pathResults = await Promise.all(
              plugin.agentsPaths.map(async (agentPath) => {
                try {
                  let fs = getFsImplementation();
                  let stats = await fs.stat(agentPath);
                  if (stats.isDirectory()) {
                    let agents = await loadAgentsFromDir(
                      agentPath,
                      plugin.name,
                      plugin.source,
                      plugin.path,
                      plugin.manifest,
                      loadedPaths,
                      credentials,
                    );
                    if (agents.length > 0)
                      logForDebugging(
                        `Loaded ${agents.length} agents from plugin ${plugin.name} custom path: ${agentPath}`,
                      );
                    return agents;
                  } else if (stats.isFile() && agentPath.endsWith(".md")) {
                    if (isDuplicatePath(fs, agentPath, loadedPaths)) return [];
                    let agent = await loadAgentFile(
                      agentPath,
                      plugin.name,
                      [],
                      plugin.source,
                      plugin.path,
                      plugin.manifest,
                      credentials,
                    );
                    if (agent) {
                      logForDebugging(`Loaded agent from plugin ${plugin.name} custom file: ${agentPath}`);
                      return [agent];
                    }
                  }
                  return [];
                } catch (error) {
                  failureKind = "plugin_load_agents_path_failed";
                  logForDebugging(
                    `Failed to load agents from plugin ${plugin.name} custom path ${agentPath}: ${error}`,
                    {
                      level: "error",
                    },
                  );
                  return [];
                }
              }),
            );
            for (let agents of pathResults) pluginAgents.push(...agents);
          }
          if (plugin.isBuiltin)
            pluginAgents.push(...(await loadBuiltinPluginAgents(plugin, loadedPaths, credentials)));
          let pluginProvenance = pluginGrantProvenanceOf(plugin);
          return pluginAgents.map((pluginAgent) =>
            pluginAgent.source === "plugin"
              ? {
                  ...pluginAgent,
                  pluginProvenance,
                }
              : pluginAgent,
          );
        }),
      )
    ).flat();
    logForDebugging(`Total plugin agents loaded: ${agents.length}`);
    if (failureKind) logFeatureBad("plugin_load_agents", failureKind);
    else logFeatureOk("plugin_load_agents");
    return agents;
  })();
  return pluginRegistry.agents;
}
export { loadPluginAgents, validatePluginAgentFrontmatter };
