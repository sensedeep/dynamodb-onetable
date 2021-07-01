all: build

.PHONY: always

build:
	npm i --package-lock-only
	npm run build

publish promote: build
	npm publish

test: always
	jest

cov:
	jest --coverage
