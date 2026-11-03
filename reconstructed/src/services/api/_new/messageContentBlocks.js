/**
 * services/api/_new/messageContentBlocks.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (1)
 * attribution: sole-consumer-new 1
 */

//@ chunk-g54kbxqw.js:54151-54348 sole-consumer-new
function messageContentBlocks(e) {
  let content = e.message.content;
  if (typeof content !== "string") return content;
  return [
    e.type === "api_system" && e.outputConfig !== void 0
      ? { type: "text", text: content, output_config: e.outputConfig }
      : { type: "text", text: content },
  ];
}

export { messageContentBlocks };
