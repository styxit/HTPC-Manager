// http://stackoverflow.com/questions/8400804/jquery-pagination-twitter-bootstrap
jQuery.fn.pagination=function(maxentries,opts){opts=jQuery.extend({items_per_page:10,num_display_entries:10,current_page:0,num_edge_entries:0,link_to:"javascript:void(0)",prev_text:"Prev",next_text:"Next",ellipse_text:"...",prev_show_always:true,next_show_always:true,callback:function(){return false;}},opts||{});return this.each(function(){function numPages(){return Math.ceil(maxentries/opts.items_per_page);}
function getInterval(){var ne_half=Math.ceil(opts.num_display_entries/2);var np=numPages();var upper_limit=np-opts.num_display_entries;var start=current_page>ne_half?Math.max(Math.min(current_page-ne_half,upper_limit),0):0;var end=current_page>ne_half?Math.min(current_page+ne_half,np):Math.min(opts.num_display_entries,np);return[start,end];}
function pageSelected(page_id,evt){current_page=page_id;drawLinks();var continuePropagation=opts.callback(page_id,panel);if(!continuePropagation){if(evt.stopPropagation){evt.stopPropagation();}
else{evt.cancelBubble=true;}}
return continuePropagation;}
function drawLinks(){panel.empty();var list=jQuery("<ul></ul>");panel.append(list);var interval=getInterval();var np=numPages();var getClickHandler=function(page_id){return function(evt){return pageSelected(page_id,evt);}}
var appendItem=function(page_id,appendopts){page_id=page_id<0?0:(page_id<np?page_id:np-1);appendopts=jQuery.extend({text:page_id+1,classes:""},appendopts||{});if(page_id==current_page){var clazz=appendopts.side?'disabled':'active';var lstItem=jQuery("<li class='"+clazz+"'><a>"+(appendopts.text)+"</a></li>")}
else
{var a=jQuery("<a>"+(appendopts.text)+"</a>").attr('href',opts.link_to.replace(/__id__/,page_id));;var lstItem=jQuery("<li></li>").bind("click",getClickHandler(page_id));lstItem.append(a);}
if(appendopts.classes){lstItem.addClass(appendopts.classes);}
list.append(lstItem);}
if(opts.prev_text&&(current_page>0||opts.prev_show_always)){appendItem(current_page-1,{text:opts.prev_text,side:true});}
if(interval[0]>0&&opts.num_edge_entries>0)
{var end=Math.min(opts.num_edge_entries,interval[0]);for(var i=0;i<end;i++){appendItem(i);}
if(opts.num_edge_entries<interval[0]&&opts.ellipse_text)
{jQuery("<li class='disabled'>"+opts.ellipse_text+"</li>").appendTo(list);}}
for(var i=interval[0];i<interval[1];i++){appendItem(i);}
if(interval[1]<np&&opts.num_edge_entries>0)
{if(np-opts.num_edge_entries>interval[1]&&opts.ellipse_text)
{jQuery("<li class='disabled'>"+opts.ellipse_text+"</li>").appendTo(list);}
var begin=Math.max(np-opts.num_edge_entries,interval[1]);for(var i=begin;i<np;i++){appendItem(i);}}
if(opts.next_text&&(current_page<np-1||opts.next_show_always)){appendItem(current_page+1,{text:opts.next_text,side:true});}}
var current_page=opts.current_page;maxentries=(!maxentries||maxentries<0)?1:maxentries;opts.items_per_page=(!opts.items_per_page||opts.items_per_page<0)?1:opts.items_per_page;var panel=jQuery(this);this.selectPage=function(page_id){pageSelected(page_id);}
this.prevPage=function(){if(current_page>0){pageSelected(current_page-1);return true;}
else{return false;}}
this.nextPage=function(){if(current_page<numPages()-1){pageSelected(current_page+1);return true;}
else{return false;}}
drawLinks();});}