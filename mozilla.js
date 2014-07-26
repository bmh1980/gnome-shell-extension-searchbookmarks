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

// External imports
var Gda;
const GLib = imports.gi.GLib;

try {
    Gda = imports.gi.Gda;
} catch(e) {
}

// Internal imports
const ExtensionUtils = imports.misc.extensionUtils;
const Shell = imports.gi.Shell;

const _thisExtension = ExtensionUtils.getCurrentExtension();

// Extension imports
const Bookmark = _thisExtension.imports.bookmark;

const appSystem = Shell.AppSystem.get_default();

function getMozillaBookmarks(appName) {
    let bookmarks = [];

    if (typeof Gda == 'undefined') {
        return bookmarks;
    }

    let appInfos = appSystem.initial_search([appName]);

    if (appInfos.length == 0) {
        return bookmarks;
    }

    let appInfo = appInfos[0].get_app_info();
    let cfgPath = GLib.build_filenamev(
        [GLib.get_home_dir(), '.mozilla', appName]);
    let iniPath = GLib.build_filenamev([cfgPath, 'profiles.ini']);

    let profilePath;

    if (GLib.file_test(iniPath, GLib.FileTest.EXISTS)) {
        let iniFile = GLib.KeyFile.new();
        let groups, nGroups;

        iniFile.load_from_file(iniPath, GLib.KeyFileFlags.NONE);

        [groups, nGroups] = iniFile.get_groups();

        for (let i = 0; i < nGroups; i++) {
            let isRelative, profileName, profileDir;

            try {
                isRelative = iniFile.get_boolean(groups[i], 'IsRelative');
                profileName = iniFile.get_string(groups[i], 'Name');
                profileDir = iniFile.get_string(groups[i], 'Path');
            } catch(e) {
                continue;
            }

            if (profileName == 'default') {
                if (isRelative) {
                    profilePath = GLib.build_filenamev(
                        [cfgPath, profileDir]);
                } else {
                    profilePath = profileDir;
                }
            }
        }
    }

    if (typeof profilePath == 'undefined') {
        return bookmarks;
    }

    let filePath = GLib.build_filenamev([profilePath, 'places.sqlite']);

    if (! GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        return bookmarks;
    }

    let con, result;

    try {
        con = Gda.Connection.open_from_string(
            'SQLite', 'DB_DIR=' + profilePath + ';DB_NAME=places.sqlite',
            null, Gda.ConnectionOptions.READ_ONLY);
    } catch(e) {
        logError(e);
        return bookmarks;
    }

    try {
        result = con.execute_select_command(
            'SELECT moz_bookmarks.title, moz_places.url FROM ' +
            'moz_bookmarks INNER JOIN moz_places ON (moz_bookmarks.fk ' +
            '= moz_places.id) WHERE moz_bookmarks.fk NOT NULL AND ' +
            'moz_bookmarks.title NOT NULL AND moz_bookmarks.type = 1');
    } catch(e) {
        logError(e);
        con.close();
        return bookmarks;
    }

    let nRows = result.get_n_rows();

    for (let row = 0; row < nRows; row++) {
        let title, uri;

        try {
            title = result.get_value_at(0, row);
            uri = result.get_value_at(1, row);
        } catch(e) {
            logError(e);
            continue;
        }

        bookmarks.push(new Bookmark.Bookmark(appInfo, title, uri));
    }

    con.close();
    return bookmarks;
}

function getBookmarks() {
    let bookmarks = []

    let firefoxBookmarks = getMozillaBookmarks('firefox');

    for (let i = 0; i < firefoxBookmarks.length; i++) {
        bookmarks.push(firefoxBookmarks[i]);
    }

    let seamonkeyBookmarks = getMozillaBookmarks('seamonkey');

    for (let i = 0; i < seamonkeyBookmarks.length; i++) {
        bookmarks.push(seamonkeyBookmarks[i]);
    }

    return bookmarks;
}
