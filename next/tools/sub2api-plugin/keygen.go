package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
)

var keyIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$`)

// cmdKeygen writes <out>/<id>.key (base64 ed25519 seed, mode 0600) and
// <out>/<id>.pub (base64 raw public key).
func cmdKeygen(args []string, stdout, stderr io.Writer) error {
	fs := newFlagSet("keygen", stderr)
	keyID := fs.String("key-id", "", "key id, e.g. sub2api-dev-2026 (required)")
	out := fs.String("out", ".", "output directory")
	force := fs.Bool("force", false, "overwrite existing key files")
	if _, err := parseInterspersed(fs, args); err != nil {
		return err
	}
	if !keyIDPattern.MatchString(*keyID) {
		return errors.New("--key-id is required (letters, digits, . _ -)")
	}
	if err := os.MkdirAll(*out, 0o755); err != nil {
		return err
	}
	privPath := filepath.Join(*out, *keyID+".key")
	pubPath := filepath.Join(*out, *keyID+".pub")
	if !*force {
		for _, p := range []string{privPath, pubPath} {
			if _, err := os.Stat(p); err == nil {
				return fmt.Errorf("%s already exists (use --force to overwrite)", p)
			}
		}
	}
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return err
	}
	pubB64 := base64.StdEncoding.EncodeToString(pub)
	if err := os.WriteFile(privPath, []byte(base64.StdEncoding.EncodeToString(priv.Seed())+"\n"), 0o600); err != nil {
		return err
	}
	if err := os.WriteFile(pubPath, []byte(pubB64+"\n"), 0o644); err != nil {
		return err
	}
	fmt.Fprintf(stdout, "key_id:      %s\npublic_key:  %s\nprivate_key: %s\npublic_file: %s\n", *keyID, pubB64, privPath, pubPath)
	return nil
}

// loadPrivateKey reads a base64 ed25519 seed (32 bytes) or private key (64
// bytes).
func loadPrivateKey(path string) (ed25519.PrivateKey, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(b)))
	if err != nil {
		return nil, fmt.Errorf("%s: not base64: %w", path, err)
	}
	switch len(raw) {
	case ed25519.SeedSize:
		return ed25519.NewKeyFromSeed(raw), nil
	case ed25519.PrivateKeySize:
		return ed25519.PrivateKey(raw), nil
	default:
		return nil, fmt.Errorf("%s: expected a 32-byte seed or 64-byte ed25519 private key, got %d bytes", path, len(raw))
	}
}

// loadPublicKey accepts a file path or a base64 key.
func loadPublicKey(v string) (ed25519.PublicKey, error) {
	if b, err := os.ReadFile(v); err == nil {
		v = string(b)
	}
	return pkgsig.ParsePublicKey(v)
}
