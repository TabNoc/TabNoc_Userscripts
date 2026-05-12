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

import jQuery from "jquery";

// Ensure jQuery is available on the page/global scope (for other libs and inline code)
if (typeof unsafeWindow !== 'undefined') {
  unsafeWindow.jQuery = unsafeWindow.$ = jQuery;
} else if (typeof window !== 'undefined') {
  window.jQuery = window.$ = jQuery;
}
import { diff, unpatch } from "jsondiffpatch"
import "./String"

/**
 * Compares two software version numbers (e.g. "1.7.1" or "1.2b").
 *
 * This function was born in http://stackoverflow.com/a/6832721.
 *
 * @param {string} v1 The first version to be compared.
 * @param {string} v2 The second version to be compared.
 * @param {object} [options] Optional flags that affect comparison behavior:
 * <ul>
 *     <li>
 *         <tt>lexicographical: true</tt> compares each part of the version strings lexicographically instead of
 *         naturally; this allows suffixes such as "b" or "dev" but will cause "1.10" to be considered smaller than
 *         "1.2".
 *     </li>
 *     <li>
 *         <tt>zeroExtend: true</tt> changes the result if one version string has less parts than the other. In
 *         this case the shorter string will be padded with "zero" parts instead of being considered smaller.
 *     </li>
 * </ul>
 * @returns {number|NaN}
 * <ul>
 *    <li>0 if the versions are equal</li>
 *    <li>a negative integer iff v1 < v2</li>
 *    <li>a positive integer iff v1 > v2</li>
 *    <li>NaN if either version string is in the wrong format</li>
 * </ul>
 *
 * @copyright by Jon Papaioannou (["john", "papaioannou"].join(".") + "@gmail.com")
 * @license This function is in the public domain. Do what you want with it, no strings attached.
 */

function versionCompare(v1, v2, options) {
  var lexicographical = options && options.lexicographical,
    zeroExtend = options && options.zeroExtend,
    v1parts = v1.split('.'),
    v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push("0");
    while (v2parts.length < v1parts.length) v2parts.push("0");
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length == i) {
      return 1;
    }

    if (v1parts[i] == v2parts[i]) {
      continue;
    }
    else if (v1parts[i] > v2parts[i]) {
      return 1;
    }
    else {
      return -1;
    }
  }

  if (v1parts.length != v2parts.length) {
    return -1;
  }

  return 0;
}

function getTabNoc_GMVersion() {
  return { Version: "2.0.2", Date: "21.05.2017" };
}

if (unsafeWindow.TabNoc_GM == undefined) {
  var TabNoc_GM = {};

  unsafeWindow.TabNoc_GM = cloneInto(TabNoc_GM, unsafeWindow, {
    wrapReflectors: true
  });
  exportFunction(returnExec(function (arg1, arg2, arg3) { return GM_getValue(arg1, arg2, arg3); }), unsafeWindow.TabNoc_GM, {
    defineAs: "getValue"
  });
  exportFunction(returnExec(function (arg1, arg2, arg3) { return GM_setValue(arg1, arg2, arg3); }), unsafeWindow.TabNoc_GM, {
    defineAs: "setValue"
  });
  exportFunction(returnExec(function (arg1, arg2, arg3) { return GM_deleteValue(arg1, arg2, arg3); }), unsafeWindow.TabNoc_GM, {
    defineAs: "deleteValue"
  });
  exportFunction(returnExec(function (arg1, arg2, arg3) { return GM_listValues(arg1, arg2, arg3); }), unsafeWindow.TabNoc_GM, {
    defineAs: "listValues"
  });

  exportFunction(exec, unsafeWindow.TabNoc_GM, {
    defineAs: "exec"
  });
  exportFunction(execTime, unsafeWindow.TabNoc_GM, {
    defineAs: "execTime"
  });
  exportFunction(returnExec, unsafeWindow.TabNoc_GM, {
    defineAs: "returnExec"
  });
}

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

function returnExec(func, arg1, arg2, arg3, arg4, arg5) {
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


var LockID = Math.floor(Math.random() * 1000000);

function GM_Lock(ignoreLockedValue = false) {
  if (GM_getValue("Lock") == undefined) {
    GM_setValue("Lock", 0);
  }
  // prüfen ob alles io ist
  if (GM_getValue("Lock") === LockID) {
    // console.log(ignoreLockedValue);
    if (ignoreLockedValue === false) {
      console.log("Database already locked from this Session, continue");
      console.log(new Error().stack);
    }
    return;
  }
  else {
    // wait until Database is unlocked
    while (GM_getValue("Lock") !== 0) { }
    // set unique LockID
    // console.info("Locking Database");
    GM_setValue("Lock", LockID);
  }
}

function GM_Locked() {
  // when checking for boolean Value must compare with 2 '='
  // when checking for LockReason must compare with 3 '='
  if (GM_getValue("Lock") == undefined) {
    GM_setValue("Lock", 0);
  }
  // prüfen ob alles io ist
  if (GM_getValue("Lock") === 0) {
    // Database Unlocked
    return false;
  }
  else if (GM_getValue("Lock") === LockID) {
    // Database Locked from this Instance
    return 1;
  }
  else {
    // Database Locked from other Instance
    return true;
  }
}

function GM_setValueLocked(name, value) {
  // console.info("GM_setValueLocked");
  GM_Lock(true);

  // prüfen ob alles io ist
  if (GM_getValue("Lock") === LockID) {
    GM_setValue(name, value);
  }
  else {
    alert("Desync des Lock wertes, in GM_setValueLocked");
    GM_setValue("Lock", 0);
    throw "Desync des Lock wertes, in GM_setValueLocked";
  }
}

function GM_Unlock(forceUnlock = false) {
  // aufräumen
  if (GM_getValue("Lock") === LockID || GM_getValue("Lock") === 0 || GM_getValue("Lock") == undefined || forceUnlock === true) {
    // console.info("Unlocking Database");
    GM_setValue("Lock", 0);
  }
  else {
    alert("Desync des Lock wertes, in GM_Unlock");
    GM_setValue("Lock", 0);
    throw "Desync des Lock wertes, in GM_Unlock";
  }
}

console.log("TabNoc.js: Readed TabNoc_GM " + getTabNoc_GMVersion().Version + " by TabNoc (namespace: " + GM_info.script.name + ")");
function getTabNocVersion() {
  return { Version: "1.2.4", Date: "11.01.2018" };
}
if (String.prototype.contains === undefined) { String.prototype.contains = String.prototype.includes; }
if (String.prototype.replaceAll === undefined) { String.prototype.replaceAll = function (search, replacement) { var target = this; return target.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), replacement); }; }
if (Date.prototype.timeNow === undefined) { Date.prototype.timeNow = function () { return ((this.getHours() < 10) ? "0" : "") + this.getHours() + ":" + ((this.getMinutes() < 10) ? "0" : "") + this.getMinutes() + ":" + ((this.getSeconds() < 10) ? "0" : "") + this.getSeconds(); }; }

function getTabNoc() {
  var ScriptName = GM_info.script.name;

  if (unsafeWindow.TabNoc_ == null) {
    unsafeWindow.TabNoc_ = cloneInto({}, unsafeWindow, {
      wrapReflectors: true
    });
  }
  if (unsafeWindow.TabNoc_[ScriptName] == null) {
    unsafeWindow.TabNoc_[ScriptName] = cloneInto({}, unsafeWindow.TabNoc_, {
      wrapReflectors: true
    });
  }
  return unsafeWindow.TabNoc_[ScriptName];
}
var TabNoc = null;

