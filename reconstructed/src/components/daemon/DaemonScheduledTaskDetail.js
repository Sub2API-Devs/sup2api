/**
 * components/daemon/DaemonScheduledTaskDetail.tsx
 *
 * 2.1.316 新增：后台定时任务详情页与新建/编辑表单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vde9a20m.js (7)
 * attribution: placement 7
 */
import { resolve, basename } from "path";
import { permissionModeTitle } from "../../utils/permissions/PermissionMode.js";
import {
  listScheduledTasks,
  addScheduledTask,
  removeScheduledTask,
  SCHEDULED_PERMISSION_MODES,
} from "../../daemon/scheduledWorker.js";
import { logError } from "../../utils/log.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";
import { cronToHuman, parseScheduleInput } from "../../utils/cron.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import {
  cronPromptFieldHint,
  validateScheduleInput,
  renderCreateToolUseMessage,
} from "../../tools/ScheduleCronTool/UI.js";
import { AgentsList } from "../agents/AgentsList.js";

//@ chunk-vde9a20m.js:1114-1160 placement
function permissionModeOption(mode) {
  return {
    label: permissionModeTitle(mode),
    value: mode,
  };
}
//@ chunk-vde9a20m.js:1160-1225 placement
async function loadScheduledTaskRuns(storageV5) {
  return listScheduledTasks(undefined, storageV5).catch((error) => {
    logError(error);
    return [];
  });
}
//@ chunk-vde9a20m.js:1225-5219 placement
/**
 * 后台定时任务详情页：运行记录、启用/停用、编辑、立即运行与删除。
 */
