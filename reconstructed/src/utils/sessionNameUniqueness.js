/**
 * utils/sessionNameUniqueness.ts
 *
 * 2.1.316 新增。恢复会话时重新声明会话名；名字被本机其他活会话占用时改名并通知通信过的会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-897ngh1d.js (27)
 * attribution: placement 27
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

//@ chunk-897ngh1d.js:699-713 placement
var MAX_NAME_SUFFIX_LENGTH = 16;
var MAX_SESSION_NAME_LENGTH = 64;
//@ chunk-897ngh1d.js:713-868 placement
/**
 * 哪个会话先启动
 */
function startedEarlier(e, n) {
  if (e.startedAt !== n.startedAt) return e.startedAt < n.startedAt;
  let procStart = e.procStart ?? "";
  let procStart_2 = n.procStart ?? "";
  if (procStart !== procStart_2) return procStart < procStart_2;
  return e.pid < n.pid;
}
//@ chunk-897ngh1d.js:868-973 placement
function otherSessionsNamed(e, live, pid) {
  return live.filter(
    (i) =>
      i.pid !== pid && i.name !== undefined && i.procStart !== undefined && slugifySessionName(i.name) === e,
  );
}
//@ chunk-897ngh1d.js:973-1051 placement
function liveNameSet(live) {
  return new Set(live.flatMap((n) => (n.name === undefined ? [] : [slugifySessionName(n.name)])));
}
//@ chunk-897ngh1d.js:1051-1242 placement
/**
 * 生成不冲突的带后缀名字
 */
function pickUniqueSuffixName(suffixBase, n, slug = randomWordSlug) {
  let i = (r) => `${truncateToLength(suffixBase, MAX_SEED_NAME_CHARS - r.length - 1)}-${r}`;
  for (let j = 0; j < MAX_NAME_SUFFIX_LENGTH; j++) {
    let u = i(slug());
    if (!n.has(slugifySessionName(u))) return u;
  }
  for (let j = 2; ; j++) {
    let u = i(`${slug()}-${j}`);
    if (!n.has(slugifySessionName(u))) return u;
  }
}
//@ chunk-897ngh1d.js:1242-1620 placement
/**
 * 判定保留、改名或让出会话名
 */
