// ==UserScript==
// @name        Youtube - PauseAll
// @namespace   TabNoc
// @include     http*://www.youtube.*/watch?*
// @include     https://www.youtube.com/feed/subscriptions*
// @version     1.0.0
// @description Pauses All YouTube Videos on Userscript-Event
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_registerMenuCommand
// ==/UserScript==

var interval = null;

try {
	function registerTabNoc() {
		GM_registerMenuCommand("Alle Videos pausieren", function () {
			if (GM_getValue("PauseVideo") === true) {
				clearInterval(interval);
				if (confirm("Soll die Pause dauerhaft aktiviert werden") == true) {
					GM_setValue("PauseVideo", true);
				}
				else {
					GM_setValue("PauseVideo", false);
				}
			}
			else {
				GM_setValue("PauseVideo", true);
				interval = setTimeout(function(){GM_setValue("PauseVideo", false);}, 5000);
			}
		});
		console.log("Added PauseAll");
	}

	function OnCheckInterval(){
		try {
			if (unsafeWindow.document.getElementById("movie_player").getPlayerState() != 2) {
				if (GM_getValue("PauseVideo") === true) {
					console.log("Video paused");
					unsafeWindow.document.getElementById("movie_player").pauseVideo();
				}
			}
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}
	
	function Main() {
		try {
			registerTabNoc();
			
			setInterval(OnCheckInterval, 1000);
		} catch (exc) {
			console.error(exc);
			alert(exc);
		}
	}

	console.log("Youtube_-_PauseAll.user.js loading");
	if (document.getElementById("placeholder-player") == null) {
		registerTabNoc();
	} else {
		if (document.getElementById("movie_player") != null) {
			Main();
		}
	}
	console.log("Youtube_-_PauseAll.user.js done");
} catch (exc) {
	console.error(exc);
	alert(exc);
}