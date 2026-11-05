/**
 * commands/team-onboarding/index.ts
 *
 * 2.1.316 新增：/team-onboarding 命令：生成发给队友的引导式入门指南
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SHAREONBOARDINGGUIDE } from "../../tools/ShareOnboardingGuideTool/prompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS, collectTeamOnboardingUsage } from "./gather.js";
import { logEvent } from "../../services/analytics/index.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { isTeamOnboardingShareEnabled } from "./api.js";

//@ chunk-5xgkngpb.js:1817380-1826506 placement
/**
 * /team-onboarding 命令对象（prompt）；描述：Help teammates ramp on Claude Code with a guide from your usage；isHidden: false。
 */
var TEAM_ONBOARDING_GUIDE_TEMPLATE = `# Welcome to [Team Name]

## How We Use Claude

Based on [name]'s usage over the last [N] days:

Work Type Breakdown:
  [Category 1]  [ascii bar]  [N]%
  [Category 2]  [ascii bar]  [N]%
  [Category 3]  [ascii bar]  [N]%
  ...

Top Skills & Commands:
  [/command]  [ascii bar]  [N]x/month
  ...

Top MCP Servers:
  [Server]  [ascii bar]  [N] calls
  ...

## Your Setup Checklist

### Codebases
- [ ] [repo-name] \u2014 [repo url]
...

### MCP Servers to Activate
- [ ] [Server] \u2014 [what it's for]. [How to get access]
...

### Skills to Know About
- [/command] \u2014 [what it does, when the team uses it]
...

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy \u2014 warm, conversational,
not lecture-y.

Open with a warm welcome \u2014 include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes \u2014 [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections \u2014 offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data \u2014 don't extrapolate them into a "team
workflow" narrative. -->`;
var TEAM_ONBOARDING_PROMPT = `You are helping a power user generate an onboarding guide for teammates who are new to Claude Code. The guide will live in the team's onboarding docs and can be pasted into Claude for an interactive walkthrough.

You're co-authoring this with them \u2014 collaborative and helpful, like a teammate who's done this before and is happy to share.

## Usage data (last {{WINDOW_DAYS}} days)

This was scanned from the guide creator's local Claude Code transcripts:

\`\`\`json
{{USAGE_DATA}}
\`\`\`

## Your task

Before anything else \u2014 including before thinking through the classification \u2014 output exactly this line as your first visible text:

> Looking at how you've used Claude over the last {{WINDOW_DAYS}} days to put together an onboarding guide for teammates new to Claude Code.

This must come before any extended thinking about session descriptors. The guide creator is staring at a blank screen until you do. Classification is step 2, not step 1.

Generate the guide immediately, then ask for revisions. Don't wait for answers first \u2014 it's easier for the guide creator to edit a concrete draft than answer abstract questions.

1. **Output the acknowledgment line above.** No thinking, no classification, no tool calls before this. One line, then move on.

2. **Derive the work-type breakdown.** Read the \`sessionDescriptors\` array \u2014 each entry describes one session via its title, any linked code reviews (\`prNumbers\`), and first user message. Classify each session into one of these task types:

   - **build_feature** \u2014 new functionality, scripts, tools, config/CI/env setup
   - **debug_fix** \u2014 investigating and fixing bugs
   - **improve_quality** \u2014 refactoring, tests, cleanup, code review
   - **analyze_data** \u2014 queries, metrics, number crunching
   - **plan_design** \u2014 architecture, approach, strategy, understanding unfamiliar code, design review
   - **prototype** \u2014 spikes, POCs, throwaway exploration
   - **write_docs** \u2014 PRDs, RFCs, READMEs, design docs, copy/doc review

   Categories describe the *type of task*, not the project or domain \u2014 a teammate on any project should recognize them. Review sessions belong with whatever's being reviewed: code review is improve_quality, doc review is write_docs, design review is plan_design. Most sessions fit the list; only invent a new category if it's genuinely a different type of task. Pick the top 3-5 with rough percentages. First messages alone are usually enough; titles and code-review links are enrichment. If first messages are uninformative, use tool and MCP counts as a weak hint. If there are ~0 sessions, leave the breakdown as a TODO.

   In the rendered guide, display categories with spaces and title case (e.g. "Build Feature" not "build_feature").

3. **Gather the remaining pieces.** For repos, start with \`currentRepo\` and check the workspace for sibling repo directories. For MCP server setup, use each entry's \`name\` (and \`urlOrigin\` where present) to infer what the server does and how a teammate would get access. Leave the Team Tips and Get Started sections as TODO placeholders \u2014 you'll ask for these in Review and fill them in after.

4. **Write the guide to \`ONBOARDING.md\`** following this template:

\`\`\`
{{GUIDE_TEMPLATE}}
\`\`\`

   If \`sessionsLeftOut\` is above 0, that many sessions were left out because they couldn't be tied to the way the guide creator is signed in now, so the numbers may not cover everything from this period: say so in one plain sentence under "How We Use Claude" and again when you present the draft.

   Fill in real numbers from the usage data (not placeholders). Use \`generatedBy\` for the name; if it's missing, omit the name. Ascii bar charts: \`\u2588\` for filled, \`\u2591\` for empty, 20 chars wide. Keep the HTML comment instruction at the bottom exactly as shown.

5. **Render the guide in a code block, then close out the first turn.** You're co-authoring this guide with the guide creator \u2014 frame the follow-up as collaboration, not corrections.

   After the code block, add a \`---\` horizontal rule and a \`**Review**\` heading so the guide is visually separated from your questions. Under the heading, number these three questions:

   1. "I went with '[X]' for the team name \u2014 let me know if that sounds right." (or if you couldn't tell: "What's the team name? I'll add it in.")
   2. Is there a starter task for someone new to Claude Code? (ticket or doc link \u2014 optional)
   3. Any team tips you'd tell a new teammate that aren't already in CLAUDE.md?

   After they answer, update \`ONBOARDING.md\` with their team name, tips, and starter task. Then close with this exact line (not numbered, not paraphrased):

   Saved to \`ONBOARDING.md\`. Drop it in your team docs and channels \u2014 when a new teammate pastes it into Claude Code, they get a guided onboarding tour from there.

   Apply any edits they come back with to the file.`;
