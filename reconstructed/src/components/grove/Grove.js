/**
 * components/grove/Grove.tsx
 *
 * Grove（消费者条款/隐私政策更新）对话框：接受并选择是否允许用于模型训练，以及隐私设置对话框；混入 auto 模式推荐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/grove/Grove.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-fggt3ccb.js (7)
 * attribution: affinity 1, callgraph-witnessed 1, placement 1, fingerprint 4, facade-exports 2
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  updateGroveSettings_2,
  getGroveNoticeConfig,
  recordGroveChoiceSeen,
  calculateShouldShowGrove,
  markGroveNoticeViewed,
  updateGroveSettings,
} from "../../services/api/grove.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Dialog } from "../design-system/Dialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { useOnFirstReveal } from "../permissions/PermissionRequestTitle.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { permissionModeIndicator } from "../../utils/permissions/PermissionMode.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fggt3ccb.js:722-726 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fggt3ccb.js:722", () => {
  init_react_production();
});
//@ chunk-fggt3ccb.js:726-784 fingerprint = _temp2 (1)
function logGrovePrivacyViewed() {
  logEvent("tengu_grove_privacy_settings_viewed", {});
}
//@ chunk-fggt3ccb.js:784-1076 fingerprint = NEW_TERMS_ASCII (0.508)
var NEW_TERMS_ASCII_ART = ` _____________
 |          \\  \\
 | NEW TERMS \\__\\
 |              |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |  ----------  |
 |              |
 |______________|`;
var ACCEPT_OPT_OUT_OPTION = {
  label: "Accept terms \xB7 Help improve our AI models: OFF",
  value: "accept_opt_out",
};
//@ chunk-fggt3ccb.js:1076-2606 fingerprint = GracePeriodContentBody (0.417)
function GracePeriodContentBody() {
  let $ = useMemoCache(9);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = jsxProd_default_2(Text, {
      children: [
        "An update to our Consumer Terms and Privacy Policy will take effect on",
        " ",
        jsxProd_default(Text, {
          bold: true,
          children: "October 8, 2025",
        }),
        ". You can accept the updated terms today.",
      ],
    });
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      children: "What's changing?",
    });
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  let t3;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      children: "\xB7 ",
    });
    t3 = jsxProd_default(Text, {
      bold: true,
      children: "Help improve our AI models ",
    });
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  let t4;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Box, {
      paddingLeft: 1,
      children: jsxProd_default_2(Text, {
        children: [
          t2,
          t3,
          jsxProd_default_2(Text, {
            children: [
              "\u2014 Allow the use of your chats and coding sessions to train and improve Anthropic AI models. Change anytime in your Privacy Settings (",
              jsxProd_default(Link, {
                url: "https://claude.ai/settings/data-privacy-controls",
              }),
              ").",
            ],
          }),
        ],
      }),
    });
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        t1,
        t4,
        jsxProd_default(Box, {
          paddingLeft: 1,
          children: jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                children: "\xB7 ",
              }),
              jsxProd_default(Text, {
                bold: true,
                children: "Updates to data retention ",
              }),
              jsxProd_default(Text, {
                children:
                  "\u2014 To help us improve our AI models and safety protections, we're extending data retention to 5 years.",
              }),
            ],
          }),
        }),
      ],
    });
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t6 = jsxProd_default(Link, {
      url: "https://www.anthropic.com/news/updates-to-our-consumer-terms",
    });
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Link, {
      url: "https://anthropic.com/legal/terms",
    });
    $[7] = t7;
  } else t7 = $[7];
  let t8;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default_2(Fragment, {
      children: [
        t0,
        t5,
        jsxProd_default_2(Text, {
          children: [
            "Learn more (",
            t6,
            ") or read the updated Consumer Terms (",
            t7,
            ") and Privacy Policy (",
            jsxProd_default(Link, {
              url: "https://anthropic.com/legal/privacy",
            }),
            ")",
          ],
        }),
      ],
    });
    $[8] = t8;
  } else t8 = $[8];
  return t8;
}
//@ chunk-fggt3ccb.js:2606-3961 fingerprint = PostGracePeriodContentBody (0.462)
function PostGracePeriodContentBody() {
  let $ = useMemoCache(7);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = jsxProd_default(Text, {
      children: "We've updated our Consumer Terms and Privacy Policy.",
    });
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      children: "What's changing?",
    });
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: "Help improve our AI models",
        }),
        jsxProd_default(Text, {
          children:
            "Allow the use of your chats and coding sessions to train and improve Anthropic AI models. You can change this anytime in Privacy Settings",
        }),
        jsxProd_default(Link, {
          url: "https://claude.ai/settings/data-privacy-controls",
        }),
      ],
    });
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        t1,
        t2,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: "How this affects data retention",
            }),
            jsxProd_default(Text, {
              children:
                "Turning ON the improve Claude setting extends data retention from 30 days to 5 years. Turning it OFF keeps the default 30-day data retention. Delete data anytime.",
            }),
          ],
        }),
      ],
    });
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Link, {
      url: "https://www.anthropic.com/news/updates-to-our-consumer-terms",
    });
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Link, {
      url: "https://anthropic.com/legal/terms",
    });
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t6 = jsxProd_default_2(Fragment, {
      children: [
        t0,
        t3,
        jsxProd_default_2(Text, {
          children: [
            "Learn more (",
            t4,
            ") or read the updated Consumer Terms (",
            t5,
            ") and Privacy Policy (",
            jsxProd_default(Link, {
              url: "https://anthropic.com/legal/privacy",
            }),
            ")",
          ],
        }),
      ],
    });
    $[6] = t6;
  } else t6 = $[6];
  return t6;
}
//@ chunk-fggt3ccb.js:3961-8183 facade-exports = GroveDialog (0.687)
/**
 * 条款更新对话框：宽限期内可接受新条款、选择是否允许用于训练（accept_opt_in/opt_out），宽限期后必须选择；记录 tengu_grove_policy_*。
 */
