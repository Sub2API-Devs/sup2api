/**
 * services/mcpServe/shellCalls.ts
 *
 * 2.1.316 新增：mcp serve 运行 bash 命令、暂存文件、读取任务输出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  numberSchema,
  booleanSchema,
  union,
  literal,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { TASK_OUTPUT_TAIL_BYTES, tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { isTaskIdOfType } from "../../Task.js";

//@ chunk-xrwmcqkn.js:47515-47645 placement
/**
 * 读取任务输出的结果 schema。
 */
var READTASKOUTPUT = "ReadTaskOutput";
var readTaskOutputInputSchema = DoctorLazy(() =>
  zodStrictObject({
    task_id: stringSchema(),
  }),
);
var readTaskOutputResultSchema = DoctorLazy(() =>
  objectSchema({
    output: stringSchema().max(TASK_OUTPUT_TAIL_BYTES),
    total_bytes: numberSchema().int().min(0),
    truncated: booleanSchema(),
  }),
);
//@ chunk-xrwmcqkn.js:47645-47922 placement
async function serveReadTaskOutput(input) {
  let { task_id: taskId } = readTaskOutputInputSchema().parse(input);
  if (!isTaskIdOfType("local_bash", taskId)) throw Error("ReadTaskOutput: no shell task has that task_id");
  let { content, bytesRead, bytesTotal } = await tailOutputOfTask(taskId);
  return {
    summary: `Read ${bytesRead} of ${bytesTotal} bytes.`,
    output: {
      output: content,
      total_bytes: bytesTotal,
      truncated: bytesRead < bytesTotal,
    },
  };
}
//@ chunk-xrwmcqkn.js:47922-48036 placement
/**
 * 运行 bash 命令的结果 schema。
 */
var RUNBASHCOMMAND = "RunBashCommand";
var runBashCommandInputSchema = DoctorLazy(() =>
  zodStrictObject({
    command: stringSchema(),
    cwd: stringSchema().optional(),
  }),
);
var runBashCommandResultSchema = DoctorLazy(() =>
  objectSchema({
    outputText: stringSchema(),
    exitCode: numberSchema(),
  }),
);
//@ chunk-xrwmcqkn.js:48036-48353 placement
async function serveRunBashCommand(input, signal, context) {
  let { command, cwd } = runBashCommandInputSchema().parse(input);
  let { session, abortController } = context.toolUseContext();
  let { runHeadlessBashCommand } = await import("../../utils/shell/headlessBash.js");
  let { outputText, exitCode } = await runHeadlessBashCommand({
    command,
    cwd,
    abortSignal: abortController.signal,
    session,
  });
  return {
    summary: `exit ${exitCode}`,
    output: {
      outputText,
      exitCode,
    },
  };
}
//@ chunk-xrwmcqkn.js:48353-48802 placement
/**
 * 暂存文件的结果 schema。
 */
var STAGEFILE = "StageFile";
var stageFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    mount_path: stringSchema().min(1).max(4096),
    force: booleanSchema().optional(),
    credential: zodStrictObject({
      filestore_jwt: stringSchema().min(1).max(16384),
      filesystem_id: stringSchema().min(1).max(256),
      filestore_url: stringSchema().max(2048).optional(),
    }),
  }),
);
var HOOK_RESULT_SCHEMA = DoctorLazy(() =>
  union([
    objectSchema({
      ok: literal(true),
      noop: stringSchema().optional(),
      replaced: _enum([
        "nothing",
        "not_a_file",
        "same_contents",
        "different_contents",
        "same_size_not_compared",
        "unknown",
      ])
        .optional()
        .catch(undefined),
    }),
    objectSchema({
      ok: literal(false),
      error: stringSchema(),
      permanent: literal(true).optional(),
    }),
  ]),
);
//@ chunk-xrwmcqkn.js:48802-49059 placement
async function serveStageFile(input) {
  let { mount_path: mountPath, force, credential } = stageFileInputSchema().parse(input);
  let { stageFile, stageFileWireResult } = await import("../../utils/stageFile.js");
  let stageResult = await stageFile(
    {
      mount_path: mountPath,
      force,
    },
    credential,
  );
  return stageResult.ok
    ? {
        summary: "staged",
        output: stageFileWireResult(stageResult),
      }
    : {
        summary: "not staged",
        output: stageResult,
      };
}
export {
  STAGEFILE,
  serveStageFile,
  RUNBASHCOMMAND,
  serveRunBashCommand,
  READTASKOUTPUT,
  serveReadTaskOutput,
};
