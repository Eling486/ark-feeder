const WeiboMonitor = require('./monitors/weibo.js')
const AnnounceMonitor = require('./monitors/announce.js')
const fs = require('fs');
const yaml = require('yamljs');

let yaml_content = fs.readFileSync('./config.yaml', 'utf8').toString()
let config = yaml.parse(yaml_content)
let corpid = config.workwx.corpid
let agentid = config.workwx.agentid
let corpsecret = config.workwx.corpsecret
let touser = config.workwx.touser
let push_latest = config.push_latest

const uid = 6279793937

let weibo_monitor = new WeiboMonitor({
    uid: uid,
    push_latest: push_latest,
    touser: touser,
    corpid: corpid,
    agentid: agentid,
    corpsecret: corpsecret
})

let announce_monitor = new AnnounceMonitor({
    push_latest: push_latest,
    touser: touser,
    corpid: corpid,
    agentid: agentid,
    corpsecret: corpsecret
})