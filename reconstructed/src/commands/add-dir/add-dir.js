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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { addWorkingDirectory, explainAddDirSkillsSkipped } from "./additionalDirectorySkills.js";
import { sequential } from "../../utils/sequential.js";
import { AddWorkspaceDirectory } from "../../components/permissions/rules/AddWorkspaceDirectory.js";
import { validateDirectoryForWorkspace, addDirHelpMessage } from "./validation.js";

//@ chunk-x4gf1bcz.js:13922-14285 sole-consumer
/**
 * /add-dir 结果的 React 组件：显示命令回显和结果消息，挂载后立刻调用 onDone。
 */
function AddDirResultMessage(props) {
  let m = w(7);
  let { message, args, onDone } = props;
  useTimeout(onDone, 0);
  let c;
  if (m[0] !== args) {
    c = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.pointer, " /add-dir ", args],
    });
    m[0] = args;
    m[1] = c;
  } else c = m[1];
  let o;
  if (m[2] !== message) {
    o = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        children: message,
      }),
    });
    m[2] = message;
    m[3] = o;
  } else o = m[3];
  let t;
  if (m[4] !== c || m[5] !== o) {
    t = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [c, o],
    });
    m[4] = c;
    m[5] = o;
    m[6] = t;
  } else t = m[6];
  return t;
}
//@ chunk-x4gf1bcz.js:14285-14960 fingerprint = call (0.614)
/**
 * /add-dir 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  let directoryPath = (args ?? "").trim();
  let toolPermissionContext = getToolPermissionContext(context);
  let handleAddDirectory = async (path, l = false) => {
    let destination = await addWorkingDirectory(context, path, l);
    onDone(`${destination} ${sequential.dim("\xB7 /permissions to manage")}`);
  };
  if (!directoryPath)
    return jsxProd_default(AddWorkspaceDirectory, {
      permissionContext: toolPermissionContext,
      onAddDirectory: handleAddDirectory,
      onAlreadyAccessible: (t) => {
        let updatedContext = explainAddDirSkillsSkipped(context, t);
        if (updatedContext === null) return false;
        onDone(updatedContext);
        return true;
      },
      onCancel: () => {
        onDone("Did not add a working directory.");
      },
    });
  let result = await validateDirectoryForWorkspace(directoryPath, toolPermissionContext);
  if (result.resultType !== "success") {
    let message =
      (result.resultType === "alreadyInWorkingDirectory"
        ? explainAddDirSkillsSkipped(context, result)
        : null) ?? addDirHelpMessage(result);
    return jsxProd_default(AddDirResultMessage, {
      message,
      args: args ?? "",
      onDone: () => onDone(message),
    });
  }
  return jsxProd_default(AddWorkspaceDirectory, {
    directoryPath: result.absolutePath,
    permissionContext: toolPermissionContext,
    onAddDirectory: handleAddDirectory,
    onCancel: () => {
      onDone(`Did not add ${sequential.bold(result.absolutePath)} as a working directory.`);
    },
  });
}
//@ chunk-74n7apcd.js:18826-19188 fingerprint = AddDirError (0.553)
function AddDirError(props) {
  let $ = w(7);
  let { message, args, onDone } = props;
  useTimeout(onDone, 0);
  let x;
  if ($[0] !== args) {
    x = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.pointer, " /resume ", args],
    });
    $[0] = args;
    $[1] = x;
  } else x = $[1];
  let t4;
  if ($[2] !== message) {
    t4 = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        children: message,
      }),
    });
    $[2] = message;
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if ($[4] !== x || $[5] !== t4) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [x, t4],
    });
    $[4] = x;
    $[5] = t4;
    $[6] = t5;
  } else t5 = $[6];
  return t5;
}
//@ chunk-efagea6a.js:11929-12226 placement
/**
 * /add-dir 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function addDirHeadlessCall(args, context) {
  let trimmed = args.trim();
  if (!trimmed)
    return {
      type: "text",
      value: "Usage: /add-dir <path>",
    };
  let e = await validateDirectoryForWorkspace(trimmed, getToolPermissionContext(context));
  if (e.resultType !== "success")
    return {
      type: "text",
      value:
        (e.resultType === "alreadyInWorkingDirectory" ? explainAddDirSkillsSkipped(context, e) : null) ??
        addDirHelpMessage(e),
    };
  return {
    type: "text",
    value: await addWorkingDirectory(context, e.absolutePath, false),
  };
}
export { AddDirError };
