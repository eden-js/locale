
// Require dependencies
import path       from 'path';
import config     from 'config';
import Helper     from 'helper';
import backend    from 'i18next-node-fs-backend/lib/index';
import i18next    from 'i18next';
import sprintf    from 'i18next-sprintf-postprocessor/dist/es/index';
import deepMerge  from 'deepmerge';
import middleware from 'i18next-express-middleware';

// Require compiled conf
const compiled = cache('locale');

/**
 * Build locale controller class
 */
class LocaleHelper extends Helper {
  /**
   * Construct locale controller class
   */
  constructor() {
    // Run super
    super();

    // Bind methods
    this.t = this.t.bind(this);
    this.build = this.build.bind(this);

    // Build
    this.building = this.build();
  }

  /**
   * Translates i18n by user
   *
   * @param  {user}   User
   * @param  {String} str
   * @param  {Object} opts
   *
   * @return {String}
   */
  t(User, str, opts) {
    // Check opts
    opts = opts || {};// eslint-disable-line no-param-reassign

    // Set lang
    // eslint-disable-next-line no-param-reassign
    opts.lng = opts.lang || (User ? (User.get('lang') || config.get('i18n.fallbackLng')) : config.get('i18n.fallbackLng'));

    // Check locale
    return this.locale.t(str, opts);
  }

  /**
   * Build locale controller
   */
  async build() {
    // Set langs and namespaces
    config.set('i18n.ns', compiled.namespaces);
    config.set('i18n.lngs', config.get('i19n.lngs') || compiled.locales);
    config.set('i18n.cache.versions', {});

    // Set whitelist
    if (config.get('i18n.lngs')) config.set('i18n.whitelist', config.get('i18n.lngs'));

    // Set cache versions for i18n
    for (let i = 0; i < config.get('i18n.lngs').length; i += 1) {
      // Set versions
      config.set(`i18n.cache.versions.${config.get('i18n.lngs')[i]}`, config.get('version'));
    }

    // Init
    i18next
      .use(middleware.LanguageDetector)
      .use(backend)
      .use(sprintf)
      .init(deepMerge({
        preload : config.get('i18n.lngs'),
        backend : {
          loadPath : path.join(global.appRoot, 'data', 'www', 'locales', '{{ns}}.{{lng}}.json'),
        },
      }, config.get('i18n') || {}));

    this.locale = i18next;
  }
}

/**
 * Export locale controller class
 *
 * @type {locale}
 */
export default new LocaleHelper();
