/**
 * tools/BashTool/readOnlyValidation.ts
 *
 * Bash 只读判定：只读命令白名单 COMMAND_ALLOWLIST（选项级）、只读正则、git 内部路径写入检测、checkReadOnlyConstraints
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/readOnlyValidation.ts
 * pieces: chunk-e6aww6q8.js (24)
 * attribution: fingerprint 12, layout 6, affinity 1, file-local 1, placement 3, sole-consumer 1
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import {
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
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
import { lyr } from "../../utils/bash/bashReadingFlags.js";
import { stripCommandBuiltinPrefixes } from "./bashSecurity.js";
import {
  Cye,
  lazySessionEnvVarNames,
  hasRiskyBareAssignment,
  isNormalizedGitCommand,
  oT,
  isSafeEnvAssignment,
} from "./bashPermissions.js";
import {
  stripWrappersFromArgvForPaths,
  normalizeCommandName,
  COMMAND_OPERATION_TYPE,
  PATH_EXTRACTORS,
  VIo,
} from "./pathValidation.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { hasSubshellNode, YIo } from "./_new/hasSubshellNode.js";
import { isCurrentDirectoryBareGitRepo } from "../../utils/git.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { getCwd } from "../../utils/cwd.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

/**
 * fd 与 grep 的安全选项表（选项 → none/number/string 值类型），以及开关名 tengu_tender_thunder 与 refused 读法用的 AsyncLocalStorage。
 */
//@ chunk-e6aww6q8.js:1127784-1130683 fingerprint = FD_SAFE_FLAGS (0.67)
var FD_SAFE_FLAGS = {
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
  },
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
  },
  TENGU_TENDER_THUNDER = "tengu_tender_thunder",
  RIo = /^[A-Za-z0-9:,]+$/,
  refusedReadingStore = new AsyncLocalStorage();
/**
 * 在 refused 读法上下文中运行权限检查（off 指示是否关闭差异读法），返回结果与是否发生过 refused 读法。
 */
//@ chunk-e6aww6q8.js:1130683-1130784 layout
async function runWithRefusedReading(e, n) {
  let r = { off: e, refused: !1 };
  return { result: await refusedReadingStore.run(r, n), refused: r.refused };
}
//@ chunk-e6aww6q8.js:1130784-1130800 layout
var G2t = new AsyncLocalStorage();
/**
 * 在 divergentShapes 上下文中运行回调（让解析器按另一种读法分析）。
 */
//@ chunk-e6aww6q8.js:1130800-1130838 layout
function Mze(e, n) {
  return G2t.run(e, n);
}
/**
 * 只读命令白名单 COMMAND_ALLOWLIST：xargs、git 只读子命令、file、sed、sort、man、help、netstat、ps、base64、grep、rg、fd、checksum、tree、date、hostname、info、lsof、pgrep、tput、ss、jq、uniq、history、arch、ifconfig、pyright 等，每项给出安全选项表、可选 regex 与额外危险回调。_Ca 是含内部 aki 命令的扩展表。
 */
