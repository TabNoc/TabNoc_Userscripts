function getImportAllVersion(){
	return {Version: "1.1.2", Date: "03.07.2018"};
}

/*
ImportData(responseData, ([{
		Name: "Array",
		defaultVersion: 0,
		defaultValue: "([])",
		ImportAction: function (dataStorage, currentEntry, importElement, elementId) {
			if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
				dataStorage[currentEntry.Name].push(importElement);
			}
		}
	}, {
		Name: "Object",
		defaultVersion: 0,
		defaultValue: "({})",
		ImportAction: function (dataStorage, currentEntry, importElement, elementId) {
			dataStorage[currentEntry.Name][elementId] = importElement;
		}
	}
]));
*/

function ImportData(allData, entriesArray) {
	let element = null;
	if (typeof(GetData) != "function") {
		throw new Error("GetData is not Implemented but required for ImportData!");
	}
	if (typeof(SetData) != "function") {
		throw new Error("SetData is not Implemented but required for ImportData!");
	}
	if (typeof(GM_Lock) != "function") {
		throw new Error("GM_Lock is not Implemented but required for ImportData!");
	}
	if (typeof(GM_Unlock) != "function") {
		throw new Error("GM_Unlock is not Implemented but required for ImportData!");
	}
	if (typeof(UpdateDataBase) != "function") {
		throw new Error("UpdateDataBase is not Implemented but required for ImportData!");
	}

	try {
		if (typeof(allData) == "object" && allData !== null) {
			element = allData;
		} else if (allData === true) {
			element = eval(prompt("Bitte die exportierten Daten eintragen"));
		} else {
			element = ({});
			for (let entryID in entriesArray) {
				let entry = entriesArray[entryID];
				element[entry.Name] = eval(prompt("Please insert new " + entry.Name + " Data"));
			}
		}

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			element[entry.Name + "-Version"] = element[entry.Name + "-Version"] || entry.defaultVersion;
		}

		UpdateDataBase(({
			lock: (function () {}),
			unlock: (function () {}),
			getValue: (function (key) {
				return element[key];
			}),
			setValue: (function (key, value) {
				element[key] = value;
			})
		}), true);

		let errorList = ([]);

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			if (element[entry.Name + "-Version"] !== GetData(entry.Name + "-Version")) {
				errorList.push("Die Version der Datenbanktabelle " + entry.Name + " passt nicht (importierte Version: " + element[entry.Name + "-Version"] + ", lokale Version: " + GetData(entry.Name + "-Version") + ")");
			}
		}

		if (errorList.length !== 0) {
			let msg = "Das Importieren kann nicht durchgeführt werden, da:\r\n";
			for (let i in errorList) {
				msg = msg + "\r\n\t- " + errorList[i];
			}
			alert(msg);
			throw new Error("ImportData impossible!");
		}

		if (confirm("Sollen die Daten mit den Aktuellen Daten zusammengeführt werden?") !== true) {
			throw new Error("Das Importieren der Daten wurde durch den Benutzer abgebrochen");
		}

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			element[entry.Name] = eval(element[entry.Name]);
		}

		GM_Lock();
		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			if (element[entry.Name] == undefined) {
				element[entry.Name] = eval(entry.defaultValue);
			}
			if (typeof(element[entry.Name]) != "object") {
				throw new Error("element." + entry.Name + "(Value: " + element[entry.Name] + ") is not an Object, Import impossible!");
			}
		}

		element.currentData = ({});
		element.count = ({});

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
			element.currentData[entry.Name + "Count"] = 0;
		}

		let newDataStorage = ({});

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
			element.count[entry.Name] = 0;
			newDataStorage[entry.Name] = eval(entry.defaultValue);
		}

		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			if (TabNoc.Settings.Debug) {
				console.info("Importing stored " + entry.Name);
			}
			for (let i in element.currentData[entry.Name]) {
				entry.ImportAction(newDataStorage, entry, element.currentData[entry.Name][i], i);
				element.count[entry.Name]++;
			}
			if (TabNoc.Settings.Debug) {
				console.info("Importing new " + entry.Name);
				console.info(element[entry.Name]);
			}
			for (let i in element[entry.Name]) {
				entry.ImportAction(newDataStorage, entry, element[entry.Name][i], i);
				element.count[entry.Name]++;
			}
		}

		let changes = false;
		let msg = "Das Importieren wurde erfolgreich abgeschlossen!\r\n";
		for (let entryID in entriesArray) {
			let entry = entriesArray[entryID];
			msg += entry.Name + ":\r\n";
			msg += "\tEs wurden " + element.count[entry.Name] + " Elemente aktualisiert (";
			msg += "gespeicherte Datenmenge: " + element.currentData[entry.Name].toSource().length + "B (" + Object.keys(element.currentData[entry.Name]).length + ") | ";
			msg += "importierte Datenmenge: " + element[entry.Name].toSource().length + "B (" + Object.keys(element[entry.Name]).length + ") | ";
			msg += "neue Datenmenge: " + newDataStorage[entry.Name].toSource().length + "B) (" + Object.keys(newDataStorage[entry.Name]).length + ")\r\n";
			msg += "Delta:\r\n";
			if (newDataStorage[entry.Name].toSource() != element.currentData[entry.Name].toSource()) {
				changes = true;
			}
		}

		alert(msg);

		if (changes == false) {
			alert("Es wurde keine Änderung der Daten durch das Importieren durchgeführt\r\n\t\tSpeichern nicht erforderlich");
		} else {
			if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
				for (let entryID in entriesArray) {
					let entry = entriesArray[entryID];
					SetData(entry.Name, newDataStorage[entry.Name].toSource());
				}
			}
		}
	} catch (exc) {
		console.error(exc);
		alert("Das Importieren ist fehlgeschlagen!\r\n" + exc);
		throw (exc);
	}
	finally {
		GM_Unlock();
	}
}


