/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (92)
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
import { createResolvedAddressGuard, ol } from "./resolved-address-guard.js";
import {
  missingWindowsSrtWinCapability,
  getWindowsProfileReadStatus,
  ax,
  revokeWindowsAclChecked,
  restoreWindowsAcl,
  WindowsSandboxError,
  resolveSrtWin,
  getWindowsSandboxUserStatusAsync,
  windowsSetupVersionMismatch,
  getWindowsProfileReadStatusAsync,
  ensurePersistentWindowsCa,
  windowsProfileExclusionConflicts,
  tI,
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
  DC,
  shouldIgnoreViolation,
  sanitizeDenialReason,
} from "./sandbox-violation-store.js";
import { SentinelRegistry } from "./credential-sentinel.js";
import { AwsPairRegistry, createSigv4Planner, registerAwsPairs } from "./credential-aws-pairs.js";
import { MaskedFileStore, buildMaskedFileBinds } from "./credential-mask-files.js";
import {
  ZE,
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
  ITt,
  getDefaultWritePaths,
  normalizePathForSandbox,
  removeTrailingGlobSuffix,
  containsGlobChars,
  walkGlobPatternSteps,
  finish,
  xwn,
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
import { hR } from "./http-proxy.js";
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
import { HR } from "./java-proxy-agent.js";
import { whichSync } from "../utils/which.js";
import { ownInstallWarning } from "./own-files.js";
import { B6r } from "./generate-seccomp-filter.js";
import { buildMaskedEnvVars } from "./credential-mask-env.js";
import { zE } from "./read-deny-glob.js";

//@ chunk-fq0cr76a.js:703099-703511 esm-fingerprint
function Mm(server, n, range, exclude) {
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
      n(range ? port : 0);
    };
    tryNext();
  });
}
//@ chunk-fq0cr76a.js:817984-818075 esm-layout
var config;
var configInstalls = 0;
var httpProxyServer;
var socksProxyServer;
var muxProxyServer;
var managerContext;
var initializationPromise;
var cleanupRegistered = false;
var ownInstallLogged = false;
var logMonitorShutdown;
var linuxMonitor;
var parentProxy;
var resolvedAddressGuard = createResolvedAddressGuard();
var mitmCA;
var javaAgentJarPath;
var proxyAuthToken;
var windowsFsStampedSet;
var windowsFsSbUserSid;
var windowsFsRawInputs;
var windowsWfpVerifiedFor;
var windowsWfpVerifiedLoopback;
var windowsCapableSrtWin = new Set();
//@ chunk-fq0cr76a.js:818075-818209 esm-fingerprint
function windowsSrtWinIdentity(srtWin) {
  let stat = "";
  try {
    let st = fsModule_2.statSync(srtWin.exe);
    stat = `${st.size}:${st.mtimeMs}`;
  } catch {}
  return JSON.stringify([srtWin.exe, srtWin.prependArgs, stat]);
}
//@ chunk-fq0cr76a.js:818209-818361 esm-layout
var WINDOWS_CAPABILITIES_WHY =
  "a session depends on (its read denies are written on the profile read grant's paths by srt-win, and kept grants are checked and removed there)";
