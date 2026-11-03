/**
 * memdir/memoryTypes.ts
 *
 * 记忆类型枚举（user/feedback/project/reference）与各类说明、frontmatter 示例、什么不该存等提示段。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/memoryTypes.ts
 * pieces: chunk-82kqcve8.js (20)
 * attribution: placement 7, layout 8, fingerprint 4, file-local 1
 */
import { isPlainObject } from "../utils/isPlainObject.js";
import {
  parseFrontmatter,
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
  fwe,
} from "../utils/frontmatterParser.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-82kqcve8.js:88757-88768 placement
var zm = 256;
//@ chunk-82kqcve8.js:88964-88975 placement
var Vm = 256;
/**
 * 记忆 frontmatter 键、名称正则与归一化。
 */
//@ chunk-82kqcve8.js:89664-90013 placement
var MEMORY_FRONTMATTER_KEYS = ["name", "description", "metadata"],
  MEMORY_NAME_RE = /^[a-z0-9_-]+$/,
  MEMORY = "memory",
  nonEmptyStringOrNull = (e) => (typeof e === "string" && e.length > 0 ? e : null),
  normalizeMemoryFrontmatter = (e) => {
    let n = isPlainObject(e.metadata) ? e.metadata : {},
      reduced = Object.entries(e).reduce((s, [h, y]) => {
        if (MEMORY_FRONTMATTER_KEYS.includes(h) || y == null) return s;
        return ((s[h] = y), s);
      }, {});
    return {
      name: nonEmptyStringOrNull(e.name),
      description: nonEmptyStringOrNull(e.description),
      metadata: Object.freeze({ ...reduced, ...n }),
    };
  };
/**
 * 解析记忆文件（frontmatter 与正文）。
 */
//@ chunk-82kqcve8.js:90013-90153 placement
function parseMemoryFile(e, n, r) {
  let {
    frontmatter: frontmatter,
    content: content,
    rewriteHazard: rewriteHazard,
  } = parseFrontmatter(e, n, r);
  return {
    frontmatter: normalizeMemoryFrontmatter(frontmatter),
    body: content,
    ...(rewriteHazard !== void 0 && { rewriteHazard: rewriteHazard }),
  };
}
/**
 * 按行数与字节截断不受信任的 frontmatter。
 */
//@ chunk-82kqcve8.js:90153-90407 placement
function truncateUntrustedFrontmatter(e) {
  return e
    .split(
      `
`,
      MAX_UNTRUSTED_FRONTMATTER_LINES + 1,
    )
    .slice(0, MAX_UNTRUSTED_FRONTMATTER_LINES)
    .reduce(
      (r, s) => {
        let h = Buffer.byteLength(s) + (r.lines.length > 0 ? 1 : 0);
        if (r.stopped || r.bytes + h > MAX_UNTRUSTED_FRONTMATTER_BYTES) return ((r.stopped = !0), r);
        return ((r.bytes += h), r.lines.push(s), r);
      },
      { bytes: 0, lines: [], stopped: !1 },
    ).lines.join(`
`);
}
/**
 * 读取元数据字段与更新元数据。
 */
//@ chunk-82kqcve8.js:90407-90592 placement
var getMemoryMetadata = (e, n) => nonEmptyStringOrNull(e.metadata[n]),
  withMemoryMetadata = (e, n) => ({ ...e, metadata: Object.freeze({ ...e.metadata, ...n }) }),
  slugifyMemoryName = (e) =>
    MEMORY_NAME_RE.test(e)
      ? e
      : e
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
/**
 * 生成带 frontmatter 的记忆文件内容。
 */
//@ chunk-82kqcve8.js:90592-90882 placement
function serializeMemoryFile(e, n) {
  let fromEntries = Object.fromEntries(
      [["node_type", MEMORY], ...Object.entries(e.metadata).filter(([y]) => y !== "node_type")].filter(
        ([, y]) => y != null,
      ),
    ),
    s = {
      name: slugifyMemoryName(e.name ?? ""),
      ...(e.description !== null && { description: e.description }),
      metadata: fromEntries,
    },
    replaced = n.replace(/^\n+/, "");
  return `---
${fwe(s)}---

${replaced}`;
}
//@ chunk-82kqcve8.js:90882-91137 layout
var MEMORY_LINKING_GUIDANCE = [
  "In the body, link to related memories with `[[name]]`, where `name` is the other memory's `name:` slug. Link liberally \u2014 a `[[name]]` that doesn't match an existing memory yet is fine; it marks something worth writing later, not an error.",
];
/**
 * 记忆文件 frontmatter 示例（name/description/type）。
 */
