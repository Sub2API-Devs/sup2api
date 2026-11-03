/**
 * commands/auto-mode-setup/autoModeSetup.tsx
 *
 * 2.1.316 新增：/auto-mode-setup：后台扫描环境、提出 auto mode 规则并写入设置的对话框与命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cndz99e.js (9), chunk-m8444q1d.js (18)
 * attribution: placement 27
 */
import { isAbsolute, resolve, relative } from "path";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { realpath } from "fs/promises";
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { pregatherOptionsFromAnswer } from "../../services/autoModeSetup/pregather.js";
import {
  AutoModeSetupReview,
  AutoModeSetupFlaggedPicker,
} from "../../components/permissions/AutoModeSetupReview.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Box, Text } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { merged } from "../../components/CustomSelect/selectA11y.js";
import { Select } from "../../components/CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  getBackgroundAutoModeSetupInFlight,
  setBackgroundAutoModeSetupInFlight,
} from "../../bootstrap/state.js";
import { createSystemMessage } from "../../utils/messages.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { registerAutoModeScanTask, findRunningAutoModeScanTask } from "../../tasks/AutoModeScanTask.js";
import { failDreamTask } from "../../tasks/DreamTask/DreamTask.js";
import {
  proposeAutoModeSetup,
  checkAutoModeSetupLogin,
  autoModeSetupLoginMessage,
  parseAutoModeProposal,
} from "../../services/autoModeSetup/autoModeSetup.js";
import { applyAutoModeSettings, AutoModeSetupWriteError } from "../../services/autoModeSetup/applySetup.js";
import {
  autoModeSetupReviewDialogDef,
  AUTO_MODE_SETUP_FLAGGED_DIALOG,
} from "../../components/dialogs/dialogKinds.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { autoModeConfigSchema, getSettingsForSourceForUpkeep } from "../../utils/settings/settings.js";
import { isNetworkHomePath } from "../../services/autoModeSetup/homeRepoScan.js";
import { isAttachmentReadDeniedOrThrown } from "../../utils/attachments/fileAttachments.js";
import { readFileGuarded } from "../../utils/fsSafety/guardedFileRead.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-m8444q1d.js:15604-15608 placement
init_react_production();
//@ chunk-m8444q1d.js:15608-15791 placement = autoModeConfigHandler (0.842)
function autoModeConfigHandler(o) {
  return {
    environment: o.environment,
    ...(o.allow.length > 0 && {
      allow: o.allow,
    }),
    ...(o.soft_deny.length > 0 && {
      soft_deny: o.soft_deny,
    }),
    ...(o.hard_deny.length > 0 && {
      hard_deny: o.hard_deny,
    }),
  };
}
//@ chunk-m8444q1d.js:15791-16525 placement
function savedToMessage(o, t) {
  return (
    `Saved to ${o.filePath} (${o.autoModeKeysWritten.join(", ")}` +
    (o.environmentEntriesPreserved > 0
      ? `; kept ${o.environmentEntriesPreserved} existing environment ${o.environmentEntriesPreserved === 1 ? "entry" : "entries"}`
      : "") +
    (t.removed > 0
      ? `; removed ${t.removed} permissions.allow ${t.removed === 1 ? "entry" : "entries"}`
      : "") +
    "). Run `claude auto-mode config` to see the effective result." +
    (t.skipped > 0
      ? ` Note: ${t.skipped} ${t.skipped === 1 ? "rule" : "rules"} couldn\u2019t be removed \u2014 permissions.allow isn\u2019t an array in your settings.`
      : "") +
    ((t.notFound ?? 0) > 0
      ? ` Note: ${t.notFound} ${t.notFound === 1 ? "rule was" : "rules were"} already gone from permissions.allow.`
      : "") +
    (o.warnings.length > 0
      ? `
${o.warnings.join(`
`)}`
      : "")
  );
}
//@ chunk-m8444q1d.js:16525-16782 placement
function initialAutoModeSetupState(o = false) {
  return {
    step: o ? "existing" : "confirm",
    hasExisting: o,
    mode: "append",
    posture: "mixed",
    gathersFromGitHubOrg: false,
    flaggedPicking: false,
    flaggedSelection: [],
    confirmSelection: ["shell"],
    confirmFocus: 1,
    confirmSrAtPosture: true,
    shownLogged: false,
    resolution: "none",
  };
}
//@ chunk-m8444q1d.js:16782-17524 placement
/**
 * auto 模式环境配置向导的标题与说明文案常量。
 */
var AUTO_MODE_SETUP_TITLE = "Teach auto mode about your environment?";
var AUTO_MODE_SETUP_DESCRIPTION =
  "Claude Code reads this project, your recent Claude sessions, and optionally your shell history and other repositories. Claude analyzes this data and customizes auto mode to make better decisions.";
var POSTURE_LABEL = "How you use Claude here";
var POSTURE_OPTIONS = [
  {
    value: "enterprise",
    label: "Work",
  },
  {
    value: "open-source",
    label: "Open source",
  },
  {
    value: "personal",
    label: "Hobby",
  },
  {
    value: "mixed",
    label: "Mixed",
  },
];
var OPTIONAL_READ_OPTIONS = [
  {
    value: "shell",
    label: "Also scan shell history",
  },
  {
    value: "repos",
    label: "Also scan your other repos",
  },
];
var SCREEN_READER_READ_OPTIONS = [
  {
    value: "shell",
    label: "Also scan shell history (default)",
  },
  {
    value: "repos",
    label: "Also scan your other repos",
  },
  {
    value: "both",
    label: "Scan both",
  },
  {
    value: "here",
    label: "Neither \u2014 just this project and sessions",
  },
];
//@ chunk-m8444q1d.js:17524-17661 placement
function depthToReadScopes(o) {
  switch (o) {
    case "both":
      return ["shell", "repos"];
    case "shell":
      return ["shell"];
    case "repos":
      return ["repos"];
    case "here":
      return [];
  }
}
//@ chunk-m8444q1d.js:17661-21975 placement
/**
 * /auto-mode-setup 对话框（2.1.316 新增）：后台扫描环境、提出 auto mode 规则建议，用户确认后写入设置。
 */
