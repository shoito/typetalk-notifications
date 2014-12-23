'use strict';

function loadToken() {
    var token = {}, tokenJson = localStorage['token'];
    if (tokenJson) {
        token = JSON.parse(tokenJson);
    }

    return token;
}

var token = loadToken(),
    typetalk = new Typetalk({
        'client_id': '{{typetalk.clientId}}',
        'client_secret': '{{typetalk.clientSecret}}',
        'redirect_uri': 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb',
        'access_token': token['access_token'],
        'refresh_token': token['refresh_token'],
        'scope': 'my,topic.read'
    }),
    wsConnected = false,
    ICON_HAS_NOTIFICATION = 'images/icon-19.png',
    ICON_NO_NOTIFICATION = 'images/icon-19-off.png',
    ICON_NO_TOKEN = 'images/icon-19-notoken.png',
    notifications = 0,
    unreads = 0;

function getTooltip(icon) {
    var tooltip = '';
    if (icon === ICON_NO_TOKEN) {
        tooltip = chrome.i18n.getMessage('notoken');
    } else if (icon === ICON_NO_NOTIFICATION) {
        tooltip = chrome.i18n.getMessage('nonotification');
    } else {
        if (notifications > 0) {
            tooltip += '' + notifications + chrome.i18n.getMessage('notificationCountSuffix');
        }
        if (tooltip !== '' && unreads > 0) {
            tooltip += '\n';
        }
        if (unreads > 0) {
            tooltip += '' + unreads + chrome.i18n.getMessage('unreadCountSuffix');
        }
    }
    return tooltip;
}

function updateBrowserActionButton(icon, badgeNumber) {
    if ((badgeNumber > 0) === false) {
        badgeNumber = '';
    }
    chrome.browserAction.setBadgeText({'text': '' + badgeNumber});
    chrome.browserAction.setIcon({'path': icon});
    chrome.browserAction.setTitle({'title': getTooltip(icon)});
}

function refreshToken(token) {
    if (typetalk.accessToken !== token.access_token) {
        typetalk.accessToken = token.access_token;
    }

    if (typetalk.refreshToken !== token.refresh_token) {
        typetalk.refreshToken = token.refresh_token;
    }

    var token = {
        'access_token': typetalk.accessToken,
        'refresh_token': typetalk.refreshToken
    };
    localStorage['token'] = JSON.stringify(token);
}

function clearToken() {
    typetalk.clearToken();
    delete localStorage['token'];
    token = {};
}

function countNotifications(notifications) {
    var accessUnopened = notifications.access.unopened,
        inviteTeamPending = notifications.invite.team.pending,
        inviteTopicPending = notifications.invite.topic.pending,
        count = accessUnopened + inviteTeamPending + inviteTopicPending;
    return count;
}

function countUnreads(topics) {
    var count = 0;
    topics.forEach(function(topic) {
        count += topic.unread.count;
    });

    return count;
}

function checkUnreads() {
    if (!typetalk.hasToken()) {
        updateBrowserActionButton(ICON_NO_TOKEN);
        return;
    }

    Promise.all([
        typetalk.getNotificationCount(),
        typetalk.getMyTopics()
    ]).then(function(results) {
        notifications = countNotifications(results[0]);
        unreads = countUnreads(results[1].topics);
        var total = notifications + unreads;
        updateBrowserActionButton(total > 0 ? ICON_HAS_NOTIFICATION : ICON_NO_NOTIFICATION, total);
    }).catch(function(err) {
        if (err.status === 400 || err.status === 401) {
            refreshAccessToken();
        }
    });
}

function refreshAccessToken() {
    typetalk.refreshAccessToken().then(function(token) {
        refreshToken(token);
        checkUnreads();
    }, function() {
        clearToken();
        updateBrowserActionButton(ICON_NO_TOKEN);
    });
}

function authorize(successCallback, failedCallback) {
    typetalk.authorizeChromeApp().then(function(token) {
        refreshToken(token);
        successCallback && successCallback();
    }, function(err) {
        console.error('authorizeChromeApp error:' + err);
        clearToken();
        failedCallback && failedCallback();
    });
}

function connectStream() {
    var token = loadToken(),
        ws;

    if (wsConnected || token.access_token == null) {
        return;
    }

    ws = new WebSocket('wss://typetalk.in/api/v1/streaming?access_token=' + token.access_token);

    ws.onopen = function(event) {
        wsConnected = true;
    };

    ws.onclose = function(event) {
        wsConnected = false;
        setTimeout(connectStream, 1000 * 60 * 5);
    };

    ws.onmessage = function(event) {
        if (event && event.data) {
            processMessage(JSON.parse(event.data));
        }
    };

    ws.onerror = function(event) {
        console.error(event);
        setTimeout(connectStream, 1000 * 60 * 3);
    };
}

function processMessage(message) {
    var filters = [
        'addTalkPost',
        'createTalk',
        'createTopic',
        'deleteMessage',
        'deleteTalk',
        'deleteTopic',
        'joinTopics',
        // 'likeMessage',
        'notifyMention',
        'postMessage',
        'removeTalkPost',
        'saveBookmark',
        // 'unlikeMessage',
        'updateTopic'
    ];

    if (filters.indexOf(message.type) > -1) {
        checkUnreads();
    }

    /* TODO: add options
    if (message.type === 'postMessage') {
        var notificationOptions = {
            type: 'basic',
            title: message.data.topic.name + ' from ' + message.data.post.account.name,
            message: message.data.post.message,
            iconUrl: message.data.post.account.imageUrl
        };
        chrome.notifications.create('typetalk_notifications', notificationOptions);
    }
    */
}

function openTypetalkPage() {
    chrome.tabs.create({'url': 'https://typetalk.in/'}, function() {});
}

chrome.runtime.onInstalled.addListener(function() {});

chrome.browserAction.onClicked.addListener(function() {
    typetalk.validateAccessToken().then(function() {
        openTypetalkPage();
    }, function() {
        authorize(function() {
            openTypetalkPage();
            checkUnreads();
        });
    });
});

setInterval(function() {
    if (!wsConnected) {
        checkUnreads();
    }
}, 1000 * 60 * 5);

setTimeout(checkUnreads, 3000);

connectStream();
