async function SELF({ model: $l0, isCoordinator: $l1, forkAvailable: $l2, generalPurposeAvailable: $l3, continueAvailable: $l4, leanPrompt: $l5, leanRewrite: $l6, subagentBudgetNote: $l7, modelMix: $l8 }) {
  let $l9 = $m_Zde(), $l10 = $m_Gz({ model: $l0, leanRewrite: $l6 }), $l11 = $l9 && $l2, $l12 = $m_Mht(), $l13 = $m_NQe() ? '\n- When you fan work out in parallel, give each independent lookup `effort: "lower"` \u2014 that is where the step cheaper pays most. More generally, pass `"lower"` for any mechanical, self-checking brief (find-and-report, grep across named files, a pattern you spelled out); pass `"higher"` for a well-specified piece that needs more reasoning than the work around it.' : "", $l14 = `${$m_Nnr}, so choose ${$l11 ? '`"fork"` or ' : ""}one of the listed agent types.`, $l15 = $m_XZe() && $m_yze() ? 'When dispatching two or more agents that will write or edit files in the same repository, give EACH `isolation: "worktree"` \u2014 parallel agents sharing a working directory overwrite each other\'s work.' : "", $l16 = $l11 ? `

## When to fork

Fork yourself (pass \`subagent_type: "fork"\`) when the intermediate tool output isn't worth keeping in your context. The criterion is qualitative \u2014 "will I need this output again" \u2014 not task size. Fork open-ended questions. If research can be broken into independent questions, launch parallel forks in one message. A fork beats a fresh subagent for this \u2014 it inherits context and shares your cache.

Forks are cheap because they share your prompt cache.

**Don't peek.** ${$l12 ? "The tool result includes an `output_file` path \u2014 do not Read or tail it. You get a completion notification" : "A background fork's tool result includes an `output_file` path \u2014 do not Read or tail it. It sends a completion notification"}; trust it. Reading the transcript mid-flight pulls the fork's tool noise into your context, which defeats the point of forking.

**Don't race.** ${$l12 ? "After launching, you know nothing about what the fork found." : "After launching a background fork, you know nothing about what it found."} Never fabricate or predict fork results in any format \u2014 not as prose, summary, or structured output. The notification arrives as a user-role message in a later turn; it is never something you write yourself. If the user asks a follow-up before the notification lands, tell them the fork is still running \u2014 give status, not a guess.

**Writing a fork prompt.** Since the fork inherits your context, the prompt is a *directive* \u2014 what to do, not what the situation is. Be specific about scope: what's in, what's out, what another agent is handling. Don't re-explain background.
` : "", $l17 = `

## Writing the prompt

${$l11 ? "Any agent other than a fork starts with zero context. " : ""}Brief the agent like a smart colleague who just walked into the room \u2014 it hasn't seen this conversation, doesn't know what you've tried, doesn't understand why this task matters.
- Explain what you're trying to accomplish and why.
- Describe what you've already learned or ruled out.
- Give enough context about the surrounding problem that the agent can make judgment calls rather than just following a narrow instruction.
- If you need a short response, say so ("report in under 200 words").
- Lookups: hand over the exact command. Investigations: hand over the question \u2014 prescribed steps become dead weight when the premise is wrong.

${$l11 ? "For fresh agents, terse" : "Terse"} command-style prompts produce shallow, generic work.

**Never delegate understanding.** Don't write "based on your findings, fix the bug" or "based on the research, implement it." Those phrases push synthesis onto the agent instead of doing it yourself. Write prompts that prove you understood: include file paths, line numbers, what specifically to change.`, $l18 = `Example usage:

<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>Forking this \u2014 it's a survey question. I want the punch list, not the git output in my context.</thinking>
${$m_pt}({
  subagent_type: "fork",
  name: "ship-audit",
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
assistant: Ship-readiness audit running.
<commentary>
Turn ends here. The coordinator knows nothing about the findings yet. What follows is a SEPARATE turn \u2014 the notification arrives from outside, as a user-role message. It is not something the coordinator writes.
</commentary>
[later turn \u2014 notification arrives as user message]
assistant: Audit's back. Three blockers: no tests for the new prompt path, GrowthBook gate wired but not in build_flags.yaml, and one uncommitted file.
</example>

<example>
user: "so is the gate wired up or not"
<commentary>
User asks mid-wait. The audit fork was launched to answer exactly this, and it hasn't returned. The coordinator does not have this answer. Give status, not a fabricated result.
</commentary>
assistant: Still waiting on the audit \u2014 that's one of the things it's checking. Should land shortly.
</example>

<example>
user: "Can you get a second opinion on whether this migration is safe?"
assistant: <thinking>I'll ask the code-reviewer agent \u2014 it won't see my analysis, so it can give an independent read.</thinking>
<commentary>
A non-fork subagent_type is specified, so the agent starts fresh. It needs full context in the prompt. The briefing explains what to assess and why.
</commentary>
${$m_pt}({
  name: "migration-review",
  description: "Independent migration review",
  subagent_type: "code-reviewer",
  prompt: "Review migration 0042_user_schema.sql for safety. Context: we're adding a NOT NULL column to a 50M-row table. Existing rows get a backfill default. I want a second opinion on whether the backfill approach is safe under concurrent writes \u2014 I've checked locking behavior but want independent verification. Report: is this safe, and if not, what specifically breaks?"
})
</example>
`, $l19 = $m_bii() && !$l12 && !$m_GX(), $l20 = (!$m_yq() || $m_pSn()) && !$m_GX(), $l21 = `<example>
user: "Can you get a second opinion on whether this migration is safe?"
assistant: <thinking>I'll ask the code-reviewer agent \u2014 it won't see my analysis, so it can give an independent read.</thinking>
${$m_pt}({
  description: "Independent migration review",
  subagent_type: "code-reviewer",
  prompt: "Review migration 0042_user_schema.sql for safety. Context: we're adding a NOT NULL column to a 50M-row table. Existing rows get a backfill default. I want a second opinion on whether the backfill approach is safe under concurrent writes \u2014 I've checked locking behavior but want independent verification. Report: is this safe, and if not, what specifically breaks?"
})
<commentary>
The agent starts with no context from this conversation, so the prompt briefs it: what to assess, the relevant background, and what form the answer should take.
</commentary>
</example>
`, $l22 = `Example usage:

${!$l3 ? "" : $l20 ? `<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>A survey question across git state, tests, and config. I'll delegate it and ask for a short report so the raw command output stays out of my context.</thinking>
${$m_pt}({
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
assistant: Ship-readiness audit running in the background.
<commentary>
The prompt is self-contained: it states the goal, lists what to check, and caps the response length. The agent runs in the background (the default), so the turn ends here \u2014 nothing about its findings is known yet. The report arrives in a SEPARATE turn, as a completion notification from outside; it is never something you write yourself.
</commentary>
[later turn \u2014 notification arrives as user message]
assistant: Audit's back. Three blockers: no tests for the new prompt path, GrowthBook gate wired but not in build_flags.yaml, and one uncommitted file.
</example>

<example>
user: "so is the gate wired up or not"
<commentary>
User asks mid-wait. The audit was launched to answer exactly this, and it hasn't returned. Give status, not a fabricated result.
</commentary>
assistant: Still waiting on the audit \u2014 that's one of the things it's checking. Should land shortly.
</example>

` : `<example>
user: "What's left on this branch before we can ship?"
assistant: <thinking>A survey question across git state, tests, and config. I'll delegate it and ask for a short report so the raw command output stays out of my context.</thinking>
${$m_pt}({
  description: "Branch ship-readiness audit",
  prompt: "Audit what's left before this branch can ship. Check: uncommitted changes, commits ahead of main, whether tests exist, whether the GrowthBook gate is wired up, whether CI-relevant files changed. Report a punch list \u2014 done vs. missing. Under 200 words."
})
<commentary>
The prompt is self-contained: it states the goal, lists what to check, and caps the response length. The agent's report comes back as the tool result; relay the findings to the user.
</commentary>
</example>

`}${$l21}`, $l23 = $m_RM({ model: $l0, leanPrompt: $l5 }), $l24 = $m_lW() === "default", $l25 = $m_UEe() ? `

**Do not spawn agents unless the user asks.** Each spawn starts cold and re-derives context you already have \u2014 it's the expensive path on this plan. A task with "multiple angles," "thorough," or several parts is not a request to spawn; handle it inline with your own tools. Only use this tool when the user explicitly says to use a subagent, or names one of the available agent types.${$m_OK() ? ` This does not cover the \`${$m_Ib}\` agent type where it is listed and you have no ${$m_Qn} tool of your own: it stands in for that tool, so calling it to read a page is ordinary tool use.` : ""}` : "", $l26 = $l10 ? `${$m_Pti($l25, $l11, $l3, $l14)}${$l7 === void 0 ? "" : `

${$l7}`}` : `${$m_Mnr}. Each agent type has specific capabilities and tools available to it.

${$m_s$r}${$l25}

${$l11 ? `When using the ${$m_pt} tool, specify a subagent_type to select an agent: \`"fork"\` forks yourself (the fork inherits your full conversation context and always runs on your model \u2014 a \`model\` override is ignored); ${$l3 ? "any other type \u2014 or omitting it \u2014 starts a fresh agent (general-purpose by default)." : `any other type starts a fresh agent. ${$l14}`}` : `When using the ${$m_pt} tool, specify a subagent_type parameter to select which agent type to use. ${$l3 ? "If omitted, the general-purpose agent is used." : $l14}`}${$l7 === void 0 ? "" : `

${$l7}`}`;
  if ($l1) return $l26;
  let $l27 = $m_QA() && $m_Pd() ? "`grep` via the Bash tool" : `the ${$m_br} tool`, $l28 = $l11 ? "" : `
## When not to use

If the target is already known, use the direct tool: ${$m_Ve} for a known path, ${$l27} for a specific symbol or string. Reserve this tool for open-ended questions that span the codebase, or tasks that match an available agent type.
`;
  if ($l23) {
    let $l29 = $l20 && !$l12 ? "\n- Subagents run in the background by default; you'll be notified when one completes. Pass `run_in_background: false` only when your very next action depends on the result and nothing else could usefully happen while it runs \u2014 otherwise background it so the user can interject. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running." : $l20 && !$l11 ? `
- Subagents run in the background; you'll be notified when one completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running.` : $l19 ? "\n- A subagent runs in the background only if you pass `run_in_background: true`; even then it may run in the foreground or be refused. When one does run in the background, you'll be notified when it completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running." : "", $l30 = $m_GX() ? "\n- `run_in_background` and `name` are unavailable here \u2014 only synchronous subagents." : $m_Rc() ? "\n- `name` is unavailable here \u2014 teammates cannot spawn teammates." : "", $l31 = $m_Mwn() ? '\n- `isolation: "remote"` runs the agent in a remote CCR sandbox (always background).' : "", $l32 = `A previously spawned agent cannot be continued from here; every ${$m_pt} call starts fresh`, $l33 = $l11 ? ' (except subagent_type: "fork", which inherits your context)' : "", $l34 = $l15 ? ` ${$l15} Each result comes back with a branch and worktree path to merge.` : "";
    if ($l10) {
      let $l35 = $l20 && $l11 && $l12 ? $m_Iti : "", $l36 = $l8?.whenToUse ?? $m_rti($l11), $l37 = $l25 || $l36 === "" ? "" : `

${$l36}`, $l38 = $l25 || $l8?.whenToUse !== void 0 ? "" : `

${$m_oti}`, $l39 = $l4 ? $m_Mti($l11) : `${$l32}${$l33}.`, $l40 = `${$l13}${$l31}${$l29}${$l30}`;
      return `${$l26}${$l37}

${$m_Oti($l35)}

${$l39}

${$m_Dti}${$l34}${$l38}${$l40 ? `
${$l40}` : ""}`;
    }
    let $l41 = $l11 ? $l12 ? `

A fork runs in the background and keeps its tool output out of your context. If you are the fork, execute directly \u2014 don't re-delegate. Subagents run in the background; you'll be notified when one completes. Never fabricate or predict a pending agent's results \u2014 the notification is never something you write yourself; if the user asks before it arrives, say it's still running.` : `

A fork keeps its tool output out of your context. If you are the fork, execute directly \u2014 don't re-delegate.` : "", $l42 = $l8?.whenToUse ?? $m_d5t + ($m_NQe() ? ' Several at once is also where `effort: "lower"` pays: if you have decomposed to independent lookups, run each one step cheaper.' : ""), $l43 = $l25 || $l42 === "" ? "" : `

## When to use

${$l42}`;
    return `${$l26}${$l43}${$l41}

- ${$l20 || $l19 ? "The agent's final report is not shown to the user \u2014 relay what matters." : "The agent's final message is returned to you as the tool result; it is not shown to the user \u2014 relay what matters."}
- ${$l4 ? `Use ${$m_In} with the agent's ID or name to continue a previously spawned agent with its context intact; a new ${$m_pt} call starts fresh` : $l32}${$l33}.
- Each agent type's model, reasoning effort, and tools come from its definition (\`.claude/agents/*.md\` frontmatter or SDK \`agents\`).${$l13}
- \`isolation: "worktree"\` gives the agent its own git worktree (auto-cleaned if unchanged).${$l34}${$l31}${$l29}${$l30}`;
  }
  return `${$l26}
${$l28}
## Usage notes

- Always include a short description summarizing what the agent will do
- ${$l20 || $l19 ? "When the agent is done, its final report is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result." : "When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result."}
- Trust but verify: an agent's summary describes what it intended to do, not necessarily what it did. When an agent writes or edits code, check the actual changes before reporting the work as done.${$l20 && !$l12 ? `
- Agents run in the background by default. When an agent runs in the background, you will be automatically notified when it completes \u2014 do NOT sleep, poll, or proactively check on its progress. Continue with other work or respond to the user instead.
- **Foreground vs background**: Pass \`run_in_background: false\` only when your very next action depends on the agent's result and nothing else could usefully happen while it runs \u2014 e.g., a research agent whose finding gates the edit you're about to make. Otherwise let it run in the background (the default) \u2014 this includes fire-and-forget work, independent investigations, and anything where the user might hand you something else in the meantime. Wanting the result "next" is not enough on its own.` : ""}${$l20 && !($l11 && $l12) ? `
- **Don't race**: after launching a background agent, you know nothing about its results. Never fabricate or predict them in any format \u2014 not as prose, summary, or structured output. The completion notification arrives in a later turn; it is never something you write yourself. If the user asks before it lands, say the agent is still running \u2014 give status, not a guess.` : ""}${$l19 ? "\n- **Background agents**: an agent runs in the background only if you pass `run_in_background: true`, and a call that passes it may still run in the foreground or be refused. When an agent does run in the background, the call returns at once without its report, and you will be automatically notified when it completes \u2014 do NOT sleep, poll, or proactively check on its progress. Continue with other work or respond to the user instead. After launching a background agent, you know nothing about its results. Never fabricate or predict them in any format \u2014 not as prose, summary, or structured output. The completion notification arrives in a later turn; it is never something you write yourself. If the user asks before it lands, say the agent is still running \u2014 give status, not a guess." : ""}
- ${$l4 ? `To continue a previously spawned agent, use ${$m_In} with the agent's ID or name as the \`to\` field \u2014 that resumes it with full context. A new ${$m_pt} call` : `A previously spawned agent cannot be continued from here. Every ${$m_pt} call`} starts a fresh agent with no memory of prior runs${$l11 ? ' (except subagent_type: "fork")' : ""}, so the prompt must be self-contained.
- Each agent type's model, reasoning effort, and tool access are set in its definition (\`.claude/agents/*.md\` frontmatter, or the SDK \`agents\` option)${$m_i.CLAUDE_CODE_SUBAGENT_MODEL_FORCE ? "" : "; the `model` parameter here overrides the definition for this one call"}.${$l13}
- Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since a fresh agent is not aware of the user's intent${$l24 ? `
- If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first.
- If the user specifies that they want you to run agents "in parallel", you MUST send a single message with multiple ${$m_pt} tool use content blocks. For example, if you need to launch both a build-validator agent and a test-runner agent in parallel, send a single message with both tool calls.` : ""}
- With \`isolation: "worktree"\`, the worktree is automatically cleaned up if the agent makes no changes; otherwise the path and branch are returned in the result.${$l15 ? `
- ${$l15}` : ""}${$m_Mwn() ? '\n- You can set `isolation: "remote"` to run the agent in a remote CCR environment. This is always a background task; you\'ll be notified when it completes. Use for long-running tasks that need a fresh sandbox.' : ""}${$m_GX() ? `
- The run_in_background and name parameters are not available in this context. Only synchronous subagents are supported.` : $m_Rc() ? `
- The name parameter is not available in this context \u2014 teammates cannot spawn other teammates. Omit it to spawn a subagent.` : ""}${$l16}${$l17}

${$l11 ? $l18 : $l22}`;
}
;
