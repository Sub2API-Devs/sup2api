package control

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/release"
	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

type updateTransport func(*http.Request) (*http.Response, error)

func (f updateTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func updateResponse(r *http.Request, body []byte) *http.Response {
	return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(string(body))), Header: make(http.Header), Request: r}
}

func updateFixture(t *testing.T) (*UpdateService, githubRelease, []byte) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	manifest := testRelease("github-" + hex.EncodeToString(pub[:8])).Manifest
	manifest.CoreVersion = "0.2.0"
	manifest.Platforms = []rc.Platform{{OS: "linux", Arch: "amd64", RuntimeABI: "test", BundleDigest: strings.Repeat("a", 64), BundleBytes: 100, Files: []rc.File{{Path: "bin/sub2api", SHA256: strings.Repeat("b", 64), Size: 10, Mode: 0755}}}}
	payload, _ := json.Marshal(manifest)
	signed, _ := json.Marshal(rc.SignedManifest{KeyID: "test", Payload: payload, Signature: ed25519.Sign(priv, payload)})
	var g githubRelease
	raw, _ := json.Marshal(map[string]any{"tag_name": "v0.2.0", "assets": []map[string]any{{"name": updateManifestAsset, "size": len(signed)}, {"name": strings.Repeat("a", 64) + ".tar.gz", "size": 100}}})
	_ = json.Unmarshal(raw, &g)
	c := &http.Client{Transport: updateTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host == "api.github.com" {
			return updateResponse(r, raw), nil
		}
		return updateResponse(r, signed), nil
	})}
	m := &release.Manager{TrustedKeys: map[string]ed25519.PublicKey{"test": pub}, OS: "linux", Arch: "amd64", RuntimeABI: "test", GitHubClient: c}
	u := NewUpdateService(m)
	u.Client = c
	return u, g, signed
}

func TestUpdateRepositoryNormalization(t *testing.T) {
	for _, raw := range []string{"owner/repo", "https://github.com/owner/repo", "https://github.com/owner/repo.git/"} {
		got, e := normalizeRepository(raw)
		if e != nil || got != "owner/repo" {
			t.Fatalf("%s: %s %v", raw, got, e)
		}
	}
	for _, raw := range []string{"http://github.com/o/r", "https://github.com.evil.test/o/r", "https://user@github.com/o/r", "https://github.com/o/r?token=secret", "https://github.com:443/o/r", "owner/repo/releases", "../repo"} {
		if _, e := normalizeRepository(raw); e == nil {
			t.Fatalf("invalid repository accepted: %s", raw)
		}
	}
}

func TestGitHubCandidateRequiresSignatureAndMatchingAssets(t *testing.T) {
	u, g, signed := updateFixture(t)
	out, err := u.verifiedRelease(context.Background(), "owner/repo", g)
	if err != nil {
		t.Fatal(err)
	}
	if out.BundleBase != "https://github.com/owner/repo/releases/download/v0.2.0" {
		t.Fatal(out.BundleBase)
	}
	for _, kind := range []string{"missing_manifest", "missing_bundle", "wrong_size", "wrong_tag", "wrong_signature"} {
		t.Run(kind, func(t *testing.T) {
			candidate := g
			candidate.Assets = append(candidate.Assets[:0:0], g.Assets...)
			manager := &release.Manager{TrustedKeys: u.Manager.TrustedKeys, OS: u.Manager.OS, Arch: u.Manager.Arch, RuntimeABI: u.Manager.RuntimeABI, GitHubClient: u.Manager.GitHubClient}
			service := NewUpdateService(manager)
			switch kind {
			case "missing_manifest":
				candidate.Assets = candidate.Assets[1:]
			case "missing_bundle":
				candidate.Assets = candidate.Assets[:1]
			case "wrong_size":
				candidate.Assets[1].Size++
			case "wrong_tag":
				candidate.Tag = "v0.3.0"
			case "wrong_signature":
				var s rc.SignedManifest
				_ = json.Unmarshal(signed, &s)
				s.Signature[0] ^= 1
				bad, _ := json.Marshal(s)
				manager.GitHubClient = &http.Client{Transport: updateTransport(func(r *http.Request) (*http.Response, error) { return updateResponse(r, bad), nil })}
			}
			if _, err := service.verifiedRelease(context.Background(), "owner/repo", candidate); err == nil {
				t.Fatal("unsafe candidate accepted")
			}
		})
	}
}

