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
import { SEED_READY_TIMEOUTS, SEED_READY_TIMEOUT_MS, awaitSeedReadiness } from "./seedReadiness.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { createSyncedFileLane, canUseSyncedFileLane } from "./syncedFileLane.js";
import { createBoundDeviceSigner } from "./syncedFileSigner.js";
import { withDeadline } from "../../utils/sleep.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import {
  homeSeedNoticeLines,
  homeSeedSummary,
  HOME_SEED_FAILURE_TEXT,
  CLOCK_SKEW_REASON,
  SEED_REFUSAL_REASONS,
} from "./homeSeedMessages.js";
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
import { isAborted } from "../../utils/abortSignalUtils.js";
import { joined_5 } from "../../utils/teleport/seedPaths.js";
import { decodeHomePack, encodeHomePack, readHomePackGeneration, MAX_PACK_GENERATION } from "./homePack.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, array, string } from "../../../vendor/zod/v4/classic/schemas.js";
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
//@ chunk-mxpjbr4y.js:14464-16215 placement
/**
 * 创建一次 home seed 运行：打包本地设置、上传到会话存储、等待就绪，并在会话结束时收尾。
 */
function createHomeSeedRun({
  sessionId,
  plan,
  bound,
  boundDeviceUuid,
  held,
  trigger,
  launchConsent,
  isProjectStillSynced,
  signal,
  credentials,
  storageV5,
  client,
  deadlineMs = SEED_READY_TIMEOUTS,
  planDeadlineMs = SEED_READY_TIMEOUT_MS,
}) {
  let noticeBacklog = createNoticeBacklog();
  let N = Promise.resolve(boundDeviceUuid).catch(() => {
    return;
  });
  let E = client === undefined ? undefined : Promise.resolve(client);
  let v = () =>
    (E ??= N.then((y) =>
      createSyncedFileLane({
        sessionId,
        credentials,
        ...(y !== undefined && {
          signer: createBoundDeviceSigner({
            sessionId,
            boundDeviceUuid: y,
            credentials,
            ...(held !== undefined && {
              held,
            }),
          }),
          signedOnly: true,
        }),
      }),
    ));
  let H = withDeadline(
    Promise.resolve(plan).catch((error) => {
      if (!isAbortError(error)) logError(error);
      return {
        kind: "none",
        reason: isAbortError(error) ? "aborted" : "failed",
      };
    }),
    planDeadlineMs,
  ).then(
    (y) =>
      y ?? {
        kind: "none",
        reason: "too_slow",
      },
  );
  let T;
  H.then((y) => {
    T = y.kind === "ready" ? y.description : null;
  });
  let x = H.then((y) =>
    y.kind === "ready"
      ? {
          plan: y,
          attempts: createPackForwarder(
            {
              sessionId,
              storageV5,
              plan: y,
              bound,
              trigger,
              signal,
              getStoreClient: v,
              deadlineMs,
            },
            () => canUseSyncedFileLane(launchConsent, isProjectStillSynced),
          ),
        }
      : {
          plan: y,
          attempts: null,
        },
  );
  return {
    ensureUploaded: (y) => x.then(({ attempts }) => attempts?.ensureUploaded(y) ?? "done"),
    pendingSeed: (y) => {
      let L = x.then(({ plan, attempts }) =>
        (attempts === null
          ? Promise.resolve().then(() => {
              for (let M of homeSeedNoticeLines(plan, trigger, planDeadlineMs))
                noticeBacklog.publish(M, homeSeedSummary(plan));
              logHomeSeedOutcome(classifyCreateOutcome(plan.reason, trigger), trigger, "plan_");
              return {
                outcome: {
                  kind: "none",
                  reason: plan.reason,
                  ...describeKeptFiles(plan),
                },
                written: null,
              };
            })
          : attempts.endedOnce(y).then((M) =>
              recordHomeSeedOutcome(
                noticeBacklog,
                {
                  sessionId,
                  plan,
                  bound,
                  trigger,
                },
                M,
              ),
            )
        ).catch((error) => {
          logError(error);
          logHomeSeedOutcome(
            {
              is: "bad",
              code: "unexpected",
            },
            trigger,
            "",
          );
          return {
            outcome:
              plan.kind === "ready"
                ? {
                    kind: "uploaded",
                    outcome: "failed",
                    summary: plan.summary,
                    bound,
                    ...describeSettingsRefusal(plan),
                    ...describeKeptFiles(plan),
                  }
                : {
                    kind: "none",
                    reason: plan.reason,
                    ...describeKeptFiles(plan),
                  },
            written: null,
          };
        }),
      );
      return createSeedSendHandle({
        completion: L.then(({ outcome }) => outcome),
        status: noticeBacklog,
        description: () => T,
        afterFirstReply: (signal, onReadBack) =>
          L.then(({ outcome, written }) =>
            written === null
              ? "skipped"
              : v().then((client) =>
                  awaitSeedReadiness({
                    client,
                    pack: written.pack,
                    generation: written.generation,
                    uploaded: outcome,
                    status: noticeBacklog,
                    launchConsent,
                    isProjectStillSynced,
                    signal,
                    onReadBack,
                  }),
                ),
          ),
      });
    },
  };
}
//@ chunk-mxpjbr4y.js:16215-16580 placement
function createPackForwarder(e, mayStillForwardNow) {
  let r = uploadSettingsPack(e, 1);
  let i = {
    packUpload: e,
    mayStillForwardNow,
    ended: Promise.withResolvers(),
    isEnded: false,
    attemptsMade: 1,
    latest: r,
    call: undefined,
  };
  i.ended.promise.catch(() => {});
  trackSeedPromise(i, r, null);
  return {
    endedOnce: (_) => {
      _.then(() => {
        i.isEnded = true;
        return i.latest;
      }).then(
        (s) => resolveSeedDone(i, s),
        (error) => rejectSeedDone(i, error),
      );
      return i.ended.promise;
    },
    ensureUploaded: (_) =>
      (i.call ??= forwardLatestPack(i, _).finally(() => {
        i.call = undefined;
      })),
  };
}
//@ chunk-mxpjbr4y.js:16580-16629 placement
/**
 * 把 seed 标记为结束并解析结果。
 */
