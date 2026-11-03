/**
 * ink/supports-hyperlinks.ts
 *
 * 判断终端是否支持 OSC 8 超链接（npm supports-hyperlinks 加补充终端列表与 FORCE_HYPERLINK）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/supports-hyperlinks.ts
 * pieces: chunk-avfhvhz8.js (4)
 * attribution: sole-consumer 1, fingerprint 2, layout 1
 */
import { Re } from "../../runtime/bun-runtime.js";
import { supportsHyperlinksPackage } from "../../vendor/supports-color/index.js";
import { getAttacherCaps } from "../bootstrap/state.js";
import { isEnvDefinedFalsy } from "../utils/envUtils.js";

//@ chunk-avfhvhz8.js:2914-2930 sole-consumer
var supportsHyperlinksModule = Re(supportsHyperlinksPackage(), 1);
//@ chunk-avfhvhz8.js:2930-3012 fingerprint = ADDITIONAL_HYPERLINK_TERMINALS (0.918)
/**
 * supports-hyperlinks 之外额外认为支持 OSC 8 的终端名（TERM_PROGRAM / LC_TERMINAL）。
 */
var ADDITIONAL_HYPERLINK_TERMINALS = [
  "ghostty",
  "Hyper",
  "kitty",
  "alacritty",
  "iTerm.app",
  "iTerm2",
  "WarpTerminal",
];
//@ chunk-avfhvhz8.js:3012-3166 layout
/**
 * 超链接支持的显式设置：会话状态里的 hyperlinks 优先，其次 FORCE_HYPERLINK（0/假值为关）；都没有返回 undefined。
 */
function getForcedHyperlinkSetting(options) {
  let hyperlinks = getAttacherCaps()?.hyperlinks;
  if (hyperlinks !== undefined) return hyperlinks;
  let FORCE_HYPERLINK = (options?.env ?? process.env).FORCE_HYPERLINK;
  if (!FORCE_HYPERLINK) return;
  return !(isEnvDefinedFalsy(FORCE_HYPERLINK) || parseInt(FORCE_HYPERLINK, 10) === 0);
}
//@ chunk-avfhvhz8.js:3166-3701 fingerprint = supportsHyperlinks (0.444)
/**
 * 终端是否支持 OSC 8 超链接：显式设置 → supports-hyperlinks 包 → 额外终端名单 → JetBrains → Windows Terminal（不在 tmux 内）→ tmux ≥3.4 → LC_TERMINAL → TERM 含 kitty。
 */
function supportsHyperlinks(options) {
  let stdoutSupported = getForcedHyperlinkSetting(options);
  if (stdoutSupported !== undefined) return stdoutSupported;
  let env = options?.env ?? process.env;
  if (options?.stdoutSupported ?? supportsHyperlinksModule.default.supportsHyperlink(process.stdout))
    return true;
  let TERM_PROGRAM = env.TERM_PROGRAM;
  if (TERM_PROGRAM && ADDITIONAL_HYPERLINK_TERMINALS.includes(TERM_PROGRAM)) return true;
  if (env.TERMINAL_EMULATOR === "JetBrains-JediTerm") return true;
  if (env.WT_SESSION && TERM_PROGRAM !== "tmux" && !env.TMUX) return true;
  if (TERM_PROGRAM === "tmux") {
    let [a, R] = (env.TERM_PROGRAM_VERSION ?? "").split(".");
    let s = parseInt(a ?? "", 10);
    let A = parseInt(R ?? "", 10);
    if (s > 3 || (s === 3 && A >= 4)) return true;
  }
  let lcTerminal = env.LC_TERMINAL;
  if (lcTerminal && ADDITIONAL_HYPERLINK_TERMINALS.includes(lcTerminal)) return true;
  if (env.TERM?.includes("kitty")) return true;
  return false;
}
export { supportsHyperlinks, getForcedHyperlinkSetting };
