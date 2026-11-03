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
import { init_react_production, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { Text } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { isSupportedTerminal } from "../utils/ide.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { env } from "../utils/env.js";
import { isBareMode } from "../utils/envUtils.js";

//@ chunk-5bdzenzx.js:14079-14083 placement
init_react_production();
//@ chunk-5bdzenzx.js:14107-14111 placement
init_react_production();
//@ chunk-5bdzenzx.js:14111-14157 fingerprint = _temp (1)
function withAutoConnectOff(current) {
  return {
    ...current,
    autoConnectIde: false,
  };
}
//@ chunk-5bdzenzx.js:14157-15420 fingerprint = IdeAutoConnectDialog (0.623)
function IdeAutoConnectDialog(props) {
  let $ = w(20);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let I = settleKey(epoch, RECENT_INPUT_GUARD_MS);
  let p = R(false);
  let D;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    D = () => {
      if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = D;
  } else D = $[3];
  let d = D;
  let C;
  if ($[4] !== onComplete || $[5] !== d || $[6] !== storageV5) {
    C = async (value) => {
      if (d()) {
        return;
      }
      if (p.current) {
        return;
      }
      p.current = true;
      let autoConnect = value === "yes";
      await saveGlobalConfig(
        (current) => ({
          ...current,
          autoConnectIde: autoConnect,
          hasIdeAutoConnectDialogBeenShown: true,
        }),
        storageV5,
      );
      onComplete();
    };
    $[4] = onComplete;
    $[5] = d;
    $[6] = storageV5;
    $[7] = C;
  } else C = $[7];
  let onChange = C;
  let v;
  if ($[8] !== onComplete || $[9] !== d) {
    v = () => {
      if (d()) {
        return;
      }
      if (p.current) {
        return;
      }
      onComplete();
    };
    $[8] = onComplete;
    $[9] = d;
    $[10] = v;
  } else v = $[10];
  let onCancel = v;
  let V;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    V = [
      {
        label: "Yes",
        value: "yes",
      },
      {
        label: "No",
        value: "no",
      },
    ];
    $[11] = V;
  } else V = $[11];
  let options = V;
  let A;
  if ($[12] !== onChange || $[13] !== I.remountKey || $[14] !== d) {
    A = jsxProd_default(
      ModelSelector,
      {
        hideIndexes: true,
        refuseInput: d,
        options,
        onChange,
        defaultFocusValue: "no",
        selectedValue: NO_COMMITTED_ROW,
      },
      I.remountKey,
    );
    $[12] = onChange;
    $[13] = I.remountKey;
    $[14] = d;
    $[15] = A;
  } else A = $[15];
  let F;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    F = jsxProd_default(Text, {
      dimColor: true,
      children: "You can also configure this in /config or with the --ide flag",
    });
    $[16] = F;
  } else F = $[16];
  let b;
  if ($[17] !== onCancel || $[18] !== A) {
    b = jsxProd_default_2(Dialog, {
      title: "Do you wish to enable auto-connect to IDE?",
      color: "ide",
      onCancel,
      exitOnCtrlCD: true,
      children: [A, F],
    });
    $[17] = onCancel;
    $[18] = A;
    $[19] = b;
  } else b = $[19];
  return b;
}
//@ chunk-5bdzenzx.js:15420-15521 fingerprint = shouldShowAutoConnectDialog (1)
function shouldShowAutoConnectDialog() {
  let config = getGlobalConfig();
  return (
    !isSupportedTerminal() &&
    config.autoConnectIde !== true &&
    config.hasIdeAutoConnectDialogBeenShown !== true
  );
}
//@ chunk-5bdzenzx.js:15521-16087 fingerprint = IdeDisableAutoConnectDialog (0.582)
function IdeDisableAutoConnectDialog(props) {
  let $ = w(11);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let t1;
  if ($[0] !== onComplete || $[1] !== storageV5) {
    t1 = () => {
      saveGlobalConfig(withAutoConnectOff, storageV5);
      onComplete(true);
    };
    $[0] = onComplete;
    $[1] = storageV5;
    $[2] = t1;
  } else t1 = $[2];
  let onConfirm = t1;
  let t;
  if ($[3] !== onComplete) {
    t = () => {
      onComplete(false);
    };
    $[3] = onComplete;
    $[4] = t;
  } else t = $[4];
  let onCancel = t;
  let children;
  if ($[5] !== onCancel || $[6] !== onConfirm) {
    children = jsxProd_default(ConfirmSelect, {
      hideIndexes: true,
      cancelFirst: true,
      focus: "cancel",
      onConfirm,
      onCancel,
    });
    $[5] = onCancel;
    $[6] = onConfirm;
    $[7] = children;
  } else children = $[7];
  let t5;
  if ($[8] !== onCancel || $[9] !== children) {
    t5 = jsxProd_default(Dialog, {
      title: "Do you wish to disable auto-connect to IDE?",
      subtitle: "You can also configure this in /config",
      onCancel,
      color: "ide",
      children,
    });
    $[8] = onCancel;
    $[9] = children;
    $[10] = t5;
  } else t5 = $[10];
  return t5;
}
//@ chunk-e6aww6q8.js:3236461-3236660 callgraph-fingerprint = shouldShowDisableAutoConnectDialog (0.47)
function shouldShowDisableAutoConnectDialog(e = false) {
  if (env.CLAUDE_CODE_AUTO_CONNECT_IDE === false) return false;
  if (isBareMode()) return e;
  return Boolean(
    getGlobalConfig().autoConnectIde ||
    e ||
    isSupportedTerminal() ||
    env.CLAUDE_CODE_SSE_PORT !== undefined ||
    env.CLAUDE_CODE_AUTO_CONNECT_IDE === true,
  );
}
export {
  shouldShowDisableAutoConnectDialog,
  shouldShowAutoConnectDialog,
  IdeAutoConnectDialog,
  IdeDisableAutoConnectDialog,
};
