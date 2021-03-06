var storLocal = chrome.storage.local;
var log = console.log;
var sendMsg = chrome.runtime.sendMessage;
var cGetUrl = chrome.runtime.getURL;
var _createQueryObjProto = {
    addAfterStore: function (queryFun, hangFun) {
        queryFun.afterStore = function (callback) {
            hangFun._afterStore = callback;
            return callback;
        };
    }
};
var _createQueryObj = Object.create(_createQueryObjProto);
var _exportFunObj = {};

/**
 * 判断数组中是否有一个字符串在目标字符串中。并返回序列号。-1代表不存在
 * field代表数组中某个对象的某一字段
 */
function arrInStr(arr, strs) {
    var flag;
    for (var i = 0, len = arr.length; i < len; i++) {
        var obj = arr[i];
        flag = true;
        if (typeof strs === 'object') {
            var keys = Object.keys(strs);
            //为数组的情况
            for (var j = 0, len2 = keys.length; j < len2; j++) {
                if (strs[keys[j]].indexOf(obj[keys[j]]) < 0) {
                    flag = false;
                    break;
                }
            }
            if (flag) return i;
        } else if (strs.indexOf(obj) >= 0) {
            return i;
        }
    }
    return -1;
}

/**
 * 判断数组中是否有一个字符串等于目标字符串。并返回序列号。-1代表不存在
 * field代表数组中某个对象的某一字段
 */
function arrEqStr(arr, strs) {
    var flag;
    for (var i = 0, len = arr.length; i < len; i++) {
        var obj = arr[i];
        flag = true;
        if (typeof strs === 'object') {
            var keys = Object.keys(strs);
            //为数组的情况
            for (var j = 0, len2 = keys.length; j < len2; j++) {
                if (strs[keys[j]] !== obj[keys[j]]) {
                    flag = false;
                    break;
                }
            }
            if (flag) return i;
        } else if (strs === obj) {
            return i;
        }
    }
    return -1;
}

/**
 * 获取存储并执行回调函数
 */
function getStoreLocal(keys, callback) {
    chrome.storage.local.get(keys, function (resObj) {
        //不是字符串就是数组了
        if (typeof keys === 'string') {
            callback(resObj[keys]);
        } else {
            var vals = [];
            for (var i = 0, len = keys.length; i < len; i++) {
                vals.push(resObj[keys[i]]);
            }
            callback.apply({}, vals);
        }
    });
}

/**
 * 获取某站点下所有收藏的漫画,以及漫画中更新的数目
 */
function getFavs(siteName, type, callback) {
    var defaultStore = getBaseStoreObj(siteName, type);
    getStoreLocal([STOR_KEY_FAVS, STOR_KEY_UPDATE_NUM], function (allFavs, updateNum) {
        allFavs = allFavs ? allFavs : [];
        updateNum = updateNum ? updateNum : 0;
        var index = -1;
        if (allFavs.length) index = arrEqStr(allFavs, {site: siteName, type: type});
        var cols = [];
        if (index < 0) {
            defaultStore.cols = cols;
            allFavs.unshift(defaultStore);
        } else {
            cols = allFavs[index].cols;
        }
        callback(cols, allFavs, updateNum);
    });
}

/**
 * 添加数组元素到数组中
 */
function addArr(arr1, arr2) {
    for (var i = 0, len = arr2.length; i < len; i++) {
        arr1.push(arr2[i]);
    }
    return arr1;
}

/**
 * 减少更新的漫画数量，标志
 */
function decUpdateNum(item) {
    if (item.isUpdate) {
        item.isUpdate = false;
        getStoreLocal(STOR_KEY_UPDATE_NUM, function (updateNum) {
            --updateNum;
            storLocal.set({
                updateNum: updateNum
            }, function () {
                chrome.runtime.sendMessage(null, [BG_CMD_UPDATE_NUM]);
            });
        });
    }
}

/**
 * 更新阅读记录
 * async 是否异步获取的信息
 */
