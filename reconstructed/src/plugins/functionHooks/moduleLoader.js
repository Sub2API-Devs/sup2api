/**
 * plugins/functionHooks/moduleLoader.ts
 *
 * 2.1.316 新增：解析 hooks 模块的相对导入（在插件目录内、存在、命名像代码）；Bun 插件：把 builtin-hooks-module: 导入解析为子进程打包的内置 hooks 模块等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (49)
 * attribution: placement 49
 */
import { join, sep, resolve, dirname, basename, relative, isAbsolute } from "path";
import { readlink, realpath, open, lstat } from "fs/promises";
import { constants } from "fs";
import {
  BUILTIN_HOOKS_MODULE_2,
  builtinModuleRelativePath,
  repoRoot,
  SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS,
  builtinCannotShipError,
} from "./builtinHooksModule.js";
import { HooksError } from "./hooksErrors.js";
import {
  SCRIPT_EXTENSION_LOADERS,
  SCRIPT_EXTENSIONS,
  SCRIPT_EXTENSIONS_TEXT,
} from "../../utils/plugins/pluginSourceUrl.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { errorMessage } from "../../utils/errors.js";
import { require_acorn } from "../../../vendor/acorn/dist/acorn.js";

//@ chunk-bfnfj4kx.js:7309-7778 placement
/**
 * Bun 插件：把 builtin-hooks-module: 导入解析为子进程打包的内置 hooks 模块。
 */
var builtinHooksModulePlugin = {
  name: BUILTIN_HOOKS_MODULE_2,
  setup(e) {
    e.onResolve(
      {
        filter: /^builtin-hooks-module:/,
      },
      (o) => ({
        path: builtinModuleRelativePath(o.importer, o.path),
        namespace: BUILTIN_HOOKS_MODULE_2,
      }),
    );
    e.onLoad(
      {
        filter: /.*/,
        namespace: BUILTIN_HOOKS_MODULE_2,
      },
      async (o) => {
        let child = Bun.spawn(
          [process.execPath, "--smol", join(repoRoot(), SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS), o.path],
          {
            cwd: repoRoot(),
            stdout: "pipe",
            stderr: "pipe",
            windowsHide: true,
          },
        );
        let [r, n, s] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        if (s !== 0) throw builtinCannotShipError(o.path, n);
        return {
          contents: `module.exports = ${r}`,
          loader: "js",
        };
      },
    );
  },
};
//@ chunk-bfnfj4kx.js:7778-7840 placement
/**
 * 读取中被改动
 */
var changedWhileReadError = (e, o) => new HooksError(`${e}: ${o}: changed while it was read`);
//@ chunk-bfnfj4kx.js:7840-7861 placement
/**
 * 模块读取错误类
 */
class ModuleReadError extends HooksError {}
//@ chunk-bfnfj4kx.js:7861-7926 placement
/**
 * 取错误码，缺省 EIO
 */
var errnoCodeOrEio = (e) => (e instanceof Error && "code" in e ? String(e.code) : "EIO");
//@ chunk-bfnfj4kx.js:7926-7990 placement
/**
 * 文件不存在错误
 */
var noSuchFileError = (e, o, t) =>
  new HooksError(`${e}: ${o}: no such file`, {
    cause: errnoCodeOrEio(t),
  });
//@ chunk-bfnfj4kx.js:7990-8017 placement
/**
 * EMFILE/ENFILE
 */
var FD_LIMIT_ERRNOS = ["EMFILE", "ENFILE"];
//@ chunk-bfnfj4kx.js:8017-8079 placement
/**
 * 失败时转换错误
 */
async function mapRejection(e, o) {
  try {
    return await e;
  } catch (error) {
    throw o(error);
  }
}
//@ chunk-bfnfj4kx.js:8079-8204 placement
function fileReadError(e, o, t) {
  let r = errnoCodeOrEio(t);
  return FD_LIMIT_ERRNOS.includes(r)
    ? new HooksError(`${e}: ${o}: not read, no file descriptor free (${r})`)
    : noSuchFileError(e, o, t);
}
//@ chunk-bfnfj4kx.js:8204-8265 placement
/**
 * 不可读错误
 */
