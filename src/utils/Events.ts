
import events from 'events'

export default class Events {
    constructor() {
		this.emitter = new events.EventEmitter();
    }

    emitter: any

    private static sEvents

    static sharedInstance() {
        if (Events.sEvents == null) {
            Events.sEvents = new Events()
        }

        return Events.sEvents
    }

    on(events, callback) {
        // console.log("out 事件触发，调用此回调函数" + events);
		//监听事件some_event
		this.emitter.addListener(events, () => {
            // console.log("in 事件触发，调用此回调函数" + events);
            callback && callback()
        });
        // console.log(this.emitter)
    }

    emit(events) {
        this.emitter.emit(events);
    }

    remove(events) {
        this.emitter.removeAllListeners([events]);
        // console.log(this.emitter)
    }

    removeAll() {
        this.emitter.removeAllListeners();
        // console.log(this.emitter)
    }

}