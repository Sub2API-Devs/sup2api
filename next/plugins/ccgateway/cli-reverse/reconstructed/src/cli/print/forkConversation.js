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
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  custom,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:588935-589005 sole-consumer
var TRANSCRIPT_MESSAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:588935", () => {
  TRANSCRIPT_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system", "progress"]);
});
//@ chunk-tyg7f3ek.js:589005-589179 affinity = isLegacyProgressEntry (0.8)
function isLegacyProgressEntry(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  let type = "type" in entry ? entry.type : undefined;
  let uuid = "uuid" in entry ? entry.uuid : undefined;
  return typeof type === "string" && TRANSCRIPT_MESSAGE_TYPES.has(type) && typeof uuid === "string";
}
//@ chunk-tyg7f3ek.js:589179-589288 placement = getParentSessionId (0.704)
var getParentSessionId; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:589179", () => {
  getParentSessionId = DoctorLazy(() =>
    objectSchema({
      version: literal(1),
      parentSessionId: stringSchema().min(1).max(200),
      createdAt: parseToolOutputSchema(),
      messages: array(custom(isLegacyProgressEntry)).min(1),
    }),
  );
});
//@ chunk-tyg7f3ek.js:589288-589388 placement
class ForkSeedTooLargeError extends Error {
  bytes;
  constructor(bytes) {
    super("fork seed exceeds the size limit");
    this.bytes = bytes;
  }
}
//@ chunk-tyg7f3ek.js:589388-589535 placement
function encodeForkSeed(seed) {
  let body = jsonStringify({
    version: 1,
    ...seed,
  });
  let bytes = Buffer.byteLength(body);
  if (bytes > FORK_SEED_MAX_BYTES) throw new ForkSeedTooLargeError(bytes);
  return {
    body,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
}
//@ chunk-tyg7f3ek.js:589535-589683 placement
async function writeForkSeed(sessionId, body) {
  let path = forkSeedPath(sessionId);
  if (!path) throw Error("fork seed: not a server session id");
  await mkdir(forkSeedsDir(), {
    recursive: true,
    mode: 448,
  });
  await writeFileAtomic(path, body, 384);
}
//@ chunk-tyg7f3ek.js:589683-590804 placement
/**
 * 读取 Remote Control fork 的种子文件（大小上限、非普通文件、符号链接检查），返回 none/invalid/seed。
 */
async function readForkSeed(sessionId) {
  let path = forkSeedPath(sessionId);
  if (!path)
    return {
      kind: "none",
    };
  let isWindows = getPlatform() === "windows";
  if (isWindows)
    try {
      if (!(await lstat(path)).isFile()) {
        await deleteForkSeed(sessionId);
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
  let handle;
  try {
    handle = await open(
      path,
      isWindows ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    if (isENOENT(error))
      return {
        kind: "none",
      };
    if (getErrnoCode(error) === "ELOOP") {
      await deleteForkSeed(sessionId);
      return {
        kind: "invalid",
        reason: "not_a_file",
      };
    }
    throw error;
  }
  let buffer;
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) {
      await deleteForkSeed(sessionId);
      return {
        kind: "invalid",
        reason: "not_a_file",
      };
    }
    if (stats.size > FORK_SEED_MAX_BYTES) {
      await deleteForkSeed(sessionId);
      return {
        kind: "invalid",
        reason: "oversize",
      };
    }
    buffer = Buffer.allocUnsafe(stats.size + 1);
    let total = 0;
    let bytesRead;
    do {
      ({ bytesRead } = await handle.read(buffer, total, buffer.length - total, null));
      total += bytesRead;
    } while (bytesRead > 0 && total < buffer.length);
    if (total > stats.size) {
      await deleteForkSeed(sessionId);
      return {
        kind: "invalid",
        reason: "oversize",
      };
    }
    buffer = buffer.subarray(0, total);
  } finally {
    await handle.close();
  }
  let parsed;
  try {
    parsed = jsonParse(buffer.toString("utf8"));
  } catch {
    parsed = undefined;
  }
  let parsedSchema = getParentSessionId().safeParse(parsed);
  if (!parsedSchema.success) {
    await deleteForkSeed(sessionId);
    return {
      kind: "invalid",
      reason: "malformed",
    };
  }
  let { parentSessionId, createdAt, messages } = parsedSchema.data;
  return {
    kind: "seed",
    seed: {
      parentSessionId,
      createdAt,
      messages,
    },
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
//@ chunk-tyg7f3ek.js:590804-590963 placement
async function touchForkSeed(sessionId) {
  let path = forkSeedPath(sessionId);
  if (!path) return;
  let date = new Date();
  await lutimes(path, date, date).catch((error) => {
    logForDebugging(`[rc-fork] Could not refresh the seed's mtime for ${sessionId}: ${errorMessage(error)}`);
  });
}
//@ chunk-tyg7f3ek.js:590963-591254 placement
async function deleteForkSeed(sessionId) {
  let path = forkSeedPath(sessionId);
  if (!path) return true;
  for (let j = 0; ; j++)
    try {
      await unlink(path);
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
      logForDebugging(`[rc-fork] Could not delete the seed for ${sessionId}: ${errorMessage(error)}`, {
        level: "error",
      });
      return false;
    }
}
//@ chunk-tyg7f3ek.js:591254-591293 placement
function isBridgeForkSupported(reference) {
  return Boolean(reference) && isBridgeEnvironment();
}
//@ chunk-tyg7f3ek.js:591293-591334 placement
function bridgeForkSessionId(reference) {
  return isBridgeForkSupported(reference) ? getSupervisedBridgeSessionId() : undefined;
}
//@ chunk-tyg7f3ek.js:591334-593736 placement
/**
 * 处理 rc fork_conversation 控制请求：校验目标消息、写种子、创建新云会话并返回结果。
 */
async function handleForkConversation(request, context) {
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
  let reference = bridgeForkSessionId(context.sdkUrl);
  if (reference === undefined || !isFirstPartyProvider() || isEssentialTrafficOnly())
    return forkRefused("unsupported");
  let blockedReason = context.blockedReason();
  if (blockedReason !== null) return forkRefused(blockedReason);
  if (isTranscriptPersistenceDisabled()) return forkRefused("history suppressed", "persistence_disabled");
  let messages;
  let targetUuid;
  let prefillText;
  if (targetMessageUuid !== undefined) {
    let rewindTarget = findRewindTarget(context.messages, targetMessageUuid);
    if (!rewindTarget) return forkRefused("target not found");
    if (hasCronToolUse(context.messages, rewindTarget.index)) return forkRefused("target splits a tool call");
    messages = context.messages.slice(0, rewindTarget.index);
    targetUuid = rewindTarget.uuid;
    prefillText = rewindTarget.prefillText ?? undefined;
  } else messages = context.messages.slice();
  let sessionId = getSessionId();
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) return forkRefused("history suppressed");
  let sanitizedTitle = title !== undefined ? sanitizeSessionTitle(title).replace(/\s+/g, " ") : "";
  let currentSessionDisplayTitle = getCurrentSessionDisplayTitle(sessionId);
  let forkTitle = currentSessionDisplayTitle
    ? sanitizeSessionTitle(`${currentSessionDisplayTitle} (fork)`).replace(/\s+/g, " ")
    : "";
  let title_2 = sanitizedTitle || forkTitle || undefined;
  let sessionId_2 = null;
  try {
    let bridgeSessionOrStatus = await getBridgeSessionOrStatus(reference, {
      credentials: context.credentials,
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
    let seed = null;
    if (messages.length > 0)
      try {
        seed = encodeForkSeed({
          parentSessionId: reference,
          createdAt: new Date().toISOString(),
          messages: messages.map((message) =>
            withVersionToRecord(
              message.type === "system" && message.subtype === "model_refusal_fallback"
                ? {
                    ...message,
                    neutralizedByFork: true,
                  }
                : message,
            ),
          ),
        });
      } catch (error) {
        if (!(error instanceof ForkSeedTooLargeError)) throw error;
        return forkFailed("seed_too_large");
      }
    let { branch, gitRepoUrl, defaultBranch } = await snapshotGitEvidenceForBridge();
    let { uploadForkDisplayHistory } = await import("../../bridge/forkHistoryUpload.js");
    let suppression = await forkHistorySuppression(sessionId, context.storageV5);
    if (suppression !== null) return forkRefused("history suppressed", suppression);
    sessionId_2 = await createBridgeSession({
      environmentId,
      title: title_2,
      gitRepoUrl,
      branch,
      defaultBranch,
      signal: AbortSignal.timeout(15000),
      credentials: context.credentials,
      permissionMode:
        context.permissionMode === "bypassPermissions"
          ? undefined
          : toExternalPermissionMode(context.permissionMode),
      tags: [
        REMOTE_CONTROL_FORK,
        `${REMOTE_CONTROL_FORK_PARENT}${toCompatSessionId(reference)}`,
        ...(seed ? [`${REMOTE_CONTROL_FORK_SEED}${seed.sha256}`] : []),
      ],
    });
    if (sessionId_2 === null) return forkFailed("session_create_failed");
    let uploadFailure = seed && (await tryWriteForkSeed(sessionId_2, seed.body));
    if (uploadFailure === null) {
      let suppression = await forkHistorySuppression(sessionId, context.storageV5);
      if (suppression !== null) {
        await discardForkSession(sessionId_2, context.credentials);
        return forkRefused("history suppressed", suppression);
      }
      uploadFailure = await uploadForkDisplayHistory(
        sessionId_2,
        messages,
        context.credentials,
        "rc_fork_conversation",
        context.host,
        context.getTools?.(),
      );
    }
    if (uploadFailure !== null) {
      await discardForkSession(sessionId_2, context.credentials);
      return forkFailed(uploadFailure);
    }
    logFeatureOk("rc_fork_conversation");
    return {
      ok: true,
      response: {
        forked: true,
        sessionId: inSessionIdCostumeOf(reference, sessionId_2),
        ...(targetUuid !== undefined && {
          targetMessageUuid: targetUuid,
        }),
        ...(prefillText !== undefined && {
          prefillText,
        }),
      },
    };
  } catch (error) {
    logError(error);
    if (sessionId_2 !== null) await discardForkSession(sessionId_2, context.credentials);
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
function forkRefused(error, reason = error === "unsupported" ? null : FORK_REFUSAL_REASONS[error]) {
  if (reason !== null) logFeatureSad("rc_fork_conversation", reason);
  return {
    ok: true,
    response: {
      forked: false,
      error,
      reason: FORK_REFUSAL_REASONS[error],
    },
  };
}
//@ chunk-tyg7f3ek.js:594147-594267 placement
function forkFailed(error) {
  logFeatureBad("rc_fork_conversation", error);
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
async function tryWriteForkSeed(sessionId, body) {
  try {
    await writeForkSeed(sessionId, body);
    return null;
  } catch (error) {
    logForDebugging(`[rc-fork] Could not write the seed for ${sessionId}: ${errorMessage(error)}`, {
      level: "error",
    });
    return "seed_write_failed";
  }
}
//@ chunk-tyg7f3ek.js:594566-594685 placement
async function discardForkSession(sessionId, credentials) {
  await deleteForkSeed(sessionId);
  let { archiveAbandonedForkSession } = await import("../../bridge/forkHistoryUpload.js");
  await archiveAbandonedForkSession(sessionId, credentials);
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
  let reference = bridgeForkSessionId(sdkUrl);
  if (reference === undefined) return null;
  let forkReference = reference;
  let isFork = false;
  function noteWrite(sha256) {
    return Promise.race([
      writeNote(sha256),
      sleep(FORK_NOTE_WRITE_TIMEOUT_MS, undefined, {
        unref: true,
      }).then(() => false),
    ]);
  }
  function logRefused(code) {
    logFeatureSad("rc_fork_conversation", code);
  }
  async function readTags() {
    if (!isFirstPartyProvider()) throw new ForkSeedUnverifiedError("provider_not_first_party", false);
    let { session } = await getBridgeSessionOrStatus(forkReference, {
      credentials,
      useV2: true,
    });
    let tags = session?.tags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))
      throw new ForkSeedUnverifiedError("record_unread");
    return tags;
  }
  async function adopt(note) {
    if (note.sha256 === REVOKED) {
      await deleteForkSeed(forkReference);
      return null;
    }
    let seed;
    try {
      seed = await readForkSeed(forkReference);
    } catch (error) {
      logForDebugging(`[rc-fork] ${errorMessage(error)}`, {
        level: "error",
      });
      if (!(await readTags()).includes(REMOTE_CONTROL_FORK)) {
        logRefused("seed_unreadable");
        return null;
      }
      throw new ForkSeedUnverifiedError("seed_unreadable");
    }
    if (seed.kind === "none") return null;
    if (seed.kind === "invalid") {
      logRefused(`seed_${seed.reason}`);
      return null;
    }
    if (note.unread) throw new ForkSeedUnverifiedError("note_unread", false);
    let { messages, createdAt, parentSessionId } = seed.seed;
    let tags = await readTags();
    let filtered = tags.filter((tag) => tag.startsWith(REMOTE_CONTROL_FORK_SEED));
    if (
      !tags.includes(REMOTE_CONTROL_FORK) ||
      filtered.length !== 1 ||
      filtered[0] !== `${REMOTE_CONTROL_FORK_SEED}${seed.sha256}`
    ) {
      logRefused("seed_unbound");
      await deleteForkSeed(forkReference);
      return null;
    }
    let noteMatches =
      note.sha256 !== undefined && /^[0-9a-f]{64}$/.test(note.sha256) && note.sha256 === seed.sha256;
    if (!noteMatches) {
      if (Date.now() - Date.parse(createdAt) > FORK_VERIFY_TIMINGS) {
        logRefused("note_missing");
        await deleteForkSeed(forkReference);
        return null;
      }
      if (!(await noteWrite(seed.sha256))) logRefused("note_unconfirmed");
    }
    await touchForkSeed(forkReference);
    logForDebugging(`[rc-fork] Seeded ${messages.length} messages from ${parentSessionId}`);
    isFork = true;
    return {
      rows: messages,
      firstBoot: !noteMatches,
    };
  }
  return {
    async adoptSeed(note) {
      isFork = false;
      for (let j = 1; ; j++)
        try {
          return await adopt(note);
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
          logRefused(error.code);
          throw error;
        }
    },
    isFork() {
      return isFork;
    },
    async discardSeed() {
      try {
        let [noteWritten, deleted] = await Promise.all([noteWrite(REVOKED), deleteForkSeed(forkReference)]);
        if (deleted) isFork = false;
        if (!noteWritten && !deleted) logRefused("revoke_unconfirmed");
      } catch (error) {
        logError(error);
        logFeatureBad("rc_fork_conversation", "revoke_failed");
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:596723-596952 placement
function mcpSyncNeeded(configs, clients) {
  for (let key of Object.keys(configs)) if (!clients.some((client) => client.name === key)) return "sync";
  let anyFailed = false;
  for (let client of clients) {
    if (!Object.hasOwn(configs, client.name) || client.type === "pending") return "sync";
    if (client.type === "failed") anyFailed = true;
  }
  return anyFailed ? "retry_failed" : "none";
}
//@ chunk-tyg7f3ek.js:596952-597195 placement
function pickReusableMcpClients(configs, clients, reuseConnected) {
  let reusedNames = new Set(
    clients
      .filter(
        (client) =>
          client.type === "disabled" ||
          (reuseConnected &&
            client.type === "connected" &&
            client.toolsListError === undefined &&
            !client.skillsListFailed),
      )
      .map((client) => client.name),
  );
  let kept = Object.create(null);
  for (let [key, value] of Object.entries(configs)) if (!reusedNames.has(key)) kept[key] = value;
  return kept;
}
//@ chunk-tyg7f3ek.js:597195-597358 placement
function mcpServersToReconnect(clients, configs, added, reuseConnected) {
  return clients.filter(
    (client) =>
      Object.hasOwn(configs, client.name) &&
      (client.type === "disabled" ||
        (!Object.hasOwn(added, client.name) &&
          (client.type === "pending" || (reuseConnected && client.type === "connected")))),
  );
}
//@ chunk-tyg7f3ek.js:597358-597627 placement = findChromeClient (0.791)
function mergeMcpToolsAndCommands(clients, added, removed, previous, next) {
  let mapped = clients
    .filter(
      (client) =>
        client.type === "connected" &&
        (Object.hasOwn(removed, client.name) || !Object.hasOwn(added, client.name)),
    )
    .map((client) => client.name);
  return {
    tools: uniq([...mapped.reduce(filterCommandsByServer, [...previous.tools]), ...next.tools]),
    commands: [
      ...previous.commands.filter(
        (command) => !mapped.some((serverName) => getToolNameForPermissionCheck(command, serverName)),
      ),
      ...next.commands,
    ],
  };
}
//@ chunk-tyg7f3ek.js:597627-598552 placement
/**
 * 应用 SDK 宿主的 MCP 服务器增删：计算新增/删除/重连集合并更新客户端、工具与命令。
 */
function applySdkMcpServerChanges(state, keepClients, snapshot) {
  let { sdkServersAdded, sdkServersRemoved } = snapshot;
  let existingNames = new Set(state.clients.map((client) => client.name));
  let addedNames = new Set(sdkServersAdded.filter((name) => !existingNames.has(name)));
  let filtered = sdkServersRemoved.filter((name) => existingNames.has(name));
  let filtered_2 = sdkServersAdded.filter((name) => !Object.hasOwn(state.configs, name));
  let filtered_3 = sdkServersRemoved.filter((name) => Object.hasOwn(state.configs, name));
  let filtered_4 = snapshot.sdkServersUpdated.filter(
    (name) =>
      Object.hasOwn(state.configs, name) && state.configs[name] === snapshot.sdkConfigsAtSnapshot[name],
  );
  if (
    addedNames.size === 0 &&
    filtered.length === 0 &&
    filtered_2.length === 0 &&
    filtered_3.length === 0 &&
    filtered_4.length === 0
  )
    return {
      state,
      clientsToCleanUp: [],
    };
  let merged = Object.assign(Object.create(null), state.configs);
  for (let name of filtered_3) delete merged[name];
  for (let name of [...filtered_2, ...filtered_4]) {
    let config = getOwn(snapshot.newSdkState.configs, name);
    if (config !== undefined) merged[name] = config;
  }
  let removedNames = new Set(filtered);
  return {
    state: {
      configs: merged,
      clients: [
        ...state.clients.filter((client) => !removedNames.has(client.name)),
        ...snapshot.newSdkState.clients.filter((client) => addedNames.has(client.name)),
      ],
      tools: filtered.reduce(filterCommandsByServer, [...state.tools]),
      commands: filtered.reduce(excludeCommandsByServer, state.commands),
    },
    clientsToCleanUp: state.clients.filter(
      (client) =>
        removedNames.has(client.name) && client.type === "connected" && !keepClients.includes(client),
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
  file: (entry) => readFile(`/proc/${entry}`, "utf8").catch(() => ""),
};
//@ chunk-tyg7f3ek.js:598734-598997 placement
function parseProcStatCpu(statText) {
  let mapped = /^cpu +(.+)$/m.exec(statText)?.[1]?.split(/ +/).slice(0, 8).map(Number);
  if (mapped === undefined || mapped.length < 8 || mapped.some(Number.isNaN)) return;
  let reduced = mapped.reduce((acc, value) => acc + value, 0);
  let [, , , idleTicks = 0, iowaitTicks = 0, , , stealTicks = 0] = mapped;
  return {
    busy: reduced - idleTicks - iowaitTicks,
    steal: stealTicks,
    total: reduced,
    cpus: statText.match(/^cpu\d+ /gm)?.length ?? 0,
  };
}
//@ chunk-tyg7f3ek.js:598997-599115 placement
function countFullCpuWindows(state, isFull) {
  if (isFull) state.fullWindows++;
  else if (state.lastWindowLow) state.fullWindows = 0;
  state.lastWindowLow = !isFull;
  return state.fullWindows;
}
//@ chunk-tyg7f3ek.js:599115-599212 placement
function isClaudeCodeAgentEnviron(environ) {
  return environ.split("\x00").some((entry) => /^AI_AGENT=claude-code[_/].+[_/]agent$/.test(entry));
}
//@ chunk-tyg7f3ek.js:599212-599450 placement
async function listAgentProcesses(proc) {
  let found = [];
  for (let name of await proc.names()) {
    let pid = Number(name);
    if (!(pid > 1) || pid === process.pid) continue;
    let startToken = procStatField(await proc.file(`${pid}/stat`));
    let environ = await proc.file(`${pid}/environ`);
    if (startToken !== undefined && isClaudeCodeAgentEnviron(environ))
      found.push({
        pid,
        startToken,
      });
  }
  return found;
}
//@ chunk-tyg7f3ek.js:599450-599508 placement
function secondsToMs(seconds) {
  return typeof seconds === "number" && seconds > 0 ? seconds * 1000 : 1 / 0;
}
//@ chunk-tyg7f3ek.js:599508-601512 placement
/**
 * hosted worker 上每 10 分钟读 /proc/stat，CPU 持续饱和时停止 agent 子进程并上报。
 */
async function sampleHostCpuSaturation(state, proc = PROC_FS_READER) {
  try {
    let procStatCpu = parseProcStatCpu(await proc.file("stat"));
    let last = state.last;
    state.last = procStatCpu;
    if (procStatCpu === undefined || last === undefined || procStatCpu.total <= last.total) return;
    let busyRatio = (procStatCpu.busy - last.busy) / (procStatCpu.total - last.total);
    let isFull = busyRatio >= HOST_CPU_SATURATION_RATIO;
    if (state.stoppedLastWindow) {
      state.stoppedLastWindow = false;
      logForDiagnosticsNoPII("warn", "full_cpu_after_stop", {
        busy_pct: Math.round(busyRatio * 100),
      });
    }
    let fullMsBefore = state.fullWindows * HOST_CPU_WINDOW_MS;
    let fullMs = countFullCpuWindows(state, isFull) * HOST_CPU_WINDOW_MS;
    if (!isFull) return;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(PROC_CPU_SAMPLING, null);
    let stopAfterMs = secondsToMs(featureValue_CACHED_MAY_BE_STALE?.stop_after_s);
    let logAfterMs = secondsToMs(featureValue_CACHED_MAY_BE_STALE?.log_after_s);
    let shouldStop = fullMs >= stopAfterMs;
    if (!shouldStop && !(fullMsBefore < logAfterMs && fullMs >= logAfterMs)) return;
    let agentProcesses = await listAgentProcesses(proc);
    let filtered = Object.values(state.taskRegistry.all()).filter(
      (task) => isLocalShellTask(task) && task.status === "running",
    );
    if (shouldStop) {
      state.fullWindows = 0;
      state.stoppedLastWindow = true;
      state.stops++;
    }
    logFeatureOk(shouldStop ? "ccr_full_cpu_stop" : "ccr_full_cpu_log");
    logForDiagnosticsNoPII("warn", "full_cpu_stop", {
      stops: shouldStop,
      stops_so_far: state.stops,
      run_s: fullMs / 1000,
      after_s: (shouldStop ? stopAfterMs : logAfterMs) / 1000,
      cpus: procStatCpu.cpus,
      busy_pct: Math.round(busyRatio * 100),
      steal_pct: Math.round(((procStatCpu.steal - last.steal) / (procStatCpu.total - last.total)) * 100),
      shell_tasks: filtered.length,
      shell_processes: agentProcesses.length,
    });
    if (!shouldStop || (filtered.length === 0 && agentProcesses.length === 0)) return;
    let joined = filtered
      .slice(0, HOST_CPU_TOP_PROCESSES)
      .map((task) => `"${escapeXml(task.description)}"`)
      .join(", ");
    enqueuePendingNotification(
      {
        mode: "task-notification",
        priority: "next",
        agentId: mainAgentId(),
        skipAttachments: true,
        value: formatTaskNotification({
          status: "stopped",
          summary: `This cloud sandbox used 90% or more of all its CPUs for ${formatDurationCoarse(fullMs)}, almost without a break. The limit is ${formatDurationCoarse(stopAfterMs)}. At the limit, Claude Code stops the shell commands of this session and the processes that they started, also those that used little CPU. The commands themselves did not fail. The files are kept. Commands that use little CPU, such as a dev server, can start again. Work that fills the CPUs again will be stopped again, so do not start it again in the same form. Tell the user what was stopped and why. If the heavy work is still necessary, first agree with the user on a form that uses less CPU, for example a smaller job or fewer parallel workers.${joined && ` Stopped commands: ${joined}.`}`,
        }),
      },
      {
        turnAttribution: "inherit",
      },
    );
    for (let task of filtered)
      killTask(task.id, state.taskRegistry, {
        cause: "full_cpu",
      });
    for (let { pid, startToken } of agentProcesses)
      if (procStatField(await proc.file(`${pid}/stat`)) === startToken) sigtermThenKill([pid], startToken);
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
  return REMOTE_ENTRYPOINT_NAMES.some((name) => name === sessionEntrypoint) ? "code" : "other";
}
//@ chunk-tyg7f3ek.js:601972-602053 placement
var WAIT_COMMAND_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:601972", () => {
  WAIT_COMMAND_KINDS = new Set(["wait", "shell_word", "file_read", "file_search", "text_transform"]);
});
//@ chunk-tyg7f3ek.js:602053-602235 placement
function classifyBashForCpu(command) {
  let parts = classifyBashCommand(command).bash_command_kinds.split(",");
  if (parts.includes("serves_or_watches")) return "serve_or_watch";
  return parts.includes("wait") && parts.every((kind) => WAIT_COMMAND_KINDS.has(kind)) ? "wait" : "other";
}
//@ chunk-tyg7f3ek.js:602235-603290 placement
/**
 * 工具 CPU 采样常量：分钟刻度、时钟 tick、采样超时、各类条数上限、/proc 读取上限与噪声阈值，以及带 fd/environ/cgroup 读取的 proc 读取器实现。
 */
var TOOL_CPU_SAMPLING_FLAG; // deferred: uses PROC_CPU_SAMPLING of its import cycle while loading; runs once the cycle is complete
var MINUTE_MS;
var CLOCK_TICKS_MS;
var CPU_MARK_TIMEOUT_MS;
var MAX_CPU_MARKS;
var MAX_MINUTE_MARK;
var MIN_THEN_EVERY_MIN;
var MAX_SHELLS_SAMPLED;
var MAX_FULL_CORE_PROCESSES;
var MAX_CPU_PROCESSES;
var MAX_DESCRIPTOR_LINKS;
var DESCRIPTOR_LINK_COST;
var MAX_FD_ENTRIES;
var ENVIRON_READ_BYTES;
var CPU_NOISE_RATIO;
var FULL_CORE_CPU_RATIO;
var PROC_STAT_PATTERN;
var PROC_FS_READER_WITH_LINKS;
deferInit("chunk-tyg7f3ek.js:602235", () => {
  TOOL_CPU_SAMPLING_FLAG = "tengu_starry_balloon";
  MINUTE_MS = 60000;
  CLOCK_TICKS_MS = 10;
  CPU_MARK_TIMEOUT_MS = 30000;
  MAX_CPU_MARKS = 32;
  MAX_MINUTE_MARK = 10080;
  MIN_THEN_EVERY_MIN = 10;
  MAX_SHELLS_SAMPLED = 10;
  MAX_FULL_CORE_PROCESSES = 9;
  MAX_CPU_PROCESSES = 64;
  MAX_DESCRIPTOR_LINKS = 16384;
  DESCRIPTOR_LINK_COST = 32;
  MAX_FD_ENTRIES = 1024;
  ENVIRON_READ_BYTES = 262144;
  CPU_NOISE_RATIO = 0.01;
  FULL_CORE_CPU_RATIO = 0.9;
  PROC_STAT_PATTERN = /^ *\d+: \S+ \S+ 0A \S+ \S+ \S+ +\d+ +\d+ +(\d+) /gm;
  PROC_FS_READER_WITH_LINKS = {
    ...PROC_FS_READER,
    startOfFile: async (pid) => {
      let handle = await open(`/proc/${pid}`).catch(() => {
        return;
      });
      if (handle === undefined) return "";
      try {
        let buffer = Buffer.allocUnsafe(ENVIRON_READ_BYTES);
        let total = 0;
        for (let bytesRead = -1; bytesRead !== 0 && total < buffer.length; total += bytesRead)
          bytesRead = (await handle.read(buffer, total, buffer.length - total, null)).bytesRead;
        return buffer.toString("latin1", 0, total);
      } catch {
        return "";
      } finally {
        await handle.close().catch(() => {});
      }
    },
    descriptorLinks: async (pid) => {
      let fdSize = /^FDSize:\s+(\d+)$/m.exec(await PROC_FS_READER.file(`${pid}/status`))?.[1];
      if (fdSize === undefined) return [];
      if (Number(fdSize) > MAX_FD_ENTRIES) return;
      try {
        let entries = await readdir(`/proc/${pid}/fd`);
        return entries.length > MAX_FD_ENTRIES
          ? undefined
          : await Promise.all(entries.map((entry) => readlink(`/proc/${pid}/fd/${entry}`).catch(() => "")));
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        return errnoCode === "ENOENT" || errnoCode === "ESRCH" ? [] : undefined;
      }
    },
    outputBytes: getTaskOutputSize,
    shellCgroupCpuMs: async () => {
      let cpuacctDir = getCpuacctDir();
      let text =
        cpuacctDir === undefined
          ? ""
          : (await readFile(posix.join(cpuacctDir, "cpuacct.usage"), "utf8").catch(() => "")).trim();
      let usageUs = text === "" ? Number.NaN : Number(text);
      return Number.isFinite(usageUs) ? usageUs / 1e6 : undefined;
    },
  };
});
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
  let marks = Array.isArray(featureValue_CACHED_MAY_BE_STALE?.marks_min)
    ? featureValue_CACHED_MAY_BE_STALE.marks_min
        .slice(0, MAX_CPU_MARKS)
        .filter(isValidMinuteMark)
        .sort((a, b) => a - b)
    : [];
  return marks.length === 0
    ? undefined
    : {
        marksMin: marks,
        thenEveryMin:
          isValidMinuteMark(featureValue_CACHED_MAY_BE_STALE?.then_every_min) &&
          featureValue_CACHED_MAY_BE_STALE.then_every_min >= MIN_THEN_EVERY_MIN
            ? featureValue_CACHED_MAY_BE_STALE.then_every_min
            : undefined,
        fromStart: featureValue_CACHED_MAY_BE_STALE?.from_start === true,
      };
}
//@ chunk-tyg7f3ek.js:603632-603708 placement
function pushToMapList(map, key, value) {
  let list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}
//@ chunk-tyg7f3ek.js:603708-603793 placement
function runningLocalShells(framework) {
  return getRunningTasks(framework.getState())
    .filter(isLocalShellTask)
    .filter((task) => task.elsewhere === undefined);
}
//@ chunk-tyg7f3ek.js:603793-604870 placement
/**
 * 采样后台 shell 进程树的 CPU 与监听端口，用于 tengu_tool_cpu_by_phase 遥测。
 */
async function sampleShellCpuTree(state, last, markMin) {
  let procStatCpu = parseProcStatCpu(await state.proc.file("stat"));
  if (procStatCpu === undefined) return "no_cpu_counters";
  let atMs = state.clock.monotonicNow();
  let filtered = (await state.proc.names()).map(Number).filter(Number.isInteger);
  if (filtered.length > MAX_PROC_ENTRIES) return "too_many_processes";
  let shells = runningLocalShells(state);
  let sample = {
    markMin,
    atMs,
    vmBusyTicks: procStatCpu.busy,
    shellCgroupCpuMs: await state.proc.shellCgroupCpuMs(),
    processes: new Map(),
    childrenOf: new Map(),
    ledBy: new Map(),
    runningShellIds: new Set(shells.map((shell) => shell.id)),
    shells: [],
  };
  for (let pid of filtered) {
    if (state.timedOut) break;
    let statTimes = parseStatTimes(await state.proc.file(`${pid}/stat`));
    if (statTimes !== undefined) {
      sample.processes.set(pid, statTimes);
      pushToMapList(sample.childrenOf, statTimes.ppid, pid);
      pushToMapList(sample.ledBy, statTimes.pgrp, pid);
      pushToMapList(sample.ledBy, statTimes.session, pid);
    }
  }
  let kinds = state.kinds;
  state.kinds = new Map();
  for (let shell of shells.slice(0, MAX_SHELLS_SAMPLED)) {
    let found = last?.shells.find((shell_2) => shell_2.id === shell.id);
    let pid = shell.shellCommand?.pid;
    sample.shells.push({
      id: shell.id,
      pid,
      starttime: found?.starttime ?? (pid === undefined ? undefined : sample.processes.get(pid)?.starttime),
      outputBytes: await state.proc.outputBytes(shell.id).catch(() => {
        return;
      }),
      kind: kinds.get(shell.id) ?? classifyBashForCpu(shell.command),
      listens: undefined,
      usage: shell.shellCommand?.result.then(
        (result) => result.shellUsage,
        () => {
          return;
        },
      ),
    });
  }
  for (let shell of sample.shells) state.kinds.set(shell.id, shell.kind);
  return sample;
}
//@ chunk-tyg7f3ek.js:604870-604977 placement
function isSameProcess(previous, current, pid) {
  let entry = previous.processes.get(pid);
  return entry !== undefined && entry.starttime === current.processes.get(pid)?.starttime;
}
//@ chunk-tyg7f3ek.js:604977-605026 placement
function processLeaders(sample, pid) {
  return [pid, ...(sample.ledBy.get(pid) ?? [])];
}
//@ chunk-tyg7f3ek.js:605026-605209 placement
function collectProcessTree(sample, leaders, now, exclude) {
  let tree = [];
  let pending = [...leaders];
  for (let pid = pending.pop(); pid !== undefined; pid = pending.pop())
    if (!now.has(pid) && sample.processes.has(pid) && !exclude?.(pid)) {
      now.add(pid);
      tree.push(pid);
      pending.push(...(sample.childrenOf.get(pid) ?? []));
    }
  return tree;
}
//@ chunk-tyg7f3ek.js:605209-605327 placement
function sumProcessTicks(sample, processTree) {
  return processTree.reduce((acc, pid) => {
    let entry = sample.processes.get(pid);
    return acc + (entry?.ownTicks ?? 0) + (entry?.childrenTicks ?? 0);
  }, 0);
}
//@ chunk-tyg7f3ek.js:605327-605608 placement
function diffProcessTreeCpu(previous, current, pid, sample) {
  let processTree = collectProcessTree(current, processLeaders(current, pid), sample.now);
  let currentPids = new Set(processTree);
  let processTree_2 = collectProcessTree(
    previous,
    processTree.filter((pid) => isSameProcess(previous, current, pid)),
    sample.then,
    (pid) => isSameProcess(previous, current, pid) && !currentPids.has(pid),
  );
  let reduced = processTree.reduce(
    (acc, pid) =>
      acc +
      (current.processes.get(pid)?.ownTicks ?? 0) -
      (isSameProcess(previous, current, pid) ? (previous.processes.get(pid)?.ownTicks ?? 0) : 0),
    0,
  );
  return {
    tree: processTree,
    cpuMs:
      Math.max(reduced, sumProcessTicks(current, processTree) - sumProcessTicks(previous, processTree_2)) *
      CLOCK_TICKS_MS,
  };
}
//@ chunk-tyg7f3ek.js:605608-605763 placement
async function listListeningSockets(proc) {
  let sockets = new Set();
  for (let table of ["net/tcp", "net/tcp6"])
    for (let match of (await proc.startOfFile(table)).matchAll(PROC_STAT_PATTERN))
      sockets.add(`socket:[${match[1]}]`);
  return sockets;
}
//@ chunk-tyg7f3ek.js:605763-606037 placement
async function checksListeningSockets(proc, tree, state) {
  if (state.listeningSockets.size === 0) return "no";
  let result = "no";
  for (let pid of tree) {
    let links = state.linksLeft > 0 ? await proc.descriptorLinks(pid) : undefined;
    if (links === undefined) {
      result = "unchecked";
      continue;
    }
    if (links.some((link) => state.listeningSockets.has(link))) return "yes";
    state.linksLeft -= DESCRIPTOR_LINK_COST + links.length;
  }
  return result;
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
