/**
 * components/PromptInput/PromptInputModeHints.tsx
 *
 * 2.1.316 新增。输入模式提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */

//@ chunk-18hwfzwa.js:132912-133034 placement
var VOICE_MODE_HINTS = {
  listening: "listening\u2026",
  listeningTapToSend: "listening\u2026 \xB7 tap to send",
  processing: "processing\u2026",
};
//@ chunk-18hwfzwa.js:133034-133715 placement
function PromptModeHints(h) {
  if (h.exitConfirm !== null) {
    let { keyName: keyName, detaches: detaches } = h.exitConfirm;
    return X_(
      "exit-confirm",
      `${fDt(keyName)} again to ${detaches ? "detach (session keeps running)" : "exit"}`,
    );
  }
  if (h.isPasting) return X_("pasting", "Pasting\u2026");
  if (h.voice !== null) return X_("voice", VOICE_MODE_HINTS[h.voice]);
  if (h.footerNavActive) return null;
  if (h.timed !== null) return X_("timed", h.timed);
  if (h.showExpandPaste) return X_("expand-paste", "paste again to expand");
  if (h.selectionCopyShortcut !== null) return X_("selection-copy", `${h.selectionCopyShortcut} to copy`);
  if (h.permissionParked) return X_("permission-parked", "permission needed \xB7 pause to answer");
  if (h.shellMode) return X_("shell-mode", "shell mode");
  return null;
}
//@ chunk-18hwfzwa.js:133715-133752 placement
function X_(h, x) {
  return { id: h, text: x };
}
//@ chunk-18hwfzwa.js:133752-133811 placement
function fDt(h) {
  return h.toLowerCase().replaceAll("-", "+");
}
//@ chunk-18hwfzwa.js:133811-133842 placement
var NOT_IN_CLOUD_SESSIONS = "not in cloud sessions";

export { NOT_IN_CLOUD_SESSIONS, PromptModeHints };
