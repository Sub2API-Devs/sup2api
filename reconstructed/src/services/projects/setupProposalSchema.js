/**
 * services/projects/setupProposalSchema.ts
 *
 * 2.1.316 新增：设置提案 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (10)
 * attribution: placement 10
 */
import { o, zodStrictObject, U, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { plural } from "../../utils/stringUtils.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";

/**
 * 设置提案的大小上限常量（摘要、说明、例行任务与线程各字段的字节数、条目数、证据计数、整体字节），以及可选颜色、颜色值与图标列表。
 */
//@ chunk-dz3q485w.js:36455-37532 placement
var MAX_SUMMARY_BYTES = 1024,
  MAX_INSTRUCTIONS_CHARS = 8000,
  MAX_ROUTINES = 3,
  MAX_ROUTINE_NAME_BYTES = 200,
  MAX_ROUTINE_DESCRIPTION_BYTES = 300,
  MAX_CRON_BYTES = 128,
  MAX_ROUTINE_PROMPT_BYTES = 2048,
  MAX_THREADS = 4,
  MAX_THREAD_TITLE_BYTES = 200,
  MAX_THREAD_PROMPT_BYTES = 2048,
  MAX_THREAD_DESCRIPTION_BYTES = 300,
  MAX_THREAD_BASIS_BYTES = 200,
  MAX_PROJECT_NAME_BYTES = 200,
  MAX_SESSIONS_COUNTED = 1000,
  MAX_WINDOW_DAYS = 365,
  MAX_PROPOSAL_BYTES = 16384,
  PROJECT_COLORS = ["red", "orange", "green", "aqua", "blue", "violet", "magenta"],
  PROJECT_COLOR_HEX = {
    red: "#e66767",
    orange: "#eb6834",
    green: "#35b231",
    aqua: "#1baf7a",
    blue: "#5598e7",
    violet: "#9085e9",
    magenta: "#e46191",
  },
  PROJECT_ICONS = [
    "Projects",
    "Folder",
    "Code",
    "Database",
    "HandHeart",
    "Beaker",
    "Wrench",
    "Activity",
    "Chart",
    "Team",
    "Users",
    "Book",
    "Box",
    "Note",
    "File",
    "Lightbulb",
    "Palette",
    "Star",
    "Flag",
    "Home",
    "Sun",
    "Clock",
    "Calendar",
    "Scroll",
    "Moon",
    "MoonStars",
    "SunHorizon",
    "Owl",
    "Atom",
    "DNA",
    "Orbit",
    "Globe",
    "Cloud",
    "Hammer",
    "Key",
    "Lock",
    "Camera",
    "Microphone",
    "CoffeeCup",
    "Gift",
    "Ghost",
    "GraduationCap",
    "Library",
    "Spreadsheet",
    "Slides",
    "Checklist",
    "Clipboard",
    "Image",
    "Bookmark",
    "Bank",
    "Signpost",
    "MapPin",
    "Mailbox",
    "Heart",
    "Lightning",
    "Shapes",
    "Goal",
    "Scale",
    "Eye",
    "Binoculars",
    "Bullhorn",
    "PaperPlane",
    "ChartLine",
    "Timer",
  ],
  PROJECT_ICONS_HINT =
    "Projects, Folder, Code, Database, HandHeart, Beaker, Wrench, Activity, Chart, Team, Users, Book, Box, Note, File, Lightbulb, Palette, Star, Flag, Home, Sun, Clock, Calendar, Scroll";
//@ chunk-dz3q485w.js:37532-37658 placement
function boundedText(e, n = 1) {
  return o()
    .min(n)
    .max(e)
    .refine((s) => Buffer.byteLength(s, "utf8") <= e, { message: `must be at most ${e} bytes` });
}
/**
 * 设置提案的 zod schema：例行任务、建议线程、整体提案（名称/图标/颜色/摘要/说明/证据），以及线程负责人与产出类型的显示文案。
 */
//@ chunk-dz3q485w.js:37658-38370 placement
var routineSchema = DoctorLazy(() =>
    zodStrictObject({
      name: boundedText(MAX_ROUTINE_NAME_BYTES),
      cron_expression: boundedText(MAX_CRON_BYTES),
      prompt: boundedText(MAX_ROUTINE_PROMPT_BYTES),
      description: boundedText(MAX_ROUTINE_DESCRIPTION_BYTES, 0).optional(),
    }),
  ),
  threadSuggestionSchema = DoctorLazy(() =>
    zodStrictObject({
      title: boundedText(MAX_THREAD_TITLE_BYTES),
      prompt: boundedText(MAX_THREAD_PROMPT_BYTES),
      description: boundedText(MAX_THREAD_DESCRIPTION_BYTES),
      basis: boundedText(MAX_THREAD_BASIS_BYTES),
      who: U(["claude", "you"]),
      produces: U(["pr", "doc", "decision"]),
    }),
  ),
  setupProposalSchema = DoctorLazy(() =>
    zodStrictObject({
      name: boundedText(MAX_PROJECT_NAME_BYTES).optional(),
      icon: U(PROJECT_ICONS).optional(),
      color: U(PROJECT_COLORS).optional(),
      summary: boundedText(MAX_SUMMARY_BYTES, 0).optional(),
      instructions: o().max(MAX_INSTRUCTIONS_CHARS).optional(),
      routines: A(routineSchema()).max(MAX_ROUTINES).optional(),
      sessions: A(threadSuggestionSchema()).max(MAX_THREADS).optional(),
      evidence: zodStrictObject({
        sessions_matched: E().int().min(0).max(MAX_SESSIONS_COUNTED).optional(),
        sessions_considered: E().int().min(0).max(MAX_SESSIONS_COUNTED).optional(),
        window_days: E().int().min(0).max(MAX_WINDOW_DAYS).optional(),
      }).optional(),
    }),
  ),
  THREAD_WHO_LABELS = { claude: "Claude", you: "Needs you" },
  THREAD_PRODUCES_LABELS = { pr: "PR", doc: "Doc", decision: "Decision" };
/**
 * 把设置提案格式化为给用户确认的纯文本：名称/图标/颜色、摘要、建议线程（负责人与产出）、例行任务（cron UTC）、项目说明、各线程与例行任务的起始指令，以及证据计数。
 */
//@ chunk-dz3q485w.js:38370-40009 placement
function formatProposalForReview(proposal, opts = {}) {
  let lines = [],
    section = (c) => {
      if (lines.length > 0) lines.push("");
      lines.push(c);
    };
  if (proposal.name !== void 0 || proposal.icon !== void 0 || proposal.color !== void 0) {
    let filtered = [
      proposal.name !== void 0 ? `name \u201C${proposal.name}\u201D` : null,
      proposal.icon !== void 0 ? `icon ${proposal.icon}` : null,
      proposal.color !== void 0 ? `color ${proposal.color}` : null,
    ].filter((h) => h !== null);
    lines.push(`Name, icon and color: ${filtered.join(" \xB7 ")}`);
  }
  if (proposal.summary !== void 0 && proposal.summary.trim() !== "")
    lines.push(`Summary: ${proposal.summary.trim()}`);
  let threads = proposal.sessions ?? [];
  if (threads.length > 0)
    (section(`Threads (${threads.length}):`),
      threads.forEach((c, h) => {
        lines.push(
          `  ${h + 1}. ${c.title}  [${THREAD_WHO_LABELS[c.who]} \xB7 ${THREAD_PRODUCES_LABELS[c.produces]}]`,
          `     ${c.description}`,
          `     from: ${c.basis}`,
        );
      }));
  let routines = proposal.routines ?? [];
  if (routines.length > 0) {
    section(`Routines (${routines.length}; off until you turn one on):`);
    for (let c of routines)
      lines.push(
        `  \xB7 ${c.name} \u2014 ${c.cron_expression} UTC${c.description !== void 0 && c.description !== "" ? ` \u2014 ${c.description}` : ""}`,
      );
  }
  if (proposal.instructions !== void 0 && proposal.instructions.trim() !== "") {
    section(
      opts.existingProject === !0
        ? "Project instructions (replace the project\u2019s current ones when applied):"
        : "Project instructions (set on the project on Yes):",
    );
    for (let c of proposal.instructions.trim().split(`
`))
      lines.push(`  ${c}`);
  }
  if (threads.length > 0)
    (section("Thread instructions (what each thread starts with):"),
      threads.forEach((c, h) => {
        lines.push(`  ${h + 1}. ${c.title}`);
        for (let b of c.prompt.trim().split(`
`))
          lines.push(`     ${b}`);
      }));
  if (routines.length > 0) {
    section("Routine instructions:");
    for (let c of routines) {
      lines.push(`  \xB7 ${c.name}`);
      for (let h of c.prompt.trim().split(`
`))
        lines.push(`     ${h}`);
    }
  }
  if (proposal.evidence?.sessions_matched !== void 0)
    section(
      `The draft counts ${proposal.evidence.sessions_matched} of this folder\u2019s sessions as this stream of work.`,
    );
  return lines.join(`
`);
}
//@ chunk-dz3q485w.js:40009-40301 placement
function proposalContentsSummary(e) {
  let n = [],
    s = e.sessions?.length ?? 0;
  if (s > 0) n.push(`${s} ${plural(s, "thread")}`);
  let r = e.routines?.length ?? 0;
  if (r > 0) n.push(`${r} ${plural(r, "routine")}`);
  if (e.instructions !== void 0 && e.instructions.trim() !== "") n.push("instructions");
  if (n.length === 0) n.push("summary only");
  return n.join(", ");
}
/**
 * 把设置提案渲染为 Markdown 简报：标题、摘要、说明（无项目名时注明只是提议）、待开启线程与例行任务，指令以引用块形式列出。
 */
//@ chunk-dz3q485w.js:40301-41182 placement
function proposalToMarkdown(proposal, projectName) {
  let lines = [
    projectName === null
      ? BRIEF_HEADING
      : `# ${(proposal.name ?? projectName).replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, " ").trim() || "Project"} \u2014 project setup`,
  ];
  if (proposal.summary !== void 0 && proposal.summary.trim() !== "") lines.push("", proposal.summary.trim());
  if (proposal.instructions !== void 0 && proposal.instructions.trim() !== "")
    lines.push(
      "",
      ...(projectName === null
        ? [PROPOSED_INSTRUCTIONS_HEADING, "", PROPOSAL_ONLY_NOTE]
        : ["## Instructions"]),
      "",
      proposal.instructions.trim(),
    );
  let threads = proposal.sessions ?? [];
  if (threads.length > 0) {
    lines.push("", "## Threads to start");
    for (let l of threads)
      lines.push(
        "",
        `### ${l.title}`,
        "",
        `${THREAD_WHO_LABELS[l.who]} \xB7 ${THREAD_PRODUCES_LABELS[l.produces]} \u2014 ${l.description} _From: ${l.basis}._`,
        "",
        ...l.prompt
          .trim()
          .split(
            `
`,
          )
          .map((c) => `> ${c}`),
      );
  }
  let routines = proposal.routines ?? [];
  if (routines.length > 0) {
    lines.push("", "## Routines");
    for (let l of routines)
      lines.push(
        "",
        `### ${l.name}`,
        "",
        `\`${l.cron_expression}\` UTC${l.description !== void 0 && l.description !== "" ? ` \u2014 ${l.description}` : ""}`,
        "",
        ...l.prompt
          .trim()
          .split(
            `
`,
          )
          .map((c) => `> ${c}`),
      );
  }
  return (
    lines.join(`
`) +
    `
`
  );
}
//@ chunk-dz3q485w.js:41182-41405 placement
var BRIEF_HEADING = "# Project setup brief",
  PROPOSED_INSTRUCTIONS_HEADING = "## Proposed instructions",
  PROPOSAL_ONLY_NOTE =
    "A proposal only. Saving this brief set no instructions on the project: the user applies them from the project\u2019s setup card, where the card offers them.";
//@ chunk-dz3q485w.js:41405-41507 placement
function normalizeInlineText(e) {
  return isNetworkPath(e.normalize("NFKC").replace(/[\s\u2800]+/gu, " "))
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-dz3q485w.js:41507-41672 placement
function normalizeMultilineText(e) {
  return e
    .replace(
      /\r\n?|[\u2028\u2029]/g,
      `
`,
    )
    .replace(/[\t\u2800]/g, " ")
    .split(
      `
`,
    )
    .map((n) => isNetworkPath(n).trimEnd())
    .join(
      `
`,
    )
    .trim()
    .replace(/\uFF20/g, "@");
}
/**
 * 规范化设置提案：单行字段压缩空白，多行字段统一换行并去除行尾空白，cron 表达式只保留合法字符，空字段去掉。
 */
//@ chunk-dz3q485w.js:41672-42510 placement
function normalizeProposal(proposal) {
  let result = {},
    name = proposal.name !== void 0 ? normalizeInlineText(proposal.name) : "";
  if (name !== "") result.name = name;
  if (proposal.icon !== void 0) result.icon = proposal.icon;
  if (proposal.color !== void 0) result.color = proposal.color;
  let summary = proposal.summary !== void 0 ? normalizeMultilineText(proposal.summary) : "";
  if (summary !== "") result.summary = summary;
  let instructions = proposal.instructions !== void 0 ? normalizeMultilineText(proposal.instructions) : "";
  if (instructions !== "") result.instructions = instructions;
  let routines = (proposal.routines ?? []).map((h) => ({
    name: normalizeInlineText(h.name),
    cron_expression: h.cron_expression
      .trim()
      .split(/\s+/)
      .join(" ")
      .replace(/[^0-9*\/,\- ]/g, "?"),
    prompt: normalizeMultilineText(h.prompt),
    ...(h.description !== void 0 &&
      normalizeInlineText(h.description) !== "" && { description: normalizeInlineText(h.description) }),
  }));
  if (routines.length > 0) result.routines = routines;
  let threads = (proposal.sessions ?? []).map((h) => ({
    title: normalizeInlineText(h.title),
    prompt: normalizeMultilineText(h.prompt),
    description: normalizeInlineText(h.description),
    basis: normalizeInlineText(h.basis),
    who: h.who,
    produces: h.produces,
  }));
  if (threads.length > 0) result.sessions = threads;
  if (proposal.evidence !== void 0 && Object.keys(proposal.evidence).length > 0)
    result.evidence = { ...proposal.evidence };
  return result;
}

export {
  setupProposalSchema,
  normalizeProposal,
  THREAD_WHO_LABELS,
  THREAD_PRODUCES_LABELS,
  PROJECT_COLOR_HEX,
  proposalContentsSummary,
  formatProposalForReview,
  MAX_SESSIONS_COUNTED,
  MAX_WINDOW_DAYS,
  MAX_SUMMARY_BYTES,
  proposalToMarkdown,
  MAX_PROPOSAL_BYTES,
  PROJECT_ICONS_HINT,
};
