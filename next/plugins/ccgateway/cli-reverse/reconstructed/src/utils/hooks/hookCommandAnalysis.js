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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qmzcskz6.js:527-746 placement
var HIDDEN_PATH_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PRIVATE_DOTDIR_RE;
var CLAUDE_TRANSIENT_DIRS;
var regExp;
deferInit("chunk-qmzcskz6.js:527", () => {
  HIDDEN_PATH_PATTERN = /(^|\/)\.[^/]*$/;
  PRIVATE_DOTDIR_RE = /(^|\/)\.(?!\.\/)(?!claude[^/]*\/|config\/)[^/]+\//i;
  CLAUDE_TRANSIENT_DIRS = ["shell-snapshots", "session-env", "projects", "file-history", "backups"];
  regExp = new RegExp(String.raw`(^|/)\.claude[^/]*/(?:${CLAUDE_TRANSIENT_DIRS.join("|")})/`, "i");
});
//@ chunk-qmzcskz6.js:746-839 placement
function isScriptFileName(name) {
  let sliced = name.slice(name.lastIndexOf("/") + 1);
  return SCRIPT_EXTENSION_RE.test(sliced) || (sliced !== "" && !sliced.includes("."));
}
//@ chunk-qmzcskz6.js:839-899 placement
function shellWord(text, quote) {
  return {
    text,
    quote,
    start: 0,
    end: text.length,
  };
}
//@ chunk-qmzcskz6.js:899-955 placement
var COMMON_INTERPRETERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qmzcskz6.js:899", () => {
  COMMON_INTERPRETERS = new Set(["python3", "python", "bash", "sh", "node"]);
});
//@ chunk-qmzcskz6.js:955-986 placement
function isCommonInterpreter(name) {
  return COMMON_INTERPRETERS.has(name);
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
  let words = [];
  let index = 0;
  while (index < command.length) {
    if (command[index] === " ") {
      index += 1;
      continue;
    }
    let char = command[index];
    let quote = char === '"' || char === "'" ? char : null;
    if (quote) {
      let index_2 = command.indexOf(quote, index + 1);
      if (index_2 === -1) return null;
      let sliced = command.slice(index + 1, index_2);
      let nextChar = command[index_2 + 1];
      if (nextChar !== undefined && nextChar !== " ") {
        let end = index_2 + 1;
        while (end < command.length && command[end] !== " ") {
          if (command[end] === '"' || command[end] === "'") return null;
          end += 1;
        }
        if (quote !== '"' || !HOME_OR_PROJECT_MARKERS_RE.test(sliced)) return null;
        words.push({
          text: sliced + command.slice(index_2 + 1, end),
          quote,
          start: index,
          end,
        });
        index = end;
        continue;
      }
      words.push({
        text: sliced,
        quote,
        start: index,
        end: index_2 + 1,
      });
      index = index_2 + 1;
    } else {
      let start = index;
      while (start < command.length && command[start] !== " ") {
        if (command[start] === '"' || command[start] === "'") return null;
        start += 1;
      }
      words.push({
        text: command.slice(index, start),
        quote: null,
        start: index,
        end: start,
      });
      index = start;
    }
  }
  return words;
}
//@ chunk-qmzcskz6.js:2279-2341 placement
function homePrefixPatternFor(word) {
  return word.quote === null ? ASSIGNMENT_PREFIX_RE : word.quote === '"' ? QUOTED_HOME_PREFIX_RE : null;
}
//@ chunk-qmzcskz6.js:2341-2686 placement
function classifyScriptRoot(word) {
  let pattern = homePrefixPatternFor(word);
  if (pattern !== null && pattern.test(word.text))
    return {
      rest: word.text.replace(pattern, ""),
      hadPrefix: true,
      base: "home",
    };
  if (word.quote !== "'" && PROJECT_DIR_PREFIX_RE.test(word.text))
    return {
      rest: word.text.replace(PROJECT_DIR_PREFIX_RE, ""),
      hadPrefix: true,
      base: "project",
    };
  if (word.quote !== "'" && PLUGIN_ROOT_PREFIX_RE.test(word.text))
    return {
      rest: word.text.replace(PLUGIN_ROOT_PREFIX_RE, ""),
      hadPrefix: true,
      base: "plugin",
    };
  return {
    rest: word.text,
    hadPrefix: false,
    base: null,
  };
}
//@ chunk-qmzcskz6.js:2686-2706 placement
var GLOB_META_RE = /[\s*?[\]]/u;
//@ chunk-qmzcskz6.js:2706-2783 placement
function isPlainRelativeLiteral(path, rest) {
  return path.quote !== null || path.text.startsWith("~/") || !GLOB_META_RE.test(rest);
}
//@ chunk-qmzcskz6.js:2783-2925 placement
var SCRIPT_EXTENSION_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SYSTEM_BIN_DIRS;
var DOT_DOT_SEGMENT_RE;
deferInit("chunk-qmzcskz6.js:2783", () => {
  SCRIPT_EXTENSION_RE = /\.(?:py|sh|bash|zsh|js|mjs|cjs|ts|rb|pl)$/iu;
  SYSTEM_BIN_DIRS = new Set(["/usr/bin", "/bin", "/usr/local/bin", "/opt/homebrew/bin"]);
  DOT_DOT_SEGMENT_RE = /(^|\/)\.\.(\/|$)/;
});
//@ chunk-qmzcskz6.js:2925-2984 placement
function hasDotDotSegment(text) {
  return DOT_DOT_SEGMENT_RE.test(text.replace(/^(?:\.\.?\/)+/, ""));
}
//@ chunk-qmzcskz6.js:2984-3266 placement
function looksLikeScriptPath(word) {
  if (word.quote === null && INTERPRETER_NAME_PATTERN_2.test(word.text)) return false;
  let { rest, hadPrefix } = classifyScriptRoot(word);
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
function isScriptishArgument(word) {
  let { rest } = classifyScriptRoot(word);
  return looksLikeScriptPath(word) || rest.includes("/") || SCRIPT_EXTENSION_RE.test(rest);
}
//@ chunk-qmzcskz6.js:3337-3599 placement
function describeOpaqueCommand(
  interpreter,
  word,
  options,
  site = {
    form: "shell",
    start: word.start,
    end: word.end,
  },
) {
  let { rest, base } = classifyScriptRoot(word);
  let baseDir = rootDirForBase(base, options);
  if (baseDir === null)
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  return {
    kind: "script",
    interpreter,
    rawPath: word.text,
    resolvedPath: posix.resolve(options.hookCwd, baseDir === "" ? rest : `${baseDir}/${rest}`),
    site,
  };
}
//@ chunk-qmzcskz6.js:3599-3744 placement
function rootDirForBase(base, options) {
  switch (base) {
    case "home":
      return options.home;
    case "project":
      return options.projectDir;
    case "plugin":
      return options.pluginRoot ?? null;
    case null:
      return "";
  }
}
//@ chunk-qmzcskz6.js:3744-4427 placement
/**
 * 解析命令的解释器与脚本参数（uv run、不支持的解释器、程序有歧义）。
 */
function parseInterpreterInvocation(scriptPath) {
  let [first, second] = scriptPath;
  if (first === undefined)
    return {
      interpreter: null,
      path: undefined,
      refusal: null,
    };
  if (first.quote === null && first.text === "uv" && second?.text === "run")
    return {
      interpreter: null,
      path: undefined,
      refusal: "uv_project",
    };
  let name = first.text.toLowerCase();
  if (first.quote === null && isCommonInterpreter(name)) {
    let ambiguous =
      second !== undefined && looksLikeScriptPath(second) && scriptPath.slice(2).some(isScriptishArgument);
    return {
      interpreter: name,
      path: second,
      refusal: ambiguous ? "ambiguous_program" : null,
    };
  }
  let any = scriptPath.slice(1).some(isScriptishArgument);
  if (looksLikeScriptPath(first)) {
    let sliced = first.text.slice(first.text.lastIndexOf("/") + 1);
    if (second === undefined && INTERPRETER_NAME_PATTERN.test(sliced))
      return {
        interpreter: null,
        path: undefined,
        refusal: null,
      };
    return {
      interpreter: null,
      path: first,
      refusal:
        any || (second !== undefined && !SCRIPT_EXTENSION_RE.test(sliced)) ? "ambiguous_program" : null,
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
function analyzeHookCommand(hook, options) {
  if ([hook.command, ...(hook.args ?? [])].some((part) => CONTROL_CHARS_RE.test(part)))
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  if (
    options.pluginRoot === undefined &&
    [hook.command, ...(hook.args ?? [])].some((part) => PLUGIN_ROOT_REFERENCE_RE.test(part))
  )
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let { pluginRoot } = options;
  let hook_2 =
    hook.args !== undefined && pluginRoot !== undefined
      ? {
          ...hook,
          command: substitutePluginRoot(hook.command, pluginRoot),
          args: hook.args.map((arg) => substitutePluginRoot(arg, pluginRoot)),
        }
      : hook;
  if ((hook_2.shell ?? options.defaultShell) !== "bash")
    return {
      kind: "opaque",
      reason: "unsupported_shell",
    };
  if (options.shellPrefix !== undefined && options.shellPrefix !== "" && hook_2.args === undefined)
    return {
      kind: "opaque",
      reason: "shell_prefix",
    };
  if (
    !options.hookCwd.startsWith("/") ||
    !options.home.startsWith("/") ||
    !options.projectDir.startsWith("/") ||
    (options.pluginRoot !== undefined &&
      (!options.pluginRoot.startsWith("/") || DOT_DOT_SEGMENT_RE.test(options.pluginRoot)))
  )
    return {
      kind: "opaque",
      reason: "unsupported_platform",
    };
  if (hook_2.args !== undefined) {
    let command =
      hook_2.command.startsWith("/") && !DOT_DOT_SEGMENT_RE.test(hook_2.command)
        ? posix.normalize(hook_2.command)
        : hook_2.command;
    let dir = command.startsWith("/") ? command.slice(0, command.lastIndexOf("/")) : null;
    let baseName =
      dir === null
        ? command.toLowerCase()
        : SYSTEM_BIN_DIRS.has(dir.toLowerCase())
          ? command.slice(command.lastIndexOf("/") + 1).toLowerCase()
          : "";
    if (baseName === "uv")
      return {
        kind: "opaque",
        reason: hook_2.args[0] === "run" ? "uv_project" : "args_form",
      };
    if (hook_2.args.some((arg) => arg.includes("${")) || /\/\.?$/u.test(hook_2.command))
      return {
        kind: "opaque",
        reason: "args_form",
      };
    let interpreter = isCommonInterpreter(baseName) ? baseName : null;
    if (interpreter === null) {
      let anchored =
        hook_2.command.startsWith("/") || hook_2.command.startsWith("./") || hook_2.command.startsWith("../");
      let sliced = hook_2.command.slice(hook_2.command.lastIndexOf("/") + 1);
      let noScriptArg =
        (hook_2.args.length === 0 && !INTERPRETER_NAME_PATTERN.test(sliced)) ||
        (hook_2.args.length > 0 &&
          SCRIPT_EXTENSION_RE.test(sliced) &&
          !hook_2.args.some((arg) => isScriptishArgument(shellWord(arg, "'"))));
      return anchored &&
        noScriptArg &&
        looksLikeScriptPath(shellWord(hook_2.command, null)) &&
        !SHELL_META_OR_SPACE_RE.test(hook_2.command) &&
        !hasDotDotSegment(hook_2.command)
        ? describeOpaqueCommand(null, shellWord(hook_2.command, null), options, {
            form: "exec",
            slot: "command",
          })
        : {
            kind: "opaque",
            reason: "args_form",
          };
    }
    let arg = hook_2.args[0];
    if (arg === undefined || hook_2.args.slice(1).some((arg) => isScriptishArgument(shellWord(arg, "'"))))
      return {
        kind: "opaque",
        reason: "args_form",
      };
    let word = shellWord(arg, "'");
    return looksLikeScriptPath(word) &&
      isScriptFileName(arg) &&
      !SHELL_META_OR_SPACE_RE.test(arg) &&
      !hasDotDotSegment(arg)
      ? describeOpaqueCommand(interpreter, word, options, {
          form: "exec",
          slot: "arg0",
        })
      : {
          kind: "opaque",
          reason: "args_form",
        };
  }
  let scriptPath = resolveScriptPath(hook_2.command);
  if (scriptPath === null)
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let [word] = scriptPath;
  if (word !== undefined && word.quote === null && INTERPRETER_NAME_PATTERN_2.test(word.text))
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
    let word_2 = path ?? word;
    return {
      kind: "opaque",
      reason:
        word_2 !== undefined && PRIVATE_DOTDIR_RE.test(classifyScriptRoot(word_2).rest)
          ? "private_dotdir"
          : "no_path",
    };
  }
  let sliced = hook_2.command.slice(0, path.start);
  let sliced_2 = hook_2.command.slice(path.end);
  if ([sliced, classifyScriptRoot(path).rest, sliced_2].some((text) => SHELL_META_OR_SPACE_RE.test(text)))
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  let { rest, hadPrefix, base } = classifyScriptRoot(path);
  if (
    (hadPrefix && !isPlainRelativeLiteral(path, rootDirForBase(base, options) ?? "")) ||
    (hadPrefix ? DOT_DOT_SEGMENT_RE.test(rest) : hasDotDotSegment(rest))
  )
    return {
      kind: "opaque",
      reason: "shell_syntax",
    };
  return describeOpaqueCommand(interpreter, path, options);
}
//@ chunk-qmzcskz6.js:6950-6993 placement
function substitutePluginRoot(text, pluginRoot) {
  return text.split(PLUGIN_ROOT_PLACEHOLDER).join(pluginRoot);
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
function isPathUnderForPlatform(path, root) {
  return getPlatform() === "windows" ? isWindowsPathUnder(path, root) : isPosixPathUnder(path, root);
}
//@ chunk-qmzcskz6.js:7261-7377 placement
function isPosixPathUnder(path, root) {
  let prefix = root.length > 1 && root.endsWith("/") ? root.slice(0, -1) : root;
  return path === prefix || path.startsWith(prefix === "/" ? "/" : `${prefix}/`);
}
//@ chunk-qmzcskz6.js:7377-7491 placement
function isWindowsPathUnder(path, root) {
  let replaced = toWindowsBackslashPath(root).replace(/\\+$/, "");
  if (replaced === "") return true;
  let windowsBackslashPath = toWindowsBackslashPath(path);
  return windowsBackslashPath === replaced || windowsBackslashPath.startsWith(`${replaced}\\`);
}
//@ chunk-qmzcskz6.js:7491-7578 placement
function toWindowsBackslashPath(path) {
  return path.replace(/\//g, "\\").replace(/^[a-z](?=:)/, (drive) => drive.toUpperCase());
}
//@ chunk-qmzcskz6.js:7578-7653 placement
/**
 * 去掉 Win32 设备前缀（\\?\、\\?\UNC\ 按需转换）。
 */
function stripWin32DevicePrefix(path) {
  return WIN32_DEVICE_UNC_RE.test(path)
    ? `\\\\${path.replace(WIN32_DEVICE_UNC_RE, "")}`
    : path.replace(WIN32_DEVICE_PREFIX_RE, "");
}
//@ chunk-qmzcskz6.js:7653-7762 placement
function uncAdminShareToDrive(path) {
  let stripped = stripWin32DevicePrefix(path);
  let match = WIN32_ADMIN_SHARE_RE.exec(stripped);
  return match !== null && isLocalHost_2(match[1], false)
    ? `${match[2]}:\\${stripped.slice(match[0].length)}`
    : stripped;
}
//@ chunk-qmzcskz6.js:7762-7821 placement
var WIN32_ADMIN_SHARE_RE = /^[\\/]{2,}([^\\/]+)[\\/]+([A-Za-z])\$(?:[\\/]+|$)/;
//@ chunk-qmzcskz6.js:8678-9310 placement (2.1.88 match: extractBaseCommand, 0.679)
/**
 * （旧版名配错）Windows 路径规范化：处理盘符、UNC 前缀、.. 折叠、去掉尾随点空格，用于路径比较。
 */
function normalizeWindowsPathForCompare(path) {
  let path_2 = uncAdminShareToDrive(path);
  let prefix = /^[\\/]+/.exec(path_2)?.[0] ?? "";
  let parts = path_2.slice(prefix.length).split(/[\\/]+/);
  let isDriveOnly = prefix === "" && /^[A-Za-z]:$/.test(parts[0] ?? "");
  let hasDrive = prefix === "" && /^[A-Za-z]:./.test(parts[0] ?? "");
  let parts_2 = [];
  parts.forEach((part, partIndex) => {
    if (partIndex === 0 && isDriveOnly) parts_2.push(part.toLowerCase());
    else if (partIndex === 0 && hasDrive) parts_2.push(part.toLowerCase());
    else if (partIndex === 0 && prefix.length >= 2) parts_2.push(foldWindowsPathComponent(part));
    else if (part === "..") {
      if (parts_2.length > (isDriveOnly || hasDrive ? 1 : prefix.length >= 2 ? 2 : 0)) parts_2.pop();
    } else if (/^[. ]+$/.test(part) && part !== ".") parts_2.push("");
    else if (part !== "." && part !== "")
      parts_2.push(foldName(part.toLowerCase().toUpperCase().toLowerCase()));
  });
  let filtered = parts_2.filter((part) => part !== "");
  return (
    (prefix.length >= 2 ? "\\\\" : prefix.length === 1 ? "\\" : "") +
    filtered.join("\\") +
    (/[\\/]$/.test(path_2) && filtered.length > 0 ? "\\" : "")
  );
}
//@ chunk-qmzcskz6.js:9310-9456 placement
function foldWindowsPathComponent(component) {
  if (/^[?.]$/.test(component)) return component;
  let lower = component.toLowerCase().toUpperCase().toLowerCase();
  return component.includes(":") ? lower.replace(/[. ]+$/, "") : foldName(lower);
}
//@ chunk-qmzcskz6.js:9456-9555 placement (2.1.88 match: setCwdState, 0.867)
function caseFoldKey(cwd) {
  return cwd.normalize("NFC").toLowerCase().toUpperCase().toLowerCase().normalize("NFC");
}
//@ chunk-qmzcskz6.js:9555-9597 placement
/**
 * 规范化后判断两条命令路径是否相同。
 */
function isSameCommandPath(a, b) {
  return isReachableOrSamePath(normalizeCommandForPlatform(a), normalizeCommandForPlatform(b));
}
//@ chunk-qmzcskz6.js:9597-9712 placement
/**
 * 判断两个路径是否相同或互相可达（含 Windows 短名、UNC、WSL 挂载）。
 */
function isReachableOrSamePath(a, b) {
  return (
    isPathUnderForPlatform(a, b) ||
    (getPlatform() === "windows" &&
      (isUncOrShortNamePair(a, b) || (a.startsWith("\\\\") && b.startsWith("\\\\")))) ||
    isOnSameWslMount(a, b)
  );
}
//@ chunk-qmzcskz6.js:9712-9760 placement
function isUncOrShortNamePair(a, b) {
  return [a, b].some(isSpecialUncPath) || differsByUncPrefix(a, b);
}
//@ chunk-qmzcskz6.js:9760-9807 placement
/**
 * 判断两个路径是否只在 UNC 前缀上不同。
 */
function differsByUncPrefix(a, b) {
  return UNC_PREFIX_RE.test(a) !== UNC_PREFIX_RE.test(b);
}
//@ chunk-qmzcskz6.js:9807-9935 placement
/**
 * 判断两个 UNC 路径主机相同、共享名一个是短名（8.3）形式。
 */
function isSameUncHostShortNamePair(a, b) {
  let match = UNC_HOST_AND_SHARE_RE.exec(a);
  let match_2 = UNC_HOST_AND_SHARE_RE.exec(b);
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
function rewriteUncHostFromReference(path, reference) {
  if (!isSameUncHost(path, reference)) return path;
  let host = /^\\\\([^\\]+)(?=\\|$)/.exec(reference)?.[1];
  return host === undefined ? path : path.replace(/^\\\\[^\\]+/, () => `\\\\${host}`);
}
//@ chunk-qmzcskz6.js:10123-10337 placement
function isSameUncHost(a, b) {
  let hostA = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\)/.exec(a)?.[1] ?? "", "@"), ".");
  let hostB = firstLineOf(firstLineOf(/^\\\\([^\\]+)(?=\\|$)/.exec(b)?.[1] ?? "", "@"), ".");
  return (
    hostA !== "" &&
    hostB !== "" &&
    (hostA === hostB ||
      (isShortWindowsPath(hostA) && hostB.startsWith(hostA)) ||
      (isShortWindowsPath(hostB) && hostA.startsWith(hostB)))
  );
}
//@ chunk-qmzcskz6.js:10337-10346 placement
/**
 * Windows 短路径的字符阈值。
 */
var SHORT_WINDOWS_PATH_CHARS = 15;
//@ chunk-qmzcskz6.js:10346-10444 placement
function isShortWindowsPath(name) {
  let ssCount = getPlatform() === "windows" ? (name.match(/ss/g)?.length ?? 0) : 0;
  return name.length >= SHORT_WINDOWS_PATH_CHARS && name.length - ssCount <= SHORT_WINDOWS_PATH_CHARS;
}
//@ chunk-qmzcskz6.js:10444-10482 placement
function isSpecialUncPath(path) {
  return classifyUncPath(path) !== undefined;
}
//@ chunk-qmzcskz6.js:10482-10928 placement
/**
 * 分类 Windows UNC/特殊路径（本机、WSL、短名、设备命名空间、WebDAV 等）。
 */
function classifyUncPath(path) {
  let host = /^\\\\([^\\]+)\\/.exec(path)?.[1];
  let share = host === undefined ? undefined : WSL_UNC_SHARE_RE.exec(host)?.[1];
  if (host !== undefined && isLocalHost_2(share ?? host)) return "own_host";
  if (host !== undefined && WSL_UNC_HOSTS.has(host)) return "wsl_host";
  if (path.split("\\").some(isShortNameComponent)) return "short_name";
  if (WIN32_DEVICE_NAMESPACE_RE.test(path)) return "device_namespace";
  if (DRIVE_RELATIVE_RE.test(path)) return "drive_relative";
  if (host === undefined) return;
  if (share !== undefined) return NUMERIC_HOST_RE.test(share) ? "numeric_host" : "webdav_host";
  if (ODD_UNC_HOST_RE.test(host)) return "odd_host";
  if (NUMERIC_HOST_RE.test(host)) return "numeric_host";
  return;
}
//@ chunk-qmzcskz6.js:10928-11011 placement
var WSL_UNC_SHARE_RE = /^((?=[^@]*[a-z])[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?:@ssl(?:@\d+)?|@\d+)$/i;
//@ chunk-qmzcskz6.js:11011-11113 placement
function isShortNameComponent(component) {
  return /^[\x20-\x7e]*$/.test(component)
    ? isDosShortName(component.replaceAll("ss", "s"))
    : /~\d+(?:\.[^.]*)?$/.test(component);
}
//@ chunk-qmzcskz6.js:11113-11303 placement
var UNC_PREFIX_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DRIVE_RELATIVE_RE;
var WSL_UNC_HOSTS;
var ODD_UNC_HOST_RE;
var NUMERIC_HOST_RE;
deferInit("chunk-qmzcskz6.js:11113", () => {
  UNC_PREFIX_RE = /^\\[^\\]/;
  DRIVE_RELATIVE_RE = /^[a-z]:(?![\\/]|$)/;
  WSL_UNC_HOSTS = new Set(["wsl.localhost", "wsl$"]);
  ODD_UNC_HOST_RE = /[:@]|[^\x21-\x7e]|^\.+$/;
  NUMERIC_HOST_RE = /^(?:(?:0x[0-9a-f]*|\d+)(?:\.(?:0x[0-9a-f]*|\d+)){0,3}|.*\.ipv6-literal\.net)$/i;
});
//@ chunk-qmzcskz6.js:11303-11395 placement
function isInspectableScriptPath(path) {
  return (
    posix.isAbsolute(path) &&
    !HIDDEN_PATH_PATTERN.test(path) &&
    !PRIVATE_DOTDIR_RE.test(path) &&
    !regExp.test(path) &&
    !CONTROL_CHARS_RE.test(path) &&
    isScriptFileName(path)
  );
}
//@ chunk-qmzcskz6.js:11395-11928 placement
async function classifyScriptLocation(path, state, deps) {
  let realPath;
  try {
    realPath = await deps.realpath(path);
  } catch (error) {
    return {
      location: "elsewhere",
      realPath: null,
      missing: isPathAbsent(error),
    };
  }
  if (!isInspectableScriptPath(realPath))
    return {
      location: "elsewhere",
      realPath: null,
      missing: false,
    };
  if (
    posix.isAbsolute(state.configHomeReal) &&
    CLAUDE_TRANSIENT_DIRS.some((dir) =>
      isPathUnderForPlatform(caseFoldKey(realPath), caseFoldKey(posix.join(state.configHomeReal, dir))),
    )
  )
    return {
      location: "elsewhere",
      realPath: null,
      missing: false,
    };
  let match = [
    ["in_checkout", state.launchDirReal],
    ["in_config_home", state.configHomeReal],
  ]
    .filter(([, root]) => posix.isAbsolute(root) && isPathUnderForPlatform(realPath, root))
    .sort(([, rootA], [, rootB]) => rootB.length - rootA.length)[0];
  return {
    location: match ? match[0] : "elsewhere",
    realPath,
  };
}
//@ chunk-qmzcskz6.js:11928-11942 placement
var MAX_SCRIPT_PROBE_BYTES = 262144;
//@ chunk-qmzcskz6.js:11942-12469 placement
async function checkScriptFile(path, fs, maxBytes = MAX_SCRIPT_PROBE_BYTES) {
  let handle;
  try {
    handle = await fs.open(path);
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  }
  try {
    let stats = await handle.stat();
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
    let buffer = Buffer.alloc(maxBytes + 1);
    let total = 0;
    while (total < buffer.length) {
      let { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > maxBytes)
      return {
        ok: false,
        reason: "too_large",
      };
    let buffer_2 = Buffer.from(buffer.subarray(0, total));
    return {
      ok: true,
      sha256: computeContentHash(buffer_2),
      bytes: buffer_2,
    };
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-qmzcskz6.js:12469-13820 placement
/**
 * /usr/bin/env 与各 shell 的单字母选项表，用于解析 shebang 参数。
 */
var ENV_PROGRAM_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SHEBANG_INTERPRETER_RULES;
deferInit("chunk-qmzcskz6.js:12469", () => {
  ENV_PROGRAM_PATHS = new Set(["/usr/bin/env", "/bin/env"]);
  SHEBANG_INTERPRETER_RULES = [
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
});
//@ chunk-qmzcskz6.js:13820-14660 placement
function parseShebangArgs(args, name, { childStartsInReach = true } = {}) {
  let found = SHEBANG_INTERPRETER_RULES.find((rule) => rule.names.test(name.toLowerCase()));
  if (found === undefined) return !childStartsInReach && args.length === 0;
  if (
    childStartsInReach &&
    found.inReachNeeds !== undefined &&
    !found.inReachNeeds.some((inReachNeed) => inReachNeed.every((name) => args.includes(`--${name}`)))
  )
    return false;
  let isFlag = (arg) =>
    arg.startsWith("--")
      ? (found.long?.has(arg.slice(2)) ?? false)
      : /^-[A-Za-z]{1,3}$/.test(arg) &&
        arg
          .slice(1)
          .split("")
          .every((char) => found.letters.includes(char));
  let isTerminalWord = (arg) =>
    (found.ends?.includes(arg) ?? false) ||
    (found.nextWord !== undefined &&
      /^-[A-Za-z]{1,3}$/.test(arg) &&
      found.nextWord.includes(arg.at(-1)) &&
      arg
        .slice(1, -1)
        .split("")
        .every((char) => found.letters.includes(char)));
  let takesValue = (arg) => found.valued !== undefined && new RegExp(`^-[${found.valued}]$`).test(arg);
  if (args.length > 0 && takesValue(args.at(-1))) return false;
  let filtered = args.filter((arg, argIndex) => !(argIndex > 0 && takesValue(args[argIndex - 1])));
  let last = filtered.at(-1);
  let lastOk = last !== undefined && !isFlag(last) && isTerminalWord(last);
  if (found.requiresTerminal && !(lastOk && last !== "--" && last !== "-")) return false;
  return filtered.every(
    (arg, argIndex) =>
      isFlag(arg) || takesValue(arg) || (argIndex === filtered.length - 1 && isTerminalWord(arg)),
  );
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
  let program = parts[0];
  if (program === undefined || program === "") return null;
  if (parts.some((word) => /[^\x21-\x7e]/.test(word))) return "unjudgeable";
  if (!program.startsWith("/") || DOT_DOT_SEGMENT_RE.test(program))
    return {
      kind: "cwd",
    };
  let normalized = posix.normalize(program);
  if (!ENV_PROGRAM_PATHS.has(normalizeCommandForPlatform(normalized))) {
    if (normalizeCommandForPlatform(posix.basename(normalized)) === "env") return "unjudgeable";
    return parseShebangArgs(parts.slice(1), posix.basename(normalized))
      ? {
          kind: "absolute",
          path: normalized,
        }
      : parts.slice(1).some((word) => !word.startsWith("-"))
        ? {
            kind: "cwd",
          }
        : "unjudgeable";
  }
  let words = parts[1] === "-S" ? parts.slice(2) : parts.slice(1);
  let program_2 = words[0];
  if (program_2 === undefined || program_2.startsWith("-") || program_2.includes("=")) return "unjudgeable";
  if (!parseShebangArgs(words.slice(1), posix.basename(program_2)))
    return words.slice(1).some((word) => !word.startsWith("-"))
      ? {
          kind: "cwd",
        }
      : "unjudgeable";
  if (program_2.startsWith("/"))
    return DOT_DOT_SEGMENT_RE.test(program_2) || /[\\$"'#\s]/.test(program_2)
      ? "unjudgeable"
      : {
          kind: "absolute",
          path: posix.normalize(program_2),
        };
  if (program_2.includes("/"))
    return {
      kind: "cwd",
    };
  return /^[\w.+-]+$/.test(program_2)
    ? {
        kind: "env",
        program: program_2,
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
