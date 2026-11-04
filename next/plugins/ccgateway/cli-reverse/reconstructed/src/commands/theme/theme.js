/**
 * commands/theme/theme.tsx
 *
 * /theme 实现：主题选择与自定义主题
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/theme/theme.tsx
 * pieces: chunk-3s4dbk22.js (2)
 * attribution: fingerprint 1, callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRef, useState } from "../../../vendor/react/cjs/react.production.js";
import { useTheme, useCustomThemes, useThemeSetting } from "../../components/design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { parseCustomThemeRef, customThemeRef } from "../../utils/customThemes.js";
import { commitTheme } from "./themeWriter.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { GlobalSearchDialog } from "../../components/GlobalSearchDialog.js";
import { getSafeModeExitHint } from "../../utils/envUtils.js";
import { Pane } from "../../components/design-system/Pane.js";
import { ThemePicker } from "../../components/ThemePicker.js";

//@ chunk-3s4dbk22.js:23515-27511 fingerprint (2.1.88 match: ThemePickerCommand, 0.344)
function ThemePickerCommand(props) {
  let $ = useMemoCache(50);
  let { onDone } = props;
  let doneRef = useRef(false);
  let finish;
  if ($[0] !== onDone) {
    finish = (message, options) => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone(message, options);
      }
    };
    $[0] = onDone;
    $[1] = finish;
  } else finish = $[1];
  let finishCommand = finish;
  let [currentTheme, setCurrentTheme] = useTheme();
  let { customThemes } = useCustomThemes();
  let initialMode;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    initialMode = {
      kind: "picker",
    };
    $[2] = initialMode;
  } else initialMode = $[2];
  let [mode, setMode] = useState(initialMode);
  let customizationDisabled;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    customizationDisabled = isCustomizationDisabled("themes");
    $[3] = customizationDisabled;
  } else customizationDisabled = $[3];
  let customizationOff = customizationDisabled;
  let themeSetting = useThemeSetting();
  let parsedSetting;
  if ($[4] !== themeSetting) {
    parsedSetting = parseCustomThemeRef(themeSetting);
    $[4] = themeSetting;
    $[5] = parsedSetting;
  } else parsedSetting = $[5];
  let savedCustomRef = parsedSetting;
  let pendingSettingRef = useRef(undefined);
  let currentSetting;
  if ($[6] !== themeSetting) {
    currentSetting = () => pendingSettingRef.current ?? themeSetting;
    $[6] = themeSetting;
    $[7] = currentSetting;
  } else currentSetting = $[7];
  let readSetting = currentSetting;
  let refusedSaveRef = useRef(undefined);
  let activeCommitRef = useRef(undefined);
  let queuedCommitRef = useRef(undefined);
  let commitThemeSafe;
  if ($[8] !== readSetting || $[9] !== setCurrentTheme) {
    let startCommit = (ref, callback) => {
      if (doneRef.current) {
        return;
      }
      let commitState = {
        withdrawal: new AbortController(),
        saved: undefined,
      };
      let settle = (setting) => {
        if (activeCommitRef.current === commitState) activeCommitRef.current = undefined;
        if (commitState.saved !== undefined) {
          refusedSaveRef.current = undefined;
          callback({
            kind: "saved",
            saved: commitState.saved,
          });
        } else if (!commitState.withdrawal.signal.aborted)
          callback({
            kind: "refused",
            reason: setting,
          });
      };
      let commitPromise = commitTheme(
        ref,
        {
          themeSetting: readSetting(),
          setTheme: (nextSetting) => {
            commitState.saved = nextSetting;
            pendingSettingRef.current = nextSetting;
            setCurrentTheme(nextSetting);
          },
        },
        commitState.withdrawal.signal,
      );
      if (!(commitPromise instanceof Promise)) {
        settle(commitPromise?.error?.message);
        return;
      }
      activeCommitRef.current = commitState;
      return commitPromise.then(
        (error) => settle(error?.error?.message),
        (error) => {
          logForDebugging(`/theme: config.set failed: ${errorMessage(error)}`, {
            level: "error",
          });
          settle(errorMessage(error));
        },
      );
    };
    commitThemeSafe = (ref, callback) => {
      let commitPromise =
        queuedCommitRef.current === undefined
          ? startCommit(ref, callback)
          : queuedCommitRef.current.then(() => startCommit(ref, callback));
      if (commitPromise !== undefined) {
        queuedCommitRef.current = commitPromise;
        let clearQueue = () => {
          if (queuedCommitRef.current === commitPromise) queuedCommitRef.current = undefined;
        };
        commitPromise.then(clearQueue, clearQueue);
      }
      return commitPromise;
    };
    $[8] = readSetting;
    $[9] = setCurrentTheme;
    $[10] = commitThemeSafe;
  } else commitThemeSafe = $[10];
  let commitWithQueue = commitThemeSafe;
  let withdraw;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    withdraw = () => {
      activeCommitRef.current?.withdrawal.abort();
      return activeCommitRef.current?.saved;
    };
    $[11] = withdraw;
  } else withdraw = $[11];
  let withdrawPending = withdraw;
  let message;
  if ($[12] !== finishCommand) {
    message = (detail, reason) =>
      finishCommand(`${detail}${reason ? `: ${reason}` : ""}`, {
        display: "system",
      });
    $[12] = finishCommand;
    $[13] = message;
  } else message = $[13];
  let finishWith = message;
  let setting;
  if ($[14] !== customThemes || $[15] !== finishCommand) {
    setting = (setting) =>
      finishCommand(
        parseCustomThemeRef(setting)
          ? `Using custom theme "${customThemes.find((customTheme) => customThemeRef(customTheme.slug) === setting)?.name ?? setting}"`
          : `Theme set to ${setting}`,
      );
    $[14] = customThemes;
    $[15] = finishCommand;
    $[16] = setting;
  } else setting = $[16];
  let reportSaved = setting;
  let editorDoneRef = useRef(false);
  if (mode.kind === "editor") {
    let onDone;
    if (
      $[17] !== commitWithQueue ||
      $[18] !== finishCommand ||
      $[19] !== readSetting ||
      $[20] !== reportSaved ||
      $[21] !== finishWith
    ) {
      onDone = (theme) => {
        let themeRef = customThemeRef(theme.slug);
        let notInUseText = `Saved custom theme "${theme.name}", not in use`;
        let resolveSetting = (setting) =>
          setting === themeRef ? finishCommand(`Using custom theme "${theme.name}"`) : reportSaved(setting);
        if (editorDoneRef.current) {
          let pending = withdrawPending();
          if (pending === undefined) finishWith(notInUseText, undefined);
          else resolveSetting(pending);
          return;
        }
        editorDoneRef.current = true;
        let commitWhenIdle = () => {
          if (refusedSaveRef.current?.ref === themeRef) {
            finishWith(notInUseText, refusedSaveRef.current.reason);
            return;
          }
          if (themeRef === readSetting()) {
            resolveSetting(themeRef);
            return;
          }
          return commitWithQueue(themeRef, (outcome) => {
            switch (outcome.kind) {
              case "refused": {
                finishWith(notInUseText, outcome.reason);
                return;
              }
              case "saved": {
                resolveSetting(outcome.saved);
                return;
              }
            }
          });
        };
        if (queuedCommitRef.current === undefined) commitWhenIdle();
        else queuedCommitRef.current.then(commitWhenIdle);
      };
      $[17] = commitWithQueue;
      $[18] = finishCommand;
      $[19] = readSetting;
      $[20] = reportSaved;
      $[21] = finishWith;
      $[22] = onDone;
    } else onDone = $[22];
    let onPick;
    if ($[23] !== commitWithQueue) {
      onPick = (themeRef) =>
        commitWithQueue(themeRef, (outcome) => {
          if (outcome.kind === "refused")
            refusedSaveRef.current = {
              ref: themeRef,
              reason: outcome.reason,
            };
        });
      $[23] = commitWithQueue;
      $[24] = onPick;
    } else onPick = $[24];
    let onCancel;
    if ($[25] === MEMO_CACHE_SENTINEL) {
      onCancel = () =>
        setMode({
          kind: "picker",
        });
      $[25] = onCancel;
    } else onCancel = $[25];
    let editor;
    if ($[26] !== currentTheme || $[27] !== mode.initial || $[28] !== onDone || $[29] !== onPick) {
      editor = jsxProd_default(GlobalSearchDialog, {
        initial: mode.initial,
        defaultBase: currentTheme,
        onDone,
        onPick,
        onCancel,
      });
      $[26] = currentTheme;
      $[27] = mode.initial;
      $[28] = onDone;
      $[29] = onPick;
      $[30] = editor;
    } else editor = $[30];
    return editor;
  }
  let onThemeSelect;
  if ($[31] !== commitWithQueue || $[32] !== reportSaved || $[33] !== finishWith) {
    onThemeSelect = (setting) =>
      commitWithQueue(setting, (outcome) => {
        switch (outcome.kind) {
          case "refused": {
            finishWith("Couldn't save Theme", outcome.reason);
            return;
          }
          case "saved": {
            reportSaved(outcome.saved);
            return;
          }
        }
      });
    $[31] = commitWithQueue;
    $[32] = reportSaved;
    $[33] = finishWith;
    $[34] = onThemeSelect;
  } else onThemeSelect = $[34];
  let onCustomTheme;
  if ($[35] !== commitWithQueue || $[36] !== reportSaved || $[37] !== finishWith || $[38] !== themeSetting) {
    onCustomTheme = customizationOff
      ? undefined
      : (theme) => {
          let themeRef = theme && customThemeRef(theme.slug);
          if (themeRef === undefined || themeRef === themeSetting) {
            setMode({
              kind: "editor",
              initial: theme,
            });
            return;
          }
          return commitWithQueue(themeRef, (outcome) => {
            switch (outcome.kind) {
              case "refused": {
                finishWith("Couldn't save Theme", outcome.reason);
                return;
              }
              case "saved": {
                if (outcome.saved === themeRef)
                  setMode({
                    kind: "editor",
                    initial: theme,
                  });
                else reportSaved(outcome.saved);
                return;
              }
            }
          });
        };
    $[35] = commitWithQueue;
    $[36] = reportSaved;
    $[37] = finishWith;
    $[38] = themeSetting;
    $[39] = onCustomTheme;
  } else onCustomTheme = $[39];
  let helpText;
  if ($[40] !== savedCustomRef) {
    helpText = customizationOff
      ? `Custom themes are disabled in safe mode \u2014 ${getSafeModeExitHint()} to create or edit them${savedCustomRef ? `. Your saved theme "${savedCustomRef}" is a custom theme; selecting a preset here replaces it` : ""}`
      : "";
    $[40] = savedCustomRef;
    $[41] = helpText;
  } else helpText = $[41];
  let onCancel;
  if ($[42] !== finishCommand || $[43] !== reportSaved) {
    onCancel = () => {
      let pending = withdrawPending();
      if (pending === undefined)
        finishCommand("Theme picker dismissed", {
          display: "system",
        });
      else reportSaved(pending);
    };
    $[42] = finishCommand;
    $[43] = reportSaved;
    $[44] = onCancel;
  } else onCancel = $[44];
  let pane;
  if ($[45] !== onThemeSelect || $[46] !== onCustomTheme || $[47] !== helpText || $[48] !== onCancel) {
    pane = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default(ThemePicker, {
        onThemeSelect,
        onCustomTheme,
        helpText,
        onCancel,
        skipExitHandling: true,
      }),
    });
    $[45] = onThemeSelect;
    $[46] = onCustomTheme;
    $[47] = helpText;
    $[48] = onCancel;
    $[49] = pane;
  } else pane = $[49];
  return pane;
}
//@ chunk-3s4dbk22.js:27511-27549 callgraph-fingerprint (2.1.88 match: call, 1)
/**
 * /theme 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) =>
  jsxProd_default(ThemePickerCommand, {
    onDone,
  });
export { call };
