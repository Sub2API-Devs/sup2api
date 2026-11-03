/**
 * services/extractMemories/prompts.ts
 *
 * 记忆提取代理的提示（现有记忆清单、可用命令、写法规范）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/extractMemories/prompts.ts
 * pieces: chunk-82kqcve8.js (2), chunk-xr4xc2mq.js (1)
 * attribution: fingerprint 2, callgraph-witnessed 1
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
} from "path";
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  MEMORY_TYPES,
  selectMemoryTypesSection,
  G4t,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  VEn,
  Pst,
  isMemoryLinkingEnabled,
} from "../../memdir/memoryTypes.js";
import { formatFileSize } from "../../utils/format.js";
import {
  MEMORY_FILE_RECALL_BYTES,
  memoryIndexDirPrefix,
  DIR_EXISTS_GUIDANCE,
  MEMORY_INDEX_FILENAME,
  MAX_ENTRYPOINT_LINES,
} from "../../memdir/memdir.js";
import { getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { HOW_TO_SAVE_MEMORIES_SECTION } from "../../memdir/memoryStoresPrompt.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { CITING_MEMORIES_SECTION } from "../../memdir/memoryPromptSections.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ, MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";

//@ chunk-82kqcve8.js:113708-114321 fingerprint = buildExtractAutoOnlyPrompt (0.47)
var MEMORY_FRONTMATTER_EXAMPLE_TEXT = MEMORY_FRONTMATTER_EXAMPLE(MEMORY_TYPES),
  Zn = `Keep each memory file under ${formatFileSize(MEMORY_FILE_RECALL_BYTES)} including frontmatter (recall shows only the first ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}) and the description to one specific line; when a file outgrows that, split or summarize it rather than continuing it in a second file.`,
  Hn = [
    "- Keep the name, description, and type fields in memory files up-to-date with the content",
    "- Organize memory semantically by topic, not chronologically",
    "- Update or remove memories that turn out to be wrong or outdated",
    "- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.",
  ],
  Ga = [];
/**
 * 提取代理的组合提示（个人 + 团队记忆目录）。
 */
