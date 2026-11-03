/**
 * components/PromptInput/usePrefilledPromptWarning.ts
 *
 * 2.1.316 新增：有预填或来自外部链接的提示词时显示一条固定警告通知，提醒按回车前先检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useLaunchWarning } from "../../screens/repl/storeHooks.js";
import { useNotifications } from "../../context/notifications.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { LONG_PREFILL_CHARS } from "../../utils/deepLink/banner.js";

//@ chunk-18hwfzwa.js:772584-772615 placement
var LAUNCH_PROMPT_WARNING = "launch-prompt-warning";
//@ chunk-18hwfzwa.js:772615-772919 placement = useBuddyNotification (0.7)
/**
 * 有预填或来自外部链接的提示词时，显示一条固定的警告通知，提醒按回车前先检查。
 */
function usePrefilledPromptWarning() {
  let $ = w(5);
  let prefill = useLaunchWarning();
  let { addNotification, removeNotification } = useNotifications();
  let ee;
  let t1;
  if ($[0] !== addNotification || $[1] !== removeNotification || $[2] !== prefill) {
    ee = () => {
      if (prefill === null) {
        removeNotification(LAUNCH_PROMPT_WARNING);
        return;
      }
      addNotification({
        key: LAUNCH_PROMPT_WARNING,
        kind: "warning",
        priority: "immediate",
        pinned: true,
        segments: formatPrefillWarningSegments(prefill),
      });
    };
    t1 = [prefill, addNotification, removeNotification];
    $[0] = addNotification;
    $[1] = removeNotification;
    $[2] = prefill;
    $[3] = ee;
    $[4] = t1;
  } else {
    ee = $[3];
    t1 = $[4];
  }
  P(ee, t1);
}
//@ chunk-18hwfzwa.js:772919-773225 placement
function formatPrefillWarningSegments(prefill) {
  let x = prefill.type === "deep-link" ? "Prompt from an external link" : "Pre-filled prompt";
  let D = prefill.prefillLength > LONG_PREFILL_CHARS;
  return [
    {
      text: `${x}${D ? ` (${prefill.prefillLength.toLocaleString("en-US")} chars)` : ""}`,
    },
    {
      text: D ? " \xB7 scroll to review it all before pressing Enter" : " \xB7 review before pressing Enter",
      dim: true,
    },
  ];
}
export { usePrefilledPromptWarning };
