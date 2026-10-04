# 重新生成插件协议代码

插件协议定义在 `next/sdk/proto/sub2api/plugin/v1/*.proto`，生成的 Go 代码在 `next/sdk/gen/pluginv1/`（已提交，平时不需要生成）。改了 `.proto` 之后才需要重新生成。

## 工具

- [buf](https://github.com/bufbuild/buf/releases)（本机：`C:\Users\16790\go\bin\buf.exe`，已在 PATH）
- `protoc-gen-go`、`protoc-gen-go-grpc`，需在 PATH 中：

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

## 生成

```bash
cd next/sdk
buf generate
```

配置见 `next/sdk/buf.yaml` 与 `buf.gen.yaml`。生成后检查 `git diff next/sdk/gen`：生成器版本注释（文件头的 `protoc-gen-go vX`）应与原文件一致，否则说明本地插件版本不同，会产生无关的大段改动。

## 改了 RPC 之后

`PlatformService` 等服务新增方法后，还要同步：

- `next/server/internal/core/ports_plugin.go` 的接口
- `next/server/internal/plugin/grpcruntime/adapters.go` 的适配器（选择调用类别与超时）
- `next/sdk/pluginsdk` 中插件侧的可选接口与 `serve.go` 的分发
- 所有实现这些接口的测试 fake（`go build ./... && go vet ./...` 会把遗漏的全部报出来）

新增方法应当是可选的：插件不实现时返回 `codes.Unimplemented`，核心据此降级，旧插件无需重新构建。
