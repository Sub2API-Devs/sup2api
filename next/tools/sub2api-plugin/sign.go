package main

import (
	"crypto/ed25519"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
)

// cmdSign signs a package in place (signature.json is replaced).
func cmdSign(args []string, stdout, stderr io.Writer) error {
	fs := newFlagSet("sign", stderr)
	keyPath := fs.String("key", "", "private key file from keygen (required)")
	keyID := fs.String("key-id", "", "key id registered for the publisher (required)")
	publisher := fs.String("publisher", "", "publisher name (default: manifest.publisher)")
	pos, err := parseInterspersed(fs, args)
	if err != nil {
		return err
	}
	if *keyPath == "" || *keyID == "" || len(pos) == 0 {
		return errors.New("usage: sign --key <file> --key-id <id> [--publisher <name>] <file.s2plugin>...")
	}
	priv, err := loadPrivateKey(*keyPath)
	if err != nil {
		return err
	}
	for _, pkg := range pos {
		files, err := readPackage(pkg)
		if err != nil {
			return err
		}
		delete(files, pkgsig.SignatureFile)
		m, err := parseManifest(files[pkgsig.ManifestFile])
		if err != nil {
			return fmt.Errorf("%s: %w", pkg, err)
		}
		pub := *publisher
		if pub == "" {
			pub = m.Publisher
		}
		if pub == "" {
			return fmt.Errorf("%s: no publisher (manifest.publisher empty and --publisher unset)", pkg)
		}
		if m.Publisher != "" && pub != m.Publisher {
			fmt.Fprintf(stderr, "warning: --publisher %q differs from manifest.publisher %q\n", pub, m.Publisher)
		}
		sig, err := pkgsig.Sign(files, pub, *keyID, priv)
		if err != nil {
			return fmt.Errorf("%s: %w", pkg, err)
		}
		b, err := json.MarshalIndent(sig, "", "  ")
		if err != nil {
			return err
		}
		files[pkgsig.SignatureFile] = append(b, '\n')
		if err := writePackage(pkg, files); err != nil {
			return err
		}
		fmt.Fprintf(stdout, "signed %s (%s %s) digest %s key %s\n", pkg, m.Key, m.Version, sig.Digest, sig.KeyID)
	}
	return nil
}

// cmdVerify checks the package signature with a public key.
func cmdVerify(args []string, stdout, stderr io.Writer) error {
	fs := newFlagSet("verify", stderr)
	pubArg := fs.String("pub", "", "public key file or base64 key (required)")
	pos, err := parseInterspersed(fs, args)
	if err != nil {
		return err
	}
	if *pubArg == "" || len(pos) == 0 {
		return errors.New("usage: verify --pub <file|base64> <file.s2plugin>...")
	}
	pub, err := loadPublicKey(*pubArg)
	if err != nil {
		return err
	}
	for _, pkg := range pos {
		sig, m, err := verifyPackage(pkg, pub)
		if err != nil {
			return fmt.Errorf("%s: %w", pkg, err)
		}
		fmt.Fprintf(stdout, "OK %s: %s %s publisher=%s key=%s %s\n", pkg, m.Key, m.Version, sig.Publisher, sig.KeyID, sig.Digest)
	}
	return nil
}

// verifyPackage checks signature.json of pkg against pub.
func verifyPackage(pkg string, pub ed25519.PublicKey) (*pkgsig.Signature, *manifest.Manifest, error) {
	files, err := readPackage(pkg)
	if err != nil {
		return nil, nil, err
	}
	raw, ok := files[pkgsig.SignatureFile]
	if !ok {
		return nil, nil, errors.New("package is not signed (signature.json missing)")
	}
	var sig pkgsig.Signature
	if err := json.Unmarshal(raw, &sig); err != nil {
		return nil, nil, fmt.Errorf("signature.json: %w", err)
	}
	delete(files, pkgsig.SignatureFile)
	if err := pkgsig.Verify(files, &sig, pub); err != nil {
		return nil, nil, err
	}
	m, err := parseManifest(files[pkgsig.ManifestFile])
	if err != nil {
		return nil, nil, err
	}
	return &sig, m, nil
}
