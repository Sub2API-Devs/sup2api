/**
 * utils/sessionNameUniqueness.ts
 *
 * 2.1.316 新增。恢复会话时重新声明会话名；名字被本机其他活会话占用时改名并通知通信过的会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-metqe8pz.js (27)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { slugifySessionName } from "./sessionAddresses.js";
import { randomWordSlug, isWordSlug } from "./words.js";
import { truncateToLength, sanitizeSessionTitle } from "./stringUtils.js";
import { MAX_SEED_NAME_CHARS } from "./swarm/teammateIds.js";
import { createSignal } from "./signal.js";
import { parseAddress, mayBeSamePath } from "./peerAddress.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getSessionId } from "../bootstrap/state.js";
import {
  getRegisteredSessionName,
  whenSessionRegistered,
  getSessionRegistryState,
  updateSessionName,
} from "./concurrentSessions.js";
import { listAllLiveSessions, sendToUdsSocket, ownMessagingSocket } from "./udsMessaging/udsClient.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logForDebugging } from "./debug.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { errorMessage, getErrnoCode } from "./errors.js";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { fragmentForLog } from "./udsMessaging/peerGuard.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-metqe8pz.js:698-712 placement
var MAX_NAME_SUFFIX_LENGTH = 16;
var MAX_SESSION_NAME_LENGTH = 64;
//@ chunk-metqe8pz.js:712-867 placement
/**
 * 哪个会话先启动
 */
function startedEarlier(a, b) {
  if (a.startedAt !== b.startedAt) return a.startedAt < b.startedAt;
  let procStart = a.procStart ?? "";
  let procStart_2 = b.procStart ?? "";
  if (procStart !== procStart_2) return procStart < procStart_2;
  return a.pid < b.pid;
}
//@ chunk-metqe8pz.js:867-972 placement
function otherSessionsNamed(slug, live, pid) {
  return live.filter(
    (session) =>
      session.pid !== pid &&
      session.name !== undefined &&
      session.procStart !== undefined &&
      slugifySessionName(session.name) === slug,
  );
}
//@ chunk-metqe8pz.js:972-1050 placement
function liveNameSet(live) {
  return new Set(
    live.flatMap((session) => (session.name === undefined ? [] : [slugifySessionName(session.name)])),
  );
}
//@ chunk-metqe8pz.js:1050-1240 placement
/**
 * 生成不冲突的带后缀名字
 */
function pickUniqueSuffixName(suffixBase, taken, slug = randomWordSlug) {
  let buildName = (suffix) =>
    `${truncateToLength(suffixBase, MAX_SEED_NAME_CHARS - suffix.length - 1)}-${suffix}`;
  for (let j = 0; j < MAX_NAME_SUFFIX_LENGTH; j++) {
    let candidate = buildName(slug());
    if (!taken.has(slugifySessionName(candidate))) return candidate;
  }
  for (let j = 2; ; j++) {
    let candidate = buildName(`${slug()}-${j}`);
    if (!taken.has(slugifySessionName(candidate))) return candidate;
  }
}
//@ chunk-metqe8pz.js:1240-1618 placement
/**
 * 判定保留、改名或让出会话名
 */
function decideSessionName(request) {
  let { desiredName, self: selfSession, live, moment, slug } = request;
  let suffixBase = request.suffixBase ?? desiredName;
  let desiredSlug = slugifySessionName(desiredName);
  if (!desiredSlug)
    return {
      kind: "keep",
    };
  let holders = otherSessionsNamed(desiredSlug, live, selfSession.pid);
  let blockers =
    moment === "rename"
      ? holders
      : moment === "startup"
        ? holders.filter((holder) => startedEarlier(holder, selfSession))
        : holders.filter((holder) =>
            startedEarlier(
              {
                ...holder,
                startedAt: holder.nameSince ?? holder.startedAt,
              },
              {
                ...selfSession,
                startedAt: selfSession.nameSince ?? selfSession.startedAt,
              },
            ),
          );
  if (blockers.length === 0)
    return {
      kind: "keep",
    };
  return {
    kind: "yield",
    newName: pickUniqueSuffixName(suffixBase, liveNameSet(live), slug),
    holders: blockers,
  };
}
//@ chunk-metqe8pz.js:1618-2246 placement
/**
 * 会话命名状态
 */
