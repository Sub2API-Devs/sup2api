// Package market is the plugin market client: signed static indexes
// (CONTRACTS §11.1), listing and one-click install.
package market

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Masterminds/semver/v3"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// IndexSignaturePrefix is prepended to sha256hex(index.json) before signing.
const IndexSignaturePrefix = "sub2api-market-index-v1:"

const (
	cacheTTL      = 5 * time.Minute
	maxIndexBytes = 8 << 20
	maxSigBytes   = 4 << 10
)

// Source is a market_sources row.
type Source struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	PublicKey string    `json:"public_key"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

// Index is index.json.
type Index struct {
	Version     int           `json:"version"`
	GeneratedAt time.Time     `json:"generated_at"`
	Plugins     []IndexPlugin `json:"plugins"`
}

type IndexPlugin struct {
	Key         string             `json:"key"`
	Name        core.LocalizedText `json:"name"`
	Description core.LocalizedText `json:"description"`
	Publisher   string             `json:"publisher"`
	Versions    []IndexVersion     `json:"versions"`
}

type IndexVersion struct {
	Version    string `json:"version"`
	URL        string `json:"url"`
	SHA256     string `json:"sha256"`
	Size       int64  `json:"size"`
	HostCompat string `json:"host_compat"`
}

// Installer is the part of install.Service the market needs.
type Installer interface {
	Upload(ctx context.Context, data []byte, actorID int64, opt install.UploadOptions) (*install.Review, error)
	HostVersion() string
}

// Service fetches and caches market indexes.
type Service struct {
	db       *store.DB
	inst     Installer
	client   *http.Client
	maxBytes int64
	now      func() time.Time

	mu    sync.Mutex
	cache map[int64]cached
}

type cached struct {
	at       time.Time
	indexURL string
	pubKey   string
	idx      *Index
}

// New builds the market client. client nil uses a 60 s timeout client;
// maxPackageBytes bounds downloads (config MaxPackageBytes).
func New(db *store.DB, inst Installer, client *http.Client, maxPackageBytes int64) *Service {
	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}
	if maxPackageBytes <= 0 {
		maxPackageBytes = pkg.DefaultMaxPackageBytes
	}
	return &Service{db: db, inst: inst, client: client, maxBytes: maxPackageBytes, now: time.Now, cache: map[int64]cached{}}
}

// SeedSources upserts sources from SUB2API_MARKET_SOURCES
// ([{name,url,public_key}]); existing sources with the same name are updated.
func (s *Service) SeedSources(ctx context.Context, sourcesJSON string) error {
	if strings.TrimSpace(sourcesJSON) == "" {
		return nil
	}
	var in []struct {
		Name      string `json:"name"`
		URL       string `json:"url"`
		PublicKey string `json:"public_key"`
	}
	if err := json.Unmarshal([]byte(sourcesJSON), &in); err != nil {
		return fmt.Errorf("market sources: %w", err)
	}
	for _, src := range in {
		if src.Name == "" {
			return fmt.Errorf("market sources: name is required")
		}
		if _, err := indexURL(src.URL); err != nil {
			return fmt.Errorf("market source %q: %w", src.Name, err)
		}
		if _, err := pkgsig.ParsePublicKey(src.PublicKey); err != nil {
			return fmt.Errorf("market source %q: %w", src.Name, err)
		}
		if _, err := s.db.Pool.Exec(ctx, `
			INSERT INTO market_sources (name, url, public_key) VALUES ($1, $2, $3)
			ON CONFLICT (name) DO UPDATE SET url = EXCLUDED.url, public_key = EXCLUDED.public_key`,
			src.Name, src.URL, strings.TrimSpace(src.PublicKey)); err != nil {
			return err
		}
	}
	return nil
}

// ListSources returns all sources.
func (s *Service) ListSources(ctx context.Context) ([]Source, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT id, name, url, public_key, enabled, created_at FROM market_sources ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Source{}
	for rows.Next() {
		var src Source
		if err := rows.Scan(&src.ID, &src.Name, &src.URL, &src.PublicKey, &src.Enabled, &src.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, src)
	}
	return out, rows.Err()
}

func (s *Service) source(ctx context.Context, id int64) (*Source, error) {
	var src Source
	err := s.db.Pool.QueryRow(ctx, `SELECT id, name, url, public_key, enabled, created_at FROM market_sources WHERE id = $1`, id).
		Scan(&src.ID, &src.Name, &src.URL, &src.PublicKey, &src.Enabled, &src.CreatedAt)
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("market source not found")
	}
	if err != nil {
		return nil, err
	}
	if !src.Enabled {
		return nil, core.ErrNotFound.WithMessage("market source is disabled")
	}
	return &src, nil
}

func indexURL(raw string) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, fmt.Errorf("url must be an absolute http(s) URL")
	}
	if strings.HasSuffix(u.Path, "/") || u.Path == "" {
		u.Path = strings.TrimSuffix(u.Path, "/") + "/index.json"
	}
	return u, nil
}

// Index returns the verified index of a source (cached for 5 minutes).
func (s *Service) Index(ctx context.Context, sourceID int64, refresh bool) (*Index, *Source, error) {
	src, err := s.source(ctx, sourceID)
	if err != nil {
		return nil, nil, err
	}
	u, err := indexURL(src.URL)
	if err != nil {
		return nil, nil, core.ErrInvalidArgument.WithMessage(err.Error())
	}
	s.mu.Lock()
	c, ok := s.cache[src.ID]
	s.mu.Unlock()
	if ok && !refresh && c.indexURL == u.String() && c.pubKey == src.PublicKey && s.now().Sub(c.at) < cacheTTL {
		return c.idx, src, nil
	}
	raw, err := s.fetch(ctx, u.String(), maxIndexBytes)
	if err != nil {
		return nil, nil, err
	}
	sig, err := s.fetch(ctx, u.String()+".sig", maxSigBytes)
	if err != nil {
		return nil, nil, err
	}
	idx, err := VerifyIndex(raw, sig, src.PublicKey)
	if err != nil {
		return nil, nil, core.ErrUnavailable.WithMessage("market index verification failed: " + err.Error()).WithCause(err)
	}
	s.mu.Lock()
	s.cache[src.ID] = cached{at: s.now(), indexURL: u.String(), pubKey: src.PublicKey, idx: idx}
	s.mu.Unlock()
	return idx, src, nil
}

// VerifyIndex checks index.json.sig and parses index.json.
func VerifyIndex(raw, sig []byte, publicKeyB64 string) (*Index, error) {
	pub, err := pkgsig.ParsePublicKey(publicKeyB64)
	if err != nil {
		return nil, err
	}
	sigRaw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(sig)))
	if err != nil {
		return nil, fmt.Errorf("index signature is not base64")
	}
	sum := sha256.Sum256(raw)
	if !ed25519.Verify(pub, []byte(IndexSignaturePrefix+hex.EncodeToString(sum[:])), sigRaw) {
		return nil, fmt.Errorf("index signature does not match")
	}
	var idx Index
	if err := json.Unmarshal(raw, &idx); err != nil {
		return nil, fmt.Errorf("index.json: %w", err)
	}
	if idx.Version != 1 {
		return nil, fmt.Errorf("unsupported index version %d", idx.Version)
	}
	return &idx, nil
}

// SignIndex produces index.json.sig content (tests and tooling).
func SignIndex(raw []byte, priv ed25519.PrivateKey) []byte {
	sum := sha256.Sum256(raw)
	return []byte(base64.StdEncoding.EncodeToString(ed25519.Sign(priv, []byte(IndexSignaturePrefix+hex.EncodeToString(sum[:])))) + "\n")
}

func (s *Service) fetch(ctx context.Context, u string, limit int64) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, core.ErrInvalidArgument.WithMessage("invalid market URL")
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, core.ErrUnavailable.WithMessage("market fetch failed").WithCause(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, core.ErrUnavailable.WithMessage(fmt.Sprintf("market fetch %s: HTTP %d", redact(u), resp.StatusCode))
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, core.ErrUnavailable.WithMessage("market fetch failed").WithCause(err)
	}
	if int64(len(b)) > limit {
		return nil, core.ErrInvalidArgument.WithMessage(fmt.Sprintf("market download exceeds %d bytes", limit))
	}
	return b, nil
}

func redact(u string) string {
	p, err := url.Parse(u)
	if err != nil {
		return "url"
	}
	p.User, p.RawQuery = nil, ""
	return p.String()
}

// MarketPlugin is one listing row.
type MarketPlugin struct {
	SourceID         int64              `json:"source_id"`
	SourceName       string             `json:"source_name"`
	Key              string             `json:"key"`
	Name             core.LocalizedText `json:"name"`
	Description      core.LocalizedText `json:"description"`
	Publisher        string             `json:"publisher"`
	Trust            string             `json:"trust"` // registered trust, "unknown" otherwise
	LatestVersion    string             `json:"latest_version"`
	Versions         []MarketVersion    `json:"versions"`
	InstalledVersion string             `json:"installed_version,omitempty"`
	InstalledStatus  string             `json:"installed_status,omitempty"`
	UpdateAvailable  bool               `json:"update_available"`
}

type MarketVersion struct {
	Version    string `json:"version"`
	Size       int64  `json:"size"`
	HostCompat string `json:"host_compat"`
	Compatible bool   `json:"compatible"`
}

// ListPlugins lists the plugins of one source (sourceID > 0) or of every
// enabled source, annotated with install state and update availability.
func (s *Service) ListPlugins(ctx context.Context, sourceID int64, refresh bool) ([]MarketPlugin, error) {
	var ids []int64
	if sourceID > 0 {
		ids = []int64{sourceID}
	} else {
		srcs, err := s.ListSources(ctx)
		if err != nil {
			return nil, err
		}
		for _, src := range srcs {
			if src.Enabled {
				ids = append(ids, src.ID)
			}
		}
	}
	installed, err := s.installed(ctx)
	if err != nil {
		return nil, err
	}
	trust, err := s.trustLevels(ctx)
	if err != nil {
		return nil, err
	}
	out := []MarketPlugin{}
	for _, id := range ids {
		idx, src, err := s.Index(ctx, id, refresh)
		if err != nil {
			if sourceID > 0 {
				return nil, err
			}
			continue // skip broken sources when listing all
		}
		for _, p := range idx.Plugins {
			mp := MarketPlugin{SourceID: src.ID, SourceName: src.Name, Key: p.Key, Name: p.Name, Description: p.Description,
				Publisher: p.Publisher, Trust: "unknown", Versions: []MarketVersion{}}
			if t, ok := trust[p.Publisher]; ok {
				mp.Trust = t
			}
			var latest *semver.Version
			for _, v := range sortedVersions(p.Versions) {
				ok, _ := pkg.HostCompatible(v.HostCompat, s.inst.HostVersion())
				if v.HostCompat == "" {
					ok = true
				}
				mp.Versions = append(mp.Versions, MarketVersion{Version: v.Version, Size: v.Size, HostCompat: v.HostCompat, Compatible: ok})
				sv, err := semver.NewVersion(v.Version)
				if err == nil && ok && (latest == nil || sv.GreaterThan(latest)) {
					latest = sv
					mp.LatestVersion = v.Version
				}
			}
			if inst, ok := installed[p.Key]; ok {
				mp.InstalledVersion, mp.InstalledStatus = inst[0], inst[1]
				cur, err := semver.NewVersion(inst[0])
				mp.UpdateAvailable = err == nil && latest != nil && latest.GreaterThan(cur)
			}
			out = append(out, mp)
		}
	}
	return out, nil
}

func sortedVersions(vs []IndexVersion) []IndexVersion {
	out := append([]IndexVersion(nil), vs...)
	sort.SliceStable(out, func(i, j int) bool {
		a, e1 := semver.NewVersion(out[i].Version)
		b, e2 := semver.NewVersion(out[j].Version)
		if e1 != nil || e2 != nil {
			return out[i].Version > out[j].Version
		}
		return a.GreaterThan(b)
	})
	return out
}

// installed maps plugin key -> [current version, status].
func (s *Service) installed(ctx context.Context) (map[string][2]string, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT key, status FROM plugins`)
	if err != nil {
		return nil, err
	}
	var keys, statuses []string
	for rows.Next() {
		var k, st string
		if err := rows.Scan(&k, &st); err != nil {
			rows.Close()
			return nil, err
		}
		keys, statuses = append(keys, k), append(statuses, st)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := map[string][2]string{}
	for i, k := range keys {
		v, err := install.CurrentVersion(ctx, s.db.Pool, k)
		if err != nil {
			return nil, err
		}
		out[k] = [2]string{v, statuses[i]}
	}
	return out, nil
}

