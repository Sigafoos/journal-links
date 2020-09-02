import { JournalLink } from './journallink.js';
//import { JournalLinkSettings } from './settings.js';

const MODULE_NAME = 'journal-link';
const NAME = 'Journal Link';
const SETTINGS_NAME = 'journalLinkSettings';

Hooks.on("init", () => {
    console.log('journal-link | initializing');
    let modulename = MODULE_NAME;
    game.settings.register(MODULE_NAME, 'test-setting', {
        name : 'Rebuild links on journal save',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });

    game.JournalLink = new JournalLink();
});

Hooks.on('updateJournalEntry', (args) => game.JournalLink && game.JournalLink.updateJournalEntry(args));
Hooks.on('renderJournalSheet', (sheet, html, data) => game.JournalLink && game.JournalLink.includeLinks(sheet, html, data));
// updateItem
// updateActor
// roll tables have no context of this stuff
// renderActorSheet (is that generic enough?)
// renderItemSheet
