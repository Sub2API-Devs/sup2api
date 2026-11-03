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
import { iv, buildRemoteToolCallResult } from "./callResults.js";
import { compressImageBuffer } from "../../utils/imageResizer.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, withTelemetryMessage, toError } from "../../utils/errors.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { gn } from "../../utils/shortHash.js";
import { logError } from "../../utils/log.js";
import { Cye, PTe } from "../../services/remoteTools/toolHostAttestation.js";
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
import { createConcurrencyLimiter, TBn } from "../../services/remoteTools/remoteToolAdmission.js";
import { servableTools } from "./serve/serveCall.js";
import { createSignal } from "../../utils/signal.js";
import { withDeadline } from "../../utils/sleep.js";
import { Jti } from "./repositoryTrust.js";
import { SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO, SERVED_CALLS_UNATTESTED } from "./toolHostsNotice.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { callerKey } from "./serve/servedShellSettings.js";
import { withdrawAskedCall } from "./serve/pendingAsks.js";
import { withdrawnRequestMessage, unattestedSenderMessage } from "../../services/remoteTools/hostRefusals.js";
import { serveRemoteToolCall } from "./serve/callAdmission.js";
import { p5 } from "../../services/remoteTools/lease.js";
import { aNt, replayedFields } from "../../services/remoteTools/servedAnswerSize.js";
import { readCallResult } from "./toolDescriptors.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { isViolinWoodEnabledCached } from "../../services/analytics/violinGates.js";
import {
  isViolinWillowEnabledCached,
  VIOLIN_WILLOW_FLAG,
  isCloudClientToolServingAnsweredOn,
  getToolServingFlagAnsweredOff,
} from "../../services/analytics/violinWillowGate.js";
import { rNt, cOs } from "../../utils/platformWindows.js";
import { getDeviceBindingRefusal } from "../../bridge/deviceBindingPolicy.js";
import { onComplianceTaintsChanged } from "../../services/policyLimits/complianceTaints.js";

//@ chunk-012rhzq5.js:15691-15767 placement
function Q() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_finetuner", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-012rhzq5.js:15767-15840 placement = _temp7 (1)
function Ae(
  e = (r, s) => parseSettingsFileUncached(r, void 0, s),
  o = () => getSettingsForSource("policySettings"),
) {
  return !1;
}
//@ chunk-012rhzq5.js:15840-15865 placement
var ze = 4,
  Qe = 0.9,
  ie = 16384;
//@ chunk-012rhzq5.js:15865-16667 placement
async function reencodeServedImage(e, o) {
  let r = iv(e);
  if (r <= o) return e;
  let s = new Map();
  countImageCopies(e, s);
  let f = e;
  for (let S = 0; S < ze && r > o; S++) {
    let filtered = [...s].filter(([, y]) => ae(y.now.data) > ie),
      reduced = filtered.reduce((y, [, h]) => y + h.copies * h.now.data.length, 0);
    if (reduced === 0) break;
    let p = Math.max(0, 1 - (r - o) / reduced) * Qe;
    for (let [y, h] of filtered) {
      let max = Math.max(ie, Math.floor(ae(h.now.data) * p));
      try {
        let C = await compressImageBuffer(Buffer.from(y, "base64"), max, h.now.mediaType);
        if (ae(C.base64) >= ie && C.base64.length < h.now.data.length)
          s.set(y, { copies: h.copies, now: { data: C.base64, mediaType: C.mediaType } });
      } catch (error) {
        logForDebugging(
          `session serving: re-encoding a served image to fit the channel failed: ${errorMessage(error)}`,
          { level: "warn" },
        );
      }
    }
    let E = resolveMcpResultImages(e, new Map([...s].map(([y, h]) => [y, h.now]))),
      M = iv(E);
    if (M >= r) break;
    ((f = E), (r = M));
  }
  if (f !== e)
    logForDebugging(`session serving: served image(s) re-encoded, answer now ${r} bytes (limit ${o})`);
  return f;
}
//@ chunk-012rhzq5.js:16667-16714 placement
function ae(e) {
  return Math.floor((e.length * 3) / 4);
}
/**
 * （切分错误）从 image 块（MCP 的 data/mimeType 或 Anthropic 的 base64 source）取 {data, mediaType}。
 */
