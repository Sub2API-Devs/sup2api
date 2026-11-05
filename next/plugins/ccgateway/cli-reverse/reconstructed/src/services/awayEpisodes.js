/**
 * services/awayEpisodes.ts
 *
 * 2.1.316 新增：用户离开期间的事件段记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gcmgcxyg.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-gcmgcxyg.js:191-1057 placement
/**
 * 跟踪"用户离开"期间告诉过模型的远程主机：told 记录某会话下被告知离开的主机；takeReturn 在主机回来时取出一次返回提示（离开时长），并在离开记录被丢弃时同步清理。
 */
class AwayEpisodeTracker {
  #t = new Map();
  #e = new Map();
  #s = false;
  told(session, projectKey, episodeId) {
    session.noteModelToldAway(episodeId);
    if (session.awayEpisode(episodeId) === undefined) return;
    this.#n(session);
    let storedProjectKey = projectKey ?? "";
    let knownEpisodes = this.#e.get(storedProjectKey);
    if (knownEpisodes !== undefined) {
      knownEpisodes.add(episodeId);
      return;
    }
    let found = [...this.#e.keys()].find((key) => key !== "");
    if (this.#e.size >= 64 && found !== undefined) this.#e.delete(found);
    this.#e.set(storedProjectKey, new Set([episodeId]));
  }
  takeReturn(session, projectKey, episodeId) {
    let storedProjectKey = projectKey ?? "";
    let knownEpisodes = this.#e.get(storedProjectKey);
    if (knownEpisodes?.has(episodeId) !== true || session.awayEpisode(episodeId) !== undefined) return;
    let note = session.takeBackNote(episodeId);
    if (note?.toldModel === true) {
      let oldestEpisodeId = this.#t.keys().next().value;
      if (!this.#t.has(episodeId) && this.#t.size >= 256 && oldestEpisodeId !== undefined)
        this.#t.delete(oldestEpisodeId);
      this.#t.set(episodeId, note);
    }
    let storedNote = this.#t.get(episodeId);
    if (storedNote === undefined) return;
    this.#i(storedProjectKey, knownEpisodes, episodeId);
    return storedNote.sinceHeardMs;
  }
  clear() {
    this.#t.clear();
    this.#e.clear();
  }
  #i(projectKey, knownEpisodes, episodeId) {
    knownEpisodes.delete(episodeId);
    if (knownEpisodes.size === 0) this.#e.delete(projectKey);
  }
  #n(session) {
    if (this.#s) return;
    this.#s = true;
    session.onAwayEpisodeDropped((droppedEpisodeId) => {
      this.#t.delete(droppedEpisodeId);
      for (let [projectKey, knownEpisodes] of [...this.#e])
        this.#i(projectKey, knownEpisodes, droppedEpisodeId);
    });
  }
}
export { AwayEpisodeTracker };
