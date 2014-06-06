var profiles = $('<select>')
$(document).ready(function() {
    $(window).trigger('hashchange')
    getMovieLists()
    getNotificationList()
    getHistory()
    $('#searchform').submit(function(e) {
        e.preventDefault()
        var search = $('#moviename').val()
        if (search) searchMovie(search)
    })
    $.get(WEBDIR + 'couchpotato/GetProfiles', function(data) {
        if (data === null) return
        $.each(data.list, function(i, item) {
            if (!item.hide) profiles.append($('<option>').val(item.id).text(item.label))
        })
    })
})


function getMovies(strStatus, pHTMLElement) {
	pHTMLElement.empty();
    $(".spinner").show();

    $.getJSON(WEBDIR + "couchpotato/GetMovieList/" + strStatus, function (pResult) {
        
        console.log(pResult);
        if (pResult === null || pResult.total === 0) {
            pHTMLElement.append($("<li>").html("No " + strStatus + " movies found"));
            return;
        }

        $.each(pResult.movies, function(nIndex, pMovie) {
            console.log(pMovie);
            var strHTML = $("<a>").attr("href", "#").click(function(pEvent) {
                pEvent.preventDefault();
                showMovie(pMovie);
            });

            //if (pMovie.info.images.poster && pMovie.info.images.poster_original[0]) {
                strHTML.append($("<img>").attr("src", WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + pMovie.info.images.poster[0]).attr("width", "100").attr("height", "150").addClass("thumbnail"));
            //}

            if (pMovie.releases.length > 0) {
                strHTML.append($("<i>").attr("title", "Download").addClass("icon-white icon-download status"));
            }

            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(pMovie.info.original_title, 12)));
            pHTMLElement.append($("<li>").attr("id", pMovie.id).append(strHTML));
            $(".spinner").hide();
        })
    })
    
}

function getMovieLists() {
    getMovies("done", $("#library-grid"));
	getMovies("active", $("#wanted-grid"));	
}

function showMovie(movie) {
    alert(movie.status);
   
    var info = movie
    var plot = movie.info.plot
    var year = movie.info.year
    
    var src = 'holder.js/154x231/text:No artwork'
    if (info.info.images.poster && info.info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.info.images.poster[0]
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left')

    var modalInfo = $('<div>').addClass('modal-movieinfo')
    if (info.info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.info.runtime)))
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot))
    if (info.info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.info.directors))
    }
    if (info.info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.info.genres))
    }

    if (info.info.rating && info.info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: WEBDIR+'img',
                score: (info.info.rating.imdb[0] / 2),
            })
        )
    }

    var titles = $('<select>').attr('id', 'titles')
    //if (movie.library && movie.library.titles) {
    if (movie.library && movie.library.titles) { // org
        $.each(movie.library.titles, function(i, item) {
            titles.append($('<option>').text(item.title).val(item.title).prop('selected', item.default))
        })
    } else {
        $.each(info.info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item))
        })
    }

    profiles.unbind()
    var title = info.info.original_title + ' ('+year+')'
    alert(info.status);
     //($('#library').is(':visible'))
    if (info.status !== 'ignored' || info.status !== 'done') {
    //if ($('#library:visible')) {
    //if (movie.library) {
        profiles.change(function() {
            editMovie(movie._id, profiles.val(), titles.val())
        }).val(movie.profile_id)
        titles.change(function() {
            editMovie(movie._id, profiles.val(), titles.val())
        })
        var modalButtons = {
            'Delete' : function() {
                if (confirm('Do you want to delete: ' + title)) {
                    deleteMovie(movie._id, title)
                    hideModal()
                }
            },
            'Refresh' : function() {
                refreshMovie(movie._id, title)
                hideModal()
            }
        }
    } else {
        var modalButtons = {
            'Add' : function() {
                addMovie(movie.imdb, profiles.val(), titles.val())
                hideModal()
            }
        }
    }
    if (info.info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+info.info.imdb,'IMDb')
            }
        })
    }
    modalInfo.append(titles, profiles)

    //if (movie.releases && movie.releases.length > 0 && (!$('#library:visible'))) {
    if (movie.releases && movie.releases.length > 0 && movie.status !== 'ignored' || 'done') { //org denne. den over er bare for test alt etter med og etter && kan fjernes
        var strTable = $("<table>").addClass("table table-striped table-hover").append(
			$("<tr>").append("<th>Action</th>").append("<th>Name</th>").append("<th>Score</th>").append("<th>Size</th>"));
            console.log("Oh shit there is a release somehere", movie._id, movie.info.original_title);
            console.log(movie.releases)

		// Grab actual releases
		//$.getJSON(WEBDIR + "couchpotato/GetReleases/" + movie._id, function (pResult) {
            //console.log("Trying to grap releses");
            //console.log("pResult");

			$.each(movie.releases, function(nIndex, pRelease) {
                console.log('looping releases');
               	if (pRelease.info === undefined || pRelease.info.id === undefined) {
                    //alert('No releases');
					return;
				}
                //alert(info.releases.info.name);
                //alert(movie.releases.info.name); // just a test
				strTable.append(
					$("<tr>").append(
						$("<td>").append(
							$("<a>").attr("href", "#").append(
								$("<i>").attr("title", "Download").addClass("icon-download")
							).click(function(pEvent) {
								pEvent.preventDefault();
								hideModal();
								$.getJSON("DownloadRelease/?id=" + pRelease._id);
							}),
							$("<a>").attr("href","DownloadRelease?id=" + pRelease._id).append(
								$("<i>").attr("title", "Ignore").addClass("icon-remove-sign")
							).click(function(pEvent) {
								pEvent.preventDefault();
								$(this).closest("tr").toggleClass("ignore");
								$.getJSON("IgnoreRelease/?id=" + pRelease._id);
							})
						),
						$("<td>").append(
							$("<a>").attr("href", "#").text(pRelease.info.name).click(function(pEvent) { // movie.releases.info.name
								pEvent.preventDefault()
								window.open(pRelease.info.detail_url);
							})
						),
						$("<td>").append(pRelease.info.score),
						$("<td>").html(bytesToSize(pRelease.info.size * 1000000))
					).toggleClass("ignore", pRelease.status_id == 3)
				);
			});
		//});

        $.extend(modalButtons,{
            'Releases' : function() {
                $('.modal-body').html(strTable)
            }
        })
    }

    if (info.info.images.backdrop && info.info.images.backdrop.length > 0) {
        var backdrop = WEBDIR + 'couchpotato/GetImage?w=675&h=400&o=10&url=' + encodeURIComponent(info.info.images.backdrop)
        $('.modal-fanart').css({
            'background-image' : 'url('+backdrop+')'
        })
    }

    var modalBody = $('<div>').append(modalImg, modalInfo)
    showModal(title,  modalBody, modalButtons)
    Holder.run()
}
//} // test

