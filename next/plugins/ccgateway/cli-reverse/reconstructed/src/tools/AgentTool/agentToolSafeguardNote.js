/**
 * tools/AgentTool/agentToolSafeguardNote.ts
 *
 * 子代理被 safeguards 拦下时给主线程的说明（含 cyber 类与 Defense Access 引导）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-frs14hy1.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getSwitchModelsOnFlagSetting,
  isRefusalFallbackEnabled,
} from "../../services/api/refusalFallback.js";
import { usesFirstPartyModelIds } from "../../utils/model/providers.js";
import { isCyberVerificationStop } from "../../services/api/errors.js";
import { CYBER_SAFEGUARDS_URL } from "../../services/api/safeguardMessages.js";

//@ chunk-frs14hy1.js:7264-7975 placement
/**
 * 子代理被 safeguards 拦下时给主线程的说明：按是否自动换模型与 cyber 类给出建议与 Defense Access 链接。
 */
function formatSafeguardStop(lastAssistantMessage, canRetry) {
  let stoppedText =
    getSwitchModelsOnFlagSetting() && isRefusalFallbackEnabled()
      ? "Safeguards stopped this agent."
      : "Safeguards stopped this agent, and automatic model switching is off.";
  let isCyber = lastAssistantMessage.message.stop_details?.category === "cyber";
  let adviceText =
    isCyber && canRetry
      ? "For a legitimate task you can start a new agent with a clearer prompt that asks for no more than it needs. The safeguards judge the content, so the same content reworded is likely to be stopped too. Otherwise pass the message above on to the user."
      : "Pass the message above on to the user.";
  let cyberProgramNote =
    isCyber && usesFirstPartyModelIds() && !isCyberVerificationStop(lastAssistantMessage.message.stop_details)
      ? ` Defense Access in the Cyber Verification Program reduces these interruptions: ${CYBER_SAFEGUARDS_URL}`
      : "";
  return `${stoppedText} ${adviceText} Don't do the agent's work yourself: safeguards cover this conversation too.${cyberProgramNote}`;
}
export { formatSafeguardStop };