function DaemonScheduledTaskDetail(props) {
  let $ = useMemoCache(76);
  let { task, onBack, onEdit, onDone, refresh, storageV5 } = props;
  let [isBusy, setIsBusy] = useState(false);
  let [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  let toggleHandlerCached;
  if ($[0] !== isBusy || $[1] !== onDone || $[2] !== refresh || $[3] !== storageV5 || $[4] !== task) {
    toggleHandlerCached = async function handleToggle() {
      if (isBusy) {
        return;
      }
      setIsBusy(true);
      try {
        await addScheduledTask(
          toTaskFormValues({
            ...task,
            enabled: !task.enabled,
          }),
          undefined,
          storageV5,
        );
        await refresh();
        onDone(`${task.enabled ? "Disabled" : "Enabled"} scheduled task '${task.id}'.`, {
          display: "system",
        });
      } catch (error) {
        let toggleError = error;
        logError(toggleError);
        onDone(`Toggle failed: ${errorMessage(toggleError)}`, {
          display: "system",
        });
      }
    };
    $[0] = isBusy;
    $[1] = onDone;
    $[2] = refresh;
    $[3] = storageV5;
    $[4] = task;
    $[5] = toggleHandlerCached;
  } else toggleHandlerCached = $[5];
  let toggleTask = toggleHandlerCached;
  let removeHandlerCached;
  if ($[6] !== isBusy || $[7] !== onDone || $[8] !== refresh || $[9] !== storageV5 || $[10] !== task.id) {
    removeHandlerCached = async function handleRemove() {
      if (isBusy) {
        return;
      }
      setIsBusy(true);
      try {
        await removeScheduledTask(task.id, undefined, storageV5);
        await refresh();
        onDone(`Removed scheduled task '${task.id}'.`, {
          display: "system",
        });
      } catch (error) {
        let removeError = error;
        logForDebugging(
          `Failed to remove scheduled task '${task.id}' from daemon.json: ${errorMessage(removeError)}`,
          {
            level: "error",
          },
        );
        onDone(`Remove failed: ${errorMessage(removeError)}`, {
          display: "system",
        });
      }
    };
    $[6] = isBusy;
    $[7] = onDone;
    $[8] = refresh;
    $[9] = storageV5;
    $[10] = task.id;
    $[11] = removeHandlerCached;
  } else removeHandlerCached = $[11];
  let removeTask = removeHandlerCached;
  if (isConfirmingRemove) {
    const subtitle = `Delete '${task.id}' from daemon.json. The daemon will stop firing it on its next reconcile.`;
    let onCancel;
    if ($[12] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setIsConfirmingRemove(false);
      $[12] = onCancel;
    } else onCancel = $[12];
    let onConfirm;
    if ($[13] !== removeTask) {
      onConfirm = () => void removeTask();
      $[13] = removeTask;
      $[14] = onConfirm;
    } else onConfirm = $[14];
    let onCancel_2;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setIsConfirmingRemove(false);
      $[15] = onCancel_2;
    } else onCancel_2 = $[15];
    let children;
    if ($[16] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, cancel",
        onConfirm,
        onCancel: onCancel_2,
      });
      $[16] = onConfirm;
      $[17] = children;
    } else children = $[17];
    let confirmDialog;
    if ($[18] !== subtitle || $[19] !== children) {
      confirmDialog = jsxProd_default(Dialog, {
        title: "Remove task?",
        subtitle,
        onCancel,
        color: "error",
        children,
      });
      $[18] = subtitle;
      $[19] = children;
      $[20] = confirmDialog;
    } else confirmDialog = $[20];
    return confirmDialog;
  }
  const label = task.enabled ? "Disable" : "Enable";
  let toggleOption;
  if ($[21] !== label) {
    toggleOption = {
      label,
      value: "toggle",
    };
    $[21] = label;
    $[22] = toggleOption;
  } else toggleOption = $[22];
  let editOption;
  let removeOption;
  let backOption;
  if ($[23] === MEMO_CACHE_SENTINEL) {
    editOption = {
      label: "Edit",
      value: "edit",
    };
    removeOption = {
      label: "Remove",
      value: "remove",
    };
    backOption = {
      label: "Back",
      value: "back",
    };
    $[23] = editOption;
    $[24] = removeOption;
    $[25] = backOption;
  } else {
    editOption = $[23];
    removeOption = $[24];
    backOption = $[25];
  }
  let options;
  if ($[26] !== toggleOption) {
    options = [toggleOption, editOption, removeOption, backOption];
    $[26] = toggleOption;
    $[27] = options;
  } else options = $[27];
  let options_2 = options;
  const { id, cron } = task;
  let cronHuman;
  if ($[28] !== task.cron) {
    cronHuman = cronToHuman(task.cron);
    $[28] = task.cron;
    $[29] = cronHuman;
  } else cronHuman = $[29];
  let cronLine;
  if ($[30] !== cronHuman || $[31] !== task.cron) {
    cronLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Cron ", cron, " (", cronHuman, ")"],
    });
    $[30] = cronHuman;
    $[31] = task.cron;
    $[32] = cronLine;
  } else cronLine = $[32];
  let directoryLine;
  if ($[33] !== task.directory) {
    directoryLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Directory ", task.directory],
    });
    $[33] = task.directory;
    $[34] = directoryLine;
  } else directoryLine = $[34];
  let promptLine;
  if ($[35] !== task.prompt) {
    promptLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Prompt ", task.prompt],
    });
    $[35] = task.prompt;
    $[36] = promptLine;
  } else promptLine = $[36];
  const status = task.enabled ? "on" : "off";
  let statusIcon;
  if ($[37] !== status) {
    statusIcon = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    $[37] = status;
    $[38] = statusIcon;
  } else statusIcon = $[38];
  const enabledText = task.enabled ? "enabled" : "disabled";
  let statusLine;
  if ($[39] !== statusIcon || $[40] !== enabledText) {
    statusLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Status ", statusIcon, enabledText],
    });
    $[39] = statusIcon;
    $[40] = enabledText;
    $[41] = statusLine;
  } else statusLine = $[41];
  let modeTitle;
  if ($[42] !== task.permissionMode) {
    modeTitle = permissionModeTitle(task.permissionMode);
    $[42] = task.permissionMode;
    $[43] = modeTitle;
  } else modeTitle = $[43];
  let modeLine;
  if ($[44] !== modeTitle) {
    modeLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Mode ", modeTitle],
    });
    $[44] = modeTitle;
    $[45] = modeLine;
  } else modeLine = $[45];
  let modelLine;
  if ($[46] !== task.model) {
    modelLine =
      task.model &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Model ", task.model],
      });
    $[46] = task.model;
    $[47] = modelLine;
  } else modelLine = $[47];
  let timeoutLine;
  if ($[48] !== task.runTimeoutMinutes) {
    timeoutLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Timeout ", task.runTimeoutMinutes, "m"],
    });
    $[48] = task.runTimeoutMinutes;
    $[49] = timeoutLine;
  } else timeoutLine = $[49];
  let maxQueuedLine;
  if ($[50] !== task.maxQueued) {
    maxQueuedLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Max queue ", task.maxQueued],
    });
    $[50] = task.maxQueued;
    $[51] = maxQueuedLine;
  } else maxQueuedLine = $[51];
  let detailBody;
  if (
    $[52] !== cronLine ||
    $[53] !== directoryLine ||
    $[54] !== promptLine ||
    $[55] !== statusLine ||
    $[56] !== modeLine ||
    $[57] !== modelLine ||
    $[58] !== timeoutLine ||
    $[59] !== maxQueuedLine
  ) {
    detailBody = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [
        cronLine,
        directoryLine,
        promptLine,
        statusLine,
        modeLine,
        modelLine,
        timeoutLine,
        maxQueuedLine,
      ],
    });
    $[52] = cronLine;
    $[53] = directoryLine;
    $[54] = promptLine;
    $[55] = statusLine;
    $[56] = modeLine;
    $[57] = modelLine;
    $[58] = timeoutLine;
    $[59] = maxQueuedLine;
    $[60] = detailBody;
  } else detailBody = $[60];
  let onChange;
  if ($[61] !== onBack || $[62] !== onEdit || $[63] !== task || $[64] !== toggleTask) {
    onChange = (selectedValue) => {
      if (selectedValue === "back") {
        return onBack();
      }
      if (selectedValue === "edit") {
        return onEdit(task);
      }
      if (selectedValue === "remove") {
        return setIsConfirmingRemove(true);
      }
      if (selectedValue === "toggle") {
        return void toggleTask();
      }
    };
    $[61] = onBack;
    $[62] = onEdit;
    $[63] = task;
    $[64] = toggleTask;
    $[65] = onChange;
  } else onChange = $[65];
  let selectorElement;
  if ($[66] !== isBusy || $[67] !== onBack || $[68] !== options_2 || $[69] !== onChange) {
    selectorElement = jsxProd_default(ModelSelector, {
      options: options_2,
      isDisabled: isBusy,
      onChange,
      onCancel: onBack,
    });
    $[66] = isBusy;
    $[67] = onBack;
    $[68] = options_2;
    $[69] = onChange;
    $[70] = selectorElement;
  } else selectorElement = $[70];
  let dialogElement;
  if ($[71] !== onBack || $[72] !== detailBody || $[73] !== selectorElement || $[74] !== task.id) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: id,
      onCancel: onBack,
      children: [detailBody, selectorElement],
    });
    $[71] = onBack;
    $[72] = detailBody;
    $[73] = selectorElement;
    $[74] = task.id;
    $[75] = dialogElement;
  } else dialogElement = $[75];
  return dialogElement;
}
//@ chunk-vde9a20m.js:5219-8902 placement
/**
 * 新建或编辑后台定时任务的表单：名称、计划、目录、模型与提示词。
 */
