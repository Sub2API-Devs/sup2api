/**
 * cli/handlers/purge.ts
 *
 * 2.1.316 新增：清除本地会话数据的子命令处理器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-shkzs7rp.js (3)
 * attribution: placement 3
 */
import { createHelpConfig } from "../helpFormat.js";
import { cliWarn } from "../exit.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";

//@ chunk-shkzs7rp.js:23454-23641 placement
var PROJECT_PURGE_RENAMED_NOTICE = "`claude project purge` is now `claude purge`",
  PURGE_DESCRIPTION =
    "Delete a project's Claude Code data (transcripts, tasks, file history, and its entry in ~/.claude.json) from this computer only";
/**
 * 注册 purge [path] 与其旧名 project purge（隐藏，打印改名提示）。
 */
//@ chunk-shkzs7rp.js:23641-23765 placement
function registerPurgeCommands(n, e) {
  registerPurgeCommand(n, e, !1);
  let configureHelp = n
    .command("project", { hidden: !0 })
    .description(PROJECT_PURGE_RENAMED_NOTICE)
    .configureHelp(createHelpConfig());
  return (registerPurgeCommand(configureHelp, e, !0), configureHelp);
}
//@ chunk-shkzs7rp.js:23765-24422 placement
function registerPurgeCommand(n, e, S) {
  n.command("purge [path]", { hidden: S })
    .description(S ? `${PROJECT_PURGE_RENAMED_NOTICE}. ${PURGE_DESCRIPTION}` : PURGE_DESCRIPTION)
    .allowExcessArguments(S)
    .option("--dry-run", "List what would be deleted without deleting anything")
    .option("-y, --yes", "Skip confirmation prompt")
    .option("-i, --interactive", "Prompt for each item before deleting")
    .option("--all", "Purge state for every project (mutually exclusive with [path])")
    .action(
      e(async (A, r, s) => {
        if (S)
          (cliWarn(`${PROJECT_PURGE_RENAMED_NOTICE}. The old name still works for now.`),
            await logEventAsync("tengu_dead_probe_project_purge_alias", { yes: s.yes === !0 }).catch((x) =>
              logError(toError(x)),
            ));
        let { purgeProjectHandler: purgeProjectHandler, purgeStoppedByError: purgeStoppedByError } =
          await import("./chunk-5f8vf2zr.js");
        await purgeProjectHandler(r, s, A).catch(purgeStoppedByError);
      }),
    );
}

export { registerPurgeCommands };
