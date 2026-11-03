/**
 * utils/sessionAddresses.ts
 *
 * 会话地址（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e7z1g8a9.js (57)
 * attribution: placement 57
 */
import { mkdir, unlink, readdir } from "fs/promises";
import { join, basename, basename as basename_2 } from "path";
import { hashCanonicalSocketPath, canonicalSocketPath } from "./udsPaths.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getSessionsDir } from "./concurrentSessions.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";
import { jsonStringify, jsonParseRaw } from "./slowOperations.js";
import {
  procIdentityFields,
  ownProcStartAsync,
  isProcessProvablyGone,
  procIdentityOf,
  getProcessStartTimeAsync,
  startTokensEqualOrCrossFormat,
} from "./processIdentity.js";
import { ownPidDomain } from "./pidSpace.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { x, Q, he, authenticatePeer, Ihr, AUTH, v, MAIN } from "./sessionPeers.js";
import { isENOENT } from "./errors.js";
import { timingSafeEqualStrings } from "./sessionRecords.js";
import { Um } from "./agentId.js";
import { TEAM_LEAD, USER, SYSTEM } from "./swarm/constants.js";
import { getTeamName } from "./teammate.js";
import { MG, ND } from "./swarm/teammateIds.js";
import { mainAgentId, getSessionId } from "../bootstrap/state.js";
import { sessionIdBody } from "../bridge/sessionIdCompat.js";
import { formatDuration } from "./format.js";
import { isValidPipeOrPath, parseAddress, mayBeSamePath } from "./peerAddress.js";
import { vds } from "./peerMessageHeaders.js";
import { uniq } from "./collections.js";
import { gn } from "./shortHash.js";
import { udsEnv } from "./env.js";

//@ chunk-e7z1g8a9.js:4406-4556 placement
function getMessagingKeyName(e, n) {
  let r = hashCanonicalSocketPath(n);
  if (r === void 0) throw Error("refusing to derive a messaging key name for a non-canonical socket path");
  return `${e}.${r}.key`;
}
//@ chunk-e7z1g8a9.js:4556-4831 placement = recordConsolidation (0.434)
async function writeSessionPeerRecord(e, n, r, { sweepPermitted: sweepPermitted }) {
  if (isStorageV5Enabled() && r !== void 0) return ensureMessagingKeyDir(r, e, n);
  let c = getSessionsDir();
  (await mkdir(c, { recursive: !0, mode: 448 }), await pruneDeadSessionRecords(c, sweepPermitted));
  let a = join(c, getMessagingKeyName(process.pid, e));
  try {
    await unlink(a);
  } catch {}
  return (
    await writeFileAtomic(
      a,
      jsonStringify({
        peerToken: n,
        ...procIdentityFields(await ownProcStartAsync()),
        pidDomain: await ownPidDomain(),
      }),
      384,
    ),
    a
  );
}
//@ chunk-e7z1g8a9.js:4831-5393 placement
async function ensureMessagingKeyDir(e, n, r) {
  let i = getMessagingKeyName(process.pid, n),
    ensureScope = await e.ensureScope({ namespace: "session" });
  if (!ensureScope.ok)
    throw (
      logForDebugging(`[uds-auth] sessions scope unavailable: ${formatStorageError(ensureScope.error)}`),
      Error("messaging key folder could not be made through storage")
    );
  try {
    await e.delete(STORAGE_SPACES.session(i));
  } catch {}
  let write = await e.write(
    STORAGE_SPACES.session(i),
    jsonStringify({
      peerToken: r,
      ...procIdentityFields(await ownProcStartAsync()),
      pidDomain: await ownPidDomain(),
    }),
    { publishDiscipline: "atomic", mode: 384, exactMode: 384 },
  );
  if (!write.ok)
    throw (
      logForDebugging(`[uds-auth] key publish failed: ${formatStorageError(write.error)}`),
      Error("messaging key could not be published through storage")
    );
  return join(getSessionsDir(), i);
}
/**
 * 读取会话地址记录中的 pidDomain 字段（失败返回 undefined）。
 */
