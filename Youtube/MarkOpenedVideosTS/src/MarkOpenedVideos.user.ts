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

// Ensure jQuery is available on the page/global scope (for other libs and inline code)
if (typeof unsafeWindow !== 'undefined') {
  unsafeWindow.jQuery = unsafeWindow.$ = jQuery;
} else if (typeof window !== 'undefined') {
  window.jQuery = window.$ = jQuery;
}

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

function execTime(func: Function|string, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any) {
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

function exec(func: Function, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any) {
  try {
    return func(arg1, arg2, arg3, arg4, arg5);
  }
  catch (exc) {
    alert(exc);
    console.error(exc);
  }
}

function returnExec(func:Function) {
  return function (arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any) {
    try {
      return func(arg1, arg2, arg3, arg4, arg5);
    }
    catch (exc) {
      alert(exc);
      console.error(exc);
    }
  };
}

function escapeRegExp(string: string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string: string, find: string, replace: string) {
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

      if (document.getElementById("myFeedback") != null) {
        element = document.getElementById("myFeedback");
        $(element).off();
      }
      else {
        element = document.createElement("div");
        element.id = "myFeedback";
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
      var element = document.getElementById("myFeedback");
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
import { GM_info, GM_registerMenuCommand, unsafeWindow } from "$";
import {VideoObject} from "./api/ApiService";
import { match } from "ts-pattern";

var apiAdapter = new ApiAdapter();

// ### https://www.youtube.com/ ###
async function SubscriptionPageLoader() {
  console.log("MarkOpenedVideos.user.js loading [SubscriptionPageLoader]");
  try {
    registerTabNoc();

    TabNoc.Variables.checkElementsInterval = setInterval(
      returnExec(function () {
        startCheckElements(TabNoc.Variables.MarkToggleState);
      }),
      TabNoc.Settings.TimerInterval,
    );
    await startCheckElements(TabNoc.Variables.MarkToggleState, true);
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

  GM_registerMenuCommand("Upload Data", async function () {
    const data: any = JSON.parse(prompt("Please enter the data to import:", "") || "{}");
    if (data == null || typeof data !== "object" || Object.keys(data).length === 0) {
      alert("No data entered. Import cancelled.");
      return;
    }
    const VideoObjectDictionary: Map<string, VideoObject> = data["VideoObjectDictionary"];

    if (VideoObjectDictionary == null) {
      alert("Invalid data format. Import cancelled.");
      return;
    }

    Feedback.showProgress(0, "Initialised Upload");
    let i = 0;
    const count = Object.keys(VideoObjectDictionary).length;

    let promises = [];
    for (const [videoId, videoObject] of Object.entries(VideoObjectDictionary)) {
      console.log(`Uploading Element ${i + 1}/${count}: ${videoId}`, videoObject);
      Feedback.showProgress(
        (i / count) * 100,
        `Uploading Element ${i + 1}/${count}: ${videoId}`,
        5000
      );
      i++;
      const local_i = i;
      promises.push(apiAdapter.getService().createOrUpdateVideo(videoObject).then((response) => {
        return match (response)
          .with({ ok: true }, () => {
            console.trace(`Uploaded Element ${local_i + 1}/${count}: ${videoId}`);
            return true
          })
          .with({ ok: false }, (res) => {
            throw new Error("Error uploading video data: " + res.error);
          })
          .exhaustive();
      }).catch((exc) => {
        console.error(exc);
        alert(exc);
        throw exc;
      }));

      if (promises.length >= 100) {
        await Promise.all(promises).then(() => {
          promises = [];
          console.log("Finished Batch.");
        }).catch((exc) => {
          console.error(exc);
          alert(exc);
          throw exc;
        });
      }
    }


      //await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to avoid blocking the UI
    
      Feedback.showProgress(
        100,
        "Finished Uploading " + count + " elements",
        60000,
        function () {
          Feedback.hideMessage();
        },
      );
  });
}

// ─── Node types ────────────────────────────────────────────────────────────────

type SelectorDefinition = {
  name: string;
  selector: string;
};

/** Coarse structural kind of a matched DOM node. */
type NodeType = "video" | "videowall" | "short" | "unknown";

/**
 * Lifecycle state of a node within one pipeline run.
 * Set by the extractor and updated by pipeline steps.
 */
type NodeState = "new" | "watched" | "scanned" | "filtered";

/**
 * Mutable context object carried through the extractor and all pipeline steps
 * for a single DOM node.
 */
type NodeContext = {
  element: Element;
  nodeType: NodeType;
  /** Extracted YouTube video ID, or null when unavailable / not applicable. */
  videoID: string | null;
  state: NodeState;
};

/** Passed as immutable input to every pipeline step. */
type SelectorRunContext = {
  ToggleState: boolean;
};

/**
 * A named async step that mutates a NodeContext.
 * Each step runs inside its own collapsed console group nested under the
 * per-node group, so all its log output is naturally scoped.
 */
type NodePipelineStep = {
  name: string;
  run: (nodeCtx: NodeContext, context: SelectorRunContext) => Promise<NodePipelineStepResult> | NodePipelineStepResult;
};

/**
 * Return type for a pipeline step.
 * - Return `"skipped"` to show a yellow Skipped badge.
 * - Throw any value to show a red Failed badge.
 * - Return `void` / `undefined` to show a green OK badge.
 */
type NodePipelineStepResult = "skipped" | void;

type StepStatus = "success" | "skipped" | "failed";

type StepExecution = {
  stepName: string;
  status: StepStatus;
  logs: CapturedLog[];
};

type CapturedLogMethod = "log" | "info" | "warn" | "error" | "debug" | "group" | "groupCollapsed" | "groupEnd";
type CapturedLog = { method: CapturedLogMethod; args: unknown[] };

// ─── NodeManager ───────────────────────────────────────────────────────────────

/**
 * Manages a set of CSS selectors and a per-node async pipeline.
 *
 * Run order per interval tick:
 *   1. Each registered selector is queried and filtered.
 *   2. Selectors unchanged since the last run are skipped (unless `force`).
 *   3. Per-node group opens: `<preType>  [element]`.
 *   4. Each step runs: output captured → step group
 *      opened with a colored status badge → logs replayed inside.
 *
 * Step group badges:
 *   [  OK  ]   green  — step returned void
 *   [Skipped]  yellow — step returned "skipped"
 *   [ Failed]  red    — step threw an error
 *
 * Console structure:
 *   ▸ Selector results
 *     ▸ channelPageSelector — total: 20, after filter: 18
 *       ▸ [  OK  ] [type] [ID] [state] <element>
 *         ▸ [  OK  ] ↳ Extract node info
 *         ▸ [  OK  ] ↳ Apply base style
 *         ▸ [  OK  ] ↳ Fetch server data
 *         ▸ [  OK  ] ↳ Apply formatting
 *       ▸ [Skipped] [type] [ID] [state] <element>
 *         ▸ [  OK  ] ↳ Extract node info
 *         ▸ [Skipped] ↳ Apply base style
 *     — sidebarSelector — unchanged (5)
 */
class NodeManager {
  private readonly selectors: SelectorDefinition[] = [];
  private readonly pipelineSteps: NodePipelineStep[] = [];
  /** Previous filtered element sets per selector name — used for change detection. */
  private readonly selectorCache = new Map<string, Set<Element>>();

  constructor(private readonly excludedSelector: string) {}

  registerSelector(name: string, selector: string): this {
    this.selectors.push({ name, selector });
    return this;
  }

  /**
   * Register a named pipeline step.
   * Return `"skipped"` for intentional skips; throw for errors.
   * All console output is captured and replayed inside the step's group.
   */
  registerPipelineStep(name: string, run: NodePipelineStep["run"]): this {
    this.pipelineSteps.push({ name, run });
    return this;
  }

  /**
   * Evaluate all selectors, reprocess selectors that changed (or all when
   * `force` is true), and run the full pipeline for each matched node.
   */
  async run(runCtx: SelectorRunContext, force: boolean = false): Promise<void> {
    const S = NodeManager.styles;

    console.groupCollapsed("%cSelector results", S.header);

    for (const selectorDef of this.selectors) {
      const allElements = Array.from(document.querySelectorAll(selectorDef.selector));
      const filtered = allElements.filter((el) => !el.querySelector(this.excludedSelector));
      const changed = this.hasChanged(selectorDef.name, filtered);

      if (!changed && !force) {
        console.log(
          "%c— " + selectorDef.name + " — unchanged (" + filtered.length + ")",
          S.unchanged,
        );
        continue;
      }

      this.updateCache(selectorDef.name, filtered);

      const badgeStyle = filtered.length === 0 ? S.empty : S.found;
      console.groupCollapsed(
        "%c " +
          selectorDef.name +
          " — total: " +
          allElements.length +
          ", after filter: " +
          filtered.length +
          (changed ? "  ✦" : ""),
        badgeStyle,
      );

      for (const element of filtered) {
        const nodeCtx: NodeContext = {
          element,
          nodeType: "unknown",
          videoID: null,
          state: "new",
        };
        const stepExecutions: StepExecution[] = [];

        for (const step of this.pipelineSteps) {
          stepExecutions.push(await this.executeStep(step, nodeCtx, runCtx));
        }

        const worstResult = stepExecutions.reduce<StepStatus>((worst, exec) => {
          return match (exec.status)
            .with("failed", () => "failed" as StepStatus)
            .with("skipped", () => worst === "failed", () => "failed" as StepStatus)
            .with("skipped", () => worst !== "failed", () => "skipped" as StepStatus)
            .otherwise(() => worst);
        }, "success" as StepStatus);
        
        const { style: badgeStyle, label: badgeLabel } = this.getBadgeForStatus(worstResult);

        console.groupCollapsed(
          "%c" + badgeLabel + 
          "%c " + nodeCtx.nodeType +
          "%c" + (nodeCtx.videoID ?? " — ") +
          "%cstate: " + nodeCtx.state,
          badgeStyle,
          S.typeBadge,
          S.videoId,
          NodeManager.stateStyle(nodeCtx.state),
          nodeCtx.element,
        );

        for (const execution of stepExecutions) {
          this.renderStep(execution);
        }

        console.groupEnd(); // node group
      }

      console.groupEnd(); // selector group
    }

    console.groupEnd(); // "Selector results"
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  /**
   * Executes one step and returns captured output + final status.
   */
  private async executeStep(
    step: NodePipelineStep,
    nodeCtx: NodeContext,
    runCtx: SelectorRunContext,
  ): Promise<StepExecution> {
    const capture = await this.captureStep(step, nodeCtx, runCtx);
    return {
      stepName: step.name,
      status: capture.status,
      logs: capture.logs,
    };
  }

  private getBadgeForStatus(status: StepStatus): { style: string; label: string } {
    const S = NodeManager.styles;
    return match (status)
      .with("skipped", () => ({ style: S.badgeSkipped, label:  "  Skipped " }))
      .with("failed", () => ({ style: S.badgeFailed,  label:   "  Failed  " }))
      .with("success", () => ({ style: S.badgeSuccess,  label: "    OK    " }))
      .exhaustive();
  }

  /**
   * Renders one step group with status badge and replays all captured logs.
   */
  private renderStep(execution: StepExecution): void {
    const { style: badgeStyle, label: badgeLabel } = this.getBadgeForStatus(execution.status);
    console.groupCollapsed("%c" + badgeLabel + "%c ↳ " + execution.stepName, badgeStyle, NodeManager.styles.stepName);
    for (const entry of execution.logs) {
      (console as unknown as Record<CapturedLogMethod, (...a: unknown[]) => void>)[entry.method](...entry.args);
    }
    console.groupEnd();
  }

  /** Intercepts all console output while the step runs, then restores originals. */
  private async captureStep(
    step: NodePipelineStep, nodeCtx: NodeContext, runCtx: SelectorRunContext,
  ): Promise<{ logs: CapturedLog[]; status: StepStatus }> {
    const capturedLogs: CapturedLog[] = [];
    const methods: CapturedLogMethod[] = ["log","info","warn","error","debug","group","groupCollapsed","groupEnd"];
    const cc = console as unknown as Record<CapturedLogMethod, (...args: unknown[]) => void>;
    const orig = {} as Record<CapturedLogMethod, (...args: unknown[]) => void>;
    for (const m of methods) { orig[m] = cc[m].bind(console); cc[m] = (...a) => capturedLogs.push({ method: m, args: a }); }
    let status: StepStatus = "success";
    try {
      if (await step.run(nodeCtx, runCtx) === "skipped") status = "skipped";
    } catch (err) {
      status = "failed";
      capturedLogs.push({ method: "error", args: ["Step error:", err] });
    } finally {
      for (const m of methods) cc[m] = orig[m];
    }
    return { logs: capturedLogs, status };
  }

  private hasChanged(name: string, elements: Element[]): boolean {
    const prev = this.selectorCache.get(name);
    if (prev == null) return true;
    if (prev.size !== elements.length) return true;
    for (const el of elements) {
      if (!prev.has(el)) return true;
    }
    return false;
  }

  private updateCache(name: string, elements: Element[]): void {
    this.selectorCache.set(name, new Set(elements));
  }

  static stateStyle(state: NodeState): string {
    switch (state) {
      case "scanned":  return "color:#fff;background:#1f8b4c;padding:1px 5px;border-radius:3px;font-size:11px;";
      case "watched":  return "color:#fff;background:#2e7d32;padding:1px 5px;border-radius:3px;font-size:11px;";
      case "filtered": return "color:#fff;background:#c53030;padding:1px 5px;border-radius:3px;font-size:11px;";
      case "new":      return "color:#fff;background:#1565c0;padding:1px 5px;border-radius:3px;font-size:11px;";
      default:         return "color:#333;";
    }
  }

  private static readonly styles = {
    header:    "color:#fff;background:#333;padding:2px 6px;border-radius:3px;font-weight:bold;",
    found:     "color:#fff;background:#1f8b4c;padding:2px 6px;border-radius:3px;",
    empty:     "color:#fff;background:#c53030;padding:2px 6px;border-radius:3px;",
    unchanged: "color:#888;padding:2px 6px;",
    typeBadge: "color:#fff;background:#555;padding:1px 5px;border-radius:3px;font-size:11px;",
    videoId:   "color:#e5e7eb;background:#1f2937;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px;",
    stepName:     "color:#f1f5f9;background:#1f2937;padding:1px 4px;border-radius:3px;font-size:12px;",
    badgeSuccess: "color:#fff;background:#1f8b4c;padding:1px 5px;border-radius:3px;font-size:11px;font-weight:bold;",
    badgeSkipped: "color:#333;background:#f59e0b;padding:1px 5px;border-radius:3px;font-size:11px;font-weight:bold;",
    badgeFailed:  "color:#fff;background:#c53030;padding:1px 5px;border-radius:3px;font-size:11px;font-weight:bold;",
  };
}

class VideoNodeDetailsManager {
  getVideoId(element: Element): string | null {
    console.info("getVideoIdFromElement", element);
    // "ytd-rich-item-renderer" -> Start page (this is a container, not the actual video element. This is also used in the sidebar, but encapsulates all videos there)
    const thumbnailElement = match (element)
    .with({ localName: "ytd-rich-item-renderer" }, (el) => el.querySelector("ytm-shorts-lockup-view-model-v2") !== null, () => {
      console.warn("found shorts layout element");
      return null;
    })
    .with({ localName: "ytd-rich-item-renderer" }, (el) => el.querySelector("#content>yt-lockup-view-model>.ytLockupViewModelHost>a") !== null, (el) => {
      console.info("found start page element");
      return el.querySelector("#content>yt-lockup-view-model>.ytLockupViewModelHost>a");
    })
    .with({ localName: "yt-lockup-view-model" }, (el) => {
      console.info("found something (old) 2" );
      return el.querySelector(".ytLockupViewModelContentImage");;
    })
    .with({ localName: "a", className: "ytp-modern-videowall-still ytp-suggestion-set" }, (el) => {
      console.info("found videowall element" );
      return el;
    })
    .otherwise(() => {
      console.warn("no match case for element defined");
      return null;
    });

    if (thumbnailElement == null) {
      console.warn("did not find thumbnail element");
      return null;
    }

    console.info("thumbnailElement", thumbnailElement);

    const videoID = thumbnailElement.getAttribute("href")
      ?.replace("https://www.youtube.com", "")
      .replace("/watch?v=", "")
      .split("&t=")[0]
      .split("&pp=")[0];

    if (videoID == null || videoID.length === 0) {
      console.warn("did not find thumbnail link");
      return null;
    }

    if (videoID.includes("&list=")) {
      console.info("found playlist link, ignoring");
      return null;
    }

    console.info("VideoId:", videoID);
    return videoID;
  }

  normalizeTitle(infoElement: JQuery<HTMLElement>) {
    const ariaLabel = infoElement.attr("aria-label");
    if (ariaLabel != null) {
      infoElement.attr("title", ariaLabel.replace("Minuten,", "Minuten"));
    }
  }

  applyBaseStyle(currentElement: HTMLElement) {
    currentElement.style.borderRadius = "15px";
    currentElement.style.border = "1px solid #ddd";
    currentElement.style.padding = "5px";
  }

  /** Applies a dashed-outline loading indicator while server data is being fetched. */
  applyLoadingStyle(el: HTMLElement) {
    el.style.outline = "2px dashed #90caf9";
    el.style.outlineOffset = "2px";
    el.style.transition = "outline 0.2s ease";
  }

  /** Removes the loading indicator applied by `applyLoadingStyle`. */
  removeLoadingStyle(el: HTMLElement) {
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.transition = "";
  }

  markScanned(currentElement: HTMLElement, ToggleState: boolean) {
    if (ToggleState === true) {
      $(currentElement).css("background-color", "rgb(151, 255, 139)");
    }
  }

  markWatched(currentElement: HTMLElement, ToggleState: boolean) {
    if (ToggleState === true) {
      $(currentElement).css("background-color", "rgb(166, 235, 158)");
    }
  }

  resetState(currentElement: HTMLElement) {
    $(currentElement).css("background-color", "");
    currentElement.style.display = "";
  }

  setHidden(currentElement: HTMLElement) {
    currentElement.style.display = "none";
  }

  setUninteresting(currentElement: HTMLElement) {
    $(currentElement).css("background-color", "rgb(255, 175, 175)");
  }

  removeOrHideNotWanted(currentElement: HTMLElement) {
    if (TabNoc.Settings.DeleteNotWantedVideos === true) {
      $(currentElement).remove();
    } else {
      this.setHidden(currentElement);
    }
  }
}

let nodeManager: NodeManager | null = null;
const videoNodeDetailsManager = new VideoNodeDetailsManager();

function getNodeManager(): NodeManager {
  if (nodeManager != null) return nodeManager;

  nodeManager = new NodeManager(
    "ytd-ad-slot-renderer, ytd-rich-grid-slim-media, .ytd-rich-shelf-renderer",
  )
    .registerSelector("channelPageSelector", "ytd-rich-item-renderer")
    .registerSelector("sidebarSelector", "yt-lockup-view-model.ytd-item-section-renderer")
    .registerSelector("videoFinishedSelector", "a.ytp-modern-videowall-still")
    .registerSelector("searchPageSelector", "ytd-video-renderer")

    // ── Step 0: Extractor ─────────────────────────────────────────────────────
    // Configuration and node-type extraction live here.
    .registerPipelineStep("Extract node info", (nodeCtx) => {
      const el = nodeCtx.element;
      nodeCtx.nodeType = "unknown";

      if (el.querySelector("ytm-shorts-lockup-view-model-v2") !== null) {
        nodeCtx.nodeType = "short";
        nodeCtx.state = "filtered";
        console.log("Detected short — marking as filtered.");
        return "skipped";
      }

      if (el.localName === "a") {
        nodeCtx.nodeType = "videowall";
        console.log("Detected videowall link.");
      }

      if (
        el.localName === "ytd-rich-item-renderer" ||
        el.localName === "yt-lockup-view-model" ||
        el.localName === "ytd-video-renderer"
      ) {
        nodeCtx.nodeType = "video";
      }

      nodeCtx.videoID = videoNodeDetailsManager.getVideoId(el);
      if (nodeCtx.videoID == null) {
        throw new Error("Could not extract a videoID from element.");
      } else {
        console.log("Extracted videoID:", nodeCtx.videoID);
      }
    })

    // ── Step 1: Apply base style ──────────────────────────────────────────────
    // Applies border/padding and a dashed loading indicator (blue outline).
    // The loading indicator is removed in "Apply formatting" once data is ready.
    .registerPipelineStep("Apply base style", (nodeCtx) => {
      if (nodeCtx.state === "filtered") return "skipped";
      if (!(nodeCtx.element instanceof HTMLElement)) {
        throw new Error("Element is not an HTMLElement — cannot apply styles.");
      }
      videoNodeDetailsManager.applyBaseStyle(nodeCtx.element);
      videoNodeDetailsManager.applyLoadingStyle(nodeCtx.element);
      console.log("Base style + loading indicator applied.");
    })

    // ── Step 2: Fetch server data ─────────────────────────────────────────────
    // Async. Updates nodeCtx.state based on server response.
    .registerPipelineStep("Fetch server data", async (nodeCtx) => {
      if (nodeCtx.state === "filtered") return "skipped";
      if (nodeCtx.videoID == null) {
        console.log("No videoID — nothing to fetch.");
        return "skipped";
      }

      const scanned = await GetVideoScanned(nodeCtx.videoID);
      if (scanned) {
        nodeCtx.state = "scanned";
        console.log("→ scanned");
        return;
      }

      const watched = await GetVideoWatched(nodeCtx.videoID);
      if (watched) {
        nodeCtx.state = "watched";
        console.log("→ watched");
      } else {
        console.log("→ new (not yet watched)");
      }
    })

    // ── Step 3: Apply formatting ──────────────────────────────────────────────
    // Removes the loading indicator and applies final colors based on state.
    .registerPipelineStep("Apply formatting", (nodeCtx, runCtx) => {
      if (nodeCtx.state === "filtered") return "skipped";
      if (!(nodeCtx.element instanceof HTMLElement)) {
        throw new Error("Element is not an HTMLElement — cannot apply styles.");
      };
      const el = nodeCtx.element;

      // Remove the loading indicator now that data is available
      videoNodeDetailsManager.removeLoadingStyle(el);

      const infoElement = $(el).find(".yt-lockup-metadata-view-model__title");
      videoNodeDetailsManager.normalizeTitle(infoElement);

      switch (nodeCtx.state) {
        case "scanned":
          videoNodeDetailsManager.markScanned(el, runCtx.ToggleState);
          if (TabNoc.Settings.HideAlreadyWatchedVideos) {
            videoNodeDetailsManager.setHidden(el);
            console.log("Hidden (HideAlreadyWatched).");
          }
          break;

        case "watched":
          videoNodeDetailsManager.markWatched(el, runCtx.ToggleState);
          if (TabNoc.Settings.HideAlreadyWatchedVideos) {
            videoNodeDetailsManager.setHidden(el);
            console.log("Hidden (HideAlreadyWatched).");
          }
          break;

        default: {
          // "new" — reset any previous coloring, then check title keyword lists
          videoNodeDetailsManager.resetState(el);

          const title = infoElement[0]?.textContent ?? "";
          let matched = false;

          for (const keyword of TabNoc.Settings.UninterestingVideos) {
            if (title.includes(keyword)) {
              videoNodeDetailsManager.setUninteresting(el);
              console.log("Marked uninteresting — matched keyword:", keyword);
              matched = true;
              break;
            }
          }

          if (!matched) {
            for (const keyword of TabNoc.Settings.NotWantedVideos) {
              if (title.includes(keyword)) {
                videoNodeDetailsManager.removeOrHideNotWanted(el);
                console.log("Removed/hidden (not wanted) — matched keyword:", keyword);
                break;
              }
            }
          }
        }
      }
    });

  return nodeManager;
}

async function startCheckElements(ToggleState:boolean, force?: boolean) {
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

    await getNodeManager().run({ ToggleState }, force === true);

    CheckWatchingVideo();

    var time = new Date().getTime() - start;
    if (time > 5) {
      console.log("startCheckElements() Execution time: " + time);
    }
  }
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

async function WatchingVideo() {
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
    TabNoc.Variables.VideoStatisticsObject = JSON.stringify(await PushVideoObject(JSON.parse(TabNoc.Variables.VideoStatisticsObject)));

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

async function SaveVideoStatistics() {
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

    TabNoc.Variables.VideoStatisticsObject = JSON.stringify(await PushVideoObject(JSON.parse(JSON.stringify(VideoStatisticsObject))));

    if (TabNoc.Settings.Debug === true) {
      console.groupEnd();
    }
  } catch (exc) {
    console.error(exc);
    alert(exc);
  }
}
// ### https://www.youtube.com/watch?v=* ###

async function GetVideoScanned(VideoID:string):Promise<boolean> {
  return false; //TODO: implement scanned state in database and return it here
}

async function GetVideoWatched(VideoID:string):Promise<boolean> {
  return apiAdapter.getService().getVideo(VideoID).then((response) => {
    return match (response)
      .with({ ok: true }, () => {
        return true
      })
      .with({ ok: false, status: 404 }, () => {
        return false;
      })
      .with({ ok: false }, (res) => {
        throw new Error("Error fetching video data: " + res.error);
      })
      .exhaustive();
  }).catch((exc) => {
    console.error(exc);
    alert(exc);
    throw exc;
  });
}

async function PushVideoObject(videoObject: VideoObject) : Promise<VideoObject> {
  if (TabNoc.Settings.Debug === true) {
    console.log("Pushing ...", JSON.parse(JSON.stringify(videoObject)));
  }
  if (typeof videoObject !== "object") {
    throw "WrongTypeException:Only Objects can be Pushed into the Database.";
  }
  return apiAdapter.getService().getVideo(videoObject.VideoID).then((response) => {
    return match (response)
      .with({ ok: true }, (res) => {
        const merged = MergeVideoObjects(
          res.body,
          videoObject,
        )
        apiAdapter.getService().createOrUpdateVideo(merged).then((response) => {
          return match (response)
            .with({ ok: true }, () => {
              console.info("Video data successfully updated for videoID:", videoObject.VideoID);
            })
            .with({ ok: false }, (res) => {
              throw new Error("Error fetching video data: " + res.error);
            })
            .exhaustive();
        }).catch((exc) => {
          console.error(exc);
          alert(exc);
          throw exc;
        });
        return merged;
      })
      .with({ ok: false, status: 404 }, () => {
        apiAdapter.getService().createOrUpdateVideo(videoObject).then((response) => {
          return match (response)
            .with({ ok: true }, () => {
              console.info("Video data successfully added for videoID:", videoObject.VideoID);
            })
            .with({ ok: false }, (res) => {
              throw new Error("Error fetching video data: " + res.error);
            })
            .exhaustive();
        }).catch((exc) => {
          console.error(exc);
          alert(exc);
          throw exc;
        });
        return videoObject;
      })
      .with({ ok: false }, (res) => {
        throw new Error("Error fetching video data: " + res.error);
      })
      .exhaustive();
  }).catch((exc) => {
    console.error(exc);
    alert(exc);
    throw exc;
  });
}

function MergeVideoObjects(videoObject_1: VideoObject, videoObject_2: VideoObject) : VideoObject | null {
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