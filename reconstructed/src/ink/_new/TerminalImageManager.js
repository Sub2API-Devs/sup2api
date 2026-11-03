/**
 * ink/_new/TerminalImageManager.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (2)
 * attribution: sole-consumer-new 2
 */
import { randomInt } from "crypto";
import { ANSI_256_LIMIT, RIs } from "../termio/kittyGraphics.js";
import { tmuxPassthroughChunked, wrapItermImageForTmux } from "../termio/osc.js";
import { cellChangedAt, scanImagePlaceholders, indexesToRuns } from "./_new/scanImagePlaceholders.js";
import { csi } from "../termio/csi.js";
import { MAX_ITERM_IMAGE_ID } from "../termio/iterm2Image.js";

//@ chunk-bzr73sfg.js:270186-270252 sole-consumer-new
var SMALL_IMAGE_IDS = 8,
  MAX_WIDE_IMAGE_ID = 16777216,
  MAX_TRANSMIT_BYTES = 3145728,
  MAX_PENDING = 8,
  MAX_ITERM_FREE = 256,
  DECSC = "\x1B7",
  DECRC = "\x1B8";
/**
 * 终端图片管理器（App 的 terminalImages）：为图片分配 id（kitty 小 id 池与 24 位宽 id、iTerm2 位置复用）、排队传输（kitty APC G）与删除、终端拒绝时记录（refused）、tmux 透传与 pane 位置修正、在帧之后按占位格位置放置 iTerm2 图片（placeIterm/keepIterm）、resendAll/redrawInline/requestDraw。
 */
