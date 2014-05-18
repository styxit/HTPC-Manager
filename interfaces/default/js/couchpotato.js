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
        if (data == null) return
        $.each(data.list, function(i, item) {
            if (!item.hide) profiles.append($('<option>').val(item.id).text(item.label))
        })
    })
})

function getMovies(strStatus, pHTMLElement) {
	pHTMLElement.empty();
    $(".spinner").show();
	
    $.getJSON(WEBDIR + "couchpotato/GetMovieList/" + strStatus, function (pResult) {
         $(".spinner").hide();
		
        if (pResult == null || pResult.total == 0) {
            pHTMLElement.append($("<li>").html("No " + strStatus + " movies found"));
            return;
        }
		
        $.each(pResult.movies, function(nIndex, pMovie) {
            var strHTML = $("<a>").attr("href", "#").click(function(pEvent) {
                pEvent.preventDefault();
                showMovie(pMovie);
            });
			
            strHTML.append($("<img>").attr("src", WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + pMovie.library.info.images.poster[0]).attr("width", "100").attr("height", "150").addClass("thumbnail"));
			
            if (pMovie.releases.length > 0) {
                strHTML.append($("<i>").attr("title", "Download").addClass("icon-white icon-download status"));
            }
			
            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(pMovie.library.info.original_title, 12)));
            pHTMLElement.append($("<li>").attr("id", pMovie.id).append(strHTML));
        })
    })
}

function getSuggestions() {
    $('#suggestions-grid').empty();
    $(".spinner").show();
 
    $.getJSON(WEBDIR + "couchpotato/GetSuggestions/", function (pResult) {
        $(".spinner").hide();
 
        if (pResult === null || pResult.total === 0) {
            $('#suggestions-grid').append($("<li>").html("No suggestions found"));
            return;
        }
 
        $.each(pResult.suggestions, function (nIndex, pMovie) {
            var strHTML = $("<a>").attr("href", "#").click(function (pEvent) {
                pEvent.preventDefault();
                showSuggestions(pMovie);
            });
 
            strHTML.append($("<img>").attr("src", WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + pMovie.images.poster_original).attr("width", "100").attr("height", "150").addClass("thumbnail"));
            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(pMovie.original_title, 15)));
            $('#suggestions-grid').append($("<li>").attr("id", pMovie.id).append(strHTML));
        });
    });
}

function getMovieLists() {
	getMovies("active", $("#wanted-grid"));
	getMovies("done", $("#library-grid"));
	getSuggestions()
}

