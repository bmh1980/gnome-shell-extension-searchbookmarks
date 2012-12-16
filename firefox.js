/*
  Copyright (C) 2012 Marcus Habermehl <bmh1980de@gmail.com>
 
  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU General Public License
  as published by the Free Software Foundation; either version 2
  of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301,
  USA.
*/

const Gda   = imports.gi.Gda;
const Gio   = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Lang  = imports.lang;
const Main  = imports.ui.main;
const Shell = imports.gi.Shell;

const appSystem = Shell.AppSystem.get_default();
const foundApps = appSystem.initial_search(["firefox"]);
const firefoxDir = GLib.build_filenamev(
    [GLib.get_home_dir(), ".mozilla", "firefox"]);

var appInfo          = null;
var bookmarks        = [];
var bookmarksFile    = null;
var bookmarksMonitor = null;
var callbackId1      = null;
var callbackId2      = null;
var profileDir       = null;
var profilesFile     = null;
var profilesMonitor  = null;

function _readBookmarks() {
    bookmarks = [];

    let connection;
    let result;

    try {
        connection = Gda.Connection.open_from_string(
            "SQLite", "DB_DIR=" + profileDir + ";DB_NAME=places.sqlite", null,
            Gda.ConnectionOptions.READ_ONLY);
    } catch(e) {
        logError(e.message);
        return;
    }

    try {
        result = connection.execute_select_command(
            "SELECT moz_bookmarks.title, moz_places.url FROM moz_bookmarks " +
            "INNER JOIN moz_places ON (moz_bookmarks.fk = moz_places.id) " +
            "WHERE moz_bookmarks.fk NOT NULL AND moz_bookmarks.title NOT " +
            "NULL AND moz_bookmarks.type = 1");
    } catch(e) {
        logError(e.message);
        connection.close();
        return;
    }

    let nRows = result.get_n_rows();

    if (nRows > 0) {
        for (let row = 0; row < nRows; row++) {
            let name;
            let url;

            try {
                name = result.get_value_at(0, row);
            } catch(e) {
                logError(e.message);
                continue;
            }

            try {
                url = result.get_value_at(1, row);
            } catch(e) {
                logError(e.message);
                continue;
            }

            bookmarks.push({
                appInfo: appInfo,
                name   : name,
                url    : url
            });
        }
    }

    connection.close()
}

function _readProfiles() {
    let groups;
    let nGroups;

    let keyFile = new GLib.KeyFile();

    keyFile.load_from_file(profilesFile.get_path(), GLib.KeyFileFlags.NONE);

    [groups, nGroups] = keyFile.get_groups();

    for (let i = 0; i < nGroups; i++) {
        let path;
        let name;
        let relative;

        try {
            name     = keyFile.get_string(groups[i], "Name");
            path     = keyFile.get_string(groups[i], "Path");
            relative = keyFile.get_boolean(groups[i], "IsRelative");
        } catch(e) {
            continue;
        }

        if (name == "default") {
            if (relative) {
                profileDir = GLib.build_filenamev(
                    [firefoxDir, path]);
            } else {
                profileDir = path;
            }

            if (bookmarksMonitor) {
                bookmarksMonitor.cancel();
                bookmarksMonitor = null;
            }

            bookmarksFile = Gio.File.new_for_path(
                GLib.build_filenamev([profileDir, "places.sqlite"]));

            if (bookmarksFile.query_exists(null)) {
                bookmarksMonitor = bookmarksFile.monitor_file(
                    Gio.FileMonitorFlags.NONE, null);
                callbackId2 = bookmarksMonitor.connect(
                    "changed", Lang.bind(this, _readBookmarks));
                _readBookmarks();
                return;
            }
        }
    }

    /* If we reached this line, no default profile was found. */
    deinit();
}

function _reset() {
    appInfo          = null;
    bookmarks        = [];
    bookmarksFile    = null;
    bookmarksMonitor = null;
    callbackId1      = null;
    callbackId2      = null;
    profileDir       = null;
    profilesFile     = null;
    profilesMonitor  = null;
}

function init() {
    if (foundApps.length == 0) {
        return;
    }

    appInfo = foundApps[0].get_app_info();

    profilesFile = Gio.File.new_for_path(GLib.build_filenamev(
        [firefoxDir, "profiles.ini"]));

    if (! profilesFile.query_exists(null)) {
        _reset();
        return;
    }

    profilesMonitor = profilesFile.monitor_file(Gio.FileMonitorFlags.NONE,
                                                null);
    callbackId1 = profilesMonitor.connect("changed",
                                          Lang.bind(this, _readProfiles));

    _readProfiles();
}

function deinit() {
    if (bookmarksMonitor) {
        if (callbackId2) {
            bookmarksMonitor.disconnect(callbackId2);
        }

        bookmarksMonitor.cancel();
    }

    if (profilesMonitor) {
        if (callbackId1) {
            profilesMonitor.disconnect(callbackId1);
        }

        profilesMonitor.cancel();
    }

    _reset();
}
