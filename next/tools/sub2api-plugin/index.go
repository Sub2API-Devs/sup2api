package main

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"golang.org/x/mod/semver"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
)

// Market index format, CONTRACTS §11.1.
type marketIndex struct {
	Version     int           `json:"version"`
	GeneratedAt string        `json:"generated_at"`
	Plugins     []indexPlugin `json:"plugins"`
}

type indexPlugin struct {
	Key         string                 `json:"key"`
	Name        manifest.LocalizedText `json:"name"`
	Description manifest.LocalizedText `json:"description,omitempty"`
	Publisher   string                 `json:"publisher"`
	Versions    []indexVersion         `json:"versions"`
}

type indexVersion struct {
	Version    string `json:"version"`
	URL        string `json:"url"`
	SHA256     string `json:"sha256"`
	Size       int64  `json:"size"`
	HostCompat string `json:"host_compat"`
}

// IndexSigPrefix is prepended to the hex sha256 of index.json before signing.
const IndexSigPrefix = "sub2api-market-index-v1:"

// cmdIndex builds and signs index.json for every .s2plugin in --dir.
func cmdIndex(args []string, stdout, stderr io.Writer) error {
	fs := newFlagSet("index", stderr)
	dir := fs.String("dir", ".", "market directory containing *.s2plugin")
	keyPath := fs.String("key", "", "market private key file (required)")
	baseURL := fs.String("base-url", "", "absolute URL prefix for packages (default: relative file names)")
	if _, err := parseInterspersed(fs, args); err != nil {
		return err
	}
	if *keyPath == "" {
		return errors.New("--key is required")
	}
	priv, err := loadPrivateKey(*keyPath)
	if err != nil {
		return err
	}
	idx, err := buildIndex(*dir, *baseURL, time.Now().UTC(), stderr)
	if err != nil {
		return err
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(idx); err != nil {
		return err
	}
	raw := buf.Bytes()
	sig := signIndex(raw, priv)
	indexPath := filepath.Join(*dir, "index.json")
	if err := os.WriteFile(indexPath, raw, 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(indexPath+".sig", []byte(sig), 0o644); err != nil {
		return err
	}
	n := 0
	for _, p := range idx.Plugins {
		n += len(p.Versions)
	}
	fmt.Fprintf(stdout, "wrote %s (%d plugins, %d versions) and %s.sig\n", indexPath, len(idx.Plugins), n, indexPath)
	return nil
}

// signIndex returns the base64 signature line for index bytes.
func signIndex(raw []byte, priv ed25519.PrivateKey) string {
	sum := sha256.Sum256(raw)
	msg := IndexSigPrefix + hex.EncodeToString(sum[:])
	return base64.StdEncoding.EncodeToString(ed25519.Sign(priv, []byte(msg)))
}

// verifyIndex checks an index signature line.
func verifyIndex(raw []byte, sigLine string, pub ed25519.PublicKey) bool {
	sig, err := base64.StdEncoding.DecodeString(strings.TrimSpace(sigLine))
	if err != nil {
		return false
	}
	sum := sha256.Sum256(raw)
	return ed25519.Verify(pub, []byte(IndexSigPrefix+hex.EncodeToString(sum[:])), sig)
}

func semverKey(v string) string {
	if !strings.HasPrefix(v, "v") {
		v = "v" + v
	}
	return v
}

func buildIndex(dir, baseURL string, now time.Time, stderr io.Writer) (*marketIndex, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	type pkgInfo struct {
		m    *manifest.Manifest
		file string
		size int64
		sum  string
	}
	byKey := map[string][]pkgInfo{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), PackageExt) {
			continue
		}
		p := filepath.Join(dir, e.Name())
		raw, err := os.ReadFile(p)
		if err != nil {
			return nil, err
		}
		files, err := readPackage(p)
		if err != nil {
			return nil, err
		}
		m, err := parseManifest(files[pkgsig.ManifestFile])
		if err != nil {
			return nil, fmt.Errorf("%s: %w", p, err)
		}
		if !semver.IsValid(semverKey(m.Version)) {
			return nil, fmt.Errorf("%s: version %q is not semver", p, m.Version)
		}
		if _, ok := files[pkgsig.SignatureFile]; !ok {
			fmt.Fprintf(stderr, "warning: %s is not signed\n", e.Name())
		}
		for _, other := range byKey[m.Key] {
			if other.m.Version == m.Version {
				return nil, fmt.Errorf("%s and %s both contain %s %s", other.file, e.Name(), m.Key, m.Version)
			}
		}
		sum := sha256.Sum256(raw)
		byKey[m.Key] = append(byKey[m.Key], pkgInfo{m: m, file: e.Name(), size: int64(len(raw)), sum: hex.EncodeToString(sum[:])})
	}
	idx := &marketIndex{Version: 1, GeneratedAt: now.Format(time.RFC3339), Plugins: []indexPlugin{}}
	keys := make([]string, 0, len(byKey))
	for k := range byKey {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		pkgs := byKey[k]
		sort.Slice(pkgs, func(i, j int) bool {
			return semver.Compare(semverKey(pkgs[i].m.Version), semverKey(pkgs[j].m.Version)) < 0
		})
		latest := pkgs[len(pkgs)-1].m
		ip := indexPlugin{Key: k, Name: latest.Name, Description: latest.Description, Publisher: latest.Publisher}
		for _, pk := range pkgs {
			u := pk.file
			if baseURL != "" {
				u = strings.TrimRight(baseURL, "/") + "/" + url.PathEscape(pk.file)
			}
			ip.Versions = append(ip.Versions, indexVersion{
				Version: pk.m.Version, URL: u, SHA256: pk.sum, Size: pk.size, HostCompat: pk.m.HostCompat,
			})
		}
		idx.Plugins = append(idx.Plugins, ip)
	}
	return idx, nil
}
