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
import { init_react_production, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Passes } from "../../components/Passes/Passes.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function isPassAvailable($e) {
  return $e.isAvailable;
}
//@ chunk-aa3cndeh.js:5360-5417 placement
function availableFirst(Ue, Ie) {
  return +Ie.isAvailable - +Ue.isAvailable;
}
//@ chunk-aa3cndeh.js:5417-5470 placement
function renderPass(fe) {
  return jsxProd_default(
    Passes,
    {
      pass: fe,
    },
    fe.passNumber,
  );
}
//@ chunk-aa3cndeh.js:5470-6628 placement
/**
 * 访客通行证（guest passes）对话框组件。
 */
function GuestPassesDialog(props) {
  let l = w(19);
  let { onDone } = props;
  let { storageV5, credentials } = useTheme_2();
  let m;
  if (l[0] !== credentials || l[1] !== storageV5) {
    m = () => loadGuestPassStatus(credentials, storageV5);
    l[0] = credentials;
    l[1] = storageV5;
    l[2] = m;
  } else m = l[2];
  let [o] = y(m);
  let h;
  if (l[3] !== onDone) {
    h = () =>
      onDone("Guest passes dialog dismissed", {
        display: "system",
      });
    l[3] = onDone;
    l[4] = h;
  } else h = l[4];
  let globalExitKeybindings = useGlobalExitKeybindings(h);
  let b;
  if (l[5] !== onDone) {
    b = () => {
      onDone("Guest passes dialog dismissed", {
        display: "system",
      });
    };
    l[5] = onDone;
    l[6] = b;
  } else b = l[6];
  let u = b;
  let v;
  if (l[7] === MEMO_CACHE_SENTINEL) {
    v = {
      context: "Confirmation",
    };
    l[7] = v;
  } else v = l[7];
  useKeybinding("confirm:no", u, v);
  let R;
  if (l[8] === MEMO_CACHE_SENTINEL) {
    R = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading guest pass information\u2026",
    });
    l[8] = R;
  } else R = l[8];
  let fallback;
  if (l[9] !== globalExitKeybindings.keyName || l[10] !== globalExitKeybindings.pending) {
    fallback = jsxProd_default(PassesPane, {
      isRedesign: false,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        tabIndex: 0,
        autoFocus: true,
        children: [
          R,
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
    l[9] = globalExitKeybindings.keyName;
    l[10] = globalExitKeybindings.pending;
    l[11] = fallback;
  } else fallback = l[11];
  let children;
  if (l[12] !== globalExitKeybindings || l[13] !== onDone || l[14] !== o) {
    children = jsxProd_default(GuestPassesContent, {
      passesPromise: o,
      onDone,
      exitState: globalExitKeybindings,
    });
    l[12] = globalExitKeybindings;
    l[13] = onDone;
    l[14] = o;
    l[15] = children;
  } else children = l[15];
  let D;
  if (l[16] !== fallback || l[17] !== children) {
    D = jsxProd_default(fo, {
      fallback,
      children,
    });
    l[16] = fallback;
    l[17] = children;
    l[18] = D;
  } else D = l[18];
  return D;
}
//@ chunk-aa3cndeh.js:6628-9584 placement
/**
 * 访客通行证内容：不可用时提示；否则显示剩余张数、通行证状态、推荐链接、说明与条款链接，回车复制链接。
 */
function GuestPassesContent(props) {
  let o = w(52);
  let { passesPromise, onDone, exitState } = props;
  let l = Qr(passesPromise);
  let referralLink = l.available ? l.referralLink : null;
  let h;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    h = stableEmptyObject(false);
    o[0] = h;
  } else h = o[0];
  let p = h;
  let b;
  if (o[1] !== onDone || o[2] !== referralLink) {
    b = function R(event) {
      if (event.ctrl || event.meta) {
        return;
      }
      if (event.key === "return" && referralLink) {
        event.preventDefault();
        setClipboard(referralLink)
          .then((v) => {
            if (v) process.stdout.write(v);
            logEvent("tengu_guest_passes_link_copied", {});
            onDone("Referral link copied to clipboard!");
          })
          .catch(noop);
      }
    };
    o[1] = onDone;
    o[2] = referralLink;
    o[3] = b;
  } else b = o[3];
  let R = b;
  if (!l.available) {
    let C;
    if (o[4] === MEMO_CACHE_SENTINEL) {
      C = jsxProd_default(Text, {
        children: "Guest passes are not currently available.",
      });
      o[4] = C;
    } else C = o[4];
    let f;
    if (o[5] !== exitState.keyName || o[6] !== exitState.pending) {
      f = jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: exitState.pending
          ? jsxProd_default_2(Fragment, {
              children: ["Press ", exitState.keyName, " again to exit"],
            })
          : jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
              ...p,
            }),
      });
      o[5] = exitState.keyName;
      o[6] = exitState.pending;
      o[7] = f;
    } else f = o[7];
    let D;
    if (o[8] !== R || o[9] !== f) {
      D = jsxProd_default(PassesPane, {
        isRedesign: false,
        children: jsxProd_default_2(FocusColumn, {
          gap: 1,
          onKeyDown: R,
          children: [C, f],
        }),
      });
      o[8] = R;
      o[9] = f;
      o[10] = D;
    } else D = o[10];
    return D;
  }
  let { passStatuses, referrerReward } = l;
  let C;
  if (o[11] !== passStatuses) {
    C = count(passStatuses, isPassAvailable);
    o[11] = passStatuses;
    o[12] = C;
  } else C = o[12];
  let te = C;
  let A;
  let G;
  let flexDirection;
  let marginLeft;
  let children;
  let gap;
  let onKeyDown;
  let _;
  if (o[13] !== te || o[14] !== R || o[15] !== passStatuses) {
    let sorted = [...passStatuses].sort(availableFirst);
    let children_2 = `Guest passes \xB7 ${te} left`;
    G = FocusColumn;
    gap = 1;
    onKeyDown = R;
    if (o[24] !== children_2) {
      _ = jsxProd_default(Text, {
        color: "permission",
        children: children_2,
      });
      o[24] = children_2;
      o[25] = _;
    } else _ = o[25];
    A = Box;
    flexDirection = "row";
    marginLeft = 2;
    children = sorted.slice(0, 3).map(renderPass);
    o[13] = te;
    o[14] = R;
    o[15] = passStatuses;
    o[16] = A;
    o[17] = G;
    o[18] = flexDirection;
    o[19] = marginLeft;
    o[20] = children;
    o[21] = gap;
    o[22] = onKeyDown;
    o[23] = _;
  } else {
    A = o[16];
    G = o[17];
    flexDirection = o[18];
    marginLeft = o[19];
    children = o[20];
    gap = o[21];
    onKeyDown = o[22];
    _ = o[23];
  }
  let I;
  if (o[26] !== A || o[27] !== flexDirection || o[28] !== marginLeft || o[29] !== children) {
    I = jsxProd_default(A, {
      flexDirection,
      marginLeft,
      children,
    });
    o[26] = A;
    o[27] = flexDirection;
    o[28] = marginLeft;
    o[29] = children;
    o[30] = I;
  } else I = o[30];
  let K;
  if (o[31] !== referralLink) {
    K =
      referralLink &&
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default(Text, {
          children: referralLink,
        }),
      });
    o[31] = referralLink;
    o[32] = K;
  } else K = o[32];
  let J;
  if (o[33] !== referrerReward) {
    J = referrerReward
      ? `Share a free week of Claude Code with friends. If they love it and subscribe, you'll get ${formatMinorUnits(referrerReward)} in usage credits to keep building. `
      : "Share a free week of Claude Code with friends. ";
    o[33] = referrerReward;
    o[34] = J;
  } else J = o[34];
  const url = referrerReward
    ? "https://support.claude.com/en/articles/13456702-claude-code-guest-passes"
    : "https://support.claude.com/en/articles/12875061-claude-code-guest-passes";
  let X;
  if (o[35] !== url) {
    X = jsxProd_default(Link, {
      url,
      children: "Terms apply.",
    });
    o[35] = url;
    o[36] = X;
  } else X = o[36];
  let z;
  if (o[37] !== J || o[38] !== X) {
    z = jsxProd_default(Box, {
      flexDirection: "column",
      marginLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [J, X],
      }),
    });
    o[37] = J;
    o[38] = X;
    o[39] = z;
  } else z = o[39];
  let M;
  if (o[40] !== exitState.keyName || o[41] !== exitState.pending) {
    M = jsxProd_default(Box, {
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
                  ...p,
                }),
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                  ...p,
                }),
              ],
            }),
      }),
    });
    o[40] = exitState.keyName;
    o[41] = exitState.pending;
    o[42] = M;
  } else M = o[42];
  let pe;
  if (
    o[43] !== G ||
    o[44] !== I ||
    o[45] !== K ||
    o[46] !== z ||
    o[47] !== M ||
    o[48] !== gap ||
    o[49] !== onKeyDown ||
    o[50] !== _
  ) {
    let children = jsxProd_default_2(G, {
      gap,
      onKeyDown,
      children: [_, I, K, z, M],
    });
    pe = jsxProd_default(Pane, {
      children,
    });
    o[43] = G;
    o[44] = I;
    o[45] = K;
    o[46] = z;
    o[47] = M;
    o[48] = gap;
    o[49] = onKeyDown;
    o[50] = _;
    o[51] = pe;
  } else pe = o[51];
  return pe;
}
//@ chunk-aa3cndeh.js:9584-9694 placement
function PassesPane(props) {
  let d = w(2);
  let { children } = props;
  let i;
  if (d[0] !== children) {
    i = jsxProd_default(Pane, {
      children,
    });
    d[0] = children;
    d[1] = i;
  } else i = d[1];
  return i;
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
    let o;
    try {
      o = await fetchReferralRedemptions(campaign, credentials);
    } catch (error) {
      logForDebugging(`Failed to fetch referral redemptions: ${error}`, {
        level: "error",
      });
      return {
        available: false,
      };
    }
    let redemptions = o.redemptions || [];
    let limit = o.limit || 3;
    let b = [];
    for (let k = 0; k < limit; k++) {
      let v = redemptions[k];
      b.push({
        passNumber: k + 1,
        isAvailable: !v,
      });
    }
    return {
      available: true,
      passStatuses: b,
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
