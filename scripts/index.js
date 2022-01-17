import { JournalLink } from './journallink.js';
import { Sync } from './sync.js';

// bump this to cause a sync on page load (one time)
const SYNC_VERSION = 1;

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
    game.settings.register(MODULE_NAME, 'debug', {
        name : 'Debug logging',
        scope: 'client',
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MODULE_NAME, 'lastSyncedVersion', {
        name : 'Last synced version',
        hint: 'If we perform a bugfix that would benefit from resyncing, SYNC_VERSION will be out of -- forgive me -- sync, indicating we should perform a sync',
        scope: 'world',
        config: false,
        type: Number,
        default: 0
    });
    game.settings.registerMenu(MODULE_NAME, 'syncButton', {
        name: 'Sync entries',
        label: 'Sync now',
        icon: 'fas fa-sync-alt',
        type: Sync,
        restricted: true
    });

    let jl = new JournalLink();
    game.JournalLink = jl;
    CONFIG.debug.JournalLinks = game.settings.get(MODULE_NAME, 'debug');

    // things what update
    Hooks.on('preUpdateJournalEntry', game.JournalLink.updateJournalEntry.bind(jl));
    Hooks.on('preUpdateActor', game.JournalLink.updateActor.bind(jl));
    Hooks.on('preUpdateItem', game.JournalLink.updateItem.bind(jl));

    // things what render
    Hooks.on('renderJournalSheet', game.JournalLink.includeJournalLinks.bind(jl));
    Hooks.on('renderActorSheet', game.JournalLink.includeActorLinks.bind(jl));
    Hooks.on('renderItemSheet', game.JournalLink.includeItemLinks.bind(jl));

    // initial sync
    Hooks.on('ready', () => {
        if (game.settings.get(MODULE_NAME, 'lastSyncedVersion') < SYNC_VERSION) {
            console.log('journal-links | performing sync...');
            game.JournalLink.sync();
            game.settings.set(MODULE_NAME, 'lastSyncedVersion', SYNC_VERSION);
        }
    });
});
