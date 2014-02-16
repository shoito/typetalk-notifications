'use strict';

var CLIENT_ID = '{{env.typetalk.clientId}}',
    CLIENT_SECRET = '{{env.typetalk.clientSecret}}',
    typetalk = new Typetalk(CLIENT_ID, CLIENT_SECRET),
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
                            setBadgeNumber('');
                        } else {
                            checkNotifications();
                        }
                    });
                }
            } else {
                setBadgeNumber(countNotifications(data));
            }
        });
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

function setBadgeNumber(number) {
    if (number > 0) {
        chrome.browserAction.setBadgeText({'text': '' + number});
        chrome.browserAction.setIcon({'path': 'images/icon-19.png'});
    } else {
        chrome.browserAction.setBadgeText({'text': ''});
        chrome.browserAction.setIcon({'path': 'images/icon-19-off.png'});
    }
}

function logout() {
    typetalk.clearTokens();
    setBadgeNumber('');
};

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
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
