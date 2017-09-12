(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var MAX_X = 50,
    MAX_Y = 50; // Tweakable

exports.MAX_X = MAX_X;
exports.MAX_Y = MAX_Y;

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.getDependencies = exports.parseFormula = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _constants = require('./constants');

//
// Everything about parsing user formulas
//
function tokenize(fString) {
	// and remove whitespace
	var str = fString;
	var tokenizer = /^(\s|\+|\-|\*|\/|\(|\)|\d+(?:\.\d+)?|\$[A-Z]+\$[\d]+|SUM|\:)(.*)$/;
	var tokens = [];
	while (str.length > 0) {
		var match = tokenizer.exec(str);
		if (!match) {
			throw new Error('Unexpected symbol at: ' + str);
		}
		var token = match[1];
		str = match[2];
		tokens.push(token);
	}
	return tokens.filter(function (token) {
		return !token.match(/\s/);
	});
}

function parseFormula(fString) {
	var formula = [];
	var tokens = tokenize(fString);
	var expr = void 0,
	    oper = void 0;

	var _getExpr = getExpr(tokens);

	var _getExpr2 = _slicedToArray(_getExpr, 2);

	expr = _getExpr2[0];
	tokens = _getExpr2[1];

	formula.push(expr);
	while (tokens.length > 0) {
		var _getOper = getOper(tokens);

		var _getOper2 = _slicedToArray(_getOper, 2);

		oper = _getOper2[0];
		tokens = _getOper2[1];

		var _getExpr3 = getExpr(tokens);

		var _getExpr4 = _slicedToArray(_getExpr3, 2);

		expr = _getExpr4[0];
		tokens = _getExpr4[1];

		formula.push({ type: 'operator', oper: oper }, expr);
	}
	return formula;
}

function getOper(tokens) {
	var oper = tokens.shift();
	if (!['+', '-', '*', '/'].includes(oper)) {
		throw new Error('Operator expected: + , - , * or /');
	}
	return [oper, tokens];
}

function getExpr(tokens) {
	var uOpers = ['+', '-'];
	var SUM = 'SUM';
	// TODO parentheses for expressions sometime?
	var token = tokens.shift();
	var val = void 0;
	if (uOpers.includes(token)) {
		var _getVal = getVal(tokens);

		var _getVal2 = _slicedToArray(_getVal, 2);

		val = _getVal2[0];
		tokens = _getVal2[1];

		return [{ type: 'unary', oper: token, val: val }, tokens];
	}
	if (token === SUM) {
		token = tokens.shift();
		if (token !== '(') {
			throw new Error('Opening brace expected');
		}
		var range = void 0;

		var _getRange = getRange(tokens);

		var _getRange2 = _slicedToArray(_getRange, 2);

		range = _getRange2[0];
		tokens = _getRange2[1];

		token = tokens.shift();
		if (token !== ')') {
			throw new Error('Closing brace expected');
		}
		return [{ type: 'sum', range: range }, tokens];
	}
	tokens.unshift(token);
	return getVal(tokens);
}

function getRange(tokens) {
	var start = void 0,
	    end = void 0;

	var _getRef = getRef(tokens);

	var _getRef2 = _slicedToArray(_getRef, 2);

	start = _getRef2[0];
	tokens = _getRef2[1];

	var separator = tokens.shift();
	if (separator !== ':') {
		throw new Error('Separator : expected');
	}

	var _getRef3 = getRef(tokens);

	var _getRef4 = _slicedToArray(_getRef3, 2);

	end = _getRef4[0];
	tokens = _getRef4[1];

	if (start.x !== end.x && start.y !== end.y) {
		throw new Error('Non-linear range is invalid');
	}
	return [{ start: start, end: end }, tokens];
}

function getVal(tokens) {
	var token = tokens.shift();
	try {
		if (/^\d+(?:\.\d+)?$/.test(token)) {
			return [{ type: 'literal', value: +token }, tokens];
		} else {
			tokens.unshift(token);
			return getRef(tokens);
		}
	} catch (e) {
		throw new Error('Literal value or reference expected');
	}
}

function getRef(tokens) {
	var ref = tokens.shift();
	var regex = /^\$([A-Z]+)\$([\d]+)$/;
	var match = regex.exec(ref);
	if (!match) {
		throw new Error('Reference expected');
	}
	// check validity and translate
	var x = match[1].split('').reduce(function (acc, val) {
		var pos = val.charCodeAt(0) - 'A'.charCodeAt(0);
		return acc * 26 + pos;
	}, 0),
	    y = match[2] - 1;
	if (x >= _constants.MAX_X || y >= _constants.MAX_Y) {
		throw new Error('Reference out of bounds');
	}
	return [{ type: 'reference', x: x, y: y }, tokens];
}

function getDependencies(arr) {
	var result = [];
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = arr[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var part = _step.value;

			result = result.concat(getDeps(part));
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	return result;
}
function getDeps(obj) {
	if (obj.type === 'reference') {
		return { x: obj.x, y: obj.y };
	}

	var result = [];

	for (var key in obj) {
		var part = obj[key];

		if (!part || (typeof part === 'undefined' ? 'undefined' : _typeof(part)) !== 'object') {
			continue;
		} else if (Array.isArray(part)) {
			result = result.concat(getDependencies(part));
		} else {
			result = result.concat(getDeps(part));
		}
	}
	return result;
}

exports.parseFormula = parseFormula;
exports.getDependencies = getDependencies;

},{"./constants":1}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.init = undefined;

var _plugins = require('./plugins');

var _plugins2 = _interopRequireDefault(_plugins);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

var _formulas = require('./formulas');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_constants.MAX_X, _utils2.default, _formulas.parseFormula);
var model = [];
var state = {
	editingCell: false,
	selectX: 0,
	selectY: 0,
	area: {
		selecting: false
	},
	clipboard: null
};
var $wrapper = $('#spreadsheet-wrapper');
var $rowsLabels = $('#rows-labels');
var $columnsLabels = $('#columns-labels');
var $formulaEcho = $('#formula-echo');

init();

