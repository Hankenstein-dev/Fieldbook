/*
	Aviso: o código está caótico e confusamente escrito.
*/
var NSPP=4500;
var wiki=false;
var nivelutilizador=0;
var metricas={contheight:null
	,quadcolwid:(154*1)+0
	,quadcolsup:270+4
	,quadrowhei:(204*1)+0
	,quadrowsup:22+38
	,fotobanchead:24		// altura do titulo da fotobanc
	,botaoaddcol:0
	};
//var jaavisou1=false;
var quadro=new Object();
var cmp=new Object();		//guarda um quadro comparativo completo (independente do ecran)
cmp.linhas=new Array();
cmp.ids=new Array();
var orgaos=null;
var basicorgans=[4,7,2,1,5,6];
var leftState=[0,0];
var leftwidths=[166,166];
//quadro.orgaos=[4,2,1,5,6];
//quadro.linhas=new Array();
quadro.orgaos=[];//basicorgans.slice(0);
quadro.ids=new Array();
quadro.nomes=new Array();
var select={o:0,f:0,g:0,e:0};
var tooltipcount=0;
var sugtimeout,leftTimeout,introTimeout,fotosdiaTimeout;
var mapwebgis=null;
var drawnItems=null;
var webgisdrawControl=null; // toolbar for drawing polyogns for WKT search 
var drawHandler=null;       // draw polygon for WKT search
var mapdistr=null;
var mappessoal=null;
var localizador=null;
var minutmx,maxutmy,ladoquad,utmzone,maxutmx,minutmy;
var latlngbnd_leaf;
var markers=[],prevmarkers=[],registos=[];
var allregs=null,contadorhover=0;
var externalChangeDormancy=null;
var territorio, subdomain;
var osdViewer=null;
var bgPhotoLegends=null;

/********* MAPAS *************/
//var highlightQuadStyle={fillColor:'orange',fillOpacity:1,zIndex:10,visible:true,strokeWeight:3,strokeColor:'#000',strokeOpacity:1};//85f
var quadricula=[],limitept=[],maptype,layers=[];
var highlightQuadStyle={fillColor:'orange',fillOpacity:1,zIndex:10,weight:3,color:'#000',opacity:1};//85f
var bemvindowebsig=false;
var quirks=false;

var Esri_WorldShadedRelief = [
	L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri',
		maxZoom: 13
	}),
	L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri',
		maxZoom: 13
	}),
	L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri',
		maxZoom: 13
	})];

/*var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});*/

var Esri_WorldImagery = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

var OpenStreetMap_DE = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
});

/*var Nokia_satelliteYesLabelsDay = [
	L.tileLayer('https://{s}.maptile.lbs.ovi.com/maptiler/v2/maptile/newest/hybrid.day/{z}/{x}/{y}/256/png8?token={devID}&app_id={appID}', {
		attribution: 'Map &copy; <a href="http://developer.here.com">Nokia</a>, Data &copy; NAVTEQ 2012',
		subdomains: '1234',
		devID: 'xyz',
		appID: 'abc'
	}),
	L.tileLayer('https://{s}.maptile.lbs.ovi.com/maptiler/v2/maptile/newest/hybrid.day/{z}/{x}/{y}/256/png8?token={devID}&app_id={appID}', {
		attribution: 'Map &copy; <a href="http://developer.here.com">Nokia</a>, Data &copy; NAVTEQ 2012',
		subdomains: '1234',
		devID: 'xyz',
		appID: 'abc'
	})	
];*/

var layerDescription=L.Control.extend({
	initialize: function (options) {
        L.Util.setOptions(this, options);
    },
    onAdd: function (map) {
    	return($('<div id="camadavisivel"><span style="color:orange;font-weight:bold">Está a ver:</span> <span class="content"></span></div>')[0]);
    }
});

var toolBar=L.Control.extend({
	initialize: function (buttons,links,titles,options) {
        L.Util.setOptions(this, options);
        this.buttons=buttons;
        this.links=links;
        this.titles=titles;
    },
    onAdd: function (map) {
    	var str='';
    	for(var i=0;i<this.buttons.length;i++) {
    		str+='<div class="button"><a href="#wid'+this.links[i]+'"><img src="images/'+this.buttons[i]+'.png" title="'+this.titles[i]+'"/></a></div>';
    	}
    	return($('<div class="toolbar">'+str+'<p style="clear:both"/></div>')[0]);
    }
});

var layerList=L.Control.extend({
	initialize: function (baselayers,overlays,options) {
        L.Util.setOptions(this, options);
        this.baselayers=baselayers;
        this.overlays=overlays;
    },
    onAdd: function (map) {
    	var str=$('<div class="menu"><div class="back"></div><div class="content"></div></div>');
		var el;
		var bl=this.baselayers;
		var ov=this.overlays;
		var foi=false;
		var hr=false;
    	for(var key in bl) {
    		el=$('<li><label><input type="radio" name="baselayer" '+(foi ? '' : 'checked')+' value="'+key+'"/>'+key+'</label></li>');
    		foi=true;
    		el.find('input').change(function() {
    			for(var key in bl) {
					if(key!=$(this).val()) {
						if(mapwebgis.hasLayer(bl[key])) mapwebgis.removeLayer(bl[key]);
					}
    			}
    			if(isArray(bl[$(this).val()])) {
    				for(var i=0;i<bl[$(this).val()].length;i++) {
	    				mapwebgis.addLayer(bl[$(this).val()][i]);
    				}			
    			} else mapwebgis.addLayer(bl[$(this).val()]);
    		});
    		str.find('.content').append(el);
    	}
    	
    	for(var key in ov) {
    		if(!hr) {
	    		str.find('.content').append('<hr/>');
	    		hr=true;
    		}
    		el=$('<li><label><input type="checkbox" name="baselayer" '+(foi ? '' : 'checked')+' value="'+key+'"/>'+key+'</label></li>');
    		
    		el.find('input').change(function() {
    			if($(this).attr('checked')) mapwebgis.addLayer(layers[ov[$(this).val()]]); else {unHighlightLayer(ov[$(this).val()]);mapwebgis.removeLayer(layers[ov[$(this).val()]]);}
    		});
    		str.find('.content').append(el);
    	}  
    	str.click(function(ev) {ev.stopPropagation();});
    	str.find('.back').css({opacity:0.5});
    	return(str[0]);
    }
});


var ie = (function(){
    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');

    while (
        div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
        all[0]
    );
    return v > 4 ? v : undef;
}());

L.Control.prototype._refocusOnMap = function _refocusOnMap(ev) {
    // if map exists and event is not a keyboard event
    if (this._map && ev && ev.screenX > 0 && ev.screenY > 0) {
        this._map.getContainer().focus({ preventScroll: true });
    }
};

var chars=['0','1','2','3','4','5','6','7','8','9','_','-','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
	'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

var accents={};accents.map={"á":"a","à":"a","â":"a","ã":"a","é":"e","ê":"e","í":"i","ó":"o","õ":"o","ô":"o","ú":"u","ç":"c"};
//String.prototype.removeAccents=function(){return this.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return accents.map[a]||a})};
String.prototype.prepareString=function(){return encodeURIComponent(this).toLowerCase().replace(/%20/gi,'+').replace(/%2c/gi,'*');};
String.prototype.unprepareString=function(){return decodeURIComponent(this.replace('+',' ').replace('*',','));};

// This is just for scrolling inside query results
function scrollToTargetAdjusted(element) {
	var parentEl = document.getElementById('se-pesquisar');
    var elementPosition = element.getBoundingClientRect().top;
    var offsetPosition = elementPosition + parentEl.scrollTop - document.getElementById('orderby-bar').getBoundingClientRect().height;
  
    parentEl.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
    });
}

function encode64bin(bin) {
	if(bin.length%6!=0) {	// pad to 6-bit
		for(var delta=(6-bin.length%6);delta>0;delta--) bin=bin+'0';
	}
	var i=0;
	var out='';
	do {
		out=out+chars[parseInt(bin.substr(i,6),2)];
		i+=6;
		if(i>bin.length-1) break;
	} while(true);	
	return(out);
}

function encode64(arr,size){
	var bin=[];
	for(var i=0;i<arr.length;i++) {
		bin[i]=arr[i].toString(2);
		var delta=size[i]-bin[i].length;
		if(delta>=0) {
			for(;delta>0;delta--)
				bin[i]='0'+bin[i];
		}
	}
	bin=bin.join('');
	if(bin.length%6!=0) {	// pad to 6-bit
		for(delta=(6-bin.length%6);delta>0;delta--)
				bin=bin+'0';
	}
	i=0;
	var out='';
	do {
		out=out+chars[parseInt(bin.substr(i,6),2)];
		i+=6;
		if(i>bin.length-1) break;
	} while(true);	
	return(out);
}

function decode64(str,size) {
	var arr=str.split(""),arr1=[];
	for(var i=0;i<arr.length;i++) {
		c=$.inArray(arr[i],chars);
		c=c.toString(2);
		for(delta=(6-c.length);delta>0;delta--)
				c='0'+c;
		arr1[i]=c;
	}
	var tot=0;
	for(i=0;i<size.length;i++) tot+=size[i];
	var base=arr1.length*6-tot;
	base=0;
	var cumsum=[];
	cumsum[0]=0;	
	size.splice(0,0,0);
	for(i=1;i<size.length;i++) cumsum[i]=cumsum[i-1]+size[i];
	arr1=arr1.join('');
	var out=[];
	for(i=0;i<size.length-1;i++) {
		out[i]=parseInt(arr1.substring(base+cumsum[i],base+cumsum[i+1]),2);
	}
	return(out);
}

function encodeXY(x,y) {
	var enc=(x&0xfff) | (y<<12);
	var c1=chars[(enc>>18)&0x3f];
	var c2=chars[(enc>>12)&0x3f];
	var c3=chars[(enc>>6)&0x3f];
	var c4=chars[enc&0x3f];
	return(c1+c2+c3+c4);
}

function decodeXY(str) {
	var arr=str.split("");
	var c1=$.inArray(arr[0],chars);
	var c2=$.inArray(arr[1],chars);
	var c3=$.inArray(arr[2],chars);
	var c4=$.inArray(arr[3],chars);
	var enc=(c1<<18) | (c2<<12) | (c3<<6) | c4;
	return([enc&0xfff,(enc>>12)&0xfff]);
}

function zeroPad(num, places) {
  var zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join('0') + num;
}

/*Array.prototype.swap = function (x,y) {
  var b = this[x];
  this[x] = this[y];
  this[y] = b;
  return this;
}*/

String.prototype.cut=function(n) {
	var out=[];
	for(var i=0;i<this.length/n;i++) {
		out[i]=this.substr(i*n,n);
	}
	return out;
}

Array.prototype.unique = function () {
	var r = new Array();
	o:for(var i = 0, n = this.length; i < n; i++)
	{
		for(var x = 0, y = r.length; x < y; x++)
		{
			if(r[x]==this[i]){
				continue o;
			}
		}
		r[r.length] = this[i];
	}
	return r;
}
function isArray(obj) {if(obj) return obj.constructor == Array; else return false;}

/*function seleccaoMultipla() {
	$('.button.selmult').toggleClass('selected');
	$('.thumbnail.selected').removeClass('selected');
}*/


function switchTo(what) {
	var que=window.location.search.substring(3) || $.address.value().substr(2);
	if(!addressValue(what+que)) return;
	onExternalChange({path:'/'+what+que});
}

function openWebGIS(justswitch) {
	if(justswitch) {switchTo('w');return;}
}

function showOrgaoToolbar() {
	$('<div id="orgaotoolbar"><div>melhor</div><div>flor</div><div>folha</div><div>hábito</div></div>').appendTo('#se-pesquisar');
}

function showMorfologia() {
	$('#se-pesquisar .toolbar .button[name=identifica]').toggleClass('pressed');
	$('#pesquisa-content').toggleClass('identifica');
	if($('#se-pesquisar .toolbar .button[name=identifica]').hasClass('pressed')) {
		$('#pesquisa-headersup').animate({opacity:0},500,'easeInOutQuint',function(){
			$(this).hide();
			$('#rightc').css({left:leftwidths[1],width:$(window).width()-leftwidths[1]});
			refreshIdentificador();
			showLeft(true,null,1);
		});
	} else {
		hideLeft(true,1);
		$('#pesquisa-headersup').css({opacity:1}).show();
	}
}

function toBin(ids) {
/*	var idsarr=new Array(NSPP);
	for(var i=0;i<NSPP;i++) idsarr[i]=0;
	for(i=0;i<ids.length;i++) idsarr[parseInt(ids[i])]=1;
	return(idsarr);*/
	if(!ids) return({'arr':null,'n':0});
	if(ids.length==0) return({'arr':null,'n':0});
	var idsarr=new Array(NSPP);
	var id,j,n=0,i;
	for(i=0;i<NSPP;i++) idsarr[i]=0;
	for(i=0;i<ids.length;i++) {
		id=ids[i]+'';
		if(id.indexOf(',')>-1) {
			id=id.split(',');
			for(j=0;j<id.length;j++) {idsarr[parseInt(id[j])]=1;n++;}
		} else {idsarr[parseInt(id)]=1;n++;}
	}
	return({'arr':idsarr,'n':n});
}

function getResultIDs() {
	if($('input[name=familia]').size()>0) {		// está agrupado por géneros
		var ids='';
		var thumb=$('#pesquisa-content').find('.thumbnail.big');
		for(var i=0;i<thumb.size();i++) {
			ids=ids+thumb.eq(i).children('input[name=ident]').val()+',';
		}
		ids=ids.split(',');
		return(toBin(ids));
	} else {
		var ids=$('#se-pesquisar .thumbnail:not(.remove) input[name=ident]').add('#se-pesquisar ol li input[name=ident]').map(function() {return(this.value);}).get();
		if(ids.length==0) return({'arr':null,'n':0});
		return(toBin(ids));
/*		
		if(idsel.size()==0) return({'arr':null,'n':0});
		var ids=new Array(NSPP);
		var id,j,n=0;
		for(var i=0;i<NSPP;i++) ids[i]=0;
		for(i=0;i<idsel.size();i++) {
			id=idsel.eq(i).val();
			if(id.indexOf(',')>-1) {
				id=id.split(',');
				for(j=0;j<id.length;j++) {ids[parseInt(id[j])]=1;n++;}
			} else {ids[parseInt(id)]=1;n++;}
		}
		return({'arr':ids,'n':n});*/
	}
}


function addFichaSpToQuadro() {
	var el=$('.separador.selected input[name=id]');
	var id=el.val().split(',');
	for(var i=0;i<id.length;i++) {
		if($.inArray(id[i],quadro.ids)>=0 || id[i]=='') {id.splice(i,1);i--;}
	}
	if(id.length>0)	{
		addToQuadro(id,true,true,false);
		showSeparador('comparar');
	} else {	
		showSeparador('comparar');
		updateAddress();
	}
}

function comparaPesquisa() {
	if($('input[name=familia]').size()>0) {		// está agrupado por géneros
		var ids="";
		var thumb=$('#pesquisa-content').find('.thumbnail.big');
		for(var i=0;i<thumb.size();i++) {
			ids=ids+thumb.eq(i).children('input[name=guid]').val()+',';
		}
		clearQuadro(false);
		ids=ids.split(',');
		ids.pop();
		
		if(window.location.search.substring(1)!='')
			window.location='#4e8w5'+ids.join('');
		else
			addToQuadro(ids,true,true,false);
	} else {
		var set=$('#se-pesquisar .thumbnail>input[name=guid]');
		var ids='';
		for(var i=0;i<set.size();i++) ids=ids+set.eq(i).val().split(',')[0]+',';
		clearQuadro(false);
		ids=ids.split(',');
		ids.pop();
		if(window.location.search.substring(1)!='')
			window.location='#4e8w5'+ids.join('');
		else
			addToQuadro(ids,true,true,false);
	}
}

function comparaGenero(id) {
	$.get('tax.php',{id:id,ty:4},function(d) {
		var data=$.parseJSON(d);
		var ids=[];
		for(var i=0;i<data.length;i++) {
			ids.push(data[i].id);
		}
		clearQuadro(false);
		addToQuadro(ids,true,true,false);
	});
}

loadThumbSmall=function(els) {return function(){
	els.removeClass('waiting');
	if(!els.hasClass('small')) return;
	var i,top;
	for(i=0;i<els.size();i++) {
		top=els.eq(i).position().top;
		if(top+222>10 && top<$('#se-pesquisar').height()-10) {		// ainda está dentro do ecran
			els.eq(i).find('.loader').removeClass('nodisp');
			loadThisThumb(els.eq(i),true,2);
		}
	}
}};

loadThumbBig=function(els) {return function(){
	els.removeClass('waiting');
	if(!els.hasClass('big')) return;
	var i,top;
	for(i=0;i<els.size();i++) {
		top=els.eq(i).position().top;
		if(top+422>10 && top<$('#se-pesquisar').height()-10) {		// ainda está dentro do ecran
			els.eq(i).find('.loader').removeClass('nodisp');
			loadThisThumb(els.eq(i),true,1);
		}
	}
}};

loadThumbMosaic=function(els) {return function(){
	els.removeClass('waiting');
	if(!els.hasClass('big')) return;
	var i,top;
	for(i=0;i<els.size();i++) {
		top=els.eq(i).position().top;
		if(top+422>10 && top<$('#se-pesquisar').height()-10) {		// ainda está dentro do ecran
			els.eq(i).find('.loader').removeClass('nodisp');
			loadThisThumb(els.eq(i));
		}
	}
}};


function onScrollCheckThumbs(type,thisel) {		// type: 1-small thumb, 2-big thumb, 3-big mosaic
	if(type != 3) return;
	var thumbs=$('#pesquisa-content .thumbnail');
	if(thumbs.size()==0) return;
	var offsettop=thumbs.eq(0).position().top-$('#toolbar-resultados').position().top;
	var wid=Math.floor(($(thisel)[0].scrollWidth-10)/thumbs.eq(0).outerWidth(true));		// 10 é a margin-left do de dentro
	
	var sctop=$(thisel).scrollTop()-offsettop;
	var heithumb=thumbs.eq(0).outerHeight(true);
	var startrow=sctop<0 ? 0 : Math.floor(sctop/heithumb)*wid+0;
	var endrow=Math.ceil((sctop+$(window).height())/heithumb)*wid-0;
	
	var loadthese=thumbs.slice(startrow,endrow).not('.waiting').has('.loader.nodisp');
	loadthese.addClass('waiting');
	switch(type) {
		case 1:
			setTimeout(loadThumbSmall(loadthese),400);
			break;
		case 2:
			setTimeout(loadThumbBig(loadthese),400);
			break;
		case 3:
			setTimeout(loadThumbMosaic(loadthese),400);
			break;
	}
}

function iconSize(size,indx) {	// loads thumbnail fotos. 'indx' is the index of the guid: 1-default foto, 2-flower
	var thumb=$('#pesquisa-content .thumbnail');

	switch(size) {
		case 1:		//big
			$('#se-pesquisar .toolbar .largeicons').hide();
			$('#se-pesquisar .toolbar .smallicons').show();
			thumb.each(function() {
				var guid = $(this).find('input[name=guid]').val().split(',')[0];
				var nomeori = $(this).find('input[name=nome]').val();
				nome = nomeori.replace(" ", "-") + '_' + guid + '.jpg';
				$(this).removeClass('small').addClass('big').find('.wrap').empty().append('<img class="image big" loading="lazy" src="'+nome+'" alt="loading..."/><p style="clear:both"/>');
			});
			break;
			
		case 2:
			$('#se-pesquisar .toolbar .largeicons').show();
			$('#se-pesquisar .toolbar .smallicons').hide();
			thumb.each(function() {
				var guid = $(this).find('input[name=guid]').val().split(',')[0];
				var nomeori = $(this).find('input[name=nome]').val();
				nome = nomeori.replace(" ", "-") + '_low_' + guid + '.jpg';
				$(this).removeClass('big').addClass('small').find('.wrap').empty().append('<img class="image small" loading="lazy" src="'+nome+'" alt="loading..."/><p style="clear:both"/>');
			});

			break;
	}
}

function loadThisThumb(thumb,onlyfirst,size) {		//TODO
	var fots=thumb.children('input[name=guid]').val();
	fots=fots.split(',');
	if(onlyfirst) fots=[fots[0]];
	if(fots.length>=4) {	// é sempre grande
		var jafoi=[];
		for(var j=0;j<4;j++) {
			if(fots.length==4)
				var nr=j;
			else {
				do {
					var nr=Math.floor(Math.random()*fots.length);
				} while(jafoi[nr]);
				jafoi[nr]=true;
			}
			var imel=$('<img style="position:absolute;top:-800px;left:-800px;" class="image small loading" src="gen-sp_low_'+fots[nr]+'.jpg"/>').css({opacity:0}).appendTo(thumb);
			imel.data('el',thumb);
			imel.load(function(){
				$(this).data('el').find('.placeholder').eq(0).replaceWith($(this).removeClass('loading').css({position:'static'}).prependTo($(this).data('el').find('.wrap')).animate({opacity:1}));

//				.insertBefore($(this).data('el').find('.wrap p:first')).animate({opacity:1});
			});
		}
	} else {		// pode ser grande ou pequeno
		var nr=Math.floor(Math.random()*fots.length);
		var nome=thumb.children('input[name=nome]').val();
		if(!size || size==1) {
			if(nome)
				var imel=$('<img style="position:absolute;top:-800px;left:-800px;" class="image loading" src="'+nome.replace(' ','-')+'_'+fots[nr]+'.jpg"/>').css({opacity:0}).appendTo(thumb);
			else
				var imel=$('<img style="position:absolute;top:-800px;left:-800px;" class="image loading" src="gen-sp_'+fots[nr]+'.jpg"/>').css({opacity:0}).appendTo(thumb);
			imel.data('el',thumb);
			imel.load(function(){
				$(this).data('el').find('.placeholder').replaceWith($(this).removeClass('loading').css({position:'static'}).prependTo($(this).data('el').find('.wrap')).animate({opacity:1}));
			});
		} else if(size==2) {
			if(nome)
				var imel=$('<img style="position:absolute;top:-800px;left:-800px;" class="image loading" src="'+nome.replace(' ','-')+'_low_'+fots[nr]+'.jpg"/>').css({opacity:0}).appendTo(thumb);
			else
				var imel=$('<img style="position:absolute;top:-800px;left:-800px;" class="image loading" src="gen-sp_low_'+fots[nr]+'.jpg"/>').css({opacity:0}).appendTo(thumb);
			imel.data('el',thumb);
			imel.load(function(){
				$(this).data('el').find('.placeholder').replaceWith($(this).removeClass('loading').css({position:'static'}).prependTo($(this).data('el').find('.wrap')).animate({opacity:1}));
			});
		}
	}			
}

