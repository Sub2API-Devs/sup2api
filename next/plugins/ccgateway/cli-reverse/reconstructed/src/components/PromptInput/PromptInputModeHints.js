/**
 * components/PromptInput/PromptInputModeHints.tsx
 *
 * 2.1.316 新增。输入模式提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-czq1j3j2.js:133981-134185 placement
var EXIT_HINTS = {
  exit: "exit",
  detach: "detach (session keeps running)",
  quit: "quit Claude Code",
};
var VOICE_MODE_HINTS = {
  listening: "listening\u2026",
  listeningTapToSend: "listening\u2026 \xB7 tap to send",
  processing: "processing\u2026",
};
//@ chunk-czq1j3j2.js:134185-134829 placement
function PromptModeHints(props) {
  if (props.exitConfirm !== null) {
    let { keyName, leaves } = props.exitConfirm;
    return buildModeHint("exit-confirm", `${formatKeyName(keyName)} again to ${EXIT_HINTS[leaves]}`);
  }
  if (props.isPasting) return buildModeHint("pasting", "Pasting\u2026");
  if (props.voice !== null) return buildModeHint("voice", VOICE_MODE_HINTS[props.voice]);
  if (props.footerNavActive) return null;
  if (props.timed !== null) return buildModeHint("timed", props.timed);
  if (props.showExpandPaste) return buildModeHint("expand-paste", "paste again to expand");
  if (props.selectionCopyShortcut !== null)
    return buildModeHint("selection-copy", `${props.selectionCopyShortcut} to copy`);
  if (props.permissionParked)
    return buildModeHint("permission-parked", "permission needed \xB7 pause to answer");
  if (props.shellMode) return buildModeHint("shell-mode", "shell mode");
  return null;
}
//@ chunk-czq1j3j2.js:134829-134866 placement
function buildModeHint(id, text) {
  return {
    id,
    text,
  };
}
//@ chunk-czq1j3j2.js:134866-134925 placement
function formatKeyName(keyName) {
  return keyName.toLowerCase().replaceAll("-", "+");
}
//@ chunk-czq1j3j2.js:134925-134956 placement
var NOT_IN_CLOUD_SESSIONS = "not in cloud sessions";
export { NOT_IN_CLOUD_SESSIONS, PromptModeHints };
