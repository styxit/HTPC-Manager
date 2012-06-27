<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>$appname</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
    <link href="/css/bootstrap.min.css" rel="stylesheet">
    <link href="/css/default.css" rel="stylesheet">
    <link href="/css/bootstrap-responsive.min.css" rel="stylesheet">
    <link href="/css/responsive.css" rel="stylesheet">
    <link href="/css/tablesorter.css" rel="stylesheet">
    <script src="js/jquery-1.7.2.min.js"></script>
    <script src="js/jquery-ui-1.8.18.custom.min.js"></script>
    <script src="/js/default.js"></script>
    #if $varExists('jsfile')
    <script src="/js/$getVar('jsfile')"></script>
    #end if
</head>
<body>

<div id="notify-user" class="alert alert-block">
    <a class="close">&times;</a>
    <h4 class="alert-heading"></h4>
    <span></span>
</div>

<div id="modal_dialog" class="modal hide">
    <div class="modal-header">
        <a href="javascript:void(0);" class="close" data-dismiss="modal">&times;</a>
        <h3 class="modal-h3"></h3>
    </div>
    <div class="modal-fanart">
        <div class="modal-body">

        </div>
    </div>
    <div class="modal-footer">
        <a href="javascript:void(0);" class="btn secondary">Close</a>
    </div>
</div>

<div id="block_dialog" class="modal hide">
    <div class="modal-header">
        <h3 class="modal-h3"></h3>
    </div>
    <div class="modal-body">

    </div>
</div>

<div class="navbar navbar-fixed-top" id="navbar">
    <div class="navbar-inner">
        <div class="container">
            <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
                <i class="icon-th icon-white"></i>
            </a>
            <a class="brand" href="/">$appname</a>
            <div class="nav-collapse">
                <ul class="nav">
                #if $getVar('use_xbmc', 0)
                    #if $submenu == "xbmc"
                    <li class="active">
                    #else
                    <li>
                    #end if
                    	<a href="/xbmc">$getVar('xbmc_name', 'XBMC')</a>
                    </li>
                #end if
                #if $getVar('use_sabnzbd', 0)
                    #if $submenu == "sabnzbd"
                    <li class="active">
                    #else
                    <li>
                    #end if
                    	<a href="/sabnzbd">$getVar('sabnzbd_name', 'SABnzbd')</a>
                    </li>
                #end if
                #if $getVar('use_couchpotato', 0)
                	#if $submenu == "couchpotato"
                	<li class="active">
                	#else
                	<li>
                    #end if
                    	<a href="/couchpotato">$getVar('couchpotato_name', 'CouchPotato')</a>
                	</li>
            	#end if
                #if $getVar('use_sickbeard', 0)
                    #if $submenu == "sickbeard"
                    <li class="active">
                    #else
                    <li>
                    #end if
                    	<a href="/sickbeard">$getVar('sickbeard_name', 'SickBeard')</a>
                    </li>
                #end if
                #if $getVar('use_squeezebox', 0)
                    #if $submenu == "squeezebox"
                    <li class="active">
                    #else
                    <li>
                    #end if
                    	<a href="squeezebox">$getVar('squeezebox_name', 'Squeezebox')</a>
                    </li>
                #end if
                #if $getVar('use_nzbsearch', 0)
                    #if $submenu == "nzbsearch"
                    <li class="active">
                    #else
                    <li>
                    #end if
                        <a href="/nzbsearch">$getVar('nzbsearch_name', 'NZB Search')</a>
                    </li>
                #end if
                </ul>
                <ul class="nav pull-right">
                    <li class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown"><i class="icon-cog icon-white"></i></a>
                        <ul class="dropdown-menu">
                            <li>
                                <a href="#" id="btn-check-update"><i class="icon-eye-open"></i> Check for updates</a>
                            </li>
                            <li>
                                <a href="/settings" id="btn-settings"><i class="icon-cog"></i> Settings</a>
                            </li>
                            <li>
                                <a href="#" id="btn-restart"><i class="icon-refresh"></i> Restart</a>
                            </li>
                            <li>
                                <a href="#" id="btn-shutdown"><i class="icon-off"></i> Shutdown</a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>
