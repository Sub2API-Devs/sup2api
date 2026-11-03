/**
 * utils/swarm/selfPostCounter.ts
 *
 * 2.1.316 新增：自发消息计数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0z70g9af.js (2)
 * attribution: placement 2
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-0z70g9af.js:227-818 placement
class SelfPostCounter {
  #t = new Map();
  #n = 0;
  onCleared = null;
  notePost(t) {
    this.#t.set(t, (this.#t.get(t) ?? 0) + 1);
    this.#n++;
  }
  forgetPost(t) {
    let n = this.#t.get(t) ?? 0;
    if (n <= 1) this.#t.delete(t);
    else this.#t.set(t, n - 1);
    this.#n = Math.max(0, this.#n - 1);
  }
  atBound(t, n) {
    return this.postsSinceHumanTurn(t) >= n.maxSelfHops || this.#n >= n.maxChainLength;
  }
  seed(t, n) {
    this.#t.clear();
    for (let [e, o] of t) this.#t.set(e, o);
    this.#n = n;
  }
  noteHumanTurn() {
    let t = this.#n > 0;
    this.#t.clear();
    this.#n = 0;
    if (t) this.onCleared?.();
  }
  peersPostedTo() {
    return [...this.#t.keys()];
  }
  postsSinceHumanTurn(t) {
    return this.#t.get(t) ?? 0;
  }
  totalPostsSinceHumanTurn() {
    return this.#n;
  }
}
//@ chunk-0z70g9af.js:818-842 placement
var selfPostCounterBySessionRoot = new SessionRootSlot(() => new SelfPostCounter());
