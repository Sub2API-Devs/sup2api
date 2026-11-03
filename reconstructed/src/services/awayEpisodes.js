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

//@ chunk-21z2m00n.js:191-1057 placement
/**
 * 跟踪"用户离开"期间告诉过模型的远程主机：told 记录某会话下被告知离开的主机；takeReturn 在主机回来时取出一次返回提示（离开时长），并在离开记录被丢弃时同步清理。
 */
class AwayEpisodeTracker {
  #t = new Map();
  #e = new Map();
  #s = false;
  told(t, s, e) {
    t.noteModelToldAway(e);
    if (t.awayEpisode(e) === undefined) return;
    this.#n(t);
    let i = s ?? "";
    let n = this.#e.get(i);
    if (n !== undefined) {
      n.add(e);
      return;
    }
    let found = [...this.#e.keys()].find((key) => key !== "");
    if (this.#e.size >= 64 && found !== undefined) this.#e.delete(found);
    this.#e.set(i, new Set([e]));
  }
  takeReturn(t, s, e) {
    let i = s ?? "";
    let n = this.#e.get(i);
    if (n?.has(e) !== true || t.awayEpisode(e) !== undefined) return;
    let d = t.takeBackNote(e);
    if (d?.toldModel === true) {
      let r = this.#t.keys().next().value;
      if (!this.#t.has(e) && this.#t.size >= 256 && r !== undefined) this.#t.delete(r);
      this.#t.set(e, d);
    }
    let o = this.#t.get(e);
    if (o === undefined) return;
    this.#i(i, n, e);
    return o.sinceHeardMs;
  }
  clear() {
    this.#t.clear();
    this.#e.clear();
  }
  #i(t, s, e) {
    s.delete(e);
    if (s.size === 0) this.#e.delete(t);
  }
  #n(t) {
    if (this.#s) return;
    this.#s = true;
    t.onAwayEpisodeDropped((s) => {
      this.#t.delete(s);
      for (let [e, i] of [...this.#e]) this.#i(e, i, s);
    });
  }
}
export { AwayEpisodeTracker };
