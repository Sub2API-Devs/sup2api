/**
 * services/homeSeed/runHomeSeed.ts
 *
 * 2.1.316 新增：home seed 运行主流程（打包、上传、重发、结果汇总）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s1cmamfh.js (36)
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
import { looseObject, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { plural } from "../../utils/stringUtils.js";
import { claimOnce } from "../api/verificationRequired.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { countWhere } from "../../utils/collections.js";
import { tildify } from "../../utils/path.js";
import { getSettingsFilePathForSource } from "../../utils/settings/settings.js";

//@ chunk-s1cmamfh.js:14583-14643 placement
function runHomeSeed(opts) {
  return createHomeSeedRun(opts).pendingSeed(Promise.resolve());
}
//@ chunk-s1cmamfh.js:14643-16394 placement
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
  let deviceUuid = Promise.resolve(boundDeviceUuid).catch(() => {
    return;
  });
  let clientRef = client === undefined ? undefined : Promise.resolve(client);
  let getLane = () =>
    (clientRef ??= deviceUuid.then((uuid) =>
      createSyncedFileLane({
        sessionId,
        credentials,
        ...(uuid !== undefined && {
          signer: createBoundDeviceSigner({
            sessionId,
            boundDeviceUuid: uuid,
            credentials,
            ...(held !== undefined && {
              held,
            }),
          }),
          signedOnly: true,
        }),
      }),
    ));
  let readyPlan = withDeadline(
    Promise.resolve(plan).catch((error) => {
      if (!isAbortError(error)) logError(error);
      return {
        kind: "none",
        reason: isAbortError(error) ? "aborted" : "failed",
      };
    }),
    planDeadlineMs,
  ).then(
    (planValue) =>
      planValue ?? {
        kind: "none",
        reason: "too_slow",
      },
  );
  let planDescription;
  readyPlan.then((resolvedPlan) => {
    planDescription = resolvedPlan.kind === "ready" ? resolvedPlan.description : null;
  });
  let withAttempts = readyPlan.then((resolved) =>
    resolved.kind === "ready"
      ? {
          plan: resolved,
          attempts: createPackForwarder(
            {
              sessionId,
              storageV5,
              plan: resolved,
              bound,
              trigger,
              signal,
              getStoreClient: getLane,
              deadlineMs,
            },
            () => canUseSyncedFileLane(launchConsent, isProjectStillSynced),
          ),
        }
      : {
          plan: resolved,
          attempts: null,
        },
  );
  return {
    ensureUploaded: (signal) =>
      withAttempts.then(({ attempts }) => attempts?.ensureUploaded(signal) ?? "done"),
    pendingSeed: (signal) => {
      let completion = withAttempts.then(({ plan, attempts }) =>
        (attempts === null
          ? Promise.resolve().then(() => {
              for (let line of homeSeedNoticeLines(plan, trigger, planDeadlineMs))
                noticeBacklog.publish(line, homeSeedSummary(plan));
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
          : attempts.endedOnce(signal).then((outcome) =>
              recordHomeSeedOutcome(
                noticeBacklog,
                {
                  sessionId,
                  plan,
                  bound,
                  trigger,
                },
                outcome,
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
        completion: completion.then(({ outcome }) => outcome),
        status: noticeBacklog,
        description: () => planDescription,
        afterFirstReply: (signal, onReadBack) =>
          completion.then(({ outcome, written }) =>
            written === null
              ? "skipped"
              : getLane().then((client) =>
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
//@ chunk-s1cmamfh.js:16394-16759 placement
function createPackForwarder(upload, mayStillForwardNow) {
  let firstUpload = uploadSettingsPack(upload, 1);
  let state = {
    packUpload: upload,
    mayStillForwardNow,
    ended: Promise.withResolvers(),
    isEnded: false,
    attemptsMade: 1,
    latest: firstUpload,
    call: undefined,
  };
  state.ended.promise.catch(() => {});
  trackSeedPromise(state, firstUpload, null);
  return {
    endedOnce: (ended) => {
      ended
        .then(() => {
          state.isEnded = true;
          return state.latest;
        })
        .then(
          (latest) => resolveSeedDone(state, latest),
          (error) => rejectSeedDone(state, error),
        );
      return state.ended.promise;
    },
    ensureUploaded: (signal) =>
      (state.call ??= forwardLatestPack(state, signal).finally(() => {
        state.call = undefined;
      })),
  };
}
//@ chunk-s1cmamfh.js:16759-16808 placement
/**
 * 把 seed 标记为结束并解析结果。
 */
