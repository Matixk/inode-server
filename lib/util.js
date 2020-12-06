// Part of <http://miracle.systems/p/inode-server> licensed under <MIT>

'use strict';

const inspect = require('util').inspect;

// eslint-disable-line no-unused-vars
exports.log = function(argN) {
  process.stdout.write(new Date().toISOString() + ' ');
  console.log.apply(console, arguments);
};

// eslint-disable-line no-unused-vars
exports.warn = function(argN) {
  process.stdout.write(new Date().toISOString() + ' ');
  console.warn.apply(console, arguments);
};

// eslint-disable-line no-unused-vars
exports.error = function(argN) {
  process.stdout.write(new Date().toISOString() + ' ');
  console.error.apply(console, arguments);
};

exports.inspect = function(value, depth) {
  exports.log(inspect(value, {colors: true, depth: depth || 5}));
};
