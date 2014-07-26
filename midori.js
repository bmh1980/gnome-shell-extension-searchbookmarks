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

function getBookmarks() {
    let bookmarks = [];

    if (typeof Gda == 'undefined') {
        return bookmarks;
    }

    let appInfos = appSystem.initial_search(['midori']);

    if (appInfos.length == 0) {
        return bookmarks;
    }

    let appInfo = appInfos[0].get_app_info();
    let cfgDir = GLib.build_filenamev([GLib.get_user_config_dir(), 'midori']);
    let filePath = GLib.build_filenamev([cfgDir, 'bookmarks.db']);

    if (! GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        return bookmarks;
    }

    let con, result;

    try {
        con = Gda.Connection.open_from_string(
            'SQLite', 'DB_DIR=' + cfgDir + ';DB_NAME=bookmarks.db', null,
            Gda.ConnectionOptions.READ_ONLY);
    } catch(e) {
        logError(e);
        return bookmarks;
    }

    try {
        result = con.execute_select_command(
            'SELECT title, uri FROM bookmarks');
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
