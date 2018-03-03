var chrNotify = chrome.notifications;
var storSync = chrome.storage.sync;
var log = console.log;
var _allFavs;
var kuaikanFavs;
var updateNum;
storSync.get('allFavs',function(resObj){
    _allFavs = resObj.allFavs;
    kuaikanQuery();
    //初始化更新数
    storSync.get('updateNum',function(resObj){
        updateNum = resObj.updateNum;
        updateNum = updateNum ? updateNum : 0;
        setBadge(updateNum);
    });
});

/**
 * 设置徽章
 */
function setBadge(num){
    if(!num) return;
    chrome.browserAction.setBadgeText({text:''+num});
    chrome.browserAction.setBadgeBackgroundColor({color: 'red'})
}

/**
 * 点击提醒打开链接
 */
chrome.notifications.onClicked.addListener(function(url){
    log('url',url);
    window.open(url);
});

/**
 * 创建提醒
 */
function createNotify(title,iconUrl,message,newUrl){
    var options = {
        type:chrome.notifications.TemplateType.BASIC,
        title:title,
        iconUrl:iconUrl,
        isClickable:true,
        message:message
    };
    chrome.notifications.create(newUrl,options);
}
/**
 * 查询收藏的快看漫画是否有更新
 */
function kuaikanQuery(){
    //第一次调用时获取保存的漫画记录
    if(!kuaikanFavs){
        for(var i=0,len=_allFavs.length;i<len;i++){
            var item = _allFavs[i];
            if(item.origin.indexOf('kuaikan')>=0){
                kuaikanFavs = item;
            }
        }
    }
    var baseIndex = kuaikanFavs.baseIndex;
    var baseImage = kuaikanFavs.baseImg;
    var baseChapter = kuaikanFavs.baseChapter;
    var favs = kuaikanFavs.cols;
    var sucCall = function(data){
        var $html = $(data);
        var aElm = $html.find('table .tit a').get(0);
        var newChapter = aElm.title;
        var newUrl = aElm.href;
        if(col.newChapter != newChapter){
            col.newChapter = newChapter;
            col.newUrl = newUrl;
            col.isUpdate = true;
            createNotify(col.title,baseImage + col.imgUrl,'更新到: '+newChapter,baseChapter+newUrl);
            storSync.set({
                allFavs:_allFavs
            });
            setBadge(++updateNum);
        }
    };
    for(var i=0,len=favs.length;i<len;i++){
        var col = favs[i];
        var indexUrl = col.indexUrl;
        $.ajax(baseIndex+indexUrl,{
            success:sucCall,
            async:false
        });
    }
    setTimeout(kuaikanQuery,1000 * 10 * 60);
}