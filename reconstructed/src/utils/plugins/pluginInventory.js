/**
 * utils/plugins/pluginInventory.ts
 *
 * 2.1.316 新增：测算插件组件常驻和调用时的令牌开销。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k9mgeeff.js (14)
 * attribution: placement 14
 */
import * as pathModule from "path";
import * as fsPromisesModule from "fs/promises";
import { getBuiltinPlugin } from "../../plugins/builtinPlugins.js";
import { isOfficialMarketplace, parsePluginIdentifier, isProjectLocalPlugin } from "./pluginIdentifier.js";
import { pluginManifestPathSchemas } from "./schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import {
  getPluginByIdAnySource,
  findMissedListingEntry,
  getMarketplaceOrDirectoryCatalog,
} from "./marketplaceManager.js";
import { getBaseFileNames, getSkillDirNames } from "../../commands/plugin/ManagePlugins.js";
import { uniq } from "../collections.js";
import { loadPluginMcpServers } from "./mcpPluginIntegration.js";
import { roughTokenCountEstimation, countMessagesTokensWithAPI } from "../../services/tokenEstimation.js";
import { parseFrontmatter, coerceDescriptionToString } from "../frontmatterParser.js";
import { extractDescriptionFromMarkdown } from "../markdownConfigLoader.js";
import { displaySkillFields } from "../../skills/skillSources.js";
import { getSkillListingText } from "../../skills/loadSkillsDir.js";
import { jsonParse } from "../slowOperations.js";
import { resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isSyscallError, toError } from "../errors.js";
import { logError } from "../log.js";