function DaemonScheduledTaskForm(props) {
  let $ = useMemoCache(59);
  let { defaultDir, existingIds, prefill, modelOptions, onCancel, onDone, onSaved, storageV5 } = props;
  let modelOptionsCached;
  if ($[0] !== modelOptions) {
    modelOptionsCached =
      modelOptions === undefined
        ? [
            {
              label: "default",
              value: "",
            },
          ]
        : modelOptions;
    $[0] = modelOptions;
    $[1] = modelOptionsCached;
  } else modelOptionsCached = $[1];
  let modelOptionsResolved = modelOptionsCached;
  let isEditing = prefill !== undefined;
  let otherIdsCached;
  if ($[2] !== existingIds || $[3] !== isEditing || $[4] !== prefill) {
    otherIdsCached = isEditing ? existingIds.filter((existingId) => existingId !== prefill.id) : existingIds;
    $[2] = existingIds;
    $[3] = isEditing;
    $[4] = prefill;
    $[5] = otherIdsCached;
  } else otherIdsCached = $[5];
  let otherIds = otherIdsCached;
  const prompt = prefill?.prompt ?? "";
  const schedule = prefill?.cron ?? "";
  const dir = prefill?.directory ?? defaultDir;
  const id = prefill?.id ?? "";
  const permissionMode = prefill?.permissionMode ?? "dontAsk";
  const model = prefill?.model ?? "";
  let initialValues;
  if (
    $[6] !== prompt ||
    $[7] !== schedule ||
    $[8] !== dir ||
    $[9] !== id ||
    $[10] !== permissionMode ||
    $[11] !== model
  ) {
    initialValues = {
      prompt,
      schedule,
      dir,
      id,
      permissionMode,
      model,
    };
    $[6] = prompt;
    $[7] = schedule;
    $[8] = dir;
    $[9] = id;
    $[10] = permissionMode;
    $[11] = model;
    $[12] = initialValues;
  } else initialValues = $[12];
  let [values, setValues] = useState(initialValues);
  let [isIdDirty, setIsIdDirty] = useState(isEditing);
  let [isSaving, setIsSaving] = useState(false);
  let changeHandlerCached;
  if ($[13] !== defaultDir || $[14] !== isIdDirty) {
    changeHandlerCached = function handleChange(fieldKey, fieldValue) {
      if (fieldKey === "id") setIsIdDirty(true);
      setValues((previousValues) => {
        if (previousValues[fieldKey] === fieldValue) {
          return previousValues;
        }
        let nextValues = {
          ...previousValues,
          [fieldKey]: fieldValue,
        };
        if (fieldKey !== "id" && !isIdDirty && (fieldKey === "prompt" || fieldKey === "dir"))
          nextValues.id = defaultTaskSlug(
            resolve(expandTildeWithHome(nextValues.dir?.trim() || defaultDir)),
            nextValues.prompt ?? "",
          );
        return nextValues;
      });
    };
    $[13] = defaultDir;
    $[14] = isIdDirty;
    $[15] = changeHandlerCached;
  } else changeHandlerCached = $[15];
  let onChange = changeHandlerCached;
  let modelOptionsWithPrefillCached;
  if ($[16] !== modelOptionsResolved || $[17] !== prefill) {
    modelOptionsWithPrefillCached =
      prefill?.model && !modelOptionsResolved.some((option) => option.value === prefill.model)
        ? [
            ...modelOptionsResolved,
            {
              label: prefill.model,
              value: prefill.model,
            },
          ]
        : modelOptionsResolved;
    $[16] = modelOptionsResolved;
    $[17] = prefill;
    $[18] = modelOptionsWithPrefillCached;
  } else modelOptionsWithPrefillCached = $[18];
  let modelOptionsWithPrefill = modelOptionsWithPrefillCached;
  let promptField;
  let scheduleField;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    promptField = {
      type: "text",
      key: "prompt",
      label: "Prompt",
      placeholder: "/babysit-prs",
      required: true,
      hint: cronPromptFieldHint,
    };
    scheduleField = {
      type: "text",
      key: "schedule",
      label: "Schedule",
      placeholder: "5m, 2h, 1d  or  */15 * * * *",
      required: true,
      validate: validateScheduleInput,
      hint: renderCreateToolUseMessage,
    };
    $[19] = promptField;
    $[20] = scheduleField;
  } else {
    promptField = $[19];
    scheduleField = $[20];
  }
  let dirField;
  if ($[21] !== defaultDir) {
    dirField = {
      type: "text",
      key: "dir",
      label: "Directory",
      placeholder: defaultDir,
    };
    $[21] = defaultDir;
    $[22] = dirField;
  } else dirField = $[22];
  let validate;
  if ($[23] !== otherIds) {
    validate = (rawId) => {
      let trimmed = rawId.trim();
      if (trimmed !== "" && otherIds.includes(trimmed)) {
        return `id '${trimmed}' is already in use`;
      }
      return null;
    };
    $[23] = otherIds;
    $[24] = validate;
  } else validate = $[24];
  let hint;
  if ($[25] !== isIdDirty) {
    hint = () => (isIdDirty ? undefined : "Auto-generated from prompt and directory.");
    $[25] = isIdDirty;
    $[26] = hint;
  } else hint = $[26];
  let idField;
  if ($[27] !== validate || $[28] !== hint) {
    idField = {
      type: "text",
      key: "id",
      label: "Id",
      validate,
      hint,
    };
    $[27] = validate;
    $[28] = hint;
    $[29] = idField;
  } else idField = $[29];
  let permissionModeField;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    permissionModeField = {
      type: "select",
      key: "permissionMode",
      label: "Permission mode",
      options: SCHEDULED_PERMISSION_MODES.map(permissionModeOption),
    };
    $[30] = permissionModeField;
  } else permissionModeField = $[30];
  let hint_2;
  if ($[31] !== modelOptionsWithPrefill) {
    hint_2 = (modelValue) =>
      modelOptionsWithPrefill.find((option) => option.value === modelValue)?.description ??
      (modelValue === "" ? "Uses your configured default model." : undefined);
    $[31] = modelOptionsWithPrefill;
    $[32] = hint_2;
  } else hint_2 = $[32];
  let modelField;
  if ($[33] !== modelOptionsWithPrefill || $[34] !== hint_2) {
    modelField = {
      type: "select",
      key: "model",
      label: "Model",
      options: modelOptionsWithPrefill,
      hint: hint_2,
    };
    $[33] = modelOptionsWithPrefill;
    $[34] = hint_2;
    $[35] = modelField;
  } else modelField = $[35];
  let fields;
  if ($[36] !== dirField || $[37] !== idField || $[38] !== modelField) {
    fields = [promptField, scheduleField, dirField, idField, permissionModeField, modelField];
    $[36] = dirField;
    $[37] = idField;
    $[38] = modelField;
    $[39] = fields;
  } else fields = $[39];
  let fields_2 = fields;
  let saveHandlerCached;
  if (
    $[40] !== isSaving ||
    $[41] !== defaultDir ||
    $[42] !== isEditing ||
    $[43] !== onDone ||
    $[44] !== onSaved ||
    $[45] !== prefill ||
    $[46] !== storageV5 ||
    $[47] !== values
  ) {
    saveHandlerCached = async function handleSave() {
      if (isSaving) {
        return;
      }
      setIsSaving(true);
      let resolvedDir = resolve(expandTildeWithHome(values.dir?.trim() || defaultDir));
      let scheduleInput = parseScheduleInput(values.schedule ?? "");
      if (scheduleInput.cron === undefined) {
        setIsSaving(false);
        return;
      }
      let taskId = values.id?.trim() || defaultTaskSlug(resolvedDir, values.prompt?.trim() ?? "");
      let permissionMode = values.permissionMode ?? "dontAsk";
      let modelValue = values.model?.trim() || undefined;
      let task = {
        id: taskId,
        cron: scheduleInput.cron,
        prompt: values.prompt.trim(),
        directory: resolvedDir,
        enabled: prefill?.enabled ?? true,
        permissionMode,
        runTimeoutMinutes: prefill?.runTimeoutMinutes ?? 30,
        maxQueued: prefill?.maxQueued ?? 1,
        ...(modelValue && {
          model: modelValue,
        }),
      };
      try {
        if (isEditing && prefill.id !== taskId) await removeScheduledTask(prefill.id, undefined, storageV5);
        await addScheduledTask(task, undefined, storageV5);
        await onSaved(taskId, isEditing);
      } catch (error) {
        let saveError = error;
        logError(saveError);
        onDone(`Save failed: ${errorMessage(saveError)}`, {
          display: "system",
        });
      }
    };
    $[40] = isSaving;
    $[41] = defaultDir;
    $[42] = isEditing;
    $[43] = onDone;
    $[44] = onSaved;
    $[45] = prefill;
    $[46] = storageV5;
    $[47] = values;
    $[48] = saveHandlerCached;
  } else saveHandlerCached = $[48];
  let saveTask = saveHandlerCached;
  const title = isEditing ? `Edit '${prefill.id}'` : "New scheduled task";
  let onSubmit;
  if ($[49] !== saveTask) {
    onSubmit = () => void saveTask();
    $[49] = saveTask;
    $[50] = onSubmit;
  } else onSubmit = $[50];
  const submitLabel = isEditing ? "Save changes" : "Create task";
  let formElement;
  if (
    $[51] !== fields_2 ||
    $[52] !== onCancel ||
    $[53] !== onChange ||
    $[54] !== title ||
    $[55] !== onSubmit ||
    $[56] !== submitLabel ||
    $[57] !== values
  ) {
    formElement = jsxProd_default(AgentsList, {
      title,
      subtitle: "Fire a prompt on a recurring schedule",
      fields: fields_2,
      values,
      onChange,
      onSubmit,
      onCancel,
      submitLabel,
    });
    $[51] = fields_2;
    $[52] = onCancel;
    $[53] = onChange;
    $[54] = title;
    $[55] = onSubmit;
    $[56] = submitLabel;
    $[57] = values;
    $[58] = formElement;
  } else formElement = $[58];
  return formElement;
}
//@ chunk-vde9a20m.js:8902-9003 placement
function slugifyTaskName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
//@ chunk-vde9a20m.js:9003-9126 placement
/**
 * 由目录名和提示词前几个词生成任务名，空则为 task。
 */
function defaultTaskSlug(directory, prompt) {
  let dirSlug = slugifyTaskName(basename(directory));
  let promptSlug = slugifyTaskName(prompt.split(/\s+/).slice(0, 4).join(" "));
  return [dirSlug, promptSlug].filter(Boolean).join("-") || "task";
}
//@ chunk-vde9a20m.js:9126-9345 placement
/**
 * 定时任务对象转为表单字段值。
 */
function toTaskFormValues(task) {
  return {
    id: task.id,
    cron: task.cron,
    prompt: task.prompt,
    directory: task.directory,
    enabled: task.enabled,
    permissionMode: task.permissionMode,
    runTimeoutMinutes: task.runTimeoutMinutes,
    maxQueued: task.maxQueued,
    ...(task.model && {
      model: task.model,
    }),
  };
}
export { loadScheduledTaskRuns, DaemonScheduledTaskDetail, DaemonScheduledTaskForm, slugifyTaskName };
