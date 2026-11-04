/**
 * commands/passes/GuestPassesContent.tsx
 *
 * 2.1.316 新增：访客通行证对话框：读取资格与兑换记录后展示每张通行证的状态、推荐链接与奖励。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aa3cndeh.js (9)
 * attribution: placement 9
 */
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Passes } from "../../components/Passes/Passes.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { setClipboard } from "../../ink/termio/osc.js";
import { logEvent } from "../../services/analytics/index.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { count } from "../../utils/collections.js";
import {
  formatMinorUnits,
  getCachedOrFetchPassesEligibility,
  fetchReferralRedemptions,
} from "../../services/api/referral.js";
import { Byline } from "../../components/design-system/Byline.js";
import { Pane } from "../../components/design-system/Pane.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-aa3cndeh.js:5303-5307 placement
init_react_production();
//@ chunk-aa3cndeh.js:5307-5322 placement
function noop() {}
//@ chunk-aa3cndeh.js:5322-5360 placement
function isPassAvailable(pass) {
  return pass.isAvailable;
}
//@ chunk-aa3cndeh.js:5360-5417 placement
function availableFirst(first, second) {
  return +second.isAvailable - +first.isAvailable;
}
//@ chunk-aa3cndeh.js:5417-5470 placement
function renderPass(pass) {
  return jsxProd_default(
    Passes,
    {
      pass,
    },
    pass.passNumber,
  );
}
//@ chunk-aa3cndeh.js:5470-6628 placement
/**
 * 访客通行证（guest passes）对话框组件。
 */
function GuestPassesDialog(props) {
  let $ = useMemoCache(19);
  let { onDone } = props;
  let { storageV5, credentials } = useTheme_2();
  let passes;
  if ($[0] !== credentials || $[1] !== storageV5) {
    passes = () => loadGuestPassStatus(credentials, storageV5);
    $[0] = credentials;
    $[1] = storageV5;
    $[2] = passes;
  } else passes = $[2];
  let [passesState] = useState(passes);
  let content;
  if ($[3] !== onDone) {
    content = () =>
      onDone("Guest passes dialog dismissed", {
        display: "system",
      });
    $[3] = onDone;
    $[4] = content;
  } else content = $[4];
  let globalExitKeybindings = useGlobalExitKeybindings(content);
  let body;
  if ($[5] !== onDone) {
    body = () => {
      onDone("Guest passes dialog dismissed", {
        display: "system",
      });
    };
    $[5] = onDone;
    $[6] = body;
  } else body = $[6];
  let bodyRows = body;
  let footer;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    footer = {
      context: "Confirmation",
    };
    $[7] = footer;
  } else footer = $[7];
  useKeybinding("confirm:no", bodyRows, footer);
  let statusLine;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    statusLine = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading guest pass information\u2026",
    });
    $[8] = statusLine;
  } else statusLine = $[8];
  let fallback;
  if ($[9] !== globalExitKeybindings.keyName || $[10] !== globalExitKeybindings.pending) {
    fallback = jsxProd_default(PassesPane, {
      isRedesign: false,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        tabIndex: 0,
        autoFocus: true,
        children: [
          statusLine,
          jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: globalExitKeybindings.pending
              ? jsxProd_default_2(Fragment, {
                  children: ["Press ", globalExitKeybindings.keyName, " again to exit"],
                })
              : jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                  ...stableEmptyObject(false),
                }),
          }),
        ],
      }),
    });
    $[9] = globalExitKeybindings.keyName;
    $[10] = globalExitKeybindings.pending;
    $[11] = fallback;
  } else fallback = $[11];
  let children;
  if ($[12] !== globalExitKeybindings || $[13] !== onDone || $[14] !== passesState) {
    children = jsxProd_default(GuestPassesContent, {
      passesPromise: passesState,
      onDone,
      exitState: globalExitKeybindings,
    });
    $[12] = globalExitKeybindings;
    $[13] = onDone;
    $[14] = passesState;
    $[15] = children;
  } else children = $[15];
  let hint;
  if ($[16] !== fallback || $[17] !== children) {
    hint = jsxProd_default(suspenseTypeExport, {
      fallback,
      children,
    });
    $[16] = fallback;
    $[17] = children;
    $[18] = hint;
  } else hint = $[18];
  return hint;
}
//@ chunk-aa3cndeh.js:6628-9584 placement
/**
 * 访客通行证内容：不可用时提示；否则显示剩余张数、通行证状态、推荐链接、说明与条款链接，回车复制链接。
 */
