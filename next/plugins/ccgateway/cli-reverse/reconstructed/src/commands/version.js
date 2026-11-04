/**
 * commands/version.ts
 *
 * /version 命令对象（交互与无头两版，外部构建恒禁用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/version.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { getBuildRefSuffix } from "../cli/earlyArgs.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:2031395-2033346 fingerprint = version (0.334)
/**
 * callVersion：/version 非交互实现。
 */
var versionCommandDefinition = {
  type: "local-jsx",
  name: "version",
  description: "Show this session's version (autoupdate may have a newer one)",
  isEnabled: () => false,
  immediate: true,
  requires: {
    ink: true,
  },
};
var callVersion = async () => {
  let versionText = `${
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  }${getBuildRefSuffix()}`;
  return {
    type: "text",
    value: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME
      ? `${versionText} (built ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.BUILD_TIME
        })`
      : versionText,
  };
};
var versionNonInteractiveCommand = {
  type: "local",
  name: "version",
  description: "Print the version this session is running (not what autoupdate downloaded)",
  isEnabled: () => false,
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  supportsNonInteractive: true,
  load: () =>
    Promise.resolve({
      call: callVersion,
    }),
};
var versionCommand = versionCommandDefinition;
export { versionCommand, versionNonInteractiveCommand };
