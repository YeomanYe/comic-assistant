var _$imgAss,_$imgExport,_$imgToggle;
var curHref = location.origin + location.pathname;
var storLocal = chrome.storage.local;
var _src = {
    collect:cGetUrl('images/collect.png'),
    collectGrey:cGetUrl('images/collect-grey.png'),
    exportCollect:cGetUrl('images/export-collect.png'),
    comicGrey:cGetUrl('images/comic-grey.png'),
    comic:cGetUrl('images/comic.png')
};
var _updateCurFavFun;
//获取基本信息
var origin = location.origin,
    storObj = getBaseStoreObj(origin);
if(storObj){
    var baseImgUrl = storObj.baseImg,
        baseChapterUrl = storObj.baseChapter,
        baseIndexUrl = storObj.baseIndex;
}
chrome.runtime.onMessage.addListener(function(msgArr,msgSenderObj,resSend) {
    switch (msgArr[0]) {
        case CNT_CMD_UPDATE_CUR_FAV:
            if(_updateCurFavFun) _updateCurFavFun();
            break;
      case CNT_CMD_EXOPORT_FAV:
            exportFav();
          break;
    }
    return true;
});
//创建按钮
function createBtn(){
    var $ul = $('<ul>');
    $ul.addClass('img-list');
    $ul.attr({draggable:true});
    _$imgExport = addImgToUL($ul,_src.exportCollect,null,'导出网站中收藏的漫画到插件中');
    _$imgToggle = addImgToUL($ul,_src.collectGrey,null,'收藏');
    _$imgAss = addImgToUL($ul,_src.comicGrey,toggleMenu,'切换菜单');
    _$imgExport.toggle();
    _$imgToggle.toggle();
    var left = $(window).width() - 120,top = $(window).height() - 150;
    $ul.drag();
    // setDraggable($ul);
    $ul.css({top:top+'px',left:left+'px'});
    $('body').append($ul);
}
//给ul列表中加入一个图片
function addImgToUL($ul,srcStr,clickHandler,title){
    var $li = $('<li>'),$img = $('<img>');
    $img.addClass('fab-img');
    $img.get(0).src = srcStr;
    $img.get(0).title = title;
    if(clickHandler) $img.on('click',clickHandler);
    $li.append($img);
    $ul.append($li);
    return $img;
}
/*jquery拖动插件*/
$.fn.extend({
    /**
     *   Autor: 博客园华子yjh 2014/02/21
     */
    drag: function(options) {
        var dragStart, dragMove, dragEnd,
            $boundaryElem, limitObj;

        function _initOptions() {
            var noop = function(){}, defaultOptions;

            defaultOptions = { // 默认配置项
                boundaryElem: 'body' // 边界容器
            };
            options = $.extend( defaultOptions, options || {} );
            $boundaryElem = $(options.boundaryElem);

            dragStart = options.dragStart || noop,
                dragMove = options.dragMove || noop,
                dragEnd = options.dragEnd || noop;
        }

        function _drag(e) {
            var clientX, clientY, offsetLeft, offsetTop,
                $target = $(this), self = this;

            limitObj = {
                _left: 0,
                _top: 0,
                _right: ($boundaryElem.innerWidth() || $(window).width()) - $target.outerWidth(),
                _bottom: ($boundaryElem.innerHeight() || $(window).height()) - $target.outerHeight()
            };

            // 记录鼠标按下时的位置及拖动元素的相对位置
            clientX = e.clientX;
            clientY = e.clientY;
            offsetLeft = this.offsetLeft;
            offsetTop = this.offsetTop;

            dragStart.apply(this, arguments);
            $(document).bind('mousemove', moveHandle)
                .bind('mouseup', upHandle);

            // 鼠标移动事件处理
            function moveHandle(e) {
                var x = e.clientX - clientX + offsetLeft;
                var y = e.clientY - clientY + offsetTop;

                $target.css({
                    left: Math.max( Math.min(x, limitObj._right),  limitObj._left) + 'px',
                    top: Math.max( Math.min(y, limitObj._bottom),  limitObj._top) + 'px'
                });

                dragMove.apply(self, arguments);
                // 阻止浏览器默认行为(鼠标在拖动图片一小段距离，会出现一个禁止的小提示，即：图片不能再拖动)
                e.preventDefault();
            }

            // 鼠标弹起事件处理
            function upHandle(e) {
                $(document).unbind('mousemove', moveHandle);
                dragEnd.apply(self, arguments);
                //阻止默认行为
                e.preventDefault();
            }
        }

        _initOptions(); // 初始化配置对象

        $(this)
            .css({ position: 'fixed' })
            .each(function(){
                $(this).bind('mousedown', function(e){
                    _drag.apply(this, [e]);
                    // 阻止区域文字被选中 for chrome firefox ie9
                    e.preventDefault();
                    // for firefox ie9 || less than ie9
                    window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
                });
            });
        return this;
    }
});
/**
 * 切换菜单图标
 */
