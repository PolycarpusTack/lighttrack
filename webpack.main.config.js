const path = require('path');

module.exports = {
  entry: './src/main/index.ts',
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: 'tsconfig.main.json'
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: [
    'electron',
    'sqlite3',
    'typeorm',
    /^typeorm\//,
    'reflect-metadata'
  ]
};