func (s *Service) trustLevels(ctx context.Context) (map[string]string, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT name, trust_level, status FROM publishers`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var n, t, st string
		if err := rows.Scan(&n, &t, &st); err != nil {
			return nil, err
		}
		if st != "active" {
			t = "revoked"
		}
		out[n] = t
	}
	return out, rows.Err()
}

// Install downloads a version, checks size and sha256, and hands the
// package to the installer (signature, trust and manifest checks happen
// there). Returns the consent review.
func (s *Service) Install(ctx context.Context, sourceID int64, key, version string, actorID int64) (*install.Review, error) {
	idx, src, err := s.Index(ctx, sourceID, false)
	if err != nil {
		return nil, err
	}
	entry, err := findVersion(idx, key, version)
	if err != nil {
		// The cached index may be stale; retry once with a fresh copy.
		if idx, src, err = s.Index(ctx, sourceID, true); err != nil {
			return nil, err
		}
		if entry, err = findVersion(idx, key, version); err != nil {
			return nil, err
		}
	}
	base, _ := indexURL(src.URL)
	ref, err := url.Parse(entry.URL)
	if err != nil {
		return nil, core.ErrUnavailable.WithMessage("market entry has an invalid url")
	}
	dl := base.ResolveReference(ref)
	if dl.Scheme != "http" && dl.Scheme != "https" {
		return nil, core.ErrUnavailable.WithMessage("market entry url must be http(s)")
	}
	if entry.Size > s.maxBytes {
		return nil, core.ErrInvalidArgument.WithMessage(fmt.Sprintf("package size %d exceeds the limit of %d bytes", entry.Size, s.maxBytes))
	}
	data, err := s.fetch(ctx, dl.String(), s.maxBytes)
	if err != nil {
		return nil, err
	}
	if entry.Size > 0 && int64(len(data)) != entry.Size {
		return nil, core.ErrInvalidArgument.WithMessage("downloaded package size does not match the index")
	}
	if !strings.EqualFold(pkg.SHA256Hex(data), entry.SHA256) {
		return nil, core.ErrInvalidArgument.WithMessage("downloaded package sha256 does not match the index")
	}
	return s.inst.Upload(ctx, data, actorID, install.UploadOptions{
		ExpectKey: key, ExpectVersion: version, Source: fmt.Sprintf("market:%d", src.ID),
	})
}

func findVersion(idx *Index, key, version string) (*IndexVersion, error) {
	for _, p := range idx.Plugins {
		if p.Key != key {
			continue
		}
		for i := range p.Versions {
			if p.Versions[i].Version == version {
				return &p.Versions[i], nil
			}
		}
	}
	return nil, core.ErrNotFound.WithMessage(fmt.Sprintf("plugin %s %s not found in market index", key, version))
}
