const path = require('path');

module.exports = {
  entry: {
    index: './src/index.js'
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  node: {
    fs: 'empty'
  },
  mode: 'development',
  devtool: 'eval-source-map',
};

// module.exports = [
//   "eval", 
//   "eval-cheap-source-map"
// ].map(devtool => ({
//   mode: 'development',
//   entry: './src/index.js',
//   output: {
//     filename: 'main.js',
//     path: path.resolve(__dirname, 'dist'),
//   },
//   node: {
//     fs: 'empty'
//   },
//   devtool,
// }))


// module.exports = {
//   entry: {
//     app: './src/app.js',
//     adminApp: './src/adminApp.js'
//   }
// };