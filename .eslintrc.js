module.exports = {
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "env": {
        "es6": true,
        "node": true,
        "jest": true
    },
    "extends": "eslint:recommended",
    "ignorePatterns": ["**/dist/"],
    "rules": {
        "linebreak-style": [ "error", "unix" ],
        "quotes": [ "error", "single", { "allowTemplateLiterals": true } ],
        "semi": [ "error", "never" ],
        "no-case-declarations": "off",
        "indent": [ "error", 4, { "SwitchCase": 0, "flatTernaryExpressions": true } ]
    },
    "globals": {
        "expect": true,
        "it": true
    }
}
