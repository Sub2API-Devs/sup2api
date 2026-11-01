//go:build unix

package main

import "syscall"

// setUmask is os.umask(0o077): every file the controller creates is private.
func setUmask() { syscall.Umask(0o077) }