function AutoModeSetupDialog({
  state,
  propose,
  onBackgroundStart,
  abort,
  write,
  writeRemoval,
  onDone,
  onCancel,
}) {
  let [, setStep] = y(state.step);
  let step = state.step;
  let clock = useClock();
  y(() => {
    state.lastAcceptAt = Math.max(clock.now(), state.lastAcceptAt ?? 0);
    return null;
  });
  P(() => {
    state.notify = () => setStep(state.step);
    setStep(state.step);
    return () => {
      state.notify = undefined;
    };
  }, [state]);
  P(() => {
    if (!state.shownLogged) {
      state.shownLogged = true;
      logEvent("tengu_auto_mode_setup_wizard_shown", {
        has_existing: state.hasExisting ? 1 : 0,
      });
    }
  }, [state]);
  function O() {
    let h = clock.now();
    let lastAcceptAt = state.lastAcceptAt;
    state.lastAcceptAt = Math.max(h, lastAcceptAt ?? h);
    return lastAcceptAt !== undefined && h - lastAcceptAt >= RECENT_INPUT_GUARD_MS;
  }
  function T(h) {
    if (!O()) return false;
    return state.step === h && state.resolution === "none";
  }
  function F(step) {
    state.lastAcceptAt = Math.max(clock.now(), state.lastAcceptAt ?? 0);
    state.step = step;
    state.notify?.();
  }
  function x(h) {
    if (state.resolution !== "none") return;
    state.resolution = "cancel";
    logEvent("tengu_auto_mode_setup_wizard_resolved", {
      choice: fromEnum(h),
      step: fromEnum(state.step),
    });
    onCancel();
  }
  function I() {
    x("cancel");
  }
  function W(saved, A) {
    if (state.resolution !== "none") return;
    state.resolution = "done";
    logEvent("tengu_auto_mode_setup_wizard_resolved", {
      choice: fromEnum("saved"),
      mode: fromEnum(state.mode),
    });
    onDone(savedToMessage(saved, A));
  }
  function G() {
    if (!O()) return;
    if (state.saved) {
      W(state.saved, {
        removed: 0,
        skipped: 0,
      });
      return;
    }
    x("error");
  }
  let K = jsxProd_default_2(Byline, {
    children: [
      step === "confirm"
        ? jsxProd_default(KeyboardShortcutHint, {
            chord: ["left", "right"],
            action: "change",
          })
        : null,
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "continue",
      }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
      }),
    ],
  });
  if (step === "existing")
    return jsxProd_default(Dialog, {
      title: "You already have auto-mode entries \u2014 add to them, or start fresh?",
      onCancel: I,
      inputGuide: K,
      children: jsxProd_default(ModelSelector, {
        options: [
          {
            value: "append",
            label: "Add to them (keeps your existing entries)",
          },
          {
            value: "replace",
            label: "Start fresh (replaces the environment section)",
          },
          {
            value: "cancel",
            label: "Cancel",
          },
        ],
        onChange: (h) => {
          if (!T("existing")) return;
          if (h === "cancel") {
            I();
            return;
          }
          state.mode = h;
          F("confirm");
        },
        onCancel: I,
      }),
    });
  if (step === "confirm")
    return jsxProd_default(AutoModeSetupIntroDialog, {
      persisted: state,
      cancel: I,
      footer: K,
      isFreshKeypress: O,
      onContinue: (h) => {
        if (!T("confirm")) return;
        let included = h.includes("shell");
        let included_2 = h.includes("repos");
        let B = {
          posture: state.posture,
          scope: "project",
          depth: included && included_2 ? "both" : included ? "shell" : included_2 ? "repos" : "here",
        };
        logEvent("tengu_auto_mode_setup_wizard_answers", {
          posture: fromEnum(B.posture),
          scope: fromEnum(B.scope),
          depth: fromEnum(B.depth),
        });
        state.gathersFromGitHubOrg = pregatherOptionsFromAnswer(B).allProjects;
        if (onBackgroundStart) {
          state.resolution = "done";
          onBackgroundStart(B);
          onDone(
            `Gathering data and drafting your auto-mode setup; back soon${state.gathersFromGitHubOrg ? " (also scanning your GitHub org \u2014 stoppable from the background tasks list)" : ""}`,
          );
          return;
        }
        F("propose");
        propose(B).then(
          (D) => {
            if (D.ok) {
              state.proposal = D.proposal;
              F("review");
            } else if (D.code === "aborted") I();
            else {
              state.error = D.reason;
              F("error");
            }
          },
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            F("error");
          },
        );
      },
    });
  if (step === "propose")
    return jsxProd_default(WorkerBadgeWithEscape, {
      message: state.gathersFromGitHubOrg
        ? "Scanning your repo, recent sessions, and your GitHub org\u2026"
        : "Scanning your repo and recent sessions\u2026",
      subtitle: "then drafting a proposal \u2014 this can take a moment (Esc to cancel)",
      onEscape: abort,
    });
  if (step === "review" && state.proposal) {
    let proposal = state.proposal;
    return jsxProd_default(AutoModeSetupReview, {
      hideIndexes: true,
      proposal,
      onCancel: I,
      onDecline: () => {
        if (!T("review")) return;
        state.resolution = "done";
        logEvent("tengu_auto_mode_setup_wizard_resolved", {
          choice: fromEnum("decline"),
        });
        onDone("Discarded \u2014 nothing was saved. Re-run /auto-mode-setup anytime.");
      },
      onAccept: () => {
        if (!T("review")) return;
        F("write");
        write(proposal, state.mode).then(
          (A) => {
            state.saved = A;
            if (proposal.remove_from_permissions_allow.length > 0) F("flagged");
            else
              W(A, {
                removed: 0,
                skipped: 0,
              });
          },
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            F("error");
          },
        );
      },
    });
  }
  if (step === "write")
    return jsxProd_default(WorkerBadge, {
      message: "Saving\u2026",
    });
  if (step === "flagged" && state.proposal && state.saved) {
    let saved = state.saved;
    return jsxProd_default(AutoModeSetupFlaggedPicker, {
      hideIndexes: true,
      flagged: state.proposal.remove_from_permissions_allow,
      initialPicking: state.flaggedPicking,
      onPickingChange: (flaggedPicking) => {
        if (!T("flagged")) return false;
        state.flaggedPicking = flaggedPicking;
        return true;
      },
      initialSelection: state.flaggedSelection,
      onSelectionChange: (flaggedSelection) => {
        state.flaggedSelection = flaggedSelection;
      },
      onCancel: () => {
        if (!O()) return;
        W(saved, {
          removed: 0,
          skipped: 0,
        });
      },
      onResolve: (A) => {
        if (!T("flagged")) return;
        if (A.length === 0) {
          W(saved, {
            removed: 0,
            skipped: 0,
          });
          return;
        }
        F("write");
        writeRemoval(A).then(
          (E) =>
            W(saved, {
              removed: E.permissionsAllowRemoved.length,
              skipped: E.permissionsAllowSkipped ? A.length : 0,
              notFound: E.permissionsAllowNotFound.length,
            }),
          (error) => {
            state.error = error instanceof Error ? error.message : String(error);
            F("error");
          },
        );
      },
    });
  }
  return jsxProd_default(Dialog, {
    title: "Auto-mode setup",
    onCancel: G,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Box, {
          children: [
            jsxProd_default(StatusIcon, {
              status: "error",
            }),
            jsxProd_default_2(Text, {
              children: [" ", state.error ?? "Something went wrong."],
            }),
          ],
        }),
        jsxProd_default(ModelSelector, {
          options: [
            {
              value: "close",
              label: "Close",
            },
          ],
          onChange: G,
          onCancel: G,
        }),
      ],
    }),
  });
}
//@ chunk-m8444q1d.js:21975-22144 placement
function AutoModeSetupIntroDialog(o) {
  let i = w(4);
  if (useIsScreenReaderEnabled()) {
    let u;
    if (i[0] !== o) {
      u = jsxProd_default(ScreenReaderIntroDialog, {
        ...o,
      });
      i[0] = o;
      i[1] = u;
    } else u = i[1];
    return u;
  }
  let u;
  if (i[2] !== o) {
    u = jsxProd_default(AutoModeSetupConfirmDialog, {
      ...o,
    });
    i[2] = o;
    i[3] = u;
  } else u = i[3];
  return u;
}
//@ chunk-m8444q1d.js:22144-23065 placement
/**
 * auto-mode-setup 的确认对话框：姿态选择 + 可选读取项开关 + 页脚，确认后继续。
 */
