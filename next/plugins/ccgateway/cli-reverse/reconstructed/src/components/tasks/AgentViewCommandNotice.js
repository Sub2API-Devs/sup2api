/**
 * components/tasks/AgentViewCommandNotice.tsx
 *
 * 2.1.316 新增。代理视图命令提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-czq1j3j2.js:802344-802379 placement
var AGENT_VIEW_COMMAND_NOTICE = "agent-view-command-notice";
//@ chunk-czq1j3j2.js:802379-802910 placement
function AgentViewCommandNotice(command, { invokedAs, isTeammate }) {
  let viewKindLabel = isTeammate ? "teammate" : "agent";
  switch (command.name) {
    case "model":
    case "fast": {
      let targetOwnerLabel = isTeammate ? "the team lead" : "the main conversation";
      let settingLabel = command.name === "model" ? "model" : "fast mode";
      return {
        onSubmit: "block",
        segments: [
          {
            text: `/${invokedAs} changes ${targetOwnerLabel}'s ${settingLabel}, not this ${viewKindLabel}'s`,
          },
        ],
      };
    }
    case "compact":
    case "clear":
    case "rewind": {
      let targetConversationLabel = isTeammate ? "the team lead's conversation" : "the main conversation";
      return {
        onSubmit: "confirm",
        commandName: command.name,
        title: `/${invokedAs} acts on ${targetConversationLabel}, not this ${viewKindLabel}`,
        confirmLabel: `Run /${invokedAs} on ${targetConversationLabel}`,
      };
    }
    default:
      return;
  }
}
//@ chunk-czq1j3j2.js:802910-802988 placement
function isSameAgentViewCommand(previousCommand, { input, taskId }) {
  return previousCommand !== null && previousCommand.input === input && previousCommand.taskId === taskId;
}
export { AGENT_VIEW_COMMAND_NOTICE, AgentViewCommandNotice, isSameAgentViewCommand };
