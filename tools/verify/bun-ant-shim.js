// 验证环境的补丁，不是 Claude Code 2.1.316 源码的一部分。
//
// 用途：316 的终端界面（Ink）要求 Anthropic 内部 Bun（@anthropic-ai/bun-internal）提供的
// Bun.ant.CellSegmenter（原生实现），公版 bun@1.4.4 没有，所以一切走 Ink 渲染的命令在公版 Bun 上
// 都会抛 "This runtime has no Bun.ant.CellSegmenter"。本文件用公开 API（Intl.Segmenter 的 grapheme
// 切分、Bun.stringWidth）在 JS 里实现一个行为等价的 CellSegmenter，让这些命令能在验证环境里跑起来，
// 以便对拍 original/ 与改名后的树。
//
// 用法：bun --preload tools/verify/bun-ant-shim.js <tree>/cli.js ...
//   run.mjs 的 --shim-ant（库：runCli({ shimAnt: true })）会自动加上；场景里 shimAnt: true。
//
// 只补 CellSegmenter。其余 Bun.ant.*（windowsProcessList、windowsFolderSecurity、loginTty、ttyName、
// setDumpable、memoryPressureLevel、getPeerUid/getPeerPid、windowsProcessCreationTime、posixFsAt、
// windowsSandboxDeniesArg）在 316 里调用前都有 typeof 判断或 try/catch 回退，缺了只是功能降级，不补。
// 详见 docs/process/verify.md 第 12 节。
//
// 接口（从 original 的调用方反推，见 chunk-m4dvt8pp.js 的 $7n、chunk-bzr73sfg.js 的 class pf / ps() / T1 / xg，
// chunk-e6aww6q8.js 的 jUt）：
//   new CellSegmenter({ ambiguousIsNarrow, substitute: [[lo, hi], ...], screen?: {
//       widthMask, narrow, wide, spacerTail, spacerHead, emptyCharIndex, spacerCharIndex, emptyWord, tabWidth } })
//   .graphemes / .sgrKeys / .sgrCloseKeys / .uris   只增不减的驻留表；sgrKeys[0] = ''、uris[0] = '' 表示"无"
//   .segment(text, cells: Int32Array, runs: Int32Array, reorder: boolean) -> count；缓冲不够时返回 -所需格数
//       cells[2i]   = graphemes 下标
//       cells[2i+1] = 宽度(低 8 位) | 制表符标志(256) | 样式段号 << 10
//       runs[2p]    = sgrKeys 下标，runs[2p+1] = uris 下标
//   .paint(screenCells, screenWidth, x, y, cells, count, _, charIndices, runWords) -> 打包数
//   .setCell(screenCells, screenWidth, x, y, charIndex, word) -> 打包数
//       打包数 = 结束列 + 改动起始列 * 2^20 + 改动结束列 * 2^36（调用方用来算 damage 和写入后的光标列）
//   屏幕格：Int32 两个一组 [charPool 下标, word]，word = styleId << 17 | hyperlink << 2 | 宽度种类
//
// 与官方原生实现可能的差异（无法对照原生代码，只能按调用方约定和 2.1.88 的 JS 版 writeLineToScreen 推断）：
//   1. 不做双向文本重排：reorder=true（只在 WT_SESSION 或 TERM_PROGRAM=vscode 时）按逻辑顺序输出。
//   2. 字符宽度用 Bun.stringWidth（ambiguousIsNarrow 按参数），不是原生的宽度表；宽度 0 的字素丢弃，>2 按 2。
//   3. 制表符展开成空格时用空样式（与 2.1.88 的 JS 实现一致），原生可能沿用所在样式段。
//   4. 不认识的转义序列（非 SGR、非 OSC 8）按 2.1.88 的规则跳过；C0/C1 控制字符（除 \t）丢弃。
//   5. 宽字符写到最后一列放不下时，写一个 spacerHead 空格并丢掉该字符（2.1.88 的行为）。
'use strict';

