import * as ReactDOM from 'react-dom';
import React from 'react'
import { hashHistory } from 'react-router'
import { observer, inject } from "mobx-react"
import { observable, autorun, useStrict, action } from 'mobx'
import watch from 'node-watch'
import path from 'path'

import BaseStore from '../../stores/BaseStore'
import MenuStore from '../../stores/MenuStore'
import UserStore from '../../stores/UserStore'
import OrderCard from './OrderCard'
import ErrorHandler from '../../utils/ErrorHandler'
import BaseView from '../../components/BaseView'
import Button from '../../components/Button'
import JLocalStorage from '../../utils/JlocalStorage'
import FileManager from '../../utils/FileManager'

const errorHandler = ErrorHandler.sharedInstance()
const fileManager = FileManager.sharedInstance()

useStrict(false)

enum OrderStatus {
	unStart = 0,
	started = 1,
	end = 2
}

require('./home.less')
@inject("menuStore", "baseStore", "userStore") @observer
export default class Home extends BaseView {

	store: MenuStore<BaseStore>
	baseStore: BaseStore
	userStore: UserStore<BaseStore>

	@observable currentContent: any
	@observable avatar: any
	@observable nickname: any

	state = {
		orderList: []
	}

	constructor(props) {
		super()
		this.store = props.menuStore 
		this.baseStore = props.baseStore
		this.userStore = props.userStore
		this.avatar = this.userStore.avatar || "../src/assets/images/avatar.png"
		this.nickname = this.userStore.nickname
		this.fetchOrderList()
	}

	storage: JLocalStorage

	@action fetchOrderList() {
		this.isLoading = true
		this.userStore.getOrderList({isBlock: 1}, (res) => {
		// this.userStore.getOrderList(null, (res) => {
			this.isLoading = false
			if (res.error_code == 0) {
				this.userStore.orderList = this.userStore.orderList.concat(res.data.list)
				this.setState({
					orderList: this.userStore.orderList
				})
				
				for (let i = 0; i < res.data.list.length; i++) {
					const orderItem = res.data.list[i];
					if (orderItem.orderStatus == OrderStatus.started) {
						fileManager.createOrderDir(orderItem)
					}
				}
			} else {
				errorHandler.handleErrorCode(res.error_code)
			}
		})
	}

	@action logoutClick = (e) => {
		this.userStore.isLogin = false
		this.userStore.uuid = ""
		hashHistory.replace('login')
	}

	public render() {
		return <div className="container">
			<div className="header">
				<div className="headerContent">
					<img className="logo" src="../src/assets/images/logo.png" alt=""/>
					<div className="userInfo">
						<img className="userAvatar" src={this.avatar} alt=""/>
						<div className="userName">{this.nickname}</div>
						<Button className="logout" onClick={this.logoutClick.bind(this)}>退出</Button>
					</div>
				</div>
				<div className="title">修图列表</div>
			</div>
			<div className="mainContainer">
				<div className="orderContainer">
					{ this.state.orderList.map((order, index) => {
						return <OrderCard key={index} order={order} />
					}) }
				</div>
			</div>
		</div>
	}
}