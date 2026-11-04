/**
 * utils/shell/readOnlyCommandValidation.ts
 *
 * 外部命令只读白名单（git/gh/docker/rg 的 safeFlags 与附加危险检查）、flag 校验 validateFlags、~ 展开与 Windows UNC 路径检测；本段混入大量 URL/remote 解析等误归代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/readOnlyCommandValidation.ts
 * pieces: chunk-2a8yx6fc.js (1), chunk-82kqcve8.js (22)
 * attribution: fingerprint 7, layout 15, file-local 1
 */
import { containsAnyPlaceholder, startsWithAnyPlaceholder } from "../bash/ast.js";
import { firstLineOf } from "../stringUtils.js";
import { getPlatform } from "../platform.js";
import { isUncOrDevicePath } from "../pathClassification.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isValidRemotePathSegment } from "../../services/autoModeSetup/homeRepoScan.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:196286-196948 fingerprint (2.1.88 match: GIT_LOG_DISPLAY_FLAGS, 0.352)
/**
 * git 只读子命令共用的 flag 白名单片段（flag → 参数类型 none/string/number）。另含 %G / %(signature) 格式占位正则：会触发 gpg 验签（执行外部程序），所以格式串里出现即视为危险。
 */
var GIT_REF_SELECTION_FLAGS = {
  "--all": "none",
  "--branches": "none",
  "--tags": "none",
  "--remotes": "none",
};
var GIT_DATE_FILTER_FLAGS = {
  "--since": "string",
  "--after": "string",
  "--until": "string",
  "--before": "string",
};
var GIT_LOG_DISPLAY_FLAGS = {
  "--oneline": "none",
  "--graph": "none",
  "--decorate": "none",
  "--no-decorate": "none",
  "--date": "string",
  "--relative-date": "none",
};
var GIT_COUNT_FLAGS = {
  "--max-count": "number",
  "-n": "number",
};
var GIT_STAT_FLAGS = {
  "--stat": "none",
  "--numstat": "none",
  "--shortstat": "none",
  "--name-only": "none",
  "--name-status": "none",
};
var GIT_COLOR_FLAGS = {
  "--color": "none",
  "--no-color": "none",
};
var GIT_PATCH_FLAGS = {
  "--patch": "none",
  "-p": "none",
  "--no-patch": "none",
  "--no-ext-diff": "none",
  "-s": "none",
};
var GIT_AUTHOR_FILTER_FLAGS = {
  "--author": "string",
  "--committer": "string",
  "--grep": "string",
};
var GIT_SIGNATURE_FORMAT_PATTERN = /%[-+ ]?G|%\(\*?signature/;
//@ chunk-82kqcve8.js:196948-196994 layout
function mentionsSignature(text) {
  return text.includes("signature");
}
//@ chunk-82kqcve8.js:196994-197069 layout
var BUILTIN_PRETTY_FORMATS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-82kqcve8.js:196994", () => {
  BUILTIN_PRETTY_FORMATS = new Set(["oneline", "short", "medium", "full", "fuller", "email", "raw"]);
});
//@ chunk-82kqcve8.js:197069-197210 layout
/**
 * --format/--pretty 的值不是内置格式名（oneline/short/…）即视为自定义格式（含 %、format:、tformat:）。
 */
function isCustomPrettyFormat(formatArg) {
  if (formatArg === "") return false;
  if (formatArg.includes("%")) return false;
  if (formatArg.startsWith("format:") || formatArg.startsWith("tformat:")) return false;
  return !BUILTIN_PRETTY_FORMATS.has(formatArg);
}
//@ chunk-82kqcve8.js:197210-197581 layout
/**
 * git 参数里 --format/--pretty/--sort/--group 的值含 ~ 展开、占位符、签名格式或自定义 pretty 格式时返回 true。
 */
function hasDangerousGitFormatArg(args) {
  let isDangerousValue = (value) =>
    hasTildeExpansion([value]) ||
    containsAnyPlaceholder(value) ||
    GIT_SIGNATURE_FORMAT_PATTERN.test(value) ||
    mentionsSignature(value);
  for (let j = 0; j < args.length; j++) {
    let arg = args[j];
    if (GIT_SIGNATURE_FORMAT_PATTERN.test(arg)) return true;
    for (let formatFlag of ["--format", "--pretty", "--sort", "--group"]) {
      let formatValue;
      if (arg === formatFlag && j + 1 < args.length) formatValue = args[j + 1];
      else if (arg.startsWith(`${formatFlag}=`)) formatValue = arg.slice(formatFlag.length + 1);
      if (formatValue === undefined) continue;
      if (isDangerousValue(formatValue)) return true;
      if ((formatFlag === "--format" || formatFlag === "--pretty") && isCustomPrettyFormat(formatValue))
        return true;
    }
  }
  return false;
}
//@ chunk-82kqcve8.js:197581-208126 fingerprint (2.1.88 match: GIT_READ_ONLY_COMMANDS, 0.995)
/**
 * git 只读子命令白名单（git diff/log/show/status/blame/ls-files/rev-parse/branch/tag/worktree list 等 24 项）：每项 safeFlags + 可选 additionalCommandIsDangerousCallback（拦格式串、写操作参数）。
 */
