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
import { ND } from "./swarm/teammateIds.js";
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
import { jy } from "./udsMessaging/peerGuard.js";

//@ chunk-897ngh1d.js:699-713 placement
var Y = 16,
  L = 64;
/**
 * 哪个会话先启动
 */
//@ chunk-897ngh1d.js:713-868 placement
function startedEarlier(e, n) {
  if (e.startedAt !== n.startedAt) return e.startedAt < n.startedAt;
  let s = e.procStart ?? "",
    i = n.procStart ?? "";
  if (s !== i) return s < i;
  return e.pid < n.pid;
}
//@ chunk-897ngh1d.js:868-973 placement
function otherSessionsNamed(e, n, s) {
  return n.filter(
    (i) => i.pid !== s && i.name !== void 0 && i.procStart !== void 0 && slugifySessionName(i.name) === e,
  );
}
//@ chunk-897ngh1d.js:973-1051 placement
function D(e) {
  return new Set(e.flatMap((n) => (n.name === void 0 ? [] : [slugifySessionName(n.name)])));
}
/**
 * 生成不冲突的带后缀名字
 */
//@ chunk-897ngh1d.js:1051-1242 placement
function pickUniqueSuffixName(e, n, s = randomWordSlug) {
  let i = (r) => `${truncateToLength(e, ND - r.length - 1)}-${r}`;
  for (let r = 0; r < Y; r++) {
    let u = i(s());
    if (!n.has(slugifySessionName(u))) return u;
  }
  for (let r = 2; ; r++) {
    let u = i(`${s()}-${r}`);
    if (!n.has(slugifySessionName(u))) return u;
  }
}
/**
 * 判定保留、改名或让出会话名
 */
//@ chunk-897ngh1d.js:1242-1620 placement
function decideSessionName(e) {
  let { desiredName: desiredName, self: s, live: live, moment: moment, slug: slug } = e,
    c = e.suffixBase ?? desiredName,
    p = slugifySessionName(desiredName);
  if (!p) return { kind: "keep" };
  let f = otherSessionsNamed(p, live, s.pid),
    o =
      moment === "rename"
        ? f
        : moment === "startup"
          ? f.filter((a) => startedEarlier(a, s))
          : f.filter((a) =>
              startedEarlier(
                { ...a, startedAt: a.nameSince ?? a.startedAt },
                { ...s, startedAt: s.nameSince ?? s.startedAt },
              ),
            );
  if (o.length === 0) return { kind: "keep" };
  return { kind: "yield", newName: pickUniqueSuffixName(c, D(live), slug), holders: o };
}
/**
 * 会话命名状态
 */
//@ chunk-897ngh1d.js:1620-2248 placement
class SessionNamingState {
  correspondents = new Map();
  senderMode = null;
  userTypedName = void 0;
  hasAdopter = !1;
  lastYield = void 0;
  yielded = createSignal();
  pendingYield = void 0;
  noteCorrespondent(e, n, s) {
    if (!e || parseAddress(e).scheme !== "uds") return;
    if (
      (this.correspondents.delete(e),
      this.correspondents.set(e, { pid: n, procStart: s }),
      this.correspondents.size > L)
    ) {
      let i = this.correspondents.keys().next().value;
      if (i !== void 0) this.correspondents.delete(i);
    }
  }
  announceYield(e, n) {
    ((this.pendingYield = [e, n]), this.yielded.emit(e, n));
  }
  reset() {
    (this.correspondents.clear(),
      (this.lastYield = void 0),
      this.yielded.clear(),
      (this.pendingYield = void 0),
      (this.senderMode = null),
      (this.userTypedName = void 0),
      (this.hasAdopter = !1));
  }
}
//@ chunk-897ngh1d.js:2248-2271 placement
var I = new HostScoped(() => new SessionNamingState());
//@ chunk-897ngh1d.js:2271-2307 placement
function getSessionNamingState() {
  return I.of(getRootSession().host);
}
//@ chunk-897ngh1d.js:2307-2439 placement
function getUserTypedSessionName() {
  let e = getRegisteredSessionName();
  return e !== void 0 &&
    (e.source === "user" || e.source === "collision") &&
    getSessionNamingState().userTypedName === e.name
    ? e.name
    : void 0;
}
//@ chunk-897ngh1d.js:2439-2489 placement
function noteVettedCorrespondent(e, n, s) {
  getSessionNamingState().noteCorrespondent(e, n, s);
}
//@ chunk-897ngh1d.js:2489-2563 placement
function takePendingYield() {
  let e = getSessionNamingState(),
    pendingYield = e.pendingYield;
  return ((e.pendingYield = void 0), pendingYield);
}
//@ chunk-897ngh1d.js:2563-2603 placement
var C = { whenRegistered: whenSessionRegistered, listLive: listAllLiveSessions };
//@ chunk-897ngh1d.js:2603-2661 placement
function P() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_session_name_uniqueness", !0);
}
//@ chunk-897ngh1d.js:2661-3496 placement
async function claimUniqueSessionName(e, n, s = C, i = e) {
  if (!P()) return { name: e, yielded: !1 };
  if (((i = b(i) ?? i), !(await s.whenRegistered()))) return { name: e, yielded: !1 };
  try {
    let r = getSessionId(),
      filtered = (await s.listLive()).filter((a) => a.pid === process.pid || a.sessionId !== r),
      found = filtered.find((a) => a.pid === process.pid);
    if (!found) return { name: e, yielded: !1 };
    let p = decideSessionName({
      desiredName: e,
      self: found,
      live: filtered,
      moment: n,
      slug: s.slug,
      suffixBase: i,
    });
    if (p.kind === "keep") return { name: e, yielded: !1 };
    let f = derivedNameMatch(e, found),
      o =
        sanitizeSessionTitle(
          f !== void 0 && slugifySessionName(f) !== slugifySessionName(e) ? f : p.newName,
        ) || p.newName;
    return (
      logForDebugging(
        `[session-name] "${e}" is held by live pid ${p.holders[0]?.pid}; this session takes "${o}"`,
        { level: "info" },
      ),
      logFeatureOk("session_name_collision"),
      (getSessionNamingState().lastYield = { base: slugifySessionName(i), name: o }),
      { name: o, yielded: !0 }
    );
  } catch (error) {
    return (
      logForDebugging(`[session-name] uniqueness check failed, keeping "${e}": ${errorMessage(error)}`, {
        level: "warn",
      }),
      logFeatureBad("session_name_collision", "check_failed"),
      { name: e, yielded: !1 }
    );
  }
}
/**
 * 是否为派生名
 */
