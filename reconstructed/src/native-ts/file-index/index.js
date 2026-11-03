/**
 * native-ts/file-index/index.ts
 *
 * 并入已有模块：让出事件循环一次（setImmediate 或 MessageChannel）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/native-ts/file-index/index.ts
 * pieces: chunk-dcmhvw5a.js (11)
 * attribution: placement 1, layout 7, fingerprint 2, file-local 1
 */
import { sleep } from "../../utils/sleep.js";

/**
 * 让出事件循环一次（setImmediate 或 MessageChannel）。
 */
//@ chunk-dcmhvw5a.js:44768-45031 placement
function yieldToEventLoop() {
  if (typeof setImmediate === "function") return new Promise((e) => setImmediate(e));
  if (typeof MessageChannel === "function")
    return new Promise((e) => {
      let messageChannel = new MessageChannel();
      ((messageChannel.port1.onmessage = () => {
        (messageChannel.port1.close(), e());
      }),
        messageChannel.port2.postMessage(null));
    });
  return sleep(0);
}
/**
 * 模糊匹配打分常量（nucleo/fzf 风格）：每字匹配 16、边界后 8、驼峰 6、连续 4、首字符 8、间隙起始 -3 与每字 -1；空查询时最多返回 100 个顶层条目；查询最多取 64 字符；异步建索引每 4ms 让出一次事件循环。
 */
//@ chunk-dcmhvw5a.js:45031-45090 layout
var SCORE_MATCH = 16,
  BONUS_BOUNDARY = 8,
  BONUS_CAMEL = 6,
  BONUS_CONSECUTIVE = 4,
  BONUS_FIRST_CHAR = 8,
  PENALTY_GAP_START = 3,
  PENALTY_GAP_EXTENSION = 1,
  TOP_LEVEL_CACHE_LIMIT = 100,
  MAX_QUERY_LEN = 64,
  CHUNK_MS = 4;
/**
 * 文件路径模糊搜索索引（2.1.88 中替代原生 Rust 实现的 TS 版）：每个路径存小写形式、a-z 位图（快速排除不含查询字母的路径）、长度、文件名起点及文件名位图。search：位图过滤后贪心找子序列，计算连续/间隙得分，路径与文件名两种匹配取高者，加边界/驼峰加分与短路径加分，维护大小为 limit 的有序 top-k；最后按名次归一化成 0..1 分数（含 test 的路径略降权）并给出匹配位置。异步构建时分片让出事件循环，部分就绪即可查询。
 */
