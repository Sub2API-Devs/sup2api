/**
 * components/TeleportResumeWrapper.tsx
 *
 * teleport 恢复流程包装（开始/取消事件、中断键）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportResumeWrapper.tsx
 * pieces: chunk-0bntfk7p.js (4)
 * attribution: placement 3, facade-exports 1
 */
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTeleportResume } from "../hooks/useTeleportResume.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { isKbCohesionFixesOn } from "../utils/kbCohesionFixes.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ResumeTask } from "./ResumeTask.js";

//@ chunk-0bntfk7p.js:1249-1253 placement
init_react_production();
//@ chunk-0bntfk7p.js:1253-1257 placement
init_react_production();
//@ chunk-0bntfk7p.js:1971-1975 placement
init_react_production();
//@ chunk-0bntfk7p.js:6828-8727 facade-exports = TeleportResumeWrapper (0.705)
/**
 * teleport 恢复：显示进度，中断键取消（tengu_teleport_cancelled），完成后回调恢复的会话。
 */
function TeleportResumeWrapper(props) {
  let $ = useMemoCache(31);
  let { onComplete, onCancel, onError, isEmbedded, source, onSettingsReload } = props;
  let isEmbedded_2 = isEmbedded === undefined ? false : isEmbedded;
  let { resumeSession, isResuming, error, selectedSession } = useTeleportResume(source);
  let t2;
  let t3;
  if ($[0] !== source) {
    t2 = () => {
      logEvent("tengu_teleport_started", {
        source: fromEnum(source),
      });
    };
    t3 = [source];
    $[0] = source;
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  useEffect(t2, t3);
  let t4;
  if ($[3] !== error || $[4] !== onComplete || $[5] !== onError || $[6] !== resumeSession) {
    t4 = async (session) => {
      let result = await resumeSession(session);
      if (result) onComplete(result);
      else if (error) {
        if (onError) onError(error.message, error.formattedMessage);
      }
    };
    $[3] = error;
    $[4] = onComplete;
    $[5] = onError;
    $[6] = resumeSession;
    $[7] = t4;
  } else t4 = $[7];
  let onSelect = t4;
  let t5;
  if ($[8] !== onCancel) {
    t5 = () => {
      logEvent("tengu_teleport_cancelled", {});
      onCancel();
    };
    $[8] = onCancel;
    $[9] = t5;
  } else t5 = $[9];
  let handleCancel = t5;
  const isActive = !!error && !onError;
  let t7;
  if ($[10] !== isActive) {
    t7 = {
      context: "Global",
      isActive,
    };
    $[10] = isActive;
    $[11] = t7;
  } else t7 = $[11];
  useKeybinding("app:interrupt", handleCancel, t7);
  let isActive_2;
  if ($[12] !== error || $[13] !== onError) {
    isActive_2 = !!error && !onError && isKbCohesionFixesOn();
    $[12] = error;
    $[13] = onError;
    $[14] = isActive_2;
  } else isActive_2 = $[14];
  let cancelKeybindingOptions;
  if ($[15] !== isActive_2) {
    cancelKeybindingOptions = {
      context: "Confirmation",
      isActive: isActive_2,
    };
    $[15] = isActive_2;
    $[16] = cancelKeybindingOptions;
  } else cancelKeybindingOptions = $[16];
  useKeybinding("confirm:no", handleCancel, cancelKeybindingOptions);
  if (isResuming && selectedSession) {
    let t8;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Spinner, {}),
          jsxProd_default(Text, {
            bold: true,
            children: "Resuming session\u2026",
          }),
        ],
      });
      $[17] = t8;
    } else t8 = $[17];
    let t9;
    if ($[18] !== selectedSession.title) {
      t9 = jsxProd_default_2(Box, {
        flexDirection: "column",
        padding: 1,
        children: [
          t8,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ['Loading "', selectedSession.title, '"\u2026'],
          }),
        ],
      });
      $[18] = selectedSession.title;
      $[19] = t9;
    } else t9 = $[19];
    return t9;
  }
  if (error && !onError) {
    let t8;
    if ($[20] === MEMO_CACHE_SENTINEL) {
      t8 = jsxProd_default(Text, {
        bold: true,
        color: "error",
        children: "Failed to resume session",
      });
      $[20] = t8;
    } else t8 = $[20];
    let t9;
    if ($[21] !== error.message) {
      t9 = jsxProd_default(Text, {
        dimColor: true,
        children: error.message,
      });
      $[21] = error.message;
      $[22] = t9;
    } else t9 = $[22];
    let t10;
    if ($[23] === MEMO_CACHE_SENTINEL) {
      t10 = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "cancel",
          }),
        }),
      });
      $[23] = t10;
    } else t10 = $[23];
    let t11;
    if ($[24] !== t9) {
      t11 = jsxProd_default_2(Box, {
        flexDirection: "column",
        padding: 1,
        children: [t8, t9, t10],
      });
      $[24] = t9;
      $[25] = t11;
    } else t11 = $[25];
    return t11;
  }
  let t8;
  if ($[26] !== handleCancel || $[27] !== onSelect || $[28] !== isEmbedded_2 || $[29] !== onSettingsReload) {
    t8 = jsxProd_default(ResumeTask, {
      onSelect,
      onCancel: handleCancel,
      isEmbedded: isEmbedded_2,
      onSettingsReload,
    });
    $[26] = handleCancel;
    $[27] = onSelect;
    $[28] = isEmbedded_2;
    $[29] = onSettingsReload;
    $[30] = t8;
  } else t8 = $[30];
  return t8;
}
export { TeleportResumeWrapper };
