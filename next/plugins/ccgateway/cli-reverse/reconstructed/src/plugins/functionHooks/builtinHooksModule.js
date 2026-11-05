/**
 * plugins/functionHooks/builtinHooksModule.ts
 *
 * 2.1.316 新增：内置 hooks 模块：构建时打包的 mods 钩子扫描结果、允许/询问/拒绝决定、路径定位。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6sf70a86.js (16)
 * attribution: placement 16
 */
import { resolve, relative, dirname, sep } from "path";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

//@ chunk-6sf70a86.js:6069-6122 placement
/**
 * 钩子的层级顺序 prepend → user → append → builtin → core；合并与裁决都按这个次序。
 */
var HOOK_TIER_ORDER = ["prepend", "user", "append", "builtin", "core"];
//@ chunk-6sf70a86.js:6122-6153 placement
/**
 * 钩子裁决的强弱顺序 allow → ask → deny，多处取「更严格者」时按此排序。
 */
var DECISION_ORDER = ["allow", "ask", "deny"];
//@ chunk-6sf70a86.js:6153-6259 placement
/**
 * 某层钩子之下还可以 next.to 的层：prepend→user/append/builtin/core，append→core，其他为空。
 */
var tiersBeneath = (tier) =>
  ({
    prepend: ["user", "append", "builtin", "core"],
    user: [],
    append: ["core"],
    builtin: [],
    core: [],
  })[tier];
//@ chunk-6sf70a86.js:6259-6299 placement
/**
 * 是否 prepend 之下
 */
var isAbovePrepend = (tier) => tiersBeneath("prepend").includes(tier);
//@ chunk-6sf70a86.js:6328-6376 placement
var SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS = "scripts/bundle-builtin-hooks-module.ts";
//@ chunk-6sf70a86.js:6376-6523 placement
/**
 * 取打包的内置 hooks 模块记录里的 files（只保留字符串值），冻结返回。
 */
function readBundledFiles(bundledModule) {
  let files = isPlainObject(bundledModule) ? bundledModule.files : undefined;
  return Object.freeze(
    Object.fromEntries(
      (isPlainObject(files) ? Object.entries(files) : []).filter((entry) => typeof entry[1] === "string"),
    ),
  );
}
//@ chunk-6sf70a86.js:6523-6795 placement
/**
 * 取打包记录里的 scan（hooks、calls、nextTo 字段形状正确），没有则抛"构建未携带扫描结果"。
 */
function readBundledScan(bundledScan, path) {
  let scan = isPlainObject(bundledScan) ? bundledScan.scan : undefined;
  if (
    isPlainObject(scan) &&
    Array.isArray(scan.hooks) &&
    Array.isArray(scan.calls) &&
    (scan.nextTo === undefined || Array.isArray(scan.nextTo))
  )
    return scan;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `the build carried no hooks module scan for ${path}`,
    "the build carried no hooks module scan for a built-in",
  );
}
//@ chunk-6sf70a86.js:6795-6906 placement
/**
 * 生成"内置插件的 hooks 模块无法发布"遥测安全错误。
 */
var builtinCannotShipError = (path, reason) =>
  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `the hooks module of ${path} cannot ship: ${reason}`,
    "the hooks module of a built-in cannot ship",
  );
//@ chunk-6sf70a86.js:6906-6933 placement
var HOOKS_REGISTER_TS = "hooks/register.ts";
//@ chunk-6sf70a86.js:6933-6966 placement
/**
 * builtin:<name>/register
 */
var builtinHookKey = (path) => `builtin:${path}/${HOOKS_REGISTER_TS}`;
//@ chunk-6sf70a86.js:6966-6980 placement
var MODS = "mods";
//@ chunk-6sf70a86.js:6980-6995 placement
var MODS_2 = "mods/";
//@ chunk-6sf70a86.js:7027-7082 placement
/**
 * 仓库根目录
 */
var repoRoot = () => resolve(import.meta.dirname, "../../../../../..");
//@ chunk-6sf70a86.js:7153-7184 placement
var BUILTIN_HOOKS_MODULE = "builtin-hooks-module:";
//@ chunk-6sf70a86.js:7184-7321 placement
/**
 * 把 builtin-hooks-module: 说明符换算成相对仓库根的路径（mods/ 前缀特殊处理）。
 */
function builtinModuleRelativePath(importer, path) {
  let sliced = path.slice(BUILTIN_HOOKS_MODULE.length);
  return sliced.startsWith(MODS_2)
    ? `${MODS}/${sliced.slice(MODS_2.length)}`
    : relative(repoRoot(), resolve(dirname(importer), sliced))
        .split(sep)
        .join("/");
}
//@ chunk-6sf70a86.js:7321-7351 placement
var BUILTIN_HOOKS_MODULE_2 = "builtin-hooks-module";
export {
  tiersBeneath,
  HOOKS_REGISTER_TS,
  builtinHookKey,
  repoRoot,
  MODS,
  HOOK_TIER_ORDER,
  BUILTIN_HOOKS_MODULE_2,
  builtinModuleRelativePath,
  SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS,
  builtinCannotShipError,
  isAbovePrepend,
  readBundledScan,
  readBundledFiles,
  DECISION_ORDER,
};