function setTabNoc(obj) {
  var ScriptName = GM_info.script.name;
  console.log("TabNoc.js.setTabNoc(): Adding " + ScriptName + " to TabNoc.js");

  if (unsafeWindow.TabNoc_ == null) {
    // console.log("Adding " + ScriptName + ": unsafeWindow.TabNoc_ is null");
    unsafeWindow.TabNoc_ = cloneInto({}, unsafeWindow, {
      wrapReflectors: true
    });
  }
  if (unsafeWindow.TabNoc_[ScriptName] == null) {
    // console.log("Adding " + ScriptName + ": unsafeWindow.TabNoc_[ScriptName] is null");
    unsafeWindow.TabNoc_[ScriptName] = cloneInto({}, unsafeWindow.TabNoc_, {
      wrapReflectors: true
    });
  }

  unsafeWindow.TabNoc_[ScriptName] = cloneInto(obj, unsafeWindow.TabNoc_, {
    wrapReflectors: true, cloneFunctions: true
  });
  TabNoc = unsafeWindow.TabNoc_[GM_info.script.name];
}
var Feedback = null;
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

console.log("TabNoc.js: Readed TabNoc_Config " + getTabNocVersion().Version + " by TabNoc (namespace: " + GM_info.script.name + ")");
function getImportAllVersion() {
  return { Version: "1.1.3", Date: "23.04.2021" };
}

/*
ImportData(responseData, ([{
    Name: "Array",
    defaultVersion: 0,
    defaultValue: "([])",
    ImportAction: function (dataStorage, currentEntry, importElement, elementId) {
      if (dataStorage[currentEntry.Name].indexOf(importElement) == -1) {
        dataStorage[currentEntry.Name].push(importElement);
      }
    }
  }, {
    Name: "Object",
    defaultVersion: 0,
    defaultValue: "({})",
    ImportAction: function (dataStorage, currentEntry, importElement, elementId) {
      dataStorage[currentEntry.Name][elementId] = importElement;
    }
  }
]));
*/

function ImportData(allData, entriesArray) {
  let element = null;
  if (typeof (GetData) != "function") {
    throw new Error("GetData is not Implemented but required for ImportData!");
  }
  if (typeof (SetData) != "function") {
    throw new Error("SetData is not Implemented but required for ImportData!");
  }
  if (typeof (GM_Lock) != "function") {
    throw new Error("GM_Lock is not Implemented but required for ImportData!");
  }
  if (typeof (GM_Unlock) != "function") {
    throw new Error("GM_Unlock is not Implemented but required for ImportData!");
  }
  if (typeof (UpdateDataBase) != "function") {
    throw new Error("UpdateDataBase is not Implemented but required for ImportData!");
  }

  try {
    if (typeof (allData) == "object" && allData !== null) {
      element = allData;
    } else if (allData === true) {
      element = JSON.parse(prompt("Bitte die exportierten Daten eintragen"));
    } else {
      element = ({});
      for (let entryID in entriesArray) {
        let entry = entriesArray[entryID];
        element[entry.Name] = JSON.parse(prompt("Please insert new " + entry.Name + " Data"));
      }
    }

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      element[entry.Name + "-Version"] = element[entry.Name + "-Version"] || entry.defaultVersion;
    }

    UpdateDataBase(({
      lock: (function () { }),
      unlock: (function () { }),
      getValue: (function (key) {
        return element[key];
      }),
      setValue: (function (key, value) {
        element[key] = value;
      })
    }), true);

    let errorList = ([]);

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      if (element[entry.Name + "-Version"] !== GetData(entry.Name + "-Version")) {
        errorList.push("Die Version der Datenbanktabelle " + entry.Name + " passt nicht (importierte Version: " + element[entry.Name + "-Version"] + ", lokale Version: " + GetData(entry.Name + "-Version") + ")");
      }
    }

    if (errorList.length !== 0) {
      msg = "Das Importieren kann nicht durchgeführt werden, da:\r\n";
      for (let i in errorList) {
        msg = msg + "\r\n\t- " + errorList[i];
      }
      alert(msg);
      throw new Error("ImportData impossible!");
    }

    if (confirm("Sollen die Daten mit den Aktuellen Daten zusammengeführt werden?") !== true) {
      throw new Error("Das Importieren der Daten wurde durch den Benutzer abgebrochen");
    }

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      element[entry.Name] = JSON.parse(element[entry.Name]);
    }

    GM_Lock();
    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      if (element[entry.Name] == undefined) {
        element[entry.Name] = JSON.parse(entry.defaultValue);
      }
      if (typeof (element[entry.Name]) != "object") {
        throw new Error("element." + entry.Name + "(Value: " + element[entry.Name] + ") is not an Object, Import impossible!");
      }
    }

    element.currentData = ({});
    element.count = ({});

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
      element.currentData[entry.Name + "Count"] = 0;
    }

    let newDataStorage = ({});

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      element.currentData[entry.Name] = GetData(entry.Name, entry.defaultValue, true);
      element.count[entry.Name] = 0;
      newDataStorage[entry.Name] = JSON.parse(entry.defaultValue);
    }

    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      if (TabNoc.Settings.Debug) {
        console.info("Importing stored " + entry.Name);
      }
      for (let i in element.currentData[entry.Name]) {
        entry.ImportAction(newDataStorage, entry, element.currentData[entry.Name][i], i);
        element.count[entry.Name]++;
      }
      if (TabNoc.Settings.Debug) {
        console.info("Importing new " + entry.Name);
        console.info(element[entry.Name]);
      }
      for (let i in element[entry.Name]) {
        entry.ImportAction(newDataStorage, entry, element[entry.Name][i], i);
        element.count[entry.Name]++;
      }
    }

    let changes = false;
    let msg = "Das Importieren wurde erfolgreich abgeschlossen!\r\n";
    for (let entryID in entriesArray) {
      let entry = entriesArray[entryID];
      msg += entry.Name + ":\r\n";
      msg += "\tEs wurden " + element.count[entry.Name] + " Elemente aktualisiert (";
      msg += "gespeicherte Datenmenge: " + JSON.stringify(element.currentData[entry.Name]).length + "B (" + Object.keys(element.currentData[entry.Name]).length + ") | ";
      msg += "importierte Datenmenge: " + JSON.stringify(element[entry.Name]).length + "B (" + Object.keys(element[entry.Name]).length + ") | ";
      msg += "neue Datenmenge: " + JSON.stringify(newDataStorage[entry.Name]).length + "B) (" + Object.keys(newDataStorage[entry.Name]).length + ")\r\n";
      msg += "Delta:\r\n";
      if (JSON.stringify(newDataStorage[entry.Name]) != JSON.stringify(element.currentData[entry.Name])) {
        changes = true;
      }
    }

    alert(msg);

    if (changes == false) {
      alert("Es wurde keine Änderung der Daten durch das Importieren durchgeführt\r\n\t\tSpeichern nicht erforderlich");
    } else {
      if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
        for (let entryID in entriesArray) {
          let entry = entriesArray[entryID];
          SetData(entry.Name, JSON.stringify(newDataStorage[entry.Name]));
        }
      }
    }
  } catch (exc) {
    console.error(exc);
    alert("Das Importieren ist fehlgeschlagen!\r\n" + exc);
    throw (exc);
  }
  finally {
    GM_Unlock();
  }
}


/*
let TableUpdateObject = {
  "ReadedNewsArray": {
    "CheckInit": function (functions, silent) {
      // code
      // return true || false;
    },
    "InitTable": function (functions, silent) {
      //code
    },
    1: function (functions, silent) {
      let returnStats = {
        ChangeCount: 0,
        OldSize: 0,
        NewSize: 0
      };
      // code
      return {
        Result: true,
        Stats: returnStats,
        Save: function () {}
      };
    }
  }
};
*/

