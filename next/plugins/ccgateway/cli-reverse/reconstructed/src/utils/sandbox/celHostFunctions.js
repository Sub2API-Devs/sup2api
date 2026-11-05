/**
 * utils/sandbox/celHostFunctions.ts
 *
 * 2.1.316 新增：网络策略 CEL 表达式的自定义函数（hostMatches、hostMatchesAny、inCIDR）与沙箱持久目录常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qg41pqt6.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { getErrnoCode } from "../errors.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { require_cel } from "../../../vendor/@bufbuild/cel/dist/cjs/index.js";
import { hostMatchesOnePattern, hostMatchesAnyPattern } from "../hostnameMatching.js";
import { ipInCidr } from "../cidr.js";
import { require_ext } from "../../../vendor/@bufbuild/cel/dist/cjs/ext/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:853097-853116 placement
/**
 * celModule：CEL 模块（CommonJS 包装）。
 */
var celModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:853097", () => {
  celModule = __toESM(require_picomatch_2(), 1);
});
//@ chunk-qg41pqt6.js:853439-853488 placement
var BRIDGE_SPAWN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BRIDGE_SPAWN_DIR;
deferInit("chunk-qg41pqt6.js:853439", () => {
  BRIDGE_SPAWN = "bridge-spawn";
  BRIDGE_SPAWN_DIR = join(homedir(), ".claude", BRIDGE_SPAWN);
});
//@ chunk-qg41pqt6.js:853488-853513 placement
/**
 * bridgeSpawnDir：bridge-spawn 目录路径。
 */
function bridgeSpawnDir() {
  return BRIDGE_SPAWN_DIR;
}
//@ chunk-qg41pqt6.js:853513-853649 placement (2.1.88 match: tryCreateExclusive, 0.84)
/**
 * 确保某个私有目录存在（mode 0700）并返回路径。与调度锁无关。
 */
async function ensurePrivateDir() {
  let dir = bridgeSpawnDir();
  await mkdir(dirname(dir), {
    recursive: true,
  });
  try {
    await mkdir(dir, {
      mode: 448,
    });
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  }
  return dir;
}
//@ chunk-qg41pqt6.js:853649-853724 placement
/**
 * CEL_MAX_ITEMS：CEL 函数列表上限；CEL_MAX_STRING_ELEMENTS：CEL 字符串条数上限；CEL_MAX_PATTERNS：CEL 模式数上限（同一声明共 5 个绑定）。
 */
var CEL_MAX_ITEMS = 30;
var CEL_MAX_STRING_ELEMENTS = 3;
var CEL_MAX_PATTERNS = 3;
var CEL_MAX_PATTERN_LENGTH = 1;
var HOST_FUNCTION_CATEGORIES = ["todos", "statsig", "logs", "access-audit"];
//@ chunk-qg41pqt6.js:853724-853744 placement
var celEnv; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:853724", () => {
  celEnv = memoizeAlias(() => require_cel());
});
//@ chunk-qg41pqt6.js:853744-854113 placement
/**
 * 注册 CEL 函数 hostMatches/hostMatchesAny（主机名模式匹配）。
 */
function buildCelHostFunctions(celEnvModule) {
  let { CelScalar, celFunc, listType } = celEnvModule;
  return [
    celFunc("hostMatches", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (value, pattern) =>
      hostMatchesOnePattern(value, pattern),
    ),
    celFunc(
      "hostMatchesAny",
      [CelScalar.STRING, listType(CelScalar.STRING)],
      CelScalar.BOOL,
      (value, patterns) => {
        let stringPatterns = [];
        for (let pattern of patterns) {
          if (typeof pattern !== "string") throw Error("hostMatchesAny: non-string pattern in list");
          stringPatterns.push(pattern);
        }
        return hostMatchesAnyPattern(value, stringPatterns);
      },
    ),
    celFunc("inCIDR", [CelScalar.STRING, CelScalar.STRING], CelScalar.BOOL, (ip, cidr) => ipInCidr(ip, cidr)),
  ];
}
//@ chunk-qg41pqt6.js:854113-854201 placement
var celHostFunctions; // deferred: uses celEnv of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg41pqt6.js:854113", () => {
  celHostFunctions = memoizeAlias(() => {
    let celEnvModule = celEnv();
    let { strings } = require_ext();
    return celEnvModule.celEnv({
      funcs: [...strings, ...buildCelHostFunctions(celEnvModule)],
    });
  });
});
export {
  CEL_MAX_ITEMS,
  bridgeSpawnDir,
  BRIDGE_SPAWN,
  CEL_MAX_PATTERN_LENGTH,
  CEL_MAX_PATTERNS,
  HOST_FUNCTION_CATEGORIES,
  celModule,
  ensurePrivateDir,
  CEL_MAX_STRING_ELEMENTS,
};
