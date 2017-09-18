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
	var time = (new Date).getTime();
	let appendIndex = "";

	while (changes.changeLog.indexOf(time + appendIndex) != -1) {
		appendIndex = appendIndex == "" ? "-1" : (--appendIndex).toString();
	}
	changes.changeLog.push(time + appendIndex);
	changes.data[time + appendIndex] = jsondiffpatch.diff(oldState, newState);

	while (changes.changeLog.length > maxAmount) {
		delete changes.data[changes.changeLog.splice(0, 1)[0]];
		changes.removedChangeLogEntries++;
	}
	return ({StateTime:time + appendIndex, StateNr:changes.changeLog.length - 1});
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

	currentStateNr = changes.changeLog.length + changes.removedChangeLogEntries;
	if (currentStateNr == requestedStateNr) {
		return currentState;
	}

	if (requestAsTime === true) {
		requestedStateNr = changes.changeLog.indexOf(requestedStateNr);
		if (requestedStateNr == -1) {
			throw new Error("OutOfRangeException: The provided Timestamp requestedStateNr does not exists in changeLog");
		}
	}

	if (currentStateNr < requestedStateNr) {
		throw new Error("OutOfRangeException: requestedStateNr is in the future");
	}
	workingState = eval(currentState.toSource());
	for (workingStateNr = currentStateNr - 1; workingStateNr >= requestedStateNr; workingStateNr--) {
		workingState = jsondiffpatch.unpatch(workingState, changes.data[changes.changeLog[workingStateNr]]);
	}
	return workingState;
}

function test() {
	changes = ({});
	testState = ({Baum:"tree"});
	for (i = 1; i < 30; i++) {
		let oldState = testState.toSource();
		testState[i] = "!";
		testState["State"] = i;
		// console.log("State", i, ":", eval(oldState), ">", currentState);
		if (AddState(eval(oldState), testState, changes, 10000).StateNr != i) {
			new Error("returned StateNr not expected Statenr")
		}
	}
	console.info(changes);
	for (i = 1; i < 30; i++) {
		let result = GetState(testState, changes, i);
		if (result.State != i) {
			console.warn(i, result.State);
			throw new Error("testState wrong");
		}
	}
	return testState;
}

MyTestState = test();
if (GetState(MyTestState, changes, 2).State != 2){
	console.error("test Failed!");
}
else {
	console.info("test passed!")
}
