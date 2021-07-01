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

pubcov:
	jest --coverage && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js"
