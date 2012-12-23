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
const GoogleChrome = _thisExtension.imports.googlechrome;
const Opera        = _thisExtension.imports.opera;

/**
 * Firefox and Midori are requiring Gda, what isn't default. Because of this
 * the firefox and midori modules are only imported if Gda can be imported.
 * Otherwise the empty module is imported to avoid errors.
*/
var _Gda;
var Firefox;
var Midori;

try {
    _Gda = imports.gi.Gda;
} catch(e) {
    log(_thisExtension.uuid + ': could not import Gda, searching Firefox ' +
        'and Midori bookmarks are disabled');
    _Gda = null;
}

if (_Gda) {
    Firefox = _thisExtension.imports.firefox;
    Midori  = _thisExtension.imports.midori;
} else {
    Firefox = _thisExtension.imports.empty;
    Midori  = _thisExtension.imports.empty;
}

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
    if (a.score < b.score) return  1;
    if (a.score > b.score) return -1;
    if (a.name  < b.name ) return -1;
    if (a.name  > b.name ) return  1;
    return 0;
}

/**
 * _rateMatch:
 * @bookmark: Object created by a _readBookmarks function
 * @term: String to search for
 *
 * Rate the quality of matches.
 *
 * 4: Both, name/title *and* URI begin with the given term
 * 3: The name/title begin with the given term and the URI contains it
 * 2: The URI begin with the given term and the name/title contains it
 * 1: Both, name/title *and* URI contains the given term
 * 0: Neither name/title nor URI contains the given term
*/
function _rateMatch(bookmark, term) {
    let nameIndex = bookmark.name.toLowerCase().indexOf(term);
    let uriIndex  = bookmark.uri.toLowerCase().indexOf(term);

    if (nameIndex == 0 && uriIndex == 0) return 4;
    if (nameIndex == 0 && uriIndex >  0) return 3;
    if (nameIndex >  0 && uriIndex == 0) return 2;
    if (nameIndex >  0 && uriIndex >  0) return 1;
    return 0;
}

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
        Opera.init();
    },

    _searchBookmarks: function(terms) {
        let searchResults = [];
        let bookmarks     = [];

        bookmarks = bookmarks.concat(Chromium.bookmarks);
        bookmarks = bookmarks.concat(Epiphany.bookmarks);
        bookmarks = bookmarks.concat(Firefox.bookmarks);
        bookmarks = bookmarks.concat(GoogleChrome.bookmarks);
        bookmarks = bookmarks.concat(Midori.bookmarks);
        bookmarks = bookmarks.concat(Opera.bookmarks);

        for (let i = 0; i < bookmarks.length; i++) {
            let bookmark = bookmarks[i];

            for (let j = 0; j < terms.length; j++) {
                // Terms are treated as logical AND
                if (j == 0 || bookmark.score > 0) {
                    let score = _rateMatch(bookmark, terms[j]);

                    if (score > 0) {
                        bookmark.score += score;
                    } else {
                        bookmark.score = 0;
                    }
                }
            }

            if (bookmark.score > 0) {
                searchResults.push(bookmark);
            }
        }

        searchResults.sort(_bookmarksSort);
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
