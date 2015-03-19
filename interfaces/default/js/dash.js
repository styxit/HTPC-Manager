
function loadWantedAlbums () {
    if (!$('#headphones-carousel').length) return
    $.get(WEBDIR + 'headphones/GetWantedList', function (data) {
        if (data === null) return
        $.each(data, function (i, albums) {
            var src;
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i === 0) itemDiv.addClass('active')

            var tt;
            if (albums.ReleaseDate.length) {
                // release date should be (yyyy) or empty string
                tt = ' (' + albums.ReleaseDate.substring(0,4) + ') '
            } else {
                    tt = '  '
            }
            if (albums.ArtistName === 'None') {
                // to remove None..
                albums.ArtistName = ''
            }
            if (albums.ArtworkURL === null) {
                src = WEBDIR + 'img/no-cover-art.png'
            } else {
               src = WEBDIR + 'headphones/GetThumb?h=240&w=430&thumb=' + albums.ArtworkURL
            }

            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = WEBDIR +'headphones/#wanted'
            }).append(
                $('<h4>').html(albums.AlbumTitle + tt)
            ))
            $('#headphones-carousel .carousel-inner').append(itemDiv)


        })
        $('#headphones-carousel').show()
    })
}

function loadRecentMovies () {
    if (!$('#movie-carousel').length) return
    $.getJSON(WEBDIR + 'kodi/GetRecentMovies',function (data) {
        if (data === null || data.movies === null) return
        $.each(data.movies, function (i, movie) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i === 0) itemDiv.addClass('active')

            var src = WEBDIR + 'kodi/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = WEBDIR +'kodi/#movies'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(movie.title + ' (' + movie.year + ')'),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
                    '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
                    movie.plot
                ).hide()
            ))
            $('#movie-carousel .carousel-inner').append(itemDiv)
        })
        $('#movie-carousel').show()
    })
}
function loadRecentTVshows () {
    if (!$('#tvshow-carousel').length) return
    $.getJSON(WEBDIR + 'kodi/GetRecentShows', function (data) {
        if (data === null) return
        $.each(data.episodes, function (i, episode) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i == 0) itemDiv.addClass('active')

            var src = WEBDIR + "kodi/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = 'kodi/#shows'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(episode.showtitle + ': ' + episode.label),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
                ).hide()
            ))
            $('#tvshow-carousel .carousel-inner').append(itemDiv)
        })
        $('#tvshow-carousel').show()
    })
}
function loadRecentAlbums () {
    if (!$('#albums-content').length) return
    $.getJSON(WEBDIR + 'kodi/GetRecentAlbums/4', function (data) {
        if (data === null || data.limits.total === 0) return
        $.each(data.albums, function (i, album) {
            var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
            if (album.thumbnail != '') {
                imageSrc = WEBDIR + 'kodi/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail)
            }

            var label = album.label
            if (album.year != '0') label += ' (' + album.year + ')'

            $('#albums-content').append(
                $('<li>').addClass('media').append(
                    $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
                    $('<div>').addClass('media-body').append(
                        $('<h5>').addClass('media-heading').html(label),
                        $('<p>').text(album.artist[0])
                    )
                ).click(function(e) {
                    location.href = 'kodi/#albums'
                })
            )
        })
        Holder.run()
        $('#albums-content').parent().show()
    })
}

