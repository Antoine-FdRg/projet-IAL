require("dotenv").config();

const SERVICE_UUID = process.env.SERVICE_UUID;
const RX_CHAR_UUID = process.env.RX_CHAR_UUID;
const TX_CHAR_UUID = process.env.TX_CHAR_UUID;

const bleno = require("@abandonware/bleno");

class RxCharacteristic extends bleno.Characteristic {
    constructor(onReceive) {
        super({
            uuid: RX_CHAR_UUID,
            properties: ["write", "writeWithoutResponse"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "RX - Write data to device",
                }),
            ],
        });
        this.onReceive = onReceive;
    }
    onWriteRequest(data, offset, withoutResponse, callback) {
        if (offset) return callback(this.RESULT_ATTR_NOT_LONG);
        try {
            this.onReceive(data);
            callback(this.RESULT_SUCCESS);
        } catch (e) {
            console.error("RX onWrite error:", e);
            callback(this.RESULT_UNLIKELY_ERROR);
        }
    }
}

class TxCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: TX_CHAR_UUID,
            properties: ["read", "notify"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "TX - Read/Notify data from device",
                }),
            ],
        });
        this._value = Buffer.alloc(0);
        this._updateValueCallback = null;
    }
    onReadRequest(offset, callback) {
        callback(this.RESULT_SUCCESS, this._value.slice(offset));
    }
    onSubscribe(maxValueSize, updateValueCallback) {
        console.log("TX subscribed");
        this._updateValueCallback = updateValueCallback;
    }
    onUnsubscribe() {
        console.log("TX unsubscribed");
        this._updateValueCallback = null;
    }
    notify(buf) {
        this._value = Buffer.from(buf);
        if (this._updateValueCallback) this._updateValueCallback(this._value);
    }
}

const txChar = new TxCharacteristic();
const rxChar = new RxCharacteristic((data) => {
    console.log(">>> Reçu sur RX:", data.toString("utf8"));
    txChar.notify(Buffer.from("ACK:" + Date.now()));
});

const primaryService = new bleno.PrimaryService({
    uuid: SERVICE_UUID,
    characteristics: [rxChar, txChar],
});

const DEVICE_NAME = "Emma-BLE-Server";

bleno.on("stateChange", (state) => {
    console.log("Adapter stateChange:", state);
    if (state === "poweredOn") {
        bleno.startAdvertising(DEVICE_NAME, [SERVICE_UUID], (err) => {
            if (err) console.error("startAdvertising error:", err);
            else console.log("Advertising as", DEVICE_NAME);
        });
    } else {
        bleno.stopAdvertising();
    }
});

bleno.on("advertisingStart", (error) => {
    if (error) return console.error("advertisingStart error:", error);
    console.log("Advertising started, setting services...");
    bleno.setServices([primaryService], (err) => {
        if (err) console.error("setServices error:", err);
        else console.log("GATT service/characteristics set");
    });
});

bleno.on("accept", (addr) => console.log("Accepted connection from", addr));
bleno.on("disconnect", (addr) => console.log("Disconnected from", addr));
