/**
 * @anthropic-ai/sdk/tools/agent-toolset/skills.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-m6wtswwx.js (13)
 * attribution: esm-fingerprint 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as Jpt from "fs";
import * as USs from "util";
import * as FSs from "child_process";
import * as Nm from "path";
import * as Qpo from "stream";
import { loggerFor } from "../../internal/utils/log.mjs";
import { DIR_CREATE_MODE, errnoCode } from "./fs-util.mjs";
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-m6wtswwx.js:2868-2918 esm-fingerprint
var fs_2 = Jpt.promises;
var execFileAsync = USs.promisify(FSs.execFile);
//@ chunk-m6wtswwx.js:2918-4208 esm-fingerprint
async function setupSkills(ctx) {
  let { client, sessionId } = ctx;
  if (!client) return async () => {};
  let log = loggerFor(client);
  let session = ctx.session;
  if (!session) {
    if (sessionId === undefined) return async () => {};
    log.warn(
      "AgentToolContext.sessionId is deprecated and costs an extra session fetch; fetch the session once and set `session` instead",
      {
        component: "agent-tool-context",
      },
    );
    session = await client.beta.sessions.retrieve(sessionId);
  }
  let skillsRoot = Nm.resolve(ctx.workdir, "skills");
  let created = [];
  for (let skill of session.agent.skills)
    try {
      let version = await client.beta.skills.versions.retrieve(skill.version, {
        skill_id: skill.skill_id,
      });
      let dirname = Nm.basename(version.name.trim());
      if (dirname === "" || dirname === "." || dirname === "..") dirname = skill.skill_id;
      let dest = Nm.resolve(skillsRoot, dirname);
      if (dest !== skillsRoot && !dest.startsWith(skillsRoot + Nm.sep)) {
        log.warn("skill name escapes the skills dir; skipping", {
          component: "agent-tool-context",
          name: version.name,
        });
        continue;
      }
      let resp = await client.beta.skills.versions.download(version.id, {
        skill_id: skill.skill_id,
      });
      await fs_2.rm(dest, {
        recursive: true,
        force: true,
      });
      await fs_2.mkdir(dest, {
        recursive: true,
        mode: DIR_CREATE_MODE,
      });
      created.push(dest);
      await extractSkillArchive(resp, dest);
      log.info("downloaded skill", {
        component: "agent-tool-context",
        skill_id: skill.skill_id,
        version: version.id,
        dest,
      });
    } catch (e) {
      log.warn("failed to download skill", {
        component: "agent-tool-context",
        skill_id: skill.skill_id,
        error: String(e),
      });
    }
  return async () => {
    for (let dest of created)
      await fs_2
        .rm(dest, {
          recursive: true,
          force: true,
        })
        .catch((e) => {
          log.warn("failed to clean up skill", {
            component: "agent-tool-context",
            dest,
            error: String(e),
          });
        });
  };
}
//@ chunk-m6wtswwx.js:4208-4387 esm-fingerprint
function assertSafeMemberNames(names) {
  for (let raw of names) {
    let entry = raw.trim();
    if (!entry) continue;
    if (Nm.isAbsolute(entry) || entry.split(/[\\/]/).includes(".."))
      throw new AnthropicError(`refusing to extract unsafe archive member: ${entry}`);
  }
}
//@ chunk-m6wtswwx.js:4387-4516 esm-fingerprint
var INCONSISTENT_LISTING = "skill archive listing is inconsistent; refusing to extract";
var PLAIN_TYPE_CHARS = {
  unzip: new Set(["-", "d", "?"]),
  tar: new Set(["-", "d", "C"]),
};
//@ chunk-m6wtswwx.js:4516-4589 esm-fingerprint
function listingLines(listing) {
  let lines = listing.split(`
`);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}
//@ chunk-m6wtswwx.js:4589-4691 esm-fingerprint
function canExcludeVerbatim(cmd, name) {
  return /^[\x20-\x7E]+$/.test(name) && !/[\\^#]/.test(name) && !(cmd === "unzip" && name.startsWith("-"));
}
//@ chunk-m6wtswwx.js:4691-4995 esm-fingerprint
function classifyArchiveListing(cmd, names, typed) {
  let nameLines = listingLines(names);
  let typedLines = listingLines(typed);
  if (nameLines.length !== typedLines.length) throw new AnthropicError(INCONSISTENT_LISTING);
  let plain = [];
  let special = [];
  nameLines.forEach((name, i) => {
    if (PLAIN_TYPE_CHARS[cmd].has(typedLines[i].charAt(0))) {
      plain.push(name);
      return;
    }
    if (!canExcludeVerbatim(cmd, name))
      throw new AnthropicError(
        `refusing to extract archive: cannot safely exclude member ${JSON.stringify(name)}`,
      );
    special.push(name);
  });
  return {
    plain,
    special,
  };
}
//@ chunk-m6wtswwx.js:4995-5151 esm-fingerprint
async function assertOnlyPlainEntries(dir) {
  for (let entry of await fs_2.readdir(dir, {
    withFileTypes: true,
  }))
    if (entry.isDirectory()) await assertOnlyPlainEntries(Nm.join(dir, entry.name));
    else if (!entry.isFile()) throw new AnthropicError(INCONSISTENT_LISTING);
}
//@ chunk-m6wtswwx.js:5151-5345 esm-fingerprint
async function runArchiveTool(cmd, args) {
  try {
    let { stdout } = await execFileAsync(cmd, args);
    return stdout;
  } catch (e) {
    if (errnoCode(e) === "ENOENT")
      throw new AnthropicError(
        `skill extraction requires the \`${cmd}\` command, but it was not found on PATH`,
      );
    throw e;
  }
}
//@ chunk-m6wtswwx.js:5345-5564 esm-fingerprint
function archiveTopDir(names) {
  let top;
  let nested = false;
  for (let raw of names) {
    let parts = raw
      .trim()
      .split("/")
      .filter((p) => p !== "" && p !== ".");
    if (parts.length === 0) continue;
    let first = parts[0];
    if (top === undefined) top = first;
    else if (first !== top) return "";
    if (parts.length > 1) nested = true;
  }
  return top !== undefined && nested ? top : "";
}
//@ chunk-m6wtswwx.js:5564-6524 esm-fingerprint
async function extractSkillArchive(resp, dest) {
  let tmp = Nm.join(dest, `.skill-archive-${process.pid}-${Date.now()}`);
  if (!resp.body) throw new AnthropicError("skill download response had no body");
  await Qpo.promises.pipeline(Qpo.Readable.fromWeb(resp.body), Jpt.createWriteStream(tmp));
  let stage = Nm.join(Nm.dirname(dest), `.skill-stage-${process.pid}-${Date.now()}`);
  let excludeFile = Nm.join(Nm.dirname(dest), `.skill-exclude-${process.pid}-${Date.now()}`);
  try {
    let head = await readHead(tmp, 4);
    let isZip = head.length >= 4 && head[0] === 80 && head[1] === 75 && head[2] === 3 && head[3] === 4;
    let archiveCmd = isZip ? "unzip" : "tar";
    let names = await runArchiveTool(archiveCmd, isZip ? ["-Z1", tmp] : ["-tf", tmp]);
    let typed = await runArchiveTool(archiveCmd, isZip ? ["-Z", "--h", "--t", tmp] : ["-tvf", tmp]);
    let { plain, special } = classifyArchiveListing(archiveCmd, names, typed);
    assertSafeMemberNames([...plain, ...special]);
    let top = archiveTopDir(plain);
    await fs_2.mkdir(stage, {
      recursive: true,
      mode: DIR_CREATE_MODE,
    });
    if (plain.length > 0)
      await runArchiveTool(archiveCmd, await extractArgs(archiveCmd, tmp, stage, special, excludeFile));
    await assertOnlyPlainEntries(stage);
    let srcRoot = top ? Nm.join(stage, top) : stage;
    let entries = await fs_2.readdir(srcRoot).catch((e) => {
      throw errnoCode(e) === "ENOENT" ? new AnthropicError(INCONSISTENT_LISTING) : e;
    });
    for (let entry of entries) await fs_2.rename(Nm.join(srcRoot, entry), Nm.join(dest, entry));
  } finally {
    await fs_2.rm(tmp, {
      force: true,
    });
    await fs_2.rm(excludeFile, {
      force: true,
    });
    await fs_2.rm(stage, {
      recursive: true,
      force: true,
    });
  }
}
//@ chunk-m6wtswwx.js:6524-6795 esm-fingerprint
async function extractArgs(cmd, archive, stage, special, excludeFile) {
  let patterns = special.map((name) => name.replace(/[*?[\\]/g, "\\$&"));
  if (cmd === "unzip")
    return ["-oq", archive, "-d", stage, ...(patterns.length > 0 ? ["-x", ...patterns] : [])];
  if (patterns.length === 0) return ["-xf", archive, "-C", stage];
  await fs_2.writeFile(
    excludeFile,
    patterns.join(`
`) +
      `
`,
    {
      flag: "wx",
      mode: 384,
    },
  );
  return ["-xf", archive, "-C", stage, "-X", excludeFile];
}
//@ chunk-m6wtswwx.js:6795-6954 esm-fingerprint
async function readHead(file, n_2) {
  let handle = await fs_2.open(file, "r");
  try {
    let buf = Buffer.alloc(n_2);
    let { bytesRead } = await handle.read(buf, 0, n_2, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}
export { setupSkills };
