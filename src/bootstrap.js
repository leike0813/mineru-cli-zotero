var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
var chromeHandle;
var MineruCliZotero;
var addonContext;

function log(msg) {
	Zotero.debug("MinerU CLI Zotero: " + msg);
}

function install() {
	log("Installed");
}

async function startup({ id, version, rootURI, resourceURI }) {
	log("Starting");

	await Zotero.initializationPromise;
	if (!rootURI && resourceURI) {
		rootURI = resourceURI.spec;
	}

	var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(
		Ci.amIAddonManagerStartup
	);
	var manifestURI = Services.io.newURI(rootURI + "manifest.json");
	chromeHandle = aomStartup.registerChrome(manifestURI, [
		["content", "mineru-cli-zotero", rootURI + "content/"],
	]);

	addonContext = {
		rootURI,
		Zotero,
		ChromeUtils,
		Services,
		Cc,
		Ci,
		Cu,
	};
	addonContext._globalThis = addonContext;

	Services.scriptloader.loadSubScript(
		rootURI + "content/scripts/mineru-cli-zotero.js",
		addonContext
	);
	MineruCliZotero = addonContext.MineruCliZotero;
	if (typeof Zotero !== "undefined") {
		Zotero.MineruCliZotero = MineruCliZotero;
	}

	Zotero.PreferencePanes.register({
		pluginID: "mineru-cli-zotero@example.com",
		src: "chrome://mineru-cli-zotero/content/preferences.xhtml",
		label: "MinerU CLI",
	});

	MineruCliZotero.init({ id, version, rootURI });
	MineruCliZotero.addToAllWindows();
	await MineruCliZotero.main();
}

function onMainWindowLoad({ window }) {
	if (MineruCliZotero) {
		MineruCliZotero.addToWindow(window);
	}
}

function onMainWindowUnload({ window }) {
	if (MineruCliZotero) {
		MineruCliZotero.removeFromWindow(window);
	}
}

function shutdown({ rootURI, resourceURI }, reason) {
	if (reason === APP_SHUTDOWN) {
		return;
	}

	if (!rootURI && resourceURI) {
		rootURI = resourceURI.spec;
	}
	log("Shutting down");
	if (MineruCliZotero) {
		MineruCliZotero.removeFromAllWindows();
	}
	MineruCliZotero = undefined;
	addonContext = undefined;
	if (rootURI) {
		try {
			Cu.unload(rootURI + "content/scripts/mineru-cli-zotero.js");
		} catch (err) {}
	}
	if (chromeHandle) {
		chromeHandle.destruct();
		chromeHandle = null;
	}
}

function uninstall() {
	log("Uninstalled");
}
