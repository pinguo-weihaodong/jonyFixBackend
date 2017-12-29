
import * as ReactDOM from 'react-dom'
import React from 'react'
import { hashHistory } from 'react-router'
import { observer, inject } from "mobx-react"
import { useStrict, observable, action } from 'mobx'

import BaseView from '../components/BaseView'

useStrict(false)

@inject("userStore") @observer
export default class Test extends BaseView {

    handleGoToHome() {

		hashHistory.replace('home')
    }

    render () {
        return <div onClick={this.handleGoToHome.bind(this)}>asdfasdf</div>
    }
}