//
//	Function definitions
//
function init() {

	var spreadsheetMarkup = '',
	    rowsLabelsMarkup = '<div class="row"><div class="cell"> </div></div>',
	    columnsLabelsMarkup = '<div class="row">';

	for (var i = 0; i < _constants.MAX_Y; i++) {
		//rows
		model.push([]);
		spreadsheetMarkup += '<div class="row" data-index="' + i + '">';
		rowsLabelsMarkup += '<div class="row"><div class="cell">' + (i + 1) + '</div></div>';
		for (var j = 0; j < _constants.MAX_X; j++) {
			//columns
			model[i].push({
				func: null,
				userInput: "",
				val: "",
				dependsOn: [],
				requiredBy: [],
				x: j,
				y: i
			});
			spreadsheetMarkup += '<div class="cell" data-index="' + j + '"></div>';
			if (i === 0) {
				var acc = j,
				    label = '';
				do {
					label = String.fromCharCode('A'.charCodeAt(0) + acc % 26) + label;
					acc = (acc - acc % 26) / 26;
				} while (acc > 0);
				columnsLabelsMarkup += '<div class="cell">' + label + '</div>';
			}
		}
		spreadsheetMarkup += '</div>';
	}
	columnsLabelsMarkup += '</div>';

	$wrapper.html(spreadsheetMarkup);
	$rowsLabels.html(rowsLabelsMarkup);
	$columnsLabels.html(columnsLabelsMarkup);

	getCellByCoords(state.selectX, state.selectY).addClass('selected');

	document.addEventListener('keypress', function (e) {
		if (state.editingCell) return true;

		var key = e.key;

		switch (key) {
			case 'ArrowLeft':
				state.selectX = state.selectX > 0 ? state.selectX - 1 : 0;
				moveSelection();
				e.preventDefault();
				break;
			case 'ArrowUp':
				state.selectY = state.selectY > 0 ? state.selectY - 1 : 0;
				moveSelection();
				e.preventDefault();
				break;
			case 'ArrowRight':
			case 'Tab':
				state.selectX = state.selectX < _constants.MAX_X - 1 ? state.selectX + 1 : _constants.MAX_X - 1;
				moveSelection();
				e.preventDefault();
				break;
			case 'ArrowDown':
				state.selectY = state.selectY < _constants.MAX_Y - 1 ? state.selectY + 1 : _constants.MAX_Y - 1;
				moveSelection();
				e.preventDefault();
				break;
			case 'Enter':
				editCell(getCellByCoords(state.selectX, state.selectY));
				break;
			case '=':
				editCell(getCellByCoords(state.selectX, state.selectY), '=');
				break;
			case 'Delete':
				editCell(getCellByCoords(state.selectX, state.selectY), '');
				break;
			case 'Escape':
				clearClipboard();
				break;
			default:
				return true;
		}
	}, false);

	$wrapper.on('click', '.cell', function (e) {
		var $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		var x = $cell.data('index');
		var y = $cell.parent().data('index');
		if (x === state.selectX && y === state.selectY) {
			editCell($cell);
		} else {
			state.selectX = $cell.data('index');
			state.selectY = $cell.parent().data('index');
			moveSelection();
		}
	});

	$wrapper.on('mouseup', '.cell', function (e) {
		var $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		var x = $cell.data('index');
		var y = $cell.parent().data('index');
		if (x === state.area.startX && y === state.area.startY) {
			state.area = {};
			$('.selecting').removeClass('selecting');
		}
		state.area.selecting = false;
	});

	$wrapper.on('mousedown', '.cell', function (e) {
		var $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		var x = $cell.data('index');
		var y = $cell.parent().data('index');
		state.area = {
			selecting: true,
			startX: x,
			startY: y,
			endX: x,
			endY: y
		};
		paintArea();
	});
	$wrapper.on('mouseenter', '.cell', function (e) {
		if (!state.area.selecting) return true;
		var $cell = $(this);
		var x = $cell.data('index');
		var y = $cell.parent().data('index');
		state.area.endX = x;
		state.area.endY = y;
		paintArea();
	});

	$(document).on('copy', function (e) {
		if (state.editingCell || state.area.selecting) return true;
		if (typeof state.area.startX !== 'undefined') {
			state.clipboard = state.area;
			state.area = {
				selecting: false
			};
			$('.in-clipboard').removeClass('in-clipboard');
			$('.selecting').addClass('in-clipboard').removeClass('selecting');
		} else {
			state.clipboard = {
				startX: state.selectX,
				startY: state.selectY,
				endX: state.selectX,
				endY: state.selectY
			};
			$('.in-clipboard').removeClass('in-clipboard');
			var $copied = getCellByCoords(state.selectX, state.selectY);
			$copied.addClass('in-clipboard');
		}
	});
	$(document).on('paste', function (e) {
		if (state.editingCell || state.area.selecting || !state.clipboard) return true;
		var _state$clipboard = state.clipboard,
		    startX = _state$clipboard.startX,
		    startY = _state$clipboard.startY,
		    endX = _state$clipboard.endX,
		    endY = _state$clipboard.endY;

		var minX = Math.min(startX, endX),
		    maxX = Math.max(startX, endX),
		    minY = Math.min(startY, endY),
		    maxY = Math.max(startY, endY);
		var deltaX = maxX - minX;
		var deltaY = maxY - minY;

		if (state.selectX + deltaX >= _constants.MAX_X || state.selectY + deltaY >= _constants.MAX_Y) {
			if (!window.confirm('Paste area out of spreadsheet bounds. Paste partially?')) {
				return;
			}
			maxX = Math.min(_constants.MAX_X + minX - state.selectX - 1, maxX);
			maxY = Math.min(_constants.MAX_Y + minY - state.selectY - 1, maxY);
		}
		for (var y = minY; y <= maxY; y++) {
			for (var x = minX; x <= maxX; x++) {
				flowData(model[y][x].userInput, state.selectX + x - minX, state.selectY + y - minY);
			}
		}
		clearClipboard();
		refreshEcho();
	});

	$('#show-link, #load-link, #cancel-link').on('click', function () {
		$('#show-link').toggle();
		$('#save-load-area').toggle();
	});
	$('#show-link').on('click', function () {
		var jsonStr = /*LZString.compressToBase64(*/JSON.stringify(model, function (key, value) {
			if (key === 'dependsOn' || key === 'requiredBy') {
				return this[key].map(function (cell) {
					return { x: cell.x, y: cell.y };
				});
			}
			return value;
		}) /*)*/;
		$('#save-load-area textarea').val(jsonStr);

		var blob = new Blob([jsonStr], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		$('#save-link')[0].download = 'spreadsheet.json';
		$('#save-link')[0].href = url;
	});
	$('#load-link').on('click', function () {
		$('.cell-input').blur();
		state.selectX = 0;
		state.selectY = 0;
		moveSelection();
		clearClipboard();
		model = JSON.parse( /*LZString.decompressFromBase64(*/$('#save-load-area textarea').val() /*)*/);
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = model[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var row = _step.value;
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = row[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var cell = _step2.value;

						cell.dependsOn = cell.dependsOn.map(function (dep) {
							return model[dep.y][dep.x];
						});
						cell.requiredBy = cell.requiredBy.map(function (dep) {
							return model[dep.y][dep.x];
						});
						getCellByCoords(cell.x, cell.y).html(cell.val);
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		refreshEcho();
	});
}

function editCell($cell, initialInput) {
	state.editingCell = $cell;
	var indexX = $cell.data('index'),
	    indexY = $cell.parent().data('index');

	$cell.css('position', 'relative');
	$cell.html($cell.html() + '<input class="cell-input" />');
	var $cellInput = $('.cell-input');

	$cellInput.one('blur', leaveCell);

	$cellInput.on('keypress', function (e) {
		if (!state.editingCell) return true;

		var key = e.key;

		switch (key) {
			case 'Enter':
				flowData($cellInput.val(), indexX, indexY);
				refreshEcho();
				leaveCell.call(this);
				return false;
			case 'Escape':
				leaveCell.call(this);
				return false;
			default:
				return true;
		}
	});

	$cellInput.val(typeof initialInput !== 'undefined' ? initialInput : model[indexY][indexX].userInput);
	$cellInput.focus();

	function leaveCell() {
		$(this).off('keypress').remove();
		$cell.css('position', '');
		state.editingCell = false;
	}
}
function moveSelection() {
	$('.cell.selected').removeClass('selected');
	var $selected = getCellByCoords(state.selectX, state.selectY);
	$selected.addClass('selected');
	refreshEcho();
	$selected.isOnScreen(function (deltas) {
		var offX = 0,
		    offY = 0;
		if (deltas.top < 10) {
			offY = 100;
		} else if (deltas.bottom < 10) {
			offY = -100;
		}
		if (deltas.left < 30) {
			offX = 200;
		} else if (deltas.right < 30) {
			offX = -200;
		}
		if (offX || offY) {
			$('#content')[0].scrollBy(offX, offY);
		}
	}, '#content');
}
function refreshEcho() {
	var cell = model[state.selectY][state.selectX];
	$formulaEcho.html((cell.func ? 'Fx ' : '') + cell.userInput);
}
function getCellByCoords(x, y) {
	return $wrapper.children().eq(y).children().eq(x);
}
function flowData(userInput, x, y) {
	var affected = [];
	var cell = model[y][x];
	cell.userInput = userInput;
	var _iteratorNormalCompletion3 = true;
	var _didIteratorError3 = false;
	var _iteratorError3 = undefined;

	try {
		for (var _iterator3 = cell.dependsOn[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
			var dep = _step3.value;

			dep.requiredBy = dep.requiredBy.filter(function (r) {
				return r !== cell;
			});
		}
	} catch (err) {
		_didIteratorError3 = true;
		_iteratorError3 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion3 && _iterator3.return) {
				_iterator3.return();
			}
		} finally {
			if (_didIteratorError3) {
				throw _iteratorError3;
			}
		}
	}

	try {
		if (userInput[0] === '=') {
			var func = (0, _formulas.parseFormula)(userInput.slice(1));
			cell.func = func;
			var dependsOn = (0, _utils2.default)((0, _formulas.getDependencies)(cell.func).map(function (coords) {
				return model[coords.y][coords.x];
			}));
			checkCyclicRefs(cell, dependsOn);
			cell.dependsOn = dependsOn;
			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = dependsOn[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var _dep = _step4.value;

					_dep.requiredBy.push(cell);
					_dep.requiredBy = (0, _utils2.default)(_dep.requiredBy);
				}
			} catch (err) {
				_didIteratorError4 = true;
				_iteratorError4 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion4 && _iterator4.return) {
						_iterator4.return();
					}
				} finally {
					if (_didIteratorError4) {
						throw _iteratorError4;
					}
				}
			}

			affected = recalculateCell(cell, null);
		} else {
			cell.func = null;
			cell.dependsOn = [];
			affected = recalculateCell(cell, userInput);
		}
		affected = (0, _utils2.default)(affected);
	} catch (e) {
		cell.func = null;
		cell.val = e;
	}
	var _iteratorNormalCompletion5 = true;
	var _didIteratorError5 = false;
	var _iteratorError5 = undefined;

	try {
		for (var _iterator5 = affected.concat(cell)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
			var affCell = _step5.value;

			getCellByCoords(affCell.x, affCell.y).html(affCell.val);
		}
	} catch (err) {
		_didIteratorError5 = true;
		_iteratorError5 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion5 && _iterator5.return) {
				_iterator5.return();
			}
		} finally {
			if (_didIteratorError5) {
				throw _iteratorError5;
			}
		}
	}
}
function recalculateCell(cell, literalInput) {
	if (literalInput !== null) {
		cell.val = literalInput;
	} else {
		var val = eval(buildEvalExpr(cell.func)); //TODO handle errors // can be cached
		cell.val = val;
	}
	var affected = [].concat(cell.requiredBy);
	var _iteratorNormalCompletion6 = true;
	var _didIteratorError6 = false;
	var _iteratorError6 = undefined;

	try {
		for (var _iterator6 = (cell.requiredBy || [])[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
			var dependent = _step6.value;

			affected = affected.concat(recalculateCell(dependent, null));
		}
	} catch (err) {
		_didIteratorError6 = true;
		_iteratorError6 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion6 && _iterator6.return) {
				_iterator6.return();
			}
		} finally {
			if (_didIteratorError6) {
				throw _iteratorError6;
			}
		}
	}

	return affected;
}
function buildEvalExpr(funcObj) {
	var result = '';
	try {
		var _iteratorNormalCompletion7 = true;
		var _didIteratorError7 = false;
		var _iteratorError7 = undefined;

		try {
			for (var _iterator7 = funcObj[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
				var part = _step7.value;

				result += buildExprFragment(part);
			}
		} catch (err) {
			_didIteratorError7 = true;
			_iteratorError7 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion7 && _iterator7.return) {
					_iterator7.return();
				}
			} finally {
				if (_didIteratorError7) {
					throw _iteratorError7;
				}
			}
		}
	} catch (e) {
		result = e;
	}
	return result;
}
function buildExprFragment(obj) {
	var result = '';
	switch (obj.type) {
		case 'unary':
			result += obj.oper + buildExprFragment(obj.val);
			break;
		case 'operator':
			result += ' ' + obj.oper + ' ';
			break;
		case 'literal':
			result += obj.value;
			break;
		case 'reference':
			result += assertVal(model[obj.y][obj.x].val);
			break;
		case 'sum':
			result += buildSumExpr(obj);
			break;
		default:
			throw new Error('Unexpected');
	}
	return result;
}
function buildSumExpr(sumObj) {
	var result = [];
	var _sumObj$range = sumObj.range,
	    _sumObj$range$start = _sumObj$range.start,
	    startX = _sumObj$range$start.x,
	    startY = _sumObj$range$start.y,
	    _sumObj$range$end = _sumObj$range.end,
	    endX = _sumObj$range$end.x,
	    endY = _sumObj$range$end.y;

	var minX = Math.min(startX, endX),
	    maxX = Math.max(startX, endX),
	    minY = Math.min(startY, endY),
	    maxY = Math.max(startY, endY);
	for (var y = minY; y <= maxY; y++) {
		for (var x = minX; x <= maxX; x++) {
			result.push(assertVal(model[y][x].val) || 0);
		}
	}
	return result.join('+');
}
function assertVal(val) {
	if (val instanceof Error) {
		throw val;
	}
	return val;
}
function checkCyclicRefs(cell, deps) {
	var _iteratorNormalCompletion8 = true;
	var _didIteratorError8 = false;
	var _iteratorError8 = undefined;

	try {
		for (var _iterator8 = deps[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
			var dependency = _step8.value;

			if (cell === dependency) {
				throw new Error('Cyclic reference');
			}
			checkCyclicRefs(cell, dependency.dependsOn);
		}
	} catch (err) {
		_didIteratorError8 = true;
		_iteratorError8 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion8 && _iterator8.return) {
				_iterator8.return();
			}
		} finally {
			if (_didIteratorError8) {
				throw _iteratorError8;
			}
		}
	}
}

function paintArea() {
	$('.selecting').removeClass('selecting');
	var _state$area = state.area,
	    startX = _state$area.startX,
	    startY = _state$area.startY,
	    endX = _state$area.endX,
	    endY = _state$area.endY;

	var minX = Math.min(startX, endX),
	    maxX = Math.max(startX, endX),
	    minY = Math.min(startY, endY),
	    maxY = Math.max(startY, endY);
	for (var y = minY; y <= maxY; y++) {
		for (var x = minX; x <= maxX; x++) {
			getCellByCoords(x, y).addClass('selecting');
		}
	}
}
function clearClipboard() {
	$('.selecting').removeClass('selecting');
	$('.in-clipboard').removeClass('in-clipboard');
	state.area = {
		selecting: false
	};
	state.clipboard = null;
}

exports.init = init;

},{"./constants":1,"./formulas":2,"./plugins":4,"./utils":5}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Avoid `console` errors in browsers that lack a console.
(function () {
  var method;
  var noop = function noop() {};
  var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'];
  var length = methods.length;
  var console = window.console = window.console || {};

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
})();

// Place any jQuery/helper plugins in here.

(function ($) {

  /**
  * Tests if a node is positioned within the current viewport.
  * It does not test any other type of "visibility", like css display,
  * opacity, presence in the dom, etc - it only considers position.
  * 
  * By default, it tests if at least 1 pixel is showing, regardless of
  * orientation - however an optional argument is accepted, a callback
  * that is passed the number of pixels distant between each edge of the
   * node and the corresponding viewport.  If the callback argument is provided
   * the return value (true of false) of that callback is used instead.
  */
  $.fn.isOnScreen = function (test, selector) {

    var height = this.outerHeight();
    var width = this.outerWidth();

    if (!width || !height) {
      return false;
    }

    var win = $(window);

    var viewport = {
      top: win.scrollTop(),
      left: win.scrollLeft()
    };
    viewport.right = viewport.left + win.width();
    viewport.bottom = viewport.top + win.height();

    // Tweak
    if (selector) viewport.top = viewport.top + $(selector).offset().top;

    var bounds = this.offset();
    bounds.right = bounds.left + width;
    bounds.bottom = bounds.top + height;

    var deltas = {
      top: viewport.bottom - bounds.top,
      left: viewport.right - bounds.left,
      bottom: bounds.bottom - viewport.top,
      right: bounds.right - viewport.left
    };

    if (typeof test == 'function') {
      return test.call(this, deltas);
    }

    return deltas.top > 0 && deltas.left > 0 && deltas.right > 0 && deltas.bottom > 0;
  };
})(jQuery);

// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
var LZString = function () {

  // private property
  var f = String.fromCharCode;
  var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  var baseReverseDic = {};

  function getBaseValue(alphabet, character) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (var i = 0; i < alphabet.length; i++) {
        baseReverseDic[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return baseReverseDic[alphabet][character];
  }

  var LZString = {
    compressToBase64: function compressToBase64(input) {
      if (input == null) return "";
      var res = LZString._compress(input, 6, function (a) {
        return keyStrBase64.charAt(a);
      });
      switch (res.length % 4) {// To produce valid Base64
        default: // When could this happen ?
        case 0:
          return res;
        case 1:
          return res + "===";
        case 2:
          return res + "==";
        case 3:
          return res + "=";
      }
    },

    decompressFromBase64: function decompressFromBase64(input) {
      if (input == null) return "";
      if (input == "") return null;
      return LZString._decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrBase64, input.charAt(index));
      });
    },

    compressToUTF16: function compressToUTF16(input) {
      if (input == null) return "";
      return LZString._compress(input, 15, function (a) {
        return f(a + 32);
      }) + " ";
    },

    decompressFromUTF16: function decompressFromUTF16(compressed) {
      if (compressed == null) return "";
      if (compressed == "") return null;
      return LZString._decompress(compressed.length, 16384, function (index) {
        return compressed.charCodeAt(index) - 32;
      });
    },

    //compress into uint8array (UCS-2 big endian format)
    compressToUint8Array: function compressToUint8Array(uncompressed) {
      var compressed = LZString.compress(uncompressed);
      var buf = new Uint8Array(compressed.length * 2); // 2 bytes per character

      for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
        var current_value = compressed.charCodeAt(i);
        buf[i * 2] = current_value >>> 8;
        buf[i * 2 + 1] = current_value % 256;
      }
      return buf;
    },

    //decompress from uint8array (UCS-2 big endian format)
    decompressFromUint8Array: function decompressFromUint8Array(compressed) {
      if (compressed === null || compressed === undefined) {
        return LZString.decompress(compressed);
      } else {
        var buf = new Array(compressed.length / 2); // 2 bytes per character
        for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
          buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
        }

        var result = [];
        buf.forEach(function (c) {
          result.push(f(c));
        });
        return LZString.decompress(result.join(''));
      }
    },

    //compress into a string that is already URI encoded
    compressToEncodedURIComponent: function compressToEncodedURIComponent(input) {
      if (input == null) return "";
      return LZString._compress(input, 6, function (a) {
        return keyStrUriSafe.charAt(a);
      });
    },

    //decompress from an output of compressToEncodedURIComponent
    decompressFromEncodedURIComponent: function decompressFromEncodedURIComponent(input) {
      if (input == null) return "";
      if (input == "") return null;
      input = input.replace(/ /g, "+");
      return LZString._decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrUriSafe, input.charAt(index));
      });
    },

    compress: function compress(uncompressed) {
      return LZString._compress(uncompressed, 16, function (a) {
        return f(a);
      });
    },
    _compress: function _compress(uncompressed, bitsPerChar, getCharFromInt) {
      if (uncompressed == null) return "";
      var i,
          value,
          context_dictionary = {},
          context_dictionaryToCreate = {},
          context_c = "",
          context_wc = "",
          context_w = "",
          context_enlargeIn = 2,
          // Compensate for the first entry which should not count
      context_dictSize = 3,
          context_numBits = 2,
          context_data = [],
          context_data_val = 0,
          context_data_position = 0,
          ii;

      for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
          context_dictionary[context_c] = context_dictSize++;
          context_dictionaryToCreate[context_c] = true;
        }

        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
          context_w = context_wc;
        } else {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
              for (i = 0; i < context_numBits; i++) {
                context_data_val = context_data_val << 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i = 0; i < 8; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i = 0; i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i = 0; i < 16; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i = 0; i < context_numBits; i++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          // Add wc to the dictionary.
          context_dictionary[context_wc] = context_dictSize++;
          context_w = String(context_c);
        }
      }

      // Output the code for w.
      if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = context_data_val << 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = context_data_val << 1 | value;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1 | value & 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
      }

      // Mark the end of the stream
      value = 2;
      for (i = 0; i < context_numBits; i++) {
        context_data_val = context_data_val << 1 | value & 1;
        if (context_data_position == bitsPerChar - 1) {
          context_data_position = 0;
          context_data.push(getCharFromInt(context_data_val));
          context_data_val = 0;
        } else {
          context_data_position++;
        }
        value = value >> 1;
      }

      // Flush the last char
      while (true) {
        context_data_val = context_data_val << 1;
        if (context_data_position == bitsPerChar - 1) {
          context_data.push(getCharFromInt(context_data_val));
          break;
        } else context_data_position++;
      }
      return context_data.join('');
    },

    decompress: function decompress(compressed) {
      if (compressed == null) return "";
      if (compressed == "") return null;
      return LZString._decompress(compressed.length, 32768, function (index) {
        return compressed.charCodeAt(index);
      });
    },

    _decompress: function _decompress(length, resetValue, getNextValue) {
      var dictionary = [],
          next,
          enlargeIn = 4,
          dictSize = 4,
          numBits = 3,
          entry = "",
          result = [],
          i,
          w,
          bits,
          resb,
          maxpower,
          power,
          c,
          data = { val: getNextValue(0), position: resetValue, index: 1 };

      for (i = 0; i < 3; i += 1) {
        dictionary[i] = i;
      }

      bits = 0;
      maxpower = Math.pow(2, 2);
      power = 1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (next = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 2:
          return "";
      }
      dictionary[3] = c;
      w = c;
      result.push(c);
      while (true) {
        if (data.index > length) {
          return "";
        }

        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch (c = bits) {
          case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }

            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 2:
            return result.join('');
        }

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }

        if (dictionary[c]) {
          entry = dictionary[c];
        } else {
          if (c === dictSize) {
            entry = w + w.charAt(0);
          } else {
            return null;
          }
        }
        result.push(entry);

        // Add w+entry[0] to the dictionary.
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }
      }
    }
  };
  return LZString;
}();

