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
import { join, dirname } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { getErrnoCode } from "../errors.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { require_cel } from "../../../vendor/@bufbuild/cel/dist/cjs/index.js";
import { hostMatchesOnePattern, hostMatchesAnyPattern } from "../hostnameMatching.js";
import { ipInCidr } from "../cidr.js";
import { require_ext } from "../../../vendor/@bufbuild/cel/dist/cjs/ext/index.js";

//@ chunk-fq0cr76a.js:851402-851421 placement
/**
 * celModule：CEL 模块（CommonJS 包装）。
 */
var celModule = Re(require_picomatch_2(), 1);
//@ chunk-fq0cr76a.js:851744-851793 placement
var BRIDGE_SPAWN = "bridge-spawn";
var BRIDGE_SPAWN_DIR = join(homedir(), ".claude", BRIDGE_SPAWN);
//@ chunk-fq0cr76a.js:851793-851818 placement
/**
 * bridgeSpawnDir：bridge-spawn 目录路径。
 */
function bridgeSpawnDir() {
  return BRIDGE_SPAWN_DIR;
}
//@ chunk-fq0cr76a.js:851818-851954 placement = tryCreateExclusive (0.84)
/**
 * 确保某个私有目录存在（mode 0700）并返回路径。与调度锁无关。
 */
async function ensurePrivateDir() {
  let e = bridgeSpawnDir();
  await mkdir(dirname(e), {
    recursive: true,
  });
  try {
    await mkdir(e, {
      mode: 448,
    });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  }
  return e;
}
//@ chunk-fq0cr76a.js:851954-852029 placement
/**
 * CEL_MAX_ITEMS：CEL 函数列表上限；CEL_MAX_STRING_ELEMENTS：CEL 字符串条数上限；CEL_MAX_PATTERNS：CEL 模式数上限（同一声明共 5 个绑定）。
 */
var CEL_MAX_ITEMS = 30;
var CEL_MAX_STRING_ELEMENTS = 3;
var CEL_MAX_PATTERNS = 3;
var CEL_MAX_PATTERN_LENGTH = 1;
var HOST_FUNCTION_CATEGORIES = ["todos", "statsig", "logs", "access-audit"];
//@ chunk-fq0cr76a.js:852029-852049 placement
var celEnv = io(() => require_cel());
//@ chunk-fq0cr76a.js:852049-852418 placement
/**
 * 注册 CEL 函数 hostMatches/hostMatchesAny（主机名模式匹配）。
 */
function buildCelHostFunctions(e) {
  let { CelScalar, celFunc, listType } = e;
  return [
    celFunc("hostMatches", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (h, y) =>
      hostMatchesOnePattern(h, y),
    ),
    celFunc("hostMatchesAny", [CelScalar.STRING, listType(CelScalar.STRING)], CelScalar.BOOL, (h, y) => {
      let b = [];
      for (let S of y) {
        if (typeof S !== "string") throw Error("hostMatchesAny: non-string pattern in list");
        b.push(S);
      }
      return hostMatchesAnyPattern(h, b);
    }),
    celFunc("inCIDR", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (h, y) => ipInCidr(h, y)),
  ];
}
//@ chunk-fq0cr76a.js:852418-852506 placement
var celHostFunctions = io(() => {
  let e = celEnv();
  let { strings } = require_ext();
  return e.celEnv({
    funcs: [...strings, ...buildCelHostFunctions(e)],
  });
});
export {
  CEL_MAX_ITEMS,
  bridgeSpawnDir,
  BRIDGE_SPAWN,
  CEL_MAX_PATTERN_LENGTH,
  CEL_MAX_PATTERNS,
  HOST_FUNCTION_CATEGORIES,
  CEL_MAX_STRING_ELEMENTS,
  celModule,
  ensurePrivateDir,
};
