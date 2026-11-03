/**
 * plugins/bundled/claudeTest/agents.ts
 *
 * 2.1.316 新增：Claude Test 的内部代理定义（规格起草、执行、探索）与权限规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (6)
 * attribution: placement 6
 */

//@ chunk-ae5g0zb5.js:116007-116368 placement
var HELPER_READ_RULES = Object.freeze([
    "Read(~/.config/claude-test/**)",
    "Read(~/Library/Application Support/claude-test/**)",
    "Read(~/.cache/claude-test/**)",
    "Read(//**/claude-test/*/secrets.env)",
    "Read(//**/claude-test/*/auth*.json)",
    "Read(//**/claude-test/**/storageState.json)",
    "Read(//**/claude-test/scratch/**)",
  ]),
  freeze_2 = Object.freeze(HELPER_READ_RULES.map((e) => e.replace(/^Read\(/, "Edit(")));
/**
 * 测试代理不得编辑的文件规则（CLAUDE.md、AGENTS.md 等）。
 */
//@ chunk-ae5g0zb5.js:116368-117398 placement
var PROTECTED_EDIT_RULES = Object.freeze([
  "Edit(//**/CLAUDE.md)",
  "Edit(//**/CLAUDE.local.md)",
  "Edit(//**/AGENTS.md)",
  "Edit(//**/ARCHITECTURE.md)",
  "Edit(//**/.mcp.json)",
  "Edit(//**/.github/**)",
  "Edit(//**/.gitlab-ci.yml)",
  "Edit(//**/.gitlab/**)",
  "Edit(//**/.circleci/**)",
  "Edit(//**/.buildkite/**)",
  "Edit(//**/Jenkinsfile)",
  "Edit(//**/azure-pipelines.yml)",
  "Edit(//**/bitbucket-pipelines.yml)",
  "Edit(//**/.git/**)",
  "Edit(//**/.vscode/**)",
  "Edit(//**/.idea/**)",
  "Edit(**/.claude/**)",
  "Edit(//**/.claude/*.json)",
  "Edit(//**/.claude/*.md)",
  "Edit(//**/.claude/commands/**)",
  "Edit(//**/.claude/agents/**)",
  "Edit(//**/.claude/skills/**)",
  "Edit(//**/.claude/hooks/**)",
  "Edit(//**/.claude/rules/**)",
  "Edit(//**/.claude/output-styles/**)",
  "Edit(//**/.claude/workflows/**)",
  "Edit(//**/.claude/routines/**)",
  "Edit(//**/.claude/plugins/**)",
  "Edit(//**/.claude/agent-memory/**)",
  "Edit(//**/.claude/agent-memory-local/**)",
  "Edit(~/.claude/**)",
  "Edit(~/.claude.json)",
  "Edit(~/.bashrc)",
  "Edit(~/.bash_profile)",
  "Edit(~/.profile)",
  "Edit(~/.zshrc)",
  "Edit(~/.zshenv)",
]);
/**
 * 后台起草规格文件的内部代理定义（只由 run skill 启动）。
 */
//@ chunk-ae5g0zb5.js:117398-121311 placement
var DRAFT_AGENT_DEFINITION = Object.freeze({
  description:
    "Internal to Claude Test \u2014 drafts spec files in the background for a " +
    "first run. Started only by the claude-test run skill.",
  disallowedTools: [
    "Edit(.claude-test/specs/**)",
    "Edit(**/.claude-test/specs/**)",
    "Edit(.claude-test/filed)",
    "Edit(**/.claude-test/filed)",
    "Edit(.claude-test/skills/**)",
    "Edit(**/.claude-test/skills/**)",
    "Edit(.claude-testrc)",
    "Edit(**/.claude-testrc)",
    "mcp__plugin_claude-test_browser__claude_test_allow",
    "mcp__plugin_claude-test_browser__claude_test_app_up",
    "mcp__plugin_claude-test_browser__claude_test_show_run",
    "mcp__plugin_claude-test_browser__claude_test_pane_note",
    "mcp__plugin_claude-test_browser__claude_test_start_app",
    "mcp__plugin_claude-test_browser__claude_test_confirm_run",
    "mcp__plugin_claude-test_browser__claude_test_browser_installed",
    "mcp__plugin_claude-test_browser__claude_test_remember",
    "mcp__plugin_claude-test_browser__claude_test_install",
    "mcp__plugin_claude-test_browser__claude_test_save",
    "mcp__plugin_claude-test_browser__claude_test_status",
    "mcp__plugin_claude-test_browser__claude_test_elapsed",
    "mcp__plugin_claude-test_browser__claude_test_progress",
    "mcp__plugin_claude-test_browser__claude_test_write_log",
    "mcp__plugin_claude-test_browser__claude_test_finish",
    "mcp__plugin_claude-test_browser__claude_test_read",
    "Edit(.claude-test/runs/*/*.*)",
    "Edit(**/.claude-test/runs/*/*.*)",
    "Edit(//**/.claude-test/specs/**)",
    "Edit(//**/.claude-test/filed)",
    "Edit(//**/.claude-test/skills/**)",
    "Edit(//**/.claude-testrc)",
    "Edit(//**/.claude-test/runs/*/*.*)",
    "Edit(.claude-test/runs/*/used-folder)",
    "Edit(**/.claude-test/runs/*/used-folder)",
    "Edit(//**/.claude-test/runs/*/used-folder)",
    "Edit(.claude-test/runs/*/used-folder/**)",
    "Edit(**/.claude-test/runs/*/used-folder/**)",
    "Edit(//**/.claude-test/runs/*/used-folder/**)",
    "Edit(.claude-test/runs/*/saved.json/**)",
    "Edit(**/.claude-test/runs/*/saved.json/**)",
    "Edit(//**/.claude-test/runs/*/saved.json/**)",
    "Edit(.claude-test/runs/*/results.json/**)",
    "Edit(**/.claude-test/runs/*/results.json/**)",
    "Edit(//**/.claude-test/runs/*/results.json/**)",
    "Edit(.claude-test/runs/*/log.md/**)",
    "Edit(**/.claude-test/runs/*/log.md/**)",
    "Edit(//**/.claude-test/runs/*/log.md/**)",
    "Edit(.claude-test/runs/*/progress.ndjson/**)",
    "Edit(**/.claude-test/runs/*/progress.ndjson/**)",
    "Edit(//**/.claude-test/runs/*/progress.ndjson/**)",
    "Edit(.claude-test/runs/*/names.json/**)",
    "Edit(**/.claude-test/runs/*/names.json/**)",
    "Edit(//**/.claude-test/runs/*/names.json/**)",
    "Edit(.claude-test/runs/*/decisions.json/**)",
    "Edit(**/.claude-test/runs/*/decisions.json/**)",
    "Edit(//**/.claude-test/runs/*/decisions.json/**)",
    ...PROTECTED_EDIT_RULES,
    ...HELPER_READ_RULES,
    ...freeze_2,
    "Read(**/.git/**)",
    "Read(**/.env)",
    "Read(**/.env.*)",
    "Read(**/*.env)",
    "Read(**/.envrc)",
    "Read(**/.npmrc)",
    "Read(**/.netrc)",
    "Read(**/*.pem)",
    "Read(**/*.key)",
    "Read(**/*.p12)",
    "Read(**/*.pfx)",
    "Read(**/*.crt)",
    "Read(**/*.jks)",
    "Read(**/*.keystore)",
    "Read(**/*.sqlite)",
    "Read(**/*.sqlite3)",
    "Read(**/*.db)",
    "Read(**/id_rsa*)",
    "Read(**/id_ed25519*)",
    "Read(**/*secret*)",
    "Read(**/*credential*)",
    "Read(**/*token*.json)",
    "Read(**/*service-account*.json)",
    "Read(**/*service_account*.json)",
    "Read(~/.ssh/**)",
    "Read(~/.aws/**)",
    "Read(~/.config/**)",
    "Read(~/.claude/.credentials.json)",
    "Read(~/.claude.json)",
    "Read(~/.claude/settings.json)",
    "Read(~/.claude/settings.local.json)",
    "Read(~/.claude/projects/**)",
    "Read(~/.claude/shell-snapshots/**)",
    "Read(~/.claude/history*)",
    "Read(~/.claude/todos/**)",
    "Read(~/.claude/statsig/**)",
    "Read(~/.claude/ide/**)",
    "Read(~/.netrc)",
    "Read(~/.npmrc)",
    "Read(~/.git-credentials)",
    "Read(~/.pgpass)",
    "Read(~/.bash_history)",
    "Read(~/.zsh_history)",
    "Read(~/.*_history)",
    "Read(~/.bashrc)",
    "Read(~/.zshrc)",
    "Read(~/.zshenv)",
    "Read(~/.profile)",
    "Read(~/.bash_profile)",
    "Read(~/.local/share/keyrings/**)",
    "Read(~/.claude/file-history/**)",
    "Read(~/.docker/**)",
    "Read(~/.kube/**)",
    "Read(~/.gnupg/**)",
    "Read(~/Library/**)",
    "Read(~/AppData/**)",
  ],
});
/**
 * 在后台浏览器中执行规格的内部代理定义。
 */
//@ chunk-ae5g0zb5.js:121311-122994 placement
var EXECUTE_AGENT_DEFINITION = Object.freeze({
  description:
    "Internal to Claude Test \u2014 runs the specs in a background browser. " +
    "Started only by the claude-test run skill.",
  disallowedTools: [
    "Edit(.claude-test/specs/**)",
    "Edit(**/.claude-test/specs/**)",
    "Edit(.claude-test/filed)",
    "Edit(**/.claude-test/filed)",
    "Edit(.claude-testrc)",
    "Edit(**/.claude-testrc)",
    "Edit(//**/.claude-test/specs/**)",
    "Edit(//**/.claude-test/filed)",
    "Edit(//**/.claude-testrc)",
    "Edit(.claude-test/skills/**)",
    "Edit(**/.claude-test/skills/**)",
    "Edit(//**/.claude-test/skills/**)",
    ...PROTECTED_EDIT_RULES,
    ...HELPER_READ_RULES,
    ...freeze_2,
    "mcp__plugin_claude-test_browser__claude_test_allow",
    "mcp__plugin_claude-test_browser__claude_test_app_up",
    "mcp__plugin_claude-test_browser__claude_test_show_run",
    "mcp__plugin_claude-test_browser__claude_test_pane_note",
    "mcp__plugin_claude-test_browser__claude_test_start_app",
    "mcp__plugin_claude-test_browser__claude_test_confirm_run",
    "mcp__plugin_claude-test_browser__claude_test_browser_installed",
    "mcp__plugin_claude-test_browser__claude_test_remember",
    "mcp__plugin_claude-test_browser__claude_test_install",
    "mcp__plugin_claude-test_browser__claude_test_write",
    "Edit(.claude-test/runs/**/proposed/**)",
    "Edit(**/.claude-test/runs/**/proposed/**)",
    "Edit(**/.claude-test/runs/**/Proposed/**)",
    "Edit(**/.claude-test/runs/**/PROPOSED/**)",
    "Edit(//**/.claude-test/runs/**/proposed/**)",
    "mcp__plugin_claude-test_browser__browser_run_code_unsafe",
    "mcp__plugin_claude-test_browser__browser_file_upload",
    "mcp__plugin_claude-test_browser__browser_drop",
    "mcp__plugin_claude-test_browser__browser_route",
    "mcp__plugin_claude-test_browser__browser_unroute",
    "mcp__plugin_claude-test_browser__browser_install",
    "Read(~/.claude/projects/**)",
  ],
});
/**
 * /claude-test run skill 的描述与提示。
 */
//@ chunk-ae5g0zb5.js:122994-124068 placement
var RUN_SKILL_DEFINITION = Object.freeze({
  description:
    "Local, on this machine: tests your app here in a browser on this computer (not the claude.ai Claude Test connector)",
  whenToUse:
    "Checks that the web app in this repo still works \u2014 plain-language " +
    'specs in .claude-test/specs/ run in the background in a fenced headless browser against the local dev server, and a PASS / FAIL summary comes back with screenshots. On a first run it proposes a starter set of specs for the person to approve. Use when the user asks ("test my app", "did I break anything?", "run claude test"). When the user asks for it. Unasked, only in a project that already has .claude-test/specs/ and only after a change a person can see in ' +
    "the app \u2014 then OFFER to run it in one line; never start it, or begin " +
    "setup, on your own. Skip for docs-only or test-only changes.",
  argumentHint: "[app folder] [all | words from a spec name, to run only those | fix | onboard]",
  disallowedTools: [
    "Edit(.claude-test/specs/**)",
    "Edit(**/.claude-test/specs/**)",
    "Edit(.claude-test/filed)",
    "Edit(**/.claude-test/filed)",
  ],
});
/**
 * 匹配 “run <…/.claude-test/runs/时间戳>” 形式的命令。
 */
//@ chunk-ae5g0zb5.js:124068-124247 placement
var RUN_DIR_COMMAND_RE =
  /^\s*run[ \t]+["']?((?:[A-Za-z]:)?[\\/][^\n"']{0,1024}?[\\/]{1,4}\.claude-test[\\/]{1,4}runs[\\/]{1,4}\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?)[\\/]{0,4}["']?(?:\s|$)/;

export { DRAFT_AGENT_DEFINITION, EXECUTE_AGENT_DEFINITION, RUN_SKILL_DEFINITION, RUN_DIR_COMMAND_RE };
