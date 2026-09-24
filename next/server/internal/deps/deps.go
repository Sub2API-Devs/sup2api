//go:build deps

// Package deps pins third-party modules that several server modules use, so
// parallel development does not race on go.mod. It is never compiled into the
// binary (build tag "deps").
package deps

import (
	_ "github.com/Masterminds/semver/v3"
	_ "github.com/alicebob/miniredis/v2"
	_ "github.com/elastic/go-seccomp-bpf"
	_ "github.com/expr-lang/expr"
	_ "github.com/golang-jwt/jwt/v5"
	_ "github.com/google/uuid"
	_ "github.com/hashicorp/go-plugin"
	_ "github.com/redis/go-redis/v9"
	_ "github.com/robfig/cron/v3"
	_ "github.com/santhosh-tekuri/jsonschema/v6"
	_ "github.com/tidwall/gjson"
	_ "github.com/tidwall/sjson"
	_ "golang.org/x/crypto/bcrypt"
	_ "google.golang.org/grpc"
)
