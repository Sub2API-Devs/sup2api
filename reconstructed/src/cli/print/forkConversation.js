/**
 * cli/print/forkConversation.ts
 *
 * 2.1.316 新增：fork_conversation 控制请求（种子校验、标题、CPU 采样）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (50)
 * attribution: sole-consumer 1, affinity 1, placement 48
 */
import { createHash } from "crypto";
import {
  mkdir,
  mkdir as mkdir_2,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  open,
  open as open_2,
  open as open_3,
  lutimes,
  unlink,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readlink,
} from "fs/promises";
import { constants } from "fs";
import { posix, posix as posix_2, posix as posix_3 } from "path";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, o, A, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { t0 } from "../../services/mcp/schemaParse.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { FORK_SEED_MAX_BYTES, forkSeedPath, forkSeedsDir, ZV } from "./rewindConversation.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { vS } from "../../utils/remoteEnvironment.js";
import { getSupervisedBridgeSessionId } from "../../bridge/replBridgeHandle.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import {
  isTranscriptPersistenceDisabled,
  isRemoteEgressSuppressedFor,
  pinSessionId,
  getCurrentSessionDisplayTitle,
  withVersionToRecord,
  readHistorySuppressionFromDisk,
} from "../../utils/sessionStorage.js";
import { findRewindTarget } from "./rewindStandIn.js";
import { hasCronToolUse } from "./rateLimitForwarding.js";
import { getSessionId, mainAgentId } from "../../bootstrap/state.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { getBridgeSessionOrStatus, createBridgeSession } from "../../bridge/createSession.js";
import { snapshotGitEvidenceForBridge } from "../../utils/git.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import {
  REMOTE_CONTROL_FORK,
  REMOTE_CONTROL_FORK_PARENT,
  REMOTE_CONTROL_FORK_SEED,
} from "../../bridge/sessionOrigins.js";
import { toCompatSessionId, inSessionIdCostumeOf } from "../../bridge/sessionIdCompat.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { uniq } from "../../utils/collections.js";
import { filterCommandsByServer, excludeCommandsByServer } from "../../services/mcp/utils.js";
import { getToolNameForPermissionCheck } from "../../services/mcp/mcpConnectionStore.js";
import { getOwn } from "../../utils/objectSafety.js";
import { kI, parseStatTimes } from "../../utils/procStat.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { formatDurationCoarse } from "../../utils/format.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import { sigtermThenKill } from "../../utils/processIdentity.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { isChildSession, getSessionEntrypoint } from "../../utils/sessionShape.js";
import { getCurrentAuthSurface } from "../../services/analytics/authOutcomeTelemetry.js";
import { isCoworkSession, Udo } from "../../utils/entrypointKinds.js";
import { classifyBashCommand } from "../../tools/BashTool/commandClassification.js";
import { getTaskOutputSize } from "../../utils/task/diskOutput.js";
import { i7n } from "../../utils/shell/cpuReport.js";
import { getRunningTasks } from "../../utils/task/framework.js";
import { MAX_PROC_ENTRIES } from "../../utils/shell/processCpuTime.js";

//@ chunk-tyg7f3ek.js:588935-589005 sole-consumer
var TRANSCRIPT_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system", "progress"]);
//@ chunk-tyg7f3ek.js:589005-589179 affinity = isLegacyProgressEntry (0.8)
function isLegacyProgressEntry(entry) {
  if (typeof entry !== "object" || entry === null) return !1;
  let n = "type" in entry ? entry.type : void 0,
    r = "uuid" in entry ? entry.uuid : void 0;
  return typeof n === "string" && TRANSCRIPT_MESSAGE_TYPES.has(n) && typeof r === "string";
}
//@ chunk-tyg7f3ek.js:589179-589288 placement = getParentSessionId (0.704)
var getParentSessionId = DoctorLazy(() =>
  u({
    version: T(1),
    parentSessionId: o().min(1).max(200),
    createdAt: t0(),
    messages: A(hu(isLegacyProgressEntry)).min(1),
  }),
);
//@ chunk-tyg7f3ek.js:589288-589388 placement
class ForkSeedTooLargeError extends Error {
  bytes;
  constructor(e) {
    super("fork seed exceeds the size limit");
    this.bytes = e;
  }
}
//@ chunk-tyg7f3ek.js:589388-589535 placement
function encodeForkSeed(e) {
  let n = jsonStringify({ version: 1, ...e }),
    byteLength = Buffer.byteLength(n);
  if (byteLength > FORK_SEED_MAX_BYTES) throw new ForkSeedTooLargeError(byteLength);
  return { body: n, sha256: createHash("sha256").update(n).digest("hex") };
}
//@ chunk-tyg7f3ek.js:589535-589683 placement
async function writeForkSeed(e, n) {
  let r = forkSeedPath(e);
  if (!r) throw Error("fork seed: not a server session id");
  (await mkdir_2(forkSeedsDir(), { recursive: !0, mode: 448 }), await writeFileAtomic(r, n, 384));
}
/**
 * 读取 Remote Control fork 的种子文件（大小上限、非普通文件、符号链接检查），返回 none/invalid/seed。
 */
