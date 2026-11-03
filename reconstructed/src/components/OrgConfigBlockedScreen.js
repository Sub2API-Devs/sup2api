/**
 * components/OrgConfigBlockedScreen.tsx
 *
 * 组织配置门拦截屏幕（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6bvzpeaf.js (7)
 * attribution: placement 7
 */
import { j, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  isGateBlocking,
  jitteredRetryMs,
  isGateRefusalFinal,
} from "../services/policyLimits/orgConfigGate.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { errorKindForTelemetry } from "../services/policyLimits/startupGate.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { di } from "../ink/terminal.js";
import { pendingPreReplSecurityDialog } from "../services/remoteManagedSettings/securityCheck.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "./AppRoot.js";
import { OrgConfigConsentHost } from "./OrgConfigConsentHost.js";
import { getBaseRenderOptions } from "../utils/renderOptions.js";

//@ chunk-6bvzpeaf.js:15544-15548 placement
j();
//@ chunk-6bvzpeaf.js:15548-15590 placement
function je(tn) {
  return { ...tn, checking: !0 };
}
//@ chunk-6bvzpeaf.js:15590-15655 placement
function ge(a, u) {
  let o = setTimeout(a, u);
  return () => clearTimeout(o);
}
/**
 * 组织配置门拦截时显示的屏幕，支持重试
 */