// user has searched a family, show species aggregated by genus
function onDisplayFamiliaLoad() {
	$('#pesquisa-content').removeClass().addClass('resultados');
	showSeparador('pesquisar');
	if($('input[name=pagetitle]').val()) document.title=$('input[name=pagetitle]').val();
	$('#q1').val($('input[name=familia]').val());
//		if($('#leftc-1').offset().left<-50) showLeft(false);
	caixaPesquisaToSmall(true);
//	$('#toolbar-resultados').prependTo('#pesquisa-content');
	$('#dica').hide();
	$('#pesquisa-content').show();
	attachAddCriterio();
	
	attachBaloonTip($('#pesquisa-content .showtooltip'),{wid:220,style:{textAlign:'justify'}},[0,0],{anim:true,rad:10,curv:5,padding:8});
	
	if($('#floracao').size()==1) drawFloracao('floracao',$('#pesquisa-content input[name=floracao]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'Floração',subtitle:'destas espécies',pad:[5,0,0,12],interactive:true});
	if($('#dispersion').size()==1) drawFloracao('dispersion',$('#pesquisa-content input[name=dispersion]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'Frutificação',subtitle:'destas espécies',pad:[5,0,0,12],interactive:true});
	
	if($('#pesquisa-content .placeholder').size()==0) {waitEnd();return;}

	$('#se-pesquisar').unbind('scroll').scroll(function() {
//	    sessionStorage.setItem("scrollValue_".pathName, $('#se-pesquisar').scrollTop());
	    onScrollCheckThumbs(3,this);
    });
	//$('#se-pesquisar').scroll();

	attachBestCharacterSuggestions();
	
	attachChartsEvents();
	
/*	if (sessionStorage.getItem("scrollValue_".pathName) != null) {
        $('#se-pesquisar').scrollTop(sessionStorage.getItem("scrollValue_".pathName));
    }*/ 

	waitEnd();
	$('#se-pesquisar').scroll();

//	attachComoCitar('#se-pesquisar .download.mapa a');
	attachComoCitar2($('#se-pesquisar .download.mapa a'),$('#se-pesquisar .download.mapa a').attr('href').replace(/.[a-z]{3}$/gi,''));
}

function attachComoCitar(elem,txt) {
	$(elem).click(function(ev) {
		ev.preventDefault();
		var anchor=$(this).attr('href');
		if(!txt) {
			wait();
			$.get(anchor+'&f=cita',function(rt) {
				$('.comocitar').remove();
				messageBox('<h1>Como citar este mapa</h1><div class="quote">'+rt+'</div><p class="emph">Os colaboradores disponibilizam estes dados de forma voluntária e gratuita. Por favor, ao usar os dados, dê o devido crédito aos colaboradores envolvidos.</p>',null,{wid:$(window).width()/3,classes:'fixed comocitar',closebutton:true,closeonclick:false,resizeEvent:false});
				window.location=anchor;
				waitEnd();
			});
		} else {
				$('.comocitar').remove();
				messageBox(txt,null,{wid:$(window).width()/3,classes:'fixed comocitar',closebutton:true,closeonclick:false,resizeEvent:false});
		}
	});
}

function displayFamilia(fam){
	//addressValue('2'+encode64([parseInt(fam)],[9]));
	if(!addressValue('1'+fam)) return;
	wait();
	hideLeftIfSmall();
//	$('#toolbar-resultados').remove();
	saveDistribuicao();
	$('#pesquisa-content img.loading').remove();
	$('#pesquisa-content .placeholder').remove();
	//$('#distribuicao').appendTo('body');
	$('#pesquisa-content').load("dispfam.php?q="+fam,onDisplayFamiliaLoad);
}

function displayOrdem(ord){
	if(!addressValue('8'+ord)) return;
	wait();
	hideLeftIfSmall();
//	$('#toolbar-resultados').remove();
	saveDistribuicao();
	$('#pesquisa-content img.loading').remove();
	$('#pesquisa-content .placeholder').remove();
	$('#pesquisa-content').load("dispord.php?q="+ord,onDisplayFamiliaLoad);
}


function getPesquisaQueryString() {
	var qs=$.address.value().substr(2);
	if(qs)
		qs=qs.split('/');
	else
		qs=Array(window.location.search.substring(3));
	var qsproc=qs.slice();
	qsproc[0]=qsproc[0].replace(/[\*]/gi,',')
	qsproc[0]=qsproc[0].replace(/[\+]/gi,' ');
	return({ori:qs,proc:qsproc});
}

function hideBancada(){
	$('#bancada').hide();
	$('#comparacaract').hide();
	$('#visualizador').remove();
	$('#highresexplorer').remove();
	$('#osdviewer-wrap').hide();
	$('#imgx-navi').remove();
	if($('.pesquisaavanc').size()>0) $('.pesquisaavanc .close').click();
	$('#veu').hide();
}

function getVal(str,attr) {
	var a=str.indexOf(attr);
	var b=str.indexOf(' ',a);
	return(str.substr(a+attr.length,b-a-attr.length));
}

function showComparaCaract() {
	$('#veu').css({'display':'block',opacity:1});
	$('#comparacaract').show();
}

function showBancada() {
	$('#veu').css({'display':'block',opacity:1});
	$('#bancada').show();
//	$('#banc-tools').css({display:'block',opacity:1});
}

function getBancadaMaxZ() {
	var set=$('#bancada .foto-banc');
	var maxi=0;
	for(var i=0;i<set.size();i++) {
		if(parseInt(set.eq(i).css('zIndex'))>maxi) maxi=parseInt(set.eq(i).css('zIndex'));
	}
	return(maxi);
}

function addToBancada(el,zindex) {
	el.appendTo('#bancada .bancada').css({zIndex:zindex}).click(function(ev){$(this).css({zIndex:getBancadaMaxZ()+1});ev.stopPropagation();}).draggable({stack:'.foto-banc',handle:'.title',cancel:'.button,.subtitle',start:function(event,ui){
		tooltipcount=10;
		$(event.target).removeClass('reduced').unbind('mouseenter').unbind('mouseleave');
	}}).find('.button').click(function(){	// botões da janela
		switch($(this).attr('name')) {
			case 'close':
				$(this).parent().parent().fadeOut(200,function(){
					$(this).remove();					
					if($('#bancada .foto-banc').size()==0) {$('#bancada .button2[name=sair]').click();} else updateBancadaAddress();
				});
				break;
			case 'abrir':
				displaySp($(this).parent().parent().find('input[name=id]').val(),true,true);//				attr('name'),true,true);				
				break;
				
			case 'anular':
			case 'mover':
			case 'arrow':
			case 'ellipse':
			case 'texto':
			case 'chaveta':
				$(this).addClass('pressed').siblings('.tool').removeClass('pressed');
				break;
				
			case 'draw':
				if($(this).hasClass('pressed')) {
					$(this).toggleClass('pressed');
					$(this).siblings('.tool').addClass('nodisp');
					$(this).children('img').attr('src','images/pencil_48.png');
					saveAnnots();
				} else {
					if($('#drawcanvas').size()>0) {alert('Grave primeiro as anotações das outras imagens.');return;}
					$(this).toggleClass('pressed');
					$(this).siblings('.tool').removeClass('nodisp');
					$(this).children('img').attr('src','images/save_32.png');
					var wrap=$(this).parents('.foto-banc').find('.wrap');
//					var annots=$(this).parents('.foto-banc').find('.drawing');
					$(this).parents('.foto-banc').find('.drawing').fadeOut();
					$('<div id="drawcanvas" class="drawing" style="background-color:white;"></div>').appendTo($(this).parents('.foto-banc')).css({left:wrap.position().left,top:wrap.position().top,width:'100%',height:wrap.height(),opacity:0.4}).click(drawAnnots).mousemove(drawAnnotsMove);
					var canvas=Raphael('drawcanvas',wrap.width(),wrap.height());
					$('#drawcanvas').data('canvas',canvas);
					
/*					if(annots.size()>0) {	// já tem setas
						var canvasori=annots.data('canvas');
						var a;
						canvasori.forEach(function(el) {
							a=canvas.path(el.attr('path'));
							a.attr({'stroke-width':5,'arrow-end':'classic-wide-long'});
							a.click(function(ev) {
								this.remove();
								ev.stop();
							});
						});
						canvasori.remove();
					}*/
				}
				
				break;
		}
		return(false);
	}).tooltip({ 
		track: false, 
		delay: 600, 
		showURL: false,
		showBody:' - ',
		fade: 250,
		bodyHandler:function(){
			switch($(this).attr('name')) {
				case 'abrir':return('Abrir ficha da espécie');break;
				case 'close':return('Fechar janela');break;
			}
		}
	});
}

function makeFotobanc(src,sp,id,subtit,distcar) {
	var add='<img class="foto nodisp" src="gen-sp_low_'+src+'.jpg"/>';
//	if(src!=null) var add='<img class="foto" src="'+src+'"/>'; else var add='';
	var el=$('<div class="foto-banc"><input type="hidden" name="src" value="'+src+'"/><input type="hidden" name="id" value="'+id+'"/>'+
		(distcar ? '<input type="hidden" name="distcar" value="'+distcar+'"/>' : '')+
		'<div class="title"><div class="nome">'+sp+'</div><div class="button" name="close"><img src="images/no.png"/></div>'+
		(distcar && wiki ? '<div class="button" name="draw"><img src="images/pencil_48.png"/></div><div class="button tool nodisp pressed" name="arrow"><img src="images/arrow.png"/></div><div class="button tool nodisp" name="ellipse"><img src="images/ellipse.png"/></div><div class="button tool nodisp" name="chaveta"><img src="images/chaveta.png"/></div><div class="button tool nodisp" name="texto" style="line-height:16px;font-size:18px;font-family:serif;font-weight:bold;color:#0f0;">T</div><div class="button tool nodisp" name="mover">mv</div><div class="button tool nodisp" name="anular"><img src="images/crossh.png"/></div>' : '')+
		(id ? '<div class="button" name="abrir"><img src="images/chat_01.png"/>abrir ficha</div>' : '')+'<p style="clear:both"/></div>'+
		(subtit ? ('<div class="subtitle">'+subtit+'</div>') : '')+'<div class="wrap"><div class="placeholder"><img class="loader" src="images/loading.gif"/></div>'+add+
		'</div></div>');
/*	var el=$('<div class="foto-banc normalsize"><input type="hidden" name="src" value="'+src+'"/><input type="hidden" name="id" value="'+id+'"/>'+
		'<div class="title-back"></div><div class="title"><div class="nome">'+sp+'</div><div class="button" name="close"><img src="images/no.png"/></div><div class="button" name="abrir">'+
		'<img src="images/chat_01.png"/>abrir ficha</div></div>'+add+'<div class="placeholder"><img class="loader" src="images/loading.gif"/></div></div>');
	el.find('.foto').css({opacity:0.5});*/
//	el.find('.title-back').css({opacity:0.7});
//	el.find('.shadow').css({opacity:0.4});
	return(el);
}

function getThumbDetails(el) {
	var nomeori=$(el).siblings('input[name=nome]').val();
	var nome=nomeori.replace(/<(?:.|\n)*?>/gm, '');
	nome=nome.replace(/\./gm, '');
	nome=nome.replace(/ /gm, '-');
	var fotoguid=$(el).attr('src').slice(-8,-4);
	var cloud=parseInt($(el).attr('data-cloud'));
	if(cloud == 1)
		var imgs=[nome+'_all2_'+fotoguid+'.jpg'];
	else if(cloud == 2)
		var imgs=[nome+'_all3_'+fotoguid+'.jpg'];
	else
		var imgs=[nome+'_all_'+fotoguid+'.jpg'];

	return {
		guid: $(el).siblings('input[name=guid]').val()
		,nomeori: nomeori
		,nome: nome
		,fotoguid: fotoguid
		,imgs: imgs
		,tileSources: imgs.map(function(cv) {
			return {tileSource: {type: 'image', url: cv}}
		})
		,aut: $(el).siblings('input[name=aut]').val()
		,comment: $(el).siblings('input[name=comm]').val()
	};
}

function clickHighresFichaSp(el,anim) {
	var thd=getThumbDetails(el);
	var osdl=document.getElementById('osdlegend');
	osdl.querySelector('h1').innerHTML=thd.nomeori;
	osdl.querySelector('p.author').innerHTML=thd.aut;
	osdl.querySelector('p.comment').innerHTML=thd.comment;
	osdl=document.getElementById('osdviewer-wrap');
//	osdl.querySelector('input[name=src]').value=$(el).attr('src');
	osdl.querySelector('input[name=src]').value=thd.imgs[0];
	
	// set guid of previous thumbnail
	var prevel=$(el).parent().prev().children('img');
	var preveld;
	if(prevel.length>0) {
		preveld=getThumbDetails(prevel);
	} else {
		preveld=getThumbDetails(document.querySelectorAll('#fotochooser .thumbnail:last-of-type img'));
	}
	osdl.querySelector('.button[data-action="previous"]').setAttribute('data-guid',preveld.fotoguid);

	// set guid of next thumbnail
	var prevel=$(el).parent().next().children('img');
	var preveld;
	if(prevel.length>0) {
		preveld=getThumbDetails(prevel);
	} else {
		preveld=getThumbDetails(document.querySelectorAll('#fotochooser .thumbnail img')[0]);
	}
	osdl.querySelector('.button[data-action="next"]').setAttribute('data-guid',preveld.fotoguid);

	var tileDrawnHandler = function(event) {
		osdViewer.removeHandler('tile-drawn', tileDrawnHandler);
		waitEnd();
	};
	
	var swipeHandler=function(ev) {
		if(!osdViewer.panHorizontal && ev.speed>350 && Math.abs(Math.cos(ev.direction))>0.8) {
			if(Math.cos(ev.direction)<0)
				clickOSDToolbar('next');
			else
				clickOSDToolbar('previous');
		}
	}
	
	wait();
	if(osdViewer) {
		osdViewer.world.removeAll();
		osdViewer.addTiledImage(thd.tileSources[0]);
	} else {
		osdViewer=OpenSeadragon({
			id: 'osdviewer'
			,showNavigationControl: true
			,animationTime:0.5
			,tileSources: thd.tileSources
			,collectionMode:false
			,zoomPerScroll:2
			,maxZoomPixelRatio:2
			,showNavigationControl:false
		});
		
		osdViewer.addHandler('zoom', function(ev) {
			if(ev.zoom<=osdViewer.viewport.getHomeZoom())
				osdViewer.panHorizontal=false;
			else
				osdViewer.panHorizontal=true;
		});
		osdViewer.addHandler('canvas-drag-end', swipeHandler);
	}
	osdViewer.addHandler('tile-drawn', tileDrawnHandler);
	
	document.getElementById('osdviewer-wrap').style.display='block';	
	
	document.getElementById('osdtoolbar').addEventListener('click',clickOSDToolbar,false);
	addressValue('h'+thd.fotoguid);
}

/*const downloadFile = (url, fileName) => {
  const link = document.createElement('a');
console.log("DOWN " + url);
  link.href = url;
  link.setAttribute('download', url); // Suggested filename
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link); // Clean up
};*/

function clickOSDToolbar(ev) {
	var el=ev.target;
	if(el) {
		if(el.tagName!='IMG') return;
		var action=el.parentNode.getAttribute('data-action');
	} else
		var action=ev;
	
	switch(action) {
	case 'download':
//		downloadFile(document.getElementById('osdviewer-wrap').querySelector('input[name=src]').value + 'down', null);
		window.location=document.getElementById('osdviewer-wrap').querySelector('input[name=src]').value+'down';
		break;
	case 'close':
		document.getElementById('osdviewer-wrap').style.display='none';
		updateAddress();
		break;
	case 'zoommore':
		osdViewer.viewport.zoomBy(1.5,null,false);
		break;
	case 'zoomless':
		osdViewer.viewport.zoomBy(1/1.5,null,false);
		break;
	case 'fullscreen':
		osdViewer.setFullScreen(true);
		break;
	case 'previous':
	case 'next':
		var clicked=document.querySelector('#osdtoolbar .button[data-action="'+action+'"]');
		osdViewer.world.removeAll();
		var thumbs=document.querySelectorAll('#fotochooser .thumbnail img');
		for(var i=0;i<thumbs.length;i++) {
			if(thumbs[i].getAttribute('src').slice(-8,-4)==clicked.getAttribute('data-guid')) {
				clickHighresFichaSp(thumbs[i],false);
				break;
			}
		}
		break;
	}


}

function moveToBancada(elems,guidsp){
	//if($('#quadro .button[name=lupa]').hasClass('pressed')) return;
	var n=elems.size();
	var wid=Math.floor($('#bancada').width()/480);
	var hei=Math.floor($('#bancada').height()/640);
	var winwid=$(window).width();
	var winhei=$(window).height();
	var preload=new Array(n);
	var newsrc=new Array(n);
	if(n>wid)
		var offx=wid*240;
	else
		var offx=n*240;
	var offy=Math.ceil(n/wid)*320;
	if(winwid/2-offx<0) offx=winwid/2;
	if(winhei/2-offy<0) offy=winhei/2-20;
	
	for(var i=0;i<n;i++) {
		var el=elems.eq(i);
		var pos=el.offset();
		var src=el.attr('src');
		newsrc[i]=src.replace('_low_','_');
		var guid=src.substr(src.length-8,4);
/*		if(src.indexOf('showfoto')<0) {
			src=src.substr(src.search('thumbs/'));
			var guid=src.substr(src.length-8,4);
			newsrc[i]=src.replace('thumbs/','showfoto.php?f=').replace('.jpg','');		
		} else {
			var guid=src.substr(src.length-4,4);
			newsrc[i]=src.substr(src.length-19,19);
		}*/
		
		if(guidsp) var id=guidsp; else var id=el.parent().parent().data('id');		// 2º caso é qdo vem do quadro
		if(el.attr('alt'))
			var espec=el.attr('alt');
		else
			var espec=$('#quadro .row.row'+id+' .rowh i').html();
		//	wait(el);
		preload[i]=new Image();
		preload[i].onload=function() {
			this.el.find('.foto').attr('src',this.src).show();
			this.el.find('.placeholder').remove();
		};
		var newel=makeFotobanc(guid,espec,id);
		newel.css({top:winhei/2-offy+Math.floor(i/wid)*670,left:winwid/2-offx+(i%wid)*480});//.addClass(uid);
		if(n==1) $('#bancada .button2[name=organizar]').click();
		addToBancada(newel,getBancadaMaxZ());
		preload[i].el=newel;
		var classe;
		switch(el.width()) {
			case 150:classe='small';break;
			case 300:classe='big';break;
			case 480:classe='original';break;
		}
		$('<img class="fly '+classe+'" src="'+el.attr('src')+'"/>').appendTo('body')
			.css({top:pos.top,left:pos.left}).animate({width:480,height:640,left:winwid/2-offx+(i%wid)*480,top:winhei/2-offy+Math.floor(i/wid)*640+metricas.fotobanchead},600,'easeInOutQuint',function(){
				$(this).remove();
				showBancada();
				$('#bancada .bancada').scrollTop(0);
				if($('.fly').size()==0) updateBancadaAddress();				
			});
		/*
		var newel=$('<div class="foto-banc noborder '+preload.uid+'" style="z-index:200" name="'+id+'"><span class="nodisp">&nbsp;'+espec+'</span><p class="nodisp"/><img src="'+el.attr('src')+'"/><div class="button nodisp">fechar</div></div>').appendTo('body');
		newel.css({top:pos.top,left:pos.left})
			.children('img').css({width:150,height:200}).animate({width:480,height:640},750,'easeInOutQuint')
			.parent().delay(i*200).animate({left:winwid/2-offx+(i%wid)*480,top:winhei/2-offy+Math.floor(i/wid)*640},750,'easeInOutQuint',function(){
				var a=getBancadaMaxZ();
				var t=$(this).offset().top;
				$(this).removeClass('noborder').css({top:t-20}).find('.nodisp').removeClass('nodisp');
				showBancada();
				if(n==1) $('#banc-tools .button[name=organizar]').click();
				addToBancada($(this),a);
				if($('.foto-banc.noborder').size()==0) updateBancadaAddress();
			});*/
		if(tooltipcount<4) {
			tooltipcount++;
			newel.children('img').tooltip({ 
				track: true, 
				delay: 400, 
				showURL: false,
				showBody:' - ',
				fade: 250,
				bodyHandler:function(){
					if(tooltipcount<4)
						return('<span style="color:black">pode arrastar as imagens<br/>para as organizar</span>');
					else return(null);
				}
			});
		}
	}

	for(var i=0;i<n;i++) preload[i].src=newsrc[i];
}


function isSelectFinished(level) {
	switch(level[0]) {
		case 1:	
			select.o.splice($.inArray(level[1],select.o),1);
			if(select.o.length==0) {
				select.o=-1;
				processSelect();
			}
			break;
		case 2:
			select.f.splice($.inArray(level[1],select.f),1);
			if(select.f.length==0) {
				select.f=-1;
				processSelect();
			}
			break;
		case 3:
			select.g.splice($.inArray(level[1],select.g),1);
			if(select.g.length==0) {
				select.g=-1;
				processSelect();
			}
			break;
		case 4:
			select.e.splice($.inArray(level[1],select.e),1);
			if(select.e.length==0) {
				var tmpel=$('#taxtree li.selected').eq(0);
//				alert(tmpel.parent().parent().parent().parent().html())
//				alert(tmpel.position().top+tmpel.parent().position().top+tmpel.parent().parent().position().top);

				$('#taxtree').scrollTop(tmpel.parent().parent().parent().parent().position().top+$('#taxtree').scrollTop()-$('#filtro-holder').height() - $('#pesquisa-outer').height() - $('#containerleft .logo').height() -2);
				select={o:0,f:0,g:0,e:''};
				return;
			}
			break;
	}
}

function processSelect() {
	if(isArray(select.o)) {
		var set=$('#taxtree>ul>li:not(.old)');
		var ids=select.o;
		var lev=1;
	} else {
		if(isArray(select.f)) {
			var out='#taxtree>ul>li:not(.old)';	
			if(select.o==-1) out=out+'>ul>li:not(.old)';
			var set=$(out);
			var ids=select.f;
			var lev=2;
		} else {						
			if(isArray(select.g)) {
				var out='#taxtree>ul>li';
				if(select.f==-1) out=out+'>ul>li:not(.old)';
				if(select.o==-1) out=out+'>ul>li:not(.old)';
				var set=$(out);
				var ids=select.g;
				var lev=3;
			} else {
				if(isArray(select.e)) {
					var out='#taxtree>ul>li';
					if(select.g==-1) out=out+'>ul>li:not(.old)';
					if(select.f==-1) out=out+'>ul>li:not(.old)';
					if(select.o==-1) out=out+'>ul>li:not(.old)';
					var set=$(out);
					var ids=select.e;
					var lev=4;
				}
			}
		}
	}
	for(var j=0;j<set.size();j++) {
		var id=set.eq(j).data('d').id;
		if(id==null) continue;
		console.log(id);
//		if(lev==4) alert(set.eq(j).data('d').id);
		var sim=false;
		if(lev!=4) id=parseInt(id);
		if(isArray(id)) {
			for(var i=0;i<id.length;i++) {			
				sim=sim | ($.inArray(id[i],ids)>-1);
				if($.inArray(id[i],ids)>-1) {id=id[i];break;}
			}
		} else sim=($.inArray(id,ids)>-1);

		if(sim) {
			if(lev==4) {	//espécie
				set.eq(j).addClass('selected');
				isSelectFinished([lev,id]);
			} else {
				var tt=set.eq(j).children('ul');
				if(tt.size()>0) {
					//var hei=tt.css({display:'none',height:'auto'}).height();
					tt.show().css({height:'auto',opacity:1});					//height:hei,
					isSelectFinished([lev,id]);
				} else
					populateTaxa(set.eq(j),isSelectFinished,[lev,id]);
			}
		}
	}
}

function selectSpecies(guids,ids) {
	if(!ids && !guids) return;
	if(ids) {if(ids.length==0) return;}
	if(guids) var obj={tree:guids.join(',')}; else var obj={treeids:ids.join(',')};
	$.get('tax.php',obj,function(d){
		var data=$.parseJSON(d);
		if(data.e.length==0) return;
		var ft=parseInt($('#filtrotaxon>.selected').attr('name'));
		switch(ft) {
			case 1:		//ordens
				select.o=data.o.unique();
			case 2:
				select.f=data.f.unique();
			case 3:
				select.g=data.g.unique();
		}
		select.e=data.e.unique();
//		if(select.e.length==1) select.e=select.e[0];
		processSelect();
		updateScrollBarSize();
	});
}

//function quadroVazio() {$('#quadro').empty().css({width:'99%',height:'99%'}).html('<p style="text-align:center;font-style:italic;color:gray;margin-top:200px;"><br/>quadro comparativo vazio<br/>seleccione espécies na árvore à esquerda para comparar</p>');}

function clearQuadro(complete) {
	$('#quadro').empty();
	//quadroVazio();
	if(complete) homePage();
	$('#taxtree li.selected').removeClass('selected');
	quadro.ids=null;
	quadro.ids=new Array();
	quadro.nomes=null;
	quadro.nomes=new Array();
	cmp.linhas=null;
	cmp.ids=null;
	cmp.linhas=new Array();
	cmp.ids=new Array();
	quadro.orgaos=[];//basicorgans.slice(0);
}

function getQuadroIDs(){
	var rows=$('#quadro .row.corpo').not('.removing');
	var s=rows.size();
	var out=[];
	for(var i=s-1;i>-1;i--) {out[s-1-i]=rows.eq(i).data('id');}
	//for(var i=0;i<s;i++) {out[i]=rows.eq(i).data('id');}
//	quadro.ids=out;
	return(out);
}
function getQuadroOrgs(){
	var cols=$('#quadro .colh');
	var out=[];
	for(var i=0;i<cols.size();i++) {
		if(cols.eq(i).data('id'))
			out.push(cols.eq(i).data('id'));
	}
	//quadro.orgaos=out;
	return(out);
}

function countFotosOrgaos() {	// conta quantas fotos é que há por cada órgão, para este quadro
	orgaos.count=[];
	for(var i=0;i<orgaos.ids.length;i++) {
		if($.inArray(orgaos.ids[i],quadro.orgaos)==-1) {
			c=0;
			for(j=0;j<cmp.linhas.length;j++) {
				if(cmp.linhas[j][orgaos.ids[i]]) c++;	
			}
			orgaos.count[i]=c;
		}
	}
}

function addOrgao(org,upd){
	if(org==-1) {
		quadro.orgaos=basicorgans.slice(0);
		var ids=getQuadroIDs();
		clearQuadro(false);
		addToQuadro(ids,true,true,false);
		return;
	}
	var set=$('.col'+quadro.orgaos[0]);
	var s=quadro.ids.length;
	if(s==0) return;
	quadro.orgaos.splice(0,0,org);
//	set.eq(0).before('<div class="cell col'+quadro.orgaos[0]+' colh"><div class="wrap"><div class="titulo">'+orgaos.n[$.inArray(quadro.orgaos[0],orgaos.ids)]+'</div><div class="button" name="removecol"><img src="images/close.png"/></div><div class="button" name="addtudo"><img src="images/arrow_down.png"/></div><p style="clear:both"/><div class="ul black s2"/><div class="ur black s2"/></div></div>');
	set.eq(0).before('<div class="cell col'+quadro.orgaos[0]+' colh"><div class="titulo">'+orgaos.n[$.inArray(quadro.orgaos[0],orgaos.ids)]+'</div></div>');
//	$('#quadro .colh').eq(0).data({'id':quadro.orgaos[0]}).find('.button').click(quadroColClick);
/*		.draggable({appendTo:document.body,cancel:'.button',containment:'#quadro',helper:quadroColHelper,start:quadroColStart})
		*/
	resizeQuadro();
	for(var i=1;i<set.size();i++) {
/*		alert(quadro.ids[i-1]);
		alert(cmp.ids);*/

		posi=$.inArray(quadro.ids[s-(i-1)-1],cmp.ids);
		if(posi<0) continue;
		if(cmp.linhas[posi][quadro.orgaos[0]])
			out=cmp.linhas[posi][quadro.orgaos[0]];
		else		// célula vazia
			out='<div class="cell col'+quadro.orgaos[0]+' blank"></div>';	//<p>sem foto</p>
		$(out).insertBefore(set.eq(i)).not('.blank').children('.wrap').children('img').click(function(){moveToBancada($(this));});
	}

	if(upd) updateAddress();
	loadPendingImages();
}

function loadPendingImages() {
	var els=$('#quadro .placeholder');
	var all,allstr;
	var preload=new Array(els.size());
	var isbig=$('#quadro').hasClass('big');
	for(var i=0;i<els.size();i++) {
		preload[i]=new Image();		
		preload[i].onload=function() {
			var newel=$('<img class="image" src="'+this.src+'"/>'); //<div class="br black s2"/><div class="ur black s2"/><div class="ul black s2"/><div class="bl black s2"/>
			this.el.replaceWith(newel);				
			newel.click(function(){moveToBancada($(this));});
		};
		
		preload[i].el=els.eq(i);
	}
	for(i=0;i<els.size();i++) {
		var el=els.eq(i);/*
		if(el.siblings('.chooser').size()==0) {
			all=el.siblings('input[name=all]').val().split(',');		
			if(all.length>1) {		// põe fotos alternativas
				var ind=$.inArray(el.siblings('input[name=def]').val(),all);
				allstr='';
				for(var i1=0;i1<all.length;i1++) {
					if(i1==ind)
						allstr=allstr+'<div class="selected"><input type="hidden" value="'+all[i1]+'"/></div>';
					else
						allstr=allstr+'<div><input type="hidden" value="'+all[i1]+'"/></div>';
				}
				el.parent().append('<div class="chooser">'+allstr+'</div>').find('.chooser div').click(function(){
					$(this).siblings().removeClass('selected');
					var im=$(this).addClass('selected').parent().siblings('img');
					$(this).parent().parent().append('<div class="placeholder"><img class="loader" src="images/loading.gif"/></div>').children('.placeholder').css('opacity',0).animate({opacity:0.7});
	//				im.replaceWith('<div class="placeholder"><img class="loader" src="images/loading.gif"/></div>');
					var impre=new Image();
					impre.onload=function() {
						this.el.siblings('img').attr('src',this.src);
						this.el.siblings('.placeholder').remove();
					}
					impre.el=$(this).parent();
					impre.src='thumbs/'+$(this).children('input').val()+'.jpg';
				});
			
			} else el.parent().append('<div class="chooser"></div>');
		}*/
		if(isbig)
//			preload[i].src='showfoto.php?f='+el.siblings('input[name=def]').val();
			preload[i].src='gen-sp_'+el.siblings('input[name=def]').val()+'.jpg';
		else
//			preload[i].src='./thumbs/'+el.siblings('input[name=def]').val()+'.jpg';
			preload[i].src='gen-sp_low_'+el.siblings('input[name=def]').val()+'.jpg';
	}
}

function resizeQuadro() {
//	$('#quadro-wrap').width(quadro.orgaos.length*metricas.quadcolwid+metricas.quadcolsup+metricas.botaoaddcol)
	$('#quadro-wrap').width(quadro.orgaos.length*metricas.quadcolwid+metricas.quadcolsup);
//	$('#quadro-wrap').width($('#quadro-wrap .row').eq(1).width());
	//$('#quadro').height($(window).height()-$('#quadro-header').height());
	
	//.height(quadro.ids.length*metricas.quadrowhei+metricas.quadrowsup);
}

function computeBestOrgans() {
	var maxcou=0,i,tmp;
	quadro.orgaos=[];
	for(i=0;i<orgaos.count.length;i++) {
		quadro.orgaos.push(i+1);
		if(orgaos.count[i]>maxcou) maxcou=orgaos.count[i];
	}
	for(i=0;i<quadro.orgaos.length;i++) {
		tmp=orgaos.count[$.inArray(quadro.orgaos[i],orgaos.ids)]
		if(!tmp || tmp<maxcou/2) {quadro.orgaos.splice(i,1);i--;}
	}
}

function addToQuadro(id,upd,critica,silent) {		//critica: se true, ele pode alterar as colunas de acordo com as espécies dadas, se false, obedece
	if(isArray(id)) var ids=id.join(','); else {var ids=id;id=[id];}	
	if(id.length==1) if($.inArray(id[0],quadro.ids)>-1) return;		//repetida?

	$.get('compara.php',{id:ids},function(d){
		//$('#quadro .cell img').die('mouseenter').die('mouseleave');
		var data=$.parseJSON(d);
		var nomes=data.ns;
/*		id=[];
		for(var i=0;i<data.ns.length;i++) {
			id.push(data.ns[i].i);
		}*/
		data=data.f;
		var nrows=$('#quadro .rowh').size();
		var ncols=$('#quadro .colh').size();
		var out='';
		var base=quadro.ids.length;
		if(nrows==0) {		//inaugura novo quadro
			$('#quadro').empty();//.sortable({containment:'#quadro'});
//			if(!quadro.orgaos.length) quadro.orgaos=basicorgans.slice(0);			

			// conta para cada órgão quantas fotos há e remove as colunas sem nada
			if(!quadro.orgaos.length) {
				orgaos.count=[];
				for(var i=0;i<data.length;i++) {
					if(orgaos.count[$.inArray(data[i].o,orgaos.ids)]!=undefined)
						orgaos.count[$.inArray(data[i].o,orgaos.ids)]++;
					else
						orgaos.count[$.inArray(data[i].o,orgaos.ids)]=1;
				}		
				computeBestOrgans();
			}
			
			out=out+'<div class="row header">';				
			for(i=0;i<quadro.orgaos.length;i++) {
//				out=out+'<div class="cell col'+quadro.orgaos[i]+' colh"><div class="wrap"><div class="titulo">'+orgaos.n[$.inArray(quadro.orgaos[i],orgaos.ids)]+'</div><div class="button" name="removecol"><img src="images/close.png"/></div><div class="button" name="addtudo"><img src="images/arrow_down.png"/></div><p style="clear:both"/></div></div>';
				out=out+'<div class="cell col'+quadro.orgaos[i]+' colh"><div class="titulo">'+orgaos.n[$.inArray(quadro.orgaos[i],orgaos.ids)]+'</div></div>';
			}
			//out=out+'<div class="cell firstcell"><div class="wrap"><div class="button">L</div><div class="button">M</div><div class="button">S</div></div></div><p style="clear:both"/></div>';
			var set=$('#quadro').append(out).find('.row.header .colh');
			//var set=$('#quadro-wrap .toolbar').after(out).find('.row.header .colh');
			for(i=0;i<set.size();i++) {
				set.eq(i).data({'id':quadro.orgaos[i]});
			}
			resizeQuadro();
			//set.draggable({appendTo:document.body,cancel:'.button',containment:'#quadro',helper:quadroColHelper,start:quadroColStart});
//			set.find('.button').click(quadroColClick);
/*			$('#quadro-wrap .firstcell .button').click(function() {		//clica para mudar tamanhdo dos thumbs
				$('#quadro-wrap .firstcell .button').removeClass('pressed');
				switch($(this).addClass('pressed').html()) {
					case 'L': $('#quadro').removeClass('small').addClass('big');metricas.quadcolwid=(150*2)+4;metricas.quadrowhei=(200*2)+4;break;
					case 'S': $('#quadro').removeClass('big').addClass('small');metricas.quadcolwid=(150*1)+4;metricas.quadrowhei=(200*1)+4;break;
				}
				$('#quadro .image').replaceWith('<div class="placeholder"><img class="loader" src="images/loading.gif"/></div>');
				loadPendingImages();
				resizeQuadro();
			});*/
			
			$('#quadro-header>.cabecalho>.toolbar>.button.single').unbind().click(function(){		//clica para adicionar uma coluna, etc.
				switch($(this).attr('name')) {
					case 'limparquadro':
						clearQuadro(false);
						break;					
					case 'large':
						$(this).hide();
						$('#quadro-header>.cabecalho>.toolbar>.button[name=small]').show();					
						$('#quadro').removeClass('small').addClass('big');
						metricas.quadcolwid=(150*2)+4;metricas.quadrowhei=(200*2)+4;
						$('#quadro .image').replaceWith('<div class="placeholder"><img class="loader" src="images/loading.gif"/></div>');
						loadPendingImages();
						resizeQuadro();
						break;
					case 'small':
						$(this).hide();
						$('#quadro-header>.cabecalho>.toolbar>.button[name=large]').show();					
						$('#quadro').removeClass('big').addClass('small');
						metricas.quadcolwid=(150*1)+4;metricas.quadrowhei=(200*1)+4;
						$('#quadro .image').replaceWith('<div class="placeholder"><img class="loader" src="images/loading.gif"/></div>');
						loadPendingImages();
						resizeQuadro();
						break;
					case 'closequadro':
						showSeparador('pesquisar');
						$('#taxtree li.selected').removeClass('selected');
						if($('#se-pesquisar input[name=id]').size()>0) selectCurrentSpecies();
						updateAddress();
						break;
				}
			});
			$('#quadro-header>.cabecalho>.toolbar>.button.toggle').unbind().mouseenter(function(){		//clica para adicionar uma coluna
				//$(this).toggleClass('pressed');
				switch($(this).attr('name')) {
					case 'addcol':
						if($('#menu-org').is(':visible')) break;
						var out='';
						var j;var c;
						$(this).stop(true,false);
						countFotosOrgaos();
					
						for(var i=0;i<orgaos.ids.length;i++) {
							if(orgaos.count[i]>0) out+='<li name="'+orgaos.ids[i]+'">'+orgaos.n[i]+' ('+orgaos.count[i]+')</li>';
						}
						var pos=$(this).position();
						$('#menu-org').empty().html('<ul><li name="-1"><span style="font-size:0.7em"><i>só órgãos principais</i></span></li>'+out+'</ul>')
							.css({left:pos.left,top:pos.top+$(this).height()+7})
							.hover(function(){
								$('#quadro-header>.cabecalho>.toolbar>.button[name=addcol]').stop(true,false);
							},function(){
								$('#quadro-header>.cabecalho>.toolbar>.button[name=addcol]').delay(100).queue(function(){
									$('#menu-org').unbind('mouseleave').hide('slide',{easing:'easeOutCubic',direction:'up'},400);
									$(this).dequeue();
								});
							})
							.show('slide',{easing:'easeOutCubic',direction:'up'},400).find('li')
							.click(function(){
								//$('#quadro-wrap>.toolbar>.button[name=addcol]').click();
								$('#menu-org').unbind('mouseleave').hide('slide',{easing:'easeOutCubic',direction:'up'},400);
								addOrgao(parseInt($(this).attr('name')),true);
								});	// adiciona órgão
//							.effect('slide',{direction:'up'},150).find('li').click(function(){$('#quadro-wrap>.toolbar>.button[name=addcol]').click();addOrgao(parseInt($(this).attr('name')),true);});	// adiciona órgão

							$('#quadro-header>.cabecalho>.toolbar>.button[name=addcol]').delay(5000).queue(function(){
									$('#menu-org').unbind('mouseleave').hide('slide',{easing:'easeOutCubic',direction:'up'},400);
									$(this).dequeue();
								});
							break;
				}
			}/*,function(){
				$(this).stop(true,false).toggleClass('pressed');
				switch($(this).attr('name')) {
					case 'addcol':
						$('#menu-org').unbind('mouseleave').hide('slide',{easing:'easeOutCubic',direction:'up'},400,function(){$(this).remove();});
						break;
				}
				
			}*/);
		}			// END inaugura novo quadro
		
		if(critica) {		// acrescenta órgãos essenciais quando se adiciona nova planta
			for(i=0;i<data.length;i++) {
				if($.inArray(data[i].o,quadro.orgaos)==-1 && $.inArray(data[i].o,basicorgans)>-1){
					addOrgao(data[i].o,false);
				}
			}
		}
		for(var i=0;i<id.length;i++) {
			quadro.ids.push(id[i]);	
//			quadro.ids.splice(0,0,id[i]);
			for(j=0;j<nomes.length;j++) {
				if(nomes[j].i==id[i]) {quadro.nomes.push(nomes[j].n);break;}
				//if(nomes[j].i==id[i]) {quadro.nomes.splice(0,0,nomes[j].n);break;}
			}
			cmp.linhas.push(new Array());
			cmp.ids.push(id[i]);
			//quadro.linhas.splice(0,0,new Array());
		}

		for(i=0;i<data.length;i++) {
			posi=$.inArray(data[i].i,cmp.ids);	//<div class="br"/><div class="ur"/><div class="ul white"/>
			if(data[i].p.length==0)
				var prior=0;
			else
				var prior=$.inArray(1,data[i].p);
			cmp.linhas[posi][data[i].o]='<div class="cell col'+data[i].o+'"><input type="hidden" name="all" value="'+data[i].f+'"/><input type="hidden" name="def" value="'+data[i].f[prior]+'"/><div class="placeholder"><img class="loader" src="images/loading.gif"/></div></div>';
//			cmp.linhas[posi][data[i].o]='<div class="cell row'+data[i].i+' col'+data[i].o+'"><div class="wrap"><div class="placeholder small" name="thumbs/'+data[i].f+'.jpg"><img class="loader" src="images/loading.gif"/></div></div></div>';
		}
		// make rows
		for(i=0;i<id.length;i++) {
//			out='<div class="rowh row'+quadro.ids[base+i]+'"><p>'+quadro.nomes[base+i]+'</p><div class="button" name="remover"><img src="images/delete_32.png"/><span>remover</span></div><div class="button" name="abrir">abrir</div></div>';
			for(j=0;j<nomes.length;j++){if(id[i]==nomes[j].i) break;}
			if(j==nomes.length) alert("Erro no quadro! ID: "+id[i]+" não encontrado.");
			var oj=j;out='';
			for(j=0;j<quadro.orgaos.length;j++) {	//compacta em string
				posi=$.inArray(id[i],cmp.ids);
				if(cmp.linhas[posi][quadro.orgaos[j]])
					out=out+cmp.linhas[posi][quadro.orgaos[j]];
				else		// célula vazia
					out=out+'<div class="cell col'+quadro.orgaos[j]+' blank"></div>';	//<p>sem foto</p>
			}
			if(territorio == 'lu')
				out=out+'<div class="cell"><img src="'+nomes[oj].g+'_'+nomes[oj].sp+(nomes[oj].ssp ? '_'+nomes[oj].ssp : '')+'.jpg" style="height:200px;margin:2px;"/></div>';
				
			out=out+'<div class="cell rowh"><div class="wrap"><p>'+nomes[oj].n+'</p><div class="buttonquadro" name="remover">remover linha</div><div class="buttonquadro"><a href="#1' + nomes[oj].n.replace(/<(?:.|\n)*?>/gm, '').replace(' ','+') + '">ficha da espécie</a></div>';
			if(nomes[oj].tc)
				out = out + '<img src="images/'+nomes[oj].tc+'.png" style="width:35px; height:35px; margin-top:8px"/>';

			out = out + '</div></div>';

			$('#se-comparar').scrollTop(0);
			out='<div class="row corpo row'+id[i]+'">'+out+'<p style="clear:both"/></div>'
			$(out).insertAfter('#quadro .row.header').data({'id':id[i]}).children('.rowh').draggable({
				cancel:'.button',containment:'#quadro',start:quadroStart,helper:quadroRowHelper
				,cursor:'move'}).parent().find('.rowh .buttonquadro').click(quadroRowClick);
				/*.draggable({cancel:'.button,p',appendTo: document.body,helper:quadroRowHelper,start:quadroStart
					,containment:'#quadro'}).children('.button').click(quadroRowClick);			*/
		}
//		$('#quadro .cell').not('.blank').children('.wrap').children('img').unbind('click').click(function(){moveToBancada($(this));});
		if(!silent) {
			showSeparador('comparar',false);
			$('#taxtree li.selected').removeClass();
			$('#linksspp li.selected').removeClass();
			var ids=getQuadroIDs();
			selectSpecies(ids);
		}		
		if(upd) updateAddress();
		loadPendingImages();
		resizeQuadro();
	});
}

/*function quadroColClick() {
	switch($(this).attr('name')){
		case 'removecol':
			if($('#quadro .colh').size()==1) {dispInfo("não pode eliminar todas as colunas",$(this));return;}
			removeColFromQuadro([$(this).parent().parent().data('id')],true);
			break;
		case 'addtudo':
			var no=$(this).parent().parent().data('id');
			var set=$('#quadro .col'+no).not('.colh').children('.image');
			moveToBancada(set);
			break;
	}
}*/

function quadroColStart(e,ui){
	var nc=$(e.target).data('id');
	$('#quadro .col'+nc).css('opacity','0').animate({width:5},function(){
		$(this).addClass('tmp');
//	$(this).hide();
	});
}

function quadroColHelper(event){
	var nc=$(event.target).parent().data('id');
	return($('#quadro .col'+nc).clone().appendTo('#se-comparar').wrapAll('<div class="quadro" style="width:'+metricas.quadcolwid+'px;"/>').parent());				
}

function quadroRowHelper(event){
	var nr=$(event.target).parent().parent().data('id');
	//return($('.row'+nr).clone().appendTo('#se-comparar').wrapAll('<div class="quadro" style="width:'+(quadro.orgaos.length*metricas.quadcolwid+metricas.quadcolsup)+'px"/>').parent());
	//return($('.row'+nr).clone().appendTo('#se-comparar').wrapAll('<div class="quadro small"/>').css({width:quadro.orgaos.length*metricas.quadcolwid+metricas.quadcolsup+metricas.botaoaddcol}).parent());
	return($('.row'+nr).clone().appendTo('#se-comparar').wrapAll('<div class="quadro '+($('#quadro').hasClass('big') ? 'big' : 'small')+'"/>').css({width:$('#quadro').width()}).parent());
}

function quadroStart(e,ui){
	var nr=$(e.target).parent().data('id');
	$('#quadro .row'+nr).animate({height:0},300,function(){$(this).hide();/*$(this).addClass('tmp');*/});
}

function quadroRowClick(){
	var nam=$(this).attr('name');
	switch(nam) {
		case 'remover':
			var remid=$(this).parent().parent().parent().data('id');
			var set=$('#taxtree li.selected');
			for(var i=0;i<set.size();i++) {
				if(set.eq(i).data('d').id==remid) {set.eq(i).removeClass('selected');break;}
			}
			removeFromQuadro(remid);
//			if($('#quadro .rowh').size()==0) {alert(1);clearQuadro(false);}//dispInfo("não pode eliminar todas as linhas",$(this));return;}
			break;
/*		case 'abrir':
			var id=$(this).parent().parent().parent().data('id');
			displaySp(id,true,true,false);
			break;*/
	}
}

function removeColFromQuadro(org,upd) {
	var orgs=getQuadroOrgs();
	//if($('#quadro .rowh').size()==1) return;
	for(var i=0;i<org.length;i++) {
		$('#quadro .col'+org[i]).css({visibility:'hidden'}).animate({width:1},function(){
			var id=getVal($(this).attr('class'),'col');
			$(this).remove();
			if($('#quadro .col'+id).size()==0){
				if(upd) updateAddress();
				resizeQuadro();
			}
		});		
		var ncol=$.inArray(org[i],orgs);
		quadro.orgaos.splice(ncol,1);
		orgs.splice(ncol,1);
	}
}

function removeFromQuadro(id) {
	if(isArray(id)) {
		for(var i=0;i<id.length;i++) removeFromQuadro(id[i]);
		return;
	}
	var ids=getQuadroIDs();	
/*	alert(ids);
	alert(quadro.ids);*/
	var nrow=$.inArray(id,ids);
	if(nrow<0) return;
	
	//$('#quadro .row'+id).fadeOut(function(){$(this).remove();updateQuadroAddress();});
	$('#quadro .row'+id).addClass('removing').css({visibility:'hidden'}).animate({height:0},350,'easeInOutQuint',function(){
		$(this).remove();
		if($('#quadro .row.corpo').size()==0) {
			//clearQuadro(true);
		} else {
			if($('#quadro .row'+id).size()==0){
				//se há alguma coluna vazia, remove
				var remo=[];
				for(var i=0;i<quadro.orgaos.length;i++) {
	//				alert($('#quadro .col'+quadro.orgaos[i]).not('.blank,.colh').size());
					if($('#quadro .col'+quadro.orgaos[i]).not('.blank,.colh').size()==0) {
						remo.push(quadro.orgaos[i]);
					}
				}
				removeColFromQuadro(remo,false);
				updateAddress();
				//alert(quadro.ids);
				//$('#quadro-wrap').height(quadro.ids.length*metricas.quadrowhei+metricas.quadrowsup);
			}
		}
	});
	quadro.ids.splice(nrow,1);
	quadro.nomes.splice(nrow,1);
	var nrow=$.inArray(id,cmp.ids);
	cmp.linhas.splice(nrow,1);
	cmp.ids.splice(nrow,1);
	if($('#quadro .rowh').size()==1) clearQuadro(false);
}

function hideAllInfo() {
	$('.floatinfo-el').stop(true,false).each(function(){
		$(this).animate({top:-$(this).height()-7},300,'easeOutQuad',function(){$(this).parent().remove();});
	});
}

function dispInfo(msg,el,id,width,height,upside) {
	return;
	var pos=el.offset();
	var wid=el.width();
	var hei=el.height();
	var x=pos.left+wid/2-100;
	if(upside)
		var y=pos.top-height;
	else
		var y=pos.top+hei;
	if(x<0) x=0;
	if(!id) var id="di"+Math.floor(Math.random()*10000);
	var fi=$('<div class="floatinfo"><div id="'+id+'" class="floatinfo-el"><p></p></div></div>').appendTo('body');
	if(width) {
		fi.css({width:width+10,height:height+12}).children('.floatinfo-el').css({width:width,height:height,border:0}).children('p').css({margin:0});
		var delta=height+7;
	} else var delta=45;
	fi.css({left:x,top:y}).show();
	if(upside)
		fi.children('.floatinfo-el').children('p').html(msg).parent().css({top:delta,display:'block'}).animate({top:0},300,'easeOutQuad').delay(2000).animate({top:delta},300,'easeOutQuad',function(){$(this).parent().remove();});	
	else
		fi.children('.floatinfo-el').children('p').html(msg).parent().css({top:-delta,display:'block'}).animate({top:0},300,'easeOutQuad').delay(2000).animate({top:-delta},300,'easeOutQuad',function(){$(this).parent().remove();});
	return(id);
}

function wait(el) {
	$('.floating').hide();
	if(!el) {
		$('#se-loader').css({display:'block',opacity:1,top:0});
	} else {
		var pos=el.offset();
		$('<div class="loader"><p>Carregando...</p></div>').appendTo('body').css({width:el.width(),height:el.height(),left:pos.left,top:pos.top});
	}
}

function waitEnd() {
	$('#se-loader').css({display:'none',opacity:0});//fadeOut();
}

function isWaiting() {
	return($('#se-loader').is(':visible'));
}

function selectCurrentSpecies() {
	$('#taxtree li.selected').removeClass('selected');
	switch($('.separador.selected').attr('id')) {
		case "se-pesquisar":
			if($('#se-pesquisar input[name=id]').size()>0) {
				if($('#se-pesquisar input[name=id]').val()!='')	selectSpecies($('#se-pesquisar input[name=id]').val().split(',')); else return;
			}
			break;
		case "se-comparar":
			selectSpecies(getQuadroIDs());
			break;
	}
}

function toolbarResultadosClick() {
	if($(this).hasClass('smallicons')) iconSize(2,0);
	if($(this).hasClass('largeicons')) iconSize(1,0);
}

function pesquisaCriterios(adiciona,tipopesquisa) {
	var i,atrs=[],q=[];
	
	if($('.pesquisaavanc').size()>0) {
		$('.pesquisaavanc .close').click();
	}

	if($('.separador:visible #criteriospesquisa input[type=hidden]').size()>0)
		var pesq=$('.separador:visible #criteriospesquisa input[type=hidden]').map(function() {return(this.value);}).get();
	else {
		if($('.separador:visible #camadavisivel input[name=pesq]').size()>0) 
			var pesq=$(' #camadavisivel input[name=pesq]').val().split(',');
		else if(adiciona) var pesq=[];
	}
	if(pesq.length==0 && !adiciona) {
		switch(tipopesquisa) {
			case 2: gotoAddr('w');limpaMapa(1);break;
			default: gotoAddr('1');break;
		}
		return;
	}
	for(i=0;i<pesq.length;i++) {
		if(parseInt(pesq[i])>0) atrs.push(parseInt(pesq[i])); else q.push(pesq[i]);
	}
	if(adiciona) q.push(adiciona);
	if(q.length>0 || atrs.length>0) {
		if(atrs.length==0) atrs=null;
		switch(tipopesquisa) {
			case 2:
				removeWebsigDrawnItems();
				showSeparador('webgis');
//				if(limitept) limitept.setMap(mapwebgis);
				if(limitept[1]) mapwebgis.addLayer(limitept[1]);
				displayQuadOnMap3(mapwebgis,q.join(','),atrs,{upd:true,limpa:true});
				break;
				
			default:
				makePesquisa(q.join(','),false,false,true,atrs,false);
				break;
		}
	}
}

function attachBestCharacterSuggestions() {
	// show next best character in suggestions
	$('#se-pesquisar .link.mostraroutro').click(function() {
		$(this).parents('.caracter').remove();
	});
	
	$('#se-pesquisar .link.mostrarmais').click(function() {
		$(this).parents('.criteriabar').addClass('expanded');
		sessionStorage.setItem("showCharactersExpanded", true);
	});
}

function attachChartsEvents() {
	var gtb = document.querySelector('#statCharts h2');
	if(gtb) gtb.addEventListener('click', function(ev) {
		if(document.getElementById('statCharts')) {
			document.getElementById('statCharts').classList.toggle('collapsed');
/*			console.log(charts);
			console.log(chartsData);*/
/*			for(var i=0; i<charts.length; i++)
				charts[i].draw(chartsData[i]);*/
			sessionStorage.setItem("showStatsExpanded", !document.getElementById('statCharts').classList.contains('collapsed'));
			document.querySelector('#statCharts .link').innerHTML = document.getElementById('statCharts').classList.contains('collapsed') ? 
				'ampliar' : 'reduzir <span class=\"info\">(clique nas categorias para filtrar)</span>';
		}
	});
	
	if(sessionStorage.getItem("showStatsExpanded") != null && sessionStorage.getItem("showStatsExpanded") == 'true') {
		if(document.getElementById('statCharts')) {
			document.getElementById('statCharts').classList.remove('collapsed');
			document.getElementById('statCharts').classList.remove('nodisp');
			document.querySelector('#statCharts .link').innerHTML = document.getElementById('statCharts').classList.contains('collapsed') ? 
				'ampliar' : 'reduzir <span class=\"info\">(clique nas categorias para filtrar)</span>';
		}

	}
}

function onPesquisaLoad() {
	caixaPesquisaToSmall(true);
	if($('input[name=pagetitle]').val()) document.title=$('input[name=pagetitle]').val()[0].toUpperCase() + $('input[name=pagetitle]').val().substring(1);
	hideLeftIfSmall();
	
	if($('.separador.selected').attr('id')!='se-pesquisar') {showSeparador('pesquisar');showLeft(false,0);}
	if($('input[name=identagrup]').size()>0)	{	// é ficha de espécie
		onDisplaySpLoad(true);
		return;
	} else {
/*		var qs=$.address.value().substr(1,1);
		if(qs=='z') {showBancadaIdentificacao(false);return;}*/
		if($('#pesquisa-content input[name=familia]').size()>0 || $('#pesquisa-content input[name=ordem]').size()>0) {
			onDisplayFamiliaLoad();
			return;
		} else
			$('#pesquisa-content').removeClass().addClass('resultados');
	}
	
	if($('#floracao').size()==1) drawFloracao('floracao',$('#pesquisa-content input[name=floracao]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'Floração',subtitle:'destas espécies',pad:[5,0,0,12],interactive:true});
	if($('#dispersion').size()==1) drawFloracao('dispersion',$('#pesquisa-content input[name=dispersion]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'Frutificação',subtitle:'destas espécies',pad:[5,0,0,12],interactive:true});
	
	//$('#q1').focus();
	
	$('#dica').hide();

	$('#pesquisa-content').removeClass('identifica');
	waitEnd();
		
	var thumb=$('#pesquisa-content').find('.thumbnail');
//		$('#pesquisa-content .button').add('#pesquisa-content .identinter').tooltip({track:true,delay:0,showURL:false,showBody:' - ',fade:200});
	attachBaloonTip($('#pesquisa-content .showtooltip'),{wid:220,style:{textAlign:'justify'}},[0,0],{anim:true,rad:10,curv:5,padding:8});
	attachBaloonTip($('#pesquisa-content .tag'),{wid:220,style:{textAlign:'justify'}},[0,-3],{anim:true,rad:10,curv:5,padding:8,fixed:true});

//		$('#pesquisa-content .link').tooltip({track:true,delay:0,showURL:false,showBody:' - ',fade:200});
	$('#pesquisa-content .button').click(toolbarResultadosClick);

	attachAddCriterio();

	$('#se-pesquisar .tagaggreg .tag.link').click(function() {
		$(this).remove();
		pesquisaCriterios(null,1);
	});

	attachBestCharacterSuggestions();
	
	$('#se-pesquisar .link.collapse').click(function() {
		$('.morphotable').toggleClass('collapsed');
		sessionStorage.setItem("showMorphoTableCollapsed", $('.morphotable').hasClass('collapsed'));
	});

//	attachComoCitar('#se-pesquisar .download.mapa a');
	if($('#se-pesquisar .download.mapa a').size() > 0)
		attachComoCitar2($('#se-pesquisar .download.mapa a'),$('#se-pesquisar .download.mapa a').attr('href').replace(/.[a-z]{3}$/gi,''));
	$('#se-pesquisar .download.tabela a').click(function(ev) {
		wait();
		setTimeout("waitEnd();",3000);
	});

	/*if(window.location.hash.substring(1)=='' && window.location.search.substring(1)=='')
		$('#se-pesquisar').scrollTop(0);*/
	
	$('#se-pesquisar').unbind('scroll').scroll(function() {
		sessionStorage.setItem("scrollValue_".pathName, $('#se-pesquisar').scrollTop());
	});

	if (sessionStorage.getItem("scrollValue_".pathName) != null) {
        $('#se-pesquisar').scrollTop(sessionStorage.getItem("scrollValue_".pathName));
    }
    
	if(sessionStorage.getItem("showCharactersExpanded") != null && sessionStorage.getItem("showCharactersExpanded")) {
		if(document.getElementById('bestcharacter')) {
			document.getElementById('bestcharacter').classList.add('expanded');
		}
	}

	if(sessionStorage.getItem("showMorphoTableCollapsed") != null && sessionStorage.getItem("showMorphoTableCollapsed")) {
		if(document.getElementById('morphotable')) {
			document.getElementById('morphotable').classList.add('collapsed');
		}
	}

	attachChartsEvents();

	//	shakeBut();
}

function attachAddCriterio() {
	$('#se-pesquisar .addcritinput').keyup(function(ev) {
		clearTimeout(sugtimeout);
		switch(ev.which) {
			case 13:
				 pesquisaCriterios($(this).val(),1);
				 break;
			default:
				sugtimeout=setTimeout("caixaKeyUpPequena('#se-pesquisar .addcritinput','#sugcontainer')",400);
				break;
		}
	}).click(function() {
		$(this).val('');
		var thisel=this;
		var pos=$(this).offset();
		var wid=$(this).width();
		//var cars=$('#se-pesquisar .identificador').html();
		var cars = '';
		showBaloonTemplate({wid:420,style:{textAlign:'left'},classes:'ident'}//'<div class="janela semnada" style="position:absolute;width:420px;text-align:left"><div class="content" style="width:100%">{1}</div></div>'
			,'<h1>Refine a sua pesquisa especificando mais critérios</h1><p>Pode acrescentar aqui quaisquer critérios de pesquisa (veja exemplos na página inicial)."'+(cars=='' ? '</p>' :' Para distinguir estas espécies, sugerimos:<br/><br/></p>'+cars)
			,{elem:$(this)},true,{rad:12,curv:6,padding:8,anim:true});
		$('.baloon .mosaico span').click(function() {
			makePesquisa($(this).text(),true,false,true,null,false);
			//pesquisaCriterios($(this).text());
		});
		
		$('.baloon .tagaggreg .tag').hover(function() {
			if($(this).attr('title')) {
				$(this).data('title',$(this).attr('title'));
				$(this).removeAttr('title');
			}
			var tit=$(this).data('title');
			$('<div class="floating tooltip">'+tit+'</div>').css({paddingTop:10,top:$(this).offset().top+$(this).height()+5,left:$(this).offset().left,maxWidth:340}).appendTo('body').show('slide',{direction:'up',easing:'easeOutCubic'},250);
		},function() {
			$('.tooltip').stop(true,true).fadeOut(500,function() {$(this).remove();});
		});
	}).blur(function() {
		//if($.trim($(this).val())=='') {
		$(this).val('adicionar critério...');
		$('#detalhe-registo').remove();

	});
}

/*
function shakeBut() {
	$('#se-pesquisar .download img').animate({width:36,height:36}, 400, 'easeInOutCubic',function(){
		$('#se-pesquisar .download img').animate({width:32,height:32}, 200, function(){
			shakeBut();
		});
	});
}*/
    
function makePesquisaAtr(idatr){		// adiciona atr à pesquisa que já existe
	if(!isArray(idatr)) idatr=[idatr];
	var qs=getPesquisaQueryString().proc;

	if(!qs[1])
		makePesquisa(qs[0],false,false,true,idatr,false);
	else {
		var atrs=(qs[1].split('+'));
		for(var i=0;i<idatr.length;i++) {
			if($.inArray(idatr[i],atrs)==-1) atrs.push(idatr[i]);
		}
		makePesquisa(qs[0],false,false,true,atrs,false);
	}
}

function makePesquisa(q,silent,sogenero,upd,atrs,expandfamilia) {		// silent se true apenas faz pesquisa e nada mais!
	if(q=='' && !atrs) return;
	$('#se-pesquisar').unbind('scroll');
	$('#q1').val(q.replace(/&ord=[a-z]{1,3}/i, ''));
	q=q.prepareString();
//	if(upd) {if(!addressValue((sogenero?'6': (expandfamilia?'9':'1'))+q+(atrs?("/"+atrs.join('+')):""))) return;}
	if(upd) {if(!addressValue((expandfamilia?'9':'1')+q+(atrs?("/"+atrs.join('+')):""))) return;}
	$('#taxtree li.selected').removeClass('selected');
	
	wait();
	$('#sugestoes-wrap').hide();
	clearTimeout(sugtimeout);
	// if(sogenero) var suf="g="; else 
	var suf="q=";
//	if(q.match(/^(?:(.*\W{1,})|())aqui(?:(\W{1,}.*)|())$/)) {
	if(q.match(/(^|\W+)aqui(\W+|$)/i)) {
		if(!navigator.geolocation) {
			waitEnd();
			makePesquisa(q.replace(/(^|\W+)aqui(\W+|$)/ig,"$1$2"),silent,sogenero,upd,atrs,expandfamilia);
			messageBox('<h1>Não é possível obter a sua posição geográfica</h1><p>O seu browser não suporta esta funcionalidade. Actualize para um browser mais recente, ou use a pesquisa de proximidade <img src="images/locate_gd.png" style="vertical-align:middle"/> para clicar no mapa o local onde se encontra.</p>',null,{wid:300,closeonclick:true,temporizador:8000});
		} else {
			wait();
			navigator.geolocation.getCurrentPosition(function(posi) {
				makePesquisa(q.unprepareString().replace(/(^|\W+)aqui(\W+|$)/ig,'$1perto:'+(Math.round(posi.coords.latitude*10000)/10000)+' '+(Math.round(posi.coords.longitude*10000)/10000)+'$2'),silent,sogenero,upd,atrs,expandfamilia);
			},function(error) {
				waitEnd();
				makePesquisa(q.replace(/(^|\W+)aqui(\W+|$)/ig,"$1$2"),silent,sogenero,upd,atrs,expandfamilia);
				messageBox('<h1>Não foi possível obter a sua posição geográfica</h1><p>Experimente com outro browser, ou use a pesquisa de proximidade <img src="images/locate_gd.png" style="vertical-align:middle"/> para clicar no mapa o local onde se encontra.</p>',null,{wid:300,closeonclick:true,temporizador:8000});
			},{timeout:3000});
		}
	} else {
		saveDistribuicao();
		var args=[];
		if(q!='') {
			var orderArg = /(.+)&ord=([a-z]{1,3})/i.exec(q.unprepareString());
			if(orderArg) {
				args.push(suf+orderArg[1].prepareString());
				args.push('ord=' + orderArg[2].prepareString());
			} else
				args.push(suf+q);
		}
		if(expandfamilia) args.push("ex=1");
		if(atrs) args.push("a="+atrs.join('+'));
		args.push("wid="+($('#pesquisa-content').width()-20));
//		alert(	$('#pesquisa-content').width());
		$('#pesquisa-content').empty().load("pesquisa-ylem1.php?"+args.join('&'),function(){onPesquisaLoad();});
	}
}

function warnMsg(msg) {
	if($('#veu').css('display')=='none') {
		$('#veu').css({'display':'block',opacity:0}).animate({opacity:0.6},400).delay(2000).queue(function(){hideMsg();$(this).dequeue();});
		$('#warning').html(msg).show();
	} else
		$('#warning').html(msg);
}

function hideMsg() {$('#warning').clearQueue().hide();$('#veu').clearQueue().fadeOut();}

function buildQuadro(quadrostr) {
	if(!addressValue('4'+quadrostr)) return;
	caixaPesquisaToSmall(true);		
	$('.puxador').show();
	hideBancada();
	$('#warnmsg').hide();			
	var nos=decode64(quadrostr.substr(0,1),[4]);
	var sizes=[];
	for(var i=0;i<nos[0];i++) sizes[i]=5;
	sizes.splice(0,0,4);			
	if($('#leftc-1').offset().left<-50) showLeft(false);
	clearQuadro(false);
	quadro.orgaos=decode64(quadrostr,sizes);
	quadro.orgaos.splice(0,1);
	var ids=quadrostr.substr(Math.ceil((nos[0]*5+4)/6)).cut(4);
	addToQuadro(ids,false,false,false);
}

function onExternalChange(info) {
	if(externalChangeDormancy) return;
	externalChangeDormancy=setTimeout("externalChangeDormancy=null;",300);
//console.log('pesquisa'+Math.random());
	$('#leftc-1').show();
//	if(info.path.substr(1,1)!='') $('#sidebar').hide();
	ga('send', 'pageview', info.path);
	
	switch(info.path.substr(1,1)) {
		case 'i':		// índice temático
			showSeparador('indicetematico');
			break;
		case '0':		// ficha espécie
		case '7':
			caixaPesquisaToSmall(true);
			$('.puxador').show();			
			hideBancada();
		case 'h':		// highres viewer			
			if(osdViewer) osdViewer.world.removeAll();
			if($('#leftc-1').offset().left<-50) showLeft(false);
			displaySp(info.path.substr(2),false,true,(info.path.substr(1,1)=='0'?false:true));
			break;
		case '9':		// pesquisa em que expande família, caso o seja
		case '1':		// pesquisa
		case 'w':		// webSIG
			$('.puxador').show();
			if($('#leftc-1').offset().left<-50) showLeft(false);
		case 'z':		// identificação interactiva
			caixaPesquisaToSmall(true);		
			$('#taxtree li.selected').removeClass('selected');
			
			hideBancada();
			var qs=info.path.substr(2).split('/');
			var q=decodeURIComponent(qs[0].replace(/[\*]/gi,',').replace(/[\+]/gi,' '));
			//$('#q').val(decodeURIComponent(q));
			$('#chosenatrs .atributo').remove();
			if(!qs[1]) var atrs=null; else var atrs=qs[1].split('+');
			switch(info.path.substr(1,1)) {
				case 'z':
					if(info.path.substr(2)=='') {document.title='Identificação interactiva | ' + pageTitle;showBancadaIdentificacao(false,{'arr':null,'n':0},null);break;}
					$('#leftc-1').hide();
					if(qs[1]) var atrs=(qs[1].split('+'));
					if(q=='' && !atrs) {document.title='Identificação interactiva | ' + pageTitle;showBancadaIdentificacao(false,{'arr':null,'n':0},null);break;}
					q=q.prepareString();
					if(q=='') {
						document.title='Identificação interactiva | ' + pageTitle;
						showBancadaIdentificacao(false,{'arr':null,'n':0},atrs);
					} else {
						$.get("pesquisa-ylem1.php?sil=1&q="+q,function(d){
							if(d.substr(0,1)!='{') {		// não é JSON, é HTML portanto
								$('.puxador').show();
								$('#leftc-1').show();
								showLeft(false);
								$('#pesquisa-content').html(d);
								if($('input[name=pagetitle]').val()) document.title=$('input[name=pagetitle]').val();
								onDisplaySpLoad(true);
							} else {
								var idsel=$.parseJSON(d);
								document.title='Identificação interactiva: '+idsel.title;
								showBancadaIdentificacao(false,toBin(idsel.ids),atrs);
							}
						});
					}

	/*				var args=['sil=1'];
					var args=[];
					if(q!='') args.push('q='+q);
					if(qs[1]) {
						if(atrs) args.push("a="+atrs.join('+'));
					}*/
					break;
				case 'w':
					removeWebsigDrawnItems();
					showSeparador('webgis');
//					if(limitept) limitept.setMap(mapwebgis);
					if(limitept[1]) mapwebgis.addLayer(limitept[1]);
					if(subdomain) {
						var imageUrl = 'getsvgpoly?width=1000';
						L.imageOverlay(imageUrl, latlngbnd_leaf.pad(0.01)).addTo(mapwebgis);
					}

					var defaultLayer = territorio == 'ma' ? 0 : 1;
					$('#webgis-mapa .menu.leaflet-control input').eq(defaultLayer).click();
					handleResize();
					if((q=='' || !q) && !atrs) {
						document.title='Mapas interactivos - distribuição da flora | ' + pageTitle;
						limpaMapa(1);
						setDrawWKTVisibility(true);
					} else {
						if(q == 'wkt-search') {
							setDrawWKTVisibility(false);
							break;
						} else {
						    setDrawWKTVisibility(true);
							displayQuadOnMap3(mapwebgis,q,atrs,{limpa:true});
						}
					}
					if(!bemvindowebsig) {
						bemvindowebsig=true;
						if(q.match(/^id[0-9]{4}$/)) break;
						var exemplos=['arbustos','floração agosto','árvore','leguminosa','cistus','montanha','fetos'];
						exemplos=exemplos[Math.floor((Math.random()*exemplos.length))];
						messageBox('<h1>Bem vindo ao WebSIG!</h1><p class="descricao"></p><p>- Qualquer pesquisa que efectuar na caixa de pesquisa será agora representada directamente no mapa.<br/>P.ex.: <a href="#w'+exemplos.replace(' ','+')+'">'+exemplos+'</a></p><p>- Clicando no explorador taxonómico pode adicionar e sobrepor camadas de espécies.</p><p class="link" style="text-align:center">fechar</p>',null,{wid:300,classes:'fixed',closebutton:true,closeonclick:true,resizeEvent:true});
					}					
					break;
				case 'h':
					//showSeparador('pesquisar');
					if(info.path.substr(2)=='') {homePage();break;}
					$.address
					makePesquisa(q,false,false,false,atrs,(info.path.substr(1,1)=='9' ? true : false));
					break;
				default:
					showSeparador('pesquisar');
					if(info.path.substr(2)=='') {homePage();break;}
					makePesquisa(q,false,false,false,atrs,(info.path.substr(1,1)=='9' ? true : false));
					break;
			}
			break;
			
		case '2':
			caixaPesquisaToSmall(true);		
			$('.puxador').show();
			hideBancada();
			if($('#leftc-1').offset().left<-50) showLeft(false);
			displayFamilia(info.path.substr(2));
			break;
		case '3':
			alert("help");
/*			hideBancada();
			makePesquisaAtr();*/
			break;
		case '4':			// quadro comparativo
			buildQuadro(info.path.substr(2));
			break;
			
		case 'd':	// quadro comparador de caracteres distintivos			
			if(window.location.search.substring(1)!='') {
				window.location='#'+info.path;
				return(false);
			}
			showComparaCaract();
			var grupo=info.path.substr(2);
			$('#comparacaract .bancada').empty().load('getbancada.php?d='+grupo,function(d){
				var wid=$(window).width();
				$(this).scrollTop(0).find('.caracter').draggable({handle:'.titulo,img,.drawing',stack:'.caracter'})/*.each(function() {
					var hei=$(this).find('.subtitulo').map(function() {return($(this).height());}).get();
					var maxi=-10;
					for(var i=0;i<hei.length;i++) {
						if(hei[i]>maxi) maxi=hei[i];
					}
					$(this).find('.subtitulo').css({height:maxi});
				})*/.find('.button2.info').click(function() {
					displaySp($(this).parents('.wrap').find('input[name=ident]').val(),true,true);
				});
				handleResize();
				$(this).find('.caracter .subtitulo').css({opacity:0.7}).click(function() {
					$(this).hide('slide',{direction:'up',easing:'easeInOutQuint'},500).delay(2000).show('slide',{direction:'up',easing:'easeInOutQuint'},500);
//					$(this).animate({opacity:0.2},200);
				});

				$('#comparacaract .header .titulo').html($(this).find('input[name=tema]').val());
				$(this).find('.placeholder').each(function() {
					var guid=$(this).siblings('input[name=guid]').val();
//					var imel=$('<img style="position:absolute;top:0px;left:0px;" class="image" src="showfoto.php?f='+guid+'"/>').css({opacity:0}).insertAfter($(this));
					var imel=$('<img style="position:absolute;top:0px;left:0px;" class="image" src="gen-sp_'+guid+'.jpg"/>').css({opacity:0}).insertAfter($(this));
					imel.load(function(){
						var newel=$(this).parents('.wrap');
						var off=newel.find('.placeholder').position();
						newel.find('.image').css({top:off.top}).animate({opacity:1},function(){
							newel.find('.placeholder').remove();
							$(this).css({position:'static'});
							var annots=$.parseJSON(newel.children('input[name=ps]').val());
							if(annots) {
								var id=Math.floor(Math.random()*1000);
								var a;
//								alert($(this).position().top);
								$('<div id="annots'+id+'" class="drawing"></div>').appendTo(newel).css({left:2,top:$(this).position().top+2,width:480,height:640});//left:wrap.position().left,top:wrap.position().top,
								var canvas=Raphael('annots'+id,480,640);
								a=canvas.add(annots);
								a.attr({opacity:0,transform:'s1.5'});//,transform:'s6','stroke-width':30});
								a.animate({opacity:1,transform:'s1'},2300,'back-out');
								$('#annots'+id).data('canvas',canvas);
							}
						});
						
					});
				});
			});
			break;

		case 'y':	// quadro comparador de caracteres distintivos			
			if(window.location.search.substring(1)!='') {
				window.location='#'+info.path;
				return(false);
			}
			showComparaCaract();
			var grupo=info.path.substr(2);
			$('#comparacaract .bancada').empty().load('getbancada.php?d1='+grupo);
			break;
			
		case '5':	// bancada de trabalho com fotos à escolha
		case 'c':	// bancada de trabalho para comparar caracteres
			if(window.location.search.substring(1)!='') {
				window.location='#'+info.path;
				return(false);
			}

			$('.puxador').show();
			if(info.path.substr(1,1)=='5') {
				var req='q='+info.path.substr(2);
				$('#bancada').removeClass('distcars');
			} else {
				var req='c='+info.path.substr(2);
				$('#bancada').addClass('distcars');
			}
			$.get('getbancada.php?'+req,function(d){
				var ip=info.path.substr(2);
				var d=$.parseJSON(d);

/*				var imgex=$('<div id="highresexplorer"></div>');
				var imgexplorer=new ImageExplorer(imgex, {showcrop:false, animate:false, shownavi:false, quirks:ie<9 || quirks || false});
				for(i=0;i<d.n.length;i++) {
					if(!d.dim[i].x1 && !d.dim[i].x2) {
						var wid=d.dim[i].w;
						var hei=d.dim[i].h;
						var crop=[0,0,wid,hei];
					} else {
						var wid=d.dim[i].x2-d.dim[i].x1;
						var hei=d.dim[i].y2-d.dim[i].y1;
						var crop=[d.dim[i].x1,d.dim[i].y1,d.dim[i].x2,d.dim[i].y2];
					}
					imgexplorer.addPhoto(d.g[i],wid,hei,crop,{nome:d.n[i].replace(/<(?:.|\n)*?>/gm, ''), comment:'características que deve confirmar', aut:null, src:'gen-sp_'+d.g[i]+'.jpg', distcar:d.t[i], paths:d.p[i]});
				}
				imgexplorer.loadImages();*/
				createBancadaWith(d.g,d.n,d.i,d.t,d.p,d.d);
			});
			break;
		case '6':		// pesquisa género
caixaPesquisaToSmall(true);		
			$('.puxador').show();
			hideBancada();
			$('#q1').val(info.path.substr(2));
			if($('#leftc-1').offset().left<-50) showLeft(false);
			makePesquisa(info.path.substr(2),false,true,false,null,false);
			break;
		case '8':		// ordem
caixaPesquisaToSmall(true);		
			$('.puxador').show();
			if($('#leftc-1').offset().left<-50) showLeft(false);
			displayOrdem(info.path.substr(2));
			break;
			
		case 'b':
			document.title='Explorador Bioclimático | ' + pageTitle;
			$('#se-pesquisar').scrollTop(0);
			sessionStorage.setItem("scrollValue_".pathName, 0);
			showSeparador('bioclima');
			var qs=info.path.substr(2);
			addQueryBioclim(qs);
			break;
		default:
//			if(!fotosdiaTimeout) homePage();
			const urlParams = new URLSearchParams(window.location.search);
			const myParam = urlParams.get('q');
			if(!myParam) homePage();
			break;
	}
}

function gotoAddr(str) {
	if(window.location.search.substring(1)!='')
		window.location='/#'+str;
	else {
		addressValue(str);
		onExternalChange({path:'/'+str});
	}
}

function messageBox(msg,timer,properties) {
	if(timer) properties.temporizador=timer;
	return(showBaloonTemplate(properties,msg
		,{left:$(window).width()/2,top:$(window).height()/2},true,{rad:12,curv:6,padding:8,anim:false,style:5,opacity:0.96}));
}

function createBancadaWith(src,sp,id,subtit,annots,distcar,callback) {
	$('#bancada .foto-banc').remove();		// limpa bancada
	showBancada();
	var wid=Math.floor($('#bancada').width()/480);
	for(var i=0;i<src.length;i++) {
/*		imgpre[i]=new Image();
		imgpre[i].onload=function(){
			//$('<img class="foto" src="'+this.src+'"/>').insertBefore(this.el.find('.placeholder'));
			this.el.find('.foto').replaceWith('<img class="foto" src="'+this.src+'"/>');					
			this.el.find('.placeholder').fadeOut(function(){$(this).remove();});
		};*/
		if(distcar) 
			newel=makeFotobanc(src[i],sp[i],id[i],subtit[i],distcar[i]);
		else
			newel=makeFotobanc(src[i],sp[i],id[i],subtit[i]);
		addToBancada(newel,1);
		newel.css({top:Math.floor(i/wid)*692+30,left:(i%wid)*490});
		
		var imel=$('<img style="position:absolute;top:0px;left:0px;width:480px; height:640px; object-fit:cover" class="image" src="gen-sp_'+src[i]+'.jpg"/>').css({opacity:0}).appendTo(newel.find('.wrap'));
		imel.load(function(){
			var wid=$(this).width();
			var hei=$(this).height();
			var newel=$(this).parents('.foto-banc').width(wid+4);
			newel.find('.wrap').animate({width:wid,height:hei});
			var off=newel.position();
			newel.find('.placeholder').remove();
			newel.find('.image').animate({opacity:1},function(){
				$(this).css({position:'static'});
				var dr=$(this).parent().siblings('.drawing');
				if(dr.size()>0) {
					var canvas=dr.data('canvas');
					if(canvas) {
						canvas.setSize(wid,hei);
						canvas.forEach(function(e) {
							e.animate({opacity:1,transform:'s1'},2300,'back-out');
						});
					}
				}
				if(callback) callback();
			});
		});
		
		if(annots) {
			if(annots[i]) {
				var wrap=newel.find('.wrap');
				var a;
				var id=Math.floor(Math.random()*1000);
				$('<div id="annots'+id+'" class="drawing"></div>').appendTo(newel).css({left:wrap.position().left,top:wrap.position().top,width:480,height:640});
				var canvas=Raphael('annots'+id,480,640);
				a=canvas.add(annots[i]);
				a.attr({opacity:0,transform:'s1.5'});//,transform:'s6','stroke-width':30});
/*				var ani=Raphael.animation({transform:'t5,5'},800);
				ani=ani.repeat(Infinity);
				a.animate(ani);*/
				$('#annots'+id).data('canvas',canvas);
			}
		}
	}
	$('#bancada .bancada').scrollTop(0);
}

function updateScrollBarCursor() {
/*	var th=$('#taxtree>ul').height()-$('#taxtree').height();
	var ts=$('#taxtree-holder .scrollbar').height();
	$('#taxtree-holder .scrollbar .cursor').css({top:($('#taxtree').scrollTop()/th)*(ts-81)}).show();*/
}

function updateScrollBarSize() {
/*	var th=$('#taxtree>ul').height();
	if(!th) return;
	if(th<$('#taxtree').height()) {$('#taxtree-holder .scrollbar').hide();return;} else $('#taxtree-holder .scrollbar').show();
	updateScrollBarCursor();*/
}

function handleResize(e) {
	var hei=$(window).height();
	var wid=$(window).width();
//	$('#rightc').width(wid-$('#rightc').offset().left);
	
	adjustFichaSpLayout(true);
/*	if($('#se-pesquisar').hasClass('selected') && $('#pesquisa-content').hasClass('fichaespecie')) {	// na ficha espécie, tem de esconder ou mostrar a foto ampliada
		if(hei<640) $('#fotoshow').hide(); else $('#fotoshow').show();
	}*/
	
//	if(hei<640) if($('#caixapesquisa').hasClass('big')) $('#warnmsg').show(); else $('#warnmsg').hide();

	metricas.contheight=hei;//($('#teclado').height()+$('#filtrotaxon').height()+$('#toolbarprincipal').height()); //76
	$('#containerleft').height(metricas.contheight);
/*	if($('#taxtree').is(':visible'))
	{
	alert($('#teclado').height());
	alert($('#filtrotaxon').height());
	}*/
//	$('#taxtree-holder').height(metricas.contheight - $('#teclado').height() - $('#filtrotaxon').height() - $('#filtroendem').height() - $('#pesquisa-outer').height() - $('#containerleft .logo').height());
	$('#taxtree-holder').height(metricas.contheight - $('#filtro-holder').height() - $('#pesquisa-outer').height() - $('#containerleft .logo').height()-2);
	updateScrollBarSize();
	
//	alert($('#pesquisa-wrap').height())
//	$('#leftc-1 #caracteres').height(metricas.contheight-$('#pesquisa-wrap').height()-48);
/*	if($('#taxtree').is(':visible'))
		
	if($('#pesquisa-wrap').is(':visible'))
		$('#leftc-1 #caracteres').height(metricas.contheight-$('#pesquisa-wrap').height()-48);*/
		
	if($('#loggeduser').size()>0)
		$('#rightc').css({height:hei-16,marginTop:16});
/*	else
		$('#rightc').height(hei);*/
	resizeQuadro();
	if(wid<1100 && !$('#se-comparar').is(':visible')) {
		$('body').mousemove(function(e){
			if($('#bancada').is(':visible')) return;
			if(leftTimeout==null) {
				if(e.pageX>leftwidths[0] && leftState==2) {
					leftTimeout=setTimeout("leftTimeout=null;hideLeft(true);",1500);
				}
				if(e.pageX<=130 && e.pageX>44 && leftState==0) showLeft(false,e.pageX/2+66+(1/2)*130);
				if(e.pageX<=44 && leftState==0) showLeft(true);
			} else
				if(e.pageX<leftwidths[0]) {clearTimeout(leftTimeout);leftTimeout=null;}
		});
	} else $('body').unbind('mousemove');	

	if($('#se-identificar').hasClass('selected')) refreshBancadaIdentLayout();
//	if($('#se-pesquisar').hasClass('selected')) $('#se-pesquisar').scroll();
	$('#webgis-mapa').height(hei-($('#webgis-tools').height() )).width($('#se-webgis').width() - ($('#webgis-camadas').is(':visible') ? $('#webgis-camadas').width() : 0));	//+ $('#se-webgis .tagaggreg').height()
	if($('#se-webgis').hasClass('selected') && mapwebgis) mapwebgis.invalidateSize();
	
	if($('#comparacaract').is(':visible')) {
		$('#comparacaract .caracter').each(function() {
			var n=$(this).find('.wrap').size();
			var maxl=Math.floor((wid-45)/484);
			n=(n>maxl ? maxl : n);
			$(this).children('.content').css({width:n*484+(n-0)*0});
			$(this).children('.titulo').css({width:n*484+(n-1)*0});
//			$(this).css({left:wid/2-$(this).width()/2});
		});
	}
	
	if($('#highresexplorer').is(':visible')) {
		var imgexplorer=$('#highresexplorer').data('this');
		imgexplorer.wid=wid;
		imgexplorer.hei=hei-$('#imgx-navi').height();
		imgexplorer.updateExtents();
		imgexplorer.setZoom(imgexplorer.nominalzoom < 1 ? 1 : imgexplorer.nominalzoom ,imgexplorer.wid/2,imgexplorer.hei/2,false);
/*		imgexplorer.zoom=Math.max((imgexplorer.foto.crop[2]-imgexplorer.foto.crop[0])/imgexplorer.wid,(imgexplorer.foto.crop[3]-imgexplorer.foto.crop[1])/imgexplorer.hei);
		if(imgexplorer.zoom<1) imgexplorer.zoom=1;
		imgexplorer.nominalzoom=imgexplorer.zoom;
		imgexplorer.center={x:(imgexplorer.foto.crop[2]+imgexplorer.foto.crop[0])/2,y:(imgexplorer.foto.crop[3]+imgexplorer.foto.crop[1])/2};*/
		$('#highresexplorer').height(imgexplorer.hei);
		imgexplorer.canvas.setSize(imgexplorer.wid,imgexplorer.hei);
		
		if($('#imgx-navi').size()>0) {
			if($('#imgx-navi-content').width()<$('#imgx-navi').width()) {
				$('#imgx-navi .button').hide();
				$('#imgx-navi-content').css({left:($('#imgx-navi').width()-$('#imgx-navi-content').width())/2});
			} else {
				$('#imgx-navi .button').show();
				$('#imgx-navi-content').css({left:0});
			}
		}
	}
}

function toggleLeft() {
	document.getElementById('mainflex').classList.toggle('contracted');
	setTimeout(handleResize,500);
}

function showLeft(anim,amount,id,clicked) {
	if(!clicked) {
		if($(window).width()<700) return;
	}
	document.getElementById('mainflex').classList.remove('contracted');
	setTimeout(handleResize,500);
/*	
	$('.puxador').show();
	if(id===undefined) id=0;
	if((leftState[id]!=0 && anim) || leftState[id]==2) return;
	if(!amount) amount=0; else amount=Math.round(amount);
	if(id==0) hideLeft(false,1); else hideLeft(false,0);
	if(anim) {
		leftState[id]=1;
		$('#rightc').animate({left:166,width:$(window).width()-166},400,'easeInOutCubic');
		$('#leftc-'+(id+1)).animate({left:0},400,'easeInOutCubic',function(){
			leftState[id]=2;
			handleResize();
			});
	} else {
		leftState[id]=0;
		if(amount==0) {$('#rightc').css({left:(leftwidths[id]-amount),width:$(window).width()-(leftwidths[id]-amount)});leftState[id]=2;}
		$('#leftc-'+(id+1)).css({left:-leftwidths[id]+(leftwidths[id]-amount)});
		handleResize();
	}*/
}

function hideLeftIfSmall() {
	if(document.getElementById('rightc').offsetLeft==0) {
//		document.getElementById('leftc-1').style.display='none';
		document.getElementById('leftc-1').style.transition = 'none';
		document.getElementById('mainflex').classList.add('contracted');
//		document.getElementById('leftc-1').style.transition = 'left 0.4s';
	}
}

function hideLeft(anim,id) {
	document.getElementById('mainflex').classList.add('contracted');
}

/*function addtoHistory(title,id,thumb) {
	var els=$('#linksspp').find('li');
	els.removeClass();
	for(var i=0;i<els.size();i++) {
		if(id==els.eq(i).data('id')) {
			els.eq(i).addClass('selected');
			return(i);		// já existe na posição i
		}
	}
	if(els.size()>=8) els.eq(0).remove();
	//<a href="/sp'+id+'" rel="address:/sp'+id+'">
	$('<li class="selected" name="/id'+id+'"><img src="thumbs/'+thumb+'.jpg"/><div>'+title.replace(' ',' ')+'</div></li>').appendTo('#linksspp').data('id',id).click(function(){
		if($(this).hasClass('selected')) return;
		$(this).parent().children('li').removeClass();
		$(this).addClass('selected');
		var addr=$(this).attr('name');
		var id=addr.substr(addr.search("/sp")+4);
		hideAllInfo();
		displaySp(id,true,true);
	});
	return(-1);
}*/

function homePage() {
	addressValue('');
//	document.title='Flora-On | Flora de Portugal interactiva';
	showSeparador('pesquisar');
//	$('#sidebar').show();
	caixaPesquisaToSmall(false);
	saveDistribuicao();
	$('#taxtree li.selected').removeClass('selected');
	$('#pesquisa-content').empty();
	
	if (sessionStorage.getItem("scrollValue_".pathName) != null) {
        $('#se-pesquisar').scrollTop(sessionStorage.getItem("scrollValue_".pathName));
    }

/*	$('#se-pesquisar').scrollTop(0);
	sessionStorage.setItem("scrollValue_".pathName, 0);*/
}


function showSeparador(sep) {
	$('.floating').hide();
//	if($('#sidebar').is(':visible')) $('#sidebar').hide('slide',{direction:'right'},1600);
//	$('#sidebar').hide();
	$('#quadro-header>.cabecalho>.toolbar>.button[name=addcol]').stop(true,false);
//	$('#se-loader').clearQueue().hide();
	if($('.separador.selected').attr('id').substr(3)==sep) return(false);
/*	if($('#se-'+sep).find('img').size()==0 && !silent) {		// se o separador a mostrar está vazio, mostra caixa pesquisa.
		homePage();
		return;
	}
*/

	$('.separador.selected').hide().removeClass('selected');
	if(sep=='indicetematico')
		$('#se-'+sep).show().addClass('selected').css({opacity:0}).animate({opacity:1},300);
	else
		$('#se-'+sep).show().addClass('selected');
	
/*	if($('#se-'+sep).show().addClass('selected').find('img').size()==0) {
		switch(sep) {
			case "pesquisar":
				$('#caixapesquisa').appendTo('#se-pesquisar');
				break;
			case "explorar":
				$('#se-explorar').empty().html('<p style="text-align:center;font-style:italic;color:gray;margin-top:200px;"><br/>seleccione uma espécie na árvore à esquerda para abrir ficha</p>');
				break;
			case "comparar":
				quadroVazio();
				break;
		}
	}*/
	if(sep=='comparar') {showLeft(false);clearTimeout(leftTimeout);leftTimeout=null;$('body').unbind('mousemove');}	
	if(sep=="pesquisar") {
		//$('#q1').focus();
		if($('#pesquisa-content div').size()==0) caixaPesquisaToSmall(false);
		adjustFichaSpLayout(true);
	}
	
	if(sep=='webgis' && mapwebgis) {
		mapwebgis.invalidateSize();
		mapwebgis.fitBounds(latlngbnd_leaf);
		$('#webgis-tools .button.proximidade').removeClass('pressed');
		if(mapwebgis.mira) mapwebgis.removeLayer(mapwebgis.mira);
	}
	return(true);
}

/*function clickSp(id) {
	displaySp(id,true,true);
}*/

function caixaPesquisaToSmall(tosmall) {
	clearTimeout(introTimeout);
	clearTimeout(fotosdiaTimeout);
	if(tosmall) {
//		$('#caixapesquisa').hide();//.removeClass('big').addClass('small');
		$('#pesquisa-wrap').hide();
//		$('#sidebar').hide();
		$('#funcionalidades').hide();
	} else {
		$('#leftc-1').show();
		$('.puxador').show();
//		$('#caixapesquisa').show();//.removeClass('small').addClass('big');
		$('#pesquisa-wrap').show();
		$('#dica').prependTo('#pesquisa-big').show();
		$('#sugestoes-wrap').prependTo('#pesquisa-big');
		$('#formpesq').prependTo('#pesquisa-big');	
		if($(window).height()<640) $('#warnmsg').show(); else $('#warnmsg').hide();
		$('#fotosdia img').show();
//		$('#rodape').show();
//		$('#sidebar').show();
		$('#funcionalidades').show();
	}
}

function byte2Hex(n) {
  var nybHexString = "0123456789ABCDEF";
  return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
}

function loadRegistos() {		// este carrega os públicos
	if(mapdistr) saveDistribuicao();
	if(!document.getElementById('distribuicao')) return;
	if(!mapdistr) {
		var linha,polyline;
		mapdistr=L.map('distribuicao',{attributionControl:false,zoomControl:false,minZoom:6,scrollWheelZoom:false,tap:false,dragging:!L.Browser.mobile, maxBounds: latlngbnd_leaf, touchZoom:true});
		L.control.attribution({position:'bottomleft'}).addTo(mapdistr);
		L.control.zoom({position:'topright'}).addTo(mapdistr);
		Esri_WorldShadedRelief[0].addTo(mapdistr);
		if(quadricula[0]) quadricula[0].addTo(mapdistr);
		if(limitept[0]) limitept[0].addTo(mapdistr);
		
		mapdistr.on('mousedown', function(event) {removeBaloons(false);});
		mapdistr.on('zoomstart', function(event) {removeBaloons(false);});
		mapdistr.fitBounds(latlngbnd_leaf);
		mapdistr.setMinZoom(mapdistr.getZoom());
		
	}
//	if(mapdistr.tap) {mapdistr.tap.disable();mapdistr.dragging.disable();}

	var lyr=$('#distribuicao').data('layer');
	if(lyr) {
		$('#distribuicao').data('shape',null);
		mapdistr.removeLayer(lyr);
	}

	$('#info-mapa .leaflet-top.leaflet-left .toolbar').remove();
	mapdistr.addControl(new toolBar(['fullscreen'],[$('#infodistr input[name=linkwebgis]').val()],['Ver mapa em ecran inteiro'],{position: 'topleft'}));

/*	quadricula.setMap(mapdistr);
	if(limitept) limitept.setMap(mapdistr);
	for(var i=0;i<registos.length;i++) registos[i].setMap(null);
	registos=[];*/
	var idents=$('.fichaespecie input[name=ident]').val();
	idents=idents.split(',');
	for(i=0;i<idents.length;i++) idents[i]=zeroPad(parseInt(idents[i]),4);
	displayQuadOnMap3(mapdistr,'id'+idents.join(''),null,{mergeentidades:true,color:['red','#000','#777','#ff8a80'],opacity:[1,1,1,1],silent:true,dataelement:'#distribuicao',signature:$('#pesquisa-content.fichaespecie input[name=ident]').val()});
	// the colors correspond to the codes in mapas.php (check "loadquadquery")
	
	if(subdomain) {
		var imageUrl = 'getsvgpoly?width=1000';
		L.imageOverlay(imageUrl, latlngbnd_leaf.pad(0.01)).addTo(mapdistr);
	}
}

function hideBaloon(el,anim) {
	if(anim) {
		el.animate({opacity:0,top:'-=15'},300,function() {
			if($(this).find('.floatingmap').size()>0) destroyPickerMap($(this).find('.floatingmap'));
			$(this).remove();
		});
	} else {
		if(el.find('.floatingmap').size()>0) destroyPickerMap(el.find('.floatingmap'));
		el.remove();
	}
}

function destroyPickerMap(el) {
	var mapa=el.data('map');
	if(mapa) {
//		mapa.removeLayer(Nokia_satelliteYesLabelsDay[1]);
		mapa.removeLayer(Esri_WorldImagery);
		mapa.remove();
	}
	el.remove();
}

function removeBaloons(all) {
	if(all) {
		$('.baloon').each(function() {
			if($(this).data('callback')) $(this).data('callback')();
		});
		hideBaloon($('.baloon'),false);
	} else {
		$('.baloon:not(.fixed)').each(function() {
			if($(this).data('callback')) $(this).data('callback')();
		});

		hideBaloon($('.baloon:not(.fixed)'),false);
	}
}

function showBaloonTemplate(template,text,position,removeothers,properties) {
//	var oritemplate=template;
	if(!text || text=='') return;
//	template=oritemplate.replace('{1}',text);
	var dummy=$('<div>'+text+'</div>').wrapAll('<div id="temp" class="janela semnada '+(template.classes?template.classes:'')+'" style="position:absolute;width:'+(parseInt(template.wid)>0 ? (template.wid+'px') : 'auto')+';height:'+(parseInt(template.hei)>0 ? (template.hei+'px') : 'auto')+';"><div class="content" style="width:100%"><div class="wrapper"></div></div></div>').parents('.janela');
	dummy.css({visibility:'visible',zIndex:10000}).appendTo('body');
	if(template.resizeEvent) properties.glow=false;
	
	var baloon=showBaloon(dummy.innerWidth(),dummy.innerHeight(),position,false,removeothers,properties);
//	dummy.css({position:'static'}).removeClass('janela');
	dummy=dummy.find('.wrapper').unwrap();
	$('#temp').remove();
	
	if(template.classes) baloon.addClass(template.classes);
	if(template.style) {baloon.find('.content').css(template.style);}

	baloon.find('.content').css({width:template.wid}).append(dummy.css({visibility:'visible'}));
	
	if(template.closeonclick) {
		baloon.click(function() {hideBaloon($(this),true);});
	}
	
	if(template.temporizador) {
		setTimeout(function(){hideBaloon(baloon,true);},template.temporizador);
	}
	
	if(template.closebutton) {
		baloon.find('.content').prepend('<img class="closewindow" src="images/close.png"/>');
		baloon.find('img.closewindow').click(function() {
			hideBaloon($(this).parents('.baloon'),true);
		});
	}

	if(template.resizeEvent) {
		baloon.find('.content').bind('DOMNodeInserted', function(event) {
			var baloon=$(this).parents('.baloon');
			var wid=$(this).width();
			var hei=$(this).height();
			var canvas=baloon.data('canvas');
			var path=canvas.baloon;
			var prop=canvas.prop;
			if(hei==canvas.hei) return;
			canvas.paper.setSize(canvas.outwid-canvas.wid+wid,canvas.outhei-canvas.hei+hei);
			path.animate({path:makeBaloonString(prop.style,wid,hei,prop)},500,'<>');
			baloon.stop().animate({top:'-='+(hei-canvas.hei)},500,'easeInOutQuad');
			canvas.outwid=canvas.outwid-canvas.wid+wid;
			canvas.outhei=canvas.outhei-canvas.hei+hei;
			canvas.wid=wid;
			canvas.hei=hei;
			baloon.css({height:'auto'});
		});
	}
	
	if(baloon.find('.floatingmap').size()>0) {
		if(baloon.find('.polygon').size()>0)	// é mapa de mostrar polígono
			displayPolygonMap(baloon.find('.floatingmap'));
		else
			displayPickerMap(baloon.find('.floatingmap'),baloon.find('p.coords'));		// there's a placeholder for a Leaflet map here!
	}
	
	return(baloon);
}

function displayPolygonMap(el) {
	var mapa=L.map(el.attr('id'),{attributionControl:false,zoomControl:false,minZoom:6});
	var pol, tmp, polCells;
	L.control.zoom({position:'bottomright'}).addTo(mapa);
	if(el.width()>300) L.control.attribution({position:'bottomleft'}).addTo(mapa);
	//Nokia_satelliteYesLabelsDay[1].addTo(mapa);
	Esri_WorldImagery.addTo(mapa);
	
	var coo=el.find('input[name=coord]').val();
	var gridcells=el.find('input[name=gridcells]');
	
	if(coo) {
		if(gridcells) {
			gridcells = gridcells.val();
			
			// split different cells
			gridcells = gridcells.split('|');
			
			// for each cell
			coords = new Array();
			for(var cell=0; cell < gridcells.length; cell++) {
				// separate each vertex
				coords[cell] = [gridcells[cell].split(',')];
				
				for(var i=0; i<coords[cell][0].length; i++) {
					coords[cell][0][i] = coords[cell][0][i].trim().split(' ');
					tmp = parseFloat(coords[cell][0][i][1]);
					coords[cell][0][i][1] = parseFloat(coords[cell][0][i][0]);
					coords[cell][0][i][0] = tmp;
				}
			}
//			console.log(JSON.stringify(coords));
			polCells = L.polygon(coords, {color:'#0f0', weight:3, fillOpacity:0.3});
			polCells.addTo(mapa);
			
		} else polCells = null;

		coords=coo.split(',');
		for(var i=0;i<coords.length;i++) {
			coords[i]=coords[i].trim().split(' ');
			tmp=parseFloat(coords[i][1]);
			coords[i][1]=parseFloat(coords[i][0]);
			coords[i][0]=tmp;
		}
		pol=L.polygon(coords, {color:'#f00', weight:3, fillOpacity:0});
		pol.addTo(mapa);
		
		if(polCells)
			mapa.fitBounds(polCells.getBounds());
		else
			mapa.fitBounds(pol.getBounds());
	}
	el.data('map',mapa);
}

function displayPickerMap(el,distico) {
	var mapa=L.map(el.attr('id'),{attributionControl:false,zoomControl:false,minZoom:6});
	Esri_WorldImagery.addTo(mapa);
	mapa.remove();
	
	mapa=L.map(el.attr('id'),{attributionControl:false,zoomControl:false,minZoom:6});
	L.control.zoom({position:'bottomright'}).addTo(mapa);
	if(el.width()>300) L.control.attribution({position:'bottomleft'}).addTo(mapa);
	Esri_WorldImagery.addTo(mapa);

    var coo=el.find('input[name=coord]').val();
	if(coo) {
		coo=coo.split(' ');
		coo=L.latLng(parseFloat(coo[0]),parseFloat(coo[1]));
		mapa.setZoom(13);
		var opac=1;
		mapa.panTo(coo);
	} else {
		coo=[0,0];
		var opac=0;
	}
	var mira=L.marker(coo,{icon:L.icon({iconUrl:'images/locate_gdy.png',iconAnchor:[20, 20]}),draggable:true,opacity:opac});
	mira.addTo(mapa).on('dragend',function(ev) {
		var coords = ev.target.getLatLng();
		distico.html('<a href="#1perto:'+(Math.round(coords.lat*10000)/10000)+'+'+(Math.round(coords.lng*10000)/10000)+'">'+(Math.round(coords.lat*10000)/10000)+'ºN '+(-Math.round(coords.lng*10000)/10000)+'ºW</a>');
		
		var pt=mapa.latLngToContainerPoint(ev.target.getLatLng());
		var off=$(mapa.getContainer()).offset();
		$('.cliquenamira').remove();
		ev.target.baloon=showBaloonTemplate({classes:'cliquenamira'},'clique na mira<br/>para pesquisar',{left:pt.x+off.left,top:pt.y+off.top-28},false,{rad:12,curv:6,padding:8,anim:true,style:4});
	}).on('dragstart',function() {
		$('.cliquenamira').remove();
	}).on('click',function(ev) {
		if(ev.target.options.opacity==0) return;
		var typeOfPesquisa = (ev.originalEvent.shiftKey) ? 'regionalmente:' : 'perto:';
		var coords = ev.target.getLatLng();
		// check if there is a flowering criterion already - remove it then
		var tags=$('.separador:visible #criteriospesquisa input[type=hidden]');
		if(tags.size()>0) {
			var pesq=$('.separador:visible #criteriospesquisa input[type=hidden]').map(function() {return(this.value);}).get();
			for(var i=0;i<pesq.length;i++) {
				if(pesq[i].indexOf(typeOfPesquisa)>-1) tags.eq(i).parents('div.tag').remove();
			}
		}
		pesquisaCriterios(typeOfPesquisa+(Math.round(coords.lat*10000)/10000)+' '+(Math.round(coords.lng*10000)/10000),1);			
	});
	
	mapa.on('click',function(ev) {
		var coords = ev.latlng;
		this.mira.setLatLng(coords).setOpacity(1);
		distico.html('<a href="#1perto:'+(Math.round(coords.lat*10000)/10000)+'+'+(Math.round(coords.lng*10000)/10000)+'">'+(Math.round(coords.lat*10000)/10000)+'ºN '+(-Math.round(coords.lng*10000)/10000)+'ºW</a>');
		var pt=this.latLngToContainerPoint(mira.getLatLng());
		var off=$(this.getContainer()).offset();
		$('.cliquenamira').remove();
		this.mira.baloon=showBaloonTemplate({classes:'cliquenamira'},'clique na mira<br/>para pesquisar',{left:pt.x+off.left,top:pt.y+off.top-28},false,{rad:12,curv:6,padding:8,anim:true,style:4});
	}).on('movestart',function() {
		$('.cliquenamira').remove();
	});
	
	mapa.mira=mira;
//	mapa.invalidateSize();
	mapa.fitBounds(latlngbnd_leaf);
	//mapa.invalidateSize();
	el.data('map',mapa);
}

function makeBaloonString(posicaoseta,wid,hei,prop) {
	switch(posicaoseta) {
		case 1:		// seta direita
			var txt='M'+prop.padhorz+','+(prop.rad+prop.padhorz)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid+prop.padding*2)+' 0'
				+'c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei/2-prop.widpointer+prop.padding)+'l'+prop.heipointer+' '+prop.widpointer+'l-'+prop.heipointer+' '+prop.widpointer+'l0 '+(hei/2-prop.widpointer+prop.padding)
				+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid+prop.padding*2)+' 0'
				+'c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'z';
			break;
		case 2:			// seta esquerda
			var txt='M'+prop.padhorz+','+(prop.rad+prop.padhorz)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid+prop.padding*2)+' 0'
				+'c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei+prop.padding*2)
				+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid+prop.padding*2)+' 0'
				+'c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'l0 -'+(hei/2-prop.widpointer+prop.padding)+'l-'+prop.heipointer+' -'+prop.widpointer+'l'+prop.heipointer+' -'+prop.widpointer+'z';
			break;
		case 3:			// seta em cima
			var txt='M'+prop.padhorz+','+(prop.rad+prop.heipointer)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid/2-prop.widpointer+prop.padding)+' 0l'+prop.widpointer+' -'+prop.heipointer+'l'+prop.widpointer+' '+prop.heipointer+'l'+(wid/2-prop.widpointer+prop.padding)+' 0'
				+'c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei+prop.padding*2)
				+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid+prop.padding*2)+' 0'
				+'c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'z';
			break;
		case 4:			// seta em baixo
			var txt='M'+prop.padhorz+','+(prop.rad+prop.padhorz)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid+prop.padding*2)+' 0'
				+'c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei+prop.padding*2)
				+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid/2-prop.widpointer+prop.padding)+' 0l-'+prop.widpointer+' '+prop.heipointer+'l-'+prop.widpointer+' -'+prop.heipointer+'l-'+(wid/2-prop.widpointer+prop.padding)+' 0'
				+'c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'z';
			break;
		case 5:			// sem seta
			var txt='M'+prop.padhorz+','+(prop.rad+prop.padhorz)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid+prop.padding*2)+' 0'
				+'c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei+prop.padding*2)
				+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid+prop.padding*2)+' 0'
				+'c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'z';
			break;
	}
	return(txt);
}

