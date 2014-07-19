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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const Main = imports.ui.main;

const _appSystem = Shell.AppSystem.get_default();

var _bookmarksMonitor = null;
var _callbackId = null;
var bookmarks = [];

function _readBookmarks(monitor, file, otherFile, eventType, appInfo) {
    bookmarks = [];

    let success;
    let content;
    let size;

    try {
        [success, content, size] = file.load_contents(null);
    } catch(e) {
        log("ERROR: " + e.message);
        return;
    }

    if (success) {
        content = String(content);
        content = content.replace(/^<\?xml version=["'][0-9\.]+["']\?>/, '');

        default xml namespace = 'http://purl.org/rss/1.0/';
        let xmlData = new XML(content);

        for (let i in xmlData.item) {
            bookmarks.push({
                appInfo: appInfo,
                name: String(xmlData.item[i].title),
                score: 0,
                uri: String(xmlData.item[i].link)
            });
        }
    }
}

function _reset() {
    _bookmarksMonitor = null;
    _callbackId = null;
    bookmarks = [];
}

function init() {
    let foundApps = _appSystem.initial_search(['epiphany']);

    if (foundApps.length > 0) {
        let appInfo = foundApps[0].get_app_info();

        let bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
            [GLib.get_user_config_dir(), 'epiphany', 'bookmarks.rdf']));

        if (bookmarksFile.query_exists(null)) {
            _bookmarksMonitor = bookmarksFile.monitor_file(
                Gio.FileMonitorFlags.NONE, null);
            _callbackId = _bookmarksMonitor.connect(
                'changed', Lang.bind(this, _readBookmarks, appInfo));

            _readBookmarks(null, bookmarksFile, null, null, appInfo);
        } else {
            _reset();
            return;
        }
    }
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
