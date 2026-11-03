/**
 * cli/headlessCloud/sessionRecords.ts
 *
 * 2.1.316 新增：无头云会话的本地会话记录与事件序号。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (5), chunk-v38s9gp2.js (3)
 * attribution: placement 8
 */
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
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import { neverTrue } from "../../utils/permissions/sensitivePaths.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-fe6rs39h.js:160409-160659 placement
async function readRetentionCutoff() {
  try {
    let { getCutoffDate } = await import("./chunk-xdz4h5jb.js");
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
//@ chunk-fe6rs39h.js:160659-161214 placement
async function findLocalSessionRecord(e, n, s, r, h, y, S, w) {
  if (y === undefined || !isSessionRecordLookupEnabled())
    return {
      handle: undefined,
      why: "not_looked",
    };
  try {
    let { findSessionRecordElsewhere } = await import("./chunk-dmh8arxx.js");
    let sessionRecordElsewhere = await findSessionRecordElsewhere(e, h);
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
//@ chunk-fe6rs39h.js:161214-161609 placement
async function latestStreamPosition(compatSessionId, credentials, s, r) {
  let latestSequenceNum = s.latestSequenceNum;
  let y =
    latestSequenceNum !== undefined
      ? latestSequenceNum
      : r
        ? () =>
            getSessionRequestConfig(compatSessionId, credentials, {
              recoverDeviceProof: true,
            }).then(readNewestEventSequence)
        : await getSessionRequestConfig(compatSessionId, credentials).then(
            (sessionRequestConfig) => () => readNewestEventSequence(sessionRequestConfig),
          );
  return y()
    .catch(async (error) => {
      if (error instanceof UntrustedDeviceTokenError) throw error;
      logForDebugging(`[headlessCloud] stream position unreadable, retrying once: ${errorMessage(error)}`);
      await sleep(s.positionRetryMs ?? SESSION_POSITION_RETRY_MS);
      return y();
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
//@ chunk-fe6rs39h.js:161609-161924 placement
async function readNewestEventSequence(sessionRequestConfig) {
  let latestEvents = await fetchLatestEvents(sessionRequestConfig, 1, {
    reportFeatureHealth: false,
  });
  if (latestEvents === null) throw Error("the session history could not be read");
  let s = latestEvents.newestSequenceNum ?? latestEvents.events.at(-1)?.sequenceNum;
  if (s) return s;
  if (latestEvents.events.length > 0 || latestEvents.hasMore || (latestEvents.droppedRows ?? 0) > 0)
    throw Error("the newest event could not be read");
  return 0;
}
//@ chunk-fe6rs39h.js:161924-161935 placement
var SESSION_POSITION_RETRY_MS = 500;
//@ chunk-v38s9gp2.js:334-368 placement
/**
 * 判断是否启用会话记录位置查询（violinWood 特性开或某开关为真）。
 */
function isSessionRecordLookupEnabled() {
  return isViolinWoodEnabledCached() || neverTrue();
}
//@ chunk-v38s9gp2.js:368-564 placement
/**
 * 把会话记录的位置描述映射为状态值（elsewhere、here_only、nowhere、not_looked、unknown）。
 */
function describeSessionRecordWhere(e) {
  switch (e.kind) {
    case "elsewhere":
      return "elsewhere";
    case "nowhere":
      return e.hasOwnSessionRecord ? "here_only" : "nowhere";
    case "unknown":
      return e.why === "not_looked" ? "not_looked" : "unknown";
  }
}
//@ chunk-v38s9gp2.js:564-653 placement
/**
 * 记录 tengu_remote_attach_record_lookup 事件：查询结果与入口点。
 */
function logAttachRecordLookup(e, o) {
  logEvent("tengu_remote_attach_record_lookup", {
    outcome: fromEnum(e),
    entry_point: fromEnum(o),
  });
}
export {
  isSessionRecordLookupEnabled,
  describeSessionRecordWhere,
  logAttachRecordLookup,
  latestStreamPosition,
  findLocalSessionRecord,
  readRetentionCutoff,
};
