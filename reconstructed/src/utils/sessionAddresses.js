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
import { join, basename } from "path";
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
import {
  PEER_TOKEN_HEX_RE,
  MAX_PEER_KEY_FILE_BYTES,
  PEER_KEY_FILE_RE,
  authenticatePeer,
  AUTH_MESSAGE_TYPE,
  AUTH,
  PEER_KEY_TMP_FILE_RE,
  MAIN,
} from "./sessionPeers.js";
import { isENOENT } from "./errors.js";
import { timingSafeEqualStrings } from "./sessionRecords.js";
import { normalizeAgentIdOrNull } from "./agentId.js";
import { TEAM_LEAD, USER, SYSTEM } from "./swarm/constants.js";
import { getTeamName } from "./teammate.js";
import { agentAddress, MAX_SEED_NAME_CHARS } from "./swarm/teammateIds.js";
import { mainAgentId, getSessionId } from "../bootstrap/state.js";
import { sessionIdBody } from "../bridge/sessionIdCompat.js";
import { formatDuration } from "./format.js";
import { isValidPipeOrPath, parseAddress, mayBeSamePath } from "./peerAddress.js";
import { isUnixSocketPath } from "./peerMessageHeaders.js";
import { uniq } from "./collections.js";
import { shortHash } from "./shortHash.js";
import { udsEnv } from "./env.js";

//@ chunk-e7z1g8a9.js:4406-4556 placement
function getMessagingKeyName(pid, n) {
  let r = hashCanonicalSocketPath(n);
  if (r === undefined) throw Error("refusing to derive a messaging key name for a non-canonical socket path");
  return `${pid}.${r}.key`;
}
//@ chunk-e7z1g8a9.js:4556-4831 placement = recordConsolidation (0.434)
async function writeSessionPeerRecord(e, peerToken, r, { sweepPermitted }) {
  if (isStorageV5Enabled() && r !== undefined) return ensureMessagingKeyDir(r, e, peerToken);
  let sessionsDir = getSessionsDir();
  await mkdir(sessionsDir, {
    recursive: true,
    mode: 448,
  });
  await pruneDeadSessionRecords(sessionsDir, sweepPermitted);
  let a = join(sessionsDir, getMessagingKeyName(process.pid, e));
  try {
    await unlink(a);
  } catch {}
  await writeFileAtomic(
    a,
    jsonStringify({
      peerToken,
      ...procIdentityFields(await ownProcStartAsync()),
      pidDomain: await ownPidDomain(),
    }),
    384,
  );
  return a;
}
//@ chunk-e7z1g8a9.js:4831-5393 placement
async function ensureMessagingKeyDir(e, n, peerToken) {
  let messagingKeyName = getMessagingKeyName(process.pid, n);
  let c = await e.ensureScope({
    namespace: "session",
  });
  if (!c.ok) {
    logForDebugging(`[uds-auth] sessions scope unavailable: ${formatStorageError(c.error)}`);
    throw Error("messaging key folder could not be made through storage");
  }
  try {
    await e.delete(STORAGE_SPACES.session(messagingKeyName));
  } catch {}
  let a = await e.write(
    STORAGE_SPACES.session(messagingKeyName),
    jsonStringify({
      peerToken,
      ...procIdentityFields(await ownProcStartAsync()),
      pidDomain: await ownPidDomain(),
    }),
    {
      publishDiscipline: "atomic",
      mode: 384,
      exactMode: 384,
    },
  );
  if (!a.ok) {
    logForDebugging(`[uds-auth] key publish failed: ${formatStorageError(a.error)}`);
    throw Error("messaging key could not be published through storage");
  }
  return join(getSessionsDir(), messagingKeyName);
}
//@ chunk-e7z1g8a9.js:5393-5540 placement
/**
 * 读取会话地址记录中的 pidDomain 字段（失败返回 undefined）。
 */
