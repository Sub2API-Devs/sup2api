/**
 * plugins/functionHooks/moduleLoader.ts
 *
 * 2.1.316 新增：解析 hooks 模块的相对导入（在插件目录内、存在、命名像代码）；Bun 插件：把 builtin-hooks-module: 导入解析为子进程打包的内置 hooks 模块等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6sf70a86.js (49)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6sf70a86.js:7351-7820 placement
/**
 * Bun 插件：把 builtin-hooks-module: 导入解析为子进程打包的内置 hooks 模块。
 */
var builtinHooksModulePlugin = {
  name: BUILTIN_HOOKS_MODULE_2,
  setup(buildPlugin) {
    buildPlugin.onResolve(
      {
        filter: /^builtin-hooks-module:/,
      },
      (resolveArgs) => ({
        path: builtinModuleRelativePath(resolveArgs.importer, resolveArgs.path),
        namespace: BUILTIN_HOOKS_MODULE_2,
      }),
    );
    buildPlugin.onLoad(
      {
        filter: /.*/,
        namespace: BUILTIN_HOOKS_MODULE_2,
      },
      async (loadArgs) => {
        let child = Bun.spawn(
          [
            process.execPath,
            "--smol",
            join(repoRoot(), SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS),
            loadArgs.path,
          ],
          {
            cwd: repoRoot(),
            stdout: "pipe",
            stderr: "pipe",
            windowsHide: true,
          },
        );
        let [stdoutText, stderrText, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ]);
        if (exitCode !== 0) throw builtinCannotShipError(loadArgs.path, stderrText);
        return {
          contents: `module.exports = ${stdoutText}`,
          loader: "js",
        };
      },
    );
  },
};
//@ chunk-6sf70a86.js:7820-7882 placement
/**
 * 读取中被改动
 */
var changedWhileReadError = (path, pluginName) =>
  new HooksError(`${path}: ${pluginName}: changed while it was read`);
//@ chunk-6sf70a86.js:7882-7903 placement
/**
 * 模块读取错误类
 */
let ModuleReadError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6sf70a86.js:7882", () => {
  ModuleReadError = class ModuleReadError extends HooksError {};
});
//@ chunk-6sf70a86.js:7903-7968 placement
/**
 * 取错误码，缺省 EIO
 */
var errnoCodeOrEio = (error) => (error instanceof Error && "code" in error ? String(error.code) : "EIO");
//@ chunk-6sf70a86.js:7968-8032 placement
/**
 * 文件不存在错误
 */
var noSuchFileError = (path, pluginName, error) =>
  new HooksError(`${path}: ${pluginName}: no such file`, {
    cause: errnoCodeOrEio(error),
  });
//@ chunk-6sf70a86.js:8032-8059 placement
/**
 * EMFILE/ENFILE
 */
var FD_LIMIT_ERRNOS = ["EMFILE", "ENFILE"];
//@ chunk-6sf70a86.js:8059-8121 placement
/**
 * 失败时转换错误
 */
async function mapRejection(promise, onError) {
  try {
    return await promise;
  } catch (error) {
    throw onError(error);
  }
}
//@ chunk-6sf70a86.js:8121-8246 placement
function fileReadError(path, pluginName, error) {
  let errnoCode = errnoCodeOrEio(error);
  return FD_LIMIT_ERRNOS.includes(errnoCode)
    ? new HooksError(`${path}: ${pluginName}: not read, no file descriptor free (${errnoCode})`)
    : noSuchFileError(path, pluginName, error);
}
//@ chunk-6sf70a86.js:8246-8307 placement
/**
 * 不可读错误
 */
var notReadableError = (path, pluginName, error) =>
  new HooksError(`${path}: ${pluginName}: not readable (${errnoCodeOrEio(error)})`);
//@ chunk-6sf70a86.js:8335-8411 placement
/**
 * JSX 编译指令头
 */
var JSX_PRAGMA_HEADER = `/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */
`;
//@ chunk-6sf70a86.js:8411-8467 placement
/**
 * 扩展名对应 loader
 */
