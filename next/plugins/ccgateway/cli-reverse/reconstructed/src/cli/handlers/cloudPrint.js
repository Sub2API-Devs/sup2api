/**
 * cli/handlers/cloudPrint.ts
 *
 * 2.1.316 新增。云会话中 -p 打印模式的输出与退出处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nca3yj18.js (2)
 * attribution: placement 2
 */
import { cliError } from "../exit.js";

//@ chunk-nca3yj18.js:983-1298 placement
/**
 * claude -p --cloud：从 --cloud 值和提示拼出任务（都没有则报错），再动态加载 runHeadlessCloudPrint 以 json/text 输出运行。
 */
async function runCloudPrintHandler(options, root) {
  let task = joinCloudTaskParts(options.remote, options.inputPrompt);
  if (task === null)
    return cliError(
      "Error: claude -p --cloud needs a task: pass it as the prompt, as --cloud's value, or on stdin.",
    );
  let { runHeadlessCloudPrint } = await import("../headlessCloud/cloudPrint.js");
  return runHeadlessCloudPrint(options, root, {
    prompt: task,
    outputFormat: options.outputFormat === "json" ? "json" : "text",
  });
}
//@ chunk-nca3yj18.js:1298-1417 placement
function joinCloudTaskParts(remoteValue, inputPrompt) {
  let filtered = [remoteValue ?? "", typeof inputPrompt === "string" ? inputPrompt : ""].filter(
    (part) => part.trim() !== "",
  );
  return filtered.length === 0
    ? null
    : filtered.join(`
`);
}
export { runCloudPrintHandler };
