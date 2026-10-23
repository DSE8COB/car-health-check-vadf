(function () {
    "use strict";

    const STORAGE_KEY = "sphinx-review-findings-v1";
    const PATCH_URL = "/pr-diff.patch";

    let selectedRange = null;
    let selectedText = "";
    let pullRequestChanges = [];

    document.addEventListener("DOMContentLoaded", async function () {
        createSelectionButton();
        createFindingModal();
        createFindingsSidebar();

        restoreCurrentPageFindings();
        renderFindingsSidebar();
        locateFindingFromUrl();

        await loadPullRequestDiff();
    });

    /* ==========================================================
     * FINDING CREATION
     * ========================================================== */

    function createSelectionButton() {
        const button = document.createElement("button");
        button.id = "create-finding-button";
        button.type = "button";
        button.textContent = "Create Finding";
        button.style.display = "none";
        document.body.appendChild(button);

        document.addEventListener("mouseup", function (event) {
            if (
                event.target.closest("#review-finding-modal") ||
                event.target.closest("#review-findings-sidebar") ||
                event.target.closest("#review-pr-changes-panel") ||
                event.target.closest("#create-finding-button") ||
                event.target.closest("#review-sidebar-open") ||
                event.target.closest("#review-changes-open")
            ) {
                return;
            }

            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (!text || selection.rangeCount === 0) {
                hideSelectionButton();
                return;
            }

            const range = selection.getRangeAt(0);
            if (!isInsideDocumentContent(range.commonAncestorContainer)) {
                hideSelectionButton();
                return;
            }

            selectedText = text;
            selectedRange = range.cloneRange();
            button.style.left = `${event.pageX + 12}px`;
            button.style.top = `${event.pageY + 12}px`;
            button.style.display = "block";
        });

        button.addEventListener("mousedown", event => event.preventDefault());

        button.addEventListener("click", function () {
            if (!selectedRange || !selectedText) return;

            document.getElementById("review-selected-text").textContent = selectedText;
            document.getElementById("review-finding-description").value = "";
            document.getElementById("review-finding-severity").value = "Major";
            document.getElementById("review-finding-modal").style.display = "flex";
            hideSelectionButton();

            window.setTimeout(function () {
                document.getElementById("review-finding-description").focus();
            }, 100);
        });

        document.addEventListener("mousedown", function (event) {
            if (!event.target.closest("#create-finding-button")) hideSelectionButton();
        });
    }

    function isInsideDocumentContent(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!element) return false;
        if (
            element.closest("#review-findings-sidebar") ||
            element.closest("#review-pr-changes-panel") ||
            element.closest("#review-finding-modal")
        ) return false;

        return Boolean(element.closest(
            "main, article, .document, .body, .rst-content, .bd-content, [role='main']"
        ));
    }

    function hideSelectionButton() {
        const button = document.getElementById("create-finding-button");
        if (button) button.style.display = "none";
    }

    function createFindingModal() {
        const modal = document.createElement("div");
        modal.id = "review-finding-modal";
        modal.innerHTML = `
            <div class="review-modal-content">
                <div class="review-modal-header">
                    <h3>Create Finding</h3>
                    <button id="review-modal-close" class="review-close-button" type="button" aria-label="Close">&times;</button>
                </div>
                <div class="review-form-group">
                    <label>Selected content</label>
                    <div id="review-selected-text"></div>
                </div>
                <div class="review-form-group">
                    <label for="review-finding-severity">Severity</label>
                    <select id="review-finding-severity">
                        <option value="Critical">Critical</option>
                        <option value="Major" selected>Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Info">Info</option>
                    </select>
                </div>
                <div class="review-form-group">
                    <label for="review-finding-description">Finding description</label>
                    <textarea id="review-finding-description" rows="5" placeholder="Describe the issue or required correction"></textarea>
                </div>
                <div class="review-modal-actions">
                    <button id="review-cancel-finding" class="review-secondary-button" type="button">Cancel</button>
                    <button id="review-save-finding" class="review-primary-button" type="button">Save Finding</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        document.getElementById("review-modal-close").addEventListener("click", closeFindingModal);
        document.getElementById("review-cancel-finding").addEventListener("click", closeFindingModal);
        document.getElementById("review-save-finding").addEventListener("click", saveFinding);

        modal.addEventListener("click", event => {
            if (event.target === modal) closeFindingModal();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeFindingModal();
            if (event.key === "Enter" && event.ctrlKey && modal.style.display === "flex") saveFinding();
        });
    }

    function closeFindingModal() {
        const modal = document.getElementById("review-finding-modal");
        if (modal) modal.style.display = "none";
    }

    function saveFinding() {
        const description = document.getElementById("review-finding-description").value.trim();
        const severity = document.getElementById("review-finding-severity").value;

        if (!description) {
            alert("Please enter the finding description.");
            return;
        }
        if (!selectedRange || !selectedText) {
            alert("The selected content is no longer available. Please select the content again.");
            closeFindingModal();
            return;
        }

        const finding = {
            id: createId(),
            page: getPageIdentifier(),
            pageTitle: getCurrentPageTitle(),
            selectedText,
            description,
            severity,
            status: "Open",
            createdAt: new Date().toISOString()
        };

        try {
            highlightSelectedRange(finding.id, finding.severity);
        } catch (error) {
            console.error("Unable to highlight selected text:", error);
            alert("Select text inside a single paragraph, list item, table cell, or heading.");
            return;
        }

        const findings = getStoredFindings();
        findings.push(finding);
        saveStoredFindings(findings);
        selectedRange = null;
        selectedText = "";
        closeFindingModal();
        renderFindingsSidebar();
        openFindingsSidebar();
    }

    function highlightSelectedRange(findingId, severity) {
        const mark = document.createElement("mark");
        mark.className = `review-finding-highlight severity-${severity.toLowerCase()}`;
        mark.dataset.findingId = findingId;
        mark.title = `Review finding: ${severity}`;
        selectedRange.surroundContents(mark);
        mark.addEventListener("click", () => focusFindingCard(findingId));
        window.getSelection().removeAllRanges();
    }

    /* ==========================================================
     * FINDINGS SIDEBAR
     * ========================================================== */

    function createFindingsSidebar() {
        const sidebar = document.createElement("aside");
        sidebar.id = "review-findings-sidebar";
        sidebar.innerHTML = `
            <div class="review-sidebar-header">
                <div><h3>Review Findings</h3><span id="review-findings-count">0 findings</span></div>
                <button id="review-sidebar-toggle" type="button" aria-label="Close findings panel">&times;</button>
            </div>
            <div class="review-sidebar-toolbar">
                <select id="review-status-filter" aria-label="Filter findings by status">
                    <option value="All">All findings</option>
                    <option value="Open">Open findings</option>
                    <option value="Resolved">Resolved findings</option>
                </select>
            </div>
            <div id="review-findings-list"></div>`;
        document.body.appendChild(sidebar);

        const reopenButton = document.createElement("button");
        reopenButton.id = "review-sidebar-open";
        reopenButton.type = "button";
        reopenButton.textContent = "Findings";
        reopenButton.style.display = "none";
        document.body.appendChild(reopenButton);

        document.getElementById("review-sidebar-toggle").addEventListener("click", closeFindingsSidebar);
        reopenButton.addEventListener("click", openFindingsSidebar);
        document.getElementById("review-status-filter").addEventListener("change", renderFindingsSidebar);
    }

    function closeFindingsSidebar() {
        document.getElementById("review-findings-sidebar").classList.add("review-sidebar-hidden");
        document.getElementById("review-sidebar-open").style.display = "block";
    }

    function openFindingsSidebar() {
        document.getElementById("review-findings-sidebar").classList.remove("review-sidebar-hidden");
        document.getElementById("review-sidebar-open").style.display = "none";
    }

    function renderFindingsSidebar() {
        const list = document.getElementById("review-findings-list");
        const countElement = document.getElementById("review-findings-count");
        if (!list) return;

        let findings = getStoredFindings();
        const statusFilter = document.getElementById("review-status-filter");
        if (statusFilter && statusFilter.value !== "All") {
            findings = findings.filter(finding => finding.status === statusFilter.value);
        }

        findings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = getStoredFindings().length;
        countElement.textContent = total === 1 ? "1 finding" : `${total} findings`;
        list.replaceChildren();

        if (findings.length === 0) {
            const empty = document.createElement("div");
            empty.className = "review-empty-state";
            empty.textContent = "No findings are available. Select text inside a document page to create a finding.";
            list.appendChild(empty);
            return;
        }

        findings.forEach(finding => list.appendChild(createFindingCard(finding)));
    }

    function createFindingCard(finding) {
        const item = document.createElement("div");
        item.className = "review-finding-card";
        item.dataset.findingCardId = finding.id;
        if (finding.status === "Resolved") item.classList.add("review-finding-resolved");
        if (normalizePagePath(finding.page) === normalizePagePath(getPageIdentifier())) {
            item.classList.add("review-current-page-finding");
        }

        const pageName = document.createElement("button");
        pageName.type = "button";
        pageName.className = "review-finding-page";
        pageName.textContent = finding.pageTitle || getFriendlyPageName(finding.page);
        pageName.addEventListener("click", () => locateFinding(finding.id));

        const topRow = document.createElement("div");
        topRow.className = "review-card-top-row";
        const severity = document.createElement("span");
        severity.className = `review-severity severity-${finding.severity.toLowerCase()}`;
        severity.textContent = finding.severity;
        const status = document.createElement("span");
        status.className = `review-status review-status-${finding.status.toLowerCase()}`;
        status.textContent = finding.status;
        topRow.append(severity, status);

        const selected = document.createElement("div");
        selected.className = "review-card-selected-text";
        selected.textContent = finding.selectedText;
        const description = document.createElement("p");
        description.className = "review-card-description";
        description.textContent = finding.description;
        const metadata = document.createElement("small");
        metadata.className = "review-card-metadata";
        metadata.textContent = `Created: ${formatDate(finding.createdAt)}`;

        const actions = document.createElement("div");
        actions.className = "review-card-actions";
        actions.append(
            createActionButton("Locate", "review-locate-button", () => locateFinding(finding.id)),
            createActionButton(finding.status === "Resolved" ? "Reopen" : "Resolve", "review-resolve-button", () => toggleFindingStatus(finding.id)),
            createActionButton("Delete", "review-delete-button", () => deleteFinding(finding.id))
        );

        item.append(pageName, topRow, selected, description, metadata, actions);
        return item;
    }

    function createActionButton(text, className, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;
        button.addEventListener("click", handler);
        return button;
    }

    function restoreCurrentPageFindings() {
        const current = normalizePagePath(getPageIdentifier());
        getStoredFindings()
            .filter(finding => normalizePagePath(finding.page) === current)
            .forEach(function (finding) {
                if (!document.querySelector(`[data-finding-id="${cssEscape(finding.id)}"]`)) {
                    highlightStoredText(finding);
                }
            });
    }

    function highlightStoredText(finding) {
        const match = findTextNodeMatch(getDocumentContentElement(), finding.selectedText);
        if (!match) return;
        const range = document.createRange();
        range.setStart(match.node, match.index);
        range.setEnd(match.node, match.index + match.text.length);
        const mark = document.createElement("mark");
        mark.className = `review-finding-highlight severity-${finding.severity.toLowerCase()}`;
        mark.dataset.findingId = finding.id;
        mark.title = `Review finding: ${finding.severity}`;
        range.surroundContents(mark);
        mark.addEventListener("click", () => focusFindingCard(finding.id));
    }

    function locateFinding(findingId) {
        const finding = getStoredFindings().find(item => item.id === findingId);
        if (!finding) return;
        if (normalizePagePath(finding.page) !== normalizePagePath(getPageIdentifier())) {
            window.location.href = `${finding.page}?locateFinding=${encodeURIComponent(finding.id)}`;
            return;
        }
        scrollToFindingHighlight(finding.id);
    }

    function locateFindingFromUrl() {
        const parameters = new URLSearchParams(window.location.search);
        const findingId = parameters.get("locateFinding");
        if (!findingId) return;
        window.setTimeout(() => {
            scrollToFindingHighlight(findingId);
            openFindingsSidebar();
        }, 400);
        removeQueryParameter("locateFinding");
    }

    function scrollToFindingHighlight(findingId) {
        const highlight = document.querySelector(`[data-finding-id="${cssEscape(findingId)}"]`);
        if (!highlight) {
            alert("The original selected text could not be located. The document may have changed.");
            return;
        }
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });
        highlight.classList.add("review-highlight-focus");
        window.setTimeout(() => highlight.classList.remove("review-highlight-focus"), 2200);
        focusFindingCard(findingId);
    }

    function focusFindingCard(findingId) {
        openFindingsSidebar();
        const card = document.querySelector(`[data-finding-card-id="${cssEscape(findingId)}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("review-card-focus");
        window.setTimeout(() => card.classList.remove("review-card-focus"), 2200);
    }

    function toggleFindingStatus(findingId) {
        const findings = getStoredFindings();
        const finding = findings.find(item => item.id === findingId);
        if (!finding) return;
        finding.status = finding.status === "Resolved" ? "Open" : "Resolved";
        finding.updatedAt = new Date().toISOString();
        saveStoredFindings(findings);
        renderFindingsSidebar();
    }

    function deleteFinding(findingId) {
        const finding = getStoredFindings().find(item => item.id === findingId);
        if (!finding || !window.confirm(`Delete this finding?\n\n${finding.description}`)) return;
        saveStoredFindings(getStoredFindings().filter(item => item.id !== findingId));
        const highlight = document.querySelector(`[data-finding-id="${cssEscape(findingId)}"]`);
        if (highlight) highlight.replaceWith(document.createTextNode(highlight.textContent));
        renderFindingsSidebar();
    }

    /* ==========================================================
     * PR DIFF SUPPORT
     * ========================================================== */

    async function loadPullRequestDiff() {
        try {
            const response = await fetch(PATCH_URL, { cache: "no-store" });
            if (!response.ok) {
                console.warn(`ReviewTool could not load ${PATCH_URL}:`, response.status);
                return;
            }
            const patchText = await response.text();
            if (!patchText.trim()) {
                console.warn("ReviewTool: pr-diff.patch is empty.");
                return;
            }

            pullRequestChanges = parseGitDiff(patchText);
            if (pullRequestChanges.length === 0) return;
            highlightChangesOnCurrentPage(pullRequestChanges);
            createPullRequestChangesPanel(pullRequestChanges);
            locateChangeFromUrl();
        } catch (error) {
            console.error("ReviewTool could not process the PR diff:", error);
        }
    }

    function parseGitDiff(patchText) {
        const lines = patchText.split(/\r?\n/);
        const changes = [];
        let currentFile = "";
        let currentNewLine = 0;
        let changeNumber = 0;

        for (const line of lines) {
            if (line.startsWith("diff --git ")) {
                const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
                currentFile = match ? match[2] : "";
                continue;
            }
            if (line.startsWith("+++ b/")) {
                currentFile = line.substring(6);
                continue;
            }
            if (line.startsWith("@@")) {
                const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                if (match) currentNewLine = Number(match[1]);
                continue;
            }
            if (line.startsWith("+") && !line.startsWith("+++")) {
                addParsedChange("added", line.substring(1), currentFile, currentNewLine);
                currentNewLine += 1;
                continue;
            }
            if (line.startsWith("-") && !line.startsWith("---")) {
                addParsedChange("deleted", line.substring(1), currentFile, null);
                continue;
            }
            if (line && !line.startsWith("\\")) currentNewLine += 1;
        }

        return changes;

        function addParsedChange(type, rawText, sourceFile, lineNumber) {
            if (!sourceFile || !/\.(md|rst)$/i.test(sourceFile)) return;
            const candidates = markdownLineCandidates(rawText);
            if (candidates.length === 0) return;
            changeNumber += 1;
            changes.push({
                id: `pr-change-${changeNumber}`,
                type,
                sourceFile: normalizeSourceFile(sourceFile),
                page: sourceFileToHtmlPage(sourceFile),
                text: candidates[0],
                candidates,
                rawText,
                line: lineNumber
            });
        }
    }

    function markdownLineCandidates(rawText) {
        let text = String(rawText || "").trim();
        if (!text || text === "```" || text === "~~~") return [];
        if (/^[|:\-\s+]+$/.test(text)) return [];

        text = text
            .replace(/^#{1,6}\s+/, "")
            .replace(/^[-*+]\s+/, "")
            .replace(/^\d+\.\s+/, "")
            .replace(/^>\s*/, "")
            .replace(/\*\*/g, "")
            .replace(/__/g, "")
            .replace(/~~/g, "")
            .replace(/`/g, "")
            .trim();

        if (!text) return [];

        if (text.includes("|")) {
            return [
                text,
                text.replace(/\|/g, "").trim(),
                ...text.split("|")
                    .map(x => x.trim())
                    .filter(Boolean)
            ];
        }
        return [text];
    }

    function sourceFileToHtmlPage(filePath) {
        let path = normalizeSourceFile(filePath).replace(/^docs\//, "");
        path = path.replace(/\.(md|rst)$/i, ".html");
        return `/${path}`;
    }

    function normalizeSourceFile(filePath) {
        return String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
    }

    function highlightChangesOnCurrentPage(changes) {
        const currentPage = normalizePagePath(window.location.pathname);
        changes
            .filter(change => change.type === "added" && normalizePagePath(change.page) === currentPage)
            .forEach(highlightPullRequestChange);
    }

    function highlightPullRequestChange(change) {
        const content = getDocumentContentElement();
        if (!content) return false;

        let match = null;
        for (const candidate of change.candidates) {
            match = findTextNodeMatch(content, candidate);
            if (match) {
                change.matchedText = candidate;
                break;
            }
        }
        if (!match) {
            console.warn("Could not highlight PR change:", change);
            return false;
        }

        const range = document.createRange();
        range.setStart(match.node, match.index);
        range.setEnd(match.node, match.index + match.text.length);
        const span = document.createElement("span");
        span.className = `review-pr-change review-change-${change.type}`;
        span.dataset.changeId = change.id;
        span.title = change.line ? `Changed in pull request, source line ${change.line}` : "Changed in pull request";
        range.surroundContents(span);
        span.addEventListener("click", () => focusPullRequestChangeCard(change.id));
        return true;
    }

    function createPullRequestChangesPanel(changes) {
        const panel = document.createElement("aside");
        panel.id = "review-pr-changes-panel";
        const added = changes.filter(change => change.type === "added").length;
        const deleted = changes.filter(change => change.type === "deleted").length;
        panel.innerHTML = `
            <div class="review-changes-header">
                <div><h3>PR Changes</h3><span>${added} added, ${deleted} deleted</span></div>
                <button id="review-changes-close" type="button" aria-label="Close PR changes panel">&times;</button>
            </div>
            <div id="review-pr-changes-list"></div>`;
        document.body.appendChild(panel);

        const openButton = document.createElement("button");
        openButton.id = "review-changes-open";
        openButton.type = "button";
        openButton.textContent = `Changes (${changes.length})`;
        openButton.style.display = "none";
        document.body.appendChild(openButton);

        document.getElementById("review-changes-close").addEventListener("click", function () {
            panel.classList.add("review-changes-hidden");
            openButton.style.display = "block";
        });
        openButton.addEventListener("click", function () {
            panel.classList.remove("review-changes-hidden");
            openButton.style.display = "none";
        });

        renderPullRequestChanges(changes);
    }

    function renderPullRequestChanges(changes) {
        const list = document.getElementById("review-pr-changes-list");
        list.replaceChildren();
        changes.forEach(function (change) {
            const card = document.createElement("div");
            card.className = `review-change-card review-change-card-${change.type}`;
            card.dataset.changeCardId = change.id;

            const pageButton = document.createElement("button");
            pageButton.type = "button";
            pageButton.className = "review-change-page";
            pageButton.textContent = getFriendlyPageName(change.page);
            pageButton.addEventListener("click", () => locatePullRequestChange(change.id));

            const type = document.createElement("span");
            type.className = `review-change-type review-change-type-${change.type}`;
            type.textContent = change.type === "added" ? "Added" : "Deleted";

            const text = document.createElement("div");
            text.className = "review-change-text";
            text.textContent = change.text;

            const source = document.createElement("small");
            source.className = "review-change-source";
            source.textContent = change.line ? `${change.sourceFile}, line ${change.line}` : change.sourceFile;

            const locate = document.createElement("button");
            locate.type = "button";
            locate.className = "review-change-locate";
            locate.textContent = change.type === "added" ? "Locate" : "Open Page";
            locate.addEventListener("click", () => locatePullRequestChange(change.id));

            card.append(pageButton, type, text, source, locate);
            list.appendChild(card);
        });
    }

    function locatePullRequestChange(changeId) {
        const change = pullRequestChanges.find(item => item.id === changeId);
        if (!change) return;
        if (normalizePagePath(change.page) !== normalizePagePath(window.location.pathname)) {
            window.location.href = `${change.page}?locateChange=${encodeURIComponent(change.id)}`;
            return;
        }
        if (change.type === "deleted") {
            alert("This content was deleted and is not present in the rendered document.");
            return;
        }
        scrollToPullRequestChange(change.id);
    }

    function locateChangeFromUrl() {
        const parameters = new URLSearchParams(window.location.search);
        const changeId = parameters.get("locateChange");
        if (!changeId) return;
        window.setTimeout(() => scrollToPullRequestChange(changeId), 450);
        removeQueryParameter("locateChange");
    }

    function scrollToPullRequestChange(changeId) {
        const highlight = document.querySelector(`[data-change-id="${cssEscape(changeId)}"]`);
        if (!highlight) {
            alert("The correct page opened, but the changed text could not be matched in the rendered document.");
            return;
        }
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });
        highlight.classList.add("review-pr-change-focus");
        window.setTimeout(() => highlight.classList.remove("review-pr-change-focus"), 2200);
        focusPullRequestChangeCard(changeId);
    }

    function focusPullRequestChangeCard(changeId) {
        const card = document.querySelector(`[data-change-card-id="${cssEscape(changeId)}"]`);
        if (!card) return;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("review-change-card-focus");
        window.setTimeout(() => card.classList.remove("review-change-card-focus"), 2200);
    }

    /* ==========================================================
     * SHARED HELPERS
     * ========================================================== */

    function findTextNodeMatch(content, searchText) {
        if (!content || !searchText) return null;
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parent = node.parentElement;
            if (!parent || parent.closest(
                "script, style, nav, #review-findings-sidebar, #review-finding-modal, #review-pr-changes-panel"
            )) continue;
            const index = node.nodeValue.indexOf(searchText);
            if (index !== -1) return { node, index, text: searchText };
        }
        return null;
    }

    function getDocumentContentElement() {
        return document.querySelector(
            ".rst-content .document, .rst-content, main article, article, .bd-content, main, [role='main'], .document, .body"
        );
    }

    function getStoredFindings() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            const findings = value ? JSON.parse(value) : [];
            return Array.isArray(findings) ? findings : [];
        } catch (error) {
            console.error("Unable to retrieve review findings:", error);
            return [];
        }
    }

    function saveStoredFindings(findings) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(findings));
    }

    function getPageIdentifier() {
        return window.location.pathname;
    }

    function normalizePagePath(pagePath) {
        if (!pagePath) return "";
        let path = String(pagePath).split("?")[0].split("#")[0].replace(/\/+/g, "/");
        if (path.endsWith("/")) path += "index.html";
        return path;
    }

    function getCurrentPageTitle() {
        const heading = document.querySelector("main h1, article h1, .rst-content h1, .bd-content h1, h1");
        return heading ? heading.textContent.replace("¶", "").trim() : getFriendlyPageName(getPageIdentifier());
    }

    function getFriendlyPageName(pagePath) {
        const fileName = normalizePagePath(pagePath).split("/").filter(Boolean).pop() || "index.html";
        const name = fileName.replace(/\.html$/i, "").replace(/[-_]/g, " ");
        if (name.toLowerCase() === "index") return "Car Health Check Documentation";
        return name.replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function removeQueryParameter(name) {
        const parameters = new URLSearchParams(window.location.search);
        parameters.delete(name);
        const query = parameters.toString();
        const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    function createId() {
        return window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `finding-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleString() : "";
    }

    function cssEscape(value) {
        return window.CSS && typeof window.CSS.escape === "function"
            ? window.CSS.escape(value)
            : String(value).replace(/["\\]/g, "\\$&");
    }
})();
