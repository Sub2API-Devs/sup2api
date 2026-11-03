/**
 * tools/PowerShellTool/commandTelemetry.ts
 *
 * 2.1.316 新增：PowerShell 命令错误分类遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import {
  PIPELINE_PASSTHROUGH_CMDLETS,
  NO_MATCHES_INTERPRETER,
  FILES_DIFFER_INTERPRETER,
  NATIVE_EXE_EXIT_INTERPRETERS,
  EXIT_INTERPRETERS,
  defaultExitInterpreter,
} from "./commandSemantics.js";
import { COMMON_ALIASES } from "../../utils/powershell/parser.js";
import { COMMON_BACKGROUND_COMMANDS } from "../BashTool/BashTool.js";

//@ chunk-e6aww6q8.js:3106355-3106689 placement
/**
 * 解析命令的基础名：去掉调用运算符与引号，取路径最后一段转小写，并剥离 .exe/.cmd/.bat 原生扩展名（记录是否有扩展名）。
 */
function parseCommandBase(e) {
  let replaced = e.trim().replace(/^[&.]\s+/, "");
  let match = /^"([^"]*)"|^'([^']*)'/.exec(replaced);
  let s = match?.[1] ?? match?.[2] ?? (replaced.split(/\s+/)[0] || "").replace(/^["']|["']$/g, "");
  let lower = (s.split(/[\\/]/).pop() || s).toLowerCase();
  let S = ["exe", "cmd", "bat"].find((w) => lower.endsWith("." + w)) ?? null;
  return {
    base: S ? lower.slice(0, -(S.length + 1)) : lower,
    hadNativeExt: S !== null,
    nativeExt: S,
  };
}
//@ chunk-e6aww6q8.js:3106689-3108024 placement
/**
 * 按 PowerShell 语法（引号、注释、; | && & 换行）切分命令，返回最后一个非空段、它是否由 && 门控，以及经过直通 cmdlet 管道时真正产生输出的上游段（feeder）。
 */
function lastCommandSegment(command) {
  let segments = [];
  let r = 0;
  let s = false;
  let h = false;
  let y = true;
  let S = false;
  let w = false;
  for (let idx = 0; idx < command.length; idx++) {
    let ke = command[idx];
    if (S) {
      if (ke === "'") S = false;
      continue;
    }
    if (w) {
      if (ke === "`") idx++;
      else if (ke === '"') w = false;
      continue;
    }
    if (
      ke === "#" &&
      (idx === 0 ||
        command[idx - 1] === " " ||
        command[idx - 1] === "\t" ||
        command[idx - 1] ===
          `
` ||
        command[idx - 1] === "\r")
    ) {
      segments.push({
        text: command.slice(r, idx),
        andGated: s,
        piped: h,
      });
      while (
        idx + 1 < command.length &&
        command[idx + 1] !==
          `
` &&
        command[idx + 1] !== "\r"
      )
        idx++;
      r = idx + 1;
      h = false;
      continue;
    }
    if (ke === "'") {
      S = true;
      continue;
    }
    if (ke === '"') {
      w = true;
      continue;
    }
    if (
      ke === "(" ||
      ke === ")" ||
      ke === "{" ||
      ke === "}" ||
      (ke === ">" && command.slice(idx - 1, idx + 3) !== "2>&1")
    )
      y = false;
    if (
      ke === ";" ||
      ke === "|" ||
      ke ===
        `
` ||
      ke === "\r"
    ) {
      if (ke === "|" && command[idx + 1] === "|") y = false;
      segments.push({
        text: command.slice(r, idx),
        andGated: s,
        piped: h,
      });
      r = idx + 1;
      h = ke === "|";
      if (!h) s = false;
      continue;
    }
    if (ke === "&") {
      if (command[idx + 1] === "&") {
        segments.push({
          text: command.slice(r, idx),
          andGated: s,
          piped: h,
        });
        idx++;
        r = idx + 1;
        s = true;
        h = false;
        y = false;
        continue;
      }
      let we = command[idx - 1];
      if ((we === " " || we === "\t") && command.slice(r, idx).trim() !== "") {
        segments.push({
          text: command.slice(r, idx),
          andGated: s,
          piped: h,
        });
        r = idx + 1;
        s = false;
        h = false;
      }
    }
  }
  segments.push({
    text: command.slice(r),
    andGated: s,
    piped: h,
  });
  let lastIndex = segments.findLastIndex((segment) => segment.text.trim());
  let G = segments[lastIndex];
  if (!G)
    return {
      segment: command,
      andGated: false,
      feeder: undefined,
    };
  let q = lastIndex;
  while (y && q > 0 && segments[q].piped) {
    let Se = /^\s*([\w-]+)(?=\s|$)/.exec(segments[q].text)?.[1]?.toLowerCase() ?? "";
    if (!PIPELINE_PASSTHROUGH_CMDLETS.has(COMMON_ALIASES[Se]?.toLowerCase() ?? Se)) break;
    q--;
  }
  let text = segments[q].text;
  return {
    segment: G.text,
    andGated: G.andGated,
    feeder: q !== lastIndex && text.trim() ? text : undefined,
  };
}
//@ chunk-e6aww6q8.js:3108024-3108353 placement
/**
 * 若命令是 git，返回其子命令（跳过选项，-C/-c 连同参数一起跳过）。
 */
function gitSubcommand(e) {
  let replaced = e.trim().replace(/^[&.]\s+/, "");
  let s = /^"[^"]*"|^'[^']*'/.exec(replaced)?.[0] ?? replaced.split(/\s+/)[0] ?? "";
  if (parseCommandBase(s).base !== "git") return;
  replaced = replaced.slice(s.length);
  let h = ["git", ...replaced.trim().split(/\s+/).filter(Boolean)];
  for (let idx = 1; idx < h.length; idx++) {
    let S = h[idx];
    if (S.startsWith("-")) {
      if (S === "-C" || S === "-c") idx++;
      continue;
    }
    return S;
  }
  return;
}
//@ chunk-e6aww6q8.js:3108353-3108707 placement
/**
 * 命令遥测分类用表：已知的外部/网络命令名（winget、choco、az、robocopy、certutil 等）与 cmdlet 动词列表。
 */
