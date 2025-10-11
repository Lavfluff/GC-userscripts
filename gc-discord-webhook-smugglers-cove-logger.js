// ==UserScript==
// @name         Grundos Cafe Discord Webhook Smugglers Cove Logger
// @version      1.2
// @description  Logs visits to Smugglers Cove and whether there is an item on Discord
// @author       Lav
// @match        *://*.grundos.cafe/pirates/smugglerscove*
// @icon         https://avatars.githubusercontent.com/u/178112779?v=4&size=40
// @grant        GM.getValue
// @grant        GM.setValue
// @updateURL    https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-discord-webhook-smugglers-cove-logger.js
// @downloadURL  https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-discord-webhook-smugglers-cove-logger.js
// ==/UserScript==

(async function() {
    'use strict';

    const page_html = document.body.innerHTML;
    const page_text = document.body.innerText;
    const content = document.getElementById("page_content");
    let payload = {};
    
    // load stored visit counter and last date
    let storedData = await GM.getValue("coveVisits", { counter: 0, date: null });
    let todayNST = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
    
    // reset counter if date has changed
    if (storedData.date !== todayNST) {
        storedData.counter = 0;
        storedData.date = todayNST;
        await GM.setValue("coveVisits", storedData);
    }
    
    // increment counter if user still has visits left
    if (storedData.counter < 6) {
        storedData.counter++;
        await GM.setValue("coveVisits", storedData);
        console.log(`Visit #${storedData.counter} for today (${todayNST})`);
    } else {
        console.log("All 6 visits used for today!");
    }

    // initialisation
    async function init() {
        let webhookUrls = await GM.getValue("discordWebhooks", []);

        // ask for at least one webhook before logging
        while (webhookUrls.length === 0) {
            const url = prompt("Enter your Discord Webhook URL (required to log visits):");
            if (url) {
                webhookUrls.push(url);
                await GM.setValue("discordWebhooks", webhookUrls);
            } else {
                alert("You must enter at least one webhook to enable logging!");
            }
        }

        // insert fixed button to manage webhooks
        insertWebhookButton();

        // log the cove visit
        await logCoveVisit(webhookUrls);
    }

    // button for webhook manager
    function insertWebhookButton() {
        const btn = document.createElement("button");
        btn.innerText = "Manage Discord Webhooks";
        btn.style.position = "fixed";
        btn.style.top = "15px";
        btn.style.right = "20px";
        btn.style.zIndex = "9999";
        btn.style.padding = "5px 10px";
        btn.style.backgroundColor = "#5865F2";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "5px";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "16px";

        btn.addEventListener("click", manageWebhooks);
        document.body.appendChild(btn);
    }

    // webhook manager
    async function manageWebhooks() {
        let webhookUrls = await GM.getValue("discordWebhooks", []);

        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.5)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "10000";

        const box = document.createElement("div");
        box.style.backgroundColor = "white";
        box.style.padding = "20px";
        box.style.borderRadius = "8px";
        box.style.minWidth = "300px";
        box.style.maxHeight = "80%";
        box.style.overflowY = "auto";

        const title = document.createElement("h3");
        title.innerText = "Manage Discord Webhooks";
        box.appendChild(title);

        // list existing webhooks
        const list = document.createElement("ul");
        webhookUrls.forEach((url, i) => {
            const li = document.createElement("li");
            li.style.marginBottom = "5px";
            li.textContent = url + " ";

            const delBtn = document.createElement("button");
            delBtn.innerText = "Delete";
            delBtn.style.marginLeft = "5px";
            delBtn.style.fontSize = "12px";
            delBtn.addEventListener("click", async () => {
                webhookUrls.splice(i, 1);
                await GM.setValue("discordWebhooks", webhookUrls);
                modal.remove();
                manageWebhooks(); // reopen modal to refresh list
            });

            li.appendChild(delBtn);
            list.appendChild(li);
        });
        box.appendChild(list);

        // button to add new webhook
        const addBtn = document.createElement("button");
        addBtn.innerText = "Add Webhook";
        addBtn.style.marginTop = "10px";
        addBtn.addEventListener("click", async () => {
            const newUrl = prompt("Enter a new Discord Webhook URL:");
            if (newUrl && !webhookUrls.includes(newUrl)) {
                webhookUrls.push(newUrl);
                await GM.setValue("discordWebhooks", webhookUrls);
                modal.remove();
                manageWebhooks(); // reopen modal
            } else if (webhookUrls.includes(newUrl)) {
                alert("This webhook is already saved.");
            }
        });
        box.appendChild(addBtn);

        // close modal button
        const closeBtn = document.createElement("button");
        closeBtn.innerText = "Close";
        closeBtn.style.marginTop = "10px";
        closeBtn.style.marginLeft = "10px";
        closeBtn.addEventListener("click", () => modal.remove());
        box.appendChild(closeBtn);

        modal.appendChild(box);
        document.body.appendChild(modal);
    }

    // cove logging
    // get NST time
    function getNSTTimestamp() {
        const nstElement = document.querySelector(".nst");
        return nstElement ? nstElement.innerText.replace(/\n/g, '').trim() : "Unknown NST time";
    }

    async function logCoveVisit(webhookUrls) {
        payload.timestamp = new Date();
        payload.visitNumber = storedData.counter;

        // extract username
        let usernameMatch = /user=(.*?)"/.exec(page_html);
        payload.username = usernameMatch ? usernameMatch[1] : "Unknown User";

        // check if user has used all daily visits
        if (page_text.includes("Are you trying to get us in trouble???")) {
            payload.out_of_visits = true;
            payload.item = null;
            payload.image = "";
            payload.cost = null;
        } else {
            // check if item exists in cove
            let item = content.querySelector(".shopInventory");
            if (item) {
                payload.item = item.querySelector(".item-info strong")?.innerText.trim() || "Unknown Item";
                payload.image = item.querySelector("form input[type=image]")?.src || "";
                payload.cost = item.querySelector(".item-info span")?.innerText.trim() || "";
            } else {
                payload.item = null;
                payload.image = "";
                payload.cost = null;
            }
        }

        // prepare embed
        let embedDescription;
        if (payload.out_of_visits) {
            embedDescription = `\`${payload.username}\` used up all visitations for today!\nSomeone else will have to check the cove instead.`;
        } else if (payload.item) {
            embedDescription = `\`${payload.username}\` visited Smugglers Cove.\nAnd managed to grab a goodie!!\nItem: \`${payload.item}\`\nCost: \`${payload.cost}\``;
        } else {
            embedDescription = `\`${payload.username}\` visited Smugglers Cove.\nBut it was empty!\n\nVisit #\`${payload.visitNumber}\` of 6\n`;
        }

        const discordPayload = {
            content: null,
            embeds: [{
                title: "Smugglers Cove Visit Logger",
                color: payload.item ? 15158332 : 9807270,
                description: embedDescription,
                thumbnail: payload.item ? { url: payload.image } : undefined,
                footer: { text: getNSTTimestamp() }
            }]
        };

        // send POST request to all webhooks
        for (let url of webhookUrls) {
            try {
                let res = await fetch(url, {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discordPayload)
                });
                if (!res.ok) console.error(`Error logging Cove visit to ${url}: ${res.statusText}`);
            } catch (err) {
                console.error(`Error logging Cove visit to ${url}:`, err);
            }
        }
    }

    if (document.URL.includes("/pirates/smugglerscove/")) {
        await init();
    }

})();
