/*
 * Copyright 2017-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const webpack = require('webpack');
const walk = require('walk');
const path = require('path');
const CopyModulesPlugin = require('../index.js');

const testWebpackConfig = {
  context: 'mock_src'
  entry: 'b.js',
  output: {
    path: 'test_output',
    filename: 'bundle.js'
  },
  plugins: [
    new CopyModulesPlugin({
      destination: path.join('test_output', 'copied_modules')
    })
  ],
  externals: {
    ext: 'externalLib'
  }
};

const pathsThatShouldBeCopied = [
  'mock_src/b.js',
  'mock_src/e.js',
  'mock_src/subfolder/a.js',
  'node_modules/foo-pkg/foo.js',
  'node_modules/bar-pkg/bar.js'
];

webpack(testWebpackConfig, function(err, stats) {
  if (err) {
    console.error(err.stack || err);
    process.exit(1);
  }
  else if (stats.hasErrors()) {
    console.error(stats.toJSON().errors);
    process.exit(2);
  }

  const walker = walk('test_output/copied_modules');

  walker.on('file', function(root, stats, next) {
    // TODO
  });
});
