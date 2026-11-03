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
import {
  join,
  join as join_2,
  join as join_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  basename,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
} from "path";
import { readlink, realpath, realpath as realpath_2, open, lstat } from "fs/promises";
import { constants } from "fs";
import {
  BUILTIN_HOOKS_MODULE_2,
  builtinModuleRelativePath,
  Ee,
  SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS,
  builtinCannotShipError,
} from "./builtinHooksModule.js";
import { HooksError } from "./hooksErrors.js";
import { SCRIPT_EXTENSION_LOADERS, SCRIPT_EXTENSIONS, gps } from "../../utils/plugins/pluginSourceUrl.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { ws } from "../../utils/fsFlags.js";
import { errorMessage } from "../../utils/errors.js";
import { k3t } from "../../../vendor/acorn/dist/acorn.js";

/**
 * Bun 插件：把 builtin-hooks-module: 导入解析为子进程打包的内置 hooks 模块。
 */
//@ chunk-bfnfj4kx.js:7309-7778 placement
var builtinHooksModulePlugin = {
  name: BUILTIN_HOOKS_MODULE_2,
  setup(e) {
    (e.onResolve({ filter: /^builtin-hooks-module:/ }, (o) => ({
      path: builtinModuleRelativePath(o.importer, o.path),
      namespace: BUILTIN_HOOKS_MODULE_2,
    })),
      e.onLoad({ filter: /.*/, namespace: BUILTIN_HOOKS_MODULE_2 }, async (o) => {
        let child = Bun.spawn(
            [process.execPath, "--smol", join(Ee(), SCRIPTS_BUNDLE_BUILTIN_HOOKS_MODULE_TS), o.path],
            { cwd: Ee(), stdout: "pipe", stderr: "pipe", windowsHide: !0 },
          ),
          [r, n, s] = await Promise.all([
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
            child.exited,
          ]);
        if (s !== 0) throw builtinCannotShipError(o.path, n);
        return { contents: `module.exports = ${r}`, loader: "js" };
      }));
  },
};
//@ chunk-bfnfj4kx.js:7778-7840 placement
var Le = (e, o) => new HooksError(`${e}: ${o}: changed while it was read`);
//@ chunk-bfnfj4kx.js:7840-7861 placement
class we extends HooksError {}
//@ chunk-bfnfj4kx.js:7861-7926 placement
var B = (e) => (e instanceof Error && "code" in e ? String(e.code) : "EIO");
//@ chunk-bfnfj4kx.js:7926-7990 placement
var ct = (e, o, t) => new HooksError(`${e}: ${o}: no such file`, { cause: B(t) });
//@ chunk-bfnfj4kx.js:7990-8017 placement
var ut = ["EMFILE", "ENFILE"];
//@ chunk-bfnfj4kx.js:8017-8079 placement
async function Y(e, o) {
  try {
    return await e;
  } catch (error) {
    throw o(error);
  }
}
//@ chunk-bfnfj4kx.js:8079-8204 placement
function fileReadError(e, o, t) {
  let r = B(t);
  return ut.includes(r)
    ? new HooksError(`${e}: ${o}: not read, no file descriptor free (${r})`)
    : ct(e, o, t);
}
//@ chunk-bfnfj4kx.js:8204-8265 placement
var nu = (e, o, t) => new HooksError(`${e}: ${o}: not readable (${B(t)})`);
//@ chunk-bfnfj4kx.js:8293-8369 placement
var yt = `/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Fragment */
`;
//@ chunk-bfnfj4kx.js:8369-8425 placement
var Oo = (e) => SCRIPT_EXTENSION_LOADERS[SCRIPT_EXTENSIONS.find((o) => e.endsWith(o)) ?? ""] ?? "js";
//@ chunk-bfnfj4kx.js:8425-8535 placement
function transpileErrorsOf(e) {
  let o = typeof e === "object" && e ? e : {},
    t = "errors" in o ? o.errors : void 0;
  return Array.isArray(t) ? t : [o];
}
/**
 * 格式化转译错误（带行列）。
 */
