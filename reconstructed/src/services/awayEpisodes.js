/**
 * services/awayEpisodes.ts
 *
 * 2.1.316 新增：用户离开期间的事件段记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21z2m00n.js (1)
 * attribution: placement 1
 */

/**
 * 跟踪"用户离开"期间告诉过模型的远程主机：told 记录某会话下被告知离开的主机；takeReturn 在主机回来时取出一次返回提示（离开时长），并在离开记录被丢弃时同步清理。
 */
//@ chunk-21z2m00n.js:191-1057 placement
class AwayEpisodeTracker {
  #t = new Map();
  #e = new Map();
  #s = !1;
  told(t, s, e) {
    if ((t.noteModelToldAway(e), t.awayEpisode(e) === void 0)) return;
    this.#n(t);
    let i = s ?? "",
      n = this.#e.get(i);
    if (n !== void 0) {
      n.add(e);
      return;
    }
    let found = [...this.#e.keys()].find((o) => o !== "");
    if (this.#e.size >= 64 && found !== void 0) this.#e.delete(found);
    this.#e.set(i, new Set([e]));
  }
  takeReturn(t, s, e) {
    let i = s ?? "",
      n = this.#e.get(i);
    if (n?.has(e) !== !0 || t.awayEpisode(e) !== void 0) return;
    let takeBackNote = t.takeBackNote(e);
    if (takeBackNote?.toldModel === !0) {
      let r = this.#t.keys().next().value;
      if (!this.#t.has(e) && this.#t.size >= 256 && r !== void 0) this.#t.delete(r);
      this.#t.set(e, takeBackNote);
    }
    let o = this.#t.get(e);
    if (o === void 0) return;
    return (this.#i(i, n, e), o.sinceHeardMs);
  }
  clear() {
    (this.#t.clear(), this.#e.clear());
  }
  #i(t, s, e) {
    if ((s.delete(e), s.size === 0)) this.#e.delete(t);
  }
  #n(t) {
    if (this.#s) return;
    ((this.#s = !0),
      t.onAwayEpisodeDropped((s) => {
        this.#t.delete(s);
        for (let [e, i] of [...this.#e]) this.#i(e, i, s);
      }));
  }
}

export { AwayEpisodeTracker };
