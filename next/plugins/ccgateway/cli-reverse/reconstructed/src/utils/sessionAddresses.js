/**
 * utils/sessionAddresses.ts
 *
 * 会话地址（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p21mddyh.js (57)
 * attribution: placement 57
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  MAX_PEER_KEY_FILE_BYTES,
  peerKeyFileSchema,
  PEER_KEY_TMP_FILE_RE,
  authenticatePeer,
  PEER_KEY_FILE_RE,
  AUTH,
  PEER_TOKEN_BYTES,
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { shortHash } from "./shortHash.js";
import { udsEnv } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p21mddyh.js:4408-4558 placement
function getMessagingKeyName(pid, socketPath) {
  let hash = hashCanonicalSocketPath(socketPath);
  if (hash === undefined)
    throw Error("refusing to derive a messaging key name for a non-canonical socket path");
  return `${pid}.${hash}.key`;
}
//@ chunk-p21mddyh.js:4558-4833 placement (2.1.88 match: recordConsolidation, 0.434)
async function writeSessionPeerRecord(socketPath, peerToken, store, { sweepPermitted }) {
  if (isStorageV5Enabled() && store !== undefined) return ensureMessagingKeyDir(store, socketPath, peerToken);
  let sessionsDir = getSessionsDir();
  await mkdir(sessionsDir, {
    recursive: true,
    mode: 448,
  });
  await pruneDeadSessionRecords(sessionsDir, sweepPermitted);
  let keyPath = join(sessionsDir, getMessagingKeyName(process.pid, socketPath));
  try {
    await unlink(keyPath);
  } catch {}
  await writeFileAtomic(
    keyPath,
    jsonStringify({
      peerToken,
      ...procIdentityFields(await ownProcStartAsync()),
      pidDomain: await ownPidDomain(),
    }),
    384,
  );
  return keyPath;
}
//@ chunk-p21mddyh.js:4833-5395 placement
async function ensureMessagingKeyDir(store, socketPath, peerToken) {
  let messagingKeyName = getMessagingKeyName(process.pid, socketPath);
  let scope = await store.ensureScope({
    namespace: "session",
  });
  if (!scope.ok) {
    logForDebugging(`[uds-auth] sessions scope unavailable: ${formatStorageError(scope.error)}`);
    throw Error("messaging key folder could not be made through storage");
  }
  try {
    await store.delete(STORAGE_SPACES.session(messagingKeyName));
  } catch {}
  let written = await store.write(
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
  if (!written.ok) {
    logForDebugging(`[uds-auth] key publish failed: ${formatStorageError(written.error)}`);
    throw Error("messaging key could not be published through storage");
  }
  return join(getSessionsDir(), messagingKeyName);
}
//@ chunk-p21mddyh.js:5395-5542 placement
/**
 * 读取会话地址记录中的 pidDomain 字段（失败返回 undefined）。
 */
async function readRecordPidDomain(path) {
  try {
    let smallFileOrNull = await readSmallFileOrNull(path, MAX_PEER_KEY_FILE_BYTES);
    if (smallFileOrNull === null) return;
    let parsed = peerKeyFileSchema().safeParse(jsonParseRaw(smallFileOrNull));
    return parsed.success ? parsed.data.pidDomain : undefined;
  } catch {
    return;
  }
}
//@ chunk-p21mddyh.js:5542-5803 placement
async function pruneDeadSessionRecords(sessionsDir, sweepPermitted) {
  if (!sweepPermitted) return;
  let files;
  try {
    files = await readdir(sessionsDir);
  } catch {
    return;
  }
  let myPidDomain = await ownPidDomain();
  await Promise.all(
    files.map(async (file) => {
      let match = PEER_KEY_TMP_FILE_RE.exec(file);
      if (!match || !isProcessProvablyGone(parseInt(match[1], 10))) return;
      let recordPidDomain = await readRecordPidDomain(join(sessionsDir, file));
      if (recordPidDomain !== undefined && recordPidDomain !== myPidDomain) return;
      try {
        await unlink(join(sessionsDir, file));
      } catch {}
    }),
  );
}
//@ chunk-p21mddyh.js:5803-5922 placement
/**
 * 删除会话地址记录（存储 v5 时删除存储项，否则删除文件），错误忽略。
 */
