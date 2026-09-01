.PHONY: build run test clean deps help dev prod

# 变量定义
BINARY_NAME=meeting-api
BUILD_DIR=bin
GO_FILES=$(shell find . -type f -name "*.go")

# 默认目标
help: ## 显示帮助信息
	@echo "可用的命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

deps: ## 安装依赖
	@echo "安装Go依赖..."
	go mod tidy
	go mod download

build: deps ## 构建应用程序 (默认amd64)
	@echo "构建应用程序..."
	mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -X main.buildTime=$(shell date +%Y%m%d%H%M%S)" -o $(BUILD_DIR)/$(BINARY_NAME) cmd/server/main.go

build-amd64: deps ## 构建 x86_64/amd64 版本
	@echo "构建 amd64 版本..."
	mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -X main.buildTime=$(shell date +%Y%m%d%H%M%S)" -o $(BUILD_DIR)/$(BINARY_NAME)-amd64 cmd/server/main.go

build-arm64: deps ## 构建 ARM64 版本
	@echo "构建 arm64 版本..."
	mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-w -s -X main.buildTime=$(shell date +%Y%m%d%H%M%S)" -o $(BUILD_DIR)/$(BINARY_NAME)-arm64 cmd/server/main.go

build-all: build-amd64 build-arm64 ## 构建所有架构版本
	@echo "已构建所有架构版本:"
	@ls -la $(BUILD_DIR)/

build-local: deps ## 构建本地版本
	@echo "构建本地版本..."
	mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) cmd/server/main.go

run: build-local ## 运行应用程序
	@echo "启动应用程序..."
	./$(BUILD_DIR)/$(BINARY_NAME)

dev: ## 开发模式运行 (使用 air 热重载)
	@if ! command -v air > /dev/null; then \
		echo "安装 air..."; \
		go install github.com/air-verse/air@latest; \
	fi
	@echo "开发模式启动 (热重载)..."
	air

test: ## 运行测试
	@echo "运行测试..."
	go test -v -race -cover ./...

test-coverage: ## 生成测试覆盖率报告
	@echo "生成测试覆盖率报告..."
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "覆盖率报告已生成: coverage.html"

clean: ## 清理构建文件
	@echo "清理构建文件..."
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html
	rm -f data.db
	rm -rf logs/

lint: ## 代码检查
	@if ! command -v golangci-lint > /dev/null; then \
		echo "安装 golangci-lint..."; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
	fi
	@echo "运行代码检查..."
	golangci-lint run

format: ## 格式化代码
	@echo "格式化代码..."
	gofmt -s -w .
	goimports -w .

docker-build: ## 构建Docker镜像
	@echo "构建Docker镜像..."
	docker build -t $(BINARY_NAME):latest .

docker-run: docker-build ## 运行Docker容器
	@echo "运行Docker容器..."
	docker run -p 8080:8080 --env-file .env.example $(BINARY_NAME):latest

init: ## 初始化项目环境
	@echo "初始化项目环境..."
	cp .env.example .env
	mkdir -p logs
	go mod tidy

prod: ## 生产环境构建
	@echo "生产环境构建..."
	mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s -X main.version=1.0.0 -X main.buildTime=$(shell date +%Y-%m-%d_%H:%M:%S)" -o $(BUILD_DIR)/$(BINARY_NAME) cmd/server/main.go

install-tools: ## 安装开发工具
	@echo "安装开发工具..."
	go install github.com/air-verse/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest

check: lint test ## 运行所有检查 (代码检查 + 测试)

all: clean deps build test ## 完整构建流程

watch: ## 监听文件变化并重新构建
	@echo "监听文件变化..."
	@while true; do \
		inotifywait -r -e modify,create,delete . --include='.*\.go$' 2>/dev/null; \
		echo "检测到文件变化，重新构建..."; \
		make build-local; \
	done
