"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fastGlob = _interopRequireDefault(require("fast-glob"));

var _path = _interopRequireDefault(require("path"));

var _normalizePath = _interopRequireDefault(require("normalize-path"));

var _nodegit = _interopRequireDefault(require("nodegit"));

var _async = require("../modules/async");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// ****************************************************************************************************
// Main
// ****************************************************************************************************
var Service =
/*#__PURE__*/
function () {
  function Service(options) {
    _classCallCheck(this, Service);

    this.reposPath = options.reposPath;
    this.repos = [];
  }

  _createClass(Service, [{
    key: "list",
    value: function () {
      var _list = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return (0, _fastGlob["default"])('**/.git', {
                  cwd: (0, _normalizePath["default"])(this.reposPath),
                  ignore: ['**/{.git,node_modules}/**/*'],
                  onlyDirectories: true,
                  absolute: true
                });

              case 2:
                this.repos = _context2.sent;
                this.repos = this.repos.map(function (repoPath) {
                  return _path["default"].dirname(repoPath);
                });
                _context2.next = 6;
                return (0, _async.asyncMap)(this.repos,
                /*#__PURE__*/
                function () {
                  var _ref = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee(repoPath) {
                    var repo, remotes, status;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            console.log("processing ".concat(repoPath));
                            _context.next = 3;
                            return _nodegit["default"].Repository.open(repoPath);

                          case 3:
                            repo = _context.sent;
                            _context.next = 6;
                            return repo.getRemotes().then(function (remotesArr) {
                              // prettier-ignore
                              return remotesArr.reduce(function (obj, remote) {
                                // eslint-disable-next-line no-param-reassign
                                obj[remote.name()] = remote.url();
                                return obj;
                              }, {});
                            });

                          case 6:
                            remotes = _context.sent;
                            _context.next = 9;
                            return repo.getStatus().then(function (statusArr) {
                              return statusArr.length;
                            });

                          case 9:
                            status = _context.sent;
                            return _context.abrupt("return", {
                              name: _path["default"].basename(repoPath),
                              path: repoPath,
                              remotes: remotes,
                              status: status
                            });

                          case 11:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  return function (_x) {
                    return _ref.apply(this, arguments);
                  };
                }());

              case 6:
                this.repos = _context2.sent;
                return _context2.abrupt("return", this.repos);

              case 8:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function list() {
        return _list.apply(this, arguments);
      }

      return list;
    }()
  }]);

  return Service;
}();

exports["default"] = Service;