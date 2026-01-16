var MineruCliZotero;

function log(msg) {
	Zotero.debug("MinerU CLI Zotero: " + msg);
}

function install() {
	log("Installed");
}

async function startup({ id, version, rootURI }) {
	log("Starting");

	Zotero.PreferencePanes.register({
		pluginID: "mineru-cli-zotero@example.com",
		src: rootURI + "preferences.xhtml",
		scripts: [rootURI + "preferences.js"],
	});

	Services.scriptloader.loadSubScript(rootURI + "mineru-cli-zotero.js");
	MineruCliZotero.init({ id, version, rootURI });
	MineruCliZotero.addToAllWindows();
	await MineruCliZotero.main();
}

function onMainWindowLoad({ window }) {
	MineruCliZotero.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	MineruCliZotero.removeFromWindow(window);
}

function shutdown() {
	log("Shutting down");
	MineruCliZotero.removeFromAllWindows();
	MineruCliZotero = undefined;
}

function uninstall() {
	log("Uninstalled");
}
