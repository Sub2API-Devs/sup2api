/**
 * tools/PowerShellTool/commandTelemetry.ts
 *
 * 2.1.316 新增：PowerShell 命令错误分类遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (16)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3192875-3193209 placement
/**
 * 解析命令的基础名：去掉调用运算符与引号，取路径最后一段转小写，并剥离 .exe/.cmd/.bat 原生扩展名（记录是否有扩展名）。
 */
function parseCommandBase(command) {
  let replaced = command.trim().replace(/^[&.]\s+/, "");
  let match = /^"([^"]*)"|^'([^']*)'/.exec(replaced);
  let commandToken = match?.[1] ?? match?.[2] ?? (replaced.split(/\s+/)[0] || "").replace(/^["']|["']$/g, "");
  let lower = (commandToken.split(/[\\/]/).pop() || commandToken).toLowerCase();
  let nativeExtension = ["exe", "cmd", "bat"].find((extension) => lower.endsWith("." + extension)) ?? null;
  return {
    base: nativeExtension ? lower.slice(0, -(nativeExtension.length + 1)) : lower,
    hadNativeExt: nativeExtension !== null,
    nativeExt: nativeExtension,
  };
}
//@ chunk-5xgkngpb.js:3193209-3194547 placement
/**
 * 按 PowerShell 语法（引号、注释、; | && & 换行）切分命令，返回最后一个非空段、它是否由 && 门控，以及经过直通 cmdlet 管道时真正产生输出的上游段（feeder）。
 */
function lastCommandSegment(command) {
  let segments = [];
  let segmentStart = 0;
  let andGated = false;
  let piped = false;
  let pipelineSimple = true;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let idx = 0; idx < command.length; idx++) {
    let char = command[idx];
    if (inSingleQuote) {
      if (char === "'") inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      if (char === "`") idx++;
      else if (char === '"') inDoubleQuote = false;
      continue;
    }
    if (
      char === "#" &&
      (idx === 0 ||
        command[idx - 1] === " " ||
        command[idx - 1] === "\t" ||
        command[idx - 1] ===
          `
` ||
        command[idx - 1] === "\r")
    ) {
      segments.push({
        text: command.slice(segmentStart, idx),
        andGated,
        piped,
      });
      while (
        idx + 1 < command.length &&
        command[idx + 1] !==
          `
` &&
        command[idx + 1] !== "\r"
      )
        idx++;
      segmentStart = idx + 1;
      piped = false;
      continue;
    }
    if (char === "'") {
      inSingleQuote = true;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }
    if (
      char === "(" ||
      char === ")" ||
      char === "{" ||
      char === "}" ||
      (char === ">" && command.slice(idx - 1, idx + 3) !== "2>&1")
    )
      pipelineSimple = false;
    if (
      char === ";" ||
      char === "|" ||
      char ===
        `
` ||
      char === "\r"
    ) {
      if (char === "|" && command[idx + 1] === "|") pipelineSimple = false;
      segments.push({
        text: command.slice(segmentStart, idx),
        andGated,
        piped,
      });
      segmentStart = idx + 1;
      piped = char === "|";
      if (!piped) andGated = false;
      continue;
    }
    if (char === "&") {
      if (command[idx + 1] === "&") {
        segments.push({
          text: command.slice(segmentStart, idx),
          andGated,
          piped,
        });
        idx++;
        segmentStart = idx + 1;
        andGated = true;
        piped = false;
        pipelineSimple = false;
        continue;
      }
      let previousChar = command[idx - 1];
      if ((previousChar === " " || previousChar === "\t") && command.slice(segmentStart, idx).trim() !== "") {
        segments.push({
          text: command.slice(segmentStart, idx),
          andGated,
          piped,
        });
        segmentStart = idx + 1;
        andGated = false;
        piped = false;
      }
    }
  }
  segments.push({
    text: command.slice(segmentStart),
    andGated,
    piped,
  });
  let lastIndex = segments.findLastIndex((segment) => segment.text.trim());
  let lastSegment = segments[lastIndex];
  if (!lastSegment)
    return {
      segment: command,
      andGated: false,
      feeder: undefined,
    };
  let feederIndex = lastIndex;
  while (pipelineSimple && feederIndex > 0 && segments[feederIndex].piped) {
    let cmdBandlet = /^\s*([\w-]+)(?=\s|$)/.exec(segments[feederIndex].text)?.[1]?.toLowerCase() ?? "";
    if (!PIPELINE_PASSTHROUGH_CMDLETS.has(COMMON_ALIASES[cmdBandlet]?.toLowerCase() ?? cmdBandlet)) break;
    feederIndex--;
  }
  let text = segments[feederIndex].text;
  return {
    segment: lastSegment.text,
    andGated: lastSegment.andGated,
    feeder: feederIndex !== lastIndex && text.trim() ? text : undefined,
  };
}
//@ chunk-5xgkngpb.js:3194547-3194876 placement
/**
 * 若命令是 git，返回其子命令（跳过选项，-C/-c 连同参数一起跳过）。
 */