//@ chunk-82kqcve8.js:91137-91549 fingerprint = MEMORY_FRONTMATTER_EXAMPLE (0.639)
function MEMORY_FRONTMATTER_EXAMPLE(e) {
  return [
    "```markdown",
    "---",
    "name: {{short-kebab-case-slug}}",
    "description: {{one-line summary, used to decide relevance in future conversations, so be specific}}",
    "metadata:",
    `  type: {{${e.join(", ")}}}`,
    "---",
    "",
    "{{memory content \u2014 for feedback/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines. Link related memories with [[their-name]].}}",
    "```",
    "",
    ...MEMORY_LINKING_GUIDANCE,
  ];
}
/**
 * 记忆类型枚举：user、feedback、project、reference。
 */
//@ chunk-82kqcve8.js:91549-91599 fingerprint = MEMORY_TYPES (1)
var MEMORY_TYPES = ["user", "feedback", "project", "reference"];
/**
 * 把 frontmatter type 字段解析为记忆类型，非法值返回 undefined。
 */
//@ chunk-82kqcve8.js:91599-91673 file-local
function parseMemoryType(raw) {
  if (typeof raw !== "string") return;
  return MEMORY_TYPES.find((n) => n === raw);
}
//@ chunk-82kqcve8.js:91673-91696 layout
var MEMORY_TYPES_SECTION_ID = "memory-types";
/**
 * tengu_ochre_finch：使用精简版记忆类型说明。
 */
//@ chunk-82kqcve8.js:91696-91744 layout
function isCompactMemoryTypesEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ochre_finch", !1);
}
/**
 * 四种记忆类型的一句话定义（用于类型说明段）。
 */