function showBaloon(wid,hei,position,loader,removeothers,properties) {
	if(removeothers) removeBaloons(false);
	var thisbaloon=$('<div class="baloon floating janela semnada"><div class="drawing"></div><div class="content"></div></div>').appendTo('body');
	thisbaloon.find('.drawing').click(function() {$(this).parents('.baloon').remove();});
	if(position.left && position.top && !position.elem) {
		var px=position.left;
		var py=position.top;			
	} else if(!position.elem) return;
	
	var posi={left:0,top:0};
	$.extend(posi,position);
	position=posi;
	
	var prop={rad:10,curv:7,widpointer:8,heipointer:13,thickness:2,padding:8,padhorz:7,anim:false,animoffset:0,style:0,fill:'#333',opacity:0.92,glow:true};
	$.extend(prop,properties);
	prop.padding-=prop.rad;

	var outwid=wid+prop.thickness*2+prop.padding*2+prop.rad*2+prop.padhorz*2;
	var outhei=hei+prop.thickness*2+prop.padding*2+prop.rad*2+prop.heipointer+prop.padhorz*1;
	var deltacontornox=0,px,py;
	
	if(position.elem) {
		px=position.elem.offset().left+position.elem.outerWidth()/2+position.left;
		py=position.elem.offset().top+position.elem.outerHeight()+position.top;
	}
	
	if(prop.style==5) {				// sem seta
		var topx=px - outwid/2;
		var topy=py - outhei/2;
		if(topy<0) topy=-prop.padhorz;
		thisbaloon.css({opacity:(prop.anim ? 0 : 1),width:outwid,height:outhei,left:topx,top:topy+prop.animoffset,display:'none'});
		thisbaloon.find('.content').css({left:prop.padding+prop.thickness+prop.rad+prop.padhorz,top:prop.thickness+prop.padding+prop.rad+prop.padhorz});
		var canvas=Raphael(thisbaloon[0],outwid,outhei);
		var path=canvas.path(makeBaloonString(5,wid,hei,prop));
	} else if((prop.style==0 && px+outwid/2>$(window).width()) || (prop.style==2 && px+outwid>$(window).width()) || prop.style==1) {		// sai fora à direita, põe seta à direita
		if(position.elem) {
			px=position.elem.offset().left+position.left;
			py=position.elem.offset().top+position.elem.outerHeight()/2+position.top;
		}
		outwid+=prop.heipointer-prop.padhorz;
		outhei-=prop.heipointer-prop.padhorz;
		var topx=px - outwid;
		var topy=py - outhei/2;
		if(topy<0) topy=-prop.padhorz;
		thisbaloon.css({opacity:(prop.anim ? 0 : 1),width:outwid,height:outhei,left:topx,top:topy+prop.animoffset,display:'none'});
		thisbaloon.find('.content').css({left:prop.padding+prop.thickness+prop.rad+prop.padhorz,top:prop.thickness+prop.padding+prop.rad+prop.padhorz});
		var canvas=Raphael(thisbaloon[0],outwid,outhei);
//				var path=canvas.path('M'+prop.padhorz+','+(prop.rad+prop.padhorz)+'c0 -'+prop.curv+' '+(prop.rad-prop.curv)+' -'+prop.rad+' '+prop.rad+' -'+prop.rad+'l'+(wid+prop.padding*2)+' 0c'+prop.curv+' 0 '+prop.rad+' '+(prop.rad-prop.curv)+' '+prop.rad+' '+prop.rad+'l0 '+(hei/2-prop.widpointer+prop.padding)+'l'+prop.heipointer+' '+prop.widpointer+'l-'+prop.heipointer+' '+prop.widpointer+'l0 '+(hei/2-prop.widpointer+prop.padding)+'c0 '+prop.curv+' -'+(prop.rad-prop.curv)+' '+prop.rad+' -'+prop.rad+' '+prop.rad+'l-'+(wid+prop.padding*2)+' 0c-'+prop.curv+' 0 -'+prop.rad+' -'+(prop.rad-prop.curv)+' -'+prop.rad+' -'+prop.rad+'z');
		var path=canvas.path(makeBaloonString(1,wid,hei,prop));
		prop.style=1;
	} else if((prop.style==0 && px-outwid/2<0) || (prop.style==1 && px-outwid<0) || prop.style==2) {		// sai fora à esquerda, põe seta à esquerda
		if(position.elem) {
			px=position.elem.offset().left + position.elem.width()+position.left;
			py=position.elem.offset().top+position.elem.outerHeight()/2+position.top;
		}
		outwid+=prop.heipointer;
		outhei-=prop.heipointer-prop.padhorz;
		var topx=px;
		var topy=py - outhei/2;
		deltacontornox=prop.heipointer;
		if(topy<0) topy=-prop.padhorz;
		thisbaloon.css({opacity:(prop.anim ? 0 : 1),width:outwid,height:outhei,left:topx,top:topy+prop.animoffset,display:'none'});
		thisbaloon.find('.content').css({left:prop.padding+prop.thickness+prop.rad+prop.padhorz+prop.heipointer,top:prop.thickness+prop.padding+prop.rad+prop.padhorz});
		var canvas=Raphael(thisbaloon[0],outwid,outhei);
		var path=canvas.path(makeBaloonString(2,wid,hei,prop));
		prop.style=2;
	} else if((prop.style==0 && py+outhei>$(window).height()) || prop.style==4) {		// não cabe em baixo, põe seta em baixo
		if(position.elem) {
			px=position.elem.offset().left+position.elem.outerWidth()/2+position.left;
			py=position.elem.offset().top+position.top;
		}
		var topx=px - outwid/2;
		var topy=py-outhei;
		thisbaloon.css({opacity:(prop.anim ? 0 : 1),width:outwid,height:outhei,left:topx,top:topy+prop.animoffset,display:'none'});
		thisbaloon.find('.content').css({left:prop.padding+prop.thickness+prop.padhorz+prop.rad,top:prop.thickness+prop.padding+prop.rad+prop.padhorz});
		var canvas=Raphael(thisbaloon[0],outwid,outhei);
		var path=canvas.path(makeBaloonString(4,wid,hei,prop));
		prop.style=4;
	} else {			// cabe pelos lados, põe seta em cima	
		var topx=px - outwid/2;
		var topy=py;// + prop.heipointer;
		thisbaloon.css({opacity:(prop.anim ? 0 : 1),width:outwid,height:outhei,left:topx,top:topy+prop.animoffset,display:'none'});
//			$('#detalhe-registo .content').css({width:wid,height:hei,left:padding+thickness+prop.rad,top:heipointer+thickness+padding+prop.rad});
		thisbaloon.find('.content').css({left:prop.padding+prop.thickness+prop.padhorz+prop.rad,top:prop.heipointer+prop.thickness+prop.padding+prop.rad});
		var canvas=Raphael(thisbaloon[0],outwid,outhei);
		var path=canvas.path(makeBaloonString(3,wid,hei,prop));
		prop.style=3;
	}
	path.attr({'stroke-width':prop.thickness,fill:prop.fill,opacity:prop.opacity,stroke:'orange'}).transform('t'+(prop.thickness+deltacontornox)+','+prop.thickness);
	if(prop.glow) path.glow({opacity:0.4,width:10,offsetx:0,offsety:0,color:'black'});//.glow({opacity:0.4,width:13,offsetx:0,offsety:0,color:'orange'});
	//290-#666-#444:45%-#333:70%-#222
	//90-#aaa-#fff:60%-#fff:90%-#bbb
//			path.clone().attr({'stroke-width':prop.thickness,fill:'white',opacity:1,stroke:'red'}).transform('t'+prop.thickness+','+prop.thickness);
	//'90-#80d4eb-#fff:80%-#c7f3ff'
	if(prop.anim) thisbaloon.animate({top:'-='+prop.animoffset},400,'easeOutQuart').animate({opacity:1},{queue:false,duration:400,easing:'easeOutCubic'});

	if(loader) {
		canvas.setStart();
		var el=canvas.ellipse((wid+prop.rad*2)/2,(hei+prop.rad*2)/2,20,15).attr({'stroke-width':0,fill:'#dddddd'});
		var animloader=Raphael.animation({transform:'s3s0.333'},4000,'<>');
		animloader=animloader.repeat(Infinity);
		el.animate(animloader);
	//	.animate({transform:'r660',opacity:0.3},15000,'linear');
		//canvas.text((wid+rad*2)/2,(hei+rad*2)/2,'carregando').attr({'font-family':'helvetica','font-size':'12','fill':'#444444'});
		var loader=canvas.setFinish();
		thisbaloon.data('loader',loader)
	}
	
	thisbaloon.data('canvas',{paper:canvas,baloon:path,prop:prop,wid:wid,hei:hei,outwid:outwid,outhei:outhei}).show();//.animate({top:'-='+anim},200);
	return(thisbaloon);
}