async function readRecordPidDomain(e) {
  try {
    let smallFileOrNull = await readSmallFileOrNull(e, PEER_TOKEN_HEX_RE);
    if (smallFileOrNull === null) return;
    let r = MAX_PEER_KEY_FILE_BYTES().safeParse(jsonParseRaw(smallFileOrNull));
    return r.success ? r.data.pidDomain : undefined;
  } catch {
    return;
  }
}
//@ chunk-e7z1g8a9.js:5540-5801 placement
async function pruneDeadSessionRecords(sessionsDir, sweepPermitted) {
  if (!sweepPermitted) return;
  let r;
  try {
    r = await readdir(sessionsDir);
  } catch {
    return;
  }
  let i = await ownPidDomain();
  await Promise.all(
    r.map(async (c) => {
      let match = PEER_KEY_FILE_RE.exec(c);
      if (!match || !isProcessProvablyGone(parseInt(match[1], 10))) return;
      let recordPidDomain = await readRecordPidDomain(join(sessionsDir, c));
      if (recordPidDomain !== undefined && recordPidDomain !== i) return;
      try {
        await unlink(join(sessionsDir, c));
      } catch {}
    }),
  );
}
//@ chunk-e7z1g8a9.js:5801-5920 placement
/**
 * 删除会话地址记录（存储 v5 时删除存储项，否则删除文件），错误忽略。
 */
async function deleteSessionRecord(activeKeyFile, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    try {
      await n.delete(STORAGE_SPACES.session(basename(activeKeyFile)));
    } catch {}
    return;
  }
  try {
    await unlink(activeKeyFile);
  } catch {}
}
//@ chunk-e7z1g8a9.js:5920-7262 placement
async function classifySessionAddress(e, n, r) {
  let sessionsDir = getSessionsDir();
  let c;
  if (isStorageV5Enabled() && n !== undefined) {
    let m = await authenticatePeer(n, {
      partialOnCap: false,
    });
    if (m === undefined)
      return {
        kind: "unusable",
      };
    c = m;
  } else
    try {
      c = await readdir(sessionsDir);
    } catch (error) {
      return isENOENT(error)
        ? {
            kind: "no-key",
          }
        : {
            kind: "unusable",
          };
    }
  let a = hashCanonicalSocketPath(e);
  if (a === undefined)
    return {
      kind: "no-key",
    };
  let f = `.${a}.key`;
  let filtered = c
    .filter((m) => m.endsWith(f))
    .map((m) => {
      let match = AUTH_MESSAGE_TYPE.exec(m);
      return match
        ? {
            file: m,
            pid: parseInt(match[1], 10),
          }
        : undefined;
    })
    .filter((m) => m !== undefined);
  if (filtered.length === 0)
    return {
      kind: "no-key",
    };
  let k = async (file) => {
    let h =
      isStorageV5Enabled() && n !== undefined
        ? await readSessionRecord(n, file)
        : await readSmallFileOrNull(join(sessionsDir, file), PEER_TOKEN_HEX_RE);
    if (h === null) return;
    try {
      let y = MAX_PEER_KEY_FILE_BYTES().safeParse(jsonParseRaw(h));
      return y.success ? y.data : undefined;
    } catch {
      return;
    }
  };
  if (filtered.length === 1) {
    let m = filtered[0];
    if (r?.requireLiveOwner && isProcessProvablyGone(m.pid))
      return {
        kind: "dead-owner",
      };
    let h = await k(m.file);
    if (h === undefined)
      return {
        kind: "unusable",
      };
    if (r?.requireLiveOwner) {
      let y = procIdentityOf(h);
      if (y !== undefined) {
        let processStartTime = await getProcessStartTimeAsync(m.pid, {
          skipCache: true,
        });
        if (processStartTime !== undefined && !startTokensEqualOrCrossFormat(y, processStartTime))
          return {
            kind: "dead-owner",
          };
      }
    }
    return {
      kind: "token",
      token: h.peerToken,
    };
  }
  let S;
  for (let { file, pid } of filtered) {
    let y = await k(file);
    if (y === undefined) continue;
    let E = 0;
    if (!isProcessProvablyGone(pid)) {
      let w = procIdentityOf(y);
      let R =
        w === undefined
          ? undefined
          : await getProcessStartTimeAsync(pid, {
              skipCache: true,
            });
      if (w === undefined || R === undefined) E = 1;
      else E = startTokensEqualOrCrossFormat(w, R) ? 2 : 0;
    }
    if (S === undefined || E > S.rank)
      S = {
        rank: E,
        peerToken: y.peerToken,
      };
  }
  if (S === undefined)
    return {
      kind: "unusable",
    };
  if (r?.requireLiveOwner && S.rank === 0)
    return {
      kind: "dead-owner",
    };
  return {
    kind: "token",
    token: S.peerToken,
  };
}
//@ chunk-e7z1g8a9.js:7262-7473 placement
async function readSessionRecord(e, n) {
  try {
    let text = await e.readText([
      {
        key: STORAGE_SPACES.session(n),
        offset: 0,
        length: PEER_TOKEN_HEX_RE + 1,
      },
    ]);
    if (!text.ok) return null;
    let i = text.value.items[0];
    if (!i.found || i.totalBytes > PEER_TOKEN_HEX_RE) return null;
    return i.value;
  } catch {
    return null;
  }
}
//@ chunk-e7z1g8a9.js:7473-7520 placement
/**
 * authHandshakeJson：构造带尾随空格的认证握手 JSON。
 */
