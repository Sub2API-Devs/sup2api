/**
 * components/workflows/WorkflowSaveDialog.tsx
 *
 * 2.1.316 新增。保存动态工作流对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (9)
 * attribution: placement 9
 */
import { join, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { userWorkflowsDir, clearAllWorkflows } from "../../services/workflow/loadWorkflows.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { nearestNonHomeRoot } from "../../utils/settings/settingsStorage.js";
import { getProjectDirsUpToHome } from "../../utils/markdownConfigLoader.js";
import { slugifyWorkflowName } from "../../services/workflow/scriptFile.js";
import { isPathConfigDir } from "../../utils/envUtils.js";
import { assertDirChainReal } from "../../utils/fsSafety/atomicWriteStaging.js";
import { writeFileAtomic } from "../../utils/file.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useProject } from "../../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { tildify } from "../../utils/path.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { TextInput } from "../TextInput.js";
import { ErrorText } from "../ErrorText.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-axsvbsqv.js:7923-7927 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-axsvbsqv.js:7923", () => {
  init_react_production();
});
//@ chunk-axsvbsqv.js:8052-8096 placement
var NAME_CONFLICT_HINT = "Use a different name or overwrite.";
//@ chunk-axsvbsqv.js:8096-8470 placement
/**
 * 求动态工作流保存目录：用户范围用用户目录；--project-config-root 下项目范围不可用；否则用仓库根或已有工作流目录下的 .claude/workflows。
 */
async function getWorkflowSaveDir(scope, startPath) {
  if (scope === "user") return userWorkflowsDir();
  if (getProjectConfigRoot() !== null) {
    logFeatureSad("workflow_save", "project_scope_unavailable");
    throw Error(
      "Project-scope workflow saves are unavailable in a session started with --project-config-root",
    );
  }
  let projectRoot = nearestNonHomeRoot(startPath);
  if (projectRoot === null) return join(startPath, ".claude", "workflows");
  let existingWorkflowsDir = (await getProjectDirsUpToHome("workflows", startPath))[0];
  if (existingWorkflowsDir !== undefined) return existingWorkflowsDir;
  return join(projectRoot, ".claude", "workflows");
}
//@ chunk-axsvbsqv.js:8470-9114 placement
/**
 * 保存动态工作流脚本：用户范围且有存储 v5 时走存储；项目范围先校验目录链为真实目录；按需覆盖或排他写入（已存在时报错）。
 */
async function saveDynamicWorkflow(options, storage) {
  let name = slugifyWorkflowName(options.name);
  let dir = await getWorkflowSaveDir(options.scope, options.cwd);
  let filePath = join(dir, `${name}.js`);
  if (storage !== undefined && options.scope === "user")
    return saveWorkflowToStorage(storage, name, filePath, options);
  let checkParent = options.scope !== "user" && !isPathConfigDir(dirname(dir));
  if (checkParent)
    try {
      await assertDirChainReal(dirname(dirname(dir)), dir);
    } catch (error) {
      logFeatureBad("workflow_save", "write_failed");
      throw error;
    }
  await mkdir(dir, {
    recursive: true,
    mode: 448,
  });
  try {
    if (options.overwrite)
      await writeFileAtomic(filePath, options.script, {
        encoding: "utf8",
        mode: 384,
        checkParentDir: checkParent,
      });
    else
      await writeFile(filePath, options.script, {
        encoding: "utf8",
        mode: 384,
        flag: "wx",
      });
  } catch (error) {
    if (!options.overwrite && getErrnoCode(error) === "EEXIST") {
      logFeatureSad("workflow_save", "already_exists");
      throw Error(`Dynamic workflow "${name}" already exists at ${filePath}. ${NAME_CONFLICT_HINT}`);
    }
    logFeatureBad("workflow_save", "write_failed");
    throw error;
  }
  return finishWorkflowSave(name, filePath, options);
}
//@ chunk-axsvbsqv.js:9114-9379 placement
async function finishWorkflowSave(name, path, options) {
  clearAllWorkflows();
  let { clearCommandMemoizationCaches } = await import("../../commands.js");
  clearCommandMemoizationCaches();
  logFeatureOk("workflow_save");
  logEvent("tengu_workflow_saved", {
    scope: fromEnum(options.scope),
    overwrite: options.overwrite,
    script_size_chars: options.script.length,
  });
  return {
    name,
    path,
    scope: options.scope,
  };
}
//@ chunk-axsvbsqv.js:9379-9893 placement
/**
 * 通过存储 v5 写入用户范围的工作流脚本（覆盖时原子写，否则要求不存在），失败时转换为对应错误。
 */
