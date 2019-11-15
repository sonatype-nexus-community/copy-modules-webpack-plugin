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
const tmp = require('tmp');
const CopyModulesPlugin = require('../../index.js');

describe('copy-modules-webpack-plugin', function() {
  let outputDirs,
      tmpDirs;

  beforeEach(function() {
    // ensure that the test is running from this directory, as a real invocation of webpack would
    // NOTE: `process` is mocked by jest so this can cause inconsistencies
    process.chdir(__dirname);

    outputDir = tmp.dirSync();
    tmpDirs = [outputDir];
  });

  afterEach(function() {
    // NOTE: even though the tmp lib is supposed to delete its directories on exit, that doesn't seem to be working,
    // possibly due to jest's mocking of process exit
    tmpDirs.forEach(dir => fs.removeSync(dir.name));
  });

  function testPluginConfig(pluginConfig, pathsThatShouldBeCopied, done, webpackContext) {
    const pluginDestination = path.join(outputDir.name, 'copied_modules'),
        webpackConfig = {
          // disable things like the terser plugin that complicate test setup
          mode: 'development',
          context: webpackContext || path.resolve(__dirname, 'mock_src'),
          entry: './b.js',
          output: {
            path: outputDir.name,
            filename: 'bundle.js'
          },
          plugins: [
            new CopyModulesPlugin(Object.assign({
              destination: pluginDestination
            }, pluginConfig))
          ],
          externals: {
            ext: 'externalLib'
          }
        };

    webpack(webpackConfig, function(err, stats) {
      expect(err).toBeFalsy();
      expect(stats.hasErrors()).toBe(false);

      dir.promiseFiles(pluginDestination)
        .then(function(files) {
          const relativeFiles = files.map(f => path.relative(pluginDestination, f)),
              filesWronglyCopied = relativeFiles.filter(f => pathsThatShouldBeCopied.indexOf(f) === -1),
              missingFiles = pathsThatShouldBeCopied.filter(f => relativeFiles.indexOf(f) === -1);

          expect(new Set(relativeFiles)).toEqual(new Set(pathsThatShouldBeCopied));

          done();
        });
    });
  }

  it('copies referenced javascript files', function(done) {
    const pathsThatShouldBeCopied = [
          'mock_src/b.js',
          'mock_src/e.js',
          'mock_src/subfolder/a.js',
          'node_modules/foo-pkg/foo.js',
          'node_modules/bar-pkg/bar.js',
          '__..__/node_modules/outside-cwd-pkg/outside-cwd.js'
        ],
        pluginConfig = {};

    testPluginConfig(pluginConfig, pathsThatShouldBeCopied, done);
  });

  it('copies relevant package.json files in addition to javascript files when includePackageJsons is true',
      function(done) {
        const pathsThatShouldBeCopied = [
              'mock_src/b.js',
              'mock_src/e.js',
              'mock_src/subfolder/a.js',
              'package.json',
              'node_modules/foo-pkg/foo.js',
              'node_modules/foo-pkg/package.json',
              'node_modules/bar-pkg/bar.js',
              'node_modules/bar-pkg/package.json',
              '__..__/node_modules/outside-cwd-pkg/outside-cwd.js',
              '__..__/node_modules/outside-cwd-pkg/package.json'
            ],
            pluginConfig = { includePackageJsons: true };

        testPluginConfig(pluginConfig, pathsThatShouldBeCopied, done);
      }
  );

  it('does not copy package.json files when includePackageJsons is true', function(done) {
    const pathsThatShouldBeCopied = [
          'mock_src/b.js',
          'mock_src/e.js',
          'mock_src/subfolder/a.js',
          'node_modules/foo-pkg/foo.js',
          'node_modules/bar-pkg/bar.js',
          '__..__/node_modules/outside-cwd-pkg/outside-cwd.js'
        ],
        pluginConfig = { includePackageJsons: false };

    testPluginConfig(pluginConfig, pathsThatShouldBeCopied, done);
  });

  it('handles files that have no parent package.json', function(done) {
    const tmpDir = tmp.dirSync(),
        tmpDirName = tmpDir.name;

    tmpDirs.push(tmpDir);

    // copy the js files but not the package.json files to a temp dir where (hopefully) there isn't a package.json
    // anywhere higher in the directory tree
    [
      'mock_src/b.js',
      'mock_src/e.js',
      'mock_src/subfolder/a.js',
      'node_modules/foo-pkg/foo.js',
      'node_modules/bar-pkg/bar.js',
      '../node_modules/outside-cwd-pkg/outside-cwd.js'
    ].forEach(function(file) {
      const dest = path.join(tmpDirName, file);

      fs.ensureDirSync(path.dirname(dest));
      fs.copyFileSync(path.resolve(__dirname, file), path.join(tmpDirName, file));
    });

    process.chdir(tmpDirName);

    const pathsThatShouldBeCopied = [
          'mock_src/b.js',
          'mock_src/e.js',
          'mock_src/subfolder/a.js',
          'node_modules/foo-pkg/foo.js',
          'node_modules/bar-pkg/bar.js',
          '__..__/node_modules/outside-cwd-pkg/outside-cwd.js'
        ],
        pluginConfig = { includePackageJsons: true };

    testPluginConfig(pluginConfig, pathsThatShouldBeCopied, done, path.resolve(tmpDir.name, 'mock_src'));
  });
});
