# PACKAGE=fifv/ttt1
LDFLAGS += -s -w
LDFLAGS += -X 'main.Mode=prod'
EXE_NAME = emboard

dist/${EXE_NAME}: web/dist
	GOOS=linux GOARCH=arm go build -ldflags "${LDFLAGS}" -o $@
dist/${EXE_NAME}-aarch64: web/dist
	GOOS=linux GOARCH=arm64 go build -ldflags "${LDFLAGS}" -o $@
build-arm: dist/${EXE_NAME}
build-aarch64: dist/${EXE_NAME}-aarch64
push: build-arm
# 	adb shell /mnt/UDISK/${EXE_NAME}
	adb push ./dist/${EXE_NAME} /usr/bin/
	scp dist/${EXE_NAME} Ubuntu18:/home/fifv/v853/v853-sdk-test/target/allwinner/v853-vision/busybox-init-base-files/usr/bin 
run: push
	adb shell /usr/bin/${EXE_NAME}
dev-server:
# 	nodemon -e go --signal SIGTERM --exec 'go' run .
# 	bun --watch run -- go run .
	bunx nodemon -e go --signal SIGTERM --exec 'go' run . 
dev-client:
	cd web && bun run dev
dev:
	make dev-server & make dev-client

### this re-run when files changed
web/dist: $(shell find web -path web/node_modules -prune -o -type f -print)
	cd web && bun run build




push-config:
	GOOS=linux GOARCH=arm go build -ldflags "${LDFLAGS}" -o ccc ./cmd/demo-httpjson && adb push ./ccc /tmp/
run-config: push-config
	adb shell /tmp/ccc
dev-config:
	nodemon -e go --signal SIGTERM --exec 'go' run ./cmd/demo-httpjson


run-sysinfo:
	GOOS=linux GOARCH=arm go build -ldflags "${LDFLAGS}" -o sss ./cmd/try-sysinfo && adb push ./sss /tmp/ && adb shell /tmp/sss


clean:
	rm -rf ccc ggg demo-httpjson try-* ttt1

.PHONY:push run dev build