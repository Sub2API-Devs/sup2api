/**
 * utils/git/gitSafeEnv.ts
 *
 * 2.1.316 新增：git 安全环境变量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3a1caa6f.js (25)
 * attribution: placement 25
 */
import { overArg_default } from "../../../vendor/lodash-es/_overArg.js";
import {
  hde,
  TMe,
  Phe,
  odo,
  rdo,
  AQt,
  CQt,
  tdo,
} from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { baseAssignValue } from "../../../vendor/lodash-es/_baseAssignValue.js";
import { baseKeysIn } from "../../../vendor/lodash-es/_baseKeysIn.js";
import { baseSet } from "../../../vendor/lodash-es/_baseSet.js";
import { basePickBy } from "../../../vendor/lodash-es/_basePickBy.js";
import { pickBy } from "../../../vendor/lodash-es/pickBy.js";

//@ chunk-3a1caa6f.js:356-402 placement
/**
 * lodash 内部工具：取对象原型（Object.getPrototypeOf 的包装）。
 */
var getPrototypeOfHelper = overArg_default(Object.getPrototypeOf, Object);
var getPrototype = getPrototypeOfHelper;
//@ chunk-3a1caa6f.js:402-499 placement
/**
 * lodash 内部工具：安全的 Object.defineProperty（不支持时为空）。
 */
var definePropertyHelper = (function () {
  try {
    var e = hde(Object, "defineProperty");
    e({}, "", {});
    return e;
  } catch (error) {}
})();
var definePropertyFn = definePropertyHelper;
//@ chunk-3a1caa6f.js:613-623 placement
/**
 * lodash 内部工具：直接写对象属性值的别名。
 */
var assignValueRaw = baseAssignValue;
//@ chunk-3a1caa6f.js:623-665 placement
var objectPrototype = Object.prototype;
var hasOwnProperty = objectPrototype.hasOwnProperty;
//@ chunk-3a1caa6f.js:665-756 placement
function assignValueIfChanged(e, r, n) {
  var o = e[r];
  if (!(hasOwnProperty.call(e, r) && TMe(o, n)) || (n === undefined && !(r in e))) assignValueRaw(e, r, n);
}
//@ chunk-3a1caa6f.js:756-766 placement
/**
 * lodash 内部工具：值不同才写属性的别名（assignValueIfChanged 的导出名）。
 */
var assignValueIfDifferent = assignValueIfChanged;
//@ chunk-3a1caa6f.js:766-842 placement
function enumerableKeys(e) {
  var r = [];
  if (e != null) for (var key in Object(e)) r.push(key);
  return r;
}
//@ chunk-3a1caa6f.js:842-850 placement
/**
 * lodash 内部工具：取对象可枚举键（keysIn）的别名。
 */
var keysInOf = enumerableKeys;
//@ chunk-3a1caa6f.js:850-892 placement
var objectProtoForKeys = Object.prototype;
var hasOwnProperty_2 = objectProtoForKeys.hasOwnProperty;
//@ chunk-3a1caa6f.js:1022-1030 placement
var baseKeysInHelper = baseKeysIn;
//@ chunk-3a1caa6f.js:1030-1073 placement
function keysIn(e) {
  return Phe(e) ? odo(e, true) : baseKeysInHelper(e);
}
//@ chunk-3a1caa6f.js:1073-1083 placement
/**
 * lodash 内部工具：keysIn 的导出别名。
 */
var keysInAlias = keysIn;
//@ chunk-3a1caa6f.js:1083-1195 placement
/**
 * lodash 内部工具：遍历原型链收集自有 symbol 键。
 */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var getOwnSymbols = !getOwnPropertySymbols
  ? rdo
  : function (e) {
      var r = [];
      while (e) {
        AQt(r, CQt(e));
        e = getPrototype(e);
      }
      return r;
    };
var ownSymbols = getOwnSymbols;
//@ chunk-3a1caa6f.js:1195-1231 placement
function getAllKeysIn(e) {
  return tdo(e, keysInAlias, ownSymbols);
}
//@ chunk-3a1caa6f.js:1231-1241 placement
/**
 * lodash 内部工具：取全部键（含继承与 symbol）的别名。
 */
var allKeysIn = getAllKeysIn;
//@ chunk-3a1caa6f.js:1536-1544 placement
/**
 * lodash 内部工具：设置对象值的底层实现别名。
 */