function showMaisEspeciesPerto(idreg,thisel) {
	$('.especiesperto').remove();
	$.post('mapas.php',{what:'near',idreg:idreg},function(d) {
		var regs=$.parseJSON(d);
		var ht='';
		if(regs.n.length==0)
			ht='<p style="margin:0">Nenhum registo de outra espécie encontrado nas proximidades deste registo.</p>';
		else {
//			var hei=$('.baloon .content .reg-holder').height();
			ht='<h1>'+regs.n.length+' taxa registados perto deste(s) registo(s):</h1><ul class="small" style="overflow:auto;max-height:150px;">';
			for(var i=0;i<regs.n.length;i++) {
				if(regs.g[i]=='')
					ht+='<li style="color:#555;">'+regs.n[i]+'</li>';
				else
					ht+='<li class="link" onclick="displaySp(\''+regs.g[i]+'\',true,true,false);">'+regs.n[i]+'</li>';
			}
			ht+='</ul>';
		}
		showBaloonTemplate({wid:200,style:{textAlign:'left'},classes:'especiesperto'}//'<div class="janela semnada especiesperto" style="position:absolute;width:200px;text-align:left;"><div class="content" style="width:100%">{1}</div></div>'
			,ht
			,{elem:$(thisel),left:-18},false,{rad:12,curv:6,padding:8,anim:false,style:2});
			
//		$('#detalhe-registo .content').html(ht);
	});
}

