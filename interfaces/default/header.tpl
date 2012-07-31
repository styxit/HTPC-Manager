<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>$getVar('app_name', 'HTPC Manager')</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
    <link href="/css/bootstrap.min.css" rel="stylesheet">
    <link href="/css/bootstrap-responsive.min.css" rel="stylesheet">
    <link href="/css/base.css" rel="stylesheet">
    <link href="/css/themes/$getVar('theme','default.css')" rel="stylesheet">
    <script src="/js/libs/jquery-1.7.2.min.js"></script>
    <script src="/js/libs/jquery-ui-1.8.18.custom.min.js"></script>
    <script src="/js/default.js"></script>
    #if $varExists('jsfile')
    <script src="/js/$getVar('jsfile')"></script>
    #end if
</head>
<body>

<div id="notify-user" class="hide">
    <button class="close" data-dismiss="alert">&times;</button>
    <h4 class="alert-heading"></h4>
    <span></span>
</div>

<div id="modal_dialog" class="modal hide">
    <div class="modal-header">
        <button class="close" data-dismiss="modal">&times;</button>
        <h3 class="modal-h3"></h3>
    </div>
    <div class="modal-fanart modal-body"></div>
    <div class="modal-footer"></div>
</div>

<div class="navbar navbar-fixed-top" id="navbar">
    <div class="navbar-inner">
        <div class="container">
            <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
                <i class="icon-th icon-white"></i>
            </a>
            <a href="/" class="brand">$getVar('app_namee', 'HTPC Manager')</a>
            <div class="nav-collapse">
                <ul class="nav" id="menu">
                    #if $getVar('use_xbmc', 0)
                    <li id="xbmc"><a href="/xbmc/">$getVar('xbmc_name', 'XBMC')</a></li>
                    #end if
                    #if $getVar('use_sabnzbd', 0)
                    <li id="sabnzbd"><a href="/sabnzbd/">$getVar('sabnzbd_name', 'SABnzbd')</a></li>
                    #end if
                    #if $getVar('use_couchpotato', 0)
                    <li id="couchpotato"><a href="/couchpotato/">$getVar('couchpotato_name', 'CouchPotato')</a></li>
                    #end if
                    #if $getVar('use_sickbeard', 0)
                    <li id="sickbeard"><a href="/sickbeard/">$getVar('sickbeard_name', 'SickBeard')</a></li>
                    #end if
                    #if $getVar('use_squeezebox', 0)
                    <li id="squeezebox"><a href="/squeezebox/">$getVar('squeezebox_name', 'Squeezebox')</a></li>
                    #end if
                </ul>
                <div class="pull-right visible-desktop">
                    #if $getVar('use_nzbsearch', 0)
                    <form action="/search/" method="get" class="navbar-search">
                        <input type="text" name="search" class="search-query" placeholder="Search">
                    </form>
                    #end if
                    <div class="dropdown pull-left">
                        <a class="btn btn-navbar dropdown-toggle" data-toggle="dropdown" id="settings"><i class="icon-cog icon-white"></i></a>
                        <ul class="dropdown-menu">
                            <li><a href="#" id="btn-check-update"><i class="icon-eye-open"></i> Check for updates</a></li>
                            <li><a href="/settings" id="btn-settings"><i class="icon-cog"></i> Settings</a></li>
                            <li><a href="#" id="btn-restart"><i class="icon-refresh"></i> Restart</a></li>
                            <li><a href="#" id="btn-shutdown"><i class="icon-off"></i> Shutdown</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