var loaderForExtension = (path) =>
  SCRIPT_EXTENSION_LOADERS[SCRIPT_EXTENSIONS.find((extension) => path.endsWith(extension)) ?? ""] ?? "js";
//@ chunk-6sf70a86.js:8467-8577 placement
function transpileErrorsOf(error) {
  let errorObject = typeof error === "object" && error ? error : {};
  let errors = "errors" in errorObject ? errorObject.errors : undefined;
  return Array.isArray(errors) ? errors : [errorObject];
}
//@ chunk-6sf70a86.js:8577-8877 placement
/**
 * 格式化转译错误（带行列）。
 */
function formatTranspileError(error, lineOffset) {
  let isObject = typeof error === "object" && error !== null;
  let message = isObject && "message" in error ? String(error.message) : "";
  let position = isObject && "position" in error ? error.position : undefined;
  if (!(
    typeof position === "object" &&
    position !== null &&
    "line" in position &&
    typeof position.line === "number" &&
    "column" in position
  ))
    return message;
  return `${message} (line ${Number(position.line) - lineOffset}, column ${String(position.column)})`;
}
//@ chunk-6sf70a86.js:8877-8957 placement
/**
 * 转译错误文本
 */
var transpileErrorText = (error, lineOffset) =>
  transpileErrorsOf(error)
    .map((error) => formatTranspileError(error, lineOffset))
    .filter((text) => text !== "")
    .join("; ") || String(error);
//@ chunk-6sf70a86.js:8957-9154 placement
/**
 * 用 Bun.Transpiler 转译 ts/tsx/jsx 的 hooks 源码。
 */
function transpileHooksSource(path, source) {
  let loader = loaderForExtension(path);
  let isPlainJs = loader === "js";
  let pragmas = loader === "ts" ? "" : JSX_PRAGMA_HEADER;
  if (isPlainJs) return source;
  try {
    let transpilerOptions = {
      loader,
      macro: false,
    };
    return new Bun.Transpiler(transpilerOptions).transformSync(`${pragmas}${source}`);
  } catch (error) {
    throw new HooksError(
      transpileErrorText(
        error,
        countCharInString(
          pragmas,
          `
`,
        ),
      ),
    );
  }
}
//@ chunk-6sf70a86.js:9154-9196 placement
/**
 * 是否代码文件
 */
var isScriptFile = (path) => SCRIPT_EXTENSIONS.some((extension) => path.endsWith(extension));
//@ chunk-6sf70a86.js:9196-9206 placement
/**
 * 32
 */
var MAX_PLUGIN_NAME_CHARS = 32;
//@ chunk-6sf70a86.js:9206-9222 placement
/**
 * 单个模块源码的字节上限 1 MiB：读取钩子模块与内联模块时超过即报错，不再解析。
 */
var MAX_MODULE_BYTES = 1048576;
//@ chunk-6sf70a86.js:9222-9237 placement
/**
 * 8388608
 */
var MAX_MODULE_TOTAL_BYTES = 8388608;
//@ chunk-6sf70a86.js:9237-9567 placement
/**
 * 由导入路径推出候选源文件（.js→.ts/.tsx 等）。
 */
function candidateSourcePaths(importSpec) {
  let paths = [importSpec];
  if (importSpec.endsWith(".js")) {
    let sliced = importSpec.slice(0, -3);
    paths.push(`${sliced}.ts`, `${sliced}.tsx`);
  }
  if (importSpec.endsWith(".jsx")) paths.push(`${importSpec.slice(0, -4)}.tsx`);
  if (importSpec.endsWith(".mjs")) paths.push(`${importSpec.slice(0, -4)}.mts`);
  if (importSpec.endsWith(".cjs")) paths.push(`${importSpec.slice(0, -4)}.cts`);
  for (let extension of SCRIPT_EXTENSIONS) {
    paths.push(`${importSpec}${extension}`);
    paths.push(`${importSpec}${sep}index${extension}`);
  }
  return paths;
}
//@ chunk-6sf70a86.js:9567-9589 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-6sf70a86.js:9589-9737 placement
/**
 * hooks 模块导入非相对路径时的错误。
 */
