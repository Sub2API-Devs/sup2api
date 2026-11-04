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
  notePost(agentId) {
    this.#t.set(agentId, (this.#t.get(agentId) ?? 0) + 1);
    this.#n++;
  }
  forgetPost(agentId) {
    let count = this.#t.get(agentId) ?? 0;
    if (count <= 1) this.#t.delete(agentId);
    else this.#t.set(agentId, count - 1);
    this.#n = Math.max(0, this.#n - 1);
  }
  atBound(agentId, bounds) {
    return this.postsSinceHumanTurn(agentId) >= bounds.maxSelfHops || this.#n >= bounds.maxChainLength;
  }
  seed(counts, total) {
    this.#t.clear();
    for (let [agentId, count] of counts) this.#t.set(agentId, count);
    this.#n = total;
  }
  noteHumanTurn() {
    let hadPosts = this.#n > 0;
    this.#t.clear();
    this.#n = 0;
    if (hadPosts) this.onCleared?.();
  }
  peersPostedTo() {
    return [...this.#t.keys()];
  }
  postsSinceHumanTurn(agentId) {
    return this.#t.get(agentId) ?? 0;
  }
  totalPostsSinceHumanTurn() {
    return this.#n;
  }
}
//@ chunk-0z70g9af.js:818-842 placement
var selfPostCounterBySessionRoot = new SessionRootSlot(() => new SelfPostCounter());
