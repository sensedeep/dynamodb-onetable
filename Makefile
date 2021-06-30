all: build

build:
	npm i --package-lock-only
	npm run build

publish promote: build
	npm publish

test:
	jest

cov:
	jest --coverage
