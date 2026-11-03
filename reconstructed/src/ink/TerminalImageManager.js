/**
 * ink/TerminalImageManager.ts
 *
 * 2.1.316 新增：终端图片管理器与占位格扫描：图片 id 分配、传输与删除排队、终端拒绝记录、tmux 透传、按占位格放置 iTerm2 图片。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (7)
 * attribution: placement 7
 */
import { randomInt } from "crypto";
import { decodeImagePlaceholder, MAX_ITERM_IMAGE_ID } from "./termio/iterm2Image.js";
import { ANSI_256_LIMIT, deleteKittyImage } from "./termio/kittyGraphics.js";
import { tmuxPassthroughChunked } from "./termio/osc.js";
import { wrapItermImageForTmux } from "../_unattributed/chunk-bzr73sfg/part-001.js";
import { csi } from "./termio/csi.js";

//@ chunk-bzr73sfg.js:268093-268112 placement
var placeholderDecodeCache = new WeakMap();
//@ chunk-bzr73sfg.js:268112-268251 placement
function decodePlaceholderCached(charPool, charIndex) {
  let f = placeholderDecodeCache.get(charPool);
  if (f === undefined) {
    f = new Map();
    placeholderDecodeCache.set(charPool, f);
  }
  let m = f.get(charIndex);
  if (m === undefined) {
    m = decodeImagePlaceholder(charPool.get(charIndex)) ?? null;
    f.set(charIndex, m);
  }
  return m;
}
//@ chunk-bzr73sfg.js:268251-268759 placement
/**
 * 扫描屏幕里的图片占位格，按图片 id 汇总：左上角原点、格数、最大行列、所有格下标、各格是否与同一原点一致（被裁剪/错位时不一致）。
 */
function scanImagePlaceholders(screen) {
  let images = new Map();
  let { cells, width, charPool } = screen;
  let g = width * screen.height;
  for (let idx = 0; idx < g; idx++) {
    let charIndex = cells[idx << 1];
    if (charIndex < 2) continue;
    let A = decodePlaceholderCached(charPool, charIndex);
    if (A === null) continue;
    let D = (idx % width) - A.column;
    let O = Math.floor(idx / width) - A.row;
    let _ = images.get(A.id);
    if (_ === undefined) {
      images.set(A.id, {
        originX: D,
        originY: O,
        count: 1,
        isConsistent: true,
        lastRow: A.row,
        lastColumn: A.column,
        indexes: [idx],
      });
      continue;
    }
    _.count++;
    _.indexes.push(idx);
    _.lastRow = Math.max(_.lastRow, A.row);
    _.lastColumn = Math.max(_.lastColumn, A.column);
    _.isConsistent &&= _.originX === D && _.originY === O;
  }
  return images;
}
//@ chunk-bzr73sfg.js:268759-268849 placement
function cellChangedAt(prev, next, index) {
  let m = index << 1;
  return prev.cells[m] !== next.cells[m] || prev.cells[m + 1] !== next.cells[m + 1];
}
//@ chunk-bzr73sfg.js:268849-269023 placement = diff (1)
function indexesToRuns(indexes, width) {
  let runs = [];
  for (let index of indexes) {
    let p = index % width;
    let floored = Math.floor(index / width);
    let last = runs.at(-1);
    if (last !== undefined && last.y === floored && last.x + last.length === p) last.length++;
    else
      runs.push({
        x: p,
        y: floored,
        length: 1,
      });
  }
  return runs;
}
//@ chunk-bzr73sfg.js:270186-270252 placement
var SMALL_IMAGE_IDS = 8;
var MAX_WIDE_IMAGE_ID = 16777216;
var MAX_TRANSMIT_BYTES = 3145728;
var MAX_PENDING = 8;
var MAX_ITERM_FREE = 256;
var DECSC = "\x1B7";
var DECRC = "\x1B8";
//@ chunk-bzr73sfg.js:270252-275127 placement
/**
 * 终端图片管理器（App 的 terminalImages）：为图片分配 id（kitty 小 id 池与 24 位宽 id、iTerm2 位置复用）、排队传输（kitty APC G）与删除、终端拒绝时记录（refused）、tmux 透传与 pane 位置修正、在帧之后按占位格位置放置 iTerm2 图片（placeIterm/keepIterm）、resendAll/redrawInline/requestDraw。
 */
