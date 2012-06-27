#include $webdir + "/header.tpl"#

<div class="container">

    <div class="content maincontent">

        <div class="page-header page-title">
            <h1>Settings</h1>
        </div>

        <div id="notification-area"></div>

        <ul class="nav nav-tabs">
            <li class="active"><a href="#server" data-toggle="tab">General</a></li>
            <li><a href="#dashboard" data-toggle="tab">Dashboard</a></li>
            <li class="dropdown">
                <a href="#" class="dropdown-toggle" data-toggle="dropdown">Services <b class="caret"></b></a>
                <ul class="dropdown-menu">
                    <li><a href="#xbmc" data-toggle="tab">XBMC</a></li>
                    <li><a href="#sabnzbd" data-toggle="tab">SABnzbd</a></li>
                    <li><a href="#couchpotato" data-toggle="tab">Couchpotato</a></li>
                    <li><a href="#sickbeard" data-toggle="tab">Sickbeard</a></li>
                    <li><a href="#squeezebox" data-toggle="tab">Squeezebox</a></li>
                </ul>
            </li>
            <li><a href="#nzbsearch" data-toggle="tab">NZB Search</a></li>
        </ul>

        <form action="" id="base-settings-form" name="base-settings-form" method="post" class="form-horizontal">

            <div class="tab-content">
                <fieldset id="server" class="tab-pane active">
                    <legend>HTPC-Manager</legend>
                    <div class="control-group">
                        <label class="control-label" for="app_port">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="app_host" name="app_host" type="text" value="$getVar('app_host', '0.0.0.0')" /> : 
                            <input class="span1" id="app_port" name="app_port" type="text" value="$getVar('app_port', '8085')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="app_username">Username</label>
                        <div class="controls">
                            <input class="span3" id="app_username" name="app_username" type="text" value="$getVar('app_username', '')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="app_password">Password</label>
                        <div class="controls">
                            <input class="span3" id="app_password" name="app_password" type="password" value="$getVar('app_password', '')" />
                        </div>
                    </div>
                </fieldset>
                <fieldset id="dashboard" class="tab-pane fade">
                    <legend>Dashboard</legend>
                    <div class="control-group">
                        <label class="control-label">Show Recent Movies</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_rec_movies', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_rec_movies" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_rec_movies" />
                                #end if
                            </label>
                        </div>
                    </div>                    
                    <div class="control-group">
                        <label class="control-label">Show Recent TV</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_rec_tv', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_rec_tv" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_rec_tv" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Show Recent Music</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_rec_music', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_rec_music" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_rec_music" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Show Sickbeard</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_sickbeard', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_sickbeard" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_sickbeard" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Show CouchPotato</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_couchpotato', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_couchpotato" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_couchpotato" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Show Sabnzbd</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('use_dash_sabnzbd', 1)
                                <input type="checkbox" checked="checked" value="1" name="use_dash_sabnzbd" />
                                #else
                                <input type="checkbox" value="1" name="use_dash_sabnzbd" />
                                #end if
                            </label>
                        </div>
                    </div>                 
                </fieldset>
                <fieldset id="sabnzbd" class="tab-pane fade">
                    <legend>SABnzbd</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_sabnzbd', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_sabnzbd" />
                                #else
                                <input type="checkbox" value="1" name="use_sabnzbd" />
                                #end if
                            </label>
                        </div>
                    </div>       
                    <div class="control-group">
                        <label class="control-label" for="sabnzbd_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="sabnzbd_name" name="sabnzbd_name" type="text" value="$getVar('sabnzbd_name', 'SABnzbd')" />
                            </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="sabnzbd_host">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="sabnzbd_host" name="sabnzbd_host" type="text" value="$getVar('sabnzbd_host', '127.0.0.1')" /> : 
                            <input class="span1" id="sabnzbd_port" name="sabnzbd_port" type="text" value="$getVar('sabnzbd_port', '8080')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="sabnzbd_apikey">API Key</label>
                        <div class="controls">
                            <input class="span3" id="sabnzbd_apikey" name="sabnzbd_apikey" type="text" value="$getVar('sabnzbd_apikey', '')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">SSL</label>
                        <div class="controls">
                            <label class="radio">
                                #if $getVar('sabnzbd_ssl', 0) == 0
                                <input type="radio" checked="checked" value="0" name="sabnzbd_ssl" /> No
                                #else
                                <input type="radio" checked="" value="0" name="sabnzbd_ssl" /> No
                                #end if
                            </label>
                            <label class="radio">
                                #if $getVar('nzb_ssl', 0)
                                <input type="radio" checked="checked" value="1" name="sabnzbd_ssl" /> Yes
                                #else
                                <input type="radio" value="1" name="sabnzbd_ssl" /> Yes
                                #end if
                            </label>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset id="couchpotato" class="tab-pane fade">
                    <legend>CouchPotato</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_couchpotato', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_couchpotato" />
                                #else
                                <input type="checkbox" value="1" name="use_couchpotato" />
                                #end if
                            </label>
                        </div>
                    </div>           
                    <div class="control-group">
                        <label class="control-label" for="couchpotato_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="couchpotato_name" name="couchpotato_name" type="text" value="$getVar('couchpotato_name', 'CouchPotato')" />
                            </div>
                    </div>      
                    <div class="control-group">
                        <label class="control-label" for="couchpotato_host">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="couchpotato_host" name="couchpotato_host" type="text" value="$getVar('couchpotato_host', '127.0.0.1')" />
                            <input class="span1" id="couchpotato_port" name="couchpotato_port" type="text" value="$getVar('couchpotato_port', '5050')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="couchpotato_apikey">API Key</label>
                        <div class="controls">
                            <input class="span3" id="couchpotato_apikey" name="couchpotato_apikey" type="text" value="$getVar('couchpotato_apikey', '')" />
                        </div>
                    </div>
                </fieldset>

                <fieldset id="sickbeard" class="tab-pane fade">
                    <legend>Sickbeard</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_sickbeard', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_sickbeard" />
                                #else
                                <input type="checkbox" value="1" name="use_sickbeard" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="sickbeard_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="sickbeard_name" name="sickbeard_name" type="text" value="$getVar('sickbeard_name', 'Sickbeard')" />
                            </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="sickbeard_host">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="sickbeard_host" name="sickbeard_host" type="text" value="$getVar('sickbeard_host', '127.0.0.1')" />
                            <input class="span1" id="sickbeard_port" name="sickbeard_port" type="text" value="$getVar('sickbeard_port', '')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="sickbeard_apikey">API Key</label>
                        <div class="controls">
                            <input class="span3" id="sickbeard_apikey" name="sickbeard_apikey" type="text" value="$getVar('sickbeard_apikey', '')" />
                        </div>
                    </div>
                </fieldset>

                <fieldset id="squeezebox" class="tab-pane fade">
                    <legend>Squeezebox</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_squeezebox', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_squeezebox" />
                                #else
                                <input type="checkbox" value="1" name="use_squeezebox" />
                                #end if
                            </label>
                        </div>
                    </div>                   
                    <div class="control-group">
                        <label class="control-label" for="squeezebox_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="squeezebox_name" name="squeezebox_name" type="text" value="$getVar('squeezebox_name', 'Squeezebox')" />
                            </div>
                    </div>                
                    <div class="control-group">
                        <label class="control-label" for="squeezebox_host">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="squeezebox_host" name="squeezebox_host" type="text" value="$getVar('squeezebox_host', '127.0.0.1')" />
                            <input class="span1" id="squeezebox_port" name="squeezebox_port" type="text" value="$getVar('squeezebox_port', '9000')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="squeezebox_username">Username</label>
                        <div class="controls">
                            <input class="span3" id="squeezebox_username" name="squeezebox_username" type="text" value="$getVar('squeezebox_username', '')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="squeezebox_password">Password</label>
                        <div class="controls">
                            <input class="span3" id="squeezebox_password" name="squeezebox_password" type="password" value="$getVar('squeezebox_password', '')" />
                        </div>
                    </div>
                </fieldset>

                <fieldset id="xbmc" class="tab-pane fade">
                    <legend>XBMC</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_xbmc', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_xbmc" />
                                #else
                                <input type="checkbox" value="1" name="use_xbmc" />
                                #end if
                            </label>
                        </div>
                    </div>                   
                    <div class="control-group">
                        <label class="control-label" for="xbmc_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="xbmc_name" name="xbmc_name" type="text" value="$getVar('xbmc_name', 'XBMC')" />
                            </div>
                    </div>                   
                    <div class="control-group">
                        <label class="control-label" for="xbmc_host">IP / Host : Port</label>
                        <div class="controls">
                            <input class="span3" id="xbmc_host" name="xbmc_host" type="text" value="$getVar('xbmc_host', '127.0.0.1')" /> :
                            <input class="span1" id="xbmc_port" name="xbmc_port" type="text" value="$getVar('xbmc_port', '80')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="xbmc_username">Username</label>
                        <div class="controls">
                            <input class="span3" id="xbmc_username" name="xbmc_username" type="text" value="$getVar('xbmc_username', 'xbmc')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="xbmc_password">Password</label>
                        <div class="controls">
                            <input class="span3" id="xbmc_password" name="xbmc_password" type="password" value="$getVar('xbmc_password', '')" />
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Banners for TV Shows</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('xbmc_show_banners', 0)
                                <input type="checkbox" checked="checked" value="1" name="xbmc_show_banners" />
                                #else
                                <input type="checkbox" value="1" name="xbmc_show_banners" />
                                #end if
                            </label>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Hide seen TV Shows</label>
                        <div class="controls">
                            <label class="checkbox">
                                #if $getVar('xbmc_hide_watched', 0)
                                <input type="checkbox" checked="checked" value="1" name="xbmc_hide_watched" />
                                #else
                                <input type="checkbox" value="1" name="xbmc_hide_watched" />
                                #end if
                            </label>
                        </div>
                    </div>
                </fieldset>

                <fieldset id="nzbsearch" class="tab-pane" >
                    <legend>NZB Matrix</legend>
                    <div class="control-group">
                        <label class="control-label">Enable</label>
                        <div class="controls">
                            <label class="checkbox enable-module">
                                #if $getVar('use_nzbsearch', 0)
                                <input type="checkbox" checked="checked" value="1" name="use_nzbsearch" />
                                #else
                                <input type="checkbox" value="1" name="use_nzbsearch" />
                                #end if
                            </label>
                        </div>
                    </div>                    
                    <div class="control-group">
                        <label class="control-label" for="nzbsearch_name">Menu Name</label>
                            <div class="controls">
                                <input class="span3" id="nzbsearch_name" name="nzbsearch_name" type="text" value="$getVar('nzbsearch_name', 'NZBSearch')" />
                            </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label" for="nzbmatrix_apikey">API Key</label>
                        <div class="controls">
                            <input class="span3" id="nzbmatrix_apikey" name="nzbmatrix_apikey" type="text" value="$getVar('nzbmatrix_apikey', '')" />
                        </div>
                    </div>
                </fieldset>

                <div class="form-actions">
                    <input class="btn btn-primary" type="submit" value="Save changes" />
                    <input class="btn" type="reset" value="Clear" />
                </div>

            </div>
        </form>
    </div>

</div>


#include $webdir + "/footer.tpl"#