(function install() {
  if (typeof Bun === 'undefined') return;
  if (Bun.ant && typeof Bun.ant.CellSegmenter === 'function') return; // 内部版 Bun：不覆盖
  if (!Bun.ant) Bun.ant = {};

  const OSC8 = '\x1b]8;;';
  const BEL = '\x07';
  // ansi-styles 的开/关码表（与 316 内置的 ansi-tokenize 同源：chunk-m4dvt8pp.js）
  const PAIRS = [[0, 0], [1, 22], [2, 22], [3, 23], [4, 24], [53, 55], [7, 27], [8, 28], [9, 29],
    ...[30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97].map((c) => [c, 39]),
    ...[40, 41, 42, 43, 44, 45, 46, 47, 100, 101, 102, 103, 104, 105, 106, 107].map((c) => [c, 49])];
  const OPEN_TO_CLOSE = new Map(PAIRS.map(([o, c]) => [o, c]));
  const sgr = (n) => `\x1b[${n}m`;
  const CLOSE_CODES = new Set(PAIRS.map(([, c]) => sgr(c)));
  const RESET = sgr(0);
  function endCodeOf(code) {
    if (CLOSE_CODES.has(code)) return code;
    const body = code.slice(2);
    if (body.startsWith('38')) return sgr(39);
    if (body.startsWith('48')) return sgr(49);
    const close = OPEN_TO_CLOSE.get(parseInt(body, 10));
    return close !== undefined ? sgr(close) : RESET;
  }
  // "\x1b[1;38;5;9m" -> ["\x1b[1m", "\x1b[38;5;9m"]
  function splitSgr(seq) {
    if (!seq.includes(';')) return [seq];
    const parts = seq.slice(2, -1).split(';');
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if ((p === '38' || p === '48') && i + 2 < parts.length && parts[i + 1] === '5') { out.push(parts.slice(i, i + 3).join(';')); i += 2; continue; }
      if ((p === '38' || p === '48') && i + 4 < parts.length && parts[i + 1] === '2') { out.push(parts.slice(i, i + 5).join(';')); i += 4; continue; }
      out.push(p);
    }
    return out.map((p) => `\x1b[${p}m`);
  }
  // 活动样式集合的更新规则（ansi-tokenize 的 reduceAnsiCodes）
  function applyCode(active, code) {
    if (code === RESET) return [];
    if (CLOSE_CODES.has(code)) return active.filter((a) => a.endCode !== code);
    const tok = { code, endCode: endCodeOf(code) };
    if (code === sgr(1) || code === sgr(2)) {
      return active.some((a) => a.code === code) ? active : [...active, tok];
    }
    return [...active.filter((a) => a.endCode !== tok.endCode), tok];
  }

  const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  class CellSegmenter {
    constructor(opts = {}) {
      this.ambiguousIsNarrow = !!opts.ambiguousIsNarrow;
      this.substitute = (opts.substitute || []).map(([a, b]) => [a, b]);
      this.screen = opts.screen;
      this.graphemes = [];
      this.sgrKeys = [''];
      this.sgrCloseKeys = [''];
      this.uris = [''];
      this._g = new Map();
      this._s = new Map([['', 0]]);
      this._u = new Map([['', 0]]);
    }

    _internGrapheme(g) {
      let i = this._g.get(g);
      if (i === undefined) { i = this.graphemes.length; this.graphemes.push(g); this._g.set(g, i); }
      return i;
    }
    _internStyle(active) {
      const key = active.map((a) => a.code).join('\0');
      let i = this._s.get(key);
      if (i === undefined) {
        i = this.sgrKeys.length;
        this.sgrKeys.push(key);
        this.sgrCloseKeys.push(active.map((a) => a.endCode).join('\0'));
        this._s.set(key, i);
      }
      return i;
    }
    _internUri(u) {
      let i = this._u.get(u);
      if (i === undefined) { i = this.uris.length; this.uris.push(u); this._u.set(u, i); }
      return i;
    }
    _substituted(cp) {
      for (const [a, b] of this.substitute) if (cp >= a && cp <= b) return true;
      return false;
    }
    _cleanGrapheme(g) {
      let out = '';
      for (const ch of g) {
        const cp = ch.codePointAt(0);
        if (cp === 9) { out += ch; continue; }
        if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) continue; // C0 / DEL / C1
        if (this._substituted(cp)) continue;
        out += ch;
      }
      return out;
    }
    _width(g) {
      if (g === '\t') return 0;
      const w = Bun.stringWidth(g, { ambiguousIsNarrow: this.ambiguousIsNarrow });
      return w > 2 ? 2 : w;
    }

    // 把文本切成 [{text}|{sgr}|{link}] 片段
    _tokens(text) {
      const toks = [];
      let plain = '';
      const flush = () => { if (plain) { toks.push({ text: plain }); plain = ''; } };
      for (let i = 0; i < text.length;) {
        const c = text.charCodeAt(i);
        if (c === 0x1b || c === 0x9b) {
          const next = c === 0x9b ? '[' : text[i + 1];
          const start = c === 0x9b ? i + 1 : i + 2;
          if (next === ']' && text.startsWith(OSC8, i)) {
            const end = text.indexOf(BEL, i + OSC8.length);
            if (end !== -1) { flush(); toks.push({ link: text.slice(i + OSC8.length, end) }); i = end + 1; continue; }
          }
          if (next === '[') {
            let j = start;
            while (j < text.length && /[0-9;]/.test(text[j])) j++;
            if (text[j] === 'm') { flush(); for (const code of splitSgr('\x1b[' + text.slice(start, j) + 'm')) toks.push({ sgr: code }); i = j + 1; continue; }
            // 其他 CSI：跳到终止字节 0x40-0x7e
            j = start;
            while (j < text.length) { const k = text.charCodeAt(j); j++; if (k >= 0x40 && k <= 0x7e) break; }
            i = j; continue;
          }
          if (c === 0x1b && (next === '(' || next === ')' || next === '*' || next === '+')) { i += 3; continue; }
          if (c === 0x1b && (next === ']' || next === 'P' || next === '_' || next === '^' || next === 'X')) {
            let j = i + 2;
            while (j < text.length) {
              if (text[j] === BEL) { j++; break; }
              if (text[j] === '\x1b' && text[j + 1] === '\\') { j += 2; break; }
              j++;
            }
            i = j; continue;
          }
          if (c === 0x1b && next !== undefined) { const k = next.charCodeAt(0); if (k >= 0x30 && k <= 0x7e) { i += 2; continue; } }
          i++; continue; // 孤立的 ESC
        }
        plain += text[i];
        i++;
      }
      flush();
      return toks;
    }

    segment(text, cells, runs, _reorder) {
      const outCells = [];
      const outRuns = [];
      let active = [];
      let link = '';
      let styleIdx = 0, uriIdx = 0, styleDirty = false;
      let curRun = -1, curStyle = -1, curUri = -1;
      for (const t of this._tokens(String(text))) {
        if (t.sgr !== undefined) { active = applyCode(active, t.sgr); styleDirty = true; continue; }
        if (t.link !== undefined) { link = t.link; uriIdx = this._internUri(link); continue; }
        for (const { segment } of graphemeSegmenter.segment(t.text)) {
          const g = this._cleanGrapheme(segment);
          if (!g) continue;
          // 一个字素里混进了 \t（极少见）：拆开处理
          const pieces = g.includes('\t') && g !== '\t' ? g.split(/(\t)/).filter(Boolean) : [g];
          for (const piece of pieces) {
            const isTab = piece === '\t';
            const w = this._width(piece);
            if (!isTab && w === 0) continue;
            if (styleDirty) { styleIdx = this._internStyle(active.filter((a) => /^\x1b\[[0-9;]*m$/.test(a.code))); styleDirty = false; }
            if (styleIdx !== curStyle || uriIdx !== curUri) {
              curRun++; curStyle = styleIdx; curUri = uriIdx;
              outRuns.push(styleIdx, uriIdx);
            }
            outCells.push(this._internGrapheme(piece), (isTab ? 256 : w) | (curRun << 10));
          }
        }
      }
      const count = outCells.length >> 1;
      if (outCells.length > cells.length || outRuns.length > runs.length) return -Math.max(count, outRuns.length >> 1, 1);
      for (let i = 0; i < outCells.length; i++) cells[i] = outCells[i];
      for (let i = 0; i < outRuns.length; i++) runs[i] = outRuns[i];
      return count;
    }

    // 2.1.88 setCellAt 的规则：覆盖宽字符 / spacerTail 时清掉孤儿格，写宽字符时在右边放 spacerTail
    _put(sc, sw, x, y, ch, word, dmg) {
      if (x < 0 || x >= sw || y < 0) return;
      const S = this.screen;
      const mask = S.widthMask;
      const ci = (y * sw + x) << 1;
      if (ci + 1 >= sc.length) return;
      const kind = word & mask;
      const empty = S.emptyWord | S.narrow;
      const prev = sc[ci + 1] & mask;
      if (prev === S.wide && kind !== S.wide && x + 1 < sw && (sc[ci + 3] & mask) === S.spacerTail) {
        sc[ci + 2] = S.emptyCharIndex; sc[ci + 3] = empty; dmg.mark(x + 1);
      }
      if (prev === S.spacerTail && kind !== S.spacerTail && x > 0 && (sc[ci - 1] & mask) === S.wide) {
        sc[ci - 2] = S.emptyCharIndex; sc[ci - 1] = empty; dmg.mark(x - 1);
      }
      sc[ci] = ch; sc[ci + 1] = word; dmg.mark(x);
      if (kind === S.wide && x + 1 < sw) {
        const si = ci + 2;
        if ((sc[si + 1] & mask) === S.wide && x + 2 < sw && (sc[si + 3] & mask) === S.spacerTail) {
          sc[si + 2] = S.emptyCharIndex; sc[si + 3] = empty; dmg.mark(x + 2);
        }
        sc[si] = S.spacerCharIndex; sc[si + 1] = S.emptyWord | S.spacerTail; dmg.mark(x + 1);
      }
    }

    static _damage() {
      return { lo: Infinity, hi: -Infinity, mark(c) { if (c < this.lo) this.lo = c; if (c + 1 > this.hi) this.hi = c + 1; } };
    }
    static _pack(endX, d) {
      const lo = d.lo === Infinity ? 0 : d.lo, hi = d.hi === -Infinity ? 0 : d.hi;
      return Math.max(0, endX) + lo * 1048576 + hi * 68719476736;
    }

    paint(sc, sw, x, y, cells, count, _unused, charIndices, words) {
      const S = this.screen;
      if (!S) throw new Error('CellSegmenter.paint needs the screen option');
      const d = CellSegmenter._damage();
      let col = x;
      for (let i = 0; i < count; i++) {
        const gi = cells[2 * i], meta = cells[2 * i + 1];
        const run = meta >>> 10;
        if (meta & 256) { // 制表符：空格补到下一个制表位
          const n = S.tabWidth - (((col % S.tabWidth) + S.tabWidth) % S.tabWidth);
          for (let k = 0; k < n; k++) { if (col >= sw) break; this._put(sc, sw, col, y, S.emptyCharIndex, S.emptyWord | S.narrow, d); col++; }
          continue;
        }
        const w = meta & 255;
        if (w >= 2 && col + 2 > sw) {
          if (col < sw) this._put(sc, sw, col, y, S.emptyCharIndex, S.emptyWord | S.spacerHead, d);
          col++;
          continue;
        }
        const word = (words[run] ?? S.emptyWord) | (w >= 2 ? S.wide : S.narrow);
        this._put(sc, sw, col, y, charIndices[gi], word, d);
        col += w >= 2 ? 2 : 1;
      }
      return CellSegmenter._pack(col, d);
    }

    setCell(sc, sw, x, y, ch, word) {
      const d = CellSegmenter._damage();
      this._put(sc, sw, x, y, ch, word, d);
      const S = this.screen;
      const wide = S && (word & S.widthMask) === S.wide;
      return CellSegmenter._pack(x + (wide ? 2 : 1), d);
    }
  }

  Bun.ant.CellSegmenter = CellSegmenter;
  Bun.ant.__verifyShim = 'tools/verify/bun-ant-shim.js';
})();
