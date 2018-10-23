import LocalStore from '../../utils/LocalStore';
import Constant from '../../constant';
import {formatHref} from '../../utils/ExtUtil';
import {arrEqObj, getItemByEqObj} from '../../utils/ArrayUtil';

const state = {
    favs:[],
    favChecks:[], //放置收藏check的数组
};

const {STOR_KEY_FAVS,CUR_FAV,TYPE_VIDEO,TYPE_FICTION,TYPE_COMIC} = Constant;

const mutations = {
    query(state,arr) {
        state.favs.splice(0,state.length,...arr);
        console.log('state',state);
    },
    markRead(state,payload){
        let {favs} = state;
        let {type,siteName,origin,title} = payload;
        let favItem = getItemByEqObj(favs,{type,siteName,origin});
        let cols = favItem.cols;
        //我认为同一个站点下的同一个类型不存在两个同名作品。
        let col = getItemByEqObj(cols,{title});
        col.isUpdate = false;
    },
    delCol(state,payload){
        let {favs} = state;
        let {type,siteName,origin,title} = payload;
        let favItem = getItemByEqObj(favs,{type,siteName,origin});
        let cols = favItem.cols;
        //我认为同一个站点下的同一个类型不存在两个同名作品。
        let index = arrEqObj(cols,{title});
        cols.splice(index,1);
    },
    toggleFavCheck(state,index){
        let {favChecks} = state;
        favChecks[index] = !favChecks[index];
        state.favChecks = [...favChecks];
    },
    invertFavCheck(state,cnt){
        let {favChecks} = state;
        for(let i=0;i<cnt;i++){
            favChecks[i] = !favChecks[i];
        }
        state.favChecks = [...favChecks];
    }
};

const actions = {
    async queryFav({commit, state}) {
        let arr = await LocalStore.load(STOR_KEY_FAVS);
        //当没有保存任何数据时，返回的是空对象
        if(!arr || (arr && !arr.length)){
            arr = [];
        }
        commit('query', arr);
    },
    async markRead({commit,state},payload){
        commit('markRead',payload);
        await LocalStore.save(STOR_KEY_FAVS,state.favs);
    },
    async delCol({commit,state},payload){
        //先标为已读，再删除
        commit('markRead',payload);
        commit('delCol',payload);
        await LocalStore.save(STOR_KEY_FAVS,state.favs);
    },
    toggleFavCheck({commit},index){
        commit('toggleFavCheck',index);
    },
    invertFavCheck({commit,getters}){
        let {displayFavs} = getters;
        commit('invertFavCheck',displayFavs.length);
    }
};

//getters
const getters = {
    displayFavs(state,getters,rootState){
        console.log('getters',getters);
        let type = undefined;
        let {favs:allFavs} = state;
        let {ui:{searchText,curFavType}} = rootState;
        switch (curFavType) {
            case CUR_FAV.COMIC:
                type = TYPE_COMIC;
                break;
            case CUR_FAV.FICTION:
                type = TYPE_FICTION;
                break;
            case CUR_FAV.VIDEO:
                type = TYPE_VIDEO;
                break;
        }
        let cols = [];//计算当前数目
        for (let i = 0, len = allFavs.length; i < len; i++) {
            let favItem = allFavs[i],
                colItems = favItem.cols ? favItem.cols : [],
                baseChapter = favItem.baseChapter,
                baseIndex = favItem.baseIndex,
                baseImg = favItem.baseImg;
            let tmpArr = [];

            if (type && type !== favItem.type) continue;
            for (let j = 0, len2 = colItems.length; j < len2; j++) {
                let item = colItems[j],obj = Object.assign({},item);
                obj.indexUrl = formatHref(item.indexUrl, baseIndex);
                obj.imgUrl = formatHref(item.imgUrl, baseImg);
                obj.curUrl = formatHref(item.curUrl, baseChapter);
                obj.newUrl = formatHref(item.newUrl, baseChapter);
                obj.type = favItem.type;
                obj.siteName = favItem.siteName;
                obj.origin = favItem.origin;
                if(searchText && item.title.indexOf(searchText) < 0) continue;
                tmpArr.push(obj);
            }
            cols = cols.concat(tmpArr);
        }
        return sortFavItems(cols);
    }
};


/**
 * 排序显示收藏项
 * @returns {*[]}
 */
function sortFavItems(cols) {
    //按照阅读的时间进行降序排序
    cols.sort(function (obj1, obj2) {
        let val1 = obj1.timestamp ? obj1.timestamp : 0;
        let val2 = obj2.timestamp ? obj2.timestamp : 0;
        return val2 - val1;
    });
    //有更新的排在前头
    let tmpArr1 = [],tmpArr2 = [];
    for(let i=0,len=cols.length;i<len;i++){
        let c = cols[i];
        if(c.isUpdate) {
            tmpArr1.push(c);
        }else{
            tmpArr2.push(c);
        }
    }
    return tmpArr1.concat(tmpArr2);
}


export default {
    state,
    mutations,
    actions,
    getters
};
