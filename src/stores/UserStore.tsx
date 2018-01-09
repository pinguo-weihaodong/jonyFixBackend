import * as ReactDOM from 'react-dom'
import React from 'react'
import { observer } from "mobx-react"
import { observable, autorun, asStructure, useStrict, action } from 'mobx'
import BaseStore from './BaseStore'

import Network from '../network/Network'
let network = Network.sharedInstance()

import JLocalStorage from '../utils/JlocalStorage'

export default class UserStore<BaseStore> {

    rootStore: BaseStore

    @observable _userInfo: any 

    @observable orderList = []

    constructor(f:BaseStore) {
        this.rootStore = f
    }

    storage: any

    set userInfo(info) {
        this._userInfo = info
        this.storage = JLocalStorage.sharedInstance(window.localStorage.getItem('uid'))
    }

    get userinfo() {
        return this._userInfo
    }

    get isLogin() {
        var localizeProperty: any = window.localStorage.getItem("isLogin")
        if (localizeProperty == null || localizeProperty == 'false') {
        localizeProperty = false
        }else {
        localizeProperty == true
        }
        return localizeProperty
    }

    set isLogin(login: boolean) {
        var localizeProperty
        if (login == true) {
        localizeProperty = 'true'
        }else {
        localizeProperty = 'false'
        }

        window.localStorage.setItem("isLogin", localizeProperty) 
    }

    isWatching: boolean = false

    get uuid() {
        return window.localStorage.getItem("uuid")
    }

    set uuid(uuid) {
        window.localStorage.setItem("uuid", uuid) 
    }

    get uid() {
        return window.localStorage.getItem("uid")
    }

    set uid(uid) {
        window.localStorage.setItem("uid", uid) 
    }

    get avatar() {
        return window.localStorage.getItem("avatar")
    }

    set avatar(avatar) {
        window.localStorage.setItem("avatar", avatar) 
    }

    get nickname() {
        return window.localStorage.getItem("nickname")
    }

    set nickname(nickname) {
        window.localStorage.setItem("nickname", nickname) 
    }

    login(param, callback) {
        network.request('login', param, callback)
    }

    /* 接口 */
    getVerifyCode(param, callback) {
        network.request('verifyCode', param, callback)
    }

    getOrderList(param, callback) {
        network.request('orderList', param, callback)
    }

    getOrderPhotoList(param, callback) {
        network.request('orderPhotoList', param, callback)
    }

    startFix(param, callback) {
        network.request('startFix', param, callback)
    }

    endFix(param, callback) {
        network.request('endFix', param, callback)
    }

    pulseCheck(param, callback) {
        network.request('pulseCheck', param, callback)
    }

}

// Invite:"9cR0VA4v"
// address:""
// appletCode:""
// avatar:"https://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJ89PVfQ7icfVQzPmnzP6AYIblsws3wkBicaTm7veGVYvibKOX8UUzCNc3VaWWql2UPsNibUyNmIMy0Hg/0"
// cart:null
// company:""
// contacts:""
// createTime:"1510391870"
// email:""
// fee:""
// introduce:""
// nickname:"migaloo"
// phone:"13060046366"
// realName:null
// sex:0
// status:0
// type:0
// updateTime:"1510392669"
// wxcode:"5a0566a631158"
