/**
 * tools/WrapUpTool/prompt.ts
 *
 * WrapUp 工具的名字、简短说明与给模型的长提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6f6qbsyw.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-6f6qbsyw.js:9818-11210 placement
var WRAPUP = "WrapUp";
var WRAPUP_TOOL_DESCRIPTION = "Offer the user a next step when a turn ends";
var WRAPUP_TOOL_PROMPT = `Call this before you write your closing message: it fills the next-step box that the app draws under that message, with a two-or-three-sentence recap and, when this turn leaves the user a decision to make or a step to take, one question and buttons that answer it. Without the call the app has nothing to draw.

Call it once in EVERY turn in which you changed files, ran commands or completed multi-step work, and in every turn that you are about to end with a question, a choice or a go-ahead that you need from the user, even one in which you stopped to ask before doing any work: when this turn's work is done, and before you tell the user the outcome. Otherwise skip it: short answers, pure conversation, a brief read-and-explain turn. A turn that ends in another tool's question to the user, such as a plan's approval, needs no call.

The box opens only for a question that comes with answers, so send actions with ask. A turn with nothing pending sends the recap alone, and the app then draws no box. Write recap, ask and labels in the language the user writes in.

Your closing message is ordinary text right after this call, the last thing you say this turn: your answer to the user in full, which the recap never replaces. Write none of it before this call, where it can reach the user cut to a short summary.`;
export { WRAPUP, WRAPUP_TOOL_DESCRIPTION, WRAPUP_TOOL_PROMPT };
