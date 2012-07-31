#include $webdir + "/header.tpl"#

<div class="container">
    <div class="content maincontent">
        <h1 class="page-header page-title">Dashboard</h1>
        <div class="well hide" id="nowplaying">
            <div class="row">
                <div class="span2">
                    <div class="thumbnail"></div>
                </div>
                <div class="span9">
                    <h2 id="player-item-title"></h2>
                    <h2><small id="player-item-time"></small></h2>
                    <div class="progress" id="player-progressbar">
                        <div class="bar active"></div>
                    </div>
                    <div class="btn-group">
                        <button class="btn" data-player-control="MoveLeft"><i class="icon-backward"></i></button>
                        <button class="btn" data-player-control="Stop"><i class="icon-stop"></i></button>
                        <button class="btn" data-player-control="PlayPause"><i class="icon-pause"></i></button>
                        <button class="btn" data-player-control="MoveRight"><i class="icon-forward"></i></button>
                        <button class="btn" data-player-control="SetMute"><i class="icon-volume-off"></i></button>
                    </div>
                </div>
            </div>
        </div>
        <div class="row-fluid">
            #if $getVar('use_dash_rec_movies', 0)
            <div class="span4">
                <h3><a href="/xbmc/">Recently added Movies</a></h3>
                <div id="movie-carousel" class="carousel hide  carousel-fanart" style="height:240px;">
                    <div class="carousel-inner"></div>
                    <a class="carousel-control left" href="#movie-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#movie-carousel" data-slide="next">&rsaquo;</a>
                </div>
            </div>
            #end if
            #if $getVar('use_dash_rec_tv', 0)
            <div class="span4">
                <h3><a href="/xbmc/">Recently added TV Shows</a></h3>
                <div id="tvshow-carousel" class="carousel hide carousel-fanart">
                    <div class="carousel-inner"></div>
                    <a class="carousel-control left" href="#tvshow-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#tvshow-carousel" data-slide="next">&rsaquo;</a>
                </div>
            </div>
            #end if
            #if $getVar('use_dash_rec_music', 0)
            <div class="span4">
                <h3><a href="/xbmc/">Recently added Music</a></h3>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>&nbsp;</th>
                            <th>Artist</th>
                            <th>Album</th>
                            <th>Year</th>
                        </tr>
                    </thead>
                    <tbody id="album-table-body"></tbody>
                </table>
            </div>
            #end if
        </div>
        <div class="row-fluid">
            #if $getVar('use_dash_sickbeard', 0)
            <div class="span4">
                <h3><a href="/sickbeard/">Next aired</a></h3>
                <table class="table table-striped table-main">
                    <thead>
                        <tr>
                            <th>Showname</th>
                            <th>Episode</th>
                            <th>Airdate</th>
                        </tr>
                    </thead>
                    <tbody id="nextaired_table_body"></tbody>
                </table>
            </div>
            #end if
            #if $getVar('use_dash_couchpotato', 0)
            <div class="span4">
                <h3><a href="/couchpotato/">Wanted movies</a></h3>
                <table class="table table-striped table-main">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Year</th>
                        </tr>
                    </thead>
                    <tbody id="wantedmovies_table_body"></tbody>
                </table>
            </div>
            #end if
            #if $getVar('use_dash_sabnzbd', 0)
            <div class="span4">
                <h3><a href="/sabnzbd/">Latest downloads</a></h3>
                <table class="table table-striped table-main">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="downloads_table_body"></tbody>
                </table>
            </div>
            #end if
        </div>
    </div>
</div>

#include $webdir + "/footer.tpl"#
