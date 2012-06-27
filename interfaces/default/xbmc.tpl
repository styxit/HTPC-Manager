#include $webdir + "/header.tpl"#

<div class="container">

<div class="content maincontent">

    <div class="page-header page-title">
        <h1>
            <a href="http:\/\/$getVar('xbmc_host', ''):$getVar('xbmc_port', '')" target="_blank">$getVar('xbmc_name', 'XBMC')</a>            
        </h1>
    </div>

    <div class="hide" id="nowplaying">
        <div id="nowplaying-fanart">
            <table class="table table-now-playing">
                <tr>
                    <td class="span1">
                        <ul class="thumbnails">
                            <li>
                                <div class="thumbnail"></div>
                            </li>
                        </ul>
                    </td>
                    <td>
                        <h2 id="player-item-title"></h2>
                        <h2><small id="player-item-time"></small></h2>
                        <div class="progress" id="player-progressbar">
                            <div class="bar active" style="width: 0%"></div>
                        </div>
                        <br />
                        <div class="btn-group">
                            <a class="btn" href="#" data-player-control="MoveLeft"><i class="icon-backward"></i></a>
                            <a class="btn" href="#" data-player-control="Stop"><i class="icon-stop"></i></a>
                            <a class="btn" href="#" data-player-control="PlayPause"><i class="icon-pause"></i></a>
                            <a class="btn" href="#" data-player-control="MoveRight"><i class="icon-forward"></i></a>
                            <a class="btn" href="#" data-player-control="SetMute"><i class="icon-volume-off"></i></a>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <ul class="nav nav-tabs">
        <li class="active"><a href="#movies" data-toggle="tab">Movies</a></li>
        <li><a href="#shows" data-toggle="tab">TV Shows</a></li>
        <li><a href="#misc" data-toggle="tab">Misc</a></li>
    </ul>

    <div class="tab-content">
        <div id="movies" class="active tab-pane">
            <div class="btn-toolbar">
                <div class="btn-group">
                    <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">Sort method <span class="caret"></span></button>
                    <ul class="dropdown-menu">
                        <li><a href="#" class="active-sortmethod" data-sortmethod="videotitle"><i class="icon-ok"></i>Name</a></li>
                        <li><a href="#" data-sortmethod="lastplayed">Last played</a></li>
                    </ul>
                </div>
                <div class="btn-group">
                    <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">Sort order <i class="caret"></i></button>
                    <ul class="dropdown-menu">
                        <li><a href="#" data-sortorder="ascending" class="active-sortorder"><i class="icon-ok"></i>Ascending</a></li>
                        <li><a href="#" data-sortorder="descending">Descending</a></li>
                    </ul>
                </div>
            </div>
            <ul id="movie-grid" class="thumbnails" data-scroll-limit="$getVar('xbmc_scroll_limit', '0')"></ul>
            <div class="gif-loader" id="movie-loader"><img src="img/loader.gif" alt="loader" /></div>
        </div>

        <div id="shows" class="tab-pane">
            #if $getVar('xbmc_show_banners', 0)
            <ul id="show-grid" class="thumbnails banners" data-scroll-limit="$getVar('xbmc_scroll_limit', '0')"></ul>
            #else
            <ul id="show-grid" class="thumbnails" data-scroll-limit="$getVar('xbmc_scroll_limit', '0')"></ul>
            #end if
            <div class="gif-loader" id="show-loader"><img src="img/loader.gif" alt="loader" /></div>
            <div id="show-details" style="display:none;">
                <div class="well">
                    <a class="btn" id="back-to-shows" href="#">Back</a>
                    <h2 id="show-title" class="pull-right"></h2>
                </div>
                <div id="show-seasons"></div>
            </div>
        </div>

        <div class="tab-pane" id="misc">
            <div class="form-horizontal">
                <fieldset>
                    <legend>Notification</legend>
                    <div class="control-group">
                        <input class="span6" id="send_notification_text" name="send_notification_text" type="text" />
                        <button class="btn" type="button" id="send_notification_button"><i class="icon-envelope"></i> Send</button>
                    </div>
                </fieldset>
                <fieldset>
                    <legend>Actions</legend>
                    <div class="control-group">
                        <a class="btn" id="btn-scan-lib" type="text">Update library</a>
                        <a class="btn" id="btn-clean-lib" type="text">Clean library</a>
                    </div>
                </fieldset>
            </div>
        </div>

    </div>

</div>

#include $webdir + "/footer.tpl"#
