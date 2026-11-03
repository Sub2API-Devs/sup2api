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
  let { env } = await import("./chunk-sa88k60q.js");
  return env.CLAUDE_CODE_CHILD_SESSION ? o : undefined;
}
//@ chunk-bm6cnxej.js:458-727 placement
/**
 * 会话内编辑器不能改设置的拒绝文案
 */
var IN_SESSION_EDIT_REFUSAL =
  "This setting cannot be changed from an editor started inside a Claude Code session. Start the editor outside the session and try again.";
var DESIGN_SIGNIN_REFUSED_INSIDE_SESSION =
  "Claude Design cannot be signed in from inside a Claude Code session. Start the editor outside the session and try again.";
//@ chunk-bm6cnxej.js:727-959 placement
/**
 * 有上限地读完 stdin
 */
async function readStdinBounded(o) {
  let d = [];
  let i = 0;
  let reader = Bun.stdin.stream().getReader();
  for (;;) {
    let { done: r, value: t } = await reader.read();
    if (r) break;
    i += t.byteLength;
    if (i > o) {
      await reader.cancel();
      return null;
    }
    d.push(t);
  }
  return new TextDecoder().decode(Buffer.concat(d));
}
//@ chunk-bm6cnxej.js:959-6572 placement
/**
 * 注册 VS Code 扩展使用的 edit-permission-rules/edit-memory-settings/edit-skill-overrides 子命令（从 stdin 读 JSON 编辑）。
 */
function registerPermissionsCommands(program, withStorageV5) {
  program
    .command("edit-permission-rules", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description("Apply one permission-rule edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      withStorageV5(async (i) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-permission-rules reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let n = await refusedFromSession();
        if (n !== undefined) return cliError(n);
        let { runPermissionRuleEdit } = await import("./chunk-cgsbs2dj.js");
        let stdinBounded = await readStdinBounded(2097152);
        let s = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (s === null) return cliError("claude edit-permission-rules: stdin is not a JSON edit");
        let e = await runPermissionRuleEdit(s, i);
        if (!e.ok) return cliError(e.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            warnings: e.warnings,
            stored: e.stored,
          }) +
            `
`,
        );
        return cliOk();
      }),
    );
  program
    .command("edit-memory-settings", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description("Apply one memory-settings edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      withStorageV5(async (i) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-memory-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let n = await refusedFromSession();
        if (n !== undefined) return cliError(n);
        let { runMemorySettingsEdit } = await import("./chunk-vtcvnd20.js");
        let stdinBounded = await readStdinBounded(4096);
        let s = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (s === null) return cliError("claude edit-memory-settings: stdin is not a JSON edit");
        let e = await runMemorySettingsEdit(s, i);
        if (!e.ok) return cliError(e.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: e.written,
          }) +
            `
`,
        );
        return exitAfterAnalyticsFlush(0);
      }),
    );
  program
    .command("edit-skill-overrides", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description("Apply one skill state edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      withStorageV5(async (i) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-skill-overrides reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let n = await refusedFromSession();
        if (n !== undefined) return cliError(n);
        let { runSkillOverrideEdit } = await import("./chunk-wf4qcsws.js");
        let stdinBounded = await readStdinBounded(4096);
        let s = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (s === null) return cliError("claude edit-skill-overrides: stdin is not a JSON edit");
        let e = await runSkillOverrideEdit(s, getCwd(), i);
        if (!e.ok) return cliError(e.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: e.written,
            changed: e.changed,
          }) +
            `
`,
        );
        return cliOk();
      }),
    );
  program
    .command("edit-sandbox-settings", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description("Apply one sandbox settings edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(async () => {
      if (process.stdin.isTTY)
        return cliError(
          "claude edit-sandbox-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
        );
      let i = await refusedFromSession();
      if (i !== undefined) return cliError(i);
      let { runSandboxSettingsEdit } = await import("./chunk-ht1p3xhv.js");
      let stdinBounded = await readStdinBounded(4096);
      let t = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
      if (t === null) return cliError("claude edit-sandbox-settings: stdin is not a JSON edit");
      let s = await runSandboxSettingsEdit(t);
      if (!s.ok) return cliError(s.error);
      await writeStdoutAndDrain(
        jsonStringify({
          ok: true,
          written: s.written,
        }) +
          `
`,
      );
      return exitAfterAnalyticsFlush(0);
    });
  program
    .command("design-login", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description(
      "Run the Claude Design sign-in, or report its state, as JSON lines (used by the VS Code extension)",
    )
    .requiredOption("--json", "Write JSON lines to stdout")
    .option("--status", "Report whether design-system access is authorized, and exit")
    .action(
      withStorageV5(async (i, n) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude design-login --json is run by the VS Code extension, not by hand; use /design-login in a session",
          );
        let { isSpawnedByClaudeCodeSession } = await import("./chunk-10ctreq3.js");
        if (isSpawnedByClaudeCodeSession()) return cliError(DESIGN_SIGNIN_REFUSED_INSIDE_SESSION);
        let { designLoginStatus, runDesignLoginSignIn } = await import("./chunk-fbn843tx.js");
        if (n.status) {
          await writeStdoutAndDrain(
            jsonStringify(await designLoginStatus()) +
              `
`,
          );
          return exitAfterAnalyticsFlush(0);
        }
        let abortController = new AbortController();
        let { markPrintModeSignalHandlersRegistered } = await import("./chunk-r3wdn2dp.js");
        process.once("SIGTERM", () => abortController.abort());
        process.once("SIGINT", () => abortController.abort());
        markPrintModeSignalHandlersRegistered();
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
    );
  program
    .command("edit-chrome-settings", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description(
      "Apply one Claude in Chrome settings edit read as JSON from stdin (used by the VS Code extension)",
    )
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      withStorageV5(async (i) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-chrome-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let n = await refusedFromSession();
        if (n !== undefined) return cliError(n);
        let { runChromeSettingsEdit } = await import("./chunk-q3c4ejfd.js");
        let stdinBounded = await readStdinBounded(4096);
        let s = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (s === null) return cliError("claude edit-chrome-settings: stdin is not a JSON edit");
        let e = await runChromeSettingsEdit(s, i);
        if (!e.ok) return cliError(e.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: e.written,
          }) +
            `
`,
        );
        return cliOk();
      }),
    );
  program
    .command("drop-worktree-registrations", {
      hidden: true,
    })
    .allowExcessArguments(false)
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
      if (i !== undefined) return cliError(i);
      let { registrationDropsLine, runWorktreeRegistrationDrops } = await import("./chunk-5sfp2t4x.js");
      let stdinBounded = await readStdinBounded(262144);
      let s = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
      if (s === null) return cliError("claude drop-worktree-registrations: stdin is not a JSON request");
      let e = await runWorktreeRegistrationDrops(s);
      if (!e.ok) return cliError(e.error);
      await writeStdoutAndDrain(
        registrationDropsLine(e.outcomes) +
          `
`,
      );
      return cliOk();
    });
}
export { registerPermissionsCommands, refusedFromSession };
