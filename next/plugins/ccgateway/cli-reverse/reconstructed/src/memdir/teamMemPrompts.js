/**
 * memdir/teamMemPrompts.ts
 *
 * 团队 + 个人组合记忆的系统提示文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/teamMemPrompts.ts
 * pieces: chunk-82kqcve8.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { sep, join } from "path";
import { readdir } from "fs/promises";
import { isValidKeySegment, STORAGE_SPACES, storageNameSpellings } from "../utils/storage/storageSpaces.js";
import { validateStorageKey } from "../utils/storage/storageKeys.js";
import { getProjectsDir } from "../utils/sessionStoragePortable.js";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { TEAM_MEMORY_SCOPE } from "../utils/auth.js";
import { isENOENT } from "../utils/errors.js";
import {
  memoryIndexDirPrefix,
  DIR_EXISTS_GUIDANCE,
  DIRS_EXIST_GUIDANCE,
  MEMORY_INDEX_FILENAME,
  MAX_ENTRYPOINT_LINES,
} from "./memdir.js";
import {
  memoryVisibilityDefaults,
  MEMORY_CITATION_GUIDANCE,
  RECALLED_MEMORY_CAVEAT,
  MEMORY_TYPES_GUIDANCE,
  MEMORY_DEDUP_GUIDANCE,
  CITING_MEMORIES_SECTION,
} from "./memoryPromptSections.js";
import {
  MEMORY_LINKING_GUIDANCE_2,
  isMemoryLinkingEnabled,
  MEMORY_LINKING_GUIDANCE,
  selectMemoryTypesSection,
  MEMORY_TYPES_SECTION_TEAM,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  STALE_MEMORY_NOTE,
  BEFORE_RECOMMENDING_SECTION,
} from "./memoryTypes.js";
import {
  MEMORY_FILE_SIZE_GUIDE,
  MEMORY_FRONTMATTER_EXAMPLE_TEXT,
  MEMORY_MAINTENANCE_RULES,
} from "../services/extractMemories/prompts.js";
import { MEMORY_WRITING_GUIDE } from "../constants/promptSections.js";
import { canUseTeamMemory, isTeamMemPath, getMemoryDirNfc } from "./teamMemPaths.js";
import { getAutoMemPath } from "./paths.js";
import { HOW_TO_SAVE_MEMORIES_SECTION } from "./memoryStoresPrompt.js";

//@ chunk-82kqcve8.js:125262-125363 placement
/**
 * 从记忆目录路径取出项目键（<project>/memory 形式）。
 */
function projectKeyFromMemoryDir(memoryDir) {
  let parts = projectsRelativeParts(memoryDir);
  if (parts?.length !== 2 || parts[1] !== "memory") return;
  let projectKey = parts[0];
  return isValidKeySegment(projectKey) ? projectKey : undefined;
}
//@ chunk-82kqcve8.js:125573-125790 placement
/**
 * 把挂载目录下的文件路径换成 memory 存储键（逐段校验合法、整体再校验），不在挂载目录下或不合法时返回 undefined。
 */
function storageKeyForMountPath(mount, mountDir, filePath) {
  let mountDirWithSep = mountDir.endsWith(sep) ? mountDir : mountDir + sep;
  if (!filePath.startsWith(mountDirWithSep)) return;
  let parts = filePath.slice(mountDirWithSep.length).split(sep);
  if (!parts.every(isValidKeySegment)) return;
  let storageKey = STORAGE_SPACES.memory(mount.projectKey, [...mount.baseRelPath, ...parts]);
  return validateStorageKey(storageKey) === undefined ? storageKey : undefined;
}
//@ chunk-82kqcve8.js:125913-126057 placement
function projectsRelativeParts(path) {
  let projectsPrefix = getProjectsDir() + sep;
  if (!path.startsWith(projectsPrefix)) return;
  let sliced = path.slice(projectsPrefix.length);
  while (sliced.endsWith(sep)) sliced = sliced.slice(0, -sep.length);
  return sliced.split(sep);
}
//@ chunk-82kqcve8.js:126214-126359 placement
/**
 * 判断目录中没有团队记忆子目录（配置了记忆库时为 false）。
 */
