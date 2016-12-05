$.ajaxSetup({
    timeout: 6000000
});
var profiles = $('<select id="profiles">');
var cpcat = '';
searchString = ''
$(document).ready(function() {
    //getNotificationList()
    //getHistory()
    //getSuggestions()
    getCharts()
    getDashboardSoon();

    $('#searchform').submit(function(e) {
        e.preventDefault()
        var search = $('#moviename').val()
        if (search) {
            searchMovie(search)
        }

    })

    // Load data on tab display
    $('a[data-toggle="tab"]').click(function(e) {
        $('.search').val('')
        searchString = ''
    }).on('shown', reloadTab);
    $(window).trigger('hashchange')


    // Disable nzbsearch
    $('#menu-search').submit(function(e) {
        e.preventDefault();
        searchString = $(e.target).find('.search').val();
        reloadTab();

    });


    $('.search').keyup(function(event) {
        if (event.keyCode == 27) {
            $('.search').val('')
            searchString = ''
            reloadTab()
        }
    });


    $.get(WEBDIR + 'couchpotato/GetProfiles', function(data) {
        if (data === null) return
        $.each(data.list, function(i, item) {
            if (!item.hide) profiles.append($('<option>').val(item._id).text(item.label))
        });
    });

    $.get(WEBDIR + 'couchpotato/GetCategories', function(data) {
        if (data.categories.length <= 0) return
        cpcat = $('<select id="category_id">');
        cpcat.append($('<option>').val('').text(''));
        $.each(data.categories, function(i, item) {
            cpcat.append($('<option>').val(item._id).text(item.label))
        });
    });

    $('#postprocess').click(function(e) {
        e.preventDefault();
        Postprocess();
    });

    $('#cp_update').click(function(e) {
        e.preventDefault();
        update();
    });

});


function getMovies(strStatus, pHTMLElement) {
    /*
    if (options.f.length) {
        // remove all old content if it was a search
        pHTMLElement.empty();
    }
    */
    var o = options
    o.status = strStatus
    pHTMLElement.empty();
    $(".spinner").show();

    $.getJSON(WEBDIR + "couchpotato/GetMovieList/", o, function(pResult) {
        $(".spinner").hide();

        if (pResult === null || pResult.total === 0) {
            pHTMLElement.append($("<li>").html("No " + strStatus + " movies found"));
            return;
        }

        $.each(pResult.movies, function(nIndex, pMovie) {
            var strHTML = $("<a>").attr("href", "#").click(function(pEvent) {
                pEvent.preventDefault();
                showMovie(pMovie);
            });
            var src = 'holder.js/100x150/text:No artwork'
            if (pMovie.info.images.poster && pMovie.info.images.poster_original) {
                var a = []
                $.each(pMovie.info.images.poster, function(ii, mm) {
                    a.push(mm)
                })

                if (a.length) {
                    src = WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + JSON.stringify(a)
                }

            }
            strHTML.append($("<img>").attr("src", src).attr("width", "100").attr("height", "150").addClass("thumbnail"));

            if (pMovie.releases.length > 0) {
                strHTML.append($("<i>").attr("title", "Download").addClass("fa fa-arrow-circle-o-down fa-inverse status"));
            }

            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(pMovie.info.original_title, 16)));
            pHTMLElement.append($("<li>").attr("id", pMovie.id).append(strHTML));
        });
        Holder.run();
    });

}


function reloadTab() {
    options = {
        'f': searchString
    }

    if ($('#library').is(':visible')) {
        $('.search').attr('placeholder', "Filter library")
        getMovies("done", $("#library-grid"), options);
    } else if ($('#wanted').is(':visible')) {
        $('.search').attr('placeholder', "Filter wanted")
        getMovies("active", $("#wanted-grid"), options);
    } else if ($('#suggestions').is(':visible')) {
        getSuggestions();
    } else if ($('#dashboardsoon').is(':visible')) {
        getDashboardSoon();
    } else if ($('#history').is(':visible')) {
        getHistory();
    }

}

