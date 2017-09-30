function getStatesVersion(){
	return {Version: "1.0.2", Date: "30.09.2017"};
}

/*
	changes = {
		@changeLog : Array : containing ordered Timestamps
		@data : Object : Indexes: Timestamps from @changeLog, Values: diff Data
		@removedChangeLogEntries : Integer : Count of already deleted States
		@currentState : Integer : Current State of the changesObject
	}
*/

// @maxAmount: Anzahl an States
function AddState(oldState, newState, changes, maxAmount = 10) {
	if (oldState == null) {
		throw new Error("NullPointerExeption: oldState not provided");
	}
	if (newState == null) {
		throw new Error("NullPointerExeption: newState not provided");
	}
	if (changes == null) {
		throw new Error("NullPointerExeption: changes not provided");
	}
	if (maxAmount == null) {
		maxAmount = 10;
	}
	if (maxAmount < 2) {
		throw new Error("OutOfRangeException: maxAmount must be greater than 1");
	}
	if (changes.changeLog == null) {
		changes.changeLog = ([]);
	}
	if (changes.data == null) {
		changes.data = ({});
	}
	if (changes.removedChangeLogEntries == null) {
		changes.removedChangeLogEntries = 0;
	}
	var time = (new Date).getTime();
	let appendIndex = "";

	while (changes.changeLog.indexOf(time + appendIndex) != -1) {
		appendIndex = appendIndex == "" ? "-1" : (--appendIndex).toString();
	}
	changes.changeLog.push(time + appendIndex);
	changes.data[time + appendIndex] = jsondiffpatch.diff(oldState, newState);

	changes.currentState = changes.changeLog.length + changes.removedChangeLogEntries;
	while (changes.changeLog.length > maxAmount) {
		delete changes.data[changes.changeLog.splice(0, 1)[0]];
		changes.removedChangeLogEntries = changes.removedChangeLogEntries + 1;
	}
	return ({StateTime:time + appendIndex, StateNr:changes.currentState});
}

function GetState(currentState, changes, requestedStateNr, requestAsTime) {
	if (currentState == null) {
		throw new Error("NullPointerExeption: currentState not provided");
	}
	if (changes == null) {
		throw new Error("NullPointerExeption: changes not provided");
	}
	if (requestedStateNr == null) {
		throw new Error("NullPointerExeption: requestedStateNr not provided");
	}
	if (requestedStateNr < 0) {
		throw new Error("OutOfRangeException: requestedStateNr is less than 0");
	}

	var currentStateNr = changes.currentState;

	if (requestAsTime === true) {
		requestedStateNr = changes.changeLog.indexOf(requestedStateNr);
		if (requestedStateNr == -1) {
			throw new Error("OutOfRangeException: The provided Timestamp requestedStateNr does not exists in changeLog");
		}
	}

	if (currentStateNr == requestedStateNr) {
		return currentState;
	}

	if (currentStateNr < requestedStateNr) {
		throw new Error("OutOfRangeException: requestedStateNr is in the future");
	}

	if (requestedStateNr <  changes.removedChangeLogEntries) {
		throw new Error("OutOfRangeException: requestedStateNr was already deleted");
	}

	var workingState = eval(currentState.toSource());
	for (workingStateNr = currentStateNr - 1; workingStateNr >= requestedStateNr; workingStateNr--) {
		let diffData = changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]];
		if (diffData == null) {
			throw new Error("NullPointerExeption: diffData is null [workingStateNr:" + workingStateNr + "]")
		}
		workingState = jsondiffpatch.unpatch(workingState, changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]]);
	}
	return workingState;
}

function testTabNocStates() {
	let changes = ({});
	let testState = ({Baum:"tree"});
	let testCount = 30;
	for (i = 1; i <= testCount; i++) {
		let oldState = testState.toSource();
		testState[i] = "!";
		testState["State"] = i;
		// console.log("State", i, ":", eval(oldState), ">", currentState);
		if (AddState(eval(oldState), testState, changes, testCount - 2).StateNr != i) {
			console.error("States.js.testTabNocStates(): Test 1 failed!\r\nAddState, returned StateNr not expected Statenr");
			alert("States.js.testTabNocStates(): Test 1 failed!\r\nAddState, returned StateNr not expected Statenr");
		}
	}
	try {
		GetState(testState, changes, 0);
		GetState(testState, changes, 1);
		console.error("States.js.testTabNocStates(): Test 2 failed!");
		alert("States.js.testTabNocStates(): Test 2 failed!");
	}
	catch (e) {}
	for (i = 2; i <= testCount; i++) {
		let result = GetState(testState, changes, i);
		if (result.State != i) {
			console.warn(i, result);
			console.error("States.js.testTabNocStates(): Test 3 failed!");
			alert("States.js.testTabNocStates(): Test 3 failed!");
		}
		if (Object.keys(result).length != i + 2) {
			console.warn(i, result);
			console.error("States.js.testTabNocStates(): Test 4 failed!");
			alert("States.js.testTabNocStates(): Test 4 failed!");
		}
	}
	return testState;
}
