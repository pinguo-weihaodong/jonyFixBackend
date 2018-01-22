
import fs from 'fs'
import os from 'os'
import * as ReactDOM from 'react-dom'
import React from 'react'
import { observer, inject } from "mobx-react"
import { observable, autorun, useStrict, action } from 'mobx'
import { remote, shell } from 'electron'
import watchs from 'watch'
import path from 'path'
import { Tooltip, Modal, Icon, Switch, Badge, Tag, Button } from 'antd'

import BaseStore from '../../stores/BaseStore'
import MenuStore from '../../stores/MenuStore'
import UserStore from '../../stores/UserStore'
import JLocalStorage from '../../utils/JlocalStorage'
import FileManager from '../../utils/FileManager'
import DownloadFileManager from '../../utils/DownloadFileManager'
import UploadFileManager from '../../utils/UploadFileManager'
import ErrorHandler from '../../utils/ErrorHandler'
import Events from '../../utils/Events'
import { start } from 'repl';

const fileManager = FileManager.sharedInstance()
const downloadFileManager = DownloadFileManager.sharedInstance()
const uploadFileManager = UploadFileManager.sharedInstance()
const errorHandler = ErrorHandler.sharedInstance()
const events = Events.sharedInstance()

useStrict(false)

enum OrderStatus {
	unStart = 0,
	started = 1,
	end = 2
}

interface PassedProps extends React.Props<any> {
  	order: any
}

@inject("userStore") @observer
export default class OrderCard extends React.Component<PassedProps> {

	constructor(props) {
		super()
		this.order = props.order
		this.orderShootStatus = this.order.status
		this.userStore = props.userStore
		let uid = window.localStorage.getItem('uid')
		this.storage = JLocalStorage.sharedInstance(uid)
		if (this.order.orderStatus == OrderStatus.started) {
			this.fetchOrderPhotoList()
			this.watchDir()
		}
	}

	state = {
	}

	storage: JLocalStorage

	userStore: any

	@observable order: any
	@observable orderShootStatus: number

	@observable idRefreshing: boolean = false
	@observable downloadLocked: boolean = true
	@observable isDownloading: number = 0
	@observable isUploading: number = 0

	@observable uploadNum: number = 0
	@observable uploadTotal: number = 0
	@observable downloadNum: number = 0
	@observable downloadTotal: number = 0

	refreshOrder() {
		// this.fetchOrderPhotoList()
		let startTimestamp = (new Date()).getTime()
		let orderList= []
		this.idRefreshing = true
		this.userStore.getOrderList({isBlock: 1}, (res) => {
			let endTimestamp = (new Date()).getTime()
			let diffTime = endTimestamp - startTimestamp

			if (diffTime < 1000) {
				setTimeout(() => {
					this.idRefreshing = false
				}, 1000 - diffTime);
			}

			if (res.error_code == 0) {
				orderList = orderList.concat(res.data.list)

				orderList.forEach(orderInfo => {
					if (this.order.orderId == orderInfo.orderId) {
						if (this.orderShootStatus != orderInfo.status) {
							this.orderShootStatus = orderInfo.status
						}
					}
				})

			}
		})
	}

	fetchOrderPhotoList() {
		// console.log("fetchOrderPhotoList--------", this.order)
		let orderId = this.order.orderId
		this.isDownloading = 0
		this.userStore.getOrderPhotoList({uuid: this.userStore.uuid, orderId: orderId, isBlock: 1}, (res) => {
			// console.log(res)
			if (res.error_code == 0) {
				let data = Object.assign({}, this.storage.getData())
				if (!data[orderId]) {
					data[orderId] = {}
				}
				for (let index in res.data.list) {
					let imageObj = res.data.list[index];
					if (!data[orderId][imageObj.etag] || !data[orderId][imageObj.etag]['downloaded']) {
						data[orderId][imageObj.etag] = imageObj
						data[orderId][imageObj.etag]['download'] = true
						this.isDownloading ++
						// console.log('this.isDownloading----', this.isDownloading)
						let savePath = fileManager.getTagDirPath(orderId, imageObj) + '/' + imageObj.etag + '.jpg'
						downloadFileManager.downloadFile('https://c360-o2o.c360dn.com/' + imageObj.etag, savePath, (status) => {})
					}
				}
				// console.log(data)
				this.storage.setData(data)
				this.setDownloadFileTotal()
			}
		})
	}

