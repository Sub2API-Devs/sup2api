/**
 * components/Spinner/TeammateSpinnerLine.tsx
 *
 * 队友 Spinner 行：取队友最新消息预览。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/TeammateSpinnerLine.tsx
 * pieces: chunk-a76knw89.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { wireName, internalToolNameFor } from "../../services/mcp/serverIdentity.js";

//@ chunk-a76knw89.js:19213-19265 sole-consumer
function isObject(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-a76knw89.js:19265-19316 sole-consumer
function toSpinnerLine(e) {
  return typeof e === "string" ? wireName(e) : e;
}
//@ chunk-a76knw89.js:19316-19845 fingerprint = getMessagePreview (0.334)
function getMessagePreview(messages) {
  if (Array.isArray(messages)) return messages.map(getMessagePreview);
  if (!isObject(messages)) return messages;
  let n = {};
  for (let key of Object.keys(messages)) {
    let messages_2 = messages[key];
    n[key] =
      key === "input"
        ? messages_2
        : key === "exclude_tools" && Array.isArray(messages_2)
          ? messages_2.map(toSpinnerLine)
          : getMessagePreview(messages_2);
  }
  switch (n.type) {
    case "tool_use":
      return {
        ...n,
        name: typeof n.name === "string" ? internalToolNameFor(n.name) : n.name,
      };
    case "tool_reference":
      return {
        ...n,
        ...("name" in n && {
          name: toSpinnerLine(n.name),
        }),
        ...("tool_name" in n && {
          tool_name: toSpinnerLine(n.tool_name),
        }),
      };
    case "tool_definition":
      return isObject(n.definition)
        ? {
            ...n,
            definition: {
              ...n.definition,
              name: toSpinnerLine(n.definition.name),
            },
          }
        : n;
    default:
      return n;
  }
}
export { getMessagePreview };
