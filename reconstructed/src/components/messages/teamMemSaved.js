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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

/**
 * 把一条提示行（NoticeLine，settled 状态）包成消息块，可加上边距。被多种消息组件复用。
 */
//@ chunk-ah34pb7m.js:48071-48347 placement
function NoticeRowMessage(m) {
  let f = w(5),
    { row: row, addMargin: addMargin } = m;
  const g = addMargin ? 1 : 0;
  let h;
  if (f[0] !== row) ((h = e(NoticeLine, { state: "settled", ...row })), (f[0] = row), (f[1] = h));
  else h = f[1];
  let M;
  if (f[2] !== g || f[3] !== h)
    ((M = e(Box, { flexDirection: "column", marginTop: g, width: "100%", children: h })),
      (f[2] = g),
      (f[3] = h),
      (f[4] = M));
  else M = f[4];
  return M;
}
/**
 * 取消息里的动词（字母开头、≤32 字符），否则默认 "Saved"。
 */
//@ chunk-ah34pb7m.js:48347-48449 placement
function getMemorySavedVerb(m) {
  let verb = m.verb;
  return typeof verb === "string" && /^[A-Za-z][A-Za-z-]{0,31}$/.test(verb) ? verb : "Saved";
}
//@ chunk-ah34pb7m.js:48449-48594 fingerprint = teamMemSavedPart (1)
function teamMemSavedPart(message) {
  let teamCount = message.teamCount,
    c = typeof teamCount === "number" ? teamCount : 0;
  if (c === 0) return null;
  return { segment: `${c} team ${c === 1 ? "memory" : "memories"}`, count: c };
}

export { teamMemSavedPart, getMemorySavedVerb, NoticeRowMessage };
