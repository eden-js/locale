
// Require dependencies
import i18n from 'i18next';
import store from 'core/public/js/store';
import xhrBE from 'i18next-xhr-backend';
import socket from 'socket/public/js/bootstrap';
import localBE from 'i18next-localstorage-backend';
import backend from 'i18next-chained-backend';
import sprintf from 'i18next-sprintf-postprocessor';
import detector from 'i18next-browser-languagedetector';
import { EventEmitter} from 'events';

// Create built
let built = null;

/**
 * Create locale store
 */
class LocaleStore extends EventEmitter {
  /**
   * Construct locale store
   */
  constructor(...args) {
    // Set observable
    super(...args);

    // reset max listeners
    this.setMaxListeners(0);

    // Set i18n
    this.i18n = i18n;

    // Bind i18n methods
    this.t = this.i18n.t.bind(this.i18n);

    // Bind methods
    this.lang = this.lang.bind(this);
    this.build = this.build.bind(this);

    // Bind variables
    this.loaded = false;
    this.initialized = false;

    // Build store
    this.build();
  }

  /**
   * Build locale store
   */
  build() {
    // Load i18n
    const load = store.get('i18n');

    // Set values
    for (const key of Object.keys(load)) {
      // Set value
      this[key] = load[key];
    }

    // Pre user
    store.pre('set', (data) => {
      // Check key
      if (data.key !== 'i18n') return;

      // Set val
      data.val = this; // eslint-disable-line no-param-reassign
    });

    // Set defaults
    this.defaults = load.defaults || {};

    // Set backends
    load.backend.backends = [localBE, xhrBE];

    // Use functions
    this.i18n
      .use(detector)
      .use(backend)
      .use(sprintf);

    // Init
    this.i18n.init(load);

    // On load
    this.i18n.on('loaded', () => {
      // Trigger update
      if (this.initialized) this.emit('update');
    });

    // On initialized
    this.i18n.on('initialized', () => {
      // Set initialized
      this.initialized = true;

      // Send language to socket
      if (this.i18n.language) socket.call('lang', this.i18n.language);

      // Trigger update
      this.emit('update');
    });

    // On connect
    socket.on('connect', () => {
      // Send language to socket
      if (this.i18n.language) socket.call('lang', this.i18n.language);
    });

    // Set translate function
    this.t = this.i18n.t.bind(this.i18n);
  }

  /**
   * Sets language
   *
   * @param {String} lang
   *
   * @return {String}
   */
  lang(lang) {
    // Check language
    if (!lang) {
      // Load language
      if (!this.i18n.language) return store.get('i18n').lng;

      // Load only one
      if (this.i18n.language.includes(' ')) {
        return this.i18n.language.split(' ')[this.i18n.language.split(' ').length - 1];
      }

      // Return language
      return this.i18n.language;
    }

    // Change language
    this.i18n.changeLanguage(lang, () => {
      // Trigger update
      if (this.initialized) {
        // Trigger update
        this.emit('update');

        // Send language to socket
        socket.call('lang', this.i18n.language);
      }
    });

    return null;
  }
}

/**
 * Build alert class
 *
 * @type {edenAlert}
 */
built = new LocaleStore();

/**
 * Add locale to window.eden
 */
window.eden.i18n = built;

/**
 * Export locale store class
 *
 * @type {LocaleStore}
 */
export default built;