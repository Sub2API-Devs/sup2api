// bun-ant-shim.js 的自检（用 Bun 运行）：bun tools/verify/bun-ant-shim-selftest.js
// 检查 segment / paint / setCell 的约定（来自 original 调用方，见 bun-ant-shim.js 文件头）是否满足：
//   宽度与 Bun.stringWidth 一致、SGR 与 OSC 8 链接切成样式段、宽字符后跟 spacerTail、行尾放不下的宽字符写 spacerHead、
//   制表符展开到制表位、缓冲不足时返回负数、打包返回值的三个字段。
// 只能证明"垫片自洽且符合调用方约定"，不能证明与官方原生实现逐格相同。
require('./bun-ant-shim.js');
const S = { widthMask: 3, narrow: 0, wide: 1, spacerTail: 2, spacerHead: 3, emptyCharIndex: 0, spacerCharIndex: 1, emptyWord: 0, tabWidth: 8 };
const seg = new Bun.ant.CellSegmenter({ ambiguousIsNarrow: true, substitute: [[1564, 1564], [8234, 8238], [8294, 8297]], screen: S });
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const cells = new Int32Array(512), runs = new Int32Array(512);
const cellsOf = (text) => {
  const n = seg.segment(text, cells, runs, false);
  return Array.from({ length: n }, (_, i) => ({ g: seg.graphemes[cells[2 * i]], w: cells[2 * i + 1] & 255, tab: !!(cells[2 * i + 1] & 256), run: cells[2 * i + 1] >>> 10 }));
};
for (const t of ['hello', '你好', 'ＡＢＣ', '😀👍', '👍🏽', 'é', 'é', '🇨🇳', 'a​b']) {
  const c = cellsOf(t);
  ok(c.reduce((n, x) => n + x.w, 0) === Bun.stringWidth(t, { ambiguousIsNarrow: true }), `width(${JSON.stringify(t)}) = ${Bun.stringWidth(t, { ambiguousIsNarrow: true })}`);
}
{
  const c = cellsOf('a\x1b[1mb\x1b[22mc');
  ok(c.length === 3 && c[0].run === 0 && c[1].run === 1 && c[2].run === 2, 'SGR 切成 3 个样式段');
  ok(seg.sgrKeys[runs[2]] === '\x1b[1m' && seg.sgrCloseKeys[runs[2]] === '\x1b[22m', 'sgrKeys / sgrCloseKeys');
}
{
  const c = cellsOf('x\x1b]8;;https://e.x\x07L\x1b]8;;\x07y');
  ok(c.length === 3 && seg.uris[runs[2 * c[1].run + 1]] === 'https://e.x' && runs[2 * c[2].run + 1] === 0, 'OSC 8 链接段');
}
ok(cellsOf('a\x1b[2Kb\x1b[?25lc').map((x) => x.g).join('') === 'abc', '跳过非 SGR 的 CSI');
ok(cellsOf('؜a‪b').map((x) => x.g).join('') === 'ab', 'substitute 范围内的码点被丢弃');
ok(cellsOf('a\tb')[1].tab === true, '制表符标志 256');
ok(seg.segment('x'.repeat(300), new Int32Array(10), new Int32Array(10), false) < 0, '缓冲不足返回负数');
{
  const W = 10, sc = new Int32Array(W * 2 * 2);
  const text = 'a你\tb';
  const n = seg.segment(text, cells, runs, false);
  const charIdx = new Int32Array(seg.graphemes.length).map((_, i) => 100 + i);
  const words = new Int32Array(64);
  const packed = seg.paint(sc, W, 0, 0, cells, n, undefined, charIdx, words);
  const end = packed % 1048576, lo = Math.floor(packed / 1048576) % 65536, hi = Math.floor(packed / 68719476736);
  const kinds = Array.from({ length: W }, (_, x) => sc[2 * x + 1] & 3);
  ok(kinds[1] === S.wide && kinds[2] === S.spacerTail && sc[4] === S.spacerCharIndex, '宽字符 + spacerTail');
  ok(end === 9, `制表符展开到第 8 列后写 b，结束列 9（得到 ${end}）`);
  ok(lo === 0 && hi === 9, `damage 列 [0,9)（得到 [${lo},${hi})）`);
  const sc2 = new Int32Array(4 * 2);
  const n2 = seg.segment('ab你', cells, runs, false);
  const p2 = seg.paint(sc2, 3, 0, 0, cells, n2, undefined, charIdx, words);
  ok((sc2[5] & 3) === S.spacerHead && p2 % 1048576 === 3, '最后一列放不下宽字符：写 spacerHead');
  const p3 = seg.setCell(sc2, 3, 0, 0, 7, (5 << 17) | S.wide);
  ok(sc2[0] === 7 && (sc2[1] & 3) === S.wide && (sc2[3] & 3) === S.spacerTail && p3 % 1048576 === 2, 'setCell 写宽字符');
}
console.log(fails ? `${fails} 项失败` : '全部通过');
process.exit(fails ? 1 : 0);