var bareImportError = (pluginName, specifier, importer) =>
  new HooksError(
    `${pluginName}: cannot import "${specifier}" (from ${importer}): a hooks module imports its own files by relative path and "${CLAUDE_CODE}", nothing else`,
  );
//@ chunk-6sf70a86.js:9783-9864 placement
/**
 * 解析相对导入
 */
var resolveImportSpec = (specifier, importerPath) =>
  [".", "..", "./", "../"].includes(specifier)
    ? resolve(dirname(importerPath), specifier, "index")
    : resolve(dirname(importerPath), specifier);
//@ chunk-6sf70a86.js:9864-9936 placement (2.1.88 match: resolveCwdReentry, 1)
/**
 * （旧版名配错）是否为 . / .. 或以 ./ ../ 开头。
 */
var isDotRelativePath = (normalized) =>
  normalized === "." || normalized === ".." || normalized.startsWith("./") || normalized.startsWith("../");
//@ chunk-6sf70a86.js:9936-10020 placement
/**
 * 三种读取失败
 */
var MODULE_READ_FAILURES = ["no such file", "not a regular file", "resolves outside the plugin's folder"];
//@ chunk-6sf70a86.js:10148-10169 placement
/**
 * 插件模块读取错误
 */
let PluginModuleReadError; // deferred: uses ModuleReadError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6sf70a86.js:10148", () => {
  PluginModuleReadError = class PluginModuleReadError extends ModuleReadError {};
});
//@ chunk-6sf70a86.js:10169-10242 placement
/**
 * 模块过大错误
 */
var oversizedModuleError = (pluginName, path) =>
  new PluginModuleReadError(`${pluginName}: ${path} is over ${MAX_MODULE_BYTES} bytes and was not read`);
//@ chunk-6sf70a86.js:10242-10391 placement (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(handle, byteLimit) {
  let buf = Buffer.allocUnsafe(byteLimit);
  let totalRead = 0;
  for (;;) {
    let { bytesRead } = await handle.read(buf, totalRead, byteLimit - totalRead, totalRead);
    totalRead += bytesRead;
    if (bytesRead === 0 || totalRead === byteLimit) return buf.subarray(0, totalRead);
  }
}
//@ chunk-6sf70a86.js:10446-10572 placement
function realPathOfFd(fd, real) {
  return readlink(`/proc/self/fd/${fd}`).catch((error) => {
    let errnoCode = errnoCodeOrEio(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") throw error;
    return realpath(real);
  });
}
//@ chunk-6sf70a86.js:10572-10958 placement
/**
 * 安全读取模块文件（大小上限、不跟随链接、必须是常规文件）。
 */
async function readModuleFile(path, { real, size }, pluginName) {
  if (size > MAX_MODULE_BYTES) throw oversizedModuleError(pluginName, path);
  let mapReadError = (error) => fileReadError(pluginName, path, error);
  await using fileHandle = await mapRejection(
    open(real, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS),
    (error) =>
      errnoCodeOrEio(error) === "ELOOP" ? changedWhileReadError(pluginName, path) : mapReadError(error),
  );
  let stats = await mapRejection(fileHandle.stat(), mapReadError);
  if (!stats.isFile()) throw changedWhileReadError(pluginName, path);
  if ((await mapRejection(realPathOfFd(fileHandle.fd, real), mapReadError)) !== real)
    throw changedWhileReadError(pluginName, path);
  if (stats.size > MAX_MODULE_BYTES) throw oversizedModuleError(pluginName, path);
  let sourceBytes = await mapRejection(readJSONLFile(fileHandle, MAX_MODULE_BYTES + 1), mapReadError);
  if (sourceBytes.length > MAX_MODULE_BYTES) throw oversizedModuleError(pluginName, path);
  return {
    real,
    source: sourceBytes.toString("utf8"),
  };
}
//@ chunk-6sf70a86.js:11085-11423 placement
/**
 * 确认文件真实路径在插件目录内。
 */
async function checkInsidePluginRoot(path, pluginRoot, pluginName) {
  let realRoot = await mapRejection(realpath(pluginRoot), (error) =>
    notReadableError(pluginName, basename(pluginRoot), error),
  );
  let mapReadError = (error) => fileReadError(pluginName, path, error);
  let realPath = await mapRejection(realpath(path), mapReadError);
  let relativePath = relative(realRoot, realPath);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath))
    throw new HooksError(`${pluginName}: ${path}: ${realPath} resolves outside the plugin's folder`);
  let stats = await mapRejection(lstat(realPath), mapReadError);
  if (!stats.isFile()) throw new HooksError(`${pluginName}: ${path}: not a regular file`);
  return {
    real: realPath,
    size: stats.size,
  };
}
//@ chunk-6sf70a86.js:11423-11553 placement
var notCodeFileError = (pluginName, path) =>
  new ModuleReadError(
    `${pluginName}: ${path} is not named like code and was not loaded: a hooks module and the files it imports end in ` +
      SCRIPT_EXTENSIONS_TEXT,
  );