var KNOWN_EXTERNAL_COMMANDS = [
  ...COMMON_BACKGROUND_COMMANDS,
  "Invoke-WebRequest",
  "winget",
  "choco",
  "az",
  "powershell",
  "cmd",
  "reg",
  "sc",
  "net",
  "where",
  "tasklist",
  "taskkill",
  "robocopy",
  "xcopy",
  "icacls",
  "certutil",
  "schtasks",
];
var CMDLET_VERBS = [
  "get",
  "set",
  "new",
  "remove",
  "test",
  "start",
  "stop",
  "restart",
  "invoke",
  "add",
  "copy",
  "move",
  "select",
  "where",
  "foreach",
  "write",
  "out",
  "import",
  "export",
  "convertto",
  "convertfrom",
];
//@ chunk-e6aww6q8.js:3108707-3108892 placement = DIRECTORY_CHANGE_CMDLETS (0.655)
/**
 * PowerShell 命令遥测分类用的三张表：已知外部/网络命令小写→原名、cmdlet 动词→cmdlet_<动词> 标签、只作后备标签的 location/write 类 cmdlet。属于命令分析遥测，不是 parser 本身（旧版名 DIRECTORY_CHANGE_CMDLETS 错配）。
 */
var KNOWN_PS_COMMANDS_BY_LOWER = new Map(KNOWN_EXTERNAL_COMMANDS.map((e) => [e.toLowerCase(), e]));
var CMDLET_VERB_TELEMETRY_LABELS = new Map(CMDLET_VERBS.map((e) => [e, `cmdlet_${e}`]));
var LOW_SIGNAL_CMDLETS = new Set([
  "set-location",
  "push-location",
  "pop-location",
  "write-output",
  "write-host",
]);
//@ chunk-e6aww6q8.js:3108892-3109350 placement
/**
 * 为遥测给 PowerShell 命令归类：先找已知外部/网络命令，其次按 cmdlet 动词映射成 cmdlet_<动词> 标签（location/write 类仅作后备），都不匹配返回 other。
 */
