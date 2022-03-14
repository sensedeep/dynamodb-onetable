module.exports = {
    "parserOptions": {
        "ecmaVersion": 2021,
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
        "indent": [ "error", 4, { "SwitchCase": 0, "flatTernaryExpressions": true } ],
        "object-curly-spacing": ["error", "never"]
    },
    "globals": {
        "expect": true,
        "it": true
    }
}
