'use strict';

var CLIENT_ID = '{{env.typetalk.clientId}}',
    CLIENT_SECRET = '{{env.typetalk.clientSecret}}',
    typetalk = new Typetalk(CLIENT_ID, CLIENT_SECRET),
    pollInterval = 1000 * 60 * 5; // TODO configureable

function checkNotifications() {
    if (typetalk.hasTokens()) {
        typetalk.getNotifications(function(err, data) {
            if (err) {
                if (err === 401) {
                    typetalk.refreshAccessToken(function(err, data) {
                        if (err) {
                            typetalk.authorize();
                        } else {
                            checkNotifications();
                        }
                    });
                }
            } else {
                setBadgeNumber(countNotifications(data));
            }
            updateIcon();
        });
    }
}

function countNotifications(notifications) {
    var accessUnopened = notifications.access.unopened,
        inviteTeamPending = notifications.invite.team.pending,
        inviteTopicPending = notifications.invite.topic.pending,
        mentionUnread = notifications.mention.unread,
        count = accessUnopened + inviteTeamPending + inviteTopicPending + mentionUnread;
    return count;
}

function setBadgeNumber(number) {
    if (number > 0) {
        chrome.browserAction.setBadgeText({'text': '' + number});
    } else {
        chrome.browserAction.setBadgeText({'text': ''});
    }
}

function updateIcon() {
    if (typetalk.hasTokens()) {
        chrome.browserAction.setIcon({'path': 'images/icon-19.png'});
    } else {
        chrome.browserAction.setIcon({'path': 'images/icon-19-off.png'});
    }
};

function logout() {
    typetalk.clearTokens();
    updateIcon();
};

setInterval(checkNotifications, pollInterval);
setTimeout(checkNotifications, 300);

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.onClicked.addListener(function() {
    if (!typetalk.hasTokens()) {
        typetalk.authorize();
    } else {
        // TODO popup.html
        chrome.tabs.create({'url': 'https://typetalk.in/'}, function(tab) {
        });
    }
});
