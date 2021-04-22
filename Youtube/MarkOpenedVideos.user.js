// ==UserScript==
// @name        MarkOpenedVideos
// @namespace   TabNoc
// @include     http*://www.youtube.com/feed/subscriptions
// @include     http*://www.youtube.com/user/*
// @include     http*://www.youtube.com/c*/*
// @include     http*://www.youtube.com/c*/*/videos*
// @include     http*://www.youtube.com/c*/*/featured*
// @include     http*://www.youtube.com/watch?*v=*
// @include     http*://www.youtube.com/results?*
// @include     http*://www.youtube.com/feed/history
// @include     http*://www.youtube.com/
// @version     2.3.6_b_11_12052018
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/GM__.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/TabNoc.js
// @require		https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/String.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Youtube/Dialog.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/jquery_ui/jquery-ui.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/VideoGreyDetector.js
// @resource	JqueryUI https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/jquery_ui/jquery-ui.min.css

// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/build/jsondiffpatch.js
// @require     https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/build/jsondiffpatch-formatters.js
// @resource    JDiffHtml https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/formatters-styles/html.css
// @resource    JDiffAnno https://raw.githubusercontent.com/benjamine/jsondiffpatch/v0.2.5/public/formatters-styles/annotated.css
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/States.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/ImplementSync/base/ImportAll.js
// @require     https://gist.githubusercontent.com/TheDistantSea/8021359/raw/89d9c3250fd049deb23541b13faaa15239bd9d05/version_compare.js

// @updateURL   https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Youtube/MarkOpenedVideos.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @noframes
// ==/UserScript==

//TODO:
/*
- add a intervall wich checks periodical if a movie_player exists, if yes: mybe ask if video loader should be executed
- in the same interval as above, check if the movie_player does not exists anymore, then quit the normal intervalls. There has to be a better way

- add generic DatabaseLoader with memory of changes (so undo is very easy and can apply multiple states)
- add generic Error handler, wich is used EVERY time, this one logs Errors in Database, and send them to Server

- Meine Datenbank wiederherstellen, da sind alle Daten kaputt, am besten die Daten des alten Versionsstandes wiederherstellen, und dann ausschließlich die neuen Daten reinmergen, die müssten ja eigendlich io sein, außerdem im vergleicher null mit undefined gleichstellen, so dass diese gemerged werden!
*/

/*
ChangeList started at 20.09.2016

20.09.2016 - 1.3.2
[SubscriptionPage]
added:	- NotWantedVideos
		- HideAlreadyWatchedVideos
[Global]
added:	- @noframes

22.09.2016 - 1.3.3
[SubscriptionPage]
added: 	- MenuCommand(HideWatchedVideos)
		- possibility to force startCheckElements

23.12.2016 - 1.3.4
fixed:	- fixed StyleChanges from Youtube


13.02.2017 - 2.0.0
	changed:	- completly rewritten Storage, renamed all DatabaseTables, updated UpdateDataBase (dropped Support for old Versions)
	changed:	- implemented TabNoc.js

23.02.2017 - 2.0.1
	added: - exported Function ResetDataBaseVersion (only visible on SubscriptionsPage)

26.02.2017 - 2.0.2
	fixed: 	- Renamed to Beta
			- changed Update URL

28.02.2017 - 2.0.3
	changed: a lot?

03.03.2017 - 2.0.4
	rewritten Storage, again
	many other changes

26.03.2017 - 2.0.5 to 2.0.5.1
	added: 		- marking of VideoWall
	changed:	- merging Intervalls from WatchingVideo to WatchingVideoIntervalHandler
	changed:	- cleanup some Code

26.03.2017 - 2.1.0
	[Stable Release]
	changed:	- adjusted Imports to use master branch

26.03.2017 - 2.1.1
	changed:	- removed Beta flag

29.03.2017 - 2.1.2
	fixed:	- empty VideoTitle and empty VideoAuthor will be merged from filled Data Object

29.03.2017 - 2.1.3
	added:	- JqueryUI
	fixed:	- if the VideoTitle or the VideoAuthor has changed and none of them are empty, a Dialog will be shown to let the user choose witch Version shall be used

18.04.2017 - 2.1.4
	added:	- ExportAllData
			- ImportAllData

23.04.2017 - 2.2.0
	added:	- Implemented ServerBased Backup and Restore

28.04.2017 - 2.2.1
	changed:- Opical Improvments

01.05.2017 - 2.2.2
	changed:	- Opical Improvments
				- more Details on DataMerge

09.05.2017 - 2.2.3
	added:	- support for featured videos from channel

21.05.2017 - 2.2.4
	changed:	- changes to Database are now locked

13.06.2017 - 2.2.5
	changed:	- Clicking on Feedback Message on SubscriptionPage now set HideAlreadyWatchedVideos to true
	changed:	- Importing Data now shows an additional ProgressBar

02.08.0017 - 2.2.7
	changed:	- Updated GM__.js, now uses GM_Unlock for DataBase
	changed:	- VideoStatisticsObject.Watches.Date is now saved as .toString() instead of .toLocalString()
	added:		- Updating Database to Version 3 (convert VideoStatisticsObject.Watches.Date)
	changed:	- Doubled frequency of saving Video Statistics
	changed:	- PushVideoObject now returns new Object and will overwrite used one
	added:		- Merging of VideoStatisticsObject.Watches with less then 2 minutes difference
	changed:	- the execution will be blocked if the URL contains "feature=youtu.be"
	added:		- if the Database is locked when loading page a warining will be displayed, if still locked after confirm, then possibility to unlock

02.08.2017 - 2.2.8
	added:		- Importing Data now checks the DataBase Version, if wrong simply fails (currently no conversation planned)
	fixed:		- Merging VideoObjects now checks if the Date Property is valid

21.08.2017 - 2.2.9
	added:		- width changer now supports 850px content width

01.09.2017 - 2.3.0
	added:		- compatibility with new YoutubeLayout
	added:		- generic Database SetData/GetData
	added:		- Incomplete HistoryDataDialog
	added.		- UpdateDataBase now uses dynamic Functions and can be silent(currently disabled)
	added:		- UpdateDataBase hat nun mehr User interaktion
	added:		- UpdateDataBase Backup der alten Version ist nun mit abfragen gesichert
	added:		- Es ist nun möglich Import-Vorgänge abzubrechen

08.09.2017 - 2.3.1
	changed:	- removed support for the old YoutubeLayout
	changed:	- startCheckElements executionTime now ignores Database reading
	changed:	- startCheckElements force call now forces calling even when document is hidden
	added:		- startCheckElements is now adjusting the page width
	added:		- startCheckElements also calls the Watching Video Handler
	changed:	- VideoWall elements are now processed separately in checkVideoWallElements
	added:		- CheckWatchingVideo, method witch 'installs' all nessesary thing when watching video and removes them afterwards
	added:		- ManageTimes, remainingTimeManager and remainingTimeOutput from Youtube-Jumper
	removed:	- removed no longer needed Functions from old CallTree

20.09.2017 - 2.3.2
	fixed:		- New Youtube Layout was not detected

25.09.2017 - 2.3.3
	added:		- width changer now supports 856px content width

02.10.2017 - 2.3.5
	fixed:		- if an Information in MergeVideoObject is missing it can not be resolved

10.12.2017 - 2.3.6Beta5
	changed:	- Syncronisieren optimiert
	changed:	- Die aufrufe nach SetData nutzen nun die Historie
	changed:	- onbeforeunload wird nur noch mit aktivem Video gesetzt

12.05.2018 - 2.3.6Beta11
	changed: applied getAllElements Opmimisations from Twitter
 */

