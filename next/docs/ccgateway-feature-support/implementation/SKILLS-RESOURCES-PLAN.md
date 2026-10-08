# Custom Skills resource implementation plan

## Verified protocol surface

Primary sources: [official Skills guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide), [SDK Skills](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/resources/beta/skills/skills.py), [SDK versions](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/resources/beta/skills/versions.py), [Skill resource](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/skill.py), [version resource](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/skills/beta_skill_version.py).

The stable API and `skills-2025-10-02` response dialect must remain distinct. Stable metadata uses display_name/latest_version_id and structured source; legacy requests retain their existing display_title/epoch-version semantics. `?beta=true` used by SDK beta namespaces does not itself select the legacy response dialect. Preserve the caller's actual beta headers and provider errors.

Routes cover `/v1/skills`, a skill ID, its `/versions`, one version, and a version's `/content` zip. Methods are limited to the corresponding documented GET/POST/DELETE operations. Stable parent deletion may delete all versions; legacy restrictions stay provider-enforced. A version selector may be `latest` only where the provider supports it; it is resolved through the owned parent's registered ready versions and pinned before dispatch, never guessed from a timestamp. Initial upload registration separately verifies the parent's reported first version through a fixed-account metadata request.

## Ownership and storage

Custom skill parents use the existing resource owner and verified account/principal/generation. They cannot move accounts. Public parent IDs are separate from provider IDs. Versions require typed parent ownership, public/provider IDs and a parent-scoped legacy epoch alias; a version cannot be rebound under another skill.

Implementation should use a small dedicated skill-upload/child lifecycle in separate files, reusing the existing transaction, quota and remote-identity locks. A new skill upload must atomically reserve parent plus initial-version capacity before provider dispatch and atomically complete their relation afterward. New-version upload reserves measured bytes under an existing ready parent. An uncertain upload keeps its reservation and is not automatically repeated. This avoids half-registering an initial version or charging its bytes twice.

Version metadata stores the actual provider response and explicit parent relation, not arbitrary user-supplied JSON associations. Parent deletion confirmation marks children deleted in the same transaction; pending child mutation prevents concurrent parent deletion. Known provider rejection of a delete needs a distinct restoration transition, while timeout/ambiguous outcome remains uncertain. Deletion state must not leave a removed version eligible for model references or `latest` selection.

Lists are SQL-filtered to the authenticated owner, current group accounts, type and parent before pagination. Public cursors cannot expose or select another tenant's records. The gateway must not fetch an entire workspace's custom-skill list and give it to arbitrary users. Built-in Anthropic skills remain provider-managed; they are never fabricated as tenant-created records.

## Upload and binary transport

Reuse the resource auth/user/account slots, private temporary-file spooling, read-idle deadlines, fixed-account transport and bounded response parsers. Skills accept multipart file collections and documented zip uploads. Preserve relative filenames and content; never extract archive entries to filesystem paths or execute SKILL.md instructions. Validate archive metadata and streamed decompressed sizes against the provider's documented 30 MB combined uncompressed limit, with bounded entry count and upload framing. Plain files use the same aggregate measurement. Malformed/truncated multipart or zip cannot create a provider intent.

The fixed shared transport needs Skills version-content GET and the exact SDK `beta=true` query variant. No arbitrary URL, workspace selector, auth token, generic header tunnel or automatic side-effect retry is introduced. Zip download remains binary and bounded, with provenance-checked provider response headers.

## Integration and tests

Expose the final stored parent/version contract to the root's model-reference mapper before enabling custom skill references. Parent IDs and pinned versions must both map, while built-in references remain unchanged. Do not open Worker custom-skill admission until that path is complete.

Tests must cover both API dialects; multi-file/zip bytes and filenames; first-version atomicity; cross-owner/account/parent rejection; pinned/latest version resolution; list pagination isolation; uncertain create/delete outcomes; stable parent cascade; quota/concurrency; cancellation; exact binary download and safe provider error/header forwarding. PostgreSQL locking cases run in the Git-based Linux checkpoint. Fake transport tests and real provider authorization remain separate evidence levels.
