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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
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
function permissionModeOption(co) {
  return {
    label: permissionModeTitle(co),
    value: co,
  };
}
//@ chunk-vde9a20m.js:1160-1225 placement
async function loadScheduledTaskRuns(u) {
  return listScheduledTasks(undefined, u).catch((error) => {
    logError(error);
    return [];
  });
}
//@ chunk-vde9a20m.js:1225-5219 placement
/**
 * 后台定时任务详情页：运行记录、启用/停用、编辑、立即运行与删除。
 */
function DaemonScheduledTaskDetail(props) {
  let i = w(76);
  let { task, onBack, onEdit, onDone, refresh, storageV5 } = props;
  let [g, U] = y(false);
  let [p, ee] = y(false);
  let b;
  if (i[0] !== g || i[1] !== onDone || i[2] !== refresh || i[3] !== storageV5 || i[4] !== task) {
    b = async function I() {
      if (g) {
        return;
      }
      U(true);
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
        let Be = error;
        logError(Be);
        onDone(`Toggle failed: ${errorMessage(Be)}`, {
          display: "system",
        });
      }
    };
    i[0] = g;
    i[1] = onDone;
    i[2] = refresh;
    i[3] = storageV5;
    i[4] = task;
    i[5] = b;
  } else b = i[5];
  let I = b;
  let Y;
  if (i[6] !== g || i[7] !== onDone || i[8] !== refresh || i[9] !== storageV5 || i[10] !== task.id) {
    Y = async function L() {
      if (g) {
        return;
      }
      U(true);
      try {
        await removeScheduledTask(task.id, undefined, storageV5);
        await refresh();
        onDone(`Removed scheduled task '${task.id}'.`, {
          display: "system",
        });
      } catch (error) {
        let oe = error;
        logForDebugging(
          `Failed to remove scheduled task '${task.id}' from daemon.json: ${errorMessage(oe)}`,
          {
            level: "error",
          },
        );
        onDone(`Remove failed: ${errorMessage(oe)}`, {
          display: "system",
        });
      }
    };
    i[6] = g;
    i[7] = onDone;
    i[8] = refresh;
    i[9] = storageV5;
    i[10] = task.id;
    i[11] = Y;
  } else Y = i[11];
  let L = Y;
  if (p) {
    const subtitle = `Delete '${task.id}' from daemon.json. The daemon will stop firing it on its next reconcile.`;
    let onCancel;
    if (i[12] === MEMO_CACHE_SENTINEL) {
      onCancel = () => ee(false);
      i[12] = onCancel;
    } else onCancel = i[12];
    let onConfirm;
    if (i[13] !== L) {
      onConfirm = () => void L();
      i[13] = L;
      i[14] = onConfirm;
    } else onConfirm = i[14];
    let onCancel_2;
    if (i[15] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => ee(false);
      i[15] = onCancel_2;
    } else onCancel_2 = i[15];
    let children;
    if (i[16] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, cancel",
        onConfirm,
        onCancel: onCancel_2,
      });
      i[16] = onConfirm;
      i[17] = children;
    } else children = i[17];
    let f;
    if (i[18] !== subtitle || i[19] !== children) {
      f = jsxProd_default(Dialog, {
        title: "Remove task?",
        subtitle,
        onCancel,
        color: "error",
        children,
      });
      i[18] = subtitle;
      i[19] = children;
      i[20] = f;
    } else f = i[20];
    return f;
  }
  const label = task.enabled ? "Disable" : "Enable";
  let x;
  if (i[21] !== label) {
    x = {
      label,
      value: "toggle",
    };
    i[21] = label;
    i[22] = x;
  } else x = i[22];
  let C;
  let E;
  let M;
  if (i[23] === MEMO_CACHE_SENTINEL) {
    C = {
      label: "Edit",
      value: "edit",
    };
    E = {
      label: "Remove",
      value: "remove",
    };
    M = {
      label: "Back",
      value: "back",
    };
    i[23] = C;
    i[24] = E;
    i[25] = M;
  } else {
    C = i[23];
    E = i[24];
    M = i[25];
  }
  let f;
  if (i[26] !== x) {
    f = [x, C, E, M];
    i[26] = x;
    i[27] = f;
  } else f = i[27];
  let options = f;
  const { id, cron } = task;
  let Q;
  if (i[28] !== task.cron) {
    Q = cronToHuman(task.cron);
    i[28] = task.cron;
    i[29] = Q;
  } else Q = i[29];
  let G;
  if (i[30] !== Q || i[31] !== task.cron) {
    G = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Cron ", cron, " (", Q, ")"],
    });
    i[30] = Q;
    i[31] = task.cron;
    i[32] = G;
  } else G = i[32];
  let H;
  if (i[33] !== task.directory) {
    H = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Directory ", task.directory],
    });
    i[33] = task.directory;
    i[34] = H;
  } else H = i[34];
  let D;
  if (i[35] !== task.prompt) {
    D = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Prompt ", task.prompt],
    });
    i[35] = task.prompt;
    i[36] = D;
  } else D = i[36];
  const status = task.enabled ? "on" : "off";
  let N;
  if (i[37] !== status) {
    N = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    i[37] = status;
    i[38] = N;
  } else N = i[38];
  const q = task.enabled ? "enabled" : "disabled";
  let P;
  if (i[39] !== N || i[40] !== q) {
    P = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Status ", N, q],
    });
    i[39] = N;
    i[40] = q;
    i[41] = P;
  } else P = i[41];
  let K;
  if (i[42] !== task.permissionMode) {
    K = permissionModeTitle(task.permissionMode);
    i[42] = task.permissionMode;
    i[43] = K;
  } else K = i[43];
  let ie;
  if (i[44] !== K) {
    ie = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Mode ", K],
    });
    i[44] = K;
    i[45] = ie;
  } else ie = i[45];
  let T;
  if (i[46] !== task.model) {
    T =
      task.model &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Model ", task.model],
      });
    i[46] = task.model;
    i[47] = T;
  } else T = i[47];
  let W;
  if (i[48] !== task.runTimeoutMinutes) {
    W = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Timeout ", task.runTimeoutMinutes, "m"],
    });
    i[48] = task.runTimeoutMinutes;
    i[49] = W;
  } else W = i[49];
  let Z;
  if (i[50] !== task.maxQueued) {
    Z = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Max queue ", task.maxQueued],
    });
    i[50] = task.maxQueued;
    i[51] = Z;
  } else Z = i[51];
  let O;
  if (
    i[52] !== G ||
    i[53] !== H ||
    i[54] !== D ||
    i[55] !== P ||
    i[56] !== ie ||
    i[57] !== T ||
    i[58] !== W ||
    i[59] !== Z
  ) {
    O = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [G, H, D, P, ie, T, W, Z],
    });
    i[52] = G;
    i[53] = H;
    i[54] = D;
    i[55] = P;
    i[56] = ie;
    i[57] = T;
    i[58] = W;
    i[59] = Z;
    i[60] = O;
  } else O = i[60];
  let onChange;
  if (i[61] !== onBack || i[62] !== onEdit || i[63] !== task || i[64] !== I) {
    onChange = (re) => {
      if (re === "back") {
        return onBack();
      }
      if (re === "edit") {
        return onEdit(task);
      }
      if (re === "remove") {
        return ee(true);
      }
      if (re === "toggle") {
        return void I();
      }
    };
    i[61] = onBack;
    i[62] = onEdit;
    i[63] = task;
    i[64] = I;
    i[65] = onChange;
  } else onChange = i[65];
  let J;
  if (i[66] !== g || i[67] !== onBack || i[68] !== options || i[69] !== onChange) {
    J = jsxProd_default(ModelSelector, {
      options,
      isDisabled: g,
      onChange,
      onCancel: onBack,
    });
    i[66] = g;
    i[67] = onBack;
    i[68] = options;
    i[69] = onChange;
    i[70] = J;
  } else J = i[70];
  let _;
  if (i[71] !== onBack || i[72] !== O || i[73] !== J || i[74] !== task.id) {
    _ = jsxProd_default_2(Dialog, {
      title: id,
      onCancel: onBack,
      children: [O, J],
    });
    i[71] = onBack;
    i[72] = O;
    i[73] = J;
    i[74] = task.id;
    i[75] = _;
  } else _ = i[75];
  return _;
}
//@ chunk-vde9a20m.js:5219-8902 placement
/**
 * 新建或编辑后台定时任务的表单：名称、计划、目录、模型与提示词。
 */