function adjustFichaSpLayout(reinicia) {
	if($('.separador.selected').attr('id')!='se-pesquisar' || !$('#pesquisa-content').hasClass('fichaespecie')) return;
	if(!document.getElementById('fotochooser')) return;
	if(mapdistr) mapdistr.invalidateSize();
	resizeImages([500,400,300,250,200],document.getElementById('fotochooser'));
}

// code adapted from http://blog.vjeux.com/wp-content/uploads/2012/05/google-layout.html

function getheight(images, width) {
	width -= images.length * 4;
	var h = 0;
	for (var i = 0; i < images.length; ++i) {
		h += (parseFloat(images[i].getAttribute('data-width')) + 0) / parseFloat(images[i].getAttribute('data-height'));
	}
	return width / h;
}

function setheight(images, height) {
  for (var i = 0; i < images.length; ++i) {
  	images[i].style.width=Math.floor(height * parseFloat(images[i].getAttribute('data-width')) / parseFloat(images[i].getAttribute('data-height')) )+'px';
  	images[i].style.height=(height * 0.93)+'px';
  }
}

function resizeImages(max_height,el) {
	var size=el.getBoundingClientRect().width;
	var n = 0;
	var images = el.querySelectorAll('.thumbnail img');
	if(images.length === 0) {return;}
	if(!images[0].getAttribute('data-width')) {
		for(var i=0;i<images.length;i++) {
			var cr=images[i].getBoundingClientRect();
			images[i].setAttribute('data-width',cr.width);
			images[i].setAttribute('data-height',cr.height);
		}
	}
  
  w: while (images.length > 0) {
    for (var i = 1; i < images.length + 1; ++i) {
		var slice=Array.prototype.slice.call(images, 0,i);
		var h = getheight(slice, size);
	
      if (h < (max_height[n] ? max_height[n] : max_height[max_height.length-1])) {
        setheight(slice, h);
        n++;
        images=Array.prototype.slice.call(images,i);
        continue w;
      }
    }
    setheight(slice, Math.min((max_height[n] ? max_height[n] : max_height[max_height.length-1]), h));
//    setheight(slice, h);
    n++;
    break;
  }
}

function attachBaloonTip(elems,template,offset,properties) {
	if('ontouchstart' in document.documentElement
		|| navigator.maxTouchPoints > 0
		|| navigator.msMaxTouchPoints > 0) return;
         
	if(!offset) offset=[0,0];
	elems.each(function() {
		if(!$(this).attr('title')) return;
		$(this).data('title',$(this).attr('title')).removeAttr('title');
	});

	elems.hover(function(ev) {
		var tit=$(this).data('title');
		if(!tit || tit=='') return;
		$(this).data('baloon',
			showBaloonTemplate(template,tit,{elem:$(this),left:offset[0],top:offset[1]},true,properties)
		);
	},function() {
		if(properties.fixed) return;
		if($(this).data('baloon')) hideBaloon($(this).data('baloon'),false);//$(this).data('baloon').remove();
	});
}

function drawDensity(idel,valores,range,color,maxmin,logarithmic) {
	if(!valores) return;
	var wid=$('#'+idel).width();
	var hei=$('#'+idel).height();
	var canvas=Raphael(idel,wid,hei);
	var pad=[10,28],len=wid-pad[0]-pad[1],vpos=7.5,heibarra=hei-8;
	var tot=range[1]-range[0];
	canvas.path('M'+pad[0]+' '+vpos+'l'+len+' 0').attr({'stroke':'#555','stroke-width':1,'stroke-dasharray':'- '});
/*	canvas.rect(pad[0],vpos-3.5,1,7).attr({fill:'#777','stroke-width':0});
	canvas.rect(wid-pad[1],vpos-3.5,1,7).attr({fill:'#777','stroke-width':0});*/
	valores=valores.split(',');
	
// desenha máximos e minimos
	if(logarithmic) {
		var minlab=maxmin[0]<1000 ? parseInt(maxmin[0])+'m' : (maxmin[0]<10000 ? Math.round(maxmin[0]/100)/10+'km' : Math.round(maxmin[0]/1000)+'km');
		var maxlab=maxmin[1]<1000 ? parseInt(maxmin[1])+'m' : (maxmin[1]<10000 ? Math.round(maxmin[1]/100)/10+'km' : Math.round(maxmin[1]/1000)+'km');
		var maximolab=range[1]<1000 ? range[1] : Math.round(range[1]/1000)+'km';
		range[0]=Math.round(Math.log(range[0]/500+1)/0.002072202);
		range[1]=Math.round(Math.log(range[1]/500+1)/0.002072202);
		maxmin[0]=Math.round(Math.log(parseInt(maxmin[0])/500+1)/0.002072202);
		maxmin[1]=Math.round(Math.log(parseInt(maxmin[1])/500+1)/0.002072202);
		tot=range[1]-range[0];
	} else {
		var minlab=parseInt(maxmin[0]);
		var maxlab=parseInt(maxmin[1]);
		var maximolab=range[1];
		maxmin[0]=parseInt(maxmin[0]);
		maxmin[1]=parseInt(maxmin[1]);
	}

// linha tracejada entre min e max	
	canvas.path('M'+(pad[0]+(maxmin[0]-range[0])/tot*len)+' '+vpos+'l'+((maxmin[1]-maxmin[0])/tot*len)+' 0').attr({'stroke':'black','stroke-width':1});
	canvas.path('M'+(pad[0]+(maxmin[0]-range[0])/tot*len)+' '+vpos+'l'+((maxmin[1]-maxmin[0])/tot*len)+' 0').attr({'stroke':color,'stroke-width':1,'stroke-dasharray':'- '});
// legendas min e max
	if(maxmin[0]==maxmin[1]) {
		canvas.text(pad[0]+((maxmin[0]-range[0])/tot)*len,hei-7,minlab).attr({'font-family':'helvetica','font-size':9,'fill':color})
	} else {
		var txt=[canvas.text(pad[0]+((maxmin[0]-range[0])/tot)*len,hei-7,minlab).attr({'font-family':'helvetica','font-size':9,'fill':color})
			,canvas.text(pad[0]+((maxmin[1]-range[0])/tot)*len,hei-7,maxlab).attr({'font-family':'helvetica','font-size':9,'fill':color})];
		var dif=txt[1].getBBox().x - txt[0].getBBox().x-txt[0].getBBox().width;
		if(dif<3) {
			txt[0].transform('t'+(dif/2-1)+',0').attr('text',txt[0].attr('text')+'-');
			txt[1].transform('t'+(-dif/2+1)+',0');
		}
		canvas.rect(pad[0]+((maxmin[0]-range[0])/tot)*len,vpos-4,2,8).attr({fill:color,'stroke-width':0});
		canvas.rect(pad[0]+((maxmin[1]-range[0])/tot)*len,vpos-4,2,8).attr({fill:color,'stroke-width':0});
	}
	
	canvas.text(pad[0]-4,vpos,'0').attr({'font-family':'helvetica','font-size':'9','fill':'#ccc','text-anchor':'end'});
	canvas.text(wid,vpos,maximolab).attr({'font-family':'helvetica','font-size':'9','fill':'#ccc','text-anchor':'end'});
	
	var maxd=0,integral=0,soma=0,v;
	for(i=0;i<tot;i++) {
		v=parseInt(valores[i]);
		integral+=v;
		if(v>maxd) maxd=v;
	}
	
	var toggle=false,start,end;
	var limites=[maxd*0.1,maxd*0.5];
	var inter,tmp1,x1,x2,lastx;
	for(inter=limites.length-1;inter>-1;inter--) {
		toggle=parseInt(valores[0])>limites[inter];
		if(toggle) start=0;
		for(i=0;i<tot;i++) {
			v=parseInt(valores[i]);	
			if(!toggle && v>limites[inter]) {start=i;toggle=true;}
			if(toggle && (v<limites[inter] || i==tot-1)) {
				end=i;toggle=false;
				tmp1=heibarra*limites[inter]/maxd;
				if(start<maxmin[0]-range[0]) start=maxmin[0]-range[0];
				if(end>maxmin[1]-range[0]) end=maxmin[1]-range[0];
				x1=(start/tot)*len;
				x2=((end-start)/tot)*len;		// x2 é o width!
//				alert(start+'-'+end+' | '+Math.round(x1)+'-'+Math.round(x2));
				if(x2<4) {x1-=1;x2+=2;}
				canvas.rect(pad[0]+x1,vpos-tmp1/2,x2,tmp1,5).attr({fill:color,stroke:color,'stroke-width':0});
				if(inter==limites.length-1) {
					if(logarithmic) {
						var b=(Math.log(250000+500)-Math.log(500))/3000;
						var startlab=500*Math.exp(b*start)-500;
						var endlab=500*Math.exp(b*end)-500;
						startlab=startlab<1000 ? Math.round(startlab)+'m' : (startlab<10000 ? Math.round(startlab/100)/10+'km' : Math.round(startlab/1000)+'km');
						endlab=endlab<1000 ? Math.round(endlab)+'m' : (endlab<10000 ? Math.round(endlab/100)/10+'km' : Math.round(endlab/1000)+'km');
					} else {
						startlab=start;
						endlab=end;
					}
					var txt1=[
						canvas.text(pad[0]+x1+2,hei-7,startlab).attr({'font-family':'helvetica','font-size':9,'fill':color})
						,canvas.text(pad[0]+x1+x2,hei-7,endlab).attr({'font-family':'helvetica','font-size':9,'fill':color})
					];
					if(txt1[0].getBBox().x+txt1[0].getBBox().width>=txt1[1].getBBox().x) {txt1[0].remove();txt1[1].remove();} else {
						if(txt1[0].getBBox().x<=txt[0].getBBox().x+txt[0].getBBox().width+3) txt1[0].remove();
						if(txt1[1].getBBox().x+txt1[1].getBBox().width>=txt[1].getBBox().x) txt1[1].remove();
					}
				}
/*				if(inter==0) {		// é o "mínimo local"
					canvas.rect(pad+(start/maximo)*len,vpos-4,1,8).attr({fill:color,'stroke-width':0});
					canvas.rect(pad+(end/maximo)*len,vpos-4,1,8).attr({fill:color,'stroke-width':0});
				}*/
			}
		}
	}
	
	/*
	for(i=0;i<maximo;i++) {
		v=parseInt(valores[i]);	
		if(!toggle && v>maxd/2) {start=i;toggle=true;}
		if(toggle && v<maxd/2) {
			toggle=false;
			canvas.rect(pad+(start/maximo)*len,0,(i-start)/maximo*len,hei,5).attr({fill:'#777','stroke-width':0});	
		}
	}*/

/*	var foi=false;
	for(i=0;i<maximo;i++) {
		canvas.rect(pad[0]+(i/maximo)*len,vpos-valores[i]/maxd*vpos,1,valores[i]/maxd*vpos*2).attr({fill:'#fff','stroke-width':0});	
	}*/
}

