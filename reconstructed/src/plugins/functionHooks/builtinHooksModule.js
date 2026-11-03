/**
 * plugins/functionHooks/builtinHooksModule.ts
 *
 * 2.1.316 新增：内置 hooks 模块：构建时打包的 mods 钩子扫描结果、允许/询问/拒绝决定、路径定位。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (16)
 * attribution: placement 16
 */
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
} from "path";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";

//@ chunk-bfnfj4kx.js:6027-6080 placement
var hos = ["prepend", "user", "append", "builtin", "core"];
//@ chunk-bfnfj4kx.js:6080-6111 placement
var CSi = ["allow", "ask", "deny"];
/**
 * 某层钩子之下还可以 next.to 的层：prepend→user/append/builtin/core，append→core，其他为空。
 */
//@ chunk-bfnfj4kx.js:6111-6217 placement
var tiersBeneath = (e) =>
  ({ prepend: ["user", "append", "builtin", "core"], user: [], append: ["core"], builtin: [], core: [] })[e];
//@ chunk-bfnfj4kx.js:6217-6257 placement
var Jfr = (e) => tiersBeneath("prepend").includes(e);
//@ chunk-bfnfj4kx.js:6286-6334 placement
var SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS = "scripts/bundle-builtin-hooks-module.ts";
/**
 * 取打包的内置 hooks 模块记录里的 files（只保留字符串值），冻结返回。
 */
//@ chunk-bfnfj4kx.js:6334-6481 placement
function readBundledFiles(e) {
  let o = isPlainObject(e) ? e.files : void 0;
  return Object.freeze(
    Object.fromEntries((isPlainObject(o) ? Object.entries(o) : []).filter((t) => typeof t[1] === "string")),
  );
}
/**
 * 取打包记录里的 scan（hooks、calls、nextTo 字段形状正确），没有则抛"构建未携带扫描结果"。
 */
//@ chunk-bfnfj4kx.js:6481-6753 placement
function readBundledScan(e, o) {
  let t = isPlainObject(e) ? e.scan : void 0;
  if (
    isPlainObject(t) &&
    Array.isArray(t.hooks) &&
    Array.isArray(t.calls) &&
    (t.nextTo === void 0 || Array.isArray(t.nextTo))
  )
    return t;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `the build carried no hooks module scan for ${o}`,
    "the build carried no hooks module scan for a built-in",
  );
}
/**
 * 生成"内置插件的 hooks 模块无法发布"遥测安全错误。
 */
//@ chunk-bfnfj4kx.js:6753-6864 placement
var builtinCannotShipError = (e, o) =>
  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `the hooks module of ${e} cannot ship: ${o}`,
    "the hooks module of a built-in cannot ship",
  );
//@ chunk-bfnfj4kx.js:6864-6891 placement
var HOOKS_REGISTER_TS = "hooks/register.ts";
//@ chunk-bfnfj4kx.js:6891-6924 placement
var lt = (e) => `builtin:${e}/${HOOKS_REGISTER_TS}`;
//@ chunk-bfnfj4kx.js:6924-6938 placement
var MODS = "mods";
//@ chunk-bfnfj4kx.js:6938-6953 placement
var MODS_2 = "mods/";
//@ chunk-bfnfj4kx.js:6985-7040 placement
var Ee = () => resolve(import.meta.dirname, "../../../../../..");
//@ chunk-bfnfj4kx.js:7111-7142 placement
var BUILTIN_HOOKS_MODULE = "builtin-hooks-module:";
/**
 * 把 builtin-hooks-module: 说明符换算成相对仓库根的路径（mods/ 前缀特殊处理）。
 */
//@ chunk-bfnfj4kx.js:7142-7279 placement
function builtinModuleRelativePath(e, o) {
  let sliced = o.slice(BUILTIN_HOOKS_MODULE.length);
  return sliced.startsWith(MODS_2)
    ? `${MODS}/${sliced.slice(MODS_2.length)}`
    : relative(Ee(), resolve_2(dirname(e), sliced))
        .split(sep)
        .join("/");
}
//@ chunk-bfnfj4kx.js:7279-7309 placement
var BUILTIN_HOOKS_MODULE_2 = "builtin-hooks-module";

export {
  Jfr,
  tiersBeneath,
  hos,
  CSi,
  HOOKS_REGISTER_TS,
  lt,
  Ee,
  MODS,
  BUILTIN_HOOKS_MODULE_2,
  builtinModuleRelativePath,
  SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS,
  builtinCannotShipError,
  readBundledScan,
  readBundledFiles,
};
