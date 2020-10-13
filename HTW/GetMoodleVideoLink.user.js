// ==UserScript==
// @name         GetMoodleVideoLink
// @namespace    http://tabnoc.net/
// @version      0.1
// @updateURL    ?
// @description  Opens a prompt with the Url of the Video File
// @author       TabNoc
// @match        https://moodle.htw-berlin.de/mod/vimp/view.php?id=*
// @match        https://mediathek.htw-berlin.de/media/embed?*
// @grant        window.close
// ==/UserScript==

// @run-at       context-menu

(function() {
	'use strict';

	if (window.top === window.self) {
		window.addEventListener("message", function(event) {
			window.console.log("This is data from '" + event.data.title +
								"'; with message '" + event.data.message +
								"'; with data '" + event.data.data + "'" +
								"'; from domain '" + event.data.domain + "'");
			if (prompt("VideoUrl:", event.data.data) === event.data.data) {
				window.close();
			}
		}, false);
	}
	else {
		window.top.postMessage({
			title: document.title,
			domain: document.domain,
			message: "Hello from, iframe - " + document.title,
			data: document.querySelector("#p_video>source").src
		}, "*");
	}
	// Your code here...
})();
