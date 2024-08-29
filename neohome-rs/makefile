TARGET ?= build

.PHONY: all
all: neohome-rs.linux-x64-gnu.node


%.node: Cargo.toml Cargo.lock src/*.rs
	npm run $(TARGET)