function ErrorHandler(exc, msg) {
	GM_Lock();
	//TODO: write Message, error and Timestamp to Database
	GM_Unlock();

	if (msg != null && msg != "") {
		console.error(msg + ":\r\n\r\n" + exc);
		alert(msg + ":\r\n\r\n" + exc);
	} else {
		console.error(exc);
		alert(exc);
	}
}
try {
	setTabNoc({
		Variables: {
			MarkToggleState: true,

			WatchedLength: 0,
			HasSavedDataOnEnd: false,

			CurrentVideoID: null,

			VideoStatisticsObject: null,

			checkElementsInterval: null,
			lastCheckItemCount: 0,
			lastCheckVideoIdAmount: 0,
			lastCheckWatchedVideoAmount: 0,
			lastCheckVideoObjectAmount: 0,

			LastFullScreenElement: null,

			Data: ({}),

			HasInstalledWatchingVideo: false,
			LastSaveWatchedLength: null,

			EndTime: 0
		},

		Settings: {
			SavingEnabled: true,
			TimerInterval: 5000,
			UninterestingVideos: (["Recht für YouTuber:"]),
			NotWantedVideos: (["Arumba Plays DOTA", "Europa Universalis IV", "Let's Play Crusader Kings 2", "Challenge WBS", "Let's Play Civilization VI", "Let's Play Galactic Civilizations 3", "The Binding of Isaac ", "Civilization 6", "Endless Space", "Galactic Cililisations 3", "Civilization V", "Let's Play Stellaris", "SPAZ2", "EU4", "Factorio S7E", "Lets Play S9 E"]),
			DeleteNotWantedVideos: false,
			HideAlreadyWatchedVideos: false,
			ShowAlreadyWatchedDialog: true,
			Debug: false
		},

		HTML: {}
	});

	// ### https://www.youtube.com/ ###
	function SubscriptionPageLoader() {
		console.log("MarkOpenedVideos.user.js loading [SubscriptionPageLoader]");
		try {
			registerTabNoc();

			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.TimerInterval);
			startCheckElements(TabNoc.Variables.MarkToggleState, true);
			console.log("MarkOpenedVideos.user.js executed");

			console.log("MarkOpenedVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function registerTabNoc() {
		GM_registerMenuCommand("Hide Watched Videos", function () {
			TabNoc.Settings.HideAlreadyWatchedVideos = true;
			startCheckElements(true, true);
		});

		GM_registerMenuCommand("CreateHistoryDialog", function () {
			CreateHistoryDialog(GetData("changes", "([])", true));
		});

		GM_registerMenuCommand("ManuelleSyncronisation", function () {
			Syncronisieren("");
		});

		GM_registerMenuCommand("ImportData", function () {
			ImportData(null, TabNoc.Variables.ImportDataProperties);
		});

		GM_registerMenuCommand("ExportData", function () {
			$.prompt(ImportExportDialog);
		});

		GM_registerMenuCommand("ExportAllData", function () {
			var element = ({});
			element.WatchedVideoArray = GetData("WatchedVideoArray", "([])", true);
			element.ScannedVideoArray = GetData("ScannedVideoArray", "([])", true);
			element.VideoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);
			element["VideoObjectDictionary-Version"] = GetData("VideoObjectDictionary-Version", 0, true);
			element["WatchedVideoArray-Version"] = GetData("WatchedVideoArray-Version", 0, true);
			element["ScannedVideoArray-Version"] = GetData("ScannedVideoArray-Version", 0, true);
			prompt("Bitte die Exportierten Daten kopieren", JSON.stringify(element));
		});

		GM_registerMenuCommand("ImportAllData", function () {
			ImportData(true, TabNoc.Variables.ImportDataProperties);
		});

		GM_registerMenuCommand("Markieren", function () {
			startCheckElements(!TabNoc.Variables.MarkToggleState);
		});

		TabNoc.Variables.ImportDataProperties = ([{
				Name: "VideoObjectDictionary",
				defaultVersion: 2,
				defaultValue: "({})",
				ImportAction: function (dataStorage, currentEntry, importElement) {
					PushVideoObject(dataStorage[currentEntry.Name], JSON.parse(JSON.stringify(importElement)), false);
				}
			}, {
				Name: "WatchedVideoArray",
				defaultVersion: 0,
				defaultValue: "([])",
				ImportAction: function (dataStorage, currentEntry, importElement) {
					if (GetVideoWatched(dataStorage[currentEntry.Name], dataStorage.VideoObjectDictionary, importElement) === false) {
						dataStorage[currentEntry.Name].push(importElement);
					}
				}
			}, {
				Name: "ScannedVideoArray",
				defaultVersion: 0,
				defaultValue: "([])",
				ImportAction: function (dataStorage, currentEntry, importElement) {
					if (GetVideoWatched(dataStorage[currentEntry.Name], dataStorage.VideoObjectDictionary, importElement) === false && GetVideoWatched(dataStorage.WatchedVideoArray, false, importElement) === false) {
						dataStorage[currentEntry.Name].push(importElement);
					}
				}
			}
		]);
	}

	function startCheckElements(ToggleState, force) {
		if ((document.hidden === false && document.hasFocus()) || force === true) {
			// ### ScannedVideoArray ###
			let scannedVideoArray = GetData("ScannedVideoArray", "([])", true);
			// ### WatchedVideoArray ###
			let watchedVideoArray = GetData("WatchedVideoArray", "([])", true);
			// ### VideoObjectDictionary ###
			let videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);

			var start = new Date().getTime();

			var widthElement = $("ytd-two-column-browse-results-renderer");
			if (widthElement.length > 0) {
				if (widthElement.width() == 1284) {
					widthElement.css("width", "1356px");
				}
				else if (widthElement.width() == 856) {
					widthElement.css("width", "903px");
				}
				else if (widthElement.width() != 1356 && widthElement.width() != 903) {
					console.log("no width change defined for " + widthElement.width());
				}
			}

			var elements = $("ytd-grid-video-renderer,ytd-video-renderer,ytd-compact-video-renderer");

			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length ||
					TabNoc.Variables.lastCheckVideoIdAmount !== scannedVideoArray.length ||
					TabNoc.Variables.lastCheckWatchedVideoAmount !== watchedVideoArray.length ||
					TabNoc.Variables.lastCheckVideoObjectAmount !== GetElementCount(videoObjectDictionary)) {
				checkElements(watchedVideoArray.reverse(), scannedVideoArray.reverse(), videoObjectDictionary, elements, ToggleState);

				TabNoc.Variables.lastCheckVideoIdAmount = scannedVideoArray.length;
				TabNoc.Variables.lastCheckWatchedVideoAmount = watchedVideoArray.length;
				TabNoc.Variables.lastCheckVideoObjectAmount = GetElementCount(videoObjectDictionary);
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
			CheckWatchingVideo();

			var time = new Date().getTime() - start;
			if (time > 5) {
				console.log('startCheckElements() Execution time: ' + time);
			}
		}
	}

	function checkElements(watchedVideoArray, scannedVideoArray, videoObjectDictionary, elements, ToggleState) {
		var UnScannedElements = 0;
		Feedback.showProgress(0, "Initialised Scan");

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}

		for (let i = 0; i < elements.length; i++) {
			Feedback.showProgress(i / elements.length * 100, "Analysing Element " + i + " from " + elements.length);
			var currentElement = elements[i];

			UnScannedElements = checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) == true ? UnScannedElements : UnScannedElements + 1;
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		Feedback.showProgress(100, "Finished " + (elements.length - UnScannedElements) + " elements marked", (TabNoc.Settings.HideAlreadyWatchedVideos === true ? 1000 : 7500), function(){TabNoc.Settings.HideAlreadyWatchedVideos = true;startCheckElements(true, true);Feedback.hideMessage();});
		console.log(String.format("Found {0} Elements ({1} Marked Elements | {2} UnMarked Elements) [{3} Scanned Videos | {4} Watched Videos | {5} Watched Videos(old)]", elements.length, elements.length - UnScannedElements, UnScannedElements, scannedVideoArray.length, Object.keys(videoObjectDictionary).length, watchedVideoArray.length));
	}

	function checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) {
		//return true if checkedElement is already Scanned

		var infoElement = $(currentElement).find("#video-title");

		var VideoID = $(currentElement).find("#thumbnail").attr("href").replace("https://www.youtube.com", "").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		infoElement.attr("title", infoElement.attr("aria-label").replace("Minuten,", "Minuten"));


		currentElement.style.borderRadius = "15px";
		currentElement.style.border = "1px solid #ddd";
		currentElement.style.padding = "5px";
		// currentElement.style.minHeight = "187px";

		if (ToggleState === true) {
			if (GetVideoWatched(scannedVideoArray, false, VideoID)) {
				$(currentElement).css("background-color", "rgb(151, 255, 139)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				return true;
			}
			else if (GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID)) {
				$(currentElement).css("background-color", "rgb(166, 235, 158)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				return true;
			}
		}
		else {
			$(currentElement).css("background-color", "");
			currentElement.style.display = "";
		}

		for (let i = 0; i < TabNoc.Settings.UninterestingVideos.length; i++) {
			if (infoElement[0].textContent.includes(TabNoc.Settings.UninterestingVideos[i])) {
				$(currentElement).css("background-color", "rgb(255, 175, 175)");
				break;
			}
		}
		for (let i = 0; i < TabNoc.Settings.NotWantedVideos.length; i++) {
			if (infoElement[0].textContent.includes(TabNoc.Settings.NotWantedVideos[i])) {
				//disableVideo
				if (TabNoc.Settings.DeleteNotWantedVideos === true) {
					$(currentElement).remove();
				}
				else {
					currentElement.style.display = "none";
				}
				break;
			}
		}

		return false;
	}

	function getAllElements(from, till) {
		try {
			let start = new Date().getTime();

			GM_Lock();
			// ### ScannedVideoArray ###
			let scannedVideoArray = GetData("ScannedVideoArray", "([])", true);
			// ### WatchedVideoArray ###
			let watchedVideoArray = GetData("WatchedVideoArray", "([])", true);
			// ### VideoObjectDictionary ###
			let videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);

			let elements = $(".item-section");

			let fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { return $(element).find(".yt-uix-tile-link")[0].getAttribute("href") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			let tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { return $(element).find(".yt-uix-tile-link")[0].getAttribute("href") == till; }));
			if (tillIndex == -1) throw "till(" + till + ") were not found";

			for (let i = Math.min(fromIndex, tillIndex); i < Math.max(fromIndex, tillIndex) + 1; i++) {
				let element = elements[i];
				if (element.className.includes("item-section")) {
					let currentElementId = $(element).find(".yt-uix-tile-link")[0].getAttribute("href");

					if (GetVideoWatched(scannedVideoArray, false, currentElementId) === false && GetVideoWatched(watchedVideoArray, videoObjectDictionary, currentElementId) === false) {
						scannedVideoArray.push(currentElementId);
					}
				} else {
					console.error(element);
				}
			}

			SetData("ScannedVideoArray", JSON.stringify(scannedVideoArray), true, false);
			GM_Unlock();

			startCheckElements(true);

			console.log('getAllElements() Execution time: ' + (new Date().getTime() - start));
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### https://www.youtube.com/ ###


	// ### https://www.youtube.com/watch?v=* ###
	function CheckWatchingVideo(forcedOperation) {
		// if (TabNoc.Settings.Debug === true) {
			var start = new Date().getTime();
		// }
		var movie_player = unsafeWindow.document.getElementById("movie_player");
		var moviePlayerExistsWithVideo = movie_player != null && movie_player.getVideoData != undefined && movie_player.getVideoData().video_id != undefined &&
				movie_player.getVideoData().author != "" && movie_player.getVideoData().title != "" && movie_player.getVideoData().video_quality != undefined;

		if ((moviePlayerExistsWithVideo == true && TabNoc.Variables.HasInstalledWatchingVideo == false) || forcedOperation == "install") {
			TabNoc.Variables.CurrentVideoID = movie_player.getVideoData().video_id;

			WatchingVideo();
			ManageTimes(movie_player);

			TabNoc.Variables.HasInstalledWatchingVideo = true;
		}
		if ((moviePlayerExistsWithVideo == false && TabNoc.Variables.HasInstalledWatchingVideo == true) || forcedOperation == "uninstall") {
			SaveVideoStatistics();

			TabNoc.Variables.LastSaveWatchedLength = null;
			TabNoc.Variables.VideoStatisticsObject = null;
			TabNoc.Variables.WatchedLength = 0;
			TabNoc.Variables.HasSavedDataOnEnd = false;
			TabNoc.Variables.LastIntervalTime = null;

			TabNoc.Variables.HasInstalledWatchingVideo = false;
		}
		if (TabNoc.Variables.HasInstalledWatchingVideo === true && forcedOperation == null) {
			WatchingVideoIntervalHandler(movie_player);
		}
		// if (TabNoc.Settings.Debug === true) {
			var time = (new Date().getTime() - start);
			if (time > 10) {
				console.log('CheckWatchingVideo execution time: ' + time);
			}
		// }
	}


	function ManageTimes(movie_player) {
		var Author = movie_player.getVideoData().author;
		var VideoTitle = movie_player.getVideoData().title;
		console.log("VideoAuthor", Author);

		/*set predifined skip- and end-Times*/
		if (Author === "Kanzlei WBS") {
			TabNoc.Variables.EndTime = 17 + 7;
			movie_player.setPlaybackRate(1.25 + (VideoTitle.contains("Recht für YouTuber") || VideoTitle.contains("Challenge WBS") ? 0.25 : 0));
			if (VideoTitle.contains("| Fernsehauftritt bei")) {
				TabNoc.Variables.SkipTime = 24; // neuerdings am anfang sprechgedöns -> erhöhen
				TabNoc.Variables.EndTime += 12;
				// TabNoc.Variables.SkipOver.push({
					// start : 5,
					// end : 18//20
				// });
			} else {
				AddGreyDetector({
					CallBack : (function (amount) {
						console.log("VideoGreyDetector Triggered: " + amount);
						movie_player.seekTo(movie_player.getCurrentTime() + 11 + (VideoTitle.contains("Dr. Carsten Föhlisch") ? 5 : 0));
					}),
					Interval : 100,
					DetectorInterval : null,
					CopySizePercentage : 10,
					BaseVideo : document.getElementsByClassName("html5-main-video")[0],
					TriggerAmount : 5000, //14000,
					TriggerDarkPercentage : 70,
					StopIntervalAfterTrigger : true,
					MaxVideoCheckTime : 60000
				});
			}
		}
		if (Author === "SemperVideo" || Author === "SemperErratum" || Author === "SemperCensio") {
			TabNoc.Variables.SkipTime = 10.5;
			TabNoc.Variables.EndTime = 16;
			movie_player.setPlaybackRate(1.25);
		}
		if (Author === "minecraftpg5") {
			TabNoc.Variables.SkipTime = 6;
			TabNoc.Variables.EndTime = 15;
		}
		if (Author === "Space Engineers") {
			TabNoc.Variables.EndTime = 15;
		}
		if (Author === "BlackQuantumTV") {
			TabNoc.Variables.SkipTime = 0;
			TabNoc.Variables.EndTime = 0;
			// TabNoc.Variables.SkipOver.push({start:50, end:150});
			TabNoc.Variables.SkipOver.push({
				start : 1340,
				end : 1415
			});
		}
		if (Author === "XoXMeineAnimeWeltXoX") { //Anime: Kanon 2006
			TabNoc.Variables.SkipTime = 0;
			TabNoc.Variables.EndTime = 0;
			TabNoc.Variables.SkipOver.push({
				start : 105,
				end : 180
			});
			TabNoc.Variables.SkipOver.push({
				start : 1335,
				end : 150
			});
		}
		if (Author === "direwolf20") {
			if (VideoTitle.contains("Space Engineers")) {
				movie_player.setPlaybackRate(1.5);
			} else {
				movie_player.setPlaybackRate(2);
			}
		}
		if (Author === "Arumba") {
			movie_player.setPlaybackRate(2); //(1.25);
		}
		if (Author === "ExcelIsFun") {
			movie_player.setPlaybackRate(2); //(1.5);
		}
		if (Author === "Nilaus") {
			movie_player.setPlaybackRate(2);
		}
		if (Author === "Cliff Harris") {
			movie_player.setPlaybackRate(1.25);
		}
		if (Author === "Linus Tech Tips" || Author === "TechLinked" || Author === "Techquickie") {
			movie_player.setPlaybackRate(1.4);
		}
		if (Author === "Techquickie") {
			TabNoc.Variables.SkipTime = 4;
		}
		if (Author === "Gamers Nexus") {
			movie_player.setPlaybackRate(1.25);
		}

		if (TabNoc.Variables.SkipTime > 0 && movie_player.getCurrentTime() < TabNoc.Variables.SkipTime) {
			movie_player.seekTo(TabNoc.Variables.SkipTime);
		}
	}


	function remainingTimeManager(movie_player) {
		var duration = movie_player.getDuration();
		var currentTime = movie_player.getCurrentTime();
		var remainingTime = duration - currentTime;

		var oldRemainingTimeString = TabNoc.Variables.RemainingTimeString;
		TabNoc.Variables.RemainingTimeString = "";

		remainingTime = Math.floor((remainingTime - TabNoc.Variables.EndTime) / movie_player.children[0].children[0].playbackRate); //movie_player.getPlaybackRate());

		// Zeitwert-string formatieren
		if (remainingTime >= 60) { // über einer Minute
			TabNoc.Variables.RemainingTimeString += Math.floor(remainingTime / 60) + ((remainingTime < 120) ? " Minute und " : " Minuten und ");
		}
		TabNoc.Variables.RemainingTimeString += (remainingTime % 60 < 10 ? "0" : "") + (remainingTime % 60) + " Sekunde" + (remainingTime % 60 !== 1 ? "n" : "");

		// Verwaltung der RemainTime anzeige
		if (TabNoc.Variables.RemainingTimeString !== oldRemainingTimeString) {
			remainingTimeOutput(TabNoc.Variables.RemainingTimeString);
		}

		//MarkRemainTimeOnLowBuffer

		// current Video Buffer Size
		var BufferSize = (movie_player.getVideoLoadedFraction() * movie_player.getDuration() - movie_player.getCurrentTime()) / movie_player.getPlaybackRate();
		// is the BufferSize below the SettingValue and not fully loaded
		var LowBuffer = BufferSize < 10 && movie_player.getVideoLoadedFraction() !== 1;

		// Buffer is getting Low -> Start Showing red Label
		if (LowBuffer === true && TabNoc.Variables.LastCheckLowBuffer === false) {
			$("#page").removeClass("MyAddMarginPage").addClass("MyAddMarginPageWithoutImage");
			remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
		}

		// Buffer is Low and Buffersize has changed
		if (LowBuffer === true && TabNoc.Variables.LastCheckBufferSize !== BufferSize) {
			remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
			TabNoc.Variables.LastCheckBufferSize = BufferSize;
		}
		// Buffer is getting high -> remove red Label
		else if (LowBuffer === false && TabNoc.Variables.LastCheckLowBuffer === true) {
			$("#page").addClass("MyAddMarginPage").removeClass("MyAddMarginPageWithoutImage").removeClass("MyAddMarginPageWithImage");

			remainingTimeOutput(TabNoc.Variables.RemainingTimeString, false);
		}
		TabNoc.Variables.LastCheckLowBuffer = LowBuffer;
	}

	function remainingTimeOutput(RemainingTimeString, BufferSize) {
		var StartTextId = "#RemainTimeStart";
		var TimeTextId = "#RemainTimeTime";
		var BufferId = "#RemainTimeBuffer";
		var BufferTextId = "#RemainTimeBufferText";

		if ($(StartTextId).length === 0) {
			// Initialize
			$("#TabNoc_YT_Jump").append('<span id="RemainTimeStart">Es verbleiben </span><span id="RemainTimeTime"></span><span id="RemainTimeBuffer" style="display:none;color: red;font-weight: bold;"><br>Buffer : ca. <span id="RemainTimeBufferText"></span>s<img id="RemainTimeImage"></span>');
		}

		if (RemainingTimeString !== null && RemainingTimeString != undefined) {
			$(TimeTextId)[0].textContent = RemainingTimeString;
			if (RemainingTimeString === "") {
				$(StartTextId).hide();
			}
		}

		if (BufferSize !== "" && BufferSize !== null && BufferSize != undefined) {
			if (BufferSize === false) {
				$(BufferId).hide();
			}
			else {
				$(BufferId).show();
				$(BufferTextId)[0].textContent = Math.floor(BufferSize);
			}
		}
	}


	function WatchingVideo() {
		if (TabNoc.Settings.Debug === true) {
			console.groupCollapsed("WatchingVideo");
			console.log("WatchingVideo()->old:", JSON.parse(TabNoc.Variables.VideoStatisticsObject), TabNoc.Variables.VideoStatisticsObject);
		}
		if (TabNoc.Variables.VideoStatisticsObject != null) {
			alert("TabNoc.Variables.VideoStatisticsObject ist nicht null");
			throw new Error("TabNoc.Variables.VideoStatisticsObject ist nicht null");
		}
		try {
			// TODO: use addEventListener
			document.body.onbeforeunload = function () {
				SaveVideoStatistics();
			};

			// prepare Current VideoStatisticsObject
			TabNoc.Variables.VideoStatisticsObject = JSON.stringify({
				VideoID: unsafeWindow.document.getElementById("movie_player").getVideoData().video_id,
				VideoTitle: unsafeWindow.document.getElementById("movie_player").getVideoData().title,
				VideoAuthor: unsafeWindow.document.getElementById("movie_player").getVideoData().author,
				Watches: [{
						WatchedLength: -99,
						Date: new Date().toString()
					}
				],
				VideoLength: Math.floor(unsafeWindow.document.getElementById("movie_player").getDuration())
			});

			if (TabNoc.Settings.Debug === true) {
				console.log("WatchingVideo()->new: " + TabNoc.Variables.VideoStatisticsObject);
			}

			if (TabNoc.Settings.ShowAlreadyWatchedDialog === true) {
				if (GetVideoWatched(null, null, JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoID) === true) {
					setTimeout(function () {
						alert("watched");
						Feedback.showMessage("Watched!", "error", 60000);
					}, 10);
					console.log("Video already watched!");
				}
			}
			TabNoc.Variables.VideoStatisticsObject = JSON.stringify(PushVideoObject(null, JSON.parse(TabNoc.Variables.VideoStatisticsObject), true));

			Feedback.notify("Aktuelles Video: " + JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoTitle, 2000);
			console.info("Aktuelles Video: " + JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoTitle + " ID: " + JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoID);

		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
		if (TabNoc.Settings.Debug === true) {
			console.groupEnd("WatchingVideo");
		}
	}

	function WatchingVideoIntervalHandler(movie_player) {
		try {
			if (unsafeWindow.document.getElementById("TabNoc_YT_Jump") == null) {
				if (unsafeWindow.document.getElementsByTagName("ytd-searchbox") != null) {
					$(unsafeWindow.document.getElementsByTagName("ytd-searchbox")[0]).append("<div id=\"TabNoc_YT_Jump\" style=\"font-size: 14px;font-family: Roboto,Arial,sans-serif;height: 32px;margin-left: 10px;text-align: center;flex: 1;display:-webkit-box;-webkit-box-pack:center;-webkit-box-align:center;\"></div>");
					// remainingTimeManager(movie_player);
				}
			}
			else {
				remainingTimeManager(movie_player);
			}
			// ############################### TabNoc.Variables.WatchedLengthInterval ###############################
			if (movie_player.getPlayerState() == 1 /*Playing*/) {
				if (TabNoc.Variables.LastIntervalTime != null) {
					TabNoc.Variables.WatchedLength = TabNoc.Variables.WatchedLength + (new Date().getTime() - TabNoc.Variables.LastIntervalTime) / 1000;
				}
				TabNoc.Variables.HasSavedDataOnEnd = false;
				TabNoc.Variables.LastIntervalTime = new Date().getTime();
			}
			else {
				TabNoc.Variables.LastIntervalTime = null;

				checkVideoWallElements();
			}
			if (movie_player.getPlayerState() == 0 && TabNoc.Variables.HasSavedDataOnEnd === false) {
				SaveVideoStatistics();

				TabNoc.Variables.HasSavedDataOnEnd = true;
			}
			if (TabNoc.Variables.LastSaveWatchedLength + 14 < TabNoc.Variables.WatchedLength) {
				SaveVideoStatistics();
				TabNoc.Variables.LastSaveWatchedLength = TabNoc.Variables.WatchedLength;
			}
			// ############################### TabNoc.Variables.WatchedLengthInterval ###############################

			//TODO: have I deleted something???
			// check Fullscreen state Change
			if ((document.mozFullScreenElement == null && TabNoc.Variables.LastFullScreenElement != null) ||
					(document.mozFullScreenElement != null && (document.mozFullScreenElement.getAttribute("id") != TabNoc.Variables.LastFullScreenElement))) {
				TabNoc.Variables.LastFullScreenElement = document.mozFullScreenElement && document.mozFullScreenElement.getAttribute("id");
				checkVideoWallElements();
			}

			// ############################### TabNoc.Variables.VideoChangeCheckInterval ###############################
			if (movie_player.getVideoData().video_id != TabNoc.Variables.CurrentVideoID) {
				CheckWatchingVideo("uninstall");
				CheckWatchingVideo("install");
			}
			// ############################### TabNoc.Variables.VideoChangeCheckInterval ###############################

		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	function checkVideoWallElements() {
		// ### ScannedVideoArray ###
		let scannedVideoArray = GetData("ScannedVideoArray", "([])", true).reverse();
		// ### WatchedVideoArray ###
		let watchedVideoArray = GetData("WatchedVideoArray", "([])", true).reverse();
		// ### VideoObjectDictionary ###
		let videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);

		let elements = $(".ytp-videowall-still");

		for (let i = 0; i < elements.length; i++) {
			let currentElement = elements[i];

			let VideoID = currentElement.getAttribute("href");
			if (VideoID.contains("watch?list=")) {
				continue;
			}
			let infoElement = $(currentElement);

			infoElement.attr("title", infoElement.attr("aria-label").replace("Minuten,", "Minuten"));

			VideoID = VideoID.replace("https://www.youtube.com", "").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];

			if (GetVideoWatched(scannedVideoArray, false, VideoID)) {
				if (currentElement.children[0].style.backgroundImage.contains("linear-gradient") == false) {
					currentElement.children[0].style.backgroundImage = "linear-gradient(rgba(151, 255, 139, 0.45), rgba(151, 255, 139, 0.45)), " + currentElement.children[0].style.backgroundImage;
				}
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				continue;
			}
			else if (GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID)) {
				if (currentElement.children[0].style.backgroundImage.contains("linear-gradient") == false) {
					currentElement.children[0].style.backgroundImage = "linear-gradient(rgba(166, 235, 158, 0.45), rgba(166, 235, 158, 0.45)), " + currentElement.children[0].style.backgroundImage;
				}
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				continue;
			}

			for (let j = 0; j < TabNoc.Settings.UninterestingVideos.length; j++) {
				if (infoElement[0].textContent.includes(TabNoc.Settings.UninterestingVideos[j])) {
					if (currentElement.children[0].style.backgroundImage.contains("linear-gradient") == false) {
						currentElement.children[0].style.backgroundImage = "linear-gradient(rgba(255, 175, 175, 0.45), rgba(255, 175, 175, 0.45)), " + currentElement.children[0].style.backgroundImage;
					}
				}
				break;
			}
			for (let j = 0; j < TabNoc.Settings.NotWantedVideos.length; j++) {
				if (infoElement[0].textContent.includes(TabNoc.Settings.NotWantedVideos[j])) {
					//disableVideo
					if (TabNoc.Settings.DeleteNotWantedVideos === true) {
						$(currentElement).remove();
					}
					else {
						currentElement.style.display = "none";
					}
					break;
				}
			}
		}
	}

	function SaveVideoStatistics() {
		if (TabNoc.Settings.Debug === true) {
			console.groupCollapsed("SaveVideoStatistics");
			console.log("SaveVideoStatistics()->" + TabNoc.Variables.VideoStatisticsObject);
		}
		if (TabNoc.Variables.VideoStatisticsObject == null) {
			alert(new Error("Eigentlich würde ich hier gerne eine Fehlermeldung schreiben, wann tritt der Zustand denn immer auf?"));
			return false;
		}
		try {
			let VideoStatisticsObject = JSON.parse(TabNoc.Variables.VideoStatisticsObject);
			VideoStatisticsObject.Watches[VideoStatisticsObject.Watches.length - 1].WatchedLength = Math.round(TabNoc.Variables.WatchedLength);

			TabNoc.Variables.VideoStatisticsObject = JSON.stringify(PushVideoObject(null, JSON.parse(JSON.stringify(VideoStatisticsObject)), true));

			if (TabNoc.Settings.Debug === true) {
				console.groupEnd();
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### https://www.youtube.com/watch?v=* ###

	function UpdateDataBase(functions, silent) {
		silent = false;
		if (functions == null) {
			functions = ({
				lock: GM_Lock,
				unlock: GM_Unlock,
				getValue: GetData,
				setValue: SetData
			});
		} else {
			functions.lock = functions.lock || GM_Lock;
			functions.unlock = functions.unlock || GM_Unlock;
			functions.getValue = functions.getValue || GetData;
			functions.setValue = functions.setValue || SetData;
		}

		var CurrentVersion_WatchedVideoArray = 0;
		var CurrentVersion_ScannedVideoArray = 0;
		var CurrentVersion_VideoObjectDictionary = 4;

		functions.lock();

		// ### WatchedVideoArray-Version ###
		let Version_WatchedVideoArray = JSON.parse(functions.getValue("WatchedVideoArray-Version"));

		// ### ScannedVideoArray-Version ###
		let Version_ScannedVideoArray = JSON.parse(functions.getValue("ScannedVideoArray-Version"));

		// ### VideoObjectDictionary-Version ###
		let Version_VideoObjectDictionary = JSON.parse(functions.getValue("VideoObjectDictionary-Version"));

		// ### WatchedVideoArray ###
		if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
			console.info("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")");
			if (confirm("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")\r\nOK drücken um den Updatevorgang zu starten.") == false) {
				throw new Error("DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.");
			}

			if (Version_WatchedVideoArray === null) {
				// aus der alten Tabelle 'Watched-Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#

				// ### Watched-Videos ###
				let WatchedVideos = JSON.parse(functions.getValue("Watched-Videos") || null);

				if (WatchedVideos != null) {
					functions.setValue("WatchedVideoArray", JSON.stringify(WatchedVideos));
					functions.setValue("WatchedVideoArray-Version-(-1)", JSON.stringify(WatchedVideos));

					if (GM_listValues().indexOf("Watched-Videos") !== -1) {
						GM_deleteValue("Watched-Videos");
					}

					if (GM_listValues().indexOf("Watched-Videos-Version-0") !== -1) {
						GM_deleteValue("Watched-Videos-Version-0");
					}

					if (GM_listValues().indexOf("Watched-Videos-Version-1") !== -1) {
						GM_deleteValue("Watched-Videos-Version-1");
					}

					if (GM_listValues().indexOf("Watched-Videos-Version") !== -1) {
						GM_deleteValue("Watched-Videos-Version");
					}

					functions.setValue("WatchedVideoArray-Version", 0);
					console.log("Die Version der Tabelle WatchedVideoArray wurde auf " + functions.getValue("WatchedVideoArray-Version") + " geändert");
					alert("DataBase:'WatchedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");
				} else {
					functions.setValue("WatchedVideoArray-Version", CurrentVersion_WatchedVideoArray);
					console.log("Die Version der Tabelle WatchedVideoArray wurde auf " + functions.getValue("WatchedVideoArray-Version") + " geändert");
					// alert("DataBase:'WatchedVideoArray' sucessfully initialised!");
				}
			} else {
				// ### WatchedVideoArray ###
				let WatchedVideoArray = JSON.parse(functions.getValue("WatchedVideoArray") || "([])");

				switch (Version_WatchedVideoArray) {
				default:
					throw ("No Update Implemeneted!");
				}
			}
		}
		// ### WatchedVideoArray ###

		// ### ScannedVideoArray ###
		if (Version_ScannedVideoArray != CurrentVersion_ScannedVideoArray) {
			console.info("Es wurde ein Versionsunterschied der Datenbank-Tabelle ScannedVideoArray gefunden (alt: " + Version_ScannedVideoArray + " | aktuell: " + CurrentVersion_ScannedVideoArray + ")");
			if (confirm("Es wurde ein Versionsunterschied der Datenbank-Tabelle ScannedVideoArray gefunden (alt: " + Version_ScannedVideoArray + " | aktuell: " + CurrentVersion_ScannedVideoArray + ")\r\nOK drücken um den Updatevorgang zu starten.") == false) {
				throw new Error("DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.");
			}

			if (Version_ScannedVideoArray === null) {
				// aus der alten Tabelle 'Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#

				// ### Videos ###
				let Videos = JSON.parse(functions.getValue("Videos") || null);

				if (Videos != null) {
					let ScannedVideoArray = ([]);
					let removed = 0;

					for (var element in Videos) {
						element = Videos[element].replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
						if (ScannedVideoArray.indexOf(element) === -1) {
							ScannedVideoArray.push(element);
						} else {
							removed++;
						}
					}

					functions.setValue("ScannedVideoArray", JSON.stringify(ScannedVideoArray));
					functions.setValue("ScannedVideoArray-Version-(-1)", JSON.stringify(Videos));

					if (GM_listValues().indexOf("Videos") !== -1) {
						GM_deleteValue("Videos");
					}

					if (GM_listValues().indexOf("Videos-Version") !== -1) {
						GM_deleteValue("Videos-Version");
					}

					functions.setValue("ScannedVideoArray-Version", 0);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + functions.getValue("ScannedVideoArray-Version") + " geändert");
					alert("DataBase:'ScannedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.\r\nEs wurden " + removed + " doppelte Einträge entfernt.");
				} else {
					functions.setValue("ScannedVideoArray-Version", CurrentVersion_ScannedVideoArray);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + functions.getValue("ScannedVideoArray-Version") + " geändert");
					// alert("DataBase:'ScannedVideoArray' sucessfully initialised!");
				}
			} else {
				// ### ScannedVideoArray ###
				let ScannedVideoArray = JSON.parse(functions.getValue("ScannedVideoArray") || "([])");

				switch (Version_ScannedVideoArray) {
				default:
					throw ("No Update Implemeneted!");
				}
			}
		}
		// ### ScannedVideoArray ###

		// ### VideoObjectDictionary ###
		if (Version_VideoObjectDictionary != CurrentVersion_VideoObjectDictionary) {
			console.info("Es wurde ein Versionsunterschied der Datenbank-Tabelle VideoObjectDictionary gefunden (alt: " + Version_VideoObjectDictionary + " | aktuell: " + CurrentVersion_VideoObjectDictionary + ")");
			if (confirm("Es wurde ein Versionsunterschied der Datenbank-Tabelle VideoObjectDictionary gefunden (alt: " + Version_VideoObjectDictionary + " | aktuell: " + CurrentVersion_VideoObjectDictionary + ")\r\nOK drücken um den Updatevorgang zu starten.") == false) {
				throw new Error("DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.");
			}

			if (Version_VideoObjectDictionary === null) {
				// aus der alten Tabelle 'VideoStatistics' importieren 		#*#!LEGACY CODE!#*#

				// ### VideoStatistics ###
				let VideoStatistics = JSON.parse(functions.getValue("VideoStatistics") || null);

				if (VideoStatistics != null) {
					functions.setValue("VideoObjectDictionary-Version-(-1)", JSON.stringify(VideoStatistics));
					let newStructure = ({
						"unknown": ([])
					});
					let removed = 0;

					if (GM_listValues().indexOf("VideoStatistics") !== -1) {
						GM_deleteValue("VideoStatistics");
					}

					for (let element in VideoStatistics) {
						newStructure.unknown.push(VideoStatistics[element]);
					}

					functions.setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");

					functions.setValue("VideoObjectDictionary", JSON.stringify(newStructure));
				} else {
					functions.setValue("VideoObjectDictionary-Version", CurrentVersion_VideoObjectDictionary);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
					// alert("DataBase:'VideoObjectDictionary' sucessfully initialised!");
				}
			} else {
				// ### VideoObjectDictionary ###
				let videoObjectDictionary = JSON.parse(functions.getValue("VideoObjectDictionary") || "({})");
				let newStructure = ({});
				let count = 0;
				let count2 = 0;

				switch (Version_VideoObjectDictionary) {
					case 0:
					case 1:
						functions.setValue("VideoObjectDictionary-Version-1", JSON.stringify(videoObjectDictionary));

						for (let i in videoObjectDictionary) {
							for (let j in videoObjectDictionary[i]) {
								var newObject = videoObjectDictionary[i][j];
								if (newObject.Watches !== undefined) {
									throw "Was ist das ?";
								}
								newObject.Watches = ([]);
								newObject.Watches.push(({
									WatchedLength: newObject.WatchedLength,
									Date: i
								}));
								delete newObject.WatchedLength;
								newObject.VideoLength = Math.floor(newObject.VideoLength);

								PushVideoObject(newStructure, newObject, false);
								count++;
							}
						}

						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B)");
						if (silent !== true)
							alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B)");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 2);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", JSON.stringify(newStructure));
						} else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;

					case 2:
						if (functions.getValue("VideoObjectDictionary-Version-2") != null) {
							if (functions.getValue("VideoObjectDictionary-Version-2") !== JSON.stringify(videoObjectDictionary)) {
								console.log("Current VideoObjectDictionary-Version-2 Data");
								console.log(JSON.parse(functions.getValue("VideoObjectDictionary-Version-2")));
								console.log("New VideoObjectDictionary-Version-2 Data");
								console.log(JSON.parse(JSON.stringify(videoObjectDictionary)));
								if (confirm("Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]") === true) {
									functions.setValue("VideoObjectDictionary-Version-2", JSON.stringify(videoObjectDictionary));
								} else {
									if (confirm("Soll der Vorgang ohne Backup fortgesetzt werden?") !== true) {
										throw new Error("Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt");
									}
								}
							} else {
								console.log("VideoObjectDictionary-Version-2 was already set with same Data");
							}
						} else {
							functions.setValue("VideoObjectDictionary-Version-2", JSON.stringify(videoObjectDictionary));
						}

						newStructure = JSON.parse(JSON.stringify(videoObjectDictionary));
						let regex = new RegExp(/(\d{1,2}).(\d{1,2}).(\d{4})(.*,.*\d{2}:\d{2}:\d{2})?/);

						for (let i in videoObjectDictionary) {
							for (let j in videoObjectDictionary[i].Watches) {
								if (videoObjectDictionary[i].Watches[j].Date === "unknown" || videoObjectDictionary[i].Watches[j].Date == null) {
									// "unknown" is a good string, but null seems to be better (NullPointer Exception is easy to find)
									newStructure[i].Watches[j].Date = null;
									count2++;
									// EDIT: 14.08.2017 (DataBaseVersion 4)
									// have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
									newStructure[i].Watches[j].Date = "unknown";
								} else {
									if (isNaN(new Date(videoObjectDictionary[i].Watches[j].Date).getTime()) === false) {
										newStructure[i].Watches[j].Date = new Date(videoObjectDictionary[i].Watches[j].Date).toString();
									} else {
										let matches = videoObjectDictionary[i].Watches[j].Date.match(regex);
										if (matches.length === 5 && matches[4] != undefined) {
											var newDate = new Date(matches[2] + "/" + matches[1] + "/" + matches[3] + matches[4]);
										}
										// das Datum {videoObjectDictionary[i].Watches[j].Date} vom Datensatz {JSON.stringify(videoObjectDictionary[i])} auf die Zeit 00:00:00Uhr setzen
										else {
											let newDate = new Date(matches[2] + "/" + matches[1] + "/" + matches[3]);
										}
										if (isNaN(newDate.getTime()) === false) {
											newStructure[i].Watches[j].Date = newDate.toString();
										} else {
											alert(videoObjectDictionary[i].Watches[j].Date);
											throw new Error("The converted Date is not a Date Object");
										}
									}
								}
								count++;
							}
						}

						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent !== true)
							alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 3);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", JSON.stringify(newStructure));
						} else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;

					case 3:
						if (functions.getValue("VideoObjectDictionary-Version-3") != null) {
							if (functions.getValue("VideoObjectDictionary-Version-3") !== JSON.stringify(videoObjectDictionary)) {
								console.log("Current VideoObjectDictionary-Version-3 Data");
								console.log(JSON.parse(functions.getValue("VideoObjectDictionary-Version-3")));
								console.log("New VideoObjectDictionary-Version-3 Data");
								console.log(JSON.parse(JSON.stringify(videoObjectDictionary)));
								if (confirm("Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]") === true) {
									functions.setValue("VideoObjectDictionary-Version-3", JSON.stringify(videoObjectDictionary));
								} else {
									if (confirm("Soll der Vorgang ohne Backup fortgesetzt werden?") !== true) {
										throw new Error("Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt");
									}
								}
							} else {
								console.log("VideoObjectDictionary-Version-3 was already set with same Data");
							}
						} else {
							functions.setValue("VideoObjectDictionary-Version-3", JSON.stringify(videoObjectDictionary));
						}

						newStructure = JSON.parse(JSON.stringify(videoObjectDictionary));

						for (let i in videoObjectDictionary) {
							for (let j in videoObjectDictionary[i].Watches) {
								if (videoObjectDictionary[i].Watches[j].Date === "unknown" || videoObjectDictionary[i].Watches[j].Date == null || new Date(videoObjectDictionary[i].Watches[j].Date).getTime() === 0) {
									// have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
									newStructure[i].Watches[j].Date = "unknown";
									count2++;
								} else if (isNaN(new Date(videoObjectDictionary[i].Watches[j].Date).getTime()) === true) {
									console.error(videoObjectDictionary[i].Watches[j].Date);
									throw new Error("Es wurde ein defektes Datum gefunden, hier geht es nicht weiter\r\nMich bitte Informieren");
								}
								count++;
							}
						}

						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent !== true)
							alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + JSON.stringify(videoObjectDictionary).length + "B | neue Datenmenge: " + JSON.stringify(newStructure).length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 4);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", JSON.stringify(newStructure));
						} else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;

					default:
						throw ("No Update Implemeneted!");
				}
			}
		}
		// ### VideoObjectDictionary ###

		if (CurrentVersion_WatchedVideoArray != JSON.parse(functions.getValue("WatchedVideoArray-Version")) ||
			CurrentVersion_ScannedVideoArray != JSON.parse(functions.getValue("ScannedVideoArray-Version")) ||
			CurrentVersion_VideoObjectDictionary != JSON.parse(functions.getValue("VideoObjectDictionary-Version"))) {
			UpdateDataBase(functions, silent);
		}

		functions.unlock();
	}

	function GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID) {
		// If videoObjectDictionary is false ignore Elements from Dictionary (only check Elements from WatchedVideoArray)
		if (videoObjectDictionary !== false) {
			if (videoObjectDictionary === null) {
				videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);
			}
			if (videoObjectDictionary[VideoID] !== undefined) {
				return true;
			}
		}

		// If watchedVideoArray is false ignore Elements from Array (only check Elements from VideoObjectDictionary)
		if (watchedVideoArray !== false) {
			if (watchedVideoArray === null || watchedVideoArray === undefined) {
				watchedVideoArray = GetData("WatchedVideoArray", "([])", true);
			}
			if (watchedVideoArray.indexOf(VideoID) !== -1) {
				console.info("found Video only in old Declarationtable");
				return true;
			}
		}
		return false;
	}

	function PushVideoObject(videoObjectDictionary, videoObject, save) {
		if (TabNoc.Settings.Debug === true) {
			console.log("Pushing ...", JSON.parse(JSON.stringify(videoObject)));
		}
		if (typeof(videoObject) !== "object") {
			throw "WrongTypeException:Only Objects can be Pushed into the Database.";
		}
		if (videoObjectDictionary === null) {
			GM_Lock();
			videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);
			save = true;
			if (TabNoc.Settings.Debug === true) {
				console.log("Loading videoObjectDictionary ...");
			}
		}

		if (videoObjectDictionary[videoObject.VideoID] === undefined) {
			videoObjectDictionary[videoObject.VideoID] = videoObject;
			if (TabNoc.Settings.Debug === true) {
				// console.log("... Pushed");
			}
		}
		else {
			videoObjectDictionary[videoObject.VideoID] = MergeVideoObjects(videoObjectDictionary[videoObject.VideoID], videoObject);
			if (TabNoc.Settings.Debug === true) {
				console.log(JSON.parse(JSON.stringify(videoObjectDictionary[videoObject.VideoID])), "... Merged PushRequest");
			}
		}

		if (videoObjectDictionary[videoObject.VideoID] == null) {
			console.log("deleted ID: >" + videoObject.VideoID + "<. The Value was " + videoObjectDictionary[videoObject.VideoID]);
			delete videoObjectDictionary[videoObject.VideoID];
		}

		if (videoObject.VideoID == null) {
			console.log("deleted ID: >" + videoObject.VideoID + "<. The Value was " + videoObjectDictionary[videoObject.VideoID]);
			delete videoObjectDictionary[videoObject.VideoID];
		}

		if (save === true) {
			SetData("VideoObjectDictionary", JSON.stringify(videoObjectDictionary), true, false);
			GM_Unlock();
			if (TabNoc.Settings.Debug === true) {
				console.log("Saveing videoObjectDictionary ...");
			}
		}

		return videoObjectDictionary[videoObject.VideoID];
	}

	function GetElementCount(videoObjectDictionary) {
		if (videoObjectDictionary === null) {
			videoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);
		}
		var count = 0;
		for (var i in videoObjectDictionary) {
			count++;
		}
		return count;
	}

	function MergeVideoObjects(videoObject_1, videoObject_2) {
		const forceMerge = true;
		if (TabNoc.Settings.Debug === true) {
			console.log("Merging ...");
		}
		videoObject_1 = JSON.parse(JSON.stringify(videoObject_1));
		videoObject_2 = JSON.parse(JSON.stringify(videoObject_2));

		let namesArray = ([]);
		for (let i in videoObject_1) {
			if (namesArray.indexOf(i) === -1) {
				namesArray.push(i);
			}
		}
		for (let i in videoObject_2) {
			if (namesArray.indexOf(i) === -1) {
				namesArray.push(i);
			}
		}

		for (let i in namesArray) {
			let objectIndex = namesArray[i];
			if (videoObject_1[objectIndex] === undefined || videoObject_2[objectIndex] === undefined) {
				console.error(objectIndex, videoObject_1, videoObject_2, videoObject_1[objectIndex], videoObject_2[objectIndex]);
				if (confirm("Beim zusammenführen zwei unterschiedlicher Versionen wurden undefinierte Einträge gefunden. Sollen diese gelöscht werden?") == true) {
					let canContinue = false;
					switch (objectIndex) {
					case "VideoID":
						if (videoObject_1[objectIndex] === undefined) {
							videoObject_1 = null;
						}
						if (videoObject_2[objectIndex] === undefined) {
							videoObject_2 = null;
						}
						canContinue = false;
						break;

					default:
						console.error("Es wurde keine Behandlung für das Fehlen dieser Information (" + objectIndex + ") definiert");
						console.log(videoObject_1);
						console.log(videoObject_2);
						alert("Es wurde keine Behandlung für das Fehlen dieser Information (" + objectIndex + ") definiert!\r\nSiehe Konsole für mehr Informationen.");
						throw new Error("NotDefinedException");
					}
					if (canContinue == false) {
						break;
					}
				} else {
					throw new Error("videoObject_1[objectIndex] or videoObject_2[objectIndex] is undefined");
				}
			}
			if (JSON.stringify(videoObject_1[objectIndex]) !== JSON.stringify(videoObject_2[objectIndex]) || (forceMerge == true && objectIndex == "Watches")) {
				switch (objectIndex) {
					case "Watches":
						let newArray = ([]);
						for (let index1_i in videoObject_1.Watches) {
							if (videoObject_1.Watches == null) {
								continue;
							}
							if (videoObject_1.Watches[index1_i] == null) {
								continue;
							}

							let found = false;
							for (let index2_i in videoObject_2.Watches) {
								if (videoObject_1.Watches[index1_i].Date == "unknown" && videoObject_1.Watches[index1_i].WatchedLength == -99) {
									found = true;
									break;
								}

								// beide identisch
								if (JSON.stringify(videoObject_1.Watches[index1_i]) === JSON.stringify(videoObject_2.Watches[index2_i])) {
									newArray.push(JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])));
									delete videoObject_2.Watches[index2_i];
									found = true;
									continue;
								}

								// check if the Dates are valid
								if (isNaN(new Date(videoObject_1.Watches[index1_i].Date).getTime()) === true) {
									if (videoObject_1.Watches[index1_i].WatchedLength < 0) {
										// das Element wird NICHT in das neue Object eingefügt (der Wert wird gelöscht)
										found = true;
										break;
									}
									if (videoObject_1.Watches[index1_i].Date != "unknown") {
										console.info("Wrong index1_i: " + index1_i);
										console.error(videoObject_1.Watches);
										alert(videoObject_1.Watches[index1_i].Date);
										throw new Error("The converted Date is not a Date Object");
									}
								}
								if (isNaN(new Date(videoObject_2.Watches[index2_i].Date).getTime()) === true) {
									if (videoObject_2.Watches[index2_i].Date != "unknown") {
										console.info("Wrong index2_i: " + index2_i);
										console.error(videoObject_2.Watches);
										alert(videoObject_2.Watches[index2_i].Date);
										throw new Error("The converted Date is not a Date Object");
									}
								}

								if (new Date(videoObject_1.Watches[index1_i].Date).getTime() === new Date(videoObject_2.Watches[index2_i].Date).getTime() ||
									(isNaN(new Date(videoObject_1.Watches[index1_i].Date).getTime()) === true && isNaN(new Date(videoObject_2.Watches[index2_i].Date).getTime()))) {
									// Same Date and Time from Website Call or both are NaN, thats the same, choose the highest WatchedLength
									videoObject_1.Watches[index1_i].WatchedLength = Math.max(videoObject_1.Watches[index1_i].WatchedLength, videoObject_2.Watches[index2_i].WatchedLength);
									newArray.push(JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])));
									delete videoObject_2.Watches[index2_i];
									found = true;
								}
							}

							if (found === false) {
								// Der Eintrag ist nur im ersten Element vorhanden -> hinzufügen
								newArray.push(JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])));
							}
						}
						if (videoObject_2.Watches.length !== 0) {
							// ich füge diese Elemente jetzt erstmal dazu, weiß nicht so genau ob ich noch einen Fehler haben könnte
							for (var j in videoObject_2.Watches) {
								if (videoObject_2.Watches[j] != null) {
									newArray.push(JSON.parse(JSON.stringify(videoObject_2.Watches[j])));
								}
							}
						}

						let changed = false;
						do {
							changed = false;
							// Ab hier ist das Array fertig gemerged, jetzt wird aufgeräumt
							for (let index1 in newArray) {
								for (let index2 in newArray) {
									if (index1 == index2) {
										continue;
									}

									// Wenn die beiden Zeitstempel weniger als 120 sekunden auseinander liegen
									if (Math.abs(Math.floor(new Date(newArray[index1].Date).getTime() - (new Date(newArray[index2].Date).getTime())) / 1000) < 120) {
										// Dann nutze den früheren Zeitstempel

										newArray[index1].Date = new Date(Math.min(new Date(newArray[index1].Date).getTime(), new Date(newArray[index2].Date).getTime())).toString();
										newArray[index1].WatchedLength = Math.max(newArray[index1].WatchedLength, newArray[index2].WatchedLength);

										if (isNaN(new Date(newArray[index1].Date).getTime()) === true) {
											alert(newArray[index1]);
											throw new Error("The converted Date is not a Date Object");
										}

										newArray.splice(index2, 1);

										changed = true;
										break;
									}
									// Wenn die beiden Zeitstempel NaN sind und WatchedLength gleich ist -> eines entfernen
									if (isNaN(new Date(newArray[index1].Date).getTime()) === true && isNaN(new Date(newArray[index2].Date).getTime()) === true) {
										// Dann lösche den 2. Eintrag

										newArray.splice(index2, 1);

										changed = true;
										break;
									}
								}
								if (changed == true) {
									break;
								}
							}
						} while (changed === true);

						// gleichstellen, damit vergleich funktioniert
						videoObject_1.Watches = JSON.parse(JSON.stringify(newArray));
						videoObject_2.Watches = JSON.parse(JSON.stringify(newArray));
						break;

					case "VideoLength":
						var VideoLength = Math.max(videoObject_1.VideoLength, videoObject_2.VideoLength);
						videoObject_1.VideoLength = JSON.parse(VideoLength);
						videoObject_2.VideoLength = JSON.parse(VideoLength);
						break;

					case "VideoTitle":
						if (videoObject_1.VideoTitle === "") {
							videoObject_2.VideoTitle = videoObject_1.VideoTitle;
						} else if (videoObject_2.VideoTitle === "") {
							videoObject_1.VideoTitle = videoObject_2.VideoTitle;
						} else {
							if (confirm(String.format("Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video \"{0}\" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nVideoTitel: {1}\r\n\r\n\tEintrag 2 :\r\nVideoTitel: {2}\r\n(Der erste Eintrag ist meist der ältere)\r\n\r\nSoll der 1. Eintrag verwendet werden?", videoObject_1.VideoID, videoObject_1.VideoTitle, videoObject_2.VideoTitle)) === true) {
								videoObject_1.VideoTitle = videoObject_2.VideoTitle;
							} else {
								videoObject_2.VideoTitle = videoObject_1.VideoTitle;
							}
						}
						break;

					case "VideoAuthor":
						if (videoObject_1.VideoAuthor === "") {
							videoObject_2.VideoAuthor = videoObject_1.VideoAuthor;
						} else if (videoObject_2.VideoAuthor === "") {
							videoObject_1.VideoAuthor = videoObject_2.VideoAuthor;
						} else {
							if (confirm(String.format("Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video \"{0}\" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nYoutube-Kanal: {1}\r\n\r\n\tEintrag 2 :\r\nYoutube-Kanal: {2}\r\n(Der erste Eintrag ist meist der ältere)\r\n\r\nSoll der 1. Eintrag verwendet werden?", videoObject_1.VideoID, videoObject_1.VideoAuthor, videoObject_2.VideoAuthor)) === true) {
								videoObject_1.VideoAuthor = videoObject_2.VideoAuthor;
							} else {
								videoObject_2.VideoAuthor = videoObject_1.VideoAuthor;
							}
						}
						break;

					default:
						// console.error("Für diesen Spezialfall des Objekts \"" + objectIndex + "\" wurde kein automatisches Zusammenführen definiert!");
						// console.log(videoObject_1);
						// console.log(videoObject_2);
						// alert("Für diesen Spezialfall des Objekts \"" + objectIndex + "\" wurde kein automatisches Zusammenführen definiert!\r\nSiehe Konsole für mehr Informationen.");
						// throw "NotDefinedException"
						console.error("Für diesen Unterschied wurde kein automatisches Zusammenführen definiert![" + objectIndex + "]");
						console.log(videoObject_1);
						console.log(videoObject_2);
						alert("Für diesen Unterschied wurde kein automatisches Zusammenführen definiert!\r\nSiehe Konsole für mehr Informationen.");
						throw new Error("NotDefinedException");
				}
			}
		}

		if (JSON.stringify(videoObject_1) != JSON.stringify(videoObject_2)){
			console.error("JSON.stringify(videoObject_1) != JSON.stringify(videoObject_2)", videoObject_1, videoObject_2);
		}
		if (videoObject_1 == null) {
			return null;
		}
		return JSON.parse(JSON.stringify(videoObject_1));
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
					alert("Statuscode:" + response.status);
					Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
					return;
				}
				if (response.responseText.charAt(0) === '#') {
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
					var responseData = JSON.parse(response.responseText);
					console.info("Server response Data:", responseData);
					if (responseData.VideoObjectDictionary != null && responseData.WatchedVideoArray != null) {
						Feedback.lockProgress();
						ImportData(responseData, TabNoc.Variables.ImportDataProperties);
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
				element.WatchedVideoArray = GetData("WatchedVideoArray", "([])", true);
				element.ScannedVideoArray = GetData("ScannedVideoArray", "([])", true);
				element.VideoObjectDictionary = GetData("VideoObjectDictionary", "({})", true);
				element["VideoObjectDictionary-Version"] = GetData("VideoObjectDictionary-Version", 0, true);
				element["WatchedVideoArray-Version"] = GetData("WatchedVideoArray-Version", 0, true);
				element["ScannedVideoArray-Version"] = GetData("ScannedVideoArray-Version", 0, true);
				GM_xmlhttpRequest({
					data: JSON.stringify({
						Token: Token,
						data: JSON.stringify(element)
					}),
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
			data: JSON.stringify({
				Token: Token
			}),
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

	function ModuleImport(moduleName, moduleFunction, expectedVersion) {
		let currentVersion = moduleFunction().Version;
		let versionCompareResult = versionCompare(currentVersion, expectedVersion);
		var versionData = GetData("ImportVersion", "({show: true})", true);
		versionData[moduleName] = versionData[moduleName] || ({});
		if (versionData.show == true && versionData[moduleName].Version != currentVersion && versionData[moduleName].Version != undefined) {
			alert("Das Modul " + moduleName + " wurde von Version " + versionData[moduleName].Version + " auf Version " + currentVersion + " aktualisiert (Die erwartete Version ist " + expectedVersion + ")");
		}

		if (versionCompareResult != 0) {
			var msg = "Das geladene Modul: \"" + moduleName + "\" ist " + (versionCompareResult < 0 ? "älter" : "neuer") + " als die konfigurierte Version";
			msg += "\r\nDie erwartete Version ist: " + expectedVersion + " gegeben ist: " + currentVersion;
			console.info(msg);
			if (versionData[moduleName].skipNotification !== currentVersion && !confirm(msg + "\r\n\r\nSoll diese Meldung für diese Version des Moduls weiterhin angezeigt werden?")) {
				versionData[moduleName].skipNotification = currentVersion;
			}
		}
		versionData[moduleName].Version = currentVersion;
		SetData("ImportVersion", JSON.stringify(versionData), true, false);
	}

	function Main() {
		ModuleImport("States", getStatesVersion, "1.2.8");
		ModuleImport("TabNoc_GM", getTabNoc_GMVersion, "2.0.2");
		ModuleImport("TabNoc", getTabNocVersion, "1.2.4");
		ModuleImport("ImportAll", getImportAllVersion, "1.1.0");

		// ModuleImport("VideoGreyDetector", getVideoGreyDetectorVersion, "1.0.0");
/*
		if (document.URL.contains("feature=youtu.be")) {
			console.info("URL contains feature=youtu.be, skipping execution");
			return;
		}
*/
		var count = 0;
		while (GM_Locked() == true) {
			setTimeout(function () {
				if (document.getElementById("movie_player") != null) {
					document.getElementById("movie_player").pauseVideo();
				}
			}, 0);
			count = count + 1;
			alert("Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!");
			if (count >= 2) {
				if (confirm("Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?") === true) {
					GM_Unlock(true);
				}
			}
		}

		GM_addStyle(GM_getResourceText("JqueryUI"));
		UpdateDataBase();

		GM_addStyle(GM_getResourceText("JDiffAnno"));
		GM_addStyle(GM_getResourceText("JDiffHtml"));

		console.log("$(\"#app-drawer\"): ", $("#app-drawer"));
		if (!($("#app-drawer").length == 1 && $("#app-drawer")[0].nodeName == "DOM-MODULE")) {
			// alert("Der Support für das alte YoutubeLayout wurde mit Version 2.3.1 (02.09.2017) entfernt, wenn dies erforderlich ist bitte zur alten Version zurückkehren");
		}

		// SubscriptionPage
		if ($("ytd-grid-renderer").length >= 1 || $("ytd-video-renderer").length >= 1 || $("ytd-grid-video-renderer").length >= 1 || true) {
			$(SubscriptionPageLoader);
		}
		else {
			alert("MarkOpenedVideos.user.js:Main() -> No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}

	execTime("Main", Main);

	console.info(String.format("MarkOpenedVideos.user.js[Version: {0}, Autoupdate: {1}] readed", GM_info.script.version, GM_info.scriptWillUpdate));
}
catch (exc) {
	console.error(exc);
	ErrorHandler(exc, "Exception in UserScript");
	alert(exc);
}


