/**
 * remote/tools/servedTools.ts
 *
 * 会话工具服务：图片重编码、结果大小、关闭原因（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-012rhzq5.js (29)
 * attribution: placement 29
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { parseSettingsFileUncached, getSettingsForSource } from "../../utils/settings/settings.js";
import { byteLengthOf, buildRemoteToolCallResult } from "./callResults.js";
import { compressImageBuffer } from "../../utils/imageResizer.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { logError } from "../../utils/log.js";
import { attestationFor, isBelowFloorEnforced } from "../../services/remoteTools/toolHostAttestation.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";
import {
  remoteToolServingOffReason as remoteToolServingOffReason_2,
  isPersonFixableOffReason,
  SERVING_MUTED_NOTICE_KEY,
  remoteToolVmRequired,
  SERVING_UNMUTED_NOTICE_KEY,
  onServingMuteRecheck,
  isSessionChannelDisabled,
} from "../../services/remoteTools/servingGates.js";
import { launchLocationFacts } from "../../services/remoteTools/launchLocation.js";
import {
  SERVED_BASH_LAUNCHED_FROM_HOME,
  SERVED_BASH_FROM_HOME_NOTICE,
} from "../../utils/hooks/servedHooks/notices.js";
import {
  PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
  onWindowsProfileDirsSettled,
  primeWindowsProfileDirs,
  pendingWindowsProfileDirsRead,
} from "../../services/remoteTools/windowsProfileDirs.js";
import { SERVED_MOUNT_TABLE_UNREADABLE } from "../../utils/wslMounts.js";
import { createServingKit, announcedToolFor } from "./serve/createServingKit.js";
import {
  createConcurrencyLimiter,
  DEFAULT_MAX_IN_FLIGHT,
} from "../../services/remoteTools/remoteToolAdmission.js";
import { servableTools } from "./serve/serveCall.js";
import { createSignal } from "../../utils/signal.js";
import { withDeadline } from "../../utils/sleep.js";
import { isRepositoryTrustUnresolved } from "./repositoryTrust.js";
import { SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO, SERVED_CALLS_UNATTESTED } from "./toolHostsNotice.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { callerKey } from "./serve/servedShellSettings.js";
import { withdrawAskedCall } from "./serve/pendingAsks.js";
import { withdrawnRequestMessage, unattestedSenderMessage } from "../../services/remoteTools/hostRefusals.js";
import { serveRemoteToolCall } from "./serve/callAdmission.js";
import { NOT_HELD_LEASE } from "../../services/remoteTools/lease.js";
import { servedAnswerLimitBytes, replayedFields } from "../../services/remoteTools/servedAnswerSize.js";
import { readCallResult } from "./toolDescriptors.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import {
  isViolinWillowEnabledCached,
  VIOLIN_WILLOW_FLAG,
  isCloudClientToolServingAnsweredOn,
  getToolServingFlagAnsweredOff,
} from "../../services/analytics/violinWillowGate.js";
import { primeWindowsPlatform, isWindowsOrPowerShellHost } from "../../utils/platformWindows.js";
import { getDeviceBindingRefusal } from "../../bridge/deviceBindingPolicy.js";
import { onComplianceTaintsChanged } from "../../services/policyLimits/complianceTaints.js";

//@ chunk-012rhzq5.js:15691-15767 placement
function isViolinFinetunerEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_finetuner", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-012rhzq5.js:15767-15840 placement = _temp7 (1)
function backgroundSwitchedOffStub(
  e = (r, s) => parseSettingsFileUncached(r, undefined, s),
  o = () => getSettingsForSource("policySettings"),
) {
  return false;
}
//@ chunk-012rhzq5.js:15840-15865 placement
/**
 * 服务结果图片重编码的参数：最多 4 轮、每轮目标压缩到 9 成、小于 16 KB 的图片不再处理。
 */
