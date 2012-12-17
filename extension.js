/**
 * Copyright (C) 2012 Marcus Habermehl <bmh1980de@gmail.com>
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

// Gjs imports
const Gettext = imports.gettext;

// Internal imports
const Config         = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Main           = imports.ui.main;
const Search         = imports.ui.search;
const St             = imports.gi.St;

const _gettextDomain = Gettext.domain('searchbookmarks');
const _              = _gettextDomain.gettext;
const _thisExtension = ExtensionUtils.getCurrentExtension();

// Extension imports
const Chromium     = _thisExtension.imports.chromium;
const Epiphany     = _thisExtension.imports.epiphany;
const Firefox      = _thisExtension.imports.firefox;
const GoogleChrome = _thisExtension.imports.googlechrome;
const Midori       = _thisExtension.imports.midori;

// Variable to hold the extension instance
var _searchBookmarksInstance = null;

function SearchBookmarks() {
    this._init();
}

SearchBookmarks.prototype = {
    __proto__: Search.SearchProvider.prototype,

    _init: function() {
        Search.SearchProvider.prototype._init.call(this, _("BOOKMARKS"));
        Chromium.init();
        Epiphany.init();
        Firefox.init();
        GoogleChrome.init();
        Midori.init();
    },

    _searchBookmarks: function(terms) {
        let bookmarks     = [];
        let searchResults = [];

        bookmarks = bookmarks.concat(Chromium.bookmarks);
        bookmarks = bookmarks.concat(Epiphany.bookmarks);
        bookmarks = bookmarks.concat(Firefox.bookmarks);
        bookmarks = bookmarks.concat(GoogleChrome.bookmarks);
        bookmarks = bookmarks.concat(Midori.bookmarks);

        for (let i = 0; i < bookmarks.length; i++) {
            let bookmark = bookmarks[i];

            for (let j = 0; j < terms.length; j++) {
                let nameIndex = bookmark.name.toLowerCase().indexOf(terms[j]);
                let uriIndex  = bookmark.uri.toLowerCase().indexOf(terms[j]);

                if (nameIndex == 0 && uriIndex == 0) {
                    bookmark.score = 4;
                } else {
                    if (nameIndex == 0 && uriIndex > 0) {
                        bookmark.score = 3;
                    } else {
                        if (nameIndex > 0 && uriIndex == 0) {
                            bookmark.score = 2;
                        } else {
                            if (nameIndex > 0 && uriIndex > 0) {
                                bookmark.score = 1;
                            } else {
                                bookmark.score = 0;
                            }
                        }
                    }
                }

                if (nameIndex > -1) {
                    searchResults.push(bookmark);
                } else {
                    if (uriIndex > -1) {
                        searchResults.push(bookmark);
                    }
                }
            }
        }

        searchResults.sort(function(x, y) {
            return (x.scrore > y.score) || (x.name > y.name);
        });

        return searchResults;
    },

    activateResult: function(id) {
        id.appInfo.launch_uris([id.uri], null);
    },

    destroy: function() {
        Chromium.deinit();
        Epiphany.deinit();
        Firefox.deinit();
        GoogleChrome.deinit();
        Midori.deinit();
    },

    getInitialResultSet: function(terms) {
        this.searchSystem.pushResults(this, this._searchBookmarks(terms));
    },

    getSubsearchResultSet: function(previousResults, terms) {
        return this.getInitialResultSet(terms);
    },

    getResultMeta: function(id) {
        let createIcon = function(size) {
            return new St.Icon({gicon: id.appInfo.get_icon(), icon_size: size});
        };

        return {
            id        : id,
            appInfo   : id.appInfo,
            createIcon: createIcon,
            name      : id.name,
            uri       : id.uri
        };
    },

    getResultMetas: function(ids, callback) {
        let results = ids.map(this.getResultMeta);

        if (callback) {
            callback(results);
        }

        return results;
    }
};

function init() {
    let localeDir = _thisExtension.dir.get_child('locale');

    if (localeDir.query_exists(null)) {
        Gettext.bindtextdomain('searchbookmarks', localeDir.get_path());
    } else {
        Gettext.bindtextdomain('searchbookmarks', Config.LOCALEDIR);
    }
}

function enable() {
    if (_searchBookmarksInstance == null) {
        _searchBookmarksInstance = new SearchBookmarks();
        Main.overview.addSearchProvider(_searchBookmarksInstance);
    }
}

function disable() {
    if (_searchBookmarksInstance != null) {
        Main.overview.removeSearchProvider(_searchBookmarksInstance);
        _searchBookmarksInstance.destroy();
        _searchBookmarksInstance = null;
    }
}
