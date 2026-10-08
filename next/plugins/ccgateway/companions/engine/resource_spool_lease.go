package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type resourceLease struct {
	file *os.File
	dir  string
	once sync.Once
}

func openResourceSpool(root string) (*resourceLease, error) {
	if err := os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), "instance-") {
			continue
		}
		dir := filepath.Join(root, entry.Name())
		leasePath := dir + ".lease"
		info, err := os.Lstat(leasePath)
		if err != nil || !info.Mode().IsRegular() {
			continue
		}
		file, err := os.OpenFile(leasePath, os.O_RDWR, 0600)
		if err != nil {
			continue
		}
		if lockResourceLease(file) != nil {
			file.Close()
			continue
		}
		// Only a dead instance's exact, direct spool children are removable.
		cleanResourceSpool(dir)
		file.Close()
		if _, err = os.Stat(dir); os.IsNotExist(err) {
			_ = os.Remove(leasePath)
		}
	}
	dir := filepath.Join(root, "instance-"+uuid())
	file, err := os.OpenFile(dir+".lease", os.O_RDWR|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return nil, err
	}
	if err = lockResourceLease(file); err != nil {
		file.Close()
		os.Remove(file.Name())
		return nil, fmt.Errorf("resource spool lease unavailable")
	}
	// Lock precedes mkdir, so another runtime cannot reclaim a starting instance.
	if err = os.Mkdir(dir, 0700); err != nil {
		file.Close()
		os.Remove(file.Name())
		return nil, err
	}
	return &resourceLease{file: file, dir: dir}, nil
}

func cleanResourceSpool(dir string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasPrefix(entry.Name(), "resource-body-") {
			continue
		}
		_ = os.Remove(filepath.Join(dir, entry.Name()))
	}
	_ = os.Remove(dir) // Nonempty or unrecognized content fails closed; no recursion.
}

func (lease *resourceLease) Close() error {
	if lease == nil {
		return nil
	}
	lease.once.Do(func() { cleanResourceSpool(lease.dir); lease.file.Close(); os.Remove(lease.file.Name()) })
	return nil
}
