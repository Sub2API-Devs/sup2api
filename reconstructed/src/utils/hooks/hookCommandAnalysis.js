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
import { isDosShortName } from "../windowsProfileFolders.js";
import { isPathAbsent } from "../errors.js";
import { computeContentHash } from "../commitAttribution.js";

//@ chunk-qmzcskz6.js:527-746 placement
var HIDDEN_PATH_PATTERN = /(^|\/)\.[^/]*$/;
var PRIVATE_DOTDIR_RE = /(^|\/)\.(?!\.\/)(?!claude[^/]*\/|config\/)[^/]+\//i;
var CLAUDE_TRANSIENT_DIRS = ["shell-snapshots", "session-env", "projects", "file-history", "backups"];
var regExp = new RegExp(String.raw`(^|/)\.claude[^/]*/(?:${CLAUDE_TRANSIENT_DIRS.join("|")})/`, "i");
//@ chunk-qmzcskz6.js:746-839 placement
function isScriptFileName(e) {
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  return SCRIPT_EXTENSION_RE.test(sliced) || (sliced !== "" && !sliced.includes("."));
}
//@ chunk-qmzcskz6.js:839-899 placement
function shellWord(e, quote) {
  return {
    text: e,
    quote,
    start: 0,
    end: e.length,
  };
}
//@ chunk-qmzcskz6.js:899-955 placement
var COMMON_INTERPRETERS = new Set(["python3", "python", "bash", "sh", "node"]);
//@ chunk-qmzcskz6.js:955-986 placement
function isCommonInterpreter(e) {
  return COMMON_INTERPRETERS.has(e);
}
//@ chunk-qmzcskz6.js:986-1676 placement
/**
 * 匹配解释器名（sh/bash/zsh/python/node 等）的正则。
 */
var INTERPRETER_NAME_PATTERN =
  /^(?:sh|bash|zsh|dash|ash|ksh\d*|mksh|rbash|fish|csh|tcsh|python(?:\d+(?:\.\d+)?)?|pypy\d*(?:\.\d+)?|node(?:js)?\d*|deno|bun|perl|ruby|irb|erb|php|lua|tclsh[\d.]*|wish[\d.]*|expect|m4|Rscript|R|script|osascript|pwsh|env)$/iu;
var INTERPRETER_NAME_PATTERN_2 = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
var ASSIGNMENT_PREFIX_RE = /^(?:~|\$HOME|\$\{HOME\})\//;
var QUOTED_HOME_PREFIX_RE = /^(?:\$HOME|\$\{HOME\})\//;
var HOME_OR_PROJECT_MARKERS_RE =
  /^(?:\$HOME|\$\{HOME\}|\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_PLUGIN_ROOT\})$/;
