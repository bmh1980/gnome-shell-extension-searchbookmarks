/**
 * Copyright (C) 2014 Marcus Habermehl <bmh1980@posteo.org>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301,
 * USA.
*/

// External imports
const Clutter = imports.gi.Clutter;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const IconGrid = imports.ui.iconGrid;
const St = imports.gi.St;

const Bookmark = new Lang.Class({
    Name: 'Bookmark',

    _init: function(appInfo, title, uri) {
        this._appInfo = appInfo;
        this._score = 0;
        this._title = title;
        this._uri = uri;
    },

    get appIcon() {
        return this.appInfo.get_icon();
    },

    get appInfo() {
        return this._appInfo;
    },

    get score() {
        return this._score;
    },

    get title() {
        return this._title;
    },

    get uri() {
        return this._uri;
    },

    activate: function() {
        this.appInfo.launch_uris([this.uri], null);
    },

    rate: function(terms) {
        this._score = 0;

        for (let i = 0; i < terms.length; i++) {
            if (i == 0 || this._score > 0) {
                let term = terms[i].toLocaleLowerCase();
                let titleIndex = this.title.toLocaleLowerCase().indexOf(term);
                let uriIndex = this.uri.toLocaleLowerCase().indexOf(term);

                if (titleIndex == 0) {
                    this._score += 3;
                } else if (titleIndex > 0) {
                    this._score += 2;
                }

                if (uriIndex == 0) {
                    this._score += 2;
                } else if (uriIndex > 0) {
                    this._score += 1;
                }
            }
        }
    }
});

const BookmarkIcon = new Lang.Class({
    Name: 'BookmarkIcon',

    _init: function(bookmark) {
        this._bookmark = bookmark;
        this.actor = new St.Bin({reactive: true, track_hover: true});
        this.icon = new IconGrid.BaseIcon(
            this._bookmark.title,
            {showLabel: true, createIcon: Lang.bind(this, this.createIcon)});
        this.actor.child = this.icon.actor;
        this.actor.label_actor = this.icon.label;
    },

    createIcon: function(size) {
        let box = new Clutter.Box();
        let icon = new St.Icon({gicon: this._bookmark.appIcon,
                                icon_size: size });

        box.add_child(icon);

        let favicon = this._bookmark.favicon;

        if (favicon) {
            let emblem = new St.Icon({gicon: favicon, icon_size: 22});
            box.add_child(emblem);
        }

        return box;
    }
});