function updateColRecord(getCurIndex, async) {
    return function (favs, allFavs) {

        var updateCurInfo = function (curIndex) {
            //解析当前页面并更新阅读记录
            var index = arrEqStr(favs, {title: curIndex.title});
            _$imgToggle.get(0).src = _src.collectGrey;
            if (index < 0) return;
            //更新图标
            _$imgToggle.get(0).src = _src.collect;
            var curItem = favs[index];
            curItem.timestamp = Date.now();
            if (!curIndex.curChapter) return;
            curItem.curChapter = curIndex.curChapter;
            curItem.curUrl = curIndex.curUrl.replace(baseChapterUrl, '');
            //更新，当前更新的漫画数量
            decUpdateNum(curItem);
            storLocal.set({
                allFavs: allFavs
            });
        };
        if (async) getCurIndex(updateCurInfo);
        else updateCurInfo(getCurIndex());
    }
}

/**
 * 查询是否有更新的通用函数
 */
function queryUpdate(baseObj, callback, wayFlag) {
    var baseIndex = baseObj.baseIndex;
    var baseImage = baseObj.baseImg;
    var baseChapter = baseObj.baseChapter;
    var afterStoreCall = callback._afterStore;
    var singleFavLen = 0;
    return function (favs, allFavs, updateNum) {
        singleFavLen = favs.length;
        var completeCall = function (htmlText) {
            var col = favs[singleFavLen];
            try {
                var resObj = callback(htmlText);
                var newUrl = resObj.newUrl,
                    newChapter = resObj.newChapter;
                if (col.newChapter !== newChapter) {
                    col.newChapter = newChapter;
                    col.newUrl = newUrl;
                    //生成提示
                    getStoreLocal(STOR_KEY_IS_CLOSE_TIPS, (function (baseImage, col, newChapter, baseChatper, newUrl) {
                        return function (isCloseTips) {
                            if (!isCloseTips)
                                createNotify(col.title, formatHref(col.imgUrl, baseImage), '更新到: ' + newChapter, baseChapter + newUrl);
                        }
                    })(baseImage, col, newChapter, baseChapter, newUrl));

                    if (!col.isUpdate) {
                        col.isUpdate = true;
                        ++updateNum;
                    }

                    storLocal.set({
                        updateNum: updateNum,
                        allFavs: allFavs
                    });
                }
            } catch (e) {
                log(e);
            }
            nextHandler();
        };
        var nextHandler = function () {
            if (--singleFavLen < 0) {
                if (afterStoreCall instanceof Function) {
                    afterStoreCall();
                } else {
                    setBadge(updateNum);
                }
            } else {
                getIndexContent(formatHref(favs[singleFavLen].indexUrl, baseIndex), wayFlag, completeCall);
            }
        };
        nextHandler();
    }
}

/**
 * 替换origin
 */
function replaceOrigin(url, newOrigin) {
    var restArgs = newOrigin.split('/');
    var urlArr = url.split('/');
    restArgs.unshift(0, 3);
    [].splice.apply(urlArr, restArgs);
    return urlArr.join('/');
}

/**
 * 创建提醒
 */
function createNotify(title, iconUrl, message, newUrl) {
    var options = {
        type: chrome.notifications.TemplateType.BASIC,
        title: title,
        iconUrl: iconUrl,
        isClickable: true,
        buttons: [
            {title: '打开', iconUrl: cGetUrl('images/notification-buttons/ic_flash_auto_black_48dp.png')},
            {title: '已读', iconUrl: cGetUrl('images/notification-buttons/ic_exposure_plus_1_black_48dp.png')}],
        message: message
    };
    chrome.notifications.create(newUrl, options);
}

/**
 * 创建toast提醒
 */
function showTips(msg, time) {
    var $div = $('<div>');
    time = time ? time : TIME_SHORT;
    $div.text(msg);
    var width = window.innerWidth,
        height = window.innerHeight;
    $div.css({
        position: 'fixed',
        padding: '20px',
        top: height / 2 - 40,
        left: width / 2 - 40,
        'font-size': '18px',
        'z-index': 999,
        background: 'black',
        color: 'white'
    });
    $('body').append($div);
    setTimeout(function () {
        $div.remove();
    }, time);
}