//@ chunk-bfnfj4kx.js:8535-8835 placement
function formatTranspileError(e, o) {
  let t = typeof e === "object" && e !== null,
    r = t && "message" in e ? String(e.message) : "",
    n = t && "position" in e ? e.position : void 0;
  if (!(typeof n === "object" && n !== null && "line" in n && typeof n.line === "number" && "column" in n))
    return r;
  return `${r} (line ${Number(n.line) - o}, column ${String(n.column)})`;
}
//@ chunk-bfnfj4kx.js:8835-8915 placement
var kt = (e, o) =>
  transpileErrorsOf(e)
    .map((t) => formatTranspileError(t, o))
    .filter((t) => t !== "")
    .join("; ") || String(e);
/**
 * 用 Bun.Transpiler 转译 ts/tsx/jsx 的 hooks 源码。
 */
//@ chunk-bfnfj4kx.js:8915-9112 placement
function transpileHooksSource(e, o) {
  let t = Oo(e),
    r = t === "js",
    n = t === "ts" ? "" : yt;
  if (r) return o;
  try {
    let s = { loader: t, macro: !1 };
    return new Bun.Transpiler(s).transformSync(`${n}${o}`);
  } catch (error) {
    throw new HooksError(
      kt(
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
var Heo = (e) => SCRIPT_EXTENSIONS.some((o) => e.endsWith(o));
//@ chunk-bfnfj4kx.js:9154-9164 placement
var Ro = 32;
//@ chunk-bfnfj4kx.js:9164-9180 placement
var _3t = 1048576;
//@ chunk-bfnfj4kx.js:9180-9195 placement
var jt = 8388608;
/**
 * 由导入路径推出候选源文件（.js→.ts/.tsx 等）。
 */
//@ chunk-bfnfj4kx.js:9195-9525 placement
function candidateSourcePaths(e) {
  let o = [e];
  if (e.endsWith(".js")) {
    let sliced = e.slice(0, -3);
    o.push(`${sliced}.ts`, `${sliced}.tsx`);
  }
  if (e.endsWith(".jsx")) o.push(`${e.slice(0, -4)}.tsx`);
  if (e.endsWith(".mjs")) o.push(`${e.slice(0, -4)}.mts`);
  if (e.endsWith(".cjs")) o.push(`${e.slice(0, -4)}.cts`);
  for (let t of SCRIPT_EXTENSIONS) (o.push(`${e}${t}`), o.push(`${e}${sep_2}index${t}`));
  return o;
}
//@ chunk-bfnfj4kx.js:9525-9547 placement
var CLAUDE_CODE = "claude-code";
/**
 * hooks 模块导入非相对路径时的错误。
 */
//@ chunk-bfnfj4kx.js:9547-9695 placement
var bareImportError = (e, o, t) =>
  new HooksError(
    `${e}: cannot import "${o}" (from ${t}): a hooks module imports its own files by relative path and "${CLAUDE_CODE}", nothing else`,
  );
//@ chunk-bfnfj4kx.js:9741-9822 placement
var dos = (e, o) =>
  [".", "..", "./", "../"].includes(e) ? resolve_3(dirname_2(o), e, "index") : resolve_3(dirname_2(o), e);
/**
 * （旧版名配错）是否为 . / .. 或以 ./ ../ 开头。
 */
//@ chunk-bfnfj4kx.js:9822-9894 placement = resolveCwdReentry (1)
var isDotRelativePath = (normalized) =>
  normalized === "." || normalized === ".." || normalized.startsWith("./") || normalized.startsWith("../");
//@ chunk-bfnfj4kx.js:9894-9978 placement
var bt = ["no such file", "not a regular file", "resolves outside the plugin's folder"];
//@ chunk-bfnfj4kx.js:10106-10127 placement
class Io extends we {}
//@ chunk-bfnfj4kx.js:10127-10200 placement
var Se = (e, o) => new Io(`${e}: ${o} is over ${_3t} bytes and was not read`);
//@ chunk-bfnfj4kx.js:10200-10349 placement = readJSONLFile (1)
async function readJSONLFile(e, o) {
  let buf = Buffer.allocUnsafe(o),
    totalRead = 0;
  for (;;) {
    let { bytesRead: bytesRead } = await e.read(buf, totalRead, o - totalRead, totalRead);
    if (((totalRead += bytesRead), bytesRead === 0 || totalRead === o)) return buf.subarray(0, totalRead);
  }
}
//@ chunk-bfnfj4kx.js:10404-10530 placement
function realPathOfFd(e, o) {
  return readlink(`/proc/self/fd/${e}`).catch((t) => {
    let r = B(t);
    if (r !== "ENOENT" && r !== "ENOTDIR") throw t;
    return realpath(o);
  });
}
/**
 * 安全读取模块文件（大小上限、不跟随链接、必须是常规文件）。
 */
//@ chunk-bfnfj4kx.js:10530-10916 placement
async function readModuleFile(e, { real: real, size: size }, r) {
  if (size > _3t) throw Se(r, e);
  let n = (f) => fileReadError(r, e, f);
  await using s = await Y(open(real, constants.O_RDONLY | ws), (f) => (B(f) === "ELOOP" ? Le(r, e) : n(f)));
  let p = await Y(s.stat(), n);
  if (!p.isFile()) throw Le(r, e);
  if ((await Y(realPathOfFd(s.fd, real), n)) !== real) throw Le(r, e);
  if (p.size > _3t) throw Se(r, e);
  let a = await Y(readJSONLFile(s, _3t + 1), n);
  if (a.length > _3t) throw Se(r, e);
  return { real: real, source: a.toString("utf8") };
}
/**
 * 确认文件真实路径在插件目录内。
 */
//@ chunk-bfnfj4kx.js:11043-11381 placement
async function checkInsidePluginRoot(e, o, t) {
  let r = await Y(realpath_2(o), (f) => nu(t, basename(o), f)),
    n = (f) => fileReadError(t, e, f),
    s = await Y(realpath_2(e), n),
    p = relative_3(r, s);
  if (p === ".." || p.startsWith(`..${sep_4}`) || isAbsolute_2(p))
    throw new HooksError(`${t}: ${e}: ${s} resolves outside the plugin's folder`);
  let a = await Y(lstat(s), n);
  if (!a.isFile()) throw new HooksError(`${t}: ${e}: not a regular file`);
  return { real: s, size: a.size };
}
//@ chunk-bfnfj4kx.js:11381-11511 placement
var notCodeFileError = (e, o) =>
  new we(
    `${e}: ${o} is not named like code and was not loaded: a hooks module and the files it imports end in ` +
      gps,
  );
//@ chunk-bfnfj4kx.js:11511-11589 placement
function Ve(e, o, t) {
  let found = [o, t].find((n) => !Heo(n));
  if (found !== void 0) throw notCodeFileError(e, found);
}
//@ chunk-bfnfj4kx.js:11589-11654 placement
var uos = (e, o) => (o.startsWith(`${e}: `) ? o.slice(`${e}: `.length) : o);
/**
 * 解析 hooks 模块的相对导入（在插件目录内、存在、命名像代码）。
 */
//@ chunk-bfnfj4kx.js:11654-12452 placement
async function resolveHooksImport(
  { spelled: spelled, importer: importer, root: root, pluginName: pluginName },
  n,
  s,
) {
  let p = `${pluginName}: cannot import "${spelled}" (from ${relative_2(root, importer) || importer}):`,
    i = dos(spelled, importer),
    a = relative_2(root, i);
  if (a === ".." || a.startsWith(`..${sep_3}`) || isAbsolute(a))
    throw new HooksError(`${p} it is outside the plugin's folder (${root})`);
  let u = [];
  for (let x of candidateSourcePaths(i)) {
    let y = n.get(x);
    if (y !== void 0) return { file: x, source: y };
    try {
      let c = await checkInsidePluginRoot(x, root, pluginName);
      Ve(pluginName, x, c.real);
      let g = s.get(c.real),
        h = g === void 0 ? void 0 : n.get(g);
      if (g !== void 0 && h !== void 0) return { file: g, source: h };
      let { real: real, source: source } = await readModuleFile(x, c, pluginName);
      return { file: x, source: source, real: real };
    } catch (error) {
      let g = errorMessage(error);
      if (!(error instanceof HooksError) || !bt.some((E) => g.endsWith(E)))
        throw new HooksError(`${p} ${uos(pluginName, g)}`);
      let k = error.cause === void 0;
      u.push(k ? g : `${g} (${String(error.cause)})`);
    }
  }
  throw new HooksError(`${p} no such file under ${root}`, u.length === 0 ? void 0 : { cause: u.join("; ") });
}
//@ chunk-bfnfj4kx.js:12452-12494 placement
var Ot = (e, o, t) => new HooksError(`${e}: ${o} ${t}`);
//@ chunk-bfnfj4kx.js:12494-12578 placement
var Gu = (e, o) => Ot(e, o, `takes the module over ${jt} bytes in total and was not read`);
//@ chunk-bfnfj4kx.js:12578-12658 placement
async function Vu(e, o, t) {
  let r = await checkInsidePluginRoot(e, o, t);
  return (Ve(t, e, r.real), readModuleFile(e, r, t));
}
//@ chunk-bfnfj4kx.js:12658-12676 placement
var fos = () => k3t();
//@ chunk-bfnfj4kx.js:12676-12755 placement
function nCn() {
  let e = new Map();
  return {
    get: (o) => e.get(o),
    set: (o, t) => {
      e.set(o, t);
    },
  };
}
/**
 * 构建内置 hooks 模块源码与扫描结果的登记表（register/source/registerScan/scan）。
 */
//@ chunk-bfnfj4kx.js:12755-12899 placement
function createBuiltinSourceRegistry() {
  let e = nCn(),
    o = nCn();
  return {
    register: (t, r) => {
      e.set(t, r);
    },
    source: (t) => e.get(t),
    registerScan: (t, r) => {
      o.set(t, r);
    },
    scan: (t) => o.get(t),
  };
}
//@ chunk-bfnfj4kx.js:12899-12912 placement
var Neo = createBuiltinSourceRegistry();
//@ chunk-bfnfj4kx.js:12912-12922 placement
var Pt = 80;
//@ chunk-bfnfj4kx.js:12922-12935 placement
var It = nCn();
//@ chunk-bfnfj4kx.js:12935-13026 placement
var Ft =
  (e, o) =>
  (t, r, { known: known, reals: reals }) =>
    resolveHooksImport({ spelled: t, importer: r, root: e, pluginName: o }, known, reals);
//@ chunk-bfnfj4kx.js:13059-13120 placement
var We = (e, o, t) => new HooksError(`${e}: ${o} does not parse: ${errorMessage(t)}`);
//@ chunk-bfnfj4kx.js:13120-13186 placement
function SSi(e, o, t) {
  try {
    return transpileHooksSource(e, o);
  } catch (error) {
    throw We(t, e, error);
  }
}
//@ chunk-bfnfj4kx.js:13186-13233 placement
var Ht = (e, o) =>
  Oo(e) === "js"
    ? void 0
    : o.split(`
`);
//@ chunk-bfnfj4kx.js:13233-13278 placement
var Dt = (e, o) => e.id === o || e.params.includes(o);

export {
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  resolveHooksImport,
  transpileHooksSource,
  checkInsidePluginRoot,
  Neo,
  Dt,
  Ht,
  Pt,
  fos,
  We,
  Ro,
  _3t,
  Se,
  SSi,
  jt,
  Gu,
  Vu,
  Ft,
  Heo,
  It,
  nCn,
  candidateSourcePaths,
  dos,
  uos,
};