//@ chunk-6bvzpeaf.js:15655-18970 placement
function OrgConfigBlockedScreen(a) {
  let t = w(65),
    {
      initial: initial,
      pending: pending,
      retry: retry,
      onDone: onDone,
      rung: rung,
      onRung: onRung,
      schedule: schedule,
      random: random,
    } = a,
    p = rung === void 0 ? 0 : rung,
    c = schedule === void 0 ? ge : schedule;
  const b = pending !== null;
  let A;
  if (t[0] !== initial || t[1] !== p || t[2] !== b)
    ((A = { evaluation: initial, checking: b, rung: p }),
      (t[0] = initial),
      (t[1] = p),
      (t[2] = b),
      (t[3] = A));
  else A = t[3];
  let [te, oe] = y(A),
    { evaluation: evaluation, checking: checking, rung: rung_2 } = te,
    E = R(!1),
    ve,
    Re;
  if (t[4] !== onRung || t[5] !== rung_2)
    ((ve = () => {
      onRung?.(rung_2);
    }),
      (Re = [rung_2, onRung]),
      (t[4] = onRung),
      (t[5] = rung_2),
      (t[6] = ve),
      (t[7] = Re));
  else ((ve = t[6]), (Re = t[7]));
  P(ve, Re);
  let Ce;
  if (t[8] !== onDone)
    ((Ce = (Xe, Ye) => {
      let Se = Ye ? 1 : 0;
      (oe(je),
        Xe.then(
          (Oe) => {
            if (E.current) {
              return;
            }
            if (!isGateBlocking(Oe.decision)) {
              ((E.current = !0), onDone("passed"));
              return;
            }
            oe((Ze) => ({ evaluation: Oe, checking: !1, rung: Ze.rung + Se }));
          },
          (en) => {
            if (
              (logError(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `org-config gate: the blocked screen's retry rejected (${errorKindForTelemetry(en)})`,
                  "org-config gate: the blocked screen's retry rejected",
                ),
              ),
              E.current)
            ) {
              return;
            }
            oe((be) => ({ ...be, checking: !1, rung: be.rung + Se }));
          },
        ));
    }),
      (t[8] = onDone),
      (t[9] = Ce));
  else Ce = t[9];
  let D = Ce,
    Ee;
  if (t[10] !== checking || t[11] !== retry || t[12] !== D)
    ((Ee = (nn) => {
      if (checking || E.current) {
        return;
      }
      D(retry(), nn);
    }),
      (t[10] = checking),
      (t[11] = retry),
      (t[12] = D),
      (t[13] = Ee));
  else Ee = t[13];
  let h = Ee,
    Pe = R(!1),
    De,
    Ge;
  if (t[14] !== pending || t[15] !== D)
    ((De = () => {
      if (pending !== null && !Pe.current) ((Pe.current = !0), D(pending, !1));
    }),
      (Ge = [pending, D]),
      (t[14] = pending),
      (t[15] = D),
      (t[16] = De),
      (t[17] = Ge));
  else ((De = t[16]), (Ge = t[17]));
  P(De, Ge);
  let verdict = evaluation.decision.verdict,
    f = jitteredRetryMs(rung_2, random),
    Be;
  if (t[18] !== checking || t[19] !== f || t[20] !== h || t[21] !== c || t[22] !== verdict)
    ((Be = () => {
      if (verdict !== "blocked" || checking || f === void 0) {
        return;
      }
      return c(() => h(!0), f);
    }),
      (t[18] = checking),
      (t[19] = f),
      (t[20] = h),
      (t[21] = c),
      (t[22] = verdict),
      (t[23] = Be));
  else Be = t[23];
  let _e;
  if (
    t[24] !== checking ||
    t[25] !== f ||
    t[26] !== h ||
    t[27] !== rung_2 ||
    t[28] !== c ||
    t[29] !== verdict
  )
    ((_e = [verdict, checking, rung_2, f, c, h]),
      (t[24] = checking),
      (t[25] = f),
      (t[26] = h),
      (t[27] = rung_2),
      (t[28] = c),
      (t[29] = verdict),
      (t[30] = _e));
  else _e = t[30];
  P(Be, _e);
  let xe;
  if (t[31] !== evaluation.decision)
    ((xe = isGateRefusalFinal(evaluation.decision)), (t[31] = evaluation.decision), (t[32] = xe));
  else xe = t[32];
  let re = xe;
  const ie = checking ? "Checking\u2026" : "Retry now";
  let K;
  if (t[33] !== ie) ((K = { label: ie, value: "retry" }), (t[33] = ie), (t[34] = K));
  else K = t[34];
  let L;
  if (t[35] !== re)
    ((L = re ? [{ label: "Sign in again (claude auth login)", value: "sign_in" }] : []),
      (t[35] = re),
      (t[36] = L));
  else L = t[36];
  let Te;
  if (t[37] === MEMO_CACHE_SENTINEL) ((Te = { label: "Quit", value: "quit" }), (t[37] = Te));
  else Te = t[37];
  let Fe;
  if (t[38] !== K || t[39] !== L) ((Fe = [K, ...L, Te]), (t[38] = K), (t[39] = L), (t[40] = Fe));
  else Fe = t[40];
  let ae = Fe,
    U;
  if (t[41] !== onDone)
    ((U = () => {
      ((E.current = !0), onDone("quit"));
    }),
      (t[41] = onDone),
      (t[42] = U));
  else U = t[42];
  let V;
  if (t[43] !== evaluation.message)
    ((V = e(Text, { children: evaluation.message })), (t[43] = evaluation.message), (t[44] = V));
  else V = t[44];
  let z;
  if (t[45] !== checking || t[46] !== f || t[47] !== evaluation.decision.verdict)
    ((z =
      evaluation.decision.verdict === "blocked" &&
      e(Text, {
        dimColor: !0,
        children: checking
          ? "Checking again\u2026"
          : f === void 0
            ? "Automatic retries have stopped. Choose Retry now to check again."
            : `Retrying automatically in ${Math.round(f / 1000)}s.`,
      })),
      (t[45] = checking),
      (t[46] = f),
      (t[47] = evaluation.decision.verdict),
      (t[48] = z));
  else z = t[48];
  let J;
  if (t[49] !== onDone)
    ((J = () => {
      ((E.current = !0), onDone("quit"));
    }),
      (t[49] = onDone),
      (t[50] = J));
  else J = t[50];
  let W;
  if (t[51] !== onDone || t[52] !== h)
    ((W = (Ie) => {
      if (Ie === "retry") {
        h(!1);
        return;
      }
      ((E.current = !0), onDone(Ie === "sign_in" ? "sign_in" : "quit"));
    }),
      (t[51] = onDone),
      (t[52] = h),
      (t[53] = W));
  else W = t[53];
  let X;
  if (t[54] !== ae || t[55] !== J || t[56] !== W)
    ((X = e(ModelSelector, { options: ae, onCancel: J, onChange: W })),
      (t[54] = ae),
      (t[55] = J),
      (t[56] = W),
      (t[57] = X));
  else X = t[57];
  let Y;
  if (t[58] !== V || t[59] !== z || t[60] !== X)
    ((Y = r(Box, { flexDirection: "column", gap: 1, children: [V, z, X] })),
      (t[58] = V),
      (t[59] = z),
      (t[60] = X),
      (t[61] = Y));
  else Y = t[61];
  let He;
  if (t[62] !== U || t[63] !== Y)
    ((He = e(Box, {
      flexDirection: "column",
      children: e(Dialog, { title: "Claude Code can't start this session yet", onCancel: U, children: Y }),
    })),
      (t[62] = U),
      (t[63] = Y),
      (t[64] = He));
  else He = t[64];
  return He;
}
//@ chunk-6bvzpeaf.js:18970-19110 placement
function trackRetry(a, u) {
  let o = u().then((d) => ((a.latest = d), d));
  return (
    (a.inFlight = o),
    o
      .finally(() => {
        if (a.inFlight === o) a.inFlight = null;
      })
      .catch(() => {}),
    o
  );
}
//@ chunk-6bvzpeaf.js:19110-19253 placement
function renderBlockedScreen({ track: track, retry: retry, onDone: onDone }) {
  return e(OrgConfigBlockedScreen, {
    initial: track.latest,
    pending: track.inFlight,
    retry: retry,
    onDone: onDone,
    rung: track.rung,
    onRung: (d) => {
      track.rung = d;
    },
  });
}
/**
 * 组织配置门拦截时显示阻断屏：先等待待处理的安全对话框，然后渲染可重试的阻断屏，重试结果写入跟踪状态，结束时回调。
 */
