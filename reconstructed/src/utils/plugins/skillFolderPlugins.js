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
} from "path";
import { getFsImplementation } from "../fsOperations.js";
import { getDuplicatedSkillName } from "../../skills/syncedSkills.js";
import { OCt } from "../pathSegments.js";
import { CACHE_META_FILES } from "./cacheUtils.js";
import { isENOENT, errorMessage } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { readSmallFileChecked } from "../readSmallFile.js";
import { parseFrontmatter, parseFrontmatterName } from "../frontmatterParser.js";

//@ chunk-e6aww6q8.js:4490349-4490365 placement
var Rbs = 1048576;
//@ chunk-e6aww6q8.js:4490365-4490513 placement
async function listPluginSkillCommands(e) {
  let filtered = [e.skillsPath, ...(e.skillsPaths ?? [])].filter((s) => s !== void 0);
  return (await Promise.all(filtered.map((s) => listSkillsInPath(s, e.name)))).flat();
}
//@ chunk-e6aww6q8.js:4490513-4490587 placement
var Cbs = new Set(["$schema", "name", "displayName", "description", "version"]);
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
    ].some((n) => n !== void 0) ||
    Object.entries(e.manifest).some(([n, r]) => r !== void 0 && !Cbs.has(n))
  )
    return;
  try {
    let [n, r] = await Promise.all([getFsImplementation().readdir(e.path), listPluginSkillCommands(e)]),
      [s] = r;
    return r.length === 1 &&
      s !== void 0 &&
      getDuplicatedSkillName(s.name) === e.name &&
      n.every((h) => h.name === ".claude-plugin" || h.name === "skills" || OCt(h.name, CACHE_META_FILES))
      ? s
      : void 0;
  } catch {
    return;
  }
}
/**
 * 路径本身是技能或其子目录中的技能。
 */
//@ chunk-e6aww6q8.js:4491256-4491752 placement
async function listSkillsInPath(e, n) {
  let r = await readSkillFrontmatterName(join_126(e, "SKILL.md"));
  if (r !== null) {
    let y = typeof r === "string" ? r.trim() : "",
      S = y.startsWith(`${n}:`) ? y.slice(n.length + 1) : y;
    return [makeSkillCommandStub(n, S || basename_65(e), r)];
  }
  let s;
  try {
    s = await getFsImplementation().readdir(e);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not list ${e} for its skills' names: ${errorMessage(error)}`, { level: "warn" });
    return [];
  }
  return (
    await Promise.all(
      s
        .filter((y) => y.isDirectory() || y.isSymbolicLink())
        .map(async (y) => {
          let S = await readSkillFrontmatterName(join_126(e, y.name, "SKILL.md"));
          return S === null ? [] : [makeSkillCommandStub(n, y.name, S)];
        }),
    )
  ).flat();
}
//@ chunk-e6aww6q8.js:4491752-4491979 placement
async function readSkillFrontmatterName(e) {
  try {
    let n = await readSmallFileChecked(getFsImplementation(), e, Rbs);
    return n === null ? null : (parseFrontmatter(n, e, { normalizeKeys: !0 }).frontmatter.name ?? void 0);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not read ${e} for its skill's name: ${errorMessage(error)}`, { level: "warn" });
    return null;
  }
}
//@ chunk-e6aww6q8.js:4491979-4492219 placement
function makeSkillCommandStub(e, n, r) {
  let s = `${e}:${n.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    h = parseFrontmatterName(r, `plugin skill ${s}`) ?? "",
    y = !h ? s : h.startsWith(`${e}:`) ? h : `${e}:${h}`;
  return {
    name: s,
    loadedFrom: "plugin",
    userFacingName: () => y,
    aliases: h && !h.includes(":") ? [h] : void 0,
  };
}

export { findSkillFolderPlugins, listPluginSkillCommands };
