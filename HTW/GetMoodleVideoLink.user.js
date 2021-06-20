// ==UserScript==
// @name         GetMoodleVideoLink
// @namespace    https://github.com/mnpingpong/TabNoc_Userscripts
// @version      0.8
// @updateURL    https://github.com/mnpingpong/TabNoc_Userscripts/raw/master/HTW/GetMoodleVideoLink.user.js
// @description  Opens a prompt with the Url of the Video File
// @author       TabNoc
// @match        https://moodle.htw-berlin.de/mod/vimp/view.php?id=*
// @match        https://mediathek.htw-berlin.de/media/embed?*
// @match        https://mediathek.htw-berlin.de/category/video/*
// @match        https://mediathek.htw-berlin.de/m/*
// @grant        window.close
// @grant        GM_setClipboard
// ==/UserScript==

// @run-at       context-menu

(function () {
	'use strict';

	if (window.top === window.self) {
		window.addEventListener("message", function (event) {
			window.console.log("This is data from '" + event.data.title +
				"'; with message '" + event.data.message +
				"'; with data '" + event.data.data + "'" +
				"'; from domain '" + event.data.domain + "'");

			let title = event
				.data
				.title
				.replaceAll(":", " _-_ ")
				.replaceAll("\"", "'")
				.replaceAll("/", "-")
				.replaceAll("  ", " ");

			let blub = function () {
				let result = prompt("1: Copy VideoUrl\r\n2: Open Video in new Tab and close current\r\n3: Copy modified Video-Title\r\n4: Open Video in new Tab\r\n5: Close Tab", "2");
				console.log(result);
				switch (result) {
					case "1":
						GM_setClipboard(event.data.data, "text");
						blub();
						break;

					case "2":
						window.open(event.data.data);
						window.close();
						break;

					case "3":
						GM_setClipboard(title, "text");
						blub();
						break;

					case "4":
						window.open(event.data.data);
						break;

					case "5":
						window.close();
						break;

					case null:
					default:
						break;
				}
			};

			blub();
		}, false);

		if (location.href.startsWith("https://mediathek.htw-berlin.de/category/video") ||
			location.href.startsWith("https://mediathek.htw-berlin.de/m/")) {
			setTimeout(() => window.top.postMessage({
				title: document.querySelector("h1").textContent,
				domain: document.domain,
				message: "Hello from, mediathek.htw-berlin.de - " + document.title,
				data: document.querySelector("video>source").src
			}, "*"), 1000);
		}
	}
	else {
		window.top.postMessage({
			title: document.querySelector("#p_video").getAttribute("data-piwik-title"),
			domain: document.domain,
			message: "Hello from, iframe - " + document.title,
			data: document.querySelector("#p_video>source").src
		}, "*");
	}
	// Your code here...
})();
