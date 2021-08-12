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
    "rules": {
        "linebreak-style": [ "error", "unix" ],
        "quotes": [ "error", "single", { "allowTemplateLiterals": true } ],
        "semi": [ "error", "never" ],
        "indent": [ "error", 4, { "SwitchCase": 1, "flatTernaryExpressions": true } ]
    },
    "globals": {
        "expect": true,
        "it": true
    }
}