//@ chunk-6bvzpeaf.js:19253-20181 placement
var showOrgConfigBlockedScreen = async (a, u, o) => {
  let d = di(),
    i = { latest: a, inFlight: null, rung: 0 },
    F = () => trackRetry(i, u),
    k = pendingPreReplSecurityDialog();
  if (k !== null) {
    await k.catch(() => {});
    try {
      i.latest = await u();
    } catch (error) {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the blocked screen's retry threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the blocked screen's retry threw",
        ),
      );
    }
    if (!isGateBlocking(i.latest.decision)) return "passed";
  }
  if (o?.retryNow === !0 && k === null) F().catch(() => {});
  let I = d.has(process.stdout),
    promise = new Promise((p) => {
      let c = !1;
      (async () => {
        let {
          rerender: rerender,
          unmount: unmount,
          waitUntilExit: waitUntilExit,
        } = await render(
          e(
            AppRoot,
            {
              children: e(OrgConfigConsentHost, {
                children: e(renderBlockedScreen, {
                  track: i,
                  retry: F,
                  onDone: (te) => {
                    if (c) return;
                    if (((c = !0), p(te), rerender(null), !I)) unmount();
                  },
                }),
              }),
            },
            "org-config-blocked",
          ),
          getBaseRenderOptions(!1),
        );
        if ((await waitUntilExit(), !c))
          ((c = !0), logError(Error("Org-config blocking screen exited without an answer")), p("failed"));
      })().catch((b) => {
        if (
          (logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `org-config gate: the blocked screen threw (${errorKindForTelemetry(b)})`,
              "org-config gate: the blocked screen threw",
            ),
          ),
          !c)
        )
          ((c = !0), p("failed"));
      });
    });
  if (!I) d.claimForStandaloneRender(promise);
  return promise;
};
