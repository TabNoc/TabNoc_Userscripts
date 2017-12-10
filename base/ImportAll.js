function getImportAllVersion(){
	return {Version: "1.0.2", Date: "10.12.2017"};
}

/*
	ImportData(responseData, ([{
					Name: "ReadedNewsArray",
					defaultVersion: 0,
					defaultValue: "([])",
					ImportAction: function (dataStorage, currentEntry, importElement) {
						if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
							dataStorage[currentEntry.Name].push(importElement);
						}
					}
				}, {
					Name: "SeenNewsArray",
					defaultVersion: 0,
					defaultValue: "([])",
					ImportAction: function (dataStorage, currentEntry, importElement) {
						if (dataStorage["ReadedNewsArray"].indexOf(importElement) == -1) {
							if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
								dataStorage[currentEntry.Name].push(importElement);
							}
						}
					}
				}
			]));
*/
function ImportData(allData, entriesArray) {
	var entryID = null;
	var entry = null;
	var element = null;
	if (typeof(GetData) != "function")
		throw new Error("GetData is not Implemented but required for ImportData!");
	if (typeof(SetData) != "function")
		throw new Error("SetData is not Implemented but required for ImportData!");
	if (typeof(GM_Lock) != "function")
		throw new Error("GM_Lock is not Implemented but required for ImportData!");
	if (typeof(GM_Unlock) != "function")
		throw new Error("GM_Unlock is not Implemented but required for ImportData!");
	if (typeof(UpdateDataBase) != "function")
		throw new Error("UpdateDataBase is not Implemented but required for ImportData!");

	try {
		if (typeof(allData) == "object") {
			element = allData;
			for (entryID in entriesArray) {
				entry = entriesArray[entryID];
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

			var errorList = ([]);

			for (entryID in entriesArray) {
				entry = entriesArray[entryID];
				if (element[entry.Name + "-Version"] !== GetData(entry.Name + "-Version")) {
					errorList.push("Die Version der Datenbanktabelle " + entry.Name + " passt nicht (importierte Version: " + element[entry.Name + "-Version"] + ", lokale Version: " + GetData(entry.Name + "-Version") + ")");
				}
			}

			if (errorList.length !== 0) {
				var msg = "Das Importieren kann nicht durchgeführt werden, da:\r\n";
				for (var i in errorList) {
					msg = msg + "\r\n\t- " + errorList[i];
				}
				alert(msg);
				throw new Error("ImportData impossible!");
			}

			if (confirm("Sollen die Daten mit den Aktuellen Daten zusammengeführt werden?") !== true) {
				throw new Error("Das Importieren der Daten wurde durch den Benutzer abgebrochen");
			}

			for (entryID in entriesArray) {
				entry = entriesArray[entryID];
				element[entry.Name] = eval(element[entry.Name]);
			}
		} else if (allData === true) {
			element = eval(prompt("Bitte die exportierten Daten eintragen"));
		} else {
			element = ({});
			for (entryID in entriesArray) {
				entry = entriesArray[entryID];
				element[entry.Name] = eval(prompt("Please insert new " + entry.Name + " Data"));
			}
		}

		GM_Lock();
		for (entryID in entriesArray) {
			entry = entriesArray[entryID];
			if (typeof(element[entry.Name]) != "object") {
				throw new Error("element." + element[entry.Name] + " is not an Object, Import impossible!");
			}
		}

		element.currentData = ({});
		element.count = ({});

		for (entryID in entriesArray) {
			entry = entriesArray[entryID];
			element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
			element.currentData[entry.Name + "Count"] = 0;
		}

		var newDataStorage = ({});

		for (entryID in entriesArray) {
			entry = entriesArray[entryID];
			element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
			element.count[entry.Name] = 0;
			newDataStorage[entry.Name] = eval(entry.defaultValue);
		}

		for (entryID in entriesArray) {
			entry = entriesArray[entryID];
			if (TabNoc.Settings.Debug) {
				console.info("Importing stored " + entry.Name);
			}
			for (var i in element.currentData[entry.Name]) {
				entry.ImportAction(newDataStorage, entry, element.currentData[entry.Name][i]);
				element.count[entry.Name]++;
			}
			if (TabNoc.Settings.Debug) {
				console.info("Importing new " + entry.Name);
				console.info(element[entry.Name]);
			}
			for (var i in element[entry.Name]) {
				entry.ImportAction(newDataStorage, entry, element[entry.Name][i]);
				element.count[entry.Name]++;
			}
		}

		var changes = false;
		var msg = "Das Importieren wurde erfolgreich abgeschlossen!\r\n";
		for (entryID in entriesArray) {
			entry = entriesArray[entryID];
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
				for (entryID in entriesArray) {
					entry = entriesArray[entryID];
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
