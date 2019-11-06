"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asyncReduceRight = exports.asyncReduce = exports.asyncForEach = exports.asyncMap = void 0;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// ****************************************************************************************************
// Init
// ****************************************************************************************************
// flags

/* eslint-disable no-await-in-loop */
// ****************************************************************************************************
// Main
// ****************************************************************************************************
var asyncMap =
/*#__PURE__*/
function () {
  var _asyncMapMap = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(array, callback) {
    var rslt, index;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            rslt = [];

            for (index = 0; index < array.length; index += 1) {
              rslt[index] = callback(array[index], index, array);
            }

            return _context.abrupt("return", Promise.all(rslt));

          case 3:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  function asyncMapMap(_x, _x2) {
    return _asyncMapMap.apply(this, arguments);
  }

  return asyncMapMap;
}();

exports.asyncMap = asyncMap;

var asyncForEach =
/*#__PURE__*/
function () {
  var _asyncForEach = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(array, callback) {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return asyncMap(array, callback);

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  function asyncForEach(_x3, _x4) {
    return _asyncForEach.apply(this, arguments);
  }

  return asyncForEach;
}();

exports.asyncForEach = asyncForEach;

var asyncReduce =
/*#__PURE__*/
function () {
  var _asyncReduce = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(array, callback, initialValue) {
    var rslt, index;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            rslt = initialValue || array[0];
            index = 0;

          case 2:
            if (!(index < array.length)) {
              _context3.next = 9;
              break;
            }

            _context3.next = 5;
            return callback(rslt, array[index], index, array);

          case 5:
            rslt = _context3.sent;

          case 6:
            index += 1;
            _context3.next = 2;
            break;

          case 9:
            return _context3.abrupt("return", rslt);

          case 10:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));

  function asyncReduce(_x5, _x6, _x7) {
    return _asyncReduce.apply(this, arguments);
  }

  return asyncReduce;
}();

exports.asyncReduce = asyncReduce;

var asyncReduceRight =
/*#__PURE__*/
function () {
  var _asyncReduceRight = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4(array, callback, initialValue) {
    var rslt, index;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            rslt = initialValue || array[array.length - 1];
            index = 0;

          case 2:
            if (!(index < array.length)) {
              _context4.next = 9;
              break;
            }

            _context4.next = 5;
            return callback(rslt, array[index], index, array);

          case 5:
            rslt = _context4.sent;

          case 6:
            index += 1;
            _context4.next = 2;
            break;

          case 9:
            return _context4.abrupt("return", rslt);

          case 10:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));

  function asyncReduceRight(_x8, _x9, _x10) {
    return _asyncReduceRight.apply(this, arguments);
  }

  return asyncReduceRight;
}();

exports.asyncReduceRight = asyncReduceRight;