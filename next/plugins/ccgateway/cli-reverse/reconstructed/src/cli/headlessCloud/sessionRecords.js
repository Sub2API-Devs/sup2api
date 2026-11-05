/**
 * cli/headlessCloud/sessionRecords.ts
 *
 * 2.1.316 新增：无头云会话的本地会话记录与事件序号。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-24qbherd.js (3), chunk-keyy05re.js (5)
 * attribution: placement 8
 */
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import { neverTrue } from "../../utils/permissions/sensitivePaths.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { notArmedHereLookup } from "./attachServe.js";
import { getSessionRequestConfig, UntrustedDeviceTokenError } from "../../remote/RemoteSessionManager.js";
import { sleep } from "../../utils/sleep.js";
import { untrustedDeviceHint } from "../../bridge/trustedDevice.js";
import { fetchLatestEvents } from "../../assistant/sessionHistory.js";

//@ chunk-24qbherd.js:334-368 placement
/**
 * 判断是否启用会话记录位置查询（violinWood 特性开或某开关为真）。
 */
function isSessionRecordLookupEnabled() {
  return isViolinWoodEnabledCached() || neverTrue();
}
//@ chunk-24qbherd.js:368-564 placement
/**
 * 把会话记录的位置描述映射为状态值（elsewhere、here_only、nowhere、not_looked、unknown）。
 */
function describeSessionRecordWhere(lookup) {
  switch (lookup.kind) {
    case "elsewhere":
      return "elsewhere";
    case "nowhere":
      return lookup.hasOwnSessionRecord ? "here_only" : "nowhere";
    case "unknown":
      return lookup.why === "not_looked" ? "not_looked" : "unknown";
  }
}
//@ chunk-24qbherd.js:564-653 placement
/**
 * 记录 tengu_remote_attach_record_lookup 事件：查询结果与入口点。
 */
function logAttachRecordLookup(lookup, entryPoint) {
  logEvent("tengu_remote_attach_record_lookup", {
    outcome: fromEnum(lookup),
    entry_point: fromEnum(entryPoint),
  });
}
//@ chunk-keyy05re.js:160297-160547 placement
async function readRetentionCutoff() {
  try {
    let { getCutoffDate } = await import("../../utils/cleanup.js");
    let cutoffDate = getCutoffDate();
    return cutoffDate === null
      ? {
          kind: "never",
        }
      : {
          kind: "before",
          before: cutoffDate,
        };
  } catch (error) {
    logForDebugging(`[headlessCloud] retention cutoff unreadable: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      kind: "unknown",
    };
  }
}
//@ chunk-keyy05re.js:160547-161102 placement
async function findLocalSessionRecord(sessionId, a, b, c, root, deviceId, credentials, storage) {
  if (deviceId === undefined || !isSessionRecordLookupEnabled())
    return {
      handle: undefined,
      why: "not_looked",
    };
  try {
    let { findSessionRecordElsewhere } = await import("../../utils/findSessionRecordElsewhere.lazy.js");
    let sessionRecordElsewhere = await findSessionRecordElsewhere(sessionId, root);
    switch (sessionRecordElsewhere.kind) {
      case "elsewhere":
        return {
          handle: undefined,
          why: "elsewhere",
          line: undefined,
        };
      case "unknown":
        return sessionRecordElsewhere.why === "not_looked"
          ? {
              handle: undefined,
              why: "not_looked",
            }
          : {
              handle: undefined,
              why: "elsewhere_unknown",
            };
      case "nowhere":
        return notArmedHereLookup(sessionRecordElsewhere);
    }
  } catch (error) {
    logForDebugging(
      `[headlessCloud] could not check this computer's session records: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return {
      handle: undefined,
      why: "lookup_failed",
    };
  }
}
//@ chunk-keyy05re.js:161102-161497 placement
async function latestStreamPosition(sessionRecordId, credentials, options, recoverProof) {
  let latestSequenceNum = options.latestSequenceNum;
  let readPosition =
    latestSequenceNum !== undefined
      ? latestSequenceNum
      : recoverProof
        ? () =>
            getSessionRequestConfig(sessionRecordId, credentials, {
              recoverDeviceProof: true,
            }).then(readNewestEventSequence)
        : await getSessionRequestConfig(sessionRecordId, credentials).then(
            (sessionRequestConfig) => () => readNewestEventSequence(sessionRequestConfig),
          );
  return readPosition()
    .catch(async (error) => {
      if (error instanceof UntrustedDeviceTokenError) throw error;
      logForDebugging(`[headlessCloud] stream position unreadable, retrying once: ${errorMessage(error)}`);
      await sleep(options.positionRetryMs ?? SESSION_POSITION_RETRY_MS);
      return readPosition();
    })
    .catch((error) => {
      throw error instanceof UntrustedDeviceTokenError
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            untrustedDeviceHint(),
            "untrusted device",
          )
        : error;
    });
}
//@ chunk-keyy05re.js:161497-161812 placement
async function readNewestEventSequence(sessionRequestConfig) {
  let latestEvents = await fetchLatestEvents(sessionRequestConfig, 1, {
    reportFeatureHealth: false,
  });
  if (latestEvents === null) throw Error("the session history could not be read");
  let sequenceNum = latestEvents.newestSequenceNum ?? latestEvents.events.at(-1)?.sequenceNum;
  if (sequenceNum) return sequenceNum;
  if (latestEvents.events.length > 0 || latestEvents.hasMore || (latestEvents.droppedRows ?? 0) > 0)
    throw Error("the newest event could not be read");
  return 0;
}
//@ chunk-keyy05re.js:161812-161823 placement
var SESSION_POSITION_RETRY_MS = 500;
export {
  latestStreamPosition,
  findLocalSessionRecord,
  readRetentionCutoff,
  logAttachRecordLookup,
  isSessionRecordLookupEnabled,
  describeSessionRecordWhere,
};
