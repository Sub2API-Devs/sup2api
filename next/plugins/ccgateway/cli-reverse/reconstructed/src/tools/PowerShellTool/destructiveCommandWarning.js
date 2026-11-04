/**
 * tools/PowerShellTool/destructiveCommandWarning.ts
 *
 * PowerShell 破坏性命令模式（Remove-Item -Recurse -Force、Format-Volume、Stop-Computer 等）与警告文字
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/destructiveCommandWarning.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 1, layout 1, callgraph-fingerprint 1, placement 1
 */

//@ chunk-e6aww6q8.js:1268611-1270651 fingerprint (2.1.88 match: DESTRUCTIVE_PATTERNS, 0.676)
/**
 * PowerShell 破坏性命令模式：Remove-Item -Recurse/-Force（含别名 rm/del/rd/ri）、Clear-Content *、Format-Volume、Clear-Disk、git reset --hard/push -f/clean -f/stash drop、SQL DROP/TRUNCATE、Stop/Restart-Computer、Clear-RecycleBin。
 */
var DESTRUCTIVE_PATTERNS = [
  {
    pattern: /(?:^|[|;&\n({])[ \t]*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Recurse\b[^|;&\n}]*-Force\b/i,
    category: "remove_item_recursive_force",
    warning: "Note: may recursively force-remove files",
  },
  {
    pattern: /(?:^|[|;&\n({])[ \t]*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Force\b[^|;&\n}]*-Recurse\b/i,
    category: "remove_item_recursive_force",
    warning: "Note: may recursively force-remove files",
  },
  {
    pattern: /(?:^|[|;&\n({])[ \t]*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Recurse\b/i,
    category: "remove_item_recursive",
    warning: "Note: may recursively remove files",
  },
  {
    pattern: /(?:^|[|;&\n({])[ \t]*(Remove-Item|rm|del|rd|rmdir|ri)\b[^|;&\n}]*-Force\b/i,
    category: "remove_item_force",
    warning: "Note: may force-remove files",
  },
  {
    pattern: /\bClear-Content\b[^|;&\n]*\*/i,
    category: "clear_content_glob",
    warning: "Note: may clear content of multiple files",
  },
  {
    pattern: /\bFormat-Volume\b/i,
    category: "format_volume",
    warning: "Note: may format a disk volume",
  },
  {
    pattern: /\bClear-Disk\b/i,
    category: "clear_disk",
    warning: "Note: may clear a disk",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/i,
    category: "git_reset_hard",
    warning: "Note: may discard uncommitted changes",
  },
  {
    pattern: /\bgit\s+push\b[^|;&\n]*\s+(--force|--force-with-lease|-f)\b/i,
    category: "git_force_push",
    warning: "Note: may overwrite remote history",
  },
  {
    pattern: /\bgit\s+clean\b(?![^|;&\n]*(?:-[a-zA-Z]*n|--dry-run))[^|;&\n]*-[a-zA-Z]*f/i,
    category: "git_clean_force",
    warning: "Note: may permanently delete untracked files",
  },
  {
    pattern: /\bgit\s+stash\s+(drop|clear)\b/i,
    category: "git_stash_drop",
    warning: "Note: may permanently remove stashed changes",
  },
  {
    pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i,
    category: "sql_drop_truncate",
    warning: "Note: may drop or truncate database objects",
  },
  {
    pattern: /\bStop-Computer\b/i,
    category: "stop_computer",
    warning: "Note: will shut down the computer",
  },
  {
    pattern: /\bRestart-Computer\b/i,
    category: "restart_computer",
    warning: "Note: will restart the computer",
  },
  {
    pattern: /\bClear-RecycleBin\b/i,
    category: "clear_recycle_bin",
    warning: "Note: permanently deletes recycled files",
  },
];
//@ chunk-e6aww6q8.js:1270651-1270762 layout
/**
 * 返回 PowerShell 命令（前 10000 字符）命中的第一条破坏性模式。
 */
function matchDestructivePattern_2(command) {
  let truncatedCommand = command.length > 1e4 ? command.slice(0, 1e4) : command;
  for (let entry of DESTRUCTIVE_PATTERNS) if (entry.pattern.test(truncatedCommand)) return entry;
  return null;
}
//@ chunk-e6aww6q8.js:1270762-1270807 callgraph-fingerprint (2.1.88 match: getDestructiveCommandWarning, 0.68)
/**
 * PowerShell 破坏性命令警告文字（用于权限对话框），没有命中返回 null。
 */
function getDestructiveCommandWarning(command) {
  return matchDestructivePattern_2(command)?.warning ?? null;
}
//@ chunk-e6aww6q8.js:1270807-1270853 placement
/**
 * 给出 PowerShell 破坏性命令的分类（无命中返回 null）。
 */
function getPowerShellDestructiveCategory(command) {
  return matchDestructivePattern_2(command)?.category ?? null;
}
export { getPowerShellDestructiveCategory, getDestructiveCommandWarning };
