/**
 * tools/PowerShellTool/powershellSecurity.ts
 *
 * PowerShell AST 安全检查器集合（Invoke-Expression、编码命令、下载执行、Add-Type、COM、脚本块、子表达式、splatting、计划任务、WMI 等 24 项）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/powershellSecurity.ts
 * pieces: chunk-v0yfsee9.js (38)
 * attribution: fingerprint 33, callgraph-witnessed 1, layout 2, file-local 2
 */
import {
  commandHasArgAbbreviation,
  hasCommandNamed,
  getAllCommands,
  COMMON_ALIASES,
  deriveSecurityFlags,
  getVariablesByScope,
} from "../../utils/powershell/parser.js";
import {
  skipLeadingWhitespaceAndComments,
  unescapePsDoubleQuoted,
  stripPsParameterPrefix,
} from "./powershellParsing.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isClmAllowedType } from "./clmTypes.js";
import {
  FILEPATH_EXECUTION_CMDLETS,
  DANGEROUS_SCRIPT_BLOCK_CMDLETS,
  MODULE_LOADING_CMDLETS,
} from "../../utils/powershell/dangerousCmdlets.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v0yfsee9.js:61629-61695 fingerprint (2.1.88 match: POWERSHELL_EXECUTABLES, 1)
/**
 * PowerShell 可执行文件名集合（pwsh/powershell 及 .exe）。
 */
var POWERSHELL_EXECUTABLES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:61629", () => {
  POWERSHELL_EXECUTABLES = new Set(["pwsh", "pwsh.exe", "powershell", "powershell.exe"]);
});
//@ chunk-v0yfsee9.js:61695-61854 callgraph-witnessed (2.1.88 match: isPowerShellExecutable, 1)
/**
 * 名字（可带路径）是否是 pwsh/powershell 可执行文件。
 */
function isPowerShellExecutable(name) {
  let lower = name.toLowerCase();
  if (POWERSHELL_EXECUTABLES.has(lower)) return true;
  let lastSep = Math.max(lower.lastIndexOf("/"), lower.lastIndexOf("\\"));
  if (lastSep >= 0) return POWERSHELL_EXECUTABLES.has(lower.slice(lastSep + 1));
  return false;
}
//@ chunk-v0yfsee9.js:61854-61903 layout
var PS_PARAM_PREFIX_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:61854", () => {
  PS_PARAM_PREFIX_CHARS = new Set(["/", "\u2013", "\u2014", "\u2015"]);
});
//@ chunk-v0yfsee9.js:61903-62040 file-local
/**
 * pwsh.exe 参数是否包含某参数的缩写（也接受 / 和各种破折号作前缀）。
 */
function psExeHasParamAbbreviation(cmd, fullParam, minPrefix) {
  if (commandHasArgAbbreviation(cmd, fullParam, minPrefix)) return true;
  let normalized = {
    ...cmd,
    args: cmd.args.map((arg) =>
      arg.length > 0 && PS_PARAM_PREFIX_CHARS.has(arg[0]) ? "-" + arg.slice(1) : arg,
    ),
  };
  return commandHasArgAbbreviation(normalized, fullParam, minPrefix);
}
//@ chunk-v0yfsee9.js:62040-62213 fingerprint (2.1.88 match: checkInvokeExpression, 1)
/**
 * 使用 Invoke-Expression 时要求确认。
 */