//@ chunk-e7z1g8a9.js:5393-5540 placement
async function readRecordPidDomain(e) {
  try {
    let n = await readSmallFileOrNull(e, x);
    if (n === null) return;
    let safeParse = Q().safeParse(jsonParseRaw(n));
    return safeParse.success ? safeParse.data.pidDomain : void 0;
  } catch {
    return;
  }
}
//@ chunk-e7z1g8a9.js:5540-5801 placement
async function pruneDeadSessionRecords(e, n) {
  if (!n) return;
  let r;
  try {
    r = await readdir(e);
  } catch {
    return;
  }
  let i = await ownPidDomain();
  await Promise.all(
    r.map(async (c) => {
      let match = he.exec(c);
      if (!match || !isProcessProvablyGone(parseInt(match[1], 10))) return;
      let f = await readRecordPidDomain(join(e, c));
      if (f !== void 0 && f !== i) return;
      try {
        await unlink(join(e, c));
      } catch {}
    }),
  );
}
/**
 * 删除会话地址记录（存储 v5 时删除存储项，否则删除文件），错误忽略。
 */
//@ chunk-e7z1g8a9.js:5801-5920 placement
async function deleteSessionRecord(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    try {
      await n.delete(STORAGE_SPACES.session(basename_2(e)));
    } catch {}
    return;
  }
  try {
    await unlink(e);
  } catch {}
}
//@ chunk-e7z1g8a9.js:5920-7262 placement
async function classifySessionAddress(e, n, r) {
  let i = getSessionsDir(),
    c;
  if (isStorageV5Enabled() && n !== void 0) {
    let m = await authenticatePeer(n, { partialOnCap: !1 });
    if (m === void 0) return { kind: "unusable" };
    c = m;
  } else
    try {
      c = await readdir(i);
    } catch (error) {
      return isENOENT(error) ? { kind: "no-key" } : { kind: "unusable" };
    }
  let a = hashCanonicalSocketPath(e);
  if (a === void 0) return { kind: "no-key" };
  let f = `.${a}.key`,
    filtered = c
      .filter((m) => m.endsWith(f))
      .map((m) => {
        let match = Ihr.exec(m);
        return match ? { file: m, pid: parseInt(match[1], 10) } : void 0;
      })
      .filter((m) => m !== void 0);
  if (filtered.length === 0) return { kind: "no-key" };
  let k = async (m) => {
    let h =
      isStorageV5Enabled() && n !== void 0
        ? await readSessionRecord(n, m)
        : await readSmallFileOrNull(join(i, m), x);
    if (h === null) return;
    try {
      let safeParse = Q().safeParse(jsonParseRaw(h));
      return safeParse.success ? safeParse.data : void 0;
    } catch {
      return;
    }
  };
  if (filtered.length === 1) {
    let m = filtered[0];
    if (r?.requireLiveOwner && isProcessProvablyGone(m.pid)) return { kind: "dead-owner" };
    let h = await k(m.file);
    if (h === void 0) return { kind: "unusable" };
    if (r?.requireLiveOwner) {
      let y = procIdentityOf(h);
      if (y !== void 0) {
        let E = await getProcessStartTimeAsync(m.pid, { skipCache: !0 });
        if (E !== void 0 && !startTokensEqualOrCrossFormat(y, E)) return { kind: "dead-owner" };
      }
    }
    return { kind: "token", token: h.peerToken };
  }
  let S;
  for (let { file: file, pid: pid } of filtered) {
    let y = await k(file);
    if (y === void 0) continue;
    let E = 0;
    if (!isProcessProvablyGone(pid)) {
      let w = procIdentityOf(y),
        R = w === void 0 ? void 0 : await getProcessStartTimeAsync(pid, { skipCache: !0 });
      if (w === void 0 || R === void 0) E = 1;
      else E = startTokensEqualOrCrossFormat(w, R) ? 2 : 0;
    }
    if (S === void 0 || E > S.rank) S = { rank: E, peerToken: y.peerToken };
  }
  if (S === void 0) return { kind: "unusable" };
  if (r?.requireLiveOwner && S.rank === 0) return { kind: "dead-owner" };
  return { kind: "token", token: S.peerToken };
}
//@ chunk-e7z1g8a9.js:7262-7473 placement
async function readSessionRecord(e, n) {
  try {
    let text = await e.readText([{ key: STORAGE_SPACES.session(n), offset: 0, length: x + 1 }]);
    if (!text.ok) return null;
    let i = text.value.items[0];
    if (!i.found || i.totalBytes > x) return null;
    return i.value;
  } catch {
    return null;
  }
}
//@ chunk-e7z1g8a9.js:7473-7520 placement
function cds(e) {
  return (
    jsonStringify({ type: AUTH, token: e }) +
    `
`
  );
}
//@ chunk-e7z1g8a9.js:7520-7556 placement
var PAi = cds("0".repeat(v * 2)).length;
/**
 * 是否是指定 type 的对象。
 */
