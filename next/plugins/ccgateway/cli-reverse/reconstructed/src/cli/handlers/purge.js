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
var PROJECT_PURGE_RENAMED_NOTICE = "`claude project purge` is now `claude purge`";
var PURGE_DESCRIPTION =
  "Delete a project's Claude Code data (transcripts, tasks, file history, and its entry in ~/.claude.json) from this computer only";
//@ chunk-shkzs7rp.js:23641-23765 placement
/**
 * 注册 purge [path] 与其旧名 project purge（隐藏，打印改名提示）。
 */
function registerPurgeCommands(program, withStorageV5) {
  registerPurgeCommand(program, withStorageV5, false);
  let projectCommand = program
    .command("project", {
      hidden: true,
    })
    .description(PROJECT_PURGE_RENAMED_NOTICE)
    .configureHelp(createHelpConfig());
  registerPurgeCommand(projectCommand, withStorageV5, true);
  return projectCommand;
}
//@ chunk-shkzs7rp.js:23765-24422 placement
function registerPurgeCommand(program, withStorageV5, isAlias) {
  program
    .command("purge [path]", {
      hidden: isAlias,
    })
    .description(isAlias ? `${PROJECT_PURGE_RENAMED_NOTICE}. ${PURGE_DESCRIPTION}` : PURGE_DESCRIPTION)
    .allowExcessArguments(isAlias)
    .option("--dry-run", "List what would be deleted without deleting anything")
    .option("-y, --yes", "Skip confirmation prompt")
    .option("-i, --interactive", "Prompt for each item before deleting")
    .option("--all", "Purge state for every project (mutually exclusive with [path])")
    .action(
      withStorageV5(async (pathArg, options, commandOptions) => {
        if (isAlias) {
          cliWarn(`${PROJECT_PURGE_RENAMED_NOTICE}. The old name still works for now.`);
          await logEventAsync("tengu_dead_probe_project_purge_alias", {
            yes: commandOptions.yes === true,
          }).catch((error) => logError(toError(error)));
        }
        let { purgeProjectHandler, purgeStoppedByError } = await import("./purgeProjectHandler.lazy.js");
        await purgeProjectHandler(options, commandOptions, pathArg).catch(purgeStoppedByError);
      }),
    );
}
export { registerPurgeCommands };