var GIT_READ_ONLY_COMMANDS; // deferred: uses GIT_REF_SELECTION_FLAGS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:197581", () => {
  GIT_READ_ONLY_COMMANDS = {
    "git diff": {
      safeFlags: {
        ...GIT_STAT_FLAGS,
        ...GIT_COLOR_FLAGS,
        "--dirstat": "none",
        "--summary": "none",
        "--patch-with-stat": "none",
        "--word-diff": "none",
        "--word-diff-regex": "string",
        "--color-words": "none",
        "--no-renames": "none",
        "--no-ext-diff": "none",
        "--check": "none",
        "--ws-error-highlight": "string",
        "--full-index": "none",
        "--binary": "none",
        "--abbrev": "number",
        "--break-rewrites": "none",
        "--find-renames": "none",
        "--find-copies": "none",
        "--find-copies-harder": "none",
        "--irreversible-delete": "none",
        "--diff-algorithm": "string",
        "--histogram": "none",
        "--patience": "none",
        "--minimal": "none",
        "--ignore-space-at-eol": "none",
        "--ignore-space-change": "none",
        "--ignore-all-space": "none",
        "--ignore-blank-lines": "none",
        "--inter-hunk-context": "number",
        "--function-context": "none",
        "--exit-code": "none",
        "--quiet": "none",
        "--cached": "none",
        "--staged": "none",
        "--pickaxe-regex": "none",
        "--pickaxe-all": "none",
        "--no-index": "none",
        "--relative": "string",
        "--diff-filter": "string",
        "-p": "none",
        "-u": "none",
        "-s": "none",
        "-M": "none",
        "-C": "none",
        "-B": "none",
        "-D": "none",
        "-l": "none",
        "-S": "string",
        "-G": "string",
        "-O": "string",
        "-R": "none",
      },
    },
    "git log": {
      safeFlags: {
        ...GIT_LOG_DISPLAY_FLAGS,
        ...GIT_REF_SELECTION_FLAGS,
        ...GIT_DATE_FILTER_FLAGS,
        ...GIT_COUNT_FLAGS,
        ...GIT_STAT_FLAGS,
        ...GIT_COLOR_FLAGS,
        ...GIT_PATCH_FLAGS,
        ...GIT_AUTHOR_FILTER_FLAGS,
        "--abbrev-commit": "none",
        "--full-history": "none",
        "--dense": "none",
        "--sparse": "none",
        "--simplify-merges": "none",
        "--ancestry-path": "none",
        "--source": "none",
        "--first-parent": "none",
        "--merges": "none",
        "--no-merges": "none",
        "--reverse": "none",
        "--walk-reflogs": "none",
        "--skip": "number",
        "--max-age": "number",
        "--min-age": "number",
        "--no-min-parents": "none",
        "--no-max-parents": "none",
        "--follow": "none",
        "--no-walk": "none",
        "--left-right": "none",
        "--cherry-mark": "none",
        "--cherry-pick": "none",
        "--boundary": "none",
        "--topo-order": "none",
        "--date-order": "none",
        "--author-date-order": "none",
        "--pretty": "string",
        "--format": "string",
        "--diff-filter": "string",
        "-S": "string",
        "-G": "string",
        "--pickaxe-regex": "none",
        "--pickaxe-all": "none",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => hasDangerousGitFormatArg(args),
    },
    "git show": {
      safeFlags: {
        ...GIT_LOG_DISPLAY_FLAGS,
        ...GIT_STAT_FLAGS,
        ...GIT_COLOR_FLAGS,
        ...GIT_PATCH_FLAGS,
        "--abbrev-commit": "none",
        "--word-diff": "none",
        "--word-diff-regex": "string",
        "--color-words": "none",
        "--pretty": "string",
        "--format": "string",
        "--first-parent": "none",
        "--raw": "none",
        "--diff-filter": "string",
        "-m": "none",
        "--quiet": "none",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => hasDangerousGitFormatArg(args),
    },
    "git shortlog": {
      safeFlags: {
        ...GIT_REF_SELECTION_FLAGS,
        ...GIT_DATE_FILTER_FLAGS,
        "-s": "none",
        "--summary": "none",
        "-n": "none",
        "--numbered": "none",
        "-e": "none",
        "--email": "none",
        "-c": "none",
        "--committer": "none",
        "--group": "string",
        "--format": "string",
        "--no-merges": "none",
        "--author": "string",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => hasDangerousGitFormatArg(args),
    },
    "git reflog": {
      safeFlags: {
        ...GIT_LOG_DISPLAY_FLAGS,
        ...GIT_REF_SELECTION_FLAGS,
        ...GIT_DATE_FILTER_FLAGS,
        ...GIT_COUNT_FLAGS,
        ...GIT_AUTHOR_FILTER_FLAGS,
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        let safeSubcommands = new Set(["show", "list"]);
        let DANGEROUS_SUBCOMMANDS = new Set(["expire", "delete", "exists", "drop", "write"]);
        let firstArg = args[0];
        if (firstArg && !firstArg.startsWith("-") && !safeSubcommands.has(firstArg)) return true;
        for (let arg of args) if (DANGEROUS_SUBCOMMANDS.has(arg)) return true;
        return false;
      },
    },
    "git stash list": {
      safeFlags: {
        ...GIT_LOG_DISPLAY_FLAGS,
        ...GIT_REF_SELECTION_FLAGS,
        ...GIT_COUNT_FLAGS,
      },
      respectsDoubleDash: false,
    },
    "git ls-remote": {
      safeFlags: {
        "--branches": "none",
        "-b": "none",
        "--tags": "none",
        "-t": "none",
        "--heads": "none",
        "-h": "none",
        "--refs": "none",
        "--quiet": "none",
        "-q": "none",
        "--exit-code": "none",
        "--get-url": "none",
        "--symref": "none",
        "--sort": "string",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => {
        if (hasDangerousGitFormatArg(args)) return true;
        let afterDoubleDash = false;
        for (let j = 0; j < args.length; j++) {
          let arg = args[j];
          if (!afterDoubleDash && arg === "--") {
            afterDoubleDash = true;
            continue;
          }
          if (!afterDoubleDash && (!arg || arg.startsWith("-"))) {
            if (arg === "--sort") j++;
            continue;
          }
          return true;
        }
        return false;
      },
    },
    "git status": {
      safeFlags: {
        "--short": "none",
        "-s": "none",
        "--branch": "none",
        "-b": "none",
        "--porcelain": "none",
        "--long": "none",
        "--verbose": "none",
        "-v": "none",
        "--untracked-files": "string",
        "-u": "string",
        "--ignored": "none",
        "--ignore-submodules": "string",
        "--column": "none",
        "--no-column": "none",
        "--ahead-behind": "none",
        "--no-ahead-behind": "none",
        "--renames": "none",
        "--no-renames": "none",
        "--find-renames": "string",
        "-M": "string",
      },
    },
    "git blame": {
      safeFlags: {
        ...GIT_COLOR_FLAGS,
        "-L": "string",
        "--porcelain": "none",
        "-p": "none",
        "--line-porcelain": "none",
        "--incremental": "none",
        "--root": "none",
        "--show-stats": "none",
        "--show-name": "none",
        "--show-number": "none",
        "-n": "none",
        "--show-email": "none",
        "-e": "none",
        "-f": "none",
        "--date": "string",
        "-w": "none",
        "--ignore-rev": "string",
        "--ignore-revs-file": "string",
        "-M": "none",
        "-C": "none",
        "--score-debug": "none",
        "--abbrev": "number",
        "-s": "none",
        "-l": "none",
        "-t": "none",
      },
      respectsDoubleDash: false,
    },
    "git ls-files": {
      safeFlags: {
        "--cached": "none",
        "-c": "none",
        "--deleted": "none",
        "-d": "none",
        "--modified": "none",
        "-m": "none",
        "--others": "none",
        "-o": "none",
        "--ignored": "none",
        "-i": "none",
        "--stage": "none",
        "-s": "none",
        "--killed": "none",
        "-k": "none",
        "--unmerged": "none",
        "-u": "none",
        "--directory": "none",
        "--no-empty-directory": "none",
        "--eol": "none",
        "--full-name": "none",
        "--abbrev": "number",
        "--debug": "none",
        "-z": "none",
        "-t": "none",
        "-v": "none",
        "-f": "none",
        "--exclude": "string",
        "-x": "string",
        "--exclude-from": "string",
        "-X": "string",
        "--exclude-per-directory": "string",
        "--exclude-standard": "none",
        "--error-unmatch": "none",
        "--recurse-submodules": "none",
      },
    },
    "git config --get": {
      safeFlags: {
        "--local": "none",
        "--global": "none",
        "--system": "none",
        "--worktree": "none",
        "--default": "string",
        "--type": "string",
        "--bool": "none",
        "--int": "none",
        "--bool-or-int": "none",
        "--path": "none",
        "--expiry-date": "none",
        "-z": "none",
        "--null": "none",
        "--name-only": "none",
        "--show-origin": "none",
        "--show-scope": "none",
      },
    },
    "git remote show": {
      safeFlags: {
        "-n": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        let index = args.indexOf("--");
        let beforeDoubleDash = index === -1 ? args : args.slice(0, index);
        let afterDoubleDash = index === -1 ? [] : args.slice(index + 1);
        let combined = beforeDoubleDash.filter((arg) => arg !== "-n").concat(afterDoubleDash);
        if (combined.length !== 1) return true;
        if (!beforeDoubleDash.includes("-n")) return true;
        return !/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/.test(combined[0]);
      },
    },
    "git remote": {
      safeFlags: {
        "-v": "none",
        "--verbose": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) =>
        args.some((arg) => arg !== "-v" && arg !== "--verbose"),
    },
    "git merge-base": {
      safeFlags: {
        "--is-ancestor": "none",
        "--fork-point": "none",
        "--octopus": "none",
        "--independent": "none",
        "--all": "none",
      },
    },
    "git rev-parse": {
      safeFlags: {
        "--verify": "none",
        "--short": "string",
        "--abbrev-ref": "none",
        "--symbolic": "none",
        "--symbolic-full-name": "none",
        "--show-toplevel": "none",
        "--show-cdup": "none",
        "--show-prefix": "none",
        "--git-dir": "none",
        "--git-common-dir": "none",
        "--absolute-git-dir": "none",
        "--show-superproject-working-tree": "none",
        "--is-inside-work-tree": "none",
        "--is-inside-git-dir": "none",
        "--is-bare-repository": "none",
        "--is-shallow-repository": "none",
        "--is-shallow-update": "none",
        "--path-prefix": "none",
      },
    },
    "git rev-list": {
      safeFlags: {
        ...GIT_REF_SELECTION_FLAGS,
        ...GIT_DATE_FILTER_FLAGS,
        ...GIT_COUNT_FLAGS,
        ...GIT_AUTHOR_FILTER_FLAGS,
        "--count": "none",
        "--reverse": "none",
        "--first-parent": "none",
        "--ancestry-path": "none",
        "--merges": "none",
        "--no-merges": "none",
        "--min-parents": "number",
        "--max-parents": "number",
        "--no-min-parents": "none",
        "--no-max-parents": "none",
        "--skip": "number",
        "--max-age": "number",
        "--min-age": "number",
        "--walk-reflogs": "none",
        "--oneline": "none",
        "--abbrev-commit": "none",
        "--pretty": "string",
        "--format": "string",
        "--abbrev": "number",
        "--full-history": "none",
        "--dense": "none",
        "--sparse": "none",
        "--source": "none",
        "--graph": "none",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => hasDangerousGitFormatArg(args),
    },
    "git describe": {
      safeFlags: {
        "--tags": "none",
        "--match": "string",
        "--exclude": "string",
        "--long": "none",
        "--abbrev": "number",
        "--always": "none",
        "--contains": "none",
        "--first-match": "none",
        "--exact-match": "none",
        "--candidates": "number",
        "--dirty": "none",
        "--broken": "none",
      },
    },
    "git cat-file": {
      safeFlags: {
        "-t": "none",
        "-s": "none",
        "-p": "none",
        "-e": "none",
        "--batch-check": "none",
        "--allow-undetermined-type": "none",
      },
    },
    "git for-each-ref": {
      safeFlags: {
        "--format": "string",
        "--sort": "string",
        "--count": "number",
        "--contains": "string",
        "--no-contains": "string",
        "--merged": "string",
        "--no-merged": "string",
        "--points-at": "string",
      },
      additionalCommandIsDangerousCallback: (rawCommand, args) => hasDangerousGitFormatArg(args),
    },
    "git grep": {
      safeFlags: {
        "-e": "string",
        "-E": "none",
        "--extended-regexp": "none",
        "-G": "none",
        "--basic-regexp": "none",
        "-F": "none",
        "--fixed-strings": "none",
        "-P": "none",
        "--perl-regexp": "none",
        "-i": "none",
        "--ignore-case": "none",
        "-v": "none",
        "--invert-match": "none",
        "-w": "none",
        "--word-regexp": "none",
        "-n": "none",
        "--line-number": "none",
        "-c": "none",
        "--count": "none",
        "-l": "none",
        "--files-with-matches": "none",
        "-L": "none",
        "--files-without-match": "none",
        "-h": "none",
        "-H": "none",
        "--heading": "none",
        "--break": "none",
        "--full-name": "none",
        "--color": "none",
        "--no-color": "none",
        "-o": "none",
        "--only-matching": "none",
        "-A": "number",
        "--after-context": "number",
        "-B": "number",
        "--before-context": "number",
        "-C": "number",
        "--context": "number",
        "--and": "none",
        "--or": "none",
        "--not": "none",
        "--max-depth": "number",
        "--untracked": "none",
        "--no-index": "none",
        "--recurse-submodules": "none",
        "--cached": "none",
        "--threads": "number",
        "-q": "none",
        "--quiet": "none",
      },
    },
    "git stash show": {
      safeFlags: {
        ...GIT_STAT_FLAGS,
        ...GIT_COLOR_FLAGS,
        ...GIT_PATCH_FLAGS,
        "--word-diff": "none",
        "--word-diff-regex": "string",
        "--diff-filter": "string",
        "--abbrev": "number",
      },
    },
    "git worktree list": {
      safeFlags: {
        "--porcelain": "none",
        "-v": "none",
        "--verbose": "none",
        "--expire": "string",
      },
    },
    "git tag": {
      safeFlags: {
        "-l": "none",
        "--list": "none",
        "-n": "number",
        "--contains": "string",
        "--no-contains": "string",
        "--merged": "string",
        "--no-merged": "string",
        "--sort": "string",
        "--format": "string",
        "--points-at": "string",
        "--column": "none",
        "--no-column": "none",
        "-i": "none",
        "--ignore-case": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        if (hasDangerousGitFormatArg(args)) return true;
        let flagsWithArgs = new Set([
          "--contains",
          "--no-contains",
          "--merged",
          "--no-merged",
          "--points-at",
          "--sort",
          "--format",
          "-n",
        ]);
        let i = 0;
        let seenListFlag = false;
        let seenDashDash = false;
        while (i < args.length) {
          let token = args[i];
          if (!token) {
            i++;
            continue;
          }
          if (token === "--" && !seenDashDash) {
            seenDashDash = true;
            i++;
            continue;
          }
          if (!seenDashDash && token.startsWith("-")) {
            if (token === "--list" || token === "-l") seenListFlag = true;
            else if (
              token[0] === "-" &&
              token[1] !== "-" &&
              token.length > 2 &&
              !token.includes("=") &&
              token.slice(1).includes("l")
            )
              seenListFlag = true;
            if (token.includes("=")) i++;
            else if (flagsWithArgs.has(token)) i += 2;
            else i++;
          } else {
            if (!seenListFlag) return true;
            i++;
          }
        }
        return false;
      },
    },
    "git branch": {
      safeFlags: {
        "-l": "none",
        "--list": "none",
        "-a": "none",
        "--all": "none",
        "-r": "none",
        "--remotes": "none",
        "-v": "none",
        "-vv": "none",
        "--verbose": "none",
        "--color": "none",
        "--no-color": "none",
        "--column": "none",
        "--no-column": "none",
        "--abbrev": "number",
        "--no-abbrev": "none",
        "--contains": "string",
        "--no-contains": "string",
        "--merged": "none",
        "--no-merged": "none",
        "--points-at": "string",
        "--sort": "string",
        "--show-current": "none",
        "-i": "none",
        "--ignore-case": "none",
      },
      additionalCommandIsDangerousCallback: (_rawCommand, args) => {
        if (hasDangerousGitFormatArg(args)) return true;
        let flagsWithArgs = new Set(["--contains", "--no-contains", "--points-at", "--sort"]);
        let flagsWithOptionalArgs = new Set(["--merged", "--no-merged"]);
        let i = 0;
        let lastFlag = "";
        let seenListFlag = false;
        let seenDashDash = false;
        while (i < args.length) {
          let token = args[i];
          if (!token) {
            i++;
            continue;
          }
          if (token === "--" && !seenDashDash) {
            seenDashDash = true;
            lastFlag = "";
            i++;
            continue;
          }
          if (!seenDashDash && token.startsWith("-")) {
            if (token === "--list" || token === "-l") seenListFlag = true;
            else if (
              token[0] === "-" &&
              token[1] !== "-" &&
              token.length > 2 &&
              !token.includes("=") &&
              token.slice(1).includes("l")
            )
              seenListFlag = true;
            if (token.includes("=")) {
              lastFlag = firstLineOf(token, "=");
              i++;
            } else if (flagsWithArgs.has(token)) {
              lastFlag = token;
              i += 2;
            } else {
              lastFlag = token;
              i++;
            }
          } else {
            let lastFlagHasOptionalArg = flagsWithOptionalArgs.has(lastFlag);
            if (!seenListFlag && !lastFlagHasOptionalArg) return true;
            i++;
          }
        }
        return false;
      },
    },
  };
});
//@ chunk-82kqcve8.js:208126-208178 layout
function hasTildeArg(args) {
  return args.some((arg) => arg.includes("~"));
}
//@ chunk-82kqcve8.js:208178-208199 layout
var TILDE_EXPANSION_PATTERN = /(?:^|[=:])~/;
//@ chunk-82kqcve8.js:208199-208280 layout
/**
 * 参数里有会被 shell 展开的 ~（开头或 = / : 之后，或 ~ 与 { 同现）时返回 true。
 */
function hasTildeExpansion(values) {
  return values.some(
    (value) => TILDE_EXPANSION_PATTERN.test(value) || (value.includes("~") && value.includes("{")),
  );
}
//@ chunk-82kqcve8.js:208280-208300 layout
var TILDE_USER_PATTERN = /^~(?!\/|$)/;
//@ chunk-82kqcve8.js:208300-208334 file-local
function isTildeUserPath(pathOrCommand) {
  return TILDE_USER_PATTERN.test(pathOrCommand);
}
//@ chunk-82kqcve8.js:208334-208696 layout (2.1.88 match: ghIsDangerousCallback, 1)
/**
 * gh 只读命令的附加危险检查：参数含 ~、占位符、URL（://）、@ 或两个以上 '/'（可能指向其他主机/仓库）时视为危险。
 */
function ghIsDangerousCallback(_rawCommand, args) {
  if (hasTildeArg(args)) return true;
  for (let token of args) {
    if (!token) continue;
    let value = token;
    if (token.startsWith("-")) {
      let eqIdx = token.indexOf("=");
      if (eqIdx === -1) continue;
      value = token.slice(eqIdx + 1);
      if (!value) continue;
    }
    if (containsAnyPlaceholder(value)) return true;
    if (!value.includes("/") && !value.includes("://") && !value.includes("@")) continue;
    if (value.includes("://")) return true;
    if (value.includes("@")) return true;
    if ((value.match(/\//g) || []).length >= 2) return true;
  }
  return false;
}
//@ chunk-82kqcve8.js:208696-215177 fingerprint (2.1.88 match: GH_READ_ONLY_COMMANDS, 0.97)
/**
 * gh 只读子命令白名单（pr/issue/repo/run/release/workflow/label/search 的 view/list/status 等）。
 */
var GH_READ_ONLY_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DOCKER_DANGEROUS_FLAGS;
var DOCKER_DANGEROUS_SHORT_FLAG_CHARS;
deferInit("chunk-82kqcve8.js:208696", () => {
  GH_READ_ONLY_COMMANDS = {
    "gh pr view": {
      safeFlags: {
        "--json": "string",
        "--comments": "none",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh pr list": {
      safeFlags: {
        "--state": "string",
        "-s": "string",
        "--author": "string",
        "--assignee": "string",
        "--label": "string",
        "--limit": "number",
        "-L": "number",
        "--base": "string",
        "--head": "string",
        "--search": "string",
        "--json": "string",
        "--draft": "none",
        "--app": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh pr diff": {
      safeFlags: {
        "--color": "string",
        "--name-only": "none",
        "--patch": "none",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh pr checks": {
      safeFlags: {
        "--watch": "none",
        "--required": "none",
        "--fail-fast": "none",
        "--json": "string",
        "--interval": "number",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh issue view": {
      safeFlags: {
        "--json": "string",
        "--comments": "none",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh issue list": {
      safeFlags: {
        "--state": "string",
        "-s": "string",
        "--assignee": "string",
        "--author": "string",
        "--label": "string",
        "--limit": "number",
        "-L": "number",
        "--milestone": "string",
        "--search": "string",
        "--json": "string",
        "--app": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh repo view": {
      safeFlags: {
        "--json": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh run list": {
      safeFlags: {
        "--branch": "string",
        "-b": "string",
        "--status": "string",
        "-s": "string",
        "--workflow": "string",
        "-w": "string",
        "--limit": "number",
        "-L": "number",
        "--json": "string",
        "--repo": "string",
        "-R": "string",
        "--event": "string",
        "-e": "string",
        "--user": "string",
        "-u": "string",
        "--created": "string",
        "--commit": "string",
        "-c": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh run view": {
      safeFlags: {
        "--log": "none",
        "--log-failed": "none",
        "--exit-status": "none",
        "--verbose": "none",
        "-v": "none",
        "--json": "string",
        "--repo": "string",
        "-R": "string",
        "--job": "string",
        "-j": "string",
        "--attempt": "number",
        "-a": "number",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh auth status": {
      safeFlags: {
        "--active": "none",
        "-a": "none",
        "--hostname": "string",
        "-h": "string",
        "--json": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh pr status": {
      safeFlags: {
        "--conflict-status": "none",
        "-c": "none",
        "--json": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh issue status": {
      safeFlags: {
        "--json": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh release list": {
      safeFlags: {
        "--exclude-drafts": "none",
        "--exclude-pre-releases": "none",
        "--json": "string",
        "--limit": "number",
        "-L": "number",
        "--order": "string",
        "-O": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh release view": {
      safeFlags: {
        "--json": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh workflow list": {
      safeFlags: {
        "--all": "none",
        "-a": "none",
        "--json": "string",
        "--limit": "number",
        "-L": "number",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh workflow view": {
      safeFlags: {
        "--ref": "string",
        "-r": "string",
        "--yaml": "none",
        "-y": "none",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh label list": {
      safeFlags: {
        "--json": "string",
        "--limit": "number",
        "-L": "number",
        "--order": "string",
        "--search": "string",
        "-S": "string",
        "--sort": "string",
        "--repo": "string",
        "-R": "string",
      },
      additionalCommandIsDangerousCallback: ghIsDangerousCallback,
    },
    "gh search repos": {
      safeFlags: {
        "--archived": "none",
        "--created": "string",
        "--followers": "string",
        "--forks": "string",
        "--good-first-issues": "string",
        "--help-wanted-issues": "string",
        "--include-forks": "string",
        "--json": "string",
        "--language": "string",
        "--license": "string",
        "--limit": "number",
        "-L": "number",
        "--match": "string",
        "--number-topics": "string",
        "--order": "string",
        "--owner": "string",
        "--size": "string",
        "--sort": "string",
        "--stars": "string",
        "--topic": "string",
        "--updated": "string",
        "--visibility": "string",
      },
    },
    "gh search issues": {
      safeFlags: {
        "--app": "string",
        "--assignee": "string",
        "--author": "string",
        "--closed": "string",
        "--commenter": "string",
        "--comments": "string",
        "--created": "string",
        "--include-prs": "none",
        "--interactions": "string",
        "--involves": "string",
        "--json": "string",
        "--label": "string",
        "--language": "string",
        "--limit": "number",
        "-L": "number",
        "--locked": "none",
        "--match": "string",
        "--mentions": "string",
        "--milestone": "string",
        "--no-assignee": "none",
        "--no-label": "none",
        "--no-milestone": "none",
        "--no-project": "none",
        "--order": "string",
        "--owner": "string",
        "--project": "string",
        "--reactions": "string",
        "--repo": "string",
        "-R": "string",
        "--sort": "string",
        "--state": "string",
        "--team-mentions": "string",
        "--updated": "string",
        "--visibility": "string",
      },
    },
    "gh search prs": {
      safeFlags: {
        "--app": "string",
        "--assignee": "string",
        "--author": "string",
        "--base": "string",
        "-B": "string",
        "--checks": "string",
        "--closed": "string",
        "--commenter": "string",
        "--comments": "string",
        "--created": "string",
        "--draft": "none",
        "--head": "string",
        "-H": "string",
        "--interactions": "string",
        "--involves": "string",
        "--json": "string",
        "--label": "string",
        "--language": "string",
        "--limit": "number",
        "-L": "number",
        "--locked": "none",
        "--match": "string",
        "--mentions": "string",
        "--merged": "none",
        "--merged-at": "string",
        "--milestone": "string",
        "--no-assignee": "none",
        "--no-label": "none",
        "--no-milestone": "none",
        "--no-project": "none",
        "--order": "string",
        "--owner": "string",
        "--project": "string",
        "--reactions": "string",
        "--repo": "string",
        "-R": "string",
        "--review": "string",
        "--review-requested": "string",
        "--reviewed-by": "string",
        "--sort": "string",
        "--state": "string",
        "--team-mentions": "string",
        "--updated": "string",
        "--visibility": "string",
      },
    },
    "gh search commits": {
      safeFlags: {
        "--author": "string",
        "--author-date": "string",
        "--author-email": "string",
        "--author-name": "string",
        "--committer": "string",
        "--committer-date": "string",
        "--committer-email": "string",
        "--committer-name": "string",
        "--hash": "string",
        "--json": "string",
        "--limit": "number",
        "-L": "number",
        "--merge": "none",
        "--order": "string",
        "--owner": "string",
        "--parent": "string",
        "--repo": "string",
        "-R": "string",
        "--sort": "string",
        "--tree": "string",
        "--visibility": "string",
      },
    },
    "gh search code": {
      safeFlags: {
        "--extension": "string",
        "--filename": "string",
        "--json": "string",
        "--language": "string",
        "--limit": "number",
        "-L": "number",
        "--match": "string",
        "--owner": "string",
        "--repo": "string",
        "-R": "string",
        "--size": "string",
      },
    },
  };
  DOCKER_DANGEROUS_FLAGS = [
    "-H",
    "-c",
    "-r",
    "--host",
    "--context",
    "--config",
    "--tlscacert",
    "--tlscert",
    "--tlskey",
    "--url",
    "--connection",
    "--identity",
    "--remote",
    "--module",
    "--out",
  ];
  DOCKER_DANGEROUS_SHORT_FLAG_CHARS = new Set(
    DOCKER_DANGEROUS_FLAGS.filter((flag) => flag.length === 2).map((flag) => flag[1]),
  );
});
//@ chunk-82kqcve8.js:215177-215424 layout
/**
 * docker 参数含改连接目标/配置的 flag（-H/--host/--context/--config/--tls*\/--url/…，含组合短 flag）时返回 true。
 */
function hasDockerDangerousFlag(args) {
  return args.some((arg) => {
    if (
      DOCKER_DANGEROUS_FLAGS.some(
        (flag) =>
          arg === flag ||
          arg.startsWith(`${flag}=`) ||
          (flag.length === 2 && arg.length > 2 && arg.startsWith(flag)),
      )
    )
      return true;
    let shortFlags = arg.match(/^-([A-Za-z]+)/)?.[1];
    if (shortFlags !== undefined && shortFlags.length >= 2) {
      for (let char of shortFlags) if (DOCKER_DANGEROUS_SHORT_FLAG_CHARS.has(char)) return true;
    }
    return false;
  });
}
//@ chunk-82kqcve8.js:215424-217047 fingerprint (2.1.88 match: RIPGREP_READ_ONLY_COMMANDS, 0.876)
/**
 * docker logs/inspect 与 rg 的只读 flag 白名单：每个 flag 标注值类型；docker 另有回调拦截改连接目标的 flag、~ 展开与危险参数。
 */
var DOCKER_READ_ONLY_COMMANDS = {
  "docker logs": {
    safeFlags: {
      "--follow": "none",
      "-f": "none",
      "--tail": "string",
      "-n": "string",
      "--timestamps": "none",
      "-t": "none",
      "--since": "string",
      "--until": "string",
      "--details": "none",
    },
    additionalCommandIsDangerousCallback: (rawCommand, args) =>
      hasDockerDangerousFlag(args) || hasTildeExpansion(args) || args.some(containsAnyPlaceholder),
  },
  "docker inspect": {
    safeFlags: {
      "--format": "string",
      "-f": "string",
      "--type": "string",
      "--size": "none",
      "-s": "none",
    },
    additionalCommandIsDangerousCallback: (rawCommand, args) =>
      hasDockerDangerousFlag(args) || hasTildeExpansion(args) || args.some(containsAnyPlaceholder),
  },
};
var RIPGREP_READ_ONLY_COMMANDS = {
  rg: {
    safeFlags: {
      "-e": "string",
      "--regexp": "string",
      "-f": "string",
      "-i": "none",
      "--ignore-case": "none",
      "-S": "none",
      "--smart-case": "none",
      "-F": "none",
      "--fixed-strings": "none",
      "-w": "none",
      "--word-regexp": "none",
      "-v": "none",
      "--invert-match": "none",
      "-c": "none",
      "--count": "none",
      "-l": "none",
      "--files-with-matches": "none",
      "--files-without-match": "none",
      "-n": "none",
      "--line-number": "none",
      "-o": "none",
      "--only-matching": "none",
      "-A": "number",
      "--after-context": "number",
      "-B": "number",
      "--before-context": "number",
      "-C": "number",
      "--context": "number",
      "-H": "none",
      "-h": "none",
      "--heading": "none",
      "--no-heading": "none",
      "-q": "none",
      "--quiet": "none",
      "--column": "none",
      "-g": "string",
      "--glob": "string",
      "-t": "string",
      "--type": "string",
      "-T": "string",
      "--type-not": "string",
      "--type-list": "none",
      "--hidden": "none",
      "--no-ignore": "none",
      "-u": "none",
      "-m": "number",
      "--max-count": "number",
      "-d": "number",
      "--max-depth": "number",
      "-a": "none",
      "--text": "none",
      "-L": "none",
      "--follow": "none",
      "--color": "string",
      "--json": "none",
      "--stats": "none",
      "--help": "none",
      "--version": "none",
      "--debug": "none",
      "--": "none",
    },
  },
};
var DOCKER_BARE_READ_ONLY_COMMANDS = ["docker ps", "docker images"];
var FLAG_WITH_INLINE_VALUE_PATTERN = /^--?[A-Za-z0-9][\w-]*=/;
var WINDOWS_NT_DEVICE_PREFIX_PATTERN = /(?:^|[^A-Za-z0-9_])[\\/]\?\?(?:[\\/]|$)/;
//@ chunk-82kqcve8.js:217047-218015 layout
/**
 * 仅 Windows：检测会触发 SMB/WebDAV 外连的 UNC 形式（\\server、//server、混合斜杠、@SSL@端口、DavWWWRoot、IPv4/IPv6 主机、\??\ 前缀）；isArgument 时还剥掉 flag 前缀与 `--x=` 再查。
 */
function containsVulnerableUncPath(pathOrCommand, allowFlagForms = false) {
  if (getPlatform() !== "windows") return false;
  if (allowFlagForms && isUncOrDevicePath(pathOrCommand)) return true;
  if (allowFlagForms && /^-[A-Za-z0-9]/.test(pathOrCommand)) {
    let replaced = pathOrCommand.replace(/^(?:-[A-Za-z0-9]+)+/, "");
    if (replaced.length > 0 && containsVulnerableUncPath(replaced, true)) return true;
  }
  if (allowFlagForms && FLAG_WITH_INLINE_VALUE_PATTERN.test(pathOrCommand)) {
    let remaining = pathOrCommand;
    while (FLAG_WITH_INLINE_VALUE_PATTERN.test(remaining))
      remaining = remaining.slice(remaining.indexOf("=") + 1);
    if (remaining.length > 0 && containsVulnerableUncPath(remaining, true)) return true;
  }
  if (/\\\\[^ \t\r\n\f\v\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i.test(pathOrCommand)) return true;
  if (WINDOWS_NT_DEVICE_PREFIX_PATTERN.test(pathOrCommand)) return true;
  if (/(?<!:)\/\/[^ \t\r\n\f\v\\/]+(?:@(?:\d+|ssl))?(?:[\\/]|$|\s)/i.test(pathOrCommand)) return true;
  if (
    (allowFlagForms ? /(?<![:\w])\/\\{1,}[^ \t\r\n\f\v\\/]+[\\/]/ : /\/\\{2,}[^ \t\r\n\f\v\\/]/).test(
      pathOrCommand,
    )
  )
    return true;
  if (
    (allowFlagForms ? /(?<![:\w])\\{1,}\/[^ \t\r\n\f\v\\/]+[\\/]/ : /\\{2,}\/[^ \t\r\n\f\v\\/]/).test(
      pathOrCommand,
    )
  )
    return true;
  if (/@SSL@\d+/i.test(pathOrCommand) || /@\d+@SSL/i.test(pathOrCommand)) return true;
  if (/DavWWWRoot/i.test(pathOrCommand)) return true;
  if (
    /^\\\\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(pathOrCommand) ||
    /^\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[\\/]/.test(pathOrCommand)
  )
    return true;
  if (
    /^\\\\(\[[\da-fA-F:]+\])[\\/]/.test(pathOrCommand) ||
    /^\/\/(\[[\da-fA-F:]+\])[\\/]/.test(pathOrCommand)
  )
    return true;
  return false;
}
//@ chunk-82kqcve8.js:218015-218040 layout
var FLAG_PATTERN = /^-[a-zA-Z0-9_-]/;
//@ chunk-82kqcve8.js:218040-218105 layout
/**
 * token 是否形如 flag：以 - 开头、长度大于 1 且符合 flag 正则。
 */
function isFlagToken(token) {
  return token.startsWith("-") && token.length > 1 && FLAG_PATTERN.test(token);
}
//@ chunk-82kqcve8.js:218105-218134 layout
var TENGU_AMBER_THIMBLE = "tengu_amber_thimble";
//@ chunk-82kqcve8.js:218134-218339 fingerprint (2.1.88 match: validateFlagArgument, 1)
/**
 * 校验 flag 参数值是否符合类型：none 无值、number 纯数字、string 任意、char 单字符、{} / EOF 字面量。
 */
function validateFlagArgument(value, argType) {
  switch (argType) {
    case "none":
      return false;
    case "number":
      return /^\d+$/.test(value);
    case "string":
      return true;
    case "char":
      return value.length === 1;
    case "{}":
      return value === "{}";
    case "EOF":
      return value === "EOF";
    default:
      return false;
  }
}
//@ chunk-82kqcve8.js:218339-218382 layout
var URL_SCHEME_SEPARATOR_PATTERN = /:[\\/]{2}/;
var TENGU_JAUNTY_HONEY = "tengu_jaunty_honey";
//@ chunk-82kqcve8.js:218382-219856 fingerprint (2.1.88 match: validateFlags, 0.839)
/**
 * 按白名单逐个校验 token：未知 flag、需值却缺值、值以 - 开头、值类型不符一律 false；支持 `--`、组合短 flag（全为 none 型）、grep/rg 的 -A3 粘连数字、git 的 -<数字>、xargs 目标命令；Windows 上 git 参数含 :// 或占位符且 tengu_jaunty_honey 开时直接拒绝；tengu_amber_thimble 放宽 flag 识别。
 */
function validateFlags(tokens, startIndex, config, options) {
  let i = startIndex;
  if (
    options?.commandName === "git" &&
    getPlatform() === "windows" &&
    tokens
      .slice(startIndex)
      .some((token) => URL_SCHEME_SEPARATOR_PATTERN.test(token) || containsAnyPlaceholder(token)) &&
    readFlagWithOverride(TENGU_JAUNTY_HONEY, {
      safe: true,
    })
  )
    return false;
  while (i < tokens.length) {
    let token = tokens[i];
    if (!token) {
      i++;
      continue;
    }
    if (
      options?.xargsTargetCommands &&
      options.commandName === "xargs" &&
      (!token.startsWith("-") || token === "--")
    ) {
      if (token === "--" && i + 1 < tokens.length) {
        i++;
        token = tokens[i];
      }
      if (token && options.xargsTargetCommands.includes(token)) break;
      return false;
    }
    if (token === "--") {
      if (config.respectsDoubleDash !== false) {
        i++;
        break;
      }
      i++;
      continue;
    }
    if (
      isFlagToken(token) ||
      (token.startsWith("-") &&
        token.length > 1 &&
        readFlagWithOverride(TENGU_AMBER_THIMBLE, {
          safe: true,
        }))
    ) {
      let hasEquals = token.includes("=");
      let [flag, ...valueParts] = token.split("=");
      let inlineValue = valueParts.join("=");
      if (!flag) return false;
      let flagArgType = config.safeFlags[flag];
      if (!flagArgType) {
        if (options?.commandName === "git" && flag.match(/^-\d+$/)) {
          i++;
          continue;
        }
        if (
          (options?.commandName === "grep" ||
            options?.commandName === "egrep" ||
            options?.commandName === "fgrep" ||
            options?.commandName === "rg") &&
          flag.startsWith("-") &&
          !flag.startsWith("--") &&
          flag.length > 2
        ) {
          let potentialFlag = flag.substring(0, 2);
          let potentialValue = flag.substring(2);
          if (config.safeFlags[potentialFlag] && /^\d+$/.test(potentialValue)) {
            let flagArgType = config.safeFlags[potentialFlag];
            if (flagArgType === "number" || flagArgType === "string")
              if (validateFlagArgument(potentialValue, flagArgType)) {
                i++;
                continue;
              } else return false;
          }
        }
        if (flag.startsWith("-") && !flag.startsWith("--") && flag.length > 2) {
          for (let j_2 = 1; j_2 < flag.length; j_2++) {
            let singleFlag = "-" + flag[j_2];
            let flagType = config.safeFlags[singleFlag];
            if (!flagType) return false;
            if (flagType !== "none") return false;
          }
          i++;
          continue;
        } else return false;
      }
      if (flagArgType === "none") {
        if (hasEquals) return false;
        i++;
      } else {
        let argValue;
        if (hasEquals) {
          argValue = inlineValue;
          i++;
        } else {
          if (i + 1 >= tokens.length || (tokens[i + 1] && isFlagToken(tokens[i + 1]))) return false;
          argValue = tokens[i + 1] || "";
          i += 2;
        }
        if (startsWithAnyPlaceholder(argValue)) return false;
        if (flagArgType === "string" && argValue.startsWith("-"))
          if (flag === "--sort" && options?.commandName === "git" && argValue.match(/^-[a-zA-Z]/));
          else return false;
        if (!validateFlagArgument(argValue, flagArgType)) return false;
      }
    } else {
      if (containsAnyPlaceholder(token)) return false;
      i++;
    }
  }
  return true;
}
//@ chunk-2a8yx6fc.js:24598-24834 fingerprint (2.1.88 match: ghIsDangerousCallback, 1)
/**
 * 从 git remote URL（scheme:// 或 scp 风格 host:path）取主机名，单字母主机（Windows 盘符）排除，主机名不合法返回 undefined。属于 auto mode 环境采集的 repo 信息，误归只读校验（旧版名 ghIsDangerousCallback 错配）。
 */
function getRemoteHost(path) {
  let index = path.indexOf("://");
  let host;
  if (index !== -1) {
    let sliced = path.slice(index + 3);
    let index_2 = sliced.indexOf("/");
    host = index_2 > 0 ? sliced.slice(0, index_2) : undefined;
  } else {
    let index = path.indexOf(":");
    host = index > 0 ? path.slice(0, index) : undefined;
    if (host !== undefined && host.length === 1) host = undefined;
  }
  return host !== undefined && isValidRemotePathSegment(host) ? host : undefined;
}
export {
  containsVulnerableUncPath,
  getRemoteHost,
  isTildeUserPath,
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
  DOCKER_DANGEROUS_FLAGS,
};
