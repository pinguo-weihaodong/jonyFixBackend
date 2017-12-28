import JLocalStorage from '../utils/JlocalStorage'
import DownloadFileManager from '../utils/DownloadFileManager'
import FileManager from '../utils/FileManager'
import fs from 'fs'
import electron from 'electron'
export default class BaseNetwork {

  constructor() {
    
  }

  methodMap = {
    verifyCode: 10002,
    login: 10000,
    orderList: 10003,
    startFix: 10004,
    endFix: 10005,
    getUploadAuth: 10007,
    orderPhotoList: 10006,
    receivePhoto: 70000
  }

  rand_str = 'ywnBQ1YvqS'

  sign: string = '83dece9cac9106c3cbbd3cad5e3258624'

  callbacks = []

  so: any

  isConnected:boolean = false

  singleResTotalLength: number = 0

  prevRequests = []

  cacheBuffer: Buffer = Buffer.alloc(0)

  static COUNTBYTELENGTH: number = 4

    asembleData(data: Buffer) {
        let buffer = Buffer.from(data)
        this.cacheBuffer = Buffer.concat([this.cacheBuffer, buffer], this.cacheBuffer.length + buffer.length)
        this.parseData(this.cacheBuffer)
    }

    parseData(dataBuffer: Buffer) {
        if (dataBuffer.length > BaseNetwork.COUNTBYTELENGTH) {

            this.singleResTotalLength = dataBuffer.readUIntBE(0, BaseNetwork.COUNTBYTELENGTH)

            if (dataBuffer.length >= this.singleResTotalLength) {
                let singleDataBuffer = dataBuffer.slice(BaseNetwork.COUNTBYTELENGTH, this.singleResTotalLength)
                let resDataString = singleDataBuffer.toString()
                let jsonData = JSON.parse(resDataString)
                this.callbackWithData(jsonData)

                this.cacheBuffer = dataBuffer.slice(this.singleResTotalLength, dataBuffer.length)
                if (this.cacheBuffer.length > BaseNetwork.COUNTBYTELENGTH) {
                    this.parseData(this.cacheBuffer)
                }
            }

        }
    }

  connect(url, port) {
    if (!this.so) {
      var Socket = window['MainSocket']
      this.so = new Socket({
          readable: true,
          writable: true,
          allowHalfOpen: false
      })


      this.so.on('data', (res:Buffer) => {
            this.asembleData(res)
      })
        
      this.so.on('close', () => {
          this.reset()
          console.log('socket is close')
          if (confirm('网络连接已经断开，请重新连接')){
                setTimeout(() => {
                    this.so.destroy()
                    // this.so = null
                    // this.connect(this.url, this.port)
                    window.location.reload()
                }, 2000)
          }
      })
        
      this.so.on('error', (err) => {
          this.reset()
          console.log('socket is error:' + err)
        //   if (confirm('网络连接已经断开，请重新连接')){
        //       setTimeout(() => {
        //         this.so = null
        //         this.connect(this.url, this.port)
        //       }, 1000)
        // }
      })

      this.so.on('connect', () => {
            console.log('socket is connected')
            this.isConnected = true
            this.prevRequests.map((obj, index) => {
                this.sendData(obj['method'], obj['data'], obj['callback'], obj['sign'])
            })
            this.prevRequests = []
      })

      //this.so.setKeepAlive(true)

    //   this.so.setTimeout(15000)
    //   this.so.on('timeout', () => {
    //     console.log('socket timeout')
    //     this.so.end()
    //   });

      this.so.connect(port, url)

    }

  }

  reset() {
      this.isConnected = false
      this.singleResTotalLength = 0
  }

  sendData(method, data, callback, sign) {
    if (this.so && this.isConnected && this.so.writable) {
        if (callback && callback instanceof Function) {
            var callbackCache = {}
            callbackCache['sign'] = sign
            callbackCache['callback'] = callback
            this.callbacks.unshift(callbackCache)
        }

        this.so.write(data, 'utf-8')

    }else {
        this.prevRequests.push({
            method: method,
            data: data,
            sign: sign,
            callback: callback
        })
    }

  }

  callbackWithData(data) {
    if (data.code == this.methodMap.receivePhoto) {
        if (data.error_code == 0) {

            let storage = JLocalStorage.sharedInstance(window.localStorage.getItem('uid'))
            var storageData = storage.getData()

            data.data.map((imageObj, index) => {

                let orderId = imageObj.orderId
                if (!storageData[orderId]) {
                    storageData[orderId] = {}
                }
                if (!storageData[orderId][imageObj.etag] || !storageData[orderId][imageObj.etag]['downloaded']) {
                    storageData[orderId][imageObj.etag] = imageObj
                    let manager = DownloadFileManager.sharedInstance()
                    let fileManger = FileManager.sharedInstance()
                    let savePath = fileManger.getTagDirPath(imageObj.orderId, imageObj.name) + '/' + imageObj.etag + '.jpg'
                    manager.downloadFile('https://c360-o2o.c360dn.com/' + imageObj.etag, savePath)
                }
            })

        }

    }else {
        var excuteIndex = -1
        this.callbacks.map((obj, index) => {
            if (obj['sign'] == data.request_sign) {
                let callback = obj['callback']
                callback && callback(data)
                excuteIndex = index
                return
            }
        })
    
        // if (excuteIndex >= 0) {
        //     this.callbacks.splice(excuteIndex, 1)
        // }
    }
      
  }

}
