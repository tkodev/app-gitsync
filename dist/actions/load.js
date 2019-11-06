"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = load;

var _dotenv = _interopRequireDefault(require("dotenv"));

var _local = _interopRequireDefault(require("../services/local"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// init instances
var config = _dotenv["default"].config(); // ****************************************************************************************************
// Main
// ****************************************************************************************************


function load() {
  return _load.apply(this, arguments);
}

function _load() {
  _load = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt("return", {
              local: new _local["default"]({
                reposPath: process.env.REPOS_PATH
              })
            });

          case 1:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _load.apply(this, arguments);
}