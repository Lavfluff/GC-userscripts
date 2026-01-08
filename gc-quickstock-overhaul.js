// ==UserScript==
// @name         Grundos Cafe Quickstock Overhaul
// @namespace    https://www.grundos.cafe/
// @version      1.0
// @description  Groups items in quickstock to perform actions on all of them with one click.
// @match        *://*.grundos.cafe/quickstock*
// @icon         https://avatars.githubusercontent.com/u/178112779?v=4&size=40
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-quickstock-overhaul.js
// @downloadURL  https://raw.githubusercontent.com/Lavfluff/GC-userscripts/refs/heads/main/gc-quickstock-overhaul.js
// ==/UserScript==

(function () {
    'use strict';

    // Configuration, you may add more buttons for your galleries here if you feel confident to do that
    const ACTIONS = [
        { label: 'Stock', value: '0' },
        { label: 'Deposit', value: '1' },
        { label: 'Donate', value: '2' },
        { label: 'Discard', value: '3' }
    ];

    // helper functions
    function createButton(label, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.width = '100%';
        button.addEventListener('click', onClick);
        return button;
    }

    function createSectionHeader(text) {
        const header = document.createElement('div');
        header.className = 'data section-header';
        header.style.gridColumn = '1 / -1';
        header.style.background = 'var(--grid_head)';
        header.style.textTransform = 'uppercase';
        header.textContent = text;
        return header;
    }

    // setup and parsing
    const grid = document.querySelector('.market_grid.qs');
    if (!grid) return;

    const allCells = Array.from(grid.children);
    const itemBlocks = [];

    for (let index = 0; index < allCells.length; index++) {
        const cell = allCells[index];
        const nameSpan = cell.querySelector?.('.reset');
        if (!nameSpan) continue;

        const blockCells = [cell];
        let nextIndex = index + 1;

        while (
            nextIndex < allCells.length &&
            !allCells[nextIndex].querySelector?.('.reset')
        ) {
            blockCells.push(allCells[nextIndex]);
            nextIndex++;
        }

        itemBlocks.push({
            name: nameSpan.textContent.trim(),
            cells: blockCells
        });
    }

    // item grouping logic
    const groupedByName = {};
    itemBlocks.forEach(item => {
        (groupedByName[item.name] ??= []).push(item);
    });

    const singleItems = [];
    const groupedItems = [];

    Object.values(groupedByName).forEach(blocks => {
        blocks.length === 1
            ? singleItems.push(blocks[0])
            : groupedItems.push(blocks);
    });

    // clear Original Layout
    itemBlocks.flatMap(item => item.cells).forEach(cell => cell.remove());

    // Singles
    if (singleItems.length) {
        grid.appendChild(createSectionHeader('Single Items'));
        singleItems.forEach(item =>
            item.cells.forEach(cell => grid.appendChild(cell))
        );
    }

    // Groups
    if (groupedItems.length) {
        grid.appendChild(createSectionHeader('Grouped Items'));

        groupedItems.forEach(group => {
            const groupRowCells = [];

            // Name + Clear cell
            const nameCell = document.createElement('div');
            nameCell.className = 'data group-row';
            nameCell.style.background = 'var(--grid_select)';
            nameCell.style.display = 'flex';
            nameCell.style.alignItems = 'center';
            nameCell.style.justifyContent = 'flex-start';
            nameCell.style.gap = '8px';

            const clearButton = createButton('Clear', () => {
                group.forEach(item =>
                    item.cells.forEach(cell =>
                        cell
                            .querySelectorAll('input[type="radio"]')
                            .forEach(radio => (radio.checked = false))
                    )
                );
            });
            clearButton.style.minWidth = 'fit-content';
            clearButton.style.maxWidth = 'fit-content';

            const label = document.createElement('strong');
            label.textContent = `${group[0].name} × ${group.length}`;
            label.style.textAlign = 'center';
            label.style.width = '100%';
            nameCell.appendChild(clearButton);
            nameCell.appendChild(label);
            groupRowCells.push(nameCell);

            // Action buttons
            ACTIONS.forEach(action => {
                const actionCell = document.createElement('div');
                actionCell.className = 'data group-row';
                actionCell.style.background = 'var(--grid_select)';
                actionCell.style.minWidth = '67px';

                const actionButton = createButton(action.label, () => {
                    group.forEach(item =>
                        item.cells.forEach(cell =>
                            cell
                                .querySelectorAll('input[type="radio"]')
                                .forEach(radio => {
                                    if (radio.value === action.value) {
                                        radio.checked = true;
                                    }
                                })
                        )
                    );
                });

                actionCell.appendChild(actionButton);
                groupRowCells.push(actionCell);
            });

            // fill remaining columns (gallery-safe)
            const columnCount = itemBlocks[0]?.cells.length ?? 1;
            while (groupRowCells.length < columnCount) {
                const filler = document.createElement('div');
                filler.className = 'data group-row';
                filler.style.background = 'var(--grid_select)';
                groupRowCells.push(filler);
            }

            groupRowCells.forEach(cell => grid.appendChild(cell));

            // render grouped items
            group.forEach(item =>
                item.cells.forEach(cell => grid.appendChild(cell))
            );
        });
    }

    // recolor rows with the intended alternating colors
    let zebraIndex = 0;
    [...singleItems, ...groupedItems.flat()].forEach(item => {
        const background =
            zebraIndex++ % 2 === 0
                ? 'var(--grid_even)'
                : 'var(--grid_odd)';

        item.cells.forEach(cell => {
            cell.style.background = background;
        });
    });
})();
