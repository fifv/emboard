# PACKAGE=fifv/ttt1
LDFLAGS += -s -w
LDFLAGS += -X 'main.Mode=prod'

build:
	GOOS=linux GOARCH=arm go build -ldflags "${LDFLAGS}" -o dist/ggg
push: build
	adb push ./dist/ggg /mnt/UDISK/
run: push
	adb shell /mnt/UDISK/ggg
dev:
	nodemon -e go --signal SIGTERM --exec 'go' run .



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