#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>
                <a href="http:\/\/$getVar('couchpotato_host', ''):$getVar('couchpotato_port', '')" target="_blank">$getVar('couchpotato_name', 'CouchPotato')</a>
            </h1>
        </div>

        <div class="well form-inline">
            <input class="span6" id="search_movie_name" name="search_movie_name" type="text" />
            <button class="btn btn-success" type="button" id="search_movie_button"><i class="icon-search icon-white"></i> Search movie</button>
        </div>

        <ul class="nav nav-tabs">
            <li class="active"><a href="#wanted" data-toggle="tab">Wanted</a></li>
        </ul>

        <div class="tab-content">
            <div id="wanted" class="tab-pane active">
                <table class="table table-striped">
                    <tbody id="movies_table_body"></tbody>
                </table>
            </div>
        </div>

    </div>
    
</div>

#include $webdir + "/footer.tpl"#
