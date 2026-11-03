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
import { j, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { setSecurityDialogRequester } from "../services/remoteManagedSettings/securityCheck.js";
import { logError } from "../utils/log.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { isWithinRecentInput, So } from "../hooks/useRecentInputGuard.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.js";

//@ chunk-3bfra2hw.js:451-455 placement
j();
//@ chunk-3bfra2hw.js:455-1150 placement
function OrgConfigConsentHost({ children: children }) {
  let [t, u] = y(null),
    [i, c] = y(!1),
    r = R({ current: 0, revealedAt: null });
  if (
    (P(() => {
      let s = null;
      return (
        setSecurityDialogRequester(
          (f, d, v) =>
            new Promise((a) => {
              ((s = a), (r.current = { current: 0, revealedAt: null }));
              function p(o, m) {
                if (s !== a || m !== r.current.current) return !1;
                return ((s = null), u(null), c(o === "rejected"), a(o), !0);
              }
              (u({ settings: f, baseline: d, version: 0, answer: p }),
                (async () => {
                  for await (let o of v) {
                    if (s !== a) return;
                    ((r.current = { current: r.current.current + 1, revealedAt: null }),
                      u({
                        settings: o.settings,
                        baseline: o.baseline,
                        version: r.current.current,
                        answer: p,
                      }));
                  }
                })().catch((o) => logError(o)));
            }),
        ),
        () => {
          setSecurityDialogRequester(null);
          let f = s;
          ((s = null), f?.("deferred_no_consent_surface"));
        }
      );
    }, []),
    i)
  )
    return null;
  if (t === null) return children;
  return e(OrgConfigConsentHost_2, { review: t, gate: r.current });
}
//@ chunk-3bfra2hw.js:1150-1633 placement
function OrgConfigConsentHost_2({ review: review, gate: gate }) {
  let u = useInputClock();
  P(() => {
    if (gate.current === review.version) gate.revealedAt = Date.now();
  }, [gate, review.version, review.settings, review.baseline]);
  function i() {
    return (
      gate.current === review.version &&
      gate.revealedAt !== null &&
      !isWithinRecentInput(u, gate.revealedAt, So)
    );
  }
  function c(r) {
    if (!i()) {
      if (gate.revealedAt !== null) gate.revealedAt = Date.now();
      return !1;
    }
    return review.answer(r, review.version);
  }
  return e(ManagedSettingsSecurityDialogHost, {
    settings: review.settings,
    baseline: review.baseline,
    reveal: "org_config_hold",
    wouldTakeAnswer: i,
    onAccept: () => c("approved"),
    onReject: () => c("rejected"),
  });
}

export { OrgConfigConsentHost };
