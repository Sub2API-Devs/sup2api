package control

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/release"
)

const updateManifestAsset = "next-core-manifest.json"

var repositoryPart = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$`)

func normalizeRepository(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	if strings.HasPrefix(raw, "https://") {
		u, e := url.Parse(raw)
		if e != nil || u.Host != "github.com" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return "", errors.New("repository must be a public github.com owner/repository")
		}
		raw = strings.Trim(u.Path, "/")
	}
	raw = strings.TrimSuffix(raw, ".git")
	parts := strings.Split(raw, "/")
	if len(parts) != 2 || !repositoryPart.MatchString(parts[0]) || !repositoryPart.MatchString(parts[1]) {
		return "", errors.New("repository must be owner/repository or an HTTPS github.com repository URL")
	}
	return parts[0] + "/" + parts[1], nil
}

type updateSource struct {
	Repository string `json:"repository"`
	Revision   int64  `json:"-"`
}
type updateCheck struct {
	Repository     string    `json:"repository"`
	CurrentVersion string    `json:"current_version"`
	LatestVersion  string    `json:"latest_version"`
	HasUpdate      bool      `json:"has_update"`
	Compatible     bool      `json:"compatible"`
	Reason         string    `json:"reason"`
	Tag            string    `json:"tag"`
	ReleaseURL     string    `json:"release_url"`
	PublishedAt    string    `json:"published_at"`
	Notes          string    `json:"notes"`
	ManifestAsset  string    `json:"manifest_asset"`
	CheckedAt      time.Time `json:"checked_at"`
	Cached         bool      `json:"cached"`
}
type githubRelease struct {
	Tag         string `json:"tag_name"`
	Draft       bool   `json:"draft"`
	Prerelease  bool   `json:"prerelease"`
	Body        string `json:"body"`
	PublishedAt string `json:"published_at"`
	Assets      []struct {
		Name string `json:"name"`
		Size int64  `json:"size"`
	} `json:"assets"`
}

type UpdateService struct {
	Manager        *release.Manager
	Client         *http.Client
	mu             sync.Mutex
	cached         updateCheck
	baseline       string
	sourceRevision int64
}

func NewUpdateService(m *release.Manager) *UpdateService {
	return &UpdateService{Manager: m, Client: release.GitHubClient()}
}

func (s *Store) updateSource(ctx context.Context) (out updateSource, err error) {
	err = s.DB.QueryRow(ctx, `SELECT update_repository,update_source_revision FROM updater.clusters WHERE cluster_id=$1`, s.Cluster).Scan(&out.Repository, &out.Revision)
	return
}
func (s *Store) setUpdateSource(ctx context.Context, raw string) (updateSource, error) {
	repo, err := normalizeRepository(raw)
	if err != nil {
		return updateSource{}, err
	}
	_, err = s.DB.Exec(ctx, `UPDATE updater.clusters SET update_repository=$2,update_source_revision=update_source_revision+1 WHERE cluster_id=$1`, s.Cluster, repo)
	// Revision-keyed caches invalidate across all nodes without waiting for a
	// network check's mutex or retaining stale data after switching away/back.
	return updateSource{Repository: repo}, err
}

func (u *UpdateService) fetch(ctx context.Context, repo, tag string) (githubRelease, error) {
	var out githubRelease
	endpoint := "https://api.github.com/repos/" + repo + "/releases/latest"
	if tag != "" {
		endpoint = "https://api.github.com/repos/" + repo + "/releases/tags/" + url.PathEscape(tag)
	}
	bounded, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	res, err := release.GitHubGet(bounded, u.Client, endpoint)
	if err != nil {
		return out, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20+1))
	if err != nil {
		return out, errors.New("cannot read GitHub metadata")
	}
	if len(data) > 2<<20 {
		return out, errors.New("GitHub release metadata too large")
	}
	if err = json.Unmarshal(data, &out); err != nil {
		return out, errors.New("invalid GitHub release metadata")
	}
	if out.Draft || out.Prerelease || out.Tag == "" || len(out.Tag) > 128 {
		return out, errors.New("only stable published releases are supported")
	}
	if _, err = semver.StrictNewVersion(strings.TrimPrefix(out.Tag, "v")); err != nil {
		return out, errors.New("release tag must be a semantic version")
	}
	if tag != "" && tag != out.Tag {
		return out, errors.New("GitHub release tag mismatch")
	}
	return out, nil
}

func (u *UpdateService) verifiedRelease(ctx context.Context, repo string, g githubRelease) (Release, error) {
	var out Release
	assetSize := func(name string) (int64, error) {
		count := 0
		var size int64
		for _, a := range g.Assets {
			if a.Name == name {
				count++
				size = a.Size
			}
		}
		if count != 1 || size <= 0 {
			return 0, errors.New("release does not contain the required next signed manifest or bundle")
		}
		return size, nil
	}
	size, err := assetSize(updateManifestAsset)
	if err != nil {
		return out, err
	}
	if size > release.MaxManifestBytes*2 {
		return out, errors.New("release manifest asset too large")
	}
	base := "https://github.com/" + repo + "/releases/download/" + url.PathEscape(g.Tag)
	bounded, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	signed, err := u.Manager.FetchManifest(bounded, base+"/"+updateManifestAsset)
	if err != nil {
		return out, err
	}
	manifest, digest, err := release.Verify(signed, u.Manager.TrustedKeys)
	if err != nil {
		return out, err
	}
	if strings.TrimPrefix(manifest.CoreVersion, "v") != strings.TrimPrefix(g.Tag, "v") {
		return out, errors.New("signed core version differs from GitHub tag")
	}
	if _, err = u.Manager.ValidatePlatform(manifest); err != nil {
		return out, err
	}
	// All declared platforms must be downloadable for a heterogeneous cluster.
	for _, platform := range manifest.Platforms {
		if !release.ValidDigest(platform.BundleDigest) || platform.BundleBytes <= 0 || platform.BundleBytes > 16<<30 {
			return out, errors.New("invalid signed bundle declaration")
		}
		size, err = assetSize(platform.BundleDigest + ".tar.gz")
		if err != nil {
			return out, err
		}
		if size != platform.BundleBytes {
			return out, errors.New("GitHub asset size differs from signed bundle")
		}
	}
	return Release{Digest: digest, Manifest: manifest, Signed: signed, BundleBase: base}, nil
}

func (s *Store) checkUpdate(ctx context.Context, force bool) (updateCheck, error) {
	out := updateCheck{}
	source, err := s.updateSource(ctx)
	if err != nil {
		return out, err
	}
	_, baseline, _, err := s.ClusterState(ctx)
	if err != nil {
		return out, err
	}
	current, err := s.Release(ctx, baseline)
	if err != nil {
		return out, err
	}
	out.Repository, out.CurrentVersion = source.Repository, current.Manifest.CoreVersion
	if source.Repository == "" {
		out.Reason = "update source is not configured"
		return out, nil
	}
	if s.Updates == nil {
		return out, errors.New("GitHub updates are unavailable on this gateway")
	}
	u := s.Updates
	u.mu.Lock()
	defer u.mu.Unlock()
	ttl := 5 * time.Minute
	if force || u.cached.Reason != "" {
		ttl = 30 * time.Second
	}
	if u.cached.Repository == source.Repository && u.sourceRevision == source.Revision && u.baseline == baseline && time.Since(u.cached.CheckedAt) < ttl {
		out = u.cached
		out.Cached = true
		return out, nil
	}
	out.CheckedAt = time.Now().UTC()
	latest, err := u.fetch(ctx, source.Repository, "")
	if err == nil {
		out.Tag = latest.Tag
		out.LatestVersion = strings.TrimPrefix(latest.Tag, "v")
		out.ReleaseURL = "https://github.com/" + source.Repository + "/releases/tag/" + url.PathEscape(latest.Tag)
		out.PublishedAt, out.Notes = latest.PublishedAt, latest.Body
		a, ae := semver.NewVersion(out.CurrentVersion)
		b, be := semver.NewVersion(out.LatestVersion)
		if ae == nil && be == nil {
			out.HasUpdate = b.GreaterThan(a)
		}
		var target Release
		target, err = u.verifiedRelease(ctx, source.Repository, latest)
		if err == nil {
			out.ManifestAsset = updateManifestAsset
			if target.Digest == baseline {
				out.Compatible = true
			} else if strings.TrimPrefix(current.Manifest.CoreVersion, "v") == strings.TrimPrefix(target.Manifest.CoreVersion, "v") {
				out.Reason = "latest release uses the installed version number with a different signed identity"
			} else if blockers := Compatibility(current, target); len(blockers) > 0 {
				out.Reason = strings.Join(blockers, "; ")
			} else {
				out.Compatible = true
			}
		}
	}
	if err != nil {
		out.Reason = err.Error()
	}
	if ctx.Err() != nil {
		return out, ctx.Err()
	}
	// Re-read source after network I/O so a concurrent source change is not
	// reported as a fresh result for the new repository.
	now, sourceErr := s.updateSource(ctx)
	if sourceErr != nil {
		return out, sourceErr
	}
	if now.Repository != source.Repository || now.Revision != source.Revision {
		return updateCheck{}, ErrConflict
	}
	_, currentBaseline, _, err := s.ClusterState(ctx)
	if err != nil {
		return out, err
	}
	if currentBaseline != baseline {
		return updateCheck{}, ErrConflict
	}
	u.cached = out
	u.baseline = baseline
	u.sourceRevision = source.Revision
	return out, nil
}

func (s *Store) importGitHub(ctx context.Context, repository, tag string) (Release, error) {
	var out Release
	source, err := s.updateSource(ctx)
	if err != nil {
		return out, err
	}
	if source.Repository == "" || repository != source.Repository {
		return out, ErrConflict
	}
	if _, err = semver.StrictNewVersion(strings.TrimPrefix(tag, "v")); err != nil {
		return out, errors.New("invalid release tag")
	}
	if s.Updates == nil {
		return out, errors.New("GitHub updates unavailable")
	}
	g, err := s.Updates.fetch(ctx, source.Repository, tag)
	if err != nil {
		return out, err
	}
	out, err = s.Updates.verifiedRelease(ctx, source.Repository, g)
	if err != nil {
		return out, err
	}
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	var actual string
	var revision int64
	if err = tx.QueryRow(ctx, `SELECT update_repository,update_source_revision FROM updater.clusters WHERE cluster_id=$1 FOR SHARE`, s.Cluster).Scan(&actual, &revision); err != nil {
		return out, err
	}
	if actual != repository || revision != source.Revision {
		return out, ErrConflict
	}
	manifest, _ := json.Marshal(out.Manifest)
	signed, _ := json.Marshal(out.Signed)
	_, err = tx.Exec(ctx, `INSERT INTO updater.releases(digest,release_id,manifest,signed_manifest,bundle_base) VALUES($1,$2,$3,$4,$5) ON CONFLICT(digest) DO NOTHING`, out.Digest, out.Manifest.ReleaseID, manifest, signed, out.BundleBase)
	if err != nil {
		return out, err
	}
	var storedBase string
	if err = tx.QueryRow(ctx, `SELECT bundle_base FROM updater.releases WHERE digest=$1`, out.Digest).Scan(&storedBase); err != nil {
		return out, err
	}
	if storedBase != out.BundleBase {
		return out, errors.New("this signed release already exists from a different source; its existing source was retained")
	}
	if err = tx.Commit(ctx); err != nil {
		return out, err
	}
	return s.Release(ctx, out.Digest)
}

func (s *Store) updateHandlers(mux *http.ServeMux, reply func(http.ResponseWriter, any, error)) {
	mux.HandleFunc("GET /system/update-source", func(w http.ResponseWriter, r *http.Request) { v, e := s.updateSource(r.Context()); reply(w, v, e) })
	mux.HandleFunc("PUT /system/update-source", func(w http.ResponseWriter, r *http.Request) {
		var req updateSource
		if e := decode(w, r, &req); e != nil {
			invalid(w, "repository", e.Error())
			return
		}
		if _, e := normalizeRepository(req.Repository); e != nil {
			invalid(w, "repository", e.Error())
			return
		}
		v, e := s.setUpdateSource(r.Context(), req.Repository)
		reply(w, v, e)
	})
	mux.HandleFunc("GET /system/update-check", func(w http.ResponseWriter, r *http.Request) {
		v, e := s.checkUpdate(r.Context(), r.URL.Query().Get("force") == "true")
		reply(w, v, e)
	})
	mux.HandleFunc("POST /system/releases/import", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Repository string `json:"repository"`
			Tag        string `json:"tag"`
		}
		if e := decode(w, r, &req); e != nil {
			invalid(w, "", e.Error())
			return
		}
		v, e := s.importGitHub(r.Context(), req.Repository, req.Tag)
		reply(w, v, e)
	})
}
