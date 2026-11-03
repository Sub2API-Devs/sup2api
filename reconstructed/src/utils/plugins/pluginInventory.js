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
async function getPluginInventory(plugin, marketplace) {
  if (marketplace === "builtin") {
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
  let r = isOfficialMarketplace(marketplace) || marketplace === pluginManifestPathSchemas;
  let s = parsePluginIdentifier(plugin.source).name || plugin.name;
  let m =
    marketplace === OFFICIAL_MARKETPLACE_NAME
      ? ((await getPluginByIdAnySource(`${s}@${marketplace}`, undefined, "load"))?.entry ??
        (await findMissedListingEntry(s, undefined, true))?.entry)
      : undefined;
  let o = r
    ? undefined
    : (m ??
      (await getMarketplaceOrDirectoryCatalog(marketplace, undefined)).plugins.find(
        (plugin) => plugin.name === s,
      ));
  if (!o && !r) throw Error(`Plugin ${s} not found in marketplace ${marketplace}`);
  let [baseFileNames, baseFileNames_2, skillDirNames] = await Promise.all([
    getBaseFileNames([plugin.commandsPath, ...(plugin.commandsPaths ?? [])]),
    getBaseFileNames([plugin.agentsPath, ...(plugin.agentsPaths ?? [])]),
    getSkillDirNames([plugin.skillsPath, ...(plugin.skillsPaths ?? [])], plugin.name),
  ]);
  let hooks = plugin.hooksConfig ? Object.keys(plugin.hooksConfig) : objectKeysOf(o?.hooks);
  let i = plugin.mcpServers ? Object.keys(plugin.mcpServers) : uniq(await loadPluginMcpServers(plugin));
  let mcpServers = i.length > 0 ? i : objectKeysOf(o?.mcpServers);
  let g = plugin.lspServers
    ? Object.keys(plugin.lspServers)
    : (await readLspServerNames(plugin)).concat(objectKeysOf(plugin.manifest.lspServers));
  let lspServers = g.length > 0 ? uniq(g) : objectKeysOf(o?.lspServers);
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
async function computePluginTokenCost(n, e, r) {
  let [s, m, o] = await Promise.all([
    Promise.all(
      n.skills.map((skill) =>
        measurePluginComponentCost(
          skill.path ? pathModule.join(skill.path, "SKILL.md") : undefined,
          qualifiedComponentName(skill, r),
        ),
      ),
    ),
    Promise.all(n.agents.map((agent) => measurePluginComponentCost(agent.path, agent.name, "agent"))),
    Promise.all(
      n.commands.map((command) =>
        measurePluginComponentCost(command.path, qualifiedComponentName(command, r)),
      ),
    ),
  ]);
  let c = [...s, ...m, ...o];
  let joined = c.map((i) => i.alwaysOn).filter(Boolean).join(`
`);
  let joined_2 = c.map((i) => i.onInvoke).filter(Boolean).join(`

`);
  let y = {};
  for (let i of e) {
    let [P, g] = await Promise.all([countTextTokens(joined, i), countTextTokens(joined_2, i)]);
    if (P !== null && g !== null)
      y[i] = {
        always_on: P,
        on_invoke: g,
      };
  }
  return {
    tokens: y,
    inventory: {
      ...n,
      skills: attachComponentChars(n.skills, s),
      agents: attachComponentChars(n.agents, m),
      commands: attachComponentChars(n.commands, o),
    },
  };
}
//@ chunk-k9mgeeff.js:2384-2479 placement
function scaleCharsToTokens(n, e, r, s = 4) {
  if (r !== undefined && e > 0) return Math.round((n / e) * r);
  return roughTokenCountEstimation(" ".repeat(n), s);
}
//@ chunk-k9mgeeff.js:2479-2493 placement
/**
 * MAX_PLUGIN_INVENTORY_FILE_BYTES：插件清单文件字节上限。
 */
var MAX_PLUGIN_INVENTORY_FILE_BYTES = 1048576;
//@ chunk-k9mgeeff.js:2493-2583 placement
function qualifiedComponentName(n, e) {
  if (!e) return n.name;
  return `${e}:${n.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
//@ chunk-k9mgeeff.js:2583-3061 placement
/**
 * 测算插件组件常驻和调用时的令牌开销。
 */
async function measurePluginComponentCost(path, e, r = "skill") {
  if (!path)
    return {
      alwaysOn: "",
      onInvoke: "",
    };
  let s;
  try {
    s = await readFileHead(path, MAX_PLUGIN_INVENTORY_FILE_BYTES);
  } catch (error) {
    logComponentReadError(path, error);
    return {
      alwaysOn: "",
      onInvoke: "",
    };
  }
  let { frontmatter, content } = parseFrontmatter(s, path, {
    normalizeKeys: true,
  });
  let c = {
    description:
      coerceDescriptionToString(frontmatter.description, e) ??
      extractDescriptionFromMarkdown(content, "Skill"),
    whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : undefined,
  };
  let { description, whenToUse } =
    r === "agent"
      ? c
      : displaySkillFields({
          ...c,
          argumentHint: undefined,
          argumentNames: [],
        });
  return {
    alwaysOn: getSkillListingText({
      name: e,
      description,
      whenToUse,
    }),
    onInvoke: content.trim(),
  };
}
//@ chunk-k9mgeeff.js:3061-3265 placement
async function readFileHead(n, e) {
  let r = await fsPromisesModule.open(n, "r");
  try {
    let { size } = await r.stat();
    let min = Math.min(size, e);
    let o = Buffer.alloc(min);
    let { bytesRead } = await r.read(o, 0, min, 0);
    return o.toString("utf8", 0, bytesRead);
  } finally {
    await r.close();
  }
}
//@ chunk-k9mgeeff.js:3265-3407 placement
function attachComponentChars(n, e) {
  return n.map((r, s) => {
    let m = e[s];
    if (!m) return r;
    return {
      ...r,
      chars: {
        always_on: m.alwaysOn.length,
        on_invoke: m.onInvoke.length,
      },
    };
  });
}
//@ chunk-k9mgeeff.js:3407-3487 placement
async function countTextTokens(n, e) {
  if (!n) return 0;
  return countMessagesTokensWithAPI(
    [
      {
        role: "user",
        content: n,
      },
    ],
    [],
    e,
  );
}
//@ chunk-k9mgeeff.js:3487-3581 placement
/**
 * objectKeysOf：汇总对象键。
 */
function objectKeysOf(n) {
  return [n]
    .flat()
    .filter((e) => e != null && typeof e === "object")
    .flatMap(Object.keys);
}
//@ chunk-k9mgeeff.js:3828-4056 placement
async function readMcpServerNames(n) {
  if (n === null) return [];
  try {
    let e = jsonParse(await readFileHead(n, MAX_PLUGIN_INVENTORY_FILE_BYTES));
    if (e == null || typeof e !== "object") return [];
    let r = "mcpServers" in e && typeof e.mcpServers === "object" ? e.mcpServers : e;
    return r == null ? [] : Object.keys(r);
  } catch {
    return [];
  }
}
//@ chunk-k9mgeeff.js:4056-4251 placement
async function readLspServerNames(n) {
  try {
    let componentPath = await resolveComponentPath(n, ".lsp.json");
    if (componentPath === null) return [];
    let content = await fsPromisesModule.readFile(componentPath, "utf-8");
    let s = jsonParse(content);
    if (s == null || typeof s !== "object") return [];
    return Object.keys(s);
  } catch {
    return [];
  }
}
//@ chunk-k9mgeeff.js:4251-4312 placement
/**
 * resolveComponentPath：解析组件绝对路径。
 */
async function resolveComponentPath(n, e) {
  return isProjectLocalPlugin(n) ? resolvePluginDirComponentPath(n, e) : pathModule.join(n.path, e);
}
//@ chunk-k9mgeeff.js:5291-5404 placement
function logComponentReadError(n, error) {
  logForDebugging(`Failed to read plugin components from ${n}: ${errorMessage(error)}`, {
    level: "error",
  });
  if (isSyscallError(error)) return;
  logError(toError(error));
}
export {
  getPluginInventory,
  logComponentReadError,
  readFileHead,
  MAX_PLUGIN_INVENTORY_FILE_BYTES,
  readMcpServerNames,
  resolveComponentPath,
  objectKeysOf,
};
