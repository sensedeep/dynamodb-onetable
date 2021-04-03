all: build

build:
	npm run build

publish promote: build
	npm publish
