/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (92)
 * attribution: esm-fingerprint 73, esm-layout 19
 */
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { dirname } from "path";
import { randomBytes } from "crypto";
import { EOL } from "os";
import { createResolvedAddressGuard, isResolvedAddressDeniedError } from "./resolved-address-guard.js";
import {
  missingWindowsSrtWinCapability,
  getWindowsProfileReadStatus,
  windowsSrtWinOutdatedError,
  revokeWindowsAclChecked,
  restoreWindowsAcl,
  WindowsSandboxError,
  resolveSrtWin,
  getWindowsSandboxUserStatusAsync,
  windowsSetupVersionMismatch,
  getWindowsProfileReadStatusAsync,
  ensurePersistentWindowsCa,
  windowsProfileExclusionConflicts,
  grantWindowsAclPersistent,
  verifyWindowsWfpEgress,
  DEFAULT_WINDOWS_PROXY_PORT_RANGE,
  checkWindowsDependencies,
  checkWindowsDependenciesAsync,
  expandWindowsFsPaths,
  rankWindowsFsAccess,
  wrapCommandWithSandboxWindows,
  windowsGrantsBeneathDenies,
  parseWindowsBinShell,
} from "./windows-sandbox-utils.js";
import {
  SandboxViolationStore,
  dedupeFingerprint,
  shouldIgnoreViolation,
  sanitizeDenialReason,
} from "./sandbox-violation-store.js";
import { SentinelRegistry } from "./credential-sentinel.js";
import { AwsPairRegistry, createSigv4Planner, registerAwsPairs } from "./credential-aws-pairs.js";
import { MaskedFileStore, buildMaskedFileBinds } from "./credential-mask-files.js";
import {
  markExitCleanupNeeded,
  linuxGetCwdMandatoryDenyPaths,
  initializeLinuxNetworkBridge,
  checkLinuxDependencies,
  wrapCommandWithSandboxLinux,
  WorkingDirectoryChanged,
  cleanupBwrapMountPoints,
} from "./linux-sandbox-utils.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { disposeMitmCASync, createMitmCA, CRL_PATH, disposeMitmCA } from "./mitm-ca.js";
import {
  decodeSandboxedCommand,
  encodeSandboxedCommand,
  orDefault,
  getDefaultWritePaths,
  normalizePathForSandbox,
  removeTrailingGlobSuffix,
  containsGlobChars,
  walkGlobPatternSteps,
  finish,
  workingDirectory,
  finishInTurns,
  globPatternBaseDir,
  globBaseDirIsRoot,
} from "./sandbox-utils.js";
import {
  isValidAllowedDomainEntry,
  ALLOWED_DOMAIN_ENTRY_MESSAGE,
  matchesDomainPatternWithPort,
  matchesDomainPattern,
  stripDomainPatternPort,
} from "./domain-pattern.js";
import { isValidHost, canonicalizeHost, resolveParentProxy, redactUrl } from "./parent-proxy.js";
import { createHttpProxyServer } from "./http-proxy.js";
import { createSocksProxyServer } from "./socks-proxy.js";
import { createMuxProxyServer } from "./mux-proxy.js";
import { assertTlsTerminationSupported } from "./emitted-connection.js";
import { getPlatform as getPlatform_2, getWslVersion } from "../utils/platform.js";
import { startMacOSSandboxLogMonitor, wrapCommandWithSandboxMacOS } from "./macos-sandbox-utils.js";
import { startLinuxSandboxViolationMonitor } from "./linux-violation-monitor.js";
import {
  writeRootsOf,
  readRulesOf,
  spelledOf,
  withOtherReadings,
  hasNameReading,
  reExposedBy,
  literalReadLists,
  literalWriteLists,
  samePathEntries,
} from "./path-entries.js";
import { getJavaProxyAgentJarPathAsync } from "./java-proxy-agent.js";
import { whichSync } from "../utils/which.js";
import { ownInstallWarning } from "./own-files.js";
import { getApplySeccompBinaryPath_2 } from "./generate-seccomp-filter.js";
import { buildMaskedEnvVars } from "./credential-mask-env.js";
import { expandReadDenyGlobLinuxSteps } from "./read-deny-glob.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:703683-704095 esm-fingerprint
function listenInRange(server, doListen, range, exclude) {
  return new Promise((resolve, reject) => {
    let [lo, hi] = range ?? [0, 0];
    let port = lo;
    let tryNext = () => {
      while (exclude.has(port) && port <= hi) port++;
      if (port > hi) {
        reject(Error(`No free port in range ${lo}-${hi} (excluding ${[...exclude].join(",")})`));
        return;
      }
      let onListening = () => {
        server.removeListener("error", onError);
        resolve();
      };
      let onError = (err) => {
        server.removeListener("listening", onListening);
        if (range && err?.code === "EADDRINUSE" && port < hi) {
          port++;
          tryNext();
          return;
        }
        reject(err ?? Error("listen error"));
      };
      server.once("error", onError);
      server.once("listening", onListening);
      doListen(range ? port : 0);
    };
    tryNext();
  });
}
//@ chunk-qg41pqt6.js:819796-819887 esm-layout
var config; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var configInstalls;
var httpProxyServer;
var socksProxyServer;
var muxProxyServer;
var managerContext;
var initializationPromise;
var cleanupRegistered;
var ownInstallLogged;
var logMonitorShutdown;
var linuxMonitor;
var parentProxy;
var resolvedAddressGuard;
var mitmCA;
var javaAgentJarPath;
var proxyAuthToken;
var windowsFsStampedSet;
var windowsFsSbUserSid;
var windowsFsRawInputs;
var windowsWfpVerifiedFor;
var windowsWfpVerifiedLoopback;
var windowsCapableSrtWin;
deferInit("chunk-qg41pqt6.js:819796", () => {
  configInstalls = 0;
  cleanupRegistered = false;
  ownInstallLogged = false;
  resolvedAddressGuard = createResolvedAddressGuard();
  windowsCapableSrtWin = new Set();
});
//@ chunk-qg41pqt6.js:819887-820021 esm-fingerprint
function windowsSrtWinIdentity(srtWin) {
  let stat = "";
  try {
    let st = fsModule_2.statSync(srtWin.exe);
    stat = `${st.size}:${st.mtimeMs}`;
  } catch {}
  return JSON.stringify([srtWin.exe, srtWin.prependArgs, stat]);
}
//@ chunk-qg41pqt6.js:820021-820173 esm-layout
var WINDOWS_CAPABILITIES_WHY =
  "a session depends on (its read denies are written on the profile read grant's paths by srt-win, and kept grants are checked and removed there)";