//@ chunk-e7z1g8a9.js:7556-7633 placement = extractErrorTypeFromData (1)
function isAuthItem(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === AUTH;
}
/**
 * 用常量时间比较判断令牌是对等令牌还是子会话令牌。
 */
//@ chunk-e7z1g8a9.js:7633-7749 placement
function tokenRole(e, n) {
  if (n === void 0) return;
  if (timingSafeEqualStrings(e, n.peerToken)) return "peer";
  if (timingSafeEqualStrings(e, n.childToken)) return "child";
  return;
}
/**
 * 读取会话稳定地址功能开关（tengu_session_stable_address），出错视为关闭。
 */
//@ chunk-e7z1g8a9.js:7749-7897 placement
function isStableAddressEnabled() {
  let { getFeatureValue_SESSION_PINNED: getFeatureValue_SESSION_PINNED } = require("./chunk-6df1d6re.js");
  try {
    return getFeatureValue_SESSION_PINNED("tengu_session_stable_address", !1);
  } catch {
    return !1;
  }
}
//@ chunk-e7z1g8a9.js:7897-7911 placement
var SID = "sid:";
//@ chunk-e7z1g8a9.js:7911-7945 placement
function V9t(e) {
  return `${SID}${e}`;
}
//@ chunk-e7z1g8a9.js:7945-7985 placement
function dIt(e) {
  return e.startsWith(SID);
}
//@ chunk-e7z1g8a9.js:7985-8020 placement
function cdt(e) {
  return !dIt(e.sock);
}
/**
 * 判断会话名是否等同于未命名（空、规范化后为空或为 untitled session）。
 */
//@ chunk-e7z1g8a9.js:8020-8158 placement
function isUntitledName(e) {
  let n = typeof e === "string" ? e.trim() : "",
    r = normalizeSessionTitle(n);
  return !n || !r || (r === "untitled session" && n.toLowerCase() !== "untitled session");
}
//@ chunk-e7z1g8a9.js:8158-8238 placement
function b3e(e) {
  return e.environmentKind !== void 0 && e.environmentKind !== "bridge";
}
//@ chunk-e7z1g8a9.js:8238-8286 placement
function Boo(e) {
  return !b3e(e) && e.connected === !1;
}
/**
 * 把会话名规范化为地址用的 slug（NFKC、去控制字符、小写、空白转连字符）。
 */
