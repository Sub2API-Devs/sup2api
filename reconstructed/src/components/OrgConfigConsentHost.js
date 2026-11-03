/**
 * components/OrgConfigConsentHost.tsx
 *
 * 组织配置同意宿主组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3bfra2hw.js (3)
 * attribution: placement 3
 */
import { init_react_production, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { setSecurityDialogRequester } from "../services/remoteManagedSettings/securityCheck.js";
import { logError } from "../utils/log.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.js";

//@ chunk-3bfra2hw.js:451-455 placement
init_react_production();
//@ chunk-3bfra2hw.js:455-1150 placement
function OrgConfigConsentHost({ children }) {
  let [t, u] = y(null);
  let [i, c] = y(false);
  let r = R({
    current: 0,
    revealedAt: null,
  });
  P(() => {
    let s = null;
    setSecurityDialogRequester(
      (settings, baseline, v) =>
        new Promise((resolve) => {
          s = resolve;
          r.current = {
            current: 0,
            revealedAt: null,
          };
          function p(o, m) {
            if (s !== resolve || m !== r.current.current) return false;
            s = null;
            u(null);
            c(o === "rejected");
            resolve(o);
            return true;
          }
          u({
            settings,
            baseline,
            version: 0,
            answer: p,
          });
          (async () => {
            for await (let o of v) {
              if (s !== resolve) return;
              r.current = {
                current: r.current.current + 1,
                revealedAt: null,
              };
              u({
                settings: o.settings,
                baseline: o.baseline,
                version: r.current.current,
                answer: p,
              });
            }
          })().catch((error) => logError(error));
        }),
    );
    return () => {
      setSecurityDialogRequester(null);
      let f = s;
      s = null;
      f?.("deferred_no_consent_surface");
    };
  }, []);
  if (i) return null;
  if (t === null) return children;
  return jsxProd_default(OrgConfigConsentHost_2, {
    review: t,
    gate: r.current,
  });
}
//@ chunk-3bfra2hw.js:1150-1633 placement
function OrgConfigConsentHost_2({ review, gate }) {
  let inputClock = useInputClock();
  P(() => {
    if (gate.current === review.version) gate.revealedAt = Date.now();
  }, [gate, review.version, review.settings, review.baseline]);
  function i() {
    return (
      gate.current === review.version &&
      gate.revealedAt !== null &&
      !isWithinRecentInput(inputClock, gate.revealedAt, RECENT_INPUT_GUARD_MS)
    );
  }
  function c(r) {
    if (!i()) {
      if (gate.revealedAt !== null) gate.revealedAt = Date.now();
      return false;
    }
    return review.answer(r, review.version);
  }
  return jsxProd_default(ManagedSettingsSecurityDialogHost, {
    settings: review.settings,
    baseline: review.baseline,
    reveal: "org_config_hold",
    wouldTakeAnswer: i,
    onAccept: () => c("approved"),
    onReject: () => c("rejected"),
  });
}
export { OrgConfigConsentHost };
