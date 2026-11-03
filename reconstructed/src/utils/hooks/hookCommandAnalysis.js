/**
 * utils/hooks/hookCommandAnalysis.ts
 *
 * 2.1.316 新增：分析钩子命令：解释器与脚本路径识别（shebang、/usr/bin/env、uv 项目）、脚本位置（检出、配置目录、插件）与可读性，用于 /hooks 显示与信任判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmzcskz6.js (53)
 * attribution: placement 53
 */
import { posix } from "path";
import { getPlatform } from "../platform.js";
import { isLocalHost_2, normalizeCommandForPlatform } from "../git.js";
import { foldName } from "../permissions/protectedDirNames.js";
import { isOnSameWslMount } from "../wslMounts.js";
import { firstLineOf } from "../stringUtils.js";
import { EHn } from "../windowsProfileFolders.js";
import { isPathAbsent } from "../errors.js";
import { computeContentHash } from "../commitAttribution.js";

//@ chunk-qmzcskz6.js:527-746 placement
var HIDDEN_PATH_PATTERN = /(^|\/)\.[^/]*$/,
  k = /(^|\/)\.(?!\.\/)(?!claude[^/]*\/|config\/)[^/]+\//i,
  Z = ["shell-snapshots", "session-env", "projects", "file-history", "backups"],
  regExp = new RegExp(String.raw`(^|/)\.claude[^/]*/(?:${Z.join("|")})/`, "i");
//@ chunk-qmzcskz6.js:746-839 placement
function y(e) {
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  return SCRIPT_EXTENSION_RE.test(sliced) || (sliced !== "" && !sliced.includes("."));
}
//@ chunk-qmzcskz6.js:839-899 placement
function b(e, t) {
  return { text: e, quote: t, start: 0, end: e.length };
}
//@ chunk-qmzcskz6.js:899-955 placement
var le = new Set(["python3", "python", "bash", "sh", "node"]);
//@ chunk-qmzcskz6.js:955-986 placement
function Y(e) {
  return le.has(e);
}
/**
 * 匹配解释器名（sh/bash/zsh/python/node 等）的正则。
 */
