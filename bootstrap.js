/* ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 * 
 * Contributor(s):
 *   Diego Casorran <dcasorran@gmail.com> (Original Author)
 * 
 * ***** END LICENSE BLOCK ***** */

let { classes:Cc,interfaces:Ci,utils:Cu,results:Cr } = Components;
let { Services, btoa, atob } = Cu.import("resource://gre/modules/Services.jsm", {});
let { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm", {});
let addon, scope = this;

function rsc(n) 'resource://' + addon.tag + '/' + n;
function LOG(m) (m = addon.name + ' Message @ '
	+ (new Date()).toISOString() + "\n> " + m,
		dump(m + "\n"), Services.console.logStringMessage(m));

let DevPrefs = {
	"javascript.options.strict"             : true,
	"extensions.sdk.console.logLevel"       : "info",
	"extensions.installDistroAddons"        : false,
	"extensions.getAddons.cache.enabled"    : false,
	"javascript.options.showInConsole"      : true,
	"extensions.update.enabled"             : false,
	"extensions.testpilot.runStudies"       : false,
	"app.update.enabled"                    : false,
	"extensions.update.notifyUser"          : false,
	"browser.shell.checkDefaultBrowser"     : false,
	"extensions.checkCompatibility.nightly" : false,
	"urlclassifier.updateinterval"          : 172800,
	"browser.sessionstore.resume_from_crash": false,
	"browser.warnOnQuit"                    : false,
	"browser.tabs.warnOnClose"              : false,
	"browser.dom.window.dump.enabled"       : true,
	"extensions.enabledScopes"              : 5,
	"extensions.autoDisableScopes"          : 10,
	"devtools.errorconsole.enabled"         : true,
	// "browser.startup.homepage"              : "about:blank",
	// "startup.homepage_welcome_url"          : "about:blank",
	// "extensions.blocklist.url"              : "http://localhost/extensions-dummy/blocklistURL",
	// "browser.safebrowsing.provider.0.keyURL": "http://localhost/safebrowsing-dummy/newkey",
	// "extensions.webservice.discoverURL"     : "http://localhost/extensions-dummy/discoveryURL",
	// "browser.safebrowsing.provider.0.updateURL" :	 "http://localhost/safebrowsing-dummy/update",
	// "browser.safebrowsing.provider.0.gethashURL" :	 "http://localhost/safebrowsing-dummy/gethash",
	// "extensions.update.url" : "http://localhost/extensions-dummy/updateURL",
};

DevPrefs['extensions.checkCompatibility.' + Services.appinfo.version] = !1;

function DeventoSetup() {
	let crashed = addon.branch.getPrefType('running') && addon.branch.getBoolPref('running');
	if(crashed) {
		LOG('Browser crashed last run...');
		return;
	}
	
	for(let [k,v] in Iterator(DevPrefs)) {
		
		try {
			let fn;
			
			switch(typeof v) {
				case 'boolean': fn = 'Bool'; break;
				case 'string':  fn = 'Char'; break;
				case 'number':  fn = 'Int';  break;
			}
			
			if(!Services.prefs.getPrefType(k)) {
				// LOG('No previous value for "'+k+'"');
				addon.branch.setBoolPref(k+'.NA', !0);
			} else {
				let old = Services.prefs['get'+fn+'Pref'](k);
				addon.branch['set'+fn+'Pref'](k, old);
			}
			
			Services.prefs['set'+fn+'Pref'](k, v);
			
		} catch(e) {
			Cu.reportError(e);
		}
	}
	
	addon.branch.setBoolPref('running', !0)
}

function DeventoCleanup(aReason) {
	for(let [k,v] in Iterator(DevPrefs)) {
		
		try {
			let fn;
			
			switch(typeof v) {
				case 'boolean': fn = 'Bool'; break;
				case 'string':  fn = 'Char'; break;
				case 'number':  fn = 'Int';  break;
			}
			
			if(addon.branch.getPrefType(k)) {
				let old = addon.branch['get'+fn+'Pref'](k);
				Services.prefs['set'+fn+'Pref'](k, old);
				addon.branch.clearUserPref(k);
			} else {
				if(addon.branch.getPrefType(k+'.NA')) {
					Services.prefs.clearUserPref(k);
					addon.branch.clearUserPref(k+'.NA');
				}
			}
			
		} catch(e) {
			Cu.reportError(e);
		}
	}
	
	addon.branch.clearUserPref('running');
}

let m$ = {
	wf: function(callback) {
		let windows = Services.wm.getEnumerator('navigator:browser');
		while(windows.hasMoreElements()) {
			callback(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
		}
	},
	bf: function(gBrowser,callback,inf) {
		let wrapper = function(doc) {
			if(doc instanceof Ci.nsIDOMHTMLDocument) try {
				
				callback(doc);
				
				if(inf) {
					let l = doc.defaultView.frames,
						c = l.length;
					while(c--) {
						wrapper(l[c].document);
					}
				}
			} catch(e) {
				Cu.reportError(e);
			}
		};
		
		if(typeof gBrowser.getBrowserAtIndex === 'function') {
			let l = gBrowser.browsers.length;
			
			while(l--) {
				wrapper(gBrowser.getBrowserAtIndex(l).contentDocument);
			}
		} else if(gBrowser.nodeName === 'deck') {
			let l = gBrowser.childNodes.length;
			
			while(l--) {
				wrapper(gBrowser.childNodes[l].contentDocument);
			}
		} else {
			throw new Error('Unknown gBrowser instance.');
		}
	},
	log : function() {
		let a = ["@@DeventoMessage"].concat(Array.prototype.slice.call(arguments, 0));
		
		this.wf(w => {
			this.bf(getBrowser(w), doc => {
				let w = doc.defaultView,
					c = w.console;
				
				c.log.apply(c, a);
			});
		});
	},
	error : function(a) {
		// let a = ["@@DeventoMessage"].concat(Array.prototype.slice.call(arguments, 0));
		
		this.wf(w => {
			this.bf(getBrowser(w), doc => {
				let w = doc.defaultView,
					c = w.console;
				
				c.error(a);
			});
		});
	},
	cwskipf : function(f) {
		let fn = f.replace(/^.*\//,'');
		
		return fn.substr(0,6) == 'jquery';
	},
	observe: function(s, t, d) {
		switch(t) {
			
			default:
				if("QueryInterface" in s) {
					
					if(s instanceof Ci.nsIScriptError) try {
						
						s = s.QueryInterface(Ci.nsIScriptError);
						
						if(!~['CSS Parser',"content javascript"].indexOf(s.category) && !this.cwskipf(s.sourceName)) {
							
							this.log(s.errorMessage || s.message, s.category,
								s.sourceName.replace(/^.*->/,'')+':'+s.lineNumber);
						}
						
					} catch(e) {}
				}
		}
	}
};

function getBrowser(w) {
	
	if(typeof w.getBrowser === 'function')
		return w.getBrowser();
	
	if("gBrowser" in w)
		return w.gBrowser;
	
	return w.BrowserApp.deck;
}

function addAddonListenerMethod(fn) {
	m$[fn] = function(aAddon) {
		this.log('AddonListener.' + fn+': ' + aAddon.name + ' ' + aAddon.version);
	};
}
addAddonListenerMethod('onEnabling');
addAddonListenerMethod('onEnabled');
addAddonListenerMethod('onDisabling');
addAddonListenerMethod('onDisabled');
addAddonListenerMethod('onInstalling');
addAddonListenerMethod('onInstalled');
addAddonListenerMethod('onUninstalling');
addAddonListenerMethod('onUninstalled');
addAddonListenerMethod('onOperationCancelled');
addAddonListenerMethod('onPropertyChanged');

function startup(data) {
	AddonManager.getAddonByID(data.id,function(data) {
		let io = Services.io;
		
		addon = {
			id: data.id,
			name: data.name,
			version: data.version,
			tag: data.name.toLowerCase().replace(/[^\w]/g,''),
			wms: new WeakMap()
		};
		addon.branch = Services.prefs.getBranch('extensions.'+addon.tag+'.');
		
		io.getProtocolHandler("resource")
			.QueryInterface(Ci.nsIResProtocolHandler)
			.setSubstitution(addon.tag,
				io.newURI(__SCRIPT_URI_SPEC__+'/../',null,null));
		
		DeventoSetup();
		
		AddonManager.addAddonListener(m$);
		Services.console.registerListener(m$,!0);
		
		addon.branch.setCharPref('version', addon.version);
	});
}

function shutdown(data, reason) {
	DeventoCleanup(reason);
	
	if(reason == APP_SHUTDOWN)
		return;
	
	AddonManager.removeAddonListener(m$);
	Services.console.unregisterListener(m$);
	
	Services.io.getProtocolHandler("resource")
		.QueryInterface(Ci.nsIResProtocolHandler)
		.setSubstitution(addon.tag,null);
	
	for(let m in scope)
		delete scope[m];
}

function install(data, reason) {}
function uninstall(data, reason) {}
