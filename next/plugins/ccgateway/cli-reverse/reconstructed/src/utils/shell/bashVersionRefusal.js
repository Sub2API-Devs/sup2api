/**
 * utils/shell/bashVersionRefusal.ts
 *
 * bash 版本过旧时拒绝执行：检测标记、给模型的改写建议和前置判断脚本（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 */
//@ chunk-5xgkngpb.js:3117585-3117709 placement
var DID_NOT_RUN_MARKER = "__CLAUDE_CODE_DID_NOT_RUN_BASH_TOO_OLD=";
var regExp_15 = new RegExp(`^${DID_NOT_RUN_MARKER}((\\d+)\\.(\\d+)(?:\\.\\d+)*)(?![\\d.])\\S*$`, "m");
//@ chunk-5xgkngpb.js:3117709-3118244 placement
/**
 * bash 版本过旧时的完整拒绝文本：要求改写命令，并说明可用 CLAUDE_CODE_SHELL 换 shell。
 */
function shellTooOldReason(bashVersion) {
  return `Claude Code did not run this command: this shell (bash ${bashVersion}) is too old to run it reliably. Rewrite it more simply: use no backticks or arrays, keep each $(...) to one plain command, and pass long text in single quotes (git commit -m '...'), on stdin (git commit -F - <<'EOF') or from a file. If it is still refused, split it into simpler commands, or put them in a script file and run that. The user can avoid this by setting CLAUDE_CODE_SHELL to the path of zsh or of a newer bash and restarting Claude Code.`;
}
//@ chunk-5xgkngpb.js:3118244-3118432 placement
function bashVersionGuard(maxAllowedMinor) {
  return `{ case "\${BASH_VERSINFO-}" in ${maxAllowedMinor === 4 ? "'2'|'3'" : "'2'|'3'|'4'"}) \\builtin printf '%s\\n' '${DID_NOT_RUN_MARKER}'"\${BASH_VERSION-}" >&2; \\builtin exit 126; \\exit 126;; esac; }`;
}
export { regExp_15, shellTooOldReason, bashVersionGuard };
