/**
 * commands/install.tsx
 *
 * /install（CLI 子命令）原生构建安装界面
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install.tsx
 * pieces: chunk-g2yr2739.js (6)
 * attribution: placement 1, file-last-pair 1, fingerprint 4
 */
import { homedir } from "os";
import { join } from "path";
import { init_react_production, useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../components/design-system/BulletRow.js";
import { Text, Box } from "../ink/components/Text.js";
import { env } from "../utils/env.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { StatusIcon } from "../components/design-system/StatusIcon.js";
import { useClock } from "../ink/components/ClockContext.js";
import { logForDebugging } from "../utils/debug.js";
import { autoUpdatesChannel } from "../utils/updateChannel.js";
import {
  installLatest,
  checkInstall,
  cleanupNpmInstallations,
  cleanupShellAliases,
} from "../utils/nativeInstaller/installer.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { ManifestSignatureError } from "../utils/nativeInstaller/download.js";
import { useTimeout, render } from "../ink/hooks/useTerminalHooks.js";

//@ chunk-g2yr2739.js:14299-14303 placement
init_react_production();
//@ chunk-g2yr2739.js:14360-14432 file-last-pair
function renderDimMessage(message, index) {
  return jsxProd_default(
    BulletRow,
    {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: message,
      }),
    },
    index,
  );
}
//@ chunk-g2yr2739.js:14432-14572 fingerprint (2.1.88 match: getInstallationPath, 1)
function getInstallationPath() {
  let isWindows = env.platform === "win32";
  let homeDir = homedir();
  if (isWindows) return join(homeDir, ".local", "bin", "claude.exe").replaceAll("/", "\\");
  return "~/.local/bin/claude";
}
//@ chunk-g2yr2739.js:14572-15011 fingerprint (2.1.88 match: SetupNotes, 0.43)
function SetupNotes(props) {
  let $ = useMemoCache(5);
  let { messages } = props;
  if (messages.length === 0) {
    return null;
  }
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "warning",
        children: [
          jsxProd_default(StatusIcon, {
            status: "warning",
            withSpace: true,
          }),
          "Setup notes:",
        ],
      }),
    });
    $[0] = t1;
  } else t1 = $[0];
  let children;
  if ($[1] !== messages) {
    children = messages.map(renderDimMessage);
    $[1] = messages;
    $[2] = children;
  } else children = $[2];
  let t3;
  if ($[3] !== children) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 0,
      marginBottom: 1,
      children: [
        t1,
        jsxProd_default(Box, {
          flexDirection: "column",
          marginLeft: 2,
          children,
        }),
      ],
    });
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
//@ chunk-g2yr2739.js:15011-19692 fingerprint (2.1.88 match: Install, 0.732)
function Install({ onDone, force, target, storageV5 }) {
  let [state, setState] = useState({
    type: "checking",
  });
  let clock = useClock();
  useEffect(() => {
    async function run() {
      try {
        logForDebugging(`Install: Starting installation process (force=${force}, target=${target})`);
        let channelOrVersion = target || autoUpdatesChannel();
        setState({
          type: "installing",
          version: channelOrVersion,
        });
        logForDebugging(
          `Install: Calling installLatest(channelOrVersion=${channelOrVersion}, forceReinstall=${force})`,
        );
        let result = await installLatest(channelOrVersion, force, storageV5);
        logForDebugging(
          `Install: installLatest returned version=${result.latestVersion}, wasUpdated=${result.wasUpdated}, lockFailed=${result.lockFailed}`,
        );
        if (result.lockFailed)
          throw Error(
            "Could not install - another process is currently installing Claude. Please try again in a moment.",
          );
        if (!result.latestVersion)
          logForDebugging("Install: Failed to retrieve version information during install", {
            level: "error",
          });
        let alreadyInstalled = false;
        if (target === "latest" || target === "stable" || target === "rc") {
          let channel = target === "rc" ? "stable" : target;
          let { error } = await updateSettingsForSource(
            "userSettings",
            {
              autoUpdatesChannel: channel,
            },
            undefined,
            storageV5,
          );
          alreadyInstalled = error === null;
          logForDebugging(
            alreadyInstalled
              ? `Install: Saved autoUpdatesChannel=${channel} to user settings`
              : `Install: Could not save autoUpdatesChannel=${channel}: ${errorMessage(error)}`,
            {
              level: alreadyInstalled ? "debug" : "warn",
            },
          );
        }
        if (result.skippedUnverifiedRelease && result.latestVersion) {
          setState({
            type: "error",
            message: `Skipped: the update target for @${channelOrVersion} resolved to ${result.latestVersion}, which predates release-signature enforcement, so this client (${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            }) will not switch to it automatically.${alreadyInstalled ? " Channel preference saved." : ""} Run \`claude install ${result.latestVersion}\` to install that exact version.`,
          });
          return;
        }
        if (!result.wasUpdated) logForDebugging("Install: Already up to date");
        setState({
          type: "setting-up",
        });
        let setupMessages = await checkInstall(true);
        logForDebugging(`Install: Setup launcher completed with ${setupMessages.length} messages`);
        if (setupMessages.length > 0)
          setupMessages.forEach((msg) => logForDebugging(`Install: Setup message: ${msg.message}`));
        logForDebugging("Install: Cleaning up npm installations after successful install");
        let { removed, errors, warnings } = await cleanupNpmInstallations();
        if (removed > 0) logForDebugging(`Cleaned up ${removed} npm installation(s)`);
        if (errors.length > 0) logForDebugging(`Cleanup errors: ${errors.join(", ")}`);
        let aliasMessages = await cleanupShellAliases();
        if (aliasMessages.length > 0)
          logForDebugging(`Shell alias cleanup: ${aliasMessages.map((m) => m.message).join("; ")}`);
        logEvent("tengu_claude_install_command", {
          has_version: result.latestVersion ? 1 : 0,
          forced: force ? 1 : 0,
        });
        let allWarnings = [...warnings, ...aliasMessages.map((m_0) => m_0.message)];
        if (setupMessages.length > 0) {
          setState({
            type: "set-up",
            messages: setupMessages.map((m_1) => m_1.message),
          });
          clock.setTimeout(
            () =>
              setState({
                type: "success",
                version: result.latestVersion || "current",
                setupMessages: [...setupMessages.map((m_2) => m_2.message), ...allWarnings],
              }),
            2000,
          );
        } else {
          logForDebugging("Install: Shell PATH already configured");
          setState({
            type: "success",
            version: result.latestVersion || "current",
            setupMessages: allWarnings,
          });
        }
      } catch (error) {
        logForDebugging(`Install command failed: ${error}`, {
          level: "error",
        });
        setState({
          type: "error",
          message: errorMessage(error),
          forceMayHelp: !(error instanceof ManifestSignatureError),
        });
      }
    }
    run();
  }, [clock, force, target, storageV5]);
  useTimeout(
    () => {
      if (state.type === "success")
        onDone("Claude Code installation completed successfully", {
          display: "system",
        });
      else if (state.type === "error")
        onDone("Claude Code installation failed", {
          display: "system",
        });
    },
    state.type === "success" ? 2000 : state.type === "error" ? 3000 : null,
  );
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      state.type === "checking" &&
        jsxProd_default(Text, {
          color: "claude",
          children: "Checking installation status...",
        }),
      state.type === "installing" &&
        jsxProd_default_2(Text, {
          color: "claude",
          children: ["Installing Claude Code native build ", state.version, "..."],
        }),
      state.type === "setting-up" &&
        jsxProd_default(Text, {
          color: "claude",
          children: "Setting up launcher and shell integration...",
        }),
      state.type === "set-up" &&
        jsxProd_default(SetupNotes, {
          messages: state.messages,
        }),
      state.type === "success" &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default_2(Box, {
              children: [
                jsxProd_default(StatusIcon, {
                  status: "success",
                  withSpace: true,
                }),
                jsxProd_default(Text, {
                  color: "success",
                  bold: true,
                  children: "Claude Code successfully installed!",
                }),
              ],
            }),
            jsxProd_default_2(Box, {
              marginLeft: 2,
              flexDirection: "column",
              gap: 1,
              children: [
                state.version !== "current" &&
                  jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "Version: ",
                      }),
                      jsxProd_default(Text, {
                        color: "claude",
                        children: state.version,
                      }),
                    ],
                  }),
                jsxProd_default_2(Box, {
                  children: [
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Location: ",
                    }),
                    jsxProd_default(Text, {
                      color: "text",
                      children: getInstallationPath(),
                    }),
                  ],
                }),
              ],
            }),
            jsxProd_default(Box, {
              marginLeft: 2,
              flexDirection: "column",
              gap: 1,
              children: jsxProd_default_2(Box, {
                marginTop: 1,
                children: [
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "Next: Run ",
                  }),
                  jsxProd_default(Text, {
                    color: "claude",
                    bold: true,
                    children: "claude --help",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: " to get started",
                  }),
                ],
              }),
            }),
            state.setupMessages.length > 0 &&
              jsxProd_default(SetupNotes, {
                messages: state.setupMessages,
              }),
          ],
        }),
      state.type === "error" &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default_2(Box, {
              children: [
                jsxProd_default(StatusIcon, {
                  status: "error",
                  withSpace: true,
                }),
                jsxProd_default(Text, {
                  color: "error",
                  children: "Installation failed",
                }),
              ],
            }),
            jsxProd_default(Text, {
              color: "error",
              children: state.message,
            }),
            state.forceMayHelp &&
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  children: "Try running with --force to override checks",
                }),
              }),
          ],
        }),
    ],
  });
}
//@ chunk-g2yr2739.js:19692-19988 fingerprint (2.1.88 match: install, 1)
/**
 * /install 命令对象（local-jsx）；描述：Install Claude Code native build。
 */
var installCommand = {
  type: "local-jsx",
  name: "install",
  description: "Install Claude Code native build",
  argumentHint: "[options]",
  async call(onDone, context, args) {
    let force = args.includes("--force");
    let target = args.filter((arg) => !arg.startsWith("--"))[0];
    let { unmount } = await render(
      jsxProd_default(Install, {
        onDone: (result, options) => {
          unmount();
          onDone(result, options);
        },
        force,
        target,
        storageV5: context?.storageV5,
      }),
    );
  },
};
export { installCommand };