function getMovieLists() {
    getMovies("done", $("#library-grid"));
    getMovies("active", $("#wanted-grid"));
}

function addMovie(movieid, profile, title, catid) {
    var data = {
        movieid: movieid,
        profile: profile,
        category_id: catid,
        title: encodeURIComponent(title)
    }
    $.getJSON(WEBDIR + 'couchpotato/AddMovie', data, function(result) {
        if (result.success) {
            notify('CouchPotato', 'Added ' + title, 'info');
            $('a[href=#wanted]').tab('show')
        } else {
            notify('CouchPotato', 'Failed to add ' + title, 'info')
        }
    })
}

function editMovie(id, profile, title) {
    $.getJSON(WEBDIR + 'couchpotato/EditMovie', {
        id: id,
        profile: profile,
        title: encodeURIComponent(title)
    }, function(result) {
        if (result.success) {
            notify('CouchPotato', 'Profile changed', 'info')
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}

function deleteMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/DeleteMovie', {
        id: id
    }, function(result) {
        if (result.success) {
            $('#' + id).fadeOut()
            getMovieLists();
        } else {
            notify('CouchPotato', 'An error occured.', 'error')
        }
    })
}

function refreshMovie(id, name) {
    $.getJSON(WEBDIR + 'couchpotato/RefreshMovie', {
        id: id
    }, function(result) {
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
    }, function(result) {
        $('.spinner').hide()
        $.each(result.movies, function(i, movie) {
            var link = $('<a>').attr('href', '#').click(function(e) {
                e.preventDefault()
                showMovie(movie, cpcat)
            })
            var src = 'holder.js/100x150/text:No artwork'
            if (movie.images.poster[0]) {
                src = WEBDIR + 'couchpotato/GetImage?w=100&h=150&url=' + movie.images.poster[0]
            }
            link.append($('<img>').attr('src', src).addClass('thumbnail'))
            var title = shortenText(movie.original_title, 16)
            link.append($('<h6>').addClass('movie-title').html(title))
            grid.append($('<li>').attr('id', movie.id).append(link))
        })
        Holder.run()
    })
}

function getNotificationList() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function(result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            if (!item.read) notify('Notifications', item.message, 'info')
        })
    })
}

function getHistory() {
    $.getJSON(WEBDIR + 'couchpotato/GetNotificationList', function(result) {
        if (result == null) return
        $.each(result.notifications, function(i, item) {
            $('#history-grid').prepend(
                $('<tr>').append(
                    $('<td>').text(parseDate(item.time)),
                    $('<td>').text(item.message)
                )
            )
        })
    })
}


