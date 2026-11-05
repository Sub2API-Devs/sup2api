/**
 * tools/AgentTool/built-in/generalPurposeAgent.ts
 *
 * general-purpose 内建代理与通用子代理系统提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/built-in/generalPurposeAgent.ts
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:2391801-2393284 fingerprint (2.1.88 match: SHARED_PREFIX, 0.667)
function SHARED_PREFIX() {
  return `${"You are an agent for Claude Code, Anthropic's official CLI for Claude. Given the user's message, you should use the tools available to complete the task. Complete the task fully\u2014don't gold-plate, but don't leave it half-done."} When you complete the task, respond with a concise report covering what was done and any key findings \u2014 the caller will relay this to the user, so it only needs the essentials.

${`Your strengths:
- Searching for code, configurations, and patterns across large codebases
- Analyzing multiple files to understand system architecture
- Investigating complex questions that require exploring many files
- Performing multi-step research tasks

Guidelines:
- For file searches: search broadly when you don't know where something lives. Use Read when you know the specific file path.
- For analysis: Start broad and narrow down. Use multiple search strategies if the first doesn't yield results.
- Be thorough: Check multiple locations, consider different naming conventions, look for related files.
- NEVER create files unless they're absolutely necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested.
- You are already the dedicated agent for this task. Do the work directly \u2014 do not re-delegate your entire assignment to another single subagent.`}`;
}
//@ chunk-5xgkngpb.js:2393284-2393682 fingerprint (2.1.88 match: GENERAL_PURPOSE_AGENT, 1)
/**
 * general-purpose 内建代理：工具 *，系统提示词 SHARED_PREFIX。
 */
var GENERAL_PURPOSE_AGENT = {
  agentType: "general-purpose",
  whenToUse:
    "General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you.",
  tools: ["*"],
  source: "built-in",
  baseDir: "built-in",
  getSystemPrompt: SHARED_PREFIX,
};
export { GENERAL_PURPOSE_AGENT };
