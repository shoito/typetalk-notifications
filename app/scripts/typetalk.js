'use strict';

(function() {
    var Typetalk = (function() {

        Typetalk.API_BASE_URL = 'https://typetalk.in/api/v1/';
        Typetalk.OAUTH_BASE_URL = 'https://typetalk.in/oauth2/';
        Typetalk.REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // sec

        var self,
            clientId,
            clientSecret,
            redirectUri,
            scope = 'topic.read,topic.post,my',
            tokenChangeListeners = [];

        function Typetalk(options) {
            ['client_id', 'client_secret', 'redirect_uri'].forEach(function(field) {
                if (options[field] === void 0) throw new Error(field + ' is required');
            });

            self = this;
            this.accessToken = options.access_token;
            this.refreshToken = options.refresh_token;
            this.accessTokenExpires = options.access_token_expires || 0;
            this.refreshTokenExpires = options.refresh_token_expires || 0;
            this.timeout = options.timeout || 3000;

            clientId = options.client_id;
            clientSecret = options.client_secret;
            redirectUri = options.redirect_uri;
            scope = options.scope || scope;
        }

        var requestAccessToken = function(params) {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        // { "error": "invalid_request", "error_description": "grant_type not found"}
                        reject(JSON.parse(xhr.responseText));
                    }
                };
                xhr.onerror = reject;

                xhr.open('POST', Typetalk.OAUTH_BASE_URL + 'access_token');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.timeout = self.timeout;
                xhr.send(params);
            });
        };

        var requestApi = function(url, method, params) {
            return new Promise(function(resolve, reject) {
                if (!self.hasActiveToken()) reject(new Error('access_token is required'));

                var xhr = new XMLHttpRequest();
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        // 400 or 401 WWW-Authenticate: Bearer error="invalid_token", error_description="The access token expired"
                        reject(xhr.getAllResponseHeaders());
                    }
                };
                xhr.onerror = reject;

                xhr.open(method, url);
                xhr.setRequestHeader('Authorization', 'Bearer ' + self.accessToken);
                xhr.timeout = self.timeout;
                xhr.send(params);
            });
        };

        Typetalk.prototype.addTokenChangeListener = function(listener) {
            var index = tokenChangeListeners.indexOf(listener);
            if (index === -1) {
                tokenChangeListeners.push(listener);
            }
        };

        Typetalk.prototype.removeTokenChangeListener = function(listener) {
            var index = tokenChangeListeners.indexOf(listener);
            if (index > -1) {
                tokenChangeListeners.splice(index, 1);
            }
        };

        Typetalk.prototype.authorizeChromeApp = function() {
            return new Promise(function(resolve, reject) {
                var authorizeUrl = Typetalk.OAUTH_BASE_URL + 'authorize?client_id=' + clientId
                                + '&redirect_uri=' + redirectUri
                                + '&scope=' + scope + '&response_type=code';
                chrome.identity.launchWebAuthFlow(
                    {'url': authorizeUrl, 'interactive': true}, 
                    function(responseUrl) {
                        if (responseUrl === void 0) reject(new Error('response url is required'));

                        var code = responseUrl.match('code=(.+)')[1];
                        if (code === void 0) reject(new Error('authorization code is required'));

                        self.getAccessToken(code).then(function(data) {
                            resolve(data);
                        }, function(err) {
                            reject(err);
                        });
                    }
                );
            });
        };

        Typetalk.prototype.hasActiveToken = function() {
            return !this.acsessTokenExpired() && !this.refreshTokenExpired();
        };

        Typetalk.prototype.acsessTokenExpired = function() {
            return (this.accessToken === void 0) || (this.accessTokenExpires < Date.now());
        };

        Typetalk.prototype.refreshTokenExpired = function() {
            return (this.refreshToken === void 0) || (this.refreshTokenExpires < Date.now());
        };

        Typetalk.prototype.validateAccessToken = function() {
            return requestApi(Typetalk.API_BASE_URL + 'profile', 'GET', null);
        };

        Typetalk.prototype.getAccessToken = function(code) {
            var param = 'client_id=' + clientId 
                        + '&client_secret=' + clientSecret
                        + '&redirect_uri=' + redirectUri
                        + '&grant_type=authorization_code'
                        + '&code=' + code;
            return requestAccessToken(param);
        };

        Typetalk.prototype.refreshAccessToken = function() {
            var param = 'client_id=' + clientId 
                        + '&client_secret=' + clientSecret
                        + '&grant_type=refresh_token'
                        + '&refresh_token=' + refreshToken;
            return requestAccessToken(param);
        };

        Typetalk.prototype.getNotificationsStatus = function() {
            return requestApi(Typetalk.API_BASE_URL + 'notifications/status', 'GET', null);
        };

        Typetalk.prototype.markReadNotifications = function() {
            return requestApi(Typetalk.API_BASE_URL + 'notifications/open', 'PUT', null);
        };

        Typetalk.prototype.getTopics = function() {
            return requestApi(Typetalk.API_BASE_URL + 'topics', 'GET', null);
        };

        return Typetalk;
    })();

    this.Typetalk = Typetalk;
}).call(this);