function classifyPowerShellCommand(command) {
  let mapped = command.split(/[\r\n;|&]/).map((h) => {
    let replaced = h.replace(/^\s*\$[\w:.{}]+\s*\+?=\s*/, "");
    if (replaced !== h && /^['"]/.test(replaced.trimStart())) return "";
    let { base, hadNativeExt } = parseCommandBase(replaced);
    if (hadNativeExt) return base;
    return COMMON_ALIASES[base]?.toLowerCase() ?? base;
  });
  for (let h of mapped) {
    let y = KNOWN_PS_COMMANDS_BY_LOWER.get(h);
    if (y) return y;
  }
  let r;
  let s = true;
  for (let h of mapped) {
    if (!h.trim()) continue;
    let y = /^([a-z]+)-\w+$/.exec(h)?.[1];
    let S = y && CMDLET_VERB_TELEMETRY_LABELS.get(y);
    if (S && LOW_SIGNAL_CMDLETS.has(h)) {
      r ??= S;
      continue;
    }
    s = false;
    if (S) return S;
  }
  return (s ? r : undefined) ?? "other";
}
//@ chunk-e6aww6q8.js:3109350-3113826 placement
/**
 * 匹配“不是 cmdlet/命令名”的 PowerShell 错误。
 */
var POWERSHELL_ERROR_CATEGORIES = /token '(&&|\|\||\?\?)' is not a valid|InvalidEndOfLine/i;
var NOT_RECOGNIZED_RE = /is not recognized as (a name of a cmdlet|the name of a cmdlet|an? internal)/i;
var COMMAND_NOT_FOUND_RE = /CommandNotFoundException/;
var PARSER_ERROR_RE =
  /ParserError:|ParseException|TerminatorExpectedAtEndOfString|FullyQualifiedErrorId\s*:\s*(RedirectionNotSupported|MissingFileSpecification|AmpersandNotAllowed|MissingTypename|MissingEndCurlyBrace|MissingEndParenthesis|ExpectedValueExpression|MissingExpression|UnexpectedToken)/;
var INVOKE_EXPRESSION_ERROR_RE = /^(?:\x1b\[[0-9;]*m)*Invoke-Expression: (.*)$/gm;
var POWERFUL_ERROR_KIND_RULES = [
  ["ps5_chain_op", POWERSHELL_ERROR_CATEGORIES],
  [
    "parser_error",
    {
      test: mentionsKnownPath,
    },
  ],
  ["ps_pipeline_error", /Cannot run a document in the middle of a pipeline/],
  ["not_recognized", NOT_RECOGNIZED_RE],
  ["command_not_found", COMMAND_NOT_FOUND_RE],
  [
    "path_not_found",
    /ItemNotFoundException|PathNotFound,Microsoft\.PowerShell|Cannot find path '[^']+' because it does not exist/,
  ],
  [
    "access_denied",
    /UnauthorizedAccessException|PermissionDenied,Microsoft\.PowerShell|Access to the path '[^']+' is denied|(^|: )Access is denied\.\r?$/m,
  ],
  [
    "parameter_binding",
    /ParameterBindingException|ParameterArgumentValidationError|A parameter cannot be found that matches parameter name|Cannot bind (parameter|argument)/,
  ],
  [
    "object_not_found",
    /ObjectNotFound: \(|DriveNotFoundException|A drive with the name '[^']+' does not exist/,
  ],
  ["execution_policy", /running scripts is disabled on this system|PSSecurityException/i],
  ["ps_module_load_fail", /'[^']+' module could not be loaded|Import-Module ?: The specified module/],
  ["method_invocation", /MethodInvocationException|MethodException/],
  ["cannot_convert", /InvalidCastException|ConvertToFinalInvalidCastException/],
  ["null_expression", /InvokeMethodOnNull|NullArray|PropertyNotFoundStrict|NullReferenceException/],
  [
    "variable_undefined",
    /VariableIsUndefined|The variable '\$[^']+' cannot be retrieved because it has not been set/,
  ],
  ["io_exception", /\bIOException\b|FileNotFoundException/],
  ["win_file_error", /The system cannot find the (file|path) specified|The process cannot access the file/],
  [
    "win32_error",
    /^(?:\S+ : )?The (parameter is incorrect|directory is not empty|media is write protected|request is not supported)\.\r?$/m,
  ],
  [
    "win_dll_error",
    /OPENSSL_Uplink|procedure entry point .+ could not be located|is not a valid Win32 application|DLL load failed/,
  ],
  ["win_store_stub", /was not found; run without arguments to install from the Microsoft Store/],
  [
    "win_cmd_error",
    /The syntax of the command is incorrect|CMD does not support UNC paths as current directories/,
  ],
  ["write_error", /WriteErrorException|^(?:\x1b\[[0-9;]*m)*Write-Error: /m],
  ["iwr_basic_parsing", /Internet Explorer engine is not available|WebCmdletIEDomNotSupportedException/i],
  [
    "web_request_error",
    /WebCmdletWebResponseException|The remote server returned an error: \(\d{3}\)|Unable to connect to the remote server|Response status code does not indicate success: \d{3}|No connection could be made because the target machine actively refused/,
  ],
  ["runtime_exception", /: RuntimeException\b|^(?:\x1b\[[0-9;]*m)*RuntimeException: |ScriptHalted/m],
  ["native_npm", /^npm (ERR!|error)/m],
  ["native_tsc", /(?:^|\s)error TS\d{4,5}: /m],
  ["native_dotnet", /: error [A-Z]{2,}\d{4}:|^Build FAILED\.|^(?:\S+ : )?Unhandled exception\. System\.\w/m],
  ["native_python", /^Traceback \(most recent call last\):/m],
  [
    "native_pip",
    /^ERROR: Could not find a version that satisfies the requirement|^ERROR: No matching distribution found for/m,
  ],
  ["native_curl", /^(?:\S+ : )?curl: \(\d+\) /m],
  ["native_cargo", /^error\[E\d{4}\]|^error: could not compile/m],
  ["native_rust_panic", /^thread '.+' panicked at /m],
  ["native_go", /^# [\w./-]+\r?\n.*\.go:\d+:\d+: |^--- FAIL: |^FAIL\t/m],
  ["native_git", /^(?:\S+ : )?(fatal|error): /m],
  [
    "native_node",
    /^(?:Type|Reference|Syntax|Range)Error[: [\]]|^Error: Cannot find module|^node:internal\/|^E[A-Z]{4,10}: .+, (open|read|write|stat|lstat|scandir|readdir|rename|rmdir|unlink|mkdir|copyfile|realpath|access|chmod|symlink) '/m,
  ],
  [
    "native_docker",
    /^docker: Error|^Error response from daemon:|^(?:ERROR: )?failed to (solve|build|fetch|authorize|dial|do request):/m,
  ],
  ["native_pnpm", /ERR_PNPM_[A-Z_]+|^\u2009ELIFECYCLE\u2009/m],
  ["native_yarn", /^error Command failed|^(?:\u27A4 )?YN0000: .*Failed with errors|^(?:\u27A4 )?YN0001: /m],
  ["native_test_fail", /^FAIL |^ {2}[\u2717\u00D7\u2716] |^\s+\u25CF (?!Console\b)|^FAILED .+::/m],
  ["native_eslint", /^\s+\d+:\d+\s+error\s+.+\s{2}[@\w/-]+\r?$/m],
  ["ps_clixml", /#< CLIXML/],
  ["native_error_prefix", /^(?:\S+ : )?(?:\x1b\[[0-9;]*m)*Error: /m],
  ["native_command_error", /NativeCommandError|RemoteException/],
];
//@ chunk-e6aww6q8.js:3113826-3114014 placement
/**
 * 对 PowerShell 错误输出分类：空、匹配已知模式、被杀（143/137）、命令未找到（9009/49）或其他。
 */
function classifyPowerShellError(e, code) {
  if (!e.trim()) return "empty";
  for (let [r, s] of POWERFUL_ERROR_KIND_RULES) if (s.test(e)) return r;
  if (code === 143 || code === 137) return "exit_killed";
  if (code === 9009 || code === 49) return "exit_9009_not_found";
  return "other";
}
//@ chunk-e6aww6q8.js:3114014-3114522 placement
/**
 * 命令遥测分类用的两张表：Bash 内置/常见 Unix 命令名（在 PowerShell 中误用时识别），以及常见开发工具名。
 */
var BASH_BUILTIN_NAMES = new Set([
  "head",
  "tail",
  "which",
  "touch",
  "grep",
  "sed",
  "awk",
  "wc",
  "chmod",
  "chown",
  "ln",
  "cut",
  "tr",
  "uniq",
  "xargs",
  "env",
  "seq",
  "realpath",
  "readlink",
  "basename",
  "dirname",
  "printf",
  "source",
  "export",
  "unset",
  "true",
  "false",
  "yes",
  "stat",
  "find",
  "less",
  "sudo",
]);
var DEV_TOOL_NAMES = new Set([
  "git",
  "gh",
  "node",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "bun",
  "python",
  "python3",
  "pip",
  "pip3",
  "cargo",
  "rustc",
  "go",
  "dotnet",
  "java",
  "javac",
  "mvn",
  "gradle",
  "make",
  "cmake",
  "docker",
  "kubectl",
  "terraform",
  "az",
  "aws",
  "gcloud",
  "curl",
  "wget",
  "jq",
  "code",
]);
//@ chunk-e6aww6q8.js:3114522-3114777 placement
/**
 * 对"命令未识别"错误分类：Bash 内置命令、开发工具或其他。
 */
function classifyNotRecognizedCommand(e) {
  let n = /'([^']+)' is not recognized/i.exec(e) ?? /CommandNotFoundException.*?\[([^\],]+)/.exec(e);
  if (!n) return null;
  let replaced = n[1].toLowerCase().replace(/\.exe$/, "");
  if (BASH_BUILTIN_NAMES.has(replaced)) return "bash_builtin";
  if (DEV_TOOL_NAMES.has(replaced)) return "dev_tool";
  return "other";
}
//@ chunk-e6aww6q8.js:3114777-3115579 placement
var POWERSHELL_PARSE_ERROR_KINDS = [
  ["redirection_reserved", /RedirectionNotSupported|The '<{1,2}' operator is reserved for future use/],
  ["ampersand_reserved", /AmpersandNotAllowed|The ampersand \(&\) character is not allowed/],
  ["missing_type_name", /MissingTypename|Missing type name after '\['/],
  ["ps5_chain_op", POWERSHELL_ERROR_CATEGORIES],
  ["string_missing_terminator", /TerminatorExpectedAtEndOfString|missing the terminator/],
  ["missing_brace_or_paren", /MissingEndCurlyBrace|MissingEndParenthesis|Missing closing '[)}]'/],
  [
    "missing_expression",
    /ExpectedValueExpression|MissingExpression|You must provide a value expression|Missing expression after/,
  ],
  ["redirection_reserved", /MissingFileSpecification|Missing file specification after redirection operator/],
  ["unexpected_token", /UnexpectedToken|Unexpected token '[^']{0,40}' in expression or statement/],
];
//@ chunk-e6aww6q8.js:3115579-3115648 placement
/**
 * 按错误文本判断属于哪种 PowerShell 解析错误。
 */
function classifyPowerShellParseErrorKind(e) {
  for (let [n, r] of POWERSHELL_PARSE_ERROR_KINDS) if (r.test(e)) return n;
  return null;
}
//@ chunk-e6aww6q8.js:3115648-3116007 placement
/**
 * 识别 PowerShell 命令中误用的 Bash 语法：heredoc、[ ] 测试、结尾 & 后台、&&/|| 链、< 输入重定向；都没有返回 none。
 */
function detectBashSyntax(command) {
  if (/<<-?\s*('[A-Za-z_]\w*'|"[A-Za-z_]\w*"|[A-Za-z_]\w*)\s*([|>]|$)/m.test(command)) return "heredoc";
  if (/(?:^|[;\n]|&&|\|\|)\s*(?:(?:if|while|until|elif)\s+)?\[{1,2}\s/.test(command))
    return "bash_test_bracket";
  if (/(^|[^&])&\s*$/m.test(command)) return "background_amp";
  if (/&&|\|\|/.test(command)) return "and_or_chain";
  if (/\s<\s/.test(command)) return "input_redirect";
  return "none";
}
//@ chunk-e6aww6q8.js:3116007-3116289 placement
/**
 * 按命令语义解释 PowerShell 退出码：取最后一段（或管道上游）命令的基名，git grep/diff 与已知命令用专门解释器，否则用默认解释器。
 */
function interpretCommandResult(command, n, r, s) {
  let h = lastCommandSegment(command);
  let y = r.trim() !== "" || s.trim() !== "";
  let S = (y ? undefined : h.feeder) ?? h.segment;
  let { base, nativeExt } = parseCommandBase(S);
  if (base === "git") {
    let q = gitSubcommand(S);
    if (q === "grep") return NO_MATCHES_INTERPRETER(n, r, s);
    if (q === "diff") return FILES_DIFFER_INTERPRETER(n, r, s);
  }
  return (
    (nativeExt === "exe" && y ? NATIVE_EXE_EXIT_INTERPRETERS.get(base) : undefined) ??
    EXIT_INTERPRETERS.get(base) ??
    defaultExitInterpreter
  )(n, r, s);
}
//@ chunk-e6aww6q8.js:3116289-3116462 placement
/**
 * 在 interpretCommandResult 基础上：非零退出且命令由 && 门控、输出含解析/未找到错误或 FINDSTR 报错时，退回默认（视为错误）解释。
 */
function interpretPowerShellResult(command, exitCode, r, s) {
  let h = interpretCommandResult(command, exitCode, r, s);
  if (exitCode === 0 || h.isError) return h;
  let y = `${r}
${s}`;
  return lastCommandSegment(command).andGated ||
    NOT_RECOGNIZED_RE.test(y) ||
    COMMAND_NOT_FOUND_RE.test(y) ||
    /^FINDSTR: /m.test(y)
    ? defaultExitInterpreter(exitCode, r, s)
    : h;
}
//@ chunk-e6aww6q8.js:3116462-3116579 placement
function mentionsKnownPath(e) {
  if (PARSER_ERROR_RE.test(e)) return true;
  for (let [, n] of e.matchAll(INVOKE_EXPRESSION_ERROR_RE))
    if (n !== undefined && classifyPowerShellParseErrorKind(n) !== null) return true;
  return false;
}
export {
  interpretCommandResult,
  classifyPowerShellError,
  classifyPowerShellCommand,
  classifyNotRecognizedCommand,
  classifyPowerShellParseErrorKind,
  detectBashSyntax,
  interpretPowerShellResult,
};
