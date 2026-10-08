# Worker 0.1.73 deployment candidate — 2026-10-08

Status: Worker image validation and both original-account updates completed after root confirmed matching OVH database gates. Core0.1.71/default-image/controller release is handed to the API agent.

Exact Git source: `428164d4756e64163710910224957744554a2011`, fetched on cc-max into new clean detached worktree `/root/ccgateway-features-428164d47`. Artifacts: `/opt/ccgateway-runtime/feature-validation-428164d47`. No local source upload. New image tag `ccgateway-worker:0.1.73` was absent at preflight.

Preflight: disk9.4GiB available; existing Go1.27-bookworm/trixie images and compilation/module volumes available, no active builder. Both original account containers remain running with0.1.72 standalone hash `ae99f09e2b3f5971e5d106d6e034d6a608c092a07843d2fddf56a2e68a7fae3b`, original0.1.56 image references, original IDs and authorization. #22 loggedIn=true/claude.ai; #21 loggedIn=true/api_key. No active CLI or explicit Mod override. No credentials printed and no inference sent.

Linux validation uses Go1.27.1,2CPUs/2GiB, GOMAXPROCS2, persisted compiler/module caches but `-count=1` results. Engine race34.164s; contracts credits1.153/features1.217/helperhistory1.059/httpfacts1.026/resources1.050; Worker config1.059/server1.262/worker7.160. All three module vet commands passed. StandaloneVersion0.1.73/full revision executable SHA256 `549bd6576d2c403c843a9a29108629ffb3745e76eb2fa018fe47c132e1dbbe31`.

CLI targeted matrix ran in a separate network-disabled,2CPU/2GiB container using cached nativeCLI2.1.292 and isolated test HOME/config/fakeupstream. It covers helper carrier/system/budget, partial usage+EOF dispatch suppression and ordinary budget planning; no account credentials are mounted. The final image validation and account results are recorded below.


## Final image and isolated CLI evidence

Targeted CLI tests completed81.436s: carrier/system30.54s, task-budget31.20s, partial-usage7.26s, ordinary-budget12.40s, EOF dispatch-suppression five subcases0.01s. Thirty-four fake-provider calls cover JSON/SSE, continuation, cold import and rollback; no real inference or account credentials. Original system placement and original task-budget values remained asserted.

Image `ccgateway-worker:0.1.73` ID `sha256:f8e33487878fc15d5506e1b619f747cb9c8890f1b302874800e8b8141bdedf41`, OCI revision428164d4756e64163710910224957744554a2011. Image-built program SHA256 `9d100f85d63d84a09f22daab8ddcc628ef22eb8b5b0d09b6aeb405d70d852ec8` differs from the standalone trimpath artifact because build flags differ. Dedicated network-disabled fixture passed default8787health200/features200, version0.1.73/full revision/modified=false, catalog2026-10-08.15, helper_history_schema_versions=[1], observedCLI2.1.292. Fixture was removed. Post-build disk9.1GiB, no prune or old-resource deletion.

## Original-container updates

Root confirmed exact-SHA OVH database/race gates and authorized account changes only after image validation. New unique backups:
- `/opt/ccgateway-runtime/manual-backups/20261008-428164d47-22`
- `/opt/ccgateway-runtime/manual-backups/20261008-428164d47-21`

Each retains the old0.1.72 executable/hash, original CLI symlink, full before/after container identity/image/mount/labels snapshots and filtered authorization state. The expected old hash and absence of active CLI were checked immediately before the atomic rename. Embedded Mod changes travel with the executable; neither account has an explicitPlugin override.

#22 completed before#21 started. Both were updated in place and restarted once, without recreation or model calls. Deployed standalone hash is `549bd6576d2c403c843a9a29108629ffb3745e76eb2fa018fe47c132e1dbbe31` for both. Health/features200, exact version/revision/catalog/schema/CLI verified. Before/after identity and authorization snapshots compare byte-for-byte equal:
- #22 ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`, loggedIn=true, authMethod=claude.ai.
- #21 ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`, loggedIn=true, authMethod=api_key.
- Original imageRef `ccgateway:0.1.56`, imageID `sha256:789f605082fbec34e210d859fac06c9f9603e3ec8f535e249924074a5754b85d` unchanged, including mounts and authorization labels.

Root and API agent received the completed Worker signal. This agent did not update default images, refresh the controller, publish core, or send a real model request. Those remaining coordinated release steps belong to the API agent.

## Controller route compatibility follow-up (read-only review)

The first public helper-budget acceptance returned503 before reservation/dispatch. Independent cc-max review found the runningcontroller0.1.47 ROUTE omitted admin/features; API agent separately confirmed authenticated404 and zero attempt rows. Worker21/22 had no new main-request log or CLI process. This was capability-route deployment mismatch, not provider qualification or helper response parsing.

Live `/app/manager.py` was copied to artifact `controller-live-0.1.47.py` for review. Diff against exactGit428164d candidate has only: add v1/messages/count_tokens, add admin/features, make features GET-only. `_provision` is byte-for-byte unchanged. Existing account + unchanged network + same salted auth fingerprint returns before image lookup/replacement; defaultapp tag differences are not a rebuild condition. Even credential/network changes use the existing image reference rather than incidentally upgrading. Features relay preserves controller authentication, account revision guard and per-account admin key, and does not call provision/ensure/start.

API agent exclusively owns controller tests/build/refresh. Independent post-refresh identity/hash/authorization/features validation is pending at this entry; no model call or controller mutation was performed by this reviewer.

Independent post-controller verification completed: runningcontrollerimage `ccg-controller:0.1.48`, started2026-10-08T12:01:27.445012453Z. Both original account identity/image/mount/labels snapshots are byte-for-byte equal to the saved post-.73 rollout snapshots; program hashes remain549bd6576d2c403c843a9a29108629ffb3745e76eb2fa018fe47c132e1dbbe31. #22 authorization remainsloggedIn=true/claude.ai, #21=true/api_key; noPlugin overrides. Authenticated read-only GET through the controller's own routed admin/features returned200 for both, exactWorker.73/full428revision/catalog.15/schema[1]. Keys were read only inside controller memory for the normal authenticated GET, never printed or exported. No inference, provisioning, restart or configuration write was performed by this independent check.
