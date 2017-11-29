// ==UserScript==
// @name        MarkGolemPages
// @namespace   TabNoc
// @include     http*://www.golem.de/*
// @version     1.3.0_27112017__beta5_
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/TabNoc.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/public/build/jsondiffpatch.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/States.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/jquery_ui/jquery-ui.min.js
// @require     https://gist.githubusercontent.com/TheDistantSea/8021359/raw/89d9c3250fd049deb23541b13faaa15239bd9d05/version_compare.js
// @resource	JqueryUI https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/jquery_ui/jquery-ui.min.css
// @resource	MyCss https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/Golem/MarkGolemPages.css
// updateURL   https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Golem/MarkGolemPages.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_listValues
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @noframes
// ==/UserScript==

/*
ChangeList started at 12.12.2016

12.12.2016 - 1.0.0
Start Writing Script

27.04.2017 - 1.1.0
	- changed a bunch

28.04.2017 - 1.1.1
	- optical Improvements

08.05.2017 - 1.2.0
	- rewritten Styling, Script now uses own css file instead of node styles
	- further optical Improvements

10.05.2017 - 1.2.1
	- added @updateURL
	- fixed wrong TabNoc.js file being loaded

21.08.2017 - 1.2.2
	- fixed: very short Message Display Time after Marking
	- changed: Marking Button will only be displayed, if Element isn't marked

19.09.2017 - 1.2.3
	- added: jsondiffpatch
	- added: SetData
	- changed: SetData now uses Diff to provide multiple States
	
30.09.2017 - 1.2.4
	- added: CreateHistoryDialog
	- added: Version checking from Imports
*/