//@ chunk-bzr73sfg.js:270252-275127 sole-consumer-new
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
  isTmuxPassthrough = !1;
  isDrawHeld = !1;
  constructor(n) {
    this.requestFrame = n;
  }
  allocate(n, u, f = "kitty", m) {
    let p = f === "iterm" ? this.takeIterm(m) : n === SMALL_IMAGE_IDS ? this.takeSmall() : this.takeWide();
    if (p !== void 0)
      this.live.set(p, {
        isSent: !1,
        resend: void 0,
        onRefused: u,
        protocol: f,
        box: void 0,
        isDrawn: !1,
        isDirty: !1,
        deferredSince: void 0,
        hasGlyphs: !1,
        reuseKey: m,
      });
    return p;
  }
  transmit(n, u, f = { resend: !0 }) {
    let m = this.live.get(n),
      p = !f.resend;
    if (m === void 0 || (p && this.isBackedUp(n))) return !1;
    if (m.protocol === "iterm") return this.keepIterm(n, m, u, f);
    try {
      let g = () => u(n),
        E = g();
      ((m.isSent = !0), (m.resend = p ? void 0 : g), this.queue(n, { sequence: E, isConsumed: p }));
    } catch {
      return !1;
    }
    return (this.requestFrame(), !0);
  }
  isBackedUp(n) {
    let u = this.pendingTransmits.get(n) ?? [],
      f = 0;
    for (let m of u) if (m.isConsumed) f++;
    return f >= MAX_PENDING;
  }
  refused(n, u) {
    if (u === "OK") return;
    this.live.get(n)?.onRefused?.(u);
  }
  free(n) {
    let u = this.live.get(n);
    if (u === void 0) return;
    let { isSent: isSent, protocol: protocol, reuseKey: reuseKey } = u;
    if ((this.live.delete(n), protocol === "iterm")) {
      if (reuseKey !== void 0) {
        let g = this.freeIterm.get(reuseKey) ?? [];
        (this.freeIterm.delete(reuseKey), this.freeIterm.set(reuseKey, [...g, n]));
        let [E] = this.freeIterm.keys();
        if (E !== void 0 && this.freeIterm.size > MAX_ITERM_FREE) this.freeIterm.delete(E);
      }
      return;
    }
    for (let g of this.pendingTransmits.get(n) ?? []) if (g.isConsumed) this.pendingOrphans.push(g.sequence);
    if ((this.pendingTransmits.delete(n), n < ANSI_256_LIMIT)) this.freeSmall.add(n);
    if (isSent) (this.pendingDeletes.add(n), this.requestFrame());
  }
  retransmitAll() {
    for (let [n, u] of this.live) {
      let { resend: resend } = u;
      if (u.protocol === "iterm") {
        u.isDirty = !0;
        continue;
      }
      if (resend !== void 0) this.queue(n, { sequence: resend(), isConsumed: !1 });
    }
  }
  drain() {
    let splice = this.pendingOrphans.splice(0),
      mapped = [...this.pendingDeletes].map((p) => RIs(p)),
      f = [],
      m = 0;
    this.pendingDeletes.clear();
    for (let [p, g] of this.pendingTransmits) {
      for (let E = g[0]; E !== void 0; E = g[0]) {
        if (m > 0 && m + E.sequence.length > MAX_TRANSMIT_BYTES)
          return (this.requestFrame(), this.forOuter([...splice, ...mapped, ...f].join("")));
        (f.push(E.sequence), (m += E.sequence.length), g.shift());
      }
      this.pendingTransmits.delete(p);
    }
    return this.forOuter([...splice, ...mapped, ...f].join(""));
  }
  redrawInline() {
    if (!this.hasItermImages) return;
    for (let n of this.live.values()) if (n.protocol === "iterm") n.isDirty = !0;
    this.requestFrame();
  }
  requestDraw() {
    if (this.hasItermImages) this.requestFrame();
  }
  resendAll() {
    if (this.live.size === 0) return;
    (this.retransmitAll(), this.requestFrame());
  }
  forOuter(n) {
    return this.isTmuxPassthrough && n !== "" ? tmuxPassthroughChunked(n) : n;
  }
  placeIterm(n, u, f, m, p = !0) {
    if (((this.isDrawHeld = !1), !this.hasItermImages)) return "";
    let g = u !== void 0 && u.width === n.width ? u : void 0,
      E = g === void 0 ? 0 : g.width * g.height,
      T = (U) => g === void 0 || U >= E || cellChangedAt(n, g, U),
      A = scanImagePlaceholders(n),
      D = "",
      O = 0;
    this.placements++;
    let sorted = [...this.live].sort(
      ([, U], [, L]) =>
        (U.deferredSince ?? Number.MAX_SAFE_INTEGER) - (L.deferredSince ?? Number.MAX_SAFE_INTEGER),
    );
    for (let [U, L] of sorted) {
      let { box: box, resend: resend } = L;
      if (L.protocol !== "iterm" || box === void 0 || !resend) continue;
      let G = A.get(U);
      if (G === void 0) {
        ((L.isDrawn = !1), (L.hasGlyphs = !1));
        continue;
      }
      let any = G.indexes.some(T),
        hasGlyphs = L.hasGlyphs;
      L.hasGlyphs ||= any;
      let { originX: originX, originY: originY } = G,
        J =
          G.isConsistent &&
          G.count === box.columns * box.rows &&
          G.lastRow < box.rows &&
          G.lastColumn < box.columns,
        V = originY + box.rows - 1,
        ee = J ? (m === void 0 ? f(originX, originY) : m(originX, originY)) : void 0;
      if (ee !== void 0 && (m === void 0 ? f(originX, V) : m(originX, V)) !== void 0) {
        if (!L.isDirty && L.isDrawn && !any) continue;
        if (m !== void 0 && any) {
          ((L.isDrawn = !1), (L.isDirty = !0), this.requestFrame());
          continue;
        }
        if (!p) {
          ((L.isDrawn = !1), (L.isDirty = !0), (this.isDrawHeld = !0));
          continue;
        }
        let se = resend();
        if (O > 0 && O + se.length > MAX_TRANSMIT_BYTES) {
          ((L.isDrawn = !1), (L.isDirty = !0), (L.deferredSince ??= this.placements), this.requestFrame());
          continue;
        }
        ((D += typeof ee === "string" ? ee + se : wrapItermImageForTmux(se, ee)),
          (O += se.length),
          (L.isDrawn = !0),
          (L.isDirty = !1),
          (L.deferredSince = void 0),
          (L.hasGlyphs = !1));
        continue;
      }
      ((L.isDrawn = !1), (L.hasGlyphs = !1));
      let ne = hasGlyphs ? G.indexes : G.indexes.filter(T);
      for (let de of indexesToRuns(ne, n.width)) {
        let se = f(de.x, de.y);
        if (se !== void 0) D += se + csi(`${de.length}X`);
      }
    }
    return D === "" ? "" : DECSC + D + DECRC;
  }
  get hasHeldDraw() {
    return this.isDrawHeld;
  }
  get hasItermImages() {
    for (let n of this.live.values()) if (n.protocol === "iterm") return !0;
    return !1;
  }
  get size() {
    return this.live.size;
  }
  keepIterm(n, u, f, m) {
    if (m.box === void 0 || !m.resend) return !1;
    try {
      let p = () => f(n);
      (p(), (u.resend = p));
    } catch {
      return !1;
    }
    return ((u.isSent = !0), (u.box = m.box), (u.isDirty = !0), this.requestFrame(), !0);
  }
  queue(n, u) {
    let f = this.pendingTransmits.get(n) ?? [],
      m = u.isConsumed ? f : f.filter((p) => p.isConsumed);
    this.pendingTransmits.set(n, [...m, u]);
  }
  takeSmall() {
    let [n] = this.freeSmall;
    if (n !== void 0) return (this.freeSmall.delete(n), n);
    let u = [];
    for (let f = 1; f < ANSI_256_LIMIT; f++) if (!this.live.has(f)) u.push(f);
    return u.length === 0 ? void 0 : u[randomInt(0, u.length)];
  }
  takeIterm(n) {
    let u = n === void 0 ? void 0 : this.freeIterm.get(n),
      f = u?.shift();
    if (n !== void 0 && u?.length === 0) this.freeIterm.delete(n);
    if (f !== void 0 && !this.live.has(f)) return f;
    let m;
    do m = randomInt(ANSI_256_LIMIT, MAX_ITERM_IMAGE_ID);
    while (this.live.has(m) || [...this.freeIterm.values()].some((p) => p.includes(m)));
    return m;
  }
  takeWide() {
    let nextWide = this.nextWide;
    do nextWide = nextWide + 1 >= MAX_WIDE_IMAGE_ID ? ANSI_256_LIMIT : nextWide + 1;
    while (this.live.has(nextWide));
    return ((this.nextWide = nextWide), nextWide);
  }
}

export { TerminalImageManager, DECRC };