function loadRecentMoviesPlex () {
    if (!$('#movie-carousel-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentMovies',function (data) {
        if (data === null) return
        $.each(data.movies, function (i, movie) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i === 0) itemDiv.addClass('active')

            var src = WEBDIR + 'plex/GetThumb?h=240&w=430&thumb='+encodeURIComponent(movie.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = WEBDIR + 'plex/#movies'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(movie.title + ' (' + movie.year + ')'),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(movie.runtime) + '<br />' +
                    '<b>Genre</b>: ' + movie.genre.join(', ') + '<br />' +
                    movie.plot
                ).hide()
            ))
            $('#movie-carousel-plex .carousel-inner').append(itemDiv)
        })
        $('#movie-carousel-plex').show()
    })
}
function loadRecentTVshowsPlex () {
    if (!$('#tvshow-carousel-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentShows', function (data) {
        if (data === null) return
        $.each(data.episodes, function (i, episode) {
            var itemDiv = $('<div>').addClass('item carousel-item')

            if (i == 0) itemDiv.addClass('active')

            var src = WEBDIR + "plex/GetThumb?h=240&w=430&thumb="+encodeURIComponent(episode.fanart)
            itemDiv.attr('style', 'background-image: url("' + src + '")')

            itemDiv.append($('<div>').addClass('carousel-caption').click(function() {
                location.href = 'plex/#shows'
            }).hover(function() {
                var text = $(this).children('p').stop().slideToggle()
            }).append(
                $('<h4>').html(episode.showtitle + ': ' + episode.label),
                $('<p>').html(
                    '<b>Runtime</b>: ' + parseSec(episode.runtime) + '<br />' + episode.plot
                ).hide()
            ))
            $('#tvshow-carousel-plex .carousel-inner').append(itemDiv)
        })
        $('#tvshow-carousel-plex').show()
    })
}
function loadRecentAlbumsPlex () {
    if (!$('#albums-content-plex').length) return
    $.getJSON(WEBDIR + 'plex/GetRecentAlbums', function (data) {
        if (data === null) return
        $.each(data.albums, function (i, album) {
            var imageSrc = WEBDIR + 'js/libs/holder.js/45x45/text:No cover'
            if (album.thumbnail != '') {
                imageSrc = WEBDIR + 'plex/GetThumb?h=45&w=45&thumb='+encodeURIComponent(album.thumbnail)
            }

            var label = album.title
            if (album.year != '0') label += ' (' + album.year + ')'

            $('#albums-content-plex').append(
                $('<li>').addClass('media').append(
                    $('<img>').addClass('media-object pull-left img-rounded').attr('src', imageSrc),
                    $('<div>').addClass('media-body').append(
                        $('<h5>').addClass('media-heading').html(label),
                        $('<p>').text(album.artist)
                    )
                ).click(function(e) {
                    location.href = 'plex/#albums'
                })
            )
        })
        Holder.run()
        $('#albums-content-plex').parent().show()
    })
}
function loadDownloadHistory() {
    if (!$('#downloads_table_body').length) return
    $.getJSON(WEBDIR + 'sabnzbd/GetHistory?limit=5', function (data) {
        $.each(data.history.slots, function (i, slot) {
            var status = $('<i>').addClass('icon-ok')
            if (slot.status == 'Failed') {
                status.removeClass().addClass('icon-remove').attr('title', slot.fail_message)
            }
            $('#downloads_table_body').append(
                $('<tr>').append(
                    $('<td>').html(slot.name).attr('title', slot.name),
                    $('<td>').html(status)
                )
            )
        })
    })
}
function loadNZBGetDownloadHistory() {
    if (!$('#nzbgetdownloads_table_body').length) return;
    $.getJSON(WEBDIR + 'nzbget/GetHistory', function (data) {
        if (!data.length) {
            $('#nzbgetdownloads_table_body').append(
            $('<tr>').append($('<td>').html('History is empty')));
            return;
        }
        $.each(data, function (i, slot) {
            var status = $('<i>').addClass('icon-ok');
            if (slot.ParStatus == 'FAILURE') {
                status.removeClass().addClass('icon-remove').attr('title', slot.fail_message);
            }
            // Limit the results to 5
            if (i >= 5) return;
            $('#nzbgetdownloads_table_body').append(
            $('<tr>').append(
            $('<td>').html(slot.Name).attr('title', slot.Name),
            $('<td>').html(status)));
        });
    });
}
function loadWantedMovies() {
    if (!$('#wantedmovies_table_body').length) return
    $.getJSON(WEBDIR + 'couchpotato/GetMovieList/active/5', function (result) {
        if (result === null) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append($('<td>').html('No wanted movies found').attr('colspan', '2')),
                $('<tr>').append($('<td>').html('&nbsp;').attr('colspan', '2')),
                $('<tr>').append($('<td>').html('&nbsp;').attr('colspan', '2')),
                $('<tr>').append($('<td>').html('&nbsp;').attr('colspan', '2')),
                $('<tr>').append($('<td>').html('&nbsp;').attr('colspan', '2'))
            )
            return
        }
        $.each(result.movies, function(i, item) {
            $('#wantedmovies_table_body').append(
                $('<tr>').append(
                    $('<td>').html(item.info.original_title),
                    $('<td>').addClass('alignright').html(item.info.year)
                )
            )
        })
    })
}
function loadNextAired(options) {
    if (!$('#nextaired_sickbeard_table_body').length) return
    $.getJSON(WEBDIR + 'sickbeard/GetNextAired', function (result) {
        if (result === null || result.data.soon.length === 0) {
            $('#nextaired_sickbeard_table_body').append(
                $('<tr>').append($('<td>').html('No future episodes found')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;'))
            )
            return
        }
        var soonaired = result.data.soon
        var todayaired = result.data.today
        var nextaired = todayaired.concat(soonaired)
        $.each(nextaired, function (i, tvshow) {
            if (i >= 5) return
            var name = $('<a>').attr('href', 'sickbeard/view/' + tvshow.tvdbid).html(tvshow.show_name)
            $('#nextaired_sickbeard_table_body').append(
                $('<tr>').append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name),
                    $('<td>').html(tvshow.airdate)
                )
            )
        })
    })
}

