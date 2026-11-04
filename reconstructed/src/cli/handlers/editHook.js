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

//@ chunk-shkzs7rp.js:22472-23454 placement
/**
 * 注册隐藏子命令 edit-hook：从 stdin 读一条 JSON 钩子编辑（VS Code 扩展使用），TTY 或会话内调用时拒绝。
 */
function registerEditHookCommand(program, withStorageV5) {
  program
    .command("edit-hook", {
      hidden: true,
    })
    .allowExcessArguments(false)
    .description("Apply one hook edit read as JSON from stdin (used by the VS Code extension)")
    .requiredOption("--json", "Read the edit as JSON from stdin")
    .action(
      withStorageV5(async (storage) => {
        if (process.stdin.isTTY) {
          await logFeatureBadAsync("cli_edit_hook", "stdin_is_tty");
          return cliErrorAfterAnalyticsFlush(
            "claude edit-hook reads one JSON edit from stdin; it is run by the VS Code extension, not by hand",
          );
        }
        let { refusedFromSession } = await import("./editSettingsCommands.js");
        let refusal = await refusedFromSession();
        if (refusal !== undefined) {
          await logFeatureBadAsync("cli_edit_hook", "spawned_by_session");
          return cliErrorAfterAnalyticsFlush(refusal);
        }
        let { runHookEdit } = await import("../../utils/hooks/runHookEdit.lazy.js");
        let text = await new Response(Bun.stdin.stream()).text();
        let parsed = text.length <= 524288 ? safeParseJSON(text, false) : null;
        if (parsed === null) {
          await logFeatureBadAsync("cli_edit_hook", "stdin_not_json");
          return cliErrorAfterAnalyticsFlush("claude edit-hook: stdin is not a JSON edit");
        }
        let result = await runHookEdit(parsed, storage);
        if (!result.ok) {
          process.stdout.write(
            jsonStringify(result) +
              `
`,
          );
          await logFeatureBadAsync("cli_edit_hook", result.code);
          return cliErrorAfterAnalyticsFlush(result.error);
        }
        await logFeatureOkAsync("cli_edit_hook");
        return cliOkAfterAnalyticsFlush('{"ok":true}');
      }),
    );
}
export { registerEditHookCommand };