async function deleteSessionRecord(activeKeyFile, store) {
  if (isStorageV5Enabled() && store !== undefined) {
    try {
      await store.delete(STORAGE_SPACES.session(basename(activeKeyFile)));
    } catch {}
    return;
  }
  try {
    await unlink(activeKeyFile);
  } catch {}
}
//@ chunk-p21mddyh.js:5922-7264 placement
async function classifySessionAddress(socketPath, store, options) {
  let sessionsDir = getSessionsDir();
  let files;
  if (isStorageV5Enabled() && store !== undefined) {
    let storeFiles = await authenticatePeer(store, {
      partialOnCap: false,
    });
    if (storeFiles === undefined)
      return {
        kind: "unusable",
      };
    files = storeFiles;
  } else
    try {
      files = await readdir(sessionsDir);
    } catch (error) {
      return isENOENT(error)
        ? {
            kind: "no-key",
          }
        : {
            kind: "unusable",
          };
    }
  let hash = hashCanonicalSocketPath(socketPath);
  if (hash === undefined)
    return {
      kind: "no-key",
    };
  let suffix = `.${hash}.key`;
  let filtered = files
    .filter((file) => file.endsWith(suffix))
    .map((file) => {
      let match = PEER_KEY_FILE_RE.exec(file);
      return match
        ? {
            file,
            pid: parseInt(match[1], 10),
          }
        : undefined;
    })
    .filter((candidate) => candidate !== undefined);
  if (filtered.length === 0)
    return {
      kind: "no-key",
    };
  let readRecord = async (key) => {
    let text =
      isStorageV5Enabled() && store !== undefined
        ? await readSessionRecord(store, key)
        : await readSmallFileOrNull(join(sessionsDir, key), MAX_PEER_KEY_FILE_BYTES);
    if (text === null) return;
    try {
      let parsed = peerKeyFileSchema().safeParse(jsonParseRaw(text));
      return parsed.success ? parsed.data : undefined;
    } catch {
      return;
    }
  };
  if (filtered.length === 1) {
    let candidate = filtered[0];
    if (options?.requireLiveOwner && isProcessProvablyGone(candidate.pid))
      return {
        kind: "dead-owner",
      };
    let record = await readRecord(candidate.file);
    if (record === undefined)
      return {
        kind: "unusable",
      };
    if (options?.requireLiveOwner) {
      let identity = procIdentityOf(record);
      if (identity !== undefined) {
        let processStartTime = await getProcessStartTimeAsync(candidate.pid, {
          skipCache: true,
        });
        if (processStartTime !== undefined && !startTokensEqualOrCrossFormat(identity, processStartTime))
          return {
            kind: "dead-owner",
          };
      }
    }
    return {
      kind: "token",
      token: record.peerToken,
    };
  }
  let best;
  for (let { file, pid } of filtered) {
    let record = await readRecord(file);
    if (record === undefined) continue;
    let rank = 0;
    if (!isProcessProvablyGone(pid)) {
      let identity = procIdentityOf(record);
      let startTime =
        identity === undefined
          ? undefined
          : await getProcessStartTimeAsync(pid, {
              skipCache: true,
            });
      if (identity === undefined || startTime === undefined) rank = 1;
      else rank = startTokensEqualOrCrossFormat(identity, startTime) ? 2 : 0;
    }
    if (best === undefined || rank > best.rank)
      best = {
        rank,
        peerToken: record.peerToken,
      };
  }
  if (best === undefined)
    return {
      kind: "unusable",
    };
  if (options?.requireLiveOwner && best.rank === 0)
    return {
      kind: "dead-owner",
    };
  return {
    kind: "token",
    token: best.peerToken,
  };
}
//@ chunk-p21mddyh.js:7264-7475 placement
async function readSessionRecord(store, key) {
  try {
    let text = await store.readText([
      {
        key: STORAGE_SPACES.session(key),
        offset: 0,
        length: MAX_PEER_KEY_FILE_BYTES + 1,
      },
    ]);
    if (!text.ok) return null;
    let item = text.value.items[0];
    if (!item.found || item.totalBytes > MAX_PEER_KEY_FILE_BYTES) return null;
    return item.value;
  } catch {
    return null;
  }
}
//@ chunk-p21mddyh.js:7475-7522 placement
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
//@ chunk-p21mddyh.js:7522-7558 placement
/**
 * AUTH_HANDSHAKE_LENGTH：认证握手 JSON 的长度。
 */
