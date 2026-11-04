function SELF() {
  let $l0 = process.env.CLAUDE_AGENT_SDK_VERSION ? `, agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}` : "", $l1 = $m_a.CLAUDE_AGENT_SDK_CLIENT_APP ? `, client-app/${$m_a.CLAUDE_AGENT_SDK_CLIENT_APP}` : "", $l2 = $m_nXn(), $l3 = $l2 ? `, workload/${$l2}` : "";
  return `claude-cli/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.304", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-19T18:11:48Z", GIT_SHA: "17ab70404e5b632fe060207effb0b440788363ba", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (external, ${$m_TY() ?? $m_a.CLAUDE_CODE_ENTRYPOINT ?? "cli"}${$l0}${$l1}${$l3})`;
}
;