var MAX_IMAGE_REENCODE_ROUNDS = 4;
var IMAGE_SHRINK_RATIO = 0.9;
var MIN_IMAGE_BYTES_FOR_REENCODE = 16384;
//@ chunk-012rhzq5.js:15865-16667 placement
async function reencodeServedImage(result, o) {
  let r = byteLengthOf(result);
  if (r <= o) return result;
  let s = new Map();
  countImageCopies(result, s);
  let f = result;
  for (let i = 0; i < MAX_IMAGE_REENCODE_ROUNDS && r > o; i++) {
    let filtered = [...s].filter(([, y]) => base64ByteLength(y.now.data) > MIN_IMAGE_BYTES_FOR_REENCODE);
    let reduced = filtered.reduce((acc, [, h]) => acc + h.copies * h.now.data.length, 0);
    if (reduced === 0) break;
    let p = Math.max(0, 1 - (r - o) / reduced) * IMAGE_SHRINK_RATIO;
    for (let [y, h] of filtered) {
      let max = Math.max(MIN_IMAGE_BYTES_FOR_REENCODE, Math.floor(base64ByteLength(h.now.data) * p));
      try {
        let C = await compressImageBuffer(Buffer.from(y, "base64"), max, h.now.mediaType);
        if (base64ByteLength(C.base64) >= MIN_IMAGE_BYTES_FOR_REENCODE && C.base64.length < h.now.data.length)
          s.set(y, {
            copies: h.copies,
            now: {
              data: C.base64,
              mediaType: C.mediaType,
            },
          });
      } catch (error) {
        logForDebugging(
          `session serving: re-encoding a served image to fit the channel failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    }
    let mcpResultImages = resolveMcpResultImages(result, new Map([...s].map(([y, h]) => [y, h.now])));
    let M = byteLengthOf(mcpResultImages);
    if (M >= r) break;
    f = mcpResultImages;
    r = M;
  }
  if (f !== result)
    logForDebugging(`session serving: served image(s) re-encoded, answer now ${r} bytes (limit ${o})`);
  return f;
}
//@ chunk-012rhzq5.js:16667-16714 placement
function base64ByteLength(e) {
  return Math.floor((e.length * 3) / 4);
}
//@ chunk-012rhzq5.js:16714-17006 placement = buildImageToolResult (0.905)
/**
 * （切分错误）从 image 块（MCP 的 data/mimeType 或 Anthropic 的 base64 source）取 {data, mediaType}。
 */
function extractImageData(e) {
  if (e.type !== "image") return;
  if (typeof e.data === "string" && typeof e.mimeType === "string")
    return {
      data: e.data,
      mediaType: e.mimeType,
    };
  let source = e.source;
  if (
    isObjectLike(source) &&
    source.type === "base64" &&
    typeof source.data === "string" &&
    typeof source.media_type === "string"
  )
    return {
      data: source.data,
      mediaType: source.media_type,
    };
  return;
}
//@ chunk-012rhzq5.js:17006-17223 placement
/**
 * （切分错误）递归统计对象中每张图片 data 出现的次数。
 */
function countImageCopies(e, o) {
  if (Array.isArray(e)) {
    e.forEach((s) => countImageCopies(s, o));
    return;
  }
  if (!isObjectLike(e)) return;
  let imageData = extractImageData(e);
  if (imageData !== undefined) {
    o.set(imageData.data, {
      copies: (o.get(imageData.data)?.copies ?? 0) + 1,
      now: imageData,
    });
    return;
  }
  Object.values(e).forEach((s) => countImageCopies(s, o));
}
//@ chunk-012rhzq5.js:17223-17535 placement
/**
 * 把 MCP 工具结果中引用的图片数据按映射表替换为真实数据与 mimeType（含 structuredContent/_meta 深层）。
 */
function resolveMcpResultImages(result, imagesByRef) {
  let content = result.content.map((s) => {
    let f = s.type === "image" ? imagesByRef.get(s.data) : undefined;
    return s.type === "image" && f !== undefined
      ? {
          ...s,
          data: f.data,
          mimeType: f.mediaType,
        }
      : s;
  });
  return {
    ...result,
    content,
    ...(result.structuredContent !== undefined && {
      structuredContent: resolveImagesDeep(result.structuredContent, imagesByRef),
    }),
    ...(result._meta !== undefined && {
      _meta: resolveImagesDeep(result._meta, imagesByRef),
    }),
  };
}
//@ chunk-012rhzq5.js:17535-17578 placement
function resolveImagesDeep(e, imagesByRef) {
  return xr(e, (r) => resolveImageBlockDeep(r, imagesByRef));
}
//@ chunk-012rhzq5.js:17578-17873 placement = normalizeImageBlocks (0.869)
function resolveImageBlockDeep(value, imagesByRef) {
  if (Array.isArray(value)) return value.map((block) => resolveImageBlockDeep(block, imagesByRef));
  if (!isObjectLike(value)) return value;
  let imageData = extractImageData(value);
  let mediaType = imageData === undefined ? undefined : imagesByRef.get(imageData.data);
  if (mediaType !== undefined)
    return typeof value.data === "string"
      ? {
          ...value,
          data: mediaType.data,
          mimeType: mediaType.mediaType,
        }
      : {
          ...value,
          source: {
            type: "base64",
            media_type: mediaType.mediaType,
            data: mediaType.data,
          },
        };
  return resolveImagesDeep(value, imagesByRef);
}
//@ chunk-012rhzq5.js:17873-17925 placement
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-012rhzq5.js:17925-18000 placement
var DEFAULT_CALL_AGE_WINDOW_MS = 30000;
var BACKGROUND_WATCH_INTERVAL_MS = 5000;
var BACKGROUND_BOUND_RECHECK_MS = 20000;
var OUTCOME_QUERY_AGE_WINDOW_MS = 5000;
var NOT_SERVED_HERE_TEXT = "not served here";
var REPOSITORY_TRUST_WAIT_MS = 3000;
var PLUMBING_CALL_AGE_WINDOW_MS = 5000;
//@ chunk-012rhzq5.js:18000-18392 placement
/**
 * 上报远程 plumbing 调用遥测：结果、名称哈希、请求 id 哈希等。
 */
function logPlumbingCallTelemetry(e, o, requestId, s) {
  try {
    logEvent("tengu_remote_plumbing_call", {
      transport: lit("session"),
      outcome: fromEnum(e.outcome),
      ...(e.outcome === "stale" && {
        dated: e.dated,
      }),
      name_hash: shortHash(o.name),
      ...(typeof requestId === "string" && {
        request_id_hash: shortHash(requestId),
      }),
      ...(s !== undefined && {
        attestation_mode: fromEnum(s.mode),
        request_attestation: fromEnum(s.status),
        attestation_verdict: fromEnum(s.verdict),
      }),
    });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "session serving: logging a plumbing call threw"));
  }
}
//@ chunk-012rhzq5.js:18392-18517 placement
function safeJudgeSender(attestationStatus) {
  try {
    return attestationFor(attestationStatus);
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "session serving: judging the sender of a plumbing call threw"),
    );
    return;
  }
}
//@ chunk-012rhzq5.js:18517-18812 placement
function unattestedConsentText(e) {
  switch (e) {
    case "nothing_to_mark":
    case "not_marked":
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested_untrusted_repo.not_marked"];
    case "declined":
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested_untrusted_repo"];
    case undefined:
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested"];
  }
}
//@ chunk-012rhzq5.js:18812-26945 placement
/**
 * 会话工具服务：在 tengu_remote_tool_serving 开启时为云会话提供本机工具
 */
var createSessionToolServing = (e) => {
  let o = () =>
    "offReason" in e
      ? typeof e.offReason === "function"
        ? e.offReason()
        : e.offReason
      : remoteToolServingOffReason_2(e.cwd);
  let r = o();
  let s = r;
  let f = false;
  let S = () => f || s !== undefined;
  let w = r === "launched_from_home";
  if (r !== undefined)
    logEvent("tengu_remote_tool_serving", {
      event: lit("gate_off"),
      served_tool_count: 0,
      reason: fromEnum(r),
      ...launchLocationFacts(r, e.cwd),
      transport: lit("session"),
    });
  let m = () => {
    try {
      return e.owner();
    } catch (error) {
      logForDebugging("session serving: the owner test threw; this client serves as a viewer", {
        level: "error",
      });
      logError(toError(error));
      return {
        owner: false,
      };
    }
  };
  let p = (n, i) => {
    try {
      e.onNotice?.(n, i);
    } catch (error) {
      logError(toError(error));
    }
  };
  let E = false;
  let M = (n) => {
    if (E || !m().owner) return;
    E = true;
    if (isPersonFixableOffReason(n)) p(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
    if (n === "muted") p(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
  };
  M(r);
  let y = false;
  let h = (n) => {
    if (!y && n === "profile_dirs_unreadable" && m().owner) {
      y = true;
      p(PROFILE_DIRS_UNREADABLE_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.profile_dirs_unreadable"]);
    }
  };
  h(r);
  let x = false;
  let C = (n) => {
    if (!x && n === "mount_table_unreadable" && m().owner) {
      x = true;
      p(SERVED_MOUNT_TABLE_UNREADABLE, REMOTE_TOOLS_CONSENT_TEXT["serving_off.mount_table_unreadable"]);
    }
  };
  C(r);
  let L = () => {
    let servingKit = createServingKit({
      sessionId: e.sessionId,
      limiter: createConcurrencyLimiter(DEFAULT_MAX_IN_FLIGHT),
      getDeviceId: () => {
        let u = m();
        return u.owner ? u.deviceId : undefined;
      },
      onNotice: p,
      ...(e.cwd !== undefined && {
        launchDir: e.cwd,
      }),
      ...(e.tools !== undefined && {
        tools: e.tools,
      }),
      ...(e.policy !== undefined && {
        policy: e.policy,
      }),
      sandboxRequiredNow: remoteToolVmRequired,
    });
    let i = servingKit.onRedescribed(I);
    return {
      kit: servingKit,
      source: undefined,
      nativeTools: servableTools(servingKit.deps).map((u) =>
        announcedToolFor(u, servingKit.deps, servingKit.description),
      ),
      release: () => {
        i();
        servingKit.dispose();
      },
    };
  };
  let k = (n) => {
    let i = n.source.subscribe((T) => {
      if (W() !== Y) H(T);
    });
    let u = n.kit.onRedescribed(I);
    return {
      kit: n.kit,
      source: n.source,
      nativeTools: [],
      release: () => {
        u();
        i();
      },
    };
  };
  let I = () => {
    if (!R && P && W() !== Y) H("redescribed");
  };
  let P = e.serving === undefined;
  let g = e.serving === undefined ? L() : undefined;
  let V = false;
  let answerDeduper = createAnswerDeduper();
  let R = false;
  let signal = createSignal();
  let me = (n) => !R && g !== undefined && !S() && n.instance_id === e.instanceId && m().owner;
  let pe = new Set();
  let Fe = async () => {
    let repositoryTrust = e.repositoryTrust;
    if (repositoryTrust === undefined) return;
    let i = await withDeadline(
      Promise.resolve()
        .then(repositoryTrust)
        .catch(() => {
          return;
        }),
      REPOSITORY_TRUST_WAIT_MS,
    );
    let u = isRepositoryTrustUnresolved(i) ? i : undefined;
    let T = u !== undefined ? SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO : SERVED_CALLS_UNATTESTED;
    if (!pe.has(T)) {
      pe.add(T);
      p(T, unattestedConsentText(u));
    }
    return u;
  };
  let ve = (n, ageMs, u) => ageMs !== undefined && ageMs <= n.deadline_ms + u;
  let _e = (n) => n.request.ok && n.request.kind === "call" && n.request.value.approval === undefined;
  function he() {
    if (R || g === undefined || !m().owner) return;
    return !S()
      ? {
          host: g.kit.description,
          tools: g.source?.native() ?? g.nativeTools,
          passthrough: g.source?.passthrough() ?? [],
          plumbing: e.plumbing?.names() ?? [],
        }
      : {
          host: g.kit.description,
          tools: [],
          passthrough: [],
          plumbing: [],
        };
  }
  let W = () => jsonStringify(he() ?? null);
  function H(n) {
    Y = W();
    try {
      signal.emit(n);
    } catch (error) {
      logForDebugging("session serving: a served-tools listener threw", {
        level: "error",
      });
      logError(toError(error));
    }
  }
  let Y = W();
  let Ue = (n) => {
    logForDebugging(
      "session serving: the device registration handed over nothing usable; serving without it",
      {
        level: "warn",
      },
    );
    logError(toError(n));
    if (!R) {
      g = L();
      V = false;
    }
  };
  e.serving
    ?.then((n) => {
      if (R) return;
      g = n === undefined ? L() : k(n);
      V = n !== undefined;
    })
    .catch(Ue)
    .then(() => {
      if (!R) {
        P = true;
        H("adopted");
      }
    })
    .catch((error) => logError(toError(error)));
  let Z = () => {
    let n = g?.kit.deps.sessions.peek(
      callerKey({
        sessionId: e.sessionId,
      }),
    );
    if (g === undefined || n === undefined) return;
    for (let i of n.pendingAsks.list())
      if (i.raisedOver === "session")
        withdrawAskedCall(n, i.askId, {
          reason: "host_unbound",
          message: withdrawnRequestMessage({
            targetName: g.kit.description.name,
            reason: "host_unbound",
          }),
        });
  };
  let We = () =>
    g?.kit.deps.sessions.peek(
      callerKey({
        sessionId: e.sessionId,
      }),
    );
  let q = () => We()?.backgroundShells;
  let G = (n) => {
    q()?.stopAll(n);
  };
  let ee = (n) => {
    try {
      n();
    } catch (error) {
      logError(toError(error));
    }
  };
  let He = (n, i) =>
    ee(() =>
      logEvent("tengu_remote_tool_serving", {
        ...(n === undefined
          ? {
              event: lit("gate_on_reread"),
            }
          : {
              event: lit("gate_off_reread"),
              served_tool_count: 0,
              reason: fromEnum(n),
              ...launchLocationFacts(n, e.cwd),
            }),
        previous_reason: fromEnum(i),
        owner: m().owner,
        transport: lit("session"),
      }),
    );
  let $e = (n) => {
    f = true;
    [
      () => {
        if (!n)
          logEvent("tengu_remote_tool_serving", {
            event: lit("serving_check_failed"),
          });
      },
      () => G("serving_check_failed"),
      Z,
      () => {
        if (W() !== Y) H();
      },
    ].forEach(ee);
  };
  let ne = () => !R && (q()?.running ?? 0) > 0;
  let K = new Set();
  let oe = () => ne() || (!R && K.size > 0 && isViolinFinetunerEnabled());
  let Se = () => {
    if (e.stillBound === undefined || !oe()) return;
    e.stillBound()
      .then((n) => {
        if (n !== false) return;
        let running = q()?.running ?? 0;
        G("serving_ended");
        if (!isViolinFinetunerEnabled()) return;
        let u = [...K];
        K.clear();
        for (let T of u) T.abort();
        Z();
        if (u.length + running > 0)
          logEvent("tengu_remote_tool_serving", {
            event: lit("session_no_longer_served"),
            running_calls: u.length,
            background_commands: running,
          });
      })
      .catch((error) => logError(toError(error)));
  };
  let j;
  let te = 0;
  let backgroundSwitchedOff = e.backgroundSwitchedOff ?? backgroundSwitchedOffStub;
  let Re = () => {
    if (j !== undefined || !oe()) return;
    te = Date.now();
    j = setInterval(() => {
      if (!oe()) {
        clearInterval(j);
        j = undefined;
        return;
      }
      if (ne()) {
        if (backgroundSwitchedOff()) G("serving_off");
        we.reevaluate();
      }
      if (Date.now() - te >= (e.backgroundBoundRecheckMs ?? BACKGROUND_BOUND_RECHECK_MS)) {
        te = Date.now();
        Se();
      }
    }, e.backgroundWatchMs ?? BACKGROUND_WATCH_INTERVAL_MS);
    j.unref();
  };
  let je = (n) => {
    let backgroundShells = n.policy.backgroundShells;
    return backgroundShells === undefined
      ? n
      : {
          ...n,
          policy: {
            ...n.policy,
            backgroundShells: {
              ...backgroundShells,
              enabled: () =>
                e.stillBound !== undefined && backgroundShells.enabled() && !backgroundSwitchedOff(),
            },
          },
        };
  };
  let we = {
    sessionId: e.sessionId,
    instanceId: e.instanceId,
    serveSessionToolCall: async (
      n,
      { signal, requestId, ageMs, workerEpoch, attestationStatus, modeStamp },
    ) => {
      let D = g;
      if (D === undefined || !me(n)) return;
      let { kit } = D;
      let A = attestationFor(attestationStatus);
      let X =
        n.request.ok && n.request.kind === "call"
          ? kit.deps.sessions
              .peek(
                callerKey({
                  sessionId: e.sessionId,
                }),
              )
              ?.calls.lookup(n.request.value.call_id)
          : undefined;
      let Ve =
        n.request.ok &&
        (n.request.kind === "outcome_query" ||
          (_e(n) ? X !== undefined : X !== undefined && X.summary.state !== "asked"));
      let Te = _e(n) ? OUTCOME_QUERY_AGE_WINDOW_MS : DEFAULT_CALL_AGE_WINDOW_MS;
      let stale =
        Ve || ve(n, ageMs, Te)
          ? undefined
          : {
              ageMs,
              windowMs: n.deadline_ms + Te,
            };
      let ke = isBelowFloorEnforced(A);
      let untrustedRepositories = ke ? await Fe() : undefined;
      let Oe = D.source?.localNameFor(n.name);
      let [Je, Xe] = Oe !== undefined ? [Oe, kit.deps] : [n.name, stripServingDeps(kit.deps)];
      let Ee = (signal) =>
        serveRemoteToolCall(
          Je,
          {
            ...n.input,
          },
          n.request,
          {
            sessionId: e.sessionId,
            signal,
            workerEpoch,
          },
          je(Xe),
          "session",
          {
            stale,
            attestation: A,
            unattested: ke,
            untrustedRepositories,
            modeStamp,
          },
        )
          .then((se) => {
            Re();
            return checkReencodedResultSize(kit.description, n.tool_use_id, se);
          })
          .catch((error) => internalErrorCallResult(kit.description, n.tool_use_id, error));
      return answerDeduper.answer(requestId, async () => {
        if (!isViolinFinetunerEnabled())
          return {
            result: await Ee(signal),
          };
        let abortController = new AbortController();
        K.add(abortController);
        Re();
        try {
          return {
            result: await Ee(AbortSignal.any([signal, abortController.signal])),
          };
        } finally {
          K.delete(abortController);
        }
      });
    },
    servePlumbingCall: async (n, { signal, requestId, ageMs, attestationStatus }) => {
      let plumbing = e.plumbing;
      let re = plumbing !== undefined && plumbing.names().includes(n.name);
      if (!me(n)) return;
      let D = (A, X) => logPlumbingCallTelemetry(A, n, requestId, X);
      if (!re || plumbing === undefined)
        return answerDeduper.answer(requestId, async () => {
          D(
            {
              outcome: "not_served",
            },
            safeJudgeSender(attestationStatus),
          );
          return {
            result: errorTextResult(`${n.name}: ${NOT_SERVED_HERE_TEXT}`),
          };
        });
      if (!ve(n, ageMs, PLUMBING_CALL_AGE_WINDOW_MS)) {
        logForDebugging(
          ageMs === undefined
            ? `[remote-tools] a ${n.name} plumbing call could not be dated against the service clock (no Date header on this stream) and was not served`
            : `[remote-tools] a ${n.name} plumbing call delivered ${ageMs} ms after it was stored, past its ${n.deadline_ms} ms window, was not served`,
        );
        D(
          {
            outcome: "stale",
            dated: ageMs !== undefined,
          },
          safeJudgeSender(attestationStatus),
        );
        return;
      }
      let O = attestationFor(attestationStatus);
      if (O !== undefined && isBelowFloorEnforced(O))
        return answerDeduper.answer(requestId, async () => {
          D(
            {
              outcome: "held_back",
            },
            O,
          );
          let text = `${n.name}: ${unattestedSenderMessage({
            targetName: g?.kit.description.name ?? n.host,
            status: O.status,
            subtype: "remote_plumbing_call",
          })}`;
          return {
            result: plumbing.heldBack(n.name, text) ?? errorTextResult(text),
          };
        });
      return answerDeduper.answer(requestId, () =>
        Promise.resolve()
          .then(() => {
            g?.kit.ensureSettingsHeld();
            return plumbing.serve(n, signal);
          })
          .then((A) => {
            D(
              {
                outcome: "served",
              },
              O,
            );
            return A;
          })
          .catch((error) => {
            logError(withTelemetryMessage(toError(error), `session serving: plumbing call ${n.name} threw`));
            D(
              {
                outcome: "threw",
              },
              O,
            );
            return {
              result: errorTextResult(`${n.name}: could not be served (internal error)`),
            };
          }),
      );
    },
    answerProbe: () =>
      g === undefined
        ? undefined
        : {
            result: {
              epoch: g.kit.deps.sessions.epoch,
            },
          },
    servedTools: he,
    onServedToolsChanged: (n) => signal.subscribe(n),
    reevaluate: () => {
      if (R) return;
      let n = f;
      try {
        let i = o();
        f = false;
        let u = s;
        w ||= i === "launched_from_home";
        s = w && i === undefined ? "launched_from_home" : i;
        if (s !== u) He(s, n ? "serving_check_failed" : (u ?? "none"));
        h(i);
        C(i);
        if (!E) M(s);
        else if (m().owner) {
          if (s === "muted" && u !== "muted")
            p(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
          else if (u === "muted" && s === undefined)
            p(SERVING_UNMUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_on.unmuted"]);
          else if (
            (u === "muted" ||
              u === "profile_dirs_unread" ||
              u === "profile_dirs_unreadable" ||
              u === "mount_table_unreadable") &&
            isPersonFixableOffReason(s)
          )
            p(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
        }
        if (s !== undefined || !m().owner) {
          G(s !== undefined ? "serving_off" : "serving_ended");
          Z();
        }
        if (W() !== Y) H();
        if (n)
          ee(() =>
            logEvent("tengu_remote_tool_serving", {
              event: lit("serving_check_recovered"),
            }),
          );
      } catch (error) {
        logError(toError(error));
        $e(n);
      }
    },
    heldServedCall: (n) =>
      R || g === undefined || S() || !m().owner ? NOT_HELD_LEASE : g.kit.heldServedCall(n),
    noteUnlistedKind: (n) => {
      if (R || g === undefined || !m().owner) return;
      g.kit.deps.callLog?.note({
        t: "refused_request",
        caller: callerKey({
          sessionId: e.sessionId,
        }),
        what: "kind",
        length: n.length,
        name_hash: n.hash,
        variant_of_listed: n.variantOfListed,
      });
    },
    announcesPassthrough: () => V,
    dispose: () => {
      if (R) return;
      G("serving_ended");
      R = true;
      clearInterval(j);
      g?.release();
      H();
      signal.clear();
    },
    workerGone: Se,
    hasBackgroundWork: ne,
  };
  return we;
};
var buildAnnouncePayload = (e, instanceId, r) => ({
  instance_id: instanceId,
  ...(r !== undefined && {
    worker_epoch: r,
  }),
  host: e.host,
  tools: e.tools,
  passthrough: e.passthrough ?? [],
  plumbing: e.plumbing,
});
//@ chunk-012rhzq5.js:26945-27016 placement
function stripServingDeps({ servedMcpTools, servedMcpWireArguments, ...r }) {
  return r;
}
//@ chunk-012rhzq5.js:27016-27186 placement
function createAnswerDeduper() {
  let e = new Map();
  return {
    answer: (o, r) => {
      if (o === undefined) return r();
      let s = e.get(o);
      if (s !== undefined) return s;
      let f = r().finally(() => e.delete(o));
      e.set(o, f);
      return f;
    },
  };
}
//@ chunk-012rhzq5.js:27186-27250 placement
async function checkReencodedResultSize(description, callId, r) {
  return checkServedResultSize(
    description,
    callId,
    await reencodeServedImage(withCallIdInEnvelope(callId, r), servedAnswerLimitBytes()),
  );
}
//@ chunk-012rhzq5.js:27250-27434 placement
function withCallIdInEnvelope(callId, o) {
  let callResult = readCallResult(o);
  if (callResult.envelope.status !== "present" || callResult.envelope.envelope.call_id !== undefined)
    return o;
  return buildRemoteToolCallResult({
    envelope: {
      ...callResult.envelope.envelope,
      call_id: callId,
    },
    content: callResult.content,
  });
}
//@ chunk-012rhzq5.js:27434-28148 placement
function checkServedResultSize(e, callId, r) {
  let s = byteLengthOf(r);
  let f = servedAnswerLimitBytes();
  if (s <= f) return r;
  let callResult = readCallResult(r);
  let envelope = callResult.envelope.status === "present" ? callResult.envelope.envelope : undefined;
  let m = `(${formatMegabytes(s)}) is larger than this session can carry back (limit ${formatMegabytes(f)}), so it was not returned.`;
  let p =
    envelope?.outcome === "completed"
      ? `The command ran to completion on ${e.name}, but its result ${m} Its effects stand \u2014 do not re-run it to see the output; run a narrower command instead (head or tail, a filter, or write to a file and read part of it).`
      : `${e.name} answered this call, but the answer ${m}`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: callId,
      target: {
        name: e.name,
        working_dir: e.working_dir,
      },
      code: "tool_error",
      message: p,
      ...(envelope !== undefined && replayedFields(envelope)),
    },
    content: [
      {
        type: "text",
        text: p,
      },
    ],
  });
}
//@ chunk-012rhzq5.js:28148-28213 placement
function errorTextResult(text) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    isError: true,
  };
}
//@ chunk-012rhzq5.js:28213-28265 placement
function formatMegabytes(e) {
  return `${(e / 1048576).toFixed(1)} MB`;
}
//@ chunk-012rhzq5.js:28265-28611 placement
/**
 * 服务调用抛异常时构造内部错误结果，并记录调试日志与错误。
 */
function internalErrorCallResult(description, toolUseId, error) {
  logForDebugging(`session serving: served call ${toolUseId} threw`, {
    level: "error",
  });
  logError(toError(error));
  let s = `${description.name} could not serve this call (internal error); nothing is known to have run.`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: toolUseId,
      target: {
        name: description.name,
        working_dir: description.working_dir,
      },
      code: "internal_error",
      message: s,
    },
    content: [
      {
        type: "text",
        text: s,
      },
    ],
  });
}
//@ chunk-012rhzq5.js:28611-30566 placement
function remoteToolServingOffReason({
  owner,
  cloudClient,
  deviceBridge,
  onNotice,
  repositoryTrust,
  plumbing,
  signals,
  stillBound,
}) {
  let p = deviceBindingOffReason() ?? (isViolinWoodEnabledCached() ? undefined : "flag_off");
  let E = p === undefined && cloudClient && !isViolinWillowEnabledCached();
  if (E)
    logEvent("tengu_remote_tool_serving", {
      event: lit("gate_off"),
      served_tool_count: 0,
      reason: lit("flag_off"),
      flag: fromEnum(VIOLIN_WILLOW_FLAG),
      own_flags_loaded: hasFreshGrowthBookFeatures(),
      transport: lit("session"),
    });
  if (p !== undefined || E) {
    logForDebugging(
      `[servedTools] not served over the session channel: ${p ?? `flag_off (${VIOLIN_WILLOW_FLAG})`}`,
    );
    return;
  }
  let M = watchServingRevocation(cloudClient, signals);
  let y = !cloudClient;
  let h;
  let x = () => {
    if (!y && isCloudClientToolServingAnsweredOn()) {
      y = true;
      if (h !== undefined)
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_answered_on"),
          held_ms: Math.round(performance.now() - h),
          transport: lit("session"),
        });
    }
    return y;
  };
  let C;
  let L = (k, owner) => {
    let sessionToolServing = createSessionToolServing({
      ...k,
      owner: ownerUnlessServingOff(owner, cloudClient, x),
      ...(deviceBridge && {
        serving: deviceBridge.serving,
      }),
      ...(plumbing && {
        plumbing,
      }),
      ...(repositoryTrust && {
        repositoryTrust: () => repositoryTrust.refresh(),
      }),
      ...(stillBound && {
        stillBound,
      }),
    });
    C = sessionToolServing;
    if (!x() && h === undefined && servingOffReasonNow(cloudClient) === undefined && owner().owner) {
      h = performance.now();
      logForDebugging(
        "[servedTools] held: tool serving's flag is saved on, and the flag service has not answered this process yet",
      );
      logEvent("tengu_remote_tool_serving", {
        event: lit("own_flag_unanswered"),
        served_tool_count: 0,
        transport: lit("session"),
      });
    }
    let g = M((R) => {
      let flag = fromEnumOpt(
        getToolServingFlagAnsweredOff({
          cloudClient,
        }),
      );
      if (h !== undefined && !y && R === "flag_off")
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_answered_off"),
          flag,
          held_ms: Math.round(performance.now() - h),
          transport: lit("session"),
        });
      else if (cloudClient && y && R === "flag_off" && owner().owner)
        logEvent("tengu_remote_tool_serving", {
          event: lit("own_flag_turned_off"),
          flag,
          transport: lit("session"),
        });
      sessionToolServing.reevaluate();
    });
    let V = (signals?.onMuteRecheck ?? onServingMuteRecheck)(() => sessionToolServing.reevaluate());
    let F = onWindowsProfileDirsSettled(() => sessionToolServing.reevaluate());
    return {
      ...sessionToolServing,
      dispose: () => {
        F();
        V();
        g();
        sessionToolServing.dispose();
      },
    };
  };
  return {
    createServingContext:
      owner instanceof Promise
        ? async (k) => {
            await primeWindowsProfileDirs();
            await primeWindowsPlatform();
            return L(k, await owner);
          }
        : (k) => {
            let I =
              pendingWindowsProfileDirsRead() ??
              (isWindowsOrPowerShellHost() ? undefined : primeWindowsPlatform());
            return I === undefined
              ? L(k, owner)
              : I.then(() => primeWindowsPlatform()).then(() => L(k, owner));
          },
    buildAnnounce: buildAnnouncePayload,
    ...(deviceBridge && {
      onAnnounceOutcome: (k) =>
        deviceBridge.announceSettled(
          k.kind === "announced" && C?.announcesPassthrough?.() !== true
            ? {
                kind: k.kind,
                status: k.status,
              }
            : k,
        ),
    }),
    ...(onNotice && {
      onNotice,
    }),
    onRevoked: M,
  };
}
//@ chunk-012rhzq5.js:30566-30622 placement
/**
 * 导出函数 `deviceBindingOffReason`：返回 getDeviceBindingRefusal() ?? (isSessionChannelDisabled() ? "channel_off" : void 0)。
 */
function deviceBindingOffReason() {
  return getDeviceBindingRefusal() ?? (isSessionChannelDisabled() ? "channel_off" : undefined);
}
//@ chunk-012rhzq5.js:30622-30701 placement
function servingOffReasonNow(cloudClient) {
  return (
    getDeviceBindingRefusal() ??
    (getToolServingFlagAnsweredOff({
      cloudClient,
    }) === undefined
      ? undefined
      : "flag_off")
  );
}
//@ chunk-012rhzq5.js:30701-31007 placement
/**
 * 监听合规与开关变化，必要时撤销会话服务。
 */
function watchServingRevocation(
  cloudClient,
  { onEgressChange: o = onComplianceTaintsChanged, onGateChange: r = onGrowthBookRefresh } = {},
) {
  return (s) => {
    let f = false;
    let S = [];
    let w = () => {
      f = true;
      S.splice(0).forEach((p) => p());
    };
    let m = () => {
      let p = servingOffReasonNow(cloudClient);
      if (f || p === undefined) return;
      w();
      try {
        s(p);
      } catch (error) {
        logForDebugging(`[servedTools] a revocation listener threw: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    };
    S.push(o(m));
    S.push(r(m));
    m();
    return w;
  };
}
//@ chunk-012rhzq5.js:31007-31071 placement
function ownerUnlessServingOff(e, cloudClient, r) {
  return () =>
    servingOffReasonNow(cloudClient) === undefined && r()
      ? e()
      : {
          owner: false,
        };
}
