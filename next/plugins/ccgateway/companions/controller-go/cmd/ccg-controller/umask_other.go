//go:build !unix

package main

// setUmask: no umask outside Unix (the development machine only).
func setUmask() {}
