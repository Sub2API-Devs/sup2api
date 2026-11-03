/**
 * components/IdeAutoConnectDialog.tsx
 *
 * 是否启用/禁用 IDE 自动连接的对话框及显示条件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeAutoConnectDialog.tsx
 * pieces: chunk-5bdzenzx.js (6), chunk-e6aww6q8.js (1)
 * attribution: placement 2, fingerprint 4, callgraph-fingerprint 1
 */
import { j, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { So } from "../hooks/useRecentInputGuard.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { Text } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { isSupportedTerminal } from "../utils/ide.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { env } from "../utils/env.js";
import { isBareMode } from "../utils/envUtils.js";

//@ chunk-5bdzenzx.js:14079-14083 placement
j();
//@ chunk-5bdzenzx.js:14107-14111 placement
j();
//@ chunk-5bdzenzx.js:14111-14157 fingerprint = _temp (1)
function On(current) {
  return { ...current, autoConnectIde: !1 };
}
//@ chunk-5bdzenzx.js:14157-15420 fingerprint = IdeAutoConnectDialog (0.623)
function IdeAutoConnectDialog(t0) {
  let $ = w(20),
    { onComplete: onComplete } = t0,
    { storageV5: storageV5 } = Me(),
    i = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    I = settleKey(epoch, So),
    p = R(!1),
    D;
  if ($[0] !== i || $[1] !== noteRefused || $[2] !== refusedWithin)
    ((D = () => {
      if (i() || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[0] = i),
      ($[1] = noteRefused),
      ($[2] = refusedWithin),
      ($[3] = D));
  else D = $[3];
  let d = D,
    C;
  if ($[4] !== onComplete || $[5] !== d || $[6] !== storageV5)
    ((C = async (value) => {
      if (d()) {
        return;
      }
      if (p.current) {
        return;
      }
      p.current = !0;
      let autoConnect = value === "yes";
      (await saveGlobalConfig(
        (current) => ({ ...current, autoConnectIde: autoConnect, hasIdeAutoConnectDialogBeenShown: !0 }),
        storageV5,
      ),
        onComplete());
    }),
      ($[4] = onComplete),
      ($[5] = d),
      ($[6] = storageV5),
      ($[7] = C));
  else C = $[7];
  let O = C,
    v;
  if ($[8] !== onComplete || $[9] !== d)
    ((v = () => {
      if (d()) {
        return;
      }
      if (p.current) {
        return;
      }
      onComplete();
    }),
      ($[8] = onComplete),
      ($[9] = d),
      ($[10] = v));
  else v = $[10];
  let q = v,
    V;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((V = [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ]),
      ($[11] = V));
  else V = $[11];
  let H = V,
    A;
  if ($[12] !== O || $[13] !== I.remountKey || $[14] !== d)
    ((A = e(
      ModelSelector,
      {
        hideIndexes: !0,
        refuseInput: d,
        options: H,
        onChange: O,
        defaultFocusValue: "no",
        selectedValue: NO_COMMITTED_ROW,
      },
      I.remountKey,
    )),
      ($[12] = O),
      ($[13] = I.remountKey),
      ($[14] = d),
      ($[15] = A));
  else A = $[15];
  let F;
  if ($[16] === MEMO_CACHE_SENTINEL)
    ((F = e(Text, {
      dimColor: !0,
      children: "You can also configure this in /config or with the --ide flag",
    })),
      ($[16] = F));
  else F = $[16];
  let b;
  if ($[17] !== q || $[18] !== A)
    ((b = r(Dialog, {
      title: "Do you wish to enable auto-connect to IDE?",
      color: "ide",
      onCancel: q,
      exitOnCtrlCD: !0,
      children: [A, F],
    })),
      ($[17] = q),
      ($[18] = A),
      ($[19] = b));
  else b = $[19];
  return b;
}
//@ chunk-5bdzenzx.js:15420-15521 fingerprint = shouldShowAutoConnectDialog (1)
function shouldShowAutoConnectDialog() {
  let config = getGlobalConfig();
  return (
    !isSupportedTerminal() && config.autoConnectIde !== !0 && config.hasIdeAutoConnectDialogBeenShown !== !0
  );
}
//@ chunk-5bdzenzx.js:15521-16087 fingerprint = IdeDisableAutoConnectDialog (0.582)
function IdeDisableAutoConnectDialog(t0) {
  let $ = w(11),
    { onComplete: onComplete } = t0,
    { storageV5: storageV5 } = Me(),
    u;
  if ($[0] !== onComplete || $[1] !== storageV5)
    ((u = () => {
      (saveGlobalConfig(On, storageV5), onComplete(!0));
    }),
      ($[0] = onComplete),
      ($[1] = storageV5),
      ($[2] = u));
  else u = $[2];
  let l = u,
    t;
  if ($[3] !== onComplete)
    ((t = () => {
      onComplete(!1);
    }),
      ($[3] = onComplete),
      ($[4] = t));
  else t = $[4];
  let I = t,
    p;
  if ($[5] !== I || $[6] !== l)
    ((p = e(ConfirmSelect, { hideIndexes: !0, cancelFirst: !0, focus: "cancel", onConfirm: l, onCancel: I })),
      ($[5] = I),
      ($[6] = l),
      ($[7] = p));
  else p = $[7];
  let h;
  if ($[8] !== I || $[9] !== p)
    ((h = e(Dialog, {
      title: "Do you wish to disable auto-connect to IDE?",
      subtitle: "You can also configure this in /config",
      onCancel: I,
      color: "ide",
      children: p,
    })),
      ($[8] = I),
      ($[9] = p),
      ($[10] = h));
  else h = $[10];
  return h;
}
//@ chunk-e6aww6q8.js:3236461-3236660 callgraph-fingerprint = shouldShowDisableAutoConnectDialog (0.47)
function shouldShowDisableAutoConnectDialog(e = !1) {
  if (env.CLAUDE_CODE_AUTO_CONNECT_IDE === !1) return !1;
  if (isBareMode()) return e;
  return Boolean(
    getGlobalConfig().autoConnectIde ||
    e ||
    isSupportedTerminal() ||
    env.CLAUDE_CODE_SSE_PORT !== void 0 ||
    env.CLAUDE_CODE_AUTO_CONNECT_IDE === !0,
  );
}

export {
  shouldShowDisableAutoConnectDialog,
  shouldShowAutoConnectDialog,
  IdeAutoConnectDialog,
  IdeDisableAutoConnectDialog,
};
