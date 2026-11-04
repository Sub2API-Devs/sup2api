/**
 * components/daemon/RemoteControlServerDetail.tsx
 *
 * 2.1.316 新增：远程控制服务器详情页与添加表单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b7gstm5r.js (7)
 * attribution: placement 7
 */
import { basename, resolve } from "path";
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { readJsonConfigFile } from "../../utils/jsonConfigFile.js";
import { daemonJsonPath } from "../../services/daemon/paths.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { removeRemoteControlDir, upsertRemoteControlDir } from "../../daemon/daemonAuth.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { bgSupervisorNoun } from "../../utils/fleetGates.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { isPathTrusted, setPathTrusted } from "../../utils/config.js";
import { uncachedStorageRootFor } from "../../utils/settings/settingsStorage.js";
import { AgentsList } from "../agents/AgentsList.js";
import { isRemoteToolServingOnForSettings } from "../../services/remoteTools/servingGates.js";
import {
  readUnattendedServingConsent,
  managedSettingsForbidUnattendedServing,
} from "../../services/remoteTools/unattendedConsentStore.js";
import { BARE_SUBSCRIPT_NAME_BUILTINS_2 } from "../../utils/bash/ast.js";
import {
  isUnattendedServingAccepted,
  unattendedServingForbiddenText,
} from "../../services/remoteTools/unattendedServingConsent.js";

//@ chunk-b7gstm5r.js:14682-14686 placement
init_react_production();
//@ chunk-b7gstm5r.js:14686-14690 placement
init_react_production();
//@ chunk-b7gstm5r.js:14737-14876 placement
/**
 * 会话隔离方式说明（每个会话独立 worktree 或共享目录）。
 */
function describeSessionIsolation(isolationMode) {
  return isolationMode === "worktree"
    ? "Each session gets its own git worktree (requires a git repo)."
    : "All sessions share the directory.";
}
//@ chunk-b7gstm5r.js:14876-15069 placement
async function readRemoteControlServers(isRunning, storageV5) {
  let jsonConfigFile = await readJsonConfigFile(daemonJsonPath(), storageV5);
  if (!jsonConfigFile.ok) return [];
  return (jsonConfigFile.config.remoteControl ?? []).map((server) => ({
    dir: server.dir,
    name: server.name ?? basename(server.dir),
    spawnMode: server.spawnMode ?? "same-dir",
    isRunning,
  }));
}
//@ chunk-b7gstm5r.js:15069-17350 placement
/**
 * 远程控制服务器详情页：状态、无人值守同意、启停与删除。
 */
