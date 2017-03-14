// a service for setting, getting and storing settings
/* eslint-disable no-undef */

const singleton = Symbol();
const singletonEnforcer = Symbol();

class SettingListener {
    constructor(enforcer) {
        if (enforcer !== singletonEnforcer) throw new Error('throw cannot construct singleton');
    }

    static get instance() {
        if (!this[singleton]) {
            this[singleton] = new SettingListener(singletonEnforcer);
            this[singleton].eventBus = {};
            this[singleton].initialSettings = {
                toggleEHunter: true
            }
        }
        return this[singleton];
    }

    // listen setting's change, and send action to content's vuex
    listen(store) {
        chrome.runtime.onMessage.addListener((msg, sender, response) => {
            console.log(msg);
            switch (msg.settingName) {
                case 'setAlbumWidth':
                    window.setTimeout(() => {
                        store.dispatch('setAlbumWidth', msg.value);
                    }, 0);
                    break;
                case 'toggleEHunter':
                    document.body.style.overflow = msg.value ? 'hidden' : '';
                    document.getElementsByClassName('vue-container')[0].style.top = msg.value ? '0' : '-100%';
                    break;
            }
            response();
        });
    }

    setSettingItem(settingName, value, callback = () => {}) {
        chrome.storage.sync.set({
            [settingName]: value
        }, () => {
            this._sendSettingMsg(settingName, value, callback);
            if (this.eventBus[settingName]) {
                this.eventBus[settingName].forEach(callback => callback(value));
            }
            console.log(`chrome saved ${settingName}`);
        });
    }

    getSettingItem(settingName, callback) {
        chrome.storage.sync.get(settingName, (value) => {
            if (typeof value[settingName] !== 'undefined') {
                callback(value[settingName]);
            } else if (typeof this.initialSettings[settingName] !== 'undefined') {
                callback(this.initialSettings[settingName]);
                // init is after first get in popupView
                if (chrome.tabs) {
                    this.setSettingItem(settingName, this.initialSettings[settingName]);
                }
            } else {
                return null;
            }
        });
    }

    onSettingChange(settingName, callback) {
        if (!this.eventBus[settingName]) {
            this.eventBus[settingName] = [];
        }
        this.eventBus[settingName].push(callback);
        console.log(this.eventBus);
    }

    _sendSettingMsg(settingName, value, callback = () => {}) {
        /* eslint-disable no-undef */
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(
                tabs[0].id, { settingName, value },
                callback);
        });
    }
}

export default SettingListener;