//@ chunk-tyg7f3ek.js:589683-590804 placement
async function readForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n) return { kind: "none" };
  let r = getPlatform() === "windows";
  if (r)
    try {
      if (!(await lstat_3(n)).isFile())
        return (await deleteForkSeed(e), { kind: "invalid", reason: "not_a_file" });
    } catch (error) {
      if (isENOENT(error)) return { kind: "none" };
      throw error;
    }
  let s;
  try {
    s = await open_2(
      n,
      r ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    if (isENOENT(error)) return { kind: "none" };
    if (getErrnoCode(error) === "ELOOP")
      return (await deleteForkSeed(e), { kind: "invalid", reason: "not_a_file" });
    throw error;
  }
  let h;
  try {
    let stats = await s.stat();
    if (!stats.isFile()) return (await deleteForkSeed(e), { kind: "invalid", reason: "not_a_file" });
    if (stats.size > FORK_SEED_MAX_BYTES)
      return (await deleteForkSeed(e), { kind: "invalid", reason: "oversize" });
    h = Buffer.allocUnsafe(stats.size + 1);
    let q = 0,
      x;
    do (({ bytesRead: x } = await s.read(h, q, h.length - q, null)), (q += x));
    while (x > 0 && q < h.length);
    if (q > stats.size) return (await deleteForkSeed(e), { kind: "invalid", reason: "oversize" });
    h = h.subarray(0, q);
  } finally {
    await s.close();
  }
  let y;
  try {
    y = jsonParse(h.toString("utf8"));
  } catch {
    y = void 0;
  }
  let safeParse = getParentSessionId().safeParse(y);
  if (!safeParse.success) return (await deleteForkSeed(e), { kind: "invalid", reason: "malformed" });
  let { parentSessionId: parentSessionId, createdAt: createdAt, messages: messages } = safeParse.data;
  return {
    kind: "seed",
    seed: { parentSessionId: parentSessionId, createdAt: createdAt, messages: messages },
    sha256: createHash("sha256").update(h).digest("hex"),
  };
}
//@ chunk-tyg7f3ek.js:590804-590963 placement
async function touchForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n) return;
  let date = new Date();
  await lutimes(n, date, date).catch((s) => {
    logForDebugging(`[rc-fork] Could not refresh the seed's mtime for ${e}: ${errorMessage(s)}`);
  });
}
//@ chunk-tyg7f3ek.js:590963-591254 placement
async function deleteForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n) return !0;
  for (let r = 0; ; r++)
    try {
      return (await unlink(n), !0);
    } catch (error) {
      if (isENOENT(error)) return !0;
      let h = getErrnoCode(error);
      if (r === 0 && (h === "EBUSY" || h === "EPERM")) {
        await sleep(ZV, void 0, { unref: !0 });
        continue;
      }
      return (
        logForDebugging(`[rc-fork] Could not delete the seed for ${e}: ${errorMessage(error)}`, {
          level: "error",
        }),
        !1
      );
    }
}
//@ chunk-tyg7f3ek.js:591254-591293 placement
function isBridgeForkSupported(e) {
  return Boolean(e) && vS();
}
//@ chunk-tyg7f3ek.js:591293-591334 placement
function bridgeForkSessionId(e) {
  return isBridgeForkSupported(e) ? getSupervisedBridgeSessionId() : void 0;
}
/**
 * 处理 rc fork_conversation 控制请求：校验目标消息、写种子、创建新云会话并返回结果。
 */
