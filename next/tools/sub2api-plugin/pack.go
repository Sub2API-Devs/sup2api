package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
)

// PackageExt is the plugin package file extension.
const PackageExt = ".s2plugin"

// zipEpoch is the fixed modification time of package entries, so packing the
// same inputs yields the same bytes.
var zipEpoch = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

// Directories copied verbatim into the package.
var packDirs = []string{"forms", "migrations", "i18n"}

// cmdPack collects the package files and writes an unsigned .s2plugin.
func cmdPack(args []string, stdout, stderr io.Writer) error {
	fs := newFlagSet("pack", stderr)
	dir := fs.String("dir", ".", "plugin directory")
	out := fs.String("out", "", "output file (.s2plugin)")
	outDir := fs.String("out-dir", "", "output directory; file name is <key>-<version>.s2plugin")
	runtimesDir := fs.String("runtimes", "", "directory containing runtimes/ (default: --dir)")
	overlay := fs.String("overlay", "", "overlay directory: manifest override plus extra/replacement files")
	allowMissingUI := fs.Bool("allow-missing-ui", false, "pack even when ui/native/dist is missing")
	if _, err := parseInterspersed(fs, args); err != nil {
		return err
	}
	if (*out == "") == (*outDir == "") {
		return fmt.Errorf("exactly one of --out or --out-dir is required")
	}
	ov, err := resolveOverlay(*dir, *overlay)
	if err != nil {
		return err
	}
	rt := *runtimesDir
	if rt == "" {
		rt = *dir
	}
	files, m, warnings, err := collectPackage(*dir, rt, ov, *allowMissingUI)
	if err != nil {
		return err
	}
	for _, w := range warnings {
		fmt.Fprintln(stderr, "warning:", w)
	}
	dest := *out
	if dest == "" {
		dest = filepath.Join(*outDir, m.Key+"-"+m.Version+PackageExt)
	}
	if err := writePackage(dest, files); err != nil {
		return err
	}
	fmt.Fprintf(stderr, "packed %s %s: %d files\n", m.Key, m.Version, len(files))
	fmt.Fprintln(stdout, dest)
	return nil
}

// collectPackage gathers package path -> content.
func collectPackage(dir, runtimesDir, overlay string, allowMissingUI bool) (map[string][]byte, *manifest.Manifest, []string, error) {
	raw, m, err := effectiveManifest(dir, overlay)
	if err != nil {
		return nil, nil, nil, err
	}
	var warnings []string
	files := map[string][]byte{pkgsig.ManifestFile: raw}
	add := func(root, prefix string, skip func(rel string) bool) error {
		return addTree(files, root, prefix, skip)
	}

	for _, d := range packDirs {
		if err := add(filepath.Join(dir, d), d, nil); err != nil {
			return nil, nil, nil, err
		}
	}
	// ui/: everything except the native sources; native comes from its dist.
	if err := add(filepath.Join(dir, "ui"), "ui", func(rel string) bool {
		return rel == "native" || strings.HasPrefix(rel, "native/")
	}); err != nil {
		return nil, nil, nil, err
	}
	if err := add(filepath.Join(dir, "ui", "native", "dist"), "ui/native", nil); err != nil {
		return nil, nil, nil, err
	}
	// Runtimes.
	if err := add(filepath.Join(runtimesDir, "runtimes"), "runtimes", nil); err != nil {
		return nil, nil, nil, err
	}
	// Icon stored in the package.
	if m.Icon != "" && !strings.HasPrefix(m.Icon, "text:") {
		b, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(m.Icon)))
		if err != nil {
			return nil, nil, nil, fmt.Errorf("icon: %w", err)
		}
		files[m.Icon] = b
	}
	// Overlay files (except the manifest override files) win.
	if overlay != "" {
		if err := add(overlay, "", func(rel string) bool { return rel == overlayManifest || rel == overlayPatch }); err != nil {
			return nil, nil, nil, err
		}
	}

	w, err := checkPackage(files, m, allowMissingUI)
	if err != nil {
		return nil, nil, nil, err
	}
	return files, m, append(warnings, w...), nil
}

// addTree adds every regular file below root (if it exists) under prefix.
// Dot files are skipped.
func addTree(files map[string][]byte, root, prefix string, skip func(rel string) bool) error {
	st, err := os.Stat(root)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if !st.IsDir() {
		return fmt.Errorf("%s is not a directory", root)
	}
	return filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if rel == "." {
			return nil
		}
		if strings.HasPrefix(d.Name(), ".") || (skip != nil && skip(rel)) {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if d.IsDir() || !d.Type().IsRegular() {
			return nil
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		files[path.Join(prefix, rel)] = b
		return nil
	})
}

