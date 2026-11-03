/**
 * _unattributed/chunk-bzr73sfg/part-001.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * kind: unattributed
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: leftover 2
 */
import {
  ITERM_FILE_PREFIX_2,
  SAVE_CURSOR_DEC,
  RESTORE_CURSOR_DEC,
  TMUX_PASSTHROUGH_MAX,
  tmuxPassthrough,
  MULTIPART_OVERHEAD,
} from "../../ink/termio/osc.js";
import { BEL as BEL_2, ESC } from "../../ink/termio/ansi.js";
import { cursorPosition } from "../../ink/termio/csi.js";

//@ chunk-bzr73sfg.js:269587-270134 leftover
/**
 * tmux 下的 iTerm2 图片：保存光标、移到 pane 内绝对位置、输出图片、恢复光标，整体透传；超过上限时改用 MultipartFile/FilePart/FileEnd 分片。
 */
function wrapItermImageForTmux(sequence, position) {
  let index = sequence.indexOf(":", ITERM_FILE_PREFIX_2.length);
  if (!(
    sequence.startsWith(ITERM_FILE_PREFIX_2) &&
    sequence.endsWith(BEL_2) &&
    sequence.indexOf(ESC, 1) === -1 &&
    sequence.indexOf(BEL_2) === sequence.length - BEL_2.length &&
    index !== -1
  ))
    throw TypeError("tmux passthrough: expected exactly one iTerm2 File= sequence ending in BEL");
  let p = cursorPosition(position.row, position.column);
  let g = SAVE_CURSOR_DEC + p + sequence + RESTORE_CURSOR_DEC;
  if (tmuxEscapedLength(g) <= TMUX_PASSTHROUGH_MAX) return tmuxPassthrough(g);
  let sliced = sequence.slice(ITERM_FILE_PREFIX_2.length, index);
  let sliced_2 = sequence.slice(index + 1, -BEL_2.length);
  let A = TMUX_PASSTHROUGH_MAX - MULTIPART_OVERHEAD;
  let D = tmuxPassthrough(`${ESC}]1337;MultipartFile=${sliced}${BEL_2}`);
  for (let O = 0; O < sliced_2.length; O += A)
    D += tmuxPassthrough(`${ESC}]1337;FilePart=${sliced_2.slice(O, O + A)}${BEL_2}`);
  return D + tmuxPassthrough(`${SAVE_CURSOR_DEC}${p}${ESC}]1337;FileEnd${BEL_2}${RESTORE_CURSOR_DEC}`);
}
//@ chunk-bzr73sfg.js:270134-270186 leftover
function tmuxEscapedLength(text) {
  return text.length + text.split(ESC).length - 1;
}
export { wrapItermImageForTmux, tmuxEscapedLength };
