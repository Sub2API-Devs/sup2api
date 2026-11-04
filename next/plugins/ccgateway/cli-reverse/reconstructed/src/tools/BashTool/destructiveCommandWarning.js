/**
 * tools/BashTool/destructiveCommandWarning.ts
 *
 * Bash 破坏性命令模式表（git reset --hard、push -f、rm -rf、DROP TABLE、kubectl delete、terraform destroy 等）与匹配函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/destructiveCommandWarning.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:1005118-1007274 fingerprint (2.1.88 match: DESTRUCTIVE_PATTERNS, 0.664)
/**
 * 破坏性命令模式表（git reset --hard、push --force、clean -f、checkout .、stash drop、branch -D、--no-verify、commit --amend、rm -rf、SQL DROP/TRUNCATE/DELETE、kubectl delete、terraform destroy），每项带 category 与提示文字。
 */
var DESTRUCTIVE_PATTERNS_2 = [
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    category: "git_reset_hard",
    warning: "Note: may discard uncommitted changes",
  },
  {
    pattern: /\bgit\s+push\b[^;&|\n]*[ \t](--force|--force-with-lease|-f)\b/,
    category: "git_force_push",
    warning: "Note: may overwrite remote history",
  },
  {
    pattern: /\bgit\s+clean\b(?![^;&|\n]*(?:-[a-zA-Z]*n|--dry-run))[^;&|\n]*-[a-zA-Z]*f/,
    category: "git_clean_force",
    warning: "Note: may permanently delete untracked files",
  },
  {
    pattern: /\bgit\s+checkout\s+(--\s+)?\.[ \t]*($|[;&|\n])/,
    category: "git_checkout_dot",
    warning: "Note: may discard all working tree changes",
  },
  {
    pattern: /\bgit\s+restore\s+(--\s+)?\.[ \t]*($|[;&|\n])/,
    category: "git_restore_dot",
    warning: "Note: may discard all working tree changes",
  },
  {
    pattern: /\bgit\s+stash[ \t]+(drop|clear)\b/,
    category: "git_stash_drop",
    warning: "Note: may permanently remove stashed changes",
  },
  {
    pattern: /\bgit\s+branch\s+(-D[ \t]|--delete\s+--force|--force\s+--delete)\b/,
    category: "git_branch_force_delete",
    warning: "Note: may force-delete a branch",
  },
  {
    pattern: /\bgit\s+(commit|push|merge)\b[^;&|\n]*--no-verify\b/,
    category: "git_no_verify",
    warning: "Note: may skip safety hooks",
  },
  {
    pattern: /\bgit\s+commit\b[^;&|\n]*--amend\b/,
    category: "git_commit_amend",
    warning: "Note: may rewrite the last commit",
  },
  {
    pattern: /(^|[;&|\n][ \t]*)rm\s+-[a-zA-Z]*[rR][a-zA-Z]*f|(^|[;&|\n][ \t]*)rm\s+-[a-zA-Z]*f[a-zA-Z]*[rR]/,
    category: "rm_recursive_force",
    warning: "Note: may recursively force-remove files",
  },
  {
    pattern: /(^|[;&|\n][ \t]*)rm\s+-[a-zA-Z]*[rR]/,
    category: "rm_recursive",
    warning: "Note: may recursively remove files",
  },
  {
    pattern: /(^|[;&|\n][ \t]*)rm\s+-[a-zA-Z]*f/,
    category: "rm_force",
    warning: "Note: may force-remove files",
  },
  {
    pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i,
    category: "sql_drop_truncate",
    warning: "Note: may drop or truncate database objects",
  },
  {
    pattern: /\bDELETE\s+FROM\s+\w+[ \t]*(;|"|'|\n|$)/i,
    category: "sql_delete_from",
    warning: "Note: may delete all rows from a database table",
  },
  {
    pattern: /\bkubectl\s+delete\b/,
    category: "kubectl_delete",
    warning: "Note: may delete Kubernetes resources",
  },
  {
    pattern: /\bterraform\s+destroy\b/,
    category: "terraform_destroy",
    warning: "Note: may destroy Terraform infrastructure",
  },
];
export { DESTRUCTIVE_PATTERNS_2 };
