/**
 * cli/handlers/editSettingsCommands.ts
 *
 * 2.1.316 新增。注册 VS Code 扩展使用的 edit-permission-rules/edit-memory-settings/edit-skill-overrides 子命令（从 stdin 读 JSON 编辑）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bm6cnxej.js (4)
 * attribution: placement 4
 */
import { cliError, writeStdoutAndDrain, cliOk, exitAfterAnalyticsFlush } from "../exit.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getCwd } from "../../utils/cwd.js";

//@ chunk-bm6cnxej.js:343-458 placement
async function refusedFromSession(o = IN_SESSION_EDIT_REFUSAL) {
  let { env: env } = await import("./chunk-sa88k60q.js");
  return env.CLAUDE_CODE_CHILD_SESSION ? o : void 0;
}
/**
 * 会话内编辑器不能改设置的拒绝文案
 */
//@ chunk-bm6cnxej.js:458-727 placement
var IN_SESSION_EDIT_REFUSAL =
    "This setting cannot be changed from an editor started inside a Claude Code session. Start the editor outside the session and try again.",
  f =
    "Claude Design cannot be signed in from inside a Claude Code session. Start the editor outside the session and try again.";
/**
 * 有上限地读完 stdin
 */
//@ chunk-bm6cnxej.js:727-959 placement
async function readStdinBounded(o) {
  let d = [],
    i = 0,
    reader = Bun.stdin.stream().getReader();
  for (;;) {
    let { done: r, value: t } = await reader.read();
    if (r) break;
    if (((i += t.byteLength), i > o)) return (await reader.cancel(), null);
    d.push(t);
  }
  return new TextDecoder().decode(Buffer.concat(d));
}
/**
 * 注册 VS Code 扩展使用的 edit-permission-rules/edit-memory-settings/edit-skill-overrides 子命令（从 stdin 读 JSON 编辑）。
 */
