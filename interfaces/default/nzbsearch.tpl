#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>
                NZB Search
            </h1>
        </div>

        <div id="notification_area"></div>

        <div class="well form-inline">
            <input class="span6" id="search_query" name="search_query" type="text" placeholder="Search term" />
            <select class="span2" name="search_category" id="search_category">
                <option value="">All</option>
            </select>
            <button class="btn btn-success" type="submit" id="search_nzb_button"><i class="icon-search icon-white"></i> Search</button>
        </div>

        <table class="table table-striped">
            <thead>
            <tr>
                <th>NZB</th>
                <th>Category</th>
                <th>Hits</th>
                <th>Size</th>
                <th>&nbsp;</th>
            </tr>
            </thead>
            <tbody id="results_table_body">

            </tbody>
        </table>

    </div>

</div>

#include $webdir + "/footer.tpl"#
