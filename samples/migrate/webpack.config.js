const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const path = require('path');
const glob = require('glob-promise');

function dump(...args) {
    let s = []
    for (let item of args) {
        s.push(JSON.stringify(item, null, 4))
    }
    print(s.join(' '))
}
function print(...args) {
    console.log(...args)
}
function makeEntries(patterns) {
    if (!Array.isArray(patterns)) patterns = [patterns]
    let entries = []
    for (let pattern of patterns) {
        let files = glob.sync(pattern)
        entries = entries.concat(files)
    }
    return entries
}

// entries: slsw.lib.entries
let entries = makeEntries([
    './Migrate.js',
    './migrations/*.js',
    './migrations/package.json',
])
dump('Packaging', entries)

module.exports = {
    // 'minimal', non, verbose, detailed, errors-only, errors-warnings
    stats: 'errors-only',
    entry: entries,
    // entry: slsw.lib.entries,
    target: 'node',
    devtool: 'source-map',
    externals: [nodeExternals()],
    mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
    optimization: {
        minimize: false,
        concatenateModules: false,
    },
    experiments: {
         outputModule: true,
         topLevelAwait: true,
    },
    performance: {
        hints: false,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: __dirname,
                exclude: /node_modules/,
            },
            {
                test: /\.html|\.txt/i,
                use: 'raw-loader',
            },
        ],
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'Migrate.js',
        sourceMapFilename: 'Migrate.js.map',
    },
    resolve: {
        modules: ['modules', path.resolve(__dirname, 'paks'), 'node_modules']
    }
};
