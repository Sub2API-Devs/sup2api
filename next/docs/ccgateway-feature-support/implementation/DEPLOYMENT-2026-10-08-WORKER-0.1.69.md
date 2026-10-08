# Worker 0.1.69 deployment — 2026-10-08

Status: Linux tests, new image and both original account containers deployed and verified. Core/default-image/controller handoff sent to root and API agent.

Git candidate `decd22f1f7e43f5fd45f426d192553f1d9f6494e`, clean detached server worktree `/root/ccgateway-features-decd22f1f`. Server fetched Git; no local source upload. Artifacts `/opt/ccgateway-runtime/feature-validation-decd22f1f`.

## Build and Linux verification

Fresh result execution with race/count=1, 2CPU/2GiB/GOMAXPROCS2, compiler/module caches reused only. Engine24.123s; Worker config1.029s/server1.358s/worker7.119s; contracts credits1.070s/features1.204s/httpfacts1.026s/resources1.052s. All three modules vet passed. Diagnostics has no tests. No database testing claim.

Standalone Version0.1.69/full revision binary SHA256 `56e7db4cc4ba05a04ba3f6b78d5ca702b7a151e540f29e4aa880c63c861cb58d`.

New image `ccgateway-worker:0.1.69` is built from the Git companions context with `worker/Dockerfile`, CLI2.1.292, default8787, explicit version/revision build args and OCI revision label. Prior tags are retained; tag0.1.69 was verified absent before build.

## Completed account updates

22 then21, original container executable replacement and restart, no recreation. Expected old0.1.68 binary `8adafe7352d044ff94bcfaab49f75fe840a7d2dff372dc8def55a7ac5046ad8d`. Original container identity/image/volumes/authorization must compare unchanged. Both account environments currently have no explicit plugin directory override, so embedded Mod follows the new executable.

Core/default-image/controller release belongs to the API agent and is not performed by this deployment task. Real provider feature acceptance follows all coordinated updates; READY checks do not establish pinned MCP search or all feature support.

## Final image and account evidence

- Image ID `sha256:0b77a33491887eba6c4a725031c3f53968f4d392242e3012a55cb2a3d6d10328`; OCI revision exactly `decd22f1f7e43f5fd45f426d192553f1d9f6494e`.
- Image executable SHA256 `d632708ca31f821431c8d1ac97c2ca953a7ae3194206b3270796e8404adea8ea`. Dockerfile build flags differ from standalone trimpath build, so hashes are independently verified.
- Fresh fixture-key container with network disabled: health200/features200, buildmodifiedfalse, Version0.1.69/full revision, catalog2026-10-08.12, CLI2.1.292/default8787. Fixture container removed after verification. Existing images left untouched.
- Unique backups `/opt/ccgateway-runtime/manual-backups/20261008-decd22f1f-22` and `...-21` contain prior0.1.68 executable, before/after container snapshots, CLI symlink, deployed hash and runtime/inference summaries.
- Before update: expected prior hash and no active CLI checked twice, backup hash verified. New temporary binary hash verified before atomic rename; same account container restarted. Account22 fully verified before21 began.
- #22 original ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`; login true, claude.ai. One READY call: HTTP200/end_turn, input65/output4/cache0.
- #21 original ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`; login true, api_key. One READY call: HTTP200/end_turn, input52/output4/cache0.
- Each complete identity snapshot compared byte-for-byte: ID/image/user/mounts/path/args unchanged. Both retain image reference `ccgateway:0.1.56` and image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`.
- No authorization files replaced, no credentials printed, no automatic request retries, no container recreation or unrelated cleanup. Both account hashes match the standalone new binary above.

The later docs-only commit `13a55c209` was not used to rebuild this release: product build remains exact requested `decd22f1f`. API agent received the dual-success signal; subsequent default-image/controller/core updates and real feature acceptance are recorded separately.
