/**
 * @anthropic-ai/sdk/tools/agent-toolset/skills.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (13)
 * attribution: esm-fingerprint 13
 */
import * as hat from "fs";
import * as Fns from "util";
import * as $ns from "child_process";
import * as zp from "path";
import * as lZr from "stream";
import { Tb } from "../../internal/utils/log.mjs";
import { z, G } from "./fs-util.mjs";
import { pr } from "../../core/error.mjs";

//@ chunk-2cw52qnf.js:2868-2918 esm-fingerprint
var promises_2 = hat.promises,
  promisify = Fns.promisify($ns.execFile);
//@ chunk-2cw52qnf.js:2918-4208 esm-fingerprint
async function ut(r) {
  let { client: client, sessionId: sessionId } = r;
  if (!client) return async () => {};
  let n = Tb(client),
    session = r.session;
  if (!session) {
    if (sessionId === void 0) return async () => {};
    (n.warn(
      "AgentToolContext.sessionId is deprecated and costs an extra session fetch; fetch the session once and set `session` instead",
      { component: "agent-tool-context" },
    ),
      (session = await client.beta.sessions.retrieve(sessionId)));
  }
  let resolved = zp.resolve(r.workdir, "skills"),
    s = [];
  for (let skill of session.agent.skills)
    try {
      let retrieve = await client.beta.skills.versions.retrieve(skill.version, { skill_id: skill.skill_id }),
        base = zp.basename(retrieve.name.trim());
      if (base === "" || base === "." || base === "..") base = skill.skill_id;
      let resolved_2 = zp.resolve(resolved, base);
      if (resolved_2 !== resolved && !resolved_2.startsWith(resolved + zp.sep)) {
        n.warn("skill name escapes the skills dir; skipping", {
          component: "agent-tool-context",
          name: retrieve.name,
        });
        continue;
      }
      let download = await client.beta.skills.versions.download(retrieve.id, { skill_id: skill.skill_id });
      (await promises_2.rm(resolved_2, { recursive: !0, force: !0 }),
        await promises_2.mkdir(resolved_2, { recursive: !0, mode: z }),
        s.push(resolved_2),
        await Te(download, resolved_2),
        n.info("downloaded skill", {
          component: "agent-tool-context",
          skill_id: skill.skill_id,
          version: retrieve.id,
          dest: resolved_2,
        }));
    } catch (error) {
      n.warn("failed to download skill", {
        component: "agent-tool-context",
        skill_id: skill.skill_id,
        error: String(error),
      });
    }
  return async () => {
    for (let a of s)
      await promises_2.rm(a, { recursive: !0, force: !0 }).catch((l) => {
        n.warn("failed to clean up skill", { component: "agent-tool-context", dest: a, error: String(l) });
      });
  };
}
//@ chunk-2cw52qnf.js:4208-4387 esm-fingerprint
function pt(r) {
  for (let e of r) {
    let trimmed = e.trim();
    if (!trimmed) continue;
    if (zp.isAbsolute(trimmed) || trimmed.split(/[\\/]/).includes(".."))
      throw new pr(`refusing to extract unsafe archive member: ${trimmed}`);
  }
}
//@ chunk-2cw52qnf.js:4387-4516 esm-fingerprint
var we = "skill archive listing is inconsistent; refusing to extract",
  yt = { unzip: new Set(["-", "d", "?"]), tar: new Set(["-", "d", "C"]) };