//@ chunk-e7z1g8a9.js:8286-8426 placement
function slugifySessionName(e) {
  return e
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (n) => (/\s/.test(n) ? n : ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}
//@ chunk-e7z1g8a9.js:8426-8466 placement
function MAi(e) {
  return Um(slugifySessionName(e)) !== null;
}
//@ chunk-e7z1g8a9.js:8466-8516 placement
function udt(e) {
  return typeof e !== "string" || LD(e);
}
//@ chunk-e7z1g8a9.js:8516-8580 placement
function cIt(e, n) {
  return e.name === TEAM_LEAD && n !== void 0 && e.agentId === n;
}
/**
 * 取团队领导的地址：本会话是领导时用其 agent id，否则由团队名推出。
 */
//@ chunk-e7z1g8a9.js:8580-8709 placement
function teamLeadAddress(e) {
  let teamContext = e.teamContext;
  if (teamContext?.leadAgentId && teamContext.isLeader !== !1) return teamContext.leadAgentId;
  let r = getTeamName(teamContext);
  return r ? MG(TEAM_LEAD, r) : void 0;
}
//@ chunk-e7z1g8a9.js:8709-8780 placement
function fdt(e, n) {
  return e.members.filter((member) => cIt(member, n) || !udt(member.name));
}
//@ chunk-e7z1g8a9.js:8780-8861 placement
function LD(e) {
  let n = slugifySessionName(e);
  return n === MAIN || n === TEAM_LEAD || n === USER || n === SYSTEM || Um(n) !== null;
}
//@ chunk-e7z1g8a9.js:8861-8949 placement
var M = 6,
  uds = 12,
  PBe = `[0-9a-f]{${M},${uds}}`,
  regExp_2 = new RegExp(`^(.*\\S)\\s*\\[(${PBe})\\]$`);
//@ chunk-e7z1g8a9.js:8949-9023 placement
function d8(e) {
  let match = regExp_2.exec(e.trim());
  return match ? { name: match[1], ref: match[2] } : null;
}
/**
 * 生成代理/会话地址的显示描述（main、in-process、teammate、local_agent）
 */
//@ chunk-e7z1g8a9.js:9023-11961 placement
function describeAgentAddress(e, n) {
  let r = [];
  r.push({
    name: MAIN,
    id: mainAgentId(),
    kind: "main",
    where: "in-process",
    lastActive: void 0,
    sock: void 0,
  });
  let i = new Set();
  for (let [s, l] of Object.entries(e.teamContext?.teammates ?? {}))
    (i.add(s),
      r.push({
        name: l.name,
        id: s,
        kind: "teammate",
        where: "in-process",
        lastActive: void 0,
        sock: void 0,
      }));
  for (let [s, l] of e.agentNameRegistry) {
    let b = e.tasks[l],
      A = b?.type === "local_agent" ? b : void 0;
    r.push({ name: s, id: l, kind: "subagent", where: "in-process", lastActive: A?.startTime, sock: void 0 });
  }
  for (let s of n.teamFile?.members ?? []) {
    if (i.has(s.agentId)) continue;
    (i.add(s.agentId),
      r.push({
        name: s.name,
        id: s.agentId,
        kind: "teammate",
        where: "this-machine",
        lastActive: void 0,
        sock: void 0,
      }));
  }
  let c = isStableAddressEnabled(),
    filtered = n.sessions.filter(cdt),
    f = c ? groupBySocket(filtered) : void 0,
    g = c ? ambiguousSessionIds(getSessionId(), filtered, f) : void 0;
  for (let s of filtered) {
    let l = f?.get(s)?.claims;
    r.push({
      name: s.name || basename(s.cwd),
      id: s.sock,
      kind: "session",
      where: "this-machine",
      lastActive: s.statusUpdatedAt,
      sock: s.sock,
      ...(l !== void 0 && l.size > 0 && { claimedSessionIds: [...l].sort() }),
      ...(c && s.sessionId !== void 0 && !g.has(s.sessionId) && { stableId: V9t(s.sessionId) }),
      ...(c && s.nameSource === "derived" && { derivedName: !0 }),
      ...(s.hostSessionId !== void 0 && { hostSessionId: s.hostSessionId }),
    });
  }
  let k = new Map();
  for (let session of n.sessions)
    if (session.bridgeSessionId !== void 0) {
      let l = sessionIdBody(session.bridgeSessionId);
      k.set(l, [...(k.get(l) ?? []), session.sock]);
    }
  let S = [];
  for (let s of n.cloud ?? []) {
    if (hasBridgeSessionId(n.sessions, s.id)) {
      S.push({ rawName: s.title || "untitled", socks: k.get(sessionIdBody(s.id)) ?? [] });
      continue;
    }
    r.push({
      name: s.title || "untitled",
      id: s.id,
      kind: "cloud-session",
      ...(isUntitledName(s.title) && { derivedName: !0 }),
      ...(s.acceptsPeerMessages === !0 && { reportsInbound: !0 }),
      where: s.remoteControl ? "remote" : "cloud",
      lastActive: s.lastActive,
      sock: void 0,
      ...(s.offline && { offline: !0 }),
    });
  }
  let m = new Set((n.cloud ?? []).map((s) => sessionIdBody(s.id))),
    h = Y9t(n.sessions);
  for (let s of n.bridge ?? []) {
    let l = sessionIdBody(s.id);
    if (m.has(l)) continue;
    if (h.has(l)) {
      S.push({ rawName: s.title || "untitled", socks: k.get(l) ?? [] });
      continue;
    }
    let parse = Date.parse(s.updated_at);
    r.push({
      name: s.title || "untitled",
      id: s.id,
      kind: "bridge-session",
      ...(isUntitledName(s.title) && { derivedName: !0 }),
      ...(s.acceptsPeerMessages === !0 && { reportsInbound: !0 }),
      ...(s.inboundReportUnavailable && { inboundReportUnavailable: !0 }),
      where: b3e(s) ? "cloud" : "remote",
      lastActive: Number.isNaN(parse) ? void 0 : parse,
      sock: void 0,
      ...(Boo(s) && { offline: !0 }),
    });
  }
  let y = teamLeadAddress(e),
    flattened = r.flatMap((s) => {
      let l = normalizeSessionTitle(s.name);
      if (l === null || !F(l)) return [];
      let b = s.kind === "main" || (s.kind === "teammate" && cIt({ name: s.name, agentId: s.id }, y)),
        A =
          (s.kind === "session" || s.kind === "cloud-session" || s.kind === "bridge-session") &&
          slugifySessionName(l) === MAIN;
      return b || A || !udt(l) ? [{ ...s, name: l }] : [];
    }),
    w = new Set(),
    R = assignShortRefs(
      flattened.filter((s) => {
        if (s.kind !== "session") return !0;
        let l = `${slugifySessionName(s.name)}\x00${canonicalSocketPath(s.id) ?? s.id}`;
        if (w.has(l)) return !1;
        return (w.add(l), !0);
      }),
    ),
    P = new Map();
  for (let s of R) {
    let l = slugifySessionName(s.name),
      b = P.get(l);
    if (b) b.push(s);
    else P.set(l, [s]);
  }
  let C = new Map();
  for (let { rawName: rawName, socks: socks } of S) {
    let b = normalizeSessionTitle(rawName);
    if (b === null || !F(b)) continue;
    let A = slugifySessionName(b),
      L = C.get(A) ?? new Set();
    for (let ie of socks) L.add(ie);
    C.set(A, L);
  }
  return { candidates: R, byName: P, remoteNamesClaimedLocally: C };
}
/**
 * 在按名称分组的候选中解析唯一目标：同进程的直接返回，否则视为有歧义。
 */
//@ chunk-e7z1g8a9.js:11961-12173 placement
function resolveUniqueCandidate(e, n, r) {
  let i = e.get(n);
  if (!i || i.length === 0) return;
  let c = r === void 0 ? [] : i.filter((g) => g.name === r),
    f = (c.length > 0 ? c : i)[0];
  if (f.where === "in-process") return { kind: "one", candidate: f };
  return { kind: "ambiguous" };
}
//@ chunk-e7z1g8a9.js:12173-12218 placement
function bOe(e) {
  return `${e.name} [${e.ref}]`;
}
//@ chunk-e7z1g8a9.js:12218-12290 placement
function joo(e) {
  return e === "remote" ? `${describeSessionLocation(e)} (Remote Control)` : describeSessionLocation(e);
}
/**
 * 会话位置的文字描述（本会话、云端、其他机器、本机）。
 */
//@ chunk-e7z1g8a9.js:12290-12474 placement
function describeSessionLocation(e) {
  switch (e) {
    case "in-process":
      return "in this session";
    case "cloud":
      return "in the cloud";
    case "remote":
      return "on another machine";
    case "this-machine":
      return "on this machine";
  }
}
//@ chunk-e7z1g8a9.js:12474-12821 placement
function agentAddressLabel(e, n) {
  let r =
      e.kind === "main"
        ? "main conversation"
        : e.kind === "session" || e.kind === "cloud-session" || e.kind === "bridge-session"
          ? "Claude session"
          : e.kind,
    i = joo(e.where),
    c =
      e.lastActive === void 0
        ? ""
        : `, ${e.kind === "subagent" ? "started" : "active"} ${formatDuration(Math.max(0, n - e.lastActive), { mostSignificantOnly: !0 })} ago`;
  return `${bOe(e)} \u2014 ${r}, ${i}${c}`;
}
//@ chunk-e7z1g8a9.js:12821-12831 placement
var Te = ND;
/**
 * 规范化会话标题：去控制字符、合并空白、截断长度，空时为 untitled session。
 */
//@ chunk-e7z1g8a9.js:12831-13027 placement
function normalizeSessionTitle(e) {
  if (typeof e !== "string") return null;
  return (
    [
      ...e
        .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (r) => (/\s/.test(r) ? r : ""))
        .replace(/\s+/g, " ")
        .trim(),
    ]
      .slice(0, Te)
      .join("")
      .trim() || "untitled session"
  );
}
//@ chunk-e7z1g8a9.js:13027-13106 placement
function Lhr(e, n) {
  return e.find((r) => r.name === n) ?? e.find((r) => normalizeSessionTitle(r.name) === n);
}
//@ chunk-e7z1g8a9.js:13106-13174 placement
function IBe(e) {
  let n = normalizeSessionTitle(e);
  return n !== null && !q9t(n) && isValidPipeOrPath(n) ? n : null;
}
//@ chunk-e7z1g8a9.js:13174-13240 placement
function Zxn(e) {
  let n = normalizeSessionTitle(e);
  return n !== null && F(n) && !LD(n) ? n : null;
}
//@ chunk-e7z1g8a9.js:13240-13302 placement
function F(e) {
  return !q9t(e) && isValidPipeOrPath(e) && !e.includes("@") && e !== "*";
}
//@ chunk-e7z1g8a9.js:13302-13400 placement
function q9t(e) {
  let n = slugifySessionName(e);
  return parseAddress(e).scheme !== "other" || parseAddress(n).scheme !== "other" || vds(e) || vds(n);
}
/**
 * 为会话地址列表分配最短可区分前缀 ref：与相邻（排序后）地址比较公共前缀长度，ref 长度至少 M。
 */
