.PHONY: generate fmt test build check

PROTOC_GEN_GO ?= protoc-gen-go
PROTOC_GEN_GO_GRPC ?= protoc-gen-go-grpc

generate:
	protoc \
		--plugin=protoc-gen-go=$$(command -v $(PROTOC_GEN_GO)) \
		--plugin=protoc-gen-go-grpc=$$(command -v $(PROTOC_GEN_GO_GRPC)) \
		--go_out=. --go_opt=module=github.com/Sub2API-Devs/sup2api/ai-gateway \
		--go-grpc_out=. --go-grpc_opt=module=github.com/Sub2API-Devs/sup2api/ai-gateway \
		api/control/v1/control.proto

fmt:
	gofmt -w $$(find . -name '*.go' -not -path './gen/*')

test:
	go test ./...

build:
	mkdir -p bin
	go build -o bin/ai-gateway ./cmd/ai-gateway

check: test build
