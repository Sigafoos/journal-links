export class JournalLink {
    re = /@(\w+)\[(\w+)\]/g;

    entityMap = {
        'JournalEntry': 'journal',
        'Actor': 'actors',
        'Item': 'items',
        'RollTable': 'tables'
    };

    elementSelectors = [
        '.editor-content',
        '.editor-content[data-edit="data.details.biography.value"]'
    ];

    updateJournalEntry({ data }) {
        this.update(data, 'JournalEntry', data.content);
    }

    updateActor({ data }) {
        this.update(data, 'Actor', data.data.details.biography.value);
    }

    updateItem({ data }) {
        this.update(data, 'Item', data.data.description.value);
    }

    async update(data, entityType, content) {
        if (!game.settings.get('journal-links', 'rebuildOnSave')) {
            this.log('not updating ' + entityType + ' ' + data.name + ' as rebuildOnSave is false');
            return;
        }
        this.log('updating ' + entityType + ' ' + data.name + ' (' + data._id + ')');

        let references = this.references(content);
        let existing = (data.flags['journal-links'] && data.flags['journal-links']['references']) || {};

        let updated = {};

        for (let reference of references) {
            if (!updated[reference.type])
                updated[reference.type] = [];
            // if we've linked something multiple times in this entity
            if (updated[reference.type].includes(reference.id)) {
                this.debug(reference.type + ' ' + reference.id + ' is already updated, skipping');
                continue;
            }
            updated[reference.type].push(reference.id);

            let existingOfType = existing[reference.type] || [];
            if (existingOfType.includes(reference.id)) {
                this.debug(reference.type + ' ' + reference.id + ' is already referenced, skipping (existingOfType is ' + existingOfType.toString() + ')');
                continue;
            }

            let mappedEntity = this.entityMap[reference.type];
            let referenced = mappedEntity && game[mappedEntity] && game[mappedEntity].get(reference.id);
            if (!referenced) {
                this.debug('no referenced entity ' + reference.type + ' ' + reference.id + '; skipping');
                continue;
            }

            this.debug('adding to referencedBy in ' + reference.type + ' ' + referenced.name);
            let links = await referenced.getFlag('journal-links', 'referencedBy') || {};
            let linksOfType = links[entityType] || [];
            if (linksOfType.includes(data._id)) {
                this.debug(entityType + ' ' + data._id + ' already exists, skipping');
                continue;
            }
            linksOfType.push(data._id);

            links[entityType] = linksOfType;
            let copy = duplicate(links);
            await game[mappedEntity].get(reference.id).setFlag('journal-links', 'referencedBy', copy)
        }

        for (const [type, values] of Object.entries(existing)) {
            let current = updated[type];
            for (let outdated of values.filter(v => !current.includes(v))) {
                let entity = game[this.entityMap[type]].get(outdated);
                if (!entity) {
                    this.debug('outdated entity ' + type + ' ' + outdated + ' does not exist');
                } else {
                    this.debug('removing outdated entity ' + type + ' ' + entity.name);

                    let links = await entity.getFlag('journal-links', 'referencedBy');
                    let linksOfType = links[type];
                    linksOfType.splice(linksOfType.indexOf(data._id), 1);
                }

                if (linksOfType.length)
                    links[type] = linksOfType;
                else
                    delete links[type];
                let copy = duplicate(links);
                await game[this.entityMap[type]].get(outdated).setFlag('journal-links', 'referencedBy', copy);
            }
        };

        let copy = duplicate(updated);
        await game[this.entityMap[entityType]].get(data._id).setFlag('journal-links', 'references', copy);
    }

    includeJournalLinks(sheet, html, data) {
        this.includeLinks(html, data.entity);
    }

    includeActorLinks(sheet, html, data) {
        this.includeLinks(html, data.actor);
    }

    includeItemLinks(sheet, html, data) {
        this.includeLinks(html, data.entity);
    }

    includeLinks(html, entityData) {
        let links = entityData.flags && entityData.flags['journal-links'] && entityData.flags['journal-links']['referencedBy'] || {};
        if (Object.keys(links).length === 0)
            return;

        this.log('appending links to ' + entityData.name);
        let element = this.getElementToModify(html);
        if (element.length === 0)
            return;

        let linksDiv = $('<div class="journal-links"></div>');
        let heading = document.createElement(game.settings.get('journal-links', 'headingTag'));
        heading.append('Linked from');
        linksDiv.append(heading);
        let linksList = $('<ul></ul>');
        for (const [type, values] of Object.entries(links)) {
            if (values.length === 0)
                continue;

            for (let value of values) {
                let mappedType = this.entityMap[type];
                let entity = game[mappedType].get(value);
                this.debug('adding link from ' + type + ' ' + entity.name);
                let link = $('<a class="entity-link" draggable="true"></a>');
                link.attr('data-entity', type);
                link.attr('data-id', entity._id);

                let icon = 'fas ';
                switch (type) {
                    case 'JournalEntry':
                        icon += 'fa-book-open';
                        break;
                    case 'Actor':
                        icon += 'fa-user';
                        break;
                    case 'Item':
                        icon += 'fa-suitcase';
                        break;
                    case 'RollTable':
                        icon == 'fa-th-list';
                        break;
                }
                link.append($('<i class="' + icon + '"></i>'));
                link.append(' ' + entity.name);

                let li = $('<li></li>');
                li.append(link);
                linksList.append(li);
            }
        }
        linksDiv.append(linksList);
        element.append(linksDiv);
    }

    // clears and recreates references
    async sync() {
        this.log('syncing links...');
        let keys = Object.values(this.entityMap);
        let rebuildOnSave = game.settings.get('journal-links', 'rebuildOnSave');

        await game.settings.set('journal-links', 'rebuildOnSave', false);
        for (let key of keys) {
            this.log('wiping referencedBy for ' + key);
            for (let entity of Array.from(game[key])) {
                this.debug('wiping referencedBy for ' + entity.name);
                await game[key].get(entity._id).unsetFlag('journal-links', 'referencedBy');
            }
        }

        // this will rebuild the references, so we need to have referencedBy wiped first
        await game.settings.set('journal-links', 'rebuildOnSave', true);
        for (let key of keys) {
            this.log('wiping references for ' + key);
            for (let entity of Array.from(game[key])) {
                this.debug('wiping referenceds for ' + entity.name);
                await game[key].get(entity._id).unsetFlag('journal-links', 'references');
            }
        }

        await game.settings.set('journal-links', 'rebuildOnSave', rebuildOnSave);
        this.log('links synced');
    }

    references(text) {
        return Array.from(text.matchAll(this.re)).map(
            m => {
                return {
                    type: m[1],
                    id: m[2]
                }
            }
        );
    }

    getElementToModify(html) {
        for (let selector of this.elementSelectors) {
            let element = html.find(selector);

            if (element.length === 1)
                return element;
        }

        this.log('ERROR | unable to find element to modify');
        return undefined;
    }

    log(text) {
        console.log('journal-links | ' + text);
    }

    debug(text) {
        if (CONFIG.debug.JournalLinks)
            this.log('DEBUG | ' + text);
    }
}
