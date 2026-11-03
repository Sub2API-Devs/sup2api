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
import { sdo } from "../../../vendor/lodash-es/_overArg.js";
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
var l = sdo(Object.getPrototypeOf, Object),
  pDn = l;
//@ chunk-3a1caa6f.js:402-499 placement
var u = (function () {
    try {
      var e = hde(Object, "defineProperty");
      return (e({}, "", {}), e);
    } catch (error) {}
  })(),
  fDn = u;
//@ chunk-3a1caa6f.js:613-623 placement
var Ohe = baseAssignValue;
//@ chunk-3a1caa6f.js:623-665 placement
var R = Object.prototype,
  hasOwnProperty = R.hasOwnProperty;
//@ chunk-3a1caa6f.js:665-756 placement
function G(e, r, n) {
  var o = e[r];
  if (!(hasOwnProperty.call(e, r) && TMe(o, n)) || (n === void 0 && !(r in e))) Ohe(e, r, n);
}
//@ chunk-3a1caa6f.js:756-766 placement
var Dut = G;
//@ chunk-3a1caa6f.js:766-842 placement
function N(e) {
  var r = [];
  if (e != null) for (var key in Object(e)) r.push(key);
  return r;
}
//@ chunk-3a1caa6f.js:842-850 placement
var c = N;
//@ chunk-3a1caa6f.js:850-892 placement
var A = Object.prototype,
  hasOwnProperty_2 = A.hasOwnProperty;
//@ chunk-3a1caa6f.js:1022-1030 placement
var I = baseKeysIn;
//@ chunk-3a1caa6f.js:1030-1073 placement
function C(e) {
  return Phe(e) ? odo(e, !0) : I(e);
}
//@ chunk-3a1caa6f.js:1073-1083 placement
var J8e = C;
//@ chunk-3a1caa6f.js:1083-1195 placement
var getOwnPropertySymbols = Object.getOwnPropertySymbols,
  y = !getOwnPropertySymbols
    ? rdo
    : function (e) {
        var r = [];
        while (e) (AQt(r, CQt(e)), (e = pDn(e)));
        return r;
      },
  ddo = y;
//@ chunk-3a1caa6f.js:1195-1231 placement
function v(e) {
  return tdo(e, J8e, ddo);
}
//@ chunk-3a1caa6f.js:1231-1241 placement
var mDn = v;
//@ chunk-3a1caa6f.js:1536-1544 placement
var T = baseSet;
//@ chunk-3a1caa6f.js:1657-1667 placement
var ldo = basePickBy;
//@ chunk-3a1caa6f.js:1800-1809 placement
var Do = pickBy;
//@ chunk-3a1caa6f.js:1809-1919 placement
var freeze = Object.freeze(["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor="]),
  lb = "--ignore-submodules=dirty";
//@ chunk-3a1caa6f.js:1919-3079 placement
var freeze_2 = Object.freeze([
    "--no-optional-locks",
    "status",
    "--porcelain",
    "--untracked-files=normal",
    "--ignore-submodules=dirty",
  ]),
  freeze_3 = Object.freeze({ GIT_LFS_SKIP_SMUDGE: "1" }),
  kMe = "/",
  d = [
    "'alias.remote-none=version'",
    "'alias.remote-none.command=version'",
    "'alias.remote-/.command=version'",
    "'fetch.bundleURI='",
    "'help.autocorrect=0'",
  ],
  joined = d.join(" "),
  freeze_4 = Object.freeze({
    GIT_ALLOW_PROTOCOL: "/",
    GIT_CONFIG_PARAMETERS: joined,
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    ...freeze_3,
  }),
  freeze_5 = Object.freeze({ LC_ALL: "C", LANGUAGE: "C" }),
  freeze_6 = Object.freeze({ GIT_SSH_COMMAND: "false" }),
  USr = 2000,
  freeze_7 = Object.freeze([
    ...freeze,
    "-c",
    "safe.bareRepository=explicit",
    "-c",
    "protocol.file.allow=never",
  ]),
  Lut = [
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
  ],
  dre = [
    ...Lut,
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_PARAMETERS",
    "GIT_CONFIG_GLOBAL",
    "GIT_CONFIG_SYSTEM",
    "GIT_CONFIG",
  ],
  h = /^GIT_CONFIG_(KEY|VALUE)_\d+$/,
  regExp = new RegExp(h.source, "i"),
  BSr = /^GIT_(?:SSL|PROXY)_/i,
  K = new Set(dre);
