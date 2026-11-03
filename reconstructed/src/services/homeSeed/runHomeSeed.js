/**
 * services/homeSeed/runHomeSeed.ts
 *
 * 2.1.316 新增：home seed 运行主流程（打包、上传、重发、结果汇总）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mxpjbr4y.js (36)
 * attribution: placement 36
 */
import { SEED_READY_TIMEOUTS, Et, awaitSeedReadiness } from "./seedReadiness.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { createSyncedFileLane, canUseSyncedFileLane } from "./syncedFileLane.js";
import { createBoundDeviceSigner } from "./syncedFileSigner.js";
import { withDeadline } from "../../utils/sleep.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { homeSeedNoticeLines, homeSeedSummary, HOME_SEED_FAILURE_TEXT, zt, $t } from "./homeSeedMessages.js";
import { createSeedSendHandle } from "./writeHomeSettings.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { readHomeSeedRecord, writeHomeSeedRecord, shortSha256 } from "./homeSeedRecord.js";
import {
  filesKeptForCredential,
  filesKeptAsLinks,
  formatHomeSeedSentLine,
  formatHomeSeedLeftBehindLine,
  RULES_MAY_NOT_BE_IN_FORCE,
  RULES_NOT_IN_FORCE,
  SETTINGS_STAY,
} from "./planHomeSeed.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { X0 } from "../../utils/abortSignalUtils.js";
import { joined_5 } from "../../utils/teleport/seedPaths.js";
import { decodeHomePack, encodeHomePack, readHomePackGeneration, MAX_PACK_GENERATION } from "./homePack.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, A, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { plural } from "../../utils/stringUtils.js";
import { claimOnce } from "../api/verificationRequired.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { count } from "../../utils/collections.js";
import { tildify } from "../../utils/path.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";

//@ chunk-mxpjbr4y.js:14404-14464 placement
function runHomeSeed(e) {
  return createHomeSeedRun(e).pendingSeed(Promise.resolve());
}
/**
 * 创建一次 home seed 运行：打包本地设置、上传到会话存储、等待就绪，并在会话结束时收尾。
 */