function showMovie(movie, was_search) {
    var plot;
    var info;
    var year;
    var modalButtons;

    //If true, it was not called from a search.
    if (typeof movie.plot === 'undefined') {
        plot = movie.info.plot;
        info = movie.info;
        year = movie.info.year;

    } else {
        info = movie;
        plot = movie.plot;
        year = movie.year;
    }

    var src = 'holder.js/154x231/text:No artwork';
    if (info.images.poster && info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + info.images.poster[0];
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left');

    var modalInfo = $('<div>').addClass('modal-movieinfo');
    if (info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(info.runtime)));
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + plot));
    if (info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + info.directors));
    }
    if (info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + info.genres));
    }

    if (info.rating && info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: null,
                score: (info.rating.imdb[0] / 2)
            }));
    }

    var titles = $('<select>').attr('id', 'titles');
    if (typeof movie.plot === 'undefined') {
        $.each(info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item).prop('selected', item.default));
        })
    } else {
        $.each(info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item));
        });

    }

    profiles.unbind();
    var title = info.original_title + ' (' + year + ')';
    profiles.change(function() {
        editMovie(movie._id, profiles.val(), titles.val());
    }).val(movie.profile_id);
    titles.change(function() {
        editMovie(movie._id, profiles.val(), titles.val());
    });


    // If showmovie isnt called from a search
    if (typeof movie.in_wanted === 'undefined' || typeof movie.in_library === 'undefined') {
        modalButtons = {
            'Delete': function() {
                if (confirm('Do you want to delete: ' + title)) {
                    deleteMovie(movie._id, title);
                    hideModal();
                }
            },
            'Refresh': function() {
                refreshMovie(movie._id, title);
                hideModal();
            }
        };
    } else {
        // Was called from search
        modalButtons = {
            'Add': function() {
                if (!was_search.length) {
                    was_search = ''

                } else {
                    was_search = was_search.val()
                }
                addMovie(movie.imdb, profiles.val(), titles.val(), was_search);
                hideModal();
            }
        };
    }
    if (info.imdb) {
        $.extend(modalButtons, {
            'IMDb': function() {
                window.open('http://www.imdb.com/title/' + info.imdb, 'IMDb')
            }
        })
    }


    //Make sure that this isnt a search call...
    if (typeof movie.plot === 'undefined') {
        //Loop all with movies with releases. Dont add button if its done.
        if (movie.releases && movie.releases.length > 0) {
            $.each(movie.releases, function(nIndex, rr) {
                if (rr.status !== 'done') {
                    $.extend(modalButtons, {
                        'Releases': function() {
                            $('.modal-body').html(strTable);
                        }
                    });
                }
            });
        }
    }

    modalInfo.append(titles, profiles);

    // Adds the category id showmovie was run from search
    if (was_search) {
        modalInfo.append(cpcat);
        console.log(cpcat)
    }

    if (movie.releases && movie.releases.length > 0 && movie.releases.status !== 'done') {
        var strTable = $("<table>").addClass("table table-striped table-hover").append(
            $("<tr>").append("<th>Action</th>").append("<th>Name</th>").append("<th>Age</th>").append("<th>Score</th>").append("<th>Size</th>"));

        $.each(movie.releases, function(nIndex, pRelease) {
            if (pRelease.info === undefined || pRelease.info.id === undefined) {
                return;
            }

            strTable.append(
                $("<tr>").append(
                    $("<td>").append(
                        $("<a>").attr("href", "#").append(
                            $("<i>").attr("title", "Download").addClass("fa fa-download")).click(function(pEvent) {
                            pEvent.preventDefault();
                            hideModal();
                            $.getJSON("DownloadRelease/?id=" + pRelease._id);
                        }),
                        $("<a>").attr("href", "#").append(
                            $("<i>").attr("title", "Ignore").addClass("fa fa-times-circle")).click(function(pEvent) {
                            pEvent.preventDefault();
                            $(this).closest("tr").toggleClass("ignore");
                            $.getJSON("IgnoreRelease/?id=" + pRelease._id);
                        })),
                    $("<td>").append(
                        $("<a>").attr("href", "#").text(pRelease.info.name).click(function(pEvent) {
                            pEvent.preventDefault();
                            window.open(pRelease.info.detail_url);
                        })),
                    $("<td>").append(pRelease.info.age),
                    $("<td>").append(pRelease.info.score),
                    $("<td>").html(bytesToSize(pRelease.info.size * 1000000))).toggleClass("ignore", pRelease.status_id == 3));

        });
    }


    if (info.images.backdrop && info.images.backdrop.length > 0) {
        var backdrop = WEBDIR + 'couchpotato/GetImage?w=675&h=400&o=10&url=' + encodeURIComponent(info.images.backdrop);
        $('.modal-fanart').css({
            'background-image': 'url(' + backdrop + ')'
        });
    }

    var modalBody = $('<div>').append(modalImg, modalInfo);
    showModal(title, modalBody, modalButtons);
    // since ff and ie sucks balls
    $('#profiles option')[0].selected = true
    Holder.run();
}