//@ chunk-qmzcskz6.js:986-1676 placement
var INTERPRETER_NAME_PATTERN =
    /^(?:sh|bash|zsh|dash|ash|ksh\d*|mksh|rbash|fish|csh|tcsh|python(?:\d+(?:\.\d+)?)?|pypy\d*(?:\.\d+)?|node(?:js)?\d*|deno|bun|perl|ruby|irb|erb|php|lua|tclsh[\d.]*|wish[\d.]*|expect|m4|Rscript|R|script|osascript|pwsh|env)$/iu,
  Q = /^[A-Za-z_][A-Za-z0-9_]*\+?=/,
  ue = /^(?:~|\$HOME|\$\{HOME\})\//,
  ce = /^(?:\$HOME|\$\{HOME\})\//,
  de =
    /^(?:\$HOME|\$\{HOME\}|\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_PLUGIN_ROOT\})$/,
  U = /^(?:\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\})\//,
  q = /^(?:\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_PLUGIN_ROOT\})\//,
  pe = /\$\{?CLAUDE_PLUGIN_ROOT\b/,
  fe = "${CLAUDE_PLUGIN_ROOT}",
  x = /[$~*?[\]()\{\}#!|&;<>`\\\p{Cc}\p{Cf}]|[^\S ]/u,
  K = /[\p{Cc}\p{Cf}]/u;
//@ chunk-qmzcskz6.js:1676-2279 placement
function resolveScriptPath(e) {
  let t = [],
    n = 0;
  while (n < e.length) {
    if (e[n] === " ") {
      n += 1;
      continue;
    }
    let r = e[n],
      l = r === '"' || r === "'" ? r : null;
    if (l) {
      let index = e.indexOf(l, n + 1);
      if (index === -1) return null;
      let sliced = e.slice(n + 1, index),
        i = e[index + 1];
      if (i !== void 0 && i !== " ") {
        let a = index + 1;
        while (a < e.length && e[a] !== " ") {
          if (e[a] === '"' || e[a] === "'") return null;
          a += 1;
        }
        if (l !== '"' || !de.test(sliced)) return null;
        (t.push({ text: sliced + e.slice(index + 1, a), quote: l, start: n, end: a }), (n = a));
        continue;
      }
      (t.push({ text: sliced, quote: l, start: n, end: index + 1 }), (n = index + 1));
    } else {
      let s = n;
      while (s < e.length && e[s] !== " ") {
        if (e[s] === '"' || e[s] === "'") return null;
        s += 1;
      }
      (t.push({ text: e.slice(n, s), quote: null, start: n, end: s }), (n = s));
    }
  }
  return t;
}
//@ chunk-qmzcskz6.js:2279-2341 placement
function ge(e) {
  return e.quote === null ? ue : e.quote === '"' ? ce : null;
}
//@ chunk-qmzcskz6.js:2341-2686 placement
function classifyScriptRoot(e) {
  let t = ge(e);
  if (t !== null && t.test(e.text)) return { rest: e.text.replace(t, ""), hadPrefix: !0, base: "home" };
  if (e.quote !== "'" && U.test(e.text))
    return { rest: e.text.replace(U, ""), hadPrefix: !0, base: "project" };
  if (e.quote !== "'" && q.test(e.text))
    return { rest: e.text.replace(q, ""), hadPrefix: !0, base: "plugin" };
  return { rest: e.text, hadPrefix: !1, base: null };
}
//@ chunk-qmzcskz6.js:2686-2706 placement
var me = /[\s*?[\]]/u;
//@ chunk-qmzcskz6.js:2706-2783 placement
function _e(e, t) {
  return e.quote !== null || e.text.startsWith("~/") || !me.test(t);
}
//@ chunk-qmzcskz6.js:2783-2925 placement
var SCRIPT_EXTENSION_RE = /\.(?:py|sh|bash|zsh|js|mjs|cjs|ts|rb|pl)$/iu,
  SYSTEM_BIN_DIRS = new Set(["/usr/bin", "/bin", "/usr/local/bin", "/opt/homebrew/bin"]),
  DOT_DOT_SEGMENT_RE = /(^|\/)\.\.(\/|$)/;
//@ chunk-qmzcskz6.js:2925-2984 placement
function S(e) {
  return DOT_DOT_SEGMENT_RE.test(e.replace(/^(?:\.\.?\/)+/, ""));
}
//@ chunk-qmzcskz6.js:2984-3266 placement
function looksLikeScriptPath(e) {
  if (e.quote === null && Q.test(e.text)) return !1;
  let { rest: rest, hadPrefix: hadPrefix } = classifyScriptRoot(e);
  if (
    rest.startsWith("-") ||
    HIDDEN_PATH_PATTERN.test(rest) ||
    k.test(rest) ||
    regExp.test(rest) ||
    rest.endsWith("/") ||
    (!y(rest) && !x.test(rest))
  )
    return !1;
  return (
    hadPrefix ||
    rest.startsWith("/") ||
    rest.startsWith("./") ||
    rest.startsWith("../") ||
    (rest.includes("/") && SCRIPT_EXTENSION_RE.test(rest))
  );
}
//@ chunk-qmzcskz6.js:3266-3337 placement
function T(e) {
  let { rest: rest } = classifyScriptRoot(e);
  return looksLikeScriptPath(e) || rest.includes("/") || SCRIPT_EXTENSION_RE.test(rest);
}
//@ chunk-qmzcskz6.js:3337-3599 placement
function describeOpaqueCommand(e, t, n, r = { form: "shell", start: t.start, end: t.end }) {
  let { rest: rest, base: base } = classifyScriptRoot(t),
    o = rootDirForBase(base, n);
  if (o === null) return { kind: "opaque", reason: "shell_syntax" };
  return {
    kind: "script",
    interpreter: e,
    rawPath: t.text,
    resolvedPath: posix.resolve(n.hookCwd, o === "" ? rest : `${o}/${rest}`),
    site: r,
  };
}
//@ chunk-qmzcskz6.js:3599-3744 placement
function rootDirForBase(e, t) {
  switch (e) {
    case "home":
      return t.home;
    case "project":
      return t.projectDir;
    case "plugin":
      return t.pluginRoot ?? null;
    case null:
      return "";
  }
}
/**
 * 解析命令的解释器与脚本参数（uv run、不支持的解释器、程序有歧义）。
 */
//@ chunk-qmzcskz6.js:3744-4427 placement
function parseInterpreterInvocation(e) {
  let [t, n] = e;
  if (t === void 0) return { interpreter: null, path: void 0, refusal: null };
  if (t.quote === null && t.text === "uv" && n?.text === "run")
    return { interpreter: null, path: void 0, refusal: "uv_project" };
  let lower = t.text.toLowerCase();
  if (t.quote === null && Y(lower)) {
    let s = n !== void 0 && looksLikeScriptPath(n) && e.slice(2).some(T);
    return { interpreter: lower, path: n, refusal: s ? "ambiguous_program" : null };
  }
  let any = e.slice(1).some(T);
  if (looksLikeScriptPath(t)) {
    let sliced = t.text.slice(t.text.lastIndexOf("/") + 1);
    if (n === void 0 && INTERPRETER_NAME_PATTERN.test(sliced))
      return { interpreter: null, path: void 0, refusal: null };
    return {
      interpreter: null,
      path: t,
      refusal: any || (n !== void 0 && !SCRIPT_EXTENSION_RE.test(sliced)) ? "ambiguous_program" : null,
    };
  }
  return { interpreter: null, path: void 0, refusal: any ? "unsupported_interpreter" : null };
}
/**
 * 分析钩子命令得到解释器与脚本：shell 语法则为 opaque，插件命令展开 ${CLAUDE_PLUGIN_ROOT}（约 2.5 KB）。
 */
//@ chunk-qmzcskz6.js:4427-6950 placement
function analyzeHookCommand(e, t) {
  if ([e.command, ...(e.args ?? [])].some((c) => K.test(c)))
    return { kind: "opaque", reason: "shell_syntax" };
  if (t.pluginRoot === void 0 && [e.command, ...(e.args ?? [])].some((c) => pe.test(c)))
    return { kind: "opaque", reason: "shell_syntax" };
  let { pluginRoot: pluginRoot } = t,
    r =
      e.args !== void 0 && pluginRoot !== void 0
        ? { ...e, command: v(e.command, pluginRoot), args: e.args.map((arg) => v(arg, pluginRoot)) }
        : e;
  if ((r.shell ?? t.defaultShell) !== "bash") return { kind: "opaque", reason: "unsupported_shell" };
  if (t.shellPrefix !== void 0 && t.shellPrefix !== "" && r.args === void 0)
    return { kind: "opaque", reason: "shell_prefix" };
  if (
    !t.hookCwd.startsWith("/") ||
    !t.home.startsWith("/") ||
    !t.projectDir.startsWith("/") ||
    (t.pluginRoot !== void 0 && (!t.pluginRoot.startsWith("/") || DOT_DOT_SEGMENT_RE.test(t.pluginRoot)))
  )
    return { kind: "opaque", reason: "unsupported_platform" };
  if (r.args !== void 0) {
    let c =
        r.command.startsWith("/") && !DOT_DOT_SEGMENT_RE.test(r.command)
          ? posix.normalize(r.command)
          : r.command,
      W = c.startsWith("/") ? c.slice(0, c.lastIndexOf("/")) : null,
      C =
        W === null
          ? c.toLowerCase()
          : SYSTEM_BIN_DIRS.has(W.toLowerCase())
            ? c.slice(c.lastIndexOf("/") + 1).toLowerCase()
            : "";
    if (C === "uv") return { kind: "opaque", reason: r.args[0] === "run" ? "uv_project" : "args_form" };
    if (r.args.some((arg) => arg.includes("${")) || /\/\.?$/u.test(r.command))
      return { kind: "opaque", reason: "args_form" };
    let P = Y(C) ? C : null;
    if (P === null) {
      let E = r.command.startsWith("/") || r.command.startsWith("./") || r.command.startsWith("../"),
        sliced = r.command.slice(r.command.lastIndexOf("/") + 1),
        oe =
          (r.args.length === 0 && !INTERPRETER_NAME_PATTERN.test(sliced)) ||
          (r.args.length > 0 && SCRIPT_EXTENSION_RE.test(sliced) && !r.args.some((arg) => T(b(arg, "'"))));
      return E && oe && looksLikeScriptPath(b(r.command, null)) && !x.test(r.command) && !S(r.command)
        ? describeOpaqueCommand(null, b(r.command, null), t, { form: "exec", slot: "command" })
        : { kind: "opaque", reason: "args_form" };
    }
    let _ = r.args[0];
    if (_ === void 0 || r.args.slice(1).some((E) => T(b(E, "'"))))
      return { kind: "opaque", reason: "args_form" };
    let L = b(_, "'");
    return looksLikeScriptPath(L) && y(_) && !x.test(_) && !S(_)
      ? describeOpaqueCommand(P, L, t, { form: "exec", slot: "arg0" })
      : { kind: "opaque", reason: "args_form" };
  }
  let l = resolveScriptPath(r.command);
  if (l === null) return { kind: "opaque", reason: "shell_syntax" };
  let [s] = l;
  if (s !== void 0 && s.quote === null && Q.test(s.text)) return { kind: "opaque", reason: "shell_syntax" };
  let { interpreter: interpreter, path: path, refusal: refusal } = parseInterpreterInvocation(l);
  if (refusal !== null) return { kind: "opaque", reason: refusal };
  if (path === void 0 || !looksLikeScriptPath(path)) {
    let c = path ?? s;
    return {
      kind: "opaque",
      reason: c !== void 0 && k.test(classifyScriptRoot(c).rest) ? "private_dotdir" : "no_path",
    };
  }
  let sliced = r.command.slice(0, path.start),
    sliced_2 = r.command.slice(path.end);
  if ([sliced, classifyScriptRoot(path).rest, sliced_2].some((c) => x.test(c)))
    return { kind: "opaque", reason: "shell_syntax" };
  let { rest: rest, hadPrefix: hadPrefix, base: base } = classifyScriptRoot(path);
  if (
    (hadPrefix && !_e(path, rootDirForBase(base, t) ?? "")) ||
    (hadPrefix ? DOT_DOT_SEGMENT_RE.test(rest) : S(rest))
  )
    return { kind: "opaque", reason: "shell_syntax" };
  return describeOpaqueCommand(interpreter, path, t);
}
//@ chunk-qmzcskz6.js:6950-6993 placement
function v(e, t) {
  return e.split(fe).join(t);
}
//@ chunk-qmzcskz6.js:6993-7204 placement
var POSIX_SEP = "/",
  Re = /^[A-Za-z]:[\\/]/,
  xe = /^[\\/]{2}[^\\/]+[\\/]+[^\\/]+/,
  Te = /^(?:[\\/]{2,}[?.][\\/]+|\\\?\?\\)(?=[A-Za-z]:)/,
  j = /^(?:[\\/]{2,}[?.][\\/]+|\\\?\?\\)UNC[\\/]+/i,
  te = /^(?:[\\/]{2}[?.]|[\\/]\?\?)(?:[\\/]|$)/;
//@ chunk-qmzcskz6.js:7204-7261 placement
function M2(e, t) {
  return getPlatform() === "windows" ? isWindowsPathUnder(e, t) : isPosixPathUnder(e, t);
}
//@ chunk-qmzcskz6.js:7261-7377 placement
function isPosixPathUnder(e, t) {
  let n = t.length > 1 && t.endsWith("/") ? t.slice(0, -1) : t;
  return e === n || e.startsWith(n === "/" ? "/" : `${n}/`);
}
//@ chunk-qmzcskz6.js:7377-7491 placement
function isWindowsPathUnder(e, t) {
  let replaced = z(t).replace(/\\+$/, "");
  if (replaced === "") return !0;
  let r = z(e);
  return r === replaced || r.startsWith(`${replaced}\\`);
}
//@ chunk-qmzcskz6.js:7491-7578 placement
function z(e) {
  return e.replace(/\//g, "\\").replace(/^[a-z](?=:)/, (t) => t.toUpperCase());
}
//@ chunk-qmzcskz6.js:7578-7653 placement
function Q3r(e) {
  return j.test(e) ? `\\\\${e.replace(j, "")}` : e.replace(Te, "");
}
//@ chunk-qmzcskz6.js:7653-7762 placement
function uncAdminShareToDrive(e) {
  let t = Q3r(e),
    match = Ce.exec(t);
  return match !== null && isLocalHost_2(match[1], !1) ? `${match[2]}:\\${t.slice(match[0].length)}` : t;
}
//@ chunk-qmzcskz6.js:7762-7821 placement
var Ce = /^[\\/]{2,}([^\\/]+)[\\/]+([A-Za-z])\$(?:[\\/]+|$)/;
/**
 * （旧版名配错）Windows 路径规范化：处理盘符、UNC 前缀、.. 折叠、去掉尾随点空格，用于路径比较。
 */
//@ chunk-qmzcskz6.js:8678-9310 placement = extractBaseCommand (0.679)
function normalizeWindowsPathForCompare(path) {
  let t = uncAdminShareToDrive(path),
    n = /^[\\/]+/.exec(t)?.[0] ?? "",
    parts = t.slice(n.length).split(/[\\/]+/),
    l = n === "" && /^[A-Za-z]:$/.test(parts[0] ?? ""),
    s = n === "" && /^[A-Za-z]:./.test(parts[0] ?? ""),
    o = [];
  parts.forEach((a, f) => {
    if (f === 0 && l) o.push(a.toLowerCase());
    else if (f === 0 && s) o.push(a.toLowerCase());
    else if (f === 0 && n.length >= 2) o.push(foldWindowsPathComponent(a));
    else if (a === "..") {
      if (o.length > (l || s ? 1 : n.length >= 2 ? 2 : 0)) o.pop();
    } else if (/^[. ]+$/.test(a) && a !== ".") o.push("");
    else if (a !== "." && a !== "") o.push(foldName(a.toLowerCase().toUpperCase().toLowerCase()));
  });
  let filtered = o.filter((a) => a !== "");
  return (
    (n.length >= 2 ? "\\\\" : n.length === 1 ? "\\" : "") +
    filtered.join("\\") +
    (/[\\/]$/.test(t) && filtered.length > 0 ? "\\" : "")
  );
}
//@ chunk-qmzcskz6.js:9310-9456 placement
function foldWindowsPathComponent(e) {
  if (/^[?.]$/.test(e)) return e;
  let lower = e.toLowerCase().toUpperCase().toLowerCase();
  return e.includes(":") ? lower.replace(/[. ]+$/, "") : foldName(lower);
}
//@ chunk-qmzcskz6.js:9456-9555 placement = setCwdState (0.867)
function caseFoldKey(cwd) {
  return cwd.normalize("NFC").toLowerCase().toUpperCase().toLowerCase().normalize("NFC");
}
//@ chunk-qmzcskz6.js:9555-9597 placement
function D4e(e, t) {
  return K$e(normalizeCommandForPlatform(e), normalizeCommandForPlatform(t));
}
//@ chunk-qmzcskz6.js:9597-9712 placement
function K$e(e, t) {
  return (
    M2(e, t) ||
    (getPlatform() === "windows" && (Ie(e, t) || (e.startsWith("\\\\") && t.startsWith("\\\\")))) ||
    isOnSameWslMount(e, t)
  );
}
//@ chunk-qmzcskz6.js:9712-9760 placement
function Ie(e, t) {
  return [e, t].some(Oe) || J8o(e, t);
}
//@ chunk-qmzcskz6.js:9760-9807 placement
function J8o(e, t) {
  return UNC_PREFIX_RE.test(e) !== UNC_PREFIX_RE.test(t);
}
//@ chunk-qmzcskz6.js:9807-9935 placement
function Ali(e, t) {
  let match = B.exec(e),
    match_2 = B.exec(t);
  return (
    match !== null &&
    match_2 !== null &&
    match[1] === match_2[1] &&
    match[2] !== match_2[2] &&
    (F.test(match[2]) || F.test(match_2[2]))
  );
}
//@ chunk-qmzcskz6.js:9935-9981 placement
var B = /^\\\\([^\\]+)\\([^\\]+)/,
  F = /^[a-z]\$$/;
//@ chunk-qmzcskz6.js:9981-10123 placement
function Q8o(e, t) {
  if (!isSameUncHost(e, t)) return e;
  let n = /^\\\\([^\\]+)(?=\\|$)/.exec(t)?.[1];
  return n === void 0 ? e : e.replace(/^\\\\[^\\]+/, () => `\\\\${n}`);
}
//@ chunk-qmzcskz6.js:10123-10337 placement
function isSameUncHost(e, t) {
  let n = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\)/.exec(e)?.[1] ?? "", "@"), "."),
    r = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\|$)/.exec(t)?.[1] ?? "", "@"), ".");
  return n !== "" && r !== "" && (n === r || (M(n) && r.startsWith(n)) || (M(r) && n.startsWith(r)));
}
//@ chunk-qmzcskz6.js:10337-10346 placement
var w = 15;
//@ chunk-qmzcskz6.js:10346-10444 placement
function M(e) {
  let t = getPlatform() === "windows" ? (e.match(/ss/g)?.length ?? 0) : 0;
  return e.length >= w && e.length - t <= w;
}
//@ chunk-qmzcskz6.js:10444-10482 placement
function Oe(e) {
  return classifyUncPath(e) !== void 0;
}
/**
 * 分类 Windows UNC/特殊路径（本机、WSL、短名、设备命名空间、WebDAV 等）。
 */
