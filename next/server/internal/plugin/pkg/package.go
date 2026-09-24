package pkg

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Package is an unpacked, parsed (not yet validated) plugin package.
type Package struct {
	Raw          []byte            // the .s2plugin bytes as uploaded
	SHA256       string            // hex sha256 of Raw
	Files        map[string][]byte // path -> content (includes signature.json)
	Manifest     *manifest.Manifest
	ManifestRaw  []byte
	ManifestHash string            // hex sha256 of manifest.json
	Signature    *pkgsig.Signature // nil when the package is unsigned
}

// Open unpacks data and parses manifest.json and signature.json.
func Open(data []byte, lim Limits) (*Package, error) {
	files, err := Unpack(data, lim)
	if err != nil {
		return nil, err
	}
	raw, ok := files[pkgsig.ManifestFile]
	if !ok {
		return nil, invalidPackage("manifest.json missing")
	}
	m, err := ParseManifest(raw)
	if err != nil {
		return nil, err
	}
	p := &Package{
		Raw:          data,
		SHA256:       SHA256Hex(data),
		Files:        files,
		Manifest:     m,
		ManifestRaw:  raw,
		ManifestHash: SHA256Hex(raw),
	}
	if sb, ok := files[pkgsig.SignatureFile]; ok {
		var sig pkgsig.Signature
		if err := json.Unmarshal(sb, &sig); err != nil {
			return nil, invalidPackage("signature.json is not valid JSON")
		}
		if sig.Publisher == "" || sig.KeyID == "" || sig.Signature == "" {
			return nil, invalidPackage("signature.json is incomplete")
		}
		p.Signature = &sig
	}
	return p, nil
}

// ParseManifest decodes manifest.json. Unknown fields are tolerated so newer
// tooling can add optional metadata.
func ParseManifest(raw []byte) (*manifest.Manifest, error) {
	var m manifest.Manifest
	dec := json.NewDecoder(bytes.NewReader(raw))
	if err := dec.Decode(&m); err != nil {
		return nil, core.InvalidFields(core.FieldError{
			Field: "manifest", Code: "invalid_json", Message: fmt.Sprintf("manifest.json: %v", err),
		})
	}
	return &m, nil
}

// SHA256Hex returns the lower-case hex sha256 of b.
func SHA256Hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
