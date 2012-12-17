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

// External imports
const Gda   = imports.gi.Gda;
const Gio   = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Shell = imports.gi.Shell;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const Main = imports.ui.main;

const _appSystem = Shell.AppSystem.get_default();
const _foundApps = _appSystem.initial_search(['midori']);
const _midoriDir = GLib.build_filenamev([GLib.get_user_config_dir(), 'midori']);

var _appInfo          = null;
var _bookmarksFile    = null;
var _bookmarksMonitor = null;
var _callbackId       = null;
var bookmarks         = [];

function _readBookmarks() {
    bookmarks = [];

    let connection;
    let result;

    try {
        connection = Gda.Connection.open_from_string(
            'SQLite', 'DB_DIR=' + _midoriDir + ';DB_NAME=bookmarks', null,
            Gda.ConnectionOptions.READ_ONLY);
    } catch(e) {
        log("ERROR: " + e.message);
        return;
    }

    try {
        result = connection.execute_select_command(
            'SELECT title, uri FROM bookmarks');
    } catch(e) {
        log("ERROR: " + e.message);
        connection.close();
        return;
    }

    let nRows = result.get_n_rows();

    if (nRows > 0) {
        for (let row = 0; row < nRows; row++) {
            let name;
            let uri;

            try {
                name = result.get_value_at(0, row);
            } catch(e) {
                log("ERROR: " + e.message);
                continue;
            }

            try {
                uri = result.get_value_at(1, row);
            } catch(e) {
                log("ERROR: " + e.message);
                continue;
            }

            bookmarks.push({
                appInfo: _appInfo,
                name   : name,
                score  : 0,
                uri    : uri
            });
        }
    }

    connection.close()
}

function _reset() {
    _appInfo          = null;
    _bookmarksFile    = null;
    _bookmarksMonitor = null;
    _callbackId       = null;
    bookmarks         = [];
}

function init() {
    if (_foundApps.length == 0) {
        return;
    }

    _appInfo = _foundApps[0].get_app_info();

    _bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
        [_midoriDir, 'bookmarks.db']));

    if (! _bookmarksFile.query_exists(null)) {
        _reset();
        return;
    }

    _bookmarksMonitor = _bookmarksFile.monitor_file(
        Gio.FileMonitorFlags.NONE, null);
    _callbackId = _bookmarksMonitor.connect(
        'changed', Lang.bind(this, _readBookmarks));

    _readBookmarks();
}

function deinit() {
    if (_bookmarksMonitor) {
        if (_callbackId) {
            _bookmarksMonitor.disconnect(_callbackId);
        }

        _bookmarksMonitor.cancel();
    }

    _reset();
}
