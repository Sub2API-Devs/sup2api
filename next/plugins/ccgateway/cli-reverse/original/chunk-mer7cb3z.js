
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{lt}from"./chunk-p223w7hd.js";import{bO}from"./chunk-rxbqzcvt.js";import{Ge}from"./chunk-fmsrw1pw.js";function o(){return`
- If this is an existing file, you MUST use the ${Ge} tool first to read the file's contents. This tool will fail if you did not read the file first.`}function IAi(e,t){if(bO({model:e,leanPrompt:t}))return`Writes a file to the local filesystem, overwriting if one exists.

When to use: creating a new file, or fully replacing one you've already ${Ge}. Overwriting an existing file you haven't ${Ge} will fail. For partial changes, use ${lt} instead.`;return`Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.${o()}
- Prefer the Edit tool for modifying existing files \u2014 it only sends the diff. Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`}var Db="TaskCreate";var ew="TaskUpdate";var kre="propose_skills",OAi="Show the user a review card of proposed skills to save \u2014 render-only, nothing is written",MAi=`Surface recurring multi-step procedures from this session as skill proposals. Render-only \u2014 calling this shows a review card in the conversation; it does not write any files or create the skill. The user reviews and saves from the card. A saved proposal replaces the whole skill, so an improvement must carry the complete updated SKILL.md, never a partial edit.

Call once with all proposals (max 3). Use it when the user asks to turn a workflow or procedure into a skill, or when the same multi-step procedure has recurred and a skill would clearly save future work. Do not call it for one-off tasks, and do not re-propose skills the user has already seen.

An improvement can only update one of the user's own skills, including one of theirs that this session lists as a plugin skill because they uploaded it to claude.ai; the tool tells you when a target is not theirs. Another plugin's skill or a built-in one can't be updated from the card. To customize one of those with this tool, propose it as a new skill under a name of its own \u2014 not the original's name, even without its plugin prefix \u2014 with a description that says when to use it instead of the original: both stay listed, and the description decides which one is used.`;
export{IAi,Db,ew,kre,OAi,MAi};