function decideSessionName(e) {
  let { desiredName, self: s, live, moment, slug } = e;
  let suffixBase = e.suffixBase ?? desiredName;
  let p = slugifySessionName(desiredName);
  if (!p)
    return {
      kind: "keep",
    };
  let f = otherSessionsNamed(p, live, s.pid);
  let o =
    moment === "rename"
      ? f
      : moment === "startup"
        ? f.filter((a) => startedEarlier(a, s))
        : f.filter((a) =>
            startedEarlier(
              {
                ...a,
                startedAt: a.nameSince ?? a.startedAt,
              },
              {
                ...s,
                startedAt: s.nameSince ?? s.startedAt,
              },
            ),
          );
  if (o.length === 0)
    return {
      kind: "keep",
    };
  return {
    kind: "yield",
    newName: pickUniqueSuffixName(suffixBase, liveNameSet(live), slug),
    holders: o,
  };
}
//@ chunk-897ngh1d.js:1620-2248 placement
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
  noteCorrespondent(e, pid, procStart) {
    if (!e || parseAddress(e).scheme !== "uds") return;
    this.correspondents.delete(e);
    this.correspondents.set(e, {
      pid,
      procStart,
    });
    if (this.correspondents.size > MAX_SESSION_NAME_LENGTH) {
      let i = this.correspondents.keys().next().value;
      if (i !== undefined) this.correspondents.delete(i);
    }
  }
  announceYield(e, n) {
    this.pendingYield = [e, n];
    this.yielded.emit(e, n);
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
//@ chunk-897ngh1d.js:2248-2271 placement
var sessionNamingStateSlot = new HostScoped(() => new SessionNamingState());
//@ chunk-897ngh1d.js:2271-2307 placement
function getSessionNamingState() {
  return sessionNamingStateSlot.of(getRootSession().host);
}
//@ chunk-897ngh1d.js:2307-2439 placement
function getUserTypedSessionName() {
  let registeredSessionName = getRegisteredSessionName();
  return registeredSessionName !== undefined &&
    (registeredSessionName.source === "user" || registeredSessionName.source === "collision") &&
    getSessionNamingState().userTypedName === registeredSessionName.name
    ? registeredSessionName.name
    : undefined;
}
//@ chunk-897ngh1d.js:2439-2489 placement
function noteVettedCorrespondent(from, verifiedPeerPid, verifiedPeerProcStart) {
  getSessionNamingState().noteCorrespondent(from, verifiedPeerPid, verifiedPeerProcStart);
}
//@ chunk-897ngh1d.js:2489-2563 placement
function takePendingYield() {
  let sessionNamingState = getSessionNamingState();
  let pendingYield = sessionNamingState.pendingYield;
  sessionNamingState.pendingYield = undefined;
  return pendingYield;
}
//@ chunk-897ngh1d.js:2563-2603 placement
var sessionNamingProviders = {
  whenRegistered: whenSessionRegistered,
  listLive: listAllLiveSessions,
};
//@ chunk-897ngh1d.js:2603-2661 placement
function sessionNameUniquenessEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_session_name_uniqueness", true);
}
//@ chunk-897ngh1d.js:2661-3496 placement
async function claimUniqueSessionName(e, moment, deps = sessionNamingProviders, i = e) {
  if (!sessionNameUniquenessEnabled())
    return {
      name: e,
      yielded: false,
    };
  i = baseNameOfSuffixed(i) ?? i;
  if (!(await deps.whenRegistered()))
    return {
      name: e,
      yielded: false,
    };
  try {
    let sessionId = getSessionId();
    let filtered = (await deps.listLive()).filter((a) => a.pid === process.pid || a.sessionId !== sessionId);
    let found = filtered.find((a) => a.pid === process.pid);
    if (!found)
      return {
        name: e,
        yielded: false,
      };
    let p = decideSessionName({
      desiredName: e,
      self: found,
      live: filtered,
      moment,
      slug: deps.slug,
      suffixBase: i,
    });
    if (p.kind === "keep")
      return {
        name: e,
        yielded: false,
      };
    let f = derivedNameMatch(e, found);
    let o =
      sanitizeSessionTitle(
        f !== undefined && slugifySessionName(f) !== slugifySessionName(e) ? f : p.newName,
      ) || p.newName;
    logForDebugging(
      `[session-name] "${e}" is held by live pid ${p.holders[0]?.pid}; this session takes "${o}"`,
      {
        level: "info",
      },
    );
    logFeatureOk("session_name_collision");
    getSessionNamingState().lastYield = {
      base: slugifySessionName(i),
      name: o,
    };
    return {
      name: o,
      yielded: true,
    };
  } catch (error) {
    logForDebugging(`[session-name] uniqueness check failed, keeping "${e}": ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureBad("session_name_collision", "check_failed");
    return {
      name: e,
      yielded: false,
    };
  }
}
//@ chunk-897ngh1d.js:3496-3724 placement
/**
 * 是否为派生名
 */
function derivedNameMatch(e, n) {
  let s = settledYieldFor(e, n.name);
  if (s !== undefined) return s;
  let i = n.name;
  let r = i === undefined ? undefined : splitNameSuffix(i);
  if (i === undefined || r === undefined) return;
  let u = baseNameOfSuffixed(e) ?? e;
  let c = truncateToLength(u, MAX_SEED_NAME_CHARS - r.suffix.length - 1);
  return r.base.toLowerCase() === c.toLowerCase() ? i : undefined;
}
//@ chunk-897ngh1d.js:3724-3916 placement
/**
 * 拆出名字后缀
 */
function splitNameSuffix(e) {
  let match = /-([a-z]+-[a-z]+)(-\d{1,4})?$/i.exec(e);
  if (!match || !isWordSlug(match[1].toLowerCase())) return;
  let sliced = e.slice(0, e.length - match[0].length);
  return sliced.length > 0
    ? {
        base: sliced,
        suffix: match[0].slice(1),
      }
    : undefined;
}
//@ chunk-897ngh1d.js:3916-4055 placement
function settledYieldFor(e, name) {
  if (!sessionNameUniquenessEnabled()) return;
  let lastYield = getSessionNamingState().lastYield;
  let i = baseNameOfSuffixed(e) ?? e;
  return lastYield !== undefined &&
    name !== undefined &&
    slugifySessionName(lastYield.name) === slugifySessionName(name) &&
    lastYield.base === slugifySessionName(i)
    ? name
    : undefined;
}
//@ chunk-897ngh1d.js:4055-4118 placement
function isRegisteredSessionName(e) {
  let registeredSessionName = getRegisteredSessionName();
  return (
    registeredSessionName !== undefined &&
    slugifySessionName(registeredSessionName.name) === slugifySessionName(e)
  );
}
//@ chunk-897ngh1d.js:4118-4150 placement
function baseNameOfSuffixed(e) {
  return splitNameSuffix(e)?.base;
}
//@ chunk-897ngh1d.js:4150-4161 placement
var SESSION_NAME_REGISTRY_TTL_MS = 3000;
//@ chunk-897ngh1d.js:4161-4199 placement
function _(e) {
  setTimeout(e, SESSION_NAME_REGISTRY_TTL_MS).unref();
}
//@ chunk-897ngh1d.js:4199-4766 placement
async function claimSessionNameAtStartup(e) {
  let { sessionNameArg, interactive, writeName, onRenamed, deps } = e;
  let scheduleRecheck = e.scheduleRecheck ?? _;
  if (sessionNameArg && interactive) getSessionNamingState().userTypedName = sessionNameArg;
  if (sessionNameArg) await writeName(sessionNameArg, e.sessionNameArgSource ?? "user");
  let registeredSessionName = getRegisteredSessionName();
  if (!interactive || !registeredSessionName || registeredSessionName.source === "derived") return;
  let f = async (name, a, S = name) => {
    if (a && !isRegisteredSessionName(name)) return;
    let l = await claimUniqueSessionName(name, a ? "recheck" : "startup", deps, S);
    if (!isRegisteredSessionName(name)) return;
    if (!l.yielded) {
      if (!a) scheduleRecheck(() => void f(name, true));
      return;
    }
    if (getSessionNamingState().userTypedName === name) getSessionNamingState().userTypedName = l.name;
    await writeName(l.name, "collision");
    onRenamed?.(l.name, name);
    getSessionNamingState().announceYield(l.name, name);
    if (!a) scheduleRecheck(() => void f(l.name, true, name));
  };
  await f(registeredSessionName.name, false);
}
//@ chunk-897ngh1d.js:4766-5023 placement
function scheduleSettledRecheck(e) {
  let { name: n, onYield, deps } = e;
  let suffixBase = e.suffixBase ?? n;
  (e.scheduleRecheck ?? _)(() => {
    (async () => {
      if (!isRegisteredSessionName(n)) return;
      let c = await claimUniqueSessionName(n, "recheck", deps, suffixBase);
      if (!c.yielded || !isRegisteredSessionName(n)) return;
      if (getSessionNamingState().userTypedName === n) getSessionNamingState().userTypedName = c.name;
      await onYield(c.name, n);
    })();
  });
}
//@ chunk-897ngh1d.js:5023-5267 placement
function renameSupersededDuringScan(registeredSessionName, n, name) {
  let registeredSessionName_2 = getRegisteredSessionName();
  if (
    registeredSessionName_2 === undefined ||
    registeredSessionName_2.source === "derived" ||
    registeredSessionName_2.source === "auto"
  )
    return;
  if (
    registeredSessionName_2.source === "collision" &&
    settledYieldFor(registeredSessionName?.name ?? n, registeredSessionName_2.name) !== undefined
  )
    return;
  let r = slugifySessionName(registeredSessionName_2.name);
  if (
    (registeredSessionName !== undefined && r === slugifySessionName(registeredSessionName.name)) ||
    r === slugifySessionName(n) ||
    r === slugifySessionName(name)
  )
    return;
  return registeredSessionName_2;
}
//@ chunk-897ngh1d.js:5267-6241 placement
/**
 * 恢复会话时重新声明会话名；名字被本机其他活会话占用时改名并通知通信过的会话。
 */
async function reclaimSessionNameOnResume(e, storageV5, s = {}) {
  let deps = s.deps ?? sessionNamingProviders;
  let r = e ? sanitizeSessionTitle(e) : "";
  if (!r) return;
  let sessionRegistryState = getSessionRegistryState();
  let adoptions = sessionRegistryState.adoptions;
  let p = ++sessionRegistryState.restores;
  let f = () =>
    sessionRegistryState.adoptions === adoptions &&
    (!s.yieldToLaterRestore || sessionRegistryState.restores === p);
  if (!(await deps.whenRegistered()) || !f()) return;
  if (s.keepLaunchName && getRegisteredSessionName()?.givenAtLaunch) return;
  if (s.autoOnly) {
    await updateSessionName(r, storageV5, "auto");
    return;
  }
  let registeredSessionName = getRegisteredSessionName();
  if (
    registeredSessionName !== undefined &&
    registeredSessionName.source !== "auto" &&
    registeredSessionName.source !== "derived" &&
    slugifySessionName(registeredSessionName.name) === slugifySessionName(r)
  )
    return;
  let a = await claimUniqueSessionName(r, "rename", deps);
  if (!f() || renameSupersededDuringScan(registeredSessionName, r, a.name)) return;
  let registeredSessionName_2 = getRegisteredSessionName();
  if (
    s.source === "auto" &&
    registeredSessionName_2 !== undefined &&
    registeredSessionName_2.source !== "derived" &&
    (registeredSessionName_2.name !== registeredSessionName?.name ||
      registeredSessionName_2.source !== registeredSessionName.source)
  )
    return;
  let l = s.source === "auto" ? "auto" : "collision";
  let onYield = async (y, N) => {
    if (l === "auto" && getRegisteredSessionName()?.source !== "auto") return;
    await updateSessionName(y, storageV5, l);
    getSessionNamingState().announceYield(y, N);
  };
  if (!a.yielded) {
    await updateSessionName(r, storageV5, s.source);
    scheduleSettledRecheck({
      name: r,
      deps,
      onYield,
    });
    return;
  }
  await updateSessionName(a.name, storageV5, l);
  if (getSessionNamingState().userTypedName === r) getSessionNamingState().userTypedName = a.name;
  scheduleSettledRecheck({
    name: a.name,
    suffixBase: r,
    deps,
    onYield,
  });
  if (a.name === registeredSessionName?.name) return;
  getSessionNamingState().announceYield(a.name, r);
}
//@ chunk-897ngh1d.js:6241-7062 placement
async function notifyCorrespondentsOfRename(
  formerName,
  n,
  contested,
  i,
  r = sendToUdsSocket,
  u = sessionNamingProviders.listLive,
) {
  if (
    !sessionNameUniquenessEnabled() ||
    !isCrossSessionMessagingEnabled() ||
    getSessionNamingState().correspondents.size === 0
  )
    return;
  let c = ownMessagingSocket();
  let [p, f, o] = [formerName, n, contested].map(sanitizeSessionTitle);
  let a = `This session was renamed from "${p}" to "${f}" ("${o}" is held by another live session on this machine). Address this one as "${f}" from now on.`;
  let S;
  try {
    S = new Map((await u(i)).map((l) => [l.pid, l.sock]));
  } catch (error) {
    logForDebugging(
      `[session-name] rename notice skipped: registry unreadable (${getErrnoCode(error) ?? errorMessage(error)})`,
    );
    return;
  }
  await Promise.all(
    [...getSessionNamingState().correspondents].map(async ([l, { pid: h, procStart: y }]) => {
      let { scheme, target } = parseAddress(l);
      if (scheme !== "uds" || !target || (c !== undefined && mayBeSamePath(target, c)) || S.get(h) !== target)
        return;
      try {
        await r(target, a, i, f, undefined, undefined, getSessionNamingState().senderMode?.(), {
          trackReceipts: false,
          expectPeerPid: h,
          ...(y !== undefined && {
            expectPeerProcStart: y,
          }),
        });
      } catch (error) {
        logForDebugging(
          `[session-name] rename notice to ${fragmentForLog(l)} failed: ${getErrnoCode(error) ?? "send error"}`,
        );
      }
    }),
  );
}
export {
  reclaimSessionNameOnResume,
  settledYieldFor,
  noteVettedCorrespondent,
  getSessionNamingState,
  takePendingYield,
  claimSessionNameAtStartup,
  getUserTypedSessionName,
  claimUniqueSessionName,
  renameSupersededDuringScan,
  scheduleSettledRecheck,
  notifyCorrespondentsOfRename,
};
