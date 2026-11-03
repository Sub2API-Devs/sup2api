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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { readJsonConfigFile } from "../../utils/jsonConfigFile.js";
import { daemonJsonPath } from "../../services/daemon/paths.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function describeSessionIsolation(Lt) {
  return Lt === "worktree"
    ? "Each session gets its own git worktree (requires a git repo)."
    : "All sessions share the directory.";
}
//@ chunk-b7gstm5r.js:14876-15069 placement
async function readRemoteControlServers(isRunning, t) {
  let jsonConfigFile = await readJsonConfigFile(daemonJsonPath(), t);
  if (!jsonConfigFile.ok) return [];
  return (jsonConfigFile.config.remoteControl ?? []).map((i) => ({
    dir: i.dir,
    name: i.name ?? basename(i.dir),
    spawnMode: i.spawnMode ?? "same-dir",
    isRunning,
  }));
}
//@ chunk-b7gstm5r.js:15069-17350 placement
/**
 * 远程控制服务器详情页：状态、无人值守同意、启停与删除。
 */
function RemoteControlServerDetail(props) {
  let u = w(41);
  let { server, onBack, onDone, refresh, storageV5 } = props;
  let [b, N] = y(false);
  let [k, I] = y(false);
  let T;
  if (u[0] !== b || u[1] !== onDone || u[2] !== refresh || u[3] !== server.dir || u[4] !== storageV5) {
    T = async function m() {
      if (b) {
        return;
      }
      N(true);
      try {
        await removeRemoteControlDir(server.dir, undefined, storageV5);
        await refresh();
        onDone(`Removed remote-control server for ${server.dir}.`, {
          display: "system",
        });
      } catch (error) {
        let M = error;
        logError(M);
        onDone(`Action failed: ${errorMessage(M)}`, {
          display: "system",
        });
      }
    };
    u[0] = b;
    u[1] = onDone;
    u[2] = refresh;
    u[3] = server.dir;
    u[4] = storageV5;
    u[5] = T;
  } else T = u[5];
  let m = T;
  if (k) {
    const dir = server.dir;
    let D;
    if (u[6] === MEMO_CACHE_SENTINEL) {
      D = bgSupervisorNoun();
      u[6] = D;
    } else D = u[6];
    const subtitle = `Stop serving ${dir} to claude.ai. The ${D} will stop the worker on its next reconcile.`;
    let onCancel;
    if (u[7] === MEMO_CACHE_SENTINEL) {
      onCancel = () => I(false);
      u[7] = onCancel;
    } else onCancel = u[7];
    let onConfirm;
    if (u[8] !== m) {
      onConfirm = () => void m();
      u[8] = m;
      u[9] = onConfirm;
    } else onConfirm = u[9];
    let onCancel_2;
    if (u[10] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => I(false);
      u[10] = onCancel_2;
    } else onCancel_2 = u[10];
    let children;
    if (u[11] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, cancel",
        onConfirm,
        onCancel: onCancel_2,
      });
      u[11] = onConfirm;
      u[12] = children;
    } else children = u[12];
    let c;
    if (u[13] !== subtitle || u[14] !== children) {
      c = jsxProd_default(Dialog, {
        title: "Remove server?",
        subtitle,
        onCancel,
        color: "error",
        children,
      });
      u[13] = subtitle;
      u[14] = children;
      u[15] = c;
    } else c = u[15];
    return c;
  }
  let p;
  if (u[16] === MEMO_CACHE_SENTINEL) {
    p = [
      {
        label: "Remove",
        value: "remove",
      },
      {
        label: "Back",
        value: "back",
      },
    ];
    u[16] = p;
  } else p = u[16];
  let options = p;
  let D;
  if (u[17] !== server.dir) {
    D = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Directory ", server.dir],
    });
    u[17] = server.dir;
    u[18] = D;
  } else D = u[18];
  let C;
  if (u[19] !== server.spawnMode) {
    C = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Spawn mode ", server.spawnMode],
    });
    u[19] = server.spawnMode;
    u[20] = C;
  } else C = u[20];
  const status = server.isRunning ? "success" : "pending";
  let U;
  if (u[21] !== status) {
    U = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    u[21] = status;
    u[22] = U;
  } else U = u[22];
  const B = server.isRunning ? "running" : "not running";
  let A;
  if (u[23] !== U || u[24] !== B) {
    A = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Status", "     ", U, B],
    });
    u[23] = U;
    u[24] = B;
    u[25] = A;
  } else A = u[25];
  let c;
  if (u[26] !== D || u[27] !== C || u[28] !== A) {
    c = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [D, C, A],
    });
    u[26] = D;
    u[27] = C;
    u[28] = A;
    u[29] = c;
  } else c = u[29];
  let onChange;
  if (u[30] !== onBack) {
    onChange = (L) => {
      if (L === "back") {
        return onBack();
      }
      I(true);
    };
    u[30] = onBack;
    u[31] = onChange;
  } else onChange = u[31];
  let W;
  if (u[32] !== b || u[33] !== onBack || u[34] !== onChange) {
    W = jsxProd_default(ModelSelector, {
      options,
      isDisabled: b,
      onChange,
      onCancel: onBack,
    });
    u[32] = b;
    u[33] = onBack;
    u[34] = onChange;
    u[35] = W;
  } else W = u[35];
  let z;
  if (u[36] !== onBack || u[37] !== server.name || u[38] !== W || u[39] !== c) {
    z = jsxProd_default_2(Dialog, {
      title: server.name,
      onCancel: onBack,
      children: [c, W],
    });
    u[36] = onBack;
    u[37] = server.name;
    u[38] = W;
    u[39] = c;
    u[40] = z;
  } else z = u[40];
  return z;
}
//@ chunk-b7gstm5r.js:17350-20584 placement
function AddRemoteControlServerForm(props) {
  let v = w(50);
  let { defaultDir, onCancel, onAdded, storageV5 } = props;
  let name;
  if (v[0] !== defaultDir) {
    name = basename(defaultDir);
    v[0] = defaultDir;
    v[1] = name;
  } else name = v[1];
  let N;
  if (v[2] !== defaultDir || v[3] !== name) {
    N = {
      dir: defaultDir,
      name,
      spawnMode: "same-dir",
    };
    v[2] = defaultDir;
    v[3] = name;
    v[4] = N;
  } else N = v[4];
  let [k, I] = y(N);
  let [u, T] = y(false);
  let [p, M] = y(null);
  let [m, D] = y(false);
  let C;
  if (v[5] !== defaultDir || v[6] !== u) {
    C = function c(F, U) {
      if (F === "name") T(true);
      I((B) => {
        if (B[F] === U) {
          return B;
        }
        let A = {
          ...B,
          [F]: U,
        };
        if (F === "dir" && !u) A.name = basename(resolve(expandTildeWithHome(U.trim() || defaultDir)));
        return A;
      });
    };
    v[5] = defaultDir;
    v[6] = u;
    v[7] = C;
  } else C = v[7];
  let onChange = C;
  let te;
  if (v[8] !== defaultDir || v[9] !== k.dir) {
    te = resolve(expandTildeWithHome(k.dir?.trim() || defaultDir));
    v[8] = defaultDir;
    v[9] = k.dir;
    v[10] = te;
  } else te = v[10];
  let g = te;
  let hint;
  if (v[11] !== defaultDir) {
    hint = (W) => {
      let z = resolve(expandTildeWithHome(W.trim() || defaultDir));
      return isPathTrusted(z, {
        advisoryNoFsProbe: true,
      })
        ? "Available on claude.ai/code and the Claude mobile app."
        : `${z} is not yet trusted \u2014 you'll be asked to trust it on submit.`;
    };
    v[11] = defaultDir;
    v[12] = hint;
  } else hint = v[12];
  let J;
  if (v[13] !== defaultDir || v[14] !== hint) {
    J = {
      type: "text",
      key: "dir",
      label: "Directory",
      placeholder: defaultDir,
      required: true,
      hint,
    };
    v[13] = defaultDir;
    v[14] = hint;
    v[15] = J;
  } else J = v[15];
  let Y;
  if (v[16] !== u) {
    Y = {
      type: "text",
      key: "name",
      label: "Name",
      hint: () => (u ? "Shown in the claude.ai session picker." : "Auto-generated from the directory name."),
    };
    v[16] = u;
    v[17] = Y;
  } else Y = v[17];
  let ce;
  if (v[18] === MEMO_CACHE_SENTINEL) {
    ce = {
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
    v[18] = ce;
  } else ce = v[18];
  let h;
  if (v[19] !== J || v[20] !== Y) {
    h = [J, Y, ce];
    v[19] = J;
    v[20] = Y;
    v[21] = h;
  } else h = v[21];
  let fields = h;
  let ge;
  if (
    v[22] !== onAdded ||
    v[23] !== onCancel ||
    v[24] !== storageV5 ||
    v[25] !== k.name ||
    v[26] !== k.spawnMode
  ) {
    ge = async function E(ke) {
      D(true);
      let name = k.name?.trim() || basename(ke);
      let spawnMode = k.spawnMode ?? "same-dir";
      try {
        await upsertRemoteControlDir(
          {
            dir: ke,
            name,
            spawnMode,
          },
          undefined,
          storageV5,
        );
        onAdded();
      } catch (error) {
        let Ce = error;
        logError(Ce);
        D(false);
        onCancel();
      }
    };
    v[22] = onAdded;
    v[23] = onCancel;
    v[24] = storageV5;
    v[25] = k.name;
    v[26] = k.spawnMode;
    v[27] = ge;
  } else ge = v[27];
  let E = ge;
  let ne;
  if (v[28] !== m || v[29] !== E || v[30] !== g) {
    ne = function X() {
      if (m) {
        return;
      }
      if (!isPathTrusted(g)) {
        M({
          dir: g,
          trustRoot: uncachedStorageRootFor(g),
        });
        return;
      }
      E(g);
    };
    v[28] = m;
    v[29] = E;
    v[30] = g;
    v[31] = ne;
  } else ne = v[31];
  let onSubmit = ne;
  if (p !== null) {
    let In =
      p.trustRoot != null && p.trustRoot !== p.dir
        ? ` It's part of the repository at ${p.trustRoot} \u2014 trusting it trusts that whole repository.`
        : "";
    const subtitle = `${p.dir} hasn't been trusted yet.${In} Trusting allows Claude to read and execute files there.`;
    let onCancel;
    if (v[32] === MEMO_CACHE_SENTINEL) {
      onCancel = () => M(null);
      v[32] = onCancel;
    } else onCancel = v[32];
    let onConfirm;
    if (v[33] !== E || v[34] !== p.dir || v[35] !== storageV5) {
      onConfirm = () => {
        setPathTrusted(p.dir, storageV5).then(() => E(p.dir));
        M(null);
      };
      v[33] = E;
      v[34] = p.dir;
      v[35] = storageV5;
      v[36] = onConfirm;
    } else onConfirm = v[36];
    let onCancel_2;
    if (v[37] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => M(null);
      v[37] = onCancel_2;
    } else onCancel_2 = v[37];
    let children;
    if (v[38] !== onConfirm) {
      children = jsxProd_default(ConfirmSelect, {
        hideIndexes: true,
        cancelFirst: true,
        focus: "cancel",
        confirmLabel: "Yes, trust and add server",
        cancelLabel: "No, go back",
        onConfirm,
        onCancel: onCancel_2,
      });
      v[38] = onConfirm;
      v[39] = children;
    } else children = v[39];
    let Re;
    if (v[40] !== subtitle || v[41] !== children) {
      Re = jsxProd_default(Dialog, {
        title: "Trust this directory?",
        subtitle,
        onCancel,
        children,
      });
      v[40] = subtitle;
      v[41] = children;
      v[42] = Re;
    } else Re = v[42];
    return Re;
  }
  const submitLabel = m ? "Adding\u2026" : "Add server";
  let oe;
  if (
    v[43] !== fields ||
    v[44] !== onSubmit ||
    v[45] !== onCancel ||
    v[46] !== onChange ||
    v[47] !== submitLabel ||
    v[48] !== k
  ) {
    oe = jsxProd_default(AgentsList, {
      title: "New Remote Control server",
      subtitle: "Make a directory available on claude.ai/code and the Claude mobile app",
      fields,
      values: k,
      onChange,
      onSubmit,
      onCancel,
      submitLabel,
    });
    v[43] = fields;
    v[44] = onSubmit;
    v[45] = onCancel;
    v[46] = onChange;
    v[47] = submitLabel;
    v[48] = k;
    v[49] = oe;
  } else oe = v[49];
  return oe;
}
//@ chunk-b7gstm5r.js:21796-21984 placement
async function readServingConsentState(a) {
  let t = a?.servingOn ?? isRemoteToolServingOnForSettings();
  let choice = await readUnattendedServingConsent().catch(() => "unset");
  return {
    servingOn: t,
    visible: a?.visible === true || BARE_SUBSCRIPT_NAME_BUILTINS_2(t),
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
