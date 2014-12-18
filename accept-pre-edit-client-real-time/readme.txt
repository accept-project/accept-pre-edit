Overview
========

This other jQuery plug-in is called ACCEPT Pre-Edit Real-time plug-in and in practice it is actually a lightweight version of the already developed ACCEPT Pre-Edit plug-in. 
This version besides more lightweight in the way it is not using an external dialog, it provides:

-	Real-time experience using a Web Sockets pipeline: meaning the client no longer needs to constantly pool the server trying to know if the content is ready or not. 
	The Web Server will send data back to clients as soon as it is ready.
	
-	Multiple text placeholder selection through the plug-in configuration: by using a Server side Parallel processing mechanism. 
	
Use case:

In the integration with the ACCEPT Post-Edit plug-in, it is being used to process all Post-Edit project segments in one go(the functionality is called - Interactive Check).   

Instantiation and Configuration
===============================

Before the plug-in configuration, these two script references need to be resolved:


	  <script src="[ACCEPT_API_URL]/Scripts/jquery.signalR-2.1.1.js"></script>
      <script src="[ACCEPT_API_URL]/SignalR/hubs"></script> 

Note: if you're using HTTPS for your API and HTTP for your plug-in environment(or vice versa), it might cause a recent browsers common security exception - mix content detected.

Since the Real Time plug-in is itself a jQuery plug-in, some prior configuration is also needed. 

The three main parameters are:

(string) interactiveCheckConfigPath – The configuration path allows the Real time plug-in load his labels from a JSON based configuration file.
(string) acceptHubUrl – Endpoint where to access the ACCEPT API(URI for the MS Signal R Hub...).
(string) realTimeCheckSelector - the CSS selector for the element that "onClick" starts the checks(normally a button...).

There are other also important:

(string) contentLanguage - the content language.
(string) uiLanguage - the language which informative labels or text will be presented to users.
(string) processingRuleSet - the rule set that the ACCEPT API will use to process the content.
(JavaScript function) onAfterCheck - custom method that can be passed as parameter to perform a custom action after all paralell processing is finished.
(JavaScript function) onBeforeCheck - custom method that can be passed as parameter to perform a custom action before checking the content.
(JavaScript function) onReplace - custom method that can be passed as parameter to perform a custom action when a flag is used(user clicks options within the context-menu).
(JavaScript function) onBeforeDisplayingContextMenus - custom method that can be passed as parameter to perform a custom action immediately before a flag is displayed.

Some useful Tip's:
==================

-	Same Origin policy:

"XMLHttpRequest cannot load [...config/lang/accept-jquery-plugin-3.0-config-en.json.] 
No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'null' is therefore not allowed access."

Make sure you're not trying to setup the configuration file path "interactiveCheckConfigPath" using a different domain from you're loading the plug-in.
Tweaking the browser Same Origin Policy setting can be used to bypass this security measure but is not advisable.

- Signal R Scripts:

Make sure you setup the Signal R related scripts injection in the same order used in the Example provided. 


-	ACCEPT API:

Make sure your ACCEPT API instance is up and running, plus, check if the Signal R dynamic proxy is generated:

[HTTP/HTTPS][ACCEPT_API_URL]/SignalR/hubs



