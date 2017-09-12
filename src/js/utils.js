function dedupeArr(arr) {
	if (!Array.isArray(arr)) {
		throw new Error('Array expected');
	}
	return Array.from(new Set(arr));
}

export default dedupeArr;
