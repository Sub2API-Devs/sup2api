/**
 * utils/plugins/skillFolderPlugins.ts
 *
 * 2.1.316 新增：技能文件夹插件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 */
import { basename, join } from "path";
import { getFsImplementation } from "../fsOperations.js";
import { getDuplicatedSkillName } from "../../skills/syncedSkills.js";
import { matchesSegmentOrTempName } from "../pathSegments.js";
import { CACHE_META_FILES } from "./cacheUtils.js";
import { isENOENT, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { findSymlinkEscape } from "./pluginPathContainment.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import { parseFrontmatter, parseFrontmatterName } from "../frontmatterParser.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4597028-4597044 placement
var MAX_SKILL_MANIFEST_BYTES = 1048576;
//@ chunk-5xgkngpb.js:4597044-4597208 placement
async function listPluginSkillCommands(plugin) {
  let filtered = [plugin.skillsPath, ...(plugin.skillsPaths ?? [])].filter((path) => path !== undefined);
  return (
    await Promise.all(filtered.map((path) => listSkillsInPath(path, plugin.name, plugin.entriesAnchor)))
  ).flat();
}
//@ chunk-5xgkngpb.js:4597208-4597282 placement
var SKILL_MANIFEST_KNOWN_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4597208", () => {
  SKILL_MANIFEST_KNOWN_KEYS = new Set(["$schema", "name", "displayName", "description", "version"]);
});
//@ chunk-5xgkngpb.js:4597282-4597951 placement
async function findSkillFolderPlugins(plugin) {
  if (
    [
      plugin.hooksConfig,
      plugin.commandsPath,
      plugin.commandsPaths,
      plugin.agentsPath,
      plugin.agentsPaths,
      plugin.outputStylesPath,
      plugin.outputStylesPaths,
      plugin.themesPath,
      plugin.themesPaths,
      plugin.workflowsPath,
      plugin.workflowsPaths,
      plugin.skillsPaths,
      plugin.mcpServers,
      plugin.lspServers,
      plugin.settings,
      plugin.monitors,
      plugin.modulePath,
      plugin.commandsMetadata,
      plugin.hljsLanguages,
      plugin.mcpServersNeedingConfig,
      plugin.depConstraints,
    ].some((value) => value !== undefined) ||
    Object.entries(plugin.manifest).some(
      ([key, value]) => value !== undefined && !SKILL_MANIFEST_KNOWN_KEYS.has(key),
    )
  )
    return;
  try {
    let [entries, skills] = await Promise.all([
      getFsImplementation().readdir(plugin.path),
      listPluginSkillCommands(plugin),
    ]);
    let [skill] = skills;
    return skills.length === 1 &&
      skill !== undefined &&
      getDuplicatedSkillName(skill.name) === plugin.name &&
      entries.every(
        (entry) =>
          entry.name === ".claude-plugin" ||
          entry.name === "skills" ||
          matchesSegmentOrTempName(entry.name, CACHE_META_FILES),
      )
      ? skill
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:4597951-4598448 placement
/**
 * 路径本身是技能或其子目录中的技能。
 */
async function listSkillsInPath(dir, pluginName, anchor) {
  let skillFrontmatterName = await readSkillFrontmatterName(dir, "SKILL.md", anchor);
  if (skillFrontmatterName !== null) {
    let rawName = typeof skillFrontmatterName === "string" ? skillFrontmatterName.trim() : "";
    let bareName = rawName.startsWith(`${pluginName}:`) ? rawName.slice(pluginName.length + 1) : rawName;
    return [makeSkillCommandStub(pluginName, bareName || basename(dir), skillFrontmatterName)];
  }
  let entries;
  try {
    entries = await getFsImplementation().readdir(dir);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not list ${dir} for its skills' names: ${errorMessage(error)}`, {
        level: "warn",
      });
    return [];
  }
  return (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map(async (entry) => {
          let skillFrontmatterName = await readSkillFrontmatterName(
            dir,
            join(entry.name, "SKILL.md"),
            anchor,
          );
          return skillFrontmatterName === null
            ? []
            : [makeSkillCommandStub(pluginName, entry.name, skillFrontmatterName)];
        }),
    )
  ).flat();
}
//@ chunk-5xgkngpb.js:4598448-4598746 placement
async function readSkillFrontmatterName(dir, fileName, anchor) {
  let filePath = join(dir, fileName);
  if (anchor !== undefined && (await findSymlinkEscape(anchor, dir, fileName)) !== undefined) return null;
  try {
    let smallFileChecked = await readSmallFileChecked(
      getFsImplementation(),
      filePath,
      MAX_SKILL_MANIFEST_BYTES,
    );
    return smallFileChecked === null
      ? null
      : (parseFrontmatter(smallFileChecked, filePath, {
          normalizeKeys: true,
        }).frontmatter.name ?? undefined);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not read ${filePath} for its skill's name: ${errorMessage(error)}`, {
        level: "warn",
      });
    return null;
  }
}
//@ chunk-5xgkngpb.js:4598746-4598986 placement
function makeSkillCommandStub(pluginName, skillDirName, skillFrontmatterName) {
  let name = `${pluginName}:${skillDirName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  let frontmatterName = parseFrontmatterName(skillFrontmatterName, `plugin skill ${name}`) ?? "";
  let displayName = !frontmatterName
    ? name
    : frontmatterName.startsWith(`${pluginName}:`)
      ? frontmatterName
      : `${pluginName}:${frontmatterName}`;
  return {
    name,
    loadedFrom: "plugin",
    userFacingName: () => displayName,
    aliases: frontmatterName && !frontmatterName.includes(":") ? [frontmatterName] : undefined,
  };
}
export { MAX_SKILL_MANIFEST_BYTES, findSkillFolderPlugins, listPluginSkillCommands };
