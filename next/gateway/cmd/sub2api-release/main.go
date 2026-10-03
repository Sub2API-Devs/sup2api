// sub2api-release packages already-built binaries. Signing keys are supplied by
// the release operator, never copied into the runtime or generated on a node.
package main

import (
	"archive/tar"
	"compress/gzip"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run(args []string, out io.Writer) error {
	if len(args) == 0 {
		return errors.New("usage: sub2api-release keygen|pack [flags]")
	}
	f := flag.NewFlagSet(args[0], flag.ContinueOnError)
	dest := f.String("out", "", "output directory")
	if args[0] == "keygen" {
		if err := f.Parse(args[1:]); err != nil {
			return err
		}
		if *dest == "" {
			return errors.New("--out is required")
		}
		if err := os.MkdirAll(*dest, 0700); err != nil {
			return err
		}
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return err
		}
		for _, p := range []string{"release.key", "release.pub"} {
			if _, err := os.Lstat(filepath.Join(*dest, p)); !errors.Is(err, os.ErrNotExist) {
				return errors.New("key files already exist or cannot be inspected")
			}
		}
		if err = writeNew(filepath.Join(*dest, "release.key"), []byte(base64.StdEncoding.EncodeToString(priv)+"\n"), 0600); err != nil {
			return err
		}
		if err = writeNew(filepath.Join(*dest, "release.pub"), []byte(base64.StdEncoding.EncodeToString(pub)+"\n"), 0644); err != nil {
			return err
		}
		_, err = fmt.Fprintln(out, "Created release.key and release.pub; keep the private key off runtime nodes.")
		return err
	}
	if args[0] != "pack" {
		return errors.New("unknown command")
	}
	dir := f.String("dir", "", "staged release directory (bin/sub2api required)")
	key := f.String("key", "", "base64 Ed25519 private-key file")
	keyID := f.String("key-id", "", "configured signing key ID")
	version := f.String("release-id", "", "immutable release version")
	coreVersion := f.String("core-version", "", "actual core binary version")
	commit := f.String("source-commit", "", "source commit or snapshot digest")
	build := f.String("build-id", "", "build identity (defaults to release ID)")
	schema := f.String("schema", "", "target core's embedded database contract")
	schemaBefore := f.String("schema-before", "", "source database contract (defaults to --schema for unchanged schema)")
	osName := f.String("os", runtime.GOOS, "target OS")
	arch := f.String("arch", runtime.GOARCH, "target architecture")
	abi := f.String("runtime-abi", "linux-static-v1", "runtime ABI")
	hostAPI := f.Int("host-api", 4, "plugin Host API version")
	if err := f.Parse(args[1:]); err != nil {
		return err
	}
	if *dest == "" || *dir == "" || *key == "" || *keyID == "" || *version == "" || *coreVersion == "" || *commit == "" || *schema == "" {
		return errors.New("--out, --dir, --key, --key-id, --release-id, --core-version, --source-commit and --schema are required")
	}
	if *schemaBefore == "" {
		*schemaBefore = *schema
	}
	root, err := filepath.Abs(*dir)
	if err != nil {
		return err
	}
	output, err := filepath.Abs(*dest)
	if err != nil {
		return err
	}
	if rel, err := filepath.Rel(root, output); err == nil && (rel == "." || (!strings.HasPrefix(rel, ".."+string(os.PathSeparator)) && rel != "..")) {
		return errors.New("output must be outside the staged release")
	}
	keyBytes, err := os.ReadFile(*key)
	if err != nil {
		return err
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(keyBytes)))
	if err != nil || len(decoded) != ed25519.PrivateKeySize {
		return errors.New("invalid Ed25519 private key")
	}
	if *build == "" {
		*build = *version
	}
	if err = os.MkdirAll(output, 0755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(output, ".release-*.tar.gz")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	files, err := bundle(root, tmp)
	if err != nil {
		return err
	}
	if err = tmp.Sync(); err != nil {
		return err
	}
	stat, err := tmp.Stat()
	if err != nil {
		return err
	}
	if _, err = tmp.Seek(0, io.SeekStart); err != nil {
		return err
	}
	sum := sha256.New()
	if _, err = io.Copy(sum, tmp); err != nil {
		return err
	}
	digest := hex.EncodeToString(sum.Sum(nil))
	m := rc.Manifest{ManifestVersion: 1, ReleaseID: *version, CoreVersion: *coreVersion, SourceCommit: *commit, BuildID: *build, CreatedAt: time.Now().UTC(), Platforms: []rc.Platform{{OS: *osName, Arch: *arch, RuntimeABI: *abi, BundleDigest: digest, BundleBytes: stat.Size(), Files: files}}, ShellProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol}, CoreControlProtocol: rc.Range{Min: rc.Protocol, Max: rc.Protocol}, ClusterProtocol: rc.Range{Min: 1, Max: 1}, TaskProtocol: rc.Range{Min: 1, Max: 1}, SchemaBefore: *schemaBefore, SchemaAfter: *schema, Strategy: "maintenance", HostAPIVersion: *hostAPI}
	payload, err := json.Marshal(m)
	if err != nil {
		return err
	}
	signed := rc.SignedManifest{KeyID: *keyID, Payload: payload, Signature: ed25519.Sign(decoded, payload)}
	manifestBytes, err := json.MarshalIndent(signed, "", "  ")
	if err != nil {
		return err
	}
	md := sha256.Sum256(payload)
	manifestDigest := hex.EncodeToString(md[:])
	if err = tmp.Close(); err != nil {
		return err
	}
	if err = publishFile(tmp.Name(), filepath.Join(output, digest+".tar.gz")); err != nil {
		return err
	}
	if err = writeNew(filepath.Join(output, manifestDigest+".json"), append(manifestBytes, '\n'), 0644); err != nil {
		return err
	}
	_, err = fmt.Fprintf(out, "manifest_digest=%s\nbundle_digest=%s\n", manifestDigest, digest)
	return err
}

