/**
 * AutoApply — Background Service Worker
 */

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "autofill_now") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "autofill" }).catch(() => {});
    }
  }
});
