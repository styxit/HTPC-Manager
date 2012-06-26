#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>
                Dashboard
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

        <div class="row-fluid">

            #if $getVar('use_dash_rec_movies', 1)
            <div class="span4">
                <h3>Recently added Movies</h3>

                <div id="movie-carousel" class="carousel hide  carousel-fanart" style="height:240px;">
                    <!-- Carousel items -->
                    <div class="carousel-inner">

                    </div>
                    <!-- Carousel nav -->
                    <a class="carousel-control left" href="#movie-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#movie-carousel" data-slide="next">&rsaquo;</a>
                </div>

            </div>
            #end if
            
            #if $getVar('use_dash_rec_tv', 1)
            <div class="span4">
                <h3>Recently added TV Shows</h3>

                <div id="tvshow-carousel" class="carousel hide carousel-fanart">
                    <!-- Carousel items -->
                    <div class="carousel-inner">

                    </div>
                    <!-- Carousel nav -->
                    <a class="carousel-control left" href="#tvshow-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#tvshow-carousel" data-slide="next">&rsaquo;</a>
                </div>

            </div>
            #end if
            
            #if $getVar('use_dash_rec_music', 1)
            <div class="span4">
                <h3>Recently added Music</h3>

                <table class="table table-striped">
                    <thead>
                    <tr>
                        <th>&nbsp;</th>
                        <th>Artist</th>
                        <th>Album</th>
                        <th>Year</th>
                    </tr>
                    </thead>
                    <tbody id="album-table-body">

                    </tbody>
                </table>

            </div>
            #end if

        </div>
        <div class="row-fluid">

            #if $getVar('use_dash_sickbeard', 1)
            <div class="span4">
                <h3>Next aired</h3>
                <table class="table table-striped table-main">
                    <thead>
                    <tr>
                        <th>Showname</th>
                        <th>Episode</th>
                        <th>Airdate</th>
                        <th>&nbsp;</th>
                    </tr>
                    </thead>
                    <tbody id="nextaired_table_body">

                    </tbody>
                </table>
            </div>
            #end if

            #if $getVar('use_dash_couchpotato', 1)
            <div class="span4">
                <h3>Wanted movies</h3>
                <table class="table table-striped table-main">
                    <thead>
                    <tr>
                        <th>Title</th>
                        <th>Year</th>
                    </tr>
                    </thead>
                    <tbody id="wantedmovies_table_body">

                    </tbody>
                </table>
            </div>
            #end if

            #if $getVar('use_dash_nzb', 1)
            <div class="span4">
                <h3>Info</h3>
                <div id="hdd-info"></div>
                <div id="download-info"></div>
            </div>
            #end if

        </div>

    </div>

</div>

#include $webdir + "/footer.tpl"#