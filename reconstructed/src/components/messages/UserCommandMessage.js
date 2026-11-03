/**
 * components/messages/UserCommandMessage.tsx
 *
 * 用户斜杠命令/技能调用回显（"/命令 参数" 或 Skill(name)）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserCommandMessage.tsx
 * pieces: chunk-ah34pb7m.js (8)
 * attribution: placement 7, fingerprint 1
 */
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import { extractTag } from "../../utils/messages.js";
import { PASTED_CONTENT_TAG, flattenPastedBlocks } from "../../utils/pastedContent.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BashToolResultMessage } from "../../tools/BashTool/BashToolResultMessage.js";
import { Ljo } from "../../utils/messages/apiNormalization.js";
import { Box, Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

/**
 * "<bash-stdout>"/"</bash-stdout>"/"<persisted-output>"/"</persisted-output>" 标签常量。
 */
//@ chunk-ah34pb7m.js:105017-105109 placement = PERSISTED_OUTPUT_CLOSING_TAG (0.398)
var BASH_STDOUT_OPEN_TAG = "<bash-stdout>",
  BASH_STDOUT_CLOSE_TAG = "</bash-stdout>",
  PERSISTED_OUTPUT_TAG = "<persisted-output>",
  PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
/**
 * 从 bash-stdout/bash-stderr 标签包装的文本中拆出 stdout/stderr（处理 persisted-output 包装并反转义）。旧版名 BASH_STDERR_TAG 是常量名，这里是函数。
 */
//@ chunk-ah34pb7m.js:105191-105335 placement = BASH_STDERR_TAG (0.645)
function splitBashOutputTags(m) {
  let { stdoutBody: stdoutBody, afterStdout: afterStdout } = splitBashStdoutTag(m),
    g = QR(stdoutBody);
  return {
    stdout: g.startsWith(PERSISTED_OUTPUT_TAG) ? stripPersistedOutputTags(g) : unescapeHtmlEntities(g),
    stderr: unescapeHtmlEntities(QR(extractTag(afterStdout, "bash-stderr") ?? "")),
  };
}
//@ chunk-ah34pb7m.js:105335-105512 placement
function splitBashStdoutTag(m) {
  let index = m.lastIndexOf(BASH_STDOUT_CLOSE_TAG);
  if (!m.startsWith(BASH_STDOUT_OPEN_TAG) || index === -1) return { stdoutBody: "", afterStdout: m };
  return {
    stdoutBody: m.slice(BASH_STDOUT_OPEN_TAG.length, index),
    afterStdout: m.slice(index + BASH_STDOUT_CLOSE_TAG.length),
  };
}
//@ chunk-ah34pb7m.js:105512-105622 placement
function stripPersistedOutputTags(m) {
  let sliced = m.slice(PERSISTED_OUTPUT_TAG.length),
    index = sliced.lastIndexOf(PERSISTED_OUTPUT_CLOSING_TAG);
  return index === -1
    ? sliced
    : sliced.slice(0, index) + sliced.slice(index + PERSISTED_OUTPUT_CLOSING_TAG.length);
}
//@ chunk-ah34pb7m.js:105622-105716 placement
function QR(m) {
  let replaced = m.replace(/^\n+/, "");
  if (!replaced.startsWith(`<${PASTED_CONTENT_TAG} `)) return m;
  return flattenPastedBlocks(replaced);
}
//@ chunk-ah34pb7m.js:105716-105788 placement
function Pho(m, d) {
  let c = m.get(d);
  if (!c) ((c = splitBashOutputTags(d.text)), m.set(d, c));
  return c;
}
/**
 * 把带 bash-stdout 等标签的用户文本拆开后交给 BashToolResultMessage 显示。
 */
//@ chunk-ah34pb7m.js:105788-105999 placement
function BashOutputBlock(m) {
  let g = w(5),
    { content: content, verbose: verbose } = m,
    f;
  if (g[0] !== content) ((f = splitBashOutputTags(content)), (g[0] = content), (g[1] = f));
  else f = g[1];
  const h = !!verbose;
  let M;
  if (g[2] !== f || g[3] !== h)
    ((M = e(BashToolResultMessage, { content: f, verbose: h })), (g[2] = f), (g[3] = h), (g[4] = M));
  else M = g[4];
  return M;
}
//@ chunk-ah34pb7m.js:105999-106929 fingerprint = UserCommandMessage (0.39)
function UserCommandMessage(t0) {
  let $ = w(14),
    { addMargin: addMargin, param: t1, followsSpeakerLabel: followsSpeakerLabel } = t0,
    { text: text } = t1,
    h = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    T;
  if ($[0] !== text) ((T = Ljo(text)), ($[0] = text), ($[1] = T));
  else T = $[1];
  let x = T;
  if (!x?.message) {
    return null;
  }
  let { message: message, args: args, isSkillFormat: isSkillFormat } = x,
    B;
  if ($[2] !== args || $[3] !== message || $[4] !== isSkillFormat)
    ((B = isSkillFormat ? `Skill(${message})` : `/${[message, args].filter(Boolean).join(" ")}`),
      ($[2] = args),
      ($[3] = message),
      ($[4] = isSkillFormat),
      ($[5] = B));
  else B = $[5];
  let L = B;
  if (h) {
    let N;
    if ($[6] !== L)
      ((N = e(Box, {
        flexGrow: 1,
        backgroundColor: "userMessageBackground",
        children: e(Text, { color: "text", children: L }),
      })),
        ($[6] = L),
        ($[7] = N));
    else N = $[7];
    return N;
  }
  const N = addMargin ? 1 : 0;
  let W;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((W = e(Text, { "aria-label": "you:", color: "inactive", children: re.pointer })), ($[8] = W));
  else W = $[8];
  let U;
  if ($[9] !== L)
    ((U = r(Text, { children: [W, " ", e(Text, { color: "text", children: L })] })), ($[9] = L), ($[10] = U));
  else U = $[10];
  let K;
  if ($[11] !== N || $[12] !== U)
    ((K = e(Box, {
      flexDirection: "column",
      marginTop: N,
      backgroundColor: "userMessageBackground",
      paddingRight: 1,
      children: U,
    })),
      ($[11] = N),
      ($[12] = U),
      ($[13] = K));
  else K = $[13];
  return K;
}

export { Pho, UserCommandMessage, BashOutputBlock };