//@ chunk-e6aww6q8.js:1130838-1144132 fingerprint = COMMAND_ALLOWLIST (0.835)
var COMMAND_ALLOWLIST = {
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
      additionalCommandIsDangerousCallback: (e, n) => !sedCommandIsAllowedByAllowlist(e),
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
      additionalCommandIsDangerousCallback: (e, n) => {
        for (let w = 0; w < n.length; w++) {
          let L = n[w];
          if (L === "--" || L === "-" || !L.startsWith("-")) break;
          let G;
          if (L === "-S" || L === "-s") (w++, (G = n[w] ?? ""));
          else if (L.startsWith("-S=") || L.startsWith("-s=")) G = L.slice(2);
          if (G === void 0 || RIo.test(G)) continue;
          let store = refusedReadingStore.getStore();
          if (store?.off !== !0 && readFlagWithOverride(TENGU_TENDER_THUNDER, { safe: !0 })) {
            if (store !== void 0) store.refused = !0;
            return !0;
          }
        }
        let r = new Set(["-k", "-f", "--apropos", "--whatis"]),
          s = new Set(["-S", "-s"]),
          h = !1;
        for (let w of n) {
          if (w === "--") break;
          if (!w.startsWith("-") || w === "-") continue;
          if (w.startsWith("--")) {
            if (r.has(w)) h = !0;
          } else if (/[kf]/.test(w.slice(1))) h = !0;
        }
        let y = !1,
          S = !1;
        for (let w = 0; w < n.length; w++) {
          let L = n[w];
          if (!S && L === "--") {
            S = !0;
            continue;
          }
          if (!(S || !L.startsWith("-") || L === "-")) {
            if (r.has(L)) y = !0;
            else if (s.has(L)) w++;
            continue;
          }
          if (((S = !0), containsAnyPlaceholder(L))) return !0;
          if (h && L.startsWith("-")) return !0;
          if (!y && (L.includes("/") || L.includes("\\") || L.includes("~"))) return !0;
        }
        return !1;
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
      additionalCommandIsDangerousCallback: (e, n) =>
        hasTildeArg(n) || n.some((r) => r.includes("/") || r.includes("\\") || containsAnyPlaceholder(r)),
      safeFlags: { "-d": "none" },
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
      respectsDoubleDash: !1,
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
      additionalCommandIsDangerousCallback: (e, n) => {
        let any = n.some((S) => !isFlagToken(S) && /[eE]/.test(S)),
          any_2 = n.some((S) => /^-[a-zA-Z]*e/.test(S)),
          all = n.every((S) => S === "--forest" || /^-[AacdeFfjlwHLTm]+$/.test(S)),
          flattened = n.flatMap((S) => (S === "--forest" ? [S] : (S.match(/[HLTm]/g) ?? [])));
        return any || (any_2 && !(all && flattened.length <= 1));
      },
    },
    base64: {
      respectsDoubleDash: !1,
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
    grep: { safeFlags: GREP_SAFE_FLAGS },
    egrep: { safeFlags: GREP_SAFE_FLAGS },
    fgrep: { safeFlags: GREP_SAFE_FLAGS },
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
      additionalCommandIsDangerousCallback: (e, n) => {
        let r = new Set(["-d", "--date", "-r", "--reference", "--rfc-3339"]),
          s = 0;
        while (s < n.length) {
          let h = n[s];
          if (h.startsWith("--") && h.includes("=")) s++;
          else if (h.startsWith("-"))
            if (r.has(h)) s += 2;
            else s++;
          else {
            if (!h.startsWith("+")) return !0;
            s++;
          }
        }
        return !1;
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
      additionalCommandIsDangerousCallback: (e, n) => {
        for (let r = 0; r < n.length; r++) {
          let s = n[r];
          if (s === "+m" || s.startsWith("+m")) return !0;
          if (/^-[a-zA-Z]*i\S*@/.test(s)) {
            let h = firstLineOf(s.slice(s.indexOf("@") + 1), ":");
            if (/[a-zA-Z]/.test(h)) return !0;
          }
          if (/^-[a-zA-Z]*i$/.test(s)) {
            let h = n[r + 1] ?? "";
            if (h.includes("~")) return !0;
            if (h.includes("@")) {
              let y = firstLineOf(h.slice(h.indexOf("@") + 1), ":");
              if (/[a-zA-Z]/.test(y)) return !0;
            }
          }
        }
        return !1;
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
      safeFlags: { "-T": "string", "-V": "none", "-x": "none" },
      additionalCommandIsDangerousCallback: (e, n) => {
        let r = new Set([
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
          ]),
          s = new Set(["-T"]),
          h = 0,
          y = !1;
        while (h < n.length) {
          let S = n[h];
          if (S === "--") ((y = !0), h++);
          else if (!y && S.startsWith("-")) {
            if (S === "-S") return !0;
            if (!S.startsWith("--") && S.length > 2 && S.includes("S")) return !0;
            if (s.has(S)) h += 2;
            else h++;
          } else {
            if (r.has(S)) return !0;
            h++;
          }
        }
        return !1;
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
      additionalCommandIsDangerousCallback: (e, n) => {
        let r =
            /^(dst|src|dport|sport|and|or|not|eq|ne|ge|le|gt|lt|autobound|state|exclude|dev|fwmark|cgroup)$/,
          s = /^(state|exclude|dport|sport|dev|fwmark|cgroup)$/,
          h = /^(-f|--family|-A|--query|--socket)$/,
          y = [],
          S = !1;
        for (let G = 0; G < n.length; G++) {
          let q = n[G];
          if (!S && q === "--") {
            S = !0;
            continue;
          }
          if (!S && q.startsWith("-")) {
            if (h.test(q)) G++;
            continue;
          }
          y.push(q);
        }
        if (hasTildeArg(y)) return !0;
        let filtered = y
            .join(" ")
            .split(/[\s()=!<>&|,]+/)
            .filter(Boolean),
          L = !1;
        for (let G of filtered) {
          if (L) {
            L = !1;
            continue;
          }
          if (r.test(G)) {
            L = s.test(G);
            continue;
          }
          if (/[g-zG-Z]/.test(G) || (/[a-fA-F]/.test(G) && (G.includes(".") || !G.includes(":")))) return !0;
        }
        return !1;
      },
    },
    fd: { safeFlags: { ...FD_SAFE_FLAGS } },
    fdfind: { safeFlags: { ...FD_SAFE_FLAGS } },
    ...DOCKER_READ_ONLY_COMMANDS,
    test: {
      respectsDoubleDash: !1,
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
      additionalCommandIsDangerousCallback: (e, n) => {
        if (n.some((r) => r === "-v" || r === "-R" || r === "-a" || r === "-o" || /\[/.test(r))) return !0;
        for (let r = 0; r < n.length; r++) {
          if (TEST_ARITH_CMP_OPS.has(n[r])) {
            for (let s of [n[r - 1], n[r + 1]]) if (s !== void 0 && !TEST_ARITH_NUMERIC_RE.test(s)) return !0;
          }
          if (n[r] === "-t") {
            let s = n[r + 1];
            if (s !== void 0 && !TEST_ARITH_NUMERIC_RE.test(s)) return !0;
          }
        }
        return !1;
      },
    },
  },
  _Ca = {
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
      additionalCommandIsDangerousCallback: (e, n) => hasTildeExpansion(n) || n.some(containsAnyPlaceholder),
    },
  };
/**
 * 返回只读白名单；Windows 上去掉 xargs。
 */
//@ chunk-e6aww6q8.js:1144132-1144210 fingerprint = getCommandAllowlist (0.427)
function getCommandAllowlist() {
  let allowlist = COMMAND_ALLOWLIST;
  if (getPlatform() === "windows") {
    let { xargs: xargs, ...r } = allowlist;
    allowlist = r;
  }
  return allowlist;
}
//@ chunk-e6aww6q8.js:1144210-1144304 fingerprint = SAFE_TARGET_COMMANDS_FOR_XARGS (0.82)
var SAFE_XARGS_OUTPUT_COMMANDS = ["echo", "printf", "wc"],
  SAFE_XARGS_FILTER_COMMANDS = ["grep", "egrep", "fgrep", "head", "tail"],
  SAFE_TARGET_COMMANDS_FOR_XARGS = [...SAFE_XARGS_OUTPUT_COMMANDS, ...SAFE_XARGS_FILTER_COMMANDS];
/**
 * xargs 后接的命令是否是安全过滤命令（grep/egrep/fgrep/head/tail）。
 */
//@ chunk-e6aww6q8.js:1144468-1144738 affinity
function isXargsToSafeFilter(e) {
  if (e[0] !== "xargs") return !1;
  let n = COMMAND_ALLOWLIST.xargs?.safeFlags ?? {};
  for (let r = 1; r < e.length; r++) {
    let s = e[r];
    if (s === "--") return SAFE_XARGS_FILTER_COMMANDS.includes(e[r + 1] ?? "");
    if (s.startsWith("-")) {
      if (s.length === 2 && n[s] !== void 0 && n[s] !== "none") r++;
      continue;
    }
    return SAFE_XARGS_FILTER_COMMANDS.includes(s);
  }
  return !1;
}
/**
 * 按白名单解析选项判断命令是否只读：匹配命令前缀、git ls-remote 只允许选项、参数含 $ 或花括号展开即否、逐个校验选项与值、regex/反引号/换行限制、额外危险回调。
 */
//@ chunk-e6aww6q8.js:1144738-1145795 fingerprint = isCommandSafeViaFlagParsing (0.624)
function isCommandSafeViaFlagParsing(command) {
  let n = getCommandArgv(command);
  if (n.length === 0) return !1;
  let commandConfig,
    s = 0,
    allowlist = getCommandAllowlist();
  for (let [y] of Object.entries(allowlist)) {
    let cmdTokens = y.split(" ");
    if (n.length >= cmdTokens.length) {
      let w = !0;
      for (let L = 0; L < cmdTokens.length; L++)
        if (n[L] !== cmdTokens[L]) {
          w = !1;
          break;
        }
      if (w) {
        ((commandConfig = allowlist[y]), (s = cmdTokens.length));
        break;
      }
    }
  }
  if (!commandConfig) return !1;
  if (n[0] === "git" && n[1] === "ls-remote") {
    if (n.some((S) => S === "-o" || S === "--server-option" || S.startsWith("--server-option="))) return !1;
    let y = !1;
    for (let S = 2; S < n.length; S++) {
      let w = n[S];
      if (!w) continue;
      if (!y && w === "--") {
        y = !0;
        continue;
      }
      if (y || w === "-" || !w.startsWith("-")) return !1;
    }
  }
  for (let y = s; y < n.length; y++) {
    let S = n[y];
    if (!S) continue;
    if (S.includes("$")) return !1;
    if (S.includes("{") && (S.includes(",") || S.includes(".."))) return !1;
  }
  if (
    !validateFlags(n, s, commandConfig, {
      commandName: n[0],
      rawCommand: command,
      xargsTargetCommands: n[0] === "xargs" ? SAFE_TARGET_COMMANDS_FOR_XARGS : void 0,
    })
  )
    return !1;
  if (commandConfig.regex && !commandConfig.regex.test(command)) return !1;
  if (!commandConfig.regex && /`/.test(command)) return !1;
  if (
    !commandConfig.regex &&
    (n[0] === "rg" || n[0] === "grep" || n[0] === "egrep" || n[0] === "fgrep") &&
    /[\n\r]/.test(command)
  )
    return !1;
  if (
    commandConfig.additionalCommandIsDangerousCallback &&
    commandConfig.additionalCommandIsDangerousCallback(command, n.slice(s))
  )
    return !1;
  return !0;
}
/**
 * 为只读命令生成正则：命令后不能出现 < > ( ) $ ` | { } & ; 换行。
 */
//@ chunk-e6aww6q8.js:1145795-1145870 fingerprint = makeRegexForSafeCommand (1)
function makeRegexForSafeCommand(command) {
  return new RegExp(`^${command}(?:\\s|$)[^<>()$\`|{}&;\\n\\r]*$`);
}
/**
 * 基础只读命令列表（cat/head/tail/wc/stat/id/uname/df/du/realpath/diff/true/false/sleep/which/expr/seq…）及派生集合；find 的写动作（-delete/-exec/-fprint…）；printf 格式检查正则；固定只读 argv（claude -h、node -v、python --version、ip addr）。
 */
//@ chunk-e6aww6q8.js:1145870-1146704 fingerprint = READONLY_COMMANDS (0.719)
var READONLY_COMMANDS = [
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
  ],
  READONLY_COMMAND_SET = new Set(READONLY_COMMANDS),
  MULTI_WORD_READONLY_COMMANDS = READONLY_COMMANDS.filter((e) => e.includes(" ")),
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
  ]),
  SAFE_NO_ARG_COMMANDS = new Set(["pwd", "whoami", "alias"]),
  PRINTF_LENGTH_MODIFIERS = "[lLhqjzZt]*",
  regExp_7 = new RegExp(`%[^%a-zA-Z]*${PRINTF_LENGTH_MODIFIERS}\\\\[0-7xX]`),
  regExp_8 = new RegExp(`%[-+ 0#']*[0-9.*]*${PRINTF_LENGTH_MODIFIERS}[diouxXeEfFgGaAn]`),
  READONLY_EXACT_ARGV = [
    ["claude", "-h"],
    ["claude", "--help"],
    ["node", "-v"],
    ["node", "--version"],
    ["python", "--version"],
    ["python3", "--version"],
    ["ip", "addr"],
  ];
/**
 * 按 argv 判断命令是否只读：无参命令、精确 argv 白名单、只读命令集、多词只读命令（docker 额外检查危险参数），以及 echo、printf（格式与参数安全）、[[（算术比较）、ls、cd、find（无写动作）、history 等特例；无法判断返回 null。
 */
//@ chunk-e6aww6q8.js:1146704-1148365 layout
function isReadOnlyArgv(e) {
  if (e.length === 0) return !1;
  let n = e[0];
  if (SAFE_NO_ARG_COMMANDS.has(n)) return e.length === 1;
  for (let s of READONLY_EXACT_ARGV) if (e.length === s.length && e.every((h, y) => h === s[y])) return !0;
  if (READONLY_COMMAND_SET.has(n)) return !0;
  for (let s of MULTI_WORD_READONLY_COMMANDS) {
    let parts = s.split(" ");
    if (e.length >= parts.length && parts.every((y, S) => e[S] === y)) {
      if (
        parts[0] === "docker" &&
        (hasDockerDangerousFlag(e) ||
          hasTildeExpansion(e.slice(parts.length)) ||
          e.slice(parts.length).some(containsAnyPlaceholder))
      )
        return !1;
      return !0;
    }
  }
  if (n === "echo") return !0;
  let r = /^[-+]?(0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)$/;
  if (n === "printf") {
    if (e[1]?.startsWith("-") && e[1] !== "--") return !1;
    let s = e[1] === "--" ? 2 : 1,
      h = e[s] ?? "";
    if (containsAnyPlaceholder(h)) return !1;
    if (h.includes("$")) return !1;
    let replaced = h.replace(/%%/g, "");
    if (regExp_7.test(replaced) || /\\[uU]/.test(replaced)) return !1;
    if (regExp_8.test(replaced) || /%[^%a-zA-Z]*\*/.test(replaced))
      for (let S = s + 1; S < e.length; S++) {
        let w = e[S];
        if (w.includes("[") || w.includes("`") || w.includes("$(") || containsAnyPlaceholder(w) || !r.test(w))
          return !1;
      }
    return !0;
  }
  if (n === "[[") {
    for (let s = 1; s < e.length; s++) {
      let h = e[s],
        y = e[s + 1];
      if (
        (h === "-v" || h === "-R" || h === "-t") &&
        y !== void 0 &&
        (y.includes("[") || containsAnyPlaceholder(y))
      )
        return !1;
      if (h === "-t" && y !== void 0 && !TEST_ARITH_NUMERIC_RE.test(y)) return !1;
      if (TEST_ARITH_CMP_OPS.has(h)) {
        for (let S of [e[s - 1], e[s + 1]])
          if (S !== void 0 && (S.includes("[") || !TEST_ARITH_NUMERIC_RE.test(S))) return !1;
      }
    }
    return !0;
  }
  if (n === "ls") return !0;
  if (n === "cd") return e.length <= 2;
  if (n === "find") {
    let s = !1;
    for (let h = 1; h < e.length; h++) {
      let y = e[h],
        S = s;
      if (((s = !1), FIND_WRITE_ACTIONS.has(y) && lyr(y))) return !1;
      if (isAmbiguousFindWord(y)) return !1;
      if (!S && findWordTakesFlagValue(y)) {
        s = !0;
        continue;
      }
      if (!S && findWordTakesOperand(y)) {
        h++;
        continue;
      }
      if (containsAnyPlaceholder(y)) return !1;
    }
    return !0;
  }
  if (n === "history") return e.length === 1 || (e.length === 2 && /^\d+$/.test(e[1]));
  if (n === "arch") return e.length === 1 || (e.length === 2 && (e[1] === "-h" || e[1] === "--help"));
  if (n === "ifconfig") return e.length === 1 || (e.length === 2 && /^[a-zA-Z]/.test(e[1]));
  return null;
}
//@ chunk-e6aww6q8.js:1148365-1149287 file-local
var READONLY_COMMAND_REGEXES = new Set([
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
//@ chunk-e6aww6q8.js:1150001-1150251 placement
var SIMPLE_READ_COMMANDS = new Set([
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
//@ chunk-e6aww6q8.js:1150251-1150349 placement
function jIo(e) {
  return e.argvUnquotedGlob === void 0 && e.argv[0] === "[[" && /^\[\[[ \t\n]/.test(e.text);
}
//@ chunk-e6aww6q8.js:1150349-1150423 placement
function Ize(e) {
  return (
    !jIo(e) &&
    hasSourceUnquotedGlob(e) &&
    !SIMPLE_READ_COMMANDS.has(stripCommandBuiltinPrefixes(e.argv)[0] ?? "") &&
    Cye()
  );
}
/**
 * 单条命令是否只读：排除 UNC 路径、未加引号变量；先走选项白名单解析，再走只读正则（find 写动作、git -c/--exec-path/--config-env 除外）。
 */
//@ chunk-e6aww6q8.js:1150423-1150962 fingerprint = isCommandReadOnly (0.704)
function isCommandReadOnly(command) {
  let testCommand = command.trim();
  if (testCommand.endsWith(" 2>&1")) testCommand = testCommand.slice(0, -5).trim();
  if (containsVulnerableUncPath(testCommand)) return !1;
  if (classifyDangerousExpansion(testCommand) === "variable") return !1;
  if (isCommandSafeViaFlagParsing(testCommand)) return !0;
  for (let regex of READONLY_COMMAND_REGEXES)
    if (regex.test(testCommand)) {
      if (testCommand.startsWith("find")) {
        let replaced = testCommand.replace(/['"\\]/g, "");
        if (
          /-delete\b|-rm\b|-exec\b|-execdir\b|-ok\b|-okdir\b|-fprint0?\b|-fls\b|-fprintf\b|-files0-from\b/.test(
            replaced,
          )
        )
          return !1;
      }
      if (testCommand.includes("git") && /\s-c[\s=]/.test(testCommand)) return !1;
      if (testCommand.includes("git") && /\s--exec-path[\s=]/.test(testCommand)) return !1;
      if (testCommand.includes("git") && /\s--config-env[\s=]/.test(testCommand)) return !1;
      return !0;
    }
  return !1;
}
/**
 * git 内部路径模式：head、objects/、refs/、hooks/。
 */
//@ chunk-e6aww6q8.js:1150962-1151033 layout
var GIT_INTERNAL_PATH_PATTERNS = [/^head$/, /^objects(?:\/|$)/, /^refs(?:\/|$)/, /^hooks(?:\/|$)/];
/**
 * 路径（规范化、小写、去土耳其 ı/长 s 混淆）是否是 git 内部结构：HEAD、objects/、refs/、hooks/。
 */
//@ chunk-e6aww6q8.js:1151033-1151209 layout
function isGitInternalPath(e) {
  let normalized = posix_5.normalize(e.replace(/\/+/g, "/"));
  return (
    (normalized = normalized
      .replace(/^\.?\//, "")
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u017f/g, "s")),
    GIT_INTERNAL_PATH_PATTERNS.some((r) => r.test(normalized))
  );
}
/**
 * 不新建文件的写命令（rm/rmdir/sed），提取写路径时排除。
 */
//@ chunk-e6aww6q8.js:1151209-1151247 fingerprint = NON_CREATING_WRITE_COMMANDS (1)
var NON_CREATING_WRITE_COMMANDS = new Set(["rm", "rmdir", "sed"]);
/**
 * 从子命令中提取会创建/写入的路径（写/建类命令，排除 rm/rmdir/sed）。
 */
//@ chunk-e6aww6q8.js:1151247-1151500 fingerprint = extractWritePathsFromSubcommand (0.889)
function extractWritePathsFromSubcommand(subcommand) {
  let n = stripWrappersFromArgvForPaths(getCommandArgv(subcommand));
  if (n.length === 0) return [];
  let r = normalizeCommandName(n[0]?.replace(/[\\'"]/g, ""));
  if (!r) return [];
  if (!Object.hasOwn(COMMAND_OPERATION_TYPE, r)) return [];
  let s = COMMAND_OPERATION_TYPE[r];
  if ((s !== "write" && s !== "create") || NON_CREATING_WRITE_COMMANDS.has(r)) return [];
  let h = PATH_EXTRACTORS[r];
  if (!h) return [];
  return h(n.slice(1));
}
/**
 * 命令是否会写入 git 内部路径（HEAD/objects/refs/hooks），含 cp/mv 到当前目录的情形和输出重定向；用于阻止"先造 git 结构再运行 git"的攻击。
 */
//@ chunk-e6aww6q8.js:1151500-1151910 fingerprint = commandWritesToGitInternalPaths (0.835)
function commandWritesToGitInternalPaths(command) {
  let subcommands = splitCommand(command);
  for (let subcmd of subcommands) {
    let trimmed = subcmd.trim(),
      writePaths = extractWritePathsFromSubcommand(trimmed),
      w = stripWrappersFromArgvForPaths(getCommandArgv(trimmed))[0]?.replace(/[\\'"]/g, ""),
      L = w === "cp" || w === "mv",
      at = writePaths.at(-1),
      q = at !== void 0 && (at === "." || at === "./" || at === "" || /^(?:\.\.\/)*\.\.\/?$/.test(at));
    for (let path of writePaths) {
      if (isGitInternalPath(path)) return !0;
      if (L && q && path !== at) {
        let Se = path.replace(/\/+$/, "").split("/").pop() ?? "";
        if (isGitInternalPath(Se)) return !0;
      }
    }
  }
  let { redirections: redirections } = extractOutputRedirections(command);
  for (let { target: target } of redirections) if (isGitInternalPath(target)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:1155721-1155859 sole-consumer
function hasBackgroundOperator(e) {
  if (!STRUCTURAL_TYPES_2.has(e.type)) return !1;
  for (let n of e.children) {
    if (!n) continue;
    if (n.type === "&") return !0;
    if (hasBackgroundOperator(n)) return !0;
  }
  return !1;
}
/**
 * Bash 只读判定：tree-sitter 解析，too-complex、子 shell、后台 &、可疑裸赋值、未加引号变量、UNC 路径、cd+git、裸仓库迹象/不可信 .git 重定向、写 git 内部文件、沙箱下非原始目录的 git 都不算只读；每个简单命令检查重定向、env 前缀、UNC、通配，再走只读白名单。全部通过返回 allow，否则 passthrough（带 notReadOnlyCommand）。BashTool.isReadOnly 与 isConcurrencySafe 依赖它。
 */
//@ chunk-e6aww6q8.js:1155859-1159153 fingerprint = checkReadOnlyConstraints (0.416)
function checkReadOnlyConstraints(input, compoundCommandHasCd, options) {
  let { command: command } = input,
    h = options?.offlineEstimate === !0;
  if (command.length > SPLIT_MAX_LEN)
    return { behavior: "passthrough", message: "Command too long for read-only analysis" };
  let parse = getParserModule().parse(command),
    S = parse
      ? parseForSecurityFromAst(command, parse, { readsDivergentShapes: G2t.getStore() === !0 })
      : { kind: "simple", commands: [], bareAssignmentNames: [] };
  if (S.kind === "too-complex")
    return { behavior: "passthrough", message: `Not a simple read-only command: ${S.reason}` };
  if (parse && hasSubshellNode(parse))
    return { behavior: "passthrough", message: "Not a simple read-only command: contains a subshell" };
  if (parse && hasBackgroundOperator(parse))
    return {
      behavior: "passthrough",
      message: "Not a simple read-only command: `&` defers execution past approval-time checks",
    };
  let w = h ? () => new Set() : lazySessionEnvVarNames(options?.sessionEnvVarKeys);
  if (hasRiskyBareAssignment(S.bareAssignmentNames, w))
    return {
      behavior: "passthrough",
      message:
        "Bare assignment to a non-allowlisted environment variable can alter behavior of subsequent commands",
    };
  let L = classifyDangerousExpansion(command);
  if (L === "variable")
    return { behavior: "passthrough", message: "Command contains unquoted variable expansion" };
  if (containsVulnerableUncPath(command))
    return {
      behavior: "ask",
      message: "Command contains Windows UNC path that could be vulnerable to WebDAV attacks",
    };
  let any = S.commands.some((command) => isNormalizedGitCommand(command.text));
  if ((compoundCommandHasCd || S.commands.some((command) => oT(command.text))) && any)
    return {
      behavior: "passthrough",
      message: "Compound commands with cd and git require permission checks for enhanced security",
    };
  let Z = any && !h && isCurrentDirectoryBareGitRepo();
  if (Z)
    return {
      behavior: "passthrough",
      message:
        Z === "bare-indicators"
          ? "The current directory has bare-repo indicators (HEAD/objects/refs outside a .git/ directory). Git may treat it as a git dir and run config/hooks from here, so git commands need approval."
          : "The .git file or symlink here redirects to a location Claude cannot verify is safe (it may have been planted by an untrusted archive). Git commands need approval.",
    };
  if (any && commandWritesToGitInternalPaths(command))
    return {
      behavior: "passthrough",
      message:
        "Compound commands that create git internal files and run git require permission checks for enhanced security",
    };
  if (any && !h && SandboxManager.isSandboxingEnabled() && getCwd() !== getOriginalCwd())
    return {
      behavior: "passthrough",
      message:
        "Git commands outside the original working directory require permission checks when sandbox is enabled",
    };
  let Se;
  if (
    S.commands.length > 0 &&
    S.commands.every((command) => {
      if (
        ((Se = command),
        command.redirects.some(
          (redirect) =>
            !VIo.has(redirect.op) &&
            redirect.target !== "/dev/null" &&
            !(redirect.op === ">&" && /^\d+$/.test(redirect.target)),
        ))
      )
        return !1;
      if (command.redirects.some((redirect) => /^\/dev\/(tcp|udp)\//.test(redirect.target))) return !1;
      if (
        command.redirects.some(
          (redirect) => redirect.op === "<" && containsVulnerableUncPath(redirect.target, !0),
        )
      )
        return !1;
      if (
        getPlatform() === "windows" &&
        command.redirects.some(
          (redirect) => redirect.op === "<" && /(?<![:\w])[\\/]{2,}[^ \t\r\n\f\v\\/]/.test(redirect.target),
        )
      )
        return !1;
      if (command.envVars.some((envVar) => !isSafeEnvAssignment(envVar.name, envVar.value))) return !1;
      if (
        command.argv.some((Ie) => containsVulnerableUncPath(Ie, !0)) ||
        command.envVars.some(
          (envVar) => envVar.isAppend || containsVulnerableUncPath(envVar.value.replace(/^:/, ""), !0),
        )
      )
        return !1;
      if (
        command.argv.slice(1).some(isTildeUserPath) ||
        command.redirects.some((redirect) => redirect.op === "<" && isTildeUserPath(redirect.target))
      )
        return !1;
      if (
        getPlatform() === "windows" &&
        command.argv.some((env) => /(?<![:\w])[\\/]{2,}[^ \t\r\n\f\v\\/]/.test(env))
      )
        return !1;
      let hasGitCommand = stripCommandBuiltinPrefixes(command.argv);
      if (Ize(command)) return !1;
      if (
        classifyDangerousExpansion(command.text) === "glob" ||
        (L === "glob" && command.argv.some((subcmd) => /[*?]|\[.*\]/.test(subcmd)))
      )
        return SIMPLE_READ_COMMANDS.has(hasGitCommand[0] ?? "");
      let Ae = isReadOnlyArgv(hasGitCommand);
      if (Ae !== null) return Ae;
      return isCommandReadOnly(YIo(command.text));
    })
  )
    return { behavior: "allow", updatedInput: input };
  return {
    behavior: "passthrough",
    message: "Command is not read-only, requires further permission checks",
    ...(Se !== void 0 && { notReadOnlyCommand: Se.text }),
  };
}

export {
  checkReadOnlyConstraints,
  isXargsToSafeFilter,
  Ize,
  runWithRefusedReading,
  Mze,
  commandWritesToGitInternalPaths,
  GIT_INTERNAL_PATH_PATTERNS,
  NON_CREATING_WRITE_COMMANDS,
};
