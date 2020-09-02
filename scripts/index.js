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

    let jl = new JournalLink();
    game.JournalLink = jl;
    CONFIG.debug.JournalLink = false;

    // roll tables have no context of this stuff

    // things what update
    Hooks.on('updateJournalEntry', game.JournalLink.updateJournalEntry.bind(jl));
    Hooks.on('updateActor', game.JournalLink.updateActor.bind(jl));
    Hooks.on('updateItem', game.JournalLink.updateItem.bind(jl));

    // things what render
    Hooks.on('renderJournalSheet', game.JournalLink.includeJournalLinks.bind(jl));
    Hooks.on('renderActorSheet', game.JournalLink.includeActorLinks.bind(jl));
    Hooks.on('renderItemSheet', game.JournalLink.includeItemLinks.bind(jl));
});