//@ chunk-6sf70a86.js:11553-11631 placement
/**
 * 断言是代码文件
 */
function assertCodeFile(pluginName, path, real) {
  let path_2 = [path, real].find((candidatePath) => !isScriptFile(candidatePath));
  if (path_2 !== undefined) throw notCodeFileError(pluginName, path_2);
}
//@ chunk-6sf70a86.js:11631-11696 placement
/**
 * 去掉前缀
 */
var stripPrefix = (prefix, text) =>
  text.startsWith(`${prefix}: `) ? text.slice(`${prefix}: `.length) : text;
//@ chunk-6sf70a86.js:11696-12494 placement
/**
 * 解析 hooks 模块的相对导入（在插件目录内、存在、命名像代码）。
 */
async function resolveHooksImport({ spelled, importer, root, pluginName }, knownSources, reals) {
  let errorPrefix = `${pluginName}: cannot import "${spelled}" (from ${relative(root, importer) || importer}):`;
  let importSpec = resolveImportSpec(spelled, importer);
  let relativeSpec = relative(root, importSpec);
  if (relativeSpec === ".." || relativeSpec.startsWith(`..${sep}`) || isAbsolute(relativeSpec))
    throw new HooksError(`${errorPrefix} it is outside the plugin's folder (${root})`);
  let failures = [];
  for (let candidatePath of candidateSourcePaths(importSpec)) {
    let knownSource = knownSources.get(candidatePath);
    if (knownSource !== undefined)
      return {
        file: candidatePath,
        source: knownSource,
      };
    try {
      let checked = await checkInsidePluginRoot(candidatePath, root, pluginName);
      assertCodeFile(pluginName, candidatePath, checked.real);
      let realId = reals.get(checked.real);
      let realSource = realId === undefined ? undefined : knownSources.get(realId);
      if (realId !== undefined && realSource !== undefined)
        return {
          file: realId,
          source: realSource,
        };
      let { real, source } = await readModuleFile(candidatePath, checked, pluginName);
      return {
        file: candidatePath,
        source,
        real,
      };
    } catch (error) {
      let message = errorMessage(error);
      if (
        !(error instanceof HooksError) ||
        !MODULE_READ_FAILURES.some((failureText) => message.endsWith(failureText))
      )
        throw new HooksError(`${errorPrefix} ${stripPrefix(pluginName, message)}`);
      let hasNoCause = error.cause === undefined;
      failures.push(hasNoCause ? message : `${message} (${String(error.cause)})`);
    }
  }
  throw new HooksError(
    `${errorPrefix} no such file under ${root}`,
    failures.length === 0
      ? undefined
      : {
          cause: failures.join("; "),
        },
  );
}
//@ chunk-6sf70a86.js:12494-12536 placement
/**
 * 构造模块错误
 */
var moduleError = (pluginName, file, detail) => new HooksError(`${pluginName}: ${file} ${detail}`);
//@ chunk-6sf70a86.js:12536-12620 placement
/**
 * 总量超限错误
 */
