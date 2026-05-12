// ==UserScript==
// @name        MarkOpenedVideos
// @namespace   TabNoc
// @include     http*://www.youtube.com/feed/subscriptions
// @include     http*://www.youtube.com/user/*
// @include     http*://www.youtube.com/c*/*
// @include     http*://www.youtube.com/c*/*/videos*
// @include     http*://www.youtube.com/c*/*/featured*
// @include     http*://www.youtube.com/@*/*
// @include     http*://www.youtube.com/@*/*/videos*
// @include     http*://www.youtube.com/@*/*/featured*
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

import jQuery from "jquery";

import "./String"

let TabNoc = {
  Variables: {
    MarkToggleState: true,

    WatchedLength: 0,
    HasSavedDataOnEnd: false,

    CurrentVideoID: null as string | null,

    VideoStatisticsObject: null as string | null,

    checkElementsInterval: null as number | null,
    lastCheckItemCount: 0,
    lastCheckVideoIdAmount: 0,
    lastCheckWatchedVideoAmount: 0,
    lastCheckVideoObjectAmount: 0,

    LastFullScreenElement: null as HTMLElement | null,

    Data: {},

    HasInstalledWatchingVideo: false,
    LastSaveWatchedLength: null as number | null,

    EndTime: 0,

    LastIntervalTime: null as number | null,
  },

  Settings: {
    SavingEnabled: true,
    TimerInterval: 5000,
    UninterestingVideos: ["Recht für YouTuber:"],
    NotWantedVideos: [
      "Arumba Plays DOTA",
      "Europa Universalis IV",
      "Let's Play Crusader Kings 2",
      "Challenge WBS",
      "Let's Play Civilization VI",
      "Let's Play Galactic Civilizations 3",
      "The Binding of Isaac ",
      "Civilization 6",
      "Endless Space",
      "Galactic Cililisations 3",
      "Civilization V",
      "Let's Play Stellaris",
      "SPAZ2",
      "EU4",
      "Factorio S7E",
      "Lets Play S9 E",
    ],
    DeleteNotWantedVideos: false,
    HideAlreadyWatchedVideos: false,
    ShowAlreadyWatchedDialog: false,
    Debug: false,
  },

  HTML: {},
};

function execTime(func, arg1, arg2, arg3, arg4, arg5) {
  var start = new Date().getTime();

  var returnvar;

  if (typeof (func) === "string")
    returnvar = exec(arg1, arg2, arg3, arg4, arg5);
  else
    returnvar = exec(func, arg1, arg2, arg3, arg4, arg5);

  var time = new Date().getTime() - start;

  if (typeof (func) === "string")
    console.log(func + ' time: ' + time);
  else
    console.log('Execution time: ' + time);

  return returnvar;
}

function exec(func, arg1, arg2, arg3, arg4, arg5) {
  try {
    return func(arg1, arg2, arg3, arg4, arg5);
  }
  catch (exc) {
    alert(exc);
    console.error(exc);
  }
}

function returnExec(func:Function, arg1?, arg2?, arg3?, arg4?, arg5?) {
  return function (arg1, arg2, arg3, arg4, arg5) {
    try {
      return func(arg1, arg2, arg3, arg4, arg5);
    }
    catch (exc) {
      alert(exc);
      console.error(exc);
    }
  };
}

function escapeRegExp(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

if (String.prototype.contains === undefined) { String.prototype.contains = String.prototype.includes; }
if (String.prototype.replaceAll === undefined) { String.prototype.replaceAll = function (search, replacement) { var target = this; return target.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), replacement); }; }
if (Date.prototype.timeNow === undefined) { Date.prototype.timeNow = function () { return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds(); }; }

