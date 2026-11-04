/**
 * components/tasks/AgentViewCommandNotice.tsx
 *
 * 2.1.316 新增。代理视图命令提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */

//@ chunk-18hwfzwa.js:769919-769954 placement
var AGENT_VIEW_COMMAND_NOTICE = "agent-view-command-notice";
//@ chunk-18hwfzwa.js:769954-770485 placement
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
//@ chunk-18hwfzwa.js:770485-770563 placement
function isSameAgentViewCommand(previousCommand, { input, taskId }) {
  return previousCommand !== null && previousCommand.input === input && previousCommand.taskId === taskId;
}
export { AGENT_VIEW_COMMAND_NOTICE, AgentViewCommandNotice, isSameAgentViewCommand };
