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

const Gio   = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Lang  = imports.lang;
const Main  = imports.ui.main;
const Shell = imports.gi.Shell;

const appSystem = Shell.AppSystem.get_default();
const foundApps = appSystem.initial_search(["chromium"]);

var appInfo          = null;
var bookmarks        = [];
var bookmarksFile    = null;
var bookmarksMonitor = null;
var callbackId       = null;

function _readBookmarks() {
    bookmarks = [];

    let content;
    let jsonResult;
    let size;
    let success;

    try {
        [success, content, size] = bookmarksFile.load_contents(null);
    } catch(e) {
        logError(e.message);
        return;
    }

    if (! success) {
        return;
    }

    try {
        jsonResult = JSON.parse(content);
    } catch(e) {
        logError(e.message);
        return;
    }

    if (! jsonResult.hasOwnProperty("roots")) {
        return;
    }

    for (let bookmarkLocation in jsonResult.roots) {
        let children = jsonResult.roots[bookmarkLocation].children;

        for (let idx in children) {
            if (children[idx].type == "url") {
                bookmarks.push({
                    appInfo: appInfo,
                    name   : children[idx].name,
                    url    : children[idx].url
                });
            }
        }
    }
}

function _reset() {
    appInfo          = null;
    bookmarks        = [];
    bookmarksFile    = null;
    bookmarksMonitor = null;
    callbackId       = null;
}

function init() {
    if (foundApps.length == 0) {
        return;
    }

    appInfo = foundApps[0].get_app_info();

    bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
        [GLib.get_user_config_dir(), "chromium", "Default", "Bookmarks"]));

    if (! bookmarksFile.query_exists(null)) {
        _reset();
        return;
    }

    bookmarksMonitor = bookmarksFile.monitor_file(Gio.FileMonitorFlags.NONE,
                                                  null);
    callbackId = bookmarksMonitor.connect("changed",
                                          Lang.bind(this, _readBookmarks));

    _readBookmarks();
}

function deinit() {
    if (bookmarksMonitor) {
        if (callbackId) {
            bookmarksMonitor.disconnect(callbackId);
        }

        bookmarksMonitor.cancel();
    }

    _reset();
}