//@ chunk-mxpjbr4y.js:14464-16215 placement
function createHomeSeedRun({
  sessionId: sessionId,
  plan: plan,
  bound: bound,
  boundDeviceUuid: boundDeviceUuid,
  held: held,
  trigger: trigger,
  launchConsent: launchConsent,
  isProjectStillSynced: isProjectStillSynced,
  signal: signal,
  credentials: credentials,
  storageV5: storageV5,
  client: client,
  deadlineMs: deadlineMs = SEED_READY_TIMEOUTS,
  planDeadlineMs: planDeadlineMs = Et,
}) {
  let P = createNoticeBacklog(),
    N = Promise.resolve(boundDeviceUuid).catch(() => {
      return;
    }),
    E = client === void 0 ? void 0 : Promise.resolve(client),
    v = () =>
      (E ??= N.then((y) =>
        createSyncedFileLane({
          sessionId: sessionId,
          credentials: credentials,
          ...(y !== void 0 && {
            signer: createBoundDeviceSigner({
              sessionId: sessionId,
              boundDeviceUuid: y,
              credentials: credentials,
              ...(held !== void 0 && { held: held }),
            }),
            signedOnly: !0,
          }),
        }),
      )),
    H = withDeadline(
      Promise.resolve(plan).catch((y) => {
        if (!isAbortError(y)) logError(y);
        return { kind: "none", reason: isAbortError(y) ? "aborted" : "failed" };
      }),
      planDeadlineMs,
    ).then((y) => y ?? { kind: "none", reason: "too_slow" }),
    T;
  H.then((y) => {
    T = y.kind === "ready" ? y.description : null;
  });
  let x = H.then((y) =>
    y.kind === "ready"
      ? {
          plan: y,
          attempts: createPackForwarder(
            {
              sessionId: sessionId,
              storageV5: storageV5,
              plan: y,
              bound: bound,
              trigger: trigger,
              signal: signal,
              getStoreClient: v,
              deadlineMs: deadlineMs,
            },
            () => canUseSyncedFileLane(launchConsent, isProjectStillSynced),
          ),
        }
      : { plan: y, attempts: null },
  );
  return {
    ensureUploaded: (y) => x.then(({ attempts: attempts }) => attempts?.ensureUploaded(y) ?? "done"),
    pendingSeed: (y) => {
      let L = x.then(({ plan: plan, attempts: attempts }) =>
        (attempts === null
          ? Promise.resolve().then(() => {
              for (let M of homeSeedNoticeLines(plan, trigger, planDeadlineMs))
                P.publish(M, homeSeedSummary(plan));
              return (
                logHomeSeedOutcome(classifyCreateOutcome(plan.reason, trigger), trigger, "plan_"),
                { outcome: { kind: "none", reason: plan.reason, ...describeKeptFiles(plan) }, written: null }
              );
            })
          : attempts
              .endedOnce(y)
              .then((M) =>
                recordHomeSeedOutcome(
                  P,
                  { sessionId: sessionId, plan: plan, bound: bound, trigger: trigger },
                  M,
                ),
              )
        ).catch(
          (M) => (
            logError(M),
            logHomeSeedOutcome({ is: "bad", code: "unexpected" }, trigger, ""),
            {
              outcome:
                plan.kind === "ready"
                  ? {
                      kind: "uploaded",
                      outcome: "failed",
                      summary: plan.summary,
                      bound: bound,
                      ...describeSettingsRefusal(plan),
                      ...describeKeptFiles(plan),
                    }
                  : { kind: "none", reason: plan.reason, ...describeKeptFiles(plan) },
              written: null,
            }
          ),
        ),
      );
      return createSeedSendHandle({
        completion: L.then(({ outcome: outcome }) => outcome),
        status: P,
        description: () => T,
        afterFirstReply: (k, q) =>
          L.then(({ outcome: outcome, written: written }) =>
            written === null
              ? "skipped"
              : v().then((je) =>
                  awaitSeedReadiness({
                    client: je,
                    pack: written.pack,
                    generation: written.generation,
                    uploaded: outcome,
                    status: P,
                    launchConsent: launchConsent,
                    isProjectStillSynced: isProjectStillSynced,
                    signal: k,
                    onReadBack: q,
                  }),
                ),
          ),
      });
    },
  };
}
//@ chunk-mxpjbr4y.js:16215-16580 placement
function createPackForwarder(e, n) {
  let r = uploadSettingsPack(e, 1),
    i = {
      packUpload: e,
      mayStillForwardNow: n,
      ended: Promise.withResolvers(),
      isEnded: !1,
      attemptsMade: 1,
      latest: r,
      call: void 0,
    };
  return (
    i.ended.promise.catch(() => {}),
    De(i, r, null),
    {
      endedOnce: (_) => (
        _.then(() => ((i.isEnded = !0), i.latest)).then(
          (s) => fe(i, s),
          (s) => me(i, s),
        ),
        i.ended.promise
      ),
      ensureUploaded: (_) =>
        (i.call ??= forwardLatestPack(i, _).finally(() => {
          i.call = void 0;
        })),
    }
  );
}
//@ chunk-mxpjbr4y.js:16580-16629 placement
function fe(e, n) {
  ((e.isEnded = !0), e.ended.resolve(n));
}
//@ chunk-mxpjbr4y.js:16629-16677 placement
function me(e, n) {
  ((e.isEnded = !0), e.ended.reject(n));
}
//@ chunk-mxpjbr4y.js:16677-16748 placement
function De(e, n, r) {
  n.then(
    (i) => {
      if (!homeSeedFailureKind(i)) fe(e, Fe(r, i));
    },
    (i) => me(e, i),
  );
}
//@ chunk-mxpjbr4y.js:16748-16842 placement
function Fe(e, n) {
  return e !== null && e.written !== null && n.written === null && n.outcome !== "raced" ? e : n;
}
//@ chunk-mxpjbr4y.js:16842-17364 placement
async function forwardLatestPack(e, n) {
  try {
    let latest = await e.latest;
    if (e.isEnded) return "done";
    let i = await e.mayStillForwardNow().catch((h) => (logError(h), !1));
    if (e.isEnded) return "done";
    if (!i)
      return (
        logEvent("tengu_home_seed_upload_no_longer_allowed", {
          trigger: fromEnum(e.packUpload.trigger),
          attempts_made: e.attemptsMade,
        }),
        fe(e, latest),
        "done"
      );
    if (n.aborted) return buildSendFailure(latest);
    e.attemptsMade += 1;
    let _ = uploadSettingsPack({ ...e.packUpload, cut: n }, e.attemptsMade);
    (De(e, _, latest), (e.latest = _.then((h) => Fe(latest, h))), e.latest.catch(() => {}));
    let s = await _;
    return homeSeedFailureKind(s) ? buildSendFailure(s) : "done";
  } catch (error) {
    return (me(e, error), "done");
  }
}
//@ chunk-mxpjbr4y.js:17364-17548 placement
function buildSendFailure({ outcome: outcome, cause: cause, httpStatus: httpStatus }) {
  return {
    kind: "failed",
    ...(httpStatus !== void 0 && httpStatus >= 400 && { httpStatus: httpStatus }),
    ...(outcome === "unauthorized" && { remedy: cause === "write_signature_refused" ? "clock" : "login" }),
  };
}
//@ chunk-mxpjbr4y.js:17548-17848 placement
function homeSeedFailureKind({ outcome: outcome, cause: cause, isRefusedAsSent: isRefusedAsSent }) {
  switch (outcome) {
    case "deadline":
    case "unauthorized":
      return !0;
    case "unavailable":
      return cause === void 0;
    case "failed":
      return isRefusedAsSent !== !0;
    case "sent":
    case "unchanged":
    case "conflict_resolved":
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "aborted":
      return !1;
  }
}
//@ chunk-mxpjbr4y.js:17848-18414 placement
async function uploadSettingsPack(
  {
    sessionId: sessionId,
    storageV5: storageV5,
    plan: plan,
    bound: bound,
    trigger: trigger,
    signal: signal,
    cut: cut,
    getStoreClient: getStoreClient,
    deadlineMs: deadlineMs,
  },
  w,
) {
  let now = Date.now(),
    U = (w === 1 || trigger !== "create") && readHomeSeedRecord(sessionId)?.tried === !0,
    D = await sendSettingsPack(
      getStoreClient,
      plan.pack,
      trigger,
      { sessionId: sessionId, storageV5: storageV5 },
      signal,
      cut,
      deadlineMs,
    );
  return (
    logEvent("tengu_home_seed_upload", {
      trigger: fromEnum(trigger),
      outcome: fromEnum(D.outcome),
      attempt: w,
      bytes: D.written?.pack.length ?? plan.pack.length,
      generation: D.generation,
      bound: bound,
      row_standing: D.standing === !0,
      allow_rules_cut: D.allowRulesCut ?? 0,
      allow_rules_recorded: readHomeSeedRecord(sessionId)?.allow.length ?? 0,
      after_failed_create: U,
      cause: fromEnumOpt(D.cause),
      duration_ms: Date.now() - now,
    }),
    D
  );
}
//@ chunk-mxpjbr4y.js:18414-18781 placement
function recordHomeSeedOutcome(
  e,
  { sessionId: sessionId, plan: plan, bound: bound, trigger: trigger },
  { outcome: outcome, written: written, standing: standing, allowRulesCut: allowRulesCut, cause: cause },
) {
  logHomeSeedOutcome(classifyResendOutcome(outcome, cause), trigger, "");
  let R = readHomeSeedRecord(sessionId);
  return (
    homeSeedResultSummary(
      e,
      plan,
      outcome,
      {
        sessionId: sessionId,
        trigger: trigger,
        bound: bound,
        didCreateCarryAllowRules: (R?.allow.length ?? 0) > 0,
      },
      R?.tried === !0 && standing !== !0 ? !1 : (standing ?? !1),
      allowRulesCut ?? 0,
      cause,
    ),
    {
      outcome: {
        kind: "uploaded",
        outcome: outcome,
        summary: plan.summary,
        bound: bound,
        ...describeSettingsRefusal(plan),
        ...describeKeptFiles(plan),
      },
      written: written,
    }
  );
}
//@ chunk-mxpjbr4y.js:18781-18963 placement
function describeKeptFiles(e) {
  if (e.kind === "none") return {};
  let n = filesKeptForCredential(e.leftBehind),
    r = filesKeptAsLinks(e.leftBehind);
  return {
    ...((n.claudeMd || n.others > 0) && { keptForCredential: n }),
    ...(r.names.length > 0 && { keptAsLinks: r }),
  };
}
//@ chunk-mxpjbr4y.js:18963-19126 placement
function describeSettingsRefusal(e) {
  let settings = e.settings;
  return settings === "schema_rejected" ||
    settings === "settings_too_large" ||
    settings === "settings_unreadable" ||
    settings === "self_hosted_runner"
    ? { settingsRefused: settings }
    : {};
}
//@ chunk-mxpjbr4y.js:19126-19458 placement
function classifyCreateOutcome(e, n) {
  switch (e) {
    case "failed":
    case "home_unvettable":
    case "rules_unreadable":
      return { is: "bad", code: e };
    case "nothing_to_send":
    case "too_slow":
      return { is: "sad", code: e };
    case "unbound":
    case "flag_off":
    case "no_consent":
    case "user_settings_disabled":
    case "aborted":
    case "self_hosted_runner":
      return null;
    case "no_project_files":
      return null;
  }
}
//@ chunk-mxpjbr4y.js:19458-19777 placement
function classifyResendOutcome(e, n) {
  switch (e) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return { is: "ok" };
    case "aborted":
    case "not_forwarded_at_create":
      return null;
    case "unavailable":
      return { is: "sad", code: n ?? e };
    case "lane_full":
    case "unauthorized":
    case "deadline":
    case "raced":
      return { is: "sad", code: e };
    case "failed":
      return { is: "bad", code: e };
  }
}
//@ chunk-mxpjbr4y.js:19777-20115 placement
function logHomeSeedOutcome(e, n, r) {
  if (e === null) return;
  let i = n === "create";
  switch (e.is) {
    case "ok":
      if ((logFeatureOk("ccr_home_seed"), i)) logFeatureOk("ccr_home_seed_create_upload");
      return;
    case "sad":
      if ((logFeatureSad("ccr_home_seed", e.code), i))
        logFeatureSad("ccr_home_seed_create_upload", `${r}${e.code}`);
      return;
    case "bad":
      if ((logFeatureBad("ccr_home_seed", e.code), i))
        logFeatureBad("ccr_home_seed_create_upload", `${r}${e.code}`);
      return;
  }
}
//@ chunk-mxpjbr4y.js:20115-20761 placement
async function sendSettingsPack(e, n, r, i, _, s, h) {
  if (X0(_)) return { outcome: "aborted", generation: 0, written: null };
  let abortController = new AbortController(),
    b = () => abortController.abort();
  (_?.addEventListener("abort", b, { once: !0 }), s?.addEventListener("abort", b, { once: !0 }));
  try {
    let w = await withDeadline(
      e().then((R) => resendSettingsPack(R, n, r, i, abortController.signal)),
      h,
    );
    if (w === void 0 || w.outcome === "aborted") {
      if (X0(_)) return { outcome: "aborted", generation: 0, written: null };
      if (r === "create")
        return (
          writeSeedRecord(i, n, 1, void 0),
          { outcome: "deadline", generation: 0, written: { pack: n, generation: 1 } }
        );
      return { outcome: "deadline", generation: 0, written: null, standing: "unknown" };
    }
    return w;
  } finally {
    (abortController.abort(), _?.removeEventListener("abort", b), s?.removeEventListener("abort", b));
  }
}
//@ chunk-mxpjbr4y.js:20761-21779 placement
async function resendSettingsPack(e, n, r, i, _) {
  if (r !== "create") {
    let h = readHomeSeedRecord(i.sessionId);
    if (h === void 0) return { outcome: "not_forwarded_at_create", generation: 0, written: null };
    let storeRow = await e.getStoreRow(joined_5, _);
    if (storeRow.kind !== "ok" && storeRow.kind !== "not_found")
      return {
        outcome: mapRowError(storeRow),
        generation: 0,
        written: null,
        standing: "unknown",
        ...storeErrorCause(storeRow),
      };
    let b = repackForResend(n, h),
      w = (U) =>
        writeHomeSeedRecord(i.sessionId, { ...h, generation: U, etag: void 0, at: Date.now() }, i.storageV5),
      R =
        storeRow.kind === "ok"
          ? await putMergedSettingsPack(e, b.pack, storeRow, _, w)
          : {
              ...(await putSettingsPack(e, bumpPackGeneration(b.pack, h.generation), _, w)),
              standing: "gone",
            };
    if (storeRow.kind === "not_found")
      logEvent("tengu_home_seed_stored_pack_gone", {
        outcome: fromEnum(R.outcome),
        generation: R.generation,
        record_generation: h.generation,
        after_failed_create: h.tried === !0,
      });
    if (R.written !== null)
      writeHomeSeedRecord(
        i.sessionId,
        { ...h, generation: R.generation, etag: R.etag, at: Date.now() },
        i.storageV5,
      );
    return b.cut === 0 ? R : { ...R, allowRulesCut: b.cut };
  }
  let s = await putSettingsPack(e, { pack: n, generation: 1 }, _, async (h) => {
    if (h > 1) writeSeedRecord(i, n, h, void 0);
  });
  if (s.written !== null) writeSeedRecord(i, s.written.pack, s.generation, s.etag);
  else if (s.outcome in HOME_SEED_FAILURE_TEXT) writeSeedRecord(i, n, 1, void 0, { tried: !0 });
  return s;
}
//@ chunk-mxpjbr4y.js:21779-22204 placement
async function putSettingsPack(e, { pack: pack, generation: generation }, i, _) {
  await _?.(generation);
  let putStoreRow = await e.putStoreRow(joined_5, pack, { signal: i });
  if (putStoreRow.kind !== "conflict") {
    if (putStoreRow.kind !== "ok")
      return {
        outcome: storeRowOutcome(putStoreRow, "sent"),
        generation: 0,
        written: null,
        ...storeErrorCause(putStoreRow),
      };
    return {
      outcome: "sent",
      generation: generation,
      written: { pack: pack, generation: generation },
      etag: putStoreRow.etag,
    };
  }
  let storeRow = await e.getStoreRow(joined_5, i);
  if (storeRow.kind !== "ok")
    return {
      outcome: mapRowError(storeRow),
      generation: 0,
      written: null,
      standing: !0,
      ...storeErrorCause(storeRow),
    };
  return putMergedSettingsPack(e, pack, storeRow, i, _);
}
//@ chunk-mxpjbr4y.js:22204-22380 placement
function writeSeedRecord(e, n, r, i, _ = {}) {
  let s = decodeHomePack(n),
    h = s.ok ? (xt(s.pack.settings) ?? []) : [];
  writeHomeSeedRecord(
    e.sessionId,
    { generation: r, ...(i !== void 0 && { etag: i }), ..._, allow: h.map(shortSha256), at: Date.now() },
    e.storageV5,
  );
}
//@ chunk-mxpjbr4y.js:22380-22812 placement
async function putMergedSettingsPack(e, n, r, i, _) {
  let s = mergePackGeneration(n, r.content);
  await _?.(s.generation);
  let putStoreRow = await e.putStoreRow(joined_5, s.pack, { ifMatchSha256: r.etag, signal: i }),
    S =
      putStoreRow.kind === "conflict"
        ? "raced"
        : storeRowOutcome(putStoreRow, s.unchanged ? "unchanged" : "conflict_resolved");
  return putStoreRow.kind === "ok"
    ? {
        outcome: S,
        generation: s.generation,
        written: { pack: s.pack, generation: s.generation },
        standing: !0,
        ...(putStoreRow.etag !== void 0 && { etag: putStoreRow.etag }),
      }
    : { outcome: S, generation: 0, written: null, standing: !0, ...storeErrorCause(putStoreRow) };
}
//@ chunk-mxpjbr4y.js:22812-23139 placement
function storeErrorCause(e) {
  switch (e.kind) {
    case "lane_unavailable":
    case "unauthorized":
      return e.cause !== void 0 ? { cause: e.cause } : {};
    case "path_too_long":
    case "too_large":
      return { isRefusedAsSent: !0 };
    case "failed":
      return e.status === void 0
        ? {}
        : {
            httpStatus: e.status,
            ...(e.status >= 400 && e.status < 500 && e.status !== 429 && { isRefusedAsSent: !0 }),
          };
    default:
      return {};
  }
}
//@ chunk-mxpjbr4y.js:23139-23687 placement
function repackForResend(e, n) {
  let r = decodeHomePack(e);
  if (!r.ok) throw Error("the settings pack to re-send does not parse");
  if (r.pack.settings === null || r.pack.settings.permissions === void 0) return { pack: e, cut: 0 };
  let safeParse = pe().safeParse(r.pack.settings.permissions);
  if (!safeParse.success) throw Error("the settings pack to re-send carries permissions of an unknown shape");
  let allow = safeParse.data.allow;
  if (allow === void 0) return { pack: e, cut: 0 };
  let s = new Set(n.allow),
    filtered = allow.filter((b) => s.has(shortSha256(b))),
    S = allow.length - filtered.length;
  return S === 0
    ? { pack: e, cut: S }
    : { pack: encodeHomePack({ ...r.pack, settings: withAllowRules(r.pack.settings, filtered) }), cut: S };
}
//@ chunk-mxpjbr4y.js:23687-23731 placement
var pe = DoctorLazy(() => kt({ allow: A(o()).optional() }));
//@ chunk-mxpjbr4y.js:23731-23820 placement
function xt(e) {
  let safeParse = pe().safeParse(e?.permissions);
  return safeParse.success ? safeParse.data.allow : void 0;
}
//@ chunk-mxpjbr4y.js:23820-23936 placement
function withAllowRules(e, n) {
  let safeParse = pe().safeParse(e.permissions);
  return { ...e, permissions: { ...(safeParse.success ? safeParse.data : {}), allow: [...n] } };
}
//@ chunk-mxpjbr4y.js:23936-24202 placement
function mergePackGeneration(e, n) {
  let r = decodeHomePack(e),
    i = decodeHomePack(n);
  if (r.ok && i.ok) {
    if (encodeHomePack({ ...r.pack, generation: i.pack.generation }).equals(n))
      return { pack: n, generation: i.pack.generation, unchanged: !0 };
  }
  if (n.equals(e)) return { pack: n, generation: 1, unchanged: !0 };
  return { ...bumpPackGeneration(e, readHomePackGeneration(n) ?? 0), unchanged: !1 };
}
//@ chunk-mxpjbr4y.js:24202-24349 placement
function bumpPackGeneration(e, n) {
  let r = decodeHomePack(e);
  if (!r.ok) return { pack: e, generation: 1 };
  let min = Math.min(n + 1, MAX_PACK_GENERATION);
  return { pack: encodeHomePack({ ...r.pack, generation: min }), generation: min };
}
//@ chunk-mxpjbr4y.js:24349-24626 placement
function storeRowOutcome(e, n) {
  switch (e.kind) {
    case "ok":
      return n;
    case "conflict":
    case "path_too_long":
    case "too_large":
    case "failed":
      return "failed";
    case "lane_full":
      return "lane_full";
    case "aborted":
      return "aborted";
    case "lane_unavailable":
      return "unavailable";
    case "unauthorized":
      return "unauthorized";
  }
}
//@ chunk-mxpjbr4y.js:24626-24814 placement
function mapRowError(e) {
  switch (e.kind) {
    case "not_found":
    case "failed":
      return "failed";
    case "aborted":
      return "aborted";
    case "lane_unavailable":
      return "unavailable";
    case "unauthorized":
      return "unauthorized";
  }
}
//@ chunk-mxpjbr4y.js:24814-26589 placement
function homeSeedResultSummary(
  e,
  n,
  r,
  {
    sessionId: sessionId,
    trigger: trigger,
    bound: bound,
    didCreateCarryAllowRules: didCreateCarryAllowRules,
  },
  S,
  b,
  w,
) {
  let R = r === "unavailable" && w !== "device_key_unavailable" ? "" : START_NEW_SESSION_HINT;
  switch (r) {
    case "sent":
    case "unchanged":
    case "conflict_resolved": {
      if (
        (e.publish(
          r === "unchanged" && trigger !== "create"
            ? "Settings from this machine are already in this session"
            : formatHomeSeedSentLine({
                ...n.description,
                permissionRules: n.description.permissionRules - b,
              }) + (bound ? "" : " (this session cannot run commands on this machine)"),
          "debug",
        ),
        b > 0)
      )
        e.publish(
          `${b} ${plural(b, "permission allow rule")} ${b === 1 ? "stays" : "stay"} on this machine, because ${b === 1 ? "it was" : "they were"} not in the settings prepared when this cloud session was created; a new session takes ${b === 1 ? "it" : "them"}`,
          "debug",
        );
      let U = formatHomeSeedLeftBehindLine(n, {
        launch:
          trigger === "create"
            ? "create"
            : didCreateCarryAllowRules
              ? "reopen_sent"
              : "reopen_sent_no_allow_recorded",
        settingsFile: userSettingsDisplayPath(n.configHome),
      });
      if (U !== null) e.publish(U, leftBehindSummary(n));
      return;
    }
    case "aborted":
      return;
    case "deadline":
      e.publish(
        formatRulesNotInForce(S, {
          ifNoneStood: RULES_MAY_NOT_BE_IN_FORCE,
          otherwise: "The cloud session may not have your latest settings",
          why: "sending your settings took too long",
          wayOut: R,
        }),
        "warning",
      );
      return;
    case "raced":
      e.publish(
        `${RULES_MAY_NOT_BE_IN_FORCE}: another launch of this session, or the session itself, wrote its settings first`,
        "warning",
      );
      return;
    case "not_forwarded_at_create":
      if (!claimOnce().claim(`home_seed_not_sent_again:${sessionIdBody(sessionId)}`)) return;
      e.publish(
        "Settings from this machine were not sent again: this machine has no record of sending them when this session was created (a session started without them, from another machine, by an earlier build, or older than this machine still tracks)",
        "debug",
      );
      return;
    case "lane_full":
    case "unavailable":
    case "unauthorized":
    case "failed": {
      let U =
        w === "write_signature_refused"
          ? zt
          : r === "unavailable" && w !== void 0
            ? $t[w]
            : HOME_SEED_FAILURE_TEXT[r];
      e.publish(
        formatRulesNotInForce(S, {
          ifNoneStood: RULES_NOT_IN_FORCE,
          otherwise: SETTINGS_STAY,
          why: U,
          wayOut: R,
        }),
        "warning",
      );
      return;
    }
  }
}
//@ chunk-mxpjbr4y.js:26589-26876 placement
function leftBehindSummary(e) {
  let n = e.summary.overCap + e.unreadable + count(e.leftBehind, (_) => _.reason === "undefusable"),
    r =
      e.settings === "schema_rejected" ||
      e.settings === "settings_too_large" ||
      e.settings === "settings_unreadable",
    i = e.summary.droppedRules.credentialRestrictions > 0;
  return n > 0 || r || i ? "warning" : "debug";
}
//@ chunk-mxpjbr4y.js:26876-26926 placement
var START_NEW_SESSION_HINT = "; start a new cloud session to try again";
//@ chunk-mxpjbr4y.js:26926-26974 placement = _temp5 (1)
function userSettingsDisplayPath(a_0) {
  return tildify(getSettingsFilePathForSource("userSettings") ?? a_0);
}
//@ chunk-mxpjbr4y.js:26974-27091 placement
function formatRulesNotInForce(
  e,
  { ifNoneStood: ifNoneStood, otherwise: otherwise, why: why, wayOut: wayOut },
) {
  return e === !1
    ? `${ifNoneStood}: ${why}${wayOut}`
    : `${e === "gone" ? RULES_MAY_NOT_BE_IN_FORCE : otherwise}: ${why}`;
}

export { runHomeSeed, leftBehindSummary, userSettingsDisplayPath, START_NEW_SESSION_HINT };
