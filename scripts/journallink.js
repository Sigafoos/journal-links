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

    async updateJournalEntry(entity, change) {
        let content = change.content;
        if (content !== undefined) {
            await this.update(entity, 'JournalEntry', content || '', false);
        } else if (change.flags?.['journal-links']?.['-=sync'] === null) {
            await this.update(entity, 'JournalEntry', entity.data.content || '', true);
        }
    }

    async updateActor(entity, change) {
        let content = change.data?.details?.biography?.value;
        if (content !== undefined) {
            await this.update(entity, 'Actor', content || '', false);
        } else if (change.flags?.['journal-links']?.['-=sync'] === null) {
            await this.update(entity, 'Actor', entity.data.data.details.biography.value || '', true);
        }
    }

    async updateItem(entity, change) {
        let content = change.data?.description?.value;
        if (content !== undefined) {
            await this.update(entity, 'Item', content || '', false);
        } else if (change.flags?.['journal-links']?.['-=sync'] === null) {
            await this.update(entity, 'Item', entity.data.data.description.value || '', true);
        }
    }

    async update(entity, entityType, content, force) {
        if (!force && !game.settings.get('journal-links', 'rebuildOnSave')) {
            this.log('not updating ' + entityType + ' ' + entity.name + ' as rebuildOnSave is false');
            return;
        }
        this.log('updating ' + entityType + ' ' + entity.name + ' (' + entity.id + ')');

        let references = this.references(content);
        let existing = entity.data.flags['journal-links']?.references || {}

        let updated = {};

        for (let reference of references) {
            if (updated[reference.type] === undefined) {
              updated[reference.type] = [];
            }

            // if we've linked something multiple times in this entity
            let updated_type = updated[reference.type];
            if (updated_type.includes(reference.id)) {
                this.debug(reference.type + ' ' + reference.id + ' is already updated, skipping');
                continue;
            }
            updated_type.push(reference.id);

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
            if (linksOfType.includes(entity.id)) {
                this.debug(entityType + ' ' + entity.id + ' already exists, skipping');
                continue;
            }
            linksOfType.push(entity.id);

            links[entityType] = linksOfType;
            await game[mappedEntity].get(reference.id).setFlag('journal-links', 'referencedBy', duplicate(links))
        }

        for (const [type, values] of Object.entries(existing)) {
            let current = updated[type] || [];
            for (let outdated of values.filter(v => !current.includes(v))) {
                let target = game[this.entityMap[type]].get(outdated);
                if (!target) {
                    this.debug('outdated entity ' + type + ' ' + outdated + ' does not exist');
                    continue;
                }

                let links = await target.getFlag('journal-links', 'referencedBy');
                let linksOfType = links[entityType] || [];
                let outdatedIdx = linksOfType.indexOf(entity.id);
                if (outdatedIdx > -1) {
                    this.debug('removing outdated entity ' + entityType + ' ' + entity.name
                               + ' from ' + type + ' ' + target.name);
                    linksOfType.splice(outdatedIdx, 1);

                    if (linksOfType.length) {
                        links[entityType] = linksOfType;
                    } else {
                        delete links[entityType];
                        links['-=' + entityType] = null;
                    }

                    let copy = duplicate(links);
                    await target.setFlag('journal-links', 'referencedBy', copy);
                }
            }
        };

        for (const type in this.entityMap) {
            if(updated[type] === undefined) {
              updated['-=' + type] = null;
            }
        }
        await entity.setFlag('journal-links', 'references', updated);
    }

    includeJournalLinks(sheet, html, data) {
        this.includeLinks(html, data.data);
    }

    includeActorLinks(sheet, html, data) {
        this.includeLinks(html, data.actor);
    }

    includeItemLinks(sheet, html, data) {
        this.includeLinks(html, data.item);
    }

    includeLinks(html, entityData) {
        let links = entityData.flags?.['journal-links']?.['referencedBy'] || {};
        if (Object.keys(links).length === 0)
            return;

        this.log('appending links to ' + entityData.name);
        let element = this.getElementToModify(html);
        if (element.length === 0 || element.children().length === 0)
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
                let link = $('<a class="entity-link content-link" draggable="true"></a>');
                link.attr('data-entity', type);
                link.attr('data-type', type);
                link.attr('data-id', value);

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

        for (let key of keys) {
            this.log('wiping referencedBy for ' + key);
            for (const [id, entity] of game[key].entries()) {
                this.debug('wiping referencedBy for ' + entity.name);
                await entity.unsetFlag('journal-links', 'referencedBy');
            }
        }

        // this will rebuild the references, so we need to have referencedBy wiped first
        for (let key of keys) {
            this.log('wiping references and refreshing for ' + key);
            for (const [id, entity] of game[key].entries()) {
                this.debug('wiping references and refreshing for ' + entity.name);
                await entity.unsetFlag('journal-links', 'references');
                await entity.unsetFlag('journal-links', 'sync');
            }
        }

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