function addMovie(movieid, profile, title) {
    var data = {
        movieid: movieid,
        profile: profile,
        title: encodeURIComponent(title)
    }
    $.getJSON(WEBDIR + 'couchpotato/AddMovie', data, function (result) {
        if (result === null || result.success !== true) return
        setTimeout(function() {
            getMovieList()
            $('a[href=#wanted]').tab('show')
        }, 1000)
    })
}
function editMovie(id, profile, title) {
    $.getJSON(WEBDIR + 'couchpotato/EditMovie', {
        id: id,
        profile: profile,
        title: encodeURIComponent(title)
    }, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Profile changed', 'info')
            getMovieList()
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function deleteMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/DeleteMovie', {id: id}, function (result) {
        if (result.success) {
            $('#' + id).fadeOut()
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function refreshMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/RefreshMovie', {id: id}, function (result) {
        if (result.success) {
            notify('CouchPotato', 'Refreshing: ' + name, 'info')
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}
function searchMovie(q) {
    var grid = $('#result-grid').empty()
    $('a[href=#result]').tab('show')
    $('.spinner').show()
    $.getJSON(WEBDIR + 'couchpotato/SearchMovie', {
        q: encodeURIComponent(q)
    }, function (result) {
        $('.spinner').hide()
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault()
                showMovie(movie)
            })
            var src = 'holder.js/100x150/text:No artwork'
            if (movie.images.poster[0]) {
                src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.images.poster[0]
            }
            link.append($('<img>').attr('src', src).addClass('thumbnail'))
            var title = shortenText(movie.original_title, 12)
            link.append($('<h6>').addClass('movie-title').html(title))
            grid.append($('<li>').attr('id', movie.id).append(link))
        })
        Holder.run()
    })
}
function getNotificationList() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            if (!item.read) notify('Notifications', item.message, 'info')
        })
    })
}
function getHistory() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function (result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            $('#history-grid').prepend(
                $('<tr>').append(
                    $('<td>').text(parseDate(item.added)),
                    $('<td>').text(item.message)
                )
            )
        })
    })
}
