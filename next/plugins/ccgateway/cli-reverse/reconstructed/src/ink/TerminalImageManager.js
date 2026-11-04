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
import { tmuxPassthroughChunked, wrapItermImageForTmux } from "./termio/osc.js";
import { csi } from "./termio/csi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:268093-268112 placement
var placeholderDecodeCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:268093", () => {
  placeholderDecodeCache = new WeakMap();
});
//@ chunk-bzr73sfg.js:268112-268251 placement
function decodePlaceholderCached(charPool, charIndex) {
  let decodedByChar = placeholderDecodeCache.get(charPool);
  if (decodedByChar === undefined) {
    decodedByChar = new Map();
    placeholderDecodeCache.set(charPool, decodedByChar);
  }
  let decoded = decodedByChar.get(charIndex);
  if (decoded === undefined) {
    decoded = decodeImagePlaceholder(charPool.get(charIndex)) ?? null;
    decodedByChar.set(charIndex, decoded);
  }
  return decoded;
}
//@ chunk-bzr73sfg.js:268251-268759 placement
/**
 * 扫描屏幕里的图片占位格，按图片 id 汇总：左上角原点、格数、最大行列、所有格下标、各格是否与同一原点一致（被裁剪/错位时不一致）。
 */
function scanImagePlaceholders(screen) {
  let images = new Map();
  let { cells, width, charPool } = screen;
  let cellCount = width * screen.height;
  for (let idx = 0; idx < cellCount; idx++) {
    let charIndex = cells[idx << 1];
    if (charIndex < 2) continue;
    let placeholder = decodePlaceholderCached(charPool, charIndex);
    if (placeholder === null) continue;
    let originX = (idx % width) - placeholder.column;
    let originY = Math.floor(idx / width) - placeholder.row;
    let entry = images.get(placeholder.id);
    if (entry === undefined) {
      images.set(placeholder.id, {
        originX,
        originY,
        count: 1,
        isConsistent: true,
        lastRow: placeholder.row,
        lastColumn: placeholder.column,
        indexes: [idx],
      });
      continue;
    }
    entry.count++;
    entry.indexes.push(idx);
    entry.lastRow = Math.max(entry.lastRow, placeholder.row);
    entry.lastColumn = Math.max(entry.lastColumn, placeholder.column);
    entry.isConsistent &&= entry.originX === originX && entry.originY === originY;
  }
  return images;
}
//@ chunk-bzr73sfg.js:268759-268849 placement
function cellChangedAt(prev, next, index) {
  let cellIndex = index << 1;
  return (
    prev.cells[cellIndex] !== next.cells[cellIndex] || prev.cells[cellIndex + 1] !== next.cells[cellIndex + 1]
  );
}
//@ chunk-bzr73sfg.js:268849-269023 placement (2.1.88 match: diff, 1)
function indexesToRuns(indexes, width) {
  let runs = [];
  for (let index of indexes) {
    let x = index % width;
    let floored = Math.floor(index / width);
    let last = runs.at(-1);
    if (last !== undefined && last.y === floored && last.x + last.length === x) last.length++;
    else
      runs.push({
        x,
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
  allocate(image, onRefused, protocol = "kitty", options) {
    let slot =
      protocol === "iterm"
        ? this.takeIterm(options)
        : image === SMALL_IMAGE_IDS
          ? this.takeSmall()
          : this.takeWide();
    if (slot !== undefined)
      this.live.set(slot, {
        isSent: false,
        resend: undefined,
        onRefused,
        protocol,
        box: undefined,
        isDrawn: false,
        isDirty: false,
        deferredSince: undefined,
        hasGlyphs: false,
        reuseKey: options,
      });
    return slot;
  }
  transmit(
    key,
    write,
    options = {
      resend: true,
    },
  ) {
    let entry = this.live.get(key);
    let isFirst = !options.resend;
    if (entry === undefined || (isFirst && this.isBackedUp(key))) return false;
    if (entry.protocol === "iterm") return this.keepIterm(key, entry, write, options);
    try {
      let onConsumed = () => write(key);
      let sequence = onConsumed();
      entry.isSent = true;
      entry.resend = isFirst ? undefined : onConsumed;
      this.queue(key, {
        sequence,
        isConsumed: isFirst,
      });
    } catch {
      return false;
    }
    this.requestFrame();
    return true;
  }
  isBackedUp(key) {
    let transmits = this.pendingTransmits.get(key) ?? [];
    let consumedCount = 0;
    for (let transmit of transmits) if (transmit.isConsumed) consumedCount++;
    return consumedCount >= MAX_PENDING;
  }
  refused(key, callback) {
    if (callback === "OK") return;
    this.live.get(key)?.onRefused?.(callback);
  }
  free(key) {
    let entry = this.live.get(key);
    if (entry === undefined) return;
    let { isSent, protocol, reuseKey } = entry;
    this.live.delete(key);
    if (protocol === "iterm") {
      if (reuseKey !== undefined) {
        let slots = this.freeIterm.get(reuseKey) ?? [];
        this.freeIterm.delete(reuseKey);
        this.freeIterm.set(reuseKey, [...slots, key]);
        let [reuseKey_2] = this.freeIterm.keys();
        if (reuseKey_2 !== undefined && this.freeIterm.size > MAX_ITERM_FREE)
          this.freeIterm.delete(reuseKey_2);
      }
      return;
    }
    for (let transmit of this.pendingTransmits.get(key) ?? [])
      if (transmit.isConsumed) this.pendingOrphans.push(transmit.sequence);
    this.pendingTransmits.delete(key);
    if (key < ANSI_256_LIMIT) this.freeSmall.add(key);
    if (isSent) {
      this.pendingDeletes.add(key);
      this.requestFrame();
    }
  }
  retransmitAll() {
    for (let [key, entry] of this.live) {
      let { resend } = entry;
      if (entry.protocol === "iterm") {
        entry.isDirty = true;
        continue;
      }
      if (resend !== undefined)
        this.queue(key, {
          sequence: resend(),
          isConsumed: false,
        });
    }
  }
  drain() {
    let orphans = this.pendingOrphans.splice(0);
    let mapped = [...this.pendingDeletes].map((pendingDelete) => deleteKittyImage(pendingDelete));
    let keys = [];
    let index = 0;
    this.pendingDeletes.clear();
    for (let [key, queue] of this.pendingTransmits) {
      for (let index_2 = queue[0]; index_2 !== undefined; index_2 = queue[0]) {
        if (index > 0 && index + index_2.sequence.length > MAX_TRANSMIT_BYTES) {
          this.requestFrame();
          return this.forOuter([...orphans, ...mapped, ...keys].join(""));
        }
        keys.push(index_2.sequence);
        index += index_2.sequence.length;
        queue.shift();
      }
      this.pendingTransmits.delete(key);
    }
    return this.forOuter([...orphans, ...mapped, ...keys].join(""));
  }
  redrawInline() {
    if (!this.hasItermImages) return;
    for (let entry of this.live.values()) if (entry.protocol === "iterm") entry.isDirty = true;
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
  placeIterm(screen, previous, onPlace, offsetY, allowMove = true) {
    this.isDrawHeld = false;
    if (!this.hasItermImages) return "";
    let reusable = previous !== undefined && previous.width === screen.width ? previous : undefined;
    let capacity = reusable === undefined ? 0 : reusable.width * reusable.height;
    let markRow = (index) =>
      reusable === undefined || index >= capacity || cellChangedAt(screen, reusable, index);
    let placeholders = scanImagePlaceholders(screen);
    let out = "";
    let lastY = 0;
    this.placements++;
    let sorted = [...this.live].sort(
      ([, box], [, id]) =>
        (box.deferredSince ?? Number.MAX_SAFE_INTEGER) - (id.deferredSince ?? Number.MAX_SAFE_INTEGER),
    );
    for (let [id, slot] of sorted) {
      let { box, resend } = slot;
      if (slot.protocol !== "iterm" || box === undefined || !resend) continue;
      let placeholdersForId = placeholders.get(id);
      if (placeholdersForId === undefined) {
        slot.isDrawn = false;
        slot.hasGlyphs = false;
        continue;
      }
      let any = placeholdersForId.indexes.some(markRow);
      let hasGlyphs = slot.hasGlyphs;
      slot.hasGlyphs ||= any;
      let { originX, originY } = placeholdersForId;
      let escapeSequence =
        placeholdersForId.isConsistent &&
        placeholdersForId.count === box.columns * box.rows &&
        placeholdersForId.lastRow < box.rows &&
        placeholdersForId.lastColumn < box.columns;
      let bottomRow = originY + box.rows - 1;
      let position = escapeSequence
        ? offsetY === undefined
          ? onPlace(originX, originY)
          : offsetY(originX, originY)
        : undefined;
      if (
        position !== undefined &&
        (offsetY === undefined ? onPlace(originX, bottomRow) : offsetY(originX, bottomRow)) !== undefined
      ) {
        if (!slot.isDirty && slot.isDrawn && !any) continue;
        if (offsetY !== undefined && any) {
          slot.isDrawn = false;
          slot.isDirty = true;
          this.requestFrame();
          continue;
        }
        if (!allowMove) {
          slot.isDrawn = false;
          slot.isDirty = true;
          this.isDrawHeld = true;
          continue;
        }
        let sequence = resend();
        if (lastY > 0 && lastY + sequence.length > MAX_TRANSMIT_BYTES) {
          slot.isDrawn = false;
          slot.isDirty = true;
          slot.deferredSince ??= this.placements;
          this.requestFrame();
          continue;
        }
        out += typeof position === "string" ? position + sequence : wrapItermImageForTmux(sequence, position);
        lastY += sequence.length;
        slot.isDrawn = true;
        slot.isDirty = false;
        slot.deferredSince = undefined;
        slot.hasGlyphs = false;
        continue;
      }
      slot.isDrawn = false;
      slot.hasGlyphs = false;
      let indexes = hasGlyphs ? placeholdersForId.indexes : placeholdersForId.indexes.filter(markRow);
      for (let index of indexesToRuns(indexes, screen.width)) {
        let text = onPlace(index.x, index.y);
        if (text !== undefined) out += text + csi(`${index.length}X`);
      }
    }
    return out === "" ? "" : DECSC + out + DECRC;
  }
  get hasHeldDraw() {
    return this.isDrawHeld;
  }
  get hasItermImages() {
    for (let entry of this.live.values()) if (entry.protocol === "iterm") return true;
    return false;
  }
  get size() {
    return this.live.size;
  }
  keepIterm(screen, previous, onKeep, offsetY) {
    if (offsetY.box === undefined || !offsetY.resend) return false;
    try {
      let keep = () => onKeep(screen);
      keep();
      previous.resend = keep;
    } catch {
      return false;
    }
    previous.isSent = true;
    previous.box = offsetY.box;
    previous.isDirty = true;
    this.requestFrame();
    return true;
  }
  queue(key, transmit) {
    let queue = this.pendingTransmits.get(key) ?? [];
    let nextQueue = transmit.isConsumed ? queue : queue.filter((pending) => pending.isConsumed);
    this.pendingTransmits.set(key, [...nextQueue, transmit]);
  }
  takeSmall() {
    let [slot] = this.freeSmall;
    if (slot !== undefined) {
      this.freeSmall.delete(slot);
      return slot;
    }
    let ids = [];
    for (let idx = 1; idx < ANSI_256_LIMIT; idx++) if (!this.live.has(idx)) ids.push(idx);
    return ids.length === 0 ? undefined : ids[randomInt(0, ids.length)];
  }
  takeIterm(preferredKey) {
    let slots = preferredKey === undefined ? undefined : this.freeIterm.get(preferredKey);
    let slot = slots?.shift();
    if (preferredKey !== undefined && slots?.length === 0) this.freeIterm.delete(preferredKey);
    if (slot !== undefined && !this.live.has(slot)) return slot;
    let key;
    do key = randomInt(ANSI_256_LIMIT, MAX_ITERM_IMAGE_ID);
    while (this.live.has(key) || [...this.freeIterm.values()].some((slots) => slots.includes(key)));
    return key;
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
