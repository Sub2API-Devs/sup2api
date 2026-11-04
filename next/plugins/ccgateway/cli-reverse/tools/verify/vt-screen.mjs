// 极简 VT 屏幕模拟器：把伪终端字节流还原成"最终屏幕 + 滚出去的历史行"的纯文本，用于对拍交互界面。
//
// 用法：import { renderScreen } from './vt-screen.mjs'
//   const { lines, screen, history } = renderScreen(raw, { cols: 100, rows: 30 })
//   lines = [...history, ...screen]（每行去掉行尾空格，末尾空行去掉）
// 支持：可打印字符（宽字符按 2 列）、自动换行、CR/LF/BS/TAB、CSI 光标移动（A B C D E F G H f d）、
//   擦除（J K X）、插入/删除（@ P L M）、滚动（S T、ESC D/M、LF 到底）、保存/恢复光标（ESC 7/8、CSI s/u）；
//   SGR、模式切换（h/l）、OSC、DCS 等忽略。不模拟滚动区域（DECSTBM 记录但按全屏处理）和备用屏幕切换（全部画在同一屏）。
// 只用于比较两棵树的输出是否一致，不追求与真实终端逐像素相同。
// 宽度：东亚宽字符与 \p{Emoji_Presentation}（默认按 emoji 显示的字符）算 2 列，与 Bun.stringWidth / CLI 的排版一致。
// （scenarios 成员 2026-11-04 修正：原来用 \p{Extended_Pictographic}，把 ⏸ ⚠ ✳ ⏺ ✔ ▶ ♥ 这类默认按文本显示、CLI 按 1 列
//  排版的字符也算 2 列；Ink 增量重绘用 CSI n C 跳过没变的格子，于是整行错位，例如 "⏸ manual mode on" 被还原成
//  "⏸ munual mode on"，waitFor 也找不到文字。见 docs/process/scenarios.md 第 3 节。）
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Emoji_Presentation}/u;
const ZERO = /^[\p{M}​-‏⁠-⁤︀-️]$/u;