var Feedback:any = null;
if (jQuery != undefined) {
  Feedback = {
    messageTimeout: null,
    showMessage: (function (message, type, time, onClickFunction) {
      var element = null;
      clearTimeout(Feedback.messageTimeout);
      Feedback.messageTimeout = null;

      if (document.getElementById("feedback") != null) {
        element = document.getElementById("feedback");
        $(element).off();
      }
      else {
        element = document.createElement("div");
        element.id = "feedback";
        element.title = "Dismiss";
        element.setAttribute("style", "position: fixed; top: 10px; text-align: center; width: 100%; z-index: 2147483647;");
        element.innerHTML = '<span style="border-radius: 5px; cursor: pointer; color: #fff; padding: 3px 6px; font-size: 16px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2); text-shadow: 0 1px rgba(0, 0, 0, 0.2);"></span>';
        document.body.appendChild(element);
      }
      element.children[0].textContent = message.replaceAll("\r\n", "<br>");
      element.children[0].style.backgroundColor = ((type == "notify") ? "#00A550" : "#C41E3A");
      $(element).on("click", onClickFunction || Feedback.hideMessage);

      if (time) {
        Feedback.messageTimeout = setTimeout(Feedback.hideMessage, time);
      }
    }),
    hideMessage: (function () {
      var element = document.getElementById("feedback");
      if (element != null) {
        if (Feedback.messageTimeout != null) {
          clearTimeout(Feedback.messageTimeout);
          Feedback.messageTimeout = null;
        }
        element.removeEventListener("click", Feedback.hideMessage, false);
        document.body.removeChild(element);
      }
    }),
    error: (function (message, time, onClickFunction) {
      Feedback.showMessage(message || "Something went wrong", "error", (time == null ? 8000 : time), onClickFunction);
    }),
    notify: (function (message, time, onClickFunction) {
      Feedback.showMessage(message, "notify", (time == null ? 5000 : time), onClickFunction);
    }),
    showProgress: (function (percent, msg, time, onClickFunction) {
      if (msg != null) {
        Feedback.showMessage(msg, "notify", time || 900, onClickFunction);
      }
      var elementID = this.Locked === true ? "myProgress2" : "myProgress";
      if (percent >= 100 || percent < 0) {
        if ($("#" + elementID).length === 1) {
          $("#" + elementID).css("transition-duration", "900ms");
          $("#" + elementID).css("width", Math.round(percent) + "%");
          setTimeout(this.Locked === true ? Feedback.hideProgress2 : Feedback.hideProgress, 800);
        }
        return;
      }
      if ($("#" + elementID).length !== 1 && percent < 100 && percent >= 0) {
        var style = "position: fixed; z-index: 2147483647; top: " + (this.Locked === true ? "2" : "0") + "px; left: -6px; width: 0%; height: 2px; background: #b91f1f; border-radius: 1px; transition: width 500ms ease-out,opacity 500ms linear; transform: translateZ(0); will-change: width,opacity;";
        var styleNested = "position: absolute; top: " + (this.Locked === true ? "2" : "0") + "px; height: 2px; box-shadow: #b91f1f 1px 0 6px 1px;border-radius: 100%;";
        var styleDt = "opacity: .6; width: 180px; right: -80px; clip: rect(-6px,90px,14px,-6px);";
        var styleDd = "opacity: .6; width: 20px; right: 0; clip: rect(-6px,22px,14px,10px);";
        var progressBarHTML = $("<div id=\"" + elementID + "\" style=\"" + style + "transition-duration: 300ms;width: 0%;height: 2px\"><dt style=\"" + styleNested + styleDt + "\"></dt><dd style=\"" + styleNested + styleDd + "\"></dd></div>");

        $(document.body).append(progressBarHTML);
      }
      $("#" + elementID).show();
      $("#" + elementID).css("width", Math.round(percent) + "%");
    }),
    hideProgress: (function () {
      if ($("#myProgress").length === 1) {
        $("#myProgress").hide();
      }
    }),
    hideProgress2: (function () {
      if ($("#myProgress2").length === 1) {
        $("#myProgress2").hide();
      }
    }),
    Locked: false,
    lockProgress: (function () {
      if (this.Locked === true) {
        throw "TabNoc.js:Fedback.lockProgress->Die Progressbar kann nicht gesperrt werden wenn sie bereits gesperrt ist.";
      }
      this.Locked = true;
    }),
    unlockProgress: (function () {
      if (this.Locked === false) {
        throw "TabNoc.js:Fedback.unlockProgress->Die Progressbar kann nicht entsperrt werden wenn sie nicht gesperrt ist.";
      }
      this.Locked = false;
    })
  };
}

import { ApiAdapter } from "./api/ApiAdapter";
import { GM_registerMenuCommand, GM_xmlhttpRequest, unsafeWindow } from "$";

var apiAdapter = new ApiAdapter();

