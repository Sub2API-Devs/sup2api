// worker_threads 入口：apply.mjs / alpha-check.mjs 的并行任务。
// workerData = { plan, opts }（rename 用）。消息 { op, args } → { result } 或 { error }。
import fs from 'node:fs';
import path from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import { readText, tryParse } from './parse.mjs';
import { analyze } from './scope.mjs';
import { factsFromAnalysis } from './global.mjs';
import { renameAnalyzed, toEntry } from './rename.mjs';
import { compareModule } from './alpha.mjs';

const OPS = {
  facts({ root, file }) {
    const { text } = readText(path.join(root, file));
    const p = tryParse(text);
    if (p.error) return { file, passthrough: p.error };
    const an = analyze(p.ast, text);
    return { file, facts: factsFromAnalysis(file, an, text), bindings: an.bindings.length };
  },
  rename({ root, out, file, entry }) {
    const { text } = readText(path.join(root, file));
    const p = tryParse(text);
    const dst = path.join(out, file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (p.error) {
      fs.copyFileSync(path.join(root, file), dst);
      return { file, passthrough: p.error };
    }
    const an = analyze(p.ast, text);
    const r = renameAnalyzed(file, text, an, toEntry(entry), workerData?.plan ?? null, workerData?.opts ?? {});
    fs.writeFileSync(dst, r.code, 'utf8');
    return {
      file,
      stats: r.stats,
      renamed: workerData?.opts?.listRenamed ? r.renamed : undefined,
      conflicts: r.conflicts,
      rejected: r.rejected,
      warnings: r.warnings,
      directEvals: r.directEvals,
      annexB: r.annexB,
    };
  },
  compare({ dirA, dirB, file }) {
    const a = readText(path.join(dirA, file));
    const b = readText(path.join(dirB, file));
    const identical = a.buf.equals(b.buf);
    const pa = tryParse(a.text);
    if (pa.error) return { file, passthrough: pa.error, identical, ok: identical, diffs: identical ? [] : [{ kind: 'bytes', msg: 'unparseable module must be byte-identical' }] };
    if (b.text === null) return { file, identical, ok: false, diffs: [{ kind: 'utf8', msg: 'B is not valid UTF-8' }] };
    const r = compareModule(file, a.text, b.text);
    r.identical = identical;
    return r;
  },
};

parentPort.on('message', ({ op, args }) => {
  try {
    parentPort.postMessage({ result: OPS[op](args) });
  } catch (e) {
    parentPort.postMessage({ error: e && e.stack ? e.stack : String(e) });
  }
});