var AUTH_HANDSHAKE_LENGTH; // deferred: uses authHandshakeJson of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p21mddyh.js:7522", () => {
  AUTH_HANDSHAKE_LENGTH = authHandshakeJson("0".repeat(PEER_TOKEN_BYTES * 2)).length;
});
//@ chunk-p21mddyh.js:7558-7635 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 是否是指定 type 的对象。
 */
function isAuthItem(data) {
  return typeof data === "object" && data !== null && "type" in data && data.type === AUTH;
}
//@ chunk-p21mddyh.js:7635-7751 placement
/**
 * 用常量时间比较判断令牌是对等令牌还是子会话令牌。
 */
function tokenRole(token, activeTokens) {
  if (activeTokens === undefined) return;
  if (timingSafeEqualStrings(token, activeTokens.peerToken)) return "peer";
  if (timingSafeEqualStrings(token, activeTokens.childToken)) return "child";
  return;
}
//@ chunk-p21mddyh.js:7751-7899 placement
/**
 * 读取会话稳定地址功能开关（tengu_session_stable_address），出错视为关闭。
 */
function isStableAddressEnabled() {
  let { getFeatureValue_SESSION_PINNED } = require("../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
  try {
    return getFeatureValue_SESSION_PINNED("tengu_session_stable_address", false);
  } catch {
    return false;
  }
}
//@ chunk-p21mddyh.js:7899-7913 placement
var STABLE_SESSION_ID_PREFIX = "sid:";
//@ chunk-p21mddyh.js:7913-7947 placement
/**
 * stableSessionAddress：由会话 id 生成 sid: 地址。
 */
function stableSessionAddress(sessionId) {
  return `${STABLE_SESSION_ID_PREFIX}${sessionId}`;
}
//@ chunk-p21mddyh.js:7947-7987 placement
/**
 * isStableSessionAddress：是否为 sid: 地址。
 */
function isStableSessionAddress(address) {
  return address.startsWith(STABLE_SESSION_ID_PREFIX);
}
//@ chunk-p21mddyh.js:7987-8022 placement
/**
 * isNotStableAddress：地址不是稳定形式。
 */
function isNotStableAddress(session) {
  return !isStableSessionAddress(session.sock);
}
//@ chunk-p21mddyh.js:8022-8160 placement
/**
 * 判断会话名是否等同于未命名（空、规范化后为空或为 untitled session）。
 */
function isUntitledName(title) {
  let text = typeof title === "string" ? title.trim() : "";
  let normalized = normalizeSessionTitle(text);
  return (
    !text || !normalized || (normalized === "untitled session" && text.toLowerCase() !== "untitled session")
  );
}
//@ chunk-p21mddyh.js:8160-8240 placement
/**
 * hasEnvironmentKindOtherThanBridge：环境种类非 bridge。
 */
function hasEnvironmentKindOtherThanBridge(bridge) {
  return bridge.environmentKind !== undefined && bridge.environmentKind !== "bridge";
}
//@ chunk-p21mddyh.js:8240-8288 placement
/**
 * isDisconnectedNonBridge：非 bridge 且未连接。
 */
function isDisconnectedNonBridge(bridge) {
  return !hasEnvironmentKindOtherThanBridge(bridge) && bridge.connected === false;
}
//@ chunk-p21mddyh.js:8288-8428 placement
/**
 * 把会话名规范化为地址用的 slug（NFKC、去控制字符、小写、空白转连字符）。
 */
function slugifySessionName(name) {
  return name
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (char) => (/\s/.test(char) ? char : ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}
//@ chunk-p21mddyh.js:8428-8468 placement
/**
 * isAddressableSlug：会话名 slug 可寻址。
 */
function isAddressableSlug(recipient) {
  return normalizeAgentIdOrNull(slugifySessionName(recipient)) !== null;
}
//@ chunk-p21mddyh.js:8468-8518 placement
/**
 * isReservedOrInvalidName：名字无效或为保留名。
 */
function isReservedOrInvalidName(name) {
  return typeof name !== "string" || isReservedSessionName(name);
}
//@ chunk-p21mddyh.js:8518-8582 placement
/**
 * isLocalTeamLead：本会话是该团队的领导。
 */
function isLocalTeamLead(member, leadAgentId) {
  return member.name === TEAM_LEAD && leadAgentId !== undefined && member.agentId === leadAgentId;
}
//@ chunk-p21mddyh.js:8582-8711 placement
/**
 * 取团队领导的地址：本会话是领导时用其 agent id，否则由团队名推出。
 */
function teamLeadAddress(state) {
  let teamContext = state.teamContext;
  if (teamContext?.leadAgentId && teamContext.isLeader !== false) return teamContext.leadAgentId;
  let teamName = getTeamName(teamContext);
  return teamName ? agentAddress(TEAM_LEAD, teamName) : undefined;
}
//@ chunk-p21mddyh.js:8711-8782 placement
/**
 * addressableTeamMembers：团队里可寻址的成员。
 */
function addressableTeamMembers(teamFile, leadAgentId) {
  return teamFile.members.filter(
    (member) => isLocalTeamLead(member, leadAgentId) || !isReservedOrInvalidName(member.name),
  );
}
//@ chunk-p21mddyh.js:8782-8863 placement
/**
 * isReservedSessionName：名字是保留名（main/team-lead/user/system）。
 */
function isReservedSessionName(name) {
  let slug = slugifySessionName(name);
  return (
    slug === MAIN ||
    slug === TEAM_LEAD ||
    slug === USER ||
    slug === SYSTEM ||
    normalizeAgentIdOrNull(slug) !== null
  );
}
//@ chunk-p21mddyh.js:8863-8951 placement
/**
 * MIN_ADDRESS_REF_LENGTH：地址 ref 的最短长度；MAX_ADDRESS_REF_LENGTH：地址 ref 的最长长度；ADDRESS_REF_PATTERN：地址 ref 的十六进制模式（同一声明共 3 个绑定）。
 */
var MIN_ADDRESS_REF_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_ADDRESS_REF_LENGTH;
var ADDRESS_REF_PATTERN;
var regExp_2;
deferInit("chunk-p21mddyh.js:8863", () => {
  MIN_ADDRESS_REF_LENGTH = 6;
  MAX_ADDRESS_REF_LENGTH = 12;
  ADDRESS_REF_PATTERN = `[0-9a-f]{${MIN_ADDRESS_REF_LENGTH},${MAX_ADDRESS_REF_LENGTH}}`;
  regExp_2 = new RegExp(`^(.*\\S)\\s*\\[(${ADDRESS_REF_PATTERN})\\]$`);
});
//@ chunk-p21mddyh.js:8951-9025 placement
/**
 * parseNameWithRef：解析 “名字 [ref]” 形式的地址。
 */
function parseNameWithRef(text) {
  let match = regExp_2.exec(text.trim());
  return match
    ? {
        name: match[1],
        ref: match[2],
      }
    : null;
}
//@ chunk-p21mddyh.js:9025-11963 placement
/**
 * 生成代理/会话地址的显示描述（main、in-process、teammate、local_agent）
 */
function describeAgentAddress(state, sources) {
  let entries = [];
  entries.push({
    name: MAIN,
    id: mainAgentId(),
    kind: "main",
    where: "in-process",
    lastActive: undefined,
    sock: undefined,
  });
  let seenIds = new Set();
  for (let [key, value] of Object.entries(state.teamContext?.teammates ?? {})) {
    seenIds.add(key);
    entries.push({
      name: value.name,
      id: key,
      kind: "teammate",
      where: "in-process",
      lastActive: undefined,
      sock: undefined,
    });
  }
  for (let [name, id] of state.agentNameRegistry) {
    let task = state.tasks[id];
    let localAgent = task?.type === "local_agent" ? task : undefined;
    entries.push({
      name,
      id,
      kind: "subagent",
      where: "in-process",
      lastActive: localAgent?.startTime,
      sock: undefined,
    });
  }
  for (let member of sources.teamFile?.members ?? []) {
    if (seenIds.has(member.agentId)) continue;
    seenIds.add(member.agentId);
    entries.push({
      name: member.name,
      id: member.agentId,
      kind: "teammate",
      where: "this-machine",
      lastActive: undefined,
      sock: undefined,
    });
  }
  let stableEnabled = isStableAddressEnabled();
  let sessions = sources.sessions.filter(isNotStableAddress);
  let bySock = stableEnabled ? groupBySocket(sessions) : undefined;
  let ambiguous = stableEnabled ? ambiguousSessionIds(getSessionId(), sessions, bySock) : undefined;
  for (let session of sessions) {
    let claims = bySock?.get(session)?.claims;
    entries.push({
      name: session.name || basename(session.cwd),
      id: session.sock,
      kind: "session",
      where: "this-machine",
      lastActive: session.statusUpdatedAt,
      sock: session.sock,
      ...(claims !== undefined &&
        claims.size > 0 && {
          claimedSessionIds: [...claims].sort(),
        }),
      ...(stableEnabled &&
        session.sessionId !== undefined &&
        !ambiguous.has(session.sessionId) && {
          stableId: stableSessionAddress(session.sessionId),
        }),
      ...(stableEnabled &&
        session.nameSource === "derived" && {
          derivedName: true,
        }),
      ...(session.hostSessionId !== undefined && {
        hostSessionId: session.hostSessionId,
      }),
    });
  }
  let socksByBody = new Map();
  for (let session of sources.sessions)
    if (session.bridgeSessionId !== undefined) {
      let body = sessionIdBody(session.bridgeSessionId);
      socksByBody.set(body, [...(socksByBody.get(body) ?? []), session.sock]);
    }
  let shadowed = [];
  for (let session of sources.cloud ?? []) {
    if (hasBridgeSessionId(sources.sessions, session.id)) {
      shadowed.push({
        rawName: session.title || "untitled",
        socks: socksByBody.get(sessionIdBody(session.id)) ?? [],
      });
      continue;
    }
    entries.push({
      name: session.title || "untitled",
      id: session.id,
      kind: "cloud-session",
      ...(isUntitledName(session.title) && {
        derivedName: true,
      }),
      ...(session.acceptsPeerMessages === true && {
        reportsInbound: true,
      }),
      where: session.remoteControl ? "remote" : "cloud",
      lastActive: session.lastActive,
      sock: undefined,
      ...(session.offline && {
        offline: true,
      }),
    });
  }
  let cloudBodies = new Set((sources.cloud ?? []).map((session) => sessionIdBody(session.id)));
  let bridgeBodies = bridgeSessionIds(sources.sessions);
  for (let session of sources.bridge ?? []) {
    let body = sessionIdBody(session.id);
    if (cloudBodies.has(body)) continue;
    if (bridgeBodies.has(body)) {
      shadowed.push({
        rawName: session.title || "untitled",
        socks: socksByBody.get(body) ?? [],
      });
      continue;
    }
    let timestamp = Date.parse(session.updated_at);
    entries.push({
      name: session.title || "untitled",
      id: session.id,
      kind: "bridge-session",
      ...(isUntitledName(session.title) && {
        derivedName: true,
      }),
      ...(session.acceptsPeerMessages === true && {
        reportsInbound: true,
      }),
      ...(session.inboundReportUnavailable && {
        inboundReportUnavailable: true,
      }),
      where: hasEnvironmentKindOtherThanBridge(session) ? "cloud" : "remote",
      lastActive: Number.isNaN(timestamp) ? undefined : timestamp,
      sock: undefined,
      ...(isDisconnectedNonBridge(session) && {
        offline: true,
      }),
    });
  }
  let leadAddress = teamLeadAddress(state);
  let flattened = entries.flatMap((entry) => {
    let title = normalizeSessionTitle(entry.name);
    if (title === null || !isPlainAddressableName(title)) return [];
    let keepAlways =
      entry.kind === "main" ||
      (entry.kind === "teammate" &&
        isLocalTeamLead(
          {
            name: entry.name,
            agentId: entry.id,
          },
          leadAddress,
        ));
    let isMainName =
      (entry.kind === "session" || entry.kind === "cloud-session" || entry.kind === "bridge-session") &&
      slugifySessionName(title) === MAIN;
    return keepAlways || isMainName || !isReservedOrInvalidName(title)
      ? [
          {
            ...entry,
            name: title,
          },
        ]
      : [];
  });
  let seenKeys = new Set();
  let candidates = assignShortRefs(
    flattened.filter((entry) => {
      if (entry.kind !== "session") return true;
      let dedupeKey = `${slugifySessionName(entry.name)}\x00${canonicalSocketPath(entry.id) ?? entry.id}`;
      if (seenKeys.has(dedupeKey)) return false;
      seenKeys.add(dedupeKey);
      return true;
    }),
  );
  let byName = new Map();
  for (let entry of candidates) {
    let slug = slugifySessionName(entry.name);
    let group = byName.get(slug);
    if (group) group.push(entry);
    else byName.set(slug, [entry]);
  }
  let remoteNames = new Map();
  for (let { rawName, socks } of shadowed) {
    let title = normalizeSessionTitle(rawName);
    if (title === null || !isPlainAddressableName(title)) continue;
    let slug = slugifySessionName(title);
    let sockSet = remoteNames.get(slug) ?? new Set();
    for (let sock of socks) sockSet.add(sock);
    remoteNames.set(slug, sockSet);
  }
  return {
    candidates,
    byName,
    remoteNamesClaimedLocally: remoteNames,
  };
}
//@ chunk-p21mddyh.js:11963-12175 placement
/**
 * 在按名称分组的候选中解析唯一目标：同进程的直接返回，否则视为有歧义。
 */
function resolveUniqueCandidate(byName, name, ref) {
  let candidates = byName.get(name);
  if (!candidates || candidates.length === 0) return;
  let byRef = ref === undefined ? [] : candidates.filter((candidate) => candidate.name === ref);
  let chosen = (byRef.length > 0 ? byRef : candidates)[0];
  if (chosen.where === "in-process")
    return {
      kind: "one",
      candidate: chosen,
    };
  return {
    kind: "ambiguous",
  };
}
//@ chunk-p21mddyh.js:12175-12220 placement
/**
 * formatNameWithRef：拼成 “名字 [ref]”。
 */
function formatNameWithRef(entry) {
  return `${entry.name} [${entry.ref}]`;
}
//@ chunk-p21mddyh.js:12220-12292 placement
/**
 * describeLocationWithRemoteControl：远程位置补 “(Remote Control)”。
 */
function describeLocationWithRemoteControl(where) {
  return where === "remote"
    ? `${describeSessionLocation(where)} (Remote Control)`
    : describeSessionLocation(where);
}
//@ chunk-p21mddyh.js:12292-12476 placement
/**
 * 会话位置的文字描述（本会话、云端、其他机器、本机）。
 */
function describeSessionLocation(where) {
  switch (where) {
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
//@ chunk-p21mddyh.js:12476-12823 placement
function agentAddressLabel(entry, now) {
  let kindLabel =
    entry.kind === "main"
      ? "main conversation"
      : entry.kind === "session" || entry.kind === "cloud-session" || entry.kind === "bridge-session"
        ? "Claude session"
        : entry.kind;
  let whereLabel = describeLocationWithRemoteControl(entry.where);
  let activeText =
    entry.lastActive === undefined
      ? ""
      : `, ${entry.kind === "subagent" ? "started" : "active"} ${formatDuration(
          Math.max(0, now - entry.lastActive),
          {
            mostSignificantOnly: true,
          },
        )} ago`;
  return `${formatNameWithRef(entry)} \u2014 ${kindLabel}, ${whereLabel}${activeText}`;
}
//@ chunk-p21mddyh.js:12823-12833 placement
var MAX_SESSION_TITLE_LENGTH = MAX_SEED_NAME_CHARS;
//@ chunk-p21mddyh.js:12833-13029 placement
/**
 * 规范化会话标题：去控制字符、合并空白、截断长度，空时为 untitled session。
 */
function normalizeSessionTitle(title) {
  if (typeof title !== "string") return null;
  return (
    [
      ...title
        .replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, (char) => (/\s/.test(char) ? char : ""))
        .replace(/\s+/g, " ")
        .trim(),
    ]
      .slice(0, MAX_SESSION_TITLE_LENGTH)
      .join("")
      .trim() || "untitled session"
  );
}
//@ chunk-p21mddyh.js:13029-13108 placement
/**
 * findSessionByName：按名字或规范名查找会话。
 */
function findSessionByName(sessions, name) {
  return (
    sessions.find((session) => session.name === name) ??
    sessions.find((session) => normalizeSessionTitle(session.name) === name)
  );
}
//@ chunk-p21mddyh.js:13108-13176 placement
/**
 * addressableSessionTitle：可作为地址的会话标题。
 */
function addressableSessionTitle(title) {
  let normalized = normalizeSessionTitle(title);
  return normalized !== null && !looksLikeAddress(normalized) && isValidPipeOrPath(normalized)
    ? normalized
    : null;
}
//@ chunk-p21mddyh.js:13176-13242 placement
/**
 * plainSessionName：普通（非保留、非地址形式）会话名。
 */
function plainSessionName(name) {
  let normalized = normalizeSessionTitle(name);
  return normalized !== null && isPlainAddressableName(normalized) && !isReservedSessionName(normalized)
    ? normalized
    : null;
}
//@ chunk-p21mddyh.js:13242-13304 placement
function isPlainAddressableName(name) {
  return !looksLikeAddress(name) && isValidPipeOrPath(name) && !name.includes("@") && name !== "*";
}
//@ chunk-p21mddyh.js:13304-13402 placement
/**
 * looksLikeAddress：名字像地址（任一变体）。
 */
function looksLikeAddress(name) {
  let slug = slugifySessionName(name);
  return (
    parseAddress(name).scheme !== "other" ||
    parseAddress(slug).scheme !== "other" ||
    isUnixSocketPath(name) ||
    isUnixSocketPath(slug)
  );
}
//@ chunk-p21mddyh.js:13402-13731 placement
/**
 * 为会话地址列表分配最短可区分前缀 ref：与相邻（排序后）地址比较公共前缀长度，ref 长度至少 M。
 */
function assignShortRefs(entries) {
  let mapped = entries.map((entry) => addressHashKey(entry.kind, stableSessionKey(entry)));
  let mapped_2 = messagingSocketAddresses().map((sock) => addressHashKey("session", sock));
  let sorted = normalizeCaseForComparison_2([...mapped, ...mapped_2]).sort();
  let refLengths = new Map();
  for (let k = 0; k < sorted.length; k++) {
    let key = sorted[k];
    let max = Math.max(
      k > 0 ? commonPrefixLength(key, sorted[k - 1]) : 0,
      k + 1 < sorted.length ? commonPrefixLength(key, sorted[k + 1]) : 0,
    );
    refLengths.set(key, Math.min(key.length, Math.max(MIN_ADDRESS_REF_LENGTH, max + 1)));
  }
  return entries.map((entry, index) => {
    let key = mapped[index];
    return {
      ...entry,
      ref: key.slice(0, refLengths.get(key)),
    };
  });
}
//@ chunk-p21mddyh.js:13731-13811 placement
function commonPrefixLength(a, b) {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) length++;
  return length;
}
//@ chunk-p21mddyh.js:13811-13858 placement
function addressHashKey(kind, key) {
  return String(shortHash(`${kind}:${key}`));
}
//@ chunk-p21mddyh.js:13858-13898 placement
/**
 * stableSessionKey：会话的稳定 id 或 id。
 */
function stableSessionKey(entry) {
  return entry.stableId ?? entry.id;
}
//@ chunk-p21mddyh.js:13898-13977 placement
function messagingSocketAddresses() {
  let CLAUDE_CODE_MESSAGING_SOCKET = udsEnv.CLAUDE_CODE_MESSAGING_SOCKET;
  return CLAUDE_CODE_MESSAGING_SOCKET === undefined ? [] : addressVariants(CLAUDE_CODE_MESSAGING_SOCKET);
}
//@ chunk-p21mddyh.js:13977-14017 placement
/**
 * stableAddressWhenEnabled：稳定地址开启时用 sid: 形式。
 */
function stableAddressWhenEnabled(address) {
  return isStableAddressEnabled() ? stableSessionAddress(getSessionId()) : address;
}
//@ chunk-p21mddyh.js:14017-14068 placement
function addressVariants(address) {
  let stable = stableAddressWhenEnabled(address);
  return stable === address ? [address] : [stable, address];
}
//@ chunk-p21mddyh.js:14068-14128 placement (2.1.88 match: isIt2CliAvailable, 0.651)
/**
 * isSessionAddressUnder：地址组里是否含该会话地址。
 */
function isSessionAddressUnder(ref, address) {
  return addressVariants(address).some((variant) => refMatchesAddress(ref, "session", variant));
}
//@ chunk-p21mddyh.js:14128-14524 placement
/**
 * 按 socket 路径把会话地址记录分组：可能同一路径的记录合并为一组并汇总声明的会话 id，返回记录 → 组的映射。
 */
function groupBySocket(sessions) {
  let groups = [];
  for (let session of sessions) {
    let filtered = groups.filter((group) =>
      group.records.some((record) => mayBeSamePath(record.sock, session.sock)),
    );
    let merged = {
      records: [],
      claims: new Set(),
    };
    for (let group of filtered) {
      merged.records.push(...group.records);
      for (let claim of group.claims) merged.claims.add(claim);
    }
    merged.records.push(session);
    if (session.sessionId !== undefined) merged.claims.add(session.sessionId);
    groups = groups.filter((group) => !filtered.includes(group));
    groups.push(merged);
  }
  let byRecord = new Map();
  for (let group of groups) for (let record of group.records) byRecord.set(record, group);
  return byRecord;
}
//@ chunk-p21mddyh.js:14524-14776 placement
function ambiguousSessionIds(selfId, sessions, byRecord) {
  let seen = new Set([selfId]);
  let ambiguous = new Set();
  for (let session of sessions) {
    if (session.sessionId === undefined) continue;
    if (seen.has(session.sessionId)) ambiguous.add(session.sessionId);
    seen.add(session.sessionId);
  }
  for (let group of new Set(byRecord.values()))
    if (group.records.length > 1) for (let claim of group.claims) ambiguous.add(claim);
  return ambiguous;
}
//@ chunk-p21mddyh.js:14776-14916 placement
/**
 * 判断本会话 id 在会话地址记录中是否存在歧义（多个 socket 声明同一会话）。
 */
function isOwnSessionIdAmbiguous(sessions, sock, forced) {
  if (forced) return true;
  let sessionId = getSessionId();
  let sessions_2 = sessions.filter(isNotStableAddress);
  if (sock !== undefined)
    sessions_2.push({
      sock,
      sessionId,
    });
  let byRecord = groupBySocket(sessions_2);
  return ambiguousSessionIds("", sessions_2, byRecord).has(sessionId);
}
//@ chunk-p21mddyh.js:14916-14959 placement
/**
 * addressRef：取地址的前缀 ref。
 */
function addressRef(kind, addressId) {
  return addressHashKey(kind, addressId).slice(0, MIN_ADDRESS_REF_LENGTH);
}
//@ chunk-p21mddyh.js:14959-15019 placement
function refMatchesAddress(ref, kind, key) {
  return ref.length >= MIN_ADDRESS_REF_LENGTH && addressHashKey(kind, key).startsWith(ref);
}
//@ chunk-p21mddyh.js:15019-15112 placement
/**
 * bridgeSessionIds：记录中出现的桥接会话 id。
 */
function bridgeSessionIds(sessions) {
  return new Set(
    sessions.flatMap((session) => (session.bridgeSessionId ? [sessionIdBody(session.bridgeSessionId)] : [])),
  );
}
//@ chunk-p21mddyh.js:15112-15216 placement
/**
 * 判断地址记录中是否有与给定 id 对应的桥接会话 id。
 */
function hasBridgeSessionId(sessions, id) {
  let body = sessionIdBody(id);
  return sessions.some(
    (session) => session.bridgeSessionId !== undefined && sessionIdBody(session.bridgeSessionId) === body,
  );
}
export {
  isStableAddressEnabled,
  slugifySessionName,
  hasBridgeSessionId,
  plainSessionName,
  addressRef,
  stableAddressWhenEnabled,
  isOwnSessionIdAmbiguous,
  describeAgentAddress,
  teamLeadAddress,
  isLocalTeamLead,
  isReservedOrInvalidName,
  normalizeSessionTitle,
  formatNameWithRef,
  addressableSessionTitle,
  looksLikeAddress,
  hasEnvironmentKindOtherThanBridge,
  isDisconnectedNonBridge,
  readRecordPidDomain,
  isReservedSessionName,
  MAX_ADDRESS_REF_LENGTH,
  addressableTeamMembers,
  findSessionByName,
  isAddressableSlug,
  parseNameWithRef,
  agentAddressLabel,
  describeSessionLocation,
  ADDRESS_REF_PATTERN,
  isUntitledName,
  describeLocationWithRemoteControl,
  resolveUniqueCandidate,
  AUTH_HANDSHAKE_LENGTH,
  classifySessionAddress,
  authHandshakeJson,
  isNotStableAddress,
  isAuthItem,
  tokenRole,
  deleteSessionRecord,
  writeSessionPeerRecord,
  isStableSessionAddress,
  stableSessionAddress,
  bridgeSessionIds,
  stableSessionKey,
  isSessionAddressUnder,
};