var notReadableError = (e, o, t) => new HooksError(`${e}: ${o}: not readable (${errnoCodeOrEio(t)})`);
//@ chunk-bfnfj4kx.js:8293-8369 placement
/**
 * JSX 编译指令头
 */
var JSX_PRAGMA_HEADER = `/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */
`;
//@ chunk-bfnfj4kx.js:8369-8425 placement
/**
 * 扩展名对应 loader
 */
var loaderForExtension = (e) =>
  SCRIPT_EXTENSION_LOADERS[SCRIPT_EXTENSIONS.find((o) => e.endsWith(o)) ?? ""] ?? "js";
//@ chunk-bfnfj4kx.js:8425-8535 placement
function transpileErrorsOf(e) {
  let o = typeof e === "object" && e ? e : {};
  let errors = "errors" in o ? o.errors : undefined;
  return Array.isArray(errors) ? errors : [o];
}
//@ chunk-bfnfj4kx.js:8535-8835 placement
/**
 * 格式化转译错误（带行列）。
 */
function formatTranspileError(e, o) {
  let t = typeof e === "object" && e !== null;
  let r = t && "message" in e ? String(e.message) : "";
  let position = t && "position" in e ? e.position : undefined;
  if (!(
    typeof position === "object" &&
    position !== null &&
    "line" in position &&
    typeof position.line === "number" &&
    "column" in position
  ))
    return r;
  return `${r} (line ${Number(position.line) - o}, column ${String(position.column)})`;
}
//@ chunk-bfnfj4kx.js:8835-8915 placement
/**
 * 转译错误文本
 */
var transpileErrorText = (error, o) =>
  transpileErrorsOf(error)
    .map((t) => formatTranspileError(t, o))
    .filter((t) => t !== "")
    .join("; ") || String(error);
//@ chunk-bfnfj4kx.js:8915-9112 placement
/**
 * 用 Bun.Transpiler 转译 ts/tsx/jsx 的 hooks 源码。
 */
function transpileHooksSource(e, o) {
  let t = loaderForExtension(e);
  let r = t === "js";
  let n = t === "ts" ? "" : JSX_PRAGMA_HEADER;
  if (r) return o;
  try {
    let s = {
      loader: t,
      macro: false,
    };
    return new Bun.Transpiler(s).transformSync(`${n}${o}`);
  } catch (error) {
    throw new HooksError(
      transpileErrorText(
        error,
        countCharInString(
          n,
          `
`,
        ),
      ),
    );
  }
}
//@ chunk-bfnfj4kx.js:9112-9154 placement
/**
 * 是否代码文件
 */
var isScriptFile = (e) => SCRIPT_EXTENSIONS.some((o) => e.endsWith(o));
//@ chunk-bfnfj4kx.js:9154-9164 placement
/**
 * 32
 */
var MAX_PLUGIN_NAME_CHARS = 32;
//@ chunk-bfnfj4kx.js:9164-9180 placement
/**
 * 单个模块源码的字节上限 1 MiB：读取钩子模块与内联模块时超过即报错，不再解析。
 */
var MAX_MODULE_BYTES = 1048576;
//@ chunk-bfnfj4kx.js:9180-9195 placement
/**
 * 8388608
 */
var MAX_MODULE_TOTAL_BYTES = 8388608;
//@ chunk-bfnfj4kx.js:9195-9525 placement
/**
 * 由导入路径推出候选源文件（.js→.ts/.tsx 等）。
 */