function UpdateDatabaseTable(ExpectedVersionNumber, CurrentVersionNumber, TableName, TableUpdateObject, functions, silent) {
  if (ExpectedVersionNumber == null) {
    throw ("ArgumentNullException (ExpectedVersionNumber):\r\nDer Parameter ExpectedVersionNumber ist null");
  }
  if (typeof (ExpectedVersionNumber) != "number") {
    throw ("ArgumentException (ExpectedVersionNumber):\r\nDer Parameter ExpectedVersionNumber hat das falsche Format, erwartet: number");
  }

  if (CurrentVersionNumber == null) {
    throw ("ArgumentNullException (CurrentVersionNumber):\r\nDer Parameter CurrentVersionNumber ist null");
  }
  if (typeof (CurrentVersionNumber) != "number") {
    throw ("ArgumentException (CurrentVersionNumber):\r\nDer Parameter CurrentVersionNumber hat das falsche Format, erwartet: number");
  }

  if (TableName == null) {
    throw ("ArgumentNullException (TableName):\r\nDer Parameter TableName ist null");
  }
  if (typeof (TableName) != "string") {
    throw ("ArgumentException (TableName):\r\nDer Parameter TableName hat das falsche Format, erwartet: string");
  }

  if (TableUpdateObject == null) {
    throw ("ArgumentNullException (TableUpdateObject):\r\nDer Parameter TableUpdateObject ist null");
  }
  if (typeof (TableUpdateObject) != "object") {
    throw ("ArgumentException (TableUpdateObject):\r\nDer Parameter TableUpdateObject hat das falsche Format, erwartet: object");
  }

  if (functions == null) {
    throw ("ArgumentNullException (functions):\r\nDer Parameter functions ist null");
  }
  if (typeof (functions) != "object") {
    throw ("ArgumentException (functions):\r\nDer Parameter functions hat das falsche Format, erwartet: object");
  }

  if (silent == null) {
    throw ("ArgumentNullException (silent):\r\nDer Parameter silent ist null");
  }
  if (typeof (silent) != "boolean") {
    throw ("ArgumentException (silent):\r\nDer Parameter silent hat das falsche Format, erwartet: boolean");
  }

  if (CurrentVersionNumber != ExpectedVersionNumber) {
    functions.lock();
    while (CurrentVersionNumber != ExpectedVersionNumber) {
      let updateMsg = "Es wurde ein Versionsunterschied der Datenbank-Tabelle " + TableName + " gefunden (aktuell: " + CurrentVersionNumber + " | erwartet: " + ExpectedVersionNumber + ")";
      console.info(updateMsg);
      if (TableUpdateObject[TableName].CheckInit(functions, silent) === false) {
        alert(updateMsg + "\r\nOK drücken um den Updatevorgang zu starten.");
        if (TableUpdateObject[TableName][CurrentVersionNumber] == null) {
          throw ("NoUpdateImplemeneted:\r\nFür die Version " + CurrentVersionNumber + " der Tabelle " + TableName + " wurde kein Update definiert!");
        }
        let UpdateResult = TableUpdateObject[TableName][CurrentVersionNumber]();

        if (UpdateResult.Result === true) {
          alert("Der Updatevorgang von Tabelle " + TableName + " war erfolgreich\r\n\r\nEs wurden " + UpdateResult.Stats.ChangeCount + " Elemente aktualisiert (alte Datenmenge: " + UpdateResult.Stats.OldSize + "B | neue Datenmenge: " + UpdateResult.Stats.NewSize + "B)");
          if (confirm("Sollen die Änderungen gespeichert werden?") === true) {
            UpdateResult.Save(functions, silent);
            functions.setValue(TableName + "-Version", UpdateResult.NewVersionNumber);
            CurrentVersionNumber = UpdateResult.NewVersionNumber;
            console.log("Die Version der Tabelle " + TableName + " wurde auf " + functions.getValue(TableName + "-Version") + " geändert");
          }
          else {
            throw ("UserAbort:\r\nDer Update-Vorgang für Version " + CurrentVersionNumber + " der Tabelle " + TableName + " wurde durch den Benutzer abgebrochen!");
          }
        }
        else {
          console.error(UpdateResult);
          throw ("Der Updatevorgang von Tabelle " + TableName + " ist fehlgeschlagen!\r\nUpdateResult.Result !== true");
        }
      }
      else {
        TableUpdateObject[TableName].InitTable(functions, silent);
        functions.setValue(TableName + "-Version", ExpectedVersionNumber);
        CurrentVersionNumber = ExpectedVersionNumber;
        updateMsg = "Die Datenbank-Tabelle " + TableName + " wurde initialisiert (Version: " + functions.getValue(TableName + "-Version") + ")";
        console.log(updateMsg);
      }
    }
    functions.unlock();
    return true;
  }
  return false;
}



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

    Data: {},

    HasInstalledWatchingVideo: false,
    LastSaveWatchedLength: null,

    EndTime: 0,
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
});
function getStatesVersion() {
  return { Version: "1.2.9", Date: "23.04.2021" };
}

/*
  changes = {
    @changeLog : Array : containing ordered Timestamps
    @data : Object : Indexes: Timestamps from @changeLog, Values: diff Data
    @removedChangeLogEntries : Integer : Count of already deleted States
    @currentState : Integer : Current State of the changesObject
  }
*/

// @maxAmount: Anzahl an States
function AddState(oldState, newState, changes, maxAmount = 10) {
  if (oldState == null) {
    throw new Error("NullPointerExeption: oldState not provided");
  }
  if (newState == null) {
    throw new Error("NullPointerExeption: newState not provided");
  }
  if (changes == null) {
    throw new Error("NullPointerExeption: changes not provided");
  }
  if (typeof (changes) != "object") {
    throw new Error("InvalidTypeException: changes is not an object, instead: " + typeof (changes));
  }
  if (maxAmount == null) {
    maxAmount = 10;
  }
  if (maxAmount < 2) {
    throw new Error("OutOfRangeException: maxAmount must be greater than 1");
  }
  if (changes.changeLog == null) {
    changes.changeLog = ([]);
  }
  if (changes.data == null) {
    changes.data = ({});
  }
  if (changes.removedChangeLogEntries == null) {
    changes.removedChangeLogEntries = 0;
  }
  var time = (new Date()).getTime();
  let appendIndex = "";

  while (changes.changeLog.indexOf(time + appendIndex) != -1) {
    appendIndex = appendIndex == "" ? "-1" : (--appendIndex).toString();
  }
  changes.changeLog.push(time + appendIndex);
  changes.data[time + appendIndex] = diff(oldState, newState);

  changes.currentState = changes.changeLog.length + changes.removedChangeLogEntries;
  while (changes.changeLog.length > maxAmount) {
    delete changes.data[changes.changeLog.splice(0, 1)[0]];
    changes.removedChangeLogEntries = changes.removedChangeLogEntries + 1;
  }
  return ({ StateTime: time + appendIndex, StateNr: changes.currentState });
}

function GetState(currentState, changes, requestedStateNr, requestAsTime) {
  if (currentState == null) {
    throw new Error("NullPointerExeption: currentState not provided");
  }
  if (changes == null) {
    throw new Error("NullPointerExeption: changes not provided");
  }
  if (requestedStateNr == null) {
    throw new Error("NullPointerExeption: requestedStateNr not provided");
  }
  if (requestedStateNr < 0) {
    throw new Error("OutOfRangeException: requestedStateNr is less than 0");
  }

  var currentStateNr = changes.currentState;

  if (requestAsTime === true) {
    requestedStateNr = changes.changeLog.indexOf(requestedStateNr) + changes.removedChangeLogEntries;
    if (requestedStateNr == -1) {
      throw new Error("OutOfRangeException: The provided Timestamp requestedStateNr does not exists in changeLog");
    }
  }

  if (currentStateNr == requestedStateNr) {
    return currentState;
  }

  if (currentStateNr < requestedStateNr) {
    throw new Error("OutOfRangeException: requestedStateNr is in the future");
  }

  if (requestedStateNr < changes.removedChangeLogEntries) {
    throw new Error("OutOfRangeException: requestedStateNr was already deleted");
  }

  var workingState = JSON.parse(JSON.stringify(currentState));
  for (let workingStateNr = currentStateNr - 1; workingStateNr >= requestedStateNr; workingStateNr--) {
    let diffData = changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]];
    if (diffData == null) {
      throw new Error("NullPointerExeption: diffData is null [workingStateNr:" + workingStateNr + "]");
    }
    workingState = unpatch(workingState, changes.data[changes.changeLog[workingStateNr - changes.removedChangeLogEntries]]);
  }
  return workingState;
}

