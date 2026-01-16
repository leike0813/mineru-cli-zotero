const PREF_PREFIX = "extensions.mineru-cli-zotero.";

function getPref(name, fallback = "") {
  const value = Zotero.Prefs.get(PREF_PREFIX + name, true);
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

function setPref(name, value) {
  Zotero.Prefs.set(PREF_PREFIX + name, value);
}

function $(id) {
  return document.getElementById(id);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.l10n && document.l10n.translateFragment) {
    document.l10n.translateFragment(document.body);
  }

  const cliPathInput = $("mineru-cli-path");
  const endpointInput = $("mineru-endpoint");
  const apiKeyInput = $("mineru-api-key");

  cliPathInput.value = getPref("cliPath", "");
  endpointInput.value = getPref("endpoint", "https://mineru.net/api/v4");
  apiKeyInput.value = getPref("apiKey", "");

  cliPathInput.addEventListener("input", () => {
    setPref("cliPath", cliPathInput.value.trim());
  });
  endpointInput.addEventListener("input", () => {
    setPref("endpoint", endpointInput.value.trim());
  });
  apiKeyInput.addEventListener("input", () => {
    setPref("apiKey", apiKeyInput.value.trim());
  });
});