class SessionNamingState {
  correspondents = new Map();
  senderMode = null;
  userTypedName = undefined;
  hasAdopter = false;
  lastYield = undefined;
  yielded = createSignal();
  pendingYield = undefined;
  noteCorrespondent(address, pid, procStart) {
    if (!address || parseAddress(address).scheme !== "uds") return;
    this.correspondents.delete(address);
    this.correspondents.set(address, {
      pid,
      procStart,
    });
    if (this.correspondents.size > MAX_SESSION_NAME_LENGTH) {
      let oldest = this.correspondents.keys().next().value;
      if (oldest !== undefined) this.correspondents.delete(oldest);
    }
  }
  announceYield(name, previousName) {
    this.pendingYield = [name, previousName];
    this.yielded.emit(name, previousName);
  }
  reset() {
    this.correspondents.clear();
    this.lastYield = undefined;
    this.yielded.clear();
    this.pendingYield = undefined;
    this.senderMode = null;
    this.userTypedName = undefined;
    this.hasAdopter = false;
  }
}
//@ chunk-metqe8pz.js:2246-2269 placement
var sessionNamingStateSlot; // deferred: uses SessionNamingState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-metqe8pz.js:2246", () => {
  sessionNamingStateSlot = new HostScoped(() => new SessionNamingState());
});
//@ chunk-metqe8pz.js:2269-2305 placement
function getSessionNamingState() {
  return sessionNamingStateSlot.of(getRootSession().host);
}
//@ chunk-metqe8pz.js:2305-2437 placement
function getUserTypedSessionName() {
  let registeredSessionName = getRegisteredSessionName();
  return registeredSessionName !== undefined &&
    (registeredSessionName.source === "user" || registeredSessionName.source === "collision") &&
    getSessionNamingState().userTypedName === registeredSessionName.name
    ? registeredSessionName.name
    : undefined;
}
//@ chunk-metqe8pz.js:2437-2487 placement
function noteVettedCorrespondent(from, verifiedPeerPid, verifiedPeerProcStart) {
  getSessionNamingState().noteCorrespondent(from, verifiedPeerPid, verifiedPeerProcStart);
}
//@ chunk-metqe8pz.js:2487-2561 placement
function takePendingYield() {
  let sessionNamingState = getSessionNamingState();
  let pendingYield = sessionNamingState.pendingYield;
  sessionNamingState.pendingYield = undefined;
  return pendingYield;
}
//@ chunk-metqe8pz.js:2561-2601 placement
var sessionNamingProviders = {
  whenRegistered: whenSessionRegistered,
  listLive: listAllLiveSessions,
};
//@ chunk-metqe8pz.js:2601-2659 placement
function sessionNameUniquenessEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_session_name_uniqueness", true);
}
//@ chunk-metqe8pz.js:2659-3494 placement
async function claimUniqueSessionName(
  desiredName,
  moment,
  deps = sessionNamingProviders,
  suffixBase = desiredName,
) {
  if (!sessionNameUniquenessEnabled())
    return {
      name: desiredName,
      yielded: false,
    };
  suffixBase = baseNameOfSuffixed(suffixBase) ?? suffixBase;
  if (!(await deps.whenRegistered()))
    return {
      name: desiredName,
      yielded: false,
    };
  try {
    let sessionId = getSessionId();
    let filtered = (await deps.listLive()).filter(
      (session) => session.pid === process.pid || session.sessionId !== sessionId,
    );
    let session = filtered.find((session) => session.pid === process.pid);
    if (!session)
      return {
        name: desiredName,
        yielded: false,
      };
    let decision = decideSessionName({
      desiredName,
      self: session,
      live: filtered,
      moment,
      slug: deps.slug,
      suffixBase,
    });
    if (decision.kind === "keep")
      return {
        name: desiredName,
        yielded: false,
      };
    let derivedName = derivedNameMatch(desiredName, session);
    let finalName =
      sanitizeSessionTitle(
        derivedName !== undefined && slugifySessionName(derivedName) !== slugifySessionName(desiredName)
          ? derivedName
          : decision.newName,
      ) || decision.newName;
    logForDebugging(
      `[session-name] "${desiredName}" is held by live pid ${decision.holders[0]?.pid}; this session takes "${finalName}"`,
      {
        level: "info",
      },
    );
    logFeatureOk("session_name_collision");
    getSessionNamingState().lastYield = {
      base: slugifySessionName(suffixBase),
      name: finalName,
    };
    return {
      name: finalName,
      yielded: true,
    };
  } catch (error) {
    logForDebugging(
      `[session-name] uniqueness check failed, keeping "${desiredName}": ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    logFeatureBad("session_name_collision", "check_failed");
    return {
      name: desiredName,
      yielded: false,
    };
  }
}
//@ chunk-metqe8pz.js:3494-3721 placement
/**
 * 是否为派生名
 */
function derivedNameMatch(desiredName, session) {
  let matched = settledYieldFor(desiredName, session.name);
  if (matched !== undefined) return matched;
  let registered = session.name;
  let split = registered === undefined ? undefined : splitNameSuffix(registered);
  if (registered === undefined || split === undefined) return;
  let base = baseNameOfSuffixed(desiredName) ?? desiredName;
  let truncated = truncateToLength(base, MAX_SEED_NAME_CHARS - split.suffix.length - 1);
  return split.base.toLowerCase() === truncated.toLowerCase() ? registered : undefined;
}
//@ chunk-metqe8pz.js:3721-3913 placement
/**
 * 拆出名字后缀
 */
function splitNameSuffix(name) {
  let match = /-([a-z]+-[a-z]+)(-\d{1,4})?$/i.exec(name);
  if (!match || !isWordSlug(match[1].toLowerCase())) return;
  let sliced = name.slice(0, name.length - match[0].length);
  return sliced.length > 0
    ? {
        base: sliced,
        suffix: match[0].slice(1),
      }
    : undefined;
}
//@ chunk-metqe8pz.js:3913-4052 placement
function settledYieldFor(desiredName, name) {
  if (!sessionNameUniquenessEnabled()) return;
  let lastYield = getSessionNamingState().lastYield;
  let base = baseNameOfSuffixed(desiredName) ?? desiredName;
  return lastYield !== undefined &&
    name !== undefined &&
    slugifySessionName(lastYield.name) === slugifySessionName(name) &&
    lastYield.base === slugifySessionName(base)
    ? name
    : undefined;
}
//@ chunk-metqe8pz.js:4052-4115 placement
function isRegisteredSessionName(name) {
  let registeredSessionName = getRegisteredSessionName();
  return (
    registeredSessionName !== undefined &&
    slugifySessionName(registeredSessionName.name) === slugifySessionName(name)
  );
}
//@ chunk-metqe8pz.js:4115-4147 placement
function baseNameOfSuffixed(name) {
  return splitNameSuffix(name)?.base;
}
//@ chunk-metqe8pz.js:4147-4158 placement
var SESSION_NAME_REGISTRY_TTL_MS = 3000;
//@ chunk-metqe8pz.js:4158-4196 placement
function _(fn) {
  setTimeout(fn, SESSION_NAME_REGISTRY_TTL_MS).unref();
}
//@ chunk-metqe8pz.js:4196-4763 placement
async function claimSessionNameAtStartup(request) {
  let { sessionNameArg, interactive, writeName, onRenamed, deps } = request;
  let scheduleRecheck = request.scheduleRecheck ?? _;
  if (sessionNameArg && interactive) getSessionNamingState().userTypedName = sessionNameArg;
  if (sessionNameArg) await writeName(sessionNameArg, request.sessionNameArgSource ?? "user");
  let registeredSessionName = getRegisteredSessionName();
  if (!interactive || !registeredSessionName || registeredSessionName.source === "derived") return;
  let check = async (suffixBase, recheck, suffixBase_2 = suffixBase) => {
    if (recheck && !isRegisteredSessionName(suffixBase)) return;
    let claim = await claimUniqueSessionName(suffixBase, recheck ? "recheck" : "startup", deps, suffixBase_2);
    if (!isRegisteredSessionName(suffixBase)) return;
    if (!claim.yielded) {
      if (!recheck) scheduleRecheck(() => void check(suffixBase, true));
      return;
    }
    if (getSessionNamingState().userTypedName === suffixBase)
      getSessionNamingState().userTypedName = claim.name;
    await writeName(claim.name, "collision");
    onRenamed?.(claim.name, suffixBase);
    getSessionNamingState().announceYield(claim.name, suffixBase);
    if (!recheck) scheduleRecheck(() => void check(claim.name, true, suffixBase));
  };
  await check(registeredSessionName.name, false);
}
//@ chunk-metqe8pz.js:4763-5020 placement
function scheduleSettledRecheck(request) {
  let { name, onYield, deps } = request;
  let suffixBase = request.suffixBase ?? name;
  (request.scheduleRecheck ?? _)(() => {
    (async () => {
      if (!isRegisteredSessionName(name)) return;
      let claim = await claimUniqueSessionName(name, "recheck", deps, suffixBase);
      if (!claim.yielded || !isRegisteredSessionName(name)) return;
      if (getSessionNamingState().userTypedName === name) getSessionNamingState().userTypedName = claim.name;
      await onYield(claim.name, name);
    })();
  });
}
//@ chunk-metqe8pz.js:5020-5264 placement
function renameSupersededDuringScan(registeredSessionName, baseName, name) {
  let registeredSessionName_2 = getRegisteredSessionName();
  if (
    registeredSessionName_2 === undefined ||
    registeredSessionName_2.source === "derived" ||
    registeredSessionName_2.source === "auto"
  )
    return;
  if (
    registeredSessionName_2.source === "collision" &&
    settledYieldFor(registeredSessionName?.name ?? baseName, registeredSessionName_2.name) !== undefined
  )
    return;
  let registeredSlug = slugifySessionName(registeredSessionName_2.name);
  if (
    (registeredSessionName !== undefined &&
      registeredSlug === slugifySessionName(registeredSessionName.name)) ||
    registeredSlug === slugifySessionName(baseName) ||
    registeredSlug === slugifySessionName(name)
  )
    return;
  return registeredSessionName_2;
}
//@ chunk-metqe8pz.js:5264-6238 placement
/**
 * 恢复会话时重新声明会话名；名字被本机其他活会话占用时改名并通知通信过的会话。
 */
async function reclaimSessionNameOnResume(title, storageV5, options = {}) {
  let deps = options.deps ?? sessionNamingProviders;
  let sanitizedTitle = title ? sanitizeSessionTitle(title) : "";
  if (!sanitizedTitle) return;
  let sessionRegistryState = getSessionRegistryState();
  let adoptions = sessionRegistryState.adoptions;
  let restoreSeq = ++sessionRegistryState.restores;
  let stillCurrent = () =>
    sessionRegistryState.adoptions === adoptions &&
    (!options.yieldToLaterRestore || sessionRegistryState.restores === restoreSeq);
  if (!(await deps.whenRegistered()) || !stillCurrent()) return;
  if (options.keepLaunchName && getRegisteredSessionName()?.givenAtLaunch) return;
  if (options.autoOnly) {
    await updateSessionName(sanitizedTitle, storageV5, "auto");
    return;
  }
  let registeredSessionName = getRegisteredSessionName();
  if (
    registeredSessionName !== undefined &&
    registeredSessionName.source !== "auto" &&
    registeredSessionName.source !== "derived" &&
    slugifySessionName(registeredSessionName.name) === slugifySessionName(sanitizedTitle)
  )
    return;
  let claim = await claimUniqueSessionName(sanitizedTitle, "rename", deps);
  if (!stillCurrent() || renameSupersededDuringScan(registeredSessionName, sanitizedTitle, claim.name))
    return;
  let registeredSessionName_2 = getRegisteredSessionName();
  if (
    options.source === "auto" &&
    registeredSessionName_2 !== undefined &&
    registeredSessionName_2.source !== "derived" &&
    (registeredSessionName_2.name !== registeredSessionName?.name ||
      registeredSessionName_2.source !== registeredSessionName.source)
  )
    return;
  let source = options.source === "auto" ? "auto" : "collision";
  let onYield = async (newName, previousName) => {
    if (source === "auto" && getRegisteredSessionName()?.source !== "auto") return;
    await updateSessionName(newName, storageV5, source);
    getSessionNamingState().announceYield(newName, previousName);
  };
  if (!claim.yielded) {
    await updateSessionName(sanitizedTitle, storageV5, options.source);
    scheduleSettledRecheck({
      name: sanitizedTitle,
      deps,
      onYield,
    });
    return;
  }
  await updateSessionName(claim.name, storageV5, source);
  if (getSessionNamingState().userTypedName === sanitizedTitle)
    getSessionNamingState().userTypedName = claim.name;
  scheduleSettledRecheck({
    name: claim.name,
    suffixBase: sanitizedTitle,
    deps,
    onYield,
  });
  if (claim.name === registeredSessionName?.name) return;
  getSessionNamingState().announceYield(claim.name, sanitizedTitle);
}
//@ chunk-metqe8pz.js:6238-7059 placement
async function notifyCorrespondentsOfRename(
  formerName,
  newName,
  contested,
  storageV5,
  send = sendToUdsSocket,
  listLive = sessionNamingProviders.listLive,
) {
  if (
    !sessionNameUniquenessEnabled() ||
    !isCrossSessionMessagingEnabled() ||
    getSessionNamingState().correspondents.size === 0
  )
    return;
  let ownSock = ownMessagingSocket();
  let [oldTitle, newTitle, contestedTitle] = [formerName, newName, contested].map(sanitizeSessionTitle);
  let message = `This session was renamed from "${oldTitle}" to "${newTitle}" ("${contestedTitle}" is held by another live session on this machine). Address this one as "${newTitle}" from now on.`;
  let socksByPid;
  try {
    socksByPid = new Map((await listLive(storageV5)).map((session) => [session.pid, session.sock]));
  } catch (error) {
    logForDebugging(
      `[session-name] rename notice skipped: registry unreadable (${getErrnoCode(error) ?? errorMessage(error)})`,
    );
    return;
  }
  await Promise.all(
    [...getSessionNamingState().correspondents].map(async ([address, { pid, procStart }]) => {
      let { scheme, target } = parseAddress(address);
      if (
        scheme !== "uds" ||
        !target ||
        (ownSock !== undefined && mayBeSamePath(target, ownSock)) ||
        socksByPid.get(pid) !== target
      )
        return;
      try {
        await send(
          target,
          message,
          storageV5,
          newTitle,
          undefined,
          undefined,
          getSessionNamingState().senderMode?.(),
          {
            trackReceipts: false,
            expectPeerPid: pid,
            ...(procStart !== undefined && {
              expectPeerProcStart: procStart,
            }),
          },
        );
      } catch (error) {
        logForDebugging(
          `[session-name] rename notice to ${fragmentForLog(address)} failed: ${getErrnoCode(error) ?? "send error"}`,
        );
      }
    }),
  );
}
export {
  settledYieldFor,
  getUserTypedSessionName,
  reclaimSessionNameOnResume,
  getSessionNamingState,
  claimUniqueSessionName,
  renameSupersededDuringScan,
  scheduleSettledRecheck,
  notifyCorrespondentsOfRename,
  claimSessionNameAtStartup,
  takePendingYield,
  noteVettedCorrespondent,
};
