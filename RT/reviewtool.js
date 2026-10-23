(function () {
    "use strict";

    const STORAGE_KEY = "sphinx-review-findings-v1";

    let selectedRange = null;
    let selectedText = "";

    document.addEventListener("DOMContentLoaded", function () {
        createSelectionButton();
        createFindingModal();
        createFindingsSidebar();

        restoreCurrentPageFindings();
        renderFindingsSidebar();
        locateFindingFromUrl();
    });

    /*
     * ==========================================================
     * TEXT SELECTION AND CREATE FINDING BUTTON
     * ==========================================================
     */

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
                event.target.closest("#create-finding-button") ||
                event.target.closest("#review-sidebar-open")
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

        button.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });

        button.addEventListener("click", function () {
            if (!selectedRange || !selectedText) {
                return;
            }

            document.getElementById("review-selected-text").textContent =
                selectedText;

            document.getElementById(
                "review-finding-description"
            ).value = "";

            document.getElementById(
                "review-finding-severity"
            ).value = "Major";

            document.getElementById(
                "review-finding-modal"
            ).style.display = "flex";

            hideSelectionButton();

            window.setTimeout(function () {
                document
                    .getElementById("review-finding-description")
                    .focus();
            }, 100);
        });

        document.addEventListener("mousedown", function (event) {
            if (!event.target.closest("#create-finding-button")) {
                hideSelectionButton();
            }
        });
    }

    function isInsideDocumentContent(node) {
        const element =
            node.nodeType === Node.ELEMENT_NODE
                ? node
                : node.parentElement;

        if (!element) {
            return false;
        }

        if (
            element.closest("#review-findings-sidebar") ||
            element.closest("#review-finding-modal")
        ) {
            return false;
        }

        return Boolean(
            element.closest(
                "main, article, .document, .body, " +
                ".rst-content, .bd-content, [role='main']"
            )
        );
    }

    function hideSelectionButton() {
        const button = document.getElementById(
            "create-finding-button"
        );

        if (button) {
            button.style.display = "none";
        }
    }

    /*
     * ==========================================================
     * CREATE FINDING MODAL
     * ==========================================================
     */

    function createFindingModal() {
        const modal = document.createElement("div");

        modal.id = "review-finding-modal";

        modal.innerHTML = `
            <div class="review-modal-content">
                <div class="review-modal-header">
                    <h3>Create Finding</h3>

                    <button
                        id="review-modal-close"
                        class="review-close-button"
                        type="button"
                        aria-label="Close finding dialog"
                    >
                        &times;
                    </button>
                </div>

                <div class="review-form-group">
                    <label>Selected content</label>
                    <div id="review-selected-text"></div>
                </div>

                <div class="review-form-group">
                    <label for="review-finding-severity">
                        Severity
                    </label>

                    <select id="review-finding-severity">
                        <option value="Critical">Critical</option>
                        <option value="Major" selected>Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Info">Info</option>
                    </select>
                </div>

                <div class="review-form-group">
                    <label for="review-finding-description">
                        Finding description
                    </label>

                    <textarea
                        id="review-finding-description"
                        rows="5"
                        placeholder="Describe the issue or required correction"
                    ></textarea>
                </div>

                <div class="review-modal-actions">
                    <button
                        id="review-cancel-finding"
                        class="review-secondary-button"
                        type="button"
                    >
                        Cancel
                    </button>

                    <button
                        id="review-save-finding"
                        class="review-primary-button"
                        type="button"
                    >
                        Save Finding
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document
            .getElementById("review-modal-close")
            .addEventListener("click", closeFindingModal);

        document
            .getElementById("review-cancel-finding")
            .addEventListener("click", closeFindingModal);

        document
            .getElementById("review-save-finding")
            .addEventListener("click", saveFinding);

        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeFindingModal();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeFindingModal();
            }

            if (
                event.key === "Enter" &&
                event.ctrlKey &&
                modal.style.display === "flex"
            ) {
                saveFinding();
            }
        });
    }

    function closeFindingModal() {
        const modal = document.getElementById(
            "review-finding-modal"
        );

        if (modal) {
            modal.style.display = "none";
        }
    }

    function saveFinding() {
        const description = document
            .getElementById("review-finding-description")
            .value.trim();

        const severity = document.getElementById(
            "review-finding-severity"
        ).value;

        if (!description) {
            alert("Please enter the finding description.");
            return;
        }

        if (!selectedRange || !selectedText) {
            alert(
                "The selected content is no longer available. " +
                "Please select the content again."
            );

            closeFindingModal();
            return;
        }

        const finding = {
            id: createId(),
            page: getPageIdentifier(),
            pageTitle: getCurrentPageTitle(),
            selectedText: selectedText,
            description: description,
            severity: severity,
            status: "Open",
            createdAt: new Date().toISOString()
        };

        try {
            highlightSelectedRange(
                finding.id,
                finding.severity
            );
        } catch (error) {
            console.error(
                "Unable to highlight selected text:",
                error
            );

            alert(
                "The selected content crosses multiple HTML elements. " +
                "Please select text inside a single paragraph, list item, " +
                "table cell, or heading."
            );

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

        mark.className =
            "review-finding-highlight severity-" +
            severity.toLowerCase();

        mark.dataset.findingId = findingId;
        mark.title = `Review finding: ${severity}`;

        selectedRange.surroundContents(mark);

        mark.addEventListener("click", function () {
            focusFindingCard(findingId);
        });

        window.getSelection().removeAllRanges();
    }

    /*
     * ==========================================================
     * FINDINGS SIDEBAR
     * ==========================================================
     */

    function createFindingsSidebar() {
        const sidebar = document.createElement("aside");

        sidebar.id = "review-findings-sidebar";

        sidebar.innerHTML = `
            <div class="review-sidebar-header">
                <div>
                    <h3>Review Findings</h3>
                    <span id="review-findings-count">
                        0 findings
                    </span>
                </div>

                <button
                    id="review-sidebar-toggle"
                    type="button"
                    aria-label="Close findings panel"
                >
                    &times;
                </button>
            </div>

            <div class="review-sidebar-toolbar">
                <select
                    id="review-status-filter"
                    aria-label="Filter findings by status"
                >
                    <option value="All">All findings</option>
                    <option value="Open">Open findings</option>
                    <option value="Resolved">Resolved findings</option>
                </select>
            </div>

            <div id="review-findings-list"></div>
        `;

        document.body.appendChild(sidebar);

        const reopenButton = document.createElement("button");

        reopenButton.id = "review-sidebar-open";
        reopenButton.type = "button";
        reopenButton.textContent = "Findings";
        reopenButton.style.display = "none";

        document.body.appendChild(reopenButton);

        document
            .getElementById("review-sidebar-toggle")
            .addEventListener("click", closeFindingsSidebar);

        reopenButton.addEventListener(
            "click",
            openFindingsSidebar
        );

        document
            .getElementById("review-status-filter")
            .addEventListener(
                "change",
                renderFindingsSidebar
            );
    }

    function closeFindingsSidebar() {
        const sidebar = document.getElementById(
            "review-findings-sidebar"
        );

        const openButton = document.getElementById(
            "review-sidebar-open"
        );

        sidebar.classList.add("review-sidebar-hidden");
        openButton.style.display = "block";
    }

    function openFindingsSidebar() {
        const sidebar = document.getElementById(
            "review-findings-sidebar"
        );

        const openButton = document.getElementById(
            "review-sidebar-open"
        );

        sidebar.classList.remove("review-sidebar-hidden");
        openButton.style.display = "none";
    }

    function renderFindingsSidebar() {
        const list = document.getElementById(
            "review-findings-list"
        );

        const countElement = document.getElementById(
            "review-findings-count"
        );

        if (!list) {
            return;
        }

        /*
         * Important:
         * Do not filter by current page here.
         * The sidebar must show findings from every page.
         */
        let findings = getStoredFindings();

        const statusFilter = document.getElementById(
            "review-status-filter"
        );

        if (
            statusFilter &&
            statusFilter.value !== "All"
        ) {
            findings = findings.filter(
                finding =>
                    finding.status === statusFilter.value
            );
        }

        findings.sort(function (first, second) {
            return new Date(second.createdAt) -
                new Date(first.createdAt);
        });

        const totalFindings = getStoredFindings().length;

        if (countElement) {
            countElement.textContent =
                totalFindings === 1
                    ? "1 finding"
                    : `${totalFindings} findings`;
        }

        list.replaceChildren();

        if (findings.length === 0) {
            const emptyState = document.createElement("div");

            emptyState.className = "review-empty-state";
            emptyState.textContent =
                "No findings are available. Select text " +
                "inside a document page to create a finding.";

            list.appendChild(emptyState);
            return;
        }

        findings.forEach(function (finding) {
            list.appendChild(
                createFindingCard(finding)
            );
        });
    }

    function createFindingCard(finding) {
        const item = document.createElement("div");

        item.className = "review-finding-card";
        item.dataset.findingCardId = finding.id;

        if (finding.status === "Resolved") {
            item.classList.add(
                "review-finding-resolved"
            );
        }

        if (finding.page === getPageIdentifier()) {
            item.classList.add(
                "review-current-page-finding"
            );
        }

        const pageName = document.createElement("button");

        pageName.type = "button";
        pageName.className = "review-finding-page";
        pageName.textContent =
            finding.pageTitle ||
            getFriendlyPageName(finding.page);

        pageName.title = "Open this document page";

        pageName.addEventListener("click", function () {
            locateFinding(finding.id);
        });

        const topRow = document.createElement("div");
        topRow.className = "review-card-top-row";

        const severity = document.createElement("span");

        severity.className =
            "review-severity severity-" +
            finding.severity.toLowerCase();

        severity.textContent = finding.severity;

        const status = document.createElement("span");

        status.className =
            "review-status review-status-" +
            finding.status.toLowerCase();

        status.textContent = finding.status;

        topRow.append(severity, status);

        const selectedTextElement =
            document.createElement("div");

        selectedTextElement.className =
            "review-card-selected-text";

        selectedTextElement.textContent =
            finding.selectedText;

        const description = document.createElement("p");

        description.className =
            "review-card-description";

        description.textContent = finding.description;

        const metadata = document.createElement("small");

        metadata.className = "review-card-metadata";
        metadata.textContent =
            `Created: ${formatDate(finding.createdAt)}`;

        const actions = document.createElement("div");

        actions.className = "review-card-actions";

        const locateButton = createActionButton(
            "Locate",
            "review-locate-button",
            function () {
                locateFinding(finding.id);
            }
        );

        const resolveButton = createActionButton(
            finding.status === "Resolved"
                ? "Reopen"
                : "Resolve",
            "review-resolve-button",
            function () {
                toggleFindingStatus(finding.id);
            }
        );

        const deleteButton = createActionButton(
            "Delete",
            "review-delete-button",
            function () {
                deleteFinding(finding.id);
            }
        );

        actions.append(
            locateButton,
            resolveButton,
            deleteButton
        );

        item.append(
            pageName,
            topRow,
            selectedTextElement,
            description,
            metadata,
            actions
        );

        return item;
    }

    function createActionButton(
        text,
        className,
        clickHandler
    ) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = text;

        button.addEventListener(
            "click",
            clickHandler
        );

        return button;
    }

    /*
     * ==========================================================
     * RESTORE FINDINGS ON CURRENT PAGE
     * ==========================================================
     */

    function restoreCurrentPageFindings() {
        /*
         * Important:
         * Only restore highlights for findings belonging
         * to the currently displayed document page.
         */
        const currentPageFindings =
            getStoredFindings().filter(
                finding =>
                    normalizePagePath(finding.page) ===
                    normalizePagePath(
                        getPageIdentifier()
                    )
            );

        currentPageFindings.forEach(function (finding) {
            const existingHighlight =
                document.querySelector(
                    `[data-finding-id="${cssEscape(
                        finding.id
                    )}"]`
                );

            if (!existingHighlight) {
                highlightStoredText(finding);
            }
        });
    }

    function highlightStoredText(finding) {
        const content = getDocumentContentElement();

        if (!content) {
            console.warn(
                "ReviewTool could not identify the " +
                "document content element."
            );

            return;
        }

        const walker = document.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parent = node.parentElement;

            if (!parent) {
                continue;
            }

            if (
                parent.closest(
                    "script, style, mark, nav, " +
                    "#review-findings-sidebar, " +
                    "#review-finding-modal"
                )
            ) {
                continue;
            }

            const nodeText = node.nodeValue;
            const index = nodeText.indexOf(
                finding.selectedText
            );

            if (index === -1) {
                continue;
            }

            const range = document.createRange();

            range.setStart(node, index);
            range.setEnd(
                node,
                index + finding.selectedText.length
            );

            const mark = document.createElement("mark");

            mark.className =
                "review-finding-highlight severity-" +
                finding.severity.toLowerCase();

            mark.dataset.findingId = finding.id;
            mark.title =
                `Review finding: ${finding.severity}`;

            range.surroundContents(mark);

            mark.addEventListener(
                "click",
                function () {
                    focusFindingCard(finding.id);
                }
            );

            return;
        }

        console.warn(
            "ReviewTool could not restore finding:",
            finding.id,
            finding.selectedText
        );
    }

    function getDocumentContentElement() {
        return document.querySelector(
            ".rst-content .document, " +
            ".rst-content, " +
            "main article, " +
            "article, " +
            ".bd-content, " +
            "main, " +
            "[role='main'], " +
            ".document, " +
            ".body"
        );
    }

    /*
     * ==========================================================
     * LOCATE FINDING
     * ==========================================================
     */

    function locateFinding(findingId) {
        const findings = getStoredFindings();

        const finding = findings.find(
            item => item.id === findingId
        );

        if (!finding) {
            alert("Finding could not be found.");
            return;
        }

        const currentPage = normalizePagePath(
            getPageIdentifier()
        );

        const findingPage = normalizePagePath(
            finding.page
        );

        if (findingPage !== currentPage) {
            /*
             * Navigate to the page where the finding
             * was originally created.
             */
            const separator =
                finding.page.includes("?")
                    ? "&"
                    : "?";

            window.location.href =
                finding.page +
                separator +
                "locateFinding=" +
                encodeURIComponent(finding.id);

            return;
        }

        scrollToFindingHighlight(finding.id);
    }

    function locateFindingFromUrl() {
        const parameters = new URLSearchParams(
            window.location.search
        );

        const findingId =
            parameters.get("locateFinding");

        if (!findingId) {
            return;
        }

        /*
         * The highlights are restored before this function.
         * A short delay lets the browser finish rendering.
         */
        window.setTimeout(function () {
            scrollToFindingHighlight(findingId);
            openFindingsSidebar();
        }, 400);

        parameters.delete("locateFinding");

        const remainingQuery = parameters.toString();

        const cleanUrl =
            window.location.pathname +
            (remainingQuery
                ? "?" + remainingQuery
                : "") +
            window.location.hash;

        window.history.replaceState(
            {},
            document.title,
            cleanUrl
        );
    }

    function scrollToFindingHighlight(findingId) {
        const highlight = document.querySelector(
            `[data-finding-id="${cssEscape(
                findingId
            )}"]`
        );

        if (!highlight) {
            alert(
                "The correct document page was opened, " +
                "but the original selected text could not " +
                "be located. The document content may have changed."
            );

            return;
        }

        highlight.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
        });

        highlight.classList.add(
            "review-highlight-focus"
        );

        window.setTimeout(function () {
            highlight.classList.remove(
                "review-highlight-focus"
            );
        }, 2200);

        focusFindingCard(findingId);
    }

    function focusFindingCard(findingId) {
        openFindingsSidebar();

        const card = document.querySelector(
            `[data-finding-card-id="${cssEscape(
                findingId
            )}"]`
        );

        if (!card) {
            return;
        }

        card.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        card.classList.add("review-card-focus");

        window.setTimeout(function () {
            card.classList.remove(
                "review-card-focus"
            );
        }, 2200);
    }

    /*
     * ==========================================================
     * FINDING ACTIONS
     * ==========================================================
     */

    function toggleFindingStatus(findingId) {
        const findings = getStoredFindings();

        const finding = findings.find(
            item => item.id === findingId
        );

        if (!finding) {
            return;
        }

        finding.status =
            finding.status === "Resolved"
                ? "Open"
                : "Resolved";

        finding.updatedAt =
            new Date().toISOString();

        saveStoredFindings(findings);
        renderFindingsSidebar();
    }

    function deleteFinding(findingId) {
        const finding = getStoredFindings().find(
            item => item.id === findingId
        );

        if (!finding) {
            return;
        }

        const shouldDelete = window.confirm(
            "Delete this finding?\n\n" +
            finding.description
        );

        if (!shouldDelete) {
            return;
        }

        const updatedFindings =
            getStoredFindings().filter(
                item => item.id !== findingId
            );

        saveStoredFindings(updatedFindings);

        const highlight = document.querySelector(
            `[data-finding-id="${cssEscape(
                findingId
            )}"]`
        );

        if (highlight) {
            highlight.replaceWith(
                document.createTextNode(
                    highlight.textContent
                )
            );
        }

        renderFindingsSidebar();
    }

    /*
     * ==========================================================
     * LOCAL STORAGE
     * ==========================================================
     */

    function getStoredFindings() {
        try {
            const storedValue =
                localStorage.getItem(STORAGE_KEY);

            if (!storedValue) {
                return [];
            }

            const findings = JSON.parse(storedValue);

            return Array.isArray(findings)
                ? findings
                : [];
        } catch (error) {
            console.error(
                "Unable to retrieve review findings:",
                error
            );

            return [];
        }
    }

    function saveStoredFindings(findings) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(findings)
            );
        } catch (error) {
            console.error(
                "Unable to save review findings:",
                error
            );

            alert(
                "The finding could not be saved in browser storage."
            );
        }
    }

    /*
     * ==========================================================
     * PAGE AND DISPLAY HELPERS
     * ==========================================================
     */

    function getPageIdentifier() {
        return window.location.pathname;
    }

    function normalizePagePath(pagePath) {
        if (!pagePath) {
            return "";
        }

        return pagePath
            .split("?")[0]
            .split("#")[0]
            .replace(/\/+/g, "/")
            .replace(/\/$/, "/index.html");
    }

    function getCurrentPageTitle() {
        const heading = document.querySelector(
            "main h1, article h1, " +
            ".rst-content h1, .bd-content h1, h1"
        );

        if (heading) {
            return heading.textContent
                .replace("¶", "")
                .trim();
        }

        return getFriendlyPageName(
            getPageIdentifier()
        );
    }

    function getFriendlyPageName(pagePath) {
        const cleanPath = normalizePagePath(pagePath);

        const fileName =
            cleanPath
                .split("/")
                .filter(Boolean)
                .pop() || "index.html";

        const cleanName = fileName
            .replace(/\.html$/i, "")
            .replace(/[-_]/g, " ");

        if (
            cleanName.toLowerCase() === "index"
        ) {
            return "Car Health Check Documentation";
        }

        return cleanName.replace(
            /\b\w/g,
            letter => letter.toUpperCase()
        );
    }

    function createId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
                "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            "finding-" +
            Date.now() +
            "-" +
            Math.random().toString(16).slice(2)
        );
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleString();
    }

    function cssEscape(value) {
        if (
            window.CSS &&
            typeof window.CSS.escape === "function"
        ) {
            return window.CSS.escape(value);
        }

        return String(value).replace(
            /["\\]/g,
            "\\$&"
        );
    }
})();