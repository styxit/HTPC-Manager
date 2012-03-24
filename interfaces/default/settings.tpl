#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>Settings</h1>
        </div>

        <div id="notification-area"></div>

        <ul class="nav nav-tabs">
            <li class="active"><a href="#data" data-toggle="tab">General setting</a></li>
            <li><a href="#misc" data-toggle="tab">Miscellaneous</a></li>
            <li><a href="#search" data-toggle="tab">NZB Search</a></li>
        </ul>

        <div class="tab-content">
            <div id="data" class="tab-pane active" >
                <form action="" id="base-settings-form" name="base-settings-form" method="post" class="form-horizontal">

                    <fieldset>
                        <legend>HTPC-Manager</legend>
                        <div class="control-group">
                            <label class="control-label" for="my_port">Port</label>
                            <div class="controls">
                                <input class="span1" id="my_port" name="my_port" type="text" value="$getVar('my_port', '8084')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="my_username">Username</label>
                            <div class="controls">
                                <input class="span3" id="my_username" name="my_username" type="text" value="$getVar('my_username', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="my_password">Password</label>
                            <div class="controls">
                                <input class="span3" id="my_password" name="my_password" type="password" value="$getVar('my_password', '')" />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>SABnzbd</legend>
                        <div class="control-group">
                            <label class="control-label">Enable</label>
                            <div class="controls">
                                <label class="checkbox enable-module">
                                    #if $getVar('use_nzb', 'no') == "yes"
                                    <input type="checkbox" checked="checked" value="yes" name="use_nzb" />
                                    #else
                                    <input type="checkbox" value="yes" name="use_nzb" />
                                    #end if
                                </label>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzb_ip">IP / Host</label>
                            <div class="controls">
                                <input class="span3" id="nzb_ip" name="nzb_ip" type="text" value="$getVar('nzb_ip', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzb_username">Username</label>
                            <div class="controls">
                                <input class="span3" id="nzb_username" name="nzb_username" type="text" value="$getVar('nzb_username', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzb_password">Password</label>
                            <div class="controls">
                                <input class="span3" id="nzb_password" name="nzb_password" type="password" value="$getVar('nzb_password', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzb_port">Port</label>
                            <div class="controls">
                                <input class="span1" id="nzb_port" name="nzb_port" type="text" value="$getVar('nzb_port', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzb_apikey">API Key</label>
                            <div class="controls">
                                <input class="span6" id="nzb_apikey" name="nzb_apikey" type="text" value="$getVar('nzb_apikey', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label">SSL</label>
                            <div class="controls">
                                <label class="radio">
                                    #if $getVar('nzb_ssl', 'no') == "no"
                                    <input type="radio" checked="checked" value="no" name="nzb_ssl" /> No
                                    #else
                                    <input type="radio" checked="" value="no" name="nzb_ssl" /> No
                                    #end if
                                </label>
                                <label class="radio">
                                    #if $getVar('nzb_ssl', 'no') == "yes"
                                    <input type="radio" checked="checked" value="yes" name="nzb_ssl" /> Yes
                                    #else
                                    <input type="radio" value="yes" name="nzb_ssl" /> Yes
                                    #end if
                                </label>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>SickBeard</legend>
                        <div class="control-group">
                            <label class="control-label">Enable</label>
                            <div class="controls">
                                <label class="checkbox enable-module">
                                    #if $getVar('use_sb', 'no') == "yes"
                                    <input type="checkbox" checked="checked" value="yes" name="use_sb" />
                                    #else
                                    <input type="checkbox" value="yes" name="use_sb" />
                                    #end if
                                </label>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="sb_ip">IP / Host</label>
                            <div class="controls">
                                <input class="span3" id="sb_ip" name="sb_ip" type="text" value="$getVar('sb_ip', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="sb_username">Username</label>
                            <div class="controls">
                                <input class="span3" id="sb_username" name="sb_username" type="text" value="$getVar('sb_username', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="sb_password">Password</label>
                            <div class="controls">
                                <input class="span3" id="sb_password" name="sb_password" type="password" value="$getVar('sb_password', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="sb_port">Port</label>
                            <div class="controls">
                                <input class="span1" id="sb_port" name="sb_port" type="text" value="$getVar('sb_port', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="sb_apikey">API Key</label>
                            <div class="controls">
                                <input class="span6" id="sb_apikey" name="sb_apikey" type="text" value="$getVar('sb_apikey', '')" />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>XBMC</legend>
                        <div class="control-group">
                            <label class="control-label">Enable</label>
                            <div class="controls">
                                <label class="checkbox enable-module">
                                    #if $getVar('use_xbmc', 'no') == "yes"
                                    <input type="checkbox" checked="checked" value="yes" name="use_xbmc" />
                                    #else
                                    <input type="checkbox" value="yes" name="use_xbmc" />
                                    #end if
                                </label>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="xbmc_ip">IP / Host</label>
                            <div class="controls">
                                <input class="span3" id="xbmc_ip" name="xbmc_ip" type="text" value="$getVar('xbmc_ip', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="xbmc_username">Username</label>
                            <div class="controls">
                                <input class="span3" id="xbmc_username" name="xbmc_username" type="text" value="$getVar('xbmc_username', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="xbmc_password">Password</label>
                            <div class="controls">
                                <input class="span3" id="xbmc_password" name="xbmc_password" type="password" value="$getVar('xbmc_password', '')" />
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="xbmc_port">Port</label>
                            <div class="controls">
                                <input class="span1" id="xbmc_port" name="xbmc_port" type="text" value="$getVar('xbmc_port', '')" />
                            </div>
                        </div>
                    </fieldset>

                    <div class="form-actions">
                        <input class="btn btn-primary" type="submit" value="Save changes" id="save-base-settings-button" />
                        <input class="btn" type="reset" value="Clear" id="clear-base-settings-button" />
                    </div>

                </form>
            </div>

            <div id="misc" class="tab-pane" >
                <form action="" id="misc-settings-form" name="misc-settings-form" method="post" class="form-horizontal">

                    <fieldset>
                        <legend>Thumbnails</legend>
                        <div class="control-group">
                            <label class="control-label" for="regenerate_thumbs">Regenerate thumbnails</label>
                            <div class="controls">
                                <input type="checkbox" value="yes" name="regenerate_thumbs" id="regenerate_thumbs" />
                            </div>
                        </div>
                    </fieldset>

                    <div class="form-actions">
                        <input class="btn btn-primary" type="submit" value="Save changes" id="save-misc-settings-button" />
                        <input class="btn" type="reset" value="Clear" id="clear-misc-settings-button" />
                    </div>
                </form>
            </div>

            <div id="search" class="tab-pane" >
                <form action="" id="search-settings-form" name="search-settings-form" method="post" class="form-horizontal">
                    <input type="hidden" name="search-settings-hidden" value="1" />
                    <fieldset>
                        <legend>NZB Matrix</legend>
                        <div class="control-group">
                            <label class="control-label">Enable</label>
                            <div class="controls">
                                <label class="checkbox enable-module">
                                    #if $getVar('use_nzbmatrix', 'no') == "yes"
                                    <input type="checkbox" checked="checked" value="yes" name="use_nzbmatrix" />
                                    #else
                                    <input type="checkbox" value="yes" name="use_nzbmatrix" />
                                    #end if
                                </label>
                            </div>
                        </div>
                        <div class="control-group">
                            <label class="control-label" for="nzbmatrix_apikey">API Key</label>
                            <div class="controls">
                                <input class="span6" id="nzbmatrix_apikey" name="nzbmatrix_apikey" type="text" value="$getVar('nzbmatrix_apikey', '')" />
                            </div>
                        </div>
                    </fieldset>

                    <div class="form-actions">
                        <input class="btn btn-primary" type="submit" value="Save changes" id="search-misc-settings-button" />
                        <input class="btn" type="reset" value="Clear" id="search-misc-settings-button" />
                    </div>
                </form>
            </div>

        </div>

    </div>

</div>


#include $webdir + "/footer.tpl"#