var setValueRaw = baseSet;
//@ chunk-3a1caa6f.js:1657-1667 placement
/**
 * lodash 内部工具：按条件挑选条目（basePickBy）的别名。
 */
var pickByBase = basePickBy;
//@ chunk-3a1caa6f.js:1800-1809 placement
/**
 * lodash 内部工具：pickBy 的别名。
 */
var pickByHelper = pickBy;
//@ chunk-3a1caa6f.js:1809-1919 placement
/**
 * 安全 git 全局参数（禁用 hooksPath 与 fsmonitor）以及 --ignore-submodules=dirty 标志。
 */
var GIT_SAFE_GLOBAL_ARGS = Object.freeze(["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor="]);
var IGNORE_SUBMODULES_DIRTY_FLAG = "--ignore-submodules=dirty";
//@ chunk-3a1caa6f.js:1919-3079 placement
/**
 * 安全 git 环境的常量组：只读 status 参数、GIT_ALLOW_PROTOCOL、禁止懒加载/替换对象/交互提示的变量、需要清空的 GIT_* 变量与危险变量正则。
 */
var SAFE_GIT_ENV_CONSTANTS = Object.freeze([
  "--no-optional-locks",
  "status",
  "--porcelain",
  "--untracked-files=normal",
  "--ignore-submodules=dirty",
]);
var FSr = Object.freeze({
  GIT_LFS_SKIP_SMUDGE: "1",
});
var GIT_ALLOW_PROTOCOL_VALUE = "/";
var GIT_ALIAS_OVERRIDES = [
  "'alias.remote-none=version'",
  "'alias.remote-none.command=version'",
  "'alias.remote-/.command=version'",
  "'fetch.bundleURI='",
  "'help.autocorrect=0'",
];
var joined = GIT_ALIAS_OVERRIDES.join(" ");
var M = Object.freeze({
  GIT_ALLOW_PROTOCOL: "/",
  GIT_CONFIG_PARAMETERS: joined,
  GIT_NO_LAZY_FETCH: "1",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_TERMINAL_PROMPT: "0",
  ...FSr,
});
var b = Object.freeze({
  LC_ALL: "C",
  LANGUAGE: "C",
});
var F = Object.freeze({
  GIT_SSH_COMMAND: "false",
});
var GIT_CONFIG_PARAMETERS_LIMIT = 2000;
var BMt = Object.freeze([
  ...GIT_SAFE_GLOBAL_ARGS,
  "-c",
  "safe.bareRepository=explicit",
  "-c",
  "protocol.file.allow=never",
]);
var GIT_LOCATION_ENV_VARS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_CEILING_DIRECTORIES",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_SHALLOW_FILE",
  "GIT_NAMESPACE",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_REFERENCE_BACKEND",
];
var GIT_ENV_VARS_TO_CLEAR = [
  ...GIT_LOCATION_ENV_VARS,
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG",
];
var GIT_CONFIG_INDEXED_ENV_RE = /^GIT_CONFIG_(KEY|VALUE)_\d+$/;
var regExp = new RegExp(GIT_CONFIG_INDEXED_ENV_RE.source, "i");
var GIT_TRANSPORT_ENV_RE = /^GIT_(?:SSL|PROXY)_/i;
var GIT_ENV_VARS_TO_CLEAR_SET = new Set(GIT_ENV_VARS_TO_CLEAR);
//@ chunk-3a1caa6f.js:3216-3328 placement
/**
 * 带 GIT_NO_REPLACE_OBJECTS 的安全 git 环境，未列出的危险变量置空。
 */
function buildSafeGitEnvForRepo(e, r = {}) {
  let safeGitEnv = buildSafeGitEnv(
    {
      GIT_NO_REPLACE_OBJECTS: "1",
    },
    e,
    r,
  );
  for (let o of UNSET_LFS_ENV_VARS) if (!(o in safeGitEnv)) safeGitEnv[o] = undefined;
  return safeGitEnv;
}
//@ chunk-3a1caa6f.js:3328-3378 placement
var UNSET_LFS_ENV_VARS = ["GIT_LFS_SKIP_SMUDGE", "GIT_NO_LAZY_FETCH"];
//@ chunk-3a1caa6f.js:3378-3823 placement
/**
 * 以 base（默认 process.env）为底，叠加给定变量与仓库的 GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE； 清除 dre 列出的变量、匹配危险规则的变量以及与覆盖项大小写冲突的变量。GIT_ALLOW_PROTOCOL 转为 alias 配置。
 */