class TerminalImageManager {
  requestFrame;
  live = new Map();
  pendingDeletes = new Set();
  pendingTransmits = new Map();
  pendingOrphans = [];
  freeSmall = new Set();
  freeIterm = new Map();
  placements = 0;
  nextWide = randomInt(ANSI_256_LIMIT, MAX_WIDE_IMAGE_ID);
  isTmuxPassthrough = false;
  isDrawHeld = false;
  constructor(requestFrame) {
    this.requestFrame = requestFrame;
  }
  allocate(n, onRefused, f = "kitty", m) {
    let p = f === "iterm" ? this.takeIterm(m) : n === SMALL_IMAGE_IDS ? this.takeSmall() : this.takeWide();
    if (p !== undefined)
      this.live.set(p, {
        isSent: false,
        resend: undefined,
        onRefused,
        protocol: f,
        box: undefined,
        isDrawn: false,
        isDirty: false,
        deferredSince: undefined,
        hasGlyphs: false,
        reuseKey: m,
      });
    return p;
  }
  transmit(
    n,
    u,
    f = {
      resend: true,
    },
  ) {
    let m = this.live.get(n);
    let p = !f.resend;
    if (m === undefined || (p && this.isBackedUp(n))) return false;
    if (m.protocol === "iterm") return this.keepIterm(n, m, u, f);
    try {
      let g = () => u(n);
      let sequence = g();
      m.isSent = true;
      m.resend = p ? undefined : g;
      this.queue(n, {
        sequence,
        isConsumed: p,
      });
    } catch {
      return false;
    }
    this.requestFrame();
    return true;
  }
  isBackedUp(n) {
    let u = this.pendingTransmits.get(n) ?? [];
    let f = 0;
    for (let m of u) if (m.isConsumed) f++;
    return f >= MAX_PENDING;
  }
  refused(n, u) {
    if (u === "OK") return;
    this.live.get(n)?.onRefused?.(u);
  }
  free(n) {
    let u = this.live.get(n);
    if (u === undefined) return;
    let { isSent, protocol, reuseKey } = u;
    this.live.delete(n);
    if (protocol === "iterm") {
      if (reuseKey !== undefined) {
        let g = this.freeIterm.get(reuseKey) ?? [];
        this.freeIterm.delete(reuseKey);
        this.freeIterm.set(reuseKey, [...g, n]);
        let [E] = this.freeIterm.keys();
        if (E !== undefined && this.freeIterm.size > MAX_ITERM_FREE) this.freeIterm.delete(E);
      }
      return;
    }
    for (let g of this.pendingTransmits.get(n) ?? []) if (g.isConsumed) this.pendingOrphans.push(g.sequence);
    this.pendingTransmits.delete(n);
    if (n < ANSI_256_LIMIT) this.freeSmall.add(n);
    if (isSent) {
      this.pendingDeletes.add(n);
      this.requestFrame();
    }
  }
  retransmitAll() {
    for (let [n, u] of this.live) {
      let { resend } = u;
      if (u.protocol === "iterm") {
        u.isDirty = true;
        continue;
      }
      if (resend !== undefined)
        this.queue(n, {
          sequence: resend(),
          isConsumed: false,
        });
    }
  }
  drain() {
    let n = this.pendingOrphans.splice(0);
    let mapped = [...this.pendingDeletes].map((pendingDelete) => deleteKittyImage(pendingDelete));
    let f = [];
    let m = 0;
    this.pendingDeletes.clear();
    for (let [p, g] of this.pendingTransmits) {
      for (let E = g[0]; E !== undefined; E = g[0]) {
        if (m > 0 && m + E.sequence.length > MAX_TRANSMIT_BYTES) {
          this.requestFrame();
          return this.forOuter([...n, ...mapped, ...f].join(""));
        }
        f.push(E.sequence);
        m += E.sequence.length;
        g.shift();
      }
      this.pendingTransmits.delete(p);
    }
    return this.forOuter([...n, ...mapped, ...f].join(""));
  }
  redrawInline() {
    if (!this.hasItermImages) return;
    for (let n of this.live.values()) if (n.protocol === "iterm") n.isDirty = true;
    this.requestFrame();
  }
  requestDraw() {
    if (this.hasItermImages) this.requestFrame();
  }
  resendAll() {
    if (this.live.size === 0) return;
    this.retransmitAll();
    this.requestFrame();
  }
  forOuter(text) {
    return this.isTmuxPassthrough && text !== "" ? tmuxPassthroughChunked(text) : text;
  }
  placeIterm(n, u, f, m, p = true) {
    this.isDrawHeld = false;
    if (!this.hasItermImages) return "";
    let g = u !== undefined && u.width === n.width ? u : undefined;
    let E = g === undefined ? 0 : g.width * g.height;
    let T = (index) => g === undefined || index >= E || cellChangedAt(n, g, index);
    let A = scanImagePlaceholders(n);
    let D = "";
    let O = 0;
    this.placements++;
    let sorted = [...this.live].sort(
      ([, U], [, L]) =>
        (U.deferredSince ?? Number.MAX_SAFE_INTEGER) - (L.deferredSince ?? Number.MAX_SAFE_INTEGER),
    );
    for (let [U, L] of sorted) {
      let { box, resend } = L;
      if (L.protocol !== "iterm" || box === undefined || !resend) continue;
      let G = A.get(U);
      if (G === undefined) {
        L.isDrawn = false;
        L.hasGlyphs = false;
        continue;
      }
      let any = G.indexes.some(T);
      let hasGlyphs = L.hasGlyphs;
      L.hasGlyphs ||= any;
      let { originX, originY } = G;
      let J =
        G.isConsistent &&
        G.count === box.columns * box.rows &&
        G.lastRow < box.rows &&
        G.lastColumn < box.columns;
      let V = originY + box.rows - 1;
      let position = J ? (m === undefined ? f(originX, originY) : m(originX, originY)) : undefined;
      if (position !== undefined && (m === undefined ? f(originX, V) : m(originX, V)) !== undefined) {
        if (!L.isDirty && L.isDrawn && !any) continue;
        if (m !== undefined && any) {
          L.isDrawn = false;
          L.isDirty = true;
          this.requestFrame();
          continue;
        }
        if (!p) {
          L.isDrawn = false;
          L.isDirty = true;
          this.isDrawHeld = true;
          continue;
        }
        let sequence = resend();
        if (O > 0 && O + sequence.length > MAX_TRANSMIT_BYTES) {
          L.isDrawn = false;
          L.isDirty = true;
          L.deferredSince ??= this.placements;
          this.requestFrame();
          continue;
        }
        D += typeof position === "string" ? position + sequence : wrapItermImageForTmux(sequence, position);
        O += sequence.length;
        L.isDrawn = true;
        L.isDirty = false;
        L.deferredSince = undefined;
        L.hasGlyphs = false;
        continue;
      }
      L.isDrawn = false;
      L.hasGlyphs = false;
      let indexes = hasGlyphs ? G.indexes : G.indexes.filter(T);
      for (let de of indexesToRuns(indexes, n.width)) {
        let se = f(de.x, de.y);
        if (se !== undefined) D += se + csi(`${de.length}X`);
      }
    }
    return D === "" ? "" : DECSC + D + DECRC;
  }
  get hasHeldDraw() {
    return this.isDrawHeld;
  }
  get hasItermImages() {
    for (let n of this.live.values()) if (n.protocol === "iterm") return true;
    return false;
  }
  get size() {
    return this.live.size;
  }
  keepIterm(n, u, f, m) {
    if (m.box === undefined || !m.resend) return false;
    try {
      let p = () => f(n);
      p();
      u.resend = p;
    } catch {
      return false;
    }
    u.isSent = true;
    u.box = m.box;
    u.isDirty = true;
    this.requestFrame();
    return true;
  }
  queue(n, u) {
    let f = this.pendingTransmits.get(n) ?? [];
    let m = u.isConsumed ? f : f.filter((p) => p.isConsumed);
    this.pendingTransmits.set(n, [...m, u]);
  }
  takeSmall() {
    let [n] = this.freeSmall;
    if (n !== undefined) {
      this.freeSmall.delete(n);
      return n;
    }
    let u = [];
    for (let idx = 1; idx < ANSI_256_LIMIT; idx++) if (!this.live.has(idx)) u.push(idx);
    return u.length === 0 ? undefined : u[randomInt(0, u.length)];
  }
  takeIterm(n) {
    let u = n === undefined ? undefined : this.freeIterm.get(n);
    let f = u?.shift();
    if (n !== undefined && u?.length === 0) this.freeIterm.delete(n);
    if (f !== undefined && !this.live.has(f)) return f;
    let m;
    do m = randomInt(ANSI_256_LIMIT, MAX_ITERM_IMAGE_ID);
    while (this.live.has(m) || [...this.freeIterm.values()].some((p) => p.includes(m)));
    return m;
  }
  takeWide() {
    let nextWide = this.nextWide;
    do nextWide = nextWide + 1 >= MAX_WIDE_IMAGE_ID ? ANSI_256_LIMIT : nextWide + 1;
    while (this.live.has(nextWide));
    this.nextWide = nextWide;
    return nextWide;
  }
}
export { TerminalImageManager, DECRC };
