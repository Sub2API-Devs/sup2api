/**
 * utils/permissions/gitCommandRules.ts
 *
 * 2.1.316 新增：git 命令中读文件参数的规则模式表；为命令模式生成 Bash/PowerShell 规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (5)
 * attribution: placement 5
 */

/**
 * 为命令模式生成 Bash/PowerShell 规则。
 */
//@ chunk-t0gq9gyw.js:61965-62038 placement
function bashAndPowerShellRules(e) {
  return e.flatMap((n) => [`Bash(${n})`, `PowerShell(${n})`]);
}
//@ chunk-t0gq9gyw.js:62038-62111 placement
function er(e) {
  return e.filter((n) => n !== "PowerShell(git checkout -b *)");
}
/**
 * git 命令中读文件参数的规则模式表。
 */
//@ chunk-t0gq9gyw.js:62111-66193 placement
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
  ],
  AMn = [
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
  ],
  CMn = [
    "gh pr create *--repo*",
    "gh pr create * -R*",
    "gh pr create *--body-file*",
    "gh pr create * -F*",
    "gh pr create *--head*",
    "gh pr create * -H*",
    "gh pr create *--recover*",
  ],
  RMn = ["gh pr create *--base*", "gh pr create * -B*"],
  $hs = ["git *--output*"],
  xMn = ["git checkout *--f*", "git checkout * -f*"],
  PMn = ["git add --f*", "git add * --f*", "git add -f*", "git add * -f*", "git add --c*", "git add * --c*"],
  Fhs = [
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
  ],
  me = "A skill active in this turn",
  Ie =
    "The match is on the raw command text (case-insensitive in PowerShell, so a lowercase short flag can trip an uppercase one), so message, body or path text that merely contains one of these fragments trips it too; reword that text if so.",
  Se =
    "If the user explicitly asked for the refused form, say it cannot run inside this skill instead of substituting something else or routing it through another tool.",
  rs = `${me} refuses \`git commit\` options that read the message from a file or template, skip hooks, amend, reuse a message or allow an empty commit (tokens starting \`--fil\`, \`--te\`, \`--pathspec-fr\`, \`--no-veri\`, \`--no-g\`, \`--am\`, \`--allow-empty\`, \`--reu\`, \`--ree\`, \` -F\`, \` -t\`). The option is refused, not the commit: pass the message inline with \`-m\` as the skill's example shows. ${Ie} ${Se}`,
  is = `${me} refuses \`git push\` forms that force, delete, mirror or prune refs, set push options, skip the pre-push hook or name a receive-pack (tokens starting \`--force\`, \` -f\`, \` +\`, \`--de\`, \` -d\`, \` :\`, \`--m\`, \`--pru\`, \`--pu\`, \` -o\`, \`--no-veri\`, \`--rece\`, \`--e\`). A plain push of the branch to the configured remote is fine. The match is on the raw command text, so a ref name containing one of these fragments trips it too; tell the user rather than rewriting the command to slip past. ${Se}`,
  os = `${me} runs \`gh pr create\` only in its instructed form and refuses \`--repo\`/\`-R\`, \`--head\`/\`-H\`, \`--body-file\`/\`-F\` and \`--recover\` on it. The option is refused, not opening the pull request: re-run it with the title and body passed inline as the skill's example shows; that retry is the intended fix, not a workaround. ${Ie} ${Se}`,
  ss = `${me} refuses \`--base\`/\`-B\` on \`gh pr create\` in PowerShell, where the \`-b\` short form of \`--body\` trips it too: spell it \`--body\`. The option is refused, not opening the pull request: if the default branch is the intended target, re-run it without \`--base\`, with the title and body passed inline as the skill's example shows, and the pull request opens against it. ${Ie} ${Se}`,
  as = `${me} refuses \`gh pr edit\` with \`--repo\`/\`-R\`, \`--body-file\`/\`-F\`, \`--base\`/\`-B\` or a URL selector: edit the current branch's PR with the title and body passed inline and no selector. ${Ie} ${Se}`,
  ls = `${me} refuses \`--output\` on git commands (it writes to an arbitrary path): drop it and read stdout. ${Ie}`,
  cs = `${me} refuses \`git checkout\` with \`--force\`/\`-f\` (tokens starting \`--f\` or \` -f\`): create the branch with a plain \`git checkout -b\`. The match is on the raw command text, so a branch name containing \`--f\` trips it too. ${Se}`,
  us = `${me} refuses \`git add\` with \`--force\`/\`-f\` (it stages ignored files such as \`.env\`) or \`--chmod\` (tokens starting \`--f\`, \`-f\`, \`--c\`): stage the paths by name without the option. ${Ie} ${Se}`;
//@ chunk-t0gq9gyw.js:66193-66240 placement
function Ee(e, n) {
  return bashAndPowerShellRules(e).map((r) => [r, n]);
}
//@ chunk-t0gq9gyw.js:66240-66409 placement
var fromEntries = Object.fromEntries([
  ...Ee(GIT_COMMIT_FILE_ARG_RULES, rs),
  ...Ee(AMn, is),
  ...Ee(CMn, os),
  ...RMn.map((e) => [`PowerShell(${e})`, ss]),
  ...Ee(Fhs, as),
  ...Ee($hs, ls),
  ...Ee(xMn, cs),
  ...Ee(PMn, us),
]);

export {
  fromEntries,
  er,
  bashAndPowerShellRules,
  PMn,
  GIT_COMMIT_FILE_ARG_RULES,
  xMn,
  AMn,
  CMn,
  Fhs,
  RMn,
  $hs,
};
