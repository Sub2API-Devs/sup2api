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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { join as join_39, join as join_83 } from "path/posix";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
} from "fs/promises";
import { env } from "../env.js";
import { toUtf16LeBase64 } from "../powershell/parser.js";
import { getPlatform } from "../platform.js";
import { claudeTempDir } from "../tempDir.js";
import { quotePowerShellSingleQuoted } from "../powershell/quoting.js";
import { KOi } from "../gitSafeExec.js";
import { withholdsDaemonForceColor } from "../subprocessEnv.js";

//@ chunk-e6aww6q8.js:858490-858642 fingerprint = buildPowerShellArgs (0.503)
function buildPowerShellArgs() {
  let e = ["-NoProfile", "-NonInteractive"];
  if (!env.CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY) e.push("-ExecutionPolicy", "Bypass");
  return e;
}
//@ chunk-e6aww6q8.js:858642-858687 layout
function H3n(e) {
  return [...buildPowerShellArgs(), "-Command", e];
}
//@ chunk-e6aww6q8.js:858687-858778 layout
function THt(e, n) {
  return {
    binShell: { exe: e, args: [...buildPowerShellArgs(), "-EncodedCommand"] },
    command: toUtf16LeBase64(n),
  };
}
/**
 * PowerShell 命令前缀与脚本块关键字：把输出编码设为 UTF-8、关闭 PSStyle 着色的前置片段，以及 begin/process/end 等脚本块关键字及其匹配正则。
 */
//@ chunk-e6aww6q8.js:858778-859252 layout
var POWERSHELL_UTF8_PRELUDE =
    "try { $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8' } catch {}; if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { try { $OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {}; if ($null -ne $PSStyle) { try { $PSStyle.OutputRendering = 'PlainText' } catch {} } }; ",
  SCRIPT_BLOCK_KEYWORDS = "begin|process|end|clean|dynamicparam",
  SCRIPT_BLOCK_START_RE = new RegExp(`^(${SCRIPT_BLOCK_KEYWORDS})\\s*\\{`, "i"),
  SCRIPT_BLOCK_KEYWORD_RE = new RegExp(
    `(?:^|[^-$.\\w])(?:${SCRIPT_BLOCK_KEYWORDS})(?=[\\s\\u0085]*(?:\\{|#|<#|\`))`,
    "i",
  );
/**
 * 跳过前导空白、分号与注释后，判断 PowerShell 文本是否以只能出现在脚本开头的结构开始（using、param(、begin/process 等块、属性 [..]），这类文本不能直接拼接前缀执行。
 */
//@ chunk-e6aww6q8.js:859252-859623 layout
function requiresScriptFile(e) {
  let n = 0;
  for (;;) {
    while (n < e.length && /[\s;]/.test(e[n])) n++;
    if (e[n] === "#") {
      while (
        n < e.length &&
        e[n] !==
          `
`
      )
        n++;
      continue;
    }
    if (e.startsWith("<#", n)) {
      let index = e.indexOf("#>", n + 2);
      n = index === -1 ? e.length : index + 2;
      continue;
    }
    break;
  }
  let sliced = e.slice(n);
  return (
    /^using\s+(namespace|module|assembly)\b/i.test(sliced) ||
    /^param\s*\(/i.test(sliced) ||
    SCRIPT_BLOCK_START_RE.test(sliced) ||
    (/^\[\w/.test(sliced) && !/^\[[\w.]+\]::/.test(sliced))
  );
}
//@ chunk-e6aww6q8.js:859623-859666 layout
function EHt(e) {
  return requiresScriptFile(e) && SCRIPT_BLOCK_KEYWORD_RE.test(e);
}
//@ chunk-e6aww6q8.js:859666-859730 layout
var PS_DEFAULT_CHILD_ENV = { PYTHONIOENCODING: "utf-8:surrogateescape", NO_COLOR: "1" };
/**
 * 创建 PowerShell 提供者：命令后追加记录 $LASTEXITCODE 与 (Get-Location) 到 claude-pwd-ps-<id> 文件的片段；POSIX 沙箱下改用 -EncodedCommand（UTF-16LE base64）；环境补 PYTHONIOENCODING、NO_COLOR，沙箱时设 TMPDIR。
 */
//@ chunk-e6aww6q8.js:859730-860963 fingerprint = createPowerShellProvider (0.685)
function createPowerShellProvider(shellPath) {
  let sandboxTmpDir;
  return {
    type: "powershell",
    shellPath: shellPath,
    detached: !1,
    stdin: "ignore",
    async buildExecCommand(command, execOpts) {
      sandboxTmpDir = execOpts.useSandbox ? execOpts.sandboxTmpDir : void 0;
      let cwdFilePath;
      if (execOpts.useSandbox && execOpts.sandboxTmpDir)
        cwdFilePath = (getPlatform() === "windows" ? join_38 : join_39)(
          execOpts.sandboxTmpDir,
          `claude-pwd-ps-${execOpts.id}`,
        );
      else {
        let q = claudeTempDir();
        (await mkdir_11(q, { recursive: !0, mode: 448 }).catch(() => {}),
          (cwdFilePath = join_38(q, `claude-pwd-ps-${execOpts.id}`)));
      }
      let cwdTracking = `
; $_ec = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } elseif ($?) { 0 } else { 1 }
; (Get-Location).Path | Out-File -FilePath ${quotePowerShellSingleQuoted(cwdFilePath, "the temp-directory path (override with CLAUDE_CODE_TMPDIR)")} -Encoding utf8 -NoNewline
; if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { $host.SetShouldExit($_ec) } else { exit $_ec }`,
        psCommand = (requiresScriptFile(command) ? "" : POWERSHELL_UTF8_PRELUDE) + command + cwdTracking;
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
        cwdFilePath: cwdFilePath,
      };
    },
    getSpawnArgs(r) {
      return H3n(r);
    },
    async getEnvironmentOverrides(r, s, h) {
      let y = { ...KOi(process.env) },
        S = (process.env.FORCE_COLOR !== void 0 && !withholdsDaemonForceColor()) || h?.has("FORCE_COLOR");
      for (let [w, L] of Object.entries(PS_DEFAULT_CHILD_ENV)) {
        if (process.env[w] !== void 0) continue;
        if (w === "NO_COLOR" && S) continue;
        y[w] = L;
      }
      if (h) for (let [w, L] of h) y[w] = L;
      if (sandboxTmpDir) ((y.TMPDIR = sandboxTmpDir), (y.CLAUDE_CODE_TMPDIR = claudeTempDir()));
      return y;
    },
  };
}

export { H3n, EHt, requiresScriptFile, createPowerShellProvider, THt, buildPowerShellArgs };
