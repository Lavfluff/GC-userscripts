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
    }

    // UI elements
    function createButton({ text, left, width = "150px", onClick, extraCSS = {} }) {
        const btn = document.createElement("button");
        btn.textContent = text;

        // Shared styling
        Object.assign(btn.style, {
            position: "fixed",
            bottom: "20px",
            left: left,
            width: width,
            padding: "10px 14px",
            fontSize: "14px",
            borderRadius: "8px",
            background: "#6b63ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            zIndex: "99999",
            ...extraCSS
        });

        btn.addEventListener("click", onClick);
        document.body.appendChild(btn);
        return btn;
    }
    
    function addDataDisplayButton() {
        createButton({
            text: "📘 Opponent Data",
            left: "20px",
            onClick: () => {
                const data = loadData();
                alert(JSON.stringify(data, null, 2));
            }
        });
    }

    function addManualWeaponButton() {
        createButton({
            text: "➕ Add weapon manually",
            left: "185px",
            width: "200px",
            onClick: () => {
                if (!enemyName) return alert("No enemy detected right now!");

                const weapon = prompt(`Add weapon to ${enemyName}:`);
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
            }
        });
    }

    function addWipeButton() {
        createButton({
            text: "🗑️",
            left: "400px",
            width: "60px",
            onClick: () => {
                if (!enemyName) return alert("No enemy detected right now!");
                if (confirm(`Delete stored data for "${enemyName}"?`)) {
                    wipeEnemyData(enemyName);
                }
            }
        });
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

            // Filter rows: must *start* with the enemy name
            if (!text.startsWith(enemyName)) return;

            // ABILITIES
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

            // STANCES
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
            // WEAPONS
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
