/**
 * services/homeSeed/seedReadiness.ts
 *
 * 2.1.316 新增：等待云会话读取已推送设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s1cmamfh.js (10)
 * attribution: placement 10
 */
import { LANE_REQUEST_TIMEOUT_MS, canUseSyncedFileLane } from "./syncedFileLane.js";
import { isAborted } from "../../utils/abortSignalUtils.js";
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

//@ chunk-s1cmamfh.js:10413-11525 placement
/**
 * 等待云端会话确认已读取推送的设置（ready 状态），超时后给出说明。
 */
async function awaitSeedReadiness({
  client,
  pack,
  generation,
  uploaded,
  status,
  launchConsent,
  isProjectStillSynced,
  signal,
  onReadBack,
  deadlineMs = LANE_REQUEST_TIMEOUT_MS,
}) {
  if (
    uploaded.kind !== "uploaded" ||
    !isSendOutcomeSettled(uploaded.outcome) ||
    isAborted(signal) ||
    !(await canUseSyncedFileLane(launchConsent, isProjectStillSynced))
  )
    return "skipped";
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  signal?.addEventListener("abort", onAbort, {
    once: true,
  });
  try {
    let lastRead;
    let verdict = (await withDeadline(
      pollSeedStatus({
        client,
        pack,
        generation,
        uploaded: uploaded.outcome,
        signal: abortController.signal,
        onRead: (read) => {
          lastRead = read;
        },
      }),
      deadlineMs,
    )) ??
      lastRead ?? {
        verdict: "unreadable",
        heal: "none",
        got: "deadline",
        ready: null,
      };
    if (isAborted(signal) || verdict.got === "aborted") return "skipped";
    let rulesMissing = isPartialWithRestrictiveRules(verdict.ready, generation, pack);
    logEvent("tengu_home_seed_ready_seen", {
      outcome: fromEnum(verdict.verdict),
      got: fromEnum(verdict.got),
      heal: fromEnum(verdict.heal),
      ready_outcome: fromEnum(verdict.ready?.outcome ?? "none"),
      deny_or_ask_rules_missing: rulesMissing,
      generation,
    });
    let reported =
      verdict.verdict === "applied_before_first_ask" || verdict.verdict === "applied_late"
        ? {
            verdict: verdict.verdict,
            left: getPartialApplyKind(verdict.ready, packHasSettings(pack), rulesMissing),
          }
        : {
            verdict: verdict.verdict,
            left: null,
          };
    onReadBack?.(reported);
    let notice = seedReadinessNotice(
      verdict.verdict,
      uploaded.outcome,
      reported.left,
      uploaded.settingsRefused !== undefined,
      rulesMissing,
    );
    if (notice !== null) status.publish(notice.text, notice.level);
    return verdict.verdict;
  } catch (error) {
    if (isAbortError(error) || isAborted(signal)) return "skipped";
    logError(error);
    return "unreadable";
  } finally {
    abortController.abort();
    signal?.removeEventListener("abort", onAbort);
  }
}
//@ chunk-s1cmamfh.js:11525-12348 placement
async function pollSeedStatus({ client, pack, generation, uploaded, signal, onRead }) {
  let seedStatus = parseSeedStatus(await client.getStoreRow(joined_6, signal));
  switch (seedStatus.kind) {
    case "aborted":
      return {
        verdict: "unreadable",
        got: "aborted",
        heal: "none",
        ready: null,
      };
    case "unreadable":
      return {
        verdict: "unreadable",
        got: seedStatus.got,
        heal: "none",
        ready: null,
      };
    case "ready":
      return {
        verdict:
          seedStatus.ready.generation < generation
            ? uploaded === "deadline"
              ? "not_seen"
              : "behind"
            : seedStatus.ready.generation !== generation
              ? "stale"
              : isApplyWithoutEffect(seedStatus.ready)
                ? "not_applied"
                : seedStatus.ready.appliedBeforeFirstAsk
                  ? "applied_before_first_ask"
                  : "applied_late",
        got: "ready",
        heal: "none",
        ready: seedStatus.ready,
      };
    case "absent": {
      if (uploaded === "deadline")
        return {
          verdict: "not_seen",
          got: "absent",
          heal: "none",
          ready: null,
        };
      onRead({
        verdict: "not_seen",
        got: "absent",
        heal: "failed",
        ready: null,
      });
      return {
        verdict: "not_seen",
        got: "absent",
        heal:
          (
            await client.putStoreRow(joined_5, pack, {
              signal,
            })
          ).kind === "ok"
            ? "ok"
            : "failed",
        ready: null,
      };
    }
  }
}
//@ chunk-s1cmamfh.js:12348-12651 placement
function parseSeedStatus(storeRow) {
  switch (storeRow.kind) {
    case "ok": {
      let homeReadyRow = parseHomeReadyRow(storeRow.content);
      return homeReadyRow.ok
        ? {
            kind: "ready",
            ready: homeReadyRow.ready,
          }
        : {
            kind: "unreadable",
            got: homeReadyRow.reason,
          };
    }
    case "not_found":
      return {
        kind: "absent",
      };
    case "aborted":
      return {
        kind: "aborted",
      };
    case "failed":
    case "lane_unavailable":
    case "unauthorized":
      return {
        kind: "unreadable",
        got: storeRow.kind,
      };
  }
}
//@ chunk-s1cmamfh.js:12651-12715 placement
/**
 * 解出的包里是否带 settings。
 */
