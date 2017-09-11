let model = [];
const state = {
	editingCell: false,
	selectX: 0,
	selectY: 0,
	area: {
		selecting: false
	},
	clipboard: null
};
const MAX_X = 50, MAX_Y = 50;	// Tweakable
const $wrapper = $('#spreadsheet-wrapper');
const $rowsLabels = $('#rows-labels');
const $columnsLabels = $('#columns-labels');
const $formulaEcho = $('#formula-echo');

init();


//
//	Function definitions
//
function init() {

	let spreadsheetMarkup = '',
		rowsLabelsMarkup = '<div class="row"><div class="cell"> </div></div>',
		columnsLabelsMarkup = '<div class="row">';

	for (let i = 0; i < MAX_Y; i++) {	//rows
		model.push([]);
		spreadsheetMarkup += '<div class="row" data-index="' + i + '">';
		rowsLabelsMarkup += '<div class="row"><div class="cell">' + (i+1) + '</div></div>';
		for (let j = 0; j < MAX_X; j++) {	//columns
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
				let acc = j,
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

	getCellByCoords(state.selectX, state.selectY)
			.addClass('selected');

	document.addEventListener('keypress', function(e) {
		if (state.editingCell) return true;

		const {key} = e;
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
				state.selectX = state.selectX < MAX_X-1 ? state.selectX + 1 : MAX_X-1;
				moveSelection();
				e.preventDefault();
				break;
			case 'ArrowDown':
				state.selectY = state.selectY < MAX_Y-1 ? state.selectY + 1 : MAX_Y-1;
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

	$wrapper.on('click', '.cell', function(e) {
		const $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		const x = $cell.data('index');
		const y = $cell.parent().data('index');
		if (x === state.selectX && y === state.selectY) {
			editCell($cell);
		} else {
			state.selectX = $cell.data('index');
			state.selectY = $cell.parent().data('index');
			moveSelection();
		}
	});


	$wrapper.on('mouseup', '.cell', function(e) {
		const $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		const x = $cell.data('index');
		const y = $cell.parent().data('index');
		if (x === state.area.startX && y === state.area.startY) {
			state.area = {};
			$('.selecting').removeClass('selecting');
		}
		state.area.selecting = false;
	});

	$wrapper.on('mousedown', '.cell', function(e) {
		const $cell = $(this);
		if ($cell.is(state.editingCell)) return true;
		const x = $cell.data('index');
		const y = $cell.parent().data('index');
		state.area = {
			selecting: true,
			startX: x,
			startY: y,
			endX: x,
			endY: y
		};
		paintArea();
	});
	$wrapper.on('mouseenter', '.cell', function(e) {
		if (!state.area.selecting) return true;
		const $cell = $(this);
		const x = $cell.data('index');
		const y = $cell.parent().data('index');
		state.area.endX = x;
		state.area.endY = y;
		paintArea();
	});

	$(document).on('copy', function(e) {
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
			const $copied = getCellByCoords(state.selectX, state.selectY);
			$copied.addClass('in-clipboard');
		}
	});
	$(document).on('paste', function(e) {
		if (state.editingCell || state.area.selecting || !state.clipboard) return true;
		const {startX, startY, endX, endY} = state.clipboard;
		let minX = Math.min(startX, endX),
			maxX = Math.max(startX, endX),
			minY = Math.min(startY, endY),
			maxY = Math.max(startY, endY);console.log('aaa', minX, maxX, state.selectX)
		const deltaX = maxX - minX;
		const deltaY = maxY - minY;
		
		if (state.selectX + deltaX >= MAX_X || state.selectY + deltaY >= MAX_Y) {
			if (!window.confirm('Paste area out of spreadsheet bounds. Paste partially?')) {
				return;
			}
			maxX = Math.min(MAX_X + minX - state.selectX - 1, maxX);
			maxY = Math.min(MAX_Y + minY - state.selectY - 1, maxY);
		}
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				flowData(model[y][x].userInput, state.selectX + x - minX, state.selectY + y - minY);
			}
		}
		clearClipboard();
		refreshEcho();
	});

	
	$('#show-link, #load-link, #cancel-link').on('click', function() {
		$('#show-link').toggle();
		$('#save-load-area').toggle();
	});
	$('#show-link').on('click', function() {
		var jsonStr = /*LZString.compressToBase64(*/JSON.stringify(model, function(key, value) {
			if (key === 'dependsOn' || key === 'requiredBy') {
				return this[key].map(function(cell) {
					return {x: cell.x, y: cell.y};
				});
			}
			return value;
		})/*)*/;
		$('#save-load-area textarea').val(jsonStr);

		const blob = new Blob([jsonStr], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		$('#save-link')[0].download = 'spreadsheet.json';
		$('#save-link')[0].href = url;
	});
	$('#load-link').on('click', function() {
		$('.cell-input').blur();
		state.selectX = 0;
		state.selectY = 0;
		moveSelection();
		clearClipboard();
		model = JSON.parse(/*LZString.decompressFromBase64(*/$('#save-load-area textarea').val()/*)*/);
		for (let row of model) {
			for (let cell of row) {
				cell.dependsOn = cell.dependsOn.map(function(dep) {
					return model[dep.y][dep.x];
				});
				cell.requiredBy = cell.requiredBy.map(function(dep) {
					return model[dep.y][dep.x];
				});
				getCellByCoords(cell.x, cell.y)
					.html(cell.val);
			}
		}
		refreshEcho();
	});
}

function editCell($cell, initialInput) {
	state.editingCell = $cell;
	const indexX = $cell.data('index'), indexY = $cell.parent().data('index');
	console.log(indexX, indexY);

	$cell.css('position', 'relative');
	$cell.html($cell.html()+'<input class="cell-input" />');
	$cellInput = $('.cell-input');

	$cellInput.one('blur', leaveCell);

	$cellInput.on('keypress', function(e) {
		if (!state.editingCell) return true;

		const {key} = e;
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

	$cellInput.val(typeof(initialInput) !== 'undefined' ? initialInput : model[indexY][indexX].userInput);
	$cellInput.focus();

	function leaveCell() {
		$(this).off('keypress').remove();
		$cell.css('position', '');
		state.editingCell = false;
	}
}
function moveSelection() {
	$('.cell.selected').removeClass('selected');
	const $selected = getCellByCoords(state.selectX, state.selectY);
	$selected.addClass('selected');
	refreshEcho();
	$selected.isOnScreen(function(deltas) {
		let offX = 0, offY = 0;
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
	}, '#content')
}
function refreshEcho(x, y) {
	const cell = model[state.selectY][state.selectX]
	$formulaEcho.html((cell.func ? 'Fx ' : '') + cell.userInput);
}
function getCellByCoords(x, y) {
	return $wrapper.children().eq(y).children().eq(x);
}
function flowData(userInput, x, y) {
	let affected = [];
	const cell = model[y][x];
	cell.userInput = userInput;
	for (let dep of cell.dependsOn) {
		dep.requiredBy = dep.requiredBy.filter(function(r) {return r !== cell});
	}
	try {
		if (userInput[0] === '=') {
			const func = parseFormula(userInput.slice(1));
			cell.func = func; // TODO handle errors
			const dependsOn = dedupeArr(getDependencies(cell.func));
			checkCyclicRefs(cell, dependsOn);//TODO handle errors
			cell.dependsOn = dependsOn;
			for (let dep of dependsOn) {
				dep.requiredBy.push(cell);
				dep.requiredBy = dedupeArr(dep.requiredBy);
			}
			affected = recalculateCell(cell, null);
		} else {
			cell.func = null;
			cell.dependsOn = [];
			affected = recalculateCell(cell, userInput);
		}
		affected = dedupeArr(affected);
	} catch(e) {
		cell.func = null;
		cell.val = e;
	}
	for (let affCell of affected.concat(cell)) {
		getCellByCoords(affCell.x, affCell.y)
			.html(affCell.val);
	}
}
function recalculateCell(cell, literalInput) {
	if (literalInput !== null) {
		cell.val = literalInput;
	} else {
		const val = eval(buildEvalExpr(cell.func));//TODO handle errors // can be cached
		cell.val = val;
	}
	let affected = [].concat(cell.requiredBy);
	for (let dependent of cell.requiredBy || []) {
		affected = affected.concat(recalculateCell(dependent, null));
	}
	return affected;
}
function buildEvalExpr(funcObj) {
	let result = '';
	try {
		for (let part of funcObj) {
			result += buildExprFragment(part);
		}
	} catch (e) {
		result = e;
	}
	return result;
}
function buildExprFragment(obj) {
	let result = '';
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
	let result = [];
	const { start: { x: startX, y: startY}, end: { x: endX, y: endY} } = sumObj.range;
	const minX = Math.min(startX, endX),
		maxX = Math.max(startX, endX),
		minY = Math.min(startY, endY),
		maxY = Math.max(startY, endY);
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
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
	for (let dependency of deps) {
		if (cell === dependency) {
			throw new Error('Cyclic reference');
		}
		checkCyclicRefs(cell, dependency.dependsOn);
	}
}

function paintArea() {
	$('.selecting').removeClass('selecting');
	const {startX, startY, endX, endY} = state.area;
	const minX = Math.min(startX, endX),
		maxX = Math.max(startX, endX),
		minY = Math.min(startY, endY),
		maxY = Math.max(startY, endY);
	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			getCellByCoords(x, y)
				.addClass('selecting');
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

function dedupeArr(arr) {
	// TODO possibly get rid of arrays in favor of sets altogether here
	if (!Array.isArray(arr)) {
		throw new Error('Array expected');
	}
	return Array.from(new Set(arr));
}



//
// Everything about parsing user formulas
//
function tokenize(fString) {
	// and remove whitespace
	let str = fString;
	const tokenizer = /^(\s|\+|\-|\*|\/|\(|\)|\d+(?:\.\d+)?|\$[A-Z]+\$[\d]+|SUM|\:)(.*)$/;
	const tokens = [];
	while (str.length > 0) {
		const match = tokenizer.exec(str);
		if (!match) {
			throw new Error('Unexpected symbol at: ' + str);
		}
		const token = match[1];
		str = match[2];
		tokens.push(token);
	}
	return tokens.filter(function(token) {
		return !token.match(/\s/);
	});
}


function parseFormula(fString) {
	const formula = [];
	let tokens = tokenize(fString);
	let expr, oper;
	[expr, tokens] = getExpr(tokens);
	formula.push(expr);
	while (tokens.length > 0) {
		[oper, tokens] = getOper(tokens);
		[expr, tokens] = getExpr(tokens);
		formula.push({type: 'operator', oper}, expr);
	}
	return formula;
}

function getOper(tokens) {
	const oper = tokens.shift();
	if (!['+', '-', '*', '/'].includes(oper)) {
		throw new Error('Operator expected: + , - , * or /');
	}
	return [oper, tokens];
}

function getExpr(tokens) {
	const uOpers = ['+', '-'];
	const SUM = 'SUM';
	// TODO parentheses for expressions sometime?
	let token = tokens.shift();
	let val;
	if (uOpers.includes(token)) {
		[val, tokens] = getVal(tokens);
		return [{ type: 'unary', oper: token, val}, tokens];
	}
	if (token === SUM) {
		token = tokens.shift();
		if (token !== '(') {
			throw new Error('Opening brace expected');
		}
		let range;
		[range, tokens] = getRange(tokens);
		token = tokens.shift();
		if (token !== ')') {
			throw new Error('Closing brace expected');
		}
		return [{ type: 'sum', range}, tokens];
	}
	tokens.unshift(token);
	return getVal(tokens);
}

function getRange(tokens) {
	let start, end;
	[start, tokens] = getRef(tokens);
	const separator = tokens.shift();
	if (separator !== ':') {
		throw new Error('Separator : expected');
	}
	[end, tokens] = getRef(tokens);
	if (start.x !== end.x && start.y !== end.y) {
		throw new Error('Non-linear range is invalid');
	}
	return [{start, end}, tokens];
}

function getVal(tokens) {
	const token = tokens.shift();
	try {
		if (/^\d+(?:\.\d+)?$/.test(token)) {
			return [{type: 'literal', value: +token}, tokens];
		} else {
			tokens.unshift(token);
			return getRef(tokens);
		}
	} catch (e) {
		throw new Error('Literal value or reference expected');		
	}
}

function getRef(tokens) {
	const ref = tokens.shift();
	const regex = /^\$([A-Z]+)\$([\d]+)$/;
	const match = regex.exec(ref);
	if (!match) {
		throw new Error('Reference expected');
	}
	// check validity and translate
	let x = match[1].split('').reduce(function (acc, val) {
		const pos = val.charCodeAt(0) - 'A'.charCodeAt(0);
		return acc*26 + pos;
	}, 0),
		y = match[2] - 1;
	if (x >= MAX_X || y >= MAX_Y) {
		throw new Error('Reference out of bounds');
	}
	return [{type: 'reference', x, y}, tokens];
}


function getDependencies(arr) {
	let result = [];
	for (let part of arr) {
		result = result.concat(getDeps(part));
	}
	return result;
}
function getDeps(obj) {
	if (obj.type === 'reference') {
		return model[obj.y][obj.x];
	}

	let result = [];

	for (let key in obj) {
		let part = obj[key];

		if (!part || typeof(part) !== 'object') {
			continue;
		} else if (Array.isArray(part)) {
			result = result.concat(getDependencies(part));
		} else {
			result = result.concat(getDeps(part));			
		}
	}
	return result;
}