function buildSafeGitEnv(e, r, { base = process.env, repository }) {
  let i = applyAllowProtocol({
    ...e,
    ...(repository !== undefined && {
      GIT_DIR: repository.gitDir,
      GIT_COMMON_DIR: repository.commonDir,
    }),
    ...(repository !== undefined &&
      (repository.workTree !== null
        ? {
            GIT_WORK_TREE: repository.workTree,
          }
        : {
            GIT_IMPLICIT_WORK_TREE: "0",
          })),
    ...r,
  });
  let s = {};
  for (let t of GIT_ENV_VARS_TO_CLEAR) s[t] = undefined;
  let a = new Set(Object.keys(i).map((key) => key.toUpperCase()));
  for (let key of Object.keys(base)) {
    let upper = key.toUpperCase();
    if (GIT_ENV_VARS_TO_CLEAR_SET.has(upper) || regExp.test(key) || (a.has(upper) && !(key in i)))
      s[key] = undefined;
  }
  return {
    ...base,
    ...s,
    ...i,
  };
}
//@ chunk-3a1caa6f.js:3823-4309 placement
/**
 * 把 GIT_ALLOW_PROTOCOL 转成禁止其他 transport 的 GIT_CONFIG_PARAMETERS。
 */
function applyAllowProtocol(e) {
  let GIT_ALLOW_PROTOCOL = e.GIT_ALLOW_PROTOCOL;
  if (GIT_ALLOW_PROTOCOL === undefined)
    return {
      ...e,
    };
  let filtered = GIT_ALLOW_PROTOCOL.split(":").filter((t) => t !== "/");
  if (filtered.find((t) => !/^[A-Za-z0-9-]*$/.test(t)) !== undefined)
    throw Error('GIT_ALLOW_PROTOCOL may list only transport names made of letters, digits and "-"');
  let i = [
    ...new Set([
      ...GIT_ALIAS_OVERRIDES,
      ...filtered.flatMap((t) => [`'alias.remote-${t}=version'`, `'alias.remote-${t}.command=version'`]),
    ]),
  ];
  let GIT_CONFIG_PARAMETERS = e.GIT_CONFIG_PARAMETERS;
  return {
    ...e,
    GIT_CONFIG_PARAMETERS: [
      ...(GIT_CONFIG_PARAMETERS === undefined ||
      GIT_CONFIG_PARAMETERS === "" ||
      GIT_CONFIG_PARAMETERS === joined
        ? []
        : [GIT_CONFIG_PARAMETERS]),
      ...i,
    ].join(" "),
  };
}
//@ chunk-3a1caa6f.js:4309-4586 placement
function sanitizePathForGit(safeGitEnv) {
  let o = (t) => t;
  let i = (t) => t.startsWith("/");
  let s = (t) => {
    if (t === undefined) return;
    let filtered = t
      .split(":")
      .map(o)
      .filter((O) => O !== "" && i(O));
    return filtered.length > 0 ? filtered.join(":") : "/dev/null";
  };
  let filtered = Object.keys(safeGitEnv).filter((key) => key === "PATH");
  return {
    ...safeGitEnv,
    ...Object.fromEntries(filtered.map((t) => [t, s(safeGitEnv[t])])),
  };
}
export {
  sanitizePathForGit,
  buildSafeGitEnv,
  M,
  b,
  F,
  IGNORE_SUBMODULES_DIRTY_FLAG,
  pickByHelper,
  GIT_SAFE_GLOBAL_ARGS,
  BMt,
  GIT_CONFIG_PARAMETERS_LIMIT,
  buildSafeGitEnvForRepo,
  SAFE_GIT_ENV_CONSTANTS,
  assignValueIfDifferent,
  definePropertyFn,
  keysInOf,
  hasOwnProperty_2,
  setValueRaw,
  allKeysIn,
  pickByBase,
  GIT_ALLOW_PROTOCOL_VALUE,
  getPrototype,
  assignValueRaw,
  keysInAlias,
  ownSymbols,
  GIT_LOCATION_ENV_VARS,
  GIT_ENV_VARS_TO_CLEAR,
  GIT_TRANSPORT_ENV_RE,
  regExp,
  FSr,
};