function GroveDialog(props) {
  let $ = useMemoCache(52);
  let { showIfAlreadyViewed, location, onDone } = props;
  let [shouldShowDialog, setShouldShowDialog] = useState(null);
  let [groveConfig, setGroveConfig] = useState(null);
  let [optInFailed, setOptInFailed] = useState(false);
  let { credentials, storageV5 } = useTheme_2();
  let t1;
  let t2;
  if (
    $[0] !== credentials ||
    $[1] !== location ||
    $[2] !== onDone ||
    $[3] !== showIfAlreadyViewed ||
    $[4] !== storageV5
  ) {
    t1 = () => {
      let checkGroveSettings = async function checkGroveSettings() {
        let [settingsResult, configResult] = await Promise.all([
          updateGroveSettings_2(credentials),
          getGroveNoticeConfig(credentials),
        ]);
        if (settingsResult.success) recordGroveChoiceSeen(settingsResult.data, storageV5, credentials);
        let config = configResult.success ? configResult.data : null;
        setGroveConfig(config);
        let shouldShow = calculateShouldShowGrove(settingsResult, configResult, showIfAlreadyViewed);
        setShouldShowDialog(shouldShow);
        if (!shouldShow) {
          onDone("skip_rendering");
          return;
        }
        markGroveNoticeViewed(credentials);
        logEvent("tengu_grove_policy_viewed", {
          location: fromEnum(location),
          dismissable: config?.notice_is_grace_period,
        });
      };
      checkGroveSettings();
    };
    t2 = [showIfAlreadyViewed, location, onDone, credentials, storageV5];
    $[0] = credentials;
    $[1] = location;
    $[2] = onDone;
    $[3] = showIfAlreadyViewed;
    $[4] = storageV5;
    $[5] = t1;
    $[6] = t2;
  } else {
    t1 = $[5];
    t2 = $[6];
  }
  useEffect(t1, t2);
  if (shouldShowDialog === null) {
    return null;
  }
  if (!shouldShowDialog) {
    return null;
  }
  let t3;
  if ($[7] !== credentials || $[8] !== groveConfig?.notice_is_grace_period || $[9] !== onDone) {
    t3 = async function onChange(value) {
      ee: switch (value) {
        case "accept_opt_in": {
          let optedIn =
            (await updateGroveSettings(true, credentials, {
              onlyIfUnset: true,
            })) === false;
          logEvent("tengu_grove_policy_submitted", {
            state: !optedIn,
            dismissable: groveConfig?.notice_is_grace_period,
          });
          if (optedIn) {
            setOptInFailed(true);
            return;
          }
          break ee;
        }
        case "accept_opt_out": {
          await updateGroveSettings(false, credentials);
          logEvent("tengu_grove_policy_submitted", {
            state: false,
            dismissable: groveConfig?.notice_is_grace_period,
          });
          break ee;
        }
        case "defer": {
          logEvent("tengu_grove_policy_dismissed", {
            state: true,
          });
          break ee;
        }
        case "escape": {
          logEvent("tengu_grove_policy_escaped", {});
        }
      }
      onDone(value);
    };
    $[7] = credentials;
    $[8] = groveConfig?.notice_is_grace_period;
    $[9] = onDone;
    $[10] = t3;
  } else t3 = $[10];
  let onChange = t3;
  let t4;
  if ($[11] !== groveConfig?.domain_excluded) {
    t4 = groveConfig?.domain_excluded
      ? [
          {
            label: "Accept terms \xB7 Help improve our AI models: OFF (for emails with your domain)",
            value: "accept_opt_out",
          },
        ]
      : [
          {
            label: "Accept terms \xB7 Help improve our AI models: ON",
            value: "accept_opt_in",
          },
          ACCEPT_OPT_OUT_OPTION,
        ];
    $[11] = groveConfig?.domain_excluded;
    $[12] = t4;
  } else t4 = $[12];
  let acceptOptions = t4;
  if (groveConfig?.grove_locked_by_claude_science) {
    let lockedOptions;
    if ($[13] === MEMO_CACHE_SENTINEL) {
      lockedOptions = [ACCEPT_OPT_OUT_OPTION];
      $[13] = lockedOptions;
    } else lockedOptions = $[13];
    acceptOptions = lockedOptions;
  }
  let onCancel;
  if ($[14] !== groveConfig?.notice_is_grace_period || $[15] !== onChange) {
    onCancel = function handleCancel() {
      if (groveConfig?.notice_is_grace_period) {
        onChange("defer");
        return;
      }
      onChange("escape");
    };
    $[14] = groveConfig?.notice_is_grace_period;
    $[15] = onChange;
    $[16] = onCancel;
  } else onCancel = $[16];
  let onCancel_2 = onCancel;
  let onExit;
  if ($[17] !== onDone) {
    onExit = function onExit() {
      onDone("accept_opt_out");
    };
    $[17] = onDone;
    $[18] = onExit;
  } else onExit = $[18];
  let onExit_2 = onExit;
  if (optInFailed) {
    const exitOnCtrlCD = location !== "settings";
    let inputGuide;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "continue",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "close",
          }),
        ],
      });
      $[19] = inputGuide;
    } else inputGuide = $[19];
    let bindings;
    if ($[20] !== onExit_2) {
      bindings = [
        {
          action: "confirm:yes",
          run: onExit_2,
        },
      ];
      $[20] = onExit_2;
      $[21] = bindings;
    } else bindings = $[21];
    let children;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        children:
          "This setting wasn't turned on. It's off for your account. You can review it any time with /privacy-settings.",
      });
      $[22] = children;
    } else children = $[22];
    let children_2;
    if ($[23] !== bindings) {
      children_2 = jsxProd_default(useDialogKeybindings, {
        scope: "Confirmation",
        claimFocus: true,
        bindings,
        children,
      });
      $[23] = bindings;
      $[24] = children_2;
    } else children_2 = $[24];
    let failureDialog;
    if ($[25] !== onExit_2 || $[26] !== children_2 || $[27] !== exitOnCtrlCD) {
      failureDialog = jsxProd_default(Dialog, {
        title: "Help improve our AI models",
        color: "professionalBlue",
        onCancel: onExit_2,
        exitOnCtrlCD,
        inputGuide,
        children: children_2,
      });
      $[25] = onExit_2;
      $[26] = children_2;
      $[27] = exitOnCtrlCD;
      $[28] = failureDialog;
    } else failureDialog = $[28];
    return failureDialog;
  }
  const exitOnCtrlCD = location !== "settings";
  let inputGuide;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      ],
    });
    $[29] = inputGuide;
  } else inputGuide = $[29];
  let contentBody;
  if ($[30] !== groveConfig?.notice_is_grace_period) {
    contentBody = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
      children: groveConfig?.notice_is_grace_period
        ? jsxProd_default(GracePeriodContentBody, {})
        : jsxProd_default(PostGracePeriodContentBody, {}),
    });
    $[30] = groveConfig?.notice_is_grace_period;
    $[31] = contentBody;
  } else contentBody = $[31];
  let t7;
  if ($[32] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        color: "professionalBlue",
        children: NEW_TERMS_ASCII_ART,
      }),
    });
    $[32] = t7;
  } else t7 = $[32];
  let contentRow;
  if ($[33] !== contentBody) {
    contentRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [contentBody, t7],
    });
    $[33] = contentBody;
    $[34] = contentRow;
  } else contentRow = $[34];
  let t9;
  if ($[35] === MEMO_CACHE_SENTINEL) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: "Please select how you'd like to continue",
        }),
        jsxProd_default(Text, {
          children: "Your choice takes effect immediately upon confirmation.",
        }),
      ],
    });
    $[35] = t9;
  } else t9 = $[35];
  let t10;
  if ($[36] !== groveConfig?.notice_is_grace_period) {
    t10 = groveConfig?.notice_is_grace_period
      ? [
          {
            label: "Not now",
            value: "defer",
          },
        ]
      : [];
    $[36] = groveConfig?.notice_is_grace_period;
    $[37] = t10;
  } else t10 = $[37];
  let options;
  if ($[38] !== acceptOptions || $[39] !== t10) {
    options = [...acceptOptions, ...t10];
    $[38] = acceptOptions;
    $[39] = t10;
    $[40] = options;
  } else options = $[40];
  let onChange_2;
  if ($[41] !== onChange) {
    onChange_2 = (value) => onChange(value);
    $[41] = onChange;
    $[42] = onChange_2;
  } else onChange_2 = $[42];
  let t13;
  if ($[43] !== onCancel_2 || $[44] !== options || $[45] !== onChange_2) {
    t13 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        t9,
        jsxProd_default(ModelSelector, {
          options,
          onChange: onChange_2,
          onCancel: onCancel_2,
        }),
      ],
    });
    $[43] = onCancel_2;
    $[44] = options;
    $[45] = onChange_2;
    $[46] = t13;
  } else t13 = $[46];
  let t14;
  if ($[47] !== onCancel_2 || $[48] !== contentRow || $[49] !== t13 || $[50] !== exitOnCtrlCD) {
    t14 = jsxProd_default_2(Dialog, {
      title: "Updates to Consumer Terms and Policies",
      color: "professionalBlue",
      onCancel: onCancel_2,
      exitOnCtrlCD,
      inputGuide,
      children: [contentRow, t13],
    });
    $[47] = onCancel_2;
    $[48] = contentRow;
    $[49] = t13;
    $[50] = exitOnCtrlCD;
    $[51] = t14;
  } else t14 = $[51];
  return t14;
}
//@ chunk-fggt3ccb.js:8183-10093 facade-exports = PrivacySettingsDialog (0.431)
function PrivacySettingsDialog(props) {
  let $ = useMemoCache(27);
  let { settings, domainExcluded, lockedByClaudeScience, onDone } = props;
  let [groveEnabled, setGroveEnabled] = useState(settings.grove_enabled);
  let { credentials } = useTheme_2();
  let locked = domainExcluded || lockedByClaudeScience;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  useEffect(logGrovePrivacyViewed, t1);
  let onKeyDown;
  if ($[1] !== credentials || $[2] !== groveEnabled || $[3] !== locked) {
    onKeyDown = function onKeyDown(event) {
      if (event.ctrl || event.meta) {
        return;
      }
      if (!locked && (event.key === "tab" || event.key === "return" || event.key === " ")) {
        event.preventDefault();
        let newValue = !groveEnabled;
        setGroveEnabled(newValue);
        updateGroveSettings(newValue, credentials);
      }
    };
    $[1] = credentials;
    $[2] = groveEnabled;
    $[3] = locked;
    $[4] = onKeyDown;
  } else onKeyDown = $[4];
  let onKeyDown_2 = onKeyDown;
  let t3;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Text, {
      color: "error",
      children: "false",
    });
    $[5] = t3;
  } else t3 = $[5];
  let valueText = t3;
  if (lockedByClaudeScience) {
    let lockedValue;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      lockedValue = jsxProd_default(Text, {
        dimColor: true,
        children: "false",
      });
      $[6] = lockedValue;
    } else lockedValue = $[6];
    valueText = lockedValue;
  } else if (domainExcluded) {
    let domainValue;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      domainValue = jsxProd_default(Text, {
        color: "error",
        children: "false (for emails with your domain)",
      });
      $[7] = domainValue;
    } else domainValue = $[7];
    valueText = domainValue;
  } else if (groveEnabled) {
    let t4;
    if ($[8] === MEMO_CACHE_SENTINEL) {
      t4 = jsxProd_default(Text, {
        color: "success",
        children: "true",
      });
      $[8] = t4;
    } else t4 = $[8];
    valueText = t4;
  }
  let inputGuide;
  if ($[9] !== locked) {
    inputGuide = locked
      ? jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        })
      : jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: ["enter", "tab", "space"],
              action: "toggle",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
            }),
          ],
        });
    $[9] = locked;
    $[10] = inputGuide;
  } else inputGuide = $[10];
  let privacyLinkText;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    privacyLinkText = jsxProd_default_2(Text, {
      children: [
        "Review and manage your privacy settings at",
        " ",
        jsxProd_default(Link, {
          url: "https://claude.ai/settings/data-privacy-controls",
        }),
      ],
    });
    $[11] = privacyLinkText;
  } else privacyLinkText = $[11];
  let labelText;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    labelText = jsxProd_default(Box, {
      width: 44,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Help improve our AI models",
      }),
    });
    $[12] = labelText;
  } else labelText = $[12];
  let settingRow;
  if ($[13] !== valueText) {
    settingRow = jsxProd_default_2(Box, {
      children: [
        labelText,
        jsxProd_default(Box, {
          children: valueText,
        }),
      ],
    });
    $[13] = valueText;
    $[14] = settingRow;
  } else settingRow = $[14];
  let lockedNotice;
  if ($[15] !== lockedByClaudeScience) {
    lockedNotice =
      lockedByClaudeScience &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "Not available for this account.",
      });
    $[15] = lockedByClaudeScience;
    $[16] = lockedNotice;
  } else lockedNotice = $[16];
  let settingsColumn;
  if ($[17] !== settingRow || $[18] !== lockedNotice) {
    settingsColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [settingRow, lockedNotice],
    });
    $[17] = settingRow;
    $[18] = lockedNotice;
    $[19] = settingsColumn;
  } else settingsColumn = $[19];
  let children;
  if ($[20] !== onKeyDown_2 || $[21] !== settingsColumn) {
    children = jsxProd_default_2(FocusColumn, {
      gap: 1,
      onKeyDown: onKeyDown_2,
      children: [privacyLinkText, settingsColumn],
    });
    $[20] = onKeyDown_2;
    $[21] = settingsColumn;
    $[22] = children;
  } else children = $[22];
  let t8;
  if ($[23] !== onDone || $[24] !== children || $[25] !== inputGuide) {
    t8 = jsxProd_default(Dialog, {
      title: "Data privacy",
      color: "professionalBlue",
      onCancel: onDone,
      inputGuide,
      children,
    });
    $[23] = onDone;
    $[24] = children;
    $[25] = inputGuide;
    $[26] = t8;
  } else t8 = $[26];
  return t8;
}
//@ chunk-18hwfzwa.js:1098349-1098382 affinity
function getNudgeOpenedAtMs() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1098382-1100666 callgraph-witnessed = _temp (0.203)
/**
 * 询问是否把 auto 模式设为默认权限模式的对话框；上报 tengu_auto_default_nudge_shown，带输入防抖拒绝。
 */
