/**
 * components/messages/teamMemSaved.ts
 *
 * "N team memories saved" 文案片段。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/teamMemSaved.ts
 * pieces: chunk-wjygkcr4.js (3)
 * attribution: placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-wjygkcr4.js:48687-48963 placement
/**
 * 把一条提示行（NoticeLine，settled 状态）包成消息块，可加上边距。被多种消息组件复用。
 */
function NoticeRowMessage(props) {
  let $ = useMemoCache(5);
  let { row, addMargin } = props;
  const marginTop = addMargin ? 1 : 0;
  let children;
  if ($[0] !== row) {
    children = jsxProd_default(NoticeLine, {
      state: "settled",
      ...row,
    });
    $[0] = row;
    $[1] = children;
  } else children = $[1];
  let rowBox;
  if ($[2] !== marginTop || $[3] !== children) {
    rowBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children,
    });
    $[2] = marginTop;
    $[3] = children;
    $[4] = rowBox;
  } else rowBox = $[4];
  return rowBox;
}
//@ chunk-wjygkcr4.js:48963-49065 placement
/**
 * 取消息里的动词（字母开头、≤32 字符），否则默认 "Saved"。
 */
function getMemorySavedVerb(row) {
  let verb = row.verb;
  return typeof verb === "string" && /^[A-Za-z][A-Za-z-]{0,31}$/.test(verb) ? verb : "Saved";
}
//@ chunk-wjygkcr4.js:49065-49210 fingerprint (2.1.88 match: teamMemSavedPart, 1)
function teamMemSavedPart(message) {
  let teamCount = message.teamCount;
  let count = typeof teamCount === "number" ? teamCount : 0;
  if (count === 0) return null;
  return {
    segment: `${count} team ${count === 1 ? "memory" : "memories"}`,
    count,
  };
}
export { NoticeRowMessage, getMemorySavedVerb, teamMemSavedPart };
