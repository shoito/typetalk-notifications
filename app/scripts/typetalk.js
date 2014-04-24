'use strict';

(function() {
    var Typetalk = (function() {
        var API_BASE_URL = 'https://typetalk.in/api/v1/',
            OAUTH_BASE_URL = 'https://typetalk.in/oauth2/';

        function Typetalk(options) {
            this.clientId = options.client_id;
            this.clientSecret = options.client_secret;
            this.redirectUri = options.redirect_uri;
            this.requestTimeout = options.timeout || 3000;
            this.scope = options.scope || 'topic.read,topic.post,my';

            this.accessToken = options.access_token || null;
            this.refreshToken = options.refresh_token || null;
        }

        Typetalk.prototype.requestAccessToken = function(params) {
            var self = this;
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(JSON.parse(xhr.responseText));
                    }
                };

                xhr.onerror = function() {
                    reject(new Error(xhr.statusText));
                }

                xhr.open('POST', OAUTH_BASE_URL + 'access_token');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.timeout = self.requestTimeout;
                xhr.send(params);
            });
        }

        Typetalk.prototype.authorizeChromeApp = function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                var authorizeUrl = OAUTH_BASE_URL + 'authorize?client_id=' + self.clientId
                                + '&redirect_uri=' + self.redirectUri
                                + '&scope=' + self.scope + '&response_type=code';
                chrome.identity.launchWebAuthFlow(
                    {'url': authorizeUrl, 'interactive': true}, 
                    function(responseUrl) {
                        if (responseUrl === void 0) reject(new Error('response url is undefined'));

                        var code = responseUrl.match('code=(.+)')[1];
                        if (!code) reject(new Error('authorization code is undefined'));

                        var param = 'client_id=' + self.clientId 
                                    + '&client_secret=' + self.clientSecret
                                    + '&redirect_uri=' + self.redirectUri
                                    + '&grant_type=authorization_code'
                                    + '&code=' + code;
                        self.requestAccessToken(param).then(function(data) {
                            resolve(data);
                        }, function(err) {
                            reject(err);
                        });
                    }
                );
            });
        };

        Typetalk.prototype.hasTokens = function() {
            return !!this.accessToken && !!this.refreshToken;
        };

        Typetalk.prototype.requestApi = function(url, method, params) {
            var self = this;
            return new Promise(function(resolve, reject) {
                if (!self.accessToken) reject(new Error('access_token not found'));

                var xhr = new XMLHttpRequest();
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr.getAllResponseHeaders());
                    }
                };

                xhr.onerror = function() {
                    reject(new Error(xhr.statusText));
                }

                xhr.open(method, url);
                xhr.setRequestHeader('Authorization', 'Bearer ' + self.accessToken);
                xhr.timeout = self.requestTimeout;
                xhr.send(params);
            });
        }

        Typetalk.prototype.validateAccessToken = function() {
            return this.requestApi(API_BASE_URL + 'profile', 'GET', null);
        }

        Typetalk.prototype.refreshAccessToken = function() {
            var param = 'client_id=' + this.clientId 
                        + '&client_secret=' + this.clientSecret
                        + '&grant_type=refresh_token'
                        + '&refresh_token=' + this.refreshToken;
            return this.requestAccessToken(param);
        };

        Typetalk.prototype.getNotificationsStatus = function() {
            return this.requestApi(API_BASE_URL + 'notifications/status', 'GET', null);
        };

        Typetalk.prototype.markReadNotifications = function() {
            return this.requestApi(API_BASE_URL + 'notifications/open', 'PUT', null);
        };

        Typetalk.prototype.getTopics = function() {
            return this.requestApi(API_BASE_URL + 'topics', 'GET', null);
        };

        return Typetalk;
    })();

    this.Typetalk = Typetalk;
}).call(this);