function toggleMenu(){
    var imgElm = _$imgAss.get(0);
    if(imgElm.src === _src.comicGrey){
        imgElm.src = _src.comic;
    }else{
        imgElm.src = _src.comicGrey;
    }
    _$imgExport.toggle();
    _$imgToggle.toggle();
}
/**
 * 收藏或取消收藏
 * wayFlag 获取方式
 */
function toggleFav(storObj, getCurIndex, getChapterInfo,wayFlag) {
    var baseImgUrl = storObj.baseImg,
        baseIndexUrl = storObj.baseIndex,
        baseChapterUrl = storObj.baseChapter;
    // var tmpObj = getCurIndex();

    return function(favs, allFavs) {
        var handle = function (indexObj) {
            var title = indexObj.title,
                indexUrl = indexObj.indexUrl,
                curUrl = indexObj.curUrl,
                curChapter = indexObj.curChapter;
            var index = arrEqStr(favs, {title:title});
            //已经收藏，则取消收藏
            if (index >= 0) {
                var item = favs[index];
                decUpdateNum(item);
                favs.splice(index, 1);
                storLocal.set({
                    [STOR_KEY_FAVS]: allFavs
                });
                _$imgToggle.attr('src',_src.collectGrey);
                showTips('取消收藏成功');
                //通知全部tab页面更新图标
                sendMsg(null,[BG_CMD_UPDATE_FAV_BTN]);
                return;
            }
            //未收藏，则收藏
            var sucCall = function(text) {
                //获取章节与图片信息
                var obj = getChapterInfo(text);
                curChapter = curChapter ? curChapter : obj.curChapter;
                curUrl = curUrl ? curUrl : obj.curUrl;
                var imgUrl = obj.imgUrl ? obj.imgUrl : '';
                var col = {
                    imgUrl: imgUrl.replace(baseImgUrl, ''),
                    indexUrl: indexUrl.replace(baseIndexUrl, ''),
                    newChapter: obj.newChapter,
                    curChapter: curChapter,
                    newUrl: obj.newUrl.replace(baseChapterUrl, ''), //最新章节地址
                    curUrl: curUrl.replace(baseChapterUrl, ''), //当前章节地址
                    title: title,
                    isUpdate: false
                };
                favs.unshift(col);
                chrome.storage.local.set({
                    [STOR_KEY_FAVS]: allFavs
                });
                //通知全部tab页面更新图标
                sendMsg(null,[BG_CMD_UPDATE_FAV_BTN]);
                _$imgToggle.attr('src',_src.collect);
                showTips('收藏成功');

            };
            getIndexContentByFrame(indexUrl,wayFlag,sucCall);
        };
        if(typeof wayFlag === 'object') getCurIndex(handle);
        else handle(getCurIndex());
    }
}

/**
 * 导出收藏
 */
function exportFav() {
  storLocal.get([STOR_KEY_FAVS, STOR_KEY_UPDATE_NUM], function (resObj) {
    log('export obj', resObj);
    var blob = new Blob([JSON.stringify(resObj)], {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, '追综饭.json');
  })
}
