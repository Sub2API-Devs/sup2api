# Worker 0.1.66 deployment — 2026-10-08

Status: Worker image and both existing account containers deployed and verified. Default image/controller configuration belongs to the API agent and is not claimed complete here.

Source: `56f93858ca7ab76ef9615baec6addf77e74ff205`, fetched by Git on cc-max into clean detached `/root/ccgateway-features-56f93858c`.

Purpose: retain authenticated inner CLI session-context suffixes inside tool results during strict client-history validation. Embedded Mod changes are included in the Worker binary.

Validation/build artifacts: `/opt/ccgateway-runtime/feature-validation-56f93858c`.

Execution is sequential with Go/container resources limited to 2 CPUs and 2 GiB. Planned account order is 22 then 21, atomic binary replacement and existing-container restart only. Existing image reference, volume, container identity and OAuth are preserved. Existing 0.1.65 binary is backed up under a new distinct path before mutation. Default image configuration and controller refresh belong to the API agent, after both accounts stabilize.


## Final artifacts

- Built binary: `/opt/ccgateway-runtime/feature-validation-56f93858c/worker`, SHA256 `51c09e8408e5e3ac0ac93e143dbdf83d07e8fe1d2c50de21140578298caee221`; Version 0.1.66 and full source revision.
- Image: `ccgateway-worker:0.1.66`, ID `sha256:85a6ff7e1570743e469760cc5b7a1d59512f4eeae25b75ff8dc5f19b47fe035e`, OCI revision `56f93858ca7ab76ef9615baec6addf77e74ff205`.
- Image internal `/usr/local/bin/worker` SHA256 `2b0113c4cf1d71f02666423c9569406db964719e9b1105cfb33daa5f3ef602a2`. Image Dockerfile build flags differ from the standalone trimpath binary; these are distinct verified artifacts, not claimed byte-identical.
- Existing image tags were not overwritten. Dockerfile was built from the Git `companions` context, using `worker/Dockerfile`, legacy builder limited to 2 CPUs/2 GiB. Isolated image container with fixture keys verified default port 8787, health/features HTTP200, build modified=false, code_catalog 2026-10-08.8 and runtime CLI 2.1.292. That verification container was stopped and removed afterward.

## Linux checks

Sequential Go container limited to 2 CPUs/2 GiB, GOMAXPROCS=2:

- Engine race PASS 16.182s; vet PASS.
- Worker config race 1.072s, server 1.232s, worker 7.153s; vet PASS.
- Contracts credits/features/httpfacts/resources race PASS; diagnostics package has no tests; all contracts vet PASS.
- No database schema changes or DB test claim in this repair.

## Account-preserving update

The updater checked original full container ID, existing 0.1.65 program hash, and no active CLI process before taking a fresh backup and again before replacing the binary. It copied to a unique temporary executable, verified SHA256, then atomically renamed `/usr/local/bin/ccgateway` and restarted the existing container. Account 22 completed validation before account 21 started.

- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`.
- #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`.
- Both retain image reference `ccgateway:0.1.56` and image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`.
- Before/after identity, image, user, mount, executable path and args snapshots compare exactly. Authorization was not rewritten; loggedIn remains true (#22 claude.ai, #21 api_key).
- Neither container has WORKER_PLUGIN_PATH or CCG_PLUGIN_DIR override. Embedded Mod is loaded from the new binary.
- Fresh backups: `/opt/ccgateway-runtime/manual-backups/20261008-56f93858c-22` and `...-21`. They contain old binary, before/after snapshots, CLI symlink, deployed hash and verification output. The preserved 0.1.65 binary hash is `b117599a7582626a0917688caa4af15641bbec8b203415b14ad3b19a4450f3da`.

Each account passed health/features/build/version/catalog validation and one real Opus 5.5 short answer, with no model retry:

- #22 HTTP200/end_turn/exact READY; input65/output4/cache0.
- #21 HTTP200/end_turn/exact READY; input52/output4/cache0.

Credentials stayed inside the existing containers and were not printed or copied into the report. This verifies basic deployment health and inference, not the full repaired public Read roundtrip. Root performs the latter after the API agent finishes its controller/default-image refresh. This agent made no default-image or controller configuration change and no core release.

## Final public local-Claude Read verification

After the API agent completed its default-image/controller refresh, root ran the real local CLI against the public gateway. Root's evidence `local-claude-0.1.66.json` reports exit0, is_error=false, 2 turns, one native Read plus one paired result, and nonempty final text (18.949s). This agent did not issue a duplicate model request; it inspected the resulting Worker logs read-only.

Account 22 successful request IDs:

- `06d2a35b-4483-4b8f-bee7-55ec282ad690` — initial Read call, HTTP200.
- `8e892880-a922-49f9-83db-b3b48166a861` — tool-result continuation, HTTP200.

Protocol evidence (SHA256 prefixes, no original prompt, email or file content):

- Top-level client system is 5616 characters, hash `46929d672d5d1554`; exactly preserved once on both upstream requests.
- Upstream tool list is exactly `Read`; tool routing reports native=true, with no MCP renaming.
- Original tool result is 3606 characters, hash `46b590c71636af8c`; its full string is an exact prefix of the final 4179-character result. The 573-character suffix equals the authenticated session_context wrapper. Its inner text hash `8798029338750562` occurs once in the final messages. The client result and attachment remain in the same tool-result block.
- Additional 49-character inline system, hash `854b1b20a5701460`, is exact and occurs once.
- Effective attachment default is gateway, with workingDirectory independently set to client. The client working-directory line hash `41e4c54974742ff1` is preserved once, while platform changes from Windows to Linux according to the saved policy. The raw 1006-character client environment system is intentionally filtered to 319 characters plus gateway environment; it is therefore inaccurate to claim all raw environment system text is unchanged. This describes model-visible environment, not a change of the container process cwd.
- A separate preceding request `f11939e5-4843-4f91-b5a2-531448123936` returned 400 because inline output_config lacked its admitted mid-conversation beta. It is recorded separately from the two successful Read requests and is not the repaired history-alignment 502.
