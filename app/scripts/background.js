'use strict';
// TODO xxx_expires ふよう
var tokens = loadTokens(),
    typetalk = new Typetalk({
                    'client_id': '{{typetalk.clientId}}', 
                    'client_secret': '{{typetalk.clientSecret}}',
                    'redirect_uri': 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb',
                    'access_token': tokens.access_token,
                    'refresh_token': tokens.refresh_token,
                    'access_token_expires': tokens.access_token_expires,
                    'refresh_token_expires': tokens.refresh_token_expires
                }),
    ICON_HAS_NOTIFICATION = 'images/icon-19.png',
    ICON_NO_NOTIFICATION = 'images/icon-19-off.png',
    ICON_NO_TOKEN = 'images/icon-19-notoken.png',
    pollInterval = 1000 * 6 * 1, // TODO configureable
    pollIntervalId = setInterval(checkUnreads, pollInterval),
    notifications = 0,
    unreads = 0;

setTimeout(checkUnreads, 300);

function checkUnreads() {
    checkNotifications();
    checkTopics();
}

function checkNotifications() {
    if (!typetalk.hasActiveToken()) {
        updateBrowserActionButton(ICON_NO_TOKEN);
        return;
    }

    typetalk.getNotificationsStatus().then(function(status) {
        notifications = countNotifications(status);
        var total = notifications + unreads;
        updateBrowserActionButton(total > 0 ? ICON_HAS_NOTIFICATION : ICON_NO_NOTIFICATION, total);
    }, function(err) {
        if (typeof err === 'Error') {
            updateBrowserActionButton(ICON_NO_TOKEN);
            throw err;
        }

        typetalk.refreshAccessToken().then(function(tokens) {
            refreshTokens(tokens);
            checkNotifications();
        }, function(err) {
            if (typeof err === 'Error') {
                throw err;
            }

            var authHeader = err['WWW-Authenticate'];
            console.log(authHeader);
        });
    });
}

function countNotifications(notifications) {
    var accessUnopened = notifications.access.unopened,
        inviteTeamPending = notifications.invite.team.pending,
        inviteTopicPending = notifications.invite.topic.pending,
        mentionUnread = 0,//notifications.mention.unread, // FIXME
        count = accessUnopened + inviteTeamPending + inviteTopicPending + mentionUnread;
    return count;
}

function checkTopics() {
    if (!typetalk.hasActiveToken()) {
        updateBrowserActionButton(ICON_NO_TOKEN);
        return;
    }

    typetalk.getTopics().then(function(data) {
        unreads = countUnreads(data.topics);
        var total = notifications + unreads;
        updateBrowserActionButton(total > 0 ? ICON_HAS_NOTIFICATION : ICON_NO_NOTIFICATION, total);
    }, function(err) {
        if (typeof err === 'Error') {
            updateBrowserActionButton(ICON_NO_TOKEN);
            throw err;
        }

        typetalk.refreshAccessToken().then(function(tokens) {
            refreshTokens(tokens);
            checkTopics();
        }, function(err) {
            if (typeof err === 'Error') {
                throw err;
            }

            var authHeader = err['WWW-Authenticate'];
            console.log(authHeader);
        });
    });

}

function countUnreads(topics) {
    var count = 0;
    topics.forEach(function(topic) {
        count += topic.unread.count;
    });

    return count;
}

function updateBrowserActionButton(icon, badgeNumber) {
    if (badgeNumber > 0) {
        chrome.browserAction.setBadgeText({'text': '' + badgeNumber});
    }
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
        if (notifications > 0) tooltip += '' + notifications + '件の通知';
        if (tooltip != '' && unreads > 0) tooltip += '\n';
        if (unreads > 0) tooltip += '' + unreads + '件の未読メッセージ';
    }
    return tooltip;
}

function refreshTokens(tokens) {
    if (typetalk.accessToken !== tokens.access_token) {
        typetalk.accessToken = tokens.access_token;
        typetalk.accessTokenExpires = Date.now() + tokens.expires_in * 1000;
    }

    if (typetalk.refreshToken !== tokens.refresh_token) {
        typetalk.refreshToken = tokens.refresh_token;
        typetalk.refreshTokenExpires = Date.now() + Typetalk.REFRESH_TOKEN_EXPIRES_IN * 1000;
    }

    var token = {
        'access_token': typetalk.accessToken,
        'refresh_token': typetalk.refreshToken,
        'access_token_expires': typetalk.accessTokenExpires,
        'refresh_token_expires': typetalk.refreshTokenExpires
    }
    localStorage['token'] = JSON.stringify(token);
}

function loadTokens() {
    var token = {}, tokenJson = localStorage['token'];
    if (tokenJson) {
        token = JSON.parse(tokenJson);
    }

    return token;
}

function clearTokens() {
    delete localStorage['token'];
};

function logout() {
    clearTokens();
    updateBrowserActionButton(ICON_NO_TOKEN, '');
};

function openTypetalkPage() {
    chrome.tabs.create({'url': 'https://typetalk.in/'}, function(tab) {});
}

chrome.runtime.onInstalled.addListener(function (details) {
});

chrome.browserAction.onClicked.addListener(function() {
    if (typetalk.hasActiveToken()) {
        openTypetalkPage();
    } else {
        typetalk.authorizeChromeApp().then(function(data) {
            refreshTokens(data);
            openTypetalkPage();
        }, function(err) {
            console.error('authorizeChromeApp error:' + err);
            clearTokens();
        });
    }
});
