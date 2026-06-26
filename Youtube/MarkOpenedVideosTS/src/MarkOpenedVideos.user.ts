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
// @include     http*://www.youtube.com/shorts/*
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

    CurrentVideoID: null as string | null,

    checkElementsInterval: null as number | null,
    checkWatchingVideoInterval: null as number | null,
    lastCheckItemCount: 0,

    HasInstalledWatchingVideo: false,

    EndTime: 0,
  },

  Settings: {
    SavingEnabled: true,
    TimerInterval: 5000,
    WatchTimerInterval: 750,
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
      element.children[0].style.backgroundColor = type == "notify"
        ? "#00A550"
        : type == "warning"
          ? "#d0a100"
          : "#C41E3A";
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

type FeedbackMessageType = "notify" | "warning" | "error";

const activeFeedbackState: {
  timeoutId: number | null;
  onVisibilityChange: (() => void) | null;
  onWindowFocus: (() => void) | null;
  onWindowBlur: (() => void) | null;
} = {
  timeoutId: null,
  onVisibilityChange: null,
  onWindowFocus: null,
  onWindowBlur: null,
};

function clearActiveFeedbackTracking(hideMessage: boolean) {
  if (activeFeedbackState.timeoutId != null) {
    clearTimeout(activeFeedbackState.timeoutId);
    activeFeedbackState.timeoutId = null;
  }

  if (activeFeedbackState.onVisibilityChange != null) {
    document.removeEventListener("visibilitychange", activeFeedbackState.onVisibilityChange);
    activeFeedbackState.onVisibilityChange = null;
  }

  if (activeFeedbackState.onWindowFocus != null) {
    window.removeEventListener("focus", activeFeedbackState.onWindowFocus);
    activeFeedbackState.onWindowFocus = null;
  }

  if (activeFeedbackState.onWindowBlur != null) {
    window.removeEventListener("blur", activeFeedbackState.onWindowBlur);
    activeFeedbackState.onWindowBlur = null;
  }

  if (hideMessage && Feedback != null) {
    Feedback.hideMessage();
  }
}

function showNotificationUntilActiveFor(
  message: string,
  type: FeedbackMessageType,
  requiredActiveMs: number = 15000,
) {
  if (Feedback == null) {
    return;
  }

  clearActiveFeedbackTracking(false);
  Feedback.showMessage(message, type, null, () => {});

  const scheduleActiveTimeout = () => {
    if (activeFeedbackState.timeoutId != null) {
      clearTimeout(activeFeedbackState.timeoutId);
      activeFeedbackState.timeoutId = null;
    }

    if (document.hidden === false && document.hasFocus()) {
      activeFeedbackState.timeoutId = window.setTimeout(() => {
        clearActiveFeedbackTracking(true);
      }, requiredActiveMs);
    }
  };

  activeFeedbackState.onVisibilityChange = scheduleActiveTimeout;
  activeFeedbackState.onWindowFocus = scheduleActiveTimeout;
  activeFeedbackState.onWindowBlur = scheduleActiveTimeout;

  document.addEventListener("visibilitychange", scheduleActiveTimeout);
  window.addEventListener("focus", scheduleActiveTimeout);
  window.addEventListener("blur", scheduleActiveTimeout);

  scheduleActiveTimeout();
}

function isCurrentPageShort(): boolean {
  const pathName = unsafeWindow.location?.pathname ?? "";
  return pathName.startsWith("/shorts/");
}

function getActiveMoviePlayer() {
  return isCurrentPageShort() ? unsafeWindow.document.getElementById("shorts-player") : unsafeWindow.document.getElementById("movie_player");
}

import { ApiAdapter } from "./api/ApiAdapter";
import { GM_info, GM_registerMenuCommand, unsafeWindow } from "$";
import { VideoStatsManager } from "./video-stats/VideoStatsManager";
import { match } from "ts-pattern";

var apiAdapter = new ApiAdapter();
const videoStatsManager = new VideoStatsManager(apiAdapter);

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
    TabNoc.Variables.checkWatchingVideoInterval = setInterval(
      returnExec(function () {
        CheckWatchingVideo();
      }),
      TabNoc.Settings.WatchTimerInterval,
    );
    CheckWatchingVideo();
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
    const candidateLinks = match (element)
      .with({ localName: "a", className: "ytp-modern-videowall-still ytp-suggestion-set" }, (el) => [el])
      .otherwise((el) => {
        return [
          el.querySelector("#content>yt-lockup-view-model>.ytLockupViewModelHost>a"),
          el.querySelector(".ytLockupViewModelContentImage"),
          el.querySelector("a#thumbnail"),
          el.querySelector("a.yt-simple-endpoint[href*='/watch?v=']"),
          el.querySelector("a.yt-simple-endpoint[href*='/shorts/']"),
          el.querySelector("a[href*='/watch?v=']"),
          el.querySelector("a[href*='/shorts/']"),
        ];
      });

    const thumbnailElement = candidateLinks.find((candidate) => candidate != null) as Element | undefined;
    const href = thumbnailElement?.getAttribute("href") ?? "";

    if (href.length === 0) {
      console.warn("did not find thumbnail link");
      return null;
    }

    let videoID: string | undefined;

    if (href.includes("/shorts/")) {
      videoID = href
        .replace("https://www.youtube.com", "")
        .split("/shorts/")[1]
        ?.split("?")[0]
        ?.split("/")[0];
    } else {
      videoID = href
        .replace("https://www.youtube.com", "")
        .replace("/watch?v=", "")
        .split("&t=")[0]
        .split("&pp=")[0]
        .split("&")[0];
    }

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
    "ytd-ad-slot-renderer, .ytd-rich-shelf-renderer",
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

      if (
        el.querySelector("ytm-shorts-lockup-view-model-v2") !== null ||
        el.querySelector("a[href*='/shorts/']") !== null
      ) {
        nodeCtx.nodeType = "short";
        console.log("Detected short.");
      }

      if (el.localName === "a") {
        nodeCtx.nodeType = "videowall";
        console.log("Detected videowall link.");
      }

      if (nodeCtx.nodeType === "unknown" && (
        el.localName === "ytd-rich-item-renderer" ||
        el.localName === "yt-lockup-view-model" ||
        el.localName === "ytd-video-renderer"
      )) {
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
  var movie_player = getActiveMoviePlayer();
  var moviePlayerExistsWithVideo =
    movie_player != null &&
    movie_player.getVideoData != undefined &&
    movie_player.getVideoData().video_id != undefined &&
    movie_player.getVideoData().title != "" &&
    (movie_player.getVideoData().video_quality != undefined || isCurrentPageShort());

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
    videoStatsManager.stopSession().catch((exc) => {
      console.error(exc);
      alert(exc);
    });

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
      videoStatsManager.getCurrentState(),
    );
  }
  if (videoStatsManager.hasActiveSession()) {
    alert("Video stats session is already active");
    throw new Error("Video stats session is already active");
  }
  try {
    // TODO: use addEventListener
    document.body.onbeforeunload = function () {
      videoStatsManager.stopSession().catch((exc) => {
        console.error(exc);
        alert(exc);
      });
    };

    const activePlayer = getActiveMoviePlayer();
    if (activePlayer == null) {
      throw new Error("No active player found");
    }

    const videoData = activePlayer.getVideoData();

    const existingStatusPromise = videoStatsManager.getVideoOpenStatus(videoData.video_id);

    await videoStatsManager.beginSession({
      videoId: videoData.video_id,
      videoTitle: videoData.title,
      videoAuthor: videoData.author,
      isShort: isCurrentPageShort(),
      videoLength: Math.floor(activePlayer.getDuration()),
    });

    if (TabNoc.Settings.Debug === true) {
      console.log(
        "WatchingVideo()->new:",
        videoStatsManager.getCurrentState(),
      );
    }

    const existingStatus = await existingStatusPromise;

    if (TabNoc.Settings.ShowAlreadyWatchedDialog === true) {
      if (existingStatus.Exists) {
        setTimeout(function () {
          alert("watched");
          Feedback.showMessage("Watched!", "error", 60000);
        }, 10);
        console.log("Video already watched!");
      }
    }

    const currentVideoTitle = videoStatsManager.getCurrentState()?.VideoTitle ?? videoData.title;

    if (existingStatus.Exists) {
      if (existingStatus.HasHighWatchtime) {
        showNotificationUntilActiveFor(
          "Bereits geoeffnet (>50% gesehen): " + currentVideoTitle,
          "error",
        );
      } else {
        showNotificationUntilActiveFor(
          "Bereits geoeffnet (<50% gesehen): " + currentVideoTitle,
          "warning",
        );
      }
    } else {
      showNotificationUntilActiveFor(
        "Aktuelles Video: " + currentVideoTitle,
        "notify",
      );
    }

    console.info(
      "Aktuelles Video: " +
      currentVideoTitle +
      " ID: " +
      (videoStatsManager.getCurrentState()?.VideoID ?? videoData.video_id),
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
    videoStatsManager.handleTick(
      {
        playerState: Number(movie_player.getPlayerState()),
        currentTimeSeconds: Number(movie_player.getCurrentTime?.()) || 0,
        playbackRate: Math.max(0.1, Number(movie_player.getPlaybackRate?.()) || 1),
      },
      new Date().getTime(),
    );

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

// ### https://www.youtube.com/watch?v=* ###

async function GetVideoScanned(_VideoID:string):Promise<boolean> {
  return false; //TODO: implement scanned state in database and return it here
}

async function GetVideoWatched(VideoID:string):Promise<boolean> {
  return videoStatsManager.getVideoOpenStatus(VideoID).then((response) => {
    return response.Exists;
  });
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
