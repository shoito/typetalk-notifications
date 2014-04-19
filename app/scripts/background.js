'use strict';

var CLIENT_ID = '{{typetalk.clientId}}',
    CLIENT_SECRET = '{{typetalk.clientSecret}}',
    typetalk = new Typetalk(CLIENT_ID, CLIENT_SECRET),
    ICON_HAS_NOTIFICATION = 'images/icon-19.png',
    ICON_NO_NOTIFICATION = 'images/icon-19-off.png',
    ICON_NO_TOKEN = 'images/icon-19-notoken.png',
    pollInterval = 1000 * 60 * 1, // TODO configureable
    pollIntervalId = setInterval(checkNotifications, pollInterval);

setTimeout(checkNotifications, 300);

function checkNotifications() {
    if (typetalk.hasTokens()) {
        typetalk.getNotifications(function(data, xhr) {
            if (data === null) {
                if (xhr && xhr.status === 401) {
                    typetalk.refreshAccessToken(function(data, xhr) {
                        if (data === null) {
                            typetalk.clearTokens();
                            updateBrowserActionButton(ICON_NO_TOKEN, '');
                        } else {
                            checkNotifications();
                        }
                    });
                }
            } else {
                var count = countNotifications(data);
                updateBrowserActionButton(
                    count > 0 ? ICON_HAS_NOTIFICATION : ICON_NO_NOTIFICATION,
                    count > 0 ? '' + count : '');
            }
        });
    } else {
        updateBrowserActionButton(ICON_NO_TOKEN, '');
    }
}

function countNotifications(notifications) {
    var accessUnopened = notifications.access.unopened,
        inviteTeamPending = notifications.invite.team.pending,
        inviteTopicPending = notifications.invite.topic.pending,
        mentionUnread = 0,//notifications.mention.unread, // FIXME
        count = accessUnopened + inviteTeamPending + inviteTopicPending + mentionUnread;
    return count;
}

function updateBrowserActionButton(icon, badgeNumber) {
    chrome.browserAction.setBadgeText({'text': '' + badgeNumber});
    chrome.browserAction.setIcon({'path': icon});
    chrome.browserAction.setTitle({'title': getTooltip(icon)});
}

function getTooltip(icon) {
    var tooltip = '';
    if (icon === ICON_NO_TOKEN) {
        tooltip = chrome.i18n.getMessage('notoken');
    } else if (icon === ICON_NO_NOTIFICATION) {
        tooltip = chrome.i18n.getMessage('nonotification');
    } else {
        tooltip = chrome.i18n.getMessage('hasnotification');
    }
    return tooltip;
}

function logout() {
    typetalk.clearTokens();
    updateBrowserActionButton(ICON_NO_TOKEN, '');
};

chrome.runtime.onInstalled.addListener(function (details) {
});

chrome.browserAction.onClicked.addListener(function() {
    if (!typetalk.validateAccessTokenSync() && !typetalk.refreshAccessTokenSync()) {
        typetalk.authorize();
    } else {
        // TODO popup.html
        chrome.tabs.create({'url': 'https://typetalk.in/'}, function(tab) {
        });
    }
});
