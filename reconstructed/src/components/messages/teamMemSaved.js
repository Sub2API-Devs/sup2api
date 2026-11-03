/**
 * components/messages/teamMemSaved.ts
 *
 * "N team memories saved" 文案片段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/teamMemSaved.ts
 * pieces: chunk-ah34pb7m.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:48071-48347 placement
/**
 * 把一条提示行（NoticeLine，settled 状态）包成消息块，可加上边距。被多种消息组件复用。
 */
function NoticeRowMessage(props) {
  let f = w(5);
  let { row, addMargin } = props;
  const marginTop = addMargin ? 1 : 0;
  let children;
  if (f[0] !== row) {
    children = jsxProd_default(NoticeLine, {
      state: "settled",
      ...row,
    });
    f[0] = row;
    f[1] = children;
  } else children = f[1];
  let M;
  if (f[2] !== marginTop || f[3] !== children) {
    M = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children,
    });
    f[2] = marginTop;
    f[3] = children;
    f[4] = M;
  } else M = f[4];
  return M;
}
//@ chunk-ah34pb7m.js:48347-48449 placement
/**
 * 取消息里的动词（字母开头、≤32 字符），否则默认 "Saved"。
 */
function getMemorySavedVerb(m) {
  let verb = m.verb;
  return typeof verb === "string" && /^[A-Za-z][A-Za-z-]{0,31}$/.test(verb) ? verb : "Saved";
}
//@ chunk-ah34pb7m.js:48449-48594 fingerprint = teamMemSavedPart (1)
function teamMemSavedPart(message) {
  let teamCount = message.teamCount;
  let count = typeof teamCount === "number" ? teamCount : 0;
  if (count === 0) return null;
  return {
    segment: `${count} team ${count === 1 ? "memory" : "memories"}`,
    count,
  };
}
export { teamMemSavedPart, getMemorySavedVerb, NoticeRowMessage };
