////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
//  ACCEPT PROJECT - http://www.accept.unige.ch/index.html or http://cordis.europa.eu/fp7/ict/language-technologies/project-accept_en.html    //
//  Pre-Editing Plug-in (version 3.0)                                                                                                         //
//  David Silva - davidluzsilva@gmail.com                                                                                                     //                        
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////                                                                                                                                            

(function ($) {

    //plug-in core.
    $.fn.Accept = function (options) {

        //core variables.
        var configuration = null;
        var globalSessionId = null;
        var currentChildSessionId = null;
        var acceptObject = this;
        var acceptObjectId = $(this).attr("id");       
        var acceptContainerId = "div_accept_" + acceptObjectId;
        var $acceptContainer = null;
        var $iframe = null;
        var $toolbarUserInfoPlaceholder = null;
        var acceptDialogId = "dialogaccept_" + acceptObjectId;
        var mainContextMenuId = "myMenu_" + acceptObjectId;
        var btnReplaceId = "btn-replace-accept_" + acceptObjectId;
        var btnFixAllId = "btn-fixall_" + acceptObjectId;
        var btnRefreshId = "btn-refresh-accept_" + acceptObjectId;
        var btnManualRefreshId = "btn-manual-refresh-accept_" + acceptObjectId;
        var imgDialogTitleId = "imgDialogTitleId_" + acceptObjectId;
        var acceptTextContext = "";
        var acceptGenericResponses = [];
        var acceptNonSuggestionGenericResponses = [];             
        var checkGrammar = "1";
        var checkSpelling = "1";
        var checkStyle = "1";      
        var wordsLearntPool = [];
        var rulesLearntPool = [];
        var autoHideToolTip = true;
      
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

        //external variables.
        $.ifrx = 0;
        $.ifry = 0;
        $.ifrxmem = 0;
        $.ifrymem = 0;
        
        //this is obsolete - since we are only using green or red to underline contexts, we no longer need arrays of styles.
        var cssStyles = ['accept-highlight-tooltip', 'accept-highlight-tooltip', 'accept-highlight-tooltip'];
        var cssUnderlineStyles = ['accept-highlight-tooltip', 'accept-highlight-tooltip', 'accept-highlight-tooltip'];
                                          
        //external methods:

        //when context menu is displayed this method (is wrapping up the internal method: "SubmitFlagAudit") sends (for logging purposes) all related info. 
        $.sendDisplayAudit = function (label, ruleUniqueId, rawJson, context, pid) {        
            sendAuditFlagGeneric(context, label, "", "", ruleUniqueId, "", "", "", rawJson, pid);
        }

        //updates the global variables x,y with the editor iframe offSet.
        $.refreshIframePosition = function () {
            $.ifrx = 0;
            $.ifry = 0;
            $.ifrx = $iframe.offset().left - $iframe.contents().find('body').scrollLeft();
            $.ifry = $iframe.offset().top - $iframe.contents().find('body').scrollTop();
            $.ifry -= $(window).scrollTop();
            $.ifrx -= $(window).scrollLeft();            
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

        //external method sets the current rule set.
        $.updateRuleSet = function (ruleSetName) {
            settings.Rule = ruleSetName;
        };

        //external method sets replace all button visible/hidden.
        $.updateShowFixAll = function (showFixAll) {
            settings.showFixAll = showFixAll;
        };

        //clean all plug-in data.
        $.cleanPluginData = function () {
            $("#" + mainContextMenuId).remove();
            $("#" + acceptDialogId).remove();
        }

        //creates a button on the page from where the text check action is then bind to.
        $.injectAcceptButton = function (jQuerySelectorSource, jQuerySelectorTarget, contentToApply, waitingTime) {
            try {                
                if (jQuerySelectorSource != null && contentToApply != null) {
                    if ($(jQuerySelectorSource).length) {
                        $(jQuerySelectorSource).each(function () {
                            $(this).append(contentToApply);
                        });

                    }
                    else {
                        var checkExist1 = setInterval(function () {
                            if ($(jQuerySelectorSource).length) {
                                $(jQuerySelectorSource).each(function () {
                                    $(this).append(contentToApply);
                                });
                                clearInterval(checkExist1);
                            }
                        }, waitingTime);
                    }
                }
                if (jQuerySelectorTarget != null) {
                    if ($(jQuerySelectorTarget).length) {
                        $(jQuerySelectorTarget).click(function () {
                            checkGrammar = "1";
                            checkSpelling = "1";
                            checkStyle = "1";
                            createAcceptDialog();
                        });

                    }
                    else {
                        var checkExist2 = setInterval(function () {
                            if ($(jQuerySelectorTarget).length) {
                                $(jQuerySelectorTarget).click(function () {
                                    checkGrammar = "1";
                                    checkSpelling = "1";
                                    checkStyle = "1";
                                    createAcceptDialog();
                                });
                                clearInterval(checkExist2);
                            }
                        }, waitingTime);

                    }

                }
              
            } catch (ex) { }
        }

        //creates a button on the post-edit plug-in from where the text check action is then bind to (post-edit plug-in dedicated method).
        $.injectAcceptButtonPostEdit = function (jQuerySelectorSource, jQuerySelectorTarget, contentToApply, waitingTime) {
            try {
                setTimeout(function () {
                    $(jQuerySelectorSource).each(function () {
                        $(this).append(contentToApply);
                    });

                    $(jQuerySelectorTarget).click(function () {
                        checkGrammar = "1";
                        checkSpelling = "1";
                        checkStyle = "0";
                        createAcceptDialog();
                    });
                }, waitingTime);
            } catch (ex) { }
        }

        //set checking levels rule-sets.
        $.setCheckingLevels = function (checkingLevels)
        {
            settings.checkingLevels = checkingLevels;
        }

        //plug-in default settings.
        var settings = $.extend({
            'ApiKey': '',
            'AcceptServerPath': 'http://www.accept-portal.eu/AcceptApi/Api/v1',
            'configurationType': 'contextMenu',
            'Rule': '',
            'Lang': 'en',           
            'imagesPath': '../../Content/images',
            'tinyMceUrl': '../extras/tiny_mce/tiny_mce.js',
            'textEditorPlaceHolderId': null,
            'timeoutWaitingTime': 7000,
            'LoadInputText': function () {               
                var inputText = "";
                inputText = settings.requestFormat == 'TEXT' ? inputText = $("#" + acceptObjectId).val() : inputText = $("#" + acceptObjectId).html();
                return inputText;
            },
            'SubmitInputText': function (text) {
                settings.requestFormat == 'TEXT' ? $('#' + acceptObjectId).val(text) : $('#' + acceptObjectId).html(text);
            },
            'uiLanguage': 'en',
            'dialogHeight': 'auto',
            'dialogWidth': 'auto',
            'requestFormat': 'TEXT',
            'placeHolderMaxHeight': $(window).height(),
            'placeHolderMaxWidth': $(window).width(),
            'placeHolderMinHeight': 100,
            'placeHolderMinWidth': 380,
            'showFixAll': false,
            'showManualCheck': true,
            'isModal': true,
            'isDraggable': true,
            'styleSheetPath': '../css',
            'htmlBlockElements': 'p ,h1 ,h2 ,h3 ,h4 ,h5 ,h6 ,ol ,ul, li ,pre ,address ,blockquote ,dl ,div ,fieldset ,form ,hr ,noscript ,table, br',
            'refreshStatusAttempts': 5,
            'editorWidth': '380px',
            'editorHeight': '80px',
            'checkingLevels': [],
            'getSessionUser': function () { return ""; },
            'injectSelector': null,
            'triggerCheckSelector': null,
            'injectContent': null,
            'injectWaitingPeriod': 100,
            'dialogPosition': ['top', 50],
            'displayExtend': true,
            'dialogExtendOptions':
            {
                "close": true,
                "maximize": true,
                "minimize": false,
                "events":
                {
                    "maximize": function () {                      
                        afterMaximize();
                    },
                    "restore": function () {
                        afterRestore();
                        $("#" + acceptDialogId + "").css("height", "auto");
                    },
                    "beforeMaximize": function () {                        
                        beforeMaximize();
                    }                    
                }
            },
            'cssSelectorToolbarMessage': ".mce-path",
            'cssSelectorTinyMceMaximize': "#mce_22",
            'configurationFilesPath': "Scripts/pre-edit"
        }, options);


        //plug-in core internal objects:

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
                        allcontext = allcontext + " " + contextpieces[i].Piece.toString();
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
        function AuditFlag(flag, action, actionValue, context, ignored, name, textBefore, textAfter, timeStamp, rawJson, privateId) {
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
        }


        //plug-in internal methods:

        //dialog maximization help method: to record involved elements width/height before maximization occurs.
        function beforeMaximize() {

            if ($iframe) {
                $iframe.data('widthBeforeMax', { dialogWidthBeforeMaximize: $iframe.width() });
                $iframe.data('heightBeforeMax', { dialogHeightBeforeMaximize: $iframe.height() });                

                if ($("#editArea_div_accept_txtAreaEnglishDemo_tbl").length > 0) {
                    $("#editArea_div_accept_txtAreaEnglishDemo_tbl").data('widthBeforeMax', { dialogWidthBeforeMaximize: $("#editArea_div_accept_txtAreaEnglishDemo_tbl").width() });
                    $("#editArea_div_accept_txtAreaEnglishDemo_tbl").data('heightBeforeMax', { dialogHeightBeforeMaximize: $("#editArea_div_accept_txtAreaEnglishDemo_tbl").height() });                  
                }
                
                if ($('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).length > 0) {
                    $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).data('widthBeforeMax', { dialogWidthBeforeMaximize: $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).width() });//.css("width")
                    $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).data('heightBeforeMax', { dialogHeightBeforeMaximize: $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).height() });//.css("height")
                }
            }
        }

        //dialog maximization help method: to adjust some elements width/height to full screen display.
        function afterMaximize() {

            if ($iframe) {
                $iframe.css("width", "100%");
                $iframe.css("height", parseFloat($("#" + acceptDialogId + "").height() * 0.90) + "px");
                if ($("#editArea_div_accept_txtAreaEnglishDemo_tbl").length > 0)
                    $("#editArea_div_accept_txtAreaEnglishDemo_tbl").width("100%");
                
                if ($('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).length > 0) {
                    $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).width("100%");
                }
            }
        }

        //dialog maximization help method: to restore width/height of elements using the values recorded with beforeMaximize method.
        function afterRestore() {

            if ($iframe) {
                $iframe.css("width", $iframe.data('widthBeforeMax').dialogWidthBeforeMaximize);
                $iframe.css("height", $iframe.data('heightBeforeMax').dialogHeightBeforeMaximize);
                if ($("#editArea_div_accept_txtAreaEnglishDemo_tbl").length > 0) {
                    $("#editArea_div_accept_txtAreaEnglishDemo_tbl").css("width", $("#editArea_div_accept_txtAreaEnglishDemo_tbl").data('widthBeforeMax').dialogWidthBeforeMaximize + 'px');
                    $("#editArea_div_accept_txtAreaEnglishDemo_tbl").css("height", $("#editArea_div_accept_txtAreaEnglishDemo_tbl").data('heightBeforeMax').dialogHeightBeforeMaximize + 'px');
                }
                if ($('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).length > 0) {
                    $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).css("width", $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).data('widthBeforeMax').dialogWidthBeforeMaximize);//$('#mainPlaceHolder_' + acceptDialogId + '').find("#mce_22").data('widthBeforeMax').dialogWidthBeforeMaximize
                    $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).css("height", $('#mainPlaceHolder_' + acceptDialogId + '').find(settings.cssSelectorTinyMceMaximize).data('heightBeforeMax').dialogHeightBeforeMaximize);//$('#mainPlaceHolder_' + acceptDialogId + '').find("#mce_22").data('heightBeforeMax').dialogHeightBeforeMaximize
                }                              
            }
        }

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
        function sendAuditFlag(startIndex, endIndex, usedflag, usedFlagContextMenuSelector, textBefore, textAfter, jsonRaw, pid) {

            for (var i = 0; i < acceptGenericResponses.length; i++)
                if (acceptGenericResponses[i].GetStartPosition() == startIndex && acceptGenericResponses[i].GetEndPosition() == endIndex) {
                    var newAuditFlag = new AuditFlag();
                    newAuditFlag.flag = acceptGenericResponses[i].GetContext();
                    newAuditFlag.action = labelActionAcceptSuggestion ;
                    newAuditFlag.actionValue = usedflag;
                    newAuditFlag.ignored = "";                                 
                    $(usedFlagContextMenuSelector).find('li:not([id^=lrn_])').each(function () {
                        if ($(this).text() != usedflag && $(this).text() != configuration.language.learnDialogLabel)
                            newAuditFlag.ignored.length > 0 ? newAuditFlag.ignored = newAuditFlag.ignored + ";" + $(this).text() : newAuditFlag.ignored = newAuditFlag.ignored + $(this).text();
                    });
                    newAuditFlag.name = acceptGenericResponses[i].uniqueId; 
                    newAuditFlag.context = "";
                    newAuditFlag.textBefore = textBefore;
                    newAuditFlag.textAfter = textAfter;
                    newAuditFlag.timeStamp = new Date();
                    newAuditFlag.rawJson = jsonRaw;
                    newAuditFlag.privateId = pid;
                    submitFlagAudit(newAuditFlag);
                    cleanRemainingSuggestionsInContextMenu(startIndex, endIndex, usedFlagContextMenuSelector, acceptGenericResponses[i].type);
                }
        }

        //creates and sends a core logging object.
        function sendAuditFlagGeneric(flag, action, actionValue, ignored, name, context, textBefore, textAfter, jsonRaw, pid) {
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
            submitFlagAudit(newAuditFlag);
        }

        //expects a collection of annotations to display within tooltips, then the tooltips are created along with the display event is bound to the matching context. 
        function buildStyleRules(styleResponses) {
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
                        firstcontext = contextCollectionOrdered[i].contextpieces[0].Piece;
                        firstindex = contextCollectionOrdered[i].contextpieces[0].StartPos;
                        startPosLastContextIndex = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].StartPos;
                        endPosLastContextIndex = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].StartPos;
                        lastcontext = contextCollectionOrdered[i].contextpieces[contextCollectionOrdered[i].contextpieces.length - 1].Piece;
                        var spnId = "spnToolTip_" + firstindex.toString() + "_" + endPosLastContextIndex.toString();
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
                        var spnId = "spnToolTip_" + contextCollectionOrdered[i].GetStartPosition() + "_" + contextCollectionOrdered[i].GetEndPosition();
                        var ruleDescription = contextCollectionOrdered[i].description; contextCollectionOrdered[i].description = "";
                        if (_.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)
                            $acceptContainer.highlightWithToolTip(contextCollectionOrdered[i].context, parseInt(contextCollectionOrdered[i].startpos), parseInt(contextCollectionOrdered[i].endpos), 'span', spnId, ruleDescription, TooltTipCurrentCounterHelper, TooltTipMaxCounterHelper, contextCollectionOrdered[i].rule, contextCollectionOrdered[i].uniqueId, encodeURIComponent(JSON.stringify(contextCollectionOrdered[i])));
                    }
                }

            }

        } 

        //expects a collection of annotations to display within context menus, then the menus are created along with the display event bound to the matching context. 
        function buildRulesWithSuggestions(acceptResponses) {
            menuscount = 0;
            $('ul[id^="acceptmenu"]').remove();
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
                    var spnid = "spncontext_" + contextCollectionOrdered[i].startpos + "_" + contextCollectionOrdered[i].endpos + "_" + menuscount + "_" + i;
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
                            multiContext += contextCollectionOrdered[i].contextpieces[j].Piece;

                        if (multiContext.length > 0 && _.where(wordsLearntPool, { context: multiContext.toString() }).length === 0 && _.where(rulesLearntPool, { ruleId: contextCollectionOrdered[i].uniqueId }).length === 0)
                            $acceptContainer.highlight(multiContext, parseInt(contextCollectionOrdered[i].startpos), 'span', 'accept-highlight', spnid);
                        else {
                            contextCollectionOrdered.splice(i, 1);
                            --i;
                        }

                    }
                }

                var menuname = "acceptmenu_" + menuscount.toString();
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

        //display results after client side processing.
        function displayResults() {
            //clean messages. 
            showToolbarMessage("", "", 100);
            $("#" + btnReplaceId).css("display", "inline");
            $("#btnSwapText_").css("display", "inline");
            if (settings.showFixAll)
                $("#" + btnFixAllId).css("display", "inline");
            if (settings.showManualCheck)
                $("#" + btnRefreshId).css("display", "inline");
            $("#" + btnReplaceId).css("display", "inline");
            //hide gif loader.
            $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "none");
            
            //replacing the method checkifThereAnyMore.
            if ($acceptContainer.find('SPAN.accept-highlight').length == 0)
                $("#" + btnFixAllId).css('display', 'none');
            
            $("#editor_" + acceptContainerId).css("display", "block");
            //if exist then always show checking levels.
            if (settings.checkingLevels.length > 0)
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'block');
        }

        //display refresh message, meaning the accept response is not ready yet.
        function displayRefreshMessage(context, message, sessionid) {
            $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "none");               
            $("#editor_" + acceptContainerId).css("display", "block");
            showToolbarMessage(message, "color:Orange;display:none;font-weight:bold;", -1);
            $("#" + btnManualRefreshId).css("display", "inline");
            $("#" + btnReplaceId).css("display", "none");
            $("#" + btnFixAllId).css("display", "none");
        }

        //display failed message, meaning the accept request failed to go through.
        function displayFailedMessage(context, message) {
            $("#" + btnReplaceId).css("display", "none");
            $("#" + btnFixAllId).css("display", "none");
            $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "none");
            $("#editor_" + acceptContainerId).css("display", "block");            
            showToolbarMessage(message, "color:#FF0000;display:none;font-weight:bold;", -1);
        }

        //display no results message, meaning the accept response returned no results.
        function displayNoResultsMessage(context) {
            //if exist then always show checking levels.
            if (settings.checkingLevels.length > 0)
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'block');
            $("#btnSwapText_").css("display", "inline");
            if (settings.showManualCheck)
                $("#" + btnRefreshId).css("display", "inline");
            $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "none");             
            $("#editor_" + acceptContainerId).css("display", "block");        
            $("#" + btnReplaceId).css("display", "inline");           
            showNoResultsDialog();
        }

        //hides all context menus and tooltips.
        function hideFlags() {
            $(document).find('.accepttooltip').css('display', 'none');
            $(document).find('.acm-default').css('display', 'none');
        }

        //hides button pane and displays no results message in the editor bottom toolbar.
        function showNoResultsDialog() {
            $("#" + btnFixAllId).css("display", "none");
            //show no results message.
            showToolbarMessage(configuration.language.labelNoResultsDialogBody, "color:#0E9E4C;display:none;font-weight:bold;", -1);
        }

        //cleans all DOM elements added by the plug-in, including: tooltip nodes, context menu nodes.
        function cleanHighlightedNodes(removeBreakLineControlNodes, removeControlParagraphs) {
            $acceptContainer.find('span[id^="spncontext_"]').each(function () {
                removeKeepChildren($(this));
            });
            $acceptContainer.find('span[id^="spnToolTip_"]').each(function () {
                removeKeepChildren($(this));
            });
           
            if (removeControlParagraphs) {
                $acceptContainer.find('.accept-container-paragraph').filter(function () {
                    return $.trim($(this).text()) === ''
                }).replaceWith('<br>');

                $acceptContainer.find('.accept-container-paragraph').removeClass();
            }

            if (removeBreakLineControlNodes) {
                $acceptContainer.find('.accept-container-line-separator').filter(function () {
                    return $.trim($(this).text()) === ''
                })
                .remove();
                $acceptContainer.find('.accept-container-line-separator').removeClass();
            }
        }

        //method responsible for update the local storage with ignored/unignored rule sets.
        function updateLearntRulesToSettingsPlaceHolder() {
            var $learntRules = $('#editorSettings_' + acceptContainerId).find("#learntRulesTable tbody");
            if (rulesLearntPool != null && rulesLearntPool.length > 0) {
                $learntRules.empty();
                for (var i = 0; i < rulesLearntPool.length; i++)
                    $learntRules.append('<tr><td>' + rulesLearntPool[i].ruleName + '</td><td><span class="check-unlearn-rule" id="checkUnlearnRule__' + rulesLearntPool[i].ruleId + '">' + configuration.language.labelRemove + '</span></td><td style="display:none;">' + rulesLearntPool[i].coolnessFactor + '</td></tr>');

                $(".check-unlearn-rule").unbind();
                $(".check-unlearn-rule").click(function () {
                    var toRemoveArray = _.where(rulesLearntPool, { ruleId: this.id.split('__')[1].toString() });
                    rulesLearntPool = _.difference(rulesLearntPool, toRemoveArray);
                    $.localStorage.setItem(labelLocalStorageRules, rulesLearntPool);
                    $(this).closest('tr').remove();

                    //audit ignored rule
                    if (toRemoveArray != null && toRemoveArray.length > 0)
                        sendAuditFlagGeneric("", labelActionRemoveIgnoreRule, "", "", toRemoveArray[0].ruleId, "", "", "", toRemoveArray[0].jsonRaw, "");

                    if (rulesLearntPool.length == 0)
                        $learntRules.append('<tr><td colspan="2">' + configuration.language.labelNoRulesIgnored + '</td></tr>');
                });
            }
            else {
                $learntRules.empty();
                $learntRules.append('<tr><td colspan="2">' + configuration.language.labelNoRulesIgnored + '</td></tr>');
            }
        }

        //method responsible for update the local storage with learnt/unlearned words.
        function updateLearntWordsToSettingsPlaceHolder() {

            var $learntWords = $('#editorSettings_' + acceptContainerId).find("#learntWordsTable tbody");
            if (wordsLearntPool != null && wordsLearntPool.length > 0) {
                $learntWords.empty();
                for (var i = 0; i < wordsLearntPool.length; i++)
                    $learntWords.append('<tr><td>' + wordsLearntPool[i].context + '</td><td><span class="check-unlearn-word" id="checkUnlearnWord_' + wordsLearntPool[i].hash + '">' + configuration.language.labelRemove + '</span></td><td style="display:none;">' + wordsLearntPool[i].coolnessFactor + '</td></tr>');
                $(".check-unlearn-word").unbind();
                $(".check-unlearn-word").click(function () {
                    //wordsLearntPool[parseInt(this.id.split('_')[1])].isActive = false;
                    //wordsLearntPool = _.where(wordsLearntPool, { isActive: true });                 
                    var toRemoveArray = _.where(wordsLearntPool, { hash: this.id.split('_')[1] });
                    wordsLearntPool = _.difference(wordsLearntPool, toRemoveArray);
                    $.localStorage.setItem(labelLocalStorageWords, wordsLearntPool); //"wordsLearntPool"
                    $(this).closest("tr").remove();
                    //audit learnt word
                    if (toRemoveArray != null && toRemoveArray.length > 0)
                        sendAuditFlagGeneric(toRemoveArray[0].context, labelActionRemoveLearntWord, "", "", toRemoveArray[0].ruleId, "", "", "", toRemoveArray[0].jsonRaw, "");

                    if (wordsLearntPool.length == 0)
                        $learntWords.append('<tr><td colspan="2">' + configuration.language.labelNoWordsLearnt + '</td></tr>');
                });
            }
            else {
                $learntWords.empty();
                $learntWords.append('<tr><td colspan="2">' + configuration.language.labelNoWordsLearnt + '</td></tr>');
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
            $acceptContainer.find('SPAN.accept-highlight').each(function (index) {
                if (!$(this).data('events')) {
                    $('#' + menuname).mouseleave(function (event) {
                        $(this).css('display', 'none');
                    });

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
							                    var textBefore = $acceptContainer.text();

							                    //if flag type == gr means flag is grammar, in this case we check if there are any spelling rule we can use.
							                    if (clickedLiSpllited[5] == "gr") {
							                        if (clickedUl != null && clickedUl.length > 0) {
							                            for (var i = 0; i < clickedUl[0].childNodes.length; i++) {
							                                var li = clickedUl[0].childNodes[i];
							                                var liIdSplitted = li.id.split('_');
							                                //if we find any spelling rule we can replace it on the grammar suggestion before we actually use it.
							                                if (liIdSplitted[5] == "sp") {
							                                    var matchingSpellingNode = $acceptContainer.find('span[id^="spncontext_' + liIdSplitted[3] + '_' + liIdSplitted[4] + '"]');
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

							                        $acceptContainer.find('span[id^="spncontext_' + clickedLiSpllited[3] + '_' + clickedLiSpllited[4] + '"]').each(function (index) {
							                            $(this).find('span[id^="spncontext"]').replaceWith(function () { return $(this).contents(); });
							                            suggestionToUse != configuration.language.labelEmptySuggestion ? $(this).text(suggestionToUse) : $(this).text("");
							                            removeKeepChildren($(this));
							                        });

							                        sendAuditFlag(clickedLiSpllited[3], clickedLiSpllited[4], suggestionToUse, clickedUl, textBefore, $acceptContainer.text(), $(this).find('span.flag-raw-json').attr('title'), context.id);
							                    }
							                    else {
							                        var spnContext = $acceptContainer.find('span[id^="spncontext_' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '"]');
							                        if (spnContext != null) {
							                            suggestionToUse != configuration.language.labelEmptySuggestion ? $(spnContext).text(suggestionToUse) : $(spnContext).text("");
							                            sendAuditFlag(clickedLiSpllited[3], clickedLiSpllited[4], suggestionToUse, clickedUl, textBefore, $acceptContainer.text(), $(this).find('span.flag-raw-json').attr('title'), context.id);
							                            removeKeepChildren($(spnContext));

							                        }
							                    }

							                    if ($acceptContainer.find('.accept-highlight').length == 0)
							                        $("#" + btnRefreshId).trigger('click');

							                } break;
							            case "lrn_":
							                {							                    
							                    var clickedLiSpllited = this.id.split('_');
							                    var contextToLearn = null;
							                    $acceptContainer.find('span[id^="spncontext_' + clickedLiSpllited[3].toString() + '_' + clickedLiSpllited[4].toString() + '"]').each(function () {
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
							                                showToolbarMessage(configuration.language.messageRuleLearnt.replace("@rule@", ruleName), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
							                                //rebuild ignored rules table.
							                                updateLearntRulesToSettingsPlaceHolder();
							                                //audit ignored rule.							                               
							                                sendAuditFlagGeneric("", labelActionIgnoreRule, "", "", ruleUniqueId, "", "", "", jsonRaw, context.id);
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
							                            updateLearntWordsToSettingsPlaceHolder();
							                            //audit learnt word.
							                            sendAuditFlagGeneric(contextToLearn, labelActionLearnWord, "", "", ruleUniqueId, "", "", "", jsonRaw, context.id);
							                            //show learn word message.
							                            showToolbarMessage(configuration.language.messageWordLearnt.replace("@word@", contextToLearn), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
							                        }

							                        if ($acceptContainer.find('span[class^="accept-highlight"]').length <= 0)
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
							            $.sendDisplayAudit(labelActionDisplayContextMenu, ruleUniqueId, jsonRaw, "", this.id);
							        }
							        else {
							            var jsonRaw = $menu.find("li:first").find("span.flag-raw-json").attr('title');
							            var ruleUniqueId = $menu.find("li:first").find("span.accept-spelling-rule-unique-id").text();
							            var context = $(this).text();
							            $.sendDisplayAudit(labelActionDisplayContextMenu, ruleUniqueId, jsonRaw, context, this.id);
							        }
							    },
							    beforeDisplay: function (e, context, id) {							  
							        $.refreshIframePosition();
							    },
							    getCustomOffset: function (e, context, id) {							       
							        return {
							            top : $.ifry,
							            left: $.ifrx
							        };							   			
							    }


							});

                } //end if has events attached                         

            });

        }

        //applies the first suggestion within each context menu to respective matching context.
        function fixAll()
        {
            $(document).contents().find('ul[id^="acceptmenu_"]').each(function () {
                $(this).find("li:nth-child(2)").trigger('click');                
            });
        }

        //cleans the text before sending it.
        function cleanText(text) {
            var cleanedText;
            //we dont necessarly need to remove the tags... its only for protection...
            //if (settings.requestFormat == 'TEXT') 
            //{
            //    cleanedText = $.trim(removeHTMLTags(text.replace(/&nbsp;/gi, ' ')));
            //    return encodeURIComponent(cleanedText);
            //}
            //else 
            //{
            cleanedText = $.trim(text); //$('#htmlPlaceHolderDiv_' + acceptDialogId).text() //.replace(/&nbsp;/gi, ' ')                							
            return encodeURIComponent(cleanedText);
            //}
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
        function handleResponseStatus(data, context) {
            //load local storage.
            wordsLearntPool = $.localStorage.plugin.getItem(labelLocalStorageWords);
            rulesLearntPool = $.localStorage.plugin.getItem(labelLocalStorageRules);
            (wordsLearntPool != undefined) ? updateLearntWordsToSettingsPlaceHolder() : wordsLearntPool = [];
            (rulesLearntPool != undefined) ? updateLearntRulesToSettingsPlaceHolder() : rulesLearntPool = [];
            var responseStatusObj;
            if ($.browser.msie)
                responseStatusObj = JSON.parse(data.substring(2, (data.length - 1))); 
            else
                responseStatusObj = data;
            if (responseStatusObj != null && responseStatusObj.Response.ResultSet != null) {
                var resultsets = responseStatusObj.Response.ResultSet;
                if (context == "ACCEPT") {
                    $.each(resultsets, function (i) {
                        var results = resultsets[i].Results;
                        $.each(results, function (j) {
                            var header = results[j].Header;
                            var body = results[j].Body;                            
                            var acceptresponse = new Response(body.Context, header.Type, body.Suggestion, body.StartPos, body.EndPos, header.Description, header.Rule, body.ContextPieces, header.UniqueId);
                            if (body.Suggestion.length > 0)
                                acceptGenericResponses.push(acceptresponse);
                            else
                                acceptNonSuggestionGenericResponses.push(acceptresponse);
                        });
                    });

                    if (acceptNonSuggestionGenericResponses.length > 0)
                        buildStyleRules(clone(acceptNonSuggestionGenericResponses));

                    if (acceptGenericResponses.length > 0)
                        buildRulesWithSuggestions(clone(acceptGenericResponses));

                    if ($acceptContainer.find('span[class^="accept-highlight"]').length > 0)
                        displayResults();
                    else
                        displayNoResultsMessage(context);
                }
                else
                {
                    //TODO
                }
            }
        }

        //callback method to check wheter the accept request is ready or still being processed(this is done by validating each response status).
        function handleRequestStatus(data, context) {

            var responseStatusObj;

            if ($.browser.msie)
                responseStatusObj = JSON.parse(data);
            else
                responseStatusObj = data;

            if (responseStatusObj != null && responseStatusObj.AcceptSessionCode != null) {

                if (responseStatusObj.GlobalSessionId != null && responseStatusObj.GlobalSessionId.length > 0)
                    globalSessionId = responseStatusObj.GlobalSessionId;

                if (responseStatusObj.AcceptSessionCode != null && responseStatusObj.AcceptSessionCode.length > 0)
                    currentChildSessionId = responseStatusObj.AcceptSessionCode;

                parseResponseStatus(data, responseStatusObj.AcceptSessionCode, 0, context);                            
            }
            else
                displayFailedMessage(context, configuration.language.errorParsingApiStatusMessage);
        }

        //method responsible to manage the waiting periods(each period is set to one second) between checking wheter the accept request is ready or not.
        function parseResponseStatus(data, sessionid, attempts, currentcontext) {
            var responseStatusObj;
            if ($.browser.msie) {
                try {
                    responseStatusObj = JSON.parse(data);
                }
                catch (e) {
                    responseStatusObj = JSON.parse(data.substring(2, (data.length - 1)));
                }
            }
            else
                responseStatusObj = data;
            var newattempt = ++attempts;
            if (responseStatusObj.State != null) {
                switch (responseStatusObj.State) {
                    case "DONE": doGetResponse(sessionid, currentcontext); break;
                    case "FAILED": displayFailedMessage(currentcontext, configuration.language.errorRequestFailed); break;
                    default:
                        if (parseInt(newattempt) >= settings.refreshStatusAttempts) {
                            displayRefreshMessage(currentcontext, configuration.language.refreshMessage, sessionid); break;
                        }
                        setTimeout(function () {
                            doGetResponseStatus(sessionid, newattempt, currentcontext);
                        }, 1000);
                                   
                        break;
                }
            }
        }

        //concatenates all metadata expected data using semicolon to separate each item.
        function buildSessionMetadata() {
            var sessionMedata = "";
            sessionMedata += settings.Rule;
            sessionMedata += ";" + settings.getSessionUser().hashCode().toString();
            return sessionMedata;
        }

        //builds json object for ie fix purposes.
        function getData(text, withGlobalSession) {
            if (withGlobalSession) {
                return {
                    "ApiKey": "" + settings.ApiKey + "",
                    "GlobalSessionId": "" + globalSessionId + "",
                    "Text": "" + text + "",
                    "Language": "" + settings.Lang + "",
                    "Rule": "" + settings.Rule + "",
                    "Grammar": "" + checkGrammar + "",
                    "Spell": "" + checkSpelling + "",
                    "Style": "" + checkStyle + "",
                    "RequestFormat": "" + settings.requestFormat + "",
                    "IEDomain": "" + window.location + "",
                    "SessionMetadata": "" + buildSessionMetadata() + ""

                };
            }
            else {
                return {
                    "ApiKey": "" + settings.ApiKey + "",
                    "Text": "" + text + "",
                    "Language": "" + settings.Lang + "",
                    "Rule": "" + settings.Rule + "",
                    "Grammar": "" + checkGrammar + "",
                    "Spell": "" + checkSpelling + "",
                    "Style": "" + checkStyle + "",
                    "RequestFormat": "" + settings.requestFormat + "",
                    "IEDomain": "" + window.location + "",
                    "SessionMetadata": "" + buildSessionMetadata() + ""
                };

            }
        }

        //instantiates the jquery ui dialog. 	
        function createAcceptDialog() {
            $(window).scrollTop(0);
            $("#" + acceptDialogId + "").dialog("close");
            $("#" + acceptDialogId + "").dialog("destroy");
            $("#" + acceptDialogId + "").dialog({
                width: settings.dialogWidth, height: settings.dialogHeight, draggable: settings.isDraggable, modal: settings.isModal, maxWidth: settings.placeHolderMaxWidth, minHeight: settings.placeHolderMinHeight, minWidth: settings.placeHolderMinWidth, resizable: false, title: "",
                maxHeight: settings.placeHolderMaxHeight, position: settings.dialogPosition || 'center',
                open: function (event, ui) {                                        
                    $("#ui-dialog-title-" + acceptDialogId + "").html('&nbsp;');
                    $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').append('<img id="imgAcceptInfo_' + acceptDialogId + '" width="30px" height="30px" style="float:left;cursor:pointer;margin: .5em .4em .5em 0;" src="' + settings.imagesPath + '/info_accept.png" alt="" />');                    
                    loadOnTheFlyEditTextEditor();                    
                    buildSettingsPlaceHolder();
                    //if exist then inject html for checking levels.
                    if (settings.checkingLevels.length > 0) {
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').append('<div id="format_' + acceptDialogId + '" style="margin: .5em .4em .5em 0;display:none;"></div>');
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").append('<input type="checkbox" id="checkLevel_0" checked="checked" /><label title="' + settings.checkingLevels[0] + '" for="checkLevel_0">1</label>');
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").append('<span style="position: relative;width: 15px;display: inline-block"><img width="15px" style="position: absolute;bottom: 0.3px;" height="8px" src="' + settings.imagesPath + '/arrowResized.png" alt=""></span>'); 

                        for (var i = 1; i < settings.checkingLevels.length; i++)
                            (i != (settings.checkingLevels.length - 1)) ? $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").append('<input type="checkbox" id="checkLevel_' + i.toString() + '"  /><label title="' + settings.checkingLevels[i] + '" for="checkLevel_' + i.toString() + '">' + (i + 1).toString() + '</label><span style="position: relative;width: 15px;display: inline-block"><img width="15px" style="position: absolute;bottom: 0.3px;" height="8px" src="' + settings.imagesPath + '/arrowResized.png" alt=""></span>') : $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").append('<input type="checkbox" id="checkLevel_' + i.toString() + '"  /><label title="' + settings.checkingLevels[i] + '" for="checkLevel_' + i.toString() + '">' + (i + 1).toString() + '</label>')
                        $.updateRuleSet(settings.checkingLevels[0].toString());
                    }
                },
                beforeClose: function (event, ui) {
                    if ($("#" + acceptDialogId + "").dialogExtend("state") != "normal")
                        $("#" + acceptDialogId + "").dialogExtend("restore");
                },
                close: function (event, ui) {
                    $('#load_' + acceptContainerId).css('width', "auto");
                    $('#load_' + acceptContainerId).css('height', "auto");
                    if (globalSessionId != null && globalSessionId.length > 0) {                      
                        acceptTextContext = getTextForHtml();
                        submitFinalAudit(acceptTextContext, new Date());
                    }

                    globalSessionId = null;
                    currentChildSessionId = null;
                    acceptGenericResponses = [];
                    acceptNonSuggestionGenericResponses = [];
                    acceptTextContext = "";
                    $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "block");
                    $(".resultsPlaceHolder").css("display", "none");
                    $acceptContainer.html("");
                    $('ul[id^="acceptmenu"]').remove();
                    removeTinyMCE('editArea_' + acceptContainerId + '');
                    $('div[class^="accepttooltip"]').remove();
                    $("#helpDialog_" + acceptDialogId).dialog("close");
                    $("#helpDialog_" + acceptDialogId).dialog("destroy");
                },
                dragStart: function (event, ui) {
                    hideFlags();
                },
                resize: function (event, ui) {
                    hideFlags();
                },
                buttons: [{
                    id: btnFixAllId,
                    text: configuration.language.labelDialogFixAll,
                    click: function () {
                        hideFlags();
                        $("#" + btnReplaceId).css("display", "none");
                        $("#" + btnFixAllId).css("display", "none");
                        fixAll();
                    }
                },
				{
				    id: btnRefreshId,
				    text: configuration.language.labelManualCheck,
				    click: function () {
				        hideFlags();
				        $("#btnSaveSettings_").css("display", "none");
				        $("#btnSwapText_ span").text(configuration.language.labelSettings);
				        $("#btnSwapText_").css("display", "none");
				        if (settings.showFixAll)
				            $("#" + btnFixAllId).css("display", "none");
				        if (settings.showManualCheck)
				            $("#" + btnRefreshId).css("display", "none");

				        $("#" + btnReplaceId).css("display", "none");
				        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'none');
				        $('#load_' + acceptContainerId).css('width', $("#editor_" + acceptContainerId).outerWidth().toString() + "px");
				        $('#load_' + acceptContainerId).css('height', $("#editor_" + acceptContainerId).outerHeight().toString() + "px");
				        $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "block"); 
				        $(".resultsPlaceHolder").css("display", "none"); 
				        acceptGenericResponses = [];
				        acceptNonSuggestionGenericResponses = [];				       
				        cleanHighlightedNodes(true, false);
				        //makes no sense to copy everything once again to the htmlPlaceHolderDiv_ does it?
				        $('#htmlPlaceHolderDiv_' + acceptDialogId).html($acceptContainer.html());
				        prepareHtmlContent(false);
				        acceptTextContext = getTextForHtml();
				        doAcceptRequest(acceptTextContext);				       
				    }
				}, {
				    id: btnManualRefreshId,
				    text: configuration.language.labelDialogRefresh,
				    click: function () {
				        $("#btnSwapText_ span").text(configuration.language.labelSettings);
				        $("#btnSwapText_").css("display", "none");
				        $("#btnSaveSettings_").css("display", "none");
				        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'none');
				        $('#load_' + acceptContainerId).css('width', $("#editor_" + acceptContainerId).outerWidth().toString() + "px");
				        $('#load_' + acceptContainerId).css('height', $("#editor_" + acceptContainerId).outerHeight().toString() + "px");
				        $("#mainPlaceHolder_" + acceptDialogId + "").find(".loadmask").css("display", "block");
				        $(".resultsPlaceHolder").css("display", "none");
				        $("#" + btnManualRefreshId).css("display", "none");
				        acceptGenericResponses = [];
				        acceptNonSuggestionGenericResponses = [];
				        doGetResponseStatus(currentChildSessionId, 1, "ACCEPT");
				    }

				}, {
				    id: 'btnSwapText_',
				    text: configuration.language.labelSettings,
				    click: function () {

				        if ($("#editor_" + acceptContainerId).is(':visible')) {
				            hideFlags();
				            $("#mainPlaceHolder_" + acceptDialogId + "").flip({
				                direction: 'tb',
				                color: '#f0f0ee',
				                onBefore: function () {
				                    $('#editorSettings_' + acceptContainerId).css('width', $("#editor_" + acceptContainerId).outerWidth().toString() + "px");
				                    $('#editorSettings_' + acceptContainerId).css('height', $("#editor_" + acceptContainerId).outerHeight().toString() + "px");
				                    $.ifrxmem = $.ifrx;
				                    $.ifrymem = $.ifry;
				                },
				                onAnimation: function () {

				                },
				                onEnd: function () {
				                    if ((wordsLearntPool != null && wordsLearntPool.length > 0) || (rulesLearntPool != null && rulesLearntPool.length > 0))
				                        $("#btnSaveSettings_").css("display", "inline");
				                    $("#" + btnReplaceId).css("display", "none");
				                    if (settings.showFixAll)
				                        $("#" + btnFixAllId).css("display", "none");
				                    if (settings.showManualCheck)
				                        $("#" + btnRefreshId).css("display", "none");
				                    $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'none');
				                    $("#btnSwapText_ span").text(configuration.language.labelEditor);
				                    $("#editor_" + acceptContainerId).css("display", "none");
				                    $('#editorSettings_' + acceptContainerId).css("display", "block");
				                }
				            });
				        }
				        else {
				            $("#mainPlaceHolder_" + acceptDialogId + "").flip({
				                direction: 'bt',
				                color: '#f0f0ee',
				                onBefore: function () {
				                },
				                onAnimation: function () {
				                },
				                onEnd: function () {
				                    $.ifrx = $.ifrxmem;
				                    $.ifry = $.ifrymem;
				                    $("#btnSaveSettings_").css("display", "none");
				                    $("#" + btnReplaceId).css("display", "inline");
				                    if (settings.showFixAll)
				                        $("#" + btnFixAllId).css("display", "inline");
				                    if (settings.showManualCheck)
				                        $("#" + btnRefreshId).css("display", "inline");
				                    $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("#format_" + acceptDialogId + "").css('display', 'block');
				                    $("#btnSwapText_ span").text(configuration.language.labelSettings);
				                    //hide settings 
				                    $('#editorSettings_' + acceptContainerId).css("display", "none"); //$("#editorSettings_div_accept_txtAreaEnglishDemo").css("display", "none");
				                    //show editor
				                    $("#editor_" + acceptContainerId).css("display", "block"); //$("#editor_div_accept_txtAreaEnglishDemo").css("display", "block");
				                }
				            });
				        }
				    }
				},
                {
                    id: btnReplaceId,
                    text: configuration.language.labelDialogReplace,
                    click: function () {
                        cleanHighlightedNodes(true, true);
                        settings.requestFormat == 'TEXT' ? settings.SubmitInputText($acceptContainer.text()) : settings.SubmitInputText($acceptContainer.html());                                               
                        $(this).dialog("close");
                    }
                }]
            }).dialogExtend(settings.displayExtend ? settings.dialogExtendOptions : {});

            $("#" + btnReplaceId).mouseover(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-hover");
            }).mouseout(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
            });
            $("#" + btnRefreshId).mouseover(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-hover");
            }).mouseout(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
            });
            $("#" + btnManualRefreshId).mouseover(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-hover");
            }).mouseout(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
            });
            $("#" + btnFixAllId).mouseover(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only ui-state-hover");
            }).mouseout(function () {
                $(this).removeClass().addClass("ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only");
            });

            //if exist then bind events for checking levels.
            if (settings.checkingLevels.length > 0) {
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input[id^="checkLevel_"]').button();
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input[id^="checkLevel_0"]').button("option", "icons", { primary: "", secondary: "ui-icon-check" });
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input[id^="checkLevel_1"]').button("option", "icons", { primary: "", secondary: "ui-icon-circle-triangle-e" });
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input[id^="checkLevel_2"]').button("option", "icons", { primary: "", secondary: "ui-icon-circle-triangle-e" });
                $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input[id^="checkLevel_"]').click(function () {
                   
                    if ($(this).attr("checked") == true || $(this).attr("checked") == "checked") {
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input:not(#' + this.id + ')[id^="checkLevel_"]').each(function () {
                            $(this).removeAttr('checked').button("refresh");
                        });
                        $.updateRuleSet(settings.checkingLevels[this.id.split('_')[1]].toString());
                        showToolbarMessage(configuration.language.messageRuleSetChanged.replace('@rule@', settings.checkingLevels[this.id.split('_')[1]].toString()), "color:#0E9E4C;display:none;font-weight:bold;", -1);
                        $(this).button("option", "icons", { primary: "", secondary: "ui-icon-check" });
                    }
                    else {
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('input:not(#checkLevel_0)[id^="checkLevel_"]').each(function () {
                            $(this).removeAttr('checked').button("refresh");
                        });
                        $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find('#checkLevel_0').attr('checked', 'checked').button("refresh");
                        $.updateRuleSet(settings.checkingLevels[0].toString());
                        showToolbarMessage(configuration.language.messageRuleSetChanged.replace('@rule@', settings.checkingLevels[0].toString()), "color:#0E9E4C;display:none;font-weight:bold;", -1);
                    }
                    $("#" + btnRefreshId).trigger('click');
                });
            }

            //instantiates and opens the help dialog.
            $("#imgAcceptInfo_" + acceptDialogId).click(function () {

                $("#helpDialog_" + acceptDialogId).dialog("close");
                $("#helpDialog_" + acceptDialogId).dialog("destroy");
                $("#helpDialog_" + acceptDialogId).dialog({
                    resizable: true,
                    open: function (event, ui) {
                        $("#acceptHelpButton_" + acceptDialogId).button().unbind('mouseover').css('cursor', 'default');
                        $("#acceptHelpSettingsButton_" + acceptDialogId).button().unbind('mouseover').css('cursor', 'default');

                        $("#acceptHelpCloseButton_" + acceptDialogId).button().unbind('mouseover').css('cursor', 'default');

                        if (settings.showFixAll) {
                            $("#acceptReplaceAllButton_" + acceptDialogId).button().unbind('mouseover').css('cursor', 'default');
                            $("#replaceAllHelpRow_" + acceptDialogId).css('display', '');
                        }
                        else
                            $("#replaceAllHelpRow_" + acceptDialogId).css('display', 'none');

                        if (settings.checkingLevels.length > 0) {
                            $("#checkingLevelsHelpRow_" + acceptDialogId).css('display', '');
                            $("#checkingLevelsHelpRow_" + acceptDialogId).find('input').button();
                            $("#checkingLevelsHelpRow_" + acceptDialogId).find('*').css('cursor', 'default');
                            $("#checkingLevelsHelpRow_" + acceptDialogId).css('cursor', 'default');
                        }

                        if (settings.showManualCheck) {
                            $("#acceptHelpManualCheckButtonRow_" + acceptDialogId).css('display', '');
                            $("#acceptHelpManualCheckButton_" + acceptDialogId).button();
                            $("#acceptHelpManualCheckButton_" + acceptDialogId).css('cursor', 'default');
                        }

                        $('div[aria-labelledby=ui-dialog-title-helpDialog_' + acceptDialogId + ']').find('.ui-dialog-buttonpane').append('<img id="' + imgDialogTitleId + '" style="margin-top:5px;margin-right:15px" src="' + settings.imagesPath + '/accept_globe.png" alt="ACCEPT" /><br /><span style="font-size: 0.8em;width: 100%;">' + configuration.language.labelHelpAcceptMessage + '</span>');

                    },
                    width: 600,
                    height: 'auto',
                    modal: false,
                    buttons: {
                        "Ok": function () {
                            $("#helpDialog_" + acceptDialogId).dialog("close");
                            $("#helpDialog_" + acceptDialogId).dialog("destroy");
                        }
                    }
                });

            });
           
            //hide buttons pane by default.
            $('div[aria-labelledby=ui-dialog-title-' + acceptDialogId + ']').find('.ui-dialog-buttonpane').find("button").css("display", "none");

            //check if tiny mce iframe is loaded and accessible.
            if ($("#mainPlaceHolder_" + acceptDialogId + "").find('#' + 'editArea_' + acceptContainerId + '_ifr').length)
                doWork();
            else {
                var checkExistMain = setInterval(function () {
                    if ($("#mainPlaceHolder_" + acceptDialogId + "").find('#' + 'editArea_' + acceptContainerId + '_ifr').length) {
                        doWork()
                        clearInterval(checkExistMain);
                    }
                }, 100);
            }
        }
        
        //various tasks are performed within this scope: some jquery caching, some files added to tiny mce iframe, some content pre-processing and the actual ajax call to process the content.
        function doWork() {            
            //cache main container object.
            $acceptContainer = $("#mainPlaceHolder_" + acceptDialogId + "").find('#' + 'editArea_' + acceptContainerId + '_ifr').contents().find("#tinymce");
            //cache iframe object plus left and right offsets.
            $iframe = $("#mainPlaceHolder_" + acceptDialogId + "").find('#' + 'editArea_' + acceptContainerId + '_ifr');
           
            $.refreshIframePosition();            
            $toolbarUserInfoPlaceholder = $("#mainPlaceHolder_" + acceptDialogId + "").find(settings.cssSelectorToolbarMessage);//"td.mceStatusbar"                       
            $(window).bind('scrollstop', function (e) {
                $.refreshIframePosition();
            });
            $iframe.contents().find('body').bind('scrollstop', function (e) {
                $.refreshIframePosition();
            });

            //add necessary css to the iframe, otherwise is not visible within the iframe scope.
            var $head = $iframe.contents().find("head");
            $head.append($("<link/>", { rel: "stylesheet", href: "" + settings.styleSheetPath + "/Accept.css", type: "text/css" }));
            $head.append('<meta http-Equiv="Cache-Control" Content="no-cache">');
            $head.append('<meta http-Equiv="Pragma" Content="no-cache">');
            $head.append('<meta http-Equiv="Expires" Content="0">');

            //loading content to process.           
            $('#htmlPlaceHolderDiv_' + acceptDialogId).html(settings.LoadInputText());
            prepareHtmlContent(true);
            acceptTextContext = getTextForHtml();
            
            doAcceptRequest(acceptTextContext);
        }

        //displays a given text message within the tiny mce editor toolbar, the message style and display period can be passed as parameters.
        function showToolbarMessage(message, style, delay) {
            $toolbarUserInfoPlaceholder.empty();
            $toolbarUserInfoPlaceholder.append('<span style="' + style + '" id="spanInfoMessage_">' + message + '</span>');
            $toolbarUserInfoPlaceholder.css("display", "block");          
            $toolbarUserInfoPlaceholder.find('#spanInfoMessage_').fadeIn();
            if (delay > 0) {
                setTimeout(function () {
                    $toolbarUserInfoPlaceholder.find('#spanInfoMessage_').fadeOut();                    
                }, delay);
            }
        }

        //loads the content into the final placeholder(either within the dialog tiny mce editor iframe body or where it is being pointed at).
        function prepareHtmlContent(replaceBrTags) {
            
            $acceptContainer.html($('#htmlPlaceHolderDiv_' + acceptDialogId).html());
            
            $acceptContainer.find(settings.htmlBlockElements).each(function () {               
                $('<span class="accept-container-line-separator">\n</span>').insertAfter(this);
            });

            $acceptContainer.find('a').click(function (e) {
                e.preventDefault();
            });

        }

        //iterates the content placeholder to get only the text to process (html content is stripped and only text is sent through process). 
        function getTextForHtml() {
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

                $acceptContainer.html($acceptContainer.html());
                $acceptContainer.getInnerTextFromHtml();

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
            var stimeStampString = flagAudit.timeStamp.getUTCFullYear() + "/" + (flagAudit.timeStamp.getUTCMonth() + 1) + "/" + flagAudit.timeStamp.getUTCDate() + " " + flagAudit.timeStamp.getUTCHours() + ":" + flagAudit.timeStamp.getUTCMinutes() + ":" + flagAudit.timeStamp.getUTCSeconds();
            var jsonData = "";
            if ($.browser.msie) {
                jsonData = {
                    "globalSessionId": "" + globalSessionId + "",
                    "flag": "" + encodeURIComponent(flagAudit.flag) + "",
                    "userAction": "" + encodeURIComponent(flagAudit.action) + "",
                    "actionValue": "" + encodeURIComponent(flagAudit.actionValue) + "",
                    "ignored": "" + encodeURIComponent(flagAudit.ignored) + "",
                    "name": "" + flagAudit.name + "",
                    "textBefore": "" + encodeURIComponent(flagAudit.textBefore) + "",
                    "textAfter": "" + encodeURIComponent(flagAudit.textAfter) + "",
                    "timeStamp": "" + encodeURIComponent(stimeStampString) + "",
                    "jsonRaw": "" + flagAudit.rawJson + "",
                    "privateId": "" + (flagAudit.privateId.length > 0 ? flagAudit.privateId.hashCode() : flagAudit.privateId).toString() + ""
                };
                var xdr = new XDomainRequest();
                xdr.open("POST", settings.AcceptServerPath + "/Core/AuditFlag");
                xdr.onload = function (){}
                xdr.onerror = function (){};
                xdr.onprogress = function (){};
                xdr.ontimeout = function (){};
                xdr.onopen = function (){};
                xdr.timeout = settings.timeoutWaitingTime;
                xdr.send(JSON.stringify(jsonData));
            }
            else {
                jsonData = '{"globalSessionId":"' + globalSessionId + '","flag":"' + encodeURIComponent(flagAudit.flag) + '"' + ', "userAction":"' + encodeURIComponent(flagAudit.action) + '", "actionValue":"' + encodeURIComponent(flagAudit.actionValue) + '", "ignored":" ' + encodeURIComponent(flagAudit.ignored) + '", "name":"' + flagAudit.name + '", "textBefore":"' + encodeURIComponent(flagAudit.textBefore) + '", "textAfter":"' + encodeURIComponent(flagAudit.textAfter) + '", "timeStamp":"' + encodeURIComponent(stimeStampString) + '", "jsonRaw":"' + flagAudit.rawJson + '", "privateId":"' + (flagAudit.privateId.length > 0 ? flagAudit.privateId.hashCode() : flagAudit.privateId).toString() + '"}';
                $.ajax({
                    type: 'POST',
                    url: settings.AcceptServerPath + "/Core/AuditFlag",
                    contentType: "application/json",
                    success: function (data) {},
                    complete: function () {},
                    error: function () {},
                    data: jsonData,
                    cache: false,
                    async: true
                });
            }
        }

        //expects the final state of the text content within the annotations placeholder and the timestamp.
        function submitFinalAudit(finalText, finalTimeStamp) {
            var stimeStampString = finalTimeStamp.getUTCFullYear() + "/" + (finalTimeStamp.getUTCMonth() + 1) + "/" + finalTimeStamp.getUTCDate() + " " + finalTimeStamp.getUTCHours() + ":" + finalTimeStamp.getUTCMinutes() + ":" + finalTimeStamp.getUTCSeconds();
            var jsonData = "";
            if ($.browser.msie) {
                jsonData = {
                    "globalSessionId": "" + globalSessionId + "",
                    "textContent": "" + finalText + "",
                    "timeStamp": "" + encodeURIComponent(stimeStampString) + ""
                };
                var xdr = new XDomainRequest();
                xdr.open("POST", settings.AcceptServerPath + "/Core/AuditFinalContext");
                xdr.onload = function () {
                }
                xdr.onerror = function () {
                };
                xdr.onprogress = function () { };
                xdr.ontimeout = function () { };
                xdr.onopen = function () { };
                xdr.timeout = settings.timeoutWaitingTime;
                xdr.send(JSON.stringify(jsonData));
            }
            else {                
                jsonData = '{"globalSessionId":"' + globalSessionId + '","textContent":"' + finalText + '"' + ', "timeStamp":"' + encodeURIComponent(stimeStampString) + '"}';
                $.ajax({
                    type: 'POST',
                    url: settings.AcceptServerPath + "/Core/AuditFinalContext",
                    contentType: "application/json charset=\"utf-8\"",
                    success: function (data) {
                    },
                    complete: function () { },
                    error: function () {
                    },
                    data: jsonData,
                    cache: false,
                    async: true
                });
            }
        }

        //does the actual accept request.
        function doAcceptRequest(text) {
            if (text != null && text.length > 0) {
                var jsonData;
                var call;

                if ($.browser.msie) {
                    if (globalSessionId != null && globalSessionId.length > 0)
                        jsonData = getData(text, true);
                    else
                        jsonData = getData(text, false);
                    call = settings.AcceptServerPath + "/Core/AcceptRequest";
                    var xdr = new XDomainRequest();
                    xdr.open("POST", call);
                    xdr.onload = function () {
                        handleRequestStatus(xdr.responseText, "ACCEPT");
                    };
                    xdr.onerror = function () {
                        displayFailedMessage("ACCEPT", configuration.language.errorRequestFailed);
                    };
                    xdr.onprogress = function () { };
                    xdr.ontimeout = function () { displayFailedMessage("ACCEPT", configuration.language.errorRequestFailed); };
                    xdr.onopen = function () { };
                    xdr.timeout = settings.timeoutWaitingTime;
                    xdr.send(JSON.stringify(jsonData));

                }
                else {
                    if (globalSessionId != null && globalSessionId.length > 0)                        
                        jsonData = '{"ApiKey":"' + settings.ApiKey + '","GlobalSessionId":"' + globalSessionId + '", Text:"' + text + '", Language:"' + settings.Lang + '", Rule:" ' + settings.Rule + '", Grammar:"' + checkGrammar + '", Spell:"' + checkSpelling + '", Style:"' + checkStyle + '", SessionMetadata:"' + buildSessionMetadata() + '", RequestFormat:"' + settings.requestFormat + '"}';
                    else                    
                        jsonData = '{"ApiKey":"' + settings.ApiKey + '", "Text":"' + text + '", "Language":"' + settings.Lang + '", "Rule":" ' + settings.Rule + '", "Grammar":"' + checkGrammar + '", "Spell":"' + checkSpelling + '", "Style":"' + checkStyle + '", SessionMetadata:"' + buildSessionMetadata() + '", "RequestFormat":"' + settings.requestFormat + '"}';


                    $.ajax({
                        url: settings.AcceptServerPath + "/Core/AcceptRequest",
                        dataType: 'json',
                        contentType: "application/json",
                        type: "POST",
                        async: true,
                        cache: true,
                        data: jsonData,
                        success: function (data) {
                            handleRequestStatus(data, "ACCEPT");
                        },
                        complete: function (data) { },
                        error: function (error) {
                            displayFailedMessage("ACCEPT", configuration.language.errorRequestFailed);
                        }
                    });
                }
            }
            else {
                $("#" + acceptDialogId + "").dialog("close");
                alert(configuration.language.noInputTextMessage);
            }
        }

        //when getting the ack the accept response is ready this method is called to collect the results set.
        function doGetResponse(sessionid, currentcontext) {
            var call = settings.AcceptServerPath + "/Core/GetResponseJsonP?session=" + encodeURIComponent(sessionid) + "&callback=?";            
            if ($.browser.msie) {
                var xdr = new XDomainRequest();
                xdr.open("GET", call);
                xdr.onerror = function () {
                    displayFailedMessage(currentcontext, configuration.language.errorRequestFailed);
                }
                xdr.onload = function () {
                    handleResponseStatus(xdr.responseText, currentcontext);
                };
                xdr.onprogress = function () { };
                xdr.ontimeout = function () { };
                xdr.onopen = function () { };
                xdr.send();
            }
            else {
                $.ajax({
                    type: 'GET',
                    url: call,
                    dataType: 'jsonp',
                    success: function (data) {
                        handleResponseStatus(data, currentcontext);
                    },
                    complete: function () { },
                    error: function () {
                        displayFailedMessage(currentcontext, configuration.language.errorRequestFailed);
                    },
                    data: {},
                    cache: false,
                    async: false
                });

            }
        }

        //requests the status of a given accept request.
        function doGetResponseStatus(sessionid, newattempt, currentcontext) {
            var call = settings.AcceptServerPath + "/Core/GetResponseStatusJsonP?session=" + encodeURIComponent(sessionid) + "&callback=?";
            if ($.browser.msie) {
                var xdr = null;
                xdr = new XDomainRequest();
                xdr.open("GET", call);
                xdr.onload = function () {
                    parseResponseStatus(xdr.responseText, sessionid, ++newattempt, currentcontext);
                };
                xdr.onerror = function () {
                    displayFailedMessage(currentcontext, configuration.language.errorRequestFailed);
                };
                xdr.onprogress = function () {
                };
                xdr.ontimeout = function () {
                };
                xdr.onopen = function () {
                };
                xdr.timeout = settings.timeoutWaitingTime;
                xdr.send();
            }
            else {
                $.ajax({
                    type: 'GET',
                    url: call,
                    dataType: 'jsonp',
                    success: function (data) {
                        parseResponseStatus(data, sessionid, ++newattempt, currentcontext);
                    },
                    complete: function () { },
                    error: function () {
                        displayFailedMessage(currentcontext, configuration.language.errorRequestFailed);
                    },
                    data: {},
                    cache: false,
                    async: false
                });
            }
        }


        //plug-in tiny mce specific methods:

        //given the proper selector under parameter 'inst' it removes all tiny mce specifics from the DOM.
        function removeTinyMCE(inst) {
            tinyMCE.execCommand('mceRemoveControl', false, inst);
        }            

        //loads the tiny mce editor over the text-area within the external (jquery ui) dialog.
        function loadOnTheFlyEditTextEditor() {
            $.AcceptTinyMceEditor = tinyMCE.init({
                mode: 'exact', elements: 'editArea_' + acceptContainerId + '',
                object_resizing: true,
                menubar: false,
                statusbar: true,
                resize: 'both',
                toolbar: false,
                entity_encoding: "raw",
                plugins: "",
                custom_undo_redo_keyboard_shortcuts: false,
                width: settings.editorWidth,
                height: settings.editorHeight,
                setup: function (ed) {
                    ed.on('KeyDown', function (e) {
                        var evtobj = window.event ? event : e
                        if (evtobj.keyCode == 90 && evtobj.ctrlKey) {
                            window.event.preventDefault();
                        }
                    }),
                    ed.on('KeyUp', function (e) {                     
                        hideFlags();
                        if ((e.keyCode < 36) || (e.keyCode > 40)) {                          
                            var currentNode = tinyMCE.activeEditor.selection.getNode();
                            if (currentNode.id.indexOf("spncontext_") === 0 || currentNode.id.indexOf("spnToolTip_") === 0) {
                                $acceptContainer.find('span[id^=' + currentNode.id.split('_')[0] + '_' + currentNode.id.split('_')[1] + '_' + currentNode.id.split('_')[2] + ']').each(function () {

                                    $(this).unbind();
                                    $(this).css("background-color", "");
                                    $(this).attr("class", "");
                                    removeKeepChildren(this);
                                });

                                if ($acceptContainer.find('span[class^="accept-highlight"]').length <= 0)
                                    showNoResultsDialog();
                            }
                            else
                                if (currentNode.className.indexOf("accept-highlight") === 0)
                                    currentNode.removeAttribute("class");
                        }

                        e.stopPropagation();
                    });
                }
            });
        }

        //loads tiny mce editor when embedded configuration is set.
        function loadTextEditor()
        {
            var editor = $('#' + acceptObjectId).tinymce({
                //toolbar: true,
                menubar: false,
                statusbar: false,
                toolbar: ['bold | italic | underline | separator | justifyleft | justifycenter | justifyright | separator | undo,redo,separator | btnTinyMceAccept_' + acceptObjectId + ''],
                setup: function (ed) {
                    ed.addButton('btnTinyMceAccept_' + acceptObjectId, {
                        'title': configuration.language.tinyButtonMCETooltip,    
                        'image': settings.imagesPath + '/actions-tools-check-spelling-icon.png',
                        'onclick': function () {
                            checkGrammar = "1";
                            checkSpelling = "1";
                            checkStyle = "1";
                            createAcceptDialog();
                        }
                    });
                }
            });
        }


        //plug-in html injections:

        //injects the necessary html for the end user settings container.
        function buildSettingsPlaceHolder() {
            $('#editorSettings_' + acceptContainerId).empty().append('<div class="container" style="width:auto;margin-right:0px;margin-left:0px;">' +
            '<div class="row"><div class="left"><table id="learntWordsTable" class="acceptSettingsTable"><thead> <tr><th colspan="2">' + configuration.language.labelLearntWords + '</th></tr></thead><tbody><tr><td colspan="2">' + configuration.language.labelNoWordsLearnt + '</td></tr></tbody></table></div>' +
            '<div class="middle"><table id="learntRulesTable" class="acceptSettingsTable"><thead><tr><th colspan="2">' + configuration.language.labelIgnored + '</th></tr></thead><tbody><tr><td colspan="2">' + configuration.language.labelNoRulesIgnored + '</td></tr></tbody></table></div>' +
            '</div></div>');
        }

        //plug-in initialization methods:

        //load and init language settings.
        function initLanguageUi() {
            
            if ($.browser.msie) {
                var xdr = new XDomainRequest();
                xdr.open("GET", settings.configurationFilesPath + '/accept-jquery-plugin-3.0-config-' + settings.uiLanguage.toString() + '.json');
                xdr.onerror = function () {}
                xdr.onload = function () {
                 
                    configuration = JSON.parse(xdr.responseText);
                    initLocalStorageAndRuleSets();
                    initAccept();
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
                        initAccept();
                    },
                    error: function (e) { },
                });

            }

        }

        //set the names for local storage repositories and define rule set to use.
        function initLocalStorageAndRuleSets() {
            if (settings.Lang == "fr") {
                labelLocalStorageRules = "rulesLearntPool_fr";
                labelLocalStorageWords = "wordsLearntPool_fr";
            }
            else
                if (settings.Lang == "de") {
                    labelLocalStorageRules = "rulesLearntPool_de";
                    labelLocalStorageWords = "wordsLearntPool_de";
                }

            if (settings.Rule == '') {
                if (settings.Lang == "fr")
                    settings.Rule = "Preediting_Forum";
                else
                    if (settings.Lang == "de")
                        settings.Rule = "Preediting-DE-EN";
                    else
                        settings.Rule = "Preediting_Forum";
            }
        }

        //init plug-in.         
        function initAccept() {
            
            //initLanguageUi();
            
            //if ($.browser.msie || $.browser.mozilla)
            //    jQuery.support.cors = true;

            $.cleanPluginData();

            $(document.body).append('<ul id="' + mainContextMenuId + '" class="contextMenu"><li class="accept"><a href="#accept">' + configuration.language.labelCtxMenuAccept + '</a></li><li class="grammar"><a href="#grammar">' + configuration.language.labelCtxMenuGrammar + '</a></li><li class="spell"><a href="#spell">' + configuration.language.labelCtxMenuSpelling  + '</a></li><li class="style"><a href="#style">' + configuration.language.labelCtxMenuStyle  + '</a></li>	<li class="accept_close"><a href="#accept_close">' + configuration.language.labelCtxMenuClose + '</a></li></ul>');
            $(document.body).append('<div id="' + acceptDialogId + '" title="Accept" style="display:none;"><div id="mainPlaceHolder_' + acceptDialogId + '">' +
            '<div id="load_' + acceptContainerId + '" class="loadmask"  style="position:relative; display:block; vertical-align:middle; text-align:center;top:0%;min-width:' + settings.placeHolderMinWidth + 'px;min-height:' + settings.placeHolderMinHeight + 'px;">' +
            '<img style="vertical-align:middle; text-align:center;margin-top:5%" alt="' + configuration.language.labelPleaseWait + '" src="' + settings.imagesPath + '/ajax-loader.gif" />' +
            '</div><div class="resultsPlaceHolder" id="' + acceptContainerId + '" style="display:none;text-align: justify;padding:5px;min-height:' + settings.placeHolderMinHeight + 'px;min-width:' + settings.placeHolderMinWidth + 'px;max-height:' + settings.placeHolderMaxHeight + 'px;max-width:' + settings.placeHolderMaxWidth + 'px;"></div>' +
            '<div class="resultsPlaceHolder" id="editor_' + acceptContainerId + '" style="display:none;text-align: justify;padding:5px;min-height:' + settings.placeHolderMinHeight + 'px;min-width:' + settings.placeHolderMinWidth + 'px;max-height:' + settings.placeHolderMaxHeight + 'px;max-width:' + settings.placeHolderMaxWidth + 'px;"><textarea id="editArea_' + acceptContainerId + '"></textarea></div>' +
            '<div class="resultsPlaceHolder" id="editorSettings_' + acceptContainerId + '" style="display:none;text-align: justify;margin:0px;padding:0px;min-height:' + settings.placeHolderMinHeight + 'px;min-width:' + settings.placeHolderMinWidth + 'px;max-height:' + settings.placeHolderMaxHeight + 'px;max-width:' + settings.placeHolderMaxWidth + 'px;"></div>' +
            '</div></div>');
            $(document.body).append('<div id="htmlPlaceHolderDiv_' + acceptDialogId + '" style="display:none;"></div>');
            $(document.body).append('<div id="helpDialog_' + acceptDialogId + '" title="' + configuration.language.labelHelpDialogTitle + '" style="display:none;text-align: justify;">'
            + '<table class="acceptSettingsTable">'
            + '<tr><td style="vertical-align: middle;padding-left: 10px;"><span class="accept-highlight" style="text-align:center;cursor:default;">Notron</span></td><td style="padding:5px;">' + configuration.language.helpRuleWithSuggestion + '</td></tr>'
            + '<tr><td style="vertical-align: middle;width: 70px;text-align: center;"><span class="accept-highlight-tooltip" style="text-align:center;cursor:default;">' + configuration.language.helpLongSentence + '</span></td><td style="padding:5px;">' + configuration.language.helpRuleWithNoSuggestion + '</td></tr>'
            + '<tr><td style="vertical-align: middle;padding-left: 10px;"><input id="acceptHelpButton_' + acceptDialogId + '" style="margin-right:5px;" type="button" value="' + configuration.language.labelDialogReplace + '" /></td><td style="padding:5px;">' + configuration.language.helpApplyButton + '</td></tr>'
            + '<tr><td style="vertical-align: middle;padding-left: 10px;"><input id="acceptHelpSettingsButton_' + acceptDialogId + '" style="margin-right:5px;" type="button" value="' + configuration.language.labelSettings + '" /></td><td style="padding:5px;">' + configuration.language.helpSettingsDescription + '</td></tr>'
            + '<tr id="acceptHelpManualCheckButtonRow_' + acceptDialogId + '" style="display:none"><td style="vertical-align: middle;padding-left: 10px;"><input id="acceptHelpManualCheckButton_' + acceptDialogId + '" style="margin-right:5px;" type="button" value="' + configuration.language.labelManualCheck + '" /></td><td style="padding:5px;">' + configuration.language.helpManualCheck + '</td></tr>'
            + '<tr><td style="vertical-align: middle;padding-left: 10px;"><input id="acceptHelpCloseButton_' + acceptDialogId + '" style="margin-right:5px;" type="button" value="' + "x" + '" /></td><td style="padding:5px;">' + configuration.language.helpCloseButton + '</td></tr>'
			+ '<tr id="replaceAllHelpRow_' + acceptDialogId + '" style="display:none"><td style="vertical-align: middle;padding-left: 10px;"><input id="acceptReplaceAllButton_' + acceptDialogId + '" style="margin-right:5px;" type="button" value="' + configuration.language.labelDialogFixAll + '" /></td><td style="padding:5px;">' + configuration.language.helpReplaceAllDescription + '</td></tr>'
            + '<tr id="checkingLevelsHelpRow_' + acceptDialogId + '" style="display:none"><td style="vertical-align: middle;padding-left: 10px;"><input id="help_checkLevel"  type="checkbox" style="display:none;"  checked="" /><label title="' + settings.checkingLevels[0] + '" for="help_checkLevel">1</label><span style="position: relative;width: 15px;display: inline-block"><img width="15px" style="position: absolute;bottom: 0.3px;" height="8px" src="' + settings.imagesPath + '/arrowResized.png" alt=""></span><input id="help_checkLevel_2"  type="checkbox" style="display:none;"  checked="" /><label title="' + settings.checkingLevels[1] + '" for="help_checkLevel_2">2</label></td><td style="padding:5px;">' + configuration.language.labelRemove + '</td></tr>'
            + '</table>'
            + '</div>');

            if (settings.configurationType == "externalCall")
                $.injectAcceptButton(settings.injectSelector, settings.triggerCheckSelector, settings.injectContent, settings.injectWaitingPeriod);
            else
                if (settings.configurationType == "tinyMceEmbedded") 
                    loadTextEditor();                                                                         
        };

        //plug-in methods to highlight annotations:

        //binds mouse over and mouse out events to a given final node(this node is a final node because in this case there are multiple nodes to highlight), then as a result a matching tooltip will be either displayed or hidden. 
        function addTriggerEventToContextNode(node, nodeIdToTrigger, eventToBind, eventToTrigger, ruleName, ruleUniqueId, jsonRaw) {
            if (eventToBind == 'click') {
                var myclick = $iframe.contents().find('#' + nodeIdToTrigger).data("events").click[0];
                if (myclick != null)
                    $($(node)).click(myclick);
            }
            else {
                $($(node)).mouseover(function (e) {
                    sendAuditFlagGeneric("", labelActionDisplayTooltip, "", "", ruleUniqueId, "", "", "", jsonRaw, nodeIdToTrigger);
                    $("#toolTip_" + nodeIdToTrigger + "").unbind('delay');
                    hideFlags();
                    autoHideToolTip = false;
                    var startLeft = 0;
                    var startTop = 0;
                    var coordinates = null;
                    var obj = $acceptContainer.find('SPAN').filter('#' + nodeIdToTrigger);
                    coordinates = $.findTotalOffset(obj[0]);
                    startLeft = coordinates.left + $(window).scrollLeft();
                    startTop = coordinates.top + $(window).scrollTop();
                    $.refreshIframePosition();
                    startLeft += $.ifrx;
                    startTop += $.ifry;
                    $("#toolTip_" + nodeIdToTrigger + "").css({ top: startTop + 10, left: startLeft + 20 });
                    $("#toolTip_" + nodeIdToTrigger + "").css('display', 'block');
                    $(this).css('background-color', 'yellow');
                    $iframe.contents().find('#' + nodeIdToTrigger).css('background-color', 'yellow');
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
                    $iframe.contents().find('#' + nodeIdToTrigger).css('background-color', '');
                    $("#toolTip_" + nodeIdToTrigger + "").delay(3000, function () {
                        if (autoHideToolTip)
                            $("#toolTip_" + nodeIdToTrigger + "").css('display', 'none');
                    });
                });
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

            if (!$iframe.contents().find('#' + elementId).data('events')) {
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
                            showToolbarMessage(configuration.language.messageRuleLearnt.replace("@rule@", ruleName), "color:#0E9E4C;display:none;font-weight:bold;", 3000);
                            //update rules table.
                            updateLearntRulesToSettingsPlaceHolder();
                            //log user ignored a rule.
                            sendAuditFlagGeneric("", labelActionIgnoreRule, "", "", ruleUniqueId, "", "", "", jsonRaw, elementId);
                            //remove ignored rule copies.                          
                            var $nodesWithSameRuleName = $("span.unique-rule-name-tooltip").filter(function () {
                                return $(this).text() == ruleUniqueId;
                            }).parent();
                            $nodesWithSameRuleName.each(function () {
                                var idSplitted = this.id.split('_');
                                var $nodesToRemove = $acceptContainer.find('span[id^="spnToolTip_' + idSplitted[2] + '_' + idSplitted[3] + '"]');
                                $nodesToRemove.each(function () {
                                    removeKeepChildren($(this));
                                });
                            });

                        }
                        $acceptContainer.find('span[id^="' + this.id.toString().substring(6, this.id.length).replace("_final", "") + '"]').each(function () {
                            removeKeepChildren($(this));
                        });
                        if ($acceptContainer.find('span[class^="accept-highlight"]').length <= 0)
                            showNoResultsDialog();
                        hideFlags();
                    });
                }

                $acceptContainer.find('SPAN').filter('#' + elementId).mouseover(function (e) {
                    sendAuditFlagGeneric("", labelActionDisplayTooltip, "", "", ruleUniqueId, "", "", "", jsonRaw, elementId);
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
                    $iframe.contents().find('span[id^="' + elementId.split('_')[0] + '_' + elementId.split('_')[1] + '_' + elementId.split('_')[2] + '"]').css('background-color', 'yellow');
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
                    $iframe.contents().find('span[id^="' + elementId.split('_')[0] + '_' + elementId.split('_')[1] + '_' + elementId.split('_')[2] + '"]').css('background-color', '');

                    $("#toolTip_" + elementId + "").delay(3000, function (e) {
                        if (autoHideToolTip)
                            $("#toolTip_" + elementId + "").css('display', 'none');
                    });
                }).mousemove(function (e) {
                }).mouseenter(function (e) {
                    $iframe.contents().find('.acm-default').css('display', 'none');
                });
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
                    //var inputText = node.data.replace(/[↵]/gi, '\n');
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

        //highlights a piece of text and binds a tooltip to it given: the indexes(startpos and endpos), the word itself(pat), the type of element that will wrap the word(elementtype) and the identifier(ruleUniqueId). 
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
                    //var inputText = node.data.replace(/[↵]/gi, '\n');
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
                                //update the final position
                                var finalpos = pos + pat.length;
                                while (pos != -1) {
                                    pos = aux.indexOf(pat);
                                    finalpos = finalpos + pos;
                                    if ((pos + currentindexcount) == startpos) {
                                        addSplittedNode(node, finalpos, pat.length, elementtype, cssStyles[stylesIndex], elementId);
                                        //BindToolTip(spannode);
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
             
        //kick off plug-in.
        initLanguageUi(); //initAccept();

    }//plug-in core
    
})(jQuery);

