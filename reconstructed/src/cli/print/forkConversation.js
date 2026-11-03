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
import { mkdir, lstat, open, lutimes, unlink, readdir, readFile, readlink } from "fs/promises";
import { constants } from "fs";
import { posix } from "path";
import { DoctorLazy } from "../handlers/util.js";
import { u, literal, string, array, hu } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../services/mcp/schemaParse.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  FORK_SEED_MAX_BYTES,
  forkSeedPath,
  forkSeedsDir,
  FORK_SEED_UNLINK_RETRY_MS,
} from "./rewindConversation.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { getPlatform } from "../../utils/platform.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
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
import { procStatField, parseStatTimes } from "../../utils/procStat.js";
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
import { isCoworkSession, REMOTE_ENTRYPOINT_NAMES } from "../../utils/entrypointKinds.js";
import { classifyBashCommand } from "../../tools/BashTool/commandClassification.js";
import { getTaskOutputSize } from "../../utils/task/diskOutput.js";
import { getCpuacctDir } from "../../utils/shell/cpuReport.js";
import { getRunningTasks } from "../../utils/task/framework.js";
import { MAX_PROC_ENTRIES } from "../../utils/shell/processCpuTime.js";

//@ chunk-tyg7f3ek.js:588935-589005 sole-consumer
var TRANSCRIPT_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system", "progress"]);
//@ chunk-tyg7f3ek.js:589005-589179 affinity = isLegacyProgressEntry (0.8)
function isLegacyProgressEntry(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  let n = "type" in entry ? entry.type : undefined;
  let uuid = "uuid" in entry ? entry.uuid : undefined;
  return typeof n === "string" && TRANSCRIPT_MESSAGE_TYPES.has(n) && typeof uuid === "string";
}
//@ chunk-tyg7f3ek.js:589179-589288 placement = getParentSessionId (0.704)
var getParentSessionId = DoctorLazy(() =>
  u({
    version: literal(1),
    parentSessionId: string().min(1).max(200),
    createdAt: parseToolOutputSchema(),
    messages: array(hu(isLegacyProgressEntry)).min(1),
  }),
);
//@ chunk-tyg7f3ek.js:589288-589388 placement
class ForkSeedTooLargeError extends Error {
  bytes;
  constructor(bytes) {
    super("fork seed exceeds the size limit");
    this.bytes = bytes;
  }
}
//@ chunk-tyg7f3ek.js:589388-589535 placement
function encodeForkSeed(e) {
  let n = jsonStringify({
    version: 1,
    ...e,
  });
  let bytes = Buffer.byteLength(n);
  if (bytes > FORK_SEED_MAX_BYTES) throw new ForkSeedTooLargeError(bytes);
  return {
    body: n,
    sha256: createHash("sha256").update(n).digest("hex"),
  };
}
//@ chunk-tyg7f3ek.js:589535-589683 placement
async function writeForkSeed(e, n) {
  let r = forkSeedPath(e);
  if (!r) throw Error("fork seed: not a server session id");
  await mkdir(forkSeedsDir(), {
    recursive: true,
    mode: 448,
  });
  await writeFileAtomic(r, n, 384);
}
//@ chunk-tyg7f3ek.js:589683-590804 placement
/**
 * 读取 Remote Control fork 的种子文件（大小上限、非普通文件、符号链接检查），返回 none/invalid/seed。
 */