//@ chunk-e7z1g8a9.js:13400-13729 placement
function assignShortRefs(e) {
  let mapped = e.map((a) => N(a.kind, ePn(a))),
    mapped_2 = Re().map((a) => N("session", a)),
    sorted = uniq([...mapped, ...mapped_2]).sort(),
    c = new Map();
  for (let a = 0; a < sorted.length; a++) {
    let f = sorted[a],
      max = Math.max(a > 0 ? ne(f, sorted[a - 1]) : 0, a + 1 < sorted.length ? ne(f, sorted[a + 1]) : 0);
    c.set(f, Math.min(f.length, Math.max(M, max + 1)));
  }
  return e.map((a, f) => {
    let g = mapped[f];
    return { ...a, ref: g.slice(0, c.get(g)) };
  });
}
//@ chunk-e7z1g8a9.js:13729-13809 placement
function ne(e, n) {
  let r = 0;
  while (r < e.length && r < n.length && e[r] === n[r]) r++;
  return r;
}
//@ chunk-e7z1g8a9.js:13809-13856 placement
function N(e, n) {
  return String(gn(`${e}:${n}`));
}
//@ chunk-e7z1g8a9.js:13856-13896 placement
function ePn(e) {
  return e.stableId ?? e.id;
}
//@ chunk-e7z1g8a9.js:13896-13975 placement
function Re() {
  let CLAUDE_CODE_MESSAGING_SOCKET = udsEnv.CLAUDE_CODE_MESSAGING_SOCKET;
  return CLAUDE_CODE_MESSAGING_SOCKET === void 0 ? [] : te(CLAUDE_CODE_MESSAGING_SOCKET);
}
//@ chunk-e7z1g8a9.js:13975-14015 placement
function fds(e) {
  return isStableAddressEnabled() ? V9t(getSessionId()) : e;
}
//@ chunk-e7z1g8a9.js:14015-14066 placement
function te(e) {
  let n = fds(e);
  return n === e ? [e] : [n, e];
}
//@ chunk-e7z1g8a9.js:14066-14126 placement
function pds(e, n) {
  return te(n).some((r) => xe(e, "session", r));
}
/**
 * 按 socket 路径把会话地址记录分组：可能同一路径的记录合并为一组并汇总声明的会话 id，返回记录 → 组的映射。
 */
