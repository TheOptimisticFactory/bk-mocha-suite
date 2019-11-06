'use strict';

const { assert, expect } = require('chai');
const chalk = require('chalk');
const config = require('config');
const ErrorStackParser = require('error-stack-parser');
const sinon = require('sinon');

var fRegCheck = /^function\s+\(\S+?\)/;
var generateDescribe = require("./lib/generate");
var EXCLUSIVE_METHODS = generateDescribe.EXCLUSIVE_METHODS;
var IT_METHODS = generateDescribe.IT_METHODS;
var REPLACE_METHOD = generateDescribe.REPLACE_METHOD;
var SET_METHODS = generateDescribe.SET_METHODS;
var SETUP_METHODS = generateDescribe.SETUP_METHODS;
var THAT_METHODS = generateDescribe.THAT_METHODS;
var _ = require("underscore");
var utils = require("./lib/utils");

_.defaults(global, {
  describeMethod: "describe",
  xdescribeMethod: "xdescribe",
  beforeMethod: "before",
  beforeAllMethod: "beforeAll",
  beforeEachMethod: "beforeEach",
  afterMethod: "after",
  afterAllMethod: "afterAll",
  afterEachMethod: "afterEach",
  itMethod: "it",
  xitMethod: "xit",
  onlyMethod: "only",
});

global.thatMethod = global.itMethod;
global.xthatMethod = global.xitMethod;
global.setBeforeAllMethod = global.beforeAllMethod;
global.setBeforeMethod = global.beforeMethod;
global.setAfterAllMethod = global.afterAllMethod;
global.setAfterMethod = global.afterMethod;
global.onlyMethod = global.onlyMethod;

const blue = input => chalk.keyword('slateblue').bold(input);
const green = input => chalk.keyword('forestgreen').bold(input);
const lightblue = input => chalk.keyword('dodgerblue').bold(input);
const orange = input => chalk.keyword('gold').bold(input);
const red = input => chalk.keyword('red').bold(input);

const reportMissingField = (params, name) => {
  const formatedStacktrace = ErrorStackParser.parse(new Error());
  const sourceLine = formatedStacktrace[2].source.trim();
  const prettyPayload = JSON.stringify(params, null, 2);

  console.error(red('Detected broken Suite factory instantiation'));
  console.error(red(`Field "${name}" is mandatory but got\n`));
  console.error(orange('const Suite = require(\'@sportheroes/bk-mocha-suite\')('));
  console.error(orange(`${prettyPayload});\n`));
  console.error(red(`${sourceLine}\n`));

  if (name === 'project') {
    console.error(blue('To fix it you can either:'));
    console.error(blue('- set process.env.APP_NAME at runtime'));
    console.error(blue('- add "APP_NAME" property in your configuration file'));
    console.error(blue('- add "project" property in your Suite factory payload'));
  }

  process.exit(2);
};

const reportFaultyTestCase = (type, msg) => {
  const formatedStacktrace = ErrorStackParser.parse(new Error());
  const sourceLine = formatedStacktrace[2].source.trim();

  console.error(red(`Detected broken Suite.${type}() test case`));
  console.error(red(`Expected syntax: Suite.${type}('description', function) but got\n`));
  console.error(orange(`Suite.${type}(${msg})\n`))
  console.error(red(sourceLine));

  process.exit(2);
}