export function renderScreen(raw, { cols = 100, rows = 30 } = {}) {
  const blank = () => Array(cols).fill(' ');
  let scr = Array.from({ length: rows }, blank);
  const history = [];
  let x = 0, y = 0, pendingWrap = false;
  let saved = { x: 0, y: 0 };
  const clampY = (v) => Math.max(0, Math.min(rows - 1, v));
  const clampX = (v) => Math.max(0, Math.min(cols - 1, v));
  const scrollUp = (n = 1) => { for (let i = 0; i < n; i++) { history.push(scr.shift().join('')); scr.push(blank()); } };
  const scrollDown = (n = 1) => { for (let i = 0; i < n; i++) { scr.pop(); scr.unshift(blank()); } };
  const lf = () => { if (y === rows - 1) scrollUp(); else y++; };
  const put = (ch) => {
    if (ZERO.test(ch)) { // 组合字符附到前一格
      const px = Math.max(0, x - 1);
      scr[y][px] += ch;
      return;
    }
    const w = WIDE.test(ch) ? 2 : 1;
    if (pendingWrap || x + w > cols) { x = 0; lf(); pendingWrap = false; }
    scr[y][x] = ch;
    if (w === 2 && x + 1 < cols) scr[y][x + 1] = '';
    x += w;
    if (x >= cols) { x = cols - 1; pendingWrap = true; }
  };
  const eraseLine = (row, from, to) => { for (let i = Math.max(0, from); i < Math.min(cols, to); i++) scr[row][i] = ' '; };

  const chars = Array.from(raw);
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const code = c.codePointAt(0);
    if (c === '\x1b') {
      const n = chars[i + 1];
      if (n === '[') {
        let j = i + 2, params = '';
        while (j < chars.length && /[0-9;?<>=:]/.test(chars[j])) params += chars[j++];
        while (j < chars.length && /[ -\/]/.test(chars[j])) j++;
        const fin = chars[j];
        i = j;
        const priv = /^[?<>=]/.test(params);
        const ps = params.replace(/^[?<>=]/, '').split(';').map((p) => (p === '' ? NaN : parseInt(p, 10)));
        const p1 = (d = 1) => (Number.isNaN(ps[0]) || ps[0] === undefined ? d : ps[0] || d);
        if (priv) continue; // DEC 私有模式
        pendingWrap = false;
        switch (fin) {
          case 'A': y = clampY(y - p1()); break;
          case 'B': y = clampY(y + p1()); break;
          case 'C': x = clampX(x + p1()); break;
          case 'D': x = clampX(x - p1()); break;
          case 'E': y = clampY(y + p1()); x = 0; break;
          case 'F': y = clampY(y - p1()); x = 0; break;
          case 'G': case '`': x = clampX(p1() - 1); break;
          case 'd': y = clampY(p1() - 1); break;
          case 'H': case 'f': y = clampY((Number.isNaN(ps[0]) ? 1 : ps[0] || 1) - 1); x = clampX((Number.isNaN(ps[1]) || ps[1] === undefined ? 1 : ps[1] || 1) - 1); break;
          case 'J': {
            const m = Number.isNaN(ps[0]) ? 0 : ps[0];
            if (m === 0) { eraseLine(y, x, cols); for (let r = y + 1; r < rows; r++) eraseLine(r, 0, cols); }
            else if (m === 1) { eraseLine(y, 0, x + 1); for (let r = 0; r < y; r++) eraseLine(r, 0, cols); }
            else { for (let r = 0; r < rows; r++) eraseLine(r, 0, cols); }
            break;
          }
          case 'K': {
            const m = Number.isNaN(ps[0]) ? 0 : ps[0];
            if (m === 0) eraseLine(y, x, cols); else if (m === 1) eraseLine(y, 0, x + 1); else eraseLine(y, 0, cols);
            break;
          }
          case 'X': eraseLine(y, x, x + p1()); break;
          case 'P': { const n2 = p1(); scr[y].splice(x, n2); while (scr[y].length < cols) scr[y].push(' '); break; }
          case '@': { const n2 = p1(); scr[y].splice(x, 0, ...Array(n2).fill(' ')); scr[y].length = cols; break; }
          case 'L': { for (let k = 0; k < p1(); k++) { scr.splice(y, 0, blank()); scr.pop(); } break; }
          case 'M': { for (let k = 0; k < p1(); k++) { scr.splice(y, 1); scr.push(blank()); } break; }
          case 'S': scrollUp(p1()); break;
          case 'T': scrollDown(p1()); break;
          case 's': saved = { x, y }; break;
          case 'u': ({ x, y } = saved); break;
          default: break; // m（SGR）、r、t、n 等忽略
        }
        continue;
      }
      if (n === ']' || n === 'P' || n === '_' || n === '^' || n === 'X') { // OSC / DCS / APC …：跳到 BEL 或 ST
        let j = i + 2;
        while (j < chars.length && chars[j] !== '\x07' && !(chars[j] === '\x1b' && chars[j + 1] === '\\')) j++;
        i = chars[j] === '\x07' ? j : j + 1;
        continue;
      }
      if (n === '(' || n === ')' || n === '*' || n === '+') { i += 2; continue; }
      if (n === '7') { saved = { x, y }; i++; continue; }
      if (n === '8') { ({ x, y } = saved); i++; continue; }
      if (n === 'D') { lf(); i++; continue; }
      if (n === 'E') { x = 0; lf(); i++; continue; }
      if (n === 'M') { if (y === 0) scrollDown(); else y--; i++; continue; }
      if (n === 'c') { scr = Array.from({ length: rows }, blank); x = y = 0; i++; continue; }
      i++; continue;
    }
    if (c === '\r') { x = 0; pendingWrap = false; continue; }
    if (c === '\n' || c === '\x0b' || c === '\x0c') { lf(); pendingWrap = false; continue; }
    if (c === '\b') { x = Math.max(0, x - 1); pendingWrap = false; continue; }
    if (c === '\t') { x = Math.min(cols - 1, (Math.floor(x / 8) + 1) * 8); continue; }
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code < 0xa0)) continue;
    put(c);
  }
  const trim = (r) => (Array.isArray(r) ? r.join('') : r).replace(/\s+$/, '');
  const screen = scr.map(trim);
  while (screen.length && screen.at(-1) === '') screen.pop();
  const hist = history.map(trim);
  return { lines: [...hist, ...screen], screen, history: hist, cursor: { x, y } };
}
