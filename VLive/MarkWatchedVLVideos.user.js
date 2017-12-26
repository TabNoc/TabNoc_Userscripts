// ==UserScript==
// @name        MarkWatchedVLVideos
// @namespace   TabNoc
// @include     http*://channels.vlive.tv/*/video
// @version     1.0.1
// @author      TabNoc
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/TabNoc.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/public/build/jsondiffpatch.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/public/build/jsondiffpatch-formatters.js
// @resource    JDiffHtml https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/public/formatters-styles/html.css
// @resource    JDiffAnno https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/public/formatters-styles/annotated.css
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/States.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/ImportAll.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/jquery_ui/jquery-ui.min.js
// @require     https://gist.githubusercontent.com/TheDistantSea/8021359/raw/89d9c3250fd049deb23541b13faaa15239bd9d05/version_compare.js
// @resource	JqueryUI https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/jquery_ui/jquery-ui.min.css
// @resource	MyCss https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/Golem/MarkGolemPages.css
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_listValues
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @connect     tabnoc.gear.host
// @noframes
// ==/UserScript==

/*
ChangeList started at 26.12.2017

26.12.2017 - 1.0.0
Start Writing Script - forked from MarkGolemPages v1.3.0_10122017__beta12_

26.12.2017 - 1.0.1
	- changed: using MyUninterestingElement class

*/
try {
	setTabNoc({
		Variables: {
			startTime: new Date(),
			checkElementsInterval: null,
			Interval: null,
			MarkToggleState: true,
			lastCheckItemCount: 0,
			lastCheckScanBufferAmount: 0,
			Active: true,

			lastCheckRVideosAmount : 0,
			lastCheckSVideosAmount : 0
		},

		Settings: {
			SavingEnabled: true,
			MarkAfterScan: true,
			HideAlreadyWatchedVideos : false,

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
		console.log("MarkWatchedVLVideos.user.js loading");
		try {
			registerTabNoc();

			// var ScanButton = $(TabNoc.HTML.ScanButton);
			// ScanButton.click(function(){getAllElements();$("#grandwrapper>.MyScanButton").remove();});
			// $("#grandwrapper").append(ScanButton);

			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.Personal.TimerInterval);
			console.log("MarkWatchedVLVideos.user.js executed");

			console.log("MarkWatchedVLVideos.user.js done");
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
			// ### WatchedVideoArray ###
			var WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### SeenVideoArray ###
			var SeenVideoArray = eval(GM_getValue("SeenVideoArray") || "([])");

			var elements = $(".videoListItem");
			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length ||
					TabNoc.Variables.lastCheckRVideosAmount !== WatchedVideoArray.length ||
					TabNoc.Variables.lastCheckSVideosAmount !== SeenVideoArray.length) {
				execTime(checkElements, WatchedVideoArray.reverse(), elements, ToggleState, SeenVideoArray.reverse());

				TabNoc.Variables.lastCheckRVideosAmount = WatchedVideoArray.length;
				TabNoc.Variables.lastCheckSVideosAmount = SeenVideoArray.length;
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(WatchedVideoArray, elements, ToggleState, SeenVideoArray) {
		var UnScannedElements = 0;
		Feedback.showProgress(0, "Initialised Scan");

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}

		for (i = 0; i < elements.length; i++) {
			Feedback.showProgress(i / elements.length * 100, "Analysing Element " + i + " from " + elements.length);
			var element = elements[i];

			if ($(element).children("video-list-item").length === 1 && $($(element).children("video-list-item")[0]).children("a").length === 2) {
				UnScannedElements = checkElement(element, WatchedVideoArray, ToggleState, SeenVideoArray) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(element);
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		Feedback.showProgress(100, "Finished " + (elements.length - UnScannedElements) + " elements marked");
		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + WatchedVideoArray.length + " Videopages listed)");

		if (TabNoc.Settings.HideAlreadyWatchedVideos === false) {
			Feedback.notify(UnScannedElements + " UnMarked Elements", 10000, function(){TabNoc.Settings.HideAlreadyWatchedVideos = !TabNoc.Settings.HideAlreadyWatchedVideos; startCheckElements(true, true);Feedback.hideMessage();});
		}
	}

	function checkElement(checkElement, WatchedVideoArray, ToggleState, SeenVideoArray) {
		//return true if checkedElement is already Scanned
		var SearchString = $($(checkElement).children("video-list-item")[0]).children("a")[0].getAttribute("href");

		var ReadedID = WatchedVideoArray.indexOf(SearchString);
		var SeenID = SeenVideoArray.indexOf(SearchString);

		if ($(checkElement).find(".MyScanButton").length === 0 && $(checkElement).find(".MyMarkedReadedElement").length === 0 && $(checkElement).find(".MyMarkedSeenElement").length === 0) {
			var ScanButton = $(TabNoc.HTML.ScanButton);
			ScanButton.click(function(){getAllElements(SearchString, SearchString);});
			$(checkElement).append(ScanButton);
		}

		if (ToggleState === true) {
			$(checkElement).addClass("MyPageElement");

			if (ReadedID !== -1) {
				$(checkElement).addClass("MyMarkedReadedElement").removeClass("MyMarkedSeenElement").find(".MyScanButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					$(checkElement).hide();
				}
				else {
					$(checkElement).show();
				}
				return true;
			}
			else if (SeenID !== -1) {
				$(checkElement).removeClass("MyMarkedReadedElement").addClass("MyMarkedSeenElement").find(".MyScanButton").remove();
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					$(checkElement).hide();
				}
				else {
					$(checkElement).show();
				}
				return true;
			}
			else if ($(checkElement).find(".-chPlus, .-vlivePlus").length > 0) {
				$(checkElement).addClass("MyUninterestingElement");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
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

			// ### WatchedVideoArray ###
			var WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### SeenVideoArray ###
			var SeenVideoArray = eval(GM_getValue("SeenVideoArray") || "([])");

			var elements = $(".videoListItem");

			var fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { return $($(element).children("video-list-item")[0]).children("a")[0].getAttribute("href") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { return $($(element).children("video-list-item")[0]).children("a")[0].getAttribute("href") == till; }) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			// tillIndex > elements.length ? elements.length : tillIndex;

			for (i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				var currentElementId = $($(element).children("video-list-item")[0]).children("a")[0].getAttribute("href");

				if ($(element).children("video-list-item").length === 1 && $($(element).children("video-list-item")[0]).children("a").length === 2) {
					if (SeenVideoArray.indexOf(currentElementId) == -1 && WatchedVideoArray.indexOf(currentElementId) == -1) {
						SeenVideoArray.push(currentElementId);
					}
				} else {
					console.warn(element);
				}
			}
			GM_Lock();
			SetData("SeenVideoArray", SeenVideoArray.toSource(), true);
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
	function VideoOverviewPageLoader(){
		console.log("MarkWatchedVLVideos.user.js loading");
		try {
			WatchingVideoPage();

			GM_registerMenuCommand("Löschen", function () {
				WatchingVideoPage(true);
			});

			console.log("MarkWatchedVLVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function WatchingVideoPage(deleteEntry){
		try {
			if (deleteEntry !== true) deleteEntry = false;

			// ### WatchedVideoArray ###
			var WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### SeenVideoArray ###
			var SeenVideoArray = eval(GM_getValue("SeenVideoArray") || "([])");

			GM_Lock();

			if (SeenVideoArray.indexOf(document.URL) !== -1 && deleteEntry === false) {
				console.log(SeenVideoArray);
				SeenVideoArray.splice(SeenVideoArray.indexOf(document.URL), 1);
				SetData("SeenVideoArray", SeenVideoArray.toSource(), true);
			}

			if (WatchedVideoArray.indexOf(document.URL) === -1) {
				WatchedVideoArray.push(document.URL);
				SetData("WatchedVideoArray", WatchedVideoArray.toSource(), true);
				console.info("MarkWatchedVLVideos.user.js: Videopage added");
			}
			else {
				if (deleteEntry === true) {
					WatchedVideoArray.splice(SeenVideoArray.indexOf(document.URL), 1);
					SetData("WatchedVideoArray", WatchedVideoArray.toSource(), true);
					console.info("MarkWatchedVLVideos.user.js: Videopage removed!");
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
		var CurrentVersion_WatchedVideoArray = 0;
		var CurrentVersion_SeenVideoArray = 0;

		// ### WatchedVideoArray-Version ###
		Version_WatchedVideoArray = eval(GM_getValue("WatchedVideoArray-Version") || 0);

		// ### SeenVideoArray-Version ###
		Version_SeenVideoArray = eval(GM_getValue("SeenVideoArray-Version") || 0);

		// ### WatchedVideoArray ###
		if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
			var updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")";
			console.info(updateMsg);
			alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");

			switch (Version_WatchedVideoArray) {
				default:
					throw("No Update Implemeneted!");
					break;
			}

		}
		// ### WatchedVideoArray ###

		// ### SeenVideoArray ###
		if (Version_SeenVideoArray != CurrentVersion_SeenVideoArray) {
			var updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle SeenVideoArray gefunden (alt: " + Version_SeenVideoArray + " | aktuell: " + CurrentVersion_SeenVideoArray + ")";
			console.info(updateMsg);
			alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");

			switch (Version_SeenVideoArray) {
				default:
					throw("No Update Implemeneted!");
					break;
			}

		}
		// ### SeenVideoArray ###
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
				console.error(response);
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
					if (responseData.WatchedVideoArray != null && responseData.SeenVideoArray != null) {
						Feedback.lockProgress();
						ImportData(responseData, ([{
										Name: "WatchedVideoArray",
										defaultVersion: 0,
										defaultValue: "([])",
										ImportAction: function (dataStorage, currentEntry, importElement) {
											if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
												dataStorage[currentEntry.Name].push(importElement);
											}
										}
									}, {
										Name: "SeenVideoArray",
										defaultVersion: 0,
										defaultValue: "([])",
										ImportAction: function (dataStorage, currentEntry, importElement) {
											if (dataStorage["WatchedVideoArray"].indexOf(importElement) == -1) {
												if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
													dataStorage[currentEntry.Name].push(importElement);
												}
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
				element.WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
				element.SeenVideoArray = eval(GM_getValue("SeenVideoArray") || "([])");
				element["WatchedVideoArray-Version"] = GetData("WatchedVideoArray-Version", 0, true);
				element["SeenVideoArray-Version"] = GetData("SeenVideoArray-Version", 0, true);
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

	// SetData(keyName, value, locked, disableValueHistory)

	function ModuleImport(moduleName, moduleFunction, expectedVersion) {
		let currentVersion = moduleFunction().Version;
		let versionCompareResult = versionCompare(currentVersion, expectedVersion);
		var versionData = GetData("ImportVersion", "({show: true})", true);
		versionData[moduleName] = versionData[moduleName] || ({});
		if (versionData["show"] == true && versionData[moduleName].Version != currentVersion && versionData[moduleName].Version != undefined) {
			alert ("Das Modul " + moduleName + " wurde von Version " + versionData[moduleName].Version + " auf Version " + currentVersion + " aktualisiert (Die erwartete Version ist " + expectedVersion + ")");
		}

		if (versionCompareResult != 0) {
			var msg = "Das geladene " + moduleName + " Modul ist " + (versionCompareResult < 0 ? "älter" : "neuer") + " als die konfigurierte Version";
			msg += "\r\nDie erwartete Version ist: " + expectedVersion + " gegeben ist: " + currentVersion;
			if (versionData[moduleName].skipNotification !== currentVersion && !confirm(msg + "\r\n\r\nSoll diese Meldung für diese Version des Moduls weiterhin angezeigt werden?")) {
				versionData[moduleName].skipNotification = currentVersion;
			}
			console.info(msg);
		}
		versionData[moduleName].Version = currentVersion;
		SetData("ImportVersion", versionData.toSource(), true);
	}

	function Main() {
		ModuleImport("States", getStatesVersion, "1.2.6");
		ModuleImport("TabNoc_GM", getTabNoc_GMVersion, "2.0.2");
		ModuleImport("TabNoc", getTabNocVersion, "1.2.2");
		ModuleImport("ImportAll", getImportAllVersion, "1.0.2");

		var count = 0;
		while (GM_Locked() == true) {
			count = count + 1;
			alert("Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!");
			if (count >= 2) {
				if (confirm("Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?") === true ) {
					GM_Unlock(true);
				}
			}
		}

		GM_addStyle(GM_getResourceText("JqueryUI"));
		UpdateDataBase();

		GM_addStyle(GM_getResourceText("MyCss"));
		GM_addStyle(GM_getResourceText("JDiffAnno"));
		GM_addStyle(GM_getResourceText("JDiffHtml"));

		// Startseite
		if (document.URL.includes("video") == true) {
			StartPageLoader();
		}
		// Nachrichtenseite
		else if (document.URL.includes("video") == false) {
			VideoOverviewPageLoader();
		}
		else {
			alert("MarkWatchedVLVideos.user.js:Main()->No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}

	$(Main());

	console.info("MarkWatchedVLVideos.user.js [v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
