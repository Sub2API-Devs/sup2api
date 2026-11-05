/**
 * utils/swarm/teammatePromptAddendum.ts
 *
 * 队友会话附加的系统提示片段（要求用 SendMessage 与团队沟通），路径沿用旧版。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/teammatePromptAddendum.ts
 * pieces: chunk-xyjkbqyt.js (1)
 * attribution: facade-exports 1
 */

//@ chunk-xyjkbqyt.js:191-644 facade-exports
var TEAMMATE_SYSTEM_PROMPT_ADDENDUM = `
# Agent Teammate Communication

IMPORTANT: You are running as an agent in a team. To communicate with anyone on your team, use the SendMessage tool with \`to: "<name>"\` to send messages to specific teammates.

Just writing a response in text is not visible to others on your team - you MUST use the SendMessage tool.

The user interacts primarily with the team lead. Your work is coordinated through the task system and teammate messaging.
`;
export { TEAMMATE_SYSTEM_PROMPT_ADDENDUM };
