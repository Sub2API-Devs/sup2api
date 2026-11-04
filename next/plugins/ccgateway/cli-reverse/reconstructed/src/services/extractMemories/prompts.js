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
import { join, sep } from "path";
import {
  MEMORY_FRONTMATTER_EXAMPLE_2,
  MEMORY_TYPES,
  selectMemoryTypesSection,
  MEMORY_TYPES_SECTION_TEAM,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  STALE_MEMORY_NOTE,
  BEFORE_RECOMMENDING_SECTION,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:113708-114321 fingerprint (2.1.88 match: buildExtractAutoOnlyPrompt, 0.47)
/**
 * 团队记忆的附加规则（当前为空）。
 */
var MEMORY_FRONTMATTER_EXAMPLE_TEXT; // deferred: uses MEMORY_FRONTMATTER_EXAMPLE_2 (../../memdir/memoryTypes.js) of its import cycle while loading; runs once the cycle is complete
var MEMORY_FILE_SIZE_GUIDE;
var MEMORY_MAINTENANCE_RULES;
var TEAM_MEMORY_RULES;
deferInit("chunk-82kqcve8.js:113708", () => {
  MEMORY_FRONTMATTER_EXAMPLE_TEXT = MEMORY_FRONTMATTER_EXAMPLE_2(MEMORY_TYPES);
  MEMORY_FILE_SIZE_GUIDE = `Keep each memory file under ${formatFileSize(MEMORY_FILE_RECALL_BYTES)} including frontmatter (recall shows only the first ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}) and the description to one specific line; when a file outgrows that, split or summarize it rather than continuing it in a second file.`;
  MEMORY_MAINTENANCE_RULES = [
    "- Keep the name, description, and type fields in memory files up-to-date with the content",
    "- Organize memory semantically by topic, not chronologically",
    "- Update or remove memories that turn out to be wrong or outdated",
    "- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.",
  ];
  TEAM_MEMORY_RULES = [];
});
//@ chunk-82kqcve8.js:135953-141711 callgraph-witnessed (2.1.88 match: buildExtractCombinedPrompt, 0.132)
/**
 * 提取代理的组合提示（个人 + 团队记忆目录）。
 */
function buildExtractCombinedPrompt(memoryDirs, readOnlyDirs, extraSections, autoDir = false) {
  let memoryDirNfc = getMemoryDirNfc();
  let dirPath = (mount) => (join(memoryDirNfc, mount) + sep).normalize("NFC");
  let indexPathOf = (dirEntry) => {
    let indexPrefix = memoryIndexDirPrefix(dirEntry.promptIndex);
    return indexPrefix
      ? join(memoryDirNfc, dirEntry.mount, indexPrefix).normalize("NFC")
      : dirPath(dirEntry.mount);
  };
  let mapped = memoryDirs.map(indexPathOf);
  let mapped_2 = readOnlyDirs.map((dirEntry) => dirPath(dirEntry.mount));
  let isSingle = memoryDirs.length === 1;
  let firstDir = mapped[0];
  let hasWritable = memoryDirs.length > 0;
  let intro = isSingle
    ? `You have a persistent, file-based team memory directory at \`${firstDir}\`. It is synced at the start of every session and shared with the other users who work in this project. ${DIR_EXISTS_GUIDANCE}`
    : hasWritable
      ? `You have a persistent, file-based team memory system with ${mapped.length} directories, each synced and shared with the other users in this project:
${mapped.map((path) => `- \`${path}\``).join(`
`)}
These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).`
      : "You have read-only access to team memory synced from your project. You cannot persist new memories in this session.";
  let readOnlyNote =
    mapped_2.length > 0
      ? [
          "",
          `You also have read-only team memory at ${mapped_2.map((path) => `\`${path}\``).join(", ")}. Read from ${mapped_2.length === 1 ? "it" : "these"} when relevant, but do not write there \u2014 changes will not persist.`,
        ]
      : [];
  let indexNameOf = (dirEntry) => dirEntry.promptIndex ?? MEMORY_INDEX_FILENAME;
  let all = memoryDirs.every((dirEntry) => dirEntry.promptIndex !== undefined);
  let dirPhrase = isSingle
    ? `\`${firstDir}\``
    : `the appropriate team directory (${mapped.map((path) => `\`${path}\``).join(" or ")})`;
  let indexPathFor = (dirEntry) => join(memoryDirNfc, dirEntry.mount, indexNameOf(dirEntry)).normalize("NFC");
  let indexPhrase = isSingle
    ? indexPathFor(memoryDirs[0])
    : `the index file in that same directory (${memoryDirs.map((dirEntry) => `\`${indexPathFor(dirEntry)}\``).join(", ")})`;
  let saveSection = !hasWritable
    ? []
    : autoDir
      ? ((dirPhrase) => [
          "",
          ...HOW_TO_SAVE_MEMORIES_SECTION({
            skipIndex: true,
            file: `memory to its own file in ${dirPhrase}`,
          }),
        ])(dirPhrase)
      : [
          "",
          "## How to save memories",
          "",
          "Saving a memory is a two-step process:",
          "",
          `**Step 1** \u2014 write the memory to its own file in ${dirPhrase} using this frontmatter format:`,
          "",
          ...MEMORY_FRONTMATTER_EXAMPLE_TEXT,
          "",
          `**Step 2** \u2014 add a pointer to that file in ${isSingle ? `\`${indexPhrase}\`` : indexPhrase}. Each entry should be one line, under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. The index has no frontmatter. Never write memory content directly into the index.`,
          "",
          all
            ? `- The index file is loaded into your conversation context \u2014 lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep it concise`
            : "- Keep the index concise so you can scan it quickly when recalling memories",
          `- ${MEMORY_FILE_SIZE_GUIDE}`,
          ...MEMORY_MAINTENANCE_RULES,
        ];
  let skillPaths = [];
  for (let dirEntry of memoryDirs) {
    let skillsDirs = dirEntry.skillsDirs ?? [];
    let skillsDir =
      skillsDirs.find((skillsDir) => firstLineOf(skillsDir, "/") === "channel") ?? skillsDirs[0];
    if (skillsDir === undefined) continue;
    skillPaths.push(
      join(memoryDirNfc, dirEntry.mount, ...skillsDir.split("/"), "<skill-name>", "SKILL.md").normalize(
        "NFC",
      ),
    );
  }
  let skillsSection =
    skillPaths.length > 0
      ? [
          "",
          "## Sharing skills in memories",
          "",
          `A shared memory skill is a \`SKILL.md\` file in the skills folder of shared team memory: ${skillPaths.map((path) => `\`${path}\``).join(" or ")}. Once synced, it loads automatically for everyone who has this shared team memory.`,
          "Only create or edit a shared memory skill when the user explicitly asks \u2014 never proactively. Keep the set small \u2014 fewer than 10 workspace-wide skills and at most 30 in total, each a genuinely reusable, repeatable workflow. If a skills folder grows past that, move unused or low-value skills out of it into regular memory files, so they stay as memories but stop loading as skills.",
          "When a shared memory skill loads, capability frontmatter (`allowed-tools`, `hooks`, `model`, `shell`) is ignored, inline shell (`!` commands) does not run, symlinked files are not loaded, and a `SKILL.md` over 128KB is skipped.",
        ]
      : [];
  return [
    "# Memory",
    "",
    intro,
    ...readOnlyNote,
    ...(hasWritable
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
    ...selectMemoryTypesSection(MEMORY_TYPES_SECTION_TEAM),
    ...(hasWritable
      ? [
          "",
          `There is no separate private memory directory in this session. Save every memory type to ${isSingle ? `\`${firstDir}\`` : "one of the team directories listed above"}, bearing in mind it is shared with teammates.`,
        ]
      : []),
    ...WHAT_NOT_TO_SAVE_SECTION,
    "- You MUST avoid saving sensitive data within shared team memories. For example, never save API keys or user credentials.",
    ...saveSection,
    ...skillsSection,
    "",
    ...getMemoryLinkingLines(),
    "## When to access memories",
    "- When memories seem relevant, or the user references prior work with them or others in their organization.",
    "- You MUST access memory when the user explicitly asks you to check, recall, or remember.",
    "- If the user says to *ignore* or *not use* memory: Do not apply remembered facts, cite, compare against, or mention memory content.",
    STALE_MEMORY_NOTE,
    "",
    ...BEFORE_RECOMMENDING_SECTION,
    "",
    ...CITING_MEMORIES_SECTION(),
    "## Memory and other forms of persistence",
    "Memory is one of several persistence mechanisms available to you as you assist the user in a given conversation. The distinction is often that memory can be recalled in future conversations and should not be used for persisting information that is only useful within the scope of the current conversation.",
    "- When to use or update a plan instead of memory: If you are about to start a non-trivial implementation task and would like to reach alignment with the user on your approach you should use a Plan rather than saving this information to memory. Similarly, if you already have a plan within the conversation and you have changed your approach persist that change by updating the plan rather than saving a memory.",
    "- When to use or update tasks instead of memory: When you need to break your work in current conversation into discrete steps or keep track of your progress use tasks instead of saving to memory. Tasks are great for persisting information about the work that needs to be done in the current conversation, but memory should be reserved for information that will be useful in future conversations.",
    ...(extraSections ?? []),
  ].join(`