//@ chunk-qg41pqt6.js:820173-820297 esm-fingerprint
function assertWindowsSrtWinCapable(srtWin) {
  let id = windowsSrtWinIdentity(srtWin);
  if (windowsCapableSrtWin.has(id)) return;
  let missing = missingWindowsSrtWinCapability(
    getWindowsProfileReadStatus({
      srtWin,
    }).capabilities,
  );
  if (missing !== undefined) throw windowsSrtWinOutdatedError(missing, WINDOWS_CAPABILITIES_WHY);
  windowsCapableSrtWin.add(id);
}
//@ chunk-qg41pqt6.js:820297-820310 esm-layout
var windowsProfileRead;
var windowsProfileReadWarnings = [];
//@ chunk-qg41pqt6.js:820310-822918 esm-layout
function windowsProfileReadWarningsOf(grant) {
  let list = (items) => items.map((i) => i.path).join(", ");
  let out = [];
  let byOurs = grant.unprotected.filter((i) => i.entry !== undefined);
  let byList = grant.unprotected.filter((i) => i.entry === undefined);
  let callerReads = grant.unverifiable.filter((i) => i.callerReads === true);
  let rest = grant.unverifiable.filter((i) => i.callerReads !== true);
  if (byOurs.length + byList.length + callerReads.length > 0) {
    let parts = [];
    if (byOurs.length > 0)
      parts.push(
        `${byOurs.length} READABLE THROUGH AN ENTRY THIS PRODUCT WROTE and ` +
          "could not remove \u2014 each path's reason gives the icacls command " +
          `that removes it, to be run as the object's owner or from an elevated prompt, followed by the grant again (${list(byOurs)})`,
      );
    if (byList.length > 0)
      parts.push(`${byList.length} by their own access lists, which you may not change (${list(byList)})`);
    if (callerReads.length > 0)
      parts.push(
        `${callerReads.length} whose access lists could not be read but which you can read all the same, so sandboxed commands may too (${list(callerReads)})`,
      );
    out.push({
      code: "profile_exclusion_unprotected",
      message:
        "Paths on the exclusion list of the profile read grant could not be denied and are, or may be, readable to sandboxed commands: " +
        parts.join("; ") +
        ". Only their owner or an administrator can close them.",
      paths: [...byOurs, ...byList, ...callerReads],
    });
  }
  if (rest.length > 0) {
    let unreadable = rest.filter((i) => i.callerReads === false);
    let noAccount = rest.filter((i) => i.cause === "account_unknown");
    let other = rest.filter((i) => i.callerReads !== false && i.cause !== "account_unknown");
    let parts = [];
    if (unreadable.length > 0)
      parts.push(
        `${unreadable.length} whose access lists could not be read; you cannot read their content either (${list(unreadable)})`,
      );
    if (noAccount.length > 0)
      parts.push(
        `${noAccount.length} that could not be examined because the sandbox account is not known (${list(noAccount)})`,
      );
    if (other.length > 0) parts.push(`${other.length} that were not examined (${list(other)})`);
    out.push({
      code: "profile_exclusion_unverifiable",
      message:
        "Paths on the exclusion list of the profile read grant could not be denied, and whether sandboxed commands can read them was not established: " +
        parts.join("; ") +
        ".",
      paths: rest,
    });
  }
  if (grant.staleAllow.length > 0)
    out.push({
      code: "profile_stale_allow",
      message: `${grant.staleAllow.length} path(s) that have left the profile read grant still carry an entry of it that could not be removed, and are readable to sandboxed commands through it: ${list(grant.staleAllow)}. None is on the exclusion list. Each path's reason gives the icacls command that removes the entry.`,
      paths: grant.staleAllow,
    });
  let replaced = grant.replacedFiles ?? [];
  if (replaced.length > 0)
    out.push({
      code: "profile_file_replaced",
      message: `${replaced.length} configuration file(s) were replaced since the profile read grant was made and are not readable to sandboxed commands; the variables that point at them are not returned: ${replaced.join(", ")}. Run grantWindowsProfileRead() (\`srt-win profile grant\`) again.`,
      paths: replaced.map((path) => ({
        path,
        reason: "replaced since the grant was made",
      })),
    });
  return out;
}
//@ chunk-qg41pqt6.js:822918-822965 esm-layout
var srtWinSpawn; // deferred: uses SandboxViolationStore (./sandbox-violation-store.js) of its import cycle while loading; runs once the cycle is complete
var sandboxViolationStore;
var sentinelRegistry;
var awsPairRegistry;
var maskedFileStore;
deferInit("chunk-qg41pqt6.js:822918", () => {
  sandboxViolationStore = new SandboxViolationStore();
  sentinelRegistry = new SentinelRegistry();
  awsPairRegistry = new AwsPairRegistry();
  maskedFileStore = new MaskedFileStore();
});
//@ chunk-qg41pqt6.js:822965-823347 esm-fingerprint
function registerCleanup() {
  if (cleanupRegistered) return;
  let cleanupHandler = () => {
    markExitCleanupNeeded();
    return reset().catch((e) => {
      logForDebugging_2(`Cleanup failed in registerCleanup ${e}`, {
        level: "error",
      });
    });
  };
  process.once("exit", () => {
    cleanupHandler();
    if (mitmCA) disposeMitmCASync(mitmCA);
    muxProxyServer?.removeBackendSocketSync();
    maskedFileStore.dispose();
    let bridge = managerContext?.linuxBridge;
    for (let path of [bridge?.httpSocketPath, bridge?.socksSocketPath])
      try {
        if (path)
          fsModule_2.rmSync(path, {
            force: true,
          });
      } catch {}
  });
  process.once("SIGINT", cleanupHandler);
  process.once("SIGTERM", cleanupHandler);
  cleanupRegistered = true;
}
//@ chunk-qg41pqt6.js:823347-823416 esm-fingerprint
var WINDOWS_ACL_RELEASE_OK; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:823347", () => {
  WINDOWS_ACL_RELEASE_OK = new Set(["revoked", "stillHeld", "restored", "alreadyOriginal"]);
});
//@ chunk-qg41pqt6.js:823416-823625 esm-fingerprint
function logWindowsAclOutcomes(kind, outcomes) {
  for (let e of outcomes ?? [])
    if (!WINDOWS_ACL_RELEASE_OK.has(e.status))
      logForDebugging_2(
        `[Sandbox Windows] ${kind}: '${e.path}' ${e.status} \u2014 ` +
          "ACE may be left in place; resolve and run `srt-win acl recover` to clear",
        {
          level: "warn",
        },
      );
}
//@ chunk-qg41pqt6.js:823625-824234 esm-fingerprint
function windowsAclRestoreAllowed(revoke) {
  logWindowsAclOutcomes("grant revoke", revoke.outcomes);
  if (revoke.complete) return true;
  let paths = revoke.pending;
  logForDebugging_2(
    "[Sandbox Windows] grant revoke did not complete" +
      " \u2014 NOT running the deny restore; deny ACEs stay in place " +
      `while a grant may still be on disk. Grants possibly left in place: ${paths.length > 0 ? paths.map((p) => `'${p}'`).join(", ") : "(none reported)"}` +
      (revoke.detail ? `. srt-win: ${revoke.detail}` : "") +
      ". The next revoke retries them; after this process exits, `srt-win acl recover` does, and removes its deny ACEs once they are released (`--force` drops the record of a grant that can no longer be located).",
    {
      level: "error",
    },
  );
  return false;
}
//@ chunk-qg41pqt6.js:824234-824323 esm-fingerprint
function releaseWindowsSessionAcls(sandboxUserSid, srtWin) {
  let o = {
    sandboxUserSid,
    srtWin,
  };
  if (windowsAclRestoreAllowed(revokeWindowsAclChecked(o)))
    logWindowsAclOutcomes("deny restore", restoreWindowsAcl(o));
}
//@ chunk-qg41pqt6.js:824323-824346 esm-fingerprint
var MAX_COMMAND_TEXTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var commandTextsByKey;
deferInit("chunk-qg41pqt6.js:824323", () => {
  MAX_COMMAND_TEXTS = 1024;
  commandTextsByKey = new Map();
});
//@ chunk-qg41pqt6.js:824346-824525 esm-fingerprint
function registerCommandText(command, options) {
  let key = decodeSandboxedCommand(encodeSandboxedCommand(orDefault(command, options?.commandId)));
  let text = options?.commandText ?? command;
  commandTextsByKey.delete(key);
  commandTextsByKey.set(key, text);
  while (commandTextsByKey.size > MAX_COMMAND_TEXTS) {
    let oldest = commandTextsByKey.keys().next().value;
    if (oldest === undefined) break;
    commandTextsByKey.delete(oldest);
  }
}
//@ chunk-qg41pqt6.js:824525-824564 esm-layout
function resolveCommandText(decodedKey) {
  return commandTextsByKey.get(decodedKey) ?? dedupeFingerprint(decodedKey);
}
//@ chunk-qg41pqt6.js:824564-824585 esm-layout
var MIN_NETWORK_LISTS_COMMAND_ID_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var commandNetworkListsByKey;
deferInit("chunk-qg41pqt6.js:824564", () => {
  MIN_NETWORK_LISTS_COMMAND_ID_LENGTH = 22;
  commandNetworkListsByKey = new Map();
});
//@ chunk-qg41pqt6.js:824585-825573 esm-fingerprint
function registerCommandNetworkLists(commandId, lists) {
  let key = typeof commandId === "string" ? decodeSandboxedCommand(encodeSandboxedCommand(commandId)) : "";
  if (key.replace(/\ufffd/g, "").length < MIN_NETWORK_LISTS_COMMAND_ID_LENGTH)
    throw Error(
      `registerCommandNetworkLists: commandId must be a string of at least ${MIN_NETWORK_LISTS_COMMAND_ID_LENGTH} characters, unpaired surrogates not counted. The id is the only thing that binds a proxy connection to this allow list, and the sandboxed process chooses which id it presents, so it must be random (at least 128 bits, e.g. 16 random bytes as base64url) and never derived from the command text, a counter or the time.`,
    );
  let allowedDomains = lists?.allowedDomains ?? [];
  if (!Array.isArray(allowedDomains))
    throw Error("registerCommandNetworkLists: allowedDomains must be an array of strings.");
  for (let entry of allowedDomains)
    if (typeof entry !== "string" || !isValidAllowedDomainEntry(entry))
      throw Error(
        `registerCommandNetworkLists: invalid allowedDomains entry ${JSON.stringify(entry)}. ${ALLOWED_DOMAIN_ENTRY_MESSAGE}`,
      );
  commandNetworkListsByKey.set(key, {
    allowedDomains: [...allowedDomains],
  });
  if (config?.network.httpProxyPort !== undefined)
    logForDebugging_2(
      "registerCommandNetworkLists: network.httpProxyPort is set (an external proxy), so this list will never apply",
      {
        level: "warn",
      },
    );
}
//@ chunk-qg41pqt6.js:825573-825641 esm-fingerprint
function unregisterCommandNetworkLists(commandId) {
  if (typeof commandId !== "string") return;
  commandNetworkListsByKey.delete(decodeSandboxedCommand(encodeSandboxedCommand(commandId)));
}
//@ chunk-qg41pqt6.js:825641-825795 esm-fingerprint
function recordProxyViolation(line, encodedCommand) {
  let command = encodedCommand ? resolveCommandText(decodeSandboxedCommand(encodedCommand)) : undefined;
  if (shouldIgnoreViolation(line, command, config?.ignoreViolations)) return;
  sandboxViolationStore.addViolation({
    line,
    encodedCommand,
    command,
    timestamp: new Date(),
  });
}
//@ chunk-qg41pqt6.js:825795-825863 esm-fingerprint
function recordOutboundDeny(host, port, reason, encodedCommand) {
  recordProxyViolation(`deny network-outbound ${host}:${port} (${reason})`, encodedCommand);
}
//@ chunk-qg41pqt6.js:825863-825955 esm-fingerprint
var directLookup = (port, encodedCommand) => (hostname, options, callback) =>
  resolvedAddressGuard.lookupFor(port)(hostname, options, (err, address, family) => {
    if (isResolvedAddressDeniedError(err)) recordOutboundDeny(hostname, port, err.reason, encodedCommand);
    callback(err, address, family);
  });
