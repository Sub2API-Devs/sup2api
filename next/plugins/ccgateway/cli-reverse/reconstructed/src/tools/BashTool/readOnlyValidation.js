/**
 * tools/BashTool/readOnlyValidation.ts
 *
 * Bash 只读判定：只读命令白名单 COMMAND_ALLOWLIST（选项级）、只读正则、git 内部路径写入检测、checkReadOnlyConstraints
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/readOnlyValidation.ts
 * pieces: chunk-5xgkngpb.js (24)
 * attribution: fingerprint 12, layout 6, affinity 1, file-local 1, placement 3, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AsyncLocalStorage } from "async_hooks";
import { posix } from "path";
import {
  GIT_READ_ONLY_COMMANDS,
  hasTildeArg,
  isFlagToken,
  RIPGREP_READ_ONLY_COMMANDS,
  DOCKER_READ_ONLY_COMMANDS,
  GH_READ_ONLY_COMMANDS,
  hasTildeExpansion,
  validateFlags,
  DOCKER_BARE_READ_ONLY_COMMANDS,
  hasDockerDangerousFlag,
  containsVulnerableUncPath,
  isTildeUserPath,
} from "../../utils/shell/readOnlyCommandValidation.js";
import { sedCommandIsAllowedByAllowlist } from "./sedValidation.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  containsAnyPlaceholder,
  TEST_ARITH_CMP_OPS,
  TEST_ARITH_NUMERIC_RE,
  isAmbiguousFindWord,
  findWordTakesFlagValue,
  findWordTakesOperand,
  hasSourceUnquotedGlob,
  STRUCTURAL_TYPES_2,
  parseForSecurityFromAst,
  hasSubshellNode,
  stripCommandPrefixes,
} from "../../utils/bash/ast.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { getPlatform } from "../../utils/platform.js";
import {
  getCommandArgv,
  classifyDangerousExpansion,
  splitCommand,
  extractOutputRedirections,
  SPLIT_MAX_LEN,
} from "../../utils/bash/commands.js";
import { isRmModifierAllowed } from "../../utils/bash/bashReadingFlags.js";
import { stripCommandBuiltinPrefixes } from "./bashSecurity.js";
import {
  isSourceGlobRecordingEnabled,
  lazySessionEnvVarNames,
  hasRiskyBareAssignment,
  isNormalizedGitCommand,
  isNormalizedCdCommand,
  isSafeEnvAssignment,
} from "./bashPermissions.js";
import {
  stripWrappersFromArgvForPaths,
  normalizeCommandName,
  COMMAND_OPERATION_TYPE,
  PATH_EXTRACTORS,
  INPUT_REDIRECT_OPS,
} from "./pathValidation.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { isCurrentDirectoryBareGitRepo } from "../../utils/git.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { getCwd } from "../../utils/cwd.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1123121-1126020 fingerprint (2.1.88 match: FD_SAFE_FLAGS, 0.67)
/**
 * fd 与 grep 的安全选项表（选项 → none/number/string 值类型），以及开关名 tengu_tender_thunder 与 refused 读法用的 AsyncLocalStorage。
 */
