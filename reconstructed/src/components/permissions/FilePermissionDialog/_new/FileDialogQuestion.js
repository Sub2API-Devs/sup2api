/**
 * components/permissions/FilePermissionDialog/_new/FileDialogQuestion.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: sole-consumer-new 2
 */
import { e, r } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:1378871-1378895 sole-consumer-new
function tyt() {
  return "";
}
/**
 * 渲染文件权限对话框的问题文本："Do you want to <动作> <文件名>?"（文件名加粗）或纯文本。
 */
//@ chunk-18hwfzwa.js:1378895-1379060 sole-consumer-new
function FileDialogQuestion(h) {
  if (h.kind === "plain") return e(Text, { children: h.text });
  return r(Text, {
    children: ["Do you want to ", h.verbPhrase, " ", e(Text, { bold: !0, children: h.fileName }), "?"],
  });
}

export { tyt, FileDialogQuestion };
