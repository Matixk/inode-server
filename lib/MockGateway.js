'use strict';

const EventEmitter = require('events').EventEmitter;

class MockGateway extends EventEmitter {

    /**
     * @type {Array<string>}
     */
    constructor(macs) {
        super();
        /**
         * @private
         * @type {Array<Device>}
         */
        this.initDevices(macs);
    }

    /**
     * @param {Array<string>} macs
     * @returns {Array<Device>}
     */
    initDevices(macs) {
        this.devices =  macs.map(mac => {
            return {
                mac,
                model: 137,
                available: true,
                lastSeenAt: new Date(),
                state: {
                    position: { x: this.getRandomInt(), y: this.getRandomInt(), z: this.getRandomInt() },
                    magneticField: { x: this.getRandomInt(), y: this.getRandomInt(), z: this.getRandomInt() }
                }
            }
        });

        this.devices.forEach(device => this.mock(device));
    }

    /**
     * @param {(string|number)} mac
     * @returns {?Device}
     */
    getDevice(mac) {
        return this.devices.find(d => d.mac === mac);
    }

    mock(device) {
        this.emit('device:change', {
            device: device.mac,
            changes: {
                position: { x: this.getRandomInt(), y: this.getRandomInt(), z: this.getRandomInt() },
            }
        });
        setTimeout(() => this.mock(device), 1000);
    }

    getRandomInt(min = 0, max = 5) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
}

module.exports = { MockGateway }
