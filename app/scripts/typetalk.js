'use strict';

(function() {
    var Typetalk = (function() {
        var storage = chrome.storage.local;

        function Typetalk(clientId, clientSecret) {
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb';
            this.accessToken = null;
            this.refreshToken = null;

            this.loadTokens();
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
                        self.accessToken = self.refreshToken = null;
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
                    var code = authorizeResponse.match("code=(.+)")[1];
                    self.getAccessToken(code);
                }
            );
        };

        Typetalk.prototype.getAccessToken = function(code, callback) {
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
                if(xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        self.saveTokens(resJson.access_token, resJson.refresh_token);
                        callback(null, resJson);
                    } else {
                        callback(xhr.status, null);
                    }
                }
            };
            xhr.open('POST', 'https://typetalk.in/oauth2/access_token');
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(param);
        };

        Typetalk.prototype.refreshAccessToken = function(callback) {
            var param = 'client_id=' + this.clientId 
                        + '&client_secret=' + this.clientSecret
                        + '&grant_type=refresh_token'
                        + '&refresh_token=' + this.refreshToken;
            this.postToAccessTokenEndpoint(param, callback);
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
            var self = this,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        callback(null, resJson);
                    } else {
                        callback(xhr.status, null);
                    }
                }
            };
            xhr.open('GET', 'https://typetalk.in/api/v1/notifications/status');
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.accessToken);
            xhr.send();
        };

        Typetalk.prototype.readNotifications = function(callback) {
            var self = this,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var resJson = JSON.parse(xhr.responseText);
                        callback(null, resJson);
                    } else {
                        callback(xhr.status, null);
                    }
                }
            };
            xhr.open('PUT', 'https://typetalk.in/api/v1/notifications/open');
            xhr.setRequestHeader('Authorization', 'Bearer ' + this.accessToken);
            xhr.send();
        };

        return Typetalk;
    })();

    this.Typetalk = Typetalk;
}).call(this);