const path = require('path');

module.exports = {
  entry: './src/preload/index.ts',
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'index.js'
  },
  node: {
    __dirname: false,
    __filename: false
  }
};