//go:build !linux

package main

// hardenProcess has nothing to do where the gateway cannot supervise a core.
func hardenProcess() error { return nil }