function GetVisualDiff(currentState, changes, requestedStateNr, requestAsTime) {
  return jsondiffpatch.formatters.html.format(diff(currentState, GetState(currentState, changes, requestedStateNr, requestAsTime)), currentState);
}

// optional callBack (StorageName, newValue)
function CreateHistoryDialog(data, callBack) {
  try {
    $("#HistoryDialog").remove();
    $("<div />").attr("id", "HistoryDialog").attr("title", "Historie").css("backgroundColor", "#F9F9F9 !important;").appendTo("body");

    var i = 0;
    var s = "<div id=\"HistoryDialogTabs\" style=\"margin-bottom: 10px\"><ul>";
    for (var keyName in data) {
      if (keyName.contains("-Version"))
        continue;
      i++;
      s += "<li><a href=\"#HistoryDialogTab-" + i + "\">" + keyName + "</a></li>";
    }
    s += "</ul>";

    i = 0;
    var keyname;
    for (keyName in data) {
      if (keyName.contains("-Version"))
        continue;
      i++;
      s += "<div id=\"HistoryDialogTab-" + i + "\" style=\"padding-bottom:7px\">";

      s += "<label for=\"HistoryData-" + i + "\">Historien-Elemente</label>";
      s += "<select name=\"HistoryData-" + i + "\" id=\"HistoryDataSelector-" + i + "\"><option historyGroup=\"" + keyName + "\" value=\"" + data[keyName].currentState + "\" selected=\"selected\">Aktuelle Daten</option>";
      for (var timeIndex in data[keyName].changeLog.reverse()) {
        let time = data[keyName].changeLog[timeIndex];
        s += "<option historyGroup=\"" + keyName + "\" value=\"" + time + "\">" + new Date(parseInt(time)).toLocaleString() + "</option>";
      }
      s += "</select>";

      s += "<div id=\"HistoryDialogTabResultPanel-" + keyName + "\" style=\"margin: 10px 0px 10px 0px;border: 1px solid #D3D3D3;border-radius: 5px;padding: 8px 0px 8px 0px;\"></div>";

      s += "<button id=\"HistoryDataButton-" + keyName + "\" historyGroup=\"" + keyName + "\" >Daten Übernehmen</button>";
      s += "</div>";
    }
    s += "</div>";

    $(s).appendTo("#HistoryDialog");

    $("#HistoryDialog").dialog({
      close: function (event, ui) {
        $("#HistoryDialog").parentNode().remove();
      },
      width: 1400,
      height: 850,
      top: 65 // nur nötig, da zIndex nicht funktioniert (für den Youtube Header)
    });
    $("#HistoryDialogTabs").tabs();
    // $("#HistoryDialog").dialog("option", "classes.ui-dialog-content", "MyDialogBackgroundColor" );

    i = 0;
    for (keyName in data) {
      i++;

      $("#HistoryDataSelector-" + i).selectmenu({
        change: returnExec(function (event, data) {
          let group = data.item.element[0].getAttribute("historyGroup");
          document.getElementById("HistoryDialogTabResultPanel-" + group).innerHTML = GetVisualDiff(JSON.parse(GetData(group)), JSON.parse(GetData("changes"))[group], data.item.value, true);
          $("#HistoryDataButton-" + group).attr("selectedValue", data.item.value);
          console.error($("#HistoryDataButton-" + group));
        })
      });

      $("#HistoryDataButton-" + keyName).button().click(function (event, data) {
        console.error(event);
        let group = $(event.target).attr("historyGroup");
        let newValue = GetState(JSON.parse(GetData(group)), JSON.parse(GetData("changes"))[group], $(event.target).attr("selectedValue"), true);
        if (callBack == null) {
          if (confirm("Sollen die aktuellen Daten mit den ausgewählten alten Daten aus der Historie überschrieben werden?") === true) {
            SetData(group, newValue, true, false);
          }
        } else {
          callBack(group, newValue);
        }
      });
    }
  } catch (exc) {
    console.error(exc);
    alert(exc);
  }
}

function testTabNocStates() {
  let changes = ({});
  let testState = ({ Baum: "tree" });
  let testCount = 30;
  for (let i = 1; i <= testCount; i++) {
    let oldState = JSON.stringify(testState);
    testState[i] = "!";
    testState["State"] = i;
    // console.log("State", i, ":", JSON.parse(oldState), ">", currentState);
    if (AddState(JSON.parse(oldState), testState, changes, testCount - 2).StateNr != i) {
      console.error("States.js.testTabNocStates(): Test 1 failed!\r\nAddState, returned StateNr not expected Statenr");
      alert("States.js.testTabNocStates(): Test 1 failed!\r\nAddState, returned StateNr not expected Statenr");
    }
  }
  try {
    GetState(testState, changes, 0);
    GetState(testState, changes, 1);
    console.error("States.js.testTabNocStates(): Test 2 failed!");
    alert("States.js.testTabNocStates(): Test 2 failed!");
  }
  catch (e) { }
  for (let i = 2; i <= testCount; i++) {
    let result = GetState(testState, changes, i);
    if (result.State != i) {
      console.warn(i, result);
      console.error("States.js.testTabNocStates(): Test 3 failed!");
      alert("States.js.testTabNocStates(): Test 3 failed!");
    }
    if (Object.keys(result).length != i + 2) {
      console.warn(i, result);
      console.error("States.js.testTabNocStates(): Test 4 failed!");
      alert("States.js.testTabNocStates(): Test 4 failed!");
    }
  }
  return testState;
}
import { ApiAdapter } from "./api/ApiAdapter";

var apiAdapter = new ApiAdapter();

function SetData(keyName, value, locked, disableValueHistory) {
  try {
    var oldValue;
    if (disableValueHistory !== true)
      oldValue = JSON.parse(GM_getValue(keyName) || "{}");
    if (oldValue == null) {
      oldValue = ({});
    }

    if (JSON.stringify(oldValue) != value) {
      if (locked == true) {
        GM_setValue(keyName, value);
      } else {
        GM_setValueLocked(keyName, value);
      }
      apiAdapter.setValue(keyName, value);

      var result;
      if (disableValueHistory !== true) {
        let changes = JSON.parse(GM_getValue("changes") || "{}");
        changes[keyName] = changes[keyName] || ({});
        const MaxAmount = 50;

        result = AddState(oldValue, JSON.parse(value), changes[keyName], MaxAmount);

        GM_setValue("changes", JSON.stringify(changes));
      }
      if (TabNoc.Settings.Debug === true) {
        console.log("SetData(" + keyName + ", " + value + ", " + locked + ", " + disableValueHistory + ") -> " + result);
      }
    }
  } catch (exc) {
    console.error(exc);
    alert(exc);
  }
}