function gitSubcommand(command) {
  let replaced = command.trim().replace(/^[&.]\s+/, "");
  let commandToken = /^"[^"]*"|^'[^']*'/.exec(replaced)?.[0] ?? replaced.split(/\s+/)[0] ?? "";
  if (parseCommandBase(commandToken).base !== "git") return;
  replaced = replaced.slice(commandToken.length);
  let tokens = ["git", ...replaced.trim().split(/\s+/).filter(Boolean)];
  for (let idx = 1; idx < tokens.length; idx++) {
    let token = tokens[idx];
    if (token.startsWith("-")) {
      if (token === "-C" || token === "-c") idx++;
      continue;
    }
    return token;
  }
  return;
}
//@ chunk-5xgkngpb.js:3194876-3195230 placement
/**
 * 命令遥测分类用表：已知的外部/网络命令名（winget、choco、az、robocopy、certutil 等）与 cmdlet 动词列表。
 */
var KNOWN_EXTERNAL_COMMANDS; // deferred: uses COMMON_BACKGROUND_COMMANDS (../BashTool/BashTool.js) of its import cycle while loading; runs once the cycle is complete
var CMDLET_VERBS;
deferInit("chunk-5xgkngpb.js:3194876", () => {
  KNOWN_EXTERNAL_COMMANDS = [
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
  CMDLET_VERBS = [
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
});
//@ chunk-5xgkngpb.js:3195230-3195415 placement (2.1.88 match: DIRECTORY_CHANGE_CMDLETS, 0.655)
/**
 * PowerShell 命令遥测分类用的三张表：已知外部/网络命令小写→原名、cmdlet 动词→cmdlet_<动词> 标签、只作后备标签的 location/write 类 cmdlet。属于命令分析遥测，不是 parser 本身（旧版名 DIRECTORY_CHANGE_CMDLETS 错配）。
 */
var KNOWN_PS_COMMANDS_BY_LOWER; // deferred: uses KNOWN_EXTERNAL_COMMANDS of its import cycle while loading; runs once the cycle is complete
var CMDLET_VERB_TELEMETRY_LABELS;
var LOW_SIGNAL_CMDLETS;
deferInit("chunk-5xgkngpb.js:3195230", () => {
  KNOWN_PS_COMMANDS_BY_LOWER = new Map(
    KNOWN_EXTERNAL_COMMANDS.map((commandName) => [commandName.toLowerCase(), commandName]),
  );
  CMDLET_VERB_TELEMETRY_LABELS = new Map(CMDLET_VERBS.map((verb) => [verb, `cmdlet_${verb}`]));
  LOW_SIGNAL_CMDLETS = new Set([
    "set-location",
    "push-location",
    "pop-location",
    "write-output",
    "write-host",
  ]);
});
//@ chunk-5xgkngpb.js:3195415-3195873 placement
/**
 * 为遥测给 PowerShell 命令归类：先找已知外部/网络命令，其次按 cmdlet 动词映射成 cmdlet_<动词> 标签（location/write 类仅作后备），都不匹配返回 other。
 */
function classifyPowerShellCommand(command) {
  let mapped = command.split(/[\r\n;|&]/).map((part) => {
    let command = part.replace(/^\s*\$[\w:.{}]+\s*\+?=\s*/, "");
    if (command !== part && /^['"]/.test(command.trimStart())) return "";
    let { base, hadNativeExt } = parseCommandBase(command);
    if (hadNativeExt) return base;
    return COMMON_ALIASES[base]?.toLowerCase() ?? base;
  });
  for (let commandName of mapped) {
    let knownCommand = KNOWN_PS_COMMANDS_BY_LOWER.get(commandName);
    if (knownCommand) return knownCommand;
  }
  let lowSignalLabel;
  let onlyLowSignal = true;
  for (let commandName of mapped) {
    if (!commandName.trim()) continue;
    let verb = /^([a-z]+)-\w+$/.exec(commandName)?.[1];
    let verbLabel = verb && CMDLET_VERB_TELEMETRY_LABELS.get(verb);
    if (verbLabel && LOW_SIGNAL_CMDLETS.has(commandName)) {
      lowSignalLabel ??= verbLabel;
      continue;
    }
    onlyLowSignal = false;
    if (verbLabel) return verbLabel;
  }
  return (onlyLowSignal ? lowSignalLabel : undefined) ?? "other";
}
//@ chunk-5xgkngpb.js:3195873-3200349 placement
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
//@ chunk-5xgkngpb.js:3200349-3200537 placement
/**
 * 对 PowerShell 错误输出分类：空、匹配已知模式、被杀（143/137）、命令未找到（9009/49）或其他。
 */
function classifyPowerShellError(output, code) {
  if (!output.trim()) return "empty";
  for (let [kind, pattern] of POWERFUL_ERROR_KIND_RULES) if (pattern.test(output)) return kind;
  if (code === 143 || code === 137) return "exit_killed";
  if (code === 9009 || code === 49) return "exit_9009_not_found";
  return "other";
}
//@ chunk-5xgkngpb.js:3200537-3201045 placement
/**
 * 命令遥测分类用的两张表：Bash 内置/常见 Unix 命令名（在 PowerShell 中误用时识别），以及常见开发工具名。
 */
var BASH_BUILTIN_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEV_TOOL_NAMES;
deferInit("chunk-5xgkngpb.js:3200537", () => {
  BASH_BUILTIN_NAMES = new Set([
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
  DEV_TOOL_NAMES = new Set([
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
});
//@ chunk-5xgkngpb.js:3201045-3201300 placement
/**
 * 对"命令未识别"错误分类：Bash 内置命令、开发工具或其他。
 */
function classifyNotRecognizedCommand(output) {
  let match =
    /'([^']+)' is not recognized/i.exec(output) ?? /CommandNotFoundException.*?\[([^\],]+)/.exec(output);
  if (!match) return null;
  let replaced = match[1].toLowerCase().replace(/\.exe$/, "");
  if (BASH_BUILTIN_NAMES.has(replaced)) return "bash_builtin";
  if (DEV_TOOL_NAMES.has(replaced)) return "dev_tool";
  return "other";
}
//@ chunk-5xgkngpb.js:3201300-3202102 placement
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
//@ chunk-5xgkngpb.js:3202102-3202171 placement
/**
 * 按错误文本判断属于哪种 PowerShell 解析错误。
 */
function classifyPowerShellParseErrorKind(output) {
  for (let [kind, pattern] of POWERSHELL_PARSE_ERROR_KINDS) if (pattern.test(output)) return kind;
  return null;
}
//@ chunk-5xgkngpb.js:3202171-3202530 placement
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
//@ chunk-5xgkngpb.js:3202530-3202812 placement
/**
 * 按命令语义解释 PowerShell 退出码：取最后一段（或管道上游）命令的基名，git grep/diff 与已知命令用专门解释器，否则用默认解释器。
 */
function interpretCommandResult(command, exitCode, stdout, stderr) {
  let lastSegment = lastCommandSegment(command);
  let hasOutput = stdout.trim() !== "" || stderr.trim() !== "";
  let interpretedCommand = (hasOutput ? undefined : lastSegment.feeder) ?? lastSegment.segment;
  let { base, nativeExt } = parseCommandBase(interpretedCommand);
  if (base === "git") {
    let subcommand = gitSubcommand(interpretedCommand);
    if (subcommand === "grep") return NO_MATCHES_INTERPRETER(exitCode, stdout, stderr);
    if (subcommand === "diff") return FILES_DIFFER_INTERPRETER(exitCode, stdout, stderr);
  }
  return (
    (nativeExt === "exe" && hasOutput ? NATIVE_EXE_EXIT_INTERPRETERS.get(base) : undefined) ??
    EXIT_INTERPRETERS.get(base) ??
    defaultExitInterpreter
  )(exitCode, stdout, stderr);
}
//@ chunk-5xgkngpb.js:3202812-3202985 placement
/**
 * 在 interpretCommandResult 基础上：非零退出且命令由 && 门控、输出含解析/未找到错误或 FINDSTR 报错时，退回默认（视为错误）解释。
 */
function interpretPowerShellResult(command, exitCode, stdout, stderr) {
  let result = interpretCommandResult(command, exitCode, stdout, stderr);
  if (exitCode === 0 || result.isError) return result;
  let combinedOutput = `${stdout}
${stderr}`;
  return lastCommandSegment(command).andGated ||
    NOT_RECOGNIZED_RE.test(combinedOutput) ||
    COMMAND_NOT_FOUND_RE.test(combinedOutput) ||
    /^FINDSTR: /m.test(combinedOutput)
    ? defaultExitInterpreter(exitCode, stdout, stderr)
    : result;
}
//@ chunk-5xgkngpb.js:3202985-3203102 placement
function mentionsKnownPath(text) {
  if (PARSER_ERROR_RE.test(text)) return true;
  for (let [, innerMessage] of text.matchAll(INVOKE_EXPRESSION_ERROR_RE))
    if (innerMessage !== undefined && classifyPowerShellParseErrorKind(innerMessage) !== null) return true;
  return false;
}
export {
  interpretPowerShellResult,
  interpretCommandResult,
  classifyPowerShellError,
  classifyPowerShellCommand,
  classifyNotRecognizedCommand,
  classifyPowerShellParseErrorKind,
  detectBashSyntax,
};