function AutoModeSetupConfirmDialog({ persisted, cancel, footer, onContinue, isFreshKeypress }) {
  let [, _] = y(0);
  let k = () => _((p) => p + 1);
  let run = () => {
    if (persisted.confirmFocus !== 0) return false;
    isFreshKeypress();
  };
  return jsxProd_default_2(Dialog, {
    title: AUTO_MODE_SETUP_TITLE,
    onCancel: cancel,
    inputGuide: footer,
    children: [
      jsxProd_default(Text, {
        children: AUTO_MODE_SETUP_DESCRIPTION,
      }),
      jsxProd_default(useDialogKeybindings, {
        bindings: [
          {
            action: "confirm:yes",
            run,
          },
          {
            action: "confirm:toggle",
            run,
          },
        ],
        children: jsxProd_default(merged, {
          wrap: true,
          visibleCount: 2 * (OPTIONAL_READ_OPTIONS.length + 2) + 1,
          defaultFocusIndex: persisted.confirmFocus,
          onFocus: (confirmFocus) => {
            persisted.confirmFocus = confirmFocus;
          },
          children: [
            jsxProd_default(
              merged.Field,
              {
                label: POSTURE_LABEL,
                children: jsxProd_default(merged.Select, {
                  value: persisted.posture,
                  options: POSTURE_OPTIONS,
                  onChange: (posture) => {
                    persisted.posture = posture;
                    k();
                  },
                }),
              },
              "posture",
            ),
            ...OPTIONAL_READ_OPTIONS.map((p) =>
              jsxProd_default(
                merged.Field,
                {
                  label: p.label,
                  children: jsxProd_default(merged.Toggle, {
                    value: persisted.confirmSelection.includes(p.value),
                    onChange: (v) => {
                      if (!isFreshKeypress()) return;
                      let filtered = persisted.confirmSelection.filter((O) => O !== p.value);
                      persisted.confirmSelection = v ? [...filtered, p.value] : filtered;
                      k();
                    },
                  }),
                },
                p.value,
              ),
            ),
            jsxProd_default(
              Text,
              {
                children: " ",
              },
              "gap",
            ),
            jsxProd_default(
              merged.Field,
              {
                label: "Continue",
                children: jsxProd_default(merged.Button, {
                  onPress: () => onContinue(persisted.confirmSelection),
                }),
              },
              "continue",
            ),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-m8444q1d.js:23065-23638 placement
/**
 * 屏幕阅读器模式下的向导介绍对话框：记录最近确认时间，选择姿态与读取范围后继续。
 */
function ScreenReaderIntroDialog({ persisted, cancel, onContinue }) {
  let clock = useClock();
  let [, M] = y(0);
  let _ = () => {
    persisted.lastAcceptAt = Math.max(clock.now(), persisted.lastAcceptAt ?? 0);
  };
  return jsxProd_default_2(Dialog, {
    title: AUTO_MODE_SETUP_TITLE,
    onCancel: cancel,
    children: [
      jsxProd_default(Text, {
        children: AUTO_MODE_SETUP_DESCRIPTION,
      }),
      persisted.confirmSrAtPosture
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Text, {
                children: [POSTURE_LABEL, ":"],
              }),
              jsxProd_default(Select, {
                options: POSTURE_OPTIONS,
                defaultValue: persisted.posture,
                onChange: (posture) => {
                  persisted.posture = posture;
                  persisted.confirmSrAtPosture = false;
                  _();
                  M((b) => b + 1);
                },
                onCancel: cancel,
              }),
            ],
          })
        : jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                children: "Optional reads (Claude already reads this project):",
              }),
              jsxProd_default(Select, {
                options: SCREEN_READER_READ_OPTIONS,
                defaultValue: "shell",
                onChange: (k) => {
                  let b = depthToReadScopes(k);
                  persisted.confirmSelection = b;
                  onContinue(b);
                },
                onCancel: cancel,
              }),
            ],
          }),
    ],
  });
}
//@ chunk-m8444q1d.js:23638-23878 placement
function WorkerBadgeWithEscape(props) {
  let M = w(4);
  let { message, subtitle, onEscape } = props;
  let _;
  if (M[0] === MEMO_CACHE_SENTINEL) {
    _ = {
      context: "Settings",
    };
    M[0] = _;
  } else _ = M[0];
  useKeybinding("confirm:no", onEscape, _);
  let k;
  if (M[1] !== message || M[2] !== subtitle) {
    k = jsxProd_default(WorkerBadge, {
      message,
      subtitle,
    });
    M[1] = message;
    M[2] = subtitle;
    M[3] = k;
  } else k = M[3];
  return k;
}
//@ chunk-m8444q1d.js:23878-24118 placement
function logAutoModeSetupResolved(o, t, mode) {
  logEvent("tengu_auto_mode_setup_wizard_resolved", {
    choice: fromEnum(o),
    step: fromEnum(t),
    ...(mode !== undefined && {
      mode: fromEnum(mode),
    }),
  });
  if (o === "saved") logFeatureOk("auto_mode_setup_wizard");
  else if (o === "error") logFeatureBad("auto_mode_setup_wizard", t);
  else logFeatureSad("auto_mode_setup_wizard", o);
}
//@ chunk-m8444q1d.js:24118-24145 placement
function isAutoModeSetupInFlight() {
  return getBackgroundAutoModeSetupInFlight();
}
//@ chunk-m8444q1d.js:24145-24480 placement
/**
 * 后台运行 /auto-mode-setup 扫描：设置进行中标志，出错时追加警告系统消息、记录错误与遥测，最后清除标志。
 */
