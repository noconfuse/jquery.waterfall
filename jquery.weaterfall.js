/*
* created by baolei on 2018/5/1
* @version 0.0.1 created
* */
;(function(root,factory,plug){
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory :
        typeof define === 'function' ? typeof define.amd !== define(factory) :
            factory.call(root, jQuery, plug)
})(window,function($,plug){
    var win = $(window);
    var __DEFES__ = {
        layout:{
            col:3,
            space:20
        },
        contentBase:win,
        dataSource:{
            step:10,
            offset:0,
            template:"<img src=${url}>"
        }
    };
/*
*  @param opts
*     contentBase: the scroll element which trigger load more
*     @layout: the waterfall layout
*           space: the space between two elements
*           col: the columns of waterfall layout
*     @dataSource: the data source of elements support static array data and ajax.you can define any options in dataSource and if you want to
*     send them to back-end out of get request,you can make them inline in the url like this:
*      "/getList?offset=${offset}&step=${step}".the "offset" is built-in attribute,it represent the start index of the data you want.
*     the POST method
*           data: the static data array
*           read: the ajax url
*           step: the count per step
* */
    function Waterfall(element,options){
        this.me = $(element);
        this.settings = $.extend(true,{},__DEFES__,options);
        this.isAllowLoad = false;
        this.__DATA__ = {//store layout info
            heightArr:[],
            widthArr:[]
        };
        this.ds = this.settings.dataSource;
        if(!this.ds){
            console.error("must have a data source");
            return
        }
        this.init();
    }
    Waterfall.prototype = {
        constructor:Waterfall,
        init:function(){
            this.loadItems();
            this.scroll();
        },
        loadItems:function(){
            var $this = this;
            var readHandle = this.ds.read,
                step = parseInt(this.ds.step),
                offset = parseInt(this.ds.offset);
            if(this.ds.data){
                var data = [].concat(ds.data).slice(offset,this.settings.dataSource.offset += step);
                $this.render(data)
            }else if(readHandle){
                if(typeof readHandle === 'function'){
                    //todo 传入内置参数
                    readHandle()
                }else if(typeof readHandle==='string'){
                    readHandle.match(/\$\{.+?\}/g).forEach(function(item,i){
                        var result = eval(item.replace(/\$|\{|\}/g,""))
                        readHandle = readHandle.replace(item,result)
                    });
                    $.ajax({
                        url:readHandle,
                        type:"GET",
                        dataType:"json",
                        success:function(data){
                            $this.settings.dataSource.offset = offset+step;
                            //渲染页面
                            if(data.code==1){
                                $this.render(data.data)
                            }
                        },
                        error:function(xhr,textStatus,errorThrown){
                            console.log(textStatus);
                            console.log(errorThrown);
                        }
                    })
                }
            }else{
                console.error("have no data");
            }
        },
        scroll:function(){
            var $this = this,
                me = this.me,
                conBase = this.settings.contentBase;
            if(!conBase.length){
                console.warn("the contentBase is either a valid jquery dom or a object");
                return;
            }
            if(conBase.context == document){
                if(!$.contain(conBase[0],this.me[0])){
                    console.warn("the contentBase must the parents node");
                    return;
                }
            }
            conBase.on('scroll',function(){
                var _this = $(this);
                var timer = setTimeout(function(){
                    if(timer&&!$this.isAllowLoad) {
                        clearTimeout(timer);
                        return;
                    }
                    var vEleHt = _this.height();
                    var conH = me.outerHeight(),
                        conT = me.offset().top;
                    if(!$this[0] instanceof Window){
                        var vEleT = _this.offset().top
                        if(vEleHt>conT-vEleT+conH){
                            if($this.isAllowLoad){
                                $this.isAllowLoad = false;
                                $this.loadItems();
                            }
                        }
                    }else{
                        var VEleSt = _this.scrollTop();
                        if(vEleHt+VEleSt>conH+conT){
                            if($this.isAllowLoad) {
                                $this.isAllowLoad = false;
                                $this.loadItems()
                            }
                        }
                    }
                },300)
            })
        },
        setLayout:function(opts){
            this.settings = $.extend(this.settings,{layout:opts});
            //todo change layout
            var col = this.settings.layout.col,
                space = this.settings.layout.space;
            var colWidth = parseInt((this.me.width()-15+space)/col-space);
            //reset the layout
            this.__DATA__ = {
                heightArr:[],
                widthArr:[]
            };
            var $this = this;
            this.me.children().forEach(function(item,i){
                var $item = $(item),
                    widthArr = $this.__DATA__.widthArr,
                    heightArr = $this.__DATA__.heightArr;
                var marginLeft = (i+1)%col==1?0:space;
                $item.css('width',colWidth);
                if(widthArr.length!==col){
                    $item.css({
                        'float':'left',
                        'marginLeft':marginLeft
                    });
                    widthArr[i] = item[0].offsetLeft;
                    heightArr[i] = item.height()
                }else{
                    var minHeight = Math.min(heightArr),
                        minIndex = heightArr.indexOf(minHeight);
                    $item.css({
                        'position':"absolute",
                        "left":widthArr[minIndex],
                        "top":minHeight+space
                    })
                }
            })
        },
        render:function(data){
            if(!data.length){
                console.warn("no data");
                return
            }
            var $this = this,
                heightArr = $this.__DATA__.heightArr,
                widthArr = $this.__DATA__.widthArr;
            var layout = this.settings.layout,
                col = layout.col,
                space = layout.space;
            var funArr = [];
            var colWidth = parseInt((this.me.width()-15+space)/col-space);//the width of one element
            //too complex
            [].concat(data).forEach(function(odata,index){
                var compute = (function(o,i){
                    return function(){
                        if($this.lastItem){
                            /*
                                保存上一个项目加载完成的高度值
                            */
                            if(heightArr.length!==col){
                                heightArr[i-1] = $this.lastItem.height()+space;
                            }else {
                                var minHeight = Math.min.apply(null,heightArr);
                                var minIndex = heightArr.indexOf(minHeight);
                                heightArr[minIndex] += $this.lastItem.height()+space;
                            }
                        }
                        var dfd = $.Deferred();
                        var time = new Date().getTime();
                        var marginLeft = (i+1)%col==1?0:space;
                        var temp = $this.ds.template;
                        //compile template
                        temp.replace(/\s/g,'').match(/\$\{.+?\}/g).forEach(function(str,idx){
                            var key = str.replace(/\$|\{|\}/g,"");
                            temp = temp.replace(str,o[key])
                        });
                        var item = $('<div></div>').css({
                            width:colWidth,
                            float:"left"
                        }).append($(temp));
                        item.find('img').css('width',"100%").addClass(i+'-'+time);
                        $this.me.append(item);
                        //定位
                        if(widthArr.length!== col) {
                            item.css('marginLeft',marginLeft);
                            widthArr[i] = item[0].offsetLeft;
                        }else {//超出一行，进行绝对定位
                            var minHeight = Math.min.apply(null,heightArr);
                            var minIndex = heightArr.indexOf(minHeight);
                            item.css({
                                position:'absolute',
                                left:widthArr[minIndex],
                                top: minHeight
                            })
                        }
                        $this.lastItem = item;
                        var timer = setInterval(function(){
                            if($('.'+i+'-'+time).height()!==0){//图片加载完成
                                clearInterval(timer);
                                dfd.resolve();
                            }
                        },200);
                        return dfd.promise();
                    }
                })(odata,index)
                funArr.push(compute)
            });
            function queue(funArr){
                if(funArr.length > 0){
                    $.when(funArr.shift()()).done(function(){
                        queue(funArr)
                    })
                }else {
                    $this.isAllowLoad = true;//允许再次加载
                    $this.me.css({
                        height: Math.max.apply(null,heightArr)
                    });
                    return;
                }
            }
            queue(funArr)
        }
    }
    $.fn[plug] = function(opts){
        return this.each(function(){
            new Waterfall(this,opts)
        })
    }
},"waterfall");