function authHandshakeJson(token) {
  return (
    jsonStringify({
      type: AUTH,
      token,
    }) +
    `
`
  );
}
//@ chunk-e7z1g8a9.js:7520-7556 placement
/**
 * AUTH_HANDSHAKE_LENGTH：认证握手 JSON 的长度。
 */
var AUTH_HANDSHAKE_LENGTH = authHandshakeJson("0".repeat(PEER_KEY_TMP_FILE_RE * 2)).length;
//@ chunk-e7z1g8a9.js:7556-7633 placement = extractErrorTypeFromData (1)
/**
 * 是否是指定 type 的对象。
 */
function isAuthItem(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === AUTH;
}
//@ chunk-e7z1g8a9.js:7633-7749 placement
/**
 * 用常量时间比较判断令牌是对等令牌还是子会话令牌。
 */
function tokenRole(token, activeTokens) {
  if (activeTokens === undefined) return;
  if (timingSafeEqualStrings(token, activeTokens.peerToken)) return "peer";
  if (timingSafeEqualStrings(token, activeTokens.childToken)) return "child";
  return;
}
//@ chunk-e7z1g8a9.js:7749-7897 placement
/**
 * 读取会话稳定地址功能开关（tengu_session_stable_address），出错视为关闭。
 */
function isStableAddressEnabled() {
  let { getFeatureValue_SESSION_PINNED } = require("./chunk-6df1d6re.js");
  try {
    return getFeatureValue_SESSION_PINNED("tengu_session_stable_address", false);
  } catch {
    return false;
  }
}
//@ chunk-e7z1g8a9.js:7897-7911 placement
var STABLE_SESSION_ID_PREFIX = "sid:";
//@ chunk-e7z1g8a9.js:7911-7945 placement
/**
 * stableSessionAddress：由会话 id 生成 sid: 地址。
 */
function stableSessionAddress(sessionId) {
  return `${STABLE_SESSION_ID_PREFIX}${sessionId}`;
}
//@ chunk-e7z1g8a9.js:7945-7985 placement
/**
 * isStableSessionAddress：是否为 sid: 地址。
 */
function isStableSessionAddress(e) {
  return e.startsWith(STABLE_SESSION_ID_PREFIX);
}
//@ chunk-e7z1g8a9.js:7985-8020 placement
/**
 * isNotStableAddress：地址不是稳定形式。
 */
function isNotStableAddress(e) {
  return !isStableSessionAddress(e.sock);
}
//@ chunk-e7z1g8a9.js:8020-8158 placement
/**
 * 判断会话名是否等同于未命名（空、规范化后为空或为 untitled session）。
 */
function isUntitledName(title) {
  let n = typeof title === "string" ? title.trim() : "";
  let r = normalizeSessionTitle(n);
  return !n || !r || (r === "untitled session" && n.toLowerCase() !== "untitled session");
}
//@ chunk-e7z1g8a9.js:8158-8238 placement
/**
 * hasEnvironmentKindOtherThanBridge：环境种类非 bridge。
 */
function hasEnvironmentKindOtherThanBridge(e) {
  return e.environmentKind !== undefined && e.environmentKind !== "bridge";
}
//@ chunk-e7z1g8a9.js:8238-8286 placement
/**
 * isDisconnectedNonBridge：非 bridge 且未连接。
 */