function drawFloracao(idel,alt,passedstyle) {
	if(!alt) return;
	var style={padding:8,axisthickness:1,axisticks:5,axislabsize:8,axislabrotate:false,longmonth:false};
	$.extend(style,passedstyle);
	
	var meses=['J','F','M','A','M','J','J','A','S','O','N','D'];
	var meseslong=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
	var coresmeses=['#0f0','#0f0','#0f0','#f0f','#f0f','#f0f','#f70','#f70','#f70','#888','#888','#888'];
	var estacoes=[0,80,173,266,356,365],coresestacoes=['#0f0','#f0f','#f70','#888','#0f0'];
	var wid=$('#'+idel).width();
	var hei=$('#'+idel).height();
	var canvas=Raphael(idel,wid,hei);
	var pad=style.pad,len=(wid-pad[1]-pad[3]),vpos=(style.title ? hei-10-pad[2] : hei-18-pad[2]);

	alt=alt.split(',');
	if(style.grid) {
		var num=parseInt(alt[0]);
		var maxi=parseInt(alt[1]);
		alt.splice(0,2);
		var maxnum=(maxi/(num*255))*num;
		var dy=(vpos-pad[0])/maxnum;
		var pretty=[1,2,5];
		var n=pretty[0],which=0,prev,mult=1;
		if(maxnum>99) {pad[3]+=8;len-=6;}
		do {
//			n*=2;
			which++;
			if(which>=pretty.length) {which=0;mult*=10;}
			prev=n;
			n=pretty[which]*mult;
			dy*=n/prev;
		} while(dy<12);
		for(i=vpos-dy,j=n;i>=pad[0];i-=dy,j+=n) {
			canvas.path('M'+pad[3]+' '+i+'l'+len+' 0').attr({'stroke':'#777','stroke-width':0.5});
			canvas.text(pad[3]-1,i,j).attr({'font-family':'helvetica','font-size':'9','fill':'white','text-anchor': style.axislabrotate ? 'middle' : 'end',transform:style.axislabrotate ? 'r270' : ''});
		}
		if(j==n) {
			canvas.path('M'+pad[3]+' '+pad[0]+'l'+len+' 0').attr({'stroke':'#777','stroke-width':0.5});
			canvas.text(pad[3]-1,pad[0],Math.round(maxnum)).attr({'font-family':'helvetica','font-size':'9','fill':'white','text-anchor':'end'});
		}
		if(style.axislabrotate)
			canvas.text(pad[3]-1-12, (vpos + pad[0])/2, 'nº espécies').attr({'font-family':'helvetica','font-size':'9','fill':'white','text-anchor': 'middle',transform:'r270'});
	}
	
	if(style.interactive) {
		$('#'+idel).data('canvas',canvas);
		$('#'+idel).mousedown(function(ev) {
			var x=Math.round((ev.pageX-$(this).offset().left-pad[3]-style.padding)/len*365);
			if(x>365) x=365;
			if(x<1) x=1;
			$('#'+idel).data('startdrag',x);
		});
		
		$('#'+idel).mouseup(function(ev) {
			var p=$(this).data('pointer');
			var x1=$('#'+idel).data('startdrag');
			$('#'+idel).removeData('startdrag');
			if(p) {p.remove();$(this).removeData('pointer');}
			var x2=Math.round((ev.pageX-$(this).offset().left-pad[3]-style.padding)/len*365);
			if(x2>365) x2=365;
			if(x2<1) x2=1;
			if(Math.abs(x2-x1)<5) x1=x2;
			if(x2<x1) {var xt=x2;x2=x1;x1=xt;}
			var date1=new Date(1990,0);
			var date2=new Date(1990,0);
			date1=new Date(date1.setDate(x1));
			date2=new Date(date2.setDate(x2));
			// check if there is a flowering criterion already - remove it then
			var tags=$('.separador:visible #criteriospesquisa input[type=hidden]');
			if(tags.size()>0) {
				var pesq=$('.separador:visible #criteriospesquisa input[type=hidden]').map(function() {return(this.value);}).get();
				for(var i=0;i<pesq.length;i++) {
					if(pesq[i].indexOf('floracao:')>-1) tags.eq(i).parents('div.tag').remove();
				}
			}
			
			if(x1==x2)
				pesquisaCriterios(date1.getDate()+'+'+meseslong[date1.getMonth()],1);
			else
				pesquisaCriterios(date1.getDate()+'+'+meseslong[date1.getMonth()]+' a '+date2.getDate()+'+'+meseslong[date2.getMonth()],1);
//			gotoAddr('1'+date.getDate()+'+'+meseslong[date.getMonth()]);
		});
		
		$('#'+idel).mousemove(function(ev) {
			var start=$('#'+idel).data('startdrag');
//			(ev.pageX-$(this).offset().left-pad[3]-8)/len*365
			if(start) start=start/365*len+pad[3];

			var x=ev.pageX-$(this).offset().left-style.padding;
			if(x<pad[3]) x=pad[3];
			if(x>len+pad[3]) x=len+pad[3];
			var p=$(this).data('pointer');
			if(!start) {
				var pstr='M'+x+' 0l0 '+vpos;
				if(!p) $(this).data('pointer',$(this).data('canvas').path(pstr).attr({stroke:'white','stroke-opacity':0.5})); else p.attr({path:pstr});
			} else {
				var pstr='M'+start+' 0H'+x+'V'+vpos+'H'+start+'Z';
				p.attr({stroke:'#0f0','fill':'#0f0','fill-opacity':0.5,path:pstr});
			}
//			if(!p) $(this).data('pointer',$(this).data('canvas').path(pstr).attr({stroke:'#0f0','fill':'#0f0','fill-opacity':0.5})); else p.attr({path:pstr});
		});
	}
	
	canvas.path('M'+pad[3]+' '+vpos+'l'+len+' 0').attr({'stroke':'#777','stroke-width':1});
	var maxd=0;
	for(i=0;i<365;i++) {
		if(parseInt(alt[i])>maxd) maxd=parseInt(alt[i]);
	}

	var ps='M'+pad[3]+' '+vpos;
	for(i=0;i<365;i+=6) {
//		canvas.rect(pad+(i/365)*len,vpos-alt[i]/maxd*vpos,2,alt[i]/maxd*vpos).attr({fill:'#fff',stroke:'#fff','stroke-width':0});	
		ps+='L'+(pad[3]+(i/365)*len)+' '+(vpos-alt[i]/maxd*(vpos-pad[0]));
	}
	ps+='L'+Math.round(pad[3]+len)+' '+vpos+'z';
	canvas.path(ps).attr({'stroke-width':style.strokewidth,'stroke':style.stroke,'fill':style.fill}).node.setAttribute('class','densityCurve');

	for(var i=0;i<13;i++) {
		canvas.rect(pad[3]+i*len/12,vpos-0,1,style.axisticks).attr({fill:'#777','stroke-width':0});	
		if(style.grid) canvas.rect(pad[3]+i*len/12,0,0.5,vpos).attr({fill:'#000','stroke-width':0});
		if(i<12) canvas.text(pad[3]+(i+0.5)*len/12,vpos+5+style.axisthickness,style.longmonth ? meseslong[i].substr(0,3) : meses[i]).attr({'font-family':'helvetica','font-size':style.axislabsize,'fill':coresmeses[i]});
	}

	canvas.path(ps).attr({'stroke-width':style.strokewidth,'stroke':style.stroke}).node.setAttribute('class','densityCurveStroke');

	for(i=0;i<coresestacoes.length;i++) {
		canvas.rect(pad[3]+(estacoes[i]/365)*len,vpos,((estacoes[i+1]-estacoes[i])/365)*len,style.axisthickness).attr({fill:coresestacoes[i],'stroke-width':0});
	}
	
// draw highlighted intervals	
	var high=$('#'+idel+' input[name=floracaohighlight]');
	if(high.size()>0) {
		var interv;
		high=high.val();
		high=high.split(',');
		for(i=0;i<high.length;i++) {
			interv=high[i].split('-');
			if(interv[0]==interv[1]) {interv[0]=parseInt(interv[0])-3;interv[1]=parseInt(interv[1])+3;}
			ps='M'+(pad[3]+(parseInt(interv[0])/365)*len)+' '+vpos;
			for(j=parseInt(interv[0]);j<=parseInt(interv[1]);j++) {
				ps+='L'+(pad[3]+(j/365)*len)+' '+(vpos-alt[j]/maxd*(vpos-pad[0]));				
			}
			ps+='V'+vpos+'z';
			canvas.path(ps).attr({'stroke-width':style.strokewidth,'stroke':'#0f0','fill':'#0f0','fill-opacity':0.6});
		}
	}
		
	if(style.title!=false) {
		canvas.text(wid,7,style.title).attr({'font-family':'helvetica','font-size':'14','fill':'white','text-anchor':'end'});
		canvas.text(wid,style.title=='' ? 7 : 20,style.subtitle).attr({'font-family':'helvetica','font-size':'9','fill':'white','text-anchor':'end'});
	}
}

function onDisplaySpLoad(select) {
	//$('#distribuicao').appendTo('#info-mapa').show();
	$('#pesquisa-content').show();
	$('#dica').show();
	if($('input[name=nomesp]').val()) document.title=$('input[name=nomesp]').val()+' | ' + pageTitle;
	caixaPesquisaToSmall(true);
	hideBancada();

	$('#pesquisa-content').removeClass().addClass('fichaespecie');
	var hei=$(window).height();
	showSeparador('pesquisar');
//	document.getElementById('se-pesquisar').addEventListener('scroll', function(ev) {removeBaloons(false);}, {passive:true});
	$('#se-pesquisar').scroll(function(e) {
		//if(e && document.getElementById('rightc').offsetLeft==0) document.getElementById('mainflex').classList.add('contracted');	// it's a real scroll event
		removeBaloons(false);
	});

	if(select) selectCurrentSpecies();
//***** diagramas de variáveis quantitativas
//	drawDiagram('altitude',$('.fichaespecie input[name=altitude]').val(),2000,'m','#0f6');
	if($('.fichaespecie input[name=altitudemaxmin]').size()>0) drawDensity('altitude',$('.fichaespecie input[name=altitude]').val(),[0,2000],'#0f6',$('.fichaespecie input[name=altitudemaxmin]').val().split(','),false);
	if($('.fichaespecie input[name=distmarmaxmin]').size()>0) drawDensity('distmar',$('.fichaespecie input[name=distmar]').val(),[0,250000],'#85f',$('.fichaespecie input[name=distmarmaxmin]').val().split(','),true);
	if($('.fichaespecie input[name=precipitacaomaxmin]').size()>0) drawDensity('precipitacao',$('.fichaespecie input[name=precipitacao]').val(),[0,4000],'#85f',$('.fichaespecie input[name=precipitacaomaxmin]').val().split(','),false);
//	if($('.fichaespecie input[name=latitudemaxmin]').size()>0) drawDensity('latitude',$('.fichaespecie input[name=latitude]').val(),[3695,4216],'#0f6',$('.fichaespecie input[name=latitudemaxmin]').val().split(','),false);
//	drawDiagram('distmar',$('.fichaespecie input[name=distmar]').val(), $('.fichaespecie input[name=distmarunit]').val()=='km' ? 250 : 5000, $('.fichaespecie input[name=distmarunit]').val(),'#85f');
	drawFloracao('floracao',$('.fichaespecie input[name=floracao]').val(),{fill:'#fff',stroke:'#ccc',strokewidth:0,grid:false,title:false,pad:[0,0,0,1]});
	if($('.fichaespecie input[name=dispersion]').size()>0) 
		drawFloracao('dispersion',$('.fichaespecie input[name=dispersion]').val(),{fill:'#fff',stroke:'#ccc',strokewidth:0,grid:false,title:false,pad:[0,0,0,1]});
	$('.fichaespecie #bio-grafico1 a').load($('.fichaespecie #bio-grafico1 input[name=url]').val());
	$('.fichaespecie #bio-grafico2 a').load($('.fichaespecie #bio-grafico2 input[name=url]').val());
//****************

	loadRegistos();	
	if(mapdistr) mapdistr.fitBounds(latlngbnd_leaf);
	
	adjustFichaSpLayout(true);
	$('.fichaespecie .link[name=eliminar]').click(function() {		// elimina infocom
		var thisel=this;
		$.post('mapas.php',{what:'deleteinfocom',idcom:$(this).find('input[name=idcom]').val()},function(d) {
			if(d=='[0]') alert('Algum erro, comentário não eliminado.'); else {
				$(thisel).parents('.infocom').remove();
			}
		});
	});
	
	$('.fichaespecie .editable').mouseenter(function() {
		if(!$('input[name=edicao]').is(':checked')) return;
		if($('div.editar textarea').size()==0 || $('.janela.distcar textarea').size()>0) $('div.editar').remove(); else return;
		var pos=$(this).offset();
		if($(this).attr('name')=="thumb") {	
			setCropOrgao(this);
		} else {
			$('<div class="editar floating" name="'+$(this).attr('name')+'"><p>editar</p></div>')
				.css({left:pos.left-2,top:pos.top-2,width:$(this).width(),height:$(this).height(),opacity:0.5})
				.data('el',this)
				.mouseleave(function(){$(this).remove();})
				.click(editWikiEco)
				.appendTo('body');
		}
	});
	attachBaloonTip($('.fichaespecie .showtooltip.big').add('.fichaespecie .showtooltip'),{wid:220,style:{textAlign:'justify'}},[0,0],{anim:true,rad:10,curv:5,padding:10});
	attachBaloonTip($('.fichaespecie .showtooltip.small'),{wid:140,style:{textAlign:'center'}},[0,0],{anim:true,rad:10,curv:5,padding:8});
	
/*	attachBaloonTip($('.fichaespecie .showtooltip.big'),'<div class="janela semnada" style="position:absolute;width:220px;"><div class="content" style="text-align:justify">{1}</div></div>',[0,0],{anim:true,rad:10,curv:5,padding:10});
	attachBaloonTip($('.fichaespecie .showtooltip.small'),'<div class="janela semnada" style="position:absolute;width:140px;"><div class="content" style="text-align:center">{1}</div></div>',[0,0],{anim:true,rad:10,curv:5,padding:8});*/
	
	$('.fichaespecie .toolbar.accoes .button').click(function() {editButtons(this);});
	
	$('#infodistr span.link.centrar').click(function(e) {
		mapdistr.invalidateSize();
		mapdistr.fitBounds(latlngbnd_leaf);
	});

	attachComoCitar2($('#infodistr span.link.citar').add('#detalhes-especie .download'),$('input[name=nomesp]').val().replace(/ /g,'+'));

/*	$('#infodistr a.descarr:not(.noclick)').click(function(e) {
		if($('.descarregarmapa').size()>0) return;
		e.preventDefault();
		$(this).html('preparando...');
		
		var imel=$('<img style="position:absolute;top:0px;left:0px;z-index:1000" class="image" src="'+$('#infodistr input[name=linkmapa]').val()+'&disp=dl"/>').css({opacity:0}).appendTo('body');
		imel.load(function(){
			$('#infodistr a.descarr').html('descarregar');
			messageBox('<div class="map-holder" style="float:left;"><img style="height:500px;border-bottom-left-radius:8px;border-top-left-radius:8px;" src="'+this.src+'"/></div><div style="float:left;margin-left:10px;width:300px"><h1>Mapa de distribuição</h1><p class="unimportant" style="margin-top:-12px">este mapa pode estar incompleto</p><a href="'+$('#infodistr input[name=linkmapadl]').val()+'">descarregar este mapa em grande</a><h1 style="margin-top:8px">ou</h1><p>para usar este mapa num blogue ou site, copie a ligação:</p><p class="quote">&lt;img src="http://www.flora-on.pt/'+$('#infodistr input[name=linkmapa]').val()+'"/&gt;</p><p><br/>Ao usar esta ligação, terá a garantia que o mapa fica sincronizado com os dados do Flora-On.</p><br/><h1>Como citar este mapa</h1><p class="quote citacao"></p></div>',null,{classes:'fixed descarregarmapa',closebutton:true,closeonclick:false,resizeEvent:false});
			$(this).remove();

			$.get($('#infodistr input[name=linkmapa]').val()+'&f=cita',function(rt) {
				$('.descarregarmapa .citacao').html(rt);
			});
		});
	});*/
	
	if($.address.value().substr(1,1)=='h') clickHighresFichaSp($('#fotochooser .thumbnail').filter(function() {
		return($(this).children('img').attr('src').slice(-8,-4)==$.address.value().substr(2))
	}).children('img')[0],false);
	
	$('#infodistr span.link.centrar').click();

	var thumbs=document.querySelectorAll('#fotochooser .thumbnail');
	for(var i=0;i<thumbs.length;i++) {
		thumbs[i].addEventListener('touchstart',function(ev) {
			if(ev.touches.length>1) {
				clickHighresFichaSp(ev.target,true);
			}
		},false);
	}
	
/*	loadXMLDoc($('.fichaespecie input[name=scatter1]').val(),function(ev) {
		ev=ev.target;
		if(ev.readyState==4 && ev.status==200) {
			document.getElementById('scatter1').innerHTML=ev.responseText;
		}
	});	*/
	waitEnd();
}

function attachComoCitar2(el,anchor) {
	el.click(function(e) {
		wait();
		ga('send', 'pageview', '/mapas?q='+$(this).find('a').attr('href'));
		$.get('mapas.php?what=map&q='+anchor+'&f=cita',function(rt) {
			$('.comocitar').remove();
			messageBox('<h1>Como citar este mapa</h1><div class="quote">'+rt+'</div><p class="emph">Os colaboradores disponibilizam estes dados de forma voluntária e gratuita. Por favor, ao usar os dados, dê o devido crédito aos colaboradores envolvidos.</p>',null,{wid:$(window).width()/3,classes:'fixed comocitar',closebutton:true,closeonclick:false,resizeEvent:false});
			waitEnd();
		});
		return(true);
	});
}

function addressValue(value) {
	if(window.location.search.substring(1)!='') {
		window.location='/#'+value;//.prepareString();
		return(false);
	} else $.address.value(value);
	return(true);
}

function saveDistribuicao() {
	if(!mapdistr) return;
	mapdistr.remove();
	mapdistr=null;
	return;
/*	var el=$('<div></div>').css({width:$('#distribuicao').width(),height:$('#distribuicao').height()});
	$('#distribuicao').hide().appendTo('body');
	el.appendTo('#info-especie');*/
}

function displaySp(id,upd,select,all) {			// all: true é para mostrar ficha da espécie com todas as subsp; false é para mostrar só a subespécie
	if($('#rightc .detalhes').size()>1) return;	// está a mudar de sp
	if(upd) if(!addressValue((all?'7':'0')+id)) return;
	$('#se-pesquisar').unbind('scroll');
	wait();
//	cleanRegistos(true);
	showLeft(false,null,0);

	if(isArray(id)) id=id[0];
	if(id.indexOf(',')>-1) id=id.substr(0,4);
	
//	$('<div class="detalhes-wrap"></div>').prependTo('#se-explorar').css({'display':'block'}).append('<div id="fotoshow" class="foto"></div><div class="detalhes"></div><p style="clear:both"/>');
	if(all==true) var suf='&all=1'; else var suf='';
/*	$('#distribuicao').appendTo('body');
	$('#pesquisa-content').load("fichasp.php?q="+id+suf,function(){onDisplaySpLoad(id,select);});*/
	$.get("fichasp.php?q="+id+suf+"&wid="+($('#pesquisa-content').width()-20),function(d){
	//alert(d);
//		saveDistribuicao();
		$('#pesquisa-content').html(d);
		onDisplaySpLoad(select);
	});
}

function publicaInformComment() {
	if($('#informcomment').size()>0) return;
	var wid=$(window).width();
	var hei=$(window).height();
	$('<div id="informcomment" class="janela floating"><h1>Publicar comentário</h1><textarea></textarea><div class="toolbar"><div class="button gravar"><img src="images/add_48.png"/>Publicar</div></div><div class="button sair"><img src="images/cancel_48.png"/>Fechar</div><p style="clear:both"/></div>')
		.appendTo('body')
		.css({left:wid*0.3,top:hei*0.25})
		.find('.button').click(function() {
			if($(this).hasClass('sair')) {
				$('#informcomment').remove();
			}
			
			if($(this).hasClass('gravar')) {
				$.post('mapas.php',{
					what: 'infocom'
					,ident: $('.fichaespecie input[name=identagrup]').val()
					,text: $.trim($('#informcomment textarea').val()).replace(/\n/g, '<br/>')
				},function(d) {
					if(d!='[0]') alert('Algum erro ocorreu, comentário não inserido.'); else window.location.reload();
				});
			}
			
		});
	
}

/*
	Fill in the taxonomic tree on the left
*/
function populateTaxa(el,callback,obj) {		// se el==null, popula raiz
	if(el==null) {
		var ft=parseInt($('#filtrotaxon>.selected').attr('name'));
		var id=0;
		$('#taxtree>ul').empty();
	} else {
		var ft=el.data('d').t+1;
		var id=el.data('d').id;
		if(ft==5) {
			id=el.data('d').ident[0];
		} else {
			if(isArray(id)) {
				for(var i=0;i<id.length;i++) {
					if(id[i]!='null') {id=id[i];break;}
				}
			}
		}
	}
	$.get('tax.php',{id:id,ty:ft},function(d) {
			var data=$.parseJSON(d);
			var prefix=null;
			if(el==null) {			
				var tt=$('#taxtree>ul');
				tt.removeClass();
			} else {
				if(el.children('ul').size()>0) {
					if(callback) {callback(obj);}
					return;
				}
				var tt=$('<ul class="nivel'+ft+'"></ul>');
				el.removeClass('loading');
			}
			switch(ft) {
				case 1:prefix="or";break;
				case 2:prefix="fa";break;
				case 3:prefix="ge";break;
				case 4:prefix="sp";break;
				case 5:prefix="ss";break;
			}
			var ins;
			for(var i=0;i<data.length;i++) {
				if(data[i].t.indexOf('-(1)') !== -1) {
					var dispname = data[i].t.replace('-(1)', '<sup>(1)</sup>');
					var hasSensu = false;
				} else if(data[i].t.indexOf('-(2)') !== -1) {
					var dispname = data[i].t.replace('-(2)', '<sup>(2)</sup>');
					var hasSensu = true;
				} else {
					var dispname = data[i].t;
					var hasSensu = false;
				}
				ins=$("<li>"+dispname+"</li>").data('d',{id:data[i].id[0],t:ft,n:data[i].t,ident:data[i].a});			// CADA ENTRADA NA ÁRVORE TEM ESTA INFORMAÇÃO Nota: ident é só para a espécie
				if(data[i].a===null) ins.addClass('old');
				if(data[i].sf==1) ins.addClass('semfoto');
				if(data[i].o===0) ins.addClass('old');
				if(hasSensu) {
					ins.addClass('old');
					ins.attr('title', 'Este taxon corresponde a uma interpretação antiga do nome, o seu uso não é recomendado');
				}
				switch(ft) {
					case 4:
					case 5:
						if(data[i].e==1) ins.addClass('endempt').attr('title','Endémica');
						if(data[i].e==3) ins.addClass('exotica').attr('title','Introduzida');
						break;
					default:
						if(data[i].e>0) {
							ins.addClass('endempt');
							switch(ft) {
								case 1: var suf='nesta ordem';break;
								case 2: var suf='nesta família';break;
								case 3: var suf='neste género';break;
							}
							if(data[i].e==1)
								ins.attr('title','1 endemismo português '+suf);
							else
								ins.attr('title',data[i].e+' endemismos portugueses '+suf);
						} else if(data[i].e<0) ins.addClass('exotica').attr('title',(ft==2 ? 'Família introduzida' : 'Género introduzido'));
						break;
				}
				ins.appendTo(tt);
			}
//			tt.find('li').tooltip({track:true,delay:300,showURL:false,showBody:' - ',fade:0});
			updateFiltro(tt);
			
			if(el!=null) {
				var hei=tt.css({display:'none'}).appendTo(el).height();
				tt.css({height:0,display:'block',opacity:1}).animate({height:hei},200,'easeOutQuad',function(){$(this).css({height:'auto'});updateScrollBarSize();});
			}
			tt.addClass("nivel"+ft);
			if(ft<4) {		// expande ramo
				tt.find('li').click(function(e){
					var el=$(this);
					if(el.hasClass('dormant')) return(false);					
					setTimeout(function(){el.removeClass('dormant');},500);
					var tt=$(this).children('ul');					
					if(tt.size()>0 && tt.is(':visible')) {				// filhos existem, esconde filhos
						tt.animate({height:0,opacity:0},200,'easeOutQuad',function(){$(this).hide();updateScrollBarSize();});
					} else {
						switch(ft) {
							case 1:
								if($('.separador.selected').attr('id')=='se-pesquisar' && !el.hasClass('semfoto') && $('.janela.confsp').size()==0) displayOrdem($(this).data('d').n);		// é ordem, pesquisa famílias
								break;
							case 2:
								if($('.separador.selected').attr('id')=='se-pesquisar' && !el.hasClass('semfoto') && $('.janela.confsp').size()==0) displayFamilia($(this).data('d').n);		// é família, pesquisa géneros
								if($('.separador.selected').attr('id')=='se-webgis') {
									if($('#webgis-tools .temporary .button').size()>=3) $('#webgis-tools .temporary .button').eq(0).remove();
									var tmp=$('<div class="button text oneline" title="<h1>Mostrar camada</h1><p>número de espécies da família '+$(this).data('d').n+'<br/>por quadrícula</p>"><input type="hidden" name="pesq" value="'+$(this).data('d').n+'"/>'+$(this).data('d').n+'</div>');
									tmp.click(clickWebgisTools);
									attachBaloonTip(tmp,{wid:'auto',style:{textAlign:'justify'}},[0,0],{anim:false,rad:10,curv:5,padding:8});
									tmp.insertBefore('#webgis-tools .temporary p');
								}
								break;
							case 3:
								if($('.separador.selected').attr('id')=='se-pesquisar' && !el.hasClass('semfoto') && $('.janela.confsp').size()==0) makePesquisa($(this).data('d').n,true,true,true,null,false);		// é género
								if($('.separador.selected').attr('id')=='se-webgis') {
									if($('#webgis-tools .temporary .button').size()>=3) $('#webgis-tools .temporary .button').eq(0).remove();
									var tmp=$('<div class="button text oneline" title="<h1>Mostrar camada</h1><p>número de espécies do género <i>'+$(this).data('d').n+'</i><br/>por quadrícula</p>"><input type="hidden" name="pesq" value="'+$(this).data('d').n+'"/><i>'+$(this).data('d').n+'</i></div>');
									tmp.click(clickWebgisTools);
									attachBaloonTip(tmp,{wid:'auto',style:{textAlign:'justify'}},[0,0],{anim:false,rad:10,curv:5,padding:8});
									tmp.insertBefore('#webgis-tools .temporary p');
								}
								break;
						}
						if(tt.size()>0) {
							var hei=tt.css({display:'none',height:'auto'}).height();
							tt.css({height:0,display:'block',opacity:1}).animate({height:hei},200,'easeOutQuad',function(){$(this).css({height:'auto'});updateScrollBarSize();});
						} else {
							el.addClass('dormant').addClass('loading');
							populateTaxa(el);
						}
					}
					return(false);
				});
				
/*					if(ft==3 && !comparar) makePesquisa($(this).data('d').n,true);
					var tt=$(this).children('ul');
					if(tt.length>0) {
						var hei=tt.css({display:'none',height:'auto'}).height();
						tt.css({height:0,display:'block',opacity:1}).animate({height:hei},350,'easeInOutQuad',function(){$(this).css({height:'auto'});});
					} else {
						populateTaxa($(this));
					}*/
			} else {		// CLICA ESPÉCIE. mostra ficha espécie ou adiciona ao quadro ou aos registos
				tt.find('li').click(function(e){
					e.stopPropagation();
					var el=$(this);
					var selsep=$('.separador.selected').attr('id');	
					if(!el.data('d').id && selsep!='se-registos' && selsep!='se-webgis' && $('.janela.confsp').size()==0) return(false);
					if(el.hasClass('dormant')) return(false);
					el.addClass('dormant');
					setTimeout(function(){el.removeClass('dormant');},1000);
//					if(el.data('d').ident.length==1) {		// a espécie não tem subespécies
					switch(selsep) {
						case 'se-comparar':
							if(el.data('d').id==null) return(false);
							var ids=[];
							for(var i=0;i<el.data('d').id.length;i++) {
								if(el.data('d').id[i]!='null') ids.push(el.data('d').id[i]);
							}
							
							el.toggleClass('selected');
							el.siblings('li').each(function() {		// se algum irmão é sinónimo, clica também.
								if($(this).data('d').id==ids) {
									if(el.hasClass('selected')) $(this).addClass('selected'); else $(this).removeClass('selected');
								}
							});
							// se há sinónimos não irmãos, paciência!!
							showSeparador('comparar');
							if(el.hasClass('selected'))
								addToQuadro(ids,true,true,true);
							else
								removeFromQuadro(ids);
							break;
						case 'se-indicetematico':
						case 'se-pesquisar':		// está na ficha de espécie
							if($('.janela.confsp').size()>0) {		// mas na caixa de escolher confusões
								if(el.data('d').t==5) {
									var txt=el.parent().parent().parent().parent().data('d').n+' '+el.parent().parent().data('d').n+' '+el.data('d').n;
									var parent=el.parent().parent().data('d').ident;
								} else {
									var txt=el.parent().parent().data('d').n+' '+el.data('d').n;
									var parent=null;
								}
								var valor=el.data('d').ident;
								if(valor.length>1) valor=-valor[0];		// se é para adicionar sem se saber a subsp, põe negativo.
								$('.janela.confsp ul.spp li.toremove').remove();
								$('<li><input type="hidden" name="ident" value="'+valor+'"/><img src="images/cancel_48.png"/>'+txt+'</li>').children('img').click(function(){$(this).parent().remove();}).parent().appendTo('.janela.confsp ul.spp');
							} else {
								if(el.data('d').id==null ||
									el.hasClass('selected') ||
									isWaiting()
								) return(false);
								$('#taxtree li.selected').removeClass('selected');
								var guid=el.data('d').id[0];
								if(el.data('d').id[0]=='null') {
									for(var i=0;i<el.data('d').id.length;i++) {
										if(el.data('d').id[i]!='null') {guid=el.data('d').id[i];break;}
									}
								}
								if(guid=='null') guid=el.data('d').ident[0]+'';//return(false);
								el.addClass('selected');
								if(el.data('d').t==5)
									var txt=el.parent().parent().parent().parent().data('d').n+'+'+el.parent().parent().data('d').n+'+'+el.data('d').n;
								else
								var txt=el.parent().parent().data('d').n+'+'+el.data('d').n;
								gotoAddr('1'+txt);
//								displaySp(guid,true,false,(el.data('d').ident.length>1));	// para mostrar a espécie mesmo
							}
							break;
						case 'se-registos':							// para adicionar registo
							if(el.data('d').t==5) {		// é subespécie
								var txt=el.parent().parent().parent().parent().data('d').n+' '+el.parent().parent().data('d').n+' '+el.data('d').n;
								var parent=el.parent().parent().data('d').ident;
							} else {
								var txt=el.parent().parent().data('d').n+' '+el.data('d').n;
								var parent=null;
							}
//							$('#q1').val('').keyup().focus();
							var valor=el.data('d').ident;
							if(valor.length>1) {
								valor=-valor[0];		// se é para adicionar sem se saber a subsp, põe negativo.
							}
							addEspecieRegistos(txt,valor,parent);
							break;
						case 'se-areapessoal':
							var sim=true;
							if($('#se-areapessoal table.lista tbody tr.modified').size()>1) var sim=confirm("Todos os registos não gravados serão perdidos! Continuar?");
							if(sim) {
								unCheckAll();
								$('#se-areapessoal table.lista tbody').empty();
								var txt=el.parent().parent().data('d').n+' '+el.data('d').n;
								$.post('mapas.php',{what:'loaddetalhes',nome:txt},carregaPorNome);
							}
							break;
							
						case 'se-webgis':
							if(el.data('d').t==5) {		// subespécie
								var txt=el.parent().parent().parent().parent().data('d').n+' '+el.parent().parent().data('d').n+' '+el.data('d').n;
							} else {					// espécie
								var txt=el.parent().parent().data('d').n+' '+el.data('d').n;
							}
							//$('#taxtree li.selected').removeClass('selected');						
							el.toggleClass('selected');

							if(el.hasClass('selected')) {
//								$('#webgis-camadas-wrap .button').mouseleave();		// primeiro despromove as que já lá estão a semitransparentes
								$('#webgis-camadas-wrap .button.selected').mouseleave().removeClass('selected');

								var ident=$('#webgis-camadas-wrap .button input[name=ident]').map(function() {
									if(this.value.indexOf(',')>-1) {
										return(zeroPad(parseInt(this.value.split(',')[0]),4));
									} else return(zeroPad(parseInt(this.value),4));
								}).get();
								var adicionou=false;
								var highlight=[];
								for(var j=0;j<el.data('d').ident.length;j++) {
//								for(var j=0;j<1;j++) {
									var pos=$.inArray(zeroPad(el.data('d').ident[j],4),ident);
									if(pos==-1) {
										highlight.push(el.data('d').ident[j]);
										ident.push(zeroPad(el.data('d').ident[j],4));
										adicionou=true;
									} else $('#webgis-camadas-wrap .button').eq(pos).mouseenter();
/*									var guid=el.data('d').id[j];
									var ident=el.data('d').ident[j];
									addCamada(ident,guid,txt,'#ff0000',0.5,true,true,true,0);*/
								}
								if(adicionou) displayQuadOnMap3(mapwebgis,'id'+ident.join(''),null,{upd:true,highlight:highlight});
							} else {
								el.find('.selected').removeClass('selected');
								removeBaloons(false);
								var ident=el.data('d').ident;
								var remel=$('#webgis-camadas-wrap .button').filter(function() {
									var identtmp=$(this).children('input[name=ident]').val();
									if(identtmp.indexOf(',')>-1) {
										return( ident.indexOf(parseInt(identtmp.split(',')[0]))>-1 );
									} else return( ident.indexOf(parseInt(identtmp))>-1 );
//									return(parseInt($(this).children('input[name=ident]').val())==parseInt(el.data('d').ident));
								});
								
/*								remel.each(function() {
									var sh=$(this).data('shape');
									if(sh) {for(var i=0;i<sh.length;i++) sh[i].setMap(null);}
								});*/
								remel.addClass('fading');
								var ident=getWebGisCamadas();
								
//								var ident=$('#webgis-camadas-wrap .button:not(.fading) input[name=ident]').map(function() {return(zeroPad(this.value,4));}).get();
								if(ident.length==0) {
									limpaMapa(2);
									addressValue('w');
								} else {
									remel.hide('slide',{direction:'right'},function() {$(this).remove();});
//									remel.fadeOut(function() {$(this).remove();$('#webgis-camadas').height($('#webgis-camadas-wrap').outerHeight());});
									displayQuadOnMap3(mapwebgis,'id'+ident.join(''),null,{upd:true});
								}
							}
							break;
							
						case 'se-bioclima':
							if(el.data('d').t==5) {		// subespécie
								var txt=el.parent().parent().parent().parent().data('d').n+' '+el.parent().parent().data('d').n+' '+el.data('d').n;
							} else {					// espécie
								var txt=el.parent().parent().data('d').n+' '+el.data('d').n;
							}
							$('#taxtree li.selected').removeClass('selected');
							var qs=getPesquisaQueryString().ori[0];
							gotoAddr('b'+(qs=='' ? '' : qs+',')+txt.prepareString());
//							addQueryBioclim(txt);
							el.addClass('selected');
							/*
							el.toggleClass('selected');

							if(el.hasClass('selected')) {
								addQueryBioclim(txt);
							} else {
							}*/
							break;
					}
					if(el.data('d').ident.length>1) {								// a espécie tem subespécies
						var tt=$(this).children('ul');
						if(tt.size()>0) {				// filhos existem
							if(tt.is(':visible'))		// esconde filhos
								tt.animate({height:0,opacity:0},200,'easeOutQuad',function(){$(this).hide();updateScrollBarSize();});
							else {						// mostra filhos
								var hei=tt.css({display:'none',height:'auto'}).height();
								tt.css({height:0,display:'block',opacity:1}).animate({height:hei},200,'easeOutQuad',function(){$(this).css({height:'auto'});updateScrollBarSize();});
							}
						} else {						// filhos não existem
							el.addClass('dormant').addClass('loading');
							populateTaxa(el);
						}	
					}
					return(false);					
				});
			}
			updateScrollBarSize();
			if(callback) callback(obj);
		}
	);
}