function RemoteControlServerDetail(props) {
  let $ = useMemoCache(41);
  let { server, onBack, onDone, refresh, storageV5 } = props;
  let [isBusy, setIsBusy] = useState(false);
  let [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  let removeCached;
  if ($[0] !== isBusy || $[1] !== onDone || $[2] !== refresh || $[3] !== server.dir || $[4] !== storageV5) {
    removeCached = async function handleRemove() {
      if (isBusy) {
        return;
      }
      setIsBusy(true);
      try {
        await removeRemoteControlDir(server.dir, undefined, storageV5);
        await refresh();
        onDone(`Removed remote-control server for ${server.dir}.`, {
          display: "system",
        });
      } catch (error) {
        let caughtError = error;
        logError(caughtError);
        onDone(`Action failed: ${errorMessage(caughtError)}`, {
          display: "system",
        });
      }
    };
    $[0] = isBusy;
    $[1] = onDone;
    $[2] = refresh;
    $[3] = server.dir;
    $[4] = storageV5;
    $[5] = removeCached;
  } else removeCached = $[5];
  let removeServer = removeCached;
  if (isConfirmingRemove) {
    const dir = server.dir;
    let supervisorNoun;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      supervisorNoun = bgSupervisorNoun();
      $[6] = supervisorNoun;
    } else supervisorNoun = $[6];
    const subtitle = `Stop serving ${dir} to claude.ai. The ${supervisorNoun} will stop the worker on its next reconcile.`;
    let onCancel;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setIsConfirmingRemove(false);
      $[7] = onCancel;
    } else onCancel = $[7];
    let onConfirm;
    if ($[8] !== removeServer) {
      onConfirm = () => void removeServer();
      $[8] = removeServer;
      $[9] = onConfirm;
    } else onConfirm = $[9];
    let onCancel_2;
    if ($[10] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setIsConfirmingRemove(false);
      $[10] = onCancel_2;
    } else onCancel_2 = $[10];
    let children;
    if ($[11] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, cancel",
        onConfirm,
        onCancel: onCancel_2,
      });
      $[11] = onConfirm;
      $[12] = children;
    } else children = $[12];
    let confirmDialog;
    if ($[13] !== subtitle || $[14] !== children) {
      confirmDialog = jsxProd_default(Dialog, {
        title: "Remove server?",
        subtitle,
        onCancel,
        color: "error",
        children,
      });
      $[13] = subtitle;
      $[14] = children;
      $[15] = confirmDialog;
    } else confirmDialog = $[15];
    return confirmDialog;
  }
  let options;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Remove",
        value: "remove",
      },
      {
        label: "Back",
        value: "back",
      },
    ];
    $[16] = options;
  } else options = $[16];
  let options_2 = options;
  let dirLine;
  if ($[17] !== server.dir) {
    dirLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Directory ", server.dir],
    });
    $[17] = server.dir;
    $[18] = dirLine;
  } else dirLine = $[18];
  let spawnModeLine;
  if ($[19] !== server.spawnMode) {
    spawnModeLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Spawn mode ", server.spawnMode],
    });
    $[19] = server.spawnMode;
    $[20] = spawnModeLine;
  } else spawnModeLine = $[20];
  const status = server.isRunning ? "success" : "pending";
  let statusIcon;
  if ($[21] !== status) {
    statusIcon = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    $[21] = status;
    $[22] = statusIcon;
  } else statusIcon = $[22];
  const runningText = server.isRunning ? "running" : "not running";
  let statusLine;
  if ($[23] !== statusIcon || $[24] !== runningText) {
    statusLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Status", "     ", statusIcon, runningText],
    });
    $[23] = statusIcon;
    $[24] = runningText;
    $[25] = statusLine;
  } else statusLine = $[25];
  let detailBody;
  if ($[26] !== dirLine || $[27] !== spawnModeLine || $[28] !== statusLine) {
    detailBody = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [dirLine, spawnModeLine, statusLine],
    });
    $[26] = dirLine;
    $[27] = spawnModeLine;
    $[28] = statusLine;
    $[29] = detailBody;
  } else detailBody = $[29];
  let onChange;
  if ($[30] !== onBack) {
    onChange = (value) => {
      if (value === "back") {
        return onBack();
      }
      setIsConfirmingRemove(true);
    };
    $[30] = onBack;
    $[31] = onChange;
  } else onChange = $[31];
  let selectorElement;
  if ($[32] !== isBusy || $[33] !== onBack || $[34] !== onChange) {
    selectorElement = jsxProd_default(ModelSelector, {
      options: options_2,
      isDisabled: isBusy,
      onChange,
      onCancel: onBack,
    });
    $[32] = isBusy;
    $[33] = onBack;
    $[34] = onChange;
    $[35] = selectorElement;
  } else selectorElement = $[35];
  let dialogElement;
  if ($[36] !== onBack || $[37] !== server.name || $[38] !== selectorElement || $[39] !== detailBody) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: server.name,
      onCancel: onBack,
      children: [detailBody, selectorElement],
    });
    $[36] = onBack;
    $[37] = server.name;
    $[38] = selectorElement;
    $[39] = detailBody;
    $[40] = dialogElement;
  } else dialogElement = $[40];
  return dialogElement;
}
//@ chunk-b7gstm5r.js:17350-20584 placement
function AddRemoteControlServerForm(props) {
  let $ = useMemoCache(50);
  let { defaultDir, onCancel, onAdded, storageV5 } = props;
  let name;
  if ($[0] !== defaultDir) {
    name = basename(defaultDir);
    $[0] = defaultDir;
    $[1] = name;
  } else name = $[1];
  let initialValues;
  if ($[2] !== defaultDir || $[3] !== name) {
    initialValues = {
      dir: defaultDir,
      name,
      spawnMode: "same-dir",
    };
    $[2] = defaultDir;
    $[3] = name;
    $[4] = initialValues;
  } else initialValues = $[4];
  let [values, setValues] = useState(initialValues);
  let [isNameDirty, setIsNameDirty] = useState(false);
  let [trustPrompt, setTrustPrompt] = useState(null);
  let [isSubmitting, setIsSubmitting] = useState(false);
  let changeCached;
  if ($[5] !== defaultDir || $[6] !== isNameDirty) {
    changeCached = function handleChange(fieldKey, fieldValue) {
      if (fieldKey === "name") setIsNameDirty(true);
      setValues((previous) => {
        if (previous[fieldKey] === fieldValue) {
          return previous;
        }
        let nextValues = {
          ...previous,
          [fieldKey]: fieldValue,
        };
        if (fieldKey === "dir" && !isNameDirty)
          nextValues.name = basename(resolve(expandTildeWithHome(fieldValue.trim() || defaultDir)));
        return nextValues;
      });
    };
    $[5] = defaultDir;
    $[6] = isNameDirty;
    $[7] = changeCached;
  } else changeCached = $[7];
  let onChange = changeCached;
  let resolvedDirCached;
  if ($[8] !== defaultDir || $[9] !== values.dir) {
    resolvedDirCached = resolve(expandTildeWithHome(values.dir?.trim() || defaultDir));
    $[8] = defaultDir;
    $[9] = values.dir;
    $[10] = resolvedDirCached;
  } else resolvedDirCached = $[10];
  let resolvedDir = resolvedDirCached;
  let hint;
  if ($[11] !== defaultDir) {
    hint = (rawDir) => {
      let dir = resolve(expandTildeWithHome(rawDir.trim() || defaultDir));
      return isPathTrusted(dir, {
        advisoryNoFsProbe: true,
      })
        ? "Available on claude.ai/code and the Claude mobile app."
        : `${dir} is not yet trusted \u2014 you'll be asked to trust it on submit.`;
    };
    $[11] = defaultDir;
    $[12] = hint;
  } else hint = $[12];
  let dirField;
  if ($[13] !== defaultDir || $[14] !== hint) {
    dirField = {
      type: "text",
      key: "dir",
      label: "Directory",
      placeholder: defaultDir,
      required: true,
      hint,
    };
    $[13] = defaultDir;
    $[14] = hint;
    $[15] = dirField;
  } else dirField = $[15];
  let nameField;
  if ($[16] !== isNameDirty) {
    nameField = {
      type: "text",
      key: "name",
      label: "Name",
      hint: () =>
        isNameDirty ? "Shown in the claude.ai session picker." : "Auto-generated from the directory name.",
    };
    $[16] = isNameDirty;
    $[17] = nameField;
  } else nameField = $[17];
  let spawnModeField;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    spawnModeField = {
      type: "select",
      key: "spawnMode",
      label: "Spawn mode",
      options: [
        {
          label: "same-dir",
          value: "same-dir",
        },
        {
          label: "worktree",
          value: "worktree",
        },
      ],
      hint: describeSessionIsolation,
    };
    $[18] = spawnModeField;
  } else spawnModeField = $[18];
  let fields;
  if ($[19] !== dirField || $[20] !== nameField) {
    fields = [dirField, nameField, spawnModeField];
    $[19] = dirField;
    $[20] = nameField;
    $[21] = fields;
  } else fields = $[21];
  let fields_2 = fields;
  let submitCached;
  if (
    $[22] !== onAdded ||
    $[23] !== onCancel ||
    $[24] !== storageV5 ||
    $[25] !== values.name ||
    $[26] !== values.spawnMode
  ) {
    submitCached = async function handleSubmit(dir) {
      setIsSubmitting(true);
      let name = values.name?.trim() || basename(dir);
      let spawnMode = values.spawnMode ?? "same-dir";
      try {
        await upsertRemoteControlDir(
          {
            dir,
            name,
            spawnMode,
          },
          undefined,
          storageV5,
        );
        onAdded();
      } catch (error) {
        let caughtError = error;
        logError(caughtError);
        setIsSubmitting(false);
        onCancel();
      }
    };
    $[22] = onAdded;
    $[23] = onCancel;
    $[24] = storageV5;
    $[25] = values.name;
    $[26] = values.spawnMode;
    $[27] = submitCached;
  } else submitCached = $[27];
  let submit = submitCached;
  let onSubmitCached;
  if ($[28] !== isSubmitting || $[29] !== submit || $[30] !== resolvedDir) {
    onSubmitCached = function handleFormSubmit() {
      if (isSubmitting) {
        return;
      }
      if (!isPathTrusted(resolvedDir)) {
        setTrustPrompt({
          dir: resolvedDir,
          trustRoot: uncachedStorageRootFor(resolvedDir),
        });
        return;
      }
      submit(resolvedDir);
    };
    $[28] = isSubmitting;
    $[29] = submit;
    $[30] = resolvedDir;
    $[31] = onSubmitCached;
  } else onSubmitCached = $[31];
  let onSubmit = onSubmitCached;
  if (trustPrompt !== null) {
    let trustHintSuffix =
      trustPrompt.trustRoot != null && trustPrompt.trustRoot !== trustPrompt.dir
        ? ` It's part of the repository at ${trustPrompt.trustRoot} \u2014 trusting it trusts that whole repository.`
        : "";
    const subtitle = `${trustPrompt.dir} hasn't been trusted yet.${trustHintSuffix} Trusting allows Claude to read and execute files there.`;
    let onCancel;
    if ($[32] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setTrustPrompt(null);
      $[32] = onCancel;
    } else onCancel = $[32];
    let onConfirm;
    if ($[33] !== submit || $[34] !== trustPrompt.dir || $[35] !== storageV5) {
      onConfirm = () => {
        setPathTrusted(trustPrompt.dir, storageV5).then(() => submit(trustPrompt.dir));
        setTrustPrompt(null);
      };
      $[33] = submit;
      $[34] = trustPrompt.dir;
      $[35] = storageV5;
      $[36] = onConfirm;
    } else onConfirm = $[36];
    let onCancel_2;
    if ($[37] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setTrustPrompt(null);
      $[37] = onCancel_2;
    } else onCancel_2 = $[37];
    let children;
    if ($[38] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, trust and add server",
        cancelLabel: "No, go back",
        onConfirm,
        onCancel: onCancel_2,
      });
      $[38] = onConfirm;
      $[39] = children;
    } else children = $[39];
    let trustDialog;
    if ($[40] !== subtitle || $[41] !== children) {
      trustDialog = jsxProd_default(Dialog, {
        title: "Trust this directory?",
        subtitle,
        onCancel,
        children,
      });
      $[40] = subtitle;
      $[41] = children;
      $[42] = trustDialog;
    } else trustDialog = $[42];
    return trustDialog;
  }
  const submitLabel = isSubmitting ? "Adding\u2026" : "Add server";
  let formElement;
  if (
    $[43] !== fields_2 ||
    $[44] !== onSubmit ||
    $[45] !== onCancel ||
    $[46] !== onChange ||
    $[47] !== submitLabel ||
    $[48] !== values
  ) {
    formElement = jsxProd_default(AgentsList, {
      title: "New Remote Control server",
      subtitle: "Make a directory available on claude.ai/code and the Claude mobile app",
      fields: fields_2,
      values,
      onChange,
      onSubmit,
      onCancel,
      submitLabel,
    });
    $[43] = fields_2;
    $[44] = onSubmit;
    $[45] = onCancel;
    $[46] = onChange;
    $[47] = submitLabel;
    $[48] = values;
    $[49] = formElement;
  } else formElement = $[49];
  return formElement;
}
//@ chunk-b7gstm5r.js:21796-21984 placement
async function readServingConsentState(override) {
  let servingOn = override?.servingOn ?? isRemoteToolServingOnForSettings();
  let choice = await readUnattendedServingConsent().catch(() => "unset");
  return {
    servingOn,
    visible: override?.visible === true || BARE_SUBSCRIPT_NAME_BUILTINS_2(servingOn),
    choice,
    canWithdraw: isUnattendedServingAccepted(),
    lockReason: managedSettingsForbidUnattendedServing() ? unattendedServingForbiddenText() : undefined,
  };
}
export {
  readRemoteControlServers,
  readServingConsentState,
  RemoteControlServerDetail,
  AddRemoteControlServerForm,
};
