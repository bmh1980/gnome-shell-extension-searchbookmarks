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
const Lang = imports.lang;

// Internal imports
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Search = imports.ui.search;
const St = imports.gi.St;

const _gettextDomain = Gettext.domain('searchbookmarks');
const _ = _gettextDomain.gettext;
const _thisExtension = ExtensionUtils.getCurrentExtension();

// Extension imports
const Chromium = _thisExtension.imports.chromium;
const Epiphany = _thisExtension.imports.epiphany;
const Firefox = _thisExtension.imports.firefox;
const GoogleChrome = _thisExtension.imports.googlechrome;
const Midori = _thisExtension.imports.midori;
const Opera = _thisExtension.imports.opera;

// Variable to hold the extension instance
var _searchBookmarksInstance = null;

/**
 * _bookmarksSort:
 * @a: Object created by a _readBookmarks function
 * @b: Object created by a _readBookmarks function
 *
 * Sort the list of bookmarks in the following order.
 *
 * 1. descending by the score
 * 2. ascending by the name
*/
function _bookmarksSort(a, b) {
    if (a.score < b.score) return 1;
    if (a.score > b.score) return -1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
}

/**
 * _rateMatch:
 * @bookmark: Object created by a _readBookmarks function
 * @term: String to search for
 *
 * Rate the quality of matches.
 *
 * 5: Both, title *and* URI begin with the given term
 * 4: The title begin with the given term and the URI contains it
 * 4: The URI begin with the given term and the title contains it
 * 3: The title begin with the given term, but the URI does not contains it
 * 3: Both, title *and* URI contains the given term
 * 2: The URI begin with the given term, but the title does not contains it
 * 2: The title contains the given term, but the URI not
 * 1: The URI contains the given term, but the title not
 * 0: Neither title nor URI contains the given term
*/
function _rateMatch(bookmark, term) {
    let nameIndex = bookmark.name.toLocaleLowerCase().indexOf(term);
    let uriIndex = bookmark.uri.toLocaleLowerCase().indexOf(term);

    let score = 0;

    if (nameIndex == 0) {
        score += 3;
    } else if (nameIndex > 0) {
        score += 2;
    }

    if (uriIndex == 0) {
        score += 2;
    } else if (uriIndex > 0) {
        score += 1;
    }

    return score;
}

const SearchBookmarks = new Lang.Class({
    Name: 'SearchBookmarks',

    _init: function() {
        this.title = _("BOOKMARKS");
        this.searchSystem = null;

        Chromium.init();
        Epiphany.init();
        Firefox.init();
        GoogleChrome.init();
        Midori.init();
        Opera.init();
    },

    _searchBookmarks: function(terms) {
        let bookmarks = [];

        bookmarks = bookmarks.concat(Chromium.bookmarks);
        bookmarks = bookmarks.concat(Epiphany.bookmarks);
        bookmarks = bookmarks.concat(Firefox.bookmarks);
        bookmarks = bookmarks.concat(GoogleChrome.bookmarks);
        bookmarks = bookmarks.concat(Midori.bookmarks);
        bookmarks = bookmarks.concat(Opera.bookmarks);

        let searchResults = [];

        for (let i = 0; i < bookmarks.length; i++) {
            for (let j = 0; j < terms.length; j++) {
                // Terms are treated as logical AND
                if (j == 0 || bookmarks[i].score > 0) {
                    let term = terms[j].toLocaleLowerCase();
                    let score = _rateMatch(bookmarks[i], term);

                    if (score > 0) {
                        bookmarks[i].score += score;
                    } else {
                        bookmarks[i].score = 0;
                    }
                }
            }

            if (bookmarks[i].score > 0) {
                searchResults.push(bookmarks[i]);
            }
        }

        searchResults.sort(_bookmarksSort);
        return searchResults;
    },

    activateResult: function(id) {
        id.appInfo.launch_uris([id.uri], null);
    },

    createResultActor: function(resultMeta, terms) {
        return null;
    },

    destroy: function() {
        Chromium.deinit();
        Epiphany.deinit();
        Firefox.deinit();
        GoogleChrome.deinit();
        Midori.deinit();
        Opera.deinit();
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
            id: id,
            appInfo: id.appInfo,
            createIcon: createIcon,
            name: id.name,
            uri: id.uri
        };
    },

    getResultMetas: function(ids, callback) {
        let results = ids.map(this.getResultMeta);

        if (callback) {
            callback(results);
        }

        return results;
    }
});

function init() {
    let localeDir = _thisExtension.dir.get_child('locale');

    if (localeDir.query_exists(null)) {
        Gettext.bindtextdomain('searchbookmarks', localeDir.get_path());
    } else {
        Gettext.bindtextdomain('searchbookmarks', Config.LOCALEDIR);
    }
}

function enable() {
    if (! Firefox.Gda) {
        /**
         * TODO: How to wrap translatable lines in GJS? ' \n' is not
         * allowed by GJS. ',\n' and '\\n' is not handled by intltool/xgettext.
        */
        Main.notifyError(
            _("Search Firefox bookmarks disabled"),
            _("The library 'Gda-5.0.typelib' could not be imported. If you want to search in Firefox bookmarks, you must install the package that contains the file 'Gda-5.0.typelib'."));
    }

    if (! Midori.Gda) {
        /**
         * TODO: How to wrap translatable lines in GJS? ' \n' is not
         * allowed by GJS. ',\n' and '\\n' is not handled by intltool/xgettext.
        */
        Main.notifyError(
            _("Search Midori bookmarks disabled"),
            _("The library 'Gda-5.0.typelib' could not be imported. If you want to search in Midori bookmarks, you must install the package that contains the file 'Gda-5.0.typelib'."));
    }

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