module.exports = function (params, ctx, f) {
  let { project, category, service, method } = params;

  if (!project) {
    project = config.APP_NAME || process.env.APP_NAME;

    if (!project) {
      reportMissingField(params, 'project');
    }
  }

  if (!category) {
    reportMissingField(params, 'category');
  }

  if (!service) {
    reportMissingField(params, 'service');
  }

  if (!method) {
    reportMissingField(params, 'method');
  }

  let CASE_COUNT = 0;
  const prefix = category.toUpperCase();
  const SUITE_NAME = `${blue(project)} - ${blue(category)} > ${lightblue(service)} > ${green(method)}`;
  const IDENTIFIER = `${prefix}-${service}-${method}`.replace(/[^A-Z-]/g, '');
  const getCaseID = () => `${IDENTIFIER}-${++CASE_COUNT}`;

  // Jasmine fallback

  if (!global.hasOwnProperty("describe")) {
    throw Error("There is no 'describe' method in your global. Probably mocha isn't running.");
  }

  if (ctx instanceof Function) {
    f = ctx;
    ctx = {};
  }

  if (ctx && !(ctx instanceof Object)) {
    throw Error("Second argument should be object if set");
  }
  if (f && !(f instanceof Function)) {
    throw Error("Third argument should be function if set");
  }

  var TestSuit = function Suit(msg, _ctx) {
    if (utils.isSuitInstance(this)) {
      if (msg instanceof Object) {
        _ctx = msg;
        msg = "";
      }

      msg = msg || "";

      var parents = [];
      var current = this.suit;

      while (utils.isSuit(current)) {
        parents.unshift(current);
        current = current.parent;
      }

      var ctx = this;
      var modifiers = {
        that: {
          __that: [],
          __xthat: []
        },
        setBefore: {
          __setBeforeAll: [],
          __setBefore: []
        },
        setAfter: {
          __setAfterAll: [],
          __setAfter: []
        },
        replaceWith: []
      };

      parents.forEach(function (Suit) {
        utils.extend(ctx, Suit.contextData);
        modifiers.that.__that = modifiers.that.__that.concat(Suit.__that || []);
        modifiers.that.__xthat = modifiers.that.__xthat.concat(Suit.__xthat || []);
        modifiers.setBefore.__setBefore = (Suit.__setBefore || []).concat(modifiers.setBefore.__setBefore);
        modifiers.setBefore.__setBeforeAll = (Suit.__setBeforeAll || []).concat(modifiers.setBefore.__setBeforeAll);
        modifiers.setAfter.__setAfter = modifiers.setAfter.__setAfter.concat(Suit.__setAfter || []);
        modifiers.setAfter.__setAfterAll = modifiers.setAfter.__setAfterAll.concat(Suit.__setAfterAll || []);
        modifiers.replaceWith = (Suit.__replaceWith || []).concat(modifiers.replaceWith);
      });

      utils.extend(ctx, _ctx);

      generateDescribe(parents, ctx, utils.dotEndString(msg), modifiers);
    } else {
      utils.generateObject(TestSuit, arguments);
    }
  };

  utils.extendSuit(TestSuit, {
    stubs: [],
    parent: null,
    fcall: f,
    describe: SUITE_NAME,
    contextData: ctx
  });

  SETUP_METHODS.forEach(function (callName) {
    TestSuit[callName] = function (f) {
      if (utils.isSuit(f)) {
        utils.pushNewCall(this, callName, {
          suit: f
        });
      } else {
        utils.pushNewCall(this, callName, {
          fcall: f,
          useDone: fRegCheck.test(f)
        });
      }
      return this;
    };
  });

  EXCLUSIVE_METHODS.forEach(function (callName) {
    TestSuit[callName] = function (msg, f) {
      if (!f) {
        return reportFaultyTestCase(callName, msg);
      }

      msg = `${orange(getCaseID())} / ${msg}`;
      utils.pushNewCall(this, callName, {
        msg: msg,
        fcall: f,
        useDone: fRegCheck.test(f)
      });

      return this;
    }
  });

  IT_METHODS.concat(THAT_METHODS).forEach(function (callName) {
    TestSuit[callName] = function (msg, f) {
      if (utils.isSuit(msg)) {
        utils.pushNewCall(this, callName, {
          suit: msg
        });
      } else {
        if (!f) {
          return reportFaultyTestCase(callName, msg);
        }

        msg = `${orange(getCaseID())} / ${msg}`;
        utils.pushNewCall(this, callName, {
          msg: msg,
          fcall: f,
          useDone: fRegCheck.test(f)
        });
      }
      return this;
    };
  });

  SET_METHODS.forEach(function (callName) {
    TestSuit[callName] = function (suit, f) {
      if (!utils.isSuit(suit)) {
        throw new Error(callName + " first argument should be suit");
      }
      if (!_.isFunction(f)) {
        throw new Error(callName + " second argument should be function");
      }
      utils.pushNewCall(this, callName, {
        targetSuit: suit,
        fcall: f,
        useDone: fRegCheck.test(f)
      });
      return this;
    };
  });

  TestSuit.stub = function stub(results) {
    const stub = sinon.stub();

    TestSuit.stubs.push(stub);

    return stub;
  };

  TestSuit.stubContext = function stubContext(overload = {}) {
    const loggerId = 'fakeLoggerId';
    const loggerMethods = [
      'appendTags',
      'debug',
      'error',
      'fatal',
      'info',
      'log',
      'outputAWS',
      'outputFile',
      'setOrigin',
      'setTags',
      'trace',
      'warn',

      // Other logger methods which requires custom stubbing
      // 'createChildLogger',
      // 'getTransactionId',
    ];

    const stubLogger = () => {
      const logger = {};

      // Default stubbing
      loggerMethods.forEach(name => {
        logger[name] = TestSuit.stub();
      });

      // Custom stubbing
      logger.createChild = stubLogger;
      logger.getTransactionId = () => `${loggerId} > child`;

      return logger;
    }

    const stubContext = {
      clone: () => stubContext,
      createChildLogger: stubLogger,
      disengageRequeuingOf: TestSuit.stub(),
      engageRequeuingOf: TestSuit.stub(),
      getBusOptions: TestSuit.stub(),
      globalPayload: {},
      isCloudWatchActive: null,
      logger: stubLogger(),
      loggerId,
      next: TestSuit.stub(),
      tags: [],
      ...overload,
    };

    return stubContext;
  };

  TestSuit.stubReturning = function stubReturning(results) {
    const stub = sinon.stub().returns(results);

    TestSuit.stubs.push(stub);

    return stub;
  };

  TestSuit.stubResolving = function stubResolving(results) {
    const stub = sinon.stub().resolves(results);

    TestSuit.stubs.push(stub);

    return stub;
  };

  TestSuit.stubRejecting = function stubRejecting(results) {
    const stub = sinon.stub().rejects(results);

    TestSuit.stubs.push(stub);

    return stub;
  };

  TestSuit.assertMatchBetween = function assertMatchBetween(payload, expectations) {
    const spy = sinon.spy();

    spy(payload);

    return sinon.assert.calledWithMatch(spy, expectations);
  };

  TestSuit.expectRejection = async function expectRejection(handler, errorMessage) {
    let unexpectedBehavior;

    try {
      await handler();
      unexpectedBehavior = new Error(`Handler finished without throwing the expected error message: ${errorMessage}`);
    } catch (error) {
      return error.message.should.deep.equal(errorMessage);
    }

    return assert.fail(unexpectedBehavior, null, unexpectedBehavior.message);
  }

  TestSuit.expectToBeNull = function (value) {
    return expect(value).to.be.null;
  }

  TestSuit.replaceWith = function (suit, newSuit) {
    if (!utils.isSuit(suit)) {
      throw new Error("replaceWith first argument should be suit");
    }
    if (!utils.isSuit(newSuit)) {
      throw new Error("replaceWith second argument should be suit");
    }
    utils.pushNewCall(this, "replaceWith", {
      targetSuit: suit,
      newSuit: newSuit
    });
    return this;
  };

  TestSuit.with = function (suit) {
    if (!utils.isSuit(suit)) {
      throw Error("Argument should be Suit class object");
    }
    var self = this;
    SETUP_METHODS.concat(IT_METHODS).concat(THAT_METHODS).forEach(function (method) {
      self[method](suit);
    });
    return this;
  };

  TestSuit.extend = function (msg, ctx, f) {
    if (ctx instanceof Function) {
      f = ctx;
      ctx = {};
    }
    if (ctx && !(ctx instanceof Object)) {
      throw Error("Second argument should be object if set");
    }
    if (f && !(f instanceof Function)) {
      throw Error("Third argument should be function if set");
    }

    var Parent = this;
    var NewSuit = function Suit() {
      if (utils.isSuitInstance(this)) {
        Parent.apply(this, arguments);
      } else {
        utils.generateObject(NewSuit, arguments);
      }
    };
    utils.extend(NewSuit, Parent);
    utils.extendSuit(NewSuit, {
      parent: Parent,
      fcall: f,
      describe: msg || "",
      contextData: ctx
    });
    return NewSuit;
  };

  TestSuit.xtend = function (msg, ctx, f) {
    var NewSuit = this.extend.apply(this, arguments);
    Object.defineProperty(NewSuit, "skip", {
      value: true
    });
    return NewSuit;
  };

  TestSuit.run = function () {
    if (TestSuit.stubs.length > 0) {
      var f = () => utils.resetStubs(this);

      utils.pushNewCall(this, 'afterEach', {
        fcall: f,
        useDone: fRegCheck.test(f)
      });
    }

    return new TestSuit();
  };

  return TestSuit;
};
