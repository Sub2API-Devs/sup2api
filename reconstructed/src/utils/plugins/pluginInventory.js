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
import { NPM } from "./schemas.js";
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
async function getPluginInventory(n, e) {
  if (e === "builtin") {
    let builtinDef = getBuiltinPlugin(n.name);
    if (!builtinDef) throw Error(`Built-in plugin ${n.name} not found`);
    return {
      commands: [],
      agents: [],
      skills: builtinDef.skills?.map((_) => ({ name: _.name })) ?? [],
      hooks: builtinDef.hooks ? Object.keys(builtinDef.hooks) : [],
      mcpServers: builtinDef.mcpServers ? Object.keys(builtinDef.mcpServers) : [],
      lspServers: [],
    };
  }
  let r = isOfficialMarketplace(e) || e === NPM,
    s = parsePluginIdentifier(n.source).name || n.name,
    m =
      e === OFFICIAL_MARKETPLACE_NAME
        ? ((await getPluginByIdAnySource(`${s}@${e}`, void 0, "load"))?.entry ??
          (await findMissedListingEntry(s, void 0, !0))?.entry)
        : void 0,
    o = r
      ? void 0
      : (m ??
        (await getMarketplaceOrDirectoryCatalog(e, void 0)).plugins.find((plugin) => plugin.name === s));
  if (!o && !r) throw Error(`Plugin ${s} not found in marketplace ${e}`);
  let [c, a, p] = await Promise.all([
      getBaseFileNames([n.commandsPath, ...(n.commandsPaths ?? [])]),
      getBaseFileNames([n.agentsPath, ...(n.agentsPaths ?? [])]),
      getSkillDirNames([n.skillsPath, ...(n.skillsPaths ?? [])], n.name),
    ]),
    y = n.hooksConfig ? Object.keys(n.hooksConfig) : k(o?.hooks),
    i = n.mcpServers ? Object.keys(n.mcpServers) : uniq(await loadPluginMcpServers(n)),
    P = i.length > 0 ? i : k(o?.mcpServers),
    g = n.lspServers
      ? Object.keys(n.lspServers)
      : (await readLspServerNames(n)).concat(k(n.manifest.lspServers)),
    T = g.length > 0 ? uniq(g) : k(o?.lspServers);
  return { commands: c, agents: a, skills: p, hooks: y, mcpServers: P, lspServers: T };
}
//@ chunk-k9mgeeff.js:1795-2384 placement
async function computePluginTokenCost(n, e, r) {
  let [s, m, o] = await Promise.all([
      Promise.all(
        n.skills.map((skill) =>
          measurePluginComponentCost(
            skill.path ? pathModule.join(skill.path, "SKILL.md") : void 0,
            E(skill, r),
          ),
        ),
      ),
      Promise.all(n.agents.map((agent) => measurePluginComponentCost(agent.path, agent.name, "agent"))),
      Promise.all(n.commands.map((command) => measurePluginComponentCost(command.path, E(command, r)))),
    ]),
    c = [...s, ...m, ...o],
    joined = c.map((i) => i.alwaysOn).filter(Boolean).join(`
`),
    joined_2 = c.map((i) => i.onInvoke).filter(Boolean).join(`

`),
    y = {};
  for (let i of e) {
    let [P, g] = await Promise.all([j(joined, i), j(joined_2, i)]);
    if (P !== null && g !== null) y[i] = { always_on: P, on_invoke: g };
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
  if (r !== void 0 && e > 0) return Math.round((n / e) * r);
  return roughTokenCountEstimation(" ".repeat(n), s);
}
//@ chunk-k9mgeeff.js:2479-2493 placement
var v = 1048576;
//@ chunk-k9mgeeff.js:2493-2583 placement
function E(n, e) {
  if (!e) return n.name;
  return `${e}:${n.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
/**
 * 测算插件组件常驻和调用时的令牌开销。
 */
//@ chunk-k9mgeeff.js:2583-3061 placement
async function measurePluginComponentCost(n, e, r = "skill") {
  if (!n) return { alwaysOn: "", onInvoke: "" };
  let s;
  try {
    s = await readFileHead(n, v);
  } catch (error) {
    return (logComponentReadError(n, error), { alwaysOn: "", onInvoke: "" });
  }
  let { frontmatter: frontmatter, content: content } = parseFrontmatter(s, n, { normalizeKeys: !0 }),
    c = {
      description:
        coerceDescriptionToString(frontmatter.description, e) ??
        extractDescriptionFromMarkdown(content, "Skill"),
      whenToUse: frontmatter.when_to_use != null ? String(frontmatter.when_to_use) : void 0,
    },
    { description: description, whenToUse: whenToUse } =
      r === "agent" ? c : displaySkillFields({ ...c, argumentHint: void 0, argumentNames: [] });
  return {
    alwaysOn: getSkillListingText({ name: e, description: description, whenToUse: whenToUse }),
    onInvoke: content.trim(),
  };
}
//@ chunk-k9mgeeff.js:3061-3265 placement
async function readFileHead(n, e) {
  let open = await fsPromisesModule.open(n, "r");
  try {
    let { size: size } = await open.stat(),
      min = Math.min(size, e),
      alloc = Buffer.alloc(min),
      { bytesRead: bytesRead } = await open.read(alloc, 0, min, 0);
    return alloc.toString("utf8", 0, bytesRead);
  } finally {
    await open.close();
  }
}
//@ chunk-k9mgeeff.js:3265-3407 placement
function attachComponentChars(n, e) {
  return n.map((r, s) => {
    let m = e[s];
    if (!m) return r;
    return { ...r, chars: { always_on: m.alwaysOn.length, on_invoke: m.onInvoke.length } };
  });
}
//@ chunk-k9mgeeff.js:3407-3487 placement
async function j(n, e) {
  if (!n) return 0;
  return countMessagesTokensWithAPI([{ role: "user", content: n }], [], e);
}
//@ chunk-k9mgeeff.js:3487-3581 placement
function k(n) {
  return [n]
    .flat()
    .filter((e) => e != null && typeof e === "object")
    .flatMap(Object.keys);
}
//@ chunk-k9mgeeff.js:3828-4056 placement
async function readMcpServerNames(n) {
  if (n === null) return [];
  try {
    let e = jsonParse(await readFileHead(n, v));
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
    let e = await O(n, ".lsp.json");
    if (e === null) return [];
    let content = await fsPromisesModule.readFile(e, "utf-8"),
      s = jsonParse(content);
    if (s == null || typeof s !== "object") return [];
    return Object.keys(s);
  } catch {
    return [];
  }
}
//@ chunk-k9mgeeff.js:4251-4312 placement
async function O(n, e) {
  return isProjectLocalPlugin(n) ? resolvePluginDirComponentPath(n, e) : pathModule.join(n.path, e);
}
//@ chunk-k9mgeeff.js:5291-5404 placement
function logComponentReadError(n, e) {
  if (
    (logForDebugging(`Failed to read plugin components from ${n}: ${errorMessage(e)}`, { level: "error" }),
    isSyscallError(e))
  )
    return;
  logError(toError(e));
}

export { getPluginInventory, logComponentReadError, readFileHead, v, readMcpServerNames, O, k };
