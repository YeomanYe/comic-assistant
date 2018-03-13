/**
 * 查询收藏的腾讯漫画是否有更新
 */
_createQueryObj.createQqQuery = function() {
    var baseObj = getBaseStoreObj('ac.qq');
    var ajaxCall = function(data) {
        var $html = $(data);
        var baseChapter = baseObj.baseChapter;
        var $as = $html.find('.chapter-page-all a');
        var newA = $as.get($as.length - 1);
        var newChapter = newA.innerText.replace(/\s/g, '');
        var newUrl = newA.href;
        newUrl = replaceOrigin(newUrl, baseObj.origin).replace(baseChapter, '');
        var resObj = {
            newUrl: newUrl,
            newChapter: newChapter
        };
        return resObj;
    };

    var qqQuery = function() {
        getFavs('ac.qq', baseObj, queryUpdate(baseObj, ajaxCall));
    };

    this.setAfterStore(qqQuery, ajaxCall);
    return qqQuery;
}

/**
 * 腾讯动漫导出用户的收藏
 */
/*_exportFunObj['ac.qq'] = function(args, resSend) {
    var dataStr = args[2];
    var status = JSON.parse(dataStr).status;
    if (status === '-99') {
        resSend({
            status: 1
        });
        return;
    }
    var userCols = JSON.parse(dataStr).data;
    var origin = args[1];

    var storObj = getBaseStoreObj(origin),
        baseImgUrl = storObj.baseImg,
        baseIndexUrl = storObj.baseIndex;
    var indexCall = function(item, curSeqNo, baseChapter) {
        return function(text) {
            var $html = $(text);
            var $as = $html.find('.chapter-page-all a');
            var newA = $as.get($as.length - 1),
                curA = $as.get(curSeqNo);
            var tmpArr = newA.title.split('：');
            var newChapter, curChapter;
            newChapter = tmpArr[1];
            tmpArr = curA.title.split('：');
            curChapter = tmpArr[1];
            var newUrl = newA.href,
                curUrl = curA.href;
            newUrl = replaceOrigin(newUrl, storObj.origin).replace(baseChapter, '');
            curUrl = replaceOrigin(curUrl, storObj.origin).replace(baseChapter, '');
            item.newChapter = newChapter;
            item.curChapter = curChapter;
            item.newUrl = newUrl;
            item.curUrl = curUrl;
        }
    };
    getFavs('ac.qq', storObj, function(cols, allFavs) {
        for (var i = 0, len = userCols.length; i < len; i++) {
            var item = userCols[i];
            var index = arrInStr(cols, item.title, 'title');
            //当收藏中没有该漫画时才添加
            if (index < 0) {
                var col = {
                    imgUrl: item.coverUrl.replace(baseImgUrl, ''),
                    indexUrl: item.id,
                    title: item.title,
                    isUpdate: false
                };
                $.ajax(baseIndexUrl + col.indexUrl, {
                    success: indexCall(col, item.nextSeqNo, storObj.baseChapter),
                    async: false
                });
                cols.push(col);
            }
            storLocal.set({
                allFavs: allFavs
            });
            resSend({
                status: 0
            });
        }
    });
}*/

_exportFunObj['ac.qq'] = function(args, resSend) {
    var dataStr = args[2];
    var status = JSON.parse(dataStr).status;
    if (status === '-99') {
        resSend({
            status: 1
        });
        return;
    }
    var userCols = JSON.parse(dataStr).data;
    var origin = args[1];
    var storObj = getBaseStoreObj('ac.qq');
    for (var i = 0, len = userCols.length; i < len; i++) {
        userCols[i].indexUrl = userCols[i].id;
    }
    var handleData = function(text, args) {
        var resSend = args[0];
        var curSeqNo = args[1];
        var retObj;
        try {
            var $html = $(text);
            var $as = $html.find('.chapter-page-all a');
            var newA = $as.get($as.length - 1),
                curA = $as.get(curSeqNo);
            var tmpArr = newA.title.split('：');
            var newChapter, curChapter;
            newChapter = tmpArr[1];
            tmpArr = curA.title.split('：');
            curChapter = tmpArr[1];
            var newUrl = newA.href,
                curUrl = curA.href;
            var title = $html.find('.works-intro-title').text();
            var imgUrl = $html.find('.works-cover img').attr('src');
            retObj = {
                newUrl:newUrl,
                curUrl:curUrl,
                newChapter:newChapter,
                curChapter:curChapter,
                title:title,
                imgUrl:imgUrl
            }
        }catch(e){
            log(e);
        }
        return retObj;
    };
    pipeExport(origin, userCols, handleData, resSend,'nextSeqNo');
}