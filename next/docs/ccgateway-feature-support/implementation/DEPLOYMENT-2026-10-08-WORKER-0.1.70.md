# Worker 0.1.70 deployment — 2026-10-08

Status: Linux gates, new image validation and both original account updates completed. Root/API agent received the success handoff. This deployment sends no model requests.

Source: `e463222dce5353b5e0bb6e95265bf9886efc0930`, clean detached worktree `/root/ccgateway-features-e463222dc`, fetched through Git on cc-max. No source upload. Artifact directory `/opt/ccgateway-runtime/feature-validation-e463222dc`.

Scope: forced API format compatibility, completed client-tool history, Sonnet server pause native bootstrap, catalog2026-10-08.13. Default image/core/controller update is a separate API-agent phase after the Worker handoff.

Sequential validation/build budget: two CPUs, 2GiB RAM, GOMAXPROCS2, shared Go compiler/module caches. Test results rerun with race/count=1 on this candidate, not reused. New image tag0.1.70 checked absent; all old images/resources retained.

Before account operations both live executables match expected0.1.69 SHA256 `56e7db4cc4ba05a04ba3f6b78d5ca702b7a151e540f29e4aa880c63c861cb58d`. Original22/21 IDs/image/volumes/OAuth must remain unchanged; unique backups and atomic temporary executable replacement are required. Health/features/local auth status only: no READY inference in this release step.


## Linux results and standalone artifact

- Engine race24.761s; Worker config1.038s/server1.304s/worker7.158s; contracts credits1.077s/features1.207s/httpfacts1.038s/resources1.053s. Diagnostics has no tests. All three module vet invocations passed.
- Standalone Version0.1.70/full Git revision executable SHA256 `2b09a0444d680734243f781c3ebc5559ec3ef83dd3155c25a1f8c61a3d45d054`.
- Both accounts checked before patch: no explicit plugin directory override. Embedded Mod follows the new executable.


## Final image verification

Image `ccgateway-worker:0.1.70` ID `sha256:045a0e72c16b28e7afb88758f777fd1f19d3098d8b216565fe63cb0388b0e6d6`, OCI revision exact `e463222dce5353b5e0bb6e95265bf9886efc0930`. Dockerfile-produced executable SHA256 `32669fa8feff8611da01e6d845bcba8aeb726ed5b7608859b755f4b5d7ab3bc8`; build flags differ from the standalone trimpath artifact and both are independently verified.

A fresh network-disabled fixture-key container passed health200/features200/default8787/buildmodifiedfalse/Version0.1.70/full revision/catalog2026-10-08.13/CLI2.1.292. The fixture container was removed; existing image tags were not overwritten or removed.

## Accounts and recovery

Unique backups `/opt/ccgateway-runtime/manual-backups/20261008-e463222dc-22` and `...-21` contain the prior0.1.69 executable/hash, full before/after container identity snapshots, CLI symlink, new deployed hash and runtime verification output. Expected old hash and absence of active CLI were checked before backup and immediately before atomic replacement. Each original container restarted once,22 fully verified before21 began.

Both container identity snapshots compare byte-for-byte equal (ID/image/user/mounts/path/args):

- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`, login true/claude.ai.
- #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`, login true/api_key.
- Image reference stays `ccgateway:0.1.56`, image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`. No recreation, volume/OAuth replacement or unrelated cleanup.
- Both deployed binary hashes match `2b09a0444d680734243f781c3ebc5559ec3ef83dd3155c25a1f8c61a3d45d054`. Health/features/version/revision/catalog/CLI checks pass and no explicit plugin override exists.

Both runtime summaries explicitly record `model_request_sent:false`. No READY or feature inference was sent during this Worker release. This is build/runtime validation, not provider behavior acceptance; root coordinates later real probes after core/default-image/controller stability. No credentials were printed. This agent made no default-image/controller setting change and no local commit.