function candidateSourcePaths(importSpec) {
  let o = [importSpec];
  if (importSpec.endsWith(".js")) {
    let sliced = importSpec.slice(0, -3);
    o.push(`${sliced}.ts`, `${sliced}.tsx`);
  }
  if (importSpec.endsWith(".jsx")) o.push(`${importSpec.slice(0, -4)}.tsx`);
  if (importSpec.endsWith(".mjs")) o.push(`${importSpec.slice(0, -4)}.mts`);
  if (importSpec.endsWith(".cjs")) o.push(`${importSpec.slice(0, -4)}.cts`);
  for (let t of SCRIPT_EXTENSIONS) {
    o.push(`${importSpec}${t}`);
    o.push(`${importSpec}${sep}index${t}`);
  }
  return o;
}
//@ chunk-bfnfj4kx.js:9525-9547 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-bfnfj4kx.js:9547-9695 placement
/**
 * hooks 模块导入非相对路径时的错误。
 */
var bareImportError = (pluginName, o, t) =>
  new HooksError(
    `${pluginName}: cannot import "${o}" (from ${t}): a hooks module imports its own files by relative path and "${CLAUDE_CODE}", nothing else`,
  );
//@ chunk-bfnfj4kx.js:9741-9822 placement
/**
 * 解析相对导入
 */
var resolveImportSpec = (e, o) =>
  [".", "..", "./", "../"].includes(e) ? resolve(dirname(o), e, "index") : resolve(dirname(o), e);
//@ chunk-bfnfj4kx.js:9822-9894 placement = resolveCwdReentry (1)
/**
 * （旧版名配错）是否为 . / .. 或以 ./ ../ 开头。
 */
var isDotRelativePath = (normalized) =>
  normalized === "." || normalized === ".." || normalized.startsWith("./") || normalized.startsWith("../");
//@ chunk-bfnfj4kx.js:9894-9978 placement
/**
 * 三种读取失败
 */
var MODULE_READ_FAILURES = ["no such file", "not a regular file", "resolves outside the plugin's folder"];
//@ chunk-bfnfj4kx.js:10106-10127 placement
/**
 * 插件模块读取错误
 */
class PluginModuleReadError extends ModuleReadError {}
//@ chunk-bfnfj4kx.js:10127-10200 placement
/**
 * 模块过大错误
 */
var oversizedModuleError = (e, o) =>
  new PluginModuleReadError(`${e}: ${o} is over ${MAX_MODULE_BYTES} bytes and was not read`);
//@ chunk-bfnfj4kx.js:10200-10349 placement = readJSONLFile (1)
async function readJSONLFile(e, o) {
  let buf = Buffer.allocUnsafe(o);
  let totalRead = 0;
  for (;;) {
    let { bytesRead } = await e.read(buf, totalRead, o - totalRead, totalRead);
    totalRead += bytesRead;
    if (bytesRead === 0 || totalRead === o) return buf.subarray(0, totalRead);
  }
}
//@ chunk-bfnfj4kx.js:10404-10530 placement
function realPathOfFd(e, real) {
  return readlink(`/proc/self/fd/${e}`).catch((error) => {
    let r = errnoCodeOrEio(error);
    if (r !== "ENOENT" && r !== "ENOTDIR") throw error;
    return realpath(real);
  });
}
//@ chunk-bfnfj4kx.js:10530-10916 placement
/**
 * 安全读取模块文件（大小上限、不跟随链接、必须是常规文件）。
 */
async function readModuleFile(e, { real, size }, r) {
  if (size > MAX_MODULE_BYTES) throw oversizedModuleError(r, e);
  let n = (f) => fileReadError(r, e, f);
  await using s = await mapRejection(open(real, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS), (f) =>
    errnoCodeOrEio(f) === "ELOOP" ? changedWhileReadError(r, e) : n(f),
  );
  let p = await mapRejection(s.stat(), n);
  if (!p.isFile()) throw changedWhileReadError(r, e);
  if ((await mapRejection(realPathOfFd(s.fd, real), n)) !== real) throw changedWhileReadError(r, e);
  if (p.size > MAX_MODULE_BYTES) throw oversizedModuleError(r, e);
  let a = await mapRejection(readJSONLFile(s, MAX_MODULE_BYTES + 1), n);
  if (a.length > MAX_MODULE_BYTES) throw oversizedModuleError(r, e);
  return {
    real,
    source: a.toString("utf8"),
  };
}
//@ chunk-bfnfj4kx.js:11043-11381 placement
/**
 * 确认文件真实路径在插件目录内。
 */