var getTeamOnboardingSharingInstructions = () => `

**Sharing** \u2014 call the ${SHAREONBOARDINGGUIDE} tool twice:

1. **Right after rendering the draft code block** (still in step 5, before the Review questions). Call with \`mode='check'\` \u2014 this uploads the draft to an existing guide (or creates a new one). Either way you get a \`share_url\` and \`short_code\`. Instead of the \`---\` / \`**Review**\` header from step 5, bridge directly from the link into the numbered questions (no horizontal rule):

   Here's a draft \u2014 a few quick questions to finish it up:

   <share URL>

   Then ask the three numbered questions from step 5 as normal. Save the \`short_code\` from the tool result \u2014 you'll need it in step 2.

2. **After the user answers the Review questions** and you've updated ONBOARDING.md, call it again with \`mode='update'\` and the \`short_code\` from step 1 to refresh the same link. Replace step 5's "drop it in your team docs" close with:

   Here's your onboarding guide: <updated URL>

   ${"Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code."}

If the tool returns 'unavailable' at any point, skip that call and use the manual close from step 5 instead.`;
var TEAM_ONBOARDING_ALLOWED_TOOLS = ["Edit(ONBOARDING.md)", "Bash(ls *)", SHAREONBOARDINGGUIDE];
var teamOnboardingCommandDefinition = {
  type: "prompt",
  name: "team-onboarding",
  description: "Help teammates ramp on Claude Code with a guide from your usage",
  allowedTools: TEAM_ONBOARDING_ALLOWED_TOOLS,
  contentLength: 0,
  policyGate: {
    policy: "allow_team_onboarding",
  },
  isHidden: false,
  progressMessage: "scanning usage data",
  effort: "low",
  requires: {
    workspace: true,
  },
  userFacingName() {
    return "team-onboarding";
  },
  source: "builtin",
  disableModelInvocation: true,
  async getPromptForCommand(args, context) {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_flint_harbor_prompt",
      {},
    );
    let promptTemplate =
      typeof featureValue_CACHED_MAY_BE_STALE?.prompt === "string"
        ? featureValue_CACHED_MAY_BE_STALE.prompt
        : TEAM_ONBOARDING_PROMPT;
    let guideTemplate =
      typeof featureValue_CACHED_MAY_BE_STALE?.guideTemplate === "string"
        ? featureValue_CACHED_MAY_BE_STALE.guideTemplate
        : TEAM_ONBOARDING_GUIDE_TEMPLATE;
    let windowDays =
      typeof featureValue_CACHED_MAY_BE_STALE?.windowDays === "number"
        ? Math.min(Math.max(Math.floor(featureValue_CACHED_MAY_BE_STALE.windowDays), 1), 365)
        : TEAM_ONBOARDING_DEFAULT_WINDOW_DAYS;
    logEvent("tengu_team_onboarding_invoked", {
      window_days: windowDays,
    });
    await saveGlobalConfig(
      (config) => ({
        ...config,
        teamOnboardingLastUsedAt: Date.now(),
      }),
      context.storageV5,
    );
    let { usageData, sessionCount, slashCommandCount, mcpServerCount } =
      await collectTeamOnboardingUsage(windowDays);
    let text =
      promptTemplate
        .replaceAll("{{WINDOW_DAYS}}", String(windowDays))
        .replaceAll("{{GUIDE_TEMPLATE}}", () => guideTemplate)
        .replaceAll("{{USAGE_DATA}}", () => usageData) +
      (isTeamOnboardingShareEnabled() ? getTeamOnboardingSharingInstructions() : "");
    logEvent("tengu_team_onboarding_generated", {
      session_count: sessionCount,
      slash_command_count: slashCommandCount,
      mcp_server_count: mcpServerCount,
      window_days: windowDays,
    });
    return [
      {
        type: "text",
        text,
      },
    ];
  },
};
var teamOnboardingCommand = teamOnboardingCommandDefinition;
export { teamOnboardingCommand };