function getSuggestions() {
    var suggestion = $("#suggestions-grid").empty()
    $(".spinner").show();
    $.getJSON(WEBDIR + "couchpotato/Suggestion/", function(data) {
        if (data === null || data.total === 0) {
            suggestion.append($("<li>").html("No suggestioned movies found"));
            return;
        }
        $.each(data.movies, function(i, m) {
            var strHTML = $("<a>").attr("href", "#").click(function(c) {
                c.preventDefault();
                load_sc(m, cpcat);
            });
            var a = []
            var src = 'holder.js/100x150/text:No artwork'
            $.each(m.info.images.poster, function(ii, mm) {
                a.push(mm)
            })

            if (a.length) {
                src = WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + JSON.stringify(a)
            }

            strHTML.append($("<img>").attr("src", src).attr("width", "100").attr("height", "150").addClass("thumbnail"));
            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(m.info.original_title, 16)));
            suggestion.append($("<li>").attr("id", m.id).append(strHTML));
        });

    });
    Holder.run()
    $(".spinner").hide();

}

function getDashboardSoon() {
    var suggestion = $("#dashboardsoon-grid").empty()
    $(".spinner").show();
    $.getJSON(WEBDIR + "couchpotato/DashboardSoon/", function(data) {

        if (data === null || data.total === 0) {
            suggestion.append($("<li>").html("No movies available soon"));
            return;
        }

        $.each(data.movies, function(i, m) {
            var strHTML = $("<a>").attr("href", "#").click(function(c) {
                c.preventDefault();
                showMovie(m, cpcat)
            });

            var a = []
            var src = 'holder.js/100x150/text:No artwork'
            $.each(m.info.images.poster, function(ii, mm) {
                a.push(mm)
            });

            if (a.length) {
                src = WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + JSON.stringify(a)
            }

            strHTML.append($("<img>").attr("src", src).attr("width", "100").attr("height", "150").addClass("thumbnail"));

            strHTML.append($("<h6>").addClass("movie-title").html(shortenText(m.info.original_title, 16)));
            suggestion.append($("<li>").attr("id", m.id).append(strHTML));
        });
        Holder.run();
    });
    $(".spinner").hide();

}

// Used for suggestion and charts modal
function load_sc(movie, was_search) {
    var modalButtons;


    var src = 'holder.js/154x231/text:No artwork';
    if (movie.info.images.poster && movie.info.images.poster[0]) {
        src = WEBDIR + 'couchpotato/GetImage?w=154&h=231&url=' + movie.info.images.poster[0];
    }
    var modalImg = $('<img>').attr('src', src).addClass('thumbnail pull-left');

    var modalInfo = $('<div>').addClass('modal-movieinfo');
    if (movie.info.runtime) {
        modalInfo.append($('<p>').html('<b>Runtime:</b> ' + parseSec(movie.info.runtime)));
    }
    modalInfo.append($('<p>').html('<b>Plot:</b> ' + movie.info.plot));
    if (movie.info.directors) {
        modalInfo.append($('<p>').html('<b>Director:</b> ' + movie.info.directors));
    }
    if (movie.info.genres) {
        modalInfo.append($('<p>').html('<b>Genre:</b> ' + movie.info.genres));
    }

    if (movie.info.rating && movie.info.rating.imdb) {
        modalInfo.append(
            $('<div>').raty({
                readOnly: true,
                path: null,
                score: (movie.info.rating.imdb[0] / 2)
            }));
    }

    var titles = $('<select>').attr('id', 'titles');
    if (typeof movie.info.plot === 'undefined') {
        $.each(movie.info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item).prop('selected', item["default"]));
        });
    } else {
        $.each(movie.info.titles, function(i, item) {
            titles.append($('<option>').text(item).val(item));
        });

    }

    profiles.unbind();
    var title = movie.info.original_title + ' (' + movie.info.year + ')';
    profiles.change(function() {
        editMovie(movie._id, profiles.val(), titles.val());
    }).val(movie.profile_id);
    titles.change(function() {
        editMovie(movie._id, profiles.val(), titles.val());
    });

    var modalBody = $('<div>').append(modalImg, modalInfo);

    modalButtons = {
        'Add': function() {
            if (!was_search.length) {
                was_search = ''
            } else {
                was_search = was_search.val()
            }
            addMovie(movie.info.imdb, profiles.val(), titles.val(), was_search);
            hideModal();
            getMovies("active", $("#wanted-grid"));
        },
        'Ignore': function() {
            $.get(WEBDIR + "couchpotato/SuggestionIgnore/" + movie.info.imdb, function(data) {
                if (data.result) {
                    notify("Marked", titles.val() + " as ignored", "sucess")
                    getCharts();
                    getSuggestions();
                    hideModal();
                } else {
                    notify("Failed", "to mark " + titles.val() + " as ignored", "error")
                    hideModal();
                }
            })
        },
        'Seen it': function() {
            $.get(WEBDIR + "couchpotato/SuggestionIgnore/?imdb=" + movie.info.imdb + "&seenit=1", function(data) {
                if (data.result) {
                    notify("Marked ", titles.val() + " as seen", "sucess")
                    getCharts();
                    getSuggestions();
                    hideModal();
                } else {
                    notify("Failed ", "to mark " + titles.val() + " as seen", "error")
                    hideModal();
                }
            })
        }

    };

    if (movie.info.imdb) {
        $.extend(modalButtons, {
            'IMDb': function() {
                window.open('http://www.imdb.com/title/' + movie.info.imdb, 'IMDb');
            }
        });
    }
    modalInfo.append(titles, profiles);
    modalInfo.append(cpcat);

    // kicks off the modal
    showModal(title, modalBody, modalButtons);
    $('#profiles option')[0].selected = true;
    Holder.run();

}

