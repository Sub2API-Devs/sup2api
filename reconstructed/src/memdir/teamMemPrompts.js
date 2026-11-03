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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
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
} from "path";
import { readdir, readdir as readdir_2 } from "fs/promises";
import { isValidKeySegment, STORAGE_SPACES, storageNameSpellings } from "../utils/storage/storageSpaces.js";
import { validateStorageKey } from "../utils/storage/storageKeys.js";
import { getProjectsDir } from "../utils/sessionStoragePortable.js";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { isTeamSubscriber_2 } from "../utils/auth.js";
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
  MEMORY_LINKING_GUIDANCE,
  isMemoryLinkingEnabled,
  Yn,
  selectMemoryTypesSection,
  G4t,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  VEn,
  Pst,
} from "./memoryTypes.js";
import { Zn, MEMORY_FRONTMATTER_EXAMPLE_TEXT, Hn } from "../services/extractMemories/prompts.js";
import { CXr } from "../constants/promptSections.js";
import { a4, isTeamMemPath, getMemoryDirNfc } from "./teamMemPaths.js";
import { getAutoMemPath } from "./paths.js";
import { HOW_TO_SAVE_MEMORIES_SECTION } from "./memoryStoresPrompt.js";

/**
 * 从记忆目录路径取出项目键（<project>/memory 形式）。
 */
//@ chunk-82kqcve8.js:125262-125363 placement
function projectKeyFromMemoryDir(e) {
  let n = projectsRelativeParts(e);
  if (n?.length !== 2 || n[1] !== "memory") return;
  let r = n[0];
  return isValidKeySegment(r) ? r : void 0;
}
/**
 * 把挂载目录下的文件路径换成 memory 存储键（逐段校验合法、整体再校验），不在挂载目录下或不合法时返回 undefined。
 */
//@ chunk-82kqcve8.js:125573-125790 placement
function storageKeyForMountPath(mount, mountDir, filePath) {
  let s = mountDir.endsWith(sep_3) ? mountDir : mountDir + sep_3;
  if (!filePath.startsWith(s)) return;
  let parts = filePath.slice(s.length).split(sep_3);
  if (!parts.every(isValidKeySegment)) return;
  let memory = STORAGE_SPACES.memory(mount.projectKey, [...mount.baseRelPath, ...parts]);
  return validateStorageKey(memory) === void 0 ? memory : void 0;
}
//@ chunk-82kqcve8.js:125913-126057 placement
function projectsRelativeParts(e) {
  let n = getProjectsDir() + sep_3;
  if (!e.startsWith(n)) return;
  let sliced = e.slice(n.length);
  while (sliced.endsWith(sep_3)) sliced = sliced.slice(0, -sep_3.length);
  return sliced.split(sep_3);
}
/**
 * 判断目录中没有团队记忆子目录（配置了记忆库时为 false）。
 */
//@ chunk-82kqcve8.js:126214-126359 placement
async function isTeamMemoryDirAbsent(e) {
  try {
    if ((parseMemoryStoresEnv() ?? []).length > 0) return !1;
  } catch {}
  try {
    return !(await readdir(e)).some((r) => storageNameSpellings(r).includes(isTeamSubscriber_2));
  } catch (error) {
    return isENOENT(error);
  }
}
/**
 * 生成团队记忆目录提示段（team/ 只读或可写）
 */
