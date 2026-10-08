# Worker 0.1.71 deployment — 2026-10-08

Status: Linux gates, image validation and both original account updates completed. Core/default-image/controller handoff is a separate API-agent phase.

Exact source: `aa6b3a90500d9b64f85e937ba6d3a5730766b2a0`, server-side Git fetch and clean detached worktree `/root/ccgateway-features-aa6b3a905`. Artifact directory `/opt/ccgateway-runtime/feature-validation-aa6b3a905`. No source upload.

Linux gates run sequentially in a two-CPU / 2GiB Go container with GOMAXPROCS=2 and existing compile/module caches; race/count=1 results are rerun for this SHA. New `ccgateway-worker:0.1.71` tag was confirmed absent. Previous images and account volumes are retained.

Preflight: both live accounts match expected 0.1.70 executable SHA256 `2b09a0444d680734243f781c3ebc5559ec3ef83dd3155c25a1f8c61a3d45d054`, and docker process lists contain only docker-init/ccgateway. Available disk before build:6.7GiB. No cleanup or prune.

This task performs no model requests. Account22 then21 must retain container ID, mount/OAuth data and image reference, with unique backups and atomic executable replacement; embedded Mod follows the binary. Default-image/controller changes are a separate API-agent phase.

## Linux gates

Engine race25.122s; Worker config1.050s/server1.238s/worker7.157s; contracts credits1.109s/features1.233s/httpfacts1.026s/resources1.057s. All three vet checks passed; diagnostics has no tests. Standalone version/revision build SHA256 `d229d9d52d0ec720205e007ff2b506ec7687b8291506c6423d3317b0fbead1cd`. Source worktree remains clean. Both accounts have no explicit Mod override, so replacing the executable updates embedded Mod as intended.

## Image verification

Image `ccgateway-worker:0.1.71` ID `sha256:387e3e0b1278f1e9aaa4896c3b16012fce8e8ec49bbbb0f035bebcb3bd5c5185`; OCI revision exact `aa6b3a90500d9b64f85e937ba6d3a5730766b2a0`. Image executable SHA256 `d7a9613d766679f55f653788774dd65f7e93cc2da233606c1e31d9bcb820ac96`; it differs from standalone trimpath build flags, and both builds are independently validated.

Network-disabled fixture-key container: health200/features200/default8787, build version0.1.71/full revision/modified=false, catalog2026-10-08.14, observed CLI2.1.292. Fixture removed after verification. Disk after build9.7GiB available; no prune or manual resource cleanup was performed.

## Final account rollout

Completed account22, then account21. Each checked the expected old executable hash and absence of active CLI before backup and immediately before replacement, copied to a unique temporary executable, atomically renamed, and restarted once. Full container identity snapshots compare byte-for-byte equal before/after (ID/image reference/image ID/user/mounts/path/args).

Unique backups `/opt/ccgateway-runtime/manual-backups/20261008-aa6b3a905-22` and `...-21` retain the old0.1.70 executable, identities, CLI symlink, deployed hash and verification output. The old executable includes its original embedded Mod.

- Account22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`, loggedIn=true, authMethod=claude.ai.
- Account21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`, loggedIn=true, authMethod=api_key.
- Both retain image reference `ccgateway:0.1.56` and image ID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d`; no recreation, mount change or authorization replacement.
- Both deployed binary hashes are `d229d9d52d0ec720205e007ff2b506ec7687b8291506c6423d3317b0fbead1cd`, health/features successful, catalog.14/CLI292/version.71/full revision correct, no explicit Mod override.

Status: **Worker delivery complete**. Root and API agent received success; core/default-image/controller changes are not performed by this Worker task. No READY or model inference was sent, and no credentials were printed. These are build/runtime/auth-status facts, not provider feature acceptance. Root will coordinate true model acceptance after the other release stages stabilize.