async function isTeamMemoryDirAbsent(autoMemPath) {
  try {
    if ((parseMemoryStoresEnv() ?? []).length > 0) return false;
  } catch {}
  try {
    return !(await readdir(autoMemPath)).some((dirent) =>
      storageNameSpellings(dirent).includes(TEAM_MEMORY_SCOPE),
    );
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-82kqcve8.js:126388-129315 placement
/**
 * 生成团队记忆目录提示段（team/ 只读或可写）
 */
function buildTeamMemoryDirsPrompt(options) {
  let {
    autoDir,
    teamDir,
    skipIndex,
    extraGuidelines,
    citeMemories = false,
    teamMounts,
    noPrivateDir = false,
    rewriteMemoryHygiene = false,
  } = options;
  let filtered = (teamMounts ?? []).filter((teamMount) => teamMount.mode === "rw");
  let dirDescriptions =
    teamDir && teamMounts
      ? teamMounts.map((teamMount) =>
          teamMount.mode === "ro"
            ? `\`${join(teamDir, teamMount.mount)}\` (read-only \u2014 do not write there)`
            : `\`${join(teamDir, teamMount.mount, memoryIndexDirPrefix(teamMount.promptIndex)).replace(/[/\\]+$/, "")}\``,
        )
      : teamDir
        ? [`\`${teamDir}\``]
        : [];
  let hasWritableTeamDir = teamMounts ? filtered.length > 0 : teamDir !== null;
  let teamPrefixes =
    teamDir && teamMounts
      ? filtered.map((teamMount) => `team/${teamMount.mount}/${memoryIndexDirPrefix(teamMount.promptIndex)}`)
      : teamDir
        ? ["team/"]
        : [];
  let teamOnly = noPrivateDir && teamDir !== null && (teamMounts?.length ?? 0) > 0;
  let locationLine = teamOnly
    ? `at ${dirDescriptions.join(" and ")} (shared with all users of this project). ${hasWritableTeamDir ? (dirDescriptions.length > 1 ? "These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence)." : DIR_EXISTS_GUIDANCE) : "Team memory is read-only this session \u2014 you cannot persist new memories."}`
    : dirDescriptions.length > 0
      ? `at \`${autoDir}\` (private to this user) and ${dirDescriptions.join(" and ")} (shared with all users of this project). ${hasWritableTeamDir ? (teamMounts ? "These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence)." : DIRS_EXIST_GUIDANCE) : `Write only to \`${autoDir}\` \u2014 it already exists; write to it directly with the Write tool (do not run mkdir or check for its existence). The shared director${dirDescriptions.length > 1 ? "ies are" : "y is"} read-only and changes there would not persist.`}`
      : `at \`${autoDir}\`. ${DIR_EXISTS_GUIDANCE}`;
  let sharedNote = teamOnly
    ? teamPrefixes.length > 0
      ? ` There is no separate private memory directory in this session \u2014 save every memory type to the team director${dirDescriptions.length > 1 ? "ies, bearing in mind they are" : "y, bearing in mind it is"} shared with teammates. Never write secrets or credentials to team memory.`
      : ""
    : teamPrefixes.length > 0
      ? ` ${memoryVisibilityDefaults("team")} Never write secrets or credentials to the team directory.`
      : "";
  let citationNote = citeMemories ? ` ${MEMORY_CITATION_GUIDANCE}` : "";
  let skipIndexPointer = skipIndex || teamOnly;
  let indexPointerNote = skipIndexPointer
    ? ""
    : `

After writing the file, add a one-line pointer in \`${MEMORY_INDEX_FILENAME}\` (\`- [Title](file.md) \u2014 hook\`). \`${MEMORY_INDEX_FILENAME}\` is the index loaded into context each session \u2014 one line per memory, no frontmatter, never put memory content there.${teamPrefixes.length > 0 ? ` It lives in the private directory and indexes both; use a ${teamPrefixes.map((prefix) => `\`${prefix}\``).join(" or ")} path prefix for team memories.` : ""}`;
  if (teamOnly && !hasWritableTeamDir) {
    let lines = [
      `# Memory

You have a persistent file-based memory ${locationLine} If the user asks you to remember something, explain that memory is read-only in this session.

${RECALLED_MEMORY_CAVEAT}${citationNote}`,
    ];
    if (extraGuidelines?.length) lines.push("", ...extraGuidelines);
    return lines.join(`
`);
  }
  let lines = [
    `# Memory

You have a persistent file-based memory ${locationLine} Each memory is one file holding one fact, with frontmatter:

\`\`\`markdown
---
name: <short-kebab-case-slug>
description: <one-line summary, used to decide relevance during recall>
metadata:
  type: user | feedback | project | reference
---

<the fact; for feedback/project, follow with **Why:** and **How to apply:** lines. Link related memories with [[their-name]].>
\`\`\`

${MEMORY_LINKING_GUIDANCE_2.join(`
`)}${skipIndexPointer ? ` ${MEMORY_FILE_SIZE_GUIDE}` : ""}

${MEMORY_TYPES_GUIDANCE}${sharedNote}${indexPointerNote}

${rewriteMemoryHygiene ? MEMORY_WRITING_GUIDE : `${MEMORY_DEDUP_GUIDANCE} ${RECALLED_MEMORY_CAVEAT}`}${citationNote}${
      isMemoryLinkingEnabled()
        ? `

${MEMORY_LINKING_GUIDANCE}`
        : ""
    }`,
  ];
  if (extraGuidelines?.length) lines.push("", ...extraGuidelines);
  return lines.join(`
`);
}
//@ chunk-82kqcve8.js:132114-132149 placement
/**
 * 判断某路径是否属于团队记忆 store（且团队记忆可用）。
 */
function isTeamMemoryPath(filePath) {
  return canUseTeamMemory() && isTeamMemPath(filePath);
}
//@ chunk-82kqcve8.js:132188-135953 fingerprint (2.1.88 match: buildCombinedMemoryPrompt, 0.748)
/**
 * 团队+个人记忆组合提示（team/ 子目录说明、作用域选择）。
 */
function buildCombinedMemoryPrompt(extraGuidelines, skipIndex = false) {
  let autoDir = getAutoMemPath();
  let teamDir = getMemoryDirNfc();
  let howToSave = skipIndex
    ? HOW_TO_SAVE_MEMORIES_SECTION({
        skipIndex,
        file: "memory to its own file in the chosen directory (private or team, per the type's scope guidance)",
      })
    : [
        "## How to save memories",
        "",
        "Saving a memory is a two-step process:",
        "",
        "**Step 1** \u2014 write the memory to its own file in the chosen directory (private or team, per the type's scope guidance) using this frontmatter format:",
        "",
        ...MEMORY_FRONTMATTER_EXAMPLE_TEXT,
        "",
        `**Step 2** \u2014 add a pointer to that file in \`${MEMORY_INDEX_FILENAME}\` in the private directory. The single \`${MEMORY_INDEX_FILENAME}\` indexes both private and team memories \u2014 use a path like \`file.md\` for private memories and \`team/file.md\` for team memories. Each entry should be one line, under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. It has no frontmatter. Never write memory content directly into \`${MEMORY_INDEX_FILENAME}\`.`,
        "",
        `- \`${MEMORY_INDEX_FILENAME}\` is loaded into your conversation context \u2014 lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        ...MEMORY_MAINTENANCE_RULES,
      ];
  return [
    "# Memory",
    "",
    `You have a persistent, file-based memory system with two directories: a private directory at \`${autoDir}\` and a shared team directory at \`${teamDir}\`. ${DIRS_EXIST_GUIDANCE}`,
    "",
    "You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.",
    "",
    "If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.",
    "",
    "## Memory scope",
    "",
    "There are two scope levels:",
    "",
    `- private: memories that are private between you and the current user. They persist across conversations with only this specific user and are stored at the root \`${autoDir}\`.`,
    `- team: memories that are shared with and contributed by all of the users who work within this project directory. Team memories are synced at the beginning of every session and they are stored at \`${teamDir}\`.`,
    "",
    ...selectMemoryTypesSection(MEMORY_TYPES_SECTION_TEAM),
    ...WHAT_NOT_TO_SAVE_SECTION,
    "- You MUST avoid saving sensitive data within shared team memories. For example, never save API keys or user credentials.",
    "",
    ...howToSave,
    "",
    ...getMemoryLinkingLines(),
    "## When to access memories",
    "- When memories (personal or team) seem relevant, or the user references prior work with them or others in their organization.",
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
    ...(extraGuidelines ?? []),
  ].join(`
`);
}
export {
  projectKeyFromMemoryDir,
  isTeamMemoryDirAbsent,
  projectsRelativeParts,
  buildTeamMemoryDirsPrompt,
  buildCombinedMemoryPrompt,
  isTeamMemoryPath,
  storageKeyForMountPath,
};
