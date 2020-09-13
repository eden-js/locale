// import json5
import JSON5 from 'json5';

/**
 * Build locale task class
 *
 * @task locales
 */
export default class LocalesTask {
  /**
   * Construct locale task class
   *
   * @param {Loader} runner
   */
  constructor(cli) {
    // Set private variables
    this.cli = cli;

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
    const data = await this.cli.thread(this.thread, {
      files,

      parser    : require.resolve(`${global.edenRoot}/lib/parser`),
      appRoot   : global.appRoot,
      namespace : this.cli.get('config.i18n.defaultNS') || 'default',
    });

    // index
    this.cli.write('.index/locale.js', `module.exports = ${JSON5.stringify(data)};`);

    // Restart server
    this.cli.emit('restart');

    // locales
    return `loaded ${data.locales.length} locales!`;
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
    const frontend = path.join(data.appRoot, 'www', 'locales');

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

    // count
    return {
      locales : localeTypes,
      namespaces,
    };
  }

  /**
   * Watch task
   *
   * @return {Array}
   */
  watch() {
    // Return files
    return '/locales/*.json';
  }
}