//@ chunk-qg41pqt6.js:825955-826035 esm-fingerprint
function redactUrlForViolation(url) {
  let cut = url.search(/[?#]/);
  return cut === -1 ? url : `${url.slice(0, cut + 1)}\u2026`;
}
//@ chunk-qg41pqt6.js:826035-826109 esm-fingerprint
function isDeclaredDenial(answer) {
  return answer === false || (typeof answer === "object" && answer !== null && answer.allow === false);
}
//@ chunk-qg41pqt6.js:826109-826247 esm-fingerprint
function denialReasonOf(answer) {
  if (typeof answer !== "object" || answer === null) return;
  let { allow, reason } = answer;
  if (allow !== false || typeof reason !== "string") return;
  return sanitizeDenialReason(reason) || undefined;
}
//@ chunk-qg41pqt6.js:826247-826394 esm-fingerprint
function deniedDomainReason(entry) {
  let reasons = config?.network.deniedDomainReasons ?? {};
  return (
    (Object.prototype.hasOwnProperty.call(reasons, entry) ? reasons[entry] : undefined) ??
    "host is on the deny list"
  );
}
//@ chunk-qg41pqt6.js:826394-827669 esm-fingerprint
async function filterNetworkRequest(port, host, sandboxAskCallback, encodedCommand, explain) {
  let denied = (reason) => {
    recordOutboundDeny(host, port, reason, encodedCommand);
    explain?.(reason);
    return false;
  };
  if (!config) {
    logForDebugging_2("No config available, denying network request");
    return denied("sandbox policy unavailable");
  }
  if (!isValidHost(host)) {
    logForDebugging_2(`Denying malformed host: ${JSON.stringify(host)}:${port}`, {
      level: "error",
    });
    return denied("malformed host");
  }
  let canonicalHost = canonicalizeHost(host) ?? host;
  for (let deniedDomain of config.network.deniedDomains)
    if (matchesDomainPatternWithPort(canonicalHost, port, deniedDomain)) {
      logForDebugging_2(`Denied by config rule: ${host}:${port}`);
      return denied(deniedDomainReason(deniedDomain));
    }
  for (let allowedDomain of config.network.allowedDomains)
    if (matchesDomainPatternWithPort(canonicalHost, port, allowedDomain)) {
      logForDebugging_2(`Allowed by config rule: ${host}:${port}`);
      return true;
    }
  if (config.network.strictAllowlist) {
    logForDebugging_2(`No matching config rule, denying: ${host}:${port}`);
    return denied("host is not on the allow list");
  }
  let perCommand = encodedCommand
    ? commandNetworkListsByKey.get(decodeSandboxedCommand(encodedCommand))
    : undefined;
  for (let allowedDomain of perCommand?.allowedDomains ?? [])
    if (matchesDomainPatternWithPort(canonicalHost, port, allowedDomain)) {
      logForDebugging_2(`Allowed by per-command rule: ${host}:${port}`);
      return true;
    }
  if (!sandboxAskCallback) {
    logForDebugging_2(`No matching rule, denying: ${host}:${port}`);
    return denied("host is not on the allow list");
  }
  logForDebugging_2(`No matching rule, asking user: ${host}:${port}`);
  try {
    let answer = await sandboxAskCallback({
      host,
      port,
    });
    if (answer === true) {
      logForDebugging_2(`User allowed: ${host}:${port}`);
      return true;
    }
    if (!isDeclaredDenial(answer))
      logForDebugging_2(
        `Ask callback answered neither a boolean nor { allow: false, reason }; treating it as a denial: ${host}:${port}`,
        {
          level: "warn",
        },
      );
    logForDebugging_2(`User denied: ${host}:${port}`);
    return denied(denialReasonOf(answer) ?? "user denied");
  } catch (error) {
    logForDebugging_2(`Error in permission callback: ${error}`, {
      level: "error",
    });
    return denied("permission prompt failed");
  }
}
//@ chunk-qg41pqt6.js:827669-827757 esm-fingerprint
function buildCredentialInjector() {
  if (!config?.credentials) return;
  return (headers, destHost) => {
    sentinelRegistry.substituteInHeaders(headers, destHost, matchesDomainPattern);
  };
}
//@ chunk-qg41pqt6.js:827757-827836 esm-fingerprint
function buildBodyCredentialInjector() {
  if (!config?.credentials) return;
  return (destHost) => sentinelRegistry.sentinelsForHost(destHost, matchesDomainPattern);
}
//@ chunk-qg41pqt6.js:827836-827937 esm-fingerprint
function buildSigv4Planner() {
  if (!config?.credentials) return;
  return (method, requestTarget, headers, destHost) =>
    createSigv4Planner(awsPairRegistry, config?.credentials?.sigv4, matchesDomainPattern)(
      method,
      requestTarget,
      headers,
      destHost,
    );
}
//@ chunk-qg41pqt6.js:827937-828130 esm-fingerprint
function getMitmSocketPath(host) {
  if (!config?.network.mitmProxy) return;
  let { socketPath, domains } = config.network.mitmProxy;
  let canonicalHost = canonicalizeHost(host) ?? host;
  for (let pattern of domains)
    if (matchesDomainPattern(canonicalHost, pattern)) {
      logForDebugging_2(`Host ${host} matches MITM pattern ${pattern}`);
      return socketPath;
    }
  return;
}
//@ chunk-qg41pqt6.js:828130-828636 esm-fingerprint
function shouldTerminateTLSForHost(host) {
  let excludeDomains = config?.network.tlsTerminate?.excludeDomains;
  if (!excludeDomains?.length) return true;
  let canonicalHost = canonicalizeHost(host) ?? host;
  for (let pattern of excludeDomains) {
    if (!matchesDomainPattern(canonicalHost, pattern)) continue;
    logForDebugging_2(
      `Host ${host} matches tlsTerminate.excludeDomains pattern ${pattern}; skipping TLS termination`,
    );
    let masked = sentinelRegistry.namesInjectableAt(canonicalHost, matchesDomainPattern);
    if (masked.length > 0)
      logForDebugging_2(
        `tlsTerminate.excludeDomains: masked credential(s) ${masked.join(", ")} are configured for injection at ${host}, but its connections are not terminated, so the upstream will receive the placeholder`,
        {
          level: "error",
        },
      );
    return false;
  }
  return true;
}
//@ chunk-qg41pqt6.js:828636-830254 esm-fingerprint
async function startMuxProxyServer(sandboxAskCallback, portRange) {
  let injectCredentials = buildCredentialInjector();
  let injectBodyCredentials = buildBodyCredentialInjector();
  httpProxyServer = createHttpProxyServer({
    filter: (port, host, _socket, encodedCommand, explain) =>
      filterNetworkRequest(port, host, sandboxAskCallback, encodedCommand, explain),
    getMitmSocketPath,
    mitmCA,
    shouldTerminateTLS: shouldTerminateTLSForHost,
    filterRequest: config?.network.filterRequest,
    plaintextHeaderSet: config?.network.allowPlaintextHeaderSet,
    stripResponseHeaders: config?.network.stripResponseHeaders,
    refuseOpaqueTunnels: config?.network.refuseOpaqueTunnels,
    requireHostMatch: config?.network.requireHostMatch,
    ambiguousRequestTarget: config?.network.ambiguousRequestTarget,
    get maxTerminatedTunnels() {
      return config?.network.tlsTerminate?.maxTunnels;
    },
    get tlsHandshakeTimeoutMs() {
      return config?.network.tlsTerminate?.handshakeTimeoutMs;
    },
    onFilterRequestDenied: ({ method, url, reason, encodedCommand }) => {
      let target = method === "CONNECT" ? url : redactUrlForViolation(url);
      recordProxyViolation(`deny http-request ${method} ${target} (${reason})`, encodedCommand);
    },
    mutateHeaders: injectCredentials,
    mutateHeadersPlaintext: config?.credentials?.allowPlaintextInject ? injectCredentials : undefined,
    getBodySubstitutions: injectBodyCredentials,
    getBodySubstitutionsPlaintext: config?.credentials?.allowPlaintextInject
      ? injectBodyCredentials
      : undefined,
    planSigv4: buildSigv4Planner(),
    parentProxy,
    lookupFor: directLookup,
    proxyAuthToken,
  });
  socksProxyServer = createSocksProxyServer({
    filter: (port, host, encodedCommand) =>
      filterNetworkRequest(port, host, sandboxAskCallback, encodedCommand),
    parentProxy,
    lookupFor: directLookup,
    proxyAuthToken,
    refuseOpaqueTunnels: config?.network.refuseOpaqueTunnels,
    onTunnelRefused: (port, host, encodedCommand) => {
      recordProxyViolation(`deny socks-tunnel ${host}:${port} (refuseOpaqueTunnels)`, encodedCommand);
    },
    probeUnauthenticated: async (port, host) => {
      if (!config) return {};
      let canonical = canonicalizeHost(host) ?? host;
      for (let entry of config.network.deniedDomains)
        if (matchesDomainPatternWithPort(canonical, port, entry)) {
          let reason = deniedDomainReason(entry);
          recordOutboundDeny(host, port, reason);
          return {
            deniedReason: reason,
          };
        }
      return {};
    },
  });
  muxProxyServer = createMuxProxyServer({
    httpServer: httpProxyServer,
    handleSocksConnection: (s) => socksProxyServer.handleConnection(s),
    httpBackendPortRange: portRange,
  });
  let mux = muxProxyServer;
  await mux.listenHttpBackend();
  let muxPort = await mux.listenFrontEnd(portRange);
  mux.unref();
  logForDebugging_2(`Mux proxy (HTTP+SOCKS) listening on localhost:${muxPort}`);
  return muxPort;
}
//@ chunk-qg41pqt6.js:830254-830347 esm-layout
async function initialize(runtimeConfig, sandboxAskCallback, enableLogMonitor = false, options) {
  try {
    await initializeSteps(runtimeConfig, sandboxAskCallback, enableLogMonitor, options);
  } catch (error) {
    if (mitmCA) disposeMitmCASync(mitmCA);
    mitmCA = undefined;
    throw error;
  }
}
//@ chunk-qg41pqt6.js:830347-836276 esm-fingerprint
async function initializeSteps(runtimeConfig, sandboxAskCallback, enableLogMonitor, options) {
  if (initializationPromise) {
    await initializationPromise;
    return;
  }
  config = runtimeConfig;
  configInstalls++;
  parentProxy = resolveParentProxy(runtimeConfig.network.parentProxy);
  if (parentProxy)
    logForDebugging_2(
      `Parent proxy configured: http=${redactUrl(parentProxy.httpUrl)} https=${redactUrl(parentProxy.httpsUrl)}`,
    );
  resolvedAddressGuard = createResolvedAddressGuard(runtimeConfig.network);
  if (runtimeConfig.network.tlsTerminate && runtimeConfig.network.mitmProxy)
    throw Error("network.tlsTerminate and network.mitmProxy are mutually exclusive");
  if (runtimeConfig.network.tlsTerminate) assertTlsTerminationSupported();
  let tlsTerminate = runtimeConfig.network.tlsTerminate;
  let useWindowsPersistentCa =
    getPlatform_2() === "windows" &&
    tlsTerminate !== undefined &&
    !tlsTerminate.caCertPath &&
    !tlsTerminate.caKeyPath;
  mitmCA = tlsTerminate && !useWindowsPersistentCa ? createMitmCA(tlsTerminate) : undefined;
  let deps = await checkDependenciesAsync();
  if (deps.errors.length > 0) {
    if (deps.reinstallRequired) throw new WindowsSandboxError("reinstall_required", deps.reinstallRequired);
    if (deps.loopbackMismatch) throw new WindowsSandboxError("wfp_loopback_mismatch", deps.loopbackMismatch);
    throw Error(`Sandbox dependencies not available: ${deps.errors.join(", ")}`);
  }
  if (enableLogMonitor && getPlatform_2() === "macos") {
    logMonitorShutdown = startMacOSSandboxLogMonitor(
      sandboxViolationStore.addViolation.bind(sandboxViolationStore),
      config.ignoreViolations,
      resolveCommandText,
    );
    logForDebugging_2("Started macOS sandbox log monitor");
  }
  if (enableLogMonitor && getPlatform_2() === "linux") {
    let monitoredWrites = getFsWriteConfig();
    linuxMonitor = startLinuxSandboxViolationMonitor(
      sandboxViolationStore.addViolation.bind(sandboxViolationStore),
      {
        allowWritePaths: [
          ...writeRootsOf(monitoredWrites),
          ...(config.filesystem.disabled ? [] : getDefaultWritePaths()),
        ].map((p) =>
          normalizePathForSandbox(p, {
            literal: true,
          }),
        ),
        denyWritePaths: [
          ...monitoredWrites.denyWithinAllow.map((p) =>
            normalizePathForSandbox(p, {
              literal: true,
            }),
          ),
          ...(monitoredWrites.literalDenyWithinAllow ?? []).map((p) =>
            normalizePathForSandbox(p, {
              literal: true,
            }),
          ),
          ...(config.filesystem.disabled ? [] : linuxGetCwdMandatoryDenyPaths(getAllowGitConfig())),
        ],
        ignoreViolations: config.ignoreViolations,
        resolveCommandText,
      },
    );
    linuxMonitor.ready;
    logForDebugging_2("Started Linux seccomp violation monitor");
  }
  registerCleanup();
  if (getPlatform_2() === "windows") {
    srtWinSpawn = resolveSrtWin(runtimeConfig.windows?.srtWin);
    let srtWin = srtWinSpawn;
    let u = await getWindowsSandboxUserStatusAsync({
      srtWin,
    });
    if (!u.provisioned || !u.credPresent) {
      config = undefined;
      throw new WindowsSandboxError(
        "not_provisioned",
        `Windows sandbox user is not provisioned (user=${u.provisioned}, cred=${u.credPresent}). Run \`npx sandbox-runtime windows-install\` (one UAC prompt) to provision it.`,
      );
    }
    let staleSetup = windowsSetupVersionMismatch(
      u,
      runtimeConfig.windows?.sublayerGuid ?? runtimeConfig.windows?.wfpSublayerGuid,
    );
    if (staleSetup) {
      config = undefined;
      throw new WindowsSandboxError("reinstall_required", staleSetup);
    }
    windowsProfileReadWarnings = [];
    let profileRead = "absent";
    let profileExclusions = {
      exclusions: [],
      ungrantedOnly: [],
    };
    try {
      let missing = missingWindowsSrtWinCapability(u.capabilities);
      if (missing !== undefined) throw windowsSrtWinOutdatedError(missing, WINDOWS_CAPABILITIES_WHY);
      windowsCapableSrtWin.add(windowsSrtWinIdentity(srtWin));
      if (u.profileGrant) {
        let grant = await getWindowsProfileReadStatusAsync({
          srtWin,
        });
        if (grant.state !== "none" && grant.state !== "current")
          throw new WindowsSandboxError(
            "profile_grant_outdated",
            `The recorded read grant on your user profile cannot be used (${grant.state}${grant.reason ? `: ${grant.reason}` : ""}). Call grantWindowsProfileRead() (\`srt-win profile grant\`, or \`npx sandbox-runtime windows-install\` again) as the user who starts sessions to bring it up to date, or forgetWindowsProfileRead() (\`srt-win profile forget\`) to run without reading the profile. initialize() does neither itself.`,
          );
        if (grant.state === "current") {
          profileExclusions = grant;
          profileRead = "granted";
          windowsProfileReadWarnings = windowsProfileReadWarningsOf(grant);
          for (let w of windowsProfileReadWarnings)
            logForDebugging_2(`[Sandbox Windows] ${w.message}`, {
              level: "warn",
            });
        }
      }
      windowsProfileRead = profileRead;
      if (profileRead === "absent")
        logForDebugging_2(
          "[Sandbox Windows] no profile read grant: the user profile is not readable to sandboxed commands in this session",
        );
    } catch (e) {
      windowsProfileRead = undefined;
      config = undefined;
      throw e;
    }
    if (useWindowsPersistentCa && tlsTerminate)
      try {
        let p = await ensurePersistentWindowsCa({
          status: u,
          srtWin,
        });
        mitmCA = createMitmCA({
          caCertPem: p.certPem,
          caKeyPem: p.keyPem,
          caCertPath: p.certPath,
          caKeyPath: p.keyPath,
          extraCaCertPaths: tlsTerminate.extraCaCertPaths,
        });
      } catch (e) {
        config = undefined;
        throw e;
      }
    try {
      let maskedFiles = [];
      try {
        maskedFiles = windowsMaskedFileDenies(
          getCredentialRestrictions(runtimeConfig.credentials, runtimeConfig.network.allowedDomains),
        );
      } catch {}
      let acc = computeWindowsFsAccessSet(runtimeConfig, maskedFiles);
      let ownRead = mitmCA ? [dirname(mitmCA.trustBundlePath)] : [];
      let override = options?.dangerouslyAllowReadOfProfileExclusions ?? [];
      let refused = [
        ...windowsProfileExclusionConflicts(acc.grantRead, profileExclusions, {
          override,
        }),
        ...windowsProfileExclusionConflicts(ownRead, profileExclusions),
        ...windowsProfileExclusionConflicts(acc.grantWrite, profileExclusions, {
          write: true,
        }),
      ];
      if (refused.length > 0) {
        let describe = (c) => {
          let list = c.access === "write" ? "allowWrite" : "allowRead";
          let what =
            c.kind === "ungranted-only"
              ? (c.relation === "equal" ? "is" : "contains") +
                ` ${c.exclusion}, which is not granted as a whole (grant a directory inside it instead)`
              : c.relation === "equal"
                ? `is the excluded ${c.exclusion}`
                : c.relation === "inside"
                  ? `lies inside the excluded ${c.exclusion}`
                  : c.unexamined !== undefined
                    ? `may contain the excluded ${c.exclusion}: ${c.unexamined}, and a path is granted only once it has been looked at`
                    : `contains the excluded ${c.exclusion}`;
          return (
            `${list} ${c.path} ${what}` +
            (c.access === "write" && c.relation === "above"
              ? ": a write grant on it is kept and inherited, so that path would be writable and readable if it is ever " +
                "created again \u2014 choose a narrower working directory"
              : "")
          );
        };
        throw new WindowsSandboxError(
          "profile_exclusion_read_grant",
          "The session would grant a path that reaches one excluded from reads of your user profile: " +
            refused.map(describe).join("; ") +
            ". Nothing was granted. Remove the entry, or name a path that neither is nor contains an excluded one.",
        );
      }
      let grantRead = mitmCA ? [...acc.grantRead, dirname(mitmCA.trustBundlePath)] : acc.grantRead;
      if (!u.sid)
        throw Error(
          "sandbox user SID missing from `srt-win user status` (provisioned but in an inconsistent state)",
        );
      let sb = u.sid;
      windowsFsSbUserSid = sb;
      await grantWindowsAclPersistent({
        sandboxUserSid: sb,
        read: grantRead,
        write: acc.grantWrite,
        denyRead: acc.denyRead,
        denyWrite: acc.denyWrite,
        allowProfileExclusions: override,
        srtWin,
      });
      windowsFsStampedSet = acc;
      logForDebugging_2(
        `[Sandbox Windows] fs applied: ${acc.grantWrite.length} grantWrite, ${grantRead.length} grantRead, ${acc.denyRead.length} denyRead, ${acc.denyWrite.length} denyWrite`,
      );
      let allowLoopback = runtimeConfig.network?.allowLocalBinding === true;
      if (windowsWfpVerifiedFor !== sb || windowsWfpVerifiedLoopback !== allowLoopback) {
        await verifyWindowsWfpEgress({
          proxyPortRange: runtimeConfig.windows?.proxyPortRange,
          writeRoots: acc.grantWrite,
          allowLoopback,
          sublayerGuid: runtimeConfig.windows?.sublayerGuid ?? runtimeConfig.windows?.wfpSublayerGuid,
          sandboxUser: runtimeConfig.windows?.sandboxUser,
          srtWin,
        });
        windowsWfpVerifiedFor = sb;
        windowsWfpVerifiedLoopback = allowLoopback;
      }
      windowsFsRawInputs = rawWindowsFsInputs(runtimeConfig);
    } catch (e) {
      if (windowsFsSbUserSid) releaseWindowsSessionAcls(windowsFsSbUserSid, srtWin);
      windowsFsSbUserSid = undefined;
      windowsFsStampedSet = undefined;
      windowsProfileRead = undefined;
      config = undefined;
      throw e;
    }
  }
  initializationPromise = (async () => {
    try {
      let portRange =
        getPlatform_2() === "windows"
          ? (config.windows?.proxyPortRange ?? DEFAULT_WINDOWS_PROXY_PORT_RANGE)
          : undefined;
      proxyAuthToken =
        config.network.httpProxyPort !== undefined ? undefined : randomBytes(16).toString("hex");
      let muxPort =
        config.network.httpProxyPort === undefined || config.network.socksProxyPort === undefined
          ? await startMuxProxyServer(sandboxAskCallback, portRange)
          : undefined;
      let httpProxyPort = config.network.httpProxyPort ?? muxPort;
      let socksProxyPort = config.network.socksProxyPort ?? muxPort;
      javaAgentJarPath = (await getJavaProxyAgentJarPathAsync(config.javaAgentJarPath)) ?? undefined;
      if (mitmCA && muxPort !== undefined && getPlatform_2() === "windows")
        mitmCA.crlUrl = `http://127.0.0.1:${muxPort}${CRL_PATH}`;
      if (config.network.httpProxyPort !== undefined)
        logForDebugging_2(`Using external HTTP proxy on port ${httpProxyPort}`);
      if (config.network.socksProxyPort !== undefined)
        logForDebugging_2(`Using external SOCKS proxy on port ${socksProxyPort}`);
      let linuxBridge;
      if (getPlatform_2() === "linux")
        linuxBridge = await initializeLinuxNetworkBridge(httpProxyPort, socksProxyPort, config.socatPath);
      let context = {
        httpProxyPort,
        socksProxyPort,
        linuxBridge,
      };
      managerContext = context;
      logForDebugging_2("Network infrastructure initialized");
      return context;
    } catch (error) {
      initializationPromise = undefined;
      managerContext = undefined;
      reset().catch((e) => {
        logForDebugging_2(`Cleanup failed in initializationPromise ${e}`, {
          level: "error",
        });
      });
      throw error;
    }
  })();
  await initializationPromise;
}
//@ chunk-qg41pqt6.js:836276-836369 esm-fingerprint
function isSupportedPlatform_2() {
  let platform = getPlatform_2();
  if (platform === "linux") return getWslVersion() !== "1";
  return platform === "macos" || platform === "windows";
}
//@ chunk-qg41pqt6.js:836369-836402 esm-layout
function isSandboxingEnabled_2() {
  return config !== undefined;
}
//@ chunk-qg41pqt6.js:836402-837227 esm-fingerprint
function checkDependenciesCommon(ripgrepConfig) {
  if (!isSupportedPlatform_2())
    return {
      done: {
        errors: ["Unsupported platform"],
        warnings: [],
      },
    };
  let errors = [];
  let warnings = [];
  let platform = getPlatform_2();
  if (platform === "linux") {
    let rgToCheck = ripgrepConfig ??
      config?.ripgrep ?? {
        command: "rg",
      };
    if (whichSync(rgToCheck.command) === null) errors.push(`ripgrep (${rgToCheck.command}) not found`);
    let linuxDeps = checkLinuxDependencies({
      seccompConfig: config?.seccomp,
      bwrapPath: config?.bwrapPath,
      socatPath: config?.socatPath,
    });
    errors.push(...linuxDeps.errors);
    warnings.push(...linuxDeps.warnings);
  } else if (platform === "windows") {
    let srtWin;
    try {
      srtWin = resolveSrtWin(config?.windows?.srtWin);
    } catch (e) {
      errors.push(e.message);
      return {
        done: {
          errors,
          warnings,
        },
      };
    }
    return {
      windows: {
        sublayerGuid: config?.windows?.sublayerGuid ?? config?.windows?.wfpSublayerGuid,
        proxyPortRange: config?.windows?.proxyPortRange,
        sandboxUser: config?.windows?.sandboxUser,
        srtWin,
        ...(config && {
          allowLoopback: config.network?.allowLocalBinding === true,
        }),
      },
    };
  }
  if (!config?.filesystem.disabled)
    try {
      let ownInstall = ownInstallWarning(writeRootsOf(getFsWriteConfig()));
      if (ownInstall !== undefined) warnings.push(ownInstall);
    } catch {}
  return {
    done: {
      errors,
      warnings,
    },
  };
}
//@ chunk-qg41pqt6.js:837227-837303 esm-fingerprint
function checkDependencies(ripgrepConfig) {
  let common = checkDependenciesCommon(ripgrepConfig);
  if ("done" in common) return common.done;
  return checkWindowsDependencies(common.windows);
}
//@ chunk-qg41pqt6.js:837303-837458 esm-fingerprint
async function checkDependenciesAsync(ripgrepConfig) {
  if (getPlatform_2() === "linux" && !config?.seccomp?.argv0)
    await getApplySeccompBinaryPath_2(config?.seccomp?.applyPath);
  let common = checkDependenciesCommon(ripgrepConfig);
  if ("done" in common) return common.done;
  return checkWindowsDependenciesAsync(common.windows);
}
//@ chunk-qg41pqt6.js:837458-838048 esm-fingerprint
function getCredentialRestrictions(credentials, allowedDomains) {
  if (!credentials)
    return {
      denyReadPaths: [],
      unsetEnvVars: [],
      setEnvVars: {},
      maskedFileBinds: [],
      maskedFileStoreDir: undefined,
      degradeToDenyPaths: [],
    };
  let denyReadPaths = getCredentialDenyReadPaths(credentials);
  let defaultInjectHosts = [...new Set((allowedDomains ?? []).map(stripDomainPatternPort))];
  let unsetEnvVars = [];
  for (let v of credentials.envVars ?? []) if (v.mode === "deny") unsetEnvVars.push(v.name);
  let { setEnvVars, degradeToUnsetNames } = buildMaskedEnvVars(
    credentials.envVars ?? [],
    defaultInjectHosts,
    sentinelRegistry,
  );
  unsetEnvVars.push(...degradeToUnsetNames);
  registerAwsPairs(
    credentials.envVars ?? [],
    credentials.awsPairs,
    defaultInjectHosts,
    setEnvVars,
    awsPairRegistry,
  );
  let files = credentials.files ?? [];
  let { binds: maskedFileBinds, degradeToDenyPaths } = buildMaskedFileBinds(
    files,
    defaultInjectHosts,
    sentinelRegistry,
    maskedFileStore,
  );
  return {
    denyReadPaths: [...new Set([...denyReadPaths, ...degradeToDenyPaths])],
    unsetEnvVars: [...new Set(unsetEnvVars)],
    setEnvVars,
    maskedFileBinds,
    maskedFileStoreDir: maskedFileStore.dirPath,
    degradeToDenyPaths,
  };
}
//@ chunk-qg41pqt6.js:838048-838150 esm-fingerprint
function getCredentialDenyReadPaths(credentials) {
  let files = credentials?.files ?? [];
  return [...new Set(files.filter((f) => f.mode === "deny").map((f) => f.path))];
}
//@ chunk-qg41pqt6.js:838150-838281 esm-fingerprint
function defaultWritePathsUnder({ denyRead, allowRead, credentials }) {
  let underCredentialDenies = getDefaultWritePaths(
    readRulesOf([], undefined, getCredentialDenyReadPaths(credentials)),
  );
  return getDefaultWritePaths(readRulesOf(denyRead, allowRead, [])).filter((p) =>
    underCredentialDenies.includes(p),
  );
}
//@ chunk-qg41pqt6.js:838281-838469 esm-fingerprint
function* collectDenyPaths_2(denyRead = [], credentialRestrictions, expandGlob) {
  let listed = yield* expandDenyPaths("deny", denyRead, expandGlob);
  let credentialDenyOnly = yield* expandDenyPaths(
    "deny",
    credentialRestrictions.denyReadPaths,
    expandGlob,
    credentialRestrictions.degradeToDenyPaths,
  );
  return {
    denyOnly: [...new Set([...listed, ...credentialDenyOnly])],
    ...(credentialDenyOnly.length > 0 && {
      credentialDenyOnly,
    }),
  };
}
//@ chunk-qg41pqt6.js:838469-838655 esm-fingerprint
function* expandDenyPaths(kind, paths, expandGlob, literalPaths = []) {
  let literal = new Set(literalPaths);
  let resolved = new Set();
  for (let p of spelledOf(paths)) {
    let stripped = removeTrailingGlobSuffix(p);
    if (getPlatform_2() === "linux" && !literal.has(p) && containsGlobChars(stripped))
      for (let found of yield* withOtherReadings(p, stripped, kind, expandGlob)) resolved.add(found);
    else resolved.add(stripped);
  }
  return [...resolved];
}
//@ chunk-qg41pqt6.js:838655-838829 esm-fingerprint
function stripWriteGlobs(kind, paths) {
  return spelledOf(paths)
    .map((p) => removeTrailingGlobSuffix(p))
    .filter((p) => {
      if (getPlatform_2() === "linux" && containsGlobChars(p) && !hasNameReading(p, kind)) {
        logForDebugging_2(`[Sandbox] Skipping glob write pattern on Linux: ${p}`);
        return false;
      }
      return true;
    });
}
//@ chunk-qg41pqt6.js:838829-838980 esm-fingerprint
function* expandAllowReadGlob(pattern, anchor) {
  let expanded = (yield* walkGlobPatternSteps(pattern, {
    anchor,
  })).matches;
  logForDebugging_2(
    `[Sandbox] Expanded allowRead glob pattern "${pattern}" to ${expanded.length} paths on Linux`,
  );
  return expanded;
}
//@ chunk-qg41pqt6.js:838980-839404 esm-fingerprint
function getFsReadConfig() {
  if (!config || config.filesystem.disabled)
    return {
      denyOnly: [],
      allowWithinDeny: [],
    };
  let credentialRestrictions = getCredentialRestrictions(config.credentials, config.network.allowedDomains);
  let allowPaths = finish(expandDenyPaths("allow", config.filesystem.allowRead ?? [], expandAllowReadGlob));
  let reExposedPaths = reExposedBy(allowPaths, config.filesystem.allowRead, getFsWriteConfig());
  let unlistableDenyDirs = new Set();
  let listings = new Map();
  return {
    ...finish(
      collectDenyPaths_2(config.filesystem.denyRead, credentialRestrictions, (pattern, anchor) =>
        expandReadDenyGlobLinuxSteps(pattern, reExposedPaths, unlistableDenyDirs, {
          anchor,
          listings,
        }),
      ),
    ),
    allowWithinDeny: allowPaths,
    unlistableDenyDirs: [...unlistableDenyDirs],
    ...literalReadLists(config.filesystem.denyRead, config.filesystem.allowRead),
  };
}
//@ chunk-qg41pqt6.js:839404-839817 esm-fingerprint
function getFsWriteConfig() {
  if (!config)
    return {
      allowOnly: getDefaultWritePaths(),
      denyWithinAllow: [],
    };
  if (config.filesystem.disabled)
    return {
      allowOnly: ["/"],
      denyWithinAllow: [],
    };
  let readRules = stripWriteGlobs("allow", config.filesystem.allowWrite);
  let denyPaths = stripWriteGlobs("deny", config.filesystem.denyWrite);
  return {
    allowOnly: [
      ...defaultWritePathsUnder({
        denyRead: config.filesystem.denyRead,
        allowRead: config.filesystem.allowRead,
        credentials: config.credentials,
      }),
      ...readRules,
    ],
    denyWithinAllow: denyPaths,
    ...literalWriteLists(config.filesystem.allowWrite, config.filesystem.denyWrite),
  };
}
//@ chunk-qg41pqt6.js:839817-840192 esm-fingerprint
function computeWindowsFsAccessSet(c, maskedFiles) {
  let fs = c.filesystem;
  if (fs?.disabled)
    return {
      grantRead: [],
      grantWrite: [],
      denyRead: [...maskedFiles],
      denyWrite: [],
    };
  let expand = expandWindowsFsPaths;
  return rankWindowsFsAccess({
    allowRead: expand(fs?.allowRead ?? [], {
      mode: "grant",
    }),
    allowWrite: expand(fs?.allowWrite ?? [], {
      mode: "grant",
    }),
    denyRead: expand(fs?.denyRead ?? [], {
      mode: "deny",
    }),
    denyWrite: expand(fs?.denyWrite ?? [], {
      mode: "deny",
    }),
    credentialDeny: [
      ...expand(getCredentialDenyReadPaths(c.credentials), {
        mode: "deny",
      }),
      ...maskedFiles,
    ],
  });
}
//@ chunk-qg41pqt6.js:840192-840281 esm-fingerprint
function windowsMaskedFileDenies(credentialRestrictions) {
  return [
    ...credentialRestrictions.maskedFileBinds.map((b) => b.realPath),
    ...credentialRestrictions.degradeToDenyPaths,
  ];
}
//@ chunk-qg41pqt6.js:840281-840523 esm-fingerprint
function rawWindowsFsInputs(c) {
  return {
    disabled: c.filesystem.disabled ?? false,
    denyRead: [...c.filesystem.denyRead],
    denyWrite: [...c.filesystem.denyWrite],
    allowRead: [...(c.filesystem.allowRead ?? [])],
    allowWrite: [...c.filesystem.allowWrite],
    credFiles: getCredentialDenyReadPaths(c.credentials),
  };
}
//@ chunk-qg41pqt6.js:840523-840716 esm-fingerprint
function sameRawWindowsFsInputs(a, b) {
  return (
    a.disabled === b.disabled &&
    samePathEntries(a.denyRead, b.denyRead) &&
    samePathEntries(a.denyWrite, b.denyWrite) &&
    samePathEntries(a.allowRead, b.allowRead) &&
    samePathEntries(a.allowWrite, b.allowWrite) &&
    samePathEntries(a.credFiles, b.credFiles)
  );
}
//@ chunk-qg41pqt6.js:840716-840764 esm-layout
function sameWindowsStampSet(newConfig) {
  return (
    windowsFsRawInputs !== undefined &&
    sameRawWindowsFsInputs(windowsFsRawInputs, rawWindowsFsInputs(newConfig))
  );
}
//@ chunk-qg41pqt6.js:840764-841165 esm-layout
function windowsLoopbackModeChanged(wanted, verified) {
  let mode = (open) => (open ? "open" : "closed");
  return `network.allowLocalBinding asks for loopback ${mode(wanted)}, but this session verified the network fence with loopback ${mode(verified)}. On Windows the loopback mode is fixed by the install and checked at initialize(): it cannot change for one command or through updateConfig(). Call reset() then initialize() with the new value; the installed mode must match it.`;
}
//@ chunk-qg41pqt6.js:841165-841308 esm-fingerprint
function getNetworkRestrictionConfig() {
  if (!config) return {};
  let allowedHosts = config.network.allowedDomains;
  let deniedHosts = config.network.deniedDomains;
  return {
    allowedHosts,
    ...(deniedHosts.length > 0 && {
      deniedHosts,
    }),
  };
}
//@ chunk-qg41pqt6.js:841308-841359 esm-fingerprint
function getAllowUnixSockets() {
  return config?.network?.allowUnixSockets;
}
//@ chunk-qg41pqt6.js:841359-841413 esm-fingerprint
function getAllowAllUnixSockets() {
  return config?.network?.allowAllUnixSockets;
}
//@ chunk-qg41pqt6.js:841413-841465 esm-fingerprint
function getAllowLocalBinding() {
  return config?.network?.allowLocalBinding;
}
//@ chunk-qg41pqt6.js:841465-841515 esm-fingerprint
function getAllowMachLookup() {
  return config?.network?.allowMachLookup;
}
//@ chunk-qg41pqt6.js:841515-841557 esm-fingerprint
function getIgnoreViolations() {
  return config?.ignoreViolations;
}
//@ chunk-qg41pqt6.js:841557-841608 esm-fingerprint
function getEnableWeakerNestedSandbox() {
  return config?.enableWeakerNestedSandbox;
}
//@ chunk-qg41pqt6.js:841608-841662 esm-fingerprint
function getEnableWeakerNetworkIsolation() {
  return config?.enableWeakerNetworkIsolation;
}
//@ chunk-qg41pqt6.js:841662-841704 esm-fingerprint
function getAllowAppleEvents() {
  return config?.allowAppleEvents;
}
//@ chunk-qg41pqt6.js:841704-841753 esm-fingerprint
function getRipgrepConfig() {
  return (
    config?.ripgrep ?? {
      command: "rg",
    }
  );
}
//@ chunk-qg41pqt6.js:841753-841806 esm-fingerprint
function getMandatoryDenySearchDepth() {
  return config?.mandatoryDenySearchDepth ?? 3;
}
//@ chunk-qg41pqt6.js:841806-841862 esm-fingerprint
function getAllowGitConfig() {
  return config?.filesystem?.allowGitConfig ?? false;
}
//@ chunk-qg41pqt6.js:841862-841948 esm-fingerprint
function getGitSafeDirectories(customConfig) {
  return [...(config?.git?.safeDirectories ?? []), ...(customConfig?.git?.safeDirectories ?? [])];
}
//@ chunk-qg41pqt6.js:841948-841981 esm-fingerprint
function getSeccompConfig() {
  return config?.seccomp;
}
//@ chunk-qg41pqt6.js:841981-842005 esm-layout
function getProxyAuthToken() {
  return proxyAuthToken;
}
//@ chunk-qg41pqt6.js:842005-842044 esm-fingerprint
function getProxyPort() {
  return managerContext?.httpProxyPort;
}
//@ chunk-qg41pqt6.js:842044-842084 esm-fingerprint
function getSocksProxyPort() {
  return managerContext?.socksProxyPort;
}
//@ chunk-qg41pqt6.js:842084-842137 esm-fingerprint
function getLinuxHttpSocketPath() {
  return managerContext?.linuxBridge?.httpSocketPath;
}
//@ chunk-qg41pqt6.js:842137-842191 esm-fingerprint
function getLinuxSocksSocketPath() {
  return managerContext?.linuxBridge?.socksSocketPath;
}
//@ chunk-qg41pqt6.js:842191-842290 esm-layout
async function waitForNetworkInitialization() {
  if (!config) return false;
  if (initializationPromise)
    try {
      await initializationPromise;
      return true;
    } catch {
      return false;
    }
  return managerContext !== undefined;
}
//@ chunk-qg41pqt6.js:842290-842333 esm-layout
var RESTARTS_IN_TURNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPLACED;
var walking;
var waitingToWalk;
deferInit("chunk-qg41pqt6.js:842290", () => {
  RESTARTS_IN_TURNS = 2;
  REPLACED = Symbol("replaced");
  walking = false;
  waitingToWalk = [];
});
//@ chunk-qg41pqt6.js:842333-842639 esm-fingerprint
async function waitToWalk(signal) {
  if (walking) {
    signal?.throwIfAborted();
    await new Promise((resolve, reject) => {
      let go = () => {
        signal?.removeEventListener("abort", leave);
        resolve();
      };
      let leave = () => {
        waitingToWalk.splice(waitingToWalk.indexOf(go), 1);
        reject(signal?.reason);
      };
      waitingToWalk.push(go);
      signal?.addEventListener("abort", leave, {
        once: true,
      });
    });
  }
  walking = true;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    let next = waitingToWalk.shift();
    if (next) next();
    else walking = false;
  };
}
//@ chunk-qg41pqt6.js:842639-842691 esm-layout
async function wrapWithSandbox(command, binShell, customConfig, abortSignal, options) {
  return wrapWithSandboxAgain(0, command, binShell, customConfig, abortSignal, options);
}
//@ chunk-qg41pqt6.js:842691-842788 esm-layout
async function wrapWithSandboxAgain(restarts, command, binShell, customConfig, abortSignal, options) {
  let walkEnded = await waitToWalk(abortSignal);
  try {
    return await wrapWithSandboxOnce(
      walkEnded,
      restarts,
      command,
      binShell,
      customConfig,
      abortSignal,
      options,
    );
  } finally {
    walkEnded();
  }
}
//@ chunk-qg41pqt6.js:842788-846536 esm-fingerprint
async function wrapWithSandboxOnce(
  walkEnded,
  restarts,
  command,
  binShell,
  customConfig,
  abortSignal,
  options,
) {
  let platform = getPlatform_2();
  let commandId = options?.commandId;
  registerCommandText(command, options);
  let startedWith = config;
  let startedAt = configInstalls;
  let startedIn = workingDirectory();
  let movedOn = () =>
    config !== startedWith || configInstalls !== startedAt || workingDirectory() !== startedIn;
  let startOver = () => {
    walkEnded();
    return wrapWithSandboxAgain(restarts + 1, command, binShell, customConfig, abortSignal, options);
  };
  function* whileCurrent(steps) {
    for (;;) {
      if (movedOn()) return REPLACED;
      let step = steps.next();
      if (step.done) return step.value;
      yield;
    }
  }
  let walked = (steps) => {
    if (restarts < RESTARTS_IN_TURNS) return finishInTurns(whileCurrent(steps), abortSignal);
    abortSignal?.throwIfAborted();
    return finish(steps);
  };
  let fsDisabled =
    customConfig?.filesystem !== undefined
      ? (customConfig.filesystem.disabled ?? false)
      : (config?.filesystem.disabled ?? false);
  let credentialRestrictions = getCredentialRestrictions(
    customConfig?.credentials ?? config?.credentials,
    customConfig?.network?.allowedDomains ?? config?.network?.allowedDomains,
  );
  let writeConfig;
  let readConfig;
  if (!fsDisabled) {
    let userAllowWrite = stripWriteGlobs(
      "allow",
      customConfig?.filesystem?.allowWrite ?? config?.filesystem.allowWrite ?? [],
    );
    writeConfig = {
      allowOnly: [
        ...defaultWritePathsUnder({
          denyRead: customConfig?.filesystem?.denyRead ?? config?.filesystem.denyRead ?? [],
          allowRead: customConfig?.filesystem?.allowRead ?? config?.filesystem.allowRead,
          credentials: customConfig?.credentials ?? config?.credentials,
        }),
        ...userAllowWrite,
      ],
      denyWithinAllow: stripWriteGlobs(
        "deny",
        customConfig?.filesystem?.denyWrite ?? config?.filesystem.denyWrite ?? [],
      ),
      ...literalWriteLists(
        customConfig?.filesystem?.allowWrite ?? config?.filesystem.allowWrite,
        customConfig?.filesystem?.denyWrite ?? config?.filesystem.denyWrite,
      ),
    };
    if (!ownInstallLogged) {
      ownInstallLogged = true;
      try {
        let ownInstall = ownInstallWarning(writeRootsOf(writeConfig));
        if (ownInstall !== undefined)
          logForDebugging_2(ownInstall, {
            level: "warn",
          });
      } catch {}
    }
    let expandedAllowRead = await walked(
      expandDenyPaths(
        "allow",
        customConfig?.filesystem?.allowRead ?? config?.filesystem.allowRead ?? [],
        expandAllowReadGlob,
      ),
    );
    if (expandedAllowRead === REPLACED) return startOver();
    let ownAllowWithinDeny = [];
    if (mitmCA) ownAllowWithinDeny.push(mitmCA.certPath, mitmCA.trustBundlePath);
    if (javaAgentJarPath) ownAllowWithinDeny.push(javaAgentJarPath);
    expandedAllowRead.push(...ownAllowWithinDeny);
    let reExposedPaths = reExposedBy(
      expandedAllowRead,
      customConfig?.filesystem?.allowRead ?? config?.filesystem.allowRead,
      writeConfig,
    );
    let unlistableDenyDirs = new Set();
    let listings = new Map();
    let expandedDenyRead = await walked(
      collectDenyPaths_2(
        customConfig?.filesystem?.denyRead ?? config?.filesystem.denyRead,
        credentialRestrictions,
        (pattern, anchor) =>
          expandReadDenyGlobLinuxSteps(pattern, reExposedPaths, unlistableDenyDirs, {
            anchor,
            listings,
          }),
      ),
    );
    listings.clear();
    if (expandedDenyRead === REPLACED) return startOver();
    readConfig = {
      ...expandedDenyRead,
      allowWithinDeny: expandedAllowRead,
      ...(ownAllowWithinDeny.length > 0 && {
        ownAllowWithinDeny,
      }),
      unlistableDenyDirs: [...unlistableDenyDirs],
      ...literalReadLists(
        customConfig?.filesystem?.denyRead ?? config?.filesystem.denyRead,
        customConfig?.filesystem?.allowRead ?? config?.filesystem.allowRead,
      ),
    };
  }
  walkEnded();
  let hasAllowedDomains =
    customConfig?.network?.allowedDomains !== undefined || config?.network?.allowedDomains !== undefined;
  let denyAllNetwork = options?.denyAllNetwork === true;
  let needsNetworkRestriction = hasAllowedDomains || denyAllNetwork;
  let needsNetworkProxy = hasAllowedDomains && !denyAllNetwork;
  if (needsNetworkProxy) await waitForNetworkInitialization();
  if (movedOn()) return startOver();
  let allowPty = customConfig?.allowPty ?? config?.allowPty;
  let allowNestedUserNamespaces =
    customConfig?.allowNestedUserNamespaces ?? config?.allowNestedUserNamespaces;
  let gitSafeDirectories = getGitSafeDirectories(customConfig);
  switch (platform) {
    case "macos":
      return wrapCommandWithSandboxMacOS({
        command,
        commandId,
        needsNetworkRestriction,
        httpProxyPort: needsNetworkProxy ? getProxyPort() : undefined,
        socksProxyPort: needsNetworkProxy ? getSocksProxyPort() : undefined,
        proxyAuthToken: needsNetworkProxy ? proxyAuthToken : undefined,
        caCertPath: mitmCA?.trustBundlePath,
        javaAgentJarPath: needsNetworkProxy ? javaAgentJarPath : undefined,
        readConfig,
        writeConfig,
        unsetEnvVars: credentialRestrictions.unsetEnvVars,
        setEnvVars: credentialRestrictions.setEnvVars,
        maskedFileBinds: credentialRestrictions.maskedFileBinds,
        degradeToDenyPaths: credentialRestrictions.degradeToDenyPaths,
        allowUnixSockets: denyAllNetwork ? undefined : getAllowUnixSockets(),
        allowAllUnixSockets: denyAllNetwork ? false : getAllowAllUnixSockets(),
        allowLocalBinding: denyAllNetwork ? false : getAllowLocalBinding(),
        allowMachLookup: denyAllNetwork ? undefined : getAllowMachLookup(),
        ignoreViolations: getIgnoreViolations(),
        allowPty,
        allowGitConfig: getAllowGitConfig(),
        gitSafeDirectories,
        enableWeakerNetworkIsolation: denyAllNetwork ? false : getEnableWeakerNetworkIsolation(),
        allowAppleEvents: denyAllNetwork ? false : getAllowAppleEvents(),
        binShell,
      });
    case "linux":
      return wrapCommandWithSandboxLinux({
        command,
        commandId,
        needsNetworkRestriction,
        httpSocketPath: needsNetworkProxy ? getLinuxHttpSocketPath() : undefined,
        socksSocketPath: needsNetworkProxy ? getLinuxSocksSocketPath() : undefined,
        httpProxyPort: needsNetworkProxy ? managerContext?.httpProxyPort : undefined,
        socksProxyPort: needsNetworkProxy ? managerContext?.socksProxyPort : undefined,
        proxyAuthToken: needsNetworkProxy ? proxyAuthToken : undefined,
        caCertPath: mitmCA?.trustBundlePath,
        javaAgentJarPath: needsNetworkProxy ? javaAgentJarPath : undefined,
        readConfig,
        writeConfig,
        unsetEnvVars: credentialRestrictions.unsetEnvVars,
        setEnvVars: credentialRestrictions.setEnvVars,
        maskedFileBinds: credentialRestrictions.maskedFileBinds,
        maskedFileStoreDir: credentialRestrictions.maskedFileStoreDir,
        enableWeakerNestedSandbox: denyAllNetwork ? false : getEnableWeakerNestedSandbox(),
        allowNestedUserNamespaces,
        allowAllUnixSockets: denyAllNetwork ? false : getAllowAllUnixSockets(),
        binShell,
        ripgrepConfig: getRipgrepConfig(),
        mandatoryDenySearchDepth: getMandatoryDenySearchDepth(),
        allowGitConfig: getAllowGitConfig(),
        gitSafeDirectories,
        seccompConfig: getSeccompConfig(),
        bwrapPath: config?.bwrapPath,
        socatPath: config?.socatPath,
        observeSocketPath: linuxMonitor?.observeSocketPath,
        abortSignal,
      }).catch((err) => {
        if (err instanceof WorkingDirectoryChanged) return startOver();
        throw err;
      });
    case "windows":
      throw Error(
        "wrapWithSandbox() returns a shell string and is not supported on Windows. Use SandboxManager.wrapWithSandboxArgv() and spawn the result with {shell: false}.",
      );
    default:
      throw Error(`Sandbox configuration is not supported on platform: ${platform}`);
  }
}
//@ chunk-qg41pqt6.js:846536-848497 esm-fingerprint
async function wrapWithSandboxArgv_2(command, binShell, customConfig, abortSignal, cwd, options) {
  if (getPlatform_2() === "windows") {
    if (options?.denyAllNetwork === true) throw Error("denyAllNetwork is not supported on Windows");
    let hasNetworkConfig =
      customConfig?.network?.allowedDomains !== undefined || config?.network?.allowedDomains !== undefined;
    if (hasNetworkConfig) await waitForNetworkInitialization();
    let credentialRestrictions = getCredentialRestrictions(
      customConfig?.credentials ?? config?.credentials,
      customConfig?.network?.allowedDomains ?? config?.network?.allowedDomains,
    );
    let fsCfg = customConfig?.filesystem;
    let maskedFiles = windowsMaskedFileDenies(credentialRestrictions);
    let rawRead = [];
    let rawWrite = [];
    let rawCredential = [];
    if (!fsCfg?.disabled) {
      if (fsCfg?.allowRead?.length || fsCfg?.allowWrite?.length)
        throw Error(
          "Per-exec filesystem.allowRead/allowWrite is not supported " +
            "on Windows \u2014 `srt-win exec` only exposes per-exec " +
            "denies. Set them at the session level (initialize()).",
        );
      rawRead = fsCfg?.denyRead ?? [];
      rawWrite = fsCfg?.denyWrite ?? [];
      rawCredential = getCredentialDenyReadPaths(customConfig?.credentials);
    }
    let perExecDenyRead = [];
    let perExecDenyWrite = [];
    if (rawRead.length > 0 || rawWrite.length > 0 || rawCredential.length > 0 || maskedFiles.length > 0) {
      let sessRead = new Set(windowsFsStampedSet?.denyRead ?? []);
      let sessWrite = new Set(windowsFsStampedSet?.denyWrite ?? []);
      let expand = expandWindowsFsPaths;
      let ranked = rankWindowsFsAccess({
        allowRead: [],
        allowWrite: [],
        denyRead: expand(rawRead, {
          mode: "deny",
        }),
        denyWrite: expand(rawWrite, {
          mode: "deny",
        }),
        credentialDeny: [
          ...expand(rawCredential, {
            mode: "deny",
          }),
          ...maskedFiles,
        ],
        held: windowsFsStampedSet,
      });
      perExecDenyRead = ranked.denyRead.filter((p) => !sessRead.has(p));
      perExecDenyWrite = ranked.denyWrite.filter((p) => !sessRead.has(p) && !sessWrite.has(p));
    }
    assertWindowsSrtWinCapable(
      customConfig?.windows?.srtWin
        ? resolveSrtWin(customConfig.windows.srtWin)
        : (srtWinSpawn ?? resolveSrtWin(config?.windows?.srtWin)),
    );
    let wantsLoopback = (customConfig?.network?.allowLocalBinding ?? getAllowLocalBinding()) === true;
    if (windowsWfpVerifiedLoopback !== undefined && wantsLoopback !== windowsWfpVerifiedLoopback)
      throw new WindowsSandboxError(
        "wfp_loopback_mismatch",
        windowsLoopbackModeChanged(wantsLoopback, windowsWfpVerifiedLoopback),
      );
    registerCommandText(command, options);
    return wrapCommandWithSandboxWindows({
      command,
      commandId: options?.commandId,
      httpProxyPort: hasNetworkConfig ? getProxyPort() : undefined,
      socksProxyPort: hasNetworkConfig ? getSocksProxyPort() : undefined,
      proxyAuthToken: hasNetworkConfig ? proxyAuthToken : undefined,
      allowLoopback: wantsLoopback,
      setEnvVars: credentialRestrictions.setEnvVars,
      denyRead: perExecDenyRead,
      denyReadExcept: windowsGrantsBeneathDenies(
        [...(windowsFsStampedSet?.grantRead ?? []), ...(windowsFsStampedSet?.grantWrite ?? [])],
        perExecDenyRead,
      ),
      denyWrite: perExecDenyWrite,
      cwd,
      allowWrite: windowsFsStampedSet?.grantWrite,
      gitSafeDirectories: getGitSafeDirectories(customConfig),
      caCertPath: mitmCA?.trustBundlePath,
      heldBy: windowsFsSbUserSid !== undefined ? process.pid : undefined,
      writeRoots: windowsFsStampedSet?.grantWrite,
      binShell: parseWindowsBinShell(binShell),
      srtWin: customConfig?.windows?.srtWin
        ? resolveSrtWin(customConfig.windows.srtWin)
        : (srtWinSpawn ?? resolveSrtWin(config?.windows?.srtWin)),
    });
  }
  if (typeof binShell === "object")
    throw Error("binShell object form is Windows-only; pass a shell path string on macOS/Linux");
  let wrapped = await wrapWithSandbox(command, binShell, customConfig, abortSignal, options);
  return {
    argv: [binShell ?? "/bin/bash", "-c", wrapped],
    env: process.env,
  };
}
//@ chunk-qg41pqt6.js:848497-848521 esm-layout
function getConfig() {
  return config;
}
//@ chunk-qg41pqt6.js:848521-849216 esm-fingerprint
function updateConfig(newConfig) {
  if (getPlatform_2() === "windows" && config && !sameWindowsStampSet(newConfig))
    logForDebugging_2(
      "[Sandbox Windows] updateConfig: the resolved file-access set " +
        "(filesystem.* \u222A credentials.files) changed but the ACL " +
        "stamp/grant is session-wide \u2014 call reset() then initialize() " +
        "to apply. The previously-applied set stays in effect.",
      {
        level: "warn",
      },
    );
  let nextLoopback = newConfig.network?.allowLocalBinding === true;
  if (
    getPlatform_2() === "windows" &&
    config &&
    windowsWfpVerifiedLoopback !== undefined &&
    nextLoopback !== windowsWfpVerifiedLoopback
  )
    logForDebugging_2(
      "[Sandbox Windows] updateConfig: " +
        windowsLoopbackModeChanged(nextLoopback, windowsWfpVerifiedLoopback) +
        " Commands are refused until then.",
      {
        level: "warn",
      },
    );
  let nextGuard = createResolvedAddressGuard(newConfig.network);
  let { filterRequest, ...rest } = newConfig.network;
  config = structuredClone({
    ...newConfig,
    network: rest,
  });
  config.network.filterRequest = filterRequest;
  configInstalls++;
  resolvedAddressGuard = nextGuard;
  parentProxy = resolveParentProxy(newConfig.network.parentProxy);
  logForDebugging_2("Sandbox configuration updated");
}
//@ chunk-qg41pqt6.js:849216-849235 esm-layout
function cleanupAfterCommand() {
  cleanupBwrapMountPoints();
}
//@ chunk-qg41pqt6.js:849235-849247 esm-fingerprint
var BRIDGE_EXIT_TIMEOUT_MS = 1500;
//@ chunk-qg41pqt6.js:849247-849862 esm-fingerprint
function killBridgeProcess(proc, label) {
  if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  try {
    process.kill(proc.pid, "SIGTERM");
    logForDebugging_2(`Sent SIGTERM to ${label} bridge process`);
  } catch (err) {
    if (err.code !== "ESRCH")
      logForDebugging_2(`Error killing ${label} bridge: ${err}`, {
        level: "error",
      });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    let done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    proc.once("exit", () => {
      logForDebugging_2(`${label} bridge process exited`);
      done();
    });
    let timer = setTimeout(() => {
      if (proc.exitCode === null && proc.signalCode === null) {
        logForDebugging_2(`${label} bridge did not exit, forcing SIGKILL`, {
          level: "warn",
        });
        try {
          if (proc.pid) process.kill(proc.pid, "SIGKILL");
        } catch {}
      }
      done();
    }, BRIDGE_EXIT_TIMEOUT_MS);
    timer.unref?.();
  });
}
//@ chunk-qg41pqt6.js:849862-850104 esm-fingerprint
function forceCloseHttpServer(server) {
  return new Promise((resolve) => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close((error) => {
      if (error && error.message !== "Server is not running.")
        logForDebugging_2(`Error closing HTTP proxy server: ${error.message}`, {
          level: "error",
        });
      resolve();
    });
  });
}
//@ chunk-qg41pqt6.js:850104-851140 esm-fingerprint
async function reset() {
  if (windowsFsStampedSet && windowsFsSbUserSid) releaseWindowsSessionAcls(windowsFsSbUserSid, srtWinSpawn);
  windowsFsStampedSet = undefined;
  windowsFsSbUserSid = undefined;
  windowsFsRawInputs = undefined;
  srtWinSpawn = undefined;
  windowsProfileRead = undefined;
  windowsProfileReadWarnings = [];
  windowsCapableSrtWin.clear();
  cleanupBwrapMountPoints({
    force: true,
  });
  if (logMonitorShutdown) {
    logMonitorShutdown();
    logMonitorShutdown = undefined;
  }
  if (linuxMonitor) {
    linuxMonitor.stop();
    linuxMonitor = undefined;
  }
  if (managerContext?.linuxBridge) {
    let { httpSocketPath, socksSocketPath, httpBridgeProcess, socksBridgeProcess } =
      managerContext.linuxBridge;
    await Promise.all([
      killBridgeProcess(httpBridgeProcess, "HTTP"),
      killBridgeProcess(socksBridgeProcess, "SOCKS"),
    ]);
    if (httpSocketPath)
      try {
        fsModule_2.rmSync(httpSocketPath, {
          force: true,
        });
        logForDebugging_2("Cleaned up HTTP socket");
      } catch (err) {
        logForDebugging_2(`HTTP socket cleanup error: ${err}`, {
          level: "error",
        });
      }
    if (socksSocketPath)
      try {
        fsModule_2.rmSync(socksSocketPath, {
          force: true,
        });
        logForDebugging_2("Cleaned up SOCKS socket");
      } catch (err) {
        logForDebugging_2(`SOCKS socket cleanup error: ${err}`, {
          level: "error",
        });
      }
  }
  let closePromises = [];
  if (mitmCA) closePromises.push(disposeMitmCA(mitmCA));
  if (muxProxyServer)
    closePromises.push(
      muxProxyServer.close().catch((error) => {
        logForDebugging_2(`Error closing mux proxy server: ${error.message}`, {
          level: "error",
        });
      }),
    );
  if (httpProxyServer) closePromises.push(forceCloseHttpServer(httpProxyServer));
  if (socksProxyServer) {
    let socksClose = socksProxyServer.close().catch((error) => {
      logForDebugging_2(`Error closing SOCKS proxy server: ${error.message}`, {
        level: "error",
      });
    });
    closePromises.push(socksClose);
  }
  await Promise.all(closePromises);
  muxProxyServer = undefined;
  httpProxyServer = undefined;
  proxyAuthToken = undefined;
  socksProxyServer = undefined;
  managerContext = undefined;
  initializationPromise = undefined;
  parentProxy = undefined;
  resolvedAddressGuard = createResolvedAddressGuard();
  mitmCA = undefined;
  javaAgentJarPath = undefined;
  sentinelRegistry.clear();
  awsPairRegistry.clear();
  commandTextsByKey.clear();
  commandNetworkListsByKey.clear();
  maskedFileStore.dispose();
}
//@ chunk-qg41pqt6.js:851140-851164 esm-layout
function getSandboxViolationStore() {
  return sandboxViolationStore;
}
//@ chunk-qg41pqt6.js:851164-851362 esm-fingerprint
function annotateStderrWithSandboxFailures(command, stderr) {
  if (!config) return stderr;
  let violations = sandboxViolationStore.getViolationsForCommand(command);
  if (violations.length === 0) return stderr;
  let annotated = stderr;
  annotated += EOL + "<sandbox_violations>" + EOL;
  for (let violation of violations) annotated += violation.line + EOL;
  annotated += "</sandbox_violations>";
  return annotated;
}
//@ chunk-qg41pqt6.js:851362-851776 esm-fingerprint
function getLinuxGlobPatternWarnings() {
  if (getPlatform_2() !== "linux" || !config || config.filesystem.disabled) return [];
  let globPatterns = [];
  let allPaths = [...config.filesystem.allowWrite, ...config.filesystem.denyWrite];
  for (let path of allPaths) {
    if (typeof path !== "string") continue;
    let pathWithoutTrailingStar = removeTrailingGlobSuffix(path);
    if (containsGlobChars(pathWithoutTrailingStar)) globPatterns.push(path);
  }
  for (let path of [
    ...new Set([...config.filesystem.denyRead, ...getCredentialDenyReadPaths(config.credentials)]),
    ...(config.filesystem.allowRead ?? []),
  ]) {
    if (typeof path !== "string") continue;
    let baseDir = globPatternBaseDir(normalizePathForSandbox(path));
    if (containsGlobChars(removeTrailingGlobSuffix(path)) && globBaseDirIsRoot(baseDir))
      globPatterns.push(path);
  }
  return globPatterns;
}
//@ chunk-qg41pqt6.js:851776-852708 esm-fingerprint
var SandboxManager_2 = {
  initialize,
  isSupportedPlatform: isSupportedPlatform_2,
  isSandboxingEnabled: isSandboxingEnabled_2,
  checkDependencies,
  checkDependenciesAsync,
  getFsReadConfig,
  getFsWriteConfig,
  getNetworkRestrictionConfig,
  getAllowUnixSockets,
  getAllowLocalBinding,
  getAllowMachLookup,
  getIgnoreViolations,
  getEnableWeakerNestedSandbox,
  getProxyPort,
  getProxyAuthToken,
  getSocksProxyPort,
  getLinuxHttpSocketPath,
  getLinuxSocksSocketPath,
  waitForNetworkInitialization,
  wrapWithSandbox,
  wrapWithSandboxArgv: wrapWithSandboxArgv_2,
  registerCommandNetworkLists,
  unregisterCommandNetworkLists,
  askCallbackDenyReason: true,
  denyAllNetworkOption: true,
  cleanupAfterCommand,
  reset,
  getMitmCA: () => mitmCA,
  getWindowsProfileRead: () => windowsProfileRead,
  getWindowsProfileReadWarnings: () => [...windowsProfileReadWarnings],
  getSentinelRegistry: () => sentinelRegistry,
  getAwsPairRegistry: () => awsPairRegistry,
  getMaskedFileStore: () => maskedFileStore,
  getSandboxViolationStore,
  annotateStderrWithSandboxFailures,
  getLinuxGlobPatternWarnings,
  getConfig,
  updateConfig,
};
export { SandboxManager_2, listenInRange };
