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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
} from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { CL } from "../fsJunctions.js";
import { yl } from "../networkPaths.js";
import { $j } from "../pathClassification.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { uA, STORAGE_SPACES } from "../storage/storageSpaces.js";

//@ chunk-f3qhjfah.js:1740-2001 placement
var PLUGIN_LINK_FILE = ".claude-plugin-link",
  CJr = DoctorLazy(() =>
    u({
      target: o()
        .min(1)
        .max(4096)
        .refine((e) => isAbsolute(e), { message: "must be an absolute path" })
        .refine((e) => !CL(e) && !yl(e), { message: "must be a local path" })
        .refine((e) => !$j(e), { message: "must be canonical" }),
    }),
  ),
  vkn = `
[mode: link]`;
//@ chunk-f3qhjfah.js:2141-2203 placement = getThinkbackSkillDir (1)
function getThinkbackSkillDir() {
  let e = getClaudeConfigDirOrNull();
  return e === null ? null : join_3(e, "skills");
}
//@ chunk-f3qhjfah.js:2203-2323 placement
function isUnderThinkbackSkillDir(e) {
  let n = getThinkbackSkillDir();
  if (n === null) return !1;
  let r = relative_2(n, e);
  return r !== "" && r !== ".." && !r.startsWith(`..${sep_2}`) && !isAbsolute_3(r);
}
//@ chunk-f3qhjfah.js:2323-2442 placement
function thinkbackRelativeParts(e) {
  let n = getThinkbackSkillDir();
  if (n === null || !isUnderThinkbackSkillDir(e)) return null;
  let parts = relative_2(n, e).split(sep_2);
  return uA(parts) && join_3(n, ...parts) === e ? parts : null;
}
//@ chunk-f3qhjfah.js:2442-2520 placement
function RJr(e) {
  let n = thinkbackRelativeParts(e);
  return n === null ? null : STORAGE_SPACES.userConfigDir("skills", n);
}
/**
 * thinkback 技能路径转 userConfigDir 存储键。
 */
//@ chunk-f3qhjfah.js:2520-2620 placement
function thinkbackStorageKey(e) {
  let n = thinkbackRelativeParts(e);
  return n === null ? null : { namespace: "userConfigDir", dir: "skills", relPath: n };
}

export { vkn, PLUGIN_LINK_FILE, CJr, thinkbackStorageKey, RJr, getThinkbackSkillDir };
