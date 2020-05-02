
// Require dependencies
import config     from 'config';
import deepMerge  from 'deepmerge';
import Controller from 'controller';
import middleware from 'i18next-express-middleware';

// Require helpers
const locale = helper('locale');

/**
 * Build locale controller class
 *
 * @priority 100
 */
export default class LocaleController extends Controller {
  /**
   * Construct locale controller class
   */
  constructor() {
    // Run super
    super();

    // sessions
    this.sessions = {};

    // Bind methods
    this.build = this.build.bind(this);

    // Bind private methods
    this.renderHook = this.renderHook.bind(this);
    this.socketHook = this.socketHook.bind(this);

    // actions
    this.middlewareAction = this.middlewareAction.bind(this);

    // Build
    this.building = this.build();
  }

  /**
   * Build locale controller
   */
  build() {
    // Run this
    this.eden.pre('view.render', this.renderHook);
    this.eden.pre('view.compile', ({ render }) => {
      // remove stupid methods
      delete render.state.t;
      delete render.state.i18n;
      delete render.state.exists;
    });

    // Hooks
    this.eden.pre('socket.call.opts', this.socketHook);
    this.eden.pre('socket.endpoint.opts', this.socketHook);

    // Use middleware
    this.eden.router.use(middleware.handle(locale.locale));

    // Add middleware
    this.eden.router.use(this.middlewareAction);

    // Use get
    this.eden.router.get('/locales/:ns.:lng.json', (req, res) => {
      // Run try/catch
      try {
        // Require locales
        // eslint-disable-next-line global-require, import/no-dynamic-require
        res.json(require(`${global.appRoot}/www/locales/${req.params.ns}.${req.params.lng}.json`));
      } catch (e) {
        // Return nothing
        res.json({});
      }
    });
  }

  /**
   * Sets session language
   *
   * @param  {String} lang
   * @param  {Object} opts
   *
   * @call lang
   */
  langAction(lang, opts) {
    // Get session ID
    const { sessionID } = opts;

    // Set language
    this.sessions[sessionID] = lang;
  }

  /**
   * Create helper functions
   *
   * @param {Object} obj
   */
  renderHook({ req, res, render }) {
    // Set language
    req.language = req.language || config.get('i18n.fallbackLng');

    // Set i18n variables
    if (!render.i18n) {
      render.i18n = deepMerge({
        lng      : req.language.split(' ')[req.language.split(' ').length - 1],
        load     : 'currentOnly',
        defaults : {},
        backend  : {
          backends       : [],
          backendOptions : [config.get('i18n.cache'), {
            loadPath          : '/locales/{{ns}}.{{lng}}.json',
            queryStringParams : {
              v : config.get('version'),
            },
            allowMultiLoading : false,
          }],
        },
      }, config.get('i18n') || {});
    }

    // Set helper
    render.helpers.i18n = {
      // Return helper translate function
      t(...args) {
        // Let key
        const key = JSON.stringify(args);

        // Set defaults
        if (!render.i18n.defaults[key]) render.i18n.defaults[key] = req.i18n.t(...args);

        // Return rendered
        return render.i18n.defaults[key];
      },
    };
  }

  /**
   * Socket middleware
   *
   * @param  {Object} opts
   */
  socketHook(opts) {
    // Add opts
    opts.t = (str, data) => { // eslint-disable-line no-param-reassign
      // Check opts
      data = data || {}; // eslint-disable-line no-param-reassign

      // Get session ID
      const sessionID = opts.socket.request.cookie[config.get('session.key') || 'eden.session.id'];

      // Get language
      if (this.sessions[sessionID]) {
        // Set lang
        data.lng = this.sessions[sessionID]; // eslint-disable-line no-param-reassign
      }

      // Return helper translate
      return locale.t(opts.user, str, data);
    };
  }

  /**
   * Add language middleware
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @return {*}
   */
  async middlewareAction(req, res, next) {
    // Set user language
    if (!req.user) return next();

    // Check user
    if (!req.user.get('lang') || req.user.get('lang') !== req.language) {
      // Lock user
      await req.user.lock();

      // Set language
      req.user.set('lang', req.language.split(' ')[req.language.split(' ').length - 1]);

      // Save user
      await req.user.save();

      // Unlock user
      req.user.unlock();
    }

    // Return next
    return next();
  }
}