//@ chunk-k9mgeeff.js:726-1795 placement = PluginComponentsDisplay (0.822)
async function getPluginInventory(plugin, name) {
  if (name === "builtin") {
    let builtinDef = getBuiltinPlugin(plugin.name);
    if (!builtinDef) throw Error(`Built-in plugin ${plugin.name} not found`);
    return {
      commands: [],
      agents: [],
      skills:
        builtinDef.skills?.map((skill) => ({
          name: skill.name,
        })) ?? [],
      hooks: builtinDef.hooks ? Object.keys(builtinDef.hooks) : [],
      mcpServers: builtinDef.mcpServers ? Object.keys(builtinDef.mcpServers) : [],
      lspServers: [],
    };
  }
  let isBuiltinLike = isOfficialMarketplace(name) || name === pluginManifestPathSchemas;
  let pluginName = parsePluginIdentifier(plugin.source).name || plugin.name;
  let listing =
    name === OFFICIAL_MARKETPLACE_NAME
      ? ((await getPluginByIdAnySource(`${pluginName}@${name}`, undefined, "load"))?.entry ??
        (await findMissedListingEntry(pluginName, undefined, true))?.entry)
      : undefined;
  let catalogEntry = isBuiltinLike
    ? undefined
    : (listing ??
      (await getMarketplaceOrDirectoryCatalog(name, undefined)).plugins.find(
        (plugin) => plugin.name === pluginName,
      ));
  if (!catalogEntry && !isBuiltinLike) throw Error(`Plugin ${pluginName} not found in marketplace ${name}`);
  let [baseFileNames, baseFileNames_2, skillDirNames] = await Promise.all([
    getBaseFileNames([plugin.commandsPath, ...(plugin.commandsPaths ?? [])]),
    getBaseFileNames([plugin.agentsPath, ...(plugin.agentsPaths ?? [])]),
    getSkillDirNames([plugin.skillsPath, ...(plugin.skillsPaths ?? [])], plugin.name),
  ]);
  let hooks = plugin.hooksConfig ? Object.keys(plugin.hooksConfig) : objectKeysOf(catalogEntry?.hooks);
  let mcpFromPlugin = plugin.mcpServers
    ? Object.keys(plugin.mcpServers)
    : uniq(await loadPluginMcpServers(plugin));
  let mcpServers = mcpFromPlugin.length > 0 ? mcpFromPlugin : objectKeysOf(catalogEntry?.mcpServers);
  let lspFromPlugin = plugin.lspServers
    ? Object.keys(plugin.lspServers)
    : (await readLspServerNames(plugin)).concat(objectKeysOf(plugin.manifest.lspServers));
  let lspServers = lspFromPlugin.length > 0 ? uniq(lspFromPlugin) : objectKeysOf(catalogEntry?.lspServers);
  return {
    commands: baseFileNames,
    agents: baseFileNames_2,
    skills: skillDirNames,
    hooks,
    mcpServers,
    lspServers,
  };
}
//@ chunk-k9mgeeff.js:1795-2384 placement
async function computePluginTokenCost(inventory, modelIds, pluginName) {
  let [skillCosts, agentCosts, commandCosts] = await Promise.all([
    Promise.all(
      inventory.skills.map((skill) =>
        measurePluginComponentCost(
          skill.path ? pathModule.join(skill.path, "SKILL.md") : undefined,
          qualifiedComponentName(skill, pluginName),
        ),
      ),
    ),
    Promise.all(inventory.agents.map((agent) => measurePluginComponentCost(agent.path, agent.name, "agent"))),
    Promise.all(
      inventory.commands.map((command) =>
        measurePluginComponentCost(command.path, qualifiedComponentName(command, pluginName)),
      ),
    ),
  ]);
  let costs = [...skillCosts, ...agentCosts, ...commandCosts];
  let text = costs.map((cost) => cost.alwaysOn).filter(Boolean).join(`
`);
  let text_2 = costs.map((cost) => cost.onInvoke).filter(Boolean).join(`

`);
  let tokensByModel = {};
  for (let modelId of modelIds) {
    let [alwaysOnTokens, onInvokeTokens] = await Promise.all([
      countTextTokens(text, modelId),
      countTextTokens(text_2, modelId),
    ]);
    if (alwaysOnTokens !== null && onInvokeTokens !== null)
      tokensByModel[modelId] = {
        always_on: alwaysOnTokens,
        on_invoke: onInvokeTokens,
      };
  }
  return {
    tokens: tokensByModel,
    inventory: {
      ...inventory,
      skills: attachComponentChars(inventory.skills, skillCosts),
      agents: attachComponentChars(inventory.agents, agentCosts),
      commands: attachComponentChars(inventory.commands, commandCosts),
    },
  };
}
//@ chunk-k9mgeeff.js:2384-2479 placement
function scaleCharsToTokens(chars, contentLength, measured, base = 4) {
  if (measured !== undefined && contentLength > 0) return Math.round((chars / contentLength) * measured);
  return roughTokenCountEstimation(" ".repeat(chars), base);
}
//@ chunk-k9mgeeff.js:2479-2493 placement
/**
 * MAX_PLUGIN_INVENTORY_FILE_BYTES：插件清单文件字节上限。
 */