function Postprocess() {
    var data = {};
    p = prompt('Write path to processfolder or leave blank for default path');
    if (p || p.length >= 0) {
        data.path = p;

        $.get(WEBDIR + 'couchpotato/Postprocess', data, function(r) {
            state = (r.success) ? 'success' : 'error';
            // Stop the notify from firing on cancel
            if (p !== null) {
                path = (p.length === 0) ? 'Default folder' : p;
                notify('Couchpotato', 'Postprocess ' + path, state);
            }
        });

    }
}

function update() {
    $.get(WEBDIR + "couchpotato/Update/", function(data) {
        if (data.success) {
            notify("Couchpotato", "is updating", "success")
        } else {
            notify("Couchpotato", "is not updating", "error")
        }
    })
}

function getCharts() {
    $(".spinner").show();

    $.getJSON(WEBDIR + "couchpotato/ChartsView/", function(data) {
        if (data === null || data.total === 0) {
            return;
        }

        // loop each active charts,
        $.each(data.charts, function(i, chart) {
            // add to navbar have to use a int as href as the tab thing doesnt like space
            var a = $('<a>').attr('href', '#t' + i).attr('data-toggle', 'tab').text(chart.name)
            var li = $('<li>')
            li.append(a)
                // Add li to charts dropdown
            $(".cp_chart_dropdown").append(li)
                // Add images etc to this one
            var grid = $('<ul>').attr('id', chart.name + '-grid').addClass("thumbnails")
            var make_tab = $('<div>').attr('id', 't' + i).addClass("tab-pane").append(grid)
            $('#cp_tab_content').append(make_tab);
            $.each(chart.list, function(i, m) {
                var strHTML = $("<a>").attr("href", "#").click(function(c) {
                    c.preventDefault();
                    load_sc(m, cpcat);
                });

                var a = []
                var src = 'holder.js/100x150/text:No artwork'
                $.each(m.info.images.poster, function(ii, mm) {
                    a.push(mm)
                });

                if (a.length) {
                    src = WEBDIR + "couchpotato/GetImage?w=100&h=150&url=" + JSON.stringify(a)
                }

                strHTML.append($("<img>").attr("src", src).attr("width", "100").attr("height", "150").addClass("thumbnail"));


                strHTML.append($("<h6>").addClass("movie-title").html(shortenText(m.info.original_title, 16)));
                grid.append($("<li>").attr("id", m.imdb).append(strHTML));
            });
        });
        Holder.run()
    });
    $(".spinner").hide();

}