function DaemonScheduledTaskForm(props) {
  let p = w(59);
  let { defaultDir, existingIds, prefill, modelOptions, onCancel, onDone, onSaved, storageV5 } = props;
  let ee;
  if (p[0] !== modelOptions) {
    ee =
      modelOptions === undefined
        ? [
            {
              label: "default",
              value: "",
            },
          ]
        : modelOptions;
    p[0] = modelOptions;
    p[1] = ee;
  } else ee = p[1];
  let i = ee;
  let b = prefill !== undefined;
  let Y;
  if (p[2] !== existingIds || p[3] !== b || p[4] !== prefill) {
    Y = b ? existingIds.filter((existingId) => existingId !== prefill.id) : existingIds;
    p[2] = existingIds;
    p[3] = b;
    p[4] = prefill;
    p[5] = Y;
  } else Y = p[5];
  let I = Y;
  const prompt = prefill?.prompt ?? "";
  const schedule = prefill?.cron ?? "";
  const dir = prefill?.directory ?? defaultDir;
  const id = prefill?.id ?? "";
  const permissionMode = prefill?.permissionMode ?? "dontAsk";
  const model = prefill?.model ?? "";
  let M;
  if (
    p[6] !== prompt ||
    p[7] !== schedule ||
    p[8] !== dir ||
    p[9] !== id ||
    p[10] !== permissionMode ||
    p[11] !== model
  ) {
    M = {
      prompt,
      schedule,
      dir,
      id,
      permissionMode,
      model,
    };
    p[6] = prompt;
    p[7] = schedule;
    p[8] = dir;
    p[9] = id;
    p[10] = permissionMode;
    p[11] = model;
    p[12] = M;
  } else M = p[12];
  let [f, ce] = y(M);
  let [F, _e] = y(b);
  let [Q, G] = y(false);
  let H;
  if (p[13] !== defaultDir || p[14] !== F) {
    H = function P(D, te) {
      if (D === "id") _e(true);
      ce((N) => {
        if (N[D] === te) {
          return N;
        }
        let q = {
          ...N,
          [D]: te,
        };
        if (D !== "id" && !F && (D === "prompt" || D === "dir"))
          q.id = defaultTaskSlug(resolve(expandTildeWithHome(q.dir?.trim() || defaultDir)), q.prompt ?? "");
        return q;
      });
    };
    p[13] = defaultDir;
    p[14] = F;
    p[15] = H;
  } else H = p[15];
  let onChange = H;
  let K;
  if (p[16] !== i || p[17] !== prefill) {
    K =
      prefill?.model && !i.some((ie) => ie.value === prefill.model)
        ? [
            ...i,
            {
              label: prefill.model,
              value: prefill.model,
            },
          ]
        : i;
    p[16] = i;
    p[17] = prefill;
    p[18] = K;
  } else K = p[18];
  let T = K;
  let W;
  let Z;
  if (p[19] === MEMO_CACHE_SENTINEL) {
    W = {
      type: "text",
      key: "prompt",
      label: "Prompt",
      placeholder: "/babysit-prs",
      required: true,
      hint: cronPromptFieldHint,
    };
    Z = {
      type: "text",
      key: "schedule",
      label: "Schedule",
      placeholder: "5m, 2h, 1d  or  */15 * * * *",
      required: true,
      validate: validateScheduleInput,
      hint: renderCreateToolUseMessage,
    };
    p[19] = W;
    p[20] = Z;
  } else {
    W = p[19];
    Z = p[20];
  }
  let O;
  if (p[21] !== defaultDir) {
    O = {
      type: "text",
      key: "dir",
      label: "Directory",
      placeholder: defaultDir,
    };
    p[21] = defaultDir;
    p[22] = O;
  } else O = p[22];
  let validate;
  if (p[23] !== I) {
    validate = (re) => {
      let trimmed = re.trim();
      if (trimmed !== "" && I.includes(trimmed)) {
        return `id '${trimmed}' is already in use`;
      }
      return null;
    };
    p[23] = I;
    p[24] = validate;
  } else validate = p[24];
  let hint;
  if (p[25] !== F) {
    hint = () => (F ? undefined : "Auto-generated from prompt and directory.");
    p[25] = F;
    p[26] = hint;
  } else hint = p[26];
  let pe;
  if (p[27] !== validate || p[28] !== hint) {
    pe = {
      type: "text",
      key: "id",
      label: "Id",
      validate,
      hint,
    };
    p[27] = validate;
    p[28] = hint;
    p[29] = pe;
  } else pe = p[29];
  let eo;
  if (p[30] === MEMO_CACHE_SENTINEL) {
    eo = {
      type: "select",
      key: "permissionMode",
      label: "Permission mode",
      options: SCHEDULED_PERMISSION_MODES.map(permissionModeOption),
    };
    p[30] = eo;
  } else eo = p[30];
  let hint_2;
  if (p[31] !== T) {
    hint_2 = (oo) =>
      T.find((Fo) => Fo.value === oo)?.description ??
      (oo === "" ? "Uses your configured default model." : undefined);
    p[31] = T;
    p[32] = hint_2;
  } else hint_2 = p[32];
  let ke;
  if (p[33] !== T || p[34] !== hint_2) {
    ke = {
      type: "select",
      key: "model",
      label: "Model",
      options: T,
      hint: hint_2,
    };
    p[33] = T;
    p[34] = hint_2;
    p[35] = ke;
  } else ke = p[35];
  let to;
  if (p[36] !== O || p[37] !== pe || p[38] !== ke) {
    to = [W, Z, O, pe, eo, ke];
    p[36] = O;
    p[37] = pe;
    p[38] = ke;
    p[39] = to;
  } else to = p[39];
  let fields = to;
  let io;
  if (
    p[40] !== Q ||
    p[41] !== defaultDir ||
    p[42] !== b ||
    p[43] !== onDone ||
    p[44] !== onSaved ||
    p[45] !== prefill ||
    p[46] !== storageV5 ||
    p[47] !== f
  ) {
    io = async function ve() {
      if (Q) {
        return;
      }
      G(true);
      let ro = resolve(expandTildeWithHome(f.dir?.trim() || defaultDir));
      let scheduleInput = parseScheduleInput(f.schedule ?? "");
      if (scheduleInput.cron === undefined) {
        G(false);
        return;
      }
      let Me = f.id?.trim() || defaultTaskSlug(ro, f.prompt?.trim() ?? "");
      let permissionMode = f.permissionMode ?? "dontAsk";
      let so = f.model?.trim() || undefined;
      let No = {
        id: Me,
        cron: scheduleInput.cron,
        prompt: f.prompt.trim(),
        directory: ro,
        enabled: prefill?.enabled ?? true,
        permissionMode,
        runTimeoutMinutes: prefill?.runTimeoutMinutes ?? 30,
        maxQueued: prefill?.maxQueued ?? 1,
        ...(so && {
          model: so,
        }),
      };
      try {
        if (b && prefill.id !== Me) await removeScheduledTask(prefill.id, undefined, storageV5);
        await addScheduledTask(No, undefined, storageV5);
        await onSaved(Me, b);
      } catch (error) {
        let lo = error;
        logError(lo);
        onDone(`Save failed: ${errorMessage(lo)}`, {
          display: "system",
        });
      }
    };
    p[40] = Q;
    p[41] = defaultDir;
    p[42] = b;
    p[43] = onDone;
    p[44] = onSaved;
    p[45] = prefill;
    p[46] = storageV5;
    p[47] = f;
    p[48] = io;
  } else io = p[48];
  let ve = io;
  const title = b ? `Edit '${prefill.id}'` : "New scheduled task";
  let onSubmit;
  if (p[49] !== ve) {
    onSubmit = () => void ve();
    p[49] = ve;
    p[50] = onSubmit;
  } else onSubmit = p[50];
  const submitLabel = b ? "Save changes" : "Create task";
  let ao;
  if (
    p[51] !== fields ||
    p[52] !== onCancel ||
    p[53] !== onChange ||
    p[54] !== title ||
    p[55] !== onSubmit ||
    p[56] !== submitLabel ||
    p[57] !== f
  ) {
    ao = jsxProd_default(AgentsList, {
      title,
      subtitle: "Fire a prompt on a recurring schedule",
      fields,
      values: f,
      onChange,
      onSubmit,
      onCancel,
      submitLabel,
    });
    p[51] = fields;
    p[52] = onCancel;
    p[53] = onChange;
    p[54] = title;
    p[55] = onSubmit;
    p[56] = submitLabel;
    p[57] = f;
    p[58] = ao;
  } else ao = p[58];
  return ao;
}
//@ chunk-vde9a20m.js:8902-9003 placement
function slugifyTaskName(u) {
  return u
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
//@ chunk-vde9a20m.js:9003-9126 placement
/**
 * 由目录名和提示词前几个词生成任务名，空则为 task。
 */
function defaultTaskSlug(u, o) {
  let k = slugifyTaskName(basename(u));
  let a = slugifyTaskName(o.split(/\s+/).slice(0, 4).join(" "));
  return [k, a].filter(Boolean).join("-") || "task";
}
//@ chunk-vde9a20m.js:9126-9345 placement
/**
 * 定时任务对象转为表单字段值。
 */
function toTaskFormValues(u) {
  return {
    id: u.id,
    cron: u.cron,
    prompt: u.prompt,
    directory: u.directory,
    enabled: u.enabled,
    permissionMode: u.permissionMode,
    runTimeoutMinutes: u.runTimeoutMinutes,
    maxQueued: u.maxQueued,
    ...(u.model && {
      model: u.model,
    }),
  };
}
export { loadScheduledTaskRuns, DaemonScheduledTaskDetail, DaemonScheduledTaskForm, slugifyTaskName };