function GetData(keyName, defaultValue, evalValue) {
  try {
    var data = GM_getValue(keyName);

    if (data == null || data === "") {
      data = defaultValue;
    }

    if (TabNoc.Settings.Debug === true) {
      console.log("GetData(" + keyName + ", " + defaultValue + ", " + evalValue + ") -> " + data);
    }

    if (evalValue === true) {
      try {
        data = JSON.parse(data);
      } catch (exc) {
        ErrorHandler(exc, "Die Daten von >" + keyName + "< aus der Datenbank konnten nicht ausgewertet werden");
      }
    }
    return data;
  }
  catch (exc) {
    ErrorHandler(exc);
    throw exc;
  }
}






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

  GM_registerMenuCommand("CreateHistoryDialog", function () {
    CreateHistoryDialog(GetData("changes", "[]", true));
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
    var element = {};
    element.WatchedVideoArray = GetData("WatchedVideoArray", "[]", true);
    element.ScannedVideoArray = GetData("ScannedVideoArray", "[]", true);
    element.VideoObjectDictionary = GetData(
      "VideoObjectDictionary",
      "{}",
      true,
    );
    element["VideoObjectDictionary-Version"] = GetData(
      "VideoObjectDictionary-Version",
      0,
      true,
    );
    element["WatchedVideoArray-Version"] = GetData(
      "WatchedVideoArray-Version",
      0,
      true,
    );
    element["ScannedVideoArray-Version"] = GetData(
      "ScannedVideoArray-Version",
      0,
      true,
    );
    prompt("Bitte die Exportierten Daten kopieren", JSON.stringify(element));
  });

  GM_registerMenuCommand("ImportAllData", function () {
    ImportData(true, TabNoc.Variables.ImportDataProperties);
  });

  GM_registerMenuCommand("Markieren", function () {
    startCheckElements(!TabNoc.Variables.MarkToggleState);
  });

  TabNoc.Variables.ImportDataProperties = [
    {
      Name: "VideoObjectDictionary",
      defaultVersion: 2,
      defaultValue: "{}",
      ImportAction: function (dataStorage, currentEntry, importElement) {
        PushVideoObject(
          dataStorage[currentEntry.Name],
          JSON.parse(JSON.stringify(importElement)),
          false,
        );
      },
    },
    {
      Name: "WatchedVideoArray",
      defaultVersion: 0,
      defaultValue: "[]",
      ImportAction: function (dataStorage, currentEntry, importElement) {
        if (
          GetVideoWatched(
            dataStorage[currentEntry.Name],
            dataStorage.VideoObjectDictionary,
            importElement,
          ) === false
        ) {
          dataStorage[currentEntry.Name].push(importElement);
        }
      },
    },
    {
      Name: "ScannedVideoArray",
      defaultVersion: 0,
      defaultValue: "[]",
      ImportAction: function (dataStorage, currentEntry, importElement) {
        if (
          GetVideoWatched(
            dataStorage[currentEntry.Name],
            dataStorage.VideoObjectDictionary,
            importElement,
          ) === false &&
          GetVideoWatched(
            dataStorage.WatchedVideoArray,
            false,
            importElement,
          ) === false
        ) {
          dataStorage[currentEntry.Name].push(importElement);
        }
      },
    },
  ];
}