function resolveSeedDone(e, n) {
  e.isEnded = true;
  e.ended.resolve(n);
}
//@ chunk-mxpjbr4y.js:16629-16677 placement
/**
 * 把 seed 标记为结束并带错误拒绝。
 */
function rejectSeedDone(e, error) {
  e.isEnded = true;
  e.ended.reject(error);
}
//@ chunk-mxpjbr4y.js:16677-16748 placement
/**
 * 跟踪一个 seed promise，成功/失败都反映到结束状态。
 */
function trackSeedPromise(e, n, r) {
  n.then(
    (i) => {
      if (!homeSeedFailureKind(i)) resolveSeedDone(e, preferWrittenOutcome(r, i));
    },
    (error) => rejectSeedDone(e, error),
  );
}
//@ chunk-mxpjbr4y.js:16748-16842 placement
/**
 * 保留更“有进展”的结果（优先已写入的）。
 */
function preferWrittenOutcome(e, n) {
  return e !== null && e.written !== null && n.written === null && n.outcome !== "raced" ? e : n;
}
//@ chunk-mxpjbr4y.js:16842-17364 placement
async function forwardLatestPack(e, n) {
  try {
    let latest = await e.latest;
    if (e.isEnded) return "done";
    let i = await e.mayStillForwardNow().catch((error) => {
      logError(error);
      return false;
    });
    if (e.isEnded) return "done";
    if (!i) {
      logEvent("tengu_home_seed_upload_no_longer_allowed", {
        trigger: fromEnum(e.packUpload.trigger),
        attempts_made: e.attemptsMade,
      });
      resolveSeedDone(e, latest);
      return "done";
    }
    if (n.aborted) return buildSendFailure(latest);
    e.attemptsMade += 1;
    let _ = uploadSettingsPack(
      {
        ...e.packUpload,
        cut: n,
      },
      e.attemptsMade,
    );
    trackSeedPromise(e, _, latest);
    e.latest = _.then((h) => preferWrittenOutcome(latest, h));
    e.latest.catch(() => {});
    let s = await _;
    return homeSeedFailureKind(s) ? buildSendFailure(s) : "done";
  } catch (error) {
    rejectSeedDone(e, error);
    return "done";
  }
}
//@ chunk-mxpjbr4y.js:17364-17548 placement
function buildSendFailure({ outcome, cause, httpStatus }) {
  return {
    kind: "failed",
    ...(httpStatus !== undefined &&
      httpStatus >= 400 && {
        httpStatus,
      }),
    ...(outcome === "unauthorized" && {
      remedy: cause === "write_signature_refused" ? "clock" : "login",
    }),
  };
}
//@ chunk-mxpjbr4y.js:17548-17848 placement
function homeSeedFailureKind({ outcome, cause, isRefusedAsSent }) {
  switch (outcome) {
    case "deadline":
    case "unauthorized":
      return true;
    case "unavailable":
      return cause === undefined;
    case "failed":
      return isRefusedAsSent !== true;
    case "sent":
    case "unchanged":
    case "conflict_resolved":
    case "raced":
    case "not_forwarded_at_create":
    case "lane_full":
    case "aborted":
      return false;
  }
}
//@ chunk-mxpjbr4y.js:17848-18414 placement
async function uploadSettingsPack(
  { sessionId, storageV5, plan, bound, trigger, signal, cut, getStoreClient, deadlineMs },
  w,
) {
  let now = Date.now();
  let afterFailedCreate = (w === 1 || trigger !== "create") && readHomeSeedRecord(sessionId)?.tried === true;
  let D = await sendSettingsPack(
    getStoreClient,
    plan.pack,
    trigger,
    {
      sessionId,
      storageV5,
    },
    signal,
    cut,
    deadlineMs,
  );
  logEvent("tengu_home_seed_upload", {
    trigger: fromEnum(trigger),
    outcome: fromEnum(D.outcome),
    attempt: w,
    bytes: D.written?.pack.length ?? plan.pack.length,
    generation: D.generation,
    bound,
    row_standing: D.standing === true,
    allow_rules_cut: D.allowRulesCut ?? 0,
    allow_rules_recorded: readHomeSeedRecord(sessionId)?.allow.length ?? 0,
    after_failed_create: afterFailedCreate,
    cause: fromEnumOpt(D.cause),
    duration_ms: Date.now() - now,
  });
  return D;
}
//@ chunk-mxpjbr4y.js:18414-18781 placement
function recordHomeSeedOutcome(
  noticeBacklog,
  { sessionId, plan, bound, trigger },
  { outcome, written, standing, allowRulesCut, cause },
) {
  logHomeSeedOutcome(classifyResendOutcome(outcome, cause), trigger, "");
  let homeSeedRecord = readHomeSeedRecord(sessionId);
  homeSeedResultSummary(
    noticeBacklog,
    plan,
    outcome,
    {
      sessionId,
      trigger,
      bound,
      didCreateCarryAllowRules: (homeSeedRecord?.allow.length ?? 0) > 0,
    },
    homeSeedRecord?.tried === true && standing !== true ? false : (standing ?? false),
    allowRulesCut ?? 0,
    cause,
  );
  return {
    outcome: {
      kind: "uploaded",
      outcome,
      summary: plan.summary,
      bound,
      ...describeSettingsRefusal(plan),
      ...describeKeptFiles(plan),
    },
    written,
  };
}
//@ chunk-mxpjbr4y.js:18781-18963 placement
function describeKeptFiles(plan) {
  if (plan.kind === "none") return {};
  let n = filesKeptForCredential(plan.leftBehind);
  let r = filesKeptAsLinks(plan.leftBehind);
  return {
    ...((n.claudeMd || n.others > 0) && {
      keptForCredential: n,
    }),
    ...(r.names.length > 0 && {
      keptAsLinks: r,
    }),
  };
}
//@ chunk-mxpjbr4y.js:18963-19126 placement
function describeSettingsRefusal(plan) {
  let settings = plan.settings;
  return settings === "schema_rejected" ||
    settings === "settings_too_large" ||
    settings === "settings_unreadable" ||
    settings === "self_hosted_runner"
    ? {
        settingsRefused: settings,
      }
    : {};
}
//@ chunk-mxpjbr4y.js:19126-19458 placement
function classifyCreateOutcome(reason, trigger) {
  switch (reason) {
    case "failed":
    case "home_unvettable":
    case "rules_unreadable":
      return {
        is: "bad",
        code: reason,
      };
    case "nothing_to_send":
    case "too_slow":
      return {
        is: "sad",
        code: reason,
      };
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
function classifyResendOutcome(outcome, cause) {
  switch (outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return {
        is: "ok",
      };
    case "aborted":
    case "not_forwarded_at_create":
      return null;
    case "unavailable":
      return {
        is: "sad",
        code: cause ?? outcome,
      };
    case "lane_full":
    case "unauthorized":
    case "deadline":
    case "raced":
      return {
        is: "sad",
        code: outcome,
      };
    case "failed":
      return {
        is: "bad",
        code: outcome,
      };
  }
}
//@ chunk-mxpjbr4y.js:19777-20115 placement
function logHomeSeedOutcome(e, trigger, r) {
  if (e === null) return;
  let i = trigger === "create";
  switch (e.is) {
    case "ok":
      logFeatureOk("ccr_home_seed");
      if (i) logFeatureOk("ccr_home_seed_create_upload");
      return;
    case "sad":
      logFeatureSad("ccr_home_seed", e.code);
      if (i) logFeatureSad("ccr_home_seed_create_upload", `${r}${e.code}`);
      return;
    case "bad":
      logFeatureBad("ccr_home_seed", e.code);
      if (i) logFeatureBad("ccr_home_seed_create_upload", `${r}${e.code}`);
      return;
  }
}
//@ chunk-mxpjbr4y.js:20115-20761 placement
async function sendSettingsPack(getStoreClient, pack, trigger, i, signal, s, deadlineMs) {
  if (isAborted(signal))
    return {
      outcome: "aborted",
      generation: 0,
      written: null,
    };
  let abortController = new AbortController();
  let b = () => abortController.abort();
  signal?.addEventListener("abort", b, {
    once: true,
  });
  s?.addEventListener("abort", b, {
    once: true,
  });
  try {
    let w = await withDeadline(
      getStoreClient().then((R) => resendSettingsPack(R, pack, trigger, i, abortController.signal)),
      deadlineMs,
    );
    if (w === undefined || w.outcome === "aborted") {
      if (isAborted(signal))
        return {
          outcome: "aborted",
          generation: 0,
          written: null,
        };
      if (trigger === "create") {
        writeSeedRecord(i, pack, 1, undefined);
        return {
          outcome: "deadline",
          generation: 0,
          written: {
            pack,
            generation: 1,
          },
        };
      }
      return {
        outcome: "deadline",
        generation: 0,
        written: null,
        standing: "unknown",
      };
    }
    return w;
  } finally {
    abortController.abort();
    signal?.removeEventListener("abort", b);
    s?.removeEventListener("abort", b);
  }
}
//@ chunk-mxpjbr4y.js:20761-21779 placement
async function resendSettingsPack(e, n, r, i, signal) {
  if (r !== "create") {
    let homeSeedRecord = readHomeSeedRecord(i.sessionId);
    if (homeSeedRecord === undefined)
      return {
        outcome: "not_forwarded_at_create",
        generation: 0,
        written: null,
      };
    let S = await e.getStoreRow(joined_5, signal);
    if (S.kind !== "ok" && S.kind !== "not_found")
      return {
        outcome: mapRowError(S),
        generation: 0,
        written: null,
        standing: "unknown",
        ...storeErrorCause(S),
      };
    let b = repackForResend(n, homeSeedRecord);
    let w = (generation) =>
      writeHomeSeedRecord(
        i.sessionId,
        {
          ...homeSeedRecord,
          generation,
          etag: undefined,
          at: Date.now(),
        },
        i.storageV5,
      );
    let R =
      S.kind === "ok"
        ? await putMergedSettingsPack(e, b.pack, S, signal, w)
        : {
            ...(await putSettingsPack(e, bumpPackGeneration(b.pack, homeSeedRecord.generation), signal, w)),
            standing: "gone",
          };
    if (S.kind === "not_found")
      logEvent("tengu_home_seed_stored_pack_gone", {
        outcome: fromEnum(R.outcome),
        generation: R.generation,
        record_generation: homeSeedRecord.generation,
        after_failed_create: homeSeedRecord.tried === true,
      });
    if (R.written !== null)
      writeHomeSeedRecord(
        i.sessionId,
        {
          ...homeSeedRecord,
          generation: R.generation,
          etag: R.etag,
          at: Date.now(),
        },
        i.storageV5,
      );
    return b.cut === 0
      ? R
      : {
          ...R,
          allowRulesCut: b.cut,
        };
  }
  let s = await putSettingsPack(
    e,
    {
      pack: n,
      generation: 1,
    },
    signal,
    async (h) => {
      if (h > 1) writeSeedRecord(i, n, h, undefined);
    },
  );
  if (s.written !== null) writeSeedRecord(i, s.written.pack, s.generation, s.etag);
  else if (s.outcome in HOME_SEED_FAILURE_TEXT)
    writeSeedRecord(i, n, 1, undefined, {
      tried: true,
    });
  return s;
}
//@ chunk-mxpjbr4y.js:21779-22204 placement
async function putSettingsPack(e, { pack, generation }, signal, _) {
  await _?.(generation);
  let s = await e.putStoreRow(joined_5, pack, {
    signal,
  });
  if (s.kind !== "conflict") {
    if (s.kind !== "ok")
      return {
        outcome: storeRowOutcome(s, "sent"),
        generation: 0,
        written: null,
        ...storeErrorCause(s),
      };
    return {
      outcome: "sent",
      generation,
      written: {
        pack,
        generation,
      },
      etag: s.etag,
    };
  }
  let h = await e.getStoreRow(joined_5, signal);
  if (h.kind !== "ok")
    return {
      outcome: mapRowError(h),
      generation: 0,
      written: null,
      standing: true,
      ...storeErrorCause(h),
    };
  return putMergedSettingsPack(e, pack, h, signal, _);
}
//@ chunk-mxpjbr4y.js:22204-22380 placement
function writeSeedRecord(e, n, generation, i, _ = {}) {
  let s = decodeHomePack(n);
  let h = s.ok ? (allowedPermissions(s.pack.settings) ?? []) : [];
  writeHomeSeedRecord(
    e.sessionId,
    {
      generation,
      ...(i !== undefined && {
        etag: i,
      }),
      ..._,
      allow: h.map(shortSha256),
      at: Date.now(),
    },
    e.storageV5,
  );
}
//@ chunk-mxpjbr4y.js:22380-22812 placement
async function putMergedSettingsPack(e, pack, r, signal, _) {
  let s = mergePackGeneration(pack, r.content);
  await _?.(s.generation);
  let h = await e.putStoreRow(joined_5, s.pack, {
    ifMatchSha256: r.etag,
    signal,
  });
  let outcome =
    h.kind === "conflict" ? "raced" : storeRowOutcome(h, s.unchanged ? "unchanged" : "conflict_resolved");
  return h.kind === "ok"
    ? {
        outcome,
        generation: s.generation,
        written: {
          pack: s.pack,
          generation: s.generation,
        },
        standing: true,
        ...(h.etag !== undefined && {
          etag: h.etag,
        }),
      }
    : {
        outcome,
        generation: 0,
        written: null,
        standing: true,
        ...storeErrorCause(h),
      };
}
//@ chunk-mxpjbr4y.js:22812-23139 placement
function storeErrorCause(e) {
  switch (e.kind) {
    case "lane_unavailable":
    case "unauthorized":
      return e.cause !== undefined
        ? {
            cause: e.cause,
          }
        : {};
    case "path_too_long":
    case "too_large":
      return {
        isRefusedAsSent: true,
      };
    case "failed":
      return e.status === undefined
        ? {}
        : {
            httpStatus: e.status,
            ...(e.status >= 400 &&
              e.status < 500 &&
              e.status !== 429 && {
                isRefusedAsSent: true,
              }),
          };
    default:
      return {};
  }
}
//@ chunk-mxpjbr4y.js:23139-23687 placement
function repackForResend(e, homeSeedRecord) {
  let r = decodeHomePack(e);
  if (!r.ok) throw Error("the settings pack to re-send does not parse");
  if (r.pack.settings === null || r.pack.settings.permissions === undefined)
    return {
      pack: e,
      cut: 0,
    };
  let i = permissionsAllowSchema().safeParse(r.pack.settings.permissions);
  if (!i.success) throw Error("the settings pack to re-send carries permissions of an unknown shape");
  let allow = i.data.allow;
  if (allow === undefined)
    return {
      pack: e,
      cut: 0,
    };
  let s = new Set(homeSeedRecord.allow);
  let filtered = allow.filter((b) => s.has(shortSha256(b)));
  let S = allow.length - filtered.length;
  return S === 0
    ? {
        pack: e,
        cut: S,
      }
    : {
        pack: encodeHomePack({
          ...r.pack,
          settings: withAllowRules(r.pack.settings, filtered),
        }),
        cut: S,
      };
}
//@ chunk-mxpjbr4y.js:23687-23731 placement
/**
 * 只含 allow 的 permissions schema。
 */
var permissionsAllowSchema = DoctorLazy(() =>
  looseObject({
    allow: array(string()).optional(),
  }),
);
//@ chunk-mxpjbr4y.js:23731-23820 placement
/**
 * 取 settings 里 permissions.allow（没有时 undefined）。
 */
function allowedPermissions(settings) {
  let n = permissionsAllowSchema().safeParse(settings?.permissions);
  return n.success ? n.data.allow : undefined;
}
//@ chunk-mxpjbr4y.js:23820-23936 placement
function withAllowRules(settings, n) {
  let r = permissionsAllowSchema().safeParse(settings.permissions);
  return {
    ...settings,
    permissions: {
      ...(r.success ? r.data : {}),
      allow: [...n],
    },
  };
}
//@ chunk-mxpjbr4y.js:23936-24202 placement
function mergePackGeneration(e, content) {
  let r = decodeHomePack(e);
  let i = decodeHomePack(content);
  if (r.ok && i.ok) {
    if (
      encodeHomePack({
        ...r.pack,
        generation: i.pack.generation,
      }).equals(content)
    )
      return {
        pack: content,
        generation: i.pack.generation,
        unchanged: true,
      };
  }
  if (content.equals(e))
    return {
      pack: content,
      generation: 1,
      unchanged: true,
    };
  return {
    ...bumpPackGeneration(e, readHomePackGeneration(content) ?? 0),
    unchanged: false,
  };
}
//@ chunk-mxpjbr4y.js:24202-24349 placement
function bumpPackGeneration(e, n) {
  let r = decodeHomePack(e);
  if (!r.ok)
    return {
      pack: e,
      generation: 1,
    };
  let generation = Math.min(n + 1, MAX_PACK_GENERATION);
  return {
    pack: encodeHomePack({
      ...r.pack,
      generation,
    }),
    generation,
  };
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
  plan,
  outcome,
  { sessionId, trigger, bound, didCreateCarryAllowRules },
  S,
  b,
  cause,
) {
  let wayOut = outcome === "unavailable" && cause !== "device_key_unavailable" ? "" : START_NEW_SESSION_HINT;
  switch (outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved": {
      e.publish(
        outcome === "unchanged" && trigger !== "create"
          ? "Settings from this machine are already in this session"
          : formatHomeSeedSentLine({
              ...plan.description,
              permissionRules: plan.description.permissionRules - b,
            }) + (bound ? "" : " (this session cannot run commands on this machine)"),
        "debug",
      );
      if (b > 0)
        e.publish(
          `${b} ${plural(b, "permission allow rule")} ${b === 1 ? "stays" : "stay"} on this machine, because ${b === 1 ? "it was" : "they were"} not in the settings prepared when this cloud session was created; a new session takes ${b === 1 ? "it" : "them"}`,
          "debug",
        );
      let U = formatHomeSeedLeftBehindLine(plan, {
        launch:
          trigger === "create"
            ? "create"
            : didCreateCarryAllowRules
              ? "reopen_sent"
              : "reopen_sent_no_allow_recorded",
        settingsFile: userSettingsDisplayPath(plan.configHome),
      });
      if (U !== null) e.publish(U, leftBehindSummary(plan));
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
          wayOut,
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
      let why =
        cause === "write_signature_refused"
          ? CLOCK_SKEW_REASON
          : outcome === "unavailable" && cause !== undefined
            ? SEED_REFUSAL_REASONS[cause]
            : HOME_SEED_FAILURE_TEXT[outcome];
      e.publish(
        formatRulesNotInForce(S, {
          ifNoneStood: RULES_NOT_IN_FORCE,
          otherwise: SETTINGS_STAY,
          why,
          wayOut,
        }),
        "warning",
      );
      return;
    }
  }
}
//@ chunk-mxpjbr4y.js:26589-26876 placement
function leftBehindSummary(e) {
  let n = e.summary.overCap + e.unreadable + count(e.leftBehind, (_) => _.reason === "undefusable");
  let r =
    e.settings === "schema_rejected" ||
    e.settings === "settings_too_large" ||
    e.settings === "settings_unreadable";
  let i = e.summary.droppedRules.credentialRestrictions > 0;
  return n > 0 || r || i ? "warning" : "debug";
}
//@ chunk-mxpjbr4y.js:26876-26926 placement
var START_NEW_SESSION_HINT = "; start a new cloud session to try again";
//@ chunk-mxpjbr4y.js:26926-26974 placement = _temp5 (1)
function userSettingsDisplayPath(a_0) {
  return tildify(getSettingsFilePathForSource("userSettings") ?? a_0);
}
//@ chunk-mxpjbr4y.js:26974-27091 placement
function formatRulesNotInForce(e, { ifNoneStood, otherwise, why, wayOut }) {
  return e === false
    ? `${ifNoneStood}: ${why}${wayOut}`
    : `${e === "gone" ? RULES_MAY_NOT_BE_IN_FORCE : otherwise}: ${why}`;
}
export { runHomeSeed, leftBehindSummary, userSettingsDisplayPath, START_NEW_SESSION_HINT };