var PROJECT_DIR_PREFIX_RE = /^(?:\$CLAUDE_PROJECT_DIR|\$\{CLAUDE_PROJECT_DIR\})\//;
var PLUGIN_ROOT_PREFIX_RE = /^(?:\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_PLUGIN_ROOT\})\//;
var PLUGIN_ROOT_REFERENCE_RE = /\$\{?CLAUDE_PLUGIN_ROOT\b/;
var PLUGIN_ROOT_PLACEHOLDER = "${CLAUDE_PLUGIN_ROOT}";
var SHELL_META_OR_SPACE_RE = /[$~*?[\]()\{\}#!|&;<>`\\\p{Cc}\p{Cf}]|[^\S ]/u;
var CONTROL_CHARS_RE = /[\p{Cc}\p{Cf}]/u;
//@ chunk-qmzcskz6.js:1676-2279 placement
function resolveScriptPath(command) {
  let t = [];
  let n = 0;
  while (n < command.length) {
    if (command[n] === " ") {
      n += 1;
      continue;
    }
    let r = command[n];
    let l = r === '"' || r === "'" ? r : null;
    if (l) {
      let index = command.indexOf(l, n + 1);
      if (index === -1) return null;
      let sliced = command.slice(n + 1, index);
      let i = command[index + 1];
      if (i !== undefined && i !== " ") {
        let a = index + 1;
        while (a < command.length && command[a] !== " ") {
          if (command[a] === '"' || command[a] === "'") return null;
          a += 1;
        }
        if (l !== '"' || !HOME_OR_PROJECT_MARKERS_RE.test(sliced)) return null;
        t.push({
          text: sliced + command.slice(index + 1, a),
          quote: l,
          start: n,
          end: a,
        });
        n = a;
        continue;
      }
      t.push({
        text: sliced,
        quote: l,
        start: n,
        end: index + 1,
      });
      n = index + 1;
    } else {
      let s = n;
      while (s < command.length && command[s] !== " ") {
        if (command[s] === '"' || command[s] === "'") return null;
        s += 1;
      }
      t.push({
        text: command.slice(n, s),
        quote: null,
        start: n,
        end: s,
      });
      n = s;
    }
  }
  return t;
}
//@ chunk-qmzcskz6.js:2279-2341 placement
function homePrefixPatternFor(e) {
  return e.quote === null ? ASSIGNMENT_PREFIX_RE : e.quote === '"' ? QUOTED_HOME_PREFIX_RE : null;
}
//@ chunk-qmzcskz6.js:2341-2686 placement
function classifyScriptRoot(e) {
  let t = homePrefixPatternFor(e);
  if (t !== null && t.test(e.text))
    return {
      rest: e.text.replace(t, ""),
      hadPrefix: true,
      base: "home",
    };
  if (e.quote !== "'" && PROJECT_DIR_PREFIX_RE.test(e.text))
    return {
      rest: e.text.replace(PROJECT_DIR_PREFIX_RE, ""),
      hadPrefix: true,
      base: "project",
    };
  if (e.quote !== "'" && PLUGIN_ROOT_PREFIX_RE.test(e.text))
    return {
      rest: e.text.replace(PLUGIN_ROOT_PREFIX_RE, ""),
      hadPrefix: true,
      base: "plugin",
    };
  return {
    rest: e.text,
    hadPrefix: false,
    base: null,
  };
}
//@ chunk-qmzcskz6.js:2686-2706 placement
var GLOB_META_RE = /[\s*?[\]]/u;
//@ chunk-qmzcskz6.js:2706-2783 placement
function isPlainRelativeLiteral(path, t) {
  return path.quote !== null || path.text.startsWith("~/") || !GLOB_META_RE.test(t);
}
//@ chunk-qmzcskz6.js:2783-2925 placement
var SCRIPT_EXTENSION_RE = /\.(?:py|sh|bash|zsh|js|mjs|cjs|ts|rb|pl)$/iu;
var SYSTEM_BIN_DIRS = new Set(["/usr/bin", "/bin", "/usr/local/bin", "/opt/homebrew/bin"]);
var DOT_DOT_SEGMENT_RE = /(^|\/)\.\.(\/|$)/;
//@ chunk-qmzcskz6.js:2925-2984 placement
function hasDotDotSegment(e) {
  return DOT_DOT_SEGMENT_RE.test(e.replace(/^(?:\.\.?\/)+/, ""));
}
//@ chunk-qmzcskz6.js:2984-3266 placement
function looksLikeScriptPath(e) {
  if (e.quote === null && INTERPRETER_NAME_PATTERN_2.test(e.text)) return false;
  let { rest, hadPrefix } = classifyScriptRoot(e);
  if (
    rest.startsWith("-") ||
    HIDDEN_PATH_PATTERN.test(rest) ||
    PRIVATE_DOTDIR_RE.test(rest) ||
    regExp.test(rest) ||
    rest.endsWith("/") ||
    (!isScriptFileName(rest) && !SHELL_META_OR_SPACE_RE.test(rest))
  )
    return false;
  return (
    hadPrefix ||
    rest.startsWith("/") ||
    rest.startsWith("./") ||
    rest.startsWith("../") ||
    (rest.includes("/") && SCRIPT_EXTENSION_RE.test(rest))
  );
}
//@ chunk-qmzcskz6.js:3266-3337 placement
function isScriptishArgument(e) {
  let { rest } = classifyScriptRoot(e);
  return looksLikeScriptPath(e) || rest.includes("/") || SCRIPT_EXTENSION_RE.test(rest);
}
//@ chunk-qmzcskz6.js:3337-3599 placement
function describeOpaqueCommand(
  interpreter,
  t,
  n,
  site = {
    form: "shell",
    start: t.start,
    end: t.end,
  },
) {
  let { rest, base } = classifyScriptRoot(t);
  let o = rootDirForBase(base, n);
  if (o === null)
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  return {
    kind: "script",
    interpreter,
    rawPath: t.text,
    resolvedPath: posix.resolve(n.hookCwd, o === "" ? rest : `${o}/${rest}`),
    site,
  };
}
//@ chunk-qmzcskz6.js:3599-3744 placement
function rootDirForBase(base, t) {
  switch (base) {
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
//@ chunk-qmzcskz6.js:3744-4427 placement
/**
 * 解析命令的解释器与脚本参数（uv run、不支持的解释器、程序有歧义）。
 */
function parseInterpreterInvocation(scriptPath) {
  let [t, n] = scriptPath;
  if (t === undefined)
    return {
      interpreter: null,
      path: undefined,
      refusal: null,
    };
  if (t.quote === null && t.text === "uv" && n?.text === "run")
    return {
      interpreter: null,
      path: undefined,
      refusal: "uv_project",
    };
  let lower = t.text.toLowerCase();
  if (t.quote === null && isCommonInterpreter(lower)) {
    let s = n !== undefined && looksLikeScriptPath(n) && scriptPath.slice(2).some(isScriptishArgument);
    return {
      interpreter: lower,
      path: n,
      refusal: s ? "ambiguous_program" : null,
    };
  }
  let any = scriptPath.slice(1).some(isScriptishArgument);
  if (looksLikeScriptPath(t)) {
    let sliced = t.text.slice(t.text.lastIndexOf("/") + 1);
    if (n === undefined && INTERPRETER_NAME_PATTERN.test(sliced))
      return {
        interpreter: null,
        path: undefined,
        refusal: null,
      };
    return {
      interpreter: null,
      path: t,
      refusal: any || (n !== undefined && !SCRIPT_EXTENSION_RE.test(sliced)) ? "ambiguous_program" : null,
    };
  }
  return {
    interpreter: null,
    path: undefined,
    refusal: any ? "unsupported_interpreter" : null,
  };
}
//@ chunk-qmzcskz6.js:4427-6950 placement
/**
 * 分析钩子命令得到解释器与脚本：shell 语法则为 opaque，插件命令展开 ${CLAUDE_PLUGIN_ROOT}（约 2.5 KB）。
 */
function analyzeHookCommand(hook, t) {
  if ([hook.command, ...(hook.args ?? [])].some((c) => CONTROL_CHARS_RE.test(c)))
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  if (
    t.pluginRoot === undefined &&
    [hook.command, ...(hook.args ?? [])].some((c) => PLUGIN_ROOT_REFERENCE_RE.test(c))
  )
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let { pluginRoot } = t;
  let r =
    hook.args !== undefined && pluginRoot !== undefined
      ? {
          ...hook,
          command: substitutePluginRoot(hook.command, pluginRoot),
          args: hook.args.map((arg) => substitutePluginRoot(arg, pluginRoot)),
        }
      : hook;
  if ((r.shell ?? t.defaultShell) !== "bash")
    return {
      kind: "opaque",
      reason: "unsupported_shell",
    };
  if (t.shellPrefix !== undefined && t.shellPrefix !== "" && r.args === undefined)
    return {
      kind: "opaque",
      reason: "shell_prefix",
    };
  if (
    !t.hookCwd.startsWith("/") ||
    !t.home.startsWith("/") ||
    !t.projectDir.startsWith("/") ||
    (t.pluginRoot !== undefined && (!t.pluginRoot.startsWith("/") || DOT_DOT_SEGMENT_RE.test(t.pluginRoot)))
  )
    return {
      kind: "opaque",
      reason: "unsupported_platform",
    };
  if (r.args !== undefined) {
    let c =
      r.command.startsWith("/") && !DOT_DOT_SEGMENT_RE.test(r.command)
        ? posix.normalize(r.command)
        : r.command;
    let W = c.startsWith("/") ? c.slice(0, c.lastIndexOf("/")) : null;
    let C =
      W === null
        ? c.toLowerCase()
        : SYSTEM_BIN_DIRS.has(W.toLowerCase())
          ? c.slice(c.lastIndexOf("/") + 1).toLowerCase()
          : "";
    if (C === "uv")
      return {
        kind: "opaque",
        reason: r.args[0] === "run" ? "uv_project" : "args_form",
      };
    if (r.args.some((arg) => arg.includes("${")) || /\/\.?$/u.test(r.command))
      return {
        kind: "opaque",
        reason: "args_form",
      };
    let interpreter = isCommonInterpreter(C) ? C : null;
    if (interpreter === null) {
      let E = r.command.startsWith("/") || r.command.startsWith("./") || r.command.startsWith("../");
      let sliced = r.command.slice(r.command.lastIndexOf("/") + 1);
      let oe =
        (r.args.length === 0 && !INTERPRETER_NAME_PATTERN.test(sliced)) ||
        (r.args.length > 0 &&
          SCRIPT_EXTENSION_RE.test(sliced) &&
          !r.args.some((arg) => isScriptishArgument(shellWord(arg, "'"))));
      return E &&
        oe &&
        looksLikeScriptPath(shellWord(r.command, null)) &&
        !SHELL_META_OR_SPACE_RE.test(r.command) &&
        !hasDotDotSegment(r.command)
        ? describeOpaqueCommand(null, shellWord(r.command, null), t, {
            form: "exec",
            slot: "command",
          })
        : {
            kind: "opaque",
            reason: "args_form",
          };
    }
    let _ = r.args[0];
    if (_ === undefined || r.args.slice(1).some((arg) => isScriptishArgument(shellWord(arg, "'"))))
      return {
        kind: "opaque",
        reason: "args_form",
      };
    let L = shellWord(_, "'");
    return looksLikeScriptPath(L) &&
      isScriptFileName(_) &&
      !SHELL_META_OR_SPACE_RE.test(_) &&
      !hasDotDotSegment(_)
      ? describeOpaqueCommand(interpreter, L, t, {
          form: "exec",
          slot: "arg0",
        })
      : {
          kind: "opaque",
          reason: "args_form",
        };
  }
  let scriptPath = resolveScriptPath(r.command);
  if (scriptPath === null)
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let [s] = scriptPath;
  if (s !== undefined && s.quote === null && INTERPRETER_NAME_PATTERN_2.test(s.text))
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let { interpreter, path, refusal } = parseInterpreterInvocation(scriptPath);
  if (refusal !== null)
    return {
      kind: "opaque",
      reason: refusal,
    };
  if (path === undefined || !looksLikeScriptPath(path)) {
    let c = path ?? s;
    return {
      kind: "opaque",
      reason:
        c !== undefined && PRIVATE_DOTDIR_RE.test(classifyScriptRoot(c).rest) ? "private_dotdir" : "no_path",
    };
  }
  let sliced = r.command.slice(0, path.start);
  let sliced_2 = r.command.slice(path.end);
  if ([sliced, classifyScriptRoot(path).rest, sliced_2].some((c) => SHELL_META_OR_SPACE_RE.test(c)))
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let { rest, hadPrefix, base } = classifyScriptRoot(path);
  if (
    (hadPrefix && !isPlainRelativeLiteral(path, rootDirForBase(base, t) ?? "")) ||
    (hadPrefix ? DOT_DOT_SEGMENT_RE.test(rest) : hasDotDotSegment(rest))
  )
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  return describeOpaqueCommand(interpreter, path, t);
}
//@ chunk-qmzcskz6.js:6950-6993 placement
function substitutePluginRoot(e, pluginRoot) {
  return e.split(PLUGIN_ROOT_PLACEHOLDER).join(pluginRoot);
}
//@ chunk-qmzcskz6.js:6993-7204 placement
/**
 * POSIX 分隔符常量与 Windows 路径形态正则（盘符、UNC、设备前缀、命名空间）。
 */
var POSIX_SEP_2 = "/";
var POSIX_SEP = /^[A-Za-z]:[\\/]/;
var WIN32_UNC_HOST_RE = /^[\\/]{2}[^\\/]+[\\/]+[^\\/]+/;
var WIN32_DEVICE_PREFIX_RE = /^(?:[\\/]{2,}[?.][\\/]+|\\\?\?\\)(?=[A-Za-z]:)/;
var WIN32_DEVICE_UNC_RE = /^(?:[\\/]{2,}[?.][\\/]+|\\\?\?\\)UNC[\\/]+/i;
var WIN32_DEVICE_NAMESPACE_RE = /^(?:[\\/]{2}[?.]|[\\/]\?\?)(?:[\\/]|$)/;
//@ chunk-qmzcskz6.js:7204-7261 placement
/**
 * 按平台判断路径 n 是否位于 e 之下。
 */
function isPathUnderForPlatform(e, t) {
  return getPlatform() === "windows" ? isWindowsPathUnder(e, t) : isPosixPathUnder(e, t);
}
//@ chunk-qmzcskz6.js:7261-7377 placement
function isPosixPathUnder(e, t) {
  let n = t.length > 1 && t.endsWith("/") ? t.slice(0, -1) : t;
  return e === n || e.startsWith(n === "/" ? "/" : `${n}/`);
}
//@ chunk-qmzcskz6.js:7377-7491 placement
function isWindowsPathUnder(e, t) {
  let replaced = toWindowsBackslashPath(t).replace(/\\+$/, "");
  if (replaced === "") return true;
  let windowsBackslashPath = toWindowsBackslashPath(e);
  return windowsBackslashPath === replaced || windowsBackslashPath.startsWith(`${replaced}\\`);
}
//@ chunk-qmzcskz6.js:7491-7578 placement
function toWindowsBackslashPath(e) {
  return e.replace(/\//g, "\\").replace(/^[a-z](?=:)/, (t) => t.toUpperCase());
}
//@ chunk-qmzcskz6.js:7578-7653 placement
/**
 * 去掉 Win32 设备前缀（\\?\、\\?\UNC\ 按需转换）。
 */
function stripWin32DevicePrefix(e) {
  return WIN32_DEVICE_UNC_RE.test(e)
    ? `\\\\${e.replace(WIN32_DEVICE_UNC_RE, "")}`
    : e.replace(WIN32_DEVICE_PREFIX_RE, "");
}
//@ chunk-qmzcskz6.js:7653-7762 placement
function uncAdminShareToDrive(e) {
  let t = stripWin32DevicePrefix(e);
  let match = WIN32_ADMIN_SHARE_RE.exec(t);
  return match !== null && isLocalHost_2(match[1], false) ? `${match[2]}:\\${t.slice(match[0].length)}` : t;
}
//@ chunk-qmzcskz6.js:7762-7821 placement
var WIN32_ADMIN_SHARE_RE = /^[\\/]{2,}([^\\/]+)[\\/]+([A-Za-z])\$(?:[\\/]+|$)/;
//@ chunk-qmzcskz6.js:8678-9310 placement = extractBaseCommand (0.679)
/**
 * （旧版名配错）Windows 路径规范化：处理盘符、UNC 前缀、.. 折叠、去掉尾随点空格，用于路径比较。
 */
function normalizeWindowsPathForCompare(path) {
  let t = uncAdminShareToDrive(path);
  let n = /^[\\/]+/.exec(t)?.[0] ?? "";
  let parts = t.slice(n.length).split(/[\\/]+/);
  let l = n === "" && /^[A-Za-z]:$/.test(parts[0] ?? "");
  let s = n === "" && /^[A-Za-z]:./.test(parts[0] ?? "");
  let o = [];
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
/**
 * 规范化后判断两条命令路径是否相同。
 */
function isSameCommandPath(e, t) {
  return isReachableOrSamePath(normalizeCommandForPlatform(e), normalizeCommandForPlatform(t));
}
//@ chunk-qmzcskz6.js:9597-9712 placement
/**
 * 判断两个路径是否相同或互相可达（含 Windows 短名、UNC、WSL 挂载）。
 */
function isReachableOrSamePath(e, t) {
  return (
    isPathUnderForPlatform(e, t) ||
    (getPlatform() === "windows" &&
      (isUncOrShortNamePair(e, t) || (e.startsWith("\\\\") && t.startsWith("\\\\")))) ||
    isOnSameWslMount(e, t)
  );
}
//@ chunk-qmzcskz6.js:9712-9760 placement
function isUncOrShortNamePair(e, t) {
  return [e, t].some(isSpecialUncPath) || differsByUncPrefix(e, t);
}
//@ chunk-qmzcskz6.js:9760-9807 placement
/**
 * 判断两个路径是否只在 UNC 前缀上不同。
 */
function differsByUncPrefix(e, t) {
  return UNC_PREFIX_RE.test(e) !== UNC_PREFIX_RE.test(t);
}
//@ chunk-qmzcskz6.js:9807-9935 placement
/**
 * 判断两个 UNC 路径主机相同、共享名一个是短名（8.3）形式。
 */
function isSameUncHostShortNamePair(e, t) {
  let match = UNC_HOST_AND_SHARE_RE.exec(e);
  let match_2 = UNC_HOST_AND_SHARE_RE.exec(t);
  return (
    match !== null &&
    match_2 !== null &&
    match[1] === match_2[1] &&
    match[2] !== match_2[2] &&
    (SHARE_ALIAS_SUFFIX_RE.test(match[2]) || SHARE_ALIAS_SUFFIX_RE.test(match_2[2]))
  );
}
//@ chunk-qmzcskz6.js:9935-9981 placement
var UNC_HOST_AND_SHARE_RE = /^\\\\([^\\]+)\\([^\\]+)/;
var SHARE_ALIAS_SUFFIX_RE = /^[a-z]\$$/;
//@ chunk-qmzcskz6.js:9981-10123 placement
/**
 * 把 UNC 路径的主机名改写为参考路径的主机名。
 */
function rewriteUncHostFromReference(e, t) {
  if (!isSameUncHost(e, t)) return e;
  let n = /^\\\\([^\\]+)(?=\\|$)/.exec(t)?.[1];
  return n === undefined ? e : e.replace(/^\\\\[^\\]+/, () => `\\\\${n}`);
}
//@ chunk-qmzcskz6.js:10123-10337 placement
function isSameUncHost(e, t) {
  let n = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\)/.exec(e)?.[1] ?? "", "@"), ".");
  let r = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\|$)/.exec(t)?.[1] ?? "", "@"), ".");
  return (
    n !== "" &&
    r !== "" &&
    (n === r || (isShortWindowsPath(n) && r.startsWith(n)) || (isShortWindowsPath(r) && n.startsWith(r)))
  );
}
//@ chunk-qmzcskz6.js:10337-10346 placement
/**
 * Windows 短路径的字符阈值。
 */
