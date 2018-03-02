var _allFavs; //全部收藏的漫画集合
var _includeArr = ['kuaikan']; //当URL匹配字符串时才调用
var storSync = chrome.storage.sync;
var $_imgAss;
//获取收藏的漫画集合
storSync.get('allFavs',function(storObj){
    _allFavs = storObj.allFavs;
});
$(function() {
    var origin = location.origin;
    if(arrInStr(_includeArr,origin)<0) return;
    $_imgAss = $('<img>');
    $_imgAss.addClass('fab-img');
    $_imgAss.get(0).src = chrome.runtime.getURL('images/comic.png');
    $('body').append($_imgAss);
});

function randArr(n){
    if(n>30) return console.log('n is too large');
    var tmpArr = [],retArr = [];
    for(var i=1;i<31;i++){
        tmpArr.push(i);
    }
    do{
        var len = tmpArr.length;
        var index = Math.floor(Math.random()*len);
        retArr.push(tmpArr[index])
        tmpArr.splice(index,1);
    }while(--n);
    return retArr;
}