//@ chunk-897ngh1d.js:3496-3724 placement
function derivedNameMatch(e, n) {
  let s = settledYieldFor(e, n.name);
  if (s !== void 0) return s;
  let i = n.name,
    r = i === void 0 ? void 0 : splitNameSuffix(i);
  if (i === void 0 || r === void 0) return;
  let u = b(e) ?? e,
    c = truncateToLength(u, ND - r.suffix.length - 1);
  return r.base.toLowerCase() === c.toLowerCase() ? i : void 0;
}
/**
 * 拆出名字后缀
 */
//@ chunk-897ngh1d.js:3724-3916 placement
function splitNameSuffix(e) {
  let match = /-([a-z]+-[a-z]+)(-\d{1,4})?$/i.exec(e);
  if (!match || !isWordSlug(match[1].toLowerCase())) return;
  let sliced = e.slice(0, e.length - match[0].length);
  return sliced.length > 0 ? { base: sliced, suffix: match[0].slice(1) } : void 0;
}
//@ chunk-897ngh1d.js:3916-4055 placement
function settledYieldFor(e, n) {
  if (!P()) return;
  let lastYield = getSessionNamingState().lastYield,
    i = b(e) ?? e;
  return lastYield !== void 0 &&
    n !== void 0 &&
    slugifySessionName(lastYield.name) === slugifySessionName(n) &&
    lastYield.base === slugifySessionName(i)
    ? n
    : void 0;
}
//@ chunk-897ngh1d.js:4055-4118 placement
function x(e) {
  let n = getRegisteredSessionName();
  return n !== void 0 && slugifySessionName(n.name) === slugifySessionName(e);
}
//@ chunk-897ngh1d.js:4118-4150 placement
function b(e) {
  return splitNameSuffix(e)?.base;
}
//@ chunk-897ngh1d.js:4150-4161 placement
var z = 3000;
//@ chunk-897ngh1d.js:4161-4199 placement
function _(e) {
  setTimeout(e, z).unref();
}
//@ chunk-897ngh1d.js:4199-4766 placement
async function claimSessionNameAtStartup(e) {
  let {
      sessionNameArg: sessionNameArg,
      interactive: interactive,
      writeName: writeName,
      onRenamed: onRenamed,
      deps: deps,
    } = e,
    c = e.scheduleRecheck ?? _;
  if (sessionNameArg && interactive) getSessionNamingState().userTypedName = sessionNameArg;
  if (sessionNameArg) await writeName(sessionNameArg, e.sessionNameArgSource ?? "user");
  let p = getRegisteredSessionName();
  if (!interactive || !p || p.source === "derived") return;
  let f = async (o, a, S = o) => {
    if (a && !x(o)) return;
    let l = await claimUniqueSessionName(o, a ? "recheck" : "startup", deps, S);
    if (!x(o)) return;
    if (!l.yielded) {
      if (!a) c(() => void f(o, !0));
      return;
    }
    if (getSessionNamingState().userTypedName === o) getSessionNamingState().userTypedName = l.name;
    if (
      (await writeName(l.name, "collision"),
      onRenamed?.(l.name, o),
      getSessionNamingState().announceYield(l.name, o),
      !a)
    )
      c(() => void f(l.name, !0, o));
  };
  await f(p.name, !1);
}
//@ chunk-897ngh1d.js:4766-5023 placement
function scheduleSettledRecheck(e) {
  let { name: n, onYield: onYield, deps: deps } = e,
    r = e.suffixBase ?? n;
  (e.scheduleRecheck ?? _)(() => {
    (async () => {
      if (!x(n)) return;
      let c = await claimUniqueSessionName(n, "recheck", deps, r);
      if (!c.yielded || !x(n)) return;
      if (getSessionNamingState().userTypedName === n) getSessionNamingState().userTypedName = c.name;
      await onYield(c.name, n);
    })();
  });
}
//@ chunk-897ngh1d.js:5023-5267 placement
function renameSupersededDuringScan(e, n, s) {
  let i = getRegisteredSessionName();
  if (i === void 0 || i.source === "derived" || i.source === "auto") return;
  if (i.source === "collision" && settledYieldFor(e?.name ?? n, i.name) !== void 0) return;
  let r = slugifySessionName(i.name);
  if (
    (e !== void 0 && r === slugifySessionName(e.name)) ||
    r === slugifySessionName(n) ||
    r === slugifySessionName(s)
  )
    return;
  return i;
}
/**
 * 恢复会话时重新声明会话名；名字被本机其他活会话占用时改名并通知通信过的会话。
 */
