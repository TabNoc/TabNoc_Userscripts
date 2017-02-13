// ==UserScript==
// @name        MarkOpenedVideos
// @namespace   TabNoc
// @include     https://www.youtube.com/feed/subscriptions*
// @include     https://www.youtube.com/user/*/videos*
// @include     https://www.youtube.com/channel/*/videos*
// @include     https://www.youtube.com/watch?v=*
// @include     https://www.youtube.com/results?*
// @version     2.0.0_13022017
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/base/GM__.js
// @updateURL   https://raw.githubusercontent.com/mnpingpong/TabNoc_Userscripts/master/Youtube/MarkOpenedVideos.user.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_listValue
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
	changed:	- completly rewritten Storage, renamed all DatabaseTables, updated UpdateDatabase (dropped Support for old Versions)
	changed:	- implemented TabNoc.js
*/

//TODO: TabNoc.js implementieren
//TODO: Die Reihenfolge der Arrays in der ParameterListe anpassen, damit es besser aussieht (da kann man noch mehr optmieren, bestimmt ;) )

//TODO: - getTabNoc() -> implement it also on other scripts ||anm.: in eigene Datei exportiren, aufruf durch main, mit angabe des namens als parameter, und rückgabeobjekt(TabNoc) anschließend aufruf durch script durch rückgabeobject, bei anlegen checken b bereits vorhanden, dann integrieren, sonst erstellen
//		- Update Statistics DataBase (Merge over Video Id; use only WatchLength or merge Watch length and new property amount of views)
try {
	if (String.prototype.contains == null) {String.prototype.contains = String.prototype.includes;}
	function getTabNoc(){
		if (unsafeWindow.TabNoc_ == null) {
			unsafeWindow.TabNoc_ = ({});
		}
		if (unsafeWindow.TabNoc_["MarkOpenedVideos.user.js"] == null) {
			unsafeWindow.TabNoc_["MarkOpenedVideos.user.js"] = {};
		}
		return unsafeWindow.TabNoc_["MarkOpenedVideos.user.js"];
	}
	
	function setTabNoc(obj){
		var ScriptName = "MarkOpenedVideos.user.js";
		
		if (unsafeWindow.TabNoc_ == null) {
			unsafeWindow.TabNoc_ = cloneInto(({}), unsafeWindow, {
				wrapReflectors: true
			});
		}
		if (unsafeWindow.TabNoc_[ScriptName] == null) {
			unsafeWindow.TabNoc_[ScriptName] = cloneInto(({}), unsafeWindow.TabNoc_, {
				wrapReflectors: true
			});
		}
		
		unsafeWindow.TabNoc_[ScriptName] = cloneInto(obj, unsafeWindow.TabNoc_, {
			wrapReflectors: true
		});
	}
	
	unsafeWindow.TabNoc_ = cloneInto(({}), unsafeWindow, {
		wrapReflectors: true
	});

	TabNoc_test = {
		ScriptName : "MarkOpenedVideos.user.js",
		
		get Variables(){
			return unsafeWindow.TabNoc_[TabNoc_test.ScriptName].Variables;
		},
		set Variables(obj){},
		
		get Settings(){
			return unsafeWindow.TabNoc_[TabNoc_test.ScriptName].Settings;
		},
		set Settings(obj){},
		
		get HTML(){
			return unsafeWindow.TabNoc_[TabNoc_test.ScriptName].Settings;
		},
		set HTML(obj){},
	}
	
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
			
			TabNoc_test.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc_test.Variables.MarkToggleState);
			}), TabNoc_test.Settings.TimerInterval);
			startCheckElements(TabNoc_test.Variables.MarkToggleState);
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
		
		//GM_addStyle(".display-none{display:none}");
		//TODO?!?! Visited
		//GM_addStyle(".display-none{display:none}");
		
		GM_registerMenuCommand("Hide Watched Videos", function () {
			TabNoc_test.Settings.HideAlreadyWatchedVideos = true;
			startCheckElements(true, true);
		});

		GM_registerMenuCommand("Markieren", function () {
			startCheckElements(true);
			// startCheckElements(!TabNoc_test.Variables.MarkToggleState);
		});

		GM_registerMenuCommand("Einlesen", function () {
			getAllElements();
		});
	}

	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### Scanned-Videos ###
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "({})");
			
			// ### Watched-Videos ###
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "({})");

			if ($(".item-section").find(".yt-uix-tile-link").length == 0) {
				TabNoc_test.Variables.MultiRow = true;
			}
			
			var elements = TabNoc_test.Variables.MultiRow ? $(".yt-shelf-grid-item") : $(".item-section");
			if (force === true || TabNoc_test.Variables.lastCheckItemCount !== elements.length || 
			TabNoc_test.Variables.lastCheckVideoIdAmount !== scannedVideoArray.length || 
			TabNoc_test.Variables.lastCheckWatchedVideoAmount !== watchedVideoArray.length) {
				execTime(checkElements, scannedVideoArray.reverse(), elements, ToggleState, watchedVideoArray.reverse());
				
				TabNoc_test.Variables.lastCheckVideoIdAmount = scannedVideoArray.length;
				TabNoc_test.Variables.lastCheckWatchedVideoAmount = watchedVideoArray.length;
				TabNoc_test.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(scannedVideoArray, elements, ToggleState, watchedVideoArray) {
		var UnScannedElements = 0;

		if (ToggleState == null) {
			ToggleState = TabNoc_test.Variables.MarkToggleState;
		}
		
		for (i = 0; i < elements.length; i++) {
			var element = elements[i];

			if (element.className == "undefined") { continue; }
			
			if (element.className.includes("item-section") || element.className.includes("yt-shelf-grid-item")) {
				UnScannedElements = checkElement(element, scannedVideoArray, ToggleState, watchedVideoArray) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(element);
			}
		}
		TabNoc_test.Variables.MarkToggleState = ToggleState;

		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + scannedVideoArray.length + " Videos listed | " + watchedVideoArray.length + " Videos watched)")
	}

	function checkElement(checkElement, scannedVideoArray, ToggleState, watchedVideoArray) {
		//return true if checkedElement is already Scanned
		var SearchString = $(checkElement).find("." + (TabNoc_test.Variables.MultiRow ? "yt-uix-sessionlink" : "yt-uix-tile-link"))[0].getAttribute("href").replace("/watch?v=", "").split("&list")[0].split("&t=")[0];
		
		var v_ID = scannedVideoArray.indexOf(SearchString);
		var wv_ID = watchedVideoArray.indexOf(SearchString);
		
		var setColor = function(color) {
			$(checkElement).css("background-color", color);
			if (TabNoc_test.Variables.MultiRow) {
				$(checkElement).find(".yt-lockup-title, .yt-uix-sessionlink, .yt-lockup-byline").css("background-color", color);//yt-lockup-byline yt-uix-sessionlink yt-lockup-title
			}
			else {
				$(checkElement).find(".yt-uix-tile-link, .yt-lockup-description").css("background-color", color);
			}
		};
		
		if (ToggleState === true) {
			if (v_ID != -1) {
				setColor("rgb(151, 255, 139)");
				if (TabNoc_test.Settings.HideAlreadyWatchedVideos === true) {
					checkElement.style.display = "none";
				}
				return true;
			} 
			else if (wv_ID != -1) {
				setColor("rgb(166, 235, 158)");
				if (TabNoc_test.Settings.HideAlreadyWatchedVideos === true) {
					checkElement.style.display = "none";
				}
				return true;
			}
		}
		else {
			checkElement.children[0].setAttribute("style", "");
		}
		
		for (var i = 0; i < TabNoc_test.Settings.UninterestingVideos.length; i++) {
			if ($(checkElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc_test.Settings.UninterestingVideos[i])) {
				setColor("rgb(255, 175, 175)");
			}
		}
		for (var i = 0; i < TabNoc_test.Settings.NotWantedVideos.length; i++) {
			if ($(checkElement).find(".yt-uix-sessionlink.yt-ui-ellipsis")[0].textContent.includes(TabNoc_test.Settings.NotWantedVideos[i])) {
				//disableVideo 
				if (TabNoc_test.Settings.DeleteNotWantedVideos === true) {
					$(checkElement).remove();
				}
				else if(TabNoc_test.Settings.DeleteNotWantedVideos === false) {
					checkElement.style.display = "none";
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
			scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "({})");
			TabNoc_test.Variables.OldSaveData = scannedVideoArray.toSource();
			
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
						if (TabNoc_test.Settings.OpenInNewTabWhenScanned === true) {
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
			
			if (TabNoc_test.Settings.MarkAfterScan) {
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
			
			TabNoc_test.Variables.VideoChangeCheckInterval = setInterval(returnExec(function() {
				if (unsafeWindow.document.getElementById("movie_player").getVideoData().video_id != TabNoc_test.Variables.OldVideoID) {
					// Save Old Statistics
					if (TabNoc_test.Variables.WatchedLengthInterval != null) {
						clearInterval(TabNoc_test.Variables.WatchedLengthInterval);
					}
					SaveVideoStatistics();
					TabNoc_test.Variables.WatchedLengthInterval = null;
					TabNoc_test.Variables.WatchedLength = null;
					
					// Start On New Link
					TabNoc_test.Variables.OldVideoID = unsafeWindow.document.getElementById("movie_player").getVideoData().video_id;
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
			TabNoc_test.Variables.VideoStatisticsObject = {
				VideoID: unsafeWindow.document.getElementById("movie_player").getVideoData().video_id,
				VideoTitle: unsafeWindow.document.getElementById("movie_player").getVideoData().title,
				VideoAuthor: unsafeWindow.document.getElementById("movie_player").getVideoData().author,
				WatchedLength: -99,
				VideoLength: unsafeWindow.document.getElementById("movie_player").getDuration()
			}.toSource();
			
			
			if (GetVideoWatched(null, eval(TabNoc_test.Variables.VideoStatisticsObject).VideoID) === false) {
				PushVideoObject(null, null, eval(TabNoc_test.Variables.VideoStatisticsObject), true);
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
	
	function GetVideoWatched(watchedVideoArray, videoID) {
		if (watchedVideoArray === null) {
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "({})");
		}
		return watchedVideoArray.indexOf(videoID) !== -1;
	}
	
	function PushVideoObject(videoObjectDictionary, watchedVideoArray, videoObject, save) {
		if (videoObjectDictionary === null) {
			videoObjectDictionary = eval(GM_getValue("VideoObjectDictionary") || "({})");
		}
		if (watchedVideoArray === null) {
			watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "({})");
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
		scannedVideoArray = eval(GM_getValue("ScannedVideoArray") || "({})");
		
		// ### Watched-Videos ###
		watchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "({})");
		
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
		TabNoc_test.Variables.WatchedLength = 0;
		TabNoc_test.Variables.HasSavedDataOnEnd = false;
		TabNoc_test.Variables.WatchedLengthInterval = setInterval(function(){
			try{
				if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 1 /*Playing*/) {
					TabNoc_test.Variables.WatchedLength += 1;
					TabNoc_test.Variables.HasSavedDataOnEnd = false;
				}
				if (unsafeWindow.document.getElementById("movie_player").getPlayerState() == 0 && TabNoc_test.Variables.HasSavedDataOnEnd === false) {
					SaveVideoStatistics();
					TabNoc_test.Variables.HasSavedDataOnEnd = true;
				}
			} catch (exc) {
				console.error(exc);
				alert(exc);
			}
		}, 1000);
	}
	
	function SaveVideoStatistics(){
		if (TabNoc_test.Variables.VideoStatisticsObject == null){return false;}
		try {
			VideoStatisticsObject = eval(TabNoc_test.Variables.VideoStatisticsObject);
			VideoStatisticsObject.WatchedLength = TabNoc_test.Variables.WatchedLength;
			
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
		
		// ### Scanned-Videos ###
		scannedVideoArray = eval(GM_getValue("Scanned-Videos") || "({})");
		
		// ### Watched-Videos ###
		watchedVideoArray = eval(GM_getValue("Watched-Videos") || "({})");
		
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
		Version_WatchedVideoArray = eval(GM_getValue("WatchedVideoArray-Version") || -1);
		
		// ### ScannedVideoArray-Version ###
		Version_ScannedVideoArray = eval(GM_getValue("ScannedVideoArray-Version") || -1);
		
		// ### VideoObjectDictionary-Version ###
		Version_VideoObjectDictionary = eval(GM_getValue("VideoObjectDictionary-Version") || -1);
		
		//TODO: Die Einträge aus WatchedVideoArray entfernen welche nicht in VideoObjectDictionary stehen
		//TODO: ScannedVideoArray komplett entfernen, PRÜFEN!!!
		
		// ### WatchedVideoArray ###
		if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
			if (Version_WatchedVideoArray === -1) {
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
					
					if (GM_listValues().indexOf("Watched-Videos") !== -1) {
						GM_deleteValue("Watched-Videos-Version-1");
					}
					
					if (GM_listValues().indexOf("Watched-Videos") !== -1) {
						GM_deleteValue("Watched-Videos-Version");
					}
					
					GM_setValue("WatchedVideoArray-Version", 0);
					alert("DataBase:'WatchedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.");
				}
				else {
					alert("DataBase:'WatchedVideoArray' sucessfully initialised!");
				}
			}
			else {
				// ### WatchedVideoArray ###
				WatchedVideoArray = eval(GM_getValue("WatchedVideoArray") || "([])");
				
				switch (Version_WatchedVideoArray) {
					default:
						throw new Exception("No Update Implemeneted!");
						break;
				}
			}
		}
		// ### WatchedVideoArray ###
		
		//TODO: hier weitermachen
		
		
		if (Version_WatchedVideos != CurrentVersion_WatchedVideos) {
			// ### Watched-Videos ###
			var WatchedVideos = GM_getValue("Watched-Videos");
			if (WatchedVideos == null || WatchedVideos == "") {
				WatchedVideos = "([])";
			}
			WatchedVideos = eval(WatchedVideos);
			
			switch (Version_WatchedVideos) {
				case 0:
					// "/watch?v=" entfernt
					var new_WatchedVideos = ([]);
					for (i = 0; i < WatchedVideos.length; i++) {
						new_WatchedVideos.push(WatchedVideos[i].replace("/watch?v=", "").split("&list")[0]);
					}
					GM_setValue("Watched-Videos-Version-0", WatchedVideos.toSource());
					GM_setValue("Watched-Videos-Version", 1);
					GM_setValue("Watched-Videos", new_WatchedVideos.toSource());
					alert("DataBase:'Watched-Videos' Updated from Version 0 to Version 1.\r\nSucceeded!");
				break;
				
				case 1:
					// Watched Videos auffüllen mit Elementen von VideoStatistics
					var new_WatchedVideos = ([]);
					var VideoStatistics = eval(GM_getValue("VideoStatistics"))
					
					for (i = 0; i < WatchedVideos.length; i++) {
						if (WatchedVideos[i] != null)
							new_WatchedVideos.push(WatchedVideos[i]);
					}
					
					for (i = 0; i < VideoStatistics.length; i++) {
						var Link = VideoStatistics[i].VideoLink;
						var Id = VideoStatistics[i].VideoID;
						
						var Video = ((Link != "" && Link != null ) ? Link : Id).replace("/watch?v=", "").split("&list")[0];
						
						if (new_WatchedVideos.indexOf(Video) == -1) {
							new_WatchedVideos.push(Video);
						}
					}
				
					GM_setValue("Watched-Videos-Version-1", WatchedVideos.toSource());
					GM_setValue("Watched-Videos-Version", 2);
					GM_setValue("Watched-Videos", new_WatchedVideos.toSource());
					alert("DataBase:'Watched-Videos' Updated from Version 1 to Version 2.\r\n\r\nAdded Elements:" + (new_WatchedVideos.length - WatchedVideos.length) + "\r\n\r\n\r\n\t\t\t\t\t\tSucceeded!");
				break;
				
				default:
					throw "No Update Implemeneted!";
				break;
			}
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
