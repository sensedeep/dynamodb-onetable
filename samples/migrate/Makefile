#
#   Makefile - for Migrate sample
#

all: run

configure:
	npm install
	sls dynamodb install

debug:
	node --debug ./node_modules/.bin/serverless offline --httpPort 5000 --lambdaPort 5001 -s dev

startdb:
	sls dynamodb start

run:
	sls offline --httpPort 5000 --lambdaPort 5001 -s dev
