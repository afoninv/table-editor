import {MAX_X, MAX_Y} from './constants';

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
		return {x: obj.x, y: obj.y};
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

export {parseFormula, getDependencies};