function isDisconnectedNonBridge(e) {
  return !hasEnvironmentKindOtherThanBridge(e) && e.connected === false;
}
//@ chunk-e7z1g8a9.js:8286-8426 placement
/**
 * 把会话名规范化为地址用的 slug（NFKC、去控制字符、小写、空白转连字符）。
 */
function slugifySessionName(e) {
  return e
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (n) => (/\s/.test(n) ? n : ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}
//@ chunk-e7z1g8a9.js:8426-8466 placement
/**
 * isAddressableSlug：会话名 slug 可寻址。
 */
function isAddressableSlug(recipient) {
  return normalizeAgentIdOrNull(slugifySessionName(recipient)) !== null;
}
//@ chunk-e7z1g8a9.js:8466-8516 placement
/**
 * isReservedOrInvalidName：名字无效或为保留名。
 */
function isReservedOrInvalidName(name) {
  return typeof name !== "string" || isReservedSessionName(name);
}
//@ chunk-e7z1g8a9.js:8516-8580 placement
/**
 * isLocalTeamLead：本会话是该团队的领导。
 */
function isLocalTeamLead(e, n) {
  return e.name === TEAM_LEAD && n !== undefined && e.agentId === n;
}
//@ chunk-e7z1g8a9.js:8580-8709 placement
/**
 * 取团队领导的地址：本会话是领导时用其 agent id，否则由团队名推出。
 */
function teamLeadAddress(e) {
  let teamContext = e.teamContext;
  if (teamContext?.leadAgentId && teamContext.isLeader !== false) return teamContext.leadAgentId;
  let teamName = getTeamName(teamContext);
  return teamName ? agentAddress(TEAM_LEAD, teamName) : undefined;
}
//@ chunk-e7z1g8a9.js:8709-8780 placement
/**
 * addressableTeamMembers：团队里可寻址的成员。
 */
function addressableTeamMembers(teamFile, n) {
  return teamFile.members.filter(
    (member) => isLocalTeamLead(member, n) || !isReservedOrInvalidName(member.name),
  );
}
//@ chunk-e7z1g8a9.js:8780-8861 placement
/**
 * isReservedSessionName：名字是保留名（main/team-lead/user/system）。
 */
function isReservedSessionName(e) {
  let n = slugifySessionName(e);
  return n === MAIN || n === TEAM_LEAD || n === USER || n === SYSTEM || normalizeAgentIdOrNull(n) !== null;
}
//@ chunk-e7z1g8a9.js:8861-8949 placement
/**
 * MIN_ADDRESS_REF_LENGTH：地址 ref 的最短长度；MAX_ADDRESS_REF_LENGTH：地址 ref 的最长长度；ADDRESS_REF_PATTERN：地址 ref 的十六进制模式（同一声明共 3 个绑定）。
 */
var MIN_ADDRESS_REF_LENGTH = 6;
var MAX_ADDRESS_REF_LENGTH = 12;
var ADDRESS_REF_PATTERN = `[0-9a-f]{${MIN_ADDRESS_REF_LENGTH},${MAX_ADDRESS_REF_LENGTH}}`;
var regExp_2 = new RegExp(`^(.*\\S)\\s*\\[(${ADDRESS_REF_PATTERN})\\]$`);
//@ chunk-e7z1g8a9.js:8949-9023 placement
/**
 * parseNameWithRef：解析 “名字 [ref]” 形式的地址。
 */
function parseNameWithRef(e) {
  let match = regExp_2.exec(e.trim());
  return match
    ? {
        name: match[1],
        ref: match[2],
      }
    : null;
}
//@ chunk-e7z1g8a9.js:9023-11961 placement
/**
 * 生成代理/会话地址的显示描述（main、in-process、teammate、local_agent）
 */
function describeAgentAddress(e, n) {
  let r = [];
  r.push({
    name: MAIN,
    id: mainAgentId(),
    kind: "main",
    where: "in-process",
    lastActive: undefined,
    sock: undefined,
  });
  let i = new Set();
  for (let [key, value] of Object.entries(e.teamContext?.teammates ?? {})) {
    i.add(key);
    r.push({
      name: value.name,
      id: key,
      kind: "teammate",
      where: "in-process",
      lastActive: undefined,
      sock: undefined,
    });
  }
  for (let [s, l] of e.agentNameRegistry) {
    let b = e.tasks[l];
    let A = b?.type === "local_agent" ? b : undefined;
    r.push({
      name: s,
      id: l,
      kind: "subagent",
      where: "in-process",
      lastActive: A?.startTime,
      sock: undefined,
    });
  }
  for (let s of n.teamFile?.members ?? []) {
    if (i.has(s.agentId)) continue;
    i.add(s.agentId);
    r.push({
      name: s.name,
      id: s.agentId,
      kind: "teammate",
      where: "this-machine",
      lastActive: undefined,
      sock: undefined,
    });
  }
  let c = isStableAddressEnabled();
  let filtered = n.sessions.filter(isNotStableAddress);
  let f = c ? groupBySocket(filtered) : undefined;
  let g = c ? ambiguousSessionIds(getSessionId(), filtered, f) : undefined;
  for (let s of filtered) {
    let claims = f?.get(s)?.claims;
    r.push({
      name: s.name || basename(s.cwd),
      id: s.sock,
      kind: "session",
      where: "this-machine",
      lastActive: s.statusUpdatedAt,
      sock: s.sock,
      ...(claims !== undefined &&
        claims.size > 0 && {
          claimedSessionIds: [...claims].sort(),
        }),
      ...(c &&
        s.sessionId !== undefined &&
        !g.has(s.sessionId) && {
          stableId: stableSessionAddress(s.sessionId),
        }),
      ...(c &&
        s.nameSource === "derived" && {
          derivedName: true,
        }),
      ...(s.hostSessionId !== undefined && {
        hostSessionId: s.hostSessionId,
      }),
    });
  }
  let k = new Map();
  for (let session of n.sessions)
    if (session.bridgeSessionId !== undefined) {
      let l = sessionIdBody(session.bridgeSessionId);
      k.set(l, [...(k.get(l) ?? []), session.sock]);
    }
  let S = [];
  for (let s of n.cloud ?? []) {
    if (hasBridgeSessionId(n.sessions, s.id)) {
      S.push({
        rawName: s.title || "untitled",
        socks: k.get(sessionIdBody(s.id)) ?? [],
      });
      continue;
    }
    r.push({
      name: s.title || "untitled",
      id: s.id,
      kind: "cloud-session",
      ...(isUntitledName(s.title) && {
        derivedName: true,
      }),
      ...(s.acceptsPeerMessages === true && {
        reportsInbound: true,
      }),
      where: s.remoteControl ? "remote" : "cloud",
      lastActive: s.lastActive,
      sock: undefined,
      ...(s.offline && {
        offline: true,
      }),
    });
  }
  let m = new Set((n.cloud ?? []).map((s) => sessionIdBody(s.id)));
  let h = bridgeSessionIds(n.sessions);
  for (let s of n.bridge ?? []) {
    let l = sessionIdBody(s.id);
    if (m.has(l)) continue;
    if (h.has(l)) {
      S.push({
        rawName: s.title || "untitled",
        socks: k.get(l) ?? [],
      });
      continue;
    }
    let timestamp = Date.parse(s.updated_at);
    r.push({
      name: s.title || "untitled",
      id: s.id,
      kind: "bridge-session",
      ...(isUntitledName(s.title) && {
        derivedName: true,
      }),
      ...(s.acceptsPeerMessages === true && {
        reportsInbound: true,
      }),
      ...(s.inboundReportUnavailable && {
        inboundReportUnavailable: true,
      }),
      where: hasEnvironmentKindOtherThanBridge(s) ? "cloud" : "remote",
      lastActive: Number.isNaN(timestamp) ? undefined : timestamp,
      sock: undefined,
      ...(isDisconnectedNonBridge(s) && {
        offline: true,
      }),
    });
  }
  let y = teamLeadAddress(e);
  let flattened = r.flatMap((s) => {
    let l = normalizeSessionTitle(s.name);
    if (l === null || !isPlainAddressableName(l)) return [];
    let b =
      s.kind === "main" ||
      (s.kind === "teammate" &&
        isLocalTeamLead(
          {
            name: s.name,
            agentId: s.id,
          },
          y,
        ));
    let A =
      (s.kind === "session" || s.kind === "cloud-session" || s.kind === "bridge-session") &&
      slugifySessionName(l) === MAIN;
    return b || A || !isReservedOrInvalidName(l)
      ? [
          {
            ...s,
            name: l,
          },
        ]
      : [];
  });
  let w = new Set();
  let R = assignShortRefs(
    flattened.filter((s) => {
      if (s.kind !== "session") return true;
      let l = `${slugifySessionName(s.name)}\x00${canonicalSocketPath(s.id) ?? s.id}`;
      if (w.has(l)) return false;
      w.add(l);
      return true;
    }),
  );
  let P = new Map();
  for (let s of R) {
    let l = slugifySessionName(s.name);
    let b = P.get(l);
    if (b) b.push(s);
    else P.set(l, [s]);
  }
  let C = new Map();
  for (let { rawName, socks } of S) {
    let b = normalizeSessionTitle(rawName);
    if (b === null || !isPlainAddressableName(b)) continue;
    let A = slugifySessionName(b);
    let L = C.get(A) ?? new Set();
    for (let sock of socks) L.add(sock);
    C.set(A, L);
  }
  return {
    candidates: R,
    byName: P,
    remoteNamesClaimedLocally: C,
  };
}
//@ chunk-e7z1g8a9.js:11961-12173 placement
/**
 * 在按名称分组的候选中解析唯一目标：同进程的直接返回，否则视为有歧义。
 */
function resolveUniqueCandidate(byName, n, r) {
  let i = byName.get(n);
  if (!i || i.length === 0) return;
  let c = r === undefined ? [] : i.filter((g) => g.name === r);
  let f = (c.length > 0 ? c : i)[0];
  if (f.where === "in-process")
    return {
      kind: "one",
      candidate: f,
    };
  return {
    kind: "ambiguous",
  };
}
//@ chunk-e7z1g8a9.js:12173-12218 placement
/**
 * formatNameWithRef：拼成 “名字 [ref]”。
 */
function formatNameWithRef(e) {
  return `${e.name} [${e.ref}]`;
}
//@ chunk-e7z1g8a9.js:12218-12290 placement
/**
 * describeLocationWithRemoteControl：远程位置补 “(Remote Control)”。
 */
function describeLocationWithRemoteControl(where) {
  return where === "remote"
    ? `${describeSessionLocation(where)} (Remote Control)`
    : describeSessionLocation(where);
}
//@ chunk-e7z1g8a9.js:12290-12474 placement
/**
 * 会话位置的文字描述（本会话、云端、其他机器、本机）。
 */
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
        : e.kind;
  let i = describeLocationWithRemoteControl(e.where);
  let c =
    e.lastActive === undefined
      ? ""
      : `, ${e.kind === "subagent" ? "started" : "active"} ${formatDuration(Math.max(0, n - e.lastActive), {
          mostSignificantOnly: true,
        })} ago`;
  return `${formatNameWithRef(e)} \u2014 ${r}, ${i}${c}`;
}
//@ chunk-e7z1g8a9.js:12821-12831 placement
var MAX_SESSION_TITLE_LENGTH = MAX_SEED_NAME_CHARS;
//@ chunk-e7z1g8a9.js:12831-13027 placement
/**
 * 规范化会话标题：去控制字符、合并空白、截断长度，空时为 untitled session。
 */
