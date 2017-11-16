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
const dir = require('node-dir');
const fs = require('fs-extra');
const path = require('path');
const CopyModulesPlugin = require('../index.js');

const destinationPath = path.resolve(__dirname, path.join('test_output', 'copied_modules'));

const testWebpackConfig = {
  context: path.resolve(__dirname, 'mock_src'),
  entry: './b.js',
  output: {
    path: path.resolve(__dirname, 'test_output'),
    filename: 'bundle.js'
  },
  plugins: [
    new CopyModulesPlugin({
      destination: destinationPath
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

// ensure that the test is running from this directory, as a real invocation of webpack would
process.chdir(__dirname);

webpack(testWebpackConfig, function(err, stats) {
  let exitCode = 0;

  if (err) {
    console.error(err.stack || err);
    exitCode = 1;
  }
  else if (stats.hasErrors()) {
    console.error(stats.toJson().errors);
    exitCode = 2;
  }
  else {
    dir.promiseFiles(destinationPath)
      .then(function(files) {
        const relativeFiles = files.map(path.relative.bind(path, destinationPath)),
            filesWronglyCopied = relativeFiles.filter(f => pathsThatShouldBeCopied.indexOf(f) === -1),
            missingFiles = pathsThatShouldBeCopied.filter(f => relativeFiles.indexOf(f) === -1);

        if (filesWronglyCopied.length) {
          console.error('The following files appeared in the destination directory which should not have',
            filesWronglyCopied);
          exitCode = 4;
        }
        else if (missingFiles.length) {
          console.error('The following files that should have appeared in the destination did not', missingFiles);
          exitCode = 5;
        }
      }).then(function() {
        return fs.exists('test_output');
      }).then(function(exists) {
        return exists ? fs.remove('test_output') : Promise.resolve();
      }).catch(function(err) {
        console.error(err.stack || err);
        exitCode = 3;
      }).then(function() {
        if (exitCode === 0) {
          console.log('Tests passed');
        }

        process.exit(exitCode);
      });
  }
});
