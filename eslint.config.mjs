export default [{
    ignores: ['**/dist/'],
    rules: {
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single', { allowTemplateLiterals: true }],
        'semi': ['error', 'never'],
        'no-case-declarations': 'off',
        'indent': ['error', 4, { SwitchCase: 0, flatTernaryExpressions: true }],
        'object-curly-spacing': ['error', 'never']
    }
}]
