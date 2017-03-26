// ==UserScript==
// @name        MarkGolemPages
// @namespace   TabNoc
// @include     http*://www.golem.de/*
// @version     1.0.0_12122016
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/GM__.js
// @require     https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/base/TabNoc.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// @noframes
// ==/UserScript==

/*
ChangeList started at 12.12.2016

12.12.2016 - 1.0.0
Start Writing Script
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
			OldSaveData: "",
			
			WatchedTime: 0,
			LoadedWatchedTime: 0,
			SavedWatchedTime: 0,
			TimeSaveCycle: 0,
			
			ScanRangeElement: null,
			
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
				TimerInterval: 5000
			}
		},

		HTML: {
			StyleMarked: "background-color:rgb(151, 255, 139);background-image:linear-gradient(rgb(255, 255, 255), transparent)",
			StyleMustScanning: "background-color:rgb(255, 138, 138);background-image:linear-gradient(rgb(255, 255, 255), transparent)",
			TweetsDropDownButtons: '<br/><button class="dropdown-link js-dropdown-toggle" onclick="getAllElements({element});return true;">Bis hier Markieren [/\\]</button><button class="dropdown-link js-dropdown-toggle" onclick="getAllElements(null, {element});return true;">Ab hier Markieren [\\/]</button><button class="dropdown-link js-dropdown-toggle" onclick="scanRange({element});return true;">Markierbereich</button>'
		}
	});
	
	// ### http*://www.golem.de ###
	function StartPageLoader() {
		console.log("MarkGolemPages.user.js loading");
		try {
			registerTabNoc();
			
			TabNoc.Variables.checkElementsInterval = setInterval(returnExec(function () {
				startCheckElements(TabNoc.Variables.MarkToggleState);
			}), TabNoc.Settings.Personal.TimerInterval);
			startCheckElements(TabNoc.Variables.MarkToggleState);
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

		GM_registerMenuCommand("Einlesen", function () {
			getAllElements();
		});
	}

	function startCheckElements(ToggleState, force) {
		if (document.hidden === false || force === true) {
			// ### Readed-News ###
			var RNewsArray = getArray("Readed-News");
			// ### Seen-News ###
			var SNewsArray = getArray("Seen-News");

			var elements = $("#index-promo, .list-articles>li");
			if (force === true || TabNoc.Variables.lastCheckItemCount !== elements.length || 
			TabNoc.Variables.lastCheckRNewsAmount !== RNewsArray.length || 
			TabNoc.Variables.lastCheckSNewsAmount !== SNewsArray.length) {
				execTime(checkElements, RNewsArray.reverse(), elements, ToggleState, SNewsArray.reverse());
				
				TabNoc.Variables.lastCheckRNewsAmount = RNewsArray.length;
				TabNoc.Variables.lastCheckSNewsAmount = SNewsArray.length;
				TabNoc.Variables.lastCheckItemCount = elements.length;
			}
		}
	}

	function checkElements(RNewsArray, elements, ToggleState, SNewsArray) {
		var UnScannedElements = 0;

		if (ToggleState == null) {
			ToggleState = TabNoc.Variables.MarkToggleState;
		}
		
		for (i = 0; i < elements.length; i++) {
			var element = elements[i];

			if ($(element).children("a").length === 1 && ($(element).children("a")[0].getAttribute("id").includes("hpalt") || 
														  $(element).children("a")[0].getAttribute("id").includes("bigalt"))) {
				UnScannedElements = checkElement(element, RNewsArray, ToggleState, SNewsArray) == true ? UnScannedElements : UnScannedElements + 1;
			} else {
				console.warn(element);
			}
		}
		TabNoc.Variables.MarkToggleState = ToggleState;

		console.log((elements.length - UnScannedElements) + " Marked Elements | " + UnScannedElements + " UnMarked Elements | Total " + elements.length + " Elements (" + RNewsArray.length + " Newspages listed)")
	}

	function checkElement(checkElement, RNewsArray, ToggleState, SNewsArray) {
		//return true if checkedElement is already Scanned
		var SearchString = $(checkElement).children("a")[0].getAttribute("href");
		
		var ReadedID = RNewsArray.indexOf(SearchString);
		var SeenID = SNewsArray.indexOf(SearchString);
		
		var setColor = function(color) {
			$(checkElement).css("background-color", color);
		};
		
		if (ToggleState === true) {
			if (ReadedID != -1) {
				setColor("rgb(151, 255, 139)");
				if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
					checkElement.style.display = "none";
				}
				return true;
			} 
			else if (SeenID != -1) {
				setColor("rgb(216, 246, 225)");
				if (TabNoc.Settings.HideAlreadyWatchedNews === true) {
					checkElement.style.display = "none";
				}
				return true;
			}
		}
		else {
			checkElement.setAttribute("style", "");
		}
		
		return false;
	}
	
	function getAllElements(from, till) {
		try {
			var start = new Date().getTime();
			
			// ### Seen-News ###
			var SNewsArray = getArray("Seen-News");
			// ### Readed-News ###
			var RNewsArray = getArray("Readed-News");
			
			TabNoc.Variables.OldSaveDataR = RNewsArray.toSource();
			TabNoc.Variables.OldSaveDataS = SNewsArray.toSource();
			
			var elements = $("#index-promo, .list-articles>li");

			var fromIndex = from == null ? 0 : elements.toArray().findIndex(function (element) { return $(element).children("a")[0].getAttribute("href") == from; });
			if (fromIndex == -1) throw "from(" + from + ") were not found";

			var tillIndex = till == null ? elements.length : (elements.toArray().findIndex(function (element) { return $(element).children("a")[0].getAttribute("href") == till; }) + 1);
			if (tillIndex == -1) throw "till(" + till + ") were not found";
			tillIndex > elements.length ? elements.length : tillIndex;

			for (i = fromIndex; i < tillIndex; i++) {
				var element = elements[i];
				var currentElementId = $(element).children("a")[0].getAttribute("href");
				
				if ($(element).children("a").length === 1 && ($(element).children("a")[0].getAttribute("id").includes("hpalt") || 
															  $(element).children("a")[0].getAttribute("id").includes("bigalt"))) {
					if (SNewsArray.indexOf(currentElementId) == -1 && RNewsArray.indexOf(currentElementId) == -1) {
						SNewsArray.push(currentElementId);
					}
				} else {
					console.warn(element);
				}
			}

			GM_setValue("Seen-News", SNewsArray.toSource());
			
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
			// if (unsafeWindow.document.getElementById("movie_player") == null) {return false;}
			
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
	
	function ReadingNewspage(reverse){
		try {
			if (reverse !== true) reverse = false;
			
			// ### Readed-News ###
			var RNews = getArray("Readed-News");
			// ### Seen-News ###
			var SNews = getArray("Seen-News");
			
			if (SNews.indexOf(document.URL) !== -1 && reverse === false) {
				console.log(SNews);
				SNews.remove(document.URL);
				GM_setValue("Seen-News", SNews.toSource());
			}
			
			if (RNews.indexOf(document.URL) === -1) {
				RNews.push(document.URL);
				GM_setValue("Readed-News", RNews.toSource());
				console.info("MarkGolemPages.user.js: Newspage added");
			}
			else {
				if (reverse === true) {
					RNews.remove(document.URL);
					GM_setValue("Readed-News", RNews.toSource());
					console.info("MarkGolemPages.user.js: Newspage removed!");
				} 
				else {
alert("readed");
				}
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	// ### http*://www.golem.de/news/* ###

	function UpdateDataBase() {
		return;
		var CurrentVersion_Videos = 0;
		var CurrentVersion_WatchedVideos = 2;
		
		// ### Watched-Videos-Version ###
		var Version_WatchedVideos = GM_getValue("Watched-Videos-Version");
		if (Version_WatchedVideos == null || Version_WatchedVideos == "") {
			Version_WatchedVideos = 0;
		}
		Version_WatchedVideos = eval(Version_WatchedVideos);
		
		// ### Videos-Version ###
		var Version_Videos = GM_getValue("Videos-Version");
		if (Version_Videos == null || Version_Videos == "") {
			Version_Videos = 0;
		}
		Version_Videos = eval(Version_Videos);
		
		if (Version_Videos != CurrentVersion_Videos) {
			// ### Videos ###
			var Videos = GM_getValue("Videos");
			if (Videos == null || Videos == "") {
				Videos = "([])";
			}
			Videos = eval(Videos);
			
			switch (Version_Videos) {
				default:
					throw new Exception("No Update Implemeneted!");
					break;
			}
		}
		
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
	
	function getArray(arrayName) {
		var array = GM_getValue(arrayName);
		if (array == null || array == "") {
			array = "([])";
			GM_setValue(arrayName, array);
		}
		array = eval(array);
		return array;
	}
	
	function Main() {
		UpdateDataBase();
		
		// Startseite
		if (document.URL.includes("news") == false) {
			$(StartPageLoader)
		}
		// Nachrichtenseite
		else if (document.URL.includes("news") == true) {
			$(NewsPageLoader)
		}
		else {
			alert("MarkGolemPages.user.js:Main()->No LoadObject found!");
			console.info("No LoadObject found!");
		}
	}
	
	Main();
	
	console.info("MarkGolemPages.user.js [v" + GM_info.script.version + ", Autoupdate: " + GM_info.scriptWillUpdate + "] readed");
} catch (exc) {
	console.error(exc);
	alert(exc);
}
