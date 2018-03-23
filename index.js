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

const fs = require('fs-extra');
const path = require('path');

/**
 * A Webpack plugin that copies the raw source of all imported modules to a separate directory, enabling
 * external analysis of _just_ the files that get included in the bundles.  Within the destination folder,
 * modules are laid out in a subdirectory structure matching the original files' relative location to the
 * directory in which webpack runs.
 */
/* global Promise */
module.exports = class WebpackCopyModulesPlugin {
  constructor(options) {
    // this.destination is the absolute path to the destination folder
    this.destination = path.resolve(process.cwd(), options.destination);
  }

  apply(compiler) {
    compiler.plugin('emit', this.handleEmit.bind(this));
  }

  handleEmit(compilation, callback) {
    Promise.all(compilation.modules.map(this.saveModule.bind(this))).then(() => callback()).catch(callback);
  }

  saveModule(module) {
    const me = this,
        fileDependencies = module.buildInfo.fileDependencies || new Set();

    return Promise.all([...fileDependencies].map(function(file) {
      const relativePath = path.relative('', file),
          destPath = path.join(me.destination, relativePath),
          destDir = path.dirname(destPath);

      return fs.mkdirs(destDir).then(() => fs.copy(file, destPath, { overwrite: false }));
    }));
  }
};