function resolveSeedDone(state, value) {
  state.isEnded = true;
  state.ended.resolve(value);
}
//@ chunk-s1cmamfh.js:16808-16856 placement
/**
 * 把 seed 标记为结束并带错误拒绝。
 */
function rejectSeedDone(state, error) {
  state.isEnded = true;
  state.ended.reject(error);
}
//@ chunk-s1cmamfh.js:16856-16927 placement
/**
 * 跟踪一个 seed promise，成功/失败都反映到结束状态。
 */
function trackSeedPromise(state, promise, written) {
  promise.then(
    (outcome) => {
      if (!homeSeedFailureKind(outcome)) resolveSeedDone(state, preferWrittenOutcome(written, outcome));
    },
    (error) => rejectSeedDone(state, error),
  );
}
//@ chunk-s1cmamfh.js:16927-17021 placement
/**
 * 保留更“有进展”的结果（优先已写入的）。
 */
function preferWrittenOutcome(next, current) {
  return next !== null && next.written !== null && current.written === null && current.outcome !== "raced"
    ? next
    : current;
}
//@ chunk-s1cmamfh.js:17021-17543 placement
async function forwardLatestPack(state, signal) {
  try {
    let latest = await state.latest;
    if (state.isEnded) return "done";
    let mayForward = await state.mayStillForwardNow().catch((error) => {
      logError(error);
      return false;
    });
    if (state.isEnded) return "done";
    if (!mayForward) {
      logEvent("tengu_home_seed_upload_no_longer_allowed", {
        trigger: fromEnum(state.packUpload.trigger),
        attempts_made: state.attemptsMade,
      });
      resolveSeedDone(state, latest);
      return "done";
    }
    if (signal.aborted) return buildSendFailure(latest);
    state.attemptsMade += 1;
    let upload = uploadSettingsPack(
      {
        ...state.packUpload,
        cut: signal,
      },
      state.attemptsMade,
    );
    trackSeedPromise(state, upload, latest);
    state.latest = upload.then((outcome) => preferWrittenOutcome(latest, outcome));
    state.latest.catch(() => {});
    let outcome = await upload;
    return homeSeedFailureKind(outcome) ? buildSendFailure(outcome) : "done";
  } catch (error) {
    rejectSeedDone(state, error);
    return "done";
  }
}
//@ chunk-s1cmamfh.js:17543-17727 placement
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
//@ chunk-s1cmamfh.js:17727-18027 placement
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
//@ chunk-s1cmamfh.js:18027-18593 placement
async function uploadSettingsPack(
  { sessionId, storageV5, plan, bound, trigger, signal, cut, getStoreClient, deadlineMs },
  input,
) {
  let now = Date.now();
  let afterFailedCreate =
    (input === 1 || trigger !== "create") && readHomeSeedRecord(sessionId)?.tried === true;
  let encoding = await sendSettingsPack(
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
    outcome: fromEnum(encoding.outcome),
    attempt: input,
    bytes: encoding.written?.pack.length ?? plan.pack.length,
    generation: encoding.generation,
    bound,
    row_standing: encoding.standing === true,
    allow_rules_cut: encoding.allowRulesCut ?? 0,
    allow_rules_recorded: readHomeSeedRecord(sessionId)?.allow.length ?? 0,
    after_failed_create: afterFailedCreate,
    cause: fromEnumOpt(encoding.cause),
    duration_ms: Date.now() - now,
  });
  return encoding;
}
//@ chunk-s1cmamfh.js:18593-18960 placement
function recordHomeSeedOutcome(
  status,
  { sessionId, plan, bound, trigger },
  { outcome, written, standing, allowRulesCut, cause },
) {
  logHomeSeedOutcome(classifyResendOutcome(outcome, cause), trigger, "");
  let homeSeedRecord = readHomeSeedRecord(sessionId);
  homeSeedResultSummary(
    status,
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
//@ chunk-s1cmamfh.js:18960-19142 placement
function describeKeptFiles(plan) {
  if (plan.kind === "none") return {};
  let kept = filesKeptForCredential(plan.leftBehind);
  let result = filesKeptAsLinks(plan.leftBehind);
  return {
    ...((kept.claudeMd || kept.others > 0) && {
      keptForCredential: kept,
    }),
    ...(result.names.length > 0 && {
      keptAsLinks: result,
    }),
  };
}
//@ chunk-s1cmamfh.js:19142-19305 placement
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
//@ chunk-s1cmamfh.js:19305-19637 placement
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
//@ chunk-s1cmamfh.js:19637-19956 placement
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
//@ chunk-s1cmamfh.js:19956-20294 placement
function logHomeSeedOutcome(plan, trigger, reason) {
  if (plan === null) return;
  let isCreate = trigger === "create";
  switch (plan.is) {
    case "ok":
      logFeatureOk("ccr_home_seed");
      if (isCreate) logFeatureOk("ccr_home_seed_create_upload");
      return;
    case "sad":
      logFeatureSad("ccr_home_seed", plan.code);
      if (isCreate) logFeatureSad("ccr_home_seed_create_upload", `${reason}${plan.code}`);
      return;
    case "bad":
      logFeatureBad("ccr_home_seed", plan.code);
      if (isCreate) logFeatureBad("ccr_home_seed_create_upload", `${reason}${plan.code}`);
      return;
  }
}
//@ chunk-s1cmamfh.js:20294-20940 placement
async function sendSettingsPack(getStoreClient, pack, trigger, context, signal, outerSignal, deadlineMs) {
  if (isAborted(signal))
    return {
      outcome: "aborted",
      generation: 0,
      written: null,
    };
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  signal?.addEventListener("abort", onAbort, {
    once: true,
  });
  outerSignal?.addEventListener("abort", onAbort, {
    once: true,
  });
  try {
    let result = await withDeadline(
      getStoreClient().then((client) =>
        resendSettingsPack(client, pack, trigger, context, abortController.signal),
      ),
      deadlineMs,
    );
    if (result === undefined || result.outcome === "aborted") {
      if (isAborted(signal))
        return {
          outcome: "aborted",
          generation: 0,
          written: null,
        };
      if (trigger === "create") {
        writeSeedRecord(context, pack, 1, undefined);
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
    return result;
  } finally {
    abortController.abort();
    signal?.removeEventListener("abort", onAbort);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}
//@ chunk-s1cmamfh.js:20940-21958 placement
async function resendSettingsPack(client, pack, trigger, context, signal) {
  if (trigger !== "create") {
    let homeSeedRecord = readHomeSeedRecord(context.sessionId);
    if (homeSeedRecord === undefined)
      return {
        outcome: "not_forwarded_at_create",
        generation: 0,
        written: null,
      };
    let storedRow = await client.getStoreRow(joined_5, signal);
    if (storedRow.kind !== "ok" && storedRow.kind !== "not_found")
      return {
        outcome: mapRowError(storedRow),
        generation: 0,
        written: null,
        standing: "unknown",
        ...storeErrorCause(storedRow),
      };
    let repacked = repackForResend(pack, homeSeedRecord);
    let recordGeneration = (generation) =>
      writeHomeSeedRecord(
        context.sessionId,
        {
          ...homeSeedRecord,
          generation,
          etag: undefined,
          at: Date.now(),
        },
        context.storageV5,
      );
    let result =
      storedRow.kind === "ok"
        ? await putMergedSettingsPack(client, repacked.pack, storedRow, signal, recordGeneration)
        : {
            ...(await putSettingsPack(
              client,
              bumpPackGeneration(repacked.pack, homeSeedRecord.generation),
              signal,
              recordGeneration,
            )),
            standing: "gone",
          };
    if (storedRow.kind === "not_found")
      logEvent("tengu_home_seed_stored_pack_gone", {
        outcome: fromEnum(result.outcome),
        generation: result.generation,
        record_generation: homeSeedRecord.generation,
        after_failed_create: homeSeedRecord.tried === true,
      });
    if (result.written !== null)
      writeHomeSeedRecord(
        context.sessionId,
        {
          ...homeSeedRecord,
          generation: result.generation,
          etag: result.etag,
          at: Date.now(),
        },
        context.storageV5,
      );
    return repacked.cut === 0
      ? result
      : {
          ...result,
          allowRulesCut: repacked.cut,
        };
  }
  let result = await putSettingsPack(
    client,
    {
      pack,
      generation: 1,
    },
    signal,
    async (generation) => {
      if (generation > 1) writeSeedRecord(context, pack, generation, undefined);
    },
  );
  if (result.written !== null) writeSeedRecord(context, result.written.pack, result.generation, result.etag);
  else if (result.outcome in HOME_SEED_FAILURE_TEXT)
    writeSeedRecord(context, pack, 1, undefined, {
      tried: true,
    });
  return result;
}
//@ chunk-s1cmamfh.js:21958-22383 placement
async function putSettingsPack(store, { pack, generation }, signal, onGeneration) {
  await onGeneration?.(generation);
  let uploadSignal = await store.putStoreRow(joined_5, pack, {
    signal,
  });
  if (uploadSignal.kind !== "conflict") {
    if (uploadSignal.kind !== "ok")
      return {
        outcome: storeRowOutcome(uploadSignal, "sent"),
        generation: 0,
        written: null,
        ...storeErrorCause(uploadSignal),
      };
    return {
      outcome: "sent",
      generation,
      written: {
        pack,
        generation,
      },
      etag: uploadSignal.etag,
    };
  }
  let result = await store.getStoreRow(joined_5, signal);
  if (result.kind !== "ok")
    return {
      outcome: mapRowError(result),
      generation: 0,
      written: null,
      standing: true,
      ...storeErrorCause(result),
    };
  return putMergedSettingsPack(store, pack, result, signal, onGeneration);
}
//@ chunk-s1cmamfh.js:22383-22559 placement
function writeSeedRecord(context, pack, generation, etag, extra = {}) {
  let decoded = decodeHomePack(pack);
  let allowRules = decoded.ok ? (allowedPermissions(decoded.pack.settings) ?? []) : [];
  writeHomeSeedRecord(
    context.sessionId,
    {
      generation,
      ...(etag !== undefined && {
        etag,
      }),
      ...extra,
      allow: allowRules.map(shortSha256),
      at: Date.now(),
    },
    context.storageV5,
  );
}
//@ chunk-s1cmamfh.js:22559-22991 placement
async function putMergedSettingsPack(client, currentPack, storedRow, signal, onGeneration) {
  let merged = mergePackGeneration(currentPack, storedRow.content);
  await onGeneration?.(merged.generation);
  let putResult = await client.putStoreRow(joined_5, merged.pack, {
    ifMatchSha256: storedRow.etag,
    signal,
  });
  let outcome =
    putResult.kind === "conflict"
      ? "raced"
      : storeRowOutcome(putResult, merged.unchanged ? "unchanged" : "conflict_resolved");
  return putResult.kind === "ok"
    ? {
        outcome,
        generation: merged.generation,
        written: {
          pack: merged.pack,
          generation: merged.generation,
        },
        standing: true,
        ...(putResult.etag !== undefined && {
          etag: putResult.etag,
        }),
      }
    : {
        outcome,
        generation: 0,
        written: null,
        standing: true,
        ...storeErrorCause(putResult),
      };
}
//@ chunk-s1cmamfh.js:22991-23318 placement
function storeErrorCause(error) {
  switch (error.kind) {
    case "lane_unavailable":
    case "unauthorized":
      return error.cause !== undefined
        ? {
            cause: error.cause,
          }
        : {};
    case "path_too_long":
    case "too_large":
      return {
        isRefusedAsSent: true,
      };
    case "failed":
      return error.status === undefined
        ? {}
        : {
            httpStatus: error.status,
            ...(error.status >= 400 &&
              error.status < 500 &&
              error.status !== 429 && {
                isRefusedAsSent: true,
              }),
          };
    default:
      return {};
  }
}
//@ chunk-s1cmamfh.js:23318-23866 placement
function repackForResend(packBytes, homeSeedRecord) {
  let decoded = decodeHomePack(packBytes);
  if (!decoded.ok) throw Error("the settings pack to re-send does not parse");
  if (decoded.pack.settings === null || decoded.pack.settings.permissions === undefined)
    return {
      pack: packBytes,
      cut: 0,
    };
  let parsed = permissionsAllowSchema().safeParse(decoded.pack.settings.permissions);
  if (!parsed.success) throw Error("the settings pack to re-send carries permissions of an unknown shape");
  let allow = parsed.data.allow;
  if (allow === undefined)
    return {
      pack: packBytes,
      cut: 0,
    };
  let carried = new Set(homeSeedRecord.allow);
  let rules = allow.filter((rule) => carried.has(shortSha256(rule)));
  let cut = allow.length - rules.length;
  return cut === 0
    ? {
        pack: packBytes,
        cut,
      }
    : {
        pack: encodeHomePack({
          ...decoded.pack,
          settings: withAllowRules(decoded.pack.settings, rules),
        }),
        cut,
      };
}
//@ chunk-s1cmamfh.js:23866-23910 placement
/**
 * 只含 allow 的 permissions schema。
 */
var permissionsAllowSchema = DoctorLazy(() =>
  looseObject({
    allow: array(stringSchema()).optional(),
  }),
);
//@ chunk-s1cmamfh.js:23910-23999 placement
/**
 * 取 settings 里 permissions.allow（没有时 undefined）。
 */
function allowedPermissions(settings) {
  let allow = permissionsAllowSchema().safeParse(settings?.permissions);
  return allow.success ? allow.data.allow : undefined;
}
//@ chunk-s1cmamfh.js:23999-24115 placement
function withAllowRules(settings, rules) {
  let parsed = permissionsAllowSchema().safeParse(settings.permissions);
  return {
    ...settings,
    permissions: {
      ...(parsed.success ? parsed.data : {}),
      allow: [...rules],
    },
  };
}
//@ chunk-s1cmamfh.js:24115-24381 placement
function mergePackGeneration(currentPack, bytes) {
  let current = decodeHomePack(currentPack);
  let incoming = decodeHomePack(bytes);
  if (current.ok && incoming.ok) {
    if (
      encodeHomePack({
        ...current.pack,
        generation: incoming.pack.generation,
      }).equals(bytes)
    )
      return {
        pack: bytes,
        generation: incoming.pack.generation,
        unchanged: true,
      };
  }
  if (bytes.equals(currentPack))
    return {
      pack: bytes,
      generation: 1,
      unchanged: true,
    };
  return {
    ...bumpPackGeneration(currentPack, readHomePackGeneration(bytes) ?? 0),
    unchanged: false,
  };
}
//@ chunk-s1cmamfh.js:24381-24528 placement
function bumpPackGeneration(pack, delta) {
  let decoded = decodeHomePack(pack);
  if (!decoded.ok)
    return {
      pack,
      generation: 1,
    };
  let generation = Math.min(delta + 1, MAX_PACK_GENERATION);
  return {
    pack: encodeHomePack({
      ...decoded.pack,
      generation,
    }),
    generation,
  };
}
//@ chunk-s1cmamfh.js:24528-24805 placement
function storeRowOutcome(row, value) {
  switch (row.kind) {
    case "ok":
      return value;
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
//@ chunk-s1cmamfh.js:24805-24993 placement
function mapRowError(error) {
  switch (error.kind) {
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
//@ chunk-s1cmamfh.js:24993-26768 placement
function homeSeedResultSummary(
  status,
  plan,
  outcome,
  { sessionId, trigger, bound, didCreateCarryAllowRules },
  standing,
  cutCount,
  cause,
) {
  let wayOut = outcome === "unavailable" && cause !== "device_key_unavailable" ? "" : START_NEW_SESSION_HINT;
  switch (outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved": {
      status.publish(
        outcome === "unchanged" && trigger !== "create"
          ? "Settings from this machine are already in this session"
          : formatHomeSeedSentLine({
              ...plan.description,
              permissionRules: plan.description.permissionRules - cutCount,
            }) + (bound ? "" : " (this session cannot run commands on this machine)"),
        "debug",
      );
      if (cutCount > 0)
        status.publish(
          `${cutCount} ${plural(cutCount, "permission allow rule")} ${cutCount === 1 ? "stays" : "stay"} on this machine, because ${cutCount === 1 ? "it was" : "they were"} not in the settings prepared when this cloud session was created; a new session takes ${cutCount === 1 ? "it" : "them"}`,
          "debug",
        );
      let leftBehindLine = formatHomeSeedLeftBehindLine(plan, {
        launch:
          trigger === "create"
            ? "create"
            : didCreateCarryAllowRules
              ? "reopen_sent"
              : "reopen_sent_no_allow_recorded",
        settingsFile: userSettingsDisplayPath(plan.configHome),
      });
      if (leftBehindLine !== null) status.publish(leftBehindLine, leftBehindSummary(plan));
      return;
    }
    case "aborted":
      return;
    case "deadline":
      status.publish(
        formatRulesNotInForce(standing, {
          ifNoneStood: RULES_MAY_NOT_BE_IN_FORCE,
          otherwise: "The cloud session may not have your latest settings",
          why: "sending your settings took too long",
          wayOut,
        }),
        "warning",
      );
      return;
    case "raced":
      status.publish(
        `${RULES_MAY_NOT_BE_IN_FORCE}: another launch of this session, or the session itself, wrote its settings first`,
        "warning",
      );
      return;
    case "not_forwarded_at_create":
      if (!claimOnce().claim(`home_seed_not_sent_again:${sessionIdBody(sessionId)}`)) return;
      status.publish(
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
      status.publish(
        formatRulesNotInForce(standing, {
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
//@ chunk-s1cmamfh.js:26768-27055 placement
function leftBehindSummary(plan) {
  let leftCount =
    plan.summary.overCap +
    plan.unreadable +
    countWhere(plan.leftBehind, (entry) => entry.reason === "undefusable");
  let settingsProblem =
    plan.settings === "schema_rejected" ||
    plan.settings === "settings_too_large" ||
    plan.settings === "settings_unreadable";
  let credentialRestrictions = plan.summary.droppedRules.credentialRestrictions > 0;
  return leftCount > 0 || settingsProblem || credentialRestrictions ? "warning" : "debug";
}
//@ chunk-s1cmamfh.js:27055-27105 placement
var START_NEW_SESSION_HINT = "; start a new cloud session to try again";
//@ chunk-s1cmamfh.js:27105-27153 placement (2.1.88 match: _temp5, 1)
function userSettingsDisplayPath(a_0) {
  return tildify(getSettingsFilePathForSource("userSettings") ?? a_0);
}
//@ chunk-s1cmamfh.js:27153-27270 placement
function formatRulesNotInForce(reason, { ifNoneStood, otherwise, why, wayOut }) {
  return reason === false
    ? `${ifNoneStood}: ${why}${wayOut}`
    : `${reason === "gone" ? RULES_MAY_NOT_BE_IN_FORCE : otherwise}: ${why}`;
}
export { runHomeSeed, leftBehindSummary, userSettingsDisplayPath, START_NEW_SESSION_HINT };
