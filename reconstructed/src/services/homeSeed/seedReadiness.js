/**
 * services/homeSeed/seedReadiness.ts
 *
 * 2.1.316 新增：等待云会话读取已推送设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mxpjbr4y.js (10)
 * attribution: placement 10
 */
import { LANE_REQUEST_TIMEOUT_MS, canUseSyncedFileLane } from "./syncedFileLane.js";
import { X0 } from "../../utils/abortSignalUtils.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { joined_6, joined_5 } from "../../utils/teleport/seedPaths.js";
import { parseHomeReadyRow } from "../../daemon/homeReady.js";
import { decodeHomePack } from "./homePack.js";
import { extractRestrictivePermissions } from "../../utils/permissions/permissionsLoader.js";
import { HOME_SEED_PARTIAL_REASONS } from "./notices.js";
import { capitalize } from "../../utils/stringUtils.js";

/**
 * 等待云端会话确认已读取推送的设置（ready 状态），超时后给出说明。
 */
//@ chunk-mxpjbr4y.js:10234-11346 placement
async function awaitSeedReadiness({
  client: client,
  pack: pack,
  generation: generation,
  uploaded: uploaded,
  status: status,
  launchConsent: launchConsent,
  isProjectStillSynced: isProjectStillSynced,
  signal: signal,
  onReadBack: onReadBack,
  deadlineMs: deadlineMs = LANE_REQUEST_TIMEOUT_MS,
}) {
  if (
    uploaded.kind !== "uploaded" ||
    !isSendOutcomeSettled(uploaded.outcome) ||
    X0(signal) ||
    !(await canUseSyncedFileLane(launchConsent, isProjectStillSynced))
  )
    return "skipped";
  let abortController = new AbortController(),
    U = () => abortController.abort();
  signal?.addEventListener("abort", U, { once: !0 });
  try {
    let D,
      P = (await withDeadline(
        pollSeedStatus({
          client: client,
          pack: pack,
          generation: generation,
          uploaded: uploaded.outcome,
          signal: abortController.signal,
          onRead: (H) => {
            D = H;
          },
        }),
        deadlineMs,
      )) ??
        D ?? { verdict: "unreadable", heal: "none", got: "deadline", ready: null };
    if (X0(signal) || P.got === "aborted") return "skipped";
    let N = isPartialWithRestrictiveRules(P.ready, generation, pack);
    logEvent("tengu_home_seed_ready_seen", {
      outcome: fromEnum(P.verdict),
      got: fromEnum(P.got),
      heal: fromEnum(P.heal),
      ready_outcome: fromEnum(P.ready?.outcome ?? "none"),
      deny_or_ask_rules_missing: N,
      generation: generation,
    });
    let E =
      P.verdict === "applied_before_first_ask" || P.verdict === "applied_late"
        ? { verdict: P.verdict, left: getPartialApplyKind(P.ready, St(pack), N) }
        : { verdict: P.verdict, left: null };
    onReadBack?.(E);
    let v = seedReadinessNotice(P.verdict, uploaded.outcome, E.left, uploaded.settingsRefused !== void 0, N);
    if (v !== null) status.publish(v.text, v.level);
    return P.verdict;
  } catch (error) {
    if (isAbortError(error) || X0(signal)) return "skipped";
    return (logError(error), "unreadable");
  } finally {
    (abortController.abort(), signal?.removeEventListener("abort", U));
  }
}
//@ chunk-mxpjbr4y.js:11346-12169 placement
async function pollSeedStatus({
  client: client,
  pack: pack,
  generation: generation,
  uploaded: uploaded,
  signal: signal,
  onRead: onRead,
}) {
  let h = parseSeedStatus(await client.getStoreRow(joined_6, signal));
  switch (h.kind) {
    case "aborted":
      return { verdict: "unreadable", got: "aborted", heal: "none", ready: null };
    case "unreadable":
      return { verdict: "unreadable", got: h.got, heal: "none", ready: null };
    case "ready":
      return {
        verdict:
          h.ready.generation < generation
            ? uploaded === "deadline"
              ? "not_seen"
              : "behind"
            : h.ready.generation !== generation
              ? "stale"
              : bt(h.ready)
                ? "not_applied"
                : h.ready.appliedBeforeFirstAsk
                  ? "applied_before_first_ask"
                  : "applied_late",
        got: "ready",
        heal: "none",
        ready: h.ready,
      };
    case "absent": {
      if (uploaded === "deadline") return { verdict: "not_seen", got: "absent", heal: "none", ready: null };
      return (
        onRead({ verdict: "not_seen", got: "absent", heal: "failed", ready: null }),
        {
          verdict: "not_seen",
          got: "absent",
          heal:
            (await client.putStoreRow(joined_5, pack, { signal: signal })).kind === "ok" ? "ok" : "failed",
          ready: null,
        }
      );
    }
  }
}
//@ chunk-mxpjbr4y.js:12169-12472 placement
function parseSeedStatus(e) {
  switch (e.kind) {
    case "ok": {
      let n = parseHomeReadyRow(e.content);
      return n.ok ? { kind: "ready", ready: n.ready } : { kind: "unreadable", got: n.reason };
    }
    case "not_found":
      return { kind: "absent" };
    case "aborted":
      return { kind: "aborted" };
    case "failed":
    case "lane_unavailable":
    case "unauthorized":
      return { kind: "unreadable", got: e.kind };
  }
}
//@ chunk-mxpjbr4y.js:12472-12536 placement
function St(e) {
  let n = decodeHomePack(e);
  return n.ok && n.pack.settings !== null;
}
//@ chunk-mxpjbr4y.js:12536-12705 placement
function isPartialWithRestrictiveRules(e, n, r) {
  if (e?.generation !== n || e.outcome !== "partial" || e.settingsWritten) return !1;
  let i = decodeHomePack(r);
  return i.ok && i.pack.settings !== null && extractRestrictivePermissions(i.pack.settings) !== null;
}
//@ chunk-mxpjbr4y.js:12705-12789 placement
function bt(e) {
  return e.outcome === "partial" && e.filesApplied === 0 && !e.settingsWritten;
}
//@ chunk-mxpjbr4y.js:12789-13021 placement
function isSendOutcomeSettled(e) {
  switch (e) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
    case "deadline":
      return !0;
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "unavailable":
    case "unauthorized":
    case "failed":
    case "aborted":
      return !1;
  }
}
//@ chunk-mxpjbr4y.js:13021-13162 placement
function getPartialApplyKind(e, n, r) {
  if (e === null || e.outcome !== "partial") return null;
  return !r && e.filesRefused > 0 ? "files" : n && !e.settingsWritten ? "settings" : "part";
}
//@ chunk-mxpjbr4y.js:13162-14382 placement
function seedReadinessNotice(e, n, r, i, _) {
  let s = i ? "the rest of your settings" : "your settings",
    h = r === null ? "" : ` (${HOME_SEED_PARTIAL_REASONS[r]})`,
    S = n === "deadline" || _;
  switch (e) {
    case "applied_before_first_ask":
      return {
        text: `The cloud session applied ${s} before its first reply${h}`,
        level: S ? "info" : "debug",
      };
    case "applied_late":
      return {
        text: `${capitalize(s)} reached the cloud session after its first reply${h}; they apply from the next turn (no /clear needed)`,
        level: r === null || S ? "info" : "debug",
      };
    case "not_applied":
      return {
        text: `The cloud session could not apply ${s} (everything it was sent was skipped there)`,
        level: S ? "warning" : "debug",
      };
    case "not_seen":
      return n === "deadline"
        ? {
            text: `The cloud session has not confirmed ${s} (the upload may not have reached it in time)`,
            level: "warning",
          }
        : { text: `The cloud session has not confirmed ${s} and may be running without them`, level: "info" };
    case "behind":
      return {
        text: "The cloud session still ran with the settings it had for this reply; the ones just sent apply from the next turn (no /clear needed)",
        level: "info",
      };
    case "stale":
      return {
        text: `The cloud session confirmed a different copy of ${s} than the one just sent`,
        level: "warning",
      };
    case "unreadable":
      return { text: `The cloud session's answer about ${s} could not be read`, level: "warning" };
  }
}
//@ chunk-mxpjbr4y.js:14382-14404 placement
var SEED_READY_TIMEOUTS = 15000,
  Et = 30000;

export { SEED_READY_TIMEOUTS, Et, awaitSeedReadiness };