	handleCreateDir() {
		fileManager.createOrderDir(this.order)

		this.userStore.startFix({uuid: this.userStore.uuid, orderId: this.order.orderId}, (res) => {
			if (res.error_code == 0) {
				this.order.orderStatus = OrderStatus.started
				this.forceUpdate()
				this.watchDir()
			}
		})

		this.fetchOrderPhotoList()
	}

	private uploadFileCountTimer

	componentDidMount() {
		let uploadNum = 0,
			uploadedNum = 0,
			downloadNum = 0,
			downloadedNum = 0
		let orderPics = this.storage.getData()[this.order.orderId]
		for (let key in orderPics) {
			if (orderPics[key].upload) {
				uploadNum ++
			}
			if (orderPics[key].uploaded) {
				uploadedNum ++
			}
			if (orderPics[key].downloaded) {
				downloadedNum ++
			}
			if (orderPics[key].download) {
				downloadNum ++
			}
		}

		this.uploadTotal = uploadNum
		this.uploadNum = uploadedNum
		this.downloadNum = downloadedNum
		this.downloadTotal = downloadNum
	}

	setDownloadFileTotal() {
		let downloadNum = 0
		let orderPics = this.storage.getData()[this.order.orderId]
		for (let key in orderPics) {
			if (orderPics[key].download) {
				downloadNum ++
			}
		}
		this.downloadTotal = downloadNum
	}
	  
	addFileUploadListener() {
		events.on("watchDirUploaded" + this.order.orderId, () => {
			this.isUploading ++
			this.uploadTotal += 1
		})
		events.on("watchFileUploaded" + this.order.orderId, () => {
			this.isUploading --
			if (this.uploadNum == this.uploadTotal) {
				this.isDownloading = 0
			}
			this.uploadNum += 1
		})
	}
	  
	addFileDownloadListener() {
		events.on("watchFileDownload" + this.order.orderId, () => {
			this.isDownloading ++
			// console.log('this.isDownloading----++++++', this.isDownloading)
			this.downloadTotal += 1
		})
		events.on("watchFileDownloaded" + this.order.orderId, () => {
			this.isDownloading --
			if (this.downloadNum == this.downloadTotal) {
				this.isDownloading = 0
			}
			// console.log('this.isDownloading----   ---', this.isDownloading)
			this.downloadNum += 1
		})
	}

	removeFileListener() {
		events.remove("watchDirUploaded" + this.order.orderId)
		events.remove("watchFileUploaded" + this.order.orderId)
		events.remove("watchFileDownload" + this.order.orderId)
		events.remove("watchFileDownloaded" + this.order.orderId)
	}

	watchDir() {
		this.addFileUploadListener()
		this.addFileDownloadListener()
		if (!this.userStore.isWatching) {
			this.userStore.isWatching = true;
			let jonyFixDirPath = fileManager.jonyFixDirPath
			watchs.watchTree(jonyFixDirPath, (filename, curr, prev) => {
				// console.log(filename, curr, prev, '---------')

				// 初始化，检测本地文件是否已经上传或下载
				if (typeof filename == "object" && prev === null && curr === null) {
					this.initLocalFiles(filename)
				} else if (curr.nlink === 0) {
					// file remove
					return
				} else {
					this.checkLocalFiles(filename)
				}
			})
		}
	}

	initLocalFiles(fileObj) {
		for (let filename in fileObj) {
			this.checkLocalFiles(filename)
		}
		// fileObj.map((index, name) => {
		// })
	}