//@ chunk-2cw52qnf.js:4516-4589 esm-fingerprint
function Ne(r) {
  let parts = r.split(`
`);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}
//@ chunk-2cw52qnf.js:4589-4691 esm-fingerprint
function wt(r, e) {
  return /^[\x20-\x7E]+$/.test(e) && !/[\\^#]/.test(e) && !(r === "unzip" && e.startsWith("-"));
}
//@ chunk-2cw52qnf.js:4691-4995 esm-fingerprint
function _t(r, e, t) {
  let n = Ne(e),
    i = Ne(t);
  if (n.length !== i.length) throw new pr(we);
  let o = [],
    s = [];
  return (
    n.forEach((a, l) => {
      if (yt[r].has(i[l].charAt(0))) {
        o.push(a);
        return;
      }
      if (!wt(r, a))
        throw new pr(`refusing to extract archive: cannot safely exclude member ${JSON.stringify(a)}`);
      s.push(a);
    }),
    { plain: o, special: s }
  );
}
//@ chunk-2cw52qnf.js:4995-5151 esm-fingerprint
async function Re(r) {
  for (let e of await promises_2.readdir(r, { withFileTypes: !0 }))
    if (e.isDirectory()) await Re(zp.join(r, e.name));
    else if (!e.isFile()) throw new pr(we);
}
//@ chunk-2cw52qnf.js:5151-5345 esm-fingerprint
async function ye(r, e) {
  try {
    let { stdout: stdout } = await promisify(r, e);
    return stdout;
  } catch (error) {
    if (G(error) === "ENOENT")
      throw new pr(`skill extraction requires the \`${r}\` command, but it was not found on PATH`);
    throw error;
  }
}
//@ chunk-2cw52qnf.js:5345-5564 esm-fingerprint
function gt(r) {
  let e,
    t = !1;
  for (let n of r) {
    let filtered = n
      .trim()
      .split("/")
      .filter((s) => s !== "" && s !== ".");
    if (filtered.length === 0) continue;
    let o = filtered[0];
    if (e === void 0) e = o;
    else if (o !== e) return "";
    if (filtered.length > 1) t = !0;
  }
  return e !== void 0 && t ? e : "";
}
//@ chunk-2cw52qnf.js:5564-6524 esm-fingerprint
async function Te(r, e) {
  let joined = zp.join(e, `.skill-archive-${process.pid}-${Date.now()}`);
  if (!r.body) throw new pr("skill download response had no body");
  await lZr.promises.pipeline(lZr.Readable.fromWeb(r.body), hat.createWriteStream(joined));
  let joined_2 = zp.join(zp.dirname(e), `.skill-stage-${process.pid}-${Date.now()}`),
    joined_3 = zp.join(zp.dirname(e), `.skill-exclude-${process.pid}-${Date.now()}`);
  try {
    let o = await Et(joined, 4),
      s = o.length >= 4 && o[0] === 80 && o[1] === 75 && o[2] === 3 && o[3] === 4,
      a = s ? "unzip" : "tar",
      l = await ye(a, s ? ["-Z1", joined] : ["-tf", joined]),
      f = await ye(a, s ? ["-Z", "--h", "--t", joined] : ["-tvf", joined]),
      { plain: plain, special: special } = _t(a, l, f);
    pt([...plain, ...special]);
    let y = gt(plain);
    if ((await promises_2.mkdir(joined_2, { recursive: !0, mode: z }), plain.length > 0))
      await ye(a, await St(a, joined, joined_2, special, joined_3));
    await Re(joined_2);
    let O = y ? zp.join(joined_2, y) : joined_2,
      v = await promises_2.readdir(O).catch((M) => {
        throw G(M) === "ENOENT" ? new pr(we) : M;
      });
    for (let M of v) await promises_2.rename(zp.join(O, M), zp.join(e, M));
  } finally {
    (await promises_2.rm(joined, { force: !0 }),
      await promises_2.rm(joined_3, { force: !0 }),
      await promises_2.rm(joined_2, { recursive: !0, force: !0 }));
  }
}
//@ chunk-2cw52qnf.js:6524-6795 esm-fingerprint
async function St(r, e, t, n, i) {
  let mapped = n.map((s) => s.replace(/[*?[\\]/g, "\\$&"));
  if (r === "unzip") return ["-oq", e, "-d", t, ...(mapped.length > 0 ? ["-x", ...mapped] : [])];
  if (mapped.length === 0) return ["-xf", e, "-C", t];
  return (
    await promises_2.writeFile(
      i,
      mapped.join(`
`) +
        `
`,
      { flag: "wx", mode: 384 },
    ),
    ["-xf", e, "-C", t, "-X", i]
  );
}
//@ chunk-2cw52qnf.js:6795-6954 esm-fingerprint
async function Et(r, e) {
  let open = await promises_2.open(r, "r");
  try {
    let alloc = Buffer.alloc(e),
      { bytesRead: bytesRead } = await open.read(alloc, 0, e, 0);
    return alloc.subarray(0, bytesRead);
  } finally {
    await open.close();
  }
}
