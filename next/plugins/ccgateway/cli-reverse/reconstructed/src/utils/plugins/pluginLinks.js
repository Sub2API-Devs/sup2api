/**
 * utils/plugins/pluginLinks.ts
 *
 * 2.1.316 新增：插件链接文件与目录。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5s0qaz1x.js (6)
 * attribution: placement 6
 */
import { isAbsolute, join, relative, sep } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isUncOrDeviceSpelling } from "../fsJunctions.js";
import { isNetworkMountRoot } from "../networkPaths.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { areValidKeySegments, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5s0qaz1x.js:1841-2102 placement
/**
 * 插件链接标记：MFe 是标记文件名 ".claude-plugin-link"；CJr 是链接文件 schema（绝对路径的 target）；vkn 是写进文件首行的头 `\n[mode: link]`。
 */
var PLUGIN_LINK_FILE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pluginLinkSchema;
var PLUGIN_LINK_HEADER;
deferInit("chunk-5s0qaz1x.js:1841", () => {
  PLUGIN_LINK_FILE = ".claude-plugin-link";
  pluginLinkSchema = DoctorLazy(() =>
    objectSchema({
      target: stringSchema()
        .min(1)
        .max(4096)
        .refine((target) => isAbsolute(target), {
          message: "must be an absolute path",
        })
        .refine((target) => !isUncOrDeviceSpelling(target) && !isNetworkMountRoot(target), {
          message: "must be a local path",
        })
        .refine((target) => !hasDotSegmentAlias(target), {
          message: "must be canonical",
        }),
    }),
  );
  PLUGIN_LINK_HEADER = `
[mode: link]`;
});
//@ chunk-5s0qaz1x.js:2242-2304 placement (2.1.88 match: getThinkbackSkillDir, 1)
function getThinkbackSkillDir() {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  return claudeConfigDirOrNull === null ? null : join(claudeConfigDirOrNull, "skills");
}
//@ chunk-5s0qaz1x.js:2304-2424 placement
function isUnderThinkbackSkillDir(path) {
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null) return false;
  let relPath = relative(thinkbackSkillDir, path);
  return relPath !== "" && relPath !== ".." && !relPath.startsWith(`..${sep}`) && !isAbsolute(relPath);
}
//@ chunk-5s0qaz1x.js:2424-2543 placement
function thinkbackRelativeParts(path) {
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null || !isUnderThinkbackSkillDir(path)) return null;
  let parts = relative(thinkbackSkillDir, path).split(sep);
  return areValidKeySegments(parts) && join(thinkbackSkillDir, ...parts) === path ? parts : null;
}
//@ chunk-5s0qaz1x.js:2543-2621 placement
/**
 * thinkbackUserConfigSpace：thinkback 用户配置存储空间。
 */
function thinkbackUserConfigSpace(path) {
  let parts = thinkbackRelativeParts(path);
  return parts === null ? null : STORAGE_SPACES.userConfigDir("skills", parts);
}
//@ chunk-5s0qaz1x.js:2621-2721 placement
/**
 * thinkback 技能路径转 userConfigDir 存储键。
 */
function thinkbackStorageKey(path) {
  let parts = thinkbackRelativeParts(path);
  return parts === null
    ? null
    : {
        namespace: "userConfigDir",
        dir: "skills",
        relPath: parts,
      };
}
export {
  PLUGIN_LINK_HEADER,
  thinkbackStorageKey,
  PLUGIN_LINK_FILE,
  pluginLinkSchema,
  thinkbackUserConfigSpace,
  getThinkbackSkillDir,
};
