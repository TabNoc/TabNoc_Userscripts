function getStatesVersion(){
	return {Version: "1.2.6", Date: "02.12.2017"};
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
	if (typeof(oldState) != "object") {
		throw new Error("InvalidTypeException: oldState is not an object, instead: " + typeof(oldState));
	}
	if (newState == null) {
		throw new Error("NullPointerExeption: newState not provided");
	}
	if (typeof(newState) != "object") {
		throw new Error("InvalidTypeException: newState is not an object, instead: " + typeof(newState));
	}
	if (changes == null) {
		throw new Error("NullPointerExeption: changes not provided");
	}
	if (typeof(changes) != "object") {
		throw new Error("InvalidTypeException: changes is not an object, instead: " + typeof(changes));
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
	var time = (new Date()).getTime();
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
		requestedStateNr = changes.changeLog.indexOf(requestedStateNr) + changes.removedChangeLogEntries;
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

	if (requestedStateNr < changes.removedChangeLogEntries) {
		throw new Error("OutOfRangeException: requestedStateNr was already deleted");
	}

	var workingState = eval(currentState.toSource());
	for (workingStateNr = currentStateNr - 1; workingStateNr >= requestedStateNr; workingStateNr--) {
		let diffData = changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]];
		if (diffData == null) {
			throw new Error("NullPointerExeption: diffData is null [workingStateNr:" + workingStateNr + "]");
		}
		workingState = jsondiffpatch.unpatch(workingState, changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]]);
	}
	return workingState;
}

function GetVisualDiff(currentState, changes, requestedStateNr, requestAsTime) {
	return jsondiffpatch.formatters.html.format(jsondiffpatch.diff(currentState, GetState(currentState, changes, requestedStateNr, requestAsTime)), currentState);
}

// optional callBack (StorageName, newValue)
function CreateHistoryDialog(data, callBack) {
	try {
		$("#HistoryDialog").remove();
		$("<div />").attr("id", "HistoryDialog").attr("title", "Historie").css("backgroundColor", "#F9F9F9 !important;").appendTo("body");
		
		var i = 0;
		var s = "<div id=\"HistoryDialogTabs\" style=\"margin-bottom: 10px\"><ul>";
		for (var keyName in data) {
			if (keyName.contains("-Version"))
				continue;
			i++;
			s += "<li><a href=\"#HistoryDialogTab-" + i + "\">" + keyName + "</a></li>";
		}
		s += "</ul>";
		
		i = 0;
		var keyname;
		for (keyName in data) {
			if (keyName.contains("-Version"))
				continue;
			i++;
			s += "<div id=\"HistoryDialogTab-" + i + "\" style=\"padding-bottom:7px\">";
			
			s += "<label for=\"HistoryData-" + i + "\">Historien-Elemente</label>";
			s += "<select name=\"HistoryData-" + i + "\" id=\"HistoryDataSelector-" + i + "\"><option historyGroup=\"" + keyName + "\" value=\"" + data[keyName].currentState + "\" selected=\"selected\">Aktuelle Daten</option>";
			for (var timeIndex in data[keyName].changeLog.reverse()) {
				let time = data[keyName].changeLog[timeIndex];
				s += "<option historyGroup=\"" + keyName + "\" value=\"" + time + "\">" + new Date(parseInt(time)).toLocaleString() + "</option>";
			}
			s += "</select>";
			
			s += "<div id=\"HistoryDialogTabResultPanel-" + keyName + "\" style=\"margin: 10px 0px 10px 0px;border: 1px solid #D3D3D3;border-radius: 5px;padding: 8px 0px 8px 0px;\"></div>";
			
			s += "<button id=\"HistoryDataButton-" + keyName + "\" historyGroup=\"" + keyName + "\" >Daten Übernehmen</button>";
			s += "</div>";
		}
		s += "</div>";
		
		$(s).appendTo("#HistoryDialog");
		
		$("#HistoryDialog").dialog({
			close: function (event, ui) {
				$("#HistoryDialog").parentNode().remove();
			},
			width: 1400,
			height: 850,
			top: 65 // nur nötig, da zIndex nicht funktioniert (für den Youtube Header)
		});
		$("#HistoryDialogTabs").tabs();
		// $("#HistoryDialog").dialog("option", "classes.ui-dialog-content", "MyDialogBackgroundColor" );
		
		i = 0;
		for (keyName in data) {
			i++;
			
			$("#HistoryDataSelector-" + i).selectmenu({
				change: returnExec(function (event, data) {
					let group = data.item.element[0].getAttribute("historyGroup");
					document.getElementById("HistoryDialogTabResultPanel-" + group).innerHTML = GetVisualDiff(eval(GetData(group)), eval(GetData("changes"))[group], data.item.value, true);
					$("#HistoryDataButton-" + group).attr("selectedValue", data.item.value);
					console.error($("#HistoryDataButton-" + group));
				})
			});
			
			$("#HistoryDataButton-" + keyName).button().click(function (event, data) {
				console.error(event);
				let group = $(event.target).attr("historyGroup");
				let newValue = GetState(eval(GetData(group)), eval(GetData("changes"))[group], $(event.target).attr("selectedValue"), true);
				if (callBack == null) {
					if (confirm("Sollen die aktuellen Daten mit den ausgewählten alten Daten aus der Historie überschrieben werden?") === true) {
						SetData(group, newValue, true, false);
					}
				} else {
					callBack(group, newValue);
				}
			});
		}
	} catch (exc) {
		console.error(exc);
		alert(exc);
	}
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

function SetData(keyName, value, locked, disableValueHistory) {
	try {
		var oldValue;
		if (disableValueHistory !== true)
			oldValue = eval(GM_getValue(keyName));
		if (oldValue == null) {
			oldValue = ({});
		}

		if (oldValue.toSource() != value) {
			if (locked == true) {
				GM_setValue(keyName, value);
			} else {
				GM_setValueLocked(keyName, value);
			}

			var result;
			if (disableValueHistory !== true) {
				let changes = eval(GM_getValue("changes") || ({}));
				changes[keyName] = changes[keyName] || ({});
				const MaxAmount = 50;

				result = AddState(oldValue, eval(value), changes[keyName], MaxAmount);

				GM_setValue("changes", changes.toSource());
			}
			if (TabNoc.Settings.Debug === true) {
				console.log("SetData(" + keyName + ", " + defaultValue + ", " + locked + ", " + disableValueHistory + ") -> " + result);
			}
		}
	} catch (exc) {
		console.error(exc);
		alert(exc);
	}
}

function GetData(keyName, defaultValue, evalValue) {
	try {
		var data = GM_getValue(keyName);

		if (data == null || data === "") {
			data = defaultValue || null;
		}

		if (TabNoc.Settings.Debug === true) {
			console.log("GetData(" + keyName + ", " + defaultValue + ", " + evalValue + ") -> " + data);
		}

		if (evalValue === true) {
			try {
				data = eval(data);
			} catch (exc) {
				ErrorHandler(exc, "Die Daten von >" + keyName + "< aus der Datenbank konnten nicht ausgewertet werden");
			}
		}
		return data;
	}
	catch (exc) {
		ErrorHandler(exc);
		throw exc;
	}
}
