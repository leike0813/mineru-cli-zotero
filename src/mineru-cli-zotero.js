var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm");

const PREF_PREFIX = "extensions.mineru-cli-zotero.";

const STRINGS = {
	"en-US": {
		menuParse: "MinerU: Parse PDF to Markdown",
		title: "MinerU CLI",
		errorNoSelection: "No PDF attachments found in the selection.",
		errorMissingCli: "CLI path is not configured. Please set it in Zotero preferences.",
		errorMissingApiKey: "API key is not configured. Please set it in Zotero preferences.",
		errorMissingEndpoint: "Endpoint is not configured. Please set it in Zotero preferences.",
		errorMissingParent: "Skipping attachment without a parent item.",
		errorMissingFile: "Skipping attachment without a local file path.",
		errorCliFailed: "MinerU CLI failed for: {name}",
		errorMarkdownMissing: "Markdown was not created for: {name}",
		summary: "Parsed: {parsed}, Linked: {linked}, Skipped: {skipped}, Errors: {errors}",
	},
	"zh-CN": {
		menuParse: "MinerU：解析 PDF 为 Markdown",
		title: "MinerU CLI",
		errorNoSelection: "当前选择中没有 PDF 附件。",
		errorMissingCli: "未配置 CLI 路径，请在 Zotero 设置中填写。",
		errorMissingApiKey: "未配置 API Key，请在 Zotero 设置中填写。",
		errorMissingEndpoint: "未配置 Endpoint，请在 Zotero 设置中填写。",
		errorMissingParent: "跳过无父条目的附件。",
		errorMissingFile: "跳过无本地文件路径的附件。",
		errorCliFailed: "MinerU CLI 执行失败：{name}",
		errorMarkdownMissing: "未生成 Markdown：{name}",
		summary: "解析完成：{parsed}，已链接：{linked}，已跳过：{skipped}，错误：{errors}",
	},
};

