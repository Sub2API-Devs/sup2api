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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { readJsonConfigFile } from "../../utils/jsonConfigFile.js";
import { jL } from "../../services/daemon/paths.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { removeRemoteControlDir, upsertRemoteControlDir } from "../../daemon/daemonAuth.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { bgSupervisorNoun } from "../../utils/fleetGates.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Lu } from "../../utils/networkPaths.js";
import { isPathTrusted, setPathTrusted } from "../../utils/config.js";
import { eA } from "../../utils/settings/settingsStorage.js";
import { AgentsList } from "../agents/AgentsList.js";
import { isRemoteToolServingOnForSettings } from "../../services/remoteTools/servingGates.js";
import {
  readUnattendedServingConsent,
  managedSettingsForbidUnattendedServing,
} from "../../services/remoteTools/unattendedConsentStore.js";
import { BARE_SUBSCRIPT_NAME_BUILTINS_2 } from "../../utils/bash/ast.js";
import { bKn, Ban } from "../../services/remoteTools/unattendedServingConsent.js";

//@ chunk-b7gstm5r.js:14682-14686 placement
j();
//@ chunk-b7gstm5r.js:14686-14690 placement
j();
/**
 * 会话隔离方式说明（每个会话独立 worktree 或共享目录）。
 */
//@ chunk-b7gstm5r.js:14737-14876 placement
function describeSessionIsolation(Lt) {
  return Lt === "worktree"
    ? "Each session gets its own git worktree (requires a git repo)."
    : "All sessions share the directory.";
}
//@ chunk-b7gstm5r.js:14876-15069 placement
async function readRemoteControlServers(a, t) {
  let o = await readJsonConfigFile(jL(), t);
  if (!o.ok) return [];
  return (o.config.remoteControl ?? []).map((i) => ({
    dir: i.dir,
    name: i.name ?? basename(i.dir),
    spawnMode: i.spawnMode ?? "same-dir",
    isRunning: a,
  }));
}
/**
 * 远程控制服务器详情页：状态、无人值守同意、启停与删除。
 */