function showMovie(movie) {
    if (movie.library) {
        var info = movie.library.info
        var plot = movie.library.plot
        var year = movie.library.year
    } else {
        var info = movie
        var plot = movie.plot
        var year = movie.year
    }
    var src = 'holder.js/154x231/text:No artwork'
    if (info.images.poster && info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.images.poster[0]
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left')

    var modalInfo = $('<div>').addClass('modal-movieinfo')
    if (info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.runtime)))
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot))
    if (info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.directors))
    }
    if (info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.genres))
    }

    if (info.rating && info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: WEBDIR+'img',
                score: (info.rating.imdb[0] / 2),
            })
        )
    }

    var titles = $('<select>').attr('id', 'titles')
    if (movie.library && movie.library.titles) {
        $.each(movie.library.titles, function(i, item) {
            titles.append($('<option>').text(item.title).val(item.title).prop('selected', item.default))
        })
    } else {
        $.each(info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item))
        })
    }

    profiles.unbind()
    var title = info.original_title + ' ('+year+')'
    if (movie.library) {
        profiles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        }).val(movie.profile_id)
        titles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        })
        var modalButtons = {
            'Delete' : function() {
                if (confirm('Do you want to delete: ' + title)) {
                    deleteMovie(movie.id, title)
                    hideModal()
                }
            },
            'Refresh' : function() {
                refreshMovie(movie.id, title)
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
    if (info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+info.imdb,'IMDb')
            }
        })
    }
    modalInfo.append(titles, profiles)

    if (movie.releases && movie.releases.length > 0) {
        var strTable = $("<table>").addClass("table table-striped table-hover").append(
			$("<tr>").append("<th>Action</th>").append("<th>Name</th>").append("<th>Score</th>").append("<th>Size</th>"));
		
		// Grab actual releases
		$.getJSON(WEBDIR + "couchpotato/GetReleases/" + movie.library_id, function (pResult) {
			$.each(pResult.releases, function(nIndex, pRelease) {
				if (pRelease.info == undefined || pRelease.info.id === undefined) {
					return;
				}
			
				strTable.append(
					$("<tr>").append(
						$("<td>").append(
							$("<a>").attr("href", "#").append(
								$("<i>").attr("title", "Download").addClass("icon-download")
							).click(function(pEvent) {
								pEvent.preventDefault();
								hideModal();
								$.getJSON("DownloadRelease/?id=" + pRelease.id);
							}),
							$("<a>").attr("href","DownloadRelease?id=" + pRelease.info.id).append(
								$("<i>").attr("title", "Ignore").addClass("icon-remove-sign")
							).click(function(pEvent) {
								pEvent.preventDefault();
								$(this).closest("tr").toggleClass("ignore");
								$.getJSON("IgnoreRelease/?id=" + pRelease.id);
							})
						),
						$("<td>").append(
							$("<a>").attr("href", "#").text(pRelease.info.name).click(function(pEvent) {
								pEvent.preventDefault()
								window.open(pRelease.info.detail_url);
							})
						),
						$("<td>").append(pRelease.info.score),
						$("<td>").html(bytesToSize(pRelease.info.size * 1000000))
					).toggleClass("ignore", pRelease.status_id == 3)
				);
			});
		});
		
        $.extend(modalButtons,{
            'Releases' : function() {
                $('.modal-body').html(strTable)
            }
        })
    }

    if (info.images.backdrop && info.images.backdrop.length > 0) {
        var backdrop = WEBDIR + 'couchpotato/GetImage?w=675&h=400&o=10&url=' + encodeURIComponent(info.images.backdrop)
        $('.modal-fanart').css({
            'background-image' : 'url('+backdrop+')'
        })
    }

    var modalBody = $('<div>').append(modalImg, modalInfo)
    showModal(title,  modalBody, modalButtons)
    Holder.run()
}