`);
}
//@ chunk-xr4xc2mq.js:11072-13452 fingerprint (2.1.88 match: opener, 0.643)
/**
 * 生成记忆提取代理的提示：现有记忆文件清单、可用的只读命令、如何新建/更新/删除记忆。
 */
function buildExtractMemoriesPrompt(
  newMessageCount,
  writtenPaths,
  hasScopeGuidance,
  memoryToolsUnavailable,
  extraLines,
) {
  let hasBash = isBashAvailable();
  let shellToolName = hasBash ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
  let readOnlyExamples = hasBash
    ? "ls/find/cat/stat/wc/head/tail and similar"
    : "Get-ChildItem/Get-Content/Select-Object -First/-Last and similar";
  let rmCommand = hasBash ? "rm" : "Remove-Item";
  let existingFilesSection =
    writtenPaths.length > 0
      ? `

## Existing memory files

${writtenPaths}

Check this list before writing \u2014 update an existing file rather than creating a duplicate.`
      : "";
  let scopeNote = hasScopeGuidance ? "scope guidance, " : "";
  let toolsLine = `Available tools: ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${shellToolName} (${readOnlyExamples}), and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} for paths inside the memory directory only, and ${shellToolName} ${rmCommand} of .md files inside the memory directory only (outside protected subdirectories like .git or agents${hasBash ? "; rm takes no flags except -f" : ""}). All other tools \u2014 MCP, Agent, write-capable ${shellToolName}, etc \u2014 will be denied.`;
  let strategyLine = `You have a limited turn budget. ${FILE_EDIT_TOOL_NAME} requires a prior ${FILE_READ_TOOL_NAME} of the same file, so the efficient strategy is: turn 1 \u2014 issue all ${FILE_READ_TOOL_NAME} calls in parallel for every file you might update; turn 2 \u2014 issue all ${FILE_WRITE_TOOL_NAME}/${FILE_EDIT_TOOL_NAME} calls in parallel. Do not interleave reads and writes across multiple turns.`;
  return [
    `You are now acting as the memory extraction subagent. Analyze the most recent ~${newMessageCount} messages above and use them to update your persistent memory systems.`,
    "",
    toolsLine,
    "",
    strategyLine,
    "",
    `You MUST only use content from the last ~${newMessageCount} messages to update your persistent memories. Do not waste any turns attempting to investigate or verify that content further \u2014 no grepping source files, no reading code to confirm a pattern exists, no git commands.` +
      existingFilesSection,
    "",
    "If nothing is worth saving, output only 'Nothing to save.' Do not explain why.",
    "",
    "If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.",
    "",
    `Apply the memory types, ${scopeNote}what-not-to-save criteria, and frontmatter format from the Memory section of your system prompt \u2014 it is already in your context above.`,
    ...(isMemoryLinkingEnabled()
      ? [
          "",
          "Skip the project-skill upkeep step here: your writes are restricted to the memory directory, so record the correction as a feedback memory only.",
        ]
      : []),
    ...(memoryToolsUnavailable
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
  buildExtractMemoriesPrompt,
  MEMORY_FRONTMATTER_EXAMPLE_TEXT,
  MEMORY_FILE_SIZE_GUIDE,
  TEAM_MEMORY_RULES,
  MEMORY_MAINTENANCE_RULES,
  buildExtractCombinedPrompt,
};