// checkPackage verifies that the files referenced by the manifest exist.
func checkPackage(files map[string][]byte, m *manifest.Manifest, allowMissingUI bool) ([]string, error) {
	var warnings []string
	var missing []string
	need := func(p, what string) {
		if p == "" {
			return
		}
		if _, ok := files[p]; !ok {
			missing = append(missing, fmt.Sprintf("%s (%s)", p, what))
		}
	}
	// Account types are top-level (ARCHITECTURE 6.6): any plugin may declare
	// them, with the upstream protocols they speak natively.
	var invalid []string
	hasCap := func(id string) bool {
		for _, c := range m.Capabilities {
			if c.ID == id {
				return true
			}
		}
		return false
	}
	if len(m.AccountTypes) > 0 && !hasCap(manifest.CapPlatformAdapter) {
		invalid = append(invalid, "accountTypes need capability "+manifest.CapPlatformAdapter)
	}
	for _, at := range m.AccountTypes {
		if at.Form.Mode == "schema" {
			need(at.Form.Schema, "account type "+at.ID+" schema")
			need(at.Form.UISchema, "account type "+at.ID+" uiSchema")
		}
		if len(at.Protocols) == 0 {
			invalid = append(invalid, "account type "+at.ID+" declares no protocols")
		}
		seen := map[string]bool{}
		for _, p := range at.Protocols {
			if p.Protocol == "" || seen[p.Protocol] {
				invalid = append(invalid, fmt.Sprintf("account type %s: empty or duplicate protocol %q", at.ID, p.Protocol))
			}
			seen[p.Protocol] = true
		}
	}
	if len(invalid) > 0 {
		return nil, fmt.Errorf("invalid manifest: %s", strings.Join(invalid, "; "))
	}
	if m.UI != nil {
		if s := m.UI.Settings; s != nil && s.Mode == "schema" {
			need(s.Schema, "settings schema")
			need(s.UISchema, "settings uiSchema")
		}
		if m.UI.Native != nil {
			if _, ok := files[m.UI.Native.Entry]; !ok {
				if !allowMissingUI {
					return nil, fmt.Errorf("native UI entry %s missing: build ui/native first (dist/) or pass --allow-missing-ui", m.UI.Native.Entry)
				}
				warnings = append(warnings, "native UI entry "+m.UI.Native.Entry+" missing (--allow-missing-ui)")
			}
		}
	}
	if m.Database != nil {
		prefix := strings.TrimSuffix(m.Database.Migrations, "/") + "/"
		n := 0
		for p := range files {
			if strings.HasPrefix(p, prefix) && strings.HasSuffix(p, ".sql") {
				n++
			}
		}
		if n == 0 {
			missing = append(missing, prefix+"*.sql (database migrations)")
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return nil, fmt.Errorf("missing package files: %s", strings.Join(missing, ", "))
	}
	if m.Runtime == "grpc" {
		tmpl := "runtimes/{os}-{arch}/plugin"
		if m.Entry.GRPC != nil && m.Entry.GRPC.Binaries != "" {
			tmpl = m.Entry.GRPC.Binaries
		}
		found := 0
		for _, plat := range defaultPlatforms {
			goos, goarch, _ := strings.Cut(plat, "/")
			p := strings.NewReplacer("{os}", goos, "{arch}", goarch).Replace(tmpl)
			if _, ok := files[p]; ok {
				found++
			} else {
				warnings = append(warnings, "runtime binary "+p+" missing")
			}
		}
		if found == 0 {
			hasAny := false
			for p := range files {
				hasAny = hasAny || strings.HasPrefix(p, "runtimes/")
			}
			if !hasAny {
				return nil, fmt.Errorf("no runtime binaries: run `sub2api-plugin build` first")
			}
		}
	}
	return warnings, nil
}

// fileMode is the zip mode of a package path.
func fileMode(p string) os.FileMode {
	if strings.HasPrefix(p, "runtimes/") {
		return 0o755
	}
	return 0o644
}

// writePackage writes files as a zip, sorted, with fixed timestamps.
func writePackage(dest string, files map[string][]byte) error {
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	paths := make([]string, 0, len(files))
	for p := range files {
		paths = append(paths, p)
	}
	sort.Strings(paths)
	// manifest.json first for readers that stream the archive.
	sort.SliceStable(paths, func(i, j int) bool { return paths[i] == pkgsig.ManifestFile && paths[j] != pkgsig.ManifestFile })
	for _, p := range paths {
		h := &zip.FileHeader{Name: p, Method: zip.Deflate, Modified: zipEpoch}
		h.SetMode(fileMode(p))
		w, err := zw.CreateHeader(h)
		if err != nil {
			return err
		}
		if _, err := w.Write(files[p]); err != nil {
			return err
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	tmp := dest + ".tmp"
	if err := os.WriteFile(tmp, buf.Bytes(), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, dest)
}

// readPackage reads every file of a .s2plugin.
func readPackage(src string) (map[string][]byte, error) {
	zr, err := zip.OpenReader(src)
	if err != nil {
		return nil, err
	}
	defer zr.Close()
	files := map[string][]byte{}
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		name := f.Name
		if strings.Contains(name, "\\") || strings.HasPrefix(name, "/") || strings.Contains(name, "..") {
			return nil, fmt.Errorf("unsafe path %q in package", name)
		}
		if _, dup := files[name]; dup {
			return nil, fmt.Errorf("duplicate entry %q in package", name)
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		b, err := io.ReadAll(io.LimitReader(rc, 1<<30))
		rc.Close()
		if err != nil {
			return nil, err
		}
		files[name] = b
	}
	if _, ok := files[pkgsig.ManifestFile]; !ok {
		return nil, fmt.Errorf("%s: manifest.json missing", src)
	}
	return files, nil
}