func TestPostgresUpdateSourceImportBindingAndCache(t *testing.T) {
	s, _, _, _ := setupEngines(t)
	u, _, _ := updateFixture(t)
	s.Updates = u
	ctx := context.Background()
	if source, err := s.setUpdateSource(ctx, "https://github.com/owner/repo"); err != nil || source.Repository != "owner/repo" {
		t.Fatalf("source: %+v %v", source, err)
	}
	first, err := s.checkUpdate(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	if !first.HasUpdate || !first.Compatible || first.Cached {
		t.Fatalf("check: %+v", first)
	}
	cached, err := s.checkUpdate(ctx, true)
	if err != nil || !cached.Cached {
		t.Fatalf("force rate limit: %+v %v", cached, err)
	}
	if _, err = s.importGitHub(ctx, "other/repo", "v0.2.0"); !errors.Is(err, ErrConflict) {
		t.Fatalf("repository binding: %v", err)
	}
	out, err := s.importGitHub(ctx, "owner/repo", "v0.2.0")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Release(ctx, out.Digest); err != nil {
		t.Fatal(err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE updater.clusters SET baseline=$2 WHERE cluster_id=$1`, s.Cluster, out.Digest); err != nil {
		t.Fatal(err)
	}
	installed, err := s.checkUpdate(ctx, true)
	if err != nil || installed.HasUpdate || !installed.Compatible || installed.Reason != "" || installed.Cached {
		t.Fatalf("installed latest: %+v %v", installed, err)
	}
	if _, err = s.DB.Exec(ctx, `UPDATE updater.releases SET bundle_base='https://previous.example/release' WHERE digest=$1`, out.Digest); err != nil {
		t.Fatal(err)
	}
	if _, err = s.importGitHub(ctx, "owner/repo", "v0.2.0"); err == nil || !strings.Contains(err.Error(), "existing source was retained") {
		t.Fatalf("different imported source was silent: %v", err)
	}
	if _, err = s.setUpdateSource(ctx, ""); err != nil {
		t.Fatal(err)
	}
	disabled, err := s.checkUpdate(ctx, false)
	if err != nil || disabled.Repository != "" || disabled.HasUpdate || disabled.Cached {
		t.Fatalf("disabled stale cache: %+v %v", disabled, err)
	}
}

func TestPostgresCancelledUpdateCheckDoesNotCacheFailure(t *testing.T) {
	s, _, _, _ := setupEngines(t)
	u, _, _ := updateFixture(t)
	s.Updates = u
	if _, err := s.setUpdateSource(context.Background(), "owner/repo"); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	u.Client = &http.Client{Transport: updateTransport(func(r *http.Request) (*http.Response, error) { cancel(); return nil, context.Canceled })}
	if _, err := s.checkUpdate(ctx, true); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled request: %v", err)
	}
	if !u.cached.CheckedAt.IsZero() {
		t.Fatal("cancelled request polluted shared check cache")
	}
}

func TestPostgresImportRejectsSourceChangeDuringFetch(t *testing.T) {
	s, _, _, _ := setupEngines(t)
	u, _, _ := updateFixture(t)
	s.Updates = u
	ctx := context.Background()
	if _, err := s.setUpdateSource(ctx, "owner/repo"); err != nil {
		t.Fatal(err)
	}
	original := u.Client.Transport
	u.Client = &http.Client{Transport: updateTransport(func(r *http.Request) (*http.Response, error) {
		if _, err := s.DB.Exec(ctx, `UPDATE updater.clusters SET update_repository='other/repo' WHERE cluster_id=$1`, s.Cluster); err != nil {
			t.Fatal(err)
		}
		return original.RoundTrip(r)
	})}
	if _, err := s.importGitHub(ctx, "owner/repo", "v0.2.0"); !errors.Is(err, ErrConflict) {
		t.Fatalf("source switch accepted: %v", err)
	}
}