function GuestPassesContent(props) {
  let $ = useMemoCache(52);
  let { passesPromise, onDone, exitState } = props;
  let passes = use(passesPromise);
  let referralLink = passes.available ? passes.referralLink : null;
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = stableEmptyObject(false);
    $[0] = content;
  } else content = $[0];
  let contentBlock = content;
  let handleKeyDown;
  if ($[1] !== onDone || $[2] !== referralLink) {
    handleKeyDown = function handleKeyDown(event) {
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "return" && referralLink) {
        event.preventDefault();
        setClipboard(referralLink)
          .then((loaded) => {
            if (loaded) process.stdout.write(loaded);
            logEvent("tengu_guest_passes_link_copied", {});
            onDone("Referral link copied to clipboard!");
          })
          .catch(noop);
      }
    };
    $[1] = onDone;
    $[2] = referralLink;
    $[3] = handleKeyDown;
  } else handleKeyDown = $[3];
  let onKey = handleKeyDown;
  if (!passes.available) {
    let body;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      body = jsxProd_default(Text, {
        children: "Guest passes are not currently available.",
      });
      $[4] = body;
    } else body = $[4];
    let header;
    if ($[5] !== exitState.keyName || $[6] !== exitState.pending) {
      header = jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: exitState.pending
          ? jsxProd_default_2(Fragment, {
              children: ["Press ", exitState.keyName, " again to exit"],
            })
          : jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...contentBlock,
            }),
      });
      $[5] = exitState.keyName;
      $[6] = exitState.pending;
      $[7] = header;
    } else header = $[7];
    let list;
    if ($[8] !== onKey || $[9] !== header) {
      list = jsxProd_default(PassesPane, {
        isRedesign: false,
        children: jsxProd_default_2(FocusColumn, {
          gap: 1,
          onKeyDown: onKey,
          children: [body, header],
        }),
      });
      $[8] = onKey;
      $[9] = header;
      $[10] = list;
    } else list = $[10];
    return list;
  }
  let { passStatuses, referrerReward } = passes;
  let footer;
  if ($[11] !== passStatuses) {
    footer = count(passStatuses, isPassAvailable);
    $[11] = passStatuses;
    $[12] = footer;
  } else footer = $[12];
  let footerRows = footer;
  let statusLine;
  let statusBox;
  let flexDirection;
  let marginLeft;
  let children;
  let gap;
  let onKeyDown;
  let hint;
  if ($[13] !== footerRows || $[14] !== onKey || $[15] !== passStatuses) {
    let sorted = [...passStatuses].sort(availableFirst);
    let children_2 = `Guest passes \xB7 ${footerRows} left`;
    statusBox = FocusColumn;
    gap = 1;
    onKeyDown = onKey;
    if ($[24] !== children_2) {
      hint = jsxProd_default(Text, {
        color: "permission",
        children: children_2,
      });
      $[24] = children_2;
      $[25] = hint;
    } else hint = $[25];
    statusLine = Box;
    flexDirection = "row";
    marginLeft = 2;
    children = sorted.slice(0, 3).map(renderPass);
    $[13] = footerRows;
    $[14] = onKey;
    $[15] = passStatuses;
    $[16] = statusLine;
    $[17] = statusBox;
    $[18] = flexDirection;
    $[19] = marginLeft;
    $[20] = children;
    $[21] = gap;
    $[22] = onKeyDown;
    $[23] = hint;
  } else {
    statusLine = $[16];
    statusBox = $[17];
    flexDirection = $[18];
    marginLeft = $[19];
    children = $[20];
    gap = $[21];
    onKeyDown = $[22];
    hint = $[23];
  }
  let bodyBox;
  if ($[26] !== statusLine || $[27] !== flexDirection || $[28] !== marginLeft || $[29] !== children) {
    bodyBox = jsxProd_default(statusLine, {
      flexDirection,
      marginLeft,
      children,
    });
    $[26] = statusLine;
    $[27] = flexDirection;
    $[28] = marginLeft;
    $[29] = children;
    $[30] = bodyBox;
  } else bodyBox = $[30];
  let titleLine;
  if ($[31] !== referralLink) {
    titleLine =
      referralLink &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default(Text, {
          children: referralLink,
        }),
      });
    $[31] = referralLink;
    $[32] = titleLine;
  } else titleLine = $[32];
  let hintLine;
  if ($[33] !== referrerReward) {
    hintLine = referrerReward
      ? `Share a free week of Claude Code with friends. If they love it and subscribe, you'll get ${formatMinorUnits(referrerReward)} in usage credits to keep building. `
      : "Share a free week of Claude Code with friends. ";
    $[33] = referrerReward;
    $[34] = hintLine;
  } else hintLine = $[34];
  const url = referrerReward
    ? "https://support.claude.com/en/articles/13456702-claude-code-guest-passes"
    : "https://support.claude.com/en/articles/12875061-claude-code-guest-passes";
  let footerLine;
  if ($[35] !== url) {
    footerLine = jsxProd_default(Link, {
      url,
      children: "Terms apply.",
    });
    $[35] = url;
    $[36] = footerLine;
  } else footerLine = $[36];
  let termsBox;
  if ($[37] !== hintLine || $[38] !== footerLine) {
    termsBox = jsxProd_default(Box, {
      flexDirection: "column",
      marginLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [hintLine, footerLine],
      }),
    });
    $[37] = hintLine;
    $[38] = footerLine;
    $[39] = termsBox;
  } else termsBox = $[39];
  let statusRow;
  if ($[40] !== exitState.keyName || $[41] !== exitState.pending) {
    statusRow = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: exitState.pending
          ? jsxProd_default_2(Fragment, {
              children: ["Press ", exitState.keyName, " again to exit"],
            })
          : jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "enter",
                  action: "copy link",
                  ...contentBlock,
                }),
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                  ...contentBlock,
                }),
              ],
            }),
      }),
    });
    $[40] = exitState.keyName;
    $[41] = exitState.pending;
    $[42] = statusRow;
  } else statusRow = $[42];
  let details;
  if (
    $[43] !== statusBox ||
    $[44] !== bodyBox ||
    $[45] !== titleLine ||
    $[46] !== termsBox ||
    $[47] !== statusRow ||
    $[48] !== gap ||
    $[49] !== onKeyDown ||
    $[50] !== hint
  ) {
    let children = jsxProd_default_2(statusBox, {
      gap,
      onKeyDown,
      children: [hint, bodyBox, titleLine, termsBox, statusRow],
    });
    details = jsxProd_default(Pane, {
      children,
    });
    $[43] = statusBox;
    $[44] = bodyBox;
    $[45] = titleLine;
    $[46] = termsBox;
    $[47] = statusRow;
    $[48] = gap;
    $[49] = onKeyDown;
    $[50] = hint;
    $[51] = details;
  } else details = $[51];
  return details;
}
//@ chunk-aa3cndeh.js:9584-9694 placement
function PassesPane(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let content;
  if ($[0] !== children) {
    content = jsxProd_default(Pane, {
      children,
    });
    $[0] = children;
    $[1] = content;
  } else content = $[1];
  return content;
}
//@ chunk-aa3cndeh.js:10490-11146 placement
/**
 * 读取访客通行证资格与已兑换记录，生成每张通行证的可用状态、推荐链接与推荐人奖励；任何失败返回 {available:false}。
 */
