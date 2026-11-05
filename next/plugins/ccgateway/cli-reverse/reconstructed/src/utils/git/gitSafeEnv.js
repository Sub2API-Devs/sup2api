/**
 * utils/git/gitSafeEnv.ts
 *
 * 2.1.316 新增：git 安全环境变量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j7eg9eb6.js (16), chunk-p5vzmeny.js (2), chunk-vvzj896g.js (7)
 * attribution: placement 25
 */
import {
  getNative,
  eqAlias,
  isArrayLikeAlias,
  arrayLikeKeysAlias,
  stubArrayAlias,
  arrayPushAlias,
  getSymbolsInAlias,
  getAllKeysAlias,
} from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { baseAssignValue } from "../../../vendor/lodash-es/_baseAssignValue.js";
import { overArg_default } from "../../../vendor/lodash-es/_overArg.js";
import { baseKeysIn } from "../../../vendor/lodash-es/_baseKeysIn.js";
import { baseSet } from "../../../vendor/lodash-es/_baseSet.js";
import { basePickBy } from "../../../vendor/lodash-es/_basePickBy.js";
import { pickBy } from "../../../vendor/lodash-es/pickBy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vvzj896g.js:191-301 placement
/**
 * 安全 git 全局参数（禁用 hooksPath 与 fsmonitor）以及 --ignore-submodules=dirty 标志。
 */
var GIT_SAFE_GLOBAL_ARGS = Object.freeze(["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor="]);
var IGNORE_SUBMODULES_DIRTY_FLAG = "--ignore-submodules=dirty";
//@ chunk-vvzj896g.js:301-1462 placement
/**
 * 安全 git 环境的常量组：只读 status 参数、GIT_ALLOW_PROTOCOL、禁止懒加载/替换对象/交互提示的变量、需要清空的 GIT_* 变量与危险变量正则。
 */