async function runAutoModeSetupInBackground(o) {
  setBackgroundAutoModeSetupInFlight(true);
  try {
    await runAutoModeScanTask(o);
  } catch (error) {
    o.appendSystemMessage?.(
      createSystemMessage(
        `Auto-mode setup hit an unexpected error and stopped: ${errorMessage(error)}. Re-run /auto-mode-setup to try again.`,
        "warning",
      ),
    );
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `background auto-mode setup crashed: ${errorMessage(error)}`,
        "background auto-mode setup crashed",
      ),
    );
    logAutoModeSetupResolved("error", "background_crash");
  } finally {
    setBackgroundAutoModeSetupInFlight(false);
  }
}
//@ chunk-m8444q1d.js:24480-24626 placement
async function runAutoModeScanTask(o) {
  let { taskRegistry } = o;
  let abortController = new AbortController();
  let taskId = registerAutoModeScanTask(
    taskRegistry,
    abortController,
    pregatherOptionsFromAnswer(o.answers).allProjects,
  );
  try {
    await runAutoModeScanInBackground(o, taskId, abortController);
  } finally {
    failDreamTask(taskId, taskRegistry, "failed");
  }
}
//@ chunk-m8444q1d.js:24626-26551 placement
async function runAutoModeScanInBackground(o, taskId, abortController) {
  let {
    taskRegistry,
    requestDialog,
    appendSystemMessage,
    propose = proposeAutoModeSetup,
    write = applyAutoModeSettings,
  } = o;
  let p = await propose(
    o.answers,
    o.permissionContext,
    abortController.signal,
    undefined,
    undefined,
    o.storageV5,
    o.credentials,
  ).catch((error) => {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `background auto-mode scan rejected: ${errorMessage(error)}`,
        "background auto-mode scan rejected",
      ),
    );
    return {
      ok: false,
      code: "api_failed",
      reason:
        "The model call didn\u2019t complete. This is usually temporary \u2014 re-run /auto-mode-setup to try again.",
    };
  });
  if (!p.ok) {
    if (p.code === "aborted" || abortController.signal.aborted) {
      logAutoModeSetupResolved("cancel", "background_scan");
      return;
    }
    failDreamTask(taskId, taskRegistry, "failed");
    appendSystemMessage?.(createSystemMessage(`Auto-mode setup scan failed: ${p.reason}`, "warning"));
    logAutoModeSetupResolved("error", "background_scan");
    return;
  }
  if (abortController.signal.aborted) {
    logAutoModeSetupResolved("cancel", "background_scan");
    return;
  }
  failDreamTask(taskId, taskRegistry, "completed");
  let v = await requestDialog(
    autoModeSetupReviewDialogDef,
    {
      ...p.proposal,
      mode: o.mode,
    },
    {
      place: "under",
    },
  );
  if (v !== "accept") {
    appendSystemMessage?.(
      createSystemMessage(
        "Auto-mode proposal discarded \u2014 nothing was saved. Re-run /auto-mode-setup anytime.",
        "notice",
      ),
    );
    logAutoModeSetupResolved(v === "decline" ? "decline" : "cancel", "background_review");
    return;
  }
  let R;
  try {
    R = await write(
      {
        mode: o.mode,
        autoMode: autoModeConfigHandler(p.proposal),
      },
      o.storageV5,
    );
  } catch (error) {
    appendSystemMessage?.(
      createSystemMessage(
        `Auto-mode setup couldn\u2019t save: ${errorMessage(error)}. Re-run /auto-mode-setup to try again.`,
        "warning",
      ),
    );
    logAutoModeSetupResolved("error", "background_write");
    return;
  }
  let O = {
    removed: 0,
    skipped: 0,
    notFound: 0,
  };
  if (p.proposal.remove_from_permissions_allow.length > 0) {
    let T = await requestDialog(
      AUTO_MODE_SETUP_FLAGGED_DIALOG,
      {
        flagged: p.proposal.remove_from_permissions_allow,
        runId: taskId,
      },
      {
        place: "under",
      },
    );
    let F =
      T === "cancelled" ? [] : T.toRemove.filter((x) => p.proposal.remove_from_permissions_allow.includes(x));
    if (F.length > 0)
      try {
        let x = await write(
          {
            removeFromPermissionsAllow: F,
          },
          o.storageV5,
        );
        O = {
          removed: x.permissionsAllowRemoved.length,
          skipped: x.permissionsAllowSkipped ? F.length : 0,
          notFound: x.permissionsAllowNotFound.length,
        };
      } catch (error) {
        appendSystemMessage?.(
          createSystemMessage(
            `${savedToMessage(R, {
              removed: 0,
              skipped: 0,
            })}
Note: removing the flagged permissions.allow entries failed: ${errorMessage(error)}`,
            "warning",
          ),
        );
        logAutoModeSetupResolved("saved", "background_write", o.mode);
        return;
      }
  }
  appendSystemMessage?.(createSystemMessage(savedToMessage(R, O), "notice"));
  logAutoModeSetupResolved("saved", "background", o.mode);
}
//@ chunk-m8444q1d.js:26551-28197 placement
/**
 * /auto-mode-setup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var autoModeSetupCommand = async (onDone, context, args) => {
  if (args.trim() !== "") {
    onDone(
      "/auto-mode-setup doesn\u2019t take arguments \u2014 run it on its own to open the setup dialog. In non-interactive mode, use --propose / --apply-file.",
      {
        display: "system",
      },
    );
    return null;
  }
  if (isAutoModeSetupInFlight() || findRunningAutoModeScanTask(context.taskRegistry)) {
    onDone(
      findRunningAutoModeScanTask(context.taskRegistry)
        ? "An auto-mode setup is already in progress \u2014 the proposal review will pop up when the scan finishes. (The scan shows in the background tasks list.)"
        : "An auto-mode setup is already wrapping up \u2014 if its proposal review hasn\u2019t popped up, answer it when it does; if you just stopped the scan, it\u2019s winding down \u2014 try again in a moment.",
      {
        display: "system",
      },
    );
    return null;
  }
  let u = await checkAutoModeSetupLogin({
    credentials: context.credentials,
    storageV5: context.storageV5,
  });
  if (u !== "ok") {
    logFeatureBad("auto_mode_setup_propose", u);
    onDone(autoModeSetupLoginMessage(u), {
      display: "system",
    });
    return null;
  }
  let M = onceExport(onDone);
  let abortController = new AbortController();
  let k = initialAutoModeSetupState(hasExistingAutoModeConfig());
  let b = false;
  let requestDialog = context.requestDialog;
  return jsxProd_default(AutoModeSetupDialog, {
    state: k,
    onBackgroundStart:
      requestDialog &&
      ((answers) => {
        b = true;
        runAutoModeSetupInBackground({
          answers,
          mode: k.mode,
          permissionContext: getToolPermissionContext(context),
          taskRegistry: context.taskRegistry,
          requestDialog,
          appendSystemMessage: context.appendSystemMessage,
          storageV5: context.storageV5,
          credentials: context.credentials,
        }).catch((error) => {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `background auto-mode setup crashed: ${errorMessage(error)}`,
              "background auto-mode setup crashed",
            ),
          );
        });
      }),
    propose: (v) =>
      proposeAutoModeSetup(
        v,
        getToolPermissionContext(context),
        AbortSignal.any([context.abortController.signal, abortController.signal]),
        undefined,
        undefined,
        context.storageV5,
        context.credentials,
      ),
    abort: () => abortController.abort(),
    write: (v, mode) =>
      applyAutoModeSettings(
        {
          mode,
          autoMode: autoModeConfigHandler(v),
        },
        context.storageV5,
      ),
    writeRemoval: (removeFromPermissionsAllow) =>
      applyAutoModeSettings(
        {
          removeFromPermissionsAllow,
        },
        context.storageV5,
      ),
    onCancel: () => {
      logFeatureSad("auto_mode_setup_wizard", "cancelled");
      M(undefined, {
        display: "skip",
      });
    },
    onDone: (v) => {
      if (!b) logFeatureOk("auto_mode_setup_wizard");
      M(v, {
        display: "system",
      });
    },
  });
};
//@ chunk-m8444q1d.js:28197-28414 placement
function hasExistingAutoModeConfig() {
  let o = autoModeConfigSchema().safeParse(getSettingsForSourceForUpkeep("userSettings")?.autoMode);
  if (!o.success) return false;
  let t = o.data;
  return (
    (t.environment?.length ?? 0) > 0 ||
    (t.allow?.length ?? 0) > 0 ||
    (t.soft_deny?.length ?? 0) > 0 ||
    (t.hard_deny?.length ?? 0) > 0
  );
}
//@ chunk-4cndz99e.js:12143-13494 placement
/**
 * /auto-mode-setup 文本命令入口：解析参数（含 --request-id）后执行 propose/apply，结果以 JSON 文本返回并回显 requestId。
 */
