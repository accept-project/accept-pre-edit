////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
//  ACCEPT PROJECT - http://www.accept.unige.ch/index.html or http://cordis.europa.eu/fp7/ict/language-technologies/project-accept_en.html    //
//  Pre-Editing Real Time Plug-in (version 1.0 - beta)                                                                                       //
//  David Silva - davidluzsilva@gmail.com                                                                                                     //                        
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////                                                                                                                                            

(function ($) {

    //accept plug-in core.
    $.fn.AcceptRealTime = function (options) {

        //core variables.
        var $acceptGlobalContainer = $(this);
        var $acceptContainer = null;
        var configuration = null;
        var globalSessionId = null;
        var preEditHub = null;
        var $realtimeCheck = null;
        var jobsPool = [];
        var jobsSemaphore = false;
        var jobsFinishCount = 0;
        var currentJobIndex = 0;

        var mainContextMenuId = "globalRealTimeMenu_";
        var acceptTextContext = "";
        var acceptGenericResponses = [];
        var acceptNonSuggestionGenericResponses = [];

        var checkGrammar = "1";
        var checkSpelling = "1";
        var checkStyle = "1";

        var $iframe = null;
        var wordsLearntPool = [];
        var rulesLearntPool = [];
        var autoHideToolTip = true;
        var $toolbarUserInfoPlaceholder = null;

        //naming each localstorage (or cookie) repository(one repository per language). 
        var labelLocalStorageRules = "rulesLearntPool_en";
        var labelLocalStorageWords = "wordsLearntPool_en";

        //these will tag user related actions when interacting with the plug-in.
        var labelActionIgnoreRule = "ignore_rule";
        var labelActionRemoveIgnoreRule = "remove_ignore_rule";
        var labelActionLearnWord = "learn_word";
        var labelActionRemoveLearntWord = "remove_learn_word";
        var labelActionAcceptSuggestion = "accept_suggestion";
        var labelActionDisplayTooltip = "display_tooltip";
        var labelActionDisplayContextMenu = "display_contextmenu";

        //commented due to post edit implementation.
        //external variables.
        $.ifrx = 0;
        $.ifry = 0;

        //this is obsolete - since we are only using green or red to underline contexts, we no longer need arrays of styles.
        var cssStyles = ['accept-highlight-tooltip', 'accept-highlight-tooltip', 'accept-highlight-tooltip'];
        var cssUnderlineStyles = ['accept-highlight-tooltip', 'accept-highlight-tooltip', 'accept-highlight-tooltip'];

        //external methods:

        //updates the global variables x,y with the editor iframe offSet.
        $.refreshIframePosition = function () {
           
            if (settings.iframePlaceholder != null) $iframe = settings.iframePlaceholder;

            if ($iframe != null) {
                $.ifrx = 0;
                $.ifry = 0;
                $.ifrx = $iframe.offset().left - $iframe.contents().find('body').scrollLeft();
                $.ifry = $iframe.offset().top - $iframe.contents().find('body').scrollTop();
                $.ifry -= $(window).scrollTop();
                $.ifrx -= $(window).scrollLeft();
            }

        }


        //finds total offSet of a DOM element.
        $.findTotalOffset = function (obj) {
            var ol = ot = 0;
            if (obj.offsetParent) {
                do {
                    ol += obj.offsetLeft;
                    ot += obj.offsetTop;
                } while (obj = obj.offsetParent);
            }
            return { left: ol, top: ot };
        }

        //clears data for a given container.
        $.clearContainerData = function ($container) {
            cleanHighlightedNodes($container, true, true);
        }


        //stops current jobs worker and optionally cleans the highlighted nodes.
        $.clearPreEditRealtimeCheckData = function (cleanCurrent) {

            hideFlags();          
            $acceptContainer = null;
            jobsPool = [];
            jobsSemaphore = false;
            jobsFinishCount = 0;
            currentJobIndex = 0;

            $(document).find('.accepttooltip').remove();
            $(document).find('.acm-default').remove();
          
            if (cleanCurrent)
                cleanHighlightedNodesGlobal(true, true);
        };

        //external method sets the current rule set.
        $.updateRuleSet = function (ruleSetName) {
            settings.processingRuleSet = ruleSetName;
        };

        //external method sets replace all button visible/hidden.
        $.updateShowFixAll = function (showFixAll) {
            settings.showFixAll = showFixAll;
        };

        //renders a set of results.
        $.updateAndRenderStandaloneResult = function (segmentIndex, $additionalContainer) {

            for (var aindex = 0; aindex < jobsPool.length; aindex++)
                if (jobsPool[aindex].index == segmentIndex) {

                    //if user passes an exceptional/ponctual conatainer then we will render the container there.
                    if ($additionalContainer != undefined)
                        jobsPool[segmentIndex].container = $additionalContainer;
                    else
                        jobsPool[segmentIndex].container = jobsPool[segmentIndex].defaultContainer;

                    //if ($.trim(jobsPool[segmentIndex].lastContent) === $.trim(jobsPool[segmentIndex].container.text())) {                       
                    //$.renderStandaloneResult(segmentIndex, jobsPool[segmentIndex].container);
                    //} else {
                    //jobsPool[segmentIndex].lastContent = jobsPool[segmentIndex].container.text();

                    //we want to process this guy again.
                    jobsPool[segmentIndex].status = 0;
                    //clean all pre-existing markup.
                    cleanHighlightedNodes(jobsPool[segmentIndex].container);
                    //currentJobIndex = segmentIndex;
                    //update the global worker container with the given segment container.
                    //$acceptContainer = jobsPool[segmentIndex].container;
                    $('#htmlPlaceHolderRealTimeDiv_').html(jobsPool[segmentIndex].container.html());//$acceptContainer.html()
                    prepareHtmlContent(jobsPool[segmentIndex].container, true);
                    acceptTextContext = getTextForHtml(jobsPool[segmentIndex].container);
                    iniJobsPoolWorker(1, false);
                    doAcceptSingleRequest(new Array(acceptTextContext), false, segmentIndex);
                    //}

                }
        }

        //runs a stand alone check for a given element.
        $.renderStandaloneResult = function (segmentIndex, $additionalContainer) {
            for (var aindex = 0; aindex < jobsPool.length; aindex++)
                if (jobsPool[aindex].index == segmentIndex) {

                    //$(jobsPool[segmentIndex].container).clone().appendTo($additionalContainer);
                    cleanHighlightedNodes(jobsPool[segmentIndex].container);

                    currentJobIndex = aindex;
                    //if user passes an exceptional/ponctual conatainer then we will render the container there.
                    if ($additionalContainer != undefined)
                        jobsPool[segmentIndex].container = $additionalContainer;
                    else
                        jobsPool[segmentIndex].container = jobsPool[segmentIndex].defaultContainer;

                    jobsSemaphore = true;
                    //currentJobIndex = segmentIndex;
                    $acceptContainer = jobsPool[segmentIndex].container;
                    handleResponse(jobsPool[segmentIndex].responseObject, "ACCEPT");

                }
        }

        //allows to check if a given conatainer as any flags.
        $.checkIfContainerIsFlagged = function ($container) {

            if ($container.find('span[class^="accept-highlight"]').length > 0)
                return true;

        }

        //returns a copy of the last check.
        $.getLastResultSet = function () {

            return jobsPool;
        }

        //removes all plug-in data from a given element.
        $.clearPreEditRealtimeCheckDataFromNode = function (node, removeControlParagraphs) {
            var $nodeToClean = node;

            $nodeToClean.find('span[id^="spncontext"]').each(function () {
                removeKeepChildren($(this));
            });


            $nodeToClean.find('span[id^="spnToolTip"]').each(function () {
                removeKeepChildren($(this));
            });

            if (removeControlParagraphs) {
                $nodeToClean.find('.accept-container-paragraph').filter(function () {
                    return $.trim($(this).text()) === ''
                }).replaceWith('<br>');

                $nodeToClean.find('.accept-container-paragraph').removeClass();
            }

            if (removeBreakLineControlNodes) {
                $nodeToClean.find('.accept-container-line-separator').filter(function () {
                    return $.trim($(this).text()) === ''
                })
                .remove();
                $nodeToClean.find('.accept-container-line-separator').removeClass();
            }
        }


        //clean all plug-in data.
        function cleanPluginData() {
            $("#" + mainContextMenuId).remove();

        }

        //plug-in default settings.
        var settings = $.extend({
            'apiKey': '',
            'processingRuleSet': '',
            'contentLanguage': 'en',
            'timeoutWaitingTime': 7000,
            'uiLanguage': 'en',
            'requestFormat': 'HTML',
            'htmlBlockElements': 'p ,h1 ,h2 ,h3 ,h4 ,h5 ,h6 ,ol ,ul, li ,pre ,address ,blockquote ,dl ,div ,fieldset ,form ,hr ,noscript ,table, br',
            'getSessionUser': function () { return ""; },
            'configurationFilesPath': '',
            'acceptHubUrl': '',
            'realTimeCheckSelector': '',
            'onReplace': function (e, context, option) { },
            'onBeforeDisplayingContextMenus': function (e, context, option) { },
            'onBeforeDisplayingTooltips': function () { },
            'onBeforeCheck': function () { },
            'onAfterCheck': function () { },
            'iframePlaceholder': null,
            'dontDisplayAttributeName': 'data-accept-not-display'
        }, options);

        //plug-in core internal objects:
        function Job(container, index, status, responseObj, sessionCodeId, globalSessionId) {
            this.container = container;
            this.defaultContainer = container;
            this.index = index;
            this.status = status;
            this.responseObject = responseObj;
            this.sessionCodeId = sessionCodeId;
            this.globalSessionId = globalSessionId;
            this.flagsReturned = undefined;
            this.lastContent = "";
        }

        //accept core Object
        function Response(context, type, suggestions, startpos, endpos, description, rule, contextpieces, uniqueId) {
            this.context = context;
            this.type = type;
            this.suggestions = suggestions;
            this.startpos = startpos;
            this.endpos = endpos;
            this.description = description;
            this.rule = rule;
            this.contextpieces = contextpieces;
            this.uniqueId = uniqueId;
            this.GetSuggestions = function () { return this.suggestions; }
            this.ComputePosAverage = function () { return (this.endpos - this.startpos); }
            this.GetStartPosition = function () { return this.startpos; }
            this.GetEndPosition = function () { return this.endpos; }
            this.GetRuleName = function () { return this.rule; }
            this.GetContext = function () {
                if (this.context.length > 0)
                    return this.context;
                else {
                    var allcontext = "";
                    for (i = 0; i < contextpieces.length; i++)
                        allcontext = allcontext + " " + contextpieces[i].piece.toString();
                    return allcontext;
                }
            }
        }

        //learn word object.
        function WordLearn(context, isActive, jsonRaw, ruleId) {
            this.context = context;
            this.isActive = isActive;
            this.jsonRaw = jsonRaw;
            this.hash = context.hashCode().toString();
            this.ruleId = ruleId;
        }

        //learn rule object.
        function RuleLearn(ruleId, ruleName, isIgnored, jsonRaw) {
            this.ruleId = ruleId
            this.ruleName = ruleName;
            this.isIgnored = isIgnored;
            this.jsonRaw = jsonRaw;
        }

        //core logging object.
        function AuditFlag(flag, action, actionValue, context, ignored, name, textBefore, textAfter, timeStamp, rawJson, privateId, globalSessionId) {
            this.flag = flag;
            this.action = action;
            this.actionValue = actionValue;
            this.context = context;
            this.ignored = ignored;
            this.name = name;
            this.textBefore = textBefore;
            this.textAfter = textAfter;
            this.timeStamp = timeStamp;
            this.rawJson = rawJson;
            this.privateId = privateId;
            this.globalSessionId = globalSessionId;
        }

        //plug-in internal methods:

        //finds and cleans set of suggestions(LI elements) that match a given criteria. 
        function cleanRemainingSuggestionsInContextMenu(startIndex, endIndex, usedFlagContextMenuSelector, ruleType) {

            switch (ruleType) {
                case "GRAMMAR":
                    {
                        $(usedFlagContextMenuSelector).find('li[id$="_' + startIndex + '_' + endIndex + '_gr"]').remove();

                    } break;
                case "SPELLING":
                    {
                        $(usedFlagContextMenuSelector).find('li[id$="_' + startIndex + '_' + endIndex + '_sp"]').remove();

                    } break;
            }
        }

        //creates and sends a core logging object.
        function sendAuditFlag(startIndex, endIndex, usedflag, usedFlagContextMenuSelector, textBefore, textAfter, jsonRaw, pid, flagsObject, globalSessionId) {

            for (var i = 0; i < flagsObject.length; i++)
                if (flagsObject[i].GetStartPosition() == startIndex && flagsObject[i].GetEndPosition() == endIndex) {
                    var newAuditFlag = new AuditFlag();
                    newAuditFlag.flag = flagsObject[i].GetContext();
                    newAuditFlag.action = labelActionAcceptSuggestion;
                    newAuditFlag.actionValue = usedflag;
                    newAuditFlag.ignored = "";
                    $(usedFlagContextMenuSelector).find('li:not([id^=lrn_])').each(function () {
                        if ($(this).text() != usedflag && $(this).text() != configuration.language.learnDialogLabel)
                            newAuditFlag.ignored.length > 0 ? newAuditFlag.ignored = newAuditFlag.ignored + ";" + $(this).text() : newAuditFlag.ignored = newAuditFlag.ignored + $(this).text();
                    });
                    newAuditFlag.name = flagsObject[i].uniqueId;
                    newAuditFlag.context = "";
                    newAuditFlag.textBefore = textBefore;
                    newAuditFlag.textAfter = textAfter;
                    newAuditFlag.timeStamp = new Date();
                    newAuditFlag.rawJson = jsonRaw;
                    newAuditFlag.privateId = pid;
                    newAuditFlag.globalSessionId = globalSessionId;
                    submitFlagAudit(newAuditFlag);
                    cleanRemainingSuggestionsInContextMenu(startIndex, endIndex, usedFlagContextMenuSelector, flagsObject[i].type);
                }
        }

        //creates and sends a core logging object.
        function sendAuditFlagGeneric(flag, action, actionValue, ignored, name, context, textBefore, textAfter, jsonRaw, pid, globalSessionId) {
            var newAuditFlag = new AuditFlag();
            newAuditFlag.flag = flag;
            newAuditFlag.action = action;
            newAuditFlag.actionValue = actionValue;
            newAuditFlag.ignored = ignored;
            newAuditFlag.name = name;
            newAuditFlag.context = context;
            newAuditFlag.textBefore = textBefore;
            newAuditFlag.textAfter = textAfter;
            newAuditFlag.rawJson = jsonRaw;
            newAuditFlag.timeStamp = new Date();
            newAuditFlag.privateId = pid;
            newAuditFlag.globalSessionId = globalSessionId;
            submitFlagAudit(newAuditFlag);
        }

        //expects a collection of annotations to display within tooltips, then the tooltips are created along with the display event is bound to the matching context. 
        function buildStyleRules(styleResponses, sessionCodeId) {
            //$acceptContainer.find('div[class^="accepttooltip"]').remove(); //$('div[class^="accepttooltip"]').remove();
            //$('ul[id^="' + 'toolTip_spnToolTip' + sessionCodeId + '"]').remove(); ???
            $('div[class^="accepttooltip"]').remove();

            var rulesWithNotFollowedSuggestions = [];

            //code for not followed suggestions.
            for (var i = 0; i < styleResponses.length; i++) {
                if (styleResponses[i].context.length == 0) {
                    rulesWithNotFollowedSuggestions.push(styleResponses[i]);
                    styleResponses.splice(i, 1);
                    i = (i == 0) ? -1 : 0;
                }
            }
            var TooltTipMaxCounterHelper = rulesWithNotFollowedSuggestions.length;
            var TooltTipCurrentCounterHelper = -1;
            while (rulesWithNotFollowedSuggestions.length > 0) {
                var currentResponse = rulesWithNotFollowedSuggestions.shift();
                var currentResponseContextCollection = []
                for (var i = 0; i < rulesWithNotFollowedSuggestions.length; i++) {
                    if ((parseInt(rulesWithNotFollowedSuggestions[i].startpos) >= parseInt(currentResponse.startpos)) && (parseInt(rulesWithNotFollowedSuggestions[i].endpos) <= parseInt(currentResponse.endpos))) {
                        currentResponseContextCollection.push(rulesWithNotFollowedSuggestions[i]);
                        rulesWithNotFollowedSuggestions.splice(i, 1);
                        i = (i == 0) ? -1 : 0;
                    }
                }

                currentResponseContextCollection.push(currentResponse);
                var contextCollectionOrdered = currentResponseContextCollection.sort(function (a, b) {
                    var aval = parseInt(a.ComputePosAverage());
                    var bval = parseInt(b.ComputePosAverage());
                    return (bval - aval);
                })

                for (var i = 0; i < contextCollectionOrdered.length; i++) {
                    var startPosLastContextIndex = 0;
                    var endPosLastContextIndex = 0;
                    var firstindex = 0;
                    var firstcontext = "";
                    var lastcontext = "";
                    var ruleDescription = contextCollectionOrdered[i].description; contextCollectionOrdered[i].description = "";
                    ++TooltTipCurrentCounterHelper;
                    if (contextCollectionOrdered[i].contextpieces.length > 0) {

                        firstcontext = contextCollectionOrdered[i].contextpieces[0].piece;
                        firstindex = contextCollectionOrdered[i].contextpieces[0].startpos;
                        startPosLastContextIndex = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].startpos;
                        endPosLastContextIndex = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].startpos;
                        lastcontext = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].piece;
                        var spnId = "spnToolTip" + sessionCodeId + "_" + firstindex.toString() + "_" + endPosLastContextIndex.toString();
                        if (_.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)
                            $acceptContainer.highlightHtmlMultiContextWithToolTip(firstcontext, lastcontext, firstindex, endPosLastContextIndex, "span", "", spnId, ruleDescription, TooltTipCurrentCounterHelper, TooltTipMaxCounterHelper, contextCollectionOrdered[i].rule, contextCollectionOrdered[i].uniqueId, encodeURIComponent(JSON.stringify(contextCollectionOrdered[i])));
                    }
                }
            }

            //code for not followed suggestions.
            TooltTipMaxCounterHelper = styleResponses.length;
            TooltTipCurrentCounterHelper = -1;
            while (styleResponses.length > 0) {

                var currentResponse = styleResponses.shift();
                var currentResponseContextCollection = []

                for (var i = 0; i < styleResponses.length; i++) {
                    if ((parseInt(styleResponses[i].startpos) >= parseInt(currentResponse.startpos)) && (parseInt(styleResponses[i].endpos) <= parseInt(currentResponse.endpos))) {
                        currentResponseContextCollection.push(styleResponses[i]);
                        styleResponses.splice(i, 1);
                        i = (i == 0) ? -1 : 0;
                    }
                }

                currentResponseContextCollection.push(currentResponse);
                var contextCollectionOrdered = currentResponseContextCollection.sort(function (a, b) {

                    var aval = parseInt(a.ComputePosAverage());
                    var bval = parseInt(b.ComputePosAverage());
                    return (bval - aval);
                })

                for (var i = 0; i < contextCollectionOrdered.length; i++) {

                    if (contextCollectionOrdered[i].context.length > 0) {
                        ++TooltTipCurrentCounterHelper;
                        var spnId = "spnToolTip" + sessionCodeId + "_" + contextCollectionOrdered[i].GetStartPosition() + "_" + contextCollectionOrdered[i].GetEndPosition();
                        var ruleDescription = contextCollectionOrdered[i].description; contextCollectionOrdered[i].description = "";
                        if (_.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)
                            $acceptContainer.highlightWithToolTip(contextCollectionOrdered[i].context, parseInt(contextCollectionOrdered[i].startpos), parseInt(contextCollectionOrdered[i].endpos), 'span', spnId, ruleDescription, TooltTipCurrentCounterHelper, TooltTipMaxCounterHelper, contextCollectionOrdered[i].rule, contextCollectionOrdered[i].uniqueId, encodeURIComponent(JSON.stringify(contextCollectionOrdered[i])));
                    }
                }

            }

        }

        //expects a collection of annotations to display within context menus, then the menus are created along with the display event bound to the matching context. 
        function buildRulesWithSuggestions(acceptResponses, sessionCodeId) {
            menuscount = 0;            
            $('ul[id^="' + "acceptmenu" + sessionCodeId + "_" + '"]').remove();

            while (acceptResponses.length > 0) {
                var currentResponse = acceptResponses.shift();
                var currentResponseContextCollection = []

                for (var i = 0; i < acceptResponses.length; i++) {
                    var s1 = parseInt(acceptResponses[i].startpos);
                    var s2 = parseInt(currentResponse.startpos);
                    var e1 = parseInt(acceptResponses[i].endpos);
                    var e2 = parseInt(currentResponse.endpos);
                    if ((s1 >= s2) && (e1 <= e2)) {
                        currentResponseContextCollection.push(acceptResponses[i]);
                        acceptResponses.splice(i, 1);
                        i = (i == 0) ? -1 : 0;
                    }
                }
                currentResponseContextCollection.push(currentResponse);
                var contextCollectionOrdered = currentResponseContextCollection.sort(function (a, b) {

                    var aval = parseInt(a.ComputePosAverage());
                    var bval = parseInt(b.ComputePosAverage());
                    return (bval - aval);
                })


                for (var i = 0; i < contextCollectionOrdered.length; i++) {
                    for (var j = 0; j < contextCollectionOrdered.length; j++) {
                        if (contextCollectionOrdered[i].startpos == contextCollectionOrdered[j].startpos && contextCollectionOrdered[i].endpos == contextCollectionOrdered[j].endpos && i != j) {
                            contextCollectionOrdered[i].suggestions.push.apply(contextCollectionOrdered[i].suggestions, contextCollectionOrdered[j].suggestions);
                            contextCollectionOrdered.splice(j, 1);
                            j = (j == 0) ? -1 : 0;
                            i = (i == 0) ? -1 : 0;
                            break;
                        }
                    }
                }

                for (var i = 0; i < contextCollectionOrdered.length; i++) {
                    var spnid = "spncontext" + sessionCodeId + "_" + contextCollectionOrdered[i].startpos + "_" + contextCollectionOrdered[i].endpos + "_" + menuscount + "_" + i;
                    if (contextCollectionOrdered[i].context.length > 0 && (contextCollectionOrdered[i].suggestions.length > 0)) {
                        if ((_.where(wordsLearntPool, { context: contextCollectionOrdered[i].context.toString() }).length === 0) && (_.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)) {
                            $acceptContainer.highlight(contextCollectionOrdered[i].context, parseInt(contextCollectionOrdered[i].startpos), 'span', 'accept-highlight', spnid);
                        }
                        else {
                            contextCollectionOrdered.splice(i, 1);
                            --i;
                        }

                    }
                    else {
                        var multiContext = "";
                        for (var j = 0; j < contextCollectionOrdered[i].contextpieces.length; j++)
                            multiContext += contextCollectionOrdered[i].contextpieces[j].piece;

                        if (multiContext.length > 0 && _.where(wordsLearntPool, { context: multiContext.toString() }).length === 0 && _.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)
                            $acceptContainer.highlight(multiContext, parseInt(contextCollectionOrdered[i].startpos), 'span', 'accept-highlight', spnid);
                        else {
                            contextCollectionOrdered.splice(i, 1);
                            --i;
                        }

                    }
                }

                if (!$acceptContainer.attr(settings.dontDisplayAttributeName)) {

                    var menuname = "acceptmenu" + sessionCodeId + "_" + menuscount.toString();
                    ++menuscount;
                    $(document.body).append('<ul id="' + menuname + '" class="acm-default" style="z-index: 9999999;display:none;">');
                    for (var j = 0; j < contextCollectionOrdered.length; j++) {
                        if (contextCollectionOrdered[j].suggestions.length == 0) {
                            //TODO
                        }
                        else {
                            contextCollectionOrdered[j].description = "";

                            switch (contextCollectionOrdered[j].type) {
                                case "GRAMMAR":
                                    {
                                        for (var k = 0; k < contextCollectionOrdered[j].suggestions.length; k++)
                                            $('#' + menuname).append('<li style="cursor:pointer;" id="sug_' + j + "_" + k + "_" + contextCollectionOrdered[j].startpos + "_" + contextCollectionOrdered[j].endpos + "_gr" + '" class="icon"><span class="icon grammar" title="' + configuration.language.labelDialogCtxGrammarTooltip + '"><span style="display:none;" class="accept-rule-unique-id"  title="' + contextCollectionOrdered[j].uniqueId + '"></span><span style="display:none;" class="flag-raw-json" title="' + encodeURIComponent(JSON.stringify(contextCollectionOrdered[j])) + '"></span></span>' + (contextCollectionOrdered[j].suggestions[k].length > 0 ? contextCollectionOrdered[j].suggestions[k].toString() : configuration.language.labelEmptySuggestion) + '</li>');
                                    } break;
                                case "SPELLING":
                                    {
                                        for (var k = 0; k < contextCollectionOrdered[j].suggestions.length; k++)
                                            $('#' + menuname).append('<li style="cursor:pointer;" id="sug_' + j + "_" + k + "_" + contextCollectionOrdered[j].startpos + "_" + contextCollectionOrdered[j].endpos + "_sp" + '" class="icon"><span class="icon spelling" title="' + configuration.language.labelDialogCtxSpellingTooltip + '"><span style="display:none;" class="accept-rule-unique-id" title="' + contextCollectionOrdered[j].uniqueId + '"></span><span style="display:none;" class="flag-raw-json" title="' + encodeURIComponent(JSON.stringify(contextCollectionOrdered[j])) + '"></span></span>' + (contextCollectionOrdered[j].suggestions[k].length > 0 ? contextCollectionOrdered[j].suggestions[k].toString() : configuration.language.labelEmptySuggestion) + '</li>');
                                    } break;
                                case "STYLE":
                                    {
                                        for (var k = 0; k < contextCollectionOrdered[j].suggestions.length; k++)
                                            $('#' + menuname).append('<li  style="cursor:pointer;" id="sug_' + j + "_" + k + "_" + contextCollectionOrdered[j].startpos + "_" + contextCollectionOrdered[j].endpos + "_sp" + '" class="icon"><span class="icon style" title="' + configuration.language.labelDialogCtxStyleTooltip + '"><span style="display:none;" class="accept-rule-unique-id" title="' + contextCollectionOrdered[j].uniqueId + '"></span><span style="display:none;" class="flag-raw-json" title="' + encodeURIComponent(JSON.stringify(contextCollectionOrdered[j])) + '"></span></span>' + (contextCollectionOrdered[j].suggestions[k].length > 0 ? contextCollectionOrdered[j].suggestions[k].toString() : configuration.language.labelEmptySuggestion) + '</li>');
                                    } break;
                            }
                        }

                    }

                    if ($('ul[id^="' + menuname + '"] li').size() > 0) {
                        switch (contextCollectionOrdered[0].type) {
                            case "GRAMMAR":
                                {
                                    $('<li  style="cursor:pointer;" id="lrn_' + j + "_" + k + "_" + contextCollectionOrdered[0].startpos + "_" + contextCollectionOrdered[0].endpos + "_lrn" + '" class="icon"><span class="icon learn" title="' + configuration.language.ignoreDialogTooltip + '"></span><span style="display:none;" class="accept-rule-unique-id">' + contextCollectionOrdered[0].uniqueId + '</span><span style="display:none;" class="accept-rule-name">' + contextCollectionOrdered[0].rule + '</span><span style="display:none;" class="flag-raw-json" title="' + encodeURIComponent(JSON.stringify(contextCollectionOrdered)) + '"></span>' + configuration.language.ignoreDialogLabel + '</li>').insertBefore('#' + menuname + " LI:first");
                                } break;
                            default:
                                {
                                    $('<li  style="cursor:pointer;" id="lrn_' + j + "_" + k + "_" + contextCollectionOrdered[0].startpos + "_" + contextCollectionOrdered[0].endpos + "_lrn" + '" class="icon"><span class="icon learn" title="' + configuration.language.learnDialogTooltip + '"></span><span style="display:none;" class="accept-spelling-rule-unique-id">' + contextCollectionOrdered[0].uniqueId + '</span><span style="display:none;" class="flag-raw-json" title="' + encodeURIComponent(JSON.stringify(contextCollectionOrdered)) + '"></span>' + configuration.language.learnDialogLabel + '</li>').insertBefore('#' + menuname + " LI:first");
                                } break;
                        }

                        createContextMenu(menuname);
                    }
                    else
                        $('#' + menuname).remove();
                }
            }
        }

        //display results after client side processing.
        function displayResults() {
            //clean messages. 
            //showToolbarMessage("", "", 100);                                                                                                 
        }

        //display refresh message, meaning the accept response is not ready yet.
        function displayRefreshMessage(context, message, sessionid) {
            showToolbarMessage(message, "color:Orange;display:none;font-weight:bold;", -1);
        }

        //display failed message, meaning the accept request failed to go through.
        function displayFailedMessage(context, message) {

            showToolbarMessage(message, "color:#FF0000;display:none;font-weight:bold;", -1);
        }

        //display no results message, meaning the accept response returned no results.
        function displayNoResultsMessage(context) {
            //showNoResultsDialog();
        }

        //hides all context menus and tooltips.
        function hideFlags() {
            //$acceptGlobalContainer
            $(document).find('.accepttooltip').css('display', 'none');
            $(document).find('.acm-default').css('display', 'none');
        }

        //hides button pane and displays no results message in the editor bottom toolbar.
        function showNoResultsDialog() {

            //show no results message.
            //showToolbarMessage(configuration.language.labelNoResultsDialogBody, "color:#0E9E4C;display:none;font-weight:bold;", -1);
        }

        //cleans all DOM elements added by the plug-in, including: tooltip nodes, context menu nodes.
        function cleanHighlightedNodes($container, removeBreakLineControlNodes, removeControlParagraphs) {

            /*'span[id^="spncontext_"]'*/
            $container.find('span[id^="spncontext"]').each(function () {
                removeKeepChildren($(this));
            });

            /*'span[id^="spnToolTip_"]'*/
            $container.find('span[id^="spnToolTip"]').each(function () {
                removeKeepChildren($(this));
            });

            if (removeControlParagraphs) {
                $container.find('.accept-container-paragraph').filter(function () {
                    return $.trim($(this).text()) === ''
                }).replaceWith('<br>');

                $container.find('.accept-container-paragraph').removeClass();
            }

            if (removeBreakLineControlNodes) {
                $container.find('.accept-container-line-separator').filter(function () {
                    return $.trim($(this).text()) === ''
                })
                .remove();
                $container.find('.accept-container-line-separator').removeClass();
            }
        }

        //cleans all DOM elements added by the plug-in, including: tooltip nodes, context menu nodes.
        function cleanHighlightedNodesGlobal(removeBreakLineControlNodes, removeControlParagraphs) {

            /*'span[id^="spncontext_"]'*/
            $acceptGlobalContainer.find('span[id^="spncontext"]').each(function () {
                removeKeepChildren($(this));
            });

            /*'span[id^="spnToolTip_"]'*/
            $acceptGlobalContainer.find('span[id^="spnToolTip"]').each(function () {
                removeKeepChildren($(this));
            });

            if (removeControlParagraphs) {
                $acceptGlobalContainer.find('.accept-container-paragraph').filter(function () {
                    return $.trim($(this).text()) === ''
                }).replaceWith('<br>');

                $acceptGlobalContainer.find('.accept-container-paragraph').removeClass();
            }

            if (removeBreakLineControlNodes) {
                $acceptGlobalContainer.find('.accept-container-line-separator').filter(function () {
                    return $.trim($(this).text()) === ''
                })
                .remove();
                $acceptGlobalContainer.find('.accept-container-line-separator').removeClass();
            }
        }

        //method responsible for update the local storage with ignored/unignored rule sets.
        function updateLearntRulesToSettingsPlaceHolder(currentGlobalSessionId) {
            //var $learntRules = $('#editorSettings_' + acceptContainerId).find("#learntRulesTable tbody");
            if (rulesLearntPool != null && rulesLearntPool.length > 0) {
                //$learntRules.empty();
                //for (var i = 0; i < rulesLearntPool.length; i++)
                //$learntRules.append('<tr><td>' + rulesLearntPool[i].ruleName + '</td><td><span class="check-unlearn-rule" id="checkUnlearnRule__' + rulesLearntPool[i].ruleId + '">' + configuration.language.labelRemove + '</span></td><td style="display:none;">' + rulesLearntPool[i].coolnessFactor + '</td></tr>');
                $(".check-unlearn-rule").unbind();
                $(".check-unlearn-rule").click(function () {
                    var toRemoveArray = _.where(rulesLearntPool, { ruleId: this.id.split('__')[1].toString() });
                    rulesLearntPool = _.difference(rulesLearntPool, toRemoveArray);
                    $.localStorage.setItem(labelLocalStorageRules, rulesLearntPool);
                    $(this).closest('tr').remove();
                    //audit.
                    if (toRemoveArray != null && toRemoveArray.length > 0)
                        sendAuditFlagGeneric("", labelActionRemoveIgnoreRule, "", "", toRemoveArray[0].ruleId, "", "", "", toRemoveArray[0].jsonRaw, "", currentGlobalSessionId);
                    //if (rulesLearntPool.length == 0)
                    //$learntRules.append('<tr><td colspan="2">' + configuration.language.labelNoRulesIgnored + '</td></tr>');
                });
            }
            else {
                //$learntRules.empty();
                //$learntRules.append('<tr><td colspan="2">' + configuration.language.labelNoRulesIgnored + '</td></tr>');
            }
        }

        //method responsible for update the local storage with learnt/unlearned words.
        function updateLearntWordsToSettingsPlaceHolder(currentGlobalSessionId) {

            //var $learntWords = $('#editorSettings_' + acceptContainerId).find("#learntWordsTable tbody");
            if (wordsLearntPool != null && wordsLearntPool.length > 0) {
                //$learntWords.empty();
                //for (var i = 0; i < wordsLearntPool.length; i++)
                //$learntWords.append('<tr><td>' + wordsLearntPool[i].context + '</td><td><span class="check-unlearn-word" id="checkUnlearnWord_' + wordsLearntPool[i].hash + '">' + configuration.language.labelRemove + '</span></td><td style="display:none;">' + wordsLearntPool[i].coolnessFactor + '</td></tr>');
                $(".check-unlearn-word").unbind();
                $(".check-unlearn-word").click(function () {

                    var toRemoveArray = _.where(wordsLearntPool, { hash: this.id.split('_')[1] });
                    wordsLearntPool = _.difference(wordsLearntPool, toRemoveArray);
                    $.localStorage.setItem(labelLocalStorageWords, wordsLearntPool);
                    $(this).closest("tr").remove();
                    //audit.
                    if (toRemoveArray != null && toRemoveArray.length > 0)
                        sendAuditFlagGeneric(toRemoveArray[0].context, labelActionRemoveLearntWord, "", "", toRemoveArray[0].ruleId, "", "", "", toRemoveArray[0].jsonRaw, "", currentGlobalSessionId);

                    //if(wordsLearntPool.length == 0)
                    //$learntWords.append('<tr><td colspan="2">' + configuration.language.labelNoWordsLearnt + '</td></tr>');
                });
            }
            else {
                //$learntWords.empty();
                //$learntWords.append('<tr><td colspan="2">' + configuration.language.labelNoWordsLearnt + '</td></tr>');
            }

        }

        //removes node keeping their children(including text nodes).
        function removeKeepChildren(node) {
            var $node = $(node);
            $node.contents().each(function () {
                $(this).insertBefore($node);
            });
            $node.remove();
        }

        //creates a context menu given a proper identifier.
        function createContextMenu(menuname) {
            //if (!$acceptContainer.attr(settings.dontDisplayAttributeName)) {
            $acceptContainer.find('SPAN.accept-highlight').each(function (index) {
                if (!$(this).data('events')) {
                    var indexHelper = currentJobIndex;
                    $(this).acceptContextMenu(menuname,
                            {
                                event: 'mouseover',
                                onSelect: function (e, context) {
                                    var option = $(this).attr("id").substr(0, 4);
                                    switch (option) {
                                        case "sug_":
                                            {
                                                var clickedli = $(this).closest('li[id^="sug_"]');
                                                var clickedLiSpllited = clickedli[0].id.split('_');
                                                var suggestionToUse = $(this).text();
                                                var clickedUl = $(this).closest('ul');
                                                var textBefore = jobsPool[indexHelper].container.text();
                                                //var indexHelper = currentJobIndex;                                                    
                                                settings.onReplace(e, context, $(this));
                                                //if flag type == gr means flag is grammar, in this case we check if there are any spelling rule we can use.
                                                if (clickedLiSpllited[5] == "gr") {
                                                    if (clickedUl != null && clickedUl.length > 0) {
                                                        for (var i = 0; i < clickedUl[0].childNodes.length; i++) {
                                                            var li = clickedUl[0].childNodes[i];
                                                            var liIdSplitted = li.id.split('_');
                                                            //if we find any spelling rule we can replace it on the grammar suggestion before we actually use it.
                                                            if (liIdSplitted[5] == "sp") {
                                                                /*'span[id^="spncontext_' + liIdSplitted[3] + '_' + liIdSplitted[4] + '"]'*/
                                                                var matchingSpellingNode = jobsPool[indexHelper].container.find(context);
                                                                var spellingPartToReplace = "";
                                                                if (matchingSpellingNode != null && matchingSpellingNode.length > 0) {
                                                                    spellingPartToReplace = matchingSpellingNode[0].childNodes[0].data;
                                                                    var firstSpellingRuleToUse = $($(li)).contents().filter(function () { return this.nodeType == 3; });
                                                                    suggestionToUse = suggestionToUse.replace(spellingPartToReplace, firstSpellingRuleToUse[0].data);
                                                                    break;

                                                                }
                                                            }
                                                        }
                                                    }
                                                    /*'span[id^="spncontext_' + clickedLiSpllited[3] + '_' + clickedLiSpllited[4] + '"]'*/
                                                    jobsPool[indexHelper].container.find(context).each(function (index) {
                                                        $(this).find('span[id^="spncontext"]').replaceWith(function () { return $(this).contents(); });
                                                        suggestionToUse != configuration.language.labelEmptySuggestion ? $(this).text(suggestionToUse) : $(this).text("");
                                                        removeKeepChildren($(this));
                                                    });

                                                    sendAuditFlag(clickedLiSpllited[3], clickedLiSpllited[4], suggestionToUse, clickedUl, textBefore, jobsPool[indexHelper].container.text(), $(this).find('span.flag-raw-json').attr('title'), context.id, jobsPool[indexHelper].flagsReturned, jobsPool[indexHelper].globalSessionId);
                                                }
                                                else {
                                                    /*'span[id^="spncontext_' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '"]'*/
                                                    var spnContext = jobsPool[indexHelper].container.find(context);
                                                    if (spnContext != null) {
                                                        suggestionToUse != configuration.language.labelEmptySuggestion ? $(spnContext).text(suggestionToUse) : $(spnContext).text("");
                                                        sendAuditFlag(clickedLiSpllited[3], clickedLiSpllited[4], suggestionToUse, clickedUl, textBefore, jobsPool[indexHelper].container.text(), $(this).find('span.flag-raw-json').attr('title'), context.id, jobsPool[indexHelper].flagsReturned, jobsPool[indexHelper].globalSessionId);
                                                        removeKeepChildren($(spnContext));

                                                    }
                                                }


                                            } break;
                                        case "lrn_":
                                            {

                                                var clickedLiSpllited = this.id.split('_');
                                                var contextToLearn = null;

                                                /*'span[id^="spncontext_' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '"]'*/
                                                jobsPool[indexHelper].container.find(context).each(function () {
                                                    contextToLearn = $(this).text();
                                                    removeKeepChildren($(this));
                                                });

                                                $(document).find('li[id$="' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '_gr"]').each(function () {
                                                    var $nextLi = $(this).next("li");
                                                    if ($nextLi !== null && $nextLi.attr("id") !== null && $nextLi.attr("id") !== undefined) {
                                                        var idSplitted = $nextLi.attr("id").split('_');
                                                        $nextLi.closest('ul').find("li:first").attr('id', 'lrn_' + idSplitted[1] + '_' + idSplitted[2] + '_' + idSplitted[3] + '_' + idSplitted[4] + '_lrn');
                                                    }
                                                }).remove();

                                                $(document).find('li[id$="' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '_sp"]').remove();
                                                var result = _.where(wordsLearntPool, { context: contextToLearn });

                                                if (result.length === 0 && contextToLearn != null) {

                                                    if ($(this).find(".accept-rule-unique-id").length > 0) {
                                                        //rule behaviour.
                                                        var ruleUniqueId = $(this).find(".accept-rule-unique-id").text();
                                                        //below 'ruleName' bot being used?
                                                        var ruleName = $(this).find(".accept-rule-name").text();
                                                        var jsonRaw = $(this).find("span.flag-raw-json").attr('title');
                                                        $(this).find(".accept-rule-unique-id").remove();
                                                        $(this).find(".accept-rule-name").remove();
                                                        var result = _.where(rulesLearntPool, { ruleId: ruleUniqueId });
                                                        if (result.length === 0) {
                                                            //add the new learnt rule to the mem object.
                                                            rulesLearntPool.push(new RuleLearn(ruleUniqueId, ruleName, true, jsonRaw));
                                                            //persist the mem object to local storage / cookie.
                                                            $.localStorage.setItem(labelLocalStorageRules, rulesLearntPool);
                                                            //show learn rule message.
                                                            //showToolbarMessage(messageRuleLearnt.replace("@rule@", ruleName), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
                                                            //rebuild ignored rules table.
                                                            updateLearntRulesToSettingsPlaceHolder(jobsPool[indexHelper].globalSessionId);
                                                            //audit ignored rule.							                               
                                                            sendAuditFlagGeneric("", labelActionIgnoreRule, "", "", ruleUniqueId, "", "", "", jsonRaw, context.id, jobsPool[indexHelper].globalSessionId);
                                                        }
                                                        //when the grammar rule is ignored we needed to pick the fist remaining li raw json and update the learn li for the next learn/ignore action.
                                                        var nextJsonRaw = $(this).closest('UL').find('li:nth-child(2)').find("span.flag-raw-json").attr("title");
                                                        var nextRuleUniqueId = $(this).closest('UL').find('li:nth-child(2)').find("span.accept-rule-unique-id").attr("title");
                                                        $(this).html('<span class="icon learn" title="' + configuration.language.learnDialogTooltip + '"></span><span style="display:none;" class="accept-spelling-rule-unique-id">' + nextRuleUniqueId + '</span><span style="display:none;" class="flag-raw-json hover" title="' + nextJsonRaw + '"></span>' + configuration.language.learnDialogLabel + '');

                                                    }
                                                    else {
                                                        //word to learn behaviour.
                                                        //json raw value.
                                                        var jsonRaw = $(this).find("span.flag-raw-json").attr('title');
                                                        var ruleUniqueId = $(this).find("span.accept-spelling-rule-unique-id").text();
                                                        //add the new learnt word to the mem object.
                                                        wordsLearntPool.push(new WordLearn(contextToLearn, true, jsonRaw, ruleUniqueId));
                                                        //persist the mem object to local storage / cookie.
                                                        $.localStorage.setItem(labelLocalStorageWords, wordsLearntPool); //"wordsLearntPool"
                                                        updateLearntWordsToSettingsPlaceHolder(jobsPool[indexHelper].globalSessionId);
                                                        //audit learnt word.
                                                        sendAuditFlagGeneric(contextToLearn, labelActionLearnWord, "", "", ruleUniqueId, "", "", "", jsonRaw, context.id, jobsPool[indexHelper].globalSessionId);
                                                        //show learn word message.
                                                        //showToolbarMessage(configuration.language.messageWordLearnt.replace("@word@", contextToLearn), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
                                                    }

                                                    if (jobsPool[indexHelper].container.find('span[class^="accept-highlight"]').length <= 0)
                                                        showNoResultsDialog();
                                                }

                                            } break;
                                            //case "srp_":                                                                                                                                                                                                                                                                                                        
                                            //break;                                                                                                                                                                                                                                                                                                        
                                            //case "rpa_":                                                                                                                                                                                                                                                                                                        
                                            //break;                                                                                                                                                                                                                                                                                                        
                                            //case "ign_":                                                                                                                                                                                                                                                                                                        
                                            //break;                                                                                                                                                                                                                                                                                                        
                                            //case "iga_":                                                                                                                                                                                                                                                                                                        
                                            //break;                                                                                                                                                                                                                                                                                                        
                                        default: break;
                                    }
                                },
                                onDisplay: function (e, context, id) {
                                    var $menu = $('#' + id);
                                    if ($menu.find("li:first").find(".accept-rule-unique-id").length > 0) {
                                        var ruleUniqueId = $menu.find("li:first").find(".accept-rule-unique-id").text();
                                        //var ruleName = $(this).find(".accept-rule-name").text();
                                        var jsonRaw = $menu.find("li:first").find("span.flag-raw-json").attr('title');
                                        sendAuditFlagGeneric("", labelActionDisplayContextMenu, "", "", ruleUniqueId, "", "", "", jsonRaw, this.id, jobsPool[indexHelper].globalSessionId);
                                    }
                                    else {
                                        var jsonRaw = $menu.find("li:first").find("span.flag-raw-json").attr('title');
                                        var ruleUniqueId = $menu.find("li:first").find("span.accept-spelling-rule-unique-id").text();
                                        var context = $(this).text();
                                        sendAuditFlagGeneric(context, labelActionDisplayContextMenu, "", "", ruleUniqueId, "", "", "", jsonRaw, this.id, jobsPool[indexHelper].globalSessionId);
                                    }
                                },
                                beforeDisplay: function (e, context, id) {
                                    settings.onBeforeDisplayingContextMenus(e, context, $(this));
                                    $.refreshIframePosition();
                                }
                            });

                } //end if has events attached                         

            });
            //}
        }

        //applies the first suggestion within each context menu to respective matching context.
        function fixAll() {
            $acceptGlobalContainer.contents().find('ul[id^="acceptmenu_"]').each(function () {
                $(this).find("li:nth-child(2)").trigger('click');
            });
        }

        //clones a given js object.
        function clone(obj) {
            if (obj == null || typeof (obj) != 'object')
                return obj;
            var temp = new obj.constructor();
            for (var key in obj)
                temp[key] = clone(obj[key]);
            return temp;
        }

        //when called processes an accept result set(order results by priority and indexes, builds either a context menu or a tooltip per result.  
        function handleResponse(data, context) {

            //load local storage.
            wordsLearntPool = $.localStorage.plugin.getItem(labelLocalStorageWords);
            rulesLearntPool = $.localStorage.plugin.getItem(labelLocalStorageRules);
            (wordsLearntPool != undefined) ? updateLearntWordsToSettingsPlaceHolder(jobsPool[currentJobIndex].globalSessionId) : wordsLearntPool = [];
            (rulesLearntPool != undefined) ? updateLearntRulesToSettingsPlaceHolder(jobsPool[currentJobIndex].globalSessionId) : rulesLearntPool = [];
            var responseStatusObj;
            // if ($.browser.msie)
            //     responseStatusObj = JSON.parse(data.substring(2, (data.length - 1))); 
            //  else
            responseStatusObj = data;
            acceptGenericResponses = [];
            acceptNonSuggestionGenericResponses = [];
            if (responseStatusObj != null && responseStatusObj.response.resultset != null) {
                var resultsets = responseStatusObj.response.resultset;
                if (context == "ACCEPT") {

                    $.each(resultsets, function (i) {

                        var results = resultsets[i].result;

                        $.each(results, function (j) {

                            var header = results[j].header;
                            var body = results[j].body;
                            var acceptresponse = new Response(body.context, header.type, body.suggestions, body.startpos, body.endpos, header.description, header.rule, body.contextpieces, header.uniqueId);


                            if (body.suggestions.length > 0)
                                acceptGenericResponses.push(acceptresponse);
                            else
                                acceptNonSuggestionGenericResponses.push(acceptresponse);
                        });
                    });

                    if (acceptNonSuggestionGenericResponses.length > 0)
                        buildStyleRules(clone(acceptNonSuggestionGenericResponses), data.session);

                    if (acceptGenericResponses.length > 0)
                        buildRulesWithSuggestions(clone(acceptGenericResponses), data.session);

                    //if (jobsPool[currentJobIndex].container.find('span[class^="accept-highlight"]').length > 0)
                    //    displayResults();
                    //else
                    //    displayNoResultsMessage(context);
					
                    //this is needed to get the necessary info on the flags returned when auditing user interaction(before there was only one main global object).
                    jobsPool[currentJobIndex].flagsReturned = acceptGenericResponses;
                    //clear worker semaphore.
                    jobsSemaphore = false;
                    //increment number of jobs done.
                    ++jobsFinishCount;
                }
                else {
                    //TODO
                }
            }
        }

              
        //concatenate all metadata expected data using semicolon to separate each item.
        function buildSessionMetadata() {
            var sessionMedata = "";
            sessionMedata += settings.processingRuleSet;
            //sessionMedata += ";" + settings.getSessionUser().hashCode().toString();
            return sessionMedata;
        }

        //instantiates the jquery ui dialog. 	
        function kickOffRealTimeCheck() {
		
            //check if container is loaded and accessible.
            if ($acceptGlobalContainer.length > 0)
                doWork();
            else {
                var checkExistMain = setInterval(function () {
                    if ($acceptGlobalContainer.length > 0) {
                        doWork()
                        clearInterval(checkExistMain);
                    }
                }, 100);
            }
        }

        //various tasks are performed within this scope: some jquery caching, some files added to tiny mce iframe, some content pre-processing and the actual ajax call to process the content.
        function doWork() {
           
            $.clearPreEditRealtimeCheckData(true);
            if (settings.iframePlaceholder != null) $iframe = settings.iframePlaceholder;

            if ($acceptGlobalContainer.length == 1) {
                var newSingleJob = new Job($acceptGlobalContainer, countJobs, 0, undefined, undefined, undefined);
                jobsPool = [];
                currentJobIndex = 0;
                jobsPool.push(newSingleJob);
                $acceptContainer = $acceptGlobalContainer;
                //loading content to process.           
                $('#htmlPlaceHolderRealTimeDiv_').html($acceptContainer.html());
                prepareHtmlContent($acceptContainer, true);
                acceptTextContext = getTextForHtml($acceptContainer);
                doAcceptRequest(new Array(acceptTextContext), true);
            }
            else {
                //jobsPool
                var countJobs = 0;
                var textContents = new Array();
                $acceptGlobalContainer.each(function (index) {
                    var newJob = new Job($(this), countJobs, 0, undefined, undefined, undefined);
                    jobsPool.push(newJob);
                    jobsPool[countJobs].container = $(this);
                    $acceptContainer = $(this);                  
                    //loading content to process.           
                    $('#htmlPlaceHolderRealTimeDiv_').html($acceptContainer.html());
                    prepareHtmlContent($acceptContainer, true);
                    acceptTextContext = getTextForHtml($acceptContainer);
                    textContents.push(acceptTextContext);
                    ++countJobs;
                });

                var max = $acceptGlobalContainer.length;
                iniJobsPoolWorker(max, true);
                doAcceptRequest(textContents, true);
            }

        }

        //when the plug-in is targetting more than one element, this method will init a worker that will pool all elements, and process them individually.
        function iniJobsPoolWorker(maxJobs, runAfterCheck) {
            jobsSemaphore = false;
            jobsFinishCount = 0;
            var poolWorker = setInterval(function () {
                if (!jobsSemaphore) {
                    for (var i = 0; i < jobsPool.length; i++) {
                        if (jobsPool[i].status == 1) {
                           
                            try {
                                jobsSemaphore = true;
                                currentJobIndex = i;
                                $acceptContainer = jobsPool[i].container;
                                jobsPool[i].status = 2;
                                handleResponse(jobsPool[i].responseObject, "ACCEPT");
                            } catch (e) {
                              
                                jobsSemaphore = false;
                                ++jobsFinishCount;
                            }
                        }
                    }
                }

                if (jobsFinishCount == maxJobs && !jobsSemaphore) {
                    if (runAfterCheck)
                        settings.onAfterCheck();
                    clearInterval(poolWorker);
                }
            }, 500);
        }

        //displays a given text message within the tiny mce editor toolbar, the message style and display period can be passed as parameters.
        function showToolbarMessage(message, style, delay) {
          //TODO:
        }

        //loads the content into the final placeholder(either within the dialog tiny mce editor iframe body or where it is being pointed at).
        function prepareHtmlContent($container, replaceBrTags) {
            //note: maybe and ideally the best approach would be to pass the container as parameter...
            $container.html($('#htmlPlaceHolderRealTimeDiv_').html());
            $container.find(settings.htmlBlockElements).each(function () { $('<span class="accept-container-line-separator">\n</span>').insertAfter(this); });
            $container.find('a').click(function (e) { e.preventDefault(); });
        }

        //iterates the content placeholder to get only the text to process (html content is stripped and only text is sent through process). 
        function getTextForHtml($container) {
            var content = "";
            try {
                jQuery.fn.getInnerTextFromHtml = function () {
                    function innerHighlight(node) {
                        var skip = 0;
                        if ($.browser.msie && $(node).attr('class') == 'accept-container-line-separator')
                            content = content + "\n";
                        if (node.nodeType == 3) {
                            content = content + node.data;
                        }
                        else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                            for (var i = 0; i < node.childNodes.length; ++i)
                                i += innerHighlight(node.childNodes[i]);
                        }
                        return skip;
                    }
                    return this.each(function () {
                        innerHighlight(this);
                    });
                }

                $container.html($container.html());
                $container.getInnerTextFromHtml();
            }
            catch (e) { }

            return encodeURIComponent(content);

        }




        //plug-in extended methods:

        //generates an hash code from a given string.
        String.prototype.hashCode = function () {
            var hash = 0, i, char;
            if (this.length == 0) return hash;
            for (i = 0, l = this.length; i < l; i++) {
                char = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            return hash;
        };

        //extending for the support of jquery prior versions.
        $.extend({
            parseJSON: function (data) {
                if (typeof data !== "string" || !data) {
                    return null;
                }
                data = jQuery.trim(data);
                if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
				.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
				.replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
                    return window.JSON && window.JSON.parse ?
					window.JSON.parse(data) :
					(new Function("return " + data))();

                } else {
                    jQuery.error("Invalid JSON: " + data);
                }
            }
        });

        //wraps up the js set timeout method in a jquery friendlier method.
        jQuery.fn.delay = function (time, func) {
            return this.each(function () {
                setTimeout(func, time);
            });
        };

        //plug-in core internal communication methods:

        //expects a core logging object as parameter and AJAX sends it as JSON. 
        function submitFlagAudit(flagAudit) {
            try {
                preEditHub.server.auditFlag(flagAudit.globalSessionId, encodeURIComponent(flagAudit.flag), encodeURIComponent(flagAudit.action), encodeURIComponent(flagAudit.actionValue),
                    encodeURIComponent(flagAudit.ignored), flagAudit.name, encodeURIComponent(flagAudit.textBefore), encodeURIComponent(flagAudit.textAfter), encodeURIComponent(new Date().toString()),
                    flagAudit.rawJson, (flagAudit.privateId.length > 0 ? flagAudit.privateId.hashCode() : flagAudit.privateId).toString());
            } catch (e) { }
        }

        //expects the final state of the text content within the annotations placeholder and the timestamp.
        function submitFinalAudit(globalSessionId, textContent) {
            try {
                preEditHub.server.auditFinalContext(globalSessionId, encodeURIComponent(textContent), encodeURIComponent(new Date().toString()));
            } catch (e) { }
        }

        //does the actual accept request.
        function doAcceptRequest(segmentsToProcess, runBeforeCheck) {
            if (runBeforeCheck)
                settings.onBeforeCheck();

            var segmentsArray = segmentsToProcess;
            var language = settings.contentLanguage;
            var rule = settings.processingRuleSet;
            var grammar = "1";
            var spell = "1";
            var style = "1";
            var sessionMetadata = buildSessionMetadata();
            var requestFormat = "HTML";
            var apiKey = settings.apiKey;
            var globalSessionId = "";
            var origin = window.location.toString();

            preEditHub.server.acceptParallelRequest(segmentsArray, language, rule, grammar, spell, style, requestFormat, apiKey, globalSessionId, sessionMetadata, origin);      
        }

        function doAcceptSingleRequest(segmentsToProcess, runBeforeCheck, clientIndex) {
            if (runBeforeCheck)
                settings.onBeforeCheck();
            var segmentsArray = segmentsToProcess;
            var language = settings.contentLanguage;
            var rule = settings.processingRuleSet;
            var grammar = "1";
            var spell = "1";
            var style = "1";
            var sessionMetadata = buildSessionMetadata();
            var requestFormat = "HTML";
            var apiKey = settings.apiKey;
            var globalSessionId = "";
            var origin = window.location.toString();
            var myindexOfCurrentClient = clientIndex;
            
            preEditHub.server.acceptRequest(segmentsArray, language, rule, grammar, spell, style, requestFormat, apiKey, globalSessionId, sessionMetadata, origin, myindexOfCurrentClient.toString());
        }

        //plug-in html injections:

        //injects the necessary html for the end user settings container.
        function buildSettingsPlaceHolder() {
          //TODO:
        }


        //plug-in initialization methods:

        //init plug-in.         
        function initRealTimeAccept() {

            cleanPluginData();

            //main right click context menu.
            $(document.body).append('<ul id="' + mainContextMenuId + '" class="contextMenu"><li class="accept"><a href="#accept">' + configuration.language.labelCtxMenuAccept + '</a></li><li class="grammar"><a href="#grammar">' + configuration.language.labelCtxMenuGrammar + '</a></li><li class="spell"><a href="#spell">' + configuration.language.labelCtxMenuSpelling + '</a></li><li class="style"><a href="#style">' + configuration.language.labelCtxMenuStyle + '</a></li>	<li class="accept_close"><a href="#accept_close">' + configuration.language.labelCtxMenuClose + '</a></li></ul>');

            //placeholder for text prep.
            $(document.body).append('<div id="htmlPlaceHolderRealTimeDiv_" style="display:none;"></div>');

            //set element from where the check will be performed.
            $realtimeCheck = $(settings.realTimeCheckSelector);

            syncServerConnection();


        }

        //sync signal-r connection.
        function syncServerConnection() {
            
            $.connection.hub.url = settings.acceptHubUrl;
            preEditHub = $.connection.preEdit;

            $.extend(preEditHub.client, {
                shapeMoved: function (cid, x, y) {
                },
                handleAcceptResponse: function (cid, dataObj, index) {
                  
                    if (dataObj.responseStatus === "OK" && dataObj.response.resultset !== undefined) {

                        if (jobsPool[index] != null) {
                            if ($acceptGlobalContainer.length == 1) {
                                jobsPool[index].responseObject = dataObj;
                                jobsPool[index].sessionCodeId = dataObj.session;
                                jobsPool[index].globalSessionId = dataObj.globalSessionId;
                                jobsPool[index].status = 1;
                                handleResponse(dataObj, "ACCEPT");
                            }
                            else {

                                jobsPool[index].responseObject = dataObj;
                                jobsPool[index].sessionCodeId = dataObj.session;
                                jobsPool[index].globalSessionId = dataObj.globalSessionId;
                                jobsPool[index].status = 1;

                            }
                        }
                    }

                },
                handleAcceptResponseException: function (cid, dataObj, index) {
                  
                },
                handleAcceptParallelResponse: function (cid, dataObj, index) {
                             
                    if (dataObj.responseStatus === "OK" && dataObj.response.resultset !== undefined) {
                     
                        if (jobsPool[index] != null) {
                            if ($acceptGlobalContainer.length == 1) {
                                jobsPool[index].responseObject = dataObj;
                                jobsPool[index].sessionCodeId = dataObj.session;
                                jobsPool[index].globalSessionId = dataObj.globalSessionId;
                                jobsPool[index].status = 1;
                                handleResponse(dataObj, "ACCEPT");
                            }
                            else {
                                jobsPool[index].responseObject = dataObj;
                                jobsPool[index].sessionCodeId = dataObj.session;
                                jobsPool[index].globalSessionId = dataObj.globalSessionId;
                                jobsPool[index].status = 1;
                            }
                        }
                    }
                    else {
                        //if (typeof console == "object") {
                        //console.log("finishing without success segment: " + index);
                        //console.log(dataObj);
                        //}
                    }
                },
                handleAcceptParallelResponseCompleted: function (dataObj) {                 
                },
                handleEchoResponse: function (cid, dataObj, index) {
                },
                logAccept: function (data) { }
            });

            //on click the check can take place.
            $realtimeCheck.click(function () {
                $.connection.hub.stop();
                preEditHub = $.connection.preEdit;
                $.connection.hub.start().done(function () {
                    kickOffRealTimeCheck();
                });
            });
        }

        //bind right click context menu for 'text-area only' type configuration.
        function loadRightClickContextMenu() {
            x = $acceptGlobalContainer.offset().left;
            y = $acceptGlobalContainer.offset().top;

            $acceptGlobalContainer.bind('mousemove', function (e) {
                if ($("#" + mainContextMenuId + "").is(':hidden') == true) {
                    $("#" + mainContextMenuId + "").css("top", y + e.clientY);
                    $("#" + mainContextMenuId + "").css("left", x + e.clientX);
                    e.stopPropagation();
                }
            });
            $acceptGlobalContainer.contextMenu({
                menu: mainContextMenuId
            }, function (action, el, pos) {
                switch (action) {
                    case "accept":
                        {
                            checkGrammar = "1"; checkSpelling = "1"; checkStyle = "1";
                            kickOffRealTimeCheck();

                        } break;
                    case "grammar":
                        {
                            checkGrammar = "1"; checkSpelling = "0"; checkStyle = "0"; kickOffRealTimeCheck();
                        }
                        break;
                    case "spell":
                        {
                            checkGrammar = "0"; checkSpelling = "1"; checkStyle = "0"; kickOffRealTimeCheck();
                        }
                        break;
                    case "style":
                        {
                            checkGrammar = "0"; checkSpelling = "0"; checkStyle = "1"; kickOffRealTimeCheck();
                        }
                        break;
                    case "accept_close": { $("#" + mainContextMenuId + "").css("display", "none") };
                }
            });
        }


        //plug-in methods to highlight annotations:

        //binds mouse over and mouse out events to a given final node(this node is a final node because in this case there are multiple nodes to highlight), then as a result a matching tooltip will be either displayed or hidden. 
        function addTriggerEventToContextNode(node, nodeIdToTrigger, eventToBind, eventToTrigger, ruleName, ruleUniqueId, jsonRaw) {
            
            var indexHelper = currentJobIndex;
            if (!$acceptContainer.attr(settings.dontDisplayAttributeName)) {
                if (eventToBind == 'click') {
                    var myclick = jobsPool[indexHelper].container.contents().find('#' + nodeIdToTrigger).data("events").click[0];
                    if (myclick != null)
                        $($(node)).click(myclick);
                }
                else {
                    $($(node)).mouseover(function (e) {
                        sendAuditFlagGeneric("", labelActionDisplayTooltip, "", "", ruleUniqueId, "", "", "", jsonRaw, nodeIdToTrigger, jobsPool[indexHelper].globalSessionId);
                        $("#toolTip_" + nodeIdToTrigger + "").unbind('delay');
                        hideFlags();
                        autoHideToolTip = false;
                        var startLeft = 0;
                        var startTop = 0;
                        var coordinates = null;
                        var obj = jobsPool[indexHelper].container.find('SPAN').filter('#' + nodeIdToTrigger);
                        coordinates = $.findTotalOffset(obj[0]);
                        startLeft = coordinates.left + $(window).scrollLeft();
                        startTop = coordinates.top + $(window).scrollTop();
                        $.refreshIframePosition();
                        startLeft += $.ifrx;
                        startTop += $.ifry;
                        $("#toolTip_" + nodeIdToTrigger + "").css({ top: startTop + 10, left: startLeft + 20 });
                        $("#toolTip_" + nodeIdToTrigger + "").css('display', 'block');
                        $(this).css('background-color', 'yellow');
                        jobsPool[indexHelper].container.contents().find('#' + nodeIdToTrigger).css('background-color', 'yellow');
                        $("#toolTip_" + nodeIdToTrigger + "").bind('mouseenter', function () {
                            $("#toolTip_" + nodeIdToTrigger + "").unbind('delay');
                            autoHideToolTip = false;
                        }).bind('mouseleave', function () {
                            $("#toolTip_" + nodeIdToTrigger + "").unbind('mouseleave');
                            $("#toolTip_" + nodeIdToTrigger + "").unbind('mouseenter');
                            $("#toolTip_" + nodeIdToTrigger + "").unbind('delay');
                            $("#toolTip_" + nodeIdToTrigger + "").css('display', 'none');
                        });
                    }).mouseout(function () {
                        autoHideToolTip = true;
                        $(this).css('background-color', '');
                        jobsPool[indexHelper].container.contents().find('#' + nodeIdToTrigger).css('background-color', '');
                        $("#toolTip_" + nodeIdToTrigger + "").delay(3000, function () {
                            if (autoHideToolTip)
                                $("#toolTip_" + nodeIdToTrigger + "").css('display', 'none');
                        });
                    });
                }
            }
        }

        //splits a html node using start and end indexes and calls a method to bind dom events to it.
        function addSplittedNodeWithTriggerAction(node, startPos, endPos, elementtype, classname, id, parentNodeid, eventToBind, eventToTrigger, ruleName, ruleUniqueId, jsonRaw) {
            var spannode = document.createElement(elementtype);
            spannode.className = classname;
            spannode.id = id;
            addTriggerEventToContextNode(spannode, parentNodeid, eventToBind, eventToTrigger, ruleName, ruleUniqueId, jsonRaw);
            if (endPos == 0)
                endPos = node.length;
            var middlebit = node.splitText(startPos);
            var endbit = middlebit.splitText(endPos);
            var middleclone = middlebit.cloneNode(true);
            spannode.appendChild(middleclone);
            middlebit.parentNode.replaceChild(spannode, middlebit);
        }

        //binds mouse over and mouse out events to a given node, then as a result a matching tooltip will be either displayed or hidden. 
        function bindToolTip(elementId, toolTipMessage, cornersIndex, oppositesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw) {

            var indexHelper = currentJobIndex;
            if (!$acceptContainer.attr(settings.dontDisplayAttributeName)) {
                if (!jobsPool[indexHelper].container.contents().find('#' + elementId).data('events')) {
                    var tooltipContent = '<span>' + configuration.language.labelRuleName + ' ' + ruleName + '</span><span class="unique-rule-name-tooltip" style="display:none;">' + ruleUniqueId + '</span><span style="color: #0e9e4c;font-weight: bold;cursor:pointer;" id="check_' + elementId + '">.&nbsp ' + configuration.language.learnTooltipLabels + '</span><br /><br />' + toolTipMessage;
                    if ($("#toolTip_" + elementId + "").length == 0) {
                        $('<div id="toolTip_' + elementId + '" class="accepttooltip" style="display:none"></div>').html(tooltipContent).appendTo('body');
                        $('#check_' + elementId + '').click(function () {
                            var result = _.where(rulesLearntPool, { ruleId: ruleUniqueId });
                            if (result.length === 0) {
                                //add the ignored rule to global ignored rules object.
                                rulesLearntPool.push(new RuleLearn(ruleUniqueId, ruleName, true, jsonRaw));
                                //persist the global object to local storage or cookie.
                                $.localStorage.setItem(labelLocalStorageRules, rulesLearntPool);
                                //show toolbar message.
                                //showToolbarMessage(messageRuleLearnt.replace("@rule@", ruleName), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
                                //update rules table.
                                updateLearntRulesToSettingsPlaceHolder(jobsPool[indexHelper].globalSessionId);
                                //log user ignored a rule.
                                sendAuditFlagGeneric("", labelActionIgnoreRule, "", "", ruleUniqueId, "", "", "", jsonRaw, elementId, jobsPool[indexHelper].globalSessionId);
                                //remove ignored rule copies.                          
                                var $nodesWithSameRuleName = $("span.unique-rule-name-tooltip").filter(function () {
                                    return $(this).text() == ruleUniqueId;
                                }).parent();
                                $nodesWithSameRuleName.each(function () {
                                    var idSplitted = this.id.split('_');
                                    //var $nodesToRemove = jobsPool[indexHelper].container.find('span[id^="spnToolTip_' + idSplitted[2] + '_' + idSplitted[3] + '"]');
                                    var $nodesToRemove = jobsPool[indexHelper].container.find('span[id^="spnToolTip' + jobsPool[indexHelper].sessionCodeId + '_' + idSplitted[2] + '_' + idSplitted[3] + '"]');
                                    $nodesToRemove.each(function () {
                                        removeKeepChildren($(this));
                                    });
                                });

                            }
                            jobsPool[indexHelper].container.find('span[id^="' + this.id.toString().substring(6, this.id.length).replace("_final", "") + '"]').each(function () {
                                removeKeepChildren($(this));
                            });
                            if (jobsPool[indexHelper].container.find('span[class^="accept-highlight"]').length <= 0)
                                showNoResultsDialog();
                            hideFlags();
                        });
                    }

                    jobsPool[indexHelper].container.find('SPAN').filter('#' + elementId).mouseover(function (e) {
                        sendAuditFlagGeneric("", labelActionDisplayTooltip, "", "", ruleUniqueId, "", "", "", jsonRaw, elementId, jobsPool[indexHelper].globalSessionId);
                        $("#toolTip_" + elementId + "").unbind('delay');
                        hideFlags();
                        autoHideToolTip = false;
                        var startLeft = 0;
                        var startTop = 0;
                        var coordinates = null;
                        coordinates = $.findTotalOffset(this);
                        startLeft = coordinates.left + $(window).scrollLeft();
                        startTop = coordinates.top + $(window).scrollTop();
                        $.refreshIframePosition();
                        startLeft += $.ifrx;
                        startTop += $.ifry;

                        $("#toolTip_" + elementId + "").css({ top: startTop + 10, left: startLeft + 20 });

                        $("#toolTip_" + elementId + "").css('display', 'block');
                        jobsPool[indexHelper].container.contents().find('span[id^="' + elementId.split('_')[0] + '_' + elementId.split('_')[1] + '_' + elementId.split('_')[2] + '"]').css('background-color', 'yellow');
                        $("#toolTip_" + elementId + "").bind('mouseenter', function () {
                            $("#toolTip_" + elementId + "").unbind('delay');
                            autoHideToolTip = false;
                        }).bind('mouseleave', function (event) {
                            $("#toolTip_" + elementId + "").unbind('mouseleave');
                            $("#toolTip_" + elementId + "").unbind('mouseenter');
                            $("#toolTip_" + elementId + "").unbind('delay');
                            $("#toolTip_" + elementId + "").css('display', 'none');
                        });

                    }).mouseout(function () {
                        autoHideToolTip = true;
                        jobsPool[indexHelper].container.contents().find('span[id^="' + elementId.split('_')[0] + '_' + elementId.split('_')[1] + '_' + elementId.split('_')[2] + '"]').css('background-color', '');

                        $("#toolTip_" + elementId + "").delay(3000, function (e) {
                            if (autoHideToolTip)
                                $("#toolTip_" + elementId + "").css('display', 'none');
                        });
                    }).mousemove(function (e) {
                    }).mouseenter(function (e) {
                        jobsPool[indexHelper].container.contents().find('.acm-default').css('display', 'none');
                    });
                }
            }
        }

        //calculates the next index of styles array to be returned.
        function getTooltipStyleNumber(current, total, threshold) {
            if (current < threshold) {
                return current;
            }
            else {
                var res = (current - threshold);
                while (res >= threshold) {
                    res = (res - threshold);
                }
                return (res <= 0) ? 0 : res;
            }
        }

        //splits a node given start and end positions and wraps it within a new node of a given type and css class.
        function addSplittedNode(node, startPos, endPos, elementtype, classname, id) {
            var spannode = document.createElement(elementtype);
            spannode.className = classname;
            spannode.id = id;
            var middlebit = node.splitText(startPos);
            var endbit = middlebit.splitText(endPos);
            var middleclone = middlebit.cloneNode(true);
            spannode.appendChild(middleclone);
            middlebit.parentNode.replaceChild(spannode, middlebit);
        }

        //highlights a piece of text and binds a context menu given: the indexes(startpos and pat.length), the word itself(pat), a css class(classname), the type of element that will wrap the word(elementtype) and the identifier(spnid). 
        jQuery.fn.highlight = function (pat, startpos, elementtype, classname, spnid) {
            var indexcount = 0;
            var found = false;
            function innerHighlight(node, pat, startpos) {

                var skip = 0;
                if ($.browser.msie && $(node).attr('class') == 'accept-container-line-separator') {
                    indexcount = indexcount + 1;
                }
                if (node.nodeType == 3) {                
                    var pos = node.data.toUpperCase().indexOf(pat);
                    if (pos >= 0) {
                        if (pos == startpos) {
                            addSplittedNode(node, pos, pat.length, elementtype, classname, spnid);
                            found = true;
                            skip = 1;
                        }
                        else {
                            if ((pos + indexcount) == startpos) {
                                addSplittedNode(node, pos, pat.length, elementtype, classname, spnid);
                                found = true;
                                skip = 1;
                            }
                            else {
                                var currentindexcount = (indexcount + pos + pat.length);
                                var aux = node.data.toUpperCase().substring((pos + pat.length), node.length);
                                var finalpos = pos + pat.length;
                                while (pos != -1) {
                                    pos = aux.indexOf(pat);
                                    finalpos = finalpos + pos;
                                    if ((pos + currentindexcount) == startpos) {
                                        addSplittedNode(node, finalpos, pat.length, elementtype, classname, spnid);
                                        skip = 1;
                                        found = true;
                                        break;
                                    }
                                    else {
                                        aux = aux.substring((pos + pat.length), aux.length);
                                        currentindexcount = (currentindexcount + pos + pat.length);
                                        finalpos = finalpos + pat.length;
                                    }
                                }
                                indexcount = (indexcount + parseInt(node.length));
                            }
                        }
                    }
                    else {
                        indexcount = (indexcount + parseInt(node.length));
                    }
                }
                else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                    for (var i = 0; i < node.childNodes.length; ++i) {

                        i += innerHighlight(node.childNodes[i], pat, startpos);
                        if (found)
                            break;
                    }
                }
                return skip;
            }
            return this.each(function () {
                innerHighlight(this, pat.toUpperCase(), startpos);

            });
        };

        //highlights a piece of text and binds a tooltip to it given: 
		//the indexes(startpos and endpos), the word itself(pat), the type of element that will wrap the word(elementtype) and the identifier(ruleUniqueId). 
        jQuery.fn.highlightWithToolTip = function (pat, startpos, endpos, elementtype, elementId, ruleTip, currentRuleCount, totalRulesCount, ruleName, ruleUniqueId, jsonRaw) {
            var indexcount = 0;
            var stylesIndex = getTooltipStyleNumber(currentRuleCount, totalRulesCount, 3);
            var found = false;

            function innerHighlightWithToolTip(node, pat, startpos) {
                var skip = 0;
                if ($.browser.msie && $(node).attr('class') == 'accept-container-line-separator') {
                    indexcount = indexcount + 1;
                }
                if (node.nodeType == 3) {                    
                    var pos = node.data.toUpperCase().indexOf(pat);
                    if (pos >= 0) {
                        if (pos == startpos) {
                            addSplittedNode(node, pos, pat.length, elementtype, cssStyles[stylesIndex], elementId);
                            found = true;
                            bindToolTip(elementId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                            skip = 1;
                        }
                        else {

                            if ((pos + indexcount) == startpos) {
                                addSplittedNode(node, pos, pat.length, elementtype, cssStyles[stylesIndex], elementId);
                                bindToolTip(elementId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                                found = true;
                                skip = 1;
                            }
                            else {
                                var currentindexcount = (indexcount + pos + pat.length);
                                //get the rest of the node to search for the right index.
                                var aux = node.data.toUpperCase().substring((pos + pat.length), node.length);
                                //update the final position.
                                var finalpos = pos + pat.length;
                                while (pos != -1) {
                                    pos = aux.indexOf(pat);
                                    finalpos = finalpos + pos;
                                    if ((pos + currentindexcount) == startpos) {
                                        addSplittedNode(node, finalpos, pat.length, elementtype, cssStyles[stylesIndex], elementId);                                       
                                        bindToolTip(elementId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                                        found = true;
                                        skip = 1;
                                        break;
                                    }
                                    else {
                                        aux = aux.substring((pos + pat.length), aux.length);
                                        currentindexcount = (currentindexcount + pos + pat.length);
                                        finalpos = finalpos + pat.length;
                                    }
                                }
                                indexcount = (indexcount + parseInt(node.length));
                            }
                        }
                    }
                    else {
                        indexcount = (indexcount + parseInt(node.length));
                    }
                }
                else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        i += innerHighlightWithToolTip(node.childNodes[i], pat, startpos);
                        if (found)
                            break;
                    }
                }
                return skip;
            }

            return this.each(function () {
                innerHighlightWithToolTip(this, pat.toUpperCase(), startpos);
            });
        };

        //highlights a piece of text and binds a tooltip to it given: the indexes(startPos and endPos), the word itself(pat), the type of element that will wrap the word(elementtype) and the identifier(ruleUniqueId). 
        jQuery.fn.highlightHtmlMultiContextWithToolTip = function (pat, endpat, startPos, endPos, elementtype, classname, elementId, ruleTip, currentRuleCount, totalRulesCount, ruleName, ruleUniqueId, jsonRaw) {
            var indexcount = 0;
            var stylesIndex = getTooltipStyleNumber(currentRuleCount, totalRulesCount, cssStyles.length);
            var startPiecefound = false;
            var endPieceFound = false;
            var currentPieceFound = endPieceFound;
            var finalElementId = elementId + '_final';
            var midlleContextNodesCount = 1;
            var startMiddleFound = false;
            var endMiddleFound = false;

            function innerHighlightWithToolTip(node, context, startIndex, nodeId) {
                var skip = 0;
                if ($.browser.msie && $(node).attr('class') == 'accept-container-line-separator') {
                    indexcount = indexcount + 1;
                }
                if (node.nodeType == 3) {
                    //var inputText = node.data.replace(/[↵]/gi, '\n');
                    var pos = node.data.toUpperCase().indexOf(context);
                    if (pos >= 0) {
                        if (pos == startIndex) {
                            if (!endPieceFound) {
                                addSplittedNode(node, pos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId);
                                bindToolTip(nodeId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                                endMiddleIndex = pos;
                            }
                            else {
                                addSplittedNodeWithTriggerAction(node, pos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId, finalElementId, 'onmouseover', 'onmouseover', ruleName, ruleUniqueId, jsonRaw);
                            }
                            currentPieceFound = true;
                            skip = 1;
                        }
                        else {
                            if ((pos + indexcount) == startIndex) {
                                if (!endPieceFound) {
                                    addSplittedNode(node, pos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId);
                                    bindToolTip(nodeId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                                }
                                else {
                                    addSplittedNodeWithTriggerAction(node, pos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId, finalElementId, 'onmouseover', 'onmouseover', ruleName, ruleUniqueId, jsonRaw);
                                }

                                currentPieceFound = true;
                                skip = 1;
                            }
                            else {
                                var currentindexcount = (indexcount + pos + context.length);
                                //get the rest of the node to search for the right index.
                                var aux = node.data.toUpperCase().substring((pos + context.length), node.length);
                                //updates the final position.
                                var finalpos = pos + context.length;
                                while (pos != -1) {
                                    pos = aux.indexOf(context);
                                    finalpos = finalpos + pos;
                                    if ((pos + currentindexcount) == startIndex) {
                                        if (!endPieceFound) {
                                            addSplittedNode(node, finalpos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId);
                                            bindToolTip(nodeId, ruleTip, stylesIndex, stylesIndex, stylesIndex, ruleName, ruleUniqueId, jsonRaw);
                                        }
                                        else {
                                            addSplittedNodeWithTriggerAction(node, finalpos, context.length, elementtype, cssUnderlineStyles[stylesIndex], nodeId, finalElementId, 'onmouseover', 'onmouseover', ruleName, ruleUniqueId, jsonRaw);
                                        }

                                        currentPieceFound = true;
                                        skip = 1;
                                        break;
                                    }
                                    else {
                                        aux = aux.substring((pos + context.length), aux.length);
                                        currentindexcount = (currentindexcount + pos + context.length);
                                        finalpos = finalpos + context.length;
                                    }
                                }

                                indexcount = (indexcount + parseInt(node.length));
                            }
                        }
                    }
                    else {
                        indexcount = (indexcount + parseInt(node.length));
                    }
                }
                else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        i += innerHighlightWithToolTip(node.childNodes[i], context, startIndex, nodeId);
                        if (currentPieceFound)
                            break;
                    }
                }
                return skip;
            }


            function innerHighlightMiddleNodesWithToolTip(node, startElementId, endElementId, nodeId) {

                var skip = 0;
                if (node.nodeType == 3) {

                    var parentNodeId = $(node).parent().attr('Id');
                    if (parentNodeId != null && parentNodeId != 'undefined') {

                        if (parentNodeId == endElementId) {
                            endMiddleFound = true;
                        }
                        else
                            if (parentNodeId == startElementId) {
                                startMiddleFound = true;
                            }
                    } else
                        if (startMiddleFound && !endMiddleFound && node.data.length > 0) {

                            addSplittedNodeWithTriggerAction(node, 0, node.length, elementtype, cssUnderlineStyles[stylesIndex], (nodeId + "" + midlleContextNodesCount).toString(), finalElementId, 'onmouseover', 'onmouseover', ruleName, ruleUniqueId, jsonRaw);
                            ++midlleContextNodesCount;
                            skip = 1;
                        }
                }
                else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
                    for (var i = 0; i < node.childNodes.length; ++i) {
                        i += innerHighlightMiddleNodesWithToolTip(node.childNodes[i], startElementId, endElementId, nodeId);
                        if (endMiddleFound)
                            break;
                    }
                }
                return skip;
            }

            this.each(function () {
                innerHighlightWithToolTip(this, endpat.toUpperCase(), endPos, finalElementId);
            });
            indexcount = 0;
            endPieceFound = currentPieceFound;
            currentPieceFound = startPiecefound;
            this.each(function () {
                innerHighlightWithToolTip(this, pat.toUpperCase(), startPos, elementId);
            });
            startPiecefound = currentPieceFound;
            return this;
        };

        //load and init language settings.
        function initLanguageUi() {

            if ($.browser.msie) {
                var xdr = new XDomainRequest();
                xdr.open("GET", settings.configurationFilesPath + '/accept-jquery-plugin-3.0-config-' + settings.uiLanguage.toString() + '.json');
                xdr.onerror = function () { }
                xdr.onload = function () {

                    configuration = JSON.parse(xdr.responseText);
                    initLocalStorageAndRuleSets();
                    initRealTimeAccept();
                };
                xdr.onprogress = function () { };
                xdr.ontimeout = function () { };
                xdr.onopen = function () { };
                xdr.send();
            }
            else {

                $.ajax({
                    url: settings.configurationFilesPath + '/accept-jquery-plugin-3.0-config-' + settings.uiLanguage.toString() + '.json',
                    dataType: 'json',
                    async: false,
                    success: function (json) {
                        configuration = json;
                        initLocalStorageAndRuleSets();
                        initRealTimeAccept();
                    },
                    error: function (e) { }
                });
            }
        }

        //set the names for local storage repositories and define rule set to use.
        function initLocalStorageAndRuleSets() {
            if (settings.contentLanguage == "fr") {
                labelLocalStorageRules = "rulesLearntPool_fr";
                labelLocalStorageWords = "wordsLearntPool_fr";
            }
            else
                if (settings.contentLanguage == "de") {
                    labelLocalStorageRules = "rulesLearntPool_de";
                    labelLocalStorageWords = "wordsLearntPool_de";
                }

            if (settings.processingRuleSet == '') {
                if (settings.contentLanguage == "fr")
                    settings.processingRuleSet = "Preediting_Forum";
                else
                    if (settings.contentLanguage == "de")
                        settings.processingRuleSet = "Preediting-DE-EN";
                    else
                        settings.processingRuleSet = "Preediting_Forum";
            }
        }

        //kick off plug-in.
        initLanguageUi();

    }//accept plug-in core

})(jQuery);

