/**
 * utils/permissions/gitCommandRules.ts
 *
 * 2.1.316 新增：git 命令中读文件参数的规则模式表；为命令模式生成 Bash/PowerShell 规则。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85eyj5gy.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-85eyj5gy.js:62772-62845 placement
/**
 * 为命令模式生成 Bash/PowerShell 规则。
 */
function bashAndPowerShellRules(patterns) {
  return patterns.flatMap((pattern) => [`Bash(${pattern})`, `PowerShell(${pattern})`]);
}
//@ chunk-85eyj5gy.js:62845-62918 placement
/**
 * stripCheckoutBaseRule：去掉 PowerShell(git checkout -b *) 规则。
 */
function stripCheckoutBaseRule(rules) {
  return rules.filter((rule) => rule !== "PowerShell(git checkout -b *)");
}
//@ chunk-85eyj5gy.js:62918-67000 placement
/**
 * git 命令中读文件参数的规则模式表。
 */
var GIT_COMMIT_FILE_ARG_RULES = [
  "git commit *--fil*",
  "git commit * -F*",
  "git commit *--te*",
  "git commit * -t*",
  "git commit *--pathspec-fr*",
  "git commit *--no-veri*",
  "git commit *--no-g*",
  "git commit *--am*",
  "git commit *--allow-empty*",
  "git commit *--reu*",
  "git commit *--ree*",
];
var GIT_PUSH_RESTRICTED_RULES = [
  "git push *--force*",
  "git push * -f*",
  "git push *--de*",
  "git push * -d*",
  "git push * :**",
  'git push *":**',
  "git push *':**",
  "git push * +*",
  'git push *"+*',
  "git push *'+*",
  "git push *--pu*",
  "git push * -o*",
  "git push *--m*",
  "git push *--pru*",
  "git push *--no-veri*",
  "git push *--rece*",
  "git push *--e*",
];
var GH_PR_CREATE_RESTRICTED_RULES = [
  "gh pr create *--repo*",
  "gh pr create * -R*",
  "gh pr create *--body-file*",
  "gh pr create * -F*",
  "gh pr create *--head*",
  "gh pr create * -H*",
  "gh pr create *--recover*",
];
var GH_PR_CREATE_BASE_RULES = ["gh pr create *--base*", "gh pr create * -B*"];
var GIT_OUTPUT_RESTRICTED_RULES = ["git *--output*"];
var GIT_CHECKOUT_FORCE_RULES = ["git checkout *--f*", "git checkout * -f*"];
var GIT_ADD_FORCE_RULES = [
  "git add --f*",
  "git add * --f*",
  "git add -f*",
  "git add * -f*",
  "git add --c*",
  "git add * --c*",
];
var GH_PR_EDIT_RESTRICTED_RULES = [
  "gh pr edit *--repo*",
  "gh pr edit -R*",
  "gh pr edit * -R*",
  "gh pr edit *--body-file*",
  "gh pr edit -F*",
  "gh pr edit * -F*",
  "gh pr edit *--base*",
  "gh pr edit -B*",
  "gh pr edit * -B*",
  "gh pr edit http*",
];
var SKILL_ACTIVE_PREFIX = "A skill active in this turn";
var RAW_MATCH_CAVEAT =
  "The match is on the raw command text (case-insensitive in PowerShell, so a lowercase short flag can trip an uppercase one), so message, body or path text that merely contains one of these fragments trips it too; reword that text if so.";
var NO_SUBSTITUTE_ADVICE =
  "If the user explicitly asked for the refused form, say it cannot run inside this skill instead of substituting something else or routing it through another tool.";