var APPLY_TARGETS = ["user", "project"];
var APPLY_TARGET_TO_SCOPE = {
  user: "all",
  project: "project",
};
var AUTO_MODE_SETUP_USAGE = `Usage:
  /auto-mode-setup [--request-id <uuid>] --wizard posture=<personal|open-source|enterprise|mixed> scope=<all|project> depth=<both|shell|repos|here> --propose
  /auto-mode-setup [--request-id <uuid>] [--apply-target <user|project>] --expect-sha256 <64-hex> --apply-file <absolute-path>   (reads a proposal JSON from a file under the system temp dir or the Claude config dir \u2014 the caller must have shown it to the user first; --expect-sha256 is required and the apply refuses unless the file\u2019s exact bytes hash to the given sha256)

--request-id must come first when used. The token must be a UUID (canonical 8-4-4-4-12 hex-and-dash form, either case) and is echoed verbatim as "requestId" on the command's JSON result, so a host with several commands in flight can match replies to requests.

--apply-target doesn\u2019t change where the config is written \u2014 entries always land in the user settings file. It refuses a proposal whose scope answer doesn\u2019t match the save choice (user \u2194 scope=all, project \u2194 scope=project). Flags ride in the order shown; everything after --apply-file is the path.`;
var SHA256_HEX_RE = /^[0-9a-fA-F]{64}$/;
var MAX_PROPOSAL_FILE_BYTES = 1e6;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var callAutoModeSetup = async (args, context) => {
  let autoModeSetupCommandArgs = parseAutoModeSetupCommandArgs(args);
  return textResultWithRequestId(
    await runAutoModeSetup(autoModeSetupCommandArgs, context),
    autoModeSetupCommandArgs.requestId,
  );
};
//@ chunk-4cndz99e.js:13494-17408 placement
/**
 * 处理 propose/apply-file：读取提议（读拒绝、大小、哈希不符、解析失败）并写入设置（约 4 KB）。
 */
