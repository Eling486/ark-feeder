const axios = require("axios");
const WechatPusher = require('../pusher/wechat.js')

class WeiboMonitor {
    constructor(param) {
        this.uid = param.uid
        this.push_latest = param.push_latest
        this.agentid = param.agentid
        this.weibo_url = `https://m.weibo.cn/api/container/getIndex?uid=${param.uid}&type=uid&page=1&containerid=107603${param.uid}`
        this.wechat_pusher = new WechatPusher(param)
        this.touser = param.touser
        this.listening = true
        this.times = 0 // 调试用
        this.init()
    }

    async init() {
        this.latest_mid = await this.getLatestMid()
        let content_url = 'https://m.weibo.cn/status/' + this.latest_mid
        // let content_url = 'https://m.weibo.cn/status/4598297866806587' // 新活动通知
        // let content_url = 'https://m.weibo.cn/status/4605604751217940' // 新寻访通知
        // let content_url = 'https://m.weibo.cn/status/4608075195487656' // 其他内容

        if (this.push_latest) {
            let latest = await this.getContent(content_url)
            this.push(latest)
        }
        this.listen()
    }

    async listen() {
        while (this.listening) {
            let latest_mid = await this.getLatestMid()
            let now = new Date().toLocaleString()
            if (latest_mid == 0 || latest_mid == 'err') {
                console.error(`${now} - 官方微博 - 网络错误！`)
                continue
            }
            /*
            this.times++
            if (this.times == 2) {
                //latest_mid = '4598297866806587'
                //latest_mid = '4608075195487656'
                //latest_mid = '4605604751217940'
                //latest_mid = '4604472288354782'
                //latest_mid = '4603566344634400'
                //latest_mid = '4602705760758588'
                //latest_mid = '4602647539361317'
                latest_mid = '4601914597060030'
            }
            */
            if (latest_mid == this.latest_mid) {
                console.log(`${now} - 官方微博无更新`)
            }
            if (latest_mid !== this.latest_mid) {
                console.log(`${now} - 监听到官方微博更新！`)
                const content_url = 'https://m.weibo.cn/status/' + latest_mid
                let content_json = await this.getContent(content_url)
                if (content_json == 'err') {
                    console.log(`${now} - 官方微博 - 发生错误！`)
                    continue
                }
                this.push(content_json)
                console.log(`推送已发出！`)
                this.latest_mid = latest_mid
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

    push(json) {
        let data = {
            "touser": this.touser,
            "msgtype": "news",
            "agentid": 1000002,
            "news": {
                "articles": [{
                    "title": json.title,
                    "description": json.text,
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

    getLatestMid() {
        return new Promise(resolve => {
            axios
                .get(this.weibo_url)
                .then(res => {
                    let cards = res.data.data.cards
                    let latest_mid = 0
                    for (let i = 0; i < cards.length; i++) {
                        if (cards[i].mblog.mid > latest_mid) {
                            latest_mid = cards[i].mblog.mid
                        }
                    }
                    resolve(latest_mid)
                })
                .catch(err => {
                    console.log(err);
                    resolve('err')
                });
        })
    }

    getContent(url) {
        return new Promise(resolve => {
            axios
                .get(url)
                .then(res => {
                    let data = res.data

                    let reg_content = new RegExp('"text":.*"', 'g')
                    let reg_original_pic = new RegExp('"original_pic":.*"', 'g')
                    let reg_video_pic = new RegExp('"url":.*"', 'g')
                    let reg_title = new RegExp('</a>(.|<br />)(.*?)<br />', 'g')
                    let reg_a = new RegExp('<a .*>(.*?)</a>', 'gm')
                    let reg_remove_a = new RegExp('<a.*?</span></a>', 'gm')
                    let reg_a_2 = new RegExp('</a>', 'gm')
                    let reg_remove_a_br = new RegExp('<a.*?</span></a><br />', 'gm')
                    let reg_br = new RegExp('<br />', 'gm')

                    let pic_url = ''
                    // 获取pv封面作为pic
                    let has_video = reg_video_pic.test(data)
                    if (has_video) {
                        if (data.match(reg_video_pic).length == 1) {
                            pic_url = data.match(reg_video_pic)[0].split(': ')[1]
                        }
                    }
                    // 获取一般图片作为pic
                    if (reg_original_pic.test(data)) {
                        pic_url = data.match(reg_original_pic)[0].split(': ')[1]
                    }

                    /* // 获取视频地址（待完成）
                    let reg_exist_video = new RegExp('"type": "video",', 'g')
                    let reg_mp4_url = new RegExp('"mp4_720p_mp4":.*"', 'g')

                    if(reg_exist_video.test(data)){
                        
                        let mp4_url = reg_mp4_url.exec(data)[0]
                    }
                    */

                    let content
                    let content_matched = data.match(reg_content)
                    if (content_matched !== null) {
                        content = content_matched[0]
                    } else {
                        console.log(url)
                        console.log(data)
                        console.log(content_matched)
                        resolve('err')
                    }

                    let text = content.replace(reg_remove_a_br, '')
                    text = text.replace(reg_remove_a, '')
                    text = text.replace(reg_br, '\\n')

                    let title
                    if(reg_title.test(content)){
                        title = content.match(reg_title)[0]
                        if(reg_a.test(title)){
                            title = title.split('#')[1]
                        }else{
                            title = title.replace(reg_a_2, '')
                            title = title.replace(reg_br, '')
                        }
                    }else{
                        title = '官方微博更新'
                    }
                    
                    let json = JSON.parse(`{
                        "title": "${title}",
                        "url": "${url}",
                        "pic_url": ${pic_url},
                        ${text}}`)
                        
                    resolve(json)
                })
                .catch(err => {
                    console.log(err);
                    resolve('err')
                });
        })
    }
}

module.exports = WeiboMonitor