//dependencies - context menu
(function ($) {

    var _menus;
    var isFirefox = typeof InstallTrigger !== 'undefined';
    var isIE = false || !!document.documentMode;

    $(document).bind("click", function () {
        $("ul.acm-default").hide();            
    });

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
            $self.bind(_menus[id].event, function (e)
            {
                $("ul.acm-default").css("display", "none");
                var evt = e || window.event;
                var tgt = evt.target || evt.srcElement;
                try {
                    var rect = tgt.getClientRects();
                    if (rect.length > 0) {
                        if (_menus[id].beforeDisplay) {
                            if (_menus[id].beforeDisplay.apply(this, [e, _menus[id].context[0], id]) == false) {
                                return false;
                            }
                        }
                        var left = 0;
                        var top = 0;
                        if (_menus[id].getCustomOffset().left) {
                            var customOffsets = _menus[id].getCustomOffset(this, [e, _menus[id].context[0], id]);
                            left = customOffsets.left + rect[0].left;
                            top = customOffsets.top + rect[0].top;
                        } else {
                            left = rect[0].left;
                            top = rect[0].top;
                        }
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

                var left = 0;
                var top = 0;

                if (_menus[id].getCustomOffset().left) {
                    var customOffsets = _menus[id].getCustomOffset(this, [e, _menus[id].context[0], id]);                    
                    left = customOffsets.left + spanOffset.left;
                    top = customOffsets.top + spanOffset.top;
                } else
                {                 
                    left = spanOffset.left;
                    top = spanOffset.top;
                }

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

}(jQuery));

//dependencies - local storage
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
                } catch (e){}
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