async function runAutoModeSetup(autoModeSetupCommandArgs, context) {
  if (autoModeSetupCommandArgs.mode === "usage") {
    if (autoModeSetupCommandArgs.logCode !== undefined)
      logFeatureBad("auto_mode_setup_write", autoModeSetupCommandArgs.logCode);
    return {
      ok: false,
      code: "usage",
      reason: autoModeSetupCommandArgs.message,
      usage: AUTO_MODE_SETUP_USAGE,
    };
  }
  if (autoModeSetupCommandArgs.mode === "apply-file") {
    if (autoModeSetupCommandArgs.expectedSha256 === undefined) {
      logFeatureBad("auto_mode_setup_write", "missing_hash_arg");
      return {
        ok: false,
        code: "missing_hash_arg",
        reason:
          "--expect-sha256 is required: pass the 64-character hex sha256 of the proposal file\u2019s exact bytes, before --apply-file. Every non-interactive apply is hash-bound.",
      };
    }
    if (!SHA256_HEX_RE.test(autoModeSetupCommandArgs.expectedSha256)) {
      logFeatureBad("auto_mode_setup_write", "bad_hash_arg");
      return {
        ok: false,
        code: "bad_hash_arg",
        reason:
          "--expect-sha256 must be the 64-character hex sha256 digest of the proposal file\u2019s exact bytes.",
      };
    }
  }
  let toolPermissionContext = getToolPermissionContext(context);
  if (autoModeSetupCommandArgs.mode === "propose") {
    let r = await checkAutoModeSetupLogin({
      credentials: context.credentials,
      storageV5: context.storageV5,
    });
    if (r !== "ok") {
      logFeatureBad("auto_mode_setup_propose", r);
      return {
        ok: false,
        code: r,
        reason: autoModeSetupLoginMessage(r),
      };
    }
    let d = await proposeAutoModeSetup(
      autoModeSetupCommandArgs.answers,
      toolPermissionContext,
      context.abortController.signal,
      undefined,
      undefined,
      context.storageV5,
      context.credentials,
    );
    if (!d.ok)
      return {
        ok: false,
        code: d.code,
        reason: d.reason,
      };
    return {
      ok: true,
      proposal: d.proposal,
    };
  }
  if (
    !isAbsolute(autoModeSetupCommandArgs.path) ||
    isNetworkHomePath(autoModeSetupCommandArgs.path) ||
    !(await isUnderTempOrConfigDir(autoModeSetupCommandArgs.path))
  ) {
    logFeatureBad("auto_mode_setup_write", "bad_path");
    return {
      ok: false,
      code: "bad_path",
      reason:
        "Pass an absolute path under the system temp directory or the Claude config directory \u2014 --apply-file only reads proposal files the reviewing host wrote there.",
    };
  }
  if (
    isAttachmentReadDeniedOrThrown(autoModeSetupCommandArgs.path, {
      ...toolPermissionContext,
      blockReadsOutsideWorkingDirectories: undefined,
    })
  ) {
    logFeatureBad("auto_mode_setup_write", "read_denied");
    return {
      ok: false,
      code: "read_denied",
      reason:
        "That path is covered by a permissions.deny read rule. Write the proposal somewhere the session can read.",
    };
  }
  let fileGuarded = await readFileGuarded(autoModeSetupCommandArgs.path, MAX_PROPOSAL_FILE_BYTES, {
    noFollow: true,
    requireNlink1: true,
    sniffEncoding: true,
    withBytes: true,
  });
  if (fileGuarded === null) {
    logFeatureBad("auto_mode_setup_write", "read_failed");
    return {
      ok: false,
      code: "read_failed",
      reason: "Couldn\u2019t read the proposal file. Check the path and that it is a regular file.",
    };
  }
  let content = fileGuarded.content;
  if (fileGuarded.truncated) {
    logFeatureBad("auto_mode_setup_write", "too_large");
    return {
      ok: false,
      code: "too_large",
      reason:
        "The proposal file is over the 1 MB cap \u2014 a real proposal is a few KB. Regenerate it with --propose.",
    };
  }
  let lower = autoModeSetupCommandArgs.expectedSha256.toLowerCase();
  if (createHash("sha256").update(fileGuarded.bytes).digest("hex") !== lower) {
    logFeatureBad("auto_mode_setup_write", "hash_mismatch");
    return {
      ok: false,
      code: "hash_mismatch",
      expectedSha256: lower,
      reason:
        "The proposal file\u2019s bytes do not match the reviewed digest \u2014 the file changed after it was approved. Nothing was written; regenerate the proposal, re-review, and retry.",
    };
  }
  let autoModeProposal = parseAutoModeProposal(content);
  if (!autoModeProposal.ok) {
    logFeatureBad("auto_mode_setup_write", autoModeProposal.code);
    return {
      ok: false,
      code: autoModeProposal.code,
      reason:
        autoModeProposal.code === "parse_failed"
          ? "That file doesn\u2019t contain a proposal this command can read. Regenerate it with --propose and pass that output."
          : autoModeProposal.reason.replace(
              /Re-run to try again\.?$/,
              "Regenerate the proposal with --propose.",
            ),
    };
  }
  if (autoModeSetupCommandArgs.target !== undefined) {
    let r = APPLY_TARGET_TO_SCOPE[autoModeSetupCommandArgs.target];
    if (autoModeProposal.proposal.scope !== r) {
      logFeatureBad("auto_mode_setup_write", "scope_mismatch");
      return {
        ok: false,
        code: "scope_mismatch",
        reason:
          autoModeProposal.proposal.scope === undefined
            ? `This proposal was generated before save scope was recorded, so --apply-target ${autoModeSetupCommandArgs.target} can\u2019t confirm it matches. Regenerate the proposal with --propose, answering scope=${r}.`
            : `This proposal was generated for a different save scope (${autoModeProposal.proposal.scope}) than --apply-target ${autoModeSetupCommandArgs.target} expects (${r}). Regenerate the proposal with --propose, answering scope=${r}.`,
      };
    }
  }
  try {
    return {
      ok: true,
      ...(await applyAutoModeSettings(
        {
          mode: autoModeProposal.proposal.mode,
          autoMode: {
            environment: autoModeProposal.proposal.environment,
            ...(autoModeProposal.proposal.allow.length > 0 && {
              allow: autoModeProposal.proposal.allow,
            }),
            ...(autoModeProposal.proposal.soft_deny.length > 0 && {
              soft_deny: autoModeProposal.proposal.soft_deny,
            }),
            ...(autoModeProposal.proposal.hard_deny.length > 0 && {
              hard_deny: autoModeProposal.proposal.hard_deny,
            }),
          },
          removeFromPermissionsAllow: autoModeProposal.proposal.remove_from_permissions_allow,
        },
        context.storageV5,
      )),
      ...(autoModeSetupCommandArgs.target !== undefined && {
        target: autoModeSetupCommandArgs.target,
      }),
      ...(autoModeProposal.droppedUnsafeAllowCount > 0 && {
        droppedUnsafeAllowCount: autoModeProposal.droppedUnsafeAllowCount,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof AutoModeSetupWriteError ? error.code : "write_failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
//@ chunk-4cndz99e.js:17408-17600 placement
/**
 * 判断路径（含 realpath）是否位于系统临时目录或 Claude 配置目录之下，用于限制 --apply-file 可读取的提议文件位置。
 */
async function isUnderTempOrConfigDir(path) {
  let t = resolve(path);
  let a = new Set();
  for (let o of [tmpdir(), getClaudeConfigDir()]) {
    a.add(resolve(o));
    try {
      a.add(await realpath(o));
    } catch {}
  }
  for (let o of a) {
    let i = relative(o, t);
    if (i !== "" && !i.startsWith("..") && !isAbsolute(i)) return true;
  }
  return false;
}
//@ chunk-4cndz99e.js:17600-18021 placement
function parseRequestIdArg(e) {
  let match = e.match(/^--request-id(?:=|\s+(?!--))(\S+)\s*/);
  if (!match) {
    if (/^--request-id=?(?=\s|$)/.test(e))
      return {
        ok: false,
        message: `--request-id needs a value.
${AUTO_MODE_SETUP_USAGE}`,
      };
    return {
      ok: true,
      rest: e,
    };
  }
  let a = match[1];
  if (!UUID_RE.test(a))
    return {
      ok: false,
      message: `--request-id must be a UUID in canonical 8-4-4-4-12 hex-and-dash form (either case) \u2014 the token is refused, not echoed.
${AUTO_MODE_SETUP_USAGE}`,
    };
  return {
    ok: true,
    rest: e.slice(match[0].length),
    requestId: a,
  };
}
//@ chunk-4cndz99e.js:18021-18203 placement
function parseAutoModeSetupCommandArgs(e) {
  let requestIdArg = parseRequestIdArg(e.trim());
  if (!requestIdArg.ok)
    return {
      mode: "usage",
      message: requestIdArg.message,
      logCode: "bad_flag_grammar",
    };
  let autoModeSetupArgs = parseAutoModeSetupArgs(requestIdArg.rest);
  return requestIdArg.requestId === undefined
    ? autoModeSetupArgs
    : {
        ...autoModeSetupArgs,
        requestId: requestIdArg.requestId,
      };
}
//@ chunk-4cndz99e.js:18203-21448 placement
/**
 * 解析 /auto-mode-setup 参数（--request-id、--expect-sha256、--propose 等）。
 */
function parseAutoModeSetupArgs(e) {
  let trimmed = e.trim();
  if (trimmed === "" || trimmed === "--help" || trimmed === "-h")
    return {
      mode: "usage",
      message: AUTO_MODE_SETUP_USAGE,
    };
  if (/^--request-id(?:=|\s|$)/.test(trimmed))
    return {
      mode: "usage",
      message:
        `--request-id was given more than once \u2014 pass exactly one, as the first flag.
` + AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  let a;
  let o = trimmed;
  let match = o.match(/^--apply-target(?:[= ]\s*(\S+))?(?:\s+|$)/);
  if (match) {
    a = findInList(match[1], APPLY_TARGETS);
    if (!a)
      return {
        mode: "usage",
        message: `--apply-target must be "user" or "project".
${AUTO_MODE_SETUP_USAGE}`,
        logCode: "bad_flag_grammar",
      };
    o = o.slice(match[0].length);
    if (/^--apply-target(?:[= ]|\s|$)/.test(o))
      return {
        mode: "usage",
        message:
          `--apply-target was given more than once \u2014 pass exactly one.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    if (/^--request-id(?:=|\s|$)/.test(o))
      return {
        mode: "usage",
        message:
          `--request-id must come first, before --apply-target and --expect-sha256.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    if (!/^(?:--expect-sha256|--apply-file)(?:\s|$)/.test(o))
      return {
        mode: "usage",
        message: `--apply-target only applies to --apply-file.
${AUTO_MODE_SETUP_USAGE}`,
        logCode: "bad_flag_grammar",
      };
  }
  let l;
  if (/^--expect-sha256=/.test(o))
    return {
      mode: "usage",
      message:
        "--expect-sha256 takes its value space-separated, not with `=`: --expect-sha256 <64-hex> --apply-file <path>.\n" +
        AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  if (/^--expect-sha256(?:\s|$)/.test(o)) {
    let match = o.match(/^--expect-sha256\s+(\S+)\s*(.*)$/s);
    let p = match?.[1];
    if (p === undefined || p.startsWith("--"))
      return {
        mode: "usage",
        message:
          `--expect-sha256 needs the 64-character hex sha256 of the proposal file\u2019s exact bytes.
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
    l = p;
    o = match[2];
    if (!/^--apply-file(?:\s|$)/.test(o))
      return {
        mode: "usage",
        message:
          `--expect-sha256 applies only to --apply-file and must come directly before it (--apply-target goes before --expect-sha256).
` + AUTO_MODE_SETUP_USAGE,
        logCode: "bad_flag_grammar",
      };
  }
  if (/^--apply-file(?:\s|$)/.test(o)) {
    let match = o.match(/^--apply-file\s+(.+)$/s);
    if (match) {
      let trimmed = match[1].trim();
      if (/(?:^|\s)--expect-sha256(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--expect-sha256 must come before --apply-file, not after it.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      if (/(?:^|\s)--request-id(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--request-id must come first, before --expect-sha256 and --apply-file \u2014 not after --apply-file.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      if (/(?:^|\s)--apply-target(?:=|\s|$)/.test(trimmed))
        return {
          mode: "usage",
          message:
            `--apply-target must come before --expect-sha256 and --apply-file \u2014 not after --apply-file.
` + AUTO_MODE_SETUP_USAGE,
          logCode: "bad_flag_grammar",
        };
      return {
        mode: "apply-file",
        path: stripMatchingQuotes(trimmed),
        ...(a !== undefined && {
          target: a,
        }),
        ...(l !== undefined && {
          expectedSha256: l,
        }),
      };
    }
    return {
      mode: "usage",
      message:
        `--apply-file needs a path to the reviewed proposal JSON.
` + AUTO_MODE_SETUP_USAGE,
      logCode: "bad_flag_grammar",
    };
  }
  let match_2 = o.match(/^--wizard posture=(\S+) scope=(\S+) depth=(\S+)\s+--propose$/);
  if (!match_2) {
    if (/--apply\b/.test(o))
      return {
        mode: "usage",
        message:
          "One-shot --apply isn\u2019t available (it would write model output with no review). Use --propose, show the result to the user, then --apply-file <path>.",
      };
    return {
      mode: "usage",
      message: `Couldn\u2019t parse arguments.
${AUTO_MODE_SETUP_USAGE}`,
    };
  }
  let inList = findInList(match_2[1], ["personal", "open-source", "enterprise", "mixed"]);
  let inList_2 = findInList(match_2[2], ["all", "project"]);
  let inList_3 = findInList(match_2[3], ["both", "shell", "repos", "here"]);
  if (!inList || !inList_2 || !inList_3)
    return {
      mode: "usage",
      message: `Couldn\u2019t parse arguments.
${AUTO_MODE_SETUP_USAGE}`,
    };
  return {
    mode: "propose",
    answers: {
      posture: inList,
      scope: inList_2,
      depth: inList_3,
    },
  };
}
//@ chunk-4cndz99e.js:21448-21556 placement
function stripMatchingQuotes(e) {
  return (e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))
    ? e.slice(1, -1)
    : e;
}
//@ chunk-4cndz99e.js:21556-21598 placement
function findInList(e, t) {
  return t.find((a) => a === e);
}
//@ chunk-4cndz99e.js:21598-21690 placement
function textResultWithRequestId(e, requestId) {
  let a =
    requestId === undefined
      ? e
      : {
          ...e,
          requestId,
        };
  return {
    type: "text",
    value: jsonStringify(a, null, 2),
  };
}