//@ chunk-tyg7f3ek.js:591334-593736 placement
async function handleForkConversation(e, n) {
  let target_message_uuid = e.target_message_uuid;
  if (target_message_uuid !== void 0 && typeof target_message_uuid !== "string")
    return { ok: !1, error: "fork_conversation: target_message_uuid must be a string" };
  let title = e.title;
  if (title !== void 0 && typeof title !== "string")
    return { ok: !1, error: "fork_conversation: title must be a string" };
  let h = bridgeForkSessionId(n.sdkUrl);
  if (h === void 0 || !isFirstPartyProvider() || isEssentialTrafficOnly()) return forkRefused("unsupported");
  let blockedReason = n.blockedReason();
  if (blockedReason !== null) return forkRefused(blockedReason);
  if (isTranscriptPersistenceDisabled()) return forkRefused("history suppressed", "persistence_disabled");
  let S, R, w;
  if (target_message_uuid !== void 0) {
    let re = findRewindTarget(n.messages, target_message_uuid);
    if (!re) return forkRefused("target not found");
    if (hasCronToolUse(n.messages, re.index)) return forkRefused("target splits a tool call");
    ((S = n.messages.slice(0, re.index)), (R = re.uuid), (w = re.prefillText ?? void 0));
  } else S = n.messages.slice();
  let P = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(P))) return forkRefused("history suppressed");
  let L = title !== void 0 ? sanitizeSessionTitle(title).replace(/\s+/g, " ") : "",
    q = getCurrentSessionDisplayTitle(P),
    x = q ? sanitizeSessionTitle(`${q} (fork)`).replace(/\s+/g, " ") : "",
    G = L || x || void 0,
    Z = null;
  try {
    let re = await getBridgeSessionOrStatus(h, { credentials: n.credentials });
    if (!re.session?.environment_id)
      return forkFailed(
        re.session ? "no_environment" : re.notFound ? "session_not_found" : "session_fetch_failed",
      );
    let environment_id = re.session.environment_id,
      Ue = null;
    if (S.length > 0)
      try {
        Ue = encodeForkSeed({
          parentSessionId: h,
          createdAt: new Date().toISOString(),
          messages: S.map((Ee) =>
            withVersionToRecord(
              Ee.type === "system" && Ee.subtype === "model_refusal_fallback"
                ? { ...Ee, neutralizedByFork: !0 }
                : Ee,
            ),
          ),
        });
      } catch (error) {
        if (!(error instanceof ForkSeedTooLargeError)) throw error;
        return forkFailed("seed_too_large");
      }
    let {
        branch: branch,
        gitRepoUrl: gitRepoUrl,
        defaultBranch: defaultBranch,
      } = await snapshotGitEvidenceForBridge(),
      { uploadForkDisplayHistory: uploadForkDisplayHistory } = await import("./chunk-6kcmnrx0.js"),
      me = await forkHistorySuppression(P, n.storageV5);
    if (me !== null) return forkRefused("history suppressed", me);
    if (
      ((Z = await createBridgeSession({
        environmentId: environment_id,
        title: G,
        gitRepoUrl: gitRepoUrl,
        branch: branch,
        defaultBranch: defaultBranch,
        signal: AbortSignal.timeout(15000),
        credentials: n.credentials,
        permissionMode:
          n.permissionMode === "bypassPermissions" ? void 0 : toExternalPermissionMode(n.permissionMode),
        tags: [
          REMOTE_CONTROL_FORK,
          `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(h)}`,
          ...(Ue ? [`${REMOTE_CONTROL_FORK_SEED}${Ue.sha256}`] : []),
        ],
      })),
      Z === null)
    )
      return forkFailed("session_create_failed");
    let Me = Ue && (await tryWriteForkSeed(Z, Ue.body));
    if (Me === null) {
      let Ee = await forkHistorySuppression(P, n.storageV5);
      if (Ee !== null)
        return (await discardForkSession(Z, n.credentials), forkRefused("history suppressed", Ee));
      Me = await uploadForkDisplayHistory(
        Z,
        S,
        n.credentials,
        "rc_fork_conversation",
        n.host,
        n.getTools?.(),
      );
    }
    if (Me !== null) return (await discardForkSession(Z, n.credentials), forkFailed(Me));
    return (
      logFeatureOk("rc_fork_conversation"),
      {
        ok: !0,
        response: {
          forked: !0,
          sessionId: inSessionIdCostumeOf(h, Z),
          ...(R !== void 0 && { targetMessageUuid: R }),
          ...(w !== void 0 && { prefillText: w }),
        },
      }
    );
  } catch (error) {
    if ((logError(error), Z !== null)) await discardForkSession(Z, n.credentials);
    return forkFailed("exception");
  }
}
//@ chunk-tyg7f3ek.js:593736-594005 placement
var FORK_REFUSAL_REASONS = {
  unsupported: "unsupported",
  "turn running": "turn_running",
  "commands queued": "commands_queued",
  "prompt pending": "prompt_pending",
  "target not found": "target_not_found",
  "target splits a tool call": "target_splits_tool_call",
  "history suppressed": "history_suppressed",
};
//@ chunk-tyg7f3ek.js:594005-594147 placement
function forkRefused(e, n = e === "unsupported" ? null : FORK_REFUSAL_REASONS[e]) {
  if (n !== null) logFeatureSad("rc_fork_conversation", n);
  return { ok: !0, response: { forked: !1, error: e, reason: FORK_REFUSAL_REASONS[e] } };
}
//@ chunk-tyg7f3ek.js:594147-594267 placement
function forkFailed(e) {
  return (
    logFeatureBad("rc_fork_conversation", e),
    { ok: !0, response: { forked: !1, error: "fork failed", reason: "fork_failed" } }
  );
}
//@ chunk-tyg7f3ek.js:594267-594402 placement
async function forkHistorySuppression(e, n) {
  let r = await readHistorySuppressionFromDisk(n);
  if (isRemoteEgressSuppressedFor(pinSessionId(e))) return "history_suppressed";
  return r !== "clean" ? "history_suppressed_on_disk" : null;
}
//@ chunk-tyg7f3ek.js:594402-594566 placement
async function tryWriteForkSeed(e, n) {
  try {
    return (await writeForkSeed(e, n), null);
  } catch (error) {
    return (
      logForDebugging(`[rc-fork] Could not write the seed for ${e}: ${errorMessage(error)}`, {
        level: "error",
      }),
      "seed_write_failed"
    );
  }
}
//@ chunk-tyg7f3ek.js:594566-594685 placement
async function discardForkSession(e, n) {
  await deleteForkSeed(e);
  let { archiveAbandonedForkSession: archiveAbandonedForkSession } = await import("./chunk-6kcmnrx0.js");
  await archiveAbandonedForkSession(e, n);
}
//@ chunk-tyg7f3ek.js:594685-594733 placement
var FORK_VERIFY_TIMINGS = 600000,
  sG = 5000,
  REVOKED = "revoked",
  iG = 3,
  aG = 2000;
