#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>
                <a href="http:\/\/$getVar('sickbeard_host', ''):$getVar('sickbeard_port', '')" target="_blank">$getVar('sb_name', 'Sickbeard')</a>                
            </h1>
        </div>

        <div class="well form-inline">
            <input class="span6" id="add_show_name" name="add_show_name" type="text" />
            <select class="span6" style="display:none;" id="add_show_select" name="add_show_select"></select>
            <button class="btn btn-success" type="button" id="add_show_button"><i class="icon-plus icon-white"></i> Add show</button>
            <button class="btn btn-success hide" type="button" id="add_tvdbid_button"><i class="icon-ok icon-white"></i> Add show</button>
            <button class="btn hide" type="button" id="cancel_show_button"> Cancel</button>
        </div>

        <ul class="nav nav-tabs">
            <li class="active"><a href="#tvshows" data-toggle="tab">TV Shows</a></li>
            <li><a href="#nextaired" data-toggle="tab">Next aired</a></li>
            <li><a href="#history" data-toggle="tab">History</a></li>
            <li><a href="#log" data-toggle="tab">Log</a></li>
        </ul>

        <div class="tab-content">

            <div id="tvshows" class="tab-pane active">
                <table class="table table-striped table-sortable">
                    <thead>
                    <tr>
                        <th>Showname</th>
                        <th>Status</th>
                        <th>Next ep</th>
                        <th>Network</th>
                        <th>Quality</th>
                        <th class="{sorter: false}">&nbsp;</th>
                    </tr>
                    </thead>
                    <tbody id="tvshows_table_body"></tbody>
                </table>
            </div>

            <div id="nextaired" class="tab-pane">
                <table class="table table-striped table-sortable">
                    <thead>
                    <tr>
                        <th>Showname</th>
                        <th>Episode</th>
                        <th>Airdate</th>
                        <th class="{sorter: false}">&nbsp;</th>
                    </tr>
                    </thead>
                    <tbody id="nextaired_table_body"></tbody>
                </table>
            </div>

            <div id="history" class="tab-pane">
                <table class="table table-striped table-sortable">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Showname</th>
                        <th>Episode</th>
                        <th>Status</th>
                        <th>Quality</th>
                    </tr>
                    </thead>
                    <tbody id="history_table_body"></tbody>
                </table>
            </div>

            <div id="log" class="tab-pane">
                <table class="table table-striped">
                    <thead>
                    <tr>
                        <th>Logitem</th>
                    </tr>
                    </thead>
                    <tbody id="log_table_body"></tbody>
                </table>
            </div>

        </div>
    </div>
</div>

#include $webdir + "/footer.tpl"#