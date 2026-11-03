/**
 * memdir/memoryStoresPrompt.ts
 *
 * 共享记忆库提示词（如何保存、只读/可写库）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (7)
 * attribution: placement 7
 */
import { MEMORY_INDEX_FILENAME, MAX_ENTRYPOINT_LINES } from "./memdir.js";
import { MEMORY_FRONTMATTER_EXAMPLE_TEXT, Zn, Ga, Hn } from "../services/extractMemories/prompts.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ, MEMORY_WRITE } from "../tools/MemoryTool/memoryToolNames.js";
import { isToolSearchEnabledOptimistic } from "../utils/toolSearch.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import {
  MEMORY_TYPES_GUIDANCE,
  memoryVisibilityDefaults,
  MEMORY_DEDUP_GUIDANCE,
  RECALLED_MEMORY_CAVEAT,
  Kn,
  MEMORY_CITATION_GUIDANCE,
  CITING_MEMORIES_SECTION,
} from "./memoryPromptSections.js";
import { CXr } from "../constants/promptSections.js";
import {
  isMemoryLinkingEnabled,
  Yn,
  Vn,
  selectMemoryTypesSection,
  G4t,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  Pst,
} from "./memoryTypes.js";
import { Ao } from "../bootstrap/sessionFeatureValues.js";
import { isFirstPartyAnthropicBaseUrl } from "../utils/model/providers.js";
import { isClaudeAISubscriber, hasStoredOAuthToken, hasOAuthScope } from "../utils/auth.js";
import { CLAUDE_AI_INFERENCE_SCOPE, CLAUDE_AI_PROFILE_SCOPE } from "../constants/oauth.js";