//@ chunk-012rhzq5.js:16714-17006 placement = buildImageToolResult (0.905)
function extractImageData(e) {
  if (e.type !== "image") return;
  if (typeof e.data === "string" && typeof e.mimeType === "string")
    return { data: e.data, mediaType: e.mimeType };
  let source = e.source;
  if (
    ce(source) &&
    source.type === "base64" &&
    typeof source.data === "string" &&
    typeof source.media_type === "string"
  )
    return { data: source.data, mediaType: source.media_type };
  return;
}
/**
 * （切分错误）递归统计对象中每张图片 data 出现的次数。
 */
//@ chunk-012rhzq5.js:17006-17223 placement
function countImageCopies(e, o) {
  if (Array.isArray(e)) {
    e.forEach((s) => countImageCopies(s, o));
    return;
  }
  if (!ce(e)) return;
  let r = extractImageData(e);
  if (r !== void 0) {
    o.set(r.data, { copies: (o.get(r.data)?.copies ?? 0) + 1, now: r });
    return;
  }
  Object.values(e).forEach((s) => countImageCopies(s, o));
}
/**
 * 把 MCP 工具结果中引用的图片数据按映射表替换为真实数据与 mimeType（含 structuredContent/_meta 深层）。
 */
//@ chunk-012rhzq5.js:17223-17535 placement
function resolveMcpResultImages(result, imagesByRef) {
  let mapped = result.content.map((s) => {
    let f = s.type === "image" ? imagesByRef.get(s.data) : void 0;
    return s.type === "image" && f !== void 0 ? { ...s, data: f.data, mimeType: f.mediaType } : s;
  });
  return {
    ...result,
    content: mapped,
    ...(result.structuredContent !== void 0 && {
      structuredContent: resolveImagesDeep(result.structuredContent, imagesByRef),
    }),
    ...(result._meta !== void 0 && { _meta: resolveImagesDeep(result._meta, imagesByRef) }),
  };
}
//@ chunk-012rhzq5.js:17535-17578 placement
function resolveImagesDeep(e, o) {
  return xr(e, (r) => resolveImageBlockDeep(r, o));
}
//@ chunk-012rhzq5.js:17578-17873 placement = normalizeImageBlocks (0.869)
function resolveImageBlockDeep(value, imagesByRef) {
  if (Array.isArray(value)) return value.map((block) => resolveImageBlockDeep(block, imagesByRef));
  if (!ce(value)) return value;
  let r = extractImageData(value),
    mediaType = r === void 0 ? void 0 : imagesByRef.get(r.data);
  if (mediaType !== void 0)
    return typeof value.data === "string"
      ? { ...value, data: mediaType.data, mimeType: mediaType.mediaType }
      : { ...value, source: { type: "base64", media_type: mediaType.mediaType, data: mediaType.data } };
  return resolveImagesDeep(value, imagesByRef);
}
//@ chunk-012rhzq5.js:17873-17925 placement
function ce(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-012rhzq5.js:17925-18000 placement
var en = 30000,
  nn = 5000,
  on = 20000,
  tn = 5000,
  rn = "not served here",
  sn = 3000,
  an = 5000;
/**
 * 上报远程 plumbing 调用遥测：结果、名称哈希、请求 id 哈希等。
 */
//@ chunk-012rhzq5.js:18000-18392 placement
function logPlumbingCallTelemetry(e, o, r, s) {
  try {
    logEvent("tengu_remote_plumbing_call", {
      transport: lit("session"),
      outcome: fromEnum(e.outcome),
      ...(e.outcome === "stale" && { dated: e.dated }),
      name_hash: gn(o.name),
      ...(typeof r === "string" && { request_id_hash: gn(r) }),
      ...(s !== void 0 && {
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
function safeJudgeSender(e) {
  try {
    return Cye(e);
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
    case void 0:
      return REMOTE_TOOLS_CONSENT_TEXT["repository_trust.served_calls.unattested"];
  }
}
/**
 * 会话工具服务：在 tengu_remote_tool_serving 开启时为云会话提供本机工具
 */
//@ chunk-012rhzq5.js:18812-26945 placement
var createSessionToolServing = (e) => {
    let o = () =>
        "offReason" in e
          ? typeof e.offReason === "function"
            ? e.offReason()
            : e.offReason
          : remoteToolServingOffReason_2(e.cwd),
      r = o(),
      s = r,
      f = !1,
      S = () => f || s !== void 0,
      w = r === "launched_from_home";
    if (r !== void 0)
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
          return (
            logForDebugging("session serving: the owner test threw; this client serves as a viewer", {
              level: "error",
            }),
            logError(toError(error)),
            { owner: !1 }
          );
        }
      },
      p = (n, i) => {
        try {
          e.onNotice?.(n, i);
        } catch (error) {
          logError(toError(error));
        }
      },
      E = !1,
      M = (n) => {
        if (E || !m().owner) return;
        if (((E = !0), isPersonFixableOffReason(n)))
          p(SERVED_BASH_LAUNCHED_FROM_HOME, SERVED_BASH_FROM_HOME_NOTICE);
        if (n === "muted") p(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
      };
    M(r);
    let y = !1,
      h = (n) => {
        if (!y && n === "profile_dirs_unreadable" && m().owner)
          ((y = !0),
            p(
              PROFILE_DIRS_UNREADABLE_NOTICE_KEY,
              REMOTE_TOOLS_CONSENT_TEXT["serving_off.profile_dirs_unreadable"],
            ));
      };
    h(r);
    let x = !1,
      C = (n) => {
        if (!x && n === "mount_table_unreadable" && m().owner)
          ((x = !0),
            p(
              SERVED_MOUNT_TABLE_UNREADABLE,
              REMOTE_TOOLS_CONSENT_TEXT["serving_off.mount_table_unreadable"],
            ));
      };
    C(r);
    let L = () => {
        let n = createServingKit({
            sessionId: e.sessionId,
            limiter: createConcurrencyLimiter(TBn),
            getDeviceId: () => {
              let u = m();
              return u.owner ? u.deviceId : void 0;
            },
            onNotice: p,
            ...(e.cwd !== void 0 && { launchDir: e.cwd }),
            ...(e.tools !== void 0 && { tools: e.tools }),
            ...(e.policy !== void 0 && { policy: e.policy }),
            sandboxRequiredNow: remoteToolVmRequired,
          }),
          onRedescribed = n.onRedescribed(I);
        return {
          kit: n,
          source: void 0,
          nativeTools: servableTools(n.deps).map((u) => announcedToolFor(u, n.deps, n.description)),
          release: () => {
            (onRedescribed(), n.dispose());
          },
        };
      },
      k = (n) => {
        let subscribe = n.source.subscribe((T) => {
            if (W() !== Y) H(T);
          }),
          onRedescribed = n.kit.onRedescribed(I);
        return {
          kit: n.kit,
          source: n.source,
          nativeTools: [],
          release: () => {
            (onRedescribed(), subscribe());
          },
        };
      },
      I = () => {
        if (!R && P && W() !== Y) H("redescribed");
      },
      P = e.serving === void 0,
      g = e.serving === void 0 ? L() : void 0,
      V = !1,
      F = createAnswerDeduper(),
      R = !1,
      U = createSignal(),
      me = (n) => !R && g !== void 0 && !S() && n.instance_id === e.instanceId && m().owner,
      pe = new Set(),
      Fe = async () => {
        let repositoryTrust = e.repositoryTrust;
        if (repositoryTrust === void 0) return;
        let i = await withDeadline(
            Promise.resolve()
              .then(repositoryTrust)
              .catch(() => {
                return;
              }),
            sn,
          ),
          u = Jti(i) ? i : void 0,
          T = u !== void 0 ? SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO : SERVED_CALLS_UNATTESTED;
        if (!pe.has(T)) (pe.add(T), p(T, unattestedConsentText(u)));
        return u;
      },
      ve = (n, i, u) => i !== void 0 && i <= n.deadline_ms + u,
      _e = (n) => n.request.ok && n.request.kind === "call" && n.request.value.approval === void 0;
    function he() {
      if (R || g === void 0 || !m().owner) return;
      return !S()
        ? {
            host: g.kit.description,
            tools: g.source?.native() ?? g.nativeTools,
            passthrough: g.source?.passthrough() ?? [],
            plumbing: e.plumbing?.names() ?? [],
          }
        : { host: g.kit.description, tools: [], passthrough: [], plumbing: [] };
    }
    let W = () => jsonStringify(he() ?? null);
    function H(n) {
      Y = W();
      try {
        U.emit(n);
      } catch (error) {
        (logForDebugging("session serving: a served-tools listener threw", { level: "error" }),
          logError(toError(error)));
      }
    }
    let Y = W(),
      Ue = (n) => {
        if (
          (logForDebugging(
            "session serving: the device registration handed over nothing usable; serving without it",
            { level: "warn" },
          ),
          logError(toError(n)),
          !R)
        )
          ((g = L()), (V = !1));
      };
    e.serving
      ?.then((n) => {
        if (R) return;
        ((g = n === void 0 ? L() : k(n)), (V = n !== void 0));
      })
      .catch(Ue)
      .then(() => {
        if (!R) ((P = !0), H("adopted"));
      })
      .catch((n) => logError(toError(n)));
    let Z = () => {
        let n = g?.kit.deps.sessions.peek(callerKey({ sessionId: e.sessionId }));
        if (g === void 0 || n === void 0) return;
        for (let i of n.pendingAsks.list())
          if (i.raisedOver === "session")
            withdrawAskedCall(n, i.askId, {
              reason: "host_unbound",
              message: withdrawnRequestMessage({
                targetName: g.kit.description.name,
                reason: "host_unbound",
              }),
            });
      },
      We = () => g?.kit.deps.sessions.peek(callerKey({ sessionId: e.sessionId })),
      q = () => We()?.backgroundShells,
      G = (n) => {
        q()?.stopAll(n);
      },
      ee = (n) => {
        try {
          n();
        } catch (error) {
          logError(toError(error));
        }
      },
      He = (n, i) =>
        ee(() =>
          logEvent("tengu_remote_tool_serving", {
            ...(n === void 0
              ? { event: lit("gate_on_reread") }
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
        ),
      $e = (n) => {
        ((f = !0),
          [
            () => {
              if (!n) logEvent("tengu_remote_tool_serving", { event: lit("serving_check_failed") });
            },
            () => G("serving_check_failed"),
            Z,
            () => {
              if (W() !== Y) H();
            },
          ].forEach(ee));
      },
      ne = () => !R && (q()?.running ?? 0) > 0,
      K = new Set(),
      oe = () => ne() || (!R && K.size > 0 && Q()),
      Se = () => {
        if (e.stillBound === void 0 || !oe()) return;
        e.stillBound()
          .then((n) => {
            if (n !== !1) return;
            let i = q()?.running ?? 0;
            if ((G("serving_ended"), !Q())) return;
            let u = [...K];
            K.clear();
            for (let T of u) T.abort();
            if ((Z(), u.length + i > 0))
              logEvent("tengu_remote_tool_serving", {
                event: lit("session_no_longer_served"),
                running_calls: u.length,
                background_commands: i,
              });
          })
          .catch((n) => logError(toError(n)));
      },
      j,
      te = 0,
      ye = e.backgroundSwitchedOff ?? Ae,
      Re = () => {
        if (j !== void 0 || !oe()) return;
        ((te = Date.now()),
          (j = setInterval(() => {
            if (!oe()) {
              (clearInterval(j), (j = void 0));
              return;
            }
            if (ne()) {
              if (ye()) G("serving_off");
              we.reevaluate();
            }
            if (Date.now() - te >= (e.backgroundBoundRecheckMs ?? on)) ((te = Date.now()), Se());
          }, e.backgroundWatchMs ?? nn)),
          j.unref());
      },
      je = (n) => {
        let backgroundShells = n.policy.backgroundShells;
        return backgroundShells === void 0
          ? n
          : {
              ...n,
              policy: {
                ...n.policy,
                backgroundShells: {
                  ...backgroundShells,
                  enabled: () => e.stillBound !== void 0 && backgroundShells.enabled() && !ye(),
                },
              },
            };
      },
      we = {
        sessionId: e.sessionId,
        instanceId: e.instanceId,
        serveSessionToolCall: async (
          n,
          {
            signal: signal,
            requestId: requestId,
            ageMs: ageMs,
            workerEpoch: workerEpoch,
            attestationStatus: attestationStatus,
            modeStamp: modeStamp,
          },
        ) => {
          let D = g;
          if (D === void 0 || !me(n)) return;
          let { kit: kit } = D,
            A = Cye(attestationStatus),
            X =
              n.request.ok && n.request.kind === "call"
                ? kit.deps.sessions
                    .peek(callerKey({ sessionId: e.sessionId }))
                    ?.calls.lookup(n.request.value.call_id)
                : void 0,
            Ve =
              n.request.ok &&
              (n.request.kind === "outcome_query" ||
                (_e(n) ? X !== void 0 : X !== void 0 && X.summary.state !== "asked")),
            Te = _e(n) ? tn : en,
            Ge = Ve || ve(n, ageMs, Te) ? void 0 : { ageMs: ageMs, windowMs: n.deadline_ms + Te },
            ke = PTe(A),
            Ke = ke ? await Fe() : void 0,
            Oe = D.source?.localNameFor(n.name),
            [Je, Xe] = Oe !== void 0 ? [Oe, kit.deps] : [n.name, un(kit.deps)],
            Ee = (z) =>
              serveRemoteToolCall(
                Je,
                { ...n.input },
                n.request,
                { sessionId: e.sessionId, signal: z, workerEpoch: workerEpoch },
                je(Xe),
                "session",
                {
                  stale: Ge,
                  attestation: A,
                  unattested: ke,
                  untrustedRepositories: Ke,
                  modeStamp: modeStamp,
                },
              )
                .then((se) => (Re(), fn(kit.description, n.tool_use_id, se)))
                .catch((se) => internalErrorCallResult(kit.description, n.tool_use_id, se));
          return F.answer(requestId, async () => {
            if (!Q()) return { result: await Ee(signal) };
            let abortController = new AbortController();
            (K.add(abortController), Re());
            try {
              return { result: await Ee(AbortSignal.any([signal, abortController.signal])) };
            } finally {
              K.delete(abortController);
            }
          });
        },
        servePlumbingCall: async (
          n,
          { signal: signal, requestId: requestId, ageMs: ageMs, attestationStatus: attestationStatus },
        ) => {
          let plumbing = e.plumbing,
            re = plumbing !== void 0 && plumbing.names().includes(n.name);
          if (!me(n)) return;
          let D = (A, X) => logPlumbingCallTelemetry(A, n, requestId, X);
          if (!re || plumbing === void 0)
            return F.answer(
              requestId,
              async () => (
                D({ outcome: "not_served" }, safeJudgeSender(attestationStatus)),
                { result: fe(`${n.name}: ${rn}`) }
              ),
            );
          if (!ve(n, ageMs, an)) {
            (logForDebugging(
              ageMs === void 0
                ? `[remote-tools] a ${n.name} plumbing call could not be dated against the service clock (no Date header on this stream) and was not served`
                : `[remote-tools] a ${n.name} plumbing call delivered ${ageMs} ms after it was stored, past its ${n.deadline_ms} ms window, was not served`,
            ),
              D({ outcome: "stale", dated: ageMs !== void 0 }, safeJudgeSender(attestationStatus)));
            return;
          }
          let O = Cye(attestationStatus);
          if (O !== void 0 && PTe(O))
            return F.answer(requestId, async () => {
              D({ outcome: "held_back" }, O);
              let A = `${n.name}: ${unattestedSenderMessage({ targetName: g?.kit.description.name ?? n.host, status: O.status, subtype: "remote_plumbing_call" })}`;
              return { result: plumbing.heldBack(n.name, A) ?? fe(A) };
            });
          return F.answer(requestId, () =>
            Promise.resolve()
              .then(() => (g?.kit.ensureSettingsHeld(), plumbing.serve(n, signal)))
              .then((A) => (D({ outcome: "served" }, O), A))
              .catch(
                (A) => (
                  logError(
                    withTelemetryMessage(toError(A), `session serving: plumbing call ${n.name} threw`),
                  ),
                  D({ outcome: "threw" }, O),
                  { result: fe(`${n.name}: could not be served (internal error)`) }
                ),
              ),
          );
        },
        answerProbe: () => (g === void 0 ? void 0 : { result: { epoch: g.kit.deps.sessions.epoch } }),
        servedTools: he,
        onServedToolsChanged: (n) => U.subscribe(n),
        reevaluate: () => {
          if (R) return;
          let n = f;
          try {
            let i = o();
            f = !1;
            let u = s;
            if (
              ((w ||= i === "launched_from_home"),
              (s = w && i === void 0 ? "launched_from_home" : i),
              s !== u)
            )
              He(s, n ? "serving_check_failed" : (u ?? "none"));
            if ((h(i), C(i), !E)) M(s);
            else if (m().owner) {
              if (s === "muted" && u !== "muted")
                p(SERVING_MUTED_NOTICE_KEY, REMOTE_TOOLS_CONSENT_TEXT["serving_off.muted"]);
              else if (u === "muted" && s === void 0)
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
            if (s !== void 0 || !m().owner) (G(s !== void 0 ? "serving_off" : "serving_ended"), Z());
            if (W() !== Y) H();
            if (n) ee(() => logEvent("tengu_remote_tool_serving", { event: lit("serving_check_recovered") }));
          } catch (error) {
            (logError(toError(error)), $e(n));
          }
        },
        heldServedCall: (n) => (R || g === void 0 || S() || !m().owner ? p5 : g.kit.heldServedCall(n)),
        noteUnlistedKind: (n) => {
          if (R || g === void 0 || !m().owner) return;
          g.kit.deps.callLog?.note({
            t: "refused_request",
            caller: callerKey({ sessionId: e.sessionId }),
            what: "kind",
            length: n.length,
            name_hash: n.hash,
            variant_of_listed: n.variantOfListed,
          });
        },
        announcesPassthrough: () => V,
        dispose: () => {
          if (R) return;
          (G("serving_ended"), (R = !0), clearInterval(j), g?.release(), H(), U.clear());
        },
        workerGone: Se,
        hasBackgroundWork: ne,
      };
    return we;
  },
  Be = (e, o, r) => ({
    instance_id: o,
    ...(r !== void 0 && { worker_epoch: r }),
    host: e.host,
    tools: e.tools,
    passthrough: e.passthrough ?? [],
    plumbing: e.plumbing,
  });
//@ chunk-012rhzq5.js:26945-27016 placement
function un({ servedMcpTools: servedMcpTools, servedMcpWireArguments: servedMcpWireArguments, ...r }) {
  return r;
}
//@ chunk-012rhzq5.js:27016-27186 placement
function createAnswerDeduper() {
  let e = new Map();
  return {
    answer: (o, r) => {
      if (o === void 0) return r();
      let s = e.get(o);
      if (s !== void 0) return s;
      let f = r().finally(() => e.delete(o));
      return (e.set(o, f), f);
    },
  };
}
//@ chunk-012rhzq5.js:27186-27250 placement
async function fn(e, o, r) {
  return checkServedResultSize(e, o, await reencodeServedImage(withCallIdInEnvelope(o, r), aNt()));
}
//@ chunk-012rhzq5.js:27250-27434 placement
function withCallIdInEnvelope(e, o) {
  let r = readCallResult(o);
  if (r.envelope.status !== "present" || r.envelope.envelope.call_id !== void 0) return o;
  return buildRemoteToolCallResult({ envelope: { ...r.envelope.envelope, call_id: e }, content: r.content });
}
//@ chunk-012rhzq5.js:27434-28148 placement
function checkServedResultSize(e, o, r) {
  let s = iv(r),
    f = aNt();
  if (s <= f) return r;
  let S = readCallResult(r),
    w = S.envelope.status === "present" ? S.envelope.envelope : void 0,
    m = `(${Me(s)}) is larger than this session can carry back (limit ${Me(f)}), so it was not returned.`,
    p =
      w?.outcome === "completed"
        ? `The command ran to completion on ${e.name}, but its result ${m} Its effects stand \u2014 do not re-run it to see the output; run a narrower command instead (head or tail, a filter, or write to a file and read part of it).`
        : `${e.name} answered this call, but the answer ${m}`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: o,
      target: { name: e.name, working_dir: e.working_dir },
      code: "tool_error",
      message: p,
      ...(w !== void 0 && replayedFields(w)),
    },
    content: [{ type: "text", text: p }],
  });
}
//@ chunk-012rhzq5.js:28148-28213 placement
function fe(e) {
  return { content: [{ type: "text", text: e }], isError: !0 };
}
//@ chunk-012rhzq5.js:28213-28265 placement
function Me(e) {
  return `${(e / 1048576).toFixed(1)} MB`;
}
/**
 * 服务调用抛异常时构造内部错误结果，并记录调试日志与错误。
 */
//@ chunk-012rhzq5.js:28265-28611 placement
function internalErrorCallResult(e, o, r) {
  (logForDebugging(`session serving: served call ${o} threw`, { level: "error" }), logError(toError(r)));
  let s = `${e.name} could not serve this call (internal error); nothing is known to have run.`;
  return buildRemoteToolCallResult({
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      call_id: o,
      target: { name: e.name, working_dir: e.working_dir },
      code: "internal_error",
      message: s,
    },
    content: [{ type: "text", text: s }],
  });
}
//@ chunk-012rhzq5.js:28611-30566 placement
function remoteToolServingOffReason({
  owner: owner,
  cloudClient: cloudClient,
  deviceBridge: deviceBridge,
  onNotice: onNotice,
  repositoryTrust: repositoryTrust,
  plumbing: plumbing,
  signals: signals,
  stillBound: stillBound,
}) {
  let p = _n() ?? (isViolinWoodEnabledCached() ? void 0 : "flag_off"),
    E = p === void 0 && cloudClient && !isViolinWillowEnabledCached();
  if (E)
    logEvent("tengu_remote_tool_serving", {
      event: lit("gate_off"),
      served_tool_count: 0,
      reason: lit("flag_off"),
      flag: fromEnum(VIOLIN_WILLOW_FLAG),
      own_flags_loaded: hasFreshGrowthBookFeatures(),
      transport: lit("session"),
    });
  if (p !== void 0 || E) {
    logForDebugging(
      `[servedTools] not served over the session channel: ${p ?? `flag_off (${VIOLIN_WILLOW_FLAG})`}`,
    );
    return;
  }
  let M = watchServingRevocation(cloudClient, signals),
    y = !cloudClient,
    h,
    x = () => {
      if (!y && isCloudClientToolServingAnsweredOn()) {
        if (((y = !0), h !== void 0))
          logEvent("tengu_remote_tool_serving", {
            event: lit("own_flag_answered_on"),
            held_ms: Math.round(performance.now() - h),
            transport: lit("session"),
          });
      }
      return y;
    },
    C,
    L = (k, I) => {
      let P = createSessionToolServing({
        ...k,
        owner: Sn(I, cloudClient, x),
        ...(deviceBridge && { serving: deviceBridge.serving }),
        ...(plumbing && { plumbing: plumbing }),
        ...(repositoryTrust && { repositoryTrust: () => repositoryTrust.refresh() }),
        ...(stillBound && { stillBound: stillBound }),
      });
      if (((C = P), !x() && h === void 0 && ge(cloudClient) === void 0 && I().owner))
        ((h = performance.now()),
          logForDebugging(
            "[servedTools] held: tool serving's flag is saved on, and the flag service has not answered this process yet",
          ),
          logEvent("tengu_remote_tool_serving", {
            event: lit("own_flag_unanswered"),
            served_tool_count: 0,
            transport: lit("session"),
          }));
      let g = M((R) => {
          let U = fromEnumOpt(getToolServingFlagAnsweredOff({ cloudClient: cloudClient }));
          if (h !== void 0 && !y && R === "flag_off")
            logEvent("tengu_remote_tool_serving", {
              event: lit("own_flag_answered_off"),
              flag: U,
              held_ms: Math.round(performance.now() - h),
              transport: lit("session"),
            });
          else if (cloudClient && y && R === "flag_off" && I().owner)
            logEvent("tengu_remote_tool_serving", {
              event: lit("own_flag_turned_off"),
              flag: U,
              transport: lit("session"),
            });
          P.reevaluate();
        }),
        V = (signals?.onMuteRecheck ?? onServingMuteRecheck)(() => P.reevaluate()),
        F = onWindowsProfileDirsSettled(() => P.reevaluate());
      return {
        ...P,
        dispose: () => {
          (F(), V(), g(), P.dispose());
        },
      };
    };
  return {
    createServingContext:
      owner instanceof Promise
        ? async (k) => (await primeWindowsProfileDirs(), await rNt(), L(k, await owner))
        : (k) => {
            let I = pendingWindowsProfileDirsRead() ?? (cOs() ? void 0 : rNt());
            return I === void 0 ? L(k, owner) : I.then(() => rNt()).then(() => L(k, owner));
          },
    buildAnnounce: Be,
    ...(deviceBridge && {
      onAnnounceOutcome: (k) =>
        deviceBridge.announceSettled(
          k.kind === "announced" && C?.announcesPassthrough?.() !== !0
            ? { kind: k.kind, status: k.status }
            : k,
        ),
    }),
    ...(onNotice && { onNotice: onNotice }),
    onRevoked: M,
  };
}
//@ chunk-012rhzq5.js:30566-30622 placement
function _n() {
  return getDeviceBindingRefusal() ?? (isSessionChannelDisabled() ? "channel_off" : void 0);
}
//@ chunk-012rhzq5.js:30622-30701 placement
function ge(e) {
  return (
    getDeviceBindingRefusal() ??
    (getToolServingFlagAnsweredOff({ cloudClient: e }) === void 0 ? void 0 : "flag_off")
  );
}
/**
 * 监听合规与开关变化，必要时撤销会话服务。
 */
//@ chunk-012rhzq5.js:30701-31007 placement
function watchServingRevocation(
  e,
  { onEgressChange: o = onComplianceTaintsChanged, onGateChange: r = onGrowthBookRefresh } = {},
) {
  return (s) => {
    let f = !1,
      S = [],
      w = () => {
        ((f = !0), S.splice(0).forEach((p) => p()));
      },
      m = () => {
        let p = ge(e);
        if (f || p === void 0) return;
        w();
        try {
          s(p);
        } catch (error) {
          logForDebugging(`[servedTools] a revocation listener threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
      };
    return (S.push(o(m)), S.push(r(m)), m(), w);
  };
}
//@ chunk-012rhzq5.js:31007-31071 placement
function Sn(e, o, r) {
  return () => (ge(o) === void 0 && r() ? e() : { owner: !1 });
}
