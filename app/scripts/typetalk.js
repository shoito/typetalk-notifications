'use strict';

(function() {
    var Typetalk = (function() {
        var storage = chrome.storage.local;

        function Typetalk(clientId, clientSecret, requestTimeout) {
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.requestTimeout = requestTimeout || 3000;

            this.redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb';
            this.accessToken = null;
            this.refreshToken = null;

            this.loadTokens();
        }

        Typetalk.prototype.createTimeout = function(xhr, requestTimeout) {
            return setTimeout(function() {
                if (xhr.readyState < 4) {
                    xhr.abort();
                }
            }, requestTimeout);
        }

        Typetalk.prototype.validateAccessTokenSync = function() {
            if (!this.accessToken) return false;

            var xhr = new XMLHttpRequest(),
                timerId = this.createTimeout(xhr, this.requestTimeout);
            xhr.open('GET', 'https://typetalk.in/api/v1/profile', false);
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.accessToken);
            xhr.send(null);
            clearTimeout(timerId);

            return (xhr.status === 200);
        }

        Typetalk.prototype.hasTokens = function() {
            return this.accessToken !== null && this.refreshToken !== null;
        };

        Typetalk.prototype.loadTokens = function() {
            var self = this;
            storage.get(['access_token', 'refresh_token'], 
                function(tokens) {
                    if(chrome.extension.lastError !== undefined) {
                        console.error(chrome.extension.lastError);
                        self.accessToken = null;
                        self.refreshToken = null;
                    } else {
                        self.accessToken = tokens.access_token;
                        self.refreshToken = tokens.refresh_token;
                    }
                }
            );
        };

        Typetalk.prototype.authorize = function() {
            var self = this;
            chrome.identity.launchWebAuthFlow({
                    'url': 'https://typetalk.in/oauth2/authorize?client_id=' + this.clientId
                            + '&redirect_uri=' + this.redirectUri
                            + '&scope=topic.read,topic.post,my&response_type=code',
                    'interactive':true}, 
                function(authorizeResponse) {
                    var code = authorizeResponse.match('code=(.+)')[1];
                    self.getAccessToken(code);
                }
            );
        };

        Typetalk.prototype.getAccessToken = function(code, callback) {
            if (!code) return callback && callback(null, null);

            var param = 'client_id=' + this.clientId 
                        + '&client_secret=' + this.clientSecret
                        + '&redirect_uri=' + this.redirectUri
                        + '&grant_type=authorization_code'
                        + '&code=' + code;
            this.postToAccessTokenEndpoint(param, callback);
        };

        Typetalk.prototype.postToAccessTokenEndpoint = function(param, callback) {
            var self = this,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        self.saveTokens(resJson.access_token, resJson.refresh_token);
                        callback && callback(resJson, xhr);
                    } else {
                        callback && callback(null, xhr);
                    }
                }
            };
            xhr.open('POST', 'https://typetalk.in/oauth2/access_token');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.timeout = this.requestTimeout;
            xhr.send(param);
        };

        Typetalk.prototype.refreshAccessToken = function(callback) {
            if (!this.refreshToken) return callback && callback(null, null);

            var param = 'client_id=' + this.clientId 
                        + '&client_secret=' + this.clientSecret
                        + '&grant_type=refresh_token'
                        + '&refresh_token=' + this.refreshToken;
            this.postToAccessTokenEndpoint(param, callback);
        };

        Typetalk.prototype.refreshAccessTokenSync = function() {
            if (!this.refreshToken) return false;

            var xhr = new XMLHttpRequest(),
                timerId = this.createTimeout(xhr, this.requestTimeout),
                param = 'client_id=' + this.clientId 
                        + '&client_secret=' + this.clientSecret
                        + '&grant_type=refresh_token'
                        + '&refresh_token=' + this.refreshToken;
            xhr.open('POST', 'https://typetalk.in/oauth2/access_token', false);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(param);
            clearTimeout(timerId);

            if (xhr.status === 200) {
                var resJson = JSON.parse(xhr.responseText);
                this.saveTokens(resJson.access_token, resJson.refresh_token);
                return true;
            } else {
                this.clearTokens();
                return false;
            }
        };

        Typetalk.prototype.saveTokens = function(accessToken, refreshToken) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;

            storage.set({
                    'access_token': accessToken,
                    'refresh_token': refreshToken},
                function() {
                    if(chrome.extension.lastError !== undefined) {
                        console.error(chrome.extension.lastError);
                    }
                }
            );
        };

        Typetalk.prototype.clearTokens = function() {
            this.accessToken = null;
            this.refreshToken = null;
            storage.remove(['access_token', 'refresh_token']);
        };

        Typetalk.prototype.getNotifications = function(callback) {
            if (!this.accessToken) return callback && callback(null, null);

            var self = this,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        callback && callback(resJson, xhr);
                    } else {
                        callback && callback(null, xhr);
                    }
                }
            };
            xhr.open('GET', 'https://typetalk.in/api/v1/notifications/status');
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.accessToken);
            xhr.timeout = this.requestTimeout;
            xhr.send(null);
        };

        Typetalk.prototype.readNotifications = function(callback) {
            if (!this.accessToken) return callback && callback(null, null);

            var self = this,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        callback && callback(resJson, xhr);
                    } else {
                        callback && callback(null, xhr);
                    }
                }
            };
            xhr.open('PUT', 'https://typetalk.in/api/v1/notifications/open');
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.accessToken);
            xhr.timeout = this.requestTimeout;
            xhr.send(null);
        };

        return Typetalk;
    })();

    this.Typetalk = Typetalk;
}).call(this);