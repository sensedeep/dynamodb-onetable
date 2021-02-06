all: build

build:
	npm run build

publish: build
	npm publish