/*
let TableUpdateObject = {
	"ReadedNewsArray": {
		"CheckInit": function (functions, silent) {
			// code
			// return true || false;
		},
		"InitTable": function (functions, silent) {
			//code
		},
		1: function (functions, silent) {
			let returnStats = {
				ChangeCount: 0,
				OldSize: 0,
				NewSize: 0
			};
			// code
			return {
				Result: true,
				Stats: returnStats,
				Save: function () {}
			};
		}
	}
};
*/

function UpdateDatabaseTable(ExpectedVersionNumber, CurrentVersionNumber, TableName, TableUpdateObject, functions, silent) {
	if (ExpectedVersionNumber == null) {
		throw ("ArgumentNullException (ExpectedVersionNumber):\r\nDer Parameter ExpectedVersionNumber ist null");
	}
	if (typeof(ExpectedVersionNumber) != "number") {
		throw ("ArgumentException (ExpectedVersionNumber):\r\nDer Parameter ExpectedVersionNumber hat das falsche Format, erwartet: number");
	}

	if (CurrentVersionNumber == null) {
		throw ("ArgumentNullException (CurrentVersionNumber):\r\nDer Parameter CurrentVersionNumber ist null");
	}
	if (typeof(CurrentVersionNumber) != "number") {
		throw ("ArgumentException (CurrentVersionNumber):\r\nDer Parameter CurrentVersionNumber hat das falsche Format, erwartet: number");
	}

	if (TableName == null) {
		throw ("ArgumentNullException (TableName):\r\nDer Parameter TableName ist null");
	}
	if (typeof(TableName) != "string") {
		throw ("ArgumentException (TableName):\r\nDer Parameter TableName hat das falsche Format, erwartet: string");
	}

	if (TableUpdateObject == null) {
		throw ("ArgumentNullException (TableUpdateObject):\r\nDer Parameter TableUpdateObject ist null");
	}
	if (typeof(TableUpdateObject) != "object") {
		throw ("ArgumentException (TableUpdateObject):\r\nDer Parameter TableUpdateObject hat das falsche Format, erwartet: object");
	}

	if (functions == null) {
		throw ("ArgumentNullException (functions):\r\nDer Parameter functions ist null");
	}
	if (typeof(functions) != "object") {
		throw ("ArgumentException (functions):\r\nDer Parameter functions hat das falsche Format, erwartet: object");
	}

	if (silent == null) {
		throw ("ArgumentNullException (silent):\r\nDer Parameter silent ist null");
	}
	if (typeof(silent) != "boolean") {
		throw ("ArgumentException (silent):\r\nDer Parameter silent hat das falsche Format, erwartet: boolean");
	}

	if (CurrentVersionNumber != ExpectedVersionNumber) {
		functions.lock();
		while (CurrentVersionNumber != ExpectedVersionNumber) {
			let updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle " + TableName + " gefunden (aktuell: " + CurrentVersionNumber + " | erwartet: " + ExpectedVersionNumber + ")";
			console.info(updateMsg);
			if (TableUpdateObject[TableName].CheckInit(functions, silent) === false) {
				alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");
				if (TableUpdateObject[TableName][CurrentVersionNumber] == null) {
					throw ("NoUpdateImplemeneted:\r\nFür die Version " + CurrentVersionNumber + " der Tabelle " + TableName + " wurde kein Update definiert!");
				}
				let UpdateResult = TableUpdateObject[TableName][CurrentVersionNumber]();

				if (UpdateResult.Result === true) {
					alert("Der Updatevorgang von Tabelle " + TableName + " war erfolgreich\r\n\r\nEs wurden " + UpdateResult.Stats.ChangeCount + " Elemente aktualisiert (alte Datenmenge: " + UpdateResult.Stats.OldSize + "B | neue Datenmenge: " + UpdateResult.Stats.NewSize + "B)");
					if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
						UpdateResult.Save(functions, silent);
						functions.setValue(TableName + "-Version", UpdateResult.NewVersionNumber);
						CurrentVersionNumber = UpdateResult.NewVersionNumber;
						console.log("Die Version der Tabelle " + TableName + " wurde auf " + functions.getValue(TableName + "-Version") + " geändert");
					}
					else {
						throw ("UserAbort:\r\nDer Update-Vorgang für Version " + CurrentVersionNumber + " der Tabelle " + TableName + " wurde durch den Benutzer abgebrochen!");
					}
				}
				else {
					console.error(UpdateResult);
					throw ("Der Updatevorgang von Tabelle " + TableName + " ist fehlgeschlagen!\r\nUpdateResult.Result !== true");
				}
			}
			else {
				TableUpdateObject[TableName].InitTable(functions, silent);
				functions.setValue(TableName + "-Version", ExpectedVersionNumber);
				CurrentVersionNumber = ExpectedVersionNumber;
				let updateMsg = "Die Datenbank-Tabelle " + TableName + " wurde initialisiert (Version: " + functions.getValue(TableName + "-Version") + ")";
				console.log(updateMsg);
			}
		}
		functions.unlock();
		return true;
	}
	return false;
}
