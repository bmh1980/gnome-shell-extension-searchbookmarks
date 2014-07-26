/**
 * Copyright (C) 2012-2014 Marcus Habermehl <bmh1980@posteo.org>
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
const St = imports.gi.St;

const _gettextDomain = Gettext.domain('searchbookmarks');
const _ = _gettextDomain.gettext;
const _thisExtension = ExtensionUtils.getCurrentExtension();

// Extension imports
const Chrome = _thisExtension.imports.chrome;
const Epiphany = _thisExtension.imports.epiphany;
const Mozilla = _thisExtension.imports.mozilla;
const Midori = _thisExtension.imports.midori;
const Opera = _thisExtension.imports.opera;

// Variable to hold the extension instance
var _searchBookmarksInstance = null;

/**
 * _resultSort:
 * @a: Object created by a _readBookmarks function
 * @b: Object created by a _readBookmarks function
 *
 * Sort the list of bookmarks in the following order.
 *
 * 1. descending by the score
 * 2. ascending by the name
*/
function _resultSort(a, b) {
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
        this.id = 'searchbookmarks@bmh1980de.gmail.com';
        this.searchSystem = null;
        this.modules = [Chrome, Epiphany, Mozilla, Midori, Opera];
    },

    activateResult: function(id) {
        id.appInfo.launch_uris([id.uri], null);
    },

    createResultObject: function(resultMeta, terms) {
        return null;
    },

    filterResults: function(results, maxNumber) {
        return results.slice(0, maxNumber);
    },

    getInitialResultSet: function(terms) {
        let searchResults = [];

        for (let i = 0; i < this.modules.length; i++) {
            let bookmarks = this.modules[i].getBookmarks();

            for (let j = 0; j < bookmarks.length; j++) {
                for (let k = 0; k < terms.length, k++) {
                    // Terms are treated as logical AND
                    if (k == 0 || bookmarks[j].score > 0) {
                        let term = terms[k].toLocaleLowerCase();
                        let score = _rateMatch(bookmarks[j], term);

                        if (score > 0) {
                            bookmarks[j].score += score;
                        } else {
                            bookmarks[j].score = 0;
                        }
                    }
                }

                if (bookmarks[j].score > 0) {
                    searchResults.push(bookmarks[j]);
                }
            }
        }

        searchResults.sort(_resultSort);
        this.searchSystem.setResults(this, searchResults);
    },

    getSubsearchResultSet: function(previousResults, terms) {
        let searchResults = [];

        for (let i = 0; i < previousResults.length; i++) {
            for (let j = 0; j < terms.length, j++) {
                // Terms are treated as logical AND
                if (j == 0 || previousResults[i].score > 0) {
                    let term = terms[j].toLocaleLowerCase();
                    let score = _rateMatch(previousResults[i], term);

                    if (score > 0) {
                        previousResults[i].score += score;
                    } else {
                        previousResults[i].score = 0;
                    }
                }
            }

            if (previousResults[i].score > 0) {
                searchResults.push(previousResults[i]);
            }
        }

        searchResults.sort(_resultSort);
        this.searchSystem.setResults(this, searchResults);
    },

    getResultMetas: function(ids, callback) {
        let results = [];

        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            results.push({id: id, name: id.title})
        }

        callback(results);
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
    try {
        const Gda = imports.gi.Gda;
    } catch(e) {
        /**
         * TODO: How to wrap translatable lines in GJS? ' \n' is not
         * allowed by GJS. ',\n' and '\\n' is not handled by intltool/xgettext.
        */
        Main.notifyError(
            _("Search Midori and Mozilla bookmarks disbaled"),
            _("The GObject Introspection library 'Gda' could not be imported. If you want to search in Midori or Mozilla bookmarks, you must install the package that contains the file 'Gda-5.0.typelib'."));
    }

    if (_searchBookmarksInstance == null) {
        _searchBookmarksInstance = new SearchBookmarks();
        Main.overview.addSearchProvider(_searchBookmarksInstance);
    }
}

function disable() {
    if (_searchBookmarksInstance != null) {
        Main.overview.removeSearchProvider(_searchBookmarksInstance);
        _searchBookmarksInstance = null;
    }
}
