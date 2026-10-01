-- Public immutable console files are shared across host builds. Index/CSP
-- stay local; an active build lease protects all of its referenced files.
CREATE TABLE web_asset_builds (
    build_id text PRIMARY KEY,
    published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    last_seen timestamptz NOT NULL DEFAULT clock_timestamp(),
    lease_until timestamptz NOT NULL
);
CREATE TABLE web_assets (
    path text PRIMARY KEY,
    sha256 text NOT NULL,
    body bytea NOT NULL,
    size bigint NOT NULL CHECK(size >= 0 AND size = octet_length(body))
);
CREATE TABLE web_asset_build_files (
    build_id text NOT NULL REFERENCES web_asset_builds(build_id) ON DELETE CASCADE,
    path text NOT NULL REFERENCES web_assets(path),
    PRIMARY KEY(build_id,path)
);
CREATE INDEX web_asset_build_files_path_idx ON web_asset_build_files(path);
