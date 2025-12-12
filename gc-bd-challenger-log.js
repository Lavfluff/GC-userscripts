// ==UserScript==
// @name         Grundos Cafe Challenger Log
// @version      1.0
// @description  Logs weapons and abilities used by battledome challengers to accumulate into a challengers.json
// @author       Lav
// @match        *://*.grundos.cafe/dome/1p/battle*
// @icon         https://avatars.githubusercontent.com/u/178112779?v=4&size=40
// @grant        GM.getValue
// @grant        GM.setValue
// @updateURL    https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-bd-challenger-log.js
// @downloadURL  https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-bd-challenger-log.js
// ==/UserScript==

(async function() {
    'use strict';
    const STORAGE_KEY = "grundosOpponentData";
    const ABILITIES = [
        "Spark",
        "Invisibility",
        "Diamond Dust",
        "Shadow Health",
        "Shroud",
        "Sink",
        "Magic Berries",
        "Tough Skin",
        "Burrow",
        "Song of the Volcano",
        "Fiery Roar",
        "Meteor Shower",
        "Sun Ray",
        "Ascension",
        "Psychic Blast",
        "Heal",
        "Water Breathing",
        "Watery Guardian"
    ];
    const STANCE_KEYWORDS = {
        "like berserk!": "Berserk Attack",
        "fiercely attacks!": "Fierce Attack",
        "jumps and attacks!": "Jump and Attack",
        "attacks!": "Normal Attack",
        "cautiously attacks!": "Cautious Attack",
        "defends themselves": "Defend"
    };
    let enemyName = null;

    function loadData() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
    }

    function wipeEnemyData(name) {
        const data = loadData();

        if (data[name]) {
            delete data[name];
            saveData(data);
        }

        renderUI(); // re-render to show it's gone
    }

    function addDataDisplayButton() {
        const btn = document.createElement("button");
        btn.textContent = "📘 Opponent Data";
        btn.style.position = "fixed";
        btn.style.bottom = "20px";
        btn.style.left = "20px";
        btn.style.zIndex = "99999";
        btn.style.padding = "10px 14px";
        btn.style.width = "150px";
        btn.style.fontSize = "14px";
        btn.style.borderRadius = "8px";
        btn.style.background = "#6b63ff";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

        btn.onclick = () => {
            const data = loadData();
            alert(JSON.stringify(data, null, 2));
        };

        document.body.appendChild(btn);
    }

    function addManualWeaponButton() {
        const btn = document.createElement("button");
        btn.textContent = "➕ Add weapon manually";
        btn.style.position = "fixed";
        btn.style.bottom = "20px"; 
        btn.style.left = "185px";
        btn.style.width = "200px";
        btn.style.padding = "10px 14px";
        btn.style.fontSize = "14px";
        btn.style.borderRadius = "8px";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.background = "#6b63ff";
        btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        btn.style.zIndex = "99999";

        btn.addEventListener("click", () => {
            if (!enemyName) {
                alert("No enemy detected right now!");
                return;
            }

            const weapon = prompt(`Add weapon to ${enemyName}:`).trim();
            if (!weapon) return;

            const data = loadData();

            if (!data[enemyName]) {
                data[enemyName] = { weapons: [], abilities: [], stances: [] };
            }

            if (!data[enemyName].weapons.includes(weapon)) {
                data[enemyName].weapons.push(weapon);
                saveData(data);
                alert(`Added "${weapon}" to ${enemyName}.`);
            } else {
                alert(`"${weapon}" is already recorded for ${enemyName}.`);
            }
        });

        document.body.appendChild(btn);
    }

    function addWipeButton() {
        const btn = document.createElement("button");
        btn.textContent = "🗑️";
        btn.style.position = "fixed";
        btn.style.bottom = "20px";
        btn.style.left = "400px";
        btn.style.padding = "10px 14px";
        btn.style.fontSize = "14px";
        btn.style.borderRadius = "8px";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.cursor = "pointer";
        btn.style.background = "#6b63ff";
        btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

        btn.addEventListener("click", () => {
            if (!enemyName) {
                alert("No enemy detected right now!");
                return;
            }
            if (confirm(`Delete stored data for "${enemyName}"?`)) {
                wipeEnemyData(enemyName);
                renderStats(); // refresh UI after wipe
            }
        });

        document.body.appendChild(btn);
    }

    function parseBattleLog() {
        const log = document.querySelector("#combatlog");
        if (!log) return;

        const headerRow = log.querySelector("tr");
        if (!headerRow) return;

        const enemyNameCell = headerRow.querySelector("td:last-child b");
        if (!enemyNameCell) return;

        enemyName = enemyNameCell.textContent.trim().replace(/\s+/g, " ");

        const data = loadData();
        if (!data[enemyName]) {
            data[enemyName] = { weapons: [], abilities: [], stances: [] };
        }

        const playerNameCell = headerRow.querySelector("td:first-child b");
        const playerName = playerNameCell ? playerNameCell.textContent.trim() : null;

        const rows = [...log.querySelectorAll("tr")];

        rows.forEach(row => {
            const tds = [...row.querySelectorAll("td")];
            if (tds.length < 2) return;

            const text = tds[1].textContent.trim();

            // Filter rows: must START with the enemy name
            if (!text.startsWith(enemyName)) return;

            // ------------------------------------------------------
            // ABILITIES (whitelist scan in same valid td)
            // ------------------------------------------------------

            let isAbility = false;
            ABILITIES.forEach(ability => {
                if (text.includes(ability)) {
                    isAbility = true;
                    if (!data[enemyName].abilities.includes(ability)) {
                        data[enemyName].abilities.push(ability);
                    }
                }
            });
            if (isAbility) return;

            // ------------------------------------------------------
            // STANCES (whitelist scan in same valid td)
            // ------------------------------------------------------
            let isStance = false;
            Object.entries(STANCE_KEYWORDS).forEach(([keyword, stance]) => {
                if (text.includes(keyword)) {
                    isStance = true;
                    if (!data[enemyName].stances.includes(stance)) {
                        data[enemyName].stances.push(stance);
                    }
                }
            });
            if (isStance) return;
            // ------------------------------------------------------
            // WEAPONS (only from <strong> tags in valid enemy rows)
            // ------------------------------------------------------
            const strongs = [...tds[1].querySelectorAll("strong")];

            strongs.forEach(el => {
                const name = el.textContent.trim();
                if (name === enemyName || name === playerName || name === "critical hit") return;

                if (!data[enemyName].weapons.includes(name)) {
                    data[enemyName].weapons.push(name);
                }
            });
        });

        saveData(data);
    }

    // Start
    parseBattleLog();
    addDataDisplayButton();
    addWipeButton();
    addManualWeaponButton();
})();
