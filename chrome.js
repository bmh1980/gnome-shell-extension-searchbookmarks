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
 *
 * Source code modified by David Charte <http://github.com/fdavidcl>
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
const _appNames = new Array('chromium', 'google-chrome');

var _bookmarkMonitors = new Array(null, null);
var _callbackIds = new Array(null, null);
var bookmarks = new Array();

/**
 * Function _extractBookmarks added by David Charte,
 * code from this function is taken from function
 * _readBookmarks.
 *
 * This function enables the extension to read bookmarks
 * from any folder.
 *
 * 10/10/2013
 * 
*/ 
function _extractBookmarks(node, appInfo) {
    for (let idx in node.children) {
        if (node.children[idx].type == 'url') {
            bookmarks.push({
                appInfo: appInfo,
                name: node.children[idx].name,
                score: 0,
                uri: node.children[idx].url
            });
        } else if (node.children[idx].type == 'folder') {
            _extractBookmarks(node.children[idx], appInfo);
        }
    }
}

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
        let jsonResult;

        try {
            jsonResult = JSON.parse(content);
        } catch(e) {
            log("ERROR: " + e.message);
            return;
        }

        if (jsonResult.hasOwnProperty('roots')) {
            for (let idx in jsonResult.roots) {
                _extractBookmarks(jsonResult.roots[idx], appInfo);
            }
        }
    }
}

function _reset(idx) {
    if (idx) {
        _bookmarkMonitors[idx] = null;
        _callbackIds[idx] = null;
    } else {
        for (let idx in _appNames) {
            _bookmarkMonitors[idx] = null;
            _callbackIds[idx] = null;
        }

        bookmarks = new Array();
    }
}

function init() {
    for (let idx in _appNames) {
        let foundApps = _appSystem.initial_search([_appNames[idx]]);

        if (foundApps.length > 0) {
            let appInfo = foundApps[0].get_app_info();

            let bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
                [
                    GLib.get_user_config_dir(), _appNames[idx], 'Default',
                    'Bookmarks'
                ]));

            if (bookmarksFile.query_exists(null)) {
                _bookmarkMonitors[idx] = bookmarksFile.monitor_file(
                    Gio.FileMonitorFlags.NONE, null);
                _callbackIds[idx] = _bookmarkMonitors[idx].connect(
                    'changed', Lang.bind(this, _readBookmarks, appInfo));

                _readBookmarks(null, bookmarksFile, null, null, appInfo);
            } else {
                _reset(idx);
            }
        }
    }
}

function deinit() {
    for (let idx in _bookmarkMonitors) {
        if (_bookmarkMonitors[idx]) {
            if (_callbackIds[idx]) {
                _bookmarkMonitors[idx].disconnect(_callbackIds[idx]);
            }

            _bookmarkMonitors[idx].cancel();
        }
    }

    _reset(null);
}