function updateFiltro(elem){
	var elemori=elem;
//	var foi=false;
// filtroendem	
//	var el=$('#filtroendem .selected');
	if(elem)
		var elem=elem.find('li');
	else
		var elem=$('#taxtree ul>li');
/*	switch(el.attr('name')) {
		case '1':
			elem.filter('.endempt').css("display","block");
			elem.not('.endempt').css("display","none");
			foi=true;
			break;
		case '2':
			elem.not('.semfoto').css("display","block");
			elem.filter('.semfoto').css("display","none");
			foi=true;
			break;
		case '3':
			$('#teclado .selected').removeClass('selected');
			$('#taxtree ul>li').css("display","block");
			foi=true;
			break;
	}*/

	if(!elemori) {		// primeiro filtro das letras
		var filtro=$('#teclado .selected').html();
		if(filtro) {
			var f=filtro.length;
			if(f>1) {
				$('#q1').val('');
				$('#taxtree ul>li').css("display","block");
			} else {
				$('#taxtree>ul>li').filter(function(i){
					var f=filtro.toLowerCase();
					return ($(this).text().substring(0,f.length).toLowerCase()!=f);
				}).css("display","none");
				//if(!foi) {
					$('#taxtree>ul>li').filter(function(i){
						var f=filtro.toLowerCase();
						return ($(this).text().substring(0,f.length).toLowerCase()==f);
					}).css("display","block");
				//}
			}
			$('#taxtree').scrollTop(0);
			updateScrollBarSize();
		}
	}
}

function updateBancadaAddress() {
	var set=$('#bancada .foto-banc');
	var out=[];
	var pos;
	for(var i=0;i<set.size();i++) {
		out.push(set.eq(i).children('input').val());
	}
	addressValue('5'+out.join(''));

		/*pos=set.eq(i).offset();
		if(pos.left<0) pos.left=0;
		if(pos.top<0) pos.top=0;
		var src=set.eq(i).children('input').val();
		out.push(src+encodeXY(Math.floor(pos.left),Math.floor(pos.top)));*/

}

function updateAddress() {
	if($('#bancada').is(':visible')) {updateBancadaAddress();return;}
	switch($('.separador.selected').attr('id')) {
		case 'se-pesquisar':
			if($('#se-pesquisar input[name=id]').size()>0) {
				var ids=$('#se-pesquisar input[name=id]').val().split(',');
				for(var i=0;i<ids.length;i++) if(ids[i]!="") {					
					addressValue('0'+ids[i]);
					break;
				}
			} else {
				if($('input[name=query]').size()>0)	addressValue('1'+$('input[name=query]').val()); else addressValue('');
			}
			break;
		case 'se-comparar':
			var ids=getQuadroIDs();
			var orgs=getQuadroOrgs();
			var sizes=[];
			for(var i=0;i<orgs.length;i++) sizes[i]=5;
			orgs.splice(0,0,orgs.length);
			sizes.splice(0,0,4);
			addressValue('4'+encode64(orgs,sizes)+getQuadroIDs().join(''));
			//addressValue('4'+getQuadroIDs().join('')+'!or'+getQuadroOrgs().join('-'));
/*			var ids=getQuadroIDs();
			var siz=[];
			for(var i=0;i<ids.length;i++) siz[i]=12;
			ids.splice(0,0,1,ids.length);
			siz.splice(0,0,2,4);
			alert(ids);
			alert(siz);
			alert(encode64(ids,siz));
			addressValue(encode64(ids,siz));*/
			break;
		case 'se-explorar':
			//addressValue('0'+$('#se-explorar').find('input[name=id]').val());
			break;
	}
}

function caixaKeyUp() {		
	xmlhttp=GetXmlHttpObject();
	if (xmlhttp==null) {
		//alert ("Your browser does not support XMLHTTP!");
		return;
	}
	
	var q=document.getElementById('q').value;
	q=q.replace(/^\s+/,"");
	q=q.toLowerCase();
	//var nc=document.getElementById('ncc').checked;
	if(!q) {$('#sugestoes').hide('slide',{direction:'up'});$('#sugestoes-wrap').animate({height:0},400,function(){$(this).hide();});return;}
	xmlhttp.onreadystatechange=stateChanged;
	xmlhttp.open("GET","namequery.php?q="+q,true);
	xmlhttp.send(null);	
}

function caixaKeyUpPequena(id,dest) {
	var q=$(id).val();
	q=q.replace(/^\s+/,"");
	q=q.toLowerCase();
	if(!q) {$('.baloon').hide();return;}
	$.get('namequery.php',{q:q,lim:5,maxn:100},function(d){
		var data=$.parseJSON(d),i;
		var out=[],outstr='',tits=[];
		if(data.length==0) {$('.baloon').hide();return;}
		for(i=0;i<data.length;i++) {
			if(!out[data[i][2]]) out[data[i][2]]=[];
			out[data[i][2]].push('<span class="link" style="padding-left:10px;text-indent:-10px;display:block;">'+data[i][0]+'</span>');
			tits[data[i][2]]=data[i][3];
		}
		var n=0;
		for(i=0;i<out.length;i++) {if(out[i]) n++;}
		for(i=0;i<out.length;i++) {
			if(out[i]) outstr+='<div style="float:left;width:'+Math.round((1/n)*100)+'%;"><div style="font-size:13px;color:white;text-align:center;">'+tits[i]+'</div>'+out[i].join('')+'</div>';
		}
		
		showBaloonTemplate({wid:480,style:{textAlign:'left'}}//'<div class="janela semnada" style="position:absolute;width:480px;text-align:left"><div class="content" style="width:100%">{1}</div></div>'
			,'<h1>Sugestões</h1>'+outstr+'<p style="clear:both"/>'
			,{elem:$(id)},true,{rad:12,curv:6,padding:8,anim:false});
		$('.baloon .link').click(function() {
			switch($('.separador.selected').attr('id')) {
				case 'se-pesquisar': pesquisaCriterios($(this).text(),1);break;
				case 'se-webgis': pesquisaCriterios($(this).text(),2);break;
			}
		});			
	});
}

function drawWidget(el,width,height,mini,maxi) {
	var canvas=Raphael(el,width,height);
	canvas.path('M10,10l100,0').attr({'stroke':'#777','stroke-width':6,'stroke-linecap':'round'});
//	.text(0,0,'dasff').attr({'font-family':'helvetica','font-size':'14','fill':'#000'});
}

function showCorrector() {
	if($('#corrector').size()>0) return;
	$('<div class="janela" id="corrector"><img class="closewindow" src="./images/no.png"/><h1>Validador e corrector de nomes científicos</h1><p>Com esta ferramenta, pode carregar um ficheiro de texto contendo nomes de espécies (vindo, por exemplo, do Excel) para o Flora-On automaticamente corrigir os erros que possa haver e completar com a família, os autores dos <i>taxa</i>, categoria de ameaça e outros dados.</p><p><b>Instruções</b><ol><li>Escreva os nomes que quer validar num ficheiro de texto (1 por linha) ou na 1ª coluna de uma folha de cálculo (ex: Excel). Em cada célula deve ficar o nome completo com ou sem subespécie, conforme o caso, e <u>sem</u> autores. Exemplos: <table cellspacing="0"><tr><td>Cistus ladanifer subsp. ladanifer</td></tr><tr><td>Tuberaria lignosa</td></tr><tr><td></td></tr></table></li><li>Grave o documento como texto separado por tabulações ou outro formato de texto.</li><li>Carregue o ficheiro usando a caixa em baixo. Logo a seguir poderá descarregar o mesmo ficheiro ao qual foram acrescentadas várias colunas com correcções e outras informações.</li></ol></p><form action="./corrector.php" method="post" enctype="multipart/form-data" target="frameupload"><input type="hidden" name="what" value="corrigir"/><h2>Seleccione o ficheiro de texto com nomes a validar</h2><input type="file" name="ficheironomes" id="ficheironomes" /><input type="submit" value="Carregar"/><p>Este serviço está limitado a 700 nomes por ficheiro.</p></form></div>')
		.appendTo('body');
	$('#corrector .closewindow').click(function(){$('#corrector').remove();});
	$('#frameupload').unbind().load(function() {
		var resp=$.parseJSON($('#frameupload').contents().text());
		if(resp.error) $('#corrector').append('<p style="color:red;font-size:12px;">'+resp.error+'</p>');
//		.find('table tr').appendTo('#se-areapessoal table.lista tbody');
		
/*		var chk=$('#se-areapessoal table.lista tbody tr');			// extrai latlong para data
		var lat=chk.find('td input[name=lat]').map(function() {return(parseFloat(this.value));}).get();
		var lng=chk.find('td input[name=long]').map(function() {return(parseFloat(this.value));}).get();
		chk.find('td input[name=long]').remove();
		chk.find('td input[name=lat]').remove();
		for(var i=0;i<lat.length;i++) chk.eq(i).data('latlng',[lat[i],lng[i]]);
		tabelaUpdated(0);*/
	});
}

function showAreasProtegidas() {
	document.getElementById('mosaico-rnap').classList.remove('hidden');
}

function hideAreasProtegidas() {
	document.getElementById('mosaico-rnap').classList.add('hidden');
}

function showPesquisaGeo() {
	$('#veu').css({'display':'block',opacity:0.90});
	var wid=$(window).width(),hei=$(window).height();
	var gapx=100,gapy=100;
	var widmapa=(wid-gapx)/3;
	var rat=(maxutmx-minutmx)/(maxutmy-minutmy);
	var heimapa=widmapa/rat;
	if(heimapa>hei-gapy) {
		heimapa=hei-gapy;
		widmapa=heimapa*rat;
	}
	
	var wrap=$('<div class="pesquisaavanc pesquisageo janela" style="width:'+(widmapa*3)+'px;"><div class="button close"><img src="images/close2.png"/></div>'
 		+'<h1>Pesquisa geográfica <span style="font-size:11px;color:#ccc;"><i>clique numa área e descubra as suas espécies mais características</i></span></h1><table><tr><td class="head"><div class="titulo"><span onclick="loadGeoTemaInto(15,1);" class="link selected">Concelhos</span> | <span onclick="loadGeoTemaInto(24,1);" class="link unimportant">Quadrículas UTM</span></div><span class="desc">&nbsp;</span></td><td class="head"><div class="titulo"><span onclick="loadGeoTemaInto(21,2);" class="link selected">Rede Nac. Áreas Protegidas</span> | <span onclick="loadGeoTemaInto(23,2);" class="link unimportant">Rede Natura 2000 - SIC</span></div><span class="desc">&nbsp;</span></td><td class="head"><div class="titulo"><span onclick="loadGeoTemaInto(12,3);" class="link selected">Províncias Nova Flora Portugal</span> | <span onclick="loadGeoTemaInto(19,3);" class="link unimportant">Regiões</span></div><span class="desc">&nbsp;</span></td></tr><tr><td><div id="mapapesq1" class="mapapesq"></div></td><td><div id="mapapesq2" class="mapapesq"></div></td><td><div id="mapapesq3" class="mapapesq"></div></td></tr></table></div></div>'
		).appendTo('body').css({left:wid/2-widmapa*3/2,top:hei/2-heimapa/2-50});

	$('.pesquisageo .mapapesq').css({height:heimapa,width:widmapa});

	$('.pesquisaavanc .close').click(function() {
		if($('.pesquisaavanc').is(':animated')) return;
		$('.pesquisaavanc').fadeOut(400,function(){$(this).remove();});
		$('#veu').fadeOut(400);
	});
	
	$('.pesquisaavanc table .link').click(function() {
		if($(this).hasClass('unimportant')) {
			$(this).siblings('.link').removeClass('selected').addClass('unimportant');
			$(this).removeClass('unimportant').addClass('selected');
		}
	});

	loadGeoTemaInto(15,1);
	loadGeoTemaInto(21,2);
	loadGeoTemaInto(12,3);
}