var SAFE_GIT_ENV_CONSTANTS; // deferred: uses GIT_SAFE_GLOBAL_ARGS of its import cycle while loading; runs once the cycle is complete
var LFS_SKIP_ENV;
var GIT_ALLOW_PROTOCOL_VALUE;
var GIT_ALIAS_OVERRIDES;
var joined;
var SAFE_GIT_ENV;
var C_LOCALE_ENV;
var DISABLED_SSH_ENV;
var GIT_CONFIG_PARAMETERS_LIMIT;
var SAFE_GIT_REPO_ARGS;
var GIT_LOCATION_ENV_VARS;
var GIT_ENV_VARS_TO_CLEAR;
var GIT_CONFIG_INDEXED_ENV_RE;
var regExp;
var GIT_TRANSPORT_ENV_RE;
var GIT_ENV_VARS_TO_CLEAR_SET;
deferInit("chunk-vvzj896g.js:301", () => {
  SAFE_GIT_ENV_CONSTANTS = Object.freeze([
    "--no-optional-locks",
    "status",
    "--porcelain",
    "--untracked-files=normal",
    "--ignore-submodules=dirty",
  ]);
  LFS_SKIP_ENV = Object.freeze({
    GIT_LFS_SKIP_SMUDGE: "1",
  });
  GIT_ALLOW_PROTOCOL_VALUE = "/";
  GIT_ALIAS_OVERRIDES = [
    "'alias.remote-none=version'",
    "'alias.remote-none.command=version'",
    "'alias.remote-/.command=version'",
    "'fetch.bundleURI='",
    "'help.autocorrect=0'",
  ];
  joined = GIT_ALIAS_OVERRIDES.join(" ");
  SAFE_GIT_ENV = Object.freeze({
    GIT_ALLOW_PROTOCOL: "/",
    GIT_CONFIG_PARAMETERS: joined,
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    ...LFS_SKIP_ENV,
  });
  C_LOCALE_ENV = Object.freeze({
    LC_ALL: "C",
    LANGUAGE: "C",
  });
  DISABLED_SSH_ENV = Object.freeze({
    GIT_SSH_COMMAND: "false",
  });
  GIT_CONFIG_PARAMETERS_LIMIT = 2000;
  SAFE_GIT_REPO_ARGS = Object.freeze([
    ...GIT_SAFE_GLOBAL_ARGS,
    "-c",
    "safe.bareRepository=explicit",
    "-c",
    "protocol.file.allow=never",
  ]);
  GIT_LOCATION_ENV_VARS = [
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
  GIT_ENV_VARS_TO_CLEAR = [
    ...GIT_LOCATION_ENV_VARS,
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_PARAMETERS",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM",
    "GIT_CONFIG",
  ];
  GIT_CONFIG_INDEXED_ENV_RE = /^GIT_CONFIG_(KEY|VALUE)_\d+$/;
  regExp = new RegExp(GIT_CONFIG_INDEXED_ENV_RE.source, "i");
  GIT_TRANSPORT_ENV_RE = /^GIT_(?:SSL|PROXY)_/i;
  GIT_ENV_VARS_TO_CLEAR_SET = new Set(GIT_ENV_VARS_TO_CLEAR);
});
//@ chunk-vvzj896g.js:1599-1711 placement
/**
 * 带 GIT_NO_REPLACE_OBJECTS 的安全 git 环境，未列出的危险变量置空。
 */
function buildSafeGitEnvForRepo(repoPath, options = {}) {
  let safeGitEnv = buildSafeGitEnv(
    {
      GIT_NO_REPLACE_OBJECTS: "1",
    },
    repoPath,
    options,
  );
  for (let varName of UNSET_LFS_ENV_VARS) if (!(varName in safeGitEnv)) safeGitEnv[varName] = undefined;
  return safeGitEnv;
}
//@ chunk-vvzj896g.js:1711-1761 placement
var UNSET_LFS_ENV_VARS = ["GIT_LFS_SKIP_SMUDGE", "GIT_NO_LAZY_FETCH"];
//@ chunk-vvzj896g.js:1761-2206 placement
/**
 * 以 base（默认 process.env）为底，叠加给定变量与仓库的 GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE； 清除 dre 列出的变量、匹配危险规则的变量以及与覆盖项大小写冲突的变量。GIT_ALLOW_PROTOCOL 转为 alias 配置。
 */
function buildSafeGitEnv(overrides, pins, { base = process.env, repository }) {
  let nextEnv = applyAllowProtocol({
    ...overrides,
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
    ...pins,
  });
  let cleared = {};
  for (let varName of GIT_ENV_VARS_TO_CLEAR) cleared[varName] = undefined;
  let overrideKeys = new Set(Object.keys(nextEnv).map((key) => key.toUpperCase()));
  for (let key of Object.keys(base)) {
    let upper = key.toUpperCase();
    if (
      GIT_ENV_VARS_TO_CLEAR_SET.has(upper) ||
      regExp.test(key) ||
      (overrideKeys.has(upper) && !(key in nextEnv))
    )
      cleared[key] = undefined;
  }
  return {
    ...base,
    ...cleared,
    ...nextEnv,
  };
}
//@ chunk-vvzj896g.js:2206-2692 placement
/**
 * 把 GIT_ALLOW_PROTOCOL 转成禁止其他 transport 的 GIT_CONFIG_PARAMETERS。
 */
function applyAllowProtocol(env) {
  let GIT_ALLOW_PROTOCOL = env.GIT_ALLOW_PROTOCOL;
  if (GIT_ALLOW_PROTOCOL === undefined)
    return {
      ...env,
    };
  let filtered = GIT_ALLOW_PROTOCOL.split(":").filter((transport) => transport !== "/");
  if (filtered.find((transport) => !/^[A-Za-z0-9-]*$/.test(transport)) !== undefined)
    throw Error('GIT_ALLOW_PROTOCOL may list only transport names made of letters, digits and "-"');
  let aliasOverrides = [
    ...new Set([
      ...GIT_ALIAS_OVERRIDES,
      ...filtered.flatMap((transport) => [
        `'alias.remote-${transport}=version'`,
        `'alias.remote-${transport}.command=version'`,
      ]),
    ]),
  ];
  let GIT_CONFIG_PARAMETERS = env.GIT_CONFIG_PARAMETERS;
  return {
    ...env,
    GIT_CONFIG_PARAMETERS: [
      ...(GIT_CONFIG_PARAMETERS === undefined ||
      GIT_CONFIG_PARAMETERS === "" ||
      GIT_CONFIG_PARAMETERS === joined
        ? []
        : [GIT_CONFIG_PARAMETERS]),
      ...aliasOverrides,
    ].join(" "),
  };
}
//@ chunk-vvzj896g.js:2692-2969 placement
function sanitizePathForGit(safeGitEnv) {
  let normalizeEntry = (path) => path;
  let isAbsoluteEntry = (path) => path.startsWith("/");
  let sanitizeValue = (value) => {
    if (value === undefined) return;
    let filtered = value
      .split(":")
      .map(normalizeEntry)
      .filter((part) => part !== "" && isAbsoluteEntry(part));
    return filtered.length > 0 ? filtered.join(":") : "/dev/null";
  };
  let filtered = Object.keys(safeGitEnv).filter((key) => key === "PATH");
  return {
    ...safeGitEnv,
    ...Object.fromEntries(filtered.map((key) => [key, sanitizeValue(safeGitEnv[key])])),
  };
}
//@ chunk-p5vzmeny.js:228-325 placement
/**
 * lodash 内部工具：安全的 Object.defineProperty（不支持时为空）。
 */
var definePropertyHelper; // deferred: uses getNative (../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs) of its import cycle while loading; runs once the cycle is complete
var definePropertyFn;
deferInit("chunk-p5vzmeny.js:228", () => {
  definePropertyHelper = (function () {
    try {
      var fn = getNative(Object, "defineProperty");
      fn({}, "", {});
      return fn;
    } catch (error) {}
  })();
  definePropertyFn = definePropertyHelper;
});
//@ chunk-p5vzmeny.js:439-449 placement
/**
 * lodash 内部工具：直接写对象属性值的别名。
 */
var assignValueRaw = baseAssignValue;
//@ chunk-j7eg9eb6.js:389-435 placement
/**
 * lodash 内部工具：取对象原型（Object.getPrototypeOf 的包装）。
 */
var getPrototypeOfHelper; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var getPrototype;
deferInit("chunk-j7eg9eb6.js:389", () => {
  getPrototypeOfHelper = overArg_default(Object.getPrototypeOf, Object);
  getPrototype = getPrototypeOfHelper;
});
//@ chunk-j7eg9eb6.js:435-477 placement
var objectPrototype; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hasOwnProperty;
deferInit("chunk-j7eg9eb6.js:435", () => {
  objectPrototype = Object.prototype;
  hasOwnProperty = objectPrototype.hasOwnProperty;
});
//@ chunk-j7eg9eb6.js:477-568 placement
function assignValueIfChanged(object, key, value) {
  var current = object[key];
  if (
    !(hasOwnProperty.call(object, key) && eqAlias(current, value)) ||
    (value === undefined && !(key in object))
  )
    assignValueRaw(object, key, value);
}
//@ chunk-j7eg9eb6.js:568-578 placement
/**
 * lodash 内部工具：值不同才写属性的别名（assignValueIfChanged 的导出名）。
 */
var assignValueIfDifferent = assignValueIfChanged;
//@ chunk-j7eg9eb6.js:578-654 placement
function enumerableKeys(object) {
  var keys = [];
  if (object != null) for (var key in Object(object)) keys.push(key);
  return keys;
}
//@ chunk-j7eg9eb6.js:654-662 placement
/**
 * lodash 内部工具：取对象可枚举键（keysIn）的别名。
 */
var keysInOf = enumerableKeys;
//@ chunk-j7eg9eb6.js:662-704 placement
var objectProtoForKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hasOwnProperty_2;
deferInit("chunk-j7eg9eb6.js:662", () => {
  objectProtoForKeys = Object.prototype;
  hasOwnProperty_2 = objectProtoForKeys.hasOwnProperty;
});
//@ chunk-j7eg9eb6.js:834-842 placement
var baseKeysInHelper = baseKeysIn;
//@ chunk-j7eg9eb6.js:842-885 placement
function keysIn(object) {
  return isArrayLikeAlias(object) ? arrayLikeKeysAlias(object, true) : baseKeysInHelper(object);
}
//@ chunk-j7eg9eb6.js:885-895 placement
/**
 * lodash 内部工具：keysIn 的导出别名。
 */
var keysInAlias = keysIn;
//@ chunk-j7eg9eb6.js:895-1007 placement
/**
 * lodash 内部工具：遍历原型链收集自有 symbol 键。
 */
var getOwnPropertySymbols; // deferred: uses stubArrayAlias (../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs) of its import cycle while loading; runs once the cycle is complete
var getOwnSymbols;
var ownSymbols;
deferInit("chunk-j7eg9eb6.js:895", () => {
  getOwnPropertySymbols = Object.getOwnPropertySymbols;
  getOwnSymbols = !getOwnPropertySymbols
    ? stubArrayAlias
    : function (object) {
        var symbols = [];
        while (object) {
          arrayPushAlias(symbols, getSymbolsInAlias(object));
          object = getPrototype(object);
        }
        return symbols;
      };
  ownSymbols = getOwnSymbols;
});
//@ chunk-j7eg9eb6.js:1007-1043 placement
function getAllKeysIn(object) {
  return getAllKeysAlias(object, keysInAlias, ownSymbols);
}
//@ chunk-j7eg9eb6.js:1043-1053 placement
/**
 * lodash 内部工具：取全部键（含继承与 symbol）的别名。
 */
var allKeysIn = getAllKeysIn;
//@ chunk-j7eg9eb6.js:1348-1356 placement
/**
 * lodash 内部工具：设置对象值的底层实现别名。
 */
var setValueRaw = baseSet;
//@ chunk-j7eg9eb6.js:1469-1479 placement
/**
 * lodash 内部工具：按条件挑选条目（basePickBy）的别名。
 */
var pickByBase = basePickBy;
//@ chunk-j7eg9eb6.js:1612-1621 placement
/**
 * lodash 内部工具：pickBy 的别名。
 */
var pickByHelper = pickBy;
export {
  pickByHelper,
  GIT_SAFE_GLOBAL_ARGS,
  IGNORE_SUBMODULES_DIRTY_FLAG,
  assignValueRaw,
  getPrototype,
  pickByBase,
  assignValueIfDifferent,
  SAFE_GIT_REPO_ARGS,
  GIT_CONFIG_PARAMETERS_LIMIT,
  buildSafeGitEnvForRepo,
  SAFE_GIT_ENV_CONSTANTS,
  GIT_ENV_VARS_TO_CLEAR,
  GIT_ALLOW_PROTOCOL_VALUE,
  keysInAlias,
  ownSymbols,
  allKeysIn,
  definePropertyFn,
  regExp,
  GIT_LOCATION_ENV_VARS,
  sanitizePathForGit,
  buildSafeGitEnv,
  SAFE_GIT_ENV,
  C_LOCALE_ENV,
  DISABLED_SSH_ENV,
  GIT_TRANSPORT_ENV_RE,
  LFS_SKIP_ENV,
  keysInOf,
  hasOwnProperty_2,
  setValueRaw,
};