function normalizeSessionTitle(e) {
  if (typeof e !== "string") return null;
  return (
    [
      ...e
        .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (r) => (/\s/.test(r) ? r : ""))
        .replace(/\s+/g, " ")
        .trim(),
    ]
      .slice(0, MAX_SESSION_TITLE_LENGTH)
      .join("")
      .trim() || "untitled session"
  );
}
//@ chunk-e7z1g8a9.js:13027-13106 placement
/**
 * findSessionByName：按名字或规范名查找会话。
 */
function findSessionByName(e, n) {
  return e.find((r) => r.name === n) ?? e.find((r) => normalizeSessionTitle(r.name) === n);
}
//@ chunk-e7z1g8a9.js:13106-13174 placement
/**
 * addressableSessionTitle：可作为地址的会话标题。
 */
function addressableSessionTitle(e) {
  let n = normalizeSessionTitle(e);
  return n !== null && !looksLikeAddress(n) && isValidPipeOrPath(n) ? n : null;
}
//@ chunk-e7z1g8a9.js:13174-13240 placement
/**
 * plainSessionName：普通（非保留、非地址形式）会话名。
 */
function plainSessionName(name) {
  let n = normalizeSessionTitle(name);
  return n !== null && isPlainAddressableName(n) && !isReservedSessionName(n) ? n : null;
}
//@ chunk-e7z1g8a9.js:13240-13302 placement
function isPlainAddressableName(e) {
  return !looksLikeAddress(e) && isValidPipeOrPath(e) && !e.includes("@") && e !== "*";
}
//@ chunk-e7z1g8a9.js:13302-13400 placement
/**
 * looksLikeAddress：名字像地址（任一变体）。
 */
