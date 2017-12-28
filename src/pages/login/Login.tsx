
import * as ReactDOM from 'react-dom'
import React from 'react'
import { hashHistory } from 'react-router'
import { observer, inject } from "mobx-react"
import { useStrict, observable, action } from 'mobx'

import BaseView from '../../components/BaseView'
import Button from '../../components/Button'
import BaseStore from '../../stores/BaseStore'
import MenuStore from '../../stores/MenuStore'
import UserStore from '../../stores/UserStore'

import fs from 'fs'
import os from 'os'

import LoginType from '../../utils/LoginType'
import Network from '../../network/Network'
import ErrorHandler from '../../utils/ErrorHandler'
const network = Network.sharedInstance()
const errorHandler = ErrorHandler.sharedInstance()

require('./Login.less')

useStrict(false)

@inject("userStore") @observer
export default class Login extends BaseView {

    store: UserStore<BaseStore>

    phoneNumber: number

    verifyCode: number
    
    private verifyCodeTimer:any
    @observable verifyLoading:boolean = false
    @observable verifyText:string = "获取验证码"
    @observable loginLoading:boolean = false
    @observable loginText:string = "登录"

    constructor(props) {
        super()
        this.store = props.userStore
        this.store.uuid = ""
    }
    
    componentDidMount() {

        document.addEventListener('keyup', (e) => {
            if (e.keyCode == 13) {
                if (this.phoneNumber && this.verifyCode) {
                    this.handleLogin()
                }
            }
        })
    }

    componentWillUnmount() {
        clearInterval(this.verifyCodeTimer)
    }
    
    handleVerifyCodeChange(event) {
        this.verifyCode = event.target.value
    }

    handlePhoneChange(event) {
        this.phoneNumber = event.target.value
    }

    @action handleVerifyCode() {
        if (!(this.phoneNumber && /^1[3|4|5|7|8][0-9]{9}$/.test(this.phoneNumber + ''))) {
            errorHandler.handleErrorCode(1)
            return
        }
        this.verifyLoading = true
        this.verifyText = "获取中..."

        this.store.getVerifyCode({mobile: this.phoneNumber}, action((res: LoginType) => {
            if (res.error_code != 0) {
                this.verifyLoading = false
                this.verifyText = "获取验证码"
                errorHandler.handleErrorCode(res.error_code)
                return
            }
            this.verifyText = "60"
            this.verifyCodeTimer = setInterval(action(() => {
                if (Number(this.verifyText) == 1) {
                    clearInterval(this.verifyCodeTimer)
                        this.verifyLoading = false
                        this.verifyText = "获取验证码"
                    return
                }
                this.verifyText = Number(this.verifyText) - 1 + ''
            }), 1000)
        }))
    }
    
    @action handleLogin() {
        if (!(this.phoneNumber && /^1[3|4|5|7|8][0-9]{9}$/.test(this.phoneNumber + ''))) {
            errorHandler.handleErrorCode(1)
            return
        }
        if (!this.verifyCode) {
            errorHandler.handleErrorCode(2)
            return
        }
        this.loginLoading = true
        this.loginText = "登录中..."
        this.store.isLogin = true
        this.store.login({mobile: this.phoneNumber, code: this.verifyCode}, action((res: LoginType) => {
            this.loginLoading = false
            this.loginText = "登录"

            if (res.error_code == 0) {
                this.store.userInfo = res.data.info
                this.store.uuid = res.data.uuid
                this.store.uid = res.data.info.uid
                this.store.avatar = res.data.info.avatar
                this.store.nickname = res.data.info.nickname
                this.store.isLogin = true
                hashHistory.push('home')
            } else if (res.error_code) {
                errorHandler.handleErrorCode(res.error_code)
            }
        }))
    }

    public render() {    
        return <div className="loginContainer">
                <div className="loginContent">
                    <img className="logo" src="../src/assets/images/logo.png" alt=""/>
                    <div className="row">
                        <div className="inputRow">
                            <div className="inputIconWrapper">
                                <img className="inputIcon" src="../src/assets/images/user.png" alt=""/>
                            </div>
                            <input className="userInput" placeholder="请输入手机号" type="tel" maxLength={11}
                            onChange={this.handlePhoneChange.bind(this)} />
                        </div>
                    </div>
                    <div className="row">
                        <div className="inputRow">
                            <div className="inputIconWrapper">
                                <img className="inputIcon" src="../src/assets/images/password.png" alt=""/>
                            </div>
                            <input className="verifycodeInput" placeholder="请输入验证码" type="tel" maxLength={4}
                                onChange={this.handleVerifyCodeChange.bind(this)} />
                        </div>
                        <Button className="verifyBtn" disabled={this.verifyText != "获取验证码"}
                            onClick={this.handleVerifyCode.bind(this)}>
                            {this.verifyText}
                        </Button>
                    </div>
                    <Button className="loginBtn" disabled={this.loginText == "登录中..."} onClick={this.handleLogin.bind(this)}>
                        {this.loginText}
                    </Button>
                </div>
            </div>
    }
}