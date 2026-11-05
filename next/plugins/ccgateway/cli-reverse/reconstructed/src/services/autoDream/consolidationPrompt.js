/**
 * services/autoDream/consolidationPrompt.ts
 *
 * dream 整理代理的提示（合并、去重、与 CLAUDE.md 对齐、团队记忆段）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/autoDream/consolidationPrompt.ts
 * pieces: chunk-arvn22xd.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { DIR_EXISTS_GUIDANCE, MEMORY_INDEX_FILENAME, MAX_ENTRYPOINT_LINES } from "../../memdir/memdir.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ, MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";

//@ chunk-arvn22xd.js:1348-3670 affinity
/**
 * dream 提示词里“把记忆与 CLAUDE.md 对照”的段落：记忆过时就删或改写，CLAUDE.md 过时只标注不修改，不算冲突就保留。
 */
var TEAM_MEMORY_DREAM_SECTION =
  "## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.";
var CLAUDE_MD_DREAM_SECTION = `### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;
//@ chunk-arvn22xd.js:3670-6613 fingerprint (2.1.88 match: buildConsolidationPrompt, 0.585)
/**
 * dream 整理提示：合并重复、删除过时、与 CLAUDE.md 对齐、可选团队记忆段。
 */
function buildConsolidationPrompt(
  autoMemDir,
  transcriptDir,
  extra,
  includeTeamMemorySection = false,
  memoryToolsUnavailable = false,
  unusedFlag = false,
) {
  return `# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${autoMemDir}\`
${DIR_EXISTS_GUIDANCE}

Session transcripts: \`${transcriptDir}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${
  includeTeamMemorySection
    ? `
${TEAM_MEMORY_DREAM_SECTION}
`
    : ""
}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
- Read \`${MEMORY_INDEX_FILENAME}\` to understand the current index
- Skim existing topic files so you improve them rather than creating duplicates
- If a \`sessions/\` subdirectory exists, review recent entries there

## Phase 2 \u2014 Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Existing memories that drifted** \u2014 facts that contradict something you see in the codebase now
2. **Transcript search** \u2014 if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${transcriptDir}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 \u2014 Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format and type conventions from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${memoryToolsUnavailable ? ` The ${MEMORY_LIST_TOOL_NAME} / ${MEMORY_READ} / ${MEMORY_WRITE} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.` : ""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

## Phase 4 \u2014 Prune and index

Update \`${MEMORY_INDEX_FILENAME}\` so it stays under ${MAX_ENTRYPOINT_LINES} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one

${CLAUDE_MD_DREAM_SECTION}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${
    extra
      ? `

## Additional context

${extra}`
      : ""
  }`;
}
export { buildConsolidationPrompt };
