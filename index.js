"use strict";

const {B,F} = require('@lumjs/core/types');

// The rest of the module constants are defined *after* the class.

/**
 * A simple error handling helper class.
 * 
 * @prop {module:@lumjs/errors~Spec[]} logged 
 * An array of spec objects for every call to `error()` in this instance.
 * 
 * @exports module:@lumjs/errors
 */
class LumErrors
{
  /**
   * Build a new error handler instance.
   * 
   * @param {object} [opts] Set default options
   * 
   * @param {module:@lumjs/errors~BFV} [opts.fatal=false] 
   * Should we throw a fatal `Error` (or chosen sub-class)?
   * 
   * If this resolves to `false` (default value), then the error message
   * will simply be output via `console.error()` instead of `throw`.
   * 
   * @param {module:@lumjs/errors~BFV} [opts.log=true] 
   * Send extra info to the console log?
   * 
   * If this is `true` (default value), then extra info sent to
   * the `error()` method will be output in the console logs.
   * 
   * @param {module:@lumjs/errors~BFV} [opts.debug=false]
   * Send the full spec object to the console logs?
   * 
   * When debugging it could be useful, but other than that, leave
   * this set to `false` (its default value).
   * 
   * @param {?module:@lumjs/errors~OnFn} [opts.onError=null] 
   * A custom error handler function.
   * 
   * If set, this will be called before the errors are logged
   * and/or thrown, and can change the settings for each
   * individual error as required.
   * 
   * @param {function} [opts.errorClass=Error] Error class to throw.
   * 
   */
  constructor(opts={})
  {
    this.logged = []; // Save errors here.
    Object.assign(this, DEFAULT_SETTINGS);
    for (const opt of SETTINGS_OPTS)
    {
      if (opt in opts)
      { // Well this is a mouthful...
        this[opt](opts[opt]);
      }
    }
  }

  // Get or set one of the boolean/function properties.
  _bfv(pname, value)
  {
    const pkey = '$'+pname;

    if (value === undefined)
    {
      return (typeof this[pkey] === F 
        ? this[pkey](pname)
        : this[pkey]);
    }

    if (typeof value === B || typeof value === F)
    {
      this[pkey] = value;
    }
    else
    {
      console.error('invalid',pname,'value',value);
    }

    return this;
  }

  /**
   * Get or set the current `fatal` setting.
   * 
   * @param {module:@lumjs/errors~BFV} [value] 
   * 
   * If a valid `value` is specified, updates the current setting,
   * and then returns `this` instance.
   * 
   * If `undefined` (omitted entirely), the method will return 
   * the *resolved* boolean value of the current setting.
   * 
   * @returns {(boolean|module:@lumjs/errors)}
   */
  fatal(value)
  {
    return this._bfv('fatal', value);
  }

  /**
   * Get or set the current `log` setting.
   * 
   * @param {module:@lumjs/errors~BFV} [value] 
   * 
   * If a valid `value` is specified, updates the current setting,
   * and then returns `this` instance.
   * 
   * If `undefined` (omitted entirely), the method will return 
   * the *resolved* boolean value of the current setting.
   * 
   * @returns {(boolean|module:@lumjs/errors)}
   */
  log(value)
  {
    return this._bfv('log', value);
  }

  /**
   * Get or set the current `debug` setting.
   * 
   * @param {module:@lumjs/errors~BFV} [value] 
   * 
   * If a valid `value` is specified, updates the current setting,
   * and then returns `this` instance.
   * 
   * If `undefined` (omitted entirely), the method will return 
   * the *resolved* boolean value of the current setting.
   * 
   * @returns {(boolean|module:@lumjs/errors)}
   */
  debug(value)
  {
    return this._bfv('debug', value);
  }

  /**
   * Get or set the current `onError` setting.
   * 
   * @param {(null|module:@lumjs/errors~OnFn)} [value] 
   * 
   * If a `function` or `null` is specified, updates the current setting,
   * and then returns `this` instance.
   * 
   * If `undefined` (omitted entirely), the method will return 
   * the value of the current setting, which will be either a `function`,
   * or `null` (no other values are valid).
   * 
   * @returns {mixed} See above
   */
  onError(value)
  {
    if (value === undefined)
    {
      return this.$onError;
    }
    
    if (value === null || typeof value === F)
    {
      this.$onError = value;
    }
    else
    {
      console.error('invalid onError value', value);
    }

    return this;
  }

  /**
   * Get or set the current `errorClass` setting.
   * 
   * @param {function} [value]
   * 
   * If a value that passes the {@link module:@lumjs/errors.isError}
   * test is specified, updates the current setting, and then returns
   * `this` instance.
   * 
   * If `undefined` (omitted entirely), the method will return 
   * the value of the current setting, which will always be a constructor
   * `function` for an `Error` class.
   * 
   * @returns {(function|module:@lumjs/errors)}
   */
  errorClass(value)
  {
    if (value === undefined)
    {
      return this.$errorClass;
    }
    
    if (isError(value))
    {
      this.$errorClass = value;
    }
    else
    {
      console.error('invalid errorClass value', value);
    }

    return this;    
  }

