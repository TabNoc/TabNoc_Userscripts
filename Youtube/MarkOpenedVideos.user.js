// ==UserScript==
// @name        MarkOpenedVideos
// @namespace   TabNoc
// @include     https://www.youtube.com/feed/subscriptions*
// @include     https://www.youtube.com/user/*/videos*
// @include     https://www.youtube.com/channel/*
// @include     https://www.youtube.com/channel/*/videos*
// @include     https://www.youtube.com/channel/*/featured*
// @include     https://www.youtube.com/watch?*v=*
// @include     https://www.youtube.com/results?*
// @include     https://www.youtube.com/feed/history
// @include     https://www.youtube.com/
// @version     2.2.9_21082017
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/GM__.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/TabNoc.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/String.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/Youtube/Dialog.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/jquery_ui/jquery-ui.min.js
// @resource	JqueryUI https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/jquery_ui/jquery-ui.min.css
// @require     https://github.com/trentrichardson/jQuery-Impromptu/raw/master/dist/jquery-impromptu.min.js
// @resource	Impromptu https://github.com/trentrichardson/jQuery-Impromptu/raw/master/dist/jquery-impromptu.min.css
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
	changed:	- merging Intervalls from WatchingVideo to WatchingVideoInterval
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
*/

try {
	setTabNoc({
		Variables: {
			MarkToggleState: true,
			
			WatchedLength: 0,
			WatchingVideoInterval: null,
			HasSavedDataOnEnd: false,
			
			OldVideoID: unsafeWindow.document.getElementById("movie_player") && unsafeWindow.document.getElementById("movie_player").getVideoData().video_id,
			
			VideoStatisticsObject: null,
			
			checkElementsInterval : null,
			lastCheckItemCount:0,
			lastCheckVideoIdAmount:0,
			lastCheckWatchedVideoAmount:0,
			lastCheckVideoObjectAmount:0,
			
			MultiRow: false,
			LastFullScreenElement: null,
			
			Data: ({})
		},

		Settings: {
			SavingEnabled: true,
			TimerInterval: 5000,
			UninterestingVideos: (["Recht für YouTuber:"]),
			NotWantedVideos: (["Arumba Plays DOTA", "Europa Universalis IV", "Let's Play Crusader Kings 2", "Challenge WBS:", "Let's Play Civilization VI", "Let's Play Galactic Civilizations 3", "The Binding of Isaac ", "Civilization 6", "Endless Space", "Galactic Cililisations 3", "Civilization V", "Let's Play Stellaris", "SPAZ2", "EU4", "Factorio S7E"]),
			DeleteNotWantedVideos: false,
			HideAlreadyWatchedVideos: false,
			ShowAlreadyWatchedDialog: true,
			Debug: true
		},

		HTML: {
		}
	});

	// ### https://www.youtube.com/feed/subscriptions ###
	function SubscriptionPageLoader() {
		console.log("MarkOpenedVideos.user.js loading [SubscriptionPageLoader]");
		try {
			registerTabNoc();
			
			if (TabNoc.Variables.NewYoutubeLayout === true) {
				if ($("ytd-two-column-browse-results-renderer").width() == 1284) {
					$("ytd-two-column-browse-results-renderer").css("width", "1356px");
				}
			}
			else {
				if (document.getElementById("content").clientWidth == 1262) {
					document.getElementById("content").style.width = "1330px";
				}
				if (document.getElementById("content").clientWidth == 850) {
					document.getElementById("content").style.width = "886px";
				}
				if ($(".yt-shelf-grid-item").length > 0) {
					TabNoc.Variables.MultiRow = true;
					if (TabNoc.Settings.Debug === true) {
						console.log("MultiRow found!");
					}
				}
			}
			
			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.TimerInterval);
			startCheckElements(TabNoc.Variables.MarkToggleState);
			console.log("MarkOpenedVideos.user.js executed");

			console.log("MarkOpenedVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function registerTabNoc() {
		// //ResetDataBaseVersion
		// exportFunction(function(){
			// if (confirm("Sollen wirklich die Versionen von allen Tabellen gelöscht werden?") !== true) {return;}
			// // ### WatchedVideoArray-Version ###
			// Version_WatchedVideoArray = eval(GM_getValue("WatchedVideoArray-Version"));
			// if (Version_WatchedVideoArray != null) {
				// GM_deleteValue("WatchedVideoArray-Version")
			// }
			
			// // ### ScannedVideoArray-Version ###
			// Version_ScannedVideoArray = eval(GM_getValue("ScannedVideoArray-Version"));
			// if (Version_ScannedVideoArray != null) {
				// GM_deleteValue("ScannedVideoArray-Version")
			// }
			
			// // ### VideoObjectDictionary-Version ###
			// Version_VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary-Version"));
			// if (Version_VideoObjectDictionary != null) {
				// GM_deleteValue("VideoObjectDictionary-Version")
			// }
		// }, unsafeWindow, {
			// defineAs: "ResetDataBaseVersion"
		// });
		
		GM_registerMenuCommand("Hide Watched Videos", function () {
			TabNoc.Settings.HideAlreadyWatchedVideos = true;
			startCheckElements(true, true);
		});
		
		GM_registerMenuCommand("Test", function () {
			exportFunction(returnExec(function(arg1, arg2, arg3){return GM_xmlhttpRequest(arg1, arg2, arg3);}), unsafeWindow.TabNoc_GM, {
				defineAs : "GM_xmlhttpRequest"
			});
			// GM_xmlhttpRequest({
				// data: "Token=bla&data=abcdefghijklmnopqrstuvwxyz",
				// method: "POST",
				// headers: {
					// "Content-Type": "application/x-www-form-urlencoded"
				// },
				// onabort: (function(response){console.log("onabort");console.info(response);}),
				// onerror: (function(response){console.log("onerror");console.info(response);}),
				// onload: (function(response){console.log("onload_Input");console.info(response);}),
				// // onprogress: (function(response){console.log("onprogress");}),
				// // onreadystatechange: (function(response){console.log("onreadystatechange");}),
				// ontimeout: (function(response){console.log("ontimeout");console.info(response);}),
				// timeout: 60000,
				// url: "https://tabnoc.gear.host//MyDataFiles//Input"
			// });
			GM_xmlhttpRequest({
				data: "Token=bla&data=abcdefghijklmnopqrstuvwxyz",
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				onabort: (function(response){console.log("onabort");console.info(response);}),
				onerror: (function(response){console.log("onerror");console.info(response);}),
				onload: (function(response){console.log("onload_Output");console.info(response);}),
				// onprogress: (function(response){console.log("onprogress");}),
				// onreadystatechange: (function(response){console.log("onreadystatechange");}),
				ontimeout: (function(response){console.log("ontimeout");console.info(response);}),
				timeout: 60000,
				url: "https://tabnoc.gear.host//MyDataFiles//Output"
			});
	
			//jQuery.post("https://tabnoc.gear.host/MyDataFiles/Output", {bla:"Baum!"}, function(data){console.log(data);}).fail(function(){console.log("failed");});
		});
		
		GM_registerMenuCommand("ManuelleSyncronisation", function () {
			Syncronisieren()
		});
		
		GM_registerMenuCommand("ImportData", function () {
			ImportData();
		});
		
		GM_registerMenuCommand("ExportData", function () {
			$.prompt(ImportExportDialog);
		});
		
		GM_registerMenuCommand("ExportAllData", function () {
			var element = ({});
			element.WatchedVideoArray = GM_getValue("WatchedVideoArray") || "([])";
			element.ScannedVideoArray = GM_getValue("ScannedVideoArray") || "([])";
			element.VideoObjectDictionary = GM_getValue("VideoObjectDictionary") || "({})";
			element["VideoObjectDictionary-Version"] = eval(GM_getValue("VideoObjectDictionary-Version") || 0);
			element["WatchedVideoArray-Version"] = eval(GM_getValue("WatchedVideoArray-Version") || 0);
			element["ScannedVideoArray-Version"] = eval(GM_getValue("ScannedVideoArray-Version") || 0);
			prompt("Bitte die Exportierten Daten kopieren", element.toSource());
		});
		
		GM_registerMenuCommand("ImportAllData", function () {
			ImportData(true);
		});

		GM_registerMenuCommand("Markieren", function () {
			startCheckElements(!TabNoc.Variables.MarkToggleState);
		});
	}

	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### ScannedVideoArray ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			// ### WatchedVideoArray ###
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### VideoObjectDictionary ###
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			
			if (TabNoc.Variables.NewYoutubeLayout === true) {
				var elements = $("ytd-grid-video-renderer,ytd-video-renderer");
			}
			else {
				var elements = TabNoc.Variables.MultiRow ? $(".yt-shelf-grid-item") : $(".item-section");
			}
			
			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length || 
					TabNoc.Variables.lastCheckVideoIdAmount !== scannedVideoArray.length || 
					TabNoc.Variables.lastCheckWatchedVideoAmount !== watchedVideoArray.length ||
					TabNoc.Variables.lastCheckVideoObjectAmount !== GetElementCount(videoObjectDictionary)) {
				execTime(checkElements, watchedVideoArray.reverse(), scannedVideoArray.reverse(), videoObjectDictionary, elements, ToggleState);
				
				TabNoc.Variables.lastCheckVideoIdAmount = scannedVideoArray.length;
				TabNoc.Variables.lastCheckWatchedVideoAmount = watchedVideoArray.length;
				TabNoc.Variables.lastCheckVideoObjectAmount = GetElementCount(videoObjectDictionary);
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(watchedVideoArray, scannedVideoArray, videoObjectDictionary, elements, ToggleState) {
		var UnScannedElements = 0;
		Feedback.showProgress(0, "Initialised Scan");

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}
		
		for (i = 0; i < elements.length; i++) {
			Feedback.showProgress(i / elements.length * 100, "Analysing Element " + i + " from " + elements.length);
			var currentElement = elements[i];

			if (TabNoc.Variables.NewYoutubeLayout) {
				UnScannedElements = checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) == true ? UnScannedElements : UnScannedElements + 1;
			}
			else {
				if (currentElement.className == "undefined") { console.error(currentElement);throw new Error("no ClassName found"); }
				
				if (currentElement.className.includes("item-section") || currentElement.className.includes("yt-shelf-grid-item")) {
					// ".compact-shelf-view-all-card" -> "Alle Anzeigen" im SideScroler
					if (currentElement.className.includes("compact-shelf-view-all-card") === false) {
						UnScannedElements = checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) == true ? UnScannedElements : UnScannedElements + 1;
					}
				}
				else {
					console.error(currentElement);
				}
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		Feedback.showProgress(100, "Finished " + (elements.length - UnScannedElements) + " elements marked", (TabNoc.Settings.HideAlreadyWatchedVideos === true ? 1000 : 7500), function(){TabNoc.Settings.HideAlreadyWatchedVideos = true;startCheckElements(true, true);Feedback.hideMessage();});
		console.log(String.format("Found {0} Elements ({1} Marked Elements | {2} UnMarked Elements) [{3} Scanned Videos | {4} Watched Videos | {5} Watched Videos(old)]", elements.length, elements.length - UnScannedElements, UnScannedElements, scannedVideoArray.length, Object.keys(videoObjectDictionary).length, watchedVideoArray.length));
	}

	function checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) {
		//return true if checkedElement is already Scanned
		if (TabNoc.Variables.NewYoutubeLayout) {
			var VideoID = $(currentElement).find("#thumbnail")[0].getAttribute("href").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		}
		else {
			var VideoID = $(currentElement).find("." + (TabNoc.Variables.MultiRow ? "yt-uix-sessionlink" : "yt-uix-tile-link"))[0].getAttribute("href").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		}
		
		var setColor = function(color) {
			$(currentElement).css("background-color", color);
			if (TabNoc.Variables.NewYoutubeLayout != true) {
				if (TabNoc.Variables.MultiRow) {
					$(currentElement).find(".yt-lockup-title, .yt-uix-sessionlink, .yt-lockup-byline").css("background-color", color);//yt-lockup-byline yt-uix-sessionlink yt-lockup-title
				}
				else {
					$(currentElement).find(".yt-uix-tile-link, .yt-lockup-description").css("background-color", color);
				}
			}
		};
		
		currentElement.style.borderRadius = "15px";
		currentElement.style.border = "1px solid #ddd";
		currentElement.style.padding = "5px";
		currentElement.style.minHeight = "187px";
		
		if (ToggleState === true) {
			if (GetVideoWatched(scannedVideoArray, false, VideoID)) {
				setColor("rgb(151, 255, 139)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				return true;
			} 
			else if (GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID)) {
				setColor("rgb(166, 235, 158)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				return true;
			}
		}
		else {
			currentElement.children[0].setAttribute("style", "");
		}
		
		for (var i = 0; i < TabNoc.Settings.UninterestingVideos.length; i++) {
			if (TabNoc.Variables.NewYoutubeLayout) {
				if ($(currentElement).find("#video-title")[0].textContent.includes(TabNoc.Settings.UninterestingVideos[i])) {
					setColor("rgb(255, 175, 175)");
				}
			}
			else {
				if ($(currentElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc.Settings.UninterestingVideos[i])) {
					setColor("rgb(255, 175, 175)");
				}
			}
		}
		for (var i = 0; i < TabNoc.Settings.NotWantedVideos.length; i++) {
			if (TabNoc.Variables.NewYoutubeLayout) {
				if ($(currentElement).find("#video-title")[0].textContent.includes(TabNoc.Settings.NotWantedVideos[i])) {
					//disableVideo 
					if (TabNoc.Settings.DeleteNotWantedVideos === true) {
						$(currentElement).remove();
					}
					else {
						currentElement.style.display = "none";
					}
				}
			}
			else {
				if ($(currentElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc.Settings.NotWantedVideos[i])) {
					//disableVideo 
					if (TabNoc.Settings.DeleteNotWantedVideos === true) {
						$(currentElement).remove();
					}
					else {
						currentElement.style.display = "none";
					}
				}
			}
		}
		
		return false;
	}
	
	function getAllElements(from, till) {
		try {
			var start = new Date().getTime();

			GM_Lock();
			// ### ScannedVideoArray ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			// ### WatchedVideoArray ###
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### VideoObjectDictionary ###
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			
			var elements = $(".item-section");

			var fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { return $(element).find(".yt-uix-tile-link")[0].getAttribute("href") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { return $(element).find(".yt-uix-tile-link")[0].getAttribute("href") == till; }) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			tillIndex > elements.length ? elements.length : tillIndex;

			for (i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				if (element.className.includes("item-section")) {
					var currentElementId = $(element).find(".yt-uix-tile-link")[0].getAttribute("href");
					
					if (GetVideoWatched(scannedVideoArray, false, currentElementId) === false && GetVideoWatched(watchedVideoArray, videoObjectDictionary, currentElementId) === false) {
						scannedVideoArray.push(currentElementId);
					}
				} else {
					console.error(element);
				}
			}

			GM_setValueLocked("ScannedVideoArray", scannedVideoArray.toSource());
			GM_Unlock();
			
			startCheckElements(true);
			
			console.log('getAllElements() Execution time: ' + (new Date().getTime() - start));
		}
		catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### https://www.youtube.com/feed/subscriptions ###
	
	// ### https://www.youtube.com/watch?v=* ###
	function VideoPageLoader() {
		console.log("MarkOpenedVideos.user.js loading [VideoPageLoader]");
		try {
			if (unsafeWindow.document.getElementById("movie_player") == null) {return false;}
			
			// SaveVideoStatistics
			// exportFunction(SaveVideoStatistics, unsafeWindow, {
				// defineAs : "SaveVideoStatistics"
			// });
			
			// MarkWatchedVideos
			exportFunction(MarkWatchedVideos, unsafeWindow, {
				defineAs: "MarkWatchedVideos"
			});
			
			// GetVideoWatched
			exportFunction(GetVideoWatched, unsafeWindow, {
				defineAs: "GetVideoWatched"
			});
			
			document.body.onbeforeunload = function() {SaveVideoStatistics();}
			
			WatchingVideo();
			
			console.log("MarkOpenedVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function WatchingVideo() {
		if (TabNoc.Settings.Debug === true) {
			console.log("WatchingVideo()->old: " + TabNoc.Variables.VideoStatisticsObject);
		}
		try {
			// prepare Current VideoStatisticsObject
			TabNoc.Variables.VideoStatisticsObject = {
				VideoID: unsafeWindow.document.getElementById("movie_player").getVideoData().video_id,
				VideoTitle: unsafeWindow.document.getElementById("movie_player").getVideoData().title,
				VideoAuthor: unsafeWindow.document.getElementById("movie_player").getVideoData().author,
				Watches: [{WatchedLength: -99, Date: new Date().toString()}],
				VideoLength: Math.floor(unsafeWindow.document.getElementById("movie_player").getDuration())
			}.toSource();
			
			if (TabNoc.Settings.Debug === true) {
				console.log("WatchingVideo()->new: " + TabNoc.Variables.VideoStatisticsObject);
			}
			
			if (TabNoc.Settings.ShowAlreadyWatchedDialog === true ) {
				if (GetVideoWatched(null, null, eval(TabNoc.Variables.VideoStatisticsObject).VideoID) === true) {
					setTimeout(function(){alert("watched");}, 10);
					Feedback.showMessage("Watched!", "error", 60000);
					console.log("Video already watched!");
				}
			}
			TabNoc.Variables.VideoStatisticsObject = PushVideoObject(null, eval(TabNoc.Variables.VideoStatisticsObject), true).toSource();
			
			// new YT version (the one with the black player) doesn't have this button
			if ($("#watch-more-related-button").length > 0) {
				$("#watch-more-related-button")[0].onclick = function() {setTimeout(MarkWatchedVideos, 1000);return false;}
			}
			MarkWatchedVideos();
			
			TabNoc.Variables.WatchedLength = 0;
			TabNoc.Variables.HasSavedDataOnEnd = false;
			
			TabNoc.Variables.WatchingVideoInterval = setInterval(WatchingVideoIntervalHandler, 1000);
			
			Feedback.notify("Aktuelles Video: " + eval(TabNoc.Variables.VideoStatisticsObject).VideoTitle, 2000);
			console.log("Aktuelles Video: " + eval(TabNoc.Variables.VideoStatisticsObject).VideoTitle + " ID: " + eval(TabNoc.Variables.VideoStatisticsObject).VideoID);
			
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function MarkWatchedVideos() {
		var start = new Date().getTime();
		
		// ### VideoObjectDictionary ###
		videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "([])");
		
		// ### WatchedVideoArray ###
		watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
		
		var elements = $(".video-list-item");
		if (elements.length == undefined || elements.length <= 1) {
			alert("Zu wenig Elemente zum Markieren gefunden.\nBitte prüfen.");
		}
		for (i = 0; i < elements.length; i++) {
			var element = elements[i].children[0].children[0];
			elements[i].style.borderRadius = "10px";
			elements[i].style.border = "1px solid #ddd";
			var href = element.getAttribute("href");
			if (href == null) {
				href = element.children[0].getAttribute("href");
			}
			if (href != null && href != "" && GetVideoWatched(watchedVideoArray, videoObjectDictionary, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				elements[i].style.backgroundColor = "rgb(166, 235, 158)";
			}
		}
		if (document.URL.contains("&list=")) {
			var elements = $("#playlist-autoscroll-list").children();
			if (elements.length == undefined || elements.length <= 1) {
				alert("Zu wenig Elemente zum Markieren gefunden.\nBitte prüfen.");
			}
			for (i = 1; i < elements.length; i++) {
				var element = elements[i].children[1];
				elements[i].style.borderRadius = "10px";
				elements[i].style.border = "1px solid #ddd";
				var href = element.getAttribute("href");
				if (href != null && href != "" && GetVideoWatched(watchedVideoArray, videoObjectDictionary, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
					$(elements[i]).css("background-color", "rgb(166, 235, 158)");
				}
			}
		}
		
		var videoWallElements = $(".ytp-videowall-still");
		if (videoWallElements.length > 0) {
			for (i = 0; i < videoWallElements.length; i++) {
				var href = videoWallElements[i].getAttribute("href");
				if (href != null && href != "" && GetVideoWatched(watchedVideoArray, videoObjectDictionary, href.replace("https://www.youtube.com/watch?", "").split("v=")[1].split("&t=")[0]) === true) {
					videoWallElements[i].children[0].style.backgroundImage = "linear-gradient(rgba(166, 235, 158, 0.45), rgba(166, 235, 158, 0.45)), " + videoWallElements[i].children[0].style.backgroundImage;
				}
			}
		}
		
		console.log('MarkWatchedVideos execution time: ' + (new Date().getTime() - start));
	}
	
	function WatchingVideoIntervalHandler() {
		if (TabNoc.Settings.Debug === true) {
			var start = new Date().getTime();
		}
		try {
			// ############################### TabNoc.Variables.WatchedLengthInterval ###############################
			if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 1 /*Playing*/) {
				TabNoc.Variables.WatchedLength += 1;
				TabNoc.Variables.HasSavedDataOnEnd = false;
			}
			if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 0 && TabNoc.Variables.HasSavedDataOnEnd === false) {
				console.info("PlayerID: " + unsafeWindow.document.getElementById("movie_player").getVideoData().video_id + "; intern ID: " + eval(TabNoc.Variables.VideoStatisticsObject).VideoID + ": finished Video, now Saving an Marking")
				SaveVideoStatistics();
				MarkWatchedVideos();
				TabNoc.Variables.HasSavedDataOnEnd = true;
			}
			if (TabNoc.Variables.WatchedLength % 15 === 1) {
				SaveVideoStatistics();
			}
			// ############################### TabNoc.Variables.WatchedLengthInterval ###############################
			
			// check Fullscreen state Change
			if ((document.mozFullScreenElement == null && TabNoc.Variables.LastFullScreenElement != null) || 
				 (document.mozFullScreenElement != null && (document.mozFullScreenElement.getAttribute("id") != TabNoc.Variables.LastFullScreenElement))) {
				setTimeout(MarkWatchedVideos, 1000);
				TabNoc.Variables.LastFullScreenElement = document.mozFullScreenElement && document.mozFullScreenElement.getAttribute("id");
			}
			
			// ############################### TabNoc.Variables.VideoChangeCheckInterval ###############################
			if (unsafeWindow.document.getElementById("movie_player").getVideoData().video_id != TabNoc.Variables.OldVideoID) {
				// Save Old Statistics
				if (TabNoc.Variables.WatchingVideoInterval != null) {
					clearInterval(TabNoc.Variables.WatchingVideoInterval);
				}
				SaveVideoStatistics();
				TabNoc.Variables.WatchingVideoInterval = null;
				TabNoc.Variables.WatchedLength = null;
				
				// Start On New Link
				TabNoc.Variables.OldVideoID = unsafeWindow.document.getElementById("movie_player").getVideoData().video_id;
				WatchingVideo();
			}
			// ############################### TabNoc.Variables.VideoChangeCheckInterval ###############################
			
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
		if (TabNoc.Settings.Debug === true) {
			var time = (new Date().getTime() - start);
			if (time > 1) {
				console.log('WatchingVideoIntervalHandler execution time: ' + time);
			}
		}
	}
	
	function SaveVideoStatistics(){
		if (TabNoc.Settings.Debug === true) {
			console.log("SaveVideoStatistics()->" + TabNoc.Variables.VideoStatisticsObject);
		}
		if (TabNoc.Variables.VideoStatisticsObject == null){return false;}
		try {
			VideoStatisticsObject = eval(TabNoc.Variables.VideoStatisticsObject);
			VideoStatisticsObject.Watches[VideoStatisticsObject.Watches.length - 1].WatchedLength = TabNoc.Variables.WatchedLength;
			
			PushVideoObject(null, eval(VideoStatisticsObject.toSource()), true);
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### https://www.youtube.com/watch?v=* ###

	// ### https://www.youtube.com/feed/history ### 
	// ### https://www.youtube.com/results?* ### 
	function SearchResultLoader() {
		console.log("MarkOpenedVideos.user.js loading [SearchResultLoader]");
		try {
			MarkSearchResults();
			
			console.log("MarkOpenedVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function MarkSearchResults() {
		var setColor = function(checkElement, color) {
			$(checkElement).css("background-color", color);
			$(checkElement).find(".yt-uix-tile-link, .yt-lockup-description").css("background-color", color);
		};
		
		// ### ScannedVideoArray ###
		var scannedVideoArray = GetData("ScannedVideoArray", "([])");
		
		// ### WatchedVideoArray ###
		var watchedVideoArray = GetData("WatchedVideoArray","([])");
		
		$("#results").css("background", "#f1f1f1");
		$(".yt-lockup-tile").css("border-radius", "15px").css("border", "1px solid #ddd").css("background-color", "white").parent().css("padding", "1px 3px");
		
		var elements = $(".yt-lockup-video");
		for (i = 0; i < elements.length; i++) {
			var href = elements[i].children[0].children[0].children[0].getAttribute("href");
			if (href != null && href != "" && GetVideoWatched(watchedVideoArray, null, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(166, 235, 158)");
			}
		}
	}
	// ### https://www.youtube.com/results?* ### 
	// ### https://www.youtube.com/feed/history ### 
	
	function GetData(keyName, defaultValue) {
		try {
			if (TabNoc.Settings.Debug === true) {
				console.log("GetData(" + keyName + ", " + defaultValue + ")");
			}
			
			var data = GM_getValue(keyName);
			
			if (data == null || data == "") {
				data = defaultValue || null;
			}
			
			if (TabNoc.Variables.Data[keyName] == null) {
				TabNoc.Variables.Data[keyName] = ({});
				var time = (new Date).getTime();
				
				TabNoc.Variables.Data[keyName][time] = data;
				TabNoc.Variables.Data[keyName].latest = time;
			}
			else if (TabNoc.Variables.Data[keyName][TabNoc.Variables.Data[keyName].latest] != data) {
				var time = (new Date).getTime();
				
				TabNoc.Variables.Data[keyName][time] = data;
				TabNoc.Variables.Data[keyName].latest = time;
				
				if (TabNoc.Settings.Debug === true) {
					console.log("Es wurde ein neuer  Eintrag in TabNoc.Variables.Data eingefügt ([" + keyName + "][" + time + "])");
				}
			}
			
			try {
				data = eval(data);
			}
			catch (exc) {
				ErrorHandler(exc, "Die Daten von >" + keyName + "< aus der Datenbank konnten nicht ausgewertet werden");
			}
			return data;
		}
		catch (exc) {
			ErrorHandler(exc);
			throw exc;
		}
	}
	
	function ErrorHandler (exc, msg) {
		if (msg != null && msg != "") {alert(msg);}
		console.error(exc);
		alert(exc);
	}
	
	function UpdateDataBase(functions, silent) {
		silent = false;
		if (functions == null) {
			functions = ({
				lock: GM_Lock,
				unlock: GM_Unlock,
				getValue: GM_getValue,
				setValue: GM_setValue
			});
		}
		else {
			functions.lock = functions.lock || GM_Lock;
			functions.unlock = functions.unlock || GM_Unlock;
			functions.getValue = functions.getValue || GM_getValue;
			functions.setValue = functions.setValue || GM_setValue;
		}
		
		var CurrentVersion_WatchedVideoArray = 0;
		var CurrentVersion_ScannedVideoArray = 0;
		var CurrentVersion_VideoObjectDictionary = 4;
		
		functions.lock();
		
		// ### WatchedVideoArray-Version ###
		Version_WatchedVideoArray = eval(functions.getValue("WatchedVideoArray-Version"));
		
		// ### ScannedVideoArray-Version ###
		Version_ScannedVideoArray = eval(functions.getValue("ScannedVideoArray-Version"));
		
		// ### VideoObjectDictionary-Version ###
		Version_VideoObjectDictionary = eval(functions.getValue("VideoObjectDictionary-Version"));
		
		// ### WatchedVideoArray ###
		if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
			console.info("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")");
			if (confirm("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")\r\nOK drücken um den Updatevorgang zu starten.") == false) {
				throw new Error("DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.");
			}
			
			if (Version_WatchedVideoArray === undefined) {
				// aus der alten Tabelle 'Watched-Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#
				
				// ### Watched-Videos ###
				WatchedVideos = eval(functions.getValue("Watched-Videos") || null);
				
				if (WatchedVideos != null) {
					functions.setValue("WatchedVideoArray", WatchedVideos.toSource());
					functions.setValue("WatchedVideoArray-Version-(-1)", WatchedVideos.toSource());
					
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
				}
				else {
					functions.setValue("WatchedVideoArray-Version", 0);
					console.log("Die Version der Tabelle WatchedVideoArray wurde auf " + functions.getValue("WatchedVideoArray-Version") + " geändert");
					alert("DataBase:'WatchedVideoArray' sucessfully initialised!");
				}
			}
			else {
				// ### WatchedVideoArray ###
				WatchedVideoArray = eval(functions.getValue("WatchedVideoArray") || "([])");
				
				switch (Version_WatchedVideoArray) {
					default:
						throw("No Update Implemeneted!");
						break;
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
			
			if (Version_ScannedVideoArray === undefined) {
				// aus der alten Tabelle 'Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#
				
				// ### Videos ###
				var Videos = eval(functions.getValue("Videos") || null);
				
				if (Videos != null) {
					var ScannedVideoArray = ([]);
					var removed = 0;
					
					for (var element in Videos) {
						element = Videos[element].replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
						if (ScannedVideoArray.indexOf(element) === -1) {
							ScannedVideoArray.push(element);
						} else {
							removed++;
						}
					}
					
					functions.setValue("ScannedVideoArray", ScannedVideoArray.toSource());
					functions.setValue("ScannedVideoArray-Version-(-1)", Videos.toSource());
					
					if (GM_listValues().indexOf("Videos") !== -1) {
						GM_deleteValue("Videos");
					}
					
					if (GM_listValues().indexOf("Videos-Version") !== -1) {
						GM_deleteValue("Videos-Version");
					}
					
					functions.setValue("ScannedVideoArray-Version", 0);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + functions.getValue("ScannedVideoArray-Version") + " geändert");
					alert("DataBase:'ScannedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.\r\nEs wurden " + removed + " doppelte Einträge entfernt.");
				}
				else {
					functions.setValue("ScannedVideoArray-Version", 0);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + functions.getValue("ScannedVideoArray-Version") + " geändert");
					alert("DataBase:'ScannedVideoArray' sucessfully initialised!");
				}
			}
			else {
				// ### ScannedVideoArray ###
				ScannedVideoArray = eval(functions.getValue("ScannedVideoArray") || "([])");
				
				switch (Version_ScannedVideoArray) {
					default:
						throw("No Update Implemeneted!");
						break;
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
			
			if (Version_VideoObjectDictionary === undefined) {
				// aus der alten Tabelle 'VideoStatistics' importieren 		#*#!LEGACY CODE!#*#
				
				// ### VideoStatistics ###
				VideoStatistics = eval(functions.getValue("VideoStatistics") || null);
				
				if (VideoStatistics != null) {
					functions.setValue("VideoObjectDictionary-Version-(-1)", VideoStatistics.toSource());
					var newStructure = ({"unknown": ([])});
					var removed = 0;
					
					if (GM_listValues().indexOf("VideoStatistics") !== -1) {
						GM_deleteValue("VideoStatistics");
					}
					
					for (var element in VideoStatistics) {
						newStructure["unknown"].push(VideoStatistics[element]);
					}
					
					functions.setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");
					
					functions.setValue("VideoObjectDictionary", newStructure.toSource());
				}
				else {
					functions.setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' sucessfully initialised!");
				}
			}
			else {
				// ### VideoObjectDictionary ###
				videoObjectDictionary = eval(functions.getValue("VideoObjectDictionary") || "({})");
				
				switch (Version_VideoObjectDictionary) {
					case 0:
					case 1:
						functions.setValue("VideoObjectDictionary-Version-1", videoObjectDictionary.toSource());
						
						var newStructure = ({});
						var count = 0;
						
						for (var i in videoObjectDictionary) {
							for (var j in videoObjectDictionary[i]) {
								var newObject = videoObjectDictionary[i][j];
								if (newObject.Watches !== undefined) {throw "Was ist das ?"}
								newObject.Watches = ([]);
								newObject.Watches.push(({WatchedLength: newObject.WatchedLength, Date: i}));
								delete newObject.WatchedLength;
								newObject.VideoLength = Math.floor(newObject.VideoLength);
								
								PushVideoObject(newStructure, newObject, false);
								count++;
							}
						}
						
						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
						if (silent !== true) alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 2);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", newStructure.toSource());
						}
						else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;
						
					case 2:
						if (functions.getValue("VideoObjectDictionary-Version-2") != null) {
							if (functions.getValue("VideoObjectDictionary-Version-2") !== videoObjectDictionary.toSource()) {
								console.log("Current VideoObjectDictionary-Version-2 Data");
								console.log(eval(functions.getValue("VideoObjectDictionary-Version-2")));
								console.log("New VideoObjectDictionary-Version-2 Data");
								console.log(eval(videoObjectDictionary.toSource()));
								if (confirm("Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]") === true) {
									functions.setValue("VideoObjectDictionary-Version-2", videoObjectDictionary.toSource());
								}
								else {
									if (confirm("Soll der Vorgang ohne Backup fortgesetzt werden?") !== true) {
										throw new Error("Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt"); 
									}
								}
							}
							else {
								console.log("VideoObjectDictionary-Version-2 was already set with same Data");
							}
						}
						else {
							functions.setValue("VideoObjectDictionary-Version-2", videoObjectDictionary.toSource());
						}
						
						var newStructure = eval(videoObjectDictionary.toSource());
						var count = 0;
						var count2 = 0;
						var regex = new RegExp(/(\d{1,2}).(\d{1,2}).(\d{4})(.*,.*\d{2}:\d{2}:\d{2})?/);
						
						for (var i in videoObjectDictionary) {
							for (var j in videoObjectDictionary[i].Watches) {
								if (videoObjectDictionary[i].Watches[j].Date === "unknown" || videoObjectDictionary[i].Watches[j].Date == null) {
									// "unknown" is a good string, but null seems to be better (NullPointer Exception is easy to find)
									newStructure[i].Watches[j].Date = null;
									count2++;
									// EDIT: 14.08.2017 (DataBaseVersion 4)
									// have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
									newStructure[i].Watches[j].Date = "unknown";
								}
								else {
									if (isNaN(new Date(videoObjectDictionary[i].Watches[j].Date).getTime()) === false) {
										newStructure[i].Watches[j].Date = new Date(videoObjectDictionary[i].Watches[j].Date).toString();
									}
									else {
										var matches = videoObjectDictionary[i].Watches[j].Date.match(regex);
										if (matches.length === 5 && matches[4] != undefined) {
											var newDate = new Date(matches[2] + "/" + matches[1] + "/" + matches[3] + matches[4]);
										}
										// das Datum {videoObjectDictionary[i].Watches[j].Date} vom Datensatz {videoObjectDictionary[i].toSource()} auf die Zeit 00:00:00Uhr setzen 
										else {
											var newDate = new Date(matches[2] + "/" + matches[1] + "/" + matches[3]);
										}
										if (isNaN(newDate.getTime()) === false) {
											newStructure[i].Watches[j].Date = newDate.toString();
										}
										else {
											alert(videoObjectDictionary[i].Watches[j].Date);
											throw new Error("The converted Date is not a Date Object");
										}
									}
								}
								count++;
							}
						}
						
						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent !== true) alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 3);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", newStructure.toSource());
						}
						else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;
						
					case 3:
						if (functions.getValue("VideoObjectDictionary-Version-3") != null) {
							if (functions.getValue("VideoObjectDictionary-Version-3") !== videoObjectDictionary.toSource()) {
								console.log("Current VideoObjectDictionary-Version-3 Data");
								console.log(eval(functions.getValue("VideoObjectDictionary-Version-3")));
								console.log("New VideoObjectDictionary-Version-3 Data");
								console.log(eval(videoObjectDictionary.toSource()));
								if (confirm("Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]") === true) {
									functions.setValue("VideoObjectDictionary-Version-3", videoObjectDictionary.toSource());
								}
								else {
									if (confirm("Soll der Vorgang ohne Backup fortgesetzt werden?") !== true) {
										throw new Error("Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt"); 
									}
								}
							}
							else {
								console.log("VideoObjectDictionary-Version-3 was already set with same Data");
							}
						}
						else {
							functions.setValue("VideoObjectDictionary-Version-3", videoObjectDictionary.toSource());
						}
						
						var newStructure = eval(videoObjectDictionary.toSource());
						var count = 0;
						var count2 = 0;
						
						for (var i in videoObjectDictionary) {
							for (var j in videoObjectDictionary[i].Watches) {
								if (videoObjectDictionary[i].Watches[j].Date === "unknown" || videoObjectDictionary[i].Watches[j].Date == null || new Date(videoObjectDictionary[i].Watches[j].Date).getTime() === 0) {
									// have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
									newStructure[i].Watches[j].Date = "unknown";
									count2++;
								}
								else if (isNaN(new Date(videoObjectDictionary[i].Watches[j].Date).getTime()) === true) {
									throw new Error("Es wurde ein defektes Datum gefunden, hier geht es nicht weiter\r\nMich bitte Informieren");
								}
								count++;
							}
						}
						
						console.log("Die Version der Tabelle VideoObjectDictionary ist " + functions.getValue("VideoObjectDictionary-Version"));
						console.info("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent !== true) alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B).\r\nDabei sind " + count2 + " leere Datumswerte aufgetreten");
						if (silent || confirm("Sollen die Änderungen gespeichert werden?") === true) {
							functions.setValue("VideoObjectDictionary-Version", 4);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + functions.getValue("VideoObjectDictionary-Version") + " geändert");
							functions.setValue("VideoObjectDictionary", newStructure.toSource());
						}
						else {
							throw new Error("Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt");
						}
						break;
						
					default:
						throw("No Update Implemeneted!");
						break;
				}
			}
		}
		// ### VideoObjectDictionary ###
		
		if (CurrentVersion_WatchedVideoArray != eval(functions.getValue("WatchedVideoArray-Version")) ||
			CurrentVersion_ScannedVideoArray != eval(functions.getValue("ScannedVideoArray-Version")) ||
			CurrentVersion_VideoObjectDictionary != eval(functions.getValue("VideoObjectDictionary-Version"))) {
				UpdateDataBase(functions, silent);
		}
		
		functions.unlock();
	}
	
	function ImportData(allData) {
		try {
			if (typeof(allData) == "object") {
				var element = allData;
				element["VideoObjectDictionary-Version"] = element["VideoObjectDictionary-Version"] || 2;
				element["WatchedVideoArray-Version"] = element["WatchedVideoArray-Version"] || 0;
				element["ScannedVideoArray-Version"] = element["ScannedVideoArray-Version"] || 0;
				
				UpdateDataBase(({
						lock: (function(){}),
						unlock: (function(){}),
						getValue: (function(key){return element[key];}),
						setValue: (function(key, value){element[key] = value;})
					}), true);
				
				var errorList = ([]);
				if (element["VideoObjectDictionary-Version"] !== GM_getValue("VideoObjectDictionary-Version")) {
					errorList.push("Die Version vom VideoObjectDictionary passt nicht (Serverversion: " + element["VideoObjectDictionary-Version"] + ", lokale Version: " + GM_getValue("VideoObjectDictionary-Version") + ")");
				}
				if (element["WatchedVideoArray-Version"] !== GM_getValue("WatchedVideoArray-Version")) {
					errorList.push("Die Version vom WatchedVideoArray passt nicht (Serverversion: " + element["WatchedVideoArray-Version"] + ", lokale Version: " + GM_getValue("WatchedVideoArray-Version") + ")");
				}
				if (element["ScannedVideoArray-Version"] !== GM_getValue("ScannedVideoArray-Version")) {
					errorList.push("Die Version vom ScannedVideoArray passt nicht (Serverversion: " + element["ScannedVideoArray-Version"] + ", lokale Version: " + GM_getValue("ScannedVideoArray-Version") + ")");
				}
				
				var msg = "Das Importieren kann nicht durchgeführt werden, da:\r\n";
				for (var i in errorList) {
					msg = msg + "\r\n\t- " + errorList[i];
				}
				if (errorList.length !== 0) {
					alert(msg);
					throw new Error("ImportData impossible!");
				}
				
				console.log(element);
				console.log(eval(element["VideoObjectDictionary"]));
				if (confirm("Sollen die Daten mit den Aktuellen Daten zusammengeführt werden?") !== true) {
					throw new Error("Das Importieren der Daten wurde durch den Benutzer abgebrochen");
				}
				
				element["VideoObjectDictionary"] = eval(element["VideoObjectDictionary"]);
				element["WatchedVideoArray"] = eval(element["WatchedVideoArray"]);
				element["ScannedVideoArray"] = eval(element["ScannedVideoArray"]);
			}
			else if (allData === true) {
				var element = eval(prompt("Bitte die exportierten Daten eintragen"));
			} 
			else {
				var element = ({});
				element.VideoObjectDictionary = eval(prompt("Please insert new VideoObjectDictionary Data"));
				element.WatchedVideoArray = eval(prompt("Please insert new WatchedVideoArray Data"));
				element.ScannedVideoArray = eval(prompt("Please insert new ScannedVideoArray Data"));
			}
			
			if (typeof(element.VideoObjectDictionary) != "object") {
				throw new Error("element.VideoObjectDictionary is not an Object, Import impossible!");
			}
			if (typeof(element.WatchedVideoArray) != "object") {
				throw new Error("element.WatchedVideoArray is not an Object(Array), Import impossible!");
			}
			if (typeof(element.ScannedVideoArray) != "object") {
				throw new Error("element.ScannedVideoArray is not an Object(Array), Import impossible!");
			}
			
			GM_Lock();
			var videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			var watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			var scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			var count_vOD = 0;
			var count_wVA = 0;
			var count_sVA = 0;
			
			var newObject = ({});
			
			if (TabNoc.Settings.Debug) console.info("Importing stored videoObjectDictionary");
			for (var i in videoObjectDictionary) {
				PushVideoObject(newObject, videoObjectDictionary[i], false);
			}
			if (TabNoc.Settings.Debug) {console.info("Importing new videoObjectDictionary");console.info(element.VideoObjectDictionary);}
			for (var i in element.VideoObjectDictionary) {
				PushVideoObject(newObject, element.VideoObjectDictionary[i], false);
				count_vOD++;
			}
			
			var newWatchedStructure = ([]);
			var newScannedStructure = ([]);
			
			if (TabNoc.Settings.Debug) console.info("Importing stored watchedVideoArray");
			for (var i in watchedVideoArray) {
				if (GetVideoWatched(newWatchedStructure, newObject, watchedVideoArray[i]) === false) {
					newWatchedStructure.push(watchedVideoArray[i]);
				}
			}
			if (TabNoc.Settings.Debug) console.info("Importing new watchedVideoArray");
			for (var i in element.WatchedVideoArray) {
				if (GetVideoWatched(newWatchedStructure, newObject, element.WatchedVideoArray[i]) === false) {
					newWatchedStructure.push(element.WatchedVideoArray[i]);
					count_wVA++;
				}
			}
			
			if (TabNoc.Settings.Debug) console.info("Importing stored scannedVideoArray");
			for (var i in scannedVideoArray) {
				if (GetVideoWatched(newScannedStructure, newObject, scannedVideoArray[i]) === false && GetVideoWatched(newWatchedStructure, false, scannedVideoArray[i]) === false) {
					newScannedStructure.push(scannedVideoArray[i]);
				}
			}
			if (TabNoc.Settings.Debug) console.info("Importing new scannedVideoArray");
			for (var i in element.ScannedVideoArray) {
				if (GetVideoWatched(newScannedStructure, newObject, element.ScannedVideoArray[i]) === false && GetVideoWatched(newWatchedStructure, false, element.ScannedVideoArray[i]) === false) {
					newScannedStructure.push(element.ScannedVideoArray[i]);
					count_sVA++;
				}
			}
			
			alert("Das Importieren wurde erfolgreich abgeschlossen!\r\n" +
				"VideoObjectDictionary:\r\n" +
				"\tEs wurden " + count_vOD + " Elemente aktualisiert (gespeicherte Datenmenge: " + videoObjectDictionary.toSource().length + "B (" + Object.keys(videoObjectDictionary).length + ") | importierte Datenmenge: " + element.VideoObjectDictionary.toSource().length + "B (" + Object.keys(element.VideoObjectDictionary).length + ") | neue Datenmenge: " + newObject.toSource().length + "B) (" + Object.keys(newObject).length + ")\r\n" +
				"WatchedVideoArray:\r\n" +
				"\tEs wurden " + count_wVA + " Elemente aktualisiert (gespeicherte Datenmenge: " + watchedVideoArray.toSource().length + "B (" + watchedVideoArray.length + ") | importierte Datenmenge: " + element.WatchedVideoArray.toSource().length + "B (" + element.WatchedVideoArray.length + ") | neue Datenmenge: " + newWatchedStructure.toSource().length + "B) (" + newWatchedStructure.length + ")\r\n" +
				"ScannedVideoArray:\r\n" +
				"\tEs wurden " + count_sVA + " Elemente aktualisiert (gespeicherte Datenmenge: " + scannedVideoArray.toSource().length + "B (" + scannedVideoArray.length + ") | importierte Datenmenge: " + element.ScannedVideoArray.toSource().length + "B (" + element.ScannedVideoArray.length + ") | neue Datenmenge: " + newScannedStructure.toSource().length + "B) (" + newScannedStructure.length + ")");
			
			if (videoObjectDictionary.toSource() == newObject.toSource() && watchedVideoArray.toSource() == newWatchedStructure.toSource() && scannedVideoArray.toSource() == newScannedStructure.toSource()) {
				alert("Es wurde keine Änderung der Daten durch das Importieren durchgeführt\r\n\t\tSpeichern nicht erforderlich");
			}
			else {
				if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
					GM_setValueLocked("VideoObjectDictionary", newObject.toSource());
					GM_setValueLocked("WatchedVideoArray", newWatchedStructure.toSource());
					GM_setValueLocked("ScannedVideoArray", newScannedStructure.toSource());
				}
			}
			GM_Unlock();
		}
		catch (exc) {
			console.error(exc);
			alert("Das Importieren ist fehlgeschlagen!\r\n" + exc);
			throw(exc)
		}
	}
	
	function GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID) {
		// If videoObjectDictionary is false ignore Elements from Dictionary (only check Elements from WatchedVideoArray)
		if (videoObjectDictionary !== false) {
			if (videoObjectDictionary === null) {
				videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			}
			if (videoObjectDictionary[VideoID] !== undefined) {
				return true;
			}
		}
		
		// If watchedVideoArray is false ignore Elements from Array (only check Elements from VideoObjectDictionary)
		if (watchedVideoArray !== false) {
			if (watchedVideoArray === null || watchedVideoArray === undefined) {
				watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
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
			console.log("Pushing ...");
			console.log(eval(videoObject.toSource()));
		}
		if (typeof(videoObject) !== "object") {throw "WrongTypeException:Only Objects can be Pushed into the Database."}
		if (videoObjectDictionary === null) {
			GM_Lock();
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			save = true;
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
				console.log("... Merged PushRequest");
			}
		}
		
		if (save === true) {
			GM_setValueLocked("VideoObjectDictionary", videoObjectDictionary.toSource());
			GM_Unlock();
		}
		
		return videoObjectDictionary[videoObject.VideoID];
	}
	
	function GetElementCount(videoObjectDictionary) {
		if (videoObjectDictionary === null) {
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
		}
		var count = 0;
		for (var i in videoObjectDictionary) {
			count++;
		}
		return count;
	}
	
	function MergeVideoObjects(videoObject_1, videoObject_2) {
		if (TabNoc.Settings.Debug === true) {
			console.log("Merging ...");
		}
		var namesArray = ([]);
		for (var i in videoObject_1) {
			if (namesArray.indexOf(i) === -1) {
				namesArray.push(i);
			}
		}
		for (var i in videoObject_2) {
			if (namesArray.indexOf(i) === -1) {
				namesArray.push(i);
			}
		}
		
		for (var i in namesArray) {
			var objectIndex = namesArray[i];
			if (videoObject_1[objectIndex] === undefined || videoObject_2[objectIndex] === undefined) {console.error(objectIndex);alert(objectIndex);}
			if (videoObject_1[objectIndex].toSource() !== videoObject_2[objectIndex].toSource()) {
				switch(objectIndex) {
					case "Watches":
						newArray = ([]);
						for (var index1_i in videoObject_1[objectIndex]) {
							// if (videoObject_1[objectIndex][index1_i].WatchedLength === -99) {alert("Object1: " + videoObject_1[objectIndex][index1_i].toSource() + "\r\nObject2: " + videoObject_2[objectIndex].toSource());   continue;}
							
							var found = false;
							for (var index2_i in videoObject_2[objectIndex]) {
								if (videoObject_1[objectIndex][index1_i].Date == "unknown" && videoObject_1[objectIndex][index1_i].WatchedLength == -99) {
									found = true;
									break;
								}
								
								// beide identisch
								if (videoObject_1[objectIndex][index1_i].toSource() === videoObject_2[objectIndex][index2_i].toSource()) {
									newArray.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
									delete videoObject_2[objectIndex][index2_i];
									found = true;
									continue;
								}
									
								// check if the Dates are valid
								if (isNaN(new Date(videoObject_1[objectIndex][index1_i].Date).getTime()) === true)
								{
									if (videoObject_1[objectIndex][index1_i].WatchedLength < 0) {
										// das Element wird NICHT in das neue Object eingefügt (der Wert wird gelöscht)
										found = true;
										break;
									}
									if (videoObject_1[objectIndex][index1_i].Date != "unknown") {
										console.info("Wrong index1_i: " + index1_i);
										console.error(videoObject_1[objectIndex]);
										alert(videoObject_1[objectIndex][index1_i].Date);
										throw new Error("The converted Date is not a Date Object");
									}
								}
								if (isNaN(new Date(videoObject_2[objectIndex][index2_i].Date).getTime()) === true)
								{
									if (videoObject_2[objectIndex][index2_i].Date != "unknown") {
										console.info("Wrong index2_i: " + index2_i);
										console.error(videoObject_2[objectIndex]);
										alert(videoObject_2[objectIndex][index2_i].Date);
										throw new Error("The converted Date is not a Date Object");
									}
								}
								
								if (new Date(videoObject_1[objectIndex][index1_i].Date).getTime() === new Date(videoObject_2[objectIndex][index2_i].Date).getTime() ||
									(isNaN(new Date(videoObject_1[objectIndex][index1_i].Date).getTime()) === true && isNaN(new Date(videoObject_2[objectIndex][index2_i].Date).getTime()))) {
									// Same Date and Time from Website Call or both are NaN, thats the same, choose the highest WatchedLength
									videoObject_1[objectIndex][index1_i].WatchedLength = Math.max(videoObject_1[objectIndex][index1_i].WatchedLength, videoObject_2[objectIndex][index2_i].WatchedLength);
									newArray.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
									delete videoObject_2[objectIndex][index2_i];
									found = true;
								}
							}
							
							if (found === false) {
								// Der Eintrag ist nur im ersten Element vorhanden -> hinzufügen
								newArray.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
							}
						}
						if (videoObject_2[objectIndex].length !== 0){
							// ich füge diese Elemente jetzt erstmal dazu, weiß nicht so genau ob ich noch einen Fehler haben könnte
							for (var j in videoObject_2[objectIndex]) {
								newArray.push(eval(videoObject_2[objectIndex][j].toSource()));
							}
						}
						
						do {
							var changed = false;
							// Ab hier ist das Array fertig gemerged, jetzt wird aufgeräumt
							for (var index1 in newArray) {
								for (var index2 in newArray) {
									if (index1 == index2) {continue;}
									// Wenn die beiden Zeitstempel weniger als 120 sekunden auseinander liegen
									if (Math.abs(Math.floor(new Date(newArray[index1].Date).getTime() - (new Date(newArray[index2].Date).getTime())) / 1000) < 120) {
										// Dann nutze den früheren Zeitstempel
										
										newArray[index1].Date = new Date(Math.min(new Date(newArray[index1].Date).getTime(), new Date(newArray[index2].Date).getTime())).toString();
										newArray[index1].WatchedLength = Math.max(newArray[index1].WatchedLength, newArray[index2].WatchedLength);
										
										if (isNaN(new Date(newArray[index1].Date).getTime()) === true) {
											alert(newArray[index1]);
											throw new Error("The converted Date is not a Date Object");
										}
										
										newArray.splice(index2, 1)
										
										changed = true;
										break;
									}
								}
								if (changed == true) {break;}
							}
						} while (changed === true)
						
						// gleichstellen, damit vergleich funktioniert
						videoObject_1.Watches = eval(newArray.toSource());
						videoObject_2.Watches = eval(newArray.toSource());
						break;
					
					case "VideoLength":
						var VideoLength = Math.max(videoObject_1.VideoLength, videoObject_2.VideoLength);
						videoObject_1.VideoLength = eval(VideoLength);
						videoObject_2.VideoLength = eval(VideoLength);
						break;
						
					case "VideoTitle":
						if (videoObject_1.VideoTitle === "") {
							videoObject_2.VideoTitle = videoObject_1.VideoTitle;
						}
						else if (videoObject_2.VideoTitle === "") {
							videoObject_1.VideoTitle = videoObject_2.VideoTitle;
						}
						else {
							if (confirm(String.format("Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video \"{0}\" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nVideoTitel: {1}\r\n\r\n\tEintrag 2 :\r\nVideoTitel: {2}\r\n\r\nSoll der 1. Eintrag verwendet werden?", videoObject_1.VideoID, videoObject_1.VideoTitle, videoObject_2.VideoTitle)) === true) {
								videoObject_1.VideoTitle = videoObject_2.VideoTitle;
							}
							else {
								videoObject_2.VideoTitle = videoObject_1.VideoTitle;
							}
						}
						break;
						
					case "VideoAuthor":
						if (videoObject_1.VideoAuthor === "") {
							videoObject_2.VideoAuthor = videoObject_1.VideoAuthor;
						}
						else if (videoObject_2.VideoAuthor === "") {
							videoObject_1.VideoAuthor = videoObject_2.VideoAuthor;
						}
						else {
							if (confirm(String.format("Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video \"{0}\" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nYoutube-Kanal: {1}\r\n\r\n\tEintrag 2 :\r\nYoutube-Kanal: {2}\r\n\r\nSoll der 1. Eintrag verwendet werden?", videoObject_1.VideoID, videoObject_1.VideoAuthor, videoObject_2.VideoAuthor)) === true) {
								videoObject_1.VideoAuthor = videoObject_2.VideoAuthor;
							}
							else {
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
						break;
				}
			}
		}
		
		if (TabNoc.Settings.Debug === true) {
			console.log(eval(videoObject_1.toSource()));
		}
		return eval(videoObject_1.toSource());
	}
	
	function Syncronisieren() {
		Feedback.showProgress(10, "Token erfassen");
		var Token = prompt("Bitte Token eingeben");
		Feedback.showProgress(20, "Request starten");
		GM_xmlhttpRequest({
			data: {Token:Token}.toSource(),
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			onabort: (function(response){console.log("onabort");console.info(response);}),
			onerror: (function(response){console.log("onerror");console.info(response);alert("Receving Server Data Failed");Feedback.hideProgress();}),
			onload: returnExec(function(response){console.log("onload_Output");console.info(response);
				Feedback.showProgress(40, "Servernachricht auswerten");
				var error = false;
				if (response.status !== 200) {
					alert("Statuscode:" + response.status);
					Feedback.showProgress(100, "Abgebrochen, es konnten keine Daten empfangen werden");
					return;
				}
				if (response.responseText.charAt(0) === '#') {
					var errorCode = response.responseText.split("\r\n")[0].substring(1);
					if (errorCode === "2") {
						error = true;
					}
					else {
						alert("Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText);
						Feedback.showProgress(100, "Abgebrochen, Fehler auf dem Server");
						return;
					}
				}
				Feedback.showProgress(50, "Empfangene Daten migrieren");
				if (!error) {
					var responseData = eval(response.responseText);
					console.info(responseData);
					if (responseData.VideoObjectDictionary != null && responseData.WatchedVideoArray != null) {
						Feedback.lockProgress();
						ImportData(responseData);
						Feedback.unlockProgress();
					}
					else {
						alert("Der Wert des Response des Servers war ungültig!");
					}
				}
				if (confirm("Daten auf dem Server speichern?") === false) { Feedback.showProgress(100, "Senden der Daten abgebrochen"); return;}
				Feedback.showProgress(75, "Neue Daten auf dem Server speichern");
				
				var element = ({});
				element.WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
				element.ScannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
				element.VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
				element["VideoObjectDictionary-Version"] = eval(GM_getValue("VideoObjectDictionary-Version") || 0);
				element["WatchedVideoArray-Version"] = eval(GM_getValue("WatchedVideoArray-Version") || 0);
				element["ScannedVideoArray-Version"] = eval(GM_getValue("ScannedVideoArray-Version") || 0);
				GM_xmlhttpRequest({
					data: {Token:Token, data:element.toSource()}.toSource(),
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					onabort: (function(response){console.log("onabort");console.info(response);}),
					onerror: (function(response){console.log("onerror");console.info(response);alert("Sending New Data Failed");Feedback.hideProgress();}),
					onload: returnExec(function(response){console.log("onload_Input");console.info(response);
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
					}),
					ontimeout: (function(response){console.log("ontimeout");console.info(response);}),
					timeout: 60000,
					url: "https://tabnoc.gear.host/MyDataFiles//Input"
				});
			}),
			ontimeout: (function(response){console.log("ontimeout");console.info(response);}),
			timeout: 60000,
			url: "https://tabnoc.gear.host/MyDataFiles//Output"
		});
		Feedback.showProgress(30, "Warte auf Rückmeldung vom Server");
	}
	
	function Main() {
		if (document.URL.contains("feature=youtu.be")) {
			console.info("URL contains feature=youtu.be, skipping execution");
			return;
		}
		
		var count = 0;
		while (GM_Locked() == true) {
			setTimeout(function() {if (document.getElementById("movie_player") != null) {document.getElementById("movie_player").pauseVideo();}}, 0);
			count = count + 1;
			alert("Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!");
			if (count >= 2) {
				if(confirm("Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?") === true ) {
					GM_Unlock(true);
				}
			}
		}
		
		GM_addStyle(GM_getResourceText("Impromptu"));
		GM_addStyle(GM_getResourceText("JqueryUI"));
		UpdateDataBase();
		
		if ($("ytd-page-manager").length != 0) {
			TabNoc.Variables.NewYoutubeLayout = true;
			console.info("NewYoutubeLayout found!");
		}
		
		if (TabNoc.Variables.NewYoutubeLayout) {
			// SearchResult
			// if ($("#results").length == 1){
			if (false) {
				$(SearchResultLoader);
			}
			// Watching Video
			else if ($("#placeholder-player").length == 1) {
				$(VideoPageLoader);
			}
			// SubscriptionPage
			else if ($("ytd-grid-renderer").length >= 1 || $("ytd-video-renderer").length >= 1) {
				$(SubscriptionPageLoader);
			}
			else {
				alert("MarkOpenedVideos.user.js:Main() -> No LoadObject found!");
				console.info("No LoadObject found!");
			}
		}
		else {
			// SearchResult
			// if ($("#results").length == 1){
			if (document.URL.contains("https://www.youtube.com/results?") === true || document.URL === "https://www.youtube.com/feed/history") {
				$(SearchResultLoader);
			}
			// Watching Video
			else if ($("#placeholder-player").length == 1) {
				$(VideoPageLoader);
			}
			// SubscriptionPage
			else if ($("#browse-items-primary").length == 1 || document.URL === "https://www.youtube.com/") {
				$(SubscriptionPageLoader);
			}
			else {
				alert("MarkOpenedVideos.user.js:Main() -> No LoadObject found!");
				console.info("No LoadObject found!");
			}
		}
	}
	
	Main();
	
	console.info(String.format("MarkOpenedVideos.user.js[Version: {0}, Autoupdate: {1}] readed", GM_info.script.version, GM_info.scriptWillUpdate));
}
catch (exc) {
	ErrorHandler(exc, "Exception in UserScript");
}