var GIT_COMMIT_RULE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`git commit\` options that read the message from a file or template, skip hooks, amend, reuse a message or allow an empty commit (tokens starting \`--fil\`, \`--te\`, \`--pathspec-fr\`, \`--no-veri\`, \`--no-g\`, \`--am\`, \`--allow-empty\`, \`--reu\`, \`--ree\`, \` -F\`, \` -t\`). The option is refused, not the commit: pass the message inline with \`-m\` as the skill's example shows. ${RAW_MATCH_CAVEAT} ${NO_SUBSTITUTE_ADVICE}`;
var GIT_PUSH_RULE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`git push\` forms that force, delete, mirror or prune refs, set push options, skip the pre-push hook or name a receive-pack (tokens starting \`--force\`, \` -f\`, \` +\`, \`--de\`, \` -d\`, \` :\`, \`--m\`, \`--pru\`, \`--pu\`, \` -o\`, \`--no-veri\`, \`--rece\`, \`--e\`). A plain push of the branch to the configured remote is fine. The match is on the raw command text, so a ref name containing one of these fragments trips it too; tell the user rather than rewriting the command to slip past. ${NO_SUBSTITUTE_ADVICE}`;
var GH_PR_CREATE_RULE_REASON = `${SKILL_ACTIVE_PREFIX} runs \`gh pr create\` only in its instructed form and refuses \`--repo\`/\`-R\`, \`--head\`/\`-H\`, \`--body-file\`/\`-F\` and \`--recover\` on it. The option is refused, not opening the pull request: re-run it with the title and body passed inline as the skill's example shows; that retry is the intended fix, not a workaround. ${RAW_MATCH_CAVEAT} ${NO_SUBSTITUTE_ADVICE}`;
var GH_PR_CREATE_BASE_POWERSHELL_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`--base\`/\`-B\` on \`gh pr create\` in PowerShell, where the \`-b\` short form of \`--body\` trips it too: spell it \`--body\`. The option is refused, not opening the pull request: if the default branch is the intended target, re-run it without \`--base\`, with the title and body passed inline as the skill's example shows, and the pull request opens against it. ${RAW_MATCH_CAVEAT} ${NO_SUBSTITUTE_ADVICE}`;
var GH_PR_EDIT_RULE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`gh pr edit\` with \`--repo\`/\`-R\`, \`--body-file\`/\`-F\`, \`--base\`/\`-B\` or a URL selector: edit the current branch's PR with the title and body passed inline and no selector. ${RAW_MATCH_CAVEAT} ${NO_SUBSTITUTE_ADVICE}`;
var GIT_OUTPUT_RULE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`--output\` on git commands (it writes to an arbitrary path): drop it and read stdout. ${RAW_MATCH_CAVEAT}`;
var GIT_CHECKOUT_FORCE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`git checkout\` with \`--force\`/\`-f\` (tokens starting \`--f\` or \` -f\`): create the branch with a plain \`git checkout -b\`. The match is on the raw command text, so a branch name containing \`--f\` trips it too. ${NO_SUBSTITUTE_ADVICE}`;
var GIT_ADD_FORCE_REASON = `${SKILL_ACTIVE_PREFIX} refuses \`git add\` with \`--force\`/\`-f\` (it stages ignored files such as \`.env\`) or \`--chmod\` (tokens starting \`--f\`, \`-f\`, \`--c\`): stage the paths by name without the option. ${RAW_MATCH_CAVEAT} ${NO_SUBSTITUTE_ADVICE}`;
//@ chunk-85eyj5gy.js:67000-67047 placement
function pairBashAndPowerShellRules(patterns, reason) {
  return bashAndPowerShellRules(patterns).map((rule) => [rule, reason]);
}
//@ chunk-85eyj5gy.js:67047-67216 placement
var ruleReasons = Object.fromEntries([
  ...pairBashAndPowerShellRules(GIT_COMMIT_FILE_ARG_RULES, GIT_COMMIT_RULE_REASON),
  ...pairBashAndPowerShellRules(GIT_PUSH_RESTRICTED_RULES, GIT_PUSH_RULE_REASON),
  ...pairBashAndPowerShellRules(GH_PR_CREATE_RESTRICTED_RULES, GH_PR_CREATE_RULE_REASON),
  ...GH_PR_CREATE_BASE_RULES.map((baseRule) => [
    `PowerShell(${baseRule})`,
    GH_PR_CREATE_BASE_POWERSHELL_REASON,
  ]),
  ...pairBashAndPowerShellRules(GH_PR_EDIT_RESTRICTED_RULES, GH_PR_EDIT_RULE_REASON),
  ...pairBashAndPowerShellRules(GIT_OUTPUT_RESTRICTED_RULES, GIT_OUTPUT_RULE_REASON),
  ...pairBashAndPowerShellRules(GIT_CHECKOUT_FORCE_RULES, GIT_CHECKOUT_FORCE_REASON),
  ...pairBashAndPowerShellRules(GIT_ADD_FORCE_RULES, GIT_ADD_FORCE_REASON),
]);
export {
  ruleReasons,
  stripCheckoutBaseRule,
  bashAndPowerShellRules,
  GIT_ADD_FORCE_RULES,
  GIT_COMMIT_FILE_ARG_RULES,
  GIT_CHECKOUT_FORCE_RULES,
  GIT_PUSH_RESTRICTED_RULES,
  GH_PR_CREATE_RESTRICTED_RULES,
  GH_PR_EDIT_RESTRICTED_RULES,
  GH_PR_CREATE_BASE_RULES,
  GIT_OUTPUT_RESTRICTED_RULES,
};