//@ chunk-82kqcve8.js:91744-92151 layout
var MEMORY_TYPE_DESCRIPTIONS = {
  user: "the user's role, expertise, or working preferences",
  feedback:
    "a correction or confirmation of how you should approach work. Confirmations ('yes, good call') are quieter than corrections \u2014 watch for them",
  project: "ongoing work, deadlines, or decisions not derivable from code or git history",
  reference: "where to find information in an external system (issue tracker, dashboard, channel)",
};
//@ chunk-82kqcve8.js:92151-92435 layout
function buildCompactMemoryTypesSection(e) {
  return [
    "## Types of memory",
    "",
    "Save a memory when you learn one of the following \u2014 pick the matching `type:`:",
    "",
    ...e.map((n) => `- **${n}** \u2014 ${MEMORY_TYPE_DESCRIPTIONS[n]}`),
    "",
    `Invoke the \`${MEMORY_TYPES_SECTION_ID}\` skill for scope, body structure and examples once you've decided to save.`,
    "",
  ];
}
//@ chunk-82kqcve8.js:92435-92477 layout
function selectMemoryTypesSection(e, n = MEMORY_TYPES) {
  return isCompactMemoryTypesEnabled() ? buildCompactMemoryTypesSection(n) : e;
}
//@ chunk-82kqcve8.js:92477-109264 fingerprint = TYPES_SECTION_COMBINED (0.854)
var TYPES_SECTION_COMBINED = [],
  rf = [],
  G4t = [
    "## Types of memory",
    "",
    "There are several discrete types of memory that you can store in your memory system. Each type below declares a <scope> of `private`, `team`, or guidance for choosing between the two.",
    "",
    "<types>",
    "<type>",
    "    <name>user</name>",
    "    <scope>always private</scope>",
    "    <description>Contain information about the user's role, goals, responsibilities, and knowledge. Great user memories help you tailor your future behavior to the user's preferences and perspective. Your goal in reading and writing these memories is to build up an understanding of who the user is and how you can be most helpful to them specifically. For example, you should collaborate with a senior software engineer differently than a student who is coding for the very first time. Keep in mind, that the aim here is to be helpful to the user. Avoid writing memories about the user that could be viewed as a negative judgement or that are not relevant to the work you're trying to accomplish together.</description>",
    "    <when_to_save>When you learn any details about the user's role, preferences, responsibilities, or knowledge</when_to_save>",
    "    <how_to_use>When your work should be informed by the user's profile or perspective. For example, if the user is asking you to explain a part of the code, you should answer that question in a way that is tailored to the specific details that they will find most valuable or that helps them build their mental model in relation to domain knowledge they already have.</how_to_use>",
    "    <examples>",
    "    user: I'm a data scientist investigating what logging we have in place",
    "    assistant: [saves private user memory: user is a data scientist, currently focused on observability/logging]",
    "",
    "    user: I've been writing Go for ten years but this is my first time touching the React side of this repo",
    "    assistant: [saves private user memory: deep Go expertise, new to React and this project's frontend \u2014 frame frontend explanations in terms of backend analogues]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>feedback</name>",
    "    <scope>default to private. Save as team only when the guidance is clearly a project-wide convention that every contributor should follow (e.g., a testing policy, a build invariant), not a personal style preference.</scope>",
    "    <description>Guidance the user has given you about how to approach work \u2014 both what to avoid and what to keep doing. These are a very important type of memory to read and write as they allow you to remain coherent and responsive to the way you should approach work in the project. Record from failure AND success: if you only save corrections, you will avoid past mistakes but drift away from approaches the user has already validated, and may grow overly cautious. Before saving a private feedback memory, check that it doesn't contradict a team feedback memory \u2014 if it does, either don't save it or note the override explicitly.</description>",
    `    <when_to_save>Any time the user corrects your approach ("no not that", "don't", "stop doing X") OR confirms a non-obvious approach worked ("yes exactly", "perfect, keep doing that", accepting an unusual choice without pushback). Corrections are easy to notice; confirmations are quieter \u2014 watch for them. In both cases, save what is applicable to future conversations, especially if surprising or not obvious from the code. Include *why* so you can judge edge cases later.</when_to_save>`,
    "    <how_to_use>Let these memories guide your behavior so that the user and other users in the project do not need to offer the same guidance twice.</how_to_use>",
    "    <body_structure>Lead with the rule itself, then a **Why:** line (the reason the user gave \u2014 often a past incident or strong preference) and a **How to apply:** line (when/where this guidance kicks in). Knowing *why* lets you judge edge cases instead of blindly following the rule.</body_structure>",
    ...rf,
    "    <examples>",
    "    user: don't mock the database in these tests \u2014 we got burned last quarter when mocked tests passed but the prod migration failed",
    "    assistant: [saves team feedback memory: integration tests must hit a real database, not mocks. Reason: prior incident where mock/prod divergence masked a broken migration. Team scope: this is a project testing policy, not a personal preference]",
    "",
    "    user: stop summarizing what you just did at the end of every response, I can read the diff",
    "    assistant: [saves private feedback memory: this user wants terse responses with no trailing summaries. Private because it's a communication preference, not a project convention]",
    "",
    "    user: yeah the single bundled PR was the right call here, splitting this one would've just been churn",
    "    assistant: [saves private feedback memory: for refactors in this area, user prefers one bundled PR over many small ones. Confirmed after I chose this approach \u2014 a validated judgment call, not a correction]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>project</name>",
    "    <scope>private or team, but strongly bias toward team</scope>",
    "    <description>Information that you learn about ongoing work, goals, initiatives, bugs, or incidents within the project that is not otherwise derivable from the code or git history. Project memories help you understand the broader context and motivation behind the work users are working on within this working directory.</description>",
    '    <when_to_save>When you learn who is doing what, why, or by when. These states change relatively quickly so try to keep your understanding of this up to date. Always convert relative dates in user messages to absolute dates when saving (e.g., "Thursday" \u2192 "2026-03-05"), so the memory remains interpretable after time passes.</when_to_save>',
    "    <how_to_use>Use these memories to more fully understand the details and nuance behind the user's request, anticipate coordination issues across users, make better informed suggestions.</how_to_use>",
    "    <body_structure>Lead with the fact or decision, then a **Why:** line (the motivation \u2014 often a constraint, deadline, or stakeholder ask) and a **How to apply:** line (how this should shape your suggestions). Project memories decay fast, so the why helps future-you judge whether the memory is still load-bearing.</body_structure>",
    "    <examples>",
    "    user: we're freezing all non-critical merges after Thursday \u2014 mobile team is cutting a release branch",
    "    assistant: [saves team project memory: merge freeze begins 2026-03-05 for mobile release cut. Flag any non-critical PR work scheduled after that date]",
    "",
    "    user: the reason we're ripping out the old auth middleware is that legal flagged it for storing session tokens in a way that doesn't meet the new compliance requirements",
    "    assistant: [saves team project memory: auth middleware rewrite is driven by legal/compliance requirements around session token storage, not tech-debt cleanup \u2014 scope decisions should favor compliance over ergonomics]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>reference</name>",
    "    <scope>usually team</scope>",
    "    <description>Stores pointers to where information can be found in external systems. These memories allow you to remember where to look to find up-to-date information outside of the project directory.</description>",
    "    <when_to_save>When you learn about resources in external systems and their purpose. For example, that bugs are tracked in a specific project in Linear or that feedback can be found in a specific Slack channel.</when_to_save>",
    "    <how_to_use>When the user references an external system or information that may be in an external system.</how_to_use>",
    "    <examples>",
    `    user: check the Linear project "INGEST" if you want context on these tickets, that's where we track all pipeline bugs`,
    '    assistant: [saves team reference memory: pipeline bugs are tracked in Linear project "INGEST"]',
    "",
    "    user: the Grafana board at grafana.internal/d/api-latency is what oncall watches \u2014 if you're touching request handling, that's the thing that'll page someone",
    "    assistant: [saves team reference memory: grafana.internal/d/api-latency is the oncall latency dashboard \u2014 check it when editing request-path code]",
    "    </examples>",
    "</type>",
    "</types>",
    "",
  ],
  nar = [
    "## Types of memory",
    "",
    "There are several discrete types of memory that you can store in your memory system:",
    "",
    "<types>",
    "<type>",
    "    <name>user</name>",
    "    <description>Contain information about the user's role, goals, responsibilities, and knowledge. Great user memories help you tailor your future behavior to the user's preferences and perspective. Your goal in reading and writing these memories is to build up an understanding of who the user is and how you can be most helpful to them specifically. For example, you should collaborate with a senior software engineer differently than a student who is coding for the very first time. Keep in mind, that the aim here is to be helpful to the user. Avoid writing memories about the user that could be viewed as a negative judgement or that are not relevant to the work you're trying to accomplish together.</description>",
    "    <when_to_save>When you learn any details about the user's role, preferences, responsibilities, or knowledge</when_to_save>",
    "    <how_to_use>When your work should be informed by the user's profile or perspective. For example, if the user is asking you to explain a part of the code, you should answer that question in a way that is tailored to the specific details that they will find most valuable or that helps them build their mental model in relation to domain knowledge they already have.</how_to_use>",
    "    <examples>",
    "    user: I'm a data scientist investigating what logging we have in place",
    "    assistant: [saves user memory: user is a data scientist, currently focused on observability/logging]",
    "",
    "    user: I've been writing Go for ten years but this is my first time touching the React side of this repo",
    "    assistant: [saves user memory: deep Go expertise, new to React and this project's frontend \u2014 frame frontend explanations in terms of backend analogues]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>feedback</name>",
    "    <description>Guidance the user has given you about how to approach work \u2014 both what to avoid and what to keep doing. These are a very important type of memory to read and write as they allow you to remain coherent and responsive to the way you should approach work in the project. Record from failure AND success: if you only save corrections, you will avoid past mistakes but drift away from approaches the user has already validated, and may grow overly cautious.</description>",
    `    <when_to_save>Any time the user corrects your approach ("no not that", "don't", "stop doing X") OR confirms a non-obvious approach worked ("yes exactly", "perfect, keep doing that", accepting an unusual choice without pushback). Corrections are easy to notice; confirmations are quieter \u2014 watch for them. In both cases, save what is applicable to future conversations, especially if surprising or not obvious from the code. Include *why* so you can judge edge cases later.</when_to_save>`,
    "    <how_to_use>Let these memories guide your behavior so that the user does not need to offer the same guidance twice.</how_to_use>",
    "    <body_structure>Lead with the rule itself, then a **Why:** line (the reason the user gave \u2014 often a past incident or strong preference) and a **How to apply:** line (when/where this guidance kicks in). Knowing *why* lets you judge edge cases instead of blindly following the rule.</body_structure>",
    ...TYPES_SECTION_COMBINED,
    "    <examples>",
    "    user: don't mock the database in these tests \u2014 we got burned last quarter when mocked tests passed but the prod migration failed",
    "    assistant: [saves feedback memory: integration tests must hit a real database, not mocks. Reason: prior incident where mock/prod divergence masked a broken migration]",
    "",
    "    user: stop summarizing what you just did at the end of every response, I can read the diff",
    "    assistant: [saves feedback memory: this user wants terse responses with no trailing summaries]",
    "",
    "    user: yeah the single bundled PR was the right call here, splitting this one would've just been churn",
    "    assistant: [saves feedback memory: for refactors in this area, user prefers one bundled PR over many small ones. Confirmed after I chose this approach \u2014 a validated judgment call, not a correction]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>project</name>",
    "    <description>Information that you learn about ongoing work, goals, initiatives, bugs, or incidents within the project that is not otherwise derivable from the code or git history. Project memories help you understand the broader context and motivation behind the work the user is doing within this working directory.</description>",
    '    <when_to_save>When you learn who is doing what, why, or by when. These states change relatively quickly so try to keep your understanding of this up to date. Always convert relative dates in user messages to absolute dates when saving (e.g., "Thursday" \u2192 "2026-03-05"), so the memory remains interpretable after time passes.</when_to_save>',
    "    <how_to_use>Use these memories to more fully understand the details and nuance behind the user's request and make better informed suggestions.</how_to_use>",
    "    <body_structure>Lead with the fact or decision, then a **Why:** line (the motivation \u2014 often a constraint, deadline, or stakeholder ask) and a **How to apply:** line (how this should shape your suggestions). Project memories decay fast, so the why helps future-you judge whether the memory is still load-bearing.</body_structure>",
    "    <examples>",
    "    user: we're freezing all non-critical merges after Thursday \u2014 mobile team is cutting a release branch",
    "    assistant: [saves project memory: merge freeze begins 2026-03-05 for mobile release cut. Flag any non-critical PR work scheduled after that date]",
    "",
    "    user: the reason we're ripping out the old auth middleware is that legal flagged it for storing session tokens in a way that doesn't meet the new compliance requirements",
    "    assistant: [saves project memory: auth middleware rewrite is driven by legal/compliance requirements around session token storage, not tech-debt cleanup \u2014 scope decisions should favor compliance over ergonomics]",
    "    </examples>",
    "</type>",
    "<type>",
    "    <name>reference</name>",
    "    <description>Stores pointers to where information can be found in external systems. These memories allow you to remember where to look to find up-to-date information outside of the project directory.</description>",
    "    <when_to_save>When you learn about resources in external systems and their purpose. For example, that bugs are tracked in a specific project in Linear or that feedback can be found in a specific Slack channel.</when_to_save>",
    "    <how_to_use>When the user references an external system or information that may be in an external system.</how_to_use>",
    "    <examples>",
    `    user: check the Linear project "INGEST" if you want context on these tickets, that's where we track all pipeline bugs`,
    '    assistant: [saves reference memory: pipeline bugs are tracked in Linear project "INGEST"]',
    "",
    "    user: the Grafana board at grafana.internal/d/api-latency is what oncall watches \u2014 if you're touching request handling, that's the thing that'll page someone",
    "    assistant: [saves reference memory: grafana.internal/d/api-latency is the oncall latency dashboard \u2014 check it when editing request-path code]",
    "    </examples>",
    "</type>",
    "</types>",
    "",
  ],
  Yn =
    "When you save a `feedback` memory because the user corrected how you ran a repeatable step \u2014 how you verified, committed, opened a PR, or used a project skill \u2014 fold the same correction into the project skill that drives that step (`.claude/skills/<name>/SKILL.md`): a terse, general edit, so the next session gets it right unprompted. Edit existing skill files only; never create one \u2014 a new project skill silently shadows a same-named built-in skill. The single exception is verify, because how a project verifies changes is project-specific: put a verify correction in the `.claude/skills/verify/SKILL.md` closest to the code it covers \u2014 the repo root for repo-wide corrections, a subproject directory (e.g. `ios/.claude/skills/verify/SKILL.md`) for corrections that only apply to that subtree \u2014 and if that file does not exist, create it. Each correction lives in exactly one skill file: the closest-scoped one, never duplicated at broader scopes.",
  sf = ["## Project skill upkeep", "", Yn, ""];
