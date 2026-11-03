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
function AgentViewCommandNotice(h, { invokedAs: invokedAs, isTeammate: isTeammate }) {
  let L = isTeammate ? "teammate" : "agent";
  switch (h.name) {
    case "model":
    case "fast": {
      let ee = isTeammate ? "the team lead" : "the main conversation",
        ke = h.name === "model" ? "model" : "fast mode";
      return {
        onSubmit: "block",
        segments: [{ text: `/${invokedAs} changes ${ee}'s ${ke}, not this ${L}'s` }],
      };
    }
    case "compact":
    case "clear":
    case "rewind": {
      let ee = isTeammate ? "the team lead's conversation" : "the main conversation";
      return {
        onSubmit: "confirm",
        commandName: h.name,
        title: `/${invokedAs} acts on ${ee}, not this ${L}`,
        confirmLabel: `Run /${invokedAs} on ${ee}`,
      };
    }
    default:
      return;
  }
}
//@ chunk-18hwfzwa.js:770485-770563 placement
function Jfe(h, { input: input, taskId: taskId }) {
  return h !== null && h.input === input && h.taskId === taskId;
}

export { AGENT_VIEW_COMMAND_NOTICE, AgentViewCommandNotice, Jfe };