var FD_SAFE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GREP_SAFE_FLAGS;
var TENGU_TENDER_THUNDER;
var FD_UNSAFE_FLAG_RE;
var refusedReadingStore;
deferInit("chunk-5xgkngpb.js:1123121", () => {
  FD_SAFE_FLAGS = {
    "-h": "none",
    "--help": "none",
    "-V": "none",
    "--version": "none",
    "-H": "none",
    "--hidden": "none",
    "-I": "none",
    "--no-ignore": "none",
    "--no-ignore-vcs": "none",
    "--no-ignore-parent": "none",
    "-s": "none",
    "--case-sensitive": "none",
    "-i": "none",
    "--ignore-case": "none",
    "-g": "none",
    "--glob": "none",
    "--regex": "none",
    "-F": "none",
    "--fixed-strings": "none",
    "-a": "none",
    "--absolute-path": "none",
    "-L": "none",
    "--follow": "none",
    "-p": "none",
    "--full-path": "none",
    "-0": "none",
    "--print0": "none",
    "-d": "number",
    "--max-depth": "number",
    "--min-depth": "number",
    "--exact-depth": "number",
    "-t": "string",
    "--type": "string",
    "-e": "string",
    "--extension": "string",
    "-S": "string",
    "--size": "string",
    "--changed-within": "string",
    "--changed-before": "string",
    "-o": "string",
    "--owner": "string",
    "-E": "string",
    "--exclude": "string",
    "--ignore-file": "string",
    "-c": "string",
    "--color": "string",
    "-j": "number",
    "--threads": "number",
    "--max-buffer-time": "string",
    "--max-results": "number",
    "-1": "none",
    "-q": "none",
    "--quiet": "none",
    "--show-errors": "none",
    "--strip-cwd-prefix": "none",
    "--one-file-system": "none",
    "--prune": "none",
    "--search-path": "string",
    "--base-directory": "string",
    "--path-separator": "string",
    "--batch-size": "number",
    "--no-require-git": "none",
    "--hyperlink": "string",
    "--and": "string",
    "--format": "string",
  };
  GREP_SAFE_FLAGS = {
    "-e": "string",
    "--regexp": "string",
    "-f": "string",
    "--file": "string",
    "-F": "none",
    "--fixed-strings": "none",
    "-G": "none",
    "--basic-regexp": "none",
    "-E": "none",
    "--extended-regexp": "none",
    "-P": "none",
    "--perl-regexp": "none",
    "-i": "none",
    "--ignore-case": "none",
    "--no-ignore-case": "none",
    "-v": "none",
    "--invert-match": "none",
    "-w": "none",
    "--word-regexp": "none",
    "-x": "none",
    "--line-regexp": "none",
    "-c": "none",
    "--count": "none",
    "--color": "string",
    "--colour": "string",
    "-L": "none",
    "--files-without-match": "none",
    "-l": "none",
    "--files-with-matches": "none",
    "-m": "number",
    "--max-count": "number",
    "-o": "none",
    "--only-matching": "none",
    "-q": "none",
    "--quiet": "none",
    "--silent": "none",
    "-s": "none",
    "--no-messages": "none",
    "-b": "none",
    "--byte-offset": "none",
    "-H": "none",
    "--with-filename": "none",
    "-h": "none",
    "--no-filename": "none",
    "--label": "string",
    "-n": "none",
    "--line-number": "none",
    "-T": "none",
    "--initial-tab": "none",
    "-u": "none",
    "--unix-byte-offsets": "none",
    "-Z": "none",
    "--null": "none",
    "-z": "none",
    "--null-data": "none",
    "-A": "number",
    "--after-context": "number",
    "-B": "number",
    "--before-context": "number",
    "-C": "number",
    "--context": "number",
    "--group-separator": "string",
    "--no-group-separator": "none",
    "-a": "none",
    "--text": "none",
    "--binary-files": "string",
    "-I": "none",
    "-D": "string",
    "--devices": "string",
    "-d": "string",
    "--directories": "string",
    "--exclude": "string",
    "--exclude-from": "string",
    "--exclude-dir": "string",
    "--include": "string",
    "-r": "none",
    "--recursive": "none",
    "-R": "none",
    "--dereference-recursive": "none",
    "--line-buffered": "none",
    "-U": "none",
    "--binary": "none",
    "--help": "none",
    "-V": "none",
    "--version": "none",
  };
  TENGU_TENDER_THUNDER = "tengu_tender_thunder";
  FD_UNSAFE_FLAG_RE = /^[A-Za-z0-9:,]+$/;
  refusedReadingStore = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:1126020-1126121 layout
/**
 * 在 refused 读法上下文中运行权限检查（off 指示是否关闭差异读法），返回结果与是否发生过 refused 读法。
 */
async function runWithRefusedReading(off, fn) {
  let readingState = {
    off,
    refused: false,
  };
  return {
    result: await refusedReadingStore.run(readingState, fn),
    refused: readingState.refused,
  };
}
//@ chunk-5xgkngpb.js:1126121-1126137 layout
/**
 * 标记“按另一种读法解析命令”的 AsyncLocalStorage。
 */
var divergentShapeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1126121", () => {
  divergentShapeStorage = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:1126137-1126175 layout
/**
 * 在 divergentShapes 上下文中运行回调（让解析器按另一种读法分析）。
 */
function runWithDivergentShapes(kind, fn) {
  return divergentShapeStorage.run(kind, fn);
}
//@ chunk-5xgkngpb.js:1126175-1139469 fingerprint (2.1.88 match: COMMAND_ALLOWLIST, 0.835)
/**
 * 只读命令白名单 COMMAND_ALLOWLIST：xargs、git 只读子命令、file、sed、sort、man、help、netstat、ps、base64、grep、rg、fd、checksum、tree、date、hostname、info、lsof、pgrep、tput、ss、jq、uniq、history、arch、ifconfig、pyright 等，每项给出安全选项表、可选 regex 与额外危险回调。_Ca 是含内部 aki 命令的扩展表。
 */
var COMMAND_ALLOWLIST; // deferred: uses GIT_READ_ONLY_COMMANDS (../../utils/shell/readOnlyCommandValidation.js) of its import cycle while loading; runs once the cycle is complete
var INTERNAL_COMMAND_ALLOWLIST;
deferInit("chunk-5xgkngpb.js:1126175", () => {
  COMMAND_ALLOWLIST = {
    xargs: {
      safeFlags: {
        "-I": "{}",
        "-n": "number",
        "-P": "number",
        "-L": "number",
        "-s": "number",
        "-E": "EOF",
        "-0": "none",
        "-t": "none",
        "-r": "none",
        "-x": "none",
        "-d": "char",
      },
    },
    ...GIT_READ_ONLY_COMMANDS,
    file: {
      safeFlags: {
        "--brief": "none",
        "-b": "none",
        "--mime": "none",
        "-i": "none",
        "--mime-type": "none",
        "--mime-encoding": "none",
        "--apple": "none",
        "--check-encoding": "none",
        "-c": "none",
        "--exclude": "string",
        "--exclude-quiet": "string",
        "--print0": "none",
        "-0": "none",
        "-F": "string",
        "--separator": "string",
        "--help": "none",
        "--version": "none",
        "-v": "none",
        "--no-dereference": "none",
        "-h": "none",
        "--dereference": "none",
        "-L": "none",
        "--keep-going": "none",
        "-k": "none",
        "--list": "none",
        "-l": "none",
        "--no-buffer": "none",
        "-n": "none",
        "--preserve-date": "none",
        "-p": "none",
        "--raw": "none",
        "-r": "none",
        "-s": "none",
        "--special-files": "none",
      },
    },
    sed: {
      safeFlags: {
        "--expression": "string",
        "-e": "string",
        "--quiet": "none",
        "--silent": "none",
        "-n": "none",
        "--regexp-extended": "none",
        "-r": "none",
        "--posix": "none",
        "-E": "none",
        "--line-length": "number",
        "-l": "number",
        "--zero-terminated": "none",
        "-z": "none",
        "--separate": "none",
        "-s": "none",
        "--unbuffered": "none",
        "-u": "none",
        "--debug": "none",
        "--help": "none",
        "--version": "none",
      },
      additionalCommandIsDangerousCallback: (rawCommand, _args) =>
        !sedCommandIsAllowedByAllowlist(rawCommand),
    },
    sort: {
      safeFlags: {
        "--ignore-leading-blanks": "none",
        "-b": "none",
        "--dictionary-order": "none",
        "-d": "none",
        "--ignore-case": "none",
        "-f": "none",
        "--general-numeric-sort": "none",
        "-g": "none",
        "--human-numeric-sort": "none",
        "-h": "none",
        "--ignore-nonprinting": "none",
        "-i": "none",
        "--month-sort": "none",
        "-M": "none",
        "--numeric-sort": "none",
        "-n": "none",
        "--random-sort": "none",
        "-R": "none",
        "--reverse": "none",
        "-r": "none",
        "--sort": "string",
        "--stable": "none",
        "-s": "none",
        "--unique": "none",
        "-u": "none",
        "--version-sort": "none",
        "-V": "none",
        "--zero-terminated": "none",
        "-z": "none",
        "--key": "string",
        "-k": "string",
        "--field-separator": "string",
        "-t": "string",
        "--check": "none",
        "-c": "none",
        "--check-char-order": "none",
        "-C": "none",
        "--merge": "none",
        "-m": "none",
        "--buffer-size": "string",
        "-S": "string",
        "--parallel": "number",
        "--batch-size": "number",
        "--help": "none",
        "--version": "none",
      },
    },
    man: {
      additionalCommandIsDangerousCallback: (rawCommand, args) => {
        for (let idx = 0; idx < args.length; idx++) {
          let arg = args[idx];
          if (arg === "--" || arg === "-" || !arg.startsWith("-")) break;
          let sectionValue;
          if (arg === "-S" || arg === "-s") {
            idx++;
            sectionValue = args[idx] ?? "";
          } else if (arg.startsWith("-S=") || arg.startsWith("-s=")) sectionValue = arg.slice(2);
          if (sectionValue === undefined || FD_UNSAFE_FLAG_RE.test(sectionValue)) continue;
          let readingState = refusedReadingStore.getStore();
          if (
            readingState?.off !== true &&
            readFlagWithOverride(TENGU_TENDER_THUNDER, {
              safe: true,
            })
          ) {
            if (readingState !== undefined) readingState.refused = true;
            return true;
          }
        }
        let searchFlags = new Set(["-k", "-f", "--apropos", "--whatis"]);
        let sectionFlags = new Set(["-S", "-s"]);
        let isSearch = false;
        for (let arg of args) {
          if (arg === "--") break;
          if (!arg.startsWith("-") || arg === "-") continue;
          if (arg.startsWith("--")) {
            if (searchFlags.has(arg)) isSearch = true;
          } else if (/[kf]/.test(arg.slice(1))) isSearch = true;
        }
        let sawSearchFlag = false;
        let sawOperand = false;
        for (let idx = 0; idx < args.length; idx++) {
          let arg = args[idx];
          if (!sawOperand && arg === "--") {
            sawOperand = true;
            continue;
          }
          if (!(sawOperand || !arg.startsWith("-") || arg === "-")) {
            if (searchFlags.has(arg)) sawSearchFlag = true;
            else if (sectionFlags.has(arg)) idx++;
            continue;
          }
          sawOperand = true;
          if (containsAnyPlaceholder(arg)) return true;
          if (isSearch && arg.startsWith("-")) return true;
          if (!sawSearchFlag && (arg.includes("/") || arg.includes("\\") || arg.includes("~"))) return true;
        }
        return false;
      },
      safeFlags: {
        "-a": "none",
        "--all": "none",
        "-d": "none",
        "-f": "none",
        "--whatis": "none",
        "-h": "none",
        "-k": "none",
        "--apropos": "none",
        "-w": "none",
        "-S": "string",
        "-s": "string",
      },
    },
    help: {
      additionalCommandIsDangerousCallback: (rawCommand, args) =>
        hasTildeArg(args) ||
        args.some((arg) => arg.includes("/") || arg.includes("\\") || containsAnyPlaceholder(arg)),
      safeFlags: {
        "-d": "none",
      },
    },
    netstat: {
      safeFlags: {
        "-a": "none",
        "-L": "none",
        "-l": "none",
        "-n": "none",
        "-f": "string",
        "-g": "none",
        "-i": "none",
        "-I": "string",
        "-s": "none",
        "-r": "none",
        "-m": "none",
        "-v": "none",
      },
    },
    ps: {
      respectsDoubleDash: false,
      safeFlags: {
        "-e": "none",
        "-A": "none",
        "-a": "none",
        "-d": "none",
        "-N": "none",
        "--deselect": "none",
        "-f": "none",
        "-F": "none",
        "-l": "none",
        "-j": "none",
        "-y": "none",
        "-w": "none",
        "-ww": "none",
        "--width": "number",
        "-c": "none",
        "-H": "none",
        "--forest": "none",
        "--headers": "none",
        "--no-headers": "none",
        "-n": "string",
        "--sort": "string",
        "-L": "none",
        "-T": "none",
        "-m": "none",
        "-C": "string",
        "-G": "string",
        "-g": "string",
        "-p": "string",
        "--pid": "string",
        "-q": "string",
        "--quick-pid": "string",
        "-s": "string",
        "--sid": "string",
        "-t": "string",
        "--tty": "string",
        "-U": "string",
        "-u": "string",
        "--user": "string",
        "--help": "none",
        "--info": "none",
        "-V": "none",
        "--version": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        let any = args.some((arg) => !isFlagToken(arg) && /[eE]/.test(arg));
        let any_2 = args.some((arg) => /^-[a-zA-Z]*e/.test(arg));
        let all = args.every((arg) => arg === "--forest" || /^-[AacdeFfjlwHLTm]+$/.test(arg));
        let flattened = args.flatMap((arg) => (arg === "--forest" ? [arg] : (arg.match(/[HLTm]/g) ?? [])));
        return any || (any_2 && !(all && flattened.length <= 1));
      },
    },
    base64: {
      respectsDoubleDash: false,
      safeFlags: {
        "-d": "none",
        "-D": "none",
        "--decode": "none",
        "-b": "number",
        "--break": "number",
        "-w": "number",
        "--wrap": "number",
        "-i": "string",
        "--input": "string",
        "--ignore-garbage": "none",
        "-h": "none",
        "--help": "none",
        "--version": "none",
      },
    },
    grep: {
      safeFlags: GREP_SAFE_FLAGS,
    },
    egrep: {
      safeFlags: GREP_SAFE_FLAGS,
    },
    fgrep: {
      safeFlags: GREP_SAFE_FLAGS,
    },
    ...RIPGREP_READ_ONLY_COMMANDS,
    sha256sum: {
      safeFlags: {
        "-b": "none",
        "--binary": "none",
        "-t": "none",
        "--text": "none",
        "-c": "none",
        "--check": "none",
        "--ignore-missing": "none",
        "--quiet": "none",
        "--status": "none",
        "--strict": "none",
        "-w": "none",
        "--warn": "none",
        "--tag": "none",
        "-z": "none",
        "--zero": "none",
        "--help": "none",
        "--version": "none",
      },
    },
    sha1sum: {
      safeFlags: {
        "-b": "none",
        "--binary": "none",
        "-t": "none",
        "--text": "none",
        "-c": "none",
        "--check": "none",
        "--ignore-missing": "none",
        "--quiet": "none",
        "--status": "none",
        "--strict": "none",
        "-w": "none",
        "--warn": "none",
        "--tag": "none",
        "-z": "none",
        "--zero": "none",
        "--help": "none",
        "--version": "none",
      },
    },
    md5sum: {
      safeFlags: {
        "-b": "none",
        "--binary": "none",
        "-t": "none",
        "--text": "none",
        "-c": "none",
        "--check": "none",
        "--ignore-missing": "none",
        "--quiet": "none",
        "--status": "none",
        "--strict": "none",
        "-w": "none",
        "--warn": "none",
        "--tag": "none",
        "-z": "none",
        "--zero": "none",
        "--help": "none",
        "--version": "none",
      },
    },
    tree: {
      safeFlags: {
        "-a": "none",
        "-d": "none",
        "-l": "none",
        "-f": "none",
        "-x": "none",
        "-L": "number",
        "-P": "string",
        "-I": "string",
        "--gitignore": "none",
        "--gitfile": "string",
        "--ignore-case": "none",
        "--matchdirs": "none",
        "--metafirst": "none",
        "--prune": "none",
        "--info": "none",
        "--infofile": "string",
        "--noreport": "none",
        "--charset": "string",
        "--filelimit": "number",
        "-q": "none",
        "-N": "none",
        "-Q": "none",
        "-p": "none",
        "-u": "none",
        "-g": "none",
        "-s": "none",
        "-h": "none",
        "--si": "none",
        "--du": "none",
        "-D": "none",
        "--timefmt": "string",
        "-F": "none",
        "--inodes": "none",
        "--device": "none",
        "-v": "none",
        "-t": "none",
        "-c": "none",
        "-U": "none",
        "-r": "none",
        "--dirsfirst": "none",
        "--filesfirst": "none",
        "--sort": "string",
        "-i": "none",
        "-A": "none",
        "-S": "none",
        "-n": "none",
        "-C": "none",
        "-X": "none",
        "-J": "none",
        "-H": "string",
        "--nolinks": "none",
        "--hintro": "string",
        "--houtro": "string",
        "-T": "string",
        "--hyperlink": "none",
        "--scheme": "string",
        "--authority": "string",
        "--fromfile": "none",
        "--fromtabfile": "none",
        "--fflinks": "none",
        "--help": "none",
        "--version": "none",
      },
    },
    date: {
      safeFlags: {
        "-d": "string",
        "--date": "string",
        "-r": "string",
        "--reference": "string",
        "-u": "none",
        "--utc": "none",
        "--universal": "none",
        "-I": "none",
        "--iso-8601": "string",
        "-R": "none",
        "--rfc-email": "none",
        "--rfc-3339": "string",
        "--debug": "none",
        "--help": "none",
        "--version": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        let flagsWithArgs = new Set(["-d", "--date", "-r", "--reference", "--rfc-3339"]);
        let i = 0;
        while (i < args.length) {
          let token = args[i];
          if (token.startsWith("--") && token.includes("=")) i++;
          else if (token.startsWith("-")) {
            if (flagsWithArgs.has(token)) i += 2;
            else i++;
          } else {
            if (!token.startsWith("+")) return true;
            i++;
          }
        }
        return false;
      },
    },
    hostname: {
      safeFlags: {
        "-f": "none",
        "--fqdn": "none",
        "--long": "none",
        "-s": "none",
        "--short": "none",
        "-i": "none",
        "--ip-address": "none",
        "-I": "none",
        "--all-ip-addresses": "none",
        "-a": "none",
        "--alias": "none",
        "-d": "none",
        "--domain": "none",
        "-A": "none",
        "--all-fqdns": "none",
        "-v": "none",
        "--verbose": "none",
        "-h": "none",
        "--help": "none",
        "-V": "none",
        "--version": "none",
      },
      regex: /^hostname(?:\s+(?:-[a-zA-Z]|--[a-zA-Z-]+))*\s*$/,
    },
    lsof: {
      safeFlags: {
        "-?": "none",
        "-h": "none",
        "-v": "none",
        "-a": "none",
        "-b": "none",
        "-C": "none",
        "-l": "none",
        "-n": "none",
        "-N": "none",
        "-O": "none",
        "-P": "none",
        "-Q": "none",
        "-R": "none",
        "-t": "none",
        "-U": "none",
        "-V": "none",
        "-X": "none",
        "-H": "none",
        "-E": "none",
        "-F": "none",
        "-g": "none",
        "-i": "none",
        "-K": "none",
        "-L": "none",
        "-o": "none",
        "-r": "none",
        "-s": "none",
        "-S": "none",
        "-T": "none",
        "-x": "none",
        "-A": "string",
        "-c": "string",
        "-d": "string",
        "-e": "string",
        "-k": "string",
        "-p": "string",
        "-u": "string",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        for (let idx = 0; idx < args.length; idx++) {
          let arg = args[idx];
          if (arg === "+m" || arg.startsWith("+m")) return true;
          if (/^-[a-zA-Z]*i\S*@/.test(arg)) {
            let encodingName = firstLineOf(arg.slice(arg.indexOf("@") + 1), ":");
            if (/[a-zA-Z]/.test(encodingName)) return true;
          }
          if (/^-[a-zA-Z]*i$/.test(arg)) {
            let nextArg = args[idx + 1] ?? "";
            if (nextArg.includes("~")) return true;
            if (nextArg.includes("@")) {
              let encodingName = firstLineOf(nextArg.slice(nextArg.indexOf("@") + 1), ":");
              if (/[a-zA-Z]/.test(encodingName)) return true;
            }
          }
        }
        return false;
      },
    },
    pgrep: {
      safeFlags: {
        "-d": "string",
        "--delimiter": "string",
        "-l": "none",
        "--list-name": "none",
        "-a": "none",
        "--list-full": "none",
        "-v": "none",
        "--inverse": "none",
        "-w": "none",
        "--lightweight": "none",
        "-c": "none",
        "--count": "none",
        "-f": "none",
        "--full": "none",
        "-g": "string",
        "--pgroup": "string",
        "-G": "string",
        "--group": "string",
        "-i": "none",
        "--ignore-case": "none",
        "-n": "none",
        "--newest": "none",
        "-o": "none",
        "--oldest": "none",
        "-O": "string",
        "--older": "string",
        "-P": "string",
        "--parent": "string",
        "-s": "string",
        "--session": "string",
        "-t": "string",
        "--terminal": "string",
        "-u": "string",
        "--euid": "string",
        "-U": "string",
        "--uid": "string",
        "-x": "none",
        "--exact": "none",
        "-F": "string",
        "--pidfile": "string",
        "-L": "none",
        "--logpidfile": "none",
        "-r": "string",
        "--runstates": "string",
        "--ns": "string",
        "--nslist": "string",
        "--help": "none",
        "-V": "none",
        "--version": "none",
      },
    },
    tput: {
      safeFlags: {
        "-T": "string",
        "-V": "none",
        "-x": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        let DANGEROUS_CAPABILITIES = new Set([
          "init",
          "reset",
          "rs1",
          "rs2",
          "rs3",
          "is1",
          "is2",
          "is3",
          "iprog",
          "if",
          "rf",
          "clear",
          "flash",
          "mc0",
          "mc4",
          "mc5",
          "mc5i",
          "mc5p",
          "pfkey",
          "pfloc",
          "pfx",
          "pfxl",
          "smcup",
          "rmcup",
        ]);
        let flagsWithArgs = new Set(["-T"]);
        let i = 0;
        let afterDoubleDash = false;
        while (i < args.length) {
          let token = args[i];
          if (token === "--") {
            afterDoubleDash = true;
            i++;
          } else if (!afterDoubleDash && token.startsWith("-")) {
            if (token === "-S") return true;
            if (!token.startsWith("--") && token.length > 2 && token.includes("S")) return true;
            if (flagsWithArgs.has(token)) i += 2;
            else i++;
          } else {
            if (DANGEROUS_CAPABILITIES.has(token)) return true;
            i++;
          }
        }
        return false;
      },
    },
    ss: {
      safeFlags: {
        "-h": "none",
        "--help": "none",
        "-V": "none",
        "--version": "none",
        "-n": "none",
        "--numeric": "none",
        "-a": "none",
        "--all": "none",
        "-l": "none",
        "--listening": "none",
        "-o": "none",
        "--options": "none",
        "-e": "none",
        "--extended": "none",
        "-m": "none",
        "--memory": "none",
        "-p": "none",
        "--processes": "none",
        "-i": "none",
        "--info": "none",
        "-s": "none",
        "--summary": "none",
        "-4": "none",
        "--ipv4": "none",
        "-6": "none",
        "--ipv6": "none",
        "-0": "none",
        "--packet": "none",
        "-t": "none",
        "--tcp": "none",
        "-M": "none",
        "--mptcp": "none",
        "-S": "none",
        "--sctp": "none",
        "-u": "none",
        "--udp": "none",
        "-d": "none",
        "--dccp": "none",
        "-w": "none",
        "--raw": "none",
        "-x": "none",
        "--unix": "none",
        "--tipc": "none",
        "--vsock": "none",
        "-f": "string",
        "--family": "string",
        "-A": "string",
        "--query": "string",
        "--socket": "string",
        "-Z": "none",
        "--context": "none",
        "-z": "none",
        "--contexts": "none",
        "-b": "none",
        "--bpf": "none",
        "-E": "none",
        "--events": "none",
        "-H": "none",
        "--no-header": "none",
        "-O": "none",
        "--oneline": "none",
        "--tipcinfo": "none",
        "--tos": "none",
        "--cgroup": "none",
        "--inet-sockopt": "none",
      },
      additionalCommandIsDangerousCallback: (args, argv) => {
        let binaryOperatorRe =
          /^(dst|src|dport|sport|and|or|not|eq|ne|ge|le|gt|lt|autobound|state|exclude|dev|fwmark|cgroup)$/;
        let valueOperatorRe = /^(state|exclude|dport|sport|dev|fwmark|cgroup)$/;
        let argTakingFlagRe = /^(-f|--family|-A|--query|--socket)$/;
        let words = [];
        let afterDoubleDash = false;
        for (let idx = 0; idx < argv.length; idx++) {
          let arg = argv[idx];
          if (!afterDoubleDash && arg === "--") {
            afterDoubleDash = true;
            continue;
          }
          if (!afterDoubleDash && arg.startsWith("-")) {
            if (argTakingFlagRe.test(arg)) idx++;
            continue;
          }
          words.push(arg);
        }
        if (hasTildeArg(words)) return true;
        let filtered = words
          .join(" ")
          .split(/[\s()=!<>&|,]+/)
          .filter(Boolean);
        let expectValue = false;
        for (let token of filtered) {
          if (expectValue) {
            expectValue = false;
            continue;
          }
          if (binaryOperatorRe.test(token)) {
            expectValue = valueOperatorRe.test(token);
            continue;
          }
          if (
            /[g-zG-Z]/.test(token) ||
            (/[a-fA-F]/.test(token) && (token.includes(".") || !token.includes(":")))
          )
            return true;
        }
        return false;
      },
    },
    fd: {
      safeFlags: {
        ...FD_SAFE_FLAGS,
      },
    },
    fdfind: {
      safeFlags: {
        ...FD_SAFE_FLAGS,
      },
    },
    ...DOCKER_READ_ONLY_COMMANDS,
    test: {
      respectsDoubleDash: false,
      safeFlags: {
        "-b": "string",
        "-c": "string",
        "-d": "string",
        "-e": "string",
        "-f": "string",
        "-g": "string",
        "-G": "string",
        "-h": "string",
        "-k": "string",
        "-L": "string",
        "-N": "string",
        "-O": "string",
        "-p": "string",
        "-r": "string",
        "-s": "string",
        "-S": "string",
        "-t": "string",
        "-u": "string",
        "-w": "string",
        "-x": "string",
        "-z": "string",
        "-n": "string",
        "-eq": "string",
        "-ne": "string",
        "-lt": "string",
        "-le": "string",
        "-gt": "string",
        "-ge": "string",
        "-nt": "string",
        "-ot": "string",
        "-ef": "string",
      },
      additionalCommandIsDangerousCallback: (args, argv) => {
        if (
          argv.some((arg) => arg === "-v" || arg === "-R" || arg === "-a" || arg === "-o" || /\[/.test(arg))
        )
          return true;
        for (let idx = 0; idx < argv.length; idx++) {
          if (TEST_ARITH_CMP_OPS.has(argv[idx])) {
            for (let operand of [argv[idx - 1], argv[idx + 1]])
              if (operand !== undefined && !TEST_ARITH_NUMERIC_RE.test(operand)) return true;
          }
          if (argv[idx] === "-t") {
            let fdArg = argv[idx + 1];
            if (fdArg !== undefined && !TEST_ARITH_NUMERIC_RE.test(fdArg)) return true;
          }
        }
        return false;
      },
    },
  };
  INTERNAL_COMMAND_ALLOWLIST = {
    ...GH_READ_ONLY_COMMANDS,
    aki: {
      safeFlags: {
        "-h": "none",
        "--help": "none",
        "-k": "none",
        "--keyword": "none",
        "-s": "none",
        "--semantic": "none",
        "--no-adaptive": "none",
        "-n": "number",
        "--limit": "number",
        "-o": "number",
        "--offset": "number",
        "--source": "string",
        "--exclude-source": "string",
        "-a": "string",
        "--after": "string",
        "-b": "string",
        "--before": "string",
        "--collection": "string",
        "--drive": "string",
        "--folder": "string",
        "--descendants": "none",
        "-m": "string",
        "--meta": "string",
        "-t": "string",
        "--threshold": "string",
        "--kw-weight": "string",
        "--sem-weight": "string",
        "-j": "none",
        "--json": "none",
        "-c": "none",
        "--chunk": "none",
        "--preview": "none",
        "-d": "none",
        "--full-doc": "none",
        "-v": "none",
        "--verbose": "none",
        "--stats": "none",
        "-S": "number",
        "--summarize": "number",
        "--explain": "none",
        "--examine": "string",
        "--url": "string",
        "--multi-turn": "number",
        "--multi-turn-model": "string",
        "--multi-turn-context": "string",
        "--no-rerank": "none",
        "--audit": "none",
        "--local": "none",
        "--staging": "none",
      },
      additionalCommandIsDangerousCallback: (args, argv) =>
        hasTildeExpansion(argv) || argv.some(containsAnyPlaceholder),
    },
  };
});
//@ chunk-5xgkngpb.js:1139469-1139547 fingerprint (2.1.88 match: getCommandAllowlist, 0.427)
/**
 * 返回只读白名单；Windows 上去掉 xargs。
 */
function getCommandAllowlist() {
  let allowlist = COMMAND_ALLOWLIST;
  if (getPlatform() === "windows") {
    let { xargs, ...rest } = allowlist;
    allowlist = rest;
  }
  return allowlist;
}
//@ chunk-5xgkngpb.js:1139547-1139641 fingerprint (2.1.88 match: SAFE_TARGET_COMMANDS_FOR_XARGS, 0.82)
var SAFE_XARGS_OUTPUT_COMMANDS = ["echo", "printf", "wc"];
var SAFE_XARGS_FILTER_COMMANDS = ["grep", "egrep", "fgrep", "head", "tail"];
var SAFE_TARGET_COMMANDS_FOR_XARGS = [...SAFE_XARGS_OUTPUT_COMMANDS, ...SAFE_XARGS_FILTER_COMMANDS];
//@ chunk-5xgkngpb.js:1139805-1140075 affinity
/**
 * xargs 后接的命令是否是安全过滤命令（grep/egrep/fgrep/head/tail）。
 */
function isXargsToSafeFilter(argv) {
  if (argv[0] !== "xargs") return false;
  let safeFlags = COMMAND_ALLOWLIST.xargs?.safeFlags ?? {};
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg === "--") return SAFE_XARGS_FILTER_COMMANDS.includes(argv[idx + 1] ?? "");
    if (arg.startsWith("-")) {
      if (arg.length === 2 && safeFlags[arg] !== undefined && safeFlags[arg] !== "none") idx++;
      continue;
    }
    return SAFE_XARGS_FILTER_COMMANDS.includes(arg);
  }
  return false;
}
//@ chunk-5xgkngpb.js:1140075-1141132 fingerprint (2.1.88 match: isCommandSafeViaFlagParsing, 0.624)
/**
 * 按白名单解析选项判断命令是否只读：匹配命令前缀、git ls-remote 只允许选项、参数含 $ 或花括号展开即否、逐个校验选项与值、regex/反引号/换行限制、额外危险回调。
 */
function isCommandSafeViaFlagParsing(command) {
  let tokens = getCommandArgv(command);
  if (tokens.length === 0) return false;
  let commandConfig;
  let commandTokens = 0;
  let allowlist = getCommandAllowlist();
  for (let [cmdPattern] of Object.entries(allowlist)) {
    let cmdTokens = cmdPattern.split(" ");
    if (tokens.length >= cmdTokens.length) {
      let matches = true;
      for (let i = 0; i < cmdTokens.length; i++)
        if (tokens[i] !== cmdTokens[i]) {
          matches = false;
          break;
        }
      if (matches) {
        commandConfig = allowlist[cmdPattern];
        commandTokens = cmdTokens.length;
        break;
      }
    }
  }
  if (!commandConfig) return false;
  if (tokens[0] === "git" && tokens[1] === "ls-remote") {
    if (
      tokens.some(
        (token) => token === "-o" || token === "--server-option" || token.startsWith("--server-option="),
      )
    )
      return false;
    let afterDoubleDash = false;
    for (let i = 2; i < tokens.length; i++) {
      let token = tokens[i];
      if (!token) continue;
      if (!afterDoubleDash && token === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (afterDoubleDash || token === "-" || !token.startsWith("-")) return false;
    }
  }
  for (let i = commandTokens; i < tokens.length; i++) {
    let token = tokens[i];
    if (!token) continue;
    if (token.includes("$")) return false;
    if (token.includes("{") && (token.includes(",") || token.includes(".."))) return false;
  }
  if (
    !validateFlags(tokens, commandTokens, commandConfig, {
      commandName: tokens[0],
      rawCommand: command,
      xargsTargetCommands: tokens[0] === "xargs" ? SAFE_TARGET_COMMANDS_FOR_XARGS : undefined,
    })
  )
    return false;
  if (commandConfig.regex && !commandConfig.regex.test(command)) return false;
  if (!commandConfig.regex && /`/.test(command)) return false;
  if (
    !commandConfig.regex &&
    (tokens[0] === "rg" || tokens[0] === "grep" || tokens[0] === "egrep" || tokens[0] === "fgrep") &&
    /[\n\r]/.test(command)
  )
    return false;
  if (
    commandConfig.additionalCommandIsDangerousCallback &&
    commandConfig.additionalCommandIsDangerousCallback(command, tokens.slice(commandTokens))
  )
    return false;
  return true;
}
//@ chunk-5xgkngpb.js:1141132-1141207 fingerprint (2.1.88 match: makeRegexForSafeCommand, 1)
/**
 * 为只读命令生成正则：命令后不能出现 < > ( ) $ ` | { } & ; 换行。
 */
function makeRegexForSafeCommand(command) {
  return new RegExp(`^${command}(?:\\s|$)[^<>()$\`|{}&;\\n\\r]*$`);
}
//@ chunk-5xgkngpb.js:1141207-1142041 fingerprint (2.1.88 match: READONLY_COMMANDS, 0.719)
/**
 * 基础只读命令列表（cat/head/tail/wc/stat/id/uname/df/du/realpath/diff/true/false/sleep/which/expr/seq…）及派生集合；find 的写动作（-delete/-exec/-fprint…）；printf 格式检查正则；固定只读 argv（claude -h、node -v、python --version、ip addr）。
 */
var READONLY_COMMANDS; // deferred: uses DOCKER_READ_ONLY_COMMANDS (../../utils/shell/readOnlyCommandValidation.js) of its import cycle while loading; runs once the cycle is complete
var READONLY_COMMAND_SET;
var MULTI_WORD_READONLY_COMMANDS;
var FIND_WRITE_ACTIONS;
var SAFE_NO_ARG_COMMANDS;
var PRINTF_LENGTH_MODIFIERS;
var regExp_7;
var regExp_8;
var READONLY_EXACT_ARGV;
deferInit("chunk-5xgkngpb.js:1141207", () => {
  READONLY_COMMANDS = [
    ...DOCKER_BARE_READ_ONLY_COMMANDS,
    "cal",
    "uptime",
    "cat",
    "head",
    "tail",
    "wc",
    "stat",
    "strings",
    "hexdump",
    "od",
    "nl",
    "id",
    "uname",
    "free",
    "df",
    "du",
    "locale",
    "groups",
    "nproc",
    "basename",
    "dirname",
    "realpath",
    "cut",
    "paste",
    "tr",
    "column",
    "tac",
    "rev",
    "fold",
    "expand",
    "unexpand",
    "fmt",
    "comm",
    "cmp",
    "numfmt",
    "readlink",
    "diff",
    "true",
    "false",
    "sleep",
    "which",
    "type",
    "expr",
    "seq",
    "tsort",
    "pr",
  ];
  READONLY_COMMAND_SET = new Set(READONLY_COMMANDS);
  MULTI_WORD_READONLY_COMMANDS = READONLY_COMMANDS.filter((commandName) => commandName.includes(" "));
  FIND_WRITE_ACTIONS = new Set([
    "-delete",
    "-rm",
    "-exec",
    "-execdir",
    "-ok",
    "-okdir",
    "-fprint",
    "-fprint0",
    "-fls",
    "-fprintf",
    "-files0-from",
  ]);
  SAFE_NO_ARG_COMMANDS = new Set(["pwd", "whoami", "alias"]);
  PRINTF_LENGTH_MODIFIERS = "[lLhqjzZt]*";
  regExp_7 = new RegExp(`%[^%a-zA-Z]*${PRINTF_LENGTH_MODIFIERS}\\\\[0-7xX]`);
  regExp_8 = new RegExp(`%[-+ 0#']*[0-9.*]*${PRINTF_LENGTH_MODIFIERS}[diouxXeEfFgGaAn]`);
  READONLY_EXACT_ARGV = [
    ["claude", "-h"],
    ["claude", "--help"],
    ["node", "-v"],
    ["node", "--version"],
    ["python", "--version"],
    ["python3", "--version"],
    ["ip", "addr"],
  ];
});
//@ chunk-5xgkngpb.js:1142041-1143702 layout
/**
 * 按 argv 判断命令是否只读：无参命令、精确 argv 白名单、只读命令集、多词只读命令（docker 额外检查危险参数），以及 echo、printf（格式与参数安全）、[[（算术比较）、ls、cd、find（无写动作）、history 等特例；无法判断返回 null。
 */
function isReadOnlyArgv(hasGitCommand) {
  if (hasGitCommand.length === 0) return false;
  let commandName = hasGitCommand[0];
  if (SAFE_NO_ARG_COMMANDS.has(commandName)) return hasGitCommand.length === 1;
  for (let exactArgv of READONLY_EXACT_ARGV)
    if (
      hasGitCommand.length === exactArgv.length &&
      hasGitCommand.every((token, idx) => token === exactArgv[idx])
    )
      return true;
  if (READONLY_COMMAND_SET.has(commandName)) return true;
  for (let multiWordCommand of MULTI_WORD_READONLY_COMMANDS) {
    let parts = multiWordCommand.split(" ");
    if (hasGitCommand.length >= parts.length && parts.every((part, idx) => hasGitCommand[idx] === part)) {
      if (
        parts[0] === "docker" &&
        (hasDockerDangerousFlag(hasGitCommand) ||
          hasTildeExpansion(hasGitCommand.slice(parts.length)) ||
          hasGitCommand.slice(parts.length).some(containsAnyPlaceholder))
      )
        return false;
      return true;
    }
  }
  if (commandName === "echo") return true;
  let numericRe = /^[-+]?(0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)$/;
  if (commandName === "printf") {
    if (hasGitCommand[1]?.startsWith("-") && hasGitCommand[1] !== "--") return false;
    let formatIdx = hasGitCommand[1] === "--" ? 2 : 1;
    let format = hasGitCommand[formatIdx] ?? "";
    if (containsAnyPlaceholder(format)) return false;
    if (format.includes("$")) return false;
    let replaced = format.replace(/%%/g, "");
    if (regExp_7.test(replaced) || /\\[uU]/.test(replaced)) return false;
    if (regExp_8.test(replaced) || /%[^%a-zA-Z]*\*/.test(replaced))
      for (let idx = formatIdx + 1; idx < hasGitCommand.length; idx++) {
        let token = hasGitCommand[idx];
        if (
          token.includes("[") ||
          token.includes("`") ||
          token.includes("$(") ||
          containsAnyPlaceholder(token) ||
          !numericRe.test(token)
        )
          return false;
      }
    return true;
  }
  if (commandName === "[[") {
    for (let idx = 1; idx < hasGitCommand.length; idx++) {
      let token = hasGitCommand[idx];
      let nextToken = hasGitCommand[idx + 1];
      if (
        (token === "-v" || token === "-R" || token === "-t") &&
        nextToken !== undefined &&
        (nextToken.includes("[") || containsAnyPlaceholder(nextToken))
      )
        return false;
      if (token === "-t" && nextToken !== undefined && !TEST_ARITH_NUMERIC_RE.test(nextToken)) return false;
      if (TEST_ARITH_CMP_OPS.has(token)) {
        for (let operand of [hasGitCommand[idx - 1], hasGitCommand[idx + 1]])
          if (operand !== undefined && (operand.includes("[") || !TEST_ARITH_NUMERIC_RE.test(operand)))
            return false;
      }
    }
    return true;
  }
  if (commandName === "ls") return true;
  if (commandName === "cd") return hasGitCommand.length <= 2;
  if (commandName === "find") {
    let expectOperand = false;
    for (let idx = 1; idx < hasGitCommand.length; idx++) {
      let word = hasGitCommand[idx];
      let previousExpectOperand = expectOperand;
      expectOperand = false;
      if (FIND_WRITE_ACTIONS.has(word) && isRmModifierAllowed(word)) return false;
      if (isAmbiguousFindWord(word)) return false;
      if (!previousExpectOperand && findWordTakesFlagValue(word)) {
        expectOperand = true;
        continue;
      }
      if (!previousExpectOperand && findWordTakesOperand(word)) {
        idx++;
        continue;
      }
      if (containsAnyPlaceholder(word)) return false;
    }
    return true;
  }
  if (commandName === "history")
    return hasGitCommand.length === 1 || (hasGitCommand.length === 2 && /^\d+$/.test(hasGitCommand[1]));
  if (commandName === "arch")
    return (
      hasGitCommand.length === 1 ||
      (hasGitCommand.length === 2 && (hasGitCommand[1] === "-h" || hasGitCommand[1] === "--help"))
    );
  if (commandName === "ifconfig")
    return hasGitCommand.length === 1 || (hasGitCommand.length === 2 && /^[a-zA-Z]/.test(hasGitCommand[1]));
  return null;
}
//@ chunk-5xgkngpb.js:1143702-1144624 file-local
var READONLY_COMMAND_REGEXES; // deferred: uses READONLY_COMMANDS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1143702", () => {
  READONLY_COMMAND_REGEXES = new Set([
    ...READONLY_COMMANDS.map(makeRegexForSafeCommand),
    /^echo(?:\s+(?:'[^']*'|"[^"$<>\n\r]*"|[^|;&`$(){}><#\\!"'\s]+))*(?:\s+2>&1)?\s*$/,
    /^claude -h$/,
    /^claude --help$/,
    /^uniq(?:\s+(?:-[a-zA-Z]+|--[a-zA-Z-]+(?:=\S+)?|-[fsw]\s+\d+))*(?:\s|$)\s*$/,
    /^pwd$/,
    /^whoami$/,
    /^node -v$/,
    /^node --version$/,
    /^python --version$/,
    /^python3 --version$/,
    /^history(?:\s+\d+)?\s*$/,
    /^alias$/,
    /^arch(?:\s+(?:--help|-h))?\s*$/,
    /^ip addr$/,
    /^ifconfig(?:\s+[a-zA-Z][a-zA-Z0-9_-]*)?\s*$/,
    /^jq(?!.*(?:\s['"]?-[a-zA-Z]*[fL]|--from-file|--rawfile|--slurpfile|--run-tests|--library-path|\benv\b|\$ENV\b|\binclude\b|\bimport\b))(?:\s+(?:-[a-zA-Z]+|--[a-zA-Z-]+(?:=\S+)?))*(?:\s+'[^'`]*'|\s+"[^"`]*"|\s+[^-\s'"][^\s]*)+\s*$/,
    /^cd(?:\s+(?:'[^']*'|"[^"]*"|[^\s;|&`$(){}><#\\]+))?$/,
    /^ls(?:\s+[^<>()$`|{}&;\n\r]*)?$/,
    /^find(?:[ \t]+(?:\\[()]|(?!-delete\b|-rm\b|-exec\b|-execdir\b|-ok\b|-okdir\b|-fprint0?\b|-fls\b|-fprintf\b|-files0-from\b)[^<>()$`|{}&;\n\r\s]|[ \t])+)?$/,
  ]);
});
//@ chunk-5xgkngpb.js:1145338-1145588 placement
var SIMPLE_READ_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1145338", () => {
  SIMPLE_READ_COMMANDS = new Set([
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "stat",
    "grep",
    "egrep",
    "fgrep",
    "diff",
    "du",
    "df",
    "echo",
    "strings",
    "hexdump",
    "od",
    "nl",
    "cut",
    "column",
    "tr",
    "tac",
    "rev",
    "cmp",
    "basename",
    "dirname",
    "realpath",
    "readlink",
    "sha256sum",
    "sha1sum",
    "md5sum",
    "cd",
  ]);
});
//@ chunk-5xgkngpb.js:1145588-1145686 placement
/**
 * 判断 argv 是否为 [[ 测试表达式（文本也以 [[ 开头）。
 */
function isTestExpressionArgv(astCommand) {
  return (
    astCommand.argvUnquotedGlob === undefined &&
    astCommand.argv[0] === "[[" &&
    /^\[\[[ \t\n]/.test(astCommand.text)
  );
}
//@ chunk-5xgkngpb.js:1145686-1145760 placement
/**
 * 命令含未加引号的通配来源、不是简单只读命令、且开关开启时返回 true，表示要按不可静态验证处理。
 */
function hasUnsafeGlobSource(command) {
  return (
    !isTestExpressionArgv(command) &&
    hasSourceUnquotedGlob(command) &&
    !SIMPLE_READ_COMMANDS.has(stripCommandBuiltinPrefixes(command.argv)[0] ?? "") &&
    isSourceGlobRecordingEnabled()
  );
}
//@ chunk-5xgkngpb.js:1145760-1146299 fingerprint (2.1.88 match: isCommandReadOnly, 0.705)
/**
 * 单条命令是否只读：排除 UNC 路径、未加引号变量；先走选项白名单解析，再走只读正则（find 写动作、git -c/--exec-path/--config-env 除外）。
 */
function isCommandReadOnly(command) {
  let testCommand = command.trim();
  if (testCommand.endsWith(" 2>&1")) testCommand = testCommand.slice(0, -5).trim();
  if (containsVulnerableUncPath(testCommand)) return false;
  if (classifyDangerousExpansion(testCommand) === "variable") return false;
  if (isCommandSafeViaFlagParsing(testCommand)) return true;
  for (let regex of READONLY_COMMAND_REGEXES)
    if (regex.test(testCommand)) {
      if (testCommand.startsWith("find")) {
        let replaced = testCommand.replace(/['"\\]/g, "");
        if (
          /-delete\b|-rm\b|-exec\b|-execdir\b|-ok\b|-okdir\b|-fprint0?\b|-fls\b|-fprintf\b|-files0-from\b/.test(
            replaced,
          )
        )
          return false;
      }
      if (testCommand.includes("git") && /\s-c[\s=]/.test(testCommand)) return false;
      if (testCommand.includes("git") && /\s--exec-path[\s=]/.test(testCommand)) return false;
      if (testCommand.includes("git") && /\s--config-env[\s=]/.test(testCommand)) return false;
      return true;
    }
  return false;
}
//@ chunk-5xgkngpb.js:1146299-1146370 layout
/**
 * git 内部路径模式：head、objects/、refs/、hooks/。
 */
var GIT_INTERNAL_PATH_PATTERNS = [/^head$/, /^objects(?:\/|$)/, /^refs(?:\/|$)/, /^hooks(?:\/|$)/];
//@ chunk-5xgkngpb.js:1146370-1146546 layout
/**
 * 路径（规范化、小写、去土耳其 ı/长 s 混淆）是否是 git 内部结构：HEAD、objects/、refs/、hooks/。
 */
function isGitInternalPath(path) {
  let normalized = posix.normalize(path.replace(/\/+/g, "/"));
  normalized = normalized
    .replace(/^\.?\//, "")
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s");
  return GIT_INTERNAL_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}
//@ chunk-5xgkngpb.js:1146546-1146584 fingerprint (2.1.88 match: NON_CREATING_WRITE_COMMANDS, 1)
/**
 * 不新建文件的写命令（rm/rmdir/sed），提取写路径时排除。
 */
var NON_CREATING_WRITE_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1146546", () => {
  NON_CREATING_WRITE_COMMANDS = new Set(["rm", "rmdir", "sed"]);
});
//@ chunk-5xgkngpb.js:1146584-1146837 fingerprint (2.1.88 match: extractWritePathsFromSubcommand, 0.889)
/**
 * 从子命令中提取会创建/写入的路径（写/建类命令，排除 rm/rmdir/sed）。
 */
function extractWritePathsFromSubcommand(subcommand) {
  let argv = stripWrappersFromArgvForPaths(getCommandArgv(subcommand));
  if (argv.length === 0) return [];
  let baseCmd = normalizeCommandName(argv[0]?.replace(/[\\'"]/g, ""));
  if (!baseCmd) return [];
  if (!Object.hasOwn(COMMAND_OPERATION_TYPE, baseCmd)) return [];
  let opType = COMMAND_OPERATION_TYPE[baseCmd];
  if ((opType !== "write" && opType !== "create") || NON_CREATING_WRITE_COMMANDS.has(baseCmd)) return [];
  let extractor = PATH_EXTRACTORS[baseCmd];
  if (!extractor) return [];
  return extractor(argv.slice(1));
}
//@ chunk-5xgkngpb.js:1146837-1147250 fingerprint (2.1.88 match: commandWritesToGitInternalPaths, 0.835)
/**
 * 命令是否会写入 git 内部路径（HEAD/objects/refs/hooks），含 cp/mv 到当前目录的情形和输出重定向；用于阻止"先造 git 结构再运行 git"的攻击。
 */
function commandWritesToGitInternalPaths(command) {
  let subcommands = splitCommand(command);
  for (let subcmd of subcommands) {
    let trimmed = subcmd.trim();
    let writePaths = extractWritePathsFromSubcommand(trimmed);
    let replaced = stripWrappersFromArgvForPaths(getCommandArgv(trimmed))[0]?.replace(/[\\'"]/g, "");
    let isCopyOrMove = replaced === "cp" || replaced === "mv";
    let last = writePaths.at(-1);
    let landsInParent =
      last !== undefined &&
      (last === "." || last === "./" || last === "" || /^(?:\.\.\/)*\.\.\/?$/.test(last));
    for (let path of writePaths) {
      if (isGitInternalPath(path)) return true;
      if (isCopyOrMove && landsInParent && path !== last) {
        let path_2 = path.replace(/\/+$/, "").split("/").pop() ?? "";
        if (isGitInternalPath(path_2)) return true;
      }
    }
  }
  let { redirections } = extractOutputRedirections(command);
  for (let { target } of redirections) if (isGitInternalPath(target)) return true;
  return false;
}
//@ chunk-5xgkngpb.js:1151073-1151211 sole-consumer
function hasBackgroundOperator(node) {
  if (!STRUCTURAL_TYPES_2.has(node.type)) return false;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "&") return true;
    if (hasBackgroundOperator(child)) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1151211-1154508 fingerprint (2.1.88 match: checkReadOnlyConstraints, 0.416)
/**
 * Bash 只读判定：tree-sitter 解析，too-complex、子 shell、后台 &、可疑裸赋值、未加引号变量、UNC 路径、cd+git、裸仓库迹象/不可信 .git 重定向、写 git 内部文件、沙箱下非原始目录的 git 都不算只读；每个简单命令检查重定向、env 前缀、UNC、通配，再走只读白名单。全部通过返回 allow，否则 passthrough（带 notReadOnlyCommand）。BashTool.isReadOnly 与 isConcurrencySafe 依赖它。
 */
function checkReadOnlyConstraints(input, compoundCommandHasCd, options) {
  let { command } = input;
  let isOfflineEstimate = options?.offlineEstimate === true;
  if (command.length > SPLIT_MAX_LEN)
    return {
      behavior: "passthrough",
      message: "Command too long for read-only analysis",
    };
  let astRoot = getParserModule().parse(command);
  let parsed = astRoot
    ? parseForSecurityFromAst(command, astRoot, {
        readsDivergentShapes: divergentShapeStorage.getStore() === true,
      })
    : {
        kind: "simple",
        commands: [],
        bareAssignmentNames: [],
      };
  if (parsed.kind === "too-complex")
    return {
      behavior: "passthrough",
      message: `Not a simple read-only command: ${parsed.reason}`,
    };
  if (astRoot && hasSubshellNode(astRoot))
    return {
      behavior: "passthrough",
      message: "Not a simple read-only command: contains a subshell",
    };
  if (astRoot && hasBackgroundOperator(astRoot))
    return {
      behavior: "passthrough",
      message: "Not a simple read-only command: `&` defers execution past approval-time checks",
    };
  let getSessionEnvVarNames = isOfflineEstimate
    ? () => new Set()
    : lazySessionEnvVarNames(options?.sessionEnvVarKeys);
  if (hasRiskyBareAssignment(parsed.bareAssignmentNames, getSessionEnvVarNames))
    return {
      behavior: "passthrough",
      message:
        "Bare assignment to a non-allowlisted environment variable can alter behavior of subsequent commands",
    };
  let expansionKind = classifyDangerousExpansion(command);
  if (expansionKind === "variable")
    return {
      behavior: "passthrough",
      message: "Command contains unquoted variable expansion",
    };
  if (containsVulnerableUncPath(command))
    return {
      behavior: "ask",
      message: "Command contains Windows UNC path that could be vulnerable to WebDAV attacks",
    };
  let any = parsed.commands.some((command) => isNormalizedGitCommand(command.text));
  if ((compoundCommandHasCd || parsed.commands.some((command) => isNormalizedCdCommand(command.text))) && any)
    return {
      behavior: "passthrough",
      message: "Compound commands with cd and git require permission checks for enhanced security",
    };
  let bareRepoWarning = any && !isOfflineEstimate && isCurrentDirectoryBareGitRepo();
  if (bareRepoWarning)
    return {
      behavior: "passthrough",
      message:
        bareRepoWarning === "bare-indicators"
          ? "The current directory has bare-repo indicators (HEAD/objects/refs outside a .git/ directory). Git may treat it as a git dir and run config/hooks from here, so git commands need approval."
          : "The .git file or symlink here redirects to a location Claude cannot verify is safe (it may have been planted by an untrusted archive). Git commands need approval.",
    };
  if (any && commandWritesToGitInternalPaths(command))
    return {
      behavior: "passthrough",
      message:
        "Compound commands that create git internal files and run git require permission checks for enhanced security",
    };
  if (any && !isOfflineEstimate && SandboxManager.isSandboxingEnabled() && getCwd() !== getOriginalCwd())
    return {
      behavior: "passthrough",
      message:
        "Git commands outside the original working directory require permission checks when sandbox is enabled",
    };
  let blockingCommand;
  if (
    parsed.commands.length > 0 &&
    parsed.commands.every((command) => {
      blockingCommand = command;
      if (
        command.redirects.some(
          (redirect) =>
            !INPUT_REDIRECT_OPS.has(redirect.op) &&
            redirect.target !== "/dev/null" &&
            !(redirect.op === ">&" && /^\d+$/.test(redirect.target)),
        )
      )
        return false;
      if (command.redirects.some((redirect) => /^\/dev\/(tcp|udp)\//.test(redirect.target))) return false;
      if (
        command.redirects.some(
          (redirect) => redirect.op === "<" && containsVulnerableUncPath(redirect.target, true),
        )
      )
        return false;
      if (
        getPlatform() === "windows" &&
        command.redirects.some(
          (redirect) => redirect.op === "<" && /(?<![:\w])[\\/]{2,}[^ \t\r\n\f\v\\/]/.test(redirect.target),
        )
      )
        return false;
      if (command.envVars.some((envVar) => !isSafeEnvAssignment(envVar.name, envVar.value))) return false;
      if (
        command.argv.some((arg) => containsVulnerableUncPath(arg, true)) ||
        command.envVars.some(
          (envVar) => envVar.isAppend || containsVulnerableUncPath(envVar.value.replace(/^:/, ""), true),
        )
      )
        return false;
      if (
        command.argv.slice(1).some(isTildeUserPath) ||
        command.redirects.some((redirect) => redirect.op === "<" && isTildeUserPath(redirect.target))
      )
        return false;
      if (
        getPlatform() === "windows" &&
        command.argv.some((env) => /(?<![:\w])[\\/]{2,}[^ \t\r\n\f\v\\/]/.test(env))
      )
        return false;
      let hasGitCommand = stripCommandBuiltinPrefixes(command.argv);
      if (hasUnsafeGlobSource(command)) return false;
      if (
        classifyDangerousExpansion(command.text) === "glob" ||
        (expansionKind === "glob" && command.argv.some((subcmd) => /[*?]|\[.*\]/.test(subcmd)))
      )
        return SIMPLE_READ_COMMANDS.has(hasGitCommand[0] ?? "");
      let readOnlyVerdict = isReadOnlyArgv(hasGitCommand);
      if (readOnlyVerdict !== null) return readOnlyVerdict;
      return isCommandReadOnly(stripCommandPrefixes(command.text));
    })
  )
    return {
      behavior: "allow",
      updatedInput: input,
    };
  return {
    behavior: "passthrough",
    message: "Command is not read-only, requires further permission checks",
    ...(blockingCommand !== undefined && {
      notReadOnlyCommand: blockingCommand.text,
    }),
  };
}
export {
  GIT_INTERNAL_PATH_PATTERNS,
  checkReadOnlyConstraints,
  NON_CREATING_WRITE_COMMANDS,
  isXargsToSafeFilter,
  commandWritesToGitInternalPaths,
  hasUnsafeGlobSource,
  runWithRefusedReading,
  runWithDivergentShapes,
};
