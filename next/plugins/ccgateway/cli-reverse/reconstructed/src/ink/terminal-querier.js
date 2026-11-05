/**
 * ink/terminal-querier.ts
 *
 * 终端查询：发 DECRQM/DA/kitty 键盘/光标位置/OSC 颜色等查询并匹配应答
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal-querier.ts
 * pieces: chunk-kx37bqfp.js (11)
 * attribution: fingerprint 6, layout 3, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { csi } from "./termio/csi.js";
import { osc, OSC } from "./termio/osc.js";
import { transmitKittyImage } from "./termio/kittyGraphics.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-kx37bqfp.js:5517-5604 fingerprint (2.1.88 match: decrqm, 1)
/**
 * DECRQM 查询某 DEC 模式（CSI ? n $ p），匹配 DECRPM 应答。
 */
function decrqm(mode) {
  return {
    request: csi(`?${mode}$p`),
    match: (response) => response.type === "decrpm" && response.mode === mode,
  };
}
//@ chunk-kx37bqfp.js:5604-5680 fingerprint (2.1.88 match: kittyKeyboard, 1)
/**
 * kitty 键盘协议标志查询 CSI ? u。
 */
function kittyKeyboard() {
  return {
    request: csi("?u"),
    match: (response) => response.type === "kittyKeyboard",
  };
}
//@ chunk-kx37bqfp.js:5680-5758 fingerprint (2.1.88 match: cursorPosition, 1)
/**
 * 光标位置查询（DECXCPR，CSI ? 6 n）。
 */
function cursorPosition() {
  return {
    request: csi("?6n"),
    match: (response) => response.type === "cursorPosition",
  };
}
//@ chunk-kx37bqfp.js:5758-5838 fingerprint (2.1.88 match: oscColor, 1)
/**
 * OSC 颜色查询（OSC n ; ?），如 OSC 11 背景色。
 */
function oscColor(code) {
  return {
    request: osc(code, "?"),
    match: (response) => response.type === "osc" && response.code === code,
  };
}
//@ chunk-kx37bqfp.js:5838-5973 layout (2.1.88 match: oscColor, 0.823)
function programStatusQuery() {
  return {
    request: osc(OSC.PROGRAM_STATUS, "?"),
    match: (response) =>
      response.type === "osc" && response.code === OSC.PROGRAM_STATUS && response.data.startsWith("?"),
  };
}
//@ chunk-kx37bqfp.js:5973-6046 fingerprint (2.1.88 match: xtversion, 1)
/**
 * XTVERSION 查询（CSI > 0 q），应答 DCS > | 终端名 版本 ST。
 */
function xtversion() {
  return {
    request: csi(">0q"),
    match: (response) => response.type === "xtversion",
  };
}
//@ chunk-kx37bqfp.js:6046-6118 file-local
function cellSizeQuery() {
  return {
    request: csi("16t"),
    match: (response) => response.type === "cellSize",
  };
}
//@ chunk-kx37bqfp.js:6118-6127 layout
var GRAPHICS_PROBE_IMAGE_ID = 31;
//@ chunk-kx37bqfp.js:6127-6209 file-local
function kittyGraphicsQuery() {
  return {
    request: transmitKittyImage(GRAPHICS_PROBE_IMAGE_ID),
    match: (response) => response.type === "kittyGraphics" && response.id === GRAPHICS_PROBE_IMAGE_ID,
  };
}
//@ chunk-kx37bqfp.js:6209-6223 layout
/**
 * DA1 查询 CSI c，作为查询队列的哨兵：几乎所有终端都会应答，按顺序收到它说明之前的查询已无应答。
 */
var DA1_SENTINEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-kx37bqfp.js:6209", () => {
  DA1_SENTINEL = csi("c");
});
//@ chunk-kx37bqfp.js:6223-7949 fingerprint (2.1.88 match: TerminalQuerier, 0.582)
/**
 * 终端查询器：查询排队写到 stdout（输入未接管时先缓存），应答由 App 的输入解析交给 onResponse 按 match 匹配并 resolve；flush() 发 DA1 哨兵，哨兵应答到达时把前面未应答的查询都 resolve 为 undefined；owed() 统计还欠的应答数（退出前要读干净）；resync 丢弃排队并可插入 barrier；主题变化通知（CSI ? 997）分发给订阅者。
 */
class TerminalQuerier {
  stdout;
  queue = [];
  isInputAttached = false;
  themeChangeSubscribers = new Set();
  constructor(stdout) {
    this.stdout = stdout;
  }
  setInputAttached(attached) {
    this.isInputAttached = attached;
    if (!attached) return;
    for (let entry of this.queue) if (entry.kind !== "barrier" && !entry.written) this.write(entry);
  }
  owed() {
    let count = 0;
    for (let entry of this.queue)
      if (entry.kind === "barrier" || (entry.kind === "sentinel" && entry.written)) count++;
    return count;
  }
  subscribeThemeChange(listener) {
    this.themeChangeSubscribers.add(listener);
    return () => {
      this.themeChangeSubscribers.delete(listener);
    };
  }
  send(query) {
    return new Promise((resolve) => {
      this.enqueue({
        kind: "query",
        request: query.request,
        written: false,
        match: query.match,
        resolve: (reply) => resolve(reply),
      });
    });
  }
  flush() {
    return new Promise((resolve) => {
      this.enqueue({
        kind: "sentinel",
        request: DA1_SENTINEL,
        written: false,
        resolve,
      });
    });
  }
  cancel(query) {
    let index = this.queue.findIndex((entry) => entry.kind === "query" && entry.match === query.match);
    if (index === -1) return;
    let [removed] = this.queue.splice(index, 1);
    if (removed?.kind === "query") removed.resolve(undefined);
  }
  resync({ probe }) {
    for (let pending of this.queue.splice(0))
      if (pending.kind === "query") pending.resolve(undefined);
      else if (pending.kind === "sentinel") pending.resolve(false);
    if (probe && this.isInputAttached) {
      this.queue.push({
        kind: "barrier",
      });
      this.stdout.write(DA1_SENTINEL);
    }
  }
  onResponse(response) {
    if (response.type === "themeNotify") {
      for (let themeChangeSubscriber of this.themeChangeSubscribers) themeChangeSubscriber(response.dark);
      return true;
    }
    if (this.queue[0]?.kind === "barrier") {
      if (response.type === "da1") this.queue.shift();
      return true;
    }
    let index = this.queue.findIndex((entry) => entry.kind === "query" && entry.match(response));
    if (index !== -1) {
      let [matched] = this.queue.splice(index, 1);
      if (matched?.kind === "query") matched.resolve(response);
      return true;
    }
    if (response.type !== "da1") return false;
    let index_2 = this.queue.findIndex((entry) => entry.kind === "sentinel");
    if (index_2 === -1) return false;
    for (let entry of this.queue.splice(0, index_2 + 1))
      if (entry.kind === "query") entry.resolve(undefined);
      else if (entry.kind === "sentinel") entry.resolve(true);
    return true;
  }
  enqueue(entry) {
    this.queue.push(entry);
    if (this.isInputAttached) this.write(entry);
  }
  write(entry) {
    entry.written = true;
    this.stdout.write(entry.request);
  }
}
export {
  cellSizeQuery,
  xtversion,
  kittyKeyboard,
  programStatusQuery,
  decrqm,
  kittyGraphicsQuery,
  TerminalQuerier,
  cursorPosition,
  oscColor,
};