//@ chunk-qmzcskz6.js:10482-10928 placement
function classifyUncPath(e) {
  let t = /^\\\\([^\\]+)\\/.exec(e)?.[1],
    n = t === void 0 ? void 0 : ke.exec(t)?.[1];
  if (t !== void 0 && isLocalHost_2(n ?? t)) return "own_host";
  if (t !== void 0 && WSL_UNC_HOSTS.has(t)) return "wsl_host";
  if (e.split("\\").some(isShortNameComponent)) return "short_name";
  if (te.test(e)) return "device_namespace";
  if (DRIVE_RELATIVE_RE.test(e)) return "drive_relative";
  if (t === void 0) return;
  if (n !== void 0) return NUMERIC_HOST_RE.test(n) ? "numeric_host" : "webdav_host";
  if (ODD_UNC_HOST_RE.test(t)) return "odd_host";
  if (NUMERIC_HOST_RE.test(t)) return "numeric_host";
  return;
}
//@ chunk-qmzcskz6.js:10928-11011 placement
var ke = /^((?=[^@]*[a-z])[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?:@ssl(?:@\d+)?|@\d+)$/i;
//@ chunk-qmzcskz6.js:11011-11113 placement
function isShortNameComponent(e) {
  return /^[\x20-\x7e]*$/.test(e) ? EHn(e.replaceAll("ss", "s")) : /~\d+(?:\.[^.]*)?$/.test(e);
}
//@ chunk-qmzcskz6.js:11113-11303 placement
var UNC_PREFIX_RE = /^\\[^\\]/,
  DRIVE_RELATIVE_RE = /^[a-z]:(?![\\/]|$)/,
  WSL_UNC_HOSTS = new Set(["wsl.localhost", "wsl$"]),
  ODD_UNC_HOST_RE = /[:@]|[^\x21-\x7e]|^\.+$/,
  NUMERIC_HOST_RE = /^(?:(?:0x[0-9a-f]*|\d+)(?:\.(?:0x[0-9a-f]*|\d+)){0,3}|.*\.ipv6-literal\.net)$/i;
//@ chunk-qmzcskz6.js:11303-11395 placement
function Le(e) {
  return (
    posix.isAbsolute(e) && !HIDDEN_PATH_PATTERN.test(e) && !k.test(e) && !regExp.test(e) && !K.test(e) && y(e)
  );
}
//@ chunk-qmzcskz6.js:11395-11928 placement
async function classifyScriptLocation(e, t, n) {
  let r;
  try {
    r = await n.realpath(e);
  } catch (error) {
    return { location: "elsewhere", realPath: null, missing: isPathAbsent(error) };
  }
  if (!Le(r)) return { location: "elsewhere", realPath: null, missing: !1 };
  if (
    posix.isAbsolute(t.configHomeReal) &&
    Z.some((o) => M2(caseFoldKey(r), caseFoldKey(posix.join(t.configHomeReal, o))))
  )
    return { location: "elsewhere", realPath: null, missing: !1 };
  let s = [
    ["in_checkout", t.launchDirReal],
    ["in_config_home", t.configHomeReal],
  ]
    .filter(([, o]) => posix.isAbsolute(o) && M2(r, o))
    .sort(([, o], [, i]) => i.length - o.length)[0];
  return { location: s ? s[0] : "elsewhere", realPath: r };
}
//@ chunk-qmzcskz6.js:11928-11942 placement
var Ne = 262144;
//@ chunk-qmzcskz6.js:11942-12469 placement
async function checkScriptFile(e, t, n = Ne) {
  let r;
  try {
    r = await t.open(e);
  } catch {
    return { ok: !1, reason: "unreadable" };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return { ok: !1, reason: "not_regular" };
    if (stats.nlink > 1) return { ok: !1, reason: "multiply_linked" };
    let alloc = Buffer.alloc(n + 1),
      o = 0;
    while (o < alloc.length) {
      let { bytesRead: bytesRead } = await r.read(alloc, o, alloc.length - o, o);
      if (bytesRead === 0) break;
      o += bytesRead;
    }
    if (o > n) return { ok: !1, reason: "too_large" };
    let buffer = Buffer.from(alloc.subarray(0, o));
    return { ok: !0, sha256: computeContentHash(buffer), bytes: buffer };
  } catch {
    return { ok: !1, reason: "unreadable" };
  } finally {
    await r.close().catch(() => {});
  }
}
/**
 * /usr/bin/env 与各 shell 的单字母选项表，用于解析 shebang 参数。
 */
//@ chunk-qmzcskz6.js:12469-13820 placement
var ENV_PROGRAM_PATHS = new Set(["/usr/bin/env", "/bin/env"]),
  Ue = [
    {
      names: /^(?:bash|dash|ash|sh|rbash|mksh|ksh[0-9]*)$/,
      letters: "aefhiklmnprtuvxBCEHPT",
      long: new Set(["login", "posix", "norc", "noprofile", "restricted"]),
      ends: ["-", "--"],
    },
    { names: /^zsh$/, letters: "aefhiklmnprtuvxBCEHPT", long: new Set(["login"]), ends: ["-", "--", "-b"] },
    {
      names: /^node(?:js)?$/,
      letters: "",
      long: new Set([
        "enable-source-maps",
        "no-warnings",
        "no-deprecation",
        "throw-deprecation",
        "trace-warnings",
        "trace-deprecation",
        "pending-deprecation",
        "experimental-strip-types",
      ]),
    },
    {
      names: /^rscript$/,
      letters: "",
      long: new Set(["vanilla", "no-save", "no-restore", "no-site-file", "no-init-file", "no-environ"]),
      inReachNeeds: [["vanilla"], ["no-init-file", "no-environ", "no-site-file"]],
    },
    { names: /^osascript$/, letters: "", valued: "l" },
    { names: /^fish$/, letters: "N", long: new Set(["no-config"]) },
    { names: /^(?:tclsh|wish)[0-9.]*$/, letters: "" },
    { names: /^(?:python|pypy)[0-9.]*$/, letters: "bBdEIOPqRsSuvx", ends: ["--"] },
    { names: /^perl[0-9.]*$/, letters: "acnpsTtwWX", ends: ["--"] },
    { names: /^ruby[0-9.]*$/, letters: "acdlnpsvwy", ends: ["--"] },
    { names: /^[gnm]?awk$/, letters: "", nextWord: "fE" },
    { names: /^g?sed$/, letters: "nEru", nextWord: "f" },
    { names: /^php[0-9.]*$/, letters: "nqeH" },
    { names: /^t?csh$/, letters: "efnvx", ends: ["-b"] },
    { names: /^expect$/, letters: "", ends: ["--"], nextWord: "f" },
    { names: /^(?:g|b|p|gnu)?make$/, letters: "", nextWord: "f", requiresTerminal: !0 },
  ];
//@ chunk-qmzcskz6.js:13820-14660 placement
function parseShebangArgs(e, t, { childStartsInReach: n = !0 } = {}) {
  let found = Ue.find((u) => u.names.test(t.toLowerCase()));
  if (found === void 0) return !n && e.length === 0;
  if (
    n &&
    found.inReachNeeds !== void 0 &&
    !found.inReachNeeds.some((inReachNeed) => inReachNeed.every((d) => e.includes(`--${d}`)))
  )
    return !1;
  let l = (u) =>
      u.startsWith("--")
        ? (found.long?.has(u.slice(2)) ?? !1)
        : /^-[A-Za-z]{1,3}$/.test(u) &&
          u
            .slice(1)
            .split("")
            .every((d) => found.letters.includes(d)),
    s = (u) =>
      (found.ends?.includes(u) ?? !1) ||
      (found.nextWord !== void 0 &&
        /^-[A-Za-z]{1,3}$/.test(u) &&
        found.nextWord.includes(u.at(-1)) &&
        u
          .slice(1, -1)
          .split("")
          .every((d) => found.letters.includes(d))),
    o = (u) => found.valued !== void 0 && new RegExp(`^-[${found.valued}]$`).test(u);
  if (e.length > 0 && o(e.at(-1))) return !1;
  let filtered = e.filter((u, d) => !(d > 0 && o(e[d - 1]))),
    at = filtered.at(-1),
    f = at !== void 0 && !l(at) && s(at);
  if (found.requiresTerminal && !(f && at !== "--" && at !== "-")) return !1;
  return filtered.every((u, d) => l(u) || o(u) || (d === filtered.length - 1 && s(u)));
}
/**
 * 读取脚本前 512 字节的 shebang 并解析解释器。
 */
//@ chunk-qmzcskz6.js:14660-15660 placement
function readShebang(e) {
  let str = e.subarray(0, 512).toString("utf8");
  if (!str.startsWith("#!")) return null;
  let index = str.indexOf(`
`),
    parts = str
      .slice(2, index === -1 ? void 0 : index)
      .replace(/^[ \t]+|[ \t]+$/g, "")
      .split(/[ \t]+/),
    l = parts[0];
  if (l === void 0 || l === "") return null;
  if (parts.some((a) => /[^\x21-\x7e]/.test(a))) return "unjudgeable";
  if (!l.startsWith("/") || DOT_DOT_SEGMENT_RE.test(l)) return { kind: "cwd" };
  let normalized = posix.normalize(l);
  if (!ENV_PROGRAM_PATHS.has(normalizeCommandForPlatform(normalized))) {
    if (normalizeCommandForPlatform(posix.basename(normalized)) === "env") return "unjudgeable";
    return parseShebangArgs(parts.slice(1), posix.basename(normalized))
      ? { kind: "absolute", path: normalized }
      : parts.slice(1).some((a) => !a.startsWith("-"))
        ? { kind: "cwd" }
        : "unjudgeable";
  }
  let o = parts[1] === "-S" ? parts.slice(2) : parts.slice(1),
    i = o[0];
  if (i === void 0 || i.startsWith("-") || i.includes("=")) return "unjudgeable";
  if (!parseShebangArgs(o.slice(1), posix.basename(i)))
    return o.slice(1).some((a) => !a.startsWith("-")) ? { kind: "cwd" } : "unjudgeable";
  if (i.startsWith("/"))
    return DOT_DOT_SEGMENT_RE.test(i) || /[\\$"'#\s]/.test(i)
      ? "unjudgeable"
      : { kind: "absolute", path: posix.normalize(i) };
  if (i.includes("/")) return { kind: "cwd" };
  return /^[\w.+-]+$/.test(i) ? { kind: "env", program: i } : "unjudgeable";
}

export {
  foldWindowsPathComponent,
  w,
  Q3r,
  te,
  Re,
  xe,
  caseFoldKey,
  normalizeWindowsPathForCompare,
  analyzeHookCommand,
  POSIX_SEP,
  classifyUncPath,
  uncAdminShareToDrive,
  Q8o,
  M2,
  J8o,
  Ali,
  parseShebangArgs,
  checkScriptFile,
  D4e,
  isPosixPathUnder,
  K$e,
  readShebang,
  classifyScriptLocation,
  INTERPRETER_NAME_PATTERN,
};
