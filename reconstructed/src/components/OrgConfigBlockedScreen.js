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
import { init_react_production, y, R, P } from "../../vendor/react/cjs/react.production.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { getSecondRootError } from "../ink/terminal.js";
import { pendingPreReplSecurityDialog } from "../services/remoteManagedSettings/securityCheck.js";
import { render } from "../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "./AppRoot.js";
import { OrgConfigConsentHost } from "./OrgConfigConsentHost.js";
import { getBaseRenderOptions } from "../utils/renderOptions.js";

//@ chunk-6bvzpeaf.js:15544-15548 placement
init_react_production();
//@ chunk-6bvzpeaf.js:15548-15590 placement
function withChecking(tn) {
  return {
    ...tn,
    checking: true,
  };
}
//@ chunk-6bvzpeaf.js:15590-15655 placement
function delayWithCleanup(a, u) {
  let timer = setTimeout(a, u);
  return () => clearTimeout(timer);
}
//@ chunk-6bvzpeaf.js:15655-18970 placement
/**
 * 组织配置门拦截时显示的屏幕，支持重试
 */
function OrgConfigBlockedScreen(props) {
  let t = w(65);
  let { initial, pending, retry, onDone, rung, onRung, schedule, random } = props;
  let rung_2 = rung === undefined ? 0 : rung;
  let c = schedule === undefined ? delayWithCleanup : schedule;
  const checking = pending !== null;
  let A;
  if (t[0] !== initial || t[1] !== rung_2 || t[2] !== checking) {
    A = {
      evaluation: initial,
      checking,
      rung: rung_2,
    };
    t[0] = initial;
    t[1] = rung_2;
    t[2] = checking;
    t[3] = A;
  } else A = t[3];
  let [te, oe] = y(A);
  let { evaluation, checking: checking_2, rung: rung_3 } = te;
  let E = R(false);
  let ve;
  let Re;
  if (t[4] !== onRung || t[5] !== rung_3) {
    ve = () => {
      onRung?.(rung_3);
    };
    Re = [rung_3, onRung];
    t[4] = onRung;
    t[5] = rung_3;
    t[6] = ve;
    t[7] = Re;
  } else {
    ve = t[6];
    Re = t[7];
  }
  P(ve, Re);
  let Ce;
  if (t[8] !== onDone) {
    Ce = (Xe, Ye) => {
      let Se = Ye ? 1 : 0;
      oe(withChecking);
      Xe.then(
        (Oe) => {
          if (E.current) {
            return;
          }
          if (!isGateBlocking(Oe.decision)) {
            E.current = true;
            onDone("passed");
            return;
          }
          oe((Ze) => ({
            evaluation: Oe,
            checking: false,
            rung: Ze.rung + Se,
          }));
        },
        (error) => {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `org-config gate: the blocked screen's retry rejected (${errorKindForTelemetry(error)})`,
              "org-config gate: the blocked screen's retry rejected",
            ),
          );
          if (E.current) {
            return;
          }
          oe((be) => ({
            ...be,
            checking: false,
            rung: be.rung + Se,
          }));
        },
      );
    };
    t[8] = onDone;
    t[9] = Ce;
  } else Ce = t[9];
  let D = Ce;
  let Ee;
  if (t[10] !== checking_2 || t[11] !== retry || t[12] !== D) {
    Ee = (nn) => {
      if (checking_2 || E.current) {
        return;
      }
      D(retry(), nn);
    };
    t[10] = checking_2;
    t[11] = retry;
    t[12] = D;
    t[13] = Ee;
  } else Ee = t[13];
  let h = Ee;
  let Pe = R(false);
  let De;
  let Ge;
  if (t[14] !== pending || t[15] !== D) {
    De = () => {
      if (pending !== null && !Pe.current) {
        Pe.current = true;
        D(pending, false);
      }
    };
    Ge = [pending, D];
    t[14] = pending;
    t[15] = D;
    t[16] = De;
    t[17] = Ge;
  } else {
    De = t[16];
    Ge = t[17];
  }
  P(De, Ge);
  let verdict = evaluation.decision.verdict;
  let f = jitteredRetryMs(rung_3, random);
  let Be;
  if (t[18] !== checking_2 || t[19] !== f || t[20] !== h || t[21] !== c || t[22] !== verdict) {
    Be = () => {
      if (verdict !== "blocked" || checking_2 || f === undefined) {
        return;
      }
      return c(() => h(true), f);
    };
    t[18] = checking_2;
    t[19] = f;
    t[20] = h;
    t[21] = c;
    t[22] = verdict;
    t[23] = Be;
  } else Be = t[23];
  let _e;
  if (
    t[24] !== checking_2 ||
    t[25] !== f ||
    t[26] !== h ||
    t[27] !== rung_3 ||
    t[28] !== c ||
    t[29] !== verdict
  ) {
    _e = [verdict, checking_2, rung_3, f, c, h];
    t[24] = checking_2;
    t[25] = f;
    t[26] = h;
    t[27] = rung_3;
    t[28] = c;
    t[29] = verdict;
    t[30] = _e;
  } else _e = t[30];
  P(Be, _e);
  let xe;
  if (t[31] !== evaluation.decision) {
    xe = isGateRefusalFinal(evaluation.decision);
    t[31] = evaluation.decision;
    t[32] = xe;
  } else xe = t[32];
  let re = xe;
  const label = checking_2 ? "Checking\u2026" : "Retry now";
  let K;
  if (t[33] !== label) {
    K = {
      label,
      value: "retry",
    };
    t[33] = label;
    t[34] = K;
  } else K = t[34];
  let L;
  if (t[35] !== re) {
    L = re
      ? [
          {
            label: "Sign in again (claude auth login)",
            value: "sign_in",
          },
        ]
      : [];
    t[35] = re;
    t[36] = L;
  } else L = t[36];
  let Te;
  if (t[37] === MEMO_CACHE_SENTINEL) {
    Te = {
      label: "Quit",
      value: "quit",
    };
    t[37] = Te;
  } else Te = t[37];
  let Fe;
  if (t[38] !== K || t[39] !== L) {
    Fe = [K, ...L, Te];
    t[38] = K;
    t[39] = L;
    t[40] = Fe;
  } else Fe = t[40];
  let options = Fe;
  let onCancel;
  if (t[41] !== onDone) {
    onCancel = () => {
      E.current = true;
      onDone("quit");
    };
    t[41] = onDone;
    t[42] = onCancel;
  } else onCancel = t[42];
  let V;
  if (t[43] !== evaluation.message) {
    V = jsxProd_default(Text, {
      children: evaluation.message,
    });
    t[43] = evaluation.message;
    t[44] = V;
  } else V = t[44];
  let z;
  if (t[45] !== checking_2 || t[46] !== f || t[47] !== evaluation.decision.verdict) {
    z =
      evaluation.decision.verdict === "blocked" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: checking_2
          ? "Checking again\u2026"
          : f === undefined
            ? "Automatic retries have stopped. Choose Retry now to check again."
            : `Retrying automatically in ${Math.round(f / 1000)}s.`,
      });
    t[45] = checking_2;
    t[46] = f;
    t[47] = evaluation.decision.verdict;
    t[48] = z;
  } else z = t[48];
  let onCancel_2;
  if (t[49] !== onDone) {
    onCancel_2 = () => {
      E.current = true;
      onDone("quit");
    };
    t[49] = onDone;
    t[50] = onCancel_2;
  } else onCancel_2 = t[50];
  let onChange;
  if (t[51] !== onDone || t[52] !== h) {
    onChange = (Ie) => {
      if (Ie === "retry") {
        h(false);
        return;
      }
      E.current = true;
      onDone(Ie === "sign_in" ? "sign_in" : "quit");
    };
    t[51] = onDone;
    t[52] = h;
    t[53] = onChange;
  } else onChange = t[53];
  let X;
  if (t[54] !== options || t[55] !== onCancel_2 || t[56] !== onChange) {
    X = jsxProd_default(ModelSelector, {
      options,
      onCancel: onCancel_2,
      onChange,
    });
    t[54] = options;
    t[55] = onCancel_2;
    t[56] = onChange;
    t[57] = X;
  } else X = t[57];
  let children;
  if (t[58] !== V || t[59] !== z || t[60] !== X) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [V, z, X],
    });
    t[58] = V;
    t[59] = z;
    t[60] = X;
    t[61] = children;
  } else children = t[61];
  let He;
  if (t[62] !== onCancel || t[63] !== children) {
    He = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Dialog, {
        title: "Claude Code can't start this session yet",
        onCancel,
        children,
      }),
    });
    t[62] = onCancel;
    t[63] = children;
    t[64] = He;
  } else He = t[64];
  return He;
}
//@ chunk-6bvzpeaf.js:18970-19110 placement
function trackRetry(a, u) {
  let o = u().then((d) => {
    a.latest = d;
    return d;
  });
  a.inFlight = o;
  o.finally(() => {
    if (a.inFlight === o) a.inFlight = null;
  }).catch(() => {});
  return o;
}
//@ chunk-6bvzpeaf.js:19110-19253 placement
function renderBlockedScreen({ track, retry, onDone }) {
  return jsxProd_default(OrgConfigBlockedScreen, {
    initial: track.latest,
    pending: track.inFlight,
    retry,
    onDone,
    rung: track.rung,
    onRung: (rung) => {
      track.rung = rung;
    },
  });
}
//@ chunk-6bvzpeaf.js:19253-20181 placement
/**
 * 组织配置门拦截时显示阻断屏：先等待待处理的安全对话框，然后渲染可重试的阻断屏，重试结果写入跟踪状态，结束时回调。
 */