function AutoModeDefaultNudgeDialog(exitState) {
  let $ = useMemoCache(32);
  let { currentMode, onDone } = exitState;
  let logImpression;
  if ($[0] !== currentMode) {
    logImpression = () => {
      logEvent("tengu_auto_default_nudge_shown", {
        current_mode: fromEnum(currentMode),
      });
    };
    $[0] = currentMode;
    $[1] = logImpression;
  } else logImpression = $[1];
  useOnFirstReveal("impression", logImpression);
  let globalExitKeybindings = useGlobalExitKeybindings();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let refusableAnswer = useRefusableAnswer(onDone);
  let inputClock = useInputClock();
  let [openedAtMs] = useState(getNudgeOpenedAtMs);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let shouldRefuse;
  if ($[2] !== inputClock || $[3] !== openedAtMs || $[4] !== noteRefused || $[5] !== refusedWithin) {
    shouldRefuse = () => {
      if (isWithinRecentInput(inputClock, openedAtMs) || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[2] = inputClock;
    $[3] = openedAtMs;
    $[4] = noteRefused;
    $[5] = refusedWithin;
    $[6] = shouldRefuse;
  } else shouldRefuse = $[6];
  let shouldRefuse_2 = shouldRefuse;
  let handleAnswer;
  if ($[7] !== shouldRefuse_2 || $[8] !== refusableAnswer) {
    handleAnswer = function handleAnswer(value) {
      if (shouldRefuse_2()) {
        refusableAnswer.refuse(value);
        return;
      }
      refusableAnswer.answer(value);
    };
    $[7] = shouldRefuse_2;
    $[8] = refusableAnswer;
    $[9] = handleAnswer;
  } else handleAnswer = $[9];
  let choose = handleAnswer;
  let emptyHintProps;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    emptyHintProps = stableEmptyObject(false);
    $[10] = emptyHintProps;
  } else emptyHintProps = $[10];
  let emptyHintProps_2 = emptyHintProps;
  let explainerBox;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    explainerBox = jsxProd_default(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children:
          "Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.",
      }),
    });
    $[11] = explainerBox;
  } else explainerBox = $[11];
  const attempts = refusableAnswer.attempts;
  const defaultFocusValue = refusableAnswer.refused ?? undefined;
  let acceptOption;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    acceptOption = {
      label: "Yes, set auto mode as my default permission mode",
      value: "accept",
    };
    $[12] = acceptOption;
  } else acceptOption = $[12];
  let modeLabel;
  if ($[13] !== currentMode) {
    modeLabel = permissionModeIndicator(currentMode);
    $[13] = currentMode;
    $[14] = modeLabel;
  } else modeLabel = $[14];
  const label = `No, keep ${modeLabel}`;
  let options;
  if ($[15] !== label) {
    options = [
      acceptOption,
      {
        label,
        value: "decline",
      },
    ];
    $[15] = label;
    $[16] = options;
  } else options = $[16];
  let onCancel;
  if ($[17] !== choose) {
    onCancel = () => choose("decline");
    $[17] = choose;
    $[18] = onCancel;
  } else onCancel = $[18];
  let selectorBox;
  if (
    $[19] !== choose ||
    $[20] !== shouldRefuse_2 ||
    $[21] !== refusableAnswer.attempts ||
    $[22] !== options ||
    $[23] !== onCancel ||
    $[24] !== defaultFocusValue
  ) {
    selectorBox = jsxProd_default(Box, {
      children: jsxProd_default(
        ModelSelector,
        {
          defaultFocusValue,
          hideIndexes: true,
          refuseInput: shouldRefuse_2,
          options,
          onChange: choose,
          onCancel,
        },
        attempts,
      ),
    });
    $[19] = choose;
    $[20] = shouldRefuse_2;
    $[21] = refusableAnswer.attempts;
    $[22] = options;
    $[23] = onCancel;
    $[24] = defaultFocusValue;
    $[25] = selectorBox;
  } else selectorBox = $[25];
  let exitHint;
  if ($[26] !== globalExitKeybindings || $[27] !== isScreenReaderEnabled) {
    exitHint =
      false &&
      (!isScreenReaderEnabled || globalExitKeybindings.pending) &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: globalExitKeybindings.pending
            ? `Press ${globalExitKeybindings.keyName} again to exit`
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "confirm",
                    ...emptyHintProps_2,
                  }),
                  jsxProd_default(ConfigurableShortcutHint, {
                    action: "select:cancel",
                    context: "Select",
                    fallback: "Esc",
                    description: "cancel",
                    ...emptyHintProps_2,
                  }),
                ],
              }),
        }),
      });
    $[26] = globalExitKeybindings;
    $[27] = isScreenReaderEnabled;
    $[28] = exitHint;
  } else exitHint = $[28];
  let dialog;
  if ($[29] !== selectorBox || $[30] !== exitHint) {
    dialog = jsxProd_default(PermissionDialog_2, {
      title: "Make auto mode your default permission mode?",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: false ? 0 : 2,
        paddingTop: 1,
        paddingBottom: false ? 0 : 1,
        children: [explainerBox, selectorBox, exitHint],
      }),
    });
    $[29] = selectorBox;
    $[30] = exitHint;
    $[31] = dialog;
  } else dialog = $[31];
  return dialog;
}
export { AutoModeDefaultNudgeDialog, PrivacySettingsDialog, GroveDialog };
