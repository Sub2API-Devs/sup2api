package engine

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"time"
)

func safeHeaders(h http.Header) http.Header {
	out := h.Clone()
	for _, key := range []string{"Authorization", "Proxy-Authorization", "X-Api-Key", "Cookie", "Set-Cookie", "X-CCG-Revision"} {
		if out.Get(key) != "" {
			out.Set(key, "[REDACTED]")
		}
	}
	return out
}

// pruneRequestLogs keeps each level within its retention and budget, oldest
// first: a request's content files as full content (24h, 512 MiB), the
// request itself as a summary (7 days, 128 MiB). Only directories created by
// this logger are eligible for removal. It returns the removed requests.
func pruneRequestLogs(root string) (removed []string) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil
	}
	type record struct {
		path             string
		time             time.Time
		summary, content int64
		contentFiles     []string
	}
	var records []record
	var summaryTotal, contentTotal int64
	for _, entry := range entries {
		if !entry.IsDir() || !uuidPattern.MatchString(entry.Name()) {
			continue
		}
		p := filepath.Join(root, entry.Name())
		info, err := os.Stat(filepath.Join(p, "metadata.json"))
		if err != nil {
			// Interrupted requests have no completion metadata. They must still expire.
			if info, statErr := entry.Info(); statErr == nil && time.Since(info.ModTime()) > fullRetention && os.RemoveAll(p) == nil {
				removed = append(removed, entry.Name())
			}
			continue
		}
		r := record{path: p, time: info.ModTime()}
		files, _ := os.ReadDir(p)
		for _, f := range files {
			i, err := f.Info()
			if err != nil || f.IsDir() {
				continue
			}
			if summaryFiles[f.Name()] {
				r.summary += i.Size()
			} else {
				r.content += i.Size()
				r.contentFiles = append(r.contentFiles, filepath.Join(p, f.Name()))
			}
		}
		records = append(records, r)
		summaryTotal += r.summary
		contentTotal += r.content
	}
	sort.Slice(records, func(i, j int) bool { return records[i].time.Before(records[j].time) })
	for _, r := range records {
		if r.content > 0 && (time.Since(r.time) > fullRetention || contentTotal > fullBudget) {
			for _, f := range r.contentFiles {
				_ = os.Remove(f)
			}
			contentTotal -= r.content
		}
		if time.Since(r.time) > summaryRetention || summaryTotal > summaryBudget {
			if os.RemoveAll(r.path) == nil {
				summaryTotal -= r.summary
				removed = append(removed, filepath.Base(r.path))
			}
		}
	}
	return removed
}

// requestLogUsage is what the logs hold now, by level.
func requestLogUsage(root string) Object {
	var summary, content, requests int64
	entries, _ := os.ReadDir(root)
	for _, entry := range entries {
		if !entry.IsDir() || !uuidPattern.MatchString(entry.Name()) {
			continue
		}
		requests++
		files, _ := os.ReadDir(filepath.Join(root, entry.Name()))
		for _, f := range files {
			if i, err := f.Info(); err == nil && !f.IsDir() {
				if summaryFiles[f.Name()] {
					summary += i.Size()
				} else {
					content += i.Size()
				}
			}
		}
	}
	return Object{"summary_bytes": summary, "full_bytes": content, "requests": requests}
}

// clearContent removes the content files of the requests listed in root,
// keeping their summaries.
func clearContent(root string, requests []os.DirEntry) error {
	for _, entry := range requests {
		if !entry.IsDir() || !uuidPattern.MatchString(entry.Name()) {
			continue
		}
		files, _ := os.ReadDir(filepath.Join(root, entry.Name()))
		for _, f := range files {
			if f.IsDir() || summaryFiles[f.Name()] {
				continue
			}
			if err := removeLogPath(filepath.Join(root, entry.Name(), f.Name())); err != nil {
				return err
			}
		}
	}
	return nil
}

// removeLogPath removes a log file or directory and what it holds; nothing
// there is no error.
var removeLogPath = os.RemoveAll
