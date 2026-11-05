/**
 * components/OrgConfigConsentHost.tsx
 *
 * 组织配置同意宿主组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cnnx1tw4.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { setSecurityDialogRequester } from "../services/remoteManagedSettings/securityCheck.js";
import { logError } from "../utils/log.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-cnnx1tw4.js:451-455 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cnnx1tw4.js:451", () => {
  init_react_production();
});
//@ chunk-cnnx1tw4.js:455-1150 placement
function OrgConfigConsentHost({ children }) {
  let [dialog, setDialog] = useState(null);
  let [isVisible, setIsVisible] = useState(false);
  let gateRef = useRef({
    current: 0,
    revealedAt: null,
  });
  useEffect(() => {
    let resolve = null;
    setSecurityDialogRequester(
      (settings, baseline, value) =>
        new Promise((resolve_2) => {
          resolve = resolve_2;
          gateRef.current = {
            current: 0,
            revealedAt: null,
          };
          function handleAnswer(answer, version) {
            if (resolve !== resolve_2 || version !== gateRef.current.current) return false;
            resolve = null;
            setDialog(null);
            setIsVisible(answer === "rejected");
            resolve_2(answer);
            return true;
          }
          setDialog({
            settings,
            baseline,
            version: 0,
            answer: handleAnswer,
          });
          (async () => {
            for await (let next of value) {
              if (resolve !== resolve_2) return;
              gateRef.current = {
                current: gateRef.current.current + 1,
                revealedAt: null,
              };
              setDialog({
                settings: next.settings,
                baseline: next.baseline,
                version: gateRef.current.current,
                answer: handleAnswer,
              });
            }
          })().catch((error) => logError(error));
        }),
    );
    return () => {
      setSecurityDialogRequester(null);
      let resolveDialog = resolve;
      resolve = null;
      resolveDialog?.("deferred_no_consent_surface");
    };
  }, []);
  if (isVisible) return null;
  if (dialog === null) return children;
  return jsxProd_default(OrgConfigConsentHost_2, {
    review: dialog,
    gate: gateRef.current,
  });
}
//@ chunk-cnnx1tw4.js:1150-1633 placement
function OrgConfigConsentHost_2({ review, gate }) {
  let inputClock = useInputClock();
  useEffect(() => {
    if (gate.current === review.version) gate.revealedAt = Date.now();
  }, [gate, review.version, review.settings, review.baseline]);
  function isGateHeld() {
    return (
      gate.current === review.version &&
      gate.revealedAt !== null &&
      !isWithinRecentInput(inputClock, gate.revealedAt, RECENT_INPUT_GUARD_MS)
    );
  }
  function answer(choice) {
    if (!isGateHeld()) {
      if (gate.revealedAt !== null) gate.revealedAt = Date.now();
      return false;
    }
    return review.answer(choice, review.version);
  }
  return jsxProd_default(ManagedSettingsSecurityDialogHost, {
    settings: review.settings,
    baseline: review.baseline,
    reveal: "org_config_hold",
    wouldTakeAnswer: isGateHeld,
    onAccept: () => answer("approved"),
    onReject: () => answer("rejected"),
  });
}
export { OrgConfigConsentHost };
