const axios = require("axios");
const WechatPusher = require('../pusher/wechat.js')

class AnnounceMonitor {
    constructor(param) {
        this.push_latest = param.push_latest
        this.agentid = param.agentid
        this.announce_url = 'https://ak-fs.hypergryph.com/announce/IOS/announcement.meta.json'
        this.wechat_pusher = new WechatPusher(param)
        this.touser = param.touser
        this.pushed_id = []
        this.listening = true
        this.times = 0 // 调试用
        this.init()
    }

    async init() {
        this.latest_announce = await this.getAnnounce()
        let reg_title = new RegExp('\n', 'g')
        if (this.push_latest) {
            for (let i = 0; i < this.latest_announce.announce_list.length; i++) {
                if (this.latest_announce.announce_list[i].announceId == this.latest_announce.latest_aid && this.latest_announce.announce_list[i].group == 'SYSTEM') {
                    let content_url = `https://ak-fs.hypergryph.com/announce/IOS/announcement/${this.latest_announce.latest_aid}.html`
                    let title = this.latest_announce.announce_list[i].title
                    let img_url = await this.getBannerImg(content_url)
                    let json = {
                        "title": title.replace(reg_title, ''),
                        "description": title.replace(reg_title, '\n'),
                        "url": content_url,
                        "pic_url": img_url
                    }
                    this.push(json)
                    break;
                }
            }
        }
        for (let i in this.latest_announce.announce_list) {
            this.pushed_id.push(this.latest_announce.announce_list[i].announceId)
        }
        console.log(this.pushed_id)
        this.listen()
    }

    async listen() {
        while (this.listening) {
            let now = new Date().toLocaleString()
            let latest_announce = await this.getAnnounce()
            if (latest_announce == 'err') {
                console.error(`${now} - 公告 - 网络错误！`)
                continue
            }
            let reg_title = new RegExp('\n', 'g')
            /*
            this.times++
            if(this.times == 2){
                this.latest_announce.latest_aid = '584'
            }
            
            this.times++
            if(this.times == 3){
                latest_announce.focus_aid = 586
            }
            */
            if (latest_announce.latest_aid == this.latest_announce.latest_aid) {
                console.log(`${now} - 公告无更新`)
            }
            if (latest_announce.latest_aid !== this.latest_announce.latest_aid) {
                console.log(`${now} - 监听到公告更新！`)
                let push_list = []
                for (let i = 0; i < latest_announce.announce_list.length; i++) {
                    if (parseInt(latest_announce.announce_list[i].announceId) >= this.latest_announce.latest_aid) {
                        if (this.pushed_id.indexOf(latest_announce.announce_list[i].announceId) < 0) {
                            if (latest_announce.announce_list[i].group == "SYSTEM") {
                                let content_url = `https://ak-fs.hypergryph.com/announce/IOS/announcement/${latest_announce.announce_list[i].announceId}.html`
                                let title = latest_announce.announce_list[i].title
                                let img_url = await this.getBannerImg(content_url)
                                let json = {
                                    "title": title.replace(reg_title, ' '),
                                    "description": title.replace(reg_title, '\n'),
                                    "url": content_url,
                                    "pic_url": img_url
                                }
                                push_list.push(json)
                            }
                            if (latest_announce.announce_list[i].group == "ACTIVITY") {
                                let content_url = `https://ak-fs.hypergryph.com/announce/IOS/announcement/${latest_announce.announce_list[i].announceId}.html`
                                let announce_type = await this.getAnnounceType(content_url)
                                if (announce_type == 'article') {
                                    let title = latest_announce.announce_list[i].title
                                    let img_url = await this.getBannerImg(content_url)
                                    let json = {
                                        "title": title.replace(reg_title, ' '),
                                        "description": title.replace(reg_title, '\n'),
                                        "url": content_url,
                                        "pic_url": img_url
                                    }
                                    push_list.push(json)
                                    continue;
                                }
                                if (announce_type == 'image') {
                                    let content_url = `https://ak-fs.hypergryph.com/announce/IOS/announcement/${latest_announce.announce_list[i].announceId}.html`
                                    let img_url = await this.getBannerImg(content_url)
                                    let media_info = await this.wechat_pusher.uploadImgFromUrl(img_url)
                                    let media_id = media_info.media_id
                                    let json = {
                                        "media_id": media_id
                                    }
                                    this.pushImg(json)
                                    continue;
                                }
                            }
                            this.pushed_id.push(latest_announce.announce_list[i].announceId)
                        }
                    }
                }
                for (let i = 0; i < push_list.length; i++) {
                    this.push(push_list[i])
                }
                if (push_list.length == 0) {
                    console.log(`没有需要推送的文字公告！`)
                } else {
                    console.log(`推送已发出！`)
                }
                this.latest_announce = latest_announce
            }
            if (latest_announce.focus_aid !== this.latest_announce.focus_aid) {
                let exist = false
                for (let i = 0; i < this.latest_announce.announce_list.length; i++) {
                    if (this.latest_announce.announce_list[i].announceId == latest_announce.focus_aid) {
                        exist = true
                    }
                }
                if (!exist) {
                    console.log(`${now} - 监听到公告更新预告！`)
                    this.notice()
                    console.log(`预告推送已发出！`)
                    this.latest_announce = latest_announce
                }
            }
            await this.wait(5000)
        }
    }