// ### https://www.youtube.com/ ###
function SubscriptionPageLoader() {
  console.log("MarkOpenedVideos.user.js loading [SubscriptionPageLoader]");
  try {
    registerTabNoc();

    TabNoc.Variables.checkElementsInterval = setInterval(
      returnExec(function () {
        startCheckElements(TabNoc.Variables.MarkToggleState);
      }),
      TabNoc.Settings.TimerInterval,
    );
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

  GM_registerMenuCommand("Markieren", function () {
    startCheckElements(!TabNoc.Variables.MarkToggleState);
  });
}

function startCheckElements(ToggleState:boolean, force?: boolean) {
  if (
    (document.hidden === false && document.hasFocus()) ||
    force === true
  ) {
    var start = new Date().getTime();

    var widthElement = $("ytd-two-column-browse-results-renderer");
    if (widthElement.length > 0) {
      if (widthElement.width() == 1284) {
        widthElement.css("width", "1356px");
      } else if (widthElement.width() == 856) {
        widthElement.css("width", "903px");
      } else if (
        widthElement.width() != 1356 &&
        widthElement.width() != 903
      ) {
        console.log("no width change defined for " + widthElement.width());
      }
    }

    let sidebarSelector = "yt-lockup-view-model.ytd-item-section-renderer";
    let channelPageSelector = "ytd-rich-item-renderer";
    let videoFinishedSelector = "a.ytp-modern-videowall-still"; // probably not working, as this has a different structure
    let searchPageSelector = "ytd-video-renderer";
    let excludedSelector =
      "ytd-ad-slot-renderer, ytd-rich-grid-slim-media, .ytd-rich-shelf-renderer";
    let elements = Array.from(document.querySelectorAll(
      `${channelPageSelector},${sidebarSelector},${videoFinishedSelector},${searchPageSelector}`,
    )).filter(
      (el) => !el.querySelector(excludedSelector),
    );
    console.log("elements", elements);

    force = true;

    if (
      force === true ||
      TabNoc.Variables.lastCheckItemCount !== elements.length ||
      TabNoc.Variables.lastCheckVideoIdAmount !== scannedVideoArray.length ||
      TabNoc.Variables.lastCheckWatchedVideoAmount !==
      watchedVideoArray.length ||
      TabNoc.Variables.lastCheckVideoObjectAmount !==
      GetElementCount(videoObjectDictionary)
    ) {
      checkElements(
        watchedVideoArray.reverse(),
        scannedVideoArray.reverse(),
        videoObjectDictionary,
        elements,
        ToggleState,
      );

      TabNoc.Variables.lastCheckVideoIdAmount = scannedVideoArray.length;
      TabNoc.Variables.lastCheckWatchedVideoAmount = watchedVideoArray.length;
      TabNoc.Variables.lastCheckVideoObjectAmount = GetElementCount(
        videoObjectDictionary,
      );
      TabNoc.Variables.lastCheckItemCount = elements.length;
    }
    CheckWatchingVideo();

    var time = new Date().getTime() - start;
    if (time > 5) {
      console.log("startCheckElements() Execution time: " + time);
    }
  }
}

function checkElements(
  watchedVideoArray,
  scannedVideoArray,
  videoObjectDictionary,
  elements,
  ToggleState:boolean,
) {
  var UnScannedElements = 0;
  console.log("Initialised Scan");
  Feedback.showProgress(0, "Initialised Scan");

  if (ToggleState == null) {
    ToggleState = TabNoc.Variables.MarkToggleState;
  }

  for (let i = 0; i < elements.length; i++) {
    Feedback.showProgress(
      (i / elements.length) * 100,
      "Analysing Element " + i + " from " + elements.length,
    );
    var currentElement = elements[i];

    UnScannedElements =
      checkElement(
        watchedVideoArray,
        scannedVideoArray,
        videoObjectDictionary,
        currentElement,
        ToggleState,
      ) == true
        ? UnScannedElements
        : UnScannedElements + 1;
  }
  TabNoc.Variables.MarkToggleState = ToggleState;

  Feedback.showProgress(
    100,
    "Finished " + (elements.length - UnScannedElements) + " elements marked",
    TabNoc.Settings.HideAlreadyWatchedVideos === true ? 1000 : 7500,
    function () {
      TabNoc.Settings.HideAlreadyWatchedVideos = true;
      startCheckElements(true, true);
      Feedback.hideMessage();
    },
  );
  console.log(
    String.format(
      "Found {0} Elements ({1} Marked Elements | {2} UnMarked Elements) [{3} Scanned Videos | {4} Watched Videos | {5} Watched Videos(old)]",
      elements.length,
      elements.length - UnScannedElements,
      UnScannedElements,
      scannedVideoArray.length,
      Object.keys(videoObjectDictionary).length,
      watchedVideoArray.length,
    ),
  );
}

function checkElement(
  watchedVideoArray,
  scannedVideoArray,
  videoObjectDictionary,
  currentElement,
  ToggleState,
) {
  //return true if checkedElement is already Scanned or no videoID was found

  var infoElement = $(currentElement).find(
    ".yt-lockup-metadata-view-model__title",
  );

  let VideoID = getVideoIdFromElement(currentElement);

  console.log(
    "currentElement",
    currentElement,
    "infoElement",
    infoElement,
    "VideoID",
    VideoID,
  );

  if (VideoID == null) {
    return true;
  }

  infoElement.attr(
    "title",
    infoElement.attr("aria-label").replace("Minuten,", "Minuten"),
  );

  currentElement.style.borderRadius = "15px";
  currentElement.style.border = "1px solid #ddd";
  currentElement.style.padding = "5px";
  // currentElement.style.minHeight = "187px";

  if (GetVideoWatched(scannedVideoArray, false, VideoID)) {
    if (ToggleState === true)
      $(currentElement).css("background-color", "rgb(151, 255, 139)");
    if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
      currentElement.style.display = "none";
    }
    return true;
  } else if (
    GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID)
  ) {
    if (ToggleState === true)
      $(currentElement).css("background-color", "rgb(166, 235, 158)");
    if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
      currentElement.style.display = "none";
    }
    return true;
  } else {
    $(currentElement).css("background-color", "");
    currentElement.style.display = "";
  }

  for (let i = 0; i < TabNoc.Settings.UninterestingVideos.length; i++) {
    if (
      infoElement[0].textContent.includes(
        TabNoc.Settings.UninterestingVideos[i],
      )
    ) {
      $(currentElement).css("background-color", "rgb(255, 175, 175)");
      break;
    }
  }
  for (let i = 0; i < TabNoc.Settings.NotWantedVideos.length; i++) {
    if (
      infoElement[0].textContent.includes(TabNoc.Settings.NotWantedVideos[i])
    ) {
      //disableVideo
      if (TabNoc.Settings.DeleteNotWantedVideos === true) {
        $(currentElement).remove();
      } else {
        currentElement.style.display = "none";
      }
      break;
    }
  }

  return false;
}

/**
 * @param {Element} element - The DOM element (or jQuery-wrapped element) to inspect.
 * @returns {string|null} The extracted video id or normalized link fragment, or null when no valid single-video id is found
 */
function getVideoIdFromElement(element) {
  let link;
  console.info("getVideoIdFromElement", element);

  // "ytd-rich-item-renderer" -> Start page (this is a container, not the actual video element. This is also used in the sidebar, but encapsulates all videos there)
  if (element.localName === "ytd-rich-item-renderer") {
    if (element.querySelector("ytm-shorts-lockup-view-model-v2") !== null) {
      console.debug("found shorts layout element");
      return null;
    }
    element = element.querySelector("#content>yt-lockup-view-model");
  } else if (element.localName === "yt-lockup-view-model") {
    //ok
  } else {
    element = null;
  }

  if (element == null) {
    console.debug("found unknown layout element");
    return null;
  }

  let thumbnailElement = element.querySelector(
    ".yt-lockup-view-model__content-image",
  );
  if (thumbnailElement == null) {
    console.warn("did not find thumbnail element");
    return null;
  }
  link = thumbnailElement.getAttribute("href");

  console.info(element, "link:", link);
  link = link
    .replace("https://www.youtube.com", "")
    .replace("/watch?v=", "")
    .split("&t=")[0]
    .split("&pp=")[0];
  if (link.includes("&list=")) {
    link = null;
    console.info(element, "found playlist link, ignoring");
  }
  console.info(element, "VideoId:", link);
  return link;
}

// ### https://www.youtube.com/ ###