var SHORT_WINDOWS_PATH_CHARS = 15;
//@ chunk-qmzcskz6.js:10346-10444 placement
function isShortWindowsPath(e) {
  let t = getPlatform() === "windows" ? (e.match(/ss/g)?.length ?? 0) : 0;
  return e.length >= SHORT_WINDOWS_PATH_CHARS && e.length - t <= SHORT_WINDOWS_PATH_CHARS;
}
//@ chunk-qmzcskz6.js:10444-10482 placement
function isSpecialUncPath(e) {
  return classifyUncPath(e) !== undefined;
}
//@ chunk-qmzcskz6.js:10482-10928 placement
/**
 * 分类 Windows UNC/特殊路径（本机、WSL、短名、设备命名空间、WebDAV 等）。
 */
function classifyUncPath(e) {
  let t = /^\\\\([^\\]+)\\/.exec(e)?.[1];
  let n = t === undefined ? undefined : WSL_UNC_SHARE_RE.exec(t)?.[1];
  if (t !== undefined && isLocalHost_2(n ?? t)) return "own_host";
  if (t !== undefined && WSL_UNC_HOSTS.has(t)) return "wsl_host";
  if (e.split("\\").some(isShortNameComponent)) return "short_name";
  if (WIN32_DEVICE_NAMESPACE_RE.test(e)) return "device_namespace";
  if (DRIVE_RELATIVE_RE.test(e)) return "drive_relative";
  if (t === undefined) return;
  if (n !== undefined) return NUMERIC_HOST_RE.test(n) ? "numeric_host" : "webdav_host";
  if (ODD_UNC_HOST_RE.test(t)) return "odd_host";
  if (NUMERIC_HOST_RE.test(t)) return "numeric_host";
  return;
}
//@ chunk-qmzcskz6.js:10928-11011 placement
var WSL_UNC_SHARE_RE = /^((?=[^@]*[a-z])[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?:@ssl(?:@\d+)?|@\d+)$/i;
//@ chunk-qmzcskz6.js:11011-11113 placement
function isShortNameComponent(e) {
  return /^[\x20-\x7e]*$/.test(e) ? isDosShortName(e.replaceAll("ss", "s")) : /~\d+(?:\.[^.]*)?$/.test(e);
}
//@ chunk-qmzcskz6.js:11113-11303 placement
var UNC_PREFIX_RE = /^\\[^\\]/;
var DRIVE_RELATIVE_RE = /^[a-z]:(?![\\/]|$)/;
var WSL_UNC_HOSTS = new Set(["wsl.localhost", "wsl$"]);
var ODD_UNC_HOST_RE = /[:@]|[^\x21-\x7e]|^\.+$/;
var NUMERIC_HOST_RE = /^(?:(?:0x[0-9a-f]*|\d+)(?:\.(?:0x[0-9a-f]*|\d+)){0,3}|.*\.ipv6-literal\.net)$/i;
//@ chunk-qmzcskz6.js:11303-11395 placement
function isInspectableScriptPath(e) {
  return (
    posix.isAbsolute(e) &&
    !HIDDEN_PATH_PATTERN.test(e) &&
    !PRIVATE_DOTDIR_RE.test(e) &&
    !regExp.test(e) &&
    !CONTROL_CHARS_RE.test(e) &&
    isScriptFileName(e)
  );
}
//@ chunk-qmzcskz6.js:11395-11928 placement
async function classifyScriptLocation(e, t, n) {
  let cwd;
  try {
    cwd = await n.realpath(e);
  } catch (error) {
    return {
      location: "elsewhere",
      realPath: null,
      missing: isPathAbsent(error),
    };
  }
  if (!isInspectableScriptPath(cwd))
    return {
      location: "elsewhere",
      realPath: null,
      missing: false,
    };
  if (
    posix.isAbsolute(t.configHomeReal) &&
    CLAUDE_TRANSIENT_DIRS.some((o) =>
      isPathUnderForPlatform(caseFoldKey(cwd), caseFoldKey(posix.join(t.configHomeReal, o))),
    )
  )
    return {
      location: "elsewhere",
      realPath: null,
      missing: false,
    };
  let s = [
    ["in_checkout", t.launchDirReal],
    ["in_config_home", t.configHomeReal],
  ]
    .filter(([, o]) => posix.isAbsolute(o) && isPathUnderForPlatform(cwd, o))
    .sort(([, o], [, i]) => i.length - o.length)[0];
  return {
    location: s ? s[0] : "elsewhere",
    realPath: cwd,
  };
}
//@ chunk-qmzcskz6.js:11928-11942 placement
var MAX_SCRIPT_PROBE_BYTES = 262144;
//@ chunk-qmzcskz6.js:11942-12469 placement
async function checkScriptFile(e, t, n = MAX_SCRIPT_PROBE_BYTES) {
  let r;
  try {
    r = await t.open(e);
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile())
      return {
        ok: false,
        reason: "not_regular",
      };
    if (stats.nlink > 1)
      return {
        ok: false,
        reason: "multiply_linked",
      };
    let s = Buffer.alloc(n + 1);
    let o = 0;
    while (o < s.length) {
      let { bytesRead } = await r.read(s, o, s.length - o, o);
      if (bytesRead === 0) break;
      o += bytesRead;
    }
    if (o > n)
      return {
        ok: false,
        reason: "too_large",
      };
    let buffer = Buffer.from(s.subarray(0, o));
    return {
      ok: true,
      sha256: computeContentHash(buffer),
      bytes: buffer,
    };
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-qmzcskz6.js:12469-13820 placement
/**
 * /usr/bin/env 与各 shell 的单字母选项表，用于解析 shebang 参数。
 */
var ENV_PROGRAM_PATHS = new Set(["/usr/bin/env", "/bin/env"]);
var SHEBANG_INTERPRETER_RULES = [
  {
    names: /^(?:bash|dash|ash|sh|rbash|mksh|ksh[0-9]*)$/,
    letters: "aefhiklmnprtuvxBCEHPT",
    long: new Set(["login", "posix", "norc", "noprofile", "restricted"]),
    ends: ["-", "--"],
  },
  {
    names: /^zsh$/,
    letters: "aefhiklmnprtuvxBCEHPT",
    long: new Set(["login"]),
    ends: ["-", "--", "-b"],
  },
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
  {
    names: /^osascript$/,
    letters: "",
    valued: "l",
  },
  {
    names: /^fish$/,
    letters: "N",
    long: new Set(["no-config"]),
  },
  {
    names: /^(?:tclsh|wish)[0-9.]*$/,
    letters: "",
  },
  {
    names: /^(?:python|pypy)[0-9.]*$/,
    letters: "bBdEIOPqRsSuvx",
    ends: ["--"],
  },
  {
    names: /^perl[0-9.]*$/,
    letters: "acnpsTtwWX",
    ends: ["--"],
  },
  {
    names: /^ruby[0-9.]*$/,
    letters: "acdlnpsvwy",
    ends: ["--"],
  },
  {
    names: /^[gnm]?awk$/,
    letters: "",
    nextWord: "fE",
  },
  {
    names: /^g?sed$/,
    letters: "nEru",
    nextWord: "f",
  },
  {
    names: /^php[0-9.]*$/,
    letters: "nqeH",
  },
  {
    names: /^t?csh$/,
    letters: "efnvx",
    ends: ["-b"],
  },
  {
    names: /^expect$/,
    letters: "",
    ends: ["--"],
    nextWord: "f",
  },
  {
    names: /^(?:g|b|p|gnu)?make$/,
    letters: "",
    nextWord: "f",
    requiresTerminal: true,
  },
];
//@ chunk-qmzcskz6.js:13820-14660 placement
function parseShebangArgs(e, t, { childStartsInReach: n = true } = {}) {
  let found = SHEBANG_INTERPRETER_RULES.find((u) => u.names.test(t.toLowerCase()));
  if (found === undefined) return !n && e.length === 0;
  if (
    n &&
    found.inReachNeeds !== undefined &&
    !found.inReachNeeds.some((inReachNeed) => inReachNeed.every((d) => e.includes(`--${d}`)))
  )
    return false;
  let l = (u) =>
    u.startsWith("--")
      ? (found.long?.has(u.slice(2)) ?? false)
      : /^-[A-Za-z]{1,3}$/.test(u) &&
        u
          .slice(1)
          .split("")
          .every((d) => found.letters.includes(d));
  let s = (u) =>
    (found.ends?.includes(u) ?? false) ||
    (found.nextWord !== undefined &&
      /^-[A-Za-z]{1,3}$/.test(u) &&
      found.nextWord.includes(u.at(-1)) &&
      u
        .slice(1, -1)
        .split("")
        .every((d) => found.letters.includes(d)));
  let o = (u) => found.valued !== undefined && new RegExp(`^-[${found.valued}]$`).test(u);
  if (e.length > 0 && o(e.at(-1))) return false;
  let filtered = e.filter((u, d) => !(d > 0 && o(e[d - 1])));
  let last = filtered.at(-1);
  let f = last !== undefined && !l(last) && s(last);
  if (found.requiresTerminal && !(f && last !== "--" && last !== "-")) return false;
  return filtered.every((u, d) => l(u) || o(u) || (d === filtered.length - 1 && s(u)));
}
//@ chunk-qmzcskz6.js:14660-15660 placement
/**
 * 读取脚本前 512 字节的 shebang 并解析解释器。
 */
function readShebang(bytes) {
  let str = bytes.subarray(0, 512).toString("utf8");
  if (!str.startsWith("#!")) return null;
  let index = str.indexOf(`
`);
  let parts = str
    .slice(2, index === -1 ? undefined : index)
    .replace(/^[ \t]+|[ \t]+$/g, "")
    .split(/[ \t]+/);
  let l = parts[0];
  if (l === undefined || l === "") return null;
  if (parts.some((a) => /[^\x21-\x7e]/.test(a))) return "unjudgeable";
  if (!l.startsWith("/") || DOT_DOT_SEGMENT_RE.test(l))
    return {
      kind: "cwd",
    };
  let normalized = posix.normalize(l);
  if (!ENV_PROGRAM_PATHS.has(normalizeCommandForPlatform(normalized))) {
    if (normalizeCommandForPlatform(posix.basename(normalized)) === "env") return "unjudgeable";
    return parseShebangArgs(parts.slice(1), posix.basename(normalized))
      ? {
          kind: "absolute",
          path: normalized,
        }
      : parts.slice(1).some((a) => !a.startsWith("-"))
        ? {
            kind: "cwd",
          }
        : "unjudgeable";
  }
  let o = parts[1] === "-S" ? parts.slice(2) : parts.slice(1);
  let i = o[0];
  if (i === undefined || i.startsWith("-") || i.includes("=")) return "unjudgeable";
  if (!parseShebangArgs(o.slice(1), posix.basename(i)))
    return o.slice(1).some((a) => !a.startsWith("-"))
      ? {
          kind: "cwd",
        }
      : "unjudgeable";
  if (i.startsWith("/"))
    return DOT_DOT_SEGMENT_RE.test(i) || /[\\$"'#\s]/.test(i)
      ? "unjudgeable"
      : {
          kind: "absolute",
          path: posix.normalize(i),
        };
  if (i.includes("/"))
    return {
      kind: "cwd",
    };
  return /^[\w.+-]+$/.test(i)
    ? {
        kind: "env",
        program: i,
      }
    : "unjudgeable";
}
export {
  foldWindowsPathComponent,
  SHORT_WINDOWS_PATH_CHARS,
  stripWin32DevicePrefix,
  WIN32_DEVICE_NAMESPACE_RE,
  POSIX_SEP,
  WIN32_UNC_HOST_RE,
  caseFoldKey,
  normalizeWindowsPathForCompare,
  analyzeHookCommand,
  POSIX_SEP_2,
  classifyUncPath,
  uncAdminShareToDrive,
  rewriteUncHostFromReference,
  isPathUnderForPlatform,
  differsByUncPrefix,
  isSameUncHostShortNamePair,
  parseShebangArgs,
  checkScriptFile,
  isSameCommandPath,
  isPosixPathUnder,
  isReachableOrSamePath,
  classifyScriptLocation,
  readShebang,
  INTERPRETER_NAME_PATTERN,
};