//@ chunk-897ngh1d.js:5267-6241 placement
async function reclaimSessionNameOnResume(e, n, s = {}) {
  let i = s.deps ?? C,
    r = e ? sanitizeSessionTitle(e) : "";
  if (!r) return;
  let u = getSessionRegistryState(),
    adoptions = u.adoptions,
    p = ++u.restores,
    f = () => u.adoptions === adoptions && (!s.yieldToLaterRestore || u.restores === p);
  if (!(await i.whenRegistered()) || !f()) return;
  if (s.keepLaunchName && getRegisteredSessionName()?.givenAtLaunch) return;
  if (s.autoOnly) {
    await updateSessionName(r, n, "auto");
    return;
  }
  let o = getRegisteredSessionName();
  if (
    o !== void 0 &&
    o.source !== "auto" &&
    o.source !== "derived" &&
    slugifySessionName(o.name) === slugifySessionName(r)
  )
    return;
  let a = await claimUniqueSessionName(r, "rename", i);
  if (!f() || renameSupersededDuringScan(o, r, a.name)) return;
  let S = getRegisteredSessionName();
  if (
    s.source === "auto" &&
    S !== void 0 &&
    S.source !== "derived" &&
    (S.name !== o?.name || S.source !== o.source)
  )
    return;
  let l = s.source === "auto" ? "auto" : "collision",
    h = async (y, N) => {
      if (l === "auto" && getRegisteredSessionName()?.source !== "auto") return;
      (await updateSessionName(y, n, l), getSessionNamingState().announceYield(y, N));
    };
  if (!a.yielded) {
    (await updateSessionName(r, n, s.source), scheduleSettledRecheck({ name: r, deps: i, onYield: h }));
    return;
  }
  if ((await updateSessionName(a.name, n, l), getSessionNamingState().userTypedName === r))
    getSessionNamingState().userTypedName = a.name;
  if ((scheduleSettledRecheck({ name: a.name, suffixBase: r, deps: i, onYield: h }), a.name === o?.name))
    return;
  getSessionNamingState().announceYield(a.name, r);
}
//@ chunk-897ngh1d.js:6241-7062 placement
async function notifyCorrespondentsOfRename(e, n, s, i, r = sendToUdsSocket, u = C.listLive) {
  if (!P() || !isCrossSessionMessagingEnabled() || getSessionNamingState().correspondents.size === 0) return;
  let c = ownMessagingSocket(),
    [p, f, o] = [e, n, s].map(sanitizeSessionTitle),
    a = `This session was renamed from "${p}" to "${f}" ("${o}" is held by another live session on this machine). Address this one as "${f}" from now on.`,
    S;
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
      let { scheme: scheme, target: target } = parseAddress(l);
      if (scheme !== "uds" || !target || (c !== void 0 && mayBeSamePath(target, c)) || S.get(h) !== target)
        return;
      try {
        await r(target, a, i, f, void 0, void 0, getSessionNamingState().senderMode?.(), {
          trackReceipts: !1,
          expectPeerPid: h,
          ...(y !== void 0 && { expectPeerProcStart: y }),
        });
      } catch (error) {
        logForDebugging(
          `[session-name] rename notice to ${jy(l)} failed: ${getErrnoCode(error) ?? "send error"}`,
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
