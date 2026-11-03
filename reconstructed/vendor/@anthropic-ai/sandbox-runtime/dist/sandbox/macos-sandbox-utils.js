/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/macos-sandbox-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (40)
 * attribution: esm-fingerprint 32, esm-layout 8
 */
import * as pathModule_2 from "path";
import "path";
import "path";
import "path";
import "path";
import { spawn } from "child_process";
import {
  normalizePathForSandbox,
  DANGEROUS_FILES,
  getDangerousDirectories,
  encodeSandboxedCommand,
  Cwn,
  containsGlobChars,
  zot,
  Dqt,
  nameLocation,
  isAtOrUnder,
  ITt,
  generateProxyEnvVars,
  buildPosixGitSafeDirEnv,
  decodeSandboxedCommand,
} from "./sandbox-utils.js";
import { escapeRegexLiteral, xTt } from "./glob-pattern.js";
import { literalReadings } from "./path-entries.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { buildJavaToolOptions } from "./java-proxy-agent.js";
import { whichSync } from "../utils/which.js";
import { quote } from "../utils/shell-quote.js";
import { shouldIgnoreViolation } from "./sandbox-violation-store.js";

//@ chunk-fq0cr76a.js:758526-758857 esm-fingerprint
function macGetMandatoryDenyEntries(allowGitConfig = false) {
  let cwd = normalizePathForSandbox(process.cwd(), {
    literal: true,
  });
  let entries = [];
  let literal = (relativePath) => toLiteralPathEntry(pathModule_2.resolve(cwd, relativePath));
  let beneathCwd = (pattern) => anchoredGlobEntry(cwd, pattern);
  for (let fileName of DANGEROUS_FILES) {
    entries.push(literal(fileName));
    entries.push(beneathCwd(`**/${fileName}`));
  }
  for (let dirName of getDangerousDirectories()) {
    entries.push(literal(dirName));
    entries.push(beneathCwd(`**/${dirName}/**`));
  }
  entries.push(literal(".git/hooks"));
  entries.push(beneathCwd("**/.git/hooks/**"));
  if (!allowGitConfig) {
    entries.push(literal(".git/config"));
    entries.push(beneathCwd("**/.git/config"));
  }
  return entries;
}
//@ chunk-fq0cr76a.js:758857-758913 esm-fingerprint
var sessionSuffix = `_${Math.random().toString(36).slice(2, 11)}_SBX`;
//@ chunk-fq0cr76a.js:758913-758962 esm-fingerprint
function generateLogTag(attributionCommand) {
  return `CMD64_${encodeSandboxedCommand(attributionCommand)}_END_${sessionSuffix}`;
}
//@ chunk-fq0cr76a.js:758962-759040 esm-fingerprint
function pathFilter(entry) {
  return entry.glob ? `(regex ${escapePath(globRegex(entry))})` : `(subpath ${escapePath(entry.path)})`;
}
//@ chunk-fq0cr76a.js:759040-759173 esm-fingerprint
function anchorRegex(entry, compile) {
  if (entry.anchor === undefined) return compile(entry.path);
  let pattern = entry.path.slice(entry.anchor.length);
  return `^${escapeRegexLiteral(entry.anchor)}${compile(pattern).slice(1)}`;
}
//@ chunk-fq0cr76a.js:759173-759205 esm-layout
function globRegex(entry) {
  return anchorRegex(entry, xTt);
}
//@ chunk-fq0cr76a.js:759205-759237 esm-layout
function denyGlobEntryRegex(entry) {
  return anchorRegex(entry, Cwn);
}
//@ chunk-fq0cr76a.js:759237-759315 esm-fingerprint
function denyPathFilter(entry) {
  return entry.glob
    ? `(regex ${escapePath(denyGlobEntryRegex(entry))})`
    : `(subpath ${escapePath(entry.path)})`;
}
//@ chunk-fq0cr76a.js:759315-759439 esm-fingerprint
function entrySamplePath(entry) {
  if (!entry.glob) return entry.path;
  let anchor = entry.anchor ?? "";
  return anchor + entry.path.slice(anchor.length).replace(/\[[^\]]*\]|[*?]+/g, "x");
}
//@ chunk-fq0cr76a.js:759439-759584 esm-fingerprint
function carveFilter(filter, carveOuts) {
  let unique = [...new Set(carveOuts)];
  if (unique.length === 0) return filter;
  let nots = unique.map((c) => `(require-not ${c})`).join(" ");
  return `(require-all ${filter} ${nots})`;
}
//@ chunk-fq0cr76a.js:759584-759644 esm-fingerprint
function anchoredGlobEntry(anchor, pattern) {
  return {
    glob: true,
    path: pathModule_2.join(anchor, pattern),
    anchor,
  };
}
//@ chunk-fq0cr76a.js:759644-759727 esm-fingerprint
function toPathEntry(pathPattern) {
  return containsGlobChars(pathPattern)
    ? {
        glob: true,
        path: normalizePathForSandbox(pathPattern),
      }
    : {
        glob: false,
        path: normalizePathForSandbox(pathPattern, {
          literal: true,
        }),
      };
}
//@ chunk-fq0cr76a.js:759727-759782 esm-fingerprint
function toLiteralPathEntry(literalPath) {
  return {
    path: normalizePathForSandbox(literalPath, {
      literal: true,
    }),
    glob: false,
  };
}
//@ chunk-fq0cr76a.js:759782-759835 esm-fingerprint
function alsoReadAs(spellings, kind) {
  return (spellings ?? []).flatMap((spelling) => literalReadings(spelling, kind));
}
//@ chunk-fq0cr76a.js:759835-759911 esm-layout
function callerEntries(kind, spellings, literalPaths) {
  return [
    ...(spellings ?? []).map(toPathEntry),
    ...alsoReadAs(spellings, kind),
    ...(literalPaths ?? []).map(toLiteralPathEntry),
  ];
}
//@ chunk-fq0cr76a.js:759911-759949 esm-layout
function denyGlobCovers(denyRegex, entry) {
  return denyRegex.test(entrySamplePath(entry));
}
//@ chunk-fq0cr76a.js:759949-759986 esm-layout
function isStrictlyUnder(entry, dir) {
  return zot(entrySamplePath(entry), dir);
}
//@ chunk-fq0cr76a.js:759986-760195 esm-fingerprint
function inBothSpellings(kind, entry) {
  let resolved = (p) => Dqt(p)[1] ?? p;
  let base = entryBaseDir(entry);
  let canonical = kind === "deny" || entry.glob ? resolved(base) : nameLocation(base, resolved);
  if (canonical === base || canonical === "/" || isAtOrUnder(canonical, "/dev")) return [entry];
  return [
    entry,
    entry.glob
      ? {
          glob: true,
          path: canonical + entry.path.slice(base.length),
          anchor: canonical,
        }
      : {
          glob: false,
          path: canonical,
        },
  ];
}
//@ chunk-fq0cr76a.js:760195-760645 esm-fingerprint
function resolveReadConfig(config, writeRoots, libraryDenies) {
  let credentialDenies = [
    ...callerEntries("deny", config.credentialDenyOnly, undefined),
    ...libraryDenies,
  ].flatMap((entry) => inBothSpellings("deny", entry));
  return {
    denies: [
      ...callerEntries(
        "deny",
        config.denyOnly.filter((p) => !config.credentialDenyOnly?.includes(p)),
        config.literalDenyOnly,
      ).flatMap((entry) => inBothSpellings("deny", entry)),
      ...credentialDenies,
    ],
    credentialDenies: new Set(credentialDenies),
    ownAllows: (config.ownAllowWithinDeny ?? [])
      .map(toLiteralPathEntry)
      .flatMap((entry) => inBothSpellings("allow", entry)),
    allows: callerEntries("allow", config.allowWithinDeny, config.literalAllowWithinDeny).flatMap((entry) =>
      inBothSpellings("allow", entry),
    ),
    writeRoots: [...writeRoots],
  };
}
//@ chunk-fq0cr76a.js:760645-761096 esm-fingerprint
function lateReadDenyFilters(resolved) {
  let filters = [];
  let coversRoot = false;
  let literalAllowDirs = resolved.allows.filter((a) => !a.glob).map((a) => a.path);
  for (let deny of resolved.denies) {
    let isCredential = resolved.credentialDenies.has(deny);
    if (!deny.glob) {
      if (isCredential) {
        let carveOuts = resolved.ownAllows
          .filter((a) => isAtOrUnder(a.path, deny.path))
          .map((a) => pathFilter(a));
        filters.push(carveFilter(denyPathFilter(deny), carveOuts));
      } else if (literalAllowDirs.some((a) => isStrictlyUnder(deny, a))) filters.push(denyPathFilter(deny));
      continue;
    }
    let denyRegex = new RegExp(denyGlobEntryRegex(deny));
    if (denyRegex.test("/")) coversRoot = true;
    let carveOuts = (isCredential ? resolved.ownAllows : resolved.allows)
      .filter((a) => denyGlobCovers(denyRegex, a))
      .map((a) => pathFilter(a));
    filters.push(carveFilter(denyPathFilter(deny), carveOuts));
  }
  return {
    filters,
    coversRoot,
  };
}
//@ chunk-fq0cr76a.js:761096-761215 esm-fingerprint
function globBaseDir(normalizedGlob) {
  let staticPrefix = normalizedGlob.split(/[*?[\]]/)[0];
  if (!staticPrefix || staticPrefix === "/") return "/";
  return staticPrefix.endsWith("/") ? staticPrefix.slice(0, -1) : pathModule_2.dirname(staticPrefix);
}
//@ chunk-fq0cr76a.js:761215-761283 esm-fingerprint
function entryBaseDir(entry) {
  if (!entry.glob) return entry.path;
  return entry.anchor ?? globBaseDir(entry.path);
}
//@ chunk-fq0cr76a.js:761283-762077 esm-fingerprint
function generateReadDenyUnlinkRules(resolved, logTag) {
  let { denies, credentialDenies, writeRoots } = resolved;
  if (writeRoots.length === 0) return [];
  let writeRootRegexes = writeRoots.filter((w) => w.glob).map((w) => new RegExp(globRegex(w)));
  let literalWriteRoots = writeRoots.filter((w) => !w.glob).map((w) => w.path);
  let strictlyBelowWriteRoot = (p) =>
    literalWriteRoots.some((w) =>
      isStrictlyUnder(
        {
          path: p,
          glob: false,
        },
        w,
      ),
    ) || writeRootRegexes.some((re) => re.test(p));
  let filters = new Set();
  let protectDirs = (dirs, withWriteRoots) => {
    for (let dir of dirs)
      if (strictlyBelowWriteRoot(dir) || (withWriteRoots && literalWriteRoots.includes(dir)))
        filters.add(`(literal ${escapePath(dir)})`);
  };
  for (let deny of denies) {
    let isCredential = credentialDenies.has(deny);
    let exceptions = isCredential ? [] : [...resolved.allows, ...writeRoots];
    if (deny.glob) {
      let baseDir = entryBaseDir(deny);
      if (!(
        writeRootRegexes.length > 0 ||
        literalWriteRoots.some(
          (w) =>
            baseDir === w ||
            isStrictlyUnder(
              {
                path: baseDir,
                glob: false,
              },
              w,
            ) ||
            isStrictlyUnder(
              {
                path: w,
                glob: false,
              },
              baseDir,
            ),
        )
      ))
        continue;
      let denyRegex = new RegExp(denyGlobEntryRegex(deny));
      let carveOuts = exceptions.filter((e) => denyGlobCovers(denyRegex, e)).map((e) => pathFilter(e));
      filters.add(carveFilter(denyPathFilter(deny), carveOuts));
      if (baseDir !== "/") protectDirs([baseDir, ...getAncestorDirectories(baseDir)], isCredential);
    } else {
      if (!isCredential && !strictlyBelowWriteRoot(deny.path)) continue;
      let carveOuts = exceptions.filter((e) => isStrictlyUnder(e, deny.path)).map((e) => pathFilter(e));
      filters.add(carveFilter(denyPathFilter(deny), carveOuts));
      protectDirs(getAncestorDirectories(deny.path), isCredential);
    }
  }
  return renderRule("deny", ["file-write-unlink"], filters, logTag);
}
//@ chunk-fq0cr76a.js:762077-762208 esm-fingerprint
function renderRule(action, operations, filters, logTag) {
  if (filters.size === 0) return [];
  return [
    `(${action} ${operations.join(" ")}`,
    ...[...filters].map((f) => `  ${f}`),
    `  (with message "${logTag}"))`,
  ];
}
//@ chunk-fq0cr76a.js:762208-762330 esm-fingerprint
function getAncestorDirectories(pathStr) {
  let ancestors = [];
  let currentPath = pathModule_2.dirname(pathStr);
  while (currentPath !== "/" && currentPath !== ".") {
    ancestors.push(currentPath);
    let parentPath = pathModule_2.dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
  return ancestors;
}
//@ chunk-fq0cr76a.js:762330-762346 esm-layout
var SBPL_STRING_MAX_BYTES = 900;
var MIN_DENY_GROUP_SIZE = 4;
//@ chunk-fq0cr76a.js:762346-763045 esm-fingerprint
function groupLiteralDenyPaths(entries) {
  let byDir = new Map();
  for (let entry of entries) {
    if (entry.glob) continue;
    let entryPath = entry.path;
    let parent = pathModule_2.dirname(entryPath);
    let dir = pathModule_2.dirname(parent);
    if (dir === parent || parent === entryPath || dir === "/") continue;
    let names = byDir.get(dir);
    if (!names) {
      names = new Map();
      byDir.set(dir, names);
    }
    let name = pathModule_2.basename(parent);
    let leaves = names.get(name);
    if (!leaves) {
      leaves = new Set();
      names.set(name, leaves);
    }
    leaves.add(pathModule_2.basename(entryPath));
  }
  let grouped = new Set();
  let groups = [];
  for (let [dir, names] of byDir) {
    let bySignature = new Map();
    for (let [name, leafSet] of names) {
      let leaves = [...leafSet].sort();
      let signature = leaves.join("\x00");
      let group = bySignature.get(signature);
      if (!group) {
        group = {
          dir,
          names: [],
          leaves,
        };
        bySignature.set(signature, group);
      }
      group.names.push(name);
    }
    for (let group of bySignature.values()) {
      let fixedLength = regexLength(groupRegexPrefix(group)) + regexLength(groupDenyTail(group));
      group.names = group.names.filter(
        (name) => fixedLength + regexLength(escapeRegexLiteral(name)) <= SBPL_STRING_MAX_BYTES,
      );
      if (group.names.length < MIN_DENY_GROUP_SIZE) continue;
      groups.push(group);
      for (let name of group.names)
        for (let leaf of group.leaves) grouped.add(pathModule_2.join(dir, name, leaf));
    }
  }
  return {
    groups,
    rest: entries.filter((e) => !grouped.has(e.path)),
  };
}
//@ chunk-fq0cr76a.js:763045-763094 esm-layout
function regexLength(fragment) {
  return Buffer.byteLength(escapePath(fragment)) - 2;
}
//@ chunk-fq0cr76a.js:763094-763134 esm-fingerprint
function groupRegexPrefix(group) {
  return `^${escapeRegexLiteral(group.dir)}/(`;
}
//@ chunk-fq0cr76a.js:763134-763199 esm-fingerprint
function groupDenyTail(group) {
  return `)/(${group.leaves.map(escapeRegexLiteral).join("|")})(/.*)?$`;
}
//@ chunk-fq0cr76a.js:763199-763539 esm-fingerprint
function literalDenyGroupFilters(group) {
  let prefix = groupRegexPrefix(group);
  let denyTail = groupDenyTail(group);
  let pinTail = ")$";
  let fixedLength = regexLength(prefix) + regexLength(denyTail);
  let chunks = [];
  let chunk = [];
  let chunkLength = 0;
  for (let name of group.names.map(escapeRegexLiteral)) {
    let nameLength = regexLength(name) + (chunk.length === 0 ? 0 : 1);
    if (chunk.length > 0 && fixedLength + chunkLength + nameLength > SBPL_STRING_MAX_BYTES) {
      chunks.push(chunk);
      chunk = [];
      chunkLength = 0;
    }
    chunk.push(name);
    chunkLength += chunk.length === 1 ? regexLength(name) : nameLength;
  }
  chunks.push(chunk);
  let alternations = chunks.map((names) => names.join("|"));
  return {
    deny: alternations.map((names) => `(regex ${escapePath(prefix + names + denyTail)})`),
    pins: alternations.map((names) => `(regex ${escapePath(prefix + names + ")$")})`),
  };
}
//@ chunk-fq0cr76a.js:763539-763624 esm-fingerprint
function generateMoveBlockingRules(entries, logTag) {
  return renderRule("deny", ["file-write-unlink", "file-write-create"], moveBlockingFilters(entries), logTag);
}
//@ chunk-fq0cr76a.js:763624-763809 esm-fingerprint
function moveBlockingFilters(entries) {
  let filters = new Set();
  for (let entry of entries) {
    filters.add(denyPathFilter(entry));
    let baseDir = entryBaseDir(entry);
    if (entry.glob) {
      if (baseDir === "/") continue;
      filters.add(`(literal ${escapePath(baseDir)})`);
    }
    for (let ancestorDir of getAncestorDirectories(baseDir))
      filters.add(`(literal ${escapePath(ancestorDir)})`);
  }
  return filters;
}
//@ chunk-fq0cr76a.js:763809-764446 esm-fingerprint
function generateReadRules(resolved, logTag) {
  if (!resolved) return ["(allow file-read*)"];
  let rules = [];
  rules.push("(allow file-read*)");
  let deniesRoot = resolved.denies.some((d) => d.path === "/");
  let denyFilters = new Set(resolved.denies.map(denyPathFilter));
  rules.push(...renderRule("deny", ["file-read*"], denyFilters, logTag));
  let allowFilters = new Set(resolved.allows.map((a) => pathFilter(a)));
  rules.push(...renderRule("allow", ["file-read*"], allowFilters, logTag));
  let late = lateReadDenyFilters(resolved);
  rules.push(...renderRule("deny", ["file-read*"], new Set(late.filters), logTag));
  if (deniesRoot || late.coversRoot) rules.push('(allow file-read* (literal "/"))');
  if (resolved.denies.length > 0) rules.push("(allow file-read-metadata", "  (vnode-type DIRECTORY))");
  rules.push(...generateMoveBlockingRules(resolved.denies, logTag));
  let writeAllowFilters = new Set(resolved.writeRoots.map(pathFilter));
  rules.push(...renderRule("allow", ["file-write-unlink", "file-write-create"], writeAllowFilters, logTag));
  return rules;
}
//@ chunk-fq0cr76a.js:764446-764513 esm-fingerprint
function writeRootEntries(config) {
  return callerEntries("allow", config?.allowOnly, config?.literalAllowOnly);
}
//@ chunk-fq0cr76a.js:764513-765190 esm-fingerprint
function generateWriteRules(config, logTag, allowGitConfig, writeRoots) {
  if (!config) return ["(allow file-write*)"];
  let rules = [];
  let allowFilters = new Set();
  for (let entry of writeRoots) allowFilters.add(pathFilter(entry));
  rules.push(...renderRule("allow", ["file-write*"], allowFilters, logTag));
  let denyEntries = [
    ...(config.denyWithinAllow || []).map(toPathEntry),
    ...(config.literalDenyWithinAllow ?? []).map(toLiteralPathEntry),
    ...macGetMandatoryDenyEntries(allowGitConfig),
  ];
  denyEntries.push(...alsoReadAs(config.denyWithinAllow, "deny"));
  let { groups, rest: ungrouped } = groupLiteralDenyPaths(denyEntries);
  let groupFilters = groups.map(literalDenyGroupFilters);
  let denyFilters = new Set();
  for (let { deny } of groupFilters) for (let filter of deny) denyFilters.add(filter);
  for (let entry of ungrouped) denyFilters.add(denyPathFilter(entry));
  rules.push(...renderRule("deny", ["file-write*"], denyFilters, logTag));
  let moveFilters = moveBlockingFilters(ungrouped);
  for (let [index, { deny, pins }] of groupFilters.entries()) {
    for (let filter of [...deny, ...pins]) moveFilters.add(filter);
    let { dir } = groups[index];
    for (let ancestorDir of [dir, ...getAncestorDirectories(dir)])
      moveFilters.add(`(literal ${escapePath(ancestorDir)})`);
  }
  rules.push(...renderRule("deny", ["file-write-unlink", "file-write-create"], moveFilters, logTag));
  return rules;
}
//@ chunk-fq0cr76a.js:765190-772859 esm-fingerprint
function generateSandboxProfile({
  readConfig,
  libraryDenyEntries,
  writeConfig,
  httpProxyPort,
  socksProxyPort,
  needsNetworkRestriction,
  allowUnixSockets,
  allowAllUnixSockets,
  allowLocalBinding,
  allowMachLookup,
  allowPty,
  allowGitConfig = false,
  enableWeakerNetworkIsolation = false,
  allowAppleEvents = false,
  logTag,
}) {
  let profile = [
    "(version 1)",
    `(deny default (with message "${logTag}"))`,
    "",
    `; LogTag: ${logTag}`,
    "",
    "; Essential permissions - based on Chrome sandbox policy",
    "; Process permissions",
    "(allow process-exec)",
    "(allow process-fork)",
    "(allow process-info* (target same-sandbox))",
    "(allow signal (target same-sandbox))",
    "(allow mach-priv-task-port (target same-sandbox))",
    "",
    "; User preferences",
    "(allow user-preference-read)",
    "",
    "; Mach IPC - specific services only (no wildcard)",
    "(allow mach-lookup",
    '  (global-name "com.apple.audio.systemsoundserver")',
    '  (global-name "com.apple.distributed_notifications@Uv3")',
    '  (global-name "com.apple.FontObjectsServer")',
    '  (global-name "com.apple.fonts")',
    '  (global-name "com.apple.logd")',
    '  (global-name "com.apple.lsd.mapdb")',
    '  (global-name "com.apple.PowerManagement.control")',
    '  (global-name "com.apple.system.logger")',
    '  (global-name "com.apple.system.notification_center")',
    '  (global-name "com.apple.system.opendirectoryd.libinfo")',
    '  (global-name "com.apple.system.opendirectoryd.membership")',
    '  (global-name "com.apple.bsd.dirhelper")',
    '  (global-name "com.apple.securityd.xpc")',
    '  (global-name "com.apple.coreservices.launchservicesd")',
    ")",
    "",
    ...(enableWeakerNetworkIsolation
      ? [
          "; trustd.agent - needed for Go TLS certificate verification (weaker network isolation)",
          '(allow mach-lookup (global-name "com.apple.trustd.agent"))',
        ]
      : []),
    ...(allowAppleEvents
      ? [
          "; Apple Events - opt-in; needed for open/osascript to talk to other apps (appleeventsd)",
          "(allow appleevent-send)",
          '(allow mach-lookup (global-name "com.apple.coreservices.appleevents"))',
          "; Launch Services open requests need the lsopen operation plus, on",
          "; macOS 14/15, coreservicesd and the quarantine resolver - without",
          "; these open fails with -10822 kLSServerCommunicationErr or -54",
          "(allow lsopen)",
          '(allow mach-lookup (global-name "com.apple.CoreServices.coreservicesd"))',
          '(allow mach-lookup (global-name "com.apple.coreservices.quarantine-resolver"))',
        ]
      : []),
    ...(allowMachLookup && allowMachLookup.length > 0
      ? [
          "; User-specified XPC/Mach services",
          ...allowMachLookup.map((name) =>
            name.endsWith("*")
              ? `(allow mach-lookup (global-name-prefix ${escapePath(name.slice(0, -1))}))`
              : `(allow mach-lookup (global-name ${escapePath(name)}))`,
          ),
        ]
      : []),
    "",
    "; POSIX IPC - shared memory",
    "(allow ipc-posix-shm)",
    "",
    "; POSIX IPC - semaphores for Python multiprocessing",
    "(allow ipc-posix-sem)",
    "",
    "; IOKit - specific operations only",
    "(allow iokit-open",
    '  (iokit-registry-entry-class "IOSurfaceRootUserClient")',
    '  (iokit-registry-entry-class "RootDomainUserClient")',
    '  (iokit-user-client-class "IOSurfaceSendRight")',
    ")",
    "",
    "; IOKit properties",
    "(allow iokit-get-properties)",
    "",
    "; Specific safe system-sockets, doesn't allow network access",
    "(allow system-socket (require-all (socket-domain AF_SYSTEM) (socket-protocol 2)))",
    "",
    "; sysctl - specific sysctls only",
    "(allow sysctl-read",
    '  (sysctl-name "hw.activecpu")',
    '  (sysctl-name "hw.busfrequency_compat")',
    '  (sysctl-name "hw.byteorder")',
    '  (sysctl-name "hw.cacheconfig")',
    '  (sysctl-name "hw.cachelinesize_compat")',
    '  (sysctl-name "hw.cpufamily")',
    '  (sysctl-name "hw.cpufrequency")',
    '  (sysctl-name "hw.cpufrequency_compat")',
    '  (sysctl-name "hw.cputype")',
    '  (sysctl-name "hw.l1dcachesize_compat")',
    '  (sysctl-name "hw.l1icachesize_compat")',
    '  (sysctl-name "hw.l2cachesize_compat")',
    '  (sysctl-name "hw.l3cachesize_compat")',
    '  (sysctl-name "hw.logicalcpu")',
    '  (sysctl-name "hw.logicalcpu_max")',
    '  (sysctl-name "hw.machine")',
    '  (sysctl-name "hw.memsize")',
    '  (sysctl-name "hw.ncpu")',
    '  (sysctl-name "hw.nperflevels")',
    '  (sysctl-name "hw.packages")',
    '  (sysctl-name "hw.pagesize_compat")',
    '  (sysctl-name "hw.pagesize")',
    '  (sysctl-name "hw.physicalcpu")',
    '  (sysctl-name "hw.physicalcpu_max")',
    '  (sysctl-name "hw.tbfrequency_compat")',
    '  (sysctl-name "hw.vectorunit")',
    '  (sysctl-name "kern.argmax")',
    '  (sysctl-name "kern.bootargs")',
    '  (sysctl-name "kern.hostname")',
    '  (sysctl-name "kern.maxfiles")',
    '  (sysctl-name "kern.maxfilesperproc")',
    '  (sysctl-name "kern.maxproc")',
    '  (sysctl-name "kern.ngroups")',
    '  (sysctl-name "kern.osproductversion")',
    '  (sysctl-name "kern.osrelease")',
    '  (sysctl-name "kern.ostype")',
    '  (sysctl-name "kern.osvariant_status")',
    '  (sysctl-name "kern.osversion")',
    '  (sysctl-name "kern.secure_kernel")',
    '  (sysctl-name "kern.tcsm_available")',
    '  (sysctl-name "kern.tcsm_enable")',
    '  (sysctl-name "kern.usrstack64")',
    '  (sysctl-name "kern.version")',
    '  (sysctl-name "kern.willshutdown")',
    '  (sysctl-name "machdep.cpu.brand_string")',
    '  (sysctl-name "machdep.ptrauth_enabled")',
    '  (sysctl-name "security.mac.lockdown_mode_state")',
    '  (sysctl-name "sysctl.proc_cputype")',
    '  (sysctl-name "vm.loadavg")',
    '  (sysctl-name-prefix "hw.optional.arm")',
    '  (sysctl-name-prefix "hw.optional.arm.")',
    '  (sysctl-name-prefix "hw.optional.armv8_")',
    '  (sysctl-name-prefix "hw.perflevel")',
    '  (sysctl-name-prefix "kern.proc.all")',
    '  (sysctl-name-prefix "kern.proc.pgrp.")',
    '  (sysctl-name-prefix "kern.proc.pid.")',
    '  (sysctl-name-prefix "machdep.cpu.")',
    '  (sysctl-name-prefix "net.routetable.")',
    ")",
    "",
    "; V8 thread calculations",
    "(allow sysctl-write",
    '  (sysctl-name "kern.tcsm_enable")',
    ")",
    "",
    "; Distributed notifications",
    "(allow distributed-notification-post)",
    "",
    "; Specific mach-lookup permissions for security operations",
    '(allow mach-lookup (global-name "com.apple.SecurityServer"))',
    "",
    "; File I/O on device files",
    '(allow file-ioctl (literal "/dev/null"))',
    '(allow file-ioctl (literal "/dev/zero"))',
    '(allow file-ioctl (literal "/dev/random"))',
    '(allow file-ioctl (literal "/dev/urandom"))',
    '(allow file-ioctl (literal "/dev/dtracehelper"))',
    '(allow file-ioctl (literal "/dev/tty"))',
    "",
    "(allow file-ioctl file-read-data file-write-data",
    "  (require-all",
    '    (literal "/dev/null")',
    "    (vnode-type CHARACTER-DEVICE)",
    "  )",
    ")",
    "",
  ];
  profile.push("; Network");
  if (!needsNetworkRestriction) profile.push("(allow network*)");
  else {
    if (allowLocalBinding) {
      profile.push('(allow network-bind (local ip "*:*"))');
      profile.push('(allow network-inbound (local ip "*:*"))');
      profile.push('(allow network-outbound (remote ip "localhost:*"))');
    }
    if (allowAllUnixSockets) {
      profile.push("(allow system-socket (socket-domain AF_UNIX))");
      profile.push('(allow network-bind (local unix-socket (path-regex #"^/")))');
      profile.push('(allow network-outbound (remote unix-socket (path-regex #"^/")))');
    } else if (allowUnixSockets && allowUnixSockets.length > 0) {
      profile.push("(allow system-socket (socket-domain AF_UNIX))");
      for (let socketPath of allowUnixSockets) {
        let normalizedPath = normalizePathForSandbox(socketPath);
        profile.push(`(allow network-bind (local unix-socket (subpath ${escapePath(normalizedPath)})))`);
        profile.push(`(allow network-outbound (remote unix-socket (subpath ${escapePath(normalizedPath)})))`);
      }
    }
    if (httpProxyPort !== undefined) {
      profile.push(
        ...renderRule(
          "deny",
          ["network-bind", "network-inbound"],
          new Set([`(local ip "*:${httpProxyPort}")`]),
          logTag,
        ),
      );
      profile.push(`(allow network-outbound (remote ip "localhost:${httpProxyPort}"))`);
    }
    if (socksProxyPort !== undefined && socksProxyPort !== httpProxyPort) {
      profile.push(
        ...renderRule(
          "deny",
          ["network-bind", "network-inbound"],
          new Set([`(local ip "*:${socksProxyPort}")`]),
          logTag,
        ),
      );
      profile.push(`(allow network-outbound (remote ip "localhost:${socksProxyPort}"))`);
    }
  }
  profile.push("");
  let writeRoots = writeRootEntries(writeConfig);
  let resolvedRead =
    readConfig || libraryDenyEntries.length > 0
      ? resolveReadConfig(
          readConfig ?? {
            denyOnly: [],
          },
          writeRoots,
          libraryDenyEntries,
        )
      : undefined;
  profile.push("; File read");
  profile.push(...generateReadRules(resolvedRead, logTag));
  profile.push("");
  profile.push("; File write");
  profile.push(...generateWriteRules(writeConfig, logTag, allowGitConfig, writeRoots));
  if (resolvedRead) {
    let unlinkRules = generateReadDenyUnlinkRules(resolvedRead, logTag);
    if (unlinkRules.length > 0) {
      profile.push("");
      profile.push("; File read: keep read-denied paths inside write roots in place");
      profile.push(...unlinkRules);
    }
  }
  if (allowPty) {
    profile.push("");
    profile.push("; Pseudo-terminal (pty) support");
    profile.push("(allow pseudo-tty)");
    profile.push("(allow file-ioctl");
    profile.push('  (literal "/dev/ptmx")');
    profile.push('  (regex #"^/dev/ttys")');
    profile.push(")");
    profile.push("(allow file-read* file-write*");
    profile.push('  (literal "/dev/ptmx")');
    profile.push('  (regex #"^/dev/ttys")');
    profile.push(")");
  }
  return profile.join(`
`);
}
//@ chunk-fq0cr76a.js:772859-772899 esm-layout
function escapePath(pathStr) {
  return JSON.stringify(pathStr);
}
//@ chunk-fq0cr76a.js:772899-774892 esm-fingerprint
function wrapCommandWithSandboxMacOS(params) {
  let {
    command,
    commandId,
    needsNetworkRestriction,
    httpProxyPort,
    socksProxyPort,
    proxyAuthToken,
    caCertPath,
    javaAgentJarPath,
    allowUnixSockets,
    allowAllUnixSockets,
    allowLocalBinding,
    allowMachLookup,
    readConfig,
    writeConfig,
    unsetEnvVars,
    setEnvVars,
    maskedFileBinds,
    degradeToDenyPaths,
    allowPty,
    allowGitConfig = false,
    gitSafeDirectories,
    enableWeakerNetworkIsolation = false,
    allowAppleEvents = false,
    binShell,
  } = params;
  let maskedDenyPaths = maskedFileBinds?.map((b) => b.realPath) ?? [];
  if (maskedDenyPaths.length > 0)
    logForDebugging_2("[Sandbox macOS] file mask degrades to deny on macOS until the interposer lands");
  let libraryDenyEntries = [...maskedDenyPaths, ...(degradeToDenyPaths ?? [])].map(toLiteralPathEntry);
  let hasReadRestrictions =
    (readConfig && (readConfig.denyOnly.length > 0 || (readConfig.literalDenyOnly?.length ?? 0) > 0)) ||
    libraryDenyEntries.length > 0;
  let hasWriteRestrictions = writeConfig !== undefined;
  let hasEnvRestrictions =
    (unsetEnvVars !== undefined && unsetEnvVars.length > 0) ||
    (setEnvVars !== undefined && Object.keys(setEnvVars).length > 0);
  let hasGitConfig = (gitSafeDirectories?.length ?? 0) > 0;
  if (
    !needsNetworkRestriction &&
    !hasReadRestrictions &&
    !hasWriteRestrictions &&
    !hasEnvRestrictions &&
    !hasGitConfig
  )
    return command;
  let attributionCommand = ITt(command, commandId);
  let logTag = generateLogTag(attributionCommand);
  let profile = generateSandboxProfile({
    readConfig,
    libraryDenyEntries,
    writeConfig,
    httpProxyPort,
    socksProxyPort,
    needsNetworkRestriction,
    allowUnixSockets,
    allowAllUnixSockets,
    allowLocalBinding,
    allowMachLookup,
    allowPty,
    allowGitConfig,
    enableWeakerNetworkIsolation,
    allowAppleEvents,
    logTag,
  });
  let proxyEnvArgs = generateProxyEnvVars(
    httpProxyPort,
    socksProxyPort,
    caCertPath,
    proxyAuthToken,
    writeConfig === undefined,
    encodeSandboxedCommand(attributionCommand),
  );
  let javaToolOptions = buildJavaToolOptions({
    agentJarPath: javaAgentJarPath,
    flags:
      needsNetworkRestriction &&
      (allowLocalBinding || httpProxyPort !== undefined || socksProxyPort !== undefined)
        ? ["-Djava.net.preferIPv4Stack=true"]
        : [],
    unsetEnvVars,
    inherited: process.env.JAVA_TOOL_OPTIONS,
  });
  if (javaToolOptions !== undefined) proxyEnvArgs.push(`JAVA_TOOL_OPTIONS=${javaToolOptions}`);
  if (gitSafeDirectories && gitSafeDirectories.length > 0) {
    let gitCfg = buildPosixGitSafeDirEnv({
      safeDirs: gitSafeDirectories,
      unsetEnvVars,
      setEnvVars,
    });
    for (let [name, value] of Object.entries(gitCfg)) proxyEnvArgs.push(`${name}=${value}`);
  }
  let shellName = binShell || "bash";
  let shell = whichSync(shellName);
  if (!shell) throw Error(`Shell '${shellName}' not found in PATH`);
  let unsetEnvArgs = (unsetEnvVars ?? []).flatMap((name) => ["-u", name]);
  let setEnvArgs = Object.entries(setEnvVars ?? {}).map(([name, value]) => `${name}=${value}`);
  let wrappedCommand = quote([
    "env",
    ...unsetEnvArgs,
    ...setEnvArgs,
    ...proxyEnvArgs,
    "/usr/bin/sandbox-exec",
    "-p",
    profile,
    shell,
    "-c",
    command,
  ]);
  logForDebugging_2(
    `[Sandbox macOS] Applied restrictions - network: ${!!(httpProxyPort || socksProxyPort)}, read: ${hasReadRestrictions ? (readConfig && "allowAllExcept" in readConfig ? "allowAllExcept" : "denyAllExcept") : "none"}, write: ${writeConfig ? ("allowAllExcept" in writeConfig ? "allowAllExcept" : "denyAllExcept") : "none"}`,
  );
  return wrappedCommand;
}
//@ chunk-fq0cr76a.js:774892-775857 esm-fingerprint
function startMacOSSandboxLogMonitor(callback, ignoreViolations, resolveCommandText) {
  let s = /CMD64_(.+?)_END/;
  let sandboxExtractRegex = /Sandbox:\s+(.+)$/;
  let logProcess = spawn("log", [
    "stream",
    "--predicate",
    `(eventMessage ENDSWITH "${sessionSuffix}")`,
    "--style",
    "compact",
  ]);
  logProcess.stdout?.on("data", (data) => {
    let lines = data.toString().split(`
`);
    let violationLine = lines.find((line) => line.includes("Sandbox:") && line.includes("deny"));
    let commandLine = lines.find((line) => line.startsWith("CMD64_"));
    if (!violationLine) return;
    let sandboxMatch = violationLine.match(sandboxExtractRegex);
    if (!sandboxMatch?.[1]) return;
    let violationDetails = sandboxMatch[1];
    let command;
    let encodedCommand;
    if (commandLine) {
      encodedCommand = commandLine.match(s)?.[1];
      if (encodedCommand)
        try {
          command = resolveCommandText(decodeSandboxedCommand(encodedCommand));
        } catch {}
    }
    if (
      violationDetails.includes("mDNSResponder") ||
      violationDetails.includes("mach-lookup com.apple.diagnosticd") ||
      violationDetails.includes("mach-lookup com.apple.analyticsd")
    )
      return;
    if (shouldIgnoreViolation(violationDetails, command, ignoreViolations)) return;
    callback({
      line: violationDetails,
      command,
      encodedCommand,
      timestamp: new Date(),
    });
  });
  logProcess.stderr?.on("data", (data) => {
    logForDebugging_2(`[Sandbox Monitor] Log stream stderr: ${data.toString()}`);
  });
  logProcess.on("error", (error) => {
    logForDebugging_2(`[Sandbox Monitor] Failed to start log stream: ${error.message}`);
  });
  logProcess.on("exit", (code) => {
    logForDebugging_2(`[Sandbox Monitor] Log stream exited with code: ${code}`);
  });
  return () => {
    logForDebugging_2("[Sandbox Monitor] Stopping log monitor");
    logProcess.kill("SIGTERM");
  };
}
export { wrapCommandWithSandboxMacOS, startMacOSSandboxLogMonitor };
