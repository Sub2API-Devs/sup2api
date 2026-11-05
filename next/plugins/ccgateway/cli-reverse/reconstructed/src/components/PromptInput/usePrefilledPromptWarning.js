/**
 * components/PromptInput/usePrefilledPromptWarning.ts
 *
 * 2.1.316 新增：有预填或来自外部链接的提示词时显示一条固定警告通知，提醒按回车前先检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useLaunchWarning } from "../../screens/repl/storeHooks.js";
import { useNotifications } from "../../context/notifications.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import { LONG_PREFILL_CHARS } from "../../utils/deepLink/banner.js";

//@ chunk-czq1j3j2.js:805009-805040 placement
var LAUNCH_PROMPT_WARNING = "launch-prompt-warning";
//@ chunk-czq1j3j2.js:805040-805344 placement (2.1.88 match: useBuddyNotification, 0.7)
/**
 * 有预填或来自外部链接的提示词时，显示一条固定的警告通知，提醒按回车前先检查。
 */
function usePrefilledPromptWarning() {
  let $ = useMemoCache(5);
  let prefill = useLaunchWarning();
  let { addNotification, removeNotification } = useNotifications();
  let warnEffect;
  let t1;
  if ($[0] !== addNotification || $[1] !== removeNotification || $[2] !== prefill) {
    warnEffect = () => {
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
    $[3] = warnEffect;
    $[4] = t1;
  } else {
    warnEffect = $[3];
    t1 = $[4];
  }
  useEffect(warnEffect, t1);
}
//@ chunk-czq1j3j2.js:805344-805650 placement
function formatPrefillWarningSegments(prefill) {
  let title = prefill.type === "deep-link" ? "Prompt from an external link" : "Pre-filled prompt";
  let isLongPrefill = prefill.prefillLength > LONG_PREFILL_CHARS;
  return [
    {
      text: `${title}${isLongPrefill ? ` (${prefill.prefillLength.toLocaleString("en-US")} chars)` : ""}`,
    },
    {
      text: isLongPrefill
        ? " \xB7 scroll to review it all before pressing Enter"
        : " \xB7 review before pressing Enter",
      dim: true,
    },
  ];
}
export { usePrefilledPromptWarning };