//@ chunk-82kqcve8.js:109264-109313 layout
function isMemoryLinkingEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gorse_fathom", !1);
}
//@ chunk-82kqcve8.js:109313-109346 layout
function getMemoryLinkingLines() {
  return isMemoryLinkingEnabled() ? sf : [];
}
//@ chunk-82kqcve8.js:109346-111681 fingerprint = WHAT_NOT_TO_SAVE_SECTION (0.568)
var WHAT_NOT_TO_SAVE_SECTION = [
    "## What NOT to save in memory",
    "",
    "- Code patterns, conventions, architecture, file paths, or project structure \u2014 these can be derived by reading the current project state.",
    "- Git history, recent changes, or who-changed-what \u2014 `git log` / `git blame` are authoritative.",
    "- Debugging solutions or fix recipes \u2014 the fix is in the code; the commit message has the context.",
    "- Anything already documented in CLAUDE.md files.",
    "- Ephemeral task details: in-progress work, temporary state, current conversation context.",
    "",
    "These exclusions apply even when the user explicitly asks you to save. If they ask you to save a PR list or activity summary, ask what was *surprising* or *non-obvious* about it \u2014 that is the part worth keeping.",
  ],
  VEn =
    "- Memory records can become stale over time. Use memory as context for what was true at a given point in time. Before answering the user or building assumptions based solely on information in memory records, verify that the memory is still correct and up-to-date by reading the current state of the files or resources. If a recalled memory conflicts with current information, trust what you observe now \u2014 and update or remove the stale memory rather than acting on it.",
  Vn = [
    "## When to access memories",
    "- When memories seem relevant, or the user references prior-conversation work.",
    "- You MUST access memory when the user explicitly asks you to check, recall, or remember.",
    "- If the user says to *ignore* or *not use* memory: Do not apply remembered facts, cite, compare against, or mention memory content.",
    VEn,
  ],
  Pst = [
    "## Before recommending from memory",
    "",
    "A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged. Before recommending it:",
    "",
    "- If the memory names a file path: check the file exists.",
    "- If the memory names a function or flag: grep for it.",
    "- If the user is about to act on your recommendation (not just asking about history), verify first.",
    "",
    '"The memory says X exists" is not the same as "X exists now."',
    "",
    "A memory that summarizes repo state (activity logs, architecture snapshots) is frozen in time. If the user asks about *recent* or *current* state, prefer `git log` or reading the code over recalling the snapshot.",
  ];

export {
  parseMemoryFile,
  zm,
  Vm,
  MEMORY_FRONTMATTER_EXAMPLE,
  MEMORY_TYPES,
  selectMemoryTypesSection,
  G4t,
  WHAT_NOT_TO_SAVE_SECTION,
  getMemoryLinkingLines,
  VEn,
  Pst,
  isMemoryLinkingEnabled,
  Yn,
  Vn,
  MEMORY_LINKING_GUIDANCE,
  nar,
  getMemoryMetadata,
  serializeMemoryFile,
  withMemoryMetadata,
  parseMemoryType,
  truncateUntrustedFrontmatter,
  MEMORY_TYPES_SECTION_ID,
  isCompactMemoryTypesEnabled,
};
