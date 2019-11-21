// Require local dependencies
const config = require('config');

/**
 * Build locale task class
 *
 * @task locales
 */
class LocalesTask {
  /**
   * Construct locale task class
   *
   * @param {Loader} runner
   */
  constructor(runner) {
    // Set private variables
    this._runner = runner;

    // Bind methods
    this.run = this.run.bind(this);
    this.watch = this.watch.bind(this);
  }

  /**
   * run in background
   *
   * @param {*} files
   */
  async run(files) {
    // run models in background
    await this._runner.thread(this.thread, {
      files,

      parser    : require.resolve('lib/utilities/parser'),
      appRoot   : global.appRoot,
      namespace : config.get('i18n.defaultNS') || 'default',
    });

    // Restart server
    this._runner.restart();
  }

  /**
   * Run assets task
   *
   * @param {Array} files
   *
   * @return {Promise}
   */
  async thread(data) {
    // Require dependencies
    const fs        = require('fs-extra');
    const glob      = require('@edenjs/glob');
    const path      = require('path');
    const deepMerge = require('deepmerge');

    // Set locales and namespaces
    const locales     = {};
    const localeTypes = [];
    const namespaces  = [];

    // Loop absolute files
    for (const absoluteFile of await glob(data.files)) {
      // Set locale
      let locale = path.basename(absoluteFile).replace('.json', '');

      // Set namespace
      let namespace = data.namespace;

      // Check locale
      if (locale.split('.').length > 1) {
        // Update locale and namespace
        [namespace, locale] = locale.split('.');
      }

      // Add to arrays
      if (!localeTypes.includes(locale)) localeTypes.push(locale);
      if (!namespaces.includes(namespace)) namespaces.push(namespace);

      // Ensure namespace exists
      if (!locales[namespace]) locales[namespace] = {};

      if (locales[namespace][locale] === null || locales[namespace][locale] === undefined) {
        locales[namespace][locale] = {};
      }

      // Extend locale
      // eslint-disable-next-line global-require, import/no-dynamic-require
      locales[namespace][locale] = deepMerge(locales[namespace][locale], require(absoluteFile));
    }

    // Set locale folder
    const frontend = path.join(data.appRoot, 'data', 'www', 'locales');

    // Remove cache
    await fs.remove(frontend);

    // Mkdir
    await fs.ensureDir(frontend);

    // Create files
    for (const namespace of namespaces) {
      // Ensure namespace exists
      if (Object.prototype.hasOwnProperty.call(locales, namespace)) {
        // Loop for namespaces
        for (const locale of localeTypes) {
          // Ensure locale exists
          if (Object.prototype.hasOwnProperty.call(locales[namespace], locale)) {
            // Let path
            const filePath = path.join(frontend, `${namespace}.${locale}.json`);

            // Write data
            await fs.writeJson(filePath, locales[namespace][locale]);
          }
        }
      }
    }

    // Get namespaces and Locales
    fs.writeJson(`${data.appRoot}/.edenjs/.cache/locale.json`, {
      locales    : localeTypes,
      namespaces,
    });
  }

  /**
   * Watch task
   *
   * @return {Array}
   */
  watch() {
    // Return files
    return [
      'locales/*',
    ];
  }
}

/**
 * Export locales task
 *
 * @type {localesTask}
 */
module.exports = LocalesTask;