//@ chunk-e7z1g8a9.js:14126-14522 placement
function groupBySocket(e) {
  let n = [];
  for (let i of e) {
    let filtered = n.filter((f) => f.records.some((record) => mayBeSamePath(record.sock, i.sock))),
      a = { records: [], claims: new Set() };
    for (let f of filtered) {
      a.records.push(...f.records);
      for (let claim of f.claims) a.claims.add(claim);
    }
    if ((a.records.push(i), i.sessionId !== void 0)) a.claims.add(i.sessionId);
    ((n = n.filter((f) => !filtered.includes(f))), n.push(a));
  }
  let r = new Map();
  for (let i of n) for (let record of i.records) r.set(record, i);
  return r;
}
//@ chunk-e7z1g8a9.js:14522-14774 placement
function ambiguousSessionIds(e, n, r) {
  let i = new Set([e]),
    c = new Set();
  for (let a of n) {
    if (a.sessionId === void 0) continue;
    if (i.has(a.sessionId)) c.add(a.sessionId);
    i.add(a.sessionId);
  }
  for (let a of new Set(r.values())) if (a.records.length > 1) for (let claim of a.claims) c.add(claim);
  return c;
}
/**
 * 判断本会话 id 在会话地址记录中是否存在歧义（多个 socket 声明同一会话）。
 */