function loadsonarrCalendar(options) {
    if (!$('#calendar_table_body').length) return
    $.getJSON(WEBDIR + 'sonarr/Calendar', function (result) {
        $.each(result, function (i, cal) {
          if (i >= 5) return
            var name = $('<a>').attr('href', 'sonarr/View/' + cal.seriesId + '/' + cal.series.tvdbId + '#' + cal.seasonNumber).html(cal.series.title)
            var row = $('<tr>');
            row.append(
            $('<td>').append(name),
            $('<td>').text(cal.title),
            $('<td>').text(moment(cal.airDateUtc).fromNow())
            )

            $('#calendar_table_body').append(row);
        });

    });
}

function loadNextAiredSickrage(options) {
    if (!$('#nextaired_sickrage_table_body').length) return
    $.getJSON(WEBDIR + 'sickrage/GetNextAired', function (result) {
        if (result === null) {
            $('#nextairedsickrage_table_body').append(
                $('<tr>').append($('<td>').html('No connection with sickrage')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;'))
            )
            return false
        };
        if (result.data.soon.length === 0 && result.data.later.length === 0 && result.data.today.length === 0 && result.data.missed.length === 0) {
            $('#nextairedsickrage_table_body').append(
                $('<tr>').append($('<td>').html('No future/missing episodes found')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;')),
                $('<tr>').append($('<td>').html('&nbsp;'))
            )
            return false
        }
        var missed = result.data.missed;
        var all = missed.concat(result.data.today, result.data.soon, result.data.later)
        $.each(all, function(i, tvshow) {
            if ($('table #nextaired_sickrage_table_body >tr').length >= 5) return false;
            var name = $('<a>').attr('href', 'sickrage/view/' + tvshow.tvdbid).html(tvshow.show_name)
            $('#nextaired_sickrage_table_body').append(
                $('<tr>').append(
                    $('<td>').append(name),
                    $('<td>').html(tvshow.ep_name),
                    $('<td>').html(tvshow.airdate)
                )
            )

        })
    })
}

function loadsysinfo(options) {
    if (!$('#sysinfo_table_body').length) return
    var dashspeed;
    $.getJSON(WEBDIR + 'vnstat/oneline', function(result) {
        dashspeed = result;
        var bwtot = (parseFloat(result.download_speed, 10) + parseFloat(result.upload_speed, 10)).toFixed(2);
        $('.dash_sysinfo_speed_down').text(result.download_speed);
        $('.dash_sysinfo_speed_up').text(result.upload_speed);
        $('.dash_sysinfo_speed_total').text(bwtot + ' kbits/s');
        $('.dash_sysinfo_').text(bwtot + ' kbits/s');
        $('.dash_sysinfo_download_current_month').text("DL CM: " + result.rx_current_month)
        $('.dash_sysinfo_download_total').text("DL AT: "+ result.alltime_total_traffic)

        /*
        $('.sysbw').append(
            $('<div>').text("DL Month " + result.rx_current_month),
            $('<div>').text("DL alltime " + result.alltime_total_traffic),
            $('<div>').text("DL speed " + result.download_speed),
            $('<div>').text("UL speed  " + result.upload_speed),
            $('<div>').text("Av DL speed " + result.average_download_today),
            $('<div>').text("Av UL speed " + result.average_upload_today)
        )
        */



        return dashspeed;
    });

    $.getJSON(WEBDIR + 'stats/sysinfodash', function(result) {
            // feed the bastard
            $(".dash_sysinfo_cpu_idle").text('I '+ result.cpu.idle + ' %');
            $(".dash_sysinfo_cpu_system").text('S '+ result.cpu.system + ' %');
            $(".dash_sysinfo_cpu_user").text('U '+ result.cpu.user + ' %');

            $(".dash_sysinfo_mem_avail").text(bytesToSize(result.vmem.available));
            $(".dash_sysinfo_mem_percent").text(result.vmem.percent + ' %');
            $(".dash_sysinfo_mem_total").text(bytesToSize(result.vmem.total));

            $(".dash_sysinfo_localip").text(result.localip);
            $(".dash_sysinfo_externalip").text(result.externalip);

            /*
            $(".syscpu").append(
                $('<div>').text("Idle " + result.cpu.idle + ' %'),
                $('<div>').text("System " + result.cpu.system + ' %'),
                $('<div>').text("User " + result.cpu.user + ' %')
            )

            $(".sysmem").append(
                $('<div>').text("Avail " + bytesToSize(result.vmem.available)),
                $('<div>').text("Total " + bytesToSize(result.vmem.total)),
                $('<div>').text("Used " + result.vmem.percent + ' %')
            )

            $(".sysip").append(
                $('<div>').text("Local " + result.localip),
                $('<div>').text("Total " + result.externalip)
            )
            */

        }

    );
}

    function loaddiskinfo() {
        $.ajax({
            'url': WEBDIR + 'stats/disk_usage',
                'dataType': 'json' ,
                'success': function (response) {
                $('#dash_disks_table_body').html("");

                $.each(response, function (i, disk) {
                    var row = $('<tr>');
                    var progress =     "<div class='progress' style=margin-bottom:0px><div class=bar style=width:" + disk.percent + "%><span class=sr-only>"+ getReadableFileSizeStringHDD(disk.used) +"</span></div><div class='bar bar-success' style=width:" + (100 - disk.percent) + "% ><span class=sr-only>" + getReadableFileSizeStringHDD(disk.free) +"</span></div>";

                    row.append(
                    $('<td>').addClass('stats_disk_mountpoint').text(disk.mountpoint),
                    $('<td>').addClass('stats_disk_progress span4').html(progress),
                    $('<td>').addClass('stats_disk_percent').text(disk.percent + '%'));
                    $('#dash_disks_table_body').append(row);
            });

            }
        });
    }

function loadsmartinfo() {
    $('.smart-spinner').show();
    $('#dash_smart_table_body').html("");
    $.ajax({
        'url': WEBDIR + 'stats/smart_info',
            'dataType': 'json' ,
            'success': function (response) {
            if (response == null || response.length == 0 || jQuery.isEmptyObject(response)) {
                    var row = $('<tr>');
                    row.append($('<td>').text("S.M.A.R.T not correctly configured."));
                    $('#dash_smart_table_body').append(row);
            } else {
                byteSizeOrdering()
                $.each(response, function (i, drives) {
                    var row = $('<tr>');
                    row.append(
                    $('<td>').text(drives.name),
                    $('<td>').addClass('span4').text(drives.model),
                    $('<td>').text(drives.temperature + String.fromCharCode(176)),
                    $('<td>').text(drives.assessment));
                    $('#dash_smart_table_body').append(row);
                });
            }
            $('.smart-spinner').hide();
        }
    });
}


// For hdd. Converts bytes to filesize in kb,mb,gb
 function getReadableFileSizeStringHDD(fileSizeInBytes) {
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1000;
        i++;
    } while (fileSizeInBytes > 1000);
    return fileSizeInBytes.toFixed(1) + byteUnits[i];
};

//
function bytestospeed(bytes) {
    var i = -1;
    var byteUnits = [' Kb', ' Mb', ' Gb', ' Tb', ' Pb'];
    do {
        bytes = bytes / 1024;
        i++;
    } while (bytes > 1024);
    return bytes.toFixed(2) + byteUnits[i]+ '\\s';
}


$(document).ready(function () {
    loadRecentMovies()
    loadRecentTVshows()
    loadRecentAlbums()
    loadRecentMoviesPlex()
    loadRecentTVshowsPlex()
    loadRecentAlbumsPlex()
    loadDownloadHistory()
    loadNZBGetDownloadHistory()
    loadWantedMovies()
    loadNextAired()
    loadsonarrCalendar()
    loadNextAiredSickrage()
    loadsysinfo()
    loadWantedAlbums()
    loaddiskinfo()
    loadsmartinfo()
})
