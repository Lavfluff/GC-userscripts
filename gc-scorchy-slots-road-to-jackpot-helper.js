// ==UserScript==
// @name         Scorchy Slots - Road to Jackpot Helper
// @author       Lav
// @description  Enlarges 'Play Again' button, enables spam-clicking and also highlights jackpot slots for holding
// @match        https://www.grundos.cafe/games/play_slots/
// @icon         https://avatars.githubusercontent.com/u/178112779?v=4&size=40
// @grant        GM_addStyle
// @grant        GM.getValue
// @grant        GM.setValue
// @version      1.0
// @updateURL    https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-scorchy-slots-road-to-jackpot-helper.js
// @downloadURL  https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-scorchy-slots-road-to-jackpot-helper.js
// ==/UserScript==

(async function() {
    'use strict';

    const STORAGE_WIDTH = "playAgainWidth";
    const STORAGE_HEIGHT = "playAgainHeight";

    // load stored button dimensions
    let savedWidth = await GM.getValue(STORAGE_WIDTH, 200);
    let savedHeight = await GM.getValue(STORAGE_HEIGHT, 200);

    if (savedWidth < 200) {
        savedWidth = 200;
        GM.setValue(STORAGE_WIDTH, 200);
    }
    if (savedHeight < 100) {
        savedHeight = 100;
        GM.setValue(STORAGE_HEIGHT, 100);
    }

    // styles für resizable button and jackpot checkboxes
    GM_addStyle(`
        .playagain-cloned {
            width: ${savedWidth}px;
            height: ${savedHeight}px;
            min-width: 200px;
            min-height: 100px;
            max-width: 100%;
            resize: both;
            overflow: hidden;
            margin-bottom: 10px;
        }
        .playagain-cloned input {
            width: 100%;
            height: 100% !important;
            display: block;
            font-size: 1.5em;
            font-weight: bold;
        }
        .jackpot-hold {
            border: 3px solid red !important;
            padding: 5px;
        }
        .jackpot-hold input[type="checkbox"] {
            transform: scale(2);
            margin-top: 5px;
        }
        .playagain-cloned input:disabled {
            background: #aaa !important;
            cursor: not-allowed !important;
        }
    `);

    const mainContent = document.querySelector("#page_content > main");
    if (!mainContent) return;
    const playAgainOriginal = document.querySelector(".button-group input[type="submit"][value="Play Again"]");

    // only on actual slots pages, not when you are out of plays for the day
    if (playAgainOriginal) {
        const playAgainBtnContainer = document.createElement("div");
        playAgainBtnContainer.classList.add("playagain-cloned");
        const playAgainBtn = playAgainOriginal.cloneNode(true);
        playAgainBtn.value = "Play Again";

        // save new width/height on resize
        let resizeObserver = new ResizeObserver(async () => {
            await GM.setValue(STORAGE_WIDTH, playAgainBtnContainer.offsetWidth);
            await GM.setValue(STORAGE_HEIGHT, playAgainBtnContainer.offsetHeight);
        });
        resizeObserver.observe(playAgainBtnContainer);

        // click -> press the original 'Play Again' button and make the button unclickable to enable spam clicking without resending the event
        playAgainBtn.addEventListener("click", () => {
            playAgainBtn.disabled = true;
            playAgainOriginal.click();
        });

        playAgainBtnContainer.appendChild(playAgainBtn);
        mainContent.prepend(playAgainBtnContainer);

        // highlight jackpot checkboxes
        const jackpotIcon = "https://grundoscafe.b-cdn.net/games/slots/fruits/baggold_0.gif"; // image source for jackpot symbol
        const secondRow = document.querySelector('#scorchy-slots .scorchy-row:nth-child(2)');
        const holdDiv = document.querySelector('#scorchy-hold');

        if (secondRow && holdDiv) {
            const imgs = Array.from(secondRow.querySelectorAll('img'));
            const jackpotIndices = [];

            imgs.forEach((img, idx) => {
                if (img.src === jackpotIcon) {
                    jackpotIndices.push(idx);
                }
            });

            jackpotIndices.forEach((idx) => {
                const holdNodes = holdDiv.querySelectorAll('.scorchy-hold-node');
                const holdNode = holdNodes[idx];
                if (holdNode) {
                    holdNode.classList.add('jackpot-hold');
                }
            });

            // disable 'Play Again' button if jackpot holds are highlighted but not yet checked to prevent accidental refresh
            function updateButtonState() {
                let disable = false;
                jackpotIndices.forEach((idx) => {
                    const holdNodes = holdDiv.querySelectorAll('.scorchy-hold-node');
                    const holdNode = holdNodes[idx];
                    if (holdNode) {
                        const cb = holdNode.querySelector('input[type="checkbox"]');
                        if (cb && !cb.checked) {
                            disable = true;
                        }
                    }
                });
                playAgainBtn.disabled = disable;
            }

            // initial check
            updateButtonState();

            jackpotIndices.forEach(idx => {
                const holdNode = holdDiv.querySelectorAll('.scorchy-hold-node')[idx];
                if (!holdNode) return;
                const cb = holdNode.querySelector('input[type="checkbox"]');
                if (cb) cb.addEventListener('change', updateButtonState);
            });
        }
    }
})();
