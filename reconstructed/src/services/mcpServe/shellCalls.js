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
import { zodStrictObject, o, u as u_2, E, M, Ue, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { TASK_OUTPUT_TAIL_BYTES, tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { isTaskIdOfType } from "../../Task.js";

//@ chunk-wy9dbk5f.js:51824-51954 placement
var READTASKOUTPUT = "ReadTaskOutput",
  kr = DoctorLazy(() => zodStrictObject({ task_id: o() })),
  lu = DoctorLazy(() =>
    u_2({ output: o().max(TASK_OUTPUT_TAIL_BYTES), total_bytes: E().int().min(0), truncated: M() }),
  );
//@ chunk-wy9dbk5f.js:51954-52231 placement
async function serveReadTaskOutput(e) {
  let { task_id: task_id } = kr().parse(e);
  if (!isTaskIdOfType("local_bash", task_id)) throw Error("ReadTaskOutput: no shell task has that task_id");
  let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailOutputOfTask(task_id);
  return {
    summary: `Read ${bytesRead} of ${bytesTotal} bytes.`,
    output: { output: content, total_bytes: bytesTotal, truncated: bytesRead < bytesTotal },
  };
}
//@ chunk-wy9dbk5f.js:52231-52345 placement
var RUNBASHCOMMAND = "RunBashCommand",
  Lr = DoctorLazy(() => zodStrictObject({ command: o(), cwd: o().optional() })),
  du = DoctorLazy(() => u_2({ outputText: o(), exitCode: E() }));
//@ chunk-wy9dbk5f.js:52345-52662 placement
async function serveRunBashCommand(e, r, n) {
  let { command: command, cwd: cwd } = Lr().parse(e),
    { session: session, abortController: abortController } = n.toolUseContext(),
    { runHeadlessBashCommand: runHeadlessBashCommand } = await import("./chunk-9f02q1bz.js"),
    { outputText: outputText, exitCode: exitCode } = await runHeadlessBashCommand({
      command: command,
      cwd: cwd,
      abortSignal: abortController.signal,
      session: session,
    });
  return { summary: `exit ${exitCode}`, output: { outputText: outputText, exitCode: exitCode } };
}
//@ chunk-wy9dbk5f.js:52662-52977 placement
var STAGEFILE = "StageFile",
  zr = DoctorLazy(() =>
    zodStrictObject({
      mount_path: o().min(1).max(4096),
      force: M().optional(),
      credential: zodStrictObject({
        filestore_jwt: o().min(1).max(16384),
        filesystem_id: o().min(1).max(256),
        filestore_url: o().max(2048).optional(),
      }),
    }),
  ),
  hu = DoctorLazy(() =>
    Ue([
      u_2({ ok: T(!0), noop: o().optional() }),
      u_2({ ok: T(!1), error: o(), permanent: T(!0).optional() }),
    ]),
  );
//@ chunk-wy9dbk5f.js:52977-53234 placement
async function serveStageFile(e) {
  let { mount_path: mount_path, force: force, credential: credential } = zr().parse(e),
    { stageFile: stageFile, stageFileWireResult: stageFileWireResult } = await import("./chunk-q02nzdea.js"),
    y = await stageFile({ mount_path: mount_path, force: force }, credential);
  return y.ok ? { summary: "staged", output: stageFileWireResult(y) } : { summary: "not staged", output: y };
}

export {
  STAGEFILE,
  serveStageFile,
  RUNBASHCOMMAND,
  serveRunBashCommand,
  READTASKOUTPUT,
  serveReadTaskOutput,
};
