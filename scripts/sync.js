// this is handled as a setting menu but only uses that as a hack to do its work
export class Sync extends FormApplication {
    constructor(object = {}, options) {
        super(object, options);

        // no idea how this would happen, but CYA
        if (!game.JournalLink) {
            ui.notifications.warn('JournalLink object not found; cannot sync')
        } else {
            ui.notifications.info('Syncing journal links');
            game.JournalLink.sync().then((x) => { ui.notifications.info('Journal link sync completed'); });
        }

        // there shouldn't be anything to close, but just in case!
        this.close();
    }

    // not overriding this causes it to try to actually render, throwing an error
    render = () => {};
}