    wait(time) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('fin')
            }, time)
        })
    }

    notice() {
        let data = {
            "touser": this.touser,
            "msgtype": "textcard",
            "agentid": this.agentid,
            "textcard": {
                "title": "更新预告",
                "description": "注意注意注意啦~鹰角小姐要更新游戏公告啦！",
                "url": "https://weibo.com/arknights",
                "btntxt": "前往微博"
            },
            "enable_id_trans": 0,
            "enable_duplicate_check": 0,
            "duplicate_check_interval": 1800
        }
        this.wechat_pusher.push(data)
    }

    push(json) {
        let data = {
            "touser": this.touser,
            "msgtype": "news",
            "agentid": this.agentid,
            "news": {
                "articles": [{
                    "title": `[公告更新]${json.title}`,
                    "description": json.description,
                    "url": json.url,
                    "picurl": json.pic_url
                }]
            },
            "enable_id_trans": 0,
            "enable_duplicate_check": 0,
            "duplicate_check_interval": 1800
        }
        this.wechat_pusher.push(data)
    }

    pushImg(json) {
        let data = {
            "touser": this.touser,
            "msgtype": "image",
            "agentid": this.agentid,
            "image": {
                "media_id": json.media_id
            },
            "safe": 0,
            "enable_duplicate_check": 0,
            "duplicate_check_interval": 1800
        }
        this.wechat_pusher.push(data)
    }

    getAnnounce() {
        return new Promise(resolve => {
            axios
                .get(this.announce_url)
                .then(res => {
                    let announce_list = res.data.announceList
                    let latest_aid = 0
                    for (let i = 0; i < announce_list.length; i++) {
                        if (parseInt(announce_list[i].announceId) > latest_aid) {
                            latest_aid = parseInt(announce_list[i].announceId)
                        }
                    }
                    resolve({
                        "announce_list": res.data.announceList,
                        "focus_aid": res.data.focusAnnounceId,
                        "latest_aid": latest_aid
                    })
                })
                .catch(err => {
                    console.log(err);
                    resolve('err')
                });
        })
    }

    getAnnounceType(url) {
        return new Promise(resolve => {
            axios
                .get(url)
                .then(res => {
                    let data = res.data
                    let reg_cover = new RegExp('cover-jumper', 'g')
                    let reg_cover2 = new RegExp('banner-image-container cover', 'g')
                    let announce_type = 'article'
                    if (reg_cover.test(data) || reg_cover2.test(data)) {
                        announce_type = 'image'
                    }
                    resolve(announce_type)
                })
        })
    }

    getBannerImg(url) {
        return new Promise(resolve => {
            axios
                .get(url)
                .then(res => {
                    let data = res.data
                    let reg_banner = new RegExp('<img class="banner-image" src="(.*?)" />', 'g')
                    let reg_image = new RegExp('<div class="media-wrap image-wrap"><img src="(.*?)"*/></div>', 'g')
                    let banner_url = ''
                    if (reg_image.test(data)) {
                        banner_url = data.match(reg_image)[0].split('"')[3]
                    }
                    if (reg_banner.test(data)) {
                        banner_url = data.match(reg_banner)[0].split('"')[3]
                    }
                    resolve(banner_url)
                })
        })
    }
}

module.exports = AnnounceMonitor