async function loadGuestPassStatus(credentials, storage) {
  try {
    let cachedOrFetchPassesEligibility = await getCachedOrFetchPassesEligibility(credentials, storage);
    if (!cachedOrFetchPassesEligibility || !cachedOrFetchPassesEligibility.eligible)
      return {
        available: false,
      };
    let referralLink = cachedOrFetchPassesEligibility.referral_code_details?.referral_link ?? null;
    let referrerReward = cachedOrFetchPassesEligibility.referrer_reward;
    let campaign = cachedOrFetchPassesEligibility.referral_code_details?.campaign ?? "claude_code_guest_pass";
    let options;
    try {
      options = await fetchReferralRedemptions(campaign, credentials);
    } catch (error) {
      logForDebugging(`Failed to fetch referral redemptions: ${error}`, {
        level: "error",
      });
      return {
        available: false,
      };
    }
    let redemptions = options.redemptions || [];
    let limit = options.limit || 3;
    let results = [];
    for (let k = 0; k < limit; k++) {
      let entry = redemptions[k];
      results.push({
        passNumber: k + 1,
        isAvailable: !entry,
      });
    }
    return {
      available: true,
      passStatuses: results,
      referralLink,
      referrerReward,
    };
  } catch (error) {
    logForDebugging(
      `Failed to load guest pass eligibility: ${error instanceof Error ? (error.stack ?? error.message) : error}`,
      {
        level: "error",
      },
    );
    return {
      available: false,
    };
  }
}
export { GuestPassesDialog };
