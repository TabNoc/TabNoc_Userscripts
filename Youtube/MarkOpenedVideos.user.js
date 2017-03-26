// ==UserScript==
// @name        MarkOpenedVideos_Beta
// @namespace   TabNoc
// @include     https://www.youtube.com/feed/subscriptions*
// @include     https://www.youtube.com/user/*/videos*
// @include     https://www.youtube.com/channel/*/videos*
// @include     https://www.youtube.com/watch?v=*
// @include     https://www.youtube.com/results?*
// @include     https://www.youtube.com/feed/history
// @include     https://www.youtube.com/
// @version     2.0.5.1_26032017
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/TabNoc.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/Syncable_MarkOpendVideos/Youtube/Dialog.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/Syncable_MarkOpendVideos/base/String.js
// @require     https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.js
// @resource	Impromptu http://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.css
// @updateURL   https://github.com/mnpingpong/TabNoc_Userscripts/raw/Syncable_MarkOpendVideos/Youtube/MarkOpenedVideos.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @noframes
// ==/UserScript==

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
			LastFullScreenElement: null
		},

		Settings: {
			SavingEnabled: true,
			TimerInterval: 5000,
			UninterestingVideos: (["Recht für YouTuber:"]),
			NotWantedVideos: (["Arumba Plays DOTA", "Europa Universalis IV", "Let's Play Crusader Kings 2", "Challenge WBS:", "Let's Play Civilization VI", "Let's Play Galactic Civilizations 3", "The Binding of Isaac ", "Civilization 6", "Endless Space", "Galactic Cililisations 3", "Civilization V", "Let's Play Stellaris", "SPAZ2", "[EU4]"]),
			DeleteNotWantedVideos: false,
			HideAlreadyWatchedVideos: false,
			ShowAlreadyWatchedDialog: true,
			Debug: false
		},

		HTML: {
		}
	});

	// ### https://www.youtube.com/feed/subscriptions ###
	function SubscriptionPageLoader() {
		console.log("MarkOpenedVideos.user.js loading");
		try {
			registerTabNoc();
			
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
		
		// Scannen
		// exportFunction(getAllElements, unsafeWindow, {
			// defineAs: "getAllElements"
		// });
		
		//ResetAllTNData
		exportFunction(function(){alert("Not Implemented!")}, unsafeWindow, {
			defineAs: "ResetAllTNData"
		});
		
		//ResetDataBaseVersion
		exportFunction(function(){
			if (confirm("Sollen wirklich die Versionen von allen Tabellen gelöscht werden?") !== true) {return;}
			// ### WatchedVideoArray-Version ###
			Version_WatchedVideoArray = eval(GM_getValue("WatchedVideoArray-Version"));
			if (Version_WatchedVideoArray != null) {
				GM_deleteValue("WatchedVideoArray-Version")
			}
			
			// ### ScannedVideoArray-Version ###
			Version_ScannedVideoArray = eval(GM_getValue("ScannedVideoArray-Version"));
			if (Version_ScannedVideoArray != null) {
				GM_deleteValue("ScannedVideoArray-Version")
			}
			
			// ### VideoObjectDictionary-Version ###
			Version_VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary-Version"));
			if (Version_VideoObjectDictionary != null) {
				GM_deleteValue("VideoObjectDictionary-Version")
			}
		}, unsafeWindow, {
			defineAs: "ResetDataBaseVersion"
		});
		
		//GM_addStyle(".display-none{display:none}");
		//TODO?!?! Visited
		//GM_addStyle(".display-none{display:none}");
		
		GM_registerMenuCommand("Hide Watched Videos", function () {
			TabNoc.Settings.HideAlreadyWatchedVideos = true;
			startCheckElements(true, true);
		});
		
		GM_registerMenuCommand("ImportData", function () {
			ImportData();
		});
		
		GM_registerMenuCommand("ExportData", function () {
			//alert(ExportData());
			$.prompt(ImportExportDialog);
		});

		GM_registerMenuCommand("Markieren", function () {
			// startCheckElements(true);
			startCheckElements(!TabNoc.Variables.MarkToggleState);
		});

		// GM_registerMenuCommand("Einlesen", function () {
			// getAllElements();
		// });
	}

	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### ScannedVideoArray ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			// ### WatchedVideoArray ###
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
			// ### VideoObjectDictionary ###
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");

			if ($(".item-section").find(".yt-uix-tile-link").length == 0) {
				TabNoc.Variables.MultiRow = true;
			}
			
			var elements = TabNoc.Variables.MultiRow ? $(".yt-shelf-grid-item") : $(".item-section");
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

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}
		
		for (i = 0; i < elements.length; i++) {
			var currentElement = elements[i];

			if (currentElement.className == "undefined") { continue; }
			
			if (currentElement.className.includes("item-section") || currentElement.className.includes("yt-shelf-grid-item")) {
				UnScannedElements = checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(currentElement);
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		console.log(String.format("Found {0} Elements ({1} Marked Elements | {2} UnMarked Elements) [{3} Scanned Videos | {4} Watched Videos | {5} Watched Videos(old)]", elements.length, elements.length - UnScannedElements, UnScannedElements, scannedVideoArray.length, videoObjectDictionary.length, watchedVideoArray.length))
	}

	function checkElement(watchedVideoArray, scannedVideoArray, videoObjectDictionary, currentElement, ToggleState) {
		//return true if checkedElement is already Scanned
		var VideoID = $(currentElement).find("." + (TabNoc.Variables.MultiRow ? "yt-uix-sessionlink" : "yt-uix-tile-link"))[0].getAttribute("href").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		
		var setColor = function(color) {
			$(currentElement).css("background-color", color);
			if (TabNoc.Variables.MultiRow) {
				$(currentElement).find(".yt-lockup-title, .yt-uix-sessionlink, .yt-lockup-byline").css("background-color", color);//yt-lockup-byline yt-uix-sessionlink yt-lockup-title
			}
			else {
				$(currentElement).find(".yt-uix-tile-link, .yt-lockup-description").css("background-color", color);
			}
		};
		
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
			if ($(currentElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc.Settings.UninterestingVideos[i])) {
				setColor("rgb(255, 175, 175)");
			}
		}
		for (var i = 0; i < TabNoc.Settings.NotWantedVideos.length; i++) {
			if ($(currentElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc.Settings.NotWantedVideos[i])) {
				//disableVideo 
				if (TabNoc.Settings.DeleteNotWantedVideos === true) {
					$(currentElement).remove();
				}
				else if(TabNoc.Settings.DeleteNotWantedVideos === false) {
					currentElement.style.display = "none";
				}
			}
		}
		
		return false;
	}
	
	function getAllElements(from, till) {
		try {
			var start = new Date().getTime();

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
					console.warn(element);
				}
			}

			GM_setValue("ScannedVideoArray", scannedVideoArray.toSource());
			
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
	function VideoPageLoader(){
		console.log("MarkOpenedVideos.user.js loading");
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
	
	function WatchingVideo(){
		try {
			// prepare Current VideoStatisticsObject
			TabNoc.Variables.VideoStatisticsObject = {
				VideoID: unsafeWindow.document.getElementById("movie_player").getVideoData().video_id,
				VideoTitle: unsafeWindow.document.getElementById("movie_player").getVideoData().title,
				VideoAuthor: unsafeWindow.document.getElementById("movie_player").getVideoData().author,
				Watches: [{WatchedLength: -99, Date: new Date().toLocaleString()}],
				VideoLength: Math.floor(unsafeWindow.document.getElementById("movie_player").getDuration())
			}.toSource();
			
			if (TabNoc.Settings.ShowAlreadyWatchedDialog === true ) {
				if (GetVideoWatched(null, null, eval(TabNoc.Variables.VideoStatisticsObject).VideoID) === true) {
					setTimeout(function(){alert("watched");}, 10);
					Feedback.showMessage("Watched!", "error", 60000);
				}
			}
			PushVideoObject(null, eval(TabNoc.Variables.VideoStatisticsObject), true);
			
			// new YT version (the one with the black player) doesn't have this button
			if ($("#watch-more-related-button").length > 0) {
				$("#watch-more-related-button")[0].onclick = function() {setTimeout(MarkWatchedVideos, 1000);return false;}
			}
			MarkWatchedVideos();
			
			TabNoc.Variables.WatchedLength = 0;
			TabNoc.Variables.HasSavedDataOnEnd = false;
			
			TabNoc.Variables.WatchingVideoInterval = setInterval(WatchingVideoIntervalHandler, 1000);
			
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
				SaveVideoStatistics();
				MarkWatchedVideos();
				TabNoc.Variables.HasSavedDataOnEnd = true;
			}
			if (TabNoc.Variables.WatchedLength % 30 === 0) {
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
			console.log('WatchingVideoIntervalHandler execution time: ' + (new Date().getTime() - start));
		}
	}
	
	function SaveVideoStatistics(){
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
	function SearchResultLoader(){
		console.log("MarkOpenedVideos.user.js loading");
		try {
			MarkSearchResults();
			
			console.log("MarkOpenedVideos.user.js done");
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function MarkSearchResults(){
		var setColor = function(checkElement, color) {
			$(checkElement).css("background-color", color);
			$(checkElement).find(".yt-uix-tile-link, .yt-lockup-description").css("background-color", color);
		};
		
		// ### ScannedVideoArray ###
		var scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
		
		// ### WatchedVideoArray ###
		var watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
		
		var elements = $(".yt-lockup-video");
		for (i = 0; i < elements.length; i++) {
			var element = elements[i].children[0].children[0].children[0];
			var href = element.getAttribute("href");
			if (href != null && href != "" && GetVideoWatched(watchedVideoArray, null, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(166, 235, 158)");
			}
		}
	}
	// ### https://www.youtube.com/results?* ### 
	// ### https://www.youtube.com/feed/history ### 
	
	function UpdateDataBase() {
		var CurrentVersion_WatchedVideoArray = 0;
		var CurrentVersion_ScannedVideoArray = 0;
		var CurrentVersion_VideoObjectDictionary = 2;
		
		// ### WatchedVideoArray-Version ###
		Version_WatchedVideoArray = eval(GM_getValue("WatchedVideoArray-Version"));
		
		// ### ScannedVideoArray-Version ###
		Version_ScannedVideoArray = eval(GM_getValue("ScannedVideoArray-Version"));
		
		// ### VideoObjectDictionary-Version ###
		Version_VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary-Version"));
		
		//TODO: ScannedVideoArray komplett entfernen, PRÜFEN!!!
		
		// ### WatchedVideoArray ###
		if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
			console.info("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")");
			alert("Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " + Version_WatchedVideoArray + " | aktuell: " + CurrentVersion_WatchedVideoArray + ")\r\nOK drücken um den Updatevorgang zu starten.");
			if (Version_WatchedVideoArray === undefined) {
				// aus der alten Tabelle '' importieren, same DataStructure
				
				// ### Watched-Videos ###
				WatchedVideos = eval(GM_getValue("Watched-Videos") || null);
				
				if (WatchedVideos !== null) {
					GM_setValue("WatchedVideoArray", WatchedVideos.toSource());
					GM_setValue("WatchedVideoArray-Version-(-1)", WatchedVideos.toSource());
					
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
					
					GM_setValue("WatchedVideoArray-Version", 0);
					console.log("Die Version der Tabelle WatchedVideoArray wurde auf " + GM_getValue("WatchedVideoArray-Version") + " geändert");
					alert("DataBase:'WatchedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");
				}
				else {
					GM_setValue("WatchedVideoArray-Version", 0);
					console.log("Die Version der Tabelle WatchedVideoArray wurde auf " + GM_getValue("WatchedVideoArray-Version") + " geändert");
					alert("DataBase:'WatchedVideoArray' sucessfully initialised!");
				}
			}
			else {
				// ### WatchedVideoArray ###
				WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
				
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
			alert("Es wurde ein Versionsunterschied der Datenbank-Tabelle ScannedVideoArray gefunden (alt: " + Version_ScannedVideoArray + " | aktuell: " + CurrentVersion_ScannedVideoArray + ")\r\nOK drücken um den Updatevorgang zu starten.");
			if (Version_ScannedVideoArray === undefined) {
				// ### Videos ###
				var Videos = eval(GM_getValue("Videos") || null);
				
				if (Videos !== null) {
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
					
					GM_setValue("ScannedVideoArray", ScannedVideoArray.toSource());
					GM_setValue("ScannedVideoArray-Version-(-1)", Videos.toSource());
					
					if (GM_listValues().indexOf("Videos") !== -1) {
						GM_deleteValue("Videos");
					}
					
					if (GM_listValues().indexOf("Videos-Version") !== -1) {
						GM_deleteValue("Videos-Version");
					}
					
					GM_setValue("ScannedVideoArray-Version", 0);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + GM_getValue("ScannedVideoArray-Version") + " geändert");
					alert("DataBase:'ScannedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.\r\nEs wurden " + removed + " doppelte Einträge entfernt.");
				}
				else {
					GM_setValue("ScannedVideoArray-Version", 0);
					console.log("Die Version der Tabelle ScannedVideoArray wurde auf " + GM_getValue("ScannedVideoArray-Version") + " geändert");
					alert("DataBase:'ScannedVideoArray' sucessfully initialised!");
				}
			}
			else {
				// ### ScannedVideoArray ###
				ScannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
				
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
			alert("Es wurde ein Versionsunterschied der Datenbank-Tabelle VideoObjectDictionary gefunden (alt: " + Version_VideoObjectDictionary + " | aktuell: " + CurrentVersion_VideoObjectDictionary + ")\r\nOK drücken um den Updatevorgang zu starten.");
			if (Version_VideoObjectDictionary === undefined) {
				
				// ### VideoStatistics ###
				VideoStatistics = eval(GM_getValue("VideoStatistics") || null);
				
				if (VideoStatistics !== null) {
					GM_setValue("VideoObjectDictionary-Version-(-1)", VideoStatistics.toSource());
					var newStructure = ({"unknown": ([])});
					var removed = 0;
					
					if (GM_listValues().indexOf("VideoStatistics") !== -1) {
						GM_deleteValue("VideoStatistics");
					}
					
					for (var element in VideoStatistics) {
						newStructure["unknown"].push(VideoStatistics[element]);
					}
					
					GM_setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");
					
					GM_setValue("VideoObjectDictionary", newStructure.toSource());
				}
				else {
					GM_setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' sucessfully initialised!");
				}
			}
			else {
				// ### VideoObjectDictionary ###
				videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "([])");
				
				// Dieser Code entfernt alle Einträge, welche keinen Objekt eintrag haben (allerdings sind es bei mir ~1500, das ist ziemlich viel
				{
					/*
					// ### ScannedVideoArray ###
					var scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
					
					// ### WatchedVideoArray ###
					var watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
					
					console.log("scannedVideoArray");
					console.log(scannedVideoArray);
					
					console.log("newStructure");
					console.log(newStructure);
					
					// ### ScannedVideoArray aufräumen ###
					for (var element in scannedVideoArray) {
						var found = false;
						var VideoID = scannedVideoArray[element];
						for (var elements in newStructure["unknown"]) {
							if (newStructure["unknown"][elements].VideoID === VideoID) {
								found = true;
								break;
							}
						}
						if (found === false) {
// console.log("Das Element von scannedVideoArray hat keinen Eintrag im VideoObjectDictionary: " + VideoID);
							scannedVideoArray.pop(VideoID);
							removed++;
						}
					}
					// ### ScannedVideoArray aufräumen ###
					
// console.log("watchedVideoArray");
// console.log(watchedVideoArray);
					
					// ### WatchedVideoArray aufräumen ###
					for (var element in watchedVideoArray) {
						var found = false;
						var VideoID = watchedVideoArray[element];
						for (var elements in newStructure["unknown"]) {
							if (newStructure["unknown"][elements].VideoID === VideoID) {
								found = true;
								break;
							}
						}
						if (found === false) {
// console.log("Das Element von watchedVideoArray hat keinen Eintrag im VideoObjectDictionary: " + VideoID);
							watchedVideoArray.pop(VideoID);
							removed++;
						}
					}
					// ### WatchedVideoArray aufräumen ###
					
// console.log("watchedVideoArray");
// console.log(watchedVideoArray);
// console.log("scannedVideoArray");
// console.log(scannedVideoArray);
					
					GM_setValue("VideoObjectDictionary-Version", 0);
					console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
					alert("DataBase:'VideoObjectDictionary' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt, ganz alte Videos (Es wurden " + removed + " gefunden) werden jetzt als nicht angesehen markiert.");
					*/
				}
					
				switch (Version_VideoObjectDictionary) {
					case 0:
					case 1:
						GM_setValue("VideoObjectDictionary-Version-1", videoObjectDictionary.toSource());
						
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
						
						console.log("Die Version der Tabelle VideoObjectDictionary ist " + GM_getValue("VideoObjectDictionary-Version"));
						alert("Es wurden " + count + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
						if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
							GM_setValue("VideoObjectDictionary-Version", 2);
							console.log("Die Version der Tabelle VideoObjectDictionary wurde auf " + GM_getValue("VideoObjectDictionary-Version") + " geändert");
							GM_setValue("VideoObjectDictionary", newStructure.toSource());
						}
						else {
							throw "UserAbort";
						}
						break;
						
					default:
						throw("No Update Implemeneted!");
						break;
				}
			}
		}
		// ### VideoObjectDictionary ###
		
		if (CurrentVersion_WatchedVideoArray != eval(GM_getValue("WatchedVideoArray-Version")) ||
			CurrentVersion_ScannedVideoArray != eval(GM_getValue("ScannedVideoArray-Version")) ||
			CurrentVersion_VideoObjectDictionary != eval(GM_getValue("VideoObjectDictionary-Version"))) {
				UpdateDataBase();
		}
	}
	
	function ImportData() {
		try {
			var data_vOD = eval(prompt("Please insert new VideoObjectDictionary Data"));
			var data_wVA = eval(prompt("Please insert new WatchedVideoArray Data"));
			
			var videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			var watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "({})");
			var count_vOD = 0;
			var count_wVA = 0;
			
			var newObject = ({});
			
			for (var i in videoObjectDictionary) {
				PushVideoObject(newObject, videoObjectDictionary[i], false);
			}
			for (var i in data_vOD) {
				PushVideoObject(newObject, data_vOD[i], false);
				count_vOD++;
			}
			
			var newStructure = ([]);
			
			for (var i in watchedVideoArray) {
				if (GetVideoWatched(newStructure, newObject, watchedVideoArray[i]) === false) {
					newStructure.push(watchedVideoArray[i]);
				}
			}
			
			for (var i in data_wVA) {
				if (GetVideoWatched(newStructure, newObject, data_wVA[i]) === false) {
					newStructure.push(data_wVA[i]);
					count_wVA++;
				}
			}
			
			alert("Das Importieren wurde erfolgreich abgeschlossen!\r\n" + 
				"VideoObjectDictionary:\r\n" + 
				"\tEs wurden " + count_vOD + " Elemente aktualisiert (alte Datenmenge: " + videoObjectDictionary.toSource().length + "B | neue Datenmenge: " + newObject.toSource().length + "B)\r\n" +
				"WatchedVideoArray:\r\n" + 
				"\tEs wurden " + count_wVA + " Elemente aktualisiert (alte Datenmenge: " + watchedVideoArray.toSource().length + "B | neue Datenmenge: " + newStructure.toSource().length + "B)");
			
			GM_setValue("VideoObjectDictionary", newObject.toSource());
			GM_setValue("WatchedVideoArray", newStructure.toSource());
		}
		catch (exc) {
			console.error(exc);
			alert("Das Importieren ist fehlgeschlagen!\r\n" + exc);
		}
	}
	
	function ExportData(Value) {
		return (GM_getValue(Value) || "({})");
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
			console.log(videoObject);
		}
		if (typeof(videoObject) !== "object") {throw "WrongTypeException:Only Objects can be Pushed into the Database."}
		if (videoObjectDictionary === null) {
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
			save = true;
		}
		
		if (videoObjectDictionary[videoObject.VideoID] === undefined) {
			videoObjectDictionary[videoObject.VideoID] = videoObject;
			if (TabNoc.Settings.Debug === true) {
				console.log("... Pushed");
			}
		}
		else {
			videoObjectDictionary[videoObject.VideoID] = MergeVideoObjects(videoObjectDictionary[videoObject.VideoID], videoObject);
			if (TabNoc.Settings.Debug === true) {
				console.log("... Merged PushRequest");
			}
		}
		
		if (save === true) {
			GM_setValue("VideoObjectDictionary", videoObjectDictionary.toSource());
		}
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
			if (videoObject_1[objectIndex] === undefined || videoObject_2[objectIndex] === undefined) {console.log(objectIndex);alert(objectIndex);}
			if (videoObject_1[objectIndex].toSource() !== videoObject_2[objectIndex].toSource()) {
				switch(objectIndex) {
					case "Watches":
						newObject = ([]);
						for (var index1_i in videoObject_1[objectIndex]) {
							if (videoObject_1[objectIndex][index1_i].WatchedLength === -99) {continue;}
							
							var found = false;
							for (var index2_i in videoObject_2[objectIndex]) {
								if (videoObject_1[objectIndex][index1_i].toSource() === videoObject_2[objectIndex][index2_i].toSource()) {
									newObject.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
									delete videoObject_2[objectIndex][index2_i];
									found = true;
								} else if (videoObject_1[objectIndex][index1_i].Date === videoObject_2[objectIndex][index2_i].Date) {
									// Same Date and Time from Website Call, thats the same, choose the highest WatchedLength
									videoObject_1[objectIndex][index1_i].WatchedLength = Math.max(videoObject_1[objectIndex][index1_i].WatchedLength, videoObject_2[objectIndex][index2_i].WatchedLength);
									newObject.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
									delete videoObject_2[objectIndex][index2_i];
									found = true;
								}
							}
							
							if (found === false) {
								// Der Eintrag ist nur im ersten Element vorhanden -> hinzufügen
								newObject.push(eval(videoObject_1[objectIndex][index1_i].toSource()));
							}
						}
						if (videoObject_2[objectIndex].length !== 0){
							// ich füge diese Elemente jetzt erstmal dazu, weiß nicht so genau ob ich noch einen Fehler haben könnte
							for (var j in videoObject_2[objectIndex]) {
								newObject.push(eval(videoObject_2[objectIndex][j].toSource()));
							}
						}
					
					
						// gleichstellen, damit vergleich funktioniert
						videoObject_1.Watches = eval(newObject.toSource());
						videoObject_2.Watches = eval(newObject.toSource());
						break;
					
					case "VideoLength":
						var VideoLength = Math.max(videoObject_1.VideoLength, videoObject_2.VideoLength);
						videoObject_1.VideoLength = eval(VideoLength);
						videoObject_2.VideoLength = eval(VideoLength);
						break;
					
					default:
						console.error("Für diesen Unterschied wurde kein merge definiert![" + objectIndex + "]");
						console.log(videoObject_1);
						console.log(videoObject_2);
						alert("Für diesen Unterschied wurde kein merge definiert!\r\nSiehe Konsole für mehr Informationen.");
						throw "NotDefinedException"
						break;
				}
			}
		}
		
		if (TabNoc.Settings.Debug === true) {
			console.log(eval(videoObject_1.toSource()));
		}
		return eval(videoObject_1.toSource());
	}
	
	function MergeRequest(oldData) {
		// var data_vOD = eval(prompt("Please insert new VideoObjectDictionary Data"));
		var videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
	}
	
	var Feedback = {
		messageTimeout: null,
		showMessage: (function (message, type, time, onClickFunction) {
			Feedback.hideMessage();
			var element = document.createElement("div");
			element.id = "feedback";
			element.title = "Dismiss";
			var style = "";
			if (type == "notify") {
				style = "background-color: #00A550;";
			}
			else if (type == "error") {
				style = "background-color: #C41E3A;";
			}
			element.setAttribute("style", "position: fixed; top: 10px; text-align: center; width: 100%; z-index: 9999;");
			element.innerHTML = '<span style="' + style + ' border-radius: 5px; cursor: pointer; color: #fff; padding: 3px 6px; font-size: 16px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2); text-shadow: 0 1px rgba(0, 0, 0, 0.2);">' + message.replaceAll("\r\n", "<br>") + "</span>";
			element.addEventListener("click", onClickFunction || Feedback.hideMessage, !1);
			document.body.appendChild(element);
			time && (Feedback.messageTimeout = setTimeout(Feedback.hideMessage, time));
		}),
		hideMessage: (function () {
			var element = document.getElementById("feedback");
			if (element != null) {
				if (Feedback.messageTimeout != null) {
					clearTimeout(Feedback.messageTimeout);
					Feedback.messageTimeout = null;
				}
				element.removeEventListener("click", Feedback.hideMessage, false)
				document.body.removeChild(element)
			}
		}),
		error: (function (message, time, onClickFunction) {
			Feedback.showMessage(message || "Something went wrong", "error", (time == null ? 8000 : time), onClickFunction)
		}),
		notify: (function (message, time, onClickFunction) {
			Feedback.showMessage(message, "notify", (time == null ? 5000 : time), onClickFunction)
		})
	};
	
	function Main() {
		GM_addStyle(GM_getResourceText("Impromptu"));
		UpdateDataBase();
		
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
	
	Main();
	
	console.info(String.format("MarkOpenedVideos.user.js[Version: {0}, Autoupdate: {1}] readed", GM_info.script.version, GM_info.scriptWillUpdate));
} catch (exc) {
	console.error(exc);
	alert(exc);
}