async function saveWorkflowToStorage(storage, name, displayPath, options) {
  let writeResult = await storage.write(
    STORAGE_SPACES.userConfigDir("workflows", [`${name}.js`]),
    options.script,
    options.overwrite
      ? {
          mode: 384,
          publishDiscipline: "atomic",
        }
      : {
          mode: 384,
          precondition: {
            type: "ifAbsent",
          },
        },
  );
  if (!writeResult.ok) {
    if (!options.overwrite && writeResult.error.code === "AlreadyExists") {
      logFeatureSad("workflow_save", "already_exists");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Dynamic workflow "${name}" already exists at ${displayPath}. ${NAME_CONFLICT_HINT}`,
        "workflow name collision",
      );
    }
    logFeatureBad("workflow_save", "write_failed");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Workflow save failed: ${writeResult.error.code} (${displayPath})`,
      "workflow save failed",
    );
  }
  return finishWorkflowSave(name, displayPath, options);
}
//@ chunk-axsvbsqv.js:9893-9923 placement
function selectCwd(projectContext) {
  return projectContext.cwd;
}
//@ chunk-axsvbsqv.js:9923-9978 placement
function toggleSaveScope(scope) {
  return scope === "project" ? "user" : "project";
}
//@ chunk-axsvbsqv.js:9978-13272 placement
/**
 * 保存动态工作流的对话框。
 */
