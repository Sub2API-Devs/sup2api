/**
 * utils/directMemberMessage.ts
 *
 * @队友 直接消息的解析与发送（写入对方邮箱并提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/directMemberMessage.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: fingerprint 2, placement 2
 */
import { USER } from "./swarm/constants.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { L6s } from "./messages.js";
import { sequential } from "./sequential.js";

//@ chunk-18hwfzwa.js:642027-642202 fingerprint = parseDirectMemberMessage (1)
function parseDirectMemberMessage(input) {
  let match = input.match(/^@([\w-]+)\s+(.+)$/s);
  if (!match) return null;
  let [, D, L] = match;
  if (!D || !L) return null;
  let trimmedMessage = L.trim();
  if (!trimmedMessage) return null;
  return { recipientName: D, message: trimmedMessage };
}
//@ chunk-18hwfzwa.js:642202-642587 fingerprint = sendDirectMemberMessage (0.917)
async function sendDirectMemberMessage(h, x, D, L, ee) {
  if (!D || !L) return { success: !1, error: "no_team_context" };
  if (!Object.values(D.teammates ?? {}).find((Be) => Be.name === h))
    return { success: !1, error: "unknown_recipient", recipientName: h };
  if ((await L(h, { from: USER, text: x, timestamp: new Date().toISOString() }, D.teamName, ee)) === void 0)
    return { success: !1, error: "write_failed", recipientName: h };
  return { success: !0, recipientName: h };
}
//@ chunk-18hwfzwa.js:642587-643211 placement
async function sendDirectMemberMessageAndNotify(h) {
  let x = await sendDirectMemberMessage(
    h.recipientName,
    h.message,
    h.teamContext,
    h.writeToMailbox,
    h.storageV5,
  );
  if (x.success)
    return (
      h.addNotification({
        key: "direct-message-sent",
        kind: "feedback",
        text: `Sent to @${x.recipientName}`,
        priority: "immediate",
        timeoutMs: 3000,
      }),
      h.clearInput(),
      logFeatureOk("input_at_member_message"),
      "handled"
    );
  if (x.error === "write_failed")
    return (
      h.addNotification({
        key: "direct-message-failed",
        kind: "feedback",
        text: `Couldn't write to @${x.recipientName}'s inbox \u2014 message not sent. Try again.`,
        priority: "immediate",
        timeoutMs: 5000,
      }),
      logFeatureBad("input_at_member_message", "mailbox_write_failed"),
      "handled"
    );
  return "fall_through";
}
//@ chunk-18hwfzwa.js:643211-643256 placement
function hA(h) {
  return L6s(h, (x) => sequential.bold(x));
}

export { parseDirectMemberMessage, sendDirectMemberMessageAndNotify, hA };
