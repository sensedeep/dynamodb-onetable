#
#   Makefile - Makefile for samples
#

update:
	for name in `grep -l dynamodb-onetable */package.json` ; do \
		(dir=`dirname $${name}` ; \cd $${dir}; npm update dynamodb-onetable); \
	done
