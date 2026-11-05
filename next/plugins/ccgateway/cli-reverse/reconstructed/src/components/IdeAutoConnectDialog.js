/**
 * components/IdeAutoConnectDialog.tsx
 *
 * 是否启用/禁用 IDE 自动连接的对话框及显示条件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeAutoConnectDialog.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-dh16zjm4.js (6)
 * attribution: callgraph-fingerprint 1, placement 2, fingerprint 4
 */
import { env } from "../utils/env.js";
import { isBareMode } from "../utils/envUtils.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { isSupportedTerminal } from "../utils/ide.js";
import { init_react_production, useRef } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useRecentInputWithin, useRefusalTracker, settleKey } from "./CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { Text } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3321077-3321276 callgraph-fingerprint (2.1.88 match: shouldShowDisableAutoConnectDialog, 0.47)
function shouldShowDisableAutoConnectDialog(force = false) {
  if (env.CLAUDE_CODE_AUTO_CONNECT_IDE === false) return false;
  if (isBareMode()) return force;
  return Boolean(
    getGlobalConfig().autoConnectIde ||
    force ||
    isSupportedTerminal() ||
    env.CLAUDE_CODE_SSE_PORT !== undefined ||
    env.CLAUDE_CODE_AUTO_CONNECT_IDE === true,
  );
}
//@ chunk-dh16zjm4.js:15260-15264 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dh16zjm4.js:15260", () => {
  init_react_production();
});
//@ chunk-dh16zjm4.js:15288-15292 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dh16zjm4.js:15288", () => {
  init_react_production();
});
//@ chunk-dh16zjm4.js:15292-15338 fingerprint (2.1.88 match: _temp, 1)
function withAutoConnectOff(current) {
  return {
    ...current,
    autoConnectIde: false,
  };
}
//@ chunk-dh16zjm4.js:15338-16601 fingerprint (2.1.88 match: IdeAutoConnectDialog, 0.624)
function IdeAutoConnectDialog(props) {
  let $ = useMemoCache(20);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let recentInput = useRecentInputWithin(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let settle = settleKey(epoch, RECENT_INPUT_GUARD_MS);
  let submittedRef = useRef(false);
  let shouldRefuse;
  if ($[0] !== recentInput || $[1] !== noteRefused || $[2] !== refusedWithin) {
    shouldRefuse = () => {
      if (recentInput() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = recentInput;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = shouldRefuse;
  } else shouldRefuse = $[3];
  let shouldRefuse_2 = shouldRefuse;
  let onChange;
  if ($[4] !== onComplete || $[5] !== shouldRefuse_2 || $[6] !== storageV5) {
    onChange = async (value) => {
      if (shouldRefuse_2()) {
        return;
      }
      if (submittedRef.current) {
        return;
      }
      submittedRef.current = true;
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
    $[5] = shouldRefuse_2;
    $[6] = storageV5;
    $[7] = onChange;
  } else onChange = $[7];
  let onChange_2 = onChange;
  let onCancel;
  if ($[8] !== onComplete || $[9] !== shouldRefuse_2) {
    onCancel = () => {
      if (shouldRefuse_2()) {
        return;
      }
      if (submittedRef.current) {
        return;
      }
      onComplete();
    };
    $[8] = onComplete;
    $[9] = shouldRefuse_2;
    $[10] = onCancel;
  } else onCancel = $[10];
  let onCancel_2 = onCancel;
  let options;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes",
        value: "yes",
      },
      {
        label: "No",
        value: "no",
      },
    ];
    $[11] = options;
  } else options = $[11];
  let options_2 = options;
  let selector;
  if ($[12] !== onChange_2 || $[13] !== settle.remountKey || $[14] !== shouldRefuse_2) {
    selector = jsxProd_default(
      ModelSelector,
      {
        hideIndexes: true,
        refuseInput: shouldRefuse_2,
        options: options_2,
        onChange: onChange_2,
        defaultFocusValue: "no",
        selectedValue: NO_COMMITTED_ROW,
      },
      settle.remountKey,
    );
    $[12] = onChange_2;
    $[13] = settle.remountKey;
    $[14] = shouldRefuse_2;
    $[15] = selector;
  } else selector = $[15];
  let configHint;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    configHint = jsxProd_default(Text, {
      dimColor: true,
      children: "You can also configure this in /config or with the --ide flag",
    });
    $[16] = configHint;
  } else configHint = $[16];
  let dialog;
  if ($[17] !== onCancel_2 || $[18] !== selector) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Do you wish to enable auto-connect to IDE?",
      color: "ide",
      onCancel: onCancel_2,
      exitOnCtrlCD: true,
      children: [selector, configHint],
    });
    $[17] = onCancel_2;
    $[18] = selector;
    $[19] = dialog;
  } else dialog = $[19];
  return dialog;
}
//@ chunk-dh16zjm4.js:16601-16702 fingerprint (2.1.88 match: shouldShowAutoConnectDialog, 1)
function shouldShowAutoConnectDialog() {
  let config = getGlobalConfig();
  return (
    !isSupportedTerminal() &&
    config.autoConnectIde !== true &&
    config.hasIdeAutoConnectDialogBeenShown !== true
  );
}
//@ chunk-dh16zjm4.js:16702-17268 fingerprint (2.1.88 match: IdeDisableAutoConnectDialog, 0.582)
function IdeDisableAutoConnectDialog(props) {
  let $ = useMemoCache(11);
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
  let onConfirm_2;
  if ($[3] !== onComplete) {
    onConfirm_2 = () => {
      onComplete(false);
    };
    $[3] = onComplete;
    $[4] = onConfirm_2;
  } else onConfirm_2 = $[4];
  let onCancel = onConfirm_2;
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
export {
  shouldShowDisableAutoConnectDialog,
  shouldShowAutoConnectDialog,
  IdeAutoConnectDialog,
  IdeDisableAutoConnectDialog,
};
