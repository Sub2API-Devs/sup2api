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
async function refusedFromSession(message = IN_SESSION_EDIT_REFUSAL) {
  let { env } = await import("../../utils/env.js");
  return env.CLAUDE_CODE_CHILD_SESSION ? message : undefined;
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
async function readStdinBounded(maxBytes) {
  let chunks = [];
  let totalBytes = 0;
  let reader = Bun.stdin.stream().getReader();
  for (;;) {
    let { done, value: chunk } = await reader.read();
    if (done) break;
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(chunk);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
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
      withStorageV5(async (args) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-permission-rules reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let refusal = await refusedFromSession();
        if (refusal !== undefined) return cliError(refusal);
        let { runPermissionRuleEdit } = await import("../../utils/permissions/runPermissionRuleEdit.lazy.js");
        let stdinBounded = await readStdinBounded(2097152);
        let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (parsed === null) return cliError("claude edit-permission-rules: stdin is not a JSON edit");
        let result = await runPermissionRuleEdit(parsed, args);
        if (!result.ok) return cliError(result.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            warnings: result.warnings,
            stored: result.stored,
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
      withStorageV5(async (args) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-memory-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let refusal = await refusedFromSession();
        if (refusal !== undefined) return cliError(refusal);
        let { runMemorySettingsEdit } = await import("../../tools/ConfigTool/runMemorySettingsEdit.lazy.js");
        let stdinBounded = await readStdinBounded(4096);
        let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (parsed === null) return cliError("claude edit-memory-settings: stdin is not a JSON edit");
        let result = await runMemorySettingsEdit(parsed, args);
        if (!result.ok) return cliError(result.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: result.written,
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
      withStorageV5(async (args) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-skill-overrides reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let refusal = await refusedFromSession();
        if (refusal !== undefined) return cliError(refusal);
        let { runSkillOverrideEdit } = await import("../../commands/skills/skillOverrideEdit.js");
        let stdinBounded = await readStdinBounded(4096);
        let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (parsed === null) return cliError("claude edit-skill-overrides: stdin is not a JSON edit");
        let result = await runSkillOverrideEdit(parsed, getCwd(), args);
        if (!result.ok) return cliError(result.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: result.written,
            changed: result.changed,
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
      let refusal = await refusedFromSession();
      if (refusal !== undefined) return cliError(refusal);
      let { runSandboxSettingsEdit } =
        await import("../../tools/SandboxSettingsTool/runSandboxSettingsEdit.lazy.js");
      let stdinBounded = await readStdinBounded(4096);
      let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
      if (parsed === null) return cliError("claude edit-sandbox-settings: stdin is not a JSON edit");
      let result = await runSandboxSettingsEdit(parsed);
      if (!result.ok) return cliError(result.error);
      await writeStdoutAndDrain(
        jsonStringify({
          ok: true,
          written: result.written,
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
      withStorageV5(async (args, options) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude design-login --json is run by the VS Code extension, not by hand; use /design-login in a session",
          );
        let { isSpawnedByClaudeCodeSession } = await import("../../utils/claudeSubprocessEnv.js");
        if (isSpawnedByClaudeCodeSession()) return cliError(DESIGN_SIGNIN_REFUSED_INSIDE_SESSION);
        let { designLoginStatus, runDesignLoginSignIn } =
          await import("../../services/design/designLoginStatus.lazy.js");
        if (options.status) {
          await writeStdoutAndDrain(
            jsonStringify(await designLoginStatus()) +
              `
`,
          );
          return exitAfterAnalyticsFlush(0);
        }
        let abortController = new AbortController();
        let { markPrintModeSignalHandlersRegistered } = await import("../../utils/gracefulShutdown.js");
        process.once("SIGTERM", () => abortController.abort());
        process.once("SIGINT", () => abortController.abort());
        markPrintModeSignalHandlersRegistered();
        let result = await runDesignLoginSignIn({
          stdin: process.stdin,
          write: (text) =>
            writeStdoutAndDrain(
              text +
                `
`,
            ),
          signal: abortController.signal,
        });
        return exitAfterAnalyticsFlush(result.ok ? 0 : 1);
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
      withStorageV5(async (args) => {
        if (process.stdin.isTTY)
          return cliError(
            "claude edit-chrome-settings reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        let refusal = await refusedFromSession();
        if (refusal !== undefined) return cliError(refusal);
        let { runChromeSettingsEdit } =
          await import("../../utils/claudeInChrome/runChromeSettingsEdit.lazy.js");
        let stdinBounded = await readStdinBounded(4096);
        let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
        if (parsed === null) return cliError("claude edit-chrome-settings: stdin is not a JSON edit");
        let result = await runChromeSettingsEdit(parsed, args);
        if (!result.ok) return cliError(result.error);
        await writeStdoutAndDrain(
          jsonStringify({
            ok: true,
            written: result.written,
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
      let refusal = await refusedFromSession(
        "claude drop-worktree-registrations cannot run from inside a Claude Code session; it is run by the VS Code extension",
      );
      if (refusal !== undefined) return cliError(refusal);
      let { registrationDropsLine, runWorktreeRegistrationDrops } =
        await import("../../commands/permissions/registrationDropsLine.lazy.js");
      let stdinBounded = await readStdinBounded(262144);
      let parsed = stdinBounded === null ? null : safeParseJSON(stdinBounded, false);
      if (parsed === null) return cliError("claude drop-worktree-registrations: stdin is not a JSON request");
      let result = await runWorktreeRegistrationDrops(parsed);
      if (!result.ok) return cliError(result.error);
      await writeStdoutAndDrain(
        registrationDropsLine(result.outcomes) +
          `
`,
      );
      return cliOk();
    });
}
export { registerPermissionsCommands, refusedFromSession };
