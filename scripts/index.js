import { JournalLink } from './journallink.js';
//import { JournalLinkSettings } from './settings.js';

const MODULE_NAME = 'journal-links';
const NAME = 'Journal Links';

Hooks.on("init", () => {
    console.log('journal-links | initializing');
    let modulename = MODULE_NAME;
    game.settings.register(MODULE_NAME, 'rebuildOnSave', {
        name : 'Rebuild links on journal save',
        hint: 'If unchecked, linking only happens on manual sync. As there is currently no way to manually sync, effectively disables linking.',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MODULE_NAME, 'headingTag', {
        name : 'Heading tag for links',
        hint: 'For <h1>Links</h1>, enter h1. Do not add classes, etc.',
        scope: 'world',
        config: true,
        type: String,
        default: 'h1'
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