function WorkflowSaveDialog(props) {
  let $ = useMemoCache(54);
  let { script, defaultName, onDone } = props;
  let { storageV5 } = useTheme_2();
  let { columns } = useTerminalSize();
  let cwd = useProject(selectCwd);
  let [nameInput, setNameInput] = useState(defaultName);
  let [cursorOffset, setCursorOffset] = useState(defaultName.length);
  let [saveScope, setSaveScope] = useState("project");
  let [isSaving, setIsSaving] = useState(false);
  let [conflictPath, setConflictPath] = useState(null);
  let [errorMessage, setErrorMessage] = useState(null);
  let clearErrors;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    clearErrors = () => {
      setConflictPath(null);
      setErrorMessage(null);
    };
    $[0] = clearErrors;
  } else clearErrors = $[0];
  let resetErrors = clearErrors;
  let handleNameChange;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    handleNameChange = (nextName) => {
      setNameInput(nextName);
      resetErrors();
    };
    $[1] = handleNameChange;
  } else handleNameChange = $[1];
  let onChange = handleNameChange;
  let handleSubmit;
  if (
    $[2] !== conflictPath ||
    $[3] !== cwd ||
    $[4] !== nameInput ||
    $[5] !== onDone ||
    $[6] !== isSaving ||
    $[7] !== saveScope ||
    $[8] !== script ||
    $[9] !== storageV5
  ) {
    handleSubmit = () => {
      if (isSaving) {
        return;
      }
      let trimmed = nameInput.trim();
      if (!trimmed) {
        return;
      }
      setIsSaving(true);
      setErrorMessage(null);
      saveDynamicWorkflow(
        {
          name: trimmed,
          scope: saveScope,
          script,
          overwrite: conflictPath !== null,
          cwd,
        },
        storageV5,
      )
        .then((saveResult) => {
          onDone(
            `Dynamic workflow saved to ${saveResult.path}. Invoke as /${saveResult.name} or Workflow({name: "${saveResult.name}"}) in future sessions.`,
          );
        })
        .catch((error) => {
          let message = error instanceof Error ? error.message : String(error);
          if (message.includes(NAME_CONFLICT_HINT)) {
            let match = message.match(/at (.+?)\. /);
            setConflictPath(match?.[1] ?? "(unknown path)");
          } else setErrorMessage(message);
          setIsSaving(false);
        });
    };
    $[2] = conflictPath;
    $[3] = cwd;
    $[4] = nameInput;
    $[5] = onDone;
    $[6] = isSaving;
    $[7] = saveScope;
    $[8] = script;
    $[9] = storageV5;
    $[10] = handleSubmit;
  } else handleSubmit = $[10];
  let onSubmit = handleSubmit;
  let handleCancel;
  if ($[11] !== onDone) {
    handleCancel = () => onDone();
    $[11] = onDone;
    $[12] = handleCancel;
  } else handleCancel = $[12];
  let cancelDialog = handleCancel;
  let cancelBindingOptions;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    cancelBindingOptions = {
      context: "Settings",
      isActive: true,
    };
    $[13] = cancelBindingOptions;
  } else cancelBindingOptions = $[13];
  useKeybinding("confirm:no", cancelDialog, cancelBindingOptions);
  let handleKeyDown;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    handleKeyDown = (event) => {
      if (event.key === "tab") {
        event.preventDefault();
        setSaveScope(toggleSaveScope);
        resetErrors();
      }
    };
    $[14] = handleKeyDown;
  } else handleKeyDown = $[14];
  let onKeyDown = handleKeyDown;
  let slug;
  if ($[15] !== nameInput) {
    slug = slugifyWorkflowName(nameInput.trim() || "workflow");
    $[15] = nameInput;
    $[16] = slug;
  } else slug = $[16];
  let slugName = slug;
  let targetPath;
  if ($[17] !== saveScope || $[18] !== slugName) {
    targetPath =
      saveScope === "project"
        ? `.claude/workflows/${slugName}.js`
        : tildify(join(userWorkflowsDir(), `${slugName}.js`));
    $[17] = saveScope;
    $[18] = slugName;
    $[19] = targetPath;
  } else targetPath = $[19];
  let displayPath = targetPath;
  const scopeLabel = saveScope === "project" ? "Project" : "User";
  let subtitle;
  if ($[20] !== scopeLabel || $[21] !== displayPath) {
    subtitle = jsxProd_default_2(Text, {
      dimColor: true,
      children: [scopeLabel, " scope \xB7 ", displayPath],
    });
    $[20] = scopeLabel;
    $[21] = displayPath;
    $[22] = subtitle;
  } else subtitle = $[22];
  const action = conflictPath ? "overwrite" : "save";
  let submitHint;
  if ($[23] !== action) {
    submitHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[23] = action;
    $[24] = submitHint;
  } else submitHint = $[24];
  let toggleScopeHint;
  let cancelHint;
  if ($[25] === MEMO_CACHE_SENTINEL) {
    toggleScopeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "tab",
      action: "toggle scope",
    });
    cancelHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[25] = toggleScopeHint;
    $[26] = cancelHint;
  } else {
    toggleScopeHint = $[25];
    cancelHint = $[26];
  }
  let inputGuide;
  if ($[27] !== submitHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [submitHint, toggleScopeHint, cancelHint],
    });
    $[27] = submitHint;
    $[28] = inputGuide;
  } else inputGuide = $[28];
  let promptLabel;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    promptLabel = jsxProd_default(Text, {
      children: "Save as:",
    });
    $[29] = promptLabel;
  } else promptLabel = $[29];
  let promptArrow;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    promptArrow = jsxProd_default(Text, {
      children: ">",
    });
    $[30] = promptArrow;
  } else promptArrow = $[30];
  const focus = !isSaving;
  const showCursor = !isSaving;
  let inputBox;
  if (
    $[31] !== columns ||
    $[32] !== cursorOffset ||
    $[33] !== onSubmit ||
    $[34] !== nameInput ||
    $[35] !== focus ||
    $[36] !== showCursor
  ) {
    inputBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
      children: [
        promptArrow,
        jsxProd_default(TextInput, {
          value: nameInput,
          onChange,
          onSubmit,
          focus,
          showCursor,
          columns,
          cursorOffset,
          onChangeCursorOffset: setCursorOffset,
        }),
      ],
    });
    $[31] = columns;
    $[32] = cursorOffset;
    $[33] = onSubmit;
    $[34] = nameInput;
    $[35] = focus;
    $[36] = showCursor;
    $[37] = inputBox;
  } else inputBox = $[37];
  let conflictWarning;
  if ($[38] !== conflictPath) {
    conflictWarning =
      conflictPath &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "warning",
          children: [conflictPath, " already exists. Press Enter again to overwrite, or change the name."],
        }),
      });
    $[38] = conflictPath;
    $[39] = conflictWarning;
  } else conflictWarning = $[39];
  let errorBox;
  if ($[40] !== errorMessage) {
    errorBox =
      errorMessage &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: errorMessage,
        }),
      });
    $[40] = errorMessage;
    $[41] = errorBox;
  } else errorBox = $[41];
  let savingNotice;
  if ($[42] !== isSaving) {
    savingNotice =
      isSaving &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Saving\u2026",
        }),
      });
    $[42] = isSaving;
    $[43] = savingNotice;
  } else savingNotice = $[43];
  let children;
  if ($[44] !== inputBox || $[45] !== conflictWarning || $[46] !== errorBox || $[47] !== savingNotice) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [promptLabel, inputBox, conflictWarning, errorBox, savingNotice],
    });
    $[44] = inputBox;
    $[45] = conflictWarning;
    $[46] = errorBox;
    $[47] = savingNotice;
    $[48] = children;
  } else children = $[48];
  let dialogElement;
  if ($[49] !== cancelDialog || $[50] !== subtitle || $[51] !== inputGuide || $[52] !== children) {
    dialogElement = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: jsxProd_default(Dialog, {
        title: "Save dynamic workflow",
        subtitle,
        onCancel: cancelDialog,
        color: "permission",
        isCancelActive: false,
        inputGuide,
        children,
      }),
    });
    $[49] = cancelDialog;
    $[50] = subtitle;
    $[51] = inputGuide;
    $[52] = children;
    $[53] = dialogElement;
  } else dialogElement = $[53];
  return dialogElement;
}
export { WorkflowSaveDialog };
