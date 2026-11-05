/**
 * utils/collapseTeammateShutdowns.ts
 *
 * 把多条队友关闭通知合并为 teammate_shutdown_batch
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/collapseTeammateShutdowns.ts
 * pieces: chunk-hnxhr3bs.js (2)
 * attribution: fingerprint 2
 */

//@ chunk-hnxhr3bs.js:124481-124642 fingerprint (2.1.88 match: isTeammateShutdownAttachment, 1)
function isTeammateShutdownAttachment(msg) {
  return (
    msg.type === "attachment" &&
    msg.attachment.type === "task_status" &&
    msg.attachment.taskType === "in_process_teammate" &&
    msg.attachment.status === "completed"
  );
}
//@ chunk-hnxhr3bs.js:124642-124918 fingerprint (2.1.88 match: collapseTeammateShutdowns, 1)
/**
 * 把多条队友关闭通知合并为一个 teammate_shutdown_batch 附件。
 */
function collapseTeammateShutdowns(messages) {
  let result = [];
  let i = 0;
  while (i < messages.length) {
    let msg = messages[i];
    if (isTeammateShutdownAttachment(msg)) {
      let count = 0;
      while (i < messages.length && isTeammateShutdownAttachment(messages[i])) {
        count++;
        i++;
      }
      if (count === 1) result.push(msg);
      else
        result.push({
          type: "attachment",
          uuid: msg.uuid,
          timestamp: msg.timestamp,
          attachment: {
            type: "teammate_shutdown_batch",
            count,
          },
        });
    } else {
      result.push(msg);
      i++;
    }
  }
  return result;
}
export { collapseTeammateShutdowns };