/**
 * 处理响应数据
 */
function handleResData(data) {
    log('handleResData', data);
    var status = data.status;
    if (status === STATUS_OK) {
        //更新当前页面收藏的图标
        if (_updateCurFavFun) _updateCurFavFun();
        showTips('操作成功');
        return;
    } else if (status === STATUS_UNAUTH) {
        showTips('请先登录');
    } else if (status === STATUS_EXPORT_FAIL) {
        var str = '';
        for (var i = 0, len = data.msg.length; i < len; i++) {
            str += ' 《' + data.msg[i] + '》 ';
        }
        showTips('导出失败,请手动添加：' + str, TIME_LONG);
        //更新当前页面收藏的图标
        if (_updateCurFavFun) _updateCurFavFun();
    }
}

/**
 * 根据决定条件决定是否执行导出函数，如果执行则将导出的漫画存储在本地中
 * extra需要从datas中带入到handlefun中的数据的字段的名称
 */
function pipeExport(dataArg, handleFun, resSend) {
    var site = dataArg.site, datas = dataArg.datas, type = dataArg.type;
    var storObj = getBaseStoreObj(site),
        baseImgUrl = storObj.baseImg,
        baseIndexUrl = storObj.baseIndex,
        baseChapter = storObj.baseChapter,
        origin = storObj.origin;
    var resObj = {status: STATUS_OK, msg: []};
    var indexSucCall = function (cols, colItem, args) {
        return function (text) {
            var obj = handleFun(text, resSend, args);
            if (obj.status !== STATUS_OK) {
                resObj.status = STATUS_EXPORT_FAIL;
                resObj.msg.push(obj.msg);
                return;
            }
            //处理数据格式
            var newUrl = obj.newUrl, curUrl = obj.curUrl;
            if (newUrl.search('^https?://') < 0) {
                newUrl = replaceOrigin(newUrl, origin).replace(baseChapter, '');
                curUrl = replaceOrigin(curUrl, origin).replace(baseChapter, '');
            } else {
                newUrl = newUrl.replace(baseChapter, '');
                curUrl = curUrl.replace(baseChapter, '');
            }
            obj.newUrl = newUrl;
            obj.curUrl = curUrl;
            obj.imgUrl = obj.imgUrl ? obj.imgUrl.replace(baseImgUrl, '') : undefined;
            obj.isUpdate = false;

            var index = arrEqStr(cols, {title: obj.title});
            if (index < 0) {
                assignColItem(obj, colItem);
                cols.unshift(colItem);
            }
        }
    }
    getFavs(site, type, function (cols, allFavs) {
        log('datas', datas);
        for (var i = 0, len = datas.length; i < len; i++) {
            var item = datas[i];
            var index = arrEqStr(cols, {title: item.title});
            //当收藏中没有该漫画时才添加
            if (index < 0) {
                var colItem = assignColItem(item);
                $.ajax(formatHref(item.indexUrl, baseIndexUrl), {
                    success: indexSucCall(cols, colItem, item),
                    async: false
                });
            }
        }
        storLocal.set({
            allFavs: allFavs
        });
        resSend(resObj);
    });
}

/**
 * 将对象中关于收藏的数据更新到收藏对象中
 */
function assignColItem(obj, colItem) {
    colItem = colItem ? colItem : {};
    colItem.isUpdate = obj.isUpdate !== undefined ? obj.isUpdate : colItem.isUpdate;
    colItem.newUrl = obj.newUrl !== undefined ? obj.newUrl : colItem.newUrl;
    colItem.curUrl = obj.curUrl !== undefined ? obj.curUrl : colItem.curUrl;
    colItem.newChapter = obj.newChapter !== undefined ? obj.newChapter : colItem.newChapter;
    colItem.curChapter = obj.curChapter !== undefined ? obj.curChapter : colItem.curChapter;
    colItem.imgUrl = obj.imgUrl !== undefined ? obj.imgUrl : colItem.imgUrl;
    colItem.indexUrl = obj.indexUrl !== undefined ? obj.indexUrl : colItem.indexUrl;
    colItem.title = obj.title !== undefined ? obj.title : colItem.title;
    return colItem;
}