//@ chunk-82kqcve8.js:126388-129315 placement
function buildTeamMemoryDirsPrompt(e) {
  let {
      autoDir: autoDir,
      teamDir: teamDir,
      skipIndex: skipIndex,
      extraGuidelines: extraGuidelines,
      citeMemories: citeMemories = !1,
      teamMounts: teamMounts,
      noPrivateDir: noPrivateDir = !1,
      rewriteMemoryHygiene: rewriteMemoryHygiene = !1,
    } = e,
    filtered = (teamMounts ?? []).filter((se) => se.mode === "rw"),
    P =
      teamDir && teamMounts
        ? teamMounts.map((se) =>
            se.mode === "ro"
              ? `\`${join_6(teamDir, se.mount)}\` (read-only \u2014 do not write there)`
              : `\`${join_6(teamDir, se.mount, memoryIndexDirPrefix(se.promptIndex)).replace(/[/\\]+$/, "")}\``,
          )
        : teamDir
          ? [`\`${teamDir}\``]
          : [],
    L = teamMounts ? filtered.length > 0 : teamDir !== null,
    j =
      teamDir && teamMounts
        ? filtered.map((se) => `team/${se.mount}/${memoryIndexDirPrefix(se.promptIndex)}`)
        : teamDir
          ? ["team/"]
          : [],
    G = noPrivateDir && teamDir !== null && (teamMounts?.length ?? 0) > 0,
    Z = G
      ? `at ${P.join(" and ")} (shared with all users of this project). ${L ? (P.length > 1 ? "These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence)." : DIR_EXISTS_GUIDANCE) : "Team memory is read-only this session \u2014 you cannot persist new memories."}`
      : P.length > 0
        ? `at \`${autoDir}\` (private to this user) and ${P.join(" and ")} (shared with all users of this project). ${L ? (teamMounts ? "These directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence)." : DIRS_EXIST_GUIDANCE) : `Write only to \`${autoDir}\` \u2014 it already exists; write to it directly with the Write tool (do not run mkdir or check for its existence). The shared director${P.length > 1 ? "ies are" : "y is"} read-only and changes there would not persist.`}`
        : `at \`${autoDir}\`. ${DIR_EXISTS_GUIDANCE}`,
    ae = G
      ? j.length > 0
        ? ` There is no separate private memory directory in this session \u2014 save every memory type to the team director${P.length > 1 ? "ies, bearing in mind they are" : "y, bearing in mind it is"} shared with teammates. Never write secrets or credentials to team memory.`
        : ""
      : j.length > 0
        ? ` ${memoryVisibilityDefaults("team")} Never write secrets or credentials to the team directory.`
        : "",
    ee = citeMemories ? ` ${MEMORY_CITATION_GUIDANCE}` : "",
    re = skipIndex || G,
    ce = re
      ? ""
      : `

After writing the file, add a one-line pointer in \`${MEMORY_INDEX_FILENAME}\` (\`- [Title](file.md) \u2014 hook\`). \`${MEMORY_INDEX_FILENAME}\` is the index loaded into context each session \u2014 one line per memory, no frontmatter, never put memory content there.${j.length > 0 ? ` It lives in the private directory and indexes both; use a ${j.map((se) => `\`${se}\``).join(" or ")} path prefix for team memories.` : ""}`;
  if (G && !L) {
    let ye = [
      `# Memory

You have a persistent file-based memory ${Z} If the user asks you to remember something, explain that memory is read-only in this session.

${RECALLED_MEMORY_CAVEAT}${ee}`,
    ];
    if (extraGuidelines?.length) ye.push("", ...extraGuidelines);
    return ye.join(`
`);
  }
  let me = [
    `# Memory

You have a persistent file-based memory ${Z} Each memory is one file holding one fact, with frontmatter:

\`\`\`markdown
---
name: <short-kebab-case-slug>
description: <one-line summary, used to decide relevance during recall>
metadata:
  type: user | feedback | project | reference
---

<the fact; for feedback/project, follow with **Why:** and **How to apply:** lines. Link related memories with [[their-name]].>
\`\`\`

${MEMORY_LINKING_GUIDANCE.join(`
`)}${re ? ` ${Zn}` : ""}

${MEMORY_TYPES_GUIDANCE}${ae}${ce}

${rewriteMemoryHygiene ? CXr : `${MEMORY_DEDUP_GUIDANCE} ${RECALLED_MEMORY_CAVEAT}`}${ee}${
      isMemoryLinkingEnabled()
        ? `

${Yn}`
        : ""
    }`,
  ];
  if (extraGuidelines?.length) me.push("", ...extraGuidelines);
  return me.join(`
`);
}
//@ chunk-82kqcve8.js:132114-132149 placement
function SPe(e) {
  return a4() && isTeamMemPath(e);
}
/**
 * 团队+个人记忆组合提示（team/ 子目录说明、作用域选择）。
 */
//@ chunk-82kqcve8.js:132188-135953 fingerprint = buildCombinedMemoryPrompt (0.748)
function buildCombinedMemoryPrompt(extraGuidelines, skipIndex = !1) {
  let autoDir = getAutoMemPath(),
    teamDir = getMemoryDirNfc(),
    howToSave = skipIndex
      ? HOW_TO_SAVE_MEMORIES_SECTION({
          skipIndex: skipIndex,
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
          ...Hn,
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
    ...selectMemoryTypesSection(G4t),
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
    VEn,
    "",
    ...Pst,
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
  SPe,
  storageKeyForMountPath,
};
