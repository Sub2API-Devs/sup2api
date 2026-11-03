/**
 * components/PromptInput/usePrefilledPromptWarning.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { vae } from "../../screens/repl/storeHooks.js";
import { useNotifications } from "../../context/notifications.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { Ogo } from "../../utils/deepLink/banner.js";

//@ chunk-18hwfzwa.js:772584-772615 placement
var LAUNCH_PROMPT_WARNING = "launch-prompt-warning";
/**
 * 有预填或来自外部链接的提示词时，显示一条固定的警告通知，提醒按回车前先检查。
 */
//@ chunk-18hwfzwa.js:772615-772919 placement = useBuddyNotification (0.7)
function usePrefilledPromptWarning() {
  let L = w(5),
    h = vae(),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    ee,
    ke;
  if (L[0] !== addNotification || L[1] !== removeNotification || L[2] !== h)
    ((ee = () => {
      if (h === null) {
        removeNotification(LAUNCH_PROMPT_WARNING);
        return;
      }
      addNotification({
        key: LAUNCH_PROMPT_WARNING,
        kind: "warning",
        priority: "immediate",
        pinned: !0,
        segments: formatPrefillWarningSegments(h),
      });
    }),
      (ke = [h, addNotification, removeNotification]),
      (L[0] = addNotification),
      (L[1] = removeNotification),
      (L[2] = h),
      (L[3] = ee),
      (L[4] = ke));
  else ((ee = L[3]), (ke = L[4]));
  P(ee, ke);
}
//@ chunk-18hwfzwa.js:772919-773225 placement
function formatPrefillWarningSegments(prefill) {
  let x = prefill.type === "deep-link" ? "Prompt from an external link" : "Pre-filled prompt",
    D = prefill.prefillLength > Ogo;
  return [
    { text: `${x}${D ? ` (${prefill.prefillLength.toLocaleString("en-US")} chars)` : ""}` },
    {
      text: D ? " \xB7 scroll to review it all before pressing Enter" : " \xB7 review before pressing Enter",
      dim: !0,
    },
  ];
}

export { usePrefilledPromptWarning };
