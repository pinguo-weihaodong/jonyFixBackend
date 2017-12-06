
export default class BaseNetwork {

  constructor() {
    
  }

  methodMap = {
    verifyCode: 10002,
    login: 10000,
    orderList: 10003,
    startFix: 10004,
    getUploadAuth: 10007,
    orderPhotoList: 10006,
    receivePhoto: 70000
  }

  rand_str = 'ywnBQ1YvqS'

  sign: string = '83dece9cac9106c3cbbd3cad5e3258624'

  callbacks = []

  so: any

  isConnected:boolean = false

  singleReqeustComplete: boolean = true

  singleResTotalLength: number = 0

  singleResString: string = ""

  prevRequests = []

  static COUNTBYTELENGTH: number = 4

  url: '10.1.17.204'

  port: 7373

  connect(url, port) {
    if (!this.so) {
      var Socket = window['MainSocket']
      this.so = new Socket({
          readable: true,
          writable: true,
          allowHalfOpen: false
      })

      this.so.on('data', (res) => {

        var buffer = Buffer.from(res)

        if (this.singleReqeustComplete) {

            this.singleResTotalLength = buffer.readUIntBE(0, BaseNetwork.COUNTBYTELENGTH)
            var dataBuffer = buffer.slice(BaseNetwork.COUNTBYTELENGTH, buffer.length)
            this.singleResString = dataBuffer.toString()
            //表示是一次完整的请求
            if (this.singleResTotalLength == buffer.length) {
                let jsonData = JSON.parse(this.singleResString)
                this.callbackWithData(jsonData)

            }else { //表示还有未接收的数据
              this.singleReqeustComplete = false
            }

        }else {
            this.singleResString += buffer.toString()
            if ((this.singleResString.length + BaseNetwork.COUNTBYTELENGTH) == this.singleResTotalLength) {
                let jsonData = JSON.parse(this.singleResString)
                this.callbackWithData(jsonData)
                this.singleReqeustComplete = true
            }
        }

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
      this.singleReqeustComplete = false
      this.singleResString = ""
      this.singleResTotalLength = 0
  }

  sendData(method, data, callback, sign) {
    if (this.so && this.isConnected && this.so.writable) {
        if (callback && callback instanceof Function) {
            var callbackCache = {}
            callbackCache['sign'] = sign
            callbackCache['callback'] = callback
            this.callbacks.push(callbackCache)
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
            
        }

    }else {
        var excuteIndex = -1
        this.callbacks.map((obj, index) => {
            if (obj['sign'] == data.request_sign) {
                let callback = obj['callback']
                callback && callback(data)
                excuteIndex = index
            }
        })
    
        if (excuteIndex >= 0) {
            this.callbacks.splice(excuteIndex, 1)
        }
    }
      
  }

}