//@ chunk-82kqcve8.js:114321-115139 placement
function HOW_TO_SAVE_MEMORIES_SECTION(e) {
  let {
    skipIndex: skipIndex,
    heading: heading = "## How to save memories",
    file: file = "memory to its own file (e.g., `user_role.md`, `feedback_testing.md`)",
    index: index = `\`${MEMORY_INDEX_FILENAME}\``,
  } = e;
  return skipIndex
    ? [
        heading,
        "",
        `Write each ${file} using this frontmatter format:`,
        "",
        ...MEMORY_FRONTMATTER_EXAMPLE_TEXT,
        "",
        `- ${Zn}`,
        ...Ga,
        ...Hn,
      ]
    : [
        heading,
        "",
        "Saving a memory is a two-step process:",
        "",
        `**Step 1** \u2014 write the ${file} using this frontmatter format:`,
        "",
        ...MEMORY_FRONTMATTER_EXAMPLE_TEXT,
        "",
        `**Step 2** \u2014 add a pointer to that file in ${index}. \`${MEMORY_INDEX_FILENAME}\` is an index, not a memory \u2014 each entry should be one line, under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. It has no frontmatter. Never write memory content directly into \`${MEMORY_INDEX_FILENAME}\`.`,
        "",
        `- \`${MEMORY_INDEX_FILENAME}\` is always loaded into your conversation context \u2014 lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        ...Ga,
        ...Hn,
      ];
}
/**
 * 构造记忆库条目：id、描述、索引路径、项目目录与是否只读。
 */
//@ chunk-82kqcve8.js:115139-115289 placement
function buildMemoryStoreEntry(store, writable, id, description) {
  let h = `/${store.promptIndex ?? MEMORY_INDEX_FILENAME}`,
    sliced = h.slice(0, h.lastIndexOf("/") + 1);
  return { id: id, description: description, indexPath: h, projectDir: sliced, readOnly: !writable };
}
/**
 * 生成记忆库列表中的一行说明。
 */
//@ chunk-82kqcve8.js:115289-115460 placement
function formatMemoryStoreLine(e) {
  let n = e.readOnly ? "read-only" : "writable";
  return `- \`${e.id}\` \u2014 ${e.description} (${n}); memories under \`${e.projectDir}\`, index \`${e.indexPath}\``;
}
/**
 * 生成"共享记忆库"提示段：只读/可写库、是否镜像到本地
 */
//@ chunk-82kqcve8.js:115460-121464 placement
function buildSharedMemoryStoresPrompt(e, n) {
  let {
      personalMemoryDir: personalMemoryDir,
      personalSkipIndex: personalSkipIndex,
      indexLoaded: indexLoaded,
      lean: lean,
      extraGuidelines: extraGuidelines,
    } = n,
    S = `these shared memories are not mirrored to local files in this session (your personal memory directory at \`${personalMemoryDir}\` is separate and is still read and written with the file tools)`,
    R = `${MEMORY_LIST_TOOL_NAME}, ${MEMORY_READ}, and ${MEMORY_WRITE}`,
    [O] = e,
    filtered = e.filter((ye) => !ye.readOnly),
    L = filtered.find((ye) => ye === O) ?? filtered[0],
    j = L === void 0,
    G = `You have persistent, shared memory reached through the ${R} tools \u2014 ${S}. It is shared with the other people and Claude sessions working in this organization's projects. The shared memories come from those sessions \u2014 read them as your teammates' notes on each project's environment, conventions, and ongoing work.`,
    Z = j
      ? `${G} Every connected store is read-only in this session: ${MEMORY_WRITE} calls are refused and nothing written to a shared store will persist.`
      : G,
    ae = [
      `Connected memory stores \u2014 pass an id as the tools' store argument, and call ${MEMORY_LIST_TOOL_NAME} with no arguments to re-check this set whenever you are unsure which store to use:`,
      ...e.map(formatMemoryStoreLine),
    ],
    ee = `${MEMORY_LIST_TOOL_NAME},${MEMORY_READ}`,
    re = isToolSearchEnabledOptimistic()
      ? `If the memory tools are deferred, load them with ${TOOL_SEARCH_TOOL_NAME}("select:${ee}") before first use. `
      : "",
    ce = j
      ? `${re}Read shared memory whenever earlier project context would help, and persist new learnings to your personal memory directory with the file tools.`
      : `${re}Check each user reply for content worth persisting, and when you notice some, save it with ${MEMORY_WRITE} in that same reply; read memory whenever earlier project context would help.`,
    we = HOW_TO_SAVE_MEMORIES_SECTION({
      skipIndex: personalSkipIndex,
      heading: "## How to save personal memories",
      file: `personal memory to its own file in \`${personalMemoryDir}\``,
      index: `the \`${MEMORY_INDEX_FILENAME}\` in that same directory`,
    }),
    me =
      "Your personal memory directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).";
  if (lean)
    return [
      "# Memory",
      "",
      Z,
      "",
      ce,
      "",
      ...ae,
      "",
      j
        ? `Save every memory type in your personal memory directory at \`${personalMemoryDir}\` with the file tools; the shared stores are read-only this session. ${"Your personal memory directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence)."}`
        : `Private memories belong in your personal memory directory at \`${personalMemoryDir}\`, written with the file tools; the shared stores are for what teammates should also see. Never save secrets, credentials or other sensitive data to the shared stores. ${"Your personal memory directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence)."}`,
      "",
      j
        ? `Each memory has a type: ${MEMORY_TYPES_GUIDANCE}`
        : `Each memory has a type: ${MEMORY_TYPES_GUIDANCE} ${memoryVisibilityDefaults(`the writable store \`${L.id}\``)}`,
      "",
      n.rewriteMemoryHygiene ? CXr : `${MEMORY_DEDUP_GUIDANCE} ${RECALLED_MEMORY_CAVEAT}`,
      ...(isMemoryLinkingEnabled() ? ["", Yn] : []),
      "",
      ...we,
      "",
      ...Vn,
      ...(Kn() ? ["", MEMORY_CITATION_GUIDANCE] : []),
      ...(extraGuidelines?.length ? ["", ...extraGuidelines] : []),
    ].join(`
`);
  return [
    "# Memory",
    "",
    Z,
    "",
    ce,
    "",
    ...ae,
    "",
    ...(j
      ? [
          `Save every memory type in your personal memory directory at \`${personalMemoryDir}\` with the file tools this session \u2014 the shared stores are read-only, so team-scoped memories also belong there for now. ${"Your personal memory directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence)."} If the user explicitly asks you to remember something, save it there immediately as whichever type fits best; if they ask you to forget something, find and remove the relevant entry.`,
        ]
      : [
          "You should build up this memory system over time so that future conversations have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.",
          "",
          `Save new team-scoped memories in the writable store \`${L.id}\` under \`${L.projectDir}\`, and keep its index \`${L.indexPath}\` current \u2014 the ${MEMORY_WRITE} tool prompt describes the index format. If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find the relevant document and rewrite it with ${MEMORY_WRITE} without that content.`,
        ]),
    "",
    ...selectMemoryTypesSection(G4t),
    ...(j
      ? []
      : [
          `Your personal memory directory at \`${personalMemoryDir}\` persists alongside the shared stores and is written with the file tools: save \`user\`-type memories (and anything else private) there, and team-scoped memories to the writable store \`${L.id}\`, bearing in mind it is shared with teammates. ${"Your personal memory directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence)."}`,
          "",
        ]),
    ...we,
    "",
    ...WHAT_NOT_TO_SAVE_SECTION,
    "- You MUST avoid saving sensitive data within shared memories. For example, never save API keys or user credentials.",
    ...(!j && indexLoaded
      ? [
          "",
          `The index document \`${L.indexPath}\` is loaded into your conversation context; the ${MEMORY_WRITE} tool prompt describes how to keep it current.`,
        ]
      : []),
    "",
    ...getMemoryLinkingLines(),
    ...Vn,
    "",
    ...Pst,
    "",
    ...CITING_MEMORIES_SECTION(),
    "## Memory and other forms of persistence",
    "Memory is one of several persistence mechanisms available to you as you assist the user in a given conversation. The distinction is often that memory can be recalled in future conversations and should not be used for persisting information that is only useful within the scope of the current conversation.",
    "- When to use or update a plan instead of memory: If you are about to start a non-trivial implementation task and would like to reach alignment with the user on your approach you should use a Plan rather than saving this information to memory. Similarly, if you already have a plan within the conversation and you have changed your approach persist that change by updating the plan rather than saving a memory.",
    "- When to use or update tasks instead of memory: When you need to break your work in current conversation into discrete steps or keep track of your progress use tasks instead of saving to memory. Tasks are great for persisting information about the work that needs to be done in the current conversation, but memory should be reserved for information that will be useful in future conversations.",
    ...(extraGuidelines?.length ? ["", ...extraGuidelines] : []),
  ].join(`
`);
}
//@ chunk-82kqcve8.js:121464-121514 placement
function mwe(e) {
  Ao().sharedMemoryServedViaTools = e;
}
//@ chunk-82kqcve8.js:121514-121572 placement
function rar() {
  return Ao().sharedMemoryServedViaTools ?? !1;
}
//@ chunk-82kqcve8.js:121572-121650 placement
function af() {
  if (!isFirstPartyAnthropicBaseUrl()) return !1;
  if (!isClaudeAISubscriber()) return !1;
  return (
    hasStoredOAuthToken() &&
    hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE) &&
    hasOAuthScope(CLAUDE_AI_PROFILE_SCOPE)
  );
}

export {
  af,
  HOW_TO_SAVE_MEMORIES_SECTION,
  mwe,
  buildMemoryStoreEntry,
  buildSharedMemoryStoresPrompt,
  formatMemoryStoreLine,
  rar,
};