//@ chunk-b7gstm5r.js:15069-17350 placement
function RemoteControlServerDetail(a) {
  let u = w(41),
    { server: server, onBack: onBack, onDone: onDone, refresh: refresh, storageV5: storageV5 } = a,
    [b, N] = y(!1),
    [k, I] = y(!1),
    T;
  if (u[0] !== b || u[1] !== onDone || u[2] !== refresh || u[3] !== server.dir || u[4] !== storageV5)
    ((T = async function m() {
      if (b) {
        return;
      }
      N(!0);
      try {
        (await removeRemoteControlDir(server.dir, void 0, storageV5),
          await refresh(),
          onDone(`Removed remote-control server for ${server.dir}.`, { display: "system" }));
      } catch (error) {
        let M = error;
        (logError(M), onDone(`Action failed: ${errorMessage(M)}`, { display: "system" }));
      }
    }),
      (u[0] = b),
      (u[1] = onDone),
      (u[2] = refresh),
      (u[3] = server.dir),
      (u[4] = storageV5),
      (u[5] = T));
  else T = u[5];
  let m = T;
  if (k) {
    const dir = server.dir;
    let D;
    if (u[6] === MEMO_CACHE_SENTINEL) ((D = bgSupervisorNoun()), (u[6] = D));
    else D = u[6];
    const C = `Stop serving ${dir} to claude.ai. The ${D} will stop the worker on its next reconcile.`;
    let F;
    if (u[7] === MEMO_CACHE_SENTINEL) ((F = () => I(!1)), (u[7] = F));
    else F = u[7];
    let U;
    if (u[8] !== m) ((U = () => void m()), (u[8] = m), (u[9] = U));
    else U = u[9];
    let B;
    if (u[10] === MEMO_CACHE_SENTINEL) ((B = () => I(!1)), (u[10] = B));
    else B = u[10];
    let A;
    if (u[11] !== U)
      ((A = e(ConfirmSelect, {
        hideIndexes: !0,
        cancelFirst: !0,
        focus: "cancel",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, cancel",
        onConfirm: U,
        onCancel: B,
      })),
        (u[11] = U),
        (u[12] = A));
    else A = u[12];
    let c;
    if (u[13] !== C || u[14] !== A)
      ((c = e(Dialog, { title: "Remove server?", subtitle: C, onCancel: F, color: "error", children: A })),
        (u[13] = C),
        (u[14] = A),
        (u[15] = c));
    else c = u[15];
    return c;
  }
  let p;
  if (u[16] === MEMO_CACHE_SENTINEL)
    ((p = [
      { label: "Remove", value: "remove" },
      { label: "Back", value: "back" },
    ]),
      (u[16] = p));
  else p = u[16];
  let te = p,
    D;
  if (u[17] !== server.dir)
    ((D = r(Text, { dimColor: !0, children: ["Directory ", server.dir] })),
      (u[17] = server.dir),
      (u[18] = D));
  else D = u[18];
  let C;
  if (u[19] !== server.spawnMode)
    ((C = r(Text, { dimColor: !0, children: ["Spawn mode ", server.spawnMode] })),
      (u[19] = server.spawnMode),
      (u[20] = C));
  else C = u[20];
  const F = server.isRunning ? "success" : "pending";
  let U;
  if (u[21] !== F) ((U = e(StatusIcon, { status: F, withSpace: !0 })), (u[21] = F), (u[22] = U));
  else U = u[22];
  const B = server.isRunning ? "running" : "not running";
  let A;
  if (u[23] !== U || u[24] !== B)
    ((A = r(Text, { dimColor: !0, children: ["Status", "     ", U, B] })),
      (u[23] = U),
      (u[24] = B),
      (u[25] = A));
  else A = u[25];
  let c;
  if (u[26] !== D || u[27] !== C || u[28] !== A)
    ((c = r(Box, { flexDirection: "column", marginBottom: 1, children: [D, C, A] })),
      (u[26] = D),
      (u[27] = C),
      (u[28] = A),
      (u[29] = c));
  else c = u[29];
  let g;
  if (u[30] !== onBack)
    ((g = (L) => {
      if (L === "back") {
        return onBack();
      }
      I(!0);
    }),
      (u[30] = onBack),
      (u[31] = g));
  else g = u[31];
  let W;
  if (u[32] !== b || u[33] !== onBack || u[34] !== g)
    ((W = e(ModelSelector, { options: te, isDisabled: b, onChange: g, onCancel: onBack })),
      (u[32] = b),
      (u[33] = onBack),
      (u[34] = g),
      (u[35] = W));
  else W = u[35];
  let z;
  if (u[36] !== onBack || u[37] !== server.name || u[38] !== W || u[39] !== c)
    ((z = r(Dialog, { title: server.name, onCancel: onBack, children: [c, W] })),
      (u[36] = onBack),
      (u[37] = server.name),
      (u[38] = W),
      (u[39] = c),
      (u[40] = z));
  else z = u[40];
  return z;
}
//@ chunk-b7gstm5r.js:17350-20584 placement
function AddRemoteControlServerForm(a) {
  let v = w(50),
    { defaultDir: defaultDir, onCancel: onCancel, onAdded: onAdded, storageV5: storageV5 } = a,
    b;
  if (v[0] !== defaultDir) ((b = basename(defaultDir)), (v[0] = defaultDir), (v[1] = b));
  else b = v[1];
  let N;
  if (v[2] !== defaultDir || v[3] !== b)
    ((N = { dir: defaultDir, name: b, spawnMode: "same-dir" }), (v[2] = defaultDir), (v[3] = b), (v[4] = N));
  else N = v[4];
  let [k, I] = y(N),
    [u, T] = y(!1),
    [p, M] = y(null),
    [m, D] = y(!1),
    C;
  if (v[5] !== defaultDir || v[6] !== u)
    ((C = function c(F, U) {
      if (F === "name") T(!0);
      I((B) => {
        if (B[F] === U) {
          return B;
        }
        let A = { ...B, [F]: U };
        if (F === "dir" && !u) A.name = basename(resolve(Lu(U.trim() || defaultDir)));
        return A;
      });
    }),
      (v[5] = defaultDir),
      (v[6] = u),
      (v[7] = C));
  else C = v[7];
  let c = C,
    te;
  if (v[8] !== defaultDir || v[9] !== k.dir)
    ((te = resolve(Lu(k.dir?.trim() || defaultDir))), (v[8] = defaultDir), (v[9] = k.dir), (v[10] = te));
  else te = v[10];
  let g = te,
    L;
  if (v[11] !== defaultDir)
    ((L = (W) => {
      let z = resolve(Lu(W.trim() || defaultDir));
      return isPathTrusted(z, { advisoryNoFsProbe: !0 })
        ? "Available on claude.ai/code and the Claude mobile app."
        : `${z} is not yet trusted \u2014 you'll be asked to trust it on submit.`;
    }),
      (v[11] = defaultDir),
      (v[12] = L));
  else L = v[12];
  let J;
  if (v[13] !== defaultDir || v[14] !== L)
    ((J = { type: "text", key: "dir", label: "Directory", placeholder: defaultDir, required: !0, hint: L }),
      (v[13] = defaultDir),
      (v[14] = L),
      (v[15] = J));
  else J = v[15];
  let Y;
  if (v[16] !== u)
    ((Y = {
      type: "text",
      key: "name",
      label: "Name",
      hint: () => (u ? "Shown in the claude.ai session picker." : "Auto-generated from the directory name."),
    }),
      (v[16] = u),
      (v[17] = Y));
  else Y = v[17];
  let ce;
  if (v[18] === MEMO_CACHE_SENTINEL)
    ((ce = {
      type: "select",
      key: "spawnMode",
      label: "Spawn mode",
      options: [
        { label: "same-dir", value: "same-dir" },
        { label: "worktree", value: "worktree" },
      ],
      hint: describeSessionIsolation,
    }),
      (v[18] = ce));
  else ce = v[18];
  let h;
  if (v[19] !== J || v[20] !== Y) ((h = [J, Y, ce]), (v[19] = J), (v[20] = Y), (v[21] = h));
  else h = v[21];
  let x = h,
    ge;
  if (
    v[22] !== onAdded ||
    v[23] !== onCancel ||
    v[24] !== storageV5 ||
    v[25] !== k.name ||
    v[26] !== k.spawnMode
  )
    ((ge = async function E(ke) {
      D(!0);
      let Vt = k.name?.trim() || basename(ke);
      let Me = k.spawnMode ?? "same-dir";
      try {
        (await upsertRemoteControlDir({ dir: ke, name: Vt, spawnMode: Me }, void 0, storageV5), onAdded());
      } catch (error) {
        let Ce = error;
        (logError(Ce), D(!1), onCancel());
      }
    }),
      (v[22] = onAdded),
      (v[23] = onCancel),
      (v[24] = storageV5),
      (v[25] = k.name),
      (v[26] = k.spawnMode),
      (v[27] = ge));
  else ge = v[27];
  let E = ge,
    ne;
  if (v[28] !== m || v[29] !== E || v[30] !== g)
    ((ne = function X() {
      if (m) {
        return;
      }
      if (!isPathTrusted(g)) {
        M({ dir: g, trustRoot: eA(g) });
        return;
      }
      E(g);
    }),
      (v[28] = m),
      (v[29] = E),
      (v[30] = g),
      (v[31] = ne));
  else ne = v[31];
  let X = ne;
  if (p !== null) {
    let In =
      p.trustRoot != null && p.trustRoot !== p.dir
        ? ` It's part of the repository at ${p.trustRoot} \u2014 trusting it trusts that whole repository.`
        : "";
    const K = `${p.dir} hasn't been trusted yet.${In} Trusting allows Claude to read and execute files there.`;
    let oe;
    if (v[32] === MEMO_CACHE_SENTINEL) ((oe = () => M(null)), (v[32] = oe));
    else oe = v[32];
    let le;
    if (v[33] !== E || v[34] !== p.dir || v[35] !== storageV5)
      ((le = () => {
        (setPathTrusted(p.dir, storageV5).then(() => E(p.dir)), M(null));
      }),
        (v[33] = E),
        (v[34] = p.dir),
        (v[35] = storageV5),
        (v[36] = le));
    else le = v[36];
    let he;
    if (v[37] === MEMO_CACHE_SENTINEL) ((he = () => M(null)), (v[37] = he));
    else he = v[37];
    let ae;
    if (v[38] !== le)
      ((ae = e(ConfirmSelect, {
        hideIndexes: !0,
        cancelFirst: !0,
        focus: "cancel",
        confirmLabel: "Yes, trust and add server",
        cancelLabel: "No, go back",
        onConfirm: le,
        onCancel: he,
      })),
        (v[38] = le),
        (v[39] = ae));
    else ae = v[39];
    let Re;
    if (v[40] !== K || v[41] !== ae)
      ((Re = e(Dialog, { title: "Trust this directory?", subtitle: K, onCancel: oe, children: ae })),
        (v[40] = K),
        (v[41] = ae),
        (v[42] = Re));
    else Re = v[42];
    return Re;
  }
  const K = m ? "Adding\u2026" : "Add server";
  let oe;
  if (v[43] !== x || v[44] !== X || v[45] !== onCancel || v[46] !== c || v[47] !== K || v[48] !== k)
    ((oe = e(AgentsList, {
      title: "New Remote Control server",
      subtitle: "Make a directory available on claude.ai/code and the Claude mobile app",
      fields: x,
      values: k,
      onChange: c,
      onSubmit: X,
      onCancel: onCancel,
      submitLabel: K,
    })),
      (v[43] = x),
      (v[44] = X),
      (v[45] = onCancel),
      (v[46] = c),
      (v[47] = K),
      (v[48] = k),
      (v[49] = oe));
  else oe = v[49];
  return oe;
}
//@ chunk-b7gstm5r.js:21796-21984 placement
async function readServingConsentState(a) {
  let t = a?.servingOn ?? isRemoteToolServingOnForSettings(),
    o = await readUnattendedServingConsent().catch(() => "unset");
  return {
    servingOn: t,
    visible: a?.visible === !0 || BARE_SUBSCRIPT_NAME_BUILTINS_2(t),
    choice: o,
    canWithdraw: bKn(),
    lockReason: managedSettingsForbidUnattendedServing() ? Ban() : void 0,
  };
}

export {
  readRemoteControlServers,
  readServingConsentState,
  RemoteControlServerDetail,
  AddRemoteControlServerForm,
};
