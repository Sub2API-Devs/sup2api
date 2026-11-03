/**
 * utils/sandbox/celHostFunctions.ts
 *
 * 2.1.316 新增：网络策略 CEL 表达式的自定义函数（hostMatches、hostMatchesAny、inCIDR）与沙箱持久目录常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq0cr76a.js (8)
 * attribution: placement 8
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
} from "os";
import { mkdir, mkdir as mkdir_2, mkdir as mkdir_3 } from "fs/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { hqt } from "../../../vendor/picomatch/index.js";
import { getErrnoCode } from "../errors.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { WF } from "../../../vendor/@bufbuild/cel/dist/cjs/index.js";
import { uhs, fhs } from "../hostnameMatching.js";
import { ipInCidr } from "../cidr.js";
import { lM } from "../../../vendor/@bufbuild/cel/dist/cjs/ext/index.js";

//@ chunk-fq0cr76a.js:851402-851421 placement
var gw = Re(hqt(), 1);
//@ chunk-fq0cr76a.js:851744-851793 placement
var BRIDGE_SPAWN = "bridge-spawn",
  Oq = join_10(homedir_4(), ".claude", BRIDGE_SPAWN);
//@ chunk-fq0cr76a.js:851793-851818 placement
function yqt() {
  return Oq;
}
/**
 * 确保某个私有目录存在（mode 0700）并返回路径。与调度锁无关。
 */
//@ chunk-fq0cr76a.js:851818-851954 placement = tryCreateExclusive (0.84)
async function ensurePrivateDir() {
  let e = yqt();
  await mkdir_3(dirname_8(e), { recursive: !0 });
  try {
    await mkdir_3(e, { mode: 448 });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  }
  return e;
}
//@ chunk-fq0cr76a.js:851954-852029 placement
var _qt = 30,
  Pai = 3,
  Iai = 3,
  C3o = 1,
  Q6r = ["todos", "statsig", "logs", "access-audit"];
//@ chunk-fq0cr76a.js:852029-852049 placement
var Sv = io(() => WF());
/**
 * 注册 CEL 函数 hostMatches/hostMatchesAny（主机名模式匹配）。
 */
//@ chunk-fq0cr76a.js:852049-852418 placement
function buildCelHostFunctions(e) {
  let { CelScalar: CelScalar, celFunc: celFunc, listType: listType } = e;
  return [
    celFunc("hostMatches", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (h, y) => uhs(h, y)),
    celFunc("hostMatchesAny", [CelScalar.STRING, listType(CelScalar.STRING)], CelScalar.BOOL, (h, y) => {
      let b = [];
      for (let S of y) {
        if (typeof S !== "string") throw Error("hostMatchesAny: non-string pattern in list");
        b.push(S);
      }
      return fhs(h, b);
    }),
    celFunc("inCIDR", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (h, y) => ipInCidr(h, y)),
  ];
}
//@ chunk-fq0cr76a.js:852418-852506 placement
var Gae = io(() => {
  let e = Sv(),
    { strings: strings } = lM();
  return e.celEnv({ funcs: [...strings, ...buildCelHostFunctions(e)] });
});

export { _qt, yqt, BRIDGE_SPAWN, C3o, Iai, Q6r, Pai, gw, ensurePrivateDir };