//@ chunk-82kqcve8.js:135953-141711 callgraph-witnessed = buildExtractCombinedPrompt (0.132)
function buildExtractCombinedPrompt(e, n, r, s = !1) {
  let h = getMemoryDirNfc(),
    y = (ie) => (join_8(h, ie) + sep_5).normalize("NFC"),
    w = (ie) => {
      let he = memoryIndexDirPrefix(ie.promptIndex);
      return he ? join_8(h, ie.mount, he).normalize("NFC") : y(ie.mount);
    },
    mapped = e.map(w),
    mapped_2 = n.map((ie) => y(ie.mount)),
    O = e.length === 1,
    P = mapped[0],
    L = e.length > 0,
    j = O
      ? `You have a persistent, file-based team memory directory at \`${P}\`. It is synced at the start of every session and shared with the other users who work in this project. ${DIR_EXISTS_GUIDANCE}`
      : L
        ? `You have a persistent, file-based team memory system with ${mapped.length} directories, each synced and shared with the other users in this project:
${mapped.map((ie) => `- \`${ie}\``).join(`
`)}
These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).`
        : "You have read-only access to team memory synced from your project. You cannot persist new memories in this session.",
    G =
      mapped_2.length > 0
        ? [
            "",
            `You also have read-only team memory at ${mapped_2.map((ie) => `\`${ie}\``).join(", ")}. Read from ${mapped_2.length === 1 ? "it" : "these"} when relevant, but do not write there \u2014 changes will not persist.`,
          ]
        : [],
    Z = (ie) => ie.promptIndex ?? MEMORY_INDEX_FILENAME,
    all = e.every((ie) => ie.promptIndex !== void 0),
    ee = O ? `\`${P}\`` : `the appropriate team directory (${mapped.map((ie) => `\`${ie}\``).join(" or ")})`,
    re = (ie) => join_8(h, ie.mount, Z(ie)).normalize("NFC"),
    ce = O
      ? re(e[0])
      : `the index file in that same directory (${e.map((ie) => `\`${re(ie)}\``).join(", ")})`,
    me = !L
      ? []
      : s
        ? ((ie) => [
            "",
            ...HOW_TO_SAVE_MEMORIES_SECTION({ skipIndex: !0, file: `memory to its own file in ${ie}` }),
          ])(ee)
        : [
            "",
            "## How to save memories",
            "",
            "Saving a memory is a two-step process:",
            "",
            `**Step 1** \u2014 write the memory to its own file in ${ee} using this frontmatter format:`,
            "",
            ...MEMORY_FRONTMATTER_EXAMPLE_TEXT,
            "",
            `**Step 2** \u2014 add a pointer to that file in ${O ? `\`${ce}\`` : ce}. Each entry should be one line, under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. The index has no frontmatter. Never write memory content directly into the index.`,
            "",
            all
              ? `- The index file is loaded into your conversation context \u2014 lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep it concise`
              : "- Keep the index concise so you can scan it quickly when recalling memories",
            `- ${Zn}`,
            ...Hn,
          ],
    se = [];
  for (let ie of e) {
    let he = ie.skillsDirs ?? [],
      He = he.find((We) => firstLineOf(We, "/") === "channel") ?? he[0];
    if (He === void 0) continue;
    se.push(join_8(h, ie.mount, ...He.split("/"), "<skill-name>", "SKILL.md").normalize("NFC"));
  }
  let ye =
    se.length > 0
      ? [
          "",
          "## Sharing skills in memories",
          "",
          `A shared memory skill is a \`SKILL.md\` file in the skills folder of shared team memory: ${se.map((ie) => `\`${ie}\``).join(" or ")}. Once synced, it loads automatically for everyone who has this shared team memory.`,
          "Only create or edit a shared memory skill when the user explicitly asks \u2014 never proactively. Keep the set small \u2014 fewer than 10 workspace-wide skills and at most 30 in total, each a genuinely reusable, repeatable workflow. If a skills folder grows past that, move unused or low-value skills out of it into regular memory files, so they stay as memories but stop loading as skills.",
          "When a shared memory skill loads, capability frontmatter (`allowed-tools`, `hooks`, `model`, `shell`) is ignored, inline shell (`!` commands) does not run, symlinked files are not loaded, and a `SKILL.md` over 128KB is skipped.",
        ]
      : [];
  return [
    "# Memory",
    "",
    j,
    ...G,
    ...(L
      ? [
          "",
          "You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.",
          "",
          "If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.",
        ]
      : [
          "",
          "If the user asks you to remember something, explain that memory is read-only in this session.",
        ]),
    "",
    ...selectMemoryTypesSection(G4t),
    ...(L
      ? [
          "",
          `There is no separate private memory directory in this session. Save every memory type to ${O ? `\`${P}\`` : "one of the team directories listed above"}, bearing in mind it is shared with teammates.`,
        ]
      : []),
    ...WHAT_NOT_TO_SAVE_SECTION,
    "- You MUST avoid saving sensitive data within shared team memories. For example, never save API keys or user credentials.",
    ...me,
    ...ye,
    "",
    ...getMemoryLinkingLines(),
    "## When to access memories",
    "- When memories seem relevant, or the user references prior work with them or others in their organization.",
    "- You MUST access memory when the user explicitly asks you to check, recall, or remember.",
    "- If the user says to *ignore* or *not use* memory: Do not apply remembered facts, cite, compare against, or mention memory content.",
    VEn,
    "",
    ...Pst,
    "",
    ...CITING_MEMORIES_SECTION(),
    "## Memory and other forms of persistence",
    "Memory is one of several persistence mechanisms available to you as you assist the user in a given conversation. The distinction is often that memory can be recalled in future conversations and should not be used for persisting information that is only useful within the scope of the current conversation.",
    "- When to use or update a plan instead of memory: If you are about to start a non-trivial implementation task and would like to reach alignment with the user on your approach you should use a Plan rather than saving this information to memory. Similarly, if you already have a plan within the conversation and you have changed your approach persist that change by updating the plan rather than saving a memory.",
    "- When to use or update tasks instead of memory: When you need to break your work in current conversation into discrete steps or keep track of your progress use tasks instead of saving to memory. Tasks are great for persisting information about the work that needs to be done in the current conversation, but memory should be reserved for information that will be useful in future conversations.",
    ...(r ?? []),
  ].join(`