	checkLocalFiles(filename) {
		// 排除mac上DS_Store文件
		if (filename.indexOf("DS_Store") > -1) {
			return
		}
		// console.log(filename, curr, prev)
		let picName = path.basename(filename)
		let etag = picName.split('.')[0],
			suffix = picName.split('.')[1]
		let paths = os.platform() == "win32" ? filename.split('\\') :  filename.split('/')
		let orderId = paths[paths.length - 4]
		let tagId = paths[paths.length - 2].split('-')[1]
		// console.log(etag, suffix, paths, orderId, tagId)

		let data = this.storage.getData()
		if (!data[orderId]) {
			data[orderId] = {}
		}

		// 新建上传目录时会进入判断
		if ('上传目录' == paths[paths.length - 3]) {
			// console.log(paths)

			if (suffix.toLowerCase() != 'jpg' && suffix.toLowerCase() != 'jpeg') {
				errorHandler.handleErrorCode(10, picName + '格式不正确')
				return
			}

			if (data[orderId][etag]) {
				if (!data[orderId][etag]['upload']) {
					data[orderId][etag]['upload'] = true
					this.storage.setData(data)
					events.emit("watchDirUploaded" + orderId);
				} else {
					if (data[orderId][etag]['uploaded']) {
						return
					}
				}
			} else {
				let imageObj = {
					orderId: orderId,
					etag: etag,
					tagID: tagId,
					upload: true
				}
				data[orderId][etag] = imageObj
				this.storage.setData(data)
				events.emit("watchDirUploaded" + orderId);
			}

			uploadFileManager.uploadFile({
				uid: this.userStore.uid,
				orderId: orderId,
				filePath: filename,
				tagId: tagId
			}, (picInfo, status) => {
				events.emit("watchFileUploaded" + orderId);

				if (data[orderId][etag] && !data[orderId][etag]['uploaded']) {
					data[orderId][etag]['uploaded'] = true
					this.storage.setData(data)
				}
			})

		} else if ('下载目录' == paths[paths.length - 3]) {
			// console.log(filename, '下载目录')
			if (data[orderId][etag] && !data[orderId][etag]['downloaded']) {
				data[orderId][etag]['downloaded'] = true
				this.storage.setData(data)
				events.emit("watchFileDownloaded" + orderId);
			}
		}
	}

	handleEndFix() {
		Modal.confirm({
			title: '是否要结束修图',
			content: '结束修图后照片将停止更新下载',
			onOk() {
				this.userStore.endFix({uuid: this.userStore.uuid, orderId: this.order.orderId}, (res) => {
					if (res.error_code == 0) {
						this.order.orderStatus = OrderStatus.end
						this.removeFileListener()
						this.forceUpdate()
					}
				})
			},
			onCancel() {
				// console.log('取消结束修图')
			},
		});
	}

	handleOpenDownloadDir() {
		fileManager.openDownloadDir(this.order.orderId)
	}

	handleUploadDir() {
		fileManager.openUploadDir(this.order.orderId)
	}

	onChangeDownloadSwitch(status) {
		downloadFileManager.handleChangeDownloadLocked()
		this.downloadLocked = !status
		if (status) {
			this.fetchOrderPhotoList()
		} else {
			this.isDownloading = 0
		}
	}

