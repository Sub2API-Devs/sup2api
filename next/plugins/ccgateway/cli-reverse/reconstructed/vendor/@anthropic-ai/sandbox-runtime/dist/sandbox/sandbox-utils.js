/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-getdj2mr.js (52), chunk-kbw92gv8.js (1), chunk-qg41pqt6.js (8)
 * attribution: esm-fingerprint 37, esm-layout 18, affinity 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "path";
import * as pathModule_2 from "path";
import { sep, join } from "path";
import { homedir } from "os";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import { open, realpath, stat, lstat, readdir } from "fs/promises";
import { globToRegex, globTokenToRegex, GlobTokenKind, parseGlob } from "./glob-pattern.js";
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
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-getdj2mr.js:3804-3856 esm-fingerprint
function denyGlobRegex(normalizedGlob) {
  return globToRegex(normalizedGlob).slice(0, -1) + "(/.*)?$";
}
//@ chunk-getdj2mr.js:3856-4006 esm-fingerprint
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
//@ chunk-getdj2mr.js:4006-4095 esm-fingerprint
function getDangerousDirectories() {
  return [...DANGEROUS_DIRECTORIES.filter((d) => d !== ".git"), ".claude/commands", ".claude/agents"];
}
//@ chunk-getdj2mr.js:4095-4134 esm-layout
function normalizeCaseForComparison(pathStr) {
  return pathStr.toLowerCase();
}
//@ chunk-getdj2mr.js:4134-4197 esm-layout
function isAtOrUnder(p, dir) {
  return p === dir || p.startsWith(dir === "/" ? "/" : dir + "/");
}
//@ chunk-getdj2mr.js:4197-4237 esm-layout
function coversChildPath(p, dir) {
  return p !== dir && isAtOrUnder(p, dir);
}
//@ chunk-getdj2mr.js:4237-4350 esm-fingerprint
function* properAncestors(absolutePath) {
  for (let slash = absolutePath.lastIndexOf("/"); slash > 0; slash = absolutePath.lastIndexOf("/", slash - 1))
    yield absolutePath.slice(0, slash);
  if (absolutePath !== "/") yield "/";
}
//@ chunk-getdj2mr.js:4350-4421 esm-layout
function pathSpellingVariants(candidatePath) {
  try {
    let resolved = realPathOf(candidatePath);
    if (resolved !== candidatePath) return [candidatePath, resolved];
  } catch {}
  return [candidatePath];
}
//@ chunk-getdj2mr.js:4421-4522 esm-fingerprint
function nameLocation(p, canonicalOf) {
  if (p === "/") return p;
  let parent = canonicalOf(pathModule_2.dirname(p));
  return `${parent === "/" ? "" : parent}/${pathModule_2.basename(p)}`;
}
//@ chunk-getdj2mr.js:4522-4576 esm-fingerprint
function workingDirectory() {
  try {
    return process.cwd();
  } catch {
    return;
  }
}
//@ chunk-getdj2mr.js:4576-4674 esm-fingerprint
function isAbsenceErrno(err) {
  let code = err?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "ENAMETOOLONG";
}
//@ chunk-getdj2mr.js:4674-4763 esm-layout
function containsGlobChars(pathPattern) {
  return (
    pathPattern.includes("*") ||
    pathPattern.includes("?") ||
    pathPattern.includes("[") ||
    pathPattern.includes("]")
  );
}
//@ chunk-getdj2mr.js:4763-4819 esm-layout
function containsGlobCharsWin(p) {
  return p.includes("*") || p.includes("?");
}
//@ chunk-getdj2mr.js:4819-4872 esm-fingerprint
function containsGlobCharsForPlatform(p) {
  return getPlatform() === "windows" ? containsGlobCharsWin(p) : containsGlobChars(p);
}
//@ chunk-getdj2mr.js:4872-5121 esm-layout
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
//@ chunk-getdj2mr.js:5121-5243 esm-fingerprint
function stripExtendedPathPrefix(p) {
  if (/^\\\\\?\\unc\\/i.test(p)) return "\\\\" + p.slice(8);
  if (p.startsWith("\\\\?\\")) return p.slice(4);
  return p;
}
//@ chunk-getdj2mr.js:5243-5337 esm-fingerprint
function isUncPath(p) {
  let ns = pathModule_2.win32.toNamespacedPath(p);
  return /^[\\/]{2}[?.][\\/]unc[\\/]/i.test(ns);
}
//@ chunk-getdj2mr.js:5337-5388 esm-fingerprint
function removeTrailingGlobSuffix(pathPattern) {
  return pathPattern.replace(/\/\*\*$/, "") || "/";
}
//@ chunk-getdj2mr.js:5388-5901 esm-fingerprint
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
  let startsWithOriginal = normalizedResolved.startsWith(normalizedOriginal + "/");
  let startsWithCanonical =
    canonicalOriginal !== normalizedOriginal && normalizedResolved.startsWith(canonicalOriginal + "/");
  if (
    !(canonicalOriginal !== normalizedOriginal && normalizedResolved === canonicalOriginal) &&
    !startsWithOriginal &&
    !startsWithCanonical
  )
    return true;
  return false;
}
//@ chunk-getdj2mr.js:5901-5992 esm-fingerprint
function expandTilde(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return homedir() + p.slice(1);
  return p;
}
//@ chunk-getdj2mr.js:5992-6165 esm-fingerprint
function expandWindowsEnvRefs(input) {
  let home = homedir();
  let drive = /^[A-Za-z]:/.test(home) ? home.slice(0, 2) : "";
  let homePath = drive ? home.slice(2) : home;
  return input
    .replace(/%USERPROFILE%/gi, home)
    .replace(/%HOMEDRIVE%/gi, drive)
    .replace(/%HOMEPATH%/gi, homePath);
}
//@ chunk-getdj2mr.js:6165-6239 esm-fingerprint
function collapseInteriorSpellings(pathPattern) {
  return pathPattern.replace(/\/{2,}/g, "/").replace(/\/\.(?=\/)/g, "");
}
//@ chunk-getdj2mr.js:6239-6453 esm-fingerprint
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
//@ chunk-getdj2mr.js:6453-7151 esm-fingerprint
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
  let normalizedPath = expandTilde(pathPattern);
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
//@ chunk-getdj2mr.js:7151-7322 esm-fingerprint
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
//@ chunk-getdj2mr.js:7322-7448 esm-fingerprint
function getDefaultWritePaths(readRules) {
  let home = homedir();
  let keptDirs =
    !readRules || readRules.denyRead.length === 0
      ? HOME_CONVENIENCE_WRITE_DIRS
      : homeDirsNotReadDenied(home, readRules.denyRead, readRules.allowRead);
  return [...SANDBOX_OWN_WRITE_PATHS, ...keptDirs.map((rel) => pathModule_2.join(home, rel))];
}
//@ chunk-getdj2mr.js:7448-7780 esm-fingerprint
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
//@ chunk-getdj2mr.js:7780-7989 esm-fingerprint
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
//@ chunk-getdj2mr.js:7989-8144 esm-fingerprint
function compiledDenyGlob(normalizedGlob) {
  let regex = compiledDenyGlobs.get(normalizedGlob);
  if (regex === undefined) {
    try {
      regex = new RegExp(denyGlobRegex(normalizedGlob));
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
//@ chunk-getdj2mr.js:8144-8387 esm-layout
var compiledDenyGlobs; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var compiledDenyGlobChars;
var MAX_COMPILED_DENY_GLOB_CHARS;
var CA_TRUST_VARS;
deferInit("chunk-getdj2mr.js:8144", () => {
  compiledDenyGlobs = new Map();
  compiledDenyGlobChars = 0;
  MAX_COMPILED_DENY_GLOB_CHARS = 1048576;
  CA_TRUST_VARS = [
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
});
//@ chunk-getdj2mr.js:8387-10384 esm-fingerprint
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
  let httpProxyHostV4 = proxyAuthToken ? "127.0.0.1" : "localhost";
  let httpProxyHostV6 = proxyAuthToken && httpProxyPort === socksProxyPort ? "127.0.0.1" : "localhost";
  if (httpProxyPort) {
    envVars.push(`HTTP_PROXY=http://${auth}${httpProxyHostV4}:${httpProxyPort}`);
    envVars.push(`HTTPS_PROXY=http://${auth}${httpProxyHostV4}:${httpProxyPort}`);
    envVars.push(`http_proxy=http://${auth}${httpProxyHostV4}:${httpProxyPort}`);
    envVars.push(`https_proxy=http://${auth}${httpProxyHostV4}:${httpProxyPort}`);
    if (proxyAuthToken) envVars.push("GIT_CONFIG_PARAMETERS='http.proxyAuthMethod=basic'");
  }
  let connectProxyUrl = httpProxyPort
    ? `http://${auth}${httpProxyHostV4}:${httpProxyPort}`
    : `socks5h://${auth}${httpProxyHostV6}:${socksProxyPort}`;
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
        `GIT_SSH_COMMAND=ssh -o ControlMaster=no -o ControlPath=none -o ProxyCommand='socat - PROXY:${httpProxyHostV4}:%h:%p,proxyport=${httpProxyPort}${socatAuth}'`,
      );
    }
    envVars.push(`FTP_PROXY=socks5h://${auth}${httpProxyHostV6}:${socksProxyPort}`);
    envVars.push(`ftp_proxy=socks5h://${auth}${httpProxyHostV6}:${socksProxyPort}`);
    envVars.push(`RSYNC_PROXY=${httpProxyHostV6}:${socksProxyPort}`);
    envVars.push(
      `DOCKER_HTTP_PROXY=http://${auth}${httpProxyPort ? httpProxyHostV4 : httpProxyHostV6}:${httpProxyPort || socksProxyPort}`,
    );
    envVars.push(
      `DOCKER_HTTPS_PROXY=http://${auth}${httpProxyPort ? httpProxyHostV4 : httpProxyHostV6}:${httpProxyPort || socksProxyPort}`,
    );
    if (httpProxyPort) {
      envVars.push("CLOUDSDK_PROXY_TYPE=http");
      envVars.push(`CLOUDSDK_PROXY_ADDRESS=${httpProxyHostV4}`);
      envVars.push(`CLOUDSDK_PROXY_PORT=${httpProxyPort}`);
      if (proxyAuthToken) {
        envVars.push(`CLOUDSDK_PROXY_USERNAME=${userRaw}`);
        envVars.push(`CLOUDSDK_PROXY_PASSWORD=${proxyAuthToken}`);
      }
    }
  }
  return envVars;
}
//@ chunk-getdj2mr.js:10384-10971 esm-layout
function sshConnectScript(proxyPort, basic, nc = "/usr/bin/nc") {
  return `LC_ALL=C; no() { printf "sandbox proxy: %s\\n" "$*" >&2; exit 1; }; case $1 in ""|*[!A-Za-z0-9._:-]*) no bad host;; *:*) set -- "[$1]" "$2";; esac; case $2 in ""|*[!0-9]*) no bad port;; esac; exec 3<&0; { printf "CONNECT %s HTTP/1.1\\r\\nHost: %s\\r\\nProxy-Authorization: Basic ${basic}\\r\\n\\r\\n" "$1:$2" "$1:$2"; exec /bin/cat <&3; } | ${nc} 127.0.0.1 ${proxyPort} | { read -r v why; while read -r v; do case $v in ""|?) break;; esac; done; case $why in "200 "*) exec /bin/cat;; esac; why=\${why%?}; no "$1:$2: \${why:-no answer}"; } & exec >&-; wait $!`;
}
//@ chunk-getdj2mr.js:10971-10980 esm-layout
var SAFE_DIRECTORY_WILDCARD_THRESHOLD = 8;
//@ chunk-getdj2mr.js:10980-11702 esm-fingerprint
function buildGitConfigEnv(opts) {
  if (opts.baseEnv?.GIT_CONFIG_COUNT === "0") return {};
  let parsed = Number.parseInt(opts.baseEnv?.GIT_CONFIG_COUNT ?? "", 10);
  let start = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  let configIndex = start;
  let out = {};
  let emit = (key, value) => {
    out[`GIT_CONFIG_KEY_${configIndex}`] = key;
    out[`GIT_CONFIG_VALUE_${configIndex}`] = value;
    configIndex++;
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
  if (configIndex === start) return {};
  out.GIT_CONFIG_COUNT = String(configIndex);
  return out;
}
//@ chunk-getdj2mr.js:11702-11894 esm-fingerprint
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
//@ chunk-getdj2mr.js:11894-11906 esm-layout
var SANDBOXED_COMMAND_KEY_LENGTH = 100;
//@ chunk-getdj2mr.js:11906-11937 esm-layout
function orDefault(command, commandId) {
  return !commandId ? command : commandId;
}
//@ chunk-getdj2mr.js:11937-12015 esm-fingerprint
function encodeSandboxedCommand(command) {
  let truncatedCommand = command.slice(0, SANDBOXED_COMMAND_KEY_LENGTH);
  return Buffer.from(truncatedCommand).toString("base64");
}
//@ chunk-getdj2mr.js:12015-12079 esm-fingerprint
function decodeSandboxedCommand(encodedCommand) {
  return Buffer.from(encodedCommand, "base64").toString("utf8");
}
//@ chunk-getdj2mr.js:12079-12136 esm-fingerprint
var PROXY_AUTH_USER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_PROXY_USERNAME_BYTES;
var MAX_ENCODED_COMMAND_BYTES;
deferInit("chunk-getdj2mr.js:12079", () => {
  PROXY_AUTH_USER = "srt";
  MAX_PROXY_USERNAME_BYTES = 255;
  MAX_ENCODED_COMMAND_BYTES = MAX_PROXY_USERNAME_BYTES - Buffer.byteLength(`${PROXY_AUTH_USER}.`);
});
//@ chunk-getdj2mr.js:12136-12226 esm-layout
function proxyUsernameFor(encodedCommand) {
  if (!encodedCommand) return PROXY_AUTH_USER;
  let user = `${PROXY_AUTH_USER}.${encodedCommand}`;
  return Buffer.byteLength(user) <= MAX_PROXY_USERNAME_BYTES ? user : PROXY_AUTH_USER;
}
//@ chunk-getdj2mr.js:12226-12357 esm-fingerprint
function encodedCommandFromProxyUser(username) {
  if (!username || !username.startsWith(`${PROXY_AUTH_USER}.`)) return;
  let suffix = username.slice(PROXY_AUTH_USER.length + 1);
  if (!suffix || Buffer.byteLength(suffix) > MAX_ENCODED_COMMAND_BYTES) return;
  return suffix;
}
//@ chunk-getdj2mr.js:12357-12422 esm-fingerprint
function finish(steps) {
  for (;;) {
    let step = steps.next();
    if (step.done) return step.value;
  }
}
//@ chunk-getdj2mr.js:12422-12432 esm-layout
var TURN_MS = 10;
//@ chunk-getdj2mr.js:12432-12684 esm-fingerprint
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
//@ chunk-getdj2mr.js:12684-12728 esm-layout
function expandGlobPattern(globPath, opts = {}) {
  return walkGlobPattern(globPath, opts).matches;
}
//@ chunk-getdj2mr.js:12728-14314 esm-fingerprint
function globPositions(normalizedPattern, flags) {
  let regex = new RegExp(globToRegex(normalizedPattern), flags);
  let directoryForm = removeTrailingGlobSuffix(normalizedPattern);
  let directoryRegex =
    directoryForm !== normalizedPattern ? new RegExp(globToRegex(directoryForm), flags) : undefined;
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
//@ chunk-getdj2mr.js:14314-14429 esm-fingerprint
function globPatternBaseDir(normalizedPattern) {
  let staticPrefix = normalizedPattern.split(/[*?[\]]/)[0];
  if (!staticPrefix) return "";
  return staticPrefix.endsWith("/") ? staticPrefix.slice(0, -1) : pathModule_2.posix.dirname(staticPrefix);
}
//@ chunk-getdj2mr.js:14429-14468 esm-layout
function globBaseDirIsRoot(baseDir) {
  return baseDir === "" || baseDir === "/";
}
//@ chunk-getdj2mr.js:14468-14493 esm-layout
function toForwardSlashes(s) {
  return s;
}
//@ chunk-getdj2mr.js:14493-14534 esm-layout
function walkGlobPattern(globPath, opts = {}) {
  return finish(walkGlobPatternSteps(globPath, opts));
}
//@ chunk-getdj2mr.js:14534-18917 esm-fingerprint
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
//@ chunk-qg41pqt6.js:859209-859256 affinity
var GLOBSTAR_SLASH_PLACEHOLDER = "(.*/)?";
var MAX_GLOB_DEPTH = 3;
var MAX_GLOB_LENGTH = 4096;
var UNCLOSED_SET_REGEX = /\[[^\]]*\*/;
//@ chunk-qg41pqt6.js:859256-859346 affinity
function compileDenyGlob(globPattern) {
  if (globPattern.length > MAX_GLOB_LENGTH)
    return {
      kind: "tooCostly",
    };
  return readRuleMatcher(
    globPattern,
    collapseGlobstarSlashes(denyGlobRegex(globPattern)),
    collapseGlobstarSlashes(globToRegex(globPattern)),
  );
}
//@ chunk-qg41pqt6.js:859346-859720 esm-fingerprint
function canonicalGlobSource(source) {
  if (source.length > MAX_GLOB_LENGTH)
    return {
      kind: "tooCostly",
    };
  let source_2 = `^${source
    .replace(/[.^$+{}()|\\]/g, "\\$&")
    .replace(/\[([^\]]*?)$/g, "\\[$1")
    .replace(/\*\*\//g, "__GLOBSTAR_SLASH__")
    .replace(/\*\*/g, "__GLOBSTAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/__GLOBSTAR_SLASH__/g, GLOBSTAR_SLASH_PLACEHOLDER)
    .replace(/__GLOBSTAR__/g, ".*")}$`;
  return readRuleMatcher(
    source,
    escapeInvalidCharClasses(collapseGlobstarSlashes(`${source_2.slice(0, -1)}(/.*)?$`)),
    escapeInvalidCharClasses(collapseGlobstarSlashes(source_2)),
  );
}
//@ chunk-qg41pqt6.js:859720-859786 esm-fingerprint
function directoryCoverRegex(globBaseDirectory) {
  let pattern = `^${globBaseDirectory === "/" ? "" : urlPatternToRegex(globBaseDirectory)}(/.*)?$`;
  return compileRegexVariants(pattern, pattern);
}
//@ chunk-qg41pqt6.js:859786-859949 affinity
function readRuleMatcher(source, exactSource, directorySource) {
  try {
    let translation = compileRegexVariants(exactSource, directorySource);
    if (UNCLOSED_SET_REGEX.test(source) || globComplexity(directorySource))
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
//@ chunk-qg41pqt6.js:859949-860054 affinity
function compileRegexVariants(anyCaseSource, exactSource) {
  return {
    anyCase: new RegExp(anyCaseSource, "is"),
    ownCase: new RegExp(anyCaseSource, "s"),
    exactly: new RegExp(exactSource, "is"),
  };
}
//@ chunk-qg41pqt6.js:860054-860114 affinity
function collapseGlobstarSlashes(source) {
  return source.replace(/(?:\(\.\*\/\)\?){2,}/g, GLOBSTAR_SLASH_PLACEHOLDER);
}
//@ chunk-qg41pqt6.js:860114-860292 affinity
function globComplexity(pathPattern) {
  let replaced = pathPattern.replace(/\.\*\$$/, "$");
  let replaced_2 = replaced.replaceAll(`/${GLOBSTAR_SLASH_PLACEHOLDER}`, "/");
  let globstarCount = (replaced.length - replaced_2.length) / GLOBSTAR_SLASH_PLACEHOLDER.length;
  let extraGlobstarCount = replaced_2.split(".*").length - 1;
  return (
    countCharInString(replaced_2, "*") -
      extraGlobstarCount +
      2 * Math.max(0, globstarCount + 2 * extraGlobstarCount - 1) >
    MAX_GLOB_DEPTH
  );
}
//@ chunk-kbw92gv8.js:15661-19575 esm-fingerprint
var TRANSIENT_READ_FAILURE_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var isTransientReadError;
var isPermissionError;
var classifyReadError;
var readFileGuarded;
var isNotRegularFileError;
var NOT_A_REGULAR_FILE;
var isMissingNonFileOrOversized;
var existsAsRegularFile;
var readAndVerifyStoreEntry;
var DEFAULT_SYNC_OPTIONS;
var textEncoder;
var hashContent;
var isExcludedPath;
var scanStoreFiles;
deferInit("chunk-kbw92gv8.js:15661", () => {
  TRANSIENT_READ_FAILURE_2 = Symbol("transient-read-failure");
  isTransientReadError = (error) => {
    let code = error?.code;
    return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "ENAMETOOLONG";
  };
  isPermissionError = (error) => {
    let code = error?.code;
    return code === "EACCES" || code === "EPERM";
  };
  classifyReadError = (error) =>
    isTransientReadError(error) ? "structural" : isPermissionError(error) ? "permission" : "other";
  readFileGuarded = async (filePath, limits) => {
    let handle = await open(filePath, readOnlyNoFollowFlags());
    try {
      let stats = await handle.stat();
      if (!stats.isFile())
        throw Object.assign(Error("not a regular file"), {
          code: "ENOTREG",
        });
      if (limits?.maxBytes !== undefined && stats.size > limits.maxBytes)
        throw Object.assign(Error("exceeds the read cap"), {
          code: "EFBIG",
        });
      if (limits?.withinReal !== undefined) {
        let realPath = await realpath(filePath).catch((error) => {
          if (classifyReadError(error) === "structural") return;
          throw error;
        });
        if (realPath === undefined || !realPath.startsWith(limits.withinReal + sep))
          throw Object.assign(Error("resolves outside the store root"), {
            code: "ENOTREG",
          });
        let realStat = await stat(realPath).catch((error) => {
          if (classifyReadError(error) === "structural") return;
          throw error;
        });
        if (realStat === undefined)
          throw Object.assign(Error("resolves outside the store root"), {
            code: "ENOTREG",
          });
        if (realStat.dev !== stats.dev || realStat.ino !== stats.ino)
          throw Object.assign(Error("inode changed during read; retry"), {
            code: "EAGAIN",
          });
      }
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  };
  isNotRegularFileError = (error) => {
    let code = error?.code;
    return code === "ENOTREG" || code === "ELOOP" || code === "EFBIG";
  };
  NOT_A_REGULAR_FILE = Symbol("not-a-regular-file");
  isMissingNonFileOrOversized = async (dir, name, maxFileBytes) =>
    lstat(join(dir, name)).then(
      (stats) => !stats.isFile() || (maxFileBytes !== undefined && stats.size > maxFileBytes),
      (error) => classifyReadError(error) === "structural",
    );
  existsAsRegularFile = async (dir, rootDir) => {
    if (!(await isMissingNonFileOrOversized(dir, rootDir))) return false;
    return realpath(dir).then(
      () => true,
      () => false,
    );
  };
  readAndVerifyStoreEntry = async (index, dir, path, options = DEFAULT_SYNC_OPTIONS) => {
    if (index.pathToId.get(path) === undefined) return false;
    let realRoot = await realpath(dir).catch(() => TRANSIENT_READ_FAILURE_2);
    if (typeof realRoot !== "string") return false;
    let content = await readFileGuarded(join(dir, path), {
      withinReal: realRoot,
      maxBytes: options.maxFileBytes,
    }).catch((error) =>
      isNotRegularFileError(error)
        ? NOT_A_REGULAR_FILE
        : classifyReadError(error) === "structural"
          ? undefined
          : TRANSIENT_READ_FAILURE_2,
    );
    if (content === TRANSIENT_READ_FAILURE_2) return false;
    if (content === NOT_A_REGULAR_FILE) return hasDocumentPath(index, path);
    if (content === undefined) {
      if (!(await existsAsRegularFile(dir, path))) return false;
      return hasDocumentPath(index, path);
    }
    if (content.byteLength > options.maxFileBytes) return hasDocumentPath(index, path);
    let text = new TextDecoder().decode(content);
    let stats = await lstat(join(dir, path)).catch(() => {
      return;
    });
    upsertDocument(index, extractMemoryFieldsFromFile(path, text), {
      hash: hashContent(text),
      size: stats?.size ?? content.byteLength,
      mtimeMs: stats?.mtimeMs ?? 0,
    });
    return true;
  };
  DEFAULT_SYNC_OPTIONS = {
    excludeBasenames: ["MEMORY.md"],
    maxFiles: 2000,
    maxFileBytes: 1048576,
  };
  textEncoder = new TextEncoder();
  hashContent = (text) => {
    let bytes = textEncoder.encode(text);
    let hashHigh = -2078137563;
    let hashLow = -873292572;
    for (let j = 0; j < bytes.length; j++) {
      hashHigh ^= bytes[j];
      let chunkLow = hashHigh & 65535;
      let chunkHigh = hashHigh >>> 16;
      let chunkHighMul = hashLow & 65535;
      let chunkLowMul = hashLow >>> 16;
      let value = chunkLow * 179;
      let lowCarry = value & 65535;
      value = chunkHigh * 179 + (value >>> 16);
      let highCarry = value & 65535;
      value = chunkHighMul * 179 + (value >>> 16);
      let lowSum = value & 65535;
      value = chunkLowMul * 179 + (value >>> 16);
      let carryFlag = value & 65535;
      let shiftedHigh = hashHigh << 8;
      let shiftedLow = (hashLow << 8) | (hashHigh >>> 24);
      let nextHigh = lowCarry + (shiftedHigh & 65535);
      let nextLow = highCarry + (shiftedHigh >>> 16) + (nextHigh >>> 16);
      hashHigh = (nextLow << 16) | (nextHigh & 65535);
      hashLow = (((carryFlag << 16) | lowSum) + shiftedLow + shiftedHigh + (nextLow >>> 16)) | 0;
    }
    let toHex = (value) => (value >>> 0).toString(16).padStart(8, "0");
    return toHex(hashLow) + toHex(hashHigh);
  };
  isExcludedPath = (relPath, options) => {
    if (options.excludeLog?.(relPath)) return true;
    if (options.isRecallVisible !== undefined && !options.isRecallVisible(relPath)) return true;
    if (options.excludePrefixes?.some((excludePrefix) => relPath.startsWith(excludePrefix))) return true;
    if (options.excludePaths !== undefined) return options.excludePaths.has(relPath);
    let sliced = relPath.slice(relPath.lastIndexOf("/") + 1);
    return options.excludeBasenames.includes(sliced);
  };
  scanStoreFiles = async (root, options = DEFAULT_SYNC_OPTIONS) => {
    let files = [];
    let skipped = new Set();
    let rootMissing = false;
    let rootMissing_2 = [""];
    while (rootMissing_2.length > 0) {
      let pending = rootMissing_2.pop();
      let dir = await readdir(join(root, pending), {
        withFileTypes: true,
      }).catch((error) => {
        if (pending === "") {
          if (isENOENT(error)) {
            rootMissing = true;
            return [];
          }
          throw error;
        }
        switch (classifyReadError(error)) {
          case "permission":
            skipped.add(pending);
            return [];
          case "structural":
            return [];
          default:
            throw error;
        }
      });
      for (let entry of dir) {
        let relPath = pending === "" ? entry.name : `${pending}/${entry.name}`;
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (
            options.excludePrefixes?.some((excludePrefix) => `${relPath}/`.startsWith(excludePrefix)) ??
            false
          )
            continue;
          rootMissing_2.push(relPath);
        } else files.push(relPath);
      }
    }
    let sorted = files
      .filter((relPath) => relPath.endsWith(".md"))
      .filter((relativePath) => !isExcludedPath(relativePath, options))
      .sort();
    let skipped_2 = new Set();
    let settled = await Promise.allSettled(
      sorted.map(async (relPath) => {
        let stats = await lstat(join(root, relPath)).catch((error) => {
          switch (classifyReadError(error)) {
            case "structural":
              return;
            case "permission":
              skipped_2.add(relPath);
              return;
            default:
              throw error;
          }
        });
        return stats !== undefined && stats.isFile() && stats.size <= options.maxFileBytes
          ? {
              path: relPath,
              size: stats.size,
              mtimeMs: stats.mtimeMs,
            }
          : undefined;
      }),
    );
    let found = settled.find((path) => path.status === "rejected");
    if (found !== undefined && found.status === "rejected") throw found.reason;
    let filtered = settled
      .map((path) => (path.status === "fulfilled" ? path.value : undefined))
      .filter((path) => path !== undefined);
    let cappedPaths =
      filtered.length <= options.maxFiles
        ? filtered
        : filtered
            .toSorted((relPath, size) => size.mtimeMs - relPath.mtimeMs)
            .slice(0, options.maxFiles)
            .toSorted((code, mtimeMs) => (code.path < mtimeMs.path ? -1 : 1));
    let entryFiles = new Set(cappedPaths.map((index) => index.path));
    let capDropped = new Set(
      filtered.filter((result) => !entryFiles.has(result.path)).map((result) => result.path),
    );
    return {
      files: cappedPaths,
      skipped: skipped_2,
      skippedSubtrees: skipped,
      rootMissing,
      capDropped,
    };
  };
});
export {
  containsGlobCharsForPlatform,
  getDefaultWritePaths,
  removeTrailingGlobSuffix,
  DEFAULT_SYNC_OPTIONS,
  scanStoreFiles,
  classifyReadError,
  TRANSIENT_READ_FAILURE_2,
  isExcludedPath,
  isMissingNonFileOrOversized,
  readFileGuarded,
  isNotRegularFileError,
  NOT_A_REGULAR_FILE,
  existsAsRegularFile,
  hashContent,
  readAndVerifyStoreEntry,
  stripExtendedPathPrefix,
  containsGlobChars,
  compileDenyGlob,
  canonicalGlobSource,
  directoryCoverRegex,
  expandWindowsEnvRefs,
  containsGlobCharsWin,
  isSymlinkOutsideBoundary,
  expandGlobPattern,
  generateProxyEnvVars,
  expandTilde,
  isAtOrUnder,
  DANGEROUS_FILES,
  getDangerousDirectories,
  normalizeCaseForComparison,
  isAbsenceErrno,
  workingDirectory,
  nameLocation,
  coversChildPath,
  normalizePathForSandbox,
  properAncestors,
  encodeSandboxedCommand,
  orDefault,
  buildPosixGitSafeDirEnv,
  markedLiteralPath,
  isUncPath,
  toForwardSlashes,
  collapseInteriorSpellings,
  SANDBOXED_COMMAND_KEY_LENGTH,
  encodedCommandFromProxyUser,
  PROXY_AUTH_USER,
  decodeSandboxedCommand,
  walkGlobPatternSteps,
  finish,
  finishInTurns,
  globPatternBaseDir,
  globBaseDirIsRoot,
  pathSpellingVariants,
  denyGlobRegex,
  MAX_ENCODED_COMMAND_BYTES,
  buildGitConfigEnv,
};
