/**
 * ink/terminal-querier.ts
 *
 * 终端查询：发 DECRQM/DA/kitty 键盘/光标位置/OSC 颜色等查询并匹配应答
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/terminal-querier.ts
 * pieces: chunk-m1vyn8g1.js (11)
 * attribution: fingerprint 6, layout 3, file-local 2
 */
import { csi } from "./termio/csi.js";
import { osc, OSC } from "./termio/osc.js";
import { transmitKittyImage } from "./termio/kittyGraphics.js";

//@ chunk-m1vyn8g1.js:5517-5604 fingerprint = decrqm (1)
/**
 * DECRQM 查询某 DEC 模式（CSI ? n $ p），匹配 DECRPM 应答。
 */
function decrqm(mode) {
  return {
    request: csi(`?${mode}$p`),
    match: (n) => n.type === "decrpm" && n.mode === mode,
  };
}
//@ chunk-m1vyn8g1.js:5604-5680 fingerprint = kittyKeyboard (1)
/**
 * kitty 键盘协议标志查询 CSI ? u。
 */
function kittyKeyboard() {
  return {
    request: csi("?u"),
    match: (e) => e.type === "kittyKeyboard",
  };
}
//@ chunk-m1vyn8g1.js:5680-5758 fingerprint = cursorPosition (1)
/**
 * 光标位置查询（DECXCPR，CSI ? 6 n）。
 */
function cursorPosition() {
  return {
    request: csi("?6n"),
    match: (e) => e.type === "cursorPosition",
  };
}
//@ chunk-m1vyn8g1.js:5758-5838 fingerprint = oscColor (1)
/**
 * OSC 颜色查询（OSC n ; ?），如 OSC 11 背景色。
 */
function oscColor(code) {
  return {
    request: osc(code, "?"),
    match: (n) => n.type === "osc" && n.code === code,
  };
}
//@ chunk-m1vyn8g1.js:5838-5973 layout = oscColor (0.824)
function programStatusQuery() {
  return {
    request: osc(OSC.PROGRAM_STATUS, "?"),
    match: (e) => e.type === "osc" && e.code === OSC.PROGRAM_STATUS && e.data.startsWith("?"),
  };
}
//@ chunk-m1vyn8g1.js:5973-6046 fingerprint = xtversion (1)
/**
 * XTVERSION 查询（CSI > 0 q），应答 DCS > | 终端名 版本 ST。
 */
function xtversion() {
  return {
    request: csi(">0q"),
    match: (e) => e.type === "xtversion",
  };
}
//@ chunk-m1vyn8g1.js:6046-6118 file-local
function cellSizeQuery() {
  return {
    request: csi("16t"),
    match: (e) => e.type === "cellSize",
  };
}
//@ chunk-m1vyn8g1.js:6118-6127 layout
var GRAPHICS_PROBE_IMAGE_ID = 31;
//@ chunk-m1vyn8g1.js:6127-6209 file-local
function kittyGraphicsQuery() {
  return {
    request: transmitKittyImage(GRAPHICS_PROBE_IMAGE_ID),
    match: (e) => e.type === "kittyGraphics" && e.id === GRAPHICS_PROBE_IMAGE_ID,
  };
}
//@ chunk-m1vyn8g1.js:6209-6223 layout
/**
 * DA1 查询 CSI c，作为查询队列的哨兵：几乎所有终端都会应答，按顺序收到它说明之前的查询已无应答。
 */
var DA1_SENTINEL = csi("c");
//@ chunk-m1vyn8g1.js:6223-7949 fingerprint = TerminalQuerier (0.583)
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
  setInputAttached(e) {
    this.isInputAttached = e;
    if (!e) return;
    for (let n of this.queue) if (n.kind !== "barrier" && !n.written) this.write(n);
  }
  owed() {
    let e = 0;
    for (let n of this.queue) if (n.kind === "barrier" || (n.kind === "sentinel" && n.written)) e++;
    return e;
  }
  subscribeThemeChange(e) {
    this.themeChangeSubscribers.add(e);
    return () => {
      this.themeChangeSubscribers.delete(e);
    };
  }
  send(query) {
    return new Promise((resolve) => {
      this.enqueue({
        kind: "query",
        request: query.request,
        written: false,
        match: query.match,
        resolve: (o) => resolve(o),
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
  cancel(e) {
    let index = this.queue.findIndex((t) => t.kind === "query" && t.match === e.match);
    if (index === -1) return;
    let [o] = this.queue.splice(index, 1);
    if (o?.kind === "query") o.resolve(undefined);
  }
  resync({ probe }) {
    for (let n of this.queue.splice(0))
      if (n.kind === "query") n.resolve(undefined);
      else if (n.kind === "sentinel") n.resolve(false);
    if (probe && this.isInputAttached) {
      this.queue.push({
        kind: "barrier",
      });
      this.stdout.write(DA1_SENTINEL);
    }
  }
  onResponse(e) {
    if (e.type === "themeNotify") {
      for (let themeChangeSubscriber of this.themeChangeSubscribers) themeChangeSubscriber(e.dark);
      return true;
    }
    if (this.queue[0]?.kind === "barrier") {
      if (e.type === "da1") this.queue.shift();
      return true;
    }
    let index = this.queue.findIndex((t) => t.kind === "query" && t.match(e));
    if (index !== -1) {
      let [t] = this.queue.splice(index, 1);
      if (t?.kind === "query") t.resolve(e);
      return true;
    }
    if (e.type !== "da1") return false;
    let index_2 = this.queue.findIndex((t) => t.kind === "sentinel");
    if (index_2 === -1) return false;
    for (let t of this.queue.splice(0, index_2 + 1))
      if (t.kind === "query") t.resolve(undefined);
      else if (t.kind === "sentinel") t.resolve(true);
    return true;
  }
  enqueue(e) {
    this.queue.push(e);
    if (this.isInputAttached) this.write(e);
  }
  write(e) {
    e.written = true;
    this.stdout.write(e.request);
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
