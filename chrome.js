/**
 * Copyright (C) 2012-2014 Marcus Habermehl <bmh1980@posteo.org>
 *               2013 David Charte <http://github.com/fdavidcl>
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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// Internal imports
const Shell = imports.gi.Shell;

const appSystem = Shell.AppSystem.get_default();

/**
 * Copyright (C) 2012 Marcus Habermehl <bmh1980@posteo.org>
 *               2013 David Charte <http://github.com/fdavidcl>
 *               2012 Marcus Habermehl <bmh1980@posteo.org>
*/ 
function extractBookmarks(node) {
    let bookmarks = [];

    for (let i in node.children) {
        if (node.children[i].type == 'url') {
            bookmarks.push([node.children[i].name, node.children[i].url]);
        } else if (node.children[i].type == 'folder') {
            let _bookmarks = extractBookmarks(node.children[i]);

            for (let j = 0; j < _bookmarks.length; j++) {
                bookmarks.push(_bookmarks[j]);
            }
        }
    }

    return bookmarks;
}

function getChromeBookmarks(appName) {
    let bookmarks = [];

    let appInfos = appSystem.initial_search([appName]);

    if (appInfos.length == 0) {
        return bookmarks;
    }

    let appInfo = appInfos[0].get_app_info();
    let file = Gio.File.new_for_path(GLib.build_filenamev(
        [GLib.get_user_config_dir(), appName, 'Default', 'Bookmarks']));

    if (! file.query_exists(null)) {
        return bookmarks;
    }

    let success, content, size;

    try {
        [success, content, size] = file.load_contents(null);
    } catch(e) {
        logError(e);
        return bookmarks;
    }

    if (success) {
        let json;

        try {
            json = JSON.parse(content);
        } catch(e) {
            logError(e);
            return bookmarks;
        }

        if (json.hasOwnProperty('roots')) {
            for (let i in json.roots) {
                let _bookmarks = extractBookmarks(json.roots[i]);

                for (let j = 0; j < _bookmarks.length; j++) {
                    bookmarks.push({
                        appInfo: appInfo,
                        name: _bookmarks[j][0],
                        score: 0,
                        uri: _bookmarks[j][1]
                    });
                }
            }
        }
    }

    return bookmarks;
}

function getBookmarks() {
    let bookmarks = []

    bookmarks.concat(getChromeBookmarks('chromium'));
    bookmarks.concat(getChromeBookmarks('google-chrome'));

    return bookmarks;
}

function getBookmarks() {
    let bookmarks = []

    let chromiumBookmarks = getChromeBookmarks('chromium');

    for (let i = 0; i < chromiumBookmarks.length; i++) {
        bookmarks.push(chromiumBookmarks[i]);
    }

    let googleChromeBookmarks = getChromeBookmarks('google-chrome');

    for (let i = 0; i < googleChromeBookmarks.length; i++) {
        bookmarks.push(googleChromeBookmarks[i]);
    }

    return bookmarks;
}
