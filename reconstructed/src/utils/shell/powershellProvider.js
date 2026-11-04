/**
 * utils/shell/powershellProvider.ts
 *
 * PowerShell 提供者：追加退出码与 cwd 记录片段、沙箱下用 -EncodedCommand、补齐子进程环境。（本段混入了 sandbox-runtime 的 Windows 常量与按 BOM 判编码的函数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/powershellProvider.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: fingerprint 2, layout 6
 */
import { join } from "path";
import { join as join_39 } from "path/posix";
import { mkdir } from "fs/promises";
import { env } from "../env.js";
import { toUtf16LeBase64 } from "../powershell/parser.js";
import { getPlatform } from "../platform.js";
import { claudeTempDir } from "../tempDir.js";
import { quotePowerShellSingleQuoted } from "../powershell/quoting.js";
import { noPromptEnvDefaults } from "../gitSafeExec.js";
import { withholdsDaemonForceColor } from "../subprocessEnv.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:858490-858642 fingerprint = buildPowerShellArgs (0.503)
function buildPowerShellArgs() {
  let args = ["-NoProfile", "-NonInteractive"];
  if (!env.CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY) args.push("-ExecutionPolicy", "Bypass");
  return args;
}
//@ chunk-e6aww6q8.js:858642-858687 layout
/**
 * 把脚本拼成 `-Command` 形式的 PowerShell 参数列表。
 */
function buildPowerShellCommandArgs(cmd) {
  return [...buildPowerShellArgs(), "-Command", cmd];
}
//@ chunk-e6aww6q8.js:858687-858778 layout
function buildEncodedPowerShellInvocation(exe, text) {
  return {
    binShell: {
      exe,
      args: [...buildPowerShellArgs(), "-EncodedCommand"],
    },
    command: toUtf16LeBase64(text),
  };
}
//@ chunk-e6aww6q8.js:858778-859252 layout
/**
 * PowerShell 命令前缀与脚本块关键字：把输出编码设为 UTF-8、关闭 PSStyle 着色的前置片段，以及 begin/process/end 等脚本块关键字及其匹配正则。
 */
var POWERSHELL_UTF8_PRELUDE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCRIPT_BLOCK_KEYWORDS;
var SCRIPT_BLOCK_START_RE;
var SCRIPT_BLOCK_KEYWORD_RE;
deferInit("chunk-e6aww6q8.js:858778", () => {
  POWERSHELL_UTF8_PRELUDE =
    "try { $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8' } catch {}; if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { try { $OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {}; if ($null -ne $PSStyle) { try { $PSStyle.OutputRendering = 'PlainText' } catch {} } }; ";
  SCRIPT_BLOCK_KEYWORDS = "begin|process|end|clean|dynamicparam";
  SCRIPT_BLOCK_START_RE = new RegExp(`^(${SCRIPT_BLOCK_KEYWORDS})\\s*\\{`, "i");
  SCRIPT_BLOCK_KEYWORD_RE = new RegExp(
    `(?:^|[^-$.\\w])(?:${SCRIPT_BLOCK_KEYWORDS})(?=[\\s\\u0085]*(?:\\{|#|<#|\`))`,
    "i",
  );
});
//@ chunk-e6aww6q8.js:859252-859623 layout
/**
 * 跳过前导空白、分号与注释后，判断 PowerShell 文本是否以只能出现在脚本开头的结构开始（using、param(、begin/process 等块、属性 [..]），这类文本不能直接拼接前缀执行。
 */
