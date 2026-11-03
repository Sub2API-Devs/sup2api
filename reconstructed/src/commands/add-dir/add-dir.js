/**
 * commands/add-dir/add-dir.tsx
 *
 * 并入旧版已有路径：/add-dir 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/add-dir/add-dir.tsx
 * pieces: chunk-74n7apcd.js (1), chunk-efagea6a.js (1), chunk-x4gf1bcz.js (2)
 * attribution: fingerprint 2, placement 1, sole-consumer 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { addWorkingDirectory, explainAddDirSkillsSkipped } from "./additionalDirectorySkills.js";
import { sequential } from "../../utils/sequential.js";
import { AddWorkspaceDirectory } from "../../components/permissions/rules/AddWorkspaceDirectory.js";
import { validateDirectoryForWorkspace, addDirHelpMessage } from "./validation.js";

/**
 * /add-dir 结果的 React 组件：显示命令回显和结果消息，挂载后立刻调用 onDone。
 */
//@ chunk-x4gf1bcz.js:13922-14285 sole-consumer
function AddDirResultMessage(i) {
  let m = w(7),
    { message: message, args: args, onDone: onDone } = i;
  useTimeout(onDone, 0);
  let c;
  if (m[0] !== args)
    ((c = r(Text, { dimColor: !0, children: [re.pointer, " /add-dir ", args] })), (m[0] = args), (m[1] = c));
  else c = m[1];
  let o;
  if (m[2] !== message)
    ((o = e(MessageResponse, { children: e(Text, { children: message }) })), (m[2] = message), (m[3] = o));
  else o = m[3];
  let t;
  if (m[4] !== c || m[5] !== o)
    ((t = r(Box, { flexDirection: "column", children: [c, o] })), (m[4] = c), (m[5] = o), (m[6] = t));
  else t = m[6];
  return t;
}
/**
 * /add-dir 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-x4gf1bcz.js:14285-14960 fingerprint = call (0.614)
async function call(onDone, context, args) {
  let directoryPath = (args ?? "").trim(),
    m = getToolPermissionContext(context),
    handleAddDirectory = async (path, l = !1) => {
      let g = await addWorkingDirectory(context, path, l);
      onDone(`${g} ${sequential.dim("\xB7 /permissions to manage")}`);
    };
  if (!directoryPath)
    return e(AddWorkspaceDirectory, {
      permissionContext: m,
      onAddDirectory: handleAddDirectory,
      onAlreadyAccessible: (t) => {
        let updatedContext = explainAddDirSkillsSkipped(context, t);
        if (updatedContext === null) return !1;
        return (onDone(updatedContext), !0);
      },
      onCancel: () => {
        onDone("Did not add a working directory.");
      },
    });
  let result = await validateDirectoryForWorkspace(directoryPath, m);
  if (result.resultType !== "success") {
    let t =
      (result.resultType === "alreadyInWorkingDirectory"
        ? explainAddDirSkillsSkipped(context, result)
        : null) ?? addDirHelpMessage(result);
    return e(AddDirResultMessage, { message: t, args: args ?? "", onDone: () => onDone(t) });
  }
  return e(AddWorkspaceDirectory, {
    directoryPath: result.absolutePath,
    permissionContext: m,
    onAddDirectory: handleAddDirectory,
    onCancel: () => {
      onDone(`Did not add ${sequential.bold(result.absolutePath)} as a working directory.`);
    },
  });
}
//@ chunk-74n7apcd.js:18826-19188 fingerprint = AddDirError (0.553)
function AddDirError(t0) {
  let u = w(7),
    { message: message, args: args, onDone: onDone } = t0;
  useTimeout(onDone, 0);
  let x;
  if (u[0] !== args)
    ((x = r(Text, { dimColor: !0, children: [re.pointer, " /resume ", args] })), (u[0] = args), (u[1] = x));
  else x = u[1];
  let M;
  if (u[2] !== message)
    ((M = e(MessageResponse, { children: e(Text, { children: message }) })), (u[2] = message), (u[3] = M));
  else M = u[3];
  let _;
  if (u[4] !== x || u[5] !== M)
    ((_ = r(Box, { flexDirection: "column", children: [x, M] })), (u[4] = x), (u[5] = M), (u[6] = _));
  else _ = u[6];
  return _;
}
/**
 * /add-dir 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-efagea6a.js:11929-12226 placement
async function addDirHeadlessCall(args, context) {
  let trimmed = args.trim();
  if (!trimmed) return { type: "text", value: "Usage: /add-dir <path>" };
  let e = await validateDirectoryForWorkspace(trimmed, getToolPermissionContext(context));
  if (e.resultType !== "success")
    return {
      type: "text",
      value:
        (e.resultType === "alreadyInWorkingDirectory" ? explainAddDirSkillsSkipped(context, e) : null) ??
        addDirHelpMessage(e),
    };
  return { type: "text", value: await addWorkingDirectory(context, e.absolutePath, !1) };
}

export { AddDirError };
