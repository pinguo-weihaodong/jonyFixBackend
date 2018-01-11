

import fs from 'fs'
import { remote, shell } from 'electron'
import request from 'request'
import { observable, autorun, asStructure, useStrict, action } from 'mobx'
import { observer, Provider } from "mobx-react"

export default class DownloadFileManager {
    constructor() {
        
    }

    private maxCount = 10

    @observable private downloadLocked = true

    @observable private currentCount = 0

    @observable private currentFile = 0

    @observable private queue = [] 

    private static sManager

    static sharedInstance() {
        if (DownloadFileManager.sManager == null) {
            DownloadFileManager.sManager = new DownloadFileManager()
        }

        return DownloadFileManager.sManager
    }

    downloadFile(url, path, callback) {
        if (this.downloadLocked) {
            return
        }
		this.currentCount ++;
		this.startUploadQueue({
            url: url,
            path: path,
            check: true,
            callback: callback
        })
    }

    startUploadQueue(downloadInfo) {
        if (this.downloadLocked) {
            return
        }
        let _downloadInfo = Object.assign({}, downloadInfo)
        _downloadInfo["check"] = false
        // console.log(downloadInfo.check)
        // console.log("downloadInfo---", (new Date()).getTime())
        if (this.maxCount >= this.currentCount || !downloadInfo.check) {

            (() => {
                request.head(_downloadInfo.url, (err, res, body) => {
                    if(err){
                        // console.log(err);
                        this.startUploadQueue(_downloadInfo)

                    } else {
                        this.currentCount -- 
                        _downloadInfo.callback && _downloadInfo.callback(res)
                        if (this.currentFile < this.queue.length) {
                            let obj = this.queue[this.currentFile]
                            if (obj != null) {
                                // console.log('obj', obj)
                                // console.log("startUploadQueue---", (new Date()).getTime())
                                this.startUploadQueue(obj)
                                this.currentFile ++;
                            }
                        }
                    }
                })
                request(_downloadInfo.url).pipe(fs.createWriteStream(_downloadInfo.path))
            })()

        } else {
            this.queue.push(_downloadInfo)
            // console.log("this.queue---", (new Date()).getTime())
        }
    }

    // 切换是否允许下载
    handleChangeDownloadLocked() {
        this.downloadLocked = !this.downloadLocked
        if (!this.downloadLocked) {
            this.queue = []
        }
    }
}