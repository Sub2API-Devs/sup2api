/**
 * commands/install-github-app/index.ts
 *
 * /install-github-app 命令对象（claude-ai 或 console）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { env } from "../../utils/env.js";

/**
 * /install-github-app 命令对象（local-jsx）；描述：Set up Claude GitHub Actions for a repository；availability ["claude-ai","console"]；isEnabled: ()=>!i.DISABLE_INSTALL_GITHUB_APP_COMMAND；实现 chunk-4v9zy7gn.js 的 Si。
 */
//@ chunk-e6aww6q8.js:1732051-1732261 fingerprint = installGitHubApp (0.971)
var installGithubAppCommandDefinition = {
    type: "local-jsx",
    name: "install-github-app",
    description: "Set up Claude GitHub Actions for a repository",
    availability: ["claude-ai", "console"],
    isEnabled: () => !env.DISABLE_INSTALL_GITHUB_APP_COMMAND,
  },
  installGithubAppCommand = installGithubAppCommandDefinition;

export { installGithubAppCommand };