// ### https://www.youtube.com/watch?v=* ###
function CheckWatchingVideo(forcedOperation?: "install" | "uninstall" | null) {
  // if (TabNoc.Settings.Debug === true) {
  var start = new Date().getTime();
  // }
  var movie_player = unsafeWindow.document.getElementById("movie_player");
  var moviePlayerExistsWithVideo =
    movie_player != null &&
    movie_player.getVideoData != undefined &&
    movie_player.getVideoData().video_id != undefined &&
    movie_player.getVideoData().author != "" &&
    movie_player.getVideoData().title != "" &&
    movie_player.getVideoData().video_quality != undefined;

  if (
    (moviePlayerExistsWithVideo == true &&
      TabNoc.Variables.HasInstalledWatchingVideo == false) ||
    forcedOperation == "install"
  ) {
    TabNoc.Variables.CurrentVideoID = movie_player.getVideoData().video_id;

    WatchingVideo();
    ManageTimes(movie_player);

    TabNoc.Variables.HasInstalledWatchingVideo = true;
  }
  if (
    (moviePlayerExistsWithVideo == false &&
      TabNoc.Variables.HasInstalledWatchingVideo == true) ||
    forcedOperation == "uninstall"
  ) {
    SaveVideoStatistics();

    TabNoc.Variables.LastSaveWatchedLength = null;
    TabNoc.Variables.VideoStatisticsObject = null;
    TabNoc.Variables.WatchedLength = 0;
    TabNoc.Variables.HasSavedDataOnEnd = false;
    TabNoc.Variables.LastIntervalTime = null;

    TabNoc.Variables.HasInstalledWatchingVideo = false;
  }
  if (
    TabNoc.Variables.HasInstalledWatchingVideo === true &&
    forcedOperation == null
  ) {
    WatchingVideoIntervalHandler(movie_player);
  }
  // if (TabNoc.Settings.Debug === true) {
  var time = new Date().getTime() - start;
  if (time > 10) {
    console.log("CheckWatchingVideo execution time: " + time);
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
    movie_player.setPlaybackRate(
      1.25 +
      (VideoTitle.contains("Recht für YouTuber") ||
        VideoTitle.contains("Challenge WBS")
        ? 0.25
        : 0),
    );
    if (VideoTitle.contains("| Fernsehauftritt bei")) {
      TabNoc.Variables.SkipTime = 24; // neuerdings am anfang sprechgedöns -> erhöhen
      TabNoc.Variables.EndTime += 12;
      // TabNoc.Variables.SkipOver.push({
      // start : 5,
      // end : 18//20
      // });
    } else {
      AddGreyDetector({
        CallBack: function (amount) {
          console.log("VideoGreyDetector Triggered: " + amount);
          movie_player.seekTo(
            movie_player.getCurrentTime() +
            11 +
            (VideoTitle.contains("Dr. Carsten Föhlisch") ? 5 : 0),
          );
        },
        Interval: 100,
        DetectorInterval: null,
        CopySizePercentage: 10,
        BaseVideo: document.getElementsByClassName("html5-main-video")[0],
        TriggerAmount: 5000, //14000,
        TriggerDarkPercentage: 70,
        StopIntervalAfterTrigger: true,
        MaxVideoCheckTime: 60000,
      });
    }
  }
  if (
    Author === "SemperVideo" ||
    Author === "SemperErratum" ||
    Author === "SemperCensio"
  ) {
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
      start: 1340,
      end: 1415,
    });
  }
  if (Author === "XoXMeineAnimeWeltXoX") {
    //Anime: Kanon 2006
    TabNoc.Variables.SkipTime = 0;
    TabNoc.Variables.EndTime = 0;
    TabNoc.Variables.SkipOver.push({
      start: 105,
      end: 180,
    });
    TabNoc.Variables.SkipOver.push({
      start: 1335,
      end: 150,
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
  if (
    Author === "Linus Tech Tips" ||
    Author === "TechLinked" ||
    Author === "Techquickie" ||
    Author === "LMG Clips"
  ) {
    movie_player.setPlaybackRate(1.4);
  }
  if (Author === "Techquickie") {
    // TabNoc.Variables.SkipTime = 4;
  }
  if (Author === "Gamers Nexus") {
    movie_player.setPlaybackRate(1.25);
  }
  if (Author === "Asmongold TV") {
    movie_player.setPlaybackRate(1.4);
  }

  if (
    TabNoc.Variables.SkipTime > 0 &&
    movie_player.getCurrentTime() < TabNoc.Variables.SkipTime
  ) {
    movie_player.seekTo(TabNoc.Variables.SkipTime);
  }
}

function remainingTimeManager(movie_player) {
  var duration = movie_player.getDuration();
  var currentTime = movie_player.getCurrentTime();
  var remainingTime = duration - currentTime;

  var oldRemainingTimeString = TabNoc.Variables.RemainingTimeString;
  TabNoc.Variables.RemainingTimeString = "";

  remainingTime = Math.floor(
    (remainingTime - TabNoc.Variables.EndTime) /
    movie_player.children[0].children[0].playbackRate,
  ); //movie_player.getPlaybackRate());

  // Zeitwert-string formatieren
  if (remainingTime >= 60) {
    // über einer Minute
    TabNoc.Variables.RemainingTimeString +=
      Math.floor(remainingTime / 60) +
      (remainingTime < 120 ? " Minute und " : " Minuten und ");
  }
  TabNoc.Variables.RemainingTimeString +=
    (remainingTime % 60 < 10 ? "0" : "") +
    (remainingTime % 60) +
    " Sekunde" +
    (remainingTime % 60 !== 1 ? "n" : "");

  // Verwaltung der RemainTime anzeige
  if (TabNoc.Variables.RemainingTimeString !== oldRemainingTimeString) {
    remainingTimeOutput(TabNoc.Variables.RemainingTimeString);
  }

  //MarkRemainTimeOnLowBuffer

  // current Video Buffer Size
  var BufferSize =
    (movie_player.getVideoLoadedFraction() * movie_player.getDuration() -
      movie_player.getCurrentTime()) /
    movie_player.getPlaybackRate();
  // is the BufferSize below the SettingValue and not fully loaded
  var LowBuffer =
    BufferSize < 10 && movie_player.getVideoLoadedFraction() !== 1;

  // Buffer is getting Low -> Start Showing red Label
  if (LowBuffer === true && TabNoc.Variables.LastCheckLowBuffer === false) {
    $("#page")
      .removeClass("MyAddMarginPage")
      .addClass("MyAddMarginPageWithoutImage");
    remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
  }

  // Buffer is Low and Buffersize has changed
  if (
    LowBuffer === true &&
    TabNoc.Variables.LastCheckBufferSize !== BufferSize
  ) {
    remainingTimeOutput(TabNoc.Variables.RemainingTimeString, BufferSize);
    TabNoc.Variables.LastCheckBufferSize = BufferSize;
  }
  // Buffer is getting high -> remove red Label
  else if (
    LowBuffer === false &&
    TabNoc.Variables.LastCheckLowBuffer === true
  ) {
    $("#page")
      .addClass("MyAddMarginPage")
      .removeClass("MyAddMarginPageWithoutImage")
      .removeClass("MyAddMarginPageWithImage");

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
    $("#TabNoc_YT_Jump").append(
      '<span id="RemainTimeStart">Es verbleiben </span><span id="RemainTimeTime"></span><span id="RemainTimeBuffer" style="display:none;color: red;font-weight: bold;"><br>Buffer : ca. <span id="RemainTimeBufferText"></span>s<img id="RemainTimeImage"></span>',
    );
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
    } else {
      $(BufferId).show();
      $(BufferTextId)[0].textContent = Math.floor(BufferSize);
    }
  }
}

function WatchingVideo() {
  if (TabNoc.Settings.Debug === true) {
    console.groupCollapsed("WatchingVideo");
    console.log(
      "WatchingVideo()->old:",
      JSON.parse(TabNoc.Variables.VideoStatisticsObject),
      TabNoc.Variables.VideoStatisticsObject,
    );
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
      VideoID: unsafeWindow.document
        .getElementById("movie_player")
        .getVideoData().video_id,
      VideoTitle: unsafeWindow.document
        .getElementById("movie_player")
        .getVideoData().title,
      VideoAuthor: unsafeWindow.document
        .getElementById("movie_player")
        .getVideoData().author,
      Watches: [
        {
          WatchedLength: -99,
          Date: new Date().toString(),
        },
      ],
      VideoLength: Math.floor(
        unsafeWindow.document.getElementById("movie_player").getDuration(),
      ),
    });

    if (TabNoc.Settings.Debug === true) {
      console.log(
        "WatchingVideo()->new: " + TabNoc.Variables.VideoStatisticsObject,
      );
    }

    if (TabNoc.Settings.ShowAlreadyWatchedDialog === true) {
      if (
        GetVideoWatched(
          null,
          null,
          JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoID,
        ) === true
      ) {
        setTimeout(function () {
          alert("watched");
          Feedback.showMessage("Watched!", "error", 60000);
        }, 10);
        console.log("Video already watched!");
      }
    }
    TabNoc.Variables.VideoStatisticsObject = JSON.stringify(
      PushVideoObject(
        null,
        JSON.parse(TabNoc.Variables.VideoStatisticsObject),
        true,
      ),
    );

    Feedback.notify(
      "Aktuelles Video: " +
      JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoTitle,
      2000,
    );
    console.info(
      "Aktuelles Video: " +
      JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoTitle +
      " ID: " +
      JSON.parse(TabNoc.Variables.VideoStatisticsObject).VideoID,
    );
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
      if (
        unsafeWindow.document.getElementsByTagName("ytd-searchbox") != null
      ) {
        $(
          unsafeWindow.document.getElementsByTagName("ytd-searchbox")[0],
        ).append(
          '<div id="TabNoc_YT_Jump" style="font-size: 14px;font-family: Roboto,Arial,sans-serif;height: 32px;margin-left: 10px;text-align: center;flex: 1;display:-webkit-box;-webkit-box-pack:center;-webkit-box-align:center;"></div>',
        );
        // remainingTimeManager(movie_player);
      }
    } else {
      remainingTimeManager(movie_player);
    }
    // ############################### TabNoc.Variables.WatchedLengthInterval ###############################
    if (movie_player.getPlayerState() == 1 /*Playing*/) {
      if (TabNoc.Variables.LastIntervalTime != null) {
        TabNoc.Variables.WatchedLength =
          TabNoc.Variables.WatchedLength +
          (new Date().getTime() - TabNoc.Variables.LastIntervalTime) / 1000;
      }
      TabNoc.Variables.HasSavedDataOnEnd = false;
      TabNoc.Variables.LastIntervalTime = new Date().getTime();
    } else {
      TabNoc.Variables.LastIntervalTime = null;

      checkVideoWallElements();
    }
    if (
      movie_player.getPlayerState() == 0 &&
      TabNoc.Variables.HasSavedDataOnEnd === false
    ) {
      SaveVideoStatistics();

      TabNoc.Variables.HasSavedDataOnEnd = true;
    }
    if (
      TabNoc.Variables.LastSaveWatchedLength + 14 <
      TabNoc.Variables.WatchedLength
    ) {
      SaveVideoStatistics();
      TabNoc.Variables.LastSaveWatchedLength = TabNoc.Variables.WatchedLength;
    }
    // ############################### TabNoc.Variables.WatchedLengthInterval ###############################

    //TODO: have I deleted something???
    // check Fullscreen state Change
    if (
      (document.mozFullScreenElement == null &&
        TabNoc.Variables.LastFullScreenElement != null) ||
      (document.mozFullScreenElement != null &&
        document.mozFullScreenElement.getAttribute("id") !=
        TabNoc.Variables.LastFullScreenElement)
    ) {
      TabNoc.Variables.LastFullScreenElement =
        document.mozFullScreenElement &&
        document.mozFullScreenElement.getAttribute("id");
      checkVideoWallElements();
    }

    // ############################### TabNoc.Variables.VideoChangeCheckInterval ###############################
    if (
      movie_player.getVideoData().video_id != TabNoc.Variables.CurrentVideoID
    ) {
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
  let scannedVideoArray = GetData(
    "ScannedVideoArray",
    "[]",
    true,
  ).reverse();
  // ### WatchedVideoArray ###
  let watchedVideoArray = GetData(
    "WatchedVideoArray",
    "[]",
    true,
  ).reverse();
  // ### VideoObjectDictionary ###
  let videoObjectDictionary = GetData("VideoObjectDictionary", "{}", true);

  let elements = $(".ytp-videowall-still");

  for (let i = 0; i < elements.length; i++) {
    let currentElement = elements[i];

    let VideoID = currentElement.getAttribute("href");
    if (VideoID.contains("watch?list=")) {
      continue;
    }
    let infoElement = $(currentElement);

    infoElement.attr(
      "title",
      infoElement.attr("aria-label").replace("Minuten,", "Minuten"),
    );

    VideoID = VideoID.replace("https://www.youtube.com", "")
      .replace("/watch?v=", "")
      .split("&list")[0]
      .split("&t=")[0];

    if (GetVideoWatched(scannedVideoArray, false, VideoID)) {
      if (
        currentElement.children[0].style.backgroundImage.contains(
          "linear-gradient",
        ) == false
      ) {
        currentElement.children[0].style.backgroundImage =
          "linear-gradient(rgba(151, 255, 139, 0.45), rgba(151, 255, 139, 0.45)), " +
          currentElement.children[0].style.backgroundImage;
      }
      if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
        currentElement.style.display = "none";
      }
      continue;
    } else if (
      GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID)
    ) {
      if (
        currentElement.children[0].style.backgroundImage.contains(
          "linear-gradient",
        ) == false
      ) {
        currentElement.children[0].style.backgroundImage =
          "linear-gradient(rgba(166, 235, 158, 0.45), rgba(166, 235, 158, 0.45)), " +
          currentElement.children[0].style.backgroundImage;
      }
      if (TabNoc.Settings.HideAlreadyWatchedVideos === true) {
        currentElement.style.display = "none";
      }
      continue;
    }

    for (let j = 0; j < TabNoc.Settings.UninterestingVideos.length; j++) {
      if (
        infoElement[0].textContent.includes(
          TabNoc.Settings.UninterestingVideos[j],
        )
      ) {
        if (
          currentElement.children[0].style.backgroundImage.contains(
            "linear-gradient",
          ) == false
        ) {
          currentElement.children[0].style.backgroundImage =
            "linear-gradient(rgba(255, 175, 175, 0.45), rgba(255, 175, 175, 0.45)), " +
            currentElement.children[0].style.backgroundImage;
        }
      }
      break;
    }
    for (let j = 0; j < TabNoc.Settings.NotWantedVideos.length; j++) {
      if (
        infoElement[0].textContent.includes(
          TabNoc.Settings.NotWantedVideos[j],
        )
      ) {
        //disableVideo
        if (TabNoc.Settings.DeleteNotWantedVideos === true) {
          $(currentElement).remove();
        } else {
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
    console.log(
      "SaveVideoStatistics()->" + TabNoc.Variables.VideoStatisticsObject,
    );
  }
  if (TabNoc.Variables.VideoStatisticsObject == null) {
    alert(
      new Error(
        "Eigentlich würde ich hier gerne eine Fehlermeldung schreiben, wann tritt der Zustand denn immer auf?",
      ),
    );
    return false;
  }
  try {
    let VideoStatisticsObject = JSON.parse(
      TabNoc.Variables.VideoStatisticsObject,
    );
    VideoStatisticsObject.Watches[
      VideoStatisticsObject.Watches.length - 1
    ].WatchedLength = Math.round(TabNoc.Variables.WatchedLength);

    TabNoc.Variables.VideoStatisticsObject = JSON.stringify(
      PushVideoObject(
        null,
        JSON.parse(JSON.stringify(VideoStatisticsObject)),
        true,
      ),
    );

    if (TabNoc.Settings.Debug === true) {
      console.groupEnd();
    }
  } catch (exc) {
    console.error(exc);
    alert(exc);
  }
}
// ### https://www.youtube.com/watch?v=* ###

function GetVideoWatched(watchedVideoArray, videoObjectDictionary, VideoID) {
  // If videoObjectDictionary is false ignore Elements from Dictionary (only check Elements from WatchedVideoArray)
  if (videoObjectDictionary !== false) {
    if (videoObjectDictionary === null) {
      videoObjectDictionary = GetData("VideoObjectDictionary", "{}", true);
    }
    if (videoObjectDictionary[VideoID] !== undefined) {
      return true;
    }
  }

  // If watchedVideoArray is false ignore Elements from Array (only check Elements from VideoObjectDictionary)
  if (watchedVideoArray !== false) {
    if (watchedVideoArray === null || watchedVideoArray === undefined) {
      watchedVideoArray = GetData("WatchedVideoArray", "[]", true);
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
  if (typeof videoObject !== "object") {
    throw "WrongTypeException:Only Objects can be Pushed into the Database.";
  }
  if (videoObjectDictionary === null) {
    GM_Lock();
    videoObjectDictionary = GetData("VideoObjectDictionary", "{}", true);
    save = true;
    if (TabNoc.Settings.Debug === true) {
      console.log("Loading videoObjectDictionary ...");
    }
  }

  apiAdapter.getService().getVideo(videoObject.VideoID).then((response) => {
    if (response.status === 404 || response.body == null) {
      apiAdapter.getService().createOrUpdateVideo(videoObject).catch((exc) => {
        console.error(exc);
        alert(exc);
      }).then((response) => {
        if (response.ok === false) {
          console.error(response.body, videoObject);
          alert(response.body);
        }
      });
    } else {
      apiAdapter.getService().createOrUpdateVideo(MergeVideoObjects(
        response.body,
        videoObject,
      )).catch((exc) => {
        console.error(exc);
        alert(exc);
      }).then((response) => {
        if (response.ok === false) {
          console.error(response.body, videoObject);
          alert(response.body);
        }
      });
    }
  });

  if (videoObjectDictionary[videoObject.VideoID] === undefined) {
    videoObjectDictionary[videoObject.VideoID] = videoObject;
    if (TabNoc.Settings.Debug === true) {
      // console.log("... Pushed");
    }
  } else {
    videoObjectDictionary[videoObject.VideoID] = MergeVideoObjects(
      videoObjectDictionary[videoObject.VideoID],
      videoObject,
    );
    if (TabNoc.Settings.Debug === true) {
      console.log(
        JSON.parse(
          JSON.stringify(videoObjectDictionary[videoObject.VideoID]),
        ),
        "... Merged PushRequest",
      );
    }
  }

  if (videoObjectDictionary[videoObject.VideoID] == null) {
    console.log(
      "deleted ID: >" +
      videoObject.VideoID +
      "<. The Value was " +
      videoObjectDictionary[videoObject.VideoID],
    );
    delete videoObjectDictionary[videoObject.VideoID];
  }

  if (videoObject.VideoID == null) {
    console.log(
      "deleted ID: >" +
      videoObject.VideoID +
      "<. The Value was " +
      videoObjectDictionary[videoObject.VideoID],
    );
    delete videoObjectDictionary[videoObject.VideoID];
  }

  if (save === true) {
    SetData(
      "VideoObjectDictionary",
      JSON.stringify(videoObjectDictionary),
      true,
      false,
    );
    GM_Unlock();
    if (TabNoc.Settings.Debug === true) {
      console.log("Saveing videoObjectDictionary ...");
    }
  }

  return videoObjectDictionary[videoObject.VideoID];
}

function GetElementCount(videoObjectDictionary) {
  if (videoObjectDictionary === null) {
    videoObjectDictionary = GetData("VideoObjectDictionary", "{}", true);
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

  let namesArray = [];
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
    if (
      videoObject_1[objectIndex] === undefined ||
      videoObject_2[objectIndex] === undefined
    ) {
      console.error(
        objectIndex,
        videoObject_1,
        videoObject_2,
        videoObject_1[objectIndex],
        videoObject_2[objectIndex],
      );
      if (
        confirm(
          "Beim zusammenführen zwei unterschiedlicher Versionen wurden undefinierte Einträge gefunden. Sollen diese gelöscht werden?",
        ) == true
      ) {
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
            console.error(
              "Es wurde keine Behandlung für das Fehlen dieser Information (" +
              objectIndex +
              ") definiert",
            );
            console.log(videoObject_1);
            console.log(videoObject_2);
            alert(
              "Es wurde keine Behandlung für das Fehlen dieser Information (" +
              objectIndex +
              ") definiert!\r\nSiehe Konsole für mehr Informationen.",
            );
            throw new Error("NotDefinedException");
        }
        if (canContinue == false) {
          break;
        }
      } else {
        throw new Error(
          "videoObject_1[objectIndex] or videoObject_2[objectIndex] is undefined",
        );
      }
    }
    if (
      JSON.stringify(videoObject_1[objectIndex]) !==
      JSON.stringify(videoObject_2[objectIndex]) ||
      (forceMerge == true && objectIndex == "Watches")
    ) {
      switch (objectIndex) {
        case "Watches":
          let newArray = [];
          for (let index1_i in videoObject_1.Watches) {
            if (videoObject_1.Watches == null) {
              continue;
            }
            if (videoObject_1.Watches[index1_i] == null) {
              continue;
            }

            let found = false;
            for (let index2_i in videoObject_2.Watches) {
              if (
                videoObject_1.Watches[index1_i].Date == "unknown" &&
                videoObject_1.Watches[index1_i].WatchedLength == -99
              ) {
                found = true;
                break;
              }

              // beide identisch
              if (
                JSON.stringify(videoObject_1.Watches[index1_i]) ===
                JSON.stringify(videoObject_2.Watches[index2_i])
              ) {
                newArray.push(
                  JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])),
                );
                delete videoObject_2.Watches[index2_i];
                found = true;
                continue;
              }

              // check if the Dates are valid
              if (
                isNaN(
                  new Date(videoObject_1.Watches[index1_i].Date).getTime(),
                ) === true
              ) {
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
              if (
                isNaN(
                  new Date(videoObject_2.Watches[index2_i].Date).getTime(),
                ) === true
              ) {
                if (videoObject_2.Watches[index2_i].Date != "unknown") {
                  console.info("Wrong index2_i: " + index2_i);
                  console.error(videoObject_2.Watches);
                  alert(videoObject_2.Watches[index2_i].Date);
                  throw new Error("The converted Date is not a Date Object");
                }
              }

              if (
                new Date(videoObject_1.Watches[index1_i].Date).getTime() ===
                new Date(videoObject_2.Watches[index2_i].Date).getTime() ||
                (isNaN(
                  new Date(videoObject_1.Watches[index1_i].Date).getTime(),
                ) === true &&
                  isNaN(
                    new Date(videoObject_2.Watches[index2_i].Date).getTime(),
                  ))
              ) {
                // Same Date and Time from Website Call or both are NaN, thats the same, choose the highest WatchedLength
                videoObject_1.Watches[index1_i].WatchedLength = Math.max(
                  videoObject_1.Watches[index1_i].WatchedLength,
                  videoObject_2.Watches[index2_i].WatchedLength,
                );
                newArray.push(
                  JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])),
                );
                delete videoObject_2.Watches[index2_i];
                found = true;
              }
            }

            if (found === false) {
              // Der Eintrag ist nur im ersten Element vorhanden -> hinzufügen
              newArray.push(
                JSON.parse(JSON.stringify(videoObject_1.Watches[index1_i])),
              );
            }
          }
          if (videoObject_2.Watches.length !== 0) {
            // ich füge diese Elemente jetzt erstmal dazu, weiß nicht so genau ob ich noch einen Fehler haben könnte
            for (var j in videoObject_2.Watches) {
              if (videoObject_2.Watches[j] != null) {
                newArray.push(
                  JSON.parse(JSON.stringify(videoObject_2.Watches[j])),
                );
              }
            }
          }

          let changed = false;
          let count = 0;
          do {
            changed = false;
            count++;
            // Ab hier ist das Array fertig gemerged, jetzt wird aufgeräumt
            for (let index1 in newArray) {
              for (let index2 in newArray) {
                if (index1 == index2) {
                  continue;
                }

                // Wenn die beiden Zeitstempel weniger als 120 sekunden auseinander liegen
                if (
                  Math.abs(
                    Math.floor(
                      new Date(newArray[index1].Date).getTime() -
                      new Date(newArray[index2].Date).getTime(),
                    ) / 1000,
                  ) < 120
                ) {
                  // Dann nutze den früheren Zeitstempel

                  newArray[index1].Date = new Date(
                    Math.min(
                      new Date(newArray[index1].Date).getTime(),
                      new Date(newArray[index2].Date).getTime(),
                    ),
                  ).toString();
                  newArray[index1].WatchedLength = Math.max(
                    newArray[index1].WatchedLength,
                    newArray[index2].WatchedLength,
                  );

                  if (
                    isNaN(new Date(newArray[index1].Date).getTime()) === true
                  ) {
                    alert(newArray[index1]);
                    throw new Error(
                      "The converted Date is not a Date Object",
                    );
                  }

                  newArray.splice(index2, 1);

                  changed = true;
                  break;
                }
                // Wenn die beiden Zeitstempel NaN sind und WatchedLength gleich ist -> eines entfernen
                if (
                  isNaN(new Date(newArray[index1].Date).getTime()) === true &&
                  isNaN(new Date(newArray[index2].Date).getTime()) === true
                ) {
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
            if (count > 100) {
              alert("Error in MergeWatches, did not finish after 100 tries");
              throw new Error(
                "Error in MergeWatches, did not finish after 100 tries",
              );
            }
          } while (changed === true);

          // gleichstellen, damit vergleich funktioniert
          videoObject_1.Watches = JSON.parse(JSON.stringify(newArray));
          videoObject_2.Watches = JSON.parse(JSON.stringify(newArray));
          break;

        case "VideoLength":
          var VideoLength = Math.max(
            videoObject_1.VideoLength,
            videoObject_2.VideoLength,
          );
          videoObject_1.VideoLength = JSON.parse(VideoLength);
          videoObject_2.VideoLength = JSON.parse(VideoLength);
          break;

        case "VideoTitle":
          if (videoObject_1.VideoTitle === "") {
            videoObject_2.VideoTitle = videoObject_1.VideoTitle;
          } else if (videoObject_2.VideoTitle === "") {
            videoObject_1.VideoTitle = videoObject_2.VideoTitle;
          } else {
            if (
              confirm(
                String.format(
                  'Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video "{0}" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nVideoTitel: {1}\r\n\r\n\tEintrag 2 :\r\nVideoTitel: {2}\r\n(Der erste Eintrag ist meist der ältere)\r\n\r\nSoll der 1. Eintrag verwendet werden?',
                  videoObject_1.VideoID,
                  videoObject_1.VideoTitle,
                  videoObject_2.VideoTitle,
                ),
              ) === true
            ) {
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
            if (
              confirm(
                String.format(
                  'Beim Zusammenführen von 2 unterschiedlichen Informationen über das Video "{0}" wurden unterschiede festgestellt die nicht Automatisch behoben werden konnten.\r\n\r\n\tEintrag 1:\r\nYoutube-Kanal: {1}\r\n\r\n\tEintrag 2 :\r\nYoutube-Kanal: {2}\r\n(Der erste Eintrag ist meist der ältere)\r\n\r\nSoll der 1. Eintrag verwendet werden?',
                  videoObject_1.VideoID,
                  videoObject_1.VideoAuthor,
                  videoObject_2.VideoAuthor,
                ),
              ) === true
            ) {
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
          console.error(
            "Für diesen Unterschied wurde kein automatisches Zusammenführen definiert![" +
            objectIndex +
            "]",
          );
          console.log(videoObject_1);
          console.log(videoObject_2);
          alert(
            "Für diesen Unterschied wurde kein automatisches Zusammenführen definiert!\r\nSiehe Konsole für mehr Informationen.",
          );
          throw new Error("NotDefinedException");
      }
    }
  }

  if (JSON.stringify(videoObject_1) != JSON.stringify(videoObject_2)) {
    console.error(
      "JSON.stringify(videoObject_1) != JSON.stringify(videoObject_2)",
      videoObject_1,
      videoObject_2,
    );
  }
  if (videoObject_1 == null) {
    return null;
  }
  return JSON.parse(JSON.stringify(videoObject_1));
}

function Main() {
  console.log('$("#app-drawer"): ', $("#app-drawer"));
  if (
    !(
      $("#app-drawer").length == 1 &&
      $("#app-drawer")[0].nodeName == "DOM-MODULE"
    )
  ) {
    // alert("Der Support für das alte YoutubeLayout wurde mit Version 2.3.1 (02.09.2017) entfernt, wenn dies erforderlich ist bitte zur alten Version zurückkehren");
  }

  // SubscriptionPage
  if (
    $("ytd-grid-renderer").length >= 1 ||
    $("ytd-video-renderer").length >= 1 ||
    $("ytd-grid-video-renderer").length >= 1 ||
    true
  ) {
    $(SubscriptionPageLoader);
  } else {
    alert("MarkOpenedVideos.user.js:Main() -> No LoadObject found!");
    console.info("No LoadObject found!");
  }
}

execTime("Main", Main);

console.info(
  String.format(
    "MarkOpenedVideos.user.js[Version: {0}, Autoupdate: {1}] readed",
    GM_info.script.version,
    GM_info.scriptWillUpdate,
  ),
);