function looksLikeAddress(e) {
  let n = slugifySessionName(e);
  return (
    parseAddress(e).scheme !== "other" ||
    parseAddress(n).scheme !== "other" ||
    isUnixSocketPath(e) ||
    isUnixSocketPath(n)
  );
}
//@ chunk-e7z1g8a9.js:13400-13729 placement
/**
 * 为会话地址列表分配最短可区分前缀 ref：与相邻（排序后）地址比较公共前缀长度，ref 长度至少 M。
 */
function assignShortRefs(e) {
  let mapped = e.map((a) => addressHashKey(a.kind, stableSessionKey(a)));
  let mapped_2 = messagingSocketAddresses().map((a) => addressHashKey("session", a));
  let sorted = uniq([...mapped, ...mapped_2]).sort();
  let c = new Map();
  for (let k = 0; k < sorted.length; k++) {
    let f = sorted[k];
    let max = Math.max(
      k > 0 ? commonPrefixLength(f, sorted[k - 1]) : 0,
      k + 1 < sorted.length ? commonPrefixLength(f, sorted[k + 1]) : 0,
    );
    c.set(f, Math.min(f.length, Math.max(MIN_ADDRESS_REF_LENGTH, max + 1)));
  }
  return e.map((a, f) => {
    let g = mapped[f];
    return {
      ...a,
      ref: g.slice(0, c.get(g)),
    };
  });
}
//@ chunk-e7z1g8a9.js:13729-13809 placement
function commonPrefixLength(e, n) {
  let r = 0;
  while (r < e.length && r < n.length && e[r] === n[r]) r++;
  return r;
}
//@ chunk-e7z1g8a9.js:13809-13856 placement
function addressHashKey(e, n) {
  return String(shortHash(`${e}:${n}`));
}
//@ chunk-e7z1g8a9.js:13856-13896 placement
/**
 * stableSessionKey：会话的稳定 id 或 id。
 */
