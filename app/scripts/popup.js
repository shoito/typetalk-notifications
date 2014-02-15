'use strict';

(function() {
    chrome.extension.getBackgroundPage().checkNotifications();
}).call(this);


// function logout() {
//     chrome.extension.getBackgroundPage().logout();
//     window.close();
// }