//@ chunk-e7z1g8a9.js:14774-14914 placement
function isOwnSessionIdAmbiguous(e, n, r) {
  if (r) return !0;
  let i = getSessionId(),
    filtered = e.filter(cdt);
  if (n !== void 0) filtered.push({ sock: n, sessionId: i });
  let a = groupBySocket(filtered);
  return ambiguousSessionIds("", filtered, a).has(i);
}
//@ chunk-e7z1g8a9.js:14914-14957 placement
function pdt(e, n) {
  return N(e, n).slice(0, M);
}
//@ chunk-e7z1g8a9.js:14957-15017 placement
function xe(e, n, r) {
  return e.length >= M && N(n, r).startsWith(e);
}
//@ chunk-e7z1g8a9.js:15017-15110 placement
function Y9t(e) {
  return new Set(e.flatMap((n) => (n.bridgeSessionId ? [sessionIdBody(n.bridgeSessionId)] : [])));
}
/**
 * 判断地址记录中是否有与给定 id 对应的桥接会话 id。
 */
//@ chunk-e7z1g8a9.js:15110-15214 placement
function hasBridgeSessionId(e, n) {
  let r = sessionIdBody(n);
  return e.some((i) => i.bridgeSessionId !== void 0 && sessionIdBody(i.bridgeSessionId) === r);
}

export {
  slugifySessionName,
  isAuthItem,
  tokenRole,
  deleteSessionRecord,
  writeSessionPeerRecord,
  LD,
  uds,
  fdt,
  teamLeadAddress,
  Lhr,
  MAi,
  d8,
  bOe,
  agentAddressLabel,
  describeSessionLocation,
  isStableAddressEnabled,
  PBe,
  describeAgentAddress,
  resolveUniqueCandidate,
  pdt,
  hasBridgeSessionId,
  Zxn,
  fds,
  isOwnSessionIdAmbiguous,
  cIt,
  udt,
  normalizeSessionTitle,
  IBe,
  q9t,
  b3e,
  Boo,
  PAi,
  classifySessionAddress,
  cds,
  cdt,
  readRecordPidDomain,
  isUntitledName,
  joo,
  pds,
  dIt,
  V9t,
  Y9t,
  ePn,
};
