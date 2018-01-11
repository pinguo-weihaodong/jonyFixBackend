import BaseNetwork from "./BaseNetwork"
import crypto from "crypto"

export default class Network extends BaseNetwork {
  static sNetwork

  static sharedInstance() {
    if (Network.sNetwork == null) {
      Network.sNetwork = new Network()
    }
    return Network.sNetwork
  }

  constructor() {
    super()
  }

  sortData(data) {
    const arr = Object.keys(data)
    const res = arr.sort()

    var string = ""
    for (let i = 0; i < arr.length; i++) {
      string += arr[i] + "=" + data[arr[i]]
      if (i < arr.length - 1) {
        string += "&"
      }
    }
    return string
  }

  signData(data) {
    var sign = encodeURI(this.sortData(data.data))
    sign += this.sign + data.timestamp + data.rand_str
    sign = crypto
      .createHash("md5")
      .update(sign)
      .digest("hex")
    return sign
  }

  assembleData(method, param) {
    var data = {
      code: this.methodMap[method],
      rand_str: this.rand_str,
      timestamp: new Date().getTime(),
      data: param || {}
    }

    let uuid = window.localStorage.getItem('uuid') || ''

    if (uuid.length > 0) {
      data.data['uuid'] = uuid
    }

    data["sign"] = this.signData(data)
    return data
  }

  request(method, param, callback) {
    // console.log('fetching ' + method + '...')
    var data = this.assembleData(method, param)
    var sendString = JSON.stringify(data)
    console.log('fetching data ',data, '...')
    var bodyBuffer = new Buffer(sendString)
    var headBuffer = new Buffer(4)
    headBuffer.writeUInt32BE(bodyBuffer.length + 4, 0)
    var headerLenth = headBuffer.readInt32BE(0)
    var sendBuffer = Buffer.concat([headBuffer, bodyBuffer])
    this.sendData(method, sendBuffer, callback, data["sign"])
  }
}
