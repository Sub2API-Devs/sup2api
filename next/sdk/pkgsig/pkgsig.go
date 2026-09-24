// Package pkgsig defines the .s2plugin package digest and Ed25519 signature
// format, shared by the host (verify) and tooling (sign).
//
// Digest (hex sha256) is computed over the canonical text:
//
//	sub2api-plugin-digest-v1\n
//	<sha256 hex of manifest.json>  manifest.json\n
//	<sha256 hex of file>  <path>\n        (every other file, sorted by path)
//
// Paths are slash-separated, relative to the package root; signature.json is
// excluded; directories are not listed. The signature is Ed25519 over the
// ASCII bytes of "sub2api-plugin-signature-v1:" + digest.
package pkgsig

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
)

const (
	SignatureFile = "signature.json"
	ManifestFile  = "manifest.json"
	Algorithm     = "ed25519"
)

// Signature is the content of signature.json.
type Signature struct {
	Publisher string `json:"publisher"`
	KeyID     string `json:"keyId"`
	Algorithm string `json:"algorithm"`
	Digest    string `json:"digest"`    // "sha256:<hex>"
	Signature string `json:"signature"` // base64 std
}

// Digest computes the package digest from path -> content.
func Digest(files map[string][]byte) (string, error) {
	m, ok := files[ManifestFile]
	if !ok {
		return "", errors.New("pkgsig: manifest.json missing")
	}
	var b strings.Builder
	b.WriteString("sub2api-plugin-digest-v1\n")
	fmt.Fprintf(&b, "%s  %s\n", sum(m), ManifestFile)
	paths := make([]string, 0, len(files))
	for p := range files {
		if p == ManifestFile || p == SignatureFile {
			continue
		}
		if strings.Contains(p, "\\") || strings.HasPrefix(p, "/") || strings.Contains(p, "..") {
			return "", fmt.Errorf("pkgsig: invalid path %q", p)
		}
		paths = append(paths, p)
	}
	sort.Strings(paths)
	for _, p := range paths {
		fmt.Fprintf(&b, "%s  %s\n", sum(files[p]), p)
	}
	return "sha256:" + sum([]byte(b.String())), nil
}

func message(digest string) []byte {
	return []byte("sub2api-plugin-signature-v1:" + digest)
}

// Sign produces signature.json content for files.
func Sign(files map[string][]byte, publisher, keyID string, priv ed25519.PrivateKey) (*Signature, error) {
	d, err := Digest(files)
	if err != nil {
		return nil, err
	}
	return &Signature{
		Publisher: publisher,
		KeyID:     keyID,
		Algorithm: Algorithm,
		Digest:    d,
		Signature: base64.StdEncoding.EncodeToString(ed25519.Sign(priv, message(d))),
	}, nil
}

// Verify recomputes the digest and checks the signature with pub.
func Verify(files map[string][]byte, sig *Signature, pub ed25519.PublicKey) error {
	if sig.Algorithm != Algorithm {
		return fmt.Errorf("pkgsig: unsupported algorithm %q", sig.Algorithm)
	}
	d, err := Digest(files)
	if err != nil {
		return err
	}
	if d != sig.Digest {
		return errors.New("pkgsig: digest mismatch (package modified)")
	}
	raw, err := base64.StdEncoding.DecodeString(sig.Signature)
	if err != nil {
		return fmt.Errorf("pkgsig: bad signature encoding: %w", err)
	}
	if !ed25519.Verify(pub, message(d), raw) {
		return errors.New("pkgsig: signature verification failed")
	}
	return nil
}

// ParsePublicKey decodes a base64 Ed25519 public key.
func ParsePublicKey(b64 string) (ed25519.PublicKey, error) {
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(b64))
	if err != nil || len(raw) != ed25519.PublicKeySize {
		return nil, errors.New("pkgsig: invalid ed25519 public key")
	}
	return ed25519.PublicKey(raw), nil
}

func sum(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