function checkInvokeExpression(parsed) {
  if (hasCommandNamed(parsed, "Invoke-Expression"))
    return {
      behavior: "ask",
      message: "Command uses Invoke-Expression which can execute arbitrary code",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:62213-62489 fingerprint (2.1.88 match: checkDynamicCommandName, 1)
/**
 * 命令名是动态表达式（无法静态确定）时要求确认。
 */
function checkDynamicCommandName(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    if (cmd.elementType !== "CommandAst") continue;
    let nameElementType = cmd.elementTypes?.[0];
    if (nameElementType !== undefined && nameElementType !== "StringConstant")
      return {
        behavior: "ask",
        message: "Command name is a dynamic expression which cannot be statically validated",
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:62489-62687 fingerprint (2.1.88 match: checkEncodedCommand, 1)
/**
 * pwsh -EncodedCommand 等编码参数要求确认。
 */
function checkEncodedCommand(parsed) {
  for (let cmd of getAllCommands(parsed))
    if (isPowerShellExecutable(cmd.name)) {
      if (psExeHasParamAbbreviation(cmd, "-encodedcommand", "-e"))
        return {
          behavior: "ask",
          message: "Command uses encoded parameters which obscure intent",
        };
    }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:62687-62868 fingerprint (2.1.88 match: checkPwshCommandOrFile, 1)
/**
 * 嵌套启动 pwsh/powershell（-Command/-File）要求确认。
 */
function checkPwshCommandOrFile(parsed) {
  for (let cmd of getAllCommands(parsed))
    if (isPowerShellExecutable(cmd.name))
      return {
        behavior: "ask",
        message: "Command spawns a nested PowerShell process which cannot be validated",
      };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:62868-62972 fingerprint (2.1.88 match: DOWNLOADER_NAMES, 1)
var DOWNLOADER_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:62868", () => {
  DOWNLOADER_NAMES = new Set([
    "invoke-webrequest",
    "iwr",
    "invoke-restmethod",
    "irm",
    "new-object",
    "start-bitstransfer",
  ]);
});
//@ chunk-v0yfsee9.js:62972-63018 file-local
function isDownloader(name) {
  return DOWNLOADER_NAMES.has(name.toLowerCase());
}
//@ chunk-v0yfsee9.js:63018-63097 fingerprint (2.1.88 match: isIex, 1)
function isIex(name) {
  let lower = name.toLowerCase();
  return lower === "invoke-expression" || lower === "iex";
}
//@ chunk-v0yfsee9.js:63097-63490 fingerprint (2.1.88 match: checkDownloadCradles, 1)
/**
 * 下载并执行（Invoke-WebRequest/irm/iwr/curl/wget 管道到 iex）要求确认；us 为下载器名单。
 */
function checkDownloadCradles(parsed) {
  for (let statement of parsed.statements) {
    let cmds = statement.commands;
    if (cmds.length < 2) continue;
    let hasDownloader = cmds.some((cmd) => isDownloader(cmd.name));
    let hasIex = cmds.some((cmd) => isIex(cmd.name));
    if (hasDownloader && hasIex)
      return {
        behavior: "ask",
        message: "Command downloads and executes remote code",
      };
  }
  let all = getAllCommands(parsed);
  if (all.some((cmd) => isDownloader(cmd.name)) && all.some((cmd) => isIex(cmd.name)))
    return {
      behavior: "ask",
      message: "Command downloads and executes remote code",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:63490-64056 fingerprint (2.1.88 match: checkDownloadUtilities, 1)
/**
 * BITS 传输（Start-BitsTransfer）与 certutil -urlcache 下载要求确认。
 */
function checkDownloadUtilities(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (lower === "start-bitstransfer")
      return {
        behavior: "ask",
        message: "Command downloads files via BITS transfer",
      };
    if (lower === "certutil" || lower === "certutil.exe") {
      if (
        cmd.args.some((arg) => {
          let la = arg.toLowerCase();
          return la === "-urlcache" || la === "/urlcache";
        })
      )
        return {
          behavior: "ask",
          message: "Command uses certutil to download from a URL",
        };
    }
    if (lower === "bitsadmin" || lower === "bitsadmin.exe") {
      if (cmd.args.some((arg) => arg.toLowerCase() === "/transfer"))
        return {
          behavior: "ask",
          message: "Command downloads files via BITS transfer",
        };
    }
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:64056-64193 fingerprint (2.1.88 match: checkAddType, 1)
/**
 * Add-Type 编译加载 .NET 代码要求确认。
 */
function checkAddType(parsed) {
  if (hasCommandNamed(parsed, "Add-Type"))
    return {
      behavior: "ask",
      message: "Command compiles and loads .NET code",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:64193-64223 layout
var TENGU_PRANCY_LANTERN = "tengu_prancy_lantern";
//@ chunk-v0yfsee9.js:64223-65464 fingerprint (2.1.88 match: checkComObject, 0.9)
/**
 * New-Object -ComObject 或类型不在 CLM 白名单内要求确认；开关 tengu_prancy_lantern 下冒号后为空的参数也要求确认。
 */
function checkComObject(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    if (cmd.name.toLowerCase() !== "new-object") continue;
    if (psExeHasParamAbbreviation(cmd, "-comobject", "-com"))
      return {
        behavior: "ask",
        message: "Command instantiates a COM object which may have execution capabilities",
      };
    let typeName;
    for (let i = 0; i < cmd.args.length; i++) {
      let arg = cmd.args[i];
      let lower = arg.toLowerCase();
      if (lower.startsWith("-t") && lower.includes(":")) {
        let colonIdx = arg.indexOf(":");
        let paramPart = lower.slice(0, colonIdx);
        if ("-typename".startsWith(paramPart)) {
          typeName = arg.slice(colonIdx + 1);
          break;
        }
      }
      if (lower.startsWith("-t") && "-typename".startsWith(lower) && cmd.args[i + 1] !== undefined) {
        typeName = cmd.args[i + 1];
        break;
      }
    }
    if (typeName === undefined) {
      let VALUE_PARAMS = new Set(["-argumentlist", "-comobject", "-property"]);
      let SWITCH_PARAMS = new Set(["-strict"]);
      for (let i = 0; i < cmd.args.length; i++) {
        let arg = cmd.args[i];
        if (arg.startsWith("-")) {
          let lower = arg.toLowerCase();
          if (lower.startsWith("-t") && "-typename".startsWith(lower)) {
            i++;
            continue;
          }
          let index = arg.indexOf(":");
          if (index !== -1) {
            if (
              skipLeadingWhitespaceAndComments(arg.slice(index + 1)) === "" &&
              readFlagWithOverride(TENGU_PRANCY_LANTERN, {
                safe: true,
              })
            )
              return {
                behavior: "ask",
                message: `New-Object argument '${arg}' has nothing after its colon, so Claude Code cannot tell which .NET type this command would create`,
              };
            continue;
          }
          if (SWITCH_PARAMS.has(lower)) continue;
          if (VALUE_PARAMS.has(lower)) {
            i++;
            continue;
          }
          continue;
        }
        typeName = arg;
        break;
      }
    }
    if (typeName !== undefined && !isClmAllowedType(typeName))
      return {
        behavior: "ask",
        message: `New-Object instantiates .NET type '${typeName}' outside the ConstrainedLanguage allowlist`,
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:65464-65990 fingerprint (2.1.88 match: checkDangerousFilePathExecution, 1)
/**
 * 带 -FilePath（或位置字符串参数绑定到 -FilePath）执行脚本文件的 cmdlet 要求确认。
 */
function checkDangerousFilePathExecution(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    let resolved = COMMON_ALIASES[lower]?.toLowerCase() ?? lower;
    if (!FILEPATH_EXECUTION_CMDLETS.has(resolved)) continue;
    if (
      psExeHasParamAbbreviation(cmd, "-filepath", "-f") ||
      psExeHasParamAbbreviation(cmd, "-literalpath", "-l")
    )
      return {
        behavior: "ask",
        message: `${cmd.name} -FilePath executes an arbitrary script file`,
      };
    for (let i = 0; i < cmd.args.length; i++) {
      let argType = cmd.elementTypes?.[i + 1];
      let arg = cmd.args[i];
      if (argType === "StringConstant" && arg && !arg.startsWith("-"))
        return {
          behavior: "ask",
          message: `${cmd.name} with positional string argument binds to -FilePath and executes a script file`,
        };
    }
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:65990-66536 fingerprint (2.1.88 match: checkForEachMemberName, 1)
/**
 * ForEach-Object -MemberName 按名字调用方法要求确认。
 */
function checkForEachMemberName(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if ((COMMON_ALIASES[lower]?.toLowerCase() ?? lower) !== "foreach-object") continue;
    if (psExeHasParamAbbreviation(cmd, "-membername", "-m"))
      return {
        behavior: "ask",
        message: "ForEach-Object -MemberName invokes methods by string name which cannot be validated",
      };
    for (let i = 0; i < cmd.args.length; i++) {
      let argType = cmd.elementTypes?.[i + 1];
      let arg = cmd.args[i];
      if (argType === "StringConstant" && arg && !arg.startsWith("-"))
        return {
          behavior: "ask",
          message:
            "ForEach-Object with positional string argument binds to -MemberName and invokes methods by name",
        };
    }
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:66536-67546 fingerprint (2.1.88 match: checkStartProcess, 1)
/**
 * Start-Process 请求提权（-Verb RunAs）或启动嵌套 PowerShell 要求确认。
 */
function checkStartProcess(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (lower !== "start-process" && lower !== "saps" && lower !== "start") continue;
    if (
      psExeHasParamAbbreviation(cmd, "-Verb", "-v") &&
      cmd.args.some((arg) => arg.toLowerCase() === "runas")
    )
      return {
        behavior: "ask",
        message: "Command requests elevated privileges",
      };
    if (cmd.children)
      for (let i = 0; i < cmd.args.length; i++) {
        let argClean = unescapePsDoubleQuoted(cmd.args[i].replace(/`[\r\n]+\s*/g, ""));
        if (!/^[-\u2013\u2014\u2015/]v[a-z]*:/i.test(argClean)) continue;
        let kids = cmd.children[i];
        if (!kids) continue;
        for (let child of kids)
          if (
            unescapePsDoubleQuoted(child.text)
              .replace(/['"\u2018-\u201F\s]/g, "")
              .toLowerCase() === "runas"
          )
            return {
              behavior: "ask",
              message: "Command requests elevated privileges",
            };
      }
    if (
      cmd.args.some((arg) => {
        let clean = unescapePsDoubleQuoted(arg.replace(/`[\r\n]+\s*/g, ""));
        return /^[-\u2013\u2014\u2015/]v[a-z]*:['"` \u2018-\u201f]*runas['"` \u2018-\u201f]*$/i.test(clean);
      })
    )
      return {
        behavior: "ask",
        message: "Command requests elevated privileges",
      };
    for (let arg of cmd.args) {
      let stripped = stripPsParameterPrefix(arg);
      if (isPowerShellExecutable(stripped))
        return {
          behavior: "ask",
          message: "Start-Process launches a nested PowerShell process which cannot be validated",
        };
    }
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:67546-67683 fingerprint (2.1.88 match: SAFE_SCRIPT_BLOCK_CMDLETS, 1)
var SAFE_SCRIPT_BLOCK_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:67546", () => {
  SAFE_SCRIPT_BLOCK_CMDLETS = new Set([
    "where-object",
    "sort-object",
    "select-object",
    "group-object",
    "format-table",
    "format-list",
    "format-wide",
    "format-custom",
  ]);
});
//@ chunk-v0yfsee9.js:67683-68193 fingerprint (2.1.88 match: checkScriptBlockInjection, 1)
/**
 * 脚本块中含危险 cmdlet（不在 SAFE_SCRIPT_BLOCK_CMDLETS 中，如 Where-Object/ForEach-Object 以外）要求确认。
 */
function checkScriptBlockInjection(parsed) {
  if (!deriveSecurityFlags(parsed).hasScriptBlocks)
    return {
      behavior: "passthrough",
    };
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (DANGEROUS_SCRIPT_BLOCK_CMDLETS.has(lower))
      return {
        behavior: "ask",
        message: "Command contains script block with dangerous cmdlet that may execute arbitrary code",
      };
  }
  if (
    getAllCommands(parsed).every((cmd) => {
      let lower = cmd.name.toLowerCase();
      if (SAFE_SCRIPT_BLOCK_CMDLETS.has(lower)) return true;
      let alias = COMMON_ALIASES[lower];
      if (alias && SAFE_SCRIPT_BLOCK_CMDLETS.has(alias.toLowerCase())) return true;
      return false;
    })
  )
    return {
      behavior: "passthrough",
    };
  return {
    behavior: "ask",
    message: "Command contains script block that may execute arbitrary code",
  };
}
//@ chunk-v0yfsee9.js:68193-68336 fingerprint (2.1.88 match: checkSubExpressions, 1)
/**
 * 含 $() 子表达式要求确认。
 */
function checkSubExpressions(parsed) {
  if (deriveSecurityFlags(parsed).hasSubExpressions)
    return {
      behavior: "ask",
      message: "Command contains subexpressions $()",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:68336-68508 fingerprint (2.1.88 match: checkExpandableStrings, 1)
/**
 * 含嵌入表达式的可展开字符串要求确认。
 */
function checkExpandableStrings(parsed) {
  if (deriveSecurityFlags(parsed).hasExpandableStrings)
    return {
      behavior: "ask",
      message: "Command contains expandable strings with embedded expressions",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:68508-68645 fingerprint (2.1.88 match: checkSplatting, 1)
/**
 * splatting（@var）要求确认。
 */
function checkSplatting(parsed) {
  if (deriveSecurityFlags(parsed).hasSplatting)
    return {
      behavior: "ask",
      message: "Command uses splatting (@variable)",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:68645-68787 fingerprint (2.1.88 match: checkStopParsing, 1)
/**
 * 停止解析标记 --% 要求确认。
 */
function checkStopParsing(parsed) {
  if (deriveSecurityFlags(parsed).hasStopParsing)
    return {
      behavior: "ask",
      message: "Command uses stop-parsing token (--%)",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:68787-68926 fingerprint (2.1.88 match: checkMemberInvocations, 1)
/**
 * 调用 .NET 方法（成员调用）要求确认。
 */
function checkMemberInvocations(parsed) {
  if (deriveSecurityFlags(parsed).hasMemberInvocations)
    return {
      behavior: "ask",
      message: "Command invokes .NET methods",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:68926-69119 fingerprint (2.1.88 match: checkTypeLiterals, 1)
/**
 * 使用不在 CLM 白名单内的 .NET 类型字面量 [Type] 要求确认。
 */
function checkTypeLiterals(parsed) {
  for (let t of parsed.typeLiterals ?? [])
    if (!isClmAllowedType(t))
      return {
        behavior: "ask",
        message: `Command uses .NET type [${t}] outside the ConstrainedLanguage allowlist`,
      };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:69119-69387 fingerprint (2.1.88 match: checkInvokeItem, 1)
/**
 * Invoke-Item（按关联程序打开文件，相当于执行）要求确认。
 */
function checkInvokeItem(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (lower === "invoke-item" || lower === "ii")
      return {
        behavior: "ask",
        message:
          "Invoke-Item opens files with the default handler (ShellExecute). On executable files this runs arbitrary code.",
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:69387-69496 fingerprint (2.1.88 match: SCHEDULED_TASK_CMDLETS, 1)
var SCHEDULED_TASK_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:69387", () => {
  SCHEDULED_TASK_CMDLETS = new Set([
    "register-scheduledtask",
    "new-scheduledtask",
    "new-scheduledtaskaction",
    "set-scheduledtask",
  ]);
});
//@ chunk-v0yfsee9.js:69496-69967 fingerprint (2.1.88 match: checkScheduledTask, 1)
/**
 * 创建/修改计划任务（Register-ScheduledTask 等、schtasks /create|/change）要求确认（持久化手段）。
 */
function checkScheduledTask(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (SCHEDULED_TASK_CMDLETS.has(lower))
      return {
        behavior: "ask",
        message: `${cmd.name} creates or modifies a scheduled task (persistence primitive)`,
      };
    if (lower === "schtasks" || lower === "schtasks.exe") {
      if (
        cmd.args.some((arg) => {
          let la = arg.toLowerCase();
          return la === "/create" || la === "/change" || la === "-create" || la === "-change";
        })
      )
        return {
          behavior: "ask",
          message: "schtasks with create/change modifies scheduled tasks (persistence primitive)",
        };
    }
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:69967-70120 fingerprint (2.1.88 match: ENV_WRITE_CMDLETS, 1)
var ENV_WRITE_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:69967", () => {
  ENV_WRITE_CMDLETS = new Set([
    "set-item",
    "si",
    "new-item",
    "ni",
    "remove-item",
    "ri",
    "del",
    "rm",
    "rd",
    "rmdir",
    "erase",
    "clear-item",
    "cli",
    "set-content",
    "add-content",
    "ac",
  ]);
});
//@ chunk-v0yfsee9.js:70120-70464 fingerprint (2.1.88 match: checkEnvVarManipulation, 1)
/**
 * 修改环境变量（Set-Item env:、[Environment]::SetEnvironmentVariable 等）要求确认。
 */
function checkEnvVarManipulation(parsed) {
  let envVars = getVariablesByScope(parsed, "env");
  if (envVars.length === 0)
    return {
      behavior: "passthrough",
    };
  for (let cmd of getAllCommands(parsed))
    if (ENV_WRITE_CMDLETS.has(cmd.name.toLowerCase()))
      return {
        behavior: "ask",
        message: "Command modifies environment variables",
      };
  if (deriveSecurityFlags(parsed).hasAssignments && envVars.length > 0)
    return {
      behavior: "ask",
      message: "Command modifies environment variables",
    };
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:70464-70706 fingerprint (2.1.88 match: checkModuleLoading, 1)
/**
 * Import-Module / using module 等加载模块要求确认。
 */
function checkModuleLoading(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (MODULE_LOADING_CMDLETS.has(lower))
      return {
        behavior: "ask",
        message:
          "Command loads, installs, or downloads a PowerShell module or script, which can execute arbitrary code",
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:70706-70800 fingerprint (2.1.88 match: RUNTIME_STATE_CMDLETS, 1)
var RUNTIME_STATE_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:70706", () => {
  RUNTIME_STATE_CMDLETS = new Set([
    "set-alias",
    "sal",
    "new-alias",
    "nal",
    "set-variable",
    "sv",
    "new-variable",
    "nv",
  ]);
});
//@ chunk-v0yfsee9.js:70800-71082 fingerprint (2.1.88 match: checkRuntimeStateManipulation, 1)
/**
 * Set-Alias/New-Variable 等改变后续命令解析的操作要求确认。
 */
function checkRuntimeStateManipulation(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let raw = cmd.name.toLowerCase();
    let lower = raw.includes("\\") ? raw.slice(raw.lastIndexOf("\\") + 1) : raw;
    if (RUNTIME_STATE_CMDLETS.has(lower))
      return {
        behavior: "ask",
        message: "Command creates or modifies an alias or variable that can affect future command resolution",
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:71082-71152 fingerprint (2.1.88 match: WMI_SPAWN_CMDLETS, 0.857)
var WMI_SPAWN_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v0yfsee9.js:71082", () => {
  WMI_SPAWN_CMDLETS = new Set(["invoke-wmimethod", "iwmi", "invoke-cimmethod", "icim"]);
});
//@ chunk-v0yfsee9.js:71152-71668 fingerprint (2.1.88 match: checkWmiProcessSpawn, 0.506)
/**
 * Invoke-WmiMethod/Invoke-CimMethod（可 Win32_Process Create 起进程）要求确认。
 */
function checkWmiProcessSpawn(parsed) {
  for (let cmd of getAllCommands(parsed)) {
    let lower = cmd.name.toLowerCase();
    if (WMI_SPAWN_CMDLETS.has(lower))
      return {
        behavior: "ask",
        message: `${cmd.name} can spawn arbitrary processes via WMI/CIM (Win32_Process Create)`,
      };
    let max = Math.max(lower.lastIndexOf("/"), lower.lastIndexOf("\\"));
    let baseName = max >= 0 ? lower.slice(max + 1) : lower;
    if (baseName === "wmic" || baseName === "wmic.exe")
      return {
        behavior: "ask",
        message:
          "wmic can spawn arbitrary processes (process call create), execute scripts (/format, /translate XSL), or write arbitrary files (/output, /append, /record) via WMI",
      };
  }
  return {
    behavior: "passthrough",
  };
}
//@ chunk-v0yfsee9.js:71668-71945 fingerprint (2.1.88 match: powershellCommandIsSafe, 1)
/**
 * PowerShell 安全检查聚合：解析失败要求确认；依次运行 24 个检查器（Invoke-Expression、动态命令名、编码命令、嵌套 pwsh、下载执行、BITS/certutil、Add-Type、COM、-FilePath 执行、Invoke-Item、计划任务、ForEach -MemberName、Start-Process、脚本块、子表达式、可展开字符串、splatting、--%、成员调用、类型字面量、环境变量、模块加载、运行时状态、WMI），首个 ask 即返回。
 */
function powershellCommandIsSafe(_command, parsed) {
  if (!parsed.valid)
    return {
      behavior: "ask",
      message: "Could not parse command for security analysis",
    };
  let validators = [
    checkInvokeExpression,
    checkDynamicCommandName,
    checkEncodedCommand,
    checkPwshCommandOrFile,
    checkDownloadCradles,
    checkDownloadUtilities,
    checkAddType,
    checkComObject,
    checkDangerousFilePathExecution,
    checkInvokeItem,
    checkScheduledTask,
    checkForEachMemberName,
    checkStartProcess,
    checkScriptBlockInjection,
    checkSubExpressions,
    checkExpandableStrings,
    checkSplatting,
    checkStopParsing,
    checkMemberInvocations,
    checkTypeLiterals,
    checkEnvVarManipulation,
    checkModuleLoading,
    checkRuntimeStateManipulation,
    checkWmiProcessSpawn,
  ];
  for (let validator of validators) {
    let result = validator(parsed);
    if (result.behavior === "ask") return result;
  }
  return {
    behavior: "passthrough",
  };
}
export { powershellCommandIsSafe };
