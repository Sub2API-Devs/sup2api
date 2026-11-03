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
import { j, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTeleportResume } from "../hooks/useTeleportResume.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { CC } from "../utils/kbCohesionFixes.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ResumeTask } from "./ResumeTask.js";

//@ chunk-0bntfk7p.js:1249-1253 placement
j();
//@ chunk-0bntfk7p.js:1253-1257 placement
j();
//@ chunk-0bntfk7p.js:1971-1975 placement
j();
/**
 * teleport 恢复：显示进度，中断键取消（tengu_teleport_cancelled），完成后回调恢复的会话。
 */
//@ chunk-0bntfk7p.js:6828-8727 facade-exports = TeleportResumeWrapper (0.705)
function TeleportResumeWrapper(t0) {
  let $ = w(31),
    {
      onComplete: onComplete,
      onCancel: onCancel,
      onError: onError,
      isEmbedded: t1,
      source: source,
      onSettingsReload: onSettingsReload,
    } = t0,
    isEmbedded = t1 === void 0 ? !1 : t1,
    {
      resumeSession: resumeSession,
      isResuming: isResuming,
      error: error,
      selectedSession: selectedSession,
    } = useTeleportResume(source),
    L,
    M;
  if ($[0] !== source)
    ((L = () => {
      logEvent("tengu_teleport_started", { source: fromEnum(source) });
    }),
      (M = [source]),
      ($[0] = source),
      ($[1] = L),
      ($[2] = M));
  else ((L = $[1]), (M = $[2]));
  P(L, M);
  let G;
  if ($[3] !== error || $[4] !== onComplete || $[5] !== onError || $[6] !== resumeSession)
    ((G = async (session) => {
      let result = await resumeSession(session);
      if (result) onComplete(result);
      else if (error) {
        if (onError) onError(error.message, error.formattedMessage);
      }
    }),
      ($[3] = error),
      ($[4] = onComplete),
      ($[5] = onError),
      ($[6] = resumeSession),
      ($[7] = G));
  else G = $[7];
  let Y = G,
    z;
  if ($[8] !== onCancel)
    ((z = () => {
      (logEvent("tengu_teleport_cancelled", {}), onCancel());
    }),
      ($[8] = onCancel),
      ($[9] = z));
  else z = $[9];
  let F = z;
  const t6 = !!error && !onError;
  let V;
  if ($[10] !== t6) ((V = { context: "Global", isActive: t6 }), ($[10] = t6), ($[11] = V));
  else V = $[11];
  useKeybinding("app:interrupt", F, V);
  let B;
  if ($[12] !== error || $[13] !== onError)
    ((B = !!error && !onError && CC()), ($[12] = error), ($[13] = onError), ($[14] = B));
  else B = $[14];
  let ee;
  if ($[15] !== B) ((ee = { context: "Confirmation", isActive: B }), ($[15] = B), ($[16] = ee));
  else ee = $[16];
  if ((useKeybinding("confirm:no", F, ee), isResuming && selectedSession)) {
    let g;
    if ($[17] === MEMO_CACHE_SENTINEL)
      ((g = r(Box, {
        flexDirection: "row",
        children: [e(Spinner, {}), e(Text, { bold: !0, children: "Resuming session\u2026" })],
      })),
        ($[17] = g));
    else g = $[17];
    let E;
    if ($[18] !== selectedSession.title)
      ((E = r(Box, {
        flexDirection: "column",
        padding: 1,
        children: [g, r(Text, { dimColor: !0, children: ['Loading "', selectedSession.title, '"\u2026'] })],
      })),
        ($[18] = selectedSession.title),
        ($[19] = E));
    else E = $[19];
    return E;
  }
  if (error && !onError) {
    let g;
    if ($[20] === MEMO_CACHE_SENTINEL)
      ((g = e(Text, { bold: !0, color: "error", children: "Failed to resume session" })), ($[20] = g));
    else g = $[20];
    let E;
    if ($[21] !== error.message)
      ((E = e(Text, { dimColor: !0, children: error.message })), ($[21] = error.message), ($[22] = E));
    else E = $[22];
    let J;
    if ($[23] === MEMO_CACHE_SENTINEL)
      ((J = e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
        }),
      })),
        ($[23] = J));
    else J = $[23];
    let A;
    if ($[24] !== E)
      ((A = r(Box, { flexDirection: "column", padding: 1, children: [g, E, J] })), ($[24] = E), ($[25] = A));
    else A = $[25];
    return A;
  }
  let g;
  if ($[26] !== F || $[27] !== Y || $[28] !== isEmbedded || $[29] !== onSettingsReload)
    ((g = e(ResumeTask, {
      onSelect: Y,
      onCancel: F,
      isEmbedded: isEmbedded,
      onSettingsReload: onSettingsReload,
    })),
      ($[26] = F),
      ($[27] = Y),
      ($[28] = isEmbedded),
      ($[29] = onSettingsReload),
      ($[30] = g));
  else g = $[30];
  return g;
}

export { TeleportResumeWrapper };