function startCheckElements(ToggleState, force) {
  if (
    (document.hidden === false && document.hasFocus()) ||
    force === true ||
    true
  ) {
    // ### ScannedVideoArray ###
    let scannedVideoArray = GetData("ScannedVideoArray", "[]", true);
    // ### WatchedVideoArray ###
    let watchedVideoArray = GetData("WatchedVideoArray", "[]", true);
    // ### VideoObjectDictionary ###
    let videoObjectDictionary = GetData(
      "VideoObjectDictionary",
      "{}",
      true,
    );

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
    let elements = document.querySelectorAll(
      `${channelPageSelector},${sidebarSelector},${videoFinishedSelector},${searchPageSelector}`,
    );
    elements = Array.from(elements).filter(
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
  ToggleState,
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

function getAllElements(from, till) {
  try {
    let start = new Date().getTime();

    GM_Lock();
    // ### ScannedVideoArray ###
    let scannedVideoArray = GetData("ScannedVideoArray", "[]", true);
    // ### WatchedVideoArray ###
    let watchedVideoArray = GetData("WatchedVideoArray", "[]", true);
    // ### VideoObjectDictionary ###
    let videoObjectDictionary = GetData(
      "VideoObjectDictionary",
      "{}",
      true,
    );

    let elements = $(".item-section");

    let fromIndex =
      from == null
        ? 0
        : elements.toArray().findIndex(function (element) {
          return getVideoIdFromElement(element) == from;
        });
    if (fromIndex == -1) throw "from(" + from + ") were not found";

    let tillIndex =
      till == null
        ? elements.length
        : elements.toArray().findIndex(function (element) {
          return getVideoIdFromElement(element) == till;
        });
    if (tillIndex == -1) throw "till(" + till + ") were not found";

    for (
      let i = Math.min(fromIndex, tillIndex);
      i < Math.max(fromIndex, tillIndex) + 1;
      i++
    ) {
      let element = elements[i];
      if (element.className.includes("item-section")) {
        let currentElementId = getVideoIdFromElement(element);

        if (
          GetVideoWatched(scannedVideoArray, false, currentElementId) ===
          false &&
          GetVideoWatched(
            watchedVideoArray,
            videoObjectDictionary,
            currentElementId,
          ) === false
        ) {
          scannedVideoArray.push(currentElementId);
        }
      } else {
        console.error(element);
      }
    }

    SetData(
      "ScannedVideoArray",
      JSON.stringify(scannedVideoArray),
      true,
      false,
    );
    GM_Unlock();

    startCheckElements(true);

    console.log(
      "getAllElements() Execution time: " + (new Date().getTime() - start),
    );
  } catch (exc) {
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

function UpdateDataBase(functions, silent) {
  silent = false;
  if (functions == null) {
    functions = {
      lock: GM_Lock,
      unlock: GM_Unlock,
      getValue: GetData,
      setValue: SetData,
    };
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
  let Version_WatchedVideoArray = JSON.parse(
    functions.getValue("WatchedVideoArray-Version", null),
  );

  // ### ScannedVideoArray-Version ###
  let Version_ScannedVideoArray = JSON.parse(
    functions.getValue("ScannedVideoArray-Version", null),
  );

  // ### VideoObjectDictionary-Version ###
  let Version_VideoObjectDictionary = JSON.parse(
    functions.getValue("VideoObjectDictionary-Version", null),
  );

  // ### WatchedVideoArray ###
  if (Version_WatchedVideoArray != CurrentVersion_WatchedVideoArray) {
    console.info(
      "Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " +
      Version_WatchedVideoArray +
      " | aktuell: " +
      CurrentVersion_WatchedVideoArray +
      ")",
    );
    if (
      confirm(
        "Es wurde ein Versionsunterschied der Datenbank-Tabelle WatchedVideoArray gefunden (alt: " +
        Version_WatchedVideoArray +
        " | aktuell: " +
        CurrentVersion_WatchedVideoArray +
        ")\r\nOK drücken um den Updatevorgang zu starten.",
      ) == false
    ) {
      throw new Error(
        "DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.",
      );
    }

    if (Version_WatchedVideoArray === null) {
      // aus der alten Tabelle 'Watched-Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#

      // ### Watched-Videos ###
      let WatchedVideos = JSON.parse(
        functions.getValue("Watched-Videos", null),
      );

      if (WatchedVideos != null) {
        functions.setValue(
          "WatchedVideoArray",
          JSON.stringify(WatchedVideos),
        );
        functions.setValue(
          "WatchedVideoArray-Version-(-1)",
          JSON.stringify(WatchedVideos),
        );

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
        console.log(
          "Die Version der Tabelle WatchedVideoArray wurde auf " +
          functions.getValue("WatchedVideoArray-Version") +
          " geändert",
        );
        alert(
          "DataBase:'WatchedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.",
        );
      } else {
        functions.setValue(
          "WatchedVideoArray-Version",
          CurrentVersion_WatchedVideoArray,
        );
        console.log(
          "Die Version der Tabelle WatchedVideoArray wurde auf " +
          functions.getValue("WatchedVideoArray-Version") +
          " geändert",
        );
        // alert("DataBase:'WatchedVideoArray' sucessfully initialised!");
      }
    } else {
      // ### WatchedVideoArray ###
      let WatchedVideoArray = JSON.parse(
        functions.getValue("WatchedVideoArray", "[]"),
      );

      switch (Version_WatchedVideoArray) {
        default:
          throw "No Update Implemeneted!";
      }
    }
  }
  // ### WatchedVideoArray ###

  // ### ScannedVideoArray ###
  if (Version_ScannedVideoArray != CurrentVersion_ScannedVideoArray) {
    console.info(
      "Es wurde ein Versionsunterschied der Datenbank-Tabelle ScannedVideoArray gefunden (alt: " +
      Version_ScannedVideoArray +
      " | aktuell: " +
      CurrentVersion_ScannedVideoArray +
      ")",
    );
    if (
      confirm(
        "Es wurde ein Versionsunterschied der Datenbank-Tabelle ScannedVideoArray gefunden (alt: " +
        Version_ScannedVideoArray +
        " | aktuell: " +
        CurrentVersion_ScannedVideoArray +
        ")\r\nOK drücken um den Updatevorgang zu starten.",
      ) == false
    ) {
      throw new Error(
        "DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.",
      );
    }

    if (Version_ScannedVideoArray === null) {
      // aus der alten Tabelle 'Videos' importieren, same DataStructure 		#*#!LEGACY CODE!#*#

      // ### Videos ###
      let Videos = JSON.parse(functions.getValue("Videos", null));

      if (Videos != null) {
        let ScannedVideoArray = [];
        let removed = 0;

        for (var element in Videos) {
          element = Videos[element]
            .replace("/watch?v=", "")
            .split("&list")[0]
            .split("&t=")[0];
          if (ScannedVideoArray.indexOf(element) === -1) {
            ScannedVideoArray.push(element);
          } else {
            removed++;
          }
        }

        functions.setValue(
          "ScannedVideoArray",
          JSON.stringify(ScannedVideoArray),
        );
        functions.setValue(
          "ScannedVideoArray-Version-(-1)",
          JSON.stringify(Videos),
        );

        if (GM_listValues().indexOf("Videos") !== -1) {
          GM_deleteValue("Videos");
        }

        if (GM_listValues().indexOf("Videos-Version") !== -1) {
          GM_deleteValue("Videos-Version");
        }

        functions.setValue("ScannedVideoArray-Version", 0);
        console.log(
          "Die Version der Tabelle ScannedVideoArray wurde auf " +
          functions.getValue("ScannedVideoArray-Version") +
          " geändert",
        );
        alert(
          "DataBase:'ScannedVideoArray' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.\r\nEs wurden " +
          removed +
          " doppelte Einträge entfernt.",
        );
      } else {
        functions.setValue(
          "ScannedVideoArray-Version",
          CurrentVersion_ScannedVideoArray,
        );
        console.log(
          "Die Version der Tabelle ScannedVideoArray wurde auf " +
          functions.getValue("ScannedVideoArray-Version") +
          " geändert",
        );
        // alert("DataBase:'ScannedVideoArray' sucessfully initialised!");
      }
    } else {
      // ### ScannedVideoArray ###
      let ScannedVideoArray = JSON.parse(
        functions.getValue("ScannedVideoArray", "[]"),
      );

      switch (Version_ScannedVideoArray) {
        default:
          throw "No Update Implemeneted!";
      }
    }
  }
  // ### ScannedVideoArray ###

  // ### VideoObjectDictionary ###
  if (Version_VideoObjectDictionary != CurrentVersion_VideoObjectDictionary) {
    console.info(
      "Es wurde ein Versionsunterschied der Datenbank-Tabelle VideoObjectDictionary gefunden (alt: " +
      Version_VideoObjectDictionary +
      " | aktuell: " +
      CurrentVersion_VideoObjectDictionary +
      ")",
    );
    if (
      confirm(
        "Es wurde ein Versionsunterschied der Datenbank-Tabelle VideoObjectDictionary gefunden (alt: " +
        Version_VideoObjectDictionary +
        " | aktuell: " +
        CurrentVersion_VideoObjectDictionary +
        ")\r\nOK drücken um den Updatevorgang zu starten.",
      ) == false
    ) {
      throw new Error(
        "DatabaseUpdate wurde durch den Benutzer abgebrochen!\r\nOhne ein Update der Datenbank funktioniert das System nicht.",
      );
    }

    if (Version_VideoObjectDictionary === null) {
      // aus der alten Tabelle 'VideoStatistics' importieren 		#*#!LEGACY CODE!#*#

      // ### VideoStatistics ###
      let VideoStatistics = JSON.parse(
        functions.getValue("VideoStatistics", null),
      );

      if (VideoStatistics != null) {
        functions.setValue(
          "VideoObjectDictionary-Version-(-1)",
          JSON.stringify(VideoStatistics),
        );
        let newStructure = {
          unknown: [],
        };
        let removed = 0;

        if (GM_listValues().indexOf("VideoStatistics") !== -1) {
          GM_deleteValue("VideoStatistics");
        }

        for (let element in VideoStatistics) {
          newStructure.unknown.push(VideoStatistics[element]);
        }

        functions.setValue("VideoObjectDictionary-Version", 0);
        console.log(
          "Die Version der Tabelle VideoObjectDictionary wurde auf " +
          functions.getValue("VideoObjectDictionary-Version") +
          " geändert",
        );
        alert(
          "DataBase:'VideoObjectDictionary' die alten Daten wurden erfolgreich importiert!\r\nDie Datenbank wurde von alten Daten bereinigt.",
        );

        functions.setValue(
          "VideoObjectDictionary",
          JSON.stringify(newStructure),
        );
      } else {
        functions.setValue(
          "VideoObjectDictionary-Version",
          CurrentVersion_VideoObjectDictionary,
        );
        console.log(
          "Die Version der Tabelle VideoObjectDictionary wurde auf " +
          functions.getValue("VideoObjectDictionary-Version") +
          " geändert",
        );
        // alert("DataBase:'VideoObjectDictionary' sucessfully initialised!");
      }
    } else {
      // ### VideoObjectDictionary ###
      let videoObjectDictionary = JSON.parse(
        functions.getValue("VideoObjectDictionary", "{}"),
      );
      let newStructure = {};
      let count = 0;
      let count2 = 0;

      switch (Version_VideoObjectDictionary) {
        case 0:
        case 1:
          functions.setValue(
            "VideoObjectDictionary-Version-1",
            JSON.stringify(videoObjectDictionary),
          );

          for (let i in videoObjectDictionary) {
            for (let j in videoObjectDictionary[i]) {
              var newObject = videoObjectDictionary[i][j];
              if (newObject.Watches !== undefined) {
                throw "Was ist das ?";
              }
              newObject.Watches = [];
              newObject.Watches.push({
                WatchedLength: newObject.WatchedLength,
                Date: i,
              });
              delete newObject.WatchedLength;
              newObject.VideoLength = Math.floor(newObject.VideoLength);

              PushVideoObject(newStructure, newObject, false);
              count++;
            }
          }

          console.log(
            "Die Version der Tabelle VideoObjectDictionary ist " +
            functions.getValue("VideoObjectDictionary-Version"),
          );
          console.info(
            "Es wurden " +
            count +
            " Elemente aktualisiert (alte Datenmenge: " +
            JSON.stringify(videoObjectDictionary).length +
            "B | neue Datenmenge: " +
            JSON.stringify(newStructure).length +
            "B)",
          );
          if (silent !== true)
            alert(
              "Es wurden " +
              count +
              " Elemente aktualisiert (alte Datenmenge: " +
              JSON.stringify(videoObjectDictionary).length +
              "B | neue Datenmenge: " +
              JSON.stringify(newStructure).length +
              "B)",
            );
          if (
            silent ||
            confirm("Sollen die Änderungen gespeichert werden?") === true
          ) {
            functions.setValue("VideoObjectDictionary-Version", 2);
            console.log(
              "Die Version der Tabelle VideoObjectDictionary wurde auf " +
              functions.getValue("VideoObjectDictionary-Version") +
              " geändert",
            );
            functions.setValue(
              "VideoObjectDictionary",
              JSON.stringify(newStructure),
            );
          } else {
            throw new Error(
              "Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt",
            );
          }
          break;

        case 2:
          if (functions.getValue("VideoObjectDictionary-Version-2") != null) {
            if (
              functions.getValue("VideoObjectDictionary-Version-2") !==
              JSON.stringify(videoObjectDictionary)
            ) {
              console.log("Current VideoObjectDictionary-Version-2 Data");
              console.log(
                JSON.parse(
                  functions.getValue("VideoObjectDictionary-Version-2"),
                ),
              );
              console.log("New VideoObjectDictionary-Version-2 Data");
              console.log(JSON.parse(JSON.stringify(videoObjectDictionary)));
              if (
                confirm(
                  "Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]",
                ) === true
              ) {
                functions.setValue(
                  "VideoObjectDictionary-Version-2",
                  JSON.stringify(videoObjectDictionary),
                );
              } else {
                if (
                  confirm(
                    "Soll der Vorgang ohne Backup fortgesetzt werden?",
                  ) !== true
                ) {
                  throw new Error(
                    "Der Eintrag 'VideoObjectDictionary-Version-2' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt",
                  );
                }
              }
            } else {
              console.log(
                "VideoObjectDictionary-Version-2 was already set with same Data",
              );
            }
          } else {
            functions.setValue(
              "VideoObjectDictionary-Version-2",
              JSON.stringify(videoObjectDictionary),
            );
          }

          newStructure = JSON.parse(JSON.stringify(videoObjectDictionary));
          let regex = new RegExp(
            /(\d{1,2}).(\d{1,2}).(\d{4})(.*,.*\d{2}:\d{2}:\d{2})?/,
          );

          for (let i in videoObjectDictionary) {
            for (let j in videoObjectDictionary[i].Watches) {
              if (
                videoObjectDictionary[i].Watches[j].Date === "unknown" ||
                videoObjectDictionary[i].Watches[j].Date == null
              ) {
                // "unknown" is a good string, but null seems to be better (NullPointer Exception is easy to find)
                newStructure[i].Watches[j].Date = null;
                count2++;
                // EDIT: 14.08.2017 (DataBaseVersion 4)
                // have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
                newStructure[i].Watches[j].Date = "unknown";
              } else {
                if (
                  isNaN(
                    new Date(
                      videoObjectDictionary[i].Watches[j].Date,
                    ).getTime(),
                  ) === false
                ) {
                  newStructure[i].Watches[j].Date = new Date(
                    videoObjectDictionary[i].Watches[j].Date,
                  ).toString();
                } else {
                  let matches =
                    videoObjectDictionary[i].Watches[j].Date.match(regex);
                  if (matches.length === 5 && matches[4] != undefined) {
                    var newDate = new Date(
                      matches[2] +
                      "/" +
                      matches[1] +
                      "/" +
                      matches[3] +
                      matches[4],
                    );
                  }
                  // das Datum {videoObjectDictionary[i].Watches[j].Date} vom Datensatz {JSON.stringify(videoObjectDictionary[i])} auf die Zeit 00:00:00Uhr setzen
                  else {
                    let newDate = new Date(
                      matches[2] + "/" + matches[1] + "/" + matches[3],
                    );
                  }
                  if (isNaN(newDate.getTime()) === false) {
                    newStructure[i].Watches[j].Date = newDate.toString();
                  } else {
                    alert(videoObjectDictionary[i].Watches[j].Date);
                    throw new Error(
                      "The converted Date is not a Date Object",
                    );
                  }
                }
              }
              count++;
            }
          }

          console.log(
            "Die Version der Tabelle VideoObjectDictionary ist " +
            functions.getValue("VideoObjectDictionary-Version"),
          );
          console.info(
            "Es wurden " +
            count +
            " Elemente aktualisiert (alte Datenmenge: " +
            JSON.stringify(videoObjectDictionary).length +
            "B | neue Datenmenge: " +
            JSON.stringify(newStructure).length +
            "B).\r\nDabei sind " +
            count2 +
            " leere Datumswerte aufgetreten",
          );
          if (silent !== true)
            alert(
              "Es wurden " +
              count +
              " Elemente aktualisiert (alte Datenmenge: " +
              JSON.stringify(videoObjectDictionary).length +
              "B | neue Datenmenge: " +
              JSON.stringify(newStructure).length +
              "B).\r\nDabei sind " +
              count2 +
              " leere Datumswerte aufgetreten",
            );
          if (
            silent ||
            confirm("Sollen die Änderungen gespeichert werden?") === true
          ) {
            functions.setValue("VideoObjectDictionary-Version", 3);
            console.log(
              "Die Version der Tabelle VideoObjectDictionary wurde auf " +
              functions.getValue("VideoObjectDictionary-Version") +
              " geändert",
            );
            functions.setValue(
              "VideoObjectDictionary",
              JSON.stringify(newStructure),
            );
          } else {
            throw new Error(
              "Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt",
            );
          }
          break;

        case 3:
          if (functions.getValue("VideoObjectDictionary-Version-3") != null) {
            if (
              functions.getValue("VideoObjectDictionary-Version-3") !==
              JSON.stringify(videoObjectDictionary)
            ) {
              console.log("Current VideoObjectDictionary-Version-3 Data");
              console.log(
                JSON.parse(
                  functions.getValue("VideoObjectDictionary-Version-3"),
                ),
              );
              console.log("New VideoObjectDictionary-Version-3 Data");
              console.log(JSON.parse(JSON.stringify(videoObjectDictionary)));
              if (
                confirm(
                  "Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, soll dieser überschrieben werden?\r\n[In der Konsole sind ausführliche Informationen]",
                ) === true
              ) {
                functions.setValue(
                  "VideoObjectDictionary-Version-3",
                  JSON.stringify(videoObjectDictionary),
                );
              } else {
                if (
                  confirm(
                    "Soll der Vorgang ohne Backup fortgesetzt werden?",
                  ) !== true
                ) {
                  throw new Error(
                    "Der Eintrag 'VideoObjectDictionary-Version-3' ist bereits mit anderen Daten gesetzt, der Benutzer hat ein überschreiben und ein Fortsetzten abgelehnt",
                  );
                }
              }
            } else {
              console.log(
                "VideoObjectDictionary-Version-3 was already set with same Data",
              );
            }
          } else {
            functions.setValue(
              "VideoObjectDictionary-Version-3",
              JSON.stringify(videoObjectDictionary),
            );
          }

          newStructure = JSON.parse(JSON.stringify(videoObjectDictionary));

          for (let i in videoObjectDictionary) {
            for (let j in videoObjectDictionary[i].Watches) {
              if (
                videoObjectDictionary[i].Watches[j].Date === "unknown" ||
                videoObjectDictionary[i].Watches[j].Date == null ||
                new Date(
                  videoObjectDictionary[i].Watches[j].Date,
                ).getTime() === 0
              ) {
                // have to use "unknown", null provides an empty Date ("Thu Jan 01 1970 01:00:00 GMT+0100")
                newStructure[i].Watches[j].Date = "unknown";
                count2++;
              } else if (
                isNaN(
                  new Date(
                    videoObjectDictionary[i].Watches[j].Date,
                  ).getTime(),
                ) === true
              ) {
                console.error(videoObjectDictionary[i].Watches[j].Date);
                throw new Error(
                  "Es wurde ein defektes Datum gefunden, hier geht es nicht weiter\r\nMich bitte Informieren",
                );
              }
              count++;
            }
          }

          console.log(
            "Die Version der Tabelle VideoObjectDictionary ist " +
            functions.getValue("VideoObjectDictionary-Version"),
          );
          console.info(
            "Es wurden " +
            count +
            " Elemente aktualisiert (alte Datenmenge: " +
            JSON.stringify(videoObjectDictionary).length +
            "B | neue Datenmenge: " +
            JSON.stringify(newStructure).length +
            "B).\r\nDabei sind " +
            count2 +
            " leere Datumswerte aufgetreten",
          );
          if (silent !== true)
            alert(
              "Es wurden " +
              count +
              " Elemente aktualisiert (alte Datenmenge: " +
              JSON.stringify(videoObjectDictionary).length +
              "B | neue Datenmenge: " +
              JSON.stringify(newStructure).length +
              "B).\r\nDabei sind " +
              count2 +
              " leere Datumswerte aufgetreten",
            );
          if (
            silent ||
            confirm("Sollen die Änderungen gespeichert werden?") === true
          ) {
            functions.setValue("VideoObjectDictionary-Version", 4);
            console.log(
              "Die Version der Tabelle VideoObjectDictionary wurde auf " +
              functions.getValue("VideoObjectDictionary-Version") +
              " geändert",
            );
            functions.setValue(
              "VideoObjectDictionary",
              JSON.stringify(newStructure),
            );
          } else {
            throw new Error(
              "Das Abspeichern der geänderten Daten wurde durch den Benutzer abgelehnt",
            );
          }
          break;

        default:
          throw "No Update Implemeneted!";
      }
    }
  }
  // ### VideoObjectDictionary ###

  functions.unlock();

  if (
    CurrentVersion_WatchedVideoArray !=
    JSON.parse(functions.getValue("WatchedVideoArray-Version"), null) ||
    CurrentVersion_ScannedVideoArray !=
    JSON.parse(functions.getValue("ScannedVideoArray-Version"), null) ||
    CurrentVersion_VideoObjectDictionary !=
    JSON.parse(functions.getValue("VideoObjectDictionary-Version"), null)
  ) {
    UpdateDataBase(functions, silent);
  }
}

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

function Syncronisieren(scriptName) {
  var onAbort = function (response) {
    console.log("onabort");
    console.info(response);
  };

  var onError = function (msg) {
    return function (response) {
      console.log("onerror");
      console.info(response);
      alert(msg);
      Feedback.hideProgress();
    };
  };

  var onTimeout = function (response) {
    console.log("ontimeout");
    console.info(response);
  };

  var onLoadPost = returnExec(function (response) {
    if (response.status !== 200) {
      alert("Statuscode:" + response.status);
      Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
      return;
    }
    if (response.responseText.charAt(0) === "#") {
      alert(
        "Bei der Abfrage ist ein Fehler aufgetreten:" + response.responseText,
      );
      Feedback.showProgress(100, "Senden der Daten fehlgeschlagen");
      return;
    }
    Feedback.showProgress(100, "Senden der Daten erfolgreich abgeschlossen");
    alert(
      "Die Syncronisierung der Daten mit dem Server wurde erfolgreich abgeschlossen.\r\nAktueller Versionsstand: " +
      response.responseText,
    );
  });

  var onLoadGet = returnExec(function (response) {
    Feedback.showProgress(40, "Servernachricht auswerten");
    var error = false;
    if (response.status !== 200) {
      console.error(response);
      alert("Statuscode:" + response.status);
      Feedback.showProgress(
        100,
        "Abgebrochen, es konnten keine Daten empfangen werden",
      );
      return;
    }
    if (response.responseText.charAt(0) === "#") {
      console.error(response);
      var errorCode = response.responseText.split("\r\n")[0].substring(1);
      if (errorCode === "2") {
        error = true;
      } else {
        alert(
          "Bei der Abfrage ist ein Fehler aufgetreten:" +
          response.responseText,
        );
        Feedback.showProgress(100, "Abgebrochen, Fehler auf dem Server");
        return;
      }
    }
    Feedback.showProgress(50, "Empfangene Daten migrieren");
    if (!error) {
      var responseData = JSON.parse(response.responseText);
      console.info("Server response Data:", responseData);
      if (
        responseData.VideoObjectDictionary != null &&
        responseData.WatchedVideoArray != null
      ) {
        Feedback.lockProgress();
        ImportData(responseData, TabNoc.Variables.ImportDataProperties);
        Feedback.unlockProgress();
      } else {
        alert("Der Wert des Response des Servers war ungültig!");
      }
    }
    if (
      confirm(
        "Sollen die aktuellen Daten auf dem Server gespeichert werden?",
      ) === false
    ) {
      Feedback.showProgress(100, "Senden der Daten abgebrochen");
      return;
    }
    Feedback.showProgress(75, "Neue Daten auf dem Server speichern");

    var element = {};
    element.WatchedVideoArray = GetData("WatchedVideoArray", "[]", true);
    element.ScannedVideoArray = GetData("ScannedVideoArray", "[]", true);
    element.VideoObjectDictionary = GetData(
      "VideoObjectDictionary",
      "{}",
      true,
    );
    element["VideoObjectDictionary-Version"] = GetData(
      "VideoObjectDictionary-Version",
      0,
      true,
    );
    element["WatchedVideoArray-Version"] = GetData(
      "WatchedVideoArray-Version",
      0,
      true,
    );
    element["ScannedVideoArray-Version"] = GetData(
      "ScannedVideoArray-Version",
      0,
      true,
    );
    GM_xmlhttpRequest({
      data: JSON.stringify({
        Token: Token,
        data: JSON.stringify(element),
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      onabort: onAbort,
      onerror: onError("Sending New Data Failed"),
      onload: onLoadPost,
      ontimeout: onTimeout,
      timeout: 60000,
      url: "https://tabnoc.gear.host/MyDataFiles//Input",
    });
  });

  Feedback.showProgress(10, "Token erfassen");
  var Token = prompt("Bitte Token eingeben") + scriptName;
  Feedback.showProgress(20, "Request starten");
  GM_xmlhttpRequest({
    data: JSON.stringify({
      Token: Token,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    onabort: onAbort,
    onerror: onError("Receving Server Data Failed"),
    onload: onLoadGet,
    ontimeout: onTimeout,
    timeout: 60000,
    url: "https://tabnoc.gear.host/MyDataFiles//Output",
  });
  Feedback.showProgress(30, "Warte auf Rückmeldung vom Server");
}

function ModuleImport(moduleName, moduleFunction, expectedVersion) {
  let currentVersion = moduleFunction().Version;
  let versionCompareResult = versionCompare(currentVersion, expectedVersion);
  var versionData = GetData("ImportVersion", "{\"show\": true}", true);
  versionData[moduleName] = versionData[moduleName] || {};
  if (
    versionData.show == true &&
    versionData[moduleName].Version != currentVersion &&
    versionData[moduleName].Version != undefined
  ) {
    alert(
      "Das Modul " +
      moduleName +
      " wurde von Version " +
      versionData[moduleName].Version +
      " auf Version " +
      currentVersion +
      " aktualisiert (Die erwartete Version ist " +
      expectedVersion +
      ")",
    );
  }

  if (versionCompareResult != 0) {
    var msg =
      'Das geladene Modul: "' +
      moduleName +
      '" ist ' +
      (versionCompareResult < 0 ? "älter" : "neuer") +
      " als die konfigurierte Version";
    msg +=
      "\r\nDie erwartete Version ist: " +
      expectedVersion +
      " gegeben ist: " +
      currentVersion;
    console.info(msg);
    if (
      versionData[moduleName].skipNotification !== currentVersion &&
      !confirm(
        msg +
        "\r\n\r\nSoll diese Meldung für diese Version des Moduls weiterhin angezeigt werden?",
      )
    ) {
      versionData[moduleName].skipNotification = currentVersion;
    }
  }
  versionData[moduleName].Version = currentVersion;
  SetData("ImportVersion", JSON.stringify(versionData), true, false);
}

function Main() {
  ModuleImport("States", getStatesVersion, "1.2.9");
  ModuleImport("TabNoc_GM", getTabNoc_GMVersion, "2.0.2");
  ModuleImport("TabNoc", getTabNocVersion, "1.2.4");
  ModuleImport("ImportAll", getImportAllVersion, "1.1.3");

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
    alert(
      "Der Aktuelle Sperrzustand der Datenbank ist positiv, dies wird durch Fehlermeldungen während der Ausführung ausgelöst oder ist nur eine kurzweilige erscheinung. \r\n\r\n Bitte Meldung bestätigen!",
    );
    if (count >= 2) {
      if (
        confirm(
          "Soll der Sperrzustand der Datenbank aufgehoben werden [empfohlen]?",
        ) === true
      ) {
        GM_Unlock(true);
      }
    }
    if (count > 10) {
      alert(
        "Der Sperrzustand der Datenbank wurde nicht aufgehoben, bitte manuell überprüfen!",
      );
      return;
    }
  }

  GM_addStyle(GM_getResourceText("JqueryUI"));
  UpdateDataBase();

  GM_addStyle(GM_getResourceText("JDiffAnno"));
  GM_addStyle(GM_getResourceText("JDiffHtml"));

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