/**
 * 转换html编码
 * @param url
 * @param originCode
 * @returns {string}
 */
function htmlDecode(url, originCode, completeCall) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (oEvent) {
        var arrayBuffer = xhr.response; // Note: not oReq.responseText
        try {
            var text = iconv.decode(buffer.Buffer.from(arrayBuffer), originCode);
            // text = iconv.encode(text, 'utf-8');
            completeCall(text);
        } catch (e) {
            console.warn(e);
        }
    };
    xhr.send(null);
}

/**
 * 替换html编码通过iframe的形式，异步方案
 * @param url
 * @param sucCall
 */
function htmlDecodeByFrame(url, sucCall) {
    var $iframe = $('#indexInfoFrame'), frElm;
    if ($iframe.length === 0) {
        $iframe = $('<iframe id="indexInfoFrame" style="display:none;" hidden></iframe>');
    }
    $iframe.attr('src', url);
    frElm = $iframe.get(0);
    frElm.onload = function (e) {
        var textHtml = frElm.contentWindow.document.body.innerHTML;
        log('iframe', textHtml);
        sucCall(textHtml);
    };
    $('body').append($iframe);
}

/**
 * 获取index页面的内容
 */
function getIndexContent(indexUrl, wayFlag, completeCall) {
    if (typeof wayFlag !== 'object') {
        $.ajax(indexUrl, {
            async: true,
            timeout: 1500,
            complete: function (data){
                completeCall(data.responseText);
            }
        });
    } else {
        htmlDecode(indexUrl, wayFlag.originCode, completeCall);
    }
}

/**
 * 获取index内容通过iframe的形式
 * @param indexUrl
 * @param wayFlag
 * @param sucCall
 */
function getIndexContentByFrame(indexUrl, wayFlag, sucCall) {
    if (typeof wayFlag !== 'object') {
        $.ajax(indexUrl, {
            async: true,
            success: sucCall
        });
    } else {
        htmlDecodeByFrame(indexUrl, sucCall);
        // retText = htmlDecode(indexUrl, wayFlag.originCode);
    }
}

/**
 * 格式化href
 * @param href
 */
function formatHref(href, baseHref) {
    var retHref;
    var index = href.search('^https?://');
    if (index < 0) {
        //如果href不是http打头，那么应该为 //www.xx.com/dd 这样的形式
        if (!baseHref) retHref = 'http:' + href;
        else {
            href = baseHref + href;
            index = href.search('^https?://');
            if (index < 0) retHref = 'http:' + href;
            else retHref = href;
        }
    } else {
        retHref = href;
    }
    return retHref;
}

/**
 * 存储消抖函数
 */
var storeDebounce = function (obj, func) {
    var storeDebounceTimeout;
    storeDebounce = function (obj, func) {
        if (storeDebounceTimeout) {
            clearTimeout(storeDebounceTimeout);
        }
        storeDebounceTimeout = setTimeout(function () {
            chrome.storage.local.set(obj, func);
        }, 500);
    };
    storeDebounce(obj, func);
};

/**
 * 发送通知到全部的tab页
 * @param data
 */
function sendToAllTabs(data) {
    chrome.windows.getAll(null, function (wins) {
        for (var i = 0, len = wins.length; i < len; i++) {
            var win = wins[i];
            chrome.tabs.query({windowId: win.id}, function (tabs) {
                for (var i = 0, len = tabs.length; i < len; i++) {
                    var tab = tabs[i];
                    chrome.tabs.sendMessage(tab.id, data);
                }
            });
        }
    });
}

/**
 * 发送通知到当前tab页
 * @param data
 * @param handler
 */
function sendToCurTab(data, handler) {
    chrome.tabs.query({active: true}, function (tabs) {
        var tab = tabs[0];
        handler = handler || function () {
        };
        chrome.tabs.sendMessage(tab.id, data, null, handler);
    });
}
