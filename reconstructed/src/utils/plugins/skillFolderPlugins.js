/**
 * utils/plugins/skillFolderPlugins.ts
 *
 * 2.1.316 新增：技能文件夹插件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { join, basename } from "path";
import { getFsImplementation } from "../fsOperations.js";
import { getDuplicatedSkillName } from "../../skills/syncedSkills.js";
import { matchesSegmentOrTempName } from "../pathSegments.js";
import { CACHE_META_FILES } from "./cacheUtils.js";
import { isENOENT, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import { parseFrontmatter, parseFrontmatterName } from "../frontmatterParser.js";

//@ chunk-e6aww6q8.js:4490349-4490365 placement
var MAX_SKILL_MANIFEST_BYTES = 1048576;
//@ chunk-e6aww6q8.js:4490365-4490513 placement
async function listPluginSkillCommands(e) {
  let filtered = [e.skillsPath, ...(e.skillsPaths ?? [])].filter((s) => s !== undefined);
  return (await Promise.all(filtered.map((s) => listSkillsInPath(s, e.name)))).flat();
}
//@ chunk-e6aww6q8.js:4490513-4490587 placement
var SKILL_MANIFEST_KNOWN_KEYS = new Set(["$schema", "name", "displayName", "description", "version"]);
//@ chunk-e6aww6q8.js:4490587-4491256 placement
async function findSkillFolderPlugins(e) {
  if (
    [
      e.hooksConfig,
      e.commandsPath,
      e.commandsPaths,
      e.agentsPath,
      e.agentsPaths,
      e.outputStylesPath,
      e.outputStylesPaths,
      e.themesPath,
      e.themesPaths,
      e.workflowsPath,
      e.workflowsPaths,
      e.skillsPaths,
      e.mcpServers,
      e.lspServers,
      e.settings,
      e.monitors,
      e.modulePath,
      e.commandsMetadata,
      e.hljsLanguages,
      e.mcpServersNeedingConfig,
      e.depConstraints,
    ].some((n) => n !== undefined) ||
    Object.entries(e.manifest).some(
      ([key, value]) => value !== undefined && !SKILL_MANIFEST_KNOWN_KEYS.has(key),
    )
  )
    return;
  try {
    let [n, r] = await Promise.all([getFsImplementation().readdir(e.path), listPluginSkillCommands(e)]);
    let [s] = r;
    return r.length === 1 &&
      s !== undefined &&
      getDuplicatedSkillName(s.name) === e.name &&
      n.every(
        (h) =>
          h.name === ".claude-plugin" ||
          h.name === "skills" ||
          matchesSegmentOrTempName(h.name, CACHE_META_FILES),
      )
      ? s
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4491256-4491752 placement
/**
 * 路径本身是技能或其子目录中的技能。
 */
async function listSkillsInPath(e, name) {
  let skillFrontmatterName = await readSkillFrontmatterName(join(e, "SKILL.md"));
  if (skillFrontmatterName !== null) {
    let y = typeof skillFrontmatterName === "string" ? skillFrontmatterName.trim() : "";
    let S = y.startsWith(`${name}:`) ? y.slice(name.length + 1) : y;
    return [makeSkillCommandStub(name, S || basename(e), skillFrontmatterName)];
  }
  let s;
  try {
    s = await getFsImplementation().readdir(e);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not list ${e} for its skills' names: ${errorMessage(error)}`, {
        level: "warn",
      });
    return [];
  }
  return (
    await Promise.all(
      s
        .filter((y) => y.isDirectory() || y.isSymbolicLink())
        .map(async (y) => {
          let skillFrontmatterName = await readSkillFrontmatterName(join(e, y.name, "SKILL.md"));
          return skillFrontmatterName === null
            ? []
            : [makeSkillCommandStub(name, y.name, skillFrontmatterName)];
        }),
    )
  ).flat();
}
//@ chunk-e6aww6q8.js:4491752-4491979 placement
async function readSkillFrontmatterName(e) {
  try {
    let smallFileChecked = await readSmallFileChecked(getFsImplementation(), e, MAX_SKILL_MANIFEST_BYTES);
    return smallFileChecked === null
      ? null
      : (parseFrontmatter(smallFileChecked, e, {
          normalizeKeys: true,
        }).frontmatter.name ?? undefined);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not read ${e} for its skill's name: ${errorMessage(error)}`, {
        level: "warn",
      });
    return null;
  }
}
//@ chunk-e6aww6q8.js:4491979-4492219 placement
function makeSkillCommandStub(e, n, skillFrontmatterName) {
  let s = `${e}:${n.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  let h = parseFrontmatterName(skillFrontmatterName, `plugin skill ${s}`) ?? "";
  let y = !h ? s : h.startsWith(`${e}:`) ? h : `${e}:${h}`;
  return {
    name: s,
    loadedFrom: "plugin",
    userFacingName: () => y,
    aliases: h && !h.includes(":") ? [h] : undefined,
  };
}
export { findSkillFolderPlugins, listPluginSkillCommands };