function showSuggestions(movie) {
    if (movie.library) {
        var info = movie.library.info
        var plot = movie.library.plot
        var year = movie.library.year
    } else {
        var info = movie
        var plot = movie.plot
        var year = movie.year
    }
    var src = 'holder.js/154x231/text:No artwork'
    if (info.images.poster && info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.images.poster[0]
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left')
 
    var modalInfo = $('<div>').addClass('modal-movieinfo')
    if (info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.runtime)))
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot))
    if (info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.directors))
    }
    if (info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.genres))
    }
 
    if (info.rating && info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: WEBDIR+'img',
                score: (info.rating.imdb[0] / 2),
            })
        )
    }
 
    var titles = $('<select>').attr('id', 'titles')
    if (movie.library && movie.library.titles) {
        $.each(movie.library.titles, function(i, item) {
            titles.append($('<option>').text(item.title).val(item.title).prop('selected', item.default))
        })
    } else {
        $.each(info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item))
        })
    }
 
    profiles.unbind()
    var title = info.original_title + ' ('+year+')'
    if (movie.library) {
        profiles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        }).val(movie.profile_id)
        titles.change(function() {
            editMovie(movie.id, profiles.val(), titles.val())
        })
        var modalButtons = {
            'Delete' : function() {
                if (confirm('Do you want to delete: ' + title)) {
                    deleteMovie(movie.id, title)
                    hideModal()
                }
            },
            'Refresh' : function() {
                refreshMovie(movie.id, title)
                hideModal()
            }
        }
    } else {
        var modalButtons = {
            'Add' : function() {
                addMovie(movie.imdb, profiles.val(), titles.val())
                seenSuggestions(movie.imdb)
                hideModal()
            },
            'Ignore' : function() {
                ignoreSuggestions(movie.imdb)
                hideModal()
            }, 
            'Seen' : function() {
                seenSuggestions(movie.imdb)
                hideModal()
            }
        }
    }
    if (info.imdb) {
        $.extend(modalButtons,{
            'IMDb' : function() {
                window.open('http://www.imdb.com/title/'+info.imdb,'IMDb')
            }
        })
    }
    modalInfo.append(titles, profiles)
 
    if (movie.releases && movie.releases.length > 0) {
        var strTable = $("<table>").addClass("table table-striped table-hover").append(
                        $("<tr>").append("<th>Action</th>").append("<th>Name</th>").append("<th>Score</th>").append("<th>Size</th>"));
               
                // Grab actual releases
                $.getJSON(WEBDIR + "couchpotato/GetReleases/" + movie.library_id, function (pResult) {
                        $.each(pResult.releases, function(nIndex, pRelease) {
                                if (pRelease.info == undefined || pRelease.info.id === undefined) {
                                        return;
                                }
                       
                                strTable.append(
                                        $("<tr>").append(
                                                $("<td>").append(
                                                        $("<a>").attr("href", "#").append(
                                                                $("<i>").attr("title", "Download").addClass("icon-download")
                                                        ).click(function(pEvent) {
                                                                pEvent.preventDefault();
                                                                hideModal();
                                                                $.getJSON("DownloadRelease/?id=" + pRelease.id);
                                                        }),
                                                        $("<a>").attr("href","DownloadRelease?id=" + pRelease.info.id).append(
                                                                $("<i>").attr("title", "Ignore").addClass("icon-remove-sign")
                                                        ).click(function(pEvent) {
                                                                pEvent.preventDefault();
                                                                $(this).closest("tr").toggleClass("ignore");
                                                                $.getJSON("IgnoreRelease/?id=" + pRelease.id);
                                                        })
                                                ),
                                                $("<td>").append(
                                                        $("<a>").attr("href", "#").text(pRelease.info.name).click(function(pEvent) {
                                                                pEvent.preventDefault()
                                                                window.open(pRelease.info.detail_url);
                                                        })
                                                ),
                                                $("<td>").append(pRelease.info.score),
                                                $("<td>").html(bytesToSize(pRelease.info.size * 1000000))
                                        ).toggleClass("ignore", pRelease.status_id == 3)
                                );
                        });
                });
               
        $.extend(modalButtons,{
            'Releases' : function() {
                $('.modal-body').html(strTable)
            }
        })
    }
 
    if (info.images.backdrop && info.images.backdrop.length > 0) {
        var backdrop = WEBDIR + 'couchpotato/GetImage?w=675&h=400&o=10&url=' + encodeURIComponent(info.images.backdrop)
        $('.modal-fanart').css({
            'background-image' : 'url('+backdrop+')'
        })
    }
 
    var modalBody = $('<div>').append(modalImg, modalInfo)
    showModal(title,  modalBody, modalButtons)
    Holder.run()
}

function addMovie(movieid, profile, title) {
    var data = {
        movieid: movieid,
        profile: profile,
        title: encodeURIComponent(title)
    }
    $.getJSON(WEBDIR + 'couchpotato/AddMovie', data, function (result) {
        if (result == null || result.success != true) return
        setTimeout(function() {
            getMovieList()
            $('a[href=#wanted]').tab('show')
        }, 1000)
    })
}

function ignoreSuggestions(movieid) {
    $.getJSON(WEBDIR + 'couchpotato/IgnoreSuggestions', {movieid: movieid}, function (result) {
        if (result === null || result.result !== true) return;
        setTimeout(function() {
            getSuggestions();
            $('a[href=#suggestions]').tab('show');
        }, 1000);
    });
}
 
function seenSuggestions(movieid) {
    $.getJSON(WEBDIR + 'couchpotato/SeenSuggestions', {movieid: movieid}, function (result) {
        if (result === null || result.result !== true) return;
        setTimeout(function() {
            getSuggestions();
            $('a[href=#suggestions]').tab('show');
        }, 1000);
    });
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