//@ chunk-tyg7f3ek.js:594733-594969 placement
class ForkSeedUnverifiedError extends Error {
  code;
  retryable;
  constructor(e, n = !0) {
    super(
      "this Remote Control session's forked conversation could not be verified; it is kept for the next start",
    );
    this.code = e;
    this.retryable = n;
    this.name = "ForkSeedUnverifiedError";
  }
}
/**
 * 启动时核对上一次 Remote Control fork 的种子是否已被服务器接收，未确认则保留到下次。
 */
//@ chunk-tyg7f3ek.js:594969-596723 placement
function createForkSeedVerifier({ sdkUrl: sdkUrl, credentials: credentials, writeNote: writeNote }) {
  let s = bridgeForkSessionId(sdkUrl);
  if (s === void 0) return null;
  let h = s,
    y = !1;
  function S(L) {
    return Promise.race([writeNote(L), sleep(sG, void 0, { unref: !0 }).then(() => !1)]);
  }
  function R(L) {
    logFeatureSad("rc_fork_conversation", L);
  }
  async function w() {
    if (!isFirstPartyProvider()) throw new ForkSeedUnverifiedError("provider_not_first_party", !1);
    let { session: session } = await getBridgeSessionOrStatus(h, { credentials: credentials, useV2: !0 }),
      q = session?.tags;
    if (!Array.isArray(q) || !q.every((x) => typeof x === "string"))
      throw new ForkSeedUnverifiedError("record_unread");
    return q;
  }
  async function P(L) {
    if (L.sha256 === REVOKED) return (await deleteForkSeed(h), null);
    let q;
    try {
      q = await readForkSeed(h);
    } catch (error) {
      if (
        (logForDebugging(`[rc-fork] ${errorMessage(error)}`, { level: "error" }),
        !(await w()).includes(REMOTE_CONTROL_FORK))
      )
        return (R("seed_unreadable"), null);
      throw new ForkSeedUnverifiedError("seed_unreadable");
    }
    if (q.kind === "none") return null;
    if (q.kind === "invalid") return (R(`seed_${q.reason}`), null);
    if (L.unread) throw new ForkSeedUnverifiedError("note_unread", !1);
    let { messages: messages, createdAt: createdAt, parentSessionId: parentSessionId } = q.seed,
      re = await w(),
      filtered = re.filter((ce) => ce.startsWith(REMOTE_CONTROL_FORK_SEED));
    if (
      !re.includes(REMOTE_CONTROL_FORK) ||
      filtered.length !== 1 ||
      filtered[0] !== `${REMOTE_CONTROL_FORK_SEED}${q.sha256}`
    )
      return (R("seed_unbound"), await deleteForkSeed(h), null);
    let Ue = L.sha256 !== void 0 && /^[0-9a-f]{64}$/.test(L.sha256) && L.sha256 === q.sha256;
    if (!Ue) {
      if (Date.now() - Date.parse(createdAt) > FORK_VERIFY_TIMINGS)
        return (R("note_missing"), await deleteForkSeed(h), null);
      if (!(await S(q.sha256))) R("note_unconfirmed");
    }
    return (
      await touchForkSeed(h),
      logForDebugging(`[rc-fork] Seeded ${messages.length} messages from ${parentSessionId}`),
      (y = !0),
      { rows: messages, firstBoot: !Ue }
    );
  }
  return {
    async adoptSeed(L) {
      y = !1;
      for (let q = 1; ; q++)
        try {
          return await P(L);
        } catch (error) {
          if (!(error instanceof ForkSeedUnverifiedError))
            throw (logError(error), logFeatureBad("rc_fork_conversation", "seed_failed"), error);
          if (error.retryable && q < iG) {
            await sleep(aG * q, void 0, { unref: !0 });
            continue;
          }
          throw (R(error.code), error);
        }
    },
    isFork() {
      return y;
    },
    async discardSeed() {
      try {
        let [L, q] = await Promise.all([S(REVOKED), deleteForkSeed(h)]);
        if (q) y = !1;
        if (!L && !q) R("revoke_unconfirmed");
      } catch (error) {
        (logError(error), logFeatureBad("rc_fork_conversation", "revoke_failed"));
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:596723-596952 placement
function mcpSyncNeeded(e, n) {
  for (let s of Object.keys(e)) if (!n.some((h) => h.name === s)) return "sync";
  let r = !1;
  for (let s of n) {
    if (!Object.hasOwn(e, s.name) || s.type === "pending") return "sync";
    if (s.type === "failed") r = !0;
  }
  return r ? "retry_failed" : "none";
}
//@ chunk-tyg7f3ek.js:596952-597195 placement
function pickReusableMcpClients(e, n, r) {
  let s = new Set(
      n
        .filter(
          (y) =>
            y.type === "disabled" ||
            (r && y.type === "connected" && y.toolsListError === void 0 && !y.skillsListFailed),
        )
        .map((y) => y.name),
    ),
    create = Object.create(null);
  for (let [y, S] of Object.entries(e)) if (!s.has(y)) create[y] = S;
  return create;
}
//@ chunk-tyg7f3ek.js:597195-597358 placement
function mcpServersToReconnect(e, n, r, s) {
  return e.filter(
    (h) =>
      Object.hasOwn(n, h.name) &&
      (h.type === "disabled" ||
        (!Object.hasOwn(r, h.name) && (h.type === "pending" || (s && h.type === "connected")))),
  );
}
//@ chunk-tyg7f3ek.js:597358-597627 placement = findChromeClient (0.791)
function mergeMcpToolsAndCommands(e, n, r, s, h) {
  let mapped = e
    .filter(
      (client) =>
        client.type === "connected" && (Object.hasOwn(r, client.name) || !Object.hasOwn(n, client.name)),
    )
    .map((S) => S.name);
  return {
    tools: uniq([...mapped.reduce(filterCommandsByServer, [...s.tools]), ...h.tools]),
    commands: [
      ...s.commands.filter((command) => !mapped.some((R) => getToolNameForPermissionCheck(command, R))),
      ...h.commands,
    ],
  };
}
/**
 * 应用 SDK 宿主的 MCP 服务器增删：计算新增/删除/重连集合并更新客户端、工具与命令。
 */
//@ chunk-tyg7f3ek.js:597627-598552 placement
function applySdkMcpServerChanges(e, n, r) {
  let { sdkServersAdded: sdkServersAdded, sdkServersRemoved: sdkServersRemoved } = r,
    y = new Set(e.clients.map((client) => client.name)),
    S = new Set(sdkServersAdded.filter((G) => !y.has(G))),
    filtered = sdkServersRemoved.filter((G) => y.has(G)),
    filtered_2 = sdkServersAdded.filter((G) => !Object.hasOwn(e.configs, G)),
    filtered_3 = sdkServersRemoved.filter((G) => Object.hasOwn(e.configs, G)),
    filtered_4 = r.sdkServersUpdated.filter(
      (G) => Object.hasOwn(e.configs, G) && e.configs[G] === r.sdkConfigsAtSnapshot[G],
    );
  if (
    S.size === 0 &&
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0
  )
    return { state: e, clientsToCleanUp: [] };
  let merged = Object.assign(Object.create(null), e.configs);
  for (let G of filtered_3) delete merged[G];
  for (let G of [...filtered_2, ...filtered_4]) {
    let Z = getOwn(r.newSdkState.configs, G);
    if (Z !== void 0) merged[G] = Z;
  }
  let x = new Set(filtered);
  return {
    state: {
      configs: merged,
      clients: [
        ...e.clients.filter((client) => !x.has(client.name)),
        ...r.newSdkState.clients.filter((client) => S.has(client.name)),
      ],
      tools: filtered.reduce(filterCommandsByServer, [...e.tools]),
      commands: filtered.reduce(excludeCommandsByServer, e.commands),
    },
    clientsToCleanUp: e.clients.filter(
      (client) => x.has(client.name) && client.type === "connected" && !n.includes(client),
    ),
  };
}
//@ chunk-tyg7f3ek.js:598606-598734 placement
var PROC_CPU_SAMPLING = "tengu_hidden_giraffe",
  jk = 600000,
  mG = 0.9,
  fG = 10,
  Gp = { names: () => readdir_3("/proc"), file: (e) => readFile_2(`/proc/${e}`, "utf8").catch(() => "") };
//@ chunk-tyg7f3ek.js:598734-598997 placement
function parseProcStatCpu(e) {
  let n = /^cpu +(.+)$/m.exec(e)?.[1]?.split(/ +/).slice(0, 8).map(Number);
  if (n === void 0 || n.length < 8 || n.some(Number.isNaN)) return;
  let reduced = n.reduce((S, R) => S + R, 0),
    [, , , s = 0, h = 0, , , y = 0] = n;
  return { busy: reduced - s - h, steal: y, total: reduced, cpus: e.match(/^cpu\d+ /gm)?.length ?? 0 };
}
//@ chunk-tyg7f3ek.js:598997-599115 placement
function countFullCpuWindows(e, n) {
  if (n) e.fullWindows++;
  else if (e.lastWindowLow) e.fullWindows = 0;
  return ((e.lastWindowLow = !n), e.fullWindows);
}
//@ chunk-tyg7f3ek.js:599115-599212 placement
function isClaudeCodeAgentEnviron(e) {
  return e.split("\x00").some((n) => /^AI_AGENT=claude-code[_/].+[_/]agent$/.test(n));
}
//@ chunk-tyg7f3ek.js:599212-599450 placement
async function listAgentProcesses(e) {
  let n = [];
  for (let r of await e.names()) {
    let s = Number(r);
    if (!(s > 1) || s === process.pid) continue;
    let h = kI(await e.file(`${s}/stat`)),
      file = await e.file(`${s}/environ`);
    if (h !== void 0 && isClaudeCodeAgentEnviron(file)) n.push({ pid: s, startToken: h });
  }
  return n;
}
//@ chunk-tyg7f3ek.js:599450-599508 placement
function secondsToMs(e) {
  return typeof e === "number" && e > 0 ? e * 1000 : 1 / 0;
}
/**
 * hosted worker 上每 10 分钟读 /proc/stat，CPU 持续饱和时停止 agent 子进程并上报。
 */
//@ chunk-tyg7f3ek.js:599508-601512 placement
async function sampleHostCpuSaturation(e, n = Gp) {
  try {
    let r = parseProcStatCpu(await n.file("stat")),
      last = e.last;
    if (((e.last = r), r === void 0 || last === void 0 || r.total <= last.total)) return;
    let h = (r.busy - last.busy) / (r.total - last.total),
      y = h >= mG;
    if (e.stoppedLastWindow)
      ((e.stoppedLastWindow = !1),
        logForDiagnosticsNoPII("warn", "full_cpu_after_stop", { busy_pct: Math.round(h * 100) }));
    let S = e.fullWindows * jk,
      R = countFullCpuWindows(e, y) * jk;
    if (!y) return;
    let w = getFeatureValue_CACHED_MAY_BE_STALE(PROC_CPU_SAMPLING, null),
      P = secondsToMs(w?.stop_after_s),
      L = secondsToMs(w?.log_after_s),
      q = R >= P;
    if (!q && !(S < L && R >= L)) return;
    let x = await listAgentProcesses(n),
      filtered = Object.values(e.taskRegistry.all()).filter(
        (re) => isLocalShellTask(re) && re.status === "running",
      );
    if (q) ((e.fullWindows = 0), (e.stoppedLastWindow = !0), e.stops++);
    if (
      (logFeatureOk(q ? "ccr_full_cpu_stop" : "ccr_full_cpu_log"),
      logForDiagnosticsNoPII("warn", "full_cpu_stop", {
        stops: q,
        stops_so_far: e.stops,
        run_s: R / 1000,
        after_s: (q ? P : L) / 1000,
        cpus: r.cpus,
        busy_pct: Math.round(h * 100),
        steal_pct: Math.round(((r.steal - last.steal) / (r.total - last.total)) * 100),
        shell_tasks: filtered.length,
        shell_processes: x.length,
      }),
      !q || (filtered.length === 0 && x.length === 0))
    )
      return;
    let joined = filtered
      .slice(0, fG)
      .map((re) => `"${escapeXml(re.description)}"`)
      .join(", ");
    enqueuePendingNotification(
      {
        mode: "task-notification",
        priority: "next",
        agentId: mainAgentId(),
        skipAttachments: !0,
        value: formatTaskNotification({
          status: "stopped",
          summary: `This cloud sandbox used 90% or more of all its CPUs for ${formatDurationCoarse(R)}, almost without a break. The limit is ${formatDurationCoarse(P)}. At the limit, Claude Code stops the shell commands of this session and the processes that they started, also those that used little CPU. The commands themselves did not fail. The files are kept. Commands that use little CPU, such as a dev server, can start again. Work that fills the CPUs again will be stopped again, so do not start it again in the same form. Tell the user what was stopped and why. If the heavy work is still necessary, first agree with the user on a form that uses less CPU, for example a smaller job or fewer parallel workers.${joined && ` Stopped commands: ${joined}.`}`,
        }),
      },
      { turnAttribution: "inherit" },
    );
    for (let re of filtered) killTask(re.id, e.taskRegistry, { cause: "full_cpu" });
    for (let { pid: pid, startToken: startToken } of x)
      if (kI(await n.file(`${pid}/stat`)) === startToken) sigtermThenKill([pid], startToken);
  } catch (error) {
    (logFeatureBad("ccr_full_cpu_stop", "threw"), logError(error));
  }
}
//@ chunk-tyg7f3ek.js:601512-601682 placement
function startHostCpuSampler(e) {
  if (sessionHostKind() !== "hosted_worker" || isChildSession()) return;
  setInterval(sampleHostCpuSaturation, jk, {
    taskRegistry: e,
    last: void 0,
    fullWindows: 0,
    lastWindowLow: !1,
    stoppedLastWindow: !1,
    stops: 0,
  }).unref();
}
//@ chunk-tyg7f3ek.js:601792-601972 placement
function sessionSurfaceKind() {
  let e = getSessionEntrypoint();
  if (e === "remote_projects" || getCurrentAuthSurface()) return "projects";
  if (isCoworkSession()) return "cowork";
  if (e === "remote_trigger") return "trigger";
  return Udo.some((n) => n === e) ? "code" : "other";
}
//@ chunk-tyg7f3ek.js:601972-602053 placement
var WAIT_COMMAND_KINDS = new Set(["wait", "shell_word", "file_read", "file_search", "text_transform"]);
//@ chunk-tyg7f3ek.js:602053-602235 placement
function classifyBashForCpu(e) {
  let parts = classifyBashCommand(e).bash_command_kinds.split(",");
  if (parts.includes("serves_or_watches")) return "serve_or_watch";
  return parts.includes("wait") && parts.every((r) => WAIT_COMMAND_KINDS.has(r)) ? "wait" : "other";
}
//@ chunk-tyg7f3ek.js:602235-603290 placement
var TOOL_CPU_SAMPLING_FLAG = "tengu_starry_balloon",
  YF = 60000,
  rc = 10,
  RG = 30000,
  CG = 32,
  PG = 10080,
  MG = 10,
  AG = 10,
  EG = 9,
  IG = 64,
  OG = 16384,
  DG = 32,
  JF = 1024,
  FG = 262144,
  xG = 0.01,
  UG = 0.9,
  LG = /^ *\d+: \S+ \S+ 0A \S+ \S+ \S+ +\d+ +\d+ +(\d+) /gm,
  BG = {
    ...Gp,
    startOfFile: async (e) => {
      let n = await open_3(`/proc/${e}`).catch(() => {
        return;
      });
      if (n === void 0) return "";
      try {
        let allocUnsafe = Buffer.allocUnsafe(FG),
          s = 0;
        for (let h = -1; h !== 0 && s < allocUnsafe.length; s += h)
          h = (await n.read(allocUnsafe, s, allocUnsafe.length - s, null)).bytesRead;
        return allocUnsafe.toString("latin1", 0, s);
      } catch {
        return "";
      } finally {
        await n.close().catch(() => {});
      }
    },
    descriptorLinks: async (e) => {
      let n = /^FDSize:\s+(\d+)$/m.exec(await Gp.file(`${e}/status`))?.[1];
      if (n === void 0) return [];
      if (Number(n) > JF) return;
      try {
        let r = await readdir_4(`/proc/${e}/fd`);
        return r.length > JF
          ? void 0
          : await Promise.all(r.map((s) => readlink(`/proc/${e}/fd/${s}`).catch(() => "")));
      } catch (error) {
        let s = getErrnoCode(error);
        return s === "ENOENT" || s === "ESRCH" ? [] : void 0;
      }
    },
    outputBytes: getTaskOutputSize,
    shellCgroupCpuMs: async () => {
      let e = i7n(),
        n =
          e === void 0
            ? ""
            : (await readFile_3(posix_2.join(e, "cpuacct.usage"), "utf8").catch(() => "")).trim(),
        r = n === "" ? Number.NaN : Number(n);
      return Number.isFinite(r) ? r / 1e6 : void 0;
    },
  };
//@ chunk-tyg7f3ek.js:603290-603366 placement
function isValidMinuteMark(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 1 && e <= PG;
}
//@ chunk-tyg7f3ek.js:603366-603632 placement
function readToolCpuSamplingConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TOOL_CPU_SAMPLING_FLAG, null),
    n = Array.isArray(e?.marks_min)
      ? e.marks_min
          .slice(0, CG)
          .filter(isValidMinuteMark)
          .sort((r, s) => r - s)
      : [];
  return n.length === 0
    ? void 0
    : {
        marksMin: n,
        thenEveryMin:
          isValidMinuteMark(e?.then_every_min) && e.then_every_min >= MG ? e.then_every_min : void 0,
        fromStart: e?.from_start === !0,
      };
}
//@ chunk-tyg7f3ek.js:603632-603708 placement
function pushToMapList(e, n, r) {
  let s = e.get(n);
  if (s === void 0) e.set(n, [r]);
  else s.push(r);
}
//@ chunk-tyg7f3ek.js:603708-603793 placement
function runningLocalShells(e) {
  return getRunningTasks(e.getState())
    .filter(isLocalShellTask)
    .filter((n) => n.elsewhere === void 0);
}
/**
 * 采样后台 shell 进程树的 CPU 与监听端口，用于 tengu_tool_cpu_by_phase 遥测。
 */
//@ chunk-tyg7f3ek.js:603793-604870 placement
async function sampleShellCpuTree(e, n, r) {
  let s = parseProcStatCpu(await e.proc.file("stat"));
  if (s === void 0) return "no_cpu_counters";
  let monotonicNow = e.clock.monotonicNow(),
    filtered = (await e.proc.names()).map(Number).filter(Number.isInteger);
  if (filtered.length > MAX_PROC_ENTRIES) return "too_many_processes";
  let S = runningLocalShells(e),
    R = {
      markMin: r,
      atMs: monotonicNow,
      vmBusyTicks: s.busy,
      shellCgroupCpuMs: await e.proc.shellCgroupCpuMs(),
      processes: new Map(),
      childrenOf: new Map(),
      ledBy: new Map(),
      runningShellIds: new Set(S.map((P) => P.id)),
      shells: [],
    };
  for (let P of filtered) {
    if (e.timedOut) break;
    let L = parseStatTimes(await e.proc.file(`${P}/stat`));
    if (L !== void 0)
      (R.processes.set(P, L),
        pushToMapList(R.childrenOf, L.ppid, P),
        pushToMapList(R.ledBy, L.pgrp, P),
        pushToMapList(R.ledBy, L.session, P));
  }
  let kinds = e.kinds;
  e.kinds = new Map();
  for (let P of S.slice(0, AG)) {
    let L = n?.shells.find((x) => x.id === P.id),
      q = P.shellCommand?.pid;
    R.shells.push({
      id: P.id,
      pid: q,
      starttime: L?.starttime ?? (q === void 0 ? void 0 : R.processes.get(q)?.starttime),
      outputBytes: await e.proc.outputBytes(P.id).catch(() => {
        return;
      }),
      kind: kinds.get(P.id) ?? classifyBashForCpu(P.command),
      listens: void 0,
      usage: P.shellCommand?.result.then(
        (x) => x.shellUsage,
        () => {
          return;
        },
      ),
    });
  }
  for (let shell of R.shells) e.kinds.set(shell.id, shell.kind);
  return R;
}
//@ chunk-tyg7f3ek.js:604870-604977 placement
function isSameProcess(e, n, r) {
  let s = e.processes.get(r);
  return s !== void 0 && s.starttime === n.processes.get(r)?.starttime;
}
//@ chunk-tyg7f3ek.js:604977-605026 placement
function processLeaders(e, n) {
  return [n, ...(e.ledBy.get(n) ?? [])];
}
//@ chunk-tyg7f3ek.js:605026-605209 placement
function collectProcessTree(e, n, r, s) {
  let h = [],
    y = [...n];
  for (let S = y.pop(); S !== void 0; S = y.pop())
    if (!r.has(S) && e.processes.has(S) && !s?.(S))
      (r.add(S), h.push(S), y.push(...(e.childrenOf.get(S) ?? [])));
  return h;
}
//@ chunk-tyg7f3ek.js:605209-605327 placement
function sumProcessTicks(e, n) {
  return n.reduce((r, s) => {
    let h = e.processes.get(s);
    return r + (h?.ownTicks ?? 0) + (h?.childrenTicks ?? 0);
  }, 0);
}
//@ chunk-tyg7f3ek.js:605327-605608 placement
function diffProcessTreeCpu(e, n, r, s) {
  let h = collectProcessTree(n, processLeaders(n, r), s.now),
    y = new Set(h),
    S = collectProcessTree(
      e,
      h.filter((w) => isSameProcess(e, n, w)),
      s.then,
      (w) => isSameProcess(e, n, w) && !y.has(w),
    ),
    reduced = h.reduce(
      (w, P) =>
        w +
        (n.processes.get(P)?.ownTicks ?? 0) -
        (isSameProcess(e, n, P) ? (e.processes.get(P)?.ownTicks ?? 0) : 0),
      0,
    );
  return { tree: h, cpuMs: Math.max(reduced, sumProcessTicks(n, h) - sumProcessTicks(e, S)) * rc };
}
//@ chunk-tyg7f3ek.js:605608-605763 placement
async function listListeningSockets(e) {
  let n = new Set();
  for (let r of ["net/tcp", "net/tcp6"])
    for (let s of (await e.startOfFile(r)).matchAll(LG)) n.add(`socket:[${s[1]}]`);
  return n;
}
//@ chunk-tyg7f3ek.js:605763-606037 placement
async function checksListeningSockets(e, n, r) {
  if (r.listeningSockets.size === 0) return "no";
  let s = "no";
  for (let h of n) {
    let y = r.linksLeft > 0 ? await e.descriptorLinks(h) : void 0;
    if (y === void 0) {
      s = "unchecked";
      continue;
    }
    if (y.some((S) => r.listeningSockets.has(S))) return "yes";
    r.linksLeft -= DG + y.length;
  }
  return s;
}

export {
  createForkSeedVerifier,
  startHostCpuSampler,
  isBridgeForkSupported,
  mcpSyncNeeded,
  pickReusableMcpClients,
  mcpServersToReconnect,
  mergeMcpToolsAndCommands,
  applySdkMcpServerChanges,
  handleForkConversation,
  ForkSeedUnverifiedError,
  YF,
  sessionSurfaceKind,
  RG,
  readToolCpuSamplingConfig,
  sampleShellCpuTree,
  listListeningSockets,
  OG,
  diffProcessTreeCpu,
  checksListeningSockets,
  isSameProcess,
  collectProcessTree,
  processLeaders,
  sumProcessTicks,
  rc,
  xG,
  IG,
  isClaudeCodeAgentEnviron,
  EG,
  UG,
  runningLocalShells,
  BG,
};
