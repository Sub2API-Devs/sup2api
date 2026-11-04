/**
 * screens/repl/commandDialogLoaders.ts
 *
 * 2.1.316 新增。命令对话框懒加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */

//@ chunk-18hwfzwa.js:37274-40586 placement
/**
 * 斜杠命令到懒加载 chunk 的映射表，命令对话框打开时按需 import。
 */
var COMMAND_DIALOG_LOADERS = {
  "add-dir": () => import("../../commands/add-dir/add-dir.js"),
  advisor: () => import("../../commands/advisor.js"),
  artifacts: () => import("../../components/artifacts/call.lazy.js"),
  "auto-mode-setup": () => import("../../commands/auto-mode-setup/call.lazy.js"),
  autocompact: () => import("../../components/call.lazy.js"),
  "autofix-pr": () => import("../../commands/autofix-pr/call.lazy.js"),
  btw: () => import("../../commands/btw/btw.js"),
  bug: () => import("../../commands/share/call.lazy.js"),
  cd: () => import("../../commands/cd/CdTrustPrompt.lazy.js"),
  chrome: () => import("../../commands/chrome/chrome.js"),
  "cloud-plugins": () => import("../../commands/cloud-plugins/call.lazy.js"),
  config: () => import("../../commands/config/config.js"),
  context: () => import("../../commands/context/context.js"),
  copy: () => import("../../commands/copy/call.lazy.js"),
  "design-login": () => import("../../components/DesignLogin.lazy.js"),
  desktop: () => import("../../commands/desktop/desktop.js"),
  diff: () => import("../../commands/diff/call.lazy.js"),
  effort: () => import("../../commands/effort/call.lazy.js"),
  exit: () => import("../../components/call_2.lazy.js"),
  export: () => import("../../commands/export/export.js"),
  "extra-usage": () => import("../../commands/plan/call.lazy.js"),
  fast: () => import("../../commands/fast/fast.lazy.js"),
  feedback: () => import("../../commands/feedback/feedback.js"),
  fork: () => import("../../commands/fork/call.lazy.js"),
  goal: () => import("../../commands/goal/call.lazy.js"),
  help: () => import("../../commands/help/help.js"),
  hooks: () => import("../../commands/hooks/hooks.js"),
  ide: () => import("../../commands/ide/IDECommandFlow.lazy.js"),
  import: () => import("../../commands/import/import.js"),
  "install-github-app": () => import("../../commands/install-github-app/UNATTENDED_BG_DECLINE.lazy.js"),
  "limit-reset": () => import("../../commands/reset-limits/call.lazy.js"),
  login: () => import("../../services/oauth/postLoginHooks.js"),
  logout: () => import("../../commands/logout/logout.js"),
  loops: () => import("../../commands/loops/call.lazy.js"),
  mcp: () => import("../../commands/mcp/mcp.js"),
  memory: () => import("../../components/memory/call.lazy.js"),
  mobile: () => import("../../commands/session/call.lazy.js"),
  model: () => import("../../commands/model/model.js"),
  "output-style": () => import("../../commands/config/call.lazy.js"),
  passes: () => import("../../commands/passes/passes.js"),
  permissions: () => import("../../commands/permissions/permissions.js"),
  plan: () => import("../../commands/plan/plan.js"),
  plugin: () => import("../../commands/context/call.lazy.js"),
  powerup: () => import("../../commands/powerup/powerup.js"),
  "privacy-settings": () => import("../../commands/privacy-settings/privacy-settings.js"),
  "pro-trial-expired": () => import("../../commands/bridge/bridge.js"),
  "rate-limit-options": () => import("../../commands/rate-limit-options/rate-limit-options.js"),
  "release-notes": () => import("../../commands/release-notes/ReleaseNotesPicker.lazy.js"),
  "remote-control": () => import("../../commands/bridge/call.lazy.js"),
  "remote-env": () => import("../../commands/remote-env/remote-env.js"),
  resume: () => import("../../commands/resume/resume.js"),
  sandbox: () => import("../../commands/sandbox-toggle/sandbox-toggle.js"),
  "scroll-speed": () => import("../../commands/scroll-speed/call.lazy.js"),
  session: () => import("../../commands/session/session.js"),
  "setup-bedrock": () => import("../../commands/setup-bedrock/call.lazy.js"),
  "setup-vertex": () => import("../../components/call_3.lazy.js"),
  "skill-doctor": () => import("../../commands/stats/call.lazy.js"),
  skills: () => import("../../commands/skills/skills.js"),
  status: () => import("../../commands/status/status.js"),
  tasks: () => import("../../components/permissions/BashPermissionRequest/call.lazy.js"),
  teleport: () => import("../../commands/teleport/Teleport.lazy.js"),
  "terminal-setup": () => import("../../commands/terminalSetup/terminalSetup.js"),
  theme: () => import("../../commands/theme/theme.js"),
  tui: () => import("../../commands/tui/call.lazy.js"),
  ultrareview: () => import("../../commands/review/ultrareviewCommand.js"),
  upgrade: () => import("../../commands/upgrade/upgrade.js"),
  usage: () => import("../../commands/usage/usage.js"),
  "usage-credits": () => import("../../commands/usage-credits/usageCredits.js"),
  vim: () => import("../../commands/config/call.lazy.js"),
  "web-setup": () => import("../../commands/remote-setup/remote-setup.js"),
  wellbeing: () => import("../../components/Settings/WRITE_DELAY_MS.lazy.js"),
  ...false,
  ...{},
  ...{},
  ...{},
  ...{
    background: () => import("../../utils/background/spawnBackgroundFork.js"),
    daemon: () => import("../../components/daemon/DaemonHub.lazy.js"),
    stop: () => import("../../commands/stop/stop.js"),
  },
  ...{},
  workflows: () => import("../../commands/workflows/call.lazy.js"),
  ...{},
};
//@ chunk-18hwfzwa.js:40586-40620 placement
var COMMAND_DIALOG_NAMES = new Set(Object.keys(COMMAND_DIALOG_LOADERS));
export { COMMAND_DIALOG_LOADERS };
