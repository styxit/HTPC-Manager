#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>
                Dashboard
            </h1>
        </div>

        <div class="row-fluid">

            #if $getVar('use_xbmc', 0)
            <div class="span4">
                <h3>Recently added Movies</h3>

                <div id="movie-carousel" class="carousel hide">
                    <!-- Carousel items -->
                    <div class="carousel-inner">

                    </div>
                    <!-- Carousel nav -->
                    <a class="carousel-control left" href="#movie-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#movie-carousel" data-slide="next">&rsaquo;</a>
                </div>

            </div>

            <div class="span4">
                <h3>Recently added TV Shows</h3>

                <div id="tvshow-carousel" class="carousel hide">
                    <!-- Carousel items -->
                    <div class="carousel-inner">

                    </div>
                    <!-- Carousel nav -->
                    <a class="carousel-control left" href="#tvshow-carousel" data-slide="prev">&lsaquo;</a>
                    <a class="carousel-control right" href="#tvshow-carousel" data-slide="next">&rsaquo;</a>
                </div>

            </div>

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

            #if $getVar('use_sickbeard', 0)
            <div class="span6">
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

            #if $getVar('use_sabnzbd', 0)
            <div class="span6">
                <h3>Info</h3>
                <h6>HDD Info</h6>
                <div id="hdd-info"></div>
                <h6>Now playing</h6>
                <div id="playing-info"></div>
                <h6>Now downloading</h6>
                <div id="download-info"></div>
            </div>
            #end if

        </div>

    </div>

</div>

#include $webdir + "/footer.tpl"#
