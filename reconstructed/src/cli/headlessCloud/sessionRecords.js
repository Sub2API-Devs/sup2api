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
import { getSessionRequestConfig, $Nn } from "../../remote/RemoteSessionManager.js";
import { sleep } from "../../utils/sleep.js";
import { untrustedDeviceHint } from "../../bridge/trustedDevice.js";
import { fetchLatestEvents } from "../../assistant/sessionHistory.js";
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import { Uxe } from "../../utils/permissions/sensitivePaths.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-fe6rs39h.js:160409-160659 placement
async function readRetentionCutoff() {
  try {
    let { getCutoffDate: getCutoffDate } = await import("./chunk-xdz4h5jb.js"),
      n = getCutoffDate();
    return n === null ? { kind: "never" } : { kind: "before", before: n };
  } catch (error) {
    return (
      logForDebugging(`[headlessCloud] retention cutoff unreadable: ${errorMessage(error)}`, {
        level: "warn",
      }),
      { kind: "unknown" }
    );
  }
}
//@ chunk-fe6rs39h.js:160659-161214 placement
async function findLocalSessionRecord(e, n, s, r, h, y, S, w) {
  if (y === void 0 || !dpt()) return { handle: void 0, why: "not_looked" };
  try {
    let { findSessionRecordElsewhere: findSessionRecordElsewhere } = await import("./chunk-dmh8arxx.js"),
      I = await findSessionRecordElsewhere(e, h);
    switch (I.kind) {
      case "elsewhere":
        return { handle: void 0, why: "elsewhere", line: void 0 };
      case "unknown":
        return I.why === "not_looked"
          ? { handle: void 0, why: "not_looked" }
          : { handle: void 0, why: "elsewhere_unknown" };
      case "nowhere":
        return notArmedHereLookup(I);
    }
  } catch (error) {
    return (
      logForDebugging(
        `[headlessCloud] could not check this computer's session records: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      { handle: void 0, why: "lookup_failed" }
    );
  }
}
//@ chunk-fe6rs39h.js:161214-161609 placement
async function latestStreamPosition(e, n, s, r) {
  let latestSequenceNum = s.latestSequenceNum,
    y =
      latestSequenceNum !== void 0
        ? latestSequenceNum
        : r
          ? () => getSessionRequestConfig(e, n, { recoverDeviceProof: !0 }).then(readNewestEventSequence)
          : await getSessionRequestConfig(e, n).then((S) => () => readNewestEventSequence(S));
  return y()
    .catch(async (S) => {
      if (S instanceof $Nn) throw S;
      return (
        logForDebugging(`[headlessCloud] stream position unreadable, retrying once: ${errorMessage(S)}`),
        await sleep(s.positionRetryMs ?? rr),
        y()
      );
    })
    .catch((S) => {
      throw S instanceof $Nn
        ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            untrustedDeviceHint(),
            "untrusted device",
          )
        : S;
    });
}
//@ chunk-fe6rs39h.js:161609-161924 placement
async function readNewestEventSequence(e) {
  let n = await fetchLatestEvents(e, 1, { reportFeatureHealth: !1 });
  if (n === null) throw Error("the session history could not be read");
  let s = n.newestSequenceNum ?? n.events.at(-1)?.sequenceNum;
  if (s) return s;
  if (n.events.length > 0 || n.hasMore || (n.droppedRows ?? 0) > 0)
    throw Error("the newest event could not be read");
  return 0;
}
//@ chunk-fe6rs39h.js:161924-161935 placement
var rr = 500;
//@ chunk-v38s9gp2.js:334-368 placement
function dpt() {
  return isViolinWoodEnabledCached() || Uxe();
}
/**
 * 把会话记录的位置描述映射为状态值（elsewhere、here_only、nowhere、not_looked、unknown）。
 */
//@ chunk-v38s9gp2.js:368-564 placement
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
function c0n(e, o) {
  logEvent("tengu_remote_attach_record_lookup", { outcome: fromEnum(e), entry_point: fromEnum(o) });
}

export {
  dpt,
  describeSessionRecordWhere,
  c0n,
  latestStreamPosition,
  findLocalSessionRecord,
  readRetentionCutoff,
};