  /**
   * Report an error
   * 
   * @param {string} msg - An error message
   * 
   * @param {*} [info] Extra info to log
   * 
   * If this value is not an `Array`, it will be wrapped
   * in one before setting the `spec.info` property with it.
   * 
   * @param {object} [opts] Options to override settings.
   * 
   * If specified, this may contain named options for any of the
   * following `spec` properties:
   * 
   * - `{bool} fatal`
   * - `{bool} log`
   * - `{bool} debug`
   * - `{function} errorClass`
   * 
   * If one of those is set to a valid value, it will override
   * the current instance setting of the same name.
   * 
   * @returns {module:@lumjs/errors~Spec} Error `spec` object;
   * will also be added to the `logged` instance property.
   */
  error(msg=NO_MSG, info=[], opts={})
  {
    const spec =
    { // Compile all settings and arguments into a spec object.
      opts,
      msg,
      info: (Array.isArray(info) ? info : [info]),
      errorsInstance: this,
      done: false,
    }

    for (const opt in VALID_OPTS)
    {
      const isValid = VALID_OPTS[opt];
      let validated = false;

      if (opt in opts)
      { // A valid override was specified.
        if (isValid(opts[opt]))
        {
          spec[opt] = opts[opt];
          validated = true;
        }
        else
        {
          console.error('invalid',opt,'value',opts[opt]);
        }
      }
      
      if (!validated)
      { // Use the current setting.
        spec[opt] = this[opt]();
      }
    }

    if (typeof this.$onError === F)
    {
      this.$onError(spec);
    }

    if (!spec.done)
    {
      let meth = C_D;
      const cargs = [];

      if (!spec.fatal) 
      {
        meth = C_E;
        cargs.push(spec.msg);
      }

      if (spec.log)
      {
        cargs.push(...spec.info);
      }

      if (spec.debug) 
      {
        cargs.push(spec);
        if (meth === C_D)
        { // Enable stack trace.
          meth = C_T;
        }
      }

      if (cargs.length > 0)
      {
        console[meth](...cargs);
      }

      if (spec.fatal)
      {
        throw new spec.errorClass(spec.msg);
      }
    }

    // Save the spec in the logs, and return it.
    this.logged.push(spec);
    return spec;
  }

} // LumErrors class

/**
 * Is the value an Error constructor?
 * @function
 * 
 * @param {*} v - Value we are testing
 * 
 * Only a constructor `function` in the prototype chain of `Error`
 * will be considered valid. This test will not work on error objects,
 * use `instanceof Error` for that if you need it.
 * 
 * @returns {boolean}
 * @alias module:@lumjs/errors.isError
 */
const isError = (v) => typeof v === F && Error.isPrototypeOf(v);

// Define the rest of the non-require() constants here for consistency.

const isBool = v => typeof v === B;

const C_D = 'debug';
const C_E = 'error';
const C_T = 'trace';
const NO_MSG = 'unknown error [no msg]';
const SETTINGS_OPTS = ['fatal','log','debug','onError','errorClass'];
const DEFAULT_SETTINGS =
{
  $fatal:      false,
  $log:        true,
  $debug:      false,
  $onError:    null,
  $errorClass: Error,
}
const VALID_OPTS =
{
  fatal: isBool,
  log:   isBool,
  debug: isBool,
  errorClass: isError,
}

// That's all folks!
LumErrors.isError = isError;
module.exports = LumErrors;

/**
 * Boolean value or boolean-returning function
 * @typedef {(boolean|module:@lumjs/errors~BoolFn)} module:@lumjs/errors~BFV
 */

/**
 * A boolean-returning function
 * @callback module:@lumjs/errors~BoolFn
 * @param {string} setting - The setting we're getting the value for;
 * currently `fatal`, `log`, and `debug` are the only settings supporting
 * boolean-returning functions, so it'll be one of those.
 * @returns {boolean}
 * @this {module:@lumjs/errors} `this` instance
 */

/**
 * A `error()` spec object
 * 
 * @typedef {object} module:@lumjs/errors~Spec
 * 
 * @prop {string}   msg        - Message passed to `error()`
 * @prop {Array}    info       - Extra info passed to `error()`
 * @prop {object}   opts       - Any options passed to `error()`
 * @prop {boolean}  log        - Log extra info to console?
 * @prop {boolean}  debug      - Add debugging info to log?
 * @prop {boolean}  fatal      - Throw a fatal Error?
 * @prop {function} errorClass - Error class to throw if `fatal` is `true`
 * @prop {module:@lumjs/errors} errorsInstance - `this` instance
 * @prop {boolean}  done - Will always be `false` initially;
 * if a custom handler sets this to `true`, then `error()` will
 * return without throwing an error or logging anything to the console.
 */

/**
 * A custom error handler
 * @callback module:@lumjs/errors~OnFn
 * @param {module:@lumjs/errors~Spec} spec - Error spec object;
 * the handler may change any property value to customize the behaviour
 * of `error()` on a case-by-case basis.
 * @returns {void}
 * @this {module:@lumjs/errors} `this` instance
 */