function packHasSettings(pack) {
  let decoded = decodeHomePack(pack);
  return decoded.ok && decoded.pack.settings !== null;
}
//@ chunk-s1cmamfh.js:12715-12884 placement
function isPartialWithRestrictiveRules(ready, generation, pack) {
  if (ready?.generation !== generation || ready.outcome !== "partial" || ready.settingsWritten) return false;
  let readyGeneration = decodeHomePack(pack);
  return (
    readyGeneration.ok &&
    readyGeneration.pack.settings !== null &&
    extractRestrictivePermissions(readyGeneration.pack.settings) !== null
  );
}
//@ chunk-s1cmamfh.js:12884-12968 placement
/**
 * 判断应用是否“部分成功但没有应用任何内容”。
 */
function isApplyWithoutEffect(ready) {
  return ready.outcome === "partial" && ready.filesApplied === 0 && !ready.settingsWritten;
}
//@ chunk-s1cmamfh.js:12968-13200 placement
function isSendOutcomeSettled(outcome) {
  switch (outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
    case "deadline":
      return true;
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "unavailable":
    case "unauthorized":
    case "failed":
    case "aborted":
      return false;
  }
}
//@ chunk-s1cmamfh.js:13200-13341 placement
function getPartialApplyKind(ready, generation, readyState) {
  if (ready === null || ready.outcome !== "partial") return null;
  return !readyState && ready.filesRefused > 0
    ? "files"
    : generation && !ready.settingsWritten
      ? "settings"
      : "part";
}
//@ chunk-s1cmamfh.js:13341-14561 placement
function seedReadinessNotice(verdict, outcome, partialKind, onlyRest, rulesMissing) {
  let subject = onlyRest ? "the rest of your settings" : "your settings";
  let reasonSuffix = partialKind === null ? "" : ` (${HOME_SEED_PARTIAL_REASONS[partialKind]})`;
  let notable = outcome === "deadline" || rulesMissing;
  switch (verdict) {
    case "applied_before_first_ask":
      return {
        text: `The cloud session applied ${subject} before its first reply${reasonSuffix}`,
        level: notable ? "info" : "debug",
      };
    case "applied_late":
      return {
        text: `${capitalize(subject)} reached the cloud session after its first reply${reasonSuffix}; they apply from the next turn (no /clear needed)`,
        level: partialKind === null || notable ? "info" : "debug",
      };
    case "not_applied":
      return {
        text: `The cloud session could not apply ${subject} (everything it was sent was skipped there)`,
        level: notable ? "warning" : "debug",
      };
    case "not_seen":
      return outcome === "deadline"
        ? {
            text: `The cloud session has not confirmed ${subject} (the upload may not have reached it in time)`,
            level: "warning",
          }
        : {
            text: `The cloud session has not confirmed ${subject} and may be running without them`,
            level: "info",
          };
    case "behind":
      return {
        text: "The cloud session still ran with the settings it had for this reply; the ones just sent apply from the next turn (no /clear needed)",
        level: "info",
      };
    case "stale":
      return {
        text: `The cloud session confirmed a different copy of ${subject} than the one just sent`,
        level: "warning",
      };
    case "unreadable":
      return {
        text: `The cloud session's answer about ${subject} could not be read`,
        level: "warning",
      };
  }
}
//@ chunk-s1cmamfh.js:14561-14583 placement
/**
 * 等待 seed 就绪的超时（30 秒）。
 */
var SEED_READY_TIMEOUTS = 15000;
var SEED_READY_TIMEOUT_MS = 30000;
export { SEED_READY_TIMEOUTS, SEED_READY_TIMEOUT_MS, awaitSeedReadiness };
