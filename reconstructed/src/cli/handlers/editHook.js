/**
 * cli/handlers/editHook.ts
 *
 * 2.1.316 新增：编辑钩子子命令处理器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-shkzs7rp.js (1)
 * attribution: placement 1
 */
import { logFeatureBadAsync, logFeatureOkAsync } from "../../services/analytics/featureTelemetry.js";
import { cliErrorAfterAnalyticsFlush, cliOkAfterAnalyticsFlush } from "../exit.js";
import { safeParseJSON } from "../../utils/json.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * 注册隐藏子命令 edit-hook：从 stdin 读一条 JSON 钩子编辑（VS Code 扩展使用），TTY 或会话内调用时拒绝。
 */
//@ chunk-shkzs7rp.js:22472-23454 placement
function registerEditHookCommand(n, e) {
  n.command("edit-hook", { hidden: !0 })
    .allowExcessArguments(!1)
    .description("Apply one hook edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      e(async (S) => {
        if (process.stdin.isTTY)
          return (
            await logFeatureBadAsync("cli_edit_hook", "stdin_is_tty"),
            cliErrorAfterAnalyticsFlush(
              "claude edit-hook reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
            )
          );
        let { refusedFromSession: refusedFromSession } = await import("./chunk-tnfa2xpk.js"),
          r = await refusedFromSession();
        if (r !== void 0)
          return (
            await logFeatureBadAsync("cli_edit_hook", "spawned_by_session"),
            cliErrorAfterAnalyticsFlush(r)
          );
        let { runHookEdit: runHookEdit } = await import("./chunk-azbt01vf.js"),
          text = await new Response(Bun.stdin.stream()).text(),
          E = text.length <= 524288 ? safeParseJSON(text, !1) : null;
        if (E === null)
          return (
            await logFeatureBadAsync("cli_edit_hook", "stdin_not_json"),
            cliErrorAfterAnalyticsFlush("claude edit-hook: stdin is not a JSON edit")
          );
        let x = await runHookEdit(E, S);
        if (!x.ok)
          return (
            process.stdout.write(
              jsonStringify(x) +
                `
`,
            ),
            await logFeatureBadAsync("cli_edit_hook", x.code),
            cliErrorAfterAnalyticsFlush(x.error)
          );
        return (await logFeatureOkAsync("cli_edit_hook"), cliOkAfterAnalyticsFlush('{"ok":true}'));
      }),
    );
}

export { registerEditHookCommand };