function stableSessionKey(e) {
  return e.stableId ?? e.id;
}
//@ chunk-e7z1g8a9.js:13896-13975 placement
function messagingSocketAddresses() {
  let CLAUDE_CODE_MESSAGING_SOCKET = udsEnv.CLAUDE_CODE_MESSAGING_SOCKET;
  return CLAUDE_CODE_MESSAGING_SOCKET === undefined ? [] : addressVariants(CLAUDE_CODE_MESSAGING_SOCKET);
}
//@ chunk-e7z1g8a9.js:13975-14015 placement
/**
 * stableAddressWhenEnabled：稳定地址开启时用 sid: 形式。
 */
function stableAddressWhenEnabled(e) {
  return isStableAddressEnabled() ? stableSessionAddress(getSessionId()) : e;
}
//@ chunk-e7z1g8a9.js:14015-14066 placement
function addressVariants(e) {
  let n = stableAddressWhenEnabled(e);
  return n === e ? [e] : [n, e];
}
//@ chunk-e7z1g8a9.js:14066-14126 placement
/**
 * isSessionAddressUnder：地址组里是否含该会话地址。
 */
function isSessionAddressUnder(ref, n) {
  return addressVariants(n).some((r) => refMatchesAddress(ref, "session", r));
}
//@ chunk-e7z1g8a9.js:14126-14522 placement
/**
 * 按 socket 路径把会话地址记录分组：可能同一路径的记录合并为一组并汇总声明的会话 id，返回记录 → 组的映射。
 */
