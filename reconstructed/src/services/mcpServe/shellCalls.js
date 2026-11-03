/**
 * services/mcpServe/shellCalls.ts
 *
 * 2.1.316 新增：mcp serve 运行 bash 命令、暂存文件、读取任务输出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (6)
 * attribution: placement 6
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, u, E, M, union, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { TASK_OUTPUT_TAIL_BYTES, tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { isTaskIdOfType } from "../../Task.js";

//@ chunk-wy9dbk5f.js:51824-51954 placement
/**
 * 读取任务输出的结果 schema。
 */
var READTASKOUTPUT = "ReadTaskOutput";
var readTaskOutputInputSchema = DoctorLazy(() =>
  zodStrictObject({
    task_id: string(),
  }),
);
var readTaskOutputResultSchema = DoctorLazy(() =>
  u({
    output: string().max(TASK_OUTPUT_TAIL_BYTES),
    total_bytes: E().int().min(0),
    truncated: M(),
  }),
);
//@ chunk-wy9dbk5f.js:51954-52231 placement
async function serveReadTaskOutput(e) {
  let { task_id: taskId } = readTaskOutputInputSchema().parse(e);
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
//@ chunk-wy9dbk5f.js:52231-52345 placement
/**
 * 运行 bash 命令的结果 schema。
 */
var RUNBASHCOMMAND = "RunBashCommand";
var runBashCommandInputSchema = DoctorLazy(() =>
  zodStrictObject({
    command: string(),
    cwd: string().optional(),
  }),
);
var runBashCommandResultSchema = DoctorLazy(() =>
  u({
    outputText: string(),
    exitCode: E(),
  }),
);
//@ chunk-wy9dbk5f.js:52345-52662 placement
async function serveRunBashCommand(e, r, n) {
  let { command, cwd } = runBashCommandInputSchema().parse(e);
  let { session, abortController } = n.toolUseContext();
  let { runHeadlessBashCommand } = await import("./chunk-9f02q1bz.js");
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
//@ chunk-wy9dbk5f.js:52662-52977 placement
/**
 * 暂存文件的结果 schema。
 */
var STAGEFILE = "StageFile";
var stageFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    mount_path: string().min(1).max(4096),
    force: M().optional(),
    credential: zodStrictObject({
      filestore_jwt: string().min(1).max(16384),
      filesystem_id: string().min(1).max(256),
      filestore_url: string().max(2048).optional(),
    }),
  }),
);
var stageFileResultSchema = DoctorLazy(() =>
  union([
    u({
      ok: literal(true),
      noop: string().optional(),
    }),
    u({
      ok: literal(false),
      error: string(),
      permanent: literal(true).optional(),
    }),
  ]),
);
//@ chunk-wy9dbk5f.js:52977-53234 placement
async function serveStageFile(e) {
  let { mount_path: mountPath, force, credential } = stageFileInputSchema().parse(e);
  let { stageFile, stageFileWireResult } = await import("./chunk-q02nzdea.js");
  let y = await stageFile(
    {
      mount_path: mountPath,
      force,
    },
    credential,
  );
  return y.ok
    ? {
        summary: "staged",
        output: stageFileWireResult(y),
      }
    : {
        summary: "not staged",
        output: y,
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