if (typeof define === 'function' && define.amd) {
  define(function () {
    return LZString;
  });
} else if (typeof module !== 'undefined' && module != null) {
  module.exports = LZString;
} else if (typeof angular !== 'undefined' && angular != null) {
  angular.module('LZString', []).factory('LZString', function () {
    return LZString;
  });
}

exports.default = LZString;

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
function dedupeArr(arr) {
	if (!Array.isArray(arr)) {
		throw new Error('Array expected');
	}
	return Array.from(new Set(arr));
}

exports.default = dedupeArr;

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvY29uc3RhbnRzLmpzIiwic3JjL2pzL2Zvcm11bGFzLmpzIiwic3JjL2pzL21haW4uanMiLCJzcmMvanMvcGx1Z2lucy5qcyIsInNyYy9qcy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDQUEsSUFBTSxRQUFRLEVBQWQ7QUFBQSxJQUFrQixRQUFRLEVBQTFCLEMsQ0FBOEI7O1FBRXRCLEssR0FBQSxLO1FBQU8sSyxHQUFBLEs7Ozs7Ozs7Ozs7Ozs7O0FDRmY7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUyxRQUFULENBQWtCLE9BQWxCLEVBQTJCO0FBQzFCO0FBQ0EsS0FBSSxNQUFNLE9BQVY7QUFDQSxLQUFNLFlBQVksbUVBQWxCO0FBQ0EsS0FBTSxTQUFTLEVBQWY7QUFDQSxRQUFPLElBQUksTUFBSixHQUFhLENBQXBCLEVBQXVCO0FBQ3RCLE1BQU0sUUFBUSxVQUFVLElBQVYsQ0FBZSxHQUFmLENBQWQ7QUFDQSxNQUFJLENBQUMsS0FBTCxFQUFZO0FBQ1gsU0FBTSxJQUFJLEtBQUosQ0FBVSwyQkFBMkIsR0FBckMsQ0FBTjtBQUNBO0FBQ0QsTUFBTSxRQUFRLE1BQU0sQ0FBTixDQUFkO0FBQ0EsUUFBTSxNQUFNLENBQU4sQ0FBTjtBQUNBLFNBQU8sSUFBUCxDQUFZLEtBQVo7QUFDQTtBQUNELFFBQU8sT0FBTyxNQUFQLENBQWMsVUFBUyxLQUFULEVBQWdCO0FBQ3BDLFNBQU8sQ0FBQyxNQUFNLEtBQU4sQ0FBWSxJQUFaLENBQVI7QUFDQSxFQUZNLENBQVA7QUFHQTs7QUFFRCxTQUFTLFlBQVQsQ0FBc0IsT0FBdEIsRUFBK0I7QUFDOUIsS0FBTSxVQUFVLEVBQWhCO0FBQ0EsS0FBSSxTQUFTLFNBQVMsT0FBVCxDQUFiO0FBQ0EsS0FBSSxhQUFKO0FBQUEsS0FBVSxhQUFWOztBQUg4QixnQkFJYixRQUFRLE1BQVIsQ0FKYTs7QUFBQTs7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LFFBQVA7QUFDRCxDQXJlYyxFQUFmOztBQXVlQSxJQUFJLE9BQU8sTUFBUCxLQUFrQixVQUFsQixJQUFnQyxPQUFPLEdBQTNDLEVBQWdEO0FBQzlDLFNBQU8sWUFBWTtBQUFFLFdBQU8sUUFBUDtBQUFrQixHQUF2QztBQUNELENBRkQsTUFFTyxJQUFJLE9BQU8sTUFBUCxLQUFrQixXQUFsQixJQUFpQyxVQUFVLElBQS9DLEVBQXNEO0FBQzNELFNBQU8sT0FBUCxHQUFpQixRQUFqQjtBQUNELENBRk0sTUFFQSxJQUFJLE9BQU8sT0FBUCxLQUFtQixXQUFuQixJQUFrQyxXQUFXLElBQWpELEVBQXdEO0FBQzdELFVBQVEsTUFBUixDQUFlLFVBQWYsRUFBMkIsRUFBM0IsRUFDQyxPQURELENBQ1MsVUFEVCxFQUNxQixZQUFZO0FBQy9CLFdBQU8sUUFBUDtBQUNELEdBSEQ7QUFJRDs7a0JBRWMsUTs7Ozs7Ozs7QUM5a0JmLFNBQVMsU0FBVCxDQUFtQixHQUFuQixFQUF3QjtBQUN2QixLQUFJLENBQUMsTUFBTSxPQUFOLENBQWMsR0FBZCxDQUFMLEVBQXlCO0FBQ3hCLFFBQU0sSUFBSSxLQUFKLENBQVUsZ0JBQVYsQ0FBTjtBQUNBO0FBQ0QsUUFBTyxNQUFNLElBQU4sQ0FBVyxJQUFJLEdBQUosQ0FBUSxHQUFSLENBQVgsQ0FBUDtBQUNBOztrQkFFYyxTIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IE1BWF9YID0gNTAsIE1BWF9ZID0gNTA7XHQvLyBUd2Vha2FibGVcblxuZXhwb3J0IHtNQVhfWCwgTUFYX1l9O1xuIiwiaW1wb3J0IHtNQVhfWCwgTUFYX1l9IGZyb20gJy4vY29uc3RhbnRzJztcblxuLy9cbi8vIEV2ZXJ5dGhpbmcgYWJvdXQgcGFyc2luZyB1c2VyIGZvcm11bGFzXG4vL1xuZnVuY3Rpb24gdG9rZW5pemUoZlN0cmluZykge1xuXHQvLyBhbmQgcmVtb3ZlIHdoaXRlc3BhY2Vcblx0bGV0IHN0ciA9IGZTdHJpbmc7XG5cdGNvbnN0IHRva2VuaXplciA9IC9eKFxcc3xcXCt8XFwtfFxcKnxcXC98XFwofFxcKXxcXGQrKD86XFwuXFxkKyk/fFxcJFtBLVpdK1xcJFtcXGRdK3xTVU18XFw6KSguKikkLztcblx0Y29uc3QgdG9rZW5zID0gW107XG5cdHdoaWxlIChzdHIubGVuZ3RoID4gMCkge1xuXHRcdGNvbnN0IG1hdGNoID0gdG9rZW5pemVyLmV4ZWMoc3RyKTtcblx0XHRpZiAoIW1hdGNoKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3ltYm9sIGF0OiAnICsgc3RyKTtcblx0XHR9XG5cdFx0Y29uc3QgdG9rZW4gPSBtYXRjaFsxXTtcblx0XHRzdHIgPSBtYXRjaFsyXTtcblx0XHR0b2tlbnMucHVzaCh0b2tlbik7XG5cdH1cblx0cmV0dXJuIHRva2Vucy5maWx0ZXIoZnVuY3Rpb24odG9rZW4pIHtcblx0XHRyZXR1cm4gIXRva2VuLm1hdGNoKC9cXHMvKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRm9ybXVsYShmU3RyaW5nKSB7XG5cdGNvbnN0IGZvcm11bGEgPSBbXTtcblx0bGV0IHRva2VucyA9IHRva2VuaXplKGZTdHJpbmcpO1xuXHRsZXQgZXhwciwgb3Blcjtcblx0W2V4cHIsIHRva2Vuc10gPSBnZXRFeHByKHRva2Vucyk7XG5cdGZvcm11bGEucHVzaChleHByKTtcblx0d2hpbGUgKHRva2Vucy5sZW5ndGggPiAwKSB7XG5cdFx0W29wZXIsIHRva2Vuc10gPSBnZXRPcGVyKHRva2Vucyk7XG5cdFx0W2V4cHIsIHRva2Vuc10gPSBnZXRFeHByKHRva2Vucyk7XG5cdFx0Zm9ybXVsYS5wdXNoKHt0eXBlOiAnb3BlcmF0b3InLCBvcGVyfSwgZXhwcik7XG5cdH1cblx0cmV0dXJuIGZvcm11bGE7XG59XG5cbmZ1bmN0aW9uIGdldE9wZXIodG9rZW5zKSB7XG5cdGNvbnN0IG9wZXIgPSB0b2tlbnMuc2hpZnQoKTtcblx0aWYgKCFbJysnLCAnLScsICcqJywgJy8nXS5pbmNsdWRlcyhvcGVyKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignT3BlcmF0b3IgZXhwZWN0ZWQ6ICsgLCAtICwgKiBvciAvJyk7XG5cdH1cblx0cmV0dXJuIFtvcGVyLCB0b2tlbnNdO1xufVxuXG5mdW5jdGlvbiBnZXRFeHByKHRva2Vucykge1xuXHRjb25zdCB1T3BlcnMgPSBbJysnLCAnLSddO1xuXHRjb25zdCBTVU0gPSAnU1VNJztcblx0Ly8gVE9ETyBwYXJlbnRoZXNlcyBmb3IgZXhwcmVzc2lvbnMgc29tZXRpbWU/XG5cdGxldCB0b2tlbiA9IHRva2Vucy5zaGlmdCgpO1xuXHRsZXQgdmFsO1xuXHRpZiAodU9wZXJzLmluY2x1ZGVzKHRva2VuKSkge1xuXHRcdFt2YWwsIHRva2Vuc10gPSBnZXRWYWwodG9rZW5zKTtcblx0XHRyZXR1cm4gW3sgdHlwZTogJ3VuYXJ5Jywgb3BlcjogdG9rZW4sIHZhbH0sIHRva2Vuc107XG5cdH1cblx0aWYgKHRva2VuID09PSBTVU0pIHtcblx0XHR0b2tlbiA9IHRva2Vucy5zaGlmdCgpO1xuXHRcdGlmICh0b2tlbiAhPT0gJygnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ09wZW5pbmcgYnJhY2UgZXhwZWN0ZWQnKTtcblx0XHR9XG5cdFx0bGV0IHJhbmdlO1xuXHRcdFtyYW5nZSwgdG9rZW5zXSA9IGdldFJhbmdlKHRva2Vucyk7XG5cdFx0dG9rZW4gPSB0b2tlbnMuc2hpZnQoKTtcblx0XHRpZiAodG9rZW4gIT09ICcpJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdDbG9zaW5nIGJyYWNlIGV4cGVjdGVkJyk7XG5cdFx0fVxuXHRcdHJldHVybiBbeyB0eXBlOiAnc3VtJywgcmFuZ2V9LCB0b2tlbnNdO1xuXHR9XG5cdHRva2Vucy51bnNoaWZ0KHRva2VuKTtcblx0cmV0dXJuIGdldFZhbCh0b2tlbnMpO1xufVxuXG5mdW5jdGlvbiBnZXRSYW5nZSh0b2tlbnMpIHtcblx0bGV0IHN0YXJ0LCBlbmQ7XG5cdFtzdGFydCwgdG9rZW5zXSA9IGdldFJlZih0b2tlbnMpO1xuXHRjb25zdCBzZXBhcmF0b3IgPSB0b2tlbnMuc2hpZnQoKTtcblx0aWYgKHNlcGFyYXRvciAhPT0gJzonKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdTZXBhcmF0b3IgOiBleHBlY3RlZCcpO1xuXHR9XG5cdFtlbmQsIHRva2Vuc10gPSBnZXRSZWYodG9rZW5zKTtcblx0aWYgKHN0YXJ0LnggIT09IGVuZC54ICYmIHN0YXJ0LnkgIT09IGVuZC55KSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb24tbGluZWFyIHJhbmdlIGlzIGludmFsaWQnKTtcblx0fVxuXHRyZXR1cm4gW3tzdGFydCwgZW5kfSwgdG9rZW5zXTtcbn1cblxuZnVuY3Rpb24gZ2V0VmFsKHRva2Vucykge1xuXHRjb25zdCB0b2tlbiA9IHRva2Vucy5zaGlmdCgpO1xuXHR0cnkge1xuXHRcdGlmICgvXlxcZCsoPzpcXC5cXGQrKT8kLy50ZXN0KHRva2VuKSkge1xuXHRcdFx0cmV0dXJuIFt7dHlwZTogJ2xpdGVyYWwnLCB2YWx1ZTogK3Rva2VufSwgdG9rZW5zXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dG9rZW5zLnVuc2hpZnQodG9rZW4pO1xuXHRcdFx0cmV0dXJuIGdldFJlZih0b2tlbnMpO1xuXHRcdH1cblx0fSBjYXRjaCAoZSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignTGl0ZXJhbCB2YWx1ZSBvciByZWZlcmVuY2UgZXhwZWN0ZWQnKTtcdFx0XG5cdH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVmKHRva2Vucykge1xuXHRjb25zdCByZWYgPSB0b2tlbnMuc2hpZnQoKTtcblx0Y29uc3QgcmVnZXggPSAvXlxcJChbQS1aXSspXFwkKFtcXGRdKykkLztcblx0Y29uc3QgbWF0Y2ggPSByZWdleC5leGVjKHJlZik7XG5cdGlmICghbWF0Y2gpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ1JlZmVyZW5jZSBleHBlY3RlZCcpO1xuXHR9XG5cdC8vIGNoZWNrIHZhbGlkaXR5IGFuZCB0cmFuc2xhdGVcblx0bGV0IHggPSBtYXRjaFsxXS5zcGxpdCgnJykucmVkdWNlKGZ1bmN0aW9uIChhY2MsIHZhbCkge1xuXHRcdGNvbnN0IHBvcyA9IHZhbC5jaGFyQ29kZUF0KDApIC0gJ0EnLmNoYXJDb2RlQXQoMCk7XG5cdFx0cmV0dXJuIGFjYyoyNiArIHBvcztcblx0fSwgMCksXG5cdFx0eSA9IG1hdGNoWzJdIC0gMTtcblx0aWYgKHggPj0gTUFYX1ggfHwgeSA+PSBNQVhfWSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignUmVmZXJlbmNlIG91dCBvZiBib3VuZHMnKTtcblx0fVxuXHRyZXR1cm4gW3t0eXBlOiAncmVmZXJlbmNlJywgeCwgeX0sIHRva2Vuc107XG59XG5cbmZ1bmN0aW9uIGdldERlcGVuZGVuY2llcyhhcnIpIHtcblx0bGV0IHJlc3VsdCA9IFtdO1xuXHRmb3IgKGxldCBwYXJ0IG9mIGFycikge1xuXHRcdHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoZ2V0RGVwcyhwYXJ0KSk7XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGdldERlcHMob2JqKSB7XG5cdGlmIChvYmoudHlwZSA9PT0gJ3JlZmVyZW5jZScpIHtcblx0XHRyZXR1cm4ge3g6IG9iai54LCB5OiBvYmoueX07XG5cdH1cblxuXHRsZXQgcmVzdWx0ID0gW107XG5cblx0Zm9yIChsZXQga2V5IGluIG9iaikge1xuXHRcdGxldCBwYXJ0ID0gb2JqW2tleV07XG5cblx0XHRpZiAoIXBhcnQgfHwgdHlwZW9mKHBhcnQpICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHBhcnQpKSB7XG5cdFx0XHRyZXN1bHQgPSByZXN1bHQuY29uY2F0KGdldERlcGVuZGVuY2llcyhwYXJ0KSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoZ2V0RGVwcyhwYXJ0KSk7XHRcdFx0XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCB7cGFyc2VGb3JtdWxhLCBnZXREZXBlbmRlbmNpZXN9O1xuIiwiaW1wb3J0IExaU3RyaW5nIGZyb20gJy4vcGx1Z2lucyc7XG5pbXBvcnQgZGVkdXBlQXJyIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtwYXJzZUZvcm11bGEsIGdldERlcGVuZGVuY2llc30gZnJvbSAnLi9mb3JtdWxhcyc7XG5pbXBvcnQge01BWF9YLCBNQVhfWX0gZnJvbSAnLi9jb25zdGFudHMnO1xuY29uc29sZS5sb2coTUFYX1gsIGRlZHVwZUFyciwgcGFyc2VGb3JtdWxhKVxubGV0IG1vZGVsID0gW107XG5jb25zdCBzdGF0ZSA9IHtcblx0ZWRpdGluZ0NlbGw6IGZhbHNlLFxuXHRzZWxlY3RYOiAwLFxuXHRzZWxlY3RZOiAwLFxuXHRhcmVhOiB7XG5cdFx0c2VsZWN0aW5nOiBmYWxzZVxuXHR9LFxuXHRjbGlwYm9hcmQ6IG51bGxcbn07XG5jb25zdCAkd3JhcHBlciA9ICQoJyNzcHJlYWRzaGVldC13cmFwcGVyJyk7XG5jb25zdCAkcm93c0xhYmVscyA9ICQoJyNyb3dzLWxhYmVscycpO1xuY29uc3QgJGNvbHVtbnNMYWJlbHMgPSAkKCcjY29sdW1ucy1sYWJlbHMnKTtcbmNvbnN0ICRmb3JtdWxhRWNobyA9ICQoJyNmb3JtdWxhLWVjaG8nKTtcblxuaW5pdCgpO1xuXG5cbi8vXG4vL1x0RnVuY3Rpb24gZGVmaW5pdGlvbnNcbi8vXG5mdW5jdGlvbiBpbml0KCkge1xuXG5cdGxldCBzcHJlYWRzaGVldE1hcmt1cCA9ICcnLFxuXHRcdHJvd3NMYWJlbHNNYXJrdXAgPSAnPGRpdiBjbGFzcz1cInJvd1wiPjxkaXYgY2xhc3M9XCJjZWxsXCI+IDwvZGl2PjwvZGl2PicsXG5cdFx0Y29sdW1uc0xhYmVsc01hcmt1cCA9ICc8ZGl2IGNsYXNzPVwicm93XCI+JztcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IE1BWF9ZOyBpKyspIHtcdC8vcm93c1xuXHRcdG1vZGVsLnB1c2goW10pO1xuXHRcdHNwcmVhZHNoZWV0TWFya3VwICs9ICc8ZGl2IGNsYXNzPVwicm93XCIgZGF0YS1pbmRleD1cIicgKyBpICsgJ1wiPic7XG5cdFx0cm93c0xhYmVsc01hcmt1cCArPSAnPGRpdiBjbGFzcz1cInJvd1wiPjxkaXYgY2xhc3M9XCJjZWxsXCI+JyArIChpKzEpICsgJzwvZGl2PjwvZGl2Pic7XG5cdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBNQVhfWDsgaisrKSB7XHQvL2NvbHVtbnNcblx0XHRcdG1vZGVsW2ldLnB1c2goe1xuXHRcdFx0XHRmdW5jOiBudWxsLFxuXHRcdFx0XHR1c2VySW5wdXQ6IFwiXCIsXG5cdFx0XHRcdHZhbDogXCJcIixcblx0XHRcdFx0ZGVwZW5kc09uOiBbXSxcblx0XHRcdFx0cmVxdWlyZWRCeTogW10sXG5cdFx0XHRcdHg6IGosXG5cdFx0XHRcdHk6IGlcblx0XHRcdH0pO1xuXHRcdFx0c3ByZWFkc2hlZXRNYXJrdXAgKz0gJzxkaXYgY2xhc3M9XCJjZWxsXCIgZGF0YS1pbmRleD1cIicgKyBqICsgJ1wiPjwvZGl2Pic7XG5cdFx0XHRpZiAoaSA9PT0gMCkge1xuXHRcdFx0XHRsZXQgYWNjID0gaixcblx0XHRcdFx0XHRsYWJlbCA9ICcnO1xuXHRcdFx0XHRkbyB7XG5cdFx0XHRcdFx0bGFiZWwgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCdBJy5jaGFyQ29kZUF0KDApICsgYWNjICUgMjYpICsgbGFiZWw7XG5cdFx0XHRcdFx0YWNjID0gKGFjYyAtIGFjYyAlIDI2KSAvIDI2O1xuXHRcdFx0XHR9IHdoaWxlIChhY2MgPiAwKTtcblx0XHRcdFx0Y29sdW1uc0xhYmVsc01hcmt1cCArPSAnPGRpdiBjbGFzcz1cImNlbGxcIj4nICsgbGFiZWwgKyAnPC9kaXY+JztcdFx0XHRcblx0XHRcdH1cblx0XHR9XG5cdFx0c3ByZWFkc2hlZXRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cdH1cblx0Y29sdW1uc0xhYmVsc01hcmt1cCArPSAnPC9kaXY+JztcblxuXHQkd3JhcHBlci5odG1sKHNwcmVhZHNoZWV0TWFya3VwKTtcblx0JHJvd3NMYWJlbHMuaHRtbChyb3dzTGFiZWxzTWFya3VwKTtcblx0JGNvbHVtbnNMYWJlbHMuaHRtbChjb2x1bW5zTGFiZWxzTWFya3VwKTtcblxuXHRnZXRDZWxsQnlDb29yZHMoc3RhdGUuc2VsZWN0WCwgc3RhdGUuc2VsZWN0WSlcblx0XHRcdC5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcblxuXHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoc3RhdGUuZWRpdGluZ0NlbGwpIHJldHVybiB0cnVlO1xuXG5cdFx0Y29uc3Qge2tleX0gPSBlO1xuXHRcdHN3aXRjaCAoa2V5KSB7XG5cdFx0XHRjYXNlICdBcnJvd0xlZnQnOlxuXHRcdFx0XHRzdGF0ZS5zZWxlY3RYID0gc3RhdGUuc2VsZWN0WCA+IDAgPyBzdGF0ZS5zZWxlY3RYIC0gMSA6IDA7XG5cdFx0XHRcdG1vdmVTZWxlY3Rpb24oKTtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Fycm93VXAnOlxuXHRcdFx0XHRzdGF0ZS5zZWxlY3RZID0gc3RhdGUuc2VsZWN0WSA+IDAgPyBzdGF0ZS5zZWxlY3RZIC0gMSA6IDA7XG5cdFx0XHRcdG1vdmVTZWxlY3Rpb24oKTtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0Y2FzZSAnVGFiJzpcblx0XHRcdFx0c3RhdGUuc2VsZWN0WCA9IHN0YXRlLnNlbGVjdFggPCBNQVhfWC0xID8gc3RhdGUuc2VsZWN0WCArIDEgOiBNQVhfWC0xO1xuXHRcdFx0XHRtb3ZlU2VsZWN0aW9uKCk7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdBcnJvd0Rvd24nOlxuXHRcdFx0XHRzdGF0ZS5zZWxlY3RZID0gc3RhdGUuc2VsZWN0WSA8IE1BWF9ZLTEgPyBzdGF0ZS5zZWxlY3RZICsgMSA6IE1BWF9ZLTE7XG5cdFx0XHRcdG1vdmVTZWxlY3Rpb24oKTtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0VudGVyJzpcblx0XHRcdFx0ZWRpdENlbGwoZ2V0Q2VsbEJ5Q29vcmRzKHN0YXRlLnNlbGVjdFgsIHN0YXRlLnNlbGVjdFkpKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICc9Jzpcblx0XHRcdFx0ZWRpdENlbGwoZ2V0Q2VsbEJ5Q29vcmRzKHN0YXRlLnNlbGVjdFgsIHN0YXRlLnNlbGVjdFkpLCAnPScpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0RlbGV0ZSc6XG5cdFx0XHRcdGVkaXRDZWxsKGdldENlbGxCeUNvb3JkcyhzdGF0ZS5zZWxlY3RYLCBzdGF0ZS5zZWxlY3RZKSwgJycpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0VzY2FwZSc6XG5cdFx0XHRcdGNsZWFyQ2xpcGJvYXJkKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFxuXHR9LCBmYWxzZSk7XG5cblx0JHdyYXBwZXIub24oJ2NsaWNrJywgJy5jZWxsJywgZnVuY3Rpb24oZSkge1xuXHRcdGNvbnN0ICRjZWxsID0gJCh0aGlzKTtcblx0XHRpZiAoJGNlbGwuaXMoc3RhdGUuZWRpdGluZ0NlbGwpKSByZXR1cm4gdHJ1ZTtcblx0XHRjb25zdCB4ID0gJGNlbGwuZGF0YSgnaW5kZXgnKTtcblx0XHRjb25zdCB5ID0gJGNlbGwucGFyZW50KCkuZGF0YSgnaW5kZXgnKTtcblx0XHRpZiAoeCA9PT0gc3RhdGUuc2VsZWN0WCAmJiB5ID09PSBzdGF0ZS5zZWxlY3RZKSB7XG5cdFx0XHRlZGl0Q2VsbCgkY2VsbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN0YXRlLnNlbGVjdFggPSAkY2VsbC5kYXRhKCdpbmRleCcpO1xuXHRcdFx0c3RhdGUuc2VsZWN0WSA9ICRjZWxsLnBhcmVudCgpLmRhdGEoJ2luZGV4Jyk7XG5cdFx0XHRtb3ZlU2VsZWN0aW9uKCk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCR3cmFwcGVyLm9uKCdtb3VzZXVwJywgJy5jZWxsJywgZnVuY3Rpb24oZSkge1xuXHRcdGNvbnN0ICRjZWxsID0gJCh0aGlzKTtcblx0XHRpZiAoJGNlbGwuaXMoc3RhdGUuZWRpdGluZ0NlbGwpKSByZXR1cm4gdHJ1ZTtcblx0XHRjb25zdCB4ID0gJGNlbGwuZGF0YSgnaW5kZXgnKTtcblx0XHRjb25zdCB5ID0gJGNlbGwucGFyZW50KCkuZGF0YSgnaW5kZXgnKTtcblx0XHRpZiAoeCA9PT0gc3RhdGUuYXJlYS5zdGFydFggJiYgeSA9PT0gc3RhdGUuYXJlYS5zdGFydFkpIHtcblx0XHRcdHN0YXRlLmFyZWEgPSB7fTtcblx0XHRcdCQoJy5zZWxlY3RpbmcnKS5yZW1vdmVDbGFzcygnc2VsZWN0aW5nJyk7XG5cdFx0fVxuXHRcdHN0YXRlLmFyZWEuc2VsZWN0aW5nID0gZmFsc2U7XG5cdH0pO1xuXG5cdCR3cmFwcGVyLm9uKCdtb3VzZWRvd24nLCAnLmNlbGwnLCBmdW5jdGlvbihlKSB7XG5cdFx0Y29uc3QgJGNlbGwgPSAkKHRoaXMpO1xuXHRcdGlmICgkY2VsbC5pcyhzdGF0ZS5lZGl0aW5nQ2VsbCkpIHJldHVybiB0cnVlO1xuXHRcdGNvbnN0IHggPSAkY2VsbC5kYXRhKCdpbmRleCcpO1xuXHRcdGNvbnN0IHkgPSAkY2VsbC5wYXJlbnQoKS5kYXRhKCdpbmRleCcpO1xuXHRcdHN0YXRlLmFyZWEgPSB7XG5cdFx0XHRzZWxlY3Rpbmc6IHRydWUsXG5cdFx0XHRzdGFydFg6IHgsXG5cdFx0XHRzdGFydFk6IHksXG5cdFx0XHRlbmRYOiB4LFxuXHRcdFx0ZW5kWTogeVxuXHRcdH07XG5cdFx0cGFpbnRBcmVhKCk7XG5cdH0pO1xuXHQkd3JhcHBlci5vbignbW91c2VlbnRlcicsICcuY2VsbCcsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoIXN0YXRlLmFyZWEuc2VsZWN0aW5nKSByZXR1cm4gdHJ1ZTtcblx0XHRjb25zdCAkY2VsbCA9ICQodGhpcyk7XG5cdFx0Y29uc3QgeCA9ICRjZWxsLmRhdGEoJ2luZGV4Jyk7XG5cdFx0Y29uc3QgeSA9ICRjZWxsLnBhcmVudCgpLmRhdGEoJ2luZGV4Jyk7XG5cdFx0c3RhdGUuYXJlYS5lbmRYID0geDtcblx0XHRzdGF0ZS5hcmVhLmVuZFkgPSB5O1xuXHRcdHBhaW50QXJlYSgpO1xuXHR9KTtcblxuXHQkKGRvY3VtZW50KS5vbignY29weScsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoc3RhdGUuZWRpdGluZ0NlbGwgfHwgc3RhdGUuYXJlYS5zZWxlY3RpbmcpIHJldHVybiB0cnVlO1xuXHRcdGlmICh0eXBlb2Ygc3RhdGUuYXJlYS5zdGFydFggIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRzdGF0ZS5jbGlwYm9hcmQgPSBzdGF0ZS5hcmVhO1xuXHRcdFx0c3RhdGUuYXJlYSA9IHtcblx0XHRcdFx0c2VsZWN0aW5nOiBmYWxzZVxuXHRcdFx0fTtcblx0XHRcdCQoJy5pbi1jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnaW4tY2xpcGJvYXJkJyk7XG5cdFx0XHQkKCcuc2VsZWN0aW5nJykuYWRkQ2xhc3MoJ2luLWNsaXBib2FyZCcpLnJlbW92ZUNsYXNzKCdzZWxlY3RpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RhdGUuY2xpcGJvYXJkID0ge1xuXHRcdFx0XHRzdGFydFg6IHN0YXRlLnNlbGVjdFgsXG5cdFx0XHRcdHN0YXJ0WTogc3RhdGUuc2VsZWN0WSxcblx0XHRcdFx0ZW5kWDogc3RhdGUuc2VsZWN0WCxcblx0XHRcdFx0ZW5kWTogc3RhdGUuc2VsZWN0WVxuXHRcdFx0fTtcblx0XHRcdCQoJy5pbi1jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnaW4tY2xpcGJvYXJkJyk7XG5cdFx0XHRjb25zdCAkY29waWVkID0gZ2V0Q2VsbEJ5Q29vcmRzKHN0YXRlLnNlbGVjdFgsIHN0YXRlLnNlbGVjdFkpO1xuXHRcdFx0JGNvcGllZC5hZGRDbGFzcygnaW4tY2xpcGJvYXJkJyk7XG5cdFx0fVxuXHR9KTtcblx0JChkb2N1bWVudCkub24oJ3Bhc3RlJywgZnVuY3Rpb24oZSkge1xuXHRcdGlmIChzdGF0ZS5lZGl0aW5nQ2VsbCB8fCBzdGF0ZS5hcmVhLnNlbGVjdGluZyB8fCAhc3RhdGUuY2xpcGJvYXJkKSByZXR1cm4gdHJ1ZTtcblx0XHRjb25zdCB7c3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFl9ID0gc3RhdGUuY2xpcGJvYXJkO1xuXHRcdGxldCBtaW5YID0gTWF0aC5taW4oc3RhcnRYLCBlbmRYKSxcblx0XHRcdG1heFggPSBNYXRoLm1heChzdGFydFgsIGVuZFgpLFxuXHRcdFx0bWluWSA9IE1hdGgubWluKHN0YXJ0WSwgZW5kWSksXG5cdFx0XHRtYXhZID0gTWF0aC5tYXgoc3RhcnRZLCBlbmRZKTtcblx0XHRjb25zdCBkZWx0YVggPSBtYXhYIC0gbWluWDtcblx0XHRjb25zdCBkZWx0YVkgPSBtYXhZIC0gbWluWTtcblx0XHRcblx0XHRpZiAoc3RhdGUuc2VsZWN0WCArIGRlbHRhWCA+PSBNQVhfWCB8fCBzdGF0ZS5zZWxlY3RZICsgZGVsdGFZID49IE1BWF9ZKSB7XG5cdFx0XHRpZiAoIXdpbmRvdy5jb25maXJtKCdQYXN0ZSBhcmVhIG91dCBvZiBzcHJlYWRzaGVldCBib3VuZHMuIFBhc3RlIHBhcnRpYWxseT8nKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRtYXhYID0gTWF0aC5taW4oTUFYX1ggKyBtaW5YIC0gc3RhdGUuc2VsZWN0WCAtIDEsIG1heFgpO1xuXHRcdFx0bWF4WSA9IE1hdGgubWluKE1BWF9ZICsgbWluWSAtIHN0YXRlLnNlbGVjdFkgLSAxLCBtYXhZKTtcblx0XHR9XG5cdFx0Zm9yIChsZXQgeSA9IG1pblk7IHkgPD0gbWF4WTsgeSsrKSB7XG5cdFx0XHRmb3IgKGxldCB4ID0gbWluWDsgeCA8PSBtYXhYOyB4KyspIHtcblx0XHRcdFx0Zmxvd0RhdGEobW9kZWxbeV1beF0udXNlcklucHV0LCBzdGF0ZS5zZWxlY3RYICsgeCAtIG1pblgsIHN0YXRlLnNlbGVjdFkgKyB5IC0gbWluWSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNsZWFyQ2xpcGJvYXJkKCk7XG5cdFx0cmVmcmVzaEVjaG8oKTtcblx0fSk7XG5cblx0XG5cdCQoJyNzaG93LWxpbmssICNsb2FkLWxpbmssICNjYW5jZWwtbGluaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdCQoJyNzaG93LWxpbmsnKS50b2dnbGUoKTtcblx0XHQkKCcjc2F2ZS1sb2FkLWFyZWEnKS50b2dnbGUoKTtcblx0fSk7XG5cdCQoJyNzaG93LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIganNvblN0ciA9IC8qTFpTdHJpbmcuY29tcHJlc3NUb0Jhc2U2NCgqL0pTT04uc3RyaW5naWZ5KG1vZGVsLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0XHRpZiAoa2V5ID09PSAnZGVwZW5kc09uJyB8fCBrZXkgPT09ICdyZXF1aXJlZEJ5Jykge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldLm1hcChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHt4OiBjZWxsLngsIHk6IGNlbGwueX07XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH0pLyopKi87XG5cdFx0JCgnI3NhdmUtbG9hZC1hcmVhIHRleHRhcmVhJykudmFsKGpzb25TdHIpO1xuXG5cdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtqc29uU3RyXSwge3R5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ30pO1xuXHRcdGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0JCgnI3NhdmUtbGluaycpWzBdLmRvd25sb2FkID0gJ3NwcmVhZHNoZWV0Lmpzb24nO1xuXHRcdCQoJyNzYXZlLWxpbmsnKVswXS5ocmVmID0gdXJsO1xuXHR9KTtcblx0JCgnI2xvYWQtbGluaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdCQoJy5jZWxsLWlucHV0JykuYmx1cigpO1xuXHRcdHN0YXRlLnNlbGVjdFggPSAwO1xuXHRcdHN0YXRlLnNlbGVjdFkgPSAwO1xuXHRcdG1vdmVTZWxlY3Rpb24oKTtcblx0XHRjbGVhckNsaXBib2FyZCgpO1xuXHRcdG1vZGVsID0gSlNPTi5wYXJzZSgvKkxaU3RyaW5nLmRlY29tcHJlc3NGcm9tQmFzZTY0KCovJCgnI3NhdmUtbG9hZC1hcmVhIHRleHRhcmVhJykudmFsKCkvKikqLyk7XG5cdFx0Zm9yIChsZXQgcm93IG9mIG1vZGVsKSB7XG5cdFx0XHRmb3IgKGxldCBjZWxsIG9mIHJvdykge1xuXHRcdFx0XHRjZWxsLmRlcGVuZHNPbiA9IGNlbGwuZGVwZW5kc09uLm1hcChmdW5jdGlvbihkZXApIHtcblx0XHRcdFx0XHRyZXR1cm4gbW9kZWxbZGVwLnldW2RlcC54XTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGNlbGwucmVxdWlyZWRCeSA9IGNlbGwucmVxdWlyZWRCeS5tYXAoZnVuY3Rpb24oZGVwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1vZGVsW2RlcC55XVtkZXAueF07XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRnZXRDZWxsQnlDb29yZHMoY2VsbC54LCBjZWxsLnkpXG5cdFx0XHRcdFx0Lmh0bWwoY2VsbC52YWwpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZWZyZXNoRWNobygpO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZWRpdENlbGwoJGNlbGwsIGluaXRpYWxJbnB1dCkge1xuXHRzdGF0ZS5lZGl0aW5nQ2VsbCA9ICRjZWxsO1xuXHRjb25zdCBpbmRleFggPSAkY2VsbC5kYXRhKCdpbmRleCcpLCBpbmRleFkgPSAkY2VsbC5wYXJlbnQoKS5kYXRhKCdpbmRleCcpO1xuXG5cdCRjZWxsLmNzcygncG9zaXRpb24nLCAncmVsYXRpdmUnKTtcblx0JGNlbGwuaHRtbCgkY2VsbC5odG1sKCkrJzxpbnB1dCBjbGFzcz1cImNlbGwtaW5wdXRcIiAvPicpO1xuXHRjb25zdCAkY2VsbElucHV0ID0gJCgnLmNlbGwtaW5wdXQnKTtcblxuXHQkY2VsbElucHV0Lm9uZSgnYmx1cicsIGxlYXZlQ2VsbCk7XG5cblx0JGNlbGxJbnB1dC5vbigna2V5cHJlc3MnLCBmdW5jdGlvbihlKSB7XG5cdFx0aWYgKCFzdGF0ZS5lZGl0aW5nQ2VsbCkgcmV0dXJuIHRydWU7XG5cblx0XHRjb25zdCB7a2V5fSA9IGU7XG5cdFx0c3dpdGNoIChrZXkpIHtcblx0XHRcdGNhc2UgJ0VudGVyJzpcblx0XHRcdFx0Zmxvd0RhdGEoJGNlbGxJbnB1dC52YWwoKSwgaW5kZXhYLCBpbmRleFkpO1xuXHRcdFx0XHRyZWZyZXNoRWNobygpO1xuXHRcdFx0XHRsZWF2ZUNlbGwuY2FsbCh0aGlzKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0Y2FzZSAnRXNjYXBlJzpcblx0XHRcdFx0bGVhdmVDZWxsLmNhbGwodGhpcyk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fSk7XG5cblx0JGNlbGxJbnB1dC52YWwodHlwZW9mKGluaXRpYWxJbnB1dCkgIT09ICd1bmRlZmluZWQnID8gaW5pdGlhbElucHV0IDogbW9kZWxbaW5kZXhZXVtpbmRleFhdLnVzZXJJbnB1dCk7XG5cdCRjZWxsSW5wdXQuZm9jdXMoKTtcblxuXHRmdW5jdGlvbiBsZWF2ZUNlbGwoKSB7XG5cdFx0JCh0aGlzKS5vZmYoJ2tleXByZXNzJykucmVtb3ZlKCk7XG5cdFx0JGNlbGwuY3NzKCdwb3NpdGlvbicsICcnKTtcblx0XHRzdGF0ZS5lZGl0aW5nQ2VsbCA9IGZhbHNlO1xuXHR9XG59XG5mdW5jdGlvbiBtb3ZlU2VsZWN0aW9uKCkge1xuXHQkKCcuY2VsbC5zZWxlY3RlZCcpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpO1xuXHRjb25zdCAkc2VsZWN0ZWQgPSBnZXRDZWxsQnlDb29yZHMoc3RhdGUuc2VsZWN0WCwgc3RhdGUuc2VsZWN0WSk7XG5cdCRzZWxlY3RlZC5hZGRDbGFzcygnc2VsZWN0ZWQnKTtcblx0cmVmcmVzaEVjaG8oKTtcblx0JHNlbGVjdGVkLmlzT25TY3JlZW4oZnVuY3Rpb24oZGVsdGFzKSB7XG5cdFx0bGV0IG9mZlggPSAwLCBvZmZZID0gMDtcblx0XHRpZiAoZGVsdGFzLnRvcCA8IDEwKSB7XG5cdFx0XHRvZmZZID0gMTAwO1xuXHRcdH0gZWxzZSBpZiAoZGVsdGFzLmJvdHRvbSA8IDEwKSB7XG5cdFx0XHRvZmZZID0gLTEwMDtcblx0XHR9XG5cdFx0aWYgKGRlbHRhcy5sZWZ0IDwgMzApIHtcblx0XHRcdG9mZlggPSAyMDA7XG5cdFx0fSBlbHNlIGlmIChkZWx0YXMucmlnaHQgPCAzMCkge1xuXHRcdFx0b2ZmWCA9IC0yMDA7XG5cdFx0fVxuXHRcdGlmIChvZmZYIHx8IG9mZlkpIHtcblx0XHRcdCQoJyNjb250ZW50JylbMF0uc2Nyb2xsQnkob2ZmWCwgb2ZmWSk7XG5cdFx0fVxuXHR9LCAnI2NvbnRlbnQnKTtcbn1cbmZ1bmN0aW9uIHJlZnJlc2hFY2hvKCkge1xuXHRjb25zdCBjZWxsID0gbW9kZWxbc3RhdGUuc2VsZWN0WV1bc3RhdGUuc2VsZWN0WF07XG5cdCRmb3JtdWxhRWNoby5odG1sKChjZWxsLmZ1bmMgPyAnRnggJyA6ICcnKSArIGNlbGwudXNlcklucHV0KTtcbn1cbmZ1bmN0aW9uIGdldENlbGxCeUNvb3Jkcyh4LCB5KSB7XG5cdHJldHVybiAkd3JhcHBlci5jaGlsZHJlbigpLmVxKHkpLmNoaWxkcmVuKCkuZXEoeCk7XG59XG5mdW5jdGlvbiBmbG93RGF0YSh1c2VySW5wdXQsIHgsIHkpIHtcblx0bGV0IGFmZmVjdGVkID0gW107XG5cdGNvbnN0IGNlbGwgPSBtb2RlbFt5XVt4XTtcblx0Y2VsbC51c2VySW5wdXQgPSB1c2VySW5wdXQ7XG5cdGZvciAobGV0IGRlcCBvZiBjZWxsLmRlcGVuZHNPbikge1xuXHRcdGRlcC5yZXF1aXJlZEJ5ID0gZGVwLnJlcXVpcmVkQnkuZmlsdGVyKGZ1bmN0aW9uKHIpIHtcblx0XHRcdHJldHVybiByICE9PSBjZWxsO1xuXHRcdH0pO1xuXHR9XG5cdHRyeSB7XG5cdFx0aWYgKHVzZXJJbnB1dFswXSA9PT0gJz0nKSB7XG5cdFx0XHRjb25zdCBmdW5jID0gcGFyc2VGb3JtdWxhKHVzZXJJbnB1dC5zbGljZSgxKSk7XG5cdFx0XHRjZWxsLmZ1bmMgPSBmdW5jO1xuXHRcdFx0Y29uc3QgZGVwZW5kc09uID0gZGVkdXBlQXJyKGdldERlcGVuZGVuY2llcyhjZWxsLmZ1bmMpLm1hcChmdW5jdGlvbihjb29yZHMpIHtcblx0XHRcdFx0cmV0dXJuIG1vZGVsW2Nvb3Jkcy55XVtjb29yZHMueF07fSlcblx0XHRcdCk7XG5cdFx0XHRjaGVja0N5Y2xpY1JlZnMoY2VsbCwgZGVwZW5kc09uKTtcblx0XHRcdGNlbGwuZGVwZW5kc09uID0gZGVwZW5kc09uO1xuXHRcdFx0Zm9yIChsZXQgZGVwIG9mIGRlcGVuZHNPbikge1xuXHRcdFx0XHRkZXAucmVxdWlyZWRCeS5wdXNoKGNlbGwpO1xuXHRcdFx0XHRkZXAucmVxdWlyZWRCeSA9IGRlZHVwZUFycihkZXAucmVxdWlyZWRCeSk7XG5cdFx0XHR9XG5cdFx0XHRhZmZlY3RlZCA9IHJlY2FsY3VsYXRlQ2VsbChjZWxsLCBudWxsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2VsbC5mdW5jID0gbnVsbDtcblx0XHRcdGNlbGwuZGVwZW5kc09uID0gW107XG5cdFx0XHRhZmZlY3RlZCA9IHJlY2FsY3VsYXRlQ2VsbChjZWxsLCB1c2VySW5wdXQpO1xuXHRcdH1cblx0XHRhZmZlY3RlZCA9IGRlZHVwZUFycihhZmZlY3RlZCk7XG5cdH0gY2F0Y2goZSkge1xuXHRcdGNlbGwuZnVuYyA9IG51bGw7XG5cdFx0Y2VsbC52YWwgPSBlO1xuXHR9XG5cdGZvciAobGV0IGFmZkNlbGwgb2YgYWZmZWN0ZWQuY29uY2F0KGNlbGwpKSB7XG5cdFx0Z2V0Q2VsbEJ5Q29vcmRzKGFmZkNlbGwueCwgYWZmQ2VsbC55KVxuXHRcdFx0Lmh0bWwoYWZmQ2VsbC52YWwpO1xuXHR9XG59XG5mdW5jdGlvbiByZWNhbGN1bGF0ZUNlbGwoY2VsbCwgbGl0ZXJhbElucHV0KSB7XG5cdGlmIChsaXRlcmFsSW5wdXQgIT09IG51bGwpIHtcblx0XHRjZWxsLnZhbCA9IGxpdGVyYWxJbnB1dDtcblx0fSBlbHNlIHtcblx0XHRjb25zdCB2YWwgPSBldmFsKGJ1aWxkRXZhbEV4cHIoY2VsbC5mdW5jKSk7Ly9UT0RPIGhhbmRsZSBlcnJvcnMgLy8gY2FuIGJlIGNhY2hlZFxuXHRcdGNlbGwudmFsID0gdmFsO1xuXHR9XG5cdGxldCBhZmZlY3RlZCA9IFtdLmNvbmNhdChjZWxsLnJlcXVpcmVkQnkpO1xuXHRmb3IgKGxldCBkZXBlbmRlbnQgb2YgY2VsbC5yZXF1aXJlZEJ5IHx8IFtdKSB7XG5cdFx0YWZmZWN0ZWQgPSBhZmZlY3RlZC5jb25jYXQocmVjYWxjdWxhdGVDZWxsKGRlcGVuZGVudCwgbnVsbCkpO1xuXHR9XG5cdHJldHVybiBhZmZlY3RlZDtcbn1cbmZ1bmN0aW9uIGJ1aWxkRXZhbEV4cHIoZnVuY09iaikge1xuXHRsZXQgcmVzdWx0ID0gJyc7XG5cdHRyeSB7XG5cdFx0Zm9yIChsZXQgcGFydCBvZiBmdW5jT2JqKSB7XG5cdFx0XHRyZXN1bHQgKz0gYnVpbGRFeHByRnJhZ21lbnQocGFydCk7XG5cdFx0fVxuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmVzdWx0ID0gZTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gYnVpbGRFeHByRnJhZ21lbnQob2JqKSB7XG5cdGxldCByZXN1bHQgPSAnJztcblx0c3dpdGNoIChvYmoudHlwZSkge1xuXHRcdGNhc2UgJ3VuYXJ5Jzpcblx0XHRcdHJlc3VsdCArPSBvYmoub3BlciArIGJ1aWxkRXhwckZyYWdtZW50KG9iai52YWwpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb3BlcmF0b3InOlxuXHRcdFx0cmVzdWx0ICs9ICcgJyArIG9iai5vcGVyICsgJyAnO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnbGl0ZXJhbCc6XG5cdFx0XHRyZXN1bHQgKz0gb2JqLnZhbHVlO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAncmVmZXJlbmNlJzpcblx0XHRcdHJlc3VsdCArPSBhc3NlcnRWYWwobW9kZWxbb2JqLnldW29iai54XS52YWwpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJlc3VsdCArPSBidWlsZFN1bUV4cHIob2JqKTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQnKTtcblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gYnVpbGRTdW1FeHByKHN1bU9iaikge1xuXHRsZXQgcmVzdWx0ID0gW107XG5cdGNvbnN0IHsgc3RhcnQ6IHsgeDogc3RhcnRYLCB5OiBzdGFydFl9LCBlbmQ6IHsgeDogZW5kWCwgeTogZW5kWX0gfSA9IHN1bU9iai5yYW5nZTtcblx0Y29uc3QgbWluWCA9IE1hdGgubWluKHN0YXJ0WCwgZW5kWCksXG5cdFx0bWF4WCA9IE1hdGgubWF4KHN0YXJ0WCwgZW5kWCksXG5cdFx0bWluWSA9IE1hdGgubWluKHN0YXJ0WSwgZW5kWSksXG5cdFx0bWF4WSA9IE1hdGgubWF4KHN0YXJ0WSwgZW5kWSk7XG5cdGZvciAobGV0IHkgPSBtaW5ZOyB5IDw9IG1heFk7IHkrKykge1xuXHRcdGZvciAobGV0IHggPSBtaW5YOyB4IDw9IG1heFg7IHgrKykge1xuXHRcdFx0cmVzdWx0LnB1c2goYXNzZXJ0VmFsKG1vZGVsW3ldW3hdLnZhbCkgfHwgMCk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQuam9pbignKycpO1xufVxuZnVuY3Rpb24gYXNzZXJ0VmFsKHZhbCkge1xuXHRpZiAodmFsIGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHR0aHJvdyB2YWw7XG5cdH1cblx0cmV0dXJuIHZhbDtcbn1cbmZ1bmN0aW9uIGNoZWNrQ3ljbGljUmVmcyhjZWxsLCBkZXBzKSB7XG5cdGZvciAobGV0IGRlcGVuZGVuY3kgb2YgZGVwcykge1xuXHRcdGlmIChjZWxsID09PSBkZXBlbmRlbmN5KSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0N5Y2xpYyByZWZlcmVuY2UnKTtcblx0XHR9XG5cdFx0Y2hlY2tDeWNsaWNSZWZzKGNlbGwsIGRlcGVuZGVuY3kuZGVwZW5kc09uKTtcblx0fVxufVxuXG5mdW5jdGlvbiBwYWludEFyZWEoKSB7XG5cdCQoJy5zZWxlY3RpbmcnKS5yZW1vdmVDbGFzcygnc2VsZWN0aW5nJyk7XG5cdGNvbnN0IHtzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWX0gPSBzdGF0ZS5hcmVhO1xuXHRjb25zdCBtaW5YID0gTWF0aC5taW4oc3RhcnRYLCBlbmRYKSxcblx0XHRtYXhYID0gTWF0aC5tYXgoc3RhcnRYLCBlbmRYKSxcblx0XHRtaW5ZID0gTWF0aC5taW4oc3RhcnRZLCBlbmRZKSxcblx0XHRtYXhZID0gTWF0aC5tYXgoc3RhcnRZLCBlbmRZKTtcblx0Zm9yIChsZXQgeSA9IG1pblk7IHkgPD0gbWF4WTsgeSsrKSB7XG5cdFx0Zm9yIChsZXQgeCA9IG1pblg7IHggPD0gbWF4WDsgeCsrKSB7XG5cdFx0XHRnZXRDZWxsQnlDb29yZHMoeCwgeSlcblx0XHRcdFx0LmFkZENsYXNzKCdzZWxlY3RpbmcnKTtcblx0XHR9XG5cdH1cbn1cbmZ1bmN0aW9uIGNsZWFyQ2xpcGJvYXJkKCkge1xuXHQkKCcuc2VsZWN0aW5nJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGluZycpO1x0XG5cdCQoJy5pbi1jbGlwYm9hcmQnKS5yZW1vdmVDbGFzcygnaW4tY2xpcGJvYXJkJyk7XG5cdHN0YXRlLmFyZWEgPSB7XG5cdFx0c2VsZWN0aW5nOiBmYWxzZVxuXHR9O1xuXHRzdGF0ZS5jbGlwYm9hcmQgPSBudWxsO1xufVxuXG5cblxuZXhwb3J0IHtpbml0fTtcbiIsIi8vIEF2b2lkIGBjb25zb2xlYCBlcnJvcnMgaW4gYnJvd3NlcnMgdGhhdCBsYWNrIGEgY29uc29sZS5cbihmdW5jdGlvbigpIHtcbiAgICB2YXIgbWV0aG9kO1xuICAgIHZhciBub29wID0gZnVuY3Rpb24gKCkge307XG4gICAgdmFyIG1ldGhvZHMgPSBbXG4gICAgICAgICdhc3NlcnQnLCAnY2xlYXInLCAnY291bnQnLCAnZGVidWcnLCAnZGlyJywgJ2RpcnhtbCcsICdlcnJvcicsXG4gICAgICAgICdleGNlcHRpb24nLCAnZ3JvdXAnLCAnZ3JvdXBDb2xsYXBzZWQnLCAnZ3JvdXBFbmQnLCAnaW5mbycsICdsb2cnLFxuICAgICAgICAnbWFya1RpbWVsaW5lJywgJ3Byb2ZpbGUnLCAncHJvZmlsZUVuZCcsICd0YWJsZScsICd0aW1lJywgJ3RpbWVFbmQnLFxuICAgICAgICAndGltZWxpbmUnLCAndGltZWxpbmVFbmQnLCAndGltZVN0YW1wJywgJ3RyYWNlJywgJ3dhcm4nXG4gICAgXTtcbiAgICB2YXIgbGVuZ3RoID0gbWV0aG9kcy5sZW5ndGg7XG4gICAgdmFyIGNvbnNvbGUgPSAod2luZG93LmNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7fSk7XG5cbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgbWV0aG9kID0gbWV0aG9kc1tsZW5ndGhdO1xuXG4gICAgICAgIC8vIE9ubHkgc3R1YiB1bmRlZmluZWQgbWV0aG9kcy5cbiAgICAgICAgaWYgKCFjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgICAgIGNvbnNvbGVbbWV0aG9kXSA9IG5vb3A7XG4gICAgICAgIH1cbiAgICB9XG59KCkpO1xuXG4vLyBQbGFjZSBhbnkgalF1ZXJ5L2hlbHBlciBwbHVnaW5zIGluIGhlcmUuXG5cbihmdW5jdGlvbiAoJCkge1xuXG4gIC8qKlxuICAqIFRlc3RzIGlmIGEgbm9kZSBpcyBwb3NpdGlvbmVkIHdpdGhpbiB0aGUgY3VycmVudCB2aWV3cG9ydC5cbiAgKiBJdCBkb2VzIG5vdCB0ZXN0IGFueSBvdGhlciB0eXBlIG9mIFwidmlzaWJpbGl0eVwiLCBsaWtlIGNzcyBkaXNwbGF5LFxuICAqIG9wYWNpdHksIHByZXNlbmNlIGluIHRoZSBkb20sIGV0YyAtIGl0IG9ubHkgY29uc2lkZXJzIHBvc2l0aW9uLlxuICAqIFxuICAqIEJ5IGRlZmF1bHQsIGl0IHRlc3RzIGlmIGF0IGxlYXN0IDEgcGl4ZWwgaXMgc2hvd2luZywgcmVnYXJkbGVzcyBvZlxuICAqIG9yaWVudGF0aW9uIC0gaG93ZXZlciBhbiBvcHRpb25hbCBhcmd1bWVudCBpcyBhY2NlcHRlZCwgYSBjYWxsYmFja1xuICAqIHRoYXQgaXMgcGFzc2VkIHRoZSBudW1iZXIgb2YgcGl4ZWxzIGRpc3RhbnQgYmV0d2VlbiBlYWNoIGVkZ2Ugb2YgdGhlXG4gICAqIG5vZGUgYW5kIHRoZSBjb3JyZXNwb25kaW5nIHZpZXdwb3J0LiAgSWYgdGhlIGNhbGxiYWNrIGFyZ3VtZW50IGlzIHByb3ZpZGVkXG4gICAqIHRoZSByZXR1cm4gdmFsdWUgKHRydWUgb2YgZmFsc2UpIG9mIHRoYXQgY2FsbGJhY2sgaXMgdXNlZCBpbnN0ZWFkLlxuICAqL1xuICAkLmZuLmlzT25TY3JlZW4gPSBmdW5jdGlvbih0ZXN0LCBzZWxlY3Rvcil7XG5cbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5vdXRlckhlaWdodCgpO1xuICAgIHZhciB3aWR0aCA9IHRoaXMub3V0ZXJXaWR0aCgpO1xuXG4gICAgaWYoIXdpZHRoIHx8ICFoZWlnaHQpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICB2YXIgd2luID0gJCh3aW5kb3cpO1xuXG4gICAgdmFyIHZpZXdwb3J0ID0ge1xuICAgICAgdG9wIDogd2luLnNjcm9sbFRvcCgpLFxuICAgICAgbGVmdCA6IHdpbi5zY3JvbGxMZWZ0KClcbiAgICB9O1xuICAgIHZpZXdwb3J0LnJpZ2h0ID0gdmlld3BvcnQubGVmdCArIHdpbi53aWR0aCgpO1xuICAgIHZpZXdwb3J0LmJvdHRvbSA9IHZpZXdwb3J0LnRvcCArIHdpbi5oZWlnaHQoKTtcblxuXHQvLyBUd2Vha1xuXHRpZiAoc2VsZWN0b3IpIHZpZXdwb3J0LnRvcCA9IHZpZXdwb3J0LnRvcCArICQoc2VsZWN0b3IpLm9mZnNldCgpLnRvcDtcblxuICAgIHZhciBib3VuZHMgPSB0aGlzLm9mZnNldCgpO1xuICAgIGJvdW5kcy5yaWdodCA9IGJvdW5kcy5sZWZ0ICsgd2lkdGg7XG4gICAgYm91bmRzLmJvdHRvbSA9IGJvdW5kcy50b3AgKyBoZWlnaHQ7XG4gICAgXG4gICAgdmFyIGRlbHRhcyA9IHtcbiAgICAgIHRvcCA6IHZpZXdwb3J0LmJvdHRvbSAtIGJvdW5kcy50b3AsXG4gICAgICBsZWZ0OiB2aWV3cG9ydC5yaWdodCAtIGJvdW5kcy5sZWZ0LFxuICAgICAgYm90dG9tOiBib3VuZHMuYm90dG9tIC0gdmlld3BvcnQudG9wLFxuICAgICAgcmlnaHQ6IGJvdW5kcy5yaWdodCAtIHZpZXdwb3J0LmxlZnRcbiAgICB9O1xuXG4gICAgaWYodHlwZW9mIHRlc3QgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRlc3QuY2FsbCh0aGlzLCBkZWx0YXMpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gZGVsdGFzLnRvcCA+IDBcbiAgICAgICYmIGRlbHRhcy5sZWZ0ID4gMFxuICAgICAgJiYgZGVsdGFzLnJpZ2h0ID4gMFxuICAgICAgJiYgZGVsdGFzLmJvdHRvbSA+IDA7XG4gIH07XG5cbn0pKGpRdWVyeSk7XG5cblxuLy8gQ29weXJpZ2h0IChjKSAyMDEzIFBpZXJveHkgPHBpZXJveHlAcGllcm94eS5uZXQ+XG4vLyBUaGlzIHdvcmsgaXMgZnJlZS4gWW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdFxuLy8gdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBXVEZQTCwgVmVyc2lvbiAyXG4vLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiBzZWUgTElDRU5TRS50eHQgb3IgaHR0cDovL3d3dy53dGZwbC5uZXQvXG4vL1xuLy8gRm9yIG1vcmUgaW5mb3JtYXRpb24sIHRoZSBob21lIHBhZ2U6XG4vLyBodHRwOi8vcGllcm94eS5uZXQvYmxvZy9wYWdlcy9sei1zdHJpbmcvdGVzdGluZy5odG1sXG4vL1xuLy8gTFotYmFzZWQgY29tcHJlc3Npb24gYWxnb3JpdGhtLCB2ZXJzaW9uIDEuNC40XG52YXIgTFpTdHJpbmcgPSAoZnVuY3Rpb24oKSB7XG5cbi8vIHByaXZhdGUgcHJvcGVydHlcbnZhciBmID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcbnZhciBrZXlTdHJCYXNlNjQgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCI7XG52YXIga2V5U3RyVXJpU2FmZSA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLSRcIjtcbnZhciBiYXNlUmV2ZXJzZURpYyA9IHt9O1xuXG5mdW5jdGlvbiBnZXRCYXNlVmFsdWUoYWxwaGFiZXQsIGNoYXJhY3Rlcikge1xuICBpZiAoIWJhc2VSZXZlcnNlRGljW2FscGhhYmV0XSkge1xuICAgIGJhc2VSZXZlcnNlRGljW2FscGhhYmV0XSA9IHt9O1xuICAgIGZvciAodmFyIGk9MCA7IGk8YWxwaGFiZXQubGVuZ3RoIDsgaSsrKSB7XG4gICAgICBiYXNlUmV2ZXJzZURpY1thbHBoYWJldF1bYWxwaGFiZXQuY2hhckF0KGkpXSA9IGk7XG4gICAgfVxuICB9XG4gIHJldHVybiBiYXNlUmV2ZXJzZURpY1thbHBoYWJldF1bY2hhcmFjdGVyXTtcbn1cblxudmFyIExaU3RyaW5nID0ge1xuICBjb21wcmVzc1RvQmFzZTY0IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHZhciByZXMgPSBMWlN0cmluZy5fY29tcHJlc3MoaW5wdXQsIDYsIGZ1bmN0aW9uKGEpe3JldHVybiBrZXlTdHJCYXNlNjQuY2hhckF0KGEpO30pO1xuICAgIHN3aXRjaCAocmVzLmxlbmd0aCAlIDQpIHsgLy8gVG8gcHJvZHVjZSB2YWxpZCBCYXNlNjRcbiAgICBkZWZhdWx0OiAvLyBXaGVuIGNvdWxkIHRoaXMgaGFwcGVuID9cbiAgICBjYXNlIDAgOiByZXR1cm4gcmVzO1xuICAgIGNhc2UgMSA6IHJldHVybiByZXMrXCI9PT1cIjtcbiAgICBjYXNlIDIgOiByZXR1cm4gcmVzK1wiPT1cIjtcbiAgICBjYXNlIDMgOiByZXR1cm4gcmVzK1wiPVwiO1xuICAgIH1cbiAgfSxcblxuICBkZWNvbXByZXNzRnJvbUJhc2U2NCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoaW5wdXQgPT0gXCJcIikgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9kZWNvbXByZXNzKGlucHV0Lmxlbmd0aCwgMzIsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBnZXRCYXNlVmFsdWUoa2V5U3RyQmFzZTY0LCBpbnB1dC5jaGFyQXQoaW5kZXgpKTsgfSk7XG4gIH0sXG5cbiAgY29tcHJlc3NUb1VURjE2IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHJldHVybiBMWlN0cmluZy5fY29tcHJlc3MoaW5wdXQsIDE1LCBmdW5jdGlvbihhKXtyZXR1cm4gZihhKzMyKTt9KSArIFwiIFwiO1xuICB9LFxuXG4gIGRlY29tcHJlc3NGcm9tVVRGMTY6IGZ1bmN0aW9uIChjb21wcmVzc2VkKSB7XG4gICAgaWYgKGNvbXByZXNzZWQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGNvbXByZXNzZWQgPT0gXCJcIikgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9kZWNvbXByZXNzKGNvbXByZXNzZWQubGVuZ3RoLCAxNjM4NCwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGNvbXByZXNzZWQuY2hhckNvZGVBdChpbmRleCkgLSAzMjsgfSk7XG4gIH0sXG5cbiAgLy9jb21wcmVzcyBpbnRvIHVpbnQ4YXJyYXkgKFVDUy0yIGJpZyBlbmRpYW4gZm9ybWF0KVxuICBjb21wcmVzc1RvVWludDhBcnJheTogZnVuY3Rpb24gKHVuY29tcHJlc3NlZCkge1xuICAgIHZhciBjb21wcmVzc2VkID0gTFpTdHJpbmcuY29tcHJlc3ModW5jb21wcmVzc2VkKTtcbiAgICB2YXIgYnVmPW5ldyBVaW50OEFycmF5KGNvbXByZXNzZWQubGVuZ3RoKjIpOyAvLyAyIGJ5dGVzIHBlciBjaGFyYWN0ZXJcblxuICAgIGZvciAodmFyIGk9MCwgVG90YWxMZW49Y29tcHJlc3NlZC5sZW5ndGg7IGk8VG90YWxMZW47IGkrKykge1xuICAgICAgdmFyIGN1cnJlbnRfdmFsdWUgPSBjb21wcmVzc2VkLmNoYXJDb2RlQXQoaSk7XG4gICAgICBidWZbaSoyXSA9IGN1cnJlbnRfdmFsdWUgPj4+IDg7XG4gICAgICBidWZbaSoyKzFdID0gY3VycmVudF92YWx1ZSAlIDI1NjtcbiAgICB9XG4gICAgcmV0dXJuIGJ1ZjtcbiAgfSxcblxuICAvL2RlY29tcHJlc3MgZnJvbSB1aW50OGFycmF5IChVQ1MtMiBiaWcgZW5kaWFuIGZvcm1hdClcbiAgZGVjb21wcmVzc0Zyb21VaW50OEFycmF5OmZ1bmN0aW9uIChjb21wcmVzc2VkKSB7XG4gICAgaWYgKGNvbXByZXNzZWQ9PT1udWxsIHx8IGNvbXByZXNzZWQ9PT11bmRlZmluZWQpe1xuICAgICAgICByZXR1cm4gTFpTdHJpbmcuZGVjb21wcmVzcyhjb21wcmVzc2VkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYnVmPW5ldyBBcnJheShjb21wcmVzc2VkLmxlbmd0aC8yKTsgLy8gMiBieXRlcyBwZXIgY2hhcmFjdGVyXG4gICAgICAgIGZvciAodmFyIGk9MCwgVG90YWxMZW49YnVmLmxlbmd0aDsgaTxUb3RhbExlbjsgaSsrKSB7XG4gICAgICAgICAgYnVmW2ldPWNvbXByZXNzZWRbaSoyXSoyNTYrY29tcHJlc3NlZFtpKjIrMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGJ1Zi5mb3JFYWNoKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goZihjKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gTFpTdHJpbmcuZGVjb21wcmVzcyhyZXN1bHQuam9pbignJykpO1xuXG4gICAgfVxuXG4gIH0sXG5cblxuICAvL2NvbXByZXNzIGludG8gYSBzdHJpbmcgdGhhdCBpcyBhbHJlYWR5IFVSSSBlbmNvZGVkXG4gIGNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50OiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9jb21wcmVzcyhpbnB1dCwgNiwgZnVuY3Rpb24oYSl7cmV0dXJuIGtleVN0clVyaVNhZmUuY2hhckF0KGEpO30pO1xuICB9LFxuXG4gIC8vZGVjb21wcmVzcyBmcm9tIGFuIG91dHB1dCBvZiBjb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudFxuICBkZWNvbXByZXNzRnJvbUVuY29kZWRVUklDb21wb25lbnQ6ZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChpbnB1dCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICBpbnB1dCA9IGlucHV0LnJlcGxhY2UoLyAvZywgXCIrXCIpO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhpbnB1dC5sZW5ndGgsIDMyLCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gZ2V0QmFzZVZhbHVlKGtleVN0clVyaVNhZmUsIGlucHV0LmNoYXJBdChpbmRleCkpOyB9KTtcbiAgfSxcblxuICBjb21wcmVzczogZnVuY3Rpb24gKHVuY29tcHJlc3NlZCkge1xuICAgIHJldHVybiBMWlN0cmluZy5fY29tcHJlc3ModW5jb21wcmVzc2VkLCAxNiwgZnVuY3Rpb24oYSl7cmV0dXJuIGYoYSk7fSk7XG4gIH0sXG4gIF9jb21wcmVzczogZnVuY3Rpb24gKHVuY29tcHJlc3NlZCwgYml0c1BlckNoYXIsIGdldENoYXJGcm9tSW50KSB7XG4gICAgaWYgKHVuY29tcHJlc3NlZCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICB2YXIgaSwgdmFsdWUsXG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeT0ge30sXG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlPSB7fSxcbiAgICAgICAgY29udGV4dF9jPVwiXCIsXG4gICAgICAgIGNvbnRleHRfd2M9XCJcIixcbiAgICAgICAgY29udGV4dF93PVwiXCIsXG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluPSAyLCAvLyBDb21wZW5zYXRlIGZvciB0aGUgZmlyc3QgZW50cnkgd2hpY2ggc2hvdWxkIG5vdCBjb3VudFxuICAgICAgICBjb250ZXh0X2RpY3RTaXplPSAzLFxuICAgICAgICBjb250ZXh0X251bUJpdHM9IDIsXG4gICAgICAgIGNvbnRleHRfZGF0YT1bXSxcbiAgICAgICAgY29udGV4dF9kYXRhX3ZhbD0wLFxuICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb249MCxcbiAgICAgICAgaWk7XG5cbiAgICBmb3IgKGlpID0gMDsgaWkgPCB1bmNvbXByZXNzZWQubGVuZ3RoOyBpaSArPSAxKSB7XG4gICAgICBjb250ZXh0X2MgPSB1bmNvbXByZXNzZWQuY2hhckF0KGlpKTtcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHRfZGljdGlvbmFyeSxjb250ZXh0X2MpKSB7XG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X2NdID0gY29udGV4dF9kaWN0U2l6ZSsrO1xuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZVtjb250ZXh0X2NdID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgY29udGV4dF93YyA9IGNvbnRleHRfdyArIGNvbnRleHRfYztcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5LGNvbnRleHRfd2MpKSB7XG4gICAgICAgIGNvbnRleHRfdyA9IGNvbnRleHRfd2M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlLGNvbnRleHRfdykpIHtcbiAgICAgICAgICBpZiAoY29udGV4dF93LmNoYXJDb2RlQXQoMCk8MjU2KSB7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKTtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gY29udGV4dF93LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8OCA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSAxO1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCB2YWx1ZTtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PWJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPDE2IDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb250ZXh0X2VubGFyZ2VJbi0tO1xuICAgICAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgICAgICBjb250ZXh0X251bUJpdHMrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVsZXRlIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlW2NvbnRleHRfd107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF93XTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgIH1cblxuXG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIHdjIHRvIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF93Y10gPSBjb250ZXh0X2RpY3RTaXplKys7XG4gICAgICAgIGNvbnRleHRfdyA9IFN0cmluZyhjb250ZXh0X2MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE91dHB1dCB0aGUgY29kZSBmb3Igdy5cbiAgICBpZiAoY29udGV4dF93ICE9PSBcIlwiKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlLGNvbnRleHRfdykpIHtcbiAgICAgICAgaWYgKGNvbnRleHRfdy5jaGFyQ29kZUF0KDApPDI1Nikge1xuICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gY29udGV4dF93LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPDggOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gMTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCB2YWx1ZTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gY29udGV4dF93LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPDE2IDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbi0tO1xuICAgICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgICBjb250ZXh0X251bUJpdHMrKztcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGVbY29udGV4dF93XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfd107XG4gICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgIH1cblxuXG4gICAgICB9XG4gICAgICBjb250ZXh0X2VubGFyZ2VJbi0tO1xuICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICBjb250ZXh0X251bUJpdHMrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNYXJrIHRoZSBlbmQgb2YgdGhlIHN0cmVhbVxuICAgIHZhbHVlID0gMjtcbiAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgIH1cblxuICAgIC8vIEZsdXNoIHRoZSBsYXN0IGNoYXJcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpO1xuICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBlbHNlIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgIH1cbiAgICByZXR1cm4gY29udGV4dF9kYXRhLmpvaW4oJycpO1xuICB9LFxuXG4gIGRlY29tcHJlc3M6IGZ1bmN0aW9uIChjb21wcmVzc2VkKSB7XG4gICAgaWYgKGNvbXByZXNzZWQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGNvbXByZXNzZWQgPT0gXCJcIikgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9kZWNvbXByZXNzKGNvbXByZXNzZWQubGVuZ3RoLCAzMjc2OCwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGNvbXByZXNzZWQuY2hhckNvZGVBdChpbmRleCk7IH0pO1xuICB9LFxuXG4gIF9kZWNvbXByZXNzOiBmdW5jdGlvbiAobGVuZ3RoLCByZXNldFZhbHVlLCBnZXROZXh0VmFsdWUpIHtcbiAgICB2YXIgZGljdGlvbmFyeSA9IFtdLFxuICAgICAgICBuZXh0LFxuICAgICAgICBlbmxhcmdlSW4gPSA0LFxuICAgICAgICBkaWN0U2l6ZSA9IDQsXG4gICAgICAgIG51bUJpdHMgPSAzLFxuICAgICAgICBlbnRyeSA9IFwiXCIsXG4gICAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgICBpLFxuICAgICAgICB3LFxuICAgICAgICBiaXRzLCByZXNiLCBtYXhwb3dlciwgcG93ZXIsXG4gICAgICAgIGMsXG4gICAgICAgIGRhdGEgPSB7dmFsOmdldE5leHRWYWx1ZSgwKSwgcG9zaXRpb246cmVzZXRWYWx1ZSwgaW5kZXg6MX07XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgMzsgaSArPSAxKSB7XG4gICAgICBkaWN0aW9uYXJ5W2ldID0gaTtcbiAgICB9XG5cbiAgICBiaXRzID0gMDtcbiAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsMik7XG4gICAgcG93ZXI9MTtcbiAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICB9XG4gICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgIHBvd2VyIDw8PSAxO1xuICAgIH1cblxuICAgIHN3aXRjaCAobmV4dCA9IGJpdHMpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsOCk7XG4gICAgICAgICAgcG93ZXI9MTtcbiAgICAgICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgYyA9IGYoYml0cyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiwxNik7XG4gICAgICAgICAgcG93ZXI9MTtcbiAgICAgICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgYyA9IGYoYml0cyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gICAgZGljdGlvbmFyeVszXSA9IGM7XG4gICAgdyA9IGM7XG4gICAgcmVzdWx0LnB1c2goYyk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChkYXRhLmluZGV4ID4gbGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgfVxuXG4gICAgICBiaXRzID0gMDtcbiAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMixudW1CaXRzKTtcbiAgICAgIHBvd2VyPTE7XG4gICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICB9XG4gICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoIChjID0gYml0cykge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDgpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkaWN0aW9uYXJ5W2RpY3RTaXplKytdID0gZihiaXRzKTtcbiAgICAgICAgICBjID0gZGljdFNpemUtMTtcbiAgICAgICAgICBlbmxhcmdlSW4tLTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiwxNik7XG4gICAgICAgICAgcG93ZXI9MTtcbiAgICAgICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkaWN0aW9uYXJ5W2RpY3RTaXplKytdID0gZihiaXRzKTtcbiAgICAgICAgICBjID0gZGljdFNpemUtMTtcbiAgICAgICAgICBlbmxhcmdlSW4tLTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHJldHVybiByZXN1bHQuam9pbignJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICBlbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBudW1CaXRzKTtcbiAgICAgICAgbnVtQml0cysrO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGljdGlvbmFyeVtjXSkge1xuICAgICAgICBlbnRyeSA9IGRpY3Rpb25hcnlbY107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoYyA9PT0gZGljdFNpemUpIHtcbiAgICAgICAgICBlbnRyeSA9IHcgKyB3LmNoYXJBdCgwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2goZW50cnkpO1xuXG4gICAgICAvLyBBZGQgdytlbnRyeVswXSB0byB0aGUgZGljdGlvbmFyeS5cbiAgICAgIGRpY3Rpb25hcnlbZGljdFNpemUrK10gPSB3ICsgZW50cnkuY2hhckF0KDApO1xuICAgICAgZW5sYXJnZUluLS07XG5cbiAgICAgIHcgPSBlbnRyeTtcblxuICAgICAgaWYgKGVubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgIGVubGFyZ2VJbiA9IE1hdGgucG93KDIsIG51bUJpdHMpO1xuICAgICAgICBudW1CaXRzKys7XG4gICAgICB9XG5cbiAgICB9XG4gIH1cbn07XG4gIHJldHVybiBMWlN0cmluZztcbn0pKCk7XG5cbmlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgZGVmaW5lKGZ1bmN0aW9uICgpIHsgcmV0dXJuIExaU3RyaW5nOyB9KTtcbn0gZWxzZSBpZiggdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlICE9IG51bGwgKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gTFpTdHJpbmdcbn0gZWxzZSBpZiggdHlwZW9mIGFuZ3VsYXIgIT09ICd1bmRlZmluZWQnICYmIGFuZ3VsYXIgIT0gbnVsbCApIHtcbiAgYW5ndWxhci5tb2R1bGUoJ0xaU3RyaW5nJywgW10pXG4gIC5mYWN0b3J5KCdMWlN0cmluZycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTFpTdHJpbmc7XG4gIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBMWlN0cmluZztcbiIsImZ1bmN0aW9uIGRlZHVwZUFycihhcnIpIHtcblx0aWYgKCFBcnJheS5pc0FycmF5KGFycikpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0FycmF5IGV4cGVjdGVkJyk7XG5cdH1cblx0cmV0dXJuIEFycmF5LmZyb20obmV3IFNldChhcnIpKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVkdXBlQXJyO1xuIl19
