#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <select id="players" class="pull-right"></select>
            <h1>Squeezebox</h1>
        </div>


        <div id="notification_area"></div>

	<div class="well hide" id="nowplaying">
	    <div class="row">
		<div class="span2">
		    <ul class="thumbnails">
			<li>
			    <div class="thumbnail"></div>
			</li>
		    </ul>
		</div>
		<div class="span9">
                    <div class="btn-group pull-right">
                        <span>
                            <b class="btn" id="volume">&nbsp;</b>
		            <a class="btn" href="#" data-player-control="VolDown"><i class="icon-volume-down"></i></a>
		            <a class="btn" href="#" data-player-control="VolUp"><i class="icon-volume-up"></i></a>
                        </span>
                        <span>
		            <a class="btn" href="#" data-player-control="Power"><i class="icon-off"></i></a>
                        </span>
                    </div>
		    <h2 id="player-item-title"></h2>

		    <h2><small id="player-item-time"></small></h2>
		    <div class="progress" id="player-progressbar">
			<div class="bar active" style="width: 0%"></div>
		    </div>
		    <br />
		    <div class="btn-group">
                        <span>
			    <a class="btn" href="#" data-player-control="MoveLeft"><i class="icon-backward"></i></a>
			    <a class="btn" href="#" data-player-control="PlayPause"><i class="icon-pause"></i></a>
			    <a class="btn" href="#" data-player-control="MoveRight"><i class="icon-forward"></i></a>
                        </span>
                        <span>
			    <a class="btn" href="#" data-player-control="Shuffle"><i class="icon-align-right"></i></a>
			    <a class="btn" href="#" data-player-control="Repeat"><i class="icon-repeat"></i></a>
                        </span>
		    </div>
		</div>
	    </div>
	</div>

        <ul class="nav nav-tabs">
            <li class="active"><a href="#playlist" data-toggle="tab">Playlist</a></li>
            <li><a href="#artist" data-toggle="tab">Artist</a></li>
            <li><a href="#album" data-toggle="tab">Album</a></li>
        </ul>

        <div class="tab-content">

            <div class="tab-pane active" id="playlist">
		<table class="table table-striped">
		    <thead>
		    <tr>
			<th>Track</th>
			<th>Artist</th>
			<th>Album</th>
			<th class="right">Duration</th>
		    </tr>
		    </thead>
		    <tbody id="playlist_table"></tbody>
		</table>
            </div>

            <div id="artist" class="tab-pane">
            </div>

            <div id="album" class="tab-pane">
            </div>

        </div>

    </div>
</div>

#include $webdir + "/footer.tpl"#