async function checkInsidePluginRoot(e, o, t) {
  let r = await mapRejection(realpath(o), (f) => notReadableError(t, basename(o), f));
  let n = (f) => fileReadError(t, e, f);
  let s = await mapRejection(realpath(e), n);
  let p = relative(r, s);
  if (p === ".." || p.startsWith(`..${sep}`) || isAbsolute(p))
    throw new HooksError(`${t}: ${e}: ${s} resolves outside the plugin's folder`);
  let a = await mapRejection(lstat(s), n);
  if (!a.isFile()) throw new HooksError(`${t}: ${e}: not a regular file`);
  return {
    real: s,
    size: a.size,
  };
}
//@ chunk-bfnfj4kx.js:11381-11511 placement
var notCodeFileError = (e, o) =>
  new ModuleReadError(
    `${e}: ${o} is not named like code and was not loaded: a hooks module and the files it imports end in ` +
      SCRIPT_EXTENSIONS_TEXT,
  );
//@ chunk-bfnfj4kx.js:11511-11589 placement
/**
 * 断言是代码文件
 */
function assertCodeFile(e, o, real) {
  let found = [o, real].find((n) => !isScriptFile(n));
  if (found !== undefined) throw notCodeFileError(e, found);
}
//@ chunk-bfnfj4kx.js:11589-11654 placement
/**
 * 去掉前缀
 */
var stripPrefix = (e, o) => (o.startsWith(`${e}: `) ? o.slice(`${e}: `.length) : o);
//@ chunk-bfnfj4kx.js:11654-12452 placement
/**
 * 解析 hooks 模块的相对导入（在插件目录内、存在、命名像代码）。
 */
async function resolveHooksImport({ spelled, importer, root, pluginName }, n, s) {
  let p = `${pluginName}: cannot import "${spelled}" (from ${relative(root, importer) || importer}):`;
  let importSpec = resolveImportSpec(spelled, importer);
  let a = relative(root, importSpec);
  if (a === ".." || a.startsWith(`..${sep}`) || isAbsolute(a))
    throw new HooksError(`${p} it is outside the plugin's folder (${root})`);
  let u = [];
  for (let x of candidateSourcePaths(importSpec)) {
    let y = n.get(x);
    if (y !== undefined)
      return {
        file: x,
        source: y,
      };
    try {
      let c = await checkInsidePluginRoot(x, root, pluginName);
      assertCodeFile(pluginName, x, c.real);
      let g = s.get(c.real);
      let h = g === undefined ? undefined : n.get(g);
      if (g !== undefined && h !== undefined)
        return {
          file: g,
          source: h,
        };
      let { real, source } = await readModuleFile(x, c, pluginName);
      return {
        file: x,
        source,
        real,
      };
    } catch (error) {
      let g = errorMessage(error);
      if (!(error instanceof HooksError) || !MODULE_READ_FAILURES.some((E) => g.endsWith(E)))
        throw new HooksError(`${p} ${stripPrefix(pluginName, g)}`);
      let k = error.cause === undefined;
      u.push(k ? g : `${g} (${String(error.cause)})`);
    }
  }
  throw new HooksError(
    `${p} no such file under ${root}`,
    u.length === 0
      ? undefined
      : {
          cause: u.join("; "),
        },
  );
}
//@ chunk-bfnfj4kx.js:12452-12494 placement
/**
 * 构造模块错误
 */
var moduleError = (e, o, t) => new HooksError(`${e}: ${o} ${t}`);
//@ chunk-bfnfj4kx.js:12494-12578 placement
/**
 * 总量超限错误
 */
