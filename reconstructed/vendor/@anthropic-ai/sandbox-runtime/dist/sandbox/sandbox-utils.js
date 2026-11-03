/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (8), chunk-r0ads4ty.js (52), chunk-vp5gef34.js (1)
 * attribution: affinity 6, esm-fingerprint 37, esm-layout 18
 */
import "path";
import * as pathModule_2 from "path";
import { sep, join } from "path";
import { homedir } from "os";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import { open, realpath, stat, lstat, readdir } from "fs/promises";
import { xTt, globTokenToRegex, GlobTokenKind, parseGlob } from "./glob-pattern.js";
import { realPathOf } from "../utils/real-path.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";
import { escapeInvalidCharClasses } from "../../../../../src/utils/sandbox/windowsSandbox.js";
import { urlPatternToRegex, countCharInString } from "../../../../../src/utils/stringUtils.js";
import { readOnlyNoFollowFlags } from "../../../../../src/utils/platformTargets.js";
import {
  hasDocumentPath,
  upsertDocument,
  extractMemoryFieldsFromFile,
} from "../../../../../src/memdir/memoryIndex.js";
import { isENOENT } from "../../../../../src/utils/errors.js";

//@ chunk-r0ads4ty.js:3804-3856 esm-fingerprint
function Cwn(e) {
  return xTt(e).slice(0, -1) + "(/.*)?$";
}
//@ chunk-r0ads4ty.js:3856-4006 esm-fingerprint
var DANGEROUS_FILES = [
  ".gitconfig",
  ".gitmodules",
  ".bashrc",
  ".bash_profile",
  ".zshrc",
  ".zprofile",
  ".profile",
  ".ripgreprc",
  ".mcp.json",
];
var DANGEROUS_DIRECTORIES = [".git", ".vscode", ".idea"];
//@ chunk-r0ads4ty.js:4006-4095 esm-fingerprint
function getDangerousDirectories() {
  return [...DANGEROUS_DIRECTORIES.filter((d) => d !== ".git"), ".claude/commands", ".claude/agents"];
}
//@ chunk-r0ads4ty.js:4095-4134 esm-layout
function normalizeCaseForComparison(pathStr) {
  return pathStr.toLowerCase();
}
//@ chunk-r0ads4ty.js:4134-4197 esm-layout
function isAtOrUnder(p, dir) {
  return p === dir || p.startsWith(dir === "/" ? "/" : dir + "/");
}
//@ chunk-r0ads4ty.js:4197-4237 esm-layout
function zot(p, dir) {
  return p !== dir && isAtOrUnder(p, dir);
}
//@ chunk-r0ads4ty.js:4237-4350 esm-fingerprint
function* properAncestors(absolutePath) {
  for (let slash = absolutePath.lastIndexOf("/"); slash > 0; slash = absolutePath.lastIndexOf("/", slash - 1))
    yield absolutePath.slice(0, slash);
  if (absolutePath !== "/") yield "/";
}
//@ chunk-r0ads4ty.js:4350-4421 esm-layout
function Dqt(candidatePath) {
  try {
    let resolved = realPathOf(candidatePath);
    if (resolved !== candidatePath) return [candidatePath, resolved];
  } catch {}
  return [candidatePath];
}
//@ chunk-r0ads4ty.js:4421-4522 esm-fingerprint
function nameLocation(p, canonicalOf) {
  if (p === "/") return p;
  let parent = canonicalOf(pathModule_2.dirname(p));
  return `${parent === "/" ? "" : parent}/${pathModule_2.basename(p)}`;
}
//@ chunk-r0ads4ty.js:4522-4576 esm-fingerprint
function xwn() {
  try {
    return process.cwd();
  } catch {
    return;
  }
}
//@ chunk-r0ads4ty.js:4576-4674 esm-fingerprint
function isAbsenceErrno(err) {
  let code = err?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "ENAMETOOLONG";
}
//@ chunk-r0ads4ty.js:4674-4763 esm-layout
function containsGlobChars(pathPattern) {
  return (
    pathPattern.includes("*") ||
    pathPattern.includes("?") ||
    pathPattern.includes("[") ||
    pathPattern.includes("]")
  );
}
//@ chunk-r0ads4ty.js:4763-4819 esm-layout
function containsGlobCharsWin(p) {
  return p.includes("*") || p.includes("?");
}
//@ chunk-r0ads4ty.js:4819-4872 esm-fingerprint
function containsGlobCharsForPlatform(p) {
  return getPlatform() === "windows" ? containsGlobCharsWin(p) : containsGlobChars(p);
}
//@ chunk-r0ads4ty.js:4872-5121 esm-layout
function markedLiteralPath(entry) {
  let candidate = entry;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    typeof candidate.path !== "string" ||
    candidate.path === "" ||
    candidate.literal !== true
  )
    throw TypeError(
      `A filesystem path entry must be a path, or { path, literal: true }; got ${JSON.stringify(entry) ?? String(entry)}`,
    );
  return candidate.path;
}
//@ chunk-r0ads4ty.js:5121-5243 esm-fingerprint
function stripExtendedPathPrefix(p) {
  if (/^\\\\\?\\unc\\/i.test(p)) return "\\\\" + p.slice(8);
  if (p.startsWith("\\\\?\\")) return p.slice(4);
  return p;
}
//@ chunk-r0ads4ty.js:5243-5337 esm-fingerprint
function isUncPath(p) {
  let ns = pathModule_2.win32.toNamespacedPath(p);
  return /^[\\/]{2}[?.][\\/]unc[\\/]/i.test(ns);
}
//@ chunk-r0ads4ty.js:5337-5388 esm-fingerprint
function removeTrailingGlobSuffix(pathPattern) {
  return pathPattern.replace(/\/\*\*$/, "") || "/";
}
//@ chunk-r0ads4ty.js:5388-5901 esm-fingerprint
function isSymlinkOutsideBoundary(originalPath, resolvedPath) {
  let normalizedOriginal = pathModule_2.normalize(originalPath);
  let normalizedResolved = pathModule_2.normalize(resolvedPath);
  if (normalizedResolved === normalizedOriginal) return false;
  if (normalizedOriginal.startsWith("/tmp/") && normalizedResolved === "/private" + normalizedOriginal)
    return false;
  if (normalizedOriginal.startsWith("/var/") && normalizedResolved === "/private" + normalizedOriginal)
    return false;
  if (normalizedResolved === "/") return true;
  if (normalizedResolved.split("/").filter(Boolean).length <= 1) return true;
  if (normalizedOriginal.startsWith(normalizedResolved + "/")) return true;
  let canonicalOriginal = normalizedOriginal;
  if (normalizedOriginal.startsWith("/tmp/")) canonicalOriginal = "/private" + normalizedOriginal;
  else if (normalizedOriginal.startsWith("/var/")) canonicalOriginal = "/private" + normalizedOriginal;
  if (canonicalOriginal !== normalizedOriginal && canonicalOriginal.startsWith(normalizedResolved + "/"))
    return true;
  let a = normalizedResolved.startsWith(normalizedOriginal + "/");
  let o = canonicalOriginal !== normalizedOriginal && normalizedResolved.startsWith(canonicalOriginal + "/");
  if (!(canonicalOriginal !== normalizedOriginal && normalizedResolved === canonicalOriginal) && !a && !o)
    return true;
  return false;
}
//@ chunk-r0ads4ty.js:5901-5992 esm-fingerprint
function Nqt(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return homedir() + p.slice(1);
  return p;
}
//@ chunk-r0ads4ty.js:5992-6165 esm-fingerprint
function expandWindowsEnvRefs(e) {
  let home = homedir();
  let drive = /^[A-Za-z]:/.test(home) ? home.slice(0, 2) : "";
  let homePath = drive ? home.slice(2) : home;
  return e
    .replace(/%USERPROFILE%/gi, home)
    .replace(/%HOMEDRIVE%/gi, drive)
    .replace(/%HOMEPATH%/gi, homePath);
}
//@ chunk-r0ads4ty.js:6165-6239 esm-fingerprint
function collapseInteriorSpellings(pathPattern) {
  return pathPattern.replace(/\/{2,}/g, "/").replace(/\/\.(?=\/)/g, "");
}
//@ chunk-r0ads4ty.js:6239-6453 esm-fingerprint
function warnIfParentRefUnfolded(normalizedPath) {
  if (getPlatform() !== "windows" && /(?:^|\/)\.\.(?:\/|$)/.test(normalizedPath))
    logForDebugging(
      `[Sandbox] "${normalizedPath}" could not be resolved and still contains a ".." component, so a rule spelled this way may not match.`,
      {
        level: "warn",
      },
    );
  return normalizedPath;
}
//@ chunk-r0ads4ty.js:6453-7151 esm-fingerprint
function normalizePathForSandbox(pathPattern, opts) {
  let isGlobSpelling = (p) => !opts?.literal && containsGlobCharsForPlatform(p);
  if (getPlatform() === "windows") {
    pathPattern = stripExtendedPathPrefix(expandWindowsEnvRefs(pathPattern));
    if (/^[a-z]:/.test(pathPattern)) pathPattern = pathPattern[0].toUpperCase() + pathPattern.slice(1);
    if (isUncPath(pathPattern) && !isGlobSpelling(pathPattern))
      return pathModule_2.win32.normalize(pathPattern);
  }
  if (getPlatform() !== "windows" && pathPattern.endsWith("/") && !isGlobSpelling(pathPattern))
    pathPattern = pathPattern.replace(/\/+$/, "") || "/";
  let normalizedPath = Nqt(pathPattern);
  if (normalizedPath === pathPattern && !pathModule_2.isAbsolute(pathPattern))
    normalizedPath = pathModule_2.resolve(process.cwd(), pathPattern);
  if (getPlatform() !== "windows") normalizedPath = collapseInteriorSpellings(normalizedPath);
  if (isGlobSpelling(normalizedPath)) {
    let splitRe = getPlatform() === "windows" ? /[*?]/ : /[*?[\]]/;
    let staticPrefix = normalizedPath.split(splitRe)[0];
    if (staticPrefix && staticPrefix !== "/") {
      let baseDir = staticPrefix.endsWith("/")
        ? staticPrefix.slice(0, -1)
        : pathModule_2.dirname(staticPrefix);
      try {
        let resolvedBaseDir = realPathOf(baseDir);
        if (!isSymlinkOutsideBoundary(baseDir, resolvedBaseDir)) {
          let patternSuffix = normalizedPath.slice(baseDir.length);
          return warnIfParentRefUnfolded(resolvedBaseDir + patternSuffix);
        }
      } catch {}
    }
    return warnIfParentRefUnfolded(normalizedPath);
  }
  if (getPlatform() !== "windows" && normalizedPath !== "")
    normalizedPath = normalizedPath.replace(/\/\.$/, "").replace(/\/+$/, "") || "/";
  try {
    let resolvedPath = realPathOf(normalizedPath);
    if (!isSymlinkOutsideBoundary(normalizedPath, resolvedPath)) normalizedPath = resolvedPath;
  } catch {}
  return warnIfParentRefUnfolded(normalizedPath);
}
//@ chunk-r0ads4ty.js:7151-7322 esm-fingerprint
var SANDBOX_OWN_WRITE_PATHS = [
  "/dev/stdout",
  "/dev/stderr",
  "/dev/null",
  "/dev/tty",
  "/dev/dtracehelper",
  "/dev/autofs_nowait",
  "/tmp/claude",
  "/private/tmp/claude",
];
var HOME_CONVENIENCE_WRITE_DIRS = [".npm/_logs", ".claude/debug"];
//@ chunk-r0ads4ty.js:7322-7448 esm-fingerprint
function getDefaultWritePaths(readRules) {
  let home = homedir();
  let keptDirs =
    !readRules || readRules.denyRead.length === 0
      ? HOME_CONVENIENCE_WRITE_DIRS
      : homeDirsNotReadDenied(home, readRules.denyRead, readRules.allowRead);
  return [...SANDBOX_OWN_WRITE_PATHS, ...keptDirs.map((rel) => pathModule_2.join(home, rel))];
}
//@ chunk-r0ads4ty.js:7448-7780 esm-fingerprint
function homeDirsNotReadDenied(home, denyRead, allowRead = []) {
  let homes = [
    ...new Set([
      home,
      normalizePathForSandbox(home, {
        literal: true,
      }),
    ]),
  ];
  let denies = denyRead.map((entry) => readRuleCovers(entry));
  let reopened = allowRead
    .flatMap((entry) => {
      if (typeof entry !== "string") return [markedLiteralPath(entry)];
      let stripped = removeTrailingGlobSuffix(entry);
      return containsGlobCharsForPlatform(stripped) ? [] : [stripped];
    })
    .map((entry) =>
      normalizePathForSandbox(entry, {
        literal: true,
      }),
    );
  return HOME_CONVENIENCE_WRITE_DIRS.filter((rel) => {
    let spellings = homes.map((h) => pathModule_2.join(h, rel));
    return !denies.some(
      (denyCovers) =>
        spellings.some(denyCovers) &&
        !reopened.some((allow) => denyCovers(allow) && spellings.some((s) => isAtOrUnder(s, allow))),
    );
  });
}
//@ chunk-r0ads4ty.js:7780-7989 esm-fingerprint
function readRuleCovers(entry) {
  if (typeof entry !== "string") {
    let rule = normalizePathForSandbox(markedLiteralPath(entry), {
      literal: true,
    });
    return (p) => isAtOrUnder(p, rule);
  }
  let stripped = removeTrailingGlobSuffix(entry);
  if (containsGlobCharsForPlatform(stripped)) {
    let regex = compiledDenyGlob(normalizePathForSandbox(stripped));
    return regex === null ? () => true : (p) => regex.test(p);
  }
  let rule = normalizePathForSandbox(stripped, {
    literal: true,
  });
  return (p) => isAtOrUnder(p, rule);
}
//@ chunk-r0ads4ty.js:7989-8144 esm-fingerprint
function compiledDenyGlob(normalizedGlob) {
  let regex = compiledDenyGlobs.get(normalizedGlob);
  if (regex === undefined) {
    try {
      regex = new RegExp(Cwn(normalizedGlob));
      regex.test("");
    } catch {
      regex = null;
    }
    compiledDenyGlobChars += normalizedGlob.length;
    if (compiledDenyGlobChars > MAX_COMPILED_DENY_GLOB_CHARS) {
      compiledDenyGlobs.clear();
      compiledDenyGlobChars = normalizedGlob.length;
    }
    compiledDenyGlobs.set(normalizedGlob, regex);
  }
  return regex;
}
//@ chunk-r0ads4ty.js:8144-8387 esm-layout
var compiledDenyGlobs = new Map();
var compiledDenyGlobChars = 0;
var MAX_COMPILED_DENY_GLOB_CHARS = 1048576;
var CA_TRUST_VARS = [
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "CURL_CA_BUNDLE",
  "REQUESTS_CA_BUNDLE",
  "PIP_CERT",
  "GIT_SSL_CAINFO",
  "AWS_CA_BUNDLE",
  "CARGO_HTTP_CAINFO",
  "DENO_CERT",
  "CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE",
  "NIX_SSL_CERT_FILE",
];
//@ chunk-r0ads4ty.js:8387-10384 esm-fingerprint
function generateProxyEnvVars(
  httpProxyPort,
  socksProxyPort,
  caCertPath,
  proxyAuthToken,
  skipTmpdir,
  encodedCommand,
) {
  let userRaw = proxyUsernameFor(encodedCommand);
  let userPct = userRaw === PROXY_AUTH_USER ? userRaw : encodeURIComponent(userRaw);
  let auth = proxyAuthToken ? `${userPct}:${proxyAuthToken}@` : "";
  let envVars = ["SANDBOX_RUNTIME=1"];
  if (!skipTmpdir) {
    let tmpdir = process.env.CLAUDE_CODE_TMPDIR || process.env.CLAUDE_TMPDIR || "/tmp/claude";
    envVars.push(`TMPDIR=${tmpdir}`);
  }
  if (caCertPath) for (let v of CA_TRUST_VARS) envVars.push(`${v}=${caCertPath}`);
  if (!httpProxyPort && !socksProxyPort) return envVars;
  let noProxyAddresses = [
    "localhost",
    "127.0.0.1",
    "::1",
    "169.254.0.0/16",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
  ].join(",");
  envVars.push(`NO_PROXY=${noProxyAddresses}`);
  envVars.push(`no_proxy=${noProxyAddresses}`);
  let w = proxyAuthToken ? "127.0.0.1" : "localhost";
  let S = proxyAuthToken && httpProxyPort === socksProxyPort ? "127.0.0.1" : "localhost";
  if (httpProxyPort) {
    envVars.push(`HTTP_PROXY=http://${auth}${w}:${httpProxyPort}`);
    envVars.push(`HTTPS_PROXY=http://${auth}${w}:${httpProxyPort}`);
    envVars.push(`http_proxy=http://${auth}${w}:${httpProxyPort}`);
    envVars.push(`https_proxy=http://${auth}${w}:${httpProxyPort}`);
    if (proxyAuthToken) envVars.push("GIT_CONFIG_PARAMETERS='http.proxyAuthMethod=basic'");
  }
  let connectProxyUrl = httpProxyPort
    ? `http://${auth}${w}:${httpProxyPort}`
    : `socks5h://${auth}${S}:${socksProxyPort}`;
  envVars.push(`ALL_PROXY=${connectProxyUrl}`);
  envVars.push(`all_proxy=${connectProxyUrl}`);
  envVars.push(`GRPC_PROXY=${connectProxyUrl}`);
  envVars.push(`grpc_proxy=${connectProxyUrl}`);
  if (socksProxyPort) {
    let platform = getPlatform();
    if (platform === "macos" && proxyAuthToken && httpProxyPort === socksProxyPort) {
      let basic = Buffer.from(`${userRaw}:${proxyAuthToken}`);
      envVars.push(
        `SRT_SSH_PROXY_COMMAND=${sshConnectScript(socksProxyPort, basic.toString("base64"))}`,
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand="/bin/sh -c 'eval \\"\\\${SRT_SSH_PROXY_COMMAND:?unset, but GIT_SSH_COMMAND needs it}\\"' sh '%h' %p"`,
      );
    } else if (platform === "macos")
      envVars.push(
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand='nc -X 5 -x localhost:${socksProxyPort} %h %p'`,
      );
    else if (platform === "linux" && httpProxyPort) {
      let socatAuth = proxyAuthToken ? `,proxyauth=${userRaw}:${proxyAuthToken}` : "";
      envVars.push(
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand='socat - PROXY:${w}:%h:%p,proxyport=${httpProxyPort}${socatAuth}'`,
      );
    }
    envVars.push(`FTP_PROXY=socks5h://${auth}${S}:${socksProxyPort}`);
    envVars.push(`ftp_proxy=socks5h://${auth}${S}:${socksProxyPort}`);
    envVars.push(`RSYNC_PROXY=${S}:${socksProxyPort}`);
    envVars.push(
      `DOCKER_HTTP_PROXY=http://${auth}${httpProxyPort ? w : S}:${httpProxyPort || socksProxyPort}`,
    );
    envVars.push(
      `DOCKER_HTTPS_PROXY=http://${auth}${httpProxyPort ? w : S}:${httpProxyPort || socksProxyPort}`,
    );
    if (httpProxyPort) {
      envVars.push("CLOUDSDK_PROXY_TYPE=http");
      envVars.push(`CLOUDSDK_PROXY_ADDRESS=${w}`);
      envVars.push(`CLOUDSDK_PROXY_PORT=${httpProxyPort}`);
      if (proxyAuthToken) {
        envVars.push(`CLOUDSDK_PROXY_USERNAME=${userRaw}`);
        envVars.push(`CLOUDSDK_PROXY_PASSWORD=${proxyAuthToken}`);
      }
    }
  }
  return envVars;
}
//@ chunk-r0ads4ty.js:10384-10971 esm-layout
function sshConnectScript(proxyPort, basic, nc = "/usr/bin/nc") {
  return `LC_ALL=C; no() { printf "sandbox proxy: %s\\n" "$*" >&2; exit 1; }; case $1 in ""|*[!A-Za-z0-9._:-]*) no bad host;; *:*) set -- "[$1]" "$2";; esac; case $2 in ""|*[!0-9]*) no bad port;; esac; exec 3<&0; { printf "CONNECT %s HTTP/1.1\\r\\nHost: %s\\r\\nProxy-Authorization: Basic ${basic}\\r\\n\\r\\n" "$1:$2" "$1:$2"; exec /bin/cat <&3; } | ${nc} 127.0.0.1 ${proxyPort} | { read -r v why; while read -r v; do case $v in ""|?) break;; esac; done; case $why in "200 "*) exec /bin/cat;; esac; why=\${why%?}; no "$1:$2: \${why:-no answer}"; } & exec >&-; wait $!`;
}
//@ chunk-r0ads4ty.js:10971-10980 esm-layout
var SAFE_DIRECTORY_WILDCARD_THRESHOLD = 8;
//@ chunk-r0ads4ty.js:10980-11702 esm-fingerprint
function buildGitConfigEnv(opts) {
  if (opts.baseEnv?.GIT_CONFIG_COUNT === "0") return {};
  let parsed = Number.parseInt(opts.baseEnv?.GIT_CONFIG_COUNT ?? "", 10);
  let start = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  let n = start;
  let out = {};
  let emit = (key, value) => {
    out[`GIT_CONFIG_KEY_${n}`] = key;
    out[`GIT_CONFIG_VALUE_${n}`] = value;
    n++;
  };
  let dirs = [
    ...new Set(
      opts.safeDirs
        .filter((d) => !!d)
        .map((d) => {
          let stripped = d.replace(/\\/g, "/").replace(/\/+$/, "");
          if (stripped === "" || /^[A-Za-z]:$/.test(stripped)) return `${stripped}/`;
          return stripped;
        }),
    ),
  ];
  if (dirs.length > SAFE_DIRECTORY_WILDCARD_THRESHOLD) emit("safe.directory", "*");
  else
    for (let d of dirs) {
      emit("safe.directory", d);
      emit("safe.directory", d.endsWith("/") ? `${d}*` : `${d}/*`);
    }
  if (opts.schannelCa) {
    emit("http.schannelUseSSLCAInfo", "true");
    emit("http.schannelCheckRevoke", "false");
  }
  if (opts.opensslBackend) emit("http.sslBackend", "openssl");
  if (n === start) return {};
  out.GIT_CONFIG_COUNT = String(n);
  return out;
}
//@ chunk-r0ads4ty.js:11702-11894 esm-fingerprint
function buildPosixGitSafeDirEnv(opts) {
  let baseEnv = {
    GIT_CONFIG_COUNT: process.env.GIT_CONFIG_COUNT,
  };
  for (let k of opts.unsetEnvVars ?? []) delete baseEnv[k];
  Object.assign(baseEnv, opts.setEnvVars ?? {});
  return buildGitConfigEnv({
    safeDirs: opts.safeDirs,
    baseEnv,
  });
}
//@ chunk-r0ads4ty.js:11894-11906 esm-layout
var SANDBOXED_COMMAND_KEY_LENGTH = 100;
//@ chunk-r0ads4ty.js:11906-11937 esm-layout
function ITt(command, commandId) {
  return !commandId ? command : commandId;
}
//@ chunk-r0ads4ty.js:11937-12015 esm-fingerprint
function encodeSandboxedCommand(command) {
  let truncatedCommand = command.slice(0, SANDBOXED_COMMAND_KEY_LENGTH);
  return Buffer.from(truncatedCommand).toString("base64");
}
//@ chunk-r0ads4ty.js:12015-12079 esm-fingerprint
function decodeSandboxedCommand(encodedCommand) {
  return Buffer.from(encodedCommand, "base64").toString("utf8");
}
//@ chunk-r0ads4ty.js:12079-12136 esm-fingerprint
var PROXY_AUTH_USER = "srt";
var MAX_PROXY_USERNAME_BYTES = 255;
var MAX_ENCODED_COMMAND_BYTES = MAX_PROXY_USERNAME_BYTES - Buffer.byteLength(`${PROXY_AUTH_USER}.`);
//@ chunk-r0ads4ty.js:12136-12226 esm-layout
function proxyUsernameFor(encodedCommand) {
  if (!encodedCommand) return PROXY_AUTH_USER;
  let user = `${PROXY_AUTH_USER}.${encodedCommand}`;
  return Buffer.byteLength(user) <= MAX_PROXY_USERNAME_BYTES ? user : PROXY_AUTH_USER;
}
//@ chunk-r0ads4ty.js:12226-12357 esm-fingerprint
function encodedCommandFromProxyUser(username) {
  if (!username || !username.startsWith(`${PROXY_AUTH_USER}.`)) return;
  let suffix = username.slice(PROXY_AUTH_USER.length + 1);
  if (!suffix || Buffer.byteLength(suffix) > MAX_ENCODED_COMMAND_BYTES) return;
  return suffix;
}
//@ chunk-r0ads4ty.js:12357-12422 esm-fingerprint
function finish(steps) {
  for (;;) {
    let step = steps.next();
    if (step.done) return step.value;
  }
}
//@ chunk-r0ads4ty.js:12422-12432 esm-layout
var TURN_MS = 10;
//@ chunk-r0ads4ty.js:12432-12684 esm-fingerprint
async function finishInTurns(steps, signal) {
  signal?.throwIfAborted();
  let since = performance.now();
  for (;;) {
    let step = steps.next();
    if (!step.done && performance.now() - since < TURN_MS) continue;
    if (!step.done) await new Promise((resolve) => setImmediate(resolve));
    signal?.throwIfAborted();
    if (step.done) return step.value;
    since = performance.now();
  }
}
//@ chunk-r0ads4ty.js:12684-12728 esm-layout
function expandGlobPattern(globPath, opts = {}) {
  return walkGlobPattern(globPath, opts).matches;
}
//@ chunk-r0ads4ty.js:12728-14314 esm-fingerprint
function globPositions(normalizedPattern, flags) {
  let regex = new RegExp(xTt(normalizedPattern), flags);
  let directoryForm = removeTrailingGlobSuffix(normalizedPattern);
  let directoryRegex =
    directoryForm !== normalizedPattern ? new RegExp(xTt(directoryForm), flags) : undefined;
  let unsplit = {
    splits: false,
    start: [0],
    next: () => [0],
    matches: (_positions, _name, spelled) => regex.test(spelled),
    matchesDirectoryForm: (_positions, _name, spelled) => directoryRegex?.test(spelled) === true,
  };
  let states = [];
  let star = globTokenToRegex({
    kind: GlobTokenKind.Star,
  });
  let build = (pieces) => {
    let sources = pieces.map(globTokenToRegex);
    let memo = new Map();
    let globstar = (then) =>
      states.push({
        then,
      }) - 1;
    let componentAt = (i, lead) => {
      let key = `${i}${lead ? "*" : ""}`;
      let known = memo.get(key);
      if (known !== undefined) return known;
      if (!lead && pieces[i]?.kind === GlobTokenKind.GlobstarSlash) {
        let id = globstar(undefined);
        memo.set(key, id);
        states[id].then = componentAt(i + 1, false);
        return id;
      }
      if (!lead && pieces[i]?.kind === GlobTokenKind.Globstar && i === pieces.length - 1) {
        let id = globstar(undefined);
        memo.set(key, id);
        return id;
      }
      let component = {
        edges: [],
      };
      let id = states.push(component) - 1;
      memo.set(key, id);
      let endsWith = (source, to) => {
        component.edges.push({
          regex: new RegExp(`^${source}$`, flags),
          to,
        });
      };
      let source = lead ? star : "";
      for (let j = i; ; j++) {
        let piece = pieces[j];
        if (piece === undefined) {
          endsWith(source, undefined);
          break;
        }
        if (piece.kind === GlobTokenKind.Separator) {
          endsWith(source, componentAt(j + 1, false));
          break;
        }
        if (piece.kind === GlobTokenKind.Globstar) {
          endsWith(source + star, globstar(componentAt(j + 1, true)));
          source += star;
        } else if (piece.kind === GlobTokenKind.GlobstarSlash)
          endsWith(source + star, globstar(componentAt(j + 1, false)));
        else if (piece.kind === GlobTokenKind.Set && piece.matchesSeparator) {
          endsWith(source, componentAt(j + 1, false));
          source += `(?!/)${sources[j]}`;
        } else source += sources[j];
      }
      return id;
    };
    return componentAt(0, false);
  };
  let starts;
  let firstOfDirectoryForm;
  try {
    starts = [build(parseGlob(normalizedPattern))];
    firstOfDirectoryForm = states.length;
    if (directoryRegex) starts.push(build(parseGlob(directoryForm)));
  } catch {
    return unsplit;
  }
  let open = (into, position) => {
    for (let p = position; p !== undefined && !into.has(p);) {
      into.add(p);
      let state = states[p];
      p = "then" in state ? state.then : undefined;
    }
  };
  let sorted = (positions) => [...positions].sort((x, y) => x - y);
  let endsAt = (positions, name, ofDirectoryForm) =>
    positions.some((p) => {
      if (p >= firstOfDirectoryForm !== ofDirectoryForm) return false;
      let state = states[p];
      return "then" in state
        ? state.then === undefined
        : state.edges.some((e) => e.to === undefined && e.regex.test(name));
    });
  let start = new Set();
  for (let start_2 of starts) open(start, start_2);
  return {
    splits: true,
    start: sorted(start),
    next: (positions, name) => {
      let next = new Set();
      for (let p of positions) {
        let state = states[p];
        if ("then" in state) open(next, p);
        else
          for (let edge of state.edges)
            if (edge.to !== undefined && edge.regex.test(name)) open(next, edge.to);
      }
      return sorted(next);
    },
    matches: (positions, name) => endsAt(positions, name, false),
    matchesDirectoryForm: (positions, name) => endsAt(positions, name, true),
  };
}
//@ chunk-r0ads4ty.js:14314-14429 esm-fingerprint
function globPatternBaseDir(normalizedPattern) {
  let staticPrefix = normalizedPattern.split(/[*?[\]]/)[0];
  if (!staticPrefix) return "";
  return staticPrefix.endsWith("/") ? staticPrefix.slice(0, -1) : pathModule_2.posix.dirname(staticPrefix);
}
//@ chunk-r0ads4ty.js:14429-14468 esm-layout
function globBaseDirIsRoot(baseDir) {
  return baseDir === "" || baseDir === "/";
}
//@ chunk-r0ads4ty.js:14468-14493 esm-layout
function toForwardSlashes(s) {
  return s;
}
//@ chunk-r0ads4ty.js:14493-14534 esm-layout
function walkGlobPattern(globPath, opts = {}) {
  return finish(walkGlobPatternSteps(globPath, opts));
}
//@ chunk-r0ads4ty.js:14534-18917 esm-fingerprint
function* walkGlobPatternSteps(globPath, opts = {}) {
  let walk = {
    baseLocation: "",
    matches: [],
    directoryMatches: [],
    symlinks: new Set(),
    uninspectableLinks: new Set(),
    unlisted: [],
    realOf: new Map(),
  };
  let anchor = opts.anchor === undefined ? undefined : toForwardSlashes(opts.anchor);
  let normalizedPattern =
    anchor === undefined
      ? toForwardSlashes(normalizePathForSandbox(globPath))
      : toForwardSlashes(globPath).slice(anchor.length);
  if (
    anchor !== undefined &&
    (!/[^/]/.test(anchor) ||
      !toForwardSlashes(globPath).startsWith(anchor) ||
      !(anchor.endsWith("/") || /^(\/|$)/.test(normalizedPattern)))
  )
    throw TypeError(`Glob pattern ${globPath} does not lie beneath the anchor ${opts.anchor}`);
  let patternBaseDir = globPatternBaseDir(normalizedPattern);
  let baseDirBelowAnchor = patternBaseDir === "/" ? "" : patternBaseDir;
  let baseDir = anchor === undefined ? patternBaseDir : anchor + baseDirBelowAnchor;
  if (globBaseDirIsRoot(baseDir)) {
    logForDebugging(
      `[Sandbox] Glob pattern has no literal directory below the root to start from, skipping: ${globPath}`,
      {
        level: "warn",
      },
    );
    return walk;
  }
  let flags = opts.caseInsensitive ? "is" : "s";
  let positions = globPositions(normalizedPattern, flags);
  if (opts.followSymlinkedDirectories && !positions.splits)
    logForDebugging(
      `[Sandbox] Glob pattern ${globPath} cannot be followed one path component at a time, so it is matched against real paths only and not through symlinked directories`,
      {
        level: "warn",
      },
    );
  let records = new Map();
  let listings = opts.listings ?? new Map();
  let pending = [];
  let codeOf = (err) => err?.code;
  let onRealPath = (real, short, call, absent, unread) => {
    try {
      return call(real);
    } catch (first) {
      if (short === real) throw first;
      let answer;
      try {
        answer = call(short);
      } catch (second) {
        throw absent(first) && !absent(second) ? second : first;
      }
      if (!absent(first) && codeOf(first) !== "ENAMETOOLONG") {
        logForDebugging(
          `[Sandbox] ${real} could not be read for glob pattern ${globPath}, so it is covered whole, whatever ${short} leads to: ${first}`,
          {
            level: "warn",
          },
        );
        unread();
      }
      return answer;
    }
  };
  let linkTargets = new Map();
  let linkTargetOf = (linkPath, realLinkPath) => {
    let cached = linkTargets.get(realLinkPath);
    if (cached !== undefined) return cached;
    let target;
    try {
      let unread = false;
      target = {
        ...onRealPath(
          realLinkPath,
          linkPath,
          (p) => ({
            isDirectory: fsModule_2.statSync(p).isDirectory(),
            real: realPathOf(p),
          }),
          isAbsenceErrno,
          () => (unread = true),
        ),
        unread,
      };
    } catch (err) {
      target = isAbsenceErrno(err) ? "absent" : "uninspectable";
    }
    linkTargets.set(realLinkPath, target);
    return target;
  };
  let withType = (entry, listedAs, real) => {
    if (
      entry.isFile() ||
      entry.isDirectory() ||
      entry.isSymbolicLink() ||
      entry.isFIFO() ||
      entry.isSocket() ||
      entry.isCharacterDevice() ||
      entry.isBlockDevice()
    )
      return entry;
    let { name } = entry;
    let spelled = pathModule_2.join(listedAs, name);
    let type = "other";
    try {
      let stats = fsModule_2.lstatSync(spelled);
      if (stats.isDirectory()) type = "directory";
      else if (stats.isSymbolicLink()) type = "link";
    } catch {
      try {
        let isDirectory = fsModule_2.statSync(spelled).isDirectory();
        if (realPathOf(spelled) !== pathModule_2.join(real, name)) type = "link";
        else if (isDirectory) type = "directory";
      } catch (err) {
        let code = err?.code;
        if (code === "ELOOP") type = "link";
        else if (code !== "ENOENT") {
          type = "directory";
          listings.set(pathModule_2.join(real, name), err instanceof Error ? err : Error(String(err)));
        }
      }
    }
    return {
      name,
      isDirectory: () => type === "directory",
      isSymbolicLink: () => type === "link",
    };
  };
  let baseSpelling = /^[A-Za-z]:$/.test(baseDir) ? `${baseDir}/` : baseDir;
  let baseReal = baseSpelling;
  try {
    baseReal = realPathOf(baseSpelling);
  } catch {}
  walk.baseLocation = baseReal;
  pending.push({
    dir: baseSpelling,
    real: baseReal,
    short: baseSpelling.length < baseReal.length ? baseSpelling : baseReal,
    positions: (anchor === undefined ? baseDir : baseDirBelowAnchor)
      .split("/")
      .reduce(positions.next, positions.start),
  });
  for (let frame = pending.pop(); frame !== undefined; frame = pending.pop()) {
    let { dir, real } = frame;
    let record = records.get(real) ?? {
      listedFor: new Set(),
    };
    records.set(real, record);
    let fresh = frame.positions.filter((p) => !record.listedFor.has(p));
    if (fresh.length === 0) continue;
    yield;
    let denyWhole = () => {
      if (record.unlisted) return;
      record.unlisted = true;
      walk.unlisted.push(dir);
      if (real !== dir) walk.realOf.set(dir, real);
    };
    let entries;
    try {
      let known = listings.get(real);
      if (known instanceof Error) throw known;
      entries =
        known ??
        onRealPath(
          real,
          frame.short,
          (p) =>
            fsModule_2
              .readdirSync(p, {
                withFileTypes: true,
              })
              .map((entry) => withType(entry, p, real)),
          (err) => codeOf(err) === "ENOENT",
          denyWhole,
        );
      listings.set(real, entries);
    } catch (err) {
      let errorCode = codeOf(err);
      logForDebugging(`[Sandbox] Error listing ${dir} for glob pattern ${globPath}: ${err}`, {
        level: errorCode === "ENOENT" ? "info" : "warn",
      });
      if (errorCode !== "ENOENT") {
        if (opts.listings !== undefined) listings.set(real, err instanceof Error ? err : Error(String(err)));
        denyWhole();
      }
      continue;
    }
    for (let p of fresh) record.listedFor.add(p);
    for (let entry of entries) {
      if (
        positions.splits &&
        !entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        !positions.matches(fresh, entry.name, "")
      )
        continue;
      let fullPath = pathModule_2.join(dir, entry.name);
      let realPath = pathModule_2.join(real, entry.name);
      let spelled = toForwardSlashes(fullPath);
      let candidate =
        anchor !== undefined && spelled.startsWith(anchor) ? spelled.slice(anchor.length) : spelled;
      let isMatch = positions.matches(fresh, entry.name, candidate);
      if (isMatch) walk.matches.push(fullPath);
      if (entry.isDirectory()) {
        let beneath = positions.next(fresh, entry.name);
        let isDirectoryMatch =
          opts.withDirectoryForm === true && positions.matchesDirectoryForm(fresh, entry.name, candidate);
        if (isDirectoryMatch) walk.directoryMatches.push(fullPath);
        if ((isMatch || isDirectoryMatch) && realPath !== fullPath) walk.realOf.set(fullPath, realPath);
        if (beneath.length > 0)
          pending.push({
            dir: fullPath,
            real: realPath,
            short: pathModule_2.join(frame.short, entry.name),
            positions: beneath,
          });
        continue;
      }
      if (!entry.isSymbolicLink()) {
        if (isMatch && realPath !== fullPath) walk.realOf.set(fullPath, realPath);
        continue;
      }
      walk.symlinks.add(fullPath);
      if (!opts.followSymlinkedDirectories) continue;
      let isDirectoryFormCandidate =
        opts.withDirectoryForm === true && positions.matchesDirectoryForm(fresh, entry.name, candidate);
      let beneath = positions.splits ? positions.next(fresh, entry.name) : [];
      if (!isMatch && !isDirectoryFormCandidate && beneath.length === 0) continue;
      let shortPath = pathModule_2.join(frame.short, entry.name);
      let target = linkTargetOf(shortPath, realPath);
      if (target === "absent") continue;
      let unread = target === "uninspectable" || target.unread;
      if (unread) {
        walk.uninspectableLinks.add(fullPath);
        if (isDirectoryFormCandidate) walk.directoryMatches.push(fullPath);
      }
      if (target === "uninspectable") continue;
      if (unread && (isMatch || (isDirectoryFormCandidate && target.isDirectory)))
        walk.matches.push(target.real === "/" ? real : target.real);
      if (isMatch && !unread) walk.realOf.set(fullPath, target.real);
      if (!target.isDirectory) continue;
      if (isDirectoryFormCandidate && !unread) {
        walk.directoryMatches.push(fullPath);
        walk.realOf.set(fullPath, target.real);
      }
      if (beneath.length === 0) continue;
      if (isAtOrUnder(real, target.real) || isAtOrUnder(baseReal, target.real)) {
        logForDebugging(
          `[Sandbox] Not following symlink ${fullPath} -> ${target.real} for glob pattern ${globPath}: it leads back up the tree`,
        );
        continue;
      }
      logForDebugging(
        `[Sandbox] Following symlink ${fullPath} -> ${target.real} for glob pattern ${globPath}`,
      );
      pending.push({
        dir: target.real,
        real: target.real,
        short: shortPath.length < target.real.length ? shortPath : target.real,
        positions: beneath,
      });
    }
  }
  return walk;
}
//@ chunk-fq0cr76a.js:857514-857561 affinity
var v0 = "(.*/)?";
var zae = 3;
var gM = 4096;
var Xae = /\[[^\]]*\*/;
//@ chunk-fq0cr76a.js:857561-857651 affinity
function yM(globPattern) {
  if (globPattern.length > gM)
    return {
      kind: "tooCostly",
    };
  return EM(globPattern, T0(Cwn(globPattern)), T0(xTt(globPattern)));
}
//@ chunk-fq0cr76a.js:857651-858025 esm-fingerprint
function bM(globPattern) {
  if (globPattern.length > gM)
    return {
      kind: "tooCostly",
    };
  let n = `^${globPattern
    .replace(/[.^$+{}()|\\]/g, "\\$&")
    .replace(/\[([^\]]*?)$/g, "\\[$1")
    .replace(/\*\*\//g, "__GLOBSTAR_SLASH__")
    .replace(/\*\*/g, "__GLOBSTAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__GLOBSTAR_SLASH__/g, v0)
    .replace(/__GLOBSTAR__/g, ".*")}$`;
  return EM(
    globPattern,
    escapeInvalidCharClasses(T0(`${n.slice(0, -1)}(/.*)?$`)),
    escapeInvalidCharClasses(T0(n)),
  );
}
//@ chunk-fq0cr76a.js:858025-858091 esm-fingerprint
function SM(globBaseDirectory) {
  let n = `^${globBaseDirectory === "/" ? "" : urlPatternToRegex(globBaseDirectory)}(/.*)?$`;
  return xM(n, n);
}
//@ chunk-fq0cr76a.js:858091-858254 affinity
function EM(e, n, r) {
  try {
    let translation = xM(n, r);
    if (Xae.test(e) || Jae(r))
      return {
        kind: "tooCostly",
      };
    return {
      kind: "read",
      translation,
    };
  } catch (error) {
    return {
      kind: "unreadable",
      error,
    };
  }
}
//@ chunk-fq0cr76a.js:858254-858359 affinity
function xM(e, n) {
  return {
    anyCase: new RegExp(e, "is"),
    ownCase: new RegExp(e, "s"),
    exactly: new RegExp(n, "is"),
  };
}
//@ chunk-fq0cr76a.js:858359-858419 affinity
function T0(e) {
  return e.replace(/(?:\(\.\*\/\)\?){2,}/g, v0);
}
//@ chunk-fq0cr76a.js:858419-858597 affinity
function Jae(e) {
  let replaced = e.replace(/\.\*\$$/, "$");
  let replaced_2 = replaced.replaceAll(`/${v0}`, "/");
  let s = (replaced.length - replaced_2.length) / v0.length;
  let h = replaced_2.split(".*").length - 1;
  return countCharInString(replaced_2, "*") - h + 2 * Math.max(0, s + 2 * h - 1) > zae;
}
//@ chunk-vp5gef34.js:15549-19463 esm-fingerprint
var j = Symbol("transient-read-failure");
var En = (e) => {
  let code = e?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "ENAMETOOLONG";
};
var Pn = (e) => {
  let code = e?.code;
  return code === "EACCES" || code === "EPERM";
};
var A = (error) => (En(error) ? "structural" : Pn(error) ? "permission" : "other");
var ut = async (e, t) => {
  let n = await open(e, readOnlyNoFollowFlags());
  try {
    let stats = await n.stat();
    if (!stats.isFile())
      throw Object.assign(Error("not a regular file"), {
        code: "ENOTREG",
      });
    if (t?.maxBytes !== undefined && stats.size > t.maxBytes)
      throw Object.assign(Error("exceeds the read cap"), {
        code: "EFBIG",
      });
    if (t?.withinReal !== undefined) {
      let s = await realpath(e).catch((error) => {
        if (A(error) === "structural") return;
        throw error;
      });
      if (s === undefined || !s.startsWith(t.withinReal + sep))
        throw Object.assign(Error("resolves outside the store root"), {
          code: "ENOTREG",
        });
      let r = await stat(s).catch((error) => {
        if (A(error) === "structural") return;
        throw error;
      });
      if (r === undefined)
        throw Object.assign(Error("resolves outside the store root"), {
          code: "ENOTREG",
        });
      if (r.dev !== stats.dev || r.ino !== stats.ino)
        throw Object.assign(Error("inode changed during read; retry"), {
          code: "EAGAIN",
        });
    }
    return await n.readFile();
  } finally {
    await n.close();
  }
};
var ft = (error) => {
  let code = error?.code;
  return code === "ENOTREG" || code === "ELOOP" || code === "EFBIG";
};
var fe = Symbol("not-a-regular-file");
var pt = async (e, t, maxFileBytes) =>
  lstat(join(e, t)).then(
    (o) => !o.isFile() || (maxFileBytes !== undefined && o.size > maxFileBytes),
    (error) => A(error) === "structural",
  );
var mt = async (e, t) => {
  if (!(await pt(e, t))) return false;
  return realpath(e).then(
    () => true,
    () => false,
  );
};
var ht = async (index, dir, path, options = C) => {
  if (index.pathToId.get(path) === undefined) return false;
  let r = await realpath(dir).catch(() => j);
  if (typeof r !== "string") return false;
  let i = await ut(join(dir, path), {
    withinReal: r,
    maxBytes: options.maxFileBytes,
  }).catch((error) => (ft(error) ? fe : A(error) === "structural" ? undefined : j));
  if (i === j) return false;
  if (i === fe) return hasDocumentPath(index, path);
  if (i === undefined) {
    if (!(await mt(dir, path))) return false;
    return hasDocumentPath(index, path);
  }
  if (i.byteLength > options.maxFileBytes) return hasDocumentPath(index, path);
  let a = new TextDecoder().decode(i);
  let c = await lstat(join(dir, path)).catch(() => {
    return;
  });
  upsertDocument(index, extractMemoryFieldsFromFile(path, a), {
    hash: gt(a),
    size: c?.size ?? i.byteLength,
    mtimeMs: c?.mtimeMs ?? 0,
  });
  return true;
};
var C = {
  excludeBasenames: ["MEMORY.md"],
  maxFiles: 2000,
  maxFileBytes: 1048576,
};
var textEncoder = new TextEncoder();
var gt = (e) => {
  let t = textEncoder.encode(e);
  let n = -2078137563;
  let o = -873292572;
  for (let idx = 0; idx < t.length; idx++) {
    n ^= t[idx];
    let i = n & 65535;
    let a = n >>> 16;
    let c = o & 65535;
    let l = o >>> 16;
    let d = i * 179;
    let h = d & 65535;
    d = a * 179 + (d >>> 16);
    let u = d & 65535;
    d = c * 179 + (d >>> 16);
    let p = d & 65535;
    d = l * 179 + (d >>> 16);
    let f = d & 65535;
    let m = n << 8;
    let g = (o << 8) | (n >>> 24);
    let S = h + (m & 65535);
    let I = u + (m >>> 16) + (S >>> 16);
    n = (I << 16) | (S & 65535);
    o = (((f << 16) | p) + g + m + (I >>> 16)) | 0;
  }
  let s = (r) => (r >>> 0).toString(16).padStart(8, "0");
  return s(o) + s(n);
};
var De = (e, t) => {
  if (t.excludeLog?.(e)) return true;
  if (t.isRecallVisible !== undefined && !t.isRecallVisible(e)) return true;
  if (t.excludePrefixes?.some((excludePrefix) => e.startsWith(excludePrefix))) return true;
  if (t.excludePaths !== undefined) return t.excludePaths.has(e);
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  return t.excludeBasenames.includes(sliced);
};
var Rn = async (e, t = C) => {
  let n = [];
  let o = new Set();
  let rootMissing = false;
  let r = [""];
  while (r.length > 0) {
    let f = r.pop();
    let m = await readdir(join(e, f), {
      withFileTypes: true,
    }).catch((error) => {
      if (f === "") {
        if (isENOENT(error)) {
          rootMissing = true;
          return [];
        }
        throw error;
      }
      switch (A(error)) {
        case "permission":
          o.add(f);
          return [];
        case "structural":
          return [];
        default:
          throw error;
      }
    });
    for (let g of m) {
      let S = f === "" ? g.name : `${f}/${g.name}`;
      if (g.isSymbolicLink()) continue;
      if (g.isDirectory()) {
        if (t.excludePrefixes?.some((excludePrefix) => `${S}/`.startsWith(excludePrefix)) ?? false) continue;
        r.push(S);
      } else n.push(S);
    }
  }
  let sorted = n
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !De(f, t))
    .sort();
  let a = new Set();
  let settled = await Promise.allSettled(
    sorted.map(async (f) => {
      let m = await lstat(join(e, f)).catch((error) => {
        switch (A(error)) {
          case "structural":
            return;
          case "permission":
            a.add(f);
            return;
          default:
            throw error;
        }
      });
      return m !== undefined && m.isFile() && m.size <= t.maxFileBytes
        ? {
            path: f,
            size: m.size,
            mtimeMs: m.mtimeMs,
          }
        : undefined;
    }),
  );
  let found = settled.find((f) => f.status === "rejected");
  if (found !== undefined && found.status === "rejected") throw found.reason;
  let filtered = settled
    .map((f) => (f.status === "fulfilled" ? f.value : undefined))
    .filter((f) => f !== undefined);
  let h =
    filtered.length <= t.maxFiles
      ? filtered
      : filtered
          .toSorted((f, m) => m.mtimeMs - f.mtimeMs)
          .slice(0, t.maxFiles)
          .toSorted((f, m) => (f.path < m.path ? -1 : 1));
  let u = new Set(h.map((f) => f.path));
  let capDropped = new Set(filtered.filter((f) => !u.has(f.path)).map((f) => f.path));
  return {
    files: h,
    skipped: a,
    skippedSubtrees: o,
    rootMissing,
    capDropped,
  };
};
export {
  getDefaultWritePaths,
  Nqt,
  stripExtendedPathPrefix,
  expandWindowsEnvRefs,
  containsGlobChars,
  removeTrailingGlobSuffix,
  yM,
  bM,
  SM,
  containsGlobCharsWin,
  isSymlinkOutsideBoundary,
  expandGlobPattern,
  C,
  Rn,
  A,
  j,
  De,
  pt,
  ut,
  ft,
  fe,
  mt,
  gt,
  ht,
  generateProxyEnvVars,
  markedLiteralPath,
  isUncPath,
  toForwardSlashes,
  collapseInteriorSpellings,
  isAbsenceErrno,
  containsGlobCharsForPlatform,
  normalizePathForSandbox,
  encodeSandboxedCommand,
  SANDBOXED_COMMAND_KEY_LENGTH,
  encodedCommandFromProxyUser,
  PROXY_AUTH_USER,
  decodeSandboxedCommand,
  ITt,
  walkGlobPatternSteps,
  finish,
  xwn,
  finishInTurns,
  globPatternBaseDir,
  globBaseDirIsRoot,
  isAtOrUnder,
  DANGEROUS_FILES,
  getDangerousDirectories,
  normalizeCaseForComparison,
  nameLocation,
  zot,
  properAncestors,
  buildPosixGitSafeDirEnv,
  Dqt,
  Cwn,
  MAX_ENCODED_COMMAND_BYTES,
  buildGitConfigEnv,
};
