//TODO: begrenzung der Anzahl an States
//TODO: requestState non numeric

function AddState(oldState, newState, changes) {
	maxAmount = 10
	if (oldState == null) {
		throw new Error("oldState not provided");
	}
	if (newState == null) {
		throw new Error("newState not provided");
	}
	if (changes == null) {
		throw new Error("changes not provided");
	}
	if (changes.firstItem == null) {
		changes.firstItem = 0;
	}
	if (changes.data == null) {
		changes.data = ([]);
	}
	changes.lastItem = changes.data.push(jsondiffpatch.diff(oldState, newState));
	changes.firstItem = Math.abs(changes.firstItem - changes.lastItem) > maxAmount ? changes.lastItem - maxAmount : changes.firstItem;
	
	changes.data.splice(0, changes.firstItem - 1);
}

function GetState(currentState, changes, requestedStateNr) {
	if (currentState == null) {
		throw new Error("currentState not provided");
	}
	if (changes == null) {
		throw new Error("changes not provided");
	}
	if (requestedStateNr == null) {
		throw new Error("requestedStateNr not provided");
	}
	currentStateNr = changes.length;
	if (currentStateNr == requestedStateNr) {
		return currentState;
	}
	if (currentStateNr < requestedStateNr) {
		throw new Error("");
	}
	workingState = eval(currentState.toSource());
	for (workingStateNr = currentStateNr - 1; workingStateNr >= requestedStateNr; workingStateNr--) {
		workingState = jsondiffpatch.unpatch(workingState, changes.data[workingStateNr]);
	}
	return workingState;
}

function test() {
	changes = ({data:[]});
	currentState = ({Baum:"tree"});
	oldState = currentState.toSource();
	for (i = 1; i < 1000; i++) {
		oldState = currentState.toSource();
		currentState[Math.random()] = Math.random();
		currentState["State"] = i;
		AddState(eval(oldState), currentState, changes);
	}
	// console.info(changes);
	// currentState = i;
	// for (i = 1; i < 999; i++) {
		// result = GetState(currentState, changes, i);
		// if (result.State != i) {
			// throw new Error("testState wrong");
		// }
	// }
	return currentState;
}

testState = test();