`);
}
/**
 * 生成记忆提取代理的提示：现有记忆文件清单、可用的只读命令、如何新建/更新/删除记忆。
 */
//@ chunk-xr4xc2mq.js:11072-13452 fingerprint = opener (0.643)
function buildExtractMemoriesPrompt(e, r, n, o, s) {
  let u = isBashAvailable(),
    y = u ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME,
    h = u
      ? "ls/find/cat/stat/wc/head/tail and similar"
      : "Get-ChildItem/Get-Content/Select-Object -First/-Last and similar",
    x = u ? "rm" : "Remove-Item",
    z =
      r.length > 0
        ? `

## Existing memory files

${r}

Check this list before writing \u2014 update an existing file rather than creating a duplicate.`
        : "",
    w = n ? "scope guidance, " : "",
    S = `Available tools: ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${y} (${h}), and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} for paths inside the memory directory only, and ${y} ${x} of .md files inside the memory directory only (outside protected subdirectories like .git or agents${u ? "; rm takes no flags except -f" : ""}). All other tools \u2014 MCP, Agent, write-capable ${y}, etc \u2014 will be denied.`,
    M = `You have a limited turn budget. ${FILE_EDIT_TOOL_NAME} requires a prior ${FILE_READ_TOOL_NAME} of the same file, so the efficient strategy is: turn 1 \u2014 issue all ${FILE_READ_TOOL_NAME} calls in parallel for every file you might update; turn 2 \u2014 issue all ${FILE_WRITE_TOOL_NAME}/${FILE_EDIT_TOOL_NAME} calls in parallel. Do not interleave reads and writes across multiple turns.`;
  return [
    `You are now acting as the memory extraction subagent. Analyze the most recent ~${e} messages above and use them to update your persistent memory systems.`,
    "",
    S,
    "",
    M,
    "",
    `You MUST only use content from the last ~${e} messages to update your persistent memories. Do not waste any turns attempting to investigate or verify that content further \u2014 no grepping source files, no reading code to confirm a pattern exists, no git commands.` +
      z,
    "",
    "If nothing is worth saving, output only 'Nothing to save.' Do not explain why.",
    "",
    "If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.",
    "",
    `Apply the memory types, ${w}what-not-to-save criteria, and frontmatter format from the Memory section of your system prompt \u2014 it is already in your context above.`,
    ...(isMemoryLinkingEnabled()
      ? [
          "",
          "Skip the project-skill upkeep step here: your writes are restricted to the memory directory, so record the correction as a feedback memory only.",
        ]
      : []),
    ...(o
      ? [
          "",
          `The ${MEMORY_LIST_TOOL_NAME} / ${MEMORY_READ} / ${MEMORY_WRITE} tools are unavailable here, so skip anything the scope guidance marks as shared with the project \u2014 the main conversation saves those; never file them in the personal directory instead. Save only what belongs in your personal memory directory.`,
        ]
      : []),
    ...[],
  ].join(`
`);
}

export {
  MEMORY_FRONTMATTER_EXAMPLE_TEXT,
  Zn,
  Ga,
  Hn,
  buildExtractCombinedPrompt,
  buildExtractMemoriesPrompt,
};