try {
	if (String.prototype.contains == null) {String.prototype.contains = String.prototype.includes;}

	setTabNoc({
		Variables: {
			startTime: new Date(),
			checkElementsInterval: null,
			Interval: null,
			MarkToggleState: true,
			lastCheckItemCount: 0,
			lastCheckScanBufferAmount: 0,
			Active: true,

			lastCheckRNewsAmount : 0,
			lastCheckSNewsAmount : 0
		},

		Settings: {
			SavingEnabled: true,
			MarkAfterScan: true,
			HideAlreadyWatchedNews : false,

			Personal: {
				ScanUninterestingTweet: false,
				HideUninterestingTweets: false,
				UninterestingTweetsText: [],
				TimerInterval: 1000
			}
		},

		HTML: {
			ScanButton: '<div class="MyScanButton"><div></div></div>'
		}
	});

	// ### http*://www.golem.de ###
	function StartPageLoader() {
		console.log("MarkGolemPages.user.js loading");
		try {
			registerTabNoc();

			var ScanButton = $(TabNoc.HTML.ScanButton);
			ScanButton.click(function(){getAllElements();$("#grandwrapper>.MyScanButton").remove();});
			$("#grandwrapper").append(ScanButton);

			$("#index-vica2").remove();

			$(".list-articles>li").detach().appendTo($(".list-articles").first());

			$(".iqadlinetop>div").css("border-color", "transparent");


			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.Personal.TimerInterval);
			console.log("MarkGolemPages.user.js executed");

			console.log("MarkGolemPages.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function registerTabNoc() {
		// Scannen
		exportFunction(getAllElements, unsafeWindow, {
			defineAs: "getAllElements"
		});
						
		GM_registerMenuCommand("Einlesen", returnExec(getAllElements));
		
		GM_registerMenuCommand("CreateHistoryDialog", function() {CreateHistoryDialog(eval(GM_getValue("changes")));});

		GM_registerMenuCommand("ManuelleSyncronisation", returnExec(Syncronisieren));
	}

	/**
	 * [startCheckElements description]
	 * @param  {bool} ToggleState Overwirtes ToggleState
	 * @param  {bool} force       foreces Execution when true
	 * @return {void}             
	 */
	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### ReadedNewsArray ###
			var ReadedNewsArray = eval(GM_getValue("ReadedNewsArray") || "([])");
			// ### SeenNewsArray ###
			var SeenNewsArray = eval(GM_getValue("SeenNewsArray") || "([])");

			var elements = $("#index-promo, .list-articles>li");
			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length ||
					TabNoc.Variables.lastCheckRNewsAmount !== ReadedNewsArray.length ||
					TabNoc.Variables.lastCheckSNewsAmount !== SeenNewsArray.length) {
				execTime(checkElements, ReadedNewsArray.reverse(), elements, ToggleState, SeenNewsArray.reverse());

				TabNoc.Variables.lastCheckRNewsAmount = ReadedNewsArray.length;
				TabNoc.Variables.lastCheckSNewsAmount = SeenNewsArray.length;
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(ReadedNewsArray, elements, ToggleState, SeenNewsArray) {
		var UnScannedElements = 0;
		Feedback.showProgress(0, "Initialised Scan");

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}

		for (i = 0; i < elements.length; i++) {
			Feedback.showProgress(i / elements.length * 100, "Analysing Element " + i + " from " + elements.length);
			var element = elements[i];

			if ($(element).children("a").length === 1 && ($(element).children("a")[0].getAttribute("id").includes("hpalt") ||
														  $(element).children("a")[0].getAttribute("id").includes("bigalt"))) {
				UnScannedElements = checkElement(element, ReadedNewsArray, ToggleState, SeenNewsArray) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(element);
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		Feedback.showProgress(100, "Finished " + (elements.length - UnScannedElements) + " elements marked");
		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + ReadedNewsArray.length + " Newspages listed)");

		if (TabNoc.Settings.HideAlreadyWatchedNews === false) {
			Feedback.notify(UnScannedElements + " UnMarked Elements", 10000, function(){TabNoc.Settings.HideAlreadyWatchedNews = !TabNoc.Settings.HideAlreadyWatchedNews; startCheckElements(true, true);Feedback.hideMessage();});
		}
	}

	function checkElement(checkElement, ReadedNewsArray, ToggleState, SeenNewsArray) {
		//return true if checkedElement is already Scanned
		var SearchString = $(checkElement).children("a")[0].getAttribute("href");

		var ReadedID = ReadedNewsArray.indexOf(SearchString);
		var SeenID = SeenNewsArray.indexOf(SearchString);

		if ($(checkElement).find(".MyScanButton").length === 0 && $(checkElement).find(".MyMarkedReadedElement").length === 0 && $(checkElement).find(".MyMarkedSeenElement").length === 0) {
			var ScanButton = $(TabNoc.HTML.ScanButton);
			ScanButton.click(function(){getAllElements(SearchString, SearchString);});
			$(checkElement).append(ScanButton);
		}

		if (ToggleState === true) {
			$(checkElement).addClass("MyPageElement");
			if (ReadedID !== -1) {
				$(checkElement).addClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").find(".MyScanButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					$(checkElement).hide();
				}
				else {
					$(checkElement).show();
				}
				return true;
			}
			else if (SeenID !== -1) {
				$(checkElement).removeClass("MyMarkedReadedElement").addClass("MyMarkedSeenElement").find(".MyScanButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					$(checkElement).hide();
				}
				else {
					$(checkElement).show();
				}
				return true;
			}
		}
		else {
			$(checkElement).removeClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").removeClass("MyPageElement").show();
		}

		return false;
	}
	
	function getAllElements(from, till) {
		try {
			var start = new Date().getTime();

			// ### ReadedNewsArray ###
			var ReadedNewsArray = eval(GM_getValue("ReadedNewsArray") || "([])");
			// ### SeenNewsArray ###
			var SeenNewsArray = eval(GM_getValue("SeenNewsArray") || "([])");

			var elements = $("#index-promo, .list-articles>li");

			var fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { return $(element).children("a")[0].getAttribute("href") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { return $(element).children("a")[0].getAttribute("href") == till; }) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			// tillIndex > elements.length ? elements.length : tillIndex;

			for (i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				var currentElementId = $(element).children("a")[0].getAttribute("href");

				if ($(element).children("a").length === 1 && ($(element).children("a")[0].getAttribute("id").includes("hpalt") ||
															  $(element).children("a")[0].getAttribute("id").includes("bigalt"))) {
					if (SeenNewsArray.indexOf(currentElementId) == -1 && ReadedNewsArray.indexOf(currentElementId) == -1) {
						SeenNewsArray.push(currentElementId);
					}
				} else {
					console.warn(element);
				}
			}
			GM_Lock();
			SetData("SeenNewsArray", SeenNewsArray.toSource(), true);
			GM_Unlock();

			if (TabNoc.Settings.MarkAfterScan) {
				startCheckElements(true);
			}

			var time = new Date().getTime() - start;
			console.log('getAllElements() Execution time: ' + time);
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### http*://www.golem.de ###

	// ### http*://www.golem.de/news/* ###
	function NewsPageLoader(){
		console.log("MarkGolemPages.user.js loading");
		try {
			ReadingNewspage();

			GM_registerMenuCommand("Löschen", function () {
				ReadingNewspage(true);
			});

			console.log("MarkGolemPages.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function ReadingNewspage(deleteEntry){
		try {
			if (deleteEntry !== true) deleteEntry = false;

			// ### ReadedNewsArray ###
			var ReadedNewsArray = eval(GM_getValue("ReadedNewsArray") || "([])");
			// ### SeenNewsArray ###
			var SeenNewsArray = eval(GM_getValue("SeenNewsArray") || "([])");

			GM_Lock();

			if (SeenNewsArray.indexOf(document.URL) !== -1 && deleteEntry === false) {
				console.log(SeenNewsArray);
				SeenNewsArray.splice(SeenNewsArray.indexOf(document.URL), 1);
				SetData("SeenNewsArray", SeenNewsArray.toSource(), true);
			}

			if (ReadedNewsArray.indexOf(document.URL) === -1) {
				ReadedNewsArray.push(document.URL);
				SetData("ReadedNewsArray", ReadedNewsArray.toSource(), true);
				console.info("MarkGolemPages.user.js: Newspage added");
			}
			else {
				if (deleteEntry === true) {
					ReadedNews.splice(SeenNewsArray.indexOf(document.URL), 1);
					SetData("ReadedNewsArray", ReadedNewsArray.toSource(), true);
					console.info("MarkGolemPages.user.js: Newspage removed!");
				}
				else {
					alert("readed");
				}
			}
			GM_Unlock();
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### http*://www.golem.de/news/* ###

	function UpdateDataBase() {
		var CurrentVersion_ReadedNewsArray = 1;
		var CurrentVersion_SeenNewsArray = 1;

		// ### ReadedNewsArray-Version ###
		Version_ReadedNewsArray = eval(GM_getValue("ReadedNewsArray-Version") || 0);

		// ### SeenNewsArray-Version ###
		Version_SeenNewsArray = eval(GM_getValue("SeenNewsArray-Version") || 0);

		// ### ReadedNewsArray ###
		if (Version_ReadedNewsArray != CurrentVersion_ReadedNewsArray) {
			var updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle ReadedNewsArray gefunden (alt: " + Version_ReadedNewsArray + " | aktuell: " + CurrentVersion_ReadedNewsArray + ")";
			console.info(updateMsg);
			alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");

			switch (Version_ReadedNewsArray) {
				case 0:
					// ### ReadedNewsArray ### LEGACY ###
					var ReadedNewsArray = eval(GM_getValue("Readed-News") || null);

					if (ReadedNewsArray !== null) {
						GM_setValue("ReadedNewsArray", ReadedNewsArray.toSource());
						GM_setValue("ReadedNewsArray-Version-0", ReadedNewsArray.toSource());

						if (GM_listValues().indexOf("Readed-News") !== -1) {
							GM_deleteValue("Readed-News");
						}

						GM_setValue("ReadedNewsArray-Version", 1);

						updateMsg = "Die Version der Tabelle ReadedNewsArray wurde auf " + GM_getValue("ReadedNewsArray-Version") + " geändert";
						console.log(updateMsg);
						alert(updateMsg + "\r\nDataBase:'ReadedNewsArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");


					//	console.log("Die Version der Tabelle VideoObjectDictionary ist " + GM_getValue("VideoObjectDictionary-Version"));
					//	alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
					//	if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
					//		GM_setValue("VideoObjectDictionary-Version", 2);
					//		console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
					//		GM_setValue("VideoObjectDictionary", newStructure.toSource());
					//	}
					//	else {
					//		throw "UserAbort";
					//	}
					}
					else {
						GM_setValue("ReadedNewsArray-Version", 1);

						updateMsg = "Die Datenbank-Tabelle ReadedNewsArray wurde erfolgreich initialisiert (Version: " + GM_getValue("WatchedVideoArray-Version") + ")";
						console.log(updateMsg);
						alert(updateMsg);
					}
					break;

				default:
					throw("No Update Implemeneted!");
					break;
			}

		}
		// ### ReadedNewsArray ###

		// ### SeenNewsArray ###
		if (Version_SeenNewsArray != CurrentVersion_SeenNewsArray) {
			var updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle SeenNewsArray gefunden (alt: " + Version_SeenNewsArray + " | aktuell: " + CurrentVersion_SeenNewsArray + ")";
			console.info(updateMsg);
			alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");

			switch (Version_SeenNewsArray) {
				case 0:
					// ### SeenNewsArray ### LEGACY ###
					var SeenNewsArray = eval(GM_getValue("Seen-News") || null);

					if (SeenNewsArray !== null) {
						GM_setValue("SeenNewsArray", SeenNewsArray.toSource());
						GM_setValue("SeenNewsArray-Version-0", SeenNewsArray.toSource());

						if (GM_listValues().indexOf("Seen-News") !== -1) {
							GM_deleteValue("Seen-News");
						}

						GM_setValue("SeenNewsArray-Version", 1);

						updateMsg = "Die Version der Tabelle SeenNewsArray wurde auf " + GM_getValue("SeenNewsArray-Version") + " geändert";
						console.log(updateMsg);
						alert(updateMsg + "\r\nDataBase:'SeenNewsArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");


					//	console.log("Die Version der Tabelle VideoObjectDictionary ist " + GM_getValue("VideoObjectDictionary-Version"));
					//	alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
					//	if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
					//		GM_setValue("VideoObjectDictionary-Version", 2);
					//		console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
					//		GM_setValue("VideoObjectDictionary", newStructure.toSource());
					//	}
					//	else {
					//		throw "UserAbort";
					//	}
					}
					else {
						GM_setValue("SeenNewsArray-Version", 1);

						updateMsg = "Die Datenbank-Tabelle SeenNewsArray wurde erfolgreich initialisiert (Version: " + GM_getValue("WatchedVideoArray-Version") + ")";
						console.log(updateMsg);
						alert(updateMsg);
					}
					break;

				default:
					throw("No Update Implemeneted!");
					break;
			}

		}
		// ### SeenNewsArray ###
	}

	function Syncronisieren(scriptName) {
		var onAbort = (function (response) {
			console.log("onabort");
			console.info(response);
		});

		var onError = (function (msg) {
			return (function (response) {
				console.log("onerror");
				console.info(response);
				alert(msg);
				Feedback.hideProgress();
			});
		});

		var onTimeout = (function (response) {
			console.log("ontimeout");
			console.info(response);
		});

		var onLoadPost = returnExec(function (response) {
			if (response.status !== 200) {
				console.error(response);
				alert("Statuscode:" + response.status);
				Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
				return;
			}
			if (response.responseText.charAt(0) === '#') {
				console.error(response);
				alert("Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText);
				Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
				return;
			}
			Feedback.showProgress(100, "Senden der Daten erfolgreich abgeschlossen");
			alert("Die Syncronisierung der Daten mit dem Server wurde erfolgreich abgeschlossen.\r\nAktueller Versionsstand: " + response.responseText);
		});

		var onLoadGet = returnExec(function (response) {
			Feedback.showProgress(40, "Servernachricht auswerten");
			var error = false;
			if (response.status !== 200) {
				console.error(response);
				alert("Statuscode:" + response.status);
				Feedback.showProgress(100, "Abgebrochen, es konnten keine Daten empfangen werden");
				return;
			}
			if (response.responseText.charAt(0) === '#') {
				console.error(response);
				var errorCode = response.responseText.split("\r\n")[0].substring(1);
				if (errorCode === "2") {
					error = true;
				} else {
					alert("Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText);
					Feedback.showProgress(100, "Abgebrochen, Fehler auf dem Server");
					return;
				}
			}
			Feedback.showProgress(50, "Empfangene Daten migrieren");
			if (!error) {
				var responseData = eval(response.responseText);
				console.info("Server response Data:", responseData);
				if (responseData.ReadedNewsArray != null && responseData.SeenNewsArray != null) {
					Feedback.lockProgress();
					ImportData(responseData, ([{
									Name: "ReadedNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										dataStorage[currentEntry.Name].push(importElement);
									}
								}, {
									Name: "SeenNewsArray",
									defaultVersion: 0,
									defaultValue: "([])",
									ImportAction: function (dataStorage, currentEntry, importElement) {
										if (dataStorage["ReadedNewsArray"].indexOf(importElement) == -1) {
											dataStorage[currentEntry.Name].push(importElement);
										}
									}
								}
							]));
					Feedback.unlockProgress();
				} else {
					alert("Der Wert des Response des Servers war ungültig!");
				}
			}
			if (confirm("Sollen die aktuellen Daten auf dem Server gespeichert werden?") === false) {
				Feedback.showProgress(100, "Senden der Daten abgebrochen");
				return;
			}
			Feedback.showProgress(75, "Neue Daten auf dem Server speichern");

			var element = ({});
			element.ReadedNewsArray = eval(GM_getValue("ReadedNewsArray") || "([])");
			element.SeenNewsArray = eval(GM_getValue("SeenNewsArray") || "([])");
			element["ReadedNewsArray-Version"] = GetData("ReadedNewsArray-Version", 0, true);
			element["SeenNewsArray-Version"] = GetData("SeenNewsArray-Version", 0, true);
			GM_xmlhttpRequest({
				data: {
					Token: Token,
					data: element.toSource()
				}
				.toSource(),
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				onabort: onAbort,
				onerror: onError("Sending New Data Failed"),
				onload: onLoadPost,
				ontimeout: onTimeout,
				timeout: 60000,
				url: "https://tabnoc.gear.host/MyDataFiles//Input"
			});
		});

		Feedback.showProgress(10, "Token erfassen");
		var Token = prompt("Bitte Token eingeben") + scriptName;
		Feedback.showProgress(20, "Request starten");
		GM_xmlhttpRequest({
			data: {
				Token: Token
			}
			.toSource(),
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			onabort: onAbort,
			onerror: onError("Receving Server Data Failed"),
			onload: onLoadGet,
			ontimeout: onTimeout,
			timeout: 60000,
			url: "https://tabnoc.gear.host/MyDataFiles//Output"
		});
		Feedback.showProgress(30, "Warte auf Rückmeldung vom Server");
	}

	function ImportData(allData, entriesArray) {
		var entryID = null;
		var entry = null;
        var element = null;
		if (typeof(GetData) != "function") throw new Error("GetData is not Implemented but required for ImportData!");
		if (typeof(SetData) != "function") throw new Error("SetData is not Implemented but required for ImportData!");
		if (typeof(GM_Lock) != "function") throw new Error("GM_Lock is not Implemented but required for ImportData!");
		if (typeof(GM_Unlock) != "function") throw new Error("GM_Unlock is not Implemented but required for ImportData!");
		if (typeof(UpdateDatabase) != "function") throw new Error("UpdateDatabase is not Implemented but required for ImportData!");
		
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
			// till here ported to new implementation
			var changes = false;
			var msg = "Das Importieren wurde erfolgreich abgeschlossen!\r\n";
			for (entryID in entriesArray) {
				entry = entriesArray[entryID];
				msg += entry.Name + ":\r\n";
				msg += "\tEs wurden " + element.count[entry.Name] + " Elemente aktualisiert (";
				msg += "gespeicherte Datenmenge: " + element.currentData[entry.Name].toSource().length + "B (" + Object.keys(element.currentData[entry.Name]).length + ") |";
				msg += "importierte Datenmenge: " + element[entry.Name].toSource().length + "B (" + Object.keys(element[entry.Name]).length + ") |";
				msg += "neue Datenmenge: " + newDataStorage[entry.Name].toSource().length + "B) (" + Object.keys(newDataStorage[entry.Name]).length + ")\r\n";
				msg += "Delta:\r\n";
				if (newDataStorage[entry.Name].toSource() != element[entry.Name].toSource()) {
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
	
    function GetData(keyName, defaultValue, evalValue) {
        try {
            var data = GM_getValue(keyName);

            if (data === null || data === "") {
                data = defaultValue || null;
            }

            if (TabNoc.Settings.Debug === true) {
                console.log("GetData(" + keyName + ", " + defaultValue + ", " + evalValue + ") -> " + data);
            }

            if (evalValue === true) {
                try {
                    data = eval(data);
                }
                catch (exc) {
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

	function CreateHistoryDialog(data) {
		try {
			$("#HistoryDialog").remove();
			$("<div />").attr("id", "HistoryDialog").attr("title", "Historie").appendTo("body");
			
			var i = 0;
			var s = "<div id=\"HistoryDialogTabs\"><ul>";
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
				s += "<div id=\"HistoryDialogTab-" + i + "\">";
				
				s += "<label for=\"HistoryData-" + i + "\">Historien-Elemente</label><select name=\"HistoryData-" + i + "\" id=\"HistoryDataSelector-" + i + "\"><option historyGroup=\"" + keyName + "\" value=\"" + data[keyName].currentState + "\" selected=\"selected\">Aktuelle Daten</option>";
				for (var timeIndex in data[keyName].changeLog.reverse()) {
					let time = data[keyName].changeLog[timeIndex];
					console.log(time, "Dieser wert sollte ein Timestamp sein, ist er das auch?");
					s += "<option historyGroup=\"" + keyName + "\" value=\"" + time + "\">" + new Date(parseInt(time)).toLocaleString() + "</option>";
				}
				s += "</select>";
				
				s += "</div>";
			}
			s += "</div>";
			
			console.log(s);
			$(s).appendTo("#HistoryDialog");
			
			$("#HistoryDialog").dialog({
				close: function (event, ui) {
					console.log("close", event, ui);
					$("#HistoryDialog").parentNode().remove();
				}
			});
			
			console.log($("#HistoryDialogTabs").tabs());
			
			i = 0;
			for (keyName in data) {
				i++;
				
				$("#HistoryDataSelector-" + i).selectmenu({
					change: returnExec(function (event, data) {
						console.info(event);
						console.info(data);
						
						console.log(data.item.value);
						let group = data.item.element[0].getAttribute("historyGroup");
						let newData = GetState(eval(GM_getValue(group)), eval(GM_getValue("changes"))[group], data.item.value, true);
						console.log(newData);
					})
				});
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function Main() {
		let versionCompare_States = versionCompare(getStatesVersion().Version, "1.1.0");
		if (versionCompare_States != 0) console.info((versionCompare_States < 0 ? "Older" : "Newer") + " States.js file detected!");

		let versionCompare_TabNoc_Config = versionCompare(getTabNocVersion().Version, "1.2.2");
		if (versionCompare_TabNoc_Config != 0) console.info((versionCompare_TabNoc_Config < 0 ? "Older" : "Newer") + " TabNoc.js file detected!");

		let versionCompare_TabNoc_GM = versionCompare(getTabNoc_GMVersion().Version, "2.0.0");
		if (versionCompare_TabNoc_GM != 0) console.info((versionCompare_TabNoc_GM < 0 ? "Older" : "Newer") + " GM__.js file detected!");

		var count = 0;
		while (GM_Locked() == true) {
			count = count + 1;
			alert("Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!");
			if (count >= 2) {
				if(confirm("Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?") === true ) {
					GM_Unlock(true);
				}
			}
		}
		
		GM_addStyle(GM_getResourceText("JqueryUI"));
		UpdateDataBase();

		GM_addStyle(GM_getResourceText("MyCss"));

		// Startseite
		if (document.URL.includes("news") == false) {
			StartPageLoader();
		}
		// Nachrichtenseite
		else if (document.URL.includes("news") == true) {
			NewsPageLoader();
		}
		else {
			alert("MarkGolemPages.user.js:Main()->No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}

	$(Main());

	console.info("MarkGolemPages.user.js [v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
