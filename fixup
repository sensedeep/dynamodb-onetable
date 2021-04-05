#!/bin/bash
#
#   Add package.json files to cjs/mjs subtrees
#

cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

cat >dist/mjs/package.json <<!EOF
{
    "type": "module"
}
!EOF

find src -name '*.d.ts' -exec cp {} dist/mjs \;
find src -name '*.d.ts' -exec cp {} dist/cjs \;
