# journal-links
A module for Foundry VTT that links entities (journal entries, actors and items) that reference each other.

"Have we interacted with this faction before?"

"Do these characters have a relationship?"

"Has this item been seen in a few different places?"

This module adds wiki-style "referenced by" links to journals, actors and items, allowing easy browsing. It doesn't change the actual text of the journal/bio/etc, but displays it as though it was part of the entry!

## Installing
Add the manifest to your Foundry modules: https://raw.githubusercontent.com/Sigafoos/journal-links/master/module.json

(automatic discovery/install in Foundry itself coming soon)

## Settings
* **Rebuild on save**: if disabled, won't automatically generate links between entities (default: enabled)
* **Heading tag**: By default it uses `<h1>` tags for the section. If you'd like to change it to `<h2>`, etc, you can (note: this doesn't support custom classes yet)

## Bugs?
This is very alpha, and doesn't work with at least one other journal plugin. I'll do my best to address any issues that are filed.