function groupBySocket(e) {
  let n = [];
  for (let i of e) {
    let filtered = n.filter((f) => f.records.some((record) => mayBeSamePath(record.sock, i.sock)));
    let a = {
      records: [],
      claims: new Set(),
    };
    for (let f of filtered) {
      a.records.push(...f.records);
      for (let claim of f.claims) a.claims.add(claim);
    }
    a.records.push(i);
    if (i.sessionId !== undefined) a.claims.add(i.sessionId);
    n = n.filter((f) => !filtered.includes(f));
    n.push(a);
  }
  let r = new Map();
  for (let i of n) for (let record of i.records) r.set(record, i);
  return r;
}
//@ chunk-e7z1g8a9.js:14522-14774 placement
function ambiguousSessionIds(e, n, r) {
  let i = new Set([e]);
  let c = new Set();
  for (let a of n) {
    if (a.sessionId === undefined) continue;
    if (i.has(a.sessionId)) c.add(a.sessionId);
    i.add(a.sessionId);
  }
  for (let a of new Set(r.values())) if (a.records.length > 1) for (let claim of a.claims) c.add(claim);
  return c;
}
//@ chunk-e7z1g8a9.js:14774-14914 placement
/**
 * 判断本会话 id 在会话地址记录中是否存在歧义（多个 socket 声明同一会话）。
 */
function isOwnSessionIdAmbiguous(e, sock, r) {
  if (r) return true;
  let sessionId = getSessionId();
  let filtered = e.filter(isNotStableAddress);
  if (sock !== undefined)
    filtered.push({
      sock,
      sessionId,
    });
  let a = groupBySocket(filtered);
  return ambiguousSessionIds("", filtered, a).has(sessionId);
}
//@ chunk-e7z1g8a9.js:14914-14957 placement
/**
 * addressRef：取地址的前缀 ref。
 */
function addressRef(kind, id) {
  return addressHashKey(kind, id).slice(0, MIN_ADDRESS_REF_LENGTH);
}
//@ chunk-e7z1g8a9.js:14957-15017 placement
function refMatchesAddress(e, n, r) {
  return e.length >= MIN_ADDRESS_REF_LENGTH && addressHashKey(n, r).startsWith(e);
}
//@ chunk-e7z1g8a9.js:15017-15110 placement
/**
 * bridgeSessionIds：记录中出现的桥接会话 id。
 */
function bridgeSessionIds(sessions) {
  return new Set(sessions.flatMap((n) => (n.bridgeSessionId ? [sessionIdBody(n.bridgeSessionId)] : [])));
}
//@ chunk-e7z1g8a9.js:15110-15214 placement
/**
 * 判断地址记录中是否有与给定 id 对应的桥接会话 id。
 */
function hasBridgeSessionId(e, id) {
  let r = sessionIdBody(id);
  return e.some((i) => i.bridgeSessionId !== undefined && sessionIdBody(i.bridgeSessionId) === r);
}
export {
  slugifySessionName,
  isAuthItem,
  tokenRole,
  deleteSessionRecord,
  writeSessionPeerRecord,
  isReservedSessionName,
  MAX_ADDRESS_REF_LENGTH,
  addressableTeamMembers,
  teamLeadAddress,
  findSessionByName,
  isAddressableSlug,
  parseNameWithRef,
  formatNameWithRef,
  agentAddressLabel,
  describeSessionLocation,
  isStableAddressEnabled,
  ADDRESS_REF_PATTERN,
  describeAgentAddress,
  resolveUniqueCandidate,
  addressRef,
  hasBridgeSessionId,
  plainSessionName,
  stableAddressWhenEnabled,
  isOwnSessionIdAmbiguous,
  isLocalTeamLead,
  isReservedOrInvalidName,
  normalizeSessionTitle,
  addressableSessionTitle,
  looksLikeAddress,
  hasEnvironmentKindOtherThanBridge,
  isDisconnectedNonBridge,
  AUTH_HANDSHAKE_LENGTH,
  classifySessionAddress,
  authHandshakeJson,
  isNotStableAddress,
  readRecordPidDomain,
  isUntitledName,
  describeLocationWithRemoteControl,
  isSessionAddressUnder,
  isStableSessionAddress,
  stableSessionAddress,
  bridgeSessionIds,
  stableSessionKey,
};
