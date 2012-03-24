#include $webdir + "/header.tpl"#


<div class="container">

        <div class="content maincontent">

            <div class="page-header page-title">
                <h1>
                    XBMC
                </h1>
            </div>

            <div class="well hide" id="nowplaying">
                <div class="row">
                    <div class="span2">
                        <ul class="thumbnails">
                            <li>
                                <div class="thumbnail">

                                </div>
                            </li>
                        </ul>
                    </div>
                    <div class="span9">
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
                    </div>
                </div>
            </div>

            <div id="notification_area"></div>

            <ul class="nav nav-tabs">
                <li class="active"><a href="#movies" data-toggle="tab">Movies</a></li>
                <li><a href="#shows" data-toggle="tab">TV Shows</a></li>
                <li><a href="#misc" data-toggle="tab">Misc</a></li>
            </ul>

            <div class="tab-content">

                <div class="active tab-pane" id="movies">
                    <ul id="movie-grid" class="thumbnails"></ul>
                </div>

                <div id="shows" class="tab-pane">
                    <ul id="show-grid" class="thumbnails"></ul>
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
                    </div>
                </div>

            </div>

</div>

#include $webdir + "/footer.tpl"#