var MineruCliZotero = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],

	init({ id, version, rootURI }) {
		if (this.initialized) return;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
	},

	log(msg) {
		Zotero.debug("MinerU CLI Zotero: " + msg);
	},

	addToWindow(window) {
		let doc = window.document;
		window.MozXULElement.insertFTLIfNeeded("mineru-cli-zotero.ftl");

		let menu = doc.getElementById("zotero-itemmenu");
		if (!menu) {
			this.log("Context menu not found");
			return;
		}

		let menuitem = doc.createXULElement("menuitem");
		menuitem.id = "mineru-cli-zotero-parse";
		menuitem.setAttribute("data-l10n-id", "mineru-cli-zotero-menu-parse");
		menuitem.setAttribute("label", this._t("menuParse"));
		menuitem.addEventListener("command", () => {
			this.handleMenu(window);
		});
		menu.addEventListener("popupshowing", () => {
			let hasTargets = this._hasPdfTargets(window);
			menuitem.hidden = !hasTargets;
		});
		menu.appendChild(menuitem);
		this.storeAddedElement(menuitem);
	},

	addToAllWindows() {
		let windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.addToWindow(win);
		}
	},

	storeAddedElement(elem) {
		if (!elem.id) {
			throw new Error("Element must have an id");
		}
		this.addedElementIDs.push(elem.id);
	},

	removeFromWindow(window) {
		let doc = window.document;
		for (let id of this.addedElementIDs) {
			doc.getElementById(id)?.remove();
		}
		doc.querySelector('[href="mineru-cli-zotero.ftl"]')?.remove();
	},

	removeFromAllWindows() {
		let windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.removeFromWindow(win);
		}
	},

	async main() {
		this.log("Ready");
	},

	_getLocale() {
		let locale = "en-US";
		if (Zotero && Zotero.locale) {
			locale = Zotero.locale;
		} else if (Services.locale && Services.locale.appLocaleAsBCP47) {
			locale = Services.locale.appLocaleAsBCP47;
		}
		if (locale.toLowerCase().startsWith("zh")) {
			return "zh-CN";
		}
		return "en-US";
	},

	_t(key, vars = {}) {
		let locale = this._getLocale();
		let table = STRINGS[locale] || STRINGS["en-US"];
		let template = table[key] || STRINGS["en-US"][key] || key;
		return template.replace(/\{(\w+)\}/g, (match, name) => {
			if (name in vars) {
				return String(vars[name]);
			}
			return match;
		});
	},

	_showAlert(window, key, vars = {}) {
		Zotero.alert(window, this._t("title"), this._t(key, vars));
	},

	_hasPdfTargets(window) {
		let items = this._getSelectedItems(window);
		let attachments = this._collectPdfAttachments(items);
		return attachments.length > 0;
	},

	_getSelectedItems(window) {
		if (!window.ZoteroPane) return [];
		return window.ZoteroPane.getSelectedItems();
	},

	_collectPdfAttachments(items) {
		let attachments = new Map();
		for (let item of items) {
			if (!item) continue;
			if (item.isAttachment && item.isAttachment()) {
				if (this._isPdfAttachment(item)) {
					attachments.set(item.id, item);
				}
				continue;
			}
			if (!item.getAttachments) continue;
			let attachmentIDs = item.getAttachments();
			if (!attachmentIDs || !attachmentIDs.length) continue;
			let childItems = Zotero.Items.get(attachmentIDs);
			for (let attachment of childItems) {
				if (this._isPdfAttachment(attachment)) {
					attachments.set(attachment.id, attachment);
				}
			}
		}
		return Array.from(attachments.values());
	},

	_isPdfAttachment(item) {
		if (!item || !item.isAttachment || !item.isAttachment()) return false;
		let contentType = (item.attachmentContentType || "").toLowerCase();
		if (contentType === "application/pdf") {
			return true;
		}
		let filePath = item.getFilePath ? item.getFilePath() : null;
		return !!filePath && filePath.toLowerCase().endsWith(".pdf");
	},

	_readPrefs() {
		let cliPath = Zotero.Prefs.get(PREF_PREFIX + "cliPath", true) || "";
		let endpoint = Zotero.Prefs.get(PREF_PREFIX + "endpoint", true) || "";
		let apiKey = Zotero.Prefs.get(PREF_PREFIX + "apiKey", true) || "";
		return { cliPath: cliPath.trim(), endpoint: endpoint.trim(), apiKey: apiKey.trim() };
	},

	async handleMenu(window) {
		let items = this._getSelectedItems(window);
		let attachments = this._collectPdfAttachments(items);
		if (!attachments.length) {
			this._showAlert(window, "errorNoSelection");
			return;
		}

		let prefs = this._readPrefs();
		if (!prefs.cliPath) {
			this._showAlert(window, "errorMissingCli");
			return;
		}
		if (!prefs.endpoint) {
			this._showAlert(window, "errorMissingEndpoint");
			return;
		}
		if (!prefs.apiKey) {
			this._showAlert(window, "errorMissingApiKey");
			return;
		}

		let tempConfigPath = await this._writeTempConfig(prefs);
		let summary = {
			parsed: 0,
			linked: 0,
			skipped: 0,
			errors: 0,
		};

		try {
			for (let attachment of attachments) {
				let result = await this._processAttachment(attachment, prefs, tempConfigPath);
				summary[result] += 1;
			}
		} finally {
			await this._removeTempConfig(tempConfigPath);
		}

		this._showAlert(window, "summary", summary);
	},

	async _processAttachment(attachment, prefs, tempConfigPath) {
		if (!attachment) return "skipped";
		let pdfPath = attachment.getFilePath ? attachment.getFilePath() : null;
		if (!pdfPath) {
			this.log(this._t("errorMissingFile"));
			return "skipped";
		}

		let parentID = attachment.parentItemID;
		if (!parentID) {
			this.log(this._t("errorMissingParent"));
			return "skipped";
		}
		let parentItem = Zotero.Items.get(parentID);
		if (!parentItem) {
			this.log(this._t("errorMissingParent"));
			return "skipped";
		}

		let { mdPath, mdFile } = this._resolveMarkdownPath(pdfPath);
		if (mdFile.exists()) {
			let alreadyLinked = this._parentHasLinkedAttachment(parentItem, mdPath);
			if (alreadyLinked) {
				return "skipped";
			}
			await this._linkMarkdown(parentItem, mdPath);
			return "linked";
		}

		let imagesDirName = this._buildImagesDirName(attachment);
		let execResult = await this._runCli(prefs.cliPath, pdfPath, tempConfigPath, imagesDirName);
		if (!execResult.ok) {
			this.log(this._t("errorCliFailed", { name: attachment.getField("title") || pdfPath }));
			return "errors";
		}

		if (!mdFile.exists()) {
			this.log(this._t("errorMarkdownMissing", { name: attachment.getField("title") || pdfPath }));
			return "errors";
		}

		await this._linkMarkdown(parentItem, mdPath);
		return "parsed";
	},

	_resolveMarkdownPath(pdfPath) {
		let pdfFile = Zotero.File.pathToFile(pdfPath);
		let leaf = pdfFile.leafName || "";
		let stem = leaf.toLowerCase().endsWith(".pdf") ? leaf.slice(0, -4) : leaf;
		let mdFile = pdfFile.parent.clone();
		mdFile.append(stem + ".md");
		return { mdPath: mdFile.path, mdFile };
	},

	_normalizePath(path) {
		if (Zotero.isWin) {
			return path.toLowerCase();
		}
		return path;
	},

	_parentHasLinkedAttachment(parentItem, mdPath) {
		let mdPathNormalized = this._normalizePath(mdPath);
		let attachmentIDs = parentItem.getAttachments ? parentItem.getAttachments() : [];
		let attachments = Zotero.Items.get(attachmentIDs);
		for (let attachment of attachments) {
			if (!attachment || !attachment.isAttachment || !attachment.isAttachment()) continue;
			let attachmentPath = attachment.getFilePath ? attachment.getFilePath() : null;
			if (!attachmentPath) continue;
			if (this._normalizePath(attachmentPath) === mdPathNormalized) {
				return true;
			}
		}
		return false;
	},

	async _linkMarkdown(parentItem, mdPath) {
		let mdFile = Zotero.File.pathToFile(mdPath);
		await Zotero.Attachments.linkFromFile({
			file: mdPath,
			parentItemID: parentItem.id,
			title: mdFile.leafName,
		});
	},

	_buildImagesDirName(attachment) {
		if (attachment && attachment.key) {
			return `Images_${attachment.key}`;
		}
		return `Images_${attachment.id}`;
	},

	async _writeTempConfig({ endpoint, apiKey }) {
		let tmpDir = Services.dirsvc.get("TmpD", Ci.nsIFile);
		let suffix = Zotero.Utilities.randomString ? Zotero.Utilities.randomString(8) : String(Date.now());
		tmpDir.append(`mineru-cli-zotero-${suffix}.json`);
		let payload = JSON.stringify({ endpoint: endpoint, api_key: apiKey }, null, 2);
		await OS.File.writeAtomic(tmpDir.path, payload, { encoding: "utf-8" });
		return tmpDir.path;
	},

	async _removeTempConfig(path) {
		try {
			await OS.File.remove(path);
		} catch (err) {
			this.log(`Failed to remove temp config: ${err}`);
		}
	},

	async _runCli(cliPath, pdfPath, configPath, imagesDirName) {
		let pdfDir = Zotero.File.pathToFile(pdfPath).parent.path;
		let args = [pdfPath, "--config", configPath, "--images-dir", imagesDirName];
		try {
			let result = await Zotero.Utilities.Internal.exec(cliPath, args, { cwd: pdfDir });
			let exitCode = result && typeof result.exitCode === "number" ? result.exitCode : 0;
			if (exitCode !== 0) {
				this.log(`CLI exit code ${exitCode}: ${result && result.stderr ? result.stderr : ""}`);
				return { ok: false };
			}
			return { ok: true };
		} catch (err) {
			this.log(`CLI failed: ${err}`);
			return { ok: false };
		}
	},
};