//@ chunk-bm6cnxej.js:959-6572 placement
function registerPermissionsCommands(o, d) {
  (o
    .command("edit-permission-rules", { hidden: !0 })
    .allowExcessArguments(!1)
    .description("Apply one permission-rule edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      d(async (i) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-permission-rules reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let n = await refusedFromSession();
        if (n !== void 0) return cliError(n);
        let { runPermissionRuleEdit: runPermissionRuleEdit } = await import("./chunk-cgsbs2dj.js"),
          t = await readStdinBounded(2097152),
          s = t === null ? null : safeParseJSON(t, !1);
        if (s === null) return cliError("claude edit-permission-rules: stdin is not a JSON edit");
        let e = await runPermissionRuleEdit(s, i);
        if (!e.ok) return cliError(e.error);
        return (
          await writeStdoutAndDrain(
            jsonStringify({ ok: !0, warnings: e.warnings, stored: e.stored }) +
              `
`,
          ),
          cliOk()
        );
      }),
    ),
    o
      .command("edit-memory-settings", { hidden: !0 })
      .allowExcessArguments(!1)
      .description("Apply one memory-settings edit read as JSON from stdin (used by the VS Code extension)")
      .requiredOption("--json", "Read the edit as JSON from stdin")
      .action(
        d(async (i) => {
          if (process.stdin.isTTY)
            return cliError(
              "claude edit-memory-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
            );
          let n = await refusedFromSession();
          if (n !== void 0) return cliError(n);
          let { runMemorySettingsEdit: runMemorySettingsEdit } = await import("./chunk-vtcvnd20.js"),
            t = await readStdinBounded(4096),
            s = t === null ? null : safeParseJSON(t, !1);
          if (s === null) return cliError("claude edit-memory-settings: stdin is not a JSON edit");
          let e = await runMemorySettingsEdit(s, i);
          if (!e.ok) return cliError(e.error);
          return (
            await writeStdoutAndDrain(
              jsonStringify({ ok: !0, written: e.written }) +
                `
`,
            ),
            exitAfterAnalyticsFlush(0)
          );
        }),
      ),
    o
      .command("edit-skill-overrides", { hidden: !0 })
      .allowExcessArguments(!1)
      .description("Apply one skill state edit read as JSON from stdin (used by the VS Code extension)")
      .requiredOption("--json", "Read the edit as JSON from stdin")
      .action(
        d(async (i) => {
          if (process.stdin.isTTY)
            return cliError(
              "claude edit-skill-overrides reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
            );
          let n = await refusedFromSession();
          if (n !== void 0) return cliError(n);
          let { runSkillOverrideEdit: runSkillOverrideEdit } = await import("./chunk-wf4qcsws.js"),
            t = await readStdinBounded(4096),
            s = t === null ? null : safeParseJSON(t, !1);
          if (s === null) return cliError("claude edit-skill-overrides: stdin is not a JSON edit");
          let e = await runSkillOverrideEdit(s, getCwd(), i);
          if (!e.ok) return cliError(e.error);
          return (
            await writeStdoutAndDrain(
              jsonStringify({ ok: !0, written: e.written, changed: e.changed }) +
                `
`,
            ),
            cliOk()
          );
        }),
      ),
    o
      .command("edit-sandbox-settings", { hidden: !0 })
      .allowExcessArguments(!1)
      .description("Apply one sandbox settings edit read as JSON from stdin (used by the VS Code extension)")
      .requiredOption("--json", "Read the edit as JSON from stdin")
      .action(async () => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-sandbox-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let i = await refusedFromSession();
        if (i !== void 0) return cliError(i);
        let { runSandboxSettingsEdit: runSandboxSettingsEdit } = await import("./chunk-ht1p3xhv.js"),
          r = await readStdinBounded(4096),
          t = r === null ? null : safeParseJSON(r, !1);
        if (t === null) return cliError("claude edit-sandbox-settings: stdin is not a JSON edit");
        let s = await runSandboxSettingsEdit(t);
        if (!s.ok) return cliError(s.error);
        return (
          await writeStdoutAndDrain(
            jsonStringify({ ok: !0, written: s.written }) +
              `
`,
          ),
          exitAfterAnalyticsFlush(0)
        );
      }),
    o
      .command("design-login", { hidden: !0 })
      .allowExcessArguments(!1)
      .description(
        "Run the Claude Design sign-in, or report its state, as JSON lines (used by the VS Code extension)",
      )
      .requiredOption("--json", "Write JSON lines to stdout")
      .option("--status", "Report whether design-system access is authorized, and exit")
      .action(
        d(async (i, n) => {
          if (process.stdin.isTTY)
            return cliError(
              "claude design-login --json is run by the VS Code extension, not by hand; use /design-login in a session",
            );
          let { isSpawnedByClaudeCodeSession: isSpawnedByClaudeCodeSession } =
            await import("./chunk-10ctreq3.js");
          if (isSpawnedByClaudeCodeSession()) return cliError(f);
          let { designLoginStatus: designLoginStatus, runDesignLoginSignIn: runDesignLoginSignIn } =
            await import("./chunk-fbn843tx.js");
          if (n.status)
            return (
              await writeStdoutAndDrain(
                jsonStringify(await designLoginStatus()) +
                  `
`,
              ),
              exitAfterAnalyticsFlush(0)
            );
          let abortController = new AbortController(),
            { markPrintModeSignalHandlersRegistered: markPrintModeSignalHandlersRegistered } =
              await import("./chunk-r3wdn2dp.js");
          (process.once("SIGTERM", () => abortController.abort()),
            process.once("SIGINT", () => abortController.abort()),
            markPrintModeSignalHandlersRegistered());
          let l = await runDesignLoginSignIn({
            stdin: process.stdin,
            write: (c) =>
              writeStdoutAndDrain(
                c +
                  `
`,
              ),
            signal: abortController.signal,
          });
          return exitAfterAnalyticsFlush(l.ok ? 0 : 1);
        }),
      ),
    o
      .command("edit-chrome-settings", { hidden: !0 })
      .allowExcessArguments(!1)
      .description(
        "Apply one Claude in Chrome settings edit read as JSON from stdin (used by the VS Code extension)",
      )
      .requiredOption("--json", "Read the edit as JSON from stdin")
      .action(
        d(async (i) => {
          if (process.stdin.isTTY)
            return cliError(
              "claude edit-chrome-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
            );
          let n = await refusedFromSession();
          if (n !== void 0) return cliError(n);
          let { runChromeSettingsEdit: runChromeSettingsEdit } = await import("./chunk-q3c4ejfd.js"),
            t = await readStdinBounded(4096),
            s = t === null ? null : safeParseJSON(t, !1);
          if (s === null) return cliError("claude edit-chrome-settings: stdin is not a JSON edit");
          let e = await runChromeSettingsEdit(s, i);
          if (!e.ok) return cliError(e.error);
          return (
            await writeStdoutAndDrain(
              jsonStringify({ ok: !0, written: e.written }) +
                `
`,
            ),
            cliOk()
          );
        }),
      ),
    o
      .command("drop-worktree-registrations", { hidden: !0 })
      .allowExcessArguments(!1)
      .description(
        "Drop deleted worktrees' git registrations named as JSON on stdin (used by the VS Code extension)",
      )
      .requiredOption("--json", "Read the request as JSON from stdin")
      .action(async () => {
        if (process.stdin.isTTY)
          return cliError(
            "claude drop-worktree-registrations reads one JSON request from stdin; it is run by the VS Code extension, not by hand",
          );
        let i = await refusedFromSession(
          "claude drop-worktree-registrations cannot run from inside a Claude Code session; it is run by the VS Code extension",
        );
        if (i !== void 0) return cliError(i);
        let {
            registrationDropsLine: registrationDropsLine,
            runWorktreeRegistrationDrops: runWorktreeRegistrationDrops,
          } = await import("./chunk-5sfp2t4x.js"),
          t = await readStdinBounded(262144),
          s = t === null ? null : safeParseJSON(t, !1);
        if (s === null) return cliError("claude drop-worktree-registrations: stdin is not a JSON request");
        let e = await runWorktreeRegistrationDrops(s);
        if (!e.ok) return cliError(e.error);
        return (
          await writeStdoutAndDrain(
            registrationDropsLine(e.outcomes) +
              `
`,
          ),
          cliOk()
        );
      }));
}

export { registerPermissionsCommands, refusedFromSession };