var MAX_PLUGIN_INVENTORY_FILE_BYTES = 1048576;
//@ chunk-k9mgeeff.js:2493-2583 placement
function qualifiedComponentName(component, pluginName) {
  if (!pluginName) return component.name;
  return `${pluginName}:${component.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
//@ chunk-k9mgeeff.js:2583-3061 placement
/**
 * 测算插件组件常驻和调用时的令牌开销。
 */
async function measurePluginComponentCost(path, qualifiedName, kind = "skill") {
  if (!path)
    return {
      alwaysOn: "",
      onInvoke: "",
    };
  let text;
  try {
    text = await readFileHead(path, MAX_PLUGIN_INVENTORY_FILE_BYTES);
  } catch (error) {
    logComponentReadError(path, error);
    return {
      alwaysOn: "",
      onInvoke: "",
    };
  }
  let { frontmatter, content } = parseFrontmatter(text, path, {
    normalizeKeys: true,
  });
  let fields = {
    description:
      coerceDescriptionToString(frontmatter.description, qualifiedName) ??
      extractDescriptionFromMarkdown(content, "Skill"),
    whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : undefined,
  };
  let { description, whenToUse } =
    kind === "agent"
      ? fields
      : displaySkillFields({
          ...fields,
          argumentHint: undefined,
          argumentNames: [],
        });
  return {
    alwaysOn: getSkillListingText({
      name: qualifiedName,
      description,
      whenToUse,
    }),
    onInvoke: content.trim(),
  };
}
//@ chunk-k9mgeeff.js:3061-3265 placement
async function readFileHead(path, maxBytes) {
  let handle = await fsPromisesModule.open(path, "r");
  try {
    let { size } = await handle.stat();
    let min = Math.min(size, maxBytes);
    let buffer = Buffer.alloc(min);
    let { bytesRead } = await handle.read(buffer, 0, min, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    await handle.close();
  }
}
//@ chunk-k9mgeeff.js:3265-3407 placement
function attachComponentChars(components, costs) {
  return components.map((component, index) => {
    let cost = costs[index];
    if (!cost) return component;
    return {
      ...component,
      chars: {
        always_on: cost.alwaysOn.length,
        on_invoke: cost.onInvoke.length,
      },
    };
  });
}
//@ chunk-k9mgeeff.js:3407-3487 placement
async function countTextTokens(text, model) {
  if (!text) return 0;
  return countMessagesTokensWithAPI(
    [
      {
        role: "user",
        content: text,
      },
    ],
    [],
    model,
  );
}
//@ chunk-k9mgeeff.js:3487-3581 placement
/**
 * objectKeysOf：汇总对象键。
 */
function objectKeysOf(value) {
  return [value]
    .flat()
    .filter((item) => item != null && typeof item === "object")
    .flatMap(Object.keys);
}
//@ chunk-k9mgeeff.js:3828-4056 placement
async function readMcpServerNames(filePath) {
  if (filePath === null) return [];
  try {
    let parsed = jsonParse(await readFileHead(filePath, MAX_PLUGIN_INVENTORY_FILE_BYTES));
    if (parsed == null || typeof parsed !== "object") return [];
    let servers =
      "mcpServers" in parsed && typeof parsed.mcpServers === "object" ? parsed.mcpServers : parsed;
    return servers == null ? [] : Object.keys(servers);
  } catch {
    return [];
  }
}
//@ chunk-k9mgeeff.js:4056-4251 placement
async function readLspServerNames(plugin) {
  try {
    let componentPath = await resolveComponentPath(plugin, ".lsp.json");
    if (componentPath === null) return [];
    let content = await fsPromisesModule.readFile(componentPath, "utf-8");
    let parsed = jsonParse(content);
    if (parsed == null || typeof parsed !== "object") return [];
    return Object.keys(parsed);
  } catch {
    return [];
  }
}
//@ chunk-k9mgeeff.js:4251-4312 placement
/**
 * resolveComponentPath：解析组件绝对路径。
 */
async function resolveComponentPath(plugin, fileName) {
  return isProjectLocalPlugin(plugin)
    ? resolvePluginDirComponentPath(plugin, fileName)
    : pathModule.join(plugin.path, fileName);
}
//@ chunk-k9mgeeff.js:5291-5404 placement
function logComponentReadError(filePath, error) {
  logForDebugging(`Failed to read plugin components from ${filePath}: ${errorMessage(error)}`, {
    level: "error",
  });
  if (isSyscallError(error)) return;
  logError(toError(error));
}
export {
  logComponentReadError,
  readFileHead,
  MAX_PLUGIN_INVENTORY_FILE_BYTES,
  getPluginInventory,
  readMcpServerNames,
  resolveComponentPath,
  objectKeysOf,
  computePluginTokenCost,
  scaleCharsToTokens,
};
