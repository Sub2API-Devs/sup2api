/**
 * components/agents/new-agent-creation/wizard-steps/ConfirmStep.tsx
 *
 * 向导确认步骤；实际内容为 Vertex AI 配置保存确认（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ConfirmStep.tsx
 * pieces: chunk-8wvtd8sr.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-8wvtd8sr.js:382724-382848 fingerprint = _temp (0.589)
function formatQuotedNameList(toolNames) {
  let mapped = toolNames.map((s) => `"${s}"`);
  return mapped.length <= 2
    ? mapped.join(" and ")
    : `${mapped.slice(0, -1).join(", ")}, and ${mapped.at(-1)}`;
}

export { formatQuotedNameList };
