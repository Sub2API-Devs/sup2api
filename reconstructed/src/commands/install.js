/**
 * commands/install.tsx
 *
 * /install（CLI 子命令）原生构建安装界面
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install.tsx
 * pieces: chunk-na8jp6ng.js (6)
 * attribution: placement 1, file-last-pair 1, fingerprint 4
 */
import { homedir } from "os";
import { join } from "path";
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../components/design-system/BulletRow.js";
import { Text, Box } from "../ink/components/Text.js";
import { env } from "../utils/env.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { StatusIcon } from "../components/design-system/StatusIcon.js";
import { useClock } from "../ink/components/ClockContext.js";
import { logForDebugging } from "../utils/debug.js";
import { y9 } from "../utils/updateChannel.js";
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

//@ chunk-na8jp6ng.js:13095-13099 placement
j();
//@ chunk-na8jp6ng.js:13156-13228 file-last-pair
function N(message, index) {
  return e(BulletRow, { children: e(Text, { dimColor: !0, children: message }) }, index);
}
//@ chunk-na8jp6ng.js:13228-13368 fingerprint = getInstallationPath (1)
function getInstallationPath() {
  let isWindows = env.platform === "win32",
    homeDir = homedir();
  if (isWindows) return join(homeDir, ".local", "bin", "claude.exe").replaceAll("/", "\\");
  return "~/.local/bin/claude";
}
//@ chunk-na8jp6ng.js:13368-13807 fingerprint = SetupNotes (0.431)
function SetupNotes(t0) {
  let l = w(5),
    { messages: messages } = t0;
  if (messages.length === 0) {
    return null;
  }
  let h;
  if (l[0] === MEMO_CACHE_SENTINEL)
    ((h = e(Box, {
      children: r(Text, {
        color: "warning",
        children: [e(StatusIcon, { status: "warning", withSpace: !0 }), "Setup notes:"],
      }),
    })),
      (l[0] = h));
  else h = l[0];
  let o;
  if (l[1] !== messages) ((o = messages.map(N)), (l[1] = messages), (l[2] = o));
  else o = l[2];
  let g;
  if (l[3] !== o)
    ((g = r(Box, {
      flexDirection: "column",
      gap: 0,
      marginBottom: 1,
      children: [h, e(Box, { flexDirection: "column", marginLeft: 2, children: o })],
    })),
      (l[3] = o),
      (l[4] = g));
  else g = l[4];
  return g;
}
//@ chunk-na8jp6ng.js:13807-18584 fingerprint = Install (0.73)
function Install({ onDone: onDone, force: force, target: target, storageV5: storageV5 }) {
  let [o, g] = y({ type: "checking" }),
    C = useClock();
  return (
    P(() => {
      async function run() {
        try {
          logForDebugging(`Install: Starting installation process (force=${force}, target=${target})`);
          let channelOrVersion = target || y9();
          (g({ type: "installing", version: channelOrVersion }),
            logForDebugging(
              `Install: Calling installLatest(channelOrVersion=${channelOrVersion}, forceReinstall=${force})`,
            ));
          let p = await installLatest(channelOrVersion, force, storageV5);
          if (
            (logForDebugging(
              `Install: installLatest returned version=${p.latestVersion}, wasUpdated=${p.wasUpdated}, lockFailed=${p.lockFailed}`,
            ),
            p.lockFailed)
          )
            throw Error(
              "Could not install - another process is currently installing Claude. Please try again in a moment.",
            );
          if (!p.latestVersion)
            logForDebugging("Install: Failed to retrieve version information during install", {
              level: "error",
            });
          let I = !1;
          if (target === "latest" || target === "stable" || target === "rc") {
            let u = target === "rc" ? "stable" : target,
              { error: error } = await updateSettingsForSource(
                "userSettings",
                { autoUpdatesChannel: u },
                void 0,
                storageV5,
              );
            ((I = error === null),
              logForDebugging(
                I
                  ? `Install: Saved autoUpdatesChannel=${u} to user settings`
                  : `Install: Could not save autoUpdatesChannel=${u}: ${errorMessage(error)}`,
                { level: I ? "debug" : "warn" },
              ));
          }
          if (p.skippedUnverifiedRelease && p.latestVersion) {
            g({
              type: "error",
              message: `Skipped: the update target for @${channelOrVersion} resolved to ${p.latestVersion}, which predates release-signature enforcement, so this client (${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}) will not switch to it automatically.${I ? " Channel preference saved." : ""} Run \`claude install ${p.latestVersion}\` to install that exact version.`,
            });
            return;
          }
          if (!p.wasUpdated) logForDebugging("Install: Already up to date");
          g({ type: "setting-up" });
          let setupMessages = await checkInstall(!0);
          if (
            (logForDebugging(`Install: Setup launcher completed with ${setupMessages.length} messages`),
            setupMessages.length > 0)
          )
            setupMessages.forEach((msg) => logForDebugging(`Install: Setup message: ${msg.message}`));
          logForDebugging("Install: Cleaning up npm installations after successful install");
          let { removed: removed, errors: errors, warnings: warnings } = await cleanupNpmInstallations();
          if (removed > 0) logForDebugging(`Cleaned up ${removed} npm installation(s)`);
          if (errors.length > 0) logForDebugging(`Cleanup errors: ${errors.join(", ")}`);
          let aliasMessages = await cleanupShellAliases();
          if (aliasMessages.length > 0)
            logForDebugging(`Shell alias cleanup: ${aliasMessages.map((u) => u.message).join("; ")}`);
          logEvent("tengu_claude_install_command", {
            has_version: p.latestVersion ? 1 : 0,
            forced: force ? 1 : 0,
          });
          let allWarnings = [...warnings, ...aliasMessages.map((m_0) => m_0.message)];
          if (setupMessages.length > 0)
            (g({ type: "set-up", messages: setupMessages.map((m_1) => m_1.message) }),
              C.setTimeout(
                () =>
                  g({
                    type: "success",
                    version: p.latestVersion || "current",
                    setupMessages: [...setupMessages.map((m_2) => m_2.message), ...allWarnings],
                  }),
                2000,
              ));
          else
            (logForDebugging("Install: Shell PATH already configured"),
              g({ type: "success", version: p.latestVersion || "current", setupMessages: allWarnings }));
        } catch (error) {
          (logForDebugging(`Install command failed: ${error}`, { level: "error" }),
            g({
              type: "error",
              message: errorMessage(error),
              forceMayHelp: !(error instanceof ManifestSignatureError),
            }));
        }
      }
      run();
    }, [C, force, target, storageV5]),
    useTimeout(
      () => {
        if (o.type === "success")
          onDone("Claude Code installation completed successfully", { display: "system" });
        else if (o.type === "error") onDone("Claude Code installation failed", { display: "system" });
      },
      o.type === "success" ? 2000 : o.type === "error" ? 3000 : null,
    ),
    r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        o.type === "checking" && e(Text, { color: "claude", children: "Checking installation status..." }),
        o.type === "cleaning-npm" &&
          e(Text, { color: "warning", children: "Cleaning up old npm installations..." }),
        o.type === "installing" &&
          r(Text, { color: "claude", children: ["Installing Claude Code native build ", o.version, "..."] }),
        o.type === "setting-up" &&
          e(Text, { color: "claude", children: "Setting up launcher and shell integration..." }),
        o.type === "set-up" && e(SetupNotes, { messages: o.messages }),
        o.type === "success" &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              r(Box, {
                children: [
                  e(StatusIcon, { status: "success", withSpace: !0 }),
                  e(Text, { color: "success", bold: !0, children: "Claude Code successfully installed!" }),
                ],
              }),
              r(Box, {
                marginLeft: 2,
                flexDirection: "column",
                gap: 1,
                children: [
                  o.version !== "current" &&
                    r(Box, {
                      children: [
                        e(Text, { dimColor: !0, children: "Version: " }),
                        e(Text, { color: "claude", children: o.version }),
                      ],
                    }),
                  r(Box, {
                    children: [
                      e(Text, { dimColor: !0, children: "Location: " }),
                      e(Text, { color: "text", children: getInstallationPath() }),
                    ],
                  }),
                ],
              }),
              e(Box, {
                marginLeft: 2,
                flexDirection: "column",
                gap: 1,
                children: r(Box, {
                  marginTop: 1,
                  children: [
                    e(Text, { dimColor: !0, children: "Next: Run " }),
                    e(Text, { color: "claude", bold: !0, children: "claude --help" }),
                    e(Text, { dimColor: !0, children: " to get started" }),
                  ],
                }),
              }),
              o.setupMessages.length > 0 && e(SetupNotes, { messages: o.setupMessages }),
            ],
          }),
        o.type === "error" &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              r(Box, {
                children: [
                  e(StatusIcon, { status: "error", withSpace: !0 }),
                  e(Text, { color: "error", children: "Installation failed" }),
                ],
              }),
              e(Text, { color: "error", children: o.message }),
              o.forceMayHelp &&
                e(Box, {
                  marginTop: 1,
                  children: e(Text, {
                    dimColor: !0,
                    children: "Try running with --force to override checks",
                  }),
                }),
            ],
          }),
      ],
    })
  );
}
/**
 * /install 命令对象（local-jsx）；描述：Install Claude Code native build。
 */
//@ chunk-na8jp6ng.js:18584-18880 fingerprint = install (1)
var installCommand = {
  type: "local-jsx",
  name: "install",
  description: "Install Claude Code native build",
  argumentHint: "[options]",
  async call(f, c, l) {
    let included = l.includes("--force"),
      g = l.filter((x) => !x.startsWith("--"))[0],
      { unmount: unmount } = await render(
        e(Install, {
          onDone: (x, m) => {
            (unmount(), f(x, m));
          },
          force: included,
          target: g,
          storageV5: c?.storageV5,
        }),
      );
  },
};