var totalOversizedError = (pluginName, file) =>
  moduleError(
    pluginName,
    file,
    `takes the module over ${MAX_MODULE_TOTAL_BYTES} bytes in total and was not read`,
  );
//@ chunk-6sf70a86.js:12620-12700 placement
/**
 * 校验后读取模块
 */
async function loadModuleWithChecks(path, pluginRoot, pluginName) {
  let checked = await checkInsidePluginRoot(path, pluginRoot, pluginName);
  assertCodeFile(pluginName, path, checked.real);
  return readModuleFile(path, checked, pluginName);
}
//@ chunk-6sf70a86.js:12700-12718 placement
/**
 * acorn 解析器
 */
var acornParser = () => require_acorn();
//@ chunk-6sf70a86.js:12718-12797 placement
/**
 * 简单缓存 Map
 */
function createMemoMap() {
  let entries = new Map();
  return {
    get: (key) => entries.get(key),
    set: (key, value) => {
      entries.set(key, value);
    },
  };
}
//@ chunk-6sf70a86.js:12797-12941 placement
/**
 * 构建内置 hooks 模块源码与扫描结果的登记表（register/source/registerScan/scan）。
 */
function createBuiltinSourceRegistry() {
  let memoMap = createMemoMap();
  let memoMap_2 = createMemoMap();
  return {
    register: (name, sourceText) => {
      memoMap.set(name, sourceText);
    },
    source: (name) => memoMap.get(name),
    registerScan: (name, scan) => {
      memoMap_2.set(name, scan);
    },
    scan: (name) => memoMap_2.get(name),
  };
}
//@ chunk-6sf70a86.js:12941-12954 placement
/**
 * 内置源码登记表
 */
var builtinSourceRegistry; // deferred: uses createBuiltinSourceRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6sf70a86.js:12941", () => {
  builtinSourceRegistry = createBuiltinSourceRegistry();
});
//@ chunk-6sf70a86.js:12954-12964 placement
/**
 * 80
 */
var MAX_IMPORT_DEPTH = 80;
//@ chunk-6sf70a86.js:12964-12977 placement
/**
 * 导入解析缓存
 */
var importResolverCache; // deferred: uses createMemoMap of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6sf70a86.js:12964", () => {
  importResolverCache = createMemoMap();
});
//@ chunk-6sf70a86.js:12977-13068 placement
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
//@ chunk-6sf70a86.js:13101-13162 placement
/**
 * 模块解析失败
 */
var parseModuleError = (pluginName, file, error) =>
  new HooksError(`${pluginName}: ${file} does not parse: ${errorMessage(error)}`);
//@ chunk-6sf70a86.js:13162-13228 placement
/**
 * 转译 hooks 模块
 */
function transpileModule(file, source, pluginName) {
  try {
    return transpileHooksSource(file, source);
  } catch (error) {
    throw parseModuleError(pluginName, file, error);
  }
}
//@ chunk-6sf70a86.js:13228-13275 placement
/**
 * 是否 JS
 */
var isJsSource = (path, source) =>
  loaderForExtension(path) === "js"
    ? undefined
    : source.split(`
`);
//@ chunk-6sf70a86.js:13275-13320 placement
/**
 * 模块 id 匹配
 */
var isSameModuleId = (moduleId, identifier) =>
  moduleId.id === identifier || moduleId.params.includes(identifier);
export {
  checkInsidePluginRoot,
  createMemoMap,
  builtinSourceRegistry,
  candidateSourcePaths,
  resolveImportSpec,
  bareImportError,
  isScriptFile,
  MAX_MODULE_BYTES,
  stripPrefix,
  isSameModuleId,
  isJsSource,
  MAX_IMPORT_DEPTH,
  acornParser,
  parseModuleError,
  MAX_PLUGIN_NAME_CHARS,
  oversizedModuleError,
  transpileModule,
  CLAUDE_CODE,
  isDotRelativePath,
  MAX_MODULE_TOTAL_BYTES,
  totalOversizedError,
  loadModuleWithChecks,
  hooksImportResolver,
  importResolverCache,
  transpileHooksSource,
  resolveHooksImport,
};
