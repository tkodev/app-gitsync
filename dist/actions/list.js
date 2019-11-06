"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = list;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// ****************************************************************************************************
// Main
// ****************************************************************************************************
function list(_x) {
  return _list.apply(this, arguments);
}

function _list() {
  _list = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(services) {
    var localPaths;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return services.local.list();

          case 2:
            localPaths = _context.sent;
            console.log(localPaths);
            return _context.abrupt("return", services);

          case 5:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _list.apply(this, arguments);
}