func bundle(root string, out io.Writer) ([]rc.File, error) {
	info, err := os.Lstat(root)
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return nil, errors.New("stage must be a real directory")
	}
	gz := gzip.NewWriter(out)
	tw := tar.NewWriter(gz)
	var files []rc.File
	var total int64
	core := false
	err = filepath.WalkDir(root, func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if p == root {
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("symlink not allowed: %s", p)
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("special file not allowed: %s", p)
		}
		total += info.Size()
		if total > 2<<30 || len(files) >= 10000 {
			return errors.New("release exceeds size/file limits")
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		mode := uint32(0644)
		if info.Mode().Perm()&0111 != 0 || rel == "bin/sub2api" || rel == "bin/sub2api-plugin" {
			mode = 0755
		}
		if rel == "bin/sub2api" {
			core = true
		}
		if err = tw.WriteHeader(&tar.Header{Name: rel, Mode: int64(mode), Size: info.Size(), Typeflag: tar.TypeReg}); err != nil {
			return err
		}
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		h := sha256.New()
		n, copyErr := io.Copy(io.MultiWriter(tw, h), io.LimitReader(f, info.Size()+1))
		closeErr := f.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		if n != info.Size() {
			return errors.New("staged file changed while packing")
		}
		files = append(files, rc.File{Path: rel, SHA256: hex.EncodeToString(h.Sum(nil)), Size: n, Mode: mode})
		return nil
	})
	if err != nil {
		_ = tw.Close()
		_ = gz.Close()
		return nil, err
	}
	if !core {
		return nil, errors.New("missing bin/sub2api")
	}
	if err = tw.Close(); err != nil {
		return nil, err
	}
	if err = gz.Close(); err != nil {
		return nil, err
	}
	return files, nil
}

func writeNew(path string, b []byte, mode fs.FileMode) error {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, mode)
	if err != nil {
		return err
	}
	_, err = f.Write(b)
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		_ = os.Remove(path)
	}
	return err
}
func publishFile(src, dst string) error {
	// Hard-link publication is atomic and cannot overwrite an existing release.
	err := os.Link(src, dst)
	if errors.Is(err, os.ErrExist) {
		a, ae := os.ReadFile(src)
		b, be := os.ReadFile(dst)
		if ae == nil && be == nil && sha256.Sum256(a) == sha256.Sum256(b) {
			return nil
		}
	}
	return err
}
