// ==UserScript==
// @name        MarkOpenedVideos_Beta
// @namespace   TabNoc
// @include     https://www.youtube.com/feed/subscriptions*
// @include     https://www.youtube.com/user/*/videos*
// @include     https://www.youtube.com/channel/*/videos*
// @include     https://www.youtube.com/watch?v=*
// @include     https://www.youtube.com/results?*
// @version     2.0.1_23022017
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/TabNoc.js
// @require     https://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.js
// @resource	Impromptu http://raw.githubusercontent.com/trentrichardson/jQuery-Impromptu/master/dist/jquery-impromptu.min.css
// @updateURL   https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/Youtube/MarkOpenedVideos.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
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
*/

try {
	setTabNoc({
		Variables: {
			MarkToggleState: true,
			
			WatchedLength: 0,
			WatchedLengthInterval: null,
			HasSavedDataOnEnd: false,
			
			VideoChangeCheckInterval: null,
			OldVideoID: "",
			
			VideoStatisticsObject: null,
			
			checkElementsInterval : null,
			lastCheckItemCount:0,
			lastCheckVideoIdAmount:0,
			lastCheckWatchedVideoAmount:0,
			
			MultiRow: false
		},

		Settings: {
			SavingEnabled: true,
			MarkAfterScan: true,
			OpenInNewTabWhenScanned: true,
			TimerInterval: 5000,
			UninterestingVideos: (["Recht für YouTuber:"]),
			NotWantedVideos: (["Arumba Plays DOTA", "Europa Universalis IV", "Let's Play Crusader Kings 2", "Challenge WBS:", "Let's Play Civilization VI", "Let's Play Galactic Civilizations 3", "The Binding of Isaac ", "Civilization 6", "Endless Space", "Galactic Cililisations 3", "Civilization V", "Let's Play Stellaris", "SPAZ2"]),
			DeleteNotWantedVideos: false,
			HideAlreadyWatchedVideos: false
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
		// unsafeWindow.TabNoc = cloneInto(TabNoc, unsafeWindow, {
			// wrapReflectors: true
		// });
		
		// Scannen
		exportFunction(getAllElements, unsafeWindow, {
			defineAs: "getAllElements"
		});
		
		//MarkWatchedVideos
		exportFunction(MarkWatchedVideos, unsafeWindow, {
			defineAs: "MarkWatchedVideos"
		});
		
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

		GM_registerMenuCommand("Markieren", function () {
			startCheckElements(true);
			// startCheckElements(!TabNoc.Variables.MarkToggleState);
		});

		GM_registerMenuCommand("Einlesen", function () {
			getAllElements();
		});
	}

	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### Scanned-Videos ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			
			// ### Watched-Videos ###
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");

			if ($(".item-section").find(".yt-uix-tile-link").length == 0) {
				TabNoc.Variables.MultiRow = true;
			}
			
			var elements = TabNoc.Variables.MultiRow ? $(".yt-shelf-grid-item") : $(".item-section");
			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length || 
			TabNoc.Variables.lastCheckVideoIdAmount !== scannedVideoArray.length || 
			TabNoc.Variables.lastCheckWatchedVideoAmount !== watchedVideoArray.length) {
				execTime(checkElements, watchedVideoArray.reverse(), scannedVideoArray.reverse(), elements, ToggleState);
				
				TabNoc.Variables.lastCheckVideoIdAmount = scannedVideoArray.length;
				TabNoc.Variables.lastCheckWatchedVideoAmount = watchedVideoArray.length;
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(watchedVideoArray, scannedVideoArray, elements, ToggleState) {
		var UnScannedElements = 0;

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}
		
		for (i = 0; i < elements.length; i++) {
			var currentElement = elements[i];

			if (currentElement.className == "undefined") { continue; }
			
			if (currentElement.className.includes("item-section") || currentElement.className.includes("yt-shelf-grid-item")) {
				UnScannedElements = checkElement(watchedVideoArray, scannedVideoArray, currentElement, ToggleState) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(currentElement);
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + scannedVideoArray.length + " Videos listed | " + watchedVideoArray.length + " Videos watched)")
	}

	function checkElement(watchedVideoArray, scannedVideoArray, currentElement, ToggleState) {
		//return true if checkedElement is already Scanned
		var SearchString = $(currentElement).find("." + (TabNoc.Variables.MultiRow ? "yt-uix-sessionlink" : "yt-uix-tile-link"))[0].getAttribute("href").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		
		var v_ID = scannedVideoArray.indexOf(SearchString);
		var wv_ID = watchedVideoArray.indexOf(SearchString);
		
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
			if (v_ID != -1) {
				setColor("rgb(151, 255, 139)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					currentElement.style.display = "none";
				}
				return true;
			} 
			else if (wv_ID != -1) {
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
			
			var OpenInNewTabsArray = [];

			// ### Scanned-Videos ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
			TabNoc.Variables.OldSaveData = scannedVideoArray.toSource();
			
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
					
					if (scannedVideoArray.indexOf(currentElementId) == -1) {
						scannedVideoArray.push(currentElementId);
						//Open in new Tab
						if (TabNoc.Settings.OpenInNewTabWhenScanned === true) {
							OpenInNewTabsArray.push({href:currentElementId, name:$(element).find(".branded-page-module-title-link")[0].textContent.trim()});
						}
					}
				} else {
					console.warn(element);
				}
			}

			GM_setValue("ScannedVideoArray", scannedVideoArray.toSource());
			
			if (confirm(OpenInNewTabsArray.length + " neue Tabs öffnen?") == true) {
				for (i = 0; i < OpenInNewTabsArray.length; i++) {
					if (OpenInNewTabsArray[i].name != "direwolf20") {
						window.open(OpenInNewTabsArray[i].href);
					}
				}
			}
			
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
	// ### https://www.youtube.com/feed/subscriptions ###
	
	// ### https://www.youtube.com/watch?v=* ###
	function VideoPageLoader(){
		console.log("MarkOpenedVideos.user.js loading");
		try {
			if (unsafeWindow.document.getElementById("movie_player") == null) {return false;}
			exportFunction(SaveVideoStatistics, unsafeWindow, {
				defineAs : "SaveVideoStatistics"
			});
			
			document.body.setAttribute("onbeforeunload", "SaveVideoStatistics();" + document.body.getAttribute("onbeforeunload"));
			
			TabNoc.Variables.VideoChangeCheckInterval = setInterval(returnExec(function() {
				if (unsafeWindow.document.getElementById("movie_player").getVideoData().video_id != TabNoc.Variables.OldVideoID) {
					// Save Old Statistics
					if (TabNoc.Variables.WatchedLengthInterval != null) {
						clearInterval(TabNoc.Variables.WatchedLengthInterval);
					}
					SaveVideoStatistics();
					TabNoc.Variables.WatchedLengthInterval = null;
					TabNoc.Variables.WatchedLength = null;
					
					// Start On New Link
					TabNoc.Variables.OldVideoID = unsafeWindow.document.getElementById("movie_player").getVideoData().video_id;
					WatchingVideo();
				}
			}), 1000);
			
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
				WatchedLength: -99,
				VideoLength: unsafeWindow.document.getElementById("movie_player").getDuration()
			}.toSource();
			
			
			if (GetVideoWatched(null, eval(TabNoc.Variables.VideoStatisticsObject).VideoID) === false) {
				PushVideoObject(null, null, eval(TabNoc.Variables.VideoStatisticsObject), true);
			}
			else {
alert("watched");
			}
			
			// new YT version (the one with the black player) doesn't have this button
			if ($("#watch-more-related-button").length > 0) {
				$("#watch-more-related-button")[0].setAttribute("onclick","setTimeout(MarkWatchedVideos, 1000);return false;");
			}
			execTime(MarkWatchedVideos, true);
			StartVideoWatchLengthCollection();
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function GetVideoWatched(watchedVideoArray, VideoID) {
		if (watchedVideoArray === null || watchedVideoArray === undefined) {
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
		}
		return watchedVideoArray.indexOf(VideoID) !== -1;
	}
	
	function PushVideoObject(videoObjectDictionary, watchedVideoArray, videoObject, save) {
		if (videoObjectDictionary === null) {
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
		}
		if (watchedVideoArray === null) {
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
		}
		
		var today = new Date().toLocaleDateString();
		if (videoObjectDictionary[today] === undefined) {
			videoObjectDictionary[today] = ([]);
		}
		
		if (videoObjectDictionary[today].indexOf(videoObject) === -1) {
			videoObjectDictionary[today].push(videoObject);
		}
		if (watchedVideoArray[today].indexOf(videoObject.VideoID) === -1) {
			watchedVideoArray.push(videoObject.VideoID);
		}
		
		if (save === true) {
			GM_setValue("VideoObjectDictionary", videoObjectDictionary.toSource());
			GM_setValue("WatchedVideoArray", watchedVideoArray.toSource());
		}
	}
	
	function MarkWatchedVideos() {
		// ### Scanned-Videos ###
		scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "([])");
		
		// ### Watched-Videos ###
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
			if (href != null && href != "" && GetVideoWatched(watchedVideoArray, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(166, 235, 158)");
			}
			else if (href != null && href != "" && GetVideoWatched(scannedVideoArray, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(151, 255, 139)");
			}
		}
	}
	
	function StartVideoWatchLengthCollection(){
		TabNoc.Variables.WatchedLength = 0;
		TabNoc.Variables.HasSavedDataOnEnd = false;
		TabNoc.Variables.WatchedLengthInterval = setInterval(function(){
			try{
				if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 1 /*Playing*/) {
					TabNoc.Variables.WatchedLength += 1;
					TabNoc.Variables.HasSavedDataOnEnd = false;
				}
				if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 0 && TabNoc.Variables.HasSavedDataOnEnd === false) {
					SaveVideoStatistics();
					TabNoc.Variables.HasSavedDataOnEnd = true;
				}
			} catch (exc) {
				console.error(exc);
				alert(exc);
			}
		}, 1000);
	}
	
	function SaveVideoStatistics(){
		if (TabNoc.Variables.VideoStatisticsObject == null){return false;}
		try {
			VideoStatisticsObject = eval(TabNoc.Variables.VideoStatisticsObject);
			VideoStatisticsObject.WatchedLength = TabNoc.Variables.WatchedLength;
			
			PushVideoObject(null, null, VideoStatisticsObject, true);
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### https://www.youtube.com/watch?v=* ###

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
		// TODO: make function and use it
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
			if (href != null && href != "" && GetVideoWatched(watchedVideoArray, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(166, 235, 158)");
			}
			else if (href != null && href != "" && GetVideoWatched(scannedVideoArray, href.replace("/watch?v=", "").split("&list")[0].split("&t=")[0]) === true) {
				setColor(elements[i], "rgb(151, 255, 139)");
			}
		}
	}
	// ### https://www.youtube.com/results?* ### 
	
	function UpdateDataBase() {
		var CurrentVersion_WatchedVideoArray = 0;
		var CurrentVersion_ScannedVideoArray = 0;
		var CurrentVersion_VideoObjectDictionary = 0;
		
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
				VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "([])");
				
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
					
				switch (Version_WatchedVideoArray) {
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
	
	
	function Main() {
		UpdateDataBase();
		
		// SearchResult
		if ($("#results").length == 1){
			$(SearchResultLoader);
		}
		// Watching Video
		else if ($("#placeholder-player").length == 1) {
			$(VideoPageLoader);
		}
		// SubscriptionPage
		else if ($("#browse-items-primary").length == 1) {
			$(SubscriptionPageLoader);
		}
		
		else {
			alert("MarkOpenedVideos.user.js:Main()->No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}
	
	Main();
	
	console.info("MarkOpenedVideos.user.js[v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
