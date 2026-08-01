.PHONY: build generate generate-control test test-unit test-integration test-e2e

VERSION ?= $(shell ./scripts/resolve-version.sh)
LDFLAGS ?= -s -w -X main.Version=$(VERSION)

build:
	CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -trimpath -o bin/server ./cmd/server

generate: generate-control
	go generate ./ent
	go generate ./cmd/server

generate-control:
	go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.10
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
	protoc -I ../ai-gateway \
		--plugin=protoc-gen-go=$$(go env GOPATH)/bin/protoc-gen-go \
		--plugin=protoc-gen-go-grpc=$$(go env GOPATH)/bin/protoc-gen-go-grpc \
		--go_out=. --go_opt=module=github.com/Wei-Shaw/sub2api \
		--go_opt=Mapi/control/v1/control.proto=github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1 \
		--go-grpc_out=. --go-grpc_opt=module=github.com/Wei-Shaw/sub2api \
		--go-grpc_opt=Mapi/control/v1/control.proto=github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1 \
		../ai-gateway/api/control/v1/control.proto

test:
	go test ./...
	golangci-lint run ./...

test-unit:
	go test -tags=unit ./...

test-integration:
	go test -tags=integration ./...

test-e2e:
	./scripts/e2e-test.sh

test-e2e-local:
	go test -tags=e2e -v -timeout=300s ./internal/integration/...