async function readForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n)
    return {
      kind: "none",
    };
  let r = getPlatform() === "windows";
  if (r)
    try {
      if (!(await lstat(n)).isFile()) {
        await deleteForkSeed(e);
        return {
          kind: "invalid",
          reason: "not_a_file",
        };
      }
    } catch (error) {
      if (isENOENT(error))
        return {
          kind: "none",
        };
      throw error;
    }
  let s;
  try {
    s = await open(
      n,
      r ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    if (isENOENT(error))
      return {
        kind: "none",
      };
    if (getErrnoCode(error) === "ELOOP") {
      await deleteForkSeed(e);
      return {
        kind: "invalid",
        reason: "not_a_file",
      };
    }
    throw error;
  }
  let h;
  try {
    let stats = await s.stat();
    if (!stats.isFile()) {
      await deleteForkSeed(e);
      return {
        kind: "invalid",
        reason: "not_a_file",
      };
    }
    if (stats.size > FORK_SEED_MAX_BYTES) {
      await deleteForkSeed(e);
      return {
        kind: "invalid",
        reason: "oversize",
      };
    }
    h = Buffer.allocUnsafe(stats.size + 1);
    let q = 0;
    let x;
    do {
      ({ bytesRead: x } = await s.read(h, q, h.length - q, null));
      q += x;
    } while (x > 0 && q < h.length);
    if (q > stats.size) {
      await deleteForkSeed(e);
      return {
        kind: "invalid",
        reason: "oversize",
      };
    }
    h = h.subarray(0, q);
  } finally {
    await s.close();
  }
  let y;
  try {
    y = jsonParse(h.toString("utf8"));
  } catch {
    y = undefined;
  }
  let S = getParentSessionId().safeParse(y);
  if (!S.success) {
    await deleteForkSeed(e);
    return {
      kind: "invalid",
      reason: "malformed",
    };
  }
  let { parentSessionId, createdAt, messages } = S.data;
  return {
    kind: "seed",
    seed: {
      parentSessionId,
      createdAt,
      messages,
    },
    sha256: createHash("sha256").update(h).digest("hex"),
  };
}
//@ chunk-tyg7f3ek.js:590804-590963 placement
async function touchForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n) return;
  let date = new Date();
  await lutimes(n, date, date).catch((error) => {
    logForDebugging(`[rc-fork] Could not refresh the seed's mtime for ${e}: ${errorMessage(error)}`);
  });
}
//@ chunk-tyg7f3ek.js:590963-591254 placement
async function deleteForkSeed(e) {
  let n = forkSeedPath(e);
  if (!n) return true;
  for (let j = 0; ; j++)
    try {
      await unlink(n);
      return true;
    } catch (error) {
      if (isENOENT(error)) return true;
      let errnoCode = getErrnoCode(error);
      if (j === 0 && (errnoCode === "EBUSY" || errnoCode === "EPERM")) {
        await sleep(FORK_SEED_UNLINK_RETRY_MS, undefined, {
          unref: true,
        });
        continue;
      }
      logForDebugging(`[rc-fork] Could not delete the seed for ${e}: ${errorMessage(error)}`, {
        level: "error",
      });
      return false;
    }
}
//@ chunk-tyg7f3ek.js:591254-591293 placement
function isBridgeForkSupported(e) {
  return Boolean(e) && isBridgeEnvironment();
}
//@ chunk-tyg7f3ek.js:591293-591334 placement
function bridgeForkSessionId(sdkUrl) {
  return isBridgeForkSupported(sdkUrl) ? getSupervisedBridgeSessionId() : undefined;
}
//@ chunk-tyg7f3ek.js:591334-593736 placement
/**
 * 处理 rc fork_conversation 控制请求：校验目标消息、写种子、创建新云会话并返回结果。
 */
