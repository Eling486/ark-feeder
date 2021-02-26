const axios = require("axios");
const request = require('request')
const fs = require('fs');

class WechatPusher {
    constructor(param) { // 待添加参数导入
        this.corpid = param.corpid
        this.agentid = param.agentid
        this.corpsecret = param.corpsecret
        this.get_token_url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${param.corpid}&corpsecret=${param.corpsecret}`
        this.init()
    }

    async init() {
        await this.updateAccessToken()
    }

    async updateAccessToken() {
        this.access_token = await this.getAccessToken()
        this.push_url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${this.access_token}`
        this.upload_url = `https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=${this.access_token}&type=`
    }

    getAccessToken() {
        return new Promise(resolve => {
            axios
                .get(this.get_token_url)
                .then(res => {
                    resolve(res.data.access_token)
                })
                .catch(err => {
                    console.log(err);
                });
        })
    }

    async push(data) {
        await this.updateAccessToken()
        axios
            .post(this.push_url, data)
            .then(res => {
                console.log(`推送成功！`);
            })
            .catch(err => {
                console.log(err);
            });
    }

    // 上传网络图片资源
    async uploadImgFromUrl(img_url) {
        await this.updateAccessToken()
        return new Promise(resolve => {
            let image_name_arr = img_url.split('/')
            let image_name = image_name_arr[image_name_arr.length - 1]
            let img_path = `./media/image/${image_name}`

            let downloadStream = fs.createWriteStream(img_path);
            request(img_url).pipe(downloadStream)
            downloadStream.on('drain', () => {
                downloadStream.end()
                resolve(this.uploadImg(img_path, true))
            });
        })

    }

    uploadImg(img_path, del) {
        return new Promise(resolve => {
            let image_name_arr = img_path.split('/')
            let image_name = image_name_arr[image_name_arr.length - 1]

            const allow_image = ['jpg', 'jpeg', 'png'];
            const allow_contentType = ['image/jpeg', 'image/jpeg', 'image/png'];
            let ext = image_name.split('.')[1]
            let content_type
            for (let i = 0; i < allow_image.length; i++) {
                if (ext == allow_image[i]) {
                    content_type = allow_contentType[i]
                }
            }

            let upload_url = this.upload_url + 'image'
            request.post({
                url: upload_url,
                formData: {
                    buffer: {
                        value: fs.readFileSync(img_path),
                        options: {
                            filename: image_name,
                            contentType: content_type
                        }
                    }
                }
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    console.log(err)
                }
                if (del) {
                    fs.unlinkSync(img_path)
                }
                resolve(JSON.parse(body))
            })
        })
    }
}

module.exports = WechatPusher