function requiresScriptFile(command) {
  let cursor = 0;
  for (;;) {
    while (cursor < command.length && /[\s;]/.test(command[cursor])) cursor++;
    if (command[cursor] === "#") {
      while (
        cursor < command.length &&
        command[cursor] !==
          `
`
      )
        cursor++;
      continue;
    }
    if (command.startsWith("<#", cursor)) {
      let index = command.indexOf("#>", cursor + 2);
      cursor = index === -1 ? command.length : index + 2;
      continue;
    }
    break;
  }
  let sliced = command.slice(cursor);
  return (
    /^using\s+(namespace|module|assembly)\b/i.test(sliced) ||
    /^param\s*\(/i.test(sliced) ||
    SCRIPT_BLOCK_START_RE.test(sliced) ||
    (/^\[\w/.test(sliced) && !/^\[[\w.]+\]::/.test(sliced))
  );
}
//@ chunk-e6aww6q8.js:859623-859666 layout
function requiresPowerShellScriptFile(command) {
  return requiresScriptFile(command) && SCRIPT_BLOCK_KEYWORD_RE.test(command);
}
//@ chunk-e6aww6q8.js:859666-859730 layout
var PS_DEFAULT_CHILD_ENV = {
  PYTHONIOENCODING: "utf-8:surrogateescape",
  NO_COLOR: "1",
};
//@ chunk-e6aww6q8.js:859730-860963 fingerprint = createPowerShellProvider (0.685)
/**
 * 创建 PowerShell 提供者：命令后追加记录 $LASTEXITCODE 与 (Get-Location) 到 claude-pwd-ps-<id> 文件的片段；POSIX 沙箱下改用 -EncodedCommand（UTF-16LE base64）；环境补 PYTHONIOENCODING、NO_COLOR，沙箱时设 TMPDIR。
 */
function createPowerShellProvider(shellPath) {
  let sandboxTmpDir;
  return {
    type: "powershell",
    shellPath,
    detached: false,
    stdin: "ignore",
    async buildExecCommand(command, execOpts) {
      sandboxTmpDir = execOpts.useSandbox ? execOpts.sandboxTmpDir : undefined;
      let cwdFilePath;
      if (execOpts.useSandbox && execOpts.sandboxTmpDir)
        cwdFilePath = (getPlatform() === "windows" ? join : join_39)(
          execOpts.sandboxTmpDir,
          `claude-pwd-ps-${execOpts.id}`,
        );
      else {
        let tempDir = claudeTempDir();
        await mkdir(tempDir, {
          recursive: true,
          mode: 448,
        }).catch(() => {});
        cwdFilePath = join(tempDir, `claude-pwd-ps-${execOpts.id}`);
      }
      let cwdTracking = `
; $_ec = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } elseif ($?) { 0 } else { 1 }
; (Get-Location).Path | Out-File -FilePath ${quotePowerShellSingleQuoted(cwdFilePath, "the temp-directory path (override with CLAUDE_CODE_TMPDIR)")} -Encoding utf8 -NoNewline
; if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { $host.SetShouldExit($_ec) } else { exit $_ec }`;
      let psCommand = (requiresScriptFile(command) ? "" : POWERSHELL_UTF8_PRELUDE) + command + cwdTracking;
      return {
        commandString:
          execOpts.useSandbox && getPlatform() !== "windows"
            ? [
                `'${shellPath.replace(/'/g, "'\\''")}'`,
                ...buildPowerShellArgs(),
                "-EncodedCommand",
                toUtf16LeBase64(psCommand),
              ].join(" ")
            : psCommand,
        cwdFilePath,
      };
    },
    getSpawnArgs(commandString) {
      return buildPowerShellCommandArgs(commandString);
    },
    async getEnvironmentOverrides(commandString, cwdFilePath, envEntries) {
      let env = {
        ...noPromptEnvDefaults(process.env),
      };
      let forceColor =
        (process.env.FORCE_COLOR !== undefined && !withholdsDaemonForceColor()) ||
        envEntries?.has("FORCE_COLOR");
      for (let [key, value] of Object.entries(PS_DEFAULT_CHILD_ENV)) {
        if (process.env[key] !== undefined) continue;
        if (key === "NO_COLOR" && forceColor) continue;
        env[key] = value;
      }
      if (envEntries) for (let [name, value] of envEntries) env[name] = value;
      if (sandboxTmpDir) {
        env.TMPDIR = sandboxTmpDir;
        env.CLAUDE_CODE_TMPDIR = claudeTempDir();
      }
      return env;
    },
  };
}
export {
  buildPowerShellCommandArgs,
  requiresPowerShellScriptFile,
  requiresScriptFile,
  createPowerShellProvider,
  buildEncodedPowerShellInvocation,
  buildPowerShellArgs,
};