function showPesquisaFloracao() {
	$('#veu').css({'display':'block',opacity:0});
	var wid=$(window).width(),hei=$(window).height();
	var gapx=200,gapy=200;
	var widin=wid-gapx;
	var wrap=$('<div class="pesquisaavanc pesquisaflor janela" style="width:'+(widin)+'px"><div class="button close"><img src="images/close2.png"/></div><h1>Pesquisa por período de floração <span style="font-size:11px;color:#ccc"><i>clique e arraste para pesquisar espécies em floração no período desejado</i></span></h1><div id="floracaoglobalgrande" class="noselect"></div></div>').appendTo('body')
		.css({left:wid/2-widin/2,top:hei/2-(hei-gapy)/2-50,opacity:0});
	$('#floracaoglobal input[name=floracao]').clone().appendTo('#floracaoglobalgrande');
	$('.pesquisaavanc .close').click(function() {
		if($('.pesquisaavanc').is(':animated')) return;
		$('.pesquisaavanc').fadeOut(400,function(){$(this).remove();});
		$('#veu').fadeOut(400);
	});

	drawFloracao('floracaoglobalgrande',$('#floracaoglobalgrande input[name=floracao]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'Floração de todas as espécies de Portugal',subtitle:'(nº de espécies aproximado)',pad:[0,0,10,12],padding:0,interactive:true,axisthickness:3,axislabsize:11,axisticks:9,longmonth:true});
	wrap.animate({opacity:1},400);
	$('#veu').animate({opacity:0.9},400);
}

function showPesquisaProx() {
	$('#veu').css({'display':'block',opacity:0});
	var wid=$(window).width(),hei=$(window).height();
	var gapx=200,gapy=200;
	var widin=wid-gapx;
	var wrap=$('<div class="pesquisaavanc pesquisaprox janela" style="width:'+(widin)+'px"><div class="button close"><img src="images/close2.png"/></div><h1>Pesquisa por proximidade a um ponto <span style="font-size:11px;color:#ccc"><i>clique num ponto do mapa para ver que espécies já foram observadas perto desse ponto</i> <img src="images/info.png" class="info" style="width:18px;vertical-align:middle;margin-left:5px;cursor:pointer;"/></span></h1><p>Coordenadas: <span class="coords"><span class="unimportant">(clique no mapa)</span>&nbsp;</span></p><div id="mappicker"></div></div>')
		.appendTo('body')
		.css({left:wid/2-widin/2,top:hei/2-(hei-gapy)/2-50,opacity:1});
	
	$('.pesquisaavanc #mappicker').height(hei-gapy-$('.pesquisaprox p').height());
	displayPickerMap($('.pesquisaavanc #mappicker'),$('.pesquisaavanc .coords'));
	
	$('.pesquisaavanc .close').click(function() {
		if($('.pesquisaavanc').is(':animated')) return;
		removeBaloons(false);
		destroyPickerMap($('.pesquisaavanc #mappicker'));
		$('.pesquisaavanc').fadeOut(400,function(){$(this).remove();});
		$('#veu').fadeOut(400);
	});
	wrap.find('img.info').click(function() {
		if($('.janela.infoprox').size()>0) return;
		showBaloonTemplate({wid:300,closeonclick:true,temporizador:8000,style:{textAlign:'center'},classes:'infoprox'},'Com esta pesquisa, aparecem no topo dos resultados as espécies que simultaneamente têm registos mais próximos do ponto, e foram vistas por maior número de observadores.',{elem:$(this)},false,{rad:12,curv:6,padding:8,anim:true,style:3});
	});
//	wrap.animate({opacity:1},400);
	
	$('.pesquisaavanc #mappicker').data('map').invalidateSize();
	$('#veu').animate({opacity:0.9},400);
}

function loadGeoTemaInto(tema,coluna) {
	var corpoly='#036';
	var corline='#26c';
	var corselpoly='orange';
	var corselline='orange';	//#69f
	$('#mapapesq'+coluna).empty().html('<div style="padding-top:100px;text-align:center">a carregar tema...</div>');
	$('.pesquisageo table .head .desc').eq(coluna-1).html('&nbsp;');
	$.post('mapas.php',{what:'getsvg',width:$('#mapapesq'+coluna).width(),tema:tema},function(d) {
		$('#mapapesq'+coluna).empty();
		d=$.parseJSON(d);
		var data=d.data;
		var canvas=Raphael('mapapesq'+coluna,$('#mapapesq'+coluna).width(),$('#mapapesq'+coluna).height());
		canvas.coluna=coluna-1;
//		$('.pesquisageo table .head .titulo').eq(canvas.coluna).html(d.nometema);	//+' <span class="unimportant link">alterar...</span>'
/*		$('.pesquisageo table .head .titulo').eq(canvas.coluna).find('.link').click(function() {
			loadGeoTemaInto(17,canvas.coluna+1);
		});*/
		
		for(var i=0;i<data.length;i++) {
			if(data[i][1]=='portugal') {
				var p=canvas.path(data[i][0]).attr({fill:'#000',stroke:'#ccc'});
/*					p.glow({width:6,fill:true,offsetx:1,offsety:3,opacity:0.2,color:'#fff'});
				p.remove();*/
			} else {
				if(data[i][2]==1)
					var pathattr={fill:'none','stroke-dasharray':'.','stroke-width':1.5,stroke:corline,cursor:'pointer'};
				else
					var pathattr={fill:corpoly,'stroke-width': 1.5,stroke:corline,cursor:'pointer'};
				var path=canvas.path(data[i][0]);
				path.attr(pathattr).mouseover(function() {
					var hp=$('.pesquisageo').data('hoveredpolys');
					if(hp && hp.length>0) {
						for(var i=0;i<hp.length;i++) hp[i].animate({fill:hp[i].small ? 'none' : corpoly,stroke:corline},150);
					}
					hp=[];
					var tag=this.tag;
					canvas.forEach(function(el) {
						if(el.tag==tag) {
/*							var fi=el.attr('fill');
							console.log(fi);*/
							hp.push(el.animate({fill:corselpoly,stroke:corselline},150));//.glow({width:6,fill:true,color:'#36e',opacity:1}).attr({cursor:'pointer'}).toFront()); //
						}
					});
					$('.pesquisageo').data('hoveredpolys',hp);
					$('.pesquisageo table .head .desc').eq(canvas.coluna).html(tag.charAt(0).toUpperCase()+tag.substr(1));
					//this.stop().toFront().animate({fill:'#36e','fill-opacity':0.85,transform:'S1.4'},200);
				}).click(function() {
					pesquisaCriterios(this.tag);
				}).tag=data[i][1];
				path.small=data[i][2];
			}
		}
	});
}

function unHighlightLayer(lg) {
	layers[lg].eachLayer(function(l) {
		if(l.highlighted) {l.setStyle(l.originalOptions);l.highlighted=false;}
	});
}

function hoverPoligono(ev) {
	var bals=$('.baloon');
	for(var i=0;i<bals.size();i++) {
		if(bals.eq(i).data('el')==ev.target) return;
	}
	
	unHighlightLayer(ev.target.layerGroup);
	
	var b=ev.target.getBounds();
	ev.target.originalOptions=ev.target.options;
	ev.target.setStyle({fillColor:'orange',color:'orange',fillOpacity:0.4});
	ev.target.highlighted=true;

	if(ev.originalEvent.type=='mouseover') return;
// TODO	
	var pt=mapwebgis.latLngToContainerPoint([b.getCenter().lat,b.getCenter().lng]);
	var off=$('#webgis-mapa').offset();
	for(var nome in ev.target.feature.properties) break;
	var bal=showBaloonTemplate({wid:'auto',style:{textAlign:'left'}}
		,'<p class="link" style="text-align:center;margin-top:2px" onclick="pesquisaCriterios(\''+ev.target.feature.properties[nome]+'\');"><img style="vertical-align:middle;margin-right:4px;" src="images/lupa.png"/>pesquisar espécies em</p><p style="font-size:16px;text-align:center;">'+ev.target.feature.properties[nome]+'</p>'
		,{left:off.left+ev.containerPoint.x,top:off.top+ev.containerPoint.y+5},true,{rad:12,curv:6,padding:8,anim:false,animoffset:0});
		
		
	bal.data('callback',(function(el) {
		return function() {
			el.setStyle(el.originalOptions);
		};
	})(ev.target)).data('el',ev.target);
}
	
function inicia() {
	$(window).resize(handleResize);
	var options=$('#floraon-script').attr('src').replace(/^[^\?]+\??/,'');
	territorio=options.match(/t=([a-z]+)/)[1];
	subdomain = options.match(/sd=([a-z]+)/);
	if(subdomain) subdomain = subdomain[1];
	switch(territorio) {
		case 'az':
			$.getJSON('images/QuadUTMAz.json',function(d) {
				quadricula[0]=L.geoJson(d,{style: {
					'color':'black',
					'weight':1,
					'opacity': 0.30,
					fill:false,
					clickable:false
				}});
				
				quadricula[1]=L.geoJson(d,{style: {
					'color':'#f0f',
					'weight':1,
					'opacity': 0.70,
					fill:false,
					clickable:false
				}});
				if(mapdistr) quadricula[0].addTo(mapdistr);
			});
		
			limitept=[null,null];
			break;
		case 'ma':
			$.getJSON('images/QuadUTMMa-ll.geojson',function(d) {
				quadricula[0]=null; /*L.geoJson(d,{style: {
					'color':'black',
					'weight':1,
					'opacity': 0.30,
					fill:false,
					clickable:false
				}});*/
				
				quadricula[1]=L.geoJson(d,{style: {
					'color':'#f0f',
					'weight':1,
					'opacity': 0.70,
					fill:false,
					clickable:false
				}});
//				if(mapdistr) quadricula[0].addTo(mapdistr);
			});
		
			limitept=[null,null];
			break;
			
		default:
			$.getJSON('images/QuadUTMsimp.json',function(d) {
				quadricula[0]=L.geoJson(d,{style: {
					'color':'black',
					'weight':1,
					'opacity': 0.30,
					fill:false,
					clickable:false
				}});
				
				quadricula[1]=L.geoJson(d,{style: {
					'color':'#f0f',
					'weight':1,
					'opacity': 0.70,
					fill:false,
					clickable:false
				}});
				if(mapdistr) quadricula[0].addTo(mapdistr);
			});
			
			$.getJSON('images/Limite_Lu.json',function(d) {
				limitept[0]=L.geoJson(d,{style: {
					'color':'#000',
					'weight':1,
					'opacity': 0.50,
					fill:false,
					clickable:false
				}});
				
				limitept[1]=L.geoJson(d,{style: {
					'color':'#0f0',
					'weight':1,
					'opacity': 0.50,
					fill:false,
					clickable:false
				}});
				
				//if(mapdistr) limitept.addTo(mapdistr);
				if(mapwebgis) limitept[1].addTo(mapwebgis);				
				if(mapdistr) limitept[0].addTo(mapdistr);
			});		
			
			$.getJSON('images/SIC.json',function(d) {
				layers[1]=L.geoJson(d,{style: {
					'color':'#0a7',
					'weight':2,
					'opacity': 1,
					fill:'#0f7',
					fillOpacity:0.15,
					clickable:true
				}});
				layers[1].eachLayer(function(l) {
					l.layerGroup=1;
					l.on('mouseover',hoverPoligono).on('click',hoverPoligono);
				});
			});	

			$.getJSON('images/APs.json',function(d) {
				layers[0]=L.geoJson(d,{style: {
					'color':'#07f',
					'weight':2,
					'opacity': 1,
					fill:'#00f',
					fillOpacity:0.15,
					clickable:true
				}});
				layers[0].eachLayer(function(l) {
					l.layerGroup=0;
					l.on('mouseover',hoverPoligono).on('click',hoverPoligono);
				});
			});	
		
			break;
	}
	latlngbnd_leaf=L.latLngBounds([parseFloat(options.match(/b1=([-0-9\.]+)/)[1]),parseFloat(options.match(/b2=([-0-9\.]+)/)[1])] , [parseFloat(options.match(/b3=([-0-9\.]+)/)[1]),parseFloat(options.match(/b4=([-0-9\.]+)/)[1])]);

	minutmx=parseInt(options.match(/minx=([0-9\.]+)/)[1]);
	maxutmy=parseInt(options.match(/maxy=([0-9\.]+)/)[1]);
	maxutmx=parseInt(options.match(/maxx=([0-9\.]+)/)[1]);
	minutmy=parseInt(options.match(/miny=([0-9\.]+)/)[1]);
	ladoquad=parseInt(options.match(/lq=([0-9\.]+)/)[1]);
	utmzone=parseInt(options.match(/zone=([0-9\.]+)/)[1]);

	document.addEventListener('keydown', function(ev) {
		var dummyEl = document.getElementById('q1');
		if(document.activeElement === dummyEl) return true;

		dummyEl = document.getElementById('q');
		if(document.activeElement === dummyEl) return true;
		
		if(ev.key == '»') {
		    var tmp = document.getElementById('secret');
		    if(tmp) tmp.classList.remove('nodisp');
/*		    if(mapwebgis) {
		    	mapwebgis.addControl(webgisdrawControl);
		    	$(".leaflet-draw-toolbar").prepend("<h2>Pesquisa por<br/>polígonos</h2>");
	    	}*/
		}
	})

	// Start slide show
	var gtb = document.querySelector('div.gotobottom');
	if(gtb) gtb.addEventListener('click', function(ev) {
		document.getElementById('se-pesquisar').scrollTo({ top: document.getElementById('se-pesquisar').scrollHeight, behavior: 'smooth' });
		sessionStorage.setItem("scrollValue_".pathName, document.getElementById('se-pesquisar').scrollHeight);
		hideLeft();
	});

	var gtb = document.querySelectorAll('a.lermais');
	for(var i=0;i<gtb.length;i++) {
		gtb[i].addEventListener('click', function(ev) {
			$(this).parents('.novidades-ilustradas').addClass('expanded');
		});
	}
	
	var gtb = document.querySelector('a.lermenos');
	if(gtb) gtb.addEventListener('click', function(ev) {
		$(this).parents('.novidades-ilustradas').removeClass('expanded');
		$('#se-pesquisar').scrollTop(0);
	});

	bgPhotoLegends = document.querySelector('input[name=background-images]');
	if(bgPhotoLegends) {
		bgPhotoLegends = JSON.parse(bgPhotoLegends.value);
	}
	
	// Navigator Slide show for background images in the colorful layout
	var tmp = function(curPhotoI, curPhotoIel) {
		document.querySelector('div.bgphoto-legend>div>p').innerHTML = bgPhotoLegends[curPhotoI]['l'];
		document.querySelector('#pesquisa-wrap').style.backgroundImage = 
			'url('+document.querySelector('input[name=background-image-directory]').value + bgPhotoLegends[curPhotoI]['f'] + ')';
		document.querySelector('#pesquisa-wrap').style.backgroundPosition = 
			'center ' + bgPhotoLegends[curPhotoI]['a'];
		document.querySelector('#bgnav-page').innerHTML = (curPhotoI + 1) + '/' + bgPhotoLegends.length;
		curPhotoIel.value = curPhotoI;
		document.getElementById('se-pesquisar').scrollTo({ top: document.getElementById('se-pesquisar').scrollHeight});
		hideLeft();
	}

	// keyboard navigation (only if legend is visible)
	document.addEventListener('keydown', function(ev) {
		var dummyEl = document.getElementById('q1');
		if(document.activeElement === dummyEl) return true;

		dummyEl = document.getElementById('q');
		if(document.activeElement === dummyEl) return true;
		
/*		dummyEl = document.getElementById('criteriospesquisa');
		if(dummyEl && dummyEl.offsetParent !== null) {
			if(ev.key == '«') {
				document.getElementById('secret').classList.remove('nodisp');
				mapwebgis.addControl(webgisdrawControl);
			}
		}*/
		
		dummyEl = document.querySelector('div.bgphoto-legend');
		if(dummyEl && dummyEl.offsetParent === null) return true;
		
		dummyEl = document.querySelector('div.bgphoto-legend p');
		if(dummyEl) {
			var rect = dummyEl.getBoundingClientRect();
			if(rect.top > window.innerHeight) return true;
		}
		
		var clickEvent = new MouseEvent("click", {
			"view": window,
			"bubbles": true,
			"cancelable": false
		});
		switch(ev.code)  {
			case 'ArrowLeft':
				var gtb = document.getElementById('bgnav-left');
				if(gtb) gtb.dispatchEvent(clickEvent);
				break;

			case 'ArrowRight':
				var gtb = document.getElementById('bgnav-right');
				if(gtb) gtb.dispatchEvent(clickEvent);
				break;

			case 'Home':
				ev.preventDefault();
				var gtb = document.getElementById('bgnav-page');
				if(gtb) gtb.dispatchEvent(clickEvent);
				return false;

			case 'Escape':
				document.getElementById('se-pesquisar').scrollTo({ top: 0, behavior: 'smooth' });
				sessionStorage.setItem("scrollValue_".pathName, 0);
			 	showLeft();
				return false;

		}
		return true;
	});
	
	var gtb = document.getElementById('bgnav-page');
	if(gtb && bgPhotoLegends) gtb.addEventListener('click', function(ev) {
		var curPhotoIel = document.querySelector('input[name=background-current-image]');
		curPhotoI = 0;
		tmp(curPhotoI, curPhotoIel);
	});
	
	var gtb = document.getElementById('bgnav-left');
	if(gtb && bgPhotoLegends) gtb.addEventListener('click', function(ev) {
		var curPhotoIel = document.querySelector('input[name=background-current-image]');
		curPhotoI = parseInt(curPhotoIel.value) - 1;
		if(curPhotoI < 0) curPhotoI = bgPhotoLegends.length - 1;
		tmp(curPhotoI, curPhotoIel);
	});
	
	var gtb = document.getElementById('bgnav-right');
	if(gtb && bgPhotoLegends) gtb.addEventListener('click', function(ev) {
		var curPhotoIel = document.querySelector('input[name=background-current-image]');
		curPhotoI = parseInt(curPhotoIel.value) + 1;
		if(curPhotoI >= bgPhotoLegends.length) curPhotoI = 0;
		tmp(curPhotoI, curPhotoIel);
	});

	
	
	$('.logo').click(homePage);
	$('.puxador').click(function(){
		toggleLeft();
	});			// puxador da barra lateral
	
	$.get('compara.php',{org:1},function(d){
		orgaos=$.parseJSON(d);		
	});
	$('#bt-explorar .filtro span.selectable').click(function(a){
		var th=$(this);
		th.parent().children('span.selected').removeClass("selected");
		th.addClass("selected");
		switch(th.parent().attr("id")) {
			case "filtrotaxon":
				$('#bt-explorar #teclado span.selected').removeClass("selected");
				$('#bt-explorar #teclado').children().eq(0).addClass("selected");
				populateTaxa(null,selectCurrentSpecies);
				break;
			
			case "teclado":
				updateFiltro();
				//$('#filtroendem .selectable[name=3]').removeClass('selected');
				
		}
	});
	populateTaxa(null);
	$('#dica-text .azulejo a').tooltip({ 
		track: true, 
		delay: 0, 
		showURL: false,
		showBody:' - ',
		fade: 0,
		top:-20
	});

	$('#formpesq').submit(function(){
		if($('#q').val().length<3)
			$('#q').val('não pode pesquisar menos de 3 letras').select();
		else if($('#q').val().endsWith(': ')) {
		    var qEl = document.getElementById('q');
		    qEl.value = qEl.value + 'escreva a sua pesquisa aqui';
		    qEl.selectionStart = qEl.value.length - 27;
            qEl.selectionEnd = qEl.value.length;
		} else
			makePesquisa($('#q').val(),false,false,true,null,false);
	});
	$('#q1').keyup(function(ev) {
		if($('#se-registos').hasClass('selected')) {
			var filtro=$('#q1').val();
			$('#taxtree>ul>li').filter(function(i){
				var f=filtro.toLowerCase();
				return ($(this).text().substring(0,f.length).toLowerCase()!=f);
			}).css("display","none");
			$('#taxtree>ul>li').filter(function(i){
				var f=filtro.toLowerCase();
				return ($(this).text().substring(0,f.length).toLowerCase()==f);
			}).css("display","block");
		} else {
			if(ev.which==13) {
				if($('#q1').val().length<3)
					$('#q1').val('não pode pesquisar <3 letras').select();
				else {
					switch($('.separador.selected').attr('id')) {
					case 'se-webgis':
						removeBaloons(true);
						$('#taxtree li.selected').removeClass('selected');
						displayQuadOnMap3(mapwebgis,$('#q1').val(),null,{upd:true,limpa:true,addbutton:true});
						break;
					default:
						makePesquisa($('#q1').val(),false,false,true,null,false);
						break;
					}
				}
			}
		}
	});
	
	$('#warning').click(hideMsg);
	$('#bancada').click(function(){$('#bancada .button2[name=sair]').click();});
	$('.linksspp .comparar').click(function(){
		var set=$('#linksspp li');
		var ids="";
		for(var i=0;i<set.size();i++) ids=ids+set.eq(i).data('id')+",";
		clearQuadro(false);
		ids=ids.split(',');
		ids.pop();
		addToQuadro(ids,true,true,false);
	});
	$('#bancada .button2').click(function(){		// BANCADA
		switch($(this).attr('name')){
			case 'closeall':
				var set=$('#bancada .foto-banc');
				for(var i=0;i<set.size();i++) {
					set.eq(i).delay(i*100).fadeOut(200,function(){
						$(this).remove();
						if($('#bancada .foto-banc').size()==0) {hideBancada();updateAddress();}
					});
				}
				//updateBancadaAddress();
				break;
			case 'organizar':
				var set=$('#bancada .foto-banc');
				var wid=Math.floor($('#bancada').width()/480);
				for(var i=0;i<set.size();i++) {
					set.eq(i).addClass('anim').delay(i*250).animate({left:(i%wid)*490,top:(Math.floor(i/wid))*672+30},700,'easeInOutQuart',function(){
						$(this).removeClass('anim');
//						if($('.anim').size()==0) updateBancadaAddress();
					});
				}
				break;
			case 'sair':
				hideBancada();
				updateAddress();
				break;
		}
		return(false);
	});
	$('#quadro').droppable({drop:function(e,ui){	
		if(ui.draggable.hasClass('foto-banc')) return;
		//arrastando linha
		var nr=ui.draggable.parent().data('id');
		var nrows=$('#quadro .row.corpo').size();
		var newr=(Math.ceil((ui.position.top-metricas.quadrowsup)/metricas.quadrowhei));
		$('#quadro div').stop(false,true);
		if(newr>=nrows-1) {		//para o fim
			var a1=0;//(nrows-1);
			var a2=$.inArray(nr,quadro.ids);
			quadro.nomes.splice(a1,0,quadro.nomes.splice(a2,1)[0]);
			quadro.ids.splice(a1,0,quadro.ids.splice(a2,1)[0]);
			var el=$('#quadro .row'+nr).css({display:'block',height:5,opacity:0});
			$(el).appendTo('#quadro')
			el.animate({opacity:1,height:metricas.quadrowhei},function(){$(this).css('height','');});
//			el.slice(1).animate({opacity:1,height:204});
		} else {
			var before=$('.row.corpo:visible').eq(newr).data('id');
			var a1=($.inArray(before,quadro.ids)-1);
			var a2=$.inArray(nr,quadro.ids);
			if(a1<a2) a1++;
			quadro.nomes.splice(a1+1,0,quadro.nomes.splice(a2,1)[0]);
			quadro.ids.splice(a1+1,0,quadro.ids.splice(a2,1)[0]);
			var el=$('#quadro .row'+nr).css({display:'block',height:5,opacity:0});
			$('.row'+before).before(el);
			el.animate({opacity:1,height:metricas.quadrowhei},function(){$(this).css('height','');});
		}
		updateAddress();		
	}});
	if(document.getElementById('q')) {		// sugestões
		document.getElementById('q').onkeyup=function(e){
			var e=window.event || e;
			clearTimeout(sugtimeout);
			if(e.keyCode==40) {
				if(sugestoes.selected<sugestoes.count-1) {
					if(sugestoes.previous>-1) lowlightSugestao('suge_'+sugestoes.previous);		
					sugestoes.selected+=1;
					sugestoes.previous=sugestoes.selected;
					highlightSugestao('suge_'+sugestoes.selected);
					copySugestao(false);
				}
				return;
			}
			if(e.keyCode==38) {
				if(sugestoes.selected>0) {
					lowlightSugestao('suge_'+sugestoes.previous);
			
					sugestoes.selected-=1;
					sugestoes.previous=sugestoes.selected;
					highlightSugestao('suge_'+sugestoes.selected);
					copySugestao(false);
				}
				return;
			}
	
			if(e.keyCode==13) {$('#sugestoes-wrap').hide();}
	//		$('#sugestoes').hide('slide',{direction:'up'});$('#sugestoes-wrap').css({height:0});return;}
			if(e.keyCode<65 && e.keyCode!=8) return;
		
			sugtimeout=setTimeout("caixaKeyUp()",400);
		};
	}
	$('#pesquisa-fotomenu .button').click(function() {	
		$('#pesquisa-fotomenu .button.pressed').removeClass('pressed');		
		$(this).addClass('pressed');
		$('#pesquisa-fotomenu').hide('fade',{direction:'up'});
		iconSize(0,0);
	});

	$('#caixapesquisa .toolbar .button').click(function() {
		switch($(this).attr('name')) {
			case 'identifica':
				showBancadaIdentificacao(true,{'arr':null,'n':0},null);
				break;
		}
	});
/*	
	$('#fotosdia').load('fotosdia.php?nc='+Math.floor(Math.random()*10000),function() {
//		if($.address.value().length>1) {		// se não é início, mostra fotosdia todas logo
			fotosdiaTimeout=null;
			$('#fotosdia img').show();
			$('#rodape').show();
//		}
	});
*/

/*	if($.address.value().length<2) {		// se é início, mostra fotos em piano
		fotosdiaTimeout=setTimeout(function() {
			fotosdiaTimeout=null;
			var els=$('#fotosdia img');
			for(var i=0;i<els.size();i++) els.eq(i).delay(i*50).fadeIn();
			$('#rodape').delay(i*50).fadeIn();
		},1100);
	}*/

/*	if($('#carregarregs').size()>0) {	// está autenticado
		$('.puxador').show();
	} else {*/
		if(window.location.hash=='' && window.location.search.substring(1)=='') {
			if(!$('#se-areapessoal').is(':visible') && $(window).height()>450) showLeft(false,null,0);
/*			introTimeout=setTimeout(function() {
				if(!$('#se-areapessoal').is(':visible') && $(window).height()>450) showLeft(true,null,0);
			},3000);*/
			if($(window).height()<640 && $('#caixapesquisa').hasClass('big')) $('#warnmsg').show();
		} else showLeft(false,null,0);
//	}
	$('.closewindow').click(function(){
		if($(this).parent().hasClass('separador'))
			showSeparador('pesquisar');
		else
			$(this).parent().fadeOut(250);
	});
	
	$('#comparacaract .button2').click(function() {
		if($(this).attr('name')=='sair') {
			hideBancada();
			updateAddress();
		}
	});

	$('.exemplos').click(function(e) {
		$('.floating').hide();
		if($(this).hasClass('sabermais')) 
			document.getElementById('dica-text').classList.toggle('nodisp');
/*			$('#fotosdia-wrap').hide('slide',{direction:'left',easing:'easeInOutCubic'},700);
			$('#pesquisa-avancada').css({display:'block'}).show('slide',{direction:'right',easing:'easeInOutQuart'},700);*/
			//$('#dica-text').css({left:$(window).width()/2-250,top:$(window).height()/2-200}).fadeIn();
			

		if($(this).hasClass('avancada')) {
			var el=$('<div class="nodisp floating janela fixed avancada"></div>');
			el.append('<h1>Pesquisa orientada</h1><div class="row">\
				<div class="widget"><div class="holder"><table cellspacing="0" cellpadding="0"><tr><td class="titulo">Floração</td><td class="content" id="widg-floracao">asccfascvas</td></tr></table></div></div>\
				<div class="widget"><div class="holder"><table cellspacing="0" cellpadding="0"><tr><td class="titulo">Altitude</td><td class="content" id="widg-altitude"></td></tr></table></div></div></div>');
			el.appendTo('#separadores').css({left:'5%',top:'5%',width:'90%',height:'90%'}).fadeIn();
			drawWidget('widg-altitude',0,200);
		}
	});
	
	$('.comments').click(function(e) {
		$('.contactenos').remove();
		messageBox('<h1>Não encontra a planta que procura? Tem sugestões?</h1><p style="text-align:center">Por favor contacte-nos<br/>spbotanica@gmail.com</p>',null,{wid:$(window).width()/3,classes:'fixed contactenos',closebutton:true,closeonclick:false,resizeEvent:false});
	});

	$('#loginbut').click(function(e) {
		$('#login-wnd').css({left:$(window).width()/2-150,top:$(window).height()/2-75}).fadeIn();
	});
	
//	document.getElementById('taxtree').addEventListener('scroll', function(ev,del) {updateScrollBarCursor();}, {passive:true});
	$('#taxtree').scroll(function(ev,del) {
		updateScrollBarCursor();
	});
/*	$('#taxtree-holder .scrollbar .cursor').draggable({containment:'#taxtree-holder .scrollbar',axis:'y',drag:function(ev,ui) {
		var th=$('#taxtree>ul').height()-$('#taxtree').height();
		var ts=$('#taxtree-holder .scrollbar').height();
		$('#taxtree').scrollTop(ui.position.top/(ts-81)*th);
	}}).click(function(ev){ev.stopPropagation();});
	
	$('#taxtree-holder .scrollbar').click(function(ev){
		var y=ev.pageY;
		var st=$('#taxtree').scrollTop();
		if(y<$(this).find('.cursor').offset().top)	//pageup
			var nt=st-$('#taxtree').height()/3;
		else
			var nt=st+$('#taxtree').height()/3;
		
//		$('#taxtree').scrollTop(nt);
//		updateScrollBarCursor();
		$('#taxtree').animate({scrollTop:nt},150,'easeOutQuad',updateScrollBarCursor);
	});*/
		
	createWebsig();
//	$('#q1').click(function() {$(this).select();});

	$('#sidebar div.item').css({opacity:0.75}).hover(function() {
		$(this).css({position:'relative'}).stop(true).animate({top:0,opacity:1},500);
	},function() {
		$(this).stop(true).animate({position:'static',top:0,opacity:0.75},500);//.animate({left:-10});
	});
	
	handleResize();
	$.address.externalChange(onExternalChange);
	$('#q').focus();
	
	var user=options.match(/user=([0-9]+)/);
	if(user) {
		user=parseInt(user[1]);
		if(user>0) {
			iniciaFinal();
			nivelutilizador=user;
			if(user>=30) wiki=true;
		}
	}
	drawFloracao('floracaoglobal',$('#floracaoglobal input[name=floracao]').val(),{fill:'#35c',stroke:'#49f',strokewidth:2,grid:true,title:'',subtitle:'nº espécies',pad:[0,0,0,12],padding:0,interactive:true,axislabrotate:true});
	attachBaloonTip($('#se-pesquisar .showtooltip.big'),{wid:'auto',style:{textAlign:'justify'}},[20,0],{anim:true,rad:10,curv:5,padding:10});
	attachBaloonTip($('#se-pesquisar .showtooltip.small'),{wid:'auto',style:{textAlign:'justify'}},[0,0],{anim:true,rad:10,curv:5,padding:10});
	
	var now=new Date();
	attachComoCitar('#citacaogeral','<h1>Citação geral do Flora-On</h1><p class="quote">Flora-On: Flora de Portugal Interactiva. ('+now.getFullYear()+'). Sociedade Portuguesa de Botânica. www.flora-on.pt. Consulta efectuada em '+now.getDate()+'-'+(now.getMonth()+1)+'-'+now.getFullYear()+'.</p><p>Para citar mapas de distribuição e dados em tabelas, use a citação sugerida nesse contexto.</p>');

	if(document.getElementById('se-bioclima')) initializeBioclim(document.getElementById('se-bioclima'));
/*	$('#funcionalidades .botoesgrandes').click(function(ev) {
		ev.preventDefault();
		$(this).addClass('pressed');
		var botao=$(this).attr('data-botao');
		$('#descfunc div').hide();
		$('#descfunc'+botao).show();
		$('#descfunc').show();
	});*/
	
	// intercept paste on the query box to sanitize and truncate coordinates when pasting WKT strings (e.g. from QGIS) or KML (from Google Earth) 
    const interceptPastedTex = function (event) {
        // Get the clipboard data
        const clipboardData = (event.clipboardData || window.clipboardData);
        let pastedText = clipboardData.getData('text/plain');
        let mat;
        let matched = false;
        
        // match WKT format
        if(mat = pastedText.match(/polygonz? *\(\( *([0-9-]+.[0-9]+ +[0-9-]+.[0-9]+( +[0-9-])? *, *)+[0-9-]+.[0-9]+ +[0-9-]+.[0-9]+( +[0-9-])? *\)\)/i)) {
            // remove the Z dimension, if present
            mat = mat[0].replace(/([0-9-]+.[0-9]+ +[0-9-]+.[0-9]+)( +[0-9-])?/ig, '$1');
            
            // replace PolygonZ with Polygon
            mat = mat.replace(/(polygon)z?/ig, '$1');
            
            // round the coordinates
            pastedText = mat.replace(/([0-9-]+.[0-9]{4})([0-9]+)/ig, "$1").replace(/, +/g, ',');
            
            matched = true;
        }

        if(!matched) {
            // match KML format (copying polygon from Google Earth)
            mat = pastedText.match(/<coordinates>\s*([0-9-]+.[0-9]+,[0-9-]+.[0-9]+,[0-9-]+ )+([0-9-]+.[0-9]+,[0-9-]+.[0-9]+,[0-9-]+)\s*<\/coordinates>/ig)
            if(mat.length == 1) {
                // remove the Z dimension
                mat = mat[0].replace(/([0-9-]+.[0-9]+,[0-9-]+.[0-9]+),[0-9-]+/ig, '$1');
                
                // remove the HTML tag
                mat = mat.replace(/<\/?coordinates>/ig, '');
                
                // round the coordinates
                mat = mat.replace(/([0-9-]+.[0-9]{4})([0-9]+)/ig, "$1");
                
                // convert to WKT while removing leading and trailing white space and commas 
                pastedText = 'POLYGON((' + mat.replace(/([0-9-]+.[0-9]+),([0-9-]+.[0-9]+)/ig, '$1 $2,').replace(/(,\s*$)|([^\S ]*)/g, '').replace(/, +/g, ',') + '))';
                matched = true;
            } else if(mat.length > 1) {
                alert('Para copiar uma área do Google Earth, só pode copiar um polígono, e não um cojunto de vários.');
                pastedText = '';
                matched = true;
            }
        }
        
        if(matched) {
            // Prevent the default paste behavior
            event.preventDefault();
            
            // Insert the modified text into the textarea
            let textarea = event.target;
            let currentText = textarea.value;
            let selectionStart = textarea.selectionStart;
            let selectionEnd = textarea.selectionEnd;

            const newText = currentText.slice(0, selectionStart) + pastedText + currentText.slice(selectionEnd);

            textarea.value = newText;
        }
//<LinearRing><coordinates>-8.167696793062555,40.23516005914296,0 -8.205043693046527,40.23051300585878,0 -8.203747010136741,40.21093935434549,0 -8.189690396834342,40.20711406985998,0 -8.15086104609305,40.21032690741181,0 -8.167696793062555,40.23516005914296,0</coordinates>

    };

    if(document.getElementById('q'))
        document.getElementById('q').addEventListener('paste', interceptPastedTex);
    if(document.getElementById('q1'))
        document.getElementById('q1').addEventListener('paste', interceptPastedTex);
}

function removeWebsigDrawnItems() {
    mapwebgis.closePopup();
/*	let el = document.getElementById('wktQueryWindow');
	if(el) el.remove();*/
	if(drawnItems) drawnItems.clearLayers();
}

function setDrawWKTVisibility(visible) {
    if(!webgisdrawControl) {
		webgisdrawControl = new L.Control.Draw({
			draw:{polyline:false,marker:false,circle:false, circlemarker:false,polygon:{allowIntersection:false,guidelineDistance:10,shapeOptions:{color:'yellow',opacity:1,lineCap:'round',weight:3}}}
//			edit:{featureGroup: drawnItems, edit: false, poly:false, remove:false}
		});
	}
	if(visible) {
	    mapwebgis.addControl(webgisdrawControl);
	    $(".leaflet-draw-toolbar").prepend("<h2>Pesquisa por<br/>polígonos</h2>");
		if(drawHandler) drawHandler.disable();
    } else {
        mapwebgis.removeControl(webgisdrawControl);
        if(!drawHandler)
		    drawHandler = new L.Draw.Polygon(mapwebgis, webgisdrawControl.options.polyline);
		else 
		    drawHandler.disable();
		
		drawHandler.enable();
/*		const tmp = document.querySelector('#se-webgis .toptoolbar .button.verquadricula');
		if(tmp) tmp.click();*/
    }
}

function createWebsig() {
//			WEBGIS	
	L.drawLocal.draw.handlers.polygon.tooltip.start='Clique para começar a desenhar área';
	L.drawLocal.draw.handlers.rectangle.tooltip.start='Clique para começar a desenhar um rectângulo';
	L.drawLocal.draw.handlers.polygon.tooltip.cont='Clique para continuar a desenhar';
	L.drawLocal.draw.handlers.polygon.tooltip.end='Clique no 1º ponto para fechar área e pesquisar';
    L.drawLocal.draw.handlers.simpleshape.tooltip.end='Clique no vértice oposto para fechar rectângulo e pesquisar';
	L.drawLocal.draw.handlers.polyline.error='As arestas não se podem intersectar!';
	if(document.getElementById("webgis-mapa")) {
		mapwebgis=L.map('webgis-mapa',{zoomControl:false, touchZoom:true});

		drawnItems = new L.FeatureGroup();
		mapwebgis.addLayer(drawnItems);
		
		setDrawWKTVisibility(true);

		// event that occurs when querying by user polygon (leaflet draw)
		mapwebgis.on('draw:created', function (e) {
			var type = e.layerType,layer = e.layer;
			var wkt='POLYGON((';
			
			for(var i=0;i<layer._latlngs[0].length;i++) {
				wkt+=(Math.round(layer._latlngs[0][i].lng * 10000) / 10000)+' '+(Math.round(layer._latlngs[0][i].lat * 10000) / 10000)+',';
			}
			wkt=wkt.substr(0,wkt.length-1);
			wkt+='))';

/*            let pos = mapwebgis.latLngToContainerPoint([layer._bounds._northEast.lat, layer._bounds._southWest.lng]);
			let html = createFragment('<div id="wktQueryWindow" style="top:'+pos.y+'px;left:'+pos.x+'px;" class="criteriabar"><h1>Pesquisar nestas quadrículas</h1><div class="atributos">' +
				'<div class="atributo"><a href="#1'+encodeURIComponent(wkt)+'">Todas as<br/>espécies</a></div><div class="atributo"><a href="#1ameaçadas,'+encodeURIComponent(wkt)+'">Espécies<br/>ameaçadas</a></div><div class="atributo"><a href="#1RELAPE,'+encodeURIComponent(wkt)+'">Espécies<br/>RELAPE</a></div></div></div>');
	*/			
//			document.querySelector('.leaflet-control-container').appendChild(html);
            var popup = L.popup()
                .setLatLng([layer._bounds._northEast.lat, (layer._bounds._southWest.lng + layer._bounds._northEast.lng) / 2])
                .setContent('<div id="wktQueryWindowaa" class="criteriabar"><h1>Pesquisar nestas quadrículas</h1><div class="atributos">' +
				            '<div class="atributo"><a href="#1'+encodeURIComponent(wkt)+'">Todas as<br/>espécies</a></div><div class="atributo"><a href="#1ameaçadas,'+encodeURIComponent(wkt)+'">Espécies<br/>ameaçadas</a></div><div class="atributo"><a href="#1RELAPE,'+encodeURIComponent(wkt)+'">Espécies<br/>RELAPE</a></div></div></div>');
            mapwebgis.openPopup(popup);
    
			drawnItems.addLayer(e.layer);

//			gotoAddr('1'+encodeURIComponent(wkt));
		});
		
		mapwebgis.on('draw:drawstart', removeWebsigDrawnItems);
		
		$('#webgis-camadas-wrap .header h1').click(function() {
			new L.Draw.Polygon(mapwebgis, webgisdrawControl.options.draw.polygon).enable();
		});
		
		mapwebgis.addControl(new layerDescription({position: 'topleft'}));
		mapwebgis.addControl(new layerList({"Fotografia aérea": Esri_WorldImagery,"Relevo": Esri_WorldShadedRelief[1],"Mapa":OpenStreetMap_DE},territorio=='lu' ? {"Áreas Protegidas":0,"Rede Natura 2000 (SIC)":1} : {},{position: 'topright'}));
		L.control.zoom({position:'bottomright'}).addTo(mapwebgis);
		if(limitept[1]) limitept[1].addTo(mapwebgis);
		
		Esri_WorldImagery.addTo(mapwebgis);

		mapwebgis.on('mousedown', function(event) {removeBaloons(false);});
		mapwebgis.on('movestart', function(event) {removeBaloons(false);});
		if(clickMapa) mapwebgis.on('click',clickMapa);
		mapwebgis.fitBounds(latlngbnd_leaf);

		$('#se-webgis .toptoolbar .button').click(clickWebgisTools);
		attachBaloonTip($('#se-webgis .toptoolbar .button'),{wid:220,style:{textAlign:'justify'}},[0,0],{anim:false,rad:10,curv:5,padding:8});

		$('.floatingtoolbar-shade').css({opacity:0.3});	
	}
}        

/*(function($){
    var _dataFn = $.fn.data;
    $.fn.data = function(key, val){
        if (typeof val !== 'undefined'){ 
            $.expr.attrHandle[key] = function(elem){
                return $(elem).attr(key) || $(elem).data(key);
            };
        }
        return _dataFn.apply(this, arguments);
    };
})(jQuery);*/
