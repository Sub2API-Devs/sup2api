package engine

import (
	"context"
	"fmt"
	"io"
	"os"
	"sync"
)

type resourceSpoolBudget struct {
	mu          sync.Mutex
	used, limit int64
}

func (b *resourceSpoolBudget) reserve(n int64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if n < 0 || b.used > b.limit-n {
		return false
	}
	b.used += n
	return true
}
func (b *resourceSpoolBudget) release(n int64) { b.mu.Lock(); b.used -= n; b.mu.Unlock() }

type resourceSpool struct {
	*os.File
	size   int64
	budget *resourceSpoolBudget
	once   sync.Once
}

func (s *resourceSpool) Close() error {
	var err error
	s.once.Do(func() {
		err = s.File.Close()
		removeErr := os.Remove(s.File.Name())
		s.budget.release(s.size)
		if err == nil {
			err = removeErr
		}
	})
	return err
}

func spoolResource(ctx context.Context, dir string, source io.ReadCloser, declared, limit int64, budget *resourceSpoolBudget) (*resourceSpool, error) {
	defer source.Close()
	if limit <= 0 || limit > resourceHardLimit || declared > limit {
		return nil, fmt.Errorf("resource payload exceeds configured size limit")
	}
	f, err := os.CreateTemp(dir, "resource-body-*")
	if err != nil {
		return nil, err
	}
	spool := &resourceSpool{File: f, budget: budget}
	success := false
	defer func() {
		if !success {
			_ = spool.Close()
		}
	}()
	stop := context.AfterFunc(ctx, func() { _ = source.Close() })
	defer stop()
	buf := make([]byte, 64<<10)
	for {
		if err = ctx.Err(); err != nil {
			return nil, err
		}
		n, readErr := source.Read(buf)
		if n > 0 {
			if spool.size+int64(n) > limit {
				return nil, fmt.Errorf("resource payload exceeds configured size limit")
			}
			if !budget.reserve(int64(n)) {
				return nil, fmt.Errorf("concurrent resource spool budget exhausted")
			}
			spool.size += int64(n)
			if _, err = f.Write(buf[:n]); err != nil {
				return nil, err
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return nil, readErr
		}
	}
	if declared >= 0 && spool.size != declared {
		return nil, fmt.Errorf("resource payload length does not match Content-Length")
	}
	if _, err = f.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	success = true
	return spool, nil
}
