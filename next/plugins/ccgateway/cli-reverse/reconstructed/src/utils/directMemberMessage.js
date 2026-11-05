/**
 * utils/directMemberMessage.ts
 *
 * @队友 直接消息的解析与发送（写入对方邮箱并提示）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/directMemberMessage.ts
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: fingerprint 2, placement 2
 */
import { USER } from "./swarm/constants.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { replaceInlineCodeInModelResult } from "./messages.js";
import { sequential } from "./sequential.js";

//@ chunk-czq1j3j2.js:662708-662883 fingerprint (2.1.88 match: parseDirectMemberMessage, 1)
function parseDirectMemberMessage(input) {
  let match = input.match(/^@([\w-]+)\s+(.+)$/s);
  if (!match) return null;
  let [, recipientName, message] = match;
  if (!recipientName || !message) return null;
  let trimmedMessage = message.trim();
  if (!trimmedMessage) return null;
  return {
    recipientName,
    message: trimmedMessage,
  };
}
//@ chunk-czq1j3j2.js:662883-663268 fingerprint (2.1.88 match: sendDirectMemberMessage, 0.918)
async function sendDirectMemberMessage(recipientName, message, teamContext, writeToMailbox, storageV5) {
  if (!teamContext || !writeToMailbox)
    return {
      success: false,
      error: "no_team_context",
    };
  if (!Object.values(teamContext.teammates ?? {}).find((t) => t.name === recipientName))
    return {
      success: false,
      error: "unknown_recipient",
      recipientName,
    };
  if (
    (await writeToMailbox(
      recipientName,
      {
        from: USER,
        text: message,
        timestamp: new Date().toISOString(),
      },
      teamContext.teamName,
      storageV5,
    )) === undefined
  )
    return {
      success: false,
      error: "write_failed",
      recipientName,
    };
  return {
    success: true,
    recipientName,
  };
}
//@ chunk-czq1j3j2.js:663268-663892 placement
async function sendDirectMemberMessageAndNotify(request) {
  let result = await sendDirectMemberMessage(
    request.recipientName,
    request.message,
    request.teamContext,
    request.writeToMailbox,
    request.storageV5,
  );
  if (result.success) {
    request.addNotification({
      key: "direct-message-sent",
      kind: "feedback",
      text: `Sent to @${result.recipientName}`,
      priority: "immediate",
      timeoutMs: 3000,
    });
    request.clearInput();
    logFeatureOk("input_at_member_message");
    return "handled";
  }
  if (result.error === "write_failed") {
    request.addNotification({
      key: "direct-message-failed",
      kind: "feedback",
      text: `Couldn't write to @${result.recipientName}'s inbox \u2014 message not sent. Try again.`,
      priority: "immediate",
      timeoutMs: 5000,
    });
    logFeatureBad("input_at_member_message", "mailbox_write_failed");
    return "handled";
  }
  return "fall_through";
}
//@ chunk-czq1j3j2.js:663892-663937 placement
function boldDirectMemberMessage(text) {
  return replaceInlineCodeInModelResult(text, (code) => sequential.bold(code));
}
export { boldDirectMemberMessage, parseDirectMemberMessage, sendDirectMemberMessageAndNotify };