//@ chunk-dcmhvw5a.js:45090-48582 fingerprint = FileIndex (0.826)
class FileIndex {
  paths = [];
  lowerPaths = [];
  charBits = new Int32Array(0);
  pathLens = new Uint16Array(0);
  nameStarts = new Uint16Array(0);
  nameCharBits = new Int32Array(0);
  topLevelCache = null;
  matchPositions = new Int32Array(MAX_QUERY_LEN);
  nameMatchPositions = new Int32Array(MAX_QUERY_LEN);
  readyCount = 0;
  buildGen = 0;
  loadFromFileList(e) {
    let n = new Set(),
      r = [];
    for (let s of e) if (s.length > 0 && !n.has(s)) (n.add(s), r.push(s));
    this.buildIndex(r);
  }
  loadFromFileListAsync(e) {
    let n = () => {},
      promise = new Promise((a) => {
        n = a;
      }),
      async = this.buildAsync(e, n);
    return { queryable: promise, done: async };
  }
  async buildAsync(e, n) {
    let r = ++this.buildGen,
      s = new Set(),
      a = [],
      startTime = performance.now();
    for (let m = 0; m < e.length; m++) {
      let f = e[m];
      if (f.length > 0 && !s.has(f)) (s.add(f), a.push(f));
      if ((m & 255) === 255 && performance.now() - startTime > CHUNK_MS) {
        if ((await yieldToEventLoop(), this.buildGen !== r)) return (n(), !1);
        startTime = performance.now();
      }
    }
    (this.resetArrays(a), (startTime = performance.now()));
    let g = !0;
    for (let m = 0; m < a.length; m++)
      if ((this.indexPath(m), (m & 255) === 255 && performance.now() - startTime > CHUNK_MS)) {
        if (((this.readyCount = m + 1), g)) (n(), (g = !1));
        if ((await yieldToEventLoop(), this.buildGen !== r)) return !1;
        startTime = performance.now();
      }
    return ((this.readyCount = a.length), n(), !0);
  }
  buildIndex(e) {
    (this.buildGen++, this.resetArrays(e));
    for (let n = 0; n < e.length; n++) this.indexPath(n);
    this.readyCount = e.length;
  }
  resetArrays(e) {
    let n = e.length;
    ((this.paths = e),
      (this.lowerPaths = Array(n)),
      (this.charBits = new Int32Array(n)),
      (this.pathLens = new Uint16Array(n)),
      (this.nameStarts = new Uint16Array(n)),
      (this.nameCharBits = new Int32Array(n)),
      (this.readyCount = 0),
      (this.topLevelCache = computeTopLevelEntries(e, TOP_LEVEL_CACHE_LIMIT)));
  }
  indexPath(e) {
    let lower = this.paths[e].toLowerCase();
    this.lowerPaths[e] = lower;
    let r = lower.length;
    this.pathLens[e] = r;
    let s = 0,
      a = 0,
      c = 0;
    for (let g = 0; g < r; g++) {
      let code = lower.charCodeAt(g);
      if (code >= 97 && code <= 122) ((s |= 1 << (code - 97)), (c |= 1 << (code - 97)));
      else if ((code === 47 || code === 92) && g < r - 1) ((a = g + 1), (c = 0));
    }
    ((this.charBits[e] = s),
      (this.nameStarts[e] = r === this.paths[e].length ? a : 0),
      (this.nameCharBits[e] = c));
  }
  search(e, n) {
    if (n <= 0) return [];
    if (e.length === 0) {
      if (this.topLevelCache)
        return this.topLevelCache
          .slice(0, n)
          .map(({ path: path, score: score }) => ({ path: path, score: score, positions: [] }));
      return [];
    }
    let r = e !== e.toLowerCase(),
      s = r ? e : e.toLowerCase(),
      min = Math.min(s.length, MAX_QUERY_LEN),
      c = Array(min),
      g = 0;
    for (let Z = 0; Z < min; Z++) {
      let charAt = s.charAt(Z);
      c[Z] = charAt;
      let code = charAt.charCodeAt(0);
      if (code >= 97 && code <= 122) g |= 1 << (code - 97);
    }
    let m = min * (SCORE_MATCH + BONUS_BOUNDARY) + BONUS_FIRST_CHAR + 32,
      f = [],
      h = -1 / 0,
      {
        paths: paths,
        lowerPaths: lowerPaths,
        charBits: charBits,
        pathLens: pathLens,
        readyCount: readyCount,
      } = this,
      { nameStarts: nameStarts, nameCharBits: nameCharBits } = this,
      matchPositions = this.matchPositions,
      nameMatchPositions = this.nameMatchPositions;
    e: for (let Z = 0; Z < readyCount; Z++) {
      if ((charBits[Z] & g) !== g) continue;
      let ae = r ? paths[Z] : lowerPaths[Z],
        index = ae.indexOf(c[0]);
      if (index === -1) continue;
      matchPositions[0] = index;
      let he = 0,
        Re = 0,
        P = index;
      for (let de = 1; de < min; de++) {
        if (((index = ae.indexOf(c[de], P + 1)), index === -1)) continue e;
        matchPositions[de] = index;
        let Se = index - P - 1;
        if (Se === 0) Re += BONUS_CONSECUTIVE;
        else he += PENALTY_GAP_START + Se * PENALTY_GAP_EXTENSION;
        P = index;
      }
      let R = nameStarts[Z],
        N =
          he > 0 && matchPositions[0] < R && (nameCharBits[Z] & g) === g
            ? scoreNameMatch(ae, c, R, nameMatchPositions)
            : -1 / 0;
      if (f.length === n && m + Math.max(Re - he, N) <= h) continue;
      let G = paths[Z],
        Q = pathLens[Z],
        se = Re - he + sumBoundaryBonuses(G, matchPositions, min),
        ne = 0;
      if (N !== -1 / 0) {
        let de = N + sumBoundaryBonuses(G, nameMatchPositions, min);
        if (de >= se) ((se = de), (ne = R));
      }
      if (((se += min * SCORE_MATCH + Math.max(0, 32 - (Q >> 2))), f.length < n)) {
        if ((f.push({ pathIndex: Z, fuzzScore: se, scanFrom: ne }), f.length === n))
          (f.sort((de, Se) => de.fuzzScore - Se.fuzzScore), (h = f[0].fuzzScore));
      } else if (se > h) {
        let de = 0,
          Se = f.length;
        while (de < Se) {
          let xe = (de + Se) >> 1;
          if (f[xe].fuzzScore < se) de = xe + 1;
          else Se = xe;
        }
        (f.splice(de, 0, { pathIndex: Z, fuzzScore: se, scanFrom: ne }), f.shift(), (h = f[0].fuzzScore));
      }
    }
    f.sort((Z, ae) => ae.fuzzScore - Z.fuzzScore);
    let K = f.length,
      max = Math.max(K, 1),
      ee = Array(K);
    for (let Z = 0; Z < K; Z++) {
      let pathIndex = f[Z].pathIndex,
        me = paths[pathIndex],
        he = lowerPaths[pathIndex],
        Re = r ? me : he,
        P = Array(min),
        scanFrom = f[Z].scanFrom;
      for (let Q = 0; Q < min; Q++) {
        let index = Re.indexOf(c[Q], scanFrom);
        ((P[Q] = index), (scanFrom = index + 1));
      }
      if (!r && he.length !== me.length) mapLowerPositionsToOriginal(me, P);
      let N = Z / max,
        G = me.includes("test") ? Math.min(N * 1.05, 1) : N;
      ee[Z] = { path: me, score: G, positions: P };
    }
    return ee;
  }
}
//@ chunk-dcmhvw5a.js:48582-48754 layout
function scoreNameMatch(e, n, r, s) {
  let a = 0,
    c = r - 1;
  for (let g = 0; g < n.length; g++) {
    let index = e.indexOf(n[g], c + 1);
    if (index === -1) return -1 / 0;
    s[g] = index;
    let f = index - c - 1;
    if (g > 0) a += f === 0 ? BONUS_CONSECUTIVE : -(PENALTY_GAP_START + f * PENALTY_GAP_EXTENSION);
    c = index;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:48754-48839 layout
function sumBoundaryBonuses(e, n, r) {
  let s = scoreBonusAt(e, n[0], !0);
  for (let a = 1; a < r; a++) s += scoreBonusAt(e, n[a], !1);
  return s;
}
//@ chunk-dcmhvw5a.js:48839-48973 file-local
function scoreBonusAt(path, pos, first) {
  if (pos === 0) return first ? BONUS_FIRST_CHAR : 0;
  let prevCh = path.charCodeAt(pos - 1);
  if (isBoundaryChar(prevCh)) return BONUS_BOUNDARY;
  if (isLowerAscii(prevCh) && isUpperAscii(path.charCodeAt(pos))) return BONUS_CAMEL;
  return 0;
}
//@ chunk-dcmhvw5a.js:48973-49042 layout
function isBoundaryChar(e) {
  return e === 47 || e === 92 || e === 45 || e === 95 || e === 46 || e === 32;
}
//@ chunk-dcmhvw5a.js:49042-49078 layout
function isLowerAscii(e) {
  return e >= 97 && e <= 122;
}
//@ chunk-dcmhvw5a.js:49078-49113 layout
function isUpperAscii(e) {
  return e >= 65 && e <= 90;
}
//@ chunk-dcmhvw5a.js:49113-49309 layout
function mapLowerPositionsToOriginal(e, n) {
  let r = 0,
    s = 0,
    a = 0;
  while (a < n.length && r < e.length) {
    let codePoint = e.codePointAt(r),
      g = codePoint > 65535 ? 2 : 1,
      m = String.fromCodePoint(codePoint).toLowerCase().length;
    while (a < n.length && n[a] < s + m) ((n[a] = r), a++);
    ((r += g), (s += m));
  }
}
/**
 * 空查询时展示的顶层条目：各路径第一段去重（最多 limit 个），按长度再字典序排序。
 */
//@ chunk-dcmhvw5a.js:49309-49677 fingerprint = computeTopLevelEntries (0.74)
function computeTopLevelEntries(paths, limit) {
  let topLevel = new Set();
  for (let a of paths) {
    let end = a.length;
    for (let m = 0; m < a.length; m++) {
      let code = a.charCodeAt(m);
      if (code === 47 || code === 92) {
        end = m;
        break;
      }
    }
    let segment = a.slice(0, end);
    if (segment.length > 0) {
      if ((topLevel.add(segment), topLevel.size >= limit)) break;
    }
  }
  let sorted = Array.from(topLevel);
  return (
    sorted.sort((a, c) => {
      let lenDiff = a.length - c.length;
      if (lenDiff !== 0) return lenDiff;
      return a < c ? -1 : a > c ? 1 : 0;
    }),
    sorted.slice(0, limit).map((path) => ({ path: path, score: 0, positions: [] }))
  );
}

export { CHUNK_MS, yieldToEventLoop, FileIndex };