var showOrgConfigBlockedScreen = async (latest, u, o) => {
  let secondRootError = getSecondRootError();
  let i = {
    latest,
    inFlight: null,
    rung: 0,
  };
  let F = () => trackRetry(i, u);
  let k = pendingPreReplSecurityDialog();
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
  if (o?.retryNow === true && k === null) F().catch(() => {});
  let I = secondRootError.has(process.stdout);
  let promise = new Promise((resolve) => {
    let c = false;
    (async () => {
      let { rerender, unmount, waitUntilExit } = await render(
        jsxProd_default(
          AppRoot,
          {
            children: jsxProd_default(OrgConfigConsentHost, {
              children: jsxProd_default(renderBlockedScreen, {
                track: i,
                retry: F,
                onDone: (te) => {
                  if (c) return;
                  c = true;
                  resolve(te);
                  rerender(null);
                  if (!I) unmount();
                },
              }),
            }),
          },
          "org-config-blocked",
        ),
        getBaseRenderOptions(false),
      );
      await waitUntilExit();
      if (!c) {
        c = true;
        logError(Error("Org-config blocking screen exited without an answer"));
        resolve("failed");
      }
    })().catch((error) => {
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `org-config gate: the blocked screen threw (${errorKindForTelemetry(error)})`,
          "org-config gate: the blocked screen threw",
        ),
      );
      if (!c) {
        c = true;
        resolve("failed");
      }
    });
  });
  if (!I) secondRootError.claimForStandaloneRender(promise);
  return promise;
};
