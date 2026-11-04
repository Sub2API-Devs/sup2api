function SELF($l0) {
  let $l1 = ($l0?.ownEntrypoint ? void 0 : $m_Qte()) ?? $m_i.CLAUDE_CODE_ENTRYPOINT ?? "cli", $l2 = process.env.CLAUDE_AGENT_SDK_VERSION ? `, agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}` : "", $l3 = $m_i.CLAUDE_AGENT_SDK_CLIENT_APP ? `, client-app/${$m_i.CLAUDE_AGENT_SDK_CLIENT_APP}` : "", $l4 = $m_edr(), $l5 = $l4 ? `, workload/${$l4}` : "";
  return `claude-cli/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (external, ${$l1}${$l2}${$l3}${$l5})`;
}
;