//@ chunk-fq0cr76a.js:818361-818485 esm-fingerprint
function assertWindowsSrtWinCapable(srtWin) {
  let id = windowsSrtWinIdentity(srtWin);
  if (windowsCapableSrtWin.has(id)) return;
  let missing = missingWindowsSrtWinCapability(
    getWindowsProfileReadStatus({
      srtWin,
    }).capabilities,
  );
  if (missing !== undefined) throw ax(missing, WINDOWS_CAPABILITIES_WHY);
  windowsCapableSrtWin.add(id);
}
//@ chunk-fq0cr76a.js:818485-818498 esm-layout
var windowsProfileRead;
var windowsProfileReadWarnings = [];
//@ chunk-fq0cr76a.js:818498-821106 esm-layout
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
//@ chunk-fq0cr76a.js:821106-821153 esm-layout
var srtWinSpawn;
var sandboxViolationStore = new SandboxViolationStore();
var sentinelRegistry = new SentinelRegistry();
var awsPairRegistry = new AwsPairRegistry();
var maskedFileStore = new MaskedFileStore();
//@ chunk-fq0cr76a.js:821153-821535 esm-fingerprint
function registerCleanup() {
  if (cleanupRegistered) return;
  let cleanupHandler = () => {
    ZE();
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
//@ chunk-fq0cr76a.js:821535-821604 esm-fingerprint
var WINDOWS_ACL_RELEASE_OK = new Set(["revoked", "stillHeld", "restored", "alreadyOriginal"]);
//@ chunk-fq0cr76a.js:821604-821813 esm-fingerprint
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
//@ chunk-fq0cr76a.js:821813-822422 esm-fingerprint
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
//@ chunk-fq0cr76a.js:822422-822511 esm-fingerprint
function releaseWindowsSessionAcls(sandboxUserSid, srtWin) {
  let o = {
    sandboxUserSid,
    srtWin,
  };
  if (windowsAclRestoreAllowed(revokeWindowsAclChecked(o)))
    logWindowsAclOutcomes("deny restore", restoreWindowsAcl(o));
}
//@ chunk-fq0cr76a.js:822511-822534 esm-fingerprint
var MAX_COMMAND_TEXTS = 1024;
var commandTextsByKey = new Map();
//@ chunk-fq0cr76a.js:822534-822713 esm-fingerprint
function registerCommandText(command, options) {
  let key = decodeSandboxedCommand(encodeSandboxedCommand(ITt(command, options?.commandId)));
  let text = options?.commandText ?? command;
  commandTextsByKey.delete(key);
  commandTextsByKey.set(key, text);
  while (commandTextsByKey.size > MAX_COMMAND_TEXTS) {
    let oldest = commandTextsByKey.keys().next().value;
    if (oldest === undefined) break;
    commandTextsByKey.delete(oldest);
  }
}
//@ chunk-fq0cr76a.js:822713-822752 esm-layout
function resolveCommandText(decodedKey) {
  return commandTextsByKey.get(decodedKey) ?? DC(decodedKey);
}
//@ chunk-fq0cr76a.js:822752-822773 esm-layout
var MIN_NETWORK_LISTS_COMMAND_ID_LENGTH = 22;
var commandNetworkListsByKey = new Map();
//@ chunk-fq0cr76a.js:822773-823761 esm-fingerprint
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
//@ chunk-fq0cr76a.js:823761-823829 esm-fingerprint
function unregisterCommandNetworkLists(commandId) {
  if (typeof commandId !== "string") return;
  commandNetworkListsByKey.delete(decodeSandboxedCommand(encodeSandboxedCommand(commandId)));
}
//@ chunk-fq0cr76a.js:823829-823983 esm-fingerprint
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
//@ chunk-fq0cr76a.js:823983-824051 esm-fingerprint
function recordOutboundDeny(host, port, reason, encodedCommand) {
  recordProxyViolation(`deny network-outbound ${host}:${port} (${reason})`, encodedCommand);
}
//@ chunk-fq0cr76a.js:824051-824143 esm-fingerprint
var directLookup = (port, encodedCommand) => (hostname, options, callback) =>
  resolvedAddressGuard.lookupFor(port)(hostname, options, (err, address, family) => {
    if (ol(err)) recordOutboundDeny(hostname, port, err.reason, encodedCommand);
    callback(err, address, family);
  });
//@ chunk-fq0cr76a.js:824143-824223 esm-fingerprint
function redactUrlForViolation(url) {
  let cut = url.search(/[?#]/);
  return cut === -1 ? url : `${url.slice(0, cut + 1)}\u2026`;
}
//@ chunk-fq0cr76a.js:824223-824297 esm-fingerprint
function isDeclaredDenial(answer) {
  return answer === false || (typeof answer === "object" && answer !== null && answer.allow === false);
}
//@ chunk-fq0cr76a.js:824297-824435 esm-fingerprint
function denialReasonOf(answer) {
  if (typeof answer !== "object" || answer === null) return;
  let { allow, reason } = answer;
  if (allow !== false || typeof reason !== "string") return;
  return sanitizeDenialReason(reason) || undefined;
}
//@ chunk-fq0cr76a.js:824435-824582 esm-fingerprint
function deniedDomainReason(entry) {
  let reasons = config?.network.deniedDomainReasons ?? {};
  return (
    (Object.prototype.hasOwnProperty.call(reasons, entry) ? reasons[entry] : undefined) ??
    "host is on the deny list"
  );
}
//@ chunk-fq0cr76a.js:824582-825857 esm-fingerprint
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
//@ chunk-fq0cr76a.js:825857-825945 esm-fingerprint
function buildCredentialInjector() {
  if (!config?.credentials) return;
  return (headers, destHost) => {
    sentinelRegistry.substituteInHeaders(headers, destHost, matchesDomainPattern);
  };
}
//@ chunk-fq0cr76a.js:825945-826024 esm-fingerprint
function buildBodyCredentialInjector() {
  if (!config?.credentials) return;
  return (destHost) => sentinelRegistry.sentinelsForHost(destHost, matchesDomainPattern);
}
//@ chunk-fq0cr76a.js:826024-826125 esm-fingerprint
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
//@ chunk-fq0cr76a.js:826125-826318 esm-fingerprint
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
//@ chunk-fq0cr76a.js:826318-826824 esm-fingerprint
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
//@ chunk-fq0cr76a.js:826824-828584 esm-fingerprint
async function startMuxProxyServer(sandboxAskCallback, portRange) {
  let injectCredentials = buildCredentialInjector();
  let injectBodyCredentials = buildBodyCredentialInjector();
  httpProxyServer = hR({
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
  let backendPort = await mux.listenHttpBackend();
  await Mm(
    mux.server,
    (p) => mux.server.listen(p, "127.0.0.1"),
    portRange,
    backendPort !== undefined ? new Set([backendPort]) : new Set(),
  );
  let muxPort = mux.getPort();
  if (muxPort === undefined) throw Error("Failed to get mux proxy server port");
  mux.unref();
  logForDebugging_2(`Mux proxy (HTTP+SOCKS) listening on localhost:${muxPort}`);
  return muxPort;
}
//@ chunk-fq0cr76a.js:828584-828677 esm-layout
async function initialize(runtimeConfig, sandboxAskCallback, enableLogMonitor = false, options) {
  try {
    await initializeSteps(runtimeConfig, sandboxAskCallback, enableLogMonitor, options);
  } catch (error) {
    if (mitmCA) disposeMitmCASync(mitmCA);
    mitmCA = undefined;
    throw error;
  }
}
//@ chunk-fq0cr76a.js:828677-834600 esm-fingerprint
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
      if (missing !== undefined) throw ax(missing, WINDOWS_CAPABILITIES_WHY);
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
      await tI({
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
      javaAgentJarPath = (await HR(config.javaAgentJarPath)) ?? undefined;
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
//@ chunk-fq0cr76a.js:834600-834693 esm-fingerprint
function isSupportedPlatform_2() {
  let platform = getPlatform_2();
  if (platform === "linux") return getWslVersion() !== "1";
  return platform === "macos" || platform === "windows";
}
//@ chunk-fq0cr76a.js:834693-834726 esm-layout
function isSandboxingEnabled_2() {
  return config !== undefined;
}
//@ chunk-fq0cr76a.js:834726-835551 esm-fingerprint
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
//@ chunk-fq0cr76a.js:835551-835627 esm-fingerprint
function checkDependencies(ripgrepConfig) {
  let common = checkDependenciesCommon(ripgrepConfig);
  if ("done" in common) return common.done;
  return checkWindowsDependencies(common.windows);
}
//@ chunk-fq0cr76a.js:835627-835782 esm-fingerprint
async function checkDependenciesAsync(ripgrepConfig) {
  if (getPlatform_2() === "linux" && !config?.seccomp?.argv0) await B6r(config?.seccomp?.applyPath);
  let common = checkDependenciesCommon(ripgrepConfig);
  if ("done" in common) return common.done;
  return checkWindowsDependenciesAsync(common.windows);
}
//@ chunk-fq0cr76a.js:835782-836372 esm-fingerprint
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
//@ chunk-fq0cr76a.js:836372-836474 esm-fingerprint
function getCredentialDenyReadPaths(credentials) {
  let files = credentials?.files ?? [];
  return [...new Set(files.filter((f) => f.mode === "deny").map((f) => f.path))];
}
//@ chunk-fq0cr76a.js:836474-836605 esm-fingerprint
function defaultWritePathsUnder({ denyRead, allowRead, credentials }) {
  let underCredentialDenies = getDefaultWritePaths(
    readRulesOf([], undefined, getCredentialDenyReadPaths(credentials)),
  );
  return getDefaultWritePaths(readRulesOf(denyRead, allowRead, [])).filter((p) =>
    underCredentialDenies.includes(p),
  );
}
//@ chunk-fq0cr76a.js:836605-836793 esm-fingerprint
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
//@ chunk-fq0cr76a.js:836793-836979 esm-fingerprint
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
//@ chunk-fq0cr76a.js:836979-837153 esm-fingerprint
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
//@ chunk-fq0cr76a.js:837153-837304 esm-fingerprint
function* expandAllowReadGlob(pattern, anchor) {
  let expanded = (yield* walkGlobPatternSteps(pattern, {
    anchor,
  })).matches;
  logForDebugging_2(
    `[Sandbox] Expanded allowRead glob pattern "${pattern}" to ${expanded.length} paths on Linux`,
  );
  return expanded;
}
//@ chunk-fq0cr76a.js:837304-837728 esm-fingerprint
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
        zE(pattern, reExposedPaths, unlistableDenyDirs, {
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
//@ chunk-fq0cr76a.js:837728-838141 esm-fingerprint
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
  let e = stripWriteGlobs("allow", config.filesystem.allowWrite);
  let denyPaths = stripWriteGlobs("deny", config.filesystem.denyWrite);
  return {
    allowOnly: [
      ...defaultWritePathsUnder({
        denyRead: config.filesystem.denyRead,
        allowRead: config.filesystem.allowRead,
        credentials: config.credentials,
      }),
      ...e,
    ],
    denyWithinAllow: denyPaths,
    ...literalWriteLists(config.filesystem.allowWrite, config.filesystem.denyWrite),
  };
}
//@ chunk-fq0cr76a.js:838141-838516 esm-fingerprint
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
//@ chunk-fq0cr76a.js:838516-838605 esm-fingerprint
function windowsMaskedFileDenies(credentialRestrictions) {
  return [
    ...credentialRestrictions.maskedFileBinds.map((b) => b.realPath),
    ...credentialRestrictions.degradeToDenyPaths,
  ];
}
//@ chunk-fq0cr76a.js:838605-838847 esm-fingerprint
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
//@ chunk-fq0cr76a.js:838847-839040 esm-fingerprint
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
//@ chunk-fq0cr76a.js:839040-839088 esm-layout
function sameWindowsStampSet(newConfig) {
  return (
    windowsFsRawInputs !== undefined &&
    sameRawWindowsFsInputs(windowsFsRawInputs, rawWindowsFsInputs(newConfig))
  );
}
//@ chunk-fq0cr76a.js:839088-839489 esm-layout
function windowsLoopbackModeChanged(wanted, verified) {
  let mode = (open) => (open ? "open" : "closed");
  return `network.allowLocalBinding asks for loopback ${mode(wanted)}, but this session verified the network fence with loopback ${mode(verified)}. On Windows the loopback mode is fixed by the install and checked at initialize(): it cannot change for one command or through updateConfig(). Call reset() then initialize() with the new value; the installed mode must match it.`;
}
//@ chunk-fq0cr76a.js:839489-839632 esm-fingerprint
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
//@ chunk-fq0cr76a.js:839632-839683 esm-fingerprint
function getAllowUnixSockets() {
  return config?.network?.allowUnixSockets;
}
//@ chunk-fq0cr76a.js:839683-839737 esm-fingerprint
function getAllowAllUnixSockets() {
  return config?.network?.allowAllUnixSockets;
}
//@ chunk-fq0cr76a.js:839737-839789 esm-fingerprint
function getAllowLocalBinding() {
  return config?.network?.allowLocalBinding;
}
//@ chunk-fq0cr76a.js:839789-839839 esm-fingerprint
function getAllowMachLookup() {
  return config?.network?.allowMachLookup;
}
//@ chunk-fq0cr76a.js:839839-839881 esm-fingerprint
function getIgnoreViolations() {
  return config?.ignoreViolations;
}
//@ chunk-fq0cr76a.js:839881-839932 esm-fingerprint
function getEnableWeakerNestedSandbox() {
  return config?.enableWeakerNestedSandbox;
}
//@ chunk-fq0cr76a.js:839932-839986 esm-fingerprint
function getEnableWeakerNetworkIsolation() {
  return config?.enableWeakerNetworkIsolation;
}
//@ chunk-fq0cr76a.js:839986-840028 esm-fingerprint
function getAllowAppleEvents() {
  return config?.allowAppleEvents;
}
//@ chunk-fq0cr76a.js:840028-840077 esm-fingerprint
function getRipgrepConfig() {
  return (
    config?.ripgrep ?? {
      command: "rg",
    }
  );
}
//@ chunk-fq0cr76a.js:840077-840130 esm-fingerprint
function getMandatoryDenySearchDepth() {
  return config?.mandatoryDenySearchDepth ?? 3;
}
//@ chunk-fq0cr76a.js:840130-840186 esm-fingerprint
function getAllowGitConfig() {
  return config?.filesystem?.allowGitConfig ?? false;
}
//@ chunk-fq0cr76a.js:840186-840272 esm-fingerprint
function getGitSafeDirectories(customConfig) {
  return [...(config?.git?.safeDirectories ?? []), ...(customConfig?.git?.safeDirectories ?? [])];
}
//@ chunk-fq0cr76a.js:840272-840305 esm-fingerprint
function getSeccompConfig() {
  return config?.seccomp;
}
//@ chunk-fq0cr76a.js:840305-840329 esm-layout
function getProxyAuthToken() {
  return proxyAuthToken;
}
//@ chunk-fq0cr76a.js:840329-840368 esm-fingerprint
function getProxyPort() {
  return managerContext?.httpProxyPort;
}
//@ chunk-fq0cr76a.js:840368-840408 esm-fingerprint
function getSocksProxyPort() {
  return managerContext?.socksProxyPort;
}
//@ chunk-fq0cr76a.js:840408-840461 esm-fingerprint
function getLinuxHttpSocketPath() {
  return managerContext?.linuxBridge?.httpSocketPath;
}
//@ chunk-fq0cr76a.js:840461-840515 esm-fingerprint
function getLinuxSocksSocketPath() {
  return managerContext?.linuxBridge?.socksSocketPath;
}
//@ chunk-fq0cr76a.js:840515-840614 esm-layout
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
//@ chunk-fq0cr76a.js:840614-840657 esm-layout
var RESTARTS_IN_TURNS = 2;
var REPLACED = Symbol("replaced");
var walking = false;
var waitingToWalk = [];
//@ chunk-fq0cr76a.js:840657-840963 esm-fingerprint
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
//@ chunk-fq0cr76a.js:840963-841015 esm-layout
async function wrapWithSandbox(command, binShell, customConfig, abortSignal, options) {
  return wrapWithSandboxAgain(0, command, binShell, customConfig, abortSignal, options);
}
//@ chunk-fq0cr76a.js:841015-841112 esm-layout
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
//@ chunk-fq0cr76a.js:841112-844848 esm-fingerprint
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
  let startedIn = xwn();
  let movedOn = () => config !== startedWith || configInstalls !== startedAt || xwn() !== startedIn;
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
          zE(pattern, reExposedPaths, unlistableDenyDirs, {
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
  let Se =
    customConfig?.network?.allowedDomains !== undefined || config?.network?.allowedDomains !== undefined;
  let ue = options?.denyAllNetwork === true;
  let needsNetworkRestriction = Se || ue;
  let needsNetworkProxy = Se && !ue;
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
        allowUnixSockets: ue ? undefined : getAllowUnixSockets(),
        allowAllUnixSockets: ue ? false : getAllowAllUnixSockets(),
        allowLocalBinding: ue ? false : getAllowLocalBinding(),
        allowMachLookup: ue ? undefined : getAllowMachLookup(),
        ignoreViolations: getIgnoreViolations(),
        allowPty,
        allowGitConfig: getAllowGitConfig(),
        gitSafeDirectories,
        enableWeakerNetworkIsolation: ue ? false : getEnableWeakerNetworkIsolation(),
        allowAppleEvents: ue ? false : getAllowAppleEvents(),
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
        enableWeakerNestedSandbox: ue ? false : getEnableWeakerNestedSandbox(),
        allowNestedUserNamespaces,
        allowAllUnixSockets: ue ? false : getAllowAllUnixSockets(),
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
//@ chunk-fq0cr76a.js:844848-846802 esm-fingerprint
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
//@ chunk-fq0cr76a.js:846802-846826 esm-layout
function getConfig() {
  return config;
}
//@ chunk-fq0cr76a.js:846826-847521 esm-fingerprint
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
//@ chunk-fq0cr76a.js:847521-847540 esm-layout
function cleanupAfterCommand() {
  cleanupBwrapMountPoints();
}
//@ chunk-fq0cr76a.js:847540-847552 esm-fingerprint
var BRIDGE_EXIT_TIMEOUT_MS = 1500;
//@ chunk-fq0cr76a.js:847552-848167 esm-fingerprint
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
//@ chunk-fq0cr76a.js:848167-848409 esm-fingerprint
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
//@ chunk-fq0cr76a.js:848409-849445 esm-fingerprint
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
//@ chunk-fq0cr76a.js:849445-849469 esm-layout
function getSandboxViolationStore() {
  return sandboxViolationStore;
}
//@ chunk-fq0cr76a.js:849469-849667 esm-fingerprint
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
//@ chunk-fq0cr76a.js:849667-850081 esm-fingerprint
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
//@ chunk-fq0cr76a.js:850081-851013 esm-fingerprint
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
export { SandboxManager_2, Mm };
