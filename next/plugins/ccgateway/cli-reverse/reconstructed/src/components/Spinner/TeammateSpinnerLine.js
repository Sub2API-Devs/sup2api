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
function isObject(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-a76knw89.js:19265-19316 sole-consumer
function toSpinnerLine(value) {
  return typeof value === "string" ? wireName(value) : value;
}
//@ chunk-a76knw89.js:19316-19845 fingerprint (2.1.88 match: getMessagePreview, 0.334)
function getMessagePreview(messages) {
  if (Array.isArray(messages)) return messages.map(getMessagePreview);
  if (!isObject(messages)) return messages;
  let line = {};
  for (let key of Object.keys(messages)) {
    let messages_2 = messages[key];
    line[key] =
      key === "input"
        ? messages_2
        : key === "exclude_tools" && Array.isArray(messages_2)
          ? messages_2.map(toSpinnerLine)
          : getMessagePreview(messages_2);
  }
  switch (line.type) {
    case "tool_use":
      return {
        ...line,
        name: typeof line.name === "string" ? internalToolNameFor(line.name) : line.name,
      };
    case "tool_reference":
      return {
        ...line,
        ...("name" in line && {
          name: toSpinnerLine(line.name),
        }),
        ...("tool_name" in line && {
          tool_name: toSpinnerLine(line.tool_name),
        }),
      };
    case "tool_definition":
      return isObject(line.definition)
        ? {
            ...line,
            definition: {
              ...line.definition,
              name: toSpinnerLine(line.definition.name),
            },
          }
        : line;
    default:
      return line;
  }
}
export { getMessagePreview };