var totalOversizedError = (e, file) =>
  moduleError(e, file, `takes the module over ${MAX_MODULE_TOTAL_BYTES} bytes in total and was not read`);
//@ chunk-bfnfj4kx.js:12578-12658 placement
/**
 * 校验后读取模块
 */
async function loadModuleWithChecks(e, o, t) {
  let r = await checkInsidePluginRoot(e, o, t);
  assertCodeFile(t, e, r.real);
  return readModuleFile(e, r, t);
}
//@ chunk-bfnfj4kx.js:12658-12676 placement
/**
 * acorn 解析器
 */
var acornParser = () => require_acorn();
//@ chunk-bfnfj4kx.js:12676-12755 placement
/**
 * 简单缓存 Map
 */
function createMemoMap() {
  let e = new Map();
  return {
    get: (o) => e.get(o),
    set: (o, t) => {
      e.set(o, t);
    },
  };
}
//@ chunk-bfnfj4kx.js:12755-12899 placement
/**
 * 构建内置 hooks 模块源码与扫描结果的登记表（register/source/registerScan/scan）。
 */
function createBuiltinSourceRegistry() {
  let memoMap = createMemoMap();
  let memoMap_2 = createMemoMap();
  return {
    register: (t, r) => {
      memoMap.set(t, r);
    },
    source: (t) => memoMap.get(t),
    registerScan: (t, r) => {
      memoMap_2.set(t, r);
    },
    scan: (t) => memoMap_2.get(t),
  };
}
//@ chunk-bfnfj4kx.js:12899-12912 placement
/**
 * 内置源码登记表
 */
var builtinSourceRegistry = createBuiltinSourceRegistry();
//@ chunk-bfnfj4kx.js:12912-12922 placement
/**
 * 80
 */
var MAX_IMPORT_DEPTH = 80;
//@ chunk-bfnfj4kx.js:12922-12935 placement
/**
 * 导入解析缓存
 */
var importResolverCache = createMemoMap();
//@ chunk-bfnfj4kx.js:12935-13026 placement
/**
 * hooks 导入解析器
 */
var hooksImportResolver =
  (root, pluginName) =>
  (spelled, importer, { known, reals }) =>
    resolveHooksImport(
      {
        spelled,
        importer,
        root,
        pluginName,
      },
      known,
      reals,
    );
//@ chunk-bfnfj4kx.js:13059-13120 placement
/**
 * 模块解析失败
 */
var parseModuleError = (e, o, error) => new HooksError(`${e}: ${o} does not parse: ${errorMessage(error)}`);
//@ chunk-bfnfj4kx.js:13120-13186 placement
/**
 * 转译 hooks 模块
 */
function transpileModule(file, source, t) {
  try {
    return transpileHooksSource(file, source);
  } catch (error) {
    throw parseModuleError(t, file, error);
  }
}
//@ chunk-bfnfj4kx.js:13186-13233 placement
/**
 * 是否 JS
 */
var isJsSource = (e, o) =>
  loaderForExtension(e) === "js"
    ? undefined
    : o.split(`
`);
//@ chunk-bfnfj4kx.js:13233-13278 placement
/**
 * 模块 id 匹配
 */
var isSameModuleId = (e, o) => e.id === o || e.params.includes(o);
export {
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  resolveHooksImport,
  transpileHooksSource,
  checkInsidePluginRoot,
  builtinSourceRegistry,
  isSameModuleId,
  isJsSource,
  MAX_IMPORT_DEPTH,
  acornParser,
  parseModuleError,
  MAX_PLUGIN_NAME_CHARS,
  MAX_MODULE_BYTES,
  oversizedModuleError,
  transpileModule,
  MAX_MODULE_TOTAL_BYTES,
  totalOversizedError,
  loadModuleWithChecks,
  hooksImportResolver,
  isScriptFile,
  importResolverCache,
  createMemoMap,
  candidateSourcePaths,
  resolveImportSpec,
  stripPrefix,
};