	public render() {
		let date = new Date(Number(this.order.startTime) * 1000)
		let year = date.getFullYear()
		let month = date.getMonth() + 1
		let day = date.getDate()
		let hour = date.getHours() > 9 ? date.getHours() : '0' + date.getHours()
		let min = date.getMinutes() > 9 ? date.getMinutes() : '0' + date.getMinutes()

		let orderShootStatusView
		switch (this.orderShootStatus) {
			case 0:
				orderShootStatusView = <div className="shootStatus" onClick={this.refreshOrder.bind(this)}>
										<Button icon="reload" loading={this.idRefreshing} style={{borderColor: '#2db7f5', color: '#2db7f5'}}>
											未拍摄
										</Button>
									</div>
				break;
			case 1:
				orderShootStatusView = <div className="shootStatus" onClick={this.refreshOrder.bind(this)}>
										<Button icon="reload" loading={this.idRefreshing} style={{borderColor: '#f50', color: '#f50'}}>
											拍摄中
										</Button>
									</div>
				break;
			case 2:
				orderShootStatusView = <div className="shootStatus">
										<Button disabled={true} style={{borderColor: '#333', color: '#333'}} >拍摄结束</Button>
									</div>
				break;
			default:
				orderShootStatusView = <span></span>
				break;
		}
		return <div className="orderWrapper">
			{ orderShootStatusView }
			<img className="orderBanner" src={this.order.banner} alt=""
				style={{
					backgroundImage:'url('+ this.order.banner +')',
					opacity: this.order.orderStatus == OrderStatus.end ? 0.5: 1
				}}/>
			<div className="orderInfo">
				{this.order.title.length >= 13 ?
					<Tooltip placement="topLeft" title={this.order.title}>
						<span className="orderTheme">{this.order.title}</span>
					</Tooltip> :
					<span className="orderTheme">{this.order.title}</span>
				}
				<div className="orderRow">
					<span className="orderLabel">时间 ： </span>
					<span className="orderValue">{year +'.' + month + '.' + day + ' ' + hour + ':' + min}</span>
				</div>
				<div className="orderRow">
					<span className="orderLabel">地点 ： </span>
					{this.order.place.length >= 13 ?
						<Tooltip placement="topLeft" title={this.order.title}>
							<span className="orderValue">{this.order.place}</span>
						</Tooltip> :
						<span className="orderValue">{this.order.place}</span>
					}
				</div>
				<div className="orderRow">
					<span className="orderLabel">订单 ： </span>
					<span className="orderValue">{this.order.orderId}</span>
				</div>
				<div className="orderRow">
					<Badge dot={this.order.orderStatus == OrderStatus.started && this.downloadTotal > this.downloadNum && this.downloadLocked}>
						<span className="orderLabel"
							style={{color: this.order.orderStatus == OrderStatus.end ? "#aaa": "#c5752d"}}>已下载 ： </span>
					</Badge>
					<span className="orderValue"
						style={{color: this.order.orderStatus == OrderStatus.end ? "#aaa": "#c5752d"}}>{this.downloadNum+'/'+this.downloadTotal}</span>
					{
						(this.order.orderStatus == OrderStatus.started && this.isDownloading && !this.downloadLocked) ?
							<Icon type="loading" className="fileLoading" /> : null
					}
					{
						this.order.orderStatus == OrderStatus.started ?
						<div className="switch">
							<Switch checkedChildren="同步中" unCheckedChildren="同步" defaultChecked={false}
							onChange={this.onChangeDownloadSwitch.bind(this)} />
						</div> : null
					}
				</div>
				<div className="orderRow">
					<span className="orderLabel"
						style={{color: this.order.orderStatus == OrderStatus.end ? "#aaa": "#c5752d"}}>已上传 ： </span>
					<span className="orderValue"
						style={{color: this.order.orderStatus == OrderStatus.end ? "#aaa": "#c5752d"}}>{this.uploadNum+'/'+this.uploadTotal}</span>
					<Icon type="loading" className="fileLoading"
						style={{ display: (this.order.orderStatus == OrderStatus.started && this.isUploading) ? 'inline-block' : 'none' }}/>
				</div>
			</div>
			{
				this.order.orderStatus == OrderStatus.end ? <div className="actionBtnWrapper">
					<Button disabled={true} className="actionBtn endedBtn">已结束</Button>
				</div> : null
			}
			{
				this.order.orderStatus == OrderStatus.unStart ? <div className="actionBtnWrapper">
					<Button className="actionBtn startBtn" onClick={this.handleCreateDir.bind(this)}>开始修图</Button>
				</div> : null
			}
			{
				this.order.orderStatus == OrderStatus.started ? <div className="actionBtnWrapper">
					<Button className="actionBtn startedBtn" onClick={this.handleUploadDir.bind(this)}>上传目录</Button>
					<Button className="actionBtn startedBtn" onClick={this.handleOpenDownloadDir.bind(this)}>下载目录</Button>
					<Button className="actionBtn startedBtn endBtn" onClick={this.handleEndFix.bind(this)}>结束修图</Button>
				</div> : null
			}
		</div>
	}
}

// banner:"http://c360-o2o.c360dn.com/59e5e6589258b"
// mobile:"13060046366"
// nickname:"调整水印"
// note:""
// orderId:"201711141517307179"
// orderStatus:0
// place:"成都美视国际学校"
// startTime:"1510643520"
// tagList:Array(0)
// title:"第九十九"

