/**
 * utils/plugins/pluginLinks.ts
 *
 * 2.1.316 新增：插件链接文件与目录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (6)
 * attribution: placement 6
 */
import { isAbsolute, join, relative, sep } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { isUncOrDeviceSpelling } from "../fsJunctions.js";
import { isNetworkMountRoot } from "../networkPaths.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { areValidKeySegments, STORAGE_SPACES } from "../storage/storageSpaces.js";

//@ chunk-f3qhjfah.js:1740-2001 placement
/**
 * PLUGIN_LINK_FILE：插件链接标记文件名；pluginLinkSchema：插件链接标记 schema（同一声明共 2 个绑定）。
 */
var PLUGIN_LINK_FILE_2 = ".claude-plugin-link";
var PLUGIN_LINK_FILE = DoctorLazy(() =>
  u({
    target: string()
      .min(1)
      .max(4096)
      .refine((e) => isAbsolute(e), {
        message: "must be an absolute path",
      })
      .refine((e) => !isUncOrDeviceSpelling(e) && !isNetworkMountRoot(e), {
        message: "must be a local path",
      })
      .refine((e) => !hasDotSegmentAlias(e), {
        message: "must be canonical",
      }),
  }),
);
var pluginLinkSchema = `
[mode: link]`;
//@ chunk-f3qhjfah.js:2141-2203 placement = getThinkbackSkillDir (1)
function getThinkbackSkillDir() {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  return claudeConfigDirOrNull === null ? null : join(claudeConfigDirOrNull, "skills");
}
//@ chunk-f3qhjfah.js:2203-2323 placement
function isUnderThinkbackSkillDir(e) {
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null) return false;
  let r = relative(thinkbackSkillDir, e);
  return r !== "" && r !== ".." && !r.startsWith(`..${sep}`) && !isAbsolute(r);
}
//@ chunk-f3qhjfah.js:2323-2442 placement
function thinkbackRelativeParts(e) {
  let thinkbackSkillDir = getThinkbackSkillDir();
  if (thinkbackSkillDir === null || !isUnderThinkbackSkillDir(e)) return null;
  let parts = relative(thinkbackSkillDir, e).split(sep);
  return areValidKeySegments(parts) && join(thinkbackSkillDir, ...parts) === e ? parts : null;
}
//@ chunk-f3qhjfah.js:2442-2520 placement
/**
 * thinkbackUserConfigSpace：thinkback 用户配置存储空间。
 */
function thinkbackUserConfigSpace(e) {
  let n = thinkbackRelativeParts(e);
  return n === null ? null : STORAGE_SPACES.userConfigDir("skills", n);
}
//@ chunk-f3qhjfah.js:2520-2620 placement
/**
 * thinkback 技能路径转 userConfigDir 存储键。
 */
function thinkbackStorageKey(e) {
  let n = thinkbackRelativeParts(e);
  return n === null
    ? null
    : {
        namespace: "userConfigDir",
        dir: "skills",
        relPath: n,
      };
}
export {
  pluginLinkSchema,
  PLUGIN_LINK_FILE_2,
  PLUGIN_LINK_FILE,
  thinkbackStorageKey,
  thinkbackUserConfigSpace,
  getThinkbackSkillDir,
};