/**
 * 带 GIT_NO_REPLACE_OBJECTS 的安全 git 环境，未列出的危险变量置空。
 */
//@ chunk-3a1caa6f.js:3216-3328 placement
function buildSafeGitEnvForRepo(e, r = {}) {
  let n = buildSafeGitEnv({ GIT_NO_REPLACE_OBJECTS: "1" }, e, r);
  for (let o of U) if (!(o in n)) n[o] = void 0;
  return n;
}
//@ chunk-3a1caa6f.js:3328-3378 placement
var U = ["GIT_LFS_SKIP_SMUDGE", "GIT_NO_LAZY_FETCH"];
/**
 * 以 base（默认 process.env）为底，叠加给定变量与仓库的 GIT_DIR/GIT_COMMON_DIR/GIT_WORK_TREE； 清除 dre 列出的变量、匹配危险规则的变量以及与覆盖项大小写冲突的变量。GIT_ALLOW_PROTOCOL 转为 alias 配置。
 */
//@ chunk-3a1caa6f.js:3378-3823 placement
function buildSafeGitEnv(e, r, { base: base = process.env, repository: repository }) {
  let i = applyAllowProtocol({
      ...e,
      ...(repository !== void 0 && { GIT_DIR: repository.gitDir, GIT_COMMON_DIR: repository.commonDir }),
      ...(repository !== void 0 &&
        (repository.workTree !== null
          ? { GIT_WORK_TREE: repository.workTree }
          : { GIT_IMPLICIT_WORK_TREE: "0" })),
      ...r,
    }),
    s = {};
  for (let t of dre) s[t] = void 0;
  let a = new Set(Object.keys(i).map((t) => t.toUpperCase()));
  for (let t of Object.keys(base)) {
    let upper = t.toUpperCase();
    if (K.has(upper) || regExp.test(t) || (a.has(upper) && !(t in i))) s[t] = void 0;
  }
  return { ...base, ...s, ...i };
}
/**
 * 把 GIT_ALLOW_PROTOCOL 转成禁止其他 transport 的 GIT_CONFIG_PARAMETERS。
 */
//@ chunk-3a1caa6f.js:3823-4309 placement
function applyAllowProtocol(e) {
  let GIT_ALLOW_PROTOCOL = e.GIT_ALLOW_PROTOCOL;
  if (GIT_ALLOW_PROTOCOL === void 0) return { ...e };
  let filtered = GIT_ALLOW_PROTOCOL.split(":").filter((t) => t !== "/");
  if (filtered.find((t) => !/^[A-Za-z0-9-]*$/.test(t)) !== void 0)
    throw Error('GIT_ALLOW_PROTOCOL may list only transport names made of letters, digits and "-"');
  let i = [
      ...new Set([
        ...d,
        ...filtered.flatMap((t) => [`'alias.remote-${t}=version'`, `'alias.remote-${t}.command=version'`]),
      ]),
    ],
    GIT_CONFIG_PARAMETERS = e.GIT_CONFIG_PARAMETERS;
  return {
    ...e,
    GIT_CONFIG_PARAMETERS: [
      ...(GIT_CONFIG_PARAMETERS === void 0 || GIT_CONFIG_PARAMETERS === "" || GIT_CONFIG_PARAMETERS === joined
        ? []
        : [GIT_CONFIG_PARAMETERS]),
      ...i,
    ].join(" "),
  };
}
//@ chunk-3a1caa6f.js:4309-4586 placement
function sanitizePathForGit(e) {
  let o = (t) => t,
    i = (t) => t.startsWith("/"),
    s = (t) => {
      if (t === void 0) return;
      let filtered = t
        .split(":")
        .map(o)
        .filter((O) => O !== "" && i(O));
      return filtered.length > 0 ? filtered.join(":") : "/dev/null";
    },
    filtered = Object.keys(e).filter((t) => t === "PATH");
  return { ...e, ...Object.fromEntries(filtered.map((t) => [t, s(e[t])])) };
}

export {
  sanitizePathForGit,
  buildSafeGitEnv,
  freeze_4,
  freeze_5,
  freeze_6,
  lb,
  Do,
  freeze,
  freeze_7,
  USr,
  buildSafeGitEnvForRepo,
  freeze_2,
  Dut,
  fDn,
  c,
  hasOwnProperty_2,
  T,
  mDn,
  ldo,
  kMe,
  pDn,
  Ohe,
  J8e,
  ddo,
  Lut,
  dre,
  BSr,
  regExp,
  freeze_3,
};