async function handleForkConversation(request, n) {
  let targetMessageUuid = request.target_message_uuid;
  if (targetMessageUuid !== undefined && typeof targetMessageUuid !== "string")
    return {
      ok: false,
      error: "fork_conversation: target_message_uuid must be a string",
    };
  let title = request.title;
  if (title !== undefined && typeof title !== "string")
    return {
      ok: false,
      error: "fork_conversation: title must be a string",
    };
  let reference = bridgeForkSessionId(n.sdkUrl);
  if (reference === undefined || !isFirstPartyProvider() || isEssentialTrafficOnly())
    return forkRefused("unsupported");
  let y = n.blockedReason();
  if (y !== null) return forkRefused(y);
  if (isTranscriptPersistenceDisabled()) return forkRefused("history suppressed", "persistence_disabled");
  let S;
  let R;
  let w;
  if (targetMessageUuid !== undefined) {
    let rewindTarget = findRewindTarget(n.messages, targetMessageUuid);
    if (!rewindTarget) return forkRefused("target not found");
    if (hasCronToolUse(n.messages, rewindTarget.index)) return forkRefused("target splits a tool call");
    S = n.messages.slice(0, rewindTarget.index);
    R = rewindTarget.uuid;
    w = rewindTarget.prefillText ?? undefined;
  } else S = n.messages.slice();
  let sessionId = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return forkRefused("history suppressed");
  let L = title !== undefined ? sanitizeSessionTitle(title).replace(/\s+/g, " ") : "";
  let currentSessionDisplayTitle = getCurrentSessionDisplayTitle(sessionId);
  let x = currentSessionDisplayTitle
    ? sanitizeSessionTitle(`${currentSessionDisplayTitle} (fork)`).replace(/\s+/g, " ")
    : "";
  let title_2 = L || x || undefined;
  let id = null;
  try {
    let bridgeSessionOrStatus = await getBridgeSessionOrStatus(reference, {
      credentials: n.credentials,
    });
    if (!bridgeSessionOrStatus.session?.environment_id)
      return forkFailed(
        bridgeSessionOrStatus.session
          ? "no_environment"
          : bridgeSessionOrStatus.notFound
            ? "session_not_found"
            : "session_fetch_failed",
      );
    let environmentId = bridgeSessionOrStatus.session.environment_id;
    let Ue = null;
    if (S.length > 0)
      try {
        Ue = encodeForkSeed({
          parentSessionId: reference,
          createdAt: new Date().toISOString(),
          messages: S.map((Ee) =>
            withVersionToRecord(
              Ee.type === "system" && Ee.subtype === "model_refusal_fallback"
                ? {
                    ...Ee,
                    neutralizedByFork: true,
                  }
                : Ee,
            ),
          ),
        });
      } catch (error) {
        if (!(error instanceof ForkSeedTooLargeError)) throw error;
        return forkFailed("seed_too_large");
      }
    let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
    let { uploadForkDisplayHistory } = await import("./chunk-6kcmnrx0.js");
    let me = await forkHistorySuppression(sessionId, n.storageV5);
    if (me !== null) return forkRefused("history suppressed", me);
    id = await createBridgeSession({
      environmentId,
      title: title_2,
      gitRepoUrl,
      branch,
      defaultBranch,
      signal: AbortSignal.timeout(15000),
      credentials: n.credentials,
      permissionMode:
        n.permissionMode === "bypassPermissions" ? undefined : toExternalPermissionMode(n.permissionMode),
      tags: [
        REMOTE_CONTROL_FORK,
        `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(reference)}`,
        ...(Ue ? [`${REMOTE_CONTROL_FORK_SEED}${Ue.sha256}`] : []),
      ],
    });
    if (id === null) return forkFailed("session_create_failed");
    let Me = Ue && (await tryWriteForkSeed(id, Ue.body));
    if (Me === null) {
      let Ee = await forkHistorySuppression(sessionId, n.storageV5);
      if (Ee !== null) {
        await discardForkSession(id, n.credentials);
        return forkRefused("history suppressed", Ee);
      }
      Me = await uploadForkDisplayHistory(
        id,
        S,
        n.credentials,
        "rc_fork_conversation",
        n.host,
        n.getTools?.(),
      );
    }
    if (Me !== null) {
      await discardForkSession(id, n.credentials);
      return forkFailed(Me);
    }
    logFeatureOk("rc_fork_conversation");
    return {
      ok: true,
      response: {
        forked: true,
        sessionId: inSessionIdCostumeOf(reference, id),
        ...(R !== undefined && {
          targetMessageUuid: R,
        }),
        ...(w !== undefined && {
          prefillText: w,
        }),
      },
    };
  } catch (error) {
    logError(error);
    if (id !== null) await discardForkSession(id, n.credentials);
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
  return {
    ok: true,
    response: {
      forked: false,
      error: e,
      reason: FORK_REFUSAL_REASONS[e],
    },
  };
}
//@ chunk-tyg7f3ek.js:594147-594267 placement
function forkFailed(e) {
  logFeatureBad("rc_fork_conversation", e);
  return {
    ok: true,
    response: {
      forked: false,
      error: "fork failed",
      reason: "fork_failed",
    },
  };
}
//@ chunk-tyg7f3ek.js:594267-594402 placement
async function forkHistorySuppression(sessionId, storageV5) {
  let historySuppressionFromDisk = await readHistorySuppressionFromDisk(storageV5);
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return "history_suppressed";
  return historySuppressionFromDisk !== "clean" ? "history_suppressed_on_disk" : null;
}
//@ chunk-tyg7f3ek.js:594402-594566 placement
async function tryWriteForkSeed(e, body) {
  try {
    await writeForkSeed(e, body);
    return null;
  } catch (error) {
    logForDebugging(`[rc-fork] Could not write the seed for ${e}: ${errorMessage(error)}`, {
      level: "error",
    });
    return "seed_write_failed";
  }
}
//@ chunk-tyg7f3ek.js:594566-594685 placement
async function discardForkSession(e, credentials) {
  await deleteForkSeed(e);
  let { archiveAbandonedForkSession } = await import("./chunk-6kcmnrx0.js");
  await archiveAbandonedForkSession(e, credentials);
}
//@ chunk-tyg7f3ek.js:594685-594733 placement
var FORK_VERIFY_TIMINGS = 600000;
var FORK_NOTE_WRITE_TIMEOUT_MS = 5000;
var REVOKED = "revoked";
var FORK_RETRY_MAX_ATTEMPTS = 3;
var FORK_RETRY_BASE_DELAY_MS = 2000;
//@ chunk-tyg7f3ek.js:594733-594969 placement
class ForkSeedUnverifiedError extends Error {
  code;
  retryable;
  constructor(code, retryable = true) {
    super(
      "this Remote Control session's forked conversation could not be verified; it is kept for the next start",
    );
    this.code = code;
    this.retryable = retryable;
    this.name = "ForkSeedUnverifiedError";
  }
}
//@ chunk-tyg7f3ek.js:594969-596723 placement
/**
 * 启动时核对上一次 Remote Control fork 的种子是否已被服务器接收，未确认则保留到下次。
 */
function createForkSeedVerifier({ sdkUrl, credentials, writeNote }) {
  let s = bridgeForkSessionId(sdkUrl);
  if (s === undefined) return null;
  let h = s;
  let y = false;
  function S(L) {
    return Promise.race([
      writeNote(L),
      sleep(FORK_NOTE_WRITE_TIMEOUT_MS, undefined, {
        unref: true,
      }).then(() => false),
    ]);
  }
  function R(code) {
    logFeatureSad("rc_fork_conversation", code);
  }
  async function w() {
    if (!isFirstPartyProvider()) throw new ForkSeedUnverifiedError("provider_not_first_party", false);
    let { session } = await getBridgeSessionOrStatus(h, {
      credentials,
      useV2: true,
    });
    let tags = session?.tags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))
      throw new ForkSeedUnverifiedError("record_unread");
    return tags;
  }
  async function P(L) {
    if (L.sha256 === REVOKED) {
      await deleteForkSeed(h);
      return null;
    }
    let q;
    try {
      q = await readForkSeed(h);
    } catch (error) {
      logForDebugging(`[rc-fork] ${errorMessage(error)}`, {
        level: "error",
      });
      if (!(await w()).includes(REMOTE_CONTROL_FORK)) {
        R("seed_unreadable");
        return null;
      }
      throw new ForkSeedUnverifiedError("seed_unreadable");
    }
    if (q.kind === "none") return null;
    if (q.kind === "invalid") {
      R(`seed_${q.reason}`);
      return null;
    }
    if (L.unread) throw new ForkSeedUnverifiedError("note_unread", false);
    let { messages, createdAt, parentSessionId } = q.seed;
    let re = await w();
    let filtered = re.filter((ce) => ce.startsWith(REMOTE_CONTROL_FORK_SEED));
    if (
      !re.includes(REMOTE_CONTROL_FORK) ||
      filtered.length !== 1 ||
      filtered[0] !== `${REMOTE_CONTROL_FORK_SEED}${q.sha256}`
    ) {
      R("seed_unbound");
      await deleteForkSeed(h);
      return null;
    }
    let Ue = L.sha256 !== undefined && /^[0-9a-f]{64}$/.test(L.sha256) && L.sha256 === q.sha256;
    if (!Ue) {
      if (Date.now() - Date.parse(createdAt) > FORK_VERIFY_TIMINGS) {
        R("note_missing");
        await deleteForkSeed(h);
        return null;
      }
      if (!(await S(q.sha256))) R("note_unconfirmed");
    }
    await touchForkSeed(h);
    logForDebugging(`[rc-fork] Seeded ${messages.length} messages from ${parentSessionId}`);
    y = true;
    return {
      rows: messages,
      firstBoot: !Ue,
    };
  }
  return {
    async adoptSeed(L) {
      y = false;
      for (let j = 1; ; j++)
        try {
          return await P(L);
        } catch (error) {
          if (!(error instanceof ForkSeedUnverifiedError)) {
            logError(error);
            logFeatureBad("rc_fork_conversation", "seed_failed");
            throw error;
          }
          if (error.retryable && j < FORK_RETRY_MAX_ATTEMPTS) {
            await sleep(FORK_RETRY_BASE_DELAY_MS * j, undefined, {
              unref: true,
            });
            continue;
          }
          R(error.code);
          throw error;
        }
    },
    isFork() {
      return y;
    },
    async discardSeed() {
      try {
        let [L, q] = await Promise.all([S(REVOKED), deleteForkSeed(h)]);
        if (q) y = false;
        if (!L && !q) R("revoke_unconfirmed");
      } catch (error) {
        logError(error);
        logFeatureBad("rc_fork_conversation", "revoke_failed");
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:596723-596952 placement
function mcpSyncNeeded(e, n) {
  for (let key of Object.keys(e)) if (!n.some((h) => h.name === key)) return "sync";
  let r = false;
  for (let s of n) {
    if (!Object.hasOwn(e, s.name) || s.type === "pending") return "sync";
    if (s.type === "failed") r = true;
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
          (r && y.type === "connected" && y.toolsListError === undefined && !y.skillsListFailed),
      )
      .map((y) => y.name),
  );
  let h = Object.create(null);
  for (let [key, value] of Object.entries(e)) if (!s.has(key)) h[key] = value;
  return h;
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
//@ chunk-tyg7f3ek.js:597627-598552 placement
/**
 * 应用 SDK 宿主的 MCP 服务器增删：计算新增/删除/重连集合并更新客户端、工具与命令。
 */
function applySdkMcpServerChanges(e, n, r) {
  let { sdkServersAdded, sdkServersRemoved } = r;
  let y = new Set(e.clients.map((client) => client.name));
  let S = new Set(sdkServersAdded.filter((G) => !y.has(G)));
  let filtered = sdkServersRemoved.filter((G) => y.has(G));
  let filtered_2 = sdkServersAdded.filter((G) => !Object.hasOwn(e.configs, G));
  let filtered_3 = sdkServersRemoved.filter((G) => Object.hasOwn(e.configs, G));
  let filtered_4 = r.sdkServersUpdated.filter(
    (G) => Object.hasOwn(e.configs, G) && e.configs[G] === r.sdkConfigsAtSnapshot[G],
  );
  if (
    S.size === 0 &&
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0
  )
    return {
      state: e,
      clientsToCleanUp: [],
    };
  let merged = Object.assign(Object.create(null), e.configs);
  for (let G of filtered_3) delete merged[G];
  for (let G of [...filtered_2, ...filtered_4]) {
    let Z = getOwn(r.newSdkState.configs, G);
    if (Z !== undefined) merged[G] = Z;
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
var PROC_CPU_SAMPLING = "tengu_hidden_giraffe";
var HOST_CPU_WINDOW_MS = 600000;
var HOST_CPU_SATURATION_RATIO = 0.9;
var HOST_CPU_TOP_PROCESSES = 10;
var PROC_FS_READER = {
  names: () => readdir("/proc"),
  file: (e) => readFile(`/proc/${e}`, "utf8").catch(() => ""),
};
//@ chunk-tyg7f3ek.js:598734-598997 placement
function parseProcStatCpu(e) {
  let mapped = /^cpu +(.+)$/m.exec(e)?.[1]?.split(/ +/).slice(0, 8).map(Number);
  if (mapped === undefined || mapped.length < 8 || mapped.some(Number.isNaN)) return;
  let reduced = mapped.reduce((acc, R) => acc + R, 0);
  let [, , , s = 0, h = 0, , , y = 0] = mapped;
  return {
    busy: reduced - s - h,
    steal: y,
    total: reduced,
    cpus: e.match(/^cpu\d+ /gm)?.length ?? 0,
  };
}
//@ chunk-tyg7f3ek.js:598997-599115 placement
function countFullCpuWindows(e, n) {
  if (n) e.fullWindows++;
  else if (e.lastWindowLow) e.fullWindows = 0;
  e.lastWindowLow = !n;
  return e.fullWindows;
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
    let h = procStatField(await e.file(`${s}/stat`));
    let y = await e.file(`${s}/environ`);
    if (h !== undefined && isClaudeCodeAgentEnviron(y))
      n.push({
        pid: s,
        startToken: h,
      });
  }
  return n;
}
//@ chunk-tyg7f3ek.js:599450-599508 placement
function secondsToMs(e) {
  return typeof e === "number" && e > 0 ? e * 1000 : 1 / 0;
}
//@ chunk-tyg7f3ek.js:599508-601512 placement
/**
 * hosted worker 上每 10 分钟读 /proc/stat，CPU 持续饱和时停止 agent 子进程并上报。
 */
async function sampleHostCpuSaturation(e, n = PROC_FS_READER) {
  try {
    let procStatCpu = parseProcStatCpu(await n.file("stat"));
    let last = e.last;
    e.last = procStatCpu;
    if (procStatCpu === undefined || last === undefined || procStatCpu.total <= last.total) return;
    let h = (procStatCpu.busy - last.busy) / (procStatCpu.total - last.total);
    let y = h >= HOST_CPU_SATURATION_RATIO;
    if (e.stoppedLastWindow) {
      e.stoppedLastWindow = false;
      logForDiagnosticsNoPII("warn", "full_cpu_after_stop", {
        busy_pct: Math.round(h * 100),
      });
    }
    let S = e.fullWindows * HOST_CPU_WINDOW_MS;
    let R = countFullCpuWindows(e, y) * HOST_CPU_WINDOW_MS;
    if (!y) return;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(PROC_CPU_SAMPLING, null);
    let P = secondsToMs(featureValue_CACHED_MAY_BE_STALE?.stop_after_s);
    let L = secondsToMs(featureValue_CACHED_MAY_BE_STALE?.log_after_s);
    let q = R >= P;
    if (!q && !(S < L && R >= L)) return;
    let x = await listAgentProcesses(n);
    let filtered = Object.values(e.taskRegistry.all()).filter(
      (re) => isLocalShellTask(re) && re.status === "running",
    );
    if (q) {
      e.fullWindows = 0;
      e.stoppedLastWindow = true;
      e.stops++;
    }
    logFeatureOk(q ? "ccr_full_cpu_stop" : "ccr_full_cpu_log");
    logForDiagnosticsNoPII("warn", "full_cpu_stop", {
      stops: q,
      stops_so_far: e.stops,
      run_s: R / 1000,
      after_s: (q ? P : L) / 1000,
      cpus: procStatCpu.cpus,
      busy_pct: Math.round(h * 100),
      steal_pct: Math.round(((procStatCpu.steal - last.steal) / (procStatCpu.total - last.total)) * 100),
      shell_tasks: filtered.length,
      shell_processes: x.length,
    });
    if (!q || (filtered.length === 0 && x.length === 0)) return;
    let joined = filtered
      .slice(0, HOST_CPU_TOP_PROCESSES)
      .map((re) => `"${escapeXml(re.description)}"`)
      .join(", ");
    enqueuePendingNotification(
      {
        mode: "task-notification",
        priority: "next",
        agentId: mainAgentId(),
        skipAttachments: true,
        value: formatTaskNotification({
          status: "stopped",
          summary: `This cloud sandbox used 90% or more of all its CPUs for ${formatDurationCoarse(R)}, almost without a break. The limit is ${formatDurationCoarse(P)}. At the limit, Claude Code stops the shell commands of this session and the processes that they started, also those that used little CPU. The commands themselves did not fail. The files are kept. Commands that use little CPU, such as a dev server, can start again. Work that fills the CPUs again will be stopped again, so do not start it again in the same form. Tell the user what was stopped and why. If the heavy work is still necessary, first agree with the user on a form that uses less CPU, for example a smaller job or fewer parallel workers.${joined && ` Stopped commands: ${joined}.`}`,
        }),
      },
      {
        turnAttribution: "inherit",
      },
    );
    for (let re of filtered)
      killTask(re.id, e.taskRegistry, {
        cause: "full_cpu",
      });
    for (let { pid, startToken } of x)
      if (procStatField(await n.file(`${pid}/stat`)) === startToken) sigtermThenKill([pid], startToken);
  } catch (error) {
    logFeatureBad("ccr_full_cpu_stop", "threw");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:601512-601682 placement
function startHostCpuSampler(taskRegistry) {
  if (sessionHostKind() !== "hosted_worker" || isChildSession()) return;
  setInterval(sampleHostCpuSaturation, HOST_CPU_WINDOW_MS, {
    taskRegistry,
    last: undefined,
    fullWindows: 0,
    lastWindowLow: false,
    stoppedLastWindow: false,
    stops: 0,
  }).unref();
}
//@ chunk-tyg7f3ek.js:601792-601972 placement
function sessionSurfaceKind() {
  let sessionEntrypoint = getSessionEntrypoint();
  if (sessionEntrypoint === "remote_projects" || getCurrentAuthSurface()) return "projects";
  if (isCoworkSession()) return "cowork";
  if (sessionEntrypoint === "remote_trigger") return "trigger";
  return REMOTE_ENTRYPOINT_NAMES.some((n) => n === sessionEntrypoint) ? "code" : "other";
}
//@ chunk-tyg7f3ek.js:601972-602053 placement
var WAIT_COMMAND_KINDS = new Set(["wait", "shell_word", "file_read", "file_search", "text_transform"]);
//@ chunk-tyg7f3ek.js:602053-602235 placement
function classifyBashForCpu(command) {
  let parts = classifyBashCommand(command).bash_command_kinds.split(",");
  if (parts.includes("serves_or_watches")) return "serve_or_watch";
  return parts.includes("wait") && parts.every((r) => WAIT_COMMAND_KINDS.has(r)) ? "wait" : "other";
}
//@ chunk-tyg7f3ek.js:602235-603290 placement
/**
 * 工具 CPU 采样常量：分钟刻度、时钟 tick、采样超时、各类条数上限、/proc 读取上限与噪声阈值，以及带 fd/environ/cgroup 读取的 proc 读取器实现。
 */
var TOOL_CPU_SAMPLING_FLAG = "tengu_starry_balloon";
var MINUTE_MS = 60000;
var CLOCK_TICKS_MS = 10;
var CPU_MARK_TIMEOUT_MS = 30000;
var MAX_CPU_MARKS = 32;
var MAX_MINUTE_MARK = 10080;
var MIN_THEN_EVERY_MIN = 10;
var MAX_SHELLS_SAMPLED = 10;
var MAX_FULL_CORE_PROCESSES = 9;
var MAX_CPU_PROCESSES = 64;
var MAX_DESCRIPTOR_LINKS = 16384;
var DESCRIPTOR_LINK_COST = 32;
var MAX_FD_ENTRIES = 1024;
var ENVIRON_READ_BYTES = 262144;
var CPU_NOISE_RATIO = 0.01;
var FULL_CORE_CPU_RATIO = 0.9;
var PROC_STAT_PATTERN = /^ *\d+: \S+ \S+ 0A \S+ \S+ \S+ +\d+ +\d+ +(\d+) /gm;
var PROC_FS_READER_WITH_LINKS = {
  ...PROC_FS_READER,
  startOfFile: async (e) => {
    let n = await open(`/proc/${e}`).catch(() => {
      return;
    });
    if (n === undefined) return "";
    try {
      let r = Buffer.allocUnsafe(ENVIRON_READ_BYTES);
      let s = 0;
      for (let h = -1; h !== 0 && s < r.length; s += h)
        h = (await n.read(r, s, r.length - s, null)).bytesRead;
      return r.toString("latin1", 0, s);
    } catch {
      return "";
    } finally {
      await n.close().catch(() => {});
    }
  },
  descriptorLinks: async (e) => {
    let n = /^FDSize:\s+(\d+)$/m.exec(await PROC_FS_READER.file(`${e}/status`))?.[1];
    if (n === undefined) return [];
    if (Number(n) > MAX_FD_ENTRIES) return;
    try {
      let r = await readdir(`/proc/${e}/fd`);
      return r.length > MAX_FD_ENTRIES
        ? undefined
        : await Promise.all(r.map((s) => readlink(`/proc/${e}/fd/${s}`).catch(() => "")));
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ESRCH" ? [] : undefined;
    }
  },
  outputBytes: getTaskOutputSize,
  shellCgroupCpuMs: async () => {
    let cpuacctDir = getCpuacctDir();
    let n =
      cpuacctDir === undefined
        ? ""
        : (await readFile(posix.join(cpuacctDir, "cpuacct.usage"), "utf8").catch(() => "")).trim();
    let r = n === "" ? Number.NaN : Number(n);
    return Number.isFinite(r) ? r / 1e6 : undefined;
  },
};
//@ chunk-tyg7f3ek.js:603290-603366 placement
function isValidMinuteMark(thenEveryMin) {
  return (
    typeof thenEveryMin === "number" &&
    Number.isInteger(thenEveryMin) &&
    thenEveryMin >= 1 &&
    thenEveryMin <= MAX_MINUTE_MARK
  );
}
//@ chunk-tyg7f3ek.js:603366-603632 placement
function readToolCpuSamplingConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TOOL_CPU_SAMPLING_FLAG, null);
  let n = Array.isArray(featureValue_CACHED_MAY_BE_STALE?.marks_min)
    ? featureValue_CACHED_MAY_BE_STALE.marks_min
        .slice(0, MAX_CPU_MARKS)
        .filter(isValidMinuteMark)
        .sort((r, s) => r - s)
    : [];
  return n.length === 0
    ? undefined
    : {
        marksMin: n,
        thenEveryMin:
          isValidMinuteMark(featureValue_CACHED_MAY_BE_STALE?.then_every_min) &&
          featureValue_CACHED_MAY_BE_STALE.then_every_min >= MIN_THEN_EVERY_MIN
            ? featureValue_CACHED_MAY_BE_STALE.then_every_min
            : undefined,
        fromStart: featureValue_CACHED_MAY_BE_STALE?.from_start === true,
      };
}
//@ chunk-tyg7f3ek.js:603632-603708 placement
function pushToMapList(e, n, r) {
  let s = e.get(n);
  if (s === undefined) e.set(n, [r]);
  else s.push(r);
}
//@ chunk-tyg7f3ek.js:603708-603793 placement
function runningLocalShells(e) {
  return getRunningTasks(e.getState())
    .filter(isLocalShellTask)
    .filter((n) => n.elsewhere === undefined);
}
//@ chunk-tyg7f3ek.js:603793-604870 placement
/**
 * 采样后台 shell 进程树的 CPU 与监听端口，用于 tengu_tool_cpu_by_phase 遥测。
 */
async function sampleShellCpuTree(e, last, markMin) {
  let procStatCpu = parseProcStatCpu(await e.proc.file("stat"));
  if (procStatCpu === undefined) return "no_cpu_counters";
  let atMs = e.clock.monotonicNow();
  let filtered = (await e.proc.names()).map(Number).filter(Number.isInteger);
  if (filtered.length > MAX_PROC_ENTRIES) return "too_many_processes";
  let S = runningLocalShells(e);
  let R = {
    markMin,
    atMs,
    vmBusyTicks: procStatCpu.busy,
    shellCgroupCpuMs: await e.proc.shellCgroupCpuMs(),
    processes: new Map(),
    childrenOf: new Map(),
    ledBy: new Map(),
    runningShellIds: new Set(S.map((P) => P.id)),
    shells: [],
  };
  for (let P of filtered) {
    if (e.timedOut) break;
    let statTimes = parseStatTimes(await e.proc.file(`${P}/stat`));
    if (statTimes !== undefined) {
      R.processes.set(P, statTimes);
      pushToMapList(R.childrenOf, statTimes.ppid, P);
      pushToMapList(R.ledBy, statTimes.pgrp, P);
      pushToMapList(R.ledBy, statTimes.session, P);
    }
  }
  let kinds = e.kinds;
  e.kinds = new Map();
  for (let P of S.slice(0, MAX_SHELLS_SAMPLED)) {
    let found = last?.shells.find((shell) => shell.id === P.id);
    let pid = P.shellCommand?.pid;
    R.shells.push({
      id: P.id,
      pid,
      starttime: found?.starttime ?? (pid === undefined ? undefined : R.processes.get(pid)?.starttime),
      outputBytes: await e.proc.outputBytes(P.id).catch(() => {
        return;
      }),
      kind: kinds.get(P.id) ?? classifyBashForCpu(P.command),
      listens: undefined,
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
  return s !== undefined && s.starttime === n.processes.get(r)?.starttime;
}
//@ chunk-tyg7f3ek.js:604977-605026 placement
function processLeaders(e, pid) {
  return [pid, ...(e.ledBy.get(pid) ?? [])];
}
//@ chunk-tyg7f3ek.js:605026-605209 placement
function collectProcessTree(e, n, now, s) {
  let h = [];
  let y = [...n];
  for (let S = y.pop(); S !== undefined; S = y.pop())
    if (!now.has(S) && e.processes.has(S) && !s?.(S)) {
      now.add(S);
      h.push(S);
      y.push(...(e.childrenOf.get(S) ?? []));
    }
  return h;
}
//@ chunk-tyg7f3ek.js:605209-605327 placement
function sumProcessTicks(e, processTree) {
  return processTree.reduce((acc, s) => {
    let h = e.processes.get(s);
    return acc + (h?.ownTicks ?? 0) + (h?.childrenTicks ?? 0);
  }, 0);
}
//@ chunk-tyg7f3ek.js:605327-605608 placement
function diffProcessTreeCpu(e, n, pid, s) {
  let processTree = collectProcessTree(n, processLeaders(n, pid), s.now);
  let y = new Set(processTree);
  let processTree_2 = collectProcessTree(
    e,
    processTree.filter((w) => isSameProcess(e, n, w)),
    s.then,
    (w) => isSameProcess(e, n, w) && !y.has(w),
  );
  let reduced = processTree.reduce(
    (acc, P) =>
      acc +
      (n.processes.get(P)?.ownTicks ?? 0) -
      (isSameProcess(e, n, P) ? (e.processes.get(P)?.ownTicks ?? 0) : 0),
    0,
  );
  return {
    tree: processTree,
    cpuMs:
      Math.max(reduced, sumProcessTicks(n, processTree) - sumProcessTicks(e, processTree_2)) * CLOCK_TICKS_MS,
  };
}
//@ chunk-tyg7f3ek.js:605608-605763 placement
async function listListeningSockets(proc) {
  let n = new Set();
  for (let r of ["net/tcp", "net/tcp6"])
    for (let s of (await proc.startOfFile(r)).matchAll(PROC_STAT_PATTERN)) n.add(`socket:[${s[1]}]`);
  return n;
}
//@ chunk-tyg7f3ek.js:605763-606037 placement
async function checksListeningSockets(proc, tree, r) {
  if (r.listeningSockets.size === 0) return "no";
  let s = "no";
  for (let h of tree) {
    let y = r.linksLeft > 0 ? await proc.descriptorLinks(h) : undefined;
    if (y === undefined) {
      s = "unchecked";
      continue;
    }
    if (y.some((S) => r.listeningSockets.has(S))) return "yes";
    r.linksLeft -= DESCRIPTOR_LINK_COST + y.length;
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
  MINUTE_MS,
  sessionSurfaceKind,
  CPU_MARK_TIMEOUT_MS,
  readToolCpuSamplingConfig,
  sampleShellCpuTree,
  listListeningSockets,
  MAX_DESCRIPTOR_LINKS,
  diffProcessTreeCpu,
  checksListeningSockets,
  isSameProcess,
  collectProcessTree,
  processLeaders,
  sumProcessTicks,
  CLOCK_TICKS_MS,
  CPU_NOISE_RATIO,
  MAX_CPU_PROCESSES,
  isClaudeCodeAgentEnviron,
  MAX_FULL_CORE_PROCESSES,
  FULL_CORE_CPU_RATIO,
  runningLocalShells,
  PROC_FS_READER_WITH_LINKS,
};