//dependencies - accept context menu.
(function ($) {

    var _global;
    var _menus;
    var isFirefox = typeof InstallTrigger !== 'undefined';
    var isIE = false || !!document.documentMode;

    function bindOnClickHideContextMenus() {
        $(document).bind("click", function () {
            $("ul.acm-default").hide();
        });
    }

    bindOnClickHideContextMenus();

    $.fn.acceptContextMenu = function (id, options) {
        //if not, then init menus list.
        if (!_menus) _menus = {};
        //current element in context.
        var $self = $(this);
        var $menu = $('#' + id);
        _menus[id] = $.extend({
            event: 'hover',
            menuId: id,
        }, options || {});
        _menus[id].context = this;
        if (isIE || isFirefox) {
            $self.bind(_menus[id].event, function (e) {

                $("ul.acm-default").css("display", "none");

                if (_menus[id].beforeDisplay) {
                    if (_menus[id].beforeDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }

                var evt = e || window.event;
                var tgt = evt.target || evt.srcElement;
                try {
                    var rect = tgt.getClientRects();
                    if (rect.length > 0) {
                        var left = $.ifrx + rect[0].left;
                        var top = $.ifry + rect[0].top
                        $("#" + id).css('top', (top + $self.outerHeight()));
                        $("#" + id).css('left', left);
                        $("#" + id).css('display', 'block');

                        if (_menus[id].onDisplay) {
                            if (_menus[id].onDisplay.apply(this, [e, _menus[id].context[0]], id) == false) {
                                return false;
                            }
                        }

                    }

                } catch (e) {
                    alert('Not supported by this browser');
                    return;
                }
            });
        }
        else {
            $self.bind(_menus[id].event, function (e) {
                $("ul.acm-default").css("display", "none");
                var spanOffset = $(this).offset();
                if (_menus[id].beforeDisplay) {
                    if (_menus[id].beforeDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }
                var left = $.ifrx + spanOffset.left;
                var top = $.ifry + spanOffset.top
                $("#" + id).css('top', (top + $(this).outerHeight()));
                $("#" + id).css('left', left);
                $("#" + id).css('display', 'block');

                if (_menus[id].onDisplay) {
                    if (_menus[id].onDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }
                e.stopPropagation();
                e.stopImmediatePropagation();
            });

        }

        $menu.bind("mouseleave", function (e) {
            $("ul.acm-default").css("display", "none");
            e.stopPropagation();
            e.stopImmediatePropagation();
        });

        $('#' + id).find('li').click(function (e) {

            $menu.hide();
            if (_menus[id].onSelect) {
                if (_menus[id].onSelect.apply(this, [e, _menus[id].context[0]]) == false) {
                    return false;
                }
            }
        });
    }

    $.fn.acceptParaphrasingContextMenu = function (id, options) {

        //if not, then init menus list.
        if (!_menus) _menus = {};
        //current element in context.
        var $self = $(this);
        var $menu = $('#' + id);
        _menus[id] = $.extend({
            event: 'hover',
            menuId: id,
        }, options || {});
        _menus[id].context = this;
        if (isIE || isFirefox) {
            $self.bind(_menus[id].event, function (e) {

                $("ul.acm-default").css("display", "none");

                if (_menus[id].beforeDisplay) {
                    if (_menus[id].beforeDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }

                var evt = e || window.event;
                var tgt = evt.target || evt.srcElement;
                try {
                    var rect = tgt.getClientRects();
                    if (rect.length > 0) {
                        var left = $.paraifrx + rect[0].left;
                        var top = $.paraifry + rect[0].top
                        $("#" + id).css('top', (top + $self.outerHeight()));
                        $("#" + id).css('left', left);
                        $("#" + id).css('display', 'block');

                        if (_menus[id].onDisplay) {
                            if (_menus[id].onDisplay.apply(this, [e, _menus[id].context[0]], id) == false) {
                                return false;
                            }
                        }

                    }

                } catch (e) {
                    return;
                }
            });
        }
        else {
            $self.bind(_menus[id].event, function (e) {
                $("ul.acm-default").css("display", "none");
                var spanOffset = $(this).offset();
                if (_menus[id].beforeDisplay) {
                    if (_menus[id].beforeDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }
                var left = $.paraifrx + spanOffset.left;
                var top = $.paraifry + spanOffset.top
                $("#" + id).css('top', (top + $(this).outerHeight()));
                $("#" + id).css('left', left);
                $("#" + id).css('display', 'block');

                if (_menus[id].onDisplay) {
                    if (_menus[id].onDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                        return false;
                    }
                }
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
        }


        $menu.find('li').click(function (e) {
           
            $menu.hide();
            if (_menus[id].onSelect) {
                if (_menus[id].onSelect.apply(this, [e, _menus[id].context[0]]) == false) {
                    return false;
                }
            }
        });

        $menu.bind("mouseleave", function (e) {
            //$("ul.acm-default").css("display", "none");
            //e.stopPropagation();
            //e.stopImmediatePropagation();
        });

    }

}(jQuery));

//dependencies - accept local storage.
(function ($, document, undefined) {
    var supported;
    try {
        supported = typeof window.localStorage == 'undefined' || typeof window.JSON == 'undefined' ? false : true;
    } catch (error) { }

    $.localStorage = function (key, value, options) {
        options = jQuery.extend({}, options);
        return $.localStorage.plugin.init(key, value);
    }

    $.localStorage.setItem = function (key, value) {
        return $.localStorage.plugin.setItem(key, value);
    }

    $.localStorage.getItem = function (key) {
        return $.localStorage.plugin.getItem(key);
    }

    $.localStorage.removeItem = function (key) {
        return $.localStorage.plugin.removeItem(key);
    }

    $.localStorage.plugin = {
        init: function (key, value) {
            if (typeof value != 'undefined') {
                return this.setItem(key, value);
            } else {
                return this.setItem(key);
            }
        },
        setItem: function (key, value) {
            var value = JSON.stringify(value);
            if (!supported) {
                try {
                    $.localStorage.cookie(key, value);
                } catch (e) { }
            }
            window.localStorage.setItem(key, value);
            return this.result(value);
        },
        getItem: function (key) {
            if (!supported) {
                try {
                    return this.result($.localStorage.cookie(key));
                } catch (e) {
                    return null;
                }
            }
            return this.result(window.localStorage.getItem(key));
        },
        removeItem: function (key) {
            if (!supported) {
                try {
                    $.localStorage.cookie(key, null);
                    return true;
                } catch (e) {
                    return false;
                }
            }
            window.localStorage.removeItem(key);
            return true;
        },
        result: function (res) {
            var ret;
            try {
                ret = JSON.parse(res);
                if (ret == 'true') {
                    ret = true;
                }
                if (ret == 'false') {
                    ret = false;
                }
                if (parseFloat(ret) == ret && typeof ret != "object") {
                    ret = parseFloat(ret);
                }
            } catch (e) { }
            return ret;
        }
    }

    $.localStorage.cookie = function (key, value, options) {

        if (arguments.length > 1 && (value === null || typeof value !== "object")) {
            if (value === null) {
                options.expires = -1;
            }

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            return (document.cookie = [
				encodeURIComponent(key), '=',
				options.raw ? String(value) : encodeURIComponent(String(value)),
				options.expires ? '; expires=' + options.expires.toUTCString() : '',
				options.path ? '; path=' + options.path : '',
				options.domain ? '; domain=' + options.domain : '',
				options.secure ? '; secure' : ''
            ].join(''));
        }

        options = value || {};
        var result,
			decode = options.raw ? function (s) { return s; } : decodeURIComponent;

        